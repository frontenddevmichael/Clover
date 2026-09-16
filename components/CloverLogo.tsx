// Clover Logo — Lucide clover icon with draw-on stroke animation.
// Uses official Lucide SVG paths with sequential draw + fill animation.
// Reduce motion: instant fade-in of the complete mark.
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  Easing,
  interpolate,
  useReducedMotion,
  cancelAnimation,
} from 'react-native-reanimated';
import { Lucide } from '@react-native-vector-icons/lucide';
import { useTheme } from '@/lib/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type CloverLogoProps = {
  size?: number;
  animated?: boolean;
  color?: string;
};

// Official Lucide clover SVG paths (viewBox 0 0 24 24)
// Path 1: stem line (bottom-left to top-right diagonal)
// Path 2: 3 clover leaves (circles) + center stem
// Path 3: second stem line (top-left to bottom-right diagonal)
const LUCIDE_PATHS = [
  'M16.17 7.83 2 22',
  'M4.02 12a2.827 2.827 0 1 1 3.81-4.17A2.827 2.827 0 1 1 12 4.02a2.827 2.827 0 1 1 4.17 3.81A2.827 2.827 0 1 1 19.98 12a2.827 2.827 0 1 1-3.81 4.17A2.827 2.827 0 1 1 12 19.98a2.827 2.827 0 1 1-4.17-3.81A1 1 0 1 1 4 12',
  'm7.83 7.83 8.34 8.34',
];

// Approximate path lengths for stroke-dasharray
const PATH_LENGTHS = [28, 90, 12];

const STAGGER = 160;

export function CloverLogo({
  size = 80,
  animated = true,
  color,
}: CloverLogoProps) {
  const t = useTheme();
  const ink = color ?? t.colors.ink;
  const reduced = useReducedMotion() ?? false;

  const bounce = useSharedValue(!animated || reduced ? 1 : 0.92);

  useEffect(() => {
    if (!animated || reduced) return;
    bounce.value = withDelay(
      STAGGER * 3 + 300,
      withSequence(
        withSpring(1.06, { damping: 12, stiffness: 300, mass: 0.8 }),
        withSpring(1, { damping: 14, stiffness: 200 })
      )
    );
    return () => cancelAnimation(bounce);
  }, [animated, reduced]);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounce.value }],
  }));

  return (
    <View style={styles.container} accessible accessibilityLabel="Clover logo">
      <Animated.View style={bounceStyle}>
        <Svg viewBox="0 0 24 24" width={size} height={size}>
          {LUCIDE_PATHS.map((d, i) => (
            <DrawPath
              key={i}
              d={d}
              index={i}
              pathLength={PATH_LENGTHS[i]}
              animated={animated && !reduced}
              ink={ink}
            />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
}

function DrawPath({
  d,
  index,
  pathLength,
  animated,
  ink,
}: {
  d: string;
  index: number;
  pathLength: number;
  animated: boolean;
  ink: string;
}) {
  const progress = useSharedValue(animated ? 0 : 1);
  const fillOpacity = useSharedValue(animated ? 0 : 1);

  useEffect(() => {
    if (!animated) {
      progress.value = 1;
      fillOpacity.value = 1;
      return;
    }
    progress.value = withDelay(
      index * STAGGER,
      withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) })
    );
    fillOpacity.value = withDelay(
      index * STAGGER + 250,
      withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })
    );
    return () => {
      cancelAnimation(progress);
      cancelAnimation(fillOpacity);
    };
  }, [animated]);

  const strokeProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(progress.value, [0, 1], [pathLength, 0]),
    opacity: progress.value > 0 ? 1 : 0,
  }));

  const fillProps = useAnimatedProps(() => ({
    fillOpacity: interpolate(fillOpacity.value, [0, 1], [0, 1]),
  }));

  // Path 2 is the leaves (filled), paths 1 & 3 are stems (stroke only)
  const isLeaves = index === 1;

  return (
    <>
      {isLeaves && (
        <AnimatedPath
          d={d}
          fill={ink}
          animatedProps={fillProps}
          stroke="none"
          fillRule="evenodd"
        />
      )}
      <AnimatedPath
        d={d}
        stroke={ink}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={pathLength}
        animatedProps={strokeProps}
      />
    </>
  );
}

// Static mark — Lucide icon component, used in headers and small contexts
export function CloverMark({ size = 32, color }: { size?: number; color?: string }) {
  const t = useTheme();
  const ink = color ?? t.colors.ink;
  return <Lucide name="clover" size={size} color={ink} />;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});
