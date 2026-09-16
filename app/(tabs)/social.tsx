// Social / Course rooms — FR21, FR22, FR23, FR24
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { useEffect } from 'react';
import { api } from '../../convex/_generated/api';
import type { Doc } from '../../convex/_generated/dataModel';
import { useTheme, useStyles, type Theme } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Button } from '@/components/Button';
import { FormInput } from '@/components/Input';
import { EmptyState } from '@/components/EmptyState';
import { HeaderBar } from '@/components/HeaderBar';
import { SideDrawer } from '@/components/SideDrawer';
import { RoomsSkeleton } from '@/components/SkeletonLoader';
import { useAuth } from '@/lib/auth';
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GeoDots } from '@/components/neoBrutalist';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SocialScreen() {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { userId } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  // Dock center action lands here with share=1 → open the sharing sheet
  const { share } = useLocalSearchParams<{ share?: string }>();
  const [shareSheetOpen, setShareSheetOpen] = useState(false);

  useEffect(() => {
    if (share === '1') {
      setShareSheetOpen(true);
      router.setParams({ share: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [share]);

  const courses = useQuery(api.courses.listByUser, userId ? { userId } : 'skip');
  const user = useQuery(api.users.getById, userId ? { userId } : 'skip');
  const userRooms = useQuery(api.social.getUserRooms, userId ? { userId } : 'skip');
  const joinRoom = useMutation(api.social.joinRoom);
  const leaveRoom = useMutation(api.social.leaveRoom);
  const toggleSharing = useMutation(api.social.toggleSharing);

  const institution = user?.institution ?? '';
  const roomMembers = useQuery(
    api.social.getRoomMembers,
    selectedRoom && institution
      ? { courseCode: selectedRoom, institution }
      : 'skip'
  );
  const overlap = useQuery(
    api.social.getFreeTimeOverlap,
    selectedRoom && institution
      ? { courseCode: selectedRoom, institution, dayOfWeek: new Date().getDay() }
      : 'skip'
  );
  const sharedDeadlines = useQuery(
    api.social.getSharedDeadlines,
    selectedRoom && institution
      ? { courseCode: selectedRoom, institution }
      : 'skip'
  );

  const userRoomMap = useMemo(() => {
    if (!userRooms) return {};
    return Object.fromEntries(userRooms.map((r: Doc<"courseRooms">) => [r.courseCode, r]));
  }, [userRooms]);

  const isLoading = courses === undefined || userRooms === undefined;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Enter course code', 'Type the course code to join its room.');
      return;
    }
    if (!userId) return;
    try {
      await joinRoom({
        userId,
        courseCode: joinCode.trim().toUpperCase(),
        institution: user?.institution || 'University',
      });
      setSelectedRoom(joinCode.trim().toUpperCase());
      setJoinCode('');
    } catch {
      Alert.alert('Error', 'Could not join room.');
    }
  };

  const handleToggleShare = async (courseCode: string, share: boolean) => {
    if (!userId) return;
    try {
      await toggleSharing({ userId, courseCode, share });
    } catch {
      Alert.alert('Error', 'Failed to update sharing settings.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Course Rooms</Text>
            <GeoDots rows={1} cols={6} dotSize={3} gap={6} color={t.colors.hairline} style={{ marginTop: 4 }} />
          </View>
          <HeaderBar
            onMenuPress={() => setDrawerOpen(true)}
            onSettingsPress={() => router.push('/(tabs)/settings')}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.inkSecondary} />}
      >
        {/* Join room */}
        <View style={styles.joinSection}>
          <FormInput
            label="Join a room"
            value={joinCode}
            onChangeText={setJoinCode}
            placeholder="Enter course code"
            autoCapitalize="characters"
          />
          <Button
            label="Join"
            onPress={handleJoin}
            style={styles.joinButton}
          />
        </View>

        {/* My rooms */}
        <Text style={styles.sectionTitle}>Your rooms</Text>
        {isLoading ? (
          <RoomsSkeleton />
        ) : (!courses || courses.length === 0) ? (
          <EmptyState
            title="No courses yet"
            message="Add courses first, then join their rooms to connect with course-mates."
          />
        ) : (
          courses.map((course: Doc<"courses">) => (
            <TouchableOpacity
              key={course._id}
              onPress={() => setSelectedRoom(course.code)}
              activeOpacity={0.7}
              accessibilityLabel={`${course.code} room`}
              accessibilityRole="button"
            >
              <Card
                accentColor={course.color}
                style={[
                  styles.roomCard,
                  selectedRoom === course.code ? styles.roomCardSelected : undefined,
                ].filter(Boolean) as any}
              >
                <View style={styles.roomRow}>
                  <View style={styles.roomInfo}>
                    <Text style={styles.roomCode}>{course.code}</Text>
                    <Text style={styles.roomTitle}>{course.title}</Text>
                  </View>
                  <View style={styles.shareToggle}>
                    <Text style={styles.shareLabel}>Share free time</Text>
                    <Switch
                      value={userRoomMap[course.code]?.shareFreeTime ?? false}
                      onValueChange={(val) =>
                        handleToggleShare(course.code, val)
                      }
                      trackColor={{
                        false: t.colors.hairline,
                        true: t.colors.neutral500,
                      }}
                      thumbColor={t.colors.white}
                      accessibilityLabel={`Share free time in ${course.code}`}
                    />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}

        {/* Room detail */}
        {selectedRoom && (
          <View style={styles.roomDetail}>
            <Text style={styles.sectionTitle}>{selectedRoom} room</Text>

            {/* Members */}
            <Card style={styles.detailCard}>
              <Text style={styles.detailLabel}>Members</Text>
              {roomMembers?.map((member: { userId: string; name: string; department: string; shareFreeTime: boolean }) => (
                <View key={member.userId} style={styles.memberRow}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Chip
                    label={
                      member.shareFreeTime ? 'Sharing' : 'Private'
                    }
                    color={
                      member.shareFreeTime
                        ? t.colors.workloadLight
                        : t.colors.hairline
                    }
                    textColor={
                      member.shareFreeTime
                        ? t.colors.ink
                        : t.colors.neutral600
                    }
                  />
                </View>
              ))}
              {roomMembers?.length === 0 && (
                <Text style={styles.emptyText}>No members yet</Text>
              )}
            </Card>

            {/* Free time overlap (FR23) */}
            <Card style={styles.detailCard}>
              <Text style={styles.detailLabel}>Free time today</Text>
              {overlap && overlap.overlapSlots.length > 0 ? (
                <View style={styles.overlapGrid}>
                  {overlap.overlapSlots.slice(0, 8).map((slot: { start: string; end: string; freeCount: number }, i: number) => (
                    <View key={i} style={styles.overlapSlot}>
                      <Text style={styles.overlapTime}>
                        {slot.start}–{slot.end}
                      </Text>
                      <Text style={styles.overlapCount}>
                        {slot.freeCount} free
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>
                  {overlap?.memberCount === 0
                    ? 'No one is sharing their schedule yet'
                    : 'No overlap found'}
                </Text>
              )}
            </Card>

            {/* Shared deadlines (FR23) */}
            <Card style={styles.detailCard}>
              <Text style={styles.detailLabel}>Shared deadlines</Text>
              {sharedDeadlines && sharedDeadlines.length > 0 ? (
                sharedDeadlines.map((d: { title: string; type: string; dueDate: string; dueTime?: string }, i: number) => (
                  <View key={i} style={styles.deadlineRow}>
                    <Text style={styles.deadlineTitle}>{d.title}</Text>
                    <Text style={styles.deadlineDate}>{d.dueDate}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>
                  No shared deadlines for this course
                </Text>
              )}
            </Card>

            <Button
              label="Leave room"
              onPress={() => {
                if (!userId) return;
                leaveRoom({ userId, courseCode: selectedRoom });
                setSelectedRoom(null);
              }}
              variant="secondary"
              style={styles.leaveButton}
            />
          </View>
        )}
      </ScrollView>

      {/* Sharing settings sheet — opened by the dock's center action */}
      <Modal
        visible={shareSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setShareSheetOpen(false)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setShareSheetOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Sharing settings</Text>
            <Text style={styles.sheetSubtitle}>
              Choose which courses reveal your free time to course-mates.
            </Text>
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              {(!courses || courses.length === 0) && (
                <Text style={styles.emptyText}>No courses yet — add courses first.</Text>
              )}
              {courses?.map((course: Doc<"courses">) => (
                <View key={course._id} style={styles.shareRow}>
                  <View>
                    <Text style={styles.shareRowCode}>{course.code}</Text>
                    <Text style={styles.shareRowTitle}>{course.title}</Text>
                  </View>
                  <Switch
                    value={userRoomMap[course.code]?.shareFreeTime ?? false}
                    onValueChange={(val) => handleToggleShare(course.code, val)}
                    trackColor={{
                      false: t.colors.hairline,
                      true: t.colors.neutral500,
                    }}
                    thumbColor={t.colors.white}
                    accessibilityLabel={`Share free time in ${course.code}`}
                  />
                </View>
              ))}
            </ScrollView>
            <Button label="Done" onPress={() => setShareSheetOpen(false)} style={styles.sheetDone} />
          </Pressable>
        </Pressable>
      </Modal>
      <SideDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  header: {
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[12],
    paddingBottom: theme.spacing[4],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Sharing sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: theme.colors.glassSurface,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.elevated,
    borderTopLeftRadius: theme.radii.sheet,
    borderTopRightRadius: theme.radii.sheet,
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[8],
  },
  sheetHandle: {
    alignSelf: 'center',
    width: theme.spacing[8],
    height: theme.spacing[1],
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.hairline,
    marginBottom: theme.spacing[4],
  },
  sheetTitle: {
    fontSize: theme.typography.title,
    fontWeight: theme.typography.bold,
    color: theme.colors.ink,
  },
  sheetSubtitle: {
    fontSize: theme.typography.secondary,
    color: theme.colors.inkSecondary,
    marginTop: theme.spacing[1],
    marginBottom: theme.spacing[4],
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.subtleFill,
  },
  shareRowCode: {
    fontSize: theme.typography.body,
    fontWeight: theme.typography.semibold,
    color: theme.colors.ink,
  },
  shareRowTitle: {
    fontSize: theme.typography.caption,
    color: theme.colors.inkSecondary,
  },
  sheetScroll: {
    maxHeight: 300,
  },
  sheetDone: {
    marginTop: theme.spacing[5],
  },
  title: {
    fontSize: theme.typography.display,
    fontWeight: theme.typography.bold,
    color: theme.colors.ink,
  },
  content: {
    padding: theme.spacing[5],
    paddingBottom: theme.spacing[30],
  },
  // Join section
  joinSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing[3],
    marginBottom: theme.spacing[6],
  },
  joinButton: {
    marginBottom: theme.spacing[4],
  },
  // Section title
  sectionTitle: {
    fontSize: theme.typography.secondary,
    fontWeight: theme.typography.semibold,
    color: theme.colors.inkSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing[3],
  },
  // Room cards
  roomCard: {
    marginBottom: theme.spacing[2],
  },
  roomCardSelected: {
    borderWidth: 2,
    borderColor: theme.colors.ink,
  },
  roomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomInfo: {
    flex: 1,
  },
  roomCode: {
    fontSize: theme.typography.body,
    fontWeight: theme.typography.bold,
    color: theme.colors.ink,
  },
  roomTitle: {
    fontSize: theme.typography.caption,
    color: theme.colors.inkSecondary,
  },
  shareToggle: {
    alignItems: 'flex-end',
    gap: 2,
  },
  shareLabel: {
    fontSize: theme.typography.micro,
    color: theme.colors.inkSecondary,
  },
  // Room detail
  roomDetail: {
    marginTop: theme.spacing[6],
  },
  detailCard: {
    marginBottom: theme.spacing[3],
  },
  detailLabel: {
    fontSize: theme.typography.secondary,
    fontWeight: theme.typography.semibold,
    color: theme.colors.ink,
    marginBottom: theme.spacing[3],
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.hairline,
  },
  memberName: {
    fontSize: theme.typography.body,
    color: theme.colors.ink,
  },
  overlapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  overlapSlot: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.radii.chip,
    backgroundColor: theme.colors.hairline,
  },
  overlapTime: {
    fontSize: theme.typography.caption,
    fontWeight: theme.typography.semibold,
    color: theme.colors.ink,
    fontVariant: ['tabular-nums'],
  },
  overlapCount: {
    fontSize: theme.typography.micro,
    color: theme.colors.inkSecondary,
  },
  deadlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.hairline,
  },
  deadlineTitle: {
    fontSize: theme.typography.body,
    color: theme.colors.ink,
  },
  deadlineDate: {
    fontSize: theme.typography.caption,
    color: theme.colors.inkSecondary,
    fontVariant: ['tabular-nums'],
  },
  emptyText: {
    fontSize: theme.typography.secondary,
    color: theme.colors.inkSecondary,
  },
  leaveButton: {
    marginTop: theme.spacing[4],
  },
});
