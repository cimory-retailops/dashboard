/**
 * ==============================================================================
 * CIMORY RETAIL OPS - MASTER TOKO NASIONAL DATA LOADER
 * Loads & cleans 32,700+ master stores from master_toko_nasional.csv
 * Supports Alfamart, Indomaret, Alfamidi, Circle K, Family Mart, Supermarket, etc.
 * ==============================================================================
 */

const StoreService = {
  stores: [],
  isLoaded: false,

  async loadMasterStores() {
    if (this.isLoaded && this.stores.length > 0) return this.stores;

    try {
      const csvPath = 'data/master_toko_nasional.csv';
      const resp = await fetch(csvPath);
      if (!resp.ok) {
        console.warn(`[StoreService] Could not load ${csvPath}, falling back to list_toko.csv`);
        return this.loadFallbackStores();
      }
      const csvText = await resp.text();

      return new Promise((resolve) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsed = [];
            (results.data || []).forEach((row, idx) => {
              const code = String(row['Store Code'] || row['store_code'] || '').trim();
              const name = String(row['Nama Toko'] || row['store_name'] || '').trim();
              const dcName = String(row['DC Name'] || row['branch_name'] || '').trim();
              const dcCode = String(row['DC Code'] || row['branch_code'] || '').trim();
              const tipe = String(row['Tipe'] || row['tipe_toko'] || '').trim().toUpperCase();
              const kec = String(row['Kecamatan'] || '').trim();
              const kabKota = String(row['Kab/Kota'] || '').trim();

              // Clean Lat/Lng (handle comma as decimal separator)
              let rawLat = String(row['Latitude'] || row['latitude'] || '').replace(',', '.').trim();
              let rawLng = String(row['Longitude'] || row['longitude'] || '').replace(',', '.').trim();
              const lat = parseFloat(rawLat);
              const lng = parseFloat(rawLng);

              if (name && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                // Determine Account
                let account = tipe || 'OTHER';
                const upperName = name.toUpperCase();

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

                // Check if Real DC / Warehouse (Must strictly be a Distribution Center, not a store with a DC code in brackets)
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

                parsed.push({
                  id: code || `STORE_${idx + 1}`,
                  storeCode: code,
                  storeName: name,
                  branchName: dcName,
                  branchCode: dcCode,
                  tipeToko: tipe,
                  account: account,
                  kecamatan: kec,
                  kabKota: kabKota,
                  isDc: isDc,
                  lat: lat,
                  lng: lng
                });
              }
            });

            this.stores = parsed;
            this.isLoaded = true;
            console.log(`[StoreService] Loaded ${this.stores.length} valid geocoded master stores from Master Toko Nasional`);
            resolve(this.stores);
          },
          error: (err) => {
            console.error('[StoreService] CSV Parse Error:', err);
            resolve([]);
          }
        });
      });
    } catch (e) {
      console.warn('[StoreService] Failed to load Master Toko Nasional, fallback to list_toko.csv:', e);
      return this.loadFallbackStores();
    }
  },

  async loadFallbackStores() {
    try {
      const resp = await fetch('../01_web_absen/list_toko.csv');
      const csvText = await resp.text();
      return new Promise((resolve) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsed = [];
            (results.data || []).forEach((row, idx) => {
              const code = String(row.store_code || '').trim();
              const name = String(row.store_name || '').trim();
              const branch = String(row.branch_name || '').trim();
              const lat = parseFloat(row.latitude);
              const lng = parseFloat(row.longitude);

              if (name && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                parsed.push({
                  id: code || `STORE_${idx + 1}`,
                  storeCode: code,
                  storeName: name,
                  branchName: branch,
                  branchCode: String(row.branch_code || '').trim(),
                  account: 'ALFAMART / INDOMARET',
                  isDc: false,
                  lat: lat,
                  lng: lng
                });
              }
            });
            this.stores = parsed;
            this.isLoaded = true;
            resolve(this.stores);
          }
        });
      });
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
