import { type NextRequest, NextResponse } from "next/server";
import { fetchPublicInvoice } from "@/lib/invoice-public";
import { renderInvoicePdf } from "@/lib/invoices/invoice-pdf";
import { buildPdfFilename } from "@/lib/invoices/pdf-filename";
import { getAppUrl } from "@/lib/email/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const invoice = await fetchPublicInvoice(id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const pdf = await renderInvoicePdf(invoice, { appUrl: getAppUrl() });
  const filename = buildPdfFilename(invoice);
  const asciiFilename = filename.replace(/[^\x20-\x7E]/g, "_");
  const encodedFilename = encodeURIComponent(filename);

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
      "cache-control": "private, no-store",
    },
  });
}
