import { Invoice } from "@/lib/invoice-public";
import { fiatToBtc, buildBip21Uri } from "@/lib/btc-qr";
import { BtcQrCode } from "@/components/btc-qr-code";
import { format } from "date-fns";

interface Props {
  invoice: Invoice;
  btcPrice: number | null;
}

function fmtCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function StatusBadge({ status }: { status: Invoice["status"] }) {
  const map: Record<Invoice["status"], { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-yellow-500/15 text-yellow-400" },
    payment_detected: { label: "Payment Detected", className: "bg-blue-500/15 text-blue-400" },
    paid: { label: "Paid", className: "bg-green-500/15 text-green-400" },
    overdue: { label: "Overdue", className: "bg-destructive/15 text-destructive" },
    draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  };
  const { label, className } = map[status];
  return (
    <span id="invoice-view--status" className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function InvoicePaymentView({ invoice, btcPrice }: Props) {
  const cur = invoice.currency;
  const showBtc = invoice.accepts_bitcoin && !!invoice.btc_address && !!btcPrice;
  const btcAmount = showBtc ? fiatToBtc(invoice.total_fiat, btcPrice!) : null;
  const bip21Uri = showBtc
    ? buildBip21Uri(
        invoice.btc_address!,
        btcAmount!,
        invoice.invoice_number ?? undefined
      )
    : null;

  const senderHasInfo = invoice.your_name || invoice.your_company || invoice.your_address || invoice.your_email || invoice.your_tax_id;
  const clientHasInfo = invoice.client_name || invoice.client_company || invoice.client_address || invoice.client_email || invoice.client_tax_id;

  return (
    <main id="invoice-view--main" className="min-h-screen p-6">
      <div id="invoice-view--container" className="mx-auto max-w-3xl space-y-8">

        {/* Header */}
        <div id="invoice-view--header" className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 id="invoice-view--title" className="text-2xl font-semibold">
              {invoice.invoice_number ? `Invoice ${invoice.invoice_number}` : "Invoice"}
            </h1>
            {invoice.due_date && (
              <p id="invoice-view--due-date" className="text-sm text-muted-foreground">
                Due {format(new Date(invoice.due_date), "MMMM d, yyyy")}
              </p>
            )}
          </div>
          <StatusBadge status={invoice.status} />
        </div>

        {/* Parties */}
        {(senderHasInfo || clientHasInfo) && (
          <div id="invoice-view--parties" className="grid grid-cols-2 gap-8 rounded-lg border border-border p-6">
            {senderHasInfo && (
              <div id="invoice-view--sender" className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">From</p>
                {invoice.your_name && <p id="invoice-view--sender-name" className="text-sm font-medium">{invoice.your_name}</p>}
                {invoice.your_company && <p id="invoice-view--sender-company" className="text-sm text-muted-foreground">{invoice.your_company}</p>}
                {invoice.your_email && <p id="invoice-view--sender-email" className="text-sm text-muted-foreground">{invoice.your_email}</p>}
                {invoice.your_address && <p id="invoice-view--sender-address" className="text-sm text-muted-foreground whitespace-pre-line">{invoice.your_address}</p>}
                {invoice.your_tax_id && <p id="invoice-view--sender-tax-id" className="text-sm text-muted-foreground">Tax ID: {invoice.your_tax_id}</p>}
              </div>
            )}
            {clientHasInfo && (
              <div id="invoice-view--client" className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">To</p>
                {invoice.client_name && <p id="invoice-view--client-name" className="text-sm font-medium">{invoice.client_name}</p>}
                {invoice.client_company && <p id="invoice-view--client-company" className="text-sm text-muted-foreground">{invoice.client_company}</p>}
                {invoice.client_email && <p id="invoice-view--client-email" className="text-sm text-muted-foreground">{invoice.client_email}</p>}
                {invoice.client_address && <p id="invoice-view--client-address" className="text-sm text-muted-foreground whitespace-pre-line">{invoice.client_address}</p>}
                {invoice.client_tax_id && <p id="invoice-view--client-tax-id" className="text-sm text-muted-foreground">Tax ID: {invoice.client_tax_id}</p>}
              </div>
            )}
          </div>
        )}

        {/* Line items */}
        <div id="invoice-view--line-items" className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th id="invoice-view--col-description" className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                <th id="invoice-view--col-qty" className="px-4 py-3 text-right font-medium text-muted-foreground w-20">Qty</th>
                <th id="invoice-view--col-unit-price" className="px-4 py-3 text-right font-medium text-muted-foreground w-32">Unit price</th>
                <th id="invoice-view--col-total" className="px-4 py-3 text-right font-medium text-muted-foreground w-32">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((item, i) => (
                <tr key={i} id={`invoice-view--line-item-${i}`} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{item.description || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtCurrency(item.unit_price, cur)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtCurrency(item.quantity * item.unit_price, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div id="invoice-view--totals" className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span id="invoice-view--subtotal" className="tabular-nums">{fmtCurrency(invoice.subtotal_fiat, cur)}</span>
            </div>
            {invoice.tax_percent > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({invoice.tax_percent}%)</span>
                <span id="invoice-view--tax" className="tabular-nums">{fmtCurrency(invoice.tax_fiat, cur)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>Total</span>
              <span id="invoice-view--total" className="tabular-nums">{fmtCurrency(invoice.total_fiat, cur)}</span>
            </div>
          </div>
        </div>

        {/* BTC payment */}
        {showBtc && (
          <div id="invoice-view--btc-section" className="rounded-lg border border-border p-6 space-y-6">
            <h2 id="invoice-view--btc-heading" className="font-semibold">Pay with Bitcoin</h2>
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <BtcQrCode uri={bip21Uri!} size={200} />
              <div className="space-y-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">BTC amount</p>
                  <p id="invoice-view--btc-amount" className="text-lg font-semibold tabular-nums">
                    {btcAmount!.toFixed(8).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")} BTC
                  </p>
                  <p className="text-xs text-muted-foreground">
                    at {fmtCurrency(btcPrice!, "USD")}/BTC
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Address</p>
                  <p id="invoice-view--btc-address" className="text-xs font-mono break-all">{invoice.btc_address}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {invoice.accepts_bitcoin && !invoice.btc_address && (
          <p id="invoice-view--btc-missing" className="text-sm text-muted-foreground text-center">
            Bitcoin payment details not yet configured for this invoice.
          </p>
        )}

        {invoice.accepts_bitcoin && invoice.btc_address && !btcPrice && (
          <div id="invoice-view--btc-price-error" className="rounded-lg border border-border p-6 space-y-2">
            <h2 className="font-semibold">Pay with Bitcoin</h2>
            <p className="text-sm text-muted-foreground">
              Bitcoin address: <span className="font-mono text-xs">{invoice.btc_address}</span>
            </p>
            <p className="text-xs text-muted-foreground">BTC price unavailable — please calculate the amount manually.</p>
          </div>
        )}
      </div>
    </main>
  );
}
