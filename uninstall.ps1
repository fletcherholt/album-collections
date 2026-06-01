# Collections for Spotify — uninstaller for Windows. Double-click uninstall.bat.

$ErrorActionPreference = "Stop"
Write-Host "Removing Collections for Spotify..."

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
    Write-Host "X Spicetify not found - nothing to do."
    Read-Host "Press Enter to close"
    exit 1
}

$userdata = ""
try { $userdata = (& $spicetify path userdata 2>$null | Out-String).Trim() } catch {}
if (-not $userdata -or -not (Test-Path $userdata)) {
    $userdata = Join-Path $env:APPDATA "spicetify"
}
$dest = Join-Path (Join-Path $userdata "CustomApps") "album-collections"
if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
Write-Host "OK App files removed"

$cur = ""
try { $cur = (& $spicetify config custom_apps 2>$null | Out-String).Trim() } catch {}
$new = ($cur -split '\|' | Where-Object { $_ -ne "album-collections" }) -join '|'
& $spicetify config custom_apps "$new" | Out-Null
try { & $spicetify apply } catch {}
Write-Host "OK Unregistered & re-applied"
Write-Host "Note: saved collections stay in Spotify's local storage and return if you reinstall."
Read-Host "Press Enter to close"
