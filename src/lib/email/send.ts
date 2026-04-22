import { getResend, getFromAddress, getAppUrl } from "./client";
import { InvoicePublishedEmail } from "./templates/invoice-published";
import { PaymentDetectedEmail } from "./templates/payment-detected";
import { PaymentConfirmedEmail } from "./templates/payment-confirmed";

function fmtCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

async function safeSend(label: string, send: () => Promise<unknown>): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn(`[email] skipping ${label} — RESEND_API_KEY not set`);
    return;
  }
  try {
    await send();
  } catch (err) {
    console.error(`[email] ${label} failed`, err);
  }
}

export interface SendInvoicePublishedArgs {
  to: string;
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
  await safeSend("invoice published", async () => {
    const resend = getResend()!;
    await resend.emails.send({
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
  });
}

export interface SendPaymentStatusArgs {
  to: string;
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
  await safeSend("payment detected", async () => {
    const resend = getResend()!;
    await resend.emails.send({
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
  });
}

export async function sendPaymentConfirmedEmail(args: SendPaymentStatusArgs): Promise<void> {
  await safeSend("payment confirmed", async () => {
    const resend = getResend()!;
    await resend.emails.send({
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
  });
}
