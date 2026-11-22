import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { WardEngineerQueue } from "@/app/wards/[code]/queue";
import type { ActionQueueItem } from "@/lib/passport/types";

afterEach(cleanup);

const mockItems: ActionQueueItem[] = [
  {
    id: "queue_dlp_WO1",
    priority: "critical",
    category: "potential_dlp_conflict",
    headline: "DLP Warranty conflict on Senapati Bapat Marg",
    roadId: "RD1",
    roadName: "Senapati Bapat Marg",
    ward: "G/N",
    relatedEntityId: "WO1",
    amountAtRiskInr: 45000,
    status: "new",
    recommendedAction: "Verify original concession contract and issue demand notice.",
    reason: "Road is covered under 5-year DLP warranty.",
    evidenceCount: 1,
  },
  {
    id: "queue_cost_WO2",
    priority: "high",
    category: "cost_anomaly",
    headline: "Rate card variance on Lady Jamshedji Road",
    roadId: "RD2",
    roadName: "Lady Jamshedji Road",
    ward: "G/N",
    relatedEntityId: "WO2",
    amountAtRiskInr: 25000,
    status: "under_review",
    recommendedAction: "Inspect measurement book eMB entry.",
    reason: "Billed 65% above rate card expectation.",
    evidenceCount: 1,
  },
];

describe("WardEngineerQueue UI Component", () => {
  it("renders queue header, metrics, and items correctly", () => {
    render(<WardEngineerQueue wardCode="G/N" wardName="Dadar / Mahim" items={mockItems} />);

    expect(screen.getByText("Ward Engineer Action Queue")).toBeDefined();
    expect(screen.getByText("DLP Warranty conflict on Senapati Bapat Marg")).toBeDefined();
    expect(screen.getByText("Rate card variance on Lady Jamshedji Road")).toBeDefined();
    expect(screen.getByText("₹70,000")).toBeDefined(); // Total amount at risk
  });

  it("filters items by priority when priority chip is clicked", async () => {
    const user = userEvent.setup();
    render(<WardEngineerQueue wardCode="G/N" wardName="Dadar / Mahim" items={mockItems} />);

    // Click Critical chip
    const criticalBtn = screen.getByRole("button", { name: /^Critical$/i });
    await user.click(criticalBtn);

    expect(screen.getByText("DLP Warranty conflict on Senapati Bapat Marg")).toBeDefined();
    expect(screen.queryByText("Rate card variance on Lady Jamshedji Road")).toBeNull();
  });

  it("expands triage details panel and toggles status to resolved", async () => {
    const user = userEvent.setup();
    render(<WardEngineerQueue wardCode="G/N" wardName="Dadar / Mahim" items={mockItems} />);

    const triageButtons = screen.getAllByRole("button", { name: /Triage Details/i });
    await user.click(triageButtons[0]);

    // Check expanded panel content
    expect(screen.getByText("Audit Screening Finding")).toBeDefined();
    expect(screen.getByText("Road is covered under 5-year DLP warranty.")).toBeDefined();

    // Click Mark Verified & Cleared
    const resolveBtn = screen.getByRole("button", { name: /Mark Verified & Cleared/i });
    await user.click(resolveBtn);

    const resolvedElements = screen.getAllByText("Resolved");
    expect(resolvedElements.length).toBeGreaterThanOrEqual(1);
    expect(resolvedElements.some((el) => el.classList.contains("rb-chip-held"))).toBe(true);
  });

  it("displays empty state when filters match no items", async () => {
    const user = userEvent.setup();
    render(<WardEngineerQueue wardCode="G/N" wardName="Dadar / Mahim" items={mockItems} />);

    // Medium priority has no items in mock
    const mediumBtn = screen.getByRole("button", { name: /^Medium$/i });
    await user.click(mediumBtn);

    expect(screen.getByText("No action items match the active filters.")).toBeDefined();
  });
});
