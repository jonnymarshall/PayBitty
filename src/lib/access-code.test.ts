import { describe, it, expect } from "vitest";
import { isAccessCodeValid } from "./access-code";

describe("isAccessCodeValid", () => {
  it("returns true when no code is required", () => {
    expect(isAccessCodeValid(null, null)).toBe(true);
    expect(isAccessCodeValid(null, "anything")).toBe(true);
  });

  it("returns true when provided code matches required code", () => {
    expect(isAccessCodeValid("ABC123", "ABC123")).toBe(true);
  });

  it("returns false when provided code does not match", () => {
    expect(isAccessCodeValid("ABC123", "WRONG")).toBe(false);
  });

  it("returns false when code is required but nothing is provided", () => {
    expect(isAccessCodeValid("ABC123", null)).toBe(false);
  });
});
