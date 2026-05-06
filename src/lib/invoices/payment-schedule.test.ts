import { describe, it, expect } from "vitest";
import type { MempoolTx } from "@/lib/mempool";
import { decidePaymentSchedule } from "./payment-schedule";

const NOW = new Date("2026-04-23T12:00:00.000Z");

function confirmedTx(txid: string, address: string): MempoolTx {
  return {
    txid,
    status: { confirmed: true, block_height: 900_000 },
    vout: [{ scriptpubkey_address: address, value: 50_000 }],
  };
}

function unconfirmedTx(txid: string, address: string): MempoolTx {
  return {
    txid,
    status: { confirmed: false },
    vout: [{ scriptpubkey_address: address, value: 50_000 }],
  };
}

describe("decidePaymentSchedule — pre-mempool (status=pending, mempool_seen_at=null)", () => {
  // v1.4.13.5 schedule: [15s (publish-time), 30s, 60s, 2min, 5min, 10min, 30min].
  // Pre-v1.4.13.5 was [15s, 5min, 10min, 30min] — the post-first-miss leap to
  // 5min meant tx broadcasts that mempool.space indexed at t=60–120s sat
  // undetected by cron until t=300s. New schedule fills in the gap.
  it("after attempt 0 with no paying tx, schedules next check 30s out and increments stage_attempt (v1.4.13.5)", () => {
    const decision = decidePaymentSchedule(
      {
        status: "pending",
        btc_address: "bc1qaddr",
        mempool_seen_at: null,
        stage_attempt: 0,
      },
      [],
      NOW
    );

    expect(decision).toEqual({
      newStatus: "pending",
      newMempoolSeenAt: null,
      newStageAttempt: 1,
      newNextCheckAt: new Date(NOW.getTime() + 30_000).toISOString(),
      detectedTxid: null,
    });
  });

  it("after attempt 1 with no paying tx, schedules next check 60s out (v1.4.13.5)", () => {
    const decision = decidePaymentSchedule(
      {
        status: "pending",
        btc_address: "bc1qaddr",
        mempool_seen_at: null,
        stage_attempt: 1,
      },
      [],
      NOW
    );

    expect(decision.newStageAttempt).toBe(2);
    expect(decision.newNextCheckAt).toBe(new Date(NOW.getTime() + 60_000).toISOString());
  });

  it("after attempt 2 with no paying tx, schedules next check 2min out (v1.4.13.5)", () => {
    const decision = decidePaymentSchedule(
      {
        status: "pending",
        btc_address: "bc1qaddr",
        mempool_seen_at: null,
        stage_attempt: 2,
      },
      [],
      NOW
    );

    expect(decision.newStageAttempt).toBe(3);
    expect(decision.newNextCheckAt).toBe(new Date(NOW.getTime() + 2 * 60_000).toISOString());
  });

  it("after attempt 3 with no paying tx, schedules next check 5min out (v1.4.13.5)", () => {
    const decision = decidePaymentSchedule(
      {
        status: "pending",
        btc_address: "bc1qaddr",
        mempool_seen_at: null,
        stage_attempt: 3,
      },
      [],
      NOW
    );

    expect(decision.newStageAttempt).toBe(4);
    expect(decision.newNextCheckAt).toBe(new Date(NOW.getTime() + 5 * 60_000).toISOString());
  });

  it("after attempt 6 (final pre-mempool, was attempt 3 pre-v1.4.13.5) with no paying tx, stops polling", () => {
    const decision = decidePaymentSchedule(
      {
        status: "pending",
        btc_address: "bc1qaddr",
        mempool_seen_at: null,
        stage_attempt: 6,
      },
      [],
      NOW
    );

    expect(decision.newStatus).toBe("pending");
    expect(decision.newNextCheckAt).toBeNull();
    expect(decision.detectedTxid).toBeNull();
  });

  it("with an unconfirmed paying tx, transitions pending → payment_detected, resets stage_attempt to 0, sets mempool_seen_at, schedules +10m", () => {
    const decision = decidePaymentSchedule(
      {
        status: "pending",
        btc_address: "bc1qaddr",
        mempool_seen_at: null,
        stage_attempt: 1,
      },
      [unconfirmedTx("tx-seen", "bc1qaddr")],
      NOW
    );

    expect(decision).toEqual({
      newStatus: "payment_detected",
      newMempoolSeenAt: NOW.toISOString(),
      newStageAttempt: 0,
      newNextCheckAt: new Date(NOW.getTime() + 10 * 60_000).toISOString(),
      detectedTxid: "tx-seen",
    });
  });

  it("with a confirmed paying tx, transitions straight to paid and stops polling", () => {
    const decision = decidePaymentSchedule(
      {
        status: "pending",
        btc_address: "bc1qaddr",
        mempool_seen_at: null,
        stage_attempt: 2,
      },
      [confirmedTx("tx-paid", "bc1qaddr")],
      NOW
    );

    expect(decision.newStatus).toBe("paid");
    expect(decision.newNextCheckAt).toBeNull();
    expect(decision.detectedTxid).toBe("tx-paid");
  });

  it("ignores txs that do not pay to the invoice's btc_address", () => {
    const decision = decidePaymentSchedule(
      {
        status: "pending",
        btc_address: "bc1qaddr",
        mempool_seen_at: null,
        stage_attempt: 0,
      },
      [confirmedTx("tx-other", "bc1qsomeoneelse")],
      NOW
    );

    expect(decision.newStatus).toBe("pending");
    expect(decision.detectedTxid).toBeNull();
    // v1.4.13.5: attempt-0 retry is now 30s (was 5min)
    expect(decision.newNextCheckAt).toBe(new Date(NOW.getTime() + 30_000).toISOString());
  });
});

describe("decidePaymentSchedule — post-mempool (status=payment_detected)", () => {
  const SEEN = new Date("2026-04-23T10:00:00.000Z").toISOString();

  it("at the end of the 10-minute stage (attempt 2), the next interval is 1 hour", () => {
    const decision = decidePaymentSchedule(
      {
        status: "payment_detected",
        btc_address: "bc1qaddr",
        mempool_seen_at: SEEN,
        stage_attempt: 2,
      },
      [unconfirmedTx("tx-still", "bc1qaddr")],
      NOW
    );

    expect(decision.newStatus).toBe("payment_detected");
    expect(decision.newMempoolSeenAt).toBe(SEEN);
    expect(decision.newStageAttempt).toBe(3);
    expect(decision.newNextCheckAt).toBe(new Date(NOW.getTime() + 60 * 60_000).toISOString());
    expect(decision.detectedTxid).toBeNull();
  });

  it("at the end of the 1-hour stage (attempt 8), the next interval is 4 hours", () => {
    const decision = decidePaymentSchedule(
      {
        status: "payment_detected",
        btc_address: "bc1qaddr",
        mempool_seen_at: SEEN,
        stage_attempt: 8,
      },
      [unconfirmedTx("tx-still", "bc1qaddr")],
      NOW
    );

    expect(decision.newStageAttempt).toBe(9);
    expect(decision.newNextCheckAt).toBe(new Date(NOW.getTime() + 4 * 60 * 60_000).toISOString());
  });

  it("at the end of the 4-hour stage (attempt 20), the next interval is 8 hours", () => {
    const decision = decidePaymentSchedule(
      {
        status: "payment_detected",
        btc_address: "bc1qaddr",
        mempool_seen_at: SEEN,
        stage_attempt: 20,
      },
      [unconfirmedTx("tx-still", "bc1qaddr")],
      NOW
    );

    expect(decision.newStageAttempt).toBe(21);
    expect(decision.newNextCheckAt).toBe(new Date(NOW.getTime() + 8 * 60 * 60_000).toISOString());
  });

  it("at the final attempt (44) with still-unconfirmed tx, stops polling", () => {
    const decision = decidePaymentSchedule(
      {
        status: "payment_detected",
        btc_address: "bc1qaddr",
        mempool_seen_at: SEEN,
        stage_attempt: 44,
      },
      [unconfirmedTx("tx-still", "bc1qaddr")],
      NOW
    );

    expect(decision.newStatus).toBe("payment_detected");
    expect(decision.newNextCheckAt).toBeNull();
    expect(decision.detectedTxid).toBeNull();
  });

  it("when the tx confirms, transitions to paid and stops polling", () => {
    const decision = decidePaymentSchedule(
      {
        status: "payment_detected",
        btc_address: "bc1qaddr",
        mempool_seen_at: SEEN,
        stage_attempt: 5,
      },
      [confirmedTx("tx-confirmed", "bc1qaddr")],
      NOW
    );

    expect(decision.newStatus).toBe("paid");
    expect(decision.newNextCheckAt).toBeNull();
    expect(decision.detectedTxid).toBe("tx-confirmed");
  });

  it("preserves mempool_seen_at when the tx has not yet confirmed", () => {
    const decision = decidePaymentSchedule(
      {
        status: "payment_detected",
        btc_address: "bc1qaddr",
        mempool_seen_at: SEEN,
        stage_attempt: 0,
      },
      [unconfirmedTx("tx-still", "bc1qaddr")],
      NOW
    );

    expect(decision.newMempoolSeenAt).toBe(SEEN);
  });
});
