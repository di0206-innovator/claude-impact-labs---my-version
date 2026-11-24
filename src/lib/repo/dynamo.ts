import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { MATCH_METERS, metersBetween } from "@/lib/geo";
import { nid } from "@/lib/id";
import { isInsideCity } from "@/lib/city";
import { getDocClient, getTableName } from "@/lib/repo/dynamo-client";
import {
  getConsistent, putItem, putSeedMarkerVersion,
  reportEditRejected, transactWrite,
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
import { resolvePlace, type PlaceContext } from "@/lib/repo/place-resolve";
import {
  moveToPlaceFor, putExistingLocationReport, writeReportEdit,
} from "@/lib/repo/dynamo-edit";
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
    if (!place.created || !report) {
      return putExistingLocationReport(
        this.client,
        this.table,
        input,
        place.location,
        (locId) => this.listReportsForLocation(locId),
      );
    }
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
      isSample: input.photo === undefined ? current.isSample : SAMPLE_PHOTO_PATTERN.test(input.photo),
    };
    if (next.issueType !== current.issueType) {
      const settled = await moveToPlaceFor(this.placeContext, next, input.photo);
      if (settled !== "join") return settled;
    }
    guardItemSize(toReportItem(next));
    try {
      await writeReportEdit(this.client, this.table, next, input.photo);
    } catch (error) {
      if (reportEditRejected(error)) return null;
      throw error;
    }
    return next;
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
