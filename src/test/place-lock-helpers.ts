import { TransactionCanceledException } from "@aws-sdk/client-dynamodb";
import type { CreateReportInput } from "@/lib/types";
import { sampleJpegDataUrl } from "./sample-jpeg";

export function input(partial: Partial<CreateReportInput> = {}): CreateReportInput {
  return {
    issueType: "pothole",
    lat: 18.9298,
    lng: 72.8328,
    photo: sampleJpegDataUrl(),
    noticedAt: "2026-09-01",
    recurs: false,
    description: null,
    ...partial,
  };
}

export const WINNER_LOCATION = {
  pk: "LOC#loc_winner",
  sk: "META",
  type: "location",
  id: "loc_winner",
  name: "Pothole near Hindmata",
  slug: "hindmata-pothole",
  issueType: "pothole",
  lat: 18.9298,
  lng: 72.8328,
  street: "Hindmata",
  ward: "A Ward",
  createdAt: "2026-09-01T00:00:00.000Z",
};

/** A place-creating transact. The later report write is a transact too, and must not be treated as a second place. */
export function placeCreate(input: Record<string, unknown>): boolean {
  const items = input.TransactItems as { Put?: { Item?: { type?: string } } }[] | undefined;
  return Array.isArray(items) && items.some((entry) => entry.Put?.Item?.type === "location");
}

/** A lost race: DynamoDB reports a failed condition on one of the Put items. */
export function cancelled() {
  return new TransactionCanceledException({
    message: "transaction cancelled",
    $metadata: {},
    CancellationReasons: [{ Code: "ConditionalCheckFailed" }],
  });
}

/** A real fault, not a race. Must surface rather than retry as a collision. */
export function throttled() {
  return new TransactionCanceledException({
    message: "transaction cancelled",
    $metadata: {},
    CancellationReasons: [{ Code: "ThrottlingError" }],
  });
}
