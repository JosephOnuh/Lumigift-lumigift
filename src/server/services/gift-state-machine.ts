import type { GiftStatus } from "@/types";

// Valid transitions: from → Set<to>
const TRANSITIONS: Record<GiftStatus, Set<GiftStatus>> = {
  pending_payment: new Set<GiftStatus>(["funded", "cancelled"]),
  funded:          new Set<GiftStatus>(["locked", "cancelled"]),
  locked:          new Set<GiftStatus>(["unlocked", "cancelled"]),
  unlocked:        new Set<GiftStatus>(["claimed", "cancelled"]),
  claimed:         new Set<GiftStatus>(),
  cancelled:       new Set<GiftStatus>(),
  // legacy / edge statuses
  draft:           new Set<GiftStatus>(["pending_payment", "cancelled"]),
  expired:         new Set<GiftStatus>(),
};

/**
 * Returns true if transitioning from `current` to `next` is valid.
 */
export function isValidTransition(current: GiftStatus, next: GiftStatus): boolean {
  return TRANSITIONS[current]?.has(next) ?? false;
}

/**
 * Asserts the transition is valid; throws a descriptive error if not.
 */
export function assertValidTransition(current: GiftStatus, next: GiftStatus): void {
  if (!isValidTransition(current, next)) {
    throw new Error(
      `Invalid gift status transition: "${current}" → "${next}"`
    );
  }
}
