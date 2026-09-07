$userCsv = Invoke-RestMethod -Uri "https://docs.google.com/spreadsheets/d/1XqZgR70C1eqfkkKbM9jO2FhSi6-g3I9AskuhsSh7Mzs/gviz/tq?tqx=out:csv&sheet=Master_User"
$absenUrls = @{
  "DK" = "https://docs.google.com/spreadsheets/d/1A-Z_cGLRuB3_2D3_ZDF_z5Q9zoLJlwarV0pDyu69-cY/export?format=csv&gid=0"
  "LK" = "https://docs.google.com/spreadsheets/d/1CPBD6M_C15_oYnegBG_dz1xb5eGUXR6USkNUnUvkZ2s/export?format=csv&gid=0"
  "LP" = "https://docs.google.com/spreadsheets/d/15xkzv8Q2ZIuPH4P1KzlILKWMsl2i4VkuAE9WD3IDR4Q/export?format=csv&gid=0"
}

# 1. Total Roster
$allPersonnel = @{}
$userRows = $userCsv | ConvertFrom-Csv
foreach ($r in $userRows) {
  $nama = ($r.NAMA).Trim()
  $id = ($r.ID).Trim()
  $mod = ($r.MODUL).Trim()
  if ($nama) {
    $norm = ($nama.ToUpper() -replace '[^A-Z0-9]',' ' -replace '\s+',' ' -replace 'SULISTIYO','SULISTIO').Trim()
    $allPersonnel[$norm] = @{ Nama = $nama; Id = $id; Modul = $mod; Source = 'Master' }
  }
}

$absenMasuk = @{}
$absenPulang = @{}
$absenCuti = @{}
$absenSakit = @{}
$absenIzin = @{}
$absenDc = @{}

foreach ($kv in $absenUrls.GetEnumerator()) {
  $csv = Invoke-RestMethod -Uri $kv.Value
  $rows = $csv | ConvertFrom-Csv
  foreach ($r in $rows) {
    $tgl = ($r.TANGGAL).Trim()
    if ($tgl -ne '9/5/2026') { continue }
    $nama = ($r.'NAMA CREW').Trim()
    $id = ($r.IDCREW).Trim()
    $st = ($r.'STATUS ABSEN').Trim().ToUpper()
    $cat = ($r.CATATAN).Trim()
    $toko = ($r.'NAMA TOKO').Trim()
    $norm = ($nama.ToUpper() -replace '[^A-Z0-9]',' ' -replace '\s+',' ' -replace 'SULISTIYO','SULISTIO').Trim()
    
    if (-not $allPersonnel.ContainsKey($norm)) {
      $allPersonnel[$norm] = @{ Nama = $nama; Id = $id; Modul = $kv.Key; Source = 'Absen' }
    }

    $combined = "$st $cat $toko"
    $isDc = $combined -match '(?i)\bDC\b|Kunjungan DC|Visit DC|Tugas DC|DC SAT|DC SERANG|DC LEBAK|DC PARUNG|DC JKT|DC CIREBON|OFFICE|KANTOR'

    if ($isDc) {
      $absenDc[$norm] = @{ Nama = $nama; St = $st; Cat = $cat; Time = $r.WAKTU }
    }
    if ($st -match 'MASUK|HADIR' -or (-not $st)) {
      $absenMasuk[$norm] = @{ Nama = $nama; Time = $r.WAKTU; Cat = $cat; IsDc = $isDc }
    } elseif ($st -match 'PULANG') {
      $absenPulang[$norm] = @{ Nama = $nama; Time = $r.WAKTU; Cat = $cat; IsDc = $isDc }
    } elseif ($st -match 'IZIN') {
      $absenIzin[$norm] = @{ Nama = $nama; Cat = $cat }
    } elseif ($st -match 'SAKIT') {
      $absenSakit[$norm] = @{ Nama = $nama; Cat = $cat }
    } elseif ($st -match 'CUTI') {
      $absenCuti[$norm] = @{ Nama = $nama; Cat = $cat }
    }
  }
}

Write-Host "=========================================="
Write-Host "TOTAL UNIFIED ROSTER: $($allPersonnel.Count) MDS"
Write-Host "=========================================="
Write-Host "1. Absen Masuk: $($absenMasuk.Count) MDS"
Write-Host "   - Termasuk Visit DC: $($absenDc.Count) MDS"
Write-Host "2. Cuti: $($absenCuti.Count) MDS"
Write-Host "3. Sakit: $($absenSakit.Count) MDS"
Write-Host "4. Izin: $($absenIzin.Count) MDS"

$alphaList = @()
foreach ($k in $allPersonnel.Keys) {
  if (-not $absenMasuk.ContainsKey($k) -and -not $absenCuti.ContainsKey($k) -and -not $absenSakit.ContainsKey($k) -and -not $absenIzin.ContainsKey($k)) {
    $alphaList += $k
  }
}
Write-Host "5. Belum Absen Masuk (Alpha): $($alphaList.Count) MDS"
foreach ($a in $alphaList) { Write-Host "   - $a ($($allPersonnel[$a].Modul))" }

$sum = $absenMasuk.Count + $absenCuti.Count + $absenSakit.Count + $absenIzin.Count + $alphaList.Count
Write-Host "=========================================="
Write-Host "SUM CHECK: $($absenMasuk.Count) + $($absenCuti.Count) + $($absenSakit.Count) + $($absenIzin.Count) + $($alphaList.Count) = $sum MDS (Target: $($allPersonnel.Count))"
Write-Host "=========================================="
