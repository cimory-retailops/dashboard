/**
 * ==============================================================================
 * CIMORY RETAIL OPS - SKU AUDIT & PRICING DASHBOARD APP
 * Alpine.js State Management, Smart Auto-Fix Price Sanitizer, & Sub-Tabs
 * ==============================================================================
 */

function skuAuditApp() {
  return {
    // UI & Tab State
    theme: localStorage.getItem('sku_audit_theme') || 'dark',
    activeSubTab: 'HARGA', // 'HARGA' | 'STOK_EXPIRY'
    isLoading: true,
    loadingMessage: 'Menghubungkan ke 15 Database Detail Audit Cabang...',
    
    // Filters
    selectedModul: 'ALL',
    selectedAccount: 'ALL',
    selectedBrand: 'ALL',
    searchQuery: '',
    selectedExpiryFilter: 'ALL', // 'ALL' | 'EXPIRY_ONLY' | 'OOS_ONLY'

    // Date Filters
    dateFilter: 'THIS_MONTH', // 'LATEST_DAY' | 'TODAY' | 'YESTERDAY' | '7_DAYS' | 'THIS_MONTH' | 'CUSTOM'
    startDate: '',
    endDate: '',
    customStartInput: '',
    customEndInput: '',
    activeDateLabel: '',

    // Raw & Computed Datasets
    rawItems: [],
    skuPriceBenchmarks: new Map(), // Key: namaBarang -> Median Normal Price

    // Pagination
    currentPage: 1,
    pageSize: 20,

    async init() {
      // Dark mode initialization
      if (this.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      this.onDateFilterChange();
      await this.loadData();
    },

    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('sku_audit_theme', this.theme);
      if (this.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },

    setSubTab(tab) {
      this.activeSubTab = tab;
      this.currentPage = 1;
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    loadingProgress: 0,

    async loadData(showLoader = true) {
      if (showLoader) {
        this.isLoading = true;
        this.loadingProgress = 0;
        this.loadingMessage = `Menghubungkan ke database detail audit...`;
      }
      try {
        const data = await ApiService.getAllDetailAudit(
          { modul: this.selectedModul },
          (done, total, mod) => {
            this.loadingProgress = Math.round((done / total) * 100);
            this.loadingMessage = `Memuat data cabang ${mod} (${done}/${total})...`;
          }
        );
        this.rawItems = data || [];
        this.calculatePriceBenchmarks();
      } catch (err) {
        console.error('Error loading detail audit data:', err);
      } finally {
        this.isLoading = false;
        this.loadingProgress = 100;
        this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
      }
    },

    /**
     * Compute Median Price Benchmark per SKU to auto-detect & auto-correct typos (kurang/lebih '0')
     */
    calculatePriceBenchmarks() {
      const skuPrices = new Map();

      (this.rawItems || []).forEach(item => {
        const sku = item.namaBarang;
        const p = item.hargaNormalRaw;
        if (!sku || p <= 500) return; // Skip invalid 0 or sub-500 prices

        if (!skuPrices.has(sku)) skuPrices.set(sku, []);
        skuPrices.get(sku).push(p);
      });

      this.skuPriceBenchmarks = new Map();
      skuPrices.forEach((prices, sku) => {
        if (prices.length === 0) return;
        prices.sort((a, b) => a - b);
        const mid = Math.floor(prices.length / 2);
        const rawMedian = prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
        const median = Math.round(rawMedian / 100) * 100;
        this.skuPriceBenchmarks.set(sku, median);
      });

      this.applyFilters();
    },

    /**
     * Smart Sanitizer: Auto-corrects 1100 -> 11000 or 110000 -> 11000 based on SKU median
     */
    sanitizePrice(skuName, rawPrice) {
      if (!rawPrice || rawPrice <= 0) return { price: 0, isCorrected: false, note: 'Kosong' };
      const median = this.skuPriceBenchmarks.get(skuName);
      if (!median || median <= 0) {
        return { price: rawPrice, isCorrected: false, note: '' };
      }

      // Check if price is missing a zero (e.g. 1100 instead of 11000)
      if (rawPrice < median * 0.25 && rawPrice * 10 >= median * 0.7 && rawPrice * 10 <= median * 1.5) {
        return {
          price: rawPrice * 10,
          isCorrected: true,
          original: rawPrice,
          note: `Auto-Fix Kurang '0' (${rawPrice.toLocaleString()} ➔ ${(rawPrice * 10).toLocaleString()})`
        };
      }

      // Check if price has an extra zero (e.g. 110000 instead of 11000)
      if (rawPrice > median * 4 && Math.round(rawPrice / 10) >= median * 0.7 && Math.round(rawPrice / 10) <= median * 1.5) {
        const fixed = Math.round(rawPrice / 10);
        return {
          price: fixed,
          isCorrected: true,
          original: rawPrice,
          note: `Auto-Fix Lebih '0' (${rawPrice.toLocaleString()} ➔ ${fixed.toLocaleString()})`
        };
      }

      return { price: rawPrice, isCorrected: false, note: '' };
    },

    normalizeIsoDate(dateStr) {
      if (!dateStr) return '';
      const s = String(dateStr).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      const parts = s.split(/[\/\-\.]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
      return s;
    },

    onDateFilterChange() {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');

      if (this.dateFilter === 'TODAY') {
        this.startDate = `${yyyy}-${mm}-${dd}`;
        this.endDate = `${yyyy}-${mm}-${dd}`;
      } else if (this.dateFilter === 'YESTERDAY') {
        const yDate = new Date(now.getTime() - 86400000);
        const y_yyyy = yDate.getFullYear();
        const y_mm = String(yDate.getMonth() + 1).padStart(2, '0');
        const y_dd = String(yDate.getDate()).padStart(2, '0');
        this.startDate = `${y_yyyy}-${y_mm}-${y_dd}`;
        this.endDate = `${y_yyyy}-${y_mm}-${y_dd}`;
      } else if (this.dateFilter === '7_DAYS') {
        const past7 = new Date(now.getTime() - 7 * 86400000);
        this.startDate = past7.toISOString().split('T')[0];
        this.endDate = `${yyyy}-${mm}-${dd}`;
      } else if (this.dateFilter === 'THIS_MONTH') {
        this.startDate = `${yyyy}-${mm}-01`;
        this.endDate = `${yyyy}-${mm}-${dd}`;
      } else if (this.dateFilter === 'LATEST_DAY') {
        // Dynamic
      } else if (this.dateFilter === 'CUSTOM') {
        this.customStartInput = this.startDate || `${yyyy}-${mm}-${dd}`;
        this.customEndInput = this.endDate || `${yyyy}-${mm}-${dd}`;
        return;
      }

      this.currentPage = 1;
      this.updateActiveDateLabel();
      this.applyFilters();
    },

    applyCustomDates() {
      if (!this.customStartInput || !this.customEndInput) return;
      this.startDate = this.customStartInput;
      this.endDate = this.customEndInput;
      this.updateActiveDateLabel();
      this.currentPage = 1;
      this.applyFilters();
    },

    updateActiveDateLabel() {
      if (this.dateFilter === 'LATEST_DAY') this.activeDateLabel = 'Hari Terakhir Aktif';
      else if (this.dateFilter === 'TODAY') this.activeDateLabel = 'Hari Ini';
      else if (this.dateFilter === 'YESTERDAY') this.activeDateLabel = 'Kemarin';
      else if (this.dateFilter === '7_DAYS') this.activeDateLabel = '7 Hari Terakhir';
      else if (this.dateFilter === 'THIS_MONTH') this.activeDateLabel = 'Bulan Ini';
      else if (this.dateFilter === 'CUSTOM') this.activeDateLabel = `${this.startDate} s/d ${this.endDate}`;
    },

    // SKU Multi-Select Dropdown State
    openSkuDropdown: false,
    skuDropdownSearch: '',
    selectedSkus: [],
    tempSelectedSkus: [],

    openSkuMultiSelect() {
      this.tempSelectedSkus = [...this.selectedSkus];
      this.skuDropdownSearch = '';
      this.openSkuDropdown = true;
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    closeSkuMultiSelect() {
      this.openSkuDropdown = false;
    },

    toggleSkuTempSelection(skuName) {
      if (this.tempSelectedSkus.includes(skuName)) {
        this.tempSelectedSkus = this.tempSelectedSkus.filter(s => s !== skuName);
      } else {
        this.tempSelectedSkus.push(skuName);
      }
    },

    isSkuTempSelected(skuName) {
      return this.tempSelectedSkus.includes(skuName);
    },

    selectAllFilteredTempSkus() {
      const filtered = this.filteredDropdownSkus.map(s => s.namaBarang);
      const set = new Set([...this.tempSelectedSkus, ...filtered]);
      this.tempSelectedSkus = Array.from(set);
    },

    clearAllTempSkus() {
      this.tempSelectedSkus = [];
    },

    applySkuSelection() {
      this.selectedSkus = [...this.tempSelectedSkus];
      this.openSkuDropdown = false;
      this.applyFilters();
    },

    get allAvailableSkus() {
      const map = new Map();
      (this.rawItems || []).forEach(item => {
        if (!item.namaBarang) return;
        if (!map.has(item.namaBarang)) {
          map.set(item.namaBarang, {
            namaBarang: item.namaBarang,
            brand: item.brand || 'CIMORY',
            packsize: item.packsize || '',
            barcode: item.barcode || ''
          });
        }
      });
      return Array.from(map.values()).sort((a, b) => a.namaBarang.localeCompare(b.namaBarang));
    },

    get filteredDropdownSkus() {
      const q = this.skuDropdownSearch.toUpperCase().trim();
      const selBrand = this.selectedBrand;

      return this.allAvailableSkus.filter(s => {
        if (selBrand !== 'ALL') {
          if (selBrand === 'LAINNYA') {
            if (['CIMORY RTE', 'CIMORY DESSERT', 'CIMORY YOGURT', 'CIMORY UHT MILK'].includes(s.brand)) return false;
          } else if (s.brand !== selBrand) {
            return false;
          }
        }
        if (q) {
          const str = `${s.namaBarang} ${s.barcode} ${s.brand}`.toUpperCase();
          if (!str.includes(q)) return false;
        }
        return true;
      });
    },

    // Precomputed State Properties (High-Performance Caching)
    skuPriceComparisonList: [],
    skuStockMatrixList: [],
    expiryAlertsList: [],
    kpiSummary: {
      totalRows: 0,
      totalSkuObserved: 0,
      totalToko: 0,
      totalKunjungan: 0,
      avgOsa: 0,
      totalExpiry: 0
    },

    /**
     * Single High-Speed Computation Pass
     */
    applyFilters() {
      const q = this.searchQuery ? this.searchQuery.toUpperCase().trim() : '';
      const sDate = this.startDate;
      const eDate = this.endDate;
      const dFilter = this.dateFilter;
      const selAcc = this.selectedAccount;
      const selBrand = this.selectedBrand;
      const selExp = this.selectedExpiryFilter;
      const activeSkus = this.selectedSkus;

      const filtered = [];
      const rawList = this.rawItems || [];

      for (let i = 0; i < rawList.length; i++) {
        const item = rawList[i];
        
        // Date check
        if (dFilter === 'TODAY' || dFilter === 'YESTERDAY' || dFilter === '7_DAYS' || dFilter === 'THIS_MONTH' || dFilter === 'CUSTOM') {
          const iso = this.normalizeIsoDate(item.date);
          if (sDate && eDate && (iso < sDate || iso > eDate)) continue;
        }

        // Account check
        if (selAcc !== 'ALL' && !item.account.includes(selAcc)) continue;

        // Brand check
        if (selBrand !== 'ALL') {
          if (selBrand === 'LAINNYA') {
            if (['CIMORY RTE', 'CIMORY DESSERT', 'CIMORY YOGURT', 'CIMORY UHT MILK'].includes(item.brand)) continue;
          } else if (item.brand !== selBrand) {
            continue;
          }
        }

        // SKU Multi-Select check
        if (activeSkus.length > 0 && !activeSkus.includes(item.namaBarang)) continue;

        // Expiry check
        if (selExp === 'EXPIRY_ONLY' && !item.hasExpiryIssue) continue;
        if (selExp === 'OOS_ONLY' && item.isOsa) continue;

        // Search Query check
        if (q) {
          const matchStr = `${item.namaBarang} ${item.barcode} ${item.namaToko} ${item.kodeToko} ${item.namaCrew} ${item.account}`.toUpperCase();
          if (!matchStr.includes(q)) continue;
        }

        filtered.push(item);
      }

      // 1. Compute KPI
      const skuSet = new Set();
      const tokoSet = new Set();
      const visitSet = new Set();
      let osaCount = 0;
      let expiryCount = 0;

      const priceSkuMap = new Map();
      const stockSkuMap = new Map();
      const expiryAlerts = [];

      for (let i = 0; i < filtered.length; i++) {
        const item = filtered[i];
        const sku = item.namaBarang;
        if (sku) skuSet.add(sku);
        if (item.kodeToko || item.namaToko || item.idVisit) tokoSet.add(item.kodeToko || item.namaToko || item.idVisit);
        if (item.idVisit) visitSet.add(item.idVisit);
        if (item.isOsa) osaCount++;
        if (item.hasExpiryIssue) {
          expiryCount++;
          expiryAlerts.push(item);
        }

        if (!sku) continue;

        // Price Comparison Aggregation
        if (!priceSkuMap.has(sku)) {
          priceSkuMap.set(sku, {
            sku: sku,
            brand: item.brand || 'CIMORY',
            barcode: item.barcode || '-',
            packsize: item.packsize || '',
            medianPrice: this.skuPriceBenchmarks.get(sku) || 0,
            accountPrices: {},
            totalVisitsObserved: 0,
            hasActivePromo: false
          });
        }
        const pEntry = priceSkuMap.get(sku);
        pEntry.totalVisitsObserved++;

        const acc = item.account || 'LAINNYA';
        if (!pEntry.accountPrices[acc]) {
          pEntry.accountPrices[acc] = { prices: [] };
        }
        const sanitized = this.sanitizePrice(sku, item.hargaNormalRaw);
        if (sanitized.price > 0) {
          pEntry.accountPrices[acc].prices.push(sanitized.price);
        }
        if (item.isPromoAktif && item.hargaPromoRaw > 0) {
          pEntry.hasActivePromo = true;
        }

        // Stock Matrix Aggregation
        if (!stockSkuMap.has(sku)) {
          stockSkuMap.set(sku, {
            sku: sku,
            brand: item.brand || 'CIMORY',
            barcode: item.barcode || '-',
            packsize: item.packsize || '',
            totalAuditToko: 0,
            totalAvailableOsa: 0,
            totalQtyOsa: 0,
            totalQtySoh: 0,
            oosCount: 0,
            expiryAlertsCount: 0,
            expiryDetails: []
          });
        }
        const sEntry = stockSkuMap.get(sku);
        sEntry.totalAuditToko++;
        if (item.isOsa) {
          sEntry.totalAvailableOsa++;
          sEntry.totalQtyOsa += item.qtyOsa;
        } else {
          sEntry.oosCount++;
        }
        sEntry.totalQtySoh += item.qtySoh;
        if (item.hasExpiryIssue) {
          sEntry.expiryAlertsCount++;
          sEntry.expiryDetails.push({
            toko: item.namaToko,
            kodeToko: item.kodeToko,
            account: item.account,
            modul: item.modul,
            date: item.date,
            mds: item.namaCrew,
            note: item.expiryNote || 'Ditemukan barang mendekati/lewat ED'
          });
        }
      }

      this.kpiSummary = {
        totalRows: filtered.length,
        totalSkuObserved: skuSet.size,
        totalToko: tokoSet.size,
        totalKunjungan: visitSet.size,
        avgOsa: filtered.length > 0 ? Math.round((osaCount / filtered.length) * 100) : 0,
        totalExpiry: expiryCount
      };

      this.expiryAlertsList = expiryAlerts;

      // 2. Build Price Comparison Array
      const priceResult = [];
      priceSkuMap.forEach(entry => {
        let alfamartAvg = 0;
        let indomaretAvg = 0;
        let alfamidiAvg = 0;
        let lawsonAvg = 0;
        let circleKAvg = 0;
        let familyMartAvg = 0;
        let yomartAvg = 0;
        let superindoAvg = 0;

        const allObservedPrices = [];

        for (const [rawAcc, data] of Object.entries(entry.accountPrices)) {
          if (data.prices.length > 0) {
            const sum = data.prices.reduce((a, b) => a + b, 0);
            const rawAvg = sum / data.prices.length;
            const avgPrice = Math.round(rawAvg / 100) * 100;
            allObservedPrices.push(...data.prices);

            const acc = rawAcc.toUpperCase();
            if (acc.includes('LAWSON')) {
              lawsonAvg = avgPrice;
            } else if (acc.includes('CIRCLE') || acc.includes(' CK') || acc.startsWith('CK')) {
              circleKAvg = avgPrice;
            } else if (acc.includes('FAMILY') || acc.includes('FM')) {
              familyMartAvg = avgPrice;
            } else if (acc.includes('YOMART') || acc.includes('YOGYA') || acc.includes('GRIYA')) {
              yomartAvg = avgPrice;
            } else if (acc.includes('ALFAMIDI') || acc.includes('MIDI')) {
              alfamidiAvg = avgPrice;
            } else if (acc.includes('ALFAMART') || acc.includes('SAT') || acc === 'ALFA') {
              alfamartAvg = avgPrice;
            } else if (acc.includes('INDOMARET') || acc.includes('IDM') || acc === 'INDO') {
              indomaretAvg = avgPrice;
            } else {
              superindoAvg = avgPrice;
            }
          }
        }

        const minPrice = allObservedPrices.length > 0 ? Math.min(...allObservedPrices) : 0;
        const maxPrice = allObservedPrices.length > 0 ? Math.max(...allObservedPrices) : 0;
        const priceSpread = maxPrice - minPrice;

        priceResult.push({
          ...entry,
          alfamartAvg,
          indomaretAvg,
          alfamidiAvg,
          lawsonAvg,
          circleKAvg,
          familyMartAvg,
          yomartAvg,
          superindoAvg,
          minPrice: Math.round(minPrice / 100) * 100,
          maxPrice: Math.round(maxPrice / 100) * 100,
          priceSpread: Math.round(priceSpread / 100) * 100
        });
      });

      this.skuPriceComparisonList = priceResult.sort((a, b) => b.totalVisitsObserved - a.totalVisitsObserved);

      // 3. Build Stock Matrix Array
      const stockResult = [];
      stockSkuMap.forEach(entry => {
        const osaRate = entry.totalAuditToko > 0 ? Math.round((entry.totalAvailableOsa / entry.totalAuditToko) * 100) : 0;
        stockResult.push({
          ...entry,
          osaRate: osaRate
        });
      });

      this.skuStockMatrixList = stockResult.sort((a, b) => a.osaRate - b.osaRate);
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    exportToCsv() {
      if (this.activeSubTab === 'HARGA') {
        const headers = ['SKU', 'Brand', 'Barcode', 'Packsize', 'Median Acuan', 'Avg Alfamart', 'Avg Indomaret', 'Avg Alfamidi', 'Avg Lawson', 'Avg Circle K', 'Avg Family Mart', 'Avg Yomart', 'Avg Superindo/Lain', 'Min Price', 'Max Price', 'Spread', 'Total Observasi'];
        const rows = this.skuPriceComparisonList.map(item => [
          `"${item.sku.replace(/"/g, '""')}"`,
          `"${item.brand}"`,
          `"${item.barcode}"`,
          `"${item.packsize}"`,
          item.medianPrice,
          item.alfamartAvg,
          item.indomaretAvg,
          item.alfamidiAvg,
          item.lawsonAvg,
          item.circleKAvg,
          item.familyMartAvg,
          item.yomartAvg,
          item.superindoAvg,
          item.minPrice,
          item.maxPrice,
          item.priceSpread,
          item.totalVisitsObserved
        ]);
        this.downloadCsv([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), 'Komparasi_Harga_Multi_Account_SKU.csv');
      } else {
        const headers = ['SKU', 'Brand', 'Barcode', 'OSA Rate (%)', 'Toko Tersedia', 'Toko OOS (Kosong)', 'Total SOH (Pcs)', 'Temuan Expired'];
        const rows = this.skuStockMatrixList.map(item => [
          `"${item.sku.replace(/"/g, '""')}"`,
          `"${item.brand}"`,
          `"${item.barcode}"`,
          `${item.osaRate}%`,
          item.totalAvailableOsa,
          item.oosCount,
          item.totalQtySoh,
          item.expiryAlertsCount
        ]);
        this.downloadCsv([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), 'Matriks_Stok_OSA_SOH_SKU.csv');
      }
    },

    downloadCsv(csvContent, filename) {
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
}
