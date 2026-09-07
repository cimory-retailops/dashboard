/**
 * ==============================================================================
 * CIMORY RETAIL OPS - INDEXEDDB STORAGE SERVICE
 * High-speed caching (>100MB) for Photos & Display Audit Reviews
 * ==============================================================================
 */

const GalleryDB = {
  DB_NAME: 'CimoryGalleryDB',
  DB_VERSION: 1,
  STORE_NAME: 'gallery_cache',
  dbPromise: null,

  async openDB() {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB tidak didukung pada browser ini.');
        return resolve(null);
      }
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => {
        console.warn('Gagal membuka IndexedDB:', event.target.error);
        resolve(null);
      };
    });
    return this.dbPromise;
  },

  async set(key, value, ttlMs = 24 * 60 * 60 * 1000) {
    try {
      const db = await this.openDB();
      if (!db) return false;
      return new Promise((resolve) => {
        const tx = db.transaction([this.STORE_NAME], 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        const item = {
          key: key,
          value: value,
          timestamp: Date.now(),
          ttl: ttlMs
        };
        const req = store.put(item);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn('IndexedDB set error:', e);
      return false;
    }
  },

  async get(key, checkTtl = true) {
    try {
      const db = await this.openDB();
      if (!db) return null;
      return new Promise((resolve) => {
        const tx = db.transaction([this.STORE_NAME], 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          const res = req.result;
          if (!res) return resolve(null);
          if (checkTtl && res.ttl) {
            const age = Date.now() - res.timestamp;
            if (age > res.ttl) return resolve(null);
          }
          resolve(res.value);
        };
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      console.warn('IndexedDB get error:', e);
      return null;
    }
  },

  async clear() {
    try {
      const db = await this.openDB();
      if (!db) return;
      const tx = db.transaction([this.STORE_NAME], 'readwrite');
      tx.objectStore(this.STORE_NAME).clear();
    } catch (e) {
      console.warn('IndexedDB clear error:', e);
    }
  }
};

window.GalleryDB = GalleryDB;
