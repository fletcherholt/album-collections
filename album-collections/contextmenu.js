// Collections — startup extension. Two jobs:
//   1. Add "Add to collection" to the right-click menu of any album or playlist.
//   2. Pin a "Collections" button into the "Your Library" sidebar.
// Self-contained: talks to the Collections app only through LocalStorage + the router.

(function AlbumCollectionsExtension() {
    const STORE_KEY = "album-collections:v1";
    const APP_ROUTE = "/album-collections";
    const ICON =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/></svg>';

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

    // ---------- context-menu popup ----------
    function injectModalCss() {
        if (document.getElementById("acoll-modal-style")) return;
        const s = document.createElement("style");
        s.id = "acoll-modal-style";
        s.textContent = `
.acoll-modal-list{display:flex;flex-direction:column;gap:6px;max-height:46vh;overflow:auto;margin-bottom:6px;}
.acoll-modal-item{text-align:left;padding:11px 14px;border-radius:6px;border:none;background:rgba(255,255,255,.07);color:var(--spice-text,#fff);cursor:pointer;font-size:14px;}
.acoll-modal-item:hover{background:rgba(255,255,255,.16);}
.acoll-modal-new{display:flex;gap:8px;margin-top:14px;}
.acoll-modal-new input{flex:1;padding:9px 12px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:14px;}
.acoll-modal-new button{border:none;border-radius:6px;padding:9px 14px;font-weight:700;background:var(--spice-button,#1ed760);color:#000;cursor:pointer;white-space:nowrap;}
.acoll-modal-empty{opacity:.6;margin:4px 0 10px;}`;
        document.head.appendChild(s);
    }

    function openModal(uris) {
        injectModalCss();
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

    function registerContextMenu() {
        // Guard against double registration if the extension build is also installed.
        if (window.__acollContextRegistered) return;
        window.__acollContextRegistered = true;
        new Spicetify.ContextMenu.Item(
            "Add to collection",
            (uris) => openModal(uris),
            (uris) => eligible(uris),
            "plus2px"
        ).register();
    }

    // ---------- "Your Library" sidebar button ----------
    function injectLibraryCss() {
        if (document.getElementById("acoll-lib-style")) return;
        const s = document.createElement("style");
        s.id = "acoll-lib-style";
        s.textContent = `
.acoll-library-btn{display:flex;align-items:center;gap:14px;width:calc(100% - 8px);box-sizing:border-box;padding:8px 12px;margin:2px 4px;background:transparent;border:none;color:var(--spice-subtext,#b3b3b3);cursor:pointer;border-radius:6px;font-size:14px;font-weight:600;font-family:inherit;text-align:left;}
.acoll-library-btn:hover{background:var(--spice-card,rgba(255,255,255,.1));color:var(--spice-text,#fff);}
.acoll-library-btn.active{color:var(--spice-text,#fff);}
.acoll-lib-ico{display:flex;align-items:center;justify-content:center;width:24px;height:24px;flex:0 0 24px;}
.acoll-lib-ico svg{width:24px;height:24px;}`;
        document.head.appendChild(s);
    }

    function findLibraryList() {
        return (
            document.querySelector(".main-yourLibraryX-libraryRootlist") ||
            document.querySelector('[aria-label="Your Library"] [role="list"]') ||
            document.querySelector(".main-yourLibraryX-libraryItemContainer") ||
            document.querySelector('aside [role="presentation"] [role="list"]')
        );
    }

    function makeLibraryButton() {
        const btn = document.createElement("button");
        btn.id = "acoll-library-btn";
        btn.className = "acoll-library-btn";
        btn.title = "Collections";
        const ico = document.createElement("span");
        ico.className = "acoll-lib-ico";
        ico.innerHTML = ICON;
        const label = document.createElement("span");
        label.className = "acoll-lib-label";
        label.textContent = "Collections";
        btn.appendChild(ico);
        btn.appendChild(label);
        btn.addEventListener("click", () => {
            try {
                Spicetify.Platform.History.push(APP_ROUTE);
            } catch (e) {}
        });
        return btn;
    }

    function injectLibraryButton() {
        if (document.getElementById("acoll-library-btn")) return;
        const list = findLibraryList();
        // Insert just ABOVE the (virtualised) list so Spotify doesn't recycle it away.
        if (list && list.parentElement) {
            list.parentElement.insertBefore(makeLibraryButton(), list);
        }
    }

    function startLibraryButton() {
        injectLibraryCss();
        injectLibraryButton();
        const obs = new MutationObserver(() => injectLibraryButton());
        obs.observe(document.body, { childList: true, subtree: true });
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
        registerContextMenu();
        startLibraryButton();
    }
    boot();
})();
