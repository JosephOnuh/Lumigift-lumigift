import { NextRequest, NextResponse } from "next/server";
import { verifyPayment } from "@/lib/paystack";
import { updateGiftStatus } from "@/server/services/gift.service";
import { withErrorHandler } from "@/server/middleware";

/** Paystack redirects here after payment. */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get("reference");
  const giftId = searchParams.get("giftId");

  if (!reference || !giftId) {
    return NextResponse.redirect(new URL("/error?code=bad_callback", req.url));
  }

  const result = await verifyPayment(reference);

  if (result.status === "success") {
    await updateGiftStatus(giftId, "locked");
    return NextResponse.redirect(new URL(`/gift/${giftId}/success`, req.url));
  }

  await updateGiftStatus(giftId, "pending_payment");
  return NextResponse.redirect(new URL(`/gift/${giftId}/payment-failed`, req.url));
});
