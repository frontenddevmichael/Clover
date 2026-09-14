// Navigation dock — White bar with black center hill.
// Matches the reference: white/light bar, black organic hill rising from
// center for the + button, dark icons with labels underneath, wavy
// underline for active state.
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  Easing,
  interpolate,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useStyles, type Theme } from '@/lib/theme';
import { motion } from '@/lib/tokens';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from '@/lib/auth';

const { width: SCREEN_W } = Dimensions.get('window');

const TAP = 48;
const MORPH_MS = motion.duration;
const SOFT_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);
const BAR_HEIGHT = 64;
const CUTOUT_RADIUS = 38; // radius of the circular cutout for the CTA

// ─── Workload ───
type WorkloadLevel = 'light' | 'balanced' | 'heavy' | 'overloaded';
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

// ─── Icons (dark on white bar) ───
const SW_ACTIVE = 2;
const SW_IDLE = 1.6;

function HomeIcon({ active }: { active: boolean }) {
  const sw = active ? SW_ACTIVE : SW_IDLE;
  const color = active ? '#1A1A1A' : '#6B7280';
  return (
    <Svg viewBox="0 0 24 24" width={22} height={22}>
      <Path d="M4 11 L12 4 L20 11 V20 H4 Z" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M10 20 V14 H14 V20" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function FlagIcon({ active }: { active: boolean }) {
  const sw = active ? SW_ACTIVE : SW_IDLE;
  const color = active ? '#1A1A1A' : '#6B7280';
  return (
    <Svg viewBox="0 0 24 24" width={22} height={22}>
      <Line x1="6" y1="3" x2="6" y2="21" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Path d="M6 4 H17 L14.5 7.5 L17 11 H6" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function RoomsIcon({ active }: { active: boolean }) {
  const sw = active ? SW_ACTIVE : SW_IDLE;
  const color = active ? '#1A1A1A' : '#6B7280';
  return (
    <Svg viewBox="0 0 24 24" width={22} height={22}>
      <Circle cx="8" cy="8.5" r="3" stroke={color} strokeWidth={sw} fill="none" />
      <Circle cx="16" cy="8.5" r="3" stroke={color} strokeWidth={sw} fill="none" />
      <Path d="M3 19 C3 15.5 5.5 13.5 8 13.5 C10.5 13.5 13 15.5 13 19" stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none" />
      <Path d="M13.5 13.8 C16 13.8 18.5 15.8 18.5 19" stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function AssistantIcon({ active }: { active: boolean }) {
  const sw = active ? SW_ACTIVE : SW_IDLE;
  const color = active ? '#1A1A1A' : '#6B7280';
  return (
    <Svg viewBox="0 0 24 24" width={22} height={22}>
      <Path d="M12 3 L14 9 L20 11 L14 13 L12 19 L10 13 L4 11 L10 9 Z" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx="18.5" cy="5.5" r="1" fill={color} />
    </Svg>
  );
}

// Center icons (white on black hill)
function PlusIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={26} height={26}>
      <Line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth={2.5} strokeLinecap="round" />
      <Line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

function DeadlineFlagBig() {
  return (
    <Svg viewBox="0 0 24 24" width={26} height={26}>
      <Line x1="7" y1="4" x2="7" y2="20" stroke="white" strokeWidth={2} strokeLinecap="round" />
      <Path d="M7 5 H17 L14.5 8.5 L17 12 H7" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function ShareOverlapBig() {
  return (
    <Svg viewBox="0 0 24 24" width={26} height={26}>
      <Circle cx="9" cy="9" r="3.5" stroke="white" strokeWidth={2} fill="none" />
      <Circle cx="15.5" cy="15" r="3.5" stroke="white" strokeWidth={2} fill="none" />
      <Line x1="11.5" y1="11.5" x2="13" y2="13" stroke="white" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function AskIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={26} height={26}>
      <Path d="M20 12 A8 8 0 1 1 12 4" stroke="white" strokeWidth={2} strokeLinecap="round" fill="none" />
      <Path d="M16.5 3.5 L20 4.5 L19 8" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
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

// ─── Wavy underline for active tab ───
const AnimatedPath = Animated.createAnimatedComponent(Path);
const WAVE_LEN = 36;

function SketchUnderline({ active, reduced }: { active: boolean; reduced: boolean }) {
  const progress = useSharedValue(active ? 1 : 0);
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
    strokeDashoffset: interpolate(progress.value, [0, 1], [WAVE_LEN, 0]),
    opacity: progress.value,
  }));

  return (
    <Svg viewBox="0 0 28 6" width={28} height={6} style={{ marginTop: 1 }}>
      <AnimatedPath
        d="M 2 3.5 C 7 2.2, 12 4.1, 17 2.8 S 23.5 3.4, 26 3"
        stroke="#1A1A1A"
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={WAVE_LEN}
        animatedProps={props}
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

  const activeKey = TABS.find((tab) => tab.match(pathname))?.key ?? null;
  const center = getCenterSpec(pathname);

  // Center morph
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
      { scale: 0.5 + 0.5 * morph.value },
      { rotate: `${(1 - morph.value) * 45}deg` },
    ],
    opacity: 0.3 + 0.7 * morph.value,
  }));

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      <View style={styles.barContainer}>
        {/* White bar with circular cutout at top center */}
        <Svg
          viewBox={`0 0 ${SCREEN_W} ${BAR_HEIGHT}`}
          width={SCREEN_W}
          height={BAR_HEIGHT}
          style={styles.barSvg}
        >
          <Path
            d={`
              M 0 16
              Q 0 0, 16 0
              L ${SCREEN_W * 0.5 - 38} 0
              A 38 38 0 0 1 ${SCREEN_W * 0.5 + 38} 0
              L ${SCREEN_W - 16} 0
              Q ${SCREEN_W} 0, ${SCREEN_W} 16
              L ${SCREEN_W} ${BAR_HEIGHT}
              L 0 ${BAR_HEIGHT}
              Z
            `}
            fill="white"
          />
        </Svg>

        {/* Icons row */}
        <View style={styles.iconsRow}>
          {/* Left tabs */}
          <View style={styles.leftTabs}>
            {TABS.slice(0, 2).map((tab) => (
              <TabIcon key={tab.key} tab={tab} active={activeKey === tab.key} reduced={reduced} />
            ))}
          </View>

          {/* Center spacer — cutout area */}
          <View style={styles.centerSpacer} />

          {/* Right tabs */}
          <View style={styles.rightTabs}>
            {TABS.slice(2).map((tab) => (
              <TabIcon key={tab.key} tab={tab} active={activeKey === tab.key} reduced={reduced} />
            ))}
          </View>
        </View>

        {/* Center button — suspended in the cutout */}
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
    </View>
  );
}

// ─── Tab icon with label and wavy underline ───
function TabIcon({
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
      style={styles.tabIcon}
      onPress={() => router.push(tab.route as never)}
      activeOpacity={0.6}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={tab.label}
    >
      <tab.Icon active={active} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
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
  barContainer: {
    position: 'relative',
  },
  barSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: BAR_HEIGHT,
    paddingHorizontal: theme.spacing[2],
  },
  leftTabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: theme.spacing[2],
  },
  rightTabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: theme.spacing[2],
  },
  centerSpacer: {
    width: 76,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: TAP,
    gap: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 1,
  },
  tabLabelActive: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
  centerHit: {
    position: 'absolute',
    left: '50%',
    top: -16,
    width: 56,
    height: 56,
    marginLeft: -28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  centerBtn: {
    width: 52,
    height: 52,
    borderRadius: theme.radii.pill,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
});
