import { sendUsdcPayment } from "@/lib/stellar";
import { updateGiftStatus } from "./gift.service";
import type { Gift } from "@/types";

/**
 * Claim a gift — verifies unlock time, sends USDC to recipient's Stellar key,
 * and marks the gift as claimed.
 */
export async function claimGift(
  gift: Gift,
  recipientStellarKey: string
): Promise<{ txHash: string }> {
  if (gift.status !== "unlocked") {
    throw new Error("Gift is not yet unlocked.");
  }

  const txHash = await sendUsdcPayment(recipientStellarKey, gift.amountUsdc);
  await updateGiftStatus(gift.id, "claimed");

  return { txHash };
}
