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
          {/* Gear/cog icon */}
          <Path
            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
            stroke={t.colors.ink}
            strokeWidth={1.8}
            fill="none"
          />
          <Path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
            stroke={t.colors.ink}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
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
