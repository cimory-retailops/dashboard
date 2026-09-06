/**
 * ==============================================================================
 * CIMORY MDS DASHBOARD - MAIN APPLICATION (ALPINE.JS CONTROLLER)
 * ==============================================================================
 */

function dashboardApp() {
  return {
    // UI & System State
    theme: localStorage.getItem('mds_theme') || 'dark',
    role: localStorage.getItem('mds_role') || 'admin', // 'admin' | 'mds'
    activeTab: 'kunjungan', // 'kunjungan' | 'absensi' | 'jadwal' | 'audit'
    isLoading: true,
    loadingMessage: 'Menghubungkan ke Database Central...',
    loadingStage: 1, // 1: Connecting, 2: Fetching, 3: Processing
    
    // Period & Archive
    selectedPeriod: 'LIVE', // 'LIVE' or fileId of monthly backup
    archiveList: [],

    // Filters
    selectedModul: 'ALL',
    dateFilter: 'LATEST_DAY', // 'LATEST_DAY' | 'TODAY' | '7_DAYS' | 'THIS_MONTH' | 'CUSTOM'
    activeDateLabel: '',
    startDate: '',
    endDate: '',
    selectedAccount: 'ALL',
    searchQuery: '',
    selectedCrew: '',

    // Raw Data Stores
    visits: [],
    absensi: [],
    masterToko: [],
    masterUser: [],
    crewModulMap: {},
    detailAudit: [],
    
    // Modals
    photoModal: {
      isOpen: false,
      title: '',
      photoSelfie: '',
      photoBefore: [],
      photoAfter: [],
      activePhotoUrl: '',
      activePhotoLabel: '',
      visitInfo: null
    },

    auditModal: {
      isOpen: false,
      tokoName: '',
      modul: '',
      items: [],
      isLoading: false
    },

    anomalyModal: {
      isOpen: false,
      activeTab: 'absen_no_visit',
      copiedSuccess: false
    },

    waReportModal: {
      isOpen: false,
      selectedRegion: 'JABODETABEK',
      reportType: 'ROUTE_ONLY', // 'ROUTE_ONLY' | 'FULL_OPS'
      isGenerating: false,
      copiedSuccess: false
    },

    // Pagination
    currentPage: 1,
    itemsPerPage: 15,

    /**
     * Save active dashboard state & data to IndexedDB
     * Allows seamless switching between WhatsApp and Dashboard without reload or data loss (>100MB capacity)
     */
    async saveSessionState() {
      try {
        const state = {
          selectedModul: this.selectedModul,
          selectedAccount: this.selectedAccount,
          selectedPeriod: this.selectedPeriod,
          dateFilter: this.dateFilter,
          startDate: this.startDate,
          endDate: this.endDate,
          activeTab: this.activeTab,
          waReportModal: {
            isOpen: this.waReportModal.isOpen,
            selectedRegion: this.waReportModal.selectedRegion
          },
          timestamp: Date.now()
        };

        if (window.DashboardDB) {
          await DashboardDB.set('app_state', state);
          if (this.visits && this.visits.length > 0) {
            await DashboardDB.set('visits_data', this.visits);
          }
          if (this.absensi && this.absensi.length > 0) {
            await DashboardDB.set('absensi_data', this.absensi);
          }
          if (this.masterToko && this.masterToko.length > 0) {
            await DashboardDB.set('master_toko', this.masterToko, 7 * 24 * 60 * 60 * 1000);
          }
          if (this.masterUser && this.masterUser.length > 0) {
            await DashboardDB.set('master_user', this.masterUser, 7 * 24 * 60 * 60 * 1000);
          }
          if (this.archiveList && this.archiveList.length > 0) {
            await DashboardDB.set('archive_list', this.archiveList);
          }
        }
      } catch (e) {
        console.warn('Gagal menyimpan cache IndexedDB:', e);
      }
    },

    /**
     * Restore state and dataset from IndexedDB instantly (< 15ms)
     */
    async restoreSessionState() {
      try {
        if (!window.DashboardDB) return false;
        const state = await DashboardDB.get('app_state', true);
        if (!state) return false;

        this.selectedModul = state.selectedModul || 'ALL';
        this.selectedAccount = state.selectedAccount || 'ALL';
        this.selectedPeriod = state.selectedPeriod || 'LIVE';
        this.dateFilter = state.dateFilter || 'LATEST_DAY';
        this.startDate = state.startDate || '';
        this.endDate = state.endDate || '';
        this.activeTab = state.activeTab || 'kunjungan';
        if (state.waReportModal) {
          this.waReportModal.isOpen = !!state.waReportModal.isOpen;
          this.waReportModal.selectedRegion = state.waReportModal.selectedRegion || 'JABODETABEK';
        }

        const [cachedVisits, cachedAbsensi, cachedMaster, cachedUsers, cachedArchives] = await Promise.all([
          DashboardDB.get('visits_data', true),
          DashboardDB.get('absensi_data', true),
          DashboardDB.get('master_toko', true),
          DashboardDB.get('master_user', true),
          DashboardDB.get('archive_list', true)
        ]);

        if (cachedVisits && cachedVisits.length > 0) {
          this.visits = cachedVisits;
          this.absensi = cachedAbsensi || [];
          this.masterToko = cachedMaster || [];
          this.masterUser = cachedUsers || [];
          this.archiveList = cachedArchives || [];
          this.updateCrewModulMap();
          this.indexDataStore();
          this.updateActiveDateLabel(this.visits);
          return true;
        }
        return false;
      } catch (e) {
        console.warn('Gagal membaca cache IndexedDB:', e);
        return false;
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
     * Initialize Application
     */
    async initApp() {
      this.initTheme();
      this.setDefaultDates();

      // Check if session can be restored instantly from IndexedDB (< 15ms) - Zero Loading Screen!
      const restored = await this.restoreSessionState();

      if (restored && this.visits.length > 0) {
        this.isLoading = false;
        this.currentPage = 1;
        this.dismissPreloader();

        this.$nextTick(() => {
          this.refreshCharts();
          if (window.lucide) lucide.createIcons();
          if (document.getElementById('visits-map')) {
            MapService.initMap('visits-map', this.theme === 'dark');
            MapService.renderVisitsOnMap(this.filteredVisits);
          }
        });

        // Load archive list in background
        this.loadArchiveMonths();
      } else {
        // Initial Fetch
        await this.refreshAllData(true);
        this.dismissPreloader();
        this.loadArchiveMonths();
      }

      // Setup Lucide icons
      this.$nextTick(() => {
        if (window.lucide) lucide.createIcons();
      });

      // Auto-save session state when user switches apps (e.g. to WhatsApp)
      window.addEventListener('pagehide', () => this.saveSessionState());
      window.addEventListener('beforeunload', () => this.saveSessionState());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.saveSessionState();
        }
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
      localStorage.setItem('mds_theme', this.theme);
      this.initTheme();
      this.refreshCharts();
      if (this.activeTab === 'kunjungan') {
        MapService.initMap('visits-map', this.theme === 'dark');
        MapService.renderVisitsOnMap(this.filteredVisits);
      }
    },

    toggleRole() {
      this.role = this.role === 'admin' ? 'mds' : 'admin';
      localStorage.setItem('mds_role', this.role);
    },

    setDefaultDates() {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      this.startDate = `${yyyy}-${mm}-${dd}`;
      this.endDate = `${yyyy}-${mm}-${dd}`;
    },

    /**
     * Load Monthly Archive List from Drive
     */
    async loadArchiveMonths() {
      try {
        const archives = await ApiService.getArchiveMonths();
        this.archiveList = archives || [];
      } catch (e) {
        console.warn('Gagal memuat daftar arsip Drive:', e);
      }
    },

    /**
     * Master Data Refresh Function
     */
    async refreshAllData(showLoader = true) {
      if (showLoader) {
        this.isLoading = true;
        this.loadingStage = 1;
        this.loadingMessage = 'Menghubungkan ke Central Cloud API...';
      }

      try {
        // Determine parameters based on filter
        let visitParams = {
          modul: this.selectedModul,
          limit: 3000
        };

        if (this.selectedPeriod === 'LIVE') {
          if (this.dateFilter === 'TODAY') {
            visitParams.date = 'TODAY';
          } else if ((this.dateFilter === 'YESTERDAY' || this.dateFilter === 'CUSTOM') && this.startDate && this.endDate) {
            visitParams.startDate = this.startDate;
            visitParams.endDate = this.endDate;
          }
          
          if (showLoader) {
            this.loadingStage = 2;
            this.loadingMessage = 'Mengunduh data Kunjungan, Absensi & Master Rute...';
          }

          // Master User & Master Toko static datasets - check in-memory or IndexedDB first
          let masterTokoPromise;
          if (this.masterToko && this.masterToko.length > 0) {
            masterTokoPromise = Promise.resolve(this.masterToko);
          } else if (window.DashboardDB) {
            masterTokoPromise = DashboardDB.get('master_toko', true).then(cached => {
              return (cached && cached.length > 0) ? cached : ApiService.getMasterToko({ modul: 'ALL' });
            });
          } else {
            masterTokoPromise = ApiService.getMasterToko({ modul: 'ALL' });
          }

          let masterUserPromise;
          if (this.masterUser && this.masterUser.length > 0) {
            masterUserPromise = Promise.resolve(this.masterUser);
          } else if (window.DashboardDB) {
            masterUserPromise = DashboardDB.get('master_user', true).then(cached => {
              return (cached && cached.length > 0) ? cached : ApiService.getMasterUser({ modul: 'ALL' });
            });
          } else {
            masterUserPromise = ApiService.getMasterUser({ modul: 'ALL' });
          }

          // Fetch Live Data in parallel
          const [visitsData, absensiData, masterTokoData, masterUserData] = await Promise.all([
            ApiService.getVisits(visitParams),
            ApiService.getAbsensi({ 
              date: (this.dateFilter === 'TODAY' ? 'TODAY' : ''),
              startDate: (this.dateFilter === 'YESTERDAY' || this.dateFilter === 'CUSTOM') ? this.startDate : '',
              endDate: (this.dateFilter === 'YESTERDAY' || this.dateFilter === 'CUSTOM') ? this.endDate : ''
            }),
            masterTokoPromise,
            masterUserPromise
          ]);

          this.visits = visitsData || [];
          this.absensi = absensiData || [];
          if (masterTokoData && masterTokoData.length > 0) {
            this.masterToko = masterTokoData;
          }
          if (masterUserData && masterUserData.length > 0) {
            this.masterUser = masterUserData;
          }

        } else {
          // Fetch Archive Snapshot File
          if (showLoader) {
            this.loadingStage = 2;
            this.loadingMessage = 'Membuka snapshot arsip Google Drive...';
          }
          const archiveVisits = await ApiService.getArchiveVisits(this.selectedPeriod, visitParams);
          this.visits = archiveVisits || [];
        }

        if (showLoader) {
          this.loadingStage = 3;
          this.loadingMessage = 'Mengolah metrik kepatuhan & memetakan koordinat...';
        }

        // Render Analytics & Map
        this.updateCrewModulMap();
        this.indexDataStore();
        this.currentPage = 1;
        this.updateActiveDateLabel(this.visits);
        this.saveSessionState();
        this.$nextTick(() => {
          this.refreshCharts();
          if (window.lucide) lucide.createIcons();
          if (document.getElementById('visits-map')) {
            MapService.initMap('visits-map', this.theme === 'dark');
            MapService.renderVisitsOnMap(this.filteredVisits);
          }
        });

      } catch (error) {
        console.error('Error refresh data:', error);
      } finally {
        if (showLoader) {
          // Slight delay for smooth visual transition
          setTimeout(() => {
            this.isLoading = false;
          }, 300);
        }
      }
    },

    /**
     * Handle Date Filter Change
     */
    onDateFilterChange() {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');

      if (this.dateFilter === 'TODAY') {
        this.startDate = `${yyyy}-${mm}-${dd}`;
        this.endDate = `${yyyy}-${mm}-${dd}`;
        this.refreshAllData();
      } else if (this.dateFilter === 'YESTERDAY') {
        const yDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const y_yyyy = yDate.getFullYear();
        const y_mm = String(yDate.getMonth() + 1).padStart(2, '0');
        const y_dd = String(yDate.getDate()).padStart(2, '0');
        this.startDate = `${y_yyyy}-${y_mm}-${y_dd}`;
        this.endDate = `${y_yyyy}-${y_mm}-${y_dd}`;
        this.refreshAllData();
      } else if (this.dateFilter === '7_DAYS') {
        const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        this.startDate = past7.toISOString().split('T')[0];
        this.endDate = `${yyyy}-${mm}-${dd}`;
        this.refreshAllData();
      } else if (this.dateFilter === 'THIS_MONTH') {
        this.startDate = `${yyyy}-${mm}-01`;
        this.endDate = `${yyyy}-${mm}-${dd}`;
        this.refreshAllData();
      } else if (this.dateFilter === 'LATEST_DAY') {
        this.refreshAllData();
      } else if (this.dateFilter === 'CUSTOM') {
        // Saat user memilih CUSTOM, tunggu klik tombol Terapkan agar tidak loading ganda
      }
    },

    /**
     * Apply Custom Date Range (Explicit button click, eliminates double loading)
     */
    applyCustomDates() {
      if (this.startDate && this.endDate) {
        if (this.startDate > this.endDate) {
          this.endDate = this.startDate;
        }
        this.refreshAllData(true);
      } else {
        alert('Mohon tentukan tanggal mulai dan tanggal akhir terlebih dahulu.');
      }
    },

    onPeriodChange() {
      this.refreshAllData();
    },

    /**
     * Update active date label for UI badges
     */
    updateActiveDateLabel(data = []) {
      if (this.dateFilter === 'LATEST_DAY' && data.length > 0) {
        const first = data[0];
        const dateStr = first.dateIso || first.date;
        if (dateStr) {
          const d = new Date(dateStr);
          this.activeDateLabel = `Data Terakhir, ${d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`;
        }
      } else if (this.dateFilter === 'TODAY') {
        this.activeDateLabel = `Hari Ini, ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })}`;
      } else if (this.dateFilter === 'YESTERDAY') {
        const yDate = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
        this.activeDateLabel = `Kemarin, ${yDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })}`;
      } else if (this.dateFilter === 'CUSTOM' && this.startDate && this.endDate) {
        this.activeDateLabel = `${this.startDate} s/d ${this.endDate}`;
      } else if (this.dateFilter === '7_DAYS') {
        this.activeDateLabel = '7 Hari Terakhir';
      } else if (this.dateFilter === 'THIS_MONTH') {
        this.activeDateLabel = 'Bulan Ini';
      } else {
        this.activeDateLabel = '';
      }
    },

    /**
     * Helper: Normalize Any Date String / Timestamp to ISO YYYY-MM-DD
     */
    normalizeIsoDate(val, hariKe = '') {
      if (!val) return '';
      const s = String(val).trim();
      // Already ISO format: 2026-09-05
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      
      // If date is formatted with / e.g. 9/5/2026 or 05/09/2026
      if (s.includes('/')) {
        const parts = s.split(' ')[0].split('/');
        if (parts.length === 3) {
          const p0 = parseInt(parts[0], 10);
          const p1 = parseInt(parts[1], 10);
          const y = parts[2];
          if (y.length === 4) {
            // Google Sheets export default format is M/D/YYYY (p0 is Month, p1 is Day)
            if (p0 <= 12 && p1 <= 31) {
              // If hariKe is given and matches p0, then p0 was day (D/M/YYYY)
              if (hariKe && parseInt(hariKe, 10) === p0 && p0 !== p1) {
                return `${y}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
              }
              return `${y}-${String(p0).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
            }
            // If p0 > 12, p0 is Day (D/M/YYYY)
            if (p0 > 12) {
              return `${y}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
            }
          }
        }
      }

      // If date is formatted with - e.g. 05-09-2026 or 2026-09-05
      if (s.includes('-')) {
        const parts = s.split(' ')[0].split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          }
          if (parts[2].length === 4) {
            const p0 = parseInt(parts[0], 10);
            const p1 = parseInt(parts[1], 10);
            const y = parts[2];
            if (p0 <= 12 && p1 <= 31) {
              return `${y}-${String(p0).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
            }
            return `${y}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
          }
        }
      }

      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
      return '';
    },

    /**
     * Build Fast Hash Map for O(1) Instant Crew-to-Modul Lookup
     */
    updateCrewModulMap() {
      const map = {};
      // 1. From masterToko
      if (this.masterToko && this.masterToko.length > 0) {
        this.masterToko.forEach(m => {
          const mod = (m.modul || '').toUpperCase().trim();
          const n = (m.namaCrew || '').toUpperCase().trim();
          const k = (m.kodeCrew || '').toUpperCase().trim();
          if (n && mod) map[n] = mod;
          if (k && mod) map[k] = mod;
        });
      }
      // 2. From masterUser (Overwrites with official master user)
      if (this.masterUser && this.masterUser.length > 0) {
        this.masterUser.forEach(u => {
          const mod = (u.modul || '').toUpperCase().trim();
          const n = (u.nama || '').toUpperCase().trim();
          const id = (u.id || '').toUpperCase().trim();
          if (n && mod) map[n] = mod;
          if (id && mod) map[id] = mod;
        });
      }
      this.crewModulMap = map;
    },

    /**
     * Map Official Module for any Crew / Visit in O(1) (0ms)
     */
    getCrewOfficialModul(rawCrew, fallbackModul = '') {
      if (!rawCrew) return fallbackModul || 'DK';
      const norm = String(rawCrew).trim().toUpperCase();
      return this.crewModulMap[norm] || fallbackModul || 'DK';
    },

    /**
     * Pre-index dataset for high-speed O(1) filtering and eliminate CPU spikes
     */
    indexDataStore() {
      if (this.visits && this.visits.length > 0) {
        this.visits.forEach(v => {
          v._iso = this.normalizeIsoDate(v.dateIso || v.date || v.tanggal, v.hariKe);
          v._officialModul = this.getCrewOfficialModul(v.namaCrew || v.kodeCrew, v.modul || v.prefix);
          v._accUpper = (v.account || '').toUpperCase();
          v._searchStr = `${v.namaToko || ''} ${v.kodeToko || ''} ${v.namaCrew || ''} ${v.kodeCrew || ''} ${v.account || ''}`.toUpperCase();
        });

        // Sort visits newest first (Date descending, Time descending)
        this.visits.sort((a, b) => {
          const isoA = a._iso || '';
          const isoB = b._iso || '';
          if (isoA !== isoB) return isoB.localeCompare(isoA);
          const timeA = a.time || a.waktu || '';
          const timeB = b.time || b.waktu || '';
          return timeB.localeCompare(timeA);
        });
      }
      if (this.absensi && this.absensi.length > 0) {
        this.absensi.forEach(a => {
          a._iso = this.normalizeIsoDate(a.dateIso || a.date || a.tanggal);
          a._officialModul = this.getCrewOfficialModul(a.namaCrew || a.kodeCrew, a.modul);
        });

        this.absensi.sort((a, b) => {
          const isoA = a._iso || '';
          const isoB = b._iso || '';
          if (isoA !== isoB) return isoB.localeCompare(isoA);
          const timeA = a.waktu || a.time || '';
          const timeB = b.waktu || b.time || '';
          return timeB.localeCompare(timeA);
        });
      }
      if (this.masterToko && this.masterToko.length > 0) {
        this.masterToko.forEach(m => {
          m._officialModul = this.getCrewOfficialModul(m.namaCrew || m.kodeCrew, m.modul);
          m._accUpper = (m.account || '').toUpperCase();
          m._searchStr = `${m.namaToko || ''} ${m.kodeToko || ''} ${m.namaCrew || ''} ${m.kodeCrew || ''} ${m.account || ''}`.toUpperCase();
        });
      }
    },

    /**
     * Computed / Filtered Visits (Pure, Zero Mutation, High Speed)
     */
    get filteredVisits() {
      let data = this.visits;
      if (!data || data.length === 0) return [];

      // 1. Smart Date Filtering
      if (this.dateFilter === 'LATEST_DAY') {
        const latestIso = data[0]._iso || this.normalizeIsoDate(data[0].dateIso || data[0].date || data[0].tanggal);
        if (latestIso) {
          data = data.filter(v => (v._iso || this.normalizeIsoDate(v.dateIso || v.date || v.tanggal)) === latestIso);
        }
      } else if (this.dateFilter === 'TODAY') {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayIso = `${y}-${m}-${d}`;
        data = data.filter(v => (v._iso || this.normalizeIsoDate(v.dateIso || v.date || v.tanggal)) === todayIso);
      } else if (this.dateFilter === 'YESTERDAY') {
        const yDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const y_y = yDate.getFullYear();
        const y_m = String(yDate.getMonth() + 1).padStart(2, '0');
        const y_d = String(yDate.getDate()).padStart(2, '0');
        const yIso = `${y_y}-${y_m}-${y_d}`;
        data = data.filter(v => (v._iso || this.normalizeIsoDate(v.dateIso || v.date || v.tanggal)) === yIso);
      } else if (this.dateFilter === 'CUSTOM' && this.startDate && this.endDate) {
        const start = this.startDate;
        const end = this.endDate;
        data = data.filter(v => {
          const vIso = v._iso || this.normalizeIsoDate(v.dateIso || v.date || v.tanggal);
          return vIso && vIso >= start && vIso <= end;
        });
      } else if (this.dateFilter === '7_DAYS' && this.startDate && this.endDate) {
        const start = this.startDate;
        const end = this.endDate;
        data = data.filter(v => {
          const vIso = v._iso || this.normalizeIsoDate(v.dateIso || v.date || v.tanggal);
          return vIso && vIso >= start && vIso <= end;
        });
      } else if (this.dateFilter === 'THIS_MONTH' && this.startDate && this.endDate) {
        const start = this.startDate;
        const end = this.endDate;
        data = data.filter(v => {
          const vIso = v._iso || this.normalizeIsoDate(v.dateIso || v.date || v.tanggal);
          return vIso && vIso >= start && vIso <= end;
        });
      }

      // 2. Filter by Modul (Using Official Module Mapping)
      if (this.selectedModul !== 'ALL') {
        const selMod = this.selectedModul;
        if (selMod.length === 2) {
          data = data.filter(v => (v._officialModul || this.getCrewOfficialModul(v.namaCrew || v.kodeCrew, v.modul)).startsWith(selMod));
        } else {
          data = data.filter(v => (v._officialModul || this.getCrewOfficialModul(v.namaCrew || v.kodeCrew, v.modul)) === selMod);
        }
      }

      // 3. Filter by Account
      if (this.selectedAccount !== 'ALL') {
        const selAcc = this.selectedAccount;
        data = data.filter(v => (v._accUpper || (v.account || '').toUpperCase()).includes(selAcc));
      }

      // 4. Filter by Search Query
      if (this.searchQuery && this.searchQuery.trim()) {
        const q = this.searchQuery.toUpperCase().trim();
        data = data.filter(v => (v._searchStr || `${v.namaToko || ''} ${v.kodeToko || ''} ${v.namaCrew || ''} ${v.kodeCrew || ''} ${v.account || ''}`).toUpperCase().includes(q));
      }

      return data;
    },

    /**
     * Computed Filtered Absensi (Smart Date, Modul & Search Filtering)
     */
    get filteredAbsensi() {
      let data = this.absensi;
      if (!data || data.length === 0) return [];

      // 1. Smart Date Filtering
      if (this.dateFilter === 'LATEST_DAY') {
        const latestIso = (this.visits && this.visits.length > 0 && this.visits[0]._iso)
          ? this.visits[0]._iso
          : (data[0]._iso || this.normalizeIsoDate(data[0].tanggal || data[0].dateIso || data[0].date));
        if (latestIso) {
          data = data.filter(a => (a._iso || this.normalizeIsoDate(a.tanggal || a.dateIso || a.date)) === latestIso);
        }
      } else if (this.dateFilter === 'TODAY') {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayIso = `${y}-${m}-${d}`;
        data = data.filter(a => (a._iso || this.normalizeIsoDate(a.tanggal || a.dateIso || a.date)) === todayIso);
      } else if (this.dateFilter === 'YESTERDAY') {
        const yDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const y_y = yDate.getFullYear();
        const y_m = String(yDate.getMonth() + 1).padStart(2, '0');
        const y_d = String(yDate.getDate()).padStart(2, '0');
        const yIso = `${y_y}-${y_m}-${y_d}`;
        data = data.filter(a => (a._iso || this.normalizeIsoDate(a.tanggal || a.dateIso || a.date)) === yIso);
      } else if (this.dateFilter === 'CUSTOM' && this.startDate && this.endDate) {
        const start = this.startDate;
        const end = this.endDate;
        data = data.filter(a => {
          const aIso = a._iso || this.normalizeIsoDate(a.tanggal || a.dateIso || a.date);
          return aIso && aIso >= start && aIso <= end;
        });
      } else if (this.dateFilter === '7_DAYS' && this.startDate && this.endDate) {
        const start = this.startDate;
        const end = this.endDate;
        data = data.filter(a => {
          const aIso = a._iso || this.normalizeIsoDate(a.tanggal || a.dateIso || a.date);
          return aIso && aIso >= start && aIso <= end;
        });
      } else if (this.dateFilter === 'THIS_MONTH' && this.startDate && this.endDate) {
        const start = this.startDate;
        const end = this.endDate;
        data = data.filter(a => {
          const aIso = a._iso || this.normalizeIsoDate(a.tanggal || a.dateIso || a.date);
          return aIso && aIso >= start && aIso <= end;
        });
      }

      // 2. Filter by Modul
      if (this.selectedModul !== 'ALL') {
        const selMod = this.selectedModul;
        if (selMod.length === 2) {
          data = data.filter(a => (a._officialModul || this.getCrewOfficialModul(a.namaCrew || a.kodeCrew, a.modul)).startsWith(selMod));
        } else {
          data = data.filter(a => (a._officialModul || this.getCrewOfficialModul(a.namaCrew || a.kodeCrew, a.modul)) === selMod);
        }
      }

      // 3. Filter by Search Query
      if (this.searchQuery && this.searchQuery.trim()) {
        const q = this.searchQuery.toUpperCase().trim();
        data = data.filter(a =>
          (a.namaCrew || '').toUpperCase().includes(q) ||
          (a.kodeCrew || '').toUpperCase().includes(q) ||
          (a.namaToko || '').toUpperCase().includes(q)
        );
      }

      return data;
    },

    /**
     * Computed Filtered Master Toko
     */
    get filteredMasterToko() {
      let data = this.masterToko;
      if (!data || data.length === 0) return [];
      if (this.selectedModul !== 'ALL') {
        const selMod = this.selectedModul;
        if (selMod.length === 2) {
          data = data.filter(m => (m._officialModul || this.getCrewOfficialModul(m.namaCrew || m.kodeCrew, m.modul)).startsWith(selMod));
        } else {
          data = data.filter(m => (m._officialModul || this.getCrewOfficialModul(m.namaCrew || m.kodeCrew, m.modul)) === selMod);
        }
      }
      if (this.selectedAccount !== 'ALL') {
        const selAcc = this.selectedAccount;
        data = data.filter(m => (m._accUpper || (m.account || '').toUpperCase()).includes(selAcc));
      }
      if (this.searchQuery && this.searchQuery.trim()) {
        const q = this.searchQuery.toUpperCase().trim();
        data = data.filter(m => (m._searchStr || `${m.namaToko || ''} ${m.kodeToko || ''} ${m.namaCrew || ''} ${m.kodeCrew || ''} ${m.account || ''}`).toUpperCase().includes(q));
      }
      return data;
    },

    /**
     * Computed Filtered Master User
     */
    get filteredMasterUser() {
      let data = this.masterUser;
      if (this.selectedModul !== 'ALL') {
        if (this.selectedModul.length === 2) {
          data = data.filter(u => u.modul && u.modul.toUpperCase().startsWith(this.selectedModul));
        } else {
          data = data.filter(u => u.modul && u.modul.toUpperCase() === this.selectedModul);
        }
      }
      if (this.selectedAccount !== 'ALL') {
        data = data.filter(u => (u.account || '').toUpperCase().includes(this.selectedAccount));
      }
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toUpperCase().trim();
        data = data.filter(u =>
          (u.nama || '').toUpperCase().includes(q) ||
          (u.id || '').toUpperCase().includes(q) ||
          (u.modul || '').toUpperCase().includes(q) ||
          (u.account || '').toUpperCase().includes(q)
        );
      }
      return data;
    },

    /**
     * Helper: Determine Active Route Match Set (Supports both Weekly Workdays 1..6 and Calendar Dates 1..31)
     */
    getActiveRouteMatchList() {
      let targetDate = new Date();
      if (this.dateFilter === 'YESTERDAY') {
        targetDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      } else if (this.dateFilter === 'LATEST_DAY' && this.visits && this.visits.length > 0) {
        const first = this.visits[0];
        const dateStr = this.normalizeIsoDate(first.dateIso || first.date || first.tanggal, first.hariKe);
        if (dateStr && dateStr.length >= 10) {
          targetDate = new Date(dateStr);
        }
      } else if (this.startDate) {
        if (!this.endDate || this.startDate === this.endDate) {
          targetDate = new Date(this.startDate);
        } else {
          return null; // Multi-day range: match all stores
        }
      } else if (this.dateFilter === '7_DAYS' || this.dateFilter === 'THIS_MONTH') {
        return null; // Multi-day range: match all stores
      }

      // Convert to Asia/Jakarta (WIB)
      let wibIso = '';
      try {
        wibIso = targetDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // "YYYY-MM-DD"
      } catch (e) {
        wibIso = targetDate.toISOString().slice(0, 10);
      }

      const parts = wibIso.split('-');
      const calDay = parseInt(parts[2], 10); // 1..31 (Tanggal Kalender)

      const matchSet = new Set();
      if (!isNaN(calDay)) {
        matchSet.add(String(calDay));
        matchSet.add(String(calDay).padStart(2, '0'));
        matchSet.add('R' + calDay);
        matchSet.add('RUTE ' + calDay);
        matchSet.add('RUTE-' + calDay);
      }

      return matchSet;
    },

    getActiveRuteNumber() {
      const matchSet = this.getActiveRouteMatchList();
      if (!matchSet) return null;
      try {
        const wibIso = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
        return String(parseInt(wibIso.split('-')[2], 10));
      } catch (e) {
        return String(new Date().getDate());
      }
    },

    /**
     * Executive KPI Calculations
     */
    get kpiSummary() {
      const vData = this.filteredVisits;
      const totalVisits = vData.length;
      
      const uniqueStores = new Set(vData.map(v => v.kodeToko).filter(Boolean)).size;
      const uniqueCrews = new Set(vData.map(v => (v.kodeCrew || v.namaCrew || '').toUpperCase().trim()).filter(Boolean)).size;

      const normKey = (str) => {
        if (!str) return '';
        return String(str).toUpperCase()
          .replace(/[\.\,\-\_\(\)\/]/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/SULISTIYO/g, 'SULISTIO')
          .trim();
      };

      // Official scheduled crews strictly from Master User
      const userList = (this.filteredMasterUser && this.filteredMasterUser.length > 0) ? this.filteredMasterUser : [];
      const distinctScheduled = new Set(userList.map(u => normKey(u.nama) || normKey(u.id)).filter(Boolean)).size;
      const scheduled = distinctScheduled > 0 ? distinctScheduled : uniqueCrews;
      const inactiveCrewsCount = Math.max(0, scheduled - uniqueCrews);

      const activeRute = this.getActiveRuteNumber();
      let totalTarget = 0;

      if (activeRute) {
        // Daily Mode: Calculate exact sum of target stores from all scheduled crews for this day
        totalTarget = this.complianceList.reduce((sum, c) => sum + (c.targetCount || 0), 0);
      } else {
        // Weekly / Monthly Mode: Target is all scheduled stores in master
        totalTarget = this.filteredMasterToko.length || 1;
      }

      const validatedTargetVisits = this.complianceList.reduce((sum, c) => sum + Math.min(c.visitedCount || 0, c.targetCount || 0), 0);
      const achievementRate = totalTarget > 0 ? Math.min(100, Math.round((validatedTargetVisits / totalTarget) * 100)) : (totalVisits > 0 ? 100 : 0);
      
      // Absensi Kehadiran Terfilter (Jumlah personil yang absen masuk pada tanggal & modul aktif)
      const aData = this.filteredAbsensi;
      const hadirList = aData.filter(a => {
        const st = (a.status || '').toUpperCase();
        return st === 'MASUK' || st === 'HADIR';
      });
      const hadirCount = new Set(hadirList.map(a => (a.namaCrew || a.kodeCrew || '').toUpperCase().trim()).filter(Boolean)).size || hadirList.length;

      return {
        totalVisits: totalVisits || 0,
        uniqueStores: uniqueStores || 0,
        uniqueCrews: uniqueCrews || 0,
        totalScheduledCrews: scheduled,
        inactiveCrewsCount: inactiveCrewsCount,
        totalTarget: totalTarget || 0,
        achievementRate: achievementRate || 0,
        hadirCount: hadirCount || 0,
        totalAbsensi: aData.length || 0
      };
    },

    /**
     * Crew Compliance & Target Completion List
     * Maps active date (Supports Weekly Pattern 1..6 & Monthly Pattern 1..31)
     */
    get complianceList() {
      const routeMatchSet = this.getActiveRouteMatchList();
      const normKey = (str) => {
        if (!str) return '';
        return String(str).toUpperCase()
          .replace(/[\.\,\-\_\(\)\/]/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/SULISTIYO/g, 'SULISTIO')
          .trim();
      };

      // 1. STRICTLY Seed Official Active Users from Master User (Single Source of Truth)
      const crewMap = {};
      const idToKeyMap = {};

      this.masterUser.forEach(u => {
        const rawName = u.nama || '';
        const rawId = u.id || '';
        const cleanName = normKey(rawName);
        const cleanId = normKey(rawId);
        
        const key = cleanName || cleanId;
        if (!key) return;

        if (!crewMap[key]) {
          const mod = (u.modul || this.getCrewOfficialModul(rawName, '-')).trim().toUpperCase();
          crewMap[key] = {
            namaCrew: rawName.trim().toUpperCase(),
            kodeCrew: (rawId || '-').trim().toUpperCase(),
            modul: mod,
            targetStores: new Set(),
            allStores: new Set(),
            visitedStores: new Set(),
            totalVisits: 0
          };
        }
        if (cleanName) idToKeyMap[cleanName] = key;
        if (cleanId) idToKeyMap[cleanId] = key;
      });

      // Helper to find existing official crew only (No ghost/extra user creation)
      const findOfficialCrew = (rawName, rawId) => {
        const cleanName = normKey(rawName);
        const cleanId = normKey(rawId);
        const key = (cleanName && idToKeyMap[cleanName]) || (cleanId && idToKeyMap[cleanId]) || null;
        return key && crewMap[key] ? crewMap[key] : null;
      };

      // 2. Map Target Stores from Master Toko ONLY to existing Official Master Users
      this.masterToko.forEach(m => {
        const crewObj = findOfficialCrew(m.namaCrew, m.kodeCrew);
        if (!crewObj) return; // Skip non-registered crew

        if (m.kodeToko) {
          crewObj.allStores.add(m.kodeToko);
          const ruteStr = String(m.rute || '').toUpperCase().trim();
          
          if (!routeMatchSet || routeMatchSet.has(ruteStr) || Array.from(routeMatchSet).some(target => ruteStr.endsWith(' ' + target) || ruteStr.endsWith('-' + target))) {
            crewObj.targetStores.add(m.kodeToko);
          }
        }
      });

      // 3. Map Realized Visits in Active Filter ONLY to existing Official Master Users
      this.filteredVisits.forEach(v => {
        const crewObj = findOfficialCrew(v.namaCrew, v.kodeCrew);
        if (!crewObj) return; // Skip non-registered crew

        crewObj.totalVisits++;
        if (v.kodeToko) crewObj.visitedStores.add(v.kodeToko);
      });

      // 3.5 Map DC Visits from Attendance for Fair Route Compensation
      const crewDcMap = {};
      (this.filteredAbsensi || []).forEach(a => {
        const rawName = (a.namaCrew || a.kodeCrew || '').trim();
        if (!rawName) return;
        const cleanN = normKey(rawName);
        const cleanId = normKey(a.kodeCrew);
        const st = (a.status || '').toUpperCase().trim();
        const cat = (a.catatan || '').toUpperCase().trim();
        const toko = (a.namaToko || '').toUpperCase().trim();
        const combined = `${st} ${cat} ${toko}`;
        const isDc = /\bDC\b|KUNJUNGAN DC|VISIT DC|TUGAS DC|DC SAT|DC SERANG|DC LEBAK|DC PARUNG|DC JKT|DC CIREBON|OFFICE|KANTOR/i.test(combined);
        if (isDc) {
          const dcObj = {
            isDc: true,
            note: a.catatan || a.status || 'Kunjungan DC'
          };
          if (cleanN) crewDcMap[cleanN] = dcObj;
          if (cleanId) crewDcMap[cleanId] = dcObj;
        }
      });

      const results = [];

      Object.keys(crewMap).forEach(k => {
        const c = crewMap[k];
        const crewName = c.namaCrew;
        const modulName = c.modul || '-';
        const cleanCrewKey = normKey(crewName);
        const cleanIdKey = normKey(c.kodeCrew);
        const dcInfo = crewDcMap[cleanCrewKey] || (cleanIdKey ? crewDcMap[cleanIdKey] : null);

        let targetCount = 0;
        if (routeMatchSet && routeMatchSet.size > 0) {
          targetCount = c.targetStores.size;
        } else {
          targetCount = c.allStores.size > 0 ? c.allStores.size : c.visitedStores.size;
        }

        const visitedCount = c.visitedStores.size;
        let remainingCount = Math.max(0, targetCount - visitedCount);
        let rate = targetCount > 0 ? Math.min(100, Math.round((visitedCount / targetCount) * 100)) : (visitedCount > 0 ? 100 : 0);

        let status = 'BELUM_INPUT';
        let statusBadge = '🔴 Belum Input Jadwal';
        let statusColor = 'bg-rose-500/10 text-rose-500 border-rose-500/20';
        let isVisitDc = false;

        // Apply Fair Compensation for DC Visit / Tugas DC
        if (dcInfo) {
          isVisitDc = true;
          if (visitedCount > 0) {
            targetCount = visitedCount;
            remainingCount = 0;
            rate = 100;
            status = 'TUNTAS';
            statusBadge = '🟢 Tuntas (Visit DC)';
            statusColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
          } else {
            targetCount = 0;
            remainingCount = 0;
            rate = 100;
            status = 'TUGAS_DC';
            statusBadge = '🏢 Tugas DC';
            statusColor = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
          }
        } else if (targetCount > 0) {
          if (visitedCount >= targetCount) {
            status = 'TUNTAS';
            statusBadge = '🟢 Tuntas 100%';
            statusColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
          } else if (visitedCount > 0) {
            status = 'ON_PROGRESS';
            statusBadge = `🟡 Sisa ${remainingCount} Toko`;
            statusColor = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
          } else {
            status = 'BELUM_JALAN';
            statusBadge = `⚪ Belum Kunjungan (0/${targetCount})`;
            statusColor = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
          }
        } else if (visitedCount > 0) {
          status = 'NON_RUTE';
          statusBadge = `🔵 Non-Rute (${visitedCount} Toko)`;
          statusColor = 'bg-sky-500/10 text-sky-500 border-sky-500/20';
        } else {
          // targetCount === 0 and visitedCount === 0 -> Belum input jadwal untuk tanggal ini
          status = 'BELUM_INPUT';
          statusBadge = '🔴 Belum Input Jadwal';
          statusColor = 'bg-rose-500/10 text-rose-500 border-rose-500/20';
        }

        // Apply module filter if active
        if (this.selectedModul !== 'ALL') {
          if (this.selectedModul.length === 2 && !modulName.toUpperCase().startsWith(this.selectedModul)) return;
          if (this.selectedModul.length > 2 && modulName.toUpperCase() !== this.selectedModul) return;
        }

        results.push({
          namaCrew: crewName,
          kodeCrew: c.kodeCrew || '-',
          modul: modulName,
          targetCount: targetCount,
          visitedCount: visitedCount,
          remainingCount: remainingCount,
          rate: rate,
          status: status,
          statusBadge: statusBadge,
          statusColor: statusColor,
          isVisitDc: isVisitDc,
          dcNote: dcInfo ? dcInfo.note : ''
        });
      });

      return results.sort((a, b) => {
        if (a.status === 'TUNTAS' && b.status !== 'TUNTAS') return -1;
        if (b.status === 'TUNTAS' && a.status !== 'TUNTAS') return 1;
        if (a.status === 'ON_PROGRESS' && b.status !== 'ON_PROGRESS') return -1;
        if (b.status === 'ON_PROGRESS' && a.status !== 'ON_PROGRESS') return 1;
        return a.namaCrew.localeCompare(b.namaCrew);
      });
    },

    // WhatsApp Regional Operational Groups (Automated Module Mapping)
    waRegions: [
      { code: 'JABODETABEK', name: 'Jabodetabek & Banten (DK1-6)', icon: '🏙️', modules: ['DK1','DK2','DK3','DK4','DK5','DK6','DK'] },
      { code: 'JABAR', name: 'Jawa Barat (LK1, LK2)', icon: '🏔️', modules: ['LK1','LK2'] },
      { code: 'JATENG', name: 'Jateng & DIY (LK3)', icon: '🏛️', modules: ['LK3'] },
      { code: 'JATIM_BALI', name: 'Jatim, Bali & Nusra (LK4, LK5)', icon: '🏖️', modules: ['LK4','LK5'] },
      { code: 'LUAR_JAWA', name: 'Sumatera, Kalimantan & Sulawesi (LP1-4)', icon: '🌴', modules: ['LP1','LP2','LP3','LP4','LP'] },
      { code: 'ALL', name: 'Nasional (Semua Wilayah)', icon: '🌐', modules: [] }
    ],

    /**
     * Filtered Compliance Data for WA Infographic Card
     */
    get waReportList() {
      let list = this.complianceList;
      const regCode = this.waReportModal.selectedRegion || 'JABODETABEK';
      
      if (regCode !== 'ALL') {
        const found = this.waRegions.find(r => r.code === regCode);
        if (found && found.modules.length > 0) {
          list = list.filter(c => {
            const mClean = (c.modul || '').toUpperCase().trim();
            return found.modules.some(m => mClean === m || mClean.startsWith(m + '-') || mClean.startsWith(m + ' ') || mClean.startsWith(m) || (m === 'DK' && mClean.startsWith('DK')) || (m === 'LP' && mClean.startsWith('LP')) || (m === 'LK' && mClean.startsWith('LK')));
          });
        } else {
          list = list.filter(c => (c.modul || '').toUpperCase().includes(regCode));
        }
      }

      // Filter out off-schedule entries (0 target & 0 visit) so the report stays clean and proportional
      return list
        .filter(c => c.status !== 'OFF_SCHEDULE' && (c.targetCount > 0 || c.visitedCount > 0 || c.status === 'BELUM_INPUT'))
        .map((item, idx) => ({ ...item, displayIndex: idx + 1 }));
    },

    get waReportListCol1() {
      return this.waReportList;
    },

    get waReportListCol2() {
      return [];
    },

    get activeWaRegionName() {
      const found = this.waRegions.find(r => r.code === this.waReportModal.selectedRegion);
      return found ? found.name : this.waReportModal.selectedRegion;
    },

    /**
     * Summary Metrics for WhatsApp Infographic Card
     */
    get waReportSummary() {
      const list = this.waReportList;
      const totalVisits = list.reduce((sum, c) => sum + (c.visitedCount || 0), 0);
      const totalTarget = list.reduce((sum, c) => sum + (c.targetCount || 0), 0);
      const validatedVisits = list.reduce((sum, c) => sum + Math.min(c.visitedCount || 0, c.targetCount || 0), 0);
      const tuntasCount = list.filter(c => c.status === 'TUNTAS').length;
      const onProgressCount = list.filter(c => c.status === 'ON_PROGRESS' || c.status === 'BELUM_JALAN').length;
      const belumInputCount = list.filter(c => c.status === 'BELUM_INPUT').length;
      const rate = totalTarget > 0 ? Math.min(100, Math.round((validatedVisits / totalTarget) * 100)) : (totalVisits > 0 ? 100 : 0);

      return {
        totalCrew: list.length,
        totalVisits,
        totalTarget,
        tuntasCount,
        onProgressCount,
        belumInputCount,
        rate
      };
    },

    /**
     * Paginated Table Rows
     */
    get paginatedVisits() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      return this.filteredVisits.slice(start, start + this.itemsPerPage);
    },

    get totalPages() {
      return Math.max(1, Math.ceil(this.filteredVisits.length / this.itemsPerPage));
    },

    /**
     * Refresh All Chart Components
     */
    refreshCharts() {
      const isDark = this.theme === 'dark';
      ChartService.renderTrendChart(document.getElementById('trend-chart'), this.filteredVisits, isDark);
      ChartService.renderModulComparisonChart(document.getElementById('modul-chart'), this.filteredVisits, isDark);
      ChartService.renderAccountShareChart(document.getElementById('account-chart'), this.filteredVisits, isDark);
    },

    /**
     * Open WhatsApp Infographic Modal (Auto-ensures master data is loaded)
     */
    async openWaReportModal() {
      this.waReportModal.isOpen = true;
      this.waReportModal.copiedSuccess = false;
      this.waReportModal.captionCopiedSuccess = false;
      this.waReportModal.textCopiedSuccess = false;

      // Auto set region to match current selectedModul if applicable
      if (this.selectedModul && this.selectedModul !== 'ALL') {
        const found = this.waRegions.find(r => r.modules.includes(this.selectedModul) || r.modules.some(m => this.selectedModul.startsWith(m)));
        if (found) {
          this.waReportModal.selectedRegion = found.code;
        }
      } else if (!this.waReportModal.selectedRegion || this.waReportModal.selectedRegion === 'ALL') {
        this.waReportModal.selectedRegion = 'JABODETABEK';
      }

      // Ensure Master Toko & Master User are fully loaded (prevent 0 target calculation)
      if (!this.masterToko || this.masterToko.length === 0 || !this.masterUser || this.masterUser.length === 0) {
        this.waReportModal.isGenerating = true;
        try {
          const [toko, users] = await Promise.all([
            (!this.masterToko || this.masterToko.length === 0) ? ApiService.getMasterToko({ modul: 'ALL' }) : Promise.resolve(this.masterToko),
            (!this.masterUser || this.masterUser.length === 0) ? ApiService.getMasterUser({ modul: 'ALL' }) : Promise.resolve(this.masterUser)
          ]);
          if (toko && toko.length > 0) this.masterToko = toko;
          if (users && users.length > 0) this.masterUser = users;
          this.saveSessionState();
        } catch (e) {
          console.error('Error fetching master data in WA modal:', e);
        } finally {
          this.waReportModal.isGenerating = false;
        }
      }
      
      this.saveSessionState();
      this.$nextTick(() => {
        if (window.lucide) lucide.createIcons();
      });
    },

    closeWaReportModal() {
      this.waReportModal.isOpen = false;
      this.saveSessionState();
    },

    /**
     * Copy / Download WA Infographic Image (Direct HD Canvas Capture)
     */
    async exportWaInfographic(mode = 'copy') {
      const cardEl = document.getElementById('wa-infographic-card');
      if (!cardEl || !window.html2canvas) {
        alert('Library html2canvas belum selesai dimuat.');
        return;
      }

      this.waReportModal.isGenerating = true;

      try {
        const canvas = await html2canvas(cardEl, {
          scale: 2, // 2x HD Resolution for crystal-clear WhatsApp viewing
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          width: 620,
          windowWidth: 1024,
          height: cardEl.scrollHeight,
          windowHeight: cardEl.scrollHeight + 300
        });

        if (mode === 'download') {
          const imgUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `Rekap_MDS_${this.waReportModal.selectedRegion}_${new Date().toISOString().slice(0,10)}.png`;
          link.href = imgUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          // Copy directly to Clipboard
          canvas.toBlob(async (blob) => {
            if (blob && navigator.clipboard && navigator.clipboard.write) {
              try {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                this.waReportModal.copiedSuccess = true;
                setTimeout(() => { this.waReportModal.copiedSuccess = false; }, 3500);
              } catch (clipErr) {
                // Fallback: download if clipboard API restricted
                const imgUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `Rekap_MDS_${this.waReportModal.selectedRegion}_${new Date().toISOString().slice(0,10)}.png`;
                link.href = imgUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            }
          }, 'image/png');
        }
      } catch (err) {
        console.error('Error generate infographic:', err);
        alert('Gagal menghasilkan gambar: ' + err.message);
      } finally {
        this.waReportModal.isGenerating = false;
        this.saveSessionState();
      }
    },

    /**
     * Share Direct to WhatsApp in 1-Click (Image + Caption) on Android/Mobile
     */
    async shareDirectToWhatsApp() {
      const cardEl = document.getElementById('wa-infographic-card');
      if (!cardEl || !window.html2canvas) {
        alert('Library html2canvas belum selesai dimuat.');
        return;
      }

      this.waReportModal.isGenerating = true;
      this.saveSessionState();

      try {
        const canvas = await html2canvas(cardEl, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          width: 620,
          windowWidth: 1024,
          height: cardEl.scrollHeight,
          windowHeight: cardEl.scrollHeight + 300
        });

        const captionText = this.getWaCaptionText();

        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], `Rekap_MDS_${this.waReportModal.selectedRegion}_${new Date().toISOString().slice(0,10)}.png`, { type: 'image/png' });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            // Android / Mobile Web Share API
            try {
              await navigator.share({
                files: [file],
                title: 'Rekap Realisasi Rute Kunjungan MDS',
                text: captionText
              });
            } catch (shareErr) {
              if (shareErr.name !== 'AbortError') {
                this.copyWaCaption();
                this.exportWaInfographic('download');
              }
            }
          } else {
            // Desktop / Unsupported Fallback: Download image and copy caption
            const imgUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `Rekap_MDS_${this.waReportModal.selectedRegion}_${new Date().toISOString().slice(0,10)}.png`;
            link.href = imgUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.copyWaCaption();
            this.waReportModal.captionCopiedSuccess = true;
            setTimeout(() => { this.waReportModal.captionCopiedSuccess = false; }, 4000);
          }
        }, 'image/png');

      } catch (err) {
        console.error('Error share directly:', err);
      } finally {
        this.waReportModal.isGenerating = false;
        this.saveSessionState();
      }
    },

    /**
     * Build WhatsApp Short Caption String
     */
    getWaCaptionText() {
      const summary = this.waReportSummary;
      const dateStr = this.activeDateLabel || 'Periode Kemarin';
      const regStr = this.activeWaRegionName;

      let text = `🥛 *REKAP REALISASI RUTE KUNJUNGAN MDS*\n`;
      text += `📍 *Grup:* ${regStr}\n`;
      text += `📅 *Periode:* ${dateStr}\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `📊 *Realisasi:* ${summary.rate}% (${summary.totalVisits}/${summary.totalTarget} Toko Selesai)\n`;
      text += `🟢 *Tuntas:* ${summary.tuntasCount} MDS  |  🟡 *Belum Tuntas:* ${summary.onProgressCount} MDS  |  🔴 *Belum Input:* ${summary.belumInputCount} MDS\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `Terima kasih. 🙏`;
      return text;
    },

    /**
     * Copy Short Image Caption for WhatsApp (Paste directly under photo)
     */
    copyWaCaption() {
      const text = this.getWaCaptionText();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          this.waReportModal.captionCopiedSuccess = true;
          setTimeout(() => { this.waReportModal.captionCopiedSuccess = false; }, 3500);
        });
      }
    },

    /**
     * Compute Real-time Comprehensive Attendance & Operational Anomaly Audit
     */
    get auditAnomalies() {
      const activeVisits = this.filteredVisits || [];
      const activeAbsensi = this.filteredAbsensi || [];

      // Helper for clean name normalization (removes symbols, extra spaces, typos)
      const normKey = (str) => {
        if (!str) return '';
        return String(str).toUpperCase()
          .replace(/[\.\,\-\_\(\)\/]/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/SULISTIYO/g, 'SULISTIO')
          .trim();
      };

      // 1. Build Deduplicated Unified Master User Roster
      const uniqueMasterUsers = new Map();
      const userPhoneMap = {};
      const activeUsers = this.filteredMasterUser || this.masterUser || [];
      
      activeUsers.forEach(u => {
        const cleanN = normKey(u.nama);
        if (!cleanN) return;
        if (u.noWa) userPhoneMap[cleanN] = u.noWa;
        if (u.id) userPhoneMap[normKey(u.id)] = u.noWa;

        if (!uniqueMasterUsers.has(cleanN)) {
          uniqueMasterUsers.set(cleanN, {
            nama: (u.nama || '').trim(),
            id: (u.id || '').trim(),
            modul: (u.modul || this.getCrewOfficialModul(u.nama, '-')).toUpperCase().trim(),
            noWa: (u.noWa || '').trim(),
            account: (u.account || '').trim()
          });
        }
      });

      // Also include any active personnel found in attendance or visits (e.g. newly joined field crew)
      activeAbsensi.forEach(a => {
        const rawName = (a.namaCrew || a.kodeCrew || '').trim();
        if (!rawName) return;
        const cleanN = normKey(rawName);
        if (!uniqueMasterUsers.has(cleanN)) {
          uniqueMasterUsers.set(cleanN, {
            nama: rawName,
            id: a.kodeCrew || '-',
            modul: (a._officialModul || this.getCrewOfficialModul(rawName, a.modul || '-')).toUpperCase().trim(),
            noWa: '',
            account: ''
          });
        }
      });

      activeVisits.forEach(v => {
        const rawName = (v.namaCrew || v.kodeCrew || '').trim();
        if (!rawName) return;
        const cleanN = normKey(rawName);
        if (!uniqueMasterUsers.has(cleanN)) {
          uniqueMasterUsers.set(cleanN, {
            nama: rawName,
            id: v.kodeCrew || '-',
            modul: (v._officialModul || this.getCrewOfficialModul(rawName, v.modul || v.prefix || '-')).toUpperCase().trim(),
            noWa: '',
            account: ''
          });
        }
      });

      // 2. Group Absensi Records
      const absenMasukMap = {};
      const absenMasukKeys = new Set();
      const absenPulangMap = {};
      const izinSakitKeys = new Set();
      const visitDcMap = {};
      const visitDcKeys = new Set();
      const izinList = [];
      const sakitList = [];
      const cutiList = [];
      const visitDcList = [];
      const gpsIssueList = [];
      const terlambatList = [];

      // Helper to detect DC Attendance records
      const isDcRecord = (cat, st, toko) => {
        const combined = `${cat || ''} ${st || ''} ${toko || ''}`.toUpperCase();
        return /\bDC\b|KUNJUNGAN DC|VISIT DC|TUGAS DC|DC SAT|DC SERANG|DC LEBAK|DC PARUNG|DC JKT|DC CIREBON|OFFICE|KANTOR/i.test(combined);
      };

      // Helper to detect 0.000000, 0.000000 or disabled/empty GPS
      const isZeroGps = (kStr) => {
        if (!kStr) return true;
        const s = String(kStr).trim().toLowerCase();
        if (s === '-' || s === '0' || s.includes('null') || s.includes('undefined') || s.includes('off') || s.includes('error')) return true;
        const parts = s.split(',').map(p => parseFloat(p.trim()));
        if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return true;
        if (Math.abs(parts[0]) < 0.0001 && Math.abs(parts[1]) < 0.0001) return true;
        return false;
      };

      activeAbsensi.forEach(a => {
        const rawName = (a.namaCrew || a.kodeCrew || '').trim();
        if (!rawName) return;
        const cleanN = normKey(a.namaCrew);
        const cleanId = normKey(a.kodeCrew);
        const st = (a.status || '').toUpperCase().trim() || 'MASUK';
        const w = (a.waktu || a.time || '').trim();
        const k = (a.koordinat || '').trim();
        const mod = a._officialModul || this.getCrewOfficialModul(rawName, a.modul || '-');
        const phone = userPhoneMap[cleanN] || (cleanId ? userPhoneMap[cleanId] : '') || '';

        const record = {
          namaCrew: rawName,
          kodeCrew: a.kodeCrew || '-',
          modul: mod,
          waktu: w,
          waktuMasuk: w,
          tanggal: a.tanggal || a.dateIso || '-',
          status: st,
          catatan: a.catatan || '',
          koordinat: k,
          fotoSurat: a.fotoSurat || '',
          noWa: phone
        };

        // GPS Check: detects empty, -, or 0.000000, 0.000000
        if (isZeroGps(k)) {
          gpsIssueList.push({ ...record, reason: `Absen ${st} Tanpa GPS (0,0)` });
        }

        // Detect DC assignment / visit
        const isDc = isDcRecord(a.catatan, st, a.namaToko);
        if (isDc) {
          record.isDc = true;
          record.dcNote = a.catatan || st || 'Visit DC';
          if (!visitDcMap[cleanN]) {
            visitDcMap[cleanN] = record;
            visitDcList.push(record);
            if (cleanN) visitDcKeys.add(cleanN);
            if (cleanId) visitDcKeys.add(cleanId);
          }
        }

        if (st === 'MASUK' || st === 'HADIR' || !st) {
          if (!absenMasukMap[cleanN]) {
            absenMasukMap[cleanN] = record;
            if (cleanN) absenMasukKeys.add(cleanN);
            if (cleanId) absenMasukKeys.add(cleanId);

            // Check Terlambat (Batas jam 08:00)
            if (w) {
              const timeParts = w.split(':').map(p => parseInt(p, 10));
              if (timeParts.length >= 2) {
                const totalMinutes = timeParts[0] * 60 + timeParts[1];
                if (totalMinutes > 8 * 60 + 5) { // Toleransi 5 menit (setelah 08:05)
                  const lateMinutes = totalMinutes - (8 * 60);
                  terlambatList.push({ ...record, lateMinutes: lateMinutes, waktuMasuk: w });
                }
              }
            }
          }
        } else if (st === 'PULANG') {
          if (!absenPulangMap[cleanN]) {
            absenPulangMap[cleanN] = record;
          }
        } else {
          if (cleanN) izinSakitKeys.add(cleanN);
          if (cleanId) izinSakitKeys.add(cleanId);

          if (st.includes('IZIN')) izinList.push(record);
          else if (st.includes('SAKIT')) sakitList.push(record);
          else if (st.includes('CUTI')) cutiList.push(record);
        }
      });

      // 3. Group Visits
      const visitMap = {};
      const visitKeys = new Set();
      activeVisits.forEach(v => {
        const rawName = (v.namaCrew || v.kodeCrew || '').trim();
        if (!rawName) return;
        const cleanN = normKey(v.namaCrew);
        const cleanId = normKey(v.kodeCrew);
        if (cleanN) visitKeys.add(cleanN);
        if (cleanId) visitKeys.add(cleanId);

        if (!visitMap[cleanN]) {
          visitMap[cleanN] = {
            namaCrew: rawName,
            kodeCrew: v.kodeCrew || '-',
            modul: v._officialModul || this.getCrewOfficialModul(rawName, v.modul || v.prefix || '-'),
            visitCount: 0,
            stores: new Set(),
            firstVisitTime: v.time || v.waktu || '',
            lastVisitTime: v.time || v.waktu || '',
            noWa: userPhoneMap[cleanN] || (cleanId ? userPhoneMap[cleanId] : '') || ''
          };
        }
        visitMap[cleanN].visitCount++;
        if (v.kodeToko) visitMap[cleanN].stores.add(v.kodeToko);
      });

      // 4. Anomaly A: Absen Masuk tapi 0 Kunjungan (Kecuali yang bertugas/Visit DC)
      const absenNoVisit = [];
      Object.keys(absenMasukMap).forEach(cleanN => {
        const rec = absenMasukMap[cleanN];
        const cleanId = normKey(rec.kodeCrew);
        const isDc = visitDcKeys.has(cleanN) || (cleanId && visitDcKeys.has(cleanId));

        // Personil Visit DC bekerja sah di DC sehingga tidak dianggap anomali absen 0 visit
        if (!isDc) {
          if (!visitMap[cleanN] || visitMap[cleanN].visitCount === 0) {
            absenNoVisit.push(rec);
          }
        }
      });
      absenNoVisit.sort((a, b) => a.modul.localeCompare(b.modul) || a.namaCrew.localeCompare(b.namaCrew));

      // 5. Anomaly B: Ada Kunjungan tapi Belum Absen Masuk
      const visitNoAbsen = [];
      Object.keys(visitMap).forEach(cleanN => {
        const vObj = visitMap[cleanN];
        const cleanId = normKey(vObj.kodeCrew);
        const hasAbsen = absenMasukKeys.has(cleanN) || (cleanId && absenMasukKeys.has(cleanId));

        if (!hasAbsen) {
          visitNoAbsen.push({
            namaCrew: vObj.namaCrew,
            kodeCrew: vObj.kodeCrew,
            modul: vObj.modul,
            visitCount: vObj.visitCount,
            uniqueStores: vObj.stores.size,
            firstVisitTime: vObj.firstVisitTime,
            noWa: vObj.noWa
          });
        }
      });
      visitNoAbsen.sort((a, b) => a.modul.localeCompare(b.modul) || a.namaCrew.localeCompare(b.namaCrew));

      // 6. Anomaly C: Lupa Absen Pulang (Sudah Absen Masuk tapi Belum Absen Pulang)
      const lupaPulangList = [];
      Object.keys(absenMasukMap).forEach(cleanN => {
        if (!absenPulangMap[cleanN]) {
          lupaPulangList.push({
            ...absenMasukMap[cleanN],
            visitCount: visitMap[cleanN] ? visitMap[cleanN].visitCount : 0
          });
        }
      });
      lupaPulangList.sort((a, b) => a.modul.localeCompare(b.modul) || a.namaCrew.localeCompare(b.namaCrew));

      // 7. Anomaly D: Alpha (Deduplicated Roster Check: Belum Absen & Belum Visit)
      const alphaList = [];
      const seenAlpha = new Set();

      uniqueMasterUsers.forEach((u, cleanN) => {
        const cleanId = normKey(u.id);
        const hasMasuk = absenMasukKeys.has(cleanN) || (cleanId && absenMasukKeys.has(cleanId));
        const hasVisit = visitKeys.has(cleanN) || (cleanId && visitKeys.has(cleanId));
        const hasIzin = izinSakitKeys.has(cleanN) || (cleanId && izinSakitKeys.has(cleanId));

        if (!hasMasuk && !hasVisit && !hasIzin) {
          if (!seenAlpha.has(cleanN)) {
            seenAlpha.add(cleanN);
            alphaList.push({
              namaCrew: u.nama,
              kodeCrew: u.id || '-',
              modul: u.modul || this.getCrewOfficialModul(u.nama, '-'),
              noWa: u.noWa || userPhoneMap[cleanN] || ''
            });
          }
        }
      });
      alphaList.sort((a, b) => (a.modul || '').localeCompare(b.modul || '') || (a.namaCrew || '').localeCompare(b.namaCrew || ''));

      // Total Roster
      const totalRoster = uniqueMasterUsers.size;
      const totalAbsenMasuk = Object.keys(absenMasukMap).length;
      const totalActiveVisit = Object.keys(visitMap).length;
      const totalNormalVisit = Math.max(0, totalActiveVisit - visitNoAbsen.length);
      const totalCutiIzinSakit = cutiList.length + sakitList.length + izinList.length;
      const totalBelumAbsenMasuk = alphaList.length + visitNoAbsen.length;

      return {
        totalRoster: totalRoster,
        totalAbsenMasuk: totalAbsenMasuk,
        totalActiveVisit: totalActiveVisit,
        totalNormalVisit: totalNormalVisit,
        totalTerlambat: terlambatList.length,
        totalTepatWaktu: Math.max(0, totalAbsenMasuk - terlambatList.length),
        totalIzinSakit: totalCutiIzinSakit,
        totalBelumAbsenMasuk: totalBelumAbsenMasuk,
        totalAlpha: alphaList.length,
        absenNoVisit: absenNoVisit,
        visitNoAbsen: visitNoAbsen,
        terlambatList: terlambatList,
        lupaPulangList: lupaPulangList,
        izinList: izinList,
        sakitList: sakitList,
        cutiList: cutiList,
        visitDcList: visitDcList,
        gpsIssueList: gpsIssueList,
        alphaList: alphaList,
        totalAnomalies: absenNoVisit.length + visitNoAbsen.length + terlambatList.length + gpsIssueList.length
      };
    },

    /**
     * Anomaly Modal Controls
     */
    openAnomalyModal() {
      this.anomalyModal.isOpen = true;
      this.anomalyModal.copiedSuccess = false;
      this.$nextTick(() => {
        if (window.lucide) lucide.createIcons();
      });
    },

    closeAnomalyModal() {
      this.anomalyModal.isOpen = false;
    },

    setAnomalyTab(tabName) {
      this.anomalyModal.activeTab = tabName;
    },

    /**
     * Send WhatsApp Reminder to Crew with Pre-filled Message
     */
    sendCrewWaReminder(crew, type) {
      let cleanPhone = (crew.noWa || '').replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '62' + cleanPhone.slice(1);
      }

      let msg = '';
      const nama = crew.namaCrew || 'Rekan MDS';

      if (type === 'ABSEN_NO_VISIT') {
        msg = `Halo Rekan *${crew.namaCrew}* (${crew.modul}), Anda tercatat sudah *Absen Masuk* pukul ${crew.waktuMasuk || 'pagi ini'}, namun di sistem monitoring dashboard belum ada data kunjungan toko yang masuk. Apakah ada kendala di lapangan? Mohon konfirmasi & update kunjungannya ya. Semangat! 🙏`;
      } else if (type === 'VISIT_NO_ABSEN') {
        msg = `Halo Rekan *${crew.namaCrew}* (${crew.modul}), Anda tercatat sudah menyelesaikan *${crew.visitCount} kunjungan toko* hari ini, namun Anda *belum melakukan Absen Masuk* di Web Absen. Mohon segera input absensi masuk ya. Terima kasih! 🙏`;
      } else if (type === 'TERLAMBAT') {
        msg = `Halo Rekan *${crew.namaCrew}* (${crew.modul}), Anda tercatat *Absen Masuk* pukul ${crew.waktuMasuk || '-'} (melewati batas waktu 08:00). Mohon konfirmasi alasan keterlambatan dan pastikan target rute tetap tercapai ya. Semangat! 🙏`;
      } else if (type === 'LUPA_PULANG') {
        msg = `Halo Rekan *${crew.namaCrew}* (${crew.modul}), Anda tercatat sudah menyelesaikan tugas kunjungan hari ini, namun di sistem tercatat *belum melakukan Absen Pulang*. Mohon segera tap Absen Pulang di Web Absen ya. Terima kasih! 🙏`;
      } else if (type === 'ALPHA') {
        msg = `Halo Rekan *${crew.namaCrew}* (${crew.modul}), hingga saat ini Anda tercatat *belum melakukan Absen Masuk* dan belum ada aktivitas kunjungan toko hari ini. Mohon segera berikan konfirmasi kehadiran/kendala kepada Leader. Terima kasih. 🙏`;
      } else if (type === 'GPS_ISSUE') {
        msg = `Halo Rekan *${crew.namaCrew}* (${crew.modul}), saat absensi terdeteksi *koordinat GPS tidak aktif/tidak valid*. Mohon pastikan GPS/Lokasi HP dalam mode akurasi tinggi saat submit absensi/kunjungan ya. Terima kasih. 🙏`;
      } else {
        msg = `Halo Rekan *${crew.namaCrew}* (${crew.modul}), mohon konfirmasi status operasional dan absensi hari ini. Terima kasih. 🙏`;
      }

      const encoded = encodeURIComponent(msg);
      if (cleanPhone && cleanPhone.length >= 9) {
        window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`, '_blank');
      } else {
        window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
      }
    },

    /**
     * Build Dedicated Discipline & Attendance Audit Report (Internal SPV & Leaders)
     */
    get anomalyReportText() {
      const a = this.auditAnomalies;
      const dateStr = this.activeDateLabel || 'Hari Ini';
      const modStr = this.selectedModul === 'ALL' ? 'Nasional (Semua Modul)' : `Modul ${this.selectedModul}`;

      let text = `🚨 *LAPORAN AUDIT DISIPLIN & ANOMALI ABSENSI MDS*\n`;
      text += `📅 *Periode:* ${dateStr}\n`;
      text += `🏢 *Cakupan:* ${modStr}\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

      // 1. Absen Masuk tapi 0 Kunjungan
      if (a.absenNoVisit.length > 0) {
        text += `🔴 *1. ABSEN MASUK TAPI 0 KUNJUNGAN (${a.absenNoVisit.length} MDS):*\n`;
        a.absenNoVisit.forEach((c, i) => {
          text += `${i + 1}. *${c.namaCrew}* (${c.modul}) - _Jam Masuk: ${c.waktuMasuk}_\n`;
        });
        text += `\n`;
      }

      // 2. Ada Kunjungan tapi Belum Absen
      if (a.visitNoAbsen.length > 0) {
        text += `🟡 *2. ADA KUNJUNGAN TAPI BELUM ABSEN (${a.visitNoAbsen.length} MDS):*\n`;
        a.visitNoAbsen.forEach((c, i) => {
          text += `${i + 1}. *${c.namaCrew}* (${c.modul}) - _${c.visitCount} Toko Dikunjungi_\n`;
        });
        text += `\n`;
      }

      // 3. Terlambat Masuk
      if (a.terlambatList.length > 0) {
        text += `⏰ *3. ABSEN MASUK TERLAMBAT (>08:00) (${a.terlambatList.length} MDS):*\n`;
        a.terlambatList.forEach((c, i) => {
          text += `${i + 1}. *${c.namaCrew}* (${c.modul}) - _Masuk: ${c.waktuMasuk} (+${c.lateMinutes} mnt)_\n`;
        });
        text += `\n`;
      }

      // 4. Belum Absen Pulang
      if (a.lupaPulangList.length > 0 && a.lupaPulangList.length <= 25) {
        text += `🏠 *4. BELUM ABSEN PULANG (${a.lupaPulangList.length} MDS):*\n`;
        a.lupaPulangList.forEach((c, i) => {
          text += `${i + 1}. *${c.namaCrew}* (${c.modul}) - _${c.visitCount} Toko Selesai_\n`;
        });
        text += `\n`;
      }

      // 5. Keterangan Khusus (Izin / Sakit / Cuti / DC)
      const allIzinSakit = [
        ...a.sakitList.map(c => ({ ...c, label: 'SAKIT' })),
        ...a.izinList.map(c => ({ ...c, label: 'IZIN' })),
        ...a.cutiList.map(c => ({ ...c, label: 'CUTI' })),
        ...a.visitDcList.map(c => ({ ...c, label: c.dcNote ? `VISIT DC (${c.dcNote})` : 'VISIT DC' }))
      ];
      if (allIzinSakit.length > 0) {
        text += `🏥 *5. KETERANGAN KHUSUS (${allIzinSakit.length} MDS):*\n`;
        allIzinSakit.forEach((c, i) => {
          text += `${i + 1}. *${c.namaCrew}* (${c.modul}) - _${c.label}_\n`;
        });
        text += `\n`;
      }

      // 6. GPS Issue
      if (a.gpsIssueList.length > 0) {
        text += `📍 *6. ABSEN TANPA GPS / 0,0 (${a.gpsIssueList.length} Kasus):*\n`;
        a.gpsIssueList.forEach((c, i) => {
          text += `${i + 1}. *${c.namaCrew}* (${c.modul}) - _Absen ${c.status} (${c.waktu})_\n`;
        });
        text += `\n`;
      }

      // 7. Alpha / Belum Absen
      if (a.alphaList.length > 0) {
        text += `❓ *7. BELUM ABSEN & BELUM VISIT (${a.alphaList.length} MDS):*\n`;
        a.alphaList.forEach((c, i) => {
          text += `${i + 1}. *${c.namaCrew}* (${c.modul})\n`;
        });
        text += `\n`;
      }

      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `Terima kasih.`;
      return text;
    },

    /**
     * Copy Dedicated Anomaly Audit Text
     */
    copyAnomalyReport() {
      const text = this.anomalyReportText;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          this.anomalyModal.copiedSuccess = true;
          setTimeout(() => { this.anomalyModal.copiedSuccess = false; }, 3500);
        });
      }
    },

    /**
     * Share Dedicated Anomaly Audit Text to WhatsApp
     */
    shareAnomalyReport() {
      const text = this.anomalyReportText;
      const encoded = encodeURIComponent(text);
      if (navigator.share) {
        navigator.share({
          title: 'Laporan Audit Anomali Absen vs Kunjungan MDS',
          text: text
        }).catch(() => {
          window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
        });
      } else {
        window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
      }
    },

    /**
     * Get Formatted Text Report for WhatsApp Broadcast (Route Realization Broadcast vs Full Ops)
     */
    get waFullReportText() {
      const list = this.waReportList;
      const summary = this.waReportSummary;
      const dateStr = this.activeDateLabel || 'Hari Ini';
      const regStr = this.activeWaRegionName;

      const tuntas = list.filter(c => c.status === 'TUNTAS');
      const onProgress = list.filter(c => c.status === 'ON_PROGRESS');
      const belumJalan = list.filter(c => c.status === 'BELUM_JALAN');
      const nonRute = list.filter(c => c.status === 'NON_RUTE');
      const belumInput = list.filter(c => c.status === 'BELUM_INPUT');
      const tugasDc = list.filter(c => c.status === 'TUGAS_DC');

      if (this.waReportModal.reportType === 'FULL_OPS') {
        const a = this.auditAnomalies;

        // Scope lists to active WA region
        const filterByReg = (items) => {
          if (!items || items.length === 0) return [];
          const regCode = this.waReportModal.selectedRegion || 'JABODETABEK';
          if (regCode === 'ALL') return items;
          const found = this.waRegions.find(r => r.code === regCode);
          if (found && found.modules.length > 0) {
            return items.filter(c => {
              const mClean = (c.modul || '').toUpperCase().trim();
              return found.modules.some(m => mClean === m || mClean.startsWith(m + '-') || mClean.startsWith(m + ' ') || mClean.startsWith(m) || (m === 'DK' && mClean.startsWith('DK')) || (m === 'LP' && mClean.startsWith('LP')) || (m === 'LK' && mClean.startsWith('LK')));
            });
          }
          return items.filter(c => (c.modul || '').toUpperCase().includes(regCode));
        };

        const regAbsenNoVisit = filterByReg(a.absenNoVisit);
        const regVisitNoAbsen = filterByReg(a.visitNoAbsen);
        const regTerlambat = filterByReg(a.terlambatList);
        const regIzinSakit = [
          ...filterByReg(a.sakitList).map(c => ({ ...c, label: 'SAKIT' })),
          ...filterByReg(a.izinList).map(c => ({ ...c, label: 'IZIN' })),
          ...filterByReg(a.cutiList).map(c => ({ ...c, label: 'CUTI' })),
          ...filterByReg(a.visitDcList).map(c => ({ ...c, label: c.dcNote ? `VISIT DC (${c.dcNote})` : 'VISIT DC' }))
        ];
        const regAlpha = filterByReg(a.alphaList);

        let text = `📋 *LAPORAN KOMPREHENSIF RUTE & KEDISIPLINAN MDS*\n`;
        text += `🏢 *Grup:* ${regStr}\n`;
        text += `📅 *Periode:* ${dateStr}\n`;
        text += `📊 *Realisasi Toko:* *${summary.rate}%* (${summary.totalVisits}/${summary.totalTarget} Toko)\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

        if (tuntas.length > 0) {
          text += `🟢 *1. RUTE TUNTAS 100% (${tuntas.length} MDS):*\n`;
          tuntas.forEach((c, i) => {
            const dcLabel = c.isVisitDc ? ' - Kompensasi Visit DC' : '';
            text += `${i + 1}. *${c.namaCrew}* (${c.modul}): ${c.visitedCount}/${c.targetCount} Toko (100%${dcLabel}) ✅\n`;
          });
          text += `\n`;
        }

        if (tugasDc.length > 0) {
          text += `🏢 *TUGAS DC / KANTOR (${tugasDc.length} MDS):*\n`;
          tugasDc.forEach((c, i) => {
            text += `${i + 1}. *${c.namaCrew}* (${c.modul}) - _Tugas DC (${c.dcNote || 'Bebas Rute Toko'})_\n`;
          });
          text += `\n`;
        }

        if (onProgress.length > 0) {
          text += `🟡 *2. PROGRES RUTE BELUM TUNTAS (${onProgress.length} MDS):*\n`;
          onProgress.forEach((c, i) => {
            text += `${i + 1}. *${c.namaCrew}* (${c.modul}): ${c.visitedCount}/${c.targetCount} Toko (${c.rate}%)\n`;
          });
          text += `\n`;
        }

        if (belumJalan.length > 0) {
          text += `🔴 *3. BELUM ADA KUNJUNGAN / 0 TOKO (${belumJalan.length} MDS):*\n`;
          belumJalan.forEach((c, i) => {
            text += `${i + 1}. *${c.namaCrew}* (${c.modul}) - Target: ${c.targetCount} Toko\n`;
          });
          text += `\n`;
        }

        if (nonRute.length > 0) {
          text += `🔵 *KUNJUNGAN NON-RUTE (${nonRute.length} MDS):*\n`;
          nonRute.forEach((c, i) => {
            text += `${i + 1}. *${c.namaCrew}* (${c.modul}): ${c.visitedCount} Toko (Di Luar Rute Terjadwal)\n`;
          });
          text += `\n`;
        }

        if (belumInput.length > 0) {
          text += `⚪ *4. BELUM INPUT JADWAL RUTE (${belumInput.length} MDS):*\n`;
          belumInput.forEach((c, i) => {
            text += `${i + 1}. *${c.namaCrew}* (${c.modul})\n`;
          });
          text += `\n`;
        }

        // Ringkasan catatan kedisiplinan (singkat)
        const totalDisiplinIssues = regAbsenNoVisit.length + regVisitNoAbsen.length + regTerlambat.length + regAlpha.length;
        if (totalDisiplinIssues > 0 || regIzinSakit.length > 0) {
          text += `━━━━━━━━━━━━━━━━━━━━━\n`;
          text += `⚠️ *CATATAN KEDISIPLINAN PERSONIL:*\n`;
          if (regTerlambat.length > 0) text += `• Terlambat Masuk (>08:00): ${regTerlambat.length} MDS\n`;
          if (regAbsenNoVisit.length > 0) text += `• Absen Masuk tapi 0 Toko: ${regAbsenNoVisit.length} MDS\n`;
          if (regVisitNoAbsen.length > 0) text += `• Ada Kunjungan Belum Absen: ${regVisitNoAbsen.length} MDS\n`;
          if (regAlpha.length > 0) text += `• Belum Absen & Belum Visit: ${regAlpha.length} MDS\n`;
          if (regIzinSakit.length > 0) text += `• Izin/Sakit/Cuti/DC: ${regIzinSakit.length} MDS\n`;
          text += `_Detail audit kehadiran dapat dilihat di Menu 🚨 Audit Anomali._\n\n`;
        }

        text += `━━━━━━━━━━━━━━━━━━━━━\n`;
        text += `Terima kasih.`;
        return text;
      }

      // ROUTE_ONLY (DEFAULT FORMAT BROADCAST WHATSAPP)
      let text = `📋 *LAPORAN REALISASI RUTE & KUNJUNGAN TOKO MDS*\n`;
      text += `🏢 *Grup:* ${regStr}\n`;
      text += `📅 *Periode:* ${dateStr}\n`;
      text += `📊 *Pencapaian:* *${summary.rate}%* (${summary.totalVisits}/${summary.totalTarget} Toko Dikunjungi)\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

      if (tuntas.length > 0) {
        text += `🟢 *1. RUTE TUNTAS 100% (${tuntas.length} MDS):*\n`;
        tuntas.forEach((c, i) => {
          const dcLabel = c.isVisitDc ? ' (Visit DC)' : '';
          text += `${i + 1}. *${c.namaCrew}* (${c.modul}) - ${c.visitedCount}/${c.targetCount} Toko (100%${dcLabel}) ✅\n`;
        });
        text += `\n`;
      }

      if (tugasDc.length > 0) {
        text += `🏢 *TUGAS DC / KANTOR (${tugasDc.length} MDS):*\n`;
        tugasDc.forEach((c, i) => {
          text += `${i + 1}. *${c.namaCrew}* (${c.modul}) - _Tugas DC (${c.dcNote || 'Bebas Rute Toko'})_\n`;
        });
        text += `\n`;
      }

      if (onProgress.length > 0) {
        text += `🟡 *2. PROGRES RUTE BELUM TUNTAS (${onProgress.length} MDS):*\n`;
        onProgress.forEach((c, i) => {
          text += `${i + 1}. *${c.namaCrew}* (${c.modul}): ${c.visitedCount}/${c.targetCount} Toko (${c.rate}%)\n`;
        });
        text += `\n`;
      }

      if (belumJalan.length > 0) {
        text += `🔴 *3. BELUM ADA KUNJUNGAN / 0 TOKO (${belumJalan.length} MDS):*\n`;
        belumJalan.forEach((c, i) => {
          text += `${i + 1}. *${c.namaCrew}* (${c.modul}) - Target: ${c.targetCount} Toko\n`;
        });
        text += `\n`;
      }

      if (nonRute.length > 0) {
        text += `🔵 *KUNJUNGAN NON-RUTE (${nonRute.length} MDS):*\n`;
        nonRute.forEach((c, i) => {
          text += `${i + 1}. *${c.namaCrew}* (${c.modul}): ${c.visitedCount} Toko (Di Luar Rute Terjadwal)\n`;
        });
        text += `\n`;
      }

      if (belumInput.length > 0) {
        text += `⚪ *4. BELUM INPUT JADWAL RUTE (${belumInput.length} MDS):*\n`;
        belumInput.forEach((c, i) => {
          text += `${i + 1}. *${c.namaCrew}* (${c.modul})\n`;
        });
        text += `\n`;
      }

      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `Terima kasih.`;
      return text;
    },

    /**
     * Copy Full Structured Text for WhatsApp
     */
    copyWaText() {
      const text = this.waFullReportText;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          this.waReportModal.textCopiedSuccess = true;
          setTimeout(() => { this.waReportModal.textCopiedSuccess = false; }, 3500);
        });
      }
    },

    /**
     * Direct Share Text to WhatsApp in 1 Tap
     */
    shareTextToWhatsApp() {
      const text = this.waFullReportText;
      const encoded = encodeURIComponent(text);
      if (navigator.share) {
        navigator.share({
          title: 'Rekap Realisasi Rute MDS',
          text: text
        }).catch(() => {
          window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
        });
      } else {
        window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
      }
    },

    /**
     * Modal: Open Photo Viewer
     */
    async openPhotoModal(visit) {
      this.photoModal.visitInfo = visit;
      this.photoModal.title = `Foto Kunjungan: ${visit.namaToko || 'Toko'} (${visit.account || ''})`;
      this.photoModal.photoSelfie = visit.fotoSelfie ? await ApiService.resolveImage(visit.fotoSelfie) : '';
      
      const befores = [visit.fotoBefore1, visit.fotoBefore2, visit.fotoBefore3, visit.fotoBefore4].filter(Boolean);
      const afters = [visit.fotoAfter1, visit.fotoAfter2, visit.fotoAfter3, visit.fotoAfter4].filter(Boolean);

      this.photoModal.photoBefore = await Promise.all(befores.map(p => ApiService.resolveImage(p)));
      this.photoModal.photoAfter = await Promise.all(afters.map(p => ApiService.resolveImage(p)));

      // Default active preview
      this.photoModal.activePhotoUrl = this.photoModal.photoSelfie || (this.photoModal.photoBefore[0] || '');
      this.photoModal.activePhotoLabel = this.photoModal.photoSelfie ? 'Foto Selfie Depan Toko' : 'Foto Display';
      this.photoModal.isOpen = true;
    },

    setActivePhoto(url, label) {
      this.photoModal.activePhotoUrl = url;
      this.photoModal.activePhotoLabel = label;
    },

    closePhotoModal() {
      this.photoModal.isOpen = false;
    },

    /**
     * Modal: Open Detail Audit Produk
     */
    async openAuditModal(visit) {
      this.auditModal.tokoName = visit.namaToko || 'Toko';
      this.auditModal.modul = visit.modul || visit.prefix || 'DK1';
      this.auditModal.isOpen = true;
      this.auditModal.isLoading = true;
      this.auditModal.items = [];

      try {
        const items = await ApiService.getDetailAudit(this.auditModal.modul, visit.idVisit);
        this.auditModal.items = items || [];
      } catch (e) {
        console.error('Gagal mengambil detail audit:', e);
      } finally {
        this.auditModal.isLoading = false;
      }
    },

    closeAuditModal() {
      this.auditModal.isOpen = false;
    },

    /**
     * Export Filtered Data to CSV
     */
    exportVisitsToCSV() {
      const data = this.filteredVisits;
      if (data.length === 0) {
        alert('Tidak ada data yang bisa diexport.');
        return;
      }

      const headers = ['ID Visit', 'Modul', 'Tanggal', 'Jam', 'Kode Crew', 'Nama Crew', 'Account', 'Kode Toko', 'Nama Toko', 'Tipe Toko', 'Koordinat GPS'];
      const csvRows = [headers.join(',')];

      data.forEach(v => {
        const row = [
          `"${v.idVisit || ''}"`,
          `"${v.modul || ''}"`,
          `"${v.date || ''}"`,
          `"${v.time || ''}"`,
          `"${v.kodeCrew || ''}"`,
          `"${(v.namaCrew || '').replace(/"/g, '""')}"`,
          `"${v.account || ''}"`,
          `"${v.kodeToko || ''}"`,
          `"${(v.namaToko || '').replace(/"/g, '""')}"`,
          `"${v.tipeToko || ''}"`,
          `"${v.koordinat || ''}"`
        ];
        csvRows.push(row.join(','));
      });

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Laporan_Kunjungan_MDS_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
}

