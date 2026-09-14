// Skeleton Loader with shimmer sweep — liquid glass style
// Contextual shapes that match the content being loaded
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/lib/theme';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

// ─── Shimmer sweep SVG ──────────────────────────────────
function ShimmerSweep({ width, height, borderRadius = 8 }: { width: number; height: number; borderRadius?: number }) {
  const t = useTheme();
  const x = useSharedValue(-width);

  useEffect(() => {
    x.value = withRepeat(
      withTiming(width, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, [width]);

  const props = useAnimatedProps(() => ({
    x: x.value,
  }));

  return (
    <View
      style={{
        width,
        height,
        borderRadius,
        overflow: 'hidden',
        backgroundColor: t.colors.subtleFill,
      }}
    >
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={t.colors.shimmerFrom} />
            <Stop offset="0.5" stopColor={t.colors.shimmerMid} />
            <Stop offset="1" stopColor={t.colors.shimmerFrom} />
          </LinearGradient>
        </Defs>
        <AnimatedRect x={0} y={0} width={width * 0.5} height={height} fill="url(#shimmer)" animatedProps={props} />
      </Svg>
    </View>
  );
}

// ─── Schedule skeleton — timetable cards ─────────────────
export function ScheduleSkeleton() {
  const t = useTheme();
  return (
    <View style={{ padding: 20, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <ShimmerSweep width={140} height={28} borderRadius={6} />
        <ShimmerSweep width={60} height={20} borderRadius={10} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <View key={i} style={{ alignItems: 'center', paddingVertical: 8 }}>
            <ShimmerSweep width={32} height={12} borderRadius={4} />
            <View style={{ height: 4 }} />
            <ShimmerSweep width={8} height={8} borderRadius={4} />
          </View>
        ))}
      </View>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            backgroundColor: t.colors.tier1,
            borderRadius: t.radii.card,
            borderWidth: 1,
            borderColor: t.colors.hairline,
            padding: t.spacing[4],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40 }}>
              <ShimmerSweep width={40} height={12} borderRadius={4} />
              <View style={{ height: 4 }} />
              <ShimmerSweep width={40} height={12} borderRadius={4} />
            </View>
            <View style={{ flex: 1 }}>
              <ShimmerSweep width={80} height={16} borderRadius={4} />
              <View style={{ height: 6 }} />
              <ShimmerSweep width={140} height={12} borderRadius={4} />
              <View style={{ height: 8 }} />
              <ShimmerSweep width={60} height={20} borderRadius={10} />
            </View>
            <ShimmerSweep width={28} height={28} borderRadius={8} />
          </View>
        </View>
      ))}
    </View>
  );
}
