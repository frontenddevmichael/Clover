// GridBackground — dot grid pattern for schedule sticky notes
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/lib/theme';

type GridBackgroundProps = {
  children: React.ReactNode;
  style?: any;
};

const SPACING = 24;
const ROWS = 20;
const COLS = 12;

export function GridBackground({ children, style }: GridBackgroundProps) {
  const t = useTheme();
  const dotColor = t.colors.hairline;

  const dots = useMemo(() => {
    const result = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        result.push(
          <Circle
            key={`${r}-${c}`}
            cx={c * SPACING + SPACING / 2}
            cy={r * SPACING + SPACING / 2}
            r={1.2}
            fill={dotColor}
          />
        );
      }
    }
    return result;
  }, [dotColor]);

  return (
    <View style={[styles.container, style]}>
      <Svg
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        viewBox={`0 0 ${COLS * SPACING} ${ROWS * SPACING}`}
        preserveAspectRatio="xMinYMin slice"
      >
        {dots}
      </Svg>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
