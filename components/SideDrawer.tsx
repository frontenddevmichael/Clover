// SideDrawer — slides from left with profile + secondary nav items.
// Profile section at top, Focus/Insights/Rooms below.
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
  useReducedMotion,
} from 'react-native-reanimated';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';

const { width: SCREEN_W } = Dimensions.get('window');
const DRAWER_W = SCREEN_W * 0.78;

type SideDrawerProps = {
  visible: boolean;
  onClose: () => void;
};

const NAV_ITEMS = [
  { key: 'focus', label: 'Focus Timer', route: '/(tabs)/focus' },
  { key: 'insights', label: 'Insights', route: '/(tabs)/insights' },
  { key: 'rooms', label: 'Course Rooms', route: '/(tabs)/social' },
] as const;

function TimerIcon({ color }: { color: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={20} height={20}>
      <Circle cx="12" cy="13" r="8" stroke={color} strokeWidth={1.8} fill="none" />
      <Path d="M12 9v4l2.5 2.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 2h4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function InsightsIcon({ color }: { color: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={20} height={20}>
      <Path d="M18 20V10M12 20V4M6 20v-6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PeopleIcon({ color }: { color: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={20} height={20}>
      <Circle cx="9" cy="7" r="3.5" stroke={color} strokeWidth={1.6} fill="none" />
      <Path d="M2 19c0-3 2.5-5.5 7-5.5s7 2.5 7 5.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      <Circle cx="17.5" cy="8" r="2.5" stroke={color} strokeWidth={1.4} fill="none" />
      <Path d="M19.5 13.5c2.5.5 3.5 2.5 3.5 5.5" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

const NAV_ICNS: Record<string, React.FC<{ color: string }>> = {
  focus: TimerIcon,
  insights: InsightsIcon,
  rooms: PeopleIcon,
};

export function SideDrawer({ visible, onClose }: SideDrawerProps) {
  const t = useTheme();
  const router = useRouter();
  const { userId } = useAuth();
  const user = useQuery(api.users.getById, userId ? { userId } : 'skip');
  const reduced = useReducedMotion() ?? false;

  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      progress.value = visible ? 1 : 0;
      return;
    }
    progress.value = withTiming(visible ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, reduced]);

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-DRAWER_W, 0]) }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.4]),
  }));

  if (!visible && progress.value === 0) return null;

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View style={[styles.drawer, drawerStyle]}>
        {/* Profile section */}
        <TouchableOpacity
          style={styles.profileSection}
          activeOpacity={0.7}
          onPress={() => {
            onClose();
            setTimeout(() => router.push('/(tabs)/profile'), 150);
          }}
        >
          <View style={[styles.avatar, { backgroundColor: t.colors.fill }]}>
            {initials ? (
              <Text style={[styles.initials, { color: t.colors.fillInk }]}>{initials}</Text>
            ) : (
              <Svg viewBox="0 0 24 24" width={20} height={20}>
                <Circle cx="12" cy="9" r="3.5" stroke={t.colors.fillInk} strokeWidth={1.8} fill="none" />
                <Path d="M5.5 19 C5.5 15 8.5 13.5 12 13.5 C15.5 13.5 18.5 15 18.5 19" stroke={t.colors.fillInk} strokeWidth={1.8} strokeLinecap="round" fill="none" />
              </Svg>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: t.colors.ink }]}>
              {user?.name ?? 'Student'}
            </Text>
            <Text style={[styles.profileLink, { color: t.colors.inkSecondary }]}>
              Edit Profile →
            </Text>
          </View>
        </TouchableOpacity>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: t.colors.hairline }]} />

        {/* Navigation items */}
        {NAV_ITEMS.map((item) => {
          const Icon = NAV_ICNS[item.key];
          return (
            <TouchableOpacity
              key={item.key}
              style={styles.navItem}
              activeOpacity={0.6}
              onPress={() => {
                onClose();
                setTimeout(() => router.push(item.route as any), 150);
              }}
            >
              {Icon && <Icon color={t.colors.ink} />}
              <Text style={[styles.navLabel, { color: t.colors.ink }]}>{item.label}</Text>
              <Text style={[styles.navArrow, { color: t.colors.inkSecondary }]}>→</Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_W,
    backgroundColor: '#FAFAF8',
    paddingTop: 60,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  profileLink: {
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  navLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  navArrow: {
    fontSize: 18,
    fontWeight: '400',
  },
});
