import { utf8Bytes } from "@/lib/item-size";
import {
  COMPRESS_FALLBACK_EDGE,
  COMPRESS_MAX_EDGE,
  COMPRESS_QUALITIES,
  MAX_ENCODED_PHOTO_BYTES,
} from "@/lib/photo-limits";

const PHOTO_KIND_ERROR = "Use a JPEG, PNG, or WebP photo.";
const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export type RasterEncode = (width: number, height: number, quality: number) => Promise<string>;

export function fitWithinEdge(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= maxEdge) return { width, height };
  const scale = maxEdge / long;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function encodeWithinLimit(
  encode: RasterEncode,
  width: number,
  height: number,
): Promise<string> {
  for (const edge of [COMPRESS_MAX_EDGE, COMPRESS_FALLBACK_EDGE]) {
    const size = fitWithinEdge(width, height, edge);
    for (const quality of COMPRESS_QUALITIES) {
      const dataUrl = await encode(size.width, size.height, quality);
      if (utf8Bytes(dataUrl) <= MAX_ENCODED_PHOTO_BYTES) return dataUrl;
    }
  }
  throw new Error("Photo is over 250 KB after compression.");
}

export async function compressImageFile(file: File): Promise<string> {
  if (file.size <= 0 || (file.type && !IMAGE_TYPES.has(file.type))) {
    throw new Error(PHOTO_KIND_ERROR);
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(PHOTO_KIND_ERROR);
  }
  try {
    const encode: RasterEncode = async (width, height, quality) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error(PHOTO_KIND_ERROR);
      ctx.drawImage(bitmap, 0, 0, width, height);
      try {
        const webp = canvas.toDataURL("image/webp", quality);
        if (webp.startsWith("data:image/webp")) return webp;
      } catch {
        // Fall back to JPEG if WebP encoding fails or throws
      }
      return canvas.toDataURL("image/jpeg", quality);
    };
    return await encodeWithinLimit(encode, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}
