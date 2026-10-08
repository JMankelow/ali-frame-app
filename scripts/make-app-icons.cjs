// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Builds the phone home-screen icons: the Ali-Frame logo on a solid black square.
//   node scripts/make-app-icons.cjs
const sharp = require("sharp");
const fs = require("fs");

async function icon(size, logoShare, out) {
  const logoW = Math.round(size * logoShare);
  const logo = await sharp("public/aliframe-logo.png").resize({ width: logoW }).png().toBuffer();
  const meta = await sharp(logo).metadata();
  await sharp({ create: { width: size, height: size, channels: 4, background: "#000000" } })
    .composite([{ input: logo, left: Math.round((size - meta.width) / 2), top: Math.round((size - meta.height) / 2) }])
    .flatten({ background: "#000000" })
    .png()
    .toFile(out);
  console.log("wrote", out, size);
}

(async () => {
  await icon(180, 0.86, "src/app/apple-icon.png"); // iPhone/iPad "Add to Home Screen"
  await icon(192, 0.86, "public/icon-192.png"); // Android / manifest
  await icon(512, 0.86, "public/icon-512.png");
})();
