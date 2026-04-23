import { type NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchTx, txPaysToAddress } from "@/lib/mempool";
import { sendPaymentDetectedEmail, sendPaymentConfirmedEmail } from "@/lib/email/send";

type PayableStatus = "payment_detected" | "paid";

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  payment_detected: 1,
  paid: 2,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { txid?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { txid, status } = body;
  if (!txid) return NextResponse.json({ error: "txid required" }, { status: 400 });
  if (status !== "payment_detected" && status !== "paid") {
    return NextResponse.json({ error: "status must be payment_detected or paid" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("id, btc_address, status, user_id, invoice_number, client_name, total_fiat, currency")
    .eq("id", id)
    .single();

  if (error || !invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  // Already at or past this status — tell the client what the current status is
  const currentOrder = STATUS_ORDER[invoice.status] ?? -1;
  const newOrder = STATUS_ORDER[status];
  if (newOrder <= currentOrder) {
    return NextResponse.json({ status: invoice.status });
  }

  const tx = await fetchTx(txid);
  if (!tx || !txPaysToAddress(tx, invoice.btc_address)) {
    return NextResponse.json({ error: "Transaction does not pay to invoice address" }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("invoices")
    .update({ status: status as PayableStatus, btc_txid: txid })
    .eq("id", id)
    .eq("status", invoice.status)
    .select("status")
    .single();

  if (updateError) {
    // PGRST116 = 0 rows matched (status already changed, idempotent — return requested status)
    if (updateError.code === "PGRST116") {
      return NextResponse.json({ status });
    }
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }

  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");

  const { data: userRecord } = await supabase.auth.admin.getUserById(invoice.user_id);
  const ownerEmail = userRecord?.user?.email;
  if (ownerEmail) {
    const emailArgs = {
      to: ownerEmail,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      clientName: invoice.client_name || "your client",
      totalFiat: invoice.total_fiat,
      currency: invoice.currency,
      txid,
    };
    if (status === "payment_detected") {
      await sendPaymentDetectedEmail(emailArgs);
    } else {
      await sendPaymentConfirmedEmail(emailArgs);
    }
  }

  return NextResponse.json({ status: updated.status });
}
