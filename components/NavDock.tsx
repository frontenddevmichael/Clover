// Navigation dock — built to lib/nav-dock-spec.md.
// 4 tabs + an elevated center action that morphs per screen.
// Replaces the old LiquidGlassDock entirely (deleted, not patched).
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

// ─── Tokens (existing scale — nothing new introduced) ───
const DOCK_RADIUS = radii.sheet; // 28 — largest existing radius token
const TAP = 44; // minimum tap target (ui-prompt §9)
const MORPH_MS = motion.duration; // 220ms soft ease (ui-prompt §8)
const SOFT_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

// ─── Workload classification (same formula as Schedule, FR12) ──
type WorkloadLevel = 'light' | 'balanced' | 'heavy' | 'overloaded';
const WORKLOAD_TINT: Record<WorkloadLevel, string> = {
  light: baseColors.workloadLight,
  balanced: baseColors.workloadBalanced,
  heavy: baseColors.workloadHeavy,
  overloaded: baseColors.workloadOverloaded,
};
// Light/balanced recede to near-neutral; heavy/overloaded breathe at medium.
const TINT_OPACITY: Record<WorkloadLevel, { rest: number; breathe: number }> = {
  light: { rest: 0.25, breathe: 0 },
  balanced: { rest: 0.35, breathe: 0 },
  heavy: { rest: 0.55, breathe: 0.35 },
  overloaded: { rest: 0.7, breathe: 0.4 },
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
    // Same deadline-pressure weighting as the workload module (FR12)
    const todayStr = new Date().toISOString().split('T')[0];
    const dueToday = (deadlines ?? []).filter((d: any) => d.dueDate === todayStr).length;
    const score = mins / 60 + dueToday * 0.75;
    if (score <= 1) return 'light';
    if (score <= 3) return 'balanced';
    if (score <= 5) return 'heavy';
    return 'overloaded';
  }, [sessions, deadlines]);
}

// ─── Icons (geometric monoline, ui-prompt §6) ───────────
const STROKE_ACTIVE = 2;
const STROKE_IDLE = 1.5;

function useIconStyle(active: boolean) {
  const t = useTheme();
  return { INK: t.colors.ink, sw: active ? STROKE_ACTIVE : STROKE_IDLE };
}

function HomeIcon({ active }: { active: boolean }) {
  const { INK, sw } = useIconStyle(active);
  return (
    <Svg viewBox="0 0 24 24" width={22} height={22}>
      <Path d="M4 11 L12 4 L20 11 V20 H4 Z" stroke={INK} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M10 20 V14 H14 V20" stroke={INK} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function FlagIcon({ active }: { active: boolean }) {
  const { INK, sw } = useIconStyle(active);
  return (
    <Svg viewBox="0 0 24 24" width={22} height={22}>
      <Line x1="6" y1="3" x2="6" y2="21" stroke={INK} strokeWidth={sw} strokeLinecap="round" />
      <Path d="M6 4 H17 L14.5 7.5 L17 11 H6" stroke={INK} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function RoomsIcon({ active }: { active: boolean }) {
  const { INK, sw } = useIconStyle(active);
  return (
    <Svg viewBox="0 0 24 24" width={22} height={22}>
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
    <Svg viewBox="0 0 24 24" width={22} height={22}>
      <Path d="M12 3 L14 9 L20 11 L14 13 L12 19 L10 13 L4 11 L10 9 Z" stroke={INK} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx="18.5" cy="5.5" r="1" fill={INK} />
    </Svg>
  );
}

// Center-action morph targets
function PlusIcon() {
  const t = useTheme();
  return (
    <Svg viewBox="0 0 24 24" width={24} height={24}>
      <Line x1="12" y1="5" x2="12" y2="19" stroke={t.colors.fillInk} strokeWidth={2} strokeLinecap="round" />
      <Line x1="5" y1="12" x2="19" y2="12" stroke={t.colors.fillInk} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function DeadlineFlagBig() {
  const t = useTheme();
  return (
    <Svg viewBox="0 0 24 24" width={24} height={24}>
      <Line x1="7" y1="4" x2="7" y2="20" stroke={t.colors.fillInk} strokeWidth={2} strokeLinecap="round" />
      <Path d="M7 5 H17 L14.5 8.5 L17 12 H7" stroke={t.colors.fillInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function ShareOverlapBig() {
  const t = useTheme();
  return (
    <Svg viewBox="0 0 24 24" width={24} height={24}>
      <Circle cx="9" cy="9" r="3.5" stroke={t.colors.fillInk} strokeWidth={2} fill="none" />
      <Circle cx="15.5" cy="15" r="3.5" stroke={t.colors.fillInk} strokeWidth={2} fill="none" />
      <Line x1="11.5" y1="11.5" x2="13" y2="13" stroke={t.colors.fillInk} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function AskIcon() {
  const t = useTheme();
  return (
    <Svg viewBox="0 0 24 24" width={24} height={24}>
      <Path d="M20 12 A8 8 0 1 1 12 4" stroke={t.colors.fillInk} strokeWidth={2} strokeLinecap="round" fill="none" />
      <Path d="M16.5 3.5 L20 4.5 L19 8" stroke={t.colors.fillInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

// ─── Dock configuration (spec order: Home — Deadlines — [center] — Rooms — Assistant)
// usePathname() differs per platform ('/' + '/deadlines' on web vs
// '/(tabs)' + '/(tabs)/deadlines' native), so match on the tail segment.
const TABS = [
  {
    key: 'index',
    label: 'Home',
    route: '/(tabs)',
    match: (p: string) => p === '/' || p === '/(tabs)' || p === '/(tabs)/',
    Icon: HomeIcon,
  },
  {
    key: 'deadlines',
    label: 'Deadlines',
    route: '/(tabs)/deadlines',
    match: (p: string) => p.includes('/deadlines'),
    Icon: FlagIcon,
  },
  {
    key: 'social',
    label: 'Rooms',
    route: '/(tabs)/social',
    match: (p: string) => p.includes('/social'),
    Icon: RoomsIcon,
  },
  {
    key: 'assistant',
    label: 'Assistant',
    route: '/(tabs)/assistant',
    match: (p: string) => p.includes('/assistant'),
    Icon: AssistantIcon,
  },
] as const;

const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─── Behavior 2: hand-sketched active indicator ─────────
// Deliberately imperfect stroke; draws in with an uneven pace, then holds
// perfectly still. Reduce motion: instant appear/disappear, same end state.
function SketchUnderline({ active, reduced }: { active: boolean; reduced: boolean }) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const progress = useSharedValue(active ? 1 : 0);
  const LEN = 34;

  useEffect(() => {
    if (active) {
      progress.value = reduced
        ? 1
        : withTiming(1, { duration: 340, easing: Easing.bezier(0.2, 0.9, 0.3, 1) });
    } else {
      progress.value = reduced ? 0 : withTiming(0, { duration: 140, easing: Easing.in(Easing.cubic) });
    }
  }, [active, reduced]);

  const props = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(progress.value, [0, 1], [LEN, 0]),
    opacity: progress.value,
  }));

  return (
    <Svg viewBox="0 0 26 6" width={26} height={6} style={styles.sketch}>
      <AnimatedPath
        d="M 2 3.5 C 7 2.2, 12 4.1, 17 2.8 S 23.5 3.4, 24 3"
        stroke={t.colors.ink}
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={LEN}
        animatedProps={props}
      />
    </Svg>
  );
}

// ─── Behavior 3: center action spec per screen ──────────
type CenterSpec = {
  label: string;
  Icon: React.ComponentType;
  route: string;
  params?: Record<string, string>;
};

function getCenterSpec(pathname: string): CenterSpec {
  if (pathname.includes('/deadlines')) {
    return { label: 'Add deadline', Icon: DeadlineFlagBig, route: '/(tabs)/deadlines', params: { compose: '1' } };
  }
  if (pathname.includes('/social')) {
    return { label: 'Sharing settings', Icon: ShareOverlapBig, route: '/(tabs)/social', params: { share: '1' } };
  }
  if (pathname.includes('/assistant')) {
    return { label: 'Generate new plan', Icon: AskIcon, route: '/(tabs)/assistant', params: { action: 'new-plan' } };
  }
  return { label: 'Add session', Icon: PlusIcon, route: '/session/create' };
}

// ─── The dock ───────────────────────────────────────────
export default function NavDock() {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion() ?? false;
  const workload = useWorkloadLevel();

  const activeKey = TABS.find((t) => t.match(pathname))?.key ?? null;

  // ── Behavior 1: ambient workload tint (the ONLY idle animation) ──
  const tint = WORKLOAD_TINT[workload];
  const cfg = TINT_OPACITY[workload];
  const tintOpacity = useSharedValue(cfg.rest);
  useEffect(() => {
    tintOpacity.value = cfg.rest;
    if (!reduced && cfg.breathe > 0) {
      // ~5.2s gentle opacity oscillation — never a blink
      tintOpacity.value = withRepeat(
        withSequence(
          withTiming(cfg.rest + cfg.breathe, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
          withTiming(cfg.rest, { duration: 2600, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
    }
  }, [cfg.rest, cfg.breathe, reduced]);
  const tintStyle = useAnimatedStyle(() => ({ opacity: tintOpacity.value }));

  // ── Behavior 3: morph on screen change (event-triggered only) ──
  const center = getCenterSpec(pathname);
  const morph = useSharedValue(1);
  const lastRoute = useRef(pathname);
  useEffect(() => {
    if (lastRoute.current === pathname) return;
    lastRoute.current = pathname;
    if (reduced) {
      morph.value = 1; // instant swap
      return;
    }
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

  const tabBar = (
    <View style={styles.wrap}>
      {/* Floating glass pill — clipped radius lives here */}
      <View style={[styles.dock, GLASS ? null : styles.dockSolid]}>
        {GLASS ? (
          <GlassView glassEffectStyle="regular" tintColor={t.colors.canvas} style={styles.glassFill}>
            <DockRow activeKey={activeKey} reduced={reduced} />
          </GlassView>
        ) : (
          <DockRow activeKey={activeKey} reduced={reduced} />
        )}
        {/* Top-edge tint, clipped by the pill's radius */}
        <Animated.View style={[styles.tintEdge, tintStyle, { backgroundColor: tint }]} pointerEvents="none" />
      </View>

      {/* Elevated center action — sibling of the pill so nothing clips it */}
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
    </View>
  );

  return <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, t.spacing[2]) }]}>{tabBar}</View>;
}

function DockRow({
  activeKey,
  reduced,
}: {
  activeKey: string | null;
  reduced: boolean;
}) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.row}>
      {TABS.slice(0, 2).map((t) => (
        <TabButton key={t.key} tab={t} active={activeKey === t.key} reduced={reduced} />
      ))}
      {/* Center slot keeps the four tabs evenly spaced around the button */}
      <View style={styles.centerSlot} pointerEvents="none" />
      {TABS.slice(2).map((t) => (
        <TabButton key={t.key} tab={t} active={activeKey === t.key} reduced={reduced} />
      ))}
    </View>
  );
}

function TabButton({
  tab,
  active,
  reduced,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
  reduced: boolean;
}) {
  const router = useRouter();
  const styles = useStyles(makeStyles);
  return (
    <TouchableOpacity
      style={styles.tab}
      onPress={() => router.push(tab.route as never)}
      activeOpacity={0.6}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={tab.label}
    >
      <tab.Icon active={active} />
      <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
      <SketchUnderline active={active} reduced={reduced} />
    </TouchableOpacity>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  wrap: {
    position: 'relative',
    marginHorizontal: theme.spacing[3],
  },
  dock: {
    height: 64,
    borderRadius: DOCK_RADIUS,
    overflow: 'hidden',
  },
  dockSolid: {
    backgroundColor: theme.colors.glassDock,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.borderFaint,
  },
  glassFill: {
    flex: 1,
  },
  tintEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    height: TAP,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  centerSlot: {
    flex: 1,
  },
  centerHit: {
    position: 'absolute',
    left: '50%',
    top: -16,
    width: TAP,
    height: TAP,
    marginLeft: -TAP / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBtn: {
    width: 52,
    height: 52,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.fill, // inverts per scheme — always the highest-contrast surface
    alignItems: 'center',
    justifyContent: 'center',
    // Same top-light the glass implies — soft, single light source
    shadowColor: theme.colors.neutral950,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  label: {
    fontSize: theme.typography.micro,
    fontWeight: theme.typography.regular,
    color: theme.colors.inkSecondary,
  },
  labelActive: {
    fontWeight: theme.typography.semibold,
    color: theme.colors.ink,
  },
  sketch: {
    marginTop: -1,
  },
});
