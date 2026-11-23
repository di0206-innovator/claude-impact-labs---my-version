import { describe, expect, it } from "vitest";
import { buildCitizenReport, computeEvidenceHash } from "@/lib/repo/mappers";
import type { CreateReportInput } from "@/lib/types";

describe("Canonical SHA-256 Evidence Hashing", () => {
  const samplePayload = {
    issueType: "pothole",
    lat: 18.9298,
    lng: 72.8324,
    createdAt: "2026-03-01T12:00:00.000Z",
    photo: "data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAQAcJaACdLoAAP7/2QAA",
  };

  it("produces a deterministic hash with sha256: prefix and 64 hex characters", () => {
    const hash1 = computeEvidenceHash(samplePayload);
    const hash2 = computeEvidenceHash(samplePayload);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("formats coordinates to 6 decimal places canonically", () => {
    const hashA = computeEvidenceHash({
      ...samplePayload,
      lat: 18.9298,
      lng: 72.8324,
    });
    const hashB = computeEvidenceHash({
      ...samplePayload,
      lat: 18.929800001,
      lng: 72.8324,
    });
    // 18.9298.toFixed(6) is "18.929800" and 18.929800001.toFixed(6) is "18.929800"
    expect(hashA).toBe(hashB);
  });

  it("produces distinct hashes when any canonical component changes", () => {
    const baseHash = computeEvidenceHash(samplePayload);

    const diffType = computeEvidenceHash({ ...samplePayload, issueType: "waterlogging" });
    const diffLat = computeEvidenceHash({ ...samplePayload, lat: 19.0123 });
    const diffLng = computeEvidenceHash({ ...samplePayload, lng: 72.9001 });
    const diffTime = computeEvidenceHash({ ...samplePayload, createdAt: "2026-03-02T12:00:00.000Z" });
    const diffPhoto = computeEvidenceHash({ ...samplePayload, photo: "data:image/webp;base64,different" });

    expect(diffType).not.toBe(baseHash);
    expect(diffLat).not.toBe(baseHash);
    expect(diffLng).not.toBe(baseHash);
    expect(diffTime).not.toBe(baseHash);
    expect(diffPhoto).not.toBe(baseHash);
  });

  it("attaches canonical evidenceHash when buildCitizenReport is called", () => {
    const input: CreateReportInput = {
      issueType: "open_manhole",
      lat: 19.076,
      lng: 72.8777,
      photo: samplePayload.photo,
      noticedAt: "2026-03-01",
      recurs: false,
      accident: "none",
      description: "Hazardous manhole near bus stop",
    };

    const report = buildCitizenReport(input, "loc_test_1");

    expect(report.evidenceHash).toBeDefined();
    expect(report.evidenceHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(report.isSample).toBe(false);
  });

  it("preserves explicit evidenceHash when provided in input", () => {
    const customHash = "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const input: CreateReportInput = {
      issueType: "pothole",
      lat: 18.92,
      lng: 72.82,
      photo: samplePayload.photo,
      noticedAt: "2026-03-01",
      recurs: true,
      accident: "none",
      description: null,
      evidenceHash: customHash,
    };

    const report = buildCitizenReport(input, "loc_test_2");
    expect(report.evidenceHash).toBe(customHash);
  });
});
