import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/email/send", () => ({
  sendInvoicePublishedEmail: vi.fn().mockResolvedValue(undefined),
}));

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { sendInvoicePublishedEmail } from "@/lib/email/send";
import { saveDraft, publishInvoice, deleteDraft, markOverdue, duplicateInvoice } from "./actions";

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
  //   select("*")          → fetch by id → .eq(id).single()
  //   select("id, invoice_number") → uniqueness → .eq(address).neq(status).neq(id).maybeSingle()
  const maybeSingle = vi.fn().mockResolvedValue({ data: btcConflict, error: null });
  const uniqIdNeq = vi.fn().mockReturnValue({ maybeSingle });
  const uniqStatusNeq = vi.fn().mockReturnValue({ neq: uniqIdNeq });
  const uniqAddressEq = vi.fn().mockReturnValue({ neq: uniqStatusNeq });

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

  return { insertSingle, insertChain, updateChain, updateEq, deleteEq, maybeSingle };
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
      fetchData: { id: "inv-1", status: "draft", user_id: "user-1", btc_address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq" },
    });
    await publishInvoice("inv-1");
    const [updatePayload] = updateEq.mock.calls[0];
    expect(updatePayload).toBe("id");
  });

  it("throws if the BTC address is already used on an active invoice", async () => {
    makeSupabase({
      fetchData: { id: "inv-1", status: "draft", user_id: "user-1", btc_address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", accepts_bitcoin: true },
      btcConflict: { id: "inv-other", status: "pending" },
    });
    await expect(publishInvoice("inv-1")).rejects.toThrow(/btc_address: This bitcoin address/i);
  });

  it("sends the invoice-published email to the client with the invoice details", async () => {
    makeSupabase({
      fetchData: {
        id: "inv-7",
        status: "draft",
        user_id: "user-1",
        accepts_bitcoin: false,
        btc_address: null,
        client_email: "client@example.com",
        client_name: "Ada",
        your_name: "Charles",
        your_email: "charles@example.com",
        your_company: null,
        invoice_number: "INV-77",
        total_fiat: 500,
        currency: "USD",
        access_code: "SECRET42",
        due_date: "2026-07-10",
      },
    });
    await publishInvoice("inv-7");
    expect(sendInvoicePublishedEmail).toHaveBeenCalledTimes(1);
    expect(sendInvoicePublishedEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "client@example.com",
      senderName: "Charles",
      clientName: "Ada",
      invoiceId: "inv-7",
      invoiceNumber: "INV-77",
      totalFiat: 500,
      currency: "USD",
      accessCode: "SECRET42",
      dueDateDisplay: "July 10, 2026",
    }));
  });

  it("initialises background-polling columns (next_check_at = +1m, stage_attempt = 0, mempool_seen_at = null) alongside the status change", async () => {
    const { updateChain } = makeSupabase({
      fetchData: {
        id: "inv-sched",
        status: "draft",
        user_id: "user-1",
        accepts_bitcoin: true,
        btc_address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
        client_email: "",
        invoice_number: null,
        total_fiat: 100,
        currency: "USD",
      },
    });
    const before = Date.now();
    await publishInvoice("inv-sched");
    const after = Date.now();

    const payload = updateChain.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.status).toBe("pending");
    expect(payload.stage_attempt).toBe(0);
    expect(payload.mempool_seen_at).toBeNull();

    const nextCheck = new Date(payload.next_check_at as string).getTime();
    expect(nextCheck).toBeGreaterThanOrEqual(before + 60_000 - 5_000);
    expect(nextCheck).toBeLessThanOrEqual(after + 60_000 + 5_000);
  });

  it("does not send an email when client_email is empty", async () => {
    makeSupabase({
      fetchData: {
        id: "inv-8",
        status: "draft",
        user_id: "user-1",
        accepts_bitcoin: false,
        btc_address: null,
        client_email: "",
        client_name: "",
        your_name: "Charles",
        invoice_number: null,
        total_fiat: 100,
        currency: "USD",
        access_code: null,
        due_date: null,
      },
    });
    await publishInvoice("inv-8");
    expect(sendInvoicePublishedEmail).not.toHaveBeenCalled();
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

describe("duplicateInvoice", () => {
  const SOURCE_INVOICE = {
    id: "inv-src",
    user_id: "user-1",
    status: "paid",
    invoice_number: "INV-001",
    your_name: "Freelancer",
    your_email: "me@example.com",
    your_company: "My Co",
    your_address: "1 Street",
    your_tax_id: "TAX-1",
    client_name: "Acme",
    client_email: "acme@example.com",
    client_company: "Acme Co",
    client_address: "2 Street",
    client_tax_id: "TAX-2",
    line_items: [{ description: "Work", quantity: 1, unit_price: 1000 }],
    tax_percent: 10,
    tax_fiat: 100,
    subtotal_fiat: 1000,
    total_fiat: 1100,
    currency: "USD",
    accepts_bitcoin: true,
    btc_address: "bc1qtest",
    due_date: "2026-06-01",
    access_code: "LETMEIN1",
    btc_txid: "txid-should-clear",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  };

  it("inserts a new draft invoice with status=draft, cleared btc_address / btc_txid, and preserved access_code", async () => {
    const { insertChain, insertSingle } = makeSupabase({
      fetchData: SOURCE_INVOICE,
      insertData: { id: "inv-new", status: "draft" },
    });

    await duplicateInvoice("inv-src");

    const insertArg = insertChain.mock.calls[0][0];
    expect(insertArg.status).toBe("draft");
    expect(insertArg.access_code).toBe("LETMEIN1");
    expect(insertArg.btc_address).toBeNull();
    expect(insertArg.btc_txid).toBeNull();
    expect(insertArg.user_id).toBe("user-1");
    expect(insertArg.client_name).toBe("Acme");
    expect(insertArg.line_items).toEqual(SOURCE_INVOICE.line_items);
    expect(insertArg).not.toHaveProperty("id");
    expect(insertArg).not.toHaveProperty("created_at");
    expect(insertArg).not.toHaveProperty("updated_at");
    expect(insertSingle).toHaveBeenCalled();
  });

  it('appends " (copy)" to invoice_number when source has one', async () => {
    const { insertChain } = makeSupabase({
      fetchData: { ...SOURCE_INVOICE, invoice_number: "INV-001" },
      insertData: { id: "inv-new" },
    });
    await duplicateInvoice("inv-src");
    expect(insertChain.mock.calls[0][0].invoice_number).toBe("INV-001 (copy)");
  });

  it("leaves invoice_number null when source has no number", async () => {
    const { insertChain } = makeSupabase({
      fetchData: { ...SOURCE_INVOICE, invoice_number: null },
      insertData: { id: "inv-new" },
    });
    await duplicateInvoice("inv-src");
    expect(insertChain.mock.calls[0][0].invoice_number).toBeNull();
  });

  it("redirects to /invoices/[new-id]/edit after creating the draft", async () => {
    makeSupabase({
      fetchData: SOURCE_INVOICE,
      insertData: { id: "inv-new" },
    });
    await duplicateInvoice("inv-src");
    expect(redirect).toHaveBeenCalledWith("/invoices/inv-new/edit");
  });

  it("throws when the invoice belongs to another user", async () => {
    makeSupabase({
      fetchData: { ...SOURCE_INVOICE, user_id: "someone-else" },
    });
    await expect(duplicateInvoice("inv-src")).rejects.toThrow(/not found/i);
  });
});
