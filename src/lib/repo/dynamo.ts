import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { MATCH_METERS, metersBetween } from "@/lib/geo";
import { nid } from "@/lib/id";
import { isInsideCity } from "@/lib/city";
import { getDocClient, getTableName } from "@/lib/repo/dynamo-client";
import {
  getConsistent, photoUpdateOp, putItem, putSeedMarkerVersion,
  reportEditOp, reportEditRejected, transactWrite,
} from "@/lib/repo/dynamo-write";
import { writeSeedItems } from "@/lib/repo/dynamo-seed";
import { putVerification, queryVerificationsForComplaint } from "@/lib/repo/dynamo-verification";
import { SAMPLE_PHOTO_PATTERN } from "@/lib/photo-limits";
import { ReportValidationError } from "@/lib/repo/errors";
import { readCatalogItems } from "@/lib/repo/catalog-read";
import { queryAll, scanMeta } from "@/lib/repo/dynamo-page";
import { locationPk, neighbourGeoPks, reportPk, SEED_PK, slugLockPk } from "@/lib/repo/keys";
import {
  assertWritePhoto, buildCitizenReport, byTypeQueryInput, emptyCatalog,
  fromLocationItem, fromReportItem, guardItemSize, ingestCatalogItem,
  reportListProjection, sortByNoticed, toNoteItem, toPhotoItem, toReportItem,
  type DynamoItem,
} from "@/lib/repo/mappers";
import { ExtraRejectedError, resolvePlace, type PlaceContext } from "@/lib/repo/place-resolve";
import {
  toListItem, type RastabaazRepository, type SeedItem,
  type VerificationInput, type VerificationRecord,
} from "@/lib/repo/port";
import type {
  Catalog, CreateReportInput, CreateReportResult, DeskNote,
  IssueType, LocationRecord, ReportListItem, ReportRecord, UpdateReportInput,
} from "@/lib/types";

export class DynamoRastabaazRepository implements RastabaazRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly table: string;

  constructor() {
    this.client = getDocClient();
    this.table = getTableName();
  }

  async getLocation(id: string): Promise<LocationRecord | null> {
    const item = await getConsistent(this.client, this.table, locationPk(id), "META");
    return item ? fromLocationItem(item) : null;
  }

  async getLocationBySlug(slug: string): Promise<LocationRecord | null> {
    const items = await queryAll(this.client, this.table, {
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1pk = :pk AND gsi1sk = :sk",
      ExpressionAttributeValues: { ":pk": slugLockPk(slug), ":sk": "LOC" },
    });
    if (items[0]) return fromLocationItem(items[0]);
    // gsi1 can trail a new place that byType already shows on the map. The
    // slug lock sits on the main table, so a consistent read names its place.
    const lock = await getConsistent(this.client, this.table, slugLockPk(slug), "LOCK");
    return typeof lock?.locationId === "string" ? this.getLocation(lock.locationId) : null;
  }

  async findNearbyLocation(
    lat: number,
    lng: number,
    issueType: IssueType,
  ): Promise<LocationRecord | null> {
    const matches: LocationRecord[] = [];
    const seen = new Set<string>();
    const pages = await Promise.all(
      neighbourGeoPks(lat, lng).map((gsi2pk) =>
        queryAll(this.client, this.table, {
          IndexName: "gsi2",
          KeyConditionExpression: "gsi2pk = :pk",
          ExpressionAttributeValues: { ":pk": gsi2pk },
        }),
      ),
    );
    for (const items of pages) {
      for (const item of items) {
        if (item.type !== "location") continue;
        const location = fromLocationItem(item);
        if (seen.has(location.id)) continue;
        seen.add(location.id);
        if (location.issueType !== issueType) continue;
        if (metersBetween(lat, lng, location.lat, location.lng) <= MATCH_METERS) matches.push(location);
      }
    }
    if (matches.length === 0) return null;
    return matches.sort(
      (a, b) => metersBetween(lat, lng, a.lat, a.lng) - metersBetween(lat, lng, b.lat, b.lng),
    )[0];
  }

  async getReport(id: string): Promise<ReportRecord | null> {
    const item = await getConsistent(this.client, this.table, reportPk(id), "META");
    return item ? fromReportItem(item) : null;
  }

  async listReportsForLocation(locationId: string): Promise<ReportListItem[]> {
    const items = await queryAll(this.client, this.table, {
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1pk = :pk AND begins_with(gsi1sk, :rpt)",
      ExpressionAttributeValues: { ":pk": locationPk(locationId), ":rpt": "RPT#" },
      ...reportListProjection(),
    });
    return sortByNoticed(items.map(fromReportItem)).map(toListItem);
  }

  async getReportPhoto(id: string): Promise<string | null> {
    // A report page opened the moment after submit must not 404 its image.
    const photo = await getConsistent(this.client, this.table, reportPk(id), "PHOTO");
    if (typeof photo?.photo === "string") return photo.photo;
    const meta = await getConsistent(this.client, this.table, reportPk(id), "META");
    return typeof meta?.photo === "string" ? meta.photo : null;
  }

  async loadCatalog(): Promise<Catalog> {
    const catalog = emptyCatalog();
    const items = await readCatalogItems(
      (type) => queryAll(this.client, this.table, byTypeQueryInput(type)),
      () => scanMeta(this.client, this.table),
    );
    for (const item of items) ingestCatalogItem(catalog, item);
    catalog.reports = sortByNoticed(catalog.reports);
    return catalog;
  }

  async createReport(input: CreateReportInput): Promise<CreateReportResult> {
    if (!isInsideCity(input.lat, input.lng)) {
      throw new ReportValidationError("Place the pin inside a BMC ward in Mumbai.");
    }
    assertWritePhoto(input.photo, false);
    const probe = buildCitizenReport(input, "loc_size_check");
    guardItemSize(toReportItem(probe));
    guardItemSize(toPhotoItem(probe.id, input.photo));
    let report: ReportRecord | undefined;
    const place = await resolvePlace(this.placeContext, input, (locationId) => {
      report = buildCitizenReport(input, locationId);
      return [{ put: toReportItem(report) }, { put: toPhotoItem(report.id, input.photo) }];
    });
    if (!place.created || !report) return this.putExistingLocationReport(input, place.location);
    return { report, location: place.location, connectedCount: 0 };
  }

  async updateReport(input: UpdateReportInput): Promise<ReportRecord | null> {
    const current = await this.getReport(input.id);
    if (!current) return null;
    if (input.photo !== undefined) {
      assertWritePhoto(input.photo, true);
      guardItemSize(toPhotoItem(input.id, input.photo));
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
    // A place is one problem at one spot, so changing the problem moves the
    // report to the place for the new one. Leaving it put would strand it under
    // a place named for the old problem, which no later report can join.
    if (next.issueType !== current.issueType) {
      const settled = await this.moveToPlaceFor(next, input.photo);
      // Anything but "join" is already decided: written, or nothing to write.
      if (settled !== "join") return settled;
    }
    guardItemSize(toReportItem(next));
    try {
      await this.writeReportEdit(next, input.photo);
    } catch (error) {
      if (reportEditRejected(error)) return null;
      throw error;
    }
    return next;
  }

  /** The report edit, and a photo replacement when there is one, in one write. */
  private async writeReportEdit(next: ReportRecord, photo?: string): Promise<void> {
    const edit = reportEditOp(next);
    if (photo === undefined) {
      await this.client.send(
        new UpdateCommand({
          TableName: this.table,
          Key: edit.update.key,
          UpdateExpression: edit.update.set,
          ExpressionAttributeValues: edit.update.values,
          ConditionExpression: edit.update.condition,
        }),
      );
      return;
    }
    await transactWrite(this.client, this.table, [edit, photoUpdateOp(next.id, photo)]);
  }

  /**
   * Points `next` at the place for its new problem.
   *
   * A place that has to be created carries the report's move inside its own
   * transact, so a failed move cannot leave a place behind with no report in
   * it. Returns `"join"` when the destination already existed and the caller
   * still owes the report its write.
   */
  private async moveToPlaceFor(next: ReportRecord, photo?: string): Promise<ReportRecord | null | "join"> {
    guardItemSize(toReportItem({ ...next, locationId: "loc_size_check" }));
    try {
      const place = await resolvePlace(this.placeContext, next, (locationId) => {
        next.locationId = locationId;
        const ops = [reportEditOp(next)];
        if (photo !== undefined) ops.push(photoUpdateOp(next.id, photo));
        return ops;
      });
      next.locationId = place.location.id;
      return place.created ? next : "join";
    } catch (error) {
      // The report went away between the read and the move.
      if (error instanceof ExtraRejectedError) return null;
      throw error;
    }
  }

  async addDeskNote(reportId: string, body: string): Promise<DeskNote> {
    const note: DeskNote = { id: nid("upd"), reportId, body, createdAt: new Date().toISOString() };
    guardItemSize(toNoteItem(note));
    await this.put(toNoteItem(note));
    return note;
  }

  async addVerification(input: VerificationInput): Promise<VerificationRecord> {
    return putVerification(this.client, this.table, input);
  }

  async getVerificationsForComplaint(complaintId: string): Promise<VerificationRecord[]> {
    return queryVerificationsForComplaint(this.client, this.table, complaintId);
  }

  async getSeedMarker(): Promise<string | null> {
    const item = await this.getMeta(SEED_PK);
    return item && typeof item.version === "string" ? item.version : null;
  }

  async putSeedMarker(version: string): Promise<boolean> {
    return putSeedMarkerVersion(this.client, this.table, version);
  }

  async putSeedItems(items: SeedItem[]): Promise<void> {
    await writeSeedItems(this.client, this.table, items);
  }

  private async putExistingLocationReport(input: CreateReportInput, location: LocationRecord): Promise<CreateReportResult> {
    const report = buildCitizenReport(input, location.id);
    const meta = toReportItem(report);
    const photo = toPhotoItem(report.id, input.photo);
    guardItemSize(meta);
    guardItemSize(photo);
    await transactWrite(this.client, this.table, [{ put: meta }, { put: photo }]);
    // The report is already stored. If the count read throws, reporting failure
    // makes the person retry and record a second copy.
    let connectedCount = 0;
    try {
      const siblings = await this.listReportsForLocation(location.id);
      connectedCount = siblings.filter((row) => row.id !== report.id).length;
    } catch {
      connectedCount = 0;
    }
    return { report, location, connectedCount };
  }

  private placeContext: PlaceContext = {
    findNearby: (spot) => this.findNearbyLocation(spot.lat, spot.lng, spot.issueType),
    read: (pk, sk) => getConsistent(this.client, this.table, pk, sk),
    transact: (ops) => transactWrite(this.client, this.table, ops),
  };

  private async getMeta(pk: string): Promise<DynamoItem | null> {
    return this.getItem(pk, "META");
  }

  private async getItem(pk: string, sk: string): Promise<DynamoItem | null> {
    const result = await this.client.send(new GetCommand({ TableName: this.table, Key: { pk, sk } }));
    return (result.Item as DynamoItem | undefined) ?? null;
  }

  private async put(item: DynamoItem, condition?: string): Promise<void> {
    await putItem(this.client, this.table, item, condition);
  }
}
