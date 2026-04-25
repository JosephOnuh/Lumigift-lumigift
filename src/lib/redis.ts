import { createClient } from "redis";
import { serverConfig } from "@/server/config";

let client: ReturnType<typeof createClient> | null = null;

/**
 * Returns a connected Redis client, creating and connecting one on first call.
 * Subsequent calls return the same singleton instance.
 *
 * @returns A connected `redis` client instance.
 * @throws Will throw if the initial connection to Redis fails.
 */
export async function getRedisClient() {
  if (!client) {
    client = createClient({ url: serverConfig.redis.url });
    client.on("error", (err) => console.error("[Redis]", err));
    await client.connect();
  }
  return client;
}
