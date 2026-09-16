// Courses screen — all data from Convex, no hardcoded content
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Doc } from '../../convex/_generated/dataModel';
import { useTheme, useStyles, type Theme } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { FormInput } from '@/components/Input';
import { EmptyState } from '@/components/EmptyState';
import { ProfileButton } from '@/components/ProfileButton';
import { useAuth } from '@/lib/auth';
import { useNetworkStatus } from '@/lib/useNetworkStatus';
import { enqueue } from '@/lib/offlineQueue';
import Svg, { Path } from 'react-native-svg';
import { ThickFrame, CornerStamp, OffsetShadow, BoldDivider, FloatingTag } from '@/components/neoBrutalist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CoursesScreen() {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ compose?: string }>();
  const COURSE_TAG_COLORS = t.colors.courseTags;
  const { userId } = useAuth();
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const isOnline = isConnected && isInternetReachable !== false;
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(COURSE_TAG_COLORS[0]);

  // Open form when center button sends compose param
  useEffect(() => {
    if (params.compose === '1') {
      setShowForm(true);
    }
  }, [params.compose]);

  const courses = useQuery(api.courses.listByUser, userId ? { userId } : 'skip');
  const sessions = useQuery(api.sessions.listByUser, userId ? { userId } : 'skip');
  const createCourse = useMutation(api.courses.create);
  const updateCourse = useMutation(api.courses.update);
  const deleteCourse = useMutation(api.courses.remove);

  const displayCourses = courses ?? [];
  const allSessions = sessions ?? [];

  const totalSessions = useMemo(() => {
    const byCourse: Record<string, number> = {};
    for (const s of allSessions) {
      byCourse[s.courseId] = (byCourse[s.courseId] || 0) + 1;
    }
    return byCourse;
  }, [allSessions]);

  const resetForm = () => {
    setCode('');
    setTitle('');
    setSelectedColor(COURSE_TAG_COLORS[0]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!code.trim() || !title.trim()) {
      Alert.alert('Missing fields', 'Course code and title are required.');
      return;
    }
    if (!userId) return;
    try {
      if (editingId) {
        await updateCourse({ id: editingId as any, code: code.trim().toUpperCase(), title: title.trim(), color: selectedColor });
      } else {
        await createCourse({ userId, code: code.trim().toUpperCase(), title: title.trim(), color: selectedColor });
      }
      // Enqueue for offline persistence (FR28-29)
      if (!isOnline) {
        enqueue({
          collection: 'courses',
          documentId: editingId ?? undefined,
          operation: editingId ? 'patch' : 'insert',
          data: { userId, code: code.trim().toUpperCase(), title: title.trim(), color: selectedColor },
        }).catch(() => {});
      }
      resetForm();
    } catch (e) {
      Alert.alert('Error', (e instanceof Error ? e.message : null) || 'Something went wrong.');
    }
  };

  const handleEdit = (course: Doc<"courses">) => {
    setCode(course.code);
    setTitle(course.title);
    setSelectedColor(course.color);
    setEditingId(course._id);
    setShowForm(true);
  };

  const handleDelete = (id: string, code: string) => {
    Alert.alert('Delete course', `Delete ${code} and all its sessions? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteCourse({ id: id as any });
        if (!isOnline) {
          enqueue({ collection: 'courses', documentId: id, operation: 'delete', data: {} }).catch(() => {});
        }
      } },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          <ProfileButton />
        </View>
        <View>
          <Text style={styles.title}>Courses</Text>
          <Text style={styles.subtitle}>
            {displayCourses.length} course{displayCourses.length !== 1 ? 's' : ''} · {allSessions.length} session{allSessions.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowForm(!showForm)}
            style={styles.addButton}
            accessibilityLabel={showForm ? 'Cancel' : 'Add course'}
            accessibilityRole="button"
          >
            {showForm ? (
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M18 6L6 18M6 6l12 12" stroke={t.colors.fillInk} strokeWidth={2} strokeLinecap="round" />
              </Svg>
            ) : (
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M12 5v14M5 12h14" stroke={t.colors.fillInk} strokeWidth={2} strokeLinecap="round" />
              </Svg>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Course form */}
      {showForm && (
        <OffsetShadow offset={4} style={styles.formShadow}>
          <ThickFrame borderWidth={2} style={styles.formFrame}>
            <View style={styles.form}>
              <FormInput label="Course code" value={code} onChangeText={setCode} placeholder="e.g. MTH201" autoCapitalize="characters" />
              <FormInput label="Course title" value={title} onChangeText={setTitle} placeholder="e.g. Linear Algebra I" />
              <Text style={styles.colorLabel}>Tag color</Text>
              <View style={styles.colorRow}>
                {COURSE_TAG_COLORS.map((color: string) => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => setSelectedColor(color)}
                    style={[styles.colorSwatch, { backgroundColor: color }, selectedColor === color && styles.colorSwatchSelected]}
                accessibilityRole="radio"
                accessibilityLabel={`Select color ${color}`}
                accessibilityState={{ selected: selectedColor === color }}
              />
            ))}
          </View>
          <View style={styles.formActions}>
            <Button label={editingId ? 'Update' : 'Add course'} onPress={handleSave} style={styles.formButton} />
            <Button label="Cancel" onPress={resetForm} variant="secondary" style={styles.formButton} />
          </View>
        </View>
        </ThickFrame>
      </OffsetShadow>
      )}

      {/* Course list */}
      {(!displayCourses || displayCourses.length === 0) && !showForm ? (
        <EmptyState
          title="Your course list is empty"
          message="Add the courses you're taking this semester — each one gets its own color tag and sessions."
          actionLabel="Add your first course"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <FlatList
          data={displayCourses}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleEdit(item)}
              onLongPress={() => handleDelete(item._id, item.code)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${item.code}, ${item.title}. Tap to edit, hold to delete.`}
            >
              <Card accentColor={item.color} style={styles.courseCard}>
                <FloatingTag label={`${totalSessions[item._id] ?? 0}x`} position="topRight" color={item.color} textColor={t.colors.fillInk} />
                <View style={styles.courseRow}>
                  <View style={styles.courseColorBar} />
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseCode}>{item.code}</Text>
                    <Text style={styles.courseTitle}>{item.title}</Text>
                    <View style={styles.courseMeta}>
                      <Text style={styles.courseMetaText}>
                        {totalSessions[item._id] ?? 0} session{(totalSessions[item._id] ?? 0) === 1 ? '' : 's'} / week
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas },
  header: {
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[12],
    paddingBottom: theme.spacing[3],
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  backBtn: {
    paddingVertical: theme.spacing[1],
  },
  backBtnText: {
    fontSize: theme.typography.secondary,
    color: theme.colors.inkSecondary,
  },
  title: { fontSize: theme.typography.display, fontWeight: theme.typography.bold, color: theme.colors.ink },
  subtitle: { fontSize: theme.typography.caption, color: theme.colors.inkSecondary, marginTop: theme.spacing[0.5] },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
    marginTop: theme.spacing[2],
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Form
  formShadow: { marginHorizontal: theme.spacing[5], marginBottom: theme.spacing[3] },
  formFrame: { borderRadius: 4 },
  form: { padding: theme.spacing[5], borderBottomWidth: 0, borderBottomColor: theme.colors.neutral200 },
  colorLabel: { fontSize: theme.typography.secondary, fontWeight: theme.typography.medium, color: theme.colors.ink, marginBottom: theme.spacing[2] },
  colorRow: { flexDirection: 'row', gap: theme.spacing[2], marginBottom: theme.spacing[4] },
  colorSwatch: { width: 44, height: 44, borderRadius: theme.radii.pill },
  colorSwatchSelected: { borderWidth: 2, borderColor: theme.colors.neutral950 },
  formActions: { flexDirection: 'row', gap: theme.spacing[3] },
  formButton: { flex: 1 },
  // List
  list: { padding: theme.spacing[5], paddingBottom: theme.spacing[30] },
  courseCard: { marginBottom: theme.spacing[3] },
  courseRow: { flexDirection: 'row', alignItems: 'center' },
  courseColorBar: { width: 4, height: 48, borderRadius: theme.radii.pill, marginRight: theme.spacing[3.5] },
  courseInfo: { flex: 1 },
  courseCode: { fontSize: theme.typography.body, fontWeight: theme.typography.bold, color: theme.colors.ink },
  courseTitle: { fontSize: theme.typography.secondary, color: theme.colors.inkSecondary, marginTop: theme.spacing[0.5] },
  courseMeta: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[1], marginTop: theme.spacing[1] },
  courseMetaText: { fontSize: theme.typography.caption, color: theme.colors.inkSecondary },
  courseMetaDot: { fontSize: theme.typography.caption, color: theme.colors.inkFaint },
});
