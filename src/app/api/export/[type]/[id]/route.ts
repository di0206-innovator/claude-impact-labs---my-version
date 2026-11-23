import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { exportEvidencePack, type EvidencePackType, type ExportFormat } from "@/lib/assistant/export";

type RouteProps = {
  params: Promise<{
    type: string;
    id: string;
  }>;
};

const VALID_TYPES = new Set<EvidencePackType>(["road", "contractor", "ward"]);

const ExportParamsSchema = z.object({
  type: z.enum(["road", "contractor", "ward"]),
  id: z.string().min(1).max(64).regex(/^[A-Za-z0-9_/ -]+$/),
});

export async function GET(request: NextRequest, { params }: RouteProps): Promise<NextResponse> {
  const { type, id } = await params;
  let decodedId: string;
  try {
    decodedId = decodeURIComponent(id);
  } catch {
    return NextResponse.json(
      { error: "Invalid URI encoding in export ID." },
      { status: 400 },
    );
  }

  if (!VALID_TYPES.has(type as EvidencePackType)) {
    return NextResponse.json(
      { error: `Invalid export type "${type}". Valid types: road, contractor, ward.` },
      { status: 400 },
    );
  }

  const parsed = ExportParamsSchema.safeParse({ type, id: decodedId });
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Invalid export parameters: ${parsed.error.issues.map((i) => i.message).join(", ")}` },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const allowedQueryKeys = new Set(["format"]);
  const extraKeys = Array.from(url.searchParams.keys()).filter((k) => !allowedQueryKeys.has(k));

  if (extraKeys.length > 0) {
    const cleanUrl = new URL(url.pathname, url.origin);
    const rawFormat = (url.searchParams.get("format") ?? "csv").toLowerCase();
    if (rawFormat === "pdf") {
      cleanUrl.searchParams.set("format", "pdf");
    }
    return NextResponse.redirect(cleanUrl, 308);
  }

  const rawFormat = (url.searchParams.get("format") ?? "csv").toLowerCase();
  const format: ExportFormat = rawFormat === "pdf" ? "pdf" : "csv";

  try {
    const result = await exportEvidencePack(type as EvidencePackType, decodedId, format);
    if (!result) {
      return NextResponse.json(
        { error: `No records found for ${type} "${decodedId}".` },
        { status: 404 },
      );
    }

    const body =
      typeof result.data === "string" ? result.data : Buffer.from(result.data);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "public, max-age=60, s-maxage=300",
      },
    });
  } catch (err) {
    console.error(`Export failed for ${type}/${decodedId}:`, err);
    return NextResponse.json(
      { error: "Internal error generating evidence pack export." },
      { status: 500 },
    );
  }
}
