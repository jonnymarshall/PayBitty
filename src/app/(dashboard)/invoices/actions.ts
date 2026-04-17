"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateAccessCode, computeInvoiceTotals, LineItem } from "@/lib/invoices";

interface DraftPayload {
  client_name: string;
  client_email: string;
  line_items: LineItem[];
  tax_fiat: number;
  btc_address: string;
  due_date: string;
}

export async function saveDraft(payload: DraftPayload) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { subtotal, total } = computeInvoiceTotals(payload.line_items, payload.tax_fiat);

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      user_id: user!.id,
      ...payload,
      subtotal_fiat: subtotal,
      total_fiat: total,
      currency: "USD",
      status: "draft",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  return data;
}

export async function publishInvoice(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch the invoice
  const { data: invoice, error: fetchError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (fetchError || !invoice) throw new Error("Invoice not found");
  if (invoice.user_id !== user!.id) throw new Error("Forbidden");

  // Check BTC address uniqueness across active (non-draft) invoices
  const { data: conflict } = await supabase
    .from("invoices")
    .select("id")
    .eq("btc_address", invoice.btc_address)
    .eq("status", "pending")
    .maybeSingle();

  if (conflict) throw new Error("BTC address is already used on an active invoice");

  const accessCode = generateAccessCode();

  const { error } = await supabase
    .from("invoices")
    .update({ status: "pending", access_code: accessCode })
    .eq("id", invoiceId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  return { accessCode };
}

export async function deleteDraft(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (!invoice || invoice.user_id !== user!.id) throw new Error("Invoice not found");
  if (invoice.status !== "draft") throw new Error("Can only delete draft invoices (only draft invoices may be deleted)");

  const { error } = await supabase.from("invoices").delete().eq("id", invoiceId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function markOverdue(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (!invoice || invoice.user_id !== user!.id) throw new Error("Invoice not found");

  const { error } = await supabase
    .from("invoices")
    .update({ status: "overdue" })
    .eq("id", invoiceId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}
