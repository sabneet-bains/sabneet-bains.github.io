param(
  [string]$InputPdf = "assets/resume.pdf",
  [switch]$KeepBackup
)

$ErrorActionPreference = "Stop"

function Resolve-ToolPath {
  param(
    [string]$CommandName,
    [string[]]$Fallbacks
  )

  $cmd = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  foreach ($candidate in $Fallbacks) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  return $null
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$inputPath = Join-Path $repoRoot $InputPdf

if (-not (Test-Path $inputPath)) {
  throw "Resume PDF not found: $inputPath"
}

$qpdf = Resolve-ToolPath -CommandName "qpdf" -Fallbacks @(
  "C:\Program Files\qpdf 12.2.0\bin\qpdf.exe"
)

if (-not $qpdf) {
  throw "qpdf not found. Install via: winget install --id QPDF.QPDF"
}

$pdfinfo = Resolve-ToolPath -CommandName "pdfinfo" -Fallbacks @(
  "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe\poppler-25.07.0\Library\bin\pdfinfo.exe"
)

$pdffonts = Resolve-ToolPath -CommandName "pdffonts" -Fallbacks @(
  "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe\poppler-25.07.0\Library\bin\pdffonts.exe"
)

$tempPath = [System.IO.Path]::ChangeExtension($inputPath, ".linearized.pdf")
$backupPath = [System.IO.Path]::ChangeExtension($inputPath, ".prelinearized.pdf")

$oldSize = (Get-Item $inputPath).Length

& $qpdf --linearize --object-streams=generate $inputPath $tempPath
$checkOutput = & $qpdf --check $tempPath 2>&1
$checkOutput | Out-Host
$checkText = ($checkOutput | ForEach-Object { $_.ToString() }) -join "`n"
if ($checkText -notmatch "File is linearized") {
  throw "Linearization check failed for $tempPath"
}

Copy-Item -Force $inputPath $backupPath
Move-Item -Force $tempPath $inputPath

$newSize = (Get-Item $inputPath).Length
$savedPct = [math]::Round((1 - ($newSize / $oldSize)) * 100, 2)

Write-Host "Resume optimized successfully."
Write-Host "Path: $inputPath"
Write-Host "Size: $oldSize -> $newSize bytes ($savedPct% change)"

if ($pdfinfo) {
  Write-Host ""
  Write-Host "pdfinfo summary:"
  & $pdfinfo $inputPath | Select-String -Pattern "Pages:|Page size:|File size:|Optimized:|PDF version:"
}

if ($pdffonts) {
  Write-Host ""
  Write-Host "First fonts rows (embedded check):"
  & $pdffonts $inputPath | Select-Object -First 15
}

if (-not $KeepBackup) {
  Remove-Item -Force $backupPath
  Write-Host ""
  Write-Host "Removed backup: $backupPath"
} else {
  Write-Host ""
  Write-Host "Backup kept: $backupPath"
}
