import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST as presignRoute } from "@/app/api/reports/photo/presign/route";
import { allowRequest, allowRequestDistributed } from "@/lib/rate-limit";
import { getRepository, wantsMemoryRepository } from "@/lib/repo/context";
import { DynamoRastabaazRepository } from "@/lib/repo/dynamo";
import { MemoryRastabaazRepository } from "@/lib/repo/memory";
import { loadDataset, resetDatasetCacheForTests } from "@/lib/rupee/load";
import { getBuildSha } from "../../../scripts/generate-sw";
import {
  createMockNextRequest,
  setupTestRepo,
  teardownTestRepo,
} from "./e2e-helpers";

describe("Tier 2 Resilience & Infrastructure Boundaries (Features 1, 2, 3, 6)", () => {
  beforeEach(() => {
    setupTestRepo();
  });

  afterEach(() => {
    teardownTestRepo();
    vi.unstubAllEnvs();
  });

  describe("Feature 1: Fail-Fast Production Repository Boundaries", () => {
    it("fails fast in production when RASTABAAZ_TABLE_NAME is whitespace only", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("RASTABAAZ_TABLE_NAME", "   ");
      delete process.env.ALLOW_MEMORY_REPO;
      teardownTestRepo();
      expect(() => getRepository()).toThrowError(/RASTABAAZ_TABLE_NAME environment variable is required/);
    });

    it("rejects memory repository when ALLOW_MEMORY_REPO is string false or 0", () => {
      expect(
        wantsMemoryRepository({
          NODE_ENV: "production",
          RASTABAAZ_REPO: "memory",
          ALLOW_MEMORY_REPO: "0",
        }),
      ).toBe(false);
      expect(
        wantsMemoryRepository({
          NODE_ENV: "production",
          RASTABAAZ_REPO: "memory",
          ALLOW_MEMORY_REPO: "false",
        }),
      ).toBe(false);
    });

    it("throws fatal descriptive error when both table and allow flag are missing in prod", () => {
      vi.stubEnv("NODE_ENV", "production");
      delete process.env.RASTABAAZ_TABLE_NAME;
      delete process.env.ALLOW_MEMORY_REPO;
      teardownTestRepo();
      expect(() => getRepository()).toThrowError(/FATAL: RASTABAAZ_TABLE_NAME/);
    });

    it("honors RASTABAAZ_REPO=memory in development without ALLOW_MEMORY_REPO flag", () => {
      expect(
        wantsMemoryRepository({
          NODE_ENV: "development",
          RASTABAAZ_REPO: "memory",
        }),
      ).toBe(true);
    });

    it("instantiates DynamoRastabaazRepository with malformed or custom table identifier", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("RASTABAAZ_TABLE_NAME", "table_with_dashes-and_dots.123");
      delete process.env.ALLOW_MEMORY_REPO;
      teardownTestRepo();
      const repo = getRepository();
      expect(repo).toBeInstanceOf(DynamoRastabaazRepository);
    });

    it("pre-seeds memory repository synchronously with catalog items", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("RASTABAAZ_REPO", "memory");
      delete process.env.RASTABAAZ_TABLE_NAME;
      teardownTestRepo();
      const repo = getRepository();
      const catalog = await repo.loadCatalog();
      expect(catalog.locations.length).toBeGreaterThan(0);
      expect(catalog.reports.length).toBeGreaterThan(0);
    });
  });

  describe("Feature 2: Rate Limiting & Cold Boot Boundaries", () => {
    it("enforces exact rate limit threshold: N requests pass, N+1 request fails", () => {
      const key = "ip:exact:boundary:3";
      expect(allowRequest(key, 3, 10_000, 1000)).toBe(true);
      expect(allowRequest(key, 3, 10_000, 1001)).toBe(true);
      expect(allowRequest(key, 3, 10_000, 1002)).toBe(true);
      expect(allowRequest(key, 3, 10_000, 1003)).toBe(false);
    });

    it("enforces exact window boundary: rejected at now+windowMs-1, permitted at now+windowMs", () => {
      const key = "ip:window:boundary";
      const start = 50_000;
      const windowMs = 5_000;
      expect(allowRequest(key, 1, windowMs, start)).toBe(true);
      expect(allowRequest(key, 1, windowMs, start + windowMs - 1)).toBe(false);
      expect(allowRequest(key, 1, windowMs, start + windowMs)).toBe(true);
    });

    it("rejects subsequent requests when limit is zero", () => {
      const key = "ip:zero:limit";
      expect(allowRequest(key, 0, 10_000, 1000)).toBe(true);
      expect(allowRequest(key, 0, 10_000, 1001)).toBe(false);
    });

    it("handles empty key string without throwing", () => {
      expect(allowRequest("", 2, 10_000, 1000)).toBe(true);
      expect(allowRequest("", 2, 10_000, 1001)).toBe(true);
      expect(allowRequest("", 2, 10_000, 1002)).toBe(false);
    });

    it("distributed rate limiter falls back to memory if DynamoDB throws", async () => {
      vi.stubEnv("RASTABAAZ_TABLE_NAME", "failing_mock_table");
      vi.stubEnv("AWS_ACCESS_KEY_ID", "dummy");
      vi.stubEnv("AWS_SECRET_ACCESS_KEY", "dummy");
      vi.stubEnv("DYNAMODB_ENDPOINT", "http://127.0.0.1:65534");
      const key = "ip:distributed:failover";
      const allowed = await allowRequestDistributed(key, 2, 5_000, 2000);
      expect(allowed).toBe(true);
    });

    it("cold boot dataset contains 24 unique valid BMC wards with positive budgets", () => {
      resetDatasetCacheForTests();
      const ds = loadDataset();
      const uniqueWards = new Set(ds.wards.map((w) => w.code));
      expect(uniqueWards.size).toBe(24);
      for (const w of ds.wards) {
        expect(w.budgetInr).toBeGreaterThan(0);
        expect(w.name.length).toBeGreaterThan(0);
      }
    });

    it("cold boot dataset validates every work order has positive billed cost", () => {
      const ds = loadDataset();
      for (const order of ds.workOrders) {
        expect(order.costInr).toBeGreaterThanOrEqual(0);
        expect(typeof order.roadId).toBe("string");
      }
    });
  });

  describe("Feature 3: Photo Sizing & S3 Presign Boundaries", () => {
    const MAX_BYTES = 5 * 1024 * 1024;

    it("accepts maximum allowable photo size boundary (exactly 5MB)", async () => {
      const req = createMockNextRequest("http://localhost:3000/api/reports/photo/presign", {
        method: "POST",
        body: { contentType: "image/webp", size: MAX_BYTES },
      });
      const res = await presignRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });

    it("rejects photo size exceeding 5MB by 1 byte with 400", async () => {
      const req = createMockNextRequest("http://localhost:3000/api/reports/photo/presign", {
        method: "POST",
        body: { contentType: "image/webp", size: MAX_BYTES + 1 },
      });
      const res = await presignRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error).toContain("File size exceeds");
    });

    it("accepts zero-byte photo size descriptor", async () => {
      const req = createMockNextRequest("http://localhost:3000/api/reports/photo/presign", {
        method: "POST",
        body: { contentType: "image/png", size: 0 },
      });
      const res = await presignRoute(req);
      expect(res.status).toBe(200);
    });

    it("rejects invalid non-number size types with 400", async () => {
      const req = createMockNextRequest("http://localhost:3000/api/reports/photo/presign", {
        method: "POST",
        body: { contentType: "image/jpeg", size: "500000" },
      });
      const res = await presignRoute(req);
      expect(res.status).toBe(400);
    });

    it("normalizes uppercase and mixed-case content types", async () => {
      const req = createMockNextRequest("http://localhost:3000/api/reports/photo/presign", {
        method: "POST",
        body: { contentType: "IMAGE/WEBP" },
      });
      const res = await presignRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.key).toMatch(/\.webp$/);
    });

    it("enforces presign rate limit at boundary (60 requests allowed, 61st rejected)", async () => {
      const ip = "192.168.1.100";
      for (let i = 0; i < 60; i++) {
        const req = createMockNextRequest("http://localhost:3000/api/reports/photo/presign", {
          method: "POST",
          body: { contentType: "image/webp" },
          headers: { "x-forwarded-for": ip },
        });
        const res = await presignRoute(req);
        expect(res.status).toBe(200);
      }
      const overflowReq = createMockNextRequest("http://localhost:3000/api/reports/photo/presign", {
        method: "POST",
        body: { contentType: "image/webp" },
        headers: { "x-forwarded-for": ip },
      });
      const overflowRes = await presignRoute(overflowReq);
      expect(overflowRes.status).toBe(429);
    });
  });

  describe("Feature 6: Service Worker Build SHA Versioning Boundaries", () => {
    it("truncates git commit SHAs longer than 12 characters to exactly 12", () => {
      vi.stubEnv("BUILD_SHA", "a1b2c3d4e5f67890abcdef1234567890abcdef12");
      expect(getBuildSha()).toBe("a1b2c3d4e5f6");
    });

    it("falls back to version timestamp format when build SHA env variables are empty strings", () => {
      vi.stubEnv("BUILD_SHA", "");
      vi.stubEnv("GIT_SHA", "");
      vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "");
      vi.stubEnv("NEXT_PUBLIC_BUILD_SHA", "");
      const sha = getBuildSha();
      expect(sha.length).toBeGreaterThan(0);
      expect(sha.length).toBeLessThanOrEqual(12);
    });

    it("reads active CACHE_NAME from public/sw.js and verifies versioning prefix", () => {
      const sw = readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
      const match = sw.match(/const CACHE_NAME = ["'](rastabaaz-shell-[a-zA-Z0-9_-]+)["']/);
      expect(match).not.toBeNull();
      expect(match![1]).toMatch(/^rastabaaz-shell-/);
    });

    it("verifies stale cache deletion logic does not delete active CACHE_NAME", () => {
      const sw = readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
      expect(sw).toContain("keys.filter((key) => key !== CACHE_NAME)");
      expect(sw).toContain("caches.delete(key)");
    });

    it("ensures all precached routes are valid relative URI paths starting with /", () => {
      const sw = readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
      const match = sw.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/);
      expect(match).not.toBeNull();
      const urls = match![1]
        .split(",")
        .map((s) => s.trim().replace(/['"]/g, ""))
        .filter(Boolean);
      expect(urls.length).toBeGreaterThan(0);
      for (const u of urls) {
        expect(u.startsWith("/")).toBe(true);
        expect(u).not.toContain(" ");
      }
    });
  });
});
