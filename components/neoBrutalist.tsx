// Neo-brutalist decorative components — strategic wow-factors
// Thick borders, offset shadows, geometric shapes, bold stamps
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Rect, Circle, Path, Line } from 'react-native-svg';
import { useTheme } from '@/lib/theme';

// ── CornerStamp ──────────────────────────────────────────────────────────────
// Rotated stamp badge in a corner. Can be functional (tap) or decorative.
type CornerStampProps = {
  label: string;
  color?: string;
  textColor?: string;
  rotation?: number;
  onPress?: () => void;
  style?: any;
};

export function CornerStamp({
  label,
  color,
  textColor,
  rotation = -12,
  onPress,
  style,
}: CornerStampProps) {
  const t = useTheme();
  const bg = color || t.colors.ink;
  const fg = textColor || t.colors.fillInk;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      tension: 120,
      friction: 8,
      delay: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.stamp,
        {
          backgroundColor: bg,
          transform: [{ rotate: `${rotation}deg` }, { scale }],
        },
        style,
      ]}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={label}
    >
      <Text style={[styles.stampText, { color: fg }]}>{label}</Text>
    </Animated.View>
  );
}

// ── OffsetShadow ─────────────────────────────────────────────────────────────
// Wraps children with a hard-offset black shadow. Pure decorative.
type OffsetShadowProps = {
  children: React.ReactNode;
  offset?: number;
  color?: string;
  style?: any;
};

export function OffsetShadow({ children, offset = 4, color, style }: OffsetShadowProps) {
  const t = useTheme();
  const shadowColor = color || t.colors.neutral950;
  return (
    <View
      style={[
        {
          shadowColor,
          shadowOffset: { width: offset, height: offset },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: offset + 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ── GeoDots ──────────────────────────────────────────────────────────────────
// Geometric dot grid pattern divider. Decorative separator.
type GeoDotsProps = {
  rows?: number;
  cols?: number;
  dotSize?: number;
  gap?: number;
  color?: string;
  style?: any;
};

export function GeoDots({
  rows = 3,
  cols = 12,
  dotSize = 4,
  gap = 8,
  color,
  style,
}: GeoDotsProps) {
  const t = useTheme();
  const c = color || t.colors.neutral350;
  const w = cols * (dotSize + gap);
  const h = rows * (dotSize + gap);

  const dots = [];
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      dots.push(
        <Rect
          key={`${r}-${col}`}
          x={col * (dotSize + gap)}
          y={r * (dotSize + gap)}
          width={dotSize}
          height={dotSize}
          rx={dotSize / 2}
          fill={c}
        />
      );
    }
  }

  return (
    <View style={[{ alignItems: 'center', paddingVertical: 12 }, style]}>
      <Svg width={w} height={h}>
        {dots}
      </Svg>
    </View>
  );
}

// ── BoldDivider ──────────────────────────────────────────────────────────────
// Thick horizontal line with optional geometric shape in center.
type BoldDividerProps = {
  shape?: 'diamond' | 'circle' | 'square' | 'none';
  color?: string;
  thickness?: number;
  style?: any;
};

export function BoldDivider({
  shape = 'diamond',
  color,
  thickness = 3,
  style,
}: BoldDividerProps) {
  const t = useTheme();
  const c = color || t.colors.ink;
  const size = 12;

  return (
    <View style={[styles.dividerRow, style]}>
      <View style={[styles.dividerLine, { height: thickness, backgroundColor: c }]} />
      {shape !== 'none' && (
        <View style={{ marginHorizontal: 8 }}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {shape === 'diamond' && (
              <Rect x={2} y={2} width={8} height={8} rx={1} fill={c} transform="rotate(45 6 6)" />
            )}
            {shape === 'circle' && <Circle cx={6} cy={6} r={5} fill={c} />}
            {shape === 'square' && <Rect x={1} y={1} width={10} height={10} rx={1} fill={c} />}
          </Svg>
        </View>
      )}
      <View style={[styles.dividerLine, { height: thickness, backgroundColor: c }]} />
    </View>
  );
}

// ── ThickFrame ───────────────────────────────────────────────────────────────
// Wraps content in a thick black border frame. Neo-brutalist card variant.
type ThickFrameProps = {
  children: React.ReactNode;
  borderWidth?: number;
  borderColor?: string;
  style?: any;
};

export function ThickFrame({
  children,
  borderWidth = 3,
  borderColor,
  style,
}: ThickFrameProps) {
  const t = useTheme();
  const c = borderColor || t.colors.ink;
  return (
    <View
      style={[
        {
          borderWidth,
          borderColor: c,
          borderRadius: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ── FloatingTag ──────────────────────────────────────────────────────────────
// Small floating tag with thick border. Can be positioned absolutely.
type FloatingTagProps = {
  label: string;
  color?: string;
  textColor?: string;
  position?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  style?: any;
};

export function FloatingTag({
  label,
  color,
  textColor,
  position = 'topRight',
  style,
}: FloatingTagProps) {
  const t = useTheme();
  const bg = color || t.colors.neutral950;
  const fg = textColor || t.colors.fillInk;

  const posStyle: any = {
    topLeft: { top: -6, left: -6 },
    topRight: { top: -6, right: -6 },
    bottomLeft: { bottom: -6, left: -6 },
    bottomRight: { bottom: -6, right: -6 },
  };

  return (
    <View
      style={[
        styles.floatingTag,
        { backgroundColor: bg, borderColor: bg },
        posStyle[position],
        style,
      ]}
    >
      <Text style={[styles.floatingTagText, { color: fg }]}>{label}</Text>
    </View>
  );
}

// ── StripedAccent ────────────────────────────────────────────────────────────
// Diagonal stripe pattern background. Pure decorative overlay.
type StripedAccentProps = {
  color?: string;
  opacity?: number;
  style?: any;
};

export function StripedAccent({ color, opacity = 0.06, style }: StripedAccentProps) {
  const t = useTheme();
  const c = color || t.colors.neutral950;
  const stripeW = 8;

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', opacity }, style]}>
      <Svg width="200%" height="200%" viewBox="0 0 400 400">
        {Array.from({ length: 60 }).map((_, i) => (
          <Line
            key={i}
            x1={i * stripeW * 2 - 200}
            y1={0}
            x2={i * stripeW * 2 + 400}
            y2={400}
            stroke={c}
            strokeWidth={stripeW}
          />
        ))}
      </Svg>
    </View>
  );
}

// ── CountBadge ───────────────────────────────────────────────────────────────
// Bold count badge with thick border. Animated count-in.
type CountBadgeProps = {
  count: number;
  color?: string;
  textColor?: string;
  size?: number;
  style?: any;
};

export function CountBadge({
  count,
  color,
  textColor,
  size = 28,
  style,
}: CountBadgeProps) {
  const t = useTheme();
  const bg = color || t.colors.ink;
  const fg = textColor || t.colors.fillInk;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.spring(scale, {
        toValue: 1,
        tension: 150,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [count]);

  return (
    <Animated.View
      style={[
        styles.countBadge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderWidth: 2,
          borderColor: bg,
          transform: [{ scale }],
        },
        style,
      ]}
    >
      <Text style={[styles.countBadgeText, { color: fg, fontSize: size * 0.45 }]}>
        {count}
      </Text>
    </Animated.View>
  );
}

// ── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  stamp: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 2,
    alignSelf: 'flex-start',
  },
  stampText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
  },
  floatingTag: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 10,
  },
  floatingTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  countBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontWeight: '900',
  },
});
