type Bucket = { count: number; resetAt: number };

const MAX_BUCKETS = 4096;
const buckets = new Map<string, Bucket>();

function dropExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function dropEarliestReset(): void {
  let oldestKey: string | undefined;
  let oldestReset = Infinity;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < oldestReset) {
      oldestReset = bucket.resetAt;
      oldestKey = key;
    }
  }
  if (oldestKey !== undefined) buckets.delete(oldestKey);
}

export function allowRequest(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): boolean {
  dropExpired(now);
  const bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= MAX_BUCKETS) dropEarliestReset();
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/**
 * Distributed atomic counter rate limiter using DynamoDB TTL when configured,
 * falling back to process-local memory in local dev or on failure.
 */
export async function allowRequestDistributed(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): Promise<boolean> {
  const tableName = process.env.RASTABAAZ_TABLE_NAME;
  if (!tableName) {
    return allowRequest(key, limit, windowMs, now);
  }

  try {
    const { UpdateCommand } = await import("@aws-sdk/lib-dynamodb");
    const { getDocClient } = await import("@/lib/repo/dynamo-client");

    const windowStart = Math.floor(now / windowMs) * windowMs;
    const expiresAt = Math.floor((windowStart + windowMs * 2) / 1000);
    const client = getDocClient();

    const result = await client.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          pk: `RATELIMIT#${key}`,
          sk: `WINDOW#${windowStart}`,
        },
        UpdateExpression: "SET #ttl = if_not_exists(#ttl, :exp) ADD #cnt :one",
        ExpressionAttributeNames: {
          "#cnt": "count",
          "#ttl": "expiresAt",
        },
        ExpressionAttributeValues: {
          ":one": 1,
          ":exp": expiresAt,
        },
        ReturnValues: "UPDATED_NEW",
      }),
    );

    const count = Number(result.Attributes?.count ?? 1);
    return count <= limit;
  } catch (err) {
    console.warn("Distributed rate limit fallback to in-memory:", err);
    return allowRequest(key, limit, windowMs, now);
  }
}

export function resetRateLimits(): void {
  buckets.clear();
}
