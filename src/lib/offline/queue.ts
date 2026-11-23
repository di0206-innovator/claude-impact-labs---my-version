/**
 * Client-Side Offline Report Queue (IndexedDB)
 *
 * Buffers citizen road reports locally during monsoonal connectivity drops.
 * Automatically synchronizes with the server when network connectivity returns.
 */

export const DB_NAME = "rastabaaz_offline_db";
export const STORE_NAME = "reports_queue";
export const DB_VERSION = 1;

export type QueuedReportItem = {
  id: string;
  fields: Record<string, string>;
  queuedAt: string;
  attempts: number;
};

// In-memory fallback for environments without native IndexedDB (SSR, private browsing, test runners)
const fallbackStore = new Map<string, QueuedReportItem>();

function generateId(): string {
  return `offline_rpt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function formDataToRecord(formData: FormData): Record<string, string> {
  const record: Record<string, string> = {};
  formData.forEach((val, key) => {
    if (typeof val === "string") {
      record[key] = val;
    }
  });
  return record;
}

export function recordToFormData(record: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, val] of Object.entries(record)) {
    formData.set(key, val);
  }
  return formData;
}

export function getIndexedDb(): IDBFactory | null {
  if (typeof window !== "undefined" && window.indexedDB) {
    return window.indexedDB;
  }
  return null;
}

export function openQueueDatabase(): Promise<IDBDatabase | null> {
  const idb = getIndexedDb();
  if (!idb) return Promise.resolve(null);

  return new Promise((resolve) => {
    try {
      const request = idb.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function enqueueReport(
  payload: FormData | Record<string, string>,
): Promise<QueuedReportItem> {
  const fields = payload instanceof FormData ? formDataToRecord(payload) : payload;
  const item: QueuedReportItem = {
    id: generateId(),
    fields,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  };

  const db = await openQueueDatabase();
  if (!db) {
    fallbackStore.set(item.id, item);
    return item;
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(new Error("Failed to enqueue report to IndexedDB."));
    } catch (err) {
      fallbackStore.set(item.id, item);
      resolve(item);
    }
  });
}

export async function getQueuedReports(): Promise<QueuedReportItem[]> {
  const db = await openQueueDatabase();
  if (!db) {
    return Array.from(fallbackStore.values()).sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const items = (request.result ?? []) as QueuedReportItem[];
        resolve(items.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt)));
      };
      request.onerror = () => resolve(Array.from(fallbackStore.values()));
    } catch {
      resolve(Array.from(fallbackStore.values()));
    }
  });
}

export async function removeQueuedReport(id: string): Promise<void> {
  fallbackStore.delete(id);
  const db = await openQueueDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function clearQueue(): Promise<void> {
  fallbackStore.clear();
  const db = await openQueueDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function peekQueueCount(): Promise<number> {
  const items = await getQueuedReports();
  return items.length;
}

export async function drainOfflineQueue(
  customSubmitAction?: (formData: FormData) => Promise<{ ok: boolean; error?: string }>,
): Promise<{ drained: number; failed: number }> {
  const items = await getQueuedReports();
  if (items.length === 0) return { drained: 0, failed: 0 };

  let submitFn = customSubmitAction;
  if (!submitFn) {
    const { createReportAction } = await import("@/lib/actions");
    submitFn = (fd: FormData) => createReportAction(fd);
  }

  let drained = 0;
  let failed = 0;

  for (const item of items) {
    const formData = recordToFormData(item.fields);
    try {
      const result = await submitFn(formData);
      if (result && result.ok) {
        await removeQueuedReport(item.id);
        drained++;
      } else {
        item.attempts += 1;
        failed++;
      }
    } catch {
      item.attempts += 1;
      failed++;
    }
  }

  return { drained, failed };
}
