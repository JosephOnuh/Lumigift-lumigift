export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

/**
 * Upload a file to Cloudinary using a server-generated signature.
 * The API secret never leaves the server.
 */
export async function uploadGiftMedia(file: File): Promise<CloudinaryUploadResult> {
  const sigRes = await fetch("/api/uploads/sign", { method: "POST" });
  if (!sigRes.ok) throw new Error("Failed to get upload signature");

  const { signature, timestamp, folder, apiKey, cloudName } = await sigRes.json();

  const form = new FormData();
  form.append("file", file);
  form.append("signature", signature);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("api_key", apiKey);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: form }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Cloudinary upload failed");
  }

  const data = await uploadRes.json();
  return { secure_url: data.secure_url, public_id: data.public_id };
}
