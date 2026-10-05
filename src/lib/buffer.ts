// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";

// Buffer's GraphQL API (https://developers.buffer.com). Posts are created with saveToDraft so nothing is
// published until someone approves it inside Buffer. Needs BUFFER_API_KEY (and optionally BUFFER_ORGANIZATION_ID).
const ENDPOINT = "https://api.buffer.com";

export function bufferConfigured(): boolean {
  return !!process.env.BUFFER_API_KEY;
}

async function gql<T>(query: string): Promise<T> {
  const key = process.env.BUFFER_API_KEY;
  if (!key) throw new Error("Buffer is not set up yet.");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { data?: T; errors?: { message: string }[] };
  if (!res.ok || json.errors?.length || !json.data) throw new Error(json.errors?.[0]?.message ?? `Buffer request failed (${res.status}).`);
  return json.data;
}

const lit = (s: string) => JSON.stringify(s); // GraphQL string literals share JSON's escaping

export interface BufferChannel {
  id: string;
  name: string;
  displayName: string | null;
  service: string;
}

export async function listChannels(): Promise<BufferChannel[]> {
  let orgId = process.env.BUFFER_ORGANIZATION_ID;
  if (!orgId) {
    const o = await gql<{ account: { organizations: { id: string }[] } }>("query { account { organizations { id name } } }");
    orgId = o.account.organizations[0]?.id;
  }
  if (!orgId) return [];
  const c = await gql<{ channels: BufferChannel[] }>(`query { channels(input: { organizationId: ${lit(orgId)} }) { id name displayName service } }`);
  return c.channels;
}

/** Creates a DRAFT post (with images) on one channel. Returns the Buffer post id. */
export async function createDraftPost(channelId: string, text: string, imageUrls: string[]): Promise<string> {
  const assets = imageUrls.length ? `assets: [${imageUrls.map((u) => `{ image: { url: ${lit(u)} } }`).join(", ")}]` : "";
  const data = await gql<{ createPost: { post?: { id: string }; message?: string } }>(`mutation {
    createPost(input: { text: ${lit(text)}, channelId: ${lit(channelId)}, schedulingType: automatic, mode: addToQueue, saveToDraft: true ${assets} }) {
      ... on PostActionSuccess { post { id } }
      ... on MutationError { message }
    }
  }`);
  if (!data.createPost.post) throw new Error(data.createPost.message ?? "Buffer did not create the draft.");
  return data.createPost.post.id;
}
