import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetRepositoryForTests, setRepositoryForTests } from "@/lib/repo/context";
import { MemoryRastabaazRepository } from "@/lib/repo/memory";

export const SAMPLE_WEBP_DATA_URL =
  "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAD8D+JaQAA3AA/ua1AAA=";

export const SAMPLE_JPEG_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

export function setupTestRepo(): MemoryRastabaazRepository {
  const repo = new MemoryRastabaazRepository({ strictPhoto: false });
  setRepositoryForTests(repo);
  return repo;
}

export function teardownTestRepo(): void {
  resetRepositoryForTests();
  resetRateLimits();
}

export type MockReportFields = {
  issueType?: string;
  lat?: string;
  lng?: string;
  noticedAt?: string;
  recurs?: string;
  accident?: string;
  description?: string;
  photo?: string;
  evidenceHash?: string;
};

export function createMockReportFormData(overrides: MockReportFields = {}): FormData {
  const fd = new FormData();
  fd.set("issueType", overrides.issueType ?? "pothole");
  fd.set("lat", overrides.lat ?? "19.0544");
  fd.set("lng", overrides.lng ?? "72.8402");
  fd.set("noticedAt", overrides.noticedAt ?? "2025-07-15");
  fd.set("recurs", overrides.recurs ?? "yes");
  fd.set("accident", overrides.accident ?? "no");
  fd.set("description", overrides.description ?? "Deep crater near Bandra station");
  fd.set("photo", overrides.photo ?? SAMPLE_WEBP_DATA_URL);
  if (overrides.evidenceHash) {
    fd.set("evidenceHash", overrides.evidenceHash);
  }
  return fd;
}

export function createMockNextRequest(
  url: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): NextRequest {
  const { method = "GET", body, headers = {} } = options;
  const initHeaders: Record<string, string> = { ...headers };
  let reqBody: string | undefined;

  if (body !== undefined) {
    reqBody = typeof body === "string" ? body : JSON.stringify(body);
    if (!initHeaders["content-type"] && !initHeaders["Content-Type"]) {
      initHeaders["Content-Type"] = "application/json";
    }
  }

  return new NextRequest(url, {
    method,
    headers: initHeaders,
    body: reqBody,
  });
}

export function stubCanvasWebP(supported = true): () => void {
  const originalToDataUrl = HTMLCanvasElement.prototype.toDataURL;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalCreateImageBitmap = globalThis.createImageBitmap;

  HTMLCanvasElement.prototype.toDataURL = function (type?: string, ..._args: unknown[]) {
    if (type === "image/webp") {
      if (!supported) return "data:image/png;base64,fakePng";
      return SAMPLE_WEBP_DATA_URL;
    }
    return SAMPLE_JPEG_DATA_URL;
  };

  HTMLCanvasElement.prototype.getContext = function (contextId: string, ..._args: unknown[]) {
    if (contextId === "2d") {
      return {
        drawImage: () => {},
      } as unknown as CanvasRenderingContext2D;
    }
    return null;
  } as typeof HTMLCanvasElement.prototype.getContext;

  globalThis.createImageBitmap = (async () => ({
    width: 1600,
    height: 1200,
    close: () => {},
  })) as unknown as typeof createImageBitmap;

  return () => {
    HTMLCanvasElement.prototype.toDataURL = originalToDataUrl;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    globalThis.createImageBitmap = originalCreateImageBitmap;
  };
}

export function computeCanonicalEvidenceHash(data: {
  issueType: string;
  lat: number;
  lng: number;
  noticedAt: string;
  description?: string | null;
}): string {
  const canonicalPayload = JSON.stringify({
    description: data.description ?? "",
    issueType: data.issueType,
    lat: Number(data.lat.toFixed(6)),
    lng: Number(data.lng.toFixed(6)),
    noticedAt: data.noticedAt,
  });
  const digest = createHash("sha256").update(canonicalPayload, "utf8").digest("hex");
  return `sha256:${digest}`;
}

export type OfflineQueueItem = {
  id: string;
  timestamp: number;
  payload: Record<string, unknown>;
  synced: boolean;
};

export class MockOfflineReportQueue {
  private items: OfflineQueueItem[] = [];

  enqueue(payload: Record<string, unknown>): OfflineQueueItem {
    const item: OfflineQueueItem = {
      id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      payload,
      synced: false,
    };
    this.items.push(item);
    return item;
  }

  listPending(): OfflineQueueItem[] {
    return this.items.filter((i) => !i.synced);
  }

  async drain(handler: (item: OfflineQueueItem) => Promise<boolean>): Promise<number> {
    let drained = 0;
    for (const item of this.listPending()) {
      const ok = await handler(item);
      if (ok) {
        item.synced = true;
        drained++;
      }
    }
    return drained;
  }

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }
}
