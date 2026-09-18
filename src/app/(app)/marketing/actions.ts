"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { buildGenericStorageKey, getUploadUrl, getDownloadUrl, deleteObject } from "@/lib/storage";
import { MARKETING_CATEGORIES, type MarketingCategory } from "./categories";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

function assertCategory(category: string): MarketingCategory {
  if (!MARKETING_CATEGORIES.includes(category as MarketingCategory)) throw new Error("Invalid category.");
  return category as MarketingCategory;
}

const CATEGORY_PATHS: Record<MarketingCategory, string> = {
  BRANDING: "/marketing/branding",
  LOGO: "/marketing/logo",
  SOCIAL_MEDIA: "/marketing/social-media",
  PENDING_CONTENT: "/marketing/pending-content",
};

export interface RequestMarketingUploadResult {
  error?: string;
  storageKey?: string;
  uploadUrl?: string;
}

export async function requestMarketingUpload(
  category: string,
  fileName: string,
  mimeType: string,
  sizeBytes: number
): Promise<RequestMarketingUploadResult> {
  await requireUser();
  assertCategory(category);

  if (!fileName) return { error: "No file selected." };
  if (sizeBytes > MAX_FILE_BYTES) return { error: "File is larger than 50MB." };

  const storageKey = buildGenericStorageKey(`marketing/${category.toLowerCase()}`, fileName);
  const uploadUrl = await getUploadUrl(storageKey, mimeType || "application/octet-stream");
  return { storageKey, uploadUrl };
}

export interface MarketingAssetFormState {
  error?: string;
}

export async function createMarketingAsset(params: {
  category: string;
  title: string;
  description?: string;
  linkUrl?: string;
  storageKey?: string;
  fileName?: string;
}): Promise<MarketingAssetFormState> {
  const user = await requireUser();
  const category = assertCategory(params.category);
  const title = params.title.trim();

  if (!title) return { error: "Give it a title." };
  if (!params.storageKey && !params.linkUrl) return { error: "Attach a file or a link." };

  await prisma.marketingAsset.create({
    data: {
      category,
      title,
      description: params.description?.trim() || null,
      linkUrl: params.linkUrl?.trim() || null,
      storageKey: params.storageKey ?? null,
      fileName: params.fileName ?? null,
      uploadedById: user.id,
    },
  });

  await logAudit({ userId: user.id, action: "marketing_asset_created", entityType: "MarketingAsset", metadata: { category, title } });
  revalidatePath(CATEGORY_PATHS[category]);
  return {};
}

export async function getMarketingDownloadUrl(id: string): Promise<{ url?: string; error?: string }> {
  await requireUser();
  const asset = await prisma.marketingAsset.findUnique({ where: { id } });
  if (!asset?.storageKey) return { error: "Nothing to download." };

  const url = await getDownloadUrl(asset.storageKey, asset.fileName ?? asset.title);
  return { url };
}

export async function deleteMarketingAsset(id: string) {
  const user = await requireUser();
  const asset = await prisma.marketingAsset.findUnique({ where: { id } });
  if (!asset) return;

  if (asset.storageKey) await deleteObject(asset.storageKey);
  await prisma.marketingAsset.delete({ where: { id } });
  await logAudit({ userId: user.id, action: "marketing_asset_deleted", entityType: "MarketingAsset", entityId: id });
  revalidatePath(CATEGORY_PATHS[asset.category as MarketingCategory] ?? "/marketing/branding");
}
