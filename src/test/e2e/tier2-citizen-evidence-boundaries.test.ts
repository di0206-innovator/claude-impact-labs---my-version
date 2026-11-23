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

import manifest from "@/app/manifest";
import VerifyPage from "@/app/verify/page";
import { SiteHeader } from "@/components/site/SiteHeader";
import { createReportAction } from "@/lib/actions";
import { getPotholeReceipt } from "@/lib/passport/receipt";
import {
  computeCanonicalEvidenceHash,
  createMockReportFormData,
  MockOfflineReportQueue,
  setupTestRepo,
  teardownTestRepo,
} from "./e2e-helpers";

describe("Tier 2 Citizen Evidence & PWA Boundaries (Features 7, 8, 9, 10, 11)", () => {
  beforeEach(() => {
    setupTestRepo();
  });

  afterEach(() => {
    cleanup();
    teardownTestRepo();
    vi.unstubAllEnvs();
  });

  describe("Feature 7: Mobile Viewport & 1-Tap Access Boundaries", () => {
    it("renders SiteHeader with 1-tap report link configured for mobile", () => {
      render(React.createElement(SiteHeader));
      const reportLinks = screen.getAllByRole("link", { name: /report pothole/i });
      expect(reportLinks.length).toBeGreaterThan(0);
      expect(reportLinks[0]).toHaveAttribute("href", "/report");
    });

    it("verifies touch target classes on interactive links enforce >=44px guidelines", () => {
      render(React.createElement(SiteHeader));
      const links = screen.getAllByRole("link");
      for (const link of links) {
        expect(link.className).toContain("touch-target");
      }
    });

    it("manifest declares standalone display mode without trailing whitespace", () => {
      const m = manifest();
      expect(m.display?.trim()).toBe("standalone");
      expect(m.short_name?.trim().length).toBeGreaterThan(0);
      expect(m.name?.trim().length).toBeGreaterThan(0);
    });

    it("manifest defines exact theme color #064E4B for mobile system chrome", () => {
      const m = manifest();
      expect(m.theme_color).toBe("#064E4B");
    });

    it("manifest includes dedicated 1-tap shortcut targeting /report route", () => {
      const m = manifest();
      const shortcut = m.shortcuts?.find((s) => s.url === "/report");
      expect(shortcut).toBeDefined();
      expect(shortcut?.icons?.length).toBeGreaterThan(0);
    });
  });

  describe("Feature 8: Canonical Evidence Hash Boundaries", () => {
    const HASH_REGEX = /^sha256:[0-9a-f]{64}$/;

    it("validates canonical hash pattern and rejects empty or corrupt digests", () => {
      expect(HASH_REGEX.test("")).toBe(false);
      expect(HASH_REGEX.test("sha256:12345")).toBe(false);
      expect(HASH_REGEX.test("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")).toBe(false);
      expect(HASH_REGEX.test("sha256:ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ")).toBe(false);
    });

    it("normalizes high-precision float coordinates with toFixed(6) to produce identical hash", () => {
      const h1 = computeCanonicalEvidenceHash({
        issueType: "pothole",
        lat: 19.0544,
        lng: 72.8402,
        noticedAt: "2025-07-15",
      });
      const h2 = computeCanonicalEvidenceHash({
        issueType: "pothole",
        lat: 19.0544000000001,
        lng: 72.8402000000002,
        noticedAt: "2025-07-15",
      });
      expect(h1).toBe(h2);
    });

    it("produces identical canonical hash for null, undefined, and empty string descriptions", () => {
      const base = { issueType: "pothole", lat: 19.0544, lng: 72.8402, noticedAt: "2025-07-15" };
      const hNull = computeCanonicalEvidenceHash({ ...base, description: null });
      const hUndef = computeCanonicalEvidenceHash({ ...base, description: undefined });
      const hEmpty = computeCanonicalEvidenceHash({ ...base, description: "" });
      expect(hNull).toBe(hUndef);
      expect(hNull).toBe(hEmpty);
    });

    it("deterministically hashes multilingual Devanagari Unicode descriptions", () => {
      const base = { issueType: "pothole", lat: 19.0544, lng: 72.8402, noticedAt: "2025-07-15" };
      const h1 = computeCanonicalEvidenceHash({ ...base, description: "खड्डा खूप खोल आहे" });
      const h2 = computeCanonicalEvidenceHash({ ...base, description: "खड्डा खूप खोल आहे" });
      expect(h1).toBe(h2);
      expect(h1).toMatch(HASH_REGEX);
    });

    it("produces different hashes for distinct multilingual input strings", () => {
      const base = { issueType: "pothole", lat: 19.0544, lng: 72.8402, noticedAt: "2025-07-15" };
      const hHi = computeCanonicalEvidenceHash({ ...base, description: "सड़क पर गड्ढा" });
      const hMr = computeCanonicalEvidenceHash({ ...base, description: "रस्त्यावर खड्डा" });
      expect(hHi).not.toBe(hMr);
    });
  });

  describe("Feature 9: Verification Flow & Bad Form Payload Boundaries", () => {
    it("returns null when querying receipt for nonexistent complaint ID", () => {
      expect(getPotholeReceipt("BMC99-999999")).toBeNull();
      expect(getPotholeReceipt("INVALID_ID")).toBeNull();
      expect(getPotholeReceipt("")).toBeNull();
    });

    it("renders VerifyPage with nonexistent complaint ID without throwing", async () => {
      const jsx = await VerifyPage({
        searchParams: Promise.resolve({ id: "BMC99-999999" }),
      });
      render(jsx);
      expect(screen.getByLabelText(/Complaint Reference ID/i)).toHaveValue("BMC99-999999");
    });

    it("renders VerifyPage with unmapped observation parameter safely", async () => {
      const jsx = await VerifyPage({
        searchParams: Promise.resolve({
          submitted: "1",
          id: "BMC25-000013",
          observation: "custom_unmapped_status",
        }),
      });
      render(jsx);
      expect(screen.getByText(/Observation Recorded/i)).toBeInTheDocument();
      expect(screen.getByText(/custom_unmapped_status/i)).toBeInTheDocument();
    });

    it("rejects report submission with coordinates outside Mumbai boundaries", async () => {
      const fd = createMockReportFormData({ lat: "28.6139", lng: "77.2090" });
      fd.set("noticedWindow", "today");
      fd.set("recurs", "false");
      fd.set("accident", "no");
      fd.set("locationConfirmed", "true");
      const res = await createReportAction(fd);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toContain("inside a BMC ward");
    });

    it("rejects report submission when honeypot website field is populated", async () => {
      const fd = createMockReportFormData();
      fd.set("website", "http://spam-bot.net");
      const res = await createReportAction(fd);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toContain("Could not record this report");
    });

    it("rejects report submission with invalid unconfirmed map pin", async () => {
      const fd = createMockReportFormData();
      fd.set("locationConfirmed", "false");
      const res = await createReportAction(fd);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toContain("Confirm the map pin");
    });
  });

  describe("Feature 10: WCAG Landmark & Accessibility Boundaries", () => {
    it("layout HTML specifies proper skip link target and main container", () => {
      const layoutSrc = readFileSync(path.join(process.cwd(), "src/app/layout.tsx"), "utf8");
      expect(layoutSrc).toContain('href="#main"');
      expect(layoutSrc).toContain('id="main"');
    });

    it("verifies assistant page avoids duplicate id='main' skip target", () => {
      const pageSrc = readFileSync(path.join(process.cwd(), "src/app/assistant/page.tsx"), "utf8");
      expect(pageSrc).not.toContain('<main id="main"');
      expect(pageSrc.length).toBeGreaterThan(100);
    });

    it("verifies viewport meta tag does not lock user zoom scale", () => {
      const layoutSrc = readFileSync(path.join(process.cwd(), "src/app/layout.tsx"), "utf8");
      expect(layoutSrc).not.toContain("maximum-scale=1");
      expect(layoutSrc).not.toContain("user-scalable=no");
    });

    it("ensures SiteHeader has valid navigation landmark aria-label", () => {
      const { container } = render(React.createElement(SiteHeader));
      const nav = container.querySelector("nav");
      expect(nav).toHaveAttribute("aria-label");
      expect(nav?.getAttribute("aria-label")?.length).toBeGreaterThan(0);
    });
  });

  describe("Feature 11: Offline Report Queue Boundaries", () => {
    it("enqueues empty or minimal payload generating unique ID", () => {
      const queue = new MockOfflineReportQueue();
      const item = queue.enqueue({});
      expect(item.id).toMatch(/^offline_\d+_[a-z0-9]+$/);
      expect(item.synced).toBe(false);
      expect(queue.size()).toBe(1);
    });

    it("retains unsynced state when drain handler fails with false", async () => {
      const queue = new MockOfflineReportQueue();
      queue.enqueue({ issueType: "pothole" });
      const drained = await queue.drain(async () => false);
      expect(drained).toBe(0);
      expect(queue.listPending().length).toBe(1);
    });

    it("handles partial drain when subsequent items succeed after earlier item", async () => {
      const queue = new MockOfflineReportQueue();
      queue.enqueue({ issueType: "pothole", seq: 1 });
      queue.enqueue({ issueType: "waterlogging", seq: 2 });
      queue.enqueue({ issueType: "open_manhole", seq: 3 });

      const drained = await queue.drain(async (item) => {
        return (item.payload.seq as number) % 2 === 1;
      });

      expect(drained).toBe(2);
      const pending = queue.listPending();
      expect(pending.length).toBe(1);
      expect(pending[0].payload.seq).toBe(2);
    });

    it("clears all queue items resetting size and pending to zero", () => {
      const queue = new MockOfflineReportQueue();
      queue.enqueue({ a: 1 });
      queue.enqueue({ b: 2 });
      expect(queue.size()).toBe(2);
      queue.clear();
      expect(queue.size()).toBe(0);
      expect(queue.listPending().length).toBe(0);
    });

    it("service worker skips caching for live API and assistant endpoints", () => {
      const sw = readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
      expect(sw).toContain('url.pathname.startsWith("/api/")');
      expect(sw).toContain('url.pathname.startsWith("/assistant")');
    });
  });
});
