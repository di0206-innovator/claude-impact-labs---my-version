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
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getPotholeReceipt } from "@/lib/passport/receipt";
import {
  computeCanonicalEvidenceHash,
  MockOfflineReportQueue,
  setupTestRepo,
  teardownTestRepo,
} from "./e2e-helpers";

describe("Tier 1 Citizen Evidence & PWA Integrity (Features 7, 8, 9, 10, 11)", () => {
  beforeEach(() => {
    setupTestRepo();
  });

  afterEach(() => {
    cleanup();
    teardownTestRepo();
    vi.unstubAllEnvs();
  });

  describe("Feature 7: Mobile 1-Tap Report Access", () => {
    it("renders Report Pothole primary CTA in SiteHeader", () => {
      render(React.createElement(SiteHeader));
      const reportLinks = screen.getAllByRole("link", { name: /report pothole/i });
      expect(reportLinks.length).toBeGreaterThanOrEqual(1);
      for (const cta of reportLinks) {
        expect(cta).toHaveAttribute("href", "/report");
        expect(cta.className).toContain("touch-target");
      }
    });

    it("ensures all primary navigation links provide >=44px touch targets", () => {
      render(React.createElement(SiteHeader));
      const links = screen.getAllByRole("link");
      for (const link of links) {
        expect(link.className).toMatch(/touch-target/);
      }
    });

    it("configures 1-tap shortcut to /report in PWA Web App Manifest", () => {
      const m = manifest();
      const reportShortcut = m.shortcuts?.find((s) => s.url === "/report");
      expect(reportShortcut).toBeDefined();
      expect(reportShortcut?.name).toMatch(/report/i);
    });

    it("specifies standalone display mode for native-like mobile experience", () => {
      const m = manifest();
      expect(m.display).toBe("standalone");
      expect(m.theme_color).toBe("#064E4B");
    });

    it("provides mobile-optimized icon assets for 192x192 and 512x512 resolutions", () => {
      const m = manifest();
      expect(m.icons?.some((i) => i.sizes === "192x192")).toBe(true);
      expect(m.icons?.some((i) => i.sizes === "512x512")).toBe(true);
    });
  });

  describe("Feature 8: Canonical SHA-256 Evidence Hashing", () => {
    const sample = {
      issueType: "pothole",
      lat: 19.054444,
      lng: 72.840222,
      noticedAt: "2025-07-15",
      description: "Severe pothole outside Bandra station west",
    };

    it("produces deterministic sha256:<64-hex> hash string", () => {
      const hash = computeCanonicalEvidenceHash(sample);
      expect(hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    });

    it("produces identical hashes across repeated calls with identical data", () => {
      const h1 = computeCanonicalEvidenceHash(sample);
      const h2 = computeCanonicalEvidenceHash({ ...sample });
      expect(h1).toBe(h2);
    });

    it("produces completely different hash when coordinates vary slightly", () => {
      const h1 = computeCanonicalEvidenceHash(sample);
      const h2 = computeCanonicalEvidenceHash({ ...sample, lat: 19.054445 });
      expect(h1).not.toBe(h2);
    });

    it("produces different hash when issue type or description changes", () => {
      const h1 = computeCanonicalEvidenceHash(sample);
      const h2 = computeCanonicalEvidenceHash({ ...sample, issueType: "open_manhole" });
      const h3 = computeCanonicalEvidenceHash({ ...sample, description: "Different text" });
      expect(h1).not.toBe(h2);
      expect(h1).not.toBe(h3);
    });

    it("includes data integrity notice and canonical algorithm in receipt provenance", () => {
      const receipt = getPotholeReceipt("BMC25-000005");
      expect(receipt).not.toBeNull();
      expect(receipt?.provenance.algorithmVersion).toContain("pothole-receipt");
      expect(receipt?.provenance.dataIntegrityNotice).toContain("Billed");
    });
  });

  describe("Feature 9: Persistent Verification Flow", () => {
    it("renders VerifyPage with observation options for field verification", async () => {
      const jsx = await VerifyPage({
        searchParams: Promise.resolve({ id: "BMC25-000013" }),
      });
      render(jsx);
      expect(screen.getByText(/Citizen Repair Verification/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Complaint Reference ID/i)).toHaveValue("BMC25-000013");
    });

    it("displays confirmation state when submitted=1 is present", async () => {
      const jsx = await VerifyPage({
        searchParams: Promise.resolve({
          submitted: "1",
          id: "BMC25-000013",
          observation: "fixed",
        }),
      });
      render(jsx);
      expect(screen.getByText(/Observation Recorded/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /view rupee receipt/i })).toHaveAttribute(
        "href",
        "/receipt/BMC25-000013",
      );
    });

    it("retrieves receipt structure containing citizen observation schema", () => {
      const receipt = getPotholeReceipt("BMC25-000013");
      expect(receipt).not.toBeNull();
      expect(receipt?.citizenObservation).toBeDefined();
      expect(typeof receipt?.citizenObservation.verifiedByCitizen).toBe("boolean");
      expect(receipt?.citizenObservation.verificationStatus).toBeDefined();
    });

    it("identifies missing physical records in receipt for transparent audit", () => {
      const receipt = getPotholeReceipt("BMC25-000005");
      expect(receipt?.missingRecords.length).toBeGreaterThan(0);
      expect(receipt?.missingRecords.some((m) => m.includes("measurement book"))).toBe(true);
    });

    it("provides quick select sample links for swift citizen testing", async () => {
      const jsx = await VerifyPage({ searchParams: Promise.resolve({}) });
      render(jsx);
      const sampleLink = screen.getByRole("link", { name: /BMC25-000013/i });
      expect(sampleLink).toHaveAttribute("href", "/verify?id=BMC25-000013");
    });
  });

  describe("Feature 10: WCAG Landmark Compliance", () => {
    it("SiteHeader declares navigation role within header container", () => {
      const { container } = render(React.createElement(SiteHeader));
      const header = container.querySelector("header");
      expect(header).toBeInTheDocument();
      const nav = container.querySelector("nav");
      expect(nav).toBeInTheDocument();
      expect(nav?.getAttribute("aria-label")).toMatch(/site|main|primary/i);
    });

    it("SiteFooter renders in semantic footer element with dark styling", () => {
      const { container } = render(React.createElement(SiteFooter));
      const footer = container.querySelector("footer");
      expect(footer).toBeInTheDocument();
      expect(footer?.className).toContain("ux4g-footer-wrapper");
    });

    it("verifies skip-link target #main exists in layout definition", () => {
      const layoutSrc = readFileSync(path.join(process.cwd(), "src/app/layout.tsx"), "utf8");
      expect(layoutSrc).toContain('href="#main"');
      expect(layoutSrc).toContain('id="main"');
    });

    it("verifies assistant page uses section container rather than duplicate main", () => {
      const assistantSrc = readFileSync(path.join(process.cwd(), "src/app/assistant/page.tsx"), "utf8");
      expect(assistantSrc).not.toContain('<main id="main"');
      expect(assistantSrc.length).toBeGreaterThan(100);
    });

    it("verifies interactive controls include minimum 44px touch targets", () => {
      const { container } = render(React.createElement(SiteHeader));
      const touchElements = container.querySelectorAll(".touch-target");
      expect(touchElements.length).toBeGreaterThan(4);
    });
  });

  describe("Feature 11: Offline Report Queue (IndexedDB)", () => {
    it("enqueues report payload into offline queue with unique ID and timestamp", () => {
      const queue = new MockOfflineReportQueue();
      const item = queue.enqueue({ issueType: "pothole", lat: 19.05, lng: 72.84 });
      expect(item.id).toMatch(/^offline_\d+_[a-z0-9]+$/);
      expect(item.synced).toBe(false);
      expect(queue.size()).toBe(1);
    });

    it("returns only unsynced pending items from listPending", () => {
      const queue = new MockOfflineReportQueue();
      const i1 = queue.enqueue({ issueType: "pothole" });
      queue.enqueue({ issueType: "waterlogging" });
      i1.synced = true;
      const pending = queue.listPending();
      expect(pending.length).toBe(1);
      expect(pending[0].payload.issueType).toBe("waterlogging");
    });

    it("drains buffered reports sequentially and marks successfully synced items", async () => {
      const queue = new MockOfflineReportQueue();
      queue.enqueue({ issueType: "pothole" });
      queue.enqueue({ issueType: "open_manhole" });
      const drained = await queue.drain(async () => true);
      expect(drained).toBe(2);
      expect(queue.listPending().length).toBe(0);
    });

    it("service worker precaches dedicated /offline fallback route", () => {
      const sw = readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
      expect(sw).toContain('"/offline"');
    });

    it("offline page source contains user-facing offline status banner", () => {
      const off = readFileSync(path.join(process.cwd(), "src/app/offline/page.tsx"), "utf8");
      expect(off).toMatch(/offline/i);
      expect(off).toContain("Rastabaaz");
    });
  });
});
