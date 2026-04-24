import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createGiftSchema } from "@/types/schemas";
import { createGift, getGiftsBySender } from "@/server/services/gift.service";
import { withErrorHandler } from "@/server/middleware";
import type { ApiResponse, Gift } from "@/types";

export const GET = withErrorHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  const userId = (session.user as { id: string }).id;
  const gifts = await getGiftsBySender(userId);
  return NextResponse.json<ApiResponse<Gift[]>>({ success: true, data: gifts });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = createGiftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const userId = (session.user as { id: string }).id;
  const { gift, paymentUrl } = await createGift(userId, parsed.data);

  return NextResponse.json<ApiResponse<{ gift: Gift; paymentUrl: string }>>(
    { success: true, data: { gift, paymentUrl } },
    { status: 201 }
  );
});
