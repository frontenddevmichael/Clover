// Workload indicator — a pill using muted accent colors.
// Always paired with a text label — never color alone (§9).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/theme';

type WorkloadLevel = 'light' | 'balanced' | 'heavy' | 'overloaded';

export function WorkloadIndicator({ level }: { level: WorkloadLevel }) {
  const t = useTheme();
  const config = {
    light: { bg: t.colors.workloadLight, label: 'Light' },
    balanced: { bg: t.colors.workloadBalanced, label: 'Balanced' },
    heavy: { bg: t.colors.workloadHeavy, label: 'Heavy' },
    overloaded: { bg: t.colors.workloadOverloaded, label: 'Overloaded' },
  }[level];

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: config.bg,
          paddingHorizontal: t.spacing[3],
          paddingVertical: t.spacing[1],
          borderRadius: t.radii.chip,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: t.colors.neutral950,
            fontSize: t.typography.caption,
            fontWeight: t.typography.semibold,
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start' },
  label: {},
});
