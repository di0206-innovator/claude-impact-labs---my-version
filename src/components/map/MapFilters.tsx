"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapFilterBar } from "@/components/map/MapFilterBar";
import {
  filterMapPoints,
  getFilteredPoints,
  getVisiblePlaces,
  type IssueFilter,
} from "@/components/map/map-filter-utils";
import { PlaceList } from "@/components/map/PlaceList";
import { PlacePreview } from "@/components/map/PlacePreview";
import type { DateRange } from "@/components/map/ReportedDateFilter";
import { reportedDateBounds } from "@/lib/map-date-filter";
import type { MapReportPoint, PlaceSummary } from "@/lib/types";

export { filterMapPoints, type IssueFilter };

/**
 * The map is always on screen, on every width. Loading it is deferred:
 * MapLibre is large, so `next/dynamic` keeps it out of the first payload.
 */
const CityMap = dynamic(
  () => import("@/components/map/CityMap").then((mod) => mod.CityMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-paper" aria-hidden="true" />
    ),
  },
);

type View = "map" | "list";

/**
 * The map fills the screen. Search and filter chips float on top, and places
 * sit in a bottom sheet/side panel.
 */
export function MapFilters({
  points,
  places,
  initialLocationId,
  focusPoint,
  focusZoom,
  highlightReportId,
  highlightLocationId,
  notice,
}: {
  points: MapReportPoint[];
  places: PlaceSummary[];
  initialLocationId?: string;
  focusPoint?: { lat: number; lng: number };
  focusZoom?: number;
  highlightReportId?: string;
  highlightLocationId?: string;
  notice?: string;
}) {
  const [issue, setIssue] = useState<IssueFilter>("all");
  const [range, setRange] = useState<DateRange>({ from: null, to: null });
  const bounds = useMemo(() => reportedDateBounds(points), [points]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("map");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialLocationId ?? null,
  );
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!notice) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("new") && !url.searchParams.has("lang")) return;
    url.searchParams.delete("new");
    url.searchParams.delete("lang");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [notice]);

  const visiblePlaces = useMemo(
    () => getVisiblePlaces(places, points, issue, range, query),
    [places, points, issue, range, query],
  );

  const filtered = useMemo(
    () => getFilteredPoints(points, visiblePlaces, issue, range),
    [points, visiblePlaces, issue, range],
  );

  const selected = visiblePlaces.find(
    (place) => place.location.id === selectedId,
  );

  const selectFromList = (locationId: string, opener: HTMLElement) => {
    openerRef.current = opener;
    setSelectedId(locationId);
    setView("map");
  };

  return (
    <section aria-labelledby="map-heading" className="rb-explore">
      <h2 id="map-heading" className="sr-only">
        Reported road problems
      </h2>
      <div className="rb-explore-map">
        <CityMap
          bare
          points={filtered}
          places={visiblePlaces}
          initialLocationId={initialLocationId}
          focusPoint={focusPoint}
          focusZoom={focusZoom}
          highlightReportId={highlightReportId}
          highlightLocationId={highlightLocationId}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            if (id) setView("map");
          }}
          openerRef={openerRef}
        />
      </div>

      <MapFilterBar
        query={query}
        onQueryChange={setQuery}
        issue={issue}
        onIssueChange={setIssue}
        range={range}
        onRangeChange={setRange}
        bounds={bounds}
        view={view}
        onViewChange={setView}
        notice={notice}
      />

      <div
        className="rb-sheet"
        data-view={view}
        data-selected={selected ? "true" : undefined}
      >
        <button
          type="button"
          className="rb-sheet-handle"
          aria-label={
            view === "list" ? "Show more of the map" : "Show the full list"
          }
          onClick={() => setView(view === "list" ? "map" : "list")}
        >
          <span aria-hidden="true" />
        </button>
        {selected ? (
          <div className="rb-sheet-selected">
            <PlacePreview
              inline
              place={selected}
              onClose={() => {
                const id = selected.location.id;
                setSelectedId(null);
                if (openerRef.current?.isConnected) return;
                requestAnimationFrame(() => {
                  const rows = document.querySelectorAll<HTMLElement>(".rb-sheet [data-location-id]");
                  const row = [...rows].find((el) => el.dataset.locationId === id);
                  (row ?? document.querySelector<HTMLElement>(".rb-sheet-handle"))?.focus();
                });
              }}
              openerRef={openerRef}
              yourReportId={
                highlightReportId &&
                selected.location.id === highlightLocationId
                  ? highlightReportId
                  : undefined
              }
            />
          </div>
        ) : null}
        {selected ? null : (
          <>
            <div className="rb-sheet-head" aria-live="polite">
              <h3 className="ux4g-heading-xs-strong">Most reported first</h3>
              <p className="ux4g-body-s-default ux4g-text-neutral-secondary">
                {visiblePlaces.length}{" "}
                {visiblePlaces.length === 1 ? "place" : "places"},{" "}
                {filtered.length} {filtered.length === 1 ? "report" : "reports"}
              </p>
            </div>
            <div className="rb-sheet-body">
              <PlaceList
                places={visiblePlaces}
                selectedId={selectedId}
                onSelect={selectFromList}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
