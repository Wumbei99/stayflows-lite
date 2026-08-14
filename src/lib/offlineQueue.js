import { supabase } from './supabase';

const QUEUE_KEY = 'offline_mutation_queue';
let isProcessing = false;

// ─── Helpers to read/write the queue from localStorage ──────────────────────
// We use localStorage (not IndexedDB) because it's synchronous and there are
// no async race conditions between reads and writes.

function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('[OfflineQueue] Failed to write queue to localStorage:', e);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Adds a mutation to the offline queue.
 */
export function enqueueMutation(table, action, payload, match = null) {
  const mutation = {
    id: crypto.randomUUID(),
    table,
    action,
    payload,
    match,
    timestamp: new Date().toISOString(),
  };
  const queue = readQueue();
  queue.push(mutation);
  writeQueue(queue);
  console.log(`[OfflineQueue] Queued: ${action} on ${table}. Total pending: ${queue.length}`);
  // Dispatch a custom event so any subscriber (e.g. the badge in DashboardLayout)
  // can instantly react without polling.
  window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { length: queue.length } }));
}

/**
 * Returns the current number of items in the queue.
 */
export function getQueueLength() {
  return readQueue().length;
}

/**
 * Processes the queue. Syncs each mutation to Supabase in order.
 * Only removes an item from the queue after it is confirmed successful.
 */
export async function processOfflineQueue() {
  if (isProcessing) {
    console.log('[OfflineQueue] Already processing, skipping duplicate call.');
    return;
  }

  const queue = readQueue();
  if (queue.length === 0) {
    console.log('[OfflineQueue] Queue is empty, nothing to sync.');
    return;
  }

  isProcessing = true;
  console.log(`[OfflineQueue] Starting sync of ${queue.length} pending actions...`);

  for (const mutation of queue) {
    try {
      let result;

      if (mutation.action === 'INSERT') {
        result = await supabase.from(mutation.table).insert(mutation.payload);
      } else if (mutation.action === 'UPDATE') {
        let q = supabase.from(mutation.table).update(mutation.payload);
        if (mutation.match) {
          for (const [key, val] of Object.entries(mutation.match)) {
            q = q.eq(key, val);
          }
        }
        result = await q;
      } else if (mutation.action === 'DELETE') {
        let q = supabase.from(mutation.table).delete();
        if (mutation.match) {
          for (const [key, val] of Object.entries(mutation.match)) {
            q = q.eq(key, val);
          }
        }
        result = await q;
      }

      if (result?.error) {
        throw new Error(result.error.message);
      }

      // SUCCESS: remove this specific item from the queue immediately
      const currentQueue = readQueue();
      const updatedQueue = currentQueue.filter(m => m.id !== mutation.id);
      writeQueue(updatedQueue);
      window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { length: updatedQueue.length } }));
      console.log(`[OfflineQueue] ✅ Synced: ${mutation.action} on ${mutation.table}. Remaining: ${updatedQueue.length}`);

    } catch (error) {
      console.error(`[OfflineQueue] ❌ Failed to sync ${mutation.action} on ${mutation.table}:`, error.message);
      // Leave the item in the queue. It will be retried on the next reconnect.
    }
  }

  isProcessing = false;
  const remaining = getQueueLength();
  if (remaining === 0) {
    console.log('[OfflineQueue] 🎉 All actions synced successfully.');
  } else {
    console.warn(`[OfflineQueue] ${remaining} action(s) could not be synced and remain in the queue.`);
  }
}
