/**
 * ==============================================================================
 * CIMORY RETAIL OPS - PLANOGRAM & DISPLAY GALLERY CONFIGURATION
 * ==============================================================================
 */

const CONFIG = {
  APP_TITLE: 'Cimory Retail Ops',
  APP_SUBTITLE: 'Display & Planogram Compliance Gallery',
  
  // Supabase Cloud REST API Config (Instant Sub-100ms Query)
  SUPABASE_URL: 'https://lzvxxcnubtcvdiwfnjmh.supabase.co/rest/v1',
  SUPABASE_KEY: 'sb_publishable_Yrqw13m5rQQKNF0XnWtlOg_JvZZ2_AE',
  USE_SUPABASE: true,

  // Dedicated Planogram Review Spreadsheet
  REVIEW_SHEET_ID: '1svQnu6-5fJUMEfBF9UCRFgg1pKBdBnRxcLesinDw6jI',
  REVIEW_SHEET_NAME: 'Penilaian_Display',

  // Central Backend API (for saving & reading reviews)
  // Can also read reviews via Google Visualization CSV export directly
  API_URL: 'https://script.google.com/macros/s/AKfycbzDkLr0LfbHSiIgBOVO40ktn8c7Doc8jvI7zTPv-EVsNzr9fci42TzP7JSXxXp6lzGV/exec',

  // Reviewers List
  REVIEWERS: [
    { id: 'MAS_IBNU', name: 'Mas Ibnu (SPV DK & LP)', defaultModules: ['DK', 'LP'] },
    { id: 'PAK_DWI', name: 'Pak Dwi (SPV LK)', defaultModules: ['LK'] },
    { id: 'BU_OCI', name: 'Ibu Oci (Manager)', defaultModules: ['DK', 'LK', 'LP'] },
    { id: 'ALL', name: 'Semua Reviewer', defaultModules: [] }
  ],

  // Available Modules
  MODULES: [
    { code: 'ALL', name: 'Semua Modul (DK, LK, LP)' },
    { code: 'DK', name: 'Semua DK (DK 1 - 6)' },
    { code: 'DK1', name: 'DK 1' },
    { code: 'DK2', name: 'DK 2' },
    { code: 'DK3', name: 'DK 3' },
    { code: 'DK4', name: 'DK 4' },
    { code: 'DK5', name: 'DK 5' },
    { code: 'DK6', name: 'DK 6' },
    { code: 'LK', name: 'Semua LK (LK 1 - 5)' },
    { code: 'LK1', name: 'LK 1' },
    { code: 'LK2', name: 'LK 2' },
    { code: 'LK3', name: 'LK 3' },
    { code: 'LK4', name: 'LK 4' },
    { code: 'LK5', name: 'LK 5' },
    { code: 'LP', name: 'Semua LP (LP 1 - 4)' },
    { code: 'LP1', name: 'LP 1' },
    { code: 'LP2', name: 'LP 2' },
    { code: 'LP3', name: 'LP 3' },
    { code: 'LP4', name: 'LP 4' },
  ],

  // Direct 15 Module Spreadsheet IDs (Direct High-Speed Parallel Fetch for Visits & Photos)
  MODUL_IDS: {
    "DK1": "1asDdjDm0kUfFmICLtkhJ5VBhmKUels2c-H8Cd22qYvk",
    "DK2": "14d0LUW73TveimrVC5QZ5Aq8fanWFTa-endNTq5UgxU0",
    "DK3": "1PyP2gDOltePqcadtcOzncjb8vYpqlYcUu31N_JYu_gQ",
    "DK4": "1jiN7bi-Uc104X5Ug2p2hYlI163h-ycQ8hEqHyt4zoKw",
    "DK5": "1QWf1cG5byneFDGmy_m2eUe_aUUUtztBc8ERgfGjjmb4",
    "DK6": "1VV6E_MuBUNgQMopvTezXDRlHpa6Z1fKfHOlew--cPBY",
    "LK1": "1LdoLka5rw1m8fuhOhYqvs6v0hgbY766sdlVj_JcMrb4",
    "LK2": "1LjRvlTow7wcLDJHipCw-H2mdn5Wh7YuwBf7Ab5kN1BM",
    "LK3": "1EuxP8f8D4Vya5kdN1_0QVCDP1dPvAkrMKErnRCO4jJM",
    "LK4": "1GRuXwLgO_zsuW6Ai49h9w1QTFxM_TQVxBs6xWKpqEhY",
    "LK5": "1GyTFOp8siIXfLpUmEv935hZ0976-fXqXgiwz5Juq92A",
    "LP1": "1356ZShL_ZQaO0pwI7msWcQmINpyKCxhizMzt8c5cKpo",
    "LP2": "1Dy6Zb6e9eWLOuLcWaUiKYWpIuv2mpz-leGJwiJu20Ss",
    "LP3": "1S__W_tKymV2xwqx_-vthpPt5jn5u7t3ePlgPqM1opMM",
    "LP4": "1kUWJIQxtSkjebZMualR2bIV6HyGxp-baDVz1s-7KspU"
  },

  // Key Accounts
  ACCOUNTS: [
    'ALL',
    'ALFAMART',
    'INDOMARET',
    'YOMART',
    'ALFAMIDI',
    'SUPERINDO',
    'HYPERMART',
    'LOTTE',
    'FARMERS',
    'HERO',
    'NAGA',
    'GRIYA',
    'BORMA',
    'LOKAL / LAINNYA'
  ],

  // Cache settings
  CACHE_EXPIRY_MS: 30 * 60 * 1000, // 30 minutes
  DEFAULT_TIMEOUT_MS: 12000
};
