import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/queries", () => ({
  listMapPoints: vi.fn(),
  listPlaces: vi.fn(),
  readReportPoint: vi.fn(async () => null),
  readReportPlace: vi.fn(async () => null),
  getMapInsights: vi.fn(),
  insightsFromPlaces: (places: { reportCount: number; recurring: boolean }[]) => ({
    reports: places.reduce((sum, item) => sum + item.reportCount, 0),
    places: places.length,
    recurringPlaces: places.filter((item) => item.recurring).length,
  }),
}));

vi.mock("@/lib/actions", () => ({
  createReportAction: vi.fn(),
}));

vi.mock("@/lib/photo-compress", () => ({
  compressImageFile: vi.fn(),
}));

vi.mock("@/components/report/PinMap", () => ({
  default: function PinMapStub() {
    return <div data-testid="pin-map">pin</div>;
  },
}));

vi.mock("@/components/map/CityMap", () => ({
  CityMap: ({
    points,
    highlightReportId,
    focusPoint,
  }: {
    points: { id: string }[];
    highlightReportId?: string;
    focusPoint?: { lat: number; lng: number };
  }) => (
    <div data-testid="rb-map-enhancement">
      <span>points {points.map((item) => item.id).join(" ")}</span>
      <span>highlight {highlightReportId ?? "none"}</span>
      <span>focus {focusPoint ? `${focusPoint.lat},${focusPoint.lng}` : "none"}</span>
    </div>
  ),
}));

import ReportPage from "@/app/report/page";
import NotFound from "@/app/not-found";
import NewReportPage from "@/app/report/new/page";
import { HomeIssueLinks } from "@/components/home/HomeIssueLinks";

afterEach(() => {
  cleanup();
});

describe("report page experience", () => {
  it("opens on the report form", async () => {
    render(await ReportPage({ searchParams: Promise.resolve({}) }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Report a road problem" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /photograph the problem/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(screen.queryByText(/Dispatch/)).not.toBeInTheDocument();
    expect(document.querySelector(".ledger, .plate, .stamp, .display")).toBeNull();
  });
});

describe("HomeIssueLinks", () => {
  it("exposes four 48px deep links in order with visible focus classes", async () => {
    const user = userEvent.setup();
    render(<HomeIssueLinks />);
    const nav = screen.getByRole("navigation", { name: "Condition types" });
    expect(within(nav).getByRole("list")).toBeInTheDocument();
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/?type=pothole",
      "/?type=waterlogging",
      "/?type=open_manhole",
      "/?type=road_cave_in",
    ]);
    expect(links.map((link) => link.textContent)).toEqual([
      "Pothole",
      "Waterlogging",
      "Open or broken manhole",
      "Road cave-in",
    ]);
    for (const link of links) {
      expect(link.className).toMatch(/touch-target/);
      expect(link.className).toMatch(/ux4g-btn/);
    }
    await user.tab();
    expect(links[0]).toHaveFocus();
  });
});

describe("not-found and new-report pages", () => {
  it("returns to wards with the exact GovButton label", () => {
    render(<NotFound />);
    const link = screen.getByRole("link", { name: "Go to the wards" });
    expect(link).toHaveAttribute("href", "/wards");
    expect(link.className).toMatch(/ux4g-btn-primary/);
    expect(link.className).toMatch(/touch-target/);
    expect(screen.queryByRole("link", { name: "Return to the map" })).toBeNull();
  });

  it("passes a valid searchParams type into the guided form", async () => {
    render(
      await ReportPage({
        searchParams: Promise.resolve({ type: "pothole" }),
      }),
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Report a road problem" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /photograph the problem/i }),
    ).toBeInTheDocument();
    expect(document.querySelector('input[type="hidden"][name="issueType"]')).toHaveValue(
      "pothole",
    );
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  it("ignores an invalid type and leaves the picker empty", async () => {
    render(
      await ReportPage({
        searchParams: Promise.resolve({ type: "not-an-issue" }),
      }),
    );
    expect(document.querySelector('input[type="hidden"][name="issueType"]')).toHaveValue("");
  });

  it("sends the old report URL back to the form and keeps the type", async () => {
    await expect(
      NewReportPage({ searchParams: Promise.resolve({ type: "footpath" }) }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
  });
});
