"use server";

import { deleteFromCloudinary, uploadToCloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { AssetCategory } from "@prisma/client";

export async function listAssets(
  page = 1,
  limit = 10,
  search?: string,
  category?: AssetCategory | "ALL",
) {
  try {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    if (category && category !== "ALL") {
      where.category = category;
    }

    const [items, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.asset.count({ where }),
    ]);

    return {
      success: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      items,
    };
  } catch (err) {
    console.error("List assets error:", err);
    return { success: false, message: "Failed to fetch assets." };
  }
}

export async function deleteAsset(publicId: string) {
  try {
    if (!publicId) return { success: false, message: "Invalid publicId" };

    // 1. Delete from Cloudinary
    const cloudRes = await deleteFromCloudinary(publicId);
    if (!cloudRes.success) return cloudRes;

    // 2. Delete from DB (use deleteMany because AssetWhereUniqueInput requires the unique id)
    const deleted = await prisma.asset.deleteMany({
      where: { publicId },
    });
    if (deleted.count === 0) {
      return { success: false, message: "Asset not found in database" };
    }
    revalidatePath("/dashboard/assets");
    revalidatePath("/"); // Revalidate homepage cache
    return {
      success: true,
      message: "Asset deleted successfully",
    };
  } catch (err) {
    console.error("Delete asset error:", err);
    return { success: false, message: "Failed to delete asset" };
  }
}

export async function uploadAsset(
  base64: string,
  name: string,
  category: AssetCategory,
  folder = "uploads",
) {
  try {
    if (!base64) return { success: false, message: "No file provided." };
    if (!name) return { success: false, message: "Name is required." };

    const uploaded = await uploadToCloudinary(base64, folder);

    const saved = await prisma.asset.create({
      data: {
        name,
        category,
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
      },
    });
    revalidatePath("/dashboard/assets");
    revalidatePath("/"); // Revalidate homepage cache

    return {
      success: true,
      asset: saved,
    };
  } catch (err) {
    console.error("Upload asset error:", err);
    return { success: false, message: "Upload failed." };
  }
}
