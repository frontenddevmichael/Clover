// SyncProvider — manages offline queue replay on reconnection.
// Wraps the app and provides sync status to all screens.
import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { ConvexHttpClient } from 'convex/browser';
import { useNetworkStatus } from '@/lib/useNetworkStatus';
import { api } from '../convex/_generated/api';
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

const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL;
const convex = CONVEX_URL ? new ConvexHttpClient(CONVEX_URL) : null;

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

// Map queue entry to the correct Convex mutation and call it
async function replayEntry(entry: QueueEntry): Promise<boolean> {
  const { collection, operation, data } = entry;

  if (!convex) return false;

  try {
    if (collection === 'courses') {
      if (operation === 'insert') {
        await convex.mutation(api.courses.create, data as any);
      } else if (operation === 'patch' && entry.documentId) {
        await convex.mutation(api.courses.update, { id: entry.documentId, ...data } as any);
      } else if (operation === 'delete' && entry.documentId) {
        await convex.mutation(api.courses.remove, { id: entry.documentId } as any);
      }
    } else if (collection === 'sessions') {
      if (operation === 'insert') {
        if (data.isRecurring) {
          await convex.mutation(api.sessions.createRecurring, data as any);
        } else {
          await convex.mutation(api.sessions.createOneOff, data as any);
        }
      } else if (operation === 'patch' && entry.documentId) {
        await convex.mutation(api.sessions.update, { id: entry.documentId, ...data } as any);
      } else if (operation === 'delete' && entry.documentId) {
        await convex.mutation(api.sessions.remove, { id: entry.documentId } as any);
      }
    } else if (collection === 'deadlines') {
      if (operation === 'insert') {
        await convex.mutation(api.deadlines.create, data as any);
      } else if (operation === 'patch' && entry.documentId) {
        await convex.mutation(api.deadlines.update, { id: entry.documentId, ...data } as any);
      } else if (operation === 'delete' && entry.documentId) {
        await convex.mutation(api.deadlines.remove, { id: entry.documentId } as any);
      }
    } else {
      // Unknown collection — skip
      return false;
    }
    return true;
  } catch {
    return false;
  }
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
