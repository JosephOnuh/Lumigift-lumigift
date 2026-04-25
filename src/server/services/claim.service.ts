import { sendUsdcPayment } from "@/lib/stellar";
import { updateGiftStatus, storeClaimTxHash } from "./gift.service";
import type { Gift } from "@/types";

/**
 * Claims a gift by transferring its USDC amount to the recipient's Stellar account.
 *
 * Steps performed:
 * 1. Validates that the gift status is `"unlocked"` (unlock time has passed).
 * 2. Submits a USDC payment on Stellar to `recipientStellarKey`.
 * 3. Persists the transaction hash on the gift record.
 * 4. Transitions the gift status to `"claimed"`.
 *
 * @param gift - The {@link Gift} to claim. Must have status `"unlocked"`.
 * @param recipientStellarKey - The recipient's Stellar public key (G…).
 * @returns An object containing the Stellar `txHash` of the payment.
 * @throws `Error("Gift is not yet unlocked.")` if the gift status is not `"unlocked"`.
 * @throws If the Stellar payment submission fails (e.g. insufficient balance,
 *   missing trustline).
 */
export async function claimGift(
  gift: Gift,
  recipientStellarKey: string
): Promise<{ txHash: string }> {
  if (gift.status !== "unlocked") {
    throw new Error("Gift is not yet unlocked.");
  }

  const txHash = await sendUsdcPayment(recipientStellarKey, gift.amountUsdc);
  await storeClaimTxHash(gift.id, txHash);
  await updateGiftStatus(gift.id, "claimed");

  return { txHash };
}
