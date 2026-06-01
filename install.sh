#!/usr/bin/env bash
# Collections for Spotify — installer for Linux (and macOS).
# Run in a terminal:  ./install.sh

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
    echo "✗ Spicetify is not installed or not on PATH."
    echo "  Install it first:  https://spicetify.app/docs/getting-started"
    exit 1
fi
echo "✓ Spicetify: $SPICETIFY"

# --- locate CustomApps dir ---
USERDATA="$("$SPICETIFY" path userdata 2>/dev/null | tr -d '\r')"
if [ -z "$USERDATA" ] || [ ! -d "$USERDATA" ]; then
    if [ -n "${XDG_CONFIG_HOME:-}" ] && [ -d "$XDG_CONFIG_HOME/spicetify" ]; then
        USERDATA="$XDG_CONFIG_HOME/spicetify"
    elif [ -d "$HOME/.config/spicetify" ]; then
        USERDATA="$HOME/.config/spicetify"
    else
        USERDATA="$HOME/.config/spicetify"
    fi
fi
APPS="$USERDATA/CustomApps"
mkdir -p "$APPS"
echo "✓ Target: $APPS/album-collections"

# --- copy app ---
rm -rf "$APPS/album-collections"
cp -R "$DIR/album-collections" "$APPS/album-collections"
echo "✓ Files copied"

# --- register (only if not already listed) ---
CUR="$("$SPICETIFY" config custom_apps 2>/dev/null | tr -d '\r')"
case "|$CUR|" in
    *album-collections*) echo "✓ Already registered" ;;
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
    echo "✗ 'spicetify apply' failed."
    echo "  On Linux a Flatpak/Snap Spotify often needs its path set first — see:"
    echo "    https://spicetify.app/docs/advanced-usage/installation#spotify-installed-from-flatpak"
    echo "  Then re-run this script."
    exit 1
fi

echo
echo "Done. Open Spotify → 'Collections' is in Your Library (and the top nav)."
echo "Right-click any album or playlist → 'Add to collection'."
