// Chip — theme-aware. 12px radius, always paired with a text label (§9).
import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/lib/theme';

type ChipProps = {
  label: string;
  color?: string;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function Chip({ label, color, textColor, style }: ChipProps) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: color ?? t.colors.subtleFill,
          paddingHorizontal: t.spacing[3],
          paddingVertical: t.spacing[1],
          borderRadius: t.radii.chip,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: textColor ?? t.colors.ink,
            fontSize: t.typography.caption,
            fontWeight: t.typography.semibold,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start' },
  label: {},
});
