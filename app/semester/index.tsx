// Semester settings — FR14, FR15, FR16
import React, { useState, useMemo } from 'react';
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
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTheme, useStyles, type Theme } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { FormInput } from '@/components/Input';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/lib/auth';

export default function SemesterScreen() {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const { userId } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [examStart, setExamStart] = useState('');
  const [examEnd, setExamEnd] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | 'examStart' | 'examEnd'>('start');

  const semesters = useQuery(api.semesters.listByUser, userId ? { userId } : 'skip');
  const activeSemester = useQuery(api.semesters.getActive, userId ? { userId } : 'skip');
  const createSemester = useMutation(api.semesters.create);
  const updateSemester = useMutation(api.semesters.update);
  const deleteSemester = useMutation(api.semesters.remove);
  const bulkShift = useMutation(api.semesters.bulkShiftSessions);

  const resetForm = () => {
    setName('');
    setStartDate('');
    setEndDate('');
    setExamStart('');
    setExamEnd('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (!selectedDate) return;
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    if (pickerTarget === 'start') setStartDate(dateStr);
    else if (pickerTarget === 'end') setEndDate(dateStr);
    else if (pickerTarget === 'examStart') setExamStart(dateStr);
    else setExamEnd(dateStr);
  };

  const pickerValue = useMemo(() => {
    const val = pickerTarget === 'start' ? startDate : pickerTarget === 'end' ? endDate : pickerTarget === 'examStart' ? examStart : examEnd;
    if (val) {
      const [y, m, d] = val.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [pickerTarget, startDate, endDate, examStart, examEnd]);

  const handleSave = async () => {
    if (!name.trim() || !startDate || !endDate) {
      Alert.alert('Missing fields', 'Name, start date, and end date are required.');
      return;
    }
    if (!userId) return;
    try {
      if (editingId) {
        await updateSemester({
          id: editingId as any,
          name: name.trim(),
          startDate,
          endDate,
          examStart: examStart || undefined,
          examEnd: examEnd || undefined,
        });
      } else {
        await createSemester({
          userId,
          name: name.trim(),
          startDate,
          endDate,
          examStart: examStart || undefined,
          examEnd: examEnd || undefined,
        });
      }
      resetForm();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    }
  };

  const handleShiftSchedule = () => {
    Alert.alert(
      'Shift schedule',
      'Move all recurring sessions forward by 1 day? Use this when the university shifts the timetable.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Shift +1 day',
          onPress: () => { if (userId) bulkShift({ userId, dayOffset: 1 }); },
        },
        {
          text: 'Shift -1 day',
          onPress: () => { if (userId) bulkShift({ userId, dayOffset: -1 }); },
        },
      ]
    );
  };

  const handleDelete = (id: string, semName: string) => {
    Alert.alert('Delete semester', `Remove "${semName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteSemester({ id: id as any }),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Semester</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleShiftSchedule}
            style={styles.shiftButton}
            accessibilityLabel="Shift schedule"
          >
            <Text style={styles.shiftButtonText}>Shift</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowForm(!showForm)}
            style={styles.addButton}
            accessibilityLabel={showForm ? 'Cancel' : 'Add semester'}
          >
            <Text style={styles.addButtonText}>{showForm ? '×' : '+'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showForm && (
        <View style={styles.form}>
          <FormInput
            label="Semester name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Second Semester 2025/26"
          />
          <View style={styles.dateRow}>
            <View style={styles.dateInput}>
              <Text style={styles.dateLabel}>Start date</Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => { setPickerTarget('start'); setShowPicker(true); }}
                accessibilityLabel={`Start date: ${startDate || 'not set'}`}
              >
                <Text style={styles.dateBtnText}>{startDate || 'Pick date'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateInput}>
              <Text style={styles.dateLabel}>End date</Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => { setPickerTarget('end'); setShowPicker(true); }}
                accessibilityLabel={`End date: ${endDate || 'not set'}`}
              >
                <Text style={styles.dateBtnText}>{endDate || 'Pick date'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.formHint}>Exam period (optional)</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateInput}>
              <Text style={styles.dateLabel}>Exam starts</Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => { setPickerTarget('examStart'); setShowPicker(true); }}
                accessibilityLabel={`Exam start: ${examStart || 'not set'}`}
              >
                <Text style={styles.dateBtnText}>{examStart || 'Pick date'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateInput}>
              <Text style={styles.dateLabel}>Exam ends</Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => { setPickerTarget('examEnd'); setShowPicker(true); }}
                accessibilityLabel={`Exam end: ${examEnd || 'not set'}`}
              >
                <Text style={styles.dateBtnText}>{examEnd || 'Pick date'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {showPicker && (
            <DateTimePicker
              value={pickerValue}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
          )}
          <View style={styles.formActions}>
            <Button
              label={editingId ? 'Update' : 'Add semester'}
              onPress={handleSave}
              style={styles.formButton}
            />
            <Button
              label="Cancel"
              onPress={resetForm}
              variant="secondary"
              style={styles.formButton}
            />
          </View>
        </View>
      )}

      {(!semesters || semesters.length === 0) && !showForm ? (
        <EmptyState
          title="No semester set"
          message="Define your semester dates so Clover can track your schedule and exam periods."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {semesters?.map((sem: any) => {
            const isActive = activeSemester?._id === sem._id;
            return (
              <TouchableOpacity
                key={sem._id}
                onLongPress={() => handleDelete(sem._id, sem.name)}
                activeOpacity={0.7}
              >
                <Card
                  accentColor={
                    isActive ? t.colors.workloadBalanced : undefined
                  }
                  style={styles.semesterCard}
                >
                  <View style={styles.semesterRow}>
                    <View style={styles.semesterInfo}>
                      <View style={styles.semesterHeader}>
                        <Text style={styles.semesterName}>{sem.name}</Text>
                        {isActive && (
                          <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>Active</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.dates}>
                        {sem.startDate} — {sem.endDate}
                      </Text>
                      {sem.examStart && sem.examEnd && (
                        <Text style={styles.examDates}>
                          Exams: {sem.examStart} — {sem.examEnd}
                        </Text>
                      )}
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[12],
    paddingBottom: theme.spacing[4],
  },
  headerLeft: {
    width: 60,
  },
  backBtn: {
    paddingVertical: theme.spacing[1],
  },
  backBtnText: {
    fontSize: theme.typography.secondary,
    color: theme.colors.inkSecondary,
  },
  title: {
    fontSize: theme.typography.display,
    fontWeight: theme.typography.bold,
    color: theme.colors.ink,
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  shiftButton: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    minHeight: 44,
    borderRadius: theme.radii.chip,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  shiftButtonText: {
    fontSize: theme.typography.caption,
    fontWeight: theme.typography.semibold,
    color: theme.colors.ink,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: theme.colors.fillInk,
    fontSize: theme.typography.title,
    fontWeight: theme.typography.medium,
    marginTop: -2,
  },
  // Form
  form: {
    padding: theme.spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral200,
  },
  formHint: {
    fontSize: theme.typography.caption,
    color: theme.colors.inkSecondary,
    marginBottom: theme.spacing[2],
    marginTop: theme.spacing[2],
  },
  dateRow: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  dateInput: {
    flex: 1,
  },
  dateLabel: { fontSize: theme.typography.caption, fontWeight: theme.typography.medium, color: theme.colors.inkSecondary, marginBottom: theme.spacing[1] },
  dateBtn: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radii.cardInner,
    borderWidth: 1, borderColor: theme.colors.hairline,
    paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[2.5],
    minHeight: 44, justifyContent: 'center',
  },
  dateBtnText: { fontSize: theme.typography.body, color: theme.colors.ink },
  formActions: {
    flexDirection: 'row',
    gap: theme.spacing[3],
    marginTop: theme.spacing[2],
  },
  formButton: {
    flex: 1,
  },
  // List
  list: {
    padding: theme.spacing[5],
  },
  semesterCard: {
    marginBottom: theme.spacing[3],
  },
  semesterRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  semesterInfo: {
    flex: 1,
  },
  semesterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[1],
  },
  semesterName: {
    fontSize: theme.typography.body,
    fontWeight: theme.typography.semibold,
    color: theme.colors.ink,
  },
  activeBadge: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 1,
    borderRadius: theme.radii.chip,
    backgroundColor: theme.colors.workloadBalancedBg,
  },
  activeBadgeText: {
    fontSize: theme.typography.caption,
    fontWeight: theme.typography.semibold,
    color: theme.colors.fillInk,
  },
  dates: {
    fontSize: theme.typography.secondary,
    color: theme.colors.inkSecondary,
    fontVariant: ['tabular-nums'],
  },
  examDates: {
    fontSize: theme.typography.caption,
    color: theme.colors.workloadHeavy,
    marginTop: theme.spacing[1],
  },
});
