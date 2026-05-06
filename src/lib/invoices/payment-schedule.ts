import { txPaysToAddress, type MempoolTx } from "@/lib/mempool";

// Index 0 is the publish → first-cron-check delay (referenced by publishStatePatch).
// Indices 1+ are subsequent retry intervals consumed by decidePaymentSchedule via
// `nextAttempt = stage_attempt + 1` while no paying tx has been seen.
//
// v1.4.13.5: schedule tightened from [15s, 5min, 10min, 30min] to fill the
// post-first-miss gap. Real-world testing showed mempool.space's testnet
// indexer often takes 60–120s to surface a broadcast tx, which is *just*
// after the t=60s first cron tick — so the v1.4.13 schedule meant we waited
// 5 minutes for the next attempt. New schedule does 4–5 polls in the first
// 5 minutes (versus 2 polls), at the cost of ~2 extra mempool.space requests
// per pending invoice in that window.
export const PRE_MEMPOOL_DELAYS_MS: readonly number[] = [
  15_000,        // [0] publish → first cron check
  30_000,        // [1] first miss → retry in 30s
  60_000,        // [2] second miss → retry in 60s
  2 * 60_000,    // [3] third miss → retry in 2min
  5 * 60_000,    // [4] fourth miss → retry in 5min
  10 * 60_000,   // [5] fifth miss → retry in 10min
  30 * 60_000,   // [6] sixth miss → retry in 30min, then stop
];

export const POST_MEMPOOL_STAGES: ReadonlyArray<{ count: number; intervalMs: number }> = [
  { count: 3, intervalMs: 10 * 60_000 },
  { count: 6, intervalMs: 60 * 60_000 },
  { count: 12, intervalMs: 4 * 60 * 60_000 },
  { count: 24, intervalMs: 8 * 60 * 60_000 },
];

export interface ScheduleInput {
  status: "pending" | "payment_detected";
  btc_address: string;
  mempool_seen_at: string | null;
  stage_attempt: number;
}

export interface ScheduleDecision {
  newStatus: "pending" | "payment_detected" | "paid";
  newMempoolSeenAt: string | null;
  newStageAttempt: number;
  newNextCheckAt: string | null;
  detectedTxid: string | null;
}

function postMempoolIntervalForAttempt(attempt: number): number | null {
  let cumulative = 0;
  for (const stage of POST_MEMPOOL_STAGES) {
    cumulative += stage.count;
    if (attempt < cumulative) return stage.intervalMs;
  }
  return null;
}

function addIso(now: Date, ms: number): string {
  return new Date(now.getTime() + ms).toISOString();
}

export function decidePaymentSchedule(
  input: ScheduleInput,
  txs: MempoolTx[],
  now: Date
): ScheduleDecision {
  const paying = txs.find((tx) => txPaysToAddress(tx, input.btc_address));

  if (paying?.status.confirmed) {
    return {
      newStatus: "paid",
      newMempoolSeenAt: input.mempool_seen_at ?? now.toISOString(),
      newStageAttempt: input.stage_attempt,
      newNextCheckAt: null,
      detectedTxid: paying.txid,
    };
  }

  if (paying && input.mempool_seen_at === null) {
    return {
      newStatus: "payment_detected",
      newMempoolSeenAt: now.toISOString(),
      newStageAttempt: 0,
      newNextCheckAt: addIso(now, POST_MEMPOOL_STAGES[0].intervalMs),
      detectedTxid: paying.txid,
    };
  }

  const nextAttempt = input.stage_attempt + 1;

  if (input.mempool_seen_at === null) {
    const interval = PRE_MEMPOOL_DELAYS_MS[nextAttempt];
    return {
      newStatus: "pending",
      newMempoolSeenAt: null,
      newStageAttempt: nextAttempt,
      newNextCheckAt: interval === undefined ? null : addIso(now, interval),
      detectedTxid: null,
    };
  }

  const interval = postMempoolIntervalForAttempt(nextAttempt);
  return {
    newStatus: "payment_detected",
    newMempoolSeenAt: input.mempool_seen_at,
    newStageAttempt: nextAttempt,
    newNextCheckAt: interval === null ? null : addIso(now, interval),
    detectedTxid: null,
  };
}
