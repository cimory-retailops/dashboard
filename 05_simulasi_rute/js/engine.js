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
   * Determine Granular Regional Corridor Partition (Zero Cross-Province & Zero Cross-Island Routing)
   */
  getRegionPartition(lat, lng, kabKota = '', prov = '', branch = '') {
    const text = (String(kabKota || '') + ' ' + String(prov || '') + ' ' + String(branch || '')).toUpperCase();
    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    const hasCoord = !isNaN(numLat) && !isNaN(numLng) && numLat !== 0 && numLng !== 0;

    // =========================================================================
    // 1. HARD GEOGRAPHIC FENCES (Coordinates Never Lie)
    // =========================================================================
    // A. Kalimantan Island Fence: Lat -5.0 to +5.0, Lng 108.5 to 119.5
    if (hasCoord && numLat >= -5.0 && numLat <= 5.0 && numLng >= 108.5 && numLng <= 119.5) {
      if (numLng < 111.0 || /\b(PONTIANAK|SINGKAWANG|KETAPANG|SAMBAS|SINTANG|BENGKAYANG|LANDAK|SANGGAU|SEKADAU|KAPUAS HULU|KAYONG)\b/.test(text)) {
        return { key: 'KALIMANTAN_BARAT', name: 'Kalimantan Barat', island: 'KALIMANTAN' };
      }
      return { key: 'KALIMANTAN_TIMUR_SELATAN', name: 'Kalimantan Timur & Selatan', island: 'KALIMANTAN' };
    }

    // B. Sulawesi Island Fence: Lat -6.5 to +4.5, Lng 118.5 to 126.0
    if (hasCoord && numLat >= -6.5 && numLat <= 4.5 && numLng >= 118.5 && numLng <= 126.0) {
      if (numLat > -1.0 || /\b(MANADO|BITUNG|TOMOHON|MINAHASA|KOTAMOBAGU|GORONTALO|PALU|TOLI|POSO|BANGGAI|BUOL|PARIGI|SIGI|TOJO)\b/.test(text)) {
        return { key: 'SULAWESI_UTARA_TENGAH', name: 'Sulawesi Bagian Utara', island: 'SULAWESI' };
      }
      return { key: 'SULAWESI_SELATAN', name: 'Sulawesi Bagian Selatan', island: 'SULAWESI' };
    }

    // C. Sumatera Island Fence: Lat -6.5 to +6.5, Lng 94.5 to 106.2
    if (hasCoord && numLat >= -6.5 && numLat <= 6.5 && numLng >= 94.5 && numLng <= 106.2) {
      if (numLat > 2.0 || /\b(MEDAN|DELI|BINJAI|ASAHAN|SIMALUNGUN|SIANTAR|KARO|TEBING TINGGI|BATU BARA|LABUHAN|TAPANULI|TOBA|DAIRI|SIBOLGA|PADANG SIDEMPUAN|MANDAILING|NIAS|ACEH|BANDA ACEH|LHOKSEUMAWE|LANGSA|PIDIE|BIREUEN|TAKENGON)\b/.test(text)) {
        return { key: 'SUMATERA_UTARA_ACEH', name: 'Sumatera Bagian Utara', island: 'SUMATERA' };
      }
      if (numLat > -1.0 || /\b(PEKANBARU|DUMAI|PADANG|BUKITTINGGI|JAMBI|RIAU|SUMATERA BARAT|KAMPAR|INDRAGIRI|PELALAWAN|ROKAN|SIAK|KUANTAN|KERINCI|MERANGIN|BATANGHARI|PARIAMAN|SOLOK|PAYAKUMBUH)\b/.test(text)) {
        return { key: 'SUMATERA_TENGAH', name: 'Sumatera Bagian Tengah', island: 'SUMATERA' };
      }
      return { key: 'SUMATERA_SELATAN_LAMPUNG', name: 'Sumatera Bagian Selatan', island: 'SUMATERA' };
    }

    // D. Bali Island Fence: Lat -9.0 to -7.9, Lng 114.4 to 115.8
    if (hasCoord && numLat >= -9.0 && numLat <= -7.9 && numLng >= 114.4 && numLng <= 115.8) {
      return { key: 'BALI', name: 'Bali', island: 'BALI' };
    }

    // E. Nusa Tenggara (Lombok, Sumbawa, Flores, Timor): Lng 115.8 to 126.0, Lat -11.5 to -7.8
    if (hasCoord && numLat >= -11.5 && numLat <= -7.8 && numLng >= 115.8 && numLng <= 126.0) {
      if (numLng < 119.5 || /\b(LOMBOK|MATARAM|SUMBAWA|BIMA|DOMPU|NTB)\b/.test(text)) {
        return { key: 'NTB', name: 'Nusa Tenggara Barat', island: 'NTB' };
      }
      return { key: 'NTT', name: 'Nusa Tenggara Timur', island: 'NTT' };
    }

    // F. Maluku & Papua: Lng > 126.0
    if (hasCoord && numLng > 126.0) {
      if (numLng < 132.0 && numLat <= 3.0) {
        if (numLat > -1.0) return { key: 'MALUKU_UTARA', name: 'Maluku Utara', island: 'MALUKU_UTARA' };
        return { key: 'MALUKU', name: 'Maluku', island: 'MALUKU' };
      }
      return { key: 'PAPUA', name: 'Papua', island: 'PAPUA' };
    }

    // G. Bangka Belitung & Kepulauan Riau
    if (hasCoord && numLat >= -4.0 && numLat <= 1.5 && numLng >= 104.5 && numLng <= 108.5) {
      if (numLat < -1.0) return { key: 'BANGKA_BELITUNG', name: 'Bangka Belitung', island: 'BANGKA_BELITUNG' };
      return { key: 'KEPRI', name: 'Kepulauan Riau', island: 'KEPRI' };
    }

    // =========================================================================
    // 2. TEXT REGEX RULES (For Missing / Zero Coordinates or Explicit Names)
    // =========================================================================
    // Non-Java text keywords
    if (/\b(BALI|DENPASAR|BADUNG|GIANYAR|TABANAN|BULELENG|KLUNGKUNG|BANGLI|KARANGASEM|JEMBRANA)\b/.test(text)) {
      return { key: 'BALI', name: 'Bali', island: 'BALI' };
    }
    if (/\b(BATAM|BINTAN|TANJUNG PINANG|KARIMUN|NATUNA|ANAMBAS|KEPRI)\b/.test(text)) {
      return { key: 'KEPRI', name: 'Kepulauan Riau', island: 'KEPRI' };
    }
    if (/\b(BANGKA|BELITUNG|PANGKAL PINANG)\b/.test(text)) {
      return { key: 'BANGKA_BELITUNG', name: 'Bangka Belitung', island: 'BANGKA_BELITUNG' };
    }
    if (/\b(TERNATE|TIDORE|HALMAHERA|MOROTAI|SULA|MALUKU UTARA)\b/.test(text)) {
      return { key: 'MALUKU_UTARA', name: 'Maluku Utara', island: 'MALUKU_UTARA' };
    }
    if (/\b(AMBON|SERAM|BURU|TUAL|ARU|MALUKU)\b/.test(text)) {
      return { key: 'MALUKU', name: 'Maluku', island: 'MALUKU' };
    }
    if (/\b(PAPUA|JAYAPURA|MERAUKE|TIMIKA|MIMIKA|NABIRE|BIAK|SORONG|MANOKWARI|FAKFAK|JAYAWIJAYA)\b/.test(text)) {
      return { key: 'PAPUA', name: 'Papua', island: 'PAPUA' };
    }
    if (/\b(LOMBOK|MATARAM|SUMBAWA|BIMA|DOMPU|NTB|NUSA TENGGARA BARAT)\b/.test(text)) {
      return { key: 'NTB', name: 'Nusa Tenggara Barat', island: 'NTB' };
    }
    if (/\b(KUPANG|FLORES|TIMOR|ENDE|SIKKA|MANGGARAI|SUMBA|ALOR|ROTE|NTT|NUSA TENGGARA TIMUR)\b/.test(text)) {
      return { key: 'NTT', name: 'Nusa Tenggara Timur', island: 'NTT' };
    }

    // Sulawesi keywords
    if (/\b(MANADO|BITUNG|TOMOHON|MINAHASA|KOTAMOBAGU|GORONTALO|PALU|TOLI|POSO|BANGGAI|BUOL|PARIGI|SIGI|TOJO)\b/.test(text)) {
      return { key: 'SULAWESI_UTARA_TENGAH', name: 'Sulawesi Bagian Utara', island: 'SULAWESI' };
    }
    if (/\b(MAKASSAR|MAROS|GOWA|BONE|MAMUJU|LUWU|PALOPO|PAREPARE|TORAJA|KOLAKA|BAUBAU|KENDARI|BULUKUMBA|BANTAENG|JENEPONTO|TAKALAR|SINJAI|WAJO|SOPPENG|SIDRAP|PINRANG|ENREKANG|POLEWALI|MAJENE|MAMASA|PASANGKAYU|KONAWE|BOMBANA|BUTON|MUNA|WAKATOBI|SULAWESI)\b/.test(text)) {
      return { key: 'SULAWESI_SELATAN', name: 'Sulawesi Bagian Selatan', island: 'SULAWESI' };
    }

    // Kalimantan keywords (Explicitly includes MARTAPURA, KABUPATEN BANJAR, BANJARBARU, BANJARMASIN)
    if (/\b(PONTIANAK|SINGKAWANG|KETAPANG|SAMBAS|SINTANG|BENGKAYANG|LANDAK|SANGGAU|SEKADAU|KAPUAS HULU|KAYONG)\b/.test(text)) {
      return { key: 'KALIMANTAN_BARAT', name: 'Kalimantan Barat', island: 'KALIMANTAN' };
    }
    if (/\b(SAMARINDA|BALIKPAPAN|BANJARMASIN|BANJARBARU|MARTAPURA|KABUPATEN BANJAR|KAB\. BANJAR|PALANGKA|PALANGKARAYA|TARAKAN|BERAU|BONTANG|KUTAI|KAPUAS|KOTABARU|KOTA BARU|TANAH BUMBU|TANAH LAUT|TABALONG|HULU SUNGAI|BARITO|PASER|PENAJAM|MAHAKAM|BULUNGAN|NUNUKAN|MALINAU|KATINGAN|KOTAWARINGIN|SAMPIT|PANGKALAN BUN|SUKAMARA|LAMANDAU|SERUYAN|GUNUNG MAS|MURUNG RAYA|KALIMANTAN)\b/.test(text)) {
      return { key: 'KALIMANTAN_TIMUR_SELATAN', name: 'Kalimantan Timur & Selatan', island: 'KALIMANTAN' };
    }

    // Sumatera keywords
    if (/\b(MEDAN|DELI SERDANG|BINJAI|ASAHAN|SIMALUNGUN|PEMATANGSIANTAR|KARO|TEBING TINGGI|SERDANG BEDAGAI|BATU BARA|LABUHANBATU|LABUHAN BATU|TAPANULI|TOBA|DAIRI|PAKPAK|HUMBANG|SAMOSIR|SIBOLGA|PADANG SIDEMPUAN|MANDAILING|NIAS|GUNUNGSITOLI|ACEH|BANDA ACEH|LHOKSEUMAWE|LANGSA|SABANG|SUBULUSSALAM|PIDIE|BIREUEN|BENER MERIAH|TAKENGON|ACEH BESAR|ACEH UTARA|ACEH TIMUR|ACEH BARAT|ACEH SELATAN|ACEH TENGGARA|ACEH TAMIANG|ACEH SINGKIL|ACEH JAYA|SIMEULUE)\b/.test(text)) {
      return { key: 'SUMATERA_UTARA_ACEH', name: 'Sumatera Bagian Utara', island: 'SUMATERA' };
    }
    if (/\b(PEKANBARU|DUMAI|PADANG|BUKITTINGGI|JAMBI|RIAU|SUMATERA BARAT|KAMPAR|INDRAGIRI|PELALAWAN|ROKAN|SIAK|KUANTAN|MERANTI|SUNGAI PENUH|KERINCI|MERANGIN|SAROLANGUN|BATANGHARI|BATANG HARI|MUARO JAMBI|TANJUNG JABUNG|TEBO|BUNGO|PARIAMAN|PADANG PANJANG|SAWAHLUNTO|SOLOK|PAYAKUMBUH|PASAMAN|PESISIR SELATAN|SIJUNJUNG|TANAH DATAR|AGAM|LIMA PULUH KOTA|DHARMASRAYA|MENTAWAI)\b/.test(text)) {
      return { key: 'SUMATERA_TENGAH', name: 'Sumatera Bagian Tengah', island: 'SUMATERA' };
    }
    if (/\b(PALEMBANG|PRABUMULIH|LUBUKLINGGAU|PAGAR ALAM|BENGKULU|LAMPUNG|BANDAR LAMPUNG|METRO|TULANG BAWANG|OGAN ILIR|OGAN KOMERING|MUARA ENIM|LAHAT|MUSI RAWAS|MUSI BANYUASIN|BANYUASIN|EMPAT LAWANG|PENUKAL ABAB|REJANG LEBONG|LEBONG|KEPAHIANG|MUKOMUKO|SELUMA|MANNA|KAUR|BENGKULU UTARA|BENGKULU SELATAN|BENGKULU TENGAH|LAMPUNG SELATAN|LAMPUNG TENGAH|LAMPUNG UTARA|LAMPUNG BARAT|LAMPUNG TIMUR|TANGGAMUS|WAY KANAN|PESAWARAN|PRINGSEWU|MESUJI|TULANG BAWANG BARAT|PESISIR BARAT|SUMATERA)\b/.test(text)) {
      return { key: 'SUMATERA_SELATAN_LAMPUNG', name: 'Sumatera Bagian Selatan', island: 'SUMATERA' };
    }

    // Java regional keywords (Note: 'KOTA BANJAR' is used instead of generic 'BANJAR' to prevent collision with Kab. Banjar Kalsel)
    if (/\b(JAKARTA|BOGOR|DEPOK|TANGERANG|BEKASI|SERANG|CILEGON|LEBAK|PANDEGLANG)\b/.test(text)) {
      return { key: 'JABODETABEK_BANTEN', name: 'Jabodetabek & Banten', island: 'JAWA' };
    }
    if (/\b(BANDUNG|CIMAHI|GARUT|TASIKMALAYA|CIAMIS|KOTA BANJAR|BANJAR PATROMAN|PANGANDARAN|CIREBON|INDRAMAYU|MAJALENGKA|KUNINGAN|SUKABUMI|CIANJUR|KARAWANG|PURWAKARTA|SUBANG|SUMEDANG|UJUNG BERUNG|UJUNGBERUNG|CINAMBO)\b/.test(text)) {
      return { key: 'JAWA_BARAT', name: 'Jawa Barat', island: 'JAWA' };
    }
    if (/\b(SEMARANG|SOLO|SURAKARTA|YOGYAKARTA|JOGJA|SLEMAN|BANTUL|GUNUNGKIDUL|KULON PROGO|MAGELANG|SALATIGA|KUDUS|PATI|JEPARA|REMBANG|BLORA|GROBOGAN|KLATEN|BOYOLALI|SUKOHARJO|KARANGANYAR|WONOGIRI|SRAGEN|PURWOKERTO|BANYUMAS|CILACAP|PURBALINGGA|BANJARNEGARA|KEBUMEN|PURWOREJO|WONOSOBO|TEMANGGUNG|TEGAL|BREBES|PEMALANG|PEKALONGAN|BATANG|KENDAL|DEMAK)\b/.test(text)) {
      return { key: 'JAWA_TENGAH_DIY', name: 'Jawa Tengah & DIY', island: 'JAWA' };
    }
    if (/\b(SURABAYA|SIDOARJO|GRESIK|MOJOKERTO|JOMBANG|LAMONGAN|TUBAN|BOJONEGORO|MALANG|BATU|PASURUAN|PROBOLINGGO|LUMAJANG|JEMBER|BONDOWOSO|SITUBONDO|BANYUWANGI|KEDIRI|BLITAR|TULUNGAGUNG|TRENGGALEK|MADIUN|MAGETAN|NGAWI|PONOROGO|PACITAN|NGANJUK|MADURA|BANGKALAN|SAMPANG|PAMEKASAN|SUMENEP)\b/.test(text)) {
      return { key: 'JAWA_TIMUR', name: 'Jawa Timur & Madura', island: 'JAWA' };
    }

    // =========================================================================
    // 3. JAVA COORDINATE BOUNDING BOX FALLBACK
    // =========================================================================
    if (hasCoord && numLat >= -9.0 && numLat <= -5.5 && numLng >= 105.0 && numLng <= 115.0) {
      if (numLng < 107.05) return { key: 'JABODETABEK_BANTEN', name: 'Jabodetabek & Banten', island: 'JAWA' };
      if (numLng < 108.85) return { key: 'JAWA_BARAT', name: 'Jawa Barat', island: 'JAWA' };
      if (numLng < 111.45) return { key: 'JAWA_TENGAH_DIY', name: 'Jawa Tengah & DIY', island: 'JAWA' };
      return { key: 'JAWA_TIMUR', name: 'Jawa Timur & Madura', island: 'JAWA' };
    }

    return { key: 'JABODETABEK_BANTEN', name: 'Jabodetabek & Banten', island: 'JAWA' };
  },

  /**
   * Helper to get island group string
   */
  getIslandGroup(lat, lng, kabKota = '', prov = '', branch = '') {
    const part = this.getRegionPartition(lat, lng, kabKota, prov, branch);
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
      // Target unique regular stores: (21 days * 20 stores) + (4 days * 9 stores) = 420 + 36 = 456
      targetStoresMonth: ((options.regularDays || 21) * (options.storesPerDay || 20)) + ((options.dcDays || 4) * ((options.dcPerDay || 10) - 1))
    };

    console.log('[RouteEngine] Running simulation on', allStores.length, 'stores with target', config.targetStoresMonth, 'stores/MDS');

    // Tag and separate regular stores vs DC with regional partitions
    const regularStores = [];
    const dcStores = [];

    allStores.forEach(s => {
      const part = this.getRegionPartition(s.lat, s.lng, s.kabKota, '', s.branchName || '');
      s.regionKey = part.key;
      s.regionName = part.name;
      s.islandGroup = part.island;

      if (s.isDc) {
        dcStores.push(s);
      } else {
        regularStores.push(s);
      }
    });

    // 1. Initialize Active Personnel Slots with Deduplication Safeguard
    const seenPersonnel = new Set();
    const cleanPersonnelList = (personnelList || []).filter(p => {
      const normName = String(p.nama || '').trim().toUpperCase();
      const normModul = String(p.modul || '').trim().toUpperCase();
      const key = `${normName}_${normModul}`;
      if (seenPersonnel.has(key)) {
        console.warn(`[RouteEngine] Duplicate personnel filtered out: ${p.nama} (${p.modul})`);
        return false;
      }
      seenPersonnel.add(key);
      return true;
    });

    const mdsAssignments = cleanPersonnelList.map((p, idx) => {
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

    // 2. Proximity Match for Active MDS (Aggressive search within region)
    const storeCandidates = [];

    regularStores.forEach(st => {
      mdsAssignments.forEach(mds => {
        // STRICT RULE 1: Must be in same island
        if (st.islandGroup !== mds.islandGroup) return;

        const d = this.getDistanceKm(mds.lat, mds.lng, st.lat, st.lng);
        // RELAXED CEILING: Allow up to 150km in initial pass if they are in the same region
        if (d <= 150) {
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

    // 3. Fill Active MDS Nearest Stores (Round-Robin up to targetStoresMonth)
    const candidatesByMds = new Map();
    mdsAssignments.forEach(m => candidatesByMds.set(m.id, []));
    storeCandidates.forEach(cand => {
      candidatesByMds.get(cand.mdsId).push(cand);
    });

    let keepAssigning = true;
    while(keepAssigning) {
      keepAssigning = false;
      mdsAssignments.forEach(mds => {
        if (mds.isVirtual) return;
        if (mds.assignedStores.length < config.targetStoresMonth) {
          const cands = candidatesByMds.get(mds.id);
          let assigned = false;
          while (cands && cands.length > 0 && !assigned) {
            const cand = cands.shift();
            if (unassignedStores.has(cand.storeId)) {
              const store = storesMap.get(cand.storeId);
              mds.assignedStores.push({
                ...store,
                distanceFromHomeKm: cand.distKm,
                travelTimeMins: cand.timeMins,
                isPrimaryCover: true
              });
              unassignedStores.delete(cand.storeId);
              assigned = true;
              keepAssigning = true;
            }
          }
        }
      });
    }

    const activeMdsList = mdsAssignments.filter(m => !m.isVirtual);

    // 3.5. Progressive Expansion for MDS with < targetStoresMonth (Full Island sweep)
    // Pre-calculate leftovers for each MDS
    const leftoversByMds = new Map();
    activeMdsList.forEach(mds => {
      const candidates = [];
      Array.from(unassignedStores).forEach(id => {
         const st = storesMap.get(id);
         if (st && st.islandGroup === mds.islandGroup) {
           const d = this.getDistanceKm(mds.lat, mds.lng, st.lat, st.lng);
           if (d <= 800) candidates.push({ store: st, distKm: d });
         }
      });
      candidates.sort((a, b) => a.distKm - b.distKm);
      leftoversByMds.set(mds.id, candidates);
    });

    let expandedKeepAssigning = true;
    while(expandedKeepAssigning) {
      expandedKeepAssigning = false;
      activeMdsList.forEach(mds => {
        if (mds.assignedStores.length < config.targetStoresMonth) {
          const cands = leftoversByMds.get(mds.id);
          let assigned = false;
          while (cands && cands.length > 0 && !assigned) {
            const cand = cands.shift();
            if (unassignedStores.has(cand.store.id)) {
               mds.assignedStores.push({
                 ...cand.store,
                 distanceFromHomeKm: Math.round(cand.distKm * 10) / 10,
                 travelTimeMins: this.getEstimatedTravelTimeMins(cand.distKm),
                 isPrimaryCover: true
               });
               unassignedStores.delete(cand.store.id);
               assigned = true;
               expandedKeepAssigning = true;
            }
          }
        }
      });
    }

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
        // If remaining stores in this zone <= targetStoresMonth, create final cluster for this zone
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
        const avgLat = cluster.reduce((sum, s) => sum + parseFloat(s.lat || 0), 0) / cluster.length;
        const avgLng = cluster.reduce((sum, s) => sum + parseFloat(s.lng || 0), 0) / cluster.length;

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

      // If we have enough assigned stores, we pick DC-day stores from them to avoid double coverage
      const hasEnoughAssigned = mds.assignedStores.length >= (config.dcDays * 9);

      for (let dDay = 0; dDay < config.dcDays; dDay++) {
        const chosenDc = activeCandidateDcs[dDay % activeCandidateDcs.length];
        let selected9 = [];

        if (hasEnoughAssigned) {
          // Pick 9 stores from assigned pool that are closest to this DC
          const availableForDc = mds.assignedStores.filter(s => !s.isDcDayStore);

          availableForDc.forEach(s => {
            s._distToDc = this.getDistanceKm(chosenDc.lat, chosenDc.lng, s.lat, s.lng);
          });

          availableForDc.sort((a, b) => a._distToDc - b._distToDc);
          selected9 = availableForDc.slice(0, 9).map(st => {
            st.isDcDayStore = true; // Tag it!
            return {
              ...st,
              isDc: false,
              type: 'STORE',
              tipeKunjungan: 'TOKO SEKITAR DC',
              perdinBadge: '🚗 NON PERDIN'
            };
          });
        } else {
          // Fallback if MDS doesn't have enough stores yet
          const poolInRegion = storesByRegionKey.get(mds.regionKey) || regularStores;
          const mdsVisitedStoreIds = new Set(mds.assignedStores.map(s => s.id));

          const candidates = poolInRegion.filter(st =>
            !mdsVisitedStoreIds.has(st.id) &&
            !st.isDc &&
            Math.abs(st.lat - chosenDc.lat) < 0.8 && // Wider DC search for remote areas
            Math.abs(st.lng - chosenDc.lng) < 0.8
          ).slice(0, 9);

          selected9 = candidates.map(st => {
            const distToHome = this.getDistanceKm(mds.lat, mds.lng, st.lat, st.lng);
            return {
              ...st,
              distanceFromHomeKm: Math.round(distToHome * 10) / 10,
              travelTimeMins: this.getEstimatedTravelTimeMins(distToHome),
              isDc: false,
              type: 'STORE',
              tipeKunjungan: 'TOKO SEKITAR DC',
              perdinBadge: '🚗 NON PERDIN'
            };
          });

          selected9.forEach(st => {
            unassignedStores.delete(st.id);
            mds.assignedStores.push({ ...st, isDcDayStore: true });
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

    // 6. Fast Day-by-Day Route Sequencing
    mdsAssignments.forEach(mds => {
      if (mds.assignedStores.length > 0) {
        const totalDist = mds.assignedStores.reduce((acc, s) => acc + (s.distanceFromHomeKm || 0), 0);
        const totalTime = mds.assignedStores.reduce((acc, s) => acc + (s.travelTimeMins || 0), 0);
        mds.avgDistanceKm = Math.round((totalDist / mds.assignedStores.length) * 10) / 10;
        mds.maxDistanceKm = Math.round(Math.max(...mds.assignedStores.map(s => s.distanceFromHomeKm || 0)) * 10) / 10;
        mds.avgTravelMins = Math.round(totalTime / mds.assignedStores.length);
      }

      const dailySchedule = [];
      const storesPerDay = config.storesPerDay;
      let localDaysCount = 0;
      let perdinDaysCount = 0;

      // Separate regular pool from DC pool
      const regularPool = mds.assignedStores.filter(s => !s.isDcDayStore);

      const mLat = mds.lat;
      const mLng = mds.lng;
      const cosLat = Math.cos((mLat * Math.PI) / 180);
      regularPool.forEach(s => {
        const dLat = s.lat - mLat;
        const dLng = (s.lng - mLng) * cosLat;
        s._dsqHome = dLat * dLat + dLng * dLng;
      });
      regularPool.sort((a, b) => a._dsqHome - b._dsqHome);

      // Days 1 to 21: Regular Stores
      for (let day = 1; day <= config.regularDays; day++) {
        const startIdx = (day - 1) * storesPerDay;
        let dayStores = regularPool.slice(startIdx, startIdx + storesPerDay);

        if (dayStores.length > 1) {
          dayStores = this.sortRouteChain(mds.lat, mds.lng, dayStores);
        }

        const avgDayDist = dayStores.length > 0 ? (dayStores.reduce((acc, s) => acc + (s.distanceFromHomeKm || 0), 0) / dayStores.length) : 0;
        const maxDayDist = dayStores.length > 0 ? Math.max(...dayStores.map(s => s.distanceFromHomeKm || 0)) : 0;
        const avgDayTimeMins = dayStores.length > 0 ? (dayStores.reduce((acc, s) => acc + (s.travelTimeMins || 0), 0) / dayStores.length) : 0;
        const primaryKab = dayStores.length > 0 && dayStores[0].kabKota ? dayStores[0].kabKota.replace(/^KABUPATEN\s+|^KOTA\s+/i, '') : '';

        const isPerdinDay = !mds.isVirtual && (avgDayDist >= 150 || maxDayDist >= 150 || avgDayTimeMins >= 240) && dayStores.length > 0;

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

      // Days 22 to 25: DC Visits
      for (let day = config.regularDays + 1; day <= config.regularDays + config.dcDays; day++) {
        const dcDayIdx = day - config.regularDays - 1;
        const dcDayData = (mds.assignedDcDays && mds.assignedDcDays[dcDayIdx]) || null;
        const dayStops = dcDayData ? dcDayData.stops : [];

        const primaryDc = dayStops.find(s => s.isDc) || dayStops[0];
        const dcName = primaryDc ? (primaryDc.storeName || 'Distribution Center') : 'DC Hub';
        const dcArea = primaryDc ? (primaryDc.kabKota || mds.kota) : mds.kota;

        const avgDayDist = dayStops.length > 0 ? (dayStops.reduce((acc, s) => acc + (s.distanceFromHomeKm || 0), 0) / dayStops.length) : 0;
        const maxDayDist = dayStops.length > 0 ? Math.max(...dayStops.map(s => s.distanceFromHomeKm || 0)) : 0;
        const isPerdinDay = !mds.isVirtual && (avgDayDist >= 150 || maxDayDist >= 150) && dayStops.length > 0;

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
          target: config.dcPerDay
        });
      }

      mds.localDays = localDaysCount;
      mds.nonPerdinDays = localDaysCount;
      mds.perdinDays = perdinDaysCount;
      mds.dcDays = config.dcDays;
      mds.estPerdinBudget = perdinDaysCount * 400000;
      mds.dailySchedule = dailySchedule;
    });

    // 7. Overall Summary Metrics
    const activeAssignments = mdsAssignments.filter(m => !m.isVirtual);
    const vacantAssignments = mdsAssignments.filter(m => m.isVirtual);

    const activeCoveredStores = activeAssignments.reduce((sum, m) => sum + m.assignedStores.length, 0);
    const vacantCoveredStores = Math.max(0, regularStores.length - activeCoveredStores);
    const totalCovered = regularStores.length;
    const totalPerdinDays = activeAssignments.reduce((sum, m) => sum + (m.perdinDays || 0), 0);
    const totalPerdinBudget = totalPerdinDays * 400000;

    const fixedCostPerNewHire = (window.SIMULATION_CONFIG?.FINANCIAL?.TOTAL_NEW_HIRE_FIXED_COST) || 5220000;
    const estNewHiresReplaced = Math.max(0, Math.round(totalPerdinDays / 12));
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

    // Total monthly visits = unique stores + DC hub visits (4 per MDS)
    const totalMonthlyVisits = activeCoveredStores + (activeAssignments.length * config.dcDays);

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
      totalPerdinDays: totalPerdinDays,
      totalPerdinBudget: totalPerdinBudget,
      fixedCostPerNewHire: fixedCostPerNewHire,
      estNewHiresReplaced: estNewHiresReplaced,
      estimatedSavings: estimatedSavings
    };

    // 8. Strict West-to-East Geographic Sorting (Ujung Barat Jawa ke Ujung Timur Jawa)
    // - Existing Active MDS sorted from West (Banten/Tangerang ~106.0) to East (Jember/Banyuwangi ~114.5)
    // - Proposed Vacant slots sorted from West to East
    mdsAssignments.sort((a, b) => {
      if (a.isVirtual !== b.isVirtual) {
        return a.isVirtual ? 1 : -1;
      }
      return (a.lng || 0) - (b.lng || 0);
    });

    // Re-index curated colors along the geographical west-to-east gradient
    mdsAssignments.forEach((m, idx) => {
      m.color = this.getMdsColor(idx);
    });

    console.log('[RouteEngine] Simulation Completed Successfully:', summary);

    return {
      assignments: mdsAssignments,
      summary: summary,
      config: config
    };
  },

  /**
   * High-Speed Nearest Neighbor Traveling Salesperson Chain
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
