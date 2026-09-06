/**
 * ==============================================================================
 * CIMORY MDS DASHBOARD - API SERVICE (HIGH-SPEED CENTRAL FETCH & CACHE)
 * ==============================================================================
 */

const ApiService = {
  memoryCache: new Map(),

  /**
   * Helper Fetch with Timeout and Fallback (Uses JSONP for seamless Google Apps Script streaming)
   */
  async fetchWithTimeout(url, timeoutMs = CONFIG.DEFAULT_TIMEOUT_MS) {
    try {
      // JSONP is 100% CORS-free and avoids Google Apps Script 302 redirect / 404 echo errors
      return await this.fetchJsonp(url, timeoutMs);
    } catch (error) {
      // Fallback to standard fetch if JSONP script tag encounters an issue
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        return await response.json();
      } catch (err) {
        clearTimeout(timeoutId);
        throw error;
      }
    }
  },

  /**
   * JSONP Fetcher (Guaranteed to bypass CORS on all browsers)
   */
  fetchJsonp(url, timeoutMs = CONFIG.DEFAULT_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_cb_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      const delimiter = url.includes('?') ? '&' : '?';
      const scriptUrl = `${url}${delimiter}callback=${callbackName}&_t=${Date.now()}`;

      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`JSONP request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      function cleanup() {
        clearTimeout(timeoutId);
        if (script.parentNode) script.parentNode.removeChild(script);
        // Permanent no-op dummy function so late GAS responses NEVER throw ReferenceError
        window[callbackName] = function () {};
      }

      window[callbackName] = function (data) {
        cleanup();
        resolve(data);
      };

      script.onerror = function (err) {
        cleanup();
        reject(new Error('JSONP Script loading failed'));
      };

      document.head.appendChild(script);
    });
  },

  /**
   * Build API URL with Query Parameters
   */
  buildUrl(action, params = {}) {
    const query = new URLSearchParams({ action, ...params });
    return `${CONFIG.API_URL}?${query.toString()}`;
  },

  /**
   * Universal Fast CSV Parser (Handles escaped commas, quotes, line breaks)
   */
  parseCsv(text) {
    if (!text) return [];
    const lines = [];
    let row = [""];
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];
      if (c === '"') {
        if (inQuotes && next === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        row.push("");
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') i++;
        if (row.length > 1 || row[0] !== "") lines.push(row);
        row = [""];
      } else {
        row[row.length - 1] += c;
      }
    }
    if (row.length > 1 || row[0] !== "") lines.push(row);
    return lines;
  },

  /**
   * 1. Get Visits Data (Direct Parallel Fetch from 15 Branch Sheets + Central API Fallback)
   */
  async getVisits(params = {}) {
    const cacheKey = 'visits_' + JSON.stringify(params);
    const cached = this.memoryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CONFIG.CACHE_EXPIRY_MS)) {
      return cached.data;
    }

    // 1. Direct High-Speed Parallel Fetch (1.5 - 2.5s across all 15 branch sheets)
    try {
      const directVisits = await this.getVisitsDirect(params);
      if (directVisits && directVisits.length > 0) {
        this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: directVisits });
        return directVisits;
      }
    } catch (e) {
      console.warn('Direct parallel fetch visits fallback to Central API:', e);
    }

    // 2. Fallback to Central API
    try {
      const url = this.buildUrl('getVisits', params);
      const res = await this.fetchWithTimeout(url, CONFIG.DEFAULT_TIMEOUT_MS);
      if (res && res.status === 'success' && res.data && res.data.length > 0) {
        this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: res.data });
        return res.data;
      }
    } catch (err) {
      console.warn('Central API getVisits failed:', err);
    }

    return [];
  },

  /**
   * Direct Parallel Fetcher across 15 Module Spreadsheets
   */
  async getVisitsDirect(params = {}) {
    const targetModules = [];
    for (const [modKey, sheetId] of Object.entries(CONFIG.MODUL_IDS)) {
      if (!params.modul || params.modul === 'ALL') {
        targetModules.push({ modKey, sheetId });
      } else if (params.modul.length === 2 && modKey.startsWith(params.modul)) {
        targetModules.push({ modKey, sheetId });
      } else if (params.modul === modKey) {
        targetModules.push({ modKey, sheetId });
      }
    }

    const promises = targetModules.map(async ({ modKey, sheetId }) => {
      try {
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Kunjungan`;
        const res = await fetch(url);
        if (!res.ok) {
          const fallbackUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
          const fRes = await fetch(fallbackUrl);
          if (!fRes.ok) return [];
          const text = await fRes.text();
          return this.parseVisitsRows(text, modKey);
        }
        const text = await res.text();
        return this.parseVisitsRows(text, modKey);
      } catch (err) {
        console.warn(`Direct fetch failed for ${modKey}:`, err);
        return [];
      }
    });

    const results = await Promise.all(promises);
    return results.flat();
  },

  parseVisitsRows(csvText, defaultModul) {
    const rows = this.parseCsv(csvText);
    if (rows.length < 2) return [];

    const headers = rows[0].map(h => (h || '').toUpperCase().replace(/[\s_-]/g, ''));
    
    function findIdx(possibleNames, defaultIdx) {
      for (const name of possibleNames) {
        const cleanName = name.toUpperCase().replace(/[\s_-]/g, '');
        const idx = headers.indexOf(cleanName);
        if (idx !== -1) return idx;
      }
      return defaultIdx;
    }

    const idxId = findIdx(['ID_VISIT', 'IDVISIT', 'ID'], 0);
    const idxKoordinat = findIdx(['MAP', 'KOORDINAT', 'COORDINATE'], 1);
    const idxTime = findIdx(['WAKTU', 'TIME', 'JAM'], 2);
    const idxDate = findIdx(['TANGGAL', 'DATE', 'TGL'], 3);
    const idxHariKe = findIdx(['RUTE', 'HARI_KE', 'HARI KE'], 4);
    const idxHari = findIdx(['HARI', 'DAY'], 5);
    const idxWeek = findIdx(['WEEK', 'MINGGU'], 6);
    const idxKodeCrew = findIdx(['IDCREW', 'ID_CREW', 'KODE_CREW', 'KODE CREW'], 7);
    const idxNamaCrew = findIdx(['NAMA_CREW', 'NAMA CREW', 'NAMA'], 8);
    const idxJabatan = findIdx(['CREW', 'JABATAN', 'ROLE'], 9);
    const idxAccount = findIdx(['ACCOUNT', 'AKUN'], 10);
    const idxKodeToko = findIdx(['KODE_TOKO', 'KODE TOKO'], 11);
    const idxNamaToko = findIdx(['NAMA_TOKO', 'NAMA TOKO'], 12);
    const idxTipeToko = findIdx(['TIPE_TOKO', 'TIPE TOKO'], 13);
    const idxFotoSelfie = findIdx(['FOTO_SELFIE', 'FOTO SELFIE', 'FOTO SELFIE (DEPAN TOKO)'], 14);
    const idxBefore1 = findIdx(['FOTO_BEFORE_1', 'FOTO BEFORE 1', 'BEFORE 1'], 193);
    const idxBefore2 = findIdx(['FOTO_BEFORE_2', 'FOTO BEFORE 2', 'BEFORE 2'], 194);
    const idxBefore3 = findIdx(['FOTO_BEFORE_3', 'FOTO BEFORE 3', 'BEFORE 3'], 195);
    const idxBefore4 = findIdx(['FOTO_BEFORE_4', 'FOTO BEFORE 4', 'BEFORE 4'], 196);
    const idxAfter1 = findIdx(['FOTO_AFTER_1', 'FOTO AFTER 1', 'AFTER 1'], 199);
    const idxAfter2 = findIdx(['FOTO_AFTER_2', 'FOTO AFTER 2', 'AFTER 2'], 200);
    const idxAfter3 = findIdx(['FOTO_AFTER_3', 'FOTO AFTER 3', 'AFTER 3'], 201);
    const idxAfter4 = findIdx(['FOTO_AFTER_4', 'FOTO AFTER 4', 'AFTER 4'], 202);

    const visits = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const idVisit = r[idxId] || '';
      if (!idVisit) continue;

      visits.push({
        idVisit: idVisit,
        koordinat: r[idxKoordinat] || '',
        time: r[idxTime] || '',
        date: r[idxDate] || '',
        hariKe: r[idxHariKe] || '',
        hari: r[idxHari] || '',
        week: r[idxWeek] || '',
        kodeCrew: r[idxKodeCrew] || '',
        namaCrew: r[idxNamaCrew] || '',
        jabatan: r[idxJabatan] || '',
        account: r[idxAccount] || '',
        kodeToko: r[idxKodeToko] || '',
        namaToko: r[idxNamaToko] || '',
        tipeToko: r[idxTipeToko] || '',
        fotoSelfie: r[idxFotoSelfie] || '',
        fotoBefore1: r[idxBefore1] || r[15] || '',
        fotoBefore2: r[idxBefore2] || '',
        fotoBefore3: r[idxBefore3] || '',
        fotoBefore4: r[idxBefore4] || '',
        fotoAfter1: r[idxAfter1] || '',
        fotoAfter2: r[idxAfter2] || '',
        fotoAfter3: r[idxAfter3] || '',
        fotoAfter4: r[idxAfter4] || '',
        modul: defaultModul,
        prefix: defaultModul.substring(0, 2)
      });
    }
    return visits;
  },

  /**
   * 2. Get Absensi Data (Direct Parallel Fetch from 3 Absen Sheets + Central API Fallback)
   */
  async getAbsensi(params = {}) {
    const cacheKey = 'absensi_' + JSON.stringify(params);
    const cached = this.memoryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CONFIG.CACHE_EXPIRY_MS)) {
      return cached.data;
    }

    try {
      const directAbs = await this.getAbsensiDirect(params);
      if (directAbs && directAbs.length > 0) {
        this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: directAbs });
        return directAbs;
      }
    } catch (e) {
      console.warn('Direct fetch absensi fallback to Central API:', e);
    }

    // Fallback to Central API
    try {
      const url = this.buildUrl('getAbsensi', params);
      const res = await this.fetchWithTimeout(url, CONFIG.FAST_TIMEOUT_MS);
      if (res && res.status === 'success' && res.data) {
        this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: res.data });
        return res.data;
      }
    } catch (err) {
      console.warn('Central API getAbsensi failed:', err);
    }

    return [];
  },

  async getAbsensiDirect(params = {}) {
    const targetAbsen = [];
    for (const [absKey, sheetId] of Object.entries(CONFIG.ABSEN_IDS)) {
      if (!params.modul || params.modul === 'ALL' || params.modul.startsWith(absKey)) {
        targetAbsen.push({ absKey, sheetId });
      }
    }

    const promises = targetAbsen.map(async ({ absKey, sheetId }) => {
      try {
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Absensi`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const text = await res.text();
        return this.parseAbsensiRows(text, absKey);
      } catch (err) {
        console.warn(`Direct fetch absensi failed for ${absKey}:`, err);
        return [];
      }
    });

    const results = await Promise.all(promises);
    return results.flat();
  },

  parseAbsensiRows(csvText, defaultModul) {
    const rows = this.parseCsv(csvText);
    if (rows.length < 2) return [];

    const headers = rows[0].map(h => (h || '').toUpperCase().replace(/[\s_-]/g, ''));
    function findIdx(possibleNames, defaultIdx) {
      for (const name of possibleNames) {
        const cleanName = name.toUpperCase().replace(/[\s_-]/g, '');
        const idx = headers.indexOf(cleanName);
        if (idx !== -1) return idx;
      }
      return defaultIdx;
    }

    const idxId = findIdx(['IDABSEN', 'ID_ABSEN', 'ID'], 0);
    const idxKoordinat = findIdx(['MAP', 'KOORDINAT'], 1);
    const idxDate = findIdx(['TANGGAL', 'DATE', 'TGL'], 2);
    const idxTime = findIdx(['WAKTU', 'TIME', 'JAM'], 3);
    const idxKodeCrew = findIdx(['IDCREW', 'ID_CREW', 'KODE_CREW', 'KODE CREW'], 4);
    const idxNamaCrew = findIdx(['NAMA_CREW', 'NAMA CREW', 'NAMA'], 5);
    const idxJabatan = findIdx(['CREW', 'JABATAN', 'ROLE'], 6);
    const idxNamaToko = findIdx(['NAMA_TOKO', 'NAMA TOKO'], 7);
    const idxStatus = findIdx(['STATUS_ABSEN', 'STATUS ABSEN', 'STATUS'], 8);
    const idxFoto = findIdx(['FOTO_SELFIE', 'FOTO SELFIE', 'FOTO'], 9);
    const idxFotoSurat = findIdx(['FOTO_SURAT_DOKTER', 'FOTO SURAT DOKTER', 'FOTO_SURAT'], 10);
    const idxCatatan = findIdx(['CATATAN', 'NOTE'], 11);

    const abs = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const idAbsen = r[idxId] || '';
      if (!idAbsen) continue;

      abs.push({
        idAbsen: idAbsen,
        koordinat: r[idxKoordinat] || '',
        tanggal: r[idxDate] || '',
        waktu: r[idxTime] || '',
        kodeCrew: r[idxKodeCrew] || '',
        namaCrew: r[idxNamaCrew] || '',
        jabatan: r[idxJabatan] || '',
        namaToko: r[idxNamaToko] || '',
        status: r[idxStatus] || 'MASUK',
        foto: r[idxFoto] || '',
        fotoSurat: r[idxFotoSurat] || '',
        catatan: r[idxCatatan] || '',
        modul: defaultModul,
        prefix: defaultModul
      });
    }
    return abs;
  },

  /**
   * 3. Get Master Toko Schedule Targets
   */
  async getMasterToko(params = {}) {
    const cacheKey = 'master_toko_' + JSON.stringify(params);
    const cached = this.memoryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 30 * 60 * 1000)) {
      return cached.data;
    }

    // Check IndexedDB if available
    if (window.DashboardDB) {
      try {
        const idbData = await DashboardDB.get('master_toko');
        if (idbData && idbData.length > 0) {
          this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: idbData });
          return idbData;
        }
      } catch (e) {}
    }

    // Fetch from Central Apps Script API
    const url = this.buildUrl('getMasterToko', params);
    try {
      const res = await this.fetchWithTimeout(url, CONFIG.DEFAULT_TIMEOUT_MS);
      if (res && res.status === 'success' && res.data && res.data.length > 0) {
        this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: res.data });
        if (window.DashboardDB) DashboardDB.set('master_toko', res.data);
        return res.data;
      }
    } catch (e) {
      console.error('Error fetching master toko:', e);
      if (cached) return cached.data;
    }
    return [];
  },

  /**
   * 3b. Get Official Master User Roster (Central Employee Database)
   */
  async getMasterUser(params = {}) {
    const cacheKey = 'master_user_' + JSON.stringify(params);
    const cached = this.memoryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 30 * 60 * 1000)) {
      return cached.data;
    }

    // Check IndexedDB if available
    if (window.DashboardDB) {
      try {
        const idbData = await DashboardDB.get('master_user');
        if (idbData && idbData.length > 0) {
          this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: idbData });
          return idbData;
        }
      } catch (e) {}
    }

    // Fetch from Central Apps Script API
    const url = this.buildUrl('getMasterUser', params);
    try {
      const res = await this.fetchWithTimeout(url, CONFIG.DEFAULT_TIMEOUT_MS);
      if (res && res.status === 'success' && res.data && res.data.length > 0) {
        this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: res.data });
        if (window.DashboardDB) DashboardDB.set('master_user', res.data);
        return res.data;
      }
    } catch (err) {
      console.error('Error fetching master user:', err);
      if (cached) return cached.data;
    }

    return [];
  },

  /**
   * 4. Get Master 49k Stores Catalog
   */
  async getMasterStores49k(query = '', limit = 300) {
    const url = this.buildUrl('getMasterStores49k', { q: query, limit });
    const res = await this.fetchWithTimeout(url, CONFIG.FAST_TIMEOUT_MS);
    return (res && res.status === 'success') ? res.data : [];
  },

  /**
   * 5. Get List of Archive Months from Google Drive
   */
  async getArchiveMonths() {
    const url = this.buildUrl('getArchiveMonths');
    const res = await this.fetchWithTimeout(url, CONFIG.FAST_TIMEOUT_MS);
    return (res && res.status === 'success') ? res.data : [];
  },

  /**
   * 6. Get Historical Visits from a Specific Archive File
   */
  async getArchiveVisits(fileId, params = {}) {
    const url = this.buildUrl('getArchiveVisits', { fileId, ...params });
    const res = await this.fetchWithTimeout(url, CONFIG.DEFAULT_TIMEOUT_MS);
    return (res && res.status === 'success') ? res.data : [];
  },

  /**
   * 7. Get Detail Audit Product Items (On Demand)
   */
  async getDetailAudit(modul, idVisit = '') {
    const url = this.buildUrl('getDetailAudit', { modul, idVisit });
    const res = await this.fetchWithTimeout(url, CONFIG.FAST_TIMEOUT_MS);
    return (res && res.status === 'success') ? res.data : [];
  },

  /**
   * 8. Resolve Image Preview URL from Google Drive Path
   */
  async resolveImage(path) {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;

    const url = this.buildUrl('resolveImage', { path });
    try {
      const res = await this.fetchWithTimeout(url, CONFIG.FAST_TIMEOUT_MS);
      if (res && res.status === 'success') {
        return res.directUrl || res.thumbnailUrl || res.viewUrl;
      }
    } catch (e) {}
    return null;
  }
};
