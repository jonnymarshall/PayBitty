import { txPaysToAddress, type MempoolTx } from "@/lib/mempool";

export const PRE_MEMPOOL_DELAYS_MS: readonly number[] = [
  60_000,
  5 * 60_000,
  10 * 60_000,
  30 * 60_000,
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
