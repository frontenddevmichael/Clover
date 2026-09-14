// SyncBanner — shows offline sync status at the top of the screen.
// Displays pending count, failed count, and retry button.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSync } from '@/lib/SyncProvider';
import { useTheme } from '@/lib/theme';

export function SyncBanner() {
  const { isOnline, pendingCount, failedCount, isSyncing, retryFailed } = useSync();
  const t = useTheme();

  if (isOnline && pendingCount === 0 && failedCount === 0) return null;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: isOnline ? t.colors.subtleFill : t.colors.workloadOverloadedBg,
        },
      ]}
    >
      {!isOnline ? (
        <Text style={[styles.text, { color: t.colors.workloadOverloaded }]}>
          Offline — changes will sync when connected
        </Text>
      ) : isSyncing ? (
        <Text style={[styles.text, { color: t.colors.inkSecondary }]}>
          Syncing {pendingCount} pending changes...
        </Text>
      ) : pendingCount > 0 ? (
        <Text style={[styles.text, { color: t.colors.inkSecondary }]}>
          {pendingCount} pending change{pendingCount !== 1 ? 's' : ''}
        </Text>
      ) : null}

      {failedCount > 0 && (
        <TouchableOpacity onPress={retryFailed} style={styles.retryBtn}>
          <Text style={[styles.retryText, { color: t.colors.fillInk }]}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
