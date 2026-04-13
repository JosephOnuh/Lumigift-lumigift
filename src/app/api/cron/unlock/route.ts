import { NextRequest, NextResponse } from "next/server";
import { processUnlocks } from "@/server/services/scheduler.service";
import type { ApiResponse } from "@/types";

/** Called by Vercel Cron or an external scheduler every minute. */
export const GET = async (req: NextRequest) => {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  await processUnlocks();
  return NextResponse.json<ApiResponse<{ message: string }>>({
    success: true,
    data: { message: "Unlock check complete" },
  });
};
