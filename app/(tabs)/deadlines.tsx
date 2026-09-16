// Deadlines screen — all data from Convex, no hardcoded content
import React, { useState, useMemo, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Doc } from '../../convex/_generated/dataModel';
import { useTheme, useStyles, type Theme } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Button } from '@/components/Button';
import { FormInput } from '@/components/Input';
import { EmptyState } from '@/components/EmptyState';
import { ProfileButton } from '@/components/ProfileButton';
import { HeaderBar } from '@/components/HeaderBar';
import { SideDrawer } from '@/components/SideDrawer';
import { useAuth } from '@/lib/auth';
import { IconFileText, IconBarChart, IconTarget, IconBell } from '@/components/Illustrations';
import Svg, { Path } from 'react-native-svg';
import { OffsetShadow, BoldDivider, CornerStamp, CountBadge } from '@/components/neoBrutalist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleDeadlineReminder } from '@/lib/notifications';
import { useNetworkStatus } from '@/lib/useNetworkStatus';
import { enqueue } from '@/lib/offlineQueue';
import { daysUntil } from '@/lib/dateUtils';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  useReducedMotion,
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const DEADLINE_TYPES = ['assignment', 'ca', 'exam'] as const;

const typeConfig = (theme: Theme) => ({
  assignment: { label: 'Assignment', color: theme.colors.neutral500, Icon: IconFileText },
  ca: { label: 'CA', color: theme.colors.workloadBalanced, Icon: IconBarChart },
  exam: { label: 'Exam', color: theme.colors.workloadOverloaded, Icon: IconTarget },
});

// Completion check that draws itself on — the signature completion moment.
// Reduce-motion: the finished check, instantly.
function DrawnCheck({ size = 14 }: { size?: number }) {
  const reduced = useReducedMotion() ?? false;
  const p = useSharedValue(0);
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(p.value, [0, 1], [22, 0]),
  }));

  useEffect(() => {
    if (reduced) {
      p.value = 1;
      return;
    }
    p.value = withDelay(80, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));
  }, [reduced]);

  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <AnimatedPath
        d="M5 12.8 L10 17.6 L19.2 7"
        stroke="#FFFFFF"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={22}
        animatedProps={checkProps}
      />
    </Svg>
  );
}

// Flattened theme shorthand for the style block below
export default function DeadlinesScreen() {
  const t = useTheme();
  const c = { ...t.colors, spacing: t.spacing, radii: t.radii, typography: t.typography } as const;
  const typeCfg = typeConfig(t);
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { userId } = useAuth();
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const isOnline = isConnected && isInternetReachable !== false;
  const router = useRouter();
  // Dock center action lands here with compose=1 → open the add form
  const { compose } = useLocalSearchParams<{ compose?: string }>();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [type, setType] = useState<typeof DEADLINE_TYPES[number]>('assignment');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<string | null>(null);

  const fromDate = new Date().toISOString().split('T')[0];
  const deadlines = useQuery(api.deadlines.listUpcoming, userId ? { userId, fromDate } : 'skip');
  const courses = useQuery(api.courses.listByUser, userId ? { userId } : 'skip');
  const notifPrefs = useQuery(api.notifications.getPreferences, userId ? { userId } : 'skip');
  const createDeadline = useMutation(api.deadlines.create);
  const updateDeadline = useMutation(api.deadlines.update);
  const deleteDeadline = useMutation(api.deadlines.remove);
  const markComplete = useMutation(api.deadlines.markComplete);

  const displayDeadlines = deadlines ?? [];

  useEffect(() => {
    if (compose === '1') {
      resetForm();
      setShowForm(true);
      // Clear the param so back-navigation doesn't reopen the form
      router.setParams({ compose: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compose]);

  const courseMap = useMemo(() => {
    if (!courses) return {};
    // Keyed by _id — deadline rows resolve course color/code from courseId
    return Object.fromEntries(courses.map((c: Doc<"courses">) => [c._id, c]));
  }, [courses]);

  const resetForm = () => {
    setTitle('');
    setCourseCode('');
    setType('assignment');
    setDueDate('');
    setDueTime('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (!selectedDate) return;
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    setDueDate(`${y}-${m}-${d}`);
  };

  const handleTimeChange = (_: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (!selectedDate) return;
    const h = String(selectedDate.getHours()).padStart(2, '0');
    const m = String(selectedDate.getMinutes()).padStart(2, '0');
    setDueTime(`${h}:${m}`);
  };

  const datePickerValue = useMemo(() => {
    if (dueDate) {
      const [y, m, d] = dueDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [dueDate]);

  const timePickerValue = useMemo(() => {
    if (dueTime) {
      const [h, m] = dueTime.split(':').map(Number);
      const d = new Date();
      d.setHours(h || 0, m || 0, 0, 0);
      return d;
    }
    return new Date();
  }, [dueTime]);

  const handleSave = async () => {
    if (!title.trim() || !dueDate) {
      Alert.alert('Missing fields', 'Title and due date are required.');
      return;
    }
    const course = courses?.find((c: Doc<"courses">) => c.code.toLowerCase() === courseCode.toLowerCase());
    if (!course) {
      Alert.alert('Course not found', 'Enter a valid course code.');
      return;
    }
    if (!userId) return;
    try {
      if (editingId) {
        await updateDeadline({ id: editingId as any, title: title.trim(), type, dueDate, dueTime: dueTime || undefined });
      } else {
        await createDeadline({ userId, courseId: course._id, title: title.trim(), type, dueDate, dueTime: dueTime || undefined });
      }
      // Schedule deadline reminder (FR26)
      if (notifPrefs?.deadlineReminders !== false) {
        scheduleDeadlineReminder({
          title: title.trim(),
          courseCode: course.code,
          dueDate,
          dueTime: dueTime || undefined,
          leadHours: notifPrefs?.deadlineLeadHours ?? 24,
          quietHoursStart: notifPrefs?.quietHoursStart,
          quietHoursEnd: notifPrefs?.quietHoursEnd,
        }).catch(() => {});
      }
      // Enqueue for offline persistence (FR28-29)
      if (!isOnline) {
        enqueue({
          collection: 'deadlines',
          documentId: editingId ?? undefined,
          operation: editingId ? 'patch' : 'insert',
          data: { userId, courseId: course._id, title: title.trim(), type, dueDate, dueTime: dueTime || undefined },
        }).catch(() => {});
      }
      resetForm();
    } catch (e) {
      Alert.alert('Error', (e instanceof Error ? e.message : null) || 'Something went wrong.');
    }
  };

  const handleComplete = (id: string) => {
    markComplete({ id: id as any });
  };

  const handleEdit = (d: Doc<"deadlines">) => {
    setTitle(d.title);
    setCourseCode(courses?.find((c: Doc<"courses">) => c._id === d.courseId)?.code ?? '');
    setType(d.type);
    setDueDate(d.dueDate);
    setDueTime(d.dueTime ?? '');
    setEditingId(d._id);
    setShowForm(true);
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete deadline', `Remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDeadline({ id: id as any }) },
    ]);
  };

  const urgentCount = displayDeadlines.filter((d: Doc<"deadlines">) => {
    const days = daysUntil(d.dueDate);
    return days >= 0 && days <= 3 && !d.completed;
  }).length;

  const overdueCount = displayDeadlines.filter((d: Doc<"deadlines">) => daysUntil(d.dueDate) < 0 && !d.completed).length;

  return (
    <>
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Deadlines</Text>
            <Text style={styles.subtitle}>
              {displayDeadlines.length} upcoming
              {urgentCount > 0 && ` · ${urgentCount} due soon`}
              {overdueCount > 0 && ` · ${overdueCount} overdue`}
            </Text>
          </View>
          <HeaderBar
            onMenuPress={() => setDrawerOpen(true)}
            onSettingsPress={() => router.push('/(tabs)/settings')}
          />
        </View>
      </View>

      {/* Urgent banner — wow factor */}
      {urgentCount > 0 && (
        <OffsetShadow offset={4} style={styles.urgentShadow}>
          <View style={styles.urgentBanner}>
            <CornerStamp label="URGENT" color={t.colors.workloadOverloadedBg} style={styles.urgentStamp} />
            <View style={styles.urgentIconWrap}>
              <IconBell size={20} color={t.colors.neutral900} strokeWidth={2} />
            </View>
            <View style={styles.urgentInfo}>
              <Text style={styles.urgentTitle}>Due soon</Text>
              <Text style={styles.urgentSub}>{urgentCount} deadline{urgentCount > 1 ? 's' : ''} in the next 3 days</Text>
            </View>
            <CountBadge count={urgentCount} size={28} color={t.colors.workloadOverloadedBg} />
          </View>
        </OffsetShadow>
      )}

      <BoldDivider shape="square" style={{ marginHorizontal: 20, marginTop: 4, marginBottom: 8 }} />

      {/* Form */}
      {showForm && (
        <View style={styles.form}>
          <FormInput label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Essay 2" />
          <FormInput label="Course code" value={courseCode} onChangeText={setCourseCode} placeholder="e.g. MTH201" autoCapitalize="characters" />
          <Text style={styles.formLabel}>Type</Text>
          <View style={styles.typeRow}>
            {DEADLINE_TYPES.map((dt) => (
              <TouchableOpacity
                key={dt}
                onPress={() => setType(dt)}
                style={[styles.typeOption, type === dt && styles.typeOptionSelected]}
              >
                {(() => {
                  const TypeIcon = typeCfg[dt].Icon;
                  return <TypeIcon size={15} color={t.colors.neutral950} strokeWidth={2} />;
                })()}
                <Text style={[styles.typeOptionText, type === dt && styles.typeOptionTextSelected]}>{typeCfg[dt].label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.dateRow}>
            <View style={styles.dateInput}>
              <Text style={styles.dateLabel}>Due date</Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setShowDatePicker(true)}
                accessibilityLabel={`Due date: ${dueDate || 'not set'}`}
              >
                <Text style={styles.dateBtnText}>{dueDate || 'Pick date'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateInput}>
              <Text style={styles.dateLabel}>Time (opt.)</Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setShowTimePicker(true)}
                accessibilityLabel={`Due time: ${dueTime || 'not set'}`}
              >
                <Text style={styles.dateBtnText}>{dueTime || 'Pick time'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={datePickerValue}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={timePickerValue}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}
          <View style={styles.formActions}>
            <Button label={editingId ? 'Update' : 'Add deadline'} onPress={handleSave} style={styles.formButton} />
            <Button label="Cancel" onPress={resetForm} variant="secondary" style={styles.formButton} />
          </View>
        </View>
      )}

      {/* Deadline list */}
      {displayDeadlines.length === 0 && !showForm ? (
        <EmptyState title="All clear" message="No upcoming deadlines. When you add assignments, CAs, or exams, they'll show up here." />
      ) : (
        <FlatList
          data={displayDeadlines}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const days = daysUntil(item.dueDate);
            const isUrgent = days >= 0 && days <= 3;
            const isOverdue = days < 0;
            const isToday = days === 0;

            return (
              <TouchableOpacity
                onLongPress={() => handleEdit(item)}
                onPress={() => setSelectedDeadlineId(selectedDeadlineId === item._id ? null : item._id)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.type}, due ${item.dueDate}. Hold to edit.`}
              >
                <Card
                  accentColor={courseMap[item.courseId]?.color || typeCfg[item.type as keyof typeof typeCfg].color}
                  style={[
                    styles.deadlineCard,
                    (item.completed as boolean) ? styles.deadlineCardCompleted : undefined,
                    selectedDeadlineId === item._id ? styles.deadlineCardSelected : undefined,
                  ] as any}
                >
                  <View style={styles.deadlineRow}>
                    {/* Countdown circle — wow factor */}
                    <View style={[styles.countdownCircle, isUrgent && styles.countdownUrgent, isOverdue && styles.countdownOverdue, isToday && styles.countdownToday]}>
                      <Text style={[styles.countdownNum, (isUrgent || isOverdue) && { color: t.colors.white }]}>
                        {isOverdue ? Math.abs(days) : days}
                      </Text>
                      <Text style={[styles.countdownLabel, (isUrgent || isOverdue) && { color: t.colors.white }]}>
                        {isOverdue ? 'over' : 'days'}
                      </Text>
                    </View>

                    <View style={styles.deadlineInfo}>
                      <View style={styles.deadlineHeader}>
                        <Text style={styles.deadlineTitle}>{item.title}</Text>
                      </View>
                      <View style={styles.deadlineMeta}>
                        <Chip label={typeCfg[item.type as keyof typeof typeCfg].label} color={
                          item.type === 'ca' ? t.colors.workloadBalancedBg :
                          item.type === 'exam' ? t.colors.workloadOverloadedBg :
                          undefined
                        } />
                        <Text style={styles.courseCode}>{courseMap[item.courseId]?.code ?? 'Course'}</Text>
                      </View>
                      <View style={styles.dueRow}>
                        <Text style={[styles.dueDate, isUrgent && styles.dueDateUrgent, isOverdue && styles.dueDateOverdue]}>
                          {item.dueDate}{item.dueTime ? ` · ${item.dueTime}` : ''}
                        </Text>
                        <Text style={[styles.dueBadge, isUrgent && styles.dueBadgeUrgent, isOverdue && styles.dueBadgeOverdue, isToday && styles.dueBadgeToday]}>
                          {isOverdue ? `${Math.abs(days)}d overdue` : isToday ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d left`}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity onPress={() => handleComplete(item._id)} style={styles.checkButton} accessibilityLabel="Mark complete">
                      <View style={[styles.checkCircle, item.completed && styles.checkCircleDone]}>
                        {item.completed && <DrawnCheck size={13} />}
                      </View>
                    </TouchableOpacity>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
    <SideDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

const makeStyles = (theme: Theme) => {
  const c = { ...theme.colors, spacing: theme.spacing, radii: theme.radii, typography: theme.typography } as const;
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.neutral50 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[12],
    paddingBottom: theme.spacing[3],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  title: { fontSize: theme.typography.display, fontWeight: theme.typography.bold, color: theme.colors.neutral950 },
  subtitle: { fontSize: theme.typography.caption, color: theme.colors.neutral500, marginTop: theme.spacing[0.5] },
  // Urgent banner
  urgentShadow: { marginHorizontal: theme.spacing[5], marginBottom: theme.spacing[4] },
  urgentBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.warningBg, borderRadius: c.radii.cardInner, borderWidth: 1, borderColor: c.warningBorder, padding: c.spacing[3.5], gap: c.spacing[3],
  },
  urgentStamp: { position: 'absolute', top: -8, left: 12, zIndex: 10 },
  urgentIconWrap: {
    width: 36, height: 36, borderRadius: c.radii.pill, backgroundColor: c.warningBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  urgentInfo: { flex: 1 },
  urgentTitle: { fontSize: c.typography.secondary, fontWeight: c.typography.semibold, color: c.neutral900 },
  urgentSub: { fontSize: c.typography.caption, color: c.neutral500, marginTop: c.spacing[0.5] },
  urgentArrow: { alignItems: 'center', justifyContent: 'center' },
  // Form
  form: { padding: theme.spacing[5], borderBottomWidth: 1, borderBottomColor: theme.colors.neutral200 },
  formLabel: { fontSize: theme.typography.secondary, fontWeight: theme.typography.medium, color: theme.colors.neutral950, marginBottom: theme.spacing[2] },
  typeRow: { flexDirection: 'row', gap: theme.spacing[1.5], marginBottom: theme.spacing[4] },
  typeOption: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[2.5],
    minHeight: 44, borderRadius: theme.radii.chip, borderWidth: 1, borderColor: theme.colors.neutral200,
  },
  typeOptionSelected: { backgroundColor: theme.colors.neutral950, borderColor: theme.colors.neutral950 },
  typeOptionText: { fontSize: theme.typography.caption, fontWeight: theme.typography.medium, color: theme.colors.neutral950 },
  typeOptionTextSelected: { color: theme.colors.white },
  dateRow: { flexDirection: 'row', gap: theme.spacing[3] },
  dateInput: { flex: 1 },
  dateLabel: { fontSize: theme.typography.caption, fontWeight: theme.typography.medium, color: theme.colors.inkSecondary, marginBottom: theme.spacing[1] },
  dateBtn: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radii.cardInner,
    borderWidth: 1, borderColor: theme.colors.hairline,
    paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[2.5],
    minHeight: 44, justifyContent: 'center',
  },
  dateBtnText: { fontSize: theme.typography.body, color: theme.colors.ink },
  formActions: { flexDirection: 'row', gap: theme.spacing[3], marginTop: theme.spacing[2] },
  formButton: { flex: 1 },
  // List
  list: { padding: theme.spacing[5], paddingBottom: theme.spacing[30] },
  deadlineCard: { marginBottom: theme.spacing[3] },
  deadlineCardCompleted: { opacity: 0.5 },
  deadlineCardSelected: { borderWidth: 2, borderColor: theme.colors.workloadBalanced, backgroundColor: theme.colors.workloadBalancedBg },
  deadlineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  // Countdown circle — wow factor
  countdownCircle: {
    width: 56, height: 56, borderRadius: c.radii.sheet,
    backgroundColor: c.neutral100, borderWidth: 2, borderColor: c.neutral200,
    alignItems: 'center', justifyContent: 'center', marginRight: c.spacing[3.5],
  },
  countdownUrgent: { backgroundColor: c.workloadOverloadedBg, borderColor: c.workloadOverloadedBg },
  countdownOverdue: { backgroundColor: c.overdueBg, borderColor: c.overdueBg },
  countdownToday: { backgroundColor: c.workloadBalancedBg, borderColor: c.workloadBalancedBg },
  countdownNum: { fontSize: c.typography.body, fontWeight: c.typography.bold, color: c.neutral950 },
  countdownLabel: { fontSize: c.typography.micro, fontWeight: c.typography.medium, color: c.neutral500, marginTop: c.spacing[0] },
  deadlineInfo: { flex: 1 },
  deadlineHeader: { flexDirection: 'row', alignItems: 'center', gap: c.spacing[2], marginBottom: c.spacing[1] },
  deadlineTitle: { fontSize: c.typography.body, fontWeight: c.typography.semibold, color: c.neutral950, flex: 1 },
  deadlineMeta: { flexDirection: 'row', alignItems: 'center', gap: c.spacing[2], marginBottom: c.spacing[1] },
  courseCode: { fontSize: c.typography.caption, color: c.neutral500, fontWeight: c.typography.medium },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: c.spacing[2] },
  dueDate: { fontSize: c.typography.caption, color: c.neutral500, fontVariant: ['tabular-nums'] },
  dueDateUrgent: { color: c.workloadOverloaded },
  dueDateOverdue: { color: c.overdue },
  dueBadge: {
    fontSize: c.typography.micro, fontWeight: c.typography.semibold, color: c.neutral500,
    backgroundColor: c.neutral100, paddingHorizontal: c.spacing[2], paddingVertical: c.spacing[0.5], borderRadius: c.radii.pill,
  },
  dueBadgeUrgent: { color: c.white, backgroundColor: c.workloadOverloadedBg },
  dueBadgeOverdue: { color: c.white, backgroundColor: c.overdueBg },
  dueBadgeToday: { color: c.white, backgroundColor: c.workloadBalancedBg },
  checkButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  checkCircle: { width: 24, height: 24, borderRadius: c.radii.pill, borderWidth: 2, borderColor: c.neutral200 },
  checkCircleDone: { backgroundColor: c.neutral950, borderColor: c.neutral950, alignItems: 'center', justifyContent: 'center' },
  });
};
