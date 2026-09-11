/**
 * ==============================================================================
 * CIMORY RETAIL OPS - MASTER TOKO NASIONAL DATA LOADER & CLOUD SYNC ENGINE
 * ==============================================================================
 * 1. Persistent IndexedDB Caching (> 32.000 Toko): Loads in < 150ms on startup.
 * 2. Live Cloud Sync: Direct download from Google Sheets Master Database.
 * 3. Fallback Mechanism: Local CSV backup for offline / zero-network scenarios.
 * ==============================================================================
 */

const StoreService = {
  stores: [],
  isLoaded: false,
  syncMeta: null,

  /**
   * Main entry point to load master stores.
   * Prioritizes instant IndexedDB cache, fallback to local CSV, supports live sync.
   */
  async loadMasterStores(forceSync = false, onProgress = null) {
    if (!forceSync && this.isLoaded && this.stores.length > 0) {
      return this.stores;
    }

    // 1. Try restoring from IndexedDB if not forcing sync
    if (!forceSync && typeof SimulasiDB !== 'undefined') {
      try {
        const cached = await SimulasiDB.get('master_stores');
        if (cached && Array.isArray(cached.data) && cached.data.length > 100) {
          this.stores = cached.data;
          this.syncMeta = cached.meta || {};
          this.isLoaded = true;
          console.log(`[StoreService] 🚀 Loaded ${this.stores.length} stores instantly from IndexedDB cache! (Sync Date: ${this.syncMeta.dateString || '-'})`);
          return this.stores;
        }
      } catch (err) {
        console.warn('[StoreService] IndexedDB read error, proceeding to load from source:', err);
      }
    }

    // 2. If forceSync is requested, sync directly from Google Sheet
    if (forceSync) {
      return this.syncFromGoogleSheet(onProgress);
    }

    // 3. First time run without IndexedDB: Try Google Sheet first, fallback to local CSV
    try {
      if (onProgress) onProgress('Memuat master toko (Google Sheets / Local CSV)...');
      return await this.syncFromGoogleSheet(onProgress);
    } catch (sheetErr) {
      console.warn('[StoreService] Initial Google Sheet sync failed, trying local CSV fallback:', sheetErr);
      return await this.loadLocalCsvStores(onProgress);
    }
  },

  /**
   * Live Sync directly from Google Sheets Master Toko
   */
  async syncFromGoogleSheet(onProgress = null) {
    const config = window.SIMULATION_CONFIG?.DATA_SOURCE || {};
    const sheetUrl = config.GOOGLE_SHEET_CSV_URL || 'https://docs.google.com/spreadsheets/d/16cokFfnQFIajmTd553TKy-CfkNFc1Gg7ElkhAer81QA/export?format=csv&gid=1970488135';
    const gvizUrl = config.GOOGLE_SHEET_GVIZ_URL || 'https://docs.google.com/spreadsheets/d/16cokFfnQFIajmTd553TKy-CfkNFc1Gg7ElkhAer81QA/gviz/tq?tqx=out:csv&sheet=master_toko';

    if (onProgress) onProgress('Mengunduh Master Toko dari Google Sheets...');

    let csvText = '';
    let usedSource = 'GOOGLE_SHEETS_EXPORT';

    // Attempt 1: Direct CSV Export URL
    try {
      const resp = await fetch(sheetUrl, { cache: 'no-store' });
      if (resp.ok) {
        csvText = await resp.text();
      }
    } catch (e) {
      console.warn('[StoreService] Direct CSV export failed, trying GVIZ API...', e);
    }

    // Attempt 2: GVIZ Endpoint
    if (!csvText || csvText.length < 500) {
      try {
        const resp2 = await fetch(gvizUrl, { cache: 'no-store' });
        if (resp2.ok) {
          csvText = await resp2.text();
          usedSource = 'GOOGLE_SHEETS_GVIZ';
        }
      } catch (e2) {
        console.warn('[StoreService] GVIZ API failed:', e2);
      }
    }

    // Attempt 3: Fallback to local CSV if network / CORS failed
    if (!csvText || csvText.length < 500) {
      console.warn('[StoreService] Cloud fetch failed. Falling back to local CSV...');
      return this.loadLocalCsvStores(onProgress);
    }

    if (onProgress) onProgress('Mem-parsing data toko & koordinat GPS...');
    const parsedStores = await this.parseStoresCsv(csvText);

    if (parsedStores.length < 10) {
      throw new Error('Hasil unduhan Google Sheet tidak memiliki data toko yang valid.');
    }

    this.stores = parsedStores;
    this.isLoaded = true;
    this.syncMeta = {
      source: usedSource,
      timestamp: Date.now(),
      dateString: new Date().toLocaleString('id-ID'),
      count: parsedStores.length
    };

    // Persist to IndexedDB
    if (typeof SimulasiDB !== 'undefined') {
      if (onProgress) onProgress(`Menyimpan ${parsedStores.length} toko ke IndexedDB...`);
      await SimulasiDB.set('master_stores', parsedStores, this.syncMeta);
    }

    console.log(`[StoreService] ✅ Live Sync Google Sheets Berhasil: ${parsedStores.length} toko.`);
    return this.stores;
  },

  /**
   * Load stores from local CSV file (data/master_toko_nasional.csv)
   */
  async loadLocalCsvStores(onProgress = null) {
    if (onProgress) onProgress('Membaca file data/master_toko_nasional.csv...');

    const localPath = window.SIMULATION_CONFIG?.DATA_SOURCE?.FALLBACK_LOCAL_CSV || 'data/master_toko_nasional.csv';
    let csvText = '';

    try {
      const resp = await fetch(localPath);
      if (resp.ok) {
        csvText = await resp.text();
      }
    } catch (e) {
      console.warn('[StoreService] Failed to fetch local master_toko_nasional.csv:', e);
    }

    if (!csvText || csvText.length < 500) {
      return this.loadFallbackLegacyStores();
    }

    if (onProgress) onProgress('Memproses data toko nasional...');
    const parsedStores = await this.parseStoresCsv(csvText);

    this.stores = parsedStores;
    this.isLoaded = true;
    this.syncMeta = {
      source: 'LOCAL_CSV',
      timestamp: Date.now(),
      dateString: new Date().toLocaleString('id-ID'),
      count: parsedStores.length
    };

    // Persist to IndexedDB
    if (typeof SimulasiDB !== 'undefined') {
      await SimulasiDB.set('master_stores', parsedStores, this.syncMeta);
    }

    return this.stores;
  },

  /**
   * Helper: Robust Papa.parse with flexible column detection & GPS cleaning
   */
  parseStoresCsv(csvText) {
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsed = [];
          (results.data || []).forEach((row, idx) => {
            const code = String(
              row['Store Code'] || row['store_code'] || row['Kode Toko'] || row['kode_toko'] || row['KODE TOKO'] || ''
            ).trim();

            const name = String(
              row['Nama Toko'] || row['store_name'] || row['NAMA TOKO'] || row['nama_toko'] || row['Nama'] || ''
            ).trim();

            const dcName = String(
              row['DC Name'] || row['branch_name'] || row['NAMA DC'] || row['Branch Name'] || row['DC'] || ''
            ).trim();

            const dcCode = String(
              row['DC Code'] || row['branch_code'] || row['KODE DC'] || row['Branch Code'] || ''
            ).trim();

            const tipe = String(
              row['Tipe'] || row['tipe_toko'] || row['TIPE'] || row['Type'] || row['Account'] || row['ACCOUNT'] || ''
            ).trim().toUpperCase();

            const kec = String(
              row['Kecamatan'] || row['kecamatan'] || row['KECAMATAN'] || ''
            ).trim();

            const kabKota = String(
              row['Kab/Kota'] || row['kab_kota'] || row['Kota'] || row['KAB/KOTA'] || row['KABUPATEN/KOTA'] || row['Wilayah'] || ''
            ).trim();

            // Clean Lat/Lng (handle comma as decimal separator)
            let rawLat = String(
              row['Latitude'] || row['latitude'] || row['LATITUDE'] || row['Lat'] || row['lat'] || ''
            ).replace(',', '.').trim();

            let rawLng = String(
              row['Longitude'] || row['longitude'] || row['LONGITUDE'] || row['Long'] || row['lng'] || row['lon'] || ''
            ).replace(',', '.').trim();

            let lat = parseFloat(rawLat);
            let lng = parseFloat(rawLng);
            let cleanKabKota = kabKota;
            let cleanKec = kec;

            const upperName = name.toUpperCase();
            const upperDc = dcName.toUpperCase();

            // Auto-fix known coordinate mismatches / corruptions in master data
            if (upperName.includes('UJUNG BERUNG') || upperName.includes('UJUNGBERUNG')) {
              if (upperDc.includes('BANDUNG') || upperName.includes('61') || cleanKabKota.toUpperCase().includes('TANGERANG')) {
                lat = -6.91371;
                lng = 107.69595;
                cleanKabKota = 'Kota Bandung';
                cleanKec = 'Cinambo';
              }
            }

            if (name && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
              // Determine Account
              let account = tipe || 'OTHER';

              if (!account || account === 'OTHER' || account === 'TIPE') {
                if (upperName.includes('ALFAMART') || upperName.includes('SAT ') || upperName.includes('[SAT')) {
                  account = 'ALFAMART';
                } else if (upperName.includes('INDOMARET') || upperName.includes('IDM ') || upperName.includes('[IDM')) {
                  account = 'INDOMARET';
                } else if (upperName.includes('ALFAMIDI') || upperName.includes('MIDI')) {
                  account = 'ALFAMIDI';
                } else if (upperName.includes('FAMILY MART') || upperName.includes('FM ')) {
                  account = 'FAMILY MART';
                } else if (upperName.includes('CIRCLE K') || upperName.includes('CK ')) {
                  account = 'CIRCLE K';
                } else if (upperName.includes('SUPERINDO') || upperName.includes('HYPERMART') || upperName.includes('HERO') || upperName.includes('TRANSMART')) {
                  account = 'SUPERMARKET';
                }
              }

              // Check if Real DC / Warehouse
              const isDc = (
                upperName.startsWith('DC ') || 
                upperName.startsWith('DC.') || 
                upperName.startsWith('DC-') ||
                upperName.includes('DC SAT') || 
                upperName.includes('DC INDOMARET') || 
                upperName.includes('DC ALFAMART') ||
                upperName.includes('DISTRIBUTION CENTER') || 
                upperName.startsWith('GUDANG DC') ||
                tipe === 'DC' || 
                tipe === 'DISTRIBUTION CENTER'
              );

              const uniqueStoreId = code ? `${code}_${account}_${idx + 1}` : `STORE_${idx + 1}`;

              parsed.push({
                id: uniqueStoreId,
                storeCode: code,
                storeName: name,
                branchName: dcName,
                branchCode: dcCode,
                tipeToko: tipe,
                account: account,
                kecamatan: cleanKec,
                kabKota: cleanKabKota,
                isDc: isDc,
                lat: lat,
                lng: lng
              });
            }
          });

          resolve(parsed);
        },
        error: (err) => {
          console.error('[StoreService] CSV Parse Error:', err);
          resolve([]);
        }
      });
    });
  },

  /**
   * Fallback for minimal offline testing
   */
  async loadFallbackLegacyStores() {
    try {
      const resp = await fetch('../01_web_absen/list_toko.csv');
      const csvText = await resp.text();
      const parsedStores = await this.parseStoresCsv(csvText);
      this.stores = parsedStores;
      this.isLoaded = true;
      return parsedStores;
    } catch (err) {
      this.stores = [];
      this.isLoaded = true;
      return [];
    }
  }
};

if (typeof window !== 'undefined') {
  window.StoreService = StoreService;
}
