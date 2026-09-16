// AppLockOverlay — privacy overlay when app is backgrounded.
// Face ID / Touch ID is the only way to unlock.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/theme';
import { authenticateWithBiometrics } from '@/lib/biometrics';

export function AppLockOverlay({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background') {
        setIsLocked(true);
      }
    });
    return () => sub.remove();
  }, []);

  const handleUnlock = useCallback(async () => {
    try {
      const success = await authenticateWithBiometrics();
      if (success) {
        setIsLocked(false);
      }
    } catch {
      // Stay locked — try again
    }
  }, []);

  return (
    <View style={styles.container}>
      {children}
      {isLocked && (
        <View style={[styles.overlay, { backgroundColor: t.colors.canvas }]}>
          <Text style={[styles.lockText, { color: t.colors.inkSecondary }]}>Clover</Text>
          <TouchableOpacity
            style={[styles.unlockBtn, { backgroundColor: t.colors.fill }]}
            onPress={handleUnlock}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Unlock with Face ID"
          >
            <Text style={[styles.unlockBtnText, { color: t.colors.fillInk }]}>
              Unlock with Face ID
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  unlockBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  unlockBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
