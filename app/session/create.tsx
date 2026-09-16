// Session creation/editing modal — FR5, FR6, FR7
// Glass sheet (ui-prompt.md §5), 28px top radius, drag handle
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTheme, useStyles, type Theme } from '@/lib/theme';
import Svg, { Path } from 'react-native-svg';
import type { Doc } from '../../convex/_generated/dataModel';
import { FormInput } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAuth } from '@/lib/auth';
import { scheduleSessionReminder } from '@/lib/notifications';
import { useNetworkStatus } from '@/lib/useNetworkStatus';
import { enqueue } from '@/lib/offlineQueue';

const SESSION_TYPES = ['lecture', 'lab', 'tutorial', 'study', 'revision'] as const;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SessionModal() {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const { userId } = useAuth();
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const isOnline = isConnected && isInternetReachable !== false;
  const params = useLocalSearchParams<{
    courseId?: string;
    sessionId?: string;
    day?: string;
  }>();

  const courses = useQuery(api.courses.listByUser, userId ? { userId } : 'skip');
  const existing = useQuery(
    api.sessions.getById,
    params.sessionId ? { id: params.sessionId as any } : 'skip'
  );
  const notifPrefs = useQuery(api.notifications.getPreferences, userId ? { userId } : 'skip');

  const createRecurring = useMutation(api.sessions.createRecurring);
  const createOneOff = useMutation(api.sessions.createOneOff);
  const updateSession = useMutation(api.sessions.update);
  const deleteSession = useMutation(api.sessions.remove);

  const [selectedCourse, setSelectedCourse] = useState(params.courseId || '');
  const [type, setType] = useState<typeof SESSION_TYPES[number]>('lecture');
  const [isRecurring, setIsRecurring] = useState(true);
  const [dayOfWeek, setDayOfWeek] = useState(
    params.day ? parseInt(params.day) : new Date().getDay()
  );
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [recurrencePattern, setRecurrencePattern] = useState<
    'weekly' | 'biweekly' | 'custom'
  >('weekly');

  // Overlap detection (FR8) — fetch all sessions for the target day
  const overlapDay = isRecurring ? dayOfWeek : (date ? new Date(date + 'T12:00:00').getDay() : dayOfWeek);
  const daySessions = useQuery(
    api.sessions.listByUserAndDay,
    userId ? { userId, dayOfWeek: overlapDay } : 'skip'
  );

  // Time picker state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end'>('start');

  // Overlap detection — check if proposed time overlaps any existing session (FR8)
  const overlappingSession = useMemo(() => {
    if (!startTime || !endTime || !daySessions?.length) return null;
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const propStart = toMin(startTime);
    const propEnd = toMin(endTime);
    if (propStart >= propEnd) return null;

    for (const s of daySessions) {
      if (params.sessionId && s._id === params.sessionId) continue;
      const sStart = toMin(s.startTime);
      const sEnd = toMin(s.endTime);
      if (propStart < sEnd && sStart < propEnd) {
        return s;
      }
    }
    return null;
  }, [startTime, endTime, daySessions, params.sessionId]);

  const overlapCourse = useMemo(() => {
    if (!overlappingSession || !courses) return null;
    return courses.find((c: Doc<'courses'>) => c._id === overlappingSession.courseId) ?? null;
  }, [overlappingSession, courses]);

  const timePickerValue = useMemo(() => {
    const timeStr = pickerTarget === 'start' ? startTime : endTime;
    if (!timeStr) return new Date();
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  }, [pickerTarget, startTime, endTime]);

  const handleTimeChange = (_: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (!selectedDate) return;
    const h = String(selectedDate.getHours()).padStart(2, '0');
    const m = String(selectedDate.getMinutes()).padStart(2, '0');
    const timeStr = `${h}:${m}`;
    if (pickerTarget === 'start') setStartTime(timeStr);
    else setEndTime(timeStr);
  };

  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (!selectedDate) return;
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    setDate(`${y}-${m}-${d}`);
  };

  const datePickerValue = useMemo(() => {
    if (date) {
      const [y, m, d] = date.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [date]);

  useEffect(() => {
    if (params.courseId) setSelectedCourse(params.courseId);
  }, [params.courseId]);

  // Prefill when editing an existing session (FR7)
  useEffect(() => {
    if (!existing || !params.sessionId) return;
    setSelectedCourse(existing.courseId);
    setType(existing.type);
    setIsRecurring(existing.isRecurring);
    setStartTime(existing.startTime);
    setEndTime(existing.endTime);
    if (existing.isRecurring) {
      setDayOfWeek(existing.dayOfWeek);
      if (existing.recurrencePattern) setRecurrencePattern(existing.recurrencePattern);
    } else if (existing.date) {
      setDate(existing.date);
    }
  }, [existing, params.sessionId]);

  const handleSave = async () => {
    if (!selectedCourse || !startTime || !endTime) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    if (!isRecurring && !date) {
      Alert.alert('Missing date', 'One-off sessions need a date.');
      return;
    }
    if (!userId) return;

    try {
      if (params.sessionId) {
        await updateSession({
          id: params.sessionId as any,
          courseId: selectedCourse as any,
          type,
          dayOfWeek: isRecurring ? dayOfWeek : undefined,
          startTime,
          endTime,
          date: !isRecurring ? date : undefined,
          recurrencePattern: isRecurring ? recurrencePattern : undefined,
          // Clear the one-off date when switching to recurring, and vice versa
          ...(isRecurring ? { date: undefined } : { recurrencePattern: undefined }),
        });
      } else if (isRecurring) {
        await createRecurring({
          userId,
          courseId: selectedCourse as any,
          type,
          dayOfWeek,
          startTime,
          endTime,
          recurrencePattern,
        });
      } else {
        await createOneOff({
          userId,
          courseId: selectedCourse as any,
          type,
          date,
          startTime,
          endTime,
        });
      }
      // Schedule notification reminder (FR25)
      if (notifPrefs?.sessionReminders !== false && selectedCourse && startTime) {
        const course = courses?.find((c: Doc<"courses">) => c._id === selectedCourse);
        scheduleSessionReminder({
          courseCode: course?.code ?? 'Course',
          type,
          dayOfWeek: isRecurring ? dayOfWeek : new Date().getDay(),
          startTime,
          leadMinutes: notifPrefs?.sessionLeadMinutes ?? 15,
          quietHoursStart: notifPrefs?.quietHoursStart,
          quietHoursEnd: notifPrefs?.quietHoursEnd,
        }).catch(() => {});
      }
      // Enqueue for offline persistence (FR28-29)
      if (!isOnline) {
        const isCreate = !params.sessionId;
        const isDelete = false;
        enqueue({
          collection: 'sessions',
          documentId: params.sessionId,
          operation: isCreate ? 'insert' : 'patch',
          data: { userId, courseId: selectedCourse, type, dayOfWeek: isRecurring ? dayOfWeek : undefined, startTime, endTime, date: !isRecurring ? date : undefined, recurrencePattern: isRecurring ? recurrencePattern : undefined },
        }).catch(() => {});
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    }
  };

  const handleDelete = () => {
    if (!params.sessionId) return;
    Alert.alert(
      'Delete session',
      'Remove this session? This can\'t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSession({ id: params.sessionId as any });
            if (!isOnline) {
              enqueue({ collection: 'sessions', documentId: params.sessionId, operation: 'delete', data: {} }).catch(() => {});
            }
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Glass sheet header */}
      <View style={styles.sheetHeader}>
        <View style={styles.sheetHeaderRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn} accessibilityLabel="Go back">
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M15 18l-6-6 6-6" stroke={t.colors.inkSecondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          <Text style={styles.sheetTitle}>
            {params.sessionId ? 'Edit session' : 'New session'}
          </Text>
          <View style={styles.cancelBtn} />
        </View>
        <View style={styles.dragHandle} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        keyboardShouldPersistTaps="handled"
      >
        {/* Course selector */}
        <Text style={styles.label}>Course</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.courseScroll}
        >
          {courses?.map((course: any) => (
            <TouchableOpacity
              key={course._id}
              onPress={() => setSelectedCourse(course._id)}
              style={[
                styles.courseOption,
                { borderColor: course.color },
                selectedCourse === course._id && {
                  backgroundColor: course.color,
                },
              ]}
            >
              <Text
                style={[
                  styles.courseOptionText,
                  selectedCourse === course._id && {
                    color: t.colors.ink,
                  },
                ]}
              >
                {course.code}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Session type */}
        <Text style={styles.label}>Type</Text>
        <View style={styles.typeRow}>
              {SESSION_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setType(t)}
              style={[
                styles.typeOption,
                type === t && styles.typeOptionSelected,
              ]}
              accessibilityRole="radio"
              accessibilityLabel={`Session type: ${t}`}
              accessibilityState={{ checked: type === t }}
            >
              <Text
                style={[
                  styles.typeOptionText,
                  type === t && styles.typeOptionTextSelected,
                ]}
              >
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recurring toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.label}>Recurring</Text>
          <TouchableOpacity
            onPress={() => setIsRecurring(!isRecurring)}
            style={[
              styles.toggle,
              isRecurring && styles.toggleOn,
            ]}
            accessibilityRole="switch"
            accessibilityState={{ checked: isRecurring }}
            accessibilityLabel="Recurring session"
          >
            <View
              style={styles.toggleKnob}
            />
          </TouchableOpacity>
        </View>

        {/* Day picker (recurring) or date input (one-off) */}
        {isRecurring ? (
          <>
            <Text style={styles.label}>Day</Text>
            <View style={styles.dayRow}>
              {DAYS.map((day, i) => (
                <TouchableOpacity
                  key={day}
                  onPress={() => setDayOfWeek(i)}
                  style={[
                    styles.dayOption,
                    dayOfWeek === i && styles.dayOptionSelected,
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel={day}
                  accessibilityState={{ selected: dayOfWeek === i }}
                >
                  <Text
                    style={[
                      styles.dayOptionText,
                      dayOfWeek === i && styles.dayOptionTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Recurrence</Text>
            <View style={styles.typeRow}>
              {(['weekly', 'biweekly', 'custom'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setRecurrencePattern(p)}
                  style={[
                    styles.typeOption,
                    recurrencePattern === p && styles.typeOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      recurrencePattern === p && styles.typeOptionTextSelected,
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <View>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowDatePicker(true)}
              accessibilityLabel={`Date: ${date || 'not set'}`}
            >
              <Text style={styles.dateBtnText}>{date || 'Pick date'}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={datePickerValue}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
            )}
          </View>
        )}

        {/* Time inputs */}
        <View style={styles.timeRow}>
          <View style={styles.timeInput}>
            <Text style={styles.label}>Start</Text>
            <TouchableOpacity
              style={styles.timeBtn}
              onPress={() => { setPickerTarget('start'); setShowTimePicker(true); }}
              accessibilityLabel={`Start time: ${startTime || 'not set'}`}
            >
              <Text style={styles.timeBtnText}>{startTime || 'HH:MM'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.timeInput}>
            <Text style={styles.label}>End</Text>
            <TouchableOpacity
              style={styles.timeBtn}
              onPress={() => { setPickerTarget('end'); setShowTimePicker(true); }}
              accessibilityLabel={`End time: ${endTime || 'not set'}`}
            >
              <Text style={styles.timeBtnText}>{endTime || 'HH:MM'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showTimePicker && (
          <DateTimePicker
            value={timePickerValue}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}

        {/* Overlap warning (FR8 — warning only, never blocks) */}
        {overlappingSession && (
          <Card
            accentColor={t.colors.workloadHeavy}
            style={styles.overlapWarning}
          >
            <View style={styles.overlapRow}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 9v4m0 4h.01M12 2l10 18H2L12 2z"
                  stroke={t.colors.workloadHeavy}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={styles.overlapText}>
                This overlaps with {overlapCourse?.code ?? 'another'} session ({overlappingSession.startTime}–{overlappingSession.endTime})
              </Text>
            </View>
          </Card>
        )}

        {/* Actions */}
        <Button
          label={params.sessionId ? 'Update session' : 'Add session'}
          onPress={handleSave}
          style={styles.saveButton}
        />

        {params.sessionId && (
          <Button
            label="Delete session"
            onPress={handleDelete}
            variant="secondary"
            style={styles.deleteButton}
          />
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.glassSurface,
    // Liquid Glass effect (§5)
  },
  sheetHeader: {
    paddingTop: theme.spacing[3],
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[4],
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[2],
  },
  cancelBtn: {
    width: 60,
    alignItems: 'flex-start',
  },
  cancelBtnText: {
    fontSize: theme.typography.secondary,
    color: theme.colors.inkSecondary,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.hairline,
    marginBottom: theme.spacing[3],
  },
  sheetTitle: {
    fontSize: theme.typography.title,
    fontWeight: theme.typography.bold,
    color: theme.colors.ink,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: theme.spacing[5],
  },
  label: {
    fontSize: theme.typography.secondary,
    fontWeight: theme.typography.medium,
    color: theme.colors.ink,
    marginBottom: theme.spacing[2],
    marginTop: theme.spacing[4],
  },
  // Course selector
  courseScroll: {
    marginBottom: theme.spacing[2],
  },
  courseOption: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: theme.radii.chip,
    borderWidth: 1.5,
    borderColor: theme.colors.hairline,
    marginRight: theme.spacing[2],
  },
  courseOptionText: {
    fontSize: theme.typography.secondary,
    fontWeight: theme.typography.semibold,
    color: theme.colors.ink,
  },
  // Type selector
  typeRow: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    flexWrap: 'wrap',
  },
  typeOption: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2.5],
    minHeight: 44,
    borderRadius: theme.radii.chip,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  typeOptionSelected: {
    backgroundColor: theme.colors.fill,
    borderColor: theme.colors.ink,
  },
  typeOptionText: {
    fontSize: theme.typography.caption,
    fontWeight: theme.typography.medium,
    color: theme.colors.ink,
  },
  typeOptionTextSelected: {
    color: theme.colors.fillInk,
  },
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing[4],
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.hairline,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  toggleOn: {
    backgroundColor: theme.colors.fill,
    alignItems: 'flex-end',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.tier1,
  },
  // Day picker
  dayRow: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  dayOption: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOptionSelected: {
    backgroundColor: theme.colors.fill,
    borderColor: theme.colors.ink,
  },
  dayOptionText: {
    fontSize: theme.typography.caption,
    fontWeight: theme.typography.medium,
    color: theme.colors.ink,
  },
  dayOptionTextSelected: {
    color: theme.colors.fillInk,
  },
  // Time inputs
  timeRow: {
    flexDirection: 'row',
    gap: theme.spacing[3],
    marginTop: theme.spacing[4],
  },
  timeInput: {
    flex: 1,
  },
  dateBtn: {
    backgroundColor: theme.colors.subtleFill,
    borderRadius: theme.radii.chip,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing[3],
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    minHeight: 44,
    justifyContent: 'center',
  },
  dateBtnText: {
    fontSize: theme.typography.secondary,
    color: theme.colors.ink,
    textAlign: 'center',
  },
  timeBtn: {
    backgroundColor: theme.colors.subtleFill,
    borderRadius: theme.radii.chip,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing[3],
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  timeBtnText: {
    fontSize: theme.typography.secondary,
    color: theme.colors.ink,
    textAlign: 'center',
  },
  // Actions
  saveButton: {
    marginTop: theme.spacing[6],
  },
  deleteButton: {
    marginTop: theme.spacing[3],
  },
  // Overlap warning
  overlapWarning: {
    marginTop: theme.spacing[4],
  },
  overlapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  overlapText: {
    fontSize: theme.typography.caption,
    color: theme.colors.workloadHeavy,
    flex: 1,
  },
});
