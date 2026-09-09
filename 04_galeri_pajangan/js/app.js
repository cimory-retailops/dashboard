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

    // Filters
    selectedModul: 'ALL',
    selectedMds: 'ALL', // 'ALL' | specific MDS name
    selectedAccount: 'ALL',
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

    // Modals
    reviewModal: {
      isOpen: false,
      photoItem: null,
      skorPlanogram: 1,
      ceklisPricetag: true,
      ceklisPosm: true,
      catatan: '',
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

    /**
     * App Initialization
     */
    async initApp() {
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
        this.visits = cachedVisits;
        this.reviews = cachedReviews || [];
        this.indexReviews();
        this.isLoading = false;
        this.updateActiveDateLabel();
        
        // Refresh in background
        this.refreshData(false);
      } else {
        await this.refreshData(true);
      }

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

        this.visits = visitsData || [];
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
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
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
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    clearSearch() {
      this.searchInputText = '';
      this.searchQuery = '';
      this.currentPage = 1;
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    /**
     * Flatten Visits into Individual Photo Units for the Gallery Grid
     */
    get allPhotoItems() {
      const items = [];

      (this.visits || []).forEach(v => {
        const iso = this.normalizeIsoDate(v.date);
        
        // Date filtering
        if (this.dateFilter === 'LATEST_DAY') {
          const latestIso = this.normalizeIsoDate(this.visits[0].date);
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
        if (this.selectedMds !== 'ALL') {
          if (v.namaCrew !== this.selectedMds) return;
        }

        // Account filter
        if (this.selectedAccount !== 'ALL') {
          if (!v.account.includes(this.selectedAccount)) return;
        }

        // Search query
        if (this.searchQuery) {
          const q = this.searchQuery.toUpperCase();
          const match = `${v.namaToko} ${v.kodeToko} ${v.namaCrew} ${v.account}`.toUpperCase();
          if (!match.includes(q)) return;
        }

        // 1. Process Foto Before
        (v.fotoBefore || []).forEach((photoUrl, idx) => {
          const typeCode = `BEFORE_${idx + 1}`;
          const review = this.reviewsMap.get(`${v.idVisit}_${typeCode}`) || this.reviewsMap.get(`${v.idVisit}_BEFORE`);
          items.push({
            id: `${v.idVisit}_${typeCode}`,
            idVisit: v.idVisit,
            type: 'BEFORE',
            typeLabel: `Foto Before #${idx + 1}`,
            typeCode: typeCode,
            photoUrl: photoUrl,
            thumbUrl: ApiService.getThumbnailUrl(photoUrl, 400),
            hdUrl: ApiService.getHdPhotoUrl(photoUrl),
            date: v.date,
            iso: iso,
            time: v.time,
            modul: v.modul,
            account: v.account,
            kodeToko: v.kodeToko,
            namaToko: v.namaToko,
            namaCrew: v.namaCrew,
            review: review || null
          });
        });

        // 2. Process Foto After
        (v.fotoAfter || []).forEach((photoUrl, idx) => {
          const typeCode = `AFTER_${idx + 1}`;
          const review = this.reviewsMap.get(`${v.idVisit}_${typeCode}`) || this.reviewsMap.get(`${v.idVisit}_AFTER`);
          items.push({
            id: `${v.idVisit}_${typeCode}`,
            idVisit: v.idVisit,
            type: 'AFTER',
            typeLabel: `Foto After #${idx + 1}`,
            typeCode: typeCode,
            photoUrl: photoUrl,
            thumbUrl: ApiService.getThumbnailUrl(photoUrl, 400),
            hdUrl: ApiService.getHdPhotoUrl(photoUrl),
            date: v.date,
            iso: iso,
            time: v.time,
            modul: v.modul,
            account: v.account,
            kodeToko: v.kodeToko,
            namaToko: v.namaToko,
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
     * Paginated Photos
     */
    get paginatedPhotos() {
      const start = (this.currentPage - 1) * this.pageSize;
      return this.filteredPhotos.slice(start, start + this.pageSize);
    },

    /**
     * Total Pages for Flat View Pagination
     */
    get totalPages() {
      return Math.max(1, Math.ceil(this.filteredPhotos.length / this.pageSize));
    },

    setGroupBy(mode) {
      this.groupBy = mode;
      localStorage.setItem('gallery_group_by', mode);
      this.currentPage = 1;
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    isSectionCollapsed(key) {
      // By default sections are collapsed (true) for speed & lightweight DOM, unless explicitly opened
      if (this.groupBy === 'FLAT') return false;
      return !Boolean(this.expandedSections[key]);
    },

    toggleSection(key) {
      this.expandedSections[key] = !this.expandedSections[key];
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
      const photos = this.filteredPhotos;
      if (photos.length === 0) return [];

      if (this.groupBy === 'FLAT') {
        return [{
          key: 'ALL_PHOTOS',
          title: 'Semua Foto Pajangan',
          subtitle: `${photos.length} Total Foto Display Sesuai Filter`,
          badge: `${photos.length} Foto`,
          totalStores: new Set(photos.map(p => p.kodeToko).filter(Boolean)).size,
          totalPhotos: photos.length,
          reviewedBefore: photos.filter(p => p.type === 'BEFORE' && p.review !== null).length,
          compliantBefore: photos.filter(p => p.type === 'BEFORE' && p.review && p.review.skorPlanogram === 1).length,
          complianceRate: this.scorecard.complianceRate,
          stores: [{
            idVisit: 'ALL',
            namaToko: 'Semua Titik Toko',
            kodeToko: '',
            account: '',
            time: '',
            date: '',
            namaCrew: '',
            photos: this.paginatedPhotos
          }]
        }];
      }

      const map = new Map();

      photos.forEach(p => {
        let groupKey = '';
        let title = '';
        let subtitle = '';
        let badge = '';

        if (this.groupBy === 'TYPE') {
          groupKey = p.type;
          title = p.type === 'BEFORE' ? '📸 Grup Foto BEFORE (Sebelum Dirapikan)' : '✨ Grup Foto AFTER (Hasil Display)';
          subtitle = p.type === 'BEFORE' ? 'Evaluasi kesesuaian display awal toko terhadap planogram' : 'Dokumentasi visual rak toko setelah selesai dirapikan';
          badge = p.type;
        } else if (this.groupBy === 'ACCOUNT') {
          groupKey = (p.account || 'LAINNYA').toUpperCase();
          title = `Akun ${p.account || 'Lokal / Lainnya'}`;
          subtitle = `Jaringan Toko Retail • ${p.date}`;
          badge = p.account || 'ACCOUNT';
        } else if (this.groupBy === 'CREW') {
          groupKey = `${p.modul}_${p.namaCrew}`.toUpperCase();
          title = p.namaCrew || 'MDS Tanpa Nama';
          subtitle = `MDS Modul ${p.modul} • ${p.date}`;
          badge = p.modul;
        } else if (this.groupBy === 'MODUL') {
          groupKey = (p.modul || 'LAINNYA').toUpperCase();
          title = `Modul ${p.modul || 'Lainnya'}`;
          subtitle = `Wilayah Operasional • ${p.date}`;
          badge = p.modul;
        } else if (this.groupBy === 'TOKO') {
          groupKey = `${p.kodeToko}_${p.namaToko}`.toUpperCase();
          title = p.namaToko || 'Toko Tanpa Nama';
          subtitle = `${p.account || 'Account'} • Modul ${p.modul} • MDS: ${p.namaCrew}`;
          badge = p.account || 'TOKO';
        }

        if (!map.has(groupKey)) {
          map.set(groupKey, {
            key: groupKey,
            title: title,
            subtitle: subtitle,
            badge: badge,
            totalPhotos: 0,
            storesMap: new Map(),
            reviewedBefore: 0,
            compliantBefore: 0
          });
        }

        const sec = map.get(groupKey);
        sec.totalPhotos++;
        if (p.type === 'BEFORE' && p.review !== null) {
          sec.reviewedBefore++;
          if (p.review.skorPlanogram === 1) sec.compliantBefore++;
        }

        // Sub-group per Toko (Visit)
        const storeKey = p.idVisit || `${p.kodeToko}_${p.namaToko}`;
        if (!sec.storesMap.has(storeKey)) {
          sec.storesMap.set(storeKey, {
            idVisit: p.idVisit,
            namaToko: p.namaToko || 'Toko Tanpa Nama',
            kodeToko: p.kodeToko || '',
            account: p.account || 'LOKAL',
            modul: p.modul || '',
            time: p.time || '',
            date: p.date || '',
            namaCrew: p.namaCrew || '',
            photos: []
          });
        }
        sec.storesMap.get(storeKey).photos.push(p);
      });

      return Array.from(map.values()).map(sec => {
        const rate = sec.reviewedBefore > 0
          ? Math.round((sec.compliantBefore / sec.reviewedBefore) * 100)
          : null;

        const storesList = Array.from(sec.storesMap.values()).sort((a, b) => {
          return (a.time || '').localeCompare(b.time || '') || a.namaToko.localeCompare(b.namaToko);
        });

        return {
          key: sec.key,
          title: sec.title,
          subtitle: `${sec.subtitle} • ${storesList.length} Toko • ${sec.totalPhotos} Foto`,
          badge: sec.badge,
          totalStores: storesList.length,
          totalPhotos: sec.totalPhotos,
          reviewedBefore: sec.reviewedBefore,
          compliantBefore: sec.compliantBefore,
          complianceRate: rate,
          stores: storesList
        };
      }).sort((a, b) => a.title.localeCompare(b.title));
    },

    /**
     * Executive Compliance Scorecard Calculation
     */
    get scorecard() {
      const items = this.allPhotoItems;
      const totalPhotos = items.length;
      
      const uniqueStores = new Set(items.map(p => p.kodeToko).filter(Boolean)).size;

      // Only calculate compliance on reviewed Before photos (planogram baseline)
      const reviewedBefore = items.filter(p => p.type === 'BEFORE' && p.review !== null);
      const compliantBefore = reviewedBefore.filter(p => p.review.skorPlanogram === 1);
      const nonCompliantBefore = reviewedBefore.filter(p => p.review.skorPlanogram === 0);

      const complianceRate = reviewedBefore.length > 0
        ? Math.round((compliantBefore.length / reviewedBefore.length) * 100)
        : 0;

      // Account breakdown
      const accountMap = {};
      items.forEach(p => {
        const acc = p.account || 'LAINNYA';
        if (!accountMap[acc]) {
          accountMap[acc] = { totalBefore: 0, reviewed: 0, compliant: 0 };
        }
        if (p.type === 'BEFORE') {
          accountMap[acc].totalBefore++;
          if (p.review !== null) {
            accountMap[acc].reviewed++;
            if (p.review.skorPlanogram === 1) accountMap[acc].compliant++;
          }
        }
      });

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
        totalStores: uniqueStores,
        totalPhotos: totalPhotos,
        totalBefore: items.filter(p => p.type === 'BEFORE').length,
        totalAfter: items.filter(p => p.type === 'AFTER').length,
        reviewedCount: reviewedBefore.length,
        compliantCount: compliantBefore.length,
        nonCompliantCount: nonCompliantBefore.length,
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
        return ApiService.getThumbnailUrl(clean, 400);
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

      const directUrl = await ApiService.resolveImage(path);
      if (directUrl) {
        this.resolvedImagesMap = { ...this.resolvedImagesMap, [path]: directUrl };
        if (item) {
          item.resolvedSrc = directUrl;
          item.hdUrl = directUrl;
        }

        // Persist to IndexedDB cache debounced
        this.saveResolvedImagesDebounced();
      } else {
        if (item) item.resolvedSrc = SVG_FALLBACK;
      }
      this.resolvingSet.delete(path);
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
     * Modal Openers
     */
    async openPreviewModal(item) {
      this.resetPreviewZoom();
      let url = item.hdUrl || item.photoUrl;
      if (!url.startsWith('http')) {
        url = this.resolvedImagesMap[item.photoUrl] || await ApiService.resolveImage(item.photoUrl);
      }
      this.previewModal = {
        isOpen: true,
        title: `${item.namaToko} (${item.account || 'Toko'})`,
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

    async openReviewModal(item) {
      const existing = item.review;
      const revName = CONFIG.REVIEWERS.find(r => r.id === this.activeReviewer)?.name || 'SPV';

      let previewPhoto = item.hdUrl || item.photoUrl;
      if (!previewPhoto.startsWith('http')) {
        previewPhoto = this.resolvedImagesMap[item.photoUrl] || await ApiService.resolveImage(item.photoUrl);
      }

      this.reviewModal = {
        isOpen: true,
        photoItem: { ...item, previewUrl: previewPhoto },
        skorPlanogram: existing ? existing.skorPlanogram : 1,
        ceklisPricetag: existing ? existing.ceklisPricetag : true,
        ceklisPosm: existing ? existing.ceklisPosm : true,
        catatan: existing ? existing.catatan : '',
        reviewerName: revName,
        isSaving: false
      };
    },

    /**
     * Submit / Save Review
     */
    async submitReview() {
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
    }
  };
}

window.galleryApp = galleryApp;
