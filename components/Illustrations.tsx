// Clover illustration system — hand-drawn monoline, one consistent weight.
// Single 1.5px stroke, round caps, slightly irregular paths (DESIGN.md).
// Every draw-in animation has a static reduce-motion fallback (§9).
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import { useTheme } from '@/lib/theme';
import { colors as baseColors } from '@/lib/tokens';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useReducedMotion } from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const STROKE = 1.5;
const ROUND = 'round' as const;

type IconProps = { size?: number; color?: string; strokeWidth?: number };

// ── UI icon set (monoline, 24×24 grid) ────────────────────
// Static by design — icons never idle-animate. The hand-drawn feel comes
// from the slightly uneven curves baked into the paths.

export function IconFlag({ size = 20, color, strokeWidth = STROKE }: IconProps) {
  const t = useTheme();
  const ink = color ?? t.colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Line x1="6" y1="4" x2="6" y2="21" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} />
      <Path d="M6 4.8 C9.5 3.6, 12.5 6, 16.8 4.9 L15.2 8.6 L16.8 12.1 C12.5 13.2, 9.5 10.8, 6 12" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} strokeLinejoin={ROUND} fill="none" />
    </Svg>
  );
}

export function IconTarget({ size = 20, color, strokeWidth = STROKE }: IconProps) {
  const t = useTheme();
  const ink = color ?? t.colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Circle cx="12" cy="12" r="8.2" stroke={ink} strokeWidth={strokeWidth} fill="none" />
      <Circle cx="12" cy="12" r="4.4" stroke={ink} strokeWidth={strokeWidth} fill="none" />
      <Circle cx="12" cy="12" r="1" fill={ink} />
    </Svg>
  );
}

export function IconBarChart({ size = 20, color, strokeWidth = STROKE }: IconProps) {
  const t = useTheme();
  const ink = color ?? t.colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Line x1="3.8" y1="20.2" x2="20.2" y2="20.2" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} />
      <Line x1="6.5" y1="20" x2="6.5" y2="13.5" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} />
      <Line x1="12" y1="20" x2="12" y2="8.8" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} />
      <Line x1="17.5" y1="20" x2="17.5" y2="4.2" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} />
    </Svg>
  );
}

export function IconClock({ size = 20, color, strokeWidth = STROKE }: IconProps) {
  const t = useTheme();
  const ink = color ?? t.colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Circle cx="12" cy="12" r="8.2" stroke={ink} strokeWidth={strokeWidth} fill="none" />
      <Path d="M12 7.5 V12 L15 13.8" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} strokeLinejoin={ROUND} fill="none" />
    </Svg>
  );
}

export function IconCalendar({ size = 20, color, strokeWidth = STROKE }: IconProps) {
  const t = useTheme();
  const ink = color ?? t.colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Rect x="4" y="5.5" width="16" height="14.5" rx="2.5" stroke={ink} strokeWidth={strokeWidth} fill="none" />
      <Line x1="8.2" y1="3.2" x2="8.2" y2="7.4" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} />
      <Line x1="15.8" y1="3.2" x2="15.8" y2="7.4" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} />
      <Line x1="4" y1="10.2" x2="20" y2="10.2" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} />
      <Line x1="8" y1="14" x2="8.01" y2="14" stroke={ink} strokeWidth={strokeWidth * 1.4} strokeLinecap={ROUND} />
      <Line x1="12" y1="14" x2="12.01" y2="14" stroke={ink} strokeWidth={strokeWidth * 1.4} strokeLinecap={ROUND} />
    </Svg>
  );
}

export function IconUsers({ size = 20, color, strokeWidth = STROKE }: IconProps) {
  const t = useTheme();
  const ink = color ?? t.colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Circle cx="9" cy="8.4" r="3.1" stroke={ink} strokeWidth={strokeWidth} fill="none" />
      <Circle cx="16.6" cy="9.6" r="2.4" stroke={ink} strokeWidth={strokeWidth} fill="none" />
      <Path d="M3.6 19 C3.6 15.4, 6 13.9, 9 13.9 C12 13.9, 14.4 15.4, 14.4 19" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} fill="none" />
      <Path d="M16 14.6 C18.5 14.9, 20.4 16.3, 20.4 19" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} fill="none" />
    </Svg>
  );
}

export function IconBell({ size = 20, color, strokeWidth = STROKE }: IconProps) {
  const t = useTheme();
  const ink = color ?? t.colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M6.2 15.6 V10.8 C6.2 7.6, 8.8 5, 12 5 C15.2 5, 17.8 7.6, 17.8 10.8 V15.6" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} fill="none" />
      <Line x1="4.4" y1="15.8" x2="19.6" y2="15.8" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} />
      <Path d="M10.4 18.6 C10.4 19.7, 11.1 20.3, 12 20.3 C12.9 20.3, 13.6 19.7, 13.6 18.6" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} fill="none" />
    </Svg>
  );
}

export function IconGraduationCap({ size = 20, color, strokeWidth = STROKE }: IconProps) {
  const t = useTheme();
  const ink = color ?? t.colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M2.4 9.4 L12 4.6 L21.6 9.4 L12 14.2 Z" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} strokeLinejoin={ROUND} fill="none" />
      <Path d="M6.4 11.6 V15.2 C6.4 16.9, 8.8 18.3, 12 18.3 C15.2 18.3, 17.6 16.9, 17.6 15.2 V11.6" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} fill="none" />
      <Line x1="21" y1="10" x2="21" y2="14.6" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} />
    </Svg>
  );
}

export function IconSparkle({ size = 20, color, strokeWidth = STROKE }: IconProps) {
  const t = useTheme();
  const ink = color ?? t.colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M12 4.2 C12.7 8.1, 15.6 11.1, 19.8 12 C15.6 12.9, 12.7 15.9, 12 19.8 C11.3 15.9, 8.4 12.9, 4.2 12 C8.4 11.1, 11.3 8.1, 12 4.2 Z" stroke={ink} strokeWidth={strokeWidth} strokeLinejoin={ROUND} fill="none" />
      <Circle cx="18.6" cy="5.6" r="0.9" fill={ink} />
    </Svg>
  );
}

export function IconFileText({ size = 20, color, strokeWidth = STROKE }: IconProps) {
  const t = useTheme();
  const ink = color ?? t.colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M6 3.6 L14.2 3.6 L19 8.4 L19 20.4 L6 20.4 Z" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} strokeLinejoin={ROUND} fill="none" />
      <Path d="M14 4 L14 8.6 L18.6 8.6" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} strokeLinejoin={ROUND} fill="none" />
      <Line x1="9" y1="12.4" x2="15.8" y2="12.4" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} />
      <Line x1="9" y1="15.8" x2="15.8" y2="15.8" stroke={ink} strokeWidth={strokeWidth} strokeLinecap={ROUND} />
    </Svg>
  );
}

// ── Hand-drawn scene illustrations (animate on mount) ─────
// A line sketches itself in; reduce-motion renders the finished drawing.

export function CalendarIllustration({ size = 96 }: { size?: number }) {
  const reduced = useReducedMotion() ?? false;
  const p = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      p.value = 1;
      return;
    }
    p.value = withDelay(200, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [reduced]);

  return (
    <View style={{ width: size, height: size }}>
      <Svg viewBox="0 0 120 120" width={size} height={size}>
        <CalBody p={p} />
      </Svg>
    </View>
  );
}

function CalBody({ p }: { p: ReturnType<typeof useSharedValue<number>> }) {
  const t = useTheme();
  const bodyProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(p.value, [0, 0.55], [300, 0]),
    opacity: interpolate(p.value, [0, 0.03], [0, 1]),
  }));
  const hookProps = useAnimatedProps(() => ({
    opacity: interpolate(p.value, [0.1, 0.3], [0, 1]),
  }));
  const gridProps = useAnimatedProps(() => ({
    opacity: interpolate(p.value, [0.25, 0.45], [0, 0.4]),
  }));
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(p.value, [0.55, 1], [50, 0]),
    opacity: interpolate(p.value, [0.55, 0.62], [0, 1]),
  }));

  return (
    <>
      <AnimatedPath
        d="M 25 35 L 95 35 L 95 95 L 25 95 Z"
        stroke={t.colors.ink}
        strokeWidth={STROKE}
        strokeLinecap={ROUND}
        strokeLinejoin={ROUND}
        fill="none"
        strokeDasharray={300}
        animatedProps={bodyProps}
      />
      <AnimatedLine x1="40" y1="25" x2="40" y2="40" stroke={t.colors.ink} strokeWidth={STROKE} strokeLinecap={ROUND} animatedProps={hookProps} />
      <AnimatedLine x1="80" y1="25" x2="80" y2="40" stroke={t.colors.ink} strokeWidth={STROKE} strokeLinecap={ROUND} animatedProps={hookProps} />
      <AnimatedLine x1="25" y1="55" x2="95" y2="55" stroke={baseColors.neutral300} strokeWidth={0.75} strokeLinecap={ROUND} animatedProps={gridProps} />
      <AnimatedLine x1="25" y1="72" x2="95" y2="72" stroke={baseColors.neutral300} strokeWidth={0.75} strokeLinecap={ROUND} animatedProps={gridProps} />
      <AnimatedPath
        d="M 45 75 L 55 85 L 75 60"
        stroke={t.colors.ink}
        strokeWidth={2}
        strokeLinecap={ROUND}
        strokeLinejoin={ROUND}
        fill="none"
        strokeDasharray={50}
        animatedProps={checkProps}
      />
    </>
  );
}

export function BookIllustration({ size = 96 }: { size?: number }) {
  const reduced = useReducedMotion() ?? false;
  const p = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      p.value = 1;
      return;
    }
    p.value = withDelay(300, withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }));
  }, [reduced]);

  return (
    <View style={{ width: size, height: size }}>
      <Svg viewBox="0 0 120 120" width={size} height={size}>
        <BookBody p={p} />
      </Svg>
    </View>
  );
}

function BookBody({ p }: { p: ReturnType<typeof useSharedValue<number>> }) {
  const t = useTheme();
  const bodyProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(p.value, [0, 0.5], [250, 0]),
    opacity: interpolate(p.value, [0, 0.03], [0, 1]),
  }));
  const spineProps = useAnimatedProps(() => ({
    opacity: interpolate(p.value, [0.3, 0.5], [0, 1]),
  }));

  return (
    <>
      <AnimatedPath
        d="M 30 25 L 60 30 L 90 25 L 90 90 L 60 95 L 30 90 Z"
        stroke={t.colors.ink}
        strokeWidth={STROKE}
        strokeLinecap={ROUND}
        strokeLinejoin={ROUND}
        fill="none"
        strokeDasharray={250}
        animatedProps={bodyProps}
      />
      <AnimatedLine x1="60" y1="30" x2="60" y2="95" stroke={t.colors.ink} strokeWidth={STROKE} strokeLinecap={ROUND} animatedProps={spineProps} />
      {[40, 50, 60, 70, 80].map((y, i) => (
        <TextLine key={`l${i}`} p={p} x1={37} x2={55} y={y} from={0.4 + i * 0.05} />
      ))}
      {[40, 50, 60, 70, 80].map((y, i) => (
        <TextLine key={`r${i}`} p={p} x1={65} x2={83} y={y} from={0.45 + i * 0.05} />
      ))}
    </>
  );
}

function TextLine({
  p,
  x1,
  x2,
  y,
  from,
}: {
  p: ReturnType<typeof useSharedValue<number>>;
  x1: number;
  x2: number;
  y: number;
  from: number;
}) {
  const props = useAnimatedProps(() => ({
    opacity: interpolate(p.value, [from, from + 0.1], [0, 0.5]),
  }));
  return (
    <AnimatedLine x1={x1} y1={y} x2={x2} y2={y + 1} stroke={baseColors.neutral300} strokeWidth={0.75} strokeLinecap={ROUND} animatedProps={props} />
  );
}
