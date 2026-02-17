param(
  [string]$InputDir = "assets",
  [string[]]$Files = @(),
  [int]$MaxWidth = 1920,
  [switch]$KeepBackup,
  [switch]$DryRun
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

function Parse-Fps {
  param([string]$RateToken)
  if (-not $RateToken) { return 30.0 }
  if ($RateToken -match "^(\d+)\/(\d+)$") {
    $num = [double]$matches[1]
    $den = [double]$matches[2]
    if ($den -ne 0) { return ($num / $den) }
  }
  return [double]$RateToken
}

function Get-ProfileByWidth {
  param([int]$Width)

  if ($Width -le 1280) {
    return @{
      Mp4Crf = 23
      Mp4MaxRate = "4M"
      Mp4BufSize = "8M"
      WebmCrf = 32
    }
  }

  return @{
    Mp4Crf = 22
    Mp4MaxRate = "6M"
    Mp4BufSize = "12M"
    WebmCrf = 31
  }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$inputRoot = Join-Path $repoRoot $InputDir
if (-not (Test-Path $inputRoot)) {
  throw "Input directory not found: $inputRoot"
}

$ffmpeg = Resolve-ToolPath -CommandName "ffmpeg" -Fallbacks @(
  "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin\ffmpeg.exe"
)
$ffprobe = Resolve-ToolPath -CommandName "ffprobe" -Fallbacks @(
  "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin\ffprobe.exe"
)

if (-not $ffmpeg -or -not $ffprobe) {
  throw "ffmpeg/ffprobe not found. Install via: winget install --id Gyan.FFmpeg"
}

$targets = @()
if ($Files.Count -gt 0) {
  foreach ($file in $Files) {
    $full = Join-Path $repoRoot $file
    if (-not (Test-Path $full)) {
      throw "File not found: $file"
    }
    $targets += Get-Item $full
  }
} else {
  $targets += Get-ChildItem $inputRoot -Filter *.mp4 -File
}

$targets = $targets | Where-Object { $_.Name -notlike "*.optimized.mp4" } | Sort-Object Name
if ($targets.Count -eq 0) {
  Write-Host "No MP4 files found to optimize."
  exit 0
}

Write-Host "Using ffmpeg: $ffmpeg"
Write-Host "Using ffprobe: $ffprobe"
Write-Host "Dry run: $DryRun"
Write-Host ""

$summary = @()

foreach ($src in $targets) {
  $base = [System.IO.Path]::GetFileNameWithoutExtension($src.Name)
  $mp4Out = Join-Path $src.DirectoryName "$base.mp4"
  $webmOut = Join-Path $src.DirectoryName "$base.webm"
  $tmpMp4 = Join-Path $src.DirectoryName "$base.tmp.opt.mp4"
  $tmpWebm = Join-Path $src.DirectoryName "$base.tmp.opt.webm"
  $backupMp4 = Join-Path $src.DirectoryName "$base.preopt.mp4"
  $backupWebm = Join-Path $src.DirectoryName "$base.preopt.webm"

  $meta = & $ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -of default=nw=1:nk=1 $src.FullName
  $meta = $meta | Where-Object { $_ -ne "" }
  $srcWidth = [int]$meta[0]
  $srcHeight = [int]$meta[1]
  $fps = Parse-Fps $meta[2]

  $targetWidth = [Math]::Min($srcWidth, $MaxWidth)
  if ($targetWidth -lt $srcWidth) {
    $vf = "scale=${targetWidth}:-2:flags=lanczos"
  } else {
    $vf = "scale=iw:-2:flags=lanczos"
  }

  $profile = Get-ProfileByWidth $targetWidth

  Write-Host "Optimizing $($src.Name) ($srcWidth x $srcHeight @ $([Math]::Round($fps,2))fps)"
  Write-Host "  MP4 -> CRF $($profile.Mp4Crf), maxrate $($profile.Mp4MaxRate), bufsize $($profile.Mp4BufSize)"
  Write-Host "  WEBM -> CRF $($profile.WebmCrf)"
  Write-Host "  Filter: $vf"

  if ($DryRun) {
    Write-Host "  Dry run: skipping encode."
    Write-Host ""
    continue
  }

  & $ffmpeg -y -i $src.FullName -map 0:v:0 -an `
    -vf $vf -c:v libx264 -preset slow -crf $profile.Mp4Crf `
    -maxrate $profile.Mp4MaxRate -bufsize $profile.Mp4BufSize `
    -pix_fmt yuv420p -movflags +faststart $tmpMp4

  & $ffmpeg -y -i $src.FullName -map 0:v:0 -an `
    -vf $vf -c:v libvpx-vp9 -b:v 0 -crf $profile.WebmCrf `
    -deadline good -cpu-used 2 -row-mt 1 -tile-columns 2 `
    -frame-parallel 1 -pix_fmt yuv420p $tmpWebm

  $oldMp4Size = (Get-Item $mp4Out).Length
  $oldWebmSize = if (Test-Path $webmOut) { (Get-Item $webmOut).Length } else { 0 }

  Copy-Item -Force $mp4Out $backupMp4
  if (Test-Path $webmOut) {
    Copy-Item -Force $webmOut $backupWebm
  }

  Move-Item -Force $tmpMp4 $mp4Out
  Move-Item -Force $tmpWebm $webmOut

  $newMp4Size = (Get-Item $mp4Out).Length
  $newWebmSize = (Get-Item $webmOut).Length

  if (-not $KeepBackup) {
    Remove-Item -Force $backupMp4
    if (Test-Path $backupWebm) {
      Remove-Item -Force $backupWebm
    }
  }

  $summary += [PSCustomObject]@{
    File = $src.Name
    Mp4Old = $oldMp4Size
    Mp4New = $newMp4Size
    WebmOld = $oldWebmSize
    WebmNew = $newWebmSize
  }

  Write-Host "  Done."
  Write-Host ""
}

if (-not $DryRun -and $summary.Count -gt 0) {
  Write-Host "Optimization summary:"
  foreach ($item in $summary) {
    $mp4Pct = if ($item.Mp4Old -gt 0) { [Math]::Round((1 - ($item.Mp4New / $item.Mp4Old)) * 100, 2) } else { 0 }
    $webmPct = if ($item.WebmOld -gt 0) { [Math]::Round((1 - ($item.WebmNew / $item.WebmOld)) * 100, 2) } else { 0 }
    Write-Host ("  {0}: mp4 {1} -> {2} bytes ({3}%); webm {4} -> {5} bytes ({6}%)" -f `
      $item.File, $item.Mp4Old, $item.Mp4New, $mp4Pct, $item.WebmOld, $item.WebmNew, $webmPct)
  }
}
