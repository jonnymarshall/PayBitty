"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchAddressTxs } from "@/lib/mempool";
import { sweepUserInvoices, type SweepResult } from "@/lib/invoices/sweep";
import { sendPaymentDetectedEmail, sendPaymentConfirmedEmail } from "@/lib/email/send";

export async function runLoginSweep(): Promise<SweepResult | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const result = await sweepUserInvoices(user.id, { supabase, fetchAddressTxs });

  if (result.updated.length > 0) {
    revalidatePath("/invoices");
    for (const row of result.updated) {
      revalidatePath(`/invoices/${row.id}`);

      if (user.email) {
        const args = {
          to: user.email,
          invoiceId: row.id,
          invoiceNumber: row.invoice_number,
          clientName: row.client_name || "your client",
          totalFiat: row.total_fiat,
          currency: row.currency,
          txid: row.txid,
        };
        if (row.to === "paid") {
          await sendPaymentConfirmedEmail(args);
        } else {
          await sendPaymentDetectedEmail(args);
        }
      }
    }
  }

  return result;
}
