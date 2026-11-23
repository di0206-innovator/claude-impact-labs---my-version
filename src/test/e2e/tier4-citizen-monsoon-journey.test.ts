import React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/report",
  useSearchParams: () => new URLSearchParams(),
}));

import manifest from "@/app/manifest";
import { POST as presignPhotoRoute } from "@/app/api/reports/photo/presign/route";
import VerifyPage from "@/app/verify/page";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getPotholeReceipt } from "@/lib/passport/receipt";
import { compressImageFile } from "@/lib/photo-compress";
import { createReport } from "@/lib/queries/write";
import {
  computeCanonicalEvidenceHash,
  createMockNextRequest,
  MockOfflineReportQueue,
  SAMPLE_WEBP_DATA_URL,
  setupTestRepo,
  stubCanvasWebP,
  teardownTestRepo,
} from "./e2e-helpers";

describe("Tier 4 Scenario 1: Citizen Commuter Monsoon Journey (S.V. Road Bandra)", () => {
  let restoreCanvas: () => void;

  beforeEach(() => {
    setupTestRepo();
    restoreCanvas = stubCanvasWebP(true);
  });

  afterEach(() => {
    restoreCanvas();
    cleanup();
    teardownTestRepo();
    vi.unstubAllEnvs();
  });

  it("completes full commuter journey: 1-tap mobile intake -> offline queue -> sync -> receipt -> verify", async () => {
    // 1. Mobile 1-Tap Access & PWA Readiness
    const pwaManifest = manifest();
    expect(pwaManifest.display).toBe("standalone");
    expect(pwaManifest.theme_color).toBe("#064E4B");
    const reportShortcut = pwaManifest.shortcuts?.find((s) => s.url === "/report");
    expect(reportShortcut).toBeDefined();

    render(React.createElement(SiteHeader));
    const reportLinks = screen.getAllByRole("link", { name: /report pothole/i });
    expect(reportLinks.length).toBeGreaterThan(0);
    const reportCta = reportLinks[0];
    expect(reportCta).toHaveAttribute("href", "/report");
    expect(reportCta.className).toContain("touch-target");

    // 2. Heavy Rain Photo Capture & WebP Client-Side Compression
    const photoFile = new File(["monsoon_pothole_bytes"], "sv_road_crater.jpg", {
      type: "image/jpeg",
    });
    const compressedWebP = await compressImageFile(photoFile);
    expect(compressedWebP).toBe(SAMPLE_WEBP_DATA_URL);
    expect(new TextEncoder().encode(compressedWebP).length).toBeLessThan(256_000);

    const presignReq = createMockNextRequest("http://localhost:3000/api/reports/photo/presign", {
      method: "POST",
      body: { contentType: "image/webp" },
    });
    const presignRes = await presignPhotoRoute(presignReq);
    expect(presignRes.status).toBe(200);
    const presignData = await presignRes.json();
    expect(presignData.ok).toBe(true);
    expect(presignData.method).toBe("PUT");
    expect(presignData.key).toMatch(/^reports\/photo_[a-z0-9]+\.webp$/);

    // 3. 4G Drop: IndexedDB Offline Queue Buffering & SW Offline Shell
    const offlineQueue = new MockOfflineReportQueue();
    const swScript = readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
    expect(swScript).toContain('"/offline"');

    const potholePayload = {
      issueType: "pothole" as const,
      lat: 19.0544,
      lng: 72.8402,
      noticedAt: "2025-07-15",
      noticedWindow: "today" as const,
      recurs: true,
      accident: "near_miss" as const,
      description: "Severe pothole crater on S.V. Road Bandra West near flyover",
      photo: compressedWebP,
    };

    const queuedItem = offlineQueue.enqueue(potholePayload);
    expect(queuedItem.id).toMatch(/^offline_\d+_[a-z0-9]+$/);
    expect(queuedItem.synced).toBe(false);
    expect(offlineQueue.listPending().length).toBe(1);

    // 4. Network Restored: Background Sync & Server Ingestion
    const syncedCount = await offlineQueue.drain(async (item) => {
      const payload = item.payload as typeof potholePayload;
      const result = await createReport({
        issueType: payload.issueType,
        lat: payload.lat,
        lng: payload.lng,
        noticedAt: payload.noticedAt,
        noticedWindow: payload.noticedWindow,
        recurs: payload.recurs,
        accident: payload.accident,
        description: payload.description,
        photo: payload.photo,
      });
      return Boolean(result.report.id);
    });

    expect(syncedCount).toBe(1);
    expect(offlineQueue.listPending().length).toBe(0);

    // 5. Canonical SHA-256 Cryptographic Evidence Receipt
    const canonicalHash = computeCanonicalEvidenceHash({
      issueType: potholePayload.issueType,
      lat: potholePayload.lat,
      lng: potholePayload.lng,
      noticedAt: potholePayload.noticedAt,
      description: potholePayload.description,
    });
    expect(canonicalHash).toMatch(/^sha256:[0-9a-f]{64}$/);

    const receipt = getPotholeReceipt("BMC25-000005");
    expect(receipt).not.toBeNull();
    expect(receipt?.complaintId).toBe("BMC25-000005");
    expect(receipt?.provenance.algorithmVersion).toContain("pothole-receipt");
    expect(receipt?.provenance.dataIntegrityNotice).toContain("Billed");
    expect(receipt?.citizenObservation.verifiedByCitizen).toBe(false);

    // 6. Follow-up Citizen Field Verification Flow
    cleanup();
    const verifyFormJsx = await VerifyPage({
      searchParams: Promise.resolve({ id: "BMC25-000013" }),
    });
    render(verifyFormJsx);
    expect(screen.getByText(/Citizen Repair Verification/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Complaint Reference ID/i)).toHaveValue("BMC25-000013");
    expect(screen.getByRole("button", { name: /Submit Citizen Verification/i })).toBeInTheDocument();

    cleanup();
    const verifySubmittedJsx = await VerifyPage({
      searchParams: Promise.resolve({
        submitted: "1",
        id: "BMC25-000013",
        observation: "returned",
      }),
    });
    render(verifySubmittedJsx);
    expect(screen.getByText(/Observation Recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/Defect has returned \/ reopened/i)).toBeInTheDocument();
    const receiptLink = screen.getByRole("link", { name: /view rupee receipt/i });
    expect(receiptLink).toHaveAttribute("href", "/receipt/BMC25-000013");
  });

  it("verifies offline report queue preserves FIFO order across multiple buffered downpour reports", async () => {
    const queue = new MockOfflineReportQueue();
    const r1 = queue.enqueue({ road: "S.V. Road Bandra", issueType: "pothole" });
    const r2 = queue.enqueue({ road: "Linking Road", issueType: "waterlogging" });
    const r3 = queue.enqueue({ road: "Hill Road", issueType: "open_manhole" });

    expect(queue.size()).toBe(3);
    const pending = queue.listPending();
    expect(pending[0].payload.road).toBe("S.V. Road Bandra");
    expect(pending[1].payload.road).toBe("Linking Road");
    expect(pending[2].payload.road).toBe("Hill Road");

    const processed: string[] = [];
    await queue.drain(async (item) => {
      processed.push(String(item.payload.road));
      return true;
    });

    expect(processed).toEqual(["S.V. Road Bandra", "Linking Road", "Hill Road"]);
    expect(queue.listPending().length).toBe(0);
  });

  it("verifies evidence hash changes when location or description is altered", () => {
    const base = {
      issueType: "pothole",
      lat: 19.0544,
      lng: 72.8402,
      noticedAt: "2025-07-15",
      description: "S.V. Road Bandra crater",
    };
    const h1 = computeCanonicalEvidenceHash(base);
    const h2 = computeCanonicalEvidenceHash({ ...base, lat: 19.0545 });
    const h3 = computeCanonicalEvidenceHash({ ...base, description: "Different crater" });
    expect(h1).not.toBe(h2);
    expect(h1).not.toBe(h3);
  });
});
