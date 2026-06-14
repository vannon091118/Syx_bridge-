$ws = "C:\Program Files (x86)\Steam\steamapps\workshop\content\1162750"
$cutoff = Get-Date '2026-06-03 18:54:00'

Write-Host "=== Workshop-Mods die seit $cutoff modifiziert wurden ===" -ForegroundColor Cyan
$dirs = Get-ChildItem $ws -Directory -ErrorAction SilentlyContinue
$rows = foreach ($d in $dirs) {
  $changed = @(Get-ChildItem $d.FullName -Recurse -File -ErrorAction SilentlyContinue |
               Where-Object { $_.LastWriteTime -gt $cutoff })
  if ($changed.Count -gt 0) {
    $last = ($changed | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime
    [pscustomobject]@{
      ModId           = $d.Name
      ChangedFiles    = $changed.Count
      LastWrite       = $last
    }
  }
}
$rows | Sort-Object ChangedFiles -Descending | Format-Table -AutoSize

Write-Host ""
Write-Host "=== Arsenal Expanded (3130192483) - erste 20 geaenderte Files ===" -ForegroundColor Cyan
$ars = @(Get-ChildItem "$ws\3130192483" -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -gt $cutoff })
"Geaenderte Files Arsenal: $($ars.Count)"
foreach ($f in ($ars | Select-Object -First 20)) {
  $rel = $f.FullName.Substring("$ws\3130192483\".Length)
  "{0,7} B  {1}  {2}" -f $f.Length, $f.LastWriteTime.ToString('HH:mm:ss'), $rel
}

Write-Host ""
Write-Host "=== Sample Diff Workshop vs Backup fuer Arsenal V70 text ===" -ForegroundColor Cyan
$bkRoot = "C:\Users\Vannon\Desktop\syx-bridge\backups\.backup_3130192483_ORIGINAL"
$relTexts = @(
  "V70\assets\text\stats\trait\CALM_KIRTASH.txt"
  "V70\assets\text\room\WORKSHOP_ARMORY_KIRTASH.txt"
)
foreach ($r in $relTexts) {
  $wp = Join-Path "$ws\3130192483" $r
  $bp = Join-Path $bkRoot $r
  if (Test-Path $wp) {
    $wHash = (Get-FileHash $wp -Algorithm SHA256).Hash.Substring(0,12)
    $bHash = if (Test-Path $bp) { (Get-FileHash $bp -Algorithm SHA256).Hash.Substring(0,12) } else { 'MISSING-BK' }
    Write-Host "[$r]" -ForegroundColor Yellow
    Write-Host "  WS: $wHash   BK: $bHash   IDENTISCH: $($wHash -eq $bHash)"
    Write-Host "  --- WS erste 6 Zeilen ---"
    Get-Content $wp -TotalCount 6 | ForEach-Object { "    $_" }
    if (Test-Path $bp) {
      Write-Host "  --- BK erste 6 Zeilen ---"
      Get-Content $bp -TotalCount 6 | ForEach-Object { "    $_" }
    }
    Write-Host ""
  }
}
