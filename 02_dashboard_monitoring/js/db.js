/**
 * ==============================================================================
 * CIMORY MDS DASHBOARD - INDEXEDDB HIGH PERFORMANCE LOCAL STORAGE ENGINE
 * ==============================================================================
 * Provides persistent, zero-latency caching (> 100MB capacity) for visits,
 * absensi, and master toko to eliminate reloading when switching apps / tabs.
 */

const DashboardDB = (function () {
  const DB_NAME = 'Cimory_Dashboard_DB';
  const DB_VERSION = 4;
  const STORE_CACHE = 'dashboard_cache';
  const memoryCache = new Map();

  let dbInstance = null;

  function openDB() {
    if (dbInstance) return Promise.resolve(dbInstance);

    return new Promise((resolve) => {
      if (!window.indexedDB) {
        console.warn('[DashboardDB] IndexedDB tidak didukung browser ini. Menggunakan memory + localStorage.');
        resolve(null);
        return;
      }

      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_CACHE)) {
            db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
          }
        };

        request.onsuccess = (event) => {
          dbInstance = event.target.result;
          dbInstance.onversionchange = () => {
            dbInstance.close();
            dbInstance = null;
          };
          resolve(dbInstance);
        };

        request.onerror = (event) => {
          console.warn('[DashboardDB] IndexedDB open error, fallback aktif:', event.target.error);
          resolve(null);
        };

        request.onblocked = () => {
          console.warn('[DashboardDB] IndexedDB blocked.');
          resolve(null);
        };
      } catch (err) {
        console.warn('[DashboardDB] Exception opening IndexedDB:', err);
        resolve(null);
      }
    });
  }

  return {
    /**
     * Helper to safely unwrap Alpine.js Proxy and ensure Structured Clone compatibility
     */
    cleanForStorage(data) {
      if (data === null || data === undefined) return data;
      try {
        // Recursively clean plain JSON data
        return JSON.parse(JSON.stringify(data, (key, value) => {
          if (value && typeof value === 'object') {
            if (window.Alpine && typeof window.Alpine.raw === 'function') {
              try { value = window.Alpine.raw(value); } catch(e) {}
            }
          }
          return value;
        }));
      } catch (e) {
        if (Array.isArray(data)) {
          return data.map(row => {
            const copy = {};
            if (row && typeof row === 'object') {
              for (const k of Object.keys(row)) {
                copy[k] = row[k];
              }
            }
            return copy;
          });
        }
        return { ...data };
      }
    },

    /**
     * Save arbitrary data object into Multi-Layer Storage
     */
    async set(key, value, ttlMs = 24 * 60 * 60 * 1000) {
      const cleanValue = this.cleanForStorage(value);
      memoryCache.set(key, { value: cleanValue, expireAt: Date.now() + ttlMs });

      // 2. LocalStorage backup for small/medium payloads
      try {
        if (key === 'app_state' || key === 'master_user' || key === 'archive_list') {
          localStorage.setItem('idb_bak_' + key, JSON.stringify(cleanValue));
        }
      } catch (e) {}

      // 3. IndexedDB (>100MB capacity)
      try {
        const db = await openDB();
        if (!db) return true;

        return new Promise((resolve) => {
          const tx = db.transaction(STORE_CACHE, 'readwrite');
          const store = tx.objectStore(STORE_CACHE);
          const record = {
            key: key,
            value: cleanValue,
            timestamp: Date.now(),
            expireAt: Date.now() + ttlMs
          };
          store.put(record);
          tx.oncomplete = () => {
            console.log(`%c[DashboardDB.set] ✅ Key '${key}' tersimpan (${Array.isArray(cleanValue) ? cleanValue.length + ' baris' : 'objek'})`, 'color:#34d399;');
            resolve(true);
          };
          tx.onerror = (err) => {
            console.error(`[DashboardDB.set Error] Gagal simpan '${key}':`, tx.error || err);
            resolve(false);
          };
        });
      } catch (e) {
        console.error(`[DashboardDB.set Exception] Key '${key}':`, e);
        return false;
      }
    },

    /**
     * Save multiple key-value pairs atomically in ONE transaction (< 15ms)
     */
    async setMany(entries = {}, ttlMs = 24 * 60 * 60 * 1000) {
      // 1. Immediate Memory Layer & Clean Storage Unwrap
      const cleanEntries = {};
      for (const [key, rawVal] of Object.entries(entries)) {
        if (rawVal === undefined) continue;
        const cleanVal = this.cleanForStorage(rawVal);
        cleanEntries[key] = cleanVal;
        memoryCache.set(key, { value: cleanVal, expireAt: Date.now() + ttlMs });

        // Backup essential lightweight state to localStorage
        try {
          if (key === 'app_state' || key === 'master_user' || key === 'archive_list') {
            localStorage.setItem('idb_bak_' + key, JSON.stringify(cleanVal));
          }
        } catch (e) {}
      }

      // 2. IndexedDB Transaction
      try {
        const db = await openDB();
        if (!db) {
          console.warn('[DashboardDB.setMany] Database instance null');
          return false;
        }

        return new Promise((resolve) => {
          const tx = db.transaction(STORE_CACHE, 'readwrite');
          const store = tx.objectStore(STORE_CACHE);

          for (const [key, val] of Object.entries(cleanEntries)) {
            store.put({
              key: key,
              value: val,
              timestamp: Date.now(),
              expireAt: Date.now() + ttlMs
            });
          }

          tx.oncomplete = () => {
            console.log(`%c[DashboardDB.setMany] ✅ BERHASIL MENYIMPAN ${Object.keys(cleanEntries).join(', ')} KE INDEXEDDB`, 'background:#059669;color:white;font-weight:bold;padding:2px 8px;border-radius:4px;');
            resolve(true);
          };
          tx.onerror = (event) => {
            console.error('[DashboardDB.setMany Error]:', tx.error || event);
            resolve(false);
          };
        });
      } catch (e) {
        console.error('[DashboardDB.setMany Exception]:', e);
        return false;
      }
    },

    /**
     * Get data from Multi-Layer Storage
     */
    async get(key, ignoreExpiry = false) {
      // 1. Check Memory Cache First (< 0.1ms)
      const mem = memoryCache.get(key);
      if (mem) {
        if (ignoreExpiry || !mem.expireAt || Date.now() <= mem.expireAt) {
          return mem.value;
        }
      }

      // 2. Check IndexedDB (< 10ms)
      try {
        const db = await openDB();
        if (db) {
          const idbVal = await new Promise((resolve) => {
            const tx = db.transaction(STORE_CACHE, 'readonly');
            const store = tx.objectStore(STORE_CACHE);
            const request = store.get(key);

            request.onsuccess = () => {
              const record = request.result;
              if (!record) return resolve(null);
              if (!ignoreExpiry && record.expireAt && Date.now() > record.expireAt) {
                return resolve(null);
              }
              resolve(record.value);
            };

            request.onerror = () => resolve(null);
          });

          if (idbVal !== null && idbVal !== undefined) {
            memoryCache.set(key, { value: idbVal, expireAt: Date.now() + 24 * 60 * 60 * 1000 });
            return idbVal;
          }
        }
      } catch (e) {
        console.warn(`[DashboardDB.get Exception] '${key}':`, e);
      }

      // 3. Check LocalStorage Fallback (< 1ms)
      try {
        const bak = localStorage.getItem('idb_bak_' + key);
        if (bak) {
          const parsed = JSON.parse(bak);
          memoryCache.set(key, { value: parsed, expireAt: Date.now() + 24 * 60 * 60 * 1000 });
          return parsed;
        }
      } catch (e) {}

      return null;
    },

    /**
     * Delete key from Storage
     */
    async delete(key) {
      memoryCache.delete(key);
      try { localStorage.removeItem('idb_bak_' + key); } catch (e) {}
      try {
        const db = await openDB();
        if (!db) return true;
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
      memoryCache.clear();
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith('idb_bak_')) localStorage.removeItem(k);
        }
      } catch (e) {}
      try {
        const db = await openDB();
        if (!db) return true;
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

// Explicit global export for cross-module reliability
window.DashboardDB = DashboardDB;
