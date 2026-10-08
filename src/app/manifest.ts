// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import type { MetadataRoute } from "next";

// What a phone uses when the app is added to the Home Screen: name, black background and the Ali-Frame logo icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ali-Frame Job Management",
    short_name: "Ali-Frame",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
