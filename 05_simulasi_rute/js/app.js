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

    // Leaflet Map Instance
    map: null,
    mapMarkersLayer: null,
    mapRoutesLayer: null,
    activeTab: 'MAP', // 'MAP' | 'SCHEDULE'

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
        // 1. Load Datasets
        this.rawPersonnel = window.MDS_PERSONNEL_DATA || [];
        this.rawStores = await StoreService.loadMasterStores();

        // 2. Run Initial Simulation for Pulau Jawa
        this.runSimulation();

        // 3. Setup Leaflet Map on next tick
        this.$nextTick(() => {
          this.initMap();
          if (window.lucide) lucide.createIcons();
        });

      } catch (err) {
        console.error('[App] Init Error:', err);
      } finally {
        this.isLoading = false;
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
          return RouteEngine.getIslandGroup(st.lat, st.lng, st.kabKota, '') === 'JAWA';
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

          if (this.simulationResult.assignments.length > 0) {
            if (!this.selectedMds || !this.simulationResult.assignments.some(m => m.id === this.selectedMds.id)) {
              this.selectedMds = this.simulationResult.assignments[0];
            } else {
              this.selectedMds = this.simulationResult.assignments.find(m => m.id === this.selectedMds.id) || this.simulationResult.assignments[0];
            }
          } else {
            this.selectedMds = null;
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
      this.selectedMds = mds;
      this.selectedDayIndex = 1;
      this.showMdsDrawer = false;
      this.renderMap();
      this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
    },

    prevDay() {
      if (this.selectedDayIndex > 1) {
        this.selectedDayIndex--;
        this.renderMap();
        this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
      }
    },

    nextDay() {
      const maxDays = (this.selectedMds?.dailySchedule?.length || 25);
      if (this.selectedDayIndex < maxDays) {
        this.selectedDayIndex++;
        this.renderMap();
        this.$nextTick(() => { if (window.lucide) lucide.createIcons(); });
      }
    },

    setDay(dayNum) {
      this.selectedDayIndex = parseInt(dayNum);
      this.renderMap();
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
        markerZoomAnimation: true
      });

      // OpenStreetMap Clean Tiles (100% Free, Zero Watermark, No API Key Required)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(this.map);

      this.mapMarkersLayer = L.layerGroup().addTo(this.map);
      this.mapRoutesLayer = L.layerGroup().addTo(this.map);

      this.renderMap();
    },

    /**
     * Render Map Markers & Route Lines (Distinguishing Local vs Perdin Stores with Spiderfy for Co-located Pins)
     */
    renderMap() {
      if (!this.map || !this.mapMarkersLayer || !this.selectedMds) return;

      this.mapMarkersLayer.clearLayers();
      this.mapRoutesLayer.clearLayers();

      // Ensure map dimensions and viewport coordinates are aligned
      this.map.invalidateSize();

      const mds = this.selectedMds;
      const bounds = [];

      // 1. Plot MDS Home Pin
      const homeIcon = L.divIcon({
        className: 'custom-home-pin',
        html: `
          <div style="background-color: ${mds.color}; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">
            🏠
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const homeMarker = L.marker([mds.lat, mds.lng], { icon: homeIcon })
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
            <b style="font-size: 13px; color: ${mds.color};">🏠 Domisili MDS: ${mds.nama}</b><br>
            <span>Alamat: ${mds.alamat}</span><br>
            <span>Kecamatan: <b>${mds.kecamatan}</b>, ${mds.kota}</span><br>
            <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
            <span>Total Kunjungan: <b>${mds.assignedStores.length} Toko + 4 Hari DC (460 Titik)</b></span><br>
            <span>Rincian: <b>${mds.nonPerdinDays || mds.localDays || 0} Hari Non Perdin</b> • <b>${mds.perdinDays || 0} Hari Perdin</b></span>
          </div>
        `);
      this.mapMarkersLayer.addLayer(homeMarker);

      // 2. Get Stores for Selected Day or All Assigned Stores
      const currentDaySchedule = (mds.dailySchedule || []).find(d => d.dayNumber === this.selectedDayIndex);
      const storesToPlot = currentDaySchedule ? (currentDaySchedule.stores || currentDaySchedule.items || []) : (mds.assignedStores || []);

      // Coordinate clustering & radial spiderfy offset calculation to prevent pins overlapping
      const coordCounts = new Map();
      (storesToPlot || []).forEach(st => {
        const key = `${(st.lat || 0).toFixed(5)}_${(st.lng || 0).toFixed(5)}`;
        coordCounts.set(key, (coordCounts.get(key) || 0) + 1);
      });

      const coordIndices = new Map();
      const isDayPerdin = currentDaySchedule ? currentDaySchedule.isPerdin : false;
      const isDayDc = currentDaySchedule ? currentDaySchedule.type === 'DC' : false;
      const storeRouteCoords = [];
      const storeBounds = [];

      (storesToPlot || []).forEach((st, idx) => {
        const isPerdin = isDayPerdin || st.isPerdin;
        const isThisStoreDc = Boolean(st.isDc || st.type === 'DC' || (st.tipeKunjungan && st.tipeKunjungan.includes('DC')));
        const pinBg = isPerdin ? '#f59e0b' : (isThisStoreDc ? '#059669' : mds.color);
        const pinBorder = isPerdin ? '#b45309' : (isThisStoreDc ? '#047857' : 'white');
        const pinText = isPerdin ? `🏨 ${idx + 1}` : (isThisStoreDc ? `🏭 ${idx + 1}` : `${idx + 1}`);

        // Calculate jitter/radial spiderfy offset if multiple points share identical coordinates
        const key = `${(st.lat || 0).toFixed(5)}_${(st.lng || 0).toFixed(5)}`;
        const totalAtCoord = coordCounts.get(key) || 1;
        let plotLat = st.lat;
        let plotLng = st.lng;

        if (totalAtCoord > 1) {
          const currentIdx = coordIndices.get(key) || 0;
          coordIndices.set(key, currentIdx + 1);
          
          // Radius ~40 meters spread in a neat circle
          const angle = (2 * Math.PI * currentIdx) / totalAtCoord - Math.PI / 2;
          const radius = 0.00038;
          plotLat = st.lat + radius * Math.sin(angle);
          plotLng = st.lng + (radius / Math.cos(((st.lat || -6.2) * Math.PI) / 180)) * Math.cos(angle);
        }

        const storeIcon = L.divIcon({
          className: 'custom-store-pin',
          html: `
            <div style="background-color: ${pinBg}; min-width: 24px; height: 24px; padding: 0 4px; border-radius: 12px; border: 2px solid ${pinBorder}; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: 800;">
              ${pinText}
            </div>
          `,
          iconSize: [28, 24],
          iconAnchor: [14, 12]
        });

        const storeMarker = L.marker([plotLat, plotLng], { icon: storeIcon })
          .bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; line-height: 1.45; min-width: 200px;">
              <div style="display:inline-block; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 10.5px; margin-bottom: 5px; ${isPerdin ? 'background: #fef3c7; color: #b45309; border: 1px solid #fcd34d;' : (isThisStoreDc ? 'background: #d1fae5; color: #047857; border: 1px solid #a7f3d0;' : 'background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe;')}">
                ${isPerdin ? '🏨 TOKO PERJALANAN DINAS (PERDIN)' : (isThisStoreDc ? '🏭 KUNJUNGAN DISTRIBUTION CENTER' : (st.tipeKunjungan === 'TOKO SEKITAR DC' ? '🚗 TOKO SEKITAR DC' : '🚗 TOKO NON PERDIN'))}
              </div><br>
              <b>Stop #${idx + 1}: ${st.storeName || st.name}</b><br>
              <span style="display:inline-block; padding: 2px 6px; border-radius: 4px; background: #e0e7ff; color: #4338ca; font-size: 10px; font-weight: bold;">${st.account || 'DC'}</span>
              ${st.storeCode ? `<span style="font-family: monospace; color: #64748b; font-size: 11px;">[${st.storeCode}]</span>` : ''}<br>
              <hr style="margin: 6px 0; border: none; border-top: 1px solid #e2e8f0;">
              <span>Wilayah/Kabupaten: <b>${st.kabKota || mds.kota}</b></span><br>
              <span>Jarak dari Domisili: <b style="color: ${isPerdin ? '#b45309' : '#4338ca'}; font-size: 12.5px;">${st.distanceFromHomeKm} km</b></span><br>
              <span>Estimasi Waktu Tempuh: <b>~${st.travelTimeMins} Menit</b></span><br>
              ${isPerdin ? `<div style="margin-top: 5px; padding: 4px 6px; background: #fffbeb; border-radius: 4px; border: 1px solid #fde68a; color: #92400e; font-weight: bold; font-size: 10.5px;">💵 Fasilitas Perdin: Rp 400.000 / Hari</div>` : ''}
            </div>
          `);
        this.mapMarkersLayer.addLayer(storeMarker);
        storeBounds.push([plotLat, plotLng]);
        storeRouteCoords.push([plotLat, plotLng]);
      });

      // 4. Draw Polyline Route Sequence (Connecting Stop 1 -> 2 -> ... -> N)
      if (storeRouteCoords.length > 1) {
        const polyline = L.polyline(storeRouteCoords, {
          color: isDayDc ? '#059669' : mds.color,
          weight: 3.5,
          opacity: 0.85,
          dashArray: isDayDc ? '4, 6' : '6, 8'
        });
        this.mapRoutesLayer.addLayer(polyline);
      }

      // Check distance from Home to Stop 1
      let includeHomeInBounds = false;
      if (storeRouteCoords.length > 0) {
        const firstStore = storeRouteCoords[0];
        const distFromHome = Math.hypot(firstStore[0] - mds.lat, (firstStore[1] - mds.lng) * Math.cos((mds.lat * Math.PI) / 180)) * 111;
        if (distFromHome <= 35 && !isDayPerdin) {
          includeHomeInBounds = true;
          // Connect Home -> Stop 1 with a subtle commute line
          const commuteLine = L.polyline([[mds.lat, mds.lng], firstStore], {
            color: mds.color,
            weight: 2,
            opacity: 0.5,
            dashArray: '3, 6'
          });
          this.mapRoutesLayer.addLayer(commuteLine);
        }
      }

      // Fit map to bounds (Prioritize active store cluster so user is focused on the day's stops)
      const finalBounds = includeHomeInBounds ? [...storeBounds, [mds.lat, mds.lng]] : (storeBounds.length > 0 ? storeBounds : [[mds.lat, mds.lng]]);
      if (finalBounds.length > 0) {
        this.map.fitBounds(finalBounds, { padding: [45, 45], maxZoom: 15 });
      }
    },

    /**
     * Export Full Simulation to Multi-Sheet Excel (.xlsx) with Explicit Perdin Columns
     */
    exportSimulationExcel() {
      if (!this.simulationResult) return;

      const wb = XLSX.utils.book_new();

      // --- Sheet 1: Master Summary & Manpower Allocation ---
      const summaryRows = this.simulationResult.assignments.map((m, idx) => ({
        'No': idx + 1,
        'Kode Personil': m.id,
        'Nama MDS': m.nama,
        'Status': m.isVirtual ? 'USULAN REKRUT (VACANT)' : 'AKTIF (EXISTING)',
        'Domisili': m.alamat,
        'Kecamatan': m.kecamatan,
        'Kota/Kabupaten': m.kota,
        'Region': m.region,
        'Total Toko Dialokasikan': m.assignedStores.length,
        'Hari Toko Non Perdin': m.nonPerdinDays || m.localDays || 0,
        'Hari Toko Perdin': m.perdinDays || 0,
        'Hari Kunjungan DC': m.dcDays || 4,
        'Total Beban Kunjungan/Bulan': (m.assignedStores?.length || 0) + (m.assignedDc?.length || 40),
        'Estimasi Anggaran Perdin/Bulan (Rp)': (m.estPerdinBudget || 0),
        'Rata-rata Jarak dari Rumah (KM)': m.avgDistanceKm,
        'Jarak Terjauh (KM)': m.maxDistanceKm,
        'Estimasi Rata-rata Tempuh (Menit)': m.avgTravelMins
      }));
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan_Alokasi_MDS');

      // --- Sheet 2: Matriks Jadwal 25 Hari Kerja (Detail Per Stop & Status Perdin) ---
      const scheduleRows = [];
      this.simulationResult.assignments.forEach(m => {
        (m.dailySchedule || []).forEach(day => {
          (day.stores || []).forEach((st, sIdx) => {
            const isPerdin = Boolean(st.isPerdin);
            const isDcStop = Boolean(st.isDc || st.type === 'DC' || st.tipeKunjungan === 'KUNJUNGAN DC');
            scheduleRows.push({
              'Kode MDS': m.id,
              'Nama MDS': m.nama,
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
              'Jarak dari Rumah (KM)': st.distanceFromHomeKm,
              'Estimasi Tempuh (Menit)': st.travelTimeMins,
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
      const scopeSlug = this.selectedScope === 'JAWA' ? 'Pulau_Jawa_Tanpa_Rekrutmen' : (this.selectedScope === 'LUAR_PULAU' ? 'Luar_Pulau' : 'Nasional');
      const filename = `Cimory_Simulasi_Rute_MDS_${scopeSlug}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
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
  
  <!-- KML Styles -->
  <Style id="homePin">
    <IconStyle>
      <color>ff0000ff</color>
      <scale>1.2</scale>
      <Icon><href>http://maps.google.com/mapfiles/kml/shapes/homegardenbusiness.png</href></Icon>
    </IconStyle>
  </Style>
  <Style id="storePin">
    <IconStyle>
      <color>ffffaa00</color>
      <scale>0.7</scale>
      <Icon><href>http://maps.google.com/mapfiles/kml/shapes/shopping.png</href></Icon>
    </IconStyle>
    <!-- Hide label text on 3D view to avoid clutter (Click pin to see popup) -->
    <LabelStyle>
      <scale>0</scale>
    </LabelStyle>
  </Style>
  <Style id="routeLine">
    <LineStyle>
      <color>7f00ffff</color>
      <width>3</width>
    </LineStyle>
  </Style>
`;

      targetList.forEach(m => {
        const isVacant = m.isVirtual;
        const mdsFolderTitle = escXml(`${isVacant ? '⚠️ ' : '👤 '}${m.nama} (${m.kota})`);
        const basePinTitle = escXml(`🏠 Base: ${m.nama}`);

        kml += `
  <Folder>
    <name>${mdsFolderTitle}</name>
    <visibility>0</visibility>
    <description><![CDATA[
      <b>Status:</b> ${isVacant ? 'USULAN REKRUT (VACANT)' : 'MDS AKTIF'}<br>
      <b>Alamat Rumah:</b> ${m.alamat}<br>
      <b>Kecamatan/Kota:</b> ${m.kecamatan}, ${m.kota} (${m.region})<br>
      <b>Total Beban Toko:</b> ${m.assignedStores.length} Toko + ${m.assignedDc.length} DC<br>
      <b>Rata-rata Jarak:</b> ${m.avgDistanceKm} km (${m.avgTravelMins} menit)
    ]]></description>

    <!-- 1. Home Base Placemark -->
    <Placemark>
      <name>${basePinTitle}</name>
      <styleUrl>#homePin</styleUrl>
      <description><![CDATA[
        <b>Domisili MDS:</b> ${m.nama}<br>
        <b>Alamat:</b> ${m.alamat}<br>
        <b>Kecamatan:</b> ${m.kecamatan}<br>
        <b>Kota:</b> ${m.kota}
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
            const storeTitle = escXml(`#${sIdx + 1}: ${st.storeName}`);
            kml += `
      <Placemark>
        <name>${storeTitle}</name>
        <styleUrl>#storePin</styleUrl>
        <description><![CDATA[
          <b>Stop #${sIdx + 1} (${day.title})</b><br>
          <b>Nama Toko:</b> ${st.storeName}<br>
          <b>Kode Toko:</b> ${st.storeCode || '-'}<br>
          <b>Account:</b> ${st.account}<br>
          <b>Cabang:</b> ${st.branchName || '-'}<br>
          <b>Jarak dari Rumah:</b> ${st.distanceFromHomeKm} km<br>
          <b>Estimasi Tempuh:</b> ~${st.travelTimeMins} menit
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
    }
  }));
});
