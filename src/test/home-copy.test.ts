import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const HOME_TYPES = [
  "pothole",
  "waterlogging",
  "open_manhole",
  "road_cave_in",
] as const;

const BROADSHEET = [
  "Dispatch",
  "№",
  "deva pointer-events-none absolute right-2",
  "className=\"ledger",
  "className=\"rise plate",
  "className=\"stamp",
  "className=\"display",
  "className=\"lede",
  "className=\"btn",
  "btn--solid",
  "btn--sm",
];

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function lines(path: string): number {
  return read(path).split(/\r?\n/).length;
}

describe("home page copy", () => {
  it("leads with the landing scenes on home and report form on /report", () => {
    const home = readFileSync("src/app/page.tsx", "utf8");
    const report = readFileSync("src/app/report/page.tsx", "utf8");
    expect(home).toMatch(/SceneHero/);
    expect(home).not.toMatch(/ReportForm/);
    expect(report).toMatch(/Report a road problem/);
    expect(report).toMatch(/Photograph a pothole/);
    expect(report).toMatch(/ReportForm/);
    expect(home).not.toMatch(/deva pointer-events-none absolute right-2/);
  });

  it("keeps the map on its own page, separate from the landing and report pages", () => {
    const report = read("src/app/report/page.tsx");
    const map = read("src/app/map/page.tsx");
    expect(report).toMatch(/ReportForm/);
    expect(report).toMatch(/parseIssueType/);
    expect(report).not.toMatch(/MapFilters|HomeIssueLinks|#records/);
    expect(map).toMatch(/Map of reports/);
    expect(map).toMatch(/MapFilters/);
    expect(map).toMatch(/dynamic = "force-dynamic"/);
    expect(map).toMatch(/Promise\.all/);
    expect(map).toMatch(/SUBMITTED_BANNER/);
    expect(read("src/lib/review-copy.ts")).toMatch(
      /en: "Submitted\. Your report is highlighted on the map\."/,
    );
  });

  it("deep-links the six home issue types in the specified order", () => {
    const param = read("src/lib/issue-type-param.ts");
    const links = read("src/components/home/HomeIssueLinks.tsx");
    expect(param).toMatch(
      /HOME_ISSUE_TYPES\s*=\s*\[[^\]]*"pothole"[^\]]*"waterlogging"[^\]]*"open_manhole"[^\]]*"road_cave_in"/,
    );
    expect(links).toMatch(/\/\?type=\$\{type\}/);
    for (const type of HOME_TYPES) {
      expect(param).toContain(`"${type}"`);
    }
  });
});

describe("report-first public pages", () => {
  it("parses Next 15 searchParams.type on the report page and redirects the old URL", () => {
    const report = read("src/app/report/page.tsx");
    const legacy = read("src/app/report/new/page.tsx");
    expect(report).toMatch(/searchParams:\s*Promise</);
    expect(report).toMatch(/await searchParams/);
    expect(report).toMatch(/parseIssueType/);
    expect(report).toMatch(/initialIssueType/);
    expect(report).toMatch(/ReportForm/);
    expect(report).toMatch(/Report a road problem/);
    expect(legacy).toMatch(/\/\?type=\$\{encodeURIComponent\(value\)\}/);
    expect(legacy).not.toMatch(/from ["']ux4g-web-components/);
  });

  it("labels the not-found return control exactly", () => {
    const source = read("src/app/not-found.tsx");
    expect(source).toMatch(/GovButton/);
    expect(source).toMatch(/Go to the wards/);
    expect(source).toMatch(/href="\/wards"/);
    expect(source).not.toMatch(/Return to the map/);
  });

  it("removes broadsheet chrome from public entry files", () => {
    const files = [
      "src/app/page.tsx",
      "src/app/report/new/page.tsx",
      "src/app/not-found.tsx",
      "src/components/insights/InsightStrip.tsx",
      "src/components/home/HomeIssueLinks.tsx",
    ];
    for (const file of files) {
      const source = read(file);
      for (const token of BROADSHEET) {
        expect(source, `${file} still has ${token}`).not.toContain(token);
      }
      expect(source, file).not.toMatch(/from ["']ux4g-web-components/);
      expect(source, file).not.toMatch(/emblem|Government of India service/i);
      expect(lines(file), file).toBeLessThanOrEqual(300);
    }
  });

  it("uses plain UX4G insight cards without a hairline ledger", () => {
    const source = read("src/components/insights/InsightStrip.tsx");
    expect(source).toMatch(/ux4g-card/);
    expect(source).toMatch(/Counts from the stored records/);
    expect(source).toMatch(/recurringPlaces/);
    expect(source).toMatch(/reports/);
    expect(source).toMatch(/places/);
    expect(source).not.toMatch(/unresolvedPlaces/);
    expect(source).not.toMatch(/noIdentifiableOwnerPlaces/);
    expect(source).not.toMatch(/gap-px/);
    expect(source).not.toMatch(/marginInline/);
    expect(source).not.toMatch(/hairline/);
    expect(source).not.toMatch(/\bclassName="num\b/);
    expect(source).not.toMatch(/\bstamp\b/);
    expect(source.indexOf("<dt")).toBeGreaterThan(-1);
    expect(source.indexOf("<dt")).toBeLessThan(source.indexOf("<dd"));
  });

  it("composes the desktop report column and featured place card at 64rem", () => {
    const layout = read("src/styles/layout.css");
    expect(layout).toMatch(/\.rb-home-intro/);
    expect(layout).toMatch(/\.rb-home-cta/);
    expect(layout).not.toMatch(
      /\.rb-home-cta[^{]*\{[^}]*safe-area-inset-bottom/,
    );
    expect(layout).not.toMatch(/\.rb-home\s*\{[^}]*overflow-x:\s*hidden/);
    expect(layout).toMatch(/overflow-wrap:\s*(anywhere|break-word)/);
    const desktop = layout.match(
      /@media\s*\(\s*min-width:\s*64rem\s*\)\s*\{[\s\S]*?\.rb-home-intro\s*\{([^}]+)\}/,
    );
    expect(desktop?.[1], "desktop intro grid").toMatch(/grid-template-columns/);
    expect(lines("src/styles/layout.css")).toBeLessThanOrEqual(300);
  });
});
