/**
 * ==============================================================================
 * CIMORY RETAIL OPS - ROUTE SIMULATOR INDEXEDDB ENGINE
 * High-Performance Client-Side Database for 32,000+ Master Stores
 * Enables Instant Loading (< 200ms) & Full Offline/Hosting Support
 * ==============================================================================
 */

const SimulasiDB = (function () {
  const DB_NAME = 'Cimory_RouteSim_DB';
  const DB_VERSION = 1;
  const STORE_NAME = 'stores_cache';

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve) => {
      if (!window.indexedDB) {
        console.warn('[SimulasiDB] IndexedDB is not supported in this browser. Fallback to memory cache.');
        resolve(null);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        console.error('[SimulasiDB] Open Error:', event.target.error);
        resolve(null);
      };
    });

    return dbPromise;
  }

  return {
    /**
     * Save data into IndexedDB with metadata (sync time, source, count)
     */
    async set(key, value, meta = {}) {
      try {
        const db = await openDB();
        if (!db) return false;

        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);

          const record = {
            key: key,
            data: value,
            meta: {
              timestamp: Date.now(),
              dateString: new Date().toLocaleString('id-ID'),
              itemCount: Array.isArray(value) ? value.length : 0,
              ...meta
            }
          };

          const req = store.put(record);
          req.onsuccess = () => resolve(true);
          req.onerror = (err) => {
            console.warn('[SimulasiDB] Put error:', err);
            resolve(false);
          };
        });
      } catch (err) {
        console.warn('[SimulasiDB] Set exception:', err);
        return false;
      }
    },

    /**
     * Get data from IndexedDB
     */
    async get(key) {
      try {
        const db = await openDB();
        if (!db) return null;

        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(key);

          req.onsuccess = (event) => {
            const res = event.target.result;
            if (!res) {
              resolve(null);
              return;
            }
            resolve(res);
          };

          req.onerror = () => resolve(null);
        });
      } catch (err) {
        console.warn('[SimulasiDB] Get exception:', err);
        return null;
      }
    },

    /**
     * Delete a key from IndexedDB
     */
    async delete(key) {
      try {
        const db = await openDB();
        if (!db) return false;

        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(key);
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        });
      } catch (err) {
        return false;
      }
    },

    /**
     * Clear all cached items in store
     */
    async clear() {
      try {
        const db = await openDB();
        if (!db) return false;

        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.clear();
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        });
      } catch (err) {
        return false;
      }
    }
  };
})();
