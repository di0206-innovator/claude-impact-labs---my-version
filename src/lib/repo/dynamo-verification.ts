import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { nid } from "@/lib/id";
import type { VerificationInput, VerificationRecord } from "@/lib/repo/port";
import { recordVerificationSync } from "@/lib/repo/verification-store";

export function toVerificationItem(record: VerificationRecord) {
  return {
    pk: `VERIF#${record.id}`,
    sk: "META",
    type: "verification",
    complaintId: record.complaintId,
    observation: record.observation,
    notes: record.notes,
    recordedAt: record.recordedAt,
    gsi1pk: `COMPLAINT#${record.complaintId}`,
    gsi1sk: `VERIF#${record.recordedAt}#${record.id}`,
  };
}

export function fromVerificationItem(item: Record<string, unknown>): VerificationRecord {
  return {
    id: String(item.id ?? (typeof item.pk === "string" ? item.pk.replace("VERIF#", "") : "")),
    complaintId: String(item.complaintId ?? ""),
    observation: String(item.observation ?? "fixed") as VerificationRecord["observation"],
    notes: item.notes == null ? null : String(item.notes),
    recordedAt: String(item.recordedAt ?? new Date().toISOString()),
  };
}

export async function putVerification(
  client: DynamoDBDocumentClient,
  table: string,
  input: VerificationInput,
): Promise<VerificationRecord> {
  const record: VerificationRecord = {
    id: nid("verif"),
    complaintId: input.complaintId.trim().toUpperCase(),
    observation: input.observation,
    notes: input.notes?.trim() || null,
    recordedAt: input.recordedAt ?? new Date().toISOString(),
  };
  // Also keep in-memory cache synchronized
  recordVerificationSync(record);

  await client.send(
    new PutCommand({
      TableName: table,
      Item: { ...toVerificationItem(record), id: record.id },
    }),
  );
  return record;
}

export async function queryVerificationsForComplaint(
  client: DynamoDBDocumentClient,
  table: string,
  complaintId: string,
): Promise<VerificationRecord[]> {
  const target = complaintId.trim().toUpperCase();
  try {
    const result = await client.send(
      new QueryCommand({
        TableName: table,
        IndexName: "gsi1",
        KeyConditionExpression: "gsi1pk = :pk AND begins_with(gsi1sk, :prefix)",
        ExpressionAttributeValues: {
          ":pk": `COMPLAINT#${target}`,
          ":prefix": "VERIF#",
        },
      }),
    );
    const items = (result.Items ?? []) as Record<string, unknown>[];
    return items.map(fromVerificationItem).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  } catch {
    return [];
  }
}
