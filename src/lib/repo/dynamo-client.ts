import "server-only";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export function getTableName(): string {
  const name = process.env.RASTABAAZ_TABLE_NAME?.trim();
  if (!name) throw new Error("RASTABAAZ_TABLE_NAME is not set.");
  return name;
}

export function getDocClient(): DynamoDBDocumentClient {
  const endpoint = process.env.DYNAMODB_ENDPOINT;
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION ?? "ap-south-1",
    ...(endpoint ? { endpoint } : {}),
  });
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
}
