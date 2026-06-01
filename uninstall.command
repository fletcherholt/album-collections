#!/bin/bash
# Collections for Spotify — uninstaller. Double-click in Finder.

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
    read -r -p "Press Enter to close…"
    exit 1
fi

USERDATA="$("$SPICETIFY" path userdata 2>/dev/null | tr -d '\r')"
[ -z "$USERDATA" ] && USERDATA="$HOME/.config/spicetify"
rm -rf "$USERDATA/CustomApps/album-collections"
echo "✓ App files removed"

# Drop it from the custom_apps list, preserving any others.
CUR="$("$SPICETIFY" config custom_apps 2>/dev/null | tr -d '\r')"
NEW="$(printf '%s' "$CUR" | tr '|' '\n' | grep -v '^album-collections$' | paste -sd '|' -)"
"$SPICETIFY" config custom_apps "$NEW" >/dev/null 2>&1
"$SPICETIFY" apply 2>/dev/null
echo "✓ Unregistered & re-applied"
echo
echo "Note: your saved collections stay in Spotify's local storage."
echo "They'll reappear if you reinstall."
read -r -p "Press Enter to close…"
