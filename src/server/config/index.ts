// Central server-side configuration — validated at startup.

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const serverConfig = {
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    name: process.env.NEXT_PUBLIC_APP_NAME ?? "Lumigift",
  },
  stellar: {
    network: (process.env.STELLAR_NETWORK ?? "testnet") as "testnet" | "mainnet",
    horizonUrl:
      process.env.STELLAR_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
    networkPassphrase:
      process.env.STELLAR_NETWORK_PASSPHRASE ??
      "Test SDF Network ; September 2015",
    escrowContractId: process.env.STELLAR_ESCROW_CONTRACT_ID ?? "",
    serverSecretKey: process.env.STELLAR_SERVER_SECRET_KEY ?? "",
  },
  usdc: {
    issuer:
      process.env.USDC_ISSUER ??
      "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    assetCode: process.env.USDC_ASSET_CODE ?? "USDC",
  },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY ?? "",
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  },
  termii: {
    apiKey: process.env.TERMII_API_KEY ?? "",
    senderId: process.env.TERMII_SENDER_ID ?? "Lumigift",
  },
  redis: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  },
  database: {
    url: process.env.DATABASE_URL ?? "",
    poolMin: parseInt(process.env.DB_POOL_MIN ?? "2", 10),
    poolMax: parseInt(process.env.DB_POOL_MAX ?? "10", 10),
    idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT_MS ?? "10000", 10),
    connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS ?? "5000", 10),
  },
  giftLimits: {
    minAmountNgn: parseInt(process.env.GIFT_MIN_AMOUNT_NGN ?? "500", 10),
    maxAmountNgn: parseInt(process.env.GIFT_MAX_AMOUNT_NGN ?? "500000", 10),
    dailyLimitNgn: parseInt(process.env.GIFT_DAILY_LIMIT_NGN ?? "1000000", 10),
  },
} as const;

export function validateServerConfig() {
  requireEnv("DATABASE_URL");
  requireEnv("NEXTAUTH_SECRET");
  requireEnv("STELLAR_SERVER_SECRET_KEY");
  requireEnv("STRIPE_WEBHOOK_SECRET");
}
