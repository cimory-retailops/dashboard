/**
 * ==============================================================================
 * CIMORY MDS DASHBOARD - API SERVICE (HIGH-SPEED CENTRAL FETCH & CACHE)
 * ==============================================================================
 */

const ApiService = {
  memoryCache: new Map(),

  /**
   * Universal Supabase REST API Fetcher (Instant Cloud Query ~50ms)
   */
  async fetchFromSupabase(table, queryParams = {}) {
    try {
      const requestedLimit = parseInt(queryParams.limit || '1000', 10);

      // Single fetch jika limit <= 1000
      if (requestedLimit <= 1000) {
        const url = new URL(`${CONFIG.SUPABASE_URL}/${table}`);
        Object.entries(queryParams).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            url.searchParams.append(k, String(v));
          }
        });
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url.toString(), {
          headers: {
            'apikey': CONFIG.SUPABASE_KEY,
            'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) return await res.json();
        return null;
      }

      // Parallel batch pagination jika limit > 1000 (Mampu menarik hingga 60.000 data Supabase)
      const numBatches = Math.min(Math.ceil(requestedLimit / 1000), 60);
      const batchPromises = [];
      for (let i = 0; i < numBatches; i++) {
        batchPromises.push((async () => {
          const url = new URL(`${CONFIG.SUPABASE_URL}/${table}`);
          Object.entries(queryParams).forEach(([k, v]) => {
            if (k !== 'limit' && k !== 'offset' && v !== undefined && v !== null && v !== '') {
              url.searchParams.append(k, String(v));
            }
          });
          url.searchParams.append('limit', '1000');
          url.searchParams.append('offset', String(i * 1000));
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(url.toString(), {
            headers: {
              'apikey': CONFIG.SUPABASE_KEY,
              'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`
            },
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (res.ok) return await res.json();
          return [];
        })());
      }

      const results = await Promise.all(batchPromises);
      return results.flat();
    } catch (e) {
      console.warn(`Supabase [${table}] fetch failed:`, e);
      return null;
    }
  },

  /**
   * Supabase Direct PATCH (Update Record Instan)
   */
  async patchSupabase(table, filters = {}, data = {}) {
    if (!CONFIG.USE_SUPABASE || !CONFIG.SUPABASE_URL) return null;
    try {
      const url = new URL(`${CONFIG.SUPABASE_URL}/${table}`);
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          url.searchParams.append(k, String(v));
        }
      });
      const res = await fetch(url.toString(), {
        method: 'PATCH',
        headers: {
          'apikey': CONFIG.SUPABASE_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        console.log(`⚡ [Supabase PATCH] Berhasil update ${table}:`, data);
        return await res.json();
      } else {
        console.warn(`⚠️ [Supabase PATCH] Gagal update ${table}:`, res.status, await res.text());
        return null;
      }
    } catch (e) {
      console.warn(`⚠️ [Supabase PATCH] Error:`, e);
      return null;
    }
  },

  /**
   * Supabase Direct DELETE (Hapus Record Instan)
   */
  async deleteFromSupabase(table, filters = {}) {
    if (!CONFIG.USE_SUPABASE || !CONFIG.SUPABASE_URL) return null;
    try {
      const url = new URL(`${CONFIG.SUPABASE_URL}/${table}`);
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          url.searchParams.append(k, String(v));
        }
      });
      const res = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
          'apikey': CONFIG.SUPABASE_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
          'Prefer': 'return=representation'
        }
      });
      if (res.ok) {
        console.log(`⚡ [Supabase DELETE] Berhasil hapus dari ${table}`);
        return await res.json();
      } else {
        console.warn(`⚠️ [Supabase DELETE] Gagal hapus dari ${table}:`, res.status, await res.text());
        return null;
      }
    } catch (e) {
      console.warn(`⚠️ [Supabase DELETE] Error:`, e);
      return null;
    }
  },

  /**
   * Supabase Direct INSERT / UPSERT (Tambah Record Instan)
   */
  async insertSupabase(table, records = []) {
    if (!CONFIG.USE_SUPABASE || !CONFIG.SUPABASE_URL || !records.length) return null;
    try {
      const url = new URL(`${CONFIG.SUPABASE_URL}/${table}`);
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'apikey': CONFIG.SUPABASE_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(records)
      });
      if (res.ok) {
        console.log(`⚡ [Supabase INSERT] Berhasil simpan ${records.length} baris ke ${table}`);
        return await res.json();
      } else {
        console.warn(`⚠️ [Supabase INSERT] Gagal simpan ke ${table}:`, res.status, await res.text());
        return null;
      }
    } catch (e) {
      console.warn(`⚠️ [Supabase INSERT] Error:`, e);
      return null;
    }
  },

  /**
   * Safe Direct CSV Fetcher with AbortController Timeout (Fails fast on mobile network lag)
   */
  async fetchCsvDirect(url, timeoutMs = 2500) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) return null;
      return await response.text();
    } catch (e) {
      clearTimeout(timeoutId);
      return null;
    }
  },

  /**
   * Helper concurrency runner (Membatasi request simultan agar HP tidak panas & tidak dicekik Google)
   */
  async runInBatches(items, fn, batchSize = 4) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(fn));
      results.push(...batchResults);
    }
    return results;
  },

  /**
   * Universal Ultra-Fast CSV Parser (Line-based, 100x lebih cepat di HP tanpa bikin freeze)
   */
  parseCsv(text) {
    if (!text) return [];
    const lines = text.split(/\r?\n/);
    const result = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Fast path jika baris tidak mengandung kutip (90% data)
      if (!line.includes('"')) {
        result.push(line.split(','));
        continue;
      }

      // Parser aman untuk baris dengan tanda kutip
      const row = [];
      let inQuotes = false;
      let cell = '';
      for (let j = 0; j < line.length; j++) {
        const c = line[j];
        if (c === '"') {
          if (inQuotes && line[j + 1] === '"') {
            cell += '"';
            j++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (c === ',' && !inQuotes) {
          row.push(cell);
          cell = '';
        } else {
          cell += c;
        }
      }
      row.push(cell);
      result.push(row);
    }
    return result;
  },

  /**
   * 1. Get Visits Data (Direct Parallel Fetch from 15 Branch Sheets + Central API Fallback)
   */
  async getVisits(params = {}) {
    const cacheKey = 'visits_' + JSON.stringify(params);
    const cached = this.memoryCache.get(cacheKey);
    if (!params.forceRefresh && cached && (Date.now() - cached.timestamp < CONFIG.CACHE_EXPIRY_MS)) {
      return cached.data;
    }

    // 0. FAST PATH: SUPABASE CLOUD (Instant Sub-100ms Query)
    if (CONFIG.USE_SUPABASE && CONFIG.SUPABASE_URL) {
      try {
        const query = {
          order: 'tanggal.desc,waktu.desc',
          limit: params.limit || 5000
        };
        const modUpper = (params.modul || 'ALL').toUpperCase().trim();
        if (modUpper && modUpper !== 'ALL' && modUpper !== 'NASIONAL') {
          if (modUpper.length === 2) {
            query.modul = `like.${modUpper}*`;
          } else {
            query.modul = `eq.${modUpper}`;
          }
        }
        if (params.date) {
          query.tanggal = `eq.${params.date}`;
        }
        const data = await this.fetchFromSupabase('tbl_all_kunjungan', query);
        if (data && Array.isArray(data) && data.length > 0) {
          const mapped = data.map(r => {
            const rawTime = r.waktu || '';
            const tMatch = String(rawTime).match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
            const cleanT = tMatch ? tMatch[1] : String(rawTime).trim();
            return {
              idVisit: r.id_visit || '',
              koordinat: r.map || '',
              time: cleanT,
              date: r.tanggal || '',
              dateIso: r.tanggal || '',
              hariKe: r.rute || '',
              hari: r.hari || '',
              week: r.week || '',
              kodeCrew: r.idcrew || '',
              namaCrew: r.nama_crew || '',
              crew: r.crew || r.nama_crew || '',
              account: r.account || '',
              kodeToko: r.kode_toko || '',
              namaToko: r.nama_toko || '',
              tipeToko: r.tipe_toko || '',
              fotoSelfie: r.foto_selfie_depan_toko || '',
              fotoBefore1: r.foto_before_1 || '',
              fotoBefore2: r.foto_before_2 || '',
              fotoBefore3: r.foto_before_3 || '',
              fotoBefore4: r.foto_before_4 || '',
              fotoAfter1: r.foto_after_1 || '',
              fotoAfter2: r.foto_after_2 || '',
              fotoAfter3: r.foto_after_3 || '',
              fotoAfter4: r.foto_after_4 || '',
              modul: r.modul || '',
              prefix: (r.modul || '').substring(0, 2)
            };
          });
          this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: mapped });
          if (window.DashboardDB) DashboardDB.set('visits_data', mapped, 24 * 60 * 60 * 1000);
          return mapped;
        }
      } catch (e) {
        console.warn('Supabase getVisits fallback ke Sheet:', e);
      }
    }

    // Check IndexedDB persistent cache (< 10ms) (Hanya fallback offline)
    if (!params.forceRefresh && window.DashboardDB) {
      try {
        const idbData = await DashboardDB.get('visits_data', true);
        if (idbData && idbData.length > 0) {
          this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: idbData });
          return idbData;
        }
      } catch (e) {}
    }

    // 1. Direct High-Speed Parallel Fetch (1.5 - 2.5s across all 15 branch sheets)
    try {
      const directVisits = await this.getVisitsDirect(params);
      if (directVisits && directVisits.length > 0) {
        this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: directVisits });
        if (window.DashboardDB) DashboardDB.set('visits_data', directVisits, 24 * 60 * 60 * 1000);
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
        if (window.DashboardDB) DashboardDB.set('visits_data', res.data, 24 * 60 * 60 * 1000);
        return res.data;
      }
    } catch (err) {
      console.warn('Central API getVisits failed:', err);
    }

    if (cached) return cached.data;
    return [];
  },

  /**
   * Direct Parallel Fetcher across 15 Module Spreadsheets (Batched in chunks of 4)
   */
  async getVisitsDirect(params = {}) {
    if (CONFIG.USE_SUPABASE && CONFIG.SUPABASE_URL) {
      return this.getVisits({ ...params, forceRefresh: true });
    }
    const targetModules = [];
    const modUpper = (params.modul || 'ALL').toUpperCase().trim();
    for (const [modKey, sheetId] of Object.entries(CONFIG.MODUL_IDS)) {
      if (!modUpper || modUpper === 'ALL' || modUpper === 'NASIONAL') {
        targetModules.push({ modKey, sheetId });
      } else if (modUpper.length === 2 && modKey.startsWith(modUpper)) {
        targetModules.push({ modKey, sheetId });
      } else if (modUpper === modKey) {
        targetModules.push({ modKey, sheetId });
      }
    }

    const results = await this.runInBatches(targetModules, async ({ modKey, sheetId }) => {
      const t0 = performance.now();
      try {
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Kunjungan`;
        let text = await this.fetchCsvDirect(url, 4500);
        if (!text) {
          const fallbackUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
          text = await this.fetchCsvDirect(fallbackUrl, 4500);
        }
        if (!text) {
          console.warn(`⚠️ [Kunjungan ${modKey}] Gagal unduh CSV (Timeout/Kosong) [${((performance.now() - t0)/1000).toFixed(2)}s]`);
          return [];
        }
        const parsed = this.parseVisitsRows(text, modKey);
        console.log(`📥 [Kunjungan ${modKey}] ${parsed.length} baris diunduh dalam ${((performance.now() - t0)/1000).toFixed(2)}s`);
        return parsed;
      } catch (err) {
        console.warn(`Direct fetch failed for ${modKey}:`, err);
        return [];
      }
    }, 4);

    const flatVisits = results.flat();
    console.log(`%c[Sync Kunjungan]%c Berhasil mengunduh total ${flatVisits.length} data kunjungan dari ${targetModules.length} cabang`, 'background:#0284c7;color:white;padding:2px 6px;border-radius:4px;font-weight:bold;', 'color:#38bdf8;');
    return flatVisits;
  },

  /**
   * Safe Direct Fetch with strict timeout (Zero hanging script tags)
   */
  async fetchWithTimeout(url, timeoutMs = 4000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      clearTimeout(timeoutId);
      return null;
    }
  },

  /**
   * Build API URL with Query Parameters
   */
  buildUrl(action, params = {}) {
    const query = new URLSearchParams({ action, ...params });
    return `${CONFIG.API_URL}?${query.toString()}`;
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
    if (!params.forceRefresh && cached && (Date.now() - cached.timestamp < CONFIG.CACHE_EXPIRY_MS)) {
      return cached.data;
    }

    // 0. FAST PATH: SUPABASE CLOUD (Instant Sub-100ms Query)
    if (CONFIG.USE_SUPABASE && CONFIG.SUPABASE_URL) {
      try {
        const query = {
          order: 'tanggal.desc,waktu.desc',
          limit: params.limit || 3000
        };
        const modUpper = (params.modul || 'ALL').toUpperCase().trim();
        if (modUpper && modUpper !== 'ALL' && modUpper !== 'NASIONAL') {
          query.modul = `like.${modUpper.substring(0, 2)}*`;
        }
        if (params.date) {
          query.tanggal = `eq.${params.date}`;
        }
        const data = await this.fetchFromSupabase('tbl_all_absensi', query);
        if (data && Array.isArray(data) && data.length > 0) {
          const mapped = data.map(r => {
            const rawTime = r.waktu || '';
            const tMatch = String(rawTime).match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
            const cleanT = tMatch ? tMatch[1] : String(rawTime).trim();
            return {
              idAbsen: String(r.id || ''),
              modul: r.modul || '',
              koordinat: r.map || '',
              tanggal: r.tanggal || '',
              dateIso: r.tanggal || '',
              time: cleanT,
              waktu: cleanT,
              kodeCrew: r.kode_crew || '',
              namaCrew: r.nama_crew || '',
              crew: r.nama_crew || '',
              tipe: r.tipe_absen || 'MASUK',
              status: r.tipe_absen || 'MASUK',
              keterangan: r.keterangan || '',
              catatan: r.keterangan || '',
              foto: r.foto_selfie || '',
              fotoSelfie: r.foto_selfie || '',
              fotoSurat: r.foto_surat_dokter || '',
              prefix: (r.modul || '').substring(0, 2)
            };
          });
          this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: mapped });
          if (window.DashboardDB) DashboardDB.set('absensi_data', mapped, 24 * 60 * 60 * 1000);
          return mapped;
        }
      } catch (e) {
        console.warn('Supabase getAbsensi fallback ke Sheet:', e);
      }
    }

    // Check IndexedDB persistent cache (< 10ms) (Hanya fallback offline)
    if (!params.forceRefresh && window.DashboardDB) {
      try {
        const idbData = await DashboardDB.get('absensi_data', true);
        if (idbData && idbData.length > 0) {
          this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: idbData });
          return idbData;
        }
      } catch (e) {}
    }

    try {
      const directAbs = await this.getAbsensiDirect(params);
      if (directAbs && directAbs.length > 0) {
        this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: directAbs });
        if (window.DashboardDB) DashboardDB.set('absensi_data', directAbs, 24 * 60 * 60 * 1000);
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
        if (window.DashboardDB) DashboardDB.set('absensi_data', res.data, 24 * 60 * 60 * 1000);
        return res.data;
      }
    } catch (err) {
      console.warn('Central API getAbsensi failed:', err);
    }

    if (cached) return cached.data;
    return [];
  },

  async getAbsensiDirect(params = {}) {
    if (CONFIG.USE_SUPABASE && CONFIG.SUPABASE_URL) {
      return this.getAbsensi({ ...params, forceRefresh: true });
    }
    const targetAbsen = [];
    const modUpper = (params.modul || 'ALL').toUpperCase().trim();
    for (const [absKey, sheetId] of Object.entries(CONFIG.ABSEN_IDS)) {
      if (!modUpper || modUpper === 'ALL' || modUpper === 'NASIONAL' || modUpper.startsWith(absKey) || absKey.startsWith(modUpper)) {
        targetAbsen.push({ absKey, sheetId });
      }
    }

    const promises = targetAbsen.map(async ({ absKey, sheetId }) => {
      try {
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Absensi`;
        const text = await this.fetchCsvDirect(url, 4500);
        if (!text) return [];
        return this.parseAbsensiRows(text, absKey);
      } catch (err) {
        console.warn(`Direct fetch absensi failed for ${absKey}:`, err);
        return [];
      }
    });

    const results = await Promise.all(promises);
    const flatAbs = results.flat();
    console.log(`%c[Sync Absensi]%c Berhasil mengunduh total ${flatAbs.length} log absensi dari 3 regional (DK, LK, LP)`, 'background:#059669;color:white;padding:2px 6px;border-radius:4px;font-weight:bold;', 'color:#34d399;');
    return flatAbs;
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
   * 3. Get Master Toko Schedule Targets (High-Speed Direct Pipeline Stream + Parallel Branch Fallback)
   */
  async getMasterToko(params = {}) {
    const cacheKey = 'master_toko_' + JSON.stringify(params);

    // 1. Check Memory Cache First
    const cached = this.memoryCache.get(cacheKey);
    if (!params.forceRefresh && cached && (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000)) {
      return cached.data;
    }

    // 0. FAST PATH: SUPABASE CLOUD (Instant Sub-100ms Query)
    if (CONFIG.USE_SUPABASE && CONFIG.SUPABASE_URL) {
      try {
        const query = {
          order: 'modul.asc,rute.asc',
          limit: params.limit || 25000
        };
        const modUpper = (params.modul || 'ALL').toUpperCase().trim();
        if (modUpper && modUpper !== 'ALL' && modUpper !== 'NASIONAL') {
          if (modUpper.length === 2) {
            query.modul = `like.${modUpper}*`;
          } else {
            query.modul = `eq.${modUpper}`;
          }
        }
        const data = await this.fetchFromSupabase('tbl_jadwal_rps', query);
        if (data && Array.isArray(data) && data.length > 0) {
          const mapped = data.map(r => ({
            modul: r.modul || '',
            account: (r.account || 'ALFAMART').toUpperCase(),
            kodeToko: r.kode_toko || '',
            namaToko: r.nama_toko || '',
            kodeCrew: r.kode_crew || '',
            namaCrew: r.nama_crew || '',
            rute: r.rute || '1',
            tipeToko: r.tipe_toko || '-',
            alamat: '-',
            noTelp: '-',
            status: 'AKTIF'
          }));
          this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: mapped });
          if (window.DashboardDB) DashboardDB.set('master_toko', mapped, 7 * 24 * 60 * 60 * 1000);
          return mapped;
        }
      } catch (e) {
        console.warn('Supabase getMasterToko fallback ke Sheet:', e);
      }
    }

    // 2. Check IndexedDB persistent cache (< 10ms) (Hanya fallback offline)
    if (!params.forceRefresh && window.DashboardDB) {
      try {
        const idbData = await DashboardDB.get('master_toko', true);
        if (idbData && idbData.length > 0) {
          this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: idbData });
          return idbData;
        }
      } catch (e) {}
    }

    // 3. Direct High-Speed Fetch from 15 Branch Spreadsheets (Only on forceRefresh or cold cache)
    try {
      const directData = await this.getMasterTokoDirect(params);
      if (directData && directData.length > 0) {
        this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: directData });
        if (window.DashboardDB) DashboardDB.set('master_toko', directData, 7 * 24 * 60 * 60 * 1000);
        return directData;
      }
    } catch (e) {
      console.warn('Direct getMasterToko fetch failed, falling back to cache or API:', e);
    }

    // 4. Fallback to Central Apps Script API
    const url = this.buildUrl('getMasterToko', params);
    try {
      const res = await this.fetchWithTimeout(url, CONFIG.FAST_TIMEOUT_MS);
      if (res && res.status === 'success' && res.data && res.data.length > 0) {
        this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: res.data });
        if (window.DashboardDB) DashboardDB.set('master_toko', res.data, 7 * 24 * 60 * 60 * 1000);
        return res.data;
      }
    } catch (e) {
      console.error('Error fetching master toko:', e);
      if (cached) return cached.data;
    }
    return [];
  },

  /**
   * Direct Stream for Master Toko (Prioritize Central Pipeline 1-Request Stream <500ms)
   */
  async getMasterTokoDirect(params = {}) {
    // 1. Fast Path: Ambil dari Central Pipeline Spreadsheet (1 single request instan untuk semua modul)
    try {
      const centralUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.CENTRAL_ID}/gviz/tq?tqx=out:csv&sheet=Master_Toko`;
      const text = await this.fetchCsvDirect(centralUrl, 3000);
      if (text) {
        const parsed = this.parseMasterTokoRows(text, params);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Central pipeline direct stream failed:', e);
    }

    // 2. Fallback: Parallel fetch across 15 branch spreadsheets
    const targetModules = [];
    const modUpper = (params.modul || 'ALL').toUpperCase().trim();
    for (const [modKey, sheetId] of Object.entries(CONFIG.MODUL_IDS)) {
      if (!modUpper || modUpper === 'ALL' || modUpper === 'NASIONAL') {
        targetModules.push({ modKey, sheetId });
      } else if (modUpper.length === 2 && modKey.startsWith(modUpper)) {
        targetModules.push({ modKey, sheetId });
      } else if (modUpper === modKey) {
        targetModules.push({ modKey, sheetId });
      }
    }

    const results = await this.runInBatches(targetModules, async ({ modKey, sheetId }) => {
      try {
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Master_Toko`;
        const text = await this.fetchCsvDirect(url, 2500);
        if (text) {
          return this.parseMasterTokoRows(text, params, modKey);
        }
      } catch (err) {
        return [];
      }
      return [];
    }, 3);

    return results.flat();
  },

  parseMasterTokoRows(csvText, params = {}, defaultModul = '') {
    const rows = this.parseCsv(csvText);
    if (rows.length < 2) return [];

    const headers = rows[0].map(h => (h || '').toUpperCase().replace(/[\s_-]/g, ''));
    
    function findIdx(possibleNames, defaultIdx) {
      for (const name of possibleNames) {
        const cleanName = name.toUpperCase().replace(/[\s_-]/g, '');
        const idx = headers.indexOf(cleanName);
        if (idx !== -1) return idx;
        const subIdx = headers.findIndex(h => h.includes(cleanName));
        if (subIdx !== -1) return subIdx;
      }
      return defaultIdx;
    }

    const idxModul = findIdx(['MODUL', 'WILAYAH', 'BRANCH'], -1);
    const idxAccount = findIdx(['ACCOUNT', 'AKUN'], 0);
    const idxKodeToko = findIdx(['KODETOKO', 'KODE', 'STORECODE'], 1);
    const idxNamaToko = findIdx(['NAMATOKO', 'NAMA', 'STORENAME'], 2);
    const idxKodeCrew = findIdx(['KODECREW', 'IDCREW', 'CREWCODE', 'NIK'], 3);
    const idxNamaCrew = findIdx(['NAMACREW', 'CREW', 'CREWNAME'], 4);
    const idxRute = findIdx(['RUTE', 'ROUTE', 'HARIKE', 'HARI'], 5);
    const idxTipeToko = findIdx(['TIPETOKO', 'FORMAT', 'TIPE'], 6);
    const idxAlamat = findIdx(['ALAMAT', 'ADDRESS'], 8);
    const idxNoTelp = findIdx(['NOTELP', 'TELP', 'PHONE'], 9);
    const idxStatus = findIdx(['STATUS', 'KETERANGAN'], 12);

    const list = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const kode = String(r[idxKodeToko] || '').trim();
      const nama = String(r[idxNamaToko] || '').trim();
      if (!kode && !nama) continue;

      let mod = (idxModul !== -1 && r[idxModul]) ? String(r[idxModul]).trim() : defaultModul;
      if (!mod && defaultModul) mod = defaultModul;

      const rute = String(r[idxRute] || '').trim();
      const nCrew = String(r[idxNamaCrew] || '').trim();
      const kCrew = String(r[idxKodeCrew] || '').trim();

      list.push({
        modul: mod,
        account: String(r[idxAccount] || 'ALFAMART').trim().toUpperCase(),
        kodeToko: kode,
        namaToko: nama,
        kodeCrew: kCrew,
        namaCrew: nCrew,
        rute: rute,
        tipeToko: String(r[idxTipeToko] || '').trim(),
        alamat: String(r[idxAlamat] || '').trim(),
        noTelp: String(r[idxNoTelp] || '').trim(),
        status: String(r[idxStatus] || 'AKTIF').trim().toUpperCase()
      });
    }

    return list;
  },

  /**
   * 3b. Get Official Master User Roster (Direct High-Speed Pipeline Stream)
   */
  async getMasterUser(params = {}) {
    const cacheKey = 'master_user_' + JSON.stringify(params);

    // 1. Check Memory Cache First
    const cached = this.memoryCache.get(cacheKey);
    if (!params.forceRefresh && cached && (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000)) {
      return cached.data;
    }

    // 2. Check IndexedDB if available
    if (!params.forceRefresh && window.DashboardDB) {
      try {
        const idbData = await DashboardDB.get('master_user', true);
        if (idbData && idbData.length > 0) {
          this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: idbData });
          return idbData;
        }
      } catch (e) {}
    }

    // 3. Direct High-Speed Fetch from Central Sheet (< 1s)
    try {
      const directUsers = await this.getMasterUserDirect(params);
      if (directUsers && directUsers.length > 0) {
        this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: directUsers });
        if (window.DashboardDB) DashboardDB.set('master_user', directUsers, 7 * 24 * 60 * 60 * 1000);
        return directUsers;
      }
    } catch (e) {
      console.warn('Direct getMasterUser fetch failed, falling back to central API:', e);
    }

    // 4. Fallback to Central Apps Script API
    const url = this.buildUrl('getMasterUser', params);
    try {
      const res = await this.fetchWithTimeout(url, CONFIG.FAST_TIMEOUT_MS);
      if (res && res.status === 'success' && res.data && res.data.length > 0) {
        this.memoryCache.set(cacheKey, { timestamp: Date.now(), data: res.data });
        if (window.DashboardDB) DashboardDB.set('master_user', res.data, 7 * 24 * 60 * 60 * 1000);
        return res.data;
      }
    } catch (err) {
      console.error('Error fetching master user:', err);
      if (cached) return cached.data;
    }

    return [];
  },

  /**
   * Direct Stream for Master User from Central Pipeline Spreadsheet
   */
  async getMasterUserDirect(params = {}) {
    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.CENTRAL_ID}/gviz/tq?tqx=out:csv&sheet=master_user`;
    const text = await this.fetchCsvDirect(url, 7000);
    if (!text) return [];

    const rows = this.parseCsv(text);
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

    const idxId = findIdx(['ID', 'IDCREW', 'KODECREW', 'NIK'], 0);
    const idxNama = findIdx(['NAMA', 'NAMACREW', 'NAME'], 1);
    const idxJabatan = findIdx(['JABATAN', 'ROLE', 'POSITION'], 2);
    const idxDivisi = findIdx(['DIVISI', 'DIVISION', 'DEPT'], 3);
    const idxAccount = findIdx(['ACCOUNT', 'AKUN'], 4);
    const idxEmail = findIdx(['EMAIL', 'MAIL'], 5);
    const idxRole = findIdx(['ROLE', 'HAKAKSES'], 6);
    const idxModul = findIdx(['MODUL', 'WILAYAH', 'BRANCH'], 7);
    const idxAlamat = findIdx(['ALAMATLENGKAP', 'ALAMAT', 'ADDRESS'], 8);
    const idxKec = findIdx(['KECAMATAN', 'KEC'], 9);
    const idxKota = findIdx(['KOTAKABUPATEN', 'KOTA', 'KABUPATEN', 'CITY'], 10);
    const idxRegion = findIdx(['REGION', 'REGIONAL'], 11);
    const idxStatus = findIdx(['STATUS'], 12);
    const idxNoWa = findIdx(['NOWA', 'WA', 'TELP', 'NOTELP'], 13);

    const users = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const nama = String(r[idxNama] || '').trim();
      if (!nama) continue;

      users.push({
        id: String(r[idxId] || '').trim(),
        nama: nama,
        jabatan: String(r[idxJabatan] || 'Merchandiser').trim(),
        divisi: String(r[idxDivisi] || 'Retail Operation').trim(),
        account: String(r[idxAccount] || '').trim(),
        email: String(r[idxEmail] || '').trim(),
        role: String(r[idxRole] || 'MDS').trim(),
        modul: String(r[idxModul] || '').trim().toUpperCase(),
        alamat: String(r[idxAlamat] || '').trim(),
        kecamatan: String(r[idxKec] || '').trim(),
        kabKota: String(r[idxKota] || '').trim(),
        region: String(r[idxRegion] || '').trim(),
        status: String(r[idxStatus] || 'AKTIF').trim().toUpperCase(),
        noWa: String(r[idxNoWa] || '').trim()
      });
    }

    return users;
  },

  /**
   * 4. Get Master 49k Stores Catalog (From IndexedDB / Direct Sheet Stream / Central Backend)
   */
  async getMasterStores49k(query = '', limit = 300) {
    // Check IndexedDB first
    if (window.DashboardDB) {
      const cached = await DashboardDB.get('stores_49k', true);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        if (!query) return cached.slice(0, limit);
        const q = String(query).toLowerCase().trim();
        return cached.filter(s => 
          (s.kodeToko && s.kodeToko.toLowerCase().includes(q)) ||
          (s.namaToko && s.namaToko.toLowerCase().includes(q)) ||
          (s.branchName && s.branchName.toLowerCase().includes(q)) ||
          (s.kabKota && s.kabKota.toLowerCase().includes(q)) ||
          (s.kecamatan && s.kecamatan.toLowerCase().includes(q))
        ).slice(0, limit);
      }
    }

    const url = this.buildUrl('getMasterStores49k', { q: query, limit });
    try {
      const res = await this.fetchWithTimeout(url, CONFIG.FAST_TIMEOUT_MS);
      return (res && res.status === 'success') ? res.data : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * High-Speed Direct Sync of Master Database 49k from Google Sheets to IndexedDB
   */
  async syncMasterStores49kFromSheet(onProgress) {
    // 0. FAST PATH: SUPABASE CLOUD (< 300ms)
    if (CONFIG.USE_SUPABASE && CONFIG.SUPABASE_URL) {
      if (onProgress) onProgress('Mengunduh Master Database 49k dari Supabase Cloud...');
      try {
        const cloudStores = await this.fetchFromSupabase('tbl_master_toko', { limit: 50000 });
        if (cloudStores && Array.isArray(cloudStores) && cloudStores.length > 0) {
          const mapped = cloudStores.map(r => ({
            kodeToko: r.store_code || '',
            namaToko: r.store_name || '',
            account: (r.account || '').toUpperCase(),
            branchName: r.branch_name || '',
            kecamatan: r.kecamatan || '',
            kabKota: r.kab_kota || '',
            lat: r.latitude || null,
            lon: r.longitude || null
          }));
          if (window.DashboardDB) {
            await DashboardDB.set('stores_49k', mapped);
            await DashboardDB.set('stores_49k_synced_at', Date.now());
          }
          return mapped;
        }
      } catch (e) {
        console.warn('Supabase syncMasterStores49kFromSheet fallback ke CSV:', e);
      }
    }

    if (onProgress) onProgress('Mengunduh Master Database 49k dari Google Sheets...');
    
    // GID 1970488135 is the dedicated master_toko sheet
    const csvUrl = 'https://docs.google.com/spreadsheets/d/16cokFfnQFIajmTd553TKy-CfkNFc1Gg7ElkhAer81QA/export?format=csv&gid=1970488135';
    let csvText = '';

    try {
      const resp = await fetch(csvUrl);
      if (resp.ok) {
        csvText = await resp.text();
      }
    } catch (e) {
      console.warn('Direct CSV download failed, trying local fallback or central API:', e);
    }

    // Fallback if CORS blocked direct CSV download: check local file or central backend
    if (!csvText || csvText.length < 100) {
      try {
        const localResp = await fetch('../05_simulasi_rute/data/master_toko_nasional.csv');
        if (localResp.ok) {
          csvText = await localResp.text();
        }
      } catch (err) {
        console.warn('Local CSV fallback failed:', err);
      }
    }

    if (!csvText || csvText.length < 100) {
      throw new Error('Gagal mengunduh data Master Toko 49k dari Google Sheets.');
    }

    if (onProgress) onProgress('Mem-parsing dan menata indeks database toko...');
    const rows = this.parseCsv(csvText);
    if (rows.length < 2) {
      throw new Error('Format Master Toko CSV kosong atau tidak valid.');
    }

    const headers = rows[0].map(h => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
    const codeIdx = headers.findIndex(h => h.includes('kode') || h.includes('storecode') || h === 'code');
    const nameIdx = headers.findIndex(h => h.includes('nama') || h.includes('storename'));
    const branchCodeIdx = headers.findIndex(h => h.includes('dccode') || h.includes('branchcode') || h.includes('kodedc'));
    const branchNameIdx = headers.findIndex(h => h.includes('dcname') || h.includes('branchname') || h.includes('namadc') || h.includes('dc'));
    const kecIdx = headers.findIndex(h => h.includes('kecamatan') || h.includes('kec'));
    const kabKotaIdx = headers.findIndex(h => h.includes('kab') || h.includes('kota') || h.includes('city'));
    const accIdx = headers.findIndex(h => h.includes('account') || h.includes('tipe') || h.includes('type'));
    const latIdx = headers.findIndex(h => h.includes('lat'));
    const lonIdx = headers.findIndex(h => h.includes('lon') || h.includes('lng'));

    const parsedStores = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const kode = String(r[codeIdx >= 0 ? codeIdx : 0] || '').trim();
      const nama = String(r[nameIdx >= 0 ? nameIdx : 3] || r[nameIdx >= 0 ? nameIdx : 1] || '').trim();
      if (!kode && !nama) continue;

      let rawAcc = String(r[accIdx >= 0 ? accIdx : 9] || '').trim().toUpperCase();
      if (!rawAcc || rawAcc === 'OTHER' || rawAcc === 'TIPE' || rawAcc.includes('SUPER') || rawAcc.includes('HYPER') || rawAcc.includes('DAN')) {
        const upName = nama.toUpperCase();
        if (upName.includes('ALFAMART') || upName.includes('SAT ') || upName.includes('[SAT')) rawAcc = 'ALFAMART';
        else if (upName.includes('INDOMARET') || upName.includes('IDM ') || upName.includes('[IDM')) rawAcc = 'INDOMARET';
        else if (upName.includes('ALFAMIDI') || upName.includes('MIDI')) rawAcc = 'ALFAMIDI';
        else if (upName.includes('FAMILY MART') || upName.includes('FM ')) rawAcc = 'FAMILY MART';
        else if (upName.includes('LAWSON')) rawAcc = 'LAWSON';
        else if (upName.includes('CIRCLE K') || upName.includes('CK ')) rawAcc = 'CIRCLE K';
        else if (upName.includes('YOMART')) rawAcc = 'YOMART';
        else rawAcc = 'MINIMARKET';
      }

      parsedStores.push({
        id: kode || `STORE_${i}`,
        kodeToko: kode,
        namaToko: nama,
        account: rawAcc,
        branchCode: String(r[branchCodeIdx >= 0 ? branchCodeIdx : 1] || '').trim(),
        branchName: String(r[branchNameIdx >= 0 ? branchNameIdx : 2] || '').trim(),
        kecamatan: String(r[kecIdx >= 0 ? kecIdx : 4] || '').trim(),
        kabKota: String(r[kabKotaIdx >= 0 ? kabKotaIdx : 5] || '').trim(),
        lat: String(r[latIdx >= 0 ? latIdx : 7] || '').trim(),
        lon: String(r[lonIdx >= 0 ? lonIdx : 8] || '').trim()
      });
    }

    if (onProgress) onProgress(`Menyimpan ${parsedStores.length} toko ke IndexedDB local...`);
    if (window.DashboardDB) {
      await DashboardDB.set('stores_49k', parsedStores, 7 * 24 * 60 * 60 * 1000);
      await DashboardDB.set('stores_49k_synced_at', Date.now(), 7 * 24 * 60 * 60 * 1000);
    }

    return parsedStores;
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
  },

  /**
   * 9. Post / Execute CRUD Action to Central GAS Backend (CORS-Proof with JSONP & Direct POST Fallback)
   */
  async postAction(action, payload = {}) {
    const fullPayload = { action, ...payload };
    const url = CONFIG.API_URL;

    console.group(`⚙️ [DASHBOARD CRUD: ${action}]`);
    console.log("📍 Target Endpoint GAS:", url);
    console.log("📋 Data Payload Dikirim:", fullPayload);

    // 0. FAST-PATH DIRECT SUPABASE DUAL WRITE (Instant Cloud Sync < 100ms)
    try {
      if (CONFIG.USE_SUPABASE && CONFIG.SUPABASE_URL) {
        if (action === 'update_store_route_info') {
          const oldData = payload.oldData || payload;
          const newData = payload.newData || payload;
          const oldMod = (oldData.modul || '').toUpperCase().trim();
          const oldKode = (oldData.kodeToko || '').toUpperCase().trim();
          const oldRute = String(oldData.rute || '').replace(/[^0-9]/g, '');
          if (oldMod && oldKode) {
            const patchObj = {};
            if (newData.modul) patchObj.modul = (newData.modul).toUpperCase().trim();
            if (newData.account) patchObj.account = (newData.account).toUpperCase().trim();
            if (newData.kodeToko) patchObj.kode_toko = (newData.kodeToko).toUpperCase().trim();
            if (newData.namaToko) patchObj.nama_toko = (newData.namaToko).trim();
            if (newData.rute) patchObj.rute = String(newData.rute).replace(/[^0-9]/g, '');
            const flt = { modul: `eq.${oldMod}`, kode_toko: `eq.${oldKode}` };
            if (oldRute) flt.rute = `eq.${oldRute}`;
            await this.patchSupabase('tbl_jadwal_rps', flt, patchObj);

            // 🔥 Sinkronkan juga ke Master Database Toko Nasional (tbl_master_toko) di Supabase
            if (oldKode) {
              const mPatch = {};
              if (newData.kodeToko) mPatch.store_code = (newData.kodeToko).toUpperCase().trim();
              if (newData.namaToko) mPatch.store_name = (newData.namaToko).trim();
              if (newData.account) mPatch.account = (newData.account).toUpperCase().trim();
              if (Object.keys(mPatch).length > 0) {
                await this.patchSupabase('tbl_master_toko', { store_code: `eq.${oldKode}` }, mPatch);
                console.log(`🏬 [Master Toko Sync] Berhasil update master nasional tbl_master_toko untuk kode ${oldKode}`);
              }
            }

            // 📡 Broadcast perubahan ke tab Web Absen & IndexedDB
            try {
              const bc = new BroadcastChannel('mds_sync_channel');
              bc.postMessage({
                type: 'MASTER_STORE_UPDATED',
                oldKode: oldKode,
                kodeToko: (newData.kodeToko || oldKode).toUpperCase().trim(),
                namaToko: (newData.namaToko || oldData.namaToko || '').trim(),
                account: (newData.account || oldData.account || '').toUpperCase().trim()
              });
              bc.close();
            } catch (e) {}
          }
        } else if (action === 'create_or_update_master_store') {
          const st = payload.store || payload;
          const kTok = (st.kodeToko || st.store_code || '').toUpperCase().trim();
          const nTok = (st.namaToko || st.store_name || '').trim();
          const acc = (st.account || 'ALFAMART').toUpperCase().trim();
          if (kTok && nTok) {
            const existing = await this.fetchFromSupabase('tbl_master_toko', { store_code: `eq.${kTok}` });
            if (existing && existing.length > 0) {
              await this.patchSupabase('tbl_master_toko', { store_code: `eq.${kTok}` }, {
                store_name: nTok,
                account: acc,
                branch_name: st.dcName || st.branch_name || '-',
                kecamatan: st.kecamatan || '-',
                kab_kota: st.kota || st.kab_kota || '-',
                latitude: st.lat || null,
                longitude: st.lon || null
              });
            } else {
              await this.insertSupabase('tbl_master_toko', [{
                store_code: kTok,
                store_name: nTok,
                account: acc,
                branch_name: st.dcName || st.branch_name || '-',
                kecamatan: st.kecamatan || '-',
                kab_kota: st.kota || st.kab_kota || '-',
                latitude: st.lat || null,
                longitude: st.lon || null
              }]);
            }
            console.log(`🏬 [Master Toko Sync] Berhasil sinkronisasi master toko ${kTok} ke tbl_master_toko`);

            try {
              const bc = new BroadcastChannel('mds_sync_channel');
              bc.postMessage({
                type: 'MASTER_STORE_ADDED',
                kodeToko: kTok,
                namaToko: nTok,
                account: acc,
                dcName: st.dcName || '-',
                kecamatan: st.kecamatan || '-',
                kota: st.kota || '-',
                lat: st.lat || null,
                lon: st.lon || null
              });
              bc.close();
            } catch (e) {}
          }
        } else if (action === 'batch_update_master_stores') {
          const storeList = Array.isArray(payload.stores) ? payload.stores : (payload.storeList || []);
          for (const st of storeList) {
            const kTok = (st.kodeToko || st.store_code || '').toUpperCase().trim();
            if (!kTok) continue;
            const patchData = {};
            if (st.namaToko || st.store_name) patchData.store_name = (st.namaToko || st.store_name).trim();
            if (st.account) patchData.account = (st.account).toUpperCase().trim();
            if (st.branchName || st.dcName) patchData.branch_name = st.branchName || st.dcName;
            if (st.kecamatan) patchData.kecamatan = st.kecamatan;
            if (st.kota || st.kabKota) patchData.kab_kota = st.kota || st.kabKota;
            if (st.lat !== undefined && st.lat !== null && !isNaN(Number(st.lat)) && Number(st.lat) !== 0) {
              patchData.latitude = parseFloat(st.lat);
            }
            if (st.lon !== undefined && st.lon !== null && !isNaN(Number(st.lon)) && Number(st.lon) !== 0) {
              patchData.longitude = parseFloat(st.lon);
            }
            if (Object.keys(patchData).length > 0) {
              await this.patchSupabase('tbl_master_toko', { store_code: `eq.${kTok}` }, patchData);
            }
          }
          console.log(`🏬 [Master Toko Batch Sync] Berhasil update ${storeList.length} toko ke tbl_master_toko`);
          try {
            const bc = new BroadcastChannel('mds_sync_channel');
            bc.postMessage({
              type: 'MASTER_STORE_UPDATED',
              stores: storeList
            });
            bc.close();
          } catch (e) {}

          // Background sync ke Google Sheets via GAS (Non-blocking)
          try {
            fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify(fullPayload)
            }).catch(() => {});
          } catch (e) {}

          console.groupEnd();
          return {
            status: 'success',
            action: action,
            message: `Berhasil memperbarui ${storeList.length} toko di Database Toko Nasional!`,
            count: storeList.length
          };
        } else if (action === 'transfer_store_crew') {
          const store = payload.store || payload;
          const oldMod = (payload.oldModul || store.modul || '').toUpperCase().trim();
          const oldRute = String(payload.oldRute || store.rute || '').replace(/[^0-9]/g, '');
          const kodeToko = (store.kodeToko || '').toUpperCase().trim();
          if (oldMod && kodeToko) {
            const patchObj = {
              nama_crew: (payload.newCrewName || '').trim(),
              kode_crew: (payload.newCrewCode || '').trim(),
              modul: (payload.newModul || oldMod).toUpperCase().trim(),
              rute: String(payload.newRute || oldRute).replace(/[^0-9]/g, '')
            };
            const flt = { modul: `eq.${oldMod}`, kode_toko: `eq.${kodeToko}` };
            if (oldRute) flt.rute = `eq.${oldRute}`;
            await this.patchSupabase('tbl_jadwal_rps', flt, patchObj);
          }
        } else if (action === 'delete_scheduled_store') {
          const st = payload.store || payload;
          const mod = (st.modul || '').toUpperCase().trim();
          const kTok = (st.kodeToko || '').toUpperCase().trim();
          const rute = String(st.rute || '').replace(/[^0-9]/g, '');
          if (mod && kTok) {
            const flt = { modul: `eq.${mod}`, kode_toko: `eq.${kTok}` };
            if (rute) flt.rute = `eq.${rute}`;
            await this.deleteFromSupabase('tbl_jadwal_rps', flt);
          }
        } else if (action === 'assign_scheduled_store') {
          const mod = (payload.modul || '').toUpperCase().trim();
          const kTok = (payload.kodeToko || '').toUpperCase().trim();
          if (mod && kTok) {
            await this.insertSupabase('tbl_jadwal_rps', [{
              modul: mod,
              account: (payload.account || 'ALFAMART').toUpperCase().trim(),
              kode_toko: kTok,
              nama_toko: (payload.namaToko || '').trim(),
              kode_crew: (payload.kodeCrew || '').trim(),
              nama_crew: (payload.namaCrew || '').trim(),
              rute: String(payload.rute || '1').replace(/[^0-9]/g, '') || '1',
              tipe_toko: '-'
            }]);
          }
        }
      }
    } catch (sbErr) {
      console.warn('⚠️ Fast-path Supabase CRUD sync warning:', sbErr);
    }
    
    // 1. Direct POST (text/plain bypasses CORS & Google Apps Script redirect)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(fullPayload)
      });
      if (!response.ok) {
        console.error('❌ HTTP Error GAS:', response.status);
        console.groupEnd();
        throw new Error(`HTTP Error ${response.status}`);
      }
      const data = await response.json();
      if (data.status === 'error') {
        console.error('❌ Error Response GAS:', data.message);
        console.groupEnd();
        throw new Error(data.message || 'Operasi gagal dieksekusi di Spreadsheet');
      }
      console.log('✅ Berhasil Eksekusi GAS (POST):', data);
      console.groupEnd();
      return data;
    } catch (err) {
      console.warn('Direct POST failed, attempting URLSearchParams fallback:', err);
      const formBody = new URLSearchParams({
        action: action,
        data: JSON.stringify(fullPayload)
      });
      const fallbackResp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.toString()
      });
      const data = await fallbackResp.json();
      if (data.status === 'error') {
        console.error('❌ Error Response GAS Fallback:', data.message);
        console.groupEnd();
        throw new Error(data.message);
      }
      console.log('✅ Berhasil Eksekusi GAS (URLSearchParams):', data);
      console.groupEnd();
      return data;
    }
  }
};
