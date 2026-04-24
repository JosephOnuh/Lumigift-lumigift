import { Pool } from "pg";
import { serverConfig } from "@/server/config";

const pool = new Pool({
  connectionString: serverConfig.database.url,
  min: serverConfig.database.poolMin,
  max: serverConfig.database.poolMax,
  idleTimeoutMillis: serverConfig.database.idleTimeoutMs,
  connectionTimeoutMillis: serverConfig.database.connectionTimeoutMs,
});

pool.on("connect", () => {
  // Fires for each new physical connection added to the pool
});

pool.on("error", (err) => {
  console.error("[db] Unexpected pool error:", err.message);
});

/** Log pool metrics on startup. */
export function logPoolMetrics() {
  console.log(
    `[db] Pool ready — min: ${serverConfig.database.poolMin}, max: ${serverConfig.database.poolMax}, ` +
      `idleTimeout: ${serverConfig.database.idleTimeoutMs}ms, connectionTimeout: ${serverConfig.database.connectionTimeoutMs}ms`
  );
}

/** Gracefully drain and close all pool connections. */
export async function closePool() {
  await pool.end();
  console.log("[db] Pool closed.");
}

export default pool;
