import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./page";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    },
  })),
}));

describe("LoginPage", () => {
  it("renders an email input and submit button", () => {
    render(<LoginPage />);
    expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send magic link/i })).toBeInTheDocument();
  });

  it("shows a success message after submitting a valid email", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByRole("textbox", { name: /email/i }), "test@example.com");
    await user.click(screen.getByRole("button", { name: /send magic link/i }));

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
  });
});
