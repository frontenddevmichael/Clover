// HeaderBar — hamburger menu (left) + gear settings (right).
// Replaces ProfileButton on all tab screens.
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '@/lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type HeaderBarProps = {
  onMenuPress: () => void;
  onSettingsPress: () => void;
};

export function HeaderBar({ onMenuPress, onSettingsPress }: HeaderBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Hamburger menu — left */}
      <TouchableOpacity
        style={styles.hit}
        onPress={onMenuPress}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
      >
        <Svg viewBox="0 0 24 24" width={22} height={22}>
          <Path d="M4 7h16" stroke={t.colors.ink} strokeWidth={2} strokeLinecap="round" />
          <Path d="M4 12h16" stroke={t.colors.ink} strokeWidth={2} strokeLinecap="round" />
          <Path d="M4 17h16" stroke={t.colors.ink} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </TouchableOpacity>

      {/* Gear settings — right */}
      <TouchableOpacity
        style={styles.hit}
        onPress={onSettingsPress}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <Svg viewBox="0 0 24 24" width={22} height={22}>
          <Circle cx="12" cy="12" r="3" stroke={t.colors.ink} strokeWidth={1.8} fill="none" />
          <Path
            d="M12 1v3m0 16v3M4.22 4.22l2.12 2.12m11.32 11.32 2.12 2.12M1 12h3m16 0h3M4.22 19.78l2.12-2.12M18.36 5.64l2.12-2.12"
            stroke={t.colors.ink}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  hit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
