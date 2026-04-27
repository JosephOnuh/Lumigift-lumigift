export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logPoolMetrics, closePool } = await import("@/lib/db");
    const { logger } = await import("@/lib/logger");

    logger.info("Application starting");
    logPoolMetrics();

    for (const sig of ["SIGTERM", "SIGINT"] as const) {
      process.once(sig, async () => {
        logger.info({ signal: sig }, "Shutting down");
        await closePool();
        process.exit(0);
      });
    }
  }
}
