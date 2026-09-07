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
    if (acc.includes('DC') || acc.includes('GUDANG')) return '#8b5cf6'; // Purple

    if (prefix === 'LP') return '#10b981'; // Emerald
    if (prefix === 'LK') return '#0ea5e9'; // Sky
    return '#6366f1'; // Indigo default
  },

  /**
   * Helper: Parse koordinat "lat, lng"
   */
  parseCoordinates(coordStr) {
    if (!coordStr || !coordStr.includes(',')) return null;
    const parts = coordStr.split(',');
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null;
    return [lat, lng];
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

    // Filter data yang memiliki koordinat valid
    const validVisits = visits.map(v => {
      const coords = this.parseCoordinates(v.koordinat);
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
            <div class="numbered-route-pin" style="background-color: ${brandColor}; width: 24px; height: 24px; border-radius: 50% !important; display: flex !important; align-items: center !important; justify-content: center !important; color: #ffffff !important; font-weight: 800 !important; font-size: 11px !important; border: 2px solid #ffffff !important; box-shadow: 0 2px 8px rgba(0,0,0,0.45) !important; line-height: 1 !important;">
              ${visitIndex}
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
      } else if (isSearchActive) {
        // Mode 2: Toko / MDS yang dicari - Highlight Pulse Pin
        markerIcon = L.divIcon({
          className: 'numbered-pin-wrapper',
          html: `
            <div class="pulse-target-pin" style="background-color: ${brandColor}; width: 18px; height: 18px; border-radius: 50% !important; border: 3px solid #ffffff !important; box-shadow: 0 0 10px rgba(99, 102, 241, 0.7) !important;"></div>
          `,
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });
      } else {
        // Mode 3: Default Mode (Pencarian kosong) - Clean Normal Dot Pin
        markerIcon = L.divIcon({
          className: 'numbered-pin-wrapper',
          html: `<div class="custom-map-pin" style="background-color: ${brandColor}; width: 12px; height: 12px; border-radius: 50% !important; border: 2px solid white !important; box-shadow: 0 0 8px rgba(0,0,0,0.35) !important;"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
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
  }
};
