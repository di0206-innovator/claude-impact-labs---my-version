import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { photoUpdateOp, reportEditOp, transactWrite } from "@/lib/repo/dynamo-write";
import { buildCitizenReport, guardItemSize, toPhotoItem, toReportItem } from "@/lib/repo/mappers";
import { ExtraRejectedError, resolvePlace, type PlaceContext } from "@/lib/repo/place-resolve";
import type { CreateReportInput, CreateReportResult, LocationRecord, ReportRecord } from "@/lib/types";

/** The report edit, and a photo replacement when there is one, in one write. */
export async function writeReportEdit(
  client: DynamoDBDocumentClient,
  table: string,
  next: ReportRecord,
  photo?: string,
): Promise<void> {
  const edit = reportEditOp(next);
  if (photo === undefined) {
    await client.send(
      new UpdateCommand({
        TableName: table,
        Key: edit.update.key,
        UpdateExpression: edit.update.set,
        ExpressionAttributeValues: edit.update.values,
        ConditionExpression: edit.update.condition,
      }),
    );
    return;
  }
  await transactWrite(client, table, [edit, photoUpdateOp(next.id, photo)]);
}

/**
 * Points `next` at the place for its new problem.
 *
 * A place that has to be created carries the report's move inside its own
 * transact, so a failed move cannot leave a place behind with no report in
 * it. Returns `"join"` when the destination already existed and the caller
 * still owes the report its write.
 */
export async function moveToPlaceFor(
  placeContext: PlaceContext,
  next: ReportRecord,
  photo?: string,
): Promise<ReportRecord | null | "join"> {
  guardItemSize(toReportItem({ ...next, locationId: "loc_size_check" }));
  try {
    const place = await resolvePlace(placeContext, next, (locationId) => {
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

export async function putExistingLocationReport(
  client: DynamoDBDocumentClient,
  table: string,
  input: CreateReportInput,
  location: LocationRecord,
  listSiblingReports: (locationId: string) => Promise<{ id: string }[]>,
): Promise<CreateReportResult> {
  const report = buildCitizenReport(input, location.id);
  const meta = toReportItem(report);
  const photo = toPhotoItem(report.id, input.photo);
  guardItemSize(meta);
  guardItemSize(photo);
  await transactWrite(client, table, [{ put: meta }, { put: photo }]);
  let connectedCount = 0;
  try {
    const siblings = await listSiblingReports(location.id);
    connectedCount = siblings.filter((row) => row.id !== report.id).length;
  } catch {
    connectedCount = 0;
  }
  return { report, location, connectedCount };
}
