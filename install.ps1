# Collections for Spotify — installer for Windows (PowerShell).
# Easiest: double-click install.bat. Or run:  powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "============================================="
Write-Host "  Collections for Spotify - installer"
Write-Host "============================================="
Write-Host ""

# --- locate spicetify ---
$spicetify = $null
$cmd = Get-Command spicetify -ErrorAction SilentlyContinue
if ($cmd) { $spicetify = $cmd.Source }
if (-not $spicetify) {
    foreach ($p in @(
        (Join-Path $env:LOCALAPPDATA "spicetify\spicetify.exe"),
        (Join-Path $env:APPDATA "spicetify\spicetify.exe")
    )) {
        if (Test-Path $p) { $spicetify = $p; break }
    }
}
if (-not $spicetify) {
    Write-Host "X Spicetify is not installed or not on PATH."
    Write-Host "  Install it first:  https://spicetify.app/docs/getting-started"
    Read-Host "Press Enter to close"
    exit 1
}
Write-Host "OK Spicetify: $spicetify"

# --- locate CustomApps dir ---
$userdata = ""
try { $userdata = (& $spicetify path userdata 2>$null | Out-String).Trim() } catch {}
if (-not $userdata -or -not (Test-Path $userdata)) {
    $userdata = Join-Path $env:APPDATA "spicetify"
}
$apps = Join-Path $userdata "CustomApps"
New-Item -ItemType Directory -Force -Path $apps | Out-Null
$dest = Join-Path $apps "album-collections"
Write-Host "OK Target: $dest"

# --- copy app ---
if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
Copy-Item -Recurse (Join-Path $dir "album-collections") $dest
Write-Host "OK Files copied"

# --- register (only if not already listed) ---
$cur = ""
try { $cur = (& $spicetify config custom_apps 2>$null | Out-String) } catch {}
if ($cur -notmatch "album-collections") {
    & $spicetify config custom_apps album-collections | Out-Null
    Write-Host "OK Registered with Spicetify"
} else {
    Write-Host "OK Already registered"
}

# --- apply (back up first if Spotify has never been patched) ---
Write-Host ""
Write-Host "Applying to Spotify (this may relaunch Spotify)..."
$applied = $false
try { & $spicetify apply; if ($LASTEXITCODE -eq 0) { $applied = $true } } catch {}
if (-not $applied) {
    try { & $spicetify backup apply; if ($LASTEXITCODE -eq 0) { $applied = $true } } catch {}
}
if (-not $applied) {
    Write-Host "X 'spicetify apply' failed."
    Write-Host "  Note: the Microsoft Store build of Spotify cannot be patched."
    Write-Host "  Install the desktop app from https://www.spotify.com/download instead, then re-run."
    Read-Host "Press Enter to close"
    exit 1
}

Write-Host ""
Write-Host "Done. Open Spotify -> 'Collections' is in Your Library (and the top nav)."
Write-Host "Right-click any album or playlist -> 'Add to collection'."
Read-Host "Press Enter to close"
