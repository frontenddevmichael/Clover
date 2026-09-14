// Offline write queue — persists pending mutations to AsyncStorage so they
// survive app kills. On reconnection, replays them in FIFO order.
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'clover_offline_queue';
const MAX_RETRIES = 3;

export type QueueEntry = {
  id: string;
  collection: string;
  operation: 'insert' | 'patch' | 'delete';
  data: Record<string, any>;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed';
};

let _queue: QueueEntry[] = [];
let _listeners: Array<(queue: QueueEntry[]) => void> = [];

// Load queue from storage on startup
export async function loadQueue(): Promise<QueueEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    _queue = raw ? JSON.parse(raw) : [];
  } catch {
    _queue = [];
  }
  notifyListeners();
  return _queue;
}

// Save queue to storage
async function saveQueue(): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(_queue));
  } catch {}
  notifyListeners();
}

// Add a pending write to the queue
export async function enqueue(entry: Omit<QueueEntry, 'id' | 'timestamp' | 'retries' | 'status'>): Promise<QueueEntry> {
  const item: QueueEntry = {
    ...entry,
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    retries: 0,
    status: 'pending',
  };
  _queue.push(item);
  await saveQueue();
  return item;
}

// Mark an entry as syncing
export async function markSyncing(id: string): Promise<void> {
  const entry = _queue.find((e) => e.id === id);
  if (entry) {
    entry.status = 'syncing';
    await saveQueue();
  }
}

// Mark an entry as synced (remove from queue)
export async function markSynced(id: string): Promise<void> {
  _queue = _queue.filter((e) => e.id !== id);
  await saveQueue();
}

// Mark an entry as failed (increment retries)
export async function markFailed(id: string): Promise<void> {
  const entry = _queue.find((e) => e.id === id);
  if (entry) {
    entry.retries += 1;
    entry.status = entry.retries >= MAX_RETRIES ? 'failed' : 'pending';
    await saveQueue();
  }
}

// Get all pending entries
export function getPending(): QueueEntry[] {
  return _queue.filter((e) => e.status === 'pending');
}

// Get all entries (for UI display)
export function getAll(): QueueEntry[] {
  return [..._queue];
}

// Get failed entries
export function getFailed(): QueueEntry[] {
  return _queue.filter((e) => e.status === 'failed');
}

// Retry a failed entry
export async function retryEntry(id: string): Promise<void> {
  const entry = _queue.find((e) => e.id === id);
  if (entry) {
    entry.status = 'pending';
    entry.retries = 0;
    await saveQueue();
  }
}

// Clear all entries
export async function clearQueue(): Promise<void> {
  _queue = [];
  await saveQueue();
}

// Subscribe to queue changes
export function onQueueChange(listener: (queue: QueueEntry[]) => void): () => void {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}

function notifyListeners(): void {
  _listeners.forEach((l) => l([..._queue]));
}
