import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

import { createServerClient } from "@supabase/ssr";
import { proxy } from "./proxy";

function makeRequest(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

function mockSession(session: object | null) {
  vi.mocked(createServerClient).mockReturnValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
    },
  } as unknown as ReturnType<typeof createServerClient>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("proxy", () => {
  describe("protected routes", () => {
    it("redirects unauthenticated user from /dashboard to /login", async () => {
      mockSession(null);
      const res = await proxy(makeRequest("/dashboard"));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });

    it("allows authenticated user through to /dashboard", async () => {
      mockSession({ user: { id: "u1" } });
      const res = await proxy(makeRequest("/dashboard"));
      expect(res.status).not.toBe(307);
    });
  });

  describe("public routes", () => {
    it("allows unauthenticated access to /login", async () => {
      mockSession(null);
      const res = await proxy(makeRequest("/login"));
      expect(res.status).not.toBe(307);
    });

    it("allows unauthenticated access to /invoice/:id", async () => {
      mockSession(null);
      const res = await proxy(makeRequest("/invoice/abc123"));
      expect(res.status).not.toBe(307);
    });
  });
});
