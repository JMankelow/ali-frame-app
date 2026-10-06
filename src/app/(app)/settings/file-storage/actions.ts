// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use server";

import { requireSuperUser } from "@/lib/session";
import { deleteObject, getObjectBuffer, getUploadUrl } from "@/lib/storage";

const PROOF = "ali-frame file storage test";
const why = (e: unknown) => (e instanceof Error ? e.message.slice(0, 200) : "unknown problem");

/** Step 1: can the server build a signed upload link? Fails here if the account id / keys / bucket are missing or malformed. */
export async function requestStorageTest(): Promise<{ error?: string; key?: string; uploadUrl?: string }> {
  await requireSuperUser();
  const key = `diagnostics/test-${Date.now()}.txt`;
  try {
    return { key, uploadUrl: await getUploadUrl(key, "text/plain") };
  } catch (e) {
    return { error: why(e) };
  }
}

/** Step 3: after the browser has uploaded, read it back (proves the keys + bucket work) and tidy it away. */
export async function finishStorageTest(key: string): Promise<{ error?: string }> {
  await requireSuperUser();
  if (!/^diagnostics\/test-\d+\.txt$/.test(key)) return { error: "Unexpected test file." };
  try {
    const body = (await getObjectBuffer(key)).toString("utf8");
    await deleteObject(key);
    return body === PROOF ? {} : { error: "The file read back didn't match what was uploaded." };
  } catch (e) {
    return { error: `Uploaded, but couldn't read it back: ${why(e)}` };
  }
}
