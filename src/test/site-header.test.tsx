import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

afterEach(() => {
  cleanup();
});

describe("SiteHeader", () => {
  it("marks the record nav current and keeps 48px targets", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    // disclaimer removed from topbar in Rastabaaz header
    expect(document.querySelector(".ux4g-navbar")).not.toBeNull();
    const home = screen.getByRole("link", { name: /^home$/i });
    expect(home).toHaveAttribute("aria-current", "page");
    expect(home.className).toMatch(/touch-target/);
    expect(document.querySelector(".ux4g-navbar-wrap")).not.toBeNull();
    const wordmark = screen.getByRole("link", { name: /rastabaaz/i });
    expect(wordmark.className).toMatch(/rb-wordmark/);
    expect(wordmark.className).toMatch(/touch-target/);
    expect(wordmark.textContent).toContain("रस्ताबाज");
    expect(home.className).toMatch(/ux4g-text-link-neutral-m/);
    const map = screen.getByRole("link", { name: /^map$/i });
    expect(map).toHaveAttribute("href", "/map");
    expect(map.className).toMatch(/ux4g-text-link-neutral-m/);
    expect(map.className).toMatch(/touch-target/);
    expect(document.querySelector(".ux4g-navbar-links")).not.toHaveAttribute(
      "style",
    );
    expect(document.querySelector("header")?.className).toMatch(/rb-header/);
    await user.tab();
    expect(wordmark).toHaveFocus();
  });
});

describe("SiteFooter", () => {
  it("uses official footer tree and 48px text links", () => {
    render(<SiteFooter />);
    const footer = document.querySelector("footer");
    expect(footer?.className).toMatch(/ux4g-footer-wrapper/);
    expect(footer?.className).toMatch(/ux4g-footer-dark/);
    expect(document.querySelector(".ux4g-footer-content")).toBeNull();
    const map = screen.getByRole("link", { name: /map of reports/i });
    expect(map.className).toMatch(/ux4g-text-link-neutral-s/);
    expect(map.className).toMatch(/touch-target/);
  });
});
