import { neighbourClusterKeys, nearestMatching } from "@/lib/geo";
import { nid, slugify } from "@/lib/id";
import { assertItemSize } from "@/lib/item-size";
import { clusterKey, isInsideCity, wardAt } from "@/lib/city";
import { namePlace, nearestRoad, repairStoredPlace } from "@/lib/place-name";
import { MAX_ENCODED_PHOTO_BYTES, SAMPLE_PHOTO_PATTERN } from "@/lib/photo-limits";
import { assertPhotoString, dataUrlByteLength } from "@/lib/photo-validate";
import { ItemTooLargeError, ReportValidationError } from "@/lib/repo/errors";
import { buildCitizenReport } from "@/lib/repo/mappers";
import {
  seedReportUntouched,
  toListItem,
  type RastabaazRepository,
  type SeedItem,
  type VerificationInput,
  type VerificationRecord,
} from "@/lib/repo/port";
import { getVerificationsForComplaintSync, recordVerificationSync } from "@/lib/repo/verification-store";
import { PREVIOUS_SEED_DESCRIPTIONS } from "@/lib/seed/previous-copy";
import {
  ISSUE_TYPE_LABELS,
  type CreateReportInput,
  type CreateReportResult,
  type DeskNote,
  type IssueType,
  type LocationRecord,
  type PlaceSpot,
  type ReportListItem,
  type ReportRecord,
  type SeedReport,
  type UpdateReportInput,
} from "@/lib/types";

function sortReports(reports: ReportRecord[]): ReportRecord[] {
  return [...reports].sort((a, b) => {
    if (a.noticedAt !== b.noticedAt) return a.noticedAt < b.noticedAt ? 1 : -1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return 0;
  });
}

export class MemoryRastabaazRepository implements RastabaazRepository {
  private readonly strictPhoto: boolean;
  private readonly locations = new Map<string, LocationRecord>();
  private readonly locationsBySlug = new Map<string, string>();
  private readonly locationsByCluster = new Map<string, Set<string>>();
  private readonly reports = new Map<string, ReportRecord>();
  private readonly photos = new Map<string, string>();
  private readonly notes = new Map<string, DeskNote>();
  private seedMarker: string | null = null;

  constructor(options?: { strictPhoto?: boolean }) {
    this.strictPhoto = options?.strictPhoto ?? true;
  }

  async getLocation(id: string): Promise<LocationRecord | null> {
    const location = this.locations.get(id);
    return location ? repairStoredPlace(location) : null;
  }

  async getLocationBySlug(slug: string): Promise<LocationRecord | null> {
    const id = this.locationsBySlug.get(slug);
    return id ? this.getLocation(id) : null;
  }

  async findNearbyLocation(lat: number, lng: number, issueType: IssueType): Promise<LocationRecord | null> {
    const seen = new Set<string>();
    const candidates: LocationRecord[] = [];
    for (const key of neighbourClusterKeys(lat, lng)) {
      const ids = this.locationsByCluster.get(key);
      if (!ids) continue;
      for (const id of ids) {
        if (seen.has(id)) continue;
        seen.add(id);
        const location = this.locations.get(id);
        if (location) candidates.push(repairStoredPlace(location));
      }
    }
    return nearestMatching(candidates, lat, lng, issueType);
  }

  async getReport(id: string): Promise<ReportRecord | null> {
    return this.reports.get(id) ?? null;
  }

  async getReportPhoto(id: string): Promise<string | null> {
    return this.photos.get(id) ?? null;
  }

  async listReportsForLocation(locationId: string): Promise<ReportListItem[]> {
    const rows = [...this.reports.values()].filter((report) => report.locationId === locationId);
    return sortReports(rows).map(toListItem);
  }

  async loadCatalog() {
    return {
      locations: [...this.locations.values()].map(repairStoredPlace),
      reports: sortReports([...this.reports.values()]).map(toListItem),
      notes: [...this.notes.values()],
    };
  }

  async createReport(input: CreateReportInput): Promise<CreateReportResult> {
    if (!isInsideCity(input.lat, input.lng)) {
      throw new ReportValidationError("Place the pin inside a BMC ward in Mumbai.");
    }
    this.assertWritePhoto(input.photo, { allowSample: false });
    const existing = await this.findNearbyLocation(input.lat, input.lng, input.issueType);
    const location = existing ?? this.buildLocation(input);
    const report = this.buildReport(input, location.id);
    this.assertWriteItem(report);
    this.assertWriteItem({ photo: input.photo });
    if (!existing) this.indexLocation(location);
    this.reports.set(report.id, report);
    this.photos.set(report.id, input.photo);
    const connectedCount = [...this.reports.values()].filter(
      (row) => row.locationId === location.id && row.id !== report.id,
    ).length;
    return { report, location, connectedCount };
  }

  async updateReport(input: UpdateReportInput): Promise<ReportRecord | null> {
    const current = this.reports.get(input.id);
    if (!current) return null;
    if (input.photo !== undefined) {
      this.assertWritePhoto(input.photo, { allowSample: true });
      this.assertWriteItem({ photo: input.photo });
    }
    const next: ReportRecord = {
      ...current,
      issueType: input.issueType ?? current.issueType,
      description: input.description === undefined ? current.description : input.description,
      recurs: input.recurs ?? current.recurs,
      // A seeded report shows an illustration until the desk gives it a real
      // photo; from then on its image is a photo and must not be captioned as one.
      isSample: input.photo === undefined ? current.isSample : SAMPLE_PHOTO_PATTERN.test(input.photo),
    };
    // Changing the problem moves the report to the place for the new one.
    if (next.issueType !== current.issueType) {
      const spot = { lat: next.lat, lng: next.lng, issueType: next.issueType };
      const existing = await this.findNearbyLocation(spot.lat, spot.lng, spot.issueType);
      const location = existing ?? this.buildLocation(spot);
      if (!existing) this.indexLocation(location);
      next.locationId = location.id;
    }
    this.assertWriteItem(next);
    this.reports.set(next.id, next);
    if (input.photo !== undefined) this.photos.set(next.id, input.photo);
    return next;
  }

  async addDeskNote(reportId: string, body: string): Promise<DeskNote> {
    const note: DeskNote = { id: nid("upd"), reportId, body, createdAt: new Date().toISOString() };
    this.assertWriteItem(note);
    this.notes.set(note.id, note);
    return note;
  }

  async addVerification(input: VerificationInput): Promise<VerificationRecord> {
    return recordVerificationSync(input);
  }

  async getVerificationsForComplaint(complaintId: string): Promise<VerificationRecord[]> {
    return getVerificationsForComplaintSync(complaintId);
  }

  async getSeedMarker(): Promise<string | null> {
    return this.seedMarker;
  }

  putSeedMarkerSync(version: string): boolean {
    if (this.seedMarker === version) return false;
    this.seedMarker = version;
    return true;
  }

  async putSeedMarker(version: string): Promise<boolean> {
    return this.putSeedMarkerSync(version);
  }

  putSeedItemsSync(items: SeedItem[]): void {
    for (const item of items) {
      if (item.entity === "retire_report") {
        const held = this.reports.get(item.record.id);
        const annotated = [...this.notes.values()].some((note) => note.reportId === item.record.id);
        const { photo, ...seeded } = item.record;
        const samePhoto = this.photos.get(item.record.id) === photo;
        if (held && !annotated && samePhoto && seedReportUntouched(held, seeded)) {
          this.reports.delete(held.id);
          this.photos.delete(held.id);
        }
        continue;
      }
      if (item.entity === "location") {
        const held = this.locations.get(item.record.id);
        if (held && !held.issueType) {
          held.issueType = item.record.issueType;
          continue;
        }
        if (held) continue;
        this.indexLocation(item.record);
        continue;
      }
      // An existing report keeps the photo the desk stored. Description and the
      // illustration flag are repaired only while they still match the previous seed.
      if (this.reports.has(item.record.id)) {
        this.repairHeldSeedReport(item.record);
        continue;
      }
      const { photo, ...record } = item.record;
      this.reports.set(record.id, record);
      this.photos.set(record.id, photo);
    }
  }

  async putSeedItems(items: SeedItem[]): Promise<void> {
    this.putSeedItemsSync(items);
  }

  private repairHeldSeedReport(record: SeedReport): void {
    const held = this.reports.get(record.id);
    if (!held) return;
    const previous = PREVIOUS_SEED_DESCRIPTIONS[record.id];
    if (previous !== undefined && held.description === previous) held.description = record.description;
    if (!held.isSample) return;
    const photo = this.photos.get(record.id);
    if (typeof photo === "string" && !SAMPLE_PHOTO_PATTERN.test(photo)) held.isSample = false;
  }

  private assertWritePhoto(photo: string, options: { allowSample: boolean }): void {
    if (!this.strictPhoto) return;
    if (dataUrlByteLength(photo) > MAX_ENCODED_PHOTO_BYTES) {
      throw new ReportValidationError("Photo is over 250 KB.");
    }
    assertPhotoString(photo, options);
  }

  private assertWriteItem(item: object): void {
    if (!this.strictPhoto) return;
    try {
      assertItemSize({ ...item });
    } catch {
      throw new ItemTooLargeError("This record is too large to store.");
    }
  }

  private uniqueSlug(base: string): string {
    const root = slugify(base) || "mumbai-road";
    if (!this.locationsBySlug.has(root)) return root;
    return `${root}-${nid("x").slice(-8)}`;
  }

  private buildLocation(input: PlaceSpot): LocationRecord {
    const named = namePlace(input.issueType, input.lat, input.lng);
    const issue = ISSUE_TYPE_LABELS[input.issueType];
    return {
      id: nid("loc"),
      name: named.name,
      slug: this.uniqueSlug(`${named.street} ${issue}`),
      issueType: input.issueType,
      lat: input.lat,
      lng: input.lng,
      street: named.street,
      ward: wardAt(input.lat, input.lng) ?? "",
      roadId: nearestRoad(input.lat, input.lng)?.id ?? null,
      createdAt: new Date().toISOString(),
    };
  }

  private indexLocation(location: LocationRecord): void {
    this.locations.set(location.id, location);
    this.locationsBySlug.set(location.slug, location.id);
    const key = clusterKey(location.lat, location.lng);
    const bucket = this.locationsByCluster.get(key) ?? new Set<string>();
    bucket.add(location.id);
    this.locationsByCluster.set(key, bucket);
  }

  private buildReport(input: CreateReportInput, locationId: string): ReportRecord {
    return buildCitizenReport(input, locationId);
  }
}
