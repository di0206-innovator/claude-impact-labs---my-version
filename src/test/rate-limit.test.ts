import { afterEach, describe, expect, it, vi } from "vitest";
import { allowRequest, allowRequestDistributed, resetRateLimits } from "@/lib/rate-limit";

describe("allowRequest", () => {
  afterEach(() => {
    resetRateLimits();
  });

  it("allows the fifth request and denies the sixth inside the window", () => {
    const key = "create:1.1.1.1";
    const windowMs = 60_000;
    expect(allowRequest(key, 5, windowMs, 0)).toBe(true);
    expect(allowRequest(key, 5, windowMs, 1)).toBe(true);
    expect(allowRequest(key, 5, windowMs, 2)).toBe(true);
    expect(allowRequest(key, 5, windowMs, 3)).toBe(true);
    expect(allowRequest(key, 5, windowMs, 4)).toBe(true);
    expect(allowRequest(key, 5, windowMs, 5)).toBe(false);
  });

  it("resets the count after the window elapses", () => {
    const key = "create:2.2.2.2";
    expect(allowRequest(key, 1, 1_000, 0)).toBe(true);
    expect(allowRequest(key, 1, 1_000, 999)).toBe(false);
    expect(allowRequest(key, 1, 1_000, 1_000)).toBe(true);
  });

  it("clears buckets when resetRateLimits runs", () => {
    const key = "create:3.3.3.3";
    expect(allowRequest(key, 1, 1_000, 0)).toBe(true);
    expect(allowRequest(key, 1, 1_000, 1)).toBe(false);
    resetRateLimits();
    expect(allowRequest(key, 1, 1_000, 2)).toBe(true);
  });

  it("drops expired keys so a later distinct address can reuse a slot", () => {
    expect(allowRequest("create:old", 1, 1_000, 0)).toBe(true);
    expect(allowRequest("create:old", 1, 1_000, 500)).toBe(false);
    expect(allowRequest("create:new", 1, 1_000, 1_000)).toBe(true);
    expect(allowRequest("create:old", 1, 1_000, 1_000)).toBe(true);
  });

  it("caps stored keys instead of growing without bound", () => {
    for (let i = 0; i < 4096; i += 1) {
      expect(allowRequest(`flood:${i}`, 1, 60_000, i)).toBe(true);
    }
    expect(allowRequest("flood:4096", 1, 60_000, 4096)).toBe(true);
    expect(allowRequest("flood:0", 1, 60_000, 4096)).toBe(true);
  });

  describe("allowRequestDistributed", () => {
    it("falls back to in-memory rate limiting when RASTABAAZ_TABLE_NAME is unset", async () => {
      delete process.env.RASTABAAZ_TABLE_NAME;
      const key = "dist:1.1.1.1";
      const windowMs = 60_000;
      expect(await allowRequestDistributed(key, 2, windowMs, 0)).toBe(true);
      expect(await allowRequestDistributed(key, 2, windowMs, 1)).toBe(true);
      expect(await allowRequestDistributed(key, 2, windowMs, 2)).toBe(false);
    });

    it("falls back safely to in-memory limiting if DynamoDB throws", async () => {
      vi.stubEnv("RASTABAAZ_TABLE_NAME", "nonexistent-table");
      const key = "dist:err:1";
      const windowMs = 60_000;
      // It should catch the error, log a warning, and succeed using in-memory bucket
      const allowed = await allowRequestDistributed(key, 1, windowMs, 0);
      expect(allowed).toBe(true);
      const denied = await allowRequestDistributed(key, 1, windowMs, 100);
      expect(denied).toBe(false);
      vi.unstubAllEnvs();
    });
  });
});
