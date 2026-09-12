/**
 * ==============================================================================
 * CIMORY RETAIL OPS - ROUTE SIMULATOR CONTROLLER (ALPINE.JS & LEAFLET)
 * Interactive UI, Map Visualization, Workload Balancer, & SheetJS Exporter
 * ==============================================================================
 */

document.addEventListener('alpine:init', () => {
  Alpine.data('routeSimulatorApp', () => ({
    // Loading State
    isLoading: true,
    loadingMessage: 'Memuat data personil MDS & master toko...',

    // Theme
    theme: localStorage.getItem('route_sim_theme') || 'light',

    // Simulation Parameters
    params: {
      storesPerDay: 20,
      regularDays: 21,
      dcDays: 4,
      dcPerDay: 10,
      maxTravelMins: 60,
      maxRadiusKm: 25
    },

    // Raw Datasets
    rawPersonnel: [],
    rawStores: [],

    // Scope Selection ('JAWA' | 'LUAR_PULAU' | 'NASIONAL')
    selectedScope: 'JAWA',

    // Simulation Results
    simulationResult: null,
    selectedRegion: 'ALL',
    selectedCity: 'ALL',
    selectedStatus: 'ALL', // 'ALL' | 'ACTIVE' | 'VACANT'
    searchQuery: '',

    // Detail View & Table Controls
    selectedMds: null,
    selectedDayIndex: 1, // 1 s/d 25
    showPerdinModal: false,
    showMdsDrawer: false,
    showParamAccordion: false, // Accordion default collapsed
    showAppMenu: false, // Dropdown switcher for 5 app modules
    tableSearchQuery: '',
    tableFilterType: 'ALL', // 'ALL' | 'PERDIN' | 'NON_PERDIN' | 'DC'
    tableScope: 'DAY', // 'DAY' | 'MONTH'

    // Google Earth Multi-Select & Places Tree State
    selectedMdsIds: [], // Multi-selected MDS IDs rendered simultaneously on map
    expandedMdsIds: [], // Expanded tree node IDs in Places panel
    hiddenDaysMap: {},  // Map of 'mdsId_dayNum' -> true if hidden
    hiddenHomeMap: {},  // Map of 'mdsId' -> true if hidden
    placesTreeSearch: '',
    showPlacesSidebar: true,
    showAllDaysOnMap: false, // Toggle: active day only vs all checked 25 days

    // Interactive Store & Day Route Swapping Modal
    showSwapModal: false,
    customSwaps: [], // Persistent swap history log in localStorage
    swapData: {
      mode: 'STORE', // 'STORE' | 'DAY_ROUTE'
      store: null,
      sourceMdsId: '',
      sourceDayNum: 1,
      targetMdsId: '',
      targetDayNum: 1
    },

    // Global Toast Feedback Notification
    toastMessage: '',
    toastVisible: false,

    // Leaflet Map Instance
    map: null,
    mapMarkersLayer: null,
    mapRoutesLayer: null,

    // =========================================================================
    // DUAL-PANE MANUAL ROUTE EDITOR (MT MANAGER STYLE) & DRAFT PERSISTENCE
    // =========================================================================
    simulasiMode: 'AUTO', // 'AUTO' | 'MANUAL'
    manualAssignments: [],
    manualLeftMdsId: '',
    manualLeftDay: 1, // 1..25 or 'ALL'
    manualLeftSearch: '',
    manualLeftSelectedStoreCodes: [],
    manualLeftDropdownOpen: false,
    manualLeftMdsSearch: '',

    manualRightMdsId: '',
    manualRightDay: 1, // 1..25 or 'ALL'
    manualRightSearch: '',
    manualRightSelectedStoreCodes: [],
    manualRightDropdownOpen: false,
    manualRightMdsSearch: '',

    manualMap: null,
    manualMapMarkersLayer: null,
    manualMapRoutesLayer: null,
    isManualDraftLoading: false,
    manualLeftCollapsed: false,
    manualRightCollapsed: false,
    manualDualPanelCollapsed: false,
    manualHistory: [], // Undo snapshot history stack

    // Store Identity Editing Modal & Modifications Log
    storeEditsMap: {}, // storeCode -> { ...storeData, isEdited: true, editTimestamp }
    showEditStoreModal: false,
    editingStore: { original: null, form: { storeCode: '', storeName: '', account: '', region: '', kabKota: '', lat: 0, lng: 0, address: '' } },

    // Live Cloud Sync (IndexedDB & Google Sheets)
    isSyncing: false,
    syncStatusMessage: '',
    syncMeta: null,

    initTheme() {
      if (this.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },

    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('route_sim_theme', this.theme);
      this.initTheme();
    },

    async initApp() {
      this.initTheme();

      try {
        // 1. Load Datasets (Instant from IndexedDB if available, fallback to CSV)
        this.rawPersonnel = window.MDS_PERSONNEL_DATA || [];
        this.rawStores = await StoreService.loadMasterStores(false, (msg) => {
          this.loadingMessage = msg;
        });
        this.syncMeta = StoreService.syncMeta;

        // 2. Run Initial Simulation for Pulau Jawa
        this.runSimulation();

        // 3. Restore last active mode or fallback to AUTO
        const savedMode = localStorage.getItem('route_sim_active_mode') || 'AUTO';
        if (savedMode === 'MANUAL') {
          this.setSimulasiMode('MANUAL');
        } else {
          this.$nextTick(() => {
            this.initMap();
            if (window.lucide) lucide.createIcons();
          });
        }

      } catch (err) {
        console.error('[App] Init Error:', err);
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Live Sync from Google Sheets directly to IndexedDB
     */
    async syncGoogleSheets() {
      if (this.isSyncing) return;
      this.isSyncing = true;
      this.syncStatusMessage = 'Menghubungkan ke Google Sheets...';

      try {
        const freshStores = await StoreService.loadMasterStores(true, (msg) => {
          this.syncStatusMessage = msg;
        });

        if (freshStores && freshStores.length > 0) {
          this.rawStores = freshStores;
          this.syncMeta = StoreService.syncMeta;
          this.runSimulation();
          
          const countStr = freshStores.length.toLocaleString('id-ID');
          const dateStr = this.syncMeta?.dateString || 'Baru saja';
          alert(`✅ Sinkronisasi Google Sheets Berhasil!\n\nTotal Toko: ${countStr}\nWaktu Sync: ${dateStr}\nData telah tersimpan di IndexedDB browser.`);
        } else {
          alert('⚠️ Tidak ada data toko yang berhasil disinkronkan.');
        }
      } catch (err) {
        console.error('[App] Sync Error:', err);
        alert(`❌ Gagal Sinkronisasi Google Sheets:\n${err.message || err}\n\nPeriksa koneksi internet atau hak akses sheet.`);
      } finally {
        this.isSyncing = false;
        this.syncStatusMessage = '';
        this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
      }
    },

    resetParams() {
      this.params = {
        storesPerDay: 20,
        regularDays: 21,
        dcDays: 4,
        dcPerDay: 10,
        maxTravelMins: 60,
        maxRadiusKm: 25
      };
      this.runSimulation();
    },

    setScope(scope) {
      if (this.selectedScope === scope) return;
      this.selectedScope = scope;
      this.selectedMds = null;
      this.selectedCity = 'ALL';
      this.selectedStatus = 'ALL';
      this.runSimulation();
    },

    /**
     * Trigger Simulation Run (Filtered by Scope)
     */
    runSimulation() {
      this.isLoading = true;
      const scopeName = this.selectedScope === 'JAWA' ? 'Pulau Jawa' : (this.selectedScope === 'LUAR_PULAU' ? 'Luar Pulau' : 'Nasional');
      this.loadingMessage = `Menghitung optimasi rute untuk ${scopeName}...`;

      setTimeout(() => {
        const isJawaStore = (st) => {
          return RouteEngine.getIslandGroup(st.lat, st.lng, st.kabKota, '', st.branchName || '') === 'JAWA';
        };

        const isJawaMds = (m) => {
          return RouteEngine.getIslandGroup(m.lat, m.lng, m.kota || m.kecamatan, m.region) === 'JAWA';
        };

        let targetPersonnel = this.rawPersonnel;
        let targetStores = this.rawStores;

        if (this.selectedScope === 'JAWA') {
          targetPersonnel = this.rawPersonnel.filter(isJawaMds);
          targetStores = this.rawStores.filter(isJawaStore);
        } else if (this.selectedScope === 'LUAR_PULAU') {
          targetPersonnel = this.rawPersonnel.filter(m => !isJawaMds(m));
          targetStores = this.rawStores.filter(st => !isJawaStore(st));
        }

        try {
          this.simulationResult = RouteEngine.runSimulation(
            targetPersonnel,
            targetStores,
            {
              ...this.params,
              scope: this.selectedScope
            }
          );

          // Restore and replay any custom swaps/edits from localStorage
          this.customSwaps = this.loadSavedSwaps();
          if (this.customSwaps && this.customSwaps.length > 0) {
            this.applySavedSwaps();
          }

          if (this.simulationResult.assignments.length > 0) {
            if (!this.selectedMds || !this.simulationResult.assignments.some(m => m.id === this.selectedMds.id)) {
              this.selectedMds = this.simulationResult.assignments[0];
            } else {
              this.selectedMds = this.simulationResult.assignments.find(m => m.id === this.selectedMds.id) || this.simulationResult.assignments[0];
            }
            if (!this.selectedMdsIds || this.selectedMdsIds.length === 0) {
              this.selectedMdsIds = [this.selectedMds.id];
              this.selectedHomeKeys = { [this.selectedMds.id]: true };
              this.selectedDayKeys = {};
              for (let d = 1; d <= 25; d++) {
                this.selectedDayKeys[`${this.selectedMds.id}_${d}`] = true;
              }
              this.expandedMdsIds = [this.selectedMds.id];
            }
          } else {
            this.selectedMds = null;
            this.selectedMdsIds = [];
            this.selectedHomeKeys = {};
            this.selectedDayKeys = {};
          }

          this.renderMap();
        } catch (err) {
          console.error('[App] Simulation Error:', err);
        } finally {
          this.isLoading = false;
          this.$nextTick(() => {
            if (this.map) {
              this.map.invalidateSize();
              this.renderMap();
            }
            if (window.lucide) lucide.createIcons();
          });
        }
      }, 80);
    },

    /**
     * Unique Cities in Dataset for Filter
     */
    get availableCities() {
      const cities = new Set();
      (this.rawPersonnel || []).forEach(p => {
        if (p.kota) cities.add(p.kota);
      });
      return Array.from(cities).sort();
    },

    /**
     * Filtered Assignments List
     */
    get filteredAssignments() {
      if (!this.simulationResult) return [];
      let list = this.simulationResult.assignments;

      // Status filter ('ACTIVE' vs 'VACANT')
      if (this.selectedStatus === 'ACTIVE') {
        list = list.filter(m => !m.isVirtual);
      } else if (this.selectedStatus === 'VACANT') {
        list = list.filter(m => m.isVirtual);
      }

      // City filter
      if (this.selectedCity !== 'ALL') {
        list = list.filter(m => m.kota === this.selectedCity);
      }

      // Search query
      if (this.searchQuery) {
        const q = this.searchQuery.toUpperCase();
        list = list.filter(m => {
          const match = `${m.nama} ${m.kecamatan} ${m.kota} ${m.id}`.toUpperCase();
          return match.includes(q);
        });
      }

      return list;
    },

    /**
     * Filtered Current Table Stores (Daily or Full Monthly Itinerary)
     */
    get currentTableStores() {
      if (!this.selectedMds) return [];
      let list = [];
      if (this.tableScope === 'DAY') {
        const daySchedule = (this.selectedMds.dailySchedule || []).find(d => d.dayNumber === this.selectedDayIndex);
        list = (daySchedule ? (daySchedule.stores || daySchedule.items || []) : []).map((st, idx) => ({
          ...st,
          stopIndex: idx + 1,
          dayNumber: this.selectedDayIndex
        }));
      } else {
        // Full Month (all 25 days)
        (this.selectedMds.dailySchedule || []).forEach(day => {
          (day.stores || day.items || []).forEach((st, idx) => {
            list.push({
              ...st,
              stopIndex: idx + 1,
              dayNumber: day.dayNumber,
              dayType: day.type,
              dayTitle: day.title
            });
          });
        });
      }

      // Filter by Type
      if (this.tableFilterType === 'PERDIN') {
        list = list.filter(st => st.isPerdin);
      } else if (this.tableFilterType === 'NON_PERDIN') {
        list = list.filter(st => !st.isPerdin && !st.isDc && st.type !== 'DC');
      } else if (this.tableFilterType === 'DC') {
        list = list.filter(st => st.isDc || st.type === 'DC' || st.account === 'DC' || st.tipeKunjungan === 'KUNJUNGAN DC');
      }

      // Search query
      if (this.tableSearchQuery) {
        const q = this.tableSearchQuery.toUpperCase();
        list = list.filter(st => {
          const match = `${st.storeName || ''} ${st.storeCode || ''} ${st.account || ''} ${st.kabKota || ''} ${st.kecamatan || ''}`.toUpperCase();
          return match.includes(q);
        });
      }

      return list;
    },

    /**
     * Summary Stats for the Currently Selected Day
     */
    get currentDaySummary() {
      if (!this.selectedMds) return null;
      const daySchedule = (this.selectedMds.dailySchedule || []).find(d => d.dayNumber === this.selectedDayIndex);
      if (!daySchedule) return null;
      const stores = daySchedule.stores || daySchedule.items || [];
      const totalKm = stores.reduce((sum, s) => sum + (s.distanceFromHomeKm || 0), 0);
      const avgKm = stores.length > 0 ? Math.round((totalKm / stores.length) * 10) / 10 : 0;
      const maxKm = stores.length > 0 ? Math.max(...stores.map(s => s.distanceFromHomeKm || 0)) : 0;
      return {
        ...daySchedule,
        totalStores: stores.length,
        avgDistanceKm: avgKm,
        maxDistanceKm: maxKm
      };
    },

    /**
     * Focus Map directly on a selected store & trigger popup
     */
    focusStoreOnMap(st) {
      if (!this.map || !st) return;
      const mapEl = document.getElementById('route-map');
      if (mapEl) {
        mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      this.map.flyTo([st.lat, st.lng], 16, { duration: 0.8 });
      setTimeout(() => {
        if (this.mapMarkersLayer) {
          this.mapMarkersLayer.eachLayer(layer => {
            if (layer.getLatLng) {
              const pos = layer.getLatLng();
              if (Math.abs(pos.lat - st.lat) < 0.001 && Math.abs(pos.lng - st.lng) < 0.001) {
                layer.openPopup();
              }
            }
          });
        }
      }, 800);
    },

    selectMds(mds) {
      if (!mds) return;
      this.selectedMds = mds;
      if (!this.selectedMdsIds.includes(mds.id)) {
        this.selectedMdsIds.push(mds.id);
      }
      if (!this.selectedHomeKeys) this.selectedHomeKeys = {};
      if (!this.selectedDayKeys) this.selectedDayKeys = {};
      this.selectedHomeKeys[mds.id] = true;
      for (let d = 1; d <= 25; d++) {
        this.selectedDayKeys[`${mds.id}_${d}`] = true;
      }
      if (!this.expandedMdsIds.includes(mds.id)) {
        this.expandedMdsIds.push(mds.id);
      }
      this.selectedDayIndex = 1;
      this.showMdsDrawer = false;
      this.renderMap(true);
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    // --- GOOGLE EARTH PLACES TREE CONTROLS ---
    toggleMdsSelection(mdsId) {
      if (!this.selectedHomeKeys) this.selectedHomeKeys = {};
      if (!this.selectedDayKeys) this.selectedDayKeys = {};

      if (this.selectedMdsIds.includes(mdsId)) {
        // UNCHECK parent crew: Remove crew and wipe all child day & home selections
        this.selectedMdsIds = this.selectedMdsIds.filter(id => id !== mdsId);
        delete this.selectedHomeKeys[mdsId];
        for (let d = 1; d <= 25; d++) {
          delete this.selectedDayKeys[`${mdsId}_${d}`];
        }
      } else {
        // CHECK parent crew: Activate crew, home base, and ALL 25 days
        this.selectedMdsIds.push(mdsId);
        this.selectedHomeKeys[mdsId] = true;
        for (let d = 1; d <= 25; d++) {
          this.selectedDayKeys[`${mdsId}_${d}`] = true;
        }
        const m = (this.simulationResult?.assignments || []).find(a => a.id === mdsId);
        if (m) this.selectedMds = m;
      }
      this.renderMap(true);
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    isMdsSelected(mdsId) {
      return this.selectedMdsIds.includes(mdsId);
    },

    selectAllMds() {
      if (!this.selectedHomeKeys) this.selectedHomeKeys = {};
      if (!this.selectedDayKeys) this.selectedDayKeys = {};
      this.selectedMdsIds = this.filteredAssignments.map(m => m.id);
      this.filteredAssignments.forEach(m => {
        this.selectedHomeKeys[m.id] = true;
        for (let d = 1; d <= 25; d++) {
          this.selectedDayKeys[`${m.id}_${d}`] = true;
        }
      });
      this.renderMap(true);
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    deselectAllMds() {
      this.selectedMdsIds = [];
      this.selectedHomeKeys = {};
      this.selectedDayKeys = {};
      if (this.selectedMds) {
        this.selectedMdsIds = [this.selectedMds.id];
        this.selectedHomeKeys[this.selectedMds.id] = true;
        for (let d = 1; d <= 25; d++) {
          this.selectedDayKeys[`${this.selectedMds.id}_${d}`] = true;
        }
      }
      this.renderMap(true);
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    toggleMdsTreeExpand(mdsId) {
      if (this.expandedMdsIds.includes(mdsId)) {
        this.expandedMdsIds = this.expandedMdsIds.filter(id => id !== mdsId);
      } else {
        this.expandedMdsIds.push(mdsId);
      }
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    isMdsTreeExpanded(mdsId) {
      return this.expandedMdsIds.includes(mdsId);
    },

    toggleDayVisibility(mdsId, dayNum) {
      if (!this.selectedHomeKeys) this.selectedHomeKeys = {};
      if (!this.selectedDayKeys) this.selectedDayKeys = {};
      const key = `${mdsId}_${dayNum}`;

      if (this.selectedDayKeys[key]) {
        // Uncheck single day
        delete this.selectedDayKeys[key];
        const hasAnyDay = Array.from({length: 25}, (_, i) => i + 1).some(d => this.selectedDayKeys[`${mdsId}_${d}`]);
        if (!hasAnyDay && !this.selectedHomeKeys[mdsId]) {
          this.selectedMdsIds = this.selectedMdsIds.filter(id => id !== mdsId);
        }
      } else {
        // Check single day
        if (!this.selectedMdsIds.includes(mdsId)) {
          this.selectedMdsIds.push(mdsId);
          this.selectedHomeKeys[mdsId] = true;
        }
        this.selectedDayKeys[key] = true;
      }
      this.renderMap(true);
    },

    isDayVisible(mdsId, dayNum) {
      if (!this.selectedMdsIds.includes(mdsId)) return false;
      return Boolean(this.selectedDayKeys && this.selectedDayKeys[`${mdsId}_${dayNum}`]);
    },

    toggleHomeVisibility(mdsId) {
      if (!this.selectedHomeKeys) this.selectedHomeKeys = {};
      if (!this.selectedDayKeys) this.selectedDayKeys = {};

      if (this.selectedHomeKeys[mdsId]) {
        delete this.selectedHomeKeys[mdsId];
        const hasAnyDay = Array.from({length: 25}, (_, i) => i + 1).some(d => this.selectedDayKeys[`${mdsId}_${d}`]);
        if (!hasAnyDay) {
          this.selectedMdsIds = this.selectedMdsIds.filter(id => id !== mdsId);
        }
      } else {
        if (!this.selectedMdsIds.includes(mdsId)) {
          this.selectedMdsIds.push(mdsId);
        }
        this.selectedHomeKeys[mdsId] = true;
      }
      this.renderMap(false);
    },

    isHomeVisible(mdsId) {
      if (!this.selectedMdsIds.includes(mdsId)) return false;
      return Boolean(this.selectedHomeKeys && this.selectedHomeKeys[mdsId]);
    },

    fitSelectedBounds() {
      if (!this.map) return;
      this.renderMap(true);
    },

    // --- INTERACTIVE STORE & DAY ROUTE SWAP LOGIC ---
    openSwapStoreModal(sourceMdsId, sourceDayNum, storeCodeOrId) {
      if (!this.simulationResult) return;
      const sourceMds = this.simulationResult.assignments.find(m => m.id === sourceMdsId);
      if (!sourceMds) return;
      const daySchedule = (sourceMds.dailySchedule || []).find(d => d.dayNumber === parseInt(sourceDayNum));
      if (!daySchedule) return;
      const store = (daySchedule.stores || []).find(s => (s.storeCode === storeCodeOrId || s.id === storeCodeOrId));
      if (!store) return;

      this.swapData = {
        mode: 'STORE',
        store: store,
        sourceMdsId: sourceMdsId,
        sourceDayNum: parseInt(sourceDayNum),
        targetMdsId: sourceMdsId,
        targetDayNum: parseInt(sourceDayNum) === 25 ? 1 : parseInt(sourceDayNum) + 1
      };
      this.showSwapModal = true;
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    openSwapDayModal(sourceMdsId, sourceDayNum) {
      if (!this.simulationResult) return;
      const sourceMds = this.simulationResult.assignments.find(m => m.id === sourceMdsId);
      if (!sourceMds) return;

      this.swapData = {
        mode: 'DAY_ROUTE',
        store: null,
        sourceMdsId: sourceMdsId,
        sourceDayNum: parseInt(sourceDayNum),
        targetMdsId: sourceMdsId,
        targetDayNum: parseInt(sourceDayNum) === 25 ? 1 : parseInt(sourceDayNum) + 1
      };
      this.showSwapModal = true;
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    executeSwap() {
      if (!this.simulationResult) return;
      const { mode, store, sourceMdsId, sourceDayNum, targetMdsId, targetDayNum } = this.swapData;

      const sourceMds = this.simulationResult.assignments.find(m => m.id === sourceMdsId);
      const targetMds = this.simulationResult.assignments.find(m => m.id === targetMdsId);
      if (!sourceMds || !targetMds) return;

      const sDayNum = parseInt(sourceDayNum);
      const tDayNum = parseInt(targetDayNum);

      const sourceDay = (sourceMds.dailySchedule || []).find(d => d.dayNumber === sDayNum);
      const targetDay = (targetMds.dailySchedule || []).find(d => d.dayNumber === tDayNum);
      if (!sourceDay || !targetDay) return;

      if (mode === 'STORE' && store) {
        // 1. Remove store from source
        sourceDay.stores = (sourceDay.stores || []).filter(s => (s.storeCode !== store.storeCode && s.id !== store.id));
        if (sourceMds.id !== targetMds.id) {
          sourceMds.assignedStores = (sourceMds.assignedStores || []).filter(s => (s.storeCode !== store.storeCode && s.id !== store.id));
        }

        // 2. Recalculate distance & perdin for new target MDS
        const newDist = RouteEngine.getDistanceKm(targetMds.lat, targetMds.lng, store.lat, store.lng);
        store.distanceFromHomeKm = newDist;
        store.travelTimeMins = RouteEngine.getEstimatedTravelTimeMins(newDist);
        store.isPerdin = newDist > 35;

        // 3. Add store to target
        targetDay.stores.push(store);
        if (sourceMds.id !== targetMds.id) {
          targetMds.assignedStores.push(store);
        }

        // 4. Ensure target MDS is visible on map
        if (!this.selectedMdsIds.includes(targetMds.id)) {
          this.selectedMdsIds.push(targetMds.id);
        }

        // 5. Record to persistent swap history
        this.customSwaps.push({
          mode: 'STORE',
          storeId: store.storeCode || store.id,
          storeName: store.storeName,
          sourceMdsId,
          sourceDayNum: sDayNum,
          targetMdsId,
          targetDayNum: tDayNum,
          timestamp: new Date().toISOString()
        });
        this.saveCustomSwaps();

        this.showToast(`✅ Berhasil: Toko "${store.storeName}" dipindahkan ke ${targetMds.nama} (Hari ke-${tDayNum})`);
      } else if (mode === 'DAY_ROUTE') {
        const movingStores = [...(sourceDay.stores || [])];
        sourceDay.stores = [];

        movingStores.forEach(st => {
          if (sourceMds.id !== targetMds.id) {
            sourceMds.assignedStores = (sourceMds.assignedStores || []).filter(s => (s.storeCode !== st.storeCode && s.id !== st.id));
            targetMds.assignedStores.push(st);
          }
          const newDist = RouteEngine.getDistanceKm(targetMds.lat, targetMds.lng, st.lat, st.lng);
          st.distanceFromHomeKm = newDist;
          st.travelTimeMins = RouteEngine.getEstimatedTravelTimeMins(newDist);
          st.isPerdin = newDist > 35;
          targetDay.stores.push(st);
        });

        if (!this.selectedMdsIds.includes(targetMds.id)) {
          this.selectedMdsIds.push(targetMds.id);
        }

        // Record to persistent swap history
        this.customSwaps.push({
          mode: 'DAY_ROUTE',
          sourceMdsId,
          sourceDayNum: sDayNum,
          targetMdsId,
          targetDayNum: tDayNum,
          storeCount: movingStores.length,
          timestamp: new Date().toISOString()
        });
        this.saveCustomSwaps();

        this.showToast(`✅ Berhasil: Seluruh rute Hari #${sDayNum} (${movingStores.length} Toko) dipindahkan ke ${targetMds.nama} (Hari #${tDayNum})`);
      }

      // Recalculate stats for both MDS
      this.recalculateMdsStats(sourceMds);
      if (sourceMds.id !== targetMds.id) {
        this.recalculateMdsStats(targetMds);
      }

      this.showSwapModal = false;
      this.renderMap();
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    loadSavedSwaps() {
      try {
        const key = `cimory_custom_swaps_${this.selectedScope}`;
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.error('[App] Failed to load saved swaps:', e);
        return [];
      }
    },

    saveCustomSwaps() {
      try {
        const key = `cimory_custom_swaps_${this.selectedScope}`;
        localStorage.setItem(key, JSON.stringify(this.customSwaps));
      } catch (e) {
        console.error('[App] Failed to save swaps to localStorage:', e);
      }
    },

    applySavedSwaps() {
      if (!this.simulationResult || !this.customSwaps || !this.customSwaps.length) return;
      const affectedMdsIds = new Set();

      this.customSwaps.forEach(swap => {
        const { mode, storeId, sourceMdsId, sourceDayNum, targetMdsId, targetDayNum } = swap;
        const sourceMds = this.simulationResult.assignments.find(m => m.id === sourceMdsId);
        const targetMds = this.simulationResult.assignments.find(m => m.id === targetMdsId);
        if (!sourceMds || !targetMds) return;

        const sourceDay = (sourceMds.dailySchedule || []).find(d => d.dayNumber === sourceDayNum);
        const targetDay = (targetMds.dailySchedule || []).find(d => d.dayNumber === targetDayNum);
        if (!sourceDay || !targetDay) return;

        if (mode === 'STORE') {
          const store = (sourceDay.stores || []).find(s => s.storeCode === storeId || s.id === storeId)
            || (sourceMds.assignedStores || []).find(s => s.storeCode === storeId || s.id === storeId);
          if (!store) return;

          sourceDay.stores = (sourceDay.stores || []).filter(s => s.storeCode !== store.storeCode && s.id !== store.id);
          if (sourceMds.id !== targetMds.id) {
            sourceMds.assignedStores = (sourceMds.assignedStores || []).filter(s => s.storeCode !== store.storeCode && s.id !== store.id);
          }

          const newDist = RouteEngine.getDistanceKm(targetMds.lat, targetMds.lng, store.lat, store.lng);
          store.distanceFromHomeKm = newDist;
          store.travelTimeMins = RouteEngine.getEstimatedTravelTimeMins(newDist);
          store.isPerdin = newDist > 35;

          targetDay.stores.push(store);
          if (sourceMds.id !== targetMds.id) {
            targetMds.assignedStores.push(store);
          }
          affectedMdsIds.add(sourceMds.id);
          affectedMdsIds.add(targetMds.id);
        } else if (mode === 'DAY_ROUTE') {
          const movingStores = [...(sourceDay.stores || [])];
          sourceDay.stores = [];

          movingStores.forEach(st => {
            if (sourceMds.id !== targetMds.id) {
              sourceMds.assignedStores = (sourceMds.assignedStores || []).filter(s => s.storeCode !== st.storeCode && s.id !== st.id);
              targetMds.assignedStores.push(st);
            }
            const newDist = RouteEngine.getDistanceKm(targetMds.lat, targetMds.lng, st.lat, st.lng);
            st.distanceFromHomeKm = newDist;
            st.travelTimeMins = RouteEngine.getEstimatedTravelTimeMins(newDist);
            st.isPerdin = newDist > 35;
            targetDay.stores.push(st);
          });
          affectedMdsIds.add(sourceMds.id);
          affectedMdsIds.add(targetMds.id);
        }
      });

      affectedMdsIds.forEach(id => {
        const mds = this.simulationResult.assignments.find(m => m.id === id);
        if (mds) this.recalculateMdsStats(mds);
      });
    },

    resetCustomSwaps() {
      if (!confirm('Yakin ingin mereset semua hasil pemindahan toko/rute kembali ke kalkulasi awal?')) return;
      this.customSwaps = [];
      this.saveCustomSwaps();
      this.runSimulation();
      this.showToast('ℹ️ Semua hasil pemindahan telah di-reset ke simulasi awal.');
    },

    recalculateMdsStats(mds) {
      if (!mds) return;
      const allStores = [];
      let perdinDays = 0;
      let nonPerdinDays = 0;

      (mds.dailySchedule || []).forEach(day => {
        const stores = day.stores || [];
        allStores.push(...stores);
        const dayPerdin = stores.some(s => s.isPerdin || s.distanceFromHomeKm > 35);
        day.isPerdin = dayPerdin;
        if (day.type !== 'DC') {
          if (dayPerdin) perdinDays++;
          else nonPerdinDays++;
        }
      });

      mds.assignedStores = allStores;
      mds.perdinDays = perdinDays;
      mds.nonPerdinDays = nonPerdinDays;
      mds.estPerdinBudget = perdinDays * 400000;

      if (allStores.length > 0) {
        const totalDist = allStores.reduce((sum, s) => sum + (s.distanceFromHomeKm || 0), 0);
        mds.avgDistanceKm = Math.round((totalDist / allStores.length) * 10) / 10;
        mds.maxDistanceKm = Math.round(Math.max(...allStores.map(s => s.distanceFromHomeKm || 0)) * 10) / 10;
        mds.avgTravelMins = RouteEngine.getEstimatedTravelTimeMins(mds.avgDistanceKm);
      }
    },

    showToast(msg) {
      this.toastMessage = msg;
      this.toastVisible = true;
      setTimeout(() => {
        this.toastVisible = false;
      }, 4000);
    },

    prevDay() {
      if (this.selectedDayIndex > 1) {
        this.setDay(this.selectedDayIndex - 1);
      }
    },

    nextDay() {
      const maxDays = (this.selectedMds?.dailySchedule?.length || 25);
      if (this.selectedDayIndex < maxDays) {
        this.setDay(this.selectedDayIndex + 1);
      }
    },

    setDay(dayNum) {
      this.selectedDayIndex = parseInt(dayNum);
      if (!this.selectedDayKeys) this.selectedDayKeys = {};
      if (!this.showAllDaysOnMap && this.selectedMdsIds.length > 0) {
        this.selectedMdsIds.forEach(mId => {
          for (let d = 1; d <= 25; d++) delete this.selectedDayKeys[`${mId}_${d}`];
          this.selectedDayKeys[`${mId}_${this.selectedDayIndex}`] = true;
        });
      }
      this.renderMap(true);
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    /**
     * Initialize Leaflet Map
     */
    initMap() {
      const mapEl = document.getElementById('route-map');
      if (!mapEl || this.map) return;

      // Center around Jakarta/Jabodetabek
      this.map = L.map('route-map', {
        center: [-6.2088, 106.8456],
        zoom: 11,
        zoomControl: true,
        fadeAnimation: true,
        markerZoomAnimation: true,
        zoomAnimation: true,
        wheelDebounceTime: 40
      });

      // OpenStreetMap Clean Tiles (100% Free, Zero Watermark, No API Key Required)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(this.map);

      this.mapMarkersLayer = L.layerGroup().addTo(this.map);
      this.mapRoutesLayer = L.layerGroup().addTo(this.map);

      // Expose global callback for Leaflet popup buttons
      window.__openRouteSwapModal = (sourceMdsId, dayNum, storeCode) => {
        this.openSwapStoreModal(sourceMdsId, dayNum, storeCode);
      };

      this.renderMap();
    },

    /**
     * Render Map Markers & Route Lines for Multiple Selected MDS Simultaneously
     */
    renderMap(forceFit = false) {
      if (!this.map || !this.mapMarkersLayer || !this.simulationResult) return;

      this.mapMarkersLayer.clearLayers();
      this.mapRoutesLayer.clearLayers();

      this.map.invalidateSize();

      // Determine active MDS list to plot
      let activeList = [];
      if (this.selectedMdsIds && this.selectedMdsIds.length > 0) {
        activeList = this.simulationResult.assignments.filter(m => this.selectedMdsIds.includes(m.id));
      }
      if (activeList.length === 0 && this.selectedMds) {
        activeList = [this.selectedMds];
      }
      if (activeList.length === 0) return;

      const isMultiMds = activeList.length > 1;
      const allBounds = [];

      activeList.forEach((mds) => {
        // 1. Plot MDS Home Pin (if visible)
        if (this.isHomeVisible(mds.id)) {
          const homeIcon = L.divIcon({
            className: 'custom-home-pin',
            html: `
              <div style="background-color: ${mds.color}; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; transform: translate(-50%, -50%); cursor: pointer;">
                🏠
              </div>
            `,
            iconSize: [0, 0],
            iconAnchor: [0, 0]
          });

          const homeMarker = L.marker([mds.lat, mds.lng], { icon: homeIcon })
            .bindPopup(`
              <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
                <div style="display:inline-block; padding: 2px 7px; border-radius: 4px; background: ${mds.color}; color: white; font-weight: bold; font-size: 11px; margin-bottom: 4px;">
                  🏠 Domisili MDS: ${mds.nama}
                </div><br>
                <span>Alamat: <b>${mds.alamat}</b></span><br>
                <span>Kecamatan: <b>${mds.kecamatan}</b>, ${mds.kota}</span><br>
                <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                <span>Total Kunjungan: <b>${mds.assignedStores.length} Toko + 4 Hari DC</b></span><br>
                <span>Rincian: <b>${mds.nonPerdinDays || mds.localDays || 0} Hari Non Perdin</b> • <b>${mds.perdinDays || 0} Hari Perdin</b></span>
              </div>
            `);
          this.mapMarkersLayer.addLayer(homeMarker);
          allBounds.push([mds.lat, mds.lng]);
        }

        // 2. Determine which days to plot for this MDS
        const daysToPlot = (mds.dailySchedule || []).filter(day => this.isDayVisible(mds.id, day.dayNumber));

        // 3. Plot Stores & Route Lines per Day
        daysToPlot.forEach(day => {
          const stores = day.stores || [];
          if (stores.length === 0) return;

          const isDayPerdin = day.isPerdin;
          const isDayDc = day.type === 'DC';
          const dayRouteCoords = [];

          stores.forEach((st, idx) => {
            const isPerdin = isDayPerdin || st.isPerdin;
            const isThisStoreDc = Boolean(st.isDc || st.type === 'DC' || (st.tipeKunjungan && st.tipeKunjungan.includes('DC')));
            const pinBg = isPerdin ? '#f59e0b' : (isThisStoreDc ? '#059669' : mds.color);
            const pinBorder = isPerdin ? '#b45309' : (isThisStoreDc ? '#047857' : 'white');
            const pinText = isMultiMds ? `D${day.dayNumber} #${idx + 1}` : `${idx + 1}`;

            const storeIcon = L.divIcon({
              className: 'custom-store-pin',
              html: `
                <div style="background-color: ${pinBg}; min-width: 26px; height: 24px; padding: 0 6px; border-radius: 12px; border: 2px solid ${pinBorder}; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: 800; white-space: nowrap; transform: translate(-50%, -50%); cursor: pointer;">
                  ${pinText}
                </div>
              `,
              iconSize: [0, 0],
              iconAnchor: [0, 0]
            });

            const safeStoreCode = (st.storeCode || st.id || '').replace(/'/g, "\\'");
            const safeMdsId = mds.id.replace(/'/g, "\\'");

            const isVirtual = Boolean(mds.isVirtual || st.isVirtual || st.isVirtualCover);
            const nearestMdsName = st.nearestActiveMdsName || mds.nearestActiveMdsName || '-';
            const nearestMdsDist = st.distToNearestActiveMdsKm ?? (mds.nearestActiveMdsDistanceKm || '-');
            const reasonText = st.vacantReason || mds.vacantReason || '';

            const storeMarker = L.marker([st.lat, st.lng], { icon: storeIcon })
              .bindPopup(`
                <div style="font-family: sans-serif; font-size: 12px; line-height: 1.45; min-width: 250px;">
                  <div style="display:flex; align-items:center; justify-content:space-between; gap: 4px; margin-bottom: 5px;">
                    <span style="background:${mds.color}; color:white; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px;">
                      ${isVirtual ? '🟡 [USULAN REKRUT]' : '👤'} ${mds.nama}
                    </span>
                    <span style="background:#e0e7ff; color:#3730a3; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px;">
                      Hari #${day.dayNumber} (Stop #${idx + 1})
                    </span>
                  </div>
                  <b>${st.storeName || st.name}</b><br>
                  <span style="display:inline-block; padding: 2px 6px; border-radius: 4px; background: #f1f5f9; color: #475569; font-size: 10px; font-weight: bold; margin-top:2px;">
                    ${st.account || 'Toko'} ${st.storeCode ? `[${st.storeCode}]` : ''}
                  </span><br>
                  <hr style="margin: 6px 0; border: none; border-top: 1px solid #e2e8f0;">
                  <span>Wilayah: <b>${st.kabKota || mds.kota}</b> (${st.kecamatan || '-'})</span><br>
                  
                  ${isVirtual ? `
                  <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 6px; margin: 6px 0; font-size: 11px;">
                    <div style="color: #b45309; font-weight: 800; font-size: 10px; margin-bottom: 3px;">📍 TITIK ACUAN: SENTRA OPERASIONAL USULAN</div>
                    <div>Sentra: <b>${mds.alamat || mds.kota}</b></div>
                    <div>Jarak ke Sentra Usulan: <b style="color: #4338ca;">${st.distanceFromHomeKm} km</b> (~${st.travelTimeMins} mnt)</div>
                    <div style="margin-top: 5px; border-top: 1px dashed #fcd34d; padding-top: 4px;">
                      👥 <b>MDS Aktif Terdekat:</b> ${nearestMdsName}<br>
                      🚗 <b>Jarak Asli ke MDS Terdekat:</b> <b style="color: #dc2626;">${nearestMdsDist} km</b>
                    </div>
                    ${reasonText ? `<div style="margin-top: 4px; font-size: 10px; color: #78350f; line-height: 1.3;">💡 <b>Alasan Usul Rekrut:</b> <i>${reasonText}</i></div>` : ''}
                  </div>
                  ` : `
                  <span>Domisili MDS: <b>${mds.alamat || mds.kota}</b></span><br>
                  <span>Jarak dari Domisili: <b style="color: ${isPerdin ? '#b45309' : '#4338ca'};">${st.distanceFromHomeKm} km</b> (~${st.travelTimeMins} mnt)</span><br>
                  `}
                  
                  <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; display: flex; gap: 6px;">
                    <button onclick="window.__openRouteSwapModal('${safeMdsId}', ${day.dayNumber}, '${safeStoreCode}')" style="flex:1; background:#4f46e5; color:white; border:none; border-radius:6px; padding:6px 8px; font-size:11px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                      <span>🔄</span> <span>Tukar Toko / Pindah Rute</span>
                    </button>
                  </div>
                </div>
              `);
            this.mapMarkersLayer.addLayer(storeMarker);
            allBounds.push([st.lat, st.lng]);
            dayRouteCoords.push([st.lat, st.lng]);
          });

          // Draw Polyline for this day
          if (dayRouteCoords.length > 1) {
            const polyline = L.polyline(dayRouteCoords, {
              color: isDayDc ? '#059669' : mds.color,
              weight: 3,
              opacity: 0.8,
              dashArray: isDayDc ? '4, 6' : '6, 6',
              smoothFactor: 1
            });
            this.mapRoutesLayer.addLayer(polyline);
          }
        });
      });

      // Fit bounds if requested or initial render
      if (allBounds.length > 0 && (forceFit || !isMultiMds)) {
        this.map.fitBounds(allBounds, { padding: [40, 40], maxZoom: 15 });
      }
    },

    /**
     * Export Full Simulation / Manual Editor Route to Multi-Sheet Excel (.xlsx)
     */
    exportSimulationExcel() {
      const isManual = this.simulasiMode === 'MANUAL';
      const assignments = isManual ? (this.manualAssignments || []) : (this.simulationResult?.assignments || []);
      
      if (!assignments || assignments.length === 0) {
        this.showToast('⚠️ Belum ada data rute untuk diekspor ke Excel.');
        return;
      }

      const wb = XLSX.utils.book_new();

      // --- Sheet 1: Master Summary & Manpower Allocation ---
      const summaryRows = assignments.map((m, idx) => ({
        'No': idx + 1,
        'Kode Personil': m.id,
        'Nama MDS': m.nama,
        'Status Personil': m.isVirtual ? 'USULAN REKRUT (VACANT)' : 'AKTIF (EXISTING)',
        'Tipe Acuan Domisili': m.isVirtual ? 'Sentra Operasional Usulan' : 'Domisili Asli MDS',
        'Domisili / Titik Sentra': m.alamat,
        'Kecamatan': m.kecamatan,
        'Kota/Kabupaten': m.kota,
        'Region': m.region,
        'MDS Existing Terdekat': m.isVirtual ? (m.nearestActiveMdsName || '-') : '-',
        'Jarak Sentra ke MDS Terdekat (KM)': m.isVirtual ? (m.nearestActiveMdsDistanceKm || '-') : '-',
        'Total Toko Dialokasikan': (m.assignedStores || []).length,
        'Hari Toko Non Perdin': m.nonPerdinDays || m.localDays || 0,
        'Hari Toko Perdin': m.perdinDays || 0,
        'Hari Kunjungan DC': m.dcDays || 4,
        'Total Beban Kunjungan/Bulan': (m.assignedStores || []).length + (m.dcDays || 4),
        'Estimasi Anggaran Perdin/Bulan (Rp)': (m.estPerdinBudget || 0),
        'Rata-rata Jarak dari Acuan (KM)': m.avgDistanceKm,
        'Jarak Terjauh dari Acuan (KM)': m.maxDistanceKm,
        'Estimasi Rata-rata Tempuh (Menit)': m.avgTravelMins,
        'Justifikasi Data / Alasan Usulan Rekrut': m.isVirtual ? (m.vacantReason || 'Klaster terisolir, MDS terdekat overload') : 'Personil Aktif Terutilisasi'
      }));
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan_Alokasi_MDS');

      // --- Sheet 2: Matriks Jadwal 25 Hari Kerja (Detail Per Stop & Evaluasi Rute) ---
      const scheduleRows = [];
      assignments.forEach(m => {
        (m.dailySchedule || []).forEach(day => {
          (day.stores || []).forEach((st, sIdx) => {
            const isPerdin = Boolean(st.isPerdin);
            const isDcStop = Boolean(st.isDc || st.type === 'DC' || st.tipeKunjungan === 'KUNJUNGAN DC' || day.type === 'DC');
            const isVirtual = Boolean(m.isVirtual || st.isVirtual || st.isVirtualCover);

            scheduleRows.push({
              'Mode Data': isManual ? 'REVISI MANUAL' : 'SIMULASI OTOMATIS',
              'Kode MDS': m.id,
              'Nama MDS': m.nama,
              'Status MDS': isVirtual ? 'USULAN REKRUT (VACANT)' : 'AKTIF (EXISTING)',
              'Tipe Acuan Domisili': isVirtual ? 'Sentra Usulan Operasional Baru' : 'Domisili MDS Existing',
              'Titik Acuan Domisili': m.alamat || m.kota,
              'Kota Asal MDS': m.kota,
              'Hari Ke': day.dayNumber,
              'Tipe Kunjungan': isDcStop ? 'KUNJUNGAN DC' : (st.tipeKunjungan === 'TOKO SEKITAR DC' ? 'TOKO SEKITAR DC' : (isPerdin ? 'PERDIN' : 'NON PERDIN')),
              'Status Perdin': isPerdin ? 'PERDIN' : 'NON PERDIN',
              'Uang Harian Perdin (Rp)': isPerdin ? 400000 : 0,
              'Urutan Stop': sIdx + 1,
              'Kode Toko': st.storeCode || st.id,
              'Nama Toko': st.storeName,
              'Account': st.account,
              'Wilayah / Kab-Kota': st.kabKota || m.kota,
              'Kecamatan Toko': st.kecamatan || '-',
              'Jarak ke Titik Acuan (KM)': st.distanceFromHomeKm,
              'Estimasi Tempuh ke Acuan (Menit)': st.travelTimeMins || st.estTravelMins,
              'MDS Existing Terdekat': isVirtual ? (st.nearestActiveMdsName || m.nearestActiveMdsName || '-') : '-',
              'Jarak Asli ke MDS Terdekat (KM)': isVirtual ? (st.distToNearestActiveMdsKm ?? (m.nearestActiveMdsDistanceKm || '-')) : '-',
              'Alasan Usulan Penambahan / Justifikasi': isVirtual ? (st.vacantReason || m.vacantReason || 'Klaster terisolir') : 'Tercover Personil Aktif',
              'Latitude Toko': st.lat,
              'Longitude Toko': st.lng
            });
          });
        });
      });
      const wsSchedule = XLSX.utils.json_to_sheet(scheduleRows);
      XLSX.utils.book_append_sheet(wb, wsSchedule, 'Matriks_Rute_25_Hari');

      // --- Sheet 3: Ringkasan Kebijakan Finansial Perdin ---
      const financialRows = [
        { 'Komponen Biaya': 'Uang Makan Perdin / Hari', 'Tarif Resmi': 150000, 'Keterangan': 'Alokasi konsumsi 3x makan selama luar kota' },
        { 'Komponen Biaya': 'Penginapan / Hotel Perdin / Malam', 'Tarif Resmi': 200000, 'Keterangan': 'Standar penginapan budget di kota tujuan' },
        { 'Komponen Biaya': 'Transport / Bensin Perdin / Hari', 'Tarif Resmi': 50000, 'Keterangan': 'Bahan bakar mobilitas rute antar toko' },
        { 'Komponen Biaya': 'TOTAL UANG HARIAN PERDIN / HARI', 'Tarif Resmi': 400000, 'Keterangan': 'Total paket perdin resmi per hari' },
        { 'Komponen Biaya': 'Beban Biaya Tetap Rekrut Baru / Bulan', 'Tarif Resmi': 5220000, 'Keterangan': 'UMR + Rp 1,2 Jt Ops + Rp 100rb Pulsa + BPJS & THR' }
      ];
      const wsFinancial = XLSX.utils.json_to_sheet(financialRows);
      XLSX.utils.book_append_sheet(wb, wsFinancial, 'Kebijakan_Biaya_Perdin');

      // Generate & Download File
      const scopeSlug = this.selectedScope === 'JAWA' ? 'Pulau_Jawa' : (this.selectedScope === 'LUAR_PULAU' ? 'Luar_Pulau' : 'Nasional');
      const modeSlug = isManual ? 'Editor_Manual' : 'Simulasi_Otomatis';
      const filename = `Cimory_Rute_MDS_${modeSlug}_${scopeSlug}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
      this.showToast(`📊 Berhasil mengunduh Excel Rute (${isManual ? 'Hasil Edit Manual' : 'Simulasi Otomatis'}).`);
    },

    /**
     * Export Complete Dataset or Selected MDS to Google Earth (.KML)
     */
    exportGoogleEarthKml(exportAll = true) {
      if (!this.simulationResult) return;

      const escXml = (str) => {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };

      const targetList = exportAll
        ? this.simulationResult.assignments
        : (this.selectedMds ? [this.selectedMds] : this.simulationResult.assignments);

      const scopeTitle = this.selectedScope === 'JAWA' ? 'Pulau Jawa' : (this.selectedScope === 'LUAR_PULAU' ? 'Luar Pulau' : 'Nasional');

      let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>Cimory MDS Route Simulation - ${scopeTitle}</name>
  <description><![CDATA[Plotting Rute Harian & Wilayah MDS Berdasarkan Domisili Asli (Skema 25 Hari Kerja - ${scopeTitle})]]></description>
  
  <!-- KML Styles (High Contrast & Visible in Google Earth 3D) -->
  <Style id="homePinActive">
    <IconStyle>
      <color>ff0000ff</color>
      <scale>1.3</scale>
      <Icon><href>https://maps.google.com/mapfiles/kml/paddle/red-stars.png</href></Icon>
    </IconStyle>
    <LabelStyle><scale>0.9</scale></LabelStyle>
  </Style>
  <Style id="homePinVacant">
    <IconStyle>
      <color>ff00aaff</color>
      <scale>1.3</scale>
      <Icon><href>https://maps.google.com/mapfiles/kml/paddle/ylw-stars.png</href></Icon>
    </IconStyle>
    <LabelStyle><scale>0.9</scale></LabelStyle>
  </Style>
  <Style id="dcPin">
    <IconStyle>
      <color>ff00aa00</color>
      <scale>1.2</scale>
      <Icon><href>https://maps.google.com/mapfiles/kml/paddle/grn-square.png</href></Icon>
    </IconStyle>
    <LabelStyle><scale>0</scale></LabelStyle>
  </Style>
  <Style id="storePinRegular">
    <IconStyle>
      <color>ffffaa00</color>
      <scale>1.0</scale>
      <Icon><href>https://maps.google.com/mapfiles/kml/paddle/blu-circle.png</href></Icon>
    </IconStyle>
    <LabelStyle><scale>0</scale></LabelStyle>
  </Style>
  <Style id="storePinPerdin">
    <IconStyle>
      <color>ff0080ff</color>
      <scale>1.1</scale>
      <Icon><href>https://maps.google.com/mapfiles/kml/paddle/orange-circle.png</href></Icon>
    </IconStyle>
    <LabelStyle><scale>0</scale></LabelStyle>
  </Style>
  <Style id="storePinVacant">
    <IconStyle>
      <color>ff00ffff</color>
      <scale>1.0</scale>
      <Icon><href>https://maps.google.com/mapfiles/kml/paddle/ylw-circle.png</href></Icon>
    </IconStyle>
    <LabelStyle><scale>0</scale></LabelStyle>
  </Style>
  <Style id="routeLine">
    <LineStyle>
      <color>cc00ffff</color>
      <width>4</width>
    </LineStyle>
  </Style>
`;

      targetList.forEach(m => {
        const isVacant = m.isVirtual;
        const mdsFolderTitle = escXml(`${isVacant ? '⚠️ ' : '👤 '}${m.nama} (${m.kota})`);
        const basePinTitle = escXml(isVacant ? `🏢 Sentra: ${m.nama}` : `🏠 Base: ${m.nama}`);

        kml += `
  <Folder>
    <name>${mdsFolderTitle}</name>
    <visibility>0</visibility>
    <description><![CDATA[
      <div style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.45;">
        <b>Status:</b> ${isVacant ? '<span style="color: #d97706; font-weight: bold;">🟡 USULAN REKRUT (VACANT)</span>' : '<span style="color: #16a34a; font-weight: bold;">🟢 MDS AKTIF (EXISTING)</span>'}<br>
        <b>${isVacant ? 'Sentra Operasional' : 'Alamat Rumah'}:</b> ${escXml(m.alamat)}<br>
        <b>Kecamatan/Kota:</b> ${escXml(m.kecamatan)}, ${escXml(m.kota)} (${escXml(m.region)})<br>
        <b>Total Beban Toko:</b> ${m.assignedStores.length} Toko + ${m.assignedDc.length} DC<br>
        <b>Rata-rata Jarak:</b> ${m.avgDistanceKm} km (~${m.avgTravelMins} menit)
        ${isVacant && m.vacantReason ? `<br><div style="margin-top: 4px; padding: 4px; background: #fffbeb; border: 1px solid #fde68a; font-size: 10.5px; color: #78350f;"><b>Alasan Usul Rekrut:</b> ${escXml(m.vacantReason)}</div>` : ''}
      </div>
    ]]></description>

    <!-- 1. Home Base / Sentra Placemark -->
    <Placemark>
      <name>${basePinTitle}</name>
      <styleUrl>${isVacant ? '#homePinVacant' : '#homePinActive'}</styleUrl>
      <description><![CDATA[
        <div style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.45;">
          <b>${isVacant ? 'Sentra Operasional Usulan' : 'Domisili MDS'}:</b> ${escXml(m.nama)}<br>
          <b>Alamat:</b> ${escXml(m.alamat)}<br>
          <b>Kecamatan:</b> ${escXml(m.kecamatan)}<br>
          <b>Kota:</b> ${escXml(m.kota)}
        </div>
      ]]></description>
      <Point>
        <coordinates>${m.lng},${m.lat},0</coordinates>
      </Point>
    </Placemark>
`;

        // 2. Daily Schedules and Route Lines
        (m.dailySchedule || []).forEach(day => {
          const stores = day.stores || day.items || [];
          if (stores.length === 0) return;

          const dayFolderTitle = escXml(`Hari ke-${day.dayNumber} (${day.type === 'STORE' ? 'Toko Reguler' : 'Kunjungan DC'}) - ${stores.length} Stop`);

          kml += `
    <Folder>
      <name>${dayFolderTitle}</name>
      <visibility>0</visibility>
`;

          // Track path coordinates
          const pathCoords = [`${m.lng},${m.lat},0`];

          stores.forEach((st, sIdx) => {
            pathCoords.push(`${st.lng},${st.lat},0`);
            const storeTitle = escXml(`#${sIdx + 1}: ${st.storeName || st.name}`);
            const isPerdin = Boolean(st.isPerdin);
            const isDcStop = Boolean(st.isDc || st.type === 'DC' || st.tipeKunjungan === 'KUNJUNGAN DC');
            const isVirtualStore = Boolean(isVacant || st.isVirtual || st.isVirtualCover);

            let styleUrl = '#storePinRegular';
            if (isDcStop) styleUrl = '#dcPin';
            else if (isVirtualStore) styleUrl = '#storePinVacant';
            else if (isPerdin) styleUrl = '#storePinPerdin';

            const nearestMdsName = st.nearestActiveMdsName || m.nearestActiveMdsName || '-';
            const nearestMdsKota = st.nearestActiveMdsKota || m.nearestActiveMdsKota || '';
            const nearestMdsDist = st.distToNearestActiveMdsKm ?? (m.nearestActiveMdsDistanceKm || '-');
            const reasonText = st.vacantReason || m.vacantReason || '';
            const visitTypeStr = isDcStop ? 'KUNJUNGAN DC' : (st.tipeKunjungan === 'TOKO SEKITAR DC' ? 'TOKO SEKITAR DC' : (isPerdin ? 'PERDIN (LUAR KOTA)' : 'NON PERDIN (LOKAL)'));

            kml += `
      <Placemark>
        <name>${storeTitle}</name>
        <styleUrl>${styleUrl}</styleUrl>
        <description><![CDATA[
          <div style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.45; min-width: 270px;">
            <div style="margin-bottom: 6px; border-bottom: 2px solid ${isVirtualStore ? '#f59e0b' : '#3b82f6'}; padding-bottom: 4px;">
              <span style="font-size: 13px; font-weight: bold; color: #1e293b;">Stop #${sIdx + 1}: ${escXml(st.storeName || st.name)}</span><br>
              <span style="font-size: 11px; color: #64748b;">${escXml(st.account || 'Toko')} ${st.storeCode ? `[${escXml(st.storeCode)}]` : ''}</span>
            </div>
            
            <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
              <tr><td style="padding: 2px 0; color: #475569; width: 130px;"><b>Personil MDS:</b></td><td>${escXml(m.nama)}</td></tr>
              <tr><td style="padding: 2px 0; color: #475569;"><b>Status Alokasi:</b></td><td>${isVirtualStore ? '<b style="color: #d97706;">🟡 USULAN REKRUT (VACANT)</b>' : '<b style="color: #16a34a;">🟢 AKTIF (EXISTING)</b>'}</td></tr>
              <tr><td style="padding: 2px 0; color: #475569;"><b>Jadwal Kunjungan:</b></td><td>Hari #${day.dayNumber} (${visitTypeStr})</td></tr>
              <tr><td style="padding: 2px 0; color: #475569;"><b>Wilayah / Kota:</b></td><td>${escXml(st.kabKota || m.kota)} (${escXml(st.kecamatan || '-')})</td></tr>
              <tr><td style="padding: 2px 0; color: #475569;"><b>Titik Acuan:</b></td><td>${isVirtualStore ? 'Sentra Operasional Usulan' : 'Domisili MDS'} (${escXml(m.alamat || m.kota)})</td></tr>
              <tr><td style="padding: 2px 0; color: #475569;"><b>Jarak ke Titik Acuan:</b></td><td><b style="color: ${isPerdin ? '#b45309' : '#4338ca'};">${st.distanceFromHomeKm} km</b> (~${st.travelTimeMins} mnt)</td></tr>
              ${isVirtualStore ? `
              <tr><td colspan="2" style="padding-top: 6px;">
                <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 4px; padding: 5px; font-size: 10.5px;">
                  <div style="color: #b45309; font-weight: bold; margin-bottom: 2px;">📌 Evaluasi Usulan Rekrut:</div>
                  <div>• <b>MDS Aktif Terdekat:</b> ${escXml(nearestMdsName)} ${nearestMdsKota ? `(${escXml(nearestMdsKota)})` : ''}</div>
                  <div>• <b>Jarak Asli ke MDS Terdekat:</b> <b style="color: #dc2626;">${nearestMdsDist} km</b></div>
                  ${reasonText ? `<div style="margin-top: 3px; color: #78350f; font-size: 10px; line-height: 1.3;"><i>${escXml(reasonText)}</i></div>` : ''}
                </div>
              </td></tr>
              ` : ''}
            </table>
          </div>
        ]]></description>
        <Point>
          <coordinates>${st.lng},${st.lat},0</coordinates>
        </Point>
      </Placemark>
`;
          });

          // LineString route path for this day
          kml += `
      <Placemark>
        <name>${escXml(`Jalur Rute H-${day.dayNumber}`)}</name>
        <styleUrl>#routeLine</styleUrl>
        <LineString>
          <extrude>1</extrude>
          <tessellate>1</tessellate>
          <coordinates>
            ${pathCoords.join(' ')}
          </coordinates>
        </LineString>
      </Placemark>
    </Folder>
`;
        });

        kml += `  </Folder>\n`;
      });

      kml += `</Document>\n</kml>`;

      // Trigger Browser Download
      const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const scopeSlug = this.selectedScope === 'JAWA' ? 'Pulau_Jawa' : (this.selectedScope === 'LUAR_PULAU' ? 'Luar_Pulau' : 'Nasional');
      const targetName = exportAll ? `All_MDS_${scopeSlug}` : (this.selectedMds ? this.selectedMds.nama.replace(/\s+/g, '_') : 'MDS');
      a.download = `Cimory_GoogleEarth_${targetName}_${new Date().toISOString().slice(0, 10)}.kml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    // =========================================================================
    // DUAL-PANE MANUAL ROUTE EDITOR (MT MANAGER STYLE) METHODS & GETTERS
    // =========================================================================

    get manualLeftMds() {
      return (this.manualAssignments || []).find(m => m.id === this.manualLeftMdsId) || null;
    },

    get manualRightMds() {
      return (this.manualAssignments || []).find(m => m.id === this.manualRightMdsId) || null;
    },

    get manualLeftDayObj() {
      if (!this.manualLeftMds || this.manualLeftDay === 'ALL') return null;
      return (this.manualLeftMds.dailySchedule || []).find(d => d.dayNumber === parseInt(this.manualLeftDay, 10)) || null;
    },

    get manualRightDayObj() {
      if (!this.manualRightMds || this.manualRightDay === 'ALL') return null;
      return (this.manualRightMds.dailySchedule || []).find(d => d.dayNumber === parseInt(this.manualRightDay, 10)) || null;
    },

    get manualLeftStores() {
      if (!this.manualLeftMds) return [];
      let list = [];
      if (this.manualLeftDay === 'ALL') {
        (this.manualLeftMds.dailySchedule || []).forEach(d => {
          (d?.stores || []).forEach(s => {
            if (s) list.push({ ...s, dayNumber: d.dayNumber, dayType: d.type });
          });
        });
      } else {
        const day = this.manualLeftDayObj;
        (day?.stores || []).forEach(s => {
          if (s) list.push({ ...s, dayNumber: day.dayNumber, dayType: day.type });
        });
      }
      if (this.manualLeftSearch) {
        const q = (this.manualLeftSearch || '').toLowerCase().trim();
        list = list.filter(s => s && ((s.storeName || '').toLowerCase().includes(q) || (s.storeCode || '').toLowerCase().includes(q) || (s.account || '').toLowerCase().includes(q)));
      }
      return list.filter(Boolean);
    },

    get manualRightStores() {
      if (!this.manualRightMds) return [];
      let list = [];
      if (this.manualRightDay === 'ALL') {
        (this.manualRightMds.dailySchedule || []).forEach(d => {
          (d?.stores || []).forEach(s => {
            if (s) list.push({ ...s, dayNumber: d.dayNumber, dayType: d.type });
          });
        });
      } else {
        const day = this.manualRightDayObj;
        (day?.stores || []).forEach(s => {
          if (s) list.push({ ...s, dayNumber: day.dayNumber, dayType: day.type });
        });
      }
      if (this.manualRightSearch) {
        const q = (this.manualRightSearch || '').toLowerCase().trim();
        list = list.filter(s => s && ((s.storeName || '').toLowerCase().includes(q) || (s.storeCode || '').toLowerCase().includes(q) || (s.account || '').toLowerCase().includes(q)));
      }
      return list.filter(Boolean);
    },

    get manualLeftStats() {
      const stores = this.manualLeftStores;
      const count = stores.length;
      if (count === 0) return { count: 0, totalKm: 0, avgDistKm: 0, estTimeMins: 0 };
      const totalKm = stores.reduce((sum, s) => sum + (s.distanceFromHomeKm || 0), 0);
      const avgDistKm = Math.round((totalKm / count) * 10) / 10;
      const estTimeMins = RouteEngine.getEstimatedTravelTimeMins(avgDistKm);
      return { count, totalKm: Math.round(totalKm * 10) / 10, avgDistKm, estTimeMins };
    },

    get manualRightStats() {
      const stores = this.manualRightStores;
      const count = stores.length;
      if (count === 0) return { count: 0, totalKm: 0, avgDistKm: 0, estTimeMins: 0 };
      const totalKm = stores.reduce((sum, s) => sum + (s.distanceFromHomeKm || 0), 0);
      const avgDistKm = Math.round((totalKm / count) * 10) / 10;
      const estTimeMins = RouteEngine.getEstimatedTravelTimeMins(avgDistKm);
      return { count, totalKm: Math.round(totalKm * 10) / 10, avgDistKm, estTimeMins };
    },

    get filteredManualLeftMdsList() {
      const q = (this.manualLeftMdsSearch || '').toLowerCase().trim();
      const list = this.manualAssignments || [];
      if (!q) return list;
      return list.filter(m => 
        (m.nama || '').toLowerCase().includes(q) || 
        (m.kota || '').toLowerCase().includes(q) || 
        (m.modul || '').toLowerCase().includes(q) ||
        (m.id || '').toLowerCase().includes(q)
      );
    },

    get filteredManualRightMdsList() {
      const q = (this.manualRightMdsSearch || '').toLowerCase().trim();
      const list = this.manualAssignments || [];
      if (!q) return list;
      return list.filter(m => 
        (m.nama || '').toLowerCase().includes(q) || 
        (m.kota || '').toLowerCase().includes(q) || 
        (m.modul || '').toLowerCase().includes(q) ||
        (m.id || '').toLowerCase().includes(q)
      );
    },

    selectManualMds(side, mdsId) {
      if (side === 'LEFT') {
        this.manualLeftMdsId = mdsId;
        this.manualLeftDropdownOpen = false;
        this.manualLeftSelectedStoreCodes = [];
      } else {
        this.manualRightMdsId = mdsId;
        this.manualRightDropdownOpen = false;
        this.manualRightSelectedStoreCodes = [];
      }
      this.renderManualMap();
    },

    setSimulasiMode(mode) {
      if (this.simulasiMode === mode) return;

      // 1. Tampilkan overlay preloader langsung saat klik
      this.isLoading = true;
      this.loadingMessage = mode === 'MANUAL' 
        ? 'Menyiapkan Editor Rute & memuat workspace...' 
        : 'Menyiapkan Simulasi Otomatis...';
      
      // 2. Ganti state mode & simpan ke localStorage
      this.simulasiMode = mode;
      localStorage.setItem('route_sim_active_mode', mode);

      // 3. Eksekusi load data & inisialisasi peta secara asynchronous agar UI transisi mulus
      setTimeout(() => {
        try {
          if (mode === 'MANUAL') {
            if (!this.manualAssignments || this.manualAssignments.length === 0) {
              this.loadManualFromAuto(false);
            }
            if (!this.manualLeftMdsId && this.manualAssignments.length > 0) {
              this.manualLeftMdsId = this.manualAssignments[0].id;
            }
            if (!this.manualRightMdsId && this.manualAssignments.length > 0) {
              this.manualRightMdsId = this.manualAssignments.length > 1 ? this.manualAssignments[1].id : this.manualAssignments[0].id;
            }
            this.initManualMap();
            this.renderManualMap();
          } else {
            if (this.map) this.map.invalidateSize();
          }
        } catch (err) {
          console.error("Error switching mode:", err);
        } finally {
          this.$nextTick(() => {
            if (window.lucide) lucide.createIcons();
            this.isLoading = false;
          });
        }
      }, 120);
    },

    loadManualFromAuto(confirmPrompt = true) {
      if (confirmPrompt && this.manualAssignments.length > 0) {
        if (!confirm('Tindakan ini akan menduplikasi hasil simulasi otomatis ke workspace manual. Lanjutkan?')) {
          return;
        }
      }
      if (!this.simulationResult || !this.simulationResult.assignments) {
        this.runSimulation();
      }
      const raw = JSON.parse(JSON.stringify(this.simulationResult.assignments || []));
      
      // Apply any persistent store edits
      raw.forEach(mds => {
        (mds.dailySchedule || []).forEach(day => {
          (day.stores || []).forEach(st => {
            if (this.storeEditsMap && this.storeEditsMap[st.storeCode]) {
              Object.assign(st, this.storeEditsMap[st.storeCode]);
            }
          });
        });
        this.recalculateMdsStats(mds);
      });

      this.manualAssignments = raw;
      this.manualLeftSelectedStoreCodes = [];
      this.manualRightSelectedStoreCodes = [];
      if (this.manualAssignments.length > 0) {
        if (!this.manualLeftMdsId) this.manualLeftMdsId = this.manualAssignments[0].id;
        if (!this.manualRightMdsId) this.manualRightMdsId = this.manualAssignments.length > 1 ? this.manualAssignments[1].id : this.manualAssignments[0].id;
      }
      this.saveManualDraftToDb();
      this.renderManualMap();
      this.showToast('✅ Berhasil memuat baseline data dari simulasi otomatis ke editor manual.');
    },

    initManualMap() {
      const mapEl = document.getElementById('manual-dual-map');
      if (!mapEl) return;
      if (this.manualMap) {
        this.manualMap.invalidateSize();
        return;
      }
      this.manualMap = L.map('manual-dual-map', {
        center: [-7.25, 110.0],
        zoom: 8,
        zoomControl: true,
        scrollWheelZoom: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(this.manualMap);

      this.manualMapMarkersLayer = L.layerGroup().addTo(this.manualMap);
      this.manualMapRoutesLayer = L.layerGroup().addTo(this.manualMap);
    },

    recalculateMdsStats(mds) {
      if (!mds) return;
      let allStores = [];
      let totalPerdin = 0;
      let totalKm = 0;

      const homeLat = mds.homeLat ? parseFloat(mds.homeLat) : null;
      const homeLng = mds.homeLng ? parseFloat(mds.homeLng) : null;

      (mds.dailySchedule || []).forEach(day => {
        (day.stores || []).forEach(st => {
          allStores.push(st);
          const stLat = parseFloat(st.lat);
          const stLng = parseFloat(st.lng);
          if (homeLat !== null && homeLng !== null && isFinite(stLat) && isFinite(stLng)) {
            st.distanceFromHomeKm = RouteEngine.getDistanceKm(homeLat, homeLng, stLat, stLng);
            st.estTravelMins = RouteEngine.getEstimatedTravelTimeMins(st.distanceFromHomeKm);
            st.isPerdin = st.distanceFromHomeKm > 35;
          }
          totalKm += (st.distanceFromHomeKm || 0);
          if (st.isPerdin) totalPerdin++;
        });
      });

      mds.assignedStores = allStores;
      mds.totalStores = allStores.length;
      mds.totalPerdin = totalPerdin;
      mds.totalDistanceKm = Math.round(totalKm * 10) / 10;
      mds.avgDistanceKm = allStores.length > 0 ? Math.round((totalKm / allStores.length) * 10) / 10 : 0;
    },

    pushManualHistory(actionName = 'Edit Rute') {
      if (!this.manualAssignments || this.manualAssignments.length === 0) return;
      if (!this.manualHistory) this.manualHistory = [];
      if (this.manualHistory.length >= 25) {
        this.manualHistory.shift();
      }
      this.manualHistory.push({
        actionName,
        timestamp: Date.now(),
        snapshot: JSON.parse(JSON.stringify(this.manualAssignments))
      });
    },

    undoManualAction() {
      if (!this.manualHistory || this.manualHistory.length === 0) {
        this.showToast('ℹ️ Tidak ada riwayat aksi untuk dibatalkan (Undo).');
        return;
      }
      const lastHistory = this.manualHistory.pop();
      if (!lastHistory || !lastHistory.snapshot) return;

      this.isLoading = true;
      this.loadingMessage = `Membatalkan aksi: ${lastHistory.actionName}...`;

      setTimeout(() => {
        try {
          this.manualAssignments = lastHistory.snapshot;
          this.manualLeftSelectedStoreCodes = [];
          this.manualRightSelectedStoreCodes = [];
          
          (this.manualAssignments || []).forEach(m => this.recalculateMdsStats(m));
          this.saveManualDraftToDb();
          this.renderManualMap();
          this.showToast(`↩️ Undo berhasil: ${lastHistory.actionName}`);
        } catch (err) {
          console.error("Undo error:", err);
        } finally {
          this.isLoading = false;
          this.$nextTick(() => {
            if (window.lucide) lucide.createIcons();
          });
        }
      }, 100);
    },

    renderManualMap() {
      if (!this.manualMap) {
        this.initManualMap();
        if (!this.manualMap) return;
      }
      this.manualMap.invalidateSize();

      if (this.manualMapMarkersLayer) this.manualMapMarkersLayer.clearLayers();
      if (this.manualMapRoutesLayer) this.manualMapRoutesLayer.clearLayers();

      const allBounds = [];

      // Render Left Panel Stores (Indigo / Royal Blue: #4f46e5)
      if (this.manualLeftMds) {
        const leftColor = '#4f46e5';
        const leftStores = this.manualLeftStores;
        const leftHomeLat = this.manualLeftMds.homeLat ? parseFloat(this.manualLeftMds.homeLat) : null;
        const leftHomeLng = this.manualLeftMds.homeLng ? parseFloat(this.manualLeftMds.homeLng) : null;

        // Home Base Marker
        if (leftHomeLat !== null && leftHomeLng !== null && isFinite(leftHomeLat) && isFinite(leftHomeLng)) {
          const homeIcon = L.divIcon({
            className: 'custom-home-marker-l',
            html: `
              <div style="background-color: ${leftColor}; width: 28px; height: 28px; border-radius: 8px; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 13px;">
                🏠
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });
          const homeMarker = L.marker([leftHomeLat, leftHomeLng], { icon: homeIcon })
            .bindPopup(`
              <div style="font-family: sans-serif; font-size: 11px;">
                <div style="font-weight: 800; color: ${leftColor}; font-size: 12px;">🏠 Basecamp MDS A (Kiri)</div>
                <div><b>${this.manualLeftMds.nama}</b> (${this.manualLeftMds.modul})</div>
                <div style="color: #64748b; font-size: 10px;">${this.manualLeftMds.kota}</div>
              </div>
            `);
          this.manualMapMarkersLayer.addLayer(homeMarker);
          allBounds.push([leftHomeLat, leftHomeLng]);
        }

        // Stores
        const leftPath = [];
        if (leftHomeLat !== null && leftHomeLng !== null && isFinite(leftHomeLat) && isFinite(leftHomeLng)) {
          leftPath.push([leftHomeLat, leftHomeLng]);
        }

        leftStores.forEach((st, idx) => {
          const lat = parseFloat(st.lat);
          const lng = parseFloat(st.lng);
          if (!isFinite(lat) || !isFinite(lng)) return;

          const isChecked = (this.manualLeftSelectedStoreCodes || []).includes(st.storeCode);
          const isEdited = !!(this.storeEditsMap && this.storeEditsMap[st.storeCode]);

          const storeIcon = L.divIcon({
            className: 'custom-store-marker-l',
            html: `
              <div style="background-color: ${isChecked ? '#10b981' : leftColor}; width: ${isChecked ? '26px' : '22px'}; height: ${isChecked ? '26px' : '22px'}; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 10px;">
                ${idx + 1}
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          const popupContent = `
            <div style="font-family: sans-serif; font-size: 11px; min-width: 180px;">
              <div style="font-weight: bold; color: ${leftColor}; margin-bottom: 2px;">
                [Panel Kiri - H${st.dayNumber || this.manualLeftDay}] #${idx + 1} ${isEdited ? '✏️' : ''}
              </div>
              <div style="font-weight: 800; font-size: 12px;">${st.storeName}</div>
              <div style="color: #64748b; font-size: 10px;">Kode: <b>${st.storeCode}</b> • ${st.account}</div>
              <div style="color: #64748b; font-size: 10px;">Jarak Basecamp: <b>${st.distanceFromHomeKm || 0} km</b></div>
              <div style="margin-top: 6px; display: flex; gap: 4px;">
                <button onclick="window._routeSimApp.openEditStoreModalByCode('${st.storeCode}')" style="background: #6366f1; color: white; border: none; border-radius: 6px; padding: 3px 8px; font-size: 10px; font-weight: bold; cursor: pointer;">
                  ✏️ Edit Toko
                </button>
                <button onclick="window._routeSimApp.quickTransferStore('${st.storeCode}', 'LEFT_TO_RIGHT')" style="background: #0ea5e9; color: white; border: none; border-radius: 6px; padding: 3px 8px; font-size: 10px; font-weight: bold; cursor: pointer;">
                  Pindah ke Kanan &rarr;
                </button>
              </div>
            </div>
          `;

          const marker = L.marker([lat, lng], { icon: storeIcon }).bindPopup(popupContent);
          this.manualMapMarkersLayer.addLayer(marker);
          leftPath.push([lat, lng]);
          allBounds.push([lat, lng]);
        });

        // Draw Polyline for Left
        if (leftPath.length > 1) {
          const polyline = L.polyline(leftPath, {
            color: leftColor,
            weight: 3,
            opacity: 0.75,
            dashArray: '6, 6'
          });
          this.manualMapRoutesLayer.addLayer(polyline);
        }
      }

      // Render Right Panel Stores (Amber / Orange: #d97706)
      if (this.manualRightMds && this.manualRightMds.id !== this.manualLeftMdsId) {
        const rightColor = '#d97706';
        const rightStores = this.manualRightStores;
        const rightHomeLat = this.manualRightMds.homeLat ? parseFloat(this.manualRightMds.homeLat) : null;
        const rightHomeLng = this.manualRightMds.homeLng ? parseFloat(this.manualRightMds.homeLng) : null;

        // Home Base Marker
        if (rightHomeLat !== null && rightHomeLng !== null && isFinite(rightHomeLat) && isFinite(rightHomeLng)) {
          const homeIcon = L.divIcon({
            className: 'custom-home-marker-r',
            html: `
              <div style="background-color: ${rightColor}; width: 28px; height: 28px; border-radius: 8px; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 13px;">
                🏠
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });
          const homeMarker = L.marker([rightHomeLat, rightHomeLng], { icon: homeIcon })
            .bindPopup(`
              <div style="font-family: sans-serif; font-size: 11px;">
                <div style="font-weight: 800; color: ${rightColor}; font-size: 12px;">🏠 Basecamp MDS B (Kanan)</div>
                <div><b>${this.manualRightMds.nama}</b> (${this.manualRightMds.modul})</div>
                <div style="color: #64748b; font-size: 10px;">${this.manualRightMds.kota}</div>
              </div>
            `);
          this.manualMapMarkersLayer.addLayer(homeMarker);
          allBounds.push([rightHomeLat, rightHomeLng]);
        }

        // Stores
        const rightPath = [];
        if (rightHomeLat !== null && rightHomeLng !== null && isFinite(rightHomeLat) && isFinite(rightHomeLng)) {
          rightPath.push([rightHomeLat, rightHomeLng]);
        }

        rightStores.forEach((st, idx) => {
          const lat = parseFloat(st.lat);
          const lng = parseFloat(st.lng);
          if (!isFinite(lat) || !isFinite(lng)) return;

          const isChecked = (this.manualRightSelectedStoreCodes || []).includes(st.storeCode);
          const isEdited = !!(this.storeEditsMap && this.storeEditsMap[st.storeCode]);

          const storeIcon = L.divIcon({
            className: 'custom-store-marker-r',
            html: `
              <div style="background-color: ${isChecked ? '#10b981' : rightColor}; width: ${isChecked ? '26px' : '22px'}; height: ${isChecked ? '26px' : '22px'}; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 10px;">
                ${idx + 1}
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          const popupContent = `
            <div style="font-family: sans-serif; font-size: 11px; min-width: 180px;">
              <div style="font-weight: bold; color: ${rightColor}; margin-bottom: 2px;">
                [Panel Kanan - H${st.dayNumber || this.manualRightDay}] #${idx + 1} ${isEdited ? '✏️' : ''}
              </div>
              <div style="font-weight: 800; font-size: 12px;">${st.storeName}</div>
              <div style="color: #64748b; font-size: 10px;">Kode: <b>${st.storeCode}</b> • ${st.account}</div>
              <div style="color: #64748b; font-size: 10px;">Jarak Basecamp: <b>${st.distanceFromHomeKm || 0} km</b></div>
              <div style="margin-top: 6px; display: flex; gap: 4px;">
                <button onclick="window._routeSimApp.openEditStoreModalByCode('${st.storeCode}')" style="background: #6366f1; color: white; border: none; border-radius: 6px; padding: 3px 8px; font-size: 10px; font-weight: bold; cursor: pointer;">
                  ✏️ Edit Toko
                </button>
                <button onclick="window._routeSimApp.quickTransferStore('${st.storeCode}', 'RIGHT_TO_LEFT')" style="background: #0ea5e9; color: white; border: none; border-radius: 6px; padding: 3px 8px; font-size: 10px; font-weight: bold; cursor: pointer;">
                  &larr; Pindah ke Kiri
                </button>
              </div>
            </div>
          `;

          const marker = L.marker([lat, lng], { icon: storeIcon }).bindPopup(popupContent);
          this.manualMapMarkersLayer.addLayer(marker);
          rightPath.push([lat, lng]);
          allBounds.push([lat, lng]);
        });

        // Draw Polyline for Right
        if (rightPath.length > 1) {
          const polyline = L.polyline(rightPath, {
            color: rightColor,
            weight: 3,
            opacity: 0.75,
            dashArray: '6, 6'
          });
          this.manualMapRoutesLayer.addLayer(polyline);
        }
      }

      // Auto Fit Bounds (Offset ke kanan agar tidak tertutup dock berdampingan di kiri)
      if (allBounds.length > 0 && this.manualMap) {
        const leftPadding = !this.manualDualPanelCollapsed ? (window.innerWidth < 1024 ? 340 : 660) : 40;
        this.manualMap.fitBounds(allBounds, {
          paddingTopLeft: [leftPadding, 70],
          paddingBottomRight: [40, 40],
          maxZoom: 14
        });
      }

      window._routeSimApp = this;
    },

    toggleManualDualPanel() {
      this.manualDualPanelCollapsed = !this.manualDualPanelCollapsed;
      this.$nextTick(() => {
        if (this.manualMap) {
          this.manualMap.invalidateSize();
          this.renderManualMap();
        }
        if (window.lucide) lucide.createIcons();
      });
    },

    toggleManualSelectAll(side) {
      if (side === 'LEFT') {
        const allCodes = this.manualLeftStores.map(s => s.storeCode);
        if (this.manualLeftSelectedStoreCodes.length === allCodes.length) {
          this.manualLeftSelectedStoreCodes = [];
        } else {
          this.manualLeftSelectedStoreCodes = [...allCodes];
        }
      } else {
        const allCodes = this.manualRightStores.map(s => s.storeCode);
        if (this.manualRightSelectedStoreCodes.length === allCodes.length) {
          this.manualRightSelectedStoreCodes = [];
        } else {
          this.manualRightSelectedStoreCodes = [...allCodes];
        }
      }
    },

    transferStores(direction) {
      if (!this.manualLeftMds || !this.manualRightMds) {
        this.showToast('⚠️ Pilih personil MDS pada kedua panel terlebih dahulu.');
        return;
      }

      const isLtoR = direction === 'LEFT_TO_RIGHT';
      const selectedCodes = isLtoR ? [...this.manualLeftSelectedStoreCodes] : [...this.manualRightSelectedStoreCodes];

      if (selectedCodes.length === 0) {
        this.showToast(`⚠️ Centang toko di panel ${isLtoR ? 'Kiri' : 'Kanan'} yang ingin dipindahkan.`);
        return;
      }

      const sourceMds = isLtoR ? this.manualLeftMds : this.manualRightMds;
      const targetMds = isLtoR ? this.manualRightMds : this.manualLeftMds;
      const targetDayNum = isLtoR ? (this.manualRightDay === 'ALL' ? 1 : parseInt(this.manualRightDay, 10)) : (this.manualLeftDay === 'ALL' ? 1 : parseInt(this.manualLeftDay, 10));

      const targetDay = (targetMds.dailySchedule || []).find(d => d.dayNumber === targetDayNum);
      if (!targetDay) {
        this.showToast('⚠️ Target hari tidak ditemukan.');
        return;
      }
      if (!targetDay.stores) targetDay.stores = [];

      // Record Undo state snapshot before mutation
      this.pushManualHistory(isLtoR ? `Pindah ${selectedCodes.length} Toko ke Kanan` : `Pindah ${selectedCodes.length} Toko ke Kiri`);

      // 1. Tampilkan overlay preloader langsung saat aksi dimulai
      this.isLoading = true;
      this.loadingMessage = `Memindahkan ${selectedCodes.length} toko ke ${targetMds.nama} (H-${targetDayNum})...`;

      // 2. Eksekusi perpindahan data secara asynchronous
      setTimeout(() => {
        try {
          const movedStores = [];

          // Extract from source
          (sourceMds.dailySchedule || []).forEach(day => {
            if (!day.stores) return;
            const remaining = [];
            day.stores.forEach(st => {
              if (selectedCodes.includes(st.storeCode)) {
                // Recalculate distance to new target MDS home
                if (targetMds.homeLat && targetMds.homeLng) {
                  st.distanceFromHomeKm = RouteEngine.getDistanceKm(parseFloat(targetMds.homeLat), parseFloat(targetMds.homeLng), parseFloat(st.lat), parseFloat(st.lng));
                  st.estTravelMins = RouteEngine.getEstimatedTravelTimeMins(st.distanceFromHomeKm);
                  st.isPerdin = st.distanceFromHomeKm > 35;
                }
                st.dayNumber = targetDayNum;
                movedStores.push(st);
              } else {
                remaining.push(st);
              }
            });
            day.stores = remaining;
          });

          // Append to target
          targetDay.stores.push(...movedStores);

          // Recalculate stats for both
          this.recalculateMdsStats(sourceMds);
          this.recalculateMdsStats(targetMds);

          // Clear selection on both sides to refresh badge & checkbox states cleanly
          this.manualLeftSelectedStoreCodes = [];
          this.manualRightSelectedStoreCodes = [];

          this.saveManualDraftToDb();
          this.renderManualMap();
          this.showToast(`✅ Berhasil memindahkan ${movedStores.length} toko ke ${targetMds.nama} (H-${targetDayNum}).`);
        } catch (err) {
          console.error("Error during store transfer:", err);
          this.showToast('❌ Terjadi kesalahan saat memindahkan toko.');
        } finally {
          this.isLoading = false;
          this.$nextTick(() => {
            if (window.lucide) lucide.createIcons();
          });
        }
      }, 80);
    },

    quickTransferStore(storeCode, direction) {
      if (direction === 'LEFT_TO_RIGHT') {
        this.manualLeftSelectedStoreCodes = [storeCode];
        this.transferStores('LEFT_TO_RIGHT');
      } else {
        this.manualRightSelectedStoreCodes = [storeCode];
        this.transferStores('RIGHT_TO_LEFT');
      }
    },

    swapFullDayRoutes() {
      if (!this.manualLeftMds || !this.manualRightMds) {
        this.showToast('⚠️ Pilih personil MDS pada kedua panel terlebih dahulu.');
        return;
      }
      if (this.manualLeftDay === 'ALL' || this.manualRightDay === 'ALL') {
        this.showToast('⚠️ Pilih nomor hari spesifik (R1 s/d R25) di kedua panel untuk melakukan tukar rute 1 hari full.');
        return;
      }

      const leftDayNum = parseInt(this.manualLeftDay, 10);
      const rightDayNum = parseInt(this.manualRightDay, 10);

      const leftDay = (this.manualLeftMds.dailySchedule || []).find(d => d.dayNumber === leftDayNum);
      const rightDay = (this.manualRightMds.dailySchedule || []).find(d => d.dayNumber === rightDayNum);

      if (!leftDay || !rightDay) {
        this.showToast('⚠️ Data rute hari tidak ditemukan.');
        return;
      }

      // Record Undo snapshot
      this.pushManualHistory(`Tukar Rute H-${leftDayNum} & H-${rightDayNum}`);

      this.isLoading = true;
      this.loadingMessage = `Menukar seluruh rute H-${leftDayNum} (${this.manualLeftMds.nama}) & H-${rightDayNum} (${this.manualRightMds.nama})...`;

      setTimeout(() => {
        try {
          const tempLeftStores = leftDay.stores || [];
          const tempRightStores = rightDay.stores || [];

          // Update distance to new homes
          tempRightStores.forEach(st => {
            if (this.manualLeftMds.homeLat && this.manualLeftMds.homeLng) {
              st.distanceFromHomeKm = RouteEngine.getDistanceKm(parseFloat(this.manualLeftMds.homeLat), parseFloat(this.manualLeftMds.homeLng), parseFloat(st.lat), parseFloat(st.lng));
              st.estTravelMins = RouteEngine.getEstimatedTravelTimeMins(st.distanceFromHomeKm);
              st.isPerdin = st.distanceFromHomeKm > 35;
            }
            st.dayNumber = leftDayNum;
          });

          tempLeftStores.forEach(st => {
            if (this.manualRightMds.homeLat && this.manualRightMds.homeLng) {
              st.distanceFromHomeKm = RouteEngine.getDistanceKm(parseFloat(this.manualRightMds.homeLat), parseFloat(this.manualRightMds.homeLng), parseFloat(st.lat), parseFloat(st.lng));
              st.estTravelMins = RouteEngine.getEstimatedTravelTimeMins(st.distanceFromHomeKm);
              st.isPerdin = st.distanceFromHomeKm > 35;
            }
            st.dayNumber = rightDayNum;
          });

          leftDay.stores = tempRightStores;
          rightDay.stores = tempLeftStores;

          this.recalculateMdsStats(this.manualLeftMds);
          this.recalculateMdsStats(this.manualRightMds);

          this.manualLeftSelectedStoreCodes = [];
          this.manualRightSelectedStoreCodes = [];

          this.saveManualDraftToDb();
          this.renderManualMap();
          this.showToast(`⇄ Berhasil menukar seluruh rute H-${leftDayNum} (${this.manualLeftMds.nama}) & H-${rightDayNum} (${this.manualRightMds.nama}).`);
        } catch (err) {
          console.error("Error swapping routes:", err);
          this.showToast('❌ Gagal menukar rute.');
        } finally {
          this.isLoading = false;
          this.$nextTick(() => {
            if (window.lucide) lucide.createIcons();
          });
        }
      }, 80);
    },

    toggleManualDcDay(side) {
      const isLeft = side === 'LEFT';
      const mds = isLeft ? this.manualLeftMds : this.manualRightMds;
      const dayNum = isLeft ? this.manualLeftDay : this.manualRightDay;

      if (!mds || dayNum === 'ALL') {
        this.showToast('⚠️ Pilih hari kerja spesifik untuk mengatur status DC.');
        return;
      }

      const day = (mds.dailySchedule || []).find(d => d.dayNumber === parseInt(dayNum, 10));
      if (!day) return;

      this.pushManualHistory(`Ubah Status DC H-${dayNum} (${mds.nama})`);

      this.isLoading = true;
      this.loadingMessage = `Mengubah tipe jadwal H-${dayNum}...`;

      setTimeout(() => {
        try {
          day.type = day.type === 'DC' ? 'STORE' : 'DC';
          this.recalculateMdsStats(mds);
          this.saveManualDraftToDb();
          this.renderManualMap();
          this.showToast(`🏭 Status Hari H-${dayNum} (${mds.nama}) diubah menjadi: ${day.type === 'DC' ? 'Hari Kunjungan DC' : 'Hari Toko Reguler'}`);
        } finally {
          this.isLoading = false;
          this.$nextTick(() => {
            if (window.lucide) lucide.createIcons();
          });
        }
      }, 60);
    },

    reorderManualDayTsp(side) {
      const isLeft = side === 'LEFT';
      const mds = isLeft ? this.manualLeftMds : this.manualRightMds;
      const dayNum = isLeft ? this.manualLeftDay : this.manualRightDay;

      if (!mds || dayNum === 'ALL') {
        this.showToast('⚠️ Pilih hari kerja spesifik untuk merapikan urutan rute.');
        return;
      }

      const day = (mds.dailySchedule || []).find(d => d.dayNumber === parseInt(dayNum, 10));
      if (!day || !day.stores || day.stores.length <= 1) {
        this.showToast('ℹ️ Minimal 2 toko untuk mengoptimalkan urutan jalan.');
        return;
      }

      this.pushManualHistory(`Optimasi TSP H-${dayNum} (${mds.nama})`);

      this.isLoading = true;
      this.loadingMessage = `Merapikan urutan rute H-${dayNum} (TSP)...`;

      setTimeout(() => {
        try {
          // Simple Nearest Neighbor TSP Reordering
          const unvisited = [...day.stores];
          const ordered = [];
          let curLat = mds.homeLat ? parseFloat(mds.homeLat) : (unvisited[0] ? parseFloat(unvisited[0].lat) : 0);
          let curLng = mds.homeLng ? parseFloat(mds.homeLng) : (unvisited[0] ? parseFloat(unvisited[0].lng) : 0);

          while (unvisited.length > 0) {
            let nearestIdx = 0;
            let minDist = 999999;
            for (let i = 0; i < unvisited.length; i++) {
              const d = RouteEngine.getDistanceKm(curLat, curLng, parseFloat(unvisited[i].lat), parseFloat(unvisited[i].lng));
              if (d < minDist) {
                minDist = d;
                nearestIdx = i;
              }
            }
            const nextStore = unvisited.splice(nearestIdx, 1)[0];
            ordered.push(nextStore);
            curLat = parseFloat(nextStore.lat);
            curLng = parseFloat(nextStore.lng);
          }

          day.stores = ordered;
          this.recalculateMdsStats(mds);
          this.saveManualDraftToDb();
          this.renderManualMap();
          this.showToast(`⚡ Urutan rute H-${dayNum} (${mds.nama}) berhasil dioptimalkan (TSP Nearest-Neighbor).`);
        } finally {
          this.isLoading = false;
          this.$nextTick(() => {
            if (window.lucide) lucide.createIcons();
          });
        }
      }, 80);
    },

    // =========================================================================
    // DRAFT PERSISTENCE & LOCAL JSON IMPORT / EXPORT
    // =========================================================================

    exportManualDraftJson() {
      if (!this.manualAssignments || this.manualAssignments.length === 0) {
        this.showToast('⚠️ Belum ada data simulasi manual untuk diekspor.');
        return;
      }

      const draftPayload = {
        app: 'Cimory_RouteSim_Draft',
        version: 1,
        exportedAt: new Date().toISOString(),
        selectedScope: this.selectedScope,
        params: this.params,
        manualAssignments: this.manualAssignments,
        storeEditsMap: this.storeEditsMap || {}
      };

      const jsonStr = JSON.stringify(draftPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cimory_Simulasi_Manual_Draft_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showToast('💾 File Draft Progres (.json) berhasil di-download.');
    },

    importManualDraftJson(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data || !data.manualAssignments) {
            alert('Format file JSON tidak valid atau bukan file draft simulasi rute Cimory.');
            return;
          }

          this.manualAssignments = data.manualAssignments || [];
          this.storeEditsMap = data.storeEditsMap || {};
          if (data.params) this.params = Object.assign(this.params, data.params);
          if (data.selectedScope) this.selectedScope = data.selectedScope;

          if (this.manualAssignments.length > 0) {
            this.manualLeftMdsId = this.manualAssignments[0].id;
            this.manualRightMdsId = this.manualAssignments.length > 1 ? this.manualAssignments[1].id : this.manualAssignments[0].id;
          }

          this.saveManualDraftToDb();
          this.renderManualMap();
          this.showToast(`📂 Berhasil memuat draft: ${this.manualAssignments.length} MDS & ${Object.keys(this.storeEditsMap).length} revisi toko.`);
        } catch (err) {
          console.error("Import draft error:", err);
          alert('Gagal membaca file JSON draft: ' + err.message);
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    },

    async saveManualDraftToDb() {
      if (typeof SimulasiDB !== 'undefined' && this.manualAssignments && this.manualAssignments.length > 0) {
        try {
          // Deep clean clone to plain objects to avoid IDB DataCloneError with Alpine Proxy objects
          const cleanAssignments = JSON.parse(JSON.stringify(this.manualAssignments));
          const cleanEdits = JSON.parse(JSON.stringify(this.storeEditsMap || {}));
          await SimulasiDB.set('manual_route_draft', {
            manualAssignments: cleanAssignments,
            storeEditsMap: cleanEdits
          }, { updatedAt: new Date().toISOString() });
        } catch (e) {
          console.warn("Auto-save manual draft error:", e);
        }
      }
    },

    // =========================================================================
    // STORE IDENTITY EDITING & MODIFICATION LOG EXPORTER
    // =========================================================================

    openEditStoreModalByCode(storeCode) {
      let found = null;
      // Search in manualAssignments
      for (const mds of (this.manualAssignments || [])) {
        for (const day of (mds.dailySchedule || [])) {
          const s = (day.stores || []).find(st => st.storeCode === storeCode);
          if (s) { found = s; break; }
        }
        if (found) break;
      }
      if (!found) {
        // Fallback to rawStores
        found = (this.rawStores || []).find(st => st.storeCode === storeCode);
      }
      if (found) {
        this.openEditStoreModal(found);
      } else {
        this.showToast(`⚠️ Toko dengan kode ${storeCode} tidak ditemukan.`);
      }
    },

    openEditStoreModal(store) {
      if (!store) return;
      this.editingStore = {
        original: { ...store },
        form: {
          storeCode: store.storeCode || '',
          storeName: store.storeName || '',
          account: store.account || 'INDOMARET',
          region: store.region || 'DK',
          lat: store.lat !== undefined ? store.lat : 0,
          lng: store.lng !== undefined ? store.lng : 0,
          address: store.address || ''
        }
      };
      this.showEditStoreModal = true;
      this.$nextTick(() => {
        if (window.lucide) lucide.createIcons();
      });
    },

    saveStoreEdits() {
      if (!this.editingStore || !this.editingStore.form) return;
      const f = this.editingStore.form;
      const code = f.storeCode.trim();

      if (!code) {
        alert('Kode toko tidak boleh kosong.');
        return;
      }

      const parsedLat = parseFloat(f.lat);
      const parsedLng = parseFloat(f.lng);

      if (isNaN(parsedLat) || isNaN(parsedLng)) {
        alert('Latitude dan Longitude harus berupa angka yang valid.');
        return;
      }

      const editRecord = {
        storeCode: code,
        storeName: f.storeName.trim(),
        account: f.account,
        region: f.region,
        lat: parsedLat,
        lng: parsedLng,
        address: f.address.trim(),
        isEdited: true,
        originalStoreName: this.editingStore.original.storeName,
        originalLat: this.editingStore.original.lat,
        originalLng: this.editingStore.original.lng,
        editTimestamp: new Date().toISOString()
      };

      if (!this.storeEditsMap) this.storeEditsMap = {};
      this.storeEditsMap[code] = editRecord;

      // Update in manualAssignments
      (this.manualAssignments || []).forEach(mds => {
        (mds.dailySchedule || []).forEach(day => {
          (day.stores || []).forEach(st => {
            if (st.storeCode === code) {
              Object.assign(st, editRecord);
              if (mds.homeLat && mds.homeLng) {
                st.distanceFromHomeKm = RouteEngine.getDistanceKm(mds.homeLat, mds.homeLng, st.lat, st.lng);
                st.estTravelMins = RouteEngine.getEstimatedTravelTimeMins(st.distanceFromHomeKm);
                st.isPerdin = st.distanceFromHomeKm > 35;
              }
            }
          });
        });
        this.recalculateMdsStats(mds);
      });

      // Update in rawStores
      const rawMatch = (this.rawStores || []).find(st => st.storeCode === code);
      if (rawMatch) {
        Object.assign(rawMatch, editRecord);
      }

      this.showEditStoreModal = false;
      this.saveManualDraftToDb();
      this.renderManualMap();
      this.showToast(`✏️ Data toko ${editRecord.storeName} (${code}) berhasil diperbarui.`);
    },

    exportStoreEditsExcel() {
      const editKeys = Object.keys(this.storeEditsMap || {});
      if (editKeys.length === 0) {
        this.showToast('ℹ️ Belum ada data toko yang diedit manual.');
        return;
      }

      if (typeof XLSX === 'undefined') {
        alert('Library XLSX belum siap.');
        return;
      }

      const rows = editKeys.map((code, idx) => {
        const item = this.storeEditsMap[code];
        return {
          'No': idx + 1,
          'Kode Toko': item.storeCode,
          'Nama Toko (Baru/Revisi)': item.storeName,
          'Nama Toko (Asli)': item.originalStoreName || '-',
          'Account': item.account,
          'Region': item.region,
          'Latitude (Baru)': item.lat,
          'Longitude (Baru)': item.lng,
          'Latitude (Asli)': item.originalLat !== undefined ? item.originalLat : '-',
          'Longitude (Asli)': item.originalLng !== undefined ? item.originalLng : '-',
          'Alamat': item.address || '-',
          'Waktu Revisi': item.editTimestamp || '-'
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Log Revisi Toko');

      const filename = `Cimory_Log_Revisi_Master_Toko_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
      this.showToast(`📤 Berhasil mengunduh rekap log revisi (${editKeys.length} toko).`);
    }
  }));
});
