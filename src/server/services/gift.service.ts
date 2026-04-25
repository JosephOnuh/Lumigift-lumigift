import { randomUUID } from "crypto";
import type { Gift, GiftStatus } from "@/types";
import type { CreateGiftInput } from "@/types/schemas";
import { initializePayment, ngnToKobo } from "@/lib/paystack";
import { serverConfig } from "@/server/config";
import { assertValidTransition } from "./gift-state-machine";

// ─── Exchange rate helper ─────────────────────────────────────────────────────
import { getExchangeRate } from "@/server/services/exchange-rate.service";

/**
 * Converts a Nigerian Naira amount to its USDC equivalent using the live
 * NGN/USDC exchange rate fetched from Stellar Horizon (Redis-cached for 60 s).
 *
 * @param ngn - Amount in Nigerian Naira.
 * @returns The USDC equivalent formatted to 7 decimal places (Stellar precision).
 */
export async function ngnToUsdc(ngn: number): Promise<string> {
  const { ngnPerUsdc } = await getExchangeRate();
  return (ngn / ngnPerUsdc).toFixed(7);
}

// ─── In-memory store (replace with DB in production) ─────────────────────────
const gifts = new Map<string, Gift>();

/**
 * Creates a new gift record and initializes a Paystack payment session.
 *
 * The gift is stored with status `"pending_payment"` until the Paystack
 * callback confirms the NGN payment, at which point it transitions to
 * `"funded"` and the USDC is locked in the escrow contract.
 *
 * @param senderId - The authenticated user's ID.
 * @param input - Validated gift creation input (recipient, amount, unlock date, etc.).
 * @returns The created {@link Gift} and the Paystack `paymentUrl` to redirect the user to.
 * @throws If the exchange rate fetch or Paystack initialization fails.
 */
export async function createGift(
  senderId: string,
  input: CreateGiftInput
): Promise<{ gift: Gift; paymentUrl: string }> {
  const id = randomUUID();
  const amountUsdc = await ngnToUsdc(input.amountNgn);

  const gift: Gift = {
    id,
    senderId,
    recipientPhone: input.recipientPhone,
    recipientName: input.recipientName,
    amountNgn: input.amountNgn,
    amountUsdc,
    message: input.message,
    unlockAt: new Date(input.unlockAt),
    status: "pending_payment",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  gifts.set(id, gift);

  const payment = await initializePayment({
    email: `${senderId}@lumigift.app`, // placeholder; use real email from user record
    amountKobo: ngnToKobo(input.amountNgn),
    reference: `lumigift_${id}`,
    callbackUrl: `${serverConfig.app.url}/api/payments/callback?giftId=${id}`,
    metadata: { giftId: id, senderId },
  });

  return { gift, paymentUrl: payment.authorizationUrl };
}

/**
 * Retrieves a gift by its unique ID.
 *
 * @param id - The gift UUID.
 * @returns The {@link Gift} if found, or `null` if it does not exist.
 */
export async function getGiftById(id: string): Promise<Gift | null> {
  return gifts.get(id) ?? null;
}

/**
 * Updates the status of a gift, enforcing valid state-machine transitions.
 *
 * @param id - The gift UUID.
 * @param status - The target {@link GiftStatus}.
 * @returns The updated {@link Gift}, or `null` if the gift does not exist.
 * @throws If the transition from the current status to `status` is not allowed.
 */
export async function updateGiftStatus(id: string, status: GiftStatus): Promise<Gift | null> {
  const gift = gifts.get(id);
  if (!gift) return null;
  assertValidTransition(gift.status, status);
  gift.status = status;
  gift.updatedAt = new Date();
  gifts.set(id, gift);
  return gift;
}

/**
 * Returns all gifts created by a given sender.
 *
 * @param senderId - The authenticated user's ID.
 * @returns An array of {@link Gift} objects, possibly empty.
 */
export async function getGiftsBySender(senderId: string): Promise<Gift[]> {
  return [...gifts.values()].filter((g) => g.senderId === senderId);
}

/** Paginated result for {@link getGiftsBySenderPaginated}. */
export interface GiftPage {
  gifts: Gift[];
  total: number;
  nextCursor: string | null;
}

/**
 * Returns a cursor-paginated page of gifts for a sender, sorted by creation
 * date descending (newest first).
 *
 * @param senderId - The authenticated user's ID.
 * @param cursor - The ID of the last gift from the previous page, or `null` for
 *   the first page.
 * @param limit - Maximum number of gifts to return per page.
 * @returns A {@link GiftPage} containing the gifts, total count, and next cursor.
 */
export async function getGiftsBySenderPaginated(
  senderId: string,
  cursor: string | null,
  limit: number
): Promise<GiftPage> {
  const all = [...gifts.values()]
    .filter((g) => g.senderId === senderId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const startIndex = cursor ? all.findIndex((g) => g.id === cursor) + 1 : 0;
  const page = all.slice(startIndex, startIndex + limit);
  const nextCursor = startIndex + limit < all.length ? page[page.length - 1].id : null;

  return { gifts: page, total: all.length, nextCursor };
}

/**
 * Returns all gifts where the recipient's phone number matches `phone`.
 *
 * @param phone - E.164-formatted recipient phone number.
 * @returns An array of {@link Gift} objects, possibly empty.
 */
export async function getGiftsByRecipient(phone: string): Promise<Gift[]> {
  return [...gifts.values()].filter((g) => g.recipientPhone === phone);
}

/**
 * Cancels a gift by setting its status to `"cancelled"`.
 * Does not validate the current status — callers should check eligibility first.
 *
 * @param id - The gift UUID.
 * @returns The updated {@link Gift}, or `null` if the gift does not exist.
 */
export async function cancelGift(id: string): Promise<Gift | null> {
  const gift = gifts.get(id);
  if (!gift) return null;
  gift.status = "cancelled";
  gift.updatedAt = new Date();
  gifts.set(id, gift);
  return gift;
}

/**
 * Stores the Stellar transaction hash of the claim operation on the gift record.
 * Called after a successful USDC transfer to the recipient.
 *
 * @param id - The gift UUID.
 * @param txHash - The Stellar transaction hash (64-character hex string).
 * @returns The updated {@link Gift}, or `null` if the gift does not exist.
 */
export async function storeClaimTxHash(id: string, txHash: string): Promise<Gift | null> {
  const gift = gifts.get(id);
  if (!gift) return null;
  gift.claimTxHash = txHash;
  gift.updatedAt = new Date();
  gifts.set(id, gift);
  return gift;
}
