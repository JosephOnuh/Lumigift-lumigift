/**
 * Unlock scheduler — checks for gifts whose unlockAt has passed and
 * transitions them from "locked" → "unlocked", then notifies recipients.
 *
 * In production, run this as a cron job (e.g. Vercel Cron, BullMQ, or pg_cron).
 */

// Placeholder: in production, query DB for all locked gifts past their unlockAt.
export async function processUnlocks(): Promise<void> {
  const now = new Date();
  // TODO: replace with DB query: SELECT * FROM gifts WHERE status='locked' AND unlock_at <= now
  console.warn("[scheduler] processUnlocks called — wire up DB query here", now);
}
