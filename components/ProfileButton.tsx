// Profile / settings entry — lives in the top-right of every tab header.
// A small circular avatar with the user's initials (falls back to a person
// glyph before the profile loads). 44×44pt tap target per ui-prompt §9.
// Pulses gently to draw attention on first load.
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function ProfileButton() {
  const router = useRouter();
  const t = useTheme();
  const { userId } = useAuth();
  const user = useQuery(api.users.getById, userId ? { userId } : 'skip');

  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      3,
      false
    );
    return () => cancelAnimation(pulse);
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : null;

  return (
    <AnimatedTouchable
      style={[styles.hit, pulseStyle]}
      onPress={() => router.push('/(tabs)/settings')}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Settings and profile"
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: t.radii.pill,
          backgroundColor: t.colors.fill,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {initials ? (
          <Text
            style={{
              fontSize: t.typography.caption,
              fontWeight: t.typography.semibold,
              color: t.colors.fillInk,
              letterSpacing: 0.3,
            }}
          >
            {initials}
          </Text>
        ) : (
          <Svg viewBox="0 0 24 24" width={18} height={18}>
            <Circle cx="12" cy="9" r="3.5" stroke={t.colors.fillInk} strokeWidth={1.8} fill="none" />
            <Path
              d="M5.5 19 C5.5 15 8.5 13.5 12 13.5 C15.5 13.5 18.5 15 18.5 19"
              stroke={t.colors.fillInk}
              strokeWidth={1.8}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        )}
      </View>
    </AnimatedTouchable>
  );
}

const styles = {
  hit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
} as const;
