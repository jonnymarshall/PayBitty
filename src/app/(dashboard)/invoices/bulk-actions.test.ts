import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { bulkArchive, bulkDelete, bulkMarkPaid } from "./bulk-actions";

type AnySupabase = Awaited<ReturnType<typeof createClient>>;

function makeBulkSupabase({
  fetchData = [] as { id: string; status: string }[],
  updateError = null as { message: string } | null,
  deleteError = null as { message: string } | null,
  userId = "user-1",
} = {}) {
  // update chain: .update(payload).eq("user_id", uid).in("id", ids) → { error }
  const updateIn = vi.fn().mockResolvedValue({ error: updateError });
  const updateEq = vi.fn().mockReturnValue({ in: updateIn });
  const updateFn = vi.fn().mockReturnValue({ eq: updateEq });

  // delete chain: .delete().eq("user_id", uid).in("id", ids) → { error }
  const deleteIn = vi.fn().mockResolvedValue({ error: deleteError });
  const deleteEq = vi.fn().mockReturnValue({ in: deleteIn });
  const deleteFn = vi.fn().mockReturnValue({ eq: deleteEq });

  // select chain: .select(cols).eq("user_id", uid).in("id", ids) → { data }
  const selectIn = vi.fn().mockResolvedValue({ data: fetchData });
  const selectEq = vi.fn().mockReturnValue({ in: selectIn });
  const selectFn = vi.fn().mockReturnValue({ eq: selectEq });

  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
    },
    from: vi.fn(() => ({
      select: selectFn,
      update: updateFn,
      delete: deleteFn,
    })),
  } as unknown as AnySupabase);

  return { updateFn, updateEq, updateIn, deleteFn, deleteEq, deleteIn, selectFn, selectIn };
}

beforeEach(() => vi.clearAllMocks());

describe("bulkArchive", () => {
  it("updates all given invoices to archived status", async () => {
    const { updateFn } = makeBulkSupabase();
    await bulkArchive(["inv-1", "inv-2"]);
    expect(updateFn).toHaveBeenCalledWith({ status: "archived" });
  });

  it("scopes the update to the authenticated user", async () => {
    const { updateEq } = makeBulkSupabase({ userId: "user-99" });
    await bulkArchive(["inv-1"]);
    expect(updateEq).toHaveBeenCalledWith("user_id", "user-99");
  });

  it("filters by the given ids", async () => {
    const { updateIn } = makeBulkSupabase();
    await bulkArchive(["inv-1", "inv-2"]);
    expect(updateIn).toHaveBeenCalledWith("id", ["inv-1", "inv-2"]);
  });

  it("throws when supabase returns an error", async () => {
    makeBulkSupabase({ updateError: { message: "db error" } });
    await expect(bulkArchive(["inv-1"])).rejects.toThrow("db error");
  });
});

describe("bulkDelete", () => {
  it("deletes all given invoices regardless of status", async () => {
    const { deleteIn } = makeBulkSupabase();
    await bulkDelete(["inv-1", "inv-2", "inv-3"]);
    expect(deleteIn).toHaveBeenCalledWith("id", ["inv-1", "inv-2", "inv-3"]);
  });

  it("scopes the delete to the authenticated user", async () => {
    const { deleteEq } = makeBulkSupabase({ userId: "user-7" });
    await bulkDelete(["inv-1"]);
    expect(deleteEq).toHaveBeenCalledWith("user_id", "user-7");
  });

  it("throws when supabase delete returns an error", async () => {
    makeBulkSupabase({ deleteError: { message: "delete failed" } });
    await expect(bulkDelete(["inv-1"])).rejects.toThrow("delete failed");
  });
});

describe("bulkMarkPaid", () => {
  it("updates all given invoices to paid status", async () => {
    const { updateFn } = makeBulkSupabase();
    await bulkMarkPaid(["inv-1", "inv-2"]);
    expect(updateFn).toHaveBeenCalledWith({ status: "paid" });
  });

  it("scopes the update to the authenticated user", async () => {
    const { updateEq } = makeBulkSupabase({ userId: "user-42" });
    await bulkMarkPaid(["inv-1"]);
    expect(updateEq).toHaveBeenCalledWith("user_id", "user-42");
  });

  it("filters by the given ids", async () => {
    const { updateIn } = makeBulkSupabase();
    await bulkMarkPaid(["inv-3", "inv-4"]);
    expect(updateIn).toHaveBeenCalledWith("id", ["inv-3", "inv-4"]);
  });

  it("throws when supabase returns an error", async () => {
    makeBulkSupabase({ updateError: { message: "update failed" } });
    await expect(bulkMarkPaid(["inv-1"])).rejects.toThrow("update failed");
  });
});
