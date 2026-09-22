/**
 * ==============================================================================
 * CIMORY RETAIL OPS - DISPLAY GALLERY API SERVICE
 * High-Speed Parallel CSV Fetcher + Google Drive Smart Thumbnail Optimizer
 * ==============================================================================
 */

const ApiService = {
  memoryCache: new Map(),

  async fetchFromSupabase(table, queryParams = {}) {
    try {
      const requestedLimit = parseInt(queryParams.limit || '1000', 10);
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

      const numBatches = Math.min(Math.ceil(requestedLimit / 1000), 20);
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
   * Fast CSV Parser (RFC 4180 compliant)
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
   * JSONP Fetcher (100% CORS-free for Apps Script communication)
   */
  fetchJsonp(url, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_cb_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      const delimiter = url.includes('?') ? '&' : '?';
      const scriptUrl = `${url}${delimiter}callback=${callbackName}&_t=${Date.now()}`;

      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`JSONP timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      function cleanup() {
        clearTimeout(timeoutId);
        if (script.parentNode) script.parentNode.removeChild(script);
        window[callbackName] = function () {};
      }

      window[callbackName] = function (data) {
        cleanup();
        resolve(data);
      };

      script.onerror = function () {
        cleanup();
        reject(new Error('JSONP Script loading failed'));
      };

      document.head.appendChild(script);
    });
  },

  /**
   * Standarisasi nama Account Retail (gabungkan duplikasi seperti FAMILY MART & FAMILYMART)
   */
  normalizeAccount(rawAcc) {
    if (!rawAcc) return 'OTHER';
    const s = String(rawAcc).toUpperCase().trim().replace(/\s+/g, ' ');
    if (s === 'FAMILY MART' || s === 'FAMILY_MART' || s === 'FAMILYMART' || s === 'FMI' || s === 'FM') return 'FAMILYMART';
    if (s === 'CIRCLE K' || s === 'CIRCLEK' || s === 'CIRCLE_K' || s === 'CK') return 'CIRCLE K';
    if (s === 'INDOMARET' || s === 'INDO MARET' || s === 'IDM') return 'INDOMARET';
    if (s === 'ALFAMIDI' || s === 'ALFA MIDI' || s === 'SUPER MIDI' || s === 'SUPERMIDI' || s === 'MIDI') return 'ALFAMIDI';
    if (s === 'ALFAMART' || s === 'ALFA MART' || s === 'ALFA' || s === 'SAT') return 'ALFAMART';
    if (s === 'LAWSON' || s === 'LAW') return 'LAWSON';
    if (s === 'YOMART' || s === 'YO MART' || s === 'YMT') return 'YOMART';
    if (s === 'SUPERINDO' || s === 'SUPER INDO') return 'SUPERINDO';
    if (s === 'HYPERMART' || s === 'HYPER MART') return 'HYPERMART';
    if (s === 'OTHER' || s === '-' || s === 'LOKAL' || s === 'LAINNYA') return 'OTHER';
    return s;
  },

  /**
   * Extract Google Drive File ID from various URL formats
   */
  extractDriveId(url) {
    if (!url) return null;
    const str = String(url).trim();
    if (!str.startsWith('http') && str.length >= 25 && !str.includes('/') && !str.includes('?')) {
      return str; // Direct ID
    }
    const idMatch = str.match(/[-\w]{25,}/);
    return idMatch ? idMatch[0] : null;
  },

  /**
   * Get Ultra-Lightweight Smart Web Thumbnail (~30KB) from Google Drive
   */
  getThumbnailUrl(url, size = 250) {
    if (!url) return '';
    const clean = String(url).trim();
    if (!clean.startsWith('http')) return ''; // Relative path will be resolved asynchronously
    const fileId = this.extractDriveId(clean);
    if (!fileId) return clean;
    return `https://lh3.googleusercontent.com/d/${fileId}=w${size}-h${size}-n-k`;
  },

  /**
   * Get High-Resolution Image URL for Modal / Zoom
   */
  getHdPhotoUrl(url) {
    if (!url) return '';
    const clean = String(url).trim();
    if (!clean.startsWith('http')) return '';
    const fileId = this.extractDriveId(clean);
    if (!fileId) return clean;
    return `https://lh3.googleusercontent.com/d/${fileId}=w1600-h1600-k`;
  },

  resolveQueue: [],
  activeWorkers: 0,
  maxWorkers: 6,

  /**
   * Resolve Relative AppSheet Image Path to Google Drive Direct CDN URL with Queuing & Rate Limiting
   */
  async resolveImage(path) {
    if (!path) return '';
    const cleanPath = String(path).trim();
    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      return cleanPath;
    }

    // 1. Check in-memory cache
    const cacheKey = 'img_' + cleanPath;
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey);
    }

    // 2. Queue resolution to prevent Google Apps Script concurrency throttling
    return new Promise((resolve) => {
      this.resolveQueue.push({ cleanPath, cacheKey, resolve });
      this.processQueue();
    });
  },

  async processQueue() {
    if (this.activeWorkers >= this.maxWorkers || this.resolveQueue.length === 0) {
      return;
    }

    this.activeWorkers++;
    const { cleanPath, cacheKey, resolve } = this.resolveQueue.shift();

    try {
      // Double check memory cache
      if (this.memoryCache.has(cacheKey)) {
        resolve(this.memoryCache.get(cacheKey));
        this.activeWorkers--;
        this.processQueue();
        return;
      }

      const url = `${CONFIG.API_URL}?action=resolveImage&path=${encodeURIComponent(cleanPath)}`;
      const res = await this.fetchJsonp(url, 10000);
      if (res && res.status === 'success' && (res.directUrl || res.fileId || res.thumbnailUrl)) {
        const directUrl = res.directUrl || (res.fileId ? `https://lh3.googleusercontent.com/d/${res.fileId}=w800-h800-k` : res.thumbnailUrl);
        this.memoryCache.set(cacheKey, directUrl);
        resolve(directUrl);
      } else {
        this.memoryCache.set(cacheKey, '');
        resolve('');
      }
    } catch (e) {
      this.memoryCache.set(cacheKey, '');
      resolve('');
    } finally {
      this.activeWorkers--;
      this.processQueue();
    }
  },

  masterTokoTypeMap: new Map(),

  async loadMasterTokoTypes() {
    if (this.masterTokoTypeMap.size > 0) return this.masterTokoTypeMap;

    // 0. Prioritas Utama: Kamus Master Chiller Nasional (8,300+ Toko Lengkap)
    if (window.MASTER_CHILLER_TYPES && typeof window.MASTER_CHILLER_TYPES === 'object') {
      Object.entries(window.MASTER_CHILLER_TYPES).forEach(([k, v]) => {
        const code = String(k || '').trim().toUpperCase();
        const tipe = String(v || '').trim();
        if (code && tipe && tipe !== '-') {
          this.masterTokoTypeMap.set(code, tipe);
        }
      });
    }

    // 1. Ambil dari Supabase tbl_jadwal_rps jika aktif
    if (CONFIG.USE_SUPABASE && CONFIG.SUPABASE_URL) {
      try {
        const rpsRows = await this.fetchFromSupabase('tbl_jadwal_rps', {
          select: 'kode_toko,tipe_toko',
          limit: 10000
        });
        if (Array.isArray(rpsRows)) {
          rpsRows.forEach(r => {
            const code = String(r.kode_toko || '').trim().toUpperCase();
            const tipe = String(r.tipe_toko || '').trim();
            if (code && tipe && tipe !== '-' && !this.masterTokoTypeMap.has(code)) {
              this.masterTokoTypeMap.set(code, tipe);
            }
          });
        }
      } catch (e) {
        console.warn('Supabase load master tipe notice:', e);
      }
    }

    // 2. Fallback baca dari list_toko.csv
    try {
      const resp = await fetch('../01_web_absen/list_toko.csv');
      if (resp.ok) {
        const text = await resp.text();
        const rows = this.parseCsv(text);
        if (rows.length > 1) {
          rows.slice(1).forEach(r => {
            const storeCode = String(r[0] || '').trim().toUpperCase();
            const storeType = String(r[9] || '').trim();
            if (storeCode && storeType && storeType !== '-') {
              if (!this.masterTokoTypeMap.has(storeCode)) {
                this.masterTokoTypeMap.set(storeCode, storeType);
              }
            }
          });
        }
      }
    } catch (e) {
      console.warn('Fallback load list_toko.csv notice:', e);
    }
    return this.masterTokoTypeMap;
  },

  /**
   * 1. Get All Store Photos across 15 Modules (Direct Parallel Fetch ~1.5s)
   */
  async getVisitsWithPhotos(params = {}) {
    // 0. FAST PATH: SUPABASE CLOUD (< 100ms Query)
    if (CONFIG.USE_SUPABASE && CONFIG.SUPABASE_URL) {
      try {
        await this.loadMasterTokoTypes();
        const masterMap = this.masterTokoTypeMap || new Map();

        const query = {
          order: 'tanggal.desc,waktu.desc',
          limit: params.limit || 5000
        };
        const modUpper = (params.modul || 'ALL').toUpperCase().trim();
        if (modUpper && modUpper !== 'ALL' && modUpper !== 'NASIONAL') {
          query.modul = modUpper.length === 2 ? `like.${modUpper}*` : `eq.${modUpper}`;
        }
        if (params.date) {
          query.tanggal = `eq.${params.date}`;
        }

        const data = await this.fetchFromSupabase('tbl_all_kunjungan', query);
        if (data && Array.isArray(data) && data.length > 0) {
          const cleanTime = (t) => {
            if (!t) return '';
            const m = String(t).match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
            return m ? m[1] : String(t).trim();
          };

          const visits = [];
          for (let i = 0; i < data.length; i++) {
            const r = data[i];
            const beforeList = [r.foto_before_1 || '', r.foto_before_2 || '', r.foto_before_3 || '', r.foto_before_4 || ''].filter(s => s && s.trim().length > 5);
            const afterList = [r.foto_after_1 || '', r.foto_after_2 || '', r.foto_after_3 || '', r.foto_after_4 || ''].filter(s => s && s.trim().length > 5);
            const selfie = (r.foto_selfie_depan_toko || '').trim();

            if (beforeList.length === 0 && afterList.length === 0 && !selfie) continue;

            const kodeToko = (r.kode_toko || '').toUpperCase().trim();
            let tipeToko = String(r.tipe_toko || '').trim();
            if ((!tipeToko || tipeToko === '-' || tipeToko.toLowerCase() === 'null') && kodeToko && masterMap.has(kodeToko)) {
              tipeToko = masterMap.get(kodeToko);
            }

            visits.push({
              idVisit: r.id_visit || '',
              time: cleanTime(r.waktu),
              date: r.tanggal || '',
              dateIso: r.tanggal || '',
              hariKe: r.rute || '',
              kodeCrew: r.idcrew || '',
              namaCrew: r.nama_crew || '',
              account: this.normalizeAccount(r.account),
              kodeToko: kodeToko,
              namaToko: r.nama_toko || '',
              tipeToko: tipeToko || '-',
              fotoSelfie: selfie,
              fotoBefore: beforeList,
              fotoAfter: afterList,
              modul: r.modul || '',
              prefix: (r.modul || '').substring(0, 2)
            });
          }
          await this.enrichStoreNames(visits);
          return visits;
        }
      } catch (e) {
        console.warn('Supabase getVisitsWithPhotos fallback ke Sheets:', e);
      }
    }

    // 1. Fallback Lama: Direct 15 Branch Sheets Fetch
    await this.loadMasterTokoTypes();

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
        console.warn(`Fetch foto gagal untuk ${modKey}:`, err);
        return [];
      }
    });

    const results = await Promise.all(promises);
    const flatVisits = results.flat();
    await this.enrichStoreNames(flatVisits);
    return flatVisits;
  },

  masterStoreNameMap: new Map(),

  /**
   * Resolusi Asinkron Nama Resmi Toko dari Supabase tbl_master_toko
   * Menggantikan nama toko yang masih berupa format placeholder akun_kode (misal: ALFAMART_R678)
   */
  async enrichStoreNames(visits) {
    if (!visits || visits.length === 0 || !CONFIG.USE_SUPABASE) return;

    const missingCodes = new Set();
    visits.forEach(v => {
      const code = (v.kodeToko || '').trim().toUpperCase();
      const name = (v.namaToko || '').trim();
      const isPlaceholder = !name || name.toUpperCase() === `${v.account}_${code}` || /^(ALFAMART|INDOMARET|ALFAMIDI|LAWSON|CIRCLE\s*K|FAMILYMART|YOMART|SAT|IDM|CK|FM)_[A-Z0-9]+$/i.test(name);
      if (code && (isPlaceholder || !this.masterStoreNameMap.has(code))) {
        missingCodes.add(code);
      }
    });

    if (missingCodes.size === 0) return;

    const codeArr = Array.from(missingCodes);
    for (let i = 0; i < codeArr.length; i += 50) {
      const chunk = codeArr.slice(i, i + 50);
      try {
        const res = await this.fetchFromSupabase('tbl_master_toko', {
          store_code: `in.(${chunk.join(',')})`,
          select: 'store_code,store_name,account'
        });
        if (res && Array.isArray(res)) {
          res.forEach(item => {
            if (item.store_code && item.store_name) {
              const cleanCode = item.store_code.toUpperCase().trim();
              this.masterStoreNameMap.set(cleanCode, item.store_name.trim());
            }
          });
        }
      } catch (e) {
        console.warn('enrichStoreNames lookup warning:', e);
      }
    }

    // Perbarui namaToko pada setiap kunjungan
    visits.forEach(v => {
      const code = (v.kodeToko || '').trim().toUpperCase();
      if (code && this.masterStoreNameMap.has(code)) {
        v.namaToko = this.masterStoreNameMap.get(code);
      }
    });
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
    const idxTime = findIdx(['WAKTU', 'TIME', 'JAM'], 2);
    const idxDate = findIdx(['TANGGAL', 'DATE', 'TGL'], 3);
    const idxHariKe = findIdx(['RUTE', 'HARI_KE', 'HARI KE'], 4);
    const idxKodeCrew = findIdx(['IDCREW', 'ID_CREW', 'KODE_CREW', 'KODE CREW'], 7);
    const idxNamaCrew = findIdx(['NAMA_CREW', 'NAMA CREW', 'NAMA'], 8);
    const idxAccount = findIdx(['ACCOUNT', 'AKUN'], 10);
    const idxKodeToko = findIdx(['KODE_TOKO', 'KODE TOKO'], 11);
    const idxNamaToko = findIdx(['NAMA_TOKO', 'NAMA TOKO'], 12);
    const idxTipeToko = findIdx(['TIPE_TOKO', 'TIPE TOKO', 'TIPE', 'TIPE_CHILLER', 'CHILLER', 'TIPE_DISPLAY'], 13);
    const idxFotoSelfie = findIdx(['FOTO_SELFIE', 'FOTO SELFIE'], 14);

    // Dynamic Photo columns lookup
    const idxBefore1 = findIdx(['FOTO_BEFORE_1', 'FOTO BEFORE 1', 'BEFORE 1', 'FOTO_BEFORE'], 193);
    const idxBefore2 = findIdx(['FOTO_BEFORE_2', 'FOTO BEFORE 2', 'BEFORE 2'], 194);
    const idxBefore3 = findIdx(['FOTO_BEFORE_3', 'FOTO BEFORE 3', 'BEFORE 3'], 195);
    const idxBefore4 = findIdx(['FOTO_BEFORE_4', 'FOTO BEFORE 4', 'BEFORE 4'], 196);
    const idxAfter1 = findIdx(['FOTO_AFTER_1', 'FOTO AFTER 1', 'AFTER 1', 'FOTO_AFTER'], 199);
    const idxAfter2 = findIdx(['FOTO_AFTER_2', 'FOTO AFTER 2', 'AFTER 2'], 200);
    const idxAfter3 = findIdx(['FOTO_AFTER_3', 'FOTO AFTER 3', 'AFTER 3'], 201);
    const idxAfter4 = findIdx(['FOTO_AFTER_4', 'FOTO AFTER 4', 'AFTER 4'], 202);

    const masterMap = this.masterTokoTypeMap || new Map();
    const visits = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const idVisit = r[idxId] || '';
      if (!idVisit) continue;

      const beforeList = [r[idxBefore1] || r[15] || '', r[idxBefore2] || '', r[idxBefore3] || '', r[idxBefore4] || ''].filter(Boolean);
      const afterList = [r[idxAfter1] || '', r[idxAfter2] || '', r[idxAfter3] || '', r[idxAfter4] || ''].filter(Boolean);
      const selfie = r[idxFotoSelfie] || '';

      // Skip visits with zero photos
      if (beforeList.length === 0 && afterList.length === 0 && !selfie) continue;

      const kodeToko = (r[idxKodeToko] || '').toUpperCase().trim();
      let tipeToko = r[idxTipeToko] || '';
      if (!tipeToko && kodeToko && masterMap.has(kodeToko)) {
        tipeToko = masterMap.get(kodeToko);
      }

      visits.push({
        idVisit: idVisit,
        time: r[idxTime] || '',
        date: r[idxDate] || '',
        hariKe: r[idxHariKe] || '',
        kodeCrew: r[idxKodeCrew] || '',
        namaCrew: r[idxNamaCrew] || '',
        account: this.normalizeAccount(r[idxAccount]),
        kodeToko: kodeToko,
        namaToko: r[idxNamaToko] || '',
        tipeToko: tipeToko,
        fotoSelfie: selfie,
        fotoBefore: beforeList,
        fotoAfter: afterList,
        modul: defaultModul,
        prefix: defaultModul.substring(0, 2)
      });
    }
    return visits;
  },

  /**
   * 2. Get All Planogram Reviews from Supabase Cloud (Instant Sub-100ms) with Sheet Fallback
   */
  async getReviews() {
    // A. Priority 1: Supabase Cloud Database
    if (CONFIG.USE_SUPABASE && CONFIG.SUPABASE_URL) {
      try {
        const data = await this.fetchFromSupabase('tbl_penilaian_display', {
          select: '*',
          order: 'updated_at.desc',
          limit: 10000
        });

        if (Array.isArray(data)) {
          return data.map(r => ({
            timestamp: r.updated_at || r.created_at || '',
            idVisit: String(r.id_visit || '').trim(),
            tanggal: r.tanggal || '',
            modul: r.modul || '',
            account: this.normalizeAccount(r.account),
            kodeToko: r.kode_toko || '',
            namaToko: r.nama_toko || '',
            tipeFoto: (r.tipe_foto || 'BEFORE').toUpperCase().trim(),
            urlFoto: r.url_foto || '',
            skorPlanogram: parseInt(r.skor_planogram, 10) === 1 ? 1 : 0,
            ceklisPricetag: Boolean(r.ceklis_pricetag),
            ceklisPosm: Boolean(r.ceklis_posm),
            reviewer: r.reviewer || '',
            catatan: r.catatan || ''
          }));
        }
      } catch (err) {
        console.warn('Supabase getReviews fallback to sheet:', err);
      }
    }

    // B. Priority 2: Google Spreadsheet Fallback
    try {
      const url = `https://docs.google.com/spreadsheets/d/${CONFIG.REVIEW_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${CONFIG.REVIEW_SHEET_NAME}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const text = await res.text();
      const rows = this.parseCsv(text);
      if (rows.length <= 1) return [];

      const reviews = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r[1]) continue;
        reviews.push({
          timestamp: r[0] || '',
          idVisit: String(r[1]).trim(),
          tanggal: r[2] || '',
          modul: r[3] || '',
          account: this.normalizeAccount(r[4]),
          kodeToko: r[5] || '',
          namaToko: r[6] || '',
          tipeFoto: (r[7] || 'BEFORE').toUpperCase().trim(),
          urlFoto: r[8] || '',
          skorPlanogram: parseInt(r[9], 10) === 1 ? 1 : 0,
          ceklisPricetag: String(r[10] || '').toUpperCase() === 'YA',
          ceklisPosm: String(r[11] || '').toUpperCase() === 'YA',
          reviewer: r[12] || '',
          catatan: r[13] || ''
        });
      }
      return reviews;
    } catch (e) {
      console.warn('Gagal membaca data review:', e);
      return [];
    }
  },

  /**
   * 3. Submit / Save Review Directly to Supabase Cloud Database (Sub-100ms Realtime Upsert)
   */
  async saveReview(reviewData) {
    const idReview = `${reviewData.idVisit}_${reviewData.tipeFoto}`;
    const payload = [{
      id_review: idReview,
      id_visit: String(reviewData.idVisit || '').trim(),
      tanggal: reviewData.tanggal || null,
      modul: reviewData.modul || '',
      account: reviewData.account || '',
      kode_toko: reviewData.kodeToko || '',
      nama_toko: reviewData.namaToko || '',
      tipe_foto: reviewData.tipeFoto,
      url_foto: reviewData.urlFoto || '',
      skor_planogram: parseInt(reviewData.skorPlanogram, 10) === 1 ? 1 : 0,
      ceklis_pricetag: reviewData.ceklisPricetag === 'YA' || reviewData.ceklisPricetag === true,
      ceklis_posm: reviewData.ceklisPosm === 'YA' || reviewData.ceklisPosm === true,
      reviewer: reviewData.reviewer || 'SPV',
      catatan: reviewData.catatan || '',
      updated_at: new Date().toISOString()
    }];

    const url = new URL(`${CONFIG.SUPABASE_URL}/tbl_penilaian_display`);
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'apikey': CONFIG.SUPABASE_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Supabase saveReview error:', errText);
      throw new Error(`Gagal simpan ke Supabase (${res.status}): ${errText}`);
    }

    return { status: 'success', data: await res.json() };
  }
};

window.ApiService = ApiService;
