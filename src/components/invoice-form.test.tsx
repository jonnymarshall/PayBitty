import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InvoiceForm } from "./invoice-form";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

describe("InvoiceForm line item validation", () => {
  it("rejects qty values above 100,000", async () => {
    const user = userEvent.setup();
    render(<InvoiceForm />);

    const qtyInput = screen.getByRole("textbox", { name: /qty/i });
    await user.clear(qtyInput);
    await user.type(qtyInput, "100001");

    expect(qtyInput).not.toHaveValue("100001");
  });

  it("accepts qty values at or below 100,000", async () => {
    const user = userEvent.setup();
    render(<InvoiceForm />);

    const qtyInput = screen.getByRole("textbox", { name: /qty/i });
    await user.clear(qtyInput);
    await user.type(qtyInput, "100000");

    expect(qtyInput).toHaveValue("100000");
  });

  it("rejects qty with more than 2 decimal places", async () => {
    const user = userEvent.setup();
    render(<InvoiceForm />);

    const qtyInput = screen.getByRole("textbox", { name: /qty/i });
    await user.clear(qtyInput);
    await user.type(qtyInput, "1.234");

    expect(qtyInput).not.toHaveValue("1.234");
  });

  it("accepts qty with up to 2 decimal places", async () => {
    const user = userEvent.setup();
    render(<InvoiceForm />);

    const qtyInput = screen.getByRole("textbox", { name: /qty/i });
    await user.clear(qtyInput);
    await user.type(qtyInput, "1.25");

    expect(qtyInput).toHaveValue("1.25");
  });

  it("rejects unit price values above 1,000,000,000", async () => {
    const user = userEvent.setup();
    render(<InvoiceForm />);

    const priceInput = screen.getByRole("textbox", { name: /unit price/i });
    await user.clear(priceInput);
    await user.type(priceInput, "1000000001");

    expect(priceInput).not.toHaveValue("1000000001");
  });

  it("accepts unit price values at or below 1,000,000,000", async () => {
    const user = userEvent.setup();
    render(<InvoiceForm />);

    const priceInput = screen.getByRole("textbox", { name: /unit price/i });
    await user.clear(priceInput);
    await user.type(priceInput, "1000000000");

    expect(priceInput).toHaveValue("1000000000");
  });

  it("rejects unit price with more than 2 decimal places", async () => {
    const user = userEvent.setup();
    render(<InvoiceForm />);

    const priceInput = screen.getByRole("textbox", { name: /unit price/i });
    await user.clear(priceInput);
    await user.type(priceInput, "9.999");

    expect(priceInput).not.toHaveValue("9.999");
  });
});
