"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/date-picker";
import { saveDraft, updateDraft, publishInvoice, InvoicePayload } from "@/app/(dashboard)/invoices/actions";
import { computeInvoiceTotals, isValidEmail, LineItem } from "@/lib/invoices";

interface InvoiceFormProps {
  invoiceId?: string; // provided when editing a draft
  initialValues?: Partial<FormState>;
}

interface FormState {
  invoice_number: string;
  your_name: string;
  your_email: string;
  your_company: string;
  your_address: string;
  your_tax_id: string;
  client_name: string;
  client_email: string;
  client_company: string;
  client_address: string;
  client_tax_id: string;
  line_items: LineItem[];
  tax_percent: string;
  accepts_bitcoin: boolean;
  btc_address: string;
  due_date: Date | undefined;
  no_due_date: boolean;
  access_code: string;
  no_access_code: boolean;
}

const DEFAULT_STATE: FormState = {
  invoice_number: "",
  your_name: "",
  your_email: "",
  your_company: "",
  your_address: "",
  your_tax_id: "",
  client_name: "",
  client_email: "",
  client_company: "",
  client_address: "",
  client_tax_id: "",
  line_items: [{ description: "", quantity: 1, unit_price: 0 }],
  tax_percent: "",
  accepts_bitcoin: false,
  btc_address: "",
  due_date: undefined,
  no_due_date: false,
  access_code: "",
  no_access_code: false,
};

export function InvoiceForm({ invoiceId, initialValues }: InvoiceFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ ...DEFAULT_STATE, ...initialValues });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateItem(index: number, field: keyof LineItem, raw: string) {
    setForm((prev) => {
      const items = [...prev.line_items];
      if (field === "description") {
        items[index] = { ...items[index], [field]: raw };
      } else {
        items[index] = { ...items[index], [field]: raw === "" ? 0 : parseFloat(raw) || 0 };
      }
      return { ...prev, line_items: items };
    });
  }

  function addItem() {
    set("line_items", [...form.line_items, { description: "", quantity: 1, unit_price: 0 }]);
  }

  function removeItem(i: number) {
    set("line_items", form.line_items.filter((_, idx) => idx !== i));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.client_name.trim()) errs.client_name = "Client name is required";
    if (form.client_email && !isValidEmail(form.client_email)) errs.client_email = "Must be a valid email";
    if (form.your_email && !isValidEmail(form.your_email)) errs.your_email = "Must be a valid email";
    if (form.invoice_number && form.invoice_number.length > 50) errs.invoice_number = "Max 50 characters";
    if (form.accepts_bitcoin && !form.btc_address.trim()) errs.btc_address = "BTC address required when Bitcoin is enabled";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function buildPayload(): InvoicePayload {
    return {
      invoice_number: form.invoice_number || undefined,
      your_name: form.your_name || undefined,
      your_email: form.your_email || undefined,
      your_company: form.your_company || undefined,
      your_address: form.your_address || undefined,
      your_tax_id: form.your_tax_id || undefined,
      client_name: form.client_name,
      client_email: form.client_email || undefined,
      client_company: form.client_company || undefined,
      client_address: form.client_address || undefined,
      client_tax_id: form.client_tax_id || undefined,
      line_items: form.line_items,
      tax_percent: parseFloat(form.tax_percent) || 0,
      accepts_bitcoin: form.accepts_bitcoin,
      btc_address: form.accepts_bitcoin ? form.btc_address : undefined,
      due_date: !form.no_due_date && form.due_date ? form.due_date.toISOString().split("T")[0] : undefined,
      access_code: !form.no_access_code ? form.access_code || undefined : undefined,
    };
  }

  async function handleSaveDraft() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = buildPayload();
      if (invoiceId) {
        await updateDraft(invoiceId, payload);
        router.push(`/invoices/${invoiceId}`);
      } else {
        const invoice = await saveDraft(payload);
        router.push(`/invoices/${invoice.id}`);
      }
    } catch (e) {
      setErrors({ _form: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = buildPayload();
      let id = invoiceId;
      if (id) {
        await updateDraft(id, payload);
      } else {
        const invoice = await saveDraft(payload);
        id = invoice.id;
      }
      await publishInvoice(id!);
      router.push(`/invoices/${id}`);
    } catch (e) {
      setErrors({ _form: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  const taxPct = parseFloat(form.tax_percent) || 0;
  const { subtotal, taxFiat, total } = computeInvoiceTotals(form.line_items, taxPct);

  return (
    <div className="max-w-2xl space-y-8">
      {errors._form && (
        <div className="rounded-md bg-primary/10 border border-primary/30 px-4 py-3 text-sm text-primary">
          {errors._form}
        </div>
      )}

      {/* Invoice number */}
      <Field label="Invoice number" error={errors.invoice_number}>
        <input
          type="text"
          maxLength={50}
          value={form.invoice_number}
          onChange={(e) => set("invoice_number", e.target.value)}
          className={inputCls}
          placeholder="e.g. INV-001"
        />
      </Field>

      {/* YOU / CLIENT split */}
      <div className="grid grid-cols-2 gap-8">
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">You</h2>
          <Field label="Your name">
            <input type="text" value={form.your_name} onChange={(e) => set("your_name", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Your email" error={errors.your_email}>
            <input type="email" value={form.your_email} onChange={(e) => set("your_email", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Company">
            <input type="text" value={form.your_company} onChange={(e) => set("your_company", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Address">
            <input type="text" value={form.your_address} onChange={(e) => set("your_address", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Tax ID">
            <input type="text" value={form.your_tax_id} onChange={(e) => set("your_tax_id", e.target.value)} className={inputCls} />
          </Field>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Client</h2>
          <Field label="Client name" error={errors.client_name}>
            <input type="text" value={form.client_name} onChange={(e) => set("client_name", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Client email" error={errors.client_email}>
            <input type="email" value={form.client_email} onChange={(e) => set("client_email", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Company">
            <input type="text" value={form.client_company} onChange={(e) => set("client_company", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Address">
            <input type="text" value={form.client_address} onChange={(e) => set("client_address", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Tax ID">
            <input type="text" value={form.client_tax_id} onChange={(e) => set("client_tax_id", e.target.value)} className={inputCls} />
          </Field>
        </section>
      </div>

      {/* Line items */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Line Items</h2>
        <div className="space-y-2">
          {form.line_items.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_90px_110px_32px] gap-2 items-end">
              <Field label={i === 0 ? "Description" : ""}>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(i, "description", e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Design work"
                />
              </Field>
              <Field label={i === 0 ? "Qty" : ""}>
                <input
                  type="number"
                  value={item.quantity === 0 ? "" : item.quantity}
                  onChange={(e) => updateItem(i, "quantity", e.target.value)}
                  onBlur={(e) => { if (e.target.value === "") updateItem(i, "quantity", "0"); }}
                  max={100000}
                  step="0.01"
                  className={`${inputCls} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                />
              </Field>
              <Field label={i === 0 ? "Unit price" : ""}>
                <input
                  type="number"
                  value={item.unit_price === 0 ? "" : item.unit_price}
                  onChange={(e) => updateItem(i, "unit_price", e.target.value)}
                  onBlur={(e) => { if (e.target.value === "") updateItem(i, "unit_price", "0"); }}
                  max={1000000000}
                  step="0.01"
                  className={`${inputCls} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                />
              </Field>
              <div className={i === 0 ? "pt-[22px]" : ""}>
                {form.line_items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="h-9 w-8 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors text-base"
                  >
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

      {/* Tax */}
      <Field label="Tax %">
        <div className="relative max-w-[140px]">
          <input
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={form.tax_percent}
            onChange={(e) => set("tax_percent", e.target.value)}
            placeholder="0"
            className={`${inputCls} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none pr-8`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
        </div>
      </Field>

      {/* Due date */}
      <Field label="Due date">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={form.no_due_date}
              onChange={(e) => set("no_due_date", e.target.checked)}
              className="rounded border-border"
            />
            No due date
          </label>
          {!form.no_due_date && (
            <DatePicker
              value={form.due_date}
              onChange={(d) => set("due_date", d)}
              placeholder="Select due date"
            />
          )}
        </div>
      </Field>

      {/* Bitcoin */}
      <section className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={form.accepts_bitcoin}
            onChange={(e) => set("accepts_bitcoin", e.target.checked)}
            className="rounded border-border"
          />
          Accept Bitcoin payment
        </label>
        {form.accepts_bitcoin && (
          <Field label="BTC address" error={errors.btc_address}>
            <input
              type="text"
              value={form.btc_address}
              onChange={(e) => set("btc_address", e.target.value)}
              className={inputCls}
              placeholder="bc1q…"
            />
          </Field>
        )}
      </section>

      {/* Access code */}
      <section className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={form.no_access_code}
            onChange={(e) => set("no_access_code", e.target.checked)}
            className="rounded border-border"
          />
          No access code (anyone with the link can view)
        </label>
        {!form.no_access_code && (
          <Field label="Access code">
            <input
              type="text"
              value={form.access_code}
              onChange={(e) => set("access_code", e.target.value.toUpperCase().slice(0, 16))}
              className={`${inputCls} max-w-[200px] font-mono tracking-widest`}
              placeholder="e.g. MYCODE01"
            />
          </Field>
        )}
      </section>

      {/* Totals */}
      <div className="rounded-lg border border-border bg-card px-5 py-4 space-y-1.5 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        {taxPct > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Tax ({taxPct}%)</span>
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

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium">{label}</label>}
      {children}
      {error && <p className="text-xs text-primary">{error}</p>}
    </div>
  );
}
