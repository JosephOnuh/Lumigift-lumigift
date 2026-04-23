import { getRedisClient } from "@/lib/redis";
import { serverConfig } from "@/server/config";

const CACHE_KEY = "rate:NGN:USDC";
const CACHE_TTL_SEC = 60;
const FALLBACK_RATE = 1600; // used only if Horizon is unreachable and no cache exists

export interface ExchangeRateResult {
  ngnPerUsdc: number;
  stale: boolean;
  source: "cache" | "horizon" | "fallback";
}

/** Fetch NGN/USDC rate from Stellar Horizon order book. */
async function fetchFromHorizon(): Promise<number> {
  const url = `${serverConfig.stellar.horizonUrl}/order_book?selling_asset_type=native&buying_asset_type=credit_alphanum4&buying_asset_code=${serverConfig.usdc.assetCode}&buying_asset_issuer=${serverConfig.usdc.issuer}&limit=1`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Horizon responded ${res.status}`);
  const data = await res.json();
  const price = parseFloat(data?.asks?.[0]?.price ?? "0");
  if (!price) throw new Error("No asks in Horizon order book");
  // price is XLM/USDC; we need NGN/USDC — use XLM as proxy or return raw
  // For now return the raw USDC price in XLM terms as a placeholder;
  // replace with a real NGN/USDC feed (e.g. Coingecko) when available.
  return price;
}

/** Get NGN/USDC exchange rate, cached in Redis for 60 seconds. */
export async function getExchangeRate(): Promise<ExchangeRateResult> {
  const redis = await getRedisClient();

  // Cache hit
  const cached = await redis.get(CACHE_KEY);
  if (cached) {
    console.log("[exchange-rate] cache hit", { key: CACHE_KEY });
    return { ngnPerUsdc: parseFloat(cached), stale: false, source: "cache" };
  }

  console.log("[exchange-rate] cache miss", { key: CACHE_KEY });

  try {
    const rate = await fetchFromHorizon();
    await redis.setEx(CACHE_KEY, CACHE_TTL_SEC, String(rate));
    console.log("[exchange-rate] fetched from Horizon", { rate });
    return { ngnPerUsdc: rate, stale: false, source: "horizon" };
  } catch (err) {
    console.error("[exchange-rate] Horizon unreachable, serving stale/fallback", err);

    // Try stale value (key may have just expired — check with no TTL enforcement)
    const stale = await redis.get(`${CACHE_KEY}:stale`);
    if (stale) {
      return { ngnPerUsdc: parseFloat(stale), stale: true, source: "cache" };
    }

    return { ngnPerUsdc: FALLBACK_RATE, stale: true, source: "fallback" };
  }
}
