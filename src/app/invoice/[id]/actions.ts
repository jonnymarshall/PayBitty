"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchPublicInvoice } from "@/lib/invoice-public";
import { isAccessCodeValid, accessCookieName } from "@/lib/access-code";

export type AccessCodeState = { error: string | undefined };

export async function verifyAccessCode(
  invoiceId: string,
  _prevState: AccessCodeState,
  formData: FormData
) {
  const submitted = (formData.get("access_code") as string | null)?.trim() ?? null;
  const invoice = await fetchPublicInvoice(invoiceId);

  if (!invoice) redirect("/");

  if (!isAccessCodeValid(invoice.access_code, submitted)) {
    return { error: "Incorrect access code. Please try again." };
  }

  const cookieStore = await cookies();
  cookieStore.set(accessCookieName(invoiceId), submitted ?? "", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: `/invoice/${invoiceId}`,
  });

  redirect(`/invoice/${invoiceId}`);
}
