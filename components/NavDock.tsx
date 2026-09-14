// Navigation dock — Notch / Cutout Tabs design.
// Each tab is a separate card-like section with small gaps.
// The active tab is elevated with a top-edge notch where screen content flows through.
// Center action floats between the two halves.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { useTheme, useStyles, type Theme } from '@/lib/theme';
import { radii, motion, colors as baseColors } from '@/lib/tokens';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from '@/lib/auth';

const { width: SCREEN_W } = Dimensions.get('window');
const GLASS = isGlassEffectAPIAvailable();

const TAP = 44;
const MORPH_MS = motion.duration;
const SOFT_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);
const CARD_GAP = 3; // gap between tab cards

// ─── Workload classification ───
type WorkloadLevel = 'light' | 'balanced' | 'heavy' | 'overloaded';
const WORKLOAD_TINT: Record<WorkloadLevel, string> = {
  light: baseColors.workloadLight,
  balanced: baseColors.workloadBalanced,
  heavy: baseColors.workloadHeavy,
  overloaded: baseColors.workloadOverloaded,
};

function useWorkloadLevel(): WorkloadLevel {
  const { userId } = useAuth();
  const sessions = useQuery(api.sessions.listByUser, userId ? { userId } : 'skip');
  const deadlines = useQuery(
    api.deadlines.listUpcoming,
    userId ? { userId, fromDate: new Date().toISOString().split('T')[0] } : 'skip'
  );

  return useMemo<WorkloadLevel>(() => {
    const today = new Date().getDay();
    const mins = (sessions ?? []).reduce((sum: number, s: any) => {
      if (s.dayOfWeek !== today) return sum;
      const [h1, m1] = String(s.startTime).split(':').map(Number);
      const [h2, m2] = String(s.endTime).split(':').map(Number);
      if ([h1, m1, h2, m2].some(Number.isNaN)) return sum;
      return sum + h2 * 60 + m2 - (h1 * 60 + m1);
    }, 0);
    const todayStr = new Date().toISOString().split('T')[0];
    const dueToday = (deadlines ?? []).filter((d: any) => d.dueDate === todayStr).length;
    const score = mins / 60 + dueToday * 0.75;
    if (score <= 1) return 'light';
    if (score <= 3) return 'balanced';
    if (score <= 5) return 'heavy';
    return 'overloaded';
  }, [sessions, deadlines]);
}

// ─── Icons ───
const STROKE_ACTIVE = 2;
const STROKE_IDLE = 1.5;

function useIconStyle(active: boolean) {
  const t = useTheme();
  return { INK: active ? t.colors.fillInk : t.colors.inkSecondary, sw: active ? STROKE_ACTIVE : STROKE_IDLE };
}

function HomeIcon({ active }: { active: boolean }) {
  const { INK, sw } = useIconStyle(active);
  return (
    <Svg viewBox="0 0 24 24" width={20} height={20}>
      <Path d="M4 11 L12 4 L20 11 V20 H4 Z" stroke={INK} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M10 20 V14 H14 V20" stroke={INK} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function FlagIcon({ active }: { active: boolean }) {
  const { INK, sw } = useIconStyle(active);
  return (
    <Svg viewBox="0 0 24 24" width={20} height={20}>
      <Line x1="6" y1="3" x2="6" y2="21" stroke={INK} strokeWidth={sw} strokeLinecap="round" />
      <Path d="M6 4 H17 L14.5 7.5 L17 11 H6" stroke={INK} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function RoomsIcon({ active }: { active: boolean }) {
  const { INK, sw } = useIconStyle(active);
  return (
    <Svg viewBox="0 0 24 24" width={20} height={20}>
      <Circle cx="8" cy="8.5" r="3" stroke={INK} strokeWidth={sw} fill="none" />
      <Circle cx="16" cy="8.5" r="3" stroke={INK} strokeWidth={sw} fill="none" />
      <Path d="M3 19 C3 15.5 5.5 13.5 8 13.5 C10.5 13.5 13 15.5 13 19" stroke={INK} strokeWidth={sw} strokeLinecap="round" fill="none" />
      <Path d="M13.5 13.8 C16 13.8 18.5 15.8 18.5 19" stroke={INK} strokeWidth={sw} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function AssistantIcon({ active }: { active: boolean }) {
  const { INK, sw } = useIconStyle(active);
  return (
    <Svg viewBox="0 0 24 24" width={20} height={20}>
      <Path d="M12 3 L14 9 L20 11 L14 13 L12 19 L10 13 L4 11 L10 9 Z" stroke={INK} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx="18.5" cy="5.5" r="1" fill={INK} />
    </Svg>
  );
}

// Center-action icons
function PlusIcon() {
  const t = useTheme();
  return (
    <Svg viewBox="0 0 24 24" width={22} height={22}>
      <Line x1="12" y1="5" x2="12" y2="19" stroke={t.colors.fillInk} strokeWidth={2.2} strokeLinecap="round" />
      <Line x1="5" y1="12" x2="19" y2="12" stroke={t.colors.fillInk} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

function DeadlineFlagBig() {
  const t = useTheme();
  return (
    <Svg viewBox="0 0 24 24" width={22} height={22}>
      <Line x1="7" y1="4" x2="7" y2="20" stroke={t.colors.fillInk} strokeWidth={2} strokeLinecap="round" />
      <Path d="M7 5 H17 L14.5 8.5 L17 12 H7" stroke={t.colors.fillInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function ShareOverlapBig() {
  const t = useTheme();
  return (
    <Svg viewBox="0 0 24 24" width={22} height={22}>
      <Circle cx="9" cy="9" r="3.5" stroke={t.colors.fillInk} strokeWidth={2} fill="none" />
      <Circle cx="15.5" cy="15" r="3.5" stroke={t.colors.fillInk} strokeWidth={2} fill="none" />
      <Line x1="11.5" y1="11.5" x2="13" y2="13" stroke={t.colors.fillInk} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function AskIcon() {
  const t = useTheme();
  return (
    <Svg viewBox="0 0 24 24" width={22} height={22}>
      <Path d="M20 12 A8 8 0 1 1 12 4" stroke={t.colors.fillInk} strokeWidth={2} strokeLinecap="round" fill="none" />
      <Path d="M16.5 3.5 L20 4.5 L19 8" stroke={t.colors.fillInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

// ─── Tab config ───
const TABS = [
  { key: 'index', label: 'Home', route: '/(tabs)', match: (p: string) => p === '/' || p === '/(tabs)' || p === '/(tabs)/', Icon: HomeIcon },
  { key: 'deadlines', label: 'Deadlines', route: '/(tabs)/deadlines', match: (p: string) => p.includes('/deadlines'), Icon: FlagIcon },
  { key: 'social', label: 'Rooms', route: '/(tabs)/social', match: (p: string) => p.includes('/social'), Icon: RoomsIcon },
  { key: 'assistant', label: 'Assistant', route: '/(tabs)/assistant', match: (p: string) => p.includes('/assistant'), Icon: AssistantIcon },
] as const;

function getCenterSpec(pathname: string) {
  if (pathname.includes('/deadlines')) return { label: 'Add deadline', Icon: DeadlineFlagBig, route: '/(tabs)/deadlines', params: { compose: '1' } };
  if (pathname.includes('/social')) return { label: 'Sharing settings', Icon: ShareOverlapBig, route: '/(tabs)/social', params: { share: '1' } };
  if (pathname.includes('/assistant')) return { label: 'Generate new plan', Icon: AskIcon, route: '/(tabs)/assistant', params: { action: 'new-plan' } };
  if (pathname.includes('/courses')) return { label: 'Add course', Icon: PlusIcon, route: '/(tabs)/courses', params: { compose: '1' } };
  return { label: 'Add session', Icon: PlusIcon, route: '/session/create' };
}

// ─── Notch shape — organic cutout at top of active card ───
function NotchSVG({ width }: { width: number }) {
  const t = useTheme();
  return (
    <Svg
      viewBox={`0 0 ${width} 8`}
      width={width}
      height={8}
      style={{ position: 'absolute', top: -7, left: '50%', marginLeft: -(width / 2) }}
    >
      <Path
        d={`M 0 0 Q ${width * 0.3} 6, ${width * 0.5} 7 Q ${width * 0.7} 6, ${width} 0`}
        fill={t.colors.canvas}
        stroke="none"
      />
    </Svg>
  );
}

// ─── The dock ───
export default function NavDock() {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion() ?? false;
  const workload = useWorkloadLevel();

  const activeKey = TABS.find((tab) => tab.match(pathname))?.key ?? null;
  const center = getCenterSpec(pathname);

  // Center button morph
  const morph = useSharedValue(1);
  const lastRoute = useRef(pathname);
  useEffect(() => {
    if (lastRoute.current === pathname) return;
    lastRoute.current = pathname;
    if (reduced) { morph.value = 1; return; }
    morph.value = 0;
    morph.value = withTiming(1, { duration: MORPH_MS, easing: SOFT_EASE });
  }, [pathname, reduced]);
  const morphStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 0.55 + 0.45 * morph.value },
      { rotate: `${(1 - morph.value) * 45}deg` },
    ],
    opacity: 0.35 + 0.65 * morph.value,
  }));

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, t.spacing[2]) }]}>
      <View style={styles.row}>
        {/* Left half: Home + Deadlines */}
        {TABS.slice(0, 2).map((tab) => (
          <NotchTab
            key={tab.key}
            tab={tab}
            active={activeKey === tab.key}
            reduced={reduced}
          />
        ))}

        {/* Center action */}
        <Pressable
          onPress={() =>
            center.params
              ? router.push({ pathname: center.route as never, params: center.params })
              : router.push(center.route as never)
          }
          style={styles.centerHit}
          accessibilityRole="button"
          accessibilityLabel={center.label}
        >
          <View style={styles.centerBtn}>
            <Animated.View style={morphStyle}>
              <center.Icon />
            </Animated.View>
          </View>
        </Pressable>

        {/* Right half: Rooms + Assistant */}
        {TABS.slice(2).map((tab) => (
          <NotchTab
            key={tab.key}
            tab={tab}
            active={activeKey === tab.key}
            reduced={reduced}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Individual tab card with notch ───
function NotchTab({
  tab,
  active,
  reduced,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
  reduced: boolean;
}) {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles(makeStyles);

  const elevate = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    if (reduced) { elevate.value = active ? 1 : 0; return; }
    elevate.value = withTiming(active ? 1 : 0, {
      duration: 220,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [active, reduced]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(elevate.value, [0, 1], [0, -4]) }],
    shadowOpacity: interpolate(elevate.value, [0, 1], [0, 0.18]),
  }));

  return (
    <TouchableOpacity
      onPress={() => router.push(tab.route as never)}
      activeOpacity={0.7}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={tab.label}
    >
      <Animated.View style={[styles.card, active && styles.cardActive, cardStyle]}>
        {active && <NotchSVG width={48} />}
        <tab.Icon active={active} />
        <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: CARD_GAP,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[1.5],
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.glassDock,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.borderFaint,
    shadowColor: theme.colors.neutral950,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 0,
  },
  cardActive: {
    backgroundColor: theme.colors.fill,
    borderColor: theme.colors.hairline,
    shadowOpacity: 0.18,
    elevation: 4,
  },
  notch: {
    position: 'absolute',
    top: -7,
    left: '50%',
    marginLeft: -24,
  },
  label: {
    fontSize: theme.typography.micro,
    fontWeight: theme.typography.regular,
    color: theme.colors.inkSecondary,
    marginTop: 2,
  },
  labelActive: {
    fontWeight: theme.typography.semibold,
    color: theme.colors.fillInk,
  },
  centerHit: {
    width: 52,
    height: 52,
    marginBottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  centerBtn: {
    width: 52,
    height: 52,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.neutral950,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
  },
});
