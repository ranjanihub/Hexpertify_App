"use server";
import { v2 as cloudinary } from "cloudinary";

[
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
].forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

type CloudinaryUploadResult = { secure_url: string; public_id: string };
type DeleteResult = { success: boolean; message: string; status: number };

export const uploadToCloudinary = async (
  base64: string,
  folder = "uploads",
): Promise<CloudinaryUploadResult> => {
  try {
    const mimeTypeMatch = base64.match(/^data:(.+);base64,/);
    if (!mimeTypeMatch) throw new Error("Invalid base64 string.");

    const mimeType = mimeTypeMatch[1];
    const buffer = Buffer.from(base64.split(",")[1], "base64");

    const allowed: Record<string, string[]> = {
      image: [
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp",
        "image/svg+xml",
      ],
      video: ["video/mp4", "video/webm", "video/mov", "video/avi", "video/ogg"],
      audio: ["audio/mpeg", "audio/wav", "audio/ogg"],
      raw: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "text/csv",
      ],
    };

    let resourceType: "image" | "video" | "raw" = "raw";
    for (const [type, list] of Object.entries(allowed)) {
      if (list.includes(mimeType)) {
        resourceType = type as "image" | "video" | "raw";
        break;
      }
    }

    const result = await new Promise<CloudinaryUploadResult>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { resource_type: resourceType, folder },
            (error, result) => {
              if (error) reject(error);
              else resolve(result as CloudinaryUploadResult);
            },
          )
          .end(buffer);
      },
    );

    return result;
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    throw new Error("File upload failed. Please try again later.");
  }
};

export const deleteFromCloudinary = async (
  publicId: string,
): Promise<DeleteResult> => {
  try {
    if (!publicId) throw new Error("Invalid publicId.");

    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === "not found") {
      return {
        success: false,
        message: `File not found: ${publicId}`,
        status: 404,
      };
    }
    if (result.result !== "ok") {
      throw new Error(`Cloudinary delete failed: ${result.result}`);
    }
    return { success: true, message: `Deleted: ${publicId}`, status: 200 };
  } catch (err) {
    console.error("Cloudinary delete error:", err);
    throw new Error("Failed to delete file from Cloudinary.");
  }
};

export async function extractPublicId(url: string): Promise<string> {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/);
  return match ? match[1] : "";
}

export async function isCloudinaryUrl(url: string): Promise<boolean> {
  return url?.includes("res.cloudinary.com") ?? false;
}
