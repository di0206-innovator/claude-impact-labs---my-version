import { cleanup, render, screen, within } from "@testing-library/react";
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

import MapPage from "@/app/map/page";
import { getMapInsights, listMapPoints, listPlaces, readReportPlace, readReportPoint } from "@/lib/queries";
import { stubMap, testInsights, testPlace } from "./home-report-helpers";

afterEach(() => {
  cleanup();
  vi.mocked(listMapPoints).mockReset();
  vi.mocked(listPlaces).mockReset();
  vi.mocked(readReportPoint).mockReset();
  vi.mocked(readReportPoint).mockResolvedValue(null);
  vi.mocked(readReportPlace).mockReset();
  vi.mocked(readReportPlace).mockResolvedValue(null);
  vi.mocked(getMapInsights).mockReset();
});

describe("map page", () => {
  it("lists places under the map title", async () => {
    stubMap();
    render(await MapPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { level: 1, name: "Map of reports" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Most reported first" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reported road problems" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Dr Ambedkar Road/ })).toBeInTheDocument();
    expect(screen.queryByText(/Submitted\. Your report is highlighted/)).not.toBeInTheDocument();
  });

  it("highlights a submitted report and banners only when it is new", async () => {
    stubMap();
    render(await MapPage({ searchParams: Promise.resolve({ report: "rpt_1", new: "1" }) }));
    expect(screen.getByText("Submitted. Your report is highlighted on the map.")).toBeInTheDocument();
    expect(readReportPlace).not.toHaveBeenCalled();
    expect(screen.getByText("highlight rpt_1")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dr Ambedkar Road" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Your report" })).toHaveAttribute("href", "/reports/rpt_1");
  });

  it("keeps the highlight without the banner when new is absent", async () => {
    stubMap();
    render(await MapPage({ searchParams: Promise.resolve({ report: "rpt_1" }) }));
    expect(screen.queryByText(/Submitted\. Your report is highlighted/)).not.toBeInTheDocument();
    expect(screen.getByText("highlight rpt_1")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dr Ambedkar Road" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Your report" })).toHaveAttribute("href", "/reports/rpt_1");
  });

  it("shows a report the catalog has not caught up to, even with no place row", async () => {
    vi.mocked(listMapPoints).mockResolvedValue([]);
    vi.mocked(listPlaces).mockResolvedValue([]);
    vi.mocked(getMapInsights).mockResolvedValue(testInsights);
    vi.mocked(readReportPoint).mockResolvedValue({
      id: "rpt_fresh",
      locationId: "loc_fresh",
      lat: 18.93,
      lng: 72.83,
      issueType: "waterlogging",
      noticedAt: "2026-09-27",
      reportedAt: "2026-09-27",
    });
    vi.mocked(readReportPlace).mockResolvedValue({
      ...testPlace,
      location: { ...testPlace.location, id: "loc_fresh", name: "Waste near Max Mueller Bhavan", slug: "fresh" },
    });
    render(await MapPage({ searchParams: Promise.resolve({ report: "rpt_fresh", new: "1" }) }));
    expect(readReportPlace).toHaveBeenCalledWith("rpt_fresh");
    expect(screen.getByRole("link", { name: "Your report" })).toHaveAttribute("href", "/reports/rpt_fresh");
    expect(screen.getByText("Submitted. Your report is highlighted on the map.")).toBeInTheDocument();
    expect(screen.getByText("points rpt_fresh")).toBeInTheDocument();
    expect(screen.getByText("highlight rpt_fresh")).toBeInTheDocument();
    expect(screen.getByText("focus 18.93,72.83")).toBeInTheDocument();
  });

  it("opens preview when the listed report's place is still missing", async () => {
    stubMap([]);
    vi.mocked(readReportPlace).mockResolvedValue(testPlace);
    render(await MapPage({ searchParams: Promise.resolve({ report: "rpt_1" }) }));
    expect(readReportPlace).toHaveBeenCalledWith("rpt_1");
    expect(readReportPoint).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Dr Ambedkar Road" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Your report" })).toHaveAttribute("href", "/reports/rpt_1");
  });

  it("rebuilds a joined place so the new report is counted", async () => {
    stubMap();
    vi.mocked(readReportPoint).mockResolvedValue({
      id: "rpt_fresh",
      locationId: "loc_1",
      lat: 18.9298,
      lng: 72.8328,
      issueType: "pothole",
      noticedAt: "2026-09-27",
      reportedAt: "2026-09-27",
    });
    vi.mocked(readReportPlace).mockResolvedValue({ ...testPlace, reportCount: 5, recurring: true });
    render(await MapPage({ searchParams: Promise.resolve({ report: "rpt_fresh" }) }));
    expect(readReportPlace).toHaveBeenCalledWith("rpt_fresh");
    const preview = within(screen.getByRole("dialog"));
    expect(preview.getByText("5")).toBeInTheDocument();
    expect(preview.getByText(/reports, and it keeps coming back/)).toBeInTheDocument();
    expect(screen.queryByText("4")).not.toBeInTheDocument();
  });

  it("shows the map alone when the report id is unknown", async () => {
    stubMap();
    render(await MapPage({ searchParams: Promise.resolve({ report: "rpt_missing" }) }));
    expect(screen.getByRole("heading", { name: "Map of reports" })).toBeInTheDocument();
    expect(screen.queryByText(/Submitted\. Your report is highlighted/)).not.toBeInTheDocument();
    expect(readReportPoint).toHaveBeenCalledWith("rpt_missing");
  });

  it("never looks up a malformed report id", async () => {
    stubMap();
    vi.mocked(readReportPoint).mockClear();
    render(await MapPage({ searchParams: Promise.resolve({ report: "x".repeat(3000) }) }));
    expect(screen.getByRole("heading", { name: "Map of reports" })).toBeInTheDocument();
    expect(readReportPoint).not.toHaveBeenCalled();
  });
});
