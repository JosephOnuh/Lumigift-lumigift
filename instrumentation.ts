export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");

    const { logPoolMetrics, closePool } = await import("@/lib/db");

    logPoolMetrics();

    for (const sig of ["SIGTERM", "SIGINT"] as const) {
      process.once(sig, async () => {
        await closePool();
        process.exit(0);
      });
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
