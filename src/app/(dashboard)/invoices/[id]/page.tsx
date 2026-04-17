import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";
import { InvoiceActions } from "./invoice-actions";
import type { LineItem } from "@/lib/invoices";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!invoice) notFound();

  const items: LineItem[] = invoice.line_items ?? [];
  const shareLink = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/invoice/${invoice.id}`;

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Invoices
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{invoice.client_name}</h1>
          <p className="text-sm text-muted-foreground">{invoice.client_email}</p>
        </div>
        <InvoiceStatusBadge status={invoice.status} />
      </div>

      {invoice.status !== "draft" && invoice.access_code && (
        <div className="rounded-lg border border-border bg-card px-5 py-4 space-y-3">
          <p className="text-sm font-medium">Share with client</p>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Invoice link</p>
            <code className="block text-xs bg-muted rounded px-3 py-2 break-all">{shareLink}</code>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Access code</p>
            <code className="block text-lg font-mono font-semibold tracking-widest px-3 py-2 bg-muted rounded">
              {invoice.access_code}
            </code>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Line Items</h2>
        <div className="rounded-lg border border-border divide-y divide-border">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{item.description}</span>
              <span className="text-muted-foreground">
                {item.quantity} × ${item.unit_price.toFixed(2)} ={" "}
                <span className="text-foreground font-medium">
                  ${(item.quantity * item.unit_price).toFixed(2)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-lg border border-border bg-card px-5 py-4 space-y-1.5 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>${invoice.subtotal_fiat?.toFixed(2)}</span>
        </div>
        {invoice.tax_fiat > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Tax</span>
            <span>${invoice.tax_fiat.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-base pt-1 border-t border-border">
          <span>Total</span>
          <span>${invoice.total_fiat?.toFixed(2)} {invoice.currency}</span>
        </div>
      </div>

      <InvoiceActions invoice={invoice} />
    </div>
  );
}
