// Collections (extension build) — one-click Marketplace install.
// Same feature set as the custom-app build, but self-contained in a single
// extension file: it adds a "Collections" button to Your Library + an
// "Add to collection" right-click item, and renders the collections UI as a
// full-screen overlay (Esc or the back button closes it). Shares data with the
// custom-app build via the same LocalStorage key, so either build works.

(function AlbumCollectionsExtension() {
    if (window.__albumCollectionsExt) return;
    window.__albumCollectionsExt = true;

    const STORE_KEY = "album-collections:v1";
    const VERSION = "1.4.0";
    const ICON =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/></svg>';

    // ---------- data ----------
    function loadData() {
        try {
            const d = JSON.parse(Spicetify.LocalStorage.get(STORE_KEY));
            return d && Array.isArray(d.collections) ? d : { collections: [] };
        } catch (e) {
            return { collections: [] };
        }
    }
    function saveData(d) {
        Spicetify.LocalStorage.set(STORE_KEY, JSON.stringify(d));
        try {
            window.dispatchEvent(new Event("storage"));
        } catch (e) {}
    }
    function uid() {
        return "c_" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
    }
    function typeOf(uri) {
        try {
            return String(uri).split(":")[1];
        } catch (e) {
            return "";
        }
    }
    function titleCase(s) {
        return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
    }
    function eligible(uris) {
        return (
            uris.length > 0 &&
            uris.every((u) => {
                const t = typeOf(u);
                return t === "album" || t === "playlist";
            })
        );
    }
    function addTo(coll, uris) {
        const d = loadData();
        const c = d.collections.find((x) => x.id === coll.id);
        if (!c) return 0;
        let n = 0;
        uris.forEach((u) => {
            if (!c.items.includes(u)) {
                c.items.push(u);
                n++;
            }
        });
        saveData(d);
        return n;
    }

    // ---------- sorting ----------
    const SORT_KEY = "album-collections:sort";
    const SORTS = [
        { id: "added-old", label: "Date added (oldest)" },
        { id: "added-new", label: "Date added (newest)" },
        { id: "name-asc", label: "Name A–Z" },
        { id: "name-desc", label: "Name Z–A" },
        { id: "artist-asc", label: "Artist / creator A–Z" },
        { id: "artist-desc", label: "Artist / creator Z–A" },
        { id: "release-new", label: "Release date (newest)" },
        { id: "release-old", label: "Release date (oldest)" },
        { id: "genre-asc", label: "Genre A–Z" },
        { id: "type", label: "Type (albums first)" },
    ];
    function loadSort() {
        const v = Spicetify.LocalStorage.get(SORT_KEY);
        return SORTS.some((s) => s.id === v) ? v : "added-old";
    }
    function saveSort(v) {
        Spicetify.LocalStorage.set(SORT_KEY, v);
    }
    function cmpStr(a, b) {
        return String(a || "").localeCompare(String(b || ""), undefined, {
            sensitivity: "base",
            numeric: true,
        });
    }
    function emptyLast(v) {
        return v ? 0 : 1;
    }
    function sortItems(uris, sortId) {
        const a = uris.map((u, i) => ({ u, i, m: metaCache[u] || {} }));
        a.sort((x, y) => {
            const mx = x.m,
                my = y.m;
            switch (sortId) {
                case "added-new":
                    return y.i - x.i;
                case "name-asc":
                    return cmpStr(mx.name, my.name);
                case "name-desc":
                    return cmpStr(my.name, mx.name);
                case "artist-asc":
                    return cmpStr(mx.artist, my.artist);
                case "artist-desc":
                    return cmpStr(my.artist, mx.artist);
                case "release-new":
                    return emptyLast(mx.release) - emptyLast(my.release) || cmpStr(my.release, mx.release);
                case "release-old":
                    return emptyLast(mx.release) - emptyLast(my.release) || cmpStr(mx.release, my.release);
                case "genre-asc":
                    return emptyLast(mx.genre) - emptyLast(my.genre) || cmpStr(mx.genre, my.genre);
                case "type":
                    return cmpStr(mx.kind, my.kind) || cmpStr(mx.name, my.name);
                case "added-old":
                default:
                    return x.i - y.i;
            }
        });
        return a.map((o) => o.u);
    }

    // ---------- metadata (Web API → oEmbed → fetch) ----------
    const metaCache = {};
    async function artistGenre(artistId) {
        if (!artistId) return "";
        try {
            const a = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/artists/${artistId}`);
            return (a.genres && a.genres[0]) || "";
        } catch (e) {
            return "";
        }
    }
    async function webApi(type, id) {
        if (type === "album") {
            const r = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/albums/${id}`);
            const a0 = (r.artists && r.artists[0]) || {};
            return {
                name: r.name,
                image: (r.images && r.images[0] && r.images[0].url) || "",
                sub: "Album · " + (r.artists || []).map((a) => a.name).join(", "),
                artist: a0.name || "",
                release: r.release_date || "",
                genre: (r.genres && r.genres[0]) || "",
                artistId: a0.id || "",
                kind: "album",
            };
        }
        const r = await Spicetify.CosmosAsync.get(
            `https://api.spotify.com/v1/playlists/${id}?fields=name,images,owner.display_name`
        );
        return {
            name: r.name,
            image: (r.images && r.images[0] && r.images[0].url) || "",
            sub: "Playlist · " + ((r.owner && r.owner.display_name) || ""),
            artist: (r.owner && r.owner.display_name) || "",
            release: "",
            genre: "",
            artistId: "",
            kind: "playlist",
        };
    }
    async function oembed(uri) {
        const url = "https://open.spotify.com/oembed?url=" + encodeURIComponent(uri);
        let o;
        try {
            o = await Spicetify.CosmosAsync.get(url);
        } catch (e) {
            o = await (await fetch(url)).json();
        }
        return { name: o && o.title, image: (o && o.thumbnail_url) || "" };
    }
    async function fetchMeta(uri) {
        if (metaCache[uri]) return metaCache[uri];
        const parts = String(uri).split(":");
        const type = parts[1];
        const id = parts[2];
        const meta = {
            uri, type, id, name: "", image: "", sub: titleCase(type) || "Item",
            artist: "", release: "", genre: "", kind: type || "",
        };
        try {
            const r = await webApi(type, id);
            if (r.name) meta.name = r.name;
            if (r.image) meta.image = r.image;
            if (r.sub) meta.sub = r.sub;
            if (r.artist) meta.artist = r.artist;
            if (r.release) meta.release = r.release;
            if (r.genre) meta.genre = r.genre;
            if (r.kind) meta.kind = r.kind;
            if (type === "album" && !meta.genre && r.artistId) {
                meta.genre = await artistGenre(r.artistId);
            }
        } catch (e) {}
        if (!meta.name || !meta.image) {
            try {
                const o = await oembed(uri);
                if (!meta.name && o.name) meta.name = o.name;
                if (!meta.image && o.image) meta.image = o.image;
            } catch (e) {}
        }
        if (!meta.name) meta.name = "Unknown " + (titleCase(type) || "item");
        metaCache[uri] = meta;
        return meta;
    }

    // ---------- styles ----------
    function injectCss() {
        if (document.getElementById("acoll-style")) return;
        const s = document.createElement("style");
        s.id = "acoll-style";
        s.textContent = `
#acoll-overlay{position:fixed;inset:0;z-index:200;background:var(--spice-main,#121212);color:var(--spice-text,#fff);overflow-y:auto;}
.acoll-ov-top{position:sticky;top:0;display:flex;align-items:center;gap:14px;padding:16px 24px;background:var(--spice-main,#121212);box-shadow:0 6px 12px rgba(0,0,0,.35);z-index:2;}
.acoll-ov-top h1{font-size:24px;margin:0;font-weight:800;}
.acoll-ov-top .ct{opacity:.6;font-size:13px;}
.acoll-ov-top .acoll-ver{opacity:.4;font-size:12px;font-weight:600;}
.acoll-ov-top .sp{flex:1;}
.acoll-body{padding:22px 24px 80px;}
.acoll-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:18px;}
.acoll-card{position:relative;background:var(--spice-card,#181818);border-radius:8px;padding:12px;cursor:pointer;transition:background .2s;}
.acoll-card:hover{background:#282828;}
.acoll-cover{width:100%;aspect-ratio:1/1;border-radius:6px;background-size:cover;background-position:center;background-color:#333;margin-bottom:10px;box-shadow:0 4px 12px rgba(0,0,0,.35);}
.acoll-name{font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.acoll-sub{font-size:12px;opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}
.acoll-x{position:absolute;top:8px;right:8px;border:none;background:rgba(0,0,0,.65);color:#fff;border-radius:50%;width:24px;height:24px;line-height:1;cursor:pointer;opacity:0;transition:opacity .15s;font-size:12px;}
.acoll-card:hover .acoll-x{opacity:1;}
.acoll-list{display:flex;flex-direction:column;gap:8px;max-width:680px;}
.acoll-row{display:flex;align-items:center;gap:14px;padding:14px 18px;background:var(--spice-card,#181818);border-radius:8px;transition:background .2s;}
.acoll-row:hover{background:#222;}
.acoll-row .nm{font-weight:700;font-size:16px;flex:1;cursor:pointer;}
.acoll-row .ct{opacity:.6;font-size:13px;}
.acoll-btn{border:none;border-radius:20px;padding:8px 18px;font-weight:700;cursor:pointer;background:var(--spice-button,#1ed760);color:#000;font-size:13px;}
.acoll-btn:hover{filter:brightness(1.08);}
.acoll-btn.sec{background:transparent;color:var(--spice-text,#fff);border:1px solid rgba(255,255,255,.3);}
.acoll-btn.danger{background:transparent;color:#f25555;border:1px solid rgba(242,85,85,.5);}
.acoll-new{display:flex;gap:8px;margin-top:22px;max-width:680px;}
.acoll-new input{flex:1;padding:10px 14px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:14px;}
.acoll-empty{opacity:.55;margin:28px 0;font-size:15px;}
.acoll-sort{display:flex;align-items:center;gap:8px;font-size:13px;}
.acoll-sort label{opacity:.6;white-space:nowrap;}
.acoll-sort select{appearance:none;-webkit-appearance:none;background:rgba(255,255,255,.08) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='white'><path d='M7 10l5 5 5-5z'/></svg>") no-repeat right 10px center;color:var(--spice-text,#fff);border:1px solid rgba(255,255,255,.2);border-radius:20px;padding:7px 30px 7px 14px;font-size:13px;font-weight:700;cursor:pointer;}
.acoll-sort select:hover{background-color:rgba(255,255,255,.14);}
.acoll-sort select option{background:#282828;color:#fff;}
.acoll-library-btn{display:flex;align-items:center;gap:14px;width:calc(100% - 8px);box-sizing:border-box;padding:8px 12px;margin:2px 4px;background:transparent;border:none;color:var(--spice-subtext,#b3b3b3);cursor:pointer;border-radius:6px;font-size:14px;font-weight:600;font-family:inherit;text-align:left;}
.acoll-library-btn:hover{background:var(--spice-card,rgba(255,255,255,.1));color:var(--spice-text,#fff);}
.acoll-lib-ico{display:flex;align-items:center;justify-content:center;width:24px;height:24px;flex:0 0 24px;}
.acoll-lib-ico svg{width:24px;height:24px;}
.acoll-modal-list{display:flex;flex-direction:column;gap:6px;max-height:46vh;overflow:auto;margin-bottom:6px;}
.acoll-modal-item{text-align:left;padding:11px 14px;border-radius:6px;border:none;background:rgba(255,255,255,.07);color:var(--spice-text,#fff);cursor:pointer;font-size:14px;}
.acoll-modal-item:hover{background:rgba(255,255,255,.16);}
.acoll-modal-new{display:flex;gap:8px;margin-top:14px;}
.acoll-modal-new input{flex:1;padding:9px 12px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:14px;}
.acoll-modal-new button{border:none;border-radius:6px;padding:9px 14px;font-weight:700;background:var(--spice-button,#1ed760);color:#000;cursor:pointer;white-space:nowrap;}
.acoll-modal-empty{opacity:.6;margin:4px 0 10px;}`;
        document.head.appendChild(s);
    }

    // ---------- "Add to collection" popup ----------
    function openAddModal(uris) {
        injectCss();
        const data = loadData();
        const wrap = document.createElement("div");
        const list = document.createElement("div");
        list.className = "acoll-modal-list";
        if (!data.collections.length) {
            const e = document.createElement("p");
            e.className = "acoll-modal-empty";
            e.textContent = "No collections yet — create one below.";
            list.appendChild(e);
        }
        data.collections.forEach((coll) => {
            const b = document.createElement("button");
            b.className = "acoll-modal-item";
            b.textContent = `${coll.name}  (${coll.items.length})`;
            b.onclick = () => {
                const n = addTo(coll, uris);
                Spicetify.showNotification(`Added ${n} to “${coll.name}”`);
                Spicetify.PopupModal.hide();
            };
            list.appendChild(b);
        });
        wrap.appendChild(list);
        const nf = document.createElement("div");
        nf.className = "acoll-modal-new";
        const inp = document.createElement("input");
        inp.type = "text";
        inp.placeholder = "New collection name…";
        const cr = document.createElement("button");
        cr.textContent = "Create & add";
        cr.onclick = () => {
            const nm = inp.value.trim();
            if (!nm) return;
            const d = loadData();
            const coll = { id: uid(), name: nm, items: [] };
            d.collections.push(coll);
            saveData(d);
            addTo(coll, uris);
            Spicetify.showNotification(`Added to “${nm}”`);
            Spicetify.PopupModal.hide();
        };
        inp.addEventListener("keydown", (e) => {
            if (e.key === "Enter") cr.click();
        });
        nf.appendChild(inp);
        nf.appendChild(cr);
        wrap.appendChild(nf);
        Spicetify.PopupModal.display({ title: "Add to collection", content: wrap });
    }

    // ---------- full-screen overlay UI ----------
    let overlay = null;
    let view = { name: "list", collId: null };
    let sortBy = null;

    function makeSortControl() {
        if (sortBy === null) sortBy = loadSort();
        const wrap = document.createElement("div");
        wrap.className = "acoll-sort";
        const label = document.createElement("label");
        label.textContent = "Sort by";
        const sel = document.createElement("select");
        SORTS.forEach((s) => {
            const o = document.createElement("option");
            o.value = s.id;
            o.textContent = s.label;
            if (s.id === sortBy) o.selected = true;
            sel.appendChild(o);
        });
        sel.onchange = () => {
            sortBy = sel.value;
            saveSort(sortBy);
            renderOverlay();
        };
        wrap.append(label, sel);
        return wrap;
    }

    function makeCard(uri, onRemove) {
        const card = document.createElement("div");
        card.className = "acoll-card";
        const cover = document.createElement("div");
        cover.className = "acoll-cover";
        const name = document.createElement("div");
        name.className = "acoll-name";
        name.textContent = "Loading…";
        const sub = document.createElement("div");
        sub.className = "acoll-sub";
        const x = document.createElement("button");
        x.className = "acoll-x";
        x.title = "Remove from collection";
        x.textContent = "✕";
        x.onclick = (e) => {
            e.stopPropagation();
            onRemove(uri);
        };
        card.appendChild(cover);
        card.appendChild(name);
        card.appendChild(sub);
        card.appendChild(x);
        fetchMeta(uri).then((m) => {
            name.textContent = m.name;
            sub.textContent = m.sub;
            if (m.image) cover.style.backgroundImage = `url("${m.image}")`;
            const open = () => {
                try {
                    Spicetify.Platform.History.push(`/${m.type}/${m.id}`);
                } catch (e) {}
                closeOverlay();
            };
            cover.onclick = open;
            name.onclick = open;
        });
        return card;
    }

    function renderOverlay() {
        if (!overlay) return;
        overlay.innerHTML = "";
        const data = loadData();
        const top = document.createElement("div");
        top.className = "acoll-ov-top";
        const body = document.createElement("div");
        body.className = "acoll-body";

        const coll = view.name === "coll" ? data.collections.find((c) => c.id === view.collId) : null;

        if (coll) {
            const back = document.createElement("button");
            back.className = "acoll-btn sec";
            back.textContent = "← Back";
            back.onclick = () => {
                view = { name: "list", collId: null };
                renderOverlay();
            };
            const h1 = document.createElement("h1");
            h1.textContent = coll.name;
            const ct = document.createElement("span");
            ct.className = "ct";
            ct.textContent = coll.items.length + " items";
            const sp = document.createElement("span");
            sp.className = "sp";
            const close = makeCloseBtn();
            top.append(back, h1, ct, sp);
            if (coll.items.length) top.append(makeSortControl());
            top.append(close);

            if (!coll.items.length) {
                const e = document.createElement("div");
                e.className = "acoll-empty";
                e.textContent = "Empty. Right-click any album or playlist → “Add to collection”.";
                body.appendChild(e);
            } else {
                // Sort needs metadata; fetch any missing then re-render once.
                const allCached = coll.items.every((u) => metaCache[u]);
                if (!allCached) {
                    Promise.all(coll.items.map(fetchMeta)).then(() => {
                        if (overlay && view.name === "coll" && view.collId === coll.id) renderOverlay();
                    });
                }
                const grid = document.createElement("div");
                grid.className = "acoll-grid";
                sortItems(coll.items, sortBy || loadSort()).forEach((uri) =>
                    grid.appendChild(
                        makeCard(uri, (u) => {
                            const d = loadData();
                            const c = d.collections.find((x) => x.id === coll.id);
                            if (c) {
                                c.items = c.items.filter((i) => i !== u);
                                saveData(d);
                            }
                            renderOverlay();
                        })
                    )
                );
                body.appendChild(grid);
            }
        } else {
            const h1 = document.createElement("h1");
            h1.textContent = "Collections";
            const ver = document.createElement("span");
            ver.className = "acoll-ver";
            ver.title = "Installed version";
            ver.textContent = "v" + VERSION;
            const sp = document.createElement("span");
            sp.className = "sp";
            top.append(h1, ver, sp, makeCloseBtn());

            if (!data.collections.length) {
                const e = document.createElement("div");
                e.className = "acoll-empty";
                e.textContent =
                    "No collections yet. Create one below, then right-click any album or playlist → “Add to collection”.";
                body.appendChild(e);
            } else {
                const listEl = document.createElement("div");
                listEl.className = "acoll-list";
                data.collections.forEach((c) => {
                    const row = document.createElement("div");
                    row.className = "acoll-row";
                    const nm = document.createElement("span");
                    nm.className = "nm";
                    nm.textContent = c.name;
                    nm.onclick = () => {
                        view = { name: "coll", collId: c.id };
                        renderOverlay();
                    };
                    const ct = document.createElement("span");
                    ct.className = "ct";
                    ct.textContent = c.items.length + " items";
                    const open = document.createElement("button");
                    open.className = "acoll-btn";
                    open.textContent = "Open";
                    open.onclick = nm.onclick;
                    const del = document.createElement("button");
                    del.className = "acoll-btn danger";
                    del.textContent = "Delete";
                    del.onclick = () => {
                        const d = loadData();
                        d.collections = d.collections.filter((x) => x.id !== c.id);
                        saveData(d);
                        renderOverlay();
                    };
                    row.append(nm, ct, open, del);
                    listEl.appendChild(row);
                });
                body.appendChild(listEl);
            }

            const newWrap = document.createElement("div");
            newWrap.className = "acoll-new";
            const inp = document.createElement("input");
            inp.type = "text";
            inp.placeholder = "New collection name…";
            const create = document.createElement("button");
            create.className = "acoll-btn";
            create.textContent = "Create";
            const doCreate = () => {
                const nm = inp.value.trim();
                if (!nm) return;
                const d = loadData();
                d.collections.push({ id: uid(), name: nm, items: [] });
                saveData(d);
                inp.value = "";
                renderOverlay();
            };
            create.onclick = doCreate;
            inp.addEventListener("keydown", (e) => {
                if (e.key === "Enter") doCreate();
            });
            newWrap.append(inp, create);
            body.appendChild(newWrap);
        }

        overlay.append(top, body);
    }

    function makeCloseBtn() {
        const c = document.createElement("button");
        c.className = "acoll-btn sec";
        c.textContent = "✕ Close";
        c.onclick = () => closeOverlay();
        return c;
    }

    function onKey(e) {
        if (e.key === "Escape") closeOverlay();
    }
    function onPop() {
        closeOverlay(true);
    }
    function openOverlay() {
        injectCss();
        if (overlay) return;
        view = { name: "list", collId: null };
        overlay = document.createElement("div");
        overlay.id = "acoll-overlay";
        document.body.appendChild(overlay);
        renderOverlay();
        document.addEventListener("keydown", onKey);
        window.addEventListener("popstate", onPop);
        try {
            history.pushState({ acoll: true }, "");
        } catch (e) {}
    }
    function closeOverlay(fromPop) {
        if (!overlay) return;
        overlay.remove();
        overlay = null;
        document.removeEventListener("keydown", onKey);
        window.removeEventListener("popstate", onPop);
        if (!fromPop) {
            try {
                if (history.state && history.state.acoll) history.back();
            } catch (e) {}
        }
    }

    // ---------- Your Library button ----------
    function findLibraryList() {
        return (
            document.querySelector(".main-yourLibraryX-libraryRootlist") ||
            document.querySelector('[aria-label="Your Library"] [role="list"]') ||
            document.querySelector(".main-yourLibraryX-libraryItemContainer") ||
            document.querySelector('aside [role="presentation"] [role="list"]')
        );
    }
    function injectLibraryButton() {
        if (document.getElementById("acoll-library-btn")) return;
        const list = findLibraryList();
        if (!list || !list.parentElement) return;
        const btn = document.createElement("button");
        btn.id = "acoll-library-btn";
        btn.className = "acoll-library-btn";
        btn.title = "Collections";
        const ico = document.createElement("span");
        ico.className = "acoll-lib-ico";
        ico.innerHTML = ICON;
        const label = document.createElement("span");
        label.textContent = "Collections";
        btn.append(ico, label);
        btn.addEventListener("click", openOverlay);
        list.parentElement.insertBefore(btn, list);
    }

    // ---------- boot ----------
    function ready() {
        return (
            window.Spicetify &&
            Spicetify.ContextMenu &&
            Spicetify.PopupModal &&
            Spicetify.showNotification &&
            Spicetify.LocalStorage &&
            Spicetify.Platform &&
            Spicetify.Platform.History
        );
    }
    function boot() {
        if (!ready()) {
            setTimeout(boot, 300);
            return;
        }
        injectCss();
        if (!window.__acollContextRegistered) {
            window.__acollContextRegistered = true;
            new Spicetify.ContextMenu.Item(
                "Add to collection",
                (uris) => openAddModal(uris),
                (uris) => eligible(uris),
                "plus2px"
            ).register();
        }
        injectLibraryButton();
        new MutationObserver(() => injectLibraryButton()).observe(document.body, {
            childList: true,
            subtree: true,
        });
        window.addEventListener("storage", () => {
            if (overlay) renderOverlay();
        });
    }

    // --- update check -------------------------------------------------------
    // Marketplace installs auto-update (the Marketplace re-loads this file from
    // jsDelivr@main on each launch). This check covers manual/installer copies:
    // once a day it reads the repo manifest version and, if newer, notifies.
    async function checkForUpdate() {
        try {
            const KEY = "album-collections:last-update-check";
            const DAY = 24 * 60 * 60 * 1000;
            const last = parseInt(localStorage.getItem(KEY) || "0", 10);
            if (Date.now() - last < DAY) return;
            localStorage.setItem(KEY, String(Date.now()));

            const url =
                "https://raw.githubusercontent.com/fletcherholt/album-collections/main/manifest.json";
            const data = await fetch(url + "?t=" + Date.now()).then((r) => r.json());
            const entry = Array.isArray(data) ? data[0] : data;
            const remote = entry && entry.version;
            if (!remote) return;

            const newer = (a, b) => {
                const pa = String(a).split(".").map(Number);
                const pb = String(b).split(".").map(Number);
                for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
                    const x = pa[i] || 0, y = pb[i] || 0;
                    if (x > y) return true;
                    if (x < y) return false;
                }
                return false;
            };

            if (newer(remote, VERSION) && Spicetify?.showNotification) {
                Spicetify.showNotification(
                    `Collections v${remote} is available (you have v${VERSION}). ` +
                    `Restart Spotify to update — or re-run the installer if you installed manually.`
                );
            }
        } catch (_) {
            // network/parse errors are non-fatal; try again tomorrow
        }
    }

    boot();
    checkForUpdate();
})();
