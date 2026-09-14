// Settings screen — all data from Convex, no hardcoded content
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTheme, useStyles, type Theme } from '@/lib/theme';
import { Card } from '@/components/Card';
import { CloverMark } from '@/components/CloverLogo';
import { Button } from '@/components/Button';
import { IconCalendar } from '@/components/Illustrations';
import { useAuth } from '@/lib/auth';

export default function SettingsScreen() {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const { userId, logout, changePasscode } = useAuth();
  const user = useQuery(api.users.getById, userId ? { userId } : 'skip');
  const notifPrefs = useQuery(api.notifications.getPreferences, userId ? { userId } : 'skip');
  const deleteAccount = useMutation(api.users.deleteAccount);
  const updateProfile = useMutation(api.users.updateProfile);

  // ── Profile editing (FR2, FR3) ──
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [department, setDepartment] = useState('');
  const [level, setLevel] = useState('300');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setInstitution(user.institution ?? '');
    setDepartment(user.department ?? '');
    setLevel(user.level ? String(user.level) : '300');
  }, [user?.name, user?.institution, user?.department, user?.level]);

  const profileDirty = useMemo(() => {
    if (!user) return false;
    return (
      name !== (user.name ?? '') ||
      institution !== (user.institution ?? '') ||
      department !== (user.department ?? '') ||
      level !== (user.level ? String(user.level) : '300')
    );
  }, [user, name, institution, department, level]);

  const handleSaveProfile = async () => {
    if (!userId) return;
    if (!name.trim() || !institution.trim()) {
      Alert.alert('Missing fields', 'Name and institution are required.');
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({
        id: userId,
        name: name.trim(),
        institution: institution.trim(),
        department: department.trim(),
        level: parseInt(level, 10) || 100,
      });
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save your profile.');
    }
    setSavingProfile(false);
  };

  // ── Change passcode (requires the current passcode) ──
  const [showPasscodeForm, setShowPasscodeForm] = useState(false);
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPc, setConfirmPc] = useState('');
  const [savingPasscode, setSavingPasscode] = useState(false);

  const handleChangePasscode = async () => {
    if (!currentPasscode || !newPasscode) {
      Alert.alert('Missing fields', 'Fill in your current and new passcode.');
      return;
    }
    if (newPasscode.length < 4) {
      Alert.alert('Too short', 'New passcode must be at least 4 digits.');
      return;
    }
    if (newPasscode !== confirmPc) {
      Alert.alert("Passcodes don't match", 'Make sure both new passcodes are the same.');
      setConfirmPc('');
      return;
    }
    setSavingPasscode(true);
    try {
      await changePasscode(currentPasscode, newPasscode);
      Alert.alert('Passcode updated', 'Your passcode has been changed.');
      setCurrentPasscode('');
      setNewPasscode('');
      setConfirmPc('');
      setShowPasscodeForm(false);
    } catch (e: any) {
      Alert.alert('Could not update', e.message || 'Please try again.');
      setCurrentPasscode('');
    }
    setSavingPasscode(false);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (user?._id) {
                await deleteAccount({ id: user._id });
              }
              await logout();
              Alert.alert('Account deleted', 'Your data has been removed.');
            } catch (e) {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name ?? 'Your name'}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
            <View style={styles.profileMeta}>
              <Text style={styles.profileBadge}>{user?.institution || 'University'}</Text>
              <Text style={styles.profileDot}>·</Text>
              <Text style={styles.profileBadge}>{user?.level ? `${user.level} Level` : 'Level'}</Text>
            </View>
          </View>
        </View>

        {/* Profile section — editable (FR2, FR3) */}
        <Text style={styles.sectionTitle}>Profile</Text>
        <Card style={styles.card}>
          <View style={styles.editRow}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.editInput}
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
            <Text style={styles.label}>Institution</Text>
            <TextInput
              style={styles.editInput}
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
            <Text style={styles.label}>Department</Text>
            <TextInput
              style={styles.editInput}
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
            <Text style={styles.label}>Level</Text>
            <View style={styles.levelRow}>
              {['100', '200', '300', '400', '500'].map((l) => (
                <TouchableOpacity
                  key={l}
                  onPress={() => setLevel(l)}
                  style={[styles.levelBtn, level === l && styles.levelBtnActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: level === l }}
                >
                  <Text
                    style={[
                      styles.levelBtnText,
                      level === l && styles.levelBtnTextActive,
                    ]}
                  >
                    {l}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>
        {profileDirty && (
          <Button
            label={savingProfile ? 'Saving...' : 'Save changes'}
            onPress={handleSaveProfile}
            loading={savingProfile}
            style={styles.saveButton}
          />
        )}

        {/* Navigation */}
        <Text style={styles.sectionTitle}>Planning</Text>
        <TouchableOpacity onPress={() => router.push('/semester')} accessibilityRole="button" accessibilityLabel="Semester settings">
          <Card style={styles.navCard}>
            <View style={styles.row}>
              <View style={styles.navLeft}>
                <IconCalendar size={20} color={t.colors.neutral900} />
                <Text style={styles.label}>Semester settings</Text>
              </View>
              <Text style={styles.navArrow}>→</Text>
            </View>
          </Card>
        </TouchableOpacity>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Session reminders</Text>
            <Text style={styles.value}>{notifPrefs?.sessionLeadMinutes ?? 15} min before</Text>
          </View>
        </Card>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Deadline reminders</Text>
            <Text style={styles.value}>{notifPrefs?.deadlineLeadHours ?? 24}h before</Text>
          </View>
        </Card>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Quiet hours</Text>
            <Text style={styles.value}>{notifPrefs?.quietHoursStart ?? '10 PM'} – {notifPrefs?.quietHoursEnd ?? '7 AM'}</Text>
          </View>
        </Card>

        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity onPress={() => logout()} accessibilityRole="button" accessibilityLabel="Sign out">
          <Card style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Sign out</Text>
              <Text style={styles.navArrow}>→</Text>
            </View>
          </Card>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowPasscodeForm(!showPasscodeForm)} accessibilityRole="button" accessibilityLabel="Change passcode">
          <Card style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Change passcode</Text>
              <Text style={styles.navArrow}>{showPasscodeForm ? '↓' : '→'}</Text>
            </View>
          </Card>
        </TouchableOpacity>
        {showPasscodeForm && (
          <Card style={styles.passcodeForm}>
            <Text style={styles.passcodeLabel}>Current passcode</Text>
            <TextInput
              style={styles.passcodeInput}
              value={currentPasscode}
              onChangeText={setCurrentPasscode}
              placeholder="4+ digits"
              placeholderTextColor={t.colors.neutral300}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
              accessibilityLabel="Current passcode"
            />
            <Text style={styles.passcodeLabel}>New passcode</Text>
            <TextInput
              style={styles.passcodeInput}
              value={newPasscode}
              onChangeText={setNewPasscode}
              placeholder="4+ digits"
              placeholderTextColor={t.colors.neutral300}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
              accessibilityLabel="New passcode"
            />
            <Text style={styles.passcodeLabel}>Confirm new passcode</Text>
            <TextInput
              style={styles.passcodeInput}
              value={confirmPc}
              onChangeText={setConfirmPc}
              placeholder="4+ digits"
              placeholderTextColor={t.colors.neutral300}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
              accessibilityLabel="Confirm new passcode"
            />
            <Button
              label={savingPasscode ? 'Updating...' : 'Update passcode'}
              onPress={handleChangePasscode}
              loading={savingPasscode}
              style={styles.saveButton}
            />
          </Card>
        )}
        <TouchableOpacity onPress={handleDeleteAccount} accessibilityRole="button" accessibilityLabel="Delete account">
          <Card style={styles.card}>
            <View style={styles.row}>
              <Text style={[styles.label, { color: t.colors.workloadOverloaded }]}>Delete account</Text>
            </View>
          </Card>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <CloverMark size={20} />
          <Text style={styles.footerText}>Clover v1.0.0</Text>
        </View>
      </ScrollView>
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
  title: { fontSize: theme.typography.display, fontWeight: theme.typography.bold, color: theme.colors.ink },
  content: { padding: theme.spacing[5], paddingBottom: 120 },
  // Profile card
  profileCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.elevated,
    borderRadius: theme.radii.card, borderWidth: 1, borderColor: theme.colors.hairline,
    padding: theme.spacing[5], marginBottom: theme.spacing[2], gap: theme.spacing[4],
  },
  avatar: {
    width: 56, height: 56, borderRadius: theme.radii.pill, backgroundColor: theme.colors.fill,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: theme.typography.body, fontWeight: theme.typography.bold, color: theme.colors.fillInk },
  profileInfo: { flex: 1 },
  profileName: { fontSize: theme.typography.body, fontWeight: theme.typography.semibold, color: theme.colors.ink },
  profileEmail: { fontSize: theme.typography.caption, color: theme.colors.inkSecondary, marginTop: theme.spacing[0.5] },
  profileMeta: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[1.5], marginTop: theme.spacing[1.5] },
  profileBadge: {
    fontSize: theme.typography.caption, fontWeight: theme.typography.medium, color: theme.colors.inkSecondary,
    backgroundColor: theme.colors.subtleFill, paddingHorizontal: theme.spacing[2], paddingVertical: theme.spacing[0.5], borderRadius: theme.radii.pill,
  },
  profileDot: { fontSize: theme.typography.caption, color: theme.colors.inkSecondary },
  sectionTitle: {
    fontSize: theme.typography.caption, fontWeight: theme.typography.semibold, color: theme.colors.inkSecondary,
    textTransform: 'uppercase', letterSpacing: 0.04, marginBottom: theme.spacing[2], marginTop: theme.spacing[5],
  },
  card: { marginBottom: theme.spacing[1] },
  navCard: { marginBottom: theme.spacing[1] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  // Editable profile rows
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing[3] },
  editInput: {
    flex: 1,
    fontSize: theme.typography.secondary,
    color: theme.colors.ink,
    textAlign: 'right',
    paddingVertical: theme.spacing[1],
  },
  levelRow: { flexDirection: 'row', gap: theme.spacing[1.5] },
  levelBtn: {
    paddingHorizontal: theme.spacing[2.5],
    paddingVertical: theme.spacing[1.5],
    borderRadius: theme.radii.chip,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBtnActive: { backgroundColor: theme.colors.fill, borderColor: theme.colors.neutral950 },
  levelBtnText: { fontSize: theme.typography.caption, fontWeight: theme.typography.medium, color: theme.colors.inkSecondary },
  levelBtnTextActive: { color: theme.colors.fillInk },
  saveButton: { marginTop: theme.spacing[2], marginBottom: theme.spacing[3] },
  // Change passcode form
  passcodeForm: { marginBottom: theme.spacing[3] },
  passcodeLabel: {
    fontSize: theme.typography.caption,
    fontWeight: theme.typography.medium,
    color: theme.colors.inkSecondary,
    marginTop: theme.spacing[2],
    marginBottom: theme.spacing[1],
  },
  passcodeInput: {
    backgroundColor: theme.colors.canvas,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    borderRadius: theme.radii.chip,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    fontSize: theme.typography.body,
    color: theme.colors.ink,
    minHeight: 44,
  },
  label: { fontSize: theme.typography.body, fontWeight: theme.typography.medium, color: theme.colors.ink },
  value: { fontSize: theme.typography.secondary, color: theme.colors.inkSecondary },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2.5] },
  navArrow: { fontSize: theme.typography.body, color: theme.colors.inkSecondary },
  footer: { alignItems: 'center', marginTop: theme.spacing[8], gap: theme.spacing[1.5] },
  footerText: { fontSize: theme.typography.caption, color: theme.colors.inkSecondary },
});
