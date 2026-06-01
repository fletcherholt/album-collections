#!/usr/bin/env bash
# Collections for Spotify — remote one-line installer (macOS / Linux).
# Run:
#   bash <(curl -fsSL https://raw.githubusercontent.com/fletcherholt/album-collections/main/install-remote.sh)

set -u
REPO="fletcherholt/album-collections"
BRANCH="main"

echo "============================================="
echo "  Collections for Spotify — remote installer"
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

# --- download the app from GitHub ---
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
echo "Downloading latest from github.com/$REPO …"
if ! curl -fsSL "https://codeload.github.com/$REPO/tar.gz/refs/heads/$BRANCH" | tar xz -C "$TMP"; then
    echo "✗ Download failed. Check your connection and try again."
    exit 1
fi
SRC="$TMP/$(basename "$REPO")-$BRANCH/album-collections"
if [ ! -d "$SRC" ]; then
    echo "✗ Couldn't find the app folder in the download."
    exit 1
fi
echo "✓ Downloaded"

# --- locate CustomApps dir ---
USERDATA="$("$SPICETIFY" path userdata 2>/dev/null | tr -d '\r')"
if [ -z "$USERDATA" ] || [ ! -d "$USERDATA" ]; then
    USERDATA="${XDG_CONFIG_HOME:-$HOME/.config}/spicetify"
fi
APPS="$USERDATA/CustomApps"
mkdir -p "$APPS"

# --- install ---
rm -rf "$APPS/album-collections"
cp -R "$SRC" "$APPS/album-collections"
echo "✓ Installed to $APPS/album-collections"

CUR="$("$SPICETIFY" config custom_apps 2>/dev/null | tr -d '\r')"
case "|$CUR|" in
    *album-collections*) echo "✓ Already registered" ;;
    *) "$SPICETIFY" config custom_apps album-collections >/dev/null 2>&1; echo "✓ Registered" ;;
esac

echo
echo "Applying to Spotify (this may relaunch Spotify)…"
if "$SPICETIFY" apply 2>/dev/null; then
    echo "✓ Applied"
elif "$SPICETIFY" backup apply; then
    echo "✓ Backed up & applied"
else
    echo "✗ 'spicetify apply' failed — see https://spicetify.app/docs/getting-started"
    exit 1
fi

echo
echo "Done. Open Spotify → 'Collections' is in Your Library (and the top nav)."
