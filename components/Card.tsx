// Card — theme-aware, built on the shared depth idiom.
// 20px radius, tier-1 surface, hairline top-edge light, workload/course
// color as left-edge accent.
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/lib/theme';
import { ElevatedSurface } from '@/components/ElevatedSurface';

type CardProps = {
  children?: React.ReactNode;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, accentColor, style }: CardProps) {
  const t = useTheme();
  return (
    <ElevatedSurface
      tier="tier1"
      style={[
        {
          borderWidth: 1,
          borderColor: t.colors.hairline,
          borderLeftWidth: 3,
          borderLeftColor: accentColor ?? 'transparent',
          padding: t.spacing[4],
        },
        style,
      ]}
    >
      {children}
    </ElevatedSurface>
  );
}
