import { clientIp } from "@/lib/client-ip";
import { isInsideCity } from "@/lib/city";
import { estimateNoticedAt, kolkataTodayStamp } from "@/lib/noticed-date";
import { assertPhotoString } from "@/lib/photo-validate";
import { createReport, listAllReports } from "@/lib/queries";
import { allowRequest } from "@/lib/rate-limit";
import { ItemTooLargeError, ReportValidationError } from "@/lib/repo/errors";
import { getRoadTrail, type RoadTrailSummary } from "@/lib/rupee/road-trail";
import {
  ACCIDENT_SEEN,
  ISSUE_TYPES,
  NOTICED_WINDOWS,
  type AccidentSeen,
  type IssueType,
  type NoticedWindow,
} from "@/lib/types";

const CREATE_LIMIT = 60;
const CREATE_WINDOW_MS = 60 * 60 * 1000;

function isIssueType(value: unknown): value is IssueType {
  return typeof value === "string" && (ISSUE_TYPES as readonly string[]).includes(value);
}

function isNoticedWindow(value: unknown): value is NoticedWindow {
  return typeof value === "string" && (NOTICED_WINDOWS as readonly string[]).includes(value);
}

function isAccidentSeen(value: unknown): value is AccidentSeen {
  return typeof value === "string" && (ACCIDENT_SEEN as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  const ip = (await clientIp()) ?? "unknown";
  if (!allowRequest(`api:report:${ip}`, CREATE_LIMIT, CREATE_WINDOW_MS)) {
    return Response.json({ ok: false, error: "Too many reports. Try again later." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }
  } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    try {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    } catch {
      return Response.json({ ok: false, error: "Invalid form data." }, { status: 400 });
    }
  } else {
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return Response.json({ ok: false, error: "Unsupported media type." }, { status: 415 });
    }
  }

  // Honeypot check for bots
  if (body.website && String(body.website).trim().length > 0) {
    return Response.json({ ok: false, error: "Could not record this report." }, { status: 400 });
  }

  const issueType = body.issueType;
  if (!isIssueType(issueType)) {
    return Response.json({ ok: false, error: "Choose an issue type." }, { status: 400 });
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInsideCity(lat, lng)) {
    return Response.json({ ok: false, error: "Place the pin inside a BMC ward in Mumbai." }, { status: 400 });
  }

  const photo = String(body.photo ?? "");
  try {
    assertPhotoString(photo, { allowSample: false });
  } catch {
    return Response.json({ ok: false, error: "Upload a JPEG, PNG, or WebP photo." }, { status: 400 });
  }

  const noticedWindowRaw = body.noticedWindow ?? "today";
  if (!isNoticedWindow(noticedWindowRaw)) {
    return Response.json({ ok: false, error: "Say when you noticed it." }, { status: 400 });
  }
  const noticedWindow = noticedWindowRaw as NoticedWindow;

  const recurs = body.recurs === true || body.recurs === "true";

  const accidentRaw = body.accident ?? "none";
  if (!isAccidentSeen(accidentRaw)) {
    return Response.json({ ok: false, error: "Say whether you have seen an accident here." }, { status: 400 });
  }
  const accident = accidentRaw as AccidentSeen;

  const descRaw = typeof body.description === "string" ? body.description.trim() : "";
  const description = descRaw.length > 0 ? descRaw.slice(0, 2000) : null;

  try {
    const created = await createReport({
      issueType,
      lat,
      lng,
      photo,
      noticedAt: estimateNoticedAt(kolkataTodayStamp(), noticedWindow),
      noticedWindow,
      recurs,
      accident,
      description,
    });

    let roadTrail: RoadTrailSummary | null = null;
    try {
      roadTrail = getRoadTrail(created.location.roadId);
    } catch {
      // dataset optional in test environments
    }

    return Response.json(
      {
        ok: true,
        reportId: created.report.id,
        report: created.report,
        location: created.location,
        connectedCount: created.connectedCount,
        roadTrail,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ReportValidationError || error instanceof ItemTooLargeError) {
      return Response.json({ ok: false, error: error.message }, { status: 400 });
    }
    return Response.json({ ok: false, error: "Could not record this report." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ward = url.searchParams.get("ward")?.trim().toUpperCase();
  const issueType = url.searchParams.get("issueType")?.trim();
  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 50;

  try {
    const all = await listAllReports();
    let filtered = all;

    if (ward) {
      filtered = filtered.filter((r) => r.locationId.includes(ward) || ("ward" in r && r.ward === ward));
    }
    if (issueType && isIssueType(issueType)) {
      filtered = filtered.filter((r) => r.issueType === issueType);
    }

    return Response.json({
      ok: true,
      reports: filtered.slice(0, limit),
      total: filtered.length,
    });
  } catch {
    return Response.json({ ok: false, error: "Could not list reports." }, { status: 500 });
  }
}
