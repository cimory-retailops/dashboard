/**
 * ==============================================================================
 * CIMORY RETAIL OPS - ROUTE OPTIMIZATION & SPATIAL CLUSTERING ENGINE
 * High-Precision Geo-Spatial Clustering (Zero Cross-Island Routing)
 * ==============================================================================
 */

const RouteEngine = {
  
  /**
   * Calculate Geodesic Haversine Distance in Kilometers
   */
  getDistanceKm(lat1, lon1, lat2, lon2) {
    if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 99999;
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  },

  /**
   * Estimate Travel Time in Minutes based on speed & urban traffic penalty
   */
  getEstimatedTravelTimeMins(distanceKm, speedKmh = 25) {
    if (distanceKm === 0) return 0;
    const timeHours = (distanceKm / speedKmh) * 1.15;
    return Math.round(timeHours * 60);
  },

  /**
   * Curated Color Palette for MDS Markers
   */
  getMdsColor(idx) {
    const colors = [
      '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
      '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4',
      '#84cc16', '#a855f7', '#6366f1', '#3b82f6', '#22c55e'
    ];
    return colors[idx % colors.length];
  },

  /**
   * Run Master Simulation & Allocation
   */
  /**
   * Determine Island Group / Landmass Geofence for Zero Cross-Island Assignment
   */
  getIslandGroup(lat, lng, kabKota = '', prov = '') {
    const text = (String(kabKota || '') + ' ' + String(prov || '')).toUpperCase();

    // 1. Text-based Categorization with Strict Word Boundaries
    if (/\b(BALI|DENPASAR|BADUNG|GIANYAR|TABANAN|BULELENG|KLUNGKUNG|BANGLI|KARANGASEM|JEMBRANA)\b/.test(text)) return 'BALI';
    if (/\b(BATAM|BINTAN|TANJUNG PINANG|KARIMUN|NATUNA|ANAMBAS)\b/.test(text) || text.includes('KEPULAUAN RIAU') || text.includes('KEPRI')) return 'KEPRI';
    if (/\b(BANGKA|BELITUNG|PANGKAL PINANG)\b/.test(text)) return 'BANGKA_BELITUNG';
    if (/\b(TERNATE|TIDORE|HALMAHERA|MOROTAI|SULA)\b/.test(text) || text.includes('MALUKU UTARA')) return 'MALUKU_UTARA';
    if (/\b(AMBON|SERAM|BURU|TUAL|ARU)\b/.test(text) || text.includes('MALUKU')) return 'MALUKU';
    if (/\b(PAPUA|JAYAPURA|MERAUKE|TIMIKA|MIMIKA|NABIRE|BIAK|SORONG|MANOKWARI|FAKFAK|JAYAWIJAYA)\b/.test(text)) return 'PAPUA';
    if (/\b(LOMBOK|MATARAM|SUMBAWA|BIMA|DOMPU|NTB)\b/.test(text) || text.includes('NUSA TENGGARA BARAT')) return 'NTB';
    if (/\b(KUPANG|FLORES|TIMOR|ENDE|SIKKA|MANGGARAI|SUMBA|ALOR|ROTE|NTT)\b/.test(text) || text.includes('NUSA TENGGARA TIMUR')) return 'NTT';
    if (/\b(SULAWESI|MAKASSAR|MANADO|BITUNG|TOMOHON|MINAHASA|KOTAMOBAGU|GORONTALO|PALU|KENDARI|PALOPO|PAREPARE|MAROS|GOWA|BONE|MAMUJU|LUWU|TORAJA|KOLAKA|BAUBAU)\b/.test(text)) return 'SULAWESI';
    if (/\b(KALIMANTAN|PONTIANAK|BANJARMASIN|BALIKPAPAN|SAMARINDA|TARAKAN|PALANGKARAYA|BANJARBARU|SINGKAWANG|KUTAI|BERAU|BONTANG|KAPUAS|KETAPANG)\b/.test(text)) return 'KALIMANTAN';
    if (/\b(SUMATERA|MEDAN|PALEMBANG|LAMPUNG|PEKANBARU|PADANG|JAMBI|BENGKULU|ACEH|BANDAR LAMPUNG|DELI SERDANG|SIMALUNGUN|ASAHAN|BINJAI|DUMAI|BUKITTINGGI|PRABUMULIH|LUBUKLINGGAU|RIAU)\b/.test(text)) return 'SUMATERA';
    if (/\b(JAWA|JAKARTA|BOGOR|DEPOK|TANGERANG|BEKASI|BANDUNG|SEMARANG|SURABAYA|YOGYAKARTA|SOLO|SURAKARTA|MALANG|SERANG|CILEGON|CIREBON|TEGAL|PEKALONGAN|KEDIRI|JEMBER|BANYUWANGI|MADIUN|PURWOKERTO|SUKABUMI|TASIKMALAYA|KARAWANG|PURWAKARTA|SUBANG|INDRAMAYU|MAJALENGKA|KUNINGAN|CIAMIS|BANJAR|PANGANDARAN|GARUT|SUMEDANG|CIMAHI|BATU|PROBOLINGGO|PASURUAN|MOJOKERTO|BLITAR|MAGELANG|SALATIGA|KLATEN|BOYOLALI|SRAGEN|KARANGANYAR|SUKOHARJO|WONOGIRI|KUDUS|PATI|JEPARA|REMBANG|BLORA|GROBOGAN|TEMANGGUNG|WONOSOBO|PURWOREJO|KEBUMEN|CILACAP|BANYUMAS|PURBALINGGA|BANJARNEGARA|BREBES|PEMALANG|BATANG|KENDAL|DEMAK|SIDOARJO|GRESIK|LAMONGAN|TUBAN|BOJONEGORO|NGAWI|MAGETAN|PONOROGO|PACITAN|TRENGGALEK|TULUNGAGUNG|LUMAJANG|BONDOWOSO|SITUBONDO|JOMBANG|NGANJUK|MADURA|BANGKALAN|SAMPANG|PAMEKASAN|SUMENEP)\b/.test(text)) return 'JAWA';

    // 2. Spatial Bounding Box Fallback (Coordinate slices)
    if (lat >= -1.0 && lat <= 3.0 && lng >= 126.8 && lng <= 129.5) return 'MALUKU_UTARA';
    if (lat >= -7.0 && lat < -1.0 && lng >= 125.5 && lng <= 132.5) return 'MALUKU';
    if (lng > 130.0) return 'PAPUA';
    if (lat >= -6.0 && lat <= 2.5 && lng >= 118.5 && lng <= 126.0) return 'SULAWESI';
    if (lat >= -9.0 && lat <= -8.0 && lng >= 114.4 && lng <= 115.8) return 'BALI';
    if (lat >= -9.2 && lat <= -8.0 && lng > 115.8 && lng <= 119.5) return 'NTB';
    if (lat >= -11.5 && lat <= -8.0 && lng > 119.5 && lng <= 126.0) return 'NTT';
    if (lat >= -5.0 && lat <= 4.5 && lng >= 108.5 && lng <= 118.5) return 'KALIMANTAN';
    if (lat >= 0.5 && lat <= 2.0 && lng >= 103.5 && lng <= 105.0) return 'KEPRI';
    if (lat >= -3.5 && lat <= -1.2 && lng >= 105.0 && lng <= 109.0) return 'BANGKA_BELITUNG';
    if (lat >= -6.0 && lat <= 6.0 && lng >= 95.0 && lng <= 106.0) return 'SUMATERA';
    if (lat >= -9.0 && lat <= -5.5 && lng >= 105.0 && lng <= 115.0) return 'JAWA';

    return 'JAWA';
  },

  /**
   * Human readable island group label
   */
  getIslandDisplayName(group) {
    const map = {
      'JAWA': 'Pulau Jawa',
      'SUMATERA': 'Sumatera',
      'KALIMANTAN': 'Kalimantan',
      'SULAWESI': 'Sulawesi',
      'BALI': 'Bali',
      'NTB': 'Nusa Tenggara Barat',
      'NTT': 'Nusa Tenggara Timur',
      'MALUKU_UTARA': 'Maluku Utara',
      'MALUKU': 'Maluku',
      'PAPUA': 'Papua',
      'KEPRI': 'Kepulauan Riau',
      'BANGKA_BELITUNG': 'Bangka Belitung'
    };
    return map[group] || group;
  },

  /**
   * Run Master Simulation & Allocation
   */
  runSimulation(personnelList, allStores, options = {}) {
    const config = {
      maxTravelMins: options.maxTravelMins || SIMULATION_CONFIG.PROXIMITY.MAX_TRAVEL_TIME_MINS,
      maxRadiusKm: options.maxRadiusKm || SIMULATION_CONFIG.PROXIMITY.MAX_RADIUS_KM,
      storesPerDay: options.storesPerDay || SIMULATION_CONFIG.WORKLOAD.STORES_PER_DAY,
      regularDays: options.regularDays || SIMULATION_CONFIG.WORKLOAD.REGULAR_STORE_DAYS,
      dcDays: options.dcDays || SIMULATION_CONFIG.WORKLOAD.DC_DAYS,
      dcPerDay: options.dcPerDay || SIMULATION_CONFIG.WORKLOAD.DC_PER_DAY,
      targetStoresMonth: (options.regularDays || SIMULATION_CONFIG.WORKLOAD.REGULAR_STORE_DAYS) * (options.storesPerDay || SIMULATION_CONFIG.WORKLOAD.STORES_PER_DAY)
    };

    console.log('[RouteEngine] Running simulation on', allStores.length, 'stores with target', config.targetStoresMonth, 'stores/MDS');

    // Tag and separate regular stores vs DC
    const regularStores = [];
    const dcStores = [];

    allStores.forEach(s => {
      s.islandGroup = s.islandGroup || this.getIslandGroup(s.lat, s.lng, s.kabKota, '');
      if (s.isDc) {
        dcStores.push(s);
      } else {
        regularStores.push(s);
      }
    });

    // 1. Initialize Active Personnel Slots with Island Geofencing
    const mdsAssignments = (personnelList || []).map((p, idx) => {
      const rawId = p.id || `MDS${idx + 1}`;
      const uniqueId = `ACT_${rawId}_${p.account || 'ALL'}_${idx + 1}`;
      const islandGroup = this.getIslandGroup(p.lat, p.lng, p.kota || p.kecamatan, p.region);

      return {
        id: uniqueId,
        displayId: rawId,
        nama: p.nama || `Personil MDS ${idx + 1}`,
        jabatan: p.jabatan || 'Merchandiser',
        account: p.account || 'ALFAMART',
        modul: p.modul || 'DK',
        alamat: p.alamat || '-',
        kecamatan: p.kecamatan || '-',
        kota: p.kota || '-',
        region: p.region || 'PULAU JAWA',
        islandGroup: islandGroup,
        lat: p.lat,
        lng: p.lng,
        isVirtual: false,
        status: 'ACTIVE',
        color: this.getMdsColor(idx),
        assignedStores: [],
        assignedDc: [],
        avgDistanceKm: 0,
        maxDistanceKm: 0,
        avgTravelMins: 0,
        dailySchedule: []
      };
    });

    const unassignedStores = new Set(regularStores.map(s => s.id));
    const storesMap = new Map(regularStores.map(s => [s.id, s]));

    // 2. Proximity Match for Active MDS (Strict Island Geofence & Max Radius <= 28 KM)
    const storeCandidates = [];

    regularStores.forEach(st => {
      mdsAssignments.forEach(mds => {
        // STRICT RULE 1: Zero Cross-Island Assignment
        if (st.islandGroup !== mds.islandGroup) return;

        // Fast Bounding Box Pre-filter (~40km) to bypass heavy trigonometric calculations
        if (Math.abs(st.lat - mds.lat) > 0.38 || Math.abs(st.lng - mds.lng) > 0.38) return;

        const d = this.getDistanceKm(mds.lat, mds.lng, st.lat, st.lng);
        // STRICT CEILING: Never assign a store further than maxRadiusKm * 1.25 (Max ~30 km)
        if (d <= config.maxRadiusKm * 1.25) {
          const t = this.getEstimatedTravelTimeMins(d);
          
          let accountBonus = 0;
          if (mds.account && st.account) {
            const mAcc = mds.account.toUpperCase();
            const sAcc = st.account.toUpperCase();
            if (mAcc === sAcc || (mAcc.includes('ALFA') && sAcc.includes('ALFA')) || (mAcc.includes('INDO') && sAcc.includes('INDO'))) {
              accountBonus = -3; // 3km preference bonus for same account
            }
          }

          storeCandidates.push({
            storeId: st.id,
            mdsId: mds.id,
            distKm: d,
            timeMins: t,
            score: d + accountBonus
          });
        }
      });
    });

    storeCandidates.sort((a, b) => a.score - b.score);

    const mdsMap = new Map(mdsAssignments.map(m => [m.id, m]));

    // 3. Fill Active MDS Nearest Stores (up to 420 stores in Primary Pass)
    storeCandidates.forEach(cand => {
      if (!unassignedStores.has(cand.storeId)) return;
      const mds = mdsMap.get(cand.mdsId);
      if (!mds) return;

      if (mds.assignedStores.length < config.targetStoresMonth) {
        const store = storesMap.get(cand.storeId);
        mds.assignedStores.push({
          ...store,
          distanceFromHomeKm: cand.distKm,
          travelTimeMins: cand.timeMins,
          isPrimaryCover: true
        });
        unassignedStores.delete(cand.storeId);
      }
    });

    const activeMdsList = mdsAssignments.filter(m => !m.isVirtual);

    // 3.5. Progressive Expansion for MDS with < 420 Stores (STRICTLY within SAME ISLAND and <= 85 KM)
    activeMdsList.forEach(mds => {
      if (mds.assignedStores.length < config.targetStoresMonth && unassignedStores.size > 0) {
        const needed = config.targetStoresMonth - mds.assignedStores.length;
        
        // Only consider leftovers from the EXACT SAME island group
        const availableLeftovers = Array.from(unassignedStores)
          .map(id => storesMap.get(id))
          .filter(s => s && s.islandGroup === mds.islandGroup);
        
        if (availableLeftovers.length === 0) return;

        // Calculate distance and filter strictly <= 85 km (no unrealistic long trips / water crossings)
        const validNearby = [];
        for (let i = 0; i < availableLeftovers.length; i++) {
          const st = availableLeftovers[i];
          const d = this.getDistanceKm(mds.lat, mds.lng, st.lat, st.lng);
          if (d <= 85) { // Hard 85km realistic limit
            validNearby.push({ store: st, distKm: d });
          }
        }

        validNearby.sort((a, b) => a.distKm - b.distKm);

        const toAdd = validNearby.slice(0, needed);
        toAdd.forEach(item => {
          const st = item.store;
          const d = item.distKm;
          mds.assignedStores.push({
            ...st,
            distanceFromHomeKm: Math.round(d * 10) / 10,
            travelTimeMins: this.getEstimatedTravelTimeMins(d),
            isPrimaryCover: true
          });
          unassignedStores.delete(st.id);
        });
      }
    });

    // 4. Consolidate leftover stores into Dedicated ISLAND-BY-ISLAND Regional Recruitment Clusters (Zero Cross-Island)
    const unassignedByIsland = new Map();
    Array.from(unassignedStores).forEach(id => {
      const st = storesMap.get(id);
      if (!st) return;
      const ig = st.islandGroup || 'JAWA';
      if (!unassignedByIsland.has(ig)) unassignedByIsland.set(ig, []);
      unassignedByIsland.get(ig).push(st);
    });

    let virtualCounter = 1;

    // Process each island group independently to ensure 100% Zero Cross-Island Recruitment
    for (const [islandGroup, islandStores] of unassignedByIsland.entries()) {
      let pool = [...islandStores];
      const islandLabel = this.getIslandDisplayName(islandGroup);

      console.log(`[RouteEngine] Processing island recruitment for [${islandLabel}] (${pool.length} unassigned stores)...`);

      while (pool.length > 0) {
        let cluster = [];
        
        // If remaining stores on this island is <= 420, wrap them in 1 dedicated island cluster
        if (pool.length <= config.targetStoresMonth) {
          cluster = pool;
          pool = [];
        } else {
          // Pick first store as seed and cluster nearest stores on this island
          const seed = pool[0];
          const sLat = seed.lat;
          const sLng = seed.lng;
          const cosLat = Math.cos((sLat * Math.PI) / 180);

          for (let i = 0; i < pool.length; i++) {
            const s = pool[i];
            const dLat = s.lat - sLat;
            const dLng = (s.lng - sLng) * cosLat;
            s._dsq = dLat * dLat + dLng * dLng;
          }

          pool.sort((a, b) => a._dsq - b._dsq);

          const takeSize = Math.min(config.targetStoresMonth, pool.length);
          cluster = pool.slice(0, takeSize);
          pool = pool.slice(takeSize);
        }

        // Remove assigned from unassigned set
        cluster.forEach(st => unassignedStores.delete(st.id));

        // Identify primary cities and centroid coordinates
        const avgLat = cluster.reduce((sum, s) => sum + s.lat, 0) / cluster.length;
        const avgLng = cluster.reduce((sum, s) => sum + s.lng, 0) / cluster.length;

        const cityCounts = new Map();
        cluster.forEach(s => {
          const rawCity = (s.kabKota || s.kota || '').replace(/^KABUPATEN\s+|^KOTA\s+/i, '').trim().toUpperCase();
          const c = (rawCity && rawCity !== 'LAINNYA') ? rawCity : islandLabel.toUpperCase();
          cityCounts.set(c, (cityCounts.get(c) || 0) + 1);
        });
        const topCities = Array.from(cityCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);
        const areaCorridor = topCities.join(' - ') || islandLabel;

        const vCode = `REKRUT_${String(virtualCounter).padStart(2, '0')}`;
        const uniqueId = `VAC_${islandGroup}_${vCode}_${virtualCounter}`;

        const virtualMds = {
          id: uniqueId,
          displayId: vCode,
          nama: `[USULAN REKRUT] ${islandLabel} (${areaCorridor}) #${virtualCounter} (${cluster.length} Toko)`,
          jabatan: 'Merchandiser (Usulan Baru)',
          account: cluster[0]?.account || 'ALL',
          modul: 'VACANT',
          alamat: `Sentra Operasional ${areaCorridor}, ${islandLabel}`,
          kecamatan: cluster[0]?.kecamatan || topCities[0] || areaCorridor,
          kota: topCities[0] || areaCorridor,
          region: 'BUTUH MANPOWER',
          islandGroup: islandGroup,
          lat: Math.round(avgLat * 1000000) / 1000000,
          lng: Math.round(avgLng * 1000000) / 1000000,
          isVirtual: true,
          status: 'VACANT',
          color: '#f59e0b',
          assignedStores: cluster.map(st => {
            const d = this.getDistanceKm(avgLat, avgLng, st.lat, st.lng);
            return {
              ...st,
              distanceFromHomeKm: Math.round(d * 10) / 10,
              travelTimeMins: this.getEstimatedTravelTimeMins(d),
              isPerdin: false,
              tipeKunjungan: 'NON PERDIN',
              perdinBadge: '🚗 NON PERDIN',
              isVirtualCover: true
            };
          }),
          assignedDc: [],
          avgDistanceKm: 0,
          maxDistanceKm: 0,
          avgTravelMins: 0,
          dailySchedule: []
        };

        mdsAssignments.push(virtualMds);
        virtualCounter++;
      }
    }

    // 5. Localized DC Allocation (1 Dedicated DC Hub + 9 Surrounding Regular Stores per DC Day = 10 Stops)
    mdsAssignments.forEach(mds => {
      // Find all real DCs on the EXACT SAME island sorted by distance to this MDS
      const sameIslandDcs = dcStores.filter(dc => dc.islandGroup === mds.islandGroup);
      const nearbyDc = sameIslandDcs.map(dc => {
        const d = this.getDistanceKm(mds.lat, mds.lng, dc.lat, dc.lng);
        return {
          ...dc,
          distanceFromHomeKm: Math.round(d * 10) / 10,
          travelTimeMins: this.getEstimatedTravelTimeMins(d),
          isPerdin: false,
          isDc: true,
          type: 'DC',
          tipeKunjungan: 'KUNJUNGAN DC',
          perdinBadge: '🏭 DC'
        };
      }).sort((a, b) => a.distanceFromHomeKm - b.distanceFromHomeKm);

      // Available DCs for this MDS (Take nearest up to 4 distinct DCs if within reasonable distance, otherwise cycle primary)
      const primaryDc = nearbyDc[0] || {
        id: `DC_${mds.id}`,
        storeCode: 'DC-HUB',
        storeName: `DC Hub ${mds.kota}`,
        kabKota: mds.kota,
        islandGroup: mds.islandGroup,
        lat: mds.lat,
        lng: mds.lng,
        distanceFromHomeKm: 0,
        travelTimeMins: 0,
        isPerdin: false,
        isDc: true,
        type: 'DC',
        tipeKunjungan: 'KUNJUNGAN DC',
        perdinBadge: '🏭 DC'
      };

      // Filter candidate DCs within reasonable distance (< 65 km), fallback to top 2 closest
      let candidateDcs = nearbyDc.filter(dc => dc.distanceFromHomeKm <= 65);
      if (candidateDcs.length === 0) {
        candidateDcs = nearbyDc.slice(0, 2);
      }
      if (candidateDcs.length === 0) {
        candidateDcs.push(primaryDc);
      }

      const assignedDcDays = [];
      // Set of store IDs already assigned to this MDS on regular days (Days 1 to 21)
      const mdsVisitedStoreIds = new Set((mds.assignedStores || []).map(s => s.id));

      // For each of the 4 DC days, pick 1 dedicated DC Hub and select 9 UNIQUE surrounding regular stores (Strict Zero Re-visit)
      for (let dDay = 0; dDay < config.dcDays; dDay++) {
        // Rotate across available candidate DCs (e.g. Week 1 -> DC 1, Week 2 -> DC 2, Week 3 -> DC 1, etc.)
        const chosenDc = candidateDcs[dDay % candidateDcs.length];

        // High-Speed Spatial Bounding Box Filter (~35km radius) on SAME island to avoid scanning 49k stores
        let nearbyCandidates = regularStores.filter(st => 
          st.islandGroup === mds.islandGroup &&
          !mdsVisitedStoreIds.has(st.id) && 
          !st.isDc &&
          Math.abs(st.lat - chosenDc.lat) < 0.35 &&
          Math.abs(st.lng - chosenDc.lng) < 0.35
        );

        // Fallback: If area is sparse, expand bounding box to ~80km on SAME island
        if (nearbyCandidates.length < 9) {
          nearbyCandidates = regularStores.filter(st => 
            st.islandGroup === mds.islandGroup &&
            !mdsVisitedStoreIds.has(st.id) && 
            !st.isDc &&
            Math.abs(st.lat - chosenDc.lat) < 0.8 &&
            Math.abs(st.lng - chosenDc.lng) < 0.8
          );
        }

        // If still sparse, fallback to any unvisited stores on the SAME island
        if (nearbyCandidates.length === 0) {
          nearbyCandidates = regularStores.filter(st => 
            st.islandGroup === mds.islandGroup && 
            !mdsVisitedStoreIds.has(st.id) && 
            !st.isDc
          );
        }

        // Calculate exact distance & travel time on the filtered candidate set (~30-50 stores only)
        const storesNearDc = nearbyCandidates.map(st => {
          const distToDc = this.getDistanceKm(chosenDc.lat, chosenDc.lng, st.lat, st.lng);
          const distToHome = this.getDistanceKm(mds.lat, mds.lng, st.lat, st.lng);
          return {
            ...st,
            distToDc: distToDc,
            distanceFromHomeKm: Math.round(distToHome * 10) / 10,
            travelTimeMins: this.getEstimatedTravelTimeMins(distToHome),
            isDc: false,
            type: 'STORE',
            tipeKunjungan: 'TOKO SEKITAR DC',
            perdinBadge: '🚗 NON PERDIN'
          };
        }).sort((a, b) => a.distToDc - b.distToDc);

        // Pick top 9 distinct unvisited stores closest to this DC
        const selected9 = storesNearDc.slice(0, 9);

        // Mark these 9 stores as visited so subsequent DC days will NOT revisit them
        selected9.forEach(st => {
          mdsVisitedStoreIds.add(st.id);
          unassignedStores.delete(st.id);
        });

        // Sort the 9 stores in TSP nearest neighbor chain starting from the DC location
        const sorted9 = this.sortRouteChain(chosenDc.lat, chosenDc.lng, selected9);

        // Build the 10 stops for this DC Day: Stop 1 = DC Hub, Stops 2..10 = 9 Regular Stores
        const dayStops = [
          {
            ...chosenDc,
            id: `${chosenDc.id}_D${dDay + 1}`,
            isDc: true,
            type: 'DC',
            tipeKunjungan: 'KUNJUNGAN DC',
            perdinBadge: '🏭 DC',
            dcVisitIndex: 1
          },
          ...sorted9.map((st, sIdx) => ({
            ...st,
            id: `${st.id}_D${dDay + 1}_V${sIdx + 2}`,
            isDc: false,
            type: 'STORE',
            tipeKunjungan: 'TOKO SEKITAR DC',
            perdinBadge: '🚗 NON PERDIN'
          }))
        ];

        assignedDcDays.push({
          dDayIndex: dDay + 1,
          dc: chosenDc,
          stops: dayStops
        });
      }

      // Store in mds object
      mds.assignedDcDays = assignedDcDays;
      mds.assignedDc = assignedDcDays.flatMap(d => d.stops);
    });

    // 6. Generate 25-Day Daily Itinerary per MDS (Chain Optimization)
    mdsAssignments.forEach(mds => {
      // Sort assigned stores by traveling salesperson nearest chain
      const sortedStores = this.sortRouteChain(mds.lat, mds.lng, mds.assignedStores);
      mds.assignedStores = sortedStores;

      if (sortedStores.length > 0) {
        const totalDist = sortedStores.reduce((acc, s) => acc + (s.distanceFromHomeKm || 0), 0);
        const totalTime = sortedStores.reduce((acc, s) => acc + (s.travelTimeMins || 0), 0);
        mds.avgDistanceKm = Math.round((totalDist / sortedStores.length) * 10) / 10;
        mds.maxDistanceKm = Math.round(Math.max(...sortedStores.map(s => s.distanceFromHomeKm || 0)) * 10) / 10;
        mds.avgTravelMins = Math.round(totalTime / sortedStores.length);
      }

      // Build 25 Days Matrix (with Perdin vs Local Classification)
      const dailySchedule = [];
      const storesPerDay = config.storesPerDay;
      const dcPerDay = config.dcPerDay;
      let localDaysCount = 0;
      let perdinDaysCount = 0;

      // Days 1 to 21: Regular Stores (Grouped Homogeneously by Day)
      for (let day = 1; day <= config.regularDays; day++) {
        const startIdx = (day - 1) * storesPerDay;
        let dayStores = sortedStores.slice(startIdx, startIdx + storesPerDay);

        // Sequence optimization within the day's 20 stops
        if (dayStores.length > 1) {
          dayStores = this.sortRouteChain(dayStores[0].lat, dayStores[0].lng, dayStores);
        }
        
        // Determine if this day qualifies as Perdin (Aturan: Jarak >= 150 KM atau Waktu Tempuh >= 4 Jam / 240 Menit)
        const avgDayDist = dayStores.length > 0 ? (dayStores.reduce((acc, s) => acc + (s.distanceFromHomeKm || 0), 0) / dayStores.length) : 0;
        const maxDayDist = dayStores.length > 0 ? Math.max(...dayStores.map(s => s.distanceFromHomeKm || 0)) : 0;
        const avgDayTimeMins = dayStores.length > 0 ? (dayStores.reduce((acc, s) => acc + (s.travelTimeMins || 0), 0) / dayStores.length) : 0;
        const primaryKab = dayStores.length > 0 && dayStores[0].kabKota ? dayStores[0].kabKota.replace(/^KABUPATEN\s+|^KOTA\s+/i, '') : '';
        
        // Jarak >= 150 KM atau Waktu Tempuh >= 4 Jam (240 Menit)
        const isPerdinDay = (avgDayDist >= 150 || maxDayDist >= 150 || avgDayTimeMins >= 240) && dayStores.length > 0;

        // Apply consistent classification to all stores within this day's route
        dayStores.forEach(st => {
          st.isPerdin = isPerdinDay;
          st.tipeKunjungan = isPerdinDay ? 'PERDIN (LUAR KOTA)' : 'NON PERDIN';
          st.perdinBadge = isPerdinDay ? '🏨 PERDIN' : '🚗 NON PERDIN';
          st.dayNumber = day;
        });

        if (isPerdinDay) {
          perdinDaysCount++;
        } else if (dayStores.length > 0) {
          localDaysCount++;
        }

        dailySchedule.push({
          dayNumber: day,
          type: isPerdinDay ? 'PERDIN' : 'STORE',
          subType: isPerdinDay ? 'PERDIN_LUAR_KOTA' : 'NON_PERDIN',
          isPerdin: isPerdinDay,
          perdinAllowance: isPerdinDay ? 400000 : 0,
          primaryArea: primaryKab,
          avgDistanceKm: Math.round(avgDayDist * 10) / 10,
          title: isPerdinDay ? `Hari ke-${day} (Perdin: ${primaryKab})` : `Hari ke-${day} (Non Perdin: ${primaryKab || mds.kota})`,
          badge: isPerdinDay ? '🏨 PERDIN' : '🚗 NON PERDIN',
          badgeClass: isPerdinDay ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
          items: dayStores,
          stores: dayStores,
          count: dayStores.length,
          target: storesPerDay
        });
      }

      // Days 22 to 25: DC Visits (Each day is 1 dedicated DC Hub + 9 surrounding regular stores = 10 stops)
      for (let day = config.regularDays + 1; day <= config.regularDays + config.dcDays; day++) {
        const dcDayIdx = day - config.regularDays - 1;
        const dcDayData = (mds.assignedDcDays && mds.assignedDcDays[dcDayIdx]) || null;
        const startIdx = dcDayIdx * dcPerDay;
        const dayStops = dcDayData ? dcDayData.stops : mds.assignedDc.slice(startIdx, startIdx + dcPerDay);
        
        const primaryDc = dayStops.find(s => s.isDc) || dayStops[0];
        const dcName = primaryDc ? (primaryDc.storeName || 'Distribution Center') : 'DC Hub';
        const dcArea = primaryDc ? (primaryDc.kabKota || mds.kota) : mds.kota;

        // Determine if this DC route qualifies as Perdin (Aturan: Jarak >= 150 KM dari rumah atau Waktu Tempuh >= 240 Menit)
        const avgDayDist = dayStops.length > 0 ? (dayStops.reduce((acc, s) => acc + (s.distanceFromHomeKm || 0), 0) / dayStops.length) : 0;
        const maxDayDist = dayStops.length > 0 ? Math.max(...dayStops.map(s => s.distanceFromHomeKm || 0)) : 0;
        const isPerdinDay = (avgDayDist >= 150 || maxDayDist >= 150) && dayStops.length > 0;

        dayStops.forEach((st, sIdx) => {
          st.dayNumber = day;
          st.isPerdin = isPerdinDay;
          if (st.isDc || st.type === 'DC' || sIdx === 0) {
            st.isDc = true;
            st.type = 'DC';
            st.tipeKunjungan = 'KUNJUNGAN DC';
            st.perdinBadge = '🏭 DC';
          } else {
            st.isDc = false;
            st.type = 'STORE';
            st.tipeKunjungan = 'TOKO SEKITAR DC';
            st.perdinBadge = isPerdinDay ? '🏨 PERDIN' : '🚗 NON PERDIN';
          }
        });

        if (isPerdinDay) {
          perdinDaysCount++;
        } else if (dayStops.length > 0) {
          localDaysCount++;
        }

        dailySchedule.push({
          dayNumber: day,
          type: 'DC',
          subType: 'DC_HUB_CLUSTER',
          isPerdin: isPerdinDay,
          perdinAllowance: isPerdinDay ? 400000 : 0,
          primaryArea: dcArea,
          avgDistanceKm: Math.round(avgDayDist * 10) / 10,
          title: `Hari ke-${day} (Kunjungan ${dcName} + 9 Toko Sekitar DC)`,
          badge: isPerdinDay ? '🏨 PERDIN (DC)' : '🏭 DC + 9 TOKO',
          badgeClass: isPerdinDay ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          items: dayStops,
          stores: dayStops,
          count: dayStops.length,
          target: dcPerDay
        });
      }

      mds.localDays = localDaysCount;
      mds.nonPerdinDays = localDaysCount;
      mds.perdinDays = perdinDaysCount;
      mds.dcDays = config.dcDays;
      mds.estPerdinBudget = perdinDaysCount * 400000;
      mds.dailySchedule = dailySchedule;
    });

    // 7. Overall Summary Metrics & Regional Breakdown
    const activeAssignments = mdsAssignments.filter(m => !m.isVirtual);
    const vacantAssignments = mdsAssignments.filter(m => m.isVirtual);

    const activeCoveredStores = activeAssignments.reduce((sum, m) => sum + m.assignedStores.length, 0);
    const vacantCoveredStores = Math.max(0, regularStores.length - activeCoveredStores);
    const totalCovered = regularStores.length;
    const totalPerdinDays = activeAssignments.reduce((sum, m) => sum + (m.perdinDays || 0), 0);
    const totalPerdinBudget = totalPerdinDays * 400000;

    // Financial Analysis Benchmark
    const fixedCostPerNewHire = (window.SIMULATION_CONFIG?.FINANCIAL?.TOTAL_NEW_HIRE_FIXED_COST) || 5220000;
    const estNewHiresReplaced = Math.max(0, Math.round(totalPerdinDays / 12)); // Asumsi 12 hari perdin setara 1 rekrutmen di area sekunder
    const potentialNewHireCost = estNewHiresReplaced * fixedCostPerNewHire;
    const estimatedSavings = Math.max(0, potentialNewHireCost - totalPerdinBudget);

    const regionalStats = {
      JABODETABEK: { stores: 0, mds: 0 },
      'PULAU JAWA': { stores: 0, mds: 0 },
      'LUAR PULAU': { stores: 0, mds: 0 }
    };

    activeAssignments.forEach(m => {
      const reg = m.region ? m.region.toUpperCase() : 'PULAU JAWA';
      let regKey = 'PULAU JAWA';
      if (reg.includes('JABODETABEK') || reg.includes('DK')) {
        regKey = 'JABODETABEK';
      } else if (reg.includes('LUAR') || reg.includes('LP')) {
        regKey = 'LUAR PULAU';
      }
      regionalStats[regKey].stores += m.assignedStores.length;
      regionalStats[regKey].mds += 1;
    });

    const activePercent = Math.round((activeCoveredStores / Math.max(1, regularStores.length)) * 1000) / 10;
    const vacantPercent = Math.max(0, Math.round((100 - activePercent) * 10) / 10);

    const totalWorkingDays = (config.regularDays || 21) + (config.dcDays || 4);
    const avgStoresPerMds = activeAssignments.length > 0 ? Math.round(activeCoveredStores / activeAssignments.length) : 0;
    const totalDcVisits = activeAssignments.length * (config.dcDays * config.dcPerDay);
    const totalMonthlyVisits = activeCoveredStores + totalDcVisits;
    const avgVisitsPerDay = (activeAssignments.length > 0 && totalWorkingDays > 0)
      ? Math.round((totalMonthlyVisits / (activeAssignments.length * totalWorkingDays)) * 10) / 10
      : 0;

    const summary = {
      totalMasterStores: allStores.length,
      regularStoresCount: regularStores.length,
      dcStoresCount: dcStores.length,
      activeCrewAssigned: activeAssignments.length,
      activeCoveredStores: activeCoveredStores,
      activeCoveragePercent: activePercent,
      avgStoresPerMds: avgStoresPerMds,
      avgVisitsPerDay: avgVisitsPerDay,
      totalMonthlyVisits: totalMonthlyVisits,
      totalWorkingDays: totalWorkingDays,
      vacantSlotsGenerated: vacantAssignments.length,
      vacantCoveredStores: vacantCoveredStores,
      vacantCoveragePercent: vacantPercent,
      totalAssignedStores: totalCovered,
      totalUnassignedStores: unassignedStores.size,
      idealManpowerTotal: activeAssignments.length + vacantAssignments.length,
      coveragePercent: activePercent,
      regionalStats: regionalStats,
      totalMdsSlots: mdsAssignments.length,
      // Financial & Perdin Summary
      totalPerdinDays: totalPerdinDays,
      totalPerdinBudget: totalPerdinBudget,
      fixedCostPerNewHire: fixedCostPerNewHire,
      estNewHiresReplaced: estNewHiresReplaced,
      estimatedSavings: estimatedSavings
    };

    console.log('[RouteEngine] Simulation Completed Successfully:', summary);

    return {
      assignments: mdsAssignments,
      summary: summary,
      config: config
    };
  },

  /**
   * High-Speed Nearest Neighbor Traveling Salesperson Chain (Flat-Earth Squared Distance)
   */
  sortRouteChain(startLat, startLng, stores) {
    if (!stores || stores.length <= 1) return stores || [];
    const unvisited = [...stores];
    const sorted = [];

    let currentLat = startLat;
    let currentLng = startLng;
    const cosLat = Math.cos((startLat * Math.PI) / 180);

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDistanceSq = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const u = unvisited[i];
        const dLat = u.lat - currentLat;
        const dLng = (u.lng - currentLng) * cosLat;
        const dSq = dLat * dLat + dLng * dLng;
        if (dSq < minDistanceSq) {
          minDistanceSq = dSq;
          nearestIdx = i;
        }
      }

      const nextStore = unvisited.splice(nearestIdx, 1)[0];
      sorted.push(nextStore);
      currentLat = nextStore.lat;
      currentLng = nextStore.lng;
    }

    return sorted;
  }
};

if (typeof window !== 'undefined') {
  window.RouteEngine = RouteEngine;
}
