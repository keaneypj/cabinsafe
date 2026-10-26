// Generates PWA icons from the CabinSafe shield + aircraft mark. Run: npm run icons
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const SHIELD = "M32 4 L54 11.5 V29.5 C54 43.5 44.6 53.6 32 60 C19.4 53.6 10 43.5 10 29.5 V11.5 Z";
const PLANE = "M32 15 C33.3 15 34 16.8 34 18.6 L34 27.2 L46.5 34.6 L46.5 37.6 L34 33.6 L34 42.2 L37.8 45 L37.8 47.2 L32 45.8 L26.2 47.2 L26.2 45 L30 42.2 L30 33.6 L17.5 37.6 L17.5 34.6 L30 27.2 L30 18.6 C30 16.8 30.7 15 32 15 Z";

function svg({ size, pad, rounded, bg = true }) {
  const inner = 64 * (1 - pad * 2);
  const scale = inner / 64;
  const off = 64 * pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe1c4"/><stop offset=".55" stop-color="#d7bd8c"/><stop offset="1" stop-color="#a98d5c"/></linearGradient>
    <linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3e55"/><stop offset="1" stop-color="#101d2b"/></linearGradient>
    <radialGradient id="bg" cx=".7" cy="0" r="1.1"><stop offset="0" stop-color="#203145"/><stop offset="1" stop-color="#101d2b"/></radialGradient>
  </defs>
  ${bg ? `<rect width="64" height="64" rx="${rounded ? 14 : 0}" fill="url(#bg)"/>` : ""}
  <g transform="translate(${off} ${off}) scale(${scale})">
    <path d="${SHIELD}" fill="url(#n)" stroke="url(#g)" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="${PLANE}" fill="url(#g)"/>
  </g>
</svg>`;
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon.svg", svg({ size: 512, pad: 0.06, rounded: true }));
const jobs = [
  ["icon-192.png", 192, 0.08, false],
  ["icon-512.png", 512, 0.08, false],
  ["icon-maskable-512.png", 512, 0.2, false],
  ["apple-touch-icon.png", 180, 0.12, false],
  ["favicon-32.png", 32, 0.02, false],
];
for (const [name, size, pad, rounded] of jobs) {
  await sharp(Buffer.from(svg({ size, pad, rounded }))).resize(size, size).png().toFile(`public/icons/${name}`);
  console.log("wrote", name);
}
