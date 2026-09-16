// Profile screen — edit name, institution, department, level.
// Accessed from the SideDrawer profile section.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTheme, useStyles, type Theme } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { ProfileSkeleton } from '@/components/SkeletonLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GeoDots } from '@/components/neoBrutalist';

export default function ProfileScreen() {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useAuth();
  const user = useQuery(api.users.getById, userId ? { userId } : 'skip');
  const updateProfile = useMutation(api.users.updateProfile);
  const toast = useToast();

  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [department, setDepartment] = useState('');
  const [level, setLevel] = useState('300');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setInstitution(user.institution ?? '');
    setDepartment(user.department ?? '');
    setLevel(user.level ? String(user.level) : '300');
  }, [user?.name, user?.institution, user?.department, user?.level]);

  const dirty = useMemo(() => {
    if (!user) return false;
    return (
      name !== (user.name ?? '') ||
      institution !== (user.institution ?? '') ||
      department !== (user.department ?? '') ||
      level !== (user.level ? String(user.level) : '300')
    );
  }, [user, name, institution, department, level]);

  const handleSave = async () => {
    if (!userId) return;
    if (!name.trim() || !institution.trim()) {
      Alert.alert('Missing fields', 'Name and institution are required.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        id: userId,
        name: name.trim(),
        institution: institution.trim(),
        department: department.trim(),
        level: parseInt(level, 10) || 100,
      });
      toast.success('Profile updated');
    } catch {
      Alert.alert('Error', 'Could not save your profile.');
    }
    setSaving(false);
  };

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Profile</Text>
          <GeoDots rows={1} cols={6} dotSize={3} gap={6} color={t.colors.hairline} style={{ marginTop: 2 }} />
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!user ? (
          <ProfileSkeleton />
        ) : (
          <>
            {/* Avatar */}
            <View style={styles.avatarWrap}>
              <View style={[styles.avatar, { backgroundColor: t.colors.fill }]}>
                <Text style={[styles.avatarText, { color: t.colors.fillInk }]}>{initials}</Text>
              </View>
              <Text style={[styles.email, { color: t.colors.inkSecondary }]}>{user?.email ?? ''}</Text>
            </View>

        {/* Editable fields */}
        <Text style={[styles.sectionTitle, { color: t.colors.inkSecondary }]}>Personal info</Text>

        <Card style={styles.card}>
          <View style={styles.editRow}>
            <Text style={[styles.label, { color: t.colors.ink }]}>Name</Text>
            <TextInput
              style={[styles.editInput, { color: t.colors.ink }]}
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor={t.colors.neutral300}
              autoCapitalize="words"
              accessibilityLabel="Name"
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.editRow}>
            <Text style={[styles.label, { color: t.colors.ink }]}>Institution</Text>
            <TextInput
              style={[styles.editInput, { color: t.colors.ink }]}
              value={institution}
              onChangeText={setInstitution}
              placeholder="e.g. University of Lagos"
              placeholderTextColor={t.colors.neutral300}
              autoCapitalize="words"
              accessibilityLabel="Institution"
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.editRow}>
            <Text style={[styles.label, { color: t.colors.ink }]}>Department</Text>
            <TextInput
              style={[styles.editInput, { color: t.colors.ink }]}
              value={department}
              onChangeText={setDepartment}
              placeholder="e.g. Computer Science"
              placeholderTextColor={t.colors.neutral300}
              autoCapitalize="words"
              accessibilityLabel="Department"
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.editRow}>
            <Text style={[styles.label, { color: t.colors.ink }]}>Level</Text>
            <View style={styles.levelRow}>
              {['100', '200', '300', '400', '500'].map((l) => (
                <TouchableOpacity
                  key={l}
                  onPress={() => setLevel(l)}
                  style={[
                    styles.levelBtn,
                    level === l && { backgroundColor: t.colors.ink },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: level === l }}
                >
                  <Text
                    style={[
                      styles.levelBtnText,
                      { color: level === l ? t.colors.canvas : t.colors.inkSecondary },
                    ]}
                  >
                    {l}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        {dirty && (
          <Button
            label={saving ? 'Saving...' : 'Save changes'}
            onPress={handleSave}
            loading={saving}
            style={styles.saveBtn}
          />
        )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[2],
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: theme.typography.secondary,
    fontWeight: theme.typography.medium,
    color: theme.colors.ink,
  },
  title: {
    fontSize: theme.typography.display,
    fontWeight: theme.typography.bold,
    color: theme.colors.ink,
    letterSpacing: theme.typography.trackingDisplay,
  },
  content: {
    padding: theme.spacing[5],
    paddingBottom: 100,
    gap: theme.spacing[2.5],
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: theme.spacing[2],
    gap: theme.spacing[2],
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: theme.typography.title,
    fontWeight: theme.typography.semibold,
  },
  email: {
    fontSize: theme.typography.secondary,
  },
  sectionTitle: {
    fontSize: theme.typography.caption,
    fontWeight: theme.typography.semibold,
    color: theme.colors.inkSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing[0.5],
    marginTop: theme.spacing[2],
  },
  card: {
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[3.5],
  },
  editRow: {
    gap: theme.spacing[1.5],
  },
  label: {
    fontSize: theme.typography.caption,
    fontWeight: theme.typography.medium,
  },
  editInput: {
    fontSize: theme.typography.body,
    borderWidth: 0,
    padding: 0,
    margin: 0,
  },
  levelRow: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    marginTop: theme.spacing[1],
  },
  levelBtn: {
    paddingHorizontal: theme.spacing[3.5],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radii.chip,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  levelBtnText: {
    fontSize: theme.typography.secondary,
    fontWeight: theme.typography.medium,
  },
  saveBtn: {
    marginTop: theme.spacing[2],
  },
});
