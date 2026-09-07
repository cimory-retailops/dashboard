$urls = @(
  'https://docs.google.com/spreadsheets/d/1A-Z_cGLRuB3_2D3_ZDF_z5Q9zoLJlwarV0pDyu69-cY/export?format=csv&gid=0',
  'https://docs.google.com/spreadsheets/d/1CPBD6M_C15_oYnegBG_dz1xb5eGUXR6USkNUnUvkZ2s/export?format=csv&gid=0',
  'https://docs.google.com/spreadsheets/d/15xkzv8Q2ZIuPH4P1KzlILKWMsl2i4VkuAE9WD3IDR4Q/export?format=csv&gid=0'
)
foreach ($u in $urls) {
  $csv = Invoke-RestMethod -Uri $u -TimeoutSec 15
  $lines = $csv -split "`r?`n"
  foreach ($l in ($lines | Select-Object -Skip 1)) {
    if (-not $l) { continue }
    $cols = $l -split ','
    $cat = if ($cols.Length -gt 11) { $cols[11..($cols.Length-1)] -join ',' } else { '' }
    $st = if ($cols.Length -gt 8) { $cols[8] } else { '' }
    $toko = if ($cols.Length -gt 7) { $cols[7] } else { '' }
    $combined = "$st $cat $toko"
    if ($combined -match '(?i)\bDC\b|Kunjungan DC|Visit DC|Tugas DC|Office|Kantor') {
      Write-Host "$($cols[2]) | $($cols[5]) | Status: $st | Catatan: $cat | Toko: $toko"
    }
  }
}
