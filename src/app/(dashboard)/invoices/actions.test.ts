import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { saveDraft, publishInvoice, deleteDraft, markOverdue } from "./actions";

const VALID_DRAFT = {
  client_name: "Acme Corp",
  client_email: "acme@example.com",
  line_items: [{ description: "Work", quantity: 1, unit_price: 1000 }],
  tax_percent: 0,
  accepts_bitcoin: true,
  btc_address: "bc1qtest",
  due_date: "2026-06-01",
};

type AnySupabase = Awaited<ReturnType<typeof createClient>>;

function makeSupabase({
  fetchData = null as object | null,
  insertData = { id: "inv-1", status: "draft" } as object,
  insertError = null as object | null,
  btcConflict = null as object | null,
  updateError = null as object | null,
  deleteError = null as object | null,
  userId = "user-1",
} = {}) {
  // insert chain: .insert().select().single()
  const insertSingle = vi.fn().mockResolvedValue({ data: insertData, error: insertError });
  const insertChain = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ single: insertSingle }),
  });

  // update chain: .update().eq()
  const updateEq = vi.fn().mockResolvedValue({ data: {}, error: updateError });
  const updateChain = vi.fn().mockReturnValue({ eq: updateEq });

  // delete chain: .delete().eq()
  const deleteEq = vi.fn().mockResolvedValue({ data: null, error: deleteError });
  const deleteChain = vi.fn().mockReturnValue({ eq: deleteEq });

  // select chain: differentiate by column list
  //   select("*")  → fetch by id → .eq(id).single()
  //   select("id") → uniqueness  → .eq(address).eq(status).maybeSingle()
  const maybeSingle = vi.fn().mockResolvedValue({ data: btcConflict, error: null });
  const uniqStatusEq = vi.fn().mockReturnValue({ maybeSingle });
  const uniqAddressEq = vi.fn().mockReturnValue({ eq: uniqStatusEq });

  const fetchSingle = vi.fn().mockResolvedValue({ data: fetchData, error: null });
  const fetchIdEq = vi.fn().mockReturnValue({ single: fetchSingle });

  const selectChain = vi.fn((cols: string) =>
    cols === "id, invoice_number"
      ? { eq: uniqAddressEq }
      : { eq: fetchIdEq }
  );

  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
    },
    from: vi.fn(() => ({
      insert: insertChain,
      select: selectChain,
      update: updateChain,
      delete: deleteChain,
    })),
  } as unknown as AnySupabase);

  return { insertSingle, updateEq, deleteEq, maybeSingle };
}

beforeEach(() => vi.clearAllMocks());

describe("saveDraft", () => {
  it("inserts an invoice with status draft and returns it", async () => {
    const { insertSingle } = makeSupabase();
    const result = await saveDraft(VALID_DRAFT);
    expect(result.id).toBe("inv-1");
    expect(result.status).toBe("draft");
    expect(insertSingle).toHaveBeenCalled();
  });
});

describe("publishInvoice", () => {
  it("sets status to pending and attaches an 8-char access code", async () => {
    const { updateEq } = makeSupabase({
      fetchData: { id: "inv-1", status: "draft", user_id: "user-1", btc_address: "bc1qtest" },
    });
    await publishInvoice("inv-1");
    const [updatePayload] = updateEq.mock.calls[0];
    expect(updatePayload).toBe("id");
  });

  it("throws if the BTC address is already used on an active invoice", async () => {
    makeSupabase({
      fetchData: { id: "inv-1", status: "draft", user_id: "user-1", btc_address: "bc1qused", accepts_bitcoin: true },
      btcConflict: { id: "inv-other", status: "pending" },
    });
    await expect(publishInvoice("inv-1")).rejects.toThrow(/btc_address: This bitcoin address/i);
  });
});

describe("deleteDraft", () => {
  it("deletes an invoice when it is a draft", async () => {
    const { deleteEq } = makeSupabase({
      fetchData: { id: "inv-1", status: "draft", user_id: "user-1" },
    });
    await deleteDraft("inv-1");
    expect(deleteEq).toHaveBeenCalled();
  });

  it("throws if the invoice is not a draft", async () => {
    makeSupabase({
      fetchData: { id: "inv-1", status: "pending", user_id: "user-1" },
    });
    await expect(deleteDraft("inv-1")).rejects.toThrow(/only draft/i);
  });
});

describe("markOverdue", () => {
  it("sets status to overdue on a pending invoice", async () => {
    const { updateEq } = makeSupabase({
      fetchData: { id: "inv-1", status: "pending", user_id: "user-1" },
    });
    await markOverdue("inv-1");
    expect(updateEq).toHaveBeenCalled();
  });
});
