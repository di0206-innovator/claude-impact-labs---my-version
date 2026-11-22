"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { CloseIcon, LocateIcon, PinIcon, SearchIcon } from "@/components/report/flow-icons";
import type { FlyTarget, MapPin } from "@/components/report/PlacePickerMap";
import { usePlaceSearch } from "@/components/report/use-place-search";
import { LANDMARKS, isInsideCity, wardAt } from "@/lib/city";
import { describePlace } from "@/lib/place-name";

export type { MapPin };

const PlacePickerMap = dynamic(() => import("@/components/report/PlacePickerMap"), {
  ssr: false,
  loading: () => <div className="rb-place-canvas" aria-hidden="true" />,
});

const PinMap = dynamic(() => import("@/components/report/PinMap"), {
  ssr: false,
  loading: () => <div className="rb-place-canvas" aria-hidden="true" />,
});

const GEO_ERROR = "Could not read your location. Search for the area instead.";

/**
 * Where is it? A full-width map with the pin fixed in the middle: search or
 * use your location to get close, then move the map until the pin sits on the
 * spot. The card under the map says where the pin is; the footer confirms it.
 */
export function LocationStep({
  value,
  onChange,
  error,
  mapMode = "picker",
}: {
  value: MapPin | null;
  onChange: (pin: MapPin | null) => void;
  error: string | null;
  mapMode?: "picker" | "pin";
}) {
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<FlyTarget | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [picked, setPicked] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const locateGen = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);
  const { rows: matches, loading } = usePlaceSearch(query);
  const ward = value ? wardAt(value.lat, value.lng) : null;
  // The searched place's name stays on the card until the pin moves off it (~40 m).
  const near =
    picked && value && Math.abs(picked.lat - value.lat) < 0.0004 && Math.abs(picked.lng - value.lng) < 0.0004;

  useEffect(() => () => void (locateGen.current += 1), []);

  function flyTo(pin: MapPin, fromGps = false) {
    locateGen.current += 1;
    setLocating(false);
    setGeoError(null);
    if (!fromGps) setAccuracy(null);
    seq.current += 1;
    setTarget({ ...pin, seq: seq.current });
  }

  function useMyLocation() {
    const generation = locateGen.current + 1;
    locateGen.current = generation;
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError(GEO_ERROR);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (generation !== locateGen.current) return;
        setLocating(false);
        const { latitude: lat, longitude: lng, accuracy: metres } = position.coords;
        if (!isInsideCity(lat, lng)) {
          setGeoError("You seem to be outside Mumbai's wards. Search for the area instead.");
          return;
        }
        setAccuracy(Math.round(metres));
        flyTo({ lat, lng }, true);
      },
      () => {
        if (generation !== locateGen.current) return;
        setLocating(false);
        setGeoError(GEO_ERROR);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  const problem = geoError ?? error;

  return (
    <div>
      <h2 id="report-step-heading" tabIndex={-1} className="rb-step-heading rb-q">
        Where is it?
      </h2>
      <p className="ux4g-body-m-default ux4g-text-neutral-secondary ux4g-mt-xs rb-measure">
        Move the map so the pin sits on the exact spot.
      </p>

      <div className="rb-place">
        {mapMode === "pin" ? (
          <PinMap value={value} onChange={onChange} />
        ) : (
          <PlacePickerMap initial={value} target={target} onCenter={onChange} />
        )}

        <div className="rb-place-top">
          <div className="rb-search">
            <SearchIcon className="rb-search-icon" />
            <input
              ref={searchRef}
              id="place-search"
              type="search"
              autoComplete="off"
              aria-label="Search for a building, road, area or station"
              placeholder="Search a building, road or area"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? (
              <button type="button" className="rb-search-clear" aria-label="Clear search" onClick={() => setQuery("")}>
                <CloseIcon size={18} />
              </button>
            ) : null}
          </div>
          {matches.length ? (
            <ul className="ux4g-list ux4g-list-default ux4g-list-m rb-search-results" aria-label="Matching places">
              {matches.map((row) => (
                <li key={row.id} className="ux4g-list-item">
                  <button
                    type="button"
                    className="ux4g-list-item-row touch-target"
                    onClick={() => {
                      flyTo({ lat: row.lat, lng: row.lng });
                      setPicked(row);
                      setQuery("");
                    }}
                  >
                    <span className="rb-result">
                      <PinIcon size={16} />
                      <span className="min-w-0">
                        <span className="rb-result-name">{row.name}</span>
                        <span className="rb-result-detail">{row.detail}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim() ? (
            <p className="rb-search-results rb-search-empty ux4g-body-s-default" aria-live="polite">
              {loading ? "Searching…" : "Nothing by that name. Try a nearby landmark, road or station."}
            </p>
          ) : (
            <div className="rb-place-chips" aria-label="Common monsoon trouble spots">
              {LANDMARKS.map((landmark) => (
                <button
                  key={landmark.id}
                  type="button"
                  className="rb-chip touch-target"
                  onClick={() => flyTo({ lat: landmark.lat, lng: landmark.lng })}
                >
                  {landmark.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rb-place-pin" aria-hidden="true">
          <span className="rb-place-tip">
            {value ? (
              <>
                <strong>Your report goes here</strong>
                <span>Move the map to the exact spot</span>
              </>
            ) : (
              <strong>Zoom in to place the pin</strong>
            )}
          </span>
          <PinIcon />
        </div>

        <button
          id="use-location"
          type="button"
          className="rb-place-locate touch-target"
          aria-label={locating ? "Finding your location" : "Use my location"}
          aria-busy={locating || undefined}
          disabled={locating}
          onClick={useMyLocation}
        >
          <LocateIcon size={22} />
        </button>

        <div className="rb-place-card" aria-live="polite">
          {value ? (
            <>
              <div className="rb-place-card-row">
                <div className="min-w-0">
                  <p className="ux4g-body-s-default ux4g-text-neutral-secondary">Reporting this spot</p>
                  <p className="ux4g-body-m-strong">
                    {near && picked ? `${picked.name}${ward ? `, ${ward} ward` : ""}` : describePlace(value.lat, value.lng)}
                  </p>
                  {!ward ? (
                    <p className="ux4g-body-s-default ux4g-text-error-default">Outside the ward map</p>
                  ) : accuracy != null ? (
                    <p className="ux4g-body-s-default ux4g-text-neutral-secondary">Your phone is within about {accuracy} m</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary touch-target"
                  onClick={() => searchRef.current?.focus()}
                >
                  Change
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="ux4g-body-m-strong">No spot picked yet</p>
              <p className="ux4g-body-s-default ux4g-text-neutral-secondary">
                Search for the area, tap a spot above, or use your location.
              </p>
              <button type="button" className="ux4g-btn ux4g-btn-m ux4g-btn-text-primary touch-target rb-btn-icon rb-place-gps" onClick={useMyLocation} disabled={locating}>
                <LocateIcon />
                {locating ? "Finding you…" : "Use my location"}
              </button>
            </>
          )}
          {problem ? (
            <p className="ux4g-body-s-strong ux4g-text-error-default ux4g-mt-xs" role="alert">
              {problem}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default LocationStep;
