// Collections — startup extension that adds "Add to collection" to the right-click
// menu of any album or playlist. Loaded via manifest "subfiles_extension".
// Self-contained: communicates with the Collections app only through LocalStorage.

(function AlbumCollectionsContextMenu() {
    const STORE_KEY = "album-collections:v1";

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
        // Nudge the open app (same-frame) to refresh; cross-frame is covered by the
        // native 'storage' event that fires automatically on other same-origin frames.
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
.acoll-modal-empty{opacity:.6;margin:4px 0 10px;}
`;
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

    function init() {
        new Spicetify.ContextMenu.Item(
            "Add to collection",
            (uris) => openModal(uris),
            (uris) => eligible(uris),
            "plus2px"
        ).register();
    }

    function wait() {
        if (
            !(
                window.Spicetify &&
                Spicetify.ContextMenu &&
                Spicetify.URI &&
                Spicetify.PopupModal &&
                Spicetify.showNotification &&
                Spicetify.LocalStorage
            )
        ) {
            setTimeout(wait, 300);
            return;
        }
        init();
    }
    wait();
})();
