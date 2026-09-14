// Schedule screen — all data from Convex, no hardcoded content
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTheme, useStyles } from '@/lib/theme';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { WorkloadIndicator } from '@/components/WorkloadIndicator';
import { ElevatedSurface } from '@/components/ElevatedSurface';
import { EmptyState } from '@/components/EmptyState';
import { WaveDivider, GreetingBanner } from '@/components/SignatureElements';
import { IconFlag, IconGraduationCap, IconUsers, IconBarChart, IconClock, IconTarget } from '@/components/Illustrations';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'expo-router';
import { ProfileButton } from '@/components/ProfileButton';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Session-type glyphs — icon-first, no letters (ui-prompt §6)
const sessionTypeIcons: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  lecture: IconUsers,
  lab: IconBarChart,
  tutorial: IconGraduationCap,
  study: IconClock,
  revision: IconTarget,
};

type WorkloadLevel = 'light' | 'balanced' | 'heavy' | 'overloaded';

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function classifyWorkload(sessionMinutes: number, deadlineCount: number): WorkloadLevel {
  // Deadline-aware (FR12): each deadline adds pressure like ~45min of study
  const score = sessionMinutes / 60 + deadlineCount * 0.75;
  if (score <= 1) return 'light';
  if (score <= 3) return 'balanced';
  if (score <= 5) return 'heavy';
  return 'overloaded';
}

function dateForDayOfWeek(dayOfWeek: number): string {
  const now = new Date();
  const diff = dayOfWeek - now.getDay();
  const target = new Date(now);
  target.setDate(target.getDate() + diff);
  return target.toISOString().split('T')[0];
}

function timeOverlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  return toMin(aStart) < toMin(bEnd) && toMin(bStart) < toMin(aEnd);
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 7) return `${diff} days`;
  return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

// ── Week-rail day pill — spring fill on selection ──────────────────────────
function DayPill({
  day,
  selected,
  isToday,
  wlColor,
  sessionCount,
  onPress,
}: {
  day: string;
  selected: boolean;
  isToday: boolean;
  wlColor?: string;
  sessionCount: number;
  onPress: () => void;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const reduced = useReducedMotion() ?? false;
  const fill = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    fill.value = reduced
      ? selected
        ? 1
        : 0
      : withSpring(selected ? 1 : 0, t.motion.spring);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, reduced]);

  const fillStyle = useAnimatedStyle(() => ({
    opacity: fill.value,
    transform: [{ scale: 0.7 + 0.3 * fill.value }],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      style={s.dayPill}
      accessibilityLabel={`${day}, ${sessionCount} sessions`}
      accessibilityState={{ selected }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, s.dayPillFill, fillStyle]} />
      <Text style={[s.dayLabel, selected && s.dayLabelSelected]}>{day}</Text>
      {isToday && (
        <View style={[s.todayDot, selected && s.todayDotSelected]} />
      )}
      {wlColor && (
        <View style={[s.workloadDot, { backgroundColor: wlColor }]} />
      )}
    </TouchableOpacity>
  );
}

export default function ScheduleScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const t = useTheme();
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDay());

  const user = useQuery(api.users.getById, userId ? { userId } : 'skip');
  const allSessions = useQuery(api.sessions.listByUser, userId ? { userId } : 'skip');
  const courses = useQuery(api.courses.listByUser, userId ? { userId } : 'skip');
  const activeSemester = useQuery(api.semesters.getActive, userId ? { userId } : 'skip');
  const upcomingDeadlines = useQuery(
    api.deadlines.listUpcoming,
    userId ? { userId, fromDate: new Date().toISOString().split('T')[0] } : 'skip'
  );
  const sessions = allSessions ?? [];
  const courseMap = useMemo(() => {
    if (!courses) return {};
    return Object.fromEntries(courses.map((c: any) => [c._id, c]));
  }, [courses]);

  const dayWorkloads = useMemo(() => {
    const map: Record<number, number> = {};
    const dlMap: Record<number, number> = {};
    for (const s of sessions) {
      const mins = toMinutes(s.endTime) - toMinutes(s.startTime);
      map[s.dayOfWeek] = (map[s.dayOfWeek] || 0) + mins;
    }
    // Deadline pressure per weekday (FR12) — approximate each deadline's
    // weekday from its calendar date.
    for (const d of upcomingDeadlines ?? []) {
      const dow = new Date(d.dueDate + 'T00:00:00').getDay();
      dlMap[dow] = (dlMap[dow] || 0) + 1;
    }
    const result: Record<number, WorkloadLevel> = {};
    for (const [day, mins] of Object.entries(map)) {
      result[Number(day)] = classifyWorkload(mins, dlMap[Number(day)] ?? 0);
    }
    return result;
  }, [sessions, upcomingDeadlines]);

  const isSelectedDayExamPeriod = useMemo(() => {
    if (!activeSemester?.examStart || !activeSemester?.examEnd) return false;
    const now = new Date();
    const diff = selectedDay - now.getDay();
    const target = new Date(now);
    target.setDate(target.getDate() + diff);
    const dateStr = target.toISOString().split('T')[0];
    return dateStr >= activeSemester.examStart! && dateStr <= activeSemester.examEnd!;
  }, [activeSemester, selectedDay]);

  const daySessions = useMemo(() => {
    return sessions
      .filter((s: any) => s.dayOfWeek === selectedDay)
      .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
  }, [sessions, selectedDay]);

  // FR8 — flag overlapping sessions for the selected day (warning, not block)
  const overlapIds = useMemo(() => {
    const flagged = new Set<string>();
    for (let i = 0; i < daySessions.length; i++) {
      for (let j = i + 1; j < daySessions.length; j++) {
        const a = daySessions[i];
        const b = daySessions[j];
        if (timeOverlaps(a.startTime, a.endTime, b.startTime, b.endTime)) {
          flagged.add(a._id);
          flagged.add(b._id);
        }
      }
    }
    return flagged;
  }, [daySessions]);

  // FR11 — deadlines due on the selected day
  const selectedDate = useMemo(() => dateForDayOfWeek(selectedDay), [selectedDay]);
  const dayDeadlines = useMemo(
    () => (upcomingDeadlines ?? []).filter((d: any) => d.dueDate === selectedDate),
    [upcomingDeadlines, selectedDate]
  );

  const dayWorkload = dayWorkloads[selectedDay] ?? 'light';

  const nextDeadline = useMemo(() => {
    if (!upcomingDeadlines || upcomingDeadlines.length === 0) return null;
    const sorted = [...upcomingDeadlines].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const first = sorted[0];
    const course = courseMap[first.courseId];
    return {
      title: first.title,
      courseCode: course?.code ?? '',
      daysLeft: daysUntil(first.dueDate),
      dateLabel: formatDate(first.dueDate),
    };
  }, [upcomingDeadlines, courseMap]);

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const wlColor: Record<WorkloadLevel, string> = {
    light: t.colors.workloadLight,
    balanced: t.colors.workloadBalanced,
    heavy: t.colors.workloadHeavy,
    overloaded: t.colors.workloadOverloaded,
  };

  const s = useStyles((th) => makeStyles(th));

  return (
    <View style={s.container}>
      <GreetingBanner name={firstName} />

      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.title}>Schedule</Text>
          {isSelectedDayExamPeriod && (
            <Chip
              label="Exam period"
              color={t.colors.workloadHeavy}
              textColor={t.colors.neutral950}
              style={s.examChip}
            />
          )}
        </View>
        <View style={s.headerRight}>
          <ProfileButton />
        </View>
      </View>

      {/* Hero — today at a glance. Sessions count, deadline countdown, workload state. */}
      <ElevatedSurface tier="tier1" style={s.hero}>
        <View style={s.heroRow}>
          <View style={s.heroStat}>
            <Text style={s.heroNumber}>{daySessions.length}</Text>
            <Text style={s.heroLabel}>sessions{'\n'}today</Text>
          </View>
          <View style={s.heroDivider} />
          <View style={s.heroStat}>
            <Text style={[s.heroNumber, nextDeadline && { color: t.colors.workloadOverloaded }]}>
              {nextDeadline ? `${nextDeadline.daysLeft}d` : '—'}
            </Text>
            <Text style={s.heroLabel}>next{'\n'}deadline</Text>
          </View>
          <View style={s.heroDivider} />
          <View style={s.heroWorkload}>
            <WorkloadIndicator level={dayWorkload} />
          </View>
        </View>
      </ElevatedSurface>

      {/* Courses — persistent access (no longer a dock tab) */}
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/courses')}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="My courses"
      >
        <Card style={s.coursesRow}>
          <View style={s.rowLeft}>
            <IconGraduationCap size={22} color={t.colors.ink} />
            <View>
              <Text style={s.coursesLabel}>My courses</Text>
              <Text style={s.coursesCount}>
                {courses?.length ?? 0} enrolled this semester
              </Text>
            </View>
          </View>
          <IconArrowRight color={t.colors.inkFaint} />
        </Card>
      </TouchableOpacity>

      {/* Week rail — glass tier-2 surface, spring selection */}
      <ElevatedSurface tier="tier2" style={s.weekRail} shadow="card">
        {DAYS.map((day, i) => {
          const sessionCount = sessions.filter((sess: any) => sess.dayOfWeek === i).length;
          const wl = dayWorkloads[i];
          return (
            <DayPill
              key={day}
              day={day}
              selected={i === selectedDay}
              isToday={i === new Date().getDay()}
              wlColor={wl ? wlColor[wl] : undefined}
              sessionCount={sessionCount}
              onPress={() => setSelectedDay(i)}
            />
          );
        })}
      </ElevatedSurface>

      <WaveDivider />

      {/* Day detail */}
      <ScrollView
        style={s.dayContent}
        contentContainerStyle={s.dayContentInner}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.dayHeader}>
          <Text style={s.dayTitle}>{FULL_DAYS[selectedDay]}</Text>
          {isSelectedDayExamPeriod && (
            <View style={s.examBadge}>
              <Text style={s.examBadgeText}>EXAM</Text>
            </View>
          )}
        </View>

        {daySessions.length === 0 ? (
          <EmptyState
            title={`${FULL_DAYS[selectedDay]} is clear`}
            message="Nothing scheduled. Add a course to start building this day."
            actionLabel="Add a course"
            onAction={() => router.push('/(tabs)/courses')}
          />
        ) : (
          daySessions.map((session: any) => {
            const course = courseMap[session.courseId];
            const hasOverlap = overlapIds.has(session._id);
            return (
              <TouchableOpacity
                key={session._id}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: '/session/create',
                    params: {
                      sessionId: session._id,
                      courseId: session.courseId,
                      day: String(session.dayOfWeek),
                    },
                  })
                }
                accessibilityLabel={`Edit ${session.type} session, ${course?.code ?? 'course'}, ${session.startTime} to ${session.endTime}${hasOverlap ? ', overlaps another session' : ''}`}
              >
                <Card
                  accentColor={hasOverlap ? t.colors.workloadHeavy : course?.color}
                  style={s.sessionCard}
                >
                  <View style={s.sessionRow}>
                    <View style={s.sessionTime}>
                      <Text style={s.timeText}>{session.startTime}</Text>
                      <Text style={s.timeText}>{session.endTime}</Text>
                    </View>
                    <View style={s.sessionInfo}>
                      <Text style={s.sessionTitle}>{course?.code ?? 'Course'}</Text>
                      <Text style={s.sessionSubtitle}>{course?.title ?? session.type}</Text>
                      <View style={s.sessionMeta}>
                        <Chip label={session.type} />
                        <Text style={s.locationText}>{session.location || 'TBA'}</Text>
                        {hasOverlap && (
                          <Chip
                            label="Overlap"
                            color={t.colors.workloadHeavy}
                            textColor={t.colors.neutral950}
                          />
                        )}
                      </View>
                    </View>
                    <View style={[s.typeIndicator, { backgroundColor: course?.color || t.colors.hairline }]}>
                      {(() => {
                        const TypeIcon = sessionTypeIcons[session.type] ?? IconClock;
                        return <TypeIcon size={15} color={t.colors.neutral950} strokeWidth={2} />;
                      })()}
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}

        {/* FR11 — deadlines due on this day */}
        {dayDeadlines.length > 0 && (
          <View style={s.upcomingSection}>
            <Text style={s.upcomingTitle}>Due this day</Text>
            {dayDeadlines.map((d: any) => {
              const course = courseMap[d.courseId];
              return (
                <TouchableOpacity
                  key={d._id}
                  activeOpacity={0.7}
                  onPress={() => router.push('/(tabs)/deadlines')}
                  accessibilityLabel={`${d.title} due ${d.dueDate}`}
                >
                  <Card accentColor={t.colors.workloadHeavy} style={s.deadlineRowCard}>
                    <View style={s.deadlineRowInner}>
                      <View style={s.deadlineIcon}>
                        <IconFlag size={17} color={t.colors.neutral950} strokeWidth={2} />
                      </View>
                      <View style={s.deadlineInfo}>
                        <Text style={s.deadlineTitle} numberOfLines={1}>
                          {course?.code ? `${course.code} — ` : ''}{d.title}
                        </Text>
                        <Text style={s.deadlineSub}>
                          {d.type}{d.dueTime ? ` · ${d.dueTime}` : ''}
                        </Text>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Upcoming deadline — real data */}
        {nextDeadline && daySessions.length > 0 && (
          <View style={s.upcomingSection}>
            <Text style={s.upcomingTitle}>Upcoming</Text>
            <View style={s.deadlineCard}>
              <View style={s.deadlineIcon}>
                <IconFlag size={17} color={t.colors.neutral950} strokeWidth={2} />
              </View>
              <View style={s.deadlineInfo}>
                <Text style={s.deadlineTitle}>
                  {nextDeadline.courseCode ? `${nextDeadline.courseCode} — ` : ''}{nextDeadline.title}
                </Text>
                <Text style={s.deadlineSub}>Due {nextDeadline.dateLabel}</Text>
              </View>
              <Text style={s.deadlineCountdown}>{nextDeadline.daysLeft}d</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Monoline arrow glyph — replaces the text "→" (system glyph, not ours)
function IconArrowRight({ color }: { color: string }) {
  const { Svg, Path } = require('react-native-svg');
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12h15M13 6l6 6-6 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function makeStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.canvas },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: t.spacing[5],
      paddingTop: t.spacing[2],
      paddingBottom: t.spacing[3],
    },
    headerLeft: { flex: 1 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] },
    title: {
      fontSize: t.typography.display,
      fontWeight: t.typography.bold,
      color: t.colors.ink,
      letterSpacing: t.typography.trackingDisplay,
    },
    examChip: { marginTop: t.spacing[2] },
    hero: {
      marginHorizontal: t.spacing[5],
      marginBottom: t.spacing[3],
      paddingVertical: t.spacing[4],
      paddingHorizontal: t.spacing[3],
      borderRadius: t.radii.card,
    },
    heroRow: { flexDirection: 'row', alignItems: 'center' },
    heroStat: { flex: 1, alignItems: 'center' },
    heroNumber: {
      fontSize: t.typography.hero,
      fontWeight: t.typography.bold,
      color: t.colors.ink,
      letterSpacing: t.typography.trackingHero,
      fontVariant: ['tabular-nums'],
      lineHeight: t.typography.hero + 2,
    },
    heroLabel: {
      fontSize: t.typography.micro,
      fontWeight: t.typography.medium,
      color: t.colors.inkSecondary,
      textAlign: 'center',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginTop: t.spacing[1],
      lineHeight: t.typography.micro + 3,
    },
    heroDivider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: 'stretch',
      backgroundColor: t.colors.hairline,
      marginVertical: t.spacing[2],
    },
    heroWorkload: { flex: 1.2, alignItems: 'center', justifyContent: 'center' },
    coursesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: t.spacing[5],
      marginBottom: t.spacing[3],
      padding: t.spacing[4],
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] },
    coursesLabel: {
      fontSize: t.typography.body,
      fontWeight: t.typography.semibold,
      color: t.colors.ink,
    },
    coursesCount: {
      fontSize: t.typography.caption,
      color: t.colors.inkSecondary,
      marginTop: t.spacing[0.5],
    },
    weekRail: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginHorizontal: t.spacing[5],
      marginBottom: t.spacing[2],
      paddingHorizontal: t.spacing[1.5],
      paddingVertical: t.spacing[1.5],
      borderRadius: t.radii.pill,
    },
    dayPill: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: t.spacing[2],
      paddingHorizontal: t.spacing[2],
      borderRadius: t.radii.pill,
      minWidth: 44,
      minHeight: 44,
    },
    dayLabel: {
      fontSize: t.typography.caption,
      fontWeight: t.typography.medium,
      color: t.colors.inkSecondary,
    },
    dayLabelSelected: { color: t.colors.fillInk, fontWeight: t.typography.semibold },
    dayPillFill: {
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.fill,
    },
    todayDot: {
      width: 4,
      height: 4,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.ink,
      marginTop: t.spacing[0.5],
    },
    todayDotSelected: { backgroundColor: t.colors.fillInk },
    workloadDot: { width: 6, height: 6, borderRadius: t.radii.pill, marginTop: t.spacing[0.5] },
    dayContent: { flex: 1 },
    dayContentInner: { padding: t.spacing[5], paddingBottom: t.spacing[30] },
    dayHeader: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3], marginBottom: t.spacing[4] },
    dayTitle: {
      fontSize: t.typography.title,
      fontWeight: t.typography.semibold,
      color: t.colors.ink,
      letterSpacing: t.typography.trackingDisplay,
    },
    examBadge: {
      paddingHorizontal: t.spacing[2],
      paddingVertical: 1,
      borderRadius: t.radii.chip,
      backgroundColor: t.colors.workloadHeavy,
    },
    examBadgeText: {
      fontSize: t.typography.micro,
      fontWeight: t.typography.bold,
      color: t.colors.neutral950,
      letterSpacing: 0.5,
    },
    sessionCard: { marginBottom: t.spacing[3] },
    sessionRow: { flexDirection: 'row', alignItems: 'flex-start' },
    sessionTime: { width: 52, marginRight: t.spacing[3] },
    timeText: {
      fontSize: t.typography.caption,
      fontWeight: t.typography.medium,
      color: t.colors.inkSecondary,
      fontVariant: ['tabular-nums'],
    },
    sessionInfo: { flex: 1 },
    sessionTitle: { fontSize: t.typography.body, fontWeight: t.typography.semibold, color: t.colors.ink },
    sessionSubtitle: { fontSize: t.typography.secondary, color: t.colors.inkSecondary, marginTop: 1 },
    sessionMeta: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[2], marginTop: t.spacing[2] },
    locationText: { fontSize: t.typography.caption, color: t.colors.inkSecondary },
    typeIndicator: {
      width: 28,
      height: 28,
      borderRadius: t.radii.chip,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: t.spacing[2],
    },
    deadlineRowCard: { marginBottom: t.spacing[2] },
    deadlineRowInner: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] },
    deadlineCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.tier1,
      borderRadius: t.radii.cardInner,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      padding: t.spacing[3.5],
      gap: t.spacing[3],
    },
    deadlineIcon: {
      width: 36,
      height: 36,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.subtleFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deadlineInfo: { flex: 1 },
    deadlineTitle: { fontSize: t.typography.secondary, fontWeight: t.typography.semibold, color: t.colors.ink },
    deadlineSub: { fontSize: t.typography.caption, color: t.colors.inkSecondary, marginTop: t.spacing[0.5] },
    deadlineCountdown: {
      fontSize: t.typography.body,
      fontWeight: t.typography.bold,
      color: t.colors.workloadOverloaded,
      fontVariant: ['tabular-nums'],
    },
    upcomingSection: { marginTop: t.spacing[4], gap: t.spacing[2] },
    upcomingTitle: {
      fontSize: t.typography.caption,
      fontWeight: t.typography.semibold,
      color: t.colors.inkSecondary,
      letterSpacing: 0.04,
      marginBottom: t.spacing[2],
      textTransform: 'uppercase',
    },
  });
}
