/**
 * ==============================================================================
 * CIMORY MDS DASHBOARD - MAP SERVICE (LEAFLET.JS GPS TRACKER)
 * Smart Routing, Chronological Polyline & Focus Logic
 * ==============================================================================
 */

const MapService = {
  mapInstance: null,
  markerLayerGroup: null,
  polylineLayerGroup: null,
  activeMarkersMap: new Map(),

  /**
   * Initialize Leaflet Map
   */
  initMap(elementId = 'visits-map', isDark = false) {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }

    this.activeMarkersMap.clear();

    // Default center Indonesia (-2.5, 118.0, zoom 5)
    this.mapInstance = L.map(elementId, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([-2.5489, 118.0149], 5);

    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution = isDark
      ? '&copy; <a href="https://carto.com/">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

    L.tileLayer(tileUrl, { attribution, maxZoom: 18 }).addTo(this.mapInstance);
    
    // Polyline layer di bawah marker layer
    this.polylineLayerGroup = L.layerGroup().addTo(this.mapInstance);
    this.markerLayerGroup = L.layerGroup().addTo(this.mapInstance);

    // Invalidate size after layout render
    setTimeout(() => {
      if (this.mapInstance) this.mapInstance.invalidateSize();
    }, 300);
  },

  /**
   * Helper: Dapatkan warna berdasarkan Akun / Brand
   */
  getBrandColor(account = '', prefix = '') {
    const acc = (account || '').toUpperCase().trim();
    if (acc.includes('INDOMARET')) return '#0284c7'; // Sky Blue
    if (acc.includes('ALFAMIDI')) return '#f59e0b'; // Amber
    if (acc.includes('ALFAMART')) return '#ef4444'; // Red
    if (acc.includes('LAWSON')) return '#6366f1'; // Indigo
    if (acc.includes('SUPERINDO') || acc.includes('LION')) return '#10b981'; // Emerald
    if (acc.includes('DC') || acc.includes('GUDANG')) return '#8b5cf6'; // Purple

    if (prefix === 'LP') return '#10b981'; // Emerald
    if (prefix === 'LK') return '#0ea5e9'; // Sky
    return '#dc2626'; // Vivid Red default (kontras tinggi, bukan putih)
  },

  /**
   * Helper: Parse koordinat "lat, lng" (Mendukung link Google Maps, tanda petik, spasi, dsb)
   */
  parseCoordinates(coordStr) {
    if (!coordStr) return null;
    const str = String(coordStr).trim();
    // 1. Ekstrak pola desimal numerik lat, lng
    const match = str.match(/([-+]?\d{1,3}\.\d+)\s*,\s*([-+]?\d{1,3}\.\d+)/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        return [lat, lng];
      }
    }
    // 2. Fallback split koma sederhana
    if (str.includes(',')) {
      const parts = str.replace(/['"\s]/g, '').split(',');
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
          return [lat, lng];
        }
      }
    }
    return null;
  },

  /**
   * Update Store Markers on Map from Visits Data
   * @param {Array} visits - Daftar data kunjungan
   * @param {string} searchQuery - Kata kunci pencarian aktif
   */
  renderVisitsOnMap(visits = [], searchQuery = '') {
    if (!this.mapInstance || !this.markerLayerGroup || !this.polylineLayerGroup) return;

    this.markerLayerGroup.clearLayers();
    this.polylineLayerGroup.clearLayers();
    this.activeMarkersMap.clear();

    const cleanQ = (searchQuery || '').trim().toUpperCase();
    const isSearchActive = cleanQ.length > 0;

    // Filter data yang memiliki koordinat valid (dengan fallback ke master toko jika koordinat visit kosong)
    const validVisits = visits.map(v => {
      let rawCoord = v.koordinat || v.coords || v.latLng;
      if (!rawCoord && v.kodeToko && window.app && Array.isArray(window.app.masterToko)) {
        const st = window.app.masterToko.find(t => t && t.kodeToko === v.kodeToko && t.koordinat);
        if (st) rawCoord = st.koordinat;
      }
      const coords = this.parseCoordinates(rawCoord);
      return coords ? { ...v, _latLng: coords } : null;
    }).filter(Boolean);

    if (validVisits.length === 0) return;

    // Deteksi apakah hasil pencarian mengerucut ke 1 orang MDS tertentu
    const uniqueCrews = new Set(validVisits.map(v => (v.namaCrew || v.kodeCrew || '').trim().toUpperCase()).filter(Boolean));
    const isSingleMdsRoute = isSearchActive && uniqueCrews.size === 1;

    let routeVisits = [...validVisits];

    // Jika sedang fokus ke 1 orang MDS, urutkan kronologis dari waktu paling pagi ke sore
    if (isSingleMdsRoute) {
      routeVisits.sort((a, b) => {
        const timeA = (a.time || a.waktu || '00:00').toString();
        const timeB = (b.time || b.waktu || '00:00').toString();
        return timeA.localeCompare(timeB);
      });
    }

    const bounds = [];
    const polylineCoords = [];
    let firstMarker = null;

    routeVisits.forEach((v, index) => {
      const [lat, lng] = v._latLng;
      bounds.push([lat, lng]);

      const brandColor = this.getBrandColor(v.account, v.prefix);
      const visitIndex = index + 1;

      let markerIcon;

      if (isSingleMdsRoute) {
        // Mode 1: Track Rute MDS - Numbered Pin Badge (#1, #2, #3...)
        polylineCoords.push([lat, lng]);

        markerIcon = L.divIcon({
          className: 'numbered-pin-wrapper',
          html: `
            <div class="numbered-route-pin" style="background-color: ${brandColor}; width: 26px; height: 26px; border-radius: 50% !important; display: flex !important; align-items: center !important; justify-content: center !important; color: #ffffff !important; font-weight: 800 !important; font-size: 11px !important; border: 2.5px solid #ffffff !important; box-shadow: 0 3px 10px rgba(0,0,0,0.55) !important; line-height: 1 !important;">
              ${visitIndex}
            </div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });
      } else if (isSearchActive) {
        // Mode 2: Toko / MDS yang dicari - Highlight Pulse Pin
        markerIcon = L.divIcon({
          className: 'numbered-pin-wrapper',
          html: `
            <div class="pulse-target-pin" style="background-color: ${brandColor}; width: 20px; height: 20px; border-radius: 50% !important; border: 3px solid #ffffff !important; box-shadow: 0 0 12px ${brandColor} !important;"></div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
      } else {
        // Mode 3: Default Mode (Pencarian kosong) - Clean Normal Dot Pin Berwarna Terang
        markerIcon = L.divIcon({
          className: 'numbered-pin-wrapper',
          html: `<div class="custom-map-pin" style="background-color: ${brandColor}; width: 16px; height: 16px; border-radius: 50% !important; border: 2.5px solid #ffffff !important; box-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
      }

      const marker = L.marker([lat, lng], { icon: markerIcon });

      // Build Rich Interactive Popup
      const orderBadge = isSingleMdsRoute ? `<span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-black text-white mr-1" style="background:#4f46e5;">#${visitIndex}</span>` : '';
      const brandBadge = `<span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white mb-1" style="background:${brandColor};">${v.account || v.modul || v.prefix}</span>`;
      
      const popupHtml = `
        <div class="text-xs p-1" style="min-width: 170px;">
          <div class="flex items-center gap-1 mb-1">
            ${orderBadge}
            ${brandBadge}
            <span class="text-[10px] font-semibold text-slate-400 dark:text-slate-400">Rute ${v.rute || '-'}</span>
          </div>
          <p class="font-bold text-slate-900 dark:text-slate-100 leading-snug">${v.namaToko || 'Toko'}</p>
          <p class="text-slate-500 text-[11px] mt-0.5">${v.kodeToko ? `Kode: ${v.kodeToko}` : ''}</p>
          
          <div class="mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-700 text-[11px] space-y-0.5">
            <div class="text-slate-700 dark:text-slate-300 font-semibold flex items-center justify-between">
              <span>👤 ${v.namaCrew || 'MDS'}</span>
              <span class="text-slate-500 text-[10px]">${v.modul || ''}</span>
            </div>
            <div class="text-slate-400 flex items-center justify-between">
              <span>⏰ ${v.time || v.waktu || '-'}</span>
              <span>📅 ${v.date || ''}</span>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      this.markerLayerGroup.addLayer(marker);

      // Simpan reference untuk fitur flyToVisit
      const visitKey = `${v.kodeToko}_${v.time}_${v.namaCrew}`;
      this.activeMarkersMap.set(visitKey, marker);

      if (!firstMarker) firstMarker = marker;
    });

    // Jika mode 1 orang MDS: Gambar garis rute polyline
    if (isSingleMdsRoute && polylineCoords.length > 1) {
      const polyline = L.polyline(polylineCoords, {
        color: '#6366f1',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '6, 8',
        lineCap: 'round',
        lineJoin: 'round'
      });
      this.polylineLayerGroup.addLayer(polyline);
    }

    // Zoom & Pan to fit bounds
    if (bounds.length > 0) {
      try {
        const padding = isSingleMdsRoute ? [45, 45] : [30, 30];
        const maxZoom = (bounds.length === 1 || isSingleMdsRoute) ? 15 : 14;
        this.mapInstance.fitBounds(bounds, { padding, maxZoom, animate: true, duration: 0.8 });

        // Jika hanya mencari 1 toko atau hasil sangat spesifik, buka popup pertama secara otomatis
        if (isSearchActive && bounds.length <= 3 && firstMarker) {
          setTimeout(() => {
            if (firstMarker) firstMarker.openPopup();
          }, 400);
        }
      } catch (e) {
        console.warn('Map fitBounds error:', e);
      }
    }
  },

  /**
   * Fly To Specific Visit and Open Popup
   */
  flyToVisit(visit) {
    if (!this.mapInstance || !visit) return;
    const coords = this.parseCoordinates(visit.koordinat);
    if (!coords) return;

    const [lat, lng] = coords;
    this.mapInstance.flyTo([lat, lng], 16, { animate: true, duration: 1.0 });

    const visitKey = `${visit.kodeToko}_${visit.time}_${visit.namaCrew}`;
    const marker = this.activeMarkersMap.get(visitKey);
    if (marker) {
      setTimeout(() => {
        marker.openPopup();
      }, 700);
    }
  },

  // ==============================================================================
  // 2. TAB 3: TARGET JADWAL RUTE MAP SERVICE (SPECIFIC MDS & ROUTE ON-DEMAND)
  // ==============================================================================
  jadwalMapInstance: null,
  jadwalMarkerGroup: null,
  jadwalPolylineGroup: null,

  initJadwalMap(elementId = 'jadwal-map', isDark = false) {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (this.jadwalMapInstance) {
      this.jadwalMapInstance.remove();
      this.jadwalMapInstance = null;
    }

    this.jadwalMapInstance = L.map(elementId, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([-6.2088, 106.8456], 11);

    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution = isDark
      ? '&copy; <a href="https://carto.com/">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

    L.tileLayer(tileUrl, { attribution, maxZoom: 18 }).addTo(this.jadwalMapInstance);

    this.jadwalPolylineGroup = L.layerGroup().addTo(this.jadwalMapInstance);
    this.jadwalMarkerGroup = L.layerGroup().addTo(this.jadwalMapInstance);

    setTimeout(() => {
      if (this.jadwalMapInstance) this.jadwalMapInstance.invalidateSize();
    }, 300);
  },

  /**
   * Render Route sequence & connecting polyline for a single MDS + Route
   */
  renderJadwalRouteOnMap(stores = [], crewName = '', rute = '') {
    if (!this.jadwalMapInstance || !this.jadwalMarkerGroup || !this.jadwalPolylineGroup) return;

    this.jadwalMarkerGroup.clearLayers();
    this.jadwalPolylineGroup.clearLayers();

    const validStores = stores.map((s, idx) => {
      const lat = parseFloat(s.lat || s.latitude);
      const lng = parseFloat(s.lon || s.lng || s.longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        return { ...s, _lat: lat, _lng: lng, _seq: idx + 1 };
      }
      return null;
    }).filter(Boolean);

    if (validStores.length === 0) return { totalStores: stores.length, validCount: 0, totalDistKm: 0 };

    const bounds = [];
    const polylineCoords = [];
    let totalDistMeters = 0;

    validStores.forEach((st, idx) => {
      const lat = st._lat;
      const lng = st._lng;
      bounds.push([lat, lng]);
      polylineCoords.push([lat, lng]);

      if (idx > 0) {
        const prev = validStores[idx - 1];
        totalDistMeters += this.calculateDistance(prev._lat, prev._lng, lat, lng);
      }

      const brandColor = this.getBrandColor(st.account);
      const markerIcon = L.divIcon({
        className: 'numbered-pin-wrapper',
        html: `
          <div style="background-color: ${brandColor}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 900; font-size: 12px; border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.5); font-family: monospace;">
            ${st._seq}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([lat, lng], { icon: markerIcon });
      const popupHtml = `
        <div class="text-xs p-1" style="min-width: 180px;">
          <div class="flex items-center gap-1 mb-1">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-black text-white" style="background:#4f46e5;">Urutan #${st._seq}</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style="background:${brandColor};">${st.account || 'TOKO'}</span>
          </div>
          <p class="font-bold text-slate-900 leading-snug">${st.namaToko || 'Toko'}</p>
          <p class="text-slate-500 text-[11px] mt-0.5 font-mono">${st.kodeToko ? `Kode: ${st.kodeToko}` : ''}</p>
          <div class="mt-2 pt-1.5 border-t border-slate-200 text-[11px] space-y-0.5">
            <div class="text-slate-700 font-semibold flex items-center justify-between">
              <span>👤 ${crewName || st.namaCrew || 'MDS'}</span>
              <span class="font-bold text-indigo-600">Rute ${rute || st.rute || '1'}</span>
            </div>
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
      this.jadwalMarkerGroup.addLayer(marker);
    });

    if (polylineCoords.length > 1) {
      const polyline = L.polyline(polylineCoords, {
        color: '#6366f1',
        weight: 4,
        opacity: 0.9,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round'
      });
      this.jadwalPolylineGroup.addLayer(polyline);
    }

    if (bounds.length > 0) {
      try {
        this.jadwalMapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true, duration: 0.8 });
      } catch (e) {}
    }

    return {
      totalStores: stores.length,
      validCount: validStores.length,
      totalDistKm: (totalDistMeters / 1000).toFixed(1)
    };
  },

  // ==============================================================================
  // 3. TAB 4: DATABASE TOKO MAP SERVICE (FOCUSED STORE & 10 NEAREST STORES)
  // ==============================================================================
  tokoMapInstance: null,
  tokoMarkerGroup: null,
  tokoPolylineGroup: null,

  initTokoMap(elementId = 'tokonasional-map', isDark = false) {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (this.tokoMapInstance) {
      this.tokoMapInstance.remove();
      this.tokoMapInstance = null;
    }

    this.tokoMapInstance = L.map(elementId, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([-6.2088, 106.8456], 12);

    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution = isDark
      ? '&copy; <a href="https://carto.com/">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

    L.tileLayer(tileUrl, { attribution, maxZoom: 18 }).addTo(this.tokoMapInstance);

    this.tokoPolylineGroup = L.layerGroup().addTo(this.tokoMapInstance);
    this.tokoMarkerGroup = L.layerGroup().addTo(this.tokoMapInstance);

    setTimeout(() => {
      if (this.tokoMapInstance) this.tokoMapInstance.invalidateSize();
    }, 300);
  },

  /**
   * Render Selected Target Store (Center Marker) and its 10 Nearest Stores
   */
  renderTokoWithNearestOnMap(centerStore, nearestStores = [], onScheduleClick = null) {
    if (!this.tokoMapInstance || !this.tokoMarkerGroup || !this.tokoPolylineGroup || !centerStore) return;

    this.tokoMarkerGroup.clearLayers();
    this.tokoPolylineGroup.clearLayers();

    const cLat = parseFloat(centerStore.lat || centerStore.latitude);
    const cLng = parseFloat(centerStore.lon || centerStore.lng || centerStore.longitude);
    if (isNaN(cLat) || isNaN(cLng) || (cLat === 0 && cLng === 0)) return;

    const bounds = [[cLat, cLng]];

    // 1. Center Store Marker (Special Crown / Glow Gold Pin)
    const centerIcon = L.divIcon({
      className: 'numbered-pin-wrapper',
      html: `
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 900; font-size: 16px; border: 3px solid #ffffff; box-shadow: 0 0 16px rgba(245, 158, 11, 0.8), 0 4px 10px rgba(0,0,0,0.5); transform: scale(1.1);">
          ⭐
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const centerMarker = L.marker([cLat, cLng], { icon: centerIcon, zIndexOffset: 1000 });
    const cBrandColor = this.getBrandColor(centerStore.account);
    const centerPopup = `
      <div class="text-xs p-1" style="min-width: 190px;">
        <div class="flex items-center gap-1 mb-1">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500 text-white">TOKO UTAMA</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style="background:${cBrandColor};">${centerStore.account || 'TOKO'}</span>
        </div>
        <p class="font-bold text-slate-900 leading-snug">${centerStore.namaToko}</p>
        <p class="text-slate-500 text-[11px] font-mono mt-0.5">Kode: ${centerStore.kodeToko || '-'}</p>
        <div class="mt-2 pt-1.5 border-t border-slate-200 text-[11px] space-y-1">
          <div class="text-slate-600">${[centerStore.branchName, centerStore.kecamatan, centerStore.kabKota].filter(Boolean).join(' • ')}</div>
          <button id="btn-assign-center-store" class="w-full mt-1.5 py-1.5 px-2.5 rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-sm hover:bg-emerald-500 transition-all cursor-pointer text-center">
            🎯 Jadwalkan Toko Ini ke MDS
          </button>
        </div>
      </div>
    `;

    centerMarker.bindPopup(centerPopup);
    this.tokoMarkerGroup.addLayer(centerMarker);

    // 2. Render 10 Nearest Stores
    nearestStores.forEach((nst, idx) => {
      const lat = parseFloat(nst.lat || nst.latitude);
      const lng = parseFloat(nst.lon || nst.lng || nst.longitude);
      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

      bounds.push([lat, lng]);

      // Dashed connection line from Center to Nearest Store
      const connLine = L.polyline([[cLat, cLng], [lat, lng]], {
        color: '#f59e0b',
        weight: 2,
        opacity: 0.6,
        dashArray: '4, 6'
      });
      this.tokoPolylineGroup.addLayer(connLine);

      const nBrandColor = this.getBrandColor(nst.account);
      const distText = nst.distanceText || `${Math.round(nst.distanceMeters || 0)} m`;

      const nearIcon = L.divIcon({
        className: 'numbered-pin-wrapper',
        html: `
          <div style="background-color: ${nBrandColor}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 2px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
            #${idx + 1}
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const nearMarker = L.marker([lat, lng], { icon: nearIcon });
      const nPopupHtml = `
        <div class="text-xs p-1" style="min-width: 180px;">
          <div class="flex items-center gap-1 mb-1">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-600 text-white">Terdekat #${idx + 1}</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style="background:${nBrandColor};">${nst.account || 'TOKO'}</span>
          </div>
          <p class="font-bold text-slate-900 leading-snug">${nst.namaToko}</p>
          <p class="text-slate-500 text-[11px] font-mono">Kode: ${nst.kodeToko || '-'}</p>
          <div class="mt-2 pt-1 border-t border-slate-200 text-[11px] space-y-1">
            <div class="font-bold text-amber-600 flex items-center justify-between">
              <span>Jarak Radius:</span>
              <span>📍 ${distText}</span>
            </div>
            <div class="text-slate-500">${[nst.branchName, nst.kecamatan].filter(Boolean).join(' • ')}</div>
            <button class="btn-assign-nearest-store w-full mt-1.5 py-1 px-2 rounded-lg bg-slate-900 text-white font-bold text-[11px] hover:bg-slate-800 transition-all cursor-pointer text-center" data-store-code="${nst.kodeToko}">
              🎯 Jadwalkan #${idx + 1} ke MDS
            </button>
          </div>
        </div>
      `;

      nearMarker.bindPopup(nPopupHtml);
      this.tokoMarkerGroup.addLayer(nearMarker);
    });

    // Auto-fit Bounds & Open Center Popup
    if (bounds.length > 0) {
      try {
        this.tokoMapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: true, duration: 0.8 });
        setTimeout(() => {
          centerMarker.openPopup();
        }, 500);
      } catch (e) {}
    }
  },

  /**
   * Fast Haversine Distance Formula in Meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radius bumi dalam meter
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * Find Top 10 Nearest Stores from 49k Master Dataset (< 10ms execution)
   */
  findNearest10Stores(centerStore, catalog = [], limit = 10) {
    if (!centerStore || !catalog || catalog.length === 0) return [];
    const cLat = parseFloat(centerStore.lat || centerStore.latitude);
    const cLng = parseFloat(centerStore.lon || centerStore.lng || centerStore.longitude);
    if (isNaN(cLat) || isNaN(cLng) || (cLat === 0 && cLng === 0)) return [];

    const cCode = String(centerStore.kodeToko || '').trim().toUpperCase();
    const scored = [];

    for (let i = 0; i < catalog.length; i++) {
      const s = catalog[i];
      const sCode = String(s.kodeToko || '').trim().toUpperCase();
      if (sCode && sCode === cCode) continue;

      const sLat = parseFloat(s.lat || s.latitude);
      const sLng = parseFloat(s.lon || s.lng || s.longitude);
      if (isNaN(sLat) || isNaN(sLng) || (sLat === 0 && sLng === 0)) continue;

      const distMeters = this.calculateDistance(cLat, cLng, sLat, sLng);
      scored.push({
        ...s,
        distanceMeters: distMeters,
        distanceText: distMeters < 1000 ? `${Math.round(distMeters)} m` : `${(distMeters / 1000).toFixed(1)} km`
      });
    }

    // Sort ascending by distance and take top N
    scored.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return scored.slice(0, limit);
  }
};

