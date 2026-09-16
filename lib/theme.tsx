// Clover Theme — applies ui-prompt.md tokens to React Native.
// Scheme-aware: getTheme(isDark) returns the full theme for light or dark.
import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
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

type Scheme = 'light' | 'dark';
type AppearancePreference = 'system' | 'light' | 'dark';
const APPEARANCE_KEY = 'clover_appearance';

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
      edgeShadowLine: isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.06)',

      // Legacy aliases
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

type ThemeContextType = {
  theme: Theme;
  setAppearance: (pref: AppearancePreference) => void;
  appearance: AppearancePreference;
};

const ThemeStateContext = createContext<ThemeContextType>({
  theme,
  setAppearance: () => {},
  appearance: 'system',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<AppearancePreference>('system');

  // Load saved preference
  useEffect(() => {
    SecureStore.getItemAsync(APPEARANCE_KEY).then((val) => {
      if (val === 'light' || val === 'dark' || val === 'system') {
        setPreference(val);
      }
    }).catch(() => {});
  }, []);

  const isDark = preference === 'system'
    ? systemScheme === 'dark'
    : preference === 'dark';

  const themeValue = useMemo(() => buildTheme(isDark), [isDark]);

  const setAppearance = useCallback((pref: AppearancePreference) => {
    setPreference(pref);
    SecureStore.setItemAsync(APPEARANCE_KEY, pref).catch(() => {});
  }, []);

  return (
    <ThemeStateContext.Provider value={{ theme: themeValue, setAppearance, appearance: preference }}>
      <ThemeContext.Provider value={themeValue}>
        {children}
      </ThemeContext.Provider>
    </ThemeStateContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/** Access theme + appearance setter (for Settings screen) */
export function useThemeState() {
  return useContext(ThemeStateContext);
}

// Hook for StyleSheet-style objects that need the scheme.
export function useStyles<T extends Record<string, object>>(
  make: (t: Theme) => T
): T {
  const t = useTheme();
  return useMemo(() => make(t), [t]) as T;
}
