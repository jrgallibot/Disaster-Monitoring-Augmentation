import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";
import {
  PHOTO_BUCKET,
  fileToUploadBody,
  photoExtensionForMime,
  validatePhotoFile,
} from "@/lib/photo-upload";

export async function uploadToEmployeePhotoBucket(
  userId: string,
  file: File,
  objectName: string,
  options?: { upsert?: boolean }
): Promise<ActionResult & { url?: string }> {
  const validation = validatePhotoFile(file);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const mimeType = validation.mimeType!;
  const ext = photoExtensionForMime(mimeType);
  const path = `${userId}/${objectName}.${ext}`;
  const body = await fileToUploadBody(file);

  const authClient = await createClient();
  const authUpload = await authClient.storage
    .from(PHOTO_BUCKET)
    .upload(path, body, {
      upsert: options?.upsert ?? true,
      contentType: mimeType,
    });

  if (!authUpload.error) {
    const { data } = authClient.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    return { success: true, url: data.publicUrl };
  }

  try {
    const service = createServiceClient();
    const serviceUpload = await service.storage
      .from(PHOTO_BUCKET)
      .upload(path, body, {
        upsert: options?.upsert ?? true,
        contentType: mimeType,
      });

    if (serviceUpload.error) {
      return { success: false, error: formatStorageError(serviceUpload.error.message) };
    }

    const { data } = service.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    return { success: true, url: data.publicUrl };
  } catch (err) {
    return {
      success: false,
      error: formatStorageError(
        err instanceof Error ? err.message : authUpload.error.message
      ),
    };
  }
}

function formatStorageError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("bucket") && lower.includes("not found")) {
    return "Photo storage is not set up. Run migration 006 in Supabase SQL Editor.";
  }
  if (lower.includes("payload too large") || lower.includes("maximum allowed size")) {
    return "Photo is too large. Please use an image under 5MB.";
  }
  return message;
}
