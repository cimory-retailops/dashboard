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
  
  // URL Google Apps Script Web App Default
  DEFAULT_GAS_URL: "https://script.google.com/macros/s/AKfycby1QQCwXusMhaEtm79iVISFjrZ3H6RxGOTi3vTXcYF-Xvv9SOk-X4HkugRUEe1E2-pZHQ/exec",
  
  getGasUrl: () => localStorage.getItem("mds_gas_api_url") || API_CONFIG.DEFAULT_GAS_URL,
  setGasUrl: (url) => localStorage.setItem("mds_gas_api_url", url.trim())
};

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

    const crews = [];

    // 1. Ekstrak admin & management jika berada di baris atas/header spreadsheet
    const headerRowStr = rows[0] ? rows[0].join(" ") : "";
    if (headerRowStr.includes("Yohandi Pratama")) {
      crews.push({
        id: "RO036",
        nama: "Yohandi Pratama",
        modul: "LP4",
        account: "ALFAMART",
        jabatan: "Administrator & Merchandiser"
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

      if (nama && id && !crews.some(c => c.id === id && c.nama.toLowerCase() === nama.toLowerCase() && c.modul === modul)) {
        crews.push({ id, nama, modul, account, jabatan });
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
    module: module,
    crewCode: crewCode,
    crewName: crewName,
    rute: rute,
    stores: stores,
    isEditMode: isEditMode
  };

  // Jika URL GAS sudah dipasang
  if (gasUrl) {
    try {
      const response = await fetch(gasUrl, {
        method: "POST",
        mode: "no-cors", // Bypass CORS restrictions for Google Apps Script Web App
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

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

      return {
        success: true,
        message: `Data ${stores.length} toko berhasil dikirim ke modul ${module} (Rute ${rute})!`
      };
    } catch (err) {
      console.error("Error submitting to GAS:", err);
      throw new Error(`Gagal mengirim ke Google Spreadsheet: ${err.message}`);
    }
  } else {
    // Mode Simulasi / Offline (Jika GAS URL belum diisi di Pengaturan)
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
async function fetchSavedSchedule({ module, rute, crewCode }) {
  const normModule = (module || "").toUpperCase().replace(/[\s_-]/g, "");
  const targetRuteStr = String(rute || "").trim();
  const targetRuteNum = parseInt(targetRuteStr.replace(/[^0-9]/g, ""), 10);
  const targetCrewCode = (crewCode || "").toUpperCase().trim();

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

            // Filter Crew jika ada
            if (targetCrewCode) {
              const matchCrew = rowCrewCode.includes(targetCrewCode) || targetCrewCode.includes(rowCrewCode) ||
                                rowCrewName.includes(targetCrewCode) || targetCrewCode.includes(rowCrewName);
              if (!matchCrew) continue;
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
async function deleteScheduledStoreFromCloud({ module, rute, crewCode, kodeToko }) {
  const gasUrl = API_CONFIG.getGasUrl();
  if (!gasUrl) throw new Error("URL Google Apps Script belum disetel");

  const payload = {
    action: "delete_scheduled_store",
    module: module,
    rute: rute,
    crewCode: crewCode,
    kodeToko: kodeToko
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
      message: `Toko ${kodeToko} berhasil dihapus dari jadwal Rute ${rute} di Google Sheet!`
    };
  } catch (err) {
    console.error("Gagal menghapus toko dari jadwal GAS:", err);
    throw new Error(`Gagal menghapus toko dari Google Sheet: ${err.message}`);
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


