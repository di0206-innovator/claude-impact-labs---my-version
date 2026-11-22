import type { LatLng } from "../rupee/types";

/**
 * Distance in metres from a point to a line segment, using a local flat-Earth projection.
 */
export function distToSegment(lat: number, lng: number, a: LatLng, b: LatLng): number {
  const refLat = (a.lat + b.lat) / 2;
  const refLng = (a.lng + b.lng) / 2;
  const mx = 111_320 * Math.cos((refLat * Math.PI) / 180);
  const my = 110_540;
  const ax = (a.lng - refLng) * mx;
  const ay = (a.lat - refLat) * my;
  const bx = (b.lng - refLng) * mx;
  const by = (b.lat - refLat) * my;
  const px = (lng - refLng) * mx;
  const py = (lat - refLat) * my;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
