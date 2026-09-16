// Insights screen — analytics, charts, and productivity trends.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useQuery } from 'convex/react';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { api } from '../../convex/_generated/api';
import { useTheme, useStyles, type Theme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/Card';
import { ProfileButton } from '@/components/ProfileButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CornerStamp, GeoDots, CountBadge } from '@/components/neoBrutalist';
import {
  aggregateDailyMinutes,
  aggregateCourseBreakdown,
  aggregateWeeklyTrend,
  computeInsightStats,
} from '@/lib/analytics';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_PADDING = 20;
const CHART_W = SCREEN_W - CHART_PADDING * 2 - 40;

// ─── Mini bar chart ─────────────────────────────────────────────────────────
function MiniBarChart({
  data,
  maxVal,
  labels,
  barColor,
  height = 120,
}: {
  data: number[];
  maxVal: number;
  labels: string[];
  barColor: string;
  height?: number;
}) {
  const t = useTheme();
  const barW = Math.max(8, (CHART_W - data.length * 4) / data.length);
  const chartH = height - 20;

  return (
    <Svg viewBox={`0 0 ${CHART_W} ${height}`} width={CHART_W} height={height}>
      {/* Baseline */}
      <Line x1={0} y1={chartH} x2={CHART_W} y2={chartH} stroke={t.colors.hairline} strokeWidth={1} />

      {data.map((val, i) => {
        const barH = maxVal > 0 ? (val / maxVal) * chartH : 0;
        const x = i * (barW + 4);
        const y = chartH - barH;
        return (
          <React.Fragment key={i}>
            <Rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(barH, 2)}
              rx={3}
              fill={val > 0 ? barColor : t.colors.subtleFill}
            />
            <SvgText
              x={x + barW / 2}
              y={chartH + 14}
              textAnchor="middle"
              fontSize={9}
              fill={t.colors.inkSecondary}
            >
              {labels[i]}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// ─── Horizontal bar chart (for course breakdown) ────────────────────────────
function HorizontalBarChart({
  items,
  maxVal,
  height = 28,
}: {
  items: { label: string; value: number; color: string }[];
  maxVal: number;
  height?: number;
}) {
  const t = useTheme();
  const barMaxW = CHART_W - 60;

  return (
    <View style={{ gap: 8 }}>
      {items.map((item, i) => {
        const barW = maxVal > 0 ? (item.value / maxVal) * barMaxW : 0;
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: t.typography.caption, fontWeight: t.typography.semibold, color: t.colors.ink, width: 48, textAlign: 'right' }}>{item.label}</Text>
            <View style={{ flex: 1, borderRadius: t.radii.chip, overflow: 'hidden', backgroundColor: t.colors.subtleFill }}>
              <View
                style={{
                  width: Math.max(barW, 4),
                  backgroundColor: item.color || t.colors.fill,
                  height,
                  borderRadius: t.radii.chip,
                }}
              />
            </View>
            <Text style={{ fontSize: t.typography.micro, color: t.colors.inkSecondary, width: 40 }}>{item.value}m</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  const t = useTheme();
  return (
    <Card style={{ width: '48%', paddingHorizontal: t.spacing[3], paddingVertical: t.spacing[3] }}>
      <Text style={{ fontSize: t.typography.title, fontWeight: t.typography.bold, color: t.colors.ink }}>
        {value}
        {unit && <Text style={{ fontSize: t.typography.secondary, fontWeight: t.typography.medium, color: t.colors.inkSecondary }}> {unit}</Text>}
      </Text>
      <Text style={{ fontSize: t.typography.micro, fontWeight: t.typography.medium, color: t.colors.inkSecondary, marginTop: t.spacing[0.5] }}>{label}</Text>
    </Card>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────
export default function InsightsScreen() {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();

  const sessions = useQuery(api.sessions.listByUser, userId ? { userId } : 'skip');
  const courses = useQuery(api.courses.listByUser, userId ? { userId } : 'skip');
  const deadlines = useQuery(
    api.deadlines.listUpcoming,
    userId ? { userId, fromDate: '2020-01-01' } : 'skip'
  );
  const focusSessions = useQuery(
    api.focusSessions.listToday,
    userId ? { userId } : 'skip'
  );

  const stats = useMemo(() => {
    if (!sessions || !deadlines) return null;
    return computeInsightStats({
      sessions,
      focusSessions: focusSessions ?? [],
      deadlines,
    });
  }, [sessions, deadlines, focusSessions]);

  const dailyData = useMemo(() => {
    if (!sessions) return [];
    return aggregateDailyMinutes(sessions, 7);
  }, [sessions]);

  const courseData = useMemo(() => {
    if (!sessions || !courses) return [];
    return aggregateCourseBreakdown(sessions, courses);
  }, [sessions, courses]);

  const weeklyData = useMemo(() => {
    if (!sessions) return [];
    return aggregateWeeklyTrend(sessions);
  }, [sessions]);

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Insights</Text>
          <GeoDots rows={1} cols={8} dotSize={3} gap={6} color={t.colors.hairline} style={{ marginTop: 4 }} />
        </View>
        <ProfileButton />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overview stats */}
        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Study hours" value={Math.round((stats?.totalMinutesThisWeek ?? 0) / 60)} unit="hrs" />
          <StatCard label="Daily avg" value={stats?.avgDailyMinutes ?? 0} unit="min" />
          <StatCard label="Streak" value={stats?.streakDays ?? 0} unit="days" />
          <StatCard label="Focus sessions" value={stats?.totalFocusSessions ?? 0} />
        </View>

        {/* Daily bar chart */}
        <Text style={styles.sectionTitle}>Daily Minutes</Text>
        <Card style={styles.chartCard}>
          <MiniBarChart
            data={dailyData.map((d) => d.minutes)}
            maxVal={Math.max(...dailyData.map((d) => d.minutes), 1)}
            labels={dayLabels}
            barColor={t.colors.fill}
          />
        </Card>

        {/* Course breakdown */}
        {courseData.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>By Course</Text>
            <Card style={styles.chartCard}>
              <HorizontalBarChart
                items={courseData.slice(0, 6).map((c) => ({
                  label: c.code,
                  value: c.minutes,
                  color: c.color,
                }))}
                maxVal={Math.max(...courseData.map((c) => c.minutes), 1)}
              />
            </Card>
          </>
        )}

        {/* Weekly trend */}
        <Text style={styles.sectionTitle}>Weekly Trend</Text>
        <Card style={styles.chartCard}>
          <MiniBarChart
            data={weeklyData.map((w) => w.minutes)}
            maxVal={Math.max(...weeklyData.map((w) => w.minutes), 1)}
            labels={weeklyData.map((w) => w.week)}
            barColor={t.colors.workloadBalancedBg}
            height={100}
          />
        </Card>

        {/* Productivity insights */}
        <Text style={styles.sectionTitle}>Productivity</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Best day" value={stats?.mostProductiveDay ?? 'N/A'} />
          <StatCard label="Peak hour" value={stats?.mostProductiveHour ?? 'N/A'} />
          <StatCard label="Deadlines met" value={stats?.totalSessionsCompleted ?? 0} />
          <StatCard label="Focus time" value={stats?.focusMinutes ?? 0} unit="min" />
        </View>

        {/* Motivation */}
        <Card style={styles.motivationCard}>
          <CornerStamp label="TIP" color={t.colors.fill} textColor={t.colors.fillInk} style={styles.tipStamp} />
          <Text style={[styles.motivationText, { color: t.colors.ink }]}>
            {stats?.streakDays ?? 0 >= 3
              ? `Great streak! You've studied ${stats?.streakDays} days in a row. Keep it up!`
              : 'Try to study a little each day. Even 30 minutes builds a strong habit.'}
          </Text>
        </Card>
      </ScrollView>
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
    content: {
      padding: t.spacing[5],
      paddingBottom: 120,
    },
    sectionTitle: {
      fontSize: t.typography.caption,
      fontWeight: t.typography.semibold,
      color: t.colors.inkSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.04,
      marginBottom: t.spacing[3],
      marginTop: t.spacing[5],
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: t.spacing[2],
    },
    statCard: {
      width: '48%',
      paddingHorizontal: t.spacing[3],
      paddingVertical: t.spacing[3],
    },
    statValue: {
      fontSize: t.typography.title,
      fontWeight: t.typography.bold,
    },
    statUnit: {
      fontSize: t.typography.secondary,
      fontWeight: t.typography.medium,
    },
    statLabel: {
      fontSize: t.typography.micro,
      fontWeight: t.typography.medium,
      marginTop: t.spacing[0.5],
    },
    chartCard: {
      paddingHorizontal: t.spacing[3],
      paddingVertical: t.spacing[3],
      alignItems: 'center',
    },
    hBarLabel: {
      fontSize: t.typography.caption,
      fontWeight: t.typography.semibold,
      width: 48,
      textAlign: 'right',
    },
    hBarTrack: {
      flex: 1,
      borderRadius: t.radii.chip,
      overflow: 'hidden',
    },
    hBarFill: {
      borderRadius: t.radii.chip,
    },
    hBarValue: {
      fontSize: t.typography.micro,
      width: 40,
    },
    motivationCard: {
      marginTop: t.spacing[5],
      paddingHorizontal: t.spacing[3],
      paddingVertical: t.spacing[4],
    },
    motivationText: {
      fontSize: t.typography.secondary,
      lineHeight: 22,
    },
    tipStamp: {
      position: 'absolute',
      top: -8,
      left: 12,
      zIndex: 10,
    },
  });
}
