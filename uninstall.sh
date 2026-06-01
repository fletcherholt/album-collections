#!/usr/bin/env bash
# Collections for Spotify — uninstaller for Linux (and macOS). Run: ./uninstall.sh

set -u
echo "Removing Collections for Spotify…"

SPICETIFY=""
if command -v spicetify >/dev/null 2>&1; then
    SPICETIFY="$(command -v spicetify)"
elif [ -x "$HOME/.spicetify/spicetify" ]; then
    SPICETIFY="$HOME/.spicetify/spicetify"
fi
if [ -z "$SPICETIFY" ]; then
    echo "✗ Spicetify not found — nothing to do."
    exit 1
fi

USERDATA="$("$SPICETIFY" path userdata 2>/dev/null | tr -d '\r')"
if [ -z "$USERDATA" ] || [ ! -d "$USERDATA" ]; then
    USERDATA="${XDG_CONFIG_HOME:-$HOME/.config}/spicetify"
fi
rm -rf "$USERDATA/CustomApps/album-collections"
echo "✓ App files removed"

CUR="$("$SPICETIFY" config custom_apps 2>/dev/null | tr -d '\r')"
NEW="$(printf '%s' "$CUR" | tr '|' '\n' | grep -v '^album-collections$' | paste -sd '|' -)"
"$SPICETIFY" config custom_apps "$NEW" >/dev/null 2>&1
"$SPICETIFY" apply 2>/dev/null
echo "✓ Unregistered & re-applied"
echo "Note: saved collections stay in Spotify's local storage and return if you reinstall."
