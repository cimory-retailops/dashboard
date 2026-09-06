# 📘 USER MANUAL & DOKUMENTASI TEKNIS
## Cimory MDS Retail Ops (Modul DK, LK, LP)

Dokumentasi lengkap penggunaan dan arsitektur teknis **Cimory MDS Retail Ops**, aplikasi web terpadu untuk monitoring kunjungan, audit promosi, dan aktivitas lapangan personel MDS (*Merchandiser Display Specialist*) dari **18 Google Spreadsheet terpisah**.

---

## 📑 Daftar Isi
1. [Arsitektur & Konsep 1 Pintu](#1-arsitektur--konsep-1-pintu)
2. [Cara Menjalankan Dashboard](#2-cara-menjalankan-dashboard)
3. [Mode Tabel On-Demand (Optimasi Performa)](#3-mode-tabel-on-demand-optimasi-performa)
4. [Fitur Tema (Light Mode & Dark Mode)](#4-fitur-tema-light-mode--dark-mode)
5. [Sistem Role & Simulasi Hak Akses](#5-sistem-role--simulasi-hak-akses)
6. [Top Metric Cards (Ringkasan Resume Operasional)](#6-top-metric-cards-ringkasan-resume-operasional)
7. [Grafik Analitik (Khusus Mode Admin)](#7-grafik-analitik-khusus-mode-admin)
8. [Tabel Interaktif & Fitur Multi-Filter](#8-tabel-interaktif--fitur-multi-filter)
9. [Modal Dokumentasi Foto & Galeri Before-After](#9-modal-dokumentasi-foto--galeri-before-after)
10. [Detail Kunjungan & Integrasi Google Maps](#10-detail-kunjungan--integrasi-google-maps)
11. [Export Data ke Format Excel / CSV](#11-export-data-ke-format-excel--csv)
12. [Konfigurasi & Manajemen API Google Apps Script](#12-konfigurasi--manajemen-api-google-apps-script)
13. [Troubleshooting & FAQ](#13-troubleshooting--faq)

---

## 1. Arsitektur & Konsep 1 Pintu

Aplikasi ini menggabungkan data dari 18 Google Sheet tanpa merusak alur kerja AppSheet operasional yang sedang berjalan.

```
┌────────────────────────────────────────────────────────┐
│             18 GOOGLE SPREADSHEETS                     │
│  - Modul DK (Dalam Kota) : 6 File Sheet + 1 Absen      │
│  - Modul LK (Luar Kota)  : 5 File Sheet + 1 Absen      │
│  - Modul LP (Luar Pulau) : 4 File Sheet + 1 Absen      │
└──────────────────────────┬─────────────────────────────┘
                           │ (Read-Only via openById)
                           ▼
┌────────────────────────────────────────────────────────┐
│          GOOGLE APPS SCRIPT API AGGREGATOR             │
│  - Endpoint Hari H: ?date=TODAY (Super Instan < 1s)    │
│  - Endpoint Riwayat / Deep Scan (?limit=300/crew=...)  │
│  - GAS CacheService (Performa server responsif)        │
└──────────────────────────┬─────────────────────────────┘
                           │ (JSON via HTTPS)
                           ▼
┌────────────────────────────────────────────────────────┐
│           DASHBOARD FRONTEND (index.html)              │
│  - ⚡ Data Hari H (Real-time Live Sync)                │
│  - 💾 Data Riwayat Masa Lalu (Local Storage Cache)     │
│  - Background Sync otomatis untuk data historis        │
│  - Mode Tabel On-Demand, Dual Theme, User Manual       │
└────────────────────────────────────────────────────────┘
```

> [!NOTE]
> **Keamanan 100% Terjamin (Zero-Impact to Production):** Dashboard hanya membaca data (*read-only*). Script tidak pernah mengubah header, formula, atau menambah baris pada Google Sheet asli sehingga AppSheet lapangan tidak akan pernah error.

---

## 2. Cara Menjalankan Dashboard

1. Pastikan file `index.html` berada di direktori lokal komputer Anda:
   `d:\Data\Desktop\dashboard appsheet\index.html`
2. **Klik ganda (double-click)** pada file `index.html` untuk membukanya di browser modern (*Google Chrome, Microsoft Edge, Mozilla Firefox, dsb.*).
3. Dashboard akan langsung terbuka dan otomatis menarik data resume live dari Google Apps Script Web App.

---

## 3. Mode Tabel On-Demand (Optimasi Performa)

Untuk menjaga browser tetap ringan dan cepat saat pertama kali dibuka:
* **Fokus Awal:** Web memfokuskan sumber daya untuk memuat **Kartu Resume & Grafik Analitik** terlebih dahulu.
* **Aktivasi Tabel:** Baris rincian data pada tabel tidak dimuat sekaligus, melainkan akan tampil otomatis ketika Anda:
  1. Memilih salah satu filter dropdown (**Modul DK/LK/LP**, **Retailer**, **Petugas MDS**, atau **Tanggal**).
  2. Mengetik kata kunci pada kolom pencarian.
  3. Mengklik tombol chip cepat (contoh: *⚡ Muat Modul DK*, *⚡ Muat Modul LK*, *⚡ Muat Modul LP*).
  4. Mengklik tombol **"Muat Semua Data Tabel"**.

---

## 4. Fitur Tema (Light Mode & Dark Mode)

Dashboard dilengkapi fitur **Dual Theme** yang dapat disesuaikan dengan kenyamanan visual pengguna:

* **Mode Terang (Light Mode - Default):** Tampilan bersih (*clean executive*), latar belakang putih-abu cerah, teks kontras tinggi, sangat cocok untuk presentasi proyektor atau ruangan terang.
* **Mode Gelap (Dark Mode):** Tampilan futuristik elegan bernuansa *slate/indigo*, nyaman digunakan di malam hari atau ruangan minim cahaya.

### Cara Mengganti Tema:
* Klik tombol **Ikon Matahari / Bulan (☀️ / 🌙)** di bagian pojok kanan atas *header*.
* Preferensi tema yang Anda pilih akan **otomatis tersimpan di browser** (*localStorage*) sehingga tidak akan berubah saat halaman di-refresh.

---

## 5. Sistem Role & Simulasi Hak Akses

Dashboard menyediakan 2 pilihan role kerja untuk memfasilitasi kebutuhan supervisi maupun operasional:

### A. Role Admin / Supervisor
* **Akses Penuh:** Melihat keseluruhan data kunjungan dari seluruh 18 Sheet (DK, LK, LP).
* **Fitur Tambahan:**
  * Grafik analitik komposisi modul dan distribusi retailer.
  * Filter bebas memilih modul (DK, LK, LP) dan seluruh nama petugas MDS.
  * Fitur Export Data CSV dan tombol *Force Sync*.

### B. Role Field User (Petugas MDS Lapangan)
* **Akses Khusus:** Tampilan otomatis disaring hanya menampilkan kunjungan dan riwayat milik MDS yang sedang aktif.
* **Banner Notifikasi:** Terdapat banner penanda identitas MDS yang sedang login di bagian atas.
* **Simulasi Profil:** Admin dapat mensimulasikan sudut pandang petugas tertentu dengan memilih nama MDS di daftar dropdown modal role.

### Cara Beralih Role:
1. Klik tombol **Badge Role** di kanan atas (bertuliskan `Admin / SPV` atau `MDS: [Nama]`).
2. Pilih mode **Admin / Supervisor** atau **Field MDS**.
3. Jika memilih Field MDS, pilih nama petugas pada dropdown yang tersedia.
4. Klik **"Terapkan & Tutup"**.

---

## 6. Top Metric Cards (Ringkasan Resume Operasional)

Di bagian atas layar terdapat 4 kartu metrik utama yang otomatis menampilkan resume seluruh data:

1. **Total Kunjungan:** Menampilkan total data kunjungan terekam beserta rincian proporsi per modul (`DK`, `LK`, `LP`).
2. **Toko Tervalidasi:** Menghitung jumlah toko fisik unik (*distinct*) yang telah berhasil dikunjungi tim MDS.
3. **Personel MDS:** Jumlah personel lapangan yang aktif melakukan kunjungan.
4. **Bukti Foto & Audit:** Akumulasi seluruh dokumentasi foto (foto selfie depan toko, foto rak *before*, dan foto rak *after*).

---

## 7. Grafik Analitik (Khusus Mode Admin)

Saat berada di Mode Admin, terdapat 2 grafik interaktif bertenaga **Chart.js**:

* **Komposisi Kunjungan Modul (Doughnut Chart):** Memvisualisasikan persentase beban kerja antara Dalam Kota (DK), Luar Kota (LK), dan Luar Pulau (LP).
* **Distribusi Retailer (Bar Chart):** Membandingkan proporsi kunjungan pada outlet **Alfamart** vs **Indomaret**.
* **Status Sumber 18 Sheet:** Kotak indikator status jumlah file spreadsheet yang terhubung pada masing-masing region.

---

## 8. Tabel Interaktif & Fitur Multi-Filter

Tabel utama dirancang untuk pencarian cepat dan navigasi data terarah:

### A. Live Search Bar
Ketikkan kata kunci apapun (contoh: *nama toko, kode toko, nama MDS, atau ID visit*), tabel akan otomatis aktif dan menyaring baris secara instan.

### B. Multi-Filter & Interactive Date Range Picker:
* **Modul:** Pilih *Semua Modul*, *DK*, *LK*, atau *LP*.
* **Retailer:** Saring berdasarkan outlet *Alfamart* atau *Indomaret*.
* **Petugas MDS:** Pilih nama personel tertentu dari daftar MDS aktif.
* **Rentang Tanggal (Date Picker & Range Query):**
  * **Standar Default (Maks 30 Hari Terakhir):** Untuk menjaga kecepatan dan memori browser tetap ringan, web dan script Google Apps Script secara default hanya menarik data maksimal **30 hari terakhir (1 bulan)**.
  * **Akses Bulan-Bulan Lampau (> 30 Hari):** Jika Anda membutuhkan data 2–3 bulan yang lalu, gunakan **Dual Date Picker** untuk menentukan tanggal spesifik. Web akan otomatis melakukan penarikan data arsip lampau secara *on-demand*.
  * **Quick Presets:** Pilihan instan sekali klik: *30 Hari Terakhir (Default)*, *Hari Ini*, *7 Hari Terakhir*, *Bulan Ini*, atau *Custom Range*.

### C. Tombol Reset Filter:
Klik ikon corong silang (❌) untuk mengembalikan seluruh filter dan kembali ke tampilan resume awal.

### D. Navigasi Halaman (Pagination):
Tabel membatasi 10 baris per halaman agar ringan. Gunakan tombol panah kiri (`<`) dan kanan (`>`) di footer tabel untuk berpindah halaman.

---

## 9. Modal Dokumentasi Foto & Galeri Before-After

Setiap baris kunjungan dilengkapi akses cepat ke dokumentasi visual dengan fitur **On-Demand Google Drive Image Resolver**:

1. **Tombol "Selfie":** Membuka popup foto selfie kedatangan petugas MDS di depan toko.
2. **Tombol "X Before / Y After":** Membuka galeri foto rak. Pengguna dapat berpindah antar slide foto (*Before 1–6, After 1–6*) dengan mengklik tombol thumbnail di bawah gambar.
3. **On-Demand Google Drive Streaming:** Sistem otomatis mencari file gambar asli di Google Drive dan mengubahnya menjadi gambar resolusi tinggi tanpa terhalang isu hak akses/permission Google Drive. Tersedia juga tombol pintas **"Buka di Google Drive"** untuk melihat file asli di tab baru.

---

## 10. Detail Kunjungan & Integrasi Google Maps

Klik ikon **Mata (👁️)** pada kolom paling kanan untuk membuka ringkasan lengkap satu kunjungan:

* Identitas Toko, Kode Toko, dan Tipe Toko (*AU 10P Coke, Regular, dll.*).
* Waktu presisi kunjungan (Hari, Tanggal, Jam, dan Week).
* Pengecekan aset: **Aset Chiller/Freezer**, **Gondola Sewa**, dan **Status Promo**.
* **Koordinat GPS:** Menampilkan titik koordinat lintang & bujur (`latitude, longitude`). Terdapat tombol **"Buka di Google Maps"** yang akan langsung membuka posisi riil toko di Google Maps pada tab baru.

---

## 11. Export Data ke Format Excel / CSV

Pengguna dapat mengunduh seluruh data yang sedang tampil (sesuai filter yang sedang aktif) ke dalam file `.CSV`:

1. Sesuaikan filter atau klik "Muat Semua Data Tabel".
2. Klik tombol **"Export CSV"** di toolbar tabel.
3. File bernama `MDS_Export_YYYY-MM-DD.csv` akan otomatis terunduh ke komputer Anda dan siap dibuka di Microsoft Excel atau Google Sheets.

---

## 12. Konfigurasi & Manajemen API Google Apps Script

Dashboard ini terhubung dengan backend Google Apps Script:

* **Endpoint URL Aktif:**  
  `https://script.google.com/macros/s/AKfycbw0C9GNm8PmJC-71dPbOBtlJakkIL1tTn7wnq805JSrekZcdzq4CpUZCtnUpxzBPyZi/exec`

### Mengganti URL atau Beralih ke Mode Demo:
1. Klik ikon **Gear Pengaturan (⚙️)** di sebelah status API pada header.
2. Masukkan URL endpoint Web App baru jika Anda melakukan deploy ulang script.
3. Anda juga dapat mengganti mode ke **"Demo Mock"** jika ingin menguji dashboard tanpa koneksi internet.
4. Klik **"Simpan & Sync"**.

---

## 13. Troubleshooting & FAQ

### Q1: Data kunjungan baru yang baru saja diinput di AppSheet belum muncul di Dashboard?
> **Jawab:** Google Apps Script menerapkan *caching* 5 menit untuk menjaga kecepatan loading. Untuk memaksa pembaruan data, klik tombol **"Sync Resume"** di header dashboard.

### Q2: Mengapa tabel belum menampilkan baris data saat web pertama kali dibuka?
> **Jawab:** Ini adalah fitur optimasi *On-Demand Table*. Cukup pilih salah satu filter di atas (misal klik tombol chip cepat *⚡ Muat Modul DK* atau pilih nama MDS) atau klik tombol *"Muat Semua Data Tabel"*.

### Q3: Bagaimana jika ada penambahan spreadsheet baru (misal DK 7 atau LP 5)?
> **Jawab:** Buka file `Code.gs`, tambahkan ID spreadsheet baru pada objek `CONFIG.DK.kunjunganSheets` atau `CONFIG.LP.kunjunganSheets`, lalu lakukan **Deploy > Manage Deployments > Edit Version > Deploy**. Dashboard akan otomatis membaca sheet baru tersebut tanpa perlu mengubah kode frontend.

---

*Dokumentasi ini disusun untuk operasional Tim Field MDS & Supervisor.*  
*Versi Dashboard: v1.1.0 (On-Demand Table Mode)*
