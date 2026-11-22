import { describe, expect, it, vi, beforeEach } from "vitest";

const createReport = vi.hoisted(() => vi.fn());
const listAllReports = vi.hoisted(() => vi.fn());
const allowRequest = vi.hoisted(() => vi.fn(() => true));
const clientIp = vi.hoisted(() => vi.fn(async () => "127.0.0.1"));

vi.mock("@/lib/queries", () => ({
  createReport,
  listAllReports,
}));

vi.mock("@/lib/rate-limit", () => ({
  allowRequest,
}));

vi.mock("@/lib/client-ip", () => ({
  clientIp,
}));

vi.mock("@/lib/rupee/road-trail", () => ({
  getRoadTrail: vi.fn(() => ({
    roadId: "RD0001",
    roadName: "Dr Dadabhai Naoroji Road",
    ward: "A",
    contractorName: "Eagle Infra India Ltd",
    costInr: 12500000,
    hasActiveWork: false,
    underDlp: true,
  })),
}));

import { sampleJpegDataUrl } from "./sample-jpeg";
import { GET, POST } from "@/app/api/reports/route";

const VALID_PHOTO = sampleJpegDataUrl();
const VALID_LAT = 18.9322;
const VALID_LNG = 72.8331;

beforeEach(() => {
  vi.clearAllMocks();
  allowRequest.mockReturnValue(true);
});

describe("/api/reports endpoint", () => {
  describe("POST /api/reports", () => {
    it("rejects invalid issueType", async () => {
      const request = new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueType: "invalid_hazard",
          lat: VALID_LAT,
          lng: VALID_LNG,
          photo: VALID_PHOTO,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("Choose an issue type");
    });

    it("rejects coordinates outside Mumbai", async () => {
      const request = new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueType: "pothole",
          lat: 28.6139, // Delhi
          lng: 77.2090,
          photo: VALID_PHOTO,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("inside a BMC ward");
    });

    it("rejects invalid photo format", async () => {
      const request = new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueType: "pothole",
          lat: VALID_LAT,
          lng: VALID_LNG,
          photo: "not_a_valid_data_url",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("Upload a JPEG, PNG, or WebP photo");
    });

    it("drops honeypot submissions", async () => {
      const request = new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueType: "pothole",
          lat: VALID_LAT,
          lng: VALID_LNG,
          photo: VALID_PHOTO,
          website: "http://spambot.example",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("Could not record");
    });

    it("returns 429 when rate limit exceeded", async () => {
      allowRequest.mockReturnValueOnce(false);

      const request = new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueType: "pothole",
          lat: VALID_LAT,
          lng: VALID_LNG,
          photo: VALID_PHOTO,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("Too many reports");
    });

    it("successfully creates a report from JSON payload", async () => {
      createReport.mockResolvedValueOnce({
        report: {
          id: "rpt_api_123",
          locationId: "loc_api_456",
          issueType: "pothole",
          lat: VALID_LAT,
          lng: VALID_LNG,
          noticedAt: "2026-11-22",
          noticedWindow: "today",
          recurs: false,
          accident: "none",
          description: "Big crater near bus stop",
          isSample: false,
          createdAt: "2026-11-22T12:00:00.000Z",
        },
        location: {
          id: "loc_api_456",
          name: "Fort Area",
          slug: "fort-area",
          issueType: "pothole",
          lat: VALID_LAT,
          lng: VALID_LNG,
          street: "DN Road",
          ward: "A",
          roadId: "RD0001",
          createdAt: "2026-11-22T12:00:00.000Z",
        },
        connectedCount: 1,
      });

      const request = new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueType: "pothole",
          lat: VALID_LAT,
          lng: VALID_LNG,
          photo: VALID_PHOTO,
          noticedWindow: "today",
          recurs: false,
          accident: "none",
          description: "Big crater near bus stop",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.ok).toBe(true);
      expect(json.reportId).toBe("rpt_api_123");
      expect(json.report.id).toBe("rpt_api_123");
      expect(json.location.ward).toBe("A");
      expect(json.roadTrail?.contractorName).toBe("Eagle Infra India Ltd");
    });

    it("successfully creates a report from FormData payload", async () => {
      createReport.mockResolvedValueOnce({
        report: {
          id: "rpt_form_1", locationId: "loc_1", issueType: "waterlogging",
          lat: VALID_LAT, lng: VALID_LNG, noticedAt: "2026-11-22",
          noticedWindow: "today", recurs: true, accident: "near_miss",
          description: null, isSample: false, createdAt: "2026-11-22T12:00:00.000Z",
        },
        location: {
          id: "loc_1", name: "Colaba", slug: "colaba", issueType: "waterlogging",
          lat: VALID_LAT, lng: VALID_LNG, street: "Colaba Causeway",
          ward: "A", roadId: "RD0001", createdAt: "2026-11-22T12:00:00.000Z",
        },
        connectedCount: 2,
      });

      const formData = new FormData();
      formData.set("issueType", "waterlogging");
      formData.set("lat", String(VALID_LAT));
      formData.set("lng", String(VALID_LNG));
      formData.set("photo", VALID_PHOTO);
      formData.set("recurs", "true");
      formData.set("accident", "near_miss");

      const request = new Request("http://localhost/api/reports", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.ok).toBe(true);
      expect(json.reportId).toBe("rpt_form_1");
    });
  });

  describe("GET /api/reports", () => {
    it("returns listed reports and supports issueType filter", async () => {
      listAllReports.mockResolvedValueOnce([
        {
          id: "rpt_1",
          locationId: "loc_1",
          issueType: "pothole",
          lat: 18.93,
          lng: 72.83,
          ward: "A",
          noticedAt: "2026-11-22",
          noticedWindow: "today",
          recurs: false,
          photoIsIllustration: false,
          createdAt: "2026-11-22T10:00:00.000Z",
        },
        {
          id: "rpt_2",
          locationId: "loc_2",
          issueType: "waterlogging",
          lat: 19.01,
          lng: 72.84,
          ward: "G/N",
          noticedAt: "2026-11-21",
          noticedWindow: "this_week",
          recurs: true,
          photoIsIllustration: false,
          createdAt: "2026-11-21T10:00:00.000Z",
        },
      ]);

      const request = new Request("http://localhost/api/reports?issueType=pothole");
      const response = await GET(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.ok).toBe(true);
      expect(json.reports).toHaveLength(1);
      expect(json.reports[0].id).toBe("rpt_1");
    });
  });
});
