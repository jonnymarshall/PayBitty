import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InvoiceDates } from "./invoice-dates";

describe("InvoiceDates", () => {
  it("shows 'Date Sent:' label with formatted date", () => {
    render(<InvoiceDates createdAt="2026-04-15T12:00:00Z" dueDate="2026-05-15" />);
    expect(screen.getByText(/date sent:/i)).toBeInTheDocument();
    expect(screen.getByText(/apr(il)? 15,? 2026/i)).toBeInTheDocument();
  });

  it("shows 'Date Due:' label with formatted date when due_date is present", () => {
    render(<InvoiceDates createdAt="2026-04-15T12:00:00Z" dueDate="2026-05-15" />);
    expect(screen.getByText(/date due:/i)).toBeInTheDocument();
    expect(screen.getByText(/may 15,? 2026/i)).toBeInTheDocument();
  });

  it("shows 'No due date' when dueDate is null", () => {
    render(<InvoiceDates createdAt="2026-04-15T12:00:00Z" dueDate={null} />);
    expect(screen.getByText(/no due date/i)).toBeInTheDocument();
  });

  it("still shows 'Date Due:' label when dueDate is null", () => {
    render(<InvoiceDates createdAt="2026-04-15T12:00:00Z" dueDate={null} />);
    expect(screen.getByText(/date due:/i)).toBeInTheDocument();
  });
});
