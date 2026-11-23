import { describe, expect, it } from "vitest";
import { sanitizeCsvCell } from "@/lib/csv-sanitize";

describe("sanitizeCsvCell formula injection protection", () => {
  it("escapes formula trigger '=' by prepending single quote", () => {
    expect(sanitizeCsvCell("=SUM(A1:A10)")).toBe("\"'=SUM(A1:A10)\"");
    expect(sanitizeCsvCell("=cmd|' /C calc'!A0")).toBe("\"'=cmd|' /C calc'!A0\"");
  });

  it("escapes formula trigger '+' by prepending single quote", () => {
    expect(sanitizeCsvCell("+12345")).toBe("\"'+12345\"");
    expect(sanitizeCsvCell("+cmd")).toBe("\"'+cmd\"");
  });

  it("escapes formula trigger '-' by prepending single quote", () => {
    expect(sanitizeCsvCell("-500")).toBe("\"'-500\"");
    expect(sanitizeCsvCell("-@danger")).toBe("\"'-@danger\"");
  });

  it("escapes formula trigger '@' by prepending single quote", () => {
    expect(sanitizeCsvCell("@SUM(B1:B5)")).toBe("\"'@SUM(B1:B5)\"");
  });

  it("escapes tab and carriage return triggers", () => {
    expect(sanitizeCsvCell("\t=1+1")).toBe("\"'\t=1+1\"");
    expect(sanitizeCsvCell("\r+cmd")).toBe("\"'\r+cmd\"");
  });

  it("escapes embedded double quotes by doubling them", () => {
    expect(sanitizeCsvCell('Road "Special" Name')).toBe('"Road ""Special"" Name"');
    expect(sanitizeCsvCell('="hello"')).toBe('"\'=""hello"""');
  });

  it("leaves standard text untouched (only quoted)", () => {
    expect(sanitizeCsvCell("Dr Dadabhai Naoroji Road")).toBe('"Dr Dadabhai Naoroji Road"');
    expect(sanitizeCsvCell("Eagle Infra India Ltd")).toBe('"Eagle Infra India Ltd"');
  });

  it("handles numbers, null, and undefined cleanly", () => {
    expect(sanitizeCsvCell(12345)).toBe('"12345"');
    expect(sanitizeCsvCell(0)).toBe('"0"');
    expect(sanitizeCsvCell(null)).toBe('""');
    expect(sanitizeCsvCell(undefined)).toBe('""');
    expect(sanitizeCsvCell("")).toBe('""');
  });
});
