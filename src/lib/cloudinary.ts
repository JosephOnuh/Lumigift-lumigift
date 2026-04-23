export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

/**
 * Upload a file to Cloudinary via the server-side route.
 * Validation (size + MIME type) is enforced on the server before the upload
 * reaches Cloudinary. The API secret never leaves the server.
 */
export async function uploadGiftMedia(file: File): Promise<CloudinaryUploadResult> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/uploads", { method: "POST", body: form });
  const body = await res.json();

  if (!res.ok || !body.success) {
    throw new Error(body.error ?? "Upload failed");
  }

  return body.data as CloudinaryUploadResult;
}
