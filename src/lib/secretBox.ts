// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

// Encrypts small secrets (authenticator-app keys) before they go in the database, so a copy of the database alone
// isn't enough to generate someone's login codes. Key = TOTP_ENCRYPTION_KEY if set, otherwise derived from DATABASE_URL.
function key(): Buffer {
  const material = process.env.TOTP_ENCRYPTION_KEY || process.env.DATABASE_URL || "";
  if (!material) throw new Error("No encryption key available (set TOTP_ENCRYPTION_KEY)");
  return createHash("sha256").update("af-secretbox-v1:" + material).digest();
}

export function sealSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv.toString("base64"), c.getAuthTag().toString("base64"), enc.toString("base64")].join(".");
}

export function openSecret(sealed: string): string {
  const [iv, tag, enc] = sealed.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}
