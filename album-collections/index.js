// Collections — group albums & playlists into a sidebar tab without merging tracks.
// Raw Spicetify custom app: render() returns a React component via Spicetify.React.createElement (no JSX).

const react = Spicetify.React;
const h = react.createElement;

const STORE_KEY = "album-collections:v1";
const APP_ROUTE = "/album-collections";
const VERSION = "1.1.0";

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
}
function uid() {
    return "c_" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}
function titleCase(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Which collection is open is encoded in the URL (?c=<id>) so Spotify's own
// back/forward buttons work and re-entering the app restores the view.
function readCollParam() {
    try {
        const loc = Spicetify.Platform.History.location;
        const search = (loc && loc.search) || "";
        return new URLSearchParams(search).get("c");
    } catch (e) {
        return null;
    }
}
function goToCollection(id) {
    Spicetify.Platform.History.push(`${APP_ROUTE}?c=${encodeURIComponent(id)}`);
}
function goToList() {
    Spicetify.Platform.History.push(APP_ROUTE);
}

// ---- sorting ----
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
    return String(a || "").localeCompare(String(b || ""), undefined, { sensitivity: "base", numeric: true });
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

// ---- metadata fetch (cached, with fallbacks) ----
// Spotify's Web API via CosmosAsync is richest but is broken on some clients
// (spicetify/cli#1735), so we fall back to the auth-free oEmbed endpoint, which
// reliably returns a title + cover art for albums and playlists.
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
    } catch (e) {
        /* fall through to oembed */
    }
    if (!meta.name || !meta.image) {
        try {
            const o = await oembed(uri);
            if (!meta.name && o.name) meta.name = o.name;
            if (!meta.image && o.image) meta.image = o.image;
        } catch (e) {
            /* leave defaults */
        }
    }
    if (!meta.name) meta.name = "Unknown " + (titleCase(type) || "item");
    metaCache[uri] = meta;
    return meta;
}

// ---- styles ----
function injectCss() {
    if (document.getElementById("acoll-style")) return;
    const s = document.createElement("style");
    s.id = "acoll-style";
    s.textContent = `
.acoll-wrap{padding:16px 24px 80px;color:var(--spice-text,#fff);}
.acoll-h{display:flex;align-items:center;gap:14px;margin-bottom:22px;}
.acoll-h h1{font-size:26px;margin:0;font-weight:800;}
.acoll-h .ct{opacity:.6;font-size:13px;}
.acoll-ver{opacity:.4;font-size:12px;font-weight:600;align-self:flex-end;padding-bottom:4px;}
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
.acoll-h-sp{flex:1;}
.acoll-sort{display:flex;align-items:center;gap:8px;font-size:13px;}
.acoll-sort label{opacity:.6;white-space:nowrap;}
.acoll-sort select{appearance:none;-webkit-appearance:none;background:rgba(255,255,255,.08) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='white'><path d='M7 10l5 5 5-5z'/></svg>") no-repeat right 10px center;color:var(--spice-text,#fff);border:1px solid rgba(255,255,255,.2);border-radius:20px;padding:7px 30px 7px 14px;font-size:13px;font-weight:700;cursor:pointer;}
.acoll-sort select:hover{background-color:rgba(255,255,255,.14);}
.acoll-sort select option{background:#282828;color:#fff;}
`;
    document.head.appendChild(s);
}

// ---- card ----
function Card(props) {
    const uri = props.uri;
    const [m, setM] = react.useState(metaCache[uri] || null);
    react.useEffect(() => {
        let live = true;
        fetchMeta(uri).then((x) => {
            if (live) setM(x);
        });
        return () => {
            live = false;
        };
    }, [uri]);
    const open = () => {
        if (m) Spicetify.Platform.History.push(`/${m.type}/${m.id}`);
    };
    return h(
        "div",
        { className: "acoll-card" },
        h("div", {
            className: "acoll-cover",
            style: { backgroundImage: m && m.image ? `url("${m.image}")` : "none" },
            onClick: open,
        }),
        h("div", { className: "acoll-name", onClick: open }, m ? m.name : "Loading…"),
        h("div", { className: "acoll-sub" }, m ? m.sub : ""),
        h(
            "button",
            {
                className: "acoll-x",
                title: "Remove from collection",
                onClick: (e) => {
                    e.stopPropagation();
                    props.onRemove(uri);
                },
            },
            "✕"
        )
    );
}

// ---- app ----
function App() {
    const [data, setData] = react.useState(loadData);
    const [, force] = react.useReducer((x) => x + 1, 0);
    const [newName, setNewName] = react.useState("");
    const [sortBy, setSortBy] = react.useState(loadSort);

    react.useEffect(() => {
        injectCss();
        const refresh = () => setData(loadData());
        window.addEventListener("storage", refresh);
        let unlisten = null;
        try {
            unlisten = Spicetify.Platform.History.listen(() => force());
        } catch (e) {
            /* History unavailable — internal nav still works via re-render */
        }
        return () => {
            window.removeEventListener("storage", refresh);
            if (unlisten) unlisten();
        };
    }, []);

    const persist = (d) => {
        saveData(d);
        setData(d);
    };
    const createColl = () => {
        const n = newName.trim();
        if (!n) return;
        const d = loadData();
        d.collections.push({ id: uid(), name: n, items: [] });
        persist(d);
        setNewName("");
    };
    const delColl = (id) => {
        const d = loadData();
        d.collections = d.collections.filter((c) => c.id !== id);
        persist(d);
        if (readCollParam() === id) goToList();
    };
    const removeItem = (collId, uri) => {
        const d = loadData();
        const c = d.collections.find((x) => x.id === collId);
        if (c) {
            c.items = c.items.filter((u) => u !== uri);
            persist(d);
        }
    };

    const openId = readCollParam();
    const coll = openId ? data.collections.find((c) => c.id === openId) : null;

    // Sorting needs metadata; prefetch any missing items then re-render once.
    react.useEffect(() => {
        if (!coll) return;
        const missing = coll.items.filter((u) => !metaCache[u]);
        if (!missing.length) return;
        let live = true;
        Promise.all(coll.items.map(fetchMeta)).then(() => {
            if (live) force();
        });
        return () => {
            live = false;
        };
    }, [openId, coll ? coll.items.length : 0]);

    const changeSort = (v) => {
        setSortBy(v);
        saveSort(v);
    };
    const sortControl = h(
        "div",
        { className: "acoll-sort" },
        h("label", null, "Sort by"),
        h(
            "select",
            { value: sortBy, onChange: (e) => changeSort(e.target.value) },
            SORTS.map((s) => h("option", { key: s.id, value: s.id }, s.label))
        )
    );

    // ---- single collection view ----
    if (coll) {
        return h(
            "div",
            { className: "acoll-wrap" },
            h(
                "div",
                { className: "acoll-h" },
                h("button", { className: "acoll-btn sec", onClick: goToList }, "← Back"),
                h("h1", null, coll.name),
                h("span", { className: "ct" }, coll.items.length + " items"),
                coll.items.length > 0 ? h("span", { className: "acoll-h-sp" }) : null,
                coll.items.length > 0 ? sortControl : null
            ),
            coll.items.length === 0
                ? h(
                      "div",
                      { className: "acoll-empty" },
                      "Empty. Right-click any album or playlist → “Add to collection”."
                  )
                : h(
                      "div",
                      { className: "acoll-grid" },
                      sortItems(coll.items, sortBy).map((uri) =>
                          h(Card, { key: uri, uri: uri, onRemove: (u) => removeItem(coll.id, u) })
                      )
                  )
        );
    }

    // ---- collections list view ----
    return h(
        "div",
        { className: "acoll-wrap" },
        h(
            "div",
            { className: "acoll-h" },
            h("h1", null, "Collections"),
            h("span", { className: "acoll-ver", title: "Installed version" }, "v" + VERSION)
        ),
        data.collections.length === 0
            ? h(
                  "div",
                  { className: "acoll-empty" },
                  "No collections yet. Create one below, then right-click any album or playlist → “Add to collection”."
              )
            : h(
                  "div",
                  { className: "acoll-list" },
                  data.collections.map((c) =>
                      h(
                          "div",
                          { className: "acoll-row", key: c.id },
                          h("span", { className: "nm", onClick: () => goToCollection(c.id) }, c.name),
                          h("span", { className: "ct" }, c.items.length + " items"),
                          h("button", { className: "acoll-btn", onClick: () => goToCollection(c.id) }, "Open"),
                          h("button", { className: "acoll-btn danger", onClick: () => delColl(c.id) }, "Delete")
                      )
                  )
              ),
        h(
            "div",
            { className: "acoll-new" },
            h("input", {
                type: "text",
                placeholder: "New collection name…",
                value: newName,
                onChange: (e) => setNewName(e.target.value),
                onKeyDown: (e) => {
                    if (e.key === "Enter") createColl();
                },
            }),
            h("button", { className: "acoll-btn", onClick: createColl }, "Create")
        )
    );
}

function render() {
    return h(App);
}
