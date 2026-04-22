import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { format } from "date-fns";
import type { Invoice } from "@/lib/invoice-public";

function fmtCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function fmtDate(iso: string): string {
  return format(new Date(iso), "MMMM d, yyyy");
}

function fmtDueDate(iso: string): string {
  return format(new Date(iso + "T12:00:00"), "MMMM d, yyyy");
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700 },
  meta: { textAlign: "right", fontSize: 10 },
  partiesRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  party: { width: "48%" },
  partyLabel: { fontSize: 8, color: "#666", textTransform: "uppercase", marginBottom: 4, letterSpacing: 1 },
  partyLine: { marginBottom: 2 },
  itemsHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingBottom: 6,
    marginBottom: 6,
  },
  itemRow: { flexDirection: "row", paddingVertical: 4 },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1, textAlign: "right" },
  totalsBlock: { marginTop: 12, alignItems: "flex-end" },
  totalsRow: { flexDirection: "row", width: 200, justifyContent: "space-between", marginBottom: 2 },
  grandTotal: { fontSize: 12, fontWeight: 700, marginTop: 4 },
  btcBlock: {
    marginTop: 28,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
  },
  btcLabel: { fontSize: 8, color: "#666", textTransform: "uppercase", marginBottom: 4, letterSpacing: 1 },
  mono: { fontFamily: "Courier" },
});

function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const lineTotal = (li: Invoice["line_items"][number]) => li.quantity * li.unit_price;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>INVOICE</Text>
            {invoice.invoice_number ? <Text>{invoice.invoice_number}</Text> : null}
          </View>
          <View style={styles.meta}>
            <Text>Date: {fmtDate(invoice.created_at)}</Text>
            {invoice.due_date ? <Text>Due: {fmtDueDate(invoice.due_date)}</Text> : null}
          </View>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>From</Text>
            {invoice.your_name ? <Text style={styles.partyLine}>{invoice.your_name}</Text> : null}
            {invoice.your_company ? <Text style={styles.partyLine}>{invoice.your_company}</Text> : null}
            {invoice.your_email ? <Text style={styles.partyLine}>{invoice.your_email}</Text> : null}
            {invoice.your_address ? <Text style={styles.partyLine}>{invoice.your_address}</Text> : null}
            {invoice.your_tax_id ? <Text style={styles.partyLine}>Tax ID: {invoice.your_tax_id}</Text> : null}
          </View>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>Bill to</Text>
            <Text style={styles.partyLine}>{invoice.client_name}</Text>
            {invoice.client_company ? <Text style={styles.partyLine}>{invoice.client_company}</Text> : null}
            {invoice.client_email ? <Text style={styles.partyLine}>{invoice.client_email}</Text> : null}
            {invoice.client_address ? <Text style={styles.partyLine}>{invoice.client_address}</Text> : null}
            {invoice.client_tax_id ? <Text style={styles.partyLine}>Tax ID: {invoice.client_tax_id}</Text> : null}
          </View>
        </View>

        <View style={styles.itemsHeader}>
          <Text style={styles.colDesc}>Description</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colPrice}>Unit price</Text>
          <Text style={styles.colTotal}>Total</Text>
        </View>
        {invoice.line_items.map((li, idx) => (
          <View key={idx} style={styles.itemRow}>
            <Text style={styles.colDesc}>{li.description}</Text>
            <Text style={styles.colQty}>{li.quantity}</Text>
            <Text style={styles.colPrice}>{fmtCurrency(li.unit_price, invoice.currency)}</Text>
            <Text style={styles.colTotal}>{fmtCurrency(lineTotal(li), invoice.currency)}</Text>
          </View>
        ))}

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text>Subtotal</Text>
            <Text>{fmtCurrency(invoice.subtotal_fiat, invoice.currency)}</Text>
          </View>
          {invoice.tax_percent > 0 ? (
            <View style={styles.totalsRow}>
              <Text>Tax ({invoice.tax_percent}%)</Text>
              <Text>{fmtCurrency(invoice.tax_fiat, invoice.currency)}</Text>
            </View>
          ) : null}
          <View style={[styles.totalsRow, styles.grandTotal]}>
            <Text>Total</Text>
            <Text>{fmtCurrency(invoice.total_fiat, invoice.currency)}</Text>
          </View>
        </View>

        {invoice.accepts_bitcoin && invoice.btc_address ? (
          <View style={styles.btcBlock}>
            <Text style={styles.btcLabel}>Pay with Bitcoin</Text>
            <Text style={styles.mono}>{invoice.btc_address}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(invoice: Invoice): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument invoice={invoice} />);
}
