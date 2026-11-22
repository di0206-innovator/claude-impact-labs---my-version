import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
  usePathname: () => "/report",
}));

vi.mock("@/components/report/ReportForm", () => ({
  ReportForm: ({ initialIssueType }: { initialIssueType?: string }) => (
    <div data-testid="report-form" data-issue-type={initialIssueType ?? "none"}>
      ReportForm Stub
    </div>
  ),
  default: ({ initialIssueType }: { initialIssueType?: string }) => (
    <div data-testid="report-form" data-issue-type={initialIssueType ?? "none"}>
      ReportForm Stub
    </div>
  ),
}));

vi.mock("@/components/report/PlacePickerMap", async () => {
  return {
    MIN_PIN_ZOOM: 14,
    default: function PlacePickerStub() {
      return <div data-testid="place-picker-stub" />;
    },
  };
});

vi.mock("@/components/report/PinMap", () => ({
  PinMap: ({ value }: { value: { lat: number; lng: number } | null }) => (
    <div data-testid="pin-map-stub" data-lat={value?.lat} data-lng={value?.lng} />
  ),
  default: ({ value }: { value: { lat: number; lng: number } | null }) => (
    <div data-testid="pin-map-stub" data-lat={value?.lat} data-lng={value?.lng} />
  ),
}));

import ReportPage from "@/app/report/page";
import ReportNewPage from "@/app/report/new/page";
import ReportIdRedirectPage from "@/app/report/[id]/page";
import { LocationStep } from "@/components/report/LocationStep";
import { LocationStep as AppLocationStep, PinMap as AppPinMap, ReportForm as AppReportForm } from "@/app/report";

afterEach(() => {
  cleanup();
  redirectMock.mockReset();
});

describe("Citizen Report Flow Pages", () => {
  it("renders the primary report page with heading and form", async () => {
    const page = await ReportPage({
      searchParams: Promise.resolve({ type: "pothole" }),
    });
    render(page);

    expect(screen.getByRole("heading", { name: "Report a road problem" })).toBeInTheDocument();
    const form = screen.getByTestId("report-form");
    expect(form).toBeInTheDocument();
    expect(form).toHaveAttribute("data-issue-type", "pothole");
  });

  it("handles missing searchParams gracefully on /report", async () => {
    const page = await ReportPage({
      searchParams: Promise.resolve({}),
    });
    render(page);

    const form = screen.getByTestId("report-form");
    expect(form).toHaveAttribute("data-issue-type", "none");
  });

  it("redirects /report/new with proper initial issue type to /", async () => {
    await ReportNewPage({
      searchParams: Promise.resolve({ type: "waterlogging" }),
    });
    expect(redirectMock).toHaveBeenCalledWith("/?type=waterlogging");
  });

  it("redirects singular /report/:id to canonical /reports/:id", async () => {
    await ReportIdRedirectPage({
      params: Promise.resolve({ id: "rpt_abc123" }),
    });
    expect(redirectMock).toHaveBeenCalledWith("/reports/rpt_abc123");
  });

  it("re-exports components correctly from src/app/report", () => {
    expect(AppLocationStep).toBeDefined();
    expect(AppPinMap).toBeDefined();
    expect(AppReportForm).toBeDefined();
  });

  it("renders LocationStep with default picker map", async () => {
    const onChange = vi.fn();
    render(<LocationStep value={{ lat: 18.93, lng: 72.83 }} onChange={onChange} error={null} />);

    expect(screen.getByRole("heading", { name: "Where is it?" })).toBeInTheDocument();
    expect(await screen.findByTestId("place-picker-stub")).toBeInTheDocument();
  });

  it("renders LocationStep with pin map when mapMode is pin", async () => {
    const onChange = vi.fn();
    render(
      <LocationStep
        value={{ lat: 18.93, lng: 72.83 }}
        onChange={onChange}
        error={null}
        mapMode="pin"
      />,
    );

    expect(await screen.findByTestId("pin-map-stub")).toBeInTheDocument();
  });
});
