// Empty state — a hand-drawn scene that sketches itself in, then holds.
// Scene varies by context via the `scene` prop.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/theme';
import { CalendarIllustration, BookIllustration, TimerIllustration, PeopleIllustration, ChartIllustration } from '@/components/Illustrations';

type EmptyStateProps = {
  title: string;
  message: string;
  scene?: 'calendar' | 'book' | 'timer' | 'people' | 'chart';
  actionLabel?: string;
  onAction?: () => void;
};

const SCENE_MAP = {
  calendar: CalendarIllustration,
  book: BookIllustration,
  timer: TimerIllustration,
  people: PeopleIllustration,
  chart: ChartIllustration,
} as const;

export function EmptyState({ title, message, scene = 'calendar', actionLabel, onAction }: EmptyStateProps) {
  const t = useTheme();
  const Illustration = SCENE_MAP[scene];
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: t.spacing[8] }}>
      <Illustration size={96} />
      <Text
        style={{
          fontSize: t.typography.body,
          fontWeight: t.typography.semibold,
          color: t.colors.ink,
          textAlign: 'center',
          marginTop: t.spacing[5],
          marginBottom: t.spacing[1.5],
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: t.typography.secondary,
          color: t.colors.inkSecondary,
          textAlign: 'center',
          lineHeight: 22,
          paddingHorizontal: t.spacing[2],
        }}
      >
        {message}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          style={{
            marginTop: t.spacing[5],
            paddingHorizontal: t.spacing[5],
            paddingVertical: t.spacing[3],
            minHeight: 44,
            justifyContent: 'center',
            borderRadius: t.radii.chip,
            backgroundColor: t.colors.fill,
          }}
          onPress={onAction}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text
            style={{
              fontSize: t.typography.secondary,
              fontWeight: t.typography.semibold,
              color: t.colors.fillInk,
            }}
          >
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
