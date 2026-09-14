// Shared surface primitives — the app's single depth idiom.
// ElevatedSurface: tiered surface with a hairline top-edge light and a
// scheme-correct shadow from the one top light source. Every elevated
// surface in the app uses this; nothing improvises shadow/border pairs.
import React from 'react';
import { View, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { useTheme, Theme } from '@/lib/theme';

type Tier = 'tier1' | 'tier2' | 'tier3';

type ElevatedSurfaceProps = {
  tier?: Tier;
  // Suppress the hairline edge-light for surfaces that sit flush (tier-1
  // tiles on tier-1 backgrounds) or that use a custom treatment.
  edgeLight?: boolean;
  shadow?: 'card' | 'floating' | 'none';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function ElevatedSurface({
  tier = 'tier1',
  edgeLight = true,
  shadow = 'card',
  style,
  children,
}: ElevatedSurfaceProps) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: t.colors[tier],
          borderRadius: t.radii.card,
        },
        edgeLight && {
          borderTopColor: t.colors.edgeLight,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        shadow !== 'none' && t.shadow[shadow],
        style,
      ]}
    >
      {children}
    </View>
  );
}

// Convenience for consumers that just need the style object (e.g. to spread
// onto an existing View or an Animated surface).
export function elevatedStyle(
  t: Theme,
  opts: { tier?: Tier; edgeLight?: boolean; shadow?: 'card' | 'floating' | 'none'; radius?: number } = {}
): ViewStyle {
  const { tier = 'tier1', edgeLight = true, shadow = 'card', radius } = opts;
  return {
    backgroundColor: t.colors[tier],
    borderRadius: radius ?? t.radii.card,
    ...(edgeLight ? { borderTopColor: t.colors.edgeLight, borderTopWidth: StyleSheet.hairlineWidth } : {}),
    ...(shadow !== 'none' ? t.shadow[shadow] : {}),
  };
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
});
