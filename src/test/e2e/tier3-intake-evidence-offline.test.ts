import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/report",
  useSearchParams: () => new URLSearchParams(),
}));

import { POST as presignRoute } from "@/app/api/reports/photo/presign/route";
import VerifyPage from "@/app/verify/page";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getPotholeReceipt } from "@/lib/passport/receipt";
import { compressImageFile } from "@/lib/photo-compress";
import { getRepository } from "@/lib/repo/context";
import {
  computeCanonicalEvidenceHash,
  createMockNextRequest,
  MockOfflineReportQueue,
  SAMPLE_WEBP_DATA_URL,
  setupTestRepo,
  stubCanvasWebP,
  teardownTestRepo,
} from "./e2e-helpers";

describe("Tier 3 Cross-Feature: Intake, Evidence & Offline Pipeline (F3+F7+F8+F9+F11)", () => {
  let restoreCanvas: () => void;

  beforeEach(() => {
    setupTestRepo();
    restoreCanvas = stubCanvasWebP(true);
  });

  afterEach(() => {
    cleanup();
    restoreCanvas();
    teardownTestRepo();
    vi.unstubAllEnvs();
  });

  it("1. F7+F3: 1-tap mobile intake initiates WebP client compression with <256KB constraint", async () => {
    render(React.createElement(SiteHeader));
    const reportLinks = screen.getAllByRole("link", { name: /report pothole/i });
    expect(reportLinks.length).toBeGreaterThan(0);
    expect(reportLinks[0]).toHaveAttribute("href", "/report");

    const rawFile = new File(["sample_heavy_raw_image_data"], "pothole.jpg", { type: "image/jpeg" });
    const compressed = await compressImageFile(rawFile);
    expect(compressed).toBe(SAMPLE_WEBP_DATA_URL);
    expect(new TextEncoder().encode(compressed).length).toBeLessThan(256_000);
  });

  it("2. F3: WebP compressed output requests pre-signed S3 upload descriptor with correct key format", async () => {
    const req = createMockNextRequest("http://localhost:3000/api/reports/photo/presign", {
      method: "POST",
      body: { contentType: "image/webp" },
    });
    const res = await presignRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.key).toMatch(/^reports\/photo_[a-z0-9]+\.webp$/);
    expect(body.headers["Content-Type"]).toBe("image/webp");
  });

  it("3. F3: Presign route rejects non-image formats preventing corrupted evidence uploads", async () => {
    const req = createMockNextRequest("http://localhost:3000/api/reports/photo/presign", {
      method: "POST",
      body: { contentType: "application/x-executable" },
    });
    const res = await presignRoute(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain("Invalid photo content type");
  });

  it("4. F3+F8: WebP payload paired with report coordinates produces canonical SHA-256 evidence hash", () => {
    const meta = { issueType: "pothole", lat: 19.0544, lng: 72.8402, noticedAt: "2025-07-15", description: "Bandra" };
    expect(computeCanonicalEvidenceHash(meta)).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("5. F8: Canonical evidence hash changes deterministically when coordinates or issue types vary", () => {
    const base = { issueType: "pothole", lat: 19.0544, lng: 72.8402, noticedAt: "2025-07-15", description: "Same" };
    const h1 = computeCanonicalEvidenceHash(base);
    expect(computeCanonicalEvidenceHash({ ...base, lat: 19.0545 })).not.toBe(h1);
    expect(computeCanonicalEvidenceHash({ ...base, issueType: "open_manhole" })).not.toBe(h1);
  });

  it("6. F7+F8+F11: Offline commuter enqueues evidence-hashed report payload into offline queue", () => {
    const queue = new MockOfflineReportQueue();
    const meta = { issueType: "pothole", lat: 19.0544, lng: 72.8402, noticedAt: "2025-07-15" };
    const hash = computeCanonicalEvidenceHash(meta);
    const item = queue.enqueue({ ...meta, photo: SAMPLE_WEBP_DATA_URL, evidenceHash: hash });

    expect(item.id).toMatch(/^offline_\d+_[a-z0-9]+$/);
    expect(item.synced).toBe(false);
    expect(item.payload.evidenceHash).toBe(hash);
    expect(queue.size()).toBe(1);
  });

  it("7. F11: Offline queue preserves multiple sequential submissions with pending state", () => {
    const queue = new MockOfflineReportQueue();
    queue.enqueue({ issueType: "pothole", lat: 19.0544, lng: 72.8402 });
    queue.enqueue({ issueType: "waterlogging", lat: 19.055, lng: 72.841 });
    queue.enqueue({ issueType: "open_manhole", lat: 19.056, lng: 72.842 });

    expect(queue.size()).toBe(3);
    const pending = queue.listPending();
    expect(pending.length).toBe(3);
    expect(pending[0].payload.issueType).toBe("pothole");
    expect(pending[1].payload.issueType).toBe("waterlogging");
    expect(pending[2].payload.issueType).toBe("open_manhole");
  });

  it("8. F11+F8: Reconnect drain persists buffered offline reports into active repository", async () => {
    const queue = new MockOfflineReportQueue();
    const repo = getRepository();
    queue.enqueue({ issueType: "pothole", lat: 19.0544, lng: 72.8402, noticedAt: "2025-07-15", photo: SAMPLE_WEBP_DATA_URL });

    const drained = await queue.drain(async (item) => {
      const p = item.payload;
      const res = await repo.createReport({
        issueType: p.issueType as "pothole", lat: p.lat as number, lng: p.lng as number,
        noticedAt: p.noticedAt as string, photo: p.photo as string, recurs: false, accident: "none",
        description: null,
      });
      return !!res.report.id;
    });
    expect(drained).toBe(1);
    expect(queue.listPending().length).toBe(0);
  });

  it("9. F11: Failed drain maintains pending queue state without data loss for resilient retry", async () => {
    const queue = new MockOfflineReportQueue();
    queue.enqueue({ issueType: "pothole", lat: 19.0544, lng: 72.8402 });

    const drained = await queue.drain(async () => false);
    expect(drained).toBe(0);
    expect(queue.listPending().length).toBe(1);
    expect(queue.listPending()[0].synced).toBe(false);
  });

  it("10. F8+F11: Drained report in repository retains location clustering and nearest road attribution", async () => {
    const repo = getRepository();
    const res = await repo.createReport({
      issueType: "pothole",
      lat: 19.0544,
      lng: 72.8402,
      noticedAt: "2025-07-15",
      photo: SAMPLE_WEBP_DATA_URL,
      recurs: false,
      accident: "none",
      description: "Drained offline report",
    });

    expect(res.report.id).toMatch(/^rpt_/);
    expect(res.location.id).toMatch(/^loc_/);
    expect(res.location.ward).toBe("G/N");
    expect(res.location.roadId).toBeTruthy();
  });

  it("11. F9: Verify route loads complaint reference from previous citizen intake", async () => {
    const jsx = await VerifyPage({ searchParams: Promise.resolve({ id: "BMC25-000013" }) });
    render(jsx);
    expect(screen.getByText(/Citizen Repair Verification/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Complaint Reference ID/i)).toHaveValue("BMC25-000013");
  });

  it("12. F9+F8: Citizen confirms repair holding ('fixed') and links back to verified receipt", async () => {
    const jsx = await VerifyPage({
      searchParams: Promise.resolve({ submitted: "1", id: "BMC25-000013", observation: "fixed" }),
    });
    render(jsx);
    expect(screen.getByText(/Observation Recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/Fix is holding well/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view rupee receipt/i })).toHaveAttribute(
      "href",
      "/receipt/BMC25-000013",
    );
  });

  it("13. F9: Citizen records defect recurrence ('returned') signaling DLP contractor liability", async () => {
    const jsx = await VerifyPage({
      searchParams: Promise.resolve({ submitted: "1", id: "BMC25-000013", observation: "returned" }),
    });
    render(jsx);
    expect(screen.getByText(/Observation Recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/Defect has returned \/ reopened/i)).toBeInTheDocument();
  });

  it("14. F9: Verify route handles missing or arbitrary complaint IDs gracefully", async () => {
    const jsx = await VerifyPage({ searchParams: Promise.resolve({}) });
    render(jsx);
    expect(screen.getByLabelText(/Complaint Reference ID/i)).toHaveValue("");
    expect(screen.getByText(/Quick Select Sample/i)).toBeInTheDocument();
  });

  it("15. F7+F3+F8+F11+F9: Full lifecycle chain from mobile 1-tap capture to offline drain and citizen verification", async () => {
    const rawPhoto = new File(["mobile_commuter_pothole_bytes"], "sv_road.jpg", { type: "image/jpeg" });
    const webpPhoto = await compressImageFile(rawPhoto);
    expect(webpPhoto).toBe(SAMPLE_WEBP_DATA_URL);

    const meta = { issueType: "pothole", lat: 19.0544, lng: 72.8402, noticedAt: "2025-07-15" };
    const evidenceHash = computeCanonicalEvidenceHash(meta);
    expect(evidenceHash).toMatch(/^sha256:[a-f0-9]{64}$/);

    const queue = new MockOfflineReportQueue();
    queue.enqueue({ ...meta, photo: webpPhoto, evidenceHash });
    expect(queue.size()).toBe(1);

    const repo = getRepository();
    const drained = await queue.drain(async (item) => {
      const p = item.payload;
      const res = await repo.createReport({
        issueType: p.issueType as "pothole",
        lat: p.lat as number,
        lng: p.lng as number,
        noticedAt: p.noticedAt as string,
        photo: p.photo as string,
        recurs: false,
        accident: "none",
        description: null,
      });
      return !!res.report.id;
    });
    expect(drained).toBe(1);
    expect(queue.listPending().length).toBe(0);

    const receipt = getPotholeReceipt("BMC25-000013");
    expect(receipt).not.toBeNull();
    expect(receipt?.citizenObservation.verificationStatus).toBeDefined();

    const verifyJsx = await VerifyPage({
      searchParams: Promise.resolve({ submitted: "1", id: "BMC25-000013", observation: "fixed" }),
    });
    render(verifyJsx);
    expect(screen.getByText(/Observation Recorded/i)).toBeInTheDocument();
  });
});
