$userCsv = Invoke-RestMethod -Uri "https://docs.google.com/spreadsheets/d/1XqZgR70C1eqfkkKbM9jO2FhSi6-g3I9AskuhsSh7Mzs/gviz/tq?tqx=out:csv&sheet=Master_User"
$absenUrls = @{
  "DK" = "https://docs.google.com/spreadsheets/d/1A-Z_cGLRuB3_2D3_ZDF_z5Q9zoLJlwarV0pDyu69-cY/export?format=csv&gid=0"
  "LK" = "https://docs.google.com/spreadsheets/d/1CPBD6M_C15_oYnegBG_dz1xb5eGUXR6USkNUnUvkZ2s/export?format=csv&gid=0"
  "LP" = "https://docs.google.com/spreadsheets/d/15xkzv8Q2ZIuPH4P1KzlILKWMsl2i4VkuAE9WD3IDR4Q/export?format=csv&gid=0"
}

# Master User
$userRows = $userCsv | ConvertFrom-Csv
Write-Host "Raw Master User Row Count: $($userRows.Count)"

$masterUsers = @{}
foreach ($r in $userRows) {
  $nama = ($r.NAMA).Trim()
  $id = ($r.ID).Trim()
  $mod = ($r.MODUL).Trim()
  $norm = ($nama.ToUpper() -replace '[^A-Z0-9]',' ' -replace '\s+',' ' -replace 'SULISTIYO','SULISTIO').Trim()
  $masterUsers[$norm] = @{ Nama = $nama; Id = $id; Modul = $mod }
}
Write-Host "Unique Normalized Master Users: $($masterUsers.Count)"

# Absen 9/5/2026
$absenRows95 = @()
foreach ($kv in $absenUrls.GetEnumerator()) {
  $csv = Invoke-RestMethod -Uri $kv.Value
  $rows = $csv | ConvertFrom-Csv
  foreach ($r in $rows) {
    if ($r.TANGGAL -eq '9/5/2026') {
      $absenRows95 += $r
    }
  }
}
Write-Host "Absen entries on 9/5/2026: $($absenRows95.Count)"

# Check names in Absen on 9/5/2026
$uniqueAbsen95 = @{}
foreach ($r in $absenRows95) {
  $nama = ($r.'NAMA CREW').Trim()
  $id = ($r.IDCREW).Trim()
  $norm = ($nama.ToUpper() -replace '[^A-Z0-9]',' ' -replace '\s+',' ' -replace 'SULISTIYO','SULISTIO').Trim()
  $uniqueAbsen95[$norm] = @{ Nama = $nama; Id = $id; Status = $r.'STATUS ABSEN'; Catatan = $r.CATATAN; Toko = $r.'NAMA TOKO' }
}
Write-Host "Unique People who did Absen on 9/5/2026: $($uniqueAbsen95.Count)"

Write-Host "`n--- Checking Who is in Absen but NOT in Master User ---"
foreach ($k in $uniqueAbsen95.Keys) {
  if (-not $masterUsers.ContainsKey($k)) {
    Write-Host "  Name in Absen: '$k' (Raw: $($uniqueAbsen95[$k].Nama)) | ID: $($uniqueAbsen95[$k].Id)"
    # Check if similar name exists in Master User
    foreach ($mk in $masterUsers.Keys) {
      if ($mk -match $k -or $k -match $mk -or ($mk -split ' ')[0] -eq ($k -split ' ')[0]) {
        Write-Host "    -> Possible match in Master User: '$mk' (ID: $($masterUsers[$mk].Id))"
      }
    }
  }
}
