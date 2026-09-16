// Settings screen — all data from Convex, no hardcoded content
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTheme, useStyles, type Theme, useThemeState } from '@/lib/theme';
import { Card } from '@/components/Card';
import { CloverMark } from '@/components/CloverLogo';
import { Button } from '@/components/Button';
import { IconCalendar } from '@/components/Illustrations';
import { useAuth } from '@/lib/auth';
import { ThickFrame, BoldDivider, CornerStamp, GeoDots } from '@/components/neoBrutalist';
import { Walkthrough } from '@/components/Walkthrough';
import { useToast } from '@/components/Toast';
import { isBiometricAvailable, isBiometricEnrolled, isBiometricEnabled, setBiometricEnabled, getBiometricTypeLabel } from '@/lib/biometrics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requestCalendarAccess, isCalendarGranted } from '@/lib/calendar';
import * as SecureStore from 'expo-secure-store';

export default function SettingsScreen() {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { appearance, setAppearance } = useThemeState();
  const { userId, logout, changePasscode } = useAuth();
  const user = useQuery(api.users.getById, userId ? { userId } : 'skip');
  const notifPrefs = useQuery(api.notifications.getPreferences, userId ? { userId } : 'skip');
  const deleteAccount = useMutation(api.users.deleteAccount);
  const saveNotifPrefs = useMutation(api.notifications.savePreferences);

  // ── Change passcode (requires the current passcode) ──
  const [showPasscodeForm, setShowPasscodeForm] = useState(false);
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPc, setConfirmPc] = useState('');
  const [savingPasscode, setSavingPasscode] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric');
  const [calendarSync, setCalendarSync] = useState(false);
  const toast = useToast();

  // Check biometric availability
  useEffect(() => {
    (async () => {
      const available = await isBiometricAvailable();
      const enrolled = await isBiometricEnrolled();
      if (available && enrolled) {
        const label = await getBiometricTypeLabel();
        const enabled = await isBiometricEnabled();
        setBiometricLabel(label);
        setBiometricAvailable(true);
        setBiometricEnabledState(enabled);
      }
    })();
  }, []);

  const toggleBiometric = async (value: boolean) => {
    await setBiometricEnabled(value);
    setBiometricEnabledState(value);
    toast.success(value ? `${biometricLabel} enabled` : `${biometricLabel} disabled`);
  };

  // ── Calendar sync ──
  useEffect(() => {
    SecureStore.getItemAsync('clover_calendar_sync').then((v) => {
      setCalendarSync(v === 'true');
    });
  }, []);

  const toggleCalendarSync = async (value: boolean) => {
    if (value) {
      const granted = await requestCalendarAccess();
      if (!granted) {
        toast.success('Calendar permission denied');
        return;
      }
    }
    setCalendarSync(value);
    await SecureStore.setItemAsync('clover_calendar_sync', value ? 'true' : 'false');
    toast.success(value ? 'Calendar sync enabled' : 'Calendar sync disabled');
  };

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
      toast.success('Passcode updated');
      setCurrentPasscode('');
      setNewPasscode('');
      setConfirmPc('');
      setShowPasscodeForm(false);
    } catch {
      Alert.alert('Could not update', 'Please try again.');
      setCurrentPasscode('');
    }
    setSavingPasscode(false);
  };

  // ── Notification preferences ──
  const handleNotifPrefChange = async (key: string, value: boolean | number | string) => {
    if (!userId) return;
    const current = notifPrefs ?? {};
    try {
      await saveNotifPrefs({
        userId,
        sessionReminders: key === 'sessionReminders' ? value : (current as any).sessionReminders ?? true,
        deadlineReminders: key === 'deadlineReminders' ? value : (current as any).deadlineReminders ?? true,
        sessionLeadMinutes: key === 'sessionLeadMinutes' ? value : (current as any).sessionLeadMinutes ?? 15,
        deadlineLeadHours: key === 'deadlineLeadHours' ? value : (current as any).deadlineLeadHours ?? 24,
        quietHoursStart: (current as any).quietHoursStart ?? '22:00',
        quietHoursEnd: (current as any).quietHoursEnd ?? '07:00',
      });
    } catch {
      Alert.alert('Error', 'Failed to update notification settings.');
    }
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

        {/* Appearance */}
        <Text style={styles.sectionTitle}>Appearance</Text>
        <Card style={styles.card}>
          <View style={styles.appearanceRow}>
            {(['system', 'light', 'dark'] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.appearanceBtn,
                  appearance === opt && { backgroundColor: t.colors.fill },
                ]}
                onPress={() => setAppearance(opt)}
                activeOpacity={0.7}
                accessibilityRole="radio"
                accessibilityState={{ checked: appearance === opt }}
                accessibilityLabel={opt === 'system' ? 'Follow system' : opt === 'light' ? 'Light mode' : 'Dark mode'}
              >
                <Text
                  style={[
                    styles.appearanceBtnText,
                    { color: appearance === opt ? t.colors.fillInk : t.colors.inkSecondary },
                  ]}
                >
                  {opt === 'system' ? 'System' : opt === 'light' ? 'Light' : 'Dark'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Session reminders</Text>
            <Switch
              value={notifPrefs?.sessionReminders ?? true}
              onValueChange={(val) => handleNotifPrefChange('sessionReminders', val)}
              trackColor={{ false: t.colors.neutral200, true: t.colors.neutral500 }}
              thumbColor={t.colors.white}
              accessibilityLabel="Session reminders"
            />
          </View>
        </Card>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Deadline reminders</Text>
            <Switch
              value={notifPrefs?.deadlineReminders ?? true}
              onValueChange={(val) => handleNotifPrefChange('deadlineReminders', val)}
              trackColor={{ false: t.colors.neutral200, true: t.colors.neutral500 }}
              thumbColor={t.colors.white}
              accessibilityLabel="Deadline reminders"
            />
          </View>
        </Card>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Session lead time</Text>
            <Text style={styles.value}>{notifPrefs?.sessionLeadMinutes ?? 15} min</Text>
          </View>
        </Card>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Deadline lead time</Text>
            <Text style={styles.value}>{notifPrefs?.deadlineLeadHours ?? 24}h</Text>
          </View>
        </Card>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Quiet hours start</Text>
            <Text style={styles.value}>{notifPrefs?.quietHoursStart ?? '22:00'}</Text>
          </View>
        </Card>

        {/* Calendar */}
        <Text style={styles.sectionTitle}>Calendar</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Sync to device calendar</Text>
              <Text style={[styles.value, { marginTop: 2 }]}>New sessions appear in your calendar</Text>
            </View>
            <Switch
              value={calendarSync}
              onValueChange={toggleCalendarSync}
              trackColor={{ false: t.colors.neutral200, true: t.colors.fill }}
              thumbColor={calendarSync ? t.colors.fillInk : t.colors.neutral500}
              accessibilityLabel="Sync sessions to device calendar"
            />
          </View>
        </Card>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Quiet hours end</Text>
            <Text style={styles.value}>{notifPrefs?.quietHoursEnd ?? '07:00'}</Text>
          </View>
        </Card>

        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity onPress={() => setShowTutorial(true)} accessibilityRole="button" accessibilityLabel="View tutorial">
          <Card style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>View tutorial</Text>
              <Text style={styles.navArrow}>→</Text>
            </View>
          </Card>
        </TouchableOpacity>
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
              style={{ marginTop: t.spacing[3] }}
            />
          </Card>
        )}

        {biometricAvailable && (
          <Card style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Use {biometricLabel}</Text>
              <Switch
                value={biometricEnabled}
                onValueChange={toggleBiometric}
                trackColor={{ false: t.colors.neutral200, true: t.colors.fill }}
                thumbColor={biometricEnabled ? t.colors.fillInk : t.colors.neutral500}
                accessibilityLabel={`Toggle ${biometricLabel} login`}
              />
            </View>
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

      {/* Tutorial modal */}
      <Modal visible={showTutorial} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowTutorial(false)}>
        <Walkthrough onComplete={() => setShowTutorial(false)} />
      </Modal>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[12],
    paddingBottom: theme.spacing[3],
  },
  headerLeft: {
    width: 60,
  },
  headerRight: {
    width: 60,
  },
  backBtn: {
    paddingVertical: theme.spacing[1],
  },
  backBtnText: {
    fontSize: theme.typography.secondary,
    color: theme.colors.inkSecondary,
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
    textAlign: 'left',
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
  appearanceRow: { flexDirection: 'row', gap: theme.spacing[2] },
  appearanceBtn: {
    flex: 1,
    paddingVertical: theme.spacing[3],
    alignItems: 'center',
    borderRadius: theme.radii.chip,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  appearanceBtnText: { fontSize: theme.typography.secondary, fontWeight: theme.typography.medium },
  footer: { alignItems: 'center', marginTop: theme.spacing[8], gap: theme.spacing[1.5] },
  footerText: { fontSize: theme.typography.caption, color: theme.colors.inkSecondary },
});
