/**
 * ==============================================================================
 * CIMORY MDS DASHBOARD - INDEXEDDB HIGH PERFORMANCE LOCAL STORAGE ENGINE
 * ==============================================================================
 * Provides persistent, zero-latency caching (> 100MB capacity) for visits,
 * absensi, and master toko to eliminate reloading when switching apps / tabs.
 */

const DashboardDB = (function () {
  const DB_NAME = 'Cimory_Dashboard_DB';
  const DB_VERSION = 3;
  const STORE_CACHE = 'dashboard_cache';
  const memoryCache = new Map();

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve) => {
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
          resolve(event.target.result);
        };

        request.onerror = (event) => {
          console.warn('[DashboardDB] IndexedDB open error, fallback aktif:', event.target.error);
          resolve(null);
        };

        request.onblocked = () => {
          console.warn('[DashboardDB] IndexedDB blocked, fallback aktif.');
          resolve(null);
        };
      } catch (err) {
        console.warn('[DashboardDB] Exception opening IndexedDB:', err);
        resolve(null);
      }
    });

    return dbPromise;
  }

  return {
    /**
     * Save arbitrary data object into Multi-Layer Storage
     */
    async set(key, value, ttlMs = 24 * 60 * 60 * 1000) {
      // 1. Memory Cache (< 0.1ms)
      let cleanValue = value;
      try {
        if (value !== undefined && value !== null) {
          cleanValue = JSON.parse(JSON.stringify(value));
        }
      } catch (err) {
        cleanValue = value;
      }
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
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(true);
        });
      } catch (e) {
        return true;
      }
    },

    /**
     * Save multiple key-value pairs atomically in ONE transaction (< 15ms)
     */
    async setMany(entries = {}, ttlMs = 24 * 60 * 60 * 1000) {
      // 1. Immediate Memory Layer (< 0.5ms)
      const cleanEntries = {};
      for (const [key, rawVal] of Object.entries(entries)) {
        if (rawVal === undefined) continue;
        let cleanVal = rawVal;
        try {
          if (rawVal !== null) cleanVal = JSON.parse(JSON.stringify(rawVal));
        } catch (err) {
          cleanVal = rawVal;
        }
        cleanEntries[key] = cleanVal;
        memoryCache.set(key, { value: cleanVal, expireAt: Date.now() + ttlMs });

        // Backup essential state to localStorage
        try {
          if (key === 'app_state' || key === 'master_user' || key === 'archive_list') {
            localStorage.setItem('idb_bak_' + key, JSON.stringify(cleanVal));
          } else if (key === 'visits_data' && Array.isArray(cleanVal)) {
            // Simpan ringkasan kunjungan di localStorage agar refresh < 1ms
            const compact = cleanVal.slice(0, 3000).map(v => ({
              idVisit: v.idVisit, koordinat: v.koordinat, time: v.time, date: v.date,
              hariKe: v.hariKe, hari: v.hari, week: v.week, kodeCrew: v.kodeCrew,
              namaCrew: v.namaCrew, jabatan: v.jabatan, account: v.account,
              kodeToko: v.kodeToko, namaToko: v.namaToko, tipeToko: v.tipeToko,
              modul: v.modul, prefix: v.prefix, fotoSelfie: v.fotoSelfie
            }));
            localStorage.setItem('idb_bak_visits_data', JSON.stringify(compact));
          } else if (key === 'absensi_data' && Array.isArray(cleanVal)) {
            localStorage.setItem('idb_bak_absensi_data', JSON.stringify(cleanVal.slice(0, 2000)));
          }
        } catch (e) {}
      }

      // 2. IndexedDB Transaction
      try {
        const db = await openDB();
        if (!db) return true;

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

          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(true);
        });
      } catch (e) {
        return true;
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
      } catch (e) {}

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
