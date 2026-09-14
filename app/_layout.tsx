// Root layout — Convex + Auth → onboarding or tabs
import { Stack, useRouter, useSegments } from 'expo-router';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, LogBox, ActivityIndicator, View } from 'react-native';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from '@/lib/theme';
import { AuthProvider, useAuth } from '@/lib/auth';

LogBox.ignoreLogs(['ConvexClient']);

// Hold the native splash until React has mounted the first frame (no-op on
// web). Onboarding's animated logo is the one brand moment; the native
// splash hands straight off to it.
void SplashScreen.preventAutoHideAsync().catch(() => {});

const convexUrl = (globalThis as any).process?.env?.EXPO_PUBLIC_CONVEX_URL ?? '';
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

function RootNavigator() {
  const { userId, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const t = useTheme();

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
  useEffect(() => {
    // First frame is mounting — release the native splash. Onboarding's
    // animated mark is already underneath, so the handoff is seamless.
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const content = (
    <ThemeProvider>
      <GestureHandlerRootView style={styles.root}>
        <StatusBar style="dark" />
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
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
