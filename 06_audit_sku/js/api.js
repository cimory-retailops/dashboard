/**
 * ==============================================================================
 * CIMORY RETAIL OPS - SKU AUDIT & PRICING API SERVICE
 * High-Speed Parallel CSV Fetcher + Smart Join Engine
 * ==============================================================================
 */

const ApiService = {
  memoryCache: new Map(),

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

  async fetchModuleData(modKey, sheetId) {
    try {
      // 1. Fetch Kunjungan for Visit Metadata
      const urlKunjungan = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Kunjungan`;
      // 2. Fetch Detail Audit for SKU Items
      const urlAudit = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Detail%20Audit`;

      const [resKunjungan, resAudit] = await Promise.all([
        fetch(urlKunjungan).catch(() => null),
        fetch(urlAudit).catch(() => null)
      ]);

      const textKunjungan = resKunjungan && resKunjungan.ok ? await resKunjungan.text() : '';
      const textAudit = resAudit && resAudit.ok ? await resAudit.text() : '';

      return this.parseAndJoin(textKunjungan, textAudit, modKey);
    } catch (e) {
      console.warn(`Gagal fetch modul ${modKey}:`, e);
      return [];
    }
  },

  parseAndJoin(textKunjungan, textAudit, modKey) {
    const visitsMap = new Map();
    
    // Parse Kunjungan Sheet
    if (textKunjungan) {
      const kRows = this.parseCsv(textKunjungan);
      if (kRows.length > 1) {
        const headers = kRows[0].map(h => (h || '').toUpperCase().replace(/[\s_-]/g, ''));
        const findIdx = (names, def) => {
          for (const n of names) {
            const idx = headers.indexOf(n.toUpperCase().replace(/[\s_-]/g, ''));
            if (idx !== -1) return idx;
          }
          return def;
        };

        const idxId = findIdx(['ID_VISIT', 'IDVISIT', 'ID'], 0);
        const idxTime = findIdx(['WAKTU', 'TIME', 'JAM'], 2);
        const idxDate = findIdx(['TANGGAL', 'DATE', 'TGL'], 3);
        const idxKodeCrew = findIdx(['IDCREW', 'ID_CREW', 'KODE_CREW'], 7);
        const idxNamaCrew = findIdx(['NAMA_CREW', 'NAMA CREW', 'NAMA'], 8);
        const idxAccount = findIdx(['ACCOUNT', 'AKUN'], 10);
        const idxKodeToko = findIdx(['KODE_TOKO', 'KODE TOKO'], 11);
        const idxNamaToko = findIdx(['NAMA_TOKO', 'NAMA TOKO'], 12);
        const idxTipeToko = findIdx(['TIPE_TOKO', 'TIPE TOKO', 'TIPE', 'CHILLER'], 13);

        for (let i = 1; i < kRows.length; i++) {
          const r = kRows[i];
          const id = r[idxId] || '';
          if (!id) continue;
          visitsMap.set(id, {
            idVisit: id,
            time: r[idxTime] || '',
            date: r[idxDate] || '',
            kodeCrew: r[idxKodeCrew] || '',
            namaCrew: r[idxNamaCrew] || '',
            account: (r[idxAccount] || '').toUpperCase().trim(),
            kodeToko: r[idxKodeToko] || '',
            namaToko: r[idxNamaToko] || '',
            tipeToko: r[idxTipeToko] || '',
            modul: modKey
          });
        }
      }
    }

    // Parse Detail Audit Sheet
    if (!textAudit) return [];
    const aRows = this.parseCsv(textAudit);
    if (aRows.length < 2) return [];

    const aHeaders = aRows[0].map(h => (h || '').toUpperCase().replace(/[\s_-]/g, ''));
    const aFind = (names, def) => {
      for (const n of names) {
        const idx = aHeaders.indexOf(n.toUpperCase().replace(/[\s_-]/g, ''));
        if (idx !== -1) return idx;
      }
      return def;
    };

    const idxDetVisit = aFind(['DETAIL_VISIT', 'DETAILVISIT'], 0);
    const idxAuditId = aFind(['ID_VISIT', 'IDVISIT'], 1);
    const idxMap = aFind(['MAP', 'LOKASI'], 2);
    const idxWaktu = aFind(['WAKTU', 'TIME', 'JAM'], 3);
    const idxTgl = aFind(['TANGGAL', 'DATE', 'TGL'], 4);
    const idxBrand = aFind(['BRAND', 'MERK'], 5);
    const idxKategori = aFind(['KATAGORI', 'KATEGORI', 'CATEGORY'], 6);
    const idxBarcode = aFind(['BARCODE', 'KODE_BARANG'], 7);
    const idxNamaBarang = aFind(['NAMA_BARANG', 'NAMA BARANG', 'PRODUK', 'ITEM'], 8);
    const idxPacksize = aFind(['PACKSIZE', 'PACK SIZE', 'UKURAN'], 9);
    const idxOsa = aFind(['OSA', 'KETERSEDIAAN'], 10);
    const idxQtyOsa = aFind(['QTY_OSA', 'QTY OSA (PCS)', 'QTY_OSA_PCS'], 11);
    const idxQtySoh = aFind(['QTY_SOH', 'QTY SOH (PCS)', 'QTY_SOH_PCS', 'SOH'], 12);
    const idxHargaNormal = aFind(['HARGA_NORMAL', 'HARGA NORMAL', 'HARGA'], 13);
    const idxHargaPromo = aFind(['HARGA_PROMO', 'HARGA PROMO'], 14);
    const idxJenisPromo = aFind(['JENIS_PROMO', 'JENIS PROMO'], 15);
    const idxMulaiPromo = aFind(['MULAI_PROMO', 'MULAI PROMO'], 16);
    const idxAkhirPromo = aFind(['AKHIR_PROMO', 'AKHIR PROMO'], 17);
    const idxAktifPromo = aFind(['AKTIF_PROMO', 'AKTIF PROMO'], 18);
    const idxExpiry = aFind(['APAKAH_ADA_EXPIRY', 'APAKAH ADA EXPIRY', 'EXPIRY', 'EXP'], 19);

    const items = [];
    for (let i = 1; i < aRows.length; i++) {
      const r = aRows[i];
      const idVisit = r[idxAuditId] || '';
      const namaBarang = r[idxNamaBarang] || '';
      if (!namaBarang && !idVisit) continue;

      const visitMeta = visitsMap.get(idVisit) || {};

      // Parse Raw Numeric Prices
      const rawHargaNormal = parseFloat(String(r[idxHargaNormal] || '').replace(/[^0-9.]/g, '')) || 0;
      const rawHargaPromo = parseFloat(String(r[idxHargaPromo] || '').replace(/[^0-9.]/g, '')) || 0;
      const rawQtyOsa = parseInt(String(r[idxQtyOsa] || '').replace(/[^0-9]/g, ''), 10) || 0;
      const rawQtySoh = parseInt(String(r[idxQtySoh] || '').replace(/[^0-9]/g, ''), 10) || 0;

      const brand = (r[idxBrand] || 'CIMORY').toUpperCase().trim();
      const barcode = String(r[idxBarcode] || '').trim();
      const isOsa = String(r[idxOsa] || '').toUpperCase().includes('ADA') || String(r[idxOsa] || '').toUpperCase() === 'YA' || rawQtyOsa > 0;
      const isExpired = String(r[idxExpiry] || '').toUpperCase().includes('ADA') && !String(r[idxExpiry] || '').toUpperCase().includes('TIDAK');

      items.push({
        detailVisit: r[idxDetVisit] || `DET_${i}`,
        idVisit: idVisit,
        time: r[idxWaktu] || visitMeta.time || '',
        date: r[idxTgl] || visitMeta.date || '',
        brand: brand,
        kategori: r[idxKategori] || '',
        barcode: barcode,
        namaBarang: namaBarang.trim(),
        packsize: r[idxPacksize] || '',
        isOsa: isOsa,
        qtyOsa: rawQtyOsa,
        qtySoh: rawQtySoh,
        hargaNormalRaw: rawHargaNormal,
        hargaPromoRaw: rawHargaPromo,
        jenisPromo: r[idxJenisPromo] || '',
        mulaiPromo: r[idxMulaiPromo] || '',
        akhirPromo: r[idxAkhirPromo] || '',
        isPromoAktif: String(r[idxAktifPromo] || '').toUpperCase().includes('YA') || rawHargaPromo > 0,
        hasExpiryIssue: isExpired,
        expiryNote: r[idxExpiry] || '',
        // Joined Visit Meta
        account: visitMeta.account || 'LAINNYA',
        kodeToko: visitMeta.kodeToko || '',
        namaToko: visitMeta.namaToko || 'Toko Lapangan',
        tipeToko: visitMeta.tipeToko || '',
        kodeCrew: visitMeta.kodeCrew || '',
        namaCrew: visitMeta.namaCrew || '',
        modul: modKey
      });
    }

    return items;
  },

  async getAllDetailAudit(params = {}, onProgress = null) {
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

    const total = targetModules.length;
    let completed = 0;

    const promises = targetModules.map(async ({ modKey, sheetId }) => {
      const items = await this.fetchModuleData(modKey, sheetId);
      completed++;
      if (typeof onProgress === 'function') {
        onProgress(completed, total, modKey);
      }
      return items;
    });

    const results = await Promise.all(promises);
    return results.flat();
  }
};
