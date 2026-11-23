import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { clientIp } from "@/lib/client-ip";
import { allowRequestDistributed } from "@/lib/rate-limit";
import { nid } from "@/lib/id";

const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
};

const PRESIGN_LIMIT = 60;
const PRESIGN_WINDOW_MS = 60 * 60 * 1000;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function signS3PutUrl(
  bucket: string,
  key: string,
  region: string,
  expiresIn = 300,
): string {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;

  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const canonicalUri = `/${encodeURIComponent(key).replace(/%2F/g, "/")}`;

  if (!accessKeyId || !secretAccessKey) {
    return `https://${host}${canonicalUri}?mock-presigned=true&expiresIn=${expiresIn}`;
  }

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;

  const queryParams: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": "host",
  };
  if (sessionToken) queryParams["X-Amz-Security-Token"] = sessionToken;

  const canonicalQueryString = Object.keys(queryParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join("&");

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  const kDate = crypto.createHmac("sha256", `AWS4${secretAccessKey}`).update(dateStamp).digest();
  const kRegion = crypto.createHmac("sha256", kDate).update(region).digest();
  const kService = crypto.createHmac("sha256", kRegion).update("s3").digest();
  const kSigning = crypto.createHmac("sha256", kService).update("aws4_request").digest();
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = (await clientIp()) ?? "unknown";
  const allowed = await allowRequestDistributed(`presign:${ip}`, PRESIGN_LIMIT, PRESIGN_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many upload requests. Try again later." },
      { status: 429 },
    );
  }

  let body: { contentType?: string; size?: number };
  try {
    body = (await request.json()) as { contentType?: string; size?: number };
  } catch {
    body = {};
  }

  const contentType = body.contentType ?? "image/webp";
  const ext = ALLOWED_CONTENT_TYPES[contentType.toLowerCase()];
  if (!ext) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid photo content type. Accepted types: image/webp, image/jpeg, image/png.",
      },
      { status: 400 },
    );
  }

  if (body.size !== undefined && (typeof body.size !== "number" || body.size > MAX_FILE_SIZE_BYTES)) {
    return NextResponse.json(
      { ok: false, error: `File size exceeds the limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.` },
      { status: 400 },
    );
  }

  const bucket =
    process.env.REPORTS_BUCKET_NAME ||
    process.env.RASTABAAZ_PHOTO_BUCKET ||
    "rastabaaz-reports-photos";
  const region = process.env.AWS_REGION || "ap-south-1";
  const key = `reports/${nid("photo")}.${ext}`;
  const expiresIn = 300;

  const uploadUrl = signS3PutUrl(bucket, key, region, expiresIn);

  return NextResponse.json({
    ok: true,
    key,
    uploadUrl,
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    expiresIn,
  });
}
