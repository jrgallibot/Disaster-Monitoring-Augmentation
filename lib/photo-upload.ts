import type { ActionResult } from "@/lib/types";

export const PHOTO_BUCKET = "employee-photos";
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

const ALLOWED_MIME_TYPES = new Set(Object.values(MIME_BY_EXT));

function extensionFromName(name: string): string | null {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? null;
}

export function resolvePhotoMimeType(file: File): string | null {
  const normalizedType = file.type?.toLowerCase().trim();
  if (normalizedType && ALLOWED_MIME_TYPES.has(normalizedType)) {
    return normalizedType;
  }

  const ext = extensionFromName(file.name);
  if (!ext) return null;
  return MIME_BY_EXT[ext] ?? null;
}

export function validatePhotoFile(file: File | null): ActionResult & { mimeType?: string } {
  if (!file || file.size === 0) {
    return { success: false, error: "Please select a photo." };
  }

  const mimeType = resolvePhotoMimeType(file);
  if (!mimeType) {
    return { success: false, error: "Photo must be JPG, PNG, WEBP, or GIF." };
  }

  if (file.size > MAX_PHOTO_BYTES) {
    return { success: false, error: "Photo must be 5MB or smaller." };
  }

  return { success: true, mimeType };
}

export function getFormDataPhotoFile(formData: FormData, field = "photo"): File | null {
  const entry = formData.get(field);
  if (!(entry instanceof File) || entry.size === 0) {
    return null;
  }
  return entry;
}

export function photoExtensionForMime(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  return mimeType.split("/")[1] || "jpg";
}

export async function fileToUploadBody(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}
