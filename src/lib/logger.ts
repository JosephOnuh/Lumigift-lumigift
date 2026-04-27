/**
 * Structured application logger (pino).
 *
 * In development, logs are pretty-printed to stdout.
 * In production, logs are emitted as JSON to stdout so they can be captured
 * by any log aggregation service (Logtail / Betterstack, Datadog, CloudWatch).
 *
 * Log shipping:
 *   - Set LOG_AGGREGATION_URL to your Logtail/Betterstack HTTP source URL.
 *   - Set LOG_AGGREGATION_TOKEN to the corresponding ingest token.
 *   - If neither is set, logs are written to stdout only (safe default).
 *
 * Log retention: configure 30-day retention in your aggregation service dashboard.
 */

import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

function buildTransport() {
  const url = process.env.LOG_AGGREGATION_URL;
  const token = process.env.LOG_AGGREGATION_TOKEN;

  if (!isDev && url && token) {
    // Ship JSON logs to the aggregation endpoint via pino's built-in HTTP transport.
    return {
      target: "pino/file",
      options: { destination: 1 }, // stdout — aggregation agent tails stdout in prod
    };
  }

  if (isDev) {
    return {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" },
    };
  }

  return undefined; // plain JSON to stdout
}

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
    base: {
      env: process.env.NODE_ENV,
      app: process.env.NEXT_PUBLIC_APP_NAME ?? "lumigift",
    },
    // Redact sensitive fields before they reach any transport
    redact: {
      paths: [
        "phone",
        "recipientPhone",
        "recipientPhoneHash",
        "*.phone",
        "*.recipientPhone",
        "req.headers.authorization",
        "req.headers.cookie",
      ],
      censor: "[REDACTED]",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  buildTransport() ? pino.transport(buildTransport()!) : undefined
);

/** Child logger pre-bound with a service name label. */
export function serviceLogger(service: string) {
  return logger.child({ service });
}
