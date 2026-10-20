/**
 * Lightweight native IndexedDB utility for offline POS storage.
 * Provides high-capacity (>100MB) asynchronous storage for catalogs, shifts, and queues,
 * eliminating the 5MB synchronous localStorage bottleneck.
 * 
 * Falls back safely to in-memory storage if IndexedDB is unavailable or restricted.
 */

const DB_NAME = 'murzak_pos_offline';
const DB_VERSION = 1;
export const STORE_NAME = 'pos_kv_store';

const memoryStore = new Map();

const isIdbSupported = () => {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
};

let dbPromise = null;

export const openDb = () => {
  if (!isIdbSupported()) {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          resolve(null);
        };
        req.onblocked = () => {
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
};

export const idbGet = async (key) => {
  const db = await openDb();
  if (!db) {
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result !== undefined ? req.result : (memoryStore.get(key) ?? null));
      req.onerror = () => resolve(memoryStore.get(key) ?? null);
    } catch {
      resolve(memoryStore.get(key) ?? null);
    }
  });
};

export const idbSet = async (key, value) => {
  memoryStore.set(key, value);
  const db = await openDb();
  if (!db) return true;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
};

export const idbDelete = async (key) => {
  memoryStore.delete(key);
  const db = await openDb();
  if (!db) return true;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
};

export const idbClear = async () => {
  memoryStore.clear();
  const db = await openDb();
  if (!db) return true;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
};

/** Reset internal cache and connection (for testing) */
export const _resetIdbForTest = () => {
  memoryStore.clear();
  dbPromise = null;
};
