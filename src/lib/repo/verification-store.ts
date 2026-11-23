import { nid } from "@/lib/id";
import type { VerificationInput, VerificationRecord } from "@/lib/repo/port";

// Preserved across fast-refreshes in development
const globalHolder = globalThis as { __rastabaazVerifications?: Map<string, VerificationRecord> };
if (!globalHolder.__rastabaazVerifications) {
  globalHolder.__rastabaazVerifications = new Map<string, VerificationRecord>();
}
const store = globalHolder.__rastabaazVerifications;

export function recordVerificationSync(input: VerificationInput): VerificationRecord {
  const record: VerificationRecord = {
    id: nid("verif"),
    complaintId: input.complaintId.trim().toUpperCase(),
    observation: input.observation,
    notes: input.notes?.trim() || null,
    recordedAt: input.recordedAt ?? new Date().toISOString(),
  };
  store.set(record.id, record);
  return record;
}

export function getVerificationsForComplaintSync(complaintId: string): VerificationRecord[] {
  const target = complaintId.trim().toUpperCase();
  const matched: VerificationRecord[] = [];
  for (const record of store.values()) {
    if (record.complaintId === target) {
      matched.push(record);
    }
  }
  return matched.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

export function resetVerificationsForTests(): void {
  store.clear();
}
