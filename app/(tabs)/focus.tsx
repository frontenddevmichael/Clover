// Focus Timer screen — Pomodoro / custom timer with session tracking.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Doc } from '../../convex/_generated/dataModel';
import { useTheme, useStyles, type Theme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { Timer } from '@/components/Timer';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ProfileButton } from '@/components/ProfileButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CornerStamp,
  GeoDots,
  CountBadge,
} from '@/components/neoBrutalist';
import * as Haptics from 'expo-haptics';
import * as KeepAwake from 'expo-keep-awake';
import Constants from 'expo-constants';

const MODES = [
  { key: 'pomodoro', label: 'Focus', minutes: 25 },
  { key: 'shortBreak', label: 'Short break', minutes: 5 },
  { key: 'longBreak', label: 'Long break', minutes: 15 },
  { key: 'free', label: 'Free', minutes: 45 },
] as const;

type ModeKey = typeof MODES[number]['key'];

export default function FocusScreen() {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();

  const todayStats = useQuery(
    api.focusSessions.todayStats,
    userId ? { userId } : 'skip'
  );
  const todaySessions = useQuery(
    api.focusSessions.listToday,
    userId ? { userId } : 'skip'
  );
  const startSession = useMutation(api.focusSessions.start);
  const completeSession = useMutation(api.focusSessions.complete);
  const cancelSession = useMutation(api.focusSessions.cancel);

  const [selectedMode, setSelectedMode] = useState<ModeKey>('pomodoro');
  const [isActive, setIsActive] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = MODES.find((m) => m.key === selectedMode)!.minutes * 60;

  // Timer tick
  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  // Keep screen awake during focus sessions
  useEffect(() => {
    if (isActive && selectedMode === 'pomodoro') {
      KeepAwake.activateKeepAwakeAsync('clover-focus').catch(() => {});
    }
  }, [isActive, selectedMode]);

  const handleTimerComplete = useCallback(async () => {
    setIsActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    if (currentSessionId) {
      try {
        await completeSession({ sessionId: currentSessionId as any });
      } catch {}
      setCurrentSessionId(null);
    }

    Alert.alert(
      'Time\'s up!',
      selectedMode === 'pomodoro'
        ? 'Great focus session! Take a break.'
        : 'Break is over. Ready to focus?'
    );
  }, [currentSessionId, selectedMode, completeSession]);

  const handleStart = useCallback(async () => {
    if (!userId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      const id = await startSession({
        userId,
        type: selectedMode,
        durationMinutes: totalSeconds / 60,
      });
      setCurrentSessionId(id);
      setRemainingSeconds(totalSeconds);
      setIsActive(true);
    } catch {}
  }, [userId, selectedMode, totalSeconds, startSession]);

  const handlePause = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsActive(false);
  }, []);

  const handleResume = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsActive(true);
  }, []);

  const handleStop = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setIsActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (currentSessionId) {
      Alert.alert(
        'Stop timer?',
        'This session won\'t be saved.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Stop',
            style: 'destructive',
            onPress: async () => {
              try {
                await cancelSession({ sessionId: currentSessionId as any });
              } catch {}
              setCurrentSessionId(null);
              setRemainingSeconds(totalSeconds);
            },
          },
        ]
      );
    } else {
      setRemainingSeconds(totalSeconds);
    }
  }, [currentSessionId, totalSeconds, cancelSession]);

  const handleModeSelect = (mode: ModeKey) => {
    if (isActive) return;
    setSelectedMode(mode);
    const m = MODES.find((mo) => mo.key === mode)!;
    setRemainingSeconds(m.minutes * 60);
  };

  const currentMode = MODES.find((m) => m.key === selectedMode)!;

  // Session history for today
  const completedSessions = (todaySessions ?? []).filter(
    (s: Doc<'focusSessions'>) => s.completed
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Focus</Text>
          <GeoDots rows={1} cols={8} dotSize={3} gap={6} color={t.colors.hairline} style={{ marginTop: 4 }} />
        </View>
        <ProfileButton />
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: t.colors.ink }]}>
            {todayStats?.pomodoroCount ?? 0}
          </Text>
          <Text style={[styles.statLabel, { color: t.colors.inkSecondary }]}>focus</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: t.colors.hairline }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: t.colors.ink }]}>
            {todayStats?.totalMinutes ?? 0}m
          </Text>
          <Text style={[styles.statLabel, { color: t.colors.inkSecondary }]}>total</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: t.colors.hairline }]} />
        <View style={styles.statItem}>
          <CountBadge count={todayStats?.sessionCount ?? 0} size={24} />
          <Text style={[styles.statLabel, { color: t.colors.inkSecondary }]}>sessions</Text>
        </View>
      </View>

      {/* Mode selector */}
      <View style={styles.modeRow}>
        {MODES.map((mode) => (
          <TouchableOpacity
            key={mode.key}
            style={[
              styles.modeBtn,
              selectedMode === mode.key && {
                backgroundColor: t.colors.fill,
              },
              isActive && { opacity: 0.5 },
            ]}
            onPress={() => handleModeSelect(mode.key)}
            disabled={isActive}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedMode === mode.key }}
          >
            <Text
              style={[
                styles.modeText,
                {
                  color:
                    selectedMode === mode.key
                      ? t.colors.fillInk
                      : t.colors.inkSecondary,
                },
              ]}
            >
              {mode.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Timer */}
      <View style={styles.timerArea}>
        <Timer
          totalSeconds={totalSeconds}
          remainingSeconds={remainingSeconds}
          label={currentMode.label}
        />
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {!isActive ? (
          <Button
            label="Start"
            onPress={remainingSeconds === totalSeconds ? handleStart : handleResume}
            style={styles.controlBtn}
          />
        ) : (
          <>
            <Button
              label="Pause"
              onPress={handlePause}
              variant="secondary"
              style={styles.controlBtn}
            />
            <Button
              label="Stop"
              onPress={handleStop}
              variant="secondary"
              style={[styles.controlBtn, { borderColor: t.colors.workloadOverloaded }]}
            />
          </>
        )}
      </View>

      {/* Today's sessions */}
      {completedSessions.length > 0 && (
        <View style={styles.historySection}>
          <Text style={[styles.historyTitle, { color: t.colors.inkSecondary }]}>
            Today
          </Text>
          <FlatList
            data={completedSessions}
            keyExtractor={(item) => item._id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.historyList}
            renderItem={({ item }) => {
              const mode = MODES.find((m) => m.key === item.type);
              return (
                <Card style={styles.historyCard}>
                  <Text style={[styles.historyCardType, { color: t.colors.ink }]}>
                    {mode?.label ?? item.type}
                  </Text>
                  <Text style={[styles.historyCardTime, { color: t.colors.inkSecondary }]}>
                    {item.durationMinutes}m
                  </Text>
                </Card>
              );
            }}
          />
        </View>
      )}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.canvas,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: t.spacing[5],
      paddingTop: t.spacing[2],
      paddingBottom: t.spacing[3],
    },
    headerLeft: { flex: 1 },
    title: {
      fontSize: t.typography.display,
      fontWeight: t.typography.bold,
      color: t.colors.ink,
      letterSpacing: t.typography.trackingDisplay,
    },
    statsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.spacing[5],
      paddingVertical: t.spacing[3],
      marginHorizontal: t.spacing[5],
      backgroundColor: t.colors.subtleFill,
      borderRadius: t.radii.card,
    },
    statItem: {
      alignItems: 'center',
      gap: 2,
    },
    statValue: {
      fontSize: t.typography.body,
      fontWeight: t.typography.bold,
    },
    statLabel: {
      fontSize: t.typography.micro,
      fontWeight: t.typography.medium,
    },
    statDivider: {
      width: 1,
      height: 24,
    },
    modeRow: {
      flexDirection: 'row',
      gap: t.spacing[2],
      paddingHorizontal: t.spacing[5],
      marginTop: t.spacing[4],
    },
    modeBtn: {
      flex: 1,
      paddingVertical: t.spacing[2],
      alignItems: 'center',
      borderRadius: t.radii.chip,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    modeText: {
      fontSize: t.typography.micro,
      fontWeight: t.typography.medium,
    },
    timerArea: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      paddingVertical: t.spacing[4],
    },
    controls: {
      flexDirection: 'row',
      gap: t.spacing[3],
      paddingHorizontal: t.spacing[5],
      paddingBottom: t.spacing[4],
    },
    controlBtn: {
      flex: 1,
    },
    historySection: {
      paddingBottom: t.spacing[4],
    },
    historyTitle: {
      fontSize: t.typography.caption,
      fontWeight: t.typography.medium,
      paddingHorizontal: t.spacing[5],
      marginBottom: t.spacing[2],
    },
    historyList: {
      paddingHorizontal: t.spacing[5],
      gap: t.spacing[2],
    },
    historyCard: {
      paddingHorizontal: t.spacing[3],
      paddingVertical: t.spacing[2],
      minWidth: 80,
    },
    historyCardType: {
      fontSize: t.typography.micro,
      fontWeight: t.typography.semibold,
    },
    historyCardTime: {
      fontSize: t.typography.micro,
      marginTop: 2,
    },
  });
}
