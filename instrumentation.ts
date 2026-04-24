export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logPoolMetrics, closePool } = await import("@/lib/db");

    logPoolMetrics();

    for (const sig of ["SIGTERM", "SIGINT"] as const) {
      process.once(sig, async () => {
        await closePool();
        process.exit(0);
      });
    }
  }
}
