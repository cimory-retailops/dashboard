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
    competitorItems: [],
    activeCbpCatalog: CONFIG.CBP_CATALOG || [],
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

    // Mega Menu State
    showCategoryMenu: false,
    activeMegaCategory: 'operasional',

    toggleCategoryMenu() {
      this.showCategoryMenu = !this.showCategoryMenu;
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
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

    // Tracking Non-Compliant Modal State
    trackingModalOpen: false,
    trackedSkuData: null,
    trackingSearch: '',
    trackingPage: 1,
    trackingPageSize: 10,

    openTrackingModal(item) {
      this.trackedSkuData = item;
      this.trackingSearch = '';
      this.trackingPage = 1;
      this.trackingModalOpen = true;
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    closeTrackingModal() {
      this.trackingModalOpen = false;
      this.trackedSkuData = null;
    },

    // CBP Master Edit Modal State
    cbpModalOpen: false,
    editingCbpList: [],
    isSavingCbp: false,
    saveCbpSuccess: false,

    openCbpModal() {
      this.editingCbpList = JSON.parse(JSON.stringify(this.activeCbpCatalog || CONFIG.CBP_CATALOG));
      this.saveCbpSuccess = false;
      this.cbpModalOpen = true;
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    closeCbpModal() {
      this.cbpModalOpen = false;
      this.editingCbpList = [];
    },

    async saveCbpChanges() {
      this.isSavingCbp = true;
      try {
        const ok = await ApiService.updateMasterCbp(this.editingCbpList);
        if (ok) {
          this.activeCbpCatalog = JSON.parse(JSON.stringify(this.editingCbpList));
          CONFIG.CBP_CATALOG = JSON.parse(JSON.stringify(this.editingCbpList));
          this.applyFilters();
          this.saveCbpSuccess = true;
          setTimeout(() => {
            this.closeCbpModal();
          }, 800);
        } else {
          alert('Gagal menyimpan perubahan ke Supabase.');
        }
      } catch (e) {
        console.error('Error saveCbpChanges:', e);
        alert('Terjadi kesalahan saat menyimpan data CBP.');
      } finally {
        this.isSavingCbp = false;
      }
    },

    findCbpMatch(skuName) {
      const catalog = (this.activeCbpCatalog && this.activeCbpCatalog.length > 0) ? this.activeCbpCatalog : CONFIG.CBP_CATALOG;
      if (!skuName || !catalog) return null;
      const s = String(skuName).toUpperCase();

      // 1. Exclude produk Non-Dairy (Sosis, Nugget, Baso, Meat, RTE/RTC Olahan Daging)
      if (/\b(SOSIS|NUGGET|KANZLER|BAKSO|BASO|BURGER|BEEF|CHICKEN|SAUSAGE|CORNDOG|COCKTAIL|FIESTA|CHIKURO|KENTANG)\b/i.test(s)) {
        return null;
      }

      // 2. Squeeze Produk (Utamakan Squeeze lebih dulu sebelum keyword lain)
      if (s.includes('SQUEEZE')) {
        if (s.includes('BITES') || s.includes('BITE')) return catalog.find(c => c.key === 'SQUEEZE BITES');
        return catalog.find(c => c.key === 'SQUEEZE 120');
      }

      // 3. StickPack Yogurt (Cek utuh STICKPACK atau STICK PACK, jangan kena kata 'STICKY' atau 'NUGGET STICK')
      if ((s.includes('STICKPACK') || s.includes('STICK PACK') || /\bSTICK\b/.test(s)) && !s.includes('STICKY')) {
        return catalog.find(c => c.key === 'STICKPACK');
      }

      // 4. Greek Yogurt
      if (s.includes('GREEK')) {
        return catalog.find(c => c.key === 'GREEK YOGURT');
      }

      // 5. Zero Yogurt Drink
      if (s.includes('ZERO')) {
        if (s.includes('200') || s.includes('200ML')) return catalog.find(c => c.key === 'ZERO 200');
        return catalog.find(c => c.key === 'ZERO 240');
      }

      // 6. Drink 65ml (Pack 4/5)
      if (/\b65\s*(ML|GR)?\b/.test(s)) {
        return catalog.find(c => c.key === 'DRINK 65');
      }

      // 7. Yogurt Drink 240ml
      if ((s.includes('DRINK') || s.includes('YOGHURT') || s.includes('YOGURT')) && (s.includes('240') || s.includes('240ML'))) {
        return catalog.find(c => c.key === 'DRINK 240');
      }

      // 8. Fresh Milk 950ml
      if ((s.includes('FRESH') || s.includes('PASTEURISASI') || s.includes('PASTEUR')) && (s.includes('950') || s.includes('950ML') || s.includes('MILK') || s.includes('SUSU'))) {
        return catalog.find(c => c.key === 'FRESH MILK 950');
      }

      // 9. UHT Milk (Wajib ada kata UHT atau SUSU atau MILK)
      if (s.includes('UHT') || s.includes('MILK') || s.includes('SUSU')) {
        if (s.includes('750') || s.includes('750ML')) return catalog.find(c => c.key === 'UHT 750');
        if (s.includes('125') || s.includes('125ML')) return catalog.find(c => c.key === 'UHT 125');
        if (s.includes('225') || s.includes('225ML')) return catalog.find(c => c.key === 'UHT 225');
        if (s.includes('250') || s.includes('250ML')) return catalog.find(c => c.key === 'UHT 250');
      }

      // 10. Eat Milk / Dessert
      if (s.includes('EAT MILK') || s.includes('EATMILK') || (s.includes('DESSERT') && s.includes('80'))) {
        return catalog.find(c => c.key === 'EAT MILK');
      }

      return null;
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
        const [data, compData, cbpDb] = await Promise.all([
          ApiService.getAllDetailAudit(
            { modul: this.selectedModul },
            (done, total, mod) => {
              this.loadingProgress = Math.round((done / total) * 100);
              this.loadingMessage = `Memuat data cabang ${mod} (${done}/${total})...`;
            }
          ),
          ApiService.fetchCompetitorData({ modul: this.selectedModul, account: this.selectedAccount }),
          ApiService.fetchMasterCbp()
        ]);
        this.rawItems = data || [];
        this.competitorItems = compData || [];
        if (cbpDb && cbpDb.length > 0) {
          this.activeCbpCatalog = cbpDb;
          CONFIG.CBP_CATALOG = cbpDb;
        }
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

    // Pagination Getters & Controls
    get totalPages() {
      const list = this.activeSubTab === 'HARGA' ? this.skuPriceComparisonList : this.skuStockMatrixList;
      if (this.pageSize === 'ALL' || !this.pageSize) return 1;
      return Math.max(1, Math.ceil((list.length || 0) / Number(this.pageSize)));
    },

    get paginatedPriceList() {
      if (this.pageSize === 'ALL' || !this.pageSize) return this.skuPriceComparisonList;
      const ps = Number(this.pageSize);
      const start = (this.currentPage - 1) * ps;
      return this.skuPriceComparisonList.slice(start, start + ps);
    },

    get paginatedStockList() {
      if (this.pageSize === 'ALL' || !this.pageSize) return this.skuStockMatrixList;
      const ps = Number(this.pageSize);
      const start = (this.currentPage - 1) * ps;
      return this.skuStockMatrixList.slice(start, start + ps);
    },

    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
        this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
      }
    },

    prevPage() {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
      }
    },

    goToPage(p) {
      this.currentPage = Math.max(1, Math.min(p, this.totalPages));
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    onPageSizeChange() {
      this.currentPage = 1;
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    // Tracking Modal Pagination Getters
    get filteredTrackingList() {
      if (!this.trackedSkuData || !this.trackedSkuData.nonCompliantList) return [];
      const q = (this.trackingSearch || '').toUpperCase().trim();
      if (!q) return this.trackedSkuData.nonCompliantList;
      return this.trackedSkuData.nonCompliantList.filter(st => {
        const m = `${st.namaToko} ${st.kodeToko} ${st.namaCrew} ${st.account} ${st.modul}`.toUpperCase();
        return m.includes(q);
      });
    },

    get trackingTotalPages() {
      const list = this.filteredTrackingList;
      return Math.max(1, Math.ceil(list.length / this.trackingPageSize));
    },

    get paginatedTrackingList() {
      const list = this.filteredTrackingList;
      const start = (this.trackingPage - 1) * this.trackingPageSize;
      return list.slice(start, start + this.trackingPageSize);
    },

    nextTrackingPage() {
      if (this.trackingPage < this.trackingTotalPages) this.trackingPage++;
    },

    prevTrackingPage() {
      if (this.trackingPage > 1) this.trackingPage--;
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
            observations: [],
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
          pEntry.observations.push({
            price: sanitized.price,
            namaToko: item.namaToko || 'Toko Lapangan',
            kodeToko: item.kodeToko || '-',
            account: item.account || 'LAINNYA',
            namaCrew: item.namaCrew || '-',
            modul: item.modul || '-',
            date: item.date || ''
          });
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

      // 2. Build Price Comparison Array with CBP Compliance
      const priceResult = [];
      const currentChannel = CONFIG.getChannelType(this.selectedAccount === 'ALL' ? '' : this.selectedAccount);

      priceSkuMap.forEach(entry => {
        const cbpInfo = this.findCbpMatch(entry.sku);
        const cbpTarget = cbpInfo ? (currentChannel === 'hysu' ? cbpInfo.hysu : cbpInfo.minis) : (entry.medianPrice || 0);

        const allObservedPrices = [];
        const nonCompliantList = [];
        let compliantCount = 0;

        entry.observations.forEach(obs => {
          allObservedPrices.push(obs.price);
          const channel = CONFIG.getChannelType(obs.account);
          const expectedCbp = cbpInfo ? (channel === 'hysu' ? cbpInfo.hysu : cbpInfo.minis) : (entry.medianPrice || obs.price);
          const diff = obs.price - expectedCbp;

          if (diff === 0) {
            compliantCount++;
          } else {
            nonCompliantList.push({
              ...obs,
              expectedCbp,
              gap: diff,
              gapPct: expectedCbp ? Math.round((diff / expectedCbp) * 1000) / 10 : 0
            });
          }
        });

        // Urutkan non-compliant dari selisih terbesar
        nonCompliantList.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

        const totalObs = allObservedPrices.length;
        const sum = allObservedPrices.reduce((a, b) => a + b, 0);
        const avgPrice = totalObs > 0 ? Math.round(sum / totalObs) : 0;
        const cbpCompliancePct = totalObs > 0 ? Math.round((compliantCount / totalObs) * 100) : 100;
        const gapRp = cbpTarget > 0 && avgPrice > 0 ? (avgPrice - cbpTarget) : 0;
        const gapPct = cbpTarget > 0 && avgPrice > 0 ? Math.round((gapRp / cbpTarget) * 1000) / 10 : 0;

        // Perbandingan harga kompetitor berdasarkan Kategori & Gramasi
        let compPrice = 0;
        let compMatchedCount = 0;
        let compBrands = [];

        if (cbpInfo && cbpInfo.gramasi && this.competitorItems && this.competitorItems.length > 0) {
          const targetGram = parseInt(cbpInfo.gramasi, 10);
          const targetCat = cbpInfo.compCategory || '';

          const matchingComp = this.competitorItems.filter(ci => {
            if (selAcc !== 'ALL' && ci.account && !ci.account.includes(selAcc)) return false;
            const cCat = String(ci.kategori_produk || '').toUpperCase();
            if (targetCat === 'MILK' && !cCat.includes('MILK')) return false;
            if (targetCat === 'YOGURT' && !cCat.includes('YOGURT')) return false;
            if (targetCat === 'DESSERT' && (!cCat.includes('DESSERT') && !cCat.includes('RTC') && !cCat.includes('RTE'))) return false;

            const pNum = parseInt(String(ci.packsize || ci.nama_barang || '').replace(/[^0-9]/g, ''), 10);
            if (!pNum) return false;
            return Math.abs(pNum - targetGram) <= Math.max(20, targetGram * 0.15);
          });

          if (matchingComp.length > 0) {
            const validCompPrices = matchingComp
              .map(ci => ci.harga_normal || ci.harga_promo || 0)
              .filter(p => p > 500 && p < 150000);

            if (validCompPrices.length > 0) {
              const compSum = validCompPrices.reduce((a, b) => a + b, 0);
              compPrice = Math.round(compSum / validCompPrices.length);
              compMatchedCount = validCompPrices.length;
              compBrands = [...new Set(matchingComp.map(c => c.brand).filter(Boolean))];
            }
          }
        }

        const compRatio = cbpInfo && cbpInfo.compRatio ? cbpInfo.compRatio : 1.0;
        if (!compPrice) {
          compPrice = Math.round((avgPrice || cbpTarget || 0) / compRatio);
        }

        const compDiffPct = compPrice > 0 ? Math.round(((avgPrice - compPrice) / compPrice) * 100) : 0;
        const compRatioPct = compPrice > 0 ? Math.round((avgPrice / compPrice) * 100) : 100;

        priceResult.push({
          ...entry,
          hasOfficialCbp: !!cbpInfo,
          cbpCategory: cbpInfo ? cbpInfo.category : (entry.brand || 'Non-Dairy'),
          cbpTarget: cbpTarget || entry.medianPrice || 0,
          avgPrice: avgPrice,
          totalObs: totalObs,
          compliantCount: compliantCount,
          cbpCompliancePct: cbpCompliancePct,
          gapRp: gapRp,
          gapPct: gapPct,
          compPrice: compPrice,
          compRatioPct: compRatioPct,
          compDiffPct: compDiffPct,
          compMatchedCount: compMatchedCount,
          compBrands: compBrands,
          nonCompliantList: nonCompliantList
        });
      });

      // Urutkan: Produk dengan compliance terendah muncul duluan agar mudah di-track
      this.skuPriceComparisonList = priceResult.sort((a, b) => {
        if (a.cbpCompliancePct !== b.cbpCompliancePct) {
          return a.cbpCompliancePct - b.cbpCompliancePct;
        }
        return b.totalObs - a.totalObs;
      });

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
        const headers = ['SKU', 'Kategori', 'Brand', 'Barcode', 'Packsize', 'CBP Acuan (Rp)', 'Avg Price Lapangan (Rp)', 'CBP Compliance (%)', 'Toko Patuh', 'Total Observasi', 'Gap Nominal (Rp)', 'Gap (%)', 'Kompetitor (Rp)', 'Ratio vs Kompetitor (%)', 'Jml Toko Anomali'];
        const rows = this.skuPriceComparisonList.map(item => [
          `"${item.sku.replace(/"/g, '""')}"`,
          `"${item.cbpCategory || ''}"`,
          `"${item.brand}"`,
          `"${item.barcode}"`,
          `"${item.packsize}"`,
          item.cbpTarget,
          item.avgPrice,
          `${item.cbpCompliancePct}%`,
          item.compliantCount,
          item.totalObs,
          item.gapRp,
          `${item.gapPct}%`,
          item.compPrice,
          `${item.compRatioPct}%`,
          (item.nonCompliantList || []).length
        ]);
        this.downloadCsv([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), 'Komparasi_Harga_CBP_Compliance_SKU.csv');
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
