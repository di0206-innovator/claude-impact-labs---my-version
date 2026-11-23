"use server";

import { getRepository } from "@/lib/repo/context";
import type { CitizenObservationType } from "@/lib/repo/port";

const VALID_OBSERVATIONS = new Set<CitizenObservationType>([
  "fixed",
  "returned",
  "persists",
  "new_issue",
]);

export type SubmitVerificationResult =
  | {
      ok: true;
      complaintId: string;
      observation: CitizenObservationType;
      notes: string | null;
      recordedAt: string;
    }
  | {
      ok: false;
      error: string;
    };

export async function submitVerificationAction(
  formData: FormData,
): Promise<SubmitVerificationResult> {
  const rawId = formData.get("complaintId");
  const rawObs = formData.get("observation");
  const rawNotes = formData.get("notes");

  const complaintId = typeof rawId === "string" ? rawId.trim().toUpperCase() : "";
  const observation = typeof rawObs === "string" ? rawObs.trim() : "";
  const notes = typeof rawNotes === "string" ? rawNotes.trim() : "";

  if (!complaintId) {
    return { ok: false, error: "Complaint reference ID is required." };
  }

  if (!VALID_OBSERVATIONS.has(observation as CitizenObservationType)) {
    return {
      ok: false,
      error: "Please select a valid repair observation status.",
    };
  }

  try {
    const repo = getRepository();
    const recorded = await repo.addVerification({
      complaintId,
      observation: observation as CitizenObservationType,
      notes: notes || null,
      recordedAt: new Date().toISOString(),
    });

    return {
      ok: true,
      complaintId: recorded.complaintId,
      observation: recorded.observation,
      notes: recorded.notes,
      recordedAt: recorded.recordedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record verification.";
    return { ok: false, error: message };
  }
}
