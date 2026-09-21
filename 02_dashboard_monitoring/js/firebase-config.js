/**
 * ==============================================================================
 * CIMORY MDS RETAIL OPS - FIREBASE AUTH & RBAC CONFIGURATION
 * ==============================================================================
 * Mengelola Otentikasi Pengguna & Matriks Hak Akses (RBAC)
 * Mendukung Firebase Auth + Cloud Firestore, dengan Automatic Mock/Offline Fallback.
 */

// 1. CONFIGURATION: Kredensial Firebase Project Resmi
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAqgUmhDRwmtPmR9MhWhXqHwH581UoCA7k",
  authDomain: "dashboard-portal-cimory.firebaseapp.com",
  projectId: "dashboard-portal-cimory",
  storageBucket: "dashboard-portal-cimory.firebasestorage.app",
  messagingSenderId: "100882358004",
  appId: "1:100882358004:web:545a8d36d96cbf408f48a1",
  measurementId: "G-DE5EJ0KYHB"
};

// 2. DAFTAR SUPER ADMIN (Dikelola dinamis dari akun yang terdaftar & disetujui di Portal)
window.SUPER_ADMIN_IDENTIFIERS = [];

// 3. DAFTAR HALAMAN / FITUR YANG DIATUR HAK AKSESNYA
window.RBAC_PAGES = [
  { id: 'kunjungan', label: 'Kunjungan Lapangan', icon: 'map-pin', desc: 'Monitoring kunjungan, stay, GPS, & detail outlet' },
  { id: 'absensi', label: 'Presensi & Absensi', icon: 'clock', desc: 'Jam masuk/pulang, selfie, & status kerja tim MDS' },
  { id: 'jadwal', label: 'Target Jadwal Rute', icon: 'calendar', desc: 'Rute mingguan, matriks tanggal 1-31, & detail kunjungan toko' },
  { id: 'tokonasional', label: 'Database Toko Nasional', icon: 'store', desc: 'Pencarian & eksplorasi database outlet nasional Cimory' },
  { id: 'laporan', label: 'Pusat Laporan WA', icon: 'share-2', desc: 'Broadcast WhatsApp, infografis KPI, & radar anomali' },
  { id: 'evaluasi', label: 'Evaluasi Kinerja SPV', icon: 'award', desc: 'Scorecard, target visit, kepatuhan rute, & ranking tim' },
  { id: 'galeri', label: 'Galeri Foto Pajangan', icon: 'image', desc: 'Audit foto Before/After & kepatuhan planogram per account' },
  { id: 'simulasi', label: 'Simulasi & Editor Rute', icon: 'map', desc: 'Alokasi rute 25 hari kerja, editor MT Manager, & perizinan routing' },
  { id: 'audit_sku', label: 'Audit Produk & Harga', icon: 'package', desc: 'Komparasi harga antar account, stok OSA/SOH, & monitoring expiry' }
];

// 4. PRESET DEFAULT BERDASARKAN ROLE
window.RBAC_ROLE_PRESETS = {
  SUPERADMIN: {
    label: 'Super Admin (Bu Oci & Anda)',
    color: 'indigo',
    permissions: { kunjungan: true, absensi: true, jadwal: true, tokonasional: true, laporan: true, evaluasi: true, galeri: true, simulasi: true, audit_sku: true }
  },
  MANAGER: {
    label: 'Manager (Operasional / Regional)',
    color: 'blue',
    permissions: { kunjungan: true, absensi: true, jadwal: true, tokonasional: true, laporan: true, evaluasi: true, galeri: true, simulasi: true, audit_sku: true }
  },
  SPV: {
    label: 'Supervisor (SPV Wilayah)',
    color: 'sky',
    permissions: { kunjungan: true, absensi: true, jadwal: true, tokonasional: true, laporan: true, evaluasi: true, galeri: true, simulasi: true, audit_sku: true }
  },
  MDS: {
    label: 'Field User (MDS Lapangan)',
    color: 'emerald',
    permissions: { kunjungan: true, absensi: true, jadwal: false, tokonasional: false, laporan: false, evaluasi: false, galeri: false, simulasi: false, audit_sku: false }
  },
  CUSTOM: {
    label: 'Custom Access',
    color: 'amber',
    permissions: { kunjungan: false, absensi: false, jadwal: false, tokonasional: false, laporan: false, evaluasi: false, galeri: false, simulasi: false, audit_sku: false }
  }
};

window.RBAC_SUBTABS_DEF = {
  laporan: [
    { id: 'rute', label: '1. Realisasi Rute', desc: 'Target toko vs realisasi harian' },
    { id: 'jadwal', label: '2. Input Jadwal & Coverage', desc: 'Kepatuhan plotting toko' },
    { id: 'absen', label: '3. Rekap Absensi Tim', desc: 'Disiplin jam kerja & GPS' },
    { id: 'anomali', label: '4. Audit Anomali Kasus', desc: 'Radar anomali & investigasi' }
  ],
  evaluasi: [
    { id: 'TOKO', label: 'Hari Toko (Regular)', desc: 'Evaluasi kunjungan outlet' },
    { id: 'DC', label: 'Hari DC (Warehouse)', desc: 'Evaluasi tugas DC' }
  ],
  galeri: [
    { id: 'katalog', label: 'Katalog & Foto Display', desc: 'Audit foto pajangan Before/After & Planogram' },
    { id: 'filter', label: 'Filter Akun & Wilayah', desc: 'Pencarian foto per account & modul' },
    { id: 'download', label: 'Unduh HD & Export', desc: 'Download batch foto pajangan resolusi tinggi' }
  ],
  simulasi: [
    { id: 'optimasi', label: 'Engine Auto-Optimasi Rute', desc: 'Kalkulasi alokasi 25 hari rute toko MDS' },
    { id: 'editor', label: 'Editor Rute Manual (MT Manager)', desc: 'Pemindahan toko, drag-drop rute, & validasi' },
    { id: 'export', label: 'Export Excel Master Rute', desc: 'Unduh file Excel jadwal kunjungan format operasional' }
  ]
};

window.getDefaultSubTabsForRole = function(role) {
  const isSuper = role === 'SUPERADMIN' || role === 'MANAGER';
  const isSpv = role === 'SPV';
  return {
    laporan: {
      rute: true,
      jadwal: true,
      absen: true,
      anomali: isSuper || isSpv
    },
    evaluasi: {
      TOKO: true,
      DC: true
    },
    galeri: {
      katalog: true,
      filter: true,
      download: isSuper || isSpv
    },
    simulasi: {
      optimasi: isSuper || isSpv,
      editor: isSuper || isSpv,
      export: true
    },
    audit_sku: {
      komparasi: true,
      stok_expiry: true,
      export: isSuper || isSpv
    }
  };
};

/**
 * SERVICE: Firebase Authentication & RBAC Service
 */
class FirebaseRbacService {
  constructor() {
    this.isInitialized = false;
    this.isUsingMock = false;
    this.auth = null;
    this.db = null;
    this.currentUser = null;
    this.authSubscribers = [];
  }

  /**
   * Inisialisasi Firebase SDK atau fallback ke Mock
   */
  async init() {
    const cfg = window.FIREBASE_CONFIG;
    const isRealConfig = cfg && cfg.apiKey && !cfg.apiKey.includes('YOUR_');

    if (isRealConfig && typeof firebase !== 'undefined' && firebase.initializeApp) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(cfg);
        }
        this.auth = firebase.auth();
        if (typeof firebase.firestore === 'function') {
          this.db = firebase.firestore();
          try {
            this.db.settings({
              experimentalForceLongPolling: true,
              merge: true
            });
          } catch (settingErr) {}
        }
        this.isUsingMock = false;

        // Muat sesi portal aktif terlebih dahulu
        this._loadSessionFromPortalStorage();

        // Listen auth state
        this.auth.onAuthStateChanged((user) => {
          if (user) {
            this.currentUser = this._formatFirebaseUser(user);
          } else {
            this._loadSessionFromPortalStorage();
          }
          this._notifyAuthSubscribers(this.currentUser);
        });

        this.isInitialized = true;
        console.log('✅ Firebase SDK Real Mode initialized successfully. Active user:', this.currentUser ? this.currentUser.displayName : 'None');
        return;
      } catch (err) {
        console.warn('⚠️ Firebase real initialization failed, falling back to mock mode:', err);
      }
    }

    // Fallback: Mock Auth Mode
    this.isUsingMock = true;
    this.isInitialized = true;
    
    // Periksa apakah ada sesi login aktif dari Landing Portal utama (index.html)
    if (!this._loadSessionFromPortalStorage()) {
      const savedMockUser = localStorage.getItem('cimory_mock_user');
      if (savedMockUser) {
        try {
          this.currentUser = JSON.parse(savedMockUser);
        } catch (e) {
          this.currentUser = null;
        }
      } else {
        this.currentUser = {
          uid: 'guest_user',
          email: 'tamu@cimory.com',
          displayName: 'Guest User',
          role: 'MDS',
          isSuperAdmin: false,
          photoURL: null
        };
        localStorage.setItem('cimory_mock_user', JSON.stringify(this.currentUser));
      }
    }

    setTimeout(() => {
      this._notifyAuthSubscribers(this.currentUser);
    }, 100);

    console.log('ℹ️ Firebase RBAC initialized. User:', this.currentUser ? this.currentUser.displayName : 'None');
  }

  _loadSessionFromPortalStorage() {
    const portalSession = localStorage.getItem('cimory_portal_active_session');
    if (portalSession) {
      try {
        const ps = JSON.parse(portalSession);
        const userRole = (ps.role || (ps.isSuperAdmin ? 'SUPERADMIN' : 'MDS')).toUpperCase();
        const preset = window.RBAC_ROLE_PRESETS[userRole] || window.RBAC_ROLE_PRESETS.MDS;

        // Ambil data terbaru dari matrix jika tersedia (misal linkedCrew atau permission custom)
        let matrixUser = null;
        try {
          const rawMatrix = localStorage.getItem('cimory_rbac_matrix');
          if (rawMatrix && ps.email) {
            const m = JSON.parse(rawMatrix);
            if (m && m[ps.email.toLowerCase()]) {
              matrixUser = m[ps.email.toLowerCase()];
            }
          }
        } catch(err) {}

        const finalRole = matrixUser && matrixUser.role ? matrixUser.role : userRole;
        const linkedCrew = (matrixUser && matrixUser.linkedCrew) || ps.linkedCrew || '';
        const managedMds = (matrixUser && Array.isArray(matrixUser.managedMds)) ? matrixUser.managedMds : (ps.managedMds || []);
        const userModul = (matrixUser && matrixUser.modul) || ps.moduleOrArea || 'ALL';

        // Untuk SUPERADMIN, MANAGER, dan SPV: selalu gunakan full-access preset
        // Jangan override dengan matrix yang mungkin memiliki permissions salah
        // Hanya MDS yang menggunakan custom permissions dari matrix
        let userPerms;
        const isPrivilegedRole = finalRole === 'SUPERADMIN' || finalRole === 'MANAGER' || finalRole === 'SPV';
        if (isPrivilegedRole) {
          // Privileged role selalu mendapat akses penuh berdasarkan preset
          userPerms = { ...(window.RBAC_ROLE_PRESETS[finalRole] || preset).permissions };
        } else {
          // MDS: cek matrix custom permissions, fallback ke preset
          userPerms = (matrixUser && matrixUser.permissions) || { ...preset.permissions };
        }

        if (!userPerms.subTabs) {
          userPerms.subTabs = window.getDefaultSubTabsForRole(finalRole);
        }

        this.currentUser = {
          uid: ps.id || 'usr_portal',
          email: ps.email || 'user@cimory.com',
          displayName: ps.name || 'User Portal',
          role: finalRole,
          isSuperAdmin: !!ps.isSuperAdmin || finalRole === 'SUPERADMIN' || this.isSuperAdmin(ps.email) || this.isSuperAdmin(ps.name),
          modul: userModul,
          linkedCrew: linkedCrew,
          managedMds: managedMds,
          permissions: userPerms,
          photoURL: null
        };
        localStorage.setItem('cimory_mock_user', JSON.stringify(this.currentUser));
        return true;
      } catch (e) {
        console.error('Error parsing portal session:', e);
      }
    }
    return false;
  }

  /**
   * Subscribe ke perubahan state login
   */
  onAuthStateChanged(callback) {
    this.authSubscribers.push(callback);
    if (this.isInitialized) {
      callback(this.currentUser);
    }
  }

  _notifyAuthSubscribers(user) {
    this.authSubscribers.forEach(cb => {
      try { cb(user); } catch (e) { console.error(e); }
    });
  }

  /**
   * Cek apakah identifier adalah Super Admin (dinamis dari data akun / sesi)
   */
  isSuperAdmin(emailOrName) {
    if (this.currentUser && (this.currentUser.role === 'SUPERADMIN' || this.currentUser.isSuperAdmin)) {
      return true;
    }
    if (!emailOrName) return false;
    const clean = String(emailOrName).toLowerCase().trim();
    try {
      const rawSession = localStorage.getItem('cimory_portal_active_session');
      if (rawSession) {
        const su = JSON.parse(rawSession);
        if (su && (su.email || '').toLowerCase() === clean && (su.role === 'SUPERADMIN' || su.isSuperAdmin)) return true;
      }
      const rawUsers = localStorage.getItem('cimory_portal_users');
      if (rawUsers) {
        const list = JSON.parse(rawUsers);
        if (Array.isArray(list)) {
          const match = list.find(u => u && (u.email || '').toLowerCase() === clean);
          if (match && (match.role === 'SUPERADMIN' || match.isSuperAdmin)) return true;
        }
      }
    } catch(e) {}
    return false;
  }

  /**
   * Login User
   */
  async login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    
    if (!this.isUsingMock && this.auth) {
      try {
        const cred = await this.auth.signInWithEmailAndPassword(cleanEmail, password);
        this.currentUser = this._formatFirebaseUser(cred.user);
        this._notifyAuthSubscribers(this.currentUser);
        return { success: true, user: this.currentUser };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    // Mock Login Logic
    if (!cleanEmail) {
      return { success: false, error: 'Silakan masukkan email atau nama user.' };
    }

    const isSuper = this.isSuperAdmin(cleanEmail);
    let displayName = cleanEmail;
    let role = 'MDS';

    if (isSuper) {
      role = 'SUPERADMIN';
      displayName = cleanEmail.includes('oci') ? 'Ibu Oci (Manager)' : 'Yohandi Pratama (Super Admin)';
    } else {
      displayName = cleanEmail.split('@')[0].toUpperCase().replace(/\./g, ' ');
    }

    this.currentUser = {
      uid: 'user_' + btoa(cleanEmail).substring(0, 12),
      email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@cimory.com`,
      displayName: displayName,
      role: role,
      isSuperAdmin: isSuper,
      photoURL: null
    };

    localStorage.setItem('cimory_mock_user', JSON.stringify(this.currentUser));
    this._notifyAuthSubscribers(this.currentUser);
    return { success: true, user: this.currentUser };
  }

  /**
   * Quick Login Simulation (Dinonaktifkan demi keamanan)
   */
  async quickLogin(type) {
    return { success: false, error: 'Quick login dinonaktifkan demi keamanan.' };
  }

  /**
   * Logout User
   */
  async logout() {
    if (!this.isUsingMock && this.auth) {
      try {
        await this.auth.signOut();
      } catch (e) {}
    }
    this.currentUser = null;
    localStorage.removeItem('cimory_mock_user');
    localStorage.removeItem('cimory_portal_active_session');
    this._notifyAuthSubscribers(null);
    return { success: true };
  }

  _formatFirebaseUser(user) {
    if (!user) return null;
    const isSuper = this.isSuperAdmin(user.email);
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      role: isSuper ? 'SUPERADMIN' : 'USER',
      isSuperAdmin: isSuper,
      photoURL: user.photoURL
    };
  }

  /**
   * LOAD MATRIKS HAK AKSES
   * Mengambil data hak akses semua user dari 1 koleksi terpadu: 'portal_users' di Firestore
   */
  async loadPermissionsMatrix(seedUsersList = []) {
    let matrix = {};

    // 1. Baca langsung dari 1 koleksi terpadu 'portal_users' jika online
    if (!this.isUsingMock && this.db) {
      try {
        const snap = await this.db.collection('portal_users').get();
        if (!snap.empty) {
          const portalList = [];
          snap.forEach(doc => {
            const d = doc.data();
            if (d) {
              const emailKey = (d.email || doc.id).toLowerCase();
              const role = (d.role || 'MDS').toUpperCase();
              const status = (d.status || 'APPROVED').toUpperCase();
              const preset = window.RBAC_ROLE_PRESETS && window.RBAC_ROLE_PRESETS[role]
                ? window.RBAC_ROLE_PRESETS[role].permissions
                : { kunjungan: true, absensi: true, jadwal: false, tokonasional: false, laporan: false, evaluasi: false };

              let userPerms = d.permissions && typeof d.permissions === 'object' && Object.keys(d.permissions).length > 0
                ? { ...d.permissions }
                : { ...preset };

              if (!userPerms.subTabs) {
                userPerms.subTabs = window.getDefaultSubTabsForRole ? window.getDefaultSubTabsForRole(role) : { laporan: { rute: true, jadwal: true, absen: true, anomali: false }, evaluasi: { TOKO: true, DC: true } };
              }

              matrix[emailKey] = {
                id: doc.id,
                name: d.name || emailKey,
                email: d.email || emailKey,
                modul: d.moduleOrArea || d.modul || 'ALL',
                jabatan: d.jabatan || (role === 'SUPERADMIN' ? 'Super Administrator' : (role === 'SPV' ? 'Supervisor' : 'Merchandiser')),
                role: role,
                status: status,
                linkedCrew: d.linkedCrew || '',
                managedMds: Array.isArray(d.managedMds) ? d.managedMds : [],
                permissions: userPerms,
                updatedAt: d.updatedAt || d.approvedAt || new Date().toISOString(),
                updatedBy: d.updatedBy || d.approvedBy || 'System'
              };

              portalList.push({ id: doc.id, ...d, status: status, permissions: userPerms });
            }
          });

          if (portalList.length > 0) {
            localStorage.setItem('cimory_portal_users', JSON.stringify(portalList));
          }
        }
      } catch (err) {
        console.warn('Gagal membaca Firestore SDK portal_users, menutup channel & mencoba REST fallback:', err);
        try {
          if (this.db && typeof this.db.terminate === 'function') {
            this.db.terminate();
          }
        } catch (termErr) {}
        this.db = null;

        // Direct REST fallback tanpa WebChannel streaming
        try {
          const resp = await fetch('https://firestore.googleapis.com/v1/projects/dashboard-portal-cimory/databases/(default)/documents/portal_users');
          if (resp.ok) {
            const data = await resp.json();
            if (data && data.documents) {
              const portalList = [];
              const parseField = (val) => {
                if (!val) return null;
                if (val.stringValue !== undefined) return val.stringValue;
                if (val.booleanValue !== undefined) return val.booleanValue;
                if (val.integerValue !== undefined) return parseInt(val.integerValue, 10);
                if (val.timestampValue !== undefined) return val.timestampValue;
                if (val.mapValue !== undefined) {
                  const res = {};
                  for (const k in val.mapValue.fields || {}) { res[k] = parseField(val.mapValue.fields[k]); }
                  return res;
                }
                if (val.arrayValue !== undefined) {
                  return (val.arrayValue.values || []).map(v => parseField(v));
                }
                return null;
              };

              data.documents.forEach(docItem => {
                const fields = docItem.fields || {};
                const d = {};
                for (const k in fields) { d[k] = parseField(fields[k]); }
                const docId = docItem.name.split('/').pop();
                const emailKey = (d.email || docId).toLowerCase();
                const role = (d.role || 'MDS').toUpperCase();
                const status = (d.status || 'APPROVED').toUpperCase();
                const preset = window.RBAC_ROLE_PRESETS && window.RBAC_ROLE_PRESETS[role]
                  ? window.RBAC_ROLE_PRESETS[role].permissions
                  : { kunjungan: true, absensi: true, jadwal: false, tokonasional: false, laporan: false, evaluasi: false };

                let userPerms = d.permissions && typeof d.permissions === 'object' && Object.keys(d.permissions).length > 0
                  ? { ...d.permissions }
                  : { ...preset };

                if (!userPerms.subTabs) {
                  userPerms.subTabs = window.getDefaultSubTabsForRole ? window.getDefaultSubTabsForRole(role) : { laporan: { rute: true, jadwal: true, absen: true, anomali: false }, evaluasi: { TOKO: true, DC: true } };
                }

                matrix[emailKey] = {
                  id: docId,
                  name: d.name || emailKey,
                  email: d.email || emailKey,
                  modul: d.moduleOrArea || d.modul || 'ALL',
                  jabatan: d.jabatan || (role === 'SUPERADMIN' ? 'Super Administrator' : (role === 'SPV' ? 'Supervisor' : 'Merchandiser')),
                  role: role,
                  status: status,
                  linkedCrew: d.linkedCrew || '',
                  managedMds: Array.isArray(d.managedMds) ? d.managedMds : [],
                  permissions: userPerms,
                  updatedAt: d.updatedAt || d.approvedAt || new Date().toISOString(),
                  updatedBy: d.updatedBy || d.approvedBy || 'System'
                };
                portalList.push({ id: docId, ...d, status: status, permissions: userPerms });
              });

              if (portalList.length > 0) {
                localStorage.setItem('cimory_portal_users', JSON.stringify(portalList));
              }
            }
          }
        } catch (restErr) {
          console.warn('REST fallback juga gagal, beralih ke cache lokal:', restErr);
        }
      }
    }

    // 2. Fallback baca dari LocalStorage cache jika offline
    if (Object.keys(matrix).length === 0) {
      const cached = localStorage.getItem('cimory_rbac_matrix');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') matrix = parsed;
        } catch (e) {
          matrix = {};
        }
      }
    }

    // 3. Bersihkan dummy lama
    const dummyEmails = ['admin@cimory.com', 'riswandi@cimory.com', 'ghozali@cimory.com', 'dimas@cimory.com'];
    Object.keys(matrix).forEach(key => {
      const u = matrix[key];
      const isAutoSeedDummy = !u ||
        dummyEmails.includes(key.toLowerCase()) ||
        u.updatedBy === 'System Auto-Seed' ||
        u.updatedBy === 'System Rule' ||
        (u.id && String(u.id).startsWith('USER_'));

      if (isAutoSeedDummy) delete matrix[key];
    });

    // 4. Sinkronkan dengan portal storage
    await this._syncWithPortalApprovedUsers(matrix);

    // 5. Pastikan Super Admin selalu ada di matriks
    this._ensureSuperAdminsInMatrix(matrix);

    // 6. Validasi integritas
    Object.keys(matrix).forEach(key => {
      const u = matrix[key];
      if (u && typeof u === 'object') {
        if (!u.role) u.role = 'MDS';
        if (!u.permissions) {
          const preset = window.RBAC_ROLE_PRESETS && window.RBAC_ROLE_PRESETS[u.role]
            ? window.RBAC_ROLE_PRESETS[u.role].permissions
            : { kunjungan: true, absensi: true, jadwal: false, tokonasional: false, laporan: false, evaluasi: false };
          u.permissions = { ...preset };
        }
        if (!u.permissions.subTabs) {
          u.permissions.subTabs = window.getDefaultSubTabsForRole(u.role);
        }
      } else {
        delete matrix[key];
      }
    });

    localStorage.setItem('cimory_rbac_matrix', JSON.stringify(matrix));
    return matrix;
  }

  async _syncWithPortalApprovedUsers(matrix) {
    try {
      const raw = localStorage.getItem('cimory_portal_users');
      if (raw) {
        const portalUsers = JSON.parse(raw);
        if (Array.isArray(portalUsers)) {
          portalUsers.forEach(pu => {
            if (!pu || !pu.email) return;
            const key = pu.email.toLowerCase();
            if (pu.status === 'APPROVED' || pu.role === 'SUPERADMIN' || pu.isSuperAdmin) {
              if (!matrix[key]) {
                const role = pu.role || 'MDS';
                const preset = window.RBAC_ROLE_PRESETS && window.RBAC_ROLE_PRESETS[role]
                  ? window.RBAC_ROLE_PRESETS[role].permissions
                  : { kunjungan: true, absensi: true, jadwal: false, tokonasional: false, laporan: false, evaluasi: false };

                matrix[key] = {
                  id: pu.id || `PORTAL_${key.replace(/[^a-zA-Z0-9]/g, '_')}`,
                  name: pu.name || key,
                  email: pu.email,
                  modul: pu.moduleOrArea || 'ALL',
                  jabatan: pu.jabatan || (role === 'SUPERADMIN' ? 'Super Administrator' : (role === 'SPV' ? 'Supervisor' : 'Merchandiser')),
                  role: role,
                  linkedCrew: pu.linkedCrew || '',
                  managedMds: Array.isArray(pu.managedMds) ? pu.managedMds : [],
                  permissions: {
                    ...preset,
                    subTabs: window.getDefaultSubTabsForRole(role)
                  },
                  updatedAt: pu.approvedAt || new Date().toISOString(),
                  updatedBy: pu.approvedBy || 'Portal Registration'
                };
              } else {
                if (pu.linkedCrew && !matrix[key].linkedCrew) matrix[key].linkedCrew = pu.linkedCrew;
                if (!matrix[key].permissions) matrix[key].permissions = {};
                if (!matrix[key].permissions.subTabs) {
                  matrix[key].permissions.subTabs = window.getDefaultSubTabsForRole(matrix[key].role || 'MDS');
                }
              }
            }
          });
        }
      }
    } catch (e) {
      console.warn('Gagal sinkronisasi dari cimory_portal_users:', e);
    }
  }

  /**
   * SIMPAN MATRIKS HAK AKSES LANGSUNG KE 1 KOLEKSI: portal_users
   */
  async savePermissions(matrix) {
    // Simpan ke LocalStorage langsung (Fast feedback)
    localStorage.setItem('cimory_rbac_matrix', JSON.stringify(matrix));

    // Sinkronkan juga ke cimory_portal_users lokal
    try {
      const rawUsers = localStorage.getItem('cimory_portal_users');
      if (rawUsers) {
        const portalUsers = JSON.parse(rawUsers);
        if (Array.isArray(portalUsers)) {
          portalUsers.forEach(pu => {
            if (!pu || !pu.email) return;
            const key = pu.email.toLowerCase();
            if (matrix[key]) {
              const m = matrix[key];
              pu.role = m.role || pu.role;
              pu.moduleOrArea = m.modul || pu.moduleOrArea;
              pu.linkedCrew = m.linkedCrew !== undefined ? m.linkedCrew : (pu.linkedCrew || '');
              pu.managedMds = Array.isArray(m.managedMds) ? [...m.managedMds] : (pu.managedMds || []);
              pu.permissions = m.permissions ? { ...m.permissions } : (pu.permissions || {});
            }
          });
          localStorage.setItem('cimory_portal_users', JSON.stringify(portalUsers));
        }
      }

      // Sinkronkan ke active session jika akun aktif ada di matriks
      const rawSession = localStorage.getItem('cimory_portal_active_session');
      if (rawSession) {
        const ps = JSON.parse(rawSession);
        if (ps && ps.email && matrix[ps.email.toLowerCase()]) {
          const m = matrix[ps.email.toLowerCase()];
          ps.linkedCrew = m.linkedCrew || '';
          ps.role = m.role || ps.role;
          ps.moduleOrArea = m.modul || ps.moduleOrArea;
          ps.permissions = m.permissions ? { ...m.permissions } : ps.permissions;
          if (Array.isArray(m.managedMds)) ps.managedMds = [...m.managedMds];
          localStorage.setItem('cimory_portal_active_session', JSON.stringify(ps));
        }
      }
    } catch(e) {
      console.warn('Gagal sinkronkan rbac matrix ke portal storage:', e);
    }

    // Simpan langsung ke 1 dokumen per user di koleksi portal_users Firestore
    if (!this.isUsingMock && this.db) {
      try {
        const batch = this.db.batch();
        const col = this.db.collection('portal_users');

        // Ambil semua portal_users untuk matching doc ID
        const snap = await col.get();
        const docMapByEmail = new Map();
        snap.forEach(doc => {
          const d = doc.data();
          if (d && d.email) {
            docMapByEmail.set(d.email.toLowerCase(), doc.id);
          }
        });

        for (const [key, data] of Object.entries(matrix)) {
          const emailKey = (data.email || key).toLowerCase();
          const docId = data.id || docMapByEmail.get(emailKey) || emailKey;
          const docRef = col.doc(docId);

          batch.set(docRef, {
            role: data.role || 'MDS',
            status: data.status || 'APPROVED',
            moduleOrArea: data.modul || 'ALL',
            linkedCrew: data.linkedCrew || '',
            managedMds: Array.isArray(data.managedMds) ? data.managedMds : [],
            permissions: data.permissions || {},
            updatedAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString(),
            updatedBy: this.currentUser ? this.currentUser.displayName : 'Super Admin'
          }, { merge: true });
        }
        await batch.commit();
        console.log('✅ 1 Koleksi Terpadu: Hak akses RBAC berhasil disinkronkan ke portal_users Firestore.');
      } catch (err) {
        console.error('❌ Gagal simpan ke portal_users Firestore:', err);
        throw err;
      }
    }

    return true;
  }

  /**
   * APPROVE SINGLE USER LANGSUNG DI FIRESTORE
   */
  async approveUser(userId, role = 'MDS', permissions = null, linkedCrew = '') {
    if (!this.isUsingMock && this.db) {
      try {
        const col = this.db.collection('portal_users');
        const docRef = col.doc(userId);
        const preset = window.RBAC_ROLE_PRESETS && window.RBAC_ROLE_PRESETS[role]
          ? window.RBAC_ROLE_PRESETS[role].permissions
          : { kunjungan: true, absensi: true, jadwal: false, tokonasional: false, laporan: false, evaluasi: false };
        const finalPerms = permissions || { ...preset };

        await docRef.set({
          status: 'APPROVED',
          role: role,
          permissions: finalPerms,
          linkedCrew: linkedCrew,
          approvedAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString(),
          approvedBy: this.currentUser ? (this.currentUser.displayName || this.currentUser.name || this.currentUser.email) : 'Super Admin'
        }, { merge: true });
        return true;
      } catch (err) {
        console.error('Gagal approve user:', err);
        throw err;
      }
    }
    return true;
  }

  /**
   * REJECT USER DI FIRESTORE
   */
  async rejectUser(userId) {
    if (!this.isUsingMock && this.db) {
      try {
        const col = this.db.collection('portal_users');
        const docRef = col.doc(userId);
        await docRef.set({
          status: 'REJECTED',
          rejectedAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString(),
          rejectedBy: this.currentUser ? (this.currentUser.displayName || this.currentUser.name || this.currentUser.email) : 'Super Admin'
        }, { merge: true });
        return true;
      } catch (err) {
        console.error('Gagal reject user:', err);
        throw err;
      }
    }
    return true;
  }

  /**
   * SEEDING DARI DATA MASTER USER
   */
  _seedInitialMatrix(masterUserList) {
    const matrix = {};

    masterUserList.forEach((u, idx) => {
      const name = (u.NAMA || u.nama || u.Nama || `User ${idx + 1}`).trim();
      const email = (u.EMAIL || u.email || `${name.toLowerCase().replace(/\s+/g, '.')}@cimory.com`).trim();
      const modul = (u.MODUL || u.modul || 'ALL').trim();
      const jabatan = (u.JABATAN || u.jabatan || 'Merchandiser').trim();
      
      const isSuper = this.isSuperAdmin(name) || this.isSuperAdmin(email);
      let role = 'MDS';
      let perms = { ...window.RBAC_ROLE_PRESETS.MDS.permissions };

      if (isSuper) {
        role = 'SUPERADMIN';
        perms = { ...window.RBAC_ROLE_PRESETS.SUPERADMIN.permissions };
      } else if (jabatan.toLowerCase().includes('supervisor') || jabatan.toLowerCase().includes('spv')) {
        role = 'SPV';
        perms = { ...window.RBAC_ROLE_PRESETS.SPV.permissions };
      }

      const key = email.toLowerCase();
      // Gunakan kombinasi ID unik agar tidak bertabrakan di Alpine x-for
      const baseId = u.ID || u.id || 'USER';
      const cleanId = `${baseId}_${idx + 1}`;
      matrix[key] = {
        id: cleanId,
        name: name,
        email: email,
        modul: modul,
        jabatan: jabatan,
        role: role,
        permissions: perms,
        updatedAt: new Date().toISOString(),
        updatedBy: 'System Auto-Seed'
      };
    });

    this._ensureSuperAdminsInMatrix(matrix);
    return matrix;
  }

  _ensureSuperAdminsInMatrix(matrix) {
    // Sinkronkan akun Super Admin dari sesi login aktif atau portal_users secara dinamis (tanpa hardcode email)
    const checkAndAddSuperAdmin = (u) => {
      if (u && (u.role === 'SUPERADMIN' || u.isSuperAdmin) && u.email) {
        const key = u.email.toLowerCase();
        if (!matrix[key]) {
          matrix[key] = {
            id: u.id || `SUPER_ADMIN_${key.replace(/[^a-zA-Z0-9]/g, '_')}`,
            name: u.name || u.displayName || 'Super Administrator',
            email: u.email,
            modul: u.moduleOrArea || u.modul || 'ALL',
            jabatan: u.jabatan || 'Super Administrator',
            role: 'SUPERADMIN',
            permissions: { kunjungan: true, absensi: true, jadwal: true, tokonasional: true, laporan: true, evaluasi: true },
            updatedAt: new Date().toISOString(),
            updatedBy: 'Dynamic Session'
          };
        }
      }
    };

    try {
      const rawSession = localStorage.getItem('cimory_portal_active_session');
      if (rawSession) checkAndAddSuperAdmin(JSON.parse(rawSession));
      const rawUsers = localStorage.getItem('cimory_portal_users');
      if (rawUsers) {
        const list = JSON.parse(rawUsers);
        if (Array.isArray(list)) list.forEach(checkAndAddSuperAdmin);
      }
    } catch (e) {}
  }

  /**
   * Cek apakah user memiliki hak akses ke suatu halaman
   */
  hasAccessToTab(userEmailOrObj, tabId) {
    if (!tabId) return true;
    
    const email = typeof userEmailOrObj === 'string' ? userEmailOrObj : (userEmailOrObj ? userEmailOrObj.email : '');

    // Tab Control Panel hanya untuk Super Admin (Anda & Bu Oci)
    if (tabId === 'control_panel') {
      return this.isSuperAdmin(email);
    }

    if (!email) return false; // Belum login

    if (this.isSuperAdmin(email)) return true; // Super Admin bebas akses semua tab

    // Cek matriks kustom jika ada
    const cached = localStorage.getItem('cimory_rbac_matrix');
    let matrixPerm = null;
    if (cached) {
      try {
        const matrix = JSON.parse(cached);
        const userPerm = matrix[email.toLowerCase()];
        if (userPerm && userPerm.permissions) {
          matrixPerm = userPerm.permissions;
        }
      } catch (e) {}
    }

    if (matrixPerm && matrixPerm[tabId] !== undefined) {
      return Boolean(matrixPerm[tabId]);
    }

    // Jika tidak ada di matriks kustom, gunakan preset role user
    const role = (typeof userEmailOrObj === 'object' && userEmailOrObj && userEmailOrObj.role) ? 
                 userEmailOrObj.role.toUpperCase() : 'MDS';
    const preset = window.RBAC_ROLE_PRESETS[role] || window.RBAC_ROLE_PRESETS.MDS;
    if (preset && preset.permissions && preset.permissions[tabId] !== undefined) {
      return Boolean(preset.permissions[tabId]);
    }

    // Default aman untuk role MDS: HANYA Kunjungan & Absensi
    return tabId === 'kunjungan' || tabId === 'absensi';
  }
}

// Pasang singleton service ke window
window.FirebaseAuthService = new FirebaseRbacService();
