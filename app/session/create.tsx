// Session creation/editing modal — FR5, FR6, FR7
// Glass sheet (ui-prompt.md §5), 28px top radius, drag handle
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTheme, useStyles, type Theme } from '@/lib/theme';
import { FormInput } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAuth } from '@/lib/auth';

const SESSION_TYPES = ['lecture', 'lab', 'tutorial', 'study', 'revision'] as const;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SessionModal() {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const { userId } = useAuth();
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
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn} accessibilityLabel="Cancel">
            <Text style={styles.cancelBtnText}>Cancel</Text>
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
                    color: t.colors.neutral950,
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
          <FormInput
            label="Date"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
          />
        )}

        {/* Time inputs */}
        <View style={styles.timeRow}>
          <FormInput
            label="Start"
            value={startTime}
            onChangeText={setStartTime}
            placeholder="HH:MM"
            style={styles.timeInput}
          />
          <FormInput
            label="End"
            value={endTime}
            onChangeText={setEndTime}
            placeholder="HH:MM"
            style={styles.timeInput}
          />
        </View>

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
    backgroundColor: 'rgba(247, 247, 248, 0.95)',
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
    backgroundColor: theme.colors.neutral200,
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
    borderColor: theme.colors.neutral950,
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
    backgroundColor: theme.colors.neutral200,
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
    borderColor: theme.colors.neutral950,
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
  // Actions
  saveButton: {
    marginTop: theme.spacing[6],
  },
  deleteButton: {
    marginTop: theme.spacing[3],
  },
});
