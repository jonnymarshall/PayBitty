import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <Link
          href="/invoices/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          New Invoice
        </Link>
      </div>

      {!invoices?.length ? (
        <div className="rounded-lg border border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">No invoices yet</p>
          <Link
            href="/invoices/new"
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            Create your first invoice
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border">
          {invoices.map((invoice) => (
            <Link
              key={invoice.id}
              href={`/invoices/${invoice.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-medium flex items-center gap-2">
                  <span>{invoice.invoice_number || "—"}</span>
                  {invoice.client_name && (
                    <span className="font-normal text-muted-foreground">{invoice.client_name}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(invoice.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: invoice.currency,
                  }).format(invoice.total_fiat)}
                </span>
                <InvoiceStatusBadge status={invoice.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
