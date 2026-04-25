/**
 * Typed Soroban contract event shapes for the Lumigift escrow contract.
 *
 * The contract emits two events:
 *
 *   initialized  → topic: ["initialized"]
 *                  data:  (sender: Address, recipient: Address, amount: i128, unlock_time: u64)
 *
 *   claimed      → topic: ["claimed"]
 *                  data:  (recipient: Address, amount: i128)
 *
 *   cancelled    → topic: ["cancelled"]   (reserved for future contract version)
 *                  data:  (sender: Address, amount: i128)
 */

import {
  SorobanRpc,
  Address,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";

// ─── Event type discriminants ─────────────────────────────────────────────────

export type EscrowEventType = "initialized" | "claimed" | "cancelled";

// ─── Typed event payloads ─────────────────────────────────────────────────────

export interface InitializedEvent {
  type: "initialized";
  contractId: string;
  ledger: number;
  ledgerClosedAt: string;
  txHash: string;
  sender: string;
  recipient: string;
  amount: bigint;
  unlockTime: bigint;
}

export interface ClaimedEvent {
  type: "claimed";
  contractId: string;
  ledger: number;
  ledgerClosedAt: string;
  txHash: string;
  recipient: string;
  amount: bigint;
}

export interface CancelledEvent {
  type: "cancelled";
  contractId: string;
  ledger: number;
  ledgerClosedAt: string;
  txHash: string;
  sender: string;
  amount: bigint;
}

export type EscrowEvent = InitializedEvent | ClaimedEvent | CancelledEvent;

// ─── Cursor helpers ───────────────────────────────────────────────────────────

/** Sentinel cursor meaning "start from the beginning of the ledger history". */
export const CURSOR_GENESIS = "0000000000000000-0000000000";

// ─── Fetcher ──────────────────────────────────────────────────────────────────

export interface FetchEventsOptions {
  rpcUrl: string;
  contractId: string;
  /** Exclusive start cursor — fetch events *after* this cursor. */
  startCursor: string;
  /** Maximum number of events to return per call (Soroban RPC max is 10 000). */
  limit?: number;
}

export interface FetchEventsResult {
  events: EscrowEvent[];
  /** Cursor of the last event returned; pass as `startCursor` on the next call. */
  latestCursor: string;
}

/**
 * Fetches Soroban contract events for the escrow contract from the RPC node,
 * starting after `startCursor`.
 *
 * Uses `getEvents` (Soroban RPC) rather than Horizon SSE so the call is a
 * single HTTP request — safe to drive from a cron job.
 */
export async function fetchEscrowEvents(
  opts: FetchEventsOptions
): Promise<FetchEventsResult> {
  const rpc = new SorobanRpc.Server(opts.rpcUrl, { allowHttp: false });

  const response = await rpc.getEvents({
    startLedger: cursorToLedger(opts.startCursor),
    filters: [
      {
        type: "contract",
        contractIds: [opts.contractId],
        topics: [
          ["*"],          // match any single-element topic (initialized / claimed / cancelled)
        ],
      },
    ],
    limit: opts.limit ?? 200,
  });

  const events: EscrowEvent[] = [];
  let latestCursor = opts.startCursor;

  for (const raw of response.events) {
    const parsed = parseRawEvent(raw);
    if (parsed) {
      events.push(parsed);
      latestCursor = raw.pagingToken;
    }
  }

  return { events, latestCursor };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function cursorToLedger(cursor: string): number {
  if (cursor === CURSOR_GENESIS) return 0;
  // Cursor format: "<ledger_seq_padded>-<event_index_padded>"
  const ledger = parseInt(cursor.split("-")[0], 10);
  return isNaN(ledger) ? 0 : ledger;
}

function parseRawEvent(
  raw: SorobanRpc.Api.RawEventResponse
): EscrowEvent | null {
  // topic[0] is the event name symbol
  const topicVals = raw.topic as xdr.ScVal[];
  if (!topicVals?.length) return null;

  const eventName = scValToNative(topicVals[0]) as string;
  const dataVal = raw.value as xdr.ScVal;

  const base = {
    contractId: raw.contractId ?? "",
    ledger: raw.ledger,
    ledgerClosedAt: raw.ledgerClosedAt,
    txHash: raw.txHash,
  };

  try {
    if (eventName === "initialized") {
      return decodeInitializedEvent(base, dataVal);
    }
    if (eventName === "claimed") {
      return decodeClaimedEvent(base, dataVal);
    }
    if (eventName === "cancelled") {
      return decodeCancelledEvent(base, dataVal);
    }
  } catch (err) {
    console.warn("[escrow-events] failed to decode event", eventName, err);
  }

  return null;
}

function decodeInitializedEvent(
  base: Omit<InitializedEvent, "type" | "sender" | "recipient" | "amount" | "unlockTime">,
  data: xdr.ScVal
): InitializedEvent {
  // data = (sender: Address, recipient: Address, amount: i128, unlock_time: u64)
  const items = data.vec();
  if (!items || items.length !== 4) throw new Error("unexpected initialized data shape");
  const [senderVal, recipientVal, amountVal, unlockTimeVal] = items;
  return {
    ...base,
    type: "initialized",
    sender: Address.fromScVal(senderVal).toString(),
    recipient: Address.fromScVal(recipientVal).toString(),
    amount: BigInt(scValToNative(amountVal) as number | bigint),
    unlockTime: BigInt(scValToNative(unlockTimeVal) as number | bigint),
  };
}

function decodeClaimedEvent(
  base: Omit<ClaimedEvent, "type" | "recipient" | "amount">,
  data: xdr.ScVal
): ClaimedEvent {
  // data = (recipient: Address, amount: i128)
  const items = data.vec();
  if (!items || items.length !== 2) throw new Error("unexpected claimed data shape");
  const [recipientVal, amountVal] = items;
  return {
    ...base,
    type: "claimed",
    recipient: Address.fromScVal(recipientVal).toString(),
    amount: BigInt(scValToNative(amountVal) as number | bigint),
  };
}

function decodeCancelledEvent(
  base: Omit<CancelledEvent, "type" | "sender" | "amount">,
  data: xdr.ScVal
): CancelledEvent {
  // data = (sender: Address, amount: i128)
  const items = data.vec();
  if (!items || items.length !== 2) throw new Error("unexpected cancelled data shape");
  const [senderVal, amountVal] = items;
  return {
    ...base,
    type: "cancelled",
    sender: Address.fromScVal(senderVal).toString(),
    amount: BigInt(scValToNative(amountVal) as number | bigint),
  };
}
