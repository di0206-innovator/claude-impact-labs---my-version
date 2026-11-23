import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { submitVerificationAction } from "@/lib/actions/verify";
import { getPotholeReceipt } from "@/lib/passport/receipt";
import { resetRepositoryForTests, setRepositoryForTests } from "@/lib/repo/context";
import { MemoryRastabaazRepository } from "@/lib/repo/memory";
import { resetVerificationsForTests } from "@/lib/repo/verification-store";

describe("Persistent Verification via Server Action & Store", () => {
  beforeEach(() => {
    resetRepositoryForTests();
    resetVerificationsForTests();
    setRepositoryForTests(new MemoryRastabaazRepository());
  });

  it("fails when complaintId is missing", async () => {
    const formData = new FormData();
    formData.set("complaintId", "");
    formData.set("observation", "fixed");

    const result = await submitVerificationAction(formData);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Complaint reference ID is required");
    }
  });

  it("fails when observation type is invalid", async () => {
    const formData = new FormData();
    formData.set("complaintId", "BMC25-000013");
    formData.set("observation", "not_a_valid_status");

    const result = await submitVerificationAction(formData);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("valid repair observation status");
    }
  });

  it("successfully persists verification record via repository", async () => {
    const repo = new MemoryRastabaazRepository();
    const created = await repo.addVerification({
      complaintId: "BMC25-000013",
      observation: "returned",
      notes: "Crater has reappeared after two heavy showers",
    });

    expect(created.id).toMatch(/^verif_/);
    expect(created.complaintId).toBe("BMC25-000013");
    expect(created.observation).toBe("returned");
    expect(created.notes).toBe("Crater has reappeared after two heavy showers");

    const list = await repo.getVerificationsForComplaint("BMC25-000013");
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].observation).toBe("returned");
  });

  it("updates getPotholeReceipt with citizen verification status", async () => {
    // Before verification: status is pending
    const before = getPotholeReceipt("BMC25-000013");
    expect(before).not.toBeNull();
    expect(before?.citizenObservation.verifiedByCitizen).toBe(false);
    expect(before?.citizenObservation.verificationStatus).toContain("Pending");

    // Submit citizen observation via Server Action
    const formData = new FormData();
    formData.set("complaintId", "BMC25-000013");
    formData.set("observation", "fixed");
    formData.set("notes", "Smooth asphalt patch inspected in morning commute");

    const actionResult = await submitVerificationAction(formData);
    expect(actionResult.ok).toBe(true);

    // After verification: receipt immediately reflects citizen observation
    const after = getPotholeReceipt("BMC25-000013");
    expect(after).not.toBeNull();
    expect(after?.citizenObservation.verifiedByCitizen).toBe(true);
    expect(after?.citizenObservation.verificationStatus).toBe("fixed");
    expect(after?.citizenObservation.remarks).toBe("Smooth asphalt patch inspected in morning commute");
    expect(after?.citizenObservation.verifiedAt).toBeDefined();
  });
});
