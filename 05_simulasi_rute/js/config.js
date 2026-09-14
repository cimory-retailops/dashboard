/**
 * ==============================================================================
 * CIMORY RETAIL OPS - ROUTE & WORKLOAD SIMULATION CONFIGURATION
 * Workload: 25 Working Days (21 Store Days @ 20 stores/day, 4 DC Days @ 10 stores/day)
 * Max Distance & Travel Time Constraints
 * Perdin Criteria: Distance >= 150 KM or Travel Time >= 4 Hours (~240 Mins)
 * ==============================================================================
 */

const SIMULATION_CONFIG = {
  VERSION: '1.1.0',
  
  // Workload Matrix (Bu Oci Schema)
  WORKLOAD: {
    TOTAL_DAYS: 25,
    REGULAR_STORE_DAYS: 21,
    DC_DAYS: 4,
    STORES_PER_DAY: 20,       // 20 Toko/Hari untuk hari reguler
    DC_PER_DAY: 10,           // 10 Toko/DC untuk hari DC
    TARGET_STORES_MONTH: 420, // 21 * 20 = 420 Kunjungan Toko
    TARGET_DC_MONTH: 40,      // 4 * 10 = 40 Kunjungan DC
    TOTAL_TARGET_MONTH: 460
  },

  // Geo & Proximity Constraints
  PROXIMITY: {
    MAX_TRAVEL_TIME_MINS: 60, // Max 1 jam perjalanan dari rumah untuk rute non perdin (reguler)
    IDEAL_RADIUS_KM: 15,      // Radius ideal cluster non perdin (< 15 km)
    MAX_RADIUS_KM: 28,        // Batas maksimal toleransi cluster overflow (< 28 km)
    AVG_SPEED_KMH: 25         // Asumsi kecepatan rata-rata motor/lapangan (25 km/jam)
  },

  // Perjalanan Dinas (Perdin) Luar Kota Criteria
  PERDIN_POLICY: {
    MIN_DISTANCE_KM: 150,     // Jarak >= 150 KM dari domisili
    MIN_TRAVEL_HOURS: 4,      // Waktu tempuh >= 4 Jam (~240 Menit)
    DAILY_ALLOWANCE: 400000   // Rp 400.000 / Hari
  },

  // Regional Modules Mapping
  MODULES: [
    { code: 'DK', name: 'DK - DKI Jakarta & Sekitarnya', color: '#4f46e5' },
    { code: 'LK', name: 'LK - Luar Kota Jawa Barat / Banten', color: '#0284c7' },
    { code: 'LP', name: 'LP - Luar Pulau / Nasional', color: '#10b981' }
  ],

  // Cost Structure & Perdin Analysis (Slip Gaji & Perdin Benchmark)
  FINANCIAL: {
    PERDIN_DAILY_ALLOWANCE: 400000, // Rp 400.000 / hari (Makan 150k, Penginapan 200k, Bensin 50k)
    MEAL_ALLOWANCE: 150000,
    LODGING_ALLOWANCE: 200000,
    FUEL_ALLOWANCE: 50000,
    // Komponen Biaya Rekrutmen MDS Baru (Fixed Cost)
    NEW_HIRE_SALARY_BASE: 3200000, // Rata-rata UMR Pulau Jawa
    NEW_HIRE_OPS_ALLOWANCE: 1200000, // Operasional Bulanan
    NEW_HIRE_PULSA_ALLOWANCE: 100000, // Pulsa / Komunikasi
    NEW_HIRE_BPJS: 350000, // BPJS Ketenagakerjaan & Kesehatan
    NEW_HIRE_THR_PRORATE: 370000, // Porsi THR & Seragam bulanan
    TOTAL_NEW_HIRE_FIXED_COST: 5220000 // Total Biaya Tetap per Rekrut Baru / bulan (~Rp 5,22 Juta)
  },

  // Storage / CSV & Google Sheets paths
  STORE_CSV_PATH: '../01_web_absen/list_toko.csv',

  // Google Sheets Master Database & Live Sync Configuration
  DATA_SOURCE: {
    // Spreadsheet ID 16cokFfnQFIajmTd553TKy-CfkNFc1Gg7ElkhAer81QA - tab master_toko (GID: 387699773)
    GOOGLE_SHEET_CSV_URL: 'https://docs.google.com/spreadsheets/d/16cokFfnQFIajmTd553TKy-CfkNFc1Gg7ElkhAer81QA/export?format=csv&gid=387699773',
    GOOGLE_SHEET_GVIZ_URL: 'https://docs.google.com/spreadsheets/d/16cokFfnQFIajmTd553TKy-CfkNFc1Gg7ElkhAer81QA/gviz/tq?tqx=out:csv&sheet=master_toko',
    GOOGLE_SHEET_MDS_URL: 'https://docs.google.com/spreadsheets/d/1XqZgR70C1eqfkkKbM9jO2FhSi6-g3I9AskuhsSh7Mzs/export?format=csv&gid=107513943',
    FALLBACK_LOCAL_CSV: './data/master_toko_nasional.csv'
  }
};

if (typeof window !== 'undefined') {
  window.SIMULATION_CONFIG = SIMULATION_CONFIG;
}
