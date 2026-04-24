import { createHash } from "crypto";
import { NextRequest } from "next/server";

/**
 * Builds a stable device fingerprint from request headers.
 * Not cryptographically unique — used only for "known device" heuristics.
 */
export function buildFingerprint(req: NextRequest): string {
  const ua = req.headers.get("user-agent") ?? "";
  const lang = req.headers.get("accept-language") ?? "";
  const encoding = req.headers.get("accept-encoding") ?? "";
  return createHash("sha256").update(`${ua}|${lang}|${encoding}`).digest("hex");
}

/**
 * Returns the client IP from standard proxy headers.
 */
export function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

/**
 * Resolves an IP address to a country name using ip-api.com (free, no key needed).
 * Falls back to "Unknown location" on any error.
 */
export async function getCountryFromIp(ip: string): Promise<string> {
  if (ip === "unknown" || ip === "127.0.0.1" || ip.startsWith("::")) {
    return "Unknown location";
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return "Unknown location";
    const { country } = (await res.json()) as { country?: string };
    return country ?? "Unknown location";
  } catch {
    return "Unknown location";
  }
}
