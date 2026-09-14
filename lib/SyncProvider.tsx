// SyncProvider — manages offline queue replay on reconnection.
// Wraps the app and provides sync status to all screens.
import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { useNetworkStatus } from '@/lib/useNetworkStatus';
import {
  loadQueue,
  getPending,
  getFailed,
  getAll,
  markSyncing,
  markSynced,
  markFailed,
  onQueueChange,
  type QueueEntry,
} from '@/lib/offlineQueue';

type SyncContextType = {
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  isSyncing: boolean;
  queue: QueueEntry[];
  retryFailed: () => void;
};

const SyncContext = createContext<SyncContextType>({
  isOnline: true,
  pendingCount: 0,
  failedCount: 0,
  isSyncing: false,
  queue: [],
  retryFailed: () => {},
});

export function useSync() {
  return useContext(SyncContext);
}

// Placeholder for the actual Convex mutation caller.
// In production, this would call the appropriate Convex mutation based on
// the queue entry's collection and operation.
async function replayEntry(entry: QueueEntry): Promise<boolean> {
  // TODO: Map entry.collection + entry.operation to the correct Convex mutation
  // For now, we log the replay attempt and mark as synced (mock success)
  console.log('[Sync] Replaying:', entry.collection, entry.operation, entry.data);
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 200));
  return true;
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncRef = useRef(false);

  const isOnline = isConnected && isInternetReachable !== false;

  // Load queue on mount
  useEffect(() => {
    loadQueue();
  }, []);

  // Subscribe to queue changes
  useEffect(() => {
    return onQueueChange(setQueue);
  }, []);

  // Replay on reconnection
  useEffect(() => {
    if (!isOnline || syncRef.current) return;

    const pending = getPending();
    if (pending.length === 0) return;

    syncRef.current = true;
    setIsSyncing(true);

    (async () => {
      for (const entry of pending) {
        await markSyncing(entry.id);
        try {
          const success = await replayEntry(entry);
          if (success) {
            await markSynced(entry.id);
          } else {
            await markFailed(entry.id);
          }
        } catch {
          await markFailed(entry.id);
        }
      }
      setIsSyncing(false);
      syncRef.current = false;
    })();
  }, [isOnline]);

  const retryFailed = useCallback(() => {
    const failed = getFailed();
    failed.forEach((e) => {
      import('@/lib/offlineQueue').then((mod) => mod.retryEntry(e.id));
    });
  }, []);

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        pendingCount: queue.filter((e) => e.status === 'pending').length,
        failedCount: queue.filter((e) => e.status === 'failed').length,
        isSyncing,
        queue,
        retryFailed,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}
