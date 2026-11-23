"use server";

import { clientIp } from "@/lib/client-ip";
import { isInsideCity } from "@/lib/city";
import { estimateNoticedAt, kolkataTodayStamp } from "@/lib/noticed-date";
import { assertPhotoString } from "@/lib/photo-validate";
import { createReport } from "@/lib/queries";
import { allowRequest, allowRequestDistributed } from "@/lib/rate-limit";
import { ItemTooLargeError, ReportValidationError } from "@/lib/repo/errors";
import {
  ACCIDENT_SEEN,
  ISSUE_TYPES,
  NOTICED_WINDOWS,
  type AccidentSeen,
  type IssueType,
  type NoticedWindow,
} from "@/lib/types";
import { getRoadTrail, type RoadTrailSummary } from "@/lib/rupee/road-trail";

export type CreateReportActionResult =
  | { ok: true; reportId: string; roadTrail?: RoadTrailSummary | null }
  | { ok: false; error: string };

function fail(error: string): CreateReportActionResult {
  return { ok: false, error };
}

function isNoticedWindow(value: string): value is NoticedWindow {
  return (NOTICED_WINDOWS as readonly string[]).includes(value);
}

/**
 * Sized for a room, not a person. A demo audience shares one WiFi NAT, so the
 * whole room is one bucket; mobile carriers here also put many phones behind
 * one address. The old 5/hour blocked the sixth honest visitor for an hour.
 */
const CREATE_LIMIT = 60;
const CREATE_WINDOW_MS = 60 * 60 * 1000;

function isIssueType(value: string): value is IssueType {
  return (ISSUE_TYPES as readonly string[]).includes(value);
}

export async function createReportAction(
  formData: FormData,
): Promise<CreateReportActionResult> {
  // Reject automated submissions that filled the hidden honeypot field.
  if (String(formData.get("website") ?? "").trim().length > 0) {
    return fail("Could not record this report.");
  }

  // Unidentified requests share one bucket instead of skipping the limit.
  const ip = (await clientIp()) ?? "unknown";
  if (!(await allowRequestDistributed(`create:${ip}`, CREATE_LIMIT, CREATE_WINDOW_MS))) {
    return fail("Too many reports. Try again later.");
  }

  const issueType = String(formData.get("issueType") ?? "");
  if (!isIssueType(issueType)) return fail("Choose an issue type.");

  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInsideCity(lat, lng)) {
    return fail("Place the pin inside a BMC ward in Mumbai.");
  }
  if (String(formData.get("locationConfirmed") ?? "") !== "true") {
    return fail("Confirm the map pin before recording.");
  }

  const photo = String(formData.get("photo") ?? "");
  try {
    assertPhotoString(photo, { allowSample: false });
  } catch {
    return fail("Upload a JPEG, PNG, or WebP photo.");
  }

  const noticedWindow = String(formData.get("noticedWindow") ?? "");
  if (!isNoticedWindow(noticedWindow)) return fail("Say when you noticed it.");

  const recursRaw = String(formData.get("recurs") ?? "");
  if (recursRaw !== "true" && recursRaw !== "false") {
    return fail("Say whether it has been fixed before and come back.");
  }

  const accidentRaw = String(formData.get("accident") ?? "");
  if (!(ACCIDENT_SEEN as readonly string[]).includes(accidentRaw)) {
    return fail("Say whether you have seen an accident here.");
  }
  const accident = accidentRaw as AccidentSeen;

  const descriptionRaw = String(formData.get("description") ?? "").trim();
  const description = descriptionRaw.length > 0 ? descriptionRaw.slice(0, 2000) : null;

  try {
    const created = await createReport({
      issueType,
      lat,
      lng,
      photo,
      noticedAt: estimateNoticedAt(kolkataTodayStamp(), noticedWindow),
      noticedWindow,
      recurs: recursRaw === "true",
      accident,
      description,
    });
    let roadTrail: RoadTrailSummary | null = null;
    try { roadTrail = getRoadTrail(created.location.roadId); } catch { /* dataset optional in isolated tests */ }
    return { ok: true, reportId: created.report.id, ...(roadTrail ? { roadTrail } : {}) };
  } catch (error) {
    if (error instanceof ReportValidationError || error instanceof ItemTooLargeError) {
      return fail(error.message);
    }
    return fail("Could not record this report.");
  }
}
