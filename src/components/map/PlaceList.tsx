"use client";

import Link from "next/link";
import { placeTitle } from "@/components/map/place-title";
import { ISSUE_TYPE_LABELS, type PlaceSummary } from "@/lib/types";

/** The same three bands the map's clusters use, so a row and its mark read alike. */
function band(count: number): "low" | "mid" | "high" {
  return count >= 8 ? "high" : count >= 4 ? "mid" : "low";
}

export function PlaceList({
  places,
  selectedId,
  onSelect,
}: {
  places: PlaceSummary[];
  selectedId: string | null;
  onSelect: (locationId: string, opener: HTMLElement) => void;
}) {
  if (places.length === 0) {
    return (
      <p className="rb-rows-empty ux4g-body-m-default">
        No places match. Clear the search or pick All problems.
      </p>
    );
  }
  return (
    <ul className="rb-rows" aria-label="Places in this filter">
      {places.map((place) => {
        const selected = place.location.id === selectedId;
        const title = placeTitle(place);
        const issue = ISSUE_TYPE_LABELS[place.location.issueType];
        return (
          <li key={place.location.id}>
            <Link
              href={`/places/${place.location.slug}`}
              aria-current={selected ? "true" : undefined}
              data-location-id={place.location.id}
              onClick={(event) => {
                // On a phone the row opens the preview first; the preview links on to the place.
                event.preventDefault();
                onSelect(place.location.id, event.currentTarget);
              }}
              className="rb-row touch-target"
            >
              <span
                className={`rb-row-count rb-band-${band(place.reportCount)} ${band(place.reportCount) === "high" || place.recurring ? "rb-pulse-beacon" : ""}`}
                aria-hidden="true"
              >
                {place.reportCount}
              </span>
              <span className="rb-row-text">
                <span className="rb-row-title">{title}</span>
                <span className="rb-row-sub">
                  {place.location.ward} ward,{" "}
                  {place.reportCount === 1
                    ? "1 report"
                    : `${place.reportCount} reports`}
                </span>
              </span>
              {title === issue ? null : (
                <span className="rb-row-tag">{issue}</span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
