/**
 * Sanitizes a CSV cell to prevent CSV Formula Injection (CWE-1236 / Excel Formula Injection).
 * Any cell value starting with formula trigger characters (=, +, -, @, \t, \r)
 * is prepended with a single quote (').
 * Double quotes within the value are escaped by doubling (" -> ""), and the entire
 * cell is enclosed in double quotes.
 */
export function sanitizeCsvCell(val: unknown): string {
  if (val === null || val === undefined) {
    return '""';
  }
  const s = String(val);
  const needsFormulaEscape = /^[=+\-@\t\r]/.test(s);
  const safeStr = needsFormulaEscape ? `'${s}` : s;
  return `"${safeStr.replace(/"/g, '""')}"`;
}
