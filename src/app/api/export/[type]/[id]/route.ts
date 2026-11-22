import { NextResponse, type NextRequest } from "next/server";
import { exportEvidencePack, type EvidencePackType, type ExportFormat } from "@/lib/assistant/export";

type RouteProps = {
  params: Promise<{
    type: string;
    id: string;
  }>;
};

const VALID_TYPES = new Set<EvidencePackType>(["road", "contractor", "ward"]);

export async function GET(request: NextRequest, { params }: RouteProps): Promise<NextResponse> {
  const { type, id } = await params;
  const decodedId = decodeURIComponent(id);

  if (!VALID_TYPES.has(type as EvidencePackType)) {
    return NextResponse.json(
      { error: `Invalid export type "${type}". Valid types: road, contractor, ward.` },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const rawFormat = (searchParams.get("format") ?? "csv").toLowerCase();
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
