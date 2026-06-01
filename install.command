#!/bin/bash
# Collections for Spotify — one-click macOS installer.
# Double-click this file in Finder. It copies the custom app into Spicetify and applies it.

set -u
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================="
echo "  Collections for Spotify — installer"
echo "============================================="
echo

# --- locate spicetify ---
SPICETIFY=""
if command -v spicetify >/dev/null 2>&1; then
    SPICETIFY="$(command -v spicetify)"
elif [ -x "$HOME/.spicetify/spicetify" ]; then
    SPICETIFY="$HOME/.spicetify/spicetify"
fi

if [ -z "$SPICETIFY" ]; then
    echo "✗ Spicetify is not installed."
    echo "  Install it first:  https://spicetify.app/docs/getting-started"
    echo
    read -r -p "Press Enter to close…"
    exit 1
fi
echo "✓ Spicetify: $SPICETIFY"

# --- make sure Spotify itself is installed (Spicetify patches it) ---
SPOTIFY_FOUND=""
for p in /Applications/Spotify.app "$HOME/Applications/Spotify.app"; do
    [ -d "$p" ] && SPOTIFY_FOUND="$p"
done
[ -z "$SPOTIFY_FOUND" ] && SPOTIFY_FOUND="$(mdfind -name 'Spotify.app' 2>/dev/null | head -n1)"
if [ -z "$SPOTIFY_FOUND" ]; then
    {
        echo
        echo "✗ Spotify (Spotify.app) doesn't appear to be installed."
        echo "  Spicetify patches the desktop Spotify app, so install it first:"
        echo "    https://www.spotify.com/download   (use the direct .dmg, not the App Store build)"
        echo
        echo "  Already have it somewhere unusual? Set its path, then re-run me:"
        echo "    $SPICETIFY config spotify_path \"/path/to/Spotify.app/Contents/Resources\""
        echo
    }
    read -r -p "Press Enter to close…"
    exit 1
fi
echo "✓ Spotify: $SPOTIFY_FOUND"

# --- locate CustomApps dir (ignore noise; fall back to the default) ---
USERDATA="$("$SPICETIFY" path userdata 2>/dev/null | tr -d '\r')"
if [ -z "$USERDATA" ] || [ ! -d "$USERDATA" ]; then
    USERDATA="$HOME/.config/spicetify"
fi
APPS="$USERDATA/CustomApps"
mkdir -p "$APPS"
echo "✓ Target: $APPS/album-collections"

# --- copy app ---
rm -rf "$APPS/album-collections"
cp -R "$DIR/album-collections" "$APPS/album-collections"
echo "✓ Files copied"

# --- register custom app (only if not already listed) ---
CUR="$("$SPICETIFY" config custom_apps 2>/dev/null | tr -d '\r')"
case "|$CUR|" in
    *"|album-collections|"* | *album-collections*)
        echo "✓ Already registered"
        ;;
    *)
        "$SPICETIFY" config custom_apps album-collections >/dev/null 2>&1
        echo "✓ Registered with Spicetify"
        ;;
esac

# --- apply (back up first if Spotify has never been patched) ---
echo
echo "Applying to Spotify (this may relaunch Spotify)…"
if "$SPICETIFY" apply 2>/dev/null; then
    echo "✓ Applied"
elif "$SPICETIFY" backup apply; then
    echo "✓ Backed up & applied"
else
    echo "✗ 'spicetify apply' failed. Try running it manually in a terminal:"
    echo "    $SPICETIFY backup apply"
    echo
    read -r -p "Press Enter to close…"
    exit 1
fi

echo
echo "============================================="
echo "  Done. Open Spotify → 'Collections' tab is"
echo "  in the left sidebar. Right-click any album"
echo "  or playlist → 'Add to collection'."
echo "============================================="
echo
read -r -p "Press Enter to close…"
