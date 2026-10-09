// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use server";

import { requireNotInstaller } from "@/lib/session";

export interface AddressHit {
  label: string;
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Type-ahead for New Zealand addresses. Uses Google Places when GOOGLE_PLACES_API_KEY is set on the server;
 * otherwise the free OpenStreetMap-based Photon service. Only the few characters typed are sent — never a customer record.
 * A unit typed as "2/31 ..." is kept on the suggestion if the service only knows the building.
 */
export async function searchAddresses(input: string): Promise<AddressHit[]> {
  await requireNotInstaller();
  const typed = clean(String(input ?? "")).slice(0, 120);
  if (typed.length < 4) return [];
  const um = typed.match(/^(\d+[a-z]?)\s*\/\s*(\d+[a-z]?)\b/i);
  const q = typed;
  // If the service only knows the building ("31 Challen Close"), keep the unit that was typed ("2/31 Challen Close").
  const withUnit = (label: string) => (um && label.toLowerCase().startsWith(um[2].toLowerCase() + " ") ? `${um[1]}/${label}` : label);

  try {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (key) {
      const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
        body: JSON.stringify({ input: q, includedRegionCodes: ["nz"], includedPrimaryTypes: ["street_address", "premise", "subpremise", "route"] }),
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) return [];
      const j = (await res.json()) as { suggestions?: { placePrediction?: { text?: { text?: string } } }[] };
      return (j.suggestions ?? [])
        .map((s) => s.placePrediction?.text?.text ?? "")
        .filter(Boolean)
        .slice(0, 6)
        .map((t) => ({ label: withUnit(clean(t.replace(/,\s*New Zealand$/i, ""))) }));
    }

    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", q);
    url.searchParams.set("limit", "8");
    url.searchParams.set("lang", "en");
    url.searchParams.set("bbox", "166.0,-47.6,178.8,-34.0"); // New Zealand
    url.searchParams.set("lat", "-36.9");
    url.searchParams.set("lon", "174.9"); // lean towards Auckland
    const res = await fetch(url, { headers: { "User-Agent": "AliFrame-JobManagement/1.0 (jo@aliframe.co.nz)" }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const j = (await res.json()) as { features?: { properties: Record<string, string> }[] };
    const seen = new Set<string>();
    const out: AddressHit[] = [];
    for (const f of j.features ?? []) {
      const p = f.properties;
      if (p.countrycode && p.countrycode !== "NZ") continue;
      const street = p.street ? clean(`${p.housenumber ?? ""} ${p.street}`) : p.name ?? "";
      const parts = [street, p.suburb || p.district, p.city, p.postcode].filter(Boolean);
      const label = withUnit(clean([...new Set(parts)].join(", ")));
      if (!street || seen.has(label)) continue;
      seen.add(label);
      out.push({ label });
      if (out.length >= 6) break;
    }
    return out;
  } catch {
    return []; // lookup is a convenience — typing the address by hand always works
  }
}
