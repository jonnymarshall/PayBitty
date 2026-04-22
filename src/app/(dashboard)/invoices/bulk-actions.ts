"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function bulkArchive(ids: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("invoices")
    .update({ status: "archived" })
    .eq("user_id", user!.id)
    .in("id", ids);

  if (error) throw new Error(error.message);
  revalidatePath("/invoices");
}

export async function bulkDelete(ids: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("user_id", user!.id)
    .in("id", ids);

  const nonDrafts = (invoices ?? []).filter((inv) => inv.status !== "draft");
  if (nonDrafts.length > 0) {
    throw new Error("Only draft invoices can be bulk deleted");
  }

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("user_id", user!.id)
    .in("id", ids);

  if (error) throw new Error(error.message);
  revalidatePath("/invoices");
}

export async function bulkMarkPaid(ids: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("invoices")
    .update({ status: "paid" })
    .eq("user_id", user!.id)
    .in("id", ids);

  if (error) throw new Error(error.message);
  revalidatePath("/invoices");
}
