"use client";

import { ChevronIcon, ListIcon, MapIcon } from "@/components/map/map-icons";
import type { IssueFilter } from "@/components/map/map-filter-utils";
import { ReportedDateFilter, type DateRange } from "@/components/map/ReportedDateFilter";
import { CloseIcon, SearchIcon } from "@/components/report/flow-icons";
import { ISSUE_TYPE_LABELS, ISSUE_TYPES } from "@/lib/types";

export function MapFilterBar({
  query,
  onQueryChange,
  issue,
  onIssueChange,
  range,
  onRangeChange,
  bounds,
  view,
  onViewChange,
  notice,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  issue: IssueFilter;
  onIssueChange: (issue: IssueFilter) => void;
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
  bounds: { min: string; max: string } | null;
  view: "map" | "list";
  onViewChange: (view: "map" | "list") => void;
  notice?: string;
}) {
  return (
    <div className="rb-explore-top">
      <div className="rb-search">
        <SearchIcon className="rb-search-icon" />
        <input
          type="search"
          autoComplete="off"
          aria-label="Search a road, area or ward"
          placeholder="Search a road, area or ward"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {query ? (
          <button
            type="button"
            className="rb-search-clear"
            aria-label="Clear search"
            onClick={() => onQueryChange("")}
          >
            <CloseIcon size={18} />
          </button>
        ) : null}
      </div>
      <div className="rb-explore-filters">
        <label
          className={
            issue === "all"
              ? "rb-select-chip"
              : "rb-select-chip rb-select-chip-on"
          }
        >
          <span className="sr-only">Problem type</span>
          <select
            value={issue}
            onChange={(event) => onIssueChange(event.target.value as IssueFilter)}
          >
            <option value="all">All problems</option>
            {ISSUE_TYPES.map((type) => (
              <option key={type} value={type}>
                {ISSUE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <ChevronIcon />
        </label>
        <ReportedDateFilter bounds={bounds} value={range} onChange={onRangeChange} />
        <div className="rb-view-toggle" role="group" aria-label="Show">
          <button
            type="button"
            aria-pressed={view === "list"}
            aria-label="List"
            onClick={() => onViewChange("list")}
          >
            <ListIcon />
          </button>
          <button
            type="button"
            aria-pressed={view === "map"}
            aria-label="Map"
            onClick={() => onViewChange("map")}
          >
            <MapIcon />
          </button>
        </div>
      </div>
      {notice ? (
        <p className="rb-explore-notice" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
