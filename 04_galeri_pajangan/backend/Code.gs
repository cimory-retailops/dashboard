/**
 * ==============================================================================
 * CIMORY RETAIL OPS - PLANOGRAM & DISPLAY AUDIT BACKEND (APPS SCRIPT)
 * SPREADSHEET ID: 1svQnu6-5fJUMEfBF9UCRFgg1pKBdBnRxcLesinDw6jI
 * ==============================================================================
 */

const SPREADSHEET_ID = '1svQnu6-5fJUMEfBF9UCRFgg1pKBdBnRxcLesinDw6jI';
const SHEET_NAME = 'Penilaian_Display';

const HEADERS = [
  'TIMESTAMP',
  'ID_VISIT',
  'TANGGAL',
  'MODUL',
  'ACCOUNT',
  'KODE_TOKO',
  'NAMA_TOKO',
  'TIPE_FOTO',
  'URL_FOTO',
  'SKOR_PLANOGRAM',   // 1 (Sesuai) | 0 (Tidak Sesuai)
  'CEKLIS_PRICETAG',  // YA | TIDAK
  'CEKLIS_POSM',      // YA | TIDAK
  'REVIEWER',         // Pak Dwi | Mas Ibnu | Bu Oci | dll
  'CATATAN'           // Rekomendasi/catatan tindak lanjut
];

function getOrCreateSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    // Format Header
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground('#1e293b');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doGet(e) {
  const params = e ? e.parameter : {};
  const action = params.action || 'getReviews';
  const callback = params.callback;

  let result = { status: 'success', data: [] };

  try {
    if (action === 'getReviews') {
      result.data = getAllReviews();
    } else if (action === 'saveReview') {
      result.data = saveOrUpdateReview(params);
    } else if (action === 'init') {
      getOrCreateSheet();
      result.message = 'Sheet initialized successfully';
    } else {
      result = { status: 'error', message: 'Action not recognized' };
    }
  } catch (err) {
    result = { status: 'error', message: err.toString() };
  }

  const jsonString = JSON.stringify(result);

  if (callback) {
    return ContentService.createTextOutput(callback + '(' + jsonString + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(jsonString)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let params = {};
  try {
    if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else {
      params = e.parameter || {};
    }
  } catch (err) {
    params = e ? e.parameter : {};
  }

  let result = { status: 'success' };
  try {
    result.data = saveOrUpdateReview(params);
  } catch (err) {
    result = { status: 'error', message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getAllReviews() {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const reviews = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0] && !row[1]) continue;

    reviews.push({
      rowIndex: i + 1,
      timestamp: row[0] ? Utilities.formatDate(new Date(row[0]), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss') : '',
      idVisit: String(row[1] || '').trim(),
      tanggal: String(row[2] || '').trim(),
      modul: String(row[3] || '').trim(),
      account: String(row[4] || '').trim(),
      kodeToko: String(row[5] || '').trim(),
      namaToko: String(row[6] || '').trim(),
      tipeFoto: String(row[7] || '').trim(),
      urlFoto: String(row[8] || '').trim(),
      skorPlanogram: parseInt(row[9], 10) || 0,
      ceklisPricetag: String(row[10] || '').toUpperCase() === 'YA',
      ceklisPosm: String(row[11] || '').toUpperCase() === 'YA',
      reviewer: String(row[12] || '').trim(),
      catatan: String(row[13] || '').trim()
    });
  }

  return reviews;
}

function saveOrUpdateReview(payload) {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  
  const idVisit = String(payload.idVisit || payload.ID_VISIT || '').trim();
  const tipeFoto = String(payload.tipeFoto || payload.TIPE_FOTO || 'BEFORE').trim().toUpperCase();
  const nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');

  const rowData = [
    nowStr,
    idVisit,
    String(payload.tanggal || payload.TANGGAL || '').trim(),
    String(payload.modul || payload.MODUL || '').trim(),
    String(payload.account || payload.ACCOUNT || '').trim(),
    String(payload.kodeToko || payload.KODE_TOKO || '').trim(),
    String(payload.namaToko || payload.NAMA_TOKO || '').trim(),
    tipeFoto,
    String(payload.urlFoto || payload.URL_FOTO || '').trim(),
    (payload.skorPlanogram === 1 || payload.skorPlanogram === '1' || payload.skorPlanogram === true) ? 1 : 0,
    (payload.ceklisPricetag === true || payload.ceklisPricetag === 'YA' || payload.ceklisPricetag === 1) ? 'YA' : 'TIDAK',
    (payload.ceklisPosm === true || payload.ceklisPosm === 'YA' || payload.ceklisPosm === 1) ? 'YA' : 'TIDAK',
    String(payload.reviewer || payload.REVIEWER || 'SPV').trim(),
    String(payload.catatan || payload.CATATAN || '').trim()
  ];

  // Check if this ID_VISIT + TIPE_FOTO already exists (Update mode)
  let existingRow = -1;
  for (let i = 1; i < data.length; i++) {
    const existingId = String(data[i][1] || '').trim();
    const existingType = String(data[i][7] || '').trim().toUpperCase();
    if (existingId === idVisit && existingType === tipeFoto) {
      existingRow = i + 1;
      break;
    }
  }

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    return { action: 'updated', rowIndex: existingRow, data: rowData };
  } else {
    sheet.appendRow(rowData);
    return { action: 'inserted', rowIndex: sheet.getLastRow(), data: rowData };
  }
}
