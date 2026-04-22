import type { SupabaseClient } from "@supabase/supabase-js";
import { txPaysToAddress, type MempoolTx } from "@/lib/mempool";

type SweepableStatus = "pending" | "payment_detected";

export interface SweepDeps {
  supabase: SupabaseClient;
  fetchAddressTxs: (address: string) => Promise<MempoolTx[]>;
}

export interface SweepUpdate {
  id: string;
  from: SweepableStatus;
  to: "payment_detected" | "paid";
  txid: string;
  invoice_number: string | null;
  client_name: string;
  total_fiat: number;
  currency: string;
}

export interface SweepResult {
  checked: number;
  updated: SweepUpdate[];
}

interface InvoiceRow {
  id: string;
  btc_address: string;
  status: SweepableStatus;
  invoice_number: string | null;
  client_name: string;
  total_fiat: number;
  currency: string;
}

export async function sweepUserInvoices(
  userId: string,
  deps: SweepDeps
): Promise<SweepResult> {
  const { supabase, fetchAddressTxs } = deps;

  const { data: invoices } = (await supabase
    .from("invoices")
    .select("id, btc_address, status, invoice_number, client_name, total_fiat, currency")
    .eq("user_id", userId)
    .in("status", ["pending", "payment_detected"])
    .not("btc_address", "is", null)) as { data: InvoiceRow[] | null };

  const rows = invoices ?? [];
  const updated: SweepUpdate[] = [];

  for (const inv of rows) {
    const txs = await fetchAddressTxs(inv.btc_address);
    const paying = txs.find((tx) => txPaysToAddress(tx, inv.btc_address));
    if (!paying) continue;

    const nextStatus: "payment_detected" | "paid" = paying.status.confirmed
      ? "paid"
      : "payment_detected";

    if (nextStatus === inv.status) continue;

    const { error } = await supabase
      .from("invoices")
      .update({ status: nextStatus, btc_txid: paying.txid })
      .eq("id", inv.id)
      .eq("user_id", userId)
      .eq("status", inv.status);

    if (!error) {
      updated.push({
        id: inv.id,
        from: inv.status,
        to: nextStatus,
        txid: paying.txid,
        invoice_number: inv.invoice_number,
        client_name: inv.client_name,
        total_fiat: inv.total_fiat,
        currency: inv.currency,
      });
    }
  }

  return { checked: rows.length, updated };
}
