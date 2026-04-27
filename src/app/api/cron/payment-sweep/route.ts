// Vercel Cron endpoint — runs every minute in production (see vercel.json).
// Polls mempool.space for every invoice whose next_check_at has arrived and
// transitions its status (pending → payment_detected → paid) on matching txs.
//
// Manual test in dev (Vercel Cron does not fire locally):
//   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/payment-sweep

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAddressTxs } from "@/lib/mempool";
import { decidePaymentSchedule } from "@/lib/invoices/payment-schedule";
import { sendPaymentDetectedEmail, sendPaymentConfirmedEmail } from "@/lib/email/send";

const BATCH_SIZE = 50;

interface InvoiceRow {
  id: string;
  user_id: string;
  btc_address: string;
  status: "pending" | "payment_detected";
  mempool_seen_at: string | null;
  stage_attempt: number;
  invoice_number: string | null;
  client_name: string;
  total_fiat: number;
  currency: string;
  btc_txid: string | null;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  const { data: rows, error: fetchError } = await supabase
    .from("invoices")
    .select(
      "id, user_id, btc_address, status, mempool_seen_at, stage_attempt, invoice_number, client_name, total_fiat, currency, btc_txid"
    )
    .in("status", ["pending", "payment_detected"])
    .lte("next_check_at", now.toISOString())
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error("[cron/payment-sweep] fetch failed", fetchError);
    return NextResponse.json({ processed: 0, transitions: 0, errors: 1 }, { status: 500 });
  }

  const invoices = (rows ?? []) as InvoiceRow[];
  let transitions = 0;
  let errors = 0;

  for (const inv of invoices) {
    try {
      const txs = await fetchAddressTxs(inv.btc_address);
      const decision = decidePaymentSchedule(
        {
          status: inv.status,
          btc_address: inv.btc_address,
          mempool_seen_at: inv.mempool_seen_at,
          stage_attempt: inv.stage_attempt,
        },
        txs,
        now
      );

      const update: Record<string, unknown> = {
        status: decision.newStatus,
        mempool_seen_at: decision.newMempoolSeenAt,
        stage_attempt: decision.newStageAttempt,
        next_check_at: decision.newNextCheckAt,
      };
      if (decision.detectedTxid) {
        update.btc_txid = decision.detectedTxid;
      }

      const { error: updateError } = await supabase
        .from("invoices")
        .update(update)
        .eq("id", inv.id)
        .eq("status", inv.status);

      if (updateError) {
        errors += 1;
        console.error("[cron/payment-sweep] update failed", inv.id, updateError);
        continue;
      }

      if (decision.newStatus !== inv.status && decision.detectedTxid) {
        transitions += 1;
        const { data: userRecord } = await supabase.auth.admin.getUserById(inv.user_id);
        const ownerEmail = userRecord?.user?.email;
        if (ownerEmail) {
          const emailArgs = {
            to: ownerEmail,
            userId: inv.user_id,
            invoiceId: inv.id,
            invoiceNumber: inv.invoice_number,
            clientName: inv.client_name || "your client",
            totalFiat: inv.total_fiat,
            currency: inv.currency,
            txid: decision.detectedTxid,
          };
          if (decision.newStatus === "paid") {
            await sendPaymentConfirmedEmail(emailArgs);
          } else {
            await sendPaymentDetectedEmail(emailArgs);
          }
        }
      }
    } catch (err) {
      errors += 1;
      console.error("[cron/payment-sweep] invoice failed", inv.id, err);
    }
  }

  const summary = { processed: invoices.length, transitions, errors };
  console.log("[cron/payment-sweep]", summary);
  return NextResponse.json(summary);
}
