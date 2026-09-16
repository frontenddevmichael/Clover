// Root layout — Convex + Auth → onboarding or tabs
// Disable Reanimated strict mode warnings (false positives in useAnimatedStyle)
if (typeof globalThis !== 'undefined' && (globalThis as any).process?.env) {
  (globalThis as any).process.env.REANIMATED_STRICT_MODE = '0';
}

import { Stack, useRouter, useSegments } from 'expo-router';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, LogBox, ActivityIndicator, View } from 'react-native';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { ThemeProvider, useTheme } from '@/lib/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { SyncProvider } from '@/lib/SyncProvider';
import { SyncToast } from '@/components/SyncToast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppLockOverlay } from '@/components/AppLockOverlay';
import { ToastProvider } from '@/components/Toast';
import { requestPermissions } from '@/lib/notifications';
import { initSentry } from '@/lib/sentry';
import { useWidgetSync } from '@/lib/useWidgetSync';

initSentry();

LogBox.ignoreLogs(['ConvexClient']);

// Hold the native splash until React has mounted the first frame (no-op on
// web). Onboarding's animated logo is the one brand moment; the native
// splash hands straight off to it.
void SplashScreen.preventAutoHideAsync().catch(() => {});

const convexUrl = (globalThis as any).process?.env?.EXPO_PUBLIC_CONVEX_URL ?? '';
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

function DynamicStatusBar() {
  const t = useTheme();
  return <StatusBar style={t.isDark ? 'light' : 'dark'} />;
}

function RootNavigator() {
  const { userId, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const t = useTheme();

  // Sync schedule data to home screen widget
  useWidgetSync();

  useEffect(() => {
    if (isLoading) return;

    // Auth boundary guard — only manages the onboarding edge. Modal/detail
    // routes (session/create, semester) are reachable when signed in and
    // must NOT be bounced back to tabs (they aren't tab destinations).
    const inOnboarding = segments[0] === 'onboarding';

    if (!userId && !inOnboarding) {
      // Not logged in — go to onboarding
      router.replace('/onboarding');
    } else if (userId && inOnboarding) {
      // Logged in but still on onboarding — go to tabs
      router.replace('/(tabs)');
    }
  }, [userId, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.canvas }}>
        <ActivityIndicator size="large" color={t.colors.ink} />
      </View>
    );
  }

  return (
    <Stack
      initialRouteName="onboarding"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: t.colors.canvas },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
      requestPermissions().catch(() => {});
    }
  }, [fontsLoaded]);

  const content = (
    <ThemeProvider>
      <GestureHandlerRootView style={styles.root}>
        <ErrorBoundary>
          <DynamicStatusBar />
          <ToastProvider>
            <AppLockOverlay>
              <AuthProvider>
                <SyncProvider>
                  <SyncToast />
                  <RootNavigator />
                </SyncProvider>
              </AuthProvider>
            </AppLockOverlay>
          </ToastProvider>
        </ErrorBoundary>
      </GestureHandlerRootView>
    </ThemeProvider>
  );

  if (convex) {
    return (
      <ConvexProvider client={convex}>
        {content}
      </ConvexProvider>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
