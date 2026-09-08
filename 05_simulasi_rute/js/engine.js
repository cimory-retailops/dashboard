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
   * Determine Granular Regional Corridor Partition (Zero Cross-Province & Zero Cross-Island Routing)
   */
  getRegionPartition(lat, lng, kabKota = '', prov = '') {
    const text = (String(kabKota || '') + ' ' + String(prov || '')).toUpperCase();

    // 1. Non-Java Isolated Archipelago Groups
    if (/\b(BALI|DENPASAR|BADUNG|GIANYAR|TABANAN|BULELENG|KLUNGKUNG|BANGLI|KARANGASEM|JEMBRANA)\b/.test(text)) {
      return { key: 'BALI', name: 'Bali', island: 'BALI' };
    }
    if (/\b(BATAM|BINTAN|TANJUNG PINANG|KARIMUN|NATUNA|ANAMBAS)\b/.test(text) || text.includes('KEPULAUAN RIAU') || text.includes('KEPRI')) {
      return { key: 'KEPRI', name: 'Kepulauan Riau', island: 'KEPRI' };
    }
    if (/\b(BANGKA|BELITUNG|PANGKAL PINANG)\b/.test(text)) {
      return { key: 'BANGKA_BELITUNG', name: 'Bangka Belitung', island: 'BANGKA_BELITUNG' };
    }
    if (/\b(TERNATE|TIDORE|HALMAHERA|MOROTAI|SULA)\b/.test(text) || text.includes('MALUKU UTARA')) {
      return { key: 'MALUKU_UTARA', name: 'Maluku Utara', island: 'MALUKU_UTARA' };
    }
    if (/\b(AMBON|SERAM|BURU|TUAL|ARU)\b/.test(text) || text.includes('MALUKU')) {
      return { key: 'MALUKU', name: 'Maluku', island: 'MALUKU' };
    }
    if (/\b(PAPUA|JAYAPURA|MERAUKE|TIMIKA|MIMIKA|NABIRE|BIAK|SORONG|MANOKWARI|FAKFAK|JAYAWIJAYA)\b/.test(text)) {
      return { key: 'PAPUA', name: 'Papua', island: 'PAPUA' };
    }
    if (/\b(LOMBOK|MATARAM|SUMBAWA|BIMA|DOMPU|NTB)\b/.test(text) || text.includes('NUSA TENGGARA BARAT')) {
      return { key: 'NTB', name: 'Nusa Tenggara Barat', island: 'NTB' };
    }
    if (/\b(KUPANG|FLORES|TIMOR|ENDE|SIKKA|MANGGARAI|SUMBA|ALOR|ROTE|NTT)\b/.test(text) || text.includes('NUSA TENGGARA TIMUR')) {
      return { key: 'NTT', name: 'Nusa Tenggara Timur', island: 'NTT' };
    }

    // 2. Sulawesi Corridors
    if (/\b(MANADO|BITUNG|TOMOHON|MINAHASA|KOTAMOBAGU|GORONTALO|PALU|TOLI|POSO|BANGGAI|BUOL|PARIGI|SIGI|TOJO)\b/.test(text)) {
      return { key: 'SULAWESI_UTARA_TENGAH', name: 'Sulawesi Bagian Utara', island: 'SULAWESI' };
    }
    if (/\b(MAKASSAR|MAROS|GOWA|BONE|MAMUJU|LUWU|PALOPO|PAREPARE|TORAJA|KOLAKA|BAUBAU|KENDARI|BULUKUMBA|BANTAENG|JENEPONTO|TAKALAR|SINJAI|WAJO|SOPPENG|SIDRAP|PINRANG|ENREKANG|POLEWALI|MAJENE|MAMASA|PASANGKAYU|KONAWE|BOMBANA|BUTON|MUNA|WAKATOBI|SULAWESI)\b/.test(text)) {
      return { key: 'SULAWESI_SELATAN', name: 'Sulawesi Bagian Selatan', island: 'SULAWESI' };
    }

    // 3. Kalimantan Corridors
    if (/\b(PONTIANAK|SINGKAWANG|KETAPANG|SAMBAS|SINTANG|BENGKAYANG|LANDAK|SANGGAU|SEKADAU|KAPUAS HULU|KAYONG)\b/.test(text)) {
      return { key: 'KALIMANTAN_BARAT', name: 'Kalimantan Barat', island: 'KALIMANTAN' };
    }
    if (/\b(SAMARINDA|BALIKPAPAN|BANJARMASIN|BANJARBARU|PALANGKA|PALANGKARAYA|TARAKAN|BERAU|BONTANG|KUTAI|KAPUAS|KOTABARU|KOTA BARU|TANAH BUMBU|TANAH LAUT|TABALONG|HULU SUNGAI|BARITO|PASER|PENAJAM|MAHAKAM|BULUNGAN|NUNUKAN|MALINAU|KATINGAN|KOTAWARINGIN|SAMPIT|PANGKALAN BUN|SUKAMARA|LAMANDAU|SERUYAN|GUNUNG MAS|MURUNG RAYA|KALIMANTAN)\b/.test(text)) {
      return { key: 'KALIMANTAN_TIMUR_SELATAN', name: 'Kalimantan Timur & Selatan', island: 'KALIMANTAN' };
    }

    // 4. Sumatera Corridors
    if (/\b(MEDAN|DELI SERDANG|BINJAI|ASAHAN|SIMALUNGUN|PEMATANGSIANTAR|KARO|TEBING TINGGI|SERDANG BEDAGAI|BATU BARA|LABUHANBATU|LABUHAN BATU|TAPANULI|TOBA|DAIRI|PAKPAK|HUMBANG|SAMOSIR|SIBOLGA|PADANG SIDEMPUAN|MANDAILING|NIAS|GUNUNGSITOLI|ACEH|BANDA ACEH|LHOKSEUMAWE|LANGSA|SABANG|SUBULUSSALAM|PIDIE|BIREUEN|BENER MERIAH|TAKENGON|ACEH BESAR|ACEH UTARA|ACEH TIMUR|ACEH BARAT|ACEH SELATAN|ACEH TENGGARA|ACEH TAMIANG|ACEH SINGKIL|ACEH JAYA|SIMEULUE)\b/.test(text)) {
      return { key: 'SUMATERA_UTARA_ACEH', name: 'Sumatera Bagian Utara', island: 'SUMATERA' };
    }
    if (/\b(PEKANBARU|DUMAI|PADANG|BUKITTINGGI|JAMBI|RIAU|SUMATERA BARAT|KAMPAR|INDRAGIRI|PELALAWAN|ROKAN|SIAK|KUANTAN|MERANTI|SUNGAI PENUH|KERINCI|MERANGIN|SAROLANGUN|BATANGHARI|BATANG HARI|MUARO JAMBI|TANJUNG JABUNG|TEBO|BUNGO|PARIAMAN|PADANG PANJANG|SAWAHLUNTO|SOLOK|PAYAKUMBUH|PASAMAN|PESISIR SELATAN|SIJUNJUNG|TANAH DATAR|AGAM|LIMA PULUH KOTA|DHARMASRAYA|MENTAWAI)\b/.test(text)) {
      return { key: 'SUMATERA_TENGAH', name: 'Sumatera Bagian Tengah', island: 'SUMATERA' };
    }
    if (/\b(PALEMBANG|PRABUMULIH|LUBUKLINGGAU|PAGAR ALAM|BENGKULU|LAMPUNG|BANDAR LAMPUNG|METRO|TULANG BAWANG|OGAN ILIR|OGAN KOMERING|MUARA ENIM|LAHAT|MUSI RAWAS|MUSI BANYUASIN|BANYUASIN|EMPAT LAWANG|PENUKAL ABAB|REJANG LEBONG|LEBONG|KEPAHIANG|MUKOMUKO|SELUMA|MANNA|KAUR|BENGKULU UTARA|BENGKULU SELATAN|BENGKULU TENGAH|LAMPUNG SELATAN|LAMPUNG TENGAH|LAMPUNG UTARA|LAMPUNG BARAT|LAMPUNG TIMUR|TANGGAMUS|WAY KANAN|PESAWARAN|PRINGSEWU|MESUJI|TULANG BAWANG BARAT|PESISIR BARAT|SUMATERA)\b/.test(text)) {
      return { key: 'SUMATERA_SELATAN_LAMPUNG', name: 'Sumatera Bagian Selatan', island: 'SUMATERA' };
    }

    // 5. Java Regional Partitions (Zero Cross-Province Routing)
    if (/\b(JAKARTA|BOGOR|DEPOK|TANGERANG|BEKASI|SERANG|CILEGON|LEBAK|PANDEGLANG)\b/.test(text)) {
      return { key: 'JABODETABEK_BANTEN', name: 'Jabodetabek & Banten', island: 'JAWA' };
    }
    if (/\b(BANDUNG|CIMAHI|GARUT|TASIKMALAYA|CIAMIS|BANJAR|PANGANDARAN|CIREBON|INDRAMAYU|MAJALENGKA|KUNINGAN|SUKABUMI|CIANJUR|KARAWANG|PURWAKARTA|SUBANG|SUMEDANG)\b/.test(text)) {
      return { key: 'JAWA_BARAT', name: 'Jawa Barat', island: 'JAWA' };
    }
    if (/\b(SEMARANG|SOLO|SURAKARTA|YOGYAKARTA|JOGJA|SLEMAN|BANTUL|GUNUNGKIDUL|KULON PROGO|MAGELANG|SALATIGA|KUDUS|PATI|JEPARA|REMBANG|BLORA|GROBOGAN|KLATEN|BOYOLALI|SUKOHARJO|KARANGANYAR|WONOGIRI|SRAGEN|PURWOKERTO|BANYUMAS|CILACAP|PURBALINGGA|BANJARNEGARA|KEBUMEN|PURWOREJO|WONOSOBO|TEMANGGUNG|TEGAL|BREBES|PEMALANG|PEKALONGAN|BATANG|KENDAL|DEMAK)\b/.test(text)) {
      return { key: 'JAWA_TENGAH_DIY', name: 'Jawa Tengah & DIY', island: 'JAWA' };
    }
    if (/\b(SURABAYA|SIDOARJO|GRESIK|MOJOKERTO|JOMBANG|LAMONGAN|TUBAN|BOJONEGORO|MALANG|BATU|PASURUAN|PROBOLINGGO|LUMAJANG|JEMBER|BONDOWOSO|SITUBONDO|BANYUWANGI|KEDIRI|BLITAR|TULUNGAGUNG|TRENGGALEK|MADIUN|MAGETAN|NGAWI|PONOROGO|PACITAN|NGANJUK|MADURA|BANGKALAN|SAMPANG|PAMEKASAN|SUMENEP)\b/.test(text)) {
      return { key: 'JAWA_TIMUR', name: 'Jawa Timur & Madura', island: 'JAWA' };
    }

    // 6. Spatial Coordinate Bounding Box Fallback (No Leaks!)
    if (lat >= -5.0 && lat <= 5.0 && lng >= 108.5 && lng <= 119.0) {
      if (lng < 111.0) return { key: 'KALIMANTAN_BARAT', name: 'Kalimantan Barat', island: 'KALIMANTAN' };
      return { key: 'KALIMANTAN_TIMUR_SELATAN', name: 'Kalimantan Timur & Selatan', island: 'KALIMANTAN' };
    }
    if (lat >= -6.0 && lat <= 3.0 && lng >= 118.5 && lng <= 126.0) {
      if (lat > -1.0) return { key: 'SULAWESI_UTARA_TENGAH', name: 'Sulawesi Bagian Utara', island: 'SULAWESI' };
      return { key: 'SULAWESI_SELATAN', name: 'Sulawesi Bagian Selatan', island: 'SULAWESI' };
    }
    if (lng < 106.0 && lat >= -6.0 && lat <= 6.0) {
      if (lat > 2.0) return { key: 'SUMATERA_UTARA_ACEH', name: 'Sumatera Bagian Utara', island: 'SUMATERA' };
      if (lat > -1.0) return { key: 'SUMATERA_TENGAH', name: 'Sumatera Bagian Tengah', island: 'SUMATERA' };
      return { key: 'SUMATERA_SELATAN_LAMPUNG', name: 'Sumatera Bagian Selatan', island: 'SUMATERA' };
    }

    if (lat >= -9.0 && lat <= -5.5) {
      if (lng < 107.05) return { key: 'JABODETABEK_BANTEN', name: 'Jabodetabek & Banten', island: 'JAWA' };
      if (lng < 108.85) return { key: 'JAWA_BARAT', name: 'Jawa Barat', island: 'JAWA' };
      if (lng < 111.45) return { key: 'JAWA_TENGAH_DIY', name: 'Jawa Tengah & DIY', island: 'JAWA' };
      if (lng <= 115.0) return { key: 'JAWA_TIMUR', name: 'Jawa Timur & Madura', island: 'JAWA' };
    }

    return { key: 'JABODETABEK_BANTEN', name: 'Jabodetabek & Banten', island: 'JAWA' };
  },

  /**
   * Helper to get island group string
   */
  getIslandGroup(lat, lng, kabKota = '', prov = '') {
    const part = this.getRegionPartition(lat, lng, kabKota, prov);
    return part.island;
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

    // Tag and separate regular stores vs DC with regional partitions
    const regularStores = [];
    const dcStores = [];

    allStores.forEach(s => {
      const part = this.getRegionPartition(s.lat, s.lng, s.kabKota, '');
      s.regionKey = part.key;
      s.regionName = part.name;
      s.islandGroup = part.island;

      if (s.isDc) {
        dcStores.push(s);
      } else {
        regularStores.push(s);
      }
    });

    // 1. Initialize Active Personnel Slots with Region Partitioning
    const mdsAssignments = (personnelList || []).map((p, idx) => {
      const rawId = p.id || `MDS${idx + 1}`;
      const uniqueId = `ACT_${rawId}_${p.account || 'ALL'}_${idx + 1}`;
      const part = this.getRegionPartition(p.lat, p.lng, p.kota || p.kecamatan, p.region);

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
        regionKey: part.key,
        regionName: part.name,
        islandGroup: part.island,
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

    // 2. Proximity Match for Active MDS (Strict Region Geofence & Max Radius <= 28 KM)
    const storeCandidates = [];

    regularStores.forEach(st => {
      mdsAssignments.forEach(mds => {
        // STRICT RULE 1: Must be in same regional corridor
        if (st.regionKey !== mds.regionKey) return;

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

    // 3.5. Progressive Expansion for MDS with < 420 Stores (STRICTLY within SAME REGIONAL ZONE and <= 55 KM)
    activeMdsList.forEach(mds => {
      if (mds.assignedStores.length < config.targetStoresMonth && unassignedStores.size > 0) {
        const needed = config.targetStoresMonth - mds.assignedStores.length;
        
        // Only consider leftovers from the EXACT SAME regional zone
        const availableLeftovers = Array.from(unassignedStores)
          .map(id => storesMap.get(id))
          .filter(s => s && s.regionKey === mds.regionKey);
        
        if (availableLeftovers.length === 0) return;

        // Calculate distance and filter strictly <= 55 km (realistic commute, no crazy cross-province jumps)
        const validNearby = [];
        for (let i = 0; i < availableLeftovers.length; i++) {
          const st = availableLeftovers[i];
          const d = this.getDistanceKm(mds.lat, mds.lng, st.lat, st.lng);
          if (d <= 55) { // Strict 55km realistic limit
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

    // 4. Consolidate leftover stores into Dedicated REGION-BY-REGION Recruitment Clusters (Zero Cross-Province Routing)
    const unassignedByRegion = new Map();
    Array.from(unassignedStores).forEach(id => {
      const st = storesMap.get(id);
      if (!st) return;
      const rKey = st.regionKey || 'JABODETABEK_BANTEN';
      if (!unassignedByRegion.has(rKey)) unassignedByRegion.set(rKey, []);
      unassignedByRegion.get(rKey).push(st);
    });

    let virtualCounter = 1;

    // Process each regional zone independently to ensure 100% Zero Cross-Province Recruitment
    for (const [rKey, regionStores] of unassignedByRegion.entries()) {
      let pool = [...regionStores];
      const regionName = regionStores[0]?.regionName || rKey;
      const islandGroup = regionStores[0]?.islandGroup || 'JAWA';

      console.log(`[RouteEngine] Processing recruitment for [${regionName}] (${pool.length} unassigned stores)...`);

      const zoneClusters = [];

      while (pool.length > 0) {
        // If remaining stores in this zone <= 420, create final cluster for this zone
        if (pool.length <= config.targetStoresMonth) {
          zoneClusters.push(pool);
          pool = [];
        } else {
          // Pick seed and cluster nearest stores strictly in this zone
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
          const chunk = pool.slice(0, takeSize);
          pool = pool.slice(takeSize);
          zoneClusters.push(chunk);
        }
      }

      // If final tail in this zone < 200 stores and there are previous clusters in this same zone, merge into the previous cluster
      if (zoneClusters.length > 1 && zoneClusters[zoneClusters.length - 1].length < 200) {
        const tail = zoneClusters.pop();
        zoneClusters[zoneClusters.length - 1].push(...tail);
      }

      // Build Virtual MDS for each cluster in this regional zone
      zoneClusters.forEach(cluster => {
        // Remove assigned from unassigned set
        cluster.forEach(st => unassignedStores.delete(st.id));

        // Identify primary cities and centroid coordinates
        const avgLat = cluster.reduce((sum, s) => sum + s.lat, 0) / cluster.length;
        const avgLng = cluster.reduce((sum, s) => sum + s.lng, 0) / cluster.length;

        const cityCounts = new Map();
        cluster.forEach(s => {
          const rawCity = (s.kabKota || s.kota || '').replace(/^KABUPATEN\s+|^KOTA\s+|^ADM\.\s+/i, '').trim().toUpperCase();
          const c = (rawCity && rawCity !== 'LAINNYA') ? rawCity : regionName.toUpperCase();
          cityCounts.set(c, (cityCounts.get(c) || 0) + 1);
        });
        const topCities = Array.from(cityCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);
        const areaCorridor = topCities.join(' - ') || regionName;

        const vCode = `REKRUT_${String(virtualCounter).padStart(2, '0')}`;
        const uniqueId = `VAC_${rKey}_${vCode}_${virtualCounter}`;

        const virtualMds = {
          id: uniqueId,
          displayId: vCode,
          nama: `[USULAN REKRUT] ${regionName} (${areaCorridor}) #${virtualCounter} (${cluster.length} Toko)`,
          jabatan: 'Merchandiser (Usulan Baru)',
          account: cluster[0]?.account || 'ALL',
          modul: 'VACANT',
          alamat: `Sentra Operasional ${areaCorridor}, ${regionName}`,
          kecamatan: cluster[0]?.kecamatan || topCities[0] || areaCorridor,
          kota: topCities[0] || areaCorridor,
          region: 'BUTUH MANPOWER',
          regionKey: rKey,
          regionName: regionName,
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
      });
    }

    // 5. High-Speed Localized DC Allocation (1 Dedicated DC Hub + 9 Surrounding Regular Stores per DC Day = 10 Stops)
    // Pre-index DCs and Stores by island and region for O(1) candidate lookup
    const dcsByIsland = new Map();
    dcStores.forEach(dc => {
      const ig = dc.islandGroup || 'JAWA';
      if (!dcsByIsland.has(ig)) dcsByIsland.set(ig, []);
      dcsByIsland.get(ig).push(dc);
    });

    const storesByRegionKey = new Map();
    regularStores.forEach(st => {
      const rk = st.regionKey || 'JABODETABEK_BANTEN';
      if (!storesByRegionKey.has(rk)) storesByRegionKey.set(rk, []);
      storesByRegionKey.get(rk).push(st);
    });

    mdsAssignments.forEach(mds => {
      const sameIslandDcs = dcsByIsland.get(mds.islandGroup) || dcStores;
      const candidateDcs = sameIslandDcs.map(dc => {
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
      }).sort((a, b) => a.distanceFromHomeKm - b.distanceFromHomeKm).slice(0, 4);

      const primaryDc = candidateDcs[0] || {
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

      const activeCandidateDcs = candidateDcs.length > 0 ? candidateDcs : [primaryDc];
      const assignedDcDays = [];
      const mdsVisitedStoreIds = new Set((mds.assignedStores || []).map(s => s.id));
      const poolInRegion = storesByRegionKey.get(mds.regionKey) || regularStores;

      for (let dDay = 0; dDay < config.dcDays; dDay++) {
        const chosenDc = activeCandidateDcs[dDay % activeCandidateDcs.length];

        let selected9 = [];
        if (mds.isVirtual && mds.assignedStores.length >= 10) {
          // Virtual recruits pick from their own cluster
          const sliceStart = dDay * 9;
          selected9 = mds.assignedStores.slice(sliceStart, sliceStart + 9).map(st => ({
            ...st,
            isDc: false,
            type: 'STORE',
            tipeKunjungan: 'TOKO SEKITAR DC',
            perdinBadge: '🚗 NON PERDIN'
          }));
        } else {
          // Active MDS search localized pool
          const candidates = poolInRegion.filter(st => 
            !mdsVisitedStoreIds.has(st.id) && 
            !st.isDc &&
            Math.abs(st.lat - chosenDc.lat) < 0.4 &&
            Math.abs(st.lng - chosenDc.lng) < 0.4
          ).slice(0, 9);

          selected9 = candidates.map(st => {
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
          });

          selected9.forEach(st => {
            mdsVisitedStoreIds.add(st.id);
            unassignedStores.delete(st.id);
          });
        }

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
          ...selected9.map((st, sIdx) => ({
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

      mds.assignedDcDays = assignedDcDays;
      mds.assignedDc = assignedDcDays.flatMap(d => d.stops);
    });

    // 6. Fast O(N log N) Day-by-Day Route Sequencing (Zero Freezing)
    mdsAssignments.forEach(mds => {
      // 1. Sort all assigned stores by proximity to home in fast O(N log N)
      const mLat = mds.lat;
      const mLng = mds.lng;
      const cosLat = Math.cos((mLat * Math.PI) / 180);

      for (let i = 0; i < mds.assignedStores.length; i++) {
        const s = mds.assignedStores[i];
        const dLat = s.lat - mLat;
        const dLng = (s.lng - mLng) * cosLat;
        s._dsqHome = dLat * dLat + dLng * dLng;
      }
      mds.assignedStores.sort((a, b) => a._dsqHome - b._dsqHome);

      if (mds.assignedStores.length > 0) {
        const totalDist = mds.assignedStores.reduce((acc, s) => acc + (s.distanceFromHomeKm || 0), 0);
        const totalTime = mds.assignedStores.reduce((acc, s) => acc + (s.travelTimeMins || 0), 0);
        mds.avgDistanceKm = Math.round((totalDist / mds.assignedStores.length) * 10) / 10;
        mds.maxDistanceKm = Math.round(Math.max(...mds.assignedStores.map(s => s.distanceFromHomeKm || 0)) * 10) / 10;
        mds.avgTravelMins = Math.round(totalTime / mds.assignedStores.length);
      }

      // 2. Build 25 Days Matrix: Sequence each individual 20-store day in O(K^2) where K=20
      const dailySchedule = [];
      const storesPerDay = config.storesPerDay;
      const dcPerDay = config.dcPerDay;
      let localDaysCount = 0;
      let perdinDaysCount = 0;

      // Days 1 to 21: Regular Stores
      for (let day = 1; day <= config.regularDays; day++) {
        const startIdx = (day - 1) * storesPerDay;
        let dayStores = mds.assignedStores.slice(startIdx, startIdx + storesPerDay);

        // Sequence only the 20 stores of this specific day (Ultra-fast: 200 ops per day)
        if (dayStores.length > 1) {
          dayStores = this.sortRouteChain(dayStores[0].lat, dayStores[0].lng, dayStores);
        }
        
        const avgDayDist = dayStores.length > 0 ? (dayStores.reduce((acc, s) => acc + (s.distanceFromHomeKm || 0), 0) / dayStores.length) : 0;
        const maxDayDist = dayStores.length > 0 ? Math.max(...dayStores.map(s => s.distanceFromHomeKm || 0)) : 0;
        const avgDayTimeMins = dayStores.length > 0 ? (dayStores.reduce((acc, s) => acc + (s.travelTimeMins || 0), 0) / dayStores.length) : 0;
        const primaryKab = dayStores.length > 0 && dayStores[0].kabKota ? dayStores[0].kabKota.replace(/^KABUPATEN\s+|^KOTA\s+/i, '') : '';
        
        const isPerdinDay = (avgDayDist >= 150 || maxDayDist >= 150 || avgDayTimeMins >= 240) && dayStores.length > 0;

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
