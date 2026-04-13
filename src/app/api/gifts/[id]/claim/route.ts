import { NextRequest, NextResponse } from "next/server";
import { getGiftById } from "@/server/services/gift.service";
import { claimGift } from "@/server/services/claim.service";
import { claimGiftSchema } from "@/types/schemas";
import { withErrorHandler } from "@/server/middleware";
import type { ApiResponse } from "@/types";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = claimGiftSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const gift = await getGiftById(parsed.data.giftId);
  if (!gift) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Gift not found" },
      { status: 404 }
    );
  }

  const { txHash } = await claimGift(gift, parsed.data.recipientStellarKey);

  return NextResponse.json<ApiResponse<{ txHash: string }>>({
    success: true,
    data: { txHash },
  });
});
