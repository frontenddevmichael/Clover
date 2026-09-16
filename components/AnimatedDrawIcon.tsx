// AnimatedDrawIcon — SVG icon that draws its strokes on mount / key change.
// Uses strokeDashoffset animation for a hand-drawn feel.
import React, { useEffect } from 'react';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  useReducedMotion,
  cancelAnimation,
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

type DrawElement = {
  type: 'path' | 'circle' | 'line' | 'rect';
  props: Record<string, any>;
  length: number;
};

type AnimatedDrawIconProps = {
  elements: DrawElement[];
  size?: number;
  color: string;
  /** Change this key to trigger a re-draw (e.g. screen name) */
  drawKey: string;
  duration?: number;
};

export function AnimatedDrawIcon({
  elements,
  size = 26,
  color,
  drawKey,
  duration = 400,
}: AnimatedDrawIconProps) {
  const reduced = useReducedMotion() ?? false;
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
    return () => cancelAnimation(progress);
  }, [drawKey, reduced]);

  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      {elements.map((el, i) => {
        const stagger = i * 0.15;
        const animatedProps = useAnimatedProps(() => ({
          strokeDashoffset: (1 - progress.value) * el.length,
          opacity: progress.value > 0.05 ? 1 : 0,
        }));

        const common = {
          stroke: color,
          strokeWidth: el.props.strokeWidth ?? 2,
          strokeLinecap: (el.props.strokeLinecap ?? 'round') as any,
          strokeLinejoin: (el.props.strokeLinejoin ?? 'round') as any,
          fill: (el.props.fill ?? 'none') as any,
          strokeDasharray: el.length,
          animatedProps,
        };

        switch (el.type) {
          case 'path':
            return <AnimatedPath key={`${drawKey}-${i}`} d={el.props.d} {...common} />;
          case 'circle':
            return (
              <AnimatedCircle
                key={`${drawKey}-${i}`}
                cx={el.props.cx}
                cy={el.props.cy}
                r={el.props.r}
                {...common}
              />
            );
          case 'line':
            return (
              <AnimatedLine
                key={`${drawKey}-${i}`}
                x1={el.props.x1}
                y1={el.props.y1}
                x2={el.props.x2}
                y2={el.props.y2}
                {...common}
              />
            );
          case 'rect':
            return (
              <AnimatedRect
                key={`${drawKey}-${i}`}
                x={el.props.x}
                y={el.props.y}
                width={el.props.width}
                height={el.props.height}
                rx={el.props.rx}
                {...common}
              />
            );
          default:
            return null;
        }
      })}
    </Svg>
  );
}

// ── Pre-built icon element sets ──

export const CTA_ICONS = {
  plus: (color: string): DrawElement[] => [
    { type: 'line', props: { x1: 12, y1: 5, x2: 12, y2: 19, strokeWidth: 2.5 }, length: 14 },
    { type: 'line', props: { x1: 5, y1: 12, x2: 19, y2: 12, strokeWidth: 2.5 }, length: 14 },
  ],
  flag: (color: string): DrawElement[] => [
    { type: 'line', props: { x1: 7, y1: 4, x2: 7, y2: 20 }, length: 16 },
    { type: 'path', props: { d: 'M7 5 H17 L14.5 8.5 L17 12 H7' }, length: 40 },
  ],
  sparkle: (color: string): DrawElement[] => [
    { type: 'path', props: { d: 'M12 3 L14 9 L20 11 L14 13 L12 19 L10 13 L4 11 L10 9 Z' }, length: 60 },
    { type: 'circle', props: { cx: 18.5, cy: 5.5, r: 1, strokeWidth: 0 }, length: 6 },
  ],
  user: (color: string): DrawElement[] => [
    { type: 'circle', props: { cx: 12, cy: 8, r: 4 }, length: 25 },
    { type: 'path', props: { d: 'M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8' }, length: 30 },
  ],
} as const;
