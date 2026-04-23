import { randomUUID } from "crypto";
import type { Gift, GiftStatus } from "@/types";
import type { CreateGiftInput } from "@/types/schemas";
import { initializePayment, ngnToKobo } from "@/lib/paystack";
import { serverConfig } from "@/server/config";

// ─── Exchange rate helper ─────────────────────────────────────────────────────
import { getExchangeRate } from "@/server/services/exchange-rate.service";

export async function ngnToUsdc(ngn: number): Promise<string> {
  const { ngnPerUsdc } = await getExchangeRate();
  return (ngn / ngnPerUsdc).toFixed(7);
}

// ─── In-memory store (replace with DB in production) ─────────────────────────
const gifts = new Map<string, Gift>();

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

export async function getGiftById(id: string): Promise<Gift | null> {
  return gifts.get(id) ?? null;
}

export async function updateGiftStatus(id: string, status: GiftStatus): Promise<Gift | null> {
  const gift = gifts.get(id);
  if (!gift) return null;
  gift.status = status;
  gift.updatedAt = new Date();
  gifts.set(id, gift);
  return gift;
}

export async function getGiftsBySender(senderId: string): Promise<Gift[]> {
  return [...gifts.values()].filter((g) => g.senderId === senderId);
}

export async function getGiftsByRecipient(phone: string): Promise<Gift[]> {
  return [...gifts.values()].filter((g) => g.recipientPhone === phone);
}
