# Collections for Spotify

Group **albums and playlists** into named collections that live in their own
sidebar tab — *without* dumping every track into one big playlist. Each item
stays separate and clickable; open a collection and you get a grid of album/
playlist covers. Click a cover to jump to the real Spotify page.

Built as a [Spicetify](https://spicetify.app) custom app. Works on **macOS,
Windows, and Linux**.

![Collections UI preview](docs/preview.png)

*A collection open in the main view, with the **Collections** button pinned in
Your Library. (UI preview — album art and titles are placeholders.)*

## Install (run once)

First make sure [Spicetify](https://spicetify.app/docs/getting-started) and the
**desktop** Spotify app are installed (not the Microsoft Store / Snap-only build
where applicable). Then, for your OS:

**macOS** — double-click **`install.command`**.
- If macOS blocks it ("unidentified developer"): right-click → **Open** → **Open**.

**Windows** — double-click **`install.bat`**.
- It runs `install.ps1` with the execution policy bypassed for that one run.

**Linux** — run **`install.sh`** in a terminal:
```bash
chmod +x install.sh && ./install.sh
```
- Flatpak/Snap Spotify may need its path set once — the script links the
  [Spicetify Linux notes](https://spicetify.app/docs/advanced-usage/installation) if `apply` fails.

Spotify relaunches and a **Collections** button appears in **Your Library**
(alongside your playlists/albums), plus an icon in the top nav.

## Use

- Right-click any **album** or **playlist** → **Add to collection** → pick one
  (or create a new one in the same popup).
- Click **Collections** in Your Library → click a collection → grid of its items.
- Hover an item → **✕** removes it from that collection.
- Click a cover to open the real album/playlist page. Spotify's back/forward
  buttons work normally (each view is a real route).
- The **✕**/Delete only affect the collection — your actual library is untouched.

## Uninstall

- **macOS:** double-click `uninstall.command`
- **Windows:** double-click `uninstall.bat`
- **Linux:** `./uninstall.sh`

(Your saved collections stay in Spotify's local storage and return if you reinstall.)

## What's inside

```
album-collections/
  manifest.json     sidebar name + icon; loads the context-menu extension at startup
  index.js          the Collections page (React via Spicetify.React, no JSX)
  contextmenu.js    "Add to collection" right-click item + Your Library button
install.command  /  uninstall.command    macOS (double-click)
install.bat      /  uninstall.bat        Windows (double-click → runs the .ps1)
install.ps1      /  uninstall.ps1         Windows PowerShell
install.sh       /  uninstall.sh          Linux / macOS (terminal)
```

All installers do the same thing: copy the app into Spicetify's `CustomApps`
folder (resolved per-OS), register it, and run `spicetify apply`.

Data is stored under the LocalStorage key `album-collections:v1`. Names + cover
art are fetched from Spotify's own Web API (via `Spicetify.CosmosAsync`), with a
fallback to the auth-free `open.spotify.com/oembed` endpoint so covers still load
on clients where the Web API is unavailable.

## Updating after a Spotify update

Spotify auto-updates sometimes wipe Spicetify. If the tab disappears, just run
the installer for your OS again (or `spicetify apply`).
