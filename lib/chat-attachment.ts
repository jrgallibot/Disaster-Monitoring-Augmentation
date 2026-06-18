import type { ActionResult } from "@/lib/types";

export const CHAT_ATTACHMENT_BUCKET = "chat-attachments";
export const MAX_CHAT_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

const ALLOWED_MIME_TYPES = new Set(Object.values(MIME_BY_EXT));

export function resolveChatAttachmentMimeType(file: File): string | null {
  const normalizedType = file.type?.toLowerCase().trim();
  if (normalizedType && ALLOWED_MIME_TYPES.has(normalizedType)) {
    return normalizedType;
  }

  const match = file.name.toLowerCase().match(/\.([a-z0-9]+)$/);
  if (!match) return null;
  return MIME_BY_EXT[match[1]] ?? null;
}

export function validateChatAttachmentFile(
  file: File | null
): ActionResult & { mimeType?: string } {
  if (!file || file.size === 0) {
    return { success: false, error: "Please select a file." };
  }

  const mimeType = resolveChatAttachmentMimeType(file);
  if (!mimeType) {
    return {
      success: false,
      error: "Attachments must be JPG, PNG, WEBP, GIF, or PDF.",
    };
  }

  if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
    return { success: false, error: "Attachment must be 10MB or smaller." };
  }

  return { success: true, mimeType };
}

export function chatAttachmentExtensionForMime(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "application/pdf") return "pdf";
  return mimeType.split("/")[1] || "bin";
}

export async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}
