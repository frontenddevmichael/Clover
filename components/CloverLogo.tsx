// Clover Logo — 5-leaf clover with a sequential reveal.
// Each petal fades in from the clover's heart, one after another, then the
// stem; the whole mark settles with a gentle scale. No stroke-dash
// choreography (unreliable across platforms) — the finished mark is exactly
// the static CloverMark: solid, uniform, complete. Reduce motion: instant.
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
  Easing,
  interpolate,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type CloverLogoProps = {
  size?: number;
  animated?: boolean;
  color?: string;
};

// 5 filled oval petals — each is a closed loop
// Center at (50, 38), petals radiate outward
const PETAL_PATHS = [
  // Top petal — oval pointing up
  'M 50 38 C 46 30, 42 20, 50 12 C 58 20, 54 30, 50 38 Z',
  // Top-right petal
  'M 50 38 C 56 32, 64 26, 72 30 C 68 38, 58 36, 50 38 Z',
  // Bottom-right petal
  'M 50 38 C 56 42, 64 48, 62 56 C 54 54, 52 44, 50 38 Z',
  // Bottom-left petal
  'M 50 38 C 44 42, 36 48, 38 56 C 46 54, 48 44, 50 38 Z',
  // Top-left petal
  'M 50 38 C 44 32, 36 26, 28 30 C 32 38, 42 36, 50 38 Z',
];

const STEM = 'M 50 44 C 48 52, 46 60, 48 68';

const STAGGER = 130; // ms between petals

export function CloverLogo({
  size = 80,
  animated = true,
  color,
}: CloverLogoProps) {
  const t = useTheme();
  const ink = color ?? t.colors.ink;
  const reduced = useReducedMotion() ?? false;

  // Whole-mark settle: 0.94 → 1 as the sequence completes.
  const settle = useSharedValue(!animated || reduced ? 1 : 0.94);

  useEffect(() => {
    if (!animated || reduced) return;
    settle.value = withDelay(
      STAGGER * 5,
      withSpring(1, { damping: 18, stiffness: 200, mass: 1 })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animated, reduced]);

  const settleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: settle.value }],
  }));

  return (
    <View style={styles.c}>
      <Animated.View style={settleStyle}>
        <Svg viewBox="0 0 100 80" width={size} height={size * 0.8}>
          {PETAL_PATHS.map((d, i) => (
            <RevealPetal key={i} d={d} index={i} animated={animated && !reduced} ink={ink} />
          ))}
          <RevealStem animated={animated && !reduced} ink={ink} />
        </Svg>
      </Animated.View>
    </View>
  );
}

// One petal: fades in during its slot in the sequence. Fill and stroke ride
// together — at rest the petal is exactly the static mark's rendering.
function RevealPetal({
  d,
  index,
  animated,
  ink,
}: {
  d: string;
  index: number;
  animated: boolean;
  ink: string;
}) {
  const appear = useSharedValue(animated ? 0 : 1);

  useEffect(() => {
    if (!animated) {
      appear.value = 1;
      return;
    }
    appear.value = withDelay(
      index * STAGGER,
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animated]);

  const props = useAnimatedProps(() => ({
    opacity: appear.value,
  }));

  return (
    <AnimatedPath
      d={d}
      stroke={ink}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={ink}
      fillOpacity={0.15}
      animatedProps={props}
    />
  );
}

function RevealStem({ animated, ink }: { animated: boolean; ink: string }) {
  const appear = useSharedValue(animated ? 0 : 1);

  useEffect(() => {
    if (!animated) {
      appear.value = 1;
      return;
    }
    appear.value = withDelay(
      STAGGER * 5,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animated]);

  const props = useAnimatedProps(() => ({
    opacity: appear.value,
  }));

  return (
    <AnimatedPath
      d={STEM}
      stroke={ink}
      strokeWidth={3}
      strokeLinecap="round"
      fill="none"
      animatedProps={props}
    />
  );
}

export function CloverMark({ size = 32, color }: { size?: number; color?: string }) {
  const t = useTheme();
  const ink = color ?? t.colors.ink;
  return (
    <Svg viewBox="0 0 100 80" width={size} height={size * 0.8}>
      {PETAL_PATHS.map((d, i) => (
        <Path key={i} d={d} stroke={ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill={ink} fillOpacity={0.15} />
      ))}
      <Path d={STEM} stroke={ink} strokeWidth={3} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({ c: { alignItems: 'center', justifyContent: 'center' } });
