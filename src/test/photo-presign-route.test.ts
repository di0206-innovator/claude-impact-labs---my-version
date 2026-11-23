import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/reports/photo/presign/route";

describe("POST /api/reports/photo/presign", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a valid presigned PUT descriptor for image/webp", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports/photo/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: "image/webp" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.method).toBe("PUT");
    expect(data.key).toMatch(/^reports\/photo_[a-z0-9]+\.webp$/);
    expect(data.uploadUrl).toContain(data.key);
    expect(data.headers["Content-Type"]).toBe("image/webp");
    expect(data.expiresIn).toBe(300);
  });

  it("returns a valid descriptor for image/jpeg with .jpg extension", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports/photo/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: "image/jpeg" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.key).toMatch(/^reports\/photo_[a-z0-9]+\.jpg$/);
    expect(data.headers["Content-Type"]).toBe("image/jpeg");
  });

  it("rejects invalid content types with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports/photo/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: "application/pdf" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toContain("Invalid photo content type");
  });

  it("rejects files exceeding size limit with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports/photo/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: "image/webp", size: 6 * 1024 * 1024 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toContain("File size exceeds");
  });

  it("signs with AWS SigV4 when AWS credentials are configured", async () => {
    vi.stubEnv("AWS_ACCESS_KEY_ID", "AKIAIOSFODNN7EXAMPLE");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY");
    vi.stubEnv("REPORTS_BUCKET_NAME", "my-test-bucket");
    vi.stubEnv("AWS_REGION", "ap-south-1");

    const req = new NextRequest("http://localhost:3000/api/reports/photo/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: "image/webp" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.uploadUrl).toContain("https://my-test-bucket.s3.ap-south-1.amazonaws.com/");
    expect(data.uploadUrl).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
    expect(data.uploadUrl).toContain("X-Amz-Signature=");
    expect(data.uploadUrl).toContain("X-Amz-Credential=AKIAIOSFODNN7EXAMPLE");
  });
});
