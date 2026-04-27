import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePublicInvoiceRealtime } from "./use-public-invoice-realtime";

const refreshSpy = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshSpy }),
}));

type Callback = (payload: unknown) => void;

interface MockChannel {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
}

let capturedCallback: Callback | null = null;
let lastChannelName: string | null = null;
let lastOnArgs: unknown[] | null = null;
const channelSpy = vi.fn();
const removeChannelSpy = vi.fn();
const setAuthSpy = vi.fn();
const getSessionSpy = vi.fn();

function makeMockChannel(): MockChannel {
  const channel: MockChannel = {
    on: vi.fn((...args: unknown[]) => {
      lastOnArgs = args;
      capturedCallback = args[args.length - 1] as Callback;
      return channel;
    }),
    subscribe: vi.fn(() => channel),
  };
  return channel;
}

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: (name: string) => {
      channelSpy(name);
      lastChannelName = name;
      return makeMockChannel();
    },
    removeChannel: (ch: unknown) => removeChannelSpy(ch),
    auth: {
      getSession: () => getSessionSpy(),
    },
    realtime: {
      setAuth: setAuthSpy,
    },
  }),
}));

async function flushAsync() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  refreshSpy.mockClear();
  channelSpy.mockClear();
  removeChannelSpy.mockClear();
  setAuthSpy.mockClear();
  getSessionSpy.mockReset();
  // Public payer is unauthenticated — return null session.
  getSessionSpy.mockResolvedValue({ data: { session: null } });
  capturedCallback = null;
  lastChannelName = null;
  lastOnArgs = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("usePublicInvoiceRealtime", () => {
  it("opens a channel filtered by invoice id on the invoices table", async () => {
    renderHook(() => usePublicInvoiceRealtime("inv-abc", () => {}));
    await flushAsync();

    expect(channelSpy).toHaveBeenCalledOnce();
    expect(lastChannelName).toContain("inv-abc");

    expect(lastOnArgs).not.toBeNull();
    const [eventName, config] = lastOnArgs as [string, Record<string, string>];
    expect(eventName).toBe("postgres_changes");
    expect(config.event).toBe("UPDATE");
    expect(config.schema).toBe("public");
    expect(config.table).toBe("invoices");
    expect(config.filter).toBe("id=eq.inv-abc");
  });

  it("does NOT call setAuth — payer is unauthenticated and uses the anon key", async () => {
    renderHook(() => usePublicInvoiceRealtime("inv-abc", () => {}));
    await flushAsync();
    expect(setAuthSpy).not.toHaveBeenCalled();
  });

  it("invokes onUpdate with payload.new when a postgres UPDATE event fires", async () => {
    const onUpdate = vi.fn();
    renderHook(() => usePublicInvoiceRealtime("inv-abc", onUpdate));
    await flushAsync();

    expect(onUpdate).not.toHaveBeenCalled();

    const newRow = { id: "inv-abc", status: "payment_detected", btc_txid: "abc123" };
    capturedCallback?.({ eventType: "UPDATE", new: newRow });

    expect(onUpdate).toHaveBeenCalledOnce();
    expect(onUpdate).toHaveBeenCalledWith(newRow);
  });

  it("removes the channel on unmount", async () => {
    const { unmount } = renderHook(() => usePublicInvoiceRealtime("inv-abc", () => {}));
    await flushAsync();
    expect(removeChannelSpy).not.toHaveBeenCalled();

    unmount();

    expect(removeChannelSpy).toHaveBeenCalledOnce();
  });

  it("no-ops when invoiceId is empty", async () => {
    renderHook(() => usePublicInvoiceRealtime("", () => {}));
    await flushAsync();
    expect(channelSpy).not.toHaveBeenCalled();
    expect(removeChannelSpy).not.toHaveBeenCalled();
  });

  it("calls router.refresh when the document becomes visible", async () => {
    renderHook(() => usePublicInvoiceRealtime("inv-abc", () => {}));
    await flushAsync();

    expect(refreshSpy).not.toHaveBeenCalled();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(refreshSpy).toHaveBeenCalledOnce();
  });

  it("does not call router.refresh when the document becomes hidden", async () => {
    renderHook(() => usePublicInvoiceRealtime("inv-abc", () => {}));
    await flushAsync();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(refreshSpy).not.toHaveBeenCalled();
  });
});
