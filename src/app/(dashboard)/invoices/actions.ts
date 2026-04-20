"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeInvoiceTotals, LineItem } from "@/lib/invoices";

export interface InvoicePayload {
  invoice_number?: string;
  your_name?: string;
  your_email?: string;
  your_company?: string;
  your_address?: string;
  your_tax_id?: string;
  client_name?: string;
  client_email?: string;
  client_company?: string;
  client_address?: string;
  client_tax_id?: string;
  line_items: LineItem[];
  tax_percent: number;
  accepts_bitcoin: boolean;
  btc_address?: string;
  due_date?: string;
  access_code?: string;
}

export async function saveDraft(payload: InvoicePayload) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { subtotal, taxFiat, total } = computeInvoiceTotals(payload.line_items, payload.tax_percent);

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      user_id: user!.id,
      invoice_number: payload.invoice_number || null,
      your_name: payload.your_name || null,
      your_email: payload.your_email ?? "",
      your_company: payload.your_company || null,
      your_address: payload.your_address || null,
      your_tax_id: payload.your_tax_id || null,
      client_name: payload.client_name ?? "",
      client_email: payload.client_email ?? "",
      client_company: payload.client_company || null,
      client_address: payload.client_address || null,
      client_tax_id: payload.client_tax_id || null,
      line_items: payload.line_items,
      tax_percent: payload.tax_percent,
      tax_fiat: taxFiat,
      subtotal_fiat: subtotal,
      total_fiat: total,
      currency: "USD",
      accepts_bitcoin: payload.accepts_bitcoin,
      btc_address: payload.accepts_bitcoin ? (payload.btc_address || null) : null,
      due_date: payload.due_date || null,
      access_code: payload.access_code || null,
      status: "draft",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  return data;
}

export async function updateDraft(invoiceId: string, payload: InvoicePayload) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("invoices")
    .select("status, user_id")
    .eq("id", invoiceId)
    .single();

  if (!existing || existing.user_id !== user!.id) throw new Error("Invoice not found");
  if (existing.status !== "draft") throw new Error("Only draft invoices can be edited");

  const { subtotal, taxFiat, total } = computeInvoiceTotals(payload.line_items, payload.tax_percent);

  const { data, error } = await supabase
    .from("invoices")
    .update({
      invoice_number: payload.invoice_number || null,
      your_name: payload.your_name || null,
      your_email: payload.your_email ?? "",
      your_company: payload.your_company || null,
      your_address: payload.your_address || null,
      your_tax_id: payload.your_tax_id || null,
      client_name: payload.client_name ?? "",
      client_email: payload.client_email ?? "",
      client_company: payload.client_company || null,
      client_address: payload.client_address || null,
      client_tax_id: payload.client_tax_id || null,
      line_items: payload.line_items,
      tax_percent: payload.tax_percent,
      tax_fiat: taxFiat,
      subtotal_fiat: subtotal,
      total_fiat: total,
      accepts_bitcoin: payload.accepts_bitcoin,
      btc_address: payload.accepts_bitcoin ? (payload.btc_address || null) : null,
      due_date: payload.due_date || null,
      access_code: payload.access_code || null,
    })
    .eq("id", invoiceId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath(`/invoices/${invoiceId}`);
  return data;
}

export async function publishInvoice(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: invoice, error: fetchError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (fetchError || !invoice) throw new Error("Invoice not found");
  if (invoice.user_id !== user!.id) throw new Error("Forbidden");

  // Only check BTC uniqueness if bitcoin is enabled and address is provided
  if (invoice.accepts_bitcoin && invoice.btc_address) {
    const { data: conflict } = await supabase
      .from("invoices")
      .select("id, invoice_number")
      .eq("btc_address", invoice.btc_address)
      .neq("status", "draft")
      .neq("id", invoiceId)
      .maybeSingle();

    if (conflict) {
      const ref = conflict.invoice_number ? `invoice ${conflict.invoice_number}` : `invoice …${conflict.id.slice(-8)}`;
      throw new Error(`btc_address: This bitcoin address has already been used on ${ref}. Please provide a unique address.`);
    }
  }

  const { error } = await supabase
    .from("invoices")
    .update({ status: "pending" })
    .eq("id", invoiceId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function markPaid(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("user_id")
    .eq("id", invoiceId)
    .single();

  if (!invoice || invoice.user_id !== user!.id) throw new Error("Invoice not found");

  const { error } = await supabase
    .from("invoices")
    .update({ status: "paid" })
    .eq("id", invoiceId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath(`/invoices/${invoiceId}`);
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

export async function markUnpaid(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("user_id")
    .eq("id", invoiceId)
    .single();

  if (!invoice || invoice.user_id !== user!.id) throw new Error("Invoice not found");

  const { error } = await supabase
    .from("invoices")
    .update({ status: "pending" })
    .eq("id", invoiceId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath(`/invoices/${invoiceId}`);
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
