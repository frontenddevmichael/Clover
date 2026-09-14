// Semester settings — FR14, FR15, FR16
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTheme, useStyles, type Theme } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { FormInput } from '@/components/Input';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/lib/auth';

export default function SemesterScreen() {
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
            <FormInput
              label="Start date"
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              style={styles.dateInput}
            />
            <FormInput
              label="End date"
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              style={styles.dateInput}
            />
          </View>
          <Text style={styles.formHint}>Exam period (optional)</Text>
          <View style={styles.dateRow}>
            <FormInput
              label="Exam starts"
              value={examStart}
              onChangeText={setExamStart}
              placeholder="YYYY-MM-DD"
              style={styles.dateInput}
            />
            <FormInput
              label="Exam ends"
              value={examEnd}
              onChangeText={setExamEnd}
              placeholder="YYYY-MM-DD"
              style={styles.dateInput}
            />
          </View>
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
