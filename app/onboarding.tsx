// Onboarding — splash → welcome → signup → profile → passcode → walkthrough → tabs
// Proper error handling, passcode confirmation. Passcode changes happen in
// Settings (they require the current passcode), not here.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Rect, Circle, Line } from 'react-native-svg';
import { CloverLogo } from '@/components/CloverLogo';
import { useAuth } from '@/lib/auth';
import { useTheme, useStyles, type Theme } from '@/lib/theme';
import { ThickFrame, CornerStamp, BoldDivider, GeoDots } from '@/components/neoBrutalist';
import { Walkthrough, hasSeenWalkthrough } from '@/components/Walkthrough';
import { isValidEmail } from '@/lib/validators';

const { width } = Dimensions.get('window');
const SPRING_SNAPPY = { damping: 20, stiffness: 200, mass: 0.8 };
const FADE_OUT = 180;
const FADE_IN = 250;

type Step =
  | 'splash'
  | 'welcome'
  | 'login'
  | 'signup'
  | 'profile'
  | 'passcode'
  | 'confirmPasscode'
  | 'walkthrough';

// ─── Staggered fade-in item ─────────────────────────────
function StaggerItem({
  children,
  index,
  visible,
}: {
  children: React.ReactNode;
  index: number;
  visible: boolean;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
      translateY.value = withSpring(0, SPRING_SNAPPY);
    } else {
      opacity.value = 0;
      translateY.value = 20;
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[style, { opacity: opacity.value }]}>
      {children}
    </Animated.View>
  );
}

// ─── Friendly error messages ────────────────────────────
function friendlyError(msg: string): string {
  if (msg.includes('already exists')) return 'An account with this email already exists. Try signing in instead.';
  if (msg.includes('No account found')) return 'No account found with this email. Check your email or create a new account.';
  if (msg.includes('Incorrect passcode')) return 'Incorrect passcode. Try again.';
  if (msg.includes('Current passcode')) return 'Your current passcode was incorrect.';
  if (msg.includes('network') || msg.includes('fetch')) return 'Connection error. Check your internet and try again.';
  if (msg.includes('timeout')) return 'Request timed out. Check your connection and try again.';
  if (msg.includes('Passcode must be')) return 'Passcode must be at least 4 digits.';
  return 'Something went wrong. Please try again.';
}

export default function OnboardingScreen() {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const { signup, login, userId } = useAuth();

  const [step, setStep] = useState<Step>('splash');
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [department, setDepartment] = useState('');
  const [level, setLevel] = useState('300');
  const [loading, setLoading] = useState(false);

  const screenOpacity = useSharedValue(1);
  const screenScale = useSharedValue(1);
  const isTransitioning = useRef(false);
  const isSigningUp = useRef(false);

  const splashOpacity = useSharedValue(0);
  const splashScale = useSharedValue(0.8);

  useEffect(() => {
    splashOpacity.value = withTiming(1, { duration: 600 });
    splashScale.value = withSpring(1, SPRING_SNAPPY);
    const timer = setTimeout(() => transitionTo('welcome'), 2600);
    return () => clearTimeout(timer);
  }, []);

  // If already signed in, check walkthrough then go to tabs
  useEffect(() => {
    if (userId && !isSigningUp.current) {
      hasSeenWalkthrough().then((seen) => {
        if (seen) router.replace('/(tabs)');
        // If not seen, stay on onboarding (user will reach walkthrough after signup)
      });
    }
  }, [userId]);

  const transitionTo = useCallback((next: Step) => {
    if (isTransitioning.current) return;
    isTransitioning.current = true;
    screenOpacity.value = withTiming(0, { duration: FADE_OUT, easing: Easing.in(Easing.cubic) });
    screenScale.value = withTiming(0.97, { duration: FADE_OUT, easing: Easing.in(Easing.cubic) });
    setTimeout(() => {
      setStep(next);
      screenOpacity.value = withTiming(1, { duration: FADE_IN, easing: Easing.out(Easing.cubic) });
      screenScale.value = withSpring(1, SPRING_SNAPPY);
      isTransitioning.current = false;
    }, FADE_OUT + 30);
  }, []);

  const animWrap = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ scale: screenScale.value }],
  }));

  const splashAnim = useAnimatedStyle(() => ({
    opacity: splashOpacity.value,
    transform: [{ scale: splashScale.value }],
  }));

  // ─── Reset form for fresh attempts ─────────────────────
  const resetForm = useCallback(() => {
    setPasscode('');
    setConfirmPasscode('');
  }, []);

  // ─── AUTH HANDLERS ─────────────────────────────────────

  const handleLogin = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert('Email required', 'Please enter your email address.');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (!passcode.trim()) {
      Alert.alert('Passcode required', 'Please enter your passcode.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), passcode);
    } catch (e: any) {
      const msg = friendlyError(e.message || '');
      Alert.alert('Sign in failed', msg);
      resetForm();
    }
    setLoading(false);
  }, [email, passcode, login, resetForm]);

  const handleSignup = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Email required', 'Please enter your email address.');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    isSigningUp.current = true;
    try {
      await signup({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        institution: institution.trim(),
        department: department.trim(),
        level: parseInt(level, 10),
        passcode,
      });
      // Skip transitionTo (isTransitioning guard may block it) — go straight to walkthrough
      screenOpacity.value = withTiming(0, { duration: FADE_OUT, easing: Easing.in(Easing.cubic) });
      screenScale.value = withTiming(0.97, { duration: FADE_OUT, easing: Easing.in(Easing.cubic) });
      setTimeout(() => {
        setStep('walkthrough');
        screenOpacity.value = withTiming(1, { duration: FADE_IN, easing: Easing.out(Easing.cubic) });
        screenScale.value = withSpring(1, SPRING_SNAPPY);
        isSigningUp.current = false;
      }, FADE_OUT + 30);
    } catch (e: any) {
      const msg = friendlyError(e.message || '');
      Alert.alert('Account creation failed', msg);
      resetForm();
      isSigningUp.current = false;
    }
    setLoading(false);
  }, [email, name, institution, department, level, passcode, signup, resetForm]);

  // ─── SPLASH ────────────────────────────────────────────
  if (step === 'splash') {
    return (
      <View style={styles.splash}>
        {/* Background decor */}
        <View style={styles.splashDecorTop}>
          <GeoDots rows={3} cols={20} dotSize={3} gap={8} color={t.colors.neutral350} />
        </View>
        <View style={styles.splashDecorBottom}>
          <GeoDots rows={2} cols={16} dotSize={2} gap={10} color={t.colors.neutral200} />
        </View>

        <Animated.View style={[styles.splashContent, splashAnim]}>
          <CornerStamp label="CLOVER" color={t.colors.ink} textColor={t.colors.fillInk} rotation={-8} style={styles.splashStamp} />
          <CloverLogo size={220} animated />
          <Text style={styles.splashTitle}>Clover</Text>
          <BoldDivider shape="diamond" color={t.colors.ink} style={{ marginTop: 16, marginBottom: 8 }} />
          <Text style={styles.splashSubtitle}>Study planner for Nigerian students</Text>
        </Animated.View>
      </View>
    );
  }

  // ─── WELCOME ───────────────────────────────────────────
  if (step === 'welcome') {
    return (
      <Animated.View style={[styles.container, animWrap]}>
        <View style={styles.welcomeDecor}>
          <GeoDots rows={4} cols={24} dotSize={3} gap={8} color={t.colors.neutral200} />
        </View>
        <View style={styles.top}>
          <StaggerItem index={0} visible={step === 'welcome'}>
            <View style={styles.logoWrap}><CloverLogo size={100} animated={false} /></View>
          </StaggerItem>
          <StaggerItem index={1} visible={step === 'welcome'}>
            <CornerStamp label="HEY!" color={t.colors.fill} textColor={t.colors.fillInk} rotation={-6} style={styles.welcomeStamp} />
            <Text style={styles.welcomeTitle}>Welcome to Clover</Text>
          </StaggerItem>
          <StaggerItem index={2} visible={step === 'welcome'}>
            <Text style={styles.welcomeSubtitle}>Plan your semester, track deadlines, and study smarter.</Text>
          </StaggerItem>
        </View>
        <View style={styles.bottom}>
          <StaggerItem index={3} visible={step === 'welcome'}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => transitionTo('signup')} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Create account">
              <Text style={styles.primaryBtnText}>Create account</Text>
            </TouchableOpacity>
          </StaggerItem>
          <StaggerItem index={4} visible={step === 'welcome'}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => transitionTo('login')} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="I already have an account">
              <Text style={styles.secondaryBtnText}>I already have an account</Text>
            </TouchableOpacity>
          </StaggerItem>
        </View>
      </Animated.View>
    );
  }

  // ─── LOGIN ─────────────────────────────────────────────
  if (step === 'login') {
    return (
      <Animated.View style={[styles.container, animWrap]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => transitionTo('welcome')} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <CornerStamp label="SIGN IN" color={t.colors.ink} textColor={t.colors.fillInk} style={styles.formStamp} />
            <Text style={styles.formTitle}>Welcome back</Text>
            <BoldDivider shape="circle" color={t.colors.ink} style={{ marginBottom: 20 }} />
            <Text style={styles.formSubtitle}>Sign in with your email and passcode</Text>

            <ThickFrame borderWidth={2} style={styles.formFrame}>
              <View style={styles.formInner}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@unilag.edu.ng"
                  placeholderTextColor={t.colors.neutral300}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  accessibilityLabel="Email address"
                />

                <Text style={styles.label}>Passcode</Text>
                <TextInput
                  style={styles.input}
                  value={passcode}
                  onChangeText={setPasscode}
                  placeholder="4+ digits"
                  placeholderTextColor={t.colors.neutral300}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={8}
                  accessibilityLabel="Passcode"
                />
              </View>
            </ThickFrame>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.disabledBtn]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              {loading ? <ActivityIndicator color={t.colors.fillInk} /> : <Text style={styles.primaryBtnText}>Sign in</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    );
  }

  // ─── SIGNUP: name + email ──────────────────────────────
  if (step === 'signup') {
    return (
      <Animated.View style={[styles.container, animWrap]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => transitionTo('welcome')} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <CornerStamp label="CREATE" color={t.colors.fill} textColor={t.colors.fillInk} style={styles.formStamp} />
            <Text style={styles.formTitle}>Create your account</Text>
            <BoldDivider shape="square" color={t.colors.ink} style={{ marginBottom: 20 }} />
            <Text style={styles.formSubtitle}>Start planning your semester</Text>

            <ThickFrame borderWidth={2} style={styles.formFrame}>
              <View style={styles.formInner}>
                <Text style={styles.label}>Full name</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Adaobi Nwosu" placeholderTextColor={t.colors.neutral300} accessibilityLabel="Full name" />

                <Text style={styles.label}>Email</Text>
                <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@unilag.edu.ng" placeholderTextColor={t.colors.neutral300} keyboardType="email-address" autoCapitalize="none" accessibilityLabel="Email address" />
              </View>
            </ThickFrame>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                if (!name.trim()) { Alert.alert('Name required', 'Please enter your full name.'); return; }
                if (!email.trim()) { Alert.alert('Email required', 'Please enter your email address.'); return; }
                if (!isValidEmail(email)) { Alert.alert('Invalid email', 'Please enter a valid email address.'); return; }
                transitionTo('profile');
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Continue"
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    );
  }

  // ─── PROFILE ───────────────────────────────────────────
  if (step === 'profile') {
    return (
      <Animated.View style={[styles.container, animWrap]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => transitionTo('signup')} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <CornerStamp label="YOU" color={t.colors.workloadBalancedBg} textColor={t.colors.fillInk} style={styles.formStamp} />
            <Text style={styles.formTitle}>Your university</Text>
            <BoldDivider shape="diamond" color={t.colors.ink} style={{ marginBottom: 20 }} />
            <Text style={styles.formSubtitle}>Help us tailor your experience</Text>

            <ThickFrame borderWidth={2} style={styles.formFrame}>
              <View style={styles.formInner}>
                <Text style={styles.label}>Institution</Text>
                <TextInput style={styles.input} value={institution} onChangeText={setInstitution} placeholder="e.g. University of Lagos" placeholderTextColor={t.colors.neutral300} autoCapitalize="words" accessibilityLabel="Institution" />

                <Text style={styles.label}>Department</Text>
                <TextInput style={styles.input} value={department} onChangeText={setDepartment} placeholder="e.g. Computer Science" placeholderTextColor={t.colors.neutral300} autoCapitalize="words" accessibilityLabel="Department" />

                <Text style={styles.label}>Level</Text>
                <View style={styles.levelRow}>
                  {['100', '200', '300', '400', '500'].map((l) => (
                    <TouchableOpacity key={l} style={[styles.levelBtn, level === l && styles.levelBtnActive]} onPress={() => setLevel(l)} accessibilityRole="button" accessibilityLabel={`Level ${l}`} accessibilityState={{ selected: level === l }}>
                      <Text style={[styles.levelText, level === l && styles.levelTextActive]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ThickFrame>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                if (!institution.trim()) { Alert.alert('Institution required', 'Enter your university name.'); return; }
                if (!department.trim()) { Alert.alert('Department required', 'Enter your department.'); return; }
                transitionTo('passcode');
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Continue"
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    );
  }

  // ─── PASSCODE CREATION ─────────────────────────────────
  if (step === 'passcode') {
    return (
      <Animated.View style={[styles.container, animWrap]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => transitionTo('profile')} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <CornerStamp label="SECURE" color={t.colors.workloadOverloadedBg} textColor={t.colors.fillInk} style={styles.formStamp} />
            <Text style={styles.formTitle}>Set a passcode</Text>
            <BoldDivider shape="circle" color={t.colors.ink} style={{ marginBottom: 20 }} />
            <Text style={styles.formSubtitle}>At least 4 digits to secure your account</Text>

            <ThickFrame borderWidth={2} style={styles.formFrame}>
              <View style={styles.formInner}>
                <Text style={styles.label}>Passcode</Text>
                <TextInput style={styles.input} value={passcode} onChangeText={setPasscode} placeholder="4+ digits" placeholderTextColor={t.colors.neutral300} keyboardType="number-pad" secureTextEntry maxLength={8} accessibilityLabel="Passcode" />
              </View>
            </ThickFrame>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                if (!passcode.trim()) { Alert.alert('Passcode required', 'Enter a passcode.'); return; }
                if (passcode.length < 4) { Alert.alert('Too short', 'Passcode must be at least 4 digits.'); return; }
                transitionTo('confirmPasscode');
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Continue"
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    );
  }

  // ─── CONFIRM PASSCODE ──────────────────────────────────
  if (step === 'confirmPasscode') {
    return (
      <Animated.View style={[styles.container, animWrap]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => { resetForm(); transitionTo('passcode'); }} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <CornerStamp label="CONFIRM" color={t.colors.fill} textColor={t.colors.fillInk} style={styles.formStamp} />
            <Text style={styles.formTitle}>Confirm passcode</Text>
            <BoldDivider shape="diamond" color={t.colors.ink} style={{ marginBottom: 20 }} />
            <Text style={styles.formSubtitle}>Enter your passcode again</Text>

            <ThickFrame borderWidth={2} style={styles.formFrame}>
              <View style={styles.formInner}>
                <Text style={styles.label}>Passcode</Text>
                <TextInput style={styles.input} value={confirmPasscode} onChangeText={setConfirmPasscode} placeholder="4+ digits" placeholderTextColor={t.colors.neutral300} keyboardType="number-pad" secureTextEntry maxLength={8} accessibilityLabel="Confirm passcode" />
              </View>
            </ThickFrame>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.disabledBtn]}
              onPress={() => {
                if (confirmPasscode !== passcode) {
                  Alert.alert('Passcodes don\'t match', 'Make sure both passcodes are the same.');
                  setConfirmPasscode('');
                  return;
                }
                handleSignup();
              }}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Create account"
            >
              {loading ? <ActivityIndicator color={t.colors.fillInk} /> : <Text style={styles.primaryBtnText}>Create account</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    );
  }

  // ─── WALKTHROUGH ───────────────────────────────────────
  if (step === 'walkthrough') {
    return (
      <Walkthrough onComplete={() => router.replace('/(tabs)')} />
    );
  }

  // Fallback — should never reach here
  return null;
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.canvas },
  splashContent: { alignItems: 'center' },
  splashDecorTop: { position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center', opacity: 0.5 },
  splashDecorBottom: { position: 'absolute', bottom: 80, left: 0, right: 0, alignItems: 'center', opacity: 0.4 },
  splashStamp: { position: 'absolute', top: -40, right: -20, zIndex: 10 },
  splashTitle: { fontSize: theme.typography.display, fontWeight: theme.typography.bold, color: theme.colors.ink, marginTop: theme.spacing[5], letterSpacing: -1 },
  splashSubtitle: { fontSize: theme.typography.body, color: theme.colors.inkSecondary, marginTop: theme.spacing[2] },
  container: { flex: 1, backgroundColor: theme.colors.canvas },
  top: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing[8] },
  logoWrap: { alignItems: 'center', marginBottom: theme.spacing[2] },
  bottom: { paddingHorizontal: theme.spacing[6], paddingBottom: theme.spacing[12], gap: theme.spacing[3] },
  welcomeDecor: { position: 'absolute', top: 40, left: 0, right: 0, alignItems: 'center', opacity: 0.3 },
  welcomeStamp: { position: 'absolute', top: -30, right: -10, zIndex: 10 },
  welcomeTitle: { fontSize: theme.typography.display, fontWeight: theme.typography.bold, color: theme.colors.ink, textAlign: 'center', marginTop: theme.spacing[5] },
  welcomeSubtitle: { fontSize: theme.typography.body, color: theme.colors.inkSecondary, textAlign: 'center', marginTop: theme.spacing[2.5], lineHeight: theme.spacing[6], paddingHorizontal: theme.spacing[4] },
  formScroll: { padding: theme.spacing[6], flexGrow: 1, justifyContent: 'center' },
  formStamp: { position: 'absolute', top: -8, right: 0, zIndex: 10 },
  formFrame: { borderRadius: 4, marginTop: theme.spacing[4] },
  formInner: { padding: theme.spacing[5] },
  backBtn: { marginBottom: theme.spacing[6] },
  backText: { fontSize: theme.typography.secondary, color: theme.colors.inkSecondary, fontWeight: '500' },
  formTitle: { fontSize: theme.typography.display, fontWeight: '700', color: theme.colors.ink },
  formSubtitle: { fontSize: theme.typography.secondary, color: theme.colors.inkSecondary, marginTop: 4, marginBottom: theme.spacing[7] },
  label: { fontSize: theme.typography.caption, fontWeight: '600', color: theme.colors.neutral600, marginBottom: theme.spacing[2], marginTop: theme.spacing[4] },
  input: {
    backgroundColor: theme.colors.tier1,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    borderRadius: theme.radii.chip,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3.5],
    fontSize: theme.typography.body,
    color: theme.colors.ink,
  },
  primaryBtn: {
    backgroundColor: theme.colors.fill,
    borderRadius: theme.radii.cardInner,
    paddingVertical: theme.spacing[4],
    alignItems: 'center',
    marginTop: theme.spacing[6],
  },
  primaryBtnText: { color: theme.colors.fillInk, fontSize: theme.typography.body, fontWeight: theme.typography.semibold },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    borderRadius: theme.radii.cardInner,
    paddingVertical: theme.spacing[4],
    alignItems: 'center',
  },
  secondaryBtnText: { color: theme.colors.ink, fontSize: theme.typography.body, fontWeight: theme.typography.medium },
  disabledBtn: { opacity: 0.5 },
  levelRow: { flexDirection: 'row', gap: theme.spacing[2] },
  levelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    borderRadius: theme.spacing[2.5],
    paddingVertical: theme.spacing[3],
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBtnActive: { backgroundColor: theme.colors.fill, borderColor: theme.colors.ink },
  levelText: { fontSize: theme.typography.secondary, fontWeight: '500', color: theme.colors.neutral600 },
  levelTextActive: { color: theme.colors.fillInk },
});
