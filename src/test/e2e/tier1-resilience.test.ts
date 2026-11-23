import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST as presignRoute } from "@/app/api/reports/photo/presign/route";
import { compressImageFile } from "@/lib/photo-compress";
import { allowRequestDistributed } from "@/lib/rate-limit";
import { getRepository, wantsMemoryRepository } from "@/lib/repo/context";
import { DynamoRastabaazRepository } from "@/lib/repo/dynamo";
import { MemoryRastabaazRepository } from "@/lib/repo/memory";
import { loadDataset, resetDatasetCacheForTests } from "@/lib/rupee/load";
import {
  createMockNextRequest,
  SAMPLE_JPEG_DATA_URL,
  SAMPLE_WEBP_DATA_URL,
  setupTestRepo,
  stubCanvasWebP,
  teardownTestRepo,
} from "./e2e-helpers";

describe("Tier 1 Resilience & Infrastructure (Features 1, 2, 3, 6)", () => {
  let restoreCanvas: () => void;

  beforeEach(() => {
    setupTestRepo();
    restoreCanvas = stubCanvasWebP(true);
  });

  afterEach(() => {
    restoreCanvas();
    teardownTestRepo();
    vi.unstubAllEnvs();
  });

  describe("Feature 1: Fail-Fast Production Repository", () => {
    it("disallows memory repository in production by default", () => {
      expect(wantsMemoryRepository({ NODE_ENV: "production", RASTABAAZ_REPO: "memory" })).toBe(false);
    });

    it("allows memory repository in production when ALLOW_MEMORY_REPO=1", () => {
      expect(
        wantsMemoryRepository({
          NODE_ENV: "production",
          RASTABAAZ_REPO: "memory",
          ALLOW_MEMORY_REPO: "1",
        }),
      ).toBe(true);
    });

    it("fails fast in production when RASTABAAZ_TABLE_NAME is unset", () => {
      vi.stubEnv("NODE_ENV", "production");
      delete process.env.RASTABAAZ_TABLE_NAME;
      delete process.env.ALLOW_MEMORY_REPO;
      teardownTestRepo();
      expect(() => getRepository()).toThrowError(/RASTABAAZ_TABLE_NAME environment variable is required/);
    });

    it("fails fast in production when RASTABAAZ_TABLE_NAME is empty string", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("RASTABAAZ_TABLE_NAME", "");
      delete process.env.ALLOW_MEMORY_REPO;
      teardownTestRepo();
      expect(() => getRepository()).toThrowError(/RASTABAAZ_TABLE_NAME environment variable is required/);
    });

    it("instantiates DynamoRastabaazRepository in production when table name is set", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("RASTABAAZ_TABLE_NAME", "prod_table");
      delete process.env.ALLOW_MEMORY_REPO;
      teardownTestRepo();
      expect(getRepository()).toBeInstanceOf(DynamoRastabaazRepository);
    });

    it("allows MemoryRastabaazRepository in production when ALLOW_MEMORY_REPO=1", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("ALLOW_MEMORY_REPO", "1");
      vi.stubEnv("RASTABAAZ_REPO", "memory");
      delete process.env.RASTABAAZ_TABLE_NAME;
      teardownTestRepo();
      expect(getRepository()).toBeInstanceOf(MemoryRastabaazRepository);
    });
  });

  describe("Feature 2: Distributed Rate Limiting & Cold Boot", () => {
    it("permits requests up to limit inside the window", async () => {
      const key = "test:ip:1.1.1.1";
      for (let i = 0; i < 5; i++) {
        expect(await allowRequestDistributed(key, 5, 60_000, i * 1000)).toBe(true);
      }
    });

    it("rejects request limit + 1 within active window", async () => {
      const key = "test:ip:1.1.1.2";
      for (let i = 0; i < 3; i++) {
        await allowRequestDistributed(key, 3, 60_000, i * 100);
      }
      expect(await allowRequestDistributed(key, 3, 60_000, 400)).toBe(false);
    });

    it("falls back to in-memory rate limiting when RASTABAAZ_TABLE_NAME is unset", async () => {
      delete process.env.RASTABAAZ_TABLE_NAME;
      const key = "test:ip:fallback";
      expect(await allowRequestDistributed(key, 2, 60_000, 0)).toBe(true);
      expect(await allowRequestDistributed(key, 2, 60_000, 100)).toBe(true);
      expect(await allowRequestDistributed(key, 2, 60_000, 200)).toBe(false);
    });

    it("resets distributed counter after the window elapses", async () => {
      const key = "test:ip:reset";
      expect(await allowRequestDistributed(key, 1, 1000, 0)).toBe(true);
      expect(await allowRequestDistributed(key, 1, 1000, 500)).toBe(false);
      expect(await allowRequestDistributed(key, 1, 1000, 1000)).toBe(true);
    });

    it("cold boot loads pre-compiled dataset with full entities", () => {
      resetDatasetCacheForTests();
      const ds = loadDataset();
      expect(ds.workOrders.length).toBeGreaterThan(2000);
      expect(ds.roads.length).toBeGreaterThan(200);
      expect(ds.contractors.length).toBeGreaterThan(0);
      expect(ds.wards.length).toBe(24);
    });

    it("cold boot dataset returns cached instance across repeated calls", () => {
      const ds1 = loadDataset();
      const ds2 = loadDataset();
      expect(ds1).toBe(ds2);
    });
  });

  describe("Feature 3: WebP Compression & Presigned S3", () => {
    it("compresses image to WebP data URL under supported canvas", async () => {
      const file = new File(["dummy_image_bits"], "pothole.jpg", { type: "image/jpeg" });
      const dataUrl = await compressImageFile(file);
      expect(dataUrl).toBe(SAMPLE_WEBP_DATA_URL);
      expect(new TextEncoder().encode(dataUrl).length).toBeLessThan(256_000);
    });

    it("generates valid PUT descriptor with .webp key for image/webp", async () => {
      const req = createMockNextRequest("http://localhost:3000/api/reports/photo/presign", {
        method: "POST",
        body: { contentType: "image/webp" },
      });
      const res = await presignRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.method).toBe("PUT");
      expect(data.key).toMatch(/^reports\/photo_[a-z0-9]+\.webp$/);
      expect(data.headers["Content-Type"]).toBe("image/webp");
    });

    it("generates valid PUT descriptor with .jpg key for image/jpeg", async () => {
      const req = createMockNextRequest("http://localhost:3000/api/reports/photo/presign", {
        method: "POST",
        body: { contentType: "image/jpeg" },
      });
      const res = await presignRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.key).toMatch(/^reports\/photo_[a-z0-9]+\.jpg$/);
      expect(data.headers["Content-Type"]).toBe("image/jpeg");
    });

    it("rejects unsupported MIME types with 400", async () => {
      const req = createMockNextRequest("http://localhost:3000/api/reports/photo/presign", {
        method: "POST",
        body: { contentType: "application/pdf" },
      });
      const res = await presignRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error).toContain("Invalid photo content type");
    });

    it("rejects oversized photo payloads exceeding limit with 400", async () => {
      const req = createMockNextRequest("http://localhost:3000/api/reports/photo/presign", {
        method: "POST",
        body: { contentType: "image/webp", size: 6 * 1024 * 1024 },
      });
      const res = await presignRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error).toContain("File size exceeds");
    });

    it("produces AWS SigV4 signed URL when credentials are configured", async () => {
      vi.stubEnv("AWS_ACCESS_KEY_ID", "AKIAEXAMPLEKEY12345");
      vi.stubEnv("AWS_SECRET_ACCESS_KEY", "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY");
      vi.stubEnv("REPORTS_BUCKET_NAME", "mumbai-reports-bucket");
      vi.stubEnv("AWS_REGION", "ap-south-1");

      const req = createMockNextRequest("http://localhost:3000/api/reports/photo/presign", {
        method: "POST",
        body: { contentType: "image/webp" },
      });
      const res = await presignRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.uploadUrl).toContain("https://mumbai-reports-bucket.s3.ap-south-1.amazonaws.com/");
      expect(data.uploadUrl).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
      expect(data.uploadUrl).toContain("X-Amz-Credential=AKIAEXAMPLEKEY12345");
    });
  });

  describe("Feature 6: Service Worker Build SHA Versioning", () => {
    const swContent = readFileSync(path.join(process.cwd(), "public", "sw.js"), "utf8");

    it("precaches critical offline shell routes and icons", () => {
      expect(swContent).toContain('"/offline"');
      expect(swContent).toContain('"/favicon.svg"');
      expect(swContent).toContain('"/icons/icon-192.png"');
    });

    it("defines versioned CACHE_NAME shell identifier", () => {
      expect(swContent).toMatch(/const CACHE_NAME = ["']rastabaaz-shell-[a-zA-Z0-9_-]+["']/);
    });

    it("skips waiting during install event to take control immediately", () => {
      expect(swContent).toContain("self.skipWaiting()");
      expect(swContent).toContain("caches.open(CACHE_NAME)");
    });

    it("purges stale cache keys not matching active CACHE_NAME upon activation", () => {
      expect(swContent).toContain("keys.filter((key) => key !== CACHE_NAME)");
      expect(swContent).toContain("caches.delete(key)");
      expect(swContent).toContain("self.clients.claim()");
    });

    it("bypasses caching for dynamic mutations, admin, and assistant endpoints", () => {
      expect(swContent).toContain('url.pathname.startsWith("/api/")');
      expect(swContent).toContain('url.pathname.startsWith("/admin")');
      expect(swContent).toContain('url.pathname.startsWith("/assistant")');
    });

    it("falls back to precached /offline page for navigation requests", () => {
      expect(swContent).toContain('request.mode === "navigate"');
      expect(swContent).toContain('caches.match("/offline")');
    });
  });
});
