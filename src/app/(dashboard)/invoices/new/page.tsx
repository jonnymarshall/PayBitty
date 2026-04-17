"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveDraft, publishInvoice } from "../actions";
import { computeInvoiceTotals, LineItem } from "@/lib/invoices";

const EMPTY_ITEM: LineItem = { description: "", quantity: 1, unit_price: 0 };

export default function NewInvoicePage() {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [btcAddress, setBtcAddress] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taxFiat, setTaxFiat] = useState(0);
  const [items, setItems] = useState<LineItem[]>([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { subtotal, total } = computeInvoiceTotals(items, taxFiat);

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSaveDraft() {
    setSaving(true);
    setError(null);
    try {
      const invoice = await saveDraft({ client_name: clientName, client_email: clientEmail, line_items: items, tax_fiat: taxFiat, btc_address: btcAddress, due_date: dueDate });
      router.push(`/invoices/${invoice.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setSaving(true);
    setError(null);
    try {
      const invoice = await saveDraft({ client_name: clientName, client_email: clientEmail, line_items: items, tax_fiat: taxFiat, btc_address: btcAddress, due_date: dueDate });
      await publishInvoice(invoice.id);
      router.push(`/invoices/${invoice.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold">New Invoice</h1>

      {error && (
        <div className="rounded-md bg-primary/10 border border-primary/30 px-4 py-3 text-sm text-primary">
          {error}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Client</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Client name" required>
            <input type="text" required value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Client email" required>
            <input type="email" required value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={inputCls} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Line Items</h2>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_80px_100px_36px] gap-2 items-end">
              <Field label={i === 0 ? "Description" : ""}>
                <input type="text" required value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} className={inputCls} placeholder="e.g. Design work" />
              </Field>
              <Field label={i === 0 ? "Qty" : ""}>
                <input type="number" min={1} required value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label={i === 0 ? "Unit price" : ""}>
                <input type="number" min={0} step="0.01" required value={item.unit_price} onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))} className={inputCls} />
              </Field>
              <div className={i === 0 ? "pt-5" : ""}>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)} className="h-9 w-9 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors text-lg leading-none">
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addItem} className="text-sm text-primary hover:underline">
          + Add line item
        </button>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Payment</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="BTC address" required>
            <input type="text" required value={btcAddress} onChange={(e) => setBtcAddress(e.target.value)} className={inputCls} placeholder="bc1q…" />
          </Field>
          <Field label="Due date">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="Tax (USD)">
          <input type="number" min={0} step="0.01" value={taxFiat} onChange={(e) => setTaxFiat(Number(e.target.value))} className={`${inputCls} max-w-[160px]`} />
        </Field>
      </section>

      <div className="rounded-lg border border-border bg-card px-5 py-4 space-y-1.5 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        {taxFiat > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Tax</span>
            <span>${taxFiat.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-base pt-1 border-t border-border">
          <span>Total</span>
          <span>${total.toFixed(2)} USD</span>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
          Save draft
        </Button>
        <Button onClick={handlePublish} disabled={saving}>
          Publish invoice
        </Button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring h-9";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-primary ml-0.5">*</span>}
        </label>
      )}
      {children}
    </div>
  );
}
