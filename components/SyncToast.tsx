// SyncToast — small toast near top-right showing offline/sync status.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSync } from '@/lib/SyncProvider';
import { useTheme } from '@/lib/theme';

export function SyncToast() {
  const { isOnline, pendingCount, failedCount, isSyncing, retryFailed } = useSync();
  const insets = useSafeAreaInsets();
  const t = useTheme();

  if (isOnline && pendingCount === 0 && failedCount === 0) return null;

  return (
    <View style={[styles.toast, { top: insets.top + 8 }]}>
      {!isOnline ? (
        <View style={[styles.chip, { backgroundColor: t.colors.workloadOverloadedBg }]}>
          <View style={[styles.dot, { backgroundColor: t.colors.workloadOverloaded }]} />
          <Text style={[styles.text, { color: t.colors.fillInk }]}>Offline</Text>
        </View>
      ) : isSyncing ? (
        <View style={[styles.chip, { backgroundColor: t.colors.subtleFill }]}>
          <View style={[styles.dot, { backgroundColor: t.colors.inkSecondary }]} />
          <Text style={[styles.text, { color: t.colors.inkSecondary }]}>Syncing...</Text>
        </View>
      ) : pendingCount > 0 ? (
        <View style={[styles.chip, { backgroundColor: t.colors.subtleFill }]}>
          <Text style={[styles.text, { color: t.colors.inkSecondary }]}>
            {pendingCount} pending
          </Text>
          {failedCount > 0 && (
            <TouchableOpacity onPress={retryFailed} style={[styles.retryBtn, { backgroundColor: t.colors.subtleFill }]}>
              <Text style={[styles.retryText, { color: t.colors.fillInk }]}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    right: 16,
    zIndex: 100,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  retryBtn: {
    marginLeft: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
