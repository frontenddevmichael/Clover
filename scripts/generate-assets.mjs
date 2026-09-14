// Generates all Clover brand assets from the exact geometry in
// components/CloverLogo.tsx (PETAL_PATHS + STEM). Run:
//   node scripts/generate-assets.mjs
// Output lands in assets/ — commit the PNGs; rerun only if the mark changes.
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'assets');

// ── The mark — copied verbatim from components/CloverLogo.tsx ──
const PETAL_PATHS = [
  'M 50 38 C 46 30, 42 20, 50 12 C 58 20, 54 30, 50 38 Z',
  'M 50 38 C 56 32, 64 26, 72 30 C 68 38, 58 36, 50 38 Z',
  'M 50 38 C 56 42, 64 48, 62 56 C 54 54, 52 44, 50 38 Z',
  'M 50 38 C 44 42, 36 48, 38 56 C 46 54, 48 44, 50 38 Z',
  'M 50 38 C 44 32, 36 26, 28 30 C 32 38, 42 36, 50 38 Z',
];
const STEM = 'M 50 44 C 48 52, 46 60, 48 68';

// Brand palette (lib/tokens.ts)
const INK = '#18181B'; // neutral900
const CANVAS = '#F7F7F8'; // neutral50 — app background, matches splash config

// viewBox of the mark itself: 0 0 100 80
function markMarkup(stroke, strokeWidth, fill, fillOpacity) {
  const petals = PETAL_PATHS.map(
    (d) =>
      `<path d="${d}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="${fill}" fill-opacity="${fillOpacity}"/>`
  ).join('\n      ');
  return `
      ${petals}
      <path d="${STEM}" stroke="${stroke}" stroke-width="${strokeWidth * 1.2}" stroke-linecap="round" fill="none"/>`;
}

// Compose the mark centered on an N×N canvas. Mark occupies `scale` of the
// canvas edge, optically centered (the stem makes the mark bottom-heavy).
function cloverSvg({ size, bg = null, scale = 0.62, stroke = INK, strokeWidth = 2.5, fill = INK, fillOpacity = 0.15 }) {
  // Mark box: 100w × 80h. Place its center at canvas center, nudged up 2%
  // of the canvas so the stem doesn't make it sit low.
  const markW = size * scale;
  const markH = markW * 0.8;
  const tx = (size - markW) / 2;
  const ty = (size - markH) / 2 - size * 0.02;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}
  <g transform="translate(${tx} ${ty}) scale(${markW / 100})">
    ${markMarkup(stroke, strokeWidth, fill, fillOpacity)}
  </g>
</svg>`;
}

function render(svg, size, out) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(join(assets, out), png);
  console.log(`✓ ${out} (${size}×${size}, ${png.length} bytes)`);
}

// ── Outputs ──
// The drawn mark spans 44/100 units of the viewBox width, so "scale" here is
// the viewBox→canvas factor; visible-mark fraction ≈ 0.44 × scale.
// Targets: home-screen glyph ≈ 55% of the tile, adaptive mark ≈ 52% (inside
// the 66% safe zone), favicon ≈ 88%, splash ≈ 60%.

// 1. App icon — 1024×1024, opaque canvas (iOS forbids alpha in app icons)
render(cloverSvg({ size: 1024, bg: CANVAS, scale: 1.25 }), 1024, 'icon.png');

// 2. Android adaptive icon — 432 foreground, mark fully inside the circular
//    66% safe zone even at worst-case mask, transparent background
render(cloverSvg({ size: 432, scale: 1.1 }), 432, 'adaptive-icon.png');

// 3. Android monochrome layer — solid ink silhouette, no fill wash
render(
  cloverSvg({ size: 432, scale: 1.1, stroke: INK, fill: INK, fillOpacity: 1, strokeWidth: 3 }),
  432,
  'android-icon-monochrome.png'
);

// 4. Favicon — 48×48, mark fills the tile, bolder stroke so it reads at a glance
render(cloverSvg({ size: 48, bg: CANVAS, scale: 2.0, strokeWidth: 4 }), 48, 'favicon.png');

// 5. Splash icon — 1024 on transparent (expo-splash 'contain' scales it per screen)
render(cloverSvg({ size: 1024, scale: 1.36 }), 1024, 'splash-icon.png');

console.log('\nAll assets written to assets/.');
