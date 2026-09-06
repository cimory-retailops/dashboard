/**
 * ==============================================================================
 * CIMORY MDS DASHBOARD - INDEXEDDB HIGH PERFORMANCE LOCAL STORAGE ENGINE
 * ==============================================================================
 * Provides persistent, zero-latency caching (> 100MB capacity) for visits,
 * absensi, and master toko to eliminate reloading when switching apps / tabs.
 */

const DashboardDB = (function () {
  const DB_NAME = 'Cimory_Dashboard_DB';
  const DB_VERSION = 1;
  const STORE_CACHE = 'dashboard_cache';

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('Browser tidak mendukung IndexedDB. Fallback ke memory cache.');
        resolve(null);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_CACHE)) {
          db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event.target.error);
        resolve(null);
      };
    });

    return dbPromise;
  }

  return {
    /**
     * Save arbitrary data object into IndexedDB
     */
    async set(key, value, ttlMs = 24 * 60 * 60 * 1000) {
      try {
        const db = await openDB();
        if (!db) return false;

        return new Promise((resolve) => {
          const tx = db.transaction(STORE_CACHE, 'readwrite');
          const store = tx.objectStore(STORE_CACHE);
          const record = {
            key: key,
            value: value,
            timestamp: Date.now(),
            expireAt: Date.now() + ttlMs
          };
          store.put(record);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        console.warn('DashboardDB.set error:', e);
        return false;
      }
    },

    /**
     * Get data from IndexedDB
     */
    async get(key, ignoreExpiry = false) {
      try {
        const db = await openDB();
        if (!db) return null;

        return new Promise((resolve) => {
          const tx = db.transaction(STORE_CACHE, 'readonly');
          const store = tx.objectStore(STORE_CACHE);
          const request = store.get(key);

          request.onsuccess = () => {
            const record = request.result;
            if (!record) {
              resolve(null);
              return;
            }
            if (!ignoreExpiry && record.expireAt && Date.now() > record.expireAt) {
              resolve(null);
              return;
            }
            resolve(record.value);
          };

          request.onerror = () => resolve(null);
        });
      } catch (e) {
        console.warn('DashboardDB.get error:', e);
        return null;
      }
    },

    /**
     * Delete key from IndexedDB
     */
    async delete(key) {
      try {
        const db = await openDB();
        if (!db) return false;

        return new Promise((resolve) => {
          const tx = db.transaction(STORE_CACHE, 'readwrite');
          const store = tx.objectStore(STORE_CACHE);
          store.delete(key);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        return false;
      }
    },

    /**
     * Clear all cached items
     */
    async clear() {
      try {
        const db = await openDB();
        if (!db) return false;

        return new Promise((resolve) => {
          const tx = db.transaction(STORE_CACHE, 'readwrite');
          const store = tx.objectStore(STORE_CACHE);
          store.clear();
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        return false;
      }
    }
  };
})();
