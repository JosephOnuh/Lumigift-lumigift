import { NextRequest, NextResponse } from "next/server";
import { sendOtp } from "@/lib/sms";
import { rateLimit, withErrorHandler } from "@/server/middleware";
import type { ApiResponse } from "@/types";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { phone } = await req.json();

  if (!phone || !/^\+?[1-9]\d{9,14}$/.test(phone)) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Invalid phone number" },
      { status: 400 }
    );
  }

  // Rate limit: 3 OTPs per phone per 10 minutes
  const allowed = rateLimit(`otp:${phone}`, 3, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Too many requests. Please wait before requesting another OTP." },
      { status: 429 }
    );
  }

  const otp = await sendOtp(phone);

  // TODO: store hashed OTP in Redis with TTL for verification
  // For now, log in dev only
  if (process.env.NODE_ENV === "development") {
    console.warn(`[DEV] OTP for ${phone}: ${otp}`);
  }

  return NextResponse.json<ApiResponse<{ message: string }>>({
    success: true,
    data: { message: "OTP sent successfully" },
  });
});
