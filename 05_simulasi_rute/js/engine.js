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

    // Separate regular stores vs DC
    const regularStores = allStores.filter(s => !s.isDc);
    const dcStores = allStores.filter(s => s.isDc);

    // 1. Initialize Active Personnel Slots
    const mdsAssignments = (personnelList || []).map((p, idx) => {
      const rawId = p.id || `MDS${idx + 1}`;
      const uniqueId = `ACT_${rawId}_${p.account || 'ALL'}_${idx + 1}`;
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

    // 2. Proximity Match for Active MDS (Strict Max Radius <= 28 KM)
    const storeCandidates = [];

    regularStores.forEach(st => {
      mdsAssignments.forEach(mds => {
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

    // 3.5. Progressive Expansion for MDS with < 420 Stores (Guarantees EXACTLY 420 stores for 21 Full Working Days)
    activeMdsList.forEach(mds => {
      if (mds.assignedStores.length < config.targetStoresMonth && unassignedStores.size > 0) {
        const needed = config.targetStoresMonth - mds.assignedStores.length;
        const availableLeftovers = Array.from(unassignedStores).map(id => storesMap.get(id)).filter(Boolean);
        
        // Sort available leftovers by proximity to this MDS
        availableLeftovers.sort((a, b) => {
          const da = this.getDistanceKm(mds.lat, mds.lng, a.lat, a.lng);
          const db = this.getDistanceKm(mds.lat, mds.lng, b.lat, b.lng);
          return da - db;
        });

        const toAdd = availableLeftovers.slice(0, needed);
        toAdd.forEach(st => {
          const d = this.getDistanceKm(mds.lat, mds.lng, st.lat, st.lng);
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

    // 4. Handle remaining stores (Group all leftover gap stores into regional recruitment clusters)
    let leftoverStores = Array.from(unassignedStores).map(id => storesMap.get(id)).filter(Boolean);
    let virtualCounter = 1;

    if (leftoverStores.length > 0) {
      console.log(`[RouteEngine] Consolidating ${leftoverStores.length} gap / unassigned stores into regional recruitment clusters...`);

      const cityGroups = new Map();
      leftoverStores.forEach(st => {
        const cityKey = st.kabKota ? st.kabKota.trim().toUpperCase() : 'LAINNYA';
        if (!cityGroups.has(cityKey)) cityGroups.set(cityKey, []);
        cityGroups.get(cityKey).push(st);
      });

      const sortedCities = Array.from(cityGroups.entries()).sort((a, b) => b[1].length - a[1].length);

      sortedCities.forEach(([cityName, storesInCity]) => {
        let remainingInCity = [...storesInCity];

        while (remainingInCity.length >= 40) {
          const seed = remainingInCity[0];
          const cluster = [];
          const notInCluster = [];

          remainingInCity.sort((a, b) => {
            const da = this.getDistanceKm(seed.lat, seed.lng, a.lat, a.lng);
            const db = this.getDistanceKm(seed.lat, seed.lng, b.lat, b.lng);
            return da - db;
          });

          for (const st of remainingInCity) {
            const d = this.getDistanceKm(seed.lat, seed.lng, st.lat, st.lng);
            if (d <= 50 && cluster.length < config.targetStoresMonth) {
              cluster.push(st);
              unassignedStores.delete(st.id);
            } else {
              notInCluster.push(st);
            }
          }

          if (cluster.length >= 40) {
            const vCode = `REKRUT_${String(virtualCounter).padStart(2, '0')}`;
            const uniqueId = `VAC_${vCode}_${virtualCounter}`;
            const avgLat = cluster.reduce((sum, s) => sum + s.lat, 0) / cluster.length;
            const avgLng = cluster.reduce((sum, s) => sum + s.lng, 0) / cluster.length;
            const areaLabel = cityName.replace(/^KABUPATEN\s+|^KOTA\s+/i, '');

            const virtualMds = {
              id: uniqueId,
              displayId: vCode,
              nama: `[USULAN REKRUT] ${areaLabel} #${virtualCounter} (${cluster.length} Toko)`,
              jabatan: 'Merchandiser (Usulan Baru)',
              account: cluster[0]?.account || 'ALL',
              modul: 'VACANT',
              alamat: `Sentra Operasional ${areaLabel}`,
              kecamatan: cluster[0]?.kecamatan || areaLabel,
              kota: areaLabel,
              region: 'BUTUH MANPOWER',
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
          remainingInCity = notInCluster;
        }
      });
    }

    // 5. Localized DC Allocation (Single Dedicated DC Hub per day)
    mdsAssignments.forEach(mds => {
      // Find all real DCs sorted by distance to this MDS
      const nearbyDc = dcStores.map(dc => {
        const d = this.getDistanceKm(mds.lat, mds.lng, dc.lat, dc.lng);
        return {
          ...dc,
          distanceFromHomeKm: Math.round(d * 10) / 10,
          travelTimeMins: this.getEstimatedTravelTimeMins(d),
          isPerdin: false,
          tipeKunjungan: 'KUNJUNGAN DC',
          perdinBadge: '🏭 DC'
        };
      }).sort((a, b) => a.distanceFromHomeKm - b.distanceFromHomeKm);

      const primaryDc = nearbyDc[0] || {
        id: `DC_${mds.id}`,
        storeCode: 'DC-HUB',
        storeName: `DC Hub ${mds.kota}`,
        kabKota: mds.kota,
        lat: mds.lat,
        lng: mds.lng,
        distanceFromHomeKm: 0,
        travelTimeMins: 0,
        isPerdin: false,
        tipeKunjungan: 'KUNJUNGAN DC',
        perdinBadge: '🏭 DC'
      };

      const assigned = [];

      // For each of the 4 DC days, pick 1 dedicated DC Hub and allocate all 10 visits at that same DC
      for (let dDay = 0; dDay < config.dcDays; dDay++) {
        // Use primary DC (or rotate with secondary DC if within 50 km)
        const chosenDc = (nearbyDc.length > 1 && nearbyDc[1].distanceFromHomeKm <= 50) ? nearbyDc[dDay % 2] : primaryDc;
        for (let visit = 0; visit < config.dcPerDay; visit++) {
          assigned.push({
            ...chosenDc,
            id: `${chosenDc.id}_D${dDay + 1}_V${visit + 1}`,
            dcVisitIndex: visit + 1
          });
        }
      }
      mds.assignedDc = assigned;
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

      // Days 22 to 25: DC Visits (Each day is 1 dedicated DC Hub)
      for (let day = config.regularDays + 1; day <= config.regularDays + config.dcDays; day++) {
        const dcDayIdx = day - config.regularDays - 1;
        const startIdx = dcDayIdx * dcPerDay;
        const dayDc = mds.assignedDc.slice(startIdx, startIdx + dcPerDay);
        const dcName = dayDc.length > 0 ? (dayDc[0].storeName || 'Distribution Center') : 'DC Hub';
        const dcArea = dayDc.length > 0 ? (dayDc[0].kabKota || mds.kota) : mds.kota;
        dailySchedule.push({
          dayNumber: day,
          type: 'DC',
          subType: 'DC_HUB',
          isPerdin: false,
          perdinAllowance: 0,
          primaryArea: dcArea,
          title: `Hari ke-${day} (Kunjungan DC: ${dcName})`,
          badge: '🏭 DC',
          badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          items: dayDc,
          stores: dayDc,
          count: dayDc.length,
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
   * Nearest Neighbor Traveling Salesperson Chain
   */
  sortRouteChain(startLat, startLng, stores) {
    if (!stores || stores.length <= 1) return stores || [];
    const unvisited = [...stores];
    const sorted = [];

    let currentLat = startLat;
    let currentLng = startLng;

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const dist = this.getDistanceKm(currentLat, currentLng, unvisited[i].lat, unvisited[i].lng);
        if (dist < minDistance) {
          minDistance = dist;
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
