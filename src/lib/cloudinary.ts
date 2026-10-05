// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { createHash } from "crypto";

// Cloudinary hosts the chosen job photos at public URLs so Buffer can fetch them for a post.
// Needs CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET (Render environment only — never in code).
export function cloudinaryConfigured(): boolean {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

/** Uploads an image from a (short-lived) URL using a signed request and returns its public https URL. */
export async function uploadImageFromUrl(sourceUrl: string, folder = "ali-frame/social"): Promise<string> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !apiKey || !secret) throw new Error("Cloudinary is not set up yet.");

  const timestamp = String(Math.floor(Date.now() / 1000));
  // Signature = SHA-1 of the signed params (alphabetical, excluding file/api_key) joined as a query string, plus the secret.
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest("hex");
  const body = new URLSearchParams({ file: sourceUrl, api_key: apiKey, timestamp, folder, signature });

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body });
  const json = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !json.secure_url) throw new Error(json.error?.message ?? `Cloudinary upload failed (${res.status}).`);
  return json.secure_url;
}
