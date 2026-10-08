// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Builds the phone home-screen icons: the Ali-Frame "A" (brand blue + grey) on a solid black square.
//   node scripts/make-app-icons.cjs
const sharp = require("sharp");

// The A mark, drawn at the size of its own viewBox (0-100) — same shapes as public/aliframe-mark.svg, brand colours as in the logo.
const A = (size, share) => {
  const scale = (size * share) / 91; // the A is ~91 units wide
  const w = 91 * scale;
  const h = 72.14 * scale;
  const x = (size - w) / 2;
  const y = (size - h) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#000000"/>
  <g transform="translate(${x - 2.49 * scale},${y}) scale(${scale})">
    <polygon fill="#00adee" points="58.04 .25 59.83 23.23 23.95 72.1 2.49 72.1 58.04 .25"/>
    <polygon fill="#939598" points="60.71 0 83.24 0 90.63 72.14 67.98 72.14 66.26 56.46 38.44 56.46 49.52 41.39 64.82 41.39 60.71 0"/>
  </g>
</svg>`;
};

async function icon(size, out) {
  await sharp(Buffer.from(A(size * 4, 0.6)), { density: 72 }).resize(size, size).flatten({ background: "#000000" }).png().toFile(out);
  console.log("wrote", out, size);
}

(async () => {
  await icon(180, "src/app/apple-icon.png"); // iPhone/iPad "Add to Home Screen"
  await icon(192, "public/icon-192.png"); // Android / manifest
  await icon(512, "public/icon-512.png");
})();
