"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/date-picker";
import { saveDraft, updateDraft, publishInvoice, InvoicePayload } from "@/app/(dashboard)/invoices/actions";
import { computeInvoiceTotals, isValidEmail, LineItem } from "@/lib/invoices";

interface InvoiceFormProps {
  invoiceId?: string;
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
        items[index] = { ...items[index], description: raw };
      } else {
        const n = raw === "" ? 0 : parseFloat(raw);
        items[index] = { ...items[index], [field]: isNaN(n) ? 0 : n };
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
      client_name: form.client_name || "Unnamed",
      client_email: form.client_email || undefined,
      client_company: form.client_company || undefined,
      client_address: form.client_address || undefined,
      client_tax_id: form.client_tax_id || undefined,
      line_items: form.line_items,
      tax_percent: parseFloat(form.tax_percent) || 0,
      accepts_bitcoin: form.accepts_bitcoin,
      btc_address: form.accepts_bitcoin ? form.btc_address : undefined,
      due_date: !form.no_due_date && form.due_date ? form.due_date.toISOString().split("T")[0] : undefined,
      access_code: form.access_code.trim() || undefined,
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
    <div className="space-y-8">
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
          className={`${inputCls} max-w-xs`}
          placeholder="e.g. INV-001"
        />
      </Field>

      {/* YOU / CLIENT split */}
      <div className="grid grid-cols-2 gap-8 relative">
        <div className="absolute inset-y-0 left-1/2 w-px bg-border -translate-x-1/2" />
        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">You</h2>
          <Field label="Name">
            <input type="text" value={form.your_name} onChange={(e) => set("your_name", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Email" error={errors.your_email}>
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

        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Client</h2>
          <Field label="Name" error={errors.client_name}>
            <input type="text" value={form.client_name} onChange={(e) => set("client_name", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Email" error={errors.client_email}>
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

        {/* Header row */}
        <div className="flex gap-3">
          <span className="flex-1 min-w-0 text-sm font-medium">Description</span>
          <span className="w-20 shrink-0 text-sm font-medium">Qty</span>
          <span className="w-28 shrink-0 text-sm font-medium">Unit price</span>
          <span className="w-8 shrink-0" />
        </div>

        <div className="space-y-2">
          {form.line_items.map((item, i) => (
            <div key={i} className="flex gap-3 items-center">
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateItem(i, "description", e.target.value)}
                className={`${inputBase} flex-1 min-w-0`}
                placeholder="e.g. Design work"
              />
              <input
                type="number"
                value={item.quantity === 0 ? "" : item.quantity}
                onChange={(e) => updateItem(i, "quantity", e.target.value)}
                max={100000}
                step="any"
                className={`${inputBase} ${noSpinner} w-20 shrink-0`}
                placeholder="1"
              />
              <input
                type="number"
                value={item.unit_price === 0 ? "" : item.unit_price}
                onChange={(e) => updateItem(i, "unit_price", e.target.value)}
                max={1000000000}
                step="any"
                className={`${inputBase} ${noSpinner} w-28 shrink-0`}
                placeholder="0.00"
              />
              <div className="w-8 shrink-0 flex justify-center">
                {form.line_items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="h-9 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors text-lg"
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
      <Field label="Tax">
        <div className="flex items-center w-36">
          <input
            type="number"
            min={0}
            max={100}
            step="any"
            value={form.tax_percent}
            onChange={(e) => set("tax_percent", e.target.value)}
            placeholder="0"
            className={`${inputCls} ${noSpinner} rounded-r-none border-r-0 flex-1`}
          />
          <span className="h-9 px-3 flex items-center border border-input rounded-r-md text-sm text-muted-foreground bg-muted/30 select-none shrink-0">
            %
          </span>
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
            <div className="max-w-xs">
              <DatePicker
                value={form.due_date}
                onChange={(d) => set("due_date", d)}
                placeholder="Select due date"
              />
            </div>
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
      <Field label="Access code (Optional)">
        <input
          type="text"
          value={form.access_code}
          onChange={(e) => set("access_code", e.target.value.toUpperCase().slice(0, 16))}
          className={`${inputCls} max-w-[200px] font-mono tracking-widest`}
          placeholder="e.g. MYCODE01"
        />
        <p className="text-xs text-muted-foreground">Leave blank for no access code — anyone with the link can view.</p>
      </Field>

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

const inputBase =
  "rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring h-9";

const inputCls = `w-full ${inputBase}`;

const noSpinner =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium">{label}</label>}
      {children}
      {error && <p className="text-xs text-primary">{error}</p>}
    </div>
  );
}
