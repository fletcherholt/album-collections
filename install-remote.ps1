# Collections for Spotify — remote one-line installer (Windows PowerShell).
# Run:
#   iwr -useb https://raw.githubusercontent.com/fletcherholt/album-collections/main/install-remote.ps1 | iex

$ErrorActionPreference = "Stop"
$repo = "fletcherholt/album-collections"
$branch = "main"

Write-Host "============================================="
Write-Host "  Collections for Spotify - remote installer"
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
    )) { if (Test-Path $p) { $spicetify = $p; break } }
}
if (-not $spicetify) {
    Write-Host "X Spicetify is not installed or not on PATH."
    Write-Host "  Install it first:  https://spicetify.app/docs/getting-started"
    return
}
Write-Host "OK Spicetify: $spicetify"

# --- download + extract ---
$tmp = Join-Path $env:TEMP ("album-collections-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$zip = Join-Path $tmp "src.zip"
Write-Host "Downloading latest from github.com/$repo ..."
Invoke-WebRequest -UseBasicParsing -Uri "https://codeload.github.com/$repo/zip/refs/heads/$branch" -OutFile $zip
Expand-Archive -Path $zip -DestinationPath $tmp -Force
$src = Join-Path $tmp ("album-collections-$branch\album-collections")
if (-not (Test-Path $src)) { Write-Host "X Couldn't find the app folder in the download."; return }
Write-Host "OK Downloaded"

# --- locate CustomApps dir ---
$userdata = ""
try { $userdata = (& $spicetify path userdata 2>$null | Out-String).Trim() } catch {}
if (-not $userdata -or -not (Test-Path $userdata)) { $userdata = Join-Path $env:APPDATA "spicetify" }
$apps = Join-Path $userdata "CustomApps"
New-Item -ItemType Directory -Force -Path $apps | Out-Null
$dest = Join-Path $apps "album-collections"

# --- install ---
if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
Copy-Item -Recurse $src $dest
Write-Host "OK Installed to $dest"

$cur = ""
try { $cur = (& $spicetify config custom_apps 2>$null | Out-String) } catch {}
if ($cur -notmatch "album-collections") { & $spicetify config custom_apps album-collections | Out-Null; Write-Host "OK Registered" }
else { Write-Host "OK Already registered" }

Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Applying to Spotify (this may relaunch Spotify)..."
$applied = $false
try { & $spicetify apply; if ($LASTEXITCODE -eq 0) { $applied = $true } } catch {}
if (-not $applied) { try { & $spicetify backup apply; if ($LASTEXITCODE -eq 0) { $applied = $true } } catch {} }
if (-not $applied) { Write-Host "X 'spicetify apply' failed - see https://spicetify.app/docs/getting-started"; return }

Write-Host ""
Write-Host "Done. Open Spotify -> 'Collections' is in Your Library (and the top nav)."
