// Apple-like spring configurations
// Tuned to match CASpringAnimation feel from iOS
// Reference: stiffness controls speed, damping controls bounce, mass controls weight

import { Easing } from 'react-native-reanimated';

// ─── Spring presets ──────────────────────────────────────
// Apple's default spring: gentle overshoot, quick settle
export const SPRING_GENTLE = {
  damping: 14,
  stiffness: 120,
  mass: 1,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
};

// Apple's snappy spring: minimal bounce, fast settle (for tabs, pills)
export const SPRING_SNAPPY = {
  damping: 20,
  stiffness: 200,
  mass: 0.8,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
};

// Apple's bouncy spring: playful overshoot (for FAB, fun elements)
export const SPRING_BOUNCY = {
  damping: 10,
  stiffness: 180,
  mass: 0.9,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
};

// Apple's heavy spring: slow, weighty (for large panels, sheets)
export const SPRING_HEAVY = {
  damping: 18,
  stiffness: 80,
  mass: 1.5,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
};

// Apple's scale spring: for press/hover feedback
export const SPRING_SCALE = {
  damping: 15,
  stiffness: 250,
  mass: 0.7,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
};

// ─── Timing presets ──────────────────────────────────────
export const TIMING_FAST = {
  duration: 150,
  easing: Easing.out(Easing.cubic),
};

export const TIMING_NORMAL = {
  duration: 250,
  easing: Easing.out(Easing.cubic),
};

export const TIMING_SLOW = {
  duration: 400,
  easing: Easing.out(Easing.cubic),
};

// ─── Stagger config ──────────────────────────────────────
// For list items entering sequentially
export const STAGGER = {
  delay: (index: number, staggerMs = 40) => index * staggerMs,
};
