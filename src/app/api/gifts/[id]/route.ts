import { NextRequest, NextResponse } from "next/server";
import { getGiftById } from "@/server/services/gift.service";
import { withErrorHandler } from "@/server/middleware";
import type { ApiResponse, Gift } from "@/types";

export const GET = withErrorHandler(
  async (_req: NextRequest, context: unknown) => {
    const { params } = context as { params: { id: string } };
    const gift = await getGiftById(params.id);

    if (!gift) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Gift not found" },
        { status: 404 }
      );
    }

    // Strip sensitive sender info for public claim page
    const safeGift: Partial<Gift> = {
      id: gift.id,
      recipientName: gift.recipientName,
      amountNgn: gift.amountNgn,
      message: gift.message,
      mediaUrl: gift.mediaUrl,
      unlockAt: gift.unlockAt,
      status: gift.status,
    };

    return NextResponse.json<ApiResponse<Partial<Gift>>>({
      success: true,
      data: safeGift,
    });
  }
);
