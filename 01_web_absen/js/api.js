/**
 * API & SYNC SERVICE - GOOGLE SHEETS & GAS COMMUNICATOR
 */

const API_CONFIG = {
  // URL Default Spreadsheet Master 34k/49k Toko & Crew
  MASTER_SHEET_ID: "16cokFfnQFIajmTd553TKy-CfkNFc1Gg7ElkhAer81QA",
  MASTER_STORE_GID: "1970488135", // GID Tab master_toko (49.469+ Seluruh Toko Lengkap)
  CENTRAL_ID: "1XqZgR70C1eqfkkKbM9jO2FhSi6-g3I9AskuhsSh7Mzs",
  MODUL_IDS: {
    "DK1": "1asDdjDm0kUfFmICLtkhJ5VBhmKUels2c-H8Cd22qYvk",
    "DK2": "14d0LUW73TveimrVC5QZ5Aq8fanWFTa-endNTq5UgxU0",
    "DK3": "1PyP2gDOltePqcadtcOzncjb8vYpqlYcUu31N_JYu_gQ",
    "DK4": "1jiN7bi-Uc104X5Ug2p2hYlI163h-ycQ8hEqHyt4zoKw",
    "DK5": "1QWf1cG5byneFDGmy_m2eUe_aUUUtztBc8ERgfGjjmb4",
    "DK6": "1VV6E_MuBUNgQMopvTezXDRlHpa6Z1fKfHOlew--cPBY",
    "LK1": "1LdoLka5rw1m8fuhOhYqvs6v0hgbY766sdlVj_JcMrb4",
    "LK2": "1LjRvlTow7wcLDJHipCw-H2mdn5Wh7YuwBf7Ab5kN1BM",
    "LK3": "1EuxP8f8D4Vya5kdN1_0QVCDP1dPvAkrMKErnRCO4jJM",
    "LK4": "1GRuXwLgO_zsuW6Ai49h9w1QTFxM_TQVxBs6xWKpqEhY",
    "LK5": "1GyTFOp8siIXfLpUmEv935hZ0976-fXqXgiwz5Juq92A",
    "LP1": "1356ZShL_ZQaO0pwI7msWcQmINpyKCxhizMzt8c5cKpo",
    "LP2": "1Dy6Zb6e9eWLOuLcWaUiKYWpIuv2mpz-leGJwiJu20Ss",
    "LP3": "1S__W_tKymV2xwqx_-vthpPt5jn5u7t3ePlgPqM1opMM",
    "LP4": "1kUWJIQxtSkjebZMualR2bIV6HyGxp-baDVz1s-7KspU"
  },
  
  // URL Google Apps Script Web App Default (Central Multi-Module Backend)
  DEFAULT_GAS_URL: "https://script.google.com/macros/s/AKfycbzDkLr0LfbHSiIgBOVO40ktn8c7Doc8jvI7zTPv-EVsNzr9fci42TzP7JSXxXp6lzGV/exec",
  
  // Supabase Cloud REST API Config (Instant Sub-50ms Query)
  SUPABASE_URL: "https://lzvxxcnubtcvdiwfnjmh.supabase.co/rest/v1",
  SUPABASE_KEY: "sb_publishable_Yrqw13m5rQQKNF0XnWtlOg_JvZZ2_AE",
  USE_SUPABASE: true,

  getGasUrl: () => {
    const custom = localStorage.getItem("mds_gas_api_url");
    if (custom && custom.includes("AKfycby1QQCwXusMhaEtm79iVISFjrZ3H6RxGOTi3vTXcYF-Xvv9SOk-X4HkugRUEe1E2-pZHQ")) {
      localStorage.removeItem("mds_gas_api_url");
    }
    return localStorage.getItem("mds_gas_api_url") || API_CONFIG.DEFAULT_GAS_URL;
  },
  setGasUrl: (url) => localStorage.setItem("mds_gas_api_url", url.trim())
};

/**
 * Supabase Cloud REST API Fetcher dengan Batch Pagination Otomatis
 */
async function fetchFromSupabase(table, queryParams = {}) {
  try {
    const requestedLimit = parseInt(queryParams.limit || '1000', 10);
    if (requestedLimit <= 1000) {
      const url = new URL(`${API_CONFIG.SUPABASE_URL}/${table}`);
      Object.entries(queryParams).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          url.searchParams.append(k, String(v));
        }
      });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url.toString(), {
        headers: {
          'apikey': API_CONFIG.SUPABASE_KEY,
          'Authorization': `Bearer ${API_CONFIG.SUPABASE_KEY}`
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) return await res.json();
      return null;
    }

    const numBatches = Math.min(Math.ceil(requestedLimit / 1000), 25);
    const batchPromises = [];
    for (let i = 0; i < numBatches; i++) {
      batchPromises.push((async () => {
        const url = new URL(`${API_CONFIG.SUPABASE_URL}/${table}`);
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
            'apikey': API_CONFIG.SUPABASE_KEY,
            'Authorization': `Bearer ${API_CONFIG.SUPABASE_KEY}`
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
}

/**
 * Supabase Direct INSERT / UPSERT (Instant Cloud Write < 100ms)
 */
async function insertToSupabase(table, records = []) {
  if (!API_CONFIG.USE_SUPABASE || !API_CONFIG.SUPABASE_URL || !records.length) return null;
  try {
    const url = new URL(`${API_CONFIG.SUPABASE_URL}/${table}`);
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'apikey': API_CONFIG.SUPABASE_KEY,
        'Authorization': `Bearer ${API_CONFIG.SUPABASE_KEY}`,
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
}

/**
 * Supabase Direct DELETE (Instant Cloud Delete < 100ms)
 */
async function deleteFromSupabase(table, filters = {}) {
  if (!API_CONFIG.USE_SUPABASE || !API_CONFIG.SUPABASE_URL) return null;
  try {
    const url = new URL(`${API_CONFIG.SUPABASE_URL}/${table}`);
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.append(k, String(v));
      }
    });
    const res = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        'apikey': API_CONFIG.SUPABASE_KEY,
        'Authorization': `Bearer ${API_CONFIG.SUPABASE_KEY}`,
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
}

/**
 * Supabase Direct PATCH (Instant Cloud Update < 100ms)
 */
async function patchSupabase(table, filters = {}, data = {}) {
  if (!API_CONFIG.USE_SUPABASE || !API_CONFIG.SUPABASE_URL) return null;
  try {
    const url = new URL(`${API_CONFIG.SUPABASE_URL}/${table}`);
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.append(k, String(v));
      }
    });
    const res = await fetch(url.toString(), {
      method: 'PATCH',
      headers: {
        'apikey': API_CONFIG.SUPABASE_KEY,
        'Authorization': `Bearer ${API_CONFIG.SUPABASE_KEY}`,
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
}

/**
 * Fast & Safe CSV Stream Parser
 * Mengurai ribuan baris CSV Google Sheet dengan cepat
 */
function parseCSV(text) {
  const lines = text.split(/\r\n|\n/);
  const result = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row = [];
    let insideQuotes = false;
    let cell = "";

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        if (insideQuotes && line[c + 1] === '"') {
          cell += '"';
          c++; // skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        row.push(cell.trim());
        cell = "";
      } else {
        cell += char;
      }
    }
    row.push(cell.trim());
    result.push(row);
  }
  return result;
}

/**
 * Sinkronisasi Master Toko 49.000+ dari Google Spreadsheet
 */
async function syncMasterStoresFromSheet(onProgress) {
  // Unduh langsung dengan direct GID export (49.469+ toko lengkap)
  let url = `https://docs.google.com/spreadsheets/d/${API_CONFIG.MASTER_SHEET_ID}/export?format=csv&gid=${API_CONFIG.MASTER_STORE_GID}`;
  
  if (onProgress) onProgress("Mengunduh 49.000+ data toko & GPS...", 20);
  await new Promise(r => setTimeout(r, 40));
  
  let response = await fetch(url);
  if (!response.ok) {
    url = `https://docs.google.com/spreadsheets/d/${API_CONFIG.MASTER_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=master_toko`;
    response = await fetch(url);
  }
  if (!response.ok) {
    throw new Error(`Gagal mengunduh spreadsheet: status ${response.status}`);
  }

  if (onProgress) onProgress("Memproses baris CSV & koordinat GPS...", 55);
  await new Promise(r => setTimeout(r, 40));

  const csvText = await response.text();
  const rows = parseCSV(csvText);

  if (rows.length < 2) {
    throw new Error("Data spreadsheet kosong atau format tidak sesuai");
  }

  // Standar index kolom default (0:Code, 1:DcCode, 2:DcName, 3:StoreName, 4:Kec, 5:Kota, 6:PostCode, 7:Lat, 8:Lon, 9:Account)
  let codeIdx = 0;
  let dcIdx = 2;
  let nameIdx = 3;
  let kecIdx = 4;
  let kotaIdx = 5;
  let latIdx = 7;
  let lonIdx = 8;
  let typeIdx = 9;
  let provIdx = -1;
  let crewIdx = -1;

  // Deteksi jika baris pertama memiliki header yang valid
  if (rows[0] && rows[0].length >= 8) {
    const headers = rows[0].map(h => (h || "").toString().toLowerCase().replace(/[^a-z0-9]/g, ""));
    const foundCode = headers.findIndex(h => h.includes("storecode") || h.includes("kodetoko") || h === "code");
    const foundName = headers.findIndex(h => h.includes("namatoko") || h.includes("storename"));
    const foundType = headers.findIndex(h => h.includes("tipe") || h.includes("account") || h.includes("type"));
    const foundDc = headers.findIndex(h => h.includes("dcname") || h.includes("dc"));
    const foundKec = headers.findIndex(h => h.includes("kecamatan"));
    const foundKota = headers.findIndex(h => h.includes("kabkota") || h.includes("kota"));
    const foundLat = headers.findIndex(h => h.includes("latitude") || h === "lat");
    const foundLon = headers.findIndex(h => h.includes("longitude") || h.includes("long") || h === "lon" || h === "lng");
    const foundProv = headers.findIndex(h => h.includes("provinsi") || h.includes("province"));
    const foundCrew = headers.findIndex(h => h.includes("crew") || h.includes("mds") || h.includes("namacrew") || h.includes("kodecrew"));

    if (foundCode >= 0) codeIdx = foundCode;
    if (foundName >= 0) nameIdx = foundName;
    if (foundType >= 0) typeIdx = foundType;
    if (foundDc >= 0) dcIdx = foundDc;
    if (foundKec >= 0) kecIdx = foundKec;
    if (foundKota >= 0) kotaIdx = foundKota;
    if (foundLat >= 0) latIdx = foundLat;
    if (foundLon >= 0) lonIdx = foundLon;
    if (foundProv >= 0) provIdx = foundProv;
    if (foundCrew >= 0) crewIdx = foundCrew;
  }

  const storeMap = new Map(); // key: kodeToko_account
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 4) continue;

    const kode = (row[codeIdx] || row[0] || "").toString().trim().toUpperCase();
    const nama = (row[nameIdx] || row[3] || "").toString().trim();

    // Skip baris header / sampah teks
    if (!kode || kode === "STORE CODE" || kode.includes(" ") || nama.length < 2) continue;

    const latRaw = row[latIdx] || row[7];
    const lonRaw = row[lonIdx] || row[8];
    const lat = latRaw ? parseFloat(latRaw.toString().replace(",", ".")) : null;
    const lon = lonRaw ? parseFloat(lonRaw.toString().replace(",", ".")) : null;

    const storeObj = {
      kodeToko: kode,
      namaToko: nama,
      account: (row[typeIdx] || row[9] || "ALFAMART").toString().trim().toUpperCase(),
      dcName: (row[dcIdx] || row[2] || "").toString().trim(),
      kecamatan: (row[kecIdx] || row[4] || "").toString().trim(),
      kota: (row[kotaIdx] || row[5] || "").toString().trim(),
      provinsi: provIdx >= 0 && row[provIdx] ? row[provIdx].toString().trim() : "",
      crew: crewIdx >= 0 && row[crewIdx] ? row[crewIdx].toString().trim() : "",
      lat: !isNaN(lat) && lat !== null && lat !== 0 ? lat : null,
      lon: !isNaN(lon) && lon !== null && lon !== 0 ? lon : null
    };

    // De-duplikasi cerdas dengan Composite Key (Kode Toko + Akun):
    const uniqueKey = `${kode}_${storeObj.account}`;
    if (storeMap.has(uniqueKey)) {
      const existing = storeMap.get(uniqueKey);
      // Jika yang lama belum punya GPS tapi baris ini punya, update dengan yang punya GPS
      if ((!existing.lat || !existing.lon) && (storeObj.lat && storeObj.lon)) {
        storeMap.set(uniqueKey, storeObj);
      }
    } else {
      storeMap.set(uniqueKey, storeObj);
    }
  }

  const stores = Array.from(storeMap.values());

  if (onProgress) onProgress(`Menyimpan ${stores.length.toLocaleString()} toko ke memori HP...`, 85);
  await new Promise(r => setTimeout(r, 40));

  await saveStoresBatch(stores);

  if (onProgress) onProgress("Peta siap!", 100);
  await new Promise(r => setTimeout(r, 40));

  return stores.length;
}

/**
 * Sinkronisasi Master Crew dari Google Spreadsheet
 */
async function syncMasterCrewFromSheet() {
  const url = `https://docs.google.com/spreadsheets/d/${API_CONFIG.CENTRAL_ID}/gviz/tq?tqx=out:csv&sheet=master_user`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) return [];

    const csvText = await response.text();
    const rows = parseCSV(csvText);
    if (rows.length < 2) return [];

    const headers = rows[0].map(h => (h || "").toUpperCase().replace(/[\s_-]/g, ""));
    const findCol = (names, def) => {
      for (const n of names) {
        const idx = headers.indexOf(n);
        if (idx !== -1) return idx;
        const subIdx = headers.findIndex(h => h.includes(n));
        if (subIdx !== -1) return subIdx;
      }
      return def;
    };

    const idxId = findCol(["ID", "KODECREW", "NIK", "IDCREW"], 0);
    const idxNama = findCol(["NAMA", "NAMACREW", "CREWNAME"], 1);
    const idxJabatan = findCol(["JABATAN", "ROLE", "POSITION"], 2);
    const idxDivisi = findCol(["DIVISI", "DIVISION"], 3);
    const idxAccount = findCol(["ACCOUNT", "AKUN"], 4);
    const idxModul = findCol(["MODUL", "BRANCH", "WILAYAH"], 7);
    const idxNoWa = findCol(["NOWA", "WA", "NOHP", "TELP", "TELEPON", "PHONE", "NOMORWA"], -1);

    const crews = [];

    // 1. Ekstrak admin & management jika berada di baris atas/header spreadsheet
    const headerRowStr = rows[0] ? rows[0].join(" ") : "";
    if (headerRowStr.includes("Yohandi Pratama")) {
      crews.push({
        id: "RO036",
        nama: "Yohandi Pratama",
        modul: "LP4",
        account: "ALFAMART",
        jabatan: "Administrator & Merchandiser",
        noWa: ""
      });
    }

    // 2. Baris 1..N: Data Merchandiser Lapangan
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      const id = (row[idxId] || "").toString().trim();
      const nama = (row[idxNama] || "").toString().trim();
      const modul = (row[idxModul] || "").toString().trim().toUpperCase();
      const account = (row[idxAccount] || "").toString().trim().toUpperCase();
      const jabatan = (row[idxJabatan] || "").toString().trim();
      const noWa = idxNoWa !== -1 ? (row[idxNoWa] || "").toString().trim() : "";

      if (nama && id && !crews.some(c => c.id === id && c.nama.toLowerCase() === nama.toLowerCase() && c.modul === modul)) {
        crews.push({ id, nama, modul, account, jabatan, noWa });
      }
    }

    if (crews.length > 0) {
      await saveCrewList(crews);
    }
    return crews;
  } catch (err) {
    console.warn("Gagal sync master crew:", err);
    return [];
  }
}

/**
 * Mengirim Penginputan Rute ke Google Apps Script (GAS) Backend
 */
async function submitRouteAttendance({ module, crewCode, crewName, rute, stores, isEditMode = false }) {
  const gasUrl = API_CONFIG.getGasUrl();

  const payload = {
    action: "submit_route_schedule",
    module: module,
    crewCode: crewCode,
    crewName: crewName,
    rute: rute,
    stores: stores,
    isEditMode: isEditMode
  };

  console.group("🚀 [MDS SUBMIT ROUTE DEBUGGER]");
  console.log("📍 Target Endpoint GAS:", gasUrl);
  console.log("👤 Crew Profil:", { nama: crewName, id: crewCode, modul: module, rute: rute });
  console.log("📦 Total Toko Dikirim:", stores.length);
  console.log("📋 Data Payload Lengkap:", payload);

  // 0. FAST-PATH DIRECT SUPABASE DUAL-WRITE (< 100ms)
  try {
    if (API_CONFIG.USE_SUPABASE && API_CONFIG.SUPABASE_URL) {
      const cleanMod = String(module || '').toUpperCase().replace(/\s+/g, '');
      const cleanRute = String(rute || '1').trim().replace(/[^0-9]/g, '') || '1';
      const cleanCrewCode = String(crewCode || '').trim();
      const cleanCrewName = String(crewName || '').trim();

      // Hapus data rute lama kru ini di Supabase agar bersih (anti duplikat)
      if (cleanMod && cleanRute && (cleanCrewName || cleanCrewCode)) {
        const delFilter = {
          modul: `eq.${cleanMod}`,
          rute: `eq.${cleanRute}`
        };
        if (cleanCrewCode) delFilter.kode_crew = `eq.${cleanCrewCode}`;
        else if (cleanCrewName) delFilter.nama_crew = `eq.${cleanCrewName}`;
        await deleteFromSupabase('tbl_jadwal_rps', delFilter);
      }

      // Siapkan baris baru untuk Supabase
      const sbRows = stores.map(st => ({
        modul: cleanMod,
        account: String(st.account || 'ALFAMART').toUpperCase().trim(),
        kode_toko: String(st.kodeToko || st.kode || '').toUpperCase().trim(),
        nama_toko: String(st.namaToko || st.nama || '').trim(),
        kode_crew: cleanCrewCode,
        nama_crew: cleanCrewName,
        rute: cleanRute,
        tipe_toko: ''
      })).filter(r => r.kode_toko);

      if (sbRows.length > 0) {
        await insertToSupabase('tbl_jadwal_rps', sbRows);
        console.log(`⚡ [Supabase] Tersimpan instan ${sbRows.length} toko ke tbl_jadwal_rps (Modul: ${cleanMod}, Rute: ${cleanRute})`);
      }
    }
  } catch (sbErr) {
    console.warn('⚠️ Fast-path Supabase rute sync warning:', sbErr);
  }

  if (gasUrl) {
    let resultData = null;
    try {
      console.log("⏳ Mengirim HTTP POST ke Google Apps Script...");
      // Kirim tanpa no-cors terlebih dahulu agar bisa membaca isi balasan status & error dari GAS
      let response;
      try {
        response = await fetch(gasUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify(payload)
        });
      } catch (corsErr) {
        console.warn("⚠️ Mode standar gagal/kena redirect CORS, mencoba fallback no-cors...", corsErr);
        response = await fetch(gasUrl, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify(payload)
        });
      }

      if (response && response.ok) {
        try {
          resultData = await response.json();
          console.log("✅ Balasan Backend (JSON):", resultData);
        } catch (jsonErr) {
          const rawText = await response.text();
          console.log("ℹ️ Balasan Backend (Raw Text):", rawText);
        }
      } else {
        console.log("ℹ️ Balasan Backend (Opaque / Status " + (response ? response.status : "unknown") + ")");
      }

      if (resultData && resultData.status === "error") {
        console.error("❌ BACKEND ERROR:", resultData.message);
        console.groupEnd();
        throw new Error(resultData.message || "Error tidak diketahui dari backend GAS");
      }

      // Simpan ke riwayat lokal
      await saveHistoryEntry({
        module,
        crewCode,
        crewName,
        rute,
        storeCount: stores.length,
        stores: stores,
        status: "Terkirim ke Cloud (GAS)"
      });

      console.log("🎉 Pengiriman sukses tercatat!");
      console.groupEnd();

      try {
        const bc = new BroadcastChannel('mds_sync_channel');
        bc.postMessage({
          type: 'SCHEDULE_SUBMITTED',
          modul: module,
          rute: rute,
          crewCode: crewCode,
          timestamp: Date.now()
        });
        bc.close();
      } catch (e) {}

      const successMsg = (resultData && resultData.data && resultData.data.message) 
        ? resultData.data.message 
        : `Data ${stores.length} toko berhasil dikirim ke modul ${module} (Rute ${rute})!`;

      return {
        success: true,
        data: resultData,
        message: successMsg
      };
    } catch (err) {
      console.error("❌ GAGAL KIRIM KE GAS:", err);
      console.groupEnd();
      throw new Error(`Gagal mengirim ke Google Spreadsheet: ${err.message}`);
    }
  } else {
    console.warn("⚠️ URL GAS belum dipasang. Menyimpan ke IndexedDB lokal saja.");
    console.groupEnd();
    await saveHistoryEntry({
      module,
      crewCode,
      crewName,
      rute,
      storeCount: stores.length,
      stores: stores,
      status: "Tersimpan Lokal (Belum Pasang URL GAS)"
    });

    return {
      success: true,
      isLocal: true,
      message: `Jadwal ${stores.length} toko tersimpan di riwayat lokal!`
    };
  }
}

/**
 * Sinkronisasi Tambah / Edit Toko Manual Langsung ke Master Spreadsheet (GAS)
 */
async function syncCustomStoreToCloud(store) {
  const gasUrl = API_CONFIG.getGasUrl();
  if (!gasUrl) return { success: false, isOffline: true };

  const payload = {
    action: "save_custom_store",
    store: store
  };

  try {
    await fetch(gasUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return {
      success: true,
      message: `Toko ${store.namaToko} (${store.kodeToko}) disinkronkan ke Master Spreadsheet!`
    };
  } catch (err) {
    console.warn("Gagal sinkron toko ke Master Sheet:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Sinkronisasi Tambah / Edit Crew User ke Master Spreadsheet (Sheet: master_user)
 */
async function syncCrewToCloud(crew) {
  const gasUrl = API_CONFIG.getGasUrl();
  if (!gasUrl) return { success: false, isOffline: true };

  const payload = {
    action: "save_crew",
    crew: crew
  };

  try {
    await fetch(gasUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return {
      success: true,
      message: `Crew ${crew.nama} disinkronkan ke Master Spreadsheet!`
    };
  } catch (err) {
    console.warn("Gagal sinkron crew ke Master Sheet:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Mengambil Jadwal yang sudah terinput di Google Sheet (Direct Master_Toko CSV Stream + GAS Fallback)
 */
async function fetchSavedSchedule({ module, rute, crewCode, crewName }) {
  const normModule = (module || "").toUpperCase().replace(/[\s_-]/g, "");
  const targetRuteStr = String(rute || "").trim();
  const targetRuteNum = parseInt(targetRuteStr.replace(/[^0-9]/g, ""), 10);
  const targetCrewCode = (crewCode || "").toUpperCase().trim();
  const targetCrewName = (crewName || "").toUpperCase().trim();

  // 0. FAST PATH: SUPABASE REST API (< 50ms)
  if (API_CONFIG.USE_SUPABASE && API_CONFIG.SUPABASE_URL) {
    try {
      const query = {
        limit: 500,
        order: "kode_toko.asc"
      };
      if (normModule) {
        query.modul = normModule.length === 2 ? `like.${normModule}*` : `eq.${normModule}`;
      }
      if (targetRuteNum) {
        query.rute = `eq.${targetRuteNum}`;
      }
      if (targetCrewCode) {
        query.kode_crew = `eq.${targetCrewCode}`;
      }
      const data = await fetchFromSupabase("tbl_jadwal_rps", query);
      if (data && Array.isArray(data)) {
        return data.map(r => ({
          account: (r.account || "ALFAMART").toUpperCase(),
          kodeToko: r.kode_toko || "",
          namaToko: r.nama_toko || "",
          rute: r.rute || targetRuteNum || "1",
          kodeCrew: r.kode_crew || targetCrewCode,
          namaCrew: r.nama_crew || targetCrewName,
          tipeToko: r.tipe_toko || "-",
          alamat: "-",
          noTelp: "-",
          status: "AKTIF"
        }));
      }
    } catch (e) {
      console.warn("Supabase fetchSavedSchedule fallback ke Sheets:", e);
    }
  }

  // 1. Coba tarik langsung dari Google Spreadsheet Modul Cabang / Central (Master_Toko)
  const sheetIds = [];
  if (normModule && API_CONFIG.MODUL_IDS && API_CONFIG.MODUL_IDS[normModule]) {
    sheetIds.push(API_CONFIG.MODUL_IDS[normModule]);
  }
  if (API_CONFIG.CENTRAL_ID && !sheetIds.includes(API_CONFIG.CENTRAL_ID)) {
    sheetIds.push(API_CONFIG.CENTRAL_ID);
  }

  for (const sheetId of sheetIds) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Master_Toko`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        const rows = parseCSV(text);
        if (rows.length >= 2) {
          const headers = rows[0].map(h => (h || "").toUpperCase().replace(/[\s_-]/g, ""));
          
          const findCol = (names, def) => {
            for (const n of names) {
              const idx = headers.indexOf(n);
              if (idx !== -1) return idx;
              const subIdx = headers.findIndex(h => h.includes(n));
              if (subIdx !== -1) return subIdx;
            }
            return def;
          };

          const idxAccount = findCol(["ACCOUNT", "AKUN"], 0);
          const idxKode = findCol(["KODETOKO", "STORECODE", "KODE"], 1);
          const idxNama = findCol(["NAMATOKO", "STORENAME", "NAMA"], 2);
          const idxCrewCode = findCol(["KODECREW", "IDCREW", "CREWCODE", "NIK"], 3);
          const idxCrewName = findCol(["NAMACREW", "CREW", "CREWNAME"], 4);
          const idxRute = findCol(["RUTE", "ROUTE", "HARIKE", "HARI"], 5);
          const idxModul = findCol(["MODUL", "BRANCH", "WILAYAH"], -1);
          const idxLat = findCol(["LATITUDE", "LAT"], -1);
          const idxLon = findCol(["LONGITUDE", "LON", "LNG"], -1);
          const idxKec = findCol(["KECAMATAN", "KEC"], -1);
          const idxKota = findCol(["KOTA", "KABKOTA"], -1);

          const matched = [];
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 2) continue;

            const rowKode = (row[idxKode] || "").toString().trim().toUpperCase();
            const rowNama = (row[idxNama] || "").toString().trim();
            if (!rowKode && !rowNama) continue;

            const rowCrewCode = (row[idxCrewCode] || "").toString().trim().toUpperCase();
            const rowCrewName = (row[idxCrewName] || "").toString().trim().toUpperCase();
            const rowModul = (idxModul !== -1 && row[idxModul] ? row[idxModul] : normModule).toString().trim().toUpperCase();
            const rowRuteRaw = (row[idxRute] || "").toString().trim();

            // Filter Modul jika ada
            if (normModule && rowModul && !rowModul.includes(normModule) && !normModule.includes(rowModul)) {
              continue;
            }

            // Filter Crew jika ada (Cocokkan Kode ID maupun Nama secara presisi)
            if (targetCrewCode || targetCrewName) {
              const cleanTargetName = targetCrewName.replace(/[^A-Z0-9]/g, "");
              const cleanRowName = rowCrewName.replace(/[^A-Z0-9]/g, "");
              const cleanRowCode = rowCrewCode.replace(/[^A-Z0-9]/g, "");
              const cleanTargetCode = targetCrewCode.replace(/[^A-Z0-9]/g, "");

              let isMatch = false;

              // 1. Cocokkan ID jika keduanya ada
              if (cleanTargetCode && cleanRowCode) {
                if (cleanRowCode === cleanTargetCode || cleanRowCode.includes(cleanTargetCode) || cleanTargetCode.includes(cleanRowCode)) {
                  isMatch = true;
                }
              }

              // 2. Cocokkan Nama jika keduanya ada
              if (!isMatch && cleanTargetName && cleanRowName) {
                if (cleanRowName === cleanTargetName || cleanRowName.includes(cleanTargetName) || cleanTargetName.includes(cleanRowName)) {
                  isMatch = true;
                }
              }

              // 3. Cross check jika nama row tersimpan di kolom kode
              if (!isMatch && cleanTargetName && cleanRowCode) {
                if (cleanRowCode === cleanTargetName || cleanRowCode.includes(cleanTargetName)) {
                  isMatch = true;
                }
              }

              // 4. Cross check jika targetCode tersimpan di rowName
              if (!isMatch && cleanTargetCode && cleanRowName) {
                if (cleanRowName === cleanTargetCode || cleanRowName.includes(cleanTargetCode)) {
                  isMatch = true;
                }
              }

              if (!isMatch) continue;
            }

            // Filter Rute jika ada
            if (targetRuteStr) {
              const rowRuteNum = parseInt(rowRuteRaw.replace(/[^0-9]/g, ""), 10);
              const matchRute = (rowRuteRaw === targetRuteStr) ||
                                (rowRuteRaw.toUpperCase() === `RUTE ${targetRuteStr}`.toUpperCase()) ||
                                (rowRuteRaw.toUpperCase() === `R${targetRuteStr}`.toUpperCase()) ||
                                (!isNaN(targetRuteNum) && !isNaN(rowRuteNum) && targetRuteNum === rowRuteNum);
              if (!matchRute) continue;
            }

            const lat = idxLat !== -1 && row[idxLat] ? parseFloat(row[idxLat].toString().replace(",", ".")) : null;
            const lon = idxLon !== -1 && row[idxLon] ? parseFloat(row[idxLon].toString().replace(",", ".")) : null;

            matched.push({
              account: (row[idxAccount] || "ALFAMART").toString().trim().toUpperCase(),
              kodeToko: rowKode,
              namaToko: rowNama,
              kodeCrew: row[idxCrewCode] || crewCode,
              namaCrew: row[idxCrewName] || "",
              rute: rowRuteRaw || targetRuteStr,
              modul: rowModul,
              lat: !isNaN(lat) && lat !== 0 ? lat : null,
              lon: !isNaN(lon) && lon !== 0 ? lon : null,
              kecamatan: idxKec !== -1 && row[idxKec] ? row[idxKec].toString().trim() : "",
              kota: idxKota !== -1 && row[idxKota] ? row[idxKota].toString().trim() : "",
              source: 'Spreadsheet'
            });
          }

          if (matched.length > 0) {
            return matched;
          }
        }
      }
    } catch (e) {
      console.warn("Direct sheet schedule fetch failed:", e);
    }
  }

  // 2. Coba GAS API jika URL ada
  const gasUrl = API_CONFIG.getGasUrl();
  if (gasUrl) {
    try {
      let queryUrl = `${gasUrl}?action=get_schedule&module=${encodeURIComponent(module)}`;
      if (rute) queryUrl += `&rute=${encodeURIComponent(rute)}`;
      if (crewCode) queryUrl += `&crewCode=${encodeURIComponent(crewCode)}`;

      const response = await fetch(queryUrl);
      if (response.ok) {
        const result = await response.json();
        if (result.status === "success" && Array.isArray(result.data) && result.data.length > 0) {
          return result.data;
        }
      }
    } catch (err) {
      console.warn("GAS fetch schedule failed, fallback to local history:", err);
    }
  }

  // 3. Fallback: Ambil dari riwayat lokal
  const historyList = await getHistoryEntries(50);
  const matchedStores = [];

  historyList.forEach(hist => {
    if (hist.module === module && (!rute || hist.rute.toString() === rute.toString())) {
      (hist.stores || []).forEach(st => {
        matchedStores.push({
          account: st.account,
          kodeToko: st.kodeToko,
          namaToko: st.namaToko,
          kodeCrew: hist.crewCode,
          namaCrew: hist.crewName,
          rute: hist.rute,
          source: 'Lokal'
        });
      });
    }
  });

  return matchedStores;
}
/**
 * Ambil daftar toko yang sudah diklaim (dikover) oleh MDS manapun dari semua modul
 * Returns: Map { [kodeToko]: { namaCrew, kodeCrew, modul, rute } }
 */
async function fetchClaimedStores() {
  // 0. FAST PATH: SUPABASE REST API (< 100ms)
  if (API_CONFIG.USE_SUPABASE && API_CONFIG.SUPABASE_URL) {
    try {
      const data = await fetchFromSupabase("tbl_jadwal_rps", {
        select: "kode_toko,account,nama_crew,kode_crew,modul,rute",
        limit: 25000
      });
      if (data && Array.isArray(data) && data.length > 0) {
        const claimed = {};
        data.forEach(r => {
          const code = (r.kode_toko || "").trim().toUpperCase();
          if (!code) return;
          if (!claimed[code]) claimed[code] = [];
          claimed[code].push({
            kodeToko: code,
            namaCrew: r.nama_crew || "",
            kodeCrew: r.kode_crew || "",
            modul: r.modul || "",
            rute: r.rute || "1",
            account: (r.account || "").toUpperCase()
          });
        });
        return claimed;
      }
    } catch (e) {
      console.warn("Supabase fetchClaimedStores fallback ke GAS:", e);
    }
  }

  const gasUrl = API_CONFIG.getGasUrl();
  if (!gasUrl) return {};

  try {
    const queryUrl = `${gasUrl}?action=get_claimed_stores`;
    const response = await fetch(queryUrl);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

    const result = await response.json();
    if (result.status === "success") {
      return result.data || {};
    } else {
      throw new Error(result.message || "Gagal mengambil data klaim toko");
    }
  } catch (err) {
    console.warn("Gagal mengambil claimed stores dari GAS:", err.message);
    return {};
  }
}

/**
 * Hapus 1 Toko dari Jadwal di Google Spreadsheet (GAS)
 */
async function deleteScheduledStoreFromCloud({ module, modul, rute, crewCode, kodeCrew, crewName, namaCrew, kodeToko, kode }) {
  const gasUrl = API_CONFIG.getGasUrl();
  if (!gasUrl) throw new Error("URL Google Apps Script belum disetel");

  const cleanMod = String(module || modul || '').toUpperCase().trim();
  const cleanRute = String(rute || '').replace(/[^0-9]/g, '');
  const cleanKode = String(kodeToko || kode || '').toUpperCase().trim();
  const cleanCrew = String(crewCode || kodeCrew || '').trim();
  const cleanCrewName = String(crewName || namaCrew || '').trim();

  const payload = {
    action: "delete_scheduled_store",
    modul: cleanMod,
    module: cleanMod,
    rute: cleanRute,
    crewCode: cleanCrew,
    kodeCrew: cleanCrew,
    crewName: cleanCrewName,
    namaCrew: cleanCrewName,
    kodeToko: cleanKode,
    kode: cleanKode
  };

  console.group("🗑️ [MDS DELETE STORE TRACKER]");
  console.log("📍 Target Endpoint GAS:", gasUrl);
  console.log("🏪 Toko Target:", { kode: cleanKode, rute: cleanRute, modul: cleanMod, crew: cleanCrew });
  console.log("📋 Data Payload Dikirim:", payload);

  // 0. FAST-PATH DIRECT SUPABASE DELETE (< 100ms)
  try {
    if (API_CONFIG.USE_SUPABASE && API_CONFIG.SUPABASE_URL) {
      if (cleanMod && cleanKode) {
        const flt = { modul: `eq.${cleanMod}`, kode_toko: `eq.${cleanKode}` };
        if (cleanRute) flt.rute = `eq.${cleanRute}`;
        const sbRes = await deleteFromSupabase('tbl_jadwal_rps', flt);
        console.log(`⚡ [Supabase] Status Hapus tbl_jadwal_rps:`, sbRes);
      }
    }
  } catch (sbDelErr) {
    console.warn('⚠️ Fast-path Supabase delete warning:', sbDelErr);
  }

  try {
    console.log("⏳ Mengirim perintah DELETE ke Google Apps Script (Sheet Cabang)...");
    const response = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    console.log("📡 HTTP Status GAS:", response.status, response.statusText);
    const rawText = await response.text();
    let resJson = null;
    try {
      resJson = JSON.parse(rawText);
      console.log("✅ Balasan Backend GAS (JSON):", resJson);
    } catch (je) {
      console.log("ℹ️ Balasan Backend GAS (Raw Text):", rawText);
    }
    console.groupEnd();

    try {
      const bc = new BroadcastChannel('mds_sync_channel');
      bc.postMessage({
        type: 'STORE_DELETED',
        kodeToko: cleanKode,
        modul: cleanMod,
        rute: cleanRute,
        timestamp: Date.now()
      });
      bc.close();
    } catch (e) {}

    return {
      success: true,
      data: resJson,
      message: `Toko ${cleanKode} berhasil dihapus dari jadwal Rute ${cleanRute} di Google Sheet!`
    };
  } catch (err) {
    console.warn("⚠️ Direct POST gagal, mencoba fallback no-cors text/plain:", err);
    await fetch(gasUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });
    console.log("ℹ️ Request fallback no-cors terkirim ke GAS");
    console.groupEnd();

    try {
      const bc = new BroadcastChannel('mds_sync_channel');
      bc.postMessage({
        type: 'STORE_DELETED',
        kodeToko: cleanKode,
        modul: cleanMod,
        rute: cleanRute,
        timestamp: Date.now()
      });
      bc.close();
    } catch (e) {}

    return {
      success: true,
      message: `Toko ${cleanKode} berhasil dihapus dari jadwal Rute ${cleanRute} di Google Sheet!`
    };
  }
}

/**
 * Mengambil Status Monitoring Input Realtime Seluruh MDS per Rute
 */
async function fetchMdsMonitoringStatus(rute) {
  const gasUrl = API_CONFIG.getGasUrl();
  if (!gasUrl) throw new Error("URL Google Apps Script belum disetel");

  const queryUrl = `${gasUrl}?action=get_monitoring_status&rute=${encodeURIComponent(rute)}`;

  try {
    const response = await fetch(queryUrl);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

    const result = await response.json();
    if (result.status === "success") {
      return result.data;
    } else {
      throw new Error(result.message || "Gagal mengambil status monitoring");
    }
  } catch (err) {
    console.error("Gagal mengambil status monitoring MDS:", err);
    throw err;
  }
}

/**
 * On-Demand Store Search API (~370 Bytes vs 7 MB CSV)
 * Mencari toko langsung ke server secara efisien tanpa download 49k toko
 */
async function fetchStoresOnDemand(query, accountFilter = "ALL", limit = 50) {
  const gasUrl = API_CONFIG.getGasUrl();
  if (!gasUrl || !query || query.trim().length < 2) return [];

  const queryUrl = `${gasUrl}?action=search_stores&q=${encodeURIComponent(query.trim())}&account=${encodeURIComponent(accountFilter)}&limit=${limit}`;

  try {
    const response = await fetch(queryUrl);
    if (!response.ok) return [];

    const result = await response.json();
    if (result.status === "success" && Array.isArray(result.data)) {
      return result.data;
    }
    return [];
  } catch (err) {
    console.warn("On-demand store search fallback:", err.message);
    return [];
  }
}


