// Clover Theme — applies ui-prompt.md tokens to React Native.
// Scheme-aware: getTheme(isDark) returns the full theme for light or dark.
// `theme` stays exported as the LIGHT instance so any code not yet converted
// keeps working; new code consumes useTheme() and re-renders on scheme flips.
import React, { createContext, useContext, useMemo } from 'react';
import {
  colors,
  darkColors,
  typography,
  spacing,
  radii,
  motion,
  depth,
  withAlpha,
} from './tokens';
import { DefaultTheme } from '@react-navigation/native';

// Navigator backdrop — expo-router SDK 56 hard-codes react-navigation's
// DefaultTheme (#F2F2F2) as the color painted under and between screens and
// exposes no theme prop. With EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1 set
// in .env.local, we import the same module singleton the router's fork reads
// and pin it to the canvas token. When dark mode returns, derive this from
// the active scheme instead of the constant below.
DefaultTheme.colors.background = colors.neutral50;

type Scheme = 'light' | 'dark';

function buildTheme(isDark: boolean) {
  const scheme: Scheme = isDark ? 'dark' : 'light';
  const c = isDark ? darkColors : colors;

  return {
    scheme,
    isDark,
    typography,
    spacing,
    radii,
    motion,
    depth,
    withAlpha,

    colors: {
      // Raw palette — identical key set for both schemes (dark fills gaps).
      ...colors,
      ...(isDark
        ? {
            neutral700: darkColors.neutral700,
            canvas: darkColors.canvas,
            tier1: darkColors.tier1,
            tier2: darkColors.tier2,
            tier3: darkColors.tier3,
            glassSurface: darkColors.glassSurface,
            glassDock: darkColors.glassDock,
            borderFaint: darkColors.borderFaint,
            warningBg: darkColors.warningBg,
            warningBorder: darkColors.warningBorder,
            warningText: darkColors.warningText,
            shimmerFrom: darkColors.shimmerFrom,
            shimmerMid: darkColors.shimmerMid,
            placeholder: darkColors.placeholder,
          }
        : {
            canvas: colors.neutral50,
            tier1: colors.white,
            tier2: colors.neutral50,
            tier3: colors.white,
            warningText: colors.warningText,
          }),

      // Semantic aliases — prefer these in component code so a token change
      // propagates everywhere (token discipline, ui-prompt §11.7).
      ink: isDark ? darkColors.ink : colors.neutral950,
      inkSecondary: isDark ? darkColors.inkSecondary : colors.neutral500,
      inkFaint: isDark ? darkColors.inkFaint : colors.neutral300,
      inkMuted: isDark ? darkColors.inkMuted : colors.neutral600,
      hairline: isDark ? darkColors.hairline : colors.neutral200,
      hairlineFaint: isDark ? darkColors.hairlineFaint : colors.neutral350,
      elevated: isDark ? darkColors.tier1 : colors.white,
      fill: isDark ? darkColors.fill : colors.neutral900,
      fillInk: isDark ? darkColors.fillInk : colors.white,
      subtleFill: isDark ? darkColors.subtleFill : colors.neutral100,
      edgeLight: isDark ? darkColors.edgeLight : 'rgba(255, 255, 255, 0.9)',
      // On dark surfaces a dark hairline reads as depth; on light use ink tint.
      edgeShadowLine: isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.06)',

      // Legacy aliases (kept so unconverted code never breaks)
      bg: isDark ? darkColors.canvas : colors.neutral50,
      surface: isDark ? darkColors.tier1 : colors.white,
      text: isDark ? darkColors.ink : colors.neutral950,
      textSecondary: isDark ? darkColors.inkSecondary : colors.neutral500,
      border: isDark ? darkColors.hairline : colors.neutral200,
      placeholder: isDark ? darkColors.placeholder : colors.neutral500,
    },

    // Shadows for the single top light source (scheme-correct).
    shadow: {
      card: isDark ? depth.shadowCardDark : depth.shadowCardLight,
      floating: isDark ? depth.shadowFloatingDark : depth.shadowFloatingLight,
    },
  } as const;
}

export type Theme = ReturnType<typeof buildTheme>;

// LIGHT instance — stable reference for legacy imports.
export const theme = buildTheme(false);

// ── React plumbing ──────────────────────────────────────────────────────────
const ThemeContext = createContext<Theme>(theme);

// Debug/design override (parked with dark mode): ?theme=light|dark once
// pinned the scheme. Dark mode is disabled for now — see below.

// Dark mode is disabled: the app is pinned to the light scheme until the
// dark palette ships properly. buildTheme() and darkColors stay in tokens
// — re-enable by honoring useColorScheme() here again.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => buildTheme(false), []);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

// Hook for StyleSheet-style objects that need the scheme. Styles are rebuilt
// only when the theme reference changes.
export function useStyles<T extends Record<string, object>>(
  make: (t: Theme) => T
): T {
  const t = useTheme();
  return useMemo(() => make(t), [t]) as T;
}
