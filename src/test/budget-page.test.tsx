import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import BudgetPage from "@/app/budget/page";

afterEach(() => {
  cleanup();
});

describe("Budget & Disparity Scoring Page", () => {
  it("renders the budget page with disparity metrics and rankings", async () => {
    const page = await BudgetPage({
      searchParams: Promise.resolve({}),
    });
    render(page);

    // Verify main header
    expect(
      screen.getByRole("heading", {
        name: /ward spend vs need & fiscal equity/i,
      }),
    ).toBeInTheDocument();

    // Verify summary cards
    expect(screen.getByText(/spatial disparity index/i)).toBeInTheDocument();
    expect(screen.getByText(/deficit ward shortfall/i)).toBeInTheDocument();
    expect(screen.getAllByText(/ward allocations/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/allocation extremes/i)).toBeInTheDocument();

    // Verify filter tabs
    expect(screen.getByRole("tab", { name: /all wards/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /deficit only/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /surplus only/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /equitable/i })).toBeInTheDocument();

    // Verify table headings
    expect(
      screen.getByRole("heading", {
        name: /ward spend vs need rankings/i,
      }),
    ).toBeInTheDocument();

    // Verify presence of deficit corridors table
    expect(
      screen.getByRole("heading", {
        name: /high-need deficit corridors/i,
      }),
    ).toBeInTheDocument();
  });

  it("applies deficit filter when filter=deficit is passed in searchParams", async () => {
    const page = await BudgetPage({
      searchParams: Promise.resolve({ filter: "deficit" }),
    });
    render(page);

    expect(
      screen.getByRole("tab", { name: /deficit only/i }),
    ).toHaveAttribute("aria-selected", "true");

    // Table should show deficit status wards
    const statusBadges = screen.getAllByText(/deficit/i);
    expect(statusBadges.length).toBeGreaterThan(0);
  });

  it("applies zone filter when zone=City is passed in searchParams", async () => {
    const page = await BudgetPage({
      searchParams: Promise.resolve({ zone: "City" }),
    });
    render(page);

    // Island City wards (A, B, C, D, E, F/N, F/S, G/N, G/S) are Zone 1 and Zone 2
    expect(screen.getByText(/island city/i)).toBeInTheDocument();
    expect(screen.getAllByText(/zone 1|zone 2/i).length).toBeGreaterThan(0);
  });
});
