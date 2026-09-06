const modulIDs = {
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
};

const absenIDs = {
  "DK": "1A-Z_cGLRuB3_2D3_ZDF_z5Q9zoLJlwarV0pDyu69-cY",
  "LK": "1CPBD6M_C15_oYnegBG_dz1xb5eGUXR6USkNUnUvkZ2s",
  "LP": "15xkzv8Q2ZIuPH4P1KzlILKWMsl2i4VkuAE9WD3IDR4Q"
};

const externalIDs = {
  "DK_EXT": "1xQWISX8v_NGaCbw5Ih7uOe8mTZF-nR0x5UvoZS5Up40",
  "LK_EXT": "1V7bkEA6_-lzeu4pSAiHR9kHr0a2TLAZp4mt-ttxRyMU",
  "LP_EXT": "1FWBdjYAbKSDz8Dk-mcmpv_z6AuJC9BMfUUNe4_ISfo0"
};

function normalizeModulKey_(key) {
  if (!key) return "";
  var clean = String(key).trim().toUpperCase().replace(/[\s-]/g, "");
  if (clean === "DKEXT" || clean === "DK_EXT") return "DK_EXT";
  if (clean === "LKEXT" || clean === "LK_EXT") return "LK_EXT";
  if (clean === "LPEXT" || clean === "LP_EXT") return "LP_EXT";
  return clean.replace(/_/g, "");
}

function sebarJadwal(e) {
  Logger.log("--- Memulai Pengecekan Sebar Jadwal ---");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Master_Toko");
  if (!sheet) {
    Logger.log("Sheet 'Master_Toko' tidak ditemukan!");
    return;
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) {
    Logger.log("Sheet kosong atau hanya ada header.");
    return;
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var statusColIdx = -1;
  for (var h = 0; h < headers.length; h++) {
    if (String(headers[h]).trim().toLowerCase() === "status_sebar") {
      statusColIdx = h + 1;
      break;
    }
  }

  if (statusColIdx === -1) {
    statusColIdx = lastCol + 1;
    sheet.getRange(1, statusColIdx).setValue("Status_Sebar");
    var initialStatuses = [];
    for (var r = 0; r < lastRow - 1; r++) {
      initialStatuses.push(["TERSEBAR"]);
    }
    if (initialStatuses.length > 0) {
      sheet.getRange(2, statusColIdx, initialStatuses.length, 1).setValues(initialStatuses);
    }
    Logger.log("Inisialisasi Status_Sebar: " + initialStatuses.length + " baris historis ditandai TERSEBAR di Kolom ke-" + statusColIdx);
    return;
  }

  Logger.log("Kolom 'Status_Sebar' terdeteksi di Kolom ke-" + statusColIdx + ". Memeriksa " + (lastRow - 1) + " baris...");

  var dataRange = sheet.getRange(2, 1, lastRow - 1, Math.max(lastCol, statusColIdx));
  var values = dataRange.getValues();
  var dataColCount = statusColIdx - 1;

  var unspreadRowIndices = [];
  var modulBatches = {};
  var absenBatches = {};
  var extBatches = {};

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var status = String(row[statusColIdx - 1] || "").trim().toUpperCase();
    if (status === "TERSEBAR") continue;

    var rawModul = String(row[0] || "").trim();
    if (!rawModul) continue;

    var kodeModul = normalizeModulKey_(rawModul);
    var rowToAppend = row.slice(1, dataColCount);
    unspreadRowIndices.push(i + 2);

    if (modulIDs[kodeModul]) {
      if (!modulBatches[kodeModul]) modulBatches[kodeModul] = [];
      modulBatches[kodeModul].push(rowToAppend);

      var prefix = kodeModul.substring(0, 2);
      if (absenIDs[prefix]) {
        if (!absenBatches[prefix]) absenBatches[prefix] = [];
        absenBatches[prefix].push(rowToAppend);
      }

      var extKey = prefix + "_EXT";
      if (externalIDs[extKey]) {
        if (!extBatches[extKey]) extBatches[extKey] = [];
        extBatches[extKey].push(rowToAppend);
      }

    } else if (externalIDs[kodeModul]) {
      if (!extBatches[kodeModul]) extBatches[kodeModul] = [];
      extBatches[kodeModul].push(rowToAppend);
    } else {
      Logger.log("PERINGATAN: Modul '" + rawModul + "' (normalized: " + kodeModul + ") tidak cocok dengan daftar modulIDs / externalIDs!");
    }
  }

  if (unspreadRowIndices.length === 0) {
    Logger.log("Tidak ada jadwal baru yang perlu disebar (semua baris berstatus TERSEBAR).");
    return;
  }

  Logger.log("Ditemukan " + unspreadRowIndices.length + " baris jadwal baru. Menyebar serentak ke modul target...");

  var masterTokoAliases = ["Master_Toko", "master_toko", "Master Toko", "Master_toko", "MasterToko", "DATA TOKO", "Data_Toko", "Sheet1"];
  var tokoAbsenAliases = ["Toko_Absen", "toko_absen", "Toko Absen", "TokoAbsen", "Master_Toko", "master_toko", "Absensi"];
  var masterToko2Aliases = ["Master_Toko2", "Master_Toko", "master_toko", "Master Toko 2", "Master Toko", "Sheet1"];

  for (var mKey in modulBatches) {
    try {
      var targetSs = SpreadsheetApp.openById(modulIDs[mKey]);
      var targetSheet = getSheetByNames_(targetSs, masterTokoAliases);
      if (targetSheet) {
        appendDataInChunks_(targetSheet, modulBatches[mKey], 1000);
        Logger.log("Modul " + mKey + ": Berhasil kirim " + modulBatches[mKey].length + " baris ke tab '" + targetSheet.getName() + "'");
      } else {
        Logger.log("ERROR " + mKey + ": Tab 'Master_Toko' tidak ditemukan di ID " + modulIDs[mKey]);
      }
    } catch (err) {
      Logger.log("Gagal sebar modul " + mKey + ": " + err.message);
    }
  }

  for (var aKey in absenBatches) {
    try {
      var absenSs = SpreadsheetApp.openById(absenIDs[aKey]);
      var absenSheet = getSheetByNames_(absenSs, tokoAbsenAliases);
      if (absenSheet) {
        appendDataInChunks_(absenSheet, absenBatches[aKey], 1000);
        Logger.log("Absen " + aKey + ": Berhasil kirim " + absenBatches[aKey].length + " baris ke tab '" + absenSheet.getName() + "'");
      } else {
        Logger.log("ERROR Absen " + aKey + ": Tab 'Toko_Absen' tidak ditemukan di ID " + absenIDs[aKey]);
      }
    } catch (err) {
      Logger.log("Gagal sebar absen " + aKey + ": " + err.message);
    }
  }

  for (var eKey in extBatches) {
    try {
      var extSs = SpreadsheetApp.openById(externalIDs[eKey]);
      var extSheet = getSheetByNames_(extSs, masterToko2Aliases);
      if (extSheet) {
        appendDataInChunks_(extSheet, extBatches[eKey], 1000);
        Logger.log("External " + eKey + ": Berhasil kirim " + extBatches[eKey].length + " baris ke tab '" + extSheet.getName() + "'");
      } else {
        Logger.log("ERROR External " + eKey + ": Tab 'Master_Toko2' tidak ditemukan di ID " + externalIDs[eKey]);
      }
    } catch (err) {
      Logger.log("Gagal sebar external " + eKey + ": " + err.message);
    }
  }

  var statusUpdateRange = sheet.getRange(2, statusColIdx, lastRow - 1, 1);
  var currentStatuses = statusUpdateRange.getValues();
  for (var u = 0; u < unspreadRowIndices.length; u++) {
    var rIdx = unspreadRowIndices[u] - 2;
    if (rIdx >= 0 && rIdx < currentStatuses.length) {
      currentStatuses[rIdx][0] = "TERSEBAR";
    }
  }
  statusUpdateRange.setValues(currentStatuses);

  Logger.log("--- SELESAI SEBAR JADWAL: " + unspreadRowIndices.length + " baris berhasil disebar & ditandai TERSEBAR ---");
}

function sebarUlangSemuaJadwalBersih() {
  Logger.log("=== MEMULAI SEBAR ULANG TOTAL (FRESH SYNC) KE SEMUA MODUL ===");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Master_Toko");
  if (!sheet) {
    Logger.log("Error: Sheet 'Master_Toko' tidak ditemukan!");
    return;
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2) return;

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var statusColIdx = -1;
  for (var h = 0; h < headers.length; h++) {
    if (String(headers[h]).trim().toLowerCase() === "status_sebar") {
      statusColIdx = h + 1;
      break;
    }
  }
  if (statusColIdx === -1) statusColIdx = lastCol + 1;

  var dataRange = sheet.getRange(2, 1, lastRow - 1, Math.max(lastCol, statusColIdx));
  var values = dataRange.getValues();
  var dataColCount = (statusColIdx > 1) ? statusColIdx - 1 : lastCol;

  var modulBatches = {};
  var absenBatches = {};
  var extBatches = {};

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var rawModul = String(row[0] || "").trim();
    if (!rawModul) continue;

    var kodeModul = normalizeModulKey_(rawModul);
    var rowToAppend = row.slice(1, dataColCount);

    if (modulIDs[kodeModul]) {
      if (!modulBatches[kodeModul]) modulBatches[kodeModul] = [];
      modulBatches[kodeModul].push(rowToAppend);

      var prefix = kodeModul.substring(0, 2);
      if (absenIDs[prefix]) {
        if (!absenBatches[prefix]) absenBatches[prefix] = [];
        absenBatches[prefix].push(rowToAppend);
      }

      var extKey = prefix + "_EXT";
      if (externalIDs[extKey]) {
        if (!extBatches[extKey]) extBatches[extKey] = [];
        extBatches[extKey].push(rowToAppend);
      }
    } else if (externalIDs[kodeModul]) {
      if (!extBatches[kodeModul]) extBatches[kodeModul] = [];
      extBatches[kodeModul].push(rowToAppend);
    }
  }

  var masterTokoAliases = ["Master_Toko", "master_toko", "Master Toko", "Master_toko", "MasterToko", "DATA TOKO", "Data_Toko", "Sheet1"];
  var tokoAbsenAliases = ["Toko_Absen", "toko_absen", "Toko Absen", "TokoAbsen", "Master_Toko", "master_toko", "Absensi"];
  var masterToko2Aliases = ["Master_Toko2", "Master_Toko", "master_toko", "Master Toko 2", "Master Toko", "Sheet1"];

  // 1. Kirim ke Modul IDs (Reset & Tulis Ulang)
  for (var mKey in modulIDs) {
    if (!modulBatches[mKey] || modulBatches[mKey].length === 0) continue;
    try {
      var targetSs = SpreadsheetApp.openById(modulIDs[mKey]);
      var targetSheet = getSheetByNames_(targetSs, masterTokoAliases);
      if (targetSheet) {
        var headerRow = targetSheet.getRange(1, 1, 1, Math.max(targetSheet.getLastColumn(), 1)).getValues()[0];
        targetSheet.clearContents();
        targetSheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
        appendDataInChunks_(targetSheet, modulBatches[mKey], 1000);
        Logger.log("Modul " + mKey + ": Berhasil sebar ulang " + modulBatches[mKey].length + " baris ke tab '" + targetSheet.getName() + "'");
      }
    } catch (err) {
      Logger.log("Gagal sebar ulang modul " + mKey + ": " + err.message);
    }
  }

  // 2. Kirim ke Absen IDs (Reset & Tulis Ulang)
  for (var aKey in absenIDs) {
    if (!absenBatches[aKey] || absenBatches[aKey].length === 0) continue;
    try {
      var absenSs = SpreadsheetApp.openById(absenIDs[aKey]);
      var absenSheet = getSheetByNames_(absenSs, tokoAbsenAliases);
      if (absenSheet) {
        var headerRowA = absenSheet.getRange(1, 1, 1, Math.max(absenSheet.getLastColumn(), 1)).getValues()[0];
        absenSheet.clearContents();
        absenSheet.getRange(1, 1, 1, headerRowA.length).setValues([headerRowA]);
        appendDataInChunks_(absenSheet, absenBatches[aKey], 1000);
        Logger.log("Absen " + aKey + ": Berhasil sebar ulang " + absenBatches[aKey].length + " baris ke tab '" + absenSheet.getName() + "'");
      }
    } catch (err) {
      Logger.log("Gagal sebar ulang absen " + aKey + ": " + err.message);
    }
  }

  // 3. Kirim ke External IDs (Reset & Tulis Ulang)
  for (var eKey in externalIDs) {
    if (!extBatches[eKey] || extBatches[eKey].length === 0) continue;
    try {
      var extSs = SpreadsheetApp.openById(externalIDs[eKey]);
      var extSheet = getSheetByNames_(extSs, masterToko2Aliases);
      if (extSheet) {
        var headerRowE = extSheet.getRange(1, 1, 1, Math.max(extSheet.getLastColumn(), 1)).getValues()[0];
        extSheet.clearContents();
        extSheet.getRange(1, 1, 1, headerRowE.length).setValues([headerRowE]);
        appendDataInChunks_(extSheet, extBatches[eKey], 1000);
        Logger.log("External " + eKey + ": Berhasil sebar ulang " + extBatches[eKey].length + " baris ke tab '" + extSheet.getName() + "'");
      }
    } catch (err) {
      Logger.log("Gagal sebar ulang external " + eKey + ": " + err.message);
    }
  }

  // Tandai semua TERSEBAR di Central
  var statusUpdate = [];
  for (var s = 0; s < lastRow - 1; s++) {
    statusUpdate.push(["TERSEBAR"]);
  }
  sheet.getRange(2, statusColIdx, statusUpdate.length, 1).setValues(statusUpdate);

  Logger.log("=== SEBAR ULANG TOTAL SELESAI: Seluruh cabang sudah sinkron bersih 100% ===");
}

function narikDataOtomatis() {
  Logger.log("=== MEMULAI SINKRONISASI CENTRAL OTOMATIS ===");
  tarikAbsensi();
  tarikExternal();
  tarikKunjunganInternal();
  Logger.log("=== SINKRONISASI CENTRAL SELESAI ===");
}

function tarikAbsensi() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetTujuan = ss.getSheetByName("absensi");
  if (!sheetTujuan) return;

  var allRows = [];
  var headerRow = null;

  for (var key in absenIDs) {
    try {
      var sourceSs = SpreadsheetApp.openById(absenIDs[key]);
      var sheetAsal = getSheetByNames_(sourceSs, ["Absensi", "absensi", "DATA ABSENSI", "Data_Absensi", "Toko_Absen", "Sheet1"]);
      if (!sheetAsal) continue;

      var lastRow = sheetAsal.getLastRow();
      var lastCol = sheetAsal.getLastColumn();
      if (lastRow > 1 && lastCol > 0) {
        var data = sheetAsal.getRange(1, 1, lastRow, lastCol).getValues();
        if (!headerRow) {
          headerRow = data[0];
        }
        for (var d = 1; d < data.length; d++) {
          allRows.push(data[d]);
        }
      }
    } catch (err) {
      Logger.log("Error tarik absen " + key + ": " + err.message);
    }
  }

  // ATOMIC OVERWRITE: Hanya tumpuk sheet jika data berhasil ditarik untuk mencegah sheet kosong saat web membaca
  if (headerRow && allRows.length > 0) {
    sheetTujuan.clearContents();
    sheetTujuan.appendRow(headerRow);
    appendDataInChunks_(sheetTujuan, allRows, 2000);
  }
  Logger.log("Tarik Absensi: Total " + allRows.length + " baris berhasil dimuat secara atomic.");
}

function tarikExternal() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetKunjungan = getSheetByNames_(ss, ["Kunjungan_external", "Audit_external", "audit_external"]);
  var sheetAudit = getSheetByNames_(ss, ["Detail Audit_external", "Detail_Audit_external", "detail_audit_external"]);

  var allKunjungan = [];
  var headerKunjungan = null;
  var allAudit = [];
  var headerAudit = null;

  for (var key in externalIDs) {
    try {
      var sourceSs = SpreadsheetApp.openById(externalIDs[key]);

      if (sheetKunjungan) {
        var sK = getSheetByNames_(sourceSs, ["Audit", "audit", "Kunjungan", "kunjungan", "Kunjungan_External", "Kunjungan_external", "Data_Kunjungan", "DATA KUNJUNGAN", "Sheet1"]);
        if (sK) {
          var lr = sK.getLastRow(), lc = sK.getLastColumn();
          if (lr > 1 && lc > 0) {
            var dataK = sK.getRange(1, 1, lr, lc).getValues();
            if (!headerKunjungan) headerKunjungan = dataK[0];
            for (var k = 1; k < dataK.length; k++) {
              allKunjungan.push(dataK[k]);
            }
          }
        }
      }

      if (sheetAudit) {
        var sA = getSheetByNames_(sourceSs, ["Detail Audit", "Detail_Audit", "Detail Audit_external", "detail_audit", "Data_Audit", "Sheet1"]);
        if (sA) {
          var lrA = sA.getLastRow(), lcA = sA.getLastColumn();
          if (lrA > 1 && lcA > 0) {
            var dataA = sA.getRange(1, 1, lrA, lcA).getValues();
            if (!headerAudit) headerAudit = dataA[0];
            for (var a = 1; a < dataA.length; a++) {
              allAudit.push(dataA[a]);
            }
          }
        }
      }
    } catch (err) {
      Logger.log("Error tarik external " + key + ": " + err.message);
    }
  }

  // ATOMIC OVERWRITE
  if (sheetKunjungan && headerKunjungan && allKunjungan.length > 0) {
    sheetKunjungan.clearContents();
    sheetKunjungan.appendRow(headerKunjungan);
    appendDataInChunks_(sheetKunjungan, allKunjungan, 2000);
  }
  if (sheetAudit && headerAudit && allAudit.length > 0) {
    sheetAudit.clearContents();
    sheetAudit.appendRow(headerAudit);
    appendDataInChunks_(sheetAudit, allAudit, 2000);
  }
  Logger.log("Tarik External Selesai: Kunjungan=" + allKunjungan.length + ", Detail Audit=" + allAudit.length);
}

function tarikKunjunganInternal() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetKunjungan = getSheetByNames_(ss, ["Kunjungan_internal", "Audit_internal", "audit_internal"]);
  if (!sheetKunjungan) return;

  var allRows = [];
  var headerRow = null;

  for (var key in modulIDs) {
    try {
      var sourceSs = SpreadsheetApp.openById(modulIDs[key]);
      var sK = getSheetByNames_(sourceSs, ["Kunjungan", "kunjungan", "Audit", "audit", "Kunjungan_Internal", "Kunjungan_internal", "DATA KUNJUNGAN", "Data_Kunjungan", "Visits", "Sheet1"]);
      if (sK) {
        var lr = sK.getLastRow(), lc = sK.getLastColumn();
        if (lr > 1 && lc > 0) {
          var data = sK.getRange(1, 1, lr, lc).getValues();
          if (!headerRow) {
            headerRow = data[0];
          }
          for (var i = 1; i < data.length; i++) {
            allRows.push(data[i]);
          }
          Logger.log("Berhasil tarik modul " + key + ": " + (data.length - 1) + " baris");
        }
      } else {
        Logger.log("Peringatan: Tab Kunjungan tidak ditemukan di modul " + key);
      }
    } catch (err) {
      Logger.log("Error tarik kunjungan modul " + key + ": " + err.message);
    }
  }

  // ATOMIC OVERWRITE: Hanya timpa isi sheet saat seluruh data modul selesai dikumpulkan di memori
  // Hal ini menjamin web dashboard TIDAK PERNAH membaca sheet kosong / setengah terisi saat refresh berjalan
  if (headerRow && allRows.length > 0) {
    sheetKunjungan.clearContents();
    sheetKunjungan.appendRow(headerRow);
    appendDataInChunks_(sheetKunjungan, allRows, 2000);
  }
  Logger.log("Tarik Kunjungan Internal: Total " + allRows.length + " baris berhasil dimuat secara atomic.");
}

function backupBulanan() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var activeFile = DriveApp.getFileById(ss.getId());

  var now = new Date();
  var prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  var yyyy = Utilities.formatDate(prevMonthDate, "GMT+7", "yyyy");
  var mm = Utilities.formatDate(prevMonthDate, "GMT+7", "MM");
  var mmmName = Utilities.formatDate(prevMonthDate, "GMT+7", "MMMM");

  var mainFolderName = "Backup_Arsip_Bulanan";
  var mainFolders = DriveApp.getFoldersByName(mainFolderName);
  var mainFolder = mainFolders.hasNext() ? mainFolders.next() : DriveApp.createFolder(mainFolderName);

  var yearFolderName = "Tahun_" + yyyy;
  var yearFolders = mainFolder.getFoldersByName(yearFolderName);
  var yearFolder = yearFolders.hasNext() ? yearFolders.next() : mainFolder.createFolder(yearFolderName);

  var backupName = "Arsip_Central_" + yyyy + "_" + mm + "_" + mmmName;
  var backupFile = activeFile.makeCopy(backupName, yearFolder);

  Logger.log("Backup Sukses ke Drive: " + yearFolderName + " / " + backupName + " (ID: " + backupFile.getId() + ")");
}

function getSheetByNames_(ss, names) {
  for (var i = 0; i < names.length; i++) {
    var s = ss.getSheetByName(names[i]);
    if (s) return s;
  }
  return null;
}

function ensureGridSize_(sheet, neededRows, neededCols) {
  var maxRows = sheet.getMaxRows();
  var maxCols = sheet.getMaxColumns();
  if (maxRows < neededRows) {
    sheet.insertRowsAfter(maxRows, neededRows - maxRows);
  }
  if (maxCols < neededCols) {
    sheet.insertColumnsAfter(maxCols, neededCols - maxCols);
  }
}

function getActualLastRow_(sheet) {
  if (!sheet) return 1;
  var maxR = sheet.getMaxRows();
  if (maxR < 1) return 1;
  var colA = sheet.getRange(1, 1, maxR, 1).getValues();
  for (var r = colA.length - 1; r >= 0; r--) {
    var cellVal = String(colA[r][0] || "").trim();
    if (cellVal !== "") {
      return r + 1;
    }
  }
  return 1;
}

function appendDataInChunks_(targetSheet, rows, chunkSize) {
  if (!targetSheet || !rows || rows.length === 0) return;
  chunkSize = chunkSize || 2000;
  var numCols = rows[0].length;

  for (var c = 0; c < rows.length; c += chunkSize) {
    var chunk = rows.slice(c, c + chunkSize);
    var startRow = getActualLastRow_(targetSheet) + 1;
    ensureGridSize_(targetSheet, startRow + chunk.length, numCols);
    targetSheet.getRange(startRow, 1, chunk.length, numCols).setValues(chunk);
  }
}

function bersihkanDanPulihkanMasterToko() {
  Logger.log("=== MEMULAI BERSIHKAN DUPLIKAT & PULIHKAN JADWAL HILANG ===");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var masterSheet = ss.getSheetByName("Master_Toko");
  var kunjunganSheet = ss.getSheetByName("Kunjungan_internal");

  if (!masterSheet || !kunjunganSheet) {
    Logger.log("Error: Tab 'Master_Toko' atau 'Kunjungan_internal' tidak ditemukan!");
    return;
  }

  var mData = masterSheet.getDataRange().getValues();
  if (mData.length < 2) return;
  var header = mData[0];

  // 1. Bersihkan Duplikat Master_Toko
  var seenKeys = {};
  var cleanRows = [];
  var dupCount = 0;
  var masterCrewStore = {};

  for (var i = 1; i < mData.length; i++) {
    var r = mData[i];
    var mod = String(r[0] || "").trim();
    var acc = String(r[1] || "").trim();
    var kTok = String(r[2] || "").trim();
    var kCrw = String(r[4] || "").trim();
    var rut = String(r[6] || "").trim();

    if (!kTok && !kCrw) continue;

    var key = mod + "_" + kTok + "_" + kCrw + "_" + rut;
    if (seenKeys[key]) {
      dupCount++;
      continue;
    }
    seenKeys[key] = true;
    cleanRows.push(r);
    masterCrewStore[kCrw + "_" + kTok] = true;
  }

  Logger.log("Master Asli: " + (mData.length - 1) + " baris | Duplikat dibuang: " + dupCount + " | Baris Unik: " + cleanRows.length);

  // 2. Pulihkan Jadwal Hilang dari Kunjungan_internal
  var kData = kunjunganSheet.getDataRange().getValues();
  var hariToRute = {
    "senin": "1", "selasa": "2", "rabu": "3", "kamis": "4",
    "jumat": "5", "sabtu": "6", "minggu": "7"
  };
  var recoveredRows = [];
  var seenRec = {};

  for (var k = 1; k < kData.length; k++) {
    var kr = kData[k];
    var idKunj = String(kr[0] || "").trim();
    var hari = String(kr[5] || "").trim().toLowerCase();
    var kCrw = String(kr[7] || "").trim();
    var nCrw = String(kr[8] || "").trim();
    var acc = String(kr[10] || "").trim();
    var kTok = String(kr[11] || "").trim();
    var nTok = String(kr[12] || "").trim();
    var tTok = String(kr[13] || "").trim();

    if (!kTok || !kCrw) continue;

    var csKey = kCrw + "_" + kTok;
    if (!masterCrewStore[csKey]) {
      var mod = "";
      var allMods = ["DK1","DK2","DK3","DK4","DK5","DK6","LK1","LK2","LK3","LK4","LK5","LP1","LP2","LP3","LP4"];
      for (var m = 0; m < allMods.length; m++) {
        if (idKunj.indexOf(allMods[m]) !== -1) {
          mod = allMods[m];
          break;
        }
      }

      var recKey = mod + "_" + csKey;
      if (!seenRec[recKey]) {
        seenRec[recKey] = true;
        var ruteVal = hariToRute[hari] || "1";
        var restoredRow = [
          mod, acc, kTok, nTok, kCrw, nCrw,
          ruteVal, tTok, "", "", "", "", "PULIH_DARI_HISTORY", "AKTIF", "TERSEBAR"
        ];
        recoveredRows.push(restoredRow);
      }
    }
  }

  Logger.log("Jadwal hilang berhasil dipulihkan: " + recoveredRows.length + " baris");

  // 3. Tulis dataset bersih + pulih ke Master_Toko
  var finalRows = [header].concat(cleanRows).concat(recoveredRows);
  masterSheet.clearContents();
  ensureGridSize_(masterSheet, finalRows.length + 10, header.length);
  
  for (var c = 0; c < finalRows.length; c += 2000) {
    var chunk = finalRows.slice(c, c + 2000);
    masterSheet.getRange(c + 1, 1, chunk.length, chunk[0].length).setValues(chunk);
  }

  Logger.log("=== BERSIHKAN & PULIHKAN SELESAI: Total " + (finalRows.length - 1) + " baris tersimpan di Master_Toko ===");
}

// ==============================================================================
// DASHBOARD MONITORING CENTRAL WEB APP API (HIGH-SPEED 1 PINTU)
// ==============================================================================

const MASTER_49K_ID = "16cokFfnQFIajmTd553TKy-CfkNFc1Gg7ElkhAer81QA";

function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || "getVisits";
    var callback = params.callback || "";
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var responseData = { status: "success", action: action, timestamp: new Date().toISOString() };

    if (action === "getVisits") {
      responseData.data = handleGetVisits_(params, ss);
      responseData.total = responseData.data.length;
    } else if (action === "getAbsensi") {
      responseData.data = handleGetAbsensi_(params, ss);
      responseData.total = responseData.data.length;
    } else if (action === "getMasterToko") {
      responseData.data = handleGetMasterToko_(params, ss);
      responseData.total = responseData.data.length;
    } else if (action === "getMasterUser") {
      responseData.data = handleGetMasterUser_(params, ss);
      responseData.total = responseData.data.length;
    } else if (action === "getMasterStores49k") {
      responseData.data = handleGetMasterStores49k_(params);
      responseData.total = responseData.data.length;
    } else if (action === "getArchiveMonths") {
      responseData.data = handleGetArchiveMonths_();
    } else if (action === "getArchiveVisits") {
      responseData.data = handleGetArchiveVisits_(params);
      responseData.total = responseData.data.length;
    } else if (action === "getDetailAudit") {
      responseData.data = handleGetDetailAudit_(params);
      responseData.total = responseData.data.length;
    } else if (action === "resolveImage") {
      responseData = handleResolveImage_(params);
    } else {
      responseData = { status: "error", message: "Action '" + action + "' tidak dikenali." };
    }

    return createApiResponse_(responseData, callback);

  } catch (err) {
    return createApiResponse_({
      status: "error",
      message: err.toString(),
      stack: err.stack
    }, (e && e.parameter && e.parameter.callback) ? e.parameter.callback : "");
  }
}

function createApiResponse_(data, callback) {
  var jsonStr = JSON.stringify(data);
  if (callback) {
    return ContentService.createTextOutput(callback + "(" + jsonStr + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(jsonStr)
    .setMimeType(ContentService.MimeType.JSON);
}

function handleGetVisits_(params, ss) {
  var sheet = ss.getSheetByName("Kunjungan_internal");
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var modulFilter = (params.modul || "ALL").toUpperCase().trim();
  var dateFilter = (params.date || "").toUpperCase().trim();
  var startDate = (params.startDate || "").trim();
  var endDate = (params.endDate || "").trim();
  var crewFilter = (params.crew || "").toUpperCase().trim();
  var limit = parseInt(params.limit) || (dateFilter === "TODAY" ? 500 : 2500);

  var todayStr = Utilities.formatDate(new Date(), "GMT+7", "M/d/yyyy");
  var todayIso = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");

  // Build Master User Crew -> Module lookup map (Single Source of Truth)
  var crewModulMap = {};
  var userSheet = ss.getSheetByName("master_user") || ss.getSheetByName("Master_User");
  if (userSheet) {
    var uData = userSheet.getDataRange().getValues();
    if (uData.length > 1) {
      var uHeader = uData[0].map(function(h) { return String(h || '').toUpperCase().trim(); });
      var uIdxNama = uHeader.indexOf("NAMA");
      var uIdxId = uHeader.indexOf("ID");
      var uIdxMod = uHeader.indexOf("MODUL");
      if (uIdxNama === -1) uIdxNama = 1;
      if (uIdxMod === -1) uIdxMod = 7;
      for (var u = 1; u < uData.length; u++) {
        var uNama = String(uData[u][uIdxNama] || "").trim().toUpperCase();
        var uId = (uIdxId !== -1) ? String(uData[u][uIdxId] || "").trim().toUpperCase() : "";
        var uMod = (uIdxMod !== -1) ? String(uData[u][uIdxMod] || "").trim().toUpperCase() : "";
        if (uNama && uMod) crewModulMap[uNama] = uMod;
        if (uId && uMod) crewModulMap[uId] = uMod;
      }
    }
  }

  var results = [];
  // Scan from newest (bottom) to oldest
  for (var i = data.length - 1; i >= 1; i--) {
    var r = data[i];
    var idVisit = String(r[0] || "").trim();
    if (!idVisit) continue;

    var rawTgl = r[3];
    var tglFormatted = "";
    var tglIso = "";
    if (rawTgl instanceof Date) {
      tglFormatted = Utilities.formatDate(rawTgl, "GMT+7", "M/d/yyyy");
      tglIso = Utilities.formatDate(rawTgl, "GMT+7", "yyyy-MM-dd");
    } else {
      var sTgl = String(rawTgl || "").trim();
      tglFormatted = sTgl;
      if (sTgl.indexOf("/") !== -1) {
        var tp = sTgl.split(" ")[0].split("/");
        if (tp.length === 3 && tp[2].length === 4) {
          var d0 = ("0" + tp[0]).slice(-2);
          var d1 = ("0" + tp[1]).slice(-2);
          var d2 = tp[2];
          tglIso = (parseInt(d1, 10) > 12) ? (d2 + "-" + d0 + "-" + d1) : (d2 + "-" + d1 + "-" + d0);
        } else {
          tglIso = sTgl;
        }
      } else if (sTgl.indexOf("-") !== -1 && sTgl.length >= 10) {
        tglIso = sTgl.substring(0, 10);
      } else {
        tglIso = sTgl;
      }
    }

    // Filter Date: TODAY
    if (dateFilter === "TODAY") {
      if (tglFormatted !== todayStr && tglIso !== todayIso) continue;
    }

    // Filter Date Range: startDate & endDate (ISO string comparison)
    if (startDate && tglIso && tglIso < startDate) continue;
    if (endDate && tglIso && tglIso > endDate) continue;

    var kodeCrew = String(r[7] || "").trim();
    var namaCrew = String(r[8] || "").trim();
    if (crewFilter && namaCrew.toUpperCase().indexOf(crewFilter) === -1 && kodeCrew.toUpperCase().indexOf(crewFilter) === -1) {
      continue;
    }

    // Extract Official Modul (Check master_user first, fallback to idVisit)
    var mod = "";
    var nNorm = namaCrew.toUpperCase();
    var kNorm = kodeCrew.toUpperCase();
    if (crewModulMap[nNorm]) {
      mod = crewModulMap[nNorm];
    } else if (crewModulMap[kNorm]) {
      mod = crewModulMap[kNorm];
    } else {
      for (var m = 0; m < 15; m++) {
        var checkMod = ["DK1","DK2","DK3","DK4","DK5","DK6","LK1","LK2","LK3","LK4","LK5","LP1","LP2","LP3","LP4"][m];
        if (idVisit.indexOf(checkMod) !== -1) {
          mod = checkMod;
          break;
        }
      }
      if (!mod) mod = "DK";
    }

    if (modulFilter !== "ALL") {
      if (modulFilter.length === 2 && mod.substring(0, 2) !== modulFilter) continue;
      if (modulFilter.length > 2 && mod !== modulFilter) continue;
    }

    results.push({
      idVisit: idVisit,
      koordinat: String(r[1] || "").trim(),
      time: (r[2] instanceof Date) ? Utilities.formatDate(r[2], "GMT+7", "HH:mm:ss") : String(r[2] || "").trim(),
      date: tglFormatted,
      dateIso: tglIso,
      hariKe: String(r[4] || "").trim(),
      hari: String(r[5] || "").trim(),
      week: String(r[6] || "").trim(),
      kodeCrew: kodeCrew,
      namaCrew: namaCrew,
      jabatan: String(r[9] || "").trim(),
      account: String(r[10] || "").trim(),
      kodeToko: String(r[11] || "").trim(),
      namaToko: String(r[12] || "").trim(),
      tipeToko: String(r[13] || "").trim(),
      fotoSelfie: String(r[14] || "").trim(),
      fotoBefore1: String(r[193] || r[15] || "").trim(),
      fotoBefore2: String(r[194] || "").trim(),
      fotoBefore3: String(r[195] || "").trim(),
      fotoBefore4: String(r[196] || "").trim(),
      fotoAfter1: String(r[199] || "").trim(),
      fotoAfter2: String(r[200] || "").trim(),
      fotoAfter3: String(r[201] || "").trim(),
      fotoAfter4: String(r[202] || "").trim(),
      modul: mod,
      prefix: mod.substring(0, 2)
    });

    if (results.length >= limit) break;
  }

  // Scan Kunjungan_external if limit not reached and sheet exists
  if (results.length < limit) {
    var extSheet = ss.getSheetByName("Kunjungan_external");
    if (extSheet) {
      var extData = extSheet.getDataRange().getValues();
      if (extData.length > 1) {
        for (var e = extData.length - 1; e >= 1; e--) {
          var er = extData[e];
          var eIdVisit = String(er[0] || "").trim();
          if (!eIdVisit) continue;

          var eRawTgl = er[3];
          var eTglFormatted = "";
          var eTglIso = "";
          if (eRawTgl instanceof Date) {
            eTglFormatted = Utilities.formatDate(eRawTgl, "GMT+7", "M/d/yyyy");
            eTglIso = Utilities.formatDate(eRawTgl, "GMT+7", "yyyy-MM-dd");
          } else {
            var esTgl = String(eRawTgl || "").trim();
            eTglFormatted = esTgl;
            if (esTgl.indexOf("/") !== -1) {
              var etp = esTgl.split(" ")[0].split("/");
              if (etp.length === 3 && etp[2].length === 4) {
                var ed0 = ("0" + etp[0]).slice(-2);
                var ed1 = ("0" + etp[1]).slice(-2);
                var ed2 = etp[2];
                eTglIso = (parseInt(ed1, 10) > 12) ? (ed2 + "-" + ed0 + "-" + ed1) : (ed2 + "-" + ed1 + "-" + ed0);
              } else {
                eTglIso = esTgl;
              }
            } else if (esTgl.indexOf("-") !== -1 && esTgl.length >= 10) {
              eTglIso = esTgl.substring(0, 10);
            } else {
              eTglIso = esTgl;
            }
          }

          if (dateFilter === "TODAY" && eTglFormatted !== todayStr && eTglIso !== todayIso) continue;
          if (startDate && eTglIso && eTglIso < startDate) continue;
          if (endDate && eTglIso && eTglIso > endDate) continue;

          var eKodeCrew = String(er[7] || "").trim();
          var eNamaCrew = String(er[8] || "").trim();
          if (crewFilter && eNamaCrew.toUpperCase().indexOf(crewFilter) === -1 && eKodeCrew.toUpperCase().indexOf(crewFilter) === -1) {
            continue;
          }

          var eMod = "";
          var enNorm = eNamaCrew.toUpperCase();
          var ekNorm = eKodeCrew.toUpperCase();
          if (crewModulMap[enNorm]) {
            eMod = crewModulMap[enNorm];
          } else if (crewModulMap[ekNorm]) {
            eMod = crewModulMap[ekNorm];
          } else {
            for (var em = 0; em < 15; em++) {
              var eCheckMod = ["DK1","DK2","DK3","DK4","DK5","DK6","LK1","LK2","LK3","LK4","LK5","LP1","LP2","LP3","LP4"][em];
              if (eIdVisit.indexOf(eCheckMod) !== -1) {
                eMod = eCheckMod;
                break;
              }
            }
            if (!eMod) eMod = "DK";
          }

          if (modulFilter !== "ALL") {
            if (modulFilter.length === 2 && eMod.substring(0, 2) !== modulFilter) continue;
            if (modulFilter.length > 2 && eMod !== modulFilter) continue;
          }

          results.push({
            idVisit: eIdVisit,
            koordinat: String(er[1] || "").trim(),
            time: (er[2] instanceof Date) ? Utilities.formatDate(er[2], "GMT+7", "HH:mm:ss") : String(er[2] || "").trim(),
            date: eTglFormatted,
            dateIso: eTglIso,
            hariKe: String(er[4] || "").trim(),
            hari: String(er[5] || "").trim(),
            week: String(er[6] || "").trim(),
            kodeCrew: eKodeCrew,
            namaCrew: eNamaCrew,
            jabatan: String(er[9] || "").trim(),
            account: String(er[10] || "").trim(),
            kodeToko: String(er[11] || "").trim(),
            namaToko: String(er[12] || "").trim(),
            tipeToko: String(er[13] || "").trim(),
            fotoSelfie: String(er[14] || "").trim(),
            fotoBefore1: String(er[193] || er[15] || "").trim(),
            fotoBefore2: String(er[194] || "").trim(),
            fotoBefore3: String(er[195] || "").trim(),
            fotoBefore4: String(er[196] || "").trim(),
            fotoAfter1: String(er[199] || "").trim(),
            fotoAfter2: String(er[200] || "").trim(),
            fotoAfter3: String(er[201] || "").trim(),
            fotoAfter4: String(er[202] || "").trim(),
            modul: eMod,
            prefix: eMod.substring(0, 2)
          });

          if (results.length >= limit) break;
        }
      }
    }
  }

  return results;
}

function handleGetAbsensi_(params, ss) {
  var sheet = ss.getSheetByName("absensi");
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var crewFilter = (params.crew || "").toUpperCase().trim();
  var dateFilter = (params.date || "").toUpperCase().trim();
  var modulFilter = (params.modul || "ALL").toUpperCase().trim();
  var todayStr = Utilities.formatDate(new Date(), "GMT+7", "M/d/yyyy");
  var todayIso = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");

  // Build Master User Crew -> Module lookup map (Single Source of Truth)
  var crewModulMap = {};
  var userSheet = ss.getSheetByName("master_user") || ss.getSheetByName("Master_User");
  if (userSheet) {
    var uData = userSheet.getDataRange().getValues();
    if (uData.length > 1) {
      var uHeader = uData[0].map(function(h) { return String(h || '').toUpperCase().trim(); });
      var uIdxNama = uHeader.indexOf("NAMA");
      var uIdxId = uHeader.indexOf("ID");
      var uIdxMod = uHeader.indexOf("MODUL");
      if (uIdxNama === -1) uIdxNama = 1;
      if (uIdxMod === -1) uIdxMod = 7;
      for (var u = 1; u < uData.length; u++) {
        var uNama = String(uData[u][uIdxNama] || "").trim().toUpperCase();
        var uId = (uIdxId !== -1) ? String(uData[u][uIdxId] || "").trim().toUpperCase() : "";
        var uMod = (uIdxMod !== -1) ? String(uData[u][uIdxMod] || "").trim().toUpperCase() : "";
        if (uNama && uMod) crewModulMap[uNama] = uMod;
        if (uId && uMod) crewModulMap[uId] = uMod;
      }
    }
  }

  var results = [];
  for (var i = data.length - 1; i >= 1; i--) {
    var r = data[i];
    var idAbsen = String(r[0] || "").trim();
    if (!idAbsen) continue;

    var rawTgl = r[2];
    var tglFormatted = (rawTgl instanceof Date) ? Utilities.formatDate(rawTgl, "GMT+7", "M/d/yyyy") : String(rawTgl || "").trim();
    var tglIso = (rawTgl instanceof Date) ? Utilities.formatDate(rawTgl, "GMT+7", "yyyy-MM-dd") : tglFormatted;

    if (dateFilter === "TODAY" && tglFormatted !== todayStr && tglIso !== todayIso) continue;

    var kCrew = String(r[4] || "").trim();
    var nCrew = String(r[5] || "").trim();
    if (crewFilter && nCrew.toUpperCase().indexOf(crewFilter) === -1 && kCrew.toUpperCase().indexOf(crewFilter) === -1) {
      continue;
    }

    var mod = "";
    var nNorm = nCrew.toUpperCase();
    var kNorm = kCrew.toUpperCase();
    if (crewModulMap[nNorm]) {
      mod = crewModulMap[nNorm];
    } else if (crewModulMap[kNorm]) {
      mod = crewModulMap[kNorm];
    } else {
      for (var m = 0; m < 15; m++) {
        var checkMod = ["DK1","DK2","DK3","DK4","DK5","DK6","LK1","LK2","LK3","LK4","LK5","LP1","LP2","LP3","LP4"][m];
        if (idAbsen.indexOf(checkMod) !== -1) {
          mod = checkMod;
          break;
        }
      }
      if (!mod) mod = "DK";
    }

    if (modulFilter !== "ALL") {
      if (modulFilter.length === 2 && mod.substring(0, 2) !== modulFilter) continue;
      if (modulFilter.length > 2 && mod !== modulFilter) continue;
    }

    results.push({
      idAbsen: idAbsen,
      koordinat: String(r[1] || "").trim(),
      tanggal: tglFormatted,
      dateIso: tglIso,
      waktu: (r[3] instanceof Date) ? Utilities.formatDate(r[3], "GMT+7", "HH:mm:ss") : String(r[3] || "").trim(),
      kodeCrew: kCrew,
      namaCrew: nCrew,
      jabatan: String(r[6] || "").trim(),
      namaToko: String(r[7] || "").trim(),
      status: String(r[8] || "MASUK").trim(),
      foto: String(r[9] || "").trim(),
      fotoSurat: String(r[10] || "").trim(),
      catatan: String(r[11] || "").trim(),
      modul: mod,
      prefix: mod.substring(0, 2)
    });

    if (results.length >= 1000) break;
  }
  return results;
}

function handleGetMasterToko_(params, ss) {
  var sheet = ss.getSheetByName("Master_Toko");
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var modulFilter = (params.modul || "ALL").toUpperCase().trim();
  var ruteFilter = (params.rute || "").trim();
  var crewFilter = (params.crew || "").toUpperCase().trim();

  var results = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var mod = String(r[0] || "").trim().toUpperCase();
    if (!mod) continue;

    if (modulFilter !== "ALL") {
      if (modulFilter.length === 2 && mod.substring(0, 2) !== modulFilter) continue;
      if (modulFilter.length > 2 && mod !== modulFilter) continue;
    }

    var rute = String(r[6] || "").trim();
    if (ruteFilter && rute !== ruteFilter) continue;

    var nCrew = String(r[5] || "").trim();
    var kCrew = String(r[4] || "").trim();
    if (crewFilter && nCrew.toUpperCase().indexOf(crewFilter) === -1 && kCrew.toUpperCase().indexOf(crewFilter) === -1) {
      continue;
    }

    results.push({
      modul: mod,
      account: String(r[1] || "").trim(),
      kodeToko: String(r[2] || "").trim(),
      namaToko: String(r[3] || "").trim(),
      kodeCrew: kCrew,
      namaCrew: nCrew,
      rute: rute,
      tipeToko: String(r[7] || "").trim(),
      alamat: String(r[9] || "").trim(),
      noTelp: String(r[10] || "").trim(),
      status: String(r[13] || "AKTIF").trim()
    });
  }
  return results;
}

function handleGetMasterUser_(params, ss) {
  var sheet = ss.getSheetByName("master_user") || ss.getSheetByName("Master_User") || ss.getSheetByName("MASTER_USER") || ss.getSheetByName("user");
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var modulFilter = (params.modul || "ALL").toUpperCase().trim();
  var crewFilter = (params.crew || "").toUpperCase().trim();
  var accountFilter = (params.account || "ALL").toUpperCase().trim();

  // Header: ID, NAMA, JABATAN, DIVISI, ACCOUNT, EMAIL, ROLE, MODUL, STATUS, NO_WA
  var header = data[0].map(function(h) { return String(h || '').toUpperCase().trim(); });
  var idxId = header.indexOf("ID");
  var idxNama = header.indexOf("NAMA");
  var idxJabatan = header.indexOf("JABATAN");
  var idxDivisi = header.indexOf("DIVISI");
  var idxAccount = header.indexOf("ACCOUNT");
  var idxEmail = header.indexOf("EMAIL");
  var idxRole = header.indexOf("ROLE");
  var idxModul = header.indexOf("MODUL");
  var idxStatus = header.indexOf("STATUS");
  var idxNoWa = header.indexOf("NO_WA");

  if (idxId === -1) idxId = 0;
  if (idxNama === -1) idxNama = 1;
  if (idxModul === -1) idxModul = 7;

  var results = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var nama = String(r[idxNama] || "").trim();
    if (!nama) continue;

    var mod = (idxModul !== -1 && idxModul < r.length) ? String(r[idxModul] || "").trim().toUpperCase() : "";
    if (modulFilter !== "ALL" && mod) {
      if (modulFilter.length === 2 && mod.substring(0, 2) !== modulFilter) continue;
      if (modulFilter.length > 2 && mod !== modulFilter) continue;
    }

    var idCrew = (idxId !== -1 && idxId < r.length) ? String(r[idxId] || "").trim() : "";
    if (crewFilter && nama.toUpperCase().indexOf(crewFilter) === -1 && idCrew.toUpperCase().indexOf(crewFilter) === -1) {
      continue;
    }

    var account = (idxAccount !== -1 && idxAccount < r.length) ? String(r[idxAccount] || "").trim() : "";
    if (accountFilter !== "ALL" && account && account.toUpperCase().indexOf(accountFilter) === -1) {
      continue;
    }

    results.push({
      id: idCrew,
      nama: nama,
      jabatan: (idxJabatan !== -1 && idxJabatan < r.length) ? String(r[idxJabatan] || "").trim() : "Merchandiser",
      divisi: (idxDivisi !== -1 && idxDivisi < r.length) ? String(r[idxDivisi] || "").trim() : "Retail Operation",
      account: account,
      email: (idxEmail !== -1 && idxEmail < r.length) ? String(r[idxEmail] || "").trim() : "",
      role: (idxRole !== -1 && idxRole < r.length) ? String(r[idxRole] || "").trim() : "MDS",
      modul: mod,
      status: (idxStatus !== -1 && idxStatus < r.length && r[idxStatus]) ? String(r[idxStatus] || "AKTIF").trim().toUpperCase() : "AKTIF",
      noWa: (idxNoWa !== -1 && idxNoWa < r.length) ? String(r[idxNoWa] || "").trim() : ""
    });
  }

  return results;
}

function handleGetMasterStores49k_(params) {
  var ss = SpreadsheetApp.openById(MASTER_49K_ID);
  var sheet = getSheetByNames_(ss, ["master_toko", "Master_Toko", "DATA TOKO", "Sheet1"]);
  if (!sheet) return [];

  var lr = sheet.getLastRow();
  var lc = sheet.getLastColumn();
  if (lr < 2) return [];

  var query = (params.q || "").toUpperCase().trim();
  var limit = parseInt(params.limit) || 300;

  var data = sheet.getRange(1, 1, Math.min(lr, 5000), lc).getValues();
  var results = [];

  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var kode = String(r[0] || "").trim();
    var cabang = String(r[2] || "").trim();
    var nama = String(r[3] || "").trim();
    var alamat = String(r[4] || "").trim();
    var kota = String(r[6] || "").trim();
    var lat = String(r[7] || "").trim();
    var lng = String(r[8] || "").trim();
    var acc = String(r[9] || "").trim();

    if (query) {
      if (kode.toUpperCase().indexOf(query) === -1 && nama.toUpperCase().indexOf(query) === -1) {
        continue;
      }
    }

    results.push({
      kodeToko: kode,
      cabang: cabang,
      namaToko: nama,
      alamat: alamat,
      kota: kota,
      latitude: lat,
      longitude: lng,
      account: acc
    });

    if (results.length >= limit) break;
  }
  return results;
}

function handleGetArchiveMonths_() {
  var mainFolderName = "Backup_Arsip_Bulanan";
  var mainFolders = DriveApp.getFoldersByName(mainFolderName);
  if (!mainFolders.hasNext()) return [];

  var mainFolder = mainFolders.next();
  var yearFolders = mainFolder.getFolders();
  var archives = [];

  while (yearFolders.hasNext()) {
    var yFolder = yearFolders.next();
    var files = yFolder.getFiles();
    while (files.hasNext()) {
      var file = files.next();
      var name = file.getName();
      archives.push({
        id: file.getId(),
        name: name,
        year: yFolder.getName().replace("Tahun_", ""),
        lastUpdated: Utilities.formatDate(file.getLastUpdated(), "GMT+7", "yyyy-MM-dd HH:mm:ss")
      });
    }
  }
  return archives;
}

function handleGetArchiveVisits_(params) {
  var fileId = params.fileId;
  if (!fileId) return [];

  try {
    var ss = SpreadsheetApp.openById(fileId);
    return handleGetVisits_(params, ss);
  } catch (err) {
    Logger.log("Error reading archive file " + fileId + ": " + err.message);
    return [];
  }
}

function handleGetDetailAudit_(params) {
  var modul = normalizeModulKey_(params.modul || "");
  if (!modulIDs[modul]) return [];

  try {
    var ss = SpreadsheetApp.openById(modulIDs[modul]);
    var sheet = getSheetByNames_(ss, ["Detail Audit", "Detail_Audit", "Detail Audit_internal", "Audit"]);
    if (!sheet) return [];

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];

    var visitIdFilter = (params.idVisit || "").trim();
    var results = [];

    for (var i = data.length - 1; i >= 1; i--) {
      var r = data[i];
      var idV = String(r[0] || r[1] || "").trim();
      if (visitIdFilter && idV.indexOf(visitIdFilter) === -1) continue;

      results.push({
        idVisit: idV,
        namaBarang: String(r[2] || "").trim(),
        harga: String(r[3] || "").trim(),
        oos: String(r[4] || "").trim(),
        expired: String(r[5] || "").trim(),
        facing: String(r[6] || "").trim()
      });

      if (results.length >= 200) break;
    }
    return results;
  } catch (err) {
    return [];
  }
}

function handleResolveImage_(params) {
  var path = (params.path || "").trim();
  if (!path) return { status: "error", message: "Path kosong" };

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return { status: "success", url: path, directUrl: path };
  }

  var fileName = path.split("/").pop().trim();
  try {
    var files = DriveApp.getFilesByName(fileName);
    if (files.hasNext()) {
      var f = files.next();
      var fId = f.getId();
      return {
        status: "success",
        fileName: fileName,
        fileId: fId,
        directUrl: "https://lh3.googleusercontent.com/d/" + fId + "=s1000",
        thumbnailUrl: "https://drive.google.com/thumbnail?id=" + fId + "&sz=w600",
        viewUrl: "https://drive.google.com/file/d/" + fId + "/view"
      };
    }
  } catch (err) {}

  return { status: "error", message: "Foto tidak ditemukan di Google Drive: " + fileName };
}