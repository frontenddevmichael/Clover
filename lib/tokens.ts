// Clover Design Tokens — ui-prompt.md §2–4
// All values reference the spec directly. No ad-hoc values.

export const colors = {
  // Neutral scale (the base of everything)
  neutral950: '#0B0B0C',
  neutral900: '#18181B', // primary fills / carbon text (Stitch primary)
  neutral800: '#1C1C1E',
  neutral600: '#3F3F46',
  neutral500: '#6E6E73', // Darkened from #8E8E93 to pass 4.5:1 on white (§9)
  neutral350: '#D4D4D8',
  neutral300: '#A1A1AA',
  neutral200: '#E5E5EA',
  neutral100: '#F3F3F3',
  neutral50: '#F7F7F8',
  white: '#FFFFFF',
  black: '#000000',

  // Workload states — base hues for borders/dots; *Bg/*Text pairs for badges
  workloadLight: '#8FBF9F',
  workloadBalanced: '#8FB3D9',
  workloadHeavy: '#E0B673',
  workloadOverloaded: '#D98080',
  overdue: '#B06060',
  success: '#A8D8B9',

  // Badge-safe variants (darkened to pass 4.5:1 with white text)
  workloadBalancedBg: '#5A8AB5',
  workloadOverloadedBg: '#B05A5A',
  overdueBg: '#8A4545',
  successBg: '#5A9A6F',

  // Warm warning family (urgent banners, sand accents)
  warningBg: '#FFF8F0',
  warningBorder: '#E8C9A0',
  warningText: '#7A6540',

  // Glass surfaces (ui-prompt §5 — one consistent light source)
  glassSurface: 'rgba(247, 247, 248, 0.95)', // sheets/modals
  glassDock: 'rgba(247, 247, 248, 0.92)', // tab bar
  borderFaint: 'rgba(0, 0, 0, 0.06)', // hairline on glass

  // Skeleton shimmer gradient stops
  shimmerFrom: 'rgba(255, 255, 255, 0)',
  shimmerMid: 'rgba(255, 255, 255, 0.4)',

  // Placeholder text color — passes 4.5:1 on white (§9)
  placeholder: '#6E6E73',

  // Course tag palette — 8 desaturated pastels
  courseTags: [
    '#A8C5DA', // soft blue
    '#B5C9A8', // sage green
    '#D4B8C9', // mauve
    '#C9C0A8', // warm sand
    '#A8BDC5', // slate teal
    '#C5A8B5', // dusty rose
    '#B8C5A8', // olive
    '#C5B5A8', // taupe
  ] as const,
} as const;

export const typography = {
  // Type scale: 44 / 28 / 22 / 17 / 15 / 13 — no in-between sizes
  hero: 44, // oversized optical numerals (stat heroes, countdowns) — always tabular-nums
  display: 28,
  title: 22,
  body: 17,
  secondary: 15,
  caption: 13,
  // Small numeric/eyebrow labels (stat labels, week-strip letters, badges).
  // Used only where 13px caption is too large for the data density.
  micro: 10,

  // Weights — nothing lighter than 400
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,

  // Font family (Inter — ui-prompt §3)
  fontFamily: 'Inter',

  // Optical adjustments — tight tracking is for hero/display sizes only
  trackingHero: -1.2,
  trackingDisplay: -0.6,
} as const;

export const spacing = {
  // Base unit: 4px, composed in multiples of 4.
  // x.5 keys are the 2px sub-grid (optical adjustments, per DESIGN.md);
  // prefer whole keys unless optically necessary.
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  15: 60,
  16: 64,
  30: 120,
} as const;

export const radii = {
  // Corner radius scale: 12 / 20 / 28 (ui-prompt §4), plus:
  cardInner: 16, // nested cards, stat tiles inside a screen
  pill: 9999, // circles, dots, switches, drag handles, badges
  // chip: 12 (small buttons, chips, inputs)
  // card: 20 (cards)
  // sheet: 28 (sheets, modals)
  chip: 12,
  card: 20,
  sheet: 28,
} as const;

// ── Depth system ────────────────────────────────────────────────────────────
// One light source (top edge). Surfaces advance toward the viewer in tiers;
// every elevated surface carries a hairline top-edge light plus a soft
// downward shadow from that single source. Values are scheme-dependent and
// therefore live on the theme (see theme.ts) — these are the shape contracts.
export const depth = {
  // Surface tiers: canvas < tier1 (cards) < tier2 (dock/sheets) < tier3 (modals)
  tiers: ['canvas', 'tier1', 'tier2', 'tier3'] as const,

  // Light-mode shadows (single top light source → shadow falls downward)
  shadowCardLight: {
    shadowColor: '#18181B',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  shadowFloatingLight: {
    shadowColor: '#18181B',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  shadowCardDark: {
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  shadowFloatingDark: {
    shadowColor: '#000000',
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
} as const;

// Convert #RRGGBB → rgba(r, g, b, a). Used for ambient glows cast from a
// meaningful color (workload state, course tag) — never decoration.
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Dark scheme palette ────────────────────────────────────────────────────
// Inverts luminance while keeping hue meaning identical. Workload/course
// pastels are shared across schemes (they read brighter against dark).
export const darkColors = {
  neutral950: '#0B0B0C',
  neutral900: '#18181B',
  neutral800: '#1C1C1E',
  neutral700: '#232326',
  neutral600: '#3F3F46',
  neutral500: '#8E8E93',
  neutral350: '#D4D4D8',
  neutral300: '#A1A1AA',
  neutral200: '#E5E5EA',
  neutral100: '#F3F3F3',
  neutral50: '#F7F7F8',
  white: '#FFFFFF',
  black: '#000000',

  // Semantic surfaces (dark)
  canvas: '#0B0B0C',
  tier1: '#141416', // cards
  tier2: '#1C1C1E', // dock / sheets
  tier3: '#232326', // modals
  ink: '#F7F7F8',
  inkSecondary: '#A1A1AA',
  inkFaint: '#6E6E73',
  inkMuted: '#D4D4D8',
  fill: '#F7F7F8', // primary fills invert: light on dark
  fillInk: '#18181B', // text on light fills
  subtleFill: 'rgba(255, 255, 255, 0.08)',
  hairline: 'rgba(255, 255, 255, 0.10)',
  hairlineFaint: 'rgba(255, 255, 255, 0.06)',
  edgeLight: 'rgba(255, 255, 255, 0.14)', // top-edge light on elevated surfaces
  glassSurface: 'rgba(28, 28, 30, 0.92)',
  glassDock: 'rgba(16, 16, 18, 0.88)',
  borderFaint: 'rgba(255, 255, 255, 0.08)',
  warningBg: 'rgba(224, 182, 115, 0.12)',
  warningBorder: 'rgba(224, 182, 115, 0.35)',
  warningText: '#E0C296',
  shimmerFrom: 'rgba(255, 255, 255, 0)',
  shimmerMid: 'rgba(255, 255, 255, 0.10)',
  placeholder: '#6E6E73',
} as const;

export const motion = {
  // §8: ~200–250ms soft ease — nothing snappy or bouncy
  duration: 220,
  easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  // Spring physics for interactive elements (tab selection, list entrance,
  // sheet dismissal). Gentle — damping high enough that nothing overshoots
  // visibly more than once. All spring uses require a reduce-motion fallback.
  spring: { damping: 20, stiffness: 240, mass: 1 },
  springSoft: { damping: 26, stiffness: 200, mass: 1 },
} as const;
