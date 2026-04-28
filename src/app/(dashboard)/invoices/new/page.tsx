import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvoiceForm } from "@/components/invoice-form";

export default async function NewInvoicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New Invoice</h1>
      <InvoiceForm sessionEmail={user.email} />
    </div>
  );
}
