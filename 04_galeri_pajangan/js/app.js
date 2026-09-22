// High-Speed SVG Placeholders (0ms network latency, never black/broken)
const SVG_LOADING = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' fill='%231e293b'%3E%3Crect width='400' height='300' fill='%231e293b'/%3E%3Ccircle cx='200' cy='130' r='20' stroke='%236366f1' stroke-width='4' fill='none' stroke-dasharray='31.4 31.4'%3E%3CanimateTransform attributeName='transform' type='rotate' from='0 200 130' to='360 200 130' dur='1s' repeatCount='indefinite'/%3E%3C/circle%3E%3Ctext x='50%25' y='68%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' font-weight='bold' fill='%23818cf8'%3EMemuat Foto...%3C/text%3E%3C/svg%3E";

const SVG_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' fill='%230f172a'%3E%3Crect width='400' height='300' fill='%230f172a'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' font-weight='bold' fill='%2394a3b8'%3E%F0%9F%93%B7 Foto Display Toko%3C/text%3E%3C/svg%3E";

function galleryApp() {
  return {
    // UI & System State
    theme: localStorage.getItem('gallery_theme') || 'dark',
    isLoading: true,
    loadingMessage: 'Menghubungkan ke Database Foto...',
    showAppMenu: false,
    
    // SPV Review Mode
    isReviewMode: false,
    activeReviewer: localStorage.getItem('gallery_reviewer') || 'MAS_IBNU',

    // User Session & RBAC Scoping
    currentUser: null,
    userRole: '',
    isSuperAdmin: false,
    isPrivileged: false,
    canReview: false,
    lockedModul: null,
    lockedMds: null,

    // Filters
    selectedModul: 'ALL',
    selectedMds: 'ALL', // 'ALL' | specific MDS name
    selectedAccount: 'ALL',
    selectedDoorType: 'ALL', // 'ALL' | '12_DOOR' | '10_DOOR' | '8_DOOR' | '6_DOOR' | '4_DOOR' | 'REGULAR' | 'SPECIAL'
    selectedPhotoType: 'ALL', // 'ALL' | 'BEFORE' | 'AFTER' | 'RAK_SEWA'
    selectedReviewStatus: 'ALL', // 'ALL' | 'UNREVIEWED' | 'REVIEWED' | 'COMPLIANT' | 'NON_COMPLIANT'
    groupBy: localStorage.getItem('gallery_group_by') || 'TYPE', // 'TYPE' | 'ACCOUNT' | 'CREW' | 'MODUL' | 'FLAT'
    expandedSections: {}, // Record of section key -> boolean (true if expanded, default collapsed for speed)

    dateFilter: 'LATEST_DAY', // 'LATEST_DAY' | 'TODAY' | 'YESTERDAY' | '7_DAYS' | 'THIS_MONTH' | 'CUSTOM'
    activeDateLabel: '',
    startDate: '',
    endDate: '',
    customStartInput: '',
    customEndInput: '',

    searchInputText: '',
    searchQuery: '',

    // Raw Datasets
    visits: [],
    reviews: [],
    reviewsMap: new Map(), // Key: `${idVisit}_${photoType}_${photoIndex}`
    resolvedImagesMap: {}, // Key: path -> Direct Google Drive URL

    // Pagination
    currentPage: 1,
    pageSize: 24, // 24 cards per page (perfect for 2, 3, 4 col grids)

    // Toko-Level Pagination (5 Toko per Page untuk Before & After)
    storePage: 1,
    storesPerPage: 5,

    // Modals
    reviewModal: {
      isOpen: false,
      isReadOnly: false,
      photoItem: null,
      skorPlanogram: 1,
      ceklisPricetag: false,
      ceklisPosm: false,
      catatan: '',
      reviewerName: '',
      isSaving: false
    },

    previewModal: {
      isOpen: false,
      title: '',
      subtitle: '',
      photoUrl: '',
      photoType: '',
      reviewInfo: null,
      visitInfo: null,
      zoom: 1,
      panX: 0,
      panY: 0,
      rotation: 0,
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0
    },

    exportModal: {
      isOpen: false,
      modul: 'ALL',
      account: 'ALL',
      doorType: 'ALL',
      dateFilter: 'LATEST_DAY',
      photoSelection: 'ALL', // 'ALL' | 'BEFORE' | 'AFTER'
      storeLimit: 25, // 10 | 25 | 50 | 100 | 0 (all)
      isExporting: false,
      progressPercent: 0,
      progressText: ''
    },

    /**
     * RBAC & User Session Initialization
     */
    initUserSession() {
      try {
        const raw = localStorage.getItem('cimory_portal_active_session');
        if (!raw) return;
        const u = JSON.parse(raw);
        this.currentUser = u;

        const r = (u.role || '').toUpperCase();
        this.userRole = r;
        this.isSuperAdmin = u.isSuperAdmin === true || r === 'SUPERADMIN';
        this.isPrivileged = this.isSuperAdmin || r === 'MANAGER';
        this.canReview = this.isPrivileged || r === 'SPV';

        // Auto-match reviewer account for SPV / Manager
        if (this.canReview) {
          const nameLower = (u.name || u.displayName || u.email || '').toLowerCase();
          if (nameLower.includes('dwi')) {
            this.activeReviewer = 'PAK_DWI';
          } else if (nameLower.includes('ibnu')) {
            this.activeReviewer = 'MAS_IBNU';
          } else if (nameLower.includes('oci') || nameLower.includes('rossy')) {
            this.activeReviewer = 'BU_OCI';
          }
        }

        // Modul restriction
        const uMod = (u.modul || u.moduleOrArea || '').toUpperCase().trim();
        if (!this.isPrivileged && uMod && uMod !== 'ALL' && uMod !== 'NASIONAL') {
          this.lockedModul = u.modul || u.moduleOrArea;
          this.selectedModul = this.lockedModul;
        }

        // MDS restriction (hanya toko & foto milik personil bersangkutan)
        if (r === 'MDS') {
          const crewName = u.linkedCrew || u.name;
          if (crewName) {
            this.lockedMds = crewName;
            this.selectedMds = crewName;
          }
        }
      } catch (e) {
        console.warn('initUserSession error:', e);
      }
    },

    /**
     * App Initialization
     */
    async initApp() {
      this.initUserSession();
      this.initTheme();
      this.dismissPreloader();

      // Check IndexedDB cache first
      const cachedVisits = await GalleryDB.get('gallery_visits', true);
      const cachedReviews = await GalleryDB.get('gallery_reviews', true);
      const cachedResolved = await GalleryDB.get('gallery_resolved_images', true);

      if (cachedResolved) {
        this.resolvedImagesMap = cachedResolved;
        // Populate memory cache in ApiService
        for (const [k, v] of Object.entries(cachedResolved)) {
          ApiService.memoryCache.set('img_' + k, v);
        }
      }

      if (cachedVisits && cachedVisits.length > 0) {
        this.visits = cachedVisits.map(v => {
          let tipe = v.tipeToko;
          const k = String(v.kodeToko || '').trim().toUpperCase();
          if ((!tipe || tipe === '-' || tipe.toLowerCase() === 'null') && k) {
            if (window.MASTER_CHILLER_TYPES && window.MASTER_CHILLER_TYPES[k]) {
              tipe = window.MASTER_CHILLER_TYPES[k];
            } else if (ApiService.masterTokoTypeMap && ApiService.masterTokoTypeMap.has(k)) {
              tipe = ApiService.masterTokoTypeMap.get(k);
            }
          }
          return {
            ...v,
            tipeToko: tipe || '-',
            account: ApiService.normalizeAccount(v.account)
          };
        });
        this.reviews = cachedReviews || [];
        this.indexReviews();
        this.isLoading = false;
        this.updateActiveDateLabel();
        
        // Refresh in background
        this.refreshData(false);
      } else {
        await this.refreshData(true);
      }

      this.$watch('storePage', () => {
        this.$nextTick(() => {
          if (window.lucide) lucide.createIcons();
        });
      });

      this.$watch('selectedDoorType', () => { this.storePage = 1; this.currentPage = 1; });
      this.$watch('selectedAccount', () => { this.storePage = 1; this.currentPage = 1; });
      this.$watch('selectedMds', () => { this.storePage = 1; this.currentPage = 1; });
      this.$watch('selectedModul', () => { this.storePage = 1; this.currentPage = 1; });
      this.$watch('selectedPhotoType', () => { this.storePage = 1; this.currentPage = 1; });
      this.$watch('searchQuery', () => { this.storePage = 1; this.currentPage = 1; });

      this.$watch('groupBy', () => {
        this.$nextTick(() => {
          if (window.lucide) lucide.createIcons();
        });
      });

      this.$nextTick(() => {
        if (window.lucide) lucide.createIcons();
      });
    },

    initTheme() {
      if (this.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },

    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('gallery_theme', this.theme);
      this.initTheme();
    },

    setReviewer(reviewerId) {
      this.activeReviewer = reviewerId;
      localStorage.setItem('gallery_reviewer', reviewerId);
      
      // Auto switch module filter to reviewer's default if applicable
      const found = CONFIG.REVIEWERS.find(r => r.id === reviewerId);
      if (found && found.defaultModules && found.defaultModules.length === 1) {
        this.selectedModul = found.defaultModules[0];
      }
    },

    dismissPreloader() {
      const preloader = document.getElementById('initial-preloader');
      if (preloader) {
        preloader.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => {
          if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
        }, 250);
      }
    },

    /**
     * Master Data Refresh
     */
    async refreshData(showLoader = true) {
      if (showLoader) {
        this.isLoading = true;
        this.loadingMessage = 'Mengunduh foto display toko & data penilaian...';
      }

      try {
        const [visitsData, reviewsData] = await Promise.all([
          ApiService.getVisitsWithPhotos({ modul: this.selectedModul }),
          ApiService.getReviews()
        ]);

        this.visits = (visitsData || []).map(v => {
          let tipe = v.tipeToko;
          const k = String(v.kodeToko || '').trim().toUpperCase();
          if ((!tipe || tipe === '-' || tipe.toLowerCase() === 'null') && k) {
            if (window.MASTER_CHILLER_TYPES && window.MASTER_CHILLER_TYPES[k]) {
              tipe = window.MASTER_CHILLER_TYPES[k];
            } else if (ApiService.masterTokoTypeMap && ApiService.masterTokoTypeMap.has(k)) {
              tipe = ApiService.masterTokoTypeMap.get(k);
            }
          }
          return {
            ...v,
            tipeToko: tipe || '-',
            account: ApiService.normalizeAccount(v.account)
          };
        });
        this.reviews = reviewsData || [];
        this.indexReviews();
        this.updateActiveDateLabel();

        // Save to local cache
        await GalleryDB.set('gallery_visits', this.visits);
        await GalleryDB.set('gallery_reviews', this.reviews);

      } catch (err) {
        console.error('Error refresh gallery data:', err);
      } finally {
        this.isLoading = false;
        this.dismissPreloader();
        this.$nextTick(() => {
          if (window.lucide) lucide.createIcons();
        });
      }
    },

    /**
     * Index Reviews for high-speed O(1) lookup
     */
    indexReviews() {
      this.reviewsMap = new Map();
      (this.reviews || []).forEach(rev => {
        const key = `${rev.idVisit}_${rev.tipeFoto}`;
        this.reviewsMap.set(key, rev);
      });
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
        let y = parts[2];
        if (y.length === 2) y = '20' + y;
        return `${y}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
      return s;
    },

    /**
     * Date Filter Changes
     */
    onDateFilterChange() {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');

      if (this.dateFilter === 'TODAY') {
        this.startDate = `${yyyy}-${mm}-${dd}`;
        this.endDate = `${yyyy}-${mm}-${dd}`;
      } else if (this.dateFilter === 'YESTERDAY') {
        const yDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const y_yyyy = yDate.getFullYear();
        const y_mm = String(yDate.getMonth() + 1).padStart(2, '0');
        const y_dd = String(yDate.getDate()).padStart(2, '0');
        this.startDate = `${y_yyyy}-${y_mm}-${y_dd}`;
        this.endDate = `${y_yyyy}-${y_mm}-${y_dd}`;
      } else if (this.dateFilter === '7_DAYS') {
        const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        this.startDate = past7.toISOString().split('T')[0];
        this.endDate = `${yyyy}-${mm}-${dd}`;
      } else if (this.dateFilter === 'THIS_MONTH') {
        this.startDate = `${yyyy}-${mm}-01`;
        this.endDate = `${yyyy}-${mm}-${dd}`;
      } else if (this.dateFilter === 'LATEST_DAY') {
        // Dynamic latest
      } else if (this.dateFilter === 'CUSTOM') {
        this.customStartInput = this.startDate || `${yyyy}-${mm}-${dd}`;
        this.customEndInput = this.endDate || `${yyyy}-${mm}-${dd}`;
        return;
      }

      this.currentPage = 1;
      this.storePage = 1;
      this.updateActiveDateLabel();
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    applyCustomDates() {
      if (!this.customStartInput || !this.customEndInput) {
        alert('Mohon pilih tanggal awal dan tanggal akhir.');
        return;
      }
      if (this.customStartInput > this.customEndInput) {
        alert('⚠️ Tanggal awal tidak boleh lebih besar dari tanggal akhir.');
        this.customEndInput = this.customStartInput;
      }

      this.isLoading = true;
      this.loadingMessage = `Menyaring foto tanggal ${this.customStartInput} s/d ${this.customEndInput}...`;

      setTimeout(() => {
        this.startDate = this.customStartInput;
        this.endDate = this.customEndInput;
        this.currentPage = 1;
        this.storePage = 1;
        this.updateActiveDateLabel();
        this.$nextTick(() => {
          if (window.lucide) lucide.createIcons();
          this.isLoading = false;
        });
      }, 100);
    },

    updateActiveDateLabel() {
      if (this.dateFilter === 'LATEST_DAY' && this.visits.length > 0) {
        const first = this.visits[0];
        const dateStr = this.normalizeIsoDate(first.date);
        this.activeDateLabel = `Data Terakhir (${dateStr})`;
      } else if (this.dateFilter === 'TODAY') {
        this.activeDateLabel = `Hari Ini, ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`;
      } else if (this.dateFilter === 'YESTERDAY') {
        const yDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        this.activeDateLabel = `Kemarin, ${yDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`;
      } else if (this.dateFilter === 'CUSTOM' && this.startDate && this.endDate) {
        this.activeDateLabel = `${this.startDate} s/d ${this.endDate}`;
      } else if (this.dateFilter === '7_DAYS') {
        this.activeDateLabel = '7 Hari Terakhir';
      } else if (this.dateFilter === 'THIS_MONTH') {
        this.activeDateLabel = 'Bulan Ini';
      } else {
        this.activeDateLabel = 'Semua Periode';
      }
    },

    executeSearch() {
      this.searchQuery = this.searchInputText.trim();
      this.currentPage = 1;
      this.storePage = 1;
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    clearSearch() {
      this.searchInputText = '';
      this.searchQuery = '';
      this.currentPage = 1;
      this.storePage = 1;
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    /**
     * Smart Normalizer for Store Chiller / Planogram Types
     * Resolves 84+ variations into structured categories (12P, 10P, 8P, 6P, 4P, Reguler, etc.)
     */
    normalizeStoreType(raw, rawName = '', rawAccount = '', rawCode = '') {
      let original = String(raw || '').trim();
      const codeUpper = String(rawCode || '').trim().toUpperCase();

      // Check master static dictionary if original is empty / '-' / 'NULL'
      if ((!original || original === '-' || original === 'NULL' || original === 'UNDEFINED') && codeUpper) {
        if (window.MASTER_CHILLER_TYPES && window.MASTER_CHILLER_TYPES[codeUpper]) {
          original = window.MASTER_CHILLER_TYPES[codeUpper];
        } else if (ApiService.masterTokoTypeMap && ApiService.masterTokoTypeMap.has(codeUpper)) {
          original = ApiService.masterTokoTypeMap.get(codeUpper);
        }
      }

      let s = original.toUpperCase().replace(/\s+/g, ' ');
      const nameUpper = String(rawName || '').toUpperCase();
      const accUpper = String(rawAccount || '').toUpperCase();

      // Fallback deteksi dari nama toko atau akun jika tipe kosong / '-'
      if (!s || s === '-' || s === 'NULL' || s === 'UNDEFINED') {
        if (accUpper.includes('FAMILY') || accUpper.includes('LAWSON')) {
          s = accUpper;
        } else if (nameUpper.includes('CLP') || nameUpper.includes('PINTU') || /\b\d+P\b/.test(nameUpper) || nameUpper.includes('POINT')) {
          s = nameUpper;
        } else if (accUpper === 'ALFAMART' || accUpper === 'INDOMARET') {
          s = 'REGULAR';
        }
      }

      // 1. Regular / Standard Formats
      if (/^(REGULAR|REGULER|STANDAR|STANDAR NEW|DC|DC DRY|DC JEMBER|CLUSTER \d+|SDN|WL|OD1A01|B)$/i.test(s)) {
        return {
          raw: original || 'Reguler',
          doorCategory: 'REGULAR',
          doorLabel: 'Reguler / Standar',
          cleanCode: s.includes('REG') ? 'Reguler' : (original || 'Reguler'),
          shortBadge: 'Reguler',
          doors: 0
        };
      }

      // 2. Retail Brand Specials (Lawson, Point, Yomart, FamiSuper)
      if (s.includes('LAWSON') || accUpper.includes('LAWSON')) {
        return { raw: original || 'Lawson', doorCategory: 'SPECIAL', doorLabel: 'Lawson', cleanCode: 'Lawson', shortBadge: 'Lawson', doors: 0 };
      }
      if (s.includes('POINT')) {
        return { raw: original || 'Point', doorCategory: 'SPECIAL', doorLabel: 'Point Coffee / IDM Point', cleanCode: 'Point', shortBadge: 'Point', doors: 0 };
      }
      if (s.includes('FAMI') || s.includes('FAMILY') || accUpper.includes('FAMILY')) {
        return { raw: original || 'FamilyMart', doorCategory: 'SPECIAL', doorLabel: 'FamilyMart', cleanCode: 'FamilyMart', shortBadge: 'FamilyMart', doors: 0 };
      }

      // 3. Detect Doors Count via Number or Words or Codes
      let doors = 0;
      const isNonCoke = s.includes('NON') || s.includes('NON COKE') || s.includes('NON-COKE') || s.includes('NONCOKE');
      const isCoke = !isNonCoke && (s.includes('COKE') || s.includes('PLUS COKE') || s.includes('+ COKE'));

      // Check Indomaret CLP patterns: ClP03 -> 12P, ClP02 -> 10P
      if (/CLP\s*0?3/i.test(s)) {
        doors = 12;
      } else if (/CLP\s*0?2/i.test(s)) {
        doors = 10;
      }
      // Check Indomaret Store size type: Tipe 120 -> 12P, Tipe 100 / 100 -> 10P, Tipe 80 / 80 -> 8P, Tipe 30 -> 4P
      else if (/TIPE\s*120\b/i.test(s)) {
        doors = 12;
      } else if (/\b(TIPE\s*100|100)\b/i.test(s)) {
        doors = 10;
      } else if (/\b(TIPE\s*80|80)\b/i.test(s)) {
        doors = 8;
      } else if (/TIPE\s*30\b/i.test(s)) {
        doors = 4;
      }

      // Check generic number before 'P' or 'PINTU': e.g. "12 Pintu", "10P", "8 Pintu", "Pintu 10", "Pintu 6", "7 pintu"
      if (!doors) {
        const doorMatch = s.match(/(\d+)\s*(P|PINTU)\b/i) || s.match(/PINTU\s*(\d+)\b/i);
        if (doorMatch) {
          doors = parseInt(doorMatch[1], 10);
        }
      }

      // Check Mini Chiller
      if (!doors && s.includes('MINI CHILLER')) {
        doors = 4;
      }

      // Detect Chiller Model Code (AC, AU, AH, AE, AA, AB, AY, CO, IDM, YOMART)
      let modelPrefix = '';
      const prefixMatch = s.match(/\b(AC|AU|AH|AE|AA|AB|AY|CO|IDM|YOMART)\b/i) || s.match(/\d*\s*(AC|AU|AH|AE|AA|AB|AY|CO)\b/i);
      if (prefixMatch) {
        modelPrefix = prefixMatch[1].toUpperCase();
      } else if (/CLP/i.test(s)) {
        modelPrefix = 'CLP';
      }

      // Assign Door Category
      let doorCategory = 'OTHER';
      let doorLabel = 'Lainnya';

      if (doors >= 12) {
        doorCategory = '12_DOOR';
        doorLabel = '12 Pintu';
      } else if (doors === 10) {
        doorCategory = '10_DOOR';
        doorLabel = '10 Pintu';
      } else if (doors === 8 || doors === 7) {
        doorCategory = '8_DOOR';
        doorLabel = doors === 7 ? '7-8 Pintu' : '8 Pintu';
      } else if (doors === 6) {
        doorCategory = '6_DOOR';
        doorLabel = '6 Pintu';
      } else if (doors > 0 && doors <= 4) {
        doorCategory = '4_DOOR';
        doorLabel = '4 Pintu / Mini';
      } else {
        doorCategory = 'OTHER';
        doorLabel = original || 'Lainnya';
      }

      // Build Clean Display Code
      let cleanCode = '';
      if (modelPrefix && doors) {
        const variantSuffix = isNonCoke ? ' Non Coke' : (isCoke ? ' Coke' : '');
        cleanCode = `${modelPrefix} ${doors}P${variantSuffix}`;
      } else if (doors) {
        const variantSuffix = isNonCoke ? ' Non Coke' : (isCoke ? ' Coke' : '');
        cleanCode = `${doors} Pintu${variantSuffix}`;
      } else {
        cleanCode = original || 'Lainnya';
      }

      return {
        raw: original,
        doorCategory: doorCategory,
        doorLabel: doorLabel,
        cleanCode: cleanCode,
        shortBadge: doors ? `${doors}P` : (modelPrefix || (doorCategory === 'REGULAR' ? 'Reguler' : 'Chiller')),
        doors: doors
      };
    },

    /**
     * Modul yang Diizinkan Sesuai Hak Akses User
     */
    get allowedModules() {
      if (!this.lockedModul) return CONFIG.MODULES;
      const target = this.lockedModul.toUpperCase().trim();
      const list = CONFIG.MODULES.filter(m => {
        if (m.code === 'ALL') return false;
        return m.code === target || m.code.startsWith(target);
      });
      return list.length > 0 ? list : [{ code: this.lockedModul, name: `Modul ${this.lockedModul}` }];
    },

    /**
     * Available Chiller Door Types (Filter Pintu)
     */
    get availableDoorTypes() {
      return [
        { code: 'ALL', label: 'Semua Tipe Toko (Pintu)' },
        { code: '12_DOOR', label: '🚪 12 Pintu (AC/AU 12P, CLP 03, Tipe 120)' },
        { code: '10_DOOR', label: '🚪 10 Pintu (AC/AU 10P, IDM 10P, CLP 02, Tipe 100)' },
        { code: '8_DOOR', label: '🚪 8 Pintu (AC/AU 8P, IDM 8P, Tipe 80)' },
        { code: '6_DOOR', label: '🚪 6 Pintu (AC/AU 6P)' },
        { code: '4_DOOR', label: '🚪 4 Pintu / Mini Chiller' },
        { code: 'REGULAR', label: '🏪 Toko Reguler / Standar' },
        { code: 'SPECIAL', label: '☕ Convenience (Lawson / Point / Fami)' },
        { code: 'OTHER', label: '📦 Tipe Lainnya / Non-Chiller' }
      ];
    },

    /**
     * Filtered Visits (Saring baris kunjungan terlebih dahulu sebelum membuat objek foto)
     */
    get filteredVisits() {
      const list = [];
      const visits = this.visits || [];

      visits.forEach(v => {
        const iso = this.normalizeIsoDate(v.date);
        
        // Date filtering
        if (this.dateFilter === 'LATEST_DAY') {
          const latestIso = this.normalizeIsoDate(visits[0]?.date);
          if (iso !== latestIso) return;
        } else if (this.dateFilter === 'TODAY') {
          const nowIso = new Date().toISOString().slice(0, 10);
          if (iso !== nowIso) return;
        } else if (this.dateFilter === 'YESTERDAY') {
          const yIso = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          if (iso !== yIso) return;
        } else if ((this.dateFilter === 'CUSTOM' || this.dateFilter === '7_DAYS' || this.dateFilter === 'THIS_MONTH') && this.startDate && this.endDate) {
          if (iso < this.startDate || iso > this.endDate) return;
        }

        // Modul filter
        if (this.selectedModul !== 'ALL') {
          if (this.selectedModul.length === 2 && !v.modul.startsWith(this.selectedModul)) return;
          if (this.selectedModul.length > 2 && v.modul !== this.selectedModul) return;
        }

        // MDS / Crew filter
        if (this.lockedMds) {
          const crewName = (v.namaCrew || '').toUpperCase().trim();
          const targetMds = this.lockedMds.toUpperCase().trim();
          if (!crewName.includes(targetMds) && !targetMds.includes(crewName)) return;
        } else if (this.selectedMds !== 'ALL') {
          if (v.namaCrew !== this.selectedMds) return;
        }

        // Account filter
        if (this.selectedAccount !== 'ALL') {
          const selAcc = ApiService.normalizeAccount(this.selectedAccount);
          const itemAcc = ApiService.normalizeAccount(v.account);
          if (itemAcc !== selAcc && !itemAcc.includes(selAcc)) return;
        }

        // Store / Chiller Door Type Filter
        const normType = this.normalizeStoreType(v.tipeToko, v.namaToko, v.account, v.kodeToko);
        v._normType = normType;
        if (this.selectedDoorType !== 'ALL') {
          if (normType.doorCategory !== this.selectedDoorType) return;
        }

        // Search query
        if (this.searchQuery) {
          const q = this.searchQuery.toUpperCase();
          const match = `${v.namaToko} ${v.kodeToko} ${v.namaCrew} ${v.account} ${v.tipeToko || ''} ${normType.cleanCode || ''}`.toUpperCase();
          if (!match.includes(q)) return;
        }

        list.push(v);
      });
      return list;
    },

    /**
     * Kunci Toko Unik dari Hasil Filter Kunjungan
     */
    get filteredStoreKeys() {
      return this.filteredVisits.map(v => v.idVisit || `${v.kodeToko}_${v.namaToko}`);
    },

    /**
     * Total Halaman Toko (5 Toko per Halaman)
     */
    get totalStorePages() {
      return Math.max(1, Math.ceil(this.filteredStoreKeys.length / this.storesPerPage));
    },

    /**
     * Kunjungan Toko yang Aktif di Halaman Saat Ini (Maksimal 5 Toko)
     */
    get pagedVisits() {
      if (this.groupBy === 'FLAT') return this.filteredVisits;
      const start = (this.storePage - 1) * this.storesPerPage;
      return this.filteredVisits.slice(start, start + this.storesPerPage);
    },

    /**
     * Objek Foto HANYA Dibentuk untuk 5 Toko yang Sedang Ditampilkan (Super Ringan)
     */
    get allPhotoItems() {
      const items = [];
      const visitsToProcess = this.pagedVisits;

      visitsToProcess.forEach(v => {
        const iso = this.normalizeIsoDate(v.date);
        const normType = v._normType || this.normalizeStoreType(v.tipeToko, v.namaToko, v.account, v.kodeToko);
        const visitId = v.idVisit || `${v.kodeToko}_${v.namaToko}`;

        // 1. Foto Before
        (v.fotoBefore || []).forEach((photoUrl, idx) => {
          const typeCode = `BEFORE_${idx + 1}`;
          const review = this.reviewsMap.get(`${visitId}_${typeCode}`) || this.reviewsMap.get(`${visitId}_BEFORE`);
          items.push({
            id: `${visitId}_${typeCode}`,
            idVisit: visitId,
            type: 'BEFORE',
            typeLabel: `Foto Before #${idx + 1}`,
            typeCode: typeCode,
            photoUrl: photoUrl,
            thumbUrl: ApiService.getThumbnailUrl(photoUrl, 250),
            hdUrl: ApiService.getHdPhotoUrl(photoUrl),
            date: v.date,
            iso: iso,
            time: v.time,
            modul: v.modul,
            account: v.account,
            kodeToko: v.kodeToko,
            namaToko: v.namaToko,
            tipeToko: v.tipeToko || '',
            normType: normType,
            namaCrew: v.namaCrew,
            review: review || null
          });
        });

        // 2. Foto After
        (v.fotoAfter || []).forEach((photoUrl, idx) => {
          const typeCode = `AFTER_${idx + 1}`;
          const review = this.reviewsMap.get(`${visitId}_${typeCode}`) || this.reviewsMap.get(`${visitId}_AFTER`);
          items.push({
            id: `${visitId}_${typeCode}`,
            idVisit: visitId,
            type: 'AFTER',
            typeLabel: `Foto After #${idx + 1}`,
            typeCode: typeCode,
            photoUrl: photoUrl,
            thumbUrl: ApiService.getThumbnailUrl(photoUrl, 250),
            hdUrl: ApiService.getHdPhotoUrl(photoUrl),
            date: v.date,
            iso: iso,
            time: v.time,
            modul: v.modul,
            account: v.account,
            kodeToko: v.kodeToko,
            namaToko: v.namaToko,
            tipeToko: v.tipeToko || '',
            normType: normType,
            namaCrew: v.namaCrew,
            review: review || null
          });
        });
      });

      return items;
    },

    /**
     * Filtered Photo Items by Type & Review Status
     */
    get filteredPhotos() {
      let data = this.allPhotoItems;

      // Photo Type Filter
      if (this.selectedPhotoType !== 'ALL') {
        data = data.filter(p => p.type === this.selectedPhotoType);
      }

      // Review Status Filter
      if (this.selectedReviewStatus === 'REVIEWED') {
        data = data.filter(p => p.review !== null);
      } else if (this.selectedReviewStatus === 'UNREVIEWED') {
        data = data.filter(p => p.review === null);
      } else if (this.selectedReviewStatus === 'COMPLIANT') {
        data = data.filter(p => p.review && p.review.skorPlanogram === 1);
      } else if (this.selectedReviewStatus === 'NON_COMPLIANT') {
        data = data.filter(p => p.review && p.review.skorPlanogram === 0);
      }

      return data;
    },

    /**
     * Hitung total foto sesuai filter tanpa unpack semua objek
     */
    get totalFilteredPhotosCount() {
      let count = 0;
      (this.filteredVisits || []).forEach(v => {
        count += (v.fotoBefore?.length || 0) + (v.fotoAfter?.length || 0);
      });
      return count;
    },

    /**
     * Paginated Photos (untuk FLAT view)
     */
    get paginatedPhotos() {
      const start = (this.currentPage - 1) * this.pageSize;
      return this.filteredPhotos.slice(start, start + this.pageSize);
    },

    /**
     * Data 5 Toko Komparasi Berdampingan (Side-by-Side BEFORE & AFTER per Toko)
     * Memastikan foto Before dan After untuk masing-masing toko selalu sejajar
     */
    get pagedStoresComparison() {
      const photos = this.filteredPhotos;
      return this.pagedVisits.map(v => {
        const visitKey = v.idVisit || `${v.kodeToko}_${v.namaToko}`;
        const storePhotos = photos.filter(p => (p.idVisit === v.idVisit || p.idVisit === visitKey));
        const beforePhotos = storePhotos.filter(p => p.type === 'BEFORE');
        const afterPhotos = storePhotos.filter(p => p.type === 'AFTER');

        return {
          idVisit: visitKey,
          namaToko: v.namaToko || 'Toko Tanpa Nama',
          kodeToko: v.kodeToko || '',
          account: v.account || 'LOKAL',
          tipeToko: v.tipeToko || '',
          normType: v._normType || this.normalizeStoreType(v.tipeToko, v.namaToko, v.account, v.kodeToko),
          modul: v.modul || '',
          time: v.time || '',
          date: v.date || '',
          namaCrew: v.namaCrew || '',
          beforePhotos: beforePhotos,
          afterPhotos: afterPhotos,
          totalPhotos: storePhotos.length
        };
      });
    },

    /**
     * Total Pages for Flat View Pagination
     */
    get totalPages() {
      return Math.max(1, Math.ceil(this.filteredPhotos.length / this.pageSize));
    },

    nextStorePage() {
      if (this.storePage < this.totalStorePages) {
        this.storePage++;
        this.scrollToGallery();
      }
    },

    prevStorePage() {
      if (this.storePage > 1) {
        this.storePage--;
        this.scrollToGallery();
      }
    },

    goToStorePage(page) {
      if (page >= 1 && page <= this.totalStorePages) {
        this.storePage = page;
        this.scrollToGallery();
      }
    },

    scrollToGallery() {
      const el = document.getElementById('gallery-sections-container');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    setGroupBy(mode) {
      this.groupBy = mode;
      localStorage.setItem('gallery_group_by', mode);
      this.currentPage = 1;
      this.storePage = 1;
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    isSectionCollapsed(key) {
      if (this.groupBy === 'FLAT') return false;
      // Default terbuka (open) untuk semua mode grouping
      return this.expandedSections[key] === false;
    },

    toggleSection(key) {
      const isCurrentlyCollapsed = this.isSectionCollapsed(key);
      this.expandedSections[key] = isCurrentlyCollapsed ? true : false;
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    collapseAllSections() {
      this.expandedSections = {};
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    expandAllSections() {
      const state = {};
      this.groupedPhotoSections.forEach(s => {
        state[s.key] = true;
      });
      this.expandedSections = state;
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    /**
     * List of Available MDS / Crew based on current date & modul filters (for the Dropdown)
     */
    get availableMdsList() {
      const mdsMap = new Map();
      (this.visits || []).forEach(v => {
        const iso = this.normalizeIsoDate(v.date);
        
        // Date filter
        if (this.dateFilter === 'LATEST_DAY' && this.visits.length > 0) {
          if (iso !== this.normalizeIsoDate(this.visits[0].date)) return;
        } else if (this.dateFilter === 'TODAY') {
          if (iso !== new Date().toISOString().slice(0, 10)) return;
        } else if (this.dateFilter === 'YESTERDAY') {
          if (iso !== new Date(Date.now() - 86400000).toISOString().slice(0, 10)) return;
        } else if ((this.dateFilter === 'CUSTOM' || this.dateFilter === '7_DAYS' || this.dateFilter === 'THIS_MONTH') && this.startDate && this.endDate) {
          if (iso < this.startDate || iso > this.endDate) return;
        }

        // Modul filter
        if (this.selectedModul !== 'ALL') {
          if (this.selectedModul.length === 2 && !v.modul.startsWith(this.selectedModul)) return;
          if (this.selectedModul.length > 2 && v.modul !== this.selectedModul) return;
        }

        if (!v.namaCrew) return;
        const name = String(v.namaCrew).trim();
        if (!name) return;

        if (this.lockedMds) {
          const crewName = name.toUpperCase();
          const targetMds = this.lockedMds.toUpperCase();
          if (!crewName.includes(targetMds) && !targetMds.includes(crewName)) return;
        }

        if (!mdsMap.has(name)) {
          mdsMap.set(name, {
            name: name,
            modul: v.modul,
            storesCount: 0,
            photoCount: 0
          });
        }
        const item = mdsMap.get(name);
        item.storesCount++;
        item.photoCount += (v.fotoBefore?.length || 0) + (v.fotoAfter?.length || 0);
      });

      return Array.from(mdsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    },

    /**
     * Group Photos dynamically (Supports 2-Level Grouping: MDS -> Toko -> Photos)
     */
    get groupedPhotoSections() {
      if (this.groupBy === 'FLAT') {
        const photos = this.filteredPhotos;
        return [{
          key: 'ALL_PHOTOS',
          title: 'Semua Foto Pajangan',
          subtitle: `${photos.length} Total Foto Display Sesuai Filter`,
          badge: `${photos.length} Foto`,
          totalStores: new Set(photos.map(p => p.kodeToko).filter(Boolean)).size,
          totalPhotos: photos.length,
          complianceRate: this.scorecard.complianceRate,
          stores: []
        }];
      }

      // Mode TYPE: 1 seksi langsung tanpa header accordion
      if (this.groupBy === 'TYPE') {
        return [{
          key: 'TYPE_ALL',
          title: '',
          subtitle: '',
          badge: '',
          totalStores: this.pagedStoresComparison.length,
          totalPhotos: this.pagedStoresComparison.reduce((sum, s) => sum + s.totalPhotos, 0),
          complianceRate: null,
          stores: this.pagedStoresComparison
        }];
      }

      // Mode Berkelompok (CHILLER, ACCOUNT, CREW, MODUL): Mengelompokkan pagedStoresComparison
      const map = new Map();

      this.pagedStoresComparison.forEach(store => {
        let groupKey = '';
        let title = '';
        let subtitle = '';
        let badge = '';

        if (this.groupBy === 'ACCOUNT') {
          groupKey = (store.account || 'OTHER').toUpperCase();
          title = `Akun ${store.account || 'Lainnya'}`;
          subtitle = `Jaringan Toko Retail • ${store.date || ''}`;
          badge = store.account || 'ACCOUNT';
        } else if (this.groupBy === 'CHILLER' || this.groupBy === 'DOOR_TYPE') {
          const cat = store.normType?.doorCategory || 'OTHER';
          const label = store.normType?.doorLabel || 'Lainnya';
          groupKey = cat;
          title = `🚪 Grup ${label}`;
          subtitle = `Dokumentasi Visual Rak ${label}`;
          badge = label;
        } else if (this.groupBy === 'CREW') {
          groupKey = (store.namaCrew || 'LAINNYA').toUpperCase();
          title = store.namaCrew || 'MDS Tanpa Nama';
          subtitle = `Petugas Display • Wilayah ${store.modul || '-'}`;
          badge = store.modul || 'MDS';
        } else if (this.groupBy === 'MODUL') {
          groupKey = (store.modul || 'LAINNYA').toUpperCase();
          title = `Modul ${store.modul || 'Lainnya'}`;
          subtitle = `Wilayah Operasional Retail Cimory`;
          badge = store.modul || 'MODUL';
        }

        if (!map.has(groupKey)) {
          map.set(groupKey, {
            key: groupKey,
            title: title,
            subtitle: subtitle,
            badge: badge,
            totalStores: 0,
            totalPhotos: 0,
            stores: []
          });
        }

        const sec = map.get(groupKey);
        sec.totalStores++;
        sec.totalPhotos += store.totalPhotos;
        sec.stores.push(store);
      });

      return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
    },

    /**
     * Executive Compliance Scorecard Calculation
     */
    get scorecard() {
      const visits = this.filteredVisits;
      let totalPhotos = 0;
      let totalBefore = 0;
      let totalAfter = 0;
      let reviewedCount = 0;
      let compliantCount = 0;
      let nonCompliantCount = 0;
      const accountMap = {};
      const uniqueStores = new Set();

      visits.forEach(v => {
        if (v.kodeToko) uniqueStores.add(v.kodeToko);
        const befores = v.fotoBefore || [];
        const afters = v.fotoAfter || [];
        totalPhotos += befores.length + afters.length;
        totalBefore += befores.length;
        totalAfter += afters.length;

        const acc = ApiService.normalizeAccount(v.account);
        if (!accountMap[acc]) {
          accountMap[acc] = { totalBefore: 0, reviewed: 0, compliant: 0 };
        }
        accountMap[acc].totalBefore += befores.length;

        befores.forEach((_, idx) => {
          const typeCode = `BEFORE_${idx + 1}`;
          const review = this.reviewsMap.get(`${v.idVisit}_${typeCode}`) || this.reviewsMap.get(`${v.idVisit}_BEFORE`);
          if (review) {
            reviewedCount++;
            accountMap[acc].reviewed++;
            if (review.skorPlanogram === 1) {
              compliantCount++;
              accountMap[acc].compliant++;
            } else {
              nonCompliantCount++;
            }
          }
        });
      });

      const complianceRate = reviewedCount > 0
        ? Math.round((compliantCount / reviewedCount) * 100)
        : 0;

      const accountStats = Object.keys(accountMap).map(acc => {
        const st = accountMap[acc];
        const rate = st.reviewed > 0 ? Math.round((st.compliant / st.reviewed) * 100) : 0;
        return {
          account: acc,
          totalBefore: st.totalBefore,
          reviewed: st.reviewed,
          compliant: st.compliant,
          rate: rate
        };
      }).sort((a, b) => b.totalBefore - a.totalBefore);

      return {
        totalStores: uniqueStores.size,
        totalPhotos: totalPhotos,
        totalBefore: totalBefore,
        totalAfter: totalAfter,
        reviewedCount: reviewedCount,
        compliantCount: compliantCount,
        nonCompliantCount: nonCompliantCount,
        complianceRate: complianceRate,
        accountStats: accountStats
      };
    },

    /**
     * Resolve image source dynamically (Handles both Direct URLs & AppSheet Relative Paths)
     */
    getPhotoSrc(item) {
      if (!item || !item.photoUrl) return SVG_FALLBACK;
      const clean = String(item.photoUrl).trim();
      
      // If direct CDN URL
      if (clean.startsWith('http://') || clean.startsWith('https://')) {
        return ApiService.getThumbnailUrl(clean, 250);
      }

      // If already resolved in memory or on item
      if (item.resolvedSrc) {
        return item.resolvedSrc;
      }
      if (this.resolvedImagesMap[clean]) {
        return this.resolvedImagesMap[clean];
      }

      // Trigger async resolution
      this.resolveAsyncImage(item, clean);
      return SVG_LOADING;
    },

    async resolveAsyncImage(item, path) {
      if (!path) return;
      if (!this.resolvingSet) this.resolvingSet = new Set();
      if (this.resolvingSet.has(path)) return;
      this.resolvingSet.add(path);

      try {
        const directUrl = await ApiService.resolveImage(path);
        const finalUrl = directUrl || SVG_FALLBACK;
        this.resolvedImagesMap[path] = finalUrl;
        if (item) {
          item.resolvedSrc = finalUrl;
          item.hdUrl = directUrl || '';
        }
        if (directUrl) {
          this.saveResolvedImagesDebounced();
        }
      } catch (err) {
        this.resolvedImagesMap[path] = SVG_FALLBACK;
        if (item) item.resolvedSrc = SVG_FALLBACK;
      }
    },

    saveResolvedImagesDebounced() {
      if (this._saveTimer) clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => {
        try {
          const raw = JSON.parse(JSON.stringify(this.resolvedImagesMap || {}));
          GalleryDB.set('gallery_resolved_images', raw);
        } catch (e) {}
      }, 400);
    },

    /**
     * Coba Tarik Ulang Foto Tertentu (Bila Gagal/Timeout)
     */
    retryLoadPhoto(item) {
      if (!item || !item.photoUrl) return;
      const clean = String(item.photoUrl).trim();
      ApiService.memoryCache.delete('img_' + clean);
      delete this.resolvedImagesMap[clean];
      if (this.resolvingSet) this.resolvingSet.delete(clean);
      item.resolvedSrc = '';
      item.isError = false;
      this.resolveAsyncImage(item, clean);
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    /**
     * Modal Openers
     */
    async openPreviewModal(item) {
      this.resetPreviewZoom();
      let url = item.hdUrl || item.photoUrl;
      if (!url.startsWith('http')) {
        url = this.resolvedImagesMap[item.photoUrl] || await ApiService.resolveImage(item.photoUrl);
      }
      const typeBadgeStr = item.normType && item.normType.cleanCode ? ` • 🧊 ${item.normType.cleanCode}` : '';
      this.previewModal = {
        isOpen: true,
        title: `${item.namaToko} (${item.account || 'Toko'})${typeBadgeStr}`,
        subtitle: `${item.typeLabel} • ${item.date} ${item.time} • MDS: ${item.namaCrew}`,
        photoUrl: url,
        photoType: item.type,
        reviewInfo: item.review,
        visitInfo: item,
        zoom: 1,
        panX: 0,
        panY: 0,
        rotation: 0,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0
      };
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    closePreviewModal() {
      this.previewModal.isOpen = false;
      this.resetPreviewZoom();
    },

    zoomInPreview() {
      const newZoom = Math.min(5, Math.round((this.previewModal.zoom + 0.3) * 10) / 10);
      this.previewModal.zoom = newZoom;
    },

    zoomOutPreview() {
      const newZoom = Math.max(1, Math.round((this.previewModal.zoom - 0.3) * 10) / 10);
      this.previewModal.zoom = newZoom;
      if (newZoom === 1) {
        this.previewModal.panX = 0;
        this.previewModal.panY = 0;
      }
    },

    resetPreviewZoom() {
      this.previewModal.zoom = 1;
      this.previewModal.panX = 0;
      this.previewModal.panY = 0;
      this.previewModal.rotation = 0;
      this.previewModal.isDragging = false;
    },

    rotatePreview() {
      this.previewModal.rotation = (this.previewModal.rotation + 90) % 360;
    },

    togglePreviewZoom() {
      if (this.previewModal.zoom > 1) {
        this.resetPreviewZoom();
      } else {
        this.previewModal.zoom = 2.2;
      }
    },

    handlePreviewWheel(e) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.25 : -0.25;
      const newZoom = Math.min(5, Math.max(1, Math.round((this.previewModal.zoom + delta) * 10) / 10));
      this.previewModal.zoom = newZoom;
      if (newZoom === 1) {
        this.previewModal.panX = 0;
        this.previewModal.panY = 0;
      }
    },

    startPreviewDrag(e) {
      if (this.previewModal.zoom <= 1) return;
      this.previewModal.isDragging = true;
      const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      this.previewModal.dragStartX = clientX - this.previewModal.panX;
      this.previewModal.dragStartY = clientY - this.previewModal.panY;
    },

    onPreviewDrag(e) {
      if (!this.previewModal.isDragging || this.previewModal.zoom <= 1) return;
      const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : null);
      const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : null);
      if (clientX === null || clientY === null) return;
      this.previewModal.panX = clientX - this.previewModal.dragStartX;
      this.previewModal.panY = clientY - this.previewModal.dragStartY;
    },

    endPreviewDrag() {
      this.previewModal.isDragging = false;
    },

    downloadPreviewPhoto() {
      if (!this.previewModal.photoUrl) return;
      const a = document.createElement('a');
      a.href = this.previewModal.photoUrl;
      a.target = '_blank';
      a.download = `Foto_Pajangan_${(this.previewModal.title || 'Foto').replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },

    formatReviewTime(ts) {
      if (!ts) return '';
      try {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        return '';
      }
    },

    async openReviewModal(item) {
      if (!this.canReview && !item.review) {
        alert('Hanya SPV dan Manajemen yang memiliki hak akses untuk memberikan penilaian audit.');
        return;
      }

      const existing = item.review;
      const revName = CONFIG.REVIEWERS.find(r => r.id === this.activeReviewer)?.name || 'SPV';

      let previewPhoto = item.hdUrl || item.photoUrl;
      if (!previewPhoto.startsWith('http')) {
        previewPhoto = this.resolvedImagesMap[item.photoUrl] || await ApiService.resolveImage(item.photoUrl);
      }

      this.reviewModal = {
        isOpen: true,
        isReadOnly: !this.canReview,
        photoItem: { ...item, previewUrl: previewPhoto },
        skorPlanogram: existing ? existing.skorPlanogram : 1,
        ceklisPricetag: existing ? Boolean(existing.ceklisPricetag) : false,
        ceklisPosm: existing ? Boolean(existing.ceklisPosm) : false,
        catatan: existing ? existing.catatan : '',
        reviewerName: existing ? existing.reviewer : (this.currentUser?.displayName || this.currentUser?.name || revName),
        reviewTime: existing?.timestamp ? this.formatReviewTime(existing.timestamp) : '',
        isSaving: false
      };
    },

    /**
     * Submit / Save Review
     */
    async submitReview() {
      if (!this.canReview) {
        alert('Akses Ditolak: Anda tidak memiliki wewenang untuk mengubah atau menyimpan penilaian display.');
        return;
      }

      const m = this.reviewModal;
      if (!m.photoItem) return;

      m.isSaving = true;

      const payload = {
        idVisit: m.photoItem.idVisit,
        tanggal: m.photoItem.date,
        modul: m.photoItem.modul,
        account: m.photoItem.account,
        kodeToko: m.photoItem.kodeToko,
        namaToko: m.photoItem.namaToko,
        tipeFoto: m.photoItem.typeCode || m.photoItem.type,
        urlFoto: m.photoItem.photoUrl,
        skorPlanogram: m.skorPlanogram,
        ceklisPricetag: m.ceklisPricetag ? 'YA' : 'TIDAK',
        ceklisPosm: m.ceklisPosm ? 'YA' : 'TIDAK',
        reviewer: m.reviewerName,
        catatan: m.catatan
      };

      // Optimistic Update locally
      const reviewObj = {
        timestamp: new Date().toISOString(),
        ...payload,
        ceklisPricetag: m.ceklisPricetag,
        ceklisPosm: m.ceklisPosm
      };

      const key = `${payload.idVisit}_${payload.tipeFoto}`;
      this.reviewsMap.set(key, reviewObj);

      // Also set generic type key as fallback
      this.reviewsMap.set(`${payload.idVisit}_${m.photoItem.type}`, reviewObj);

      // Async write to Google Spreadsheet
      await ApiService.saveReview(payload);

      // Update cached reviews in IndexedDB
      const updatedReviews = Array.from(this.reviewsMap.values());
      await GalleryDB.set('gallery_reviews', updatedReviews);

      m.isSaving = false;
      m.isOpen = false;

      this.$nextTick(() => {
        if (window.lucide) lucide.createIcons();
      });
    },

    /**
     * Export Scorecard to CSV (Ready for Key Account Manager / Excel)
     */
    exportScorecardCsv() {
      const sc = this.scorecard;
      let csv = 'Rekap Kepatuhan Planogram Display Cimory\n';
      csv += `Periode: ${this.activeDateLabel}\n`;
      csv += `Overall Compliance Rate: ${sc.complianceRate}%\n\n`;
      csv += 'Account,Total Foto Before,Foto Dinilai,Sesuai (Skor 1),Tidak Sesuai (Skor 0),% Compliance\n';

      sc.accountStats.forEach(acc => {
        csv += `"${acc.account}",${acc.totalBefore},${acc.reviewed},${acc.compliant},${acc.reviewed - acc.compliant},${acc.rate}%\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Cimory_Planogram_Compliance_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    },

    /**
     * Buka Modal Export Excel dengan Foto Tertanam
     */
    openExportModal() {
      this.exportModal.isOpen = true;
      this.exportModal.modul = this.selectedModul || 'ALL';
      this.exportModal.account = this.selectedAccount || 'ALL';
      this.exportModal.doorType = this.selectedDoorType || 'ALL';
      this.exportModal.dateFilter = 'CURRENT'; // Default: Sesuai filter di layar
      this.exportModal.photoSelection = 'ALL';
      this.exportModal.storeLimit = 25; // default aman 25 toko
      this.exportModal.isExporting = false;
      this.exportModal.progressPercent = 0;
      this.exportModal.progressText = '';
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    /**
     * Daftar Toko Target Sesuai Filter di Modal Export
     */
    get exportTargetStores() {
      const em = this.exportModal;
      let candidates = [];

      // 1. Jika mode CURRENT dan filter modal sama persis dengan galeri, gunakan filteredVisits
      const isExactGalleryMatch = (
        em.dateFilter === 'CURRENT' &&
        em.modul === this.selectedModul &&
        em.account === this.selectedAccount &&
        em.doorType === this.selectedDoorType
      );

      if (isExactGalleryMatch && this.filteredVisits && this.filteredVisits.length > 0) {
        candidates = this.filteredVisits;
      } else {
        const visits = this.visits || [];
        const now = new Date();
        const nowIso = now.toISOString().slice(0, 10);
        const ym = nowIso.slice(0, 7);

        visits.forEach(v => {
          const iso = this.normalizeIsoDate(v.date);

          // Date filter
          if (em.dateFilter === 'CURRENT') {
            const currentLatest = this.normalizeIsoDate(visits[0]?.date);
            if (this.dateFilter === 'LATEST_DAY' && iso !== currentLatest) return;
            if (this.dateFilter === 'TODAY' && iso !== nowIso) return;
            if (this.startDate && this.endDate && (iso < this.startDate || iso > this.endDate)) return;
          } else if (em.dateFilter === 'ALL') {
            // Loloskan semua tanggal
          } else if (em.dateFilter === 'LATEST_DAY' && visits.length > 0) {
            const latestIso = this.normalizeIsoDate(visits[0]?.date);
            if (iso !== latestIso) return;
          } else if (em.dateFilter === 'TODAY') {
            if (iso !== nowIso) return;
          } else if (em.dateFilter === 'YESTERDAY') {
            const yIso = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            if (iso !== yIso) return;
          } else if (em.dateFilter === 'THIS_MONTH') {
            if (!iso.startsWith(ym)) return;
          } else if (em.dateFilter === '7_DAYS') {
            const past7Iso = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
            if (iso < past7Iso) return;
          }

          // Modul filter
          if (em.modul !== 'ALL') {
            if (em.modul.length === 2 && !v.modul.startsWith(em.modul)) return;
            if (em.modul.length > 2 && v.modul !== em.modul) return;
          }

          // Account filter
          if (em.account !== 'ALL') {
            const selAcc = ApiService.normalizeAccount(em.account);
            const itemAcc = ApiService.normalizeAccount(v.account);
            if (itemAcc !== selAcc && !itemAcc.includes(selAcc)) return;
          }

          // Door / Chiller filter
          const normType = v._normType || this.normalizeStoreType(v.tipeToko, v.namaToko, v.account, v.kodeToko);
          v._normType = normType;
          if (em.doorType !== 'ALL') {
            if (normType.doorCategory !== em.doorType) return;
          }

          candidates.push(v);
        });
      }

      // Filter ketersediaan foto berdasarkan pilihan format foto
      const result = [];
      candidates.forEach(v => {
        const befores = v.fotoBefore || [];
        const afters = v.fotoAfter || [];
        if (em.photoSelection === 'BEFORE' && befores.length === 0) return;
        if (em.photoSelection === 'AFTER' && afters.length === 0) return;
        if (em.photoSelection === 'ALL' && befores.length === 0 && afters.length === 0) return;

        result.push(v);
      });

      if (em.storeLimit && em.storeLimit > 0) {
        return result.slice(0, em.storeLimit);
      }
      return result;
    },

    /**
     * Estimasi Total Foto yang akan Diexport
     */
    get exportEstimatedPhotosCount() {
      const stores = this.exportTargetStores;
      const ps = this.exportModal.photoSelection;
      let count = 0;
      stores.forEach(st => {
        const bLen = st.fotoBefore?.length || 0;
        const aLen = st.fotoAfter?.length || 0;
        if (ps === 'ALL') count += (bLen + aLen);
        else if (ps === 'BEFORE') count += bLen;
        else if (ps === 'AFTER') count += aLen;
      });
      return count;
    },

    /**
     * Eksekusi Export Excel dengan Foto Tertanam via ExcelJS
     */
    async startExcelExport() {
      if (typeof ExcelJS === 'undefined') {
        alert('Library ExcelJS belum siap. Pastikan koneksi internet aktif lalu refresh halaman.');
        return;
      }

      const stores = this.exportTargetStores;
      if (stores.length === 0) {
        alert('Tidak ada toko yang sesuai dengan filter export.');
        return;
      }

      const em = this.exportModal;
      em.isExporting = true;
      em.progressPercent = 5;
      em.progressText = `Menyiapkan berkas Excel untuk ${stores.length} toko...`;

      try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Cimory Retail Operations';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Laporan Foto Display', {
          views: [{ showGridLines: true }]
        });

        // Tentukan Kolom Berdasarkan Pilihan Foto
        const cols = [
          { header: 'No', key: 'no', width: 6 },
          { header: 'Tanggal', key: 'tanggal', width: 14 },
          { header: 'Waktu', key: 'waktu', width: 10 },
          { header: 'Modul', key: 'modul', width: 10 },
          { header: 'Account', key: 'account', width: 14 },
          { header: 'Kode Toko', key: 'kodeToko', width: 12 },
          { header: 'Nama Toko', key: 'namaToko', width: 28 },
          { header: 'Tipe Chiller', key: 'tipeChiller', width: 18 },
          { header: 'MDS / Crew', key: 'crew', width: 22 }
        ];

        // Hitung kebutuhan kolom foto secara dinamis sesuai foto terbanyak di toko-toko terpilih
        let maxBefore = 0;
        let maxAfter = 0;
        stores.forEach(st => {
          maxBefore = Math.max(maxBefore, st.fotoBefore?.length || 0);
          maxAfter = Math.max(maxAfter, st.fotoAfter?.length || 0);
        });

        const beforeColMeta = [];
        if (em.photoSelection === 'ALL' || em.photoSelection === 'BEFORE') {
          const limitBefore = Math.max(maxBefore, 1);
          for (let b = 1; b <= limitBefore; b++) {
            beforeColMeta.push({ colIdx: cols.length, key: `before_${b}`, num: b });
            cols.push({ header: `Foto Before ${b}`, key: `before_${b}`, width: 20 });
          }
        }

        const afterColMeta = [];
        if (em.photoSelection === 'ALL' || em.photoSelection === 'AFTER') {
          const limitAfter = Math.max(maxAfter, 1);
          for (let a = 1; a <= limitAfter; a++) {
            afterColMeta.push({ colIdx: cols.length, key: `after_${a}`, num: a });
            cols.push({ header: `Foto After ${a}`, key: `after_${a}`, width: 20 });
          }
        }

        cols.push({ header: 'Status Planogram', key: 'status', width: 18 });
        cols.push({ header: 'Catatan Reviewer', key: 'catatan', width: 30 });

        worksheet.columns = cols;

        // Styling Header (Cimory Navy Blue)
        const headerRow = worksheet.getRow(1);
        headerRow.height = 30;
        headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        headerRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF004880' }
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            bottom: { style: 'medium', color: { argb: 'FF002040' } },
            right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
          };
        });

        // Cache & Canvas fallback untuk mencegah Google 429 Too Many Requests
        const imgBufferCache = new Map();

        const loadImageViaCanvas = (src) => {
          return new Promise((resolve) => {
            const img = new Image();
            img.referrerPolicy = 'no-referrer';
            img.crossOrigin = 'anonymous';
            const timer = setTimeout(() => resolve(null), 6000);
            img.onload = () => {
              clearTimeout(timer);
              try {
                const canvas = document.createElement('canvas');
                const maxDim = 300;
                const scale = Math.min(1, maxDim / Math.max(img.width || 300, img.height || 300));
                canvas.width = Math.round((img.width || 300) * scale);
                canvas.height = Math.round((img.height || 300) * scale);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                resolve(dataUrl);
              } catch (e) {
                resolve(null);
              }
            };
            img.onerror = () => {
              clearTimeout(timer);
              resolve(null);
            };
            img.src = src;
          });
        };

        const cdnHosts = ['lh3', 'lh4', 'lh5', 'lh6'];
        let cdnHostIdx = 0;

        const fetchImageBuffer = async (rawUrl) => {
          if (!rawUrl) return null;
          let direct = ApiService.getThumbnailUrl(rawUrl, 300);
          if (!direct || !direct.startsWith('http')) {
            direct = this.resolvedImagesMap[rawUrl] || await ApiService.resolveImage(rawUrl);
            if (direct) direct = ApiService.getThumbnailUrl(direct, 300);
          }
          if (!direct || !direct.startsWith('http')) return null;

          if (imgBufferCache.has(direct)) {
            return imgBufferCache.get(direct);
          }

          const fileId = ApiService.extractDriveId(direct);
          const host = cdnHosts[cdnHostIdx % cdnHosts.length];
          cdnHostIdx++;

          const directCdnUrl = fileId
            ? `https://${host}.googleusercontent.com/d/${fileId}=w280-h280-n-k`
            : direct;

          const testUrls = [
            directCdnUrl,
            `https://wsrv.nl/?url=${encodeURIComponent(directCdnUrl)}`
          ];

          // Percobaan fetch (dengan 1x auto-retry jika koneksi Google Drive sempat cegukan)
          for (let retry = 0; retry < 2; retry++) {
            for (let u = 0; u < testUrls.length; u++) {
              const testUrl = testUrls[u];
              try {
                await new Promise(r => setTimeout(r, 60));

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 7000);
                const resp = await fetch(testUrl, {
                  signal: controller.signal,
                  referrerPolicy: 'no-referrer',
                  mode: 'cors'
                });
                clearTimeout(timeoutId);

                if (resp.status === 429) continue;

                if (resp.ok) {
                  const buf = await resp.arrayBuffer();
                  const resObj = { buffer: buf, directUrl: direct };
                  imgBufferCache.set(direct, resObj);
                  return resObj;
                }
              } catch (e) {}
            }
            if (retry === 0) await new Promise(r => setTimeout(r, 200));
          }

          // Fallback 2: Muat via HTML5 Canvas
          try {
            const base64Data = await loadImageViaCanvas(directCdnUrl) || await loadImageViaCanvas(`https://wsrv.nl/?url=${encodeURIComponent(directCdnUrl)}`);
            if (base64Data) {
              const resObj = { base64: base64Data, directUrl: direct };
              imgBufferCache.set(direct, resObj);
              return resObj;
            }
          } catch (e) {}

          return { failed: true, directUrl: direct };
        };

        const totalStores = stores.length;

        // Pastikan nama toko resmi ter-resolve dari master database nasional
        if (window.ApiService && ApiService.enrichStoreNames) {
          em.progressText = 'Menyelaraskan nama resmi toko dari master database...';
          await ApiService.enrichStoreNames(stores);
        }

        // Tambahkan baris per toko
        for (let i = 0; i < totalStores; i++) {
          const st = stores[i];
          const rowNum = i + 2; // Baris Excel (1-based, baris 1 header)

          // Data Review SPV
          const rev = this.reviewsMap.get(`${st.idVisit}_BEFORE_1`) || this.reviewsMap.get(`${st.idVisit}_BEFORE`);
          let statusText = 'Belum Dinilai';
          if (rev) {
            statusText = rev.skorPlanogram === 1 ? '✅ Sesuai' : '❌ Tidak Sesuai';
          }

          const officialName = ApiService.masterStoreNameMap?.get(st.kodeToko) || st.namaToko || '';

          const rowData = {
            no: i + 1,
            tanggal: st.date || '',
            waktu: st.time || '',
            modul: st.modul || '',
            account: st.account || '',
            kodeToko: st.kodeToko || '',
            namaToko: officialName,
            tipeChiller: st._normType?.cleanCode || st.tipeToko || '-',
            crew: st.namaCrew || '',
            status: statusText,
            catatan: rev?.catatan || ''
          };

          const row = worksheet.addRow(rowData);
          row.height = 85; // Ditinggikan agar foto muat
          row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

          row.getCell('namaToko').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          row.getCell('crew').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          row.getCell('catatan').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

          // Foto Before & After secara dinamis sesuai jumlah foto toko ini
          const befores = st.fotoBefore || [];
          const afters = st.fotoAfter || [];

          const photoTasks = [];

          beforeColMeta.forEach((cm, idx) => {
            if (befores[idx]) {
              photoTasks.push({ url: befores[idx], col: cm.colIdx, key: cm.key });
            }
          });

          afterColMeta.forEach((cm, idx) => {
            if (afters[idx]) {
              photoTasks.push({ url: afters[idx], col: cm.colIdx, key: cm.key });
            }
          });

          // Unduh dan sematkan foto-foto untuk baris ini
          for (const task of photoTasks) {
            const imgData = await fetchImageBuffer(task.url);
            const fallbackLink = imgData?.directUrl || ApiService.getThumbnailUrl(task.url, 800) || task.url;

            if (imgData && (imgData.buffer || imgData.base64)) {
              try {
                const addOpts = imgData.buffer
                  ? { buffer: imgData.buffer, extension: 'jpeg' }
                  : { base64: imgData.base64, extension: 'jpeg' };
                const imgId = workbook.addImage(addOpts);
                // Letakkan di cell: tl col & row (0-indexed)
                worksheet.addImage(imgId, {
                  tl: { col: task.col, row: rowNum - 1 + 0.05 },
                  ext: { width: 105, height: 105 }
                });
              } catch (err) {
                const cell = row.getCell(task.key);
                cell.value = { text: '🔗 Buka Foto', hyperlink: fallbackLink };
                cell.font = { color: { argb: 'FF0284C7' }, underline: true };
              }
            } else {
              // Jika rate limit Google 429 atau gagal render, sematkan hyperlink langsung ke foto
              const cell = row.getCell(task.key);
              cell.value = { text: '🔗 Buka Foto', hyperlink: fallbackLink };
              cell.font = { color: { argb: 'FF0284C7' }, underline: true };
            }
          }

          // Update Progress
          const pct = Math.min(95, Math.round(((i + 1) / totalStores) * 90) + 5);
          em.progressPercent = pct;
          em.progressText = `Memproses foto toko ${i + 1} dari ${totalStores} (${st.namaToko})...`;
        }

        em.progressPercent = 98;
        em.progressText = 'Mengompresi & menyimpan berkas Excel...';

        // Tulis buffer dan unduh
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const dateTag = new Date().toISOString().slice(0, 10);
        link.download = `Laporan_Display_Cimory_${dateTag}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        em.progressPercent = 100;
        em.progressText = 'Selesai! Berkas Excel berhasil diunduh.';

        setTimeout(() => {
          em.isExporting = false;
          em.isOpen = false;
        }, 1200);

      } catch (err) {
        console.error('Export Excel failed:', err);
        alert('Gagal mengekspor Excel: ' + (err.message || err));
        em.isExporting = false;
      }
    }
  };
}

window.galleryApp = galleryApp;
