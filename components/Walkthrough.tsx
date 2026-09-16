// Walkthrough — 4-screen feature tour shown once after first signup.
// Each screen: animated mock card + bold headline + staggered entrance.
// Neo-brutalist decor: ThickFrame, CornerStamp, BoldDivider, GeoDots.
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  interpolate,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme, useStyles, type Theme } from '@/lib/theme';
import { ThickFrame, CornerStamp, BoldDivider, GeoDots } from '@/components/neoBrutalist';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WALKTHROUGH_KEY = '@clover_has_seen_walkthrough';

const SPRING = { damping: 20, stiffness: 200, mass: 0.8 };

type WalkthroughProps = {
  onComplete: () => void;
};

// ── Feature data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    id: 'schedule',
    stamp: 'PLAN',
    title: 'Plan your week',
    subtitle: 'See your classes, study sessions, and deadlines at a glance.',
    colorKey: 'workloadBalanced' as const,
  },
  {
    id: 'courses',
    stamp: 'TRACK',
    title: 'Track your courses',
    subtitle: 'Each course gets its own color tag and session list.',
    colorKey: 'courseTag1' as const,
  },
  {
    id: 'deadlines',
    stamp: 'NEVER MISS',
    title: 'Never miss a deadline',
    subtitle: 'Countdown badges and urgent alerts keep you on track.',
    colorKey: 'workloadHeavy' as const,
  },
  {
    id: 'assistant',
    stamp: 'AI',
    title: 'Let AI plan your week',
    subtitle: 'Describe what changed and get a new plan in seconds.',
    colorKey: 'courseTag2' as const,
  },
] as const;

const FEATURE_COLORS: Record<string, string> = {
  workloadBalanced: '#8FB3D9',
  courseTag1: '#B5C9A8',
  workloadHeavy: '#E0B673',
  courseTag2: '#D4B8C9',
};

// ── Mock card illustrations ──────────────────────────────────────────────────

function MockScheduleCard({ t, anim }: { t: Theme; anim: SharedValue<number> }) {
  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(anim.value, [0, 0.3], [0, 1]),
    transform: [{ translateY: interpolate(anim.value, [0, 0.3], [30, 0]) }],
  }));
  return (
    <Animated.View style={cardStyle}>
      <ThickFrame borderWidth={2} style={{ borderRadius: 4, backgroundColor: t.colors.surface, padding: 16, width: 220 }}>
        <CornerStamp label="MON" color={t.colors.ink} style={{ position: 'absolute', top: -8, right: 8, zIndex: 10 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: t.colors.ink }}>09:00</Text>
            <View style={{ width: 1, height: 20, backgroundColor: t.colors.hairline }} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: t.colors.ink }}>10:00</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: t.colors.ink }}>MTH201</Text>
            <Text style={{ fontSize: 11, color: t.colors.inkSecondary }}>Linear Algebra</Text>
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
              <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: t.colors.courseTags[1] }}>
                <Text style={{ fontSize: 9, fontWeight: '600', color: t.colors.ink }}>lecture</Text>
              </View>
              <Text style={{ fontSize: 10, color: t.colors.inkFaint }}>LT1</Text>
            </View>
          </View>
        </View>
      </ThickFrame>
    </Animated.View>
  );
}

function MockCourseCard({ t, anim }: { t: Theme; anim: SharedValue<number> }) {
  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(anim.value, [0, 0.3], [0, 1]),
    transform: [{ translateY: interpolate(anim.value, [0, 0.3], [30, 0]) }],
  }));
  return (
    <Animated.View style={cardStyle}>
      <ThickFrame borderWidth={2} style={{ borderRadius: 4, backgroundColor: t.colors.surface, padding: 16, width: 220 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 4, height: 40, borderRadius: 2, backgroundColor: t.colors.courseTags[1] }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: t.colors.ink }}>MTH201</Text>
            <Text style={{ fontSize: 11, color: t.colors.inkSecondary }}>Linear Algebra I</Text>
            <Text style={{ fontSize: 10, color: t.colors.inkFaint, marginTop: 4 }}>3 sessions / week</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 10 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.colors.courseTags[1], alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: t.colors.ink }}>3x</Text>
          </View>
        </View>
      </ThickFrame>
    </Animated.View>
  );
}

function MockDeadlineCard({ t, anim }: { t: Theme; anim: SharedValue<number> }) {
  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(anim.value, [0, 0.3], [0, 1]),
    transform: [{ translateY: interpolate(anim.value, [0, 0.3], [30, 0]) }],
  }));
  return (
    <Animated.View style={cardStyle}>
      <ThickFrame borderWidth={2} style={{ borderRadius: 4, backgroundColor: t.colors.surface, padding: 16, width: 220 }}>
        <CornerStamp label="URGENT" color={t.colors.workloadOverloadedBg} style={{ position: 'absolute', top: -8, left: 8, zIndex: 10 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.workloadOverloadedBg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '900', color: '#fff' }}>2</Text>
            <Text style={{ fontSize: 8, fontWeight: '700', color: '#fff', marginTop: -2 }}>days</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: t.colors.ink }}>Essay 2</Text>
            <Text style={{ fontSize: 11, color: t.colors.inkSecondary }}>MTH201 · Assignment</Text>
            <Text style={{ fontSize: 10, color: t.colors.workloadOverloaded, marginTop: 4 }}>Tomorrow</Text>
          </View>
        </View>
      </ThickFrame>
    </Animated.View>
  );
}

function MockAssistantCard({ t, anim }: { t: Theme; anim: SharedValue<number> }) {
  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(anim.value, [0, 0.3], [0, 1]),
    transform: [{ translateY: interpolate(anim.value, [0, 0.3], [30, 0]) }],
  }));
  return (
    <Animated.View style={cardStyle}>
      <ThickFrame borderWidth={2} style={{ borderRadius: 4, backgroundColor: t.colors.surface, padding: 16, width: 220 }}>
        <CornerStamp label="AI" color={t.colors.fill} textColor={t.colors.fillInk} style={{ position: 'absolute', top: -8, right: 8, zIndex: 10 }} />
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.fill, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 18 }}>✦</Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: t.colors.ink, textAlign: 'center' }}>Plan your week</Text>
          <Text style={{ fontSize: 11, color: t.colors.inkSecondary, textAlign: 'center', marginTop: 4 }}>I'll read your timetable and propose a plan.</Text>
        </View>
      </ThickFrame>
    </Animated.View>
  );
}

const MOCK_CARDS: Record<string, React.ComponentType<{ t: Theme; anim: SharedValue<number> }>> = {
  schedule: MockScheduleCard,
  courses: MockCourseCard,
  deadlines: MockDeadlineCard,
  assistant: MockAssistantCard,
};

// ── Main Walkthrough ─────────────────────────────────────────────────────────

export function Walkthrough({ onComplete }: WalkthroughProps) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<any>(null);
  const reduced = useReducedMotion() ?? false;

  // Entrance animation for each screen
  const entrance = useSharedValue(0);
  const textEntrance = useSharedValue(0);

  useEffect(() => {
    entrance.value = 0;
    textEntrance.value = 0;
    entrance.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    textEntrance.value = withDelay(150, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
  }, [current]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (idx !== current) {
      setCurrent(idx);
    }
  };

  const goNext = () => {
    if (current < FEATURES.length - 1) {
      scrollRef.current?.scrollTo({ x: (current + 1) * SCREEN_WIDTH, animated: true });
      setCurrent(current + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(WALKTHROUGH_KEY, 'true');
    } catch {}
    onComplete();
  };

  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(textEntrance.value, [0, 1], [0, 1]),
    transform: [{ translateY: interpolate(textEntrance.value, [0, 1], [15, 0]) }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(textEntrance.value, [0, 1], [0, 1]),
    transform: [{ translateY: interpolate(textEntrance.value, [0, 1], [15, 0]) }],
  }));

  const feature = FEATURES[current];
  const MockCard = MOCK_CARDS[feature.id];

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <TouchableOpacity onPress={handleComplete} style={styles.skipBtn} accessibilityLabel="Skip tutorial">
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Card area */}
      <View style={styles.cardArea}>
        {MockCard && <MockCard t={t} anim={entrance} />}
      </View>

      {/* Text */}
      <Animated.View style={[styles.textArea, titleStyle]}>
        <BoldDivider shape="diamond" color={t.colors.ink} style={{ marginBottom: 16 }} />
        <Text style={styles.title}>{feature.title}</Text>
      </Animated.View>
      <Animated.View style={[styles.textArea2, subtitleStyle]}>
        <Text style={styles.subtitle}>{feature.subtitle}</Text>
      </Animated.View>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {FEATURES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === current && styles.dotActive]}
            accessibilityLabel={i === current ? 'Current screen' : undefined}
          />
        ))}
      </View>

      {/* Next / Done button */}
      <TouchableOpacity
        style={styles.nextBtn}
        onPress={goNext}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={current === FEATURES.length - 1 ? 'Get started' : 'Next'}
      >
        <Text style={styles.nextBtnText}>
          {current === FEATURES.length - 1 ? 'Get started' : 'Next'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.canvas,
    },
    skipBtn: {
      position: 'absolute',
      top: 60,
      right: 20,
      zIndex: 20,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 2,
      borderWidth: 2,
      borderColor: t.colors.ink,
      backgroundColor: t.colors.canvas,
    },
    skipText: {
      fontSize: 12,
      fontWeight: '700',
      color: t.colors.ink,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    cardArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    textArea: {
      paddingHorizontal: 24,
      marginBottom: 4,
    },
    textArea2: {
      paddingHorizontal: 24,
      marginBottom: 24,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: t.colors.ink,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 15,
      color: t.colors.inkSecondary,
      lineHeight: 22,
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 24,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: t.colors.neutral350,
    },
    dotActive: {
      width: 24,
      backgroundColor: t.colors.ink,
    },
    nextBtn: {
      marginHorizontal: 24,
      marginBottom: 48,
      backgroundColor: t.colors.fill,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: t.colors.ink,
      paddingVertical: 16,
      alignItems: 'center',
    },
    nextBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: t.colors.fillInk,
      letterSpacing: 0.3,
    },
  });
}

// ── Helper: check if walkthrough was seen ────────────────────────────────────

export async function hasSeenWalkthrough(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(WALKTHROUGH_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}
