/**
 * ==============================================================================
 * CIMORY MDS DASHBOARD - MAP SERVICE (LEAFLET.JS GPS TRACKER)
 * ==============================================================================
 */

const MapService = {
  mapInstance: null,
  markerLayerGroup: null,

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
    this.markerLayerGroup = L.layerGroup().addTo(this.mapInstance);

    // Invalidate size after layout render
    setTimeout(() => {
      if (this.mapInstance) this.mapInstance.invalidateSize();
    }, 300);
  },

  /**
   * Update Store Markers on Map from Visits Data
   */
  renderVisitsOnMap(visits = []) {
    if (!this.mapInstance || !this.markerLayerGroup) return;
    this.markerLayerGroup.clearLayers();

    const bounds = [];
    let validCoordsCount = 0;

    visits.forEach(v => {
      const coordStr = v.koordinat || '';
      if (!coordStr || !coordStr.includes(',')) return;

      const parts = coordStr.split(',');
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());

      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

      bounds.push([lat, lng]);
      validCoordsCount++;

      const pColor = (v.prefix === 'LP') ? '#10b981' : ((v.prefix === 'LK') ? '#0ea5e9' : '#6366f1');

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background-color: ${pColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.4);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });
      const popupHtml = `
        <div class="text-xs p-1">
          <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white mb-1" style="background:${pColor};">${v.modul || v.prefix}</span>
          <p class="font-bold text-slate-900 dark:text-slate-100">${v.namaToko || 'Toko'}</p>
          <p class="text-slate-500 text-[11px]">${v.account || ''} &bull; Kode: ${v.kodeToko || '-'}</p>
          <div class="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-700 text-[11px]">
            <span class="text-slate-600 dark:text-slate-300 font-medium">${v.namaCrew || 'MDS'}</span>
            <span class="text-slate-400 block">${v.date || ''} ${v.time || ''}</span>
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
      this.markerLayerGroup.addLayer(marker);
    });

    if (bounds.length > 0) {
      try {
        this.mapInstance.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
      } catch (e) {}
    }
  }
};
