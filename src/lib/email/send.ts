import { getResend, getFromAddress, getAppUrl } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import { InvoicePublishedEmail } from "./templates/invoice-published";
import { PaymentDetectedEmail } from "./templates/payment-detected";
import { PaymentConfirmedEmail } from "./templates/payment-confirmed";

export type EmailType =
  | "invoice_published"
  | "payment_detected"
  | "payment_confirmed";

export interface EmailContext {
  invoiceId: string;
  userId: string;
  type: EmailType;
  recipient: string;
}

function fmtCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

interface ResendSendResult {
  data?: { id?: string } | null;
  error?: { name?: string; message?: string } | null;
}

async function safeSend(
  ctx: EmailContext,
  send: () => Promise<ResendSendResult>,
): Promise<void> {
  const admin = createAdminClient();

  const { data: row, error: insertError } = await admin
    .from("email_events")
    .insert({
      invoice_id: ctx.invoiceId,
      user_id: ctx.userId,
      email_type: ctx.type,
      recipient: ctx.recipient,
      status: "queued",
    })
    .select("id")
    .single();

  if (insertError || !row) {
    console.error(`[email] failed to record ${ctx.type} event`, insertError);
    return;
  }

  const eventId = row.id;

  if (!getResend()) {
    await admin
      .from("email_events")
      .update({ status: "skipped_no_api_key", updated_at: new Date().toISOString() })
      .eq("id", eventId);
    console.warn(`[email] skipping ${ctx.type} — RESEND_API_KEY not set`);
    return;
  }

  try {
    const result = await send();
    if (result.error) {
      const message = `Resend ${result.error.name ?? "error"}: ${result.error.message ?? ""}`.trim();
      await admin
        .from("email_events")
        .update({
          status: "failed",
          error_message: message.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId);
      console.error(`[email] ${ctx.type} failed`, result.error);
      return;
    }
    await admin
      .from("email_events")
      .update({
        status: "sent",
        resend_message_id: result.data?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId);
    console.log(`[email] ${ctx.type} sent`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await admin
      .from("email_events")
      .update({
        status: "failed",
        error_message: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId);
    console.error(`[email] ${ctx.type} failed`, err);
  }
}

export interface SendInvoicePublishedArgs {
  to: string;
  userId: string;
  senderName: string;
  clientName: string;
  invoiceId: string;
  invoiceNumber: string | null;
  totalFiat: number;
  currency: string;
  accessCode: string | null;
  dueDateDisplay: string | null;
}

export async function sendInvoicePublishedEmail(args: SendInvoicePublishedArgs): Promise<void> {
  await safeSend(
    {
      invoiceId: args.invoiceId,
      userId: args.userId,
      type: "invoice_published",
      recipient: args.to,
    },
    async () => {
      const resend = getResend()!;
      return await resend.emails.send({
        from: getFromAddress(),
        to: args.to,
        subject: args.invoiceNumber
          ? `Invoice ${args.invoiceNumber} from ${args.senderName}`
          : `New invoice from ${args.senderName}`,
        react: InvoicePublishedEmail({
          senderName: args.senderName,
          clientName: args.clientName,
          invoiceNumber: args.invoiceNumber,
          totalDisplay: fmtCurrency(args.totalFiat, args.currency),
          invoiceUrl: `${getAppUrl()}/invoice/${args.invoiceId}`,
          accessCode: args.accessCode,
          dueDateDisplay: args.dueDateDisplay,
        }),
      });
    },
  );
}

export interface SendPaymentStatusArgs {
  to: string;
  userId: string;
  invoiceId: string;
  invoiceNumber: string | null;
  clientName: string;
  totalFiat: number;
  currency: string;
  txid: string;
}

function mempoolLink(txid: string): string {
  const base = process.env.NEXT_PUBLIC_MEMPOOL_BASE_URL || "https://mempool.space";
  return `${base}/tx/${txid}`;
}

export async function sendPaymentDetectedEmail(args: SendPaymentStatusArgs): Promise<void> {
  await safeSend(
    {
      invoiceId: args.invoiceId,
      userId: args.userId,
      type: "payment_detected",
      recipient: args.to,
    },
    async () => {
      const resend = getResend()!;
      return await resend.emails.send({
        from: getFromAddress(),
        to: args.to,
        subject: args.invoiceNumber
          ? `Payment detected for invoice ${args.invoiceNumber}`
          : "Payment detected on your invoice",
        react: PaymentDetectedEmail({
          invoiceNumber: args.invoiceNumber,
          clientName: args.clientName,
          totalDisplay: fmtCurrency(args.totalFiat, args.currency),
          txid: args.txid,
          mempoolUrl: mempoolLink(args.txid),
          dashboardUrl: `${getAppUrl()}/invoices/${args.invoiceId}`,
        }),
      });
    },
  );
}

export async function sendPaymentConfirmedEmail(args: SendPaymentStatusArgs): Promise<void> {
  await safeSend(
    {
      invoiceId: args.invoiceId,
      userId: args.userId,
      type: "payment_confirmed",
      recipient: args.to,
    },
    async () => {
      const resend = getResend()!;
      return await resend.emails.send({
        from: getFromAddress(),
        to: args.to,
        subject: args.invoiceNumber
          ? `Payment confirmed for invoice ${args.invoiceNumber}`
          : "Payment confirmed on your invoice",
        react: PaymentConfirmedEmail({
          invoiceNumber: args.invoiceNumber,
          clientName: args.clientName,
          totalDisplay: fmtCurrency(args.totalFiat, args.currency),
          txid: args.txid,
          mempoolUrl: mempoolLink(args.txid),
          dashboardUrl: `${getAppUrl()}/invoices/${args.invoiceId}`,
        }),
      });
    },
  );
}
