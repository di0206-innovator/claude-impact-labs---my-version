import React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { allowRequestDistributed } from "@/lib/rate-limit";
import { getRepository, wantsMemoryRepository } from "@/lib/repo/context";
import { DynamoRastabaazRepository } from "@/lib/repo/dynamo";
import { MemoryRastabaazRepository } from "@/lib/repo/memory";
import { loadDataset, resetDatasetCacheForTests } from "@/lib/rupee/load";
import { setupTestRepo, teardownTestRepo } from "./e2e-helpers";

describe("Tier 3 Cross-Feature: System Resilience & Concurrency (F1+F2+F6+F10)", () => {
  const swContent = readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");

  beforeEach(() => {
    setupTestRepo();
  });

  afterEach(() => {
    cleanup();
    teardownTestRepo();
    vi.unstubAllEnvs();
  });

  it("1. F1: Disallows memory repository in production unless explicitly overridden with ALLOW_MEMORY_REPO=1", () => {
    expect(wantsMemoryRepository({ NODE_ENV: "production", RASTABAAZ_REPO: "memory" })).toBe(false);
    expect(
      wantsMemoryRepository({ NODE_ENV: "production", RASTABAAZ_REPO: "memory", ALLOW_MEMORY_REPO: "1" }),
    ).toBe(true);
  });

  it("2. F1: Fails fast in production when RASTABAAZ_TABLE_NAME is unset or empty", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.RASTABAAZ_TABLE_NAME;
    delete process.env.ALLOW_MEMORY_REPO;
    teardownTestRepo();
    expect(() => getRepository()).toThrowError(/RASTABAAZ_TABLE_NAME environment variable is required/);

    vi.stubEnv("RASTABAAZ_TABLE_NAME", "");
    expect(() => getRepository()).toThrowError(/RASTABAAZ_TABLE_NAME environment variable is required/);
  });

  it("3. F1: Resolves DynamoRastabaazRepository in production when table name is configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RASTABAAZ_TABLE_NAME", "prod_mumbai_table");
    delete process.env.ALLOW_MEMORY_REPO;
    teardownTestRepo();
    expect(getRepository()).toBeInstanceOf(DynamoRastabaazRepository);
  });

  it("4. F2: Handles concurrent flood of requests: permits exactly limit and rejects remainder", async () => {
    const key = "flood:ip:10.0.0.1";
    const limit = 5;
    const windowMs = 60_000;
    const now = 1000;

    const results = await Promise.all(
      Array.from({ length: 20 }, () => allowRequestDistributed(key, limit, windowMs, now)),
    );
    const passed = results.filter(Boolean).length;
    const rejected = results.filter((r) => !r).length;
    expect(passed).toBe(limit);
    expect(rejected).toBe(15);
  });

  it("5. F2: Isolates concurrent rate limits between distinct client IP keys", async () => {
    const keyA = "isolate:ip:192.168.1.1";
    const keyB = "isolate:ip:192.168.1.2";
    const limit = 3;
    const windowMs = 60_000;

    const [resA, resB] = await Promise.all([
      Promise.all(Array.from({ length: 5 }, () => allowRequestDistributed(keyA, limit, windowMs, 0))),
      Promise.all(Array.from({ length: 5 }, () => allowRequestDistributed(keyB, limit, windowMs, 0))),
    ]);

    expect(resA.filter(Boolean).length).toBe(limit);
    expect(resB.filter(Boolean).length).toBe(limit);
  });

  it("6. F2: Resets distributed quota after window expiration allowing fresh request bursts", async () => {
    const key = "burst:ip:10.0.0.5";
    const limit = 2;
    const windowMs = 1000;

    expect(await allowRequestDistributed(key, limit, windowMs, 0)).toBe(true);
    expect(await allowRequestDistributed(key, limit, windowMs, 100)).toBe(true);
    expect(await allowRequestDistributed(key, limit, windowMs, 200)).toBe(false);

    expect(await allowRequestDistributed(key, limit, windowMs, 1100)).toBe(true);
    expect(await allowRequestDistributed(key, limit, windowMs, 1200)).toBe(true);
    expect(await allowRequestDistributed(key, limit, windowMs, 1300)).toBe(false);
  });

  it("7. F2: Resolves dataset concurrently during cold boot returning identical singleton instance", async () => {
    resetDatasetCacheForTests();
    const [ds1, ds2, ds3] = await Promise.all([
      Promise.resolve().then(() => loadDataset()),
      Promise.resolve().then(() => loadDataset()),
      Promise.resolve().then(() => loadDataset()),
    ]);
    expect(ds1).toBe(ds2);
    expect(ds2).toBe(ds3);
    expect(ds1.wards.length).toBe(24);
  });

  it("8. F1+F2: Rate limiter falls back to memory bucket safely when table name is unset in dev/test", async () => {
    delete process.env.RASTABAAZ_TABLE_NAME;
    const key = "fallback:test:bucket";
    expect(await allowRequestDistributed(key, 2, 60_000, 0)).toBe(true);
    expect(await allowRequestDistributed(key, 2, 60_000, 10)).toBe(true);
    expect(await allowRequestDistributed(key, 2, 60_000, 20)).toBe(false);
  });

  it("9. F6: Service Worker defines dynamic cache identifier versioned by build SHA", () => {
    expect(swContent).toMatch(/const CACHE_NAME = ["']rastabaaz-shell-[a-zA-Z0-9_-]+["']/);
  });

  it("10. F6: Service Worker precaches offline shell assets and claims clients immediately", () => {
    expect(swContent).toContain('"/offline"');
    expect(swContent).toContain('"/favicon.svg"');
    expect(swContent).toContain('"/icons/icon-192.png"');
    expect(swContent).toContain("self.skipWaiting()");
    expect(swContent).toContain("self.clients.claim()");
  });

  it("11. F6: Service Worker purges obsolete caches on activation while preserving active shell", () => {
    expect(swContent).toContain("keys.filter((key) => key !== CACHE_NAME)");
    expect(swContent).toContain("caches.delete(key)");
  });

  it("12. F6+F2: Service Worker explicitly bypasses caching for /api/ routes to preserve rate limiting integrity", () => {
    expect(swContent).toContain('url.pathname.startsWith("/api/")');
    expect(swContent).toContain('url.pathname.startsWith("/admin")');
    expect(swContent).toContain('url.pathname.startsWith("/assistant")');
  });

  it("13. F10: Renders semantic header and navigation landmarks with touch targets on mobile viewports", () => {
    const { container } = render(React.createElement(SiteHeader));
    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();

    const nav = container.querySelector("nav");
    expect(nav).toBeInTheDocument();
    expect(nav?.getAttribute("aria-label")).toBeTruthy();

    const touchTargets = container.querySelectorAll(".touch-target");
    expect(touchTargets.length).toBeGreaterThanOrEqual(4);
  });

  it("14. F10: Ensures assistant page avoids duplicate id=main landmark and preserves skip link", () => {
    const assistantSource = readFileSync(path.join(process.cwd(), "src/app/assistant/page.tsx"), "utf8");
    expect(assistantSource).not.toContain('<main id="main"');
    expect(assistantSource.length).toBeGreaterThan(100);

    const layoutSource = readFileSync(path.join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(layoutSource).toContain('id="main"');
    expect(layoutSource).toContain('href="#main"');
  });

  it("15. F1+F2+F6+F10: System resilience chain under concurrent load, cache busting, and accessible landmarks", async () => {
    render(React.createElement(SiteFooter));
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();

    const ip = "chain:resilience:ip";
    const burstResults = await Promise.all(
      Array.from({ length: 10 }, () => allowRequestDistributed(ip, 4, 60_000, 0)),
    );
    expect(burstResults.filter(Boolean).length).toBe(4);
    expect(burstResults.filter((r) => !r).length).toBe(6);

    expect(swContent).toContain('url.pathname.startsWith("/api/")');
    expect(wantsMemoryRepository({ NODE_ENV: "production", RASTABAAZ_REPO: "memory" })).toBe(false);

    const ds = loadDataset();
    expect(ds.roads.length).toBeGreaterThan(100);
  });
});
