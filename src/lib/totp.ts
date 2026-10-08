// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { appUrl } from "@/lib/invite";

// Standard authenticator-app codes (RFC 6238: HMAC-SHA1, 6 digits, 30-second steps) — works with Google Authenticator,
// Microsoft Authenticator, Authy, 1Password, etc.
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;

export function generateTotpSecret(): string {
  const bytes = randomBytes(20);
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function base32Decode(s: string): Buffer {
  let bits = "";
  for (const ch of s.replace(/=+$/, "").toUpperCase()) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) throw new Error("bad base32");
    bits += v.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function codeAt(secret: string, step: number): string {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(step / 2 ** 32), 0);
  buf.writeUInt32BE(step >>> 0, 4);
  const h = createHmac("sha1", base32Decode(secret)).update(buf).digest();
  const o = h[h.length - 1] & 0x0f;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, "0");
}

/** Checks a submitted code against the current step ±1 (clock drift). Returns the matching step so a code can't be reused. */
export function verifyTotp(secret: string, submitted: string, lastUsedStep?: number | null): { ok: boolean; step?: number } {
  const code = String(submitted ?? "").replace(/\s+/g, "");
  if (!/^[0-9]{6}$/.test(code)) return { ok: false };
  const now = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  for (const step of [now, now - 1, now + 1]) {
    if (lastUsedStep != null && step <= lastUsedStep) continue;
    const want = Buffer.from(codeAt(secret, step));
    const got = Buffer.from(code);
    if (want.length === got.length && timingSafeEqual(want, got)) return { ok: true, step };
  }
  return { ok: false };
}

export function otpauthUrl(secret: string, account: string): string {
  const issuer = "Ali-Frame";
  // `image` is the Ali-Frame logo icon — shown by authenticator apps that support custom icons (e.g. 2FAS, Aegis, Ente); Google/Microsoft Authenticator pick their own.
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}&image=${encodeURIComponent(appUrl() + "/icon-192.png")}`;
}
