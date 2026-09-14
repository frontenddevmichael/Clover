// Signature elements — Clover's quiet identity marks.
// A hand-drawn wave that sketches itself in once, and the greeting banner.
// No idle/looping animation: at rest everything is still (ui-prompt §8).
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '@/lib/theme';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  useReducedMotion,
} from 'react-native-reanimated';
import { CloverMark } from '@/components/CloverLogo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─── Wave Divider — hand-drawn, draws in once, then holds still ──
export function WaveDivider({ width = SCREEN_WIDTH - 40 }: { width?: number }) {
  const t = useTheme();
  const reduced = useReducedMotion() ?? false;
  const p = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      p.value = 1;
      return;
    }
    p.value = withDelay(300, withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }));
  }, [reduced]);

  const pathAnimProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(p.value, [0, 1], [width, 0]),
    opacity: interpolate(p.value, [0, 0.1], [0, 1]),
  }));

  return (
    <View style={{ alignItems: 'center', paddingVertical: t.spacing[3] }}>
      <Svg viewBox={`0 0 ${width} 16`} width={width} height={16}>
        <AnimatedPath
          d={`M 0 8 Q ${width * 0.125} 4.5, ${width * 0.25} 8 T ${width * 0.5} 7.6 T ${width * 0.75} 8.3 T ${width} 7.8`}
          stroke={t.colors.hairline}
          strokeWidth={1}
          strokeLinecap="round"
          fill="none"
          animatedProps={pathAnimProps}
          strokeDasharray={width}
        />
        <Circle cx={width * 0.5} cy="8" r="1.5" fill={t.colors.inkFaint} opacity={0.5} />
      </Svg>
    </View>
  );
}

// ─── Greeting Banner — time-aware, marked by the Clover mark ──
export function GreetingBanner({ name }: { name: string }) {
  const t = useTheme();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing[3],
        paddingHorizontal: t.spacing[5],
        paddingTop: t.spacing[12],
        paddingBottom: t.spacing[1],
      }}
    >
      <CloverMark size={28} color={t.colors.ink} />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: t.typography.caption,
            color: t.colors.inkSecondary,
            fontWeight: t.typography.medium,
          }}
        >
          {greeting}
        </Text>
        <Text
          style={{
            fontSize: t.typography.secondary,
            color: t.colors.ink,
            fontWeight: t.typography.semibold,
            marginTop: t.spacing[0.5],
          }}
        >
          {name}
        </Text>
      </View>
    </View>
  );
}
