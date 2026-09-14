// Clover Logo — refined 5-leaf clover with draw-on stroke animation.
// Each petal draws itself in sequentially via stroke-dashoffset, then the stem
// draws down. The whole mark bounces gently at the end.
// Reduce motion: instant fade-in of the complete mark.
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
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
import { useTheme } from '@/lib/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type CloverLogoProps = {
  size?: number;
  animated?: boolean;
  color?: string;
};

// 5 heart-shaped petals radiating from center (50, 40)
// Each petal is a closed bezier loop — more organic than ovals
const PETAL_PATHS = [
  // Top petal (pointing up)
  'M 50 40 C 47 34, 40 24, 44 16 C 48 10, 52 10, 56 16 C 60 24, 53 34, 50 40 Z',
  // Top-right petal
  'M 50 40 C 54 35, 62 28, 70 30 C 76 32, 76 38, 70 42 C 62 46, 54 42, 50 40 Z',
  // Bottom-right petal
  'M 50 40 C 55 43, 64 50, 64 58 C 64 64, 58 66, 52 62 C 46 58, 48 46, 50 40 Z',
  // Bottom-left petal
  'M 50 40 C 45 43, 36 50, 36 58 C 36 64, 42 66, 48 62 C 54 58, 52 46, 50 40 Z',
  // Top-left petal
  'M 50 40 C 46 35, 38 28, 30 30 C 24 32, 24 38, 30 42 C 38 46, 46 42, 50 40 Z',
];

const STEM = 'M 50 46 C 49 54, 47 62, 48 70';

// Stroke lengths for dash animation (approximate path lengths)
const PETAL_LENGTHS = [68, 72, 72, 72, 72];
const STEM_LENGTH = 28;

const STAGGER = 140; // ms between petals

export function CloverLogo({
  size = 80,
  animated = true,
  color,
}: CloverLogoProps) {
  const t = useTheme();
  const ink = color ?? t.colors.ink;
  const reduced = useReducedMotion() ?? false;

  // Whole-mark bounce: 0.92 → 1.06 → 1
  const bounce = useSharedValue(!animated || reduced ? 1 : 0.92);

  useEffect(() => {
    if (!animated || reduced) return;
    bounce.value = withDelay(
      STAGGER * 5 + 200,
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
    <View style={styles.container}>
      <Animated.View style={bounceStyle}>
        <Svg viewBox="0 0 100 80" width={size} height={size * 0.8}>
          {PETAL_PATHS.map((d, i) => (
            <DrawPetal
              key={i}
              d={d}
              index={i}
              pathLength={PETAL_LENGTHS[i]}
              animated={animated && !reduced}
              ink={ink}
            />
          ))}
          <DrawStem animated={animated && !reduced} ink={ink} />
          {/* Center dot — always visible */}
          <Circle cx="50" cy="40" r="2.5" fill={ink} />
        </Svg>
      </Animated.View>
    </View>
  );
}

// One petal that draws its stroke, then fills in
function DrawPetal({
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
  const fillOpacity = useSharedValue(animated ? 0 : 0.18);

  useEffect(() => {
    if (!animated) {
      progress.value = 1;
      fillOpacity.value = 0.18;
      return;
    }
    // Draw stroke
    progress.value = withDelay(
      index * STAGGER,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) })
    );
    // Fill in after stroke completes
    fillOpacity.value = withDelay(
      index * STAGGER + 200,
      withTiming(0.18, { duration: 200, easing: Easing.out(Easing.cubic) })
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
    fillOpacity: fillOpacity.value,
  }));

  return (
    <>
      {/* Fill layer (fades in after stroke) */}
      <AnimatedPath d={d} fill={ink} animatedProps={fillProps} stroke="none" />
      {/* Stroke layer (draws on) */}
      <AnimatedPath
        d={d}
        stroke={ink}
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={pathLength}
        animatedProps={strokeProps}
      />
    </>
  );
}

// Stem draws down after petals
function DrawStem({ animated, ink }: { animated: boolean; ink: string }) {
  const progress = useSharedValue(animated ? 0 : 1);

  useEffect(() => {
    if (!animated) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      STAGGER * 5,
      withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) })
    );
    return () => cancelAnimation(progress);
  }, [animated]);

  const props = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(progress.value, [0, 1], [STEM_LENGTH, 0]),
    opacity: progress.value > 0 ? 1 : 0,
  }));

  return (
    <AnimatedPath
      d={STEM}
      stroke={ink}
      strokeWidth={3}
      strokeLinecap="round"
      fill="none"
      strokeDasharray={STEM_LENGTH}
      animatedProps={props}
    />
  );
}

// Static mark — no animation, used in headers and small contexts
export function CloverMark({ size = 32, color }: { size?: number; color?: string }) {
  const t = useTheme();
  const ink = color ?? t.colors.ink;
  return (
    <Svg viewBox="0 0 100 80" width={size} height={size * 0.8}>
      {PETAL_PATHS.map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={ink}
          strokeWidth={2.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={ink}
          fillOpacity={0.18}
        />
      ))}
      <Path d={STEM} stroke={ink} strokeWidth={3} strokeLinecap="round" fill="none" />
      <Circle cx="50" cy="40" r="2.5" fill={ink} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});
