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
    activeTab: 'kunjungan', // 'kunjungan' | 'absensi' | 'jadwal' | 'audit' | 'control_panel'
    showAppMenu: false, // Dropdown switcher for 5 app modules
    showCategoryMenu: false, // Flyout Mega Menu (Alfagift style)
    activeMegaCategory: 'operasional', // 'operasional' | 'evaluasi' | 'master' | 'laporan' | 'modul'
    categoryMenuTimer: null,
    isLoading: true,
    loadingMessage: 'Menghubungkan ke Database Central...',
    loadingStage: 1, // 1: Connecting, 2: Fetching, 3: Processing

    // Firebase & RBAC Authentication State
    currentUser: null, // { uid, email, displayName, role, isSuperAdmin }
    isLoginModalOpen: false,
    loginEmail: '',
    loginPassword: '',
    loginLoading: false,
    loginError: '',
    loginForm: { email: '', password: '', isLoading: false, error: '' }, // backward compatibility
    rbacUsers: [], // Array of user objects for x-for & filtering in matrix table
    rbacMatrix: {}, // { [email]: userObj }
    rbacSearch: '',
    rbacSearchText: '', // alias
    rbacFilterRole: 'ALL', // 'ALL' | 'SUPERADMIN' | 'SPV' | 'MDS'
    rbacRoleFilter: 'ALL', // alias
    rbacFilterModul: 'ALL',
    rbacModulFilter: 'ALL', // alias
    rbacIsSaving: false,
    isSavingRbac: false, // alias
    unauthorizedModalOpen: false,
    unauthorizedTargetTab: '',
    unauthorizedAttemptTab: '', // alias
    userDropdownOpen: false,
    showAddUserModal: false,
    showSubTabConfigModal: false,
    activeSubTabConfigUser: null,
    showSpvTeamModal: false,
    activeSpvTeamUser: null,
    spvMdsSearch: '',
    activeCrewDropdownUserId: null,
    crewDropdownSearch: '',
    showNewUserCrewDropdown: false,
    newUserCrewSearch: '',
    // Anomaly Trend & Monthly Leaderboard State
    anomalyViewMode: 'DAILY', // 'DAILY' | 'TREND'
    anomalyTrendCategory: 'ALL', // 'ALL' | 'terlambat' | 'absenNoVisit' | 'visitNoAbsen' | 'lupaPulang' | 'gpsIssue' | 'alpha'
    anomalyLeaderboardFilterModul: 'ALL',
    anomalyLeaderboardSearch: '',
    anomalyLeaderboardPage: 1,
    anomalyLeaderboardPageSize: 10,
    newUserForm: {
      name: '',
      email: '',
      modul: 'ALL',
      role: 'MDS',
      linkedCrew: '',
      jabatan: 'Merchandiser',
      permissions: {
        kunjungan: true,
        absensi: true,
        jadwal: false,
        tokonasional: false,
        laporan: false,
        evaluasi: false,
        galeri: false,
        simulasi: false
      }
    },
    
    // Period & Archive
    selectedPeriod: 'LIVE', // 'LIVE' or fileId of monthly backup
    archiveList: [],

    // 1. Filters Tab 1: Kunjungan Lapangan & KPI
    selectedModul: 'ALL',
    dateFilter: 'LATEST_DAY', // 'LATEST_DAY' | 'TODAY' | '7_DAYS' | 'THIS_MONTH' | 'CUSTOM'
    isCustomDateOpen: false, // Lightweight state for custom date picker box (Zero reactivity spike)
    dateDropdownOpen: false, // Custom popover state (Instant 0ms opening matching MDS dropdown)
    dateOptions: [
      { value: 'LATEST_DAY', label: '⚡ Hari Terakhir Aktif (Auto)' },
      { value: 'YESTERDAY', label: '🕒 Kemarin / H-1 (Evaluasi)' },
      { value: 'TODAY', label: '📅 Hari Ini Saja (Real-time)' },
      { value: '7_DAYS', label: '📊 7 Hari Terakhir' },
      { value: 'THIS_MONTH', label: '🗓️ Bulan Ini (Semua)' },
      { value: 'CUSTOM', label: '📆 Pilih Rentang Tanggal...' }
    ],
    activeDateLabel: '',
    startDate: '',
    endDate: '',
    customStartInput: '',
    customEndInput: '',
    selectedAccount: 'ALL',
    searchInputText: '',
    searchQuery: '',
    selectedCrew: '',
    selectedCrews: [], // Applied Multi-selected MDS names (e.g. ['AHMAD GHOZALI', 'ABDUL KHOLIK'])
    tempSelectedCrews: [], // Temporary selection inside dropdown (Staged until "Done" clicked)
    crewDropdownOpen: false, // Dropdown popover open/close state
    crewDropdownSearch: '', // Search text inside the crew dropdown popover
    expandedCrews: {}, // State map for expandable cards: { crewKey: true/false }
    viewModeTab1: 'CARDS', // 'CARDS' | 'TABLE' (Switchable view mode)

    // 2. Filters Tab 2: Absensi Tim (Independent Scoped Filter)
    filterAbsensi: {
      modul: 'ALL',
      dateFilter: 'LATEST_DAY',
      activeDateLabel: '',
      startDate: '',
      endDate: '',
      customStartInput: '',
      customEndInput: '',
      status: 'ALL', // 'ALL' | 'LENGKAP' | 'MASUK_ONLY' | 'PULANG_ONLY'
      searchInputText: '',
      searchQuery: ''
    },

    // 3. Filters Tab 3: Target Jadwal Rute (Independent Scoped Filter - On Demand)
    filterJadwal: {
      modul: 'ALL',
      selectedCrew: 'ALL',
      rute: 'ALL', // 'ALL' | '1' .. '31'
      showRuteGridMenu: false,
      account: 'ALL',
      searchInputText: '',
      searchQuery: '',
      // Applied filter states (Activated on "Terapkan Filter")
      appliedModul: 'ALL',
      appliedSelectedCrew: 'ALL',
      appliedRute: 'ALL',
      appliedAccount: 'ALL',
      appliedSearchQuery: ''
    },

    // 4. Filters Tab 4: Database Toko Nasional (49k) (IndexedDB High-Performance Cache)
    stores49k: [],
    isStores49kLoading: false,
    stores49kLastSynced: null,
    filterTokoNasional: {
      searchInputText: '',
      searchQuery: '',
      account: 'ALL',
      page: 1,
      pageSize: 50
    },

    // Maps State for Tab 3 & Tab 4
    jadwalMapStats: { totalStores: 0, validCount: 0, totalDistKm: '0' },
    selectedStoreForMap: null,
    nearest10Stores: [],

    // Auto-Suggest State for Store Search (Tab 3 & Tab 4)
    jadwalStoreSuggestions: [],
    showJadwalSuggestions: false,
    tokoNasionalSuggestions: [],
    showTokoNasionalSuggestions: false,

    // 5. Centralized Reporting Tab & Multi-Dimensional Analytics Table State
    reportViewMode: 'TABLE', // 'TABLE' | 'BROADCAST'
    reportTableSubTab: 'rute', // 'rute' | 'jadwal' | 'absen' | 'anomali'
    reportTableFilter: {
      searchInput: '',
      searchQuery: '',
      region: 'ALL', // 'ALL' | 'JABODETABEK' | 'JABAR' | 'JATENG' | 'JATIM_BALI' | 'LUAR_JAWA'
      statusCategory: 'ALL',
      dateFilter: 'LATEST_DAY', // 'LATEST_DAY' | 'TODAY' | 'YESTERDAY' | '7_DAYS' | 'THIS_MONTH' | 'CUSTOM'
      startDate: '',
      endDate: '',
      customStartInput: '',
      customEndInput: '',
      page: 1,
      pageSize: 25,
      sortCol: 'namaCrew',
      sortAsc: true
    },
    reportTab: {
      selectedRegion: 'JABODETABEK',
      reportType: 'ROUTE_ONLY', // 'ROUTE_ONLY' | 'FULL_OPS' | 'INFOGRAPHIC' | 'ANOMALY' | 'REMINDER'
      textCopiedSuccess: false,
      imageCopiedSuccess: false,
      imageDownloadedSuccess: false
    },

    // 6. Evaluasi Kinerja SPV & Scorecard MTD (Tab 6 - Executive Evaluation)
    filterSpv: {
      spv: 'ALL', // 'ALL' | 'DK' | 'LK' | 'LP'
      month: 'CURRENT', // 'CURRENT' | '2026-09' | '2026-08' | 'ALL'
      dateFilter: 'ALL', // 'ALL' | 'TODAY' | 'CUSTOM'
      startDate: '',
      endDate: '',
      activeSubTable: 'ALL', // 'ALL' | 'TOKO' | 'DC'
      searchQuery: '',
      searchInput: '',
      page: 1,
      pageSize: 50
    },
    isDownloadingPng: null,
    spvConfigs: [
      { code: 'ALL', name: 'Semua SPV & Wilayah Nasional', spvName: 'Nasional', prefix: 'ALL' },
      { code: 'DK', name: 'DK (Jabodetabek) - Ibnu Fazarial', spvName: 'Ibnu Fazarial', prefix: 'DK', modules: ['DK1','DK2','DK3','DK4','DK5','DK6','DK'] },
      { code: 'LK', name: 'LK (Jawa Bali) - Dwi Amanto', spvName: 'Dwi Amanto', prefix: 'LK', modules: ['LK1','LK2','LK3','LK4','LK5','LK'] },
      { code: 'LP', name: 'LP (Luar Pulau) - Siti Pasikha', spvName: 'Siti Pasikha', prefix: 'LP', modules: ['LP1','LP2','LP3','LP4','LP'] }
    ],

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
      visitInfo: null,
      zoom: 1,
      panX: 0,
      panY: 0,
      rotation: 0,
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0
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

    crudModal: {
      isOpen: false,
      mode: 'edit', // 'edit' | 'transfer' | 'delete' | 'create_master' | 'purge_duplicates'
      title: '',
      item: null,
      formData: {
        modul: '',
        account: '',
        kodeToko: '',
        namaToko: '',
        rute: '1',
        namaCrew: '',
        kodeCrew: '',
        newModul: '',
        newCrewName: '',
        newCrewCode: '',
        newRute: '1',
        dcName: '',
        kecamatan: '',
        kota: '',
        provinsi: '',
        lat: '',
        lon: ''
      },
      isSubmitting: false,
      statusMsg: '',
      isSuccess: false,
      errorMsg: '',
      auditResult: null
    },

    // Pagination
    currentPage: 1,
    itemsPerPage: 15,
    pageSize: 15,

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
      this.dismissPreloader();

      // Inisialisasi Firebase Auth & RBAC Permissions Matrix
      await this.initRbac();

      // Check if session can be restored instantly from IndexedDB (< 15ms) - Zero Loading Screen!
      const restored = await this.restoreSessionState();

      if (restored && this.visits.length > 0) {
        this.isLoading = false;
        this.currentPage = 1;

        requestAnimationFrame(() => {
          this.refreshCharts();
          if (window.lucide) lucide.createIcons();
          if (this.activeTab === 'kunjungan' && document.getElementById('visits-map')) {
            MapService.initMap('visits-map', this.theme === 'dark');
            MapService.renderVisitsOnMap(this.filteredVisits);
          }
        });

        // Background Silent Revalidation: Refresh data quietly without blocking user screen
        setTimeout(() => {
          this.refreshAllData(false);
          this.loadArchiveMonths();
        }, 150);
      } else {
        // Initial Cold Fetch (Only when no cache in IndexedDB)
        await this.refreshAllData(true);
        this.loadArchiveMonths();
      }

      // Setup Lucide icons & Watch activeTab for Lazy Loading heavy modules
      this.$nextTick(() => {
        if (window.lucide) lucide.createIcons();
      });

      if (typeof this.$watch === 'function') {
        this.$watch('activeTab', (newTab) => {
          this.$nextTick(() => {
            if (window.lucide) lucide.createIcons();
            if (newTab === 'evaluasi') {
              setTimeout(() => this.refreshSpvCharts(), 80);
            } else if (newTab === 'tokonasional') {
              if (!this.stores49k || this.stores49k.length === 0) {
                this.initStores49k();
              }
            } else if (newTab === 'kunjungan') {
              setTimeout(() => {
                if (document.getElementById('visits-map')) {
                  MapService.initMap('visits-map', this.theme === 'dark');
                  MapService.renderVisitsOnMap(this.filteredVisits);
                }
              }, 80);
            }
          });
        });
      }

      // Auto-save session state when user switches apps (e.g. to WhatsApp)
      window.addEventListener('pagehide', () => this.saveSessionState());
      window.addEventListener('beforeunload', () => this.saveSessionState());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.saveSessionState();
        }
      });

      // Global event delegation for Leaflet interactive popups
      document.addEventListener('click', (e) => {
        const centerBtn = e.target.closest('#btn-assign-center-store');
        if (centerBtn && this.selectedStoreForMap) {
          this.openAssignStoreToMdsModal(this.selectedStoreForMap);
          return;
        }

        const nearBtn = e.target.closest('.btn-assign-nearest-store');
        if (nearBtn) {
          const code = nearBtn.getAttribute('data-store-code');
          if (code) {
            const targetStore = (this.nearest10Stores || []).find(s => s.kodeToko === code) || (this.stores49k || []).find(s => s.kodeToko === code);
            if (targetStore) {
              this.openAssignStoreToMdsModal(targetStore);
            }
          }
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
      } else if (this.activeTab === 'jadwal' && this.isJadwalRouteActive) {
        this.renderJadwalRouteMap();
      } else if (this.activeTab === 'tokonasional' && this.selectedStoreForMap) {
        this.selectStoreForMap(this.selectedStoreForMap);
      } else if (this.activeTab === 'evaluasi') {
        this.refreshSpvCharts();
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

    executeSearch() {
      this.selectedCrew = '';
      this.searchQuery = (this.searchInputText || '').trim();
      this.currentPage = 1;
      this.$nextTick(() => {
        if (window.lucide) lucide.createIcons();
        if (typeof MapService !== 'undefined' && MapService.renderVisitsOnMap) {
          MapService.renderVisitsOnMap(this.filteredVisits, this.searchQuery);
        }
      });
    },

    clearSearch() {
      this.isLoading = true;
      this.loadingMessage = 'Mereset Pencarian & Filter...';
      this.loadingStage = 3;
      this.selectedCrew = '';
      this.searchInputText = '';

      setTimeout(() => {
        this.searchQuery = '';
        this.currentPage = 1;

        requestAnimationFrame(() => {
          if (window.lucide) lucide.createIcons();
          if (typeof MapService !== 'undefined' && MapService.renderVisitsOnMap) {
            MapService.renderVisitsOnMap(this.filteredVisits, '');
          }
          if (this.initCharts) this.initCharts();

          setTimeout(() => {
            this.isLoading = false;
          }, 200);
        });
      }, 30);
    },

    flyToVisit(visit) {
      if (!visit) return;
      const mapCard = document.getElementById('visits-map');
      if (mapCard) {
        mapCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (typeof MapService !== 'undefined' && MapService.flyToVisit) {
        MapService.flyToVisit(visit);
      }
    },

    get matchingCrewSuggestions() {
      if (this.currentUser && this.currentUser.role === 'MDS') {
        const mdsCrew = this.getCurrentMdsCrewName();
        if (mdsCrew) {
          const mdsCrewUpper = mdsCrew.toUpperCase().trim();
          return [{
            namaCrew: mdsCrew,
            kodeCrew: '',
            modul: this.currentUser.modul || '',
            account: '',
            visitCount: (this.visits || []).filter(v => (v.namaCrew || '').toUpperCase().trim() === mdsCrewUpper).length
          }];
        }
      }

      const q = (this.searchInputText || this.searchQuery || '').trim().toUpperCase();
      if (!q || q.length < 2) return [];

      const crewMap = new Map();

      // Helper to generate consistent unique key per crew person
      const getCrewKey = (name, rawModul) => {
        const cleanName = (name || '').trim().toUpperCase();
        const officialMod = (this.getCrewOfficialModul(name, rawModul) || rawModul || '').trim().toUpperCase();
        return `${cleanName}_${officialMod}`;
      };

      // 1. Ambil dari masterUser (seluruh master database crew)
      if (Array.isArray(this.masterUser)) {
        this.masterUser.forEach(u => {
          const name = (u.nama || '').trim();
          const code = (u.id || u.kode || u.kodeCrew || '').trim();
          if (!name) return;

          if (name.toUpperCase().includes(q) || code.toUpperCase().includes(q)) {
            const officialMod = this.getCrewOfficialModul(name, u.modul) || u.modul || '';
            const key = getCrewKey(name, officialMod);
            if (!crewMap.has(key)) {
              crewMap.set(key, {
                namaCrew: name,
                kodeCrew: code,
                modul: officialMod,
                account: u.account || '',
                visitCount: 0
              });
            } else {
              const existing = crewMap.get(key);
              if (!existing.kodeCrew && code) existing.kodeCrew = code;
              if (!existing.modul && officialMod) existing.modul = officialMod;
            }
          }
        });
      }

      // 2. Ambil & hitung visit dari data kunjungan
      const visitData = this.visits || [];
      visitData.forEach(v => {
        const name = (v.namaCrew || '').trim();
        const code = (v.kodeCrew || '').trim();
        if (!name) return;

        if (name.toUpperCase().includes(q) || code.toUpperCase().includes(q)) {
          const officialMod = v._officialModul || this.getCrewOfficialModul(name, v.modul) || v.modul || v.prefix || '';
          const key = getCrewKey(name, officialMod);
          if (!crewMap.has(key)) {
            crewMap.set(key, {
              namaCrew: name,
              kodeCrew: code,
              modul: officialMod,
              account: v.account || '',
              visitCount: 0
            });
          } else {
            const existing = crewMap.get(key);
            if (!existing.kodeCrew && code) existing.kodeCrew = code;
            if (!existing.modul && officialMod) existing.modul = officialMod;
          }
          crewMap.get(key).visitCount++;
        }
      });

      // Filter by selectedModul if active
      let results = Array.from(crewMap.values());
      if (this.selectedModul && this.selectedModul !== 'ALL' && this.selectedModul.toUpperCase() !== 'NASIONAL') {
        const selMod = this.selectedModul.toUpperCase();
        results = results.filter(c => (c.modul || '').toUpperCase().startsWith(selMod));
      }

      // Sort by visit count descending
      results.sort((a, b) => b.visitCount - a.visitCount);

      return results;
    },

    selectCrewSuggestion(crew) {
      if (!crew) return;
      if (this.selectedCrew && this.selectedCrew.toUpperCase() === crew.namaCrew.toUpperCase()) {
        // Toggle unselect
        this.selectedCrew = '';
      } else {
        this.selectedCrew = crew.namaCrew;
      }
      this.currentPage = 1;
      this.$nextTick(() => {
        if (window.lucide) lucide.createIcons();
        if (typeof MapService !== 'undefined' && MapService.renderVisitsOnMap) {
          MapService.renderVisitsOnMap(this.filteredVisits, this.selectedCrew || this.searchQuery);
        }
      });
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
        if (this.selectedPeriod === 'LIVE') {
          if (showLoader) {
            this.loadingStage = 2;
            this.loadingMessage = 'Mengunduh data Kunjungan, Absensi & Master Rute...';
          }

          // Clear in-memory API cache on explicit refresh
          ApiService.memoryCache.clear();

          // Always fetch fresh Master Toko & Master User from live spreadsheets
          const masterTokoPromise = ApiService.getMasterToko({ modul: 'ALL' });
          const masterUserPromise = ApiService.getMasterUser({ modul: 'ALL' });

          // Fetch Live Data in parallel (< 1.5s) across all 15 branch sheets + 3 absensi sheets
          const [visitsData, absensiData, masterTokoData, masterUserData] = await Promise.all([
            ApiService.getVisits({ modul: 'ALL' }),
            ApiService.getAbsensi({ modul: 'ALL' }),
            masterTokoPromise,
            masterUserPromise
          ]);

          this.visits = visitsData || [];
          this.absensi = absensiData || [];
          if (masterTokoData && masterTokoData.length > 0) {
            this.masterToko = masterTokoData;
            if (window.DashboardDB) DashboardDB.set('master_toko', masterTokoData);
          }
          if (masterUserData && masterUserData.length > 0) {
            this.masterUser = masterUserData;
            if (window.DashboardDB) DashboardDB.set('master_user', masterUserData);
          }

          console.log(`%c[Data Sync Selesai]%c Visits: ${this.visits.length} baris | Absensi: ${this.absensi.length} baris | Master Toko: ${this.masterToko.length} toko | Master User: ${this.masterUser.length} personil`, 'background:#4338ca;color:white;padding:3px 8px;border-radius:4px;font-weight:bold;', 'color:#818cf8;');

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
          setTimeout(() => {
            this.isLoading = false;
          }, 300);
        } else {
          this.isLoading = false;
        }
        this.dismissPreloader();
      }
    },

    /**
     * Handle Date Select Dropdown Change (Instant Overlay, Zero Race Condition)
     */
    handleDateSelectChange(event) {
      const val = event.target.value;
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');

      if (val === 'CUSTOM') {
        this.isCustomDateOpen = true;
        this.customStartInput = this.startDate || `${yyyy}-${mm}-${dd}`;
        this.customEndInput = this.endDate || `${yyyy}-${mm}-${dd}`;
        this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
        return;
      }

      this.isCustomDateOpen = false;
      // 1. Render overlay loading immediately to DOM before heavy operations
      this.isLoading = true;
      this.loadingStage = 3;
      const periodNames = {
        'LATEST_DAY': 'Hari Terakhir Aktif',
        'YESTERDAY': 'Kemarin / H-1',
        'TODAY': 'Hari Ini Saja',
        '7_DAYS': '7 Hari Terakhir',
        'THIS_MONTH': 'Bulan Ini'
      };
      this.loadingMessage = `Menyaring Data: ${periodNames[val] || val}...`;

      // 2. Defer computation slightly (40ms) so browser paint cycle renders overlay first
      setTimeout(() => {
        let sDate = '';
        let eDate = '';

        if (val === 'TODAY') {
          sDate = `${yyyy}-${mm}-${dd}`;
          eDate = `${yyyy}-${mm}-${dd}`;
        } else if (val === 'YESTERDAY') {
          const yDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const y_yyyy = yDate.getFullYear();
          const y_mm = String(yDate.getMonth() + 1).padStart(2, '0');
          const y_dd = String(yDate.getDate()).padStart(2, '0');
          sDate = `${y_yyyy}-${y_mm}-${y_dd}`;
          eDate = `${y_yyyy}-${y_mm}-${y_dd}`;
        } else if (val === '7_DAYS') {
          const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          sDate = past7.toISOString().split('T')[0];
          eDate = `${yyyy}-${mm}-${dd}`;
        } else if (val === 'THIS_MONTH') {
          sDate = `${yyyy}-${mm}-01`;
          eDate = `${yyyy}-${mm}-${dd}`;
        }

        // Batch update state in one single reactive tick
        this.startDate = sDate;
        this.endDate = eDate;
        this.dateFilter = val;
        this.currentPage = 1;
        this.updateActiveDateLabel(this.visits);
        this.saveSessionState();

        requestAnimationFrame(() => {
          this.refreshCharts();
          if (window.lucide) lucide.createIcons();
          if (document.getElementById('visits-map') && this.activeTab === 'kunjungan') {
            MapService.renderVisitsOnMap(this.filteredVisits);
          }
          if (this.activeTab === 'evaluasi') {
            this.refreshSpvCharts();
          }

          setTimeout(() => {
            this.isLoading = false;
          }, 200);
        });
      }, 40);
    },

    getDateFilterLabel(val) {
      const map = {
        'LATEST_DAY': '⚡ Hari Terakhir Aktif (Auto)',
        'YESTERDAY': '🕒 Kemarin / H-1 (Evaluasi)',
        'TODAY': '📅 Hari Ini Saja (Real-time)',
        '7_DAYS': '📊 7 Hari Terakhir',
        'THIS_MONTH': '🗓️ Bulan Ini (Semua)',
        'CUSTOM': '📆 Rentang Tanggal Kustom'
      };
      return map[val] || val || 'Pilih Periode';
    },

    selectDateOption(val) {
      this.dateDropdownOpen = false;
      this.handleDateSelectChange({ target: { value: val } });
    },

    /**
     * Handle Account Filter Change (Smooth & Non-Blocking)
     */
    onAccountChange() {
      this.isLoading = true;
      this.loadingMessage = `Memfilter Account: ${this.selectedAccount === 'ALL' ? 'Semua Account' : this.selectedAccount}...`;
      this.loadingStage = 3;

      setTimeout(() => {
        this.currentPage = 1;
        this.saveSessionState();

        requestAnimationFrame(() => {
          if (window.lucide) lucide.createIcons();
          if (document.getElementById('visits-map') && this.activeTab === 'kunjungan') {
            MapService.renderVisitsOnMap(this.filteredVisits);
          }
          if (this.initCharts) this.initCharts();

          setTimeout(() => {
            this.isLoading = false;
          }, 200);
        });
      }, 30);
    },

    /**
     * Apply Custom Date Range with strict validation & professional loading overlay
     */
    applyCustomDates() {
      if (!this.customStartInput || !this.customEndInput) {
        alert('Mohon pilih tanggal awal dan tanggal akhir terlebih dahulu.');
        return;
      }

      // Protection: Start date cannot be after End date
      if (this.customStartInput > this.customEndInput) {
        alert(`⚠️ Tanggal Awal (${this.customStartInput}) tidak boleh melebihi Tanggal Akhir (${this.customEndInput})!\nRentang tanggal disesuaikan secara otomatis.`);
        this.customEndInput = this.customStartInput;
      }

      // Show overlay loading immediately to prevent user clicking around during processing
      this.isLoading = true;
      this.loadingStage = 3;
      this.loadingMessage = `Menyaring & mengolah data rentang ${this.customStartInput} s/d ${this.customEndInput}...`;

      setTimeout(() => {
        this.dateFilter = 'CUSTOM';
        this.isCustomDateOpen = true;
        this.startDate = this.customStartInput;
        this.endDate = this.customEndInput;
        this.currentPage = 1;
        this.updateActiveDateLabel(this.visits);
        this.saveSessionState();

        this.$nextTick(() => {
          this.refreshCharts();
          if (window.lucide) lucide.createIcons();
          if (document.getElementById('visits-map') && this.activeTab === 'kunjungan') {
            MapService.renderVisitsOnMap(this.filteredVisits);
          }
          if (this.activeTab === 'evaluasi') {
            this.refreshSpvCharts();
          }
          setTimeout(() => {
            this.isLoading = false;
          }, 200);
        });
      }, 30);
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
     * Helper: Get Today's Date in Local Client Timezone (ISO YYYY-MM-DD)
     */
    getTodayIso() {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    /**
     * Helper: Get Yesterday's Date in Local Client Timezone (ISO YYYY-MM-DD)
     */
    getYesterdayIso() {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    /**
     * Helper: Normalize Any Date String / Timestamp to ISO YYYY-MM-DD
     */
    normalizeIsoDate(val) {
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
     * Helper: Format ISO YYYY-MM-DD to Indonesian Date String (e.g. "8 Sep 2026")
     */
    formatIndoDate(isoStr) {
      if (!isoStr) return '';
      const iso = this.normalizeIsoDate(isoStr);
      if (!iso || !iso.includes('-')) return isoStr;
      const parts = iso.split('-');
      if (parts.length !== 3) return isoStr;
      const y = parts[0];
      const mIdx = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const monthName = months[mIdx] || parts[1];
      return `${d} ${monthName} ${y}`;
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
      this.crewDayVisitsMap = new Map();

      if (this.visits && this.visits.length > 0) {
        this.visits = this.visits.filter(v => v && typeof v === 'object');
        this.visits.forEach(v => {
          if (!v) return;
          const iso = this.normalizeIsoDate(v.dateIso || v.date || v.tanggal);
          v._iso = iso;
          v._officialModul = this.getCrewOfficialModul(v.namaCrew || v.kodeCrew, v.modul || v.prefix);
          v._accUpper = (v.account || '').toUpperCase();
          v._searchStr = `${v.namaToko || ''} ${v.kodeToko || ''} ${v.namaCrew || ''} ${v.kodeCrew || ''} ${v.account || ''}`.toUpperCase();

          const cName = (v.namaCrew || '').trim().toUpperCase();
          if (iso && cName) {
            const key = `${iso}_${cName}`;
            if (!this.crewDayVisitsMap.has(key)) {
              this.crewDayVisitsMap.set(key, []);
            }
            this.crewDayVisitsMap.get(key).push(v);
          }
        });

        // Sort each crew's day visits chronologically (earliest to latest in morning/afternoon) once
        for (const list of this.crewDayVisitsMap.values()) {
          list.sort((a, b) => String((a && (a.time || a.waktu)) || '00:00').localeCompare(String((b && (b.time || b.waktu)) || '00:00')));
        }

        // Sort visits newest first (Date descending, Time descending)
        this.visits.sort((a, b) => {
          const isoA = (a && a._iso) || '';
          const isoB = (b && b._iso) || '';
          if (isoA !== isoB) return isoB.localeCompare(isoA);
          const timeA = (a && (a.time || a.waktu)) || '';
          const timeB = (b && (b.time || b.waktu)) || '';
          return timeB.localeCompare(timeA);
        });
      }

      if (this.absensi && this.absensi.length > 0) {
        this.absensi = this.absensi.filter(a => a && typeof a === 'object');
        this.absensi.forEach(a => {
          if (!a) return;
          a._iso = this.normalizeIsoDate(a.dateIso || a.date || a.tanggal);
          a._officialModul = this.getCrewOfficialModul(a.namaCrew || a.kodeCrew, a.modul);
        });

        this.absensi.sort((a, b) => {
          const isoA = (a && a._iso) || '';
          const isoB = (b && b._iso) || '';
          if (isoA !== isoB) return isoB.localeCompare(isoA);
          const timeA = (a && (a.waktu || a.time)) || '';
          const timeB = (b && (b.waktu || b.time)) || '';
          return timeB.localeCompare(timeA);
        });
      }

      // Log summary date distribution for quick developer console verification
      const vDates = {};
      (this.visits || []).forEach(v => { if (v && v._iso) vDates[v._iso] = (vDates[v._iso] || 0) + 1; });
      const aDates = {};
      (this.absensi || []).forEach(a => { if (a && a._iso) aDates[a._iso] = (aDates[a._iso] || 0) + 1; });
      console.log(`%c[Data Kunjungan Ready]%c Total: ${(this.visits || []).length} baris | Distribusi Tanggal:`, 'background:#6366f1;color:white;padding:2px 6px;border-radius:4px;font-weight:bold;', 'color:#a5b4fc;', vDates);
      console.log(`%c[Data Absensi Ready]%c Total: ${(this.absensi || []).length} baris | Distribusi Tanggal:`, 'background:#10b981;color:white;padding:2px 6px;border-radius:4px;font-weight:bold;', 'color:#6ee7b7;', aDates);

      this.crewMasterStoresMap = new Map();
      this.crewMasterRoutesMap = new Map();

      const normKey = (str) => {
        if (!str) return '';
        return String(str).toUpperCase()
          .replace(/[\.\,\-\_\(\)\/]/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/SULISTIYO/g, 'SULISTIO')
          .trim();
      };

      const cleanCrewToken = (str) => {
        if (!str) return '';
        return normKey(str)
          .replace(/\s*[\(\[\-]?\s*(DK|LK|LP)[0-9]?\s*[\)\]]?\s*$/i, '')
          .replace(/\s+/g, ' ')
          .trim();
      };

      if (this.masterToko && this.masterToko.length > 0) {
        this.masterToko.forEach(m => {
          m._officialModul = this.getCrewOfficialModul(m.namaCrew || m.kodeCrew, m.modul);
          m._accUpper = (m.account || '').toUpperCase();
          m._searchStr = `${m.namaToko || ''} ${m.kodeToko || ''} ${m.namaCrew || ''} ${m.kodeCrew || ''} ${m.account || ''}`.toUpperCase();

          const kName = normKey(m.namaCrew);
          const kCode = normKey(m.kodeCrew);
          const baseName = cleanCrewToken(m.namaCrew);
          const ruteStr = m.rute ? String(m.rute).trim().toUpperCase() : '';

          const registerToCrew = (key) => {
            if (!key) return;
            if (!this.crewMasterStoresMap.has(key)) {
              this.crewMasterStoresMap.set(key, []);
              this.crewMasterRoutesMap.set(key, new Set());
            }
            this.crewMasterStoresMap.get(key).push(m);
            if (ruteStr) this.crewMasterRoutesMap.get(key).add(ruteStr);
          };

          if (kName) registerToCrew(kName);
          if (kCode && kCode !== kName) registerToCrew(kCode);
          if (baseName && baseName !== kName) registerToCrew(baseName);
        });
      }
    },

    /**
     * Computed / Filtered Visits (Pure, Zero Mutation, High Speed)
     */
    get filteredVisits() {
      let data = (this.visits || []).filter(v => v && typeof v === 'object');
      if (data.length === 0) return [];

      // 0. Row-Level Security / Role-Based Scoping
      if (this.currentUser) {
        if (this.currentUser.role === 'MDS') {
          const mdsCrew = this.getCurrentMdsCrewName();
          if (mdsCrew) {
            const mdsCrewUpper = mdsCrew.toUpperCase().trim();
            data = data.filter(v => {
              const cName = (v.namaCrew || '').toUpperCase().trim();
              const cCode = (v.kodeCrew || '').toUpperCase().trim();
              return cName === mdsCrewUpper || cCode === mdsCrewUpper;
            });
          }
        } else if (this.currentUser.role === 'SPV') {
          const crews = this.getSpvManagedCrews();
          const spvMod = this.getSpvModul();
          if (crews.length > 0) {
            const crewsUpper = crews.map(c => (c || '').toUpperCase().trim()).filter(Boolean);
            data = data.filter(v => {
              const cName = (v.namaCrew || '').toUpperCase().trim();
              const cCode = (v.kodeCrew || '').toUpperCase().trim();
              return crewsUpper.some(c => c === cName || c === cCode || (c && cName && (cName.includes(c) || c.includes(cName))));
            });
          } else if (spvMod && spvMod !== 'ALL' && spvMod !== 'NASIONAL') {
            data = data.filter(v => {
              const vMod = (v._officialModul || (this.getCrewOfficialModul ? this.getCrewOfficialModul(v.namaCrew || v.kodeCrew, v.modul) : v.modul) || '').toUpperCase().trim();
              return vMod && (vMod.startsWith(spvMod) || spvMod.startsWith(vMod));
            });
          }
        }
      }

      if (!data || data.length === 0) return [];

      // 1. Smart Date Filtering
      if (this.dateFilter === 'LATEST_DAY') {
        const first = data[0];
        const latestIso = first ? (first._iso || this.normalizeIsoDate(first.dateIso || first.date || first.tanggal)) : null;
        if (latestIso) {
          data = data.filter(v => v && (v._iso || this.normalizeIsoDate(v.dateIso || v.date || v.tanggal)) === latestIso);
        }
      } else if (this.dateFilter === 'TODAY') {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayIso = `${y}-${m}-${d}`;
        data = data.filter(v => v && (v._iso || this.normalizeIsoDate(v.dateIso || v.date || v.tanggal)) === todayIso);
      } else if (this.dateFilter === 'YESTERDAY') {
        const yDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const y_y = yDate.getFullYear();
        const y_m = String(yDate.getMonth() + 1).padStart(2, '0');
        const y_d = String(yDate.getDate()).padStart(2, '0');
        const yIso = `${y_y}-${y_m}-${y_d}`;
        data = data.filter(v => v && (v._iso || this.normalizeIsoDate(v.dateIso || v.date || v.tanggal)) === yIso);
      } else if (this.dateFilter === 'CUSTOM') {
        if (this.startDate && this.endDate) {
          const start = this.startDate;
          const end = this.endDate;
          data = data.filter(v => {
            if (!v) return false;
            const vIso = v._iso || this.normalizeIsoDate(v.dateIso || v.date || v.tanggal);
            return vIso && vIso >= start && vIso <= end;
          });
        } else {
          // Safe Fallback before "Terapkan Rentang" is clicked: keep latest active day instead of dumping 50k rows
          const first = data[0];
          const latestIso = first ? (first._iso || this.normalizeIsoDate(first.dateIso || first.date || first.tanggal)) : null;
          if (latestIso) {
            data = data.filter(v => v && (v._iso || this.normalizeIsoDate(v.dateIso || v.date || v.tanggal)) === latestIso);
          }
        }
      } else if (this.dateFilter === '7_DAYS' && this.startDate && this.endDate) {
        const start = this.startDate;
        const end = this.endDate;
        data = data.filter(v => {
          if (!v) return false;
          const vIso = v._iso || this.normalizeIsoDate(v.dateIso || v.date || v.tanggal);
          return vIso && vIso >= start && vIso <= end;
        });
      } else if (this.dateFilter === 'THIS_MONTH' && this.startDate && this.endDate) {
        const start = this.startDate;
        const end = this.endDate;
        data = data.filter(v => {
          if (!v) return false;
          const vIso = v._iso || this.normalizeIsoDate(v.dateIso || v.date || v.tanggal);
          return vIso && vIso >= start && vIso <= end;
        });
      }

      // 2. Filter by Modul (Using Official Module Mapping)
      if (this.selectedModul && this.selectedModul !== 'ALL' && this.selectedModul.toUpperCase() !== 'NASIONAL') {
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

      // 4. Filter by Selected Crew / Multi-Selected Crews / Search Query
      if (this.selectedCrews && this.selectedCrews.length > 0) {
        const selCrewsUpper = new Set(this.selectedCrews.map(c => String(c).toUpperCase().trim()));
        data = data.filter(v => {
          const cName = (v.namaCrew || '').toUpperCase().trim();
          const cCode = (v.kodeCrew || '').toUpperCase().trim();
          return selCrewsUpper.has(cName) || selCrewsUpper.has(cCode);
        });
      } else if (this.selectedCrew) {
        const selCrew = this.selectedCrew.toUpperCase().trim();
        data = data.filter(v => {
          const cName = (v.namaCrew || '').toUpperCase().trim();
          const cCode = (v.kodeCrew || '').toUpperCase().trim();
          return cName === selCrew || cCode === selCrew;
        });
      } else if (this.searchQuery && this.searchQuery.trim()) {
        const q = this.searchQuery.toUpperCase().trim();
        data = data.filter(v => (v._searchStr || `${v.namaToko || ''} ${v.kodeToko || ''} ${v.namaCrew || ''} ${v.kodeCrew || ''} ${v.account || ''}`).toUpperCase().includes(q));
      }

      return data;
    },

    /**
     * Computed Filtered Absensi (Smart Date, Modul & Search Filtering - Tab Absensi Scoped)
     */
    get filteredAbsensi() {
      let data = (this.absensi || []).filter(a => a && typeof a === 'object');
      if (data.length === 0) return [];

      // 0. Row-Level Security / Role-Based Scoping
      if (this.currentUser) {
        if (this.currentUser.role === 'MDS') {
          const mdsCrew = this.getCurrentMdsCrewName();
          if (mdsCrew) {
            const mdsCrewUpper = mdsCrew.toUpperCase().trim();
            data = data.filter(a => {
              const cName = (a.namaCrew || '').toUpperCase().trim();
              const cCode = (a.kodeCrew || '').toUpperCase().trim();
              return cName === mdsCrewUpper || cCode === mdsCrewUpper;
            });
          }
        } else if (this.currentUser.role === 'SPV') {
          const crews = this.getSpvManagedCrews();
          const spvMod = this.getSpvModul();
          if (crews.length > 0) {
            const crewsUpper = crews.map(c => (c || '').toUpperCase().trim()).filter(Boolean);
            data = data.filter(a => {
              const cName = (a.namaCrew || '').toUpperCase().trim();
              const cCode = (a.kodeCrew || '').toUpperCase().trim();
              return crewsUpper.some(c => c === cName || c === cCode || (c && cName && (cName.includes(c) || c.includes(cName))));
            });
          } else if (spvMod && spvMod !== 'ALL' && spvMod !== 'NASIONAL') {
            data = data.filter(a => {
              const aMod = (a._officialModul || (this.getCrewOfficialModul ? this.getCrewOfficialModul(a.namaCrew || a.kodeCrew, a.modul) : a.modul) || '').toUpperCase().trim();
              return aMod && (aMod.startsWith(spvMod) || spvMod.startsWith(aMod));
            });
          }
        }
      }

      if (!data || data.length === 0) return [];

      const f = this.filterAbsensi || {};
      const dFilter = f.dateFilter || 'LATEST_DAY';

      // 1. Smart Date Filtering
      if (dFilter === 'LATEST_DAY') {
        const firstVisit = (this.visits && this.visits.length > 0) ? this.visits[0] : null;
        const firstData = (data && data.length > 0) ? data[0] : null;
        const latestIso = (firstVisit && firstVisit._iso)
          ? firstVisit._iso
          : (firstData ? (firstData._iso || this.normalizeIsoDate(firstData.tanggal || firstData.dateIso || firstData.date)) : null);
        if (latestIso) {
          data = data.filter(a => a && (a._iso || this.normalizeIsoDate(a.tanggal || a.dateIso || a.date)) === latestIso);
        }
      } else if (dFilter === 'TODAY') {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayIso = `${y}-${m}-${d}`;
        data = data.filter(a => a && (a._iso || this.normalizeIsoDate(a.tanggal || a.dateIso || a.date)) === todayIso);
      } else if (dFilter === 'YESTERDAY') {
        const yDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const y_y = yDate.getFullYear();
        const y_m = String(yDate.getMonth() + 1).padStart(2, '0');
        const y_d = String(yDate.getDate()).padStart(2, '0');
        const yIso = `${y_y}-${y_m}-${y_d}`;
        data = data.filter(a => a && (a._iso || this.normalizeIsoDate(a.tanggal || a.dateIso || a.date)) === yIso);
      } else if (dFilter === 'CUSTOM') {
        if (f.startDate && f.endDate) {
          const start = f.startDate;
          const end = f.endDate;
          data = data.filter(a => {
            if (!a) return false;
            const aIso = a._iso || this.normalizeIsoDate(a.tanggal || a.dateIso || a.date);
            return aIso && aIso >= start && aIso <= end;
          });
        } else {
          // Safe Fallback before custom dates are applied
          const firstVisit = (this.visits && this.visits.length > 0) ? this.visits[0] : null;
          const firstData = (data && data.length > 0) ? data[0] : null;
          const latestIso = (firstVisit && firstVisit._iso)
            ? firstVisit._iso
            : (firstData ? (firstData._iso || this.normalizeIsoDate(firstData.tanggal || firstData.dateIso || firstData.date)) : null);
          if (latestIso) {
            data = data.filter(a => a && (a._iso || this.normalizeIsoDate(a.tanggal || a.dateIso || a.date)) === latestIso);
          }
        }
      } else if (dFilter === '7_DAYS' && f.startDate && f.endDate) {
        const start = f.startDate;
        const end = f.endDate;
        data = data.filter(a => {
          if (!a) return false;
          const aIso = a._iso || this.normalizeIsoDate(a.tanggal || a.dateIso || a.date);
          return aIso && aIso >= start && aIso <= end;
        });
      } else if (dFilter === 'THIS_MONTH' && f.startDate && f.endDate) {
        const start = f.startDate;
        const end = f.endDate;
        data = data.filter(a => {
          if (!a) return false;
          const aIso = a._iso || this.normalizeIsoDate(a.tanggal || a.dateIso || a.date);
          return aIso && aIso >= start && aIso <= end;
        });
      }

      // 2. Filter by Modul
      const selMod = f.modul || 'ALL';
      if (selMod && selMod !== 'ALL' && selMod.toUpperCase() !== 'NASIONAL') {
        if (selMod.length === 2) {
          data = data.filter(a => (a._officialModul || this.getCrewOfficialModul(a.namaCrew || a.kodeCrew, a.modul)).startsWith(selMod));
        } else {
          data = data.filter(a => (a._officialModul || this.getCrewOfficialModul(a.namaCrew || a.kodeCrew, a.modul)) === selMod);
        }
      }

      // 3. Filter by Selected Crew / Multi-Selected Crews / Search Query
      const q = (f.searchQuery || '').toUpperCase().trim();
      if (this.selectedCrews && this.selectedCrews.length > 0) {
        const selCrewsUpper = new Set(this.selectedCrews.map(c => String(c).toUpperCase().trim()));
        data = data.filter(a => {
          const cName = (a.namaCrew || '').toUpperCase().trim();
          const cCode = (a.kodeCrew || '').toUpperCase().trim();
          return selCrewsUpper.has(cName) || selCrewsUpper.has(cCode);
        });
      } else if (this.selectedCrew) {
        const selCrew = this.selectedCrew.toUpperCase().trim();
        data = data.filter(a => {
          const cName = (a.namaCrew || '').toUpperCase().trim();
          const cCode = (a.kodeCrew || '').toUpperCase().trim();
          return cName === selCrew || cCode === selCrew;
        });
      } else if (q) {
        data = data.filter(a =>
          (a.namaCrew || '').toUpperCase().includes(q) ||
          (a.kodeCrew || '').toUpperCase().includes(q) ||
          (a.namaToko || '').toUpperCase().includes(q)
        );
      }

      return data;
    },

    /**
     * Computed Daily Consolidated Absensi (1 Row per Crew per Day: Masuk + Pulang)
     */
    get groupedAbsensi() {
      const raw = this.filteredAbsensi || [];
      if (raw.length === 0) return [];

      const map = new Map();

      raw.forEach(a => {
        const iso = a._iso || this.normalizeIsoDate(a.tanggal || a.dateIso || a.date);
        const crewName = (a.namaCrew || '').trim();
        const crewCode = (a.kodeCrew || '').trim();
        if (!iso || !crewName) return;

        const key = `${iso}_${crewName.toUpperCase()}`;

        if (!map.has(key)) {
          map.set(key, {
            key: key,
            tanggal: a.tanggal || iso,
            iso: iso,
            modul: a._officialModul || this.getCrewOfficialModul(crewName, a.modul) || a.modul || '',
            namaCrew: crewName,
            kodeCrew: crewCode,
            namaToko: a.namaToko || '',
            masuk: null, // { waktu, status, koordinat, foto, catatan }
            pulang: null, // { waktu, status, koordinat, foto, catatan }
            otherLogs: [],
            durasiKerja: '-'
          });
        }

        const entry = map.get(key);
        const statusUpper = (a.status || '').toUpperCase().trim();

        if (statusUpper.includes('MASUK') || statusUpper.includes('HADIR') || statusUpper.includes('IN')) {
          if (!entry.masuk || (a.waktu && a.waktu < entry.masuk.waktu)) {
            entry.masuk = a;
          }
        } else if (statusUpper.includes('PULANG') || statusUpper.includes('OUT')) {
          if (!entry.pulang || (a.waktu && a.waktu > entry.pulang.waktu)) {
            entry.pulang = a;
          }
        } else {
          entry.otherLogs.push(a);
        }
      });

      // Calculate work duration & overall status for each grouped entry
      const now = new Date();
      const y_today = now.getFullYear();
      const m_today = String(now.getMonth() + 1).padStart(2, '0');
      const d_today = String(now.getDate()).padStart(2, '0');
      const todayIso = `${y_today}-${m_today}-${d_today}`;

      const result = Array.from(map.values()).map(entry => {
        const isToday = entry.iso === todayIso;
        let durasiStr = '-';
        if (entry.masuk && entry.pulang && entry.masuk.waktu && entry.pulang.waktu) {
          const tMasuk = String(entry.masuk.waktu).split(':');
          const tPulang = String(entry.pulang.waktu).split(':');
          if (tMasuk.length >= 2 && tPulang.length >= 2) {
            const minMasuk = parseInt(tMasuk[0], 10) * 60 + parseInt(tMasuk[1], 10);
            const minPulang = parseInt(tPulang[0], 10) * 60 + parseInt(tPulang[1], 10);
            const diffMin = minPulang - minMasuk;
            if (diffMin > 0) {
              const h = Math.floor(diffMin / 60);
              const m = diffMin % 60;
              durasiStr = `${h}j ${m > 0 ? m + 'm' : ''}`.trim();
            }
          }
        } else if (entry.masuk && !entry.pulang) {
          durasiStr = isToday ? 'Sedang Bertugas' : 'Tidak Pulang';
        }

        // Find visits for this crew on this specific date (O(1) instant lookup from pre-indexed map)
        const visitKey = `${entry.iso}_${entry.namaCrew.toUpperCase()}`;
        const crewVisits = (this.crewDayVisitsMap && this.crewDayVisitsMap.get(visitKey)) || [];

        let firstStore = null;
        let lastStore = null;
        let masukDist = null;
        let masukDistText = null;
        let pulangDist = null;
        let pulangDistText = null;

        if (crewVisits.length > 0) {
          firstStore = crewVisits[0];
          lastStore = crewVisits[crewVisits.length - 1];

          // Calculate distance for Masuk (vs Toko Pertama #1)
          if (entry.masuk && entry.masuk.koordinat && firstStore.koordinat) {
            if (!this.isGpsAnomaly(entry.masuk.koordinat) && !this.isGpsAnomaly(firstStore.koordinat)) {
              masukDist = this.calculateDistanceMeters(entry.masuk.koordinat, firstStore.koordinat);
              masukDistText = this.formatDistance(masukDist);
            }
          }

          // Calculate distance for Pulang (vs Toko Terakhir #N)
          if (entry.pulang && entry.pulang.koordinat && lastStore.koordinat) {
            if (!this.isGpsAnomaly(entry.pulang.koordinat) && !this.isGpsAnomaly(lastStore.koordinat)) {
              pulangDist = this.calculateDistanceMeters(entry.pulang.koordinat, lastStore.koordinat);
              pulangDistText = this.formatDistance(pulangDist);
            }
          }
        }

        // Overall status
        let overallStatus = 'LENGKAP';
        let statusBadgeClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
        
        if (entry.masuk && entry.pulang) {
          overallStatus = 'Lengkap (In & Out)';
          statusBadgeClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
        } else if (entry.masuk && !entry.pulang) {
          if (isToday) {
            overallStatus = 'Masuk (Sedang Bertugas)';
            statusBadgeClass = 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30';
          } else {
            overallStatus = '⚠️ Lupa Absen Pulang';
            statusBadgeClass = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40 font-bold';
          }
        } else if (!entry.masuk && entry.pulang) {
          overallStatus = 'Hanya Pulang';
          statusBadgeClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30';
        } else if (entry.otherLogs.length > 0) {
          overallStatus = entry.otherLogs[0].status || 'LAINNYA';
          statusBadgeClass = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30';
        }

        return {
          ...entry,
          firstStore: firstStore,
          lastStore: lastStore,
          masukDist: masukDist,
          masukDistText: masukDistText,
          pulangDist: pulangDist,
          pulangDistText: pulangDistText,
          totalVisitsToday: crewVisits.length,
          durasiKerja: durasiStr,
          overallStatus: overallStatus,
          statusBadgeClass: statusBadgeClass
        };
      });

      // Sort by date descending (newest first), then by crew name
      result.sort((a, b) => {
        if (b.iso !== a.iso) return b.iso.localeCompare(a.iso);
        return a.namaCrew.localeCompare(b.namaCrew);
      });

      return result;
    },

    /**
     * Computed Filtered Master Toko (Tab Target Jadwal Rute Scoped - Triggered on "Terapkan Filter")
     */
    get filteredMasterToko() {
      let data = this.masterToko;
      if (!data || data.length === 0) return [];

      // 0. Row-Level Security / Role-Based Scoping
      if (this.currentUser && this.currentUser.role === 'MDS') {
        const mdsCrew = this.getCurrentMdsCrewName();
        if (mdsCrew) {
          const mdsCrewUpper = mdsCrew.toUpperCase().trim();
          data = data.filter(m => {
            const cName = (m.namaCrew || '').toUpperCase().trim();
            const cCode = (m.kodeCrew || '').toUpperCase().trim();
            return cName === mdsCrewUpper || cCode === mdsCrewUpper || (cName && (cName.includes(mdsCrewUpper) || mdsCrewUpper.includes(cName)));
          });
        }
      } else if (this.currentUser && this.currentUser.role === 'SPV') {
        const crews = this.getSpvManagedCrews();
        const spvMod = this.getSpvModul();
        if (crews.length > 0) {
          const crewsUpper = crews.map(c => (c || '').toUpperCase().trim()).filter(Boolean);
          data = data.filter(m => {
            const cName = (m.namaCrew || '').toUpperCase().trim();
            const cCode = (m.kodeCrew || '').toUpperCase().trim();
            return crewsUpper.some(c => c === cName || c === cCode || (c && cName && (cName.includes(c) || c.includes(cName))));
          });
        } else if (spvMod && spvMod !== 'ALL' && spvMod !== 'NASIONAL') {
          data = data.filter(m => {
            const mMod = (m._officialModul || (this.getCrewOfficialModul ? this.getCrewOfficialModul(m.namaCrew || m.kodeCrew, m.modul) : m.modul) || '').toUpperCase().trim();
            return mMod && (mMod.startsWith(spvMod) || spvMod.startsWith(mMod));
          });
        }
      }

      const f = this.filterJadwal || {};

      // 1. Filter MDS / Personil Crew (PRIORITAS: Jika memilih MDS spesifik, cari langsung nama MDS tersebut)
      const selCrew = (f.appliedSelectedCrew || 'ALL').toUpperCase().trim();
      if (selCrew !== 'ALL') {
        data = data.filter(m => {
          const cName = (m.namaCrew || '').toUpperCase().trim();
          const cCode = (m.kodeCrew || '').toUpperCase().trim();
          return cName === selCrew || cCode === selCrew || (cName && (cName.includes(selCrew) || selCrew.includes(cName)));
        });
      } else {
        // Hanya filter modul wilayah jika sedang memilih "Semua MDS"
        const selMod = f.appliedModul || 'ALL';
        if (selMod && selMod !== 'ALL' && selMod.toUpperCase() !== 'NASIONAL') {
          if (selMod.length === 2) {
            data = data.filter(m => (m._officialModul || this.getCrewOfficialModul(m.namaCrew || m.kodeCrew, m.modul)).startsWith(selMod));
          } else {
            data = data.filter(m => (m._officialModul || this.getCrewOfficialModul(m.namaCrew || m.kodeCrew, m.modul)) === selMod);
          }
        }
      }

      // 2. Filter Nomor Rute (1 - 31 atau ALL)
      const selRute = String(f.appliedRute || 'ALL').trim();
      if (selRute !== 'ALL') {
        const numSel = parseInt(selRute, 10);
        data = data.filter(m => {
          const rawRute = String(m.rute || '').trim();
          const numRaw = parseInt(rawRute.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(numSel) && !isNaN(numRaw)) {
            return numSel === numRaw;
          }
          return rawRute.toUpperCase() === selRute.toUpperCase() || rawRute.toUpperCase() === ('RUTE ' + selRute).toUpperCase();
        });
      }

      // 3. Filter Account
      const selAcc = f.appliedAccount || 'ALL';
      if (selAcc !== 'ALL') {
        data = data.filter(m => (m._accUpper || (m.account || '').toUpperCase()).includes(selAcc));
      }

      // 4. Search Query (Kode Toko / Nama Toko / MDS)
      const q = (f.appliedSearchQuery || '').toUpperCase().trim();
      if (q) {
        data = data.filter(m => (m._searchStr || `${m.namaToko || ''} ${m.kodeToko || ''} ${m.namaCrew || ''} ${m.kodeCrew || ''} ${m.account || ''}`).toUpperCase().includes(q));
      }

      return data;
    },

    /**
     * Check if user changed filter inputs but hasn't clicked "Terapkan Filter" yet
     */
    get hasPendingJadwalFilter() {
      const f = this.filterJadwal || {};
      const curMod = f.modul || 'ALL';
      const appMod = f.appliedModul || 'ALL';
      const curCrew = f.selectedCrew || 'ALL';
      const appCrew = f.appliedSelectedCrew || 'ALL';
      const curRute = String(f.rute || 'ALL');
      const appRute = String(f.appliedRute || 'ALL');
      const curAcc = f.account || 'ALL';
      const appAcc = f.appliedAccount || 'ALL';
      const curText = (f.searchInputText || '').trim();
      const appText = (f.appliedSearchQuery || '').trim();

      return curMod !== appMod || curCrew !== appCrew || curRute !== appRute || curAcc !== appAcc || curText !== appText;
    },

    _cachedCrewListByModul: new Map(),

    /**
     * Unique MDS list available in the selected module of Tab Jadwal (Cached for 0ms response)
     */
    get jadwalCrewList() {
      if (!this.masterToko || this.masterToko.length === 0) return [];
      const selMod = (this.filterJadwal && this.filterJadwal.modul) || 'ALL';
      
      if (!this._cachedCrewListByModul) this._cachedCrewListByModul = new Map();
      if (this._cachedCrewListByModul.has(selMod)) {
        return this._cachedCrewListByModul.get(selMod);
      }

      let dataset = this.masterToko;
      if (selMod && selMod !== 'ALL' && selMod.toUpperCase() !== 'NASIONAL') {
        if (selMod.length === 2) {
          dataset = dataset.filter(m => (m._officialModul || this.getCrewOfficialModul(m.namaCrew || m.kodeCrew, m.modul)).startsWith(selMod));
        } else {
          dataset = dataset.filter(m => (m._officialModul || this.getCrewOfficialModul(m.namaCrew || m.kodeCrew, m.modul)) === selMod);
        }
      }
      
      const nonMdsKeywords = ['VACANT', 'OPEN', 'SPV', 'RESIGN', 'ADMIN', 'EMPTY', 'LEADER', 'CIMORY', 'TEST', '-'];
      const crewSet = new Map();

      dataset.forEach(m => {
        const rawName = (m.namaCrew || '').trim();
        if (!rawName) return;
        const upper = rawName.toUpperCase();
        if (nonMdsKeywords.some(kw => upper.includes(kw))) return;

        if (!crewSet.has(upper)) {
          crewSet.set(upper, {
            name: rawName,
            upper: upper,
            modul: m._officialModul || m.modul || ''
          });
        }
      });

      const list = Array.from(crewSet.values()).sort((a, b) => a.name.localeCompare(b.name));
      if (this.currentUser && this.currentUser.role === 'MDS') {
        const mdsCrew = this.getCurrentMdsCrewName();
        if (mdsCrew) {
          const mdsCrewUpper = mdsCrew.toUpperCase().trim();
          const single = list.filter(c => c.upper === mdsCrewUpper || c.upper.includes(mdsCrewUpper) || mdsCrewUpper.includes(c.upper));
          return single.length > 0 ? single : [{ name: mdsCrew, upper: mdsCrewUpper, modul: this.currentUser.modul || '' }];
        }
      } else if (this.currentUser && this.currentUser.role === 'SPV') {
        const managed = this.getSpvManagedCrews();
        if (managed.length > 0) {
          const managedUpper = managed.map(c => (c || '').toUpperCase().trim()).filter(Boolean);
          const filtered = list.filter(c => managedUpper.some(m => m === c.upper || c.upper.includes(m) || m.includes(c.upper)));
          return filtered.length > 0 ? filtered : list;
        }
      }
      this._cachedCrewListByModul.set(selMod, list);
      return list;
    },

    /**
     * Computed KPI statistics for Tab Target Jadwal Rute (Clean & Accurate)
     */
    get jadwalStats() {
      const data = this.filteredMasterToko;
      const totalToko = data.length;
      
      const nonMdsKeywords = ['VACANT', 'OPEN', 'SPV', 'RESIGN', 'ADMIN', 'EMPTY', 'LEADER', 'CIMORY', 'TEST', '-'];
      const mdsNames = data
        .map(m => (m.namaCrew || '').trim())
        .filter(n => n && !nonMdsKeywords.some(kw => n.toUpperCase().includes(kw)));
      
      const uniqueMdsSet = new Set(mdsNames.map(n => n.toUpperCase()));
      const uniqueMds = uniqueMdsSet.size;
      const uniqueRute = new Set(data.map(m => String(m.rute || '').replace(/[^0-9]/g, '')).filter(Boolean)).size;
      const avgTokoPerMds = uniqueMds > 0 ? Math.round(totalToko / uniqueMds) : 0;
      const avgTokoPerRute = uniqueRute > 0 ? (totalToko / uniqueRute).toFixed(1) : 0;
      
      return {
        totalToko,
        uniqueMds,
        uniqueRute,
        avgTokoPerMds,
        avgTokoPerRute
      };
    },

    /**
     * Initialize Master Database 49k Cache from IndexedDB (< 15ms)
     */
    async initStores49k() {
      try {
        if (window.DashboardDB) {
          const cached = await DashboardDB.get('stores_49k', true);
          const lastSync = await DashboardDB.get('stores_49k_synced_at', true);
          if (cached && Array.isArray(cached) && cached.length > 0) {
            this.stores49k = Object.freeze(cached);
            this.stores49kLastSynced = lastSync;
            return;
          }
        }
        // If not in DB yet, trigger initial load
        this.syncStores49k(false);
      } catch (e) {
        console.warn('initStores49k Error:', e);
      }
    },

    /**
     * Sync Master Database 49k from Google Sheet
     */
    async syncStores49k(force = true) {
      if (this.isStores49kLoading) return;
      this.isStores49kLoading = true;
      try {
        const data = await ApiService.syncMasterStores49kFromSheet((msg) => {
          console.log('[Sync 49k]:', msg);
        });
        if (data && data.length > 0) {
          this.stores49k = Object.freeze(data);
          this.stores49kLastSynced = Date.now();
        }
      } catch (err) {
        console.warn('Sync Master Toko 49k Error:', err);
      } finally {
        this.isStores49kLoading = false;
        this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
      }
    },

    /**
     * Filtered Master 49k Store Collection (Instant In-Memory Search < 15ms)
     */
    get filteredTokoNasionalAll() {
      let list = this.stores49k || [];
      const f = this.filterTokoNasional;

      if (f.account && f.account !== 'ALL') {
        list = list.filter(s => (s.account || '').toUpperCase() === f.account);
      }

      if (f.searchQuery) {
        const q = f.searchQuery.toLowerCase().trim();
        list = list.filter(s =>
          (s.kodeToko && s.kodeToko.toLowerCase().includes(q)) ||
          (s.namaToko && s.namaToko.toLowerCase().includes(q)) ||
          (s.branchName && s.branchName.toLowerCase().includes(q)) ||
          (s.branchCode && s.branchCode.toLowerCase().includes(q)) ||
          (s.kabKota && s.kabKota.toLowerCase().includes(q)) ||
          (s.kecamatan && s.kecamatan.toLowerCase().includes(q))
        );
      }

      return list;
    },

    get totalTokoNasionalCount() {
      return this.filteredTokoNasionalAll.length;
    },

    get totalTokoNasionalPages() {
      const total = this.totalTokoNasionalCount;
      const size = this.filterTokoNasional.pageSize || 50;
      return Math.max(1, Math.ceil(total / size));
    },

    get filteredTokoNasional() {
      const all = this.filteredTokoNasionalAll;
      const page = Math.min(this.filterTokoNasional.page || 1, this.totalTokoNasionalPages);
      const size = this.filterTokoNasional.pageSize || 50;
      const start = (page - 1) * size;
      return all.slice(start, start + size);
    },

    onTokoNasionalSearchInput() {
      const q = (this.filterTokoNasional.searchInputText || '').trim().toUpperCase();
      if (q.length < 2) {
        this.tokoNasionalSuggestions = [];
        this.showTokoNasionalSuggestions = false;
        return;
      }
      const list = this.stores49k || [];
      const results = [];
      const seen = new Set();
      
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const name = item.namaToko || '';
        const code = item.kodeToko || '';
        const str = item._searchStr || `${name} ${code} ${item.account || ''} ${item.alamat || ''}`;
        
        if (str.toUpperCase().includes(q)) {
          const key = (code || name).toUpperCase();
          if (!seen.has(key)) {
            seen.add(key);
            results.push({
              kodeToko: item.kodeToko,
              namaToko: item.namaToko,
              account: item.account,
              alamat: item.alamat,
              lat: item.lat,
              lon: item.lon
            });
            if (results.length >= 8) break;
          }
        }
      }
      this.tokoNasionalSuggestions = results;
      this.showTokoNasionalSuggestions = results.length > 0;
    },

    selectTokoNasionalSuggestion(item) {
      if (!item) return;
      this.filterTokoNasional.searchInputText = item.namaToko || item.kodeToko;
      this.showTokoNasionalSuggestions = false;
      this.executeTokoNasionalSearch();
    },

    executeTokoNasionalSearch() {
      this.showTokoNasionalSuggestions = false;
      this.filterTokoNasional.searchQuery = (this.filterTokoNasional.searchInputText || '').trim();
      this.filterTokoNasional.page = 1;
    },

    clearTokoNasionalSearch() {
      this.filterTokoNasional.searchInputText = '';
      this.filterTokoNasional.searchQuery = '';
      this.tokoNasionalSuggestions = [];
      this.showTokoNasionalSuggestions = false;
      this.filterTokoNasional.page = 1;
    },

    setTokoNasionalPage(p) {
      const pageNum = Math.max(1, Math.min(p, this.totalTokoNasionalPages));
      this.filterTokoNasional.page = pageNum;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    prevTokoNasionalPage() {
      if (this.filterTokoNasional.page > 1) {
        this.setTokoNasionalPage(this.filterTokoNasional.page - 1);
      }
    },

    nextTokoNasionalPage() {
      if (this.filterTokoNasional.page < this.totalTokoNasionalPages) {
        this.setTokoNasionalPage(this.filterTokoNasional.page + 1);
      }
    },

    get tokoNasionalPaginationWindow() {
      const current = this.filterTokoNasional.page || 1;
      const total = this.totalTokoNasionalPages;
      const pages = [];
      const delta = 2;
      const left = Math.max(1, current - delta);
      const right = Math.min(total, current + delta);

      for (let i = left; i <= right; i++) {
        pages.push(i);
      }
      return pages;
    },

    /**
     * Get unique crew list for a specific modul
     */
    getCrewsByModul(modul = '') {
      const cleanTargetModul = (modul || '').toString().trim().toUpperCase().replace(/[\s-_]/g, '');
      const crewMap = new Map();

      // 1. From masterUser
      if (Array.isArray(this.masterUser)) {
        this.masterUser.forEach(u => {
          const uMod = (u.modul || u.mod || u.module || '').toString().trim().toUpperCase().replace(/[\s-_]/g, '');
          const uName = (u.namaCrew || u.name || u.nama || '').toString().trim();
          const uCode = (u.kodeCrew || u.code || u.id || '').toString().trim();
          
          if (!uName) return;
          if (cleanTargetModul && cleanTargetModul !== 'ALL') {
            if (uMod !== cleanTargetModul && !uMod.startsWith(cleanTargetModul)) return;
          }

          if (!crewMap.has(uName.toUpperCase())) {
            crewMap.set(uName.toUpperCase(), {
              namaCrew: uName,
              kodeCrew: uCode,
              modul: u.modul || modul
            });
          }
        });
      }

      // 2. From masterToko
      if (Array.isArray(this.masterToko)) {
        this.masterToko.forEach(m => {
          const mMod = (m.modul || m._officialModul || '').toString().trim().toUpperCase().replace(/[\s-_]/g, '');
          const mName = (m.namaCrew || '').toString().trim();
          const mCode = (m.kodeCrew || '').toString().trim();

          if (!mName) return;
          if (cleanTargetModul && cleanTargetModul !== 'ALL') {
            if (mMod !== cleanTargetModul && !mMod.startsWith(cleanTargetModul)) return;
          }

          if (!crewMap.has(mName.toUpperCase())) {
            crewMap.set(mName.toUpperCase(), {
              namaCrew: mName,
              kodeCrew: mCode,
              modul: m.modul || modul
            });
          }
        });
      }

      // 3. Fallback from jadwalCrewList
      if (crewMap.size === 0 && Array.isArray(this.jadwalCrewList)) {
        this.jadwalCrewList.forEach(c => {
          const cMod = (c.modul || '').toString().trim().toUpperCase().replace(/[\s-_]/g, '');
          const cName = (c.name || '').toString().trim();
          const cCode = (c.id || c.code || '').toString().trim();

          if (!cName) return;
          if (cleanTargetModul && cleanTargetModul !== 'ALL') {
            if (cMod !== cleanTargetModul && !cMod.startsWith(cleanTargetModul)) return;
          }

          if (!crewMap.has(cName.toUpperCase())) {
            crewMap.set(cName.toUpperCase(), {
              namaCrew: cName,
              kodeCrew: cCode,
              modul: c.modul || modul
            });
          }
        });
      }

      // Sort alphabetically
      return Array.from(crewMap.values()).sort((a, b) => a.namaCrew.localeCompare(b.namaCrew));
    },

    /**
     * Modal Openers for Tab 4 Database Toko Nasional
     */
    openAssignStoreToMdsModal(store) {
      this.crudModal.mode = 'assign_schedule';
      this.crudModal.title = 'Jadwalkan Toko ke Personil MDS';
      this.crudModal.item = store;
      
      const defaultModul = 'DK1';
      const availableCrews = this.getCrewsByModul(defaultModul);
      const firstCrew = availableCrews.length > 0 ? availableCrews[0] : { namaCrew: '', kodeCrew: '' };

      this.crudModal.formData = {
        kodeToko: store.kodeToko,
        namaToko: store.namaToko,
        account: store.account || 'ALFAMART',
        modul: defaultModul,
        namaCrew: firstCrew.namaCrew,
        kodeCrew: firstCrew.kodeCrew,
        rute: '1',
        dcName: store.branchName || '',
        kecamatan: store.kecamatan || '',
        kota: store.kabKota || ''
      };
      this.crudModal.isSubmitting = false;
      this.crudModal.isSuccess = false;
      this.crudModal.errorMsg = '';
      this.crudModal.statusMsg = '';
      this.crudModal.auditResult = null;
      this.crudModal.isOpen = true;
    },

    openEditMasterStoreModal(store) {
      this.crudModal.mode = 'edit_master';
      this.crudModal.title = 'Edit Data Toko di Master Database Toko';
      this.crudModal.item = store;
      this.crudModal.formData = {
        kodeToko: store.kodeToko,
        namaToko: store.namaToko,
        account: store.account || 'ALFAMART',
        dcCode: store.branchCode || '',
        dcName: store.branchName || '',
        kecamatan: store.kecamatan || '',
        kota: store.kabKota || '',
        provinsi: store.provinsi || '',
        lat: store.lat || '',
        lon: store.lon || ''
      };
      this.crudModal.isSubmitting = false;
      this.crudModal.isSuccess = false;
      this.crudModal.errorMsg = '';
      this.crudModal.statusMsg = '';
      this.crudModal.auditResult = null;
      this.crudModal.isOpen = true;
    },

    openDeleteMasterStoreModal(store) {
      this.crudModal.mode = 'delete_master';
      this.crudModal.title = 'Hapus / Tandai Toko Tutup di Master Database';
      this.crudModal.item = store;
      this.crudModal.formData = {
        kodeToko: store.kodeToko,
        namaToko: store.namaToko,
        account: store.account
      };
      this.crudModal.isSubmitting = false;
      this.crudModal.isSuccess = false;
      this.crudModal.errorMsg = '';
      this.crudModal.statusMsg = '';
      this.crudModal.auditResult = null;
      this.crudModal.isOpen = true;
    },

    /**
     * Computed Filtered Master User
     */
    get filteredMasterUser() {
      let data = this.masterUser || [];
      if (!data || data.length === 0) return [];
      if (this.selectedModul && this.selectedModul !== 'ALL' && this.selectedModul.toUpperCase() !== 'NASIONAL') {
        if (this.selectedModul.length === 2) {
          data = data.filter(u => u.modul && u.modul.toUpperCase().startsWith(this.selectedModul));
        } else {
          data = data.filter(u => u.modul && u.modul.toUpperCase() === this.selectedModul);
        }
      }
      if (this.selectedAccount !== 'ALL') {
        data = data.filter(u => (u.account || '').toUpperCase().includes(this.selectedAccount));
      }
      if (this.selectedCrew) {
        const selCrew = this.selectedCrew.toUpperCase().trim();
        data = data.filter(u => {
          const cName = (u.nama || '').toUpperCase().trim();
          const cCode = (u.id || '').toUpperCase().trim();
          return cName === selCrew || cCode === selCrew;
        });
      } else if (this.searchQuery.trim()) {
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
     * Determine Active Target Date based on Date Filter
     */
    getActiveTargetDate() {
      let targetDate = new Date();
      if (this.dateFilter === 'YESTERDAY') {
        targetDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      } else if (this.dateFilter === 'LATEST_DAY' && this.visits && this.visits.length > 0) {
        const first = this.visits[0];
        const dateStr = this.normalizeIsoDate(first.dateIso || first.date || first.tanggal, first.hariKe);
        if (dateStr && dateStr.length >= 10) {
          targetDate = new Date(dateStr);
        }
      } else if (this.dateFilter === 'CUSTOM') {
        if (this.startDate && this.endDate && this.startDate === this.endDate) {
          targetDate = new Date(this.startDate);
        } else if (this.startDate && this.endDate) {
          return null; // Multi-day range: all match
        } else if (this.visits && this.visits.length > 0) {
          const first = this.visits[0];
          const dateStr = this.normalizeIsoDate(first.dateIso || first.date || first.tanggal, first.hariKe);
          if (dateStr && dateStr.length >= 10) targetDate = new Date(dateStr);
        }
      } else if (this.startDate) {
        if (!this.endDate || this.startDate === this.endDate) {
          targetDate = new Date(this.startDate);
        } else {
          return null; // Multi-day range: all match
        }
      } else if (this.dateFilter === '7_DAYS' || this.dateFilter === 'THIS_MONTH') {
        return null; // Multi-day range: all match
      }
      return targetDate;
    },

    /**
     * Strict Calendar Date Route Matcher (1..31: Tanggal 9 = Rute 9, Tanggal 17 = Rute 17, etc.)
     */
    getCrewTargetRouteSet(routesSet, targetDate = new Date()) {
      if (!targetDate) return null; // Multi-day range: match all stores
      
      const calDay = targetDate.getDate(); // 1..31 (Tanggal Kalender)
      const weekDayRaw = targetDate.getDay(); // 0 = Minggu, 1 = Senin, ..., 5 = Jumat, 6 = Sabtu
      const weekDay = weekDayRaw === 0 ? 7 : weekDayRaw; // 1 = Senin .. 7 = Minggu
      
      // Analyze routes assigned to this crew to determine their schedule type
      const routeArray = routesSet ? Array.from(routesSet) : [];
      const numbers = [];
      let hasDayName = false;
      const dayWords = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      
      routeArray.forEach(r => {
        const str = String(r).toUpperCase().trim();
        const matches = str.match(/\d+/g);
        if (matches) matches.forEach(m => numbers.push(parseInt(m, 10)));
        if (dayWords.some(d => str.includes(d))) hasDayName = true;
      });

      const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
      const isStrictWeekly = routeArray.length > 0 && maxNum > 0 && maxNum <= 7 && !numbers.some(n => n > 7);
      const isStrictDayName = routeArray.length > 0 && hasDayName && maxNum === 0;
      const isStrictCalendar = routeArray.length > 0 && maxNum > 7;

      const targetSet = new Set();
      
      // 1. Calendar Day variations (1..31) - apply if calendar schedule or default
      if (!isStrictWeekly && !isStrictDayName) {
        const calStr = String(calDay);
        const calPad = calStr.padStart(2, '0');
        targetSet.add(calStr);
        targetSet.add(calPad);
        targetSet.add('R' + calStr);
        targetSet.add('R' + calPad);
        targetSet.add('RUTE ' + calStr);
        targetSet.add('RUTE ' + calPad);
        targetSet.add('RUTE-' + calStr);
        targetSet.add('RUTE-' + calPad);
        targetSet.add('TGL ' + calStr);
        targetSet.add('TGL ' + calPad);
        targetSet.add('HARI ' + calStr);
        targetSet.add('HARI ' + calPad);
        targetSet.add('H' + calStr);
        targetSet.add('H-' + calStr);
      }

      // 2. Day of Week / Weekly Cycle variations (1..6 / 1..7 / Day Names) - apply if weekly or day-name schedule or default
      if (!isStrictCalendar) {
        const weekStr = String(weekDay);
        const weekPad = weekStr.padStart(2, '0');
        targetSet.add(weekStr);
        targetSet.add(weekPad);
        targetSet.add('R' + weekStr);
        targetSet.add('R' + weekPad);
        targetSet.add('RUTE ' + weekStr);
        targetSet.add('RUTE ' + weekPad);
        targetSet.add('RUTE-' + weekStr);
        targetSet.add('RUTE-' + weekPad);
        targetSet.add('H' + weekStr);
        targetSet.add('H-' + weekStr);
        targetSet.add('HARI ' + weekStr);
        targetSet.add('HARI-' + weekStr);

        const idDays = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
        const enDays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const idShort = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];
        const enShort = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

        const todayId = idDays[weekDayRaw];
        const todayEn = enDays[weekDayRaw];
        const todayIdShort = idShort[weekDayRaw];
        const todayEnShort = enShort[weekDayRaw];

        [todayId, todayEn, todayIdShort, todayEnShort].forEach(d => {
          if (d) {
            targetSet.add(d);
            targetSet.add('RUTE ' + d);
            targetSet.add('RUTE-' + d);
            targetSet.add('R ' + d);
            targetSet.add('R-' + d);
            targetSet.add('HARI ' + d);
          }
        });
      }

      return targetSet;
    },

    /**
     * Active Route Match Set for Current Filter Date
     */
    getActiveRouteMatchList() {
      const targetDate = this.getActiveTargetDate();
      if (!targetDate) return null;
      return this.getCrewTargetRouteSet(null, targetDate);
    },

    /**
     * Flexible Route String Matcher
     */
    isRouteMatched(ruteStr, routeMatchSet) {
      if (!routeMatchSet || routeMatchSet.size === 0) return true;
      if (!ruteStr) return false;
      const clean = String(ruteStr).toUpperCase().replace(/['"`]/g, '').trim();
      if (!clean || clean === '-' || clean === 'ALL' || clean === 'SEMUA') return true;
      
      if (routeMatchSet.has(clean)) return true;
      for (const target of routeMatchSet) {
        if (clean === target) return true;
        if (clean.endsWith(' ' + target) || clean.endsWith('-' + target) || clean.endsWith('/' + target) || clean.endsWith('_' + target)) return true;
        if (clean.startsWith(target + ' ') || clean.startsWith(target + '-') || clean.startsWith(target + '/') || clean.startsWith(target + '_')) return true;
        const tokens = clean.split(/[\s\-_/,\\]+/);
        if (tokens.includes(target)) return true;
      }
      return false;
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
     * Filtered Compliance List (Scoped by Selected Crew / Search Query)
     */
    get filteredComplianceList() {
      let list = this.complianceList || [];
      if (this.selectedCrews && this.selectedCrews.length > 0) {
        const selCrewsUpper = new Set(this.selectedCrews.map(c => String(c).toUpperCase().trim()));
        list = list.filter(c => selCrewsUpper.has((c.namaCrew || '').toUpperCase().trim()) || selCrewsUpper.has((c.kodeCrew || '').toUpperCase().trim()));
      } else if (this.selectedCrew) {
        const selCrew = this.selectedCrew.toUpperCase().trim();
        list = list.filter(c => (c.namaCrew || '').toUpperCase().trim() === selCrew || (c.kodeCrew || '').toUpperCase().trim() === selCrew);
      } else if (this.searchQuery && this.searchQuery.trim()) {
        const q = this.searchQuery.toUpperCase().trim();
        list = list.filter(c => 
          (c.namaCrew || '').toUpperCase().includes(q) ||
          (c.kodeCrew || '').toUpperCase().includes(q) ||
          (c.modul || '').toUpperCase().includes(q)
        );
      }
      return list;
    },

    /**
     * Executive KPI Calculations
     */
    get kpiSummary() {
      const vData = this.filteredVisits || [];
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

      // Scoped compliance list (reflecting any active search / crew filter)
      const compList = this.filteredComplianceList || [];
      const scheduled = compList.length > 0 ? compList.length : uniqueCrews;
      const inactiveCrewsCount = compList.filter(c => c.visitedCount === 0 && !c.isVisitDc).length;

      const routeMatchSet = this.getActiveRouteMatchList();
      let totalTarget = 0;

      if (routeMatchSet && routeMatchSet.size > 0) {
        // Daily Mode: Exact sum of scheduled target stores for the active day across filtered crews
        totalTarget = compList.reduce((sum, c) => sum + (c.targetCount || 0), 0);
      } else {
        // Multi-day / Monthly Mode: Sum of all unique stores in master for filtered crews
        totalTarget = compList.reduce((sum, c) => sum + (c.targetCount || 0), 0);
        if (totalTarget === 0 && this.filteredMasterToko && this.filteredMasterToko.length > 0) {
          totalTarget = this.filteredMasterToko.length;
        }
      }

      // Validated target visits: sum of visited stores for each crew
      const totalVisitedStores = compList.reduce((sum, c) => sum + (c.visitedCount || 0), 0) || uniqueStores;
      if (totalTarget === 0 && totalVisitedStores > 0) {
        totalTarget = totalVisitedStores;
      }
      const achievementRate = totalTarget > 0 ? Math.min(100, Math.round((totalVisitedStores / totalTarget) * 100)) : (totalVisits > 0 ? 100 : 0);
      
      // Absensi Kehadiran Terfilter
      const aData = this.filteredAbsensi || [];
      const hadirList = aData.filter(a => {
        const st = (a.status || '').toUpperCase();
        return st.includes('MASUK') || st.includes('HADIR') || st.includes('IN');
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

      const cleanCrewToken = (str) => {
        if (!str) return '';
        return normKey(str)
          .replace(/\s*[\(\[\-]?\s*(DK|LK|LP)[0-9]?\s*[\)\]]?\s*$/i, '')
          .replace(/\s+/g, ' ')
          .trim();
      };

      const isCrewMatch = (a, b) => {
        if (!a || !b) return false;
        const kA = normKey(a);
        const kB = normKey(b);
        if (!kA || !kB) return false;
        if (kA === kB) return true;
        const baseA = cleanCrewToken(a);
        const baseB = cleanCrewToken(b);
        if (baseA && baseB && baseA === baseB) return true;
        return false;
      };

      // 1. Multi-source crew seeding (Master User, Official Crews, Managed SPV, dan Visited Crews)
      const crewMap = {};
      const idToKeyMap = {};

      const seedCrew = (rawName, rawId, rawModul) => {
        if (!rawName && !rawId) return;
        const cleanName = normKey(rawName);
        const cleanId = normKey(rawId);
        const key = cleanName || cleanId;
        if (!key) return;

        if (!crewMap[key]) {
          const mod = (rawModul || (this.getCrewOfficialModul ? this.getCrewOfficialModul(rawName, '-') : '') || '').trim().toUpperCase();
          crewMap[key] = {
            namaCrew: (rawName || rawId).trim().toUpperCase(),
            kodeCrew: (rawId || '-').trim().toUpperCase(),
            modul: mod,
            allRoutes: new Set(),
            targetStores: new Set(),
            allStores: new Set(),
            visitedStores: new Set(),
            totalVisits: 0
          };
        }
        if (cleanName) idToKeyMap[cleanName] = key;
        if (cleanId) idToKeyMap[cleanId] = key;
      };

      (this.masterUser || []).forEach(u => seedCrew(u.nama, u.id, u.modul));
      (this.availableOfficialCrews || []).forEach(c => seedCrew(c.name, c.code, c.modul));
      (this.getSpvManagedCrews() || []).forEach(cName => seedCrew(cName, '', ''));
      (this.filteredVisits || []).forEach(v => seedCrew(v.namaCrew, v.kodeCrew, v.modul));

      // Helper to find existing crew with fuzzy fallback
      const findOfficialCrew = (rawName, rawId) => {
        const cleanName = normKey(rawName);
        const cleanId = normKey(rawId);
        let key = (cleanName && idToKeyMap[cleanName]) || (cleanId && idToKeyMap[cleanId]) || null;
        if (!key && cleanName) {
          for (const k of Object.keys(crewMap)) {
            if (isCrewMatch(k, cleanName)) {
              key = k;
              break;
            }
          }
        }
        return key && crewMap[key] ? crewMap[key] : null;
      };

      // 2. Map assigned routes & Target Stores from Pre-Indexed Master Toko (O(1) Instant Lookup - Zero Lag)
      const targetDate = this.getActiveTargetDate();
      const masterStoreMap = this.crewMasterStoresMap || new Map();
      const masterRouteMap = this.crewMasterRoutesMap || new Map();

      Object.values(crewMap).forEach(crewObj => {
        const cKey = normKey(crewObj.namaCrew);
        const cCode = normKey(crewObj.kodeCrew);
        const baseKey = cleanCrewToken(crewObj.namaCrew);

        const assignedRoutes = masterRouteMap.get(cKey) || masterRouteMap.get(cCode) || masterRouteMap.get(baseKey);
        if (assignedRoutes) {
          assignedRoutes.forEach(r => crewObj.allRoutes.add(r));
        }

        const assignedStores = masterStoreMap.get(cKey) || masterStoreMap.get(cCode) || masterStoreMap.get(baseKey) || [];
        const crewTargetRoutes = this.getCrewTargetRouteSet(crewObj.allRoutes, targetDate);

        assignedStores.forEach(m => {
          const storeKey = normKey(m.kodeToko) || normKey(m.namaToko);
          if (storeKey) {
            crewObj.allStores.add(storeKey);
            const ruteStr = String(m.rute || '').toUpperCase().trim();
            if (this.isRouteMatched(ruteStr, crewTargetRoutes)) {
              crewObj.targetStores.add(storeKey);
            }
          }
        });
      });

      // Pass 2.1: Safety Fallback for crews where targetStores is 0 but they have assigned stores in Master Toko or Visits
      Object.values(crewMap).forEach(crewObj => {
        if (crewObj.targetStores.size === 0) {
          if (crewObj.allStores.size > 0 && crewObj.allStores.size <= 25) {
            crewObj.allStores.forEach(s => crewObj.targetStores.add(s));
          } else if (crewObj.visitedStores.size > 0) {
            crewObj.visitedStores.forEach(s => crewObj.targetStores.add(s));
          }
        }
      });

      // 3. Map Realized Visits in Active Filter ONLY to existing Official Master Users
      (this.filteredVisits || []).forEach(v => {
        const crewObj = findOfficialCrew(v.namaCrew, v.kodeCrew);
        if (!crewObj) return;

        crewObj.totalVisits++;
        const visitStoreKey = normKey(v.kodeToko) || normKey(v.namaToko);
        if (visitStoreKey) {
          crewObj.visitedStores.add(visitStoreKey);
          if (crewObj.targetStores.size === 0) {
            crewObj.targetStores.add(visitStoreKey);
          }
        }
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

      const spvManagedCrews = (this.currentUser && this.currentUser.role === 'SPV') ? this.getSpvManagedCrews() : [];
      const spvMod = (this.currentUser && this.currentUser.role === 'SPV') ? this.getSpvModul() : '';
      const results = [];

      Object.keys(crewMap).forEach(k => {
        const c = crewMap[k];
        const crewName = c.namaCrew;
        const modulName = c.modul || '-';
        const cleanCrewKey = normKey(crewName);
        const cleanIdKey = normKey(c.kodeCrew);
        const dcInfo = crewDcMap[cleanCrewKey] || (cleanIdKey ? crewDcMap[cleanIdKey] : null);

        let targetCount = c.targetStores.size;
        if (targetCount === 0) {
          if (c.allStores.size > 0 && c.allStores.size <= 25) {
            targetCount = c.allStores.size;
          } else {
            targetCount = c.visitedStores.size;
          }
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
            status = 'PROGRESS';
            statusBadge = `🟡 Sisa ${remainingCount} Toko`;
            statusColor = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
          } else {
            status = 'BELUM_KUNJUNGAN';
            statusBadge = `⚪ Belum Kunjungan (0/${targetCount})`;
            statusColor = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
          }
        } else if (visitedCount > 0) {
          status = 'TUNTAS';
          statusBadge = `🟢 Tuntas 100%`;
          statusColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
          targetCount = visitedCount;
        } else {
          status = 'BELUM_INPUT';
          statusBadge = '🔴 Belum Input Jadwal';
          statusColor = 'bg-rose-500/10 text-rose-500 border-rose-500/20';
        }

        // Apply module filter if active (Kecuali jika personil ini dikelola langsung oleh SPV yang sedang login)
        const isSpvManaged = spvManagedCrews.length > 0 && spvManagedCrews.some(m => isCrewMatch(m, crewName) || isCrewMatch(m, c.kodeCrew));
        if (!isSpvManaged && this.selectedModul && this.selectedModul !== 'ALL' && this.selectedModul.toUpperCase() !== 'NASIONAL') {
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

      // RLS Filter untuk SPV pada compliance list
      let finalResults = results;
      if (this.currentUser && this.currentUser.role === 'SPV') {
        if (spvManagedCrews.length > 0) {
          finalResults = results.filter(r => spvManagedCrews.some(m => isCrewMatch(m, r.namaCrew) || isCrewMatch(m, r.kodeCrew)));
        } else if (spvMod && spvMod !== 'ALL' && spvMod !== 'NASIONAL') {
          finalResults = results.filter(r => r.modul && (r.modul.toUpperCase().startsWith(spvMod) || spvMod.startsWith(r.modul.toUpperCase())));
        }
      }

      return finalResults.sort((a, b) => {
        if (b.rate !== a.rate) return b.rate - a.rate;
        if (b.visitedCount !== a.visitedCount) return b.visitedCount - a.visitedCount;
        return a.namaCrew.localeCompare(b.namaCrew);
      });
    },

    /**
     * All official available crew list for multi-select dropdown
     */
    get allAvailableCrews() {
      if (this.currentUser && this.currentUser.role === 'MDS') {
        const mdsCrew = this.getCurrentMdsCrewName();
        if (mdsCrew) {
          return [{
            namaCrew: mdsCrew,
            kodeCrew: '-',
            modul: this.currentUser.modul || '',
            upper: mdsCrew.toUpperCase().trim()
          }];
        }
      }
      let list = (this.availableOfficialCrews || []).map(c => ({
        namaCrew: c.name,
        kodeCrew: c.code || '-',
        modul: c.modul || '',
        upper: (c.name || '').toUpperCase().trim()
      }));

      if (this.currentUser && this.currentUser.role === 'SPV') {
        const managed = this.getSpvManagedCrews();
        if (managed.length > 0) {
          const managedUpper = managed.map(c => (c || '').toUpperCase().trim()).filter(Boolean);
          const filtered = list.filter(c => managedUpper.some(m => m === c.upper || c.upper.includes(m) || m.includes(c.upper)));
          return filtered.length > 0 ? filtered : list;
        }
      }
      return list;
    },

    /**
     * Filtered crew list inside the dropdown based on search and active module
     */
    get filteredDropdownCrews() {
      if (this.currentUser && this.currentUser.role === 'MDS') {
        return this.allAvailableCrews;
      }
      const q = (this.crewDropdownSearch || '').toUpperCase().trim();
      let list = this.allAvailableCrews;

      if (this.selectedModul && this.selectedModul !== 'ALL' && this.selectedModul.toUpperCase() !== 'NASIONAL') {
        if (this.selectedModul.length === 2) {
          list = list.filter(c => c.modul.startsWith(this.selectedModul));
        } else {
          list = list.filter(c => c.modul === this.selectedModul);
        }
      }

      if (q) {
        list = list.filter(c => c.upper.includes(q) || c.kodeCrew.toUpperCase().includes(q) || c.modul.includes(q));
      }
      return list;
    },

    /**
     * Staged Multi-Select Crew Dropdown Helpers (Zero-Lag, Applies only on "Done")
     */
    openCrewDropdown() {
      this.tempSelectedCrews = [...(this.selectedCrews || [])];
      this.crewDropdownSearch = '';
      this.crewDropdownOpen = true;
    },

    toggleCrewTempSelection(crewName) {
      if (!crewName) return;
      const upper = crewName.toUpperCase().trim();
      const idx = this.tempSelectedCrews.findIndex(c => c.toUpperCase().trim() === upper);
      if (idx >= 0) {
        this.tempSelectedCrews.splice(idx, 1);
      } else {
        this.tempSelectedCrews.push(crewName);
      }
    },

    isCrewTempSelected(crewName) {
      if (!crewName || !this.tempSelectedCrews) return false;
      const upper = crewName.toUpperCase().trim();
      return this.tempSelectedCrews.some(c => c.toUpperCase().trim() === upper);
    },

    selectAllFilteredTempCrews() {
      const currentFiltered = this.filteredDropdownCrews;
      const toAdd = currentFiltered.map(c => c.namaCrew);
      const set = new Set(this.tempSelectedCrews);
      toAdd.forEach(name => set.add(name));
      this.tempSelectedCrews = Array.from(set);
    },

    clearAllTempCrews() {
      this.tempSelectedCrews = [];
      this.crewDropdownSearch = '';
    },

    applyCrewSelection() {
      const selected = [...(this.tempSelectedCrews || [])];
      this.crewDropdownOpen = false;
      this.selectedCrew = '';

      // Tampilkan animasi overlay loading secara instan sebelum komputasi berat dimulai
      this.isLoading = true;
      const count = selected.length;
      this.loadingMessage = count > 0 
        ? `Memfilter Data ${count} MDS Terpilih...` 
        : 'Memuat Semua Data Monitoring...';
      this.loadingStage = 3;

      // Beri jeda 30ms agar browser merender overlay loading terlebih dahulu sebelum Alpine recompute
      setTimeout(() => {
        this.selectedCrews = selected;
        this.currentPage = 1;

        requestAnimationFrame(() => {
          if (this.activeTab === 'kunjungan' && document.getElementById('visits-map')) {
            MapService.renderVisitsOnMap(this.filteredVisits);
          }
          if (window.lucide) window.lucide.createIcons();
          if (this.initCharts) this.initCharts();

          setTimeout(() => {
            this.isLoading = false;
          }, 200);
        });
      }, 30);
    },

    clearAllSelectedCrews() {
      this.isLoading = true;
      this.loadingMessage = 'Mereset Filter MDS...';
      this.loadingStage = 3;
      this.tempSelectedCrews = [];
      this.selectedCrew = '';
      this.crewDropdownSearch = '';

      setTimeout(() => {
        this.selectedCrews = [];
        this.currentPage = 1;

        requestAnimationFrame(() => {
          if (this.activeTab === 'kunjungan' && document.getElementById('visits-map')) {
            MapService.renderVisitsOnMap(this.filteredVisits);
          }
          if (window.lucide) window.lucide.createIcons();
          if (this.initCharts) this.initCharts();

          setTimeout(() => {
            this.isLoading = false;
          }, 200);
        });
      }, 30);
    },

    toggleCrewCardExpand(crewKey) {
      this.expandedCrews[crewKey] = !this.expandedCrews[crewKey];
    },

    expandAllCrewCards() {
      (this.crewMonitoringCards || []).forEach(c => {
        this.expandedCrews[c.key] = true;
      });
    },

    collapseAllCrewCards() {
      this.expandedCrews = {};
    },

    /**
     * Detailed Real-time Monitoring Cards Data Structure (Expandable per MDS) - Ultra-Fast O(1) Pre-Indexed
     */
    get crewMonitoringCards() {
      const compList = this.filteredComplianceList || [];
      const normKey = (str) => {
        if (!str) return '';
        return String(str).toUpperCase()
          .replace(/[\.\,\-\_\(\)\/]/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/SULISTIYO/g, 'SULISTIO')
          .trim();
      };

      const cleanCrewToken = (str) => {
        if (!str) return '';
        return normKey(str)
          .replace(/\s*[\(\[\-]?\s*(DK|LK|LP)[0-9]?\s*[\)\]]?\s*$/i, '')
          .replace(/\s+/g, ' ')
          .trim();
      };

      const parseTimeToSeconds = (tStr) => {
        if (!tStr) return 0;
        const clean = String(tStr).trim().replace(/[^\d:]/g, '');
        const parts = clean.split(':');
        const h = parseInt(parts[0], 10) || 0;
        const m = parseInt(parts[1], 10) || 0;
        const s = parseInt(parts[2], 10) || 0;
        return h * 3600 + m * 60 + s;
      };

      const allVisits = this.filteredVisits || [];
      const allAbsensi = this.filteredAbsensi || [];
      const allMaster = this.masterToko || [];
      const targetDate = this.getActiveTargetDate();

      // Pre-group by exact & base normalized name ONCE (O(N) linear time for 0ms lag)
      const visitsByCrew = new Map();
      allVisits.forEach(v => {
        const k = normKey(v.namaCrew);
        const base = cleanCrewToken(v.namaCrew);
        if (k) {
          if (!visitsByCrew.has(k)) visitsByCrew.set(k, []);
          visitsByCrew.get(k).push(v);
        }
        if (base && base !== k) {
          if (!visitsByCrew.has(base)) visitsByCrew.set(base, []);
          visitsByCrew.get(base).push(v);
        }
      });

      // Sort visits chronologically per personil once
      visitsByCrew.forEach(list => {
        list.sort((a, b) => {
          const secA = parseTimeToSeconds(a.time || a.jam || a.waktu);
          const secB = parseTimeToSeconds(b.time || b.jam || b.waktu);
          return secA - secB;
        });
      });

      const absensiByCrew = new Map();
      allAbsensi.forEach(a => {
        const k = normKey(a.namaCrew);
        const base = cleanCrewToken(a.namaCrew);
        if (k && !absensiByCrew.has(k)) absensiByCrew.set(k, a);
        if (base && !absensiByCrew.has(base)) absensiByCrew.set(base, a);
      });

      const masterStoreMap = this.crewMasterStoresMap || new Map();

      return compList.map(c => {
        const cKey = normKey(c.namaCrew);
        const baseKey = cleanCrewToken(c.namaCrew);
        
        const crewVisits = visitsByCrew.get(cKey) || visitsByCrew.get(baseKey) || [];
        const crewAbsen = absensiByCrew.get(cKey) || absensiByCrew.get(baseKey) || null;
        const crewMasterStores = masterStoreMap.get(cKey) || masterStoreMap.get(baseKey) || [];

        const crewRoutes = new Set();
        crewMasterStores.forEach(m => {
          if (m.rute) crewRoutes.add(String(m.rute).trim().toUpperCase());
        });

        // Determine today's target routes
        const targetRouteSet = this.getCrewTargetRouteSet(crewRoutes, targetDate);

        // Map visits lookup by store key
        const visitMap = new Map();
        crewVisits.forEach(v => {
          const sKey = normKey(v.kodeToko) || normKey(v.namaToko);
          if (sKey && !visitMap.has(sKey)) {
            visitMap.set(sKey, v);
          }
        });

        // Build target stores list for today
        const targetStoresList = [];
        const seenStoreKeys = new Set();

        crewMasterStores.forEach(m => {
          const ruteStr = String(m.rute || '').toUpperCase().trim();
          if (this.isRouteMatched(ruteStr, targetRouteSet)) {
            const sKey = normKey(m.kodeToko) || normKey(m.namaToko);
            if (sKey && !seenStoreKeys.has(sKey)) {
              seenStoreKeys.add(sKey);
              const visitRecord = visitMap.get(sKey);
              targetStoresList.push({
                kodeToko: m.kodeToko || '-',
                namaToko: m.namaToko || 'Nama Toko Tidak Tersedia',
                account: m.account || 'ALFAMART',
                alamat: m.alamat || '-',
                rute: m.rute || '-',
                isVisited: !!visitRecord,
                visitTime: visitRecord ? (visitRecord.jam || visitRecord.waktu || visitRecord.time || '-') : null,
                foto: visitRecord ? (visitRecord.foto || visitRecord.fotoDisplay || visitRecord.image || null) : null,
                catatan: visitRecord ? (visitRecord.catatan || visitRecord.keterangan || null) : null,
                rawVisit: visitRecord || null
              });
            }
          }
        });

        // Fallback: If no stores matched today's route, but crew has master stores or visits
        if (targetStoresList.length === 0) {
          if (crewMasterStores.length > 0 && crewMasterStores.length <= 25) {
            crewMasterStores.forEach(m => {
              const sKey = normKey(m.kodeToko) || normKey(m.namaToko);
              if (sKey && !seenStoreKeys.has(sKey)) {
                seenStoreKeys.add(sKey);
                const visitRecord = visitMap.get(sKey);
                targetStoresList.push({
                  kodeToko: m.kodeToko || '-',
                  namaToko: m.namaToko || 'Nama Toko Tidak Tersedia',
                  account: m.account || 'ALFAMART',
                  alamat: m.alamat || '-',
                  rute: m.rute || '-',
                  isVisited: !!visitRecord,
                  visitTime: visitRecord ? (visitRecord.jam || visitRecord.waktu || visitRecord.time || '-') : null,
                  foto: visitRecord ? (visitRecord.foto || visitRecord.fotoDisplay || visitRecord.image || null) : null,
                  catatan: visitRecord ? (visitRecord.catatan || visitRecord.keterangan || null) : null,
                  rawVisit: visitRecord || null
                });
              }
            });
          } else if (crewVisits.length > 0) {
            crewVisits.forEach(v => {
              const sKey = normKey(v.kodeToko) || normKey(v.namaToko);
              if (sKey && !seenStoreKeys.has(sKey)) {
                seenStoreKeys.add(sKey);
                targetStoresList.push({
                  kodeToko: v.kodeToko || '-',
                  namaToko: v.namaToko || 'Toko Terdaftar',
                  account: v.account || 'LAINNYA',
                  alamat: v.alamat || '-',
                  rute: v.rute || 'VISIT',
                  isVisited: true,
                  visitTime: v.jam || v.waktu || v.time || '-',
                  foto: v.foto || v.fotoDisplay || v.image || null,
                  catatan: v.catatan || v.keterangan || null,
                  rawVisit: v
                });
              }
            });
          }
        }

        // Extra visits (visited stores not on today's target route)
        const extraVisits = [];
        crewVisits.forEach(v => {
          const sKey = normKey(v.kodeToko) || normKey(v.namaToko);
          if (sKey && !seenStoreKeys.has(sKey)) {
            extraVisits.push({
              kodeToko: v.kodeToko || '-',
              namaToko: v.namaToko || 'Toko Luar Rute',
              account: v.account || 'LAINNYA',
              alamat: v.alamat || '-',
              isVisited: true,
              isExtra: true,
              visitTime: v.jam || v.waktu || v.time || '-',
              foto: v.foto || v.fotoDisplay || v.image || null,
              rawVisit: v
            });
          }
        });

        // Sort target stores: visited first, then by name
        targetStoresList.sort((a, b) => {
          if (a.isVisited && !b.isVisited) return -1;
          if (!a.isVisited && b.isVisited) return 1;
          return a.namaToko.localeCompare(b.namaToko);
        });

        // Last visit time: ambil kunjungan terakhir (paling sore / akhir)
        let lastVisitTime = '-';
        if (crewVisits.length > 0) {
          const lastV = crewVisits[crewVisits.length - 1];
          lastVisitTime = lastV.jam || lastV.waktu || lastV.time || '-';
        }

        const totalUniqueVisited = crewVisits.length > 0 
          ? new Set(crewVisits.map(v => normKey(v.kodeToko) || normKey(v.namaToko)).filter(Boolean)).size 
          : 0;

        let targetCount = targetStoresList.length > 0 
          ? targetStoresList.length 
          : ((c.targetCount && c.targetCount > 0) ? c.targetCount : totalUniqueVisited);
        
        const visitedTargetCount = targetStoresList.filter(t => t.isVisited).length;
        const displayVisitedCount = visitedTargetCount > 0 ? visitedTargetCount : totalUniqueVisited;
        
        if (displayVisitedCount > targetCount) {
          targetCount = displayVisitedCount;
        }
        const remainingCount = Math.max(0, targetCount - displayVisitedCount);

        let statusBadge = c.statusBadge;
        let statusColor = c.statusColor;
        let rate = 0;

        if (c.isVisitDc) {
          rate = 100;
          statusBadge = totalUniqueVisited > 0 ? '🟢 Tuntas (Visit DC)' : '🏢 Tugas DC';
          statusColor = totalUniqueVisited > 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        } else if (targetCount > 0) {
          rate = Math.min(100, Math.round((displayVisitedCount / targetCount) * 100));
          if (displayVisitedCount >= targetCount) {
            statusBadge = '🟢 Tuntas 100%';
            statusColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
          } else if (displayVisitedCount > 0) {
            statusBadge = `🟡 Sisa ${remainingCount} Toko`;
            statusColor = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
          } else {
            statusBadge = `⚪ Belum Kunjungan (0/${targetCount})`;
            statusColor = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
          }
        } else {
          rate = 0;
          statusBadge = '🔴 Belum Input Jadwal';
          statusColor = 'bg-rose-500/10 text-rose-500 border-rose-500/20';
        }

        return {
          ...c,
          key: cKey,
          visitedCount: displayVisitedCount,
          targetCount: targetCount,
          remainingCount: remainingCount,
          rate: rate,
          statusBadge: statusBadge,
          statusColor: statusColor,
          visits: crewVisits,
          targetStoresList,
          extraVisits,
          lastVisitTime,
          absenInfo: crewAbsen ? {
            status: crewAbsen.status || 'HADIR',
            jamMasuk: crewAbsen.jamMasuk || crewAbsen.jam || '-',
            jamPulang: crewAbsen.jamPulang || '-',
            fotoMasuk: crewAbsen.fotoMasuk || crewAbsen.foto || null,
            catatan: crewAbsen.catatan || ''
          } : null
        };
      }).sort((a, b) => {
        // 1. Sort by rate descending (100% down to 0%)
        if (b.rate !== a.rate) {
          return b.rate - a.rate;
        }
        // 2. If rate is equal, sort by visited count descending
        if (b.visitedCount !== a.visitedCount) {
          return b.visitedCount - a.visitedCount;
        }
        // 3. If still equal, sort alphabetically by name
        return (a.namaCrew || '').localeCompare(b.namaCrew || '');
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

    analyticsTab: 'modul', // 'modul' | 'account' | 'trend'

    setAnalyticsTab(tab) {
      this.analyticsTab = tab;
      this.$nextTick(() => {
        this.refreshCharts();
      });
    },

    get totalPages() {
      return Math.max(1, Math.ceil(this.filteredVisits.length / this.itemsPerPage));
    },

    /**
     * Refresh All Chart Components
     */
    refreshCharts() {
      const isDark = this.theme === 'dark';
      const trendEl = document.getElementById('trend-chart');
      const modulEl = document.getElementById('modul-chart');
      const accountEl = document.getElementById('account-chart');

      if (trendEl) ChartService.renderTrendChart(trendEl, this.filteredVisits, isDark);
      if (modulEl) ChartService.renderModulComparisonChart(modulEl, this.filteredVisits, isDark);
      if (accountEl) ChartService.renderAccountShareChart(accountEl, this.filteredVisits, isDark);
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
      try {
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
        absenNoVisitList: absenNoVisit,
        visitNoAbsen: visitNoAbsen,
        visitNoAbsenList: visitNoAbsen,
        terlambatList: terlambatList,
        lupaPulangList: lupaPulangList,
        noOutList: lupaPulangList,
        izinList: izinList,
        sakitList: sakitList,
        cutiList: cutiList,
        izinSakitList: [...cutiList, ...sakitList, ...izinList],
        visitDcList: visitDcList,
        gpsIssueList: gpsIssueList,
        alphaList: alphaList,
        totalAnomalies: absenNoVisit.length + visitNoAbsen.length + terlambatList.length + gpsIssueList.length
      };
      } catch (err) {
        console.warn("⚠️ auditAnomalies calculation fallback:", err);
        return {
          totalRoster: 0,
          totalAbsenMasuk: 0,
          totalActiveVisit: 0,
          totalNormalVisit: 0,
          totalTerlambat: 0,
          totalTepatWaktu: 0,
          totalIzinSakit: 0,
          totalBelumAbsenMasuk: 0,
          totalAlpha: 0,
          absenNoVisit: [],
          absenNoVisitList: [],
          visitNoAbsen: [],
          visitNoAbsenList: [],
          terlambatList: [],
          lupaPulangList: [],
          noOutList: [],
          izinList: [],
          sakitList: [],
          cutiList: [],
          izinSakitList: [],
          visitDcList: [],
          gpsIssueList: [],
          alphaList: [],
          totalAnomalies: 0
        };
      }
    },

    /**
     * Getter: Analisis Trend Anomali Historis & Rekap Bulanan Lintas Seluruh Tanggal
     */
    get monthlyAnomalyAnalysis() {
      try {
        const allVisits = this.visits || [];
        const allAbsensi = this.absensi || [];
        const masterUsers = this.masterUser || [];
        
        const normKey = (str) => {
          if (!str) return '';
          return String(str).toUpperCase()
            .replace(/[\.\,\-\_\(\)\/]/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/SULISTIYO/g, 'SULISTIO')
            .trim();
        };

        const isDcRecord = (cat, st, toko) => {
          const combined = `${cat || ''} ${st || ''} ${toko || ''}`.toUpperCase();
          return /\bDC\b|KUNJUNGAN DC|VISIT DC|TUGAS DC|DC SAT|DC SERANG|DC LEBAK|DC PARUNG|DC JKT|DC CIREBON|OFFICE|KANTOR/i.test(combined);
        };

        const isZeroGps = (kStr) => {
          if (!kStr) return true;
          const s = String(kStr).trim().toLowerCase();
          if (s === '-' || s === '0' || s.includes('null') || s.includes('undefined') || s.includes('off') || s.includes('error')) return true;
          const parts = s.split(',').map(p => parseFloat(p.trim()));
          if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return true;
          if (Math.abs(parts[0]) < 0.0001 && Math.abs(parts[1]) < 0.0001) return true;
          return false;
        };

        // 1. Build roster map
        const rosterMap = new Map();
        const userPhoneMap = {};
        masterUsers.forEach(u => {
          const cleanN = normKey(u.nama);
          if (!cleanN) return;
          if (u.noWa) userPhoneMap[cleanN] = u.noWa;
          if (u.id) userPhoneMap[normKey(u.id)] = u.noWa;
          if (!rosterMap.has(cleanN)) {
            rosterMap.set(cleanN, {
              nama: (u.nama || '').trim(),
              id: (u.id || '').trim(),
              modul: (u.modul || this.getCrewOfficialModul(u.nama, '-')).toUpperCase().trim(),
              noWa: (u.noWa || '').trim()
            });
          }
        });

        // 2. Kumpulkan seluruh tanggal unik dalam dataset bulan ini
        const dateSet = new Set();
        allAbsensi.forEach(a => {
          const d = a.tanggal || a.dateIso;
          if (d && d.length >= 8) dateSet.add(d);
        });
        allVisits.forEach(v => {
          const d = v.dateIso || v.date;
          if (d && d.length >= 8) dateSet.add(d);
        });

        const sortedDates = Array.from(dateSet).sort();

        // 3. Kelompokkan record by Tanggal
        const absensiByDate = {};
        const visitsByDate = {};

        sortedDates.forEach(d => {
          absensiByDate[d] = [];
          visitsByDate[d] = [];
        });

        allAbsensi.forEach(a => {
          const d = a.tanggal || a.dateIso;
          if (d && absensiByDate[d]) absensiByDate[d].push(a);
        });

        allVisits.forEach(v => {
          const d = v.dateIso || v.date;
          if (d && visitsByDate[d]) visitsByDate[d].push(v);
        });

        // 4. Trend Series & MDS Anomaly Tracking
        const trendData = {
          dates: sortedDates,
          categories: {
            total: [],
            terlambat: [],
            absenNoVisit: [],
            visitNoAbsen: [],
            lupaPulang: [],
            gpsIssue: [],
            alpha: []
          }
        };

        const mdsAnomalyMap = new Map();

        // Inisialisasi master users ke map
        rosterMap.forEach((u, cleanN) => {
          mdsAnomalyMap.set(cleanN, {
            nama: u.nama,
            id: u.id,
            modul: u.modul,
            noWa: u.noWa || userPhoneMap[cleanN] || '',
            total: 0,
            terlambat: 0,
            absenNoVisit: 0,
            visitNoAbsen: 0,
            lupaPulang: 0,
            gpsIssue: 0,
            alpha: 0,
            incidentDates: new Set(),
            incidents: []
          });
        });

        let totalIncidentSum = 0;
        let catTotals = {
          terlambat: 0,
          absenNoVisit: 0,
          visitNoAbsen: 0,
          lupaPulang: 0,
          gpsIssue: 0,
          alpha: 0
        };

        sortedDates.forEach(d => {
          const dayAbsensi = absensiByDate[d] || [];
          const dayVisits = visitsByDate[d] || [];

          const dayMasukMap = {};
          const dayMasukKeys = new Set();
          const dayPulangKeys = new Set();
          const dayIzinKeys = new Set();
          const dayDcKeys = new Set();

          let dayTerlambat = 0;
          let dayGpsIssue = 0;

          dayAbsensi.forEach(a => {
            const rawName = (a.namaCrew || a.kodeCrew || '').trim();
            if (!rawName) return;
            const cleanN = normKey(rawName);
            const cleanId = normKey(a.kodeCrew);
            const st = (a.status || '').toUpperCase().trim() || 'MASUK';
            const w = (a.waktu || a.time || '').trim();
            const k = (a.koordinat || '').trim();

            if (!mdsAnomalyMap.has(cleanN)) {
              mdsAnomalyMap.set(cleanN, {
                nama: rawName,
                id: a.kodeCrew || '-',
                modul: (a._officialModul || this.getCrewOfficialModul(rawName, a.modul || '-')).toUpperCase().trim(),
                noWa: userPhoneMap[cleanN] || (cleanId ? userPhoneMap[cleanId] : '') || '',
                total: 0,
                terlambat: 0,
                absenNoVisit: 0,
                visitNoAbsen: 0,
                lupaPulang: 0,
                gpsIssue: 0,
                alpha: 0,
                incidentDates: new Set(),
                incidents: []
              });
            }

            const mdsEntry = mdsAnomalyMap.get(cleanN);

            // GPS Check
            if (isZeroGps(k)) {
              dayGpsIssue++;
              catTotals.gpsIssue++;
              mdsEntry.gpsIssue++;
              mdsEntry.total++;
              mdsEntry.incidentDates.add(d);
              mdsEntry.incidents.push({ date: d, type: 'GPS Issue (0,0)', detail: `Absen ${st} tanpa koordinat GPS` });
            }

            // DC Check
            if (isDcRecord(a.catatan, st, a.namaToko)) {
              if (cleanN) dayDcKeys.add(cleanN);
              if (cleanId) dayDcKeys.add(cleanId);
            }

            if (st === 'MASUK' || st === 'HADIR' || !st) {
              if (!dayMasukMap[cleanN]) {
                dayMasukMap[cleanN] = a;
                if (cleanN) dayMasukKeys.add(cleanN);
                if (cleanId) dayMasukKeys.add(cleanId);

                // Terlambat check (> 08:05)
                if (w) {
                  const parts = w.split(':').map(p => parseInt(p, 10));
                  if (parts.length >= 2) {
                    const min = parts[0] * 60 + parts[1];
                    if (min > 8 * 60 + 5) {
                      dayTerlambat++;
                      catTotals.terlambat++;
                      mdsEntry.terlambat++;
                      mdsEntry.total++;
                      mdsEntry.incidentDates.add(d);
                      mdsEntry.incidents.push({ date: d, type: 'Terlambat', detail: `Masuk ${w} (lewat ${min - 480} menit)` });
                    }
                  }
                }
              }
            } else if (st === 'PULANG') {
              if (cleanN) dayPulangKeys.add(cleanN);
              if (cleanId) dayPulangKeys.add(cleanId);
            } else {
              if (cleanN) dayIzinKeys.add(cleanN);
              if (cleanId) dayIzinKeys.add(cleanId);
            }
          });

          // Visits map
          const dayVisitMap = {};
          const dayVisitKeys = new Set();
          dayVisits.forEach(v => {
            const rawName = (v.namaCrew || v.kodeCrew || '').trim();
            if (!rawName) return;
            const cleanN = normKey(rawName);
            const cleanId = normKey(v.kodeCrew);
            if (cleanN) dayVisitKeys.add(cleanN);
            if (cleanId) dayVisitKeys.add(cleanId);
            dayVisitMap[cleanN] = (dayVisitMap[cleanN] || 0) + 1;

            if (!mdsAnomalyMap.has(cleanN)) {
              mdsAnomalyMap.set(cleanN, {
                nama: rawName,
                id: v.kodeCrew || '-',
                modul: (v._officialModul || this.getCrewOfficialModul(rawName, v.modul || v.prefix || '-')).toUpperCase().trim(),
                noWa: userPhoneMap[cleanN] || (cleanId ? userPhoneMap[cleanId] : '') || '',
                total: 0,
                terlambat: 0,
                absenNoVisit: 0,
                visitNoAbsen: 0,
                lupaPulang: 0,
                gpsIssue: 0,
                alpha: 0,
                incidentDates: new Set(),
                incidents: []
              });
            }
          });

          // Absen 0 Visit
          let dayAbsenNoVisit = 0;
          Object.keys(dayMasukMap).forEach(cleanN => {
            const cleanId = normKey(dayMasukMap[cleanN].kodeCrew);
            const isDc = dayDcKeys.has(cleanN) || (cleanId && dayDcKeys.has(cleanId));
            if (!isDc && (!dayVisitMap[cleanN] || dayVisitMap[cleanN] === 0)) {
              dayAbsenNoVisit++;
              catTotals.absenNoVisit++;
              const mdsEntry = mdsAnomalyMap.get(cleanN);
              if (mdsEntry) {
                mdsEntry.absenNoVisit++;
                mdsEntry.total++;
                mdsEntry.incidentDates.add(d);
                mdsEntry.incidents.push({ date: d, type: 'Absen 0 Visit', detail: `Absen masuk tercatat namun 0 toko dikunjungi` });
              }
            }
          });

          // Visit Belum Absen
          let dayVisitNoAbsen = 0;
          Object.keys(dayVisitMap).forEach(cleanN => {
            if (!dayMasukKeys.has(cleanN)) {
              dayVisitNoAbsen++;
              catTotals.visitNoAbsen++;
              const mdsEntry = mdsAnomalyMap.get(cleanN);
              if (mdsEntry) {
                mdsEntry.visitNoAbsen++;
                mdsEntry.total++;
                mdsEntry.incidentDates.add(d);
                mdsEntry.incidents.push({ date: d, type: 'Visit Tanpa Absen', detail: `${dayVisitMap[cleanN]} kunjungan tanpa absen masuk` });
              }
            }
          });

          // Lupa Pulang
          let dayLupaPulang = 0;
          Object.keys(dayMasukMap).forEach(cleanN => {
            if (!dayPulangKeys.has(cleanN)) {
              dayLupaPulang++;
              catTotals.lupaPulang++;
              const mdsEntry = mdsAnomalyMap.get(cleanN);
              if (mdsEntry) {
                mdsEntry.lupaPulang++;
                mdsEntry.total++;
                mdsEntry.incidentDates.add(d);
                mdsEntry.incidents.push({ date: d, type: 'Belum Tap Pulang', detail: `Absen masuk ada tapi belum tap pulang` });
              }
            }
          });

          // Alpha (Hanya dihitung pada hari operasional aktif)
          let dayAlpha = 0;
          if (dayVisits.length > 5 || dayAbsensi.length > 5) {
            rosterMap.forEach((u, cleanN) => {
              const cleanId = normKey(u.id);
              const hasMasuk = dayMasukKeys.has(cleanN) || (cleanId && dayMasukKeys.has(cleanId));
              const hasVisit = dayVisitKeys.has(cleanN) || (cleanId && dayVisitKeys.has(cleanId));
              const hasIzin = dayIzinKeys.has(cleanN) || (cleanId && dayIzinKeys.has(cleanId));

              if (!hasMasuk && !hasVisit && !hasIzin) {
                dayAlpha++;
                catTotals.alpha++;
                const mdsEntry = mdsAnomalyMap.get(cleanN);
                if (mdsEntry) {
                  mdsEntry.alpha++;
                  mdsEntry.total++;
                  mdsEntry.incidentDates.add(d);
                  mdsEntry.incidents.push({ date: d, type: 'Alpha', detail: `Tidak hadir tanpa keterangan izin/sakit/cuti` });
                }
              }
            });
          }

          const dayTotalAnomalies = dayTerlambat + dayAbsenNoVisit + dayVisitNoAbsen + dayLupaPulang + dayGpsIssue + dayAlpha;
          totalIncidentSum += dayTotalAnomalies;

          trendData.categories.total.push(dayTotalAnomalies);
          trendData.categories.terlambat.push(dayTerlambat);
          trendData.categories.absenNoVisit.push(dayAbsenNoVisit);
          trendData.categories.visitNoAbsen.push(dayVisitNoAbsen);
          trendData.categories.lupaPulang.push(dayLupaPulang);
          trendData.categories.gpsIssue.push(dayGpsIssue);
          trendData.categories.alpha.push(dayAlpha);
        });

        // Convert mdsAnomalyMap to sorted array (Leaderboard)
        const leaderboard = Array.from(mdsAnomalyMap.values())
          .map(item => ({
            ...item,
            activeDaysCount: item.incidentDates.size,
            riskLevel: item.total >= 6 ? 'KRITIS' : (item.total >= 3 ? 'PERINGATAN' : (item.total > 0 ? 'RINGAN' : 'DISIPLIN'))
          }))
          .sort((a, b) => b.total - a.total || b.activeDaysCount - a.activeDaysCount || a.nama.localeCompare(b.nama));

        // Find top most frequent category
        let topCategory = 'Terlambat';
        let maxCatVal = 0;
        Object.entries(catTotals).forEach(([k, v]) => {
          if (v > maxCatVal) {
            maxCatVal = v;
            topCategory = k === 'terlambat' ? '⏰ Terlambat' : (k === 'absenNoVisit' ? '🔴 Absen 0 Visit' : (k === 'visitNoAbsen' ? '🟡 Visit Tanpa Absen' : (k === 'lupaPulang' ? '🏠 Lupa Pulang' : (k === 'gpsIssue' ? '📍 GPS Issue' : '❓ Alpha'))));
          }
        });

        const topViolator = leaderboard.length > 0 && leaderboard[0].total > 0 ? leaderboard[0] : null;
        const avgDaily = sortedDates.length > 0 ? (totalIncidentSum / sortedDates.length).toFixed(1) : 0;

        return {
          trendData,
          leaderboard,
          catTotals,
          totalIncidentSum,
          topCategory,
          topViolator,
          avgDaily,
          totalDaysTracked: sortedDates.length
        };
      } catch (err) {
        console.warn("⚠️ monthlyAnomalyAnalysis error:", err);
        return {
          trendData: { dates: [], categories: { total: [], terlambat: [], absenNoVisit: [], visitNoAbsen: [], lupaPulang: [], gpsIssue: [], alpha: [] } },
          leaderboard: [],
          catTotals: { terlambat: 0, absenNoVisit: 0, visitNoAbsen: 0, lupaPulang: 0, gpsIssue: 0, alpha: 0 },
          totalIncidentSum: 0,
          topCategory: '-',
          topViolator: null,
          avgDaily: 0,
          totalDaysTracked: 0
        };
      }
    },

    get filteredAnomalyLeaderboard() {
      const data = this.monthlyAnomalyAnalysis.leaderboard || [];
      const modFilter = this.anomalyLeaderboardFilterModul || 'ALL';
      const search = (this.anomalyLeaderboardSearch || '').trim().toLowerCase();

      return data.filter(item => {
        if (modFilter !== 'ALL') {
          const m = (item.modul || '').toUpperCase();
          if (m !== modFilter && !m.startsWith(modFilter)) return false;
        }
        if (search) {
          const matchName = (item.nama || '').toLowerCase().includes(search);
          const matchCode = (item.id || '').toLowerCase().includes(search);
          const matchMod = (item.modul || '').toLowerCase().includes(search);
          if (!matchName && !matchCode && !matchMod) return false;
        }
        return true;
      });
    },

    get paginatedAnomalyLeaderboard() {
      const list = this.filteredAnomalyLeaderboard;
      const page = this.anomalyLeaderboardPage || 1;
      const size = this.anomalyLeaderboardPageSize || 10;
      if (size === 'ALL') return list;
      const start = (page - 1) * parseInt(size, 10);
      return list.slice(start, start + parseInt(size, 10));
    },

    get totalAnomalyLeaderboardPages() {
      const total = (this.filteredAnomalyLeaderboard || []).length;
      const size = this.anomalyLeaderboardPageSize || 10;
      if (size === 'ALL') return 1;
      return Math.max(1, Math.ceil(total / parseInt(size, 10)));
    },

    get anomalyLeaderboardTotalPages() {
      return this.totalAnomalyLeaderboardPages;
    },

    setAnomalyViewMode(mode) {
      this.anomalyViewMode = mode;
      if (mode === 'TREND') {
        this.$nextTick(() => {
          this.refreshAnomalyCharts();
          if (window.lucide) lucide.createIcons();
        });
      }
    },

    setAnomalyTrendCategory(cat) {
      this.anomalyTrendCategory = cat;
      this.$nextTick(() => {
        this.refreshAnomalyCharts();
      });
    },

    refreshAnomalyCharts() {
      if (typeof ChartService === 'undefined') return;
      const analysis = this.monthlyAnomalyAnalysis;
      const isDark = this.theme === 'dark';

      const trendCanvas = document.getElementById('anomaly-trend-canvas');
      if (trendCanvas && analysis.trendData) {
        ChartService.renderAnomalyTrendChart(trendCanvas, analysis.trendData, this.anomalyTrendCategory, isDark);
      }

      const pieCanvas = document.getElementById('anomaly-category-canvas');
      if (pieCanvas && analysis.catTotals) {
        ChartService.renderAnomalyCategoryChart(pieCanvas, analysis.catTotals, isDark);
      }
    },

    sendMdsAnomalyWarningWA(mdsItem) {
      if (!mdsItem) return;
      const phone = mdsItem.noWa;
      if (!phone) {
        alert(`Nomor WhatsApp untuk ${mdsItem.nama} belum terdaftar di database master.`);
        return;
      }
      const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^0/, '62');
      const text =
        `Halo rekan *${mdsItem.nama}* (${mdsItem.modul}),\n\n` +
        `Berikut adalah catatan evaluasi kedisiplinan & rekap anomali operasional Anda selama periode ini:\n` +
        `📊 *Total Pelanggaran/Anomali:* ${mdsItem.total} kali (Status: ${mdsItem.riskLevel})\n` +
        `• ⏰ Terlambat Masuk (> 08:00): ${mdsItem.terlambat}x\n` +
        `• 🔴 Absen Masuk tapi 0 Toko Dikunjungi: ${mdsItem.absenNoVisit}x\n` +
        `• 🟡 Kunjungan Toko tanpa Absen Masuk: ${mdsItem.visitNoAbsen}x\n` +
        `• 🏠 Lupa / Belum Tap Pulang: ${mdsItem.lupaPulang}x\n` +
        `• 📍 Absen Tanpa GPS Valid (0,0): ${mdsItem.gpsIssue}x\n` +
        `• ❓ Alpha (Tidak Hadir tanpa Izin/Sakit): ${mdsItem.alpha}x\n\n` +
        `Mohon segera tingkatkan kedisiplinan dan kepatuhan SOP operasional di lapangan. Terima kasih! 🙏`;

      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
    },

    /**
     * Anomaly Tab / View Controls (Centralized in Tab 5)
     */
    openAnomalyModal(subTab = null) {
      if (!this.checkTabAccess('laporan')) {
        return;
      }
      this.activeTab = 'laporan';
      this.setReportTabType('ANOMALY');
      if (subTab) {
        this.anomalyModal.activeTab = subTab;
      }
      this.anomalyModal.isOpen = false;
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
      this.$nextTick(() => {
        if (window.lucide) lucide.createIcons();
      });
    },

    sendWaReminder(crew, type) {
      return this.sendCrewWaReminder(crew, type);
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
     * Set active region for Tab 5 Reporting
     */
    setReportTabRegion(reg) {
      this.reportTab.selectedRegion = reg;
      this.waReportModal.selectedRegion = reg;
    },

    /**
     * Set active template format for Tab 5 Reporting
     */
    setReportTabType(type) {
      this.reportTab.reportType = type;
      this.waReportModal.reportType = type;
    },

    /**
     * Reactive Formatted Text for Tab 5 based on selected template
     */
    get activeReportText() {
      const type = this.reportTab.reportType || 'ROUTE_ONLY';
      if (type === 'ANOMALY') {
        return this.anomalyReportText;
      }
      if (type === 'REMINDER') {
        return this.reminderReportText;
      }
      return this.waFullReportText;
    },

    /**
     * Computed pending MDS list (< 100% target realization) for Follow-Up & Reminder
     */
    get reminderPendingCrewList() {
      const list = this.waReportList || [];
      return list.filter(c => c.status === 'ON_PROGRESS' || c.status === 'BELUM_JALAN' || c.status === 'BELUM_INPUT');
    },

    /**
     * Formatted WhatsApp Reminder / Follow-Up Broadcast
     */
    get reminderReportText() {
      const list = this.reminderPendingCrewList;
      const regStr = this.activeWaRegionName;
      const dateStr = this.activeDateLabel || 'Hari Ini';
      
      let text = `🔔 *PENGINGAT & FOLLOW-UP TARGET RUTE MDS*\n`;
      text += `🏢 *Grup Wilayah:* ${regStr}\n`;
      text += `📅 *Tanggal:* ${dateStr}\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

      if (list.length === 0) {
        text += `🎉 *SELAMAT!* Seluruh personil MDS pada grup wilayah ini telah *MENUNTASKAN 100%* target rute kunjungan toko hari ini. Pertahankan performa terbaik! 🚀\n\n`;
      } else {
        text += `⚠️ Diberitahukan kepada rekan-rekan MDS di bawah ini untuk segera menyelesaikan kunjungan toko rute terjadwal:\n\n`;
        
        const onProgress = list.filter(c => c.status === 'ON_PROGRESS');
        const belumJalan = list.filter(c => c.status === 'BELUM_JALAN');
        const belumInput = list.filter(c => c.status === 'BELUM_INPUT');

        if (onProgress.length > 0) {
          text += `🟡 *Sedang Berjalan / Belum Tuntas (${onProgress.length} MDS):*\n`;
          onProgress.forEach((c, i) => {
            const sisa = Math.max(0, (c.targetCount || 0) - (c.visitedCount || 0));
            text += `${i + 1}. *${c.namaCrew}* (${c.modul}): ${c.visitedCount}/${c.targetCount} Toko (Sisa ${sisa} Toko)\n`;
          });
          text += `\n`;
        }

        if (belumJalan.length > 0) {
          text += `🔴 *Belum Ada Kunjungan / 0 Toko (${belumJalan.length} MDS):*\n`;
          belumJalan.forEach((c, i) => {
            text += `${i + 1}. *${c.namaCrew}* (${c.modul}) - Target: ${c.targetCount} Toko\n`;
          });
          text += `\n`;
        }

        if (belumInput.length > 0) {
          text += `⚪ *Belum Ada Jadwal Terinput (${belumInput.length} MDS):*\n`;
          belumInput.forEach((c, i) => {
            text += `${i + 1}. *${c.namaCrew}* (${c.modul})\n`;
          });
          text += `\n`;
        }

        text += `Mohon segera perbarui absensi check-in / check-out toko dan unggah dokumentasi foto sebelum batas jam operasional berakhir.\n\n`;
      }

      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `Semangat & tetap utamakan keselamatan kerja. Terimakasih!`;
      return text;
    },

    /**
     * Copy Active Tab 5 Report Text to Clipboard
     */
    copyReportTabText() {
      const text = this.activeReportText;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          this.reportTab.textCopiedSuccess = true;
          setTimeout(() => { this.reportTab.textCopiedSuccess = false; }, 3500);
        });
      }
    },

    /**
     * Direct Share Active Tab 5 Report Text to WhatsApp
     */
    shareReportTabWhatsApp() {
      const text = this.activeReportText;
      const encoded = encodeURIComponent(text);
      if (navigator.share) {
        navigator.share({
          title: `Laporan Realisasi MDS - ${this.activeWaRegionName}`,
          text: text
        }).catch(() => {
          window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
        });
      } else {
        window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
      }
    },

    /**
     * Direct Send Personal WhatsApp Follow-Up to Specific Crew
     */
    sendDirectCrewReminder(crew) {
      if (!crew) return;
      const cleanPhone = (crew.telepon || crew.phone || '').replace(/[^0-9]/g, '');
      const sisa = Math.max(0, (crew.targetCount || 0) - (crew.visitedCount || 0));
      let msg = `Halo rekan ${crew.namaCrew},\n\n`;
      msg += `Mengingatkan untuk target kunjungan rute hari ini di ${crew.modul}:\n`;
      msg += `🎯 Realisasi saat ini: ${crew.visitedCount}/${crew.targetCount} toko (Sisa ${sisa} toko lagi).\n\n`;
      msg += `Mohon segera diselesaikan dan upload foto display sebelum jam operasional selesai. Tetap semangat & jaga keselamatan!`;
      
      const encoded = encodeURIComponent(msg);
      if (cleanPhone) {
        window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`, '_blank');
      } else {
        window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
      }
    },

    /**
     * Export Infographic Image (Copy to Clipboard or Download PNG)
     */
    async exportReportInfographic(mode = 'copy') {
      const cardEl = document.getElementById('report-tab-infographic-card') || document.getElementById('wa-infographic-card');
      if (!cardEl) {
        alert('Komponen kartu infografis tidak ditemukan di halaman.');
        return;
      }
      if (!window.html2canvas) {
        alert('Library html2canvas sedang dimuat, silakan coba sesaat lagi.');
        return;
      }

      this.reportTab.imageCopiedSuccess = false;
      this.reportTab.imageDownloadedSuccess = false;

      try {
        const canvas = await html2canvas(cardEl, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          width: cardEl.offsetWidth || 620,
          windowWidth: 1024
        });

        if (mode === 'download') {
          const imgUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `Infografis_MDS_${this.reportTab.selectedRegion}_${new Date().toISOString().slice(0,10)}.png`;
          link.href = imgUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          this.reportTab.imageDownloadedSuccess = true;
          setTimeout(() => { this.reportTab.imageDownloadedSuccess = false; }, 3500);
        } else {
          canvas.toBlob(async (blob) => {
            if (blob && navigator.clipboard && navigator.clipboard.write) {
              try {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                this.reportTab.imageCopiedSuccess = true;
                setTimeout(() => { this.reportTab.imageCopiedSuccess = false; }, 3500);
              } catch (clipErr) {
                // Fallback download if clipboard restricted
                const imgUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `Infografis_MDS_${this.reportTab.selectedRegion}_${new Date().toISOString().slice(0,10)}.png`;
                link.href = imgUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                this.reportTab.imageDownloadedSuccess = true;
                setTimeout(() => { this.reportTab.imageDownloadedSuccess = false; }, 3500);
              }
            }
          }, 'image/png');
        }
      } catch (err) {
        console.error('Error export infographic:', err);
        alert('Gagal membuat gambar: ' + err.message);
      }
    },

    /**
     * ==============================================================================
     * PUSAT LAPORAN - MULTI-DIMENSIONAL ANALYTICS TABLE ENGINE (TABEL ANALISA)
     * ==============================================================================
     */

    /**
     * Switch SubTab in Analytics Table
     */
    setReportTableSubTab(tab) {
      if (!this.canAccessSubTab('laporan', tab)) {
        this.unauthorizedTargetTab = `Laporan: Sub-Tab ${String(tab).toUpperCase()}`;
        this.unauthorizedAttemptTab = this.unauthorizedTargetTab;
        this.unauthorizedModalOpen = true;
        return;
      }
      this.reportTableSubTab = tab;
      this.reportTableFilter.page = 1;
      this.reportTableFilter.statusCategory = 'ALL';
      this.$nextTick(() => {
        if (window.lucide) lucide.createIcons();
      });
    },

    /**
     * Column Sorter for Analytics Tables
     */
    sortReportTable(col) {
      if (this.reportTableFilter.sortCol === col) {
        this.reportTableFilter.sortAsc = !this.reportTableFilter.sortAsc;
      } else {
        this.reportTableFilter.sortCol = col;
        this.reportTableFilter.sortAsc = true;
      }
      this.reportTableFilter.page = 1;
    },

    /**
     * Handle Date Filter Change for Report Table
     */
    onReportDateFilterChange() {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayIso = `${yyyy}-${mm}-${dd}`;

      const f = this.reportTableFilter;

      if (f.dateFilter === 'TODAY') {
        f.startDate = todayIso;
        f.endDate = todayIso;
      } else if (f.dateFilter === 'YESTERDAY') {
        const yDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const y_yyyy = yDate.getFullYear();
        const y_mm = String(yDate.getMonth() + 1).padStart(2, '0');
        const y_dd = String(yDate.getDate()).padStart(2, '0');
        f.startDate = `${y_yyyy}-${y_mm}-${y_dd}`;
        f.endDate = `${y_yyyy}-${y_mm}-${y_dd}`;
      } else if (f.dateFilter === '7_DAYS') {
        const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        f.startDate = past7.toISOString().split('T')[0];
        f.endDate = todayIso;
      } else if (f.dateFilter === 'THIS_MONTH') {
        f.startDate = `${yyyy}-${mm}-01`;
        f.endDate = todayIso;
      } else if (f.dateFilter === 'LATEST_DAY') {
        f.startDate = '';
        f.endDate = '';
      } else if (f.dateFilter === 'CUSTOM') {
        f.customStartInput = f.startDate || todayIso;
        f.customEndInput = f.endDate || todayIso;
        return;
      }

      f.page = 1;
      this.$nextTick(() => {
        if (window.lucide) lucide.createIcons();
      });
    },

    /**
     * Apply Custom Date Range for Report Table
     */
    applyReportCustomDates() {
      const f = this.reportTableFilter;
      if (!f.customStartInput || !f.customEndInput) {
        alert('Mohon pilih tanggal awal dan tanggal akhir terlebih dahulu.');
        return;
      }
      if (f.customStartInput > f.customEndInput) {
        alert(`⚠️ Tanggal Awal (${f.customStartInput}) tidak boleh melebihi Tanggal Akhir (${f.customEndInput})!`);
        f.customEndInput = f.customStartInput;
      }
      f.startDate = f.customStartInput;
      f.endDate = f.customEndInput;
      f.page = 1;
      this.$nextTick(() => {
        if (window.lucide) lucide.createIcons();
      });
    },

    /**
     * Apply Search Query for Report Table
     */
    applyReportSearch() {
      const f = this.reportTableFilter;
      f.searchQuery = (f.searchInput || '').trim();
      f.page = 1;
      this.$nextTick(() => {
        if (window.lucide) lucide.createIcons();
      });
    },

    /**
     * Clear Search Query for Report Table
     */
    clearReportSearch() {
      const f = this.reportTableFilter;
      f.searchInput = '';
      f.searchQuery = '';
      f.page = 1;
      this.$nextTick(() => {
        if (window.lucide) lucide.createIcons();
      });
    },

    /**
     * Active Date Label for Report Table
     */
    get reportActiveDateLabel() {
      const f = this.reportTableFilter;
      const dFilter = f.dateFilter || 'LATEST_DAY';

      if (dFilter === 'LATEST_DAY') {
        const latestIso = (this.visits && this.visits.length > 0 && this.visits[0] && this.visits[0]._iso)
          ? this.visits[0]._iso
          : (this.absensi && this.absensi.length > 0 && this.absensi[0] ? (this.absensi[0]._iso || this.normalizeIsoDate(this.absensi[0].tanggal)) : '');
        return latestIso ? `Data Terkini (${this.formatIndoDate(latestIso)})` : 'Data Terkini';
      }
      if (dFilter === 'TODAY') {
        return `Hari Ini (${this.formatIndoDate(this.getTodayIso())})`;
      }
      if (dFilter === 'YESTERDAY') {
        return `Kemarin (${this.formatIndoDate(this.getYesterdayIso())})`;
      }
      if (dFilter === '7_DAYS') {
        return `7 Hari Terakhir (${f.startDate} s/d ${f.endDate})`;
      }
      if (dFilter === 'THIS_MONTH') {
        return `Bulan Ini (${f.startDate} s/d ${f.endDate})`;
      }
      if (dFilter === 'CUSTOM') {
        return `${f.startDate} s/d ${f.endDate}`;
      }
      return 'Semua Periode';
    },

    /**
     * Filtered Visits Scoped for Pusat Laporan Date Range
     */
    get reportFilteredVisits() {
      let data = this.visits;
      if (!data || data.length === 0) return [];

      const f = this.reportTableFilter;
      const dFilter = f.dateFilter || 'LATEST_DAY';

      if (dFilter === 'LATEST_DAY') {
        const first = data[0];
        const latestIso = first ? (first._iso || this.normalizeIsoDate(first.dateIso || first.date || first.tanggal)) : null;
        if (latestIso) {
          data = data.filter(v => v && (v._iso || this.normalizeIsoDate(v.dateIso || v.date || v.tanggal)) === latestIso);
        }
      } else if (dFilter === 'TODAY') {
        const todayIso = f.startDate || this.getTodayIso();
        data = data.filter(v => v && (v._iso || this.normalizeIsoDate(v.dateIso || v.date || v.tanggal)) === todayIso);
      } else if (dFilter === 'YESTERDAY') {
        const yIso = f.startDate || this.getYesterdayIso();
        data = data.filter(v => v && (v._iso || this.normalizeIsoDate(v.dateIso || v.date || v.tanggal)) === yIso);
      } else if ((dFilter === '7_DAYS' || dFilter === 'THIS_MONTH') && f.startDate && f.endDate) {
        data = data.filter(v => {
          if (!v) return false;
          const vIso = v._iso || this.normalizeIsoDate(v.dateIso || v.date || v.tanggal);
          return vIso && vIso >= f.startDate && vIso <= f.endDate;
        });
      } else if (dFilter === 'CUSTOM') {
        if (f.startDate && f.endDate) {
          data = data.filter(v => {
            if (!v) return false;
            const vIso = v._iso || this.normalizeIsoDate(v.dateIso || v.date || v.tanggal);
            return vIso && vIso >= f.startDate && vIso <= f.endDate;
          });
        } else {
          const first = data[0];
          const latestIso = first ? (first._iso || this.normalizeIsoDate(first.dateIso || first.date || first.tanggal)) : null;
          if (latestIso) {
            data = data.filter(v => v && (v._iso || this.normalizeIsoDate(v.dateIso || v.date || v.tanggal)) === latestIso);
          }
        }
      }

      return data;
    },

    /**
     * Filtered Absensi Scoped for Pusat Laporan Date Range
     */
    get reportFilteredAbsensi() {
      let data = this.absensi;
      if (!data || data.length === 0) return [];

      const f = this.reportTableFilter;
      const dFilter = f.dateFilter || 'LATEST_DAY';

      if (dFilter === 'LATEST_DAY') {
        const firstVisit = (this.visits && this.visits.length > 0) ? this.visits[0] : null;
        const firstData = (data && data.length > 0) ? data[0] : null;
        const latestIso = (firstVisit && firstVisit._iso)
          ? firstVisit._iso
          : (firstData ? (firstData._iso || this.normalizeIsoDate(firstData.tanggal || firstData.dateIso || firstData.date)) : null);
        if (latestIso) {
          data = data.filter(a => a && (a._iso || this.normalizeIsoDate(a.tanggal || a.dateIso || a.date)) === latestIso);
        }
      } else if (dFilter === 'TODAY') {
        const todayIso = f.startDate || this.getTodayIso();
        data = data.filter(a => a && (a._iso || this.normalizeIsoDate(a.tanggal || a.dateIso || a.date)) === todayIso);
      } else if (dFilter === 'YESTERDAY') {
        const yIso = f.startDate || this.getYesterdayIso();
        data = data.filter(a => a && (a._iso || this.normalizeIsoDate(a.tanggal || a.dateIso || a.date)) === yIso);
      } else if ((dFilter === 'CUSTOM' || dFilter === '7_DAYS' || dFilter === 'THIS_MONTH') && f.startDate && f.endDate) {
        data = data.filter(a => {
          if (!a) return false;
          const aIso = a._iso || this.normalizeIsoDate(a.tanggal || a.dateIso || a.date);
          return aIso && aIso >= f.startDate && aIso <= f.endDate;
        });
      }

      return data;
    },

    /**
     * Computed Daily Consolidated Absensi Scoped for Report Table
     */
    get reportGroupedAbsensi() {
      const raw = this.reportFilteredAbsensi || [];
      if (raw.length === 0) return [];

      const map = new Map();

      raw.forEach(a => {
        const iso = a._iso || this.normalizeIsoDate(a.tanggal || a.dateIso || a.date);
        const crewName = (a.namaCrew || '').trim();
        const crewCode = (a.kodeCrew || '').trim();
        if (!iso || !crewName) return;

        const key = `${iso}_${crewName.toUpperCase()}`;

        if (!map.has(key)) {
          map.set(key, {
            key: key,
            tanggal: a.tanggal || iso,
            iso: iso,
            modul: a._officialModul || this.getCrewOfficialModul(crewName, a.modul) || a.modul || '',
            namaCrew: crewName,
            kodeCrew: crewCode,
            namaToko: a.namaToko || '',
            masuk: null,
            pulang: null,
            otherLogs: [],
            durasiKerja: '-'
          });
        }

        const entry = map.get(key);
        const statusUpper = (a.status || '').toUpperCase().trim();

        if (statusUpper.includes('MASUK') || statusUpper.includes('HADIR') || statusUpper.includes('IN')) {
          if (!entry.masuk || (a.waktu && a.waktu < entry.masuk.waktu)) {
            entry.masuk = a;
          }
        } else if (statusUpper.includes('PULANG') || statusUpper.includes('OUT')) {
          if (!entry.pulang || (a.waktu && a.waktu > entry.pulang.waktu)) {
            entry.pulang = a;
          }
        } else {
          entry.otherLogs.push(a);
        }
      });

      return Array.from(map.values()).map(entry => {
        let durasiStr = '-';
        if (entry.masuk && entry.pulang && entry.masuk.waktu && entry.pulang.waktu) {
          const tMasuk = String(entry.masuk.waktu).split(':');
          const tPulang = String(entry.pulang.waktu).split(':');
          if (tMasuk.length >= 2 && tPulang.length >= 2) {
            const minMasuk = parseInt(tMasuk[0], 10) * 60 + parseInt(tMasuk[1], 10);
            const minPulang = parseInt(tPulang[0], 10) * 60 + parseInt(tPulang[1], 10);
            const diffMin = minPulang - minMasuk;
            if (diffMin > 0) {
              const h = Math.floor(diffMin / 60);
              const m = diffMin % 60;
              durasiStr = `${h}j ${m > 0 ? m + 'm' : ''}`.trim();
            }
          }
        } else if (entry.masuk && !entry.pulang) {
          durasiStr = 'Sedang Bertugas';
        }
        return { ...entry, durasiKerja: durasiStr };
      });
    },

    /**
     * Computed Compliance Scoped for Report Active Date Range
     */
    get reportComplianceList() {
      const normKey = (str) => {
        if (!str) return '';
        return String(str).toUpperCase()
          .replace(/[\.\,\-\_\(\)\/]/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/SULISTIYO/g, 'SULISTIO')
          .trim();
      };

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
            allRoutes: new Set(),
            targetStores: new Set(),
            allStores: new Set(),
            visitedStores: new Set(),
            totalVisits: 0
          };
        }
        if (cleanName) idToKeyMap[cleanName] = key;
        if (cleanId) idToKeyMap[cleanId] = key;
      });

      const findOfficialCrew = (rawName, rawId) => {
        const cleanName = normKey(rawName);
        const cleanId = normKey(rawId);
        const key = (cleanName && idToKeyMap[cleanName]) || (cleanId && idToKeyMap[cleanId]) || null;
        return key && crewMap[key] ? crewMap[key] : null;
      };

      // Pass 1: Collect all assigned routes for each official crew
      this.masterToko.forEach(m => {
        const crewObj = findOfficialCrew(m.namaCrew, m.kodeCrew);
        if (!crewObj) return;
        if (m.rute) crewObj.allRoutes.add(String(m.rute).trim().toUpperCase());
      });

      // Pass 2: Map Target Stores based on crew's specific schedule pattern
      const targetDate = this.getActiveTargetDate();
      this.masterToko.forEach(m => {
        const crewObj = findOfficialCrew(m.namaCrew, m.kodeCrew);
        if (!crewObj) return;

        const storeKey = normKey(m.kodeToko) || normKey(m.namaToko);
        if (storeKey) {
          crewObj.allStores.add(storeKey);
          const ruteStr = String(m.rute || '').toUpperCase().trim();
          const crewTargetRoutes = this.getCrewTargetRouteSet(crewObj.allRoutes, targetDate);
          if (this.isRouteMatched(ruteStr, crewTargetRoutes)) {
            crewObj.targetStores.add(storeKey);
          }
        }
      });

      (this.reportFilteredVisits || []).forEach(v => {
        const crewObj = findOfficialCrew(v.namaCrew, v.kodeCrew);
        if (!crewObj) return;

        crewObj.totalVisits++;
        const visitStoreKey = normKey(v.kodeToko) || normKey(v.namaToko);
        if (visitStoreKey) crewObj.visitedStores.add(visitStoreKey);
      });

      return Object.values(crewMap).map(c => {
        const targetCount = c.targetStores.size;
        const visitedCount = c.visitedStores.size;
        const allStoreCount = c.allStores.size;
        const achievementRate = targetCount > 0 ? Math.min(100, Math.round((visitedCount / targetCount) * 100)) : (visitedCount > 0 ? 100 : 0);

        let status = 'OFF_SCHEDULE';
        if (allStoreCount === 0) {
          status = 'BELUM_INPUT';
        } else if (targetCount > 0) {
          if (visitedCount >= targetCount) status = 'TUNTAS';
          else if (visitedCount > 0) status = 'ON_PROGRESS';
          else status = 'BELUM_JALAN';
        } else if (visitedCount > 0) {
          status = 'ON_PROGRESS';
        }

        return {
          namaCrew: c.namaCrew,
          kodeCrew: c.kodeCrew,
          modul: c.modul,
          targetCount,
          visitedCount,
          totalVisits: c.totalVisits,
          achievementRate,
          status,
          isDc: false
        };
      });
    },

    /**
     * Map Modul Prefix to Group Region
     */
    getRegionFromModul(modulStr) {
      const m = (modulStr || '').toUpperCase().trim();
      if (m.startsWith('DK') || m.includes('JABODETABEK')) return 'JABODETABEK';
      if (m === 'LK1' || m === 'LK2' || m.includes('JABAR') || m.includes('BANDUNG') || m.includes('BOGOR') || m.includes('CIREBON')) return 'JABAR';
      if (m === 'LK3' || m.includes('JATENG') || m.includes('SEMARANG') || m.includes('SOLO') || m.includes('JOGJA') || m.includes('DIY')) return 'JATENG';
      if (m === 'LK4' || m === 'LK5' || m.includes('JATIM') || m.includes('SURABAYA') || m.includes('BALI') || m.includes('NUSRA') || m.includes('MALANG')) return 'JATIM_BALI';
      if (m.startsWith('LP') || m.includes('SUMATERA') || m.includes('KALIMANTAN') || m.includes('SULAWESI') || m.includes('MEDAN') || m.includes('MAKASSAR') || m.includes('PALEMBANG')) return 'LUAR_JAWA';
      return 'ALL';
    },

    /**
     * 1. DATASET: Analisis Realisasi Rute
     */
    get analysisRouteTableData() {
      let list = this.reportComplianceList || [];
      const query = (this.reportTableFilter.searchQuery || '').toLowerCase().trim();
      const reg = this.reportTableFilter.region;
      const statusCat = this.reportTableFilter.statusCategory;

      // Filter by Region
      if (reg && reg !== 'ALL') {
        list = list.filter(c => this.getRegionFromModul(c.modul) === reg);
      }

      // Filter by Status Category
      if (statusCat && statusCat !== 'ALL') {
        list = list.filter(c => c.status === statusCat);
      }

      // Filter by Search Query
      if (query) {
        list = list.filter(c => 
          (c.namaCrew || '').toLowerCase().includes(query) ||
          (c.kodeCrew || '').toLowerCase().includes(query) ||
          (c.modul || '').toLowerCase().includes(query)
        );
      }

      // Sort
      const col = this.reportTableFilter.sortCol || 'namaCrew';
      const asc = this.reportTableFilter.sortAsc;

      return [...list].sort((a, b) => {
        let valA = a[col] ?? '';
        let valB = b[col] ?? '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
      });
    },

    /**
     * Summary Metrics for Route Analysis Table
     */
    get analysisRouteSummary() {
      const data = this.analysisRouteTableData;
      const totalCrew = data.length;
      const totalTarget = data.reduce((acc, c) => acc + (c.targetCount || 0), 0);
      const totalVisited = data.reduce((acc, c) => acc + (c.visitedCount || 0), 0);
      const tuntasCount = data.filter(c => c.status === 'TUNTAS').length;
      const onProgressCount = data.filter(c => c.status === 'ON_PROGRESS').length;
      const belumJalanCount = data.filter(c => c.status === 'BELUM_JALAN' || c.status === 'BELUM_INPUT').length;
      const avgAchievement = totalTarget > 0 ? Math.min(100, Math.round((totalVisited / totalTarget) * 100)) : (totalVisited > 0 ? 100 : 0);

      return { totalCrew, totalTarget, totalVisited, tuntasCount, onProgressCount, belumJalanCount, avgAchievement };
    },

    /**
     * 2. DATASET: Analisis Input Jadwal & Coverage Rute
     */
    get analysisScheduleTableData() {
      const normKey = (str) => {
        if (!str) return '';
        return String(str).toUpperCase()
          .replace(/[\.\,\-\_\(\)\/]/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/SULISTIYO/g, 'SULISTIO')
          .trim();
      };

      // Map stores assigned per crew from masterToko
      const crewStoreMap = {};
      (this.masterToko || []).forEach(m => {
        const rawName = m.namaCrew || '';
        const cleanName = normKey(rawName);
        const cleanId = normKey(m.kodeCrew);
        const key = cleanName || cleanId;
        if (!key) return;

        if (!crewStoreMap[key]) {
          crewStoreMap[key] = {
            stores: new Set(),
            routes: new Set(),
            accounts: new Set(),
            accountCounts: {}
          };
        }
        const storeKey = normKey(m.kodeToko) || normKey(m.namaToko);
        if (storeKey) crewStoreMap[key].stores.add(storeKey);
        if (m.rute) crewStoreMap[key].routes.add(String(m.rute).trim());
        if (m.account) {
          const acc = m.account.toUpperCase().trim();
          crewStoreMap[key].accounts.add(acc);
          crewStoreMap[key].accountCounts[acc] = (crewStoreMap[key].accountCounts[acc] || 0) + 1;
        }
      });

      // Today route target helper
      const routeMatchSet = this.getActiveRouteMatchList();
      const todayTargetMap = {};
      (this.masterToko || []).forEach(m => {
        const cleanName = normKey(m.namaCrew);
        const cleanId = normKey(m.kodeCrew);
        const key = cleanName || cleanId;
        const storeKey = normKey(m.kodeToko) || normKey(m.namaToko);
        if (!key || !storeKey) return;
        const ruteStr = String(m.rute || '').toUpperCase().trim();
        if (this.isRouteMatched(ruteStr, routeMatchSet)) {
          if (!todayTargetMap[key]) todayTargetMap[key] = new Set();
          todayTargetMap[key].add(storeKey);
        }
      });

      // Map each official masterUser
      let list = (this.masterUser || []).map(u => {
        const rawName = u.nama || '';
        const rawId = u.id || '';
        const cleanName = normKey(rawName);
        const cleanId = normKey(rawId);
        const key = cleanName || cleanId;
        const sInfo = crewStoreMap[key] || { stores: new Set(), routes: new Set(), accounts: new Set(), accountCounts: {} };
        const totalStores = sInfo.stores.size;
        const uniqueRoutes = sInfo.routes.size;
        const avgPerRoute = uniqueRoutes > 0 ? (totalStores / uniqueRoutes).toFixed(1) : '0';
        const todayTarget = (todayTargetMap[key] ? todayTargetMap[key].size : 0);

        let inputStatus = 'BELUM_INPUT';
        let statusLabel = 'Belum Input Jadwal';
        if (totalStores >= 15) {
          inputStatus = 'LENGKAP';
          statusLabel = 'Jadwal Lengkap';
        } else if (totalStores > 0) {
          inputStatus = 'PARSIAL';
          statusLabel = 'Input Sebagian';
        }

        const topAccounts = Object.entries(sInfo.accountCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([acc, cnt]) => `${acc} (${cnt})`)
          .join(', ') || '-';

        return {
          namaCrew: rawName,
          kodeCrew: rawId || '-',
          modul: u.modul || this.getCrewOfficialModul(rawName, '-'),
          regional: this.getRegionFromModul(u.modul),
          telepon: u.telepon || u.phone || '',
          totalStores,
          uniqueRoutes,
          avgPerRoute,
          todayTarget,
          inputStatus,
          statusLabel,
          topAccounts
        };
      });

      // Filter by Region
      const reg = this.reportTableFilter.region;
      if (reg && reg !== 'ALL') {
        list = list.filter(c => c.regional === reg);
      }

      // Filter by Status Category
      const statusCat = this.reportTableFilter.statusCategory;
      if (statusCat && statusCat !== 'ALL') {
        list = list.filter(c => c.inputStatus === statusCat);
      }

      // Filter by Search Query
      const query = (this.reportTableFilter.searchQuery || '').toLowerCase().trim();
      if (query) {
        list = list.filter(c => 
          (c.namaCrew || '').toLowerCase().includes(query) ||
          (c.kodeCrew || '').toLowerCase().includes(query) ||
          (c.modul || '').toLowerCase().includes(query) ||
          (c.topAccounts || '').toLowerCase().includes(query)
        );
      }

      // Sort
      const col = this.reportTableFilter.sortCol || 'namaCrew';
      const asc = this.reportTableFilter.sortAsc;

      return list.sort((a, b) => {
        let valA = a[col] ?? '';
        let valB = b[col] ?? '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
      });
    },

    /**
     * Summary Metrics for Schedule Analysis Table
     */
    get analysisScheduleSummary() {
      const data = this.analysisScheduleTableData;
      const totalCrew = data.length;
      const lengkapCount = data.filter(c => c.inputStatus === 'LENGKAP').length;
      const parsialCount = data.filter(c => c.inputStatus === 'PARSIAL').length;
      const belumInputCount = data.filter(c => c.inputStatus === 'BELUM_INPUT').length;
      const totalStoresPlot = data.reduce((acc, c) => acc + c.totalStores, 0);
      const avgStores = totalCrew > 0 ? (totalStoresPlot / totalCrew).toFixed(1) : 0;

      return { totalCrew, lengkapCount, parsialCount, belumInputCount, totalStoresPlot, avgStores };
    },

    /**
     * 3. DATASET: Analisis Rekap Absensi Tim
     */
    get analysisAttendanceTableData() {
      let list = (this.reportGroupedAbsensi || []).map(g => {
        const masukWaktu = g.masuk ? g.masuk.waktu : '-';
        const pulangWaktu = g.pulang ? g.pulang.waktu : '-';
        
        let statusMasuk = 'TIDAK_ABSEN';
        let lateMin = 0;
        if (g.masuk && g.masuk.waktu) {
          const parts = String(g.masuk.waktu).split(':');
          if (parts.length >= 2) {
            const min = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
            if (min > 8 * 60) {
              statusMasuk = 'TERLAMBAT';
              lateMin = min - 480;
            } else {
              statusMasuk = 'TEPAT_WAKTU';
            }
          }
        }

        let kehadiranCat = 'HADIR_LENGKAP';
        if (g.masuk && !g.pulang) kehadiranCat = 'HADIR_MASUK_ONLY';
        else if (!g.masuk && g.pulang) kehadiranCat = 'HADIR_PULANG_ONLY';
        else if (!g.masuk && !g.pulang) kehadiranCat = 'ALPHA';

        const otherText = (g.otherLogs || []).map(o => `${o.status || ''} ${o.catatan || ''}`).join(' ').toUpperCase();
        if (otherText.includes('SAKIT')) kehadiranCat = 'SAKIT';
        else if (otherText.includes('IZIN')) kehadiranCat = 'IZIN';
        else if (otherText.includes('CUTI')) kehadiranCat = 'CUTI';
        else if (otherText.includes('DC')) kehadiranCat = 'VISIT_DC';

        const rawCatatan = (g.masuk && g.masuk.catatan) || (g.pulang && g.pulang.catatan) || (g.otherLogs && g.otherLogs[0] && g.otherLogs[0].catatan) || '-';

        const latMasuk = g.masuk ? (g.masuk.lat || g.masuk.latitude) : null;
        const lngMasuk = g.masuk ? (g.masuk.lng || g.masuk.longitude) : null;
        const outOfRadius = g.masuk ? (g.masuk.outOfRadius || g.masuk.isOutOfRadius || (g.masuk.distance && g.masuk.distance > 100)) : false;

        return {
          key: g.key,
          tanggal: g.tanggal,
          iso: g.iso,
          namaCrew: g.namaCrew,
          kodeCrew: g.kodeCrew,
          modul: g.modul,
          regional: this.getRegionFromModul(g.modul),
          masukWaktu,
          pulangWaktu,
          durasiKerja: g.durasiKerja || '-',
          statusMasuk,
          lateMin,
          kehadiranCat,
          outOfRadius,
          hasCoords: !!(latMasuk && lngMasuk),
          lat: latMasuk,
          lng: lngMasuk,
          fotoMasuk: g.masuk ? (g.masuk.foto || g.masuk.fotoSelfie) : null,
          fotoPulang: g.pulang ? (g.pulang.foto || g.pulang.fotoSelfie) : null,
          catatan: rawCatatan
        };
      });

      // Filter by Region
      const reg = this.reportTableFilter.region;
      if (reg && reg !== 'ALL') {
        list = list.filter(c => c.regional === reg);
      }

      // Filter by Status Category
      const statusCat = this.reportTableFilter.statusCategory;
      if (statusCat && statusCat !== 'ALL') {
        if (statusCat === 'TEPAT_WAKTU') list = list.filter(c => c.statusMasuk === 'TEPAT_WAKTU');
        else if (statusCat === 'TERLAMBAT') list = list.filter(c => c.statusMasuk === 'TERLAMBAT');
        else if (statusCat === 'HADIR_MASUK_ONLY') list = list.filter(c => c.kehadiranCat === 'HADIR_MASUK_ONLY');
        else if (statusCat === 'IZIN_SAKIT') list = list.filter(c => c.kehadiranCat === 'IZIN' || c.kehadiranCat === 'SAKIT' || c.kehadiranCat === 'CUTI' || c.kehadiranCat === 'VISIT_DC');
        else if (statusCat === 'ALPHA') list = list.filter(c => c.kehadiranCat === 'ALPHA');
        else if (statusCat === 'OUT_OF_RADIUS') list = list.filter(c => c.outOfRadius);
      }

      // Filter by Search Query
      const query = (this.reportTableFilter.searchQuery || '').toLowerCase().trim();
      if (query) {
        list = list.filter(c => 
          (c.namaCrew || '').toLowerCase().includes(query) ||
          (c.kodeCrew || '').toLowerCase().includes(query) ||
          (c.modul || '').toLowerCase().includes(query) ||
          (c.catatan || '').toLowerCase().includes(query)
        );
      }

      // Sort
      const col = this.reportTableFilter.sortCol || 'namaCrew';
      const asc = this.reportTableFilter.sortAsc;

      return list.sort((a, b) => {
        let valA = a[col] ?? '';
        let valB = b[col] ?? '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
      });
    },

    /**
     * Summary Metrics for Attendance Analysis Table
     */
    get analysisAttendanceSummary() {
      const data = this.analysisAttendanceTableData;
      const totalLogs = data.length;
      const tepatWaktuCount = data.filter(c => c.statusMasuk === 'TEPAT_WAKTU').length;
      const terlambatCount = data.filter(c => c.statusMasuk === 'TERLAMBAT').length;
      const belumPulangCount = data.filter(c => c.kehadiranCat === 'HADIR_MASUK_ONLY').length;
      const izinSakitCount = data.filter(c => c.kehadiranCat === 'IZIN' || c.kehadiranCat === 'SAKIT' || c.kehadiranCat === 'CUTI' || c.kehadiranCat === 'VISIT_DC').length;
      const outOfRadiusCount = data.filter(c => c.outOfRadius).length;

      return { totalLogs, tepatWaktuCount, terlambatCount, belumPulangCount, izinSakitCount, outOfRadiusCount };
    },

    /**
     * 4. DATASET: Analisis Audit Anomali & Rekonsiliasi (Scoped by Active Date Filter)
     */
    get analysisAnomalyTableData() {
      const fVisits = this.reportFilteredVisits || [];
      const fAbsensi = this.reportFilteredAbsensi || [];

      const normKey = (str) => {
        if (!str) return '';
        return String(str).toUpperCase()
          .replace(/[\.\,\-\_\(\)\/]/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/SULISTIYO/g, 'SULISTIO')
          .trim();
      };

      const uniqueMasterUsers = new Map();
      const userPhoneMap = {};
      this.masterUser.forEach(u => {
        const cleanN = normKey(u.nama);
        const cleanId = normKey(u.id);
        const primaryKey = cleanN || cleanId;
        if (primaryKey && !uniqueMasterUsers.has(primaryKey)) {
          uniqueMasterUsers.set(primaryKey, u);
        }
        if (cleanN && (u.telepon || u.phone)) userPhoneMap[cleanN] = u.telepon || u.phone;
        if (cleanId && (u.telepon || u.phone)) userPhoneMap[cleanId] = u.telepon || u.phone;
      });

      const absenMasukMap = {};
      const absenPulangMap = {};
      const terlambatList = [];
      const gpsIssueList = [];
      const sakitList = [];
      const izinList = [];
      const cutiList = [];
      const visitDcList = [];

      fAbsensi.forEach(a => {
        const rawName = (a.namaCrew || '').trim();
        const rawCode = (a.kodeCrew || '').trim();
        if (!rawName && !rawCode) return;
        const cleanN = normKey(rawName);
        const cleanId = normKey(rawCode);
        const statusUpper = (a.status || '').toUpperCase().trim();
        const catatanUpper = (a.catatan || '').toUpperCase().trim();
        const combined = `${statusUpper} ${catatanUpper}`;

        const entryMasuk = {
          namaCrew: rawName || rawCode,
          kodeCrew: rawCode || '-',
          modul: a._officialModul || this.getCrewOfficialModul(rawName, a.modul || '-'),
          waktuMasuk: a.waktu || '-',
          fotoMasuk: a.fotoSelfie || a.foto || '',
          noWa: userPhoneMap[cleanN] || (cleanId ? userPhoneMap[cleanId] : '') || ''
        };

        if (statusUpper.includes('MASUK') || statusUpper.includes('HADIR') || statusUpper.includes('IN')) {
          if (cleanN && !absenMasukMap[cleanN]) absenMasukMap[cleanN] = entryMasuk;
          if (cleanId && !absenMasukMap[cleanId]) absenMasukMap[cleanId] = entryMasuk;

          if (a.waktu) {
            const parts = String(a.waktu).split(':');
            if (parts.length >= 2) {
              const minutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
              if (minutes > 8 * 60) {
                terlambatList.push({
                  namaCrew: rawName || rawCode,
                  kodeCrew: rawCode || '-',
                  modul: a._officialModul || this.getCrewOfficialModul(rawName, a.modul || '-'),
                  waktuMasuk: a.waktu,
                  lateMinutes: minutes - 480,
                  noWa: userPhoneMap[cleanN] || (cleanId ? userPhoneMap[cleanId] : '') || ''
                });
              }
            }
          }
        }

        if (statusUpper.includes('PULANG') || statusUpper.includes('OUT')) {
          const entryPulang = {
            namaCrew: rawName || rawCode,
            kodeCrew: rawCode || '-',
            modul: a._officialModul || this.getCrewOfficialModul(rawName, a.modul || '-'),
            waktuPulang: a.waktu || '-'
          };
          if (cleanN && !absenPulangMap[cleanN]) absenPulangMap[cleanN] = entryPulang;
          if (cleanId && !absenPulangMap[cleanId]) absenPulangMap[cleanId] = entryPulang;
        }

        if (a.outOfRadius || a.isOutOfRadius || (a.distance && a.distance > 100)) {
          gpsIssueList.push({
            namaCrew: rawName || rawCode,
            kodeCrew: rawCode || '-',
            modul: a._officialModul || this.getCrewOfficialModul(rawName, a.modul || '-'),
            reason: `Absen di luar radius toko (Jarak: ${Math.round(a.distance || 120)} meter)`,
            noWa: userPhoneMap[cleanN] || (cleanId ? userPhoneMap[cleanId] : '') || ''
          });
        }

        if (combined.includes('SAKIT')) sakitList.push({ namaCrew: rawName, kodeCrew: rawCode, modul: a.modul, status: 'SAKIT', catatan: a.catatan });
        else if (combined.includes('IZIN')) izinList.push({ namaCrew: rawName, kodeCrew: rawCode, modul: a.modul, status: 'IZIN', catatan: a.catatan });
        else if (combined.includes('CUTI')) cutiList.push({ namaCrew: rawName, kodeCrew: rawCode, modul: a.modul, status: 'CUTI', catatan: a.catatan });
        else if (combined.includes('DC') || combined.includes('OFFICE')) visitDcList.push({ namaCrew: rawName, kodeCrew: rawCode, modul: a.modul, status: 'VISIT DC', isDc: true, catatan: a.catatan });
      });

      const visitMap = {};
      fVisits.forEach(v => {
        const rawName = (v.namaCrew || '').trim();
        const rawCode = (v.kodeCrew || '').trim();
        if (!rawName && !rawCode) return;
        const cleanN = normKey(rawName);
        const cleanId = normKey(rawCode);
        const vKey = cleanN || cleanId;

        if (!visitMap[vKey]) {
          visitMap[vKey] = {
            namaCrew: rawName || rawCode,
            kodeCrew: rawCode || '-',
            modul: v._officialModul || this.getCrewOfficialModul(rawName, v.modul || '-'),
            visitCount: 0,
            stores: new Set(),
            firstVisitTime: v.time || v.waktu || '',
            noWa: userPhoneMap[cleanN] || (cleanId ? userPhoneMap[cleanId] : '') || ''
          };
        }
        visitMap[vKey].visitCount++;
        if (v.kodeToko) visitMap[vKey].stores.add(v.kodeToko);

        if (cleanN) visitMap[cleanN] = visitMap[vKey];
        if (cleanId) visitMap[cleanId] = visitMap[vKey];
      });

      const anomalies = [];

      // 1. Absen Masuk tapi 0 Kunjungan
      Object.keys(absenMasukMap).forEach(cleanN => {
        const isDc = visitDcList.some(d => normKey(d.namaCrew) === cleanN);
        if (!isDc && (!visitMap[cleanN] || visitMap[cleanN].visitCount === 0)) {
          const c = absenMasukMap[cleanN];
          anomalies.push({
            id: `ANOM_A_${c.namaCrew}`,
            namaCrew: c.namaCrew,
            kodeCrew: c.kodeCrew || '-',
            modul: c.modul,
            regional: this.getRegionFromModul(c.modul),
            telepon: c.noWa || '',
            type: 'ABSEN_NO_VISIT',
            typeLabel: 'Absen Masuk 0 Kunjungan',
            severity: 'TINGGI',
            detail: `Telah absen masuk pukul ${c.waktuMasuk || '-'}, tetapi belum ada kunjungan toko terekam.`,
            waktu: c.waktuMasuk || '-',
            affectedCount: 0
          });
        }
      });

      // 2. Kunjungan Selesai tapi Belum Absen Masuk
      Object.keys(visitMap).forEach(cleanN => {
        if (!absenMasukMap[cleanN]) {
          const vObj = visitMap[cleanN];
          anomalies.push({
            id: `ANOM_B_${vObj.namaCrew}`,
            namaCrew: vObj.namaCrew,
            kodeCrew: vObj.kodeCrew,
            modul: vObj.modul,
            regional: this.getRegionFromModul(vObj.modul),
            telepon: vObj.noWa || '',
            type: 'VISIT_NO_ABSEN',
            typeLabel: 'Kunjungan Belum Absen Masuk',
            severity: 'TINGGI',
            detail: `Telah menyelesaikan ${vObj.visitCount} kunjungan toko (pertama ${vObj.firstVisitTime || '-'}), namun belum absen masuk.`,
            waktu: vObj.firstVisitTime || '-',
            affectedCount: vObj.visitCount || 0
          });
        }
      });

      // 3. Terlambat Masuk
      terlambatList.forEach(c => {
        anomalies.push({
          id: `ANOM_C_${c.namaCrew}`,
          namaCrew: c.namaCrew,
          kodeCrew: c.kodeCrew || '-',
          modul: c.modul,
          regional: this.getRegionFromModul(c.modul),
          telepon: c.noWa || '',
          type: 'TERLAMBAT',
          typeLabel: 'Terlambat Absen Masuk',
          severity: 'SEDANG',
          detail: `Absen masuk pada pukul ${c.waktuMasuk || '-'} (Terlambat ${c.lateMinutes || 0} menit).`,
          waktu: c.waktuMasuk || '-',
          affectedCount: 0
        });
      });

      // 4. Belum Absen Pulang
      Object.keys(absenMasukMap).forEach(cleanN => {
        if (!absenPulangMap[cleanN]) {
          const c = absenMasukMap[cleanN];
          const vCount = visitMap[cleanN] ? visitMap[cleanN].visitCount : 0;
          anomalies.push({
            id: `ANOM_D_${c.namaCrew}`,
            namaCrew: c.namaCrew,
            kodeCrew: c.kodeCrew || '-',
            modul: c.modul,
            regional: this.getRegionFromModul(c.modul),
            telepon: c.noWa || '',
            type: 'LUPA_PULANG',
            typeLabel: 'Belum Absen Pulang',
            severity: 'SEDANG',
            detail: `Sudah menyelesaikan ${vCount} kunjungan toko, tetapi belum melakukan absensi pulang.`,
            waktu: c.waktuMasuk || '-',
            affectedCount: vCount
          });
        }
      });

      // 5. GPS Issue
      gpsIssueList.forEach(c => {
        anomalies.push({
          id: `ANOM_E_${c.namaCrew}`,
          namaCrew: c.namaCrew,
          kodeCrew: c.kodeCrew || '-',
          modul: c.modul,
          regional: this.getRegionFromModul(c.modul),
          telepon: c.noWa || '',
          type: 'GPS_ISSUE',
          typeLabel: 'GPS di Luar Radius Toko',
          severity: 'TINGGI',
          detail: c.reason || 'Posisi koordinat absensi di luar radius batas toleransi toko.',
          waktu: '-',
          affectedCount: 0
        });
      });

      // 6. Alpha
      uniqueMasterUsers.forEach(u => {
        const cleanN = normKey(u.nama);
        const cleanId = normKey(u.id);
        const hasMasuk = (cleanN && absenMasukMap[cleanN]) || (cleanId && absenMasukMap[cleanId]);
        const hasVisit = (cleanN && visitMap[cleanN]) || (cleanId && visitMap[cleanId]);
        const hasIzin = (cleanN && sakitList.some(x => normKey(x.namaCrew) === cleanN)) ||
                        (cleanId && sakitList.some(x => normKey(x.kodeCrew) === cleanId)) ||
                        (cleanN && izinList.some(x => normKey(x.namaCrew) === cleanN)) ||
                        (cleanId && izinList.some(x => normKey(x.kodeCrew) === cleanId)) ||
                        (cleanN && cutiList.some(x => normKey(x.namaCrew) === cleanN)) ||
                        (cleanId && cutiList.some(x => normKey(x.kodeCrew) === cleanId)) ||
                        (cleanN && visitDcList.some(x => normKey(x.namaCrew) === cleanN)) ||
                        (cleanId && visitDcList.some(x => normKey(x.kodeCrew) === cleanId));

        if (!hasMasuk && !hasVisit && !hasIzin) {
          anomalies.push({
            id: `ANOM_F_${u.id || u.nama}`,
            namaCrew: u.nama,
            kodeCrew: u.id || '-',
            modul: u.modul || this.getCrewOfficialModul(u.nama, '-'),
            regional: this.getRegionFromModul(u.modul),
            telepon: u.telepon || (cleanN ? userPhoneMap[cleanN] : '') || (cleanId ? userPhoneMap[cleanId] : '') || '',
            type: 'ALPHA',
            typeLabel: 'Alpha / Tanpa Aktivitas',
            severity: 'KRITIS',
            detail: 'Belum ada rekaman absensi masuk maupun kunjungan toko pada periode ini.',
            waktu: '-',
            affectedCount: 0
          });
        }
      });

      let list = anomalies;

      // Filter by Region
      const reg = this.reportTableFilter.region;
      if (reg && reg !== 'ALL') {
        list = list.filter(c => c.regional === reg);
      }

      // Filter by Anomaly Type
      const statusCat = this.reportTableFilter.statusCategory;
      if (statusCat && statusCat !== 'ALL') {
        list = list.filter(c => c.type === statusCat);
      }

      // Filter by Search Query
      const query = (this.reportTableFilter.searchQuery || '').toLowerCase().trim();
      if (query) {
        list = list.filter(c => 
          (c.namaCrew || '').toLowerCase().includes(query) ||
          (c.kodeCrew || '').toLowerCase().includes(query) ||
          (c.modul || '').toLowerCase().includes(query) ||
          (c.detail || '').toLowerCase().includes(query)
        );

        // Developer tracking output
        console.log(`%c[Tracking Personil: "${query}"]%c Ditemukan ${list.length} anomali pada periode ${this.reportActiveDateLabel}`, 'background:#d97706;color:white;padding:2px 6px;border-radius:4px;font-weight:bold;', 'color:#fcd34d;');
        uniqueMasterUsers.forEach(u => {
          if ((u.nama || '').toLowerCase().includes(query) || (u.id || '').toLowerCase().includes(query)) {
            const cleanN = normKey(u.nama);
            const cleanId = normKey(u.id);
            const hasMasuk = (cleanN && absenMasukMap[cleanN]) || (cleanId && absenMasukMap[cleanId]);
            const hasPulang = (cleanN && absenPulangMap[cleanN]) || (cleanId && absenPulangMap[cleanId]);
            const hasVisit = (cleanN && visitMap[cleanN]) || (cleanId && visitMap[cleanId]);
            console.log(`  🔍 Personil: ${u.nama} (${u.id} - ${u.modul})`, {
              'Absen Masuk': hasMasuk ? `✅ Jam ${hasMasuk.waktuMasuk}` : '❌ Tidak Ada',
              'Absen Pulang': hasPulang ? `✅ Jam ${hasPulang.waktuPulang}` : '❌ Tidak Ada',
              'Kunjungan Toko': hasVisit ? `✅ ${hasVisit.visitCount} Toko` : '❌ 0 Toko',
              'Hasil Evaluasi': (!hasMasuk && !hasVisit) ? '🚨 ALPHA' : '✅ HADIR AKTIF'
            });
          }
        });
      }

      // Sort
      const col = this.reportTableFilter.sortCol || 'severity';
      const asc = this.reportTableFilter.sortAsc;

      return list.sort((a, b) => {
        let valA = a[col] ?? '';
        let valB = b[col] ?? '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
      });
    },

    /**
     * Summary Metrics for Anomaly Analysis Table
     */
    get analysisAnomalySummary() {
      const data = this.analysisAnomalyTableData;
      const totalAnomalies = data.length;
      const kritisCount = data.filter(c => c.severity === 'KRITIS').length;
      const tinggiCount = data.filter(c => c.severity === 'TINGGI').length;
      const sedangCount = data.filter(c => c.severity === 'SEDANG').length;
      const absen0VisitCount = data.filter(c => c.type === 'ABSEN_NO_VISIT').length;
      const visitNoAbsenCount = data.filter(c => c.type === 'VISIT_NO_ABSEN').length;
      const terlambatCount = data.filter(c => c.type === 'TERLAMBAT').length;
      const alphaCount = data.filter(c => c.type === 'ALPHA').length;

      return { totalAnomalies, kritisCount, tinggiCount, sedangCount, absen0VisitCount, visitNoAbsenCount, terlambatCount, alphaCount };
    },

    /**
     * Paginated Data Slice for Active Table
     */
    getPaginatedReportData(dataList) {
      if (!dataList || !Array.isArray(dataList)) return [];
      const size = this.reportTableFilter.pageSize;
      if (size === 'ALL' || size >= dataList.length) return dataList;
      const start = (this.reportTableFilter.page - 1) * size;
      return dataList.slice(start, start + size);
    },

    /**
     * Total Pages Calculator
     */
    getReportTableTotalPages(dataList) {
      if (!dataList || !Array.isArray(dataList)) return 1;
      const size = this.reportTableFilter.pageSize;
      if (size === 'ALL' || size <= 0) return 1;
      return Math.max(1, Math.ceil(dataList.length / size));
    },

    /**
     * EXPORT TO EXCEL (.XLSX) FOR ALL 4 ANALYTICS TABLES
     */
    exportAnalysisTableExcel(subTab = null) {
      const activeTabKey = subTab || this.reportTableSubTab || 'rute';
      if (typeof XLSX === 'undefined') {
        alert('Library XLSX belum siap, silakan refresh halaman.');
        return;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      let rows = [];
      let sheetName = 'Analisa';
      let fileName = `Analisis_${dateStr}.xlsx`;

      if (activeTabKey === 'rute') {
        sheetName = 'Realisasi Rute';
        fileName = `Analisis_Realisasi_Rute_MDS_${dateStr}.xlsx`;
        rows = this.analysisRouteTableData.map((c, idx) => ({
          'No': idx + 1,
          'Nama MDS': c.namaCrew,
          'Kode MDS': c.kodeCrew,
          'Modul': c.modul,
          'Grup Wilayah': this.getRegionFromModul(c.modul),
          'Target Toko': c.targetCount || 0,
          'Kunjungan Selesai': c.visitedCount || 0,
          'Capaian %': `${c.achievementRate || 0}%`,
          'Status Rute': c.status === 'TUNTAS' ? 'Tuntas 100%' : (c.status === 'ON_PROGRESS' ? 'Sedang Berjalan' : (c.status === 'BELUM_JALAN' ? 'Belum Ada Kunjungan' : 'Belum Input Jadwal'))
        }));
      } else if (activeTabKey === 'jadwal') {
        sheetName = 'Input Jadwal';
        fileName = `Analisis_Input_Jadwal_MDS_${dateStr}.xlsx`;
        rows = this.analysisScheduleTableData.map((c, idx) => ({
          'No': idx + 1,
          'Nama MDS': c.namaCrew,
          'Kode MDS': c.kodeCrew,
          'Modul': c.modul,
          'Grup Wilayah': c.regional,
          'Total Toko Terplot': c.totalStores,
          'Jumlah Rute/Hari Terisi': c.uniqueRoutes,
          'Rata-Rata Toko/Rute': c.avgPerRoute,
          'Target Toko Hari Ini': c.todayTarget,
          'Status Input': c.statusLabel,
          'Distribusi Account Utama': c.topAccounts
        }));
      } else if (activeTabKey === 'absen') {
        sheetName = 'Rekap Absensi';
        fileName = `Analisis_Rekap_Absensi_MDS_${dateStr}.xlsx`;
        rows = this.analysisAttendanceTableData.map((c, idx) => ({
          'No': idx + 1,
          'Tanggal': c.tanggal,
          'Nama MDS': c.namaCrew,
          'Kode MDS': c.kodeCrew,
          'Modul': c.modul,
          'Grup Wilayah': c.regional,
          'Jam Masuk': c.masukWaktu,
          'Status Masuk': c.statusMasuk === 'TEPAT_WAKTU' ? 'Tepat Waktu' : (c.statusMasuk === 'TERLAMBAT' ? `Terlambat ${c.lateMin}m` : 'Tidak Absen'),
          'Jam Pulang': c.pulangWaktu,
          'Durasi Kerja': c.durasiKerja,
          'Kategori Kehadiran': c.kehadiranCat,
          'Status Radius GPS': c.outOfRadius ? 'Di Luar Radius (>100m)' : 'Valid / Dalam Radius',
          'Catatan / Keterangan': c.catatan
        }));
      } else if (activeTabKey === 'anomali') {
        sheetName = 'Audit Anomali';
        fileName = `Analisis_Audit_Anomali_MDS_${dateStr}.xlsx`;
        rows = this.analysisAnomalyTableData.map((c, idx) => ({
          'No': idx + 1,
          'Nama MDS': c.namaCrew,
          'Kode MDS': c.kodeCrew,
          'Modul': c.modul,
          'Grup Wilayah': c.regional,
          'Tipe Anomali': c.typeLabel,
          'Tingkat Urgensi': c.severity,
          'Jam/Waktu Terkait': c.waktu,
          'Detail Temuan': c.detail,
          'Jumlah Toko Terdampak': c.affectedCount || 0
        }));
      }

      if (rows.length === 0) {
        alert('Tidak ada baris data untuk diexport pada filter saat ini.');
        return;
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, fileName);
    },

    /**
     * Modal: Open Photo Viewer
     */
    async openPhotoModal(visit) {
      this.resetPhotoZoom();
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
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    /**
     * Modal: Open Absensi Selfie Photo Viewer (Masuk / Pulang)
     */
    async openAbsenPhotoModal(entry, type = 'masuk') {
      const target = type === 'masuk' ? entry.masuk : entry.pulang;
      if (!target) return;

      this.resetPhotoZoom();
      const photoRaw = target.foto || target.fotoSelfie || target.fotoSurat || '';
      const photoUrl = photoRaw ? await ApiService.resolveImage(photoRaw) : '';

      this.photoModal.visitInfo = {
        namaCrew: entry.namaCrew,
        namaToko: entry.namaToko || (entry.modul ? `Absensi Modul ${entry.modul}` : 'Absensi Harian'),
        modul: entry.modul,
        account: target.status || (type === 'masuk' ? 'MASUK' : 'PULANG')
      };
      this.photoModal.title = `Foto Absensi ${type === 'masuk' ? 'Masuk' : 'Pulang'}: ${entry.namaCrew}`;
      this.photoModal.photoSelfie = photoUrl;
      this.photoModal.photoBefore = [];
      this.photoModal.photoAfter = [];
      this.photoModal.activePhotoUrl = photoUrl;
      this.photoModal.activePhotoLabel = `Foto Selfie Absensi ${type === 'masuk' ? 'Masuk (' + (target.waktu || '') + ')' : 'Pulang (' + (target.waktu || '') + ')'}`;
      this.photoModal.isOpen = true;
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    setActivePhoto(url, label) {
      this.resetPhotoZoom();
      this.photoModal.activePhotoUrl = url;
      this.photoModal.activePhotoLabel = label;
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    closePhotoModal() {
      this.photoModal.isOpen = false;
      this.resetPhotoZoom();
    },

    // Zoom & Pan Actions for Photo Modal
    zoomInPhoto() {
      const newZoom = Math.min(5, Math.round((this.photoModal.zoom + 0.3) * 10) / 10);
      this.photoModal.zoom = newZoom;
    },

    zoomOutPhoto() {
      const newZoom = Math.max(1, Math.round((this.photoModal.zoom - 0.3) * 10) / 10);
      this.photoModal.zoom = newZoom;
      if (newZoom === 1) {
        this.photoModal.panX = 0;
        this.photoModal.panY = 0;
      }
    },

    resetPhotoZoom() {
      this.photoModal.zoom = 1;
      this.photoModal.panX = 0;
      this.photoModal.panY = 0;
      this.photoModal.rotation = 0;
      this.photoModal.isDragging = false;
    },

    rotatePhoto() {
      this.photoModal.rotation = (this.photoModal.rotation + 90) % 360;
    },

    togglePhotoZoom() {
      if (this.photoModal.zoom > 1) {
        this.resetPhotoZoom();
      } else {
        this.photoModal.zoom = 2.2;
      }
    },

    handlePhotoWheel(e) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.25 : -0.25;
      const newZoom = Math.min(5, Math.max(1, Math.round((this.photoModal.zoom + delta) * 10) / 10));
      this.photoModal.zoom = newZoom;
      if (newZoom === 1) {
        this.photoModal.panX = 0;
        this.photoModal.panY = 0;
      }
    },

    startPhotoDrag(e) {
      if (this.photoModal.zoom <= 1) return;
      this.photoModal.isDragging = true;
      const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      this.photoModal.dragStartX = clientX - this.photoModal.panX;
      this.photoModal.dragStartY = clientY - this.photoModal.panY;
    },

    onPhotoDrag(e) {
      if (!this.photoModal.isDragging || this.photoModal.zoom <= 1) return;
      const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : null);
      const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : null);
      if (clientX === null || clientY === null) return;
      this.photoModal.panX = clientX - this.photoModal.dragStartX;
      this.photoModal.panY = clientY - this.photoModal.dragStartY;
    },

    endPhotoDrag() {
      this.photoModal.isDragging = false;
    },

    downloadActivePhoto() {
      if (!this.photoModal.activePhotoUrl) return;
      const a = document.createElement('a');
      a.href = this.photoModal.activePhotoUrl;
      a.target = '_blank';
      a.download = `Foto_${(this.photoModal.title || 'MDS').replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },

    /**
     * Helper: Check if a GPS coordinate is 0, 0 / empty / invalid
     */
    isGpsAnomaly(coord) {
      if (!coord) return true;
      const s = String(coord).trim();
      if (!s || s === '-' || s === '0' || s === '0,0' || s === '0, 0' || s === '0.0, 0.0') return true;
      if (s.includes(',')) {
        const parts = s.split(',');
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (isNaN(lat) || isNaN(lng)) return true;
        if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return true;
      }
      return false;
    },

    /**
     * Helper: Parse koordinat "lat, lng" string to [lat, lng] array
     */
    parseCoordinates(coordStr) {
      if (!coordStr) return null;
      const clean = String(coordStr).replace(/['"\s]/g, '');
      const parts = clean.split(',');
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          return [lat, lng];
        }
      }
      return null;
    },

    /**
     * Helper: Haversine Distance in Meters between 2 coordinate strings
     */
    calculateDistanceMeters(coord1, coord2) {
      if (!coord1 || !coord2) return null;
      const p1 = this.parseCoordinates(coord1);
      const p2 = this.parseCoordinates(coord2);
      if (!p1 || !p2) return null;
      if (Math.abs(p1[0]) < 0.0001 && Math.abs(p1[1]) < 0.0001) return null;
      if (Math.abs(p2[0]) < 0.0001 && Math.abs(p2[1]) < 0.0001) return null;

      const R = 6371000; // Radius Bumi dalam meter
      const lat1 = p1[0] * Math.PI / 180;
      const lat2 = p2[0] * Math.PI / 180;
      const dLat = (p2[0] - p1[0]) * Math.PI / 180;
      const dLng = (p2[1] - p1[1]) * Math.PI / 180;

      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c);
    },

    formatDistance(meters) {
      if (meters === null || meters === undefined) return null;
      if (meters < 1000) {
        return `${meters} m`;
      }
      return `${(meters / 1000).toFixed(1)} km`;
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
    },

    /**
     * Tab 2: Date Filter Change Handler for Absensi
     */
    onAbsensiDateFilterChange() {
      const f = this.filterAbsensi;
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');

      if (f.dateFilter === 'TODAY') {
        f.startDate = `${yyyy}-${mm}-${dd}`;
        f.endDate = `${yyyy}-${mm}-${dd}`;
      } else if (f.dateFilter === 'YESTERDAY') {
        const yDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const y_y = yDate.getFullYear();
        const y_m = String(yDate.getMonth() + 1).padStart(2, '0');
        const y_d = String(yDate.getDate()).padStart(2, '0');
        f.startDate = `${y_y}-${y_m}-${y_d}`;
        f.endDate = `${y_y}-${y_m}-${y_d}`;
      } else if (f.dateFilter === '7_DAYS') {
        const past7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        f.startDate = `${past7.getFullYear()}-${String(past7.getMonth() + 1).padStart(2, '0')}-${String(past7.getDate()).padStart(2, '0')}`;
        f.endDate = `${yyyy}-${mm}-${dd}`;
      } else if (f.dateFilter === 'THIS_MONTH') {
        f.startDate = `${yyyy}-${mm}-01`;
        f.endDate = `${yyyy}-${mm}-${dd}`;
      } else if (f.dateFilter === 'CUSTOM') {
        f.customStartInput = f.startDate || `${yyyy}-${mm}-${dd}`;
        f.customEndInput = f.endDate || `${yyyy}-${mm}-${dd}`;
        return;
      }
      this.updateAbsensiDateLabel();
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    applyAbsensiCustomDates() {
      const f = this.filterAbsensi;
      if (!f.customStartInput || !f.customEndInput) return;
      if (f.customStartInput > f.customEndInput) f.customEndInput = f.customStartInput;
      f.startDate = f.customStartInput;
      f.endDate = f.customEndInput;
      this.updateAbsensiDateLabel();
    },

    updateAbsensiDateLabel() {
      const f = this.filterAbsensi;
      if (f.dateFilter === 'LATEST_DAY') {
        f.activeDateLabel = 'Data Terakhir';
      } else if (f.dateFilter === 'TODAY') {
        f.activeDateLabel = 'Hari Ini';
      } else if (f.dateFilter === 'YESTERDAY') {
        f.activeDateLabel = 'Kemarin';
      } else if (f.dateFilter === '7_DAYS') {
        f.activeDateLabel = '7 Hari Terakhir';
      } else if (f.dateFilter === 'THIS_MONTH') {
        f.activeDateLabel = 'Bulan Ini';
      } else if (f.dateFilter === 'CUSTOM' && f.startDate && f.endDate) {
        f.activeDateLabel = `${f.startDate} s/d ${f.endDate}`;
      }
    },

    executeAbsensiSearch() {
      this.filterAbsensi.searchQuery = this.filterAbsensi.searchInputText;
    },

    clearAbsensiSearch() {
      this.filterAbsensi.searchInputText = '';
      this.filterAbsensi.searchQuery = '';
    },

    applyJadwalFilter() {
      if (!this.filterJadwal) return;
      this.filterJadwal.appliedModul = this.filterJadwal.modul || 'ALL';
      this.filterJadwal.appliedSelectedCrew = this.filterJadwal.selectedCrew || 'ALL';
      this.filterJadwal.appliedRute = this.filterJadwal.rute || 'ALL';
      this.filterJadwal.appliedAccount = this.filterJadwal.account || 'ALL';
      this.filterJadwal.appliedSearchQuery = (this.filterJadwal.searchInputText || '').trim();
      
      this.renderJadwalRouteMap();
      this.$nextTick(() => {
        if (window.lucide) lucide.createIcons();
      });
    },

    resetJadwalFilter() {
      if (!this.filterJadwal) return;
      this.filterJadwal.modul = 'ALL';
      this.filterJadwal.selectedCrew = 'ALL';
      this.filterJadwal.rute = 'ALL';
      this.filterJadwal.account = 'ALL';
      this.filterJadwal.searchInputText = '';
      this.applyJadwalFilter();
    },

    onJadwalSearchInput() {
      const q = (this.filterJadwal.searchInputText || '').trim().toUpperCase();
      if (q.length < 2) {
        this.jadwalStoreSuggestions = [];
        this.showJadwalSuggestions = false;
        return;
      }
      const list = this.masterToko || [];
      const results = [];
      const seen = new Set();
      
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const name = item.namaToko || '';
        const code = item.kodeToko || '';
        const crew = item.namaCrew || '';
        const str = item._searchStr || `${name} ${code} ${crew} ${item.account || ''}`;
        
        if (str.toUpperCase().includes(q)) {
          const key = (code || name).toUpperCase();
          if (!seen.has(key)) {
            seen.add(key);
            results.push({
              kodeToko: item.kodeToko,
              namaToko: item.namaToko,
              account: item.account,
              namaCrew: item.namaCrew,
              rute: item.rute,
              modul: item.modul
            });
            if (results.length >= 8) break;
          }
        }
      }
      this.jadwalStoreSuggestions = results;
      this.showJadwalSuggestions = results.length > 0;
    },

    selectJadwalSuggestion(item) {
      if (!item) return;
      this.filterJadwal.searchInputText = item.namaToko || item.kodeToko;
      this.showJadwalSuggestions = false;
      this.applyJadwalFilter();
    },

    executeJadwalSearch() {
      this.showJadwalSuggestions = false;
      this.applyJadwalFilter();
    },

    clearJadwalSearch() {
      if (!this.filterJadwal) return;
      this.filterJadwal.searchInputText = '';
      this.jadwalStoreSuggestions = [];
      this.showJadwalSuggestions = false;
      this.applyJadwalFilter();
    },

    get isJadwalRouteActive() {
      const f = this.filterJadwal || {};
      return f.appliedSelectedCrew && f.appliedSelectedCrew !== 'ALL';
    },

    storeGeoMap: new Map(),

    buildStoreGeoIndex() {
      const map = new Map();
      // 1. Index from stores49k
      if (this.stores49k && Array.isArray(this.stores49k)) {
        for (let i = 0; i < this.stores49k.length; i++) {
          const s = this.stores49k[i];
          const lat = parseFloat(s.lat);
          const lon = parseFloat(s.lon);
          if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
            const code = String(s.kodeToko || '').trim().toUpperCase();
            const name = String(s.namaToko || '').trim().toUpperCase();
            if (code && !map.has(code)) map.set(code, { lat: s.lat, lon: s.lon });
            if (name && !map.has(name)) map.set(name, { lat: s.lat, lon: s.lon });
          }
        }
      }
      // 2. Index from visits
      if (this.visits && Array.isArray(this.visits)) {
        for (let i = 0; i < this.visits.length; i++) {
          const v = this.visits[i];
          if (v.koordinat && !this.isGpsAnomaly(v.koordinat)) {
            const coords = this.parseCoordinates(v.koordinat);
            if (coords) {
              const code = String(v.kodeToko || '').trim().toUpperCase();
              const name = String(v.namaToko || '').trim().toUpperCase();
              if (code && !map.has(code)) map.set(code, { lat: String(coords[0]), lon: String(coords[1]) });
              if (name && !map.has(name)) map.set(name, { lat: String(coords[0]), lon: String(coords[1]) });
            }
          }
        }
      }
      this.storeGeoMap = map;
    },

    getStoreGeoFromCatalog(kodeToko, namaToko) {
      if (!this.storeGeoMap || this.storeGeoMap.size === 0) {
        this.buildStoreGeoIndex();
      }
      const cCode = String(kodeToko || '').trim().toUpperCase();
      const cName = String(namaToko || '').trim().toUpperCase();

      if (cCode && this.storeGeoMap.has(cCode)) {
        return this.storeGeoMap.get(cCode);
      }
      if (cName && this.storeGeoMap.has(cName)) {
        return this.storeGeoMap.get(cName);
      }
      return null;
    },

    renderJadwalRouteMap() {
      if (!this.isJadwalRouteActive) {
        if (MapService.jadwalMarkerGroup) {
          MapService.jadwalMarkerGroup.clearLayers();
          MapService.jadwalPolylineGroup.clearLayers();
        }
        this.jadwalMapStats = { totalStores: 0, validCount: 0, totalDistKm: '0' };
        return;
      }

      const rawStores = this.filteredMasterToko;
      if (!rawStores || rawStores.length === 0) {
        if (MapService.jadwalMarkerGroup) {
          MapService.jadwalMarkerGroup.clearLayers();
          MapService.jadwalPolylineGroup.clearLayers();
        }
        this.jadwalMapStats = { totalStores: 0, validCount: 0, totalDistKm: '0' };
        return;
      }

      // Enrich with coordinates
      const enriched = rawStores.map(st => {
        let lat = st.lat || st.latitude;
        let lon = st.lon || st.lng || st.longitude;
        if (!lat || !lon) {
          const geo = this.getStoreGeoFromCatalog(st.kodeToko, st.namaToko);
          if (geo) {
            lat = geo.lat;
            lon = geo.lon;
          }
        }
        return { ...st, lat, lon };
      });

      this.$nextTick(() => {
        const mapEl = document.getElementById('jadwal-map');
        if (!mapEl) return;
        MapService.initJadwalMap('jadwal-map', this.theme === 'dark');
        const ruteLabel = this.filterJadwal.appliedRute === 'ALL' ? 'Semua Rute' : `Rute ${this.filterJadwal.appliedRute}`;
        const stats = MapService.renderJadwalRouteOnMap(enriched, this.filterJadwal.appliedSelectedCrew, ruteLabel);
        if (stats) this.jadwalMapStats = stats;
        if (window.lucide) lucide.createIcons();
      });
    },

    selectStoreForMap(store) {
      if (!store) return;
      this.selectedStoreForMap = store;

      let lat = parseFloat(store.lat || store.latitude);
      let lon = parseFloat(store.lon || store.lng || store.longitude);

      if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) {
        const geo = this.getStoreGeoFromCatalog(store.kodeToko, store.namaToko);
        if (geo) {
          lat = parseFloat(geo.lat);
          lon = parseFloat(geo.lon);
          store.lat = lat;
          store.lon = lon;
        }
      }

      if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
        this.nearest10Stores = MapService.findNearest10Stores({ ...store, lat, lon }, this.stores49k, 10);
        this.$nextTick(() => {
          MapService.initTokoMap('tokonasional-map', this.theme === 'dark');
          MapService.renderTokoWithNearestOnMap({ ...store, lat, lon }, this.nearest10Stores);
          const container = document.getElementById('tokonasional-map-container');
          if (container) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          if (window.lucide) lucide.createIcons();
        });
      } else {
        this.nearest10Stores = [];
      }
    },

    clearStoreForMap() {
      this.selectedStoreForMap = null;
      this.nearest10Stores = [];
      if (MapService.tokoMarkerGroup) {
        MapService.tokoMarkerGroup.clearLayers();
        MapService.tokoPolylineGroup.clearLayers();
      }
    },

    exportMasterJadwalExcel() {
      const data = this.filteredMasterToko;
      if (!data || data.length === 0) {
        alert('Tidak ada data jadwal yang bisa diexport.');
        return;
      }
      if (typeof XLSX === 'undefined') {
        alert('Library XLSX belum siap, silakan refresh halaman.');
        return;
      }
      const rows = data.map((m, idx) => ({
        'No': idx + 1,
        'Modul': m.modul || m._officialModul || '',
        'Nama MDS / Crew': m.namaCrew || '',
        'Kode Toko': m.kodeToko || '',
        'Nama Toko': m.namaToko || '',
        'Account': m.account || '',
        'Rute': m.rute || '',
        'Status': m.status || 'Active'
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Target Jadwal Rute');
      const filename = `Master_Jadwal_Rute_${this.filterJadwal.modul}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
    },

    exportAbsensiExcel() {
      const data = this.groupedAbsensi;
      if (!data || data.length === 0) {
        alert('Tidak ada data absensi yang bisa diexport.');
        return;
      }
      if (typeof XLSX === 'undefined') {
        alert('Library XLSX belum siap, silakan refresh halaman.');
        return;
      }
      const rows = data.map((a, idx) => ({
        'No': idx + 1,
        'Tanggal': a.iso || a.tanggal || '',
        'Modul': a.modul || '',
        'Nama Crew': a.namaCrew || '',
        'Kode Crew': a.kodeCrew || '',
        'Jam Masuk': a.masuk ? a.masuk.waktu : '-',
        'Status Masuk': a.masuk ? a.masuk.status : '-',
        'Jarak Masuk vs Toko 1': a.masukDistText || '-',
        'Jam Pulang': a.pulang ? a.pulang.waktu : '-',
        'Status Pulang': a.pulang ? a.pulang.status : '-',
        'Jarak Pulang vs Toko Akhir': a.pulangDistText || '-',
        'Total Visit Hari Ini': a.totalVisitsToday || 0,
        'Durasi Kerja': a.durasiKerja || '-',
        'Status Evaluasi': a.overallStatus || '-'
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Absensi Tim');
      const filename = `Laporan_Absensi_MDS_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
    },

    // ==============================================================================
    // MULTI-SPREADSHEET CRUD & SYNC METHODS
    // ==============================================================================

    openEditJadwalModal(item) {
      this.crudModal.mode = 'edit';
      this.crudModal.title = 'Edit Jadwal & Informasi Toko';
      this.crudModal.item = item;
      this.crudModal.formData = {
        modul: item.modul || item._officialModul || 'DK1',
        account: item.account || 'ALFAMART',
        kodeToko: item.kodeToko || '',
        namaToko: item.namaToko || '',
        rute: String(item.rute || '1').replace(/[^0-9]/g, '') || '1',
        namaCrew: item.namaCrew || '',
        kodeCrew: item.kodeCrew || ''
      };
      this.crudModal.isSubmitting = false;
      this.crudModal.isSuccess = false;
      this.crudModal.errorMsg = '';
      this.crudModal.statusMsg = '';
      this.crudModal.auditResult = null;
      this.crudModal.isOpen = true;
    },

    openTransferJadwalModal(item) {
      this.crudModal.mode = 'transfer';
      this.crudModal.title = 'Transfer Toko ke Personil MDS Lain';
      this.crudModal.item = item;
      this.crudModal.formData = {
        modul: item.modul || item._officialModul || 'DK1',
        account: item.account || 'ALFAMART',
        kodeToko: item.kodeToko || '',
        namaToko: item.namaToko || '',
        rute: String(item.rute || '1').replace(/[^0-9]/g, '') || '1',
        oldNamaCrew: item.namaCrew || '',
        oldKodeCrew: item.kodeCrew || '',
        newModul: item.modul || item._officialModul || 'DK1',
        newCrewName: '',
        newCrewCode: '',
        newRute: String(item.rute || '1').replace(/[^0-9]/g, '') || '1'
      };
      this.crudModal.isSubmitting = false;
      this.crudModal.isSuccess = false;
      this.crudModal.errorMsg = '';
      this.crudModal.statusMsg = '';
      this.crudModal.auditResult = null;
      this.crudModal.isOpen = true;
    },

    onNewCrewSelected(crewName) {
      if (!crewName) return;
      const crewList = this.getCrewsByModul(this.crudModal.formData.modul || 'ALL');
      const found = crewList.find(c => c.namaCrew === crewName || c.namaCrew.toUpperCase() === crewName.toUpperCase());
      if (found) {
        this.crudModal.formData.newCrewCode = found.kodeCrew || '';
        this.crudModal.formData.kodeCrew = found.kodeCrew || '';
        if (found.modul) {
          this.crudModal.formData.newModul = found.modul;
        }
      } else {
        const crewObj = (this.jadwalCrewList || []).find(c => c.name === crewName);
        if (crewObj) {
          this.crudModal.formData.newCrewCode = crewObj.id || crewObj.code || '';
          this.crudModal.formData.kodeCrew = crewObj.id || crewObj.code || '';
          this.crudModal.formData.newModul = crewObj.modul || this.crudModal.formData.modul;
        }
      }
    },

    openDeleteJadwalModal(item) {
      this.crudModal.mode = 'delete';
      this.crudModal.title = 'Hapus Toko dari Jadwal Kunjungan';
      this.crudModal.item = item;
      this.crudModal.formData = {
        modul: item.modul || item._officialModul || '',
        account: item.account || '',
        kodeToko: item.kodeToko || '',
        namaToko: item.namaToko || '',
        rute: item.rute || '',
        namaCrew: item.namaCrew || '',
        kodeCrew: item.kodeCrew || ''
      };
      this.crudModal.isSubmitting = false;
      this.crudModal.isSuccess = false;
      this.crudModal.errorMsg = '';
      this.crudModal.statusMsg = '';
      this.crudModal.auditResult = null;
      this.crudModal.isOpen = true;
    },

    openCreateMasterStoreModal() {
      this.crudModal.mode = 'create_master';
      this.crudModal.title = 'Tambah Toko Baru ke Master Database Toko';
      this.crudModal.item = null;
      this.crudModal.formData = {
        kodeToko: '',
        namaToko: '',
        account: 'ALFAMART',
        dcName: '',
        kecamatan: '',
        kota: '',
        provinsi: '',
        lat: '',
        lon: ''
      };
      this.crudModal.isSubmitting = false;
      this.crudModal.isSuccess = false;
      this.crudModal.errorMsg = '';
      this.crudModal.statusMsg = '';
      this.crudModal.auditResult = null;
      this.crudModal.isOpen = true;
    },

    openPurgeDuplicatesModal() {
      this.crudModal.mode = 'purge_duplicates';
      this.crudModal.title = 'Scan & Bersihkan Duplikat Jadwal (Anti-Dobel)';
      this.crudModal.item = null;
      this.crudModal.formData = {
        modul: this.filterJadwal.modul || 'ALL'
      };
      this.crudModal.isSubmitting = false;
      this.crudModal.isSuccess = false;
      this.crudModal.errorMsg = '';
      this.crudModal.statusMsg = '';
      this.crudModal.auditResult = null;
      this.crudModal.isOpen = true;
    },

    closeCrudModal() {
      this.crudModal.isOpen = false;
      this.crudModal.isSubmitting = false;
      this.crudModal.isSuccess = false;
      this.crudModal.errorMsg = '';
      this.crudModal.statusMsg = '';
      this.crudModal.auditResult = null;
    },

    async executeCrudSubmit() {
      const mode = this.crudModal.mode;
      const f = this.crudModal.formData;
      const item = this.crudModal.item;

      this.crudModal.isSubmitting = true;
      this.crudModal.errorMsg = '';
      this.crudModal.statusMsg = 'Menghubungkan ke Central Backend Spreadsheet...';

      try {
        if (mode === 'edit') {
          if (!f.kodeToko || !f.namaToko) throw new Error('Kode Toko dan Nama Toko wajib diisi.');

          const payload = {
            oldData: {
              modul: item.modul || item._officialModul,
              account: item.account,
              kodeToko: item.kodeToko,
              namaToko: item.namaToko,
              rute: item.rute,
              namaCrew: item.namaCrew,
              kodeCrew: item.kodeCrew
            },
            newData: {
              modul: f.modul,
              account: f.account,
              kodeToko: f.kodeToko,
              namaToko: f.namaToko,
              rute: f.rute
            }
          };

          this.crudModal.statusMsg = 'Mengupdate baris di Pipeline Sentral & Modul Spreadsheet...';
          const res = await ApiService.postAction('update_store_route_info', payload);

          // Optimistic local cache update
          const foundIdx = this.masterToko.findIndex(m => m === item || (m.kodeToko === item.kodeToko && m.rute === item.rute && m.namaCrew === item.namaCrew));
          if (foundIdx !== -1) {
            this.masterToko[foundIdx] = {
              ...this.masterToko[foundIdx],
              modul: f.modul,
              _officialModul: f.modul,
              account: f.account,
              kodeToko: f.kodeToko,
              namaToko: f.namaToko,
              rute: f.rute
            };
          }

          this.crudModal.isSuccess = true;
          this.crudModal.auditResult = res.data;
          this.crudModal.statusMsg = (res.data && res.data.message) || 'Perubahan berhasil disinkronkan ke seluruh spreadsheet!';
          
          // Clear API cache & Trigger Fresh Background Sync
          if (ApiService.memoryCache) ApiService.memoryCache.clear();
          this.saveSessionState();
          await this.refreshAllData(false);

        } else if (mode === 'transfer') {
          if (!f.newCrewName) throw new Error('Silakan pilih Personil MDS baru tujuan transfer.');

          const payload = {
            store: item,
            oldCrewName: item.namaCrew,
            oldCrewCode: item.kodeCrew,
            oldModul: item.modul || item._officialModul,
            oldRute: item.rute,
            newCrewName: f.newCrewName,
            newCrewCode: f.newCrewCode,
            newModul: f.newModul,
            newRute: f.newRute
          };

          this.crudModal.statusMsg = `Mentransfer toko ke ${f.newCrewName} di Modul ${f.newModul}...`;
          const res = await ApiService.postAction('transfer_store_crew', payload);

          // Optimistic local cache update
          const foundIdx = this.masterToko.findIndex(m => m === item || (m.kodeToko === item.kodeToko && m.rute === item.rute && m.namaCrew === item.namaCrew));
          if (foundIdx !== -1) {
            this.masterToko[foundIdx] = {
              ...this.masterToko[foundIdx],
              namaCrew: f.newCrewName,
              kodeCrew: f.newCrewCode,
              modul: f.newModul,
              _officialModul: f.newModul,
              rute: f.newRute
            };
          }

          this.crudModal.isSuccess = true;
          this.crudModal.auditResult = res.data;
          this.crudModal.statusMsg = (res.data && res.data.message) || `Toko berhasil ditransfer ke ${f.newCrewName}!`;
          
          // Clear API cache & Trigger Fresh Background Sync
          if (ApiService.memoryCache) ApiService.memoryCache.clear();
          this.saveSessionState();
          await this.refreshAllData(false);

        } else if (mode === 'delete') {
          const payload = {
            store: {
              modul: item.modul || item._officialModul,
              account: item.account,
              kodeToko: item.kodeToko,
              namaToko: item.namaToko,
              rute: item.rute,
              namaCrew: item.namaCrew,
              kodeCrew: item.kodeCrew
            }
          };

          this.crudModal.statusMsg = 'Menghapus baris jadwal di Spreadsheet Pipeline & Modul...';
          const res = await ApiService.postAction('delete_scheduled_store', payload);

          // Optimistic local cache removal
          this.masterToko = this.masterToko.filter(m => !(m === item || (m.kodeToko === item.kodeToko && m.rute === item.rute && m.namaCrew === item.namaCrew)));

          this.crudModal.isSuccess = true;
          this.crudModal.auditResult = res.data;
          this.crudModal.statusMsg = (res.data && res.data.message) || 'Toko berhasil dihapus dari jadwal kunjungan!';
          
          // Clear API cache & Trigger Fresh Background Sync
          if (ApiService.memoryCache) ApiService.memoryCache.clear();
          this.saveSessionState();
          await this.refreshAllData(false);

        } else if (mode === 'create_master') {
          if (!f.kodeToko || !f.namaToko) throw new Error('Kode Toko dan Nama Toko wajib diisi.');

          this.crudModal.statusMsg = 'Mendaftarkan toko ke Master Database 49k...';
          const res = await ApiService.postAction('create_or_update_master_store', { store: f });

          this.crudModal.isSuccess = true;
          this.crudModal.auditResult = res.data;
          this.crudModal.statusMsg = (res.data && res.data.message) || 'Toko baru berhasil tersimpan di Master Database!';
          
          // Clear API cache & Trigger Fresh Background Sync
          if (ApiService.memoryCache) ApiService.memoryCache.clear();
          await this.refreshAllData(false);

        } else if (mode === 'assign_schedule') {
          if (!f.namaCrew) throw new Error('Silakan pilih personil MDS tujuan.');
          this.crudModal.statusMsg = `Menjadwalkan toko ke ${f.namaCrew} (Modul ${f.modul}, Rute ${f.rute})...`;
          const res = await ApiService.postAction('assign_scheduled_store', {
            store: item,
            modul: f.modul,
            namaCrew: f.namaCrew,
            kodeCrew: f.kodeCrew,
            rute: f.rute
          });

          // Optimistic local add to masterToko
          this.masterToko.push({
            modul: f.modul,
            _officialModul: f.modul,
            account: item.account || f.account,
            kodeToko: item.kodeToko,
            namaToko: item.namaToko,
            kodeCrew: f.kodeCrew,
            namaCrew: f.namaCrew,
            rute: f.rute
          });

          this.crudModal.isSuccess = true;
          this.crudModal.auditResult = res.data;
          this.crudModal.statusMsg = (res.data && res.data.message) || `Toko berhasil dijadwalkan ke ${f.namaCrew}!`;
          if (ApiService.memoryCache) ApiService.memoryCache.clear();
          this.saveSessionState();
          await this.refreshAllData(false);

        } else if (mode === 'edit_master') {
          if (!f.kodeToko || !f.namaToko) throw new Error('Kode Toko dan Nama Toko wajib diisi.');
          this.crudModal.statusMsg = 'Menyimpan perubahan toko di Master Database 49k...';
          const res = await ApiService.postAction('create_or_update_master_store', { store: f });

          // Optimistic local update in stores49k
          const sIdx = this.stores49k.findIndex(s => s.kodeToko === f.kodeToko || s === item);
          if (sIdx !== -1) {
            this.stores49k[sIdx] = {
              ...this.stores49k[sIdx],
              namaToko: f.namaToko,
              account: f.account,
              branchName: f.dcName,
              kecamatan: f.kecamatan,
              kabKota: f.kota,
              lat: f.lat,
              lon: f.lon
            };
            if (window.DashboardDB) {
              await DashboardDB.set('stores_49k', this.stores49k, 7 * 24 * 60 * 60 * 1000);
            }
          }

          this.crudModal.isSuccess = true;
          this.crudModal.auditResult = res.data;
          this.crudModal.statusMsg = (res.data && res.data.message) || 'Data Master Toko berhasil diperbarui!';
          if (ApiService.memoryCache) ApiService.memoryCache.clear();

        } else if (mode === 'delete_master') {
          this.crudModal.statusMsg = 'Menghapus toko dari Master Database 49k...';
          const res = await ApiService.postAction('delete_master_store', { kodeToko: f.kodeToko });

          // Optimistic local removal from stores49k
          this.stores49k = this.stores49k.filter(s => s.kodeToko !== f.kodeToko && s !== item);
          if (window.DashboardDB) {
            await DashboardDB.set('stores_49k', this.stores49k, 7 * 24 * 60 * 60 * 1000);
          }

          this.crudModal.isSuccess = true;
          this.crudModal.auditResult = res.data;
          this.crudModal.statusMsg = (res.data && res.data.message) || 'Toko berhasil dihapus dari Master Database!';
          if (ApiService.memoryCache) ApiService.memoryCache.clear();

        } else if (mode === 'purge_duplicates') {
          this.crudModal.statusMsg = 'Memindai seluruh baris duplikat di Master_Toko...';
          const res = await ApiService.postAction('purge_duplicate_routes', { modul: f.modul });

          this.crudModal.isSuccess = true;
          this.crudModal.auditResult = res.data;
          this.crudModal.statusMsg = (res.data && res.data.message) || 'Pembersihan duplikat selesai!';
          
          // Clear API cache & Re-fetch clean master toko data
          if (ApiService.memoryCache) ApiService.memoryCache.clear();
          await this.refreshAllData(false);
        }

      } catch (err) {
        console.error('CRUD Execution Error:', err);
        this.crudModal.errorMsg = err.message || 'Terjadi kesalahan saat memproses data ke Google Sheet.';
      } finally {
        this.crudModal.isSubmitting = false;
        this.$nextTick(() => {
          if (window.lucide) lucide.createIcons();
        });
      }
    },

    /**
     * ==============================================================================
     * TAB 6: EVALUASI KINERJA SPV & SCORECARD MTD
     * ==============================================================================
     */
    executeSpvSearch() {
      this.filterSpv.searchQuery = (this.filterSpv.searchInput || '').trim();
      this.filterSpv.page = 1;
      this.$nextTick(() => this.refreshSpvCharts());
    },

    clearSpvSearch() {
      this.filterSpv.searchInput = '';
      this.filterSpv.searchQuery = '';
      this.filterSpv.page = 1;
      this.$nextTick(() => this.refreshSpvCharts());
    },

    get spvEvaluationList() {
      const normKey = (str) => {
        if (!str) return '';
        return String(str).toUpperCase()
          .replace(/[\.\,\-\_\(\)\/]/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/SULISTIYO/g, 'SULISTIO')
          .trim();
      };

      // Map visits by crew
      const visitsByCrew = {};
      (this.visits || []).forEach(v => {
        const cKey = normKey(v.namaCrew) || normKey(v.kodeCrew);
        if (!cKey) return;
        if (!visitsByCrew[cKey]) visitsByCrew[cKey] = [];
        visitsByCrew[cKey].push(v);
      });

      // Map attendance by crew
      const absensiByCrew = {};
      (this.absensi || []).forEach(a => {
        const cKey = normKey(a.namaCrew) || normKey(a.kodeCrew);
        if (!cKey) return;
        if (!absensiByCrew[cKey]) absensiByCrew[cKey] = [];
        absensiByCrew[cKey].push(a);
      });

      // Map unique target stores in Master Toko (O(1) Instant Lookup)
      const masterStoreMap = this.crewMasterStoresMap || new Map();
      const targetStoresByCrew = {};
      masterStoreMap.forEach((stores, cKey) => {
        if (!targetStoresByCrew[cKey]) targetStoresByCrew[cKey] = new Set();
        stores.forEach(m => {
          if (m.kodeToko || m.namaToko) targetStoresByCrew[cKey].add(m.kodeToko || m.namaToko);
        });
      });

      const list = [];
      const searchQ = (this.filterSpv.searchQuery || '').toUpperCase().trim();
      const selSpv = this.filterSpv.spv;

      (this.allAvailableCrews || []).forEach(crw => {
        const rawName = crw.namaCrew || '';
        const cKey = normKey(rawName);
        const mod = (crw.modul || this.getCrewOfficialModul(rawName, 'DK1')).toUpperCase().trim();

        // Determine SPV & Region
        let spvName = 'Ibnu Fazarial';
        let regionName = 'DK (Jabodetabek)';
        let spvCode = 'DK';

        if (mod.startsWith('LK')) {
          spvName = 'Dwi Amanto';
          regionName = 'LK (Jawa Bali)';
          spvCode = 'LK';
        } else if (mod.startsWith('LP')) {
          spvName = 'Siti Pasikha';
          regionName = 'LP (Luar Pulau)';
          spvCode = 'LP';
        }

        // Apply SPV Filter
        if (selSpv !== 'ALL' && spvCode !== selSpv) return;

        // Apply Search Filter
        if (searchQ) {
          const match = rawName.toUpperCase().includes(searchQ) ||
                        mod.includes(searchQ) ||
                        spvName.toUpperCase().includes(searchQ) ||
                        (crw.kodeCrew && crw.kodeCrew.toUpperCase().includes(searchQ));
          if (!match) return;
        }

        // Get crew visits
        const myVisits = visitsByCrew[cKey] || [];
        const myAbsensi = absensiByCrew[cKey] || [];

        // Count Toko vs DC visits (1 toko 1x untuk evaluasi toko reguler)
        let storeVisits = 0;
        let dcVisits = 0;
        const visitedStoreSet = new Set();
        myVisits.forEach(v => {
          const acc = (v.account || '').toUpperCase();
          const storeName = (v.namaToko || '').toUpperCase();
          if (acc.includes('DC') || storeName.includes('DC') || storeName.includes('GUDANG') || storeName.includes('DISTRIBUTION')) {
            dcVisits++;
          } else {
            const sId = (v.kodeToko || '').trim() || (v.namaToko || '').trim();
            if (sId) visitedStoreSet.add(sId);
            storeVisits++;
          }
        });

        // Attendance stats — absensi uses `waktu` + `status` per event record
        // MASUK = check-in, PULANG = check-out (separate rows per event)
        let jamMasuk = '-';
        let jamPulang = '-';
        let jamKerja = 0;

        if (myAbsensi.length > 0) {
          // Tanggal terbaru / hari berjalan dalam database absensi
          const latestAbsenIso = (this.absensi && this.absensi[0] && this.absensi[0]._iso) || '';

          // Cari record MASUK & PULANG khusus untuk tanggal hari berjalan (Hari Ini)
          const recMasuk = myAbsensi.find(a => {
            if (latestAbsenIso && a._iso && a._iso !== latestAbsenIso) return false;
            const st = (a.status || '').toUpperCase();
            return st === 'MASUK' || st.includes('DATANG') || st.includes('HADIR');
          });
          const recPulang = myAbsensi.find(a => {
            if (latestAbsenIso && a._iso && a._iso !== latestAbsenIso) return false;
            const st = (a.status || '').toUpperCase();
            return st === 'PULANG' || st.includes('PULANG');
          });

          // Helper: normalize waktu "H:MM:SS" → "HH:MM"
          const fmtWaktu = (w) => {
            if (!w) return '-';
            const parts = String(w).split(':');
            if (parts.length >= 2) {
              return `${String(parseInt(parts[0], 10)).padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
            }
            return w;
          };

          if (recMasuk) jamMasuk = fmtWaktu(recMasuk.waktu);
          if (recPulang) jamPulang = fmtWaktu(recPulang.waktu);

          // If no PULANG yet (still working), estimate based on typical 9h
          // Calculate jam kerja
          try {
            if (jamMasuk !== '-' && jamPulang !== '-') {
              const pIn = jamMasuk.split(':');
              const pOut = jamPulang.split(':');
              if (pIn.length >= 2 && pOut.length >= 2) {
                const hIn = parseInt(pIn[0], 10) + parseInt(pIn[1], 10) / 60;
                const hOut = parseInt(pOut[0], 10) + parseInt(pOut[1], 10) / 60;
                if (hOut > hIn) {
                  jamKerja = Math.round((hOut - hIn) * 10) / 10;
                }
              }
            } else if (jamMasuk !== '-') {
              // Masuk tapi belum pulang — hitung sampai sekarang
              const pIn = jamMasuk.split(':');
              const now = new Date();
              const hIn = parseInt(pIn[0], 10) + parseInt(pIn[1], 10) / 60;
              const hNow = now.getHours() + now.getMinutes() / 60;
              if (hNow > hIn) {
                jamKerja = Math.round((hNow - hIn) * 10) / 10;
              }
            }
          } catch (e) {}
        }

        // Targets: Total toko yang sudah di-input oleh MDS di Master Toko (RPS)
        const uniqueTargets = (targetStoresByCrew[cKey] && targetStoresByCrew[cKey].size) || 0;
        const rpsToko = uniqueTargets > 0 ? uniqueTargets : (storeVisits || 1);
        const rpsDc = 4;     // Standar target bulanan 4 DC

        // Realisasi Evaluasi Kunjungan Reguler: 1 toko 1x (toko unik yang sudah terkunjungi)
        const kunjunganTokoUnik = visitedStoreSet.size;
        const pctToko = Math.min(100, Math.round((kunjunganTokoUnik / rpsToko) * 100));
        const pctDc = Math.min(100, Math.round((dcVisits / rpsDc) * 100));

        list.push({
          region: regionName,
          spvCode: spvCode,
          spvName: spvName,
          namaMds: rawName,
          kodeCrew: crw.kodeCrew || '-',
          modul: mod,
          absenMasuk: jamMasuk,
          absenPulang: jamPulang,
          jamKerja: jamKerja,
          rpsToko: rpsToko,
          kunjunganToko: kunjunganTokoUnik,
          kunjunganRaw: storeVisits,
          pctToko: pctToko,
          rpsDc: rpsDc,
          kunjunganDc: dcVisits,
          pctDc: pctDc
        });
      });

      // Sort by % Target Toko descending
      return list.sort((a, b) => b.pctToko - a.pctToko || b.kunjunganToko - a.kunjunganToko || a.namaMds.localeCompare(b.namaMds));
    },

    get spvSummary() {
      const list = this.spvEvaluationList || [];
      const totalMds = list.length;
      if (totalMds === 0) {
        return {
          totalMds: 0,
          totalRpsToko: 0,
          totalKunjunganToko: 0,
          avgPctToko: 0,
          totalRpsDc: 0,
          totalKunjunganDc: 0,
          avgPctDc: 0,
          avgJamKerja: 0
        };
      }

      let sumRpsToko = 0;
      let sumKunjToko = 0;
      let sumPctToko = 0;
      let sumRpsDc = 0;
      let sumKunjDc = 0;
      let sumPctDc = 0;
      let sumJamKerja = 0;

      list.forEach(item => {
        sumRpsToko += item.rpsToko;
        sumKunjToko += item.kunjunganToko;
        sumPctToko += item.pctToko;
        sumRpsDc += item.rpsDc;
        sumKunjDc += item.kunjunganDc;
        sumPctDc += item.pctDc;
        sumJamKerja += (item.jamKerja || 9);
      });

      return {
        totalMds: totalMds,
        totalRpsToko: sumRpsToko,
        totalKunjunganToko: sumKunjToko,
        avgPctToko: Math.round(sumPctToko / totalMds),
        totalRpsDc: sumRpsDc,
        totalKunjunganDc: sumKunjDc,
        avgPctDc: Math.round(sumPctDc / totalMds),
        avgJamKerja: Math.round((sumJamKerja / totalMds) * 10) / 10
      };
    },

    refreshSpvCharts() {
      try {
        const isDark = this.theme === 'dark';
        const el = document.getElementById('spv-mtd-chart');
        if (!el) return;

        const summary = this.spvSummary || {};
        const allVisits = this.visits || [];
        const selSpv = this.filterSpv.spv;

        // Indonesian month names
        const BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

        // Count store visits per month from actual data, filtered by SPV if needed
        const visitsByMonth = {};
        allVisits.forEach(v => {
          // SPV filter
          if (selSpv !== 'ALL') {
            const mod = (v.modul || '').toUpperCase();
            const isLK = mod.startsWith('LK');
            const isLP = mod.startsWith('LP');
            if (selSpv === 'LK' && !isLK) return;
            if (selSpv === 'LP' && !isLP) return;
            if (selSpv === 'DK' && (isLK || isLP)) return;
          }

          // Exclude DC visits from chart (only count store/toko visits)
          const acc = (v.account || '').toUpperCase();
          const storeName = (v.namaToko || '').toUpperCase();
          if (acc.includes('DC') || storeName.includes('DC') || storeName.includes('GUDANG') || storeName.includes('DISTRIBUTION')) return;

          // Get month key YYYY-MM — use normalizeIsoDate for all format variants
          const rawDate = v.dateIso || v.date || v.tanggal || '';
          const isoDate = this.normalizeIsoDate(rawDate); // handles M/D/YYYY, DD/MM/YYYY, YYYY-MM-DD etc.
          if (!isoDate || isoDate.length < 7) return;
          const monthKey = isoDate.slice(0, 7); // e.g. "2026-09"

          visitsByMonth[monthKey] = (visitsByMonth[monthKey] || 0) + 1;
        });

        // Sort months chronologically
        const sortedMonths = Object.keys(visitsByMonth).sort();

        if (sortedMonths.length === 0) {
          // Fallback: show single bar with current data from spvSummary
          const now = new Date();
          const curLabel = `${BULAN_ID[now.getMonth()]} ${now.getFullYear()} (MTD)`;
          const cs = window.ChartService || (typeof ChartService !== 'undefined' ? ChartService : null);
          if (cs && typeof cs.renderSpvMtdChart === 'function') {
            cs.renderSpvMtdChart(el, {
              labels: [curLabel],
              rps: [summary.totalRpsToko || 0],
              visits: [summary.totalKunjunganToko || 0]
            }, isDark);
          }
          return;
        }

        // Build labels and data arrays
        const labels = [];
        const rpsValues = [];
        const visitValues = [];

        // Target RPS Toko dari akumulasi toko yang di-input MDS (summary.totalRpsToko)
        const totalRpsTarget = summary.totalRpsToko || 0;

        sortedMonths.forEach((mk, idx) => {
          const [yr, mo] = mk.split('-');
          const isLast = idx === sortedMonths.length - 1;
          const label = `${BULAN_ID[parseInt(mo, 10) - 1]} ${yr}${isLast ? ' (MTD)' : ''}`;
          labels.push(label);
          rpsValues.push(totalRpsTarget);
          visitValues.push(isLast && summary.totalKunjunganToko ? summary.totalKunjunganToko : visitsByMonth[mk]);
        });

        const cs = window.ChartService || (typeof ChartService !== 'undefined' ? ChartService : null);
        if (cs && typeof cs.renderSpvMtdChart === 'function') {
          cs.renderSpvMtdChart(el, { labels, rps: rpsValues, visits: visitValues }, isDark);
        }
      } catch (err) {
        console.warn('refreshSpvCharts warning:', err);
      }
    },

    exportSpvEvaluationToCSV() {
      const list = this.spvEvaluationList || [];
      if (list.length === 0) {
        alert('Tidak ada data evaluasi SPV untuk di-export.');
        return;
      }

      const rows = [
        ['EVALUASI KINERJA SPV & MTD KUNJUNGAN MDS'],
        ['Filter SPV:', this.filterSpv.spv, 'Tanggal Export:', new Date().toLocaleString('id-ID')],
        [],
        ['=== 1. HARI TOKO ==='],
        ['REGION/AREA', 'SPV', 'NAMA MDS', 'MODUL', 'ABSEN MASUK', 'ABSEN PULANG', 'JAM KERJA', 'RPS (TARGET)', '#KUNJUNGAN', '% TARGET'],
      ];

      list.forEach(item => {
        rows.push([
          `"${item.region}"`,
          `"${item.spvName}"`,
          `"${item.namaMds}"`,
          `"${item.modul}"`,
          `"${item.absenMasuk}"`,
          `"${item.absenPulang}"`,
          `${item.jamKerja} Jam`,
          item.rpsToko,
          item.kunjunganToko,
          `${item.pctToko}%`
        ]);
      });

      const sum = this.spvSummary;
      rows.push([
        'TOTAL (AVG)',
        '-',
        `${sum.totalMds} MDS`,
        '-',
        '-',
        '-',
        `${sum.avgJamKerja} Jam`,
        sum.totalRpsToko,
        sum.totalKunjunganToko,
        `${sum.avgPctToko}%`
      ]);

      rows.push([]);
      rows.push(['=== 2. HARI DC ===']);
      rows.push(['REGION/AREA', 'SPV', 'NAMA MDS', 'MODUL', 'ABSEN MASUK', 'ABSEN PULANG', 'JAM KERJA', 'RPS DC (TARGET)', '#KUNJUNGAN DC', '% TARGET DC']);

      list.forEach(item => {
        rows.push([
          `"${item.region}"`,
          `"${item.spvName}"`,
          `"${item.namaMds}"`,
          `"${item.modul}"`,
          `"${item.absenMasuk}"`,
          `"${item.absenPulang}"`,
          `${item.jamKerja} Jam`,
          item.rpsDc,
          item.kunjunganDc,
          `${item.pctDc}%`
        ]);
      });

      rows.push([
        'TOTAL (AVG)',
        '-',
        `${sum.totalMds} MDS`,
        '-',
        '-',
        '-',
        `${sum.avgJamKerja} Jam`,
        sum.totalRpsDc,
        sum.totalKunjunganDc,
        `${sum.avgPctDc}%`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Evaluasi_SPV_MTD_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    async downloadTableAsPng(elementId, baseName) {
      const cardEl = document.getElementById(elementId);
      if (!cardEl) return;
      if (!window.html2canvas) {
        alert('Library html2canvas belum selesai dimuat. Silakan refresh halaman.');
        return;
      }

      const isDc = elementId.includes('dc');
      const btnKey = isDc ? 'dc' : 'toko';
      const tableTitle = isDc ? 'HARI DC (Kunjungan Gudang/DC)' : 'HARI TOKO (Kunjungan Reguler)';
      
      this.isDownloadingPng = {
        key: btnKey,
        tableName: tableTitle,
        status: 'Sedang merender seluruh baris tabel...'
      };

      if (window.lucide) {
        this.$nextTick(() => { window.lucide.createIcons(); });
      }

      // Beri browser jeda 120ms agar tampilan modal overlay ter-render sempurna
      await new Promise(resolve => setTimeout(resolve, 120));

      try {
        const isDark = document.documentElement.classList.contains('dark');

        // Simpan state overflow asli
        const scrollableDiv = cardEl.querySelector('.overflow-x-auto');
        const origOverflow = scrollableDiv ? scrollableDiv.style.overflow : '';
        if (scrollableDiv) {
          scrollableDiv.style.overflow = 'visible';
        }

        // Render via html2canvas HD (2x scale)
        const canvas = await html2canvas(cardEl, {
          scale: 2, // 2x Resolution for crisp text
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          ignoreElements: (element) => element.classList && element.classList.contains('no-export')
        });

        if (scrollableDiv) {
          scrollableDiv.style.overflow = origOverflow;
        }

        if (this.isDownloadingPng) {
          this.isDownloadingPng.status = 'Menyimpan file ke perangkat...';
        }

        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const spvCode = (this.filterSpv && this.filterSpv.spv) || 'ALL';
        const filename = `${baseName}_${spvCode}_${dateStr}.png`;

        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Sedikit delay agar user melihat proses selesai & browser download handler aktif
        await new Promise(resolve => setTimeout(resolve, 400));
      } catch (err) {
        console.error('Failed to export table as PNG:', err);
        alert('Gagal mendownload gambar tabel: ' + (err.message || err));
      } finally {
        this.isDownloadingPng = null;
        if (window.lucide) {
          setTimeout(() => window.lucide.createIcons(), 50);
        }
      }
    },

    // =========================================================================
    // CATEGORY MEGA MENU (ALFAGIFT STYLE) METHODS
    // =========================================================================
    openCategoryMenu() {
      if (this.categoryMenuTimer) {
        clearTimeout(this.categoryMenuTimer);
        this.categoryMenuTimer = null;
      }
      this.showCategoryMenu = true;
      this.$nextTick(() => {
        if (window.lucide) lucide.createIcons();
      });
    },

    scheduleCloseCategoryMenu() {
      if (this.categoryMenuTimer) clearTimeout(this.categoryMenuTimer);
      this.categoryMenuTimer = setTimeout(() => {
        this.showCategoryMenu = false;
        this.categoryMenuTimer = null;
      }, 250);
    },

    cancelCloseCategoryMenu() {
      if (this.categoryMenuTimer) {
        clearTimeout(this.categoryMenuTimer);
        this.categoryMenuTimer = null;
      }
    },

    toggleCategoryMenu() {
      this.showCategoryMenu = !this.showCategoryMenu;
      if (this.showCategoryMenu) {
        this.$nextTick(() => {
          if (window.lucide) lucide.createIcons();
        });
      }
    },

    /**
     * ==============================================================================
     * FIREBASE AUTH & RBAC PERMISSIONS CONTROLLER METHODS
     * ==============================================================================
     */
    populateRbacUsers() {
      const list = Object.values(this.rbacMatrix || {})
        .filter(u => u && typeof u === 'object')
        .map((u, idx) => {
          if (!u.id || String(u.id).includes('undefined')) {
            u.id = `USER_${idx + 1}_${(u.email || 'usr').replace(/[^a-zA-Z0-9]/g, '_')}`;
          }
          if (!u.role) u.role = 'MDS';
          if (u.linkedCrew === undefined) u.linkedCrew = '';
          if (!u.permissions) {
            const preset = window.RBAC_ROLE_PRESETS && window.RBAC_ROLE_PRESETS[u.role]
              ? window.RBAC_ROLE_PRESETS[u.role].permissions
              : { kunjungan: true, absensi: true, jadwal: false, tokonasional: false, laporan: false, evaluasi: false };
            u.permissions = { ...preset };
          }
          if (!u.permissions.subTabs) {
            u.permissions.subTabs = window.getDefaultSubTabsForRole
              ? window.getDefaultSubTabsForRole(u.role)
              : { laporan: { rute: true, jadwal: true, absen: true, anomali: false }, evaluasi: { TOKO: true, DC: true } };
          }
          return u;
        });
      this.rbacUsers = list;
    },

    async initRbac() {
      if (window.FirebaseAuthService) {
        await window.FirebaseAuthService.init();
        window.FirebaseAuthService.onAuthStateChanged((user) => {
          this.currentUser = user;
          if (user && (user.isSuperAdmin || user.role === 'SUPERADMIN' || user.role === 'MANAGER')) {
            this.role = 'admin';
          } else if (user && user.role === 'SPV') {
            this.role = 'admin';
            const uMod = (user.modul || '').toUpperCase().trim();
            if (uMod && uMod !== 'ALL' && uMod !== 'NASIONAL') {
              this.selectedModul = user.modul;
              if (this.filterAbsensi) this.filterAbsensi.modul = user.modul;
              if (this.filterJadwal) this.filterJadwal.modul = user.modul;
            } else {
              this.selectedModul = 'ALL';
              if (this.filterAbsensi) this.filterAbsensi.modul = 'ALL';
              if (this.filterJadwal) this.filterJadwal.modul = 'ALL';
            }
          } else if (user && user.role === 'MDS') {
            this.role = 'mds';
            const mdsCrew = this.getCurrentMdsCrewName();
            if (mdsCrew) {
              this.selectedCrew = mdsCrew;
              this.selectedCrews = [mdsCrew];
              if (this.filterJadwal) {
                this.filterJadwal.selectedCrew = mdsCrew;
                this.filterJadwal.appliedSelectedCrew = mdsCrew;
              }
            }
            if (user.modul && user.modul !== 'ALL') {
              this.selectedModul = user.modul;
              if (this.filterAbsensi) this.filterAbsensi.modul = user.modul;
              if (this.filterJadwal) this.filterJadwal.modul = user.modul;
            }
          } else {
            this.role = 'mds';
          }
          this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
        });

        this.rbacMatrix = await window.FirebaseAuthService.loadPermissionsMatrix(this.masterUser || []);
        this.populateRbacUsers();

        // Selaraskan currentUser dengan data permissions_matrix terbaru dari cloud/storage
        if (this.currentUser && this.currentUser.email && this.rbacMatrix) {
          const freshMatrixUser = this.rbacMatrix[this.currentUser.email.toLowerCase()];
          if (freshMatrixUser) {
            if (Array.isArray(freshMatrixUser.managedMds) && freshMatrixUser.managedMds.length > 0) {
              this.currentUser.managedMds = [...freshMatrixUser.managedMds];
            }
            if (freshMatrixUser.role) {
              this.currentUser.role = freshMatrixUser.role;
            }
            if (freshMatrixUser.linkedCrew && !this.currentUser.linkedCrew) {
              this.currentUser.linkedCrew = freshMatrixUser.linkedCrew;
            }
          }
        }
      }
    },

    syncRbacMatrixFromUsers() {
      const map = {};
      (this.rbacUsers || []).forEach(u => {
        if (u && u.email) {
          map[u.email.toLowerCase()] = u;
        }
      });
      this.rbacMatrix = map;
    },

    openLoginModal() {
      this.userDropdownOpen = false;
      window.location.replace('../index.html');
    },

    closeLoginModal() {
      this.isLoginModalOpen = false;
      this.loginError = '';
    },

    async performFirebaseLogin() {
      if (!this.loginEmail) {
        this.loginError = 'Silakan masukkan email atau nama pengguna.';
        return;
      }
      this.loginLoading = true;
      this.loginError = '';

      try {
        const res = await window.FirebaseAuthService.login(this.loginEmail, this.loginPassword);
        if (res.success) {
          this.currentUser = res.user;
          this.isLoginModalOpen = false;
          if (res.user.role === 'SUPERADMIN' || res.user.isSuperAdmin || res.user.role === 'MANAGER') {
            this.role = 'admin';
          } else if (res.user.role === 'SPV') {
            this.role = 'admin';
          } else {
            this.role = 'mds';
          }
          if (!this.canAccessTab(this.activeTab)) {
            this.navigateToTab(this.getFirstAllowedTab());
          }
        } else {
          this.loginError = res.error || 'Login gagal. Periksa kembali email dan kata sandi.';
        }
      } catch (err) {
        this.loginError = err.message || 'Terjadi kesalahan pada sistem otentikasi.';
      } finally {
        this.loginLoading = false;
      }
    },

    async submitLogin() {
      // Alias for performFirebaseLogin
      return this.performFirebaseLogin();
    },

    async quickLoginUser(type) {
      this.loginLoading = true;
      this.loginError = '';
      try {
        let t = type;
        if (type === 'superadmin') t = 'BU_OCI';
        else if (type === 'spv') t = 'SPV_IBNU';
        else if (type === 'mds') t = 'MDS_GHOZALI';

        const res = await window.FirebaseAuthService.quickLogin(t);
        if (res.success) {
          this.currentUser = res.user;
          this.isLoginModalOpen = false;
          this.userDropdownOpen = false;
          if (res.user.role === 'SUPERADMIN' || res.user.isSuperAdmin || res.user.role === 'MANAGER') {
            this.role = 'admin';
          } else if (res.user.role === 'SPV') {
            this.role = 'admin';
          } else {
            this.role = 'mds';
          }
          if (!this.canAccessTab(this.activeTab)) {
            this.navigateToTab(this.getFirstAllowedTab());
          }
        }
      } finally {
        this.loginLoading = false;
      }
    },

    performLogout() {
      // 1. Bersihkan sesi secara instan
      localStorage.removeItem('cimory_portal_active_session');
      localStorage.removeItem('cimory_mock_user');
      sessionStorage.removeItem('cimory_portal_session');
      this.currentUser = null;
      this.userDropdownOpen = false;

      // 2. Sign out Firebase secara background non-blocking
      if (window.FirebaseAuthService && window.FirebaseAuthService.auth) {
        try { window.FirebaseAuthService.auth.signOut().catch(() => {}); } catch(e) {}
      }

      // 3. Redirect instan ke portal login
      window.location.replace('../index.html');
    },

    isSuperAdmin() {
      return window.FirebaseAuthService ? window.FirebaseAuthService.isSuperAdmin(this.currentUser ? this.currentUser.email : '') : false;
    },

    canAccessTab(tabId) {
      if (tabId === 'absen') return true;
      if (tabId === 'rbac' || tabId === 'control_panel') {
        return this.currentUser && (this.currentUser.role === 'SUPERADMIN' || this.currentUser.isSuperAdmin || this.currentUser.role === 'MANAGER');
      }
      if (!this.currentUser) return false;
      if (this.currentUser.role === 'SUPERADMIN' || this.currentUser.isSuperAdmin) return true;
      if (this.currentUser.role === 'MANAGER' || this.currentUser.role === 'SPV') return true;
      if (this.currentUser.permissions && this.currentUser.permissions[tabId] !== undefined) {
        return Boolean(this.currentUser.permissions[tabId]);
      }
      return window.FirebaseAuthService ? window.FirebaseAuthService.hasAccessToTab(this.currentUser, tabId) : false;
    },

    canAccessSubTab(parentTab, subTabId) {
      if (!this.currentUser) return false;
      if (this.currentUser.role === 'SUPERADMIN' || this.currentUser.isSuperAdmin || this.currentUser.role === 'MANAGER') return true;

      // 1. Cek izin parent tab dulu
      if (!this.canAccessTab(parentTab)) return false;

      // 2. Cek izin sub-tab spesifik jika ada di permissions.subTabs
      const perms = this.currentUser.permissions;
      if (perms && perms.subTabs && perms.subTabs[parentTab]) {
        if (perms.subTabs[parentTab][subTabId] !== undefined) {
          return Boolean(perms.subTabs[parentTab][subTabId]);
        }
      }

      // Fallback: anomali tertutup bagi MDS secara default
      if (parentTab === 'laporan' && subTabId === 'anomali') {
        return this.currentUser.role !== 'MDS';
      }

      return true;
    },

    getFirstAllowedReportSubTab() {
      const tabs = ['rute', 'jadwal', 'absen', 'anomali'];
      for (const t of tabs) {
        if (this.canAccessSubTab('laporan', t)) return t;
      }
      return 'rute';
    },

    checkTabAccess(tabId) {
      if (!this.canAccessTab(tabId)) {
        this.unauthorizedTargetTab = tabId;
        this.unauthorizedAttemptTab = tabId;
        this.unauthorizedModalOpen = true;
        return false;
      }
      return true;
    },

    getFirstAllowedTab() {
      const tabs = ['kunjungan', 'absensi', 'jadwal', 'tokonasional', 'laporan', 'evaluasi', 'galeri', 'simulasi'];
      for (const t of tabs) {
        if (this.canAccessTab(t)) return t;
      }
      return 'kunjungan';
    },

    // RBAC Control Panel Table Management
    get filteredRbacUsers() {
      let list = (this.rbacUsers || []).filter(u => u && typeof u === 'object');

      const roleFilter = this.rbacFilterRole || this.rbacRoleFilter || 'ALL';
      if (roleFilter !== 'ALL') {
        list = list.filter(u => u && u.role === roleFilter);
      }

      const modulFilter = this.rbacFilterModul || this.rbacModulFilter || 'ALL';
      if (modulFilter !== 'ALL') {
        list = list.filter(u => u && u.modul === modulFilter);
      }

      const searchQuery = (this.rbacSearch || this.rbacSearchText || '').trim().toLowerCase();
      if (searchQuery) {
        list = list.filter(u => 
          u && (
            (u.name && String(u.name).toLowerCase().includes(searchQuery)) ||
            (u.email && String(u.email).toLowerCase().includes(searchQuery)) ||
            (u.modul && String(u.modul).toLowerCase().includes(searchQuery)) ||
            (u.jabatan && String(u.jabatan).toLowerCase().includes(searchQuery))
          )
        );
      }

      // Sort: Superadmin first, then Manager, then SPV, then MDS, alphabetically by name
      const rolePriority = { SUPERADMIN: 1, MANAGER: 2, SPV: 3, MDS: 4, CUSTOM: 5 };
      const sorted = [...list].sort((a, b) => {
        const pA = (a && a.role && rolePriority[a.role]) || 99;
        const pB = (b && b.role && rolePriority[b.role]) || 99;
        if (pA !== pB) return pA - pB;
        return String((a && a.name) || '').localeCompare(String((b && b.name) || ''));
      });

      sorted.forEach((u, i) => {
        if (!u.id) u.id = u.email || `usr_${i}`;
      });

      return sorted;
    },

    async changeUserRole(userId, newRole) {
      const u = (this.rbacUsers || []).find(x => x && (x.id === userId || x.email === userId));
      if (!u) return;
      u.role = newRole;
      const preset = window.RBAC_ROLE_PRESETS && window.RBAC_ROLE_PRESETS[newRole];
      if (preset && preset.permissions) {
        u.permissions = { ...preset.permissions };
      }
      if (newRole === 'MDS' && !u.linkedCrew) {
        const exactMatch = (this.availableOfficialCrews || []).find(c => c.name.toUpperCase() === (u.name || '').toUpperCase().trim());
        if (exactMatch) {
          u.linkedCrew = exactMatch.name;
          if (exactMatch.modul && exactMatch.modul !== '-') u.modul = exactMatch.modul;
        }
      }
      this.syncRbacMatrixFromUsers();
      if (window.FirebaseAuthService) {
        try {
          await window.FirebaseAuthService.savePermissions(this.rbacMatrix);
        } catch(e) { console.warn('Auto-save role notice:', e); }
      }
    },

    async changeUserLinkedCrew(userId, crewName) {
      const u = (this.rbacUsers || []).find(x => x && (x.id === userId || x.email === userId));
      if (!u) return;
      u.linkedCrew = (crewName || '').trim();

      // Jika crew personil dipilih dan punya modul resmi, sinkronkan ke modul akun
      if (u.linkedCrew) {
        const found = (this.availableOfficialCrews || []).find(c => c.name.toUpperCase() === u.linkedCrew.toUpperCase());
        if (found && found.modul && found.modul !== '-' && (!u.modul || u.modul === 'ALL')) {
          u.modul = found.modul;
        }
      }
      this.syncRbacMatrixFromUsers();
      if (window.FirebaseAuthService) {
        try {
          await window.FirebaseAuthService.savePermissions(this.rbacMatrix);
        } catch(e) { console.warn('Auto-save linkedCrew notice:', e); }
      }
    },

    getCurrentMdsCrewName() {
      if (!this.currentUser) return '';
      // 1. Linked crew from Super Admin RBAC binding
      if (this.currentUser.linkedCrew && this.currentUser.linkedCrew.trim()) {
        return this.currentUser.linkedCrew.trim();
      }
      // 2. Check in rbacMatrix
      if (this.rbacMatrix && this.currentUser.email) {
        const m = this.rbacMatrix[this.currentUser.email.toLowerCase()];
        if (m && m.linkedCrew && m.linkedCrew.trim()) {
          return m.linkedCrew.trim();
        }
      }
      // 3. Fallback to displayName or name
      return (this.currentUser.displayName || this.currentUser.name || '').trim();
    },

    get availableOfficialCrews() {
      if (this._cachedOfficialCrews && this._cachedOfficialCrews.length > 0) {
        return this._cachedOfficialCrews;
      }
      return this.computeOfficialCrews();
    },

    get filteredOfficialCrews() {
      const q = (this.crewDropdownSearch || '').toLowerCase().trim();
      const list = this.availableOfficialCrews || [];
      if (!q) return list;
      const tokens = q.split(/\s+/).filter(Boolean);
      return list.filter(c => {
        const str = `${c.name || ''} ${c.code || ''} ${c.modul || ''} ${c.label || ''}`.toLowerCase();
        return tokens.every(tok => str.includes(tok));
      });
    },

    get filteredNewUserCrews() {
      const q = (this.newUserCrewSearch || '').toLowerCase().trim();
      const list = this.availableOfficialCrews || [];
      if (!q) return list;
      const tokens = q.split(/\s+/).filter(Boolean);
      return list.filter(c => {
        const str = `${c.name || ''} ${c.code || ''} ${c.modul || ''} ${c.label || ''}`.toLowerCase();
        return tokens.every(tok => str.includes(tok));
      });
    },

    openCrewDropdown(userId) {
      this.activeCrewDropdownUserId = userId;
      this.crewDropdownSearch = '';
      this.$nextTick(() => {
        const input = document.getElementById('crewDropdownSearchInput_' + userId) || document.getElementById('crewDropdownSearchInputGlobal');
        if (input) input.focus();
        if (window.lucide) lucide.createIcons();
      });
    },

    closeCrewDropdown() {
      this.activeCrewDropdownUserId = null;
      this.crewDropdownSearch = '';
    },

    computeOfficialCrews() {
      const crewMap = new Map();
      const nonMdsKeywords = ['VACANT', 'OPEN', 'RESIGN', 'ADMIN', 'EMPTY', 'LEADER', 'CIMORY', 'TEST', '-'];

      // 0. Dari Master 75 MDS Lengkap Nasional (MDS_PERSONNEL_DATA)
      if (typeof window !== 'undefined' && Array.isArray(window.MDS_PERSONNEL_DATA)) {
        window.MDS_PERSONNEL_DATA.forEach(p => {
          const rawName = (p.nama || '').trim();
          const rawCode = (p.id || '').trim();
          const rawMod = (p.modul || '').trim().toUpperCase();
          if (!rawName) return;
          const upper = rawName.toUpperCase();
          if (nonMdsKeywords.some(kw => upper.includes(kw))) return;

          if (!crewMap.has(upper)) {
            crewMap.set(upper, {
              name: rawName,
              code: rawCode,
              modul: rawMod,
              label: `${rawName}${rawCode ? ' (' + rawCode + ')' : ''}${rawMod ? ' - ' + rawMod : ''}`
            });
          }
        });
      }

      // 1. Dari masterUser
      if (Array.isArray(this.masterUser) && this.masterUser.length > 0) {
        this.masterUser.forEach(u => {
          const rawName = (u.nama || u.NAMA || u.Nama || '').trim();
          const rawCode = (u.id || u.ID || u.kode || u.KODE || u.kodeCrew || '').trim();
          const rawMod = (u.modul || u.MODUL || '').trim().toUpperCase();
          if (!rawName) return;
          const upper = rawName.toUpperCase();
          if (nonMdsKeywords.some(kw => upper.includes(kw))) return;

          if (!crewMap.has(upper)) {
            const finalMod = rawMod || (this.getCrewOfficialModul ? this.getCrewOfficialModul(rawName, '-') : '') || '';
            crewMap.set(upper, {
              name: rawName,
              code: rawCode,
              modul: finalMod,
              label: `${rawName}${rawCode ? ' (' + rawCode + ')' : ''}${finalMod ? ' - ' + finalMod : ''}`
            });
          }
        });
      }

      // 2. Tambahan dari visits & absensi (hanya nama personil manusia, lewati kode toko/angka)
      const extraCrews = new Set();
      (this.visits || []).forEach(v => {
        const n = (v.namaCrew || '').trim();
        if (n && !/^\d/.test(n) && !nonMdsKeywords.some(kw => n.toUpperCase().includes(kw))) {
          extraCrews.add(n);
        }
      });
      (this.absensi || []).forEach(a => {
        const n = (a.namaCrew || '').trim();
        if (n && !/^\d/.test(n) && !nonMdsKeywords.some(kw => n.toUpperCase().includes(kw))) {
          extraCrews.add(n);
        }
      });

      extraCrews.forEach(n => {
        const upper = n.toUpperCase();
        if (!crewMap.has(upper)) {
          const mod = (this.getCrewOfficialModul ? this.getCrewOfficialModul(n, '-') : '') || '';
          crewMap.set(upper, {
            name: n,
            code: '',
            modul: mod,
            label: `${n}${mod ? ' - ' + mod : ''}`
          });
        }
      });

      const result = Array.from(crewMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      this._cachedOfficialCrews = result;
      return result;
    },

    toggleUserPerm(userId, permKey) {
      const u = (this.rbacUsers || []).find(x => x && (x.id === userId || x.email === userId));
      if (!u) return;
      if (!u.permissions) u.permissions = {};
      u.permissions[permKey] = !u.permissions[permKey];
      this.syncRbacMatrixFromUsers();
    },

    setUserAllPerms(userId, state) {
      const u = (this.rbacUsers || []).find(x => x && (x.id === userId || x.email === userId));
      if (!u) return;
      if (!u.permissions) u.permissions = {};
      ['kunjungan', 'absensi', 'jadwal', 'tokonasional', 'laporan', 'evaluasi', 'galeri', 'simulasi'].forEach(tab => {
        u.permissions[tab] = Boolean(state);
      });
      this.syncRbacMatrixFromUsers();
    },

    // ─────────────────────────────────────────────────────────────────────────
    // SUB-TAB CONFIG MODAL
    // ─────────────────────────────────────────────────────────────────────────

    openSubTabConfig(userId) {
      const u = (this.rbacUsers || []).find(x => x && (x.id === userId || x.email === userId));
      if (!u) return;
      if (!u.permissions) u.permissions = {};
      const defaults = window.getDefaultSubTabsForRole
        ? window.getDefaultSubTabsForRole(u.role)
        : { laporan: { rute: true, jadwal: true, absen: true, anomali: false }, evaluasi: { TOKO: true, DC: true }, galeri: { katalog: true, filter: true, download: true }, simulasi: { optimasi: true, editor: true, export: true } };
      
      if (!u.permissions.subTabs) {
        u.permissions.subTabs = JSON.parse(JSON.stringify(defaults));
      } else {
        ['laporan', 'evaluasi', 'galeri', 'simulasi'].forEach(cat => {
          if (!u.permissions.subTabs[cat]) {
            u.permissions.subTabs[cat] = { ...(defaults[cat] || {}) };
          }
        });
      }
      this.activeSubTabConfigUser = u;
      this.showSubTabConfigModal = true;
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    closeSubTabConfig() {
      this.showSubTabConfigModal = false;
      this.activeSubTabConfigUser = null;
    },

    toggleUserSubTabPerm(parentTab, subTabId) {
      const u = this.activeSubTabConfigUser;
      if (!u) return;
      if (!u.permissions) u.permissions = {};
      if (!u.permissions.subTabs) u.permissions.subTabs = {};
      if (!u.permissions.subTabs[parentTab]) u.permissions.subTabs[parentTab] = {};
      u.permissions.subTabs[parentTab][subTabId] = !u.permissions.subTabs[parentTab][subTabId];
      // Sync ke rbacUsers agar perubahan tercermin di tabel utama juga
      const idx = (this.rbacUsers || []).findIndex(x => x && (x.id === u.id || x.email === u.email));
      if (idx >= 0) this.rbacUsers[idx] = { ...u };
      this.syncRbacMatrixFromUsers();
    },

    /**
     * Helper: modul/area kerja dari currentUser
     */
    getSpvModul() {
      if (!this.currentUser) return '';
      return (this.currentUser.modul || this.currentUser.moduleOrArea || '').toUpperCase().trim();
    },

    /**
     * Helper: kembalikan array linkedCrew dari managedMds milik currentUser (SPV)
     * Dipakai oleh semua RLS filter getters.
     */
    getSpvManagedCrews() {
      if (!this.currentUser || this.currentUser.role !== 'SPV') return [];
      let list = Array.isArray(this.currentUser.managedMds) ? [...this.currentUser.managedMds] : [];
      if (list.length === 0 && this.currentUser.email) {
        const u = (this.rbacUsers || []).find(x => x && x.email && x.email.toLowerCase() === this.currentUser.email.toLowerCase());
        if (u && Array.isArray(u.managedMds) && u.managedMds.length > 0) {
          list = [...u.managedMds];
          this.currentUser.managedMds = list;
        } else if (this.rbacMatrix && this.rbacMatrix[this.currentUser.email.toLowerCase()]) {
          const mu = this.rbacMatrix[this.currentUser.email.toLowerCase()];
          if (mu && Array.isArray(mu.managedMds) && mu.managedMds.length > 0) {
            list = [...mu.managedMds];
            this.currentUser.managedMds = list;
          }
        }
      }

      // Jika belum di-assign spesifik di RBAC, otomatis ambil SEMUA personil di Modul/Wilayah SPV
      if (list.length === 0) {
        const spvMod = this.getSpvModul();
        if (spvMod && spvMod !== 'ALL' && spvMod !== 'NASIONAL') {
          const official = this.availableOfficialCrews || [];
          const modCrews = official.filter(c => {
            const cMod = (c.modul || '').toUpperCase().trim();
            return cMod && (cMod === spvMod || cMod.startsWith(spvMod) || spvMod.startsWith(cMod));
          });
          if (modCrews.length > 0) {
            list = modCrews.map(c => c.name);
          }
        }
      }
      return list;
    },

    openSpvTeamConfig(userId) {
      let u = (this.rbacUsers || []).find(x => x && (x.id === userId || x.email === userId || (x.email && userId && x.email.toLowerCase() === String(userId).toLowerCase())));
      if (!u && this.currentUser && (this.currentUser.id === userId || this.currentUser.email === userId || (this.currentUser.email && userId && this.currentUser.email.toLowerCase() === String(userId).toLowerCase()))) {
        u = this.currentUser;
      }
      if (!u) return;
      if (!Array.isArray(u.managedMds)) u.managedMds = [];
      this.activeSpvTeamUser = u;
      this.showSpvTeamModal = true;
    },

    closeSpvTeamModal() {
      this.showSpvTeamModal = false;
      this.activeSpvTeamUser = null;
      this.spvMdsSearch = '';
    },

    toggleSpvMdsMember(crewName) {
      const u = this.activeSpvTeamUser;
      if (!u || !crewName) return;
      const k = String(crewName).toUpperCase().trim();

      // Cek apakah personil sudah dikelola oleh SPV lain
      const otherSpv = (this.rbacUsers || []).find(spv =>
        spv && spv.role === 'SPV' &&
        (spv.id !== u.id && spv.email !== u.email) &&
        Array.isArray(spv.managedMds) &&
        spv.managedMds.some(m => String(m).toUpperCase().trim() === k)
      );
      if (otherSpv) {
        alert(`Personil "${crewName}" sudah dipilih dan dikelola oleh ${otherSpv.name || otherSpv.email}!`);
        return;
      }

      if (!Array.isArray(u.managedMds)) u.managedMds = [];
      const idx = u.managedMds.indexOf(crewName);
      if (idx >= 0) {
        u.managedMds.splice(idx, 1);
      } else {
        u.managedMds.push(crewName);
      }
    },

    async saveSpvTeam() {
      const u = this.activeSpvTeamUser;
      if (!u) return;

      const userIdx = (this.rbacUsers || []).findIndex(x => x && (x.id === u.id || (x.email && u.email && x.email.toLowerCase() === u.email.toLowerCase())));
      if (userIdx >= 0) {
        this.rbacUsers[userIdx] = { ...this.rbacUsers[userIdx], managedMds: [...(u.managedMds || [])] };
      } else {
        this.rbacUsers.push({ ...u, managedMds: [...(u.managedMds || [])] });
      }

      if (this.currentUser && (this.currentUser.id === u.id || (this.currentUser.email && u.email && this.currentUser.email.toLowerCase() === u.email.toLowerCase()))) {
        this.currentUser.managedMds = [...(u.managedMds || [])];
        const rawSession = localStorage.getItem('cimory_portal_active_session');
        if (rawSession) {
          try {
            const s = JSON.parse(rawSession);
            s.managedMds = this.currentUser.managedMds;
            localStorage.setItem('cimory_portal_active_session', JSON.stringify(s));
          } catch(e) {}
        }
      }

      this.syncRbacMatrixFromUsers();
      await this.saveRbacChanges();
      this.closeSpvTeamModal();

      // Refresh marker map seketika agar langsung tampil
      this.$nextTick(() => {
        if (typeof MapService !== 'undefined' && MapService.renderVisitsOnMap) {
          if (MapService.mapInstance) MapService.mapInstance.invalidateSize();
          MapService.renderVisitsOnMap(this.filteredVisits);
        }
      });
    },

    /** MDS yang bisa di-assign ke SPV: gabungan dari master official crews + akun MDS RBAC */
    get assignableMdsList() {
      const map = new Map();

      // 1. Dari master official crews (seluruh personil MDS di rute/jadwal)
      if (Array.isArray(this.availableOfficialCrews)) {
        this.availableOfficialCrews.forEach(c => {
          if (!c || !c.name) return;
          const k = c.name.toUpperCase().trim();
          map.set(k, {
            id: c.name,
            name: c.name,
            linkedCrew: c.name,
            code: c.code || '',
            modul: c.modul || ''
          });
        });
      }

      // 2. Dari rbacUsers yang punya linkedCrew
      if (Array.isArray(this.rbacUsers)) {
        this.rbacUsers.forEach(u => {
          if (!u || u.role !== 'MDS' || !u.linkedCrew) return;
          const k = u.linkedCrew.toUpperCase().trim();
          if (!map.has(k)) {
            map.set(k, {
              id: u.id || u.linkedCrew,
              name: u.name || u.linkedCrew,
              linkedCrew: u.linkedCrew,
              code: '',
              modul: u.modul || ''
            });
          }
        });
      }

      // 3. Petakan MDS yang sudah dikelola oleh SPV (dari rbacUsers, rbacMatrix, dan currentUser)
      const activeSpv = this.activeSpvTeamUser;
      const assignedMap = new Map();
      const registerSpvCrews = (spv) => {
        if (!spv || spv.role !== 'SPV' || !Array.isArray(spv.managedMds)) return;
        spv.managedMds.forEach(crew => {
          if (!crew) return;
          const k = String(crew).toUpperCase().trim();
          if (!assignedMap.has(k)) {
            assignedMap.set(k, {
              id: spv.id || spv.email,
              email: spv.email,
              name: spv.name || spv.displayName || spv.email || 'SPV Lain'
            });
          }
        });
      };

      (this.rbacUsers || []).forEach(registerSpvCrews);
      if (this.rbacMatrix) Object.values(this.rbacMatrix).forEach(registerSpvCrews);
      if (this.currentUser && this.currentUser.role === 'SPV') registerSpvCrews(this.currentUser);

      const activeManagedMds = (activeSpv && Array.isArray(activeSpv.managedMds)) ? activeSpv.managedMds : [];

      let list = Array.from(map.values()).map(item => {
        const k = (item.linkedCrew || item.name || '').toUpperCase().trim();
        const assignedSpv = assignedMap.get(k);
        let assignedToOther = false;
        let assignedSpvName = '';
        const isCurrentTeam = activeManagedMds.some(m => String(m).toUpperCase().trim() === k);

        if (assignedSpv) {
          const isOwn = activeSpv && (
            (activeSpv.id && assignedSpv.id && activeSpv.id === assignedSpv.id) ||
            (activeSpv.email && assignedSpv.email && activeSpv.email.toLowerCase() === assignedSpv.email.toLowerCase())
          );
          if (!isOwn) {
            assignedToOther = true;
            assignedSpvName = assignedSpv.name;
          }
        }
        return {
          ...item,
          isCurrentTeam,
          assignedToOther,
          assignedSpvName
        };
      }).sort((a, b) => {
        // Anggota tim saat ini selalu di urutan paling atas
        if (a.isCurrentTeam && !b.isCurrentTeam) return -1;
        if (!a.isCurrentTeam && b.isCurrentTeam) return 1;
        // Yang dikelola SPV lain ditaruh di bawah
        if (a.assignedToOther && !b.assignedToOther) return 1;
        if (!a.assignedToOther && b.assignedToOther) return -1;
        return (a.name || '').localeCompare(b.name || '');
      });

      // Filter pencarian
      if (this.spvMdsSearch && this.spvMdsSearch.trim()) {
        const q = this.spvMdsSearch.toUpperCase().trim();
        list = list.filter(m =>
          (m.name || '').toUpperCase().includes(q) ||
          (m.linkedCrew || '').toUpperCase().includes(q) ||
          (m.code || '').toUpperCase().includes(q) ||
          (m.modul || '').toUpperCase().includes(q)
        );
      }

      return list;
    },

    deleteUser(userId) {
      const u = (this.rbacUsers || []).find(x => x && (x.id === userId || x.email === userId));
      if (!u) return;
      if (confirm(`Yakin ingin menghapus personil ${u.name} dari matriks hak akses?`)) {
        this.rbacUsers = (this.rbacUsers || []).filter(x => x && x.id !== userId && x.email !== userId);
        this.syncRbacMatrixFromUsers();
      }
    },

    resetRbacToDefault() {
      if (confirm('Bersihkan seluruh akun auto-seed dan hanya tampilkan akun Super Admin serta user terdaftar/approved?')) {
        const matrix = {};
        if (window.FirebaseAuthService) {
          window.FirebaseAuthService._syncWithPortalApprovedUsers(matrix);
          window.FirebaseAuthService._ensureSuperAdminsInMatrix(matrix);
        }
        this.rbacMatrix = matrix;
        this.populateRbacUsers();
        localStorage.setItem('cimory_rbac_matrix', JSON.stringify(matrix));
        alert('✅ Matriks berhasil dibersihkan! Hanya akun sah/approved yang ditampilkan.');
      }
    },

    async saveRbacChanges() {
      this.rbacIsSaving = true;
      this.isSavingRbac = true;
      try {
        this.syncRbacMatrixFromUsers();
        if (window.FirebaseAuthService) {
          await window.FirebaseAuthService.savePermissions(this.rbacMatrix);
        }
        alert('✅ Matriks hak akses berhasil disimpan ke Firebase & Cache Lokal!');
      } catch (err) {
        alert('❌ Gagal menyimpan hak akses: ' + err.message);
      } finally {
        this.rbacIsSaving = false;
        this.isSavingRbac = false;
      }
    },

    onNewUserRolePresetChange() {
      const preset = window.RBAC_ROLE_PRESETS && window.RBAC_ROLE_PRESETS[this.newUserForm.role];
      if (preset && preset.permissions) {
        this.newUserForm.permissions = { ...preset.permissions };
      }
    },

    submitAddUser() {
      if (!this.newUserForm.name || !this.newUserForm.email) {
        alert('Nama dan Email personil wajib diisi!');
        return;
      }
      const emailKey = this.newUserForm.email.toLowerCase().trim();
      const existing = (this.rbacUsers || []).find(x => x && x.email && x.email.toLowerCase() === emailKey);
      if (existing) {
        alert('Email personil sudah terdaftar di matriks!');
        return;
      }
      const newUser = {
        id: 'USER_' + Date.now(),
        name: this.newUserForm.name.trim(),
        email: emailKey,
        modul: this.newUserForm.modul,
        jabatan: this.newUserForm.role === 'MANAGER' ? 'Manager' : (this.newUserForm.role === 'SPV' ? 'Supervisor' : (this.newUserForm.role === 'SUPERADMIN' ? 'Super Admin' : 'Merchandiser')),
        role: this.newUserForm.role,
        linkedCrew: this.newUserForm.linkedCrew || '',
        permissions: { ...(this.newUserForm.permissions || {}) },
        updatedAt: new Date().toISOString(),
        updatedBy: this.currentUser ? this.currentUser.displayName : 'Super Admin'
      };
      this.rbacUsers.unshift(newUser);
      this.syncRbacMatrixFromUsers();
      this.showAddUserModal = false;
      this.newUserForm = {
        name: '',
        email: '',
        modul: 'ALL',
        role: 'MDS',
        linkedCrew: '',
        jabatan: 'Merchandiser',
        permissions: {
          kunjungan: true,
          absensi: true,
          jadwal: false,
          tokonasional: false,
          laporan: false,
          evaluasi: false,
          galeri: false,
          simulasi: false
        }
      };
      alert('✅ Personil baru berhasil ditambahkan ke matriks hak akses!');
    },

    addNewUserToMatrix() {
      return this.submitAddUser();
    },

    navigateToTab(tabName, subTab = null) {
      // Security Check: Gate tab access based on RBAC permissions
      if (!this.canAccessTab(tabName)) {
        this.unauthorizedTargetTab = tabName;
        this.unauthorizedAttemptTab = tabName;
        this.unauthorizedModalOpen = true;
        this.showCategoryMenu = false;
        return;
      }

      this.activeTab = tabName;
      if (tabName === 'rbac') {
        if (!this.rbacUsers || this.rbacUsers.length === 0) {
          if (this.masterUser && this.masterUser.length > 0 && window.FirebaseAuthService) {
            window.FirebaseAuthService.loadPermissionsMatrix(this.masterUser).then(matrix => {
              this.rbacMatrix = matrix;
              this.populateRbacUsers();
              this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
            });
          } else {
            this.populateRbacUsers();
          }
        }
      }
      if (tabName === 'laporan' && subTab) {
        this.reportTableSubTab = subTab;
        if (subTab === 'anomali' && this.anomalyModal) {
          this.anomalyModal.activeTab = 'absen_no_visit';
        }
      }
      this.showCategoryMenu = false;
      if (tabName === 'evaluasi') {
        setTimeout(() => {
          this.refreshSpvCharts();
          if (window.lucide) lucide.createIcons();
        }, 100);
      } else {
        this.$nextTick(() => {
          if (window.lucide) lucide.createIcons();
        });
      }
    }
  };
}


