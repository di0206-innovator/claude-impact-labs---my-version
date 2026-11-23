import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearQueue,
  drainOfflineQueue,
  enqueueReport,
  formDataToRecord,
  getQueuedReports,
  peekQueueCount,
  recordToFormData,
  removeQueuedReport,
} from "@/lib/offline/queue";

describe("Client-Side Offline Report Queue", () => {
  beforeEach(async () => {
    await clearQueue();
  });

  it("converts FormData to record and back correctly", () => {
    const fd = new FormData();
    fd.set("issueType", "pothole");
    fd.set("lat", "18.929800");
    fd.set("lng", "72.832400");
    fd.set("recurs", "true");

    const record = formDataToRecord(fd);
    expect(record.issueType).toBe("pothole");
    expect(record.lat).toBe("18.929800");

    const reconstructed = recordToFormData(record);
    expect(reconstructed.get("issueType")).toBe("pothole");
    expect(reconstructed.get("lat")).toBe("18.929800");
    expect(reconstructed.get("recurs")).toBe("true");
  });

  it("enqueues report and returns generated item with ID", async () => {
    const reportData = {
      issueType: "waterlogging",
      lat: "19.012300",
      lng: "72.845600",
      description: "Severe waterlogging outside station",
    };

    const item = await enqueueReport(reportData);
    expect(item.id).toMatch(/^offline_rpt_/);
    expect(item.fields.issueType).toBe("waterlogging");
    expect(item.attempts).toBe(0);

    const count = await peekQueueCount();
    expect(count).toBe(1);
  });

  it("retrieves queued reports in chronological order", async () => {
    await enqueueReport({ issueType: "pothole", lat: "18.9" });
    await enqueueReport({ issueType: "open_manhole", lat: "19.0" });

    const items = await getQueuedReports();
    expect(items.length).toBe(2);
    expect(items[0].fields.issueType).toBe("pothole");
    expect(items[1].fields.issueType).toBe("open_manhole");
  });

  it("removes individual reports after processing", async () => {
    const item1 = await enqueueReport({ issueType: "pothole" });
    const item2 = await enqueueReport({ issueType: "waterlogging" });

    expect(await peekQueueCount()).toBe(2);

    await removeQueuedReport(item1.id);

    const remaining = await getQueuedReports();
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe(item2.id);
  });

  it("clears entire queue", async () => {
    await enqueueReport({ issueType: "pothole" });
    await enqueueReport({ issueType: "waterlogging" });
    expect(await peekQueueCount()).toBe(2);

    await clearQueue();
    expect(await peekQueueCount()).toBe(0);
  });

  it("drains queue sequentially and removes successful items while retaining failures", async () => {
    const item1 = await enqueueReport({ issueType: "pothole", id: "report_1" });
    const item2 = await enqueueReport({ issueType: "bad_input", id: "report_2" });

    const mockSubmit = vi.fn().mockImplementation(async (formData: FormData) => {
      const type = formData.get("issueType");
      if (type === "pothole") {
        return { ok: true, reportId: "rpt_mock_123" };
      }
      return { ok: false, error: "Validation failure" };
    });

    const result = await drainOfflineQueue(mockSubmit);
    expect(result.drained).toBe(1);
    expect(result.failed).toBe(1);
    expect(mockSubmit).toHaveBeenCalledTimes(2);

    const remaining = await getQueuedReports();
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe(item2.id);
    expect(remaining[0].attempts).toBe(1);
  });
});
