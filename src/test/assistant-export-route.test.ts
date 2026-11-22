import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/export/[type]/[id]/route";

describe("export API route GET /api/export/:type/:id", () => {
  it("returns road passport CSV export", async () => {
    const req = new NextRequest("http://localhost:3000/api/export/road/RD0065?format=csv");
    const res = await GET(req, { params: Promise.resolve({ type: "road", id: "RD0065" }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    const body = await res.text();
    expect(body).toContain("AUDIT-READY EVIDENCE PACK");
    expect(body).toContain("RD0065");
  });

  it("returns road passport PDF export", async () => {
    const req = new NextRequest("http://localhost:3000/api/export/road/RD0065?format=pdf");
    const res = await GET(req, { params: Promise.resolve({ type: "road", id: "RD0065" }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("road-passport.pdf");
    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });

  it("returns contractor scorecard PDF export", async () => {
    const req = new NextRequest("http://localhost:3000/api/export/contractor/CT01?format=pdf");
    const res = await GET(req, { params: Promise.resolve({ type: "contractor", id: "CT01" }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("contractor-scorecard.pdf");
  });

  it("returns ward accountability CSV export", async () => {
    const req = new NextRequest("http://localhost:3000/api/export/ward/F-S?format=csv");
    const res = await GET(req, { params: Promise.resolve({ type: "ward", id: "F-S" }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    const body = await res.text();
    expect(body).toContain("Ward F/S");
  });

  it("returns 400 for invalid export type", async () => {
    const req = new NextRequest("http://localhost:3000/api/export/unknown/123");
    const res = await GET(req, { params: Promise.resolve({ type: "unknown", id: "123" }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid export type");
  });

  it("returns 404 for unknown record ID", async () => {
    const req = new NextRequest("http://localhost:3000/api/export/road/RD_NOT_FOUND");
    const res = await GET(req, { params: Promise.resolve({ type: "road", id: "RD_NOT_FOUND" }) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("No records found");
  });
});
