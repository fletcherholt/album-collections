# Collections for Spotify

Group **albums and playlists** into named collections that live in their own
sidebar tab — *without* dumping every track into one big playlist. Each item
stays separate and clickable; open a collection and you get a grid of album/
playlist covers. Click a cover to jump to the real Spotify page.

Built as a [Spicetify](https://spicetify.app) custom app. macOS.

## Install (run once)

1. Make sure [Spicetify](https://spicetify.app/docs/getting-started) is installed.
2. Double-click **`install.command`**.
   - First time only: if macOS blocks it ("unidentified developer"),
     right-click → **Open** → **Open**.
3. Spotify relaunches. A **Collections** tab appears in the left sidebar.

## Use

- Right-click any **album** or **playlist** → **Add to collection** → pick one
  (or create a new one in the same popup).
- Open the **Collections** tab → click a collection → grid of its items.
- Hover an item → **✕** removes it from that collection.
- The **✕**/Delete only affect the collection — your actual library is untouched.

## Uninstall

Double-click **`uninstall.command`**. (Your saved collections stay in Spotify's
local storage and return if you reinstall.)

## What's inside

```
album-collections/
  manifest.json     sidebar name + icon; loads the context-menu extension at startup
  index.js          the Collections page (React via Spicetify.React, no JSX)
  contextmenu.js    "Add to collection" right-click item
install.command     one-click installer
uninstall.command   one-click remover
```

Data is stored under the LocalStorage key `album-collections:v1`. No network
calls except fetching album/playlist names + cover art from Spotify's own API
(via `Spicetify.CosmosAsync`, using your existing session).

## Updating after a Spotify update

Spotify auto-updates sometimes wipe Spicetify. If the tab disappears, just run
`install.command` again (or `spicetify apply`).
