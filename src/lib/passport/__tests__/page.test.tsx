import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import RoadPassportPage, { generateMetadata } from "@/app/roads/[roadId]/page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("RoadPassportPage (src/app/roads/[roadId]/page.tsx)", () => {
  it("generates correct metadata for an existing road segment", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ roadId: "RD0001" }),
    });

    expect(meta.title).toContain("Shahid Bhagat Singh Marg (RD0001)");
    expect(meta.description).toContain("Shahid Bhagat Singh Marg in Ward A");
  });

  it("generates fallback metadata when road is not found", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ roadId: "UNKNOWN_ROAD_404" }),
    });

    expect(meta.title).toBe("Road Not Found");
  });

  it("renders the road passport page component with breadcrumbs, header, and timeline", async () => {
    const pageJsx = await RoadPassportPage({
      params: Promise.resolve({ roadId: "RD0001" }),
    });

    render(pageJsx);

    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Road Explorer" })).toHaveAttribute("href", "/roads");
    const wardLinks = screen.getAllByRole("link", { name: "Ward A" });
    expect(wardLinks.length).toBeGreaterThanOrEqual(1);
    expect(wardLinks[0]).toHaveAttribute("href", "/wards/a");

    expect(screen.getByRole("heading", { name: "Shahid Bhagat Singh Marg", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Work Orders & Contractor Timeline/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Money Trail & Rate Card Comparison/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Environmental & Public Safety Context/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Recommended Next Actions/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Promises vs Reality Lifecycle/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Evidence Graph & Provenance/i })).toBeInTheDocument();
    expect(screen.getByText(/Data Provenance:/i)).toBeInTheDocument();
  });

  it("triggers notFound() when the road ID does not exist", async () => {
    const { notFound } = await import("next/navigation");
    await expect(
      RoadPassportPage({
        params: Promise.resolve({ roadId: "NON_EXISTENT_ROAD" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
  });
});
