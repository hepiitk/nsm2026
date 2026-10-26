/* =====================================================================
   js/editor.js — the visual editor of the NSM 2026 website
   ---------------------------------------------------------------------
   Open it with  edit.html  (it is also built into the preview file).
   Visitors of the live website never load this file.

   What you can do with it
   • See every page exactly as visitors see it (Preview).
   • Edit: click any text and type; select any block to move, copy,
     hide or delete it; change photos and links; add paragraphs,
     headings, lists, buttons, images, tables or whole sections; edit
     the HTML of any block, any page or any file (CSS, JS, README …);
     change colours and fonts; add or remove pages; find and replace
     across the whole site.
   • The header and footer stay the same on every page automatically.
   • Undo and redo everything.
   • Save straight into your website folder (Chrome, Edge), or download
     the whole website — or only the changed files — as a .zip.

   You never need to edit this file to change the website.
   Sections:  1 Settings · 2 Helpers · 3 Files · 4 HTML writer ·
   5 Showing a page · 6 Preview links · 7 Editing · 8 Blocks ·
   9 Text formatting · 10 Saving changes, undo, shared header/footer ·
   11 Dialogs · 12 Saving files · 13 Drafts · 14 Interface · 15 Start
   ===================================================================== */

(function () {
  "use strict";

  /* =================================================================
     1. SETTINGS
     ================================================================= */
  var CONFIG = {
    /* Pages in menu order; other .html files at the top level follow. */
    pageOrder: ["index.html", "registration.html", "speakers.html", "shortlisted.html", "participants.html", "schedule.html", "venue-organizers.html", "gallery.html"],
    /* Parts that are identical on every page and kept in step. */
    sharedParts: ["body > a.skip-link", "body > header.masthead", "body > footer.site-footer"],
    /* Files that belong to the editor itself (not pages of the site). */
    editorFiles: ["edit.html"],
    /* Where new photos and documents are stored. */
    imageFolder: "assets/images/uploads/",
    fileFolder: "assets/docs/",
    galleryFolder: "assets/images/gallery/",   /* gallery photos; small copies go in its thumbs/ folder */
    thumbSide: 800,                            /* longest side of the small copies (pixels) */
    /* Photos larger than this (pixels, longest side) are scaled down. */
    maxImageSide: 2000,
    jpegQuality: 0.86,
    /* The stylesheet whose :root colours and fonts "Colours & fonts" edits. */
    themeFile: "css/style.css",
    /* Folder name inside downloaded .zip files. */
    zipFolder: "nsm2026-iitk",
    draftKey: "nsm2026-editor-draft"
  };


  /* =================================================================
     2. HELPERS
     ================================================================= */
  var D = document;
  var HTML_NS = "http://www.w3.org/1999/xhtml";
  function qs(sel, root) { return (root || D).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || D).querySelectorAll(sel)); }
  function kids(node) { return Array.prototype.slice.call(node.childNodes); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function toSet(s) { var o = Object.create(null); s.split(/\s+/).forEach(function (k) { if (k) o[k] = 1; }); return o; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function isWs(n) { return n && n.nodeType === 3 && !/\S/.test(n.data); }
  function remove(n) { if (n && n.parentNode) n.parentNode.removeChild(n); }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : (many || one + "s")); }

  var enc = new TextEncoder(), dec = new TextDecoder();
  function bytesToB64(bytes) {
    var s = "", CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s);
  }
  function b64ToBytes(b64) {
    var s = atob(b64), out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  var MIME = {
    html: "text/html", htm: "text/html", css: "text/css", js: "text/javascript", mjs: "text/javascript",
    json: "application/json", md: "text/markdown", txt: "text/plain", svg: "image/svg+xml", xml: "application/xml",
    csv: "text/csv", tex: "text/plain", bib: "text/plain", webmanifest: "application/manifest+json",
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", avif: "image/avif",
    ico: "image/x-icon", woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf",
    pdf: "application/pdf", zip: "application/zip", mp4: "video/mp4", webm: "video/webm", mp3: "audio/mpeg",
    ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  };
  var TEXT_EXT = toSet("html htm css js mjs json md txt svg xml csv tex bib webmanifest");
  var IMAGE_EXT = toSet("png jpg jpeg gif webp avif svg ico");
  function extOf(p) { var m = /\.([a-z0-9]+)$/i.exec(p); return m ? m[1].toLowerCase() : ""; }
  function mimeOf(p) { return MIME[extOf(p)] || "application/octet-stream"; }
  function isTextPath(p) { return !!TEXT_EXT[extOf(p)]; }
  function isImagePath(p) { return !!IMAGE_EXT[extOf(p)]; }
  function isPagePath(p) { return /^[^/]+\.html?$/i.test(p) && CONFIG.editorFiles.indexOf(p) < 0; }


  /* =================================================================
     3. FILES AND STATE
     Every file of the website is a record { path, text } or
     { path, b64 }. Records are never changed in place: a change makes
     a new record, which keeps undo simple.
     ================================================================= */
  var nextId = 1;
  function makeRecord(path, data) {
    return { id: nextId++, path: path, type: mimeOf(path), text: data.text != null ? data.text : null, b64: data.text != null ? null : (data.b64 || "") };
  }
  function recordBytes(r) { return r.text != null ? enc.encode(r.text) : b64ToBytes(r.b64); }
  function sameContent(a, b) { return a === b || (!!a && !!b && (a.text != null ? a.text === b.text : a.b64 === b.b64)); }

  var S = {
    files: Object.create(null),   /* path -> record, as edited */
    orig: Object.create(null),    /* path -> record, as loaded or last saved */
    page: "index.html",
    mode: "preview",              /* "preview" | "edit" */
    origin: "",                   /* "embedded" | "folder" */
    dir: null,                    /* folder handle when saving into the folder is possible */
    history: [], future: [],
    showHidden: false,
    syncShared: true,
    sel: null,                    /* the selected block */
    leaf: null,                   /* the text being typed in */
    savedMark: "",
    storage: true,
    siteKey: ""
  };

  function pagePaths() {
    var all = Object.keys(S.files).filter(isPagePath);
    return all.sort(function (a, b) {
      var ia = CONFIG.pageOrder.indexOf(a), ib = CONFIG.pageOrder.indexOf(b);
      if (ia < 0) ia = 999; if (ib < 0) ib = 999;
      return ia - ib || (a < b ? -1 : 1);
    });
  }
  function setText(path, text) { S.files[path] = makeRecord(path, { text: text }); }

  var baselines = Object.create(null);
  function pageBaseline(path) {
    var o = S.orig[path];
    if (!o || o.text == null) return null;
    if (!(o.id in baselines)) baselines[o.id] = serializeDocument(parseHTML(o.text));
    return baselines[o.id];
  }
  function isChanged(path) {
    var cur = S.files[path], o = S.orig[path];
    if (!cur || !o) return !!(cur || o);
    if (sameContent(cur, o)) return false;
    if (cur.text != null && isPagePath(path) && cur.text === pageBaseline(path)) return false;
    return true;
  }
  function changedPaths() {
    var seen = Object.create(null), out = [];
    Object.keys(S.files).concat(Object.keys(S.orig)).forEach(function (p) {
      if (seen[p]) return; seen[p] = 1;
      if (isChanged(p)) out.push(p);
    });
    return out.sort();
  }
  /* What would be written for this path (unchanged files keep their exact bytes). */
  function outputRecord(path) { return isChanged(path) ? S.files[path] : (S.orig[path] || S.files[path]); }
  function fingerprint() { return changedPaths().map(function (p) { return p + ":" + (S.files[p] ? S.files[p].id : "-"); }).join("|"); }
  function isDirty() { return fingerprint() !== S.savedMark; }


  /* =================================================================
     4. HTML WRITER
     Writes a page back as tidy HTML, close to how it was written by
     hand: comments and line breaks are kept, boolean attributes stay
     short (hidden, defer, data-…).
     ================================================================= */
  var VOID = toSet("area base br col embed hr img input link meta source track wbr param keygen basefont bgsound frame");
  var RAWTEXT = toSet("style script xmp iframe noembed noframes plaintext");
  var BOOL_ATTR = toSet("hidden defer async disabled checked selected readonly required multiple autofocus novalidate open reversed ismap nomodule playsinline muted controls loop autoplay default inert itemscope allowfullscreen formnovalidate");
  function escText(s) { return s.replace(/&/g, "&amp;").replace(/ /g, "&nbsp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function escAttr(s) { return s.replace(/&/g, "&amp;").replace(/ /g, "&nbsp;").replace(/"/g, "&quot;"); }
  function onlyText(n) { for (var k = n.firstChild; k; k = k.nextSibling) if (k.nodeType !== 3) return false; return true; }

  function ser(n, out) {
    if (n.nodeType === 1) {
      var name = n.localName, html = n.namespaceURI === HTML_NS;
      out.push("<", name);
      for (var i = 0; i < n.attributes.length; i++) {
        var a = n.attributes[i];
        out.push(" ", a.name);
        if (a.value !== "" || !(BOOL_ATTR[a.name] || a.name.indexOf("data-") === 0)) out.push('="', escAttr(a.value), '"');
      }
      out.push(">");
      if (html && VOID[name]) return;
      if (html && (RAWTEXT[name] || (name === "noscript" && onlyText(n)))) {
        out.push(n.textContent);
      } else {
        var c = name === "template" && n.content ? n.content : n;
        for (var k = c.firstChild; k; k = k.nextSibling) ser(k, out);
      }
      out.push("</", name, ">");
    } else if (n.nodeType === 3) {
      out.push(escText(n.data));
    } else if (n.nodeType === 8) {
      out.push("<!--", n.data, "-->");
    } else if (n.nodeType === 11 || n.nodeType === 9) {
      for (var j = n.firstChild; j; j = j.nextSibling) ser(j, out);
    }
  }
  function serialize(n) { var out = []; ser(n, out); return out.join(""); }
  function serializeInner(n) { var out = []; for (var k = n.firstChild; k; k = k.nextSibling) ser(k, out); return out.join(""); }
  function serializeDocument(d) {
    return ("<!doctype html>\n" + serialize(d.documentElement))
      .replace(/^(<!doctype html>\n<html[^>]*>)<head>/, "$1\n<head>")
      .replace(/\s*<\/body><\/html>\s*$/, "\n</body>\n</html>\n");
  }
  function parseHTML(text) { return new DOMParser().parseFromString(text, "text/html"); }


  /* =================================================================
     5. SHOWING A PAGE
     The page is placed in this document: its styles in <head>, its
     body here. In Preview its scripts run, as on the website. In Edit
     they do not, so the page stays exactly as written.
     Everything the editor adds is marked data-ed-… and removed again
     when the page is written back.
     ================================================================= */
  function resolvePath(base, rel) {
    if (rel == null) return null;
    rel = String(rel).trim();
    if (!rel || rel.charAt(0) === "#" || rel.slice(0, 2) === "//" || /^[a-z][a-z0-9+.\-]*:/i.test(rel)) return null;
    rel = rel.split("#")[0].split("?")[0];
    if (!rel) return null;
    var parts = rel.charAt(0) === "/" ? [] : String(base || "").split("/").slice(0, -1);
    rel.split("/").forEach(function (seg) {
      if (seg === "" || seg === ".") return;
      if (seg === "..") parts.pop(); else parts.push(seg);
    });
    var p = parts.join("/");
    try { return decodeURIComponent(p); } catch (e) { return p; }
  }
  function relativePath(fromFile, toPath) {
    var a = fromFile.split("/").slice(0, -1), b = toPath.split("/");
    while (a.length && b.length > 1 && a[0] === b[0]) { a.shift(); b.shift(); }
    return a.map(function () { return ".."; }).concat(b).join("/");
  }

  var urlCache = new WeakMap();
  function dataURL(rec) {
    var u = urlCache.get(rec);
    if (!u) {
      u = "data:" + rec.type + (rec.text != null ? ";charset=utf-8;base64," + bytesToB64(enc.encode(rec.text)) : ";base64," + rec.b64);
      urlCache.set(rec, u);
    }
    return u;
  }
  var cssCache = Object.create(null);
  function cssForDisplay(css, base) {
    var key = base + "|" + css.length + "|" + hash(css);
    if (cssCache[key]) return cssCache[key];
    var out = css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, function (m, q, u) {
      var p = resolvePath(base, u), r = p && S.files[p];
      return r ? 'url("' + dataURL(r) + '")' : m;
    });
    cssCache[key] = out;
    return out;
  }

  /* Remember an attribute's written value while showing another one. */
  function stash(e, name, shown) {
    if (!e.hasAttribute("data-ed-orig-" + name) && !e.hasAttribute("data-ed-none-" + name)) {
      if (e.hasAttribute(name)) e.setAttribute("data-ed-orig-" + name, e.getAttribute(name));
      else e.setAttribute("data-ed-none-" + name, "");
    }
    if (shown == null) e.removeAttribute(name); else e.setAttribute(name, shown);
  }
  /* The value an attribute will have in the saved file. */
  function getSource(e, name) {
    if (e.hasAttribute("data-ed-orig-" + name)) return e.getAttribute("data-ed-orig-" + name);
    if (e.hasAttribute("data-ed-none-" + name)) return null;
    return e.getAttribute(name);
  }
  /* Set the value an attribute will have in the saved file (and show it). */
  function setSource(e, name, value) {
    e.removeAttribute("data-ed-orig-" + name);
    e.removeAttribute("data-ed-none-" + name);
    if (value == null) { e.removeAttribute(name); return; }
    e.setAttribute(name, value);
    if (name === "src" || name === "poster") {
      var p = resolvePath(S.page, value), r = p && S.files[p];
      if (r) stash(e, name, dataURL(r));
    }
  }

  /* Prepare imported page content for showing. */
  function prepare(root, base, mode) {
    qsa("img[src], video[poster], source[src], video[src], audio[src]", root).forEach(function (m) {
      ["src", "poster"].forEach(function (attr) {
        if (!m.hasAttribute(attr)) return;
        var p = resolvePath(base, m.getAttribute(attr)), r = p && S.files[p];
        if (!r) return;
        if (mode === "edit") stash(m, attr, dataURL(r)); else m.setAttribute(attr, dataURL(r));
      });
    });
    qsa("[srcset]", root).forEach(function (m) { if (mode === "edit") stash(m, "srcset", null); else m.removeAttribute("srcset"); });
    qsa('[style*="url("]', root).forEach(function (m) {
      var shown = cssForDisplay(m.getAttribute("style"), base);
      if (mode === "edit") stash(m, "style", shown); else m.setAttribute("style", shown);
    });
    if (mode === "preview") {
      qsa("a[href]", root).forEach(function (a) {
        var r = routeOf(a.getAttribute("href"), base);
        if (r.page) a.setAttribute("href", "#/" + r.page + (r.anchor ? "/" + r.anchor : ""));
        else if (r.asset && S.files[r.asset] && isImagePath(r.asset)) a.setAttribute("href", dataURL(S.files[r.asset]));   /* e.g. full-size gallery photos */
      });
    } else {
      /* hidden blocks stay in the page, shown only with "Show hidden items" */
      qsa("[hidden]", root).forEach(function (e) {
        var idx = 0;
        for (var i = 0; i < e.attributes.length; i++) if (e.attributes[i].name === "hidden") idx = i;
        e.removeAttribute("hidden");
        e.setAttribute("data-ed-was-hidden", String(idx));
      });
    }
  }

  /* What browser extensions (spell checkers, password managers) add to pages */
  var JUNK_ATTR = /^(data-(gr-|new-gr-|gramm|lt-|ms-editor|dashlane|lastpass|1p-|bwautofill|com-onepassword)|contenteditable$|spellcheck$)/i;
  var JUNK_TAGS = "grammarly-desktop-integration, grammarly-extension, grammarly-popups, grammarly-card, lt-mirror, lt-toolbar, lt-highlighter, lt-div, [data-grammarly-shadow-root], [data-lastpass-root], [data-lastpass-icon-root]";

  /* Remove everything the editor (and browser extensions) added (works on a copy). */
  function cleanTree(root) {
    qsa("[data-ed-ui], [data-ed-run], " + JUNK_TAGS, root).forEach(remove);
    var list = root.nodeType === 1 ? [root].concat(qsa("*", root)) : qsa("*", root);
    list.forEach(function (e) {
      var names = [], i;
      /* empty style/class attributes are left behind by browsers and tools */
      if (e.getAttribute("style") === "") e.removeAttribute("style");
      if (e.getAttribute("class") === "") e.removeAttribute("class");
      /* "[text](address)" pasted into a link's text: keep just the text */
      if (e.localName === "a" && e.childNodes.length === 1 && e.firstChild.nodeType === 3) {
        var md = /^\s*\[([^\]]+)\]\((?:https?:|mailto:)[^)\s]+\)\s*$/.exec(e.firstChild.data);
        if (md) e.firstChild.data = md[1];
      }
      for (i = 0; i < e.attributes.length; i++) names.push(e.attributes[i].name);
      names.forEach(function (n) { if (JUNK_ATTR.test(n)) e.removeAttribute(n); });
      names = names.filter(function (n) { return !JUNK_ATTR.test(n); });
      if (!names.some(function (n) { return n.indexOf("data-ed-") === 0; })) return;
      var hiddenAt = -1;
      names.forEach(function (n) {
        if (n.indexOf("data-ed-") !== 0) return;
        if (n.indexOf("data-ed-orig-") === 0) e.setAttribute(n.slice(13), e.getAttribute(n));
        else if (n.indexOf("data-ed-none-") === 0) e.removeAttribute(n.slice(13));
        else if (n === "data-ed-was-hidden") hiddenAt = parseInt(e.getAttribute(n), 10);
        e.removeAttribute(n);
      });
      if (hiddenAt > -1 || names.indexOf("data-ed-was-hidden") > -1) {
        /* put "hidden" back where it was among the attributes */
        var attrs = [];
        for (i = 0; i < e.attributes.length; i++) attrs.push([e.attributes[i].name, e.attributes[i].value]);
        var at = isNaN(hiddenAt) || hiddenAt < 0 ? attrs.length : Math.min(hiddenAt, attrs.length);
        attrs.splice(at, 0, ["hidden", ""]);
        attrs.forEach(function (a) { e.removeAttribute(a[0]); });
        attrs.forEach(function (a) { e.setAttribute(a[0], a[1]); });
      }
    });
    return root;
  }
  /* Copies are made in a separate, inert document so their images never load. */
  var inertDoc = null;
  function cleanClone(node) {
    if (!inertDoc) inertDoc = D.implementation.createHTMLDocument("");
    return cleanTree(inertDoc.importNode(node, true));
  }
  function cleanHTML(node) { return serialize(cleanClone(node)); }

  function copyAttributes(to, from) {
    var keep = [];
    for (var i = 0; i < to.attributes.length; i++) if (to.attributes[i].name.indexOf("data-ed") === 0) keep.push(to.attributes[i].name);
    var names = [];
    for (i = 0; i < to.attributes.length; i++) names.push(to.attributes[i].name);
    names.forEach(function (n) { if (keep.indexOf(n) < 0) to.removeAttribute(n); });
    for (i = 0; i < from.attributes.length; i++) to.setAttribute(from.attributes[i].name, from.attributes[i].value);
  }

  function applyHeadAssets(d, base) {
    var wanted = [];
    qsa('link[rel~="stylesheet"][href], style', d.head).forEach(function (n) {
      if (n.localName === "style") { wanted.push({ key: "inline-" + hash(n.textContent), css: n.textContent, base: base, media: n.getAttribute("media") }); return; }
      var p = resolvePath(base, n.getAttribute("href")), r = p && S.files[p];
      if (r && r.text != null) wanted.push({ key: p + "@" + r.id, css: r.text, base: p, media: n.getAttribute("media") });
    });
    var now = qsa("style[data-ed-site]", D.head);
    if (now.map(function (s) { return s.getAttribute("data-ed-site"); }).join("|") !== wanted.map(function (w) { return w.key; }).join("|")) {
      now.forEach(remove);
      var before = qs("style[data-ed-style]", D.head);
      wanted.forEach(function (w) {
        var st = D.createElement("style");
        st.setAttribute("data-ed-site", w.key);
        if (w.media) st.media = w.media;
        st.textContent = cssForDisplay(w.css, w.base);
        D.head.insertBefore(st, before);
      });
    }
    var icon = qs('link[rel~="icon"][href]', d.head), mine = qs("link[data-ed-icon]", D.head);
    if (icon) {
      var ip = resolvePath(base, icon.getAttribute("href")), ir = ip && S.files[ip];
      if (ir) {
        if (!mine) { mine = D.createElement("link"); mine.rel = "icon"; mine.setAttribute("data-ed-icon", ""); D.head.appendChild(mine); }
        if (mine.getAttribute("href") !== dataURL(ir)) mine.href = dataURL(ir);
      }
    }
  }

  function runScripts(list, base) {
    list.forEach(function (s) {
      var type = (s.getAttribute("type") || "").trim().toLowerCase();
      if (type && !/^((text|application)\/(x-)?(java|ecma)script|module)$/.test(type)) {
        var copy = D.importNode(s, true); copy.setAttribute("data-ed-run", ""); D.body.insertBefore(copy, host); return;
      }
      var n = D.createElement("script"), src = s.getAttribute("src");
      if (src) {
        var p = resolvePath(base, src), r = p && S.files[p];
        if (r && r.text != null) n.text = r.text + "\n//# sourceURL=" + p;
        else if (/^https?:/i.test(src)) n.src = src;
        else return;
      } else {
        n.text = s.textContent;
      }
      n.setAttribute("data-ed-run", "");
      D.body.insertBefore(n, host);
    });
  }

  function render(path, mode, anchor, opts) {
    opts = opts || {};
    if (!S.files[path]) path = pagePaths()[0];
    if (!path) return;
    var y = window.scrollY;
    stopEditing(true);
    select(null);
    var d = parseHTML(S.files[path].text);
    S.page = path;
    S.mode = mode;
    var H = D.documentElement;
    copyAttributes(H, d.documentElement);
    H.setAttribute("data-ed-mode", mode);
    if (S.showHidden && mode === "edit") H.setAttribute("data-ed-show-hidden", ""); else H.removeAttribute("data-ed-show-hidden");
    var t = qs("title", d.head);
    D.title = (mode === "edit" ? "✎ " : "") + (t ? t.textContent : path);
    applyHeadAssets(d, path);
    copyAttributes(D.body, d.body);
    kids(D.body).forEach(function (n) { if (n !== host) D.body.removeChild(n); });
    var scripts = qsa("script", d.head), frag = D.createDocumentFragment();
    kids(d.body).forEach(function (n) {
      if (mode === "preview" && n.nodeType === 1 && n.localName === "script") { scripts.push(n); return; }
      frag.appendChild(D.importNode(n, true));
    });
    prepare(frag, path, mode);
    D.body.insertBefore(frag, host);
    if (mode === "preview") runScripts(scripts, path);
    var target = anchor ? D.getElementById(anchor) : null;
    if (target) target.scrollIntoView({ block: "start", behavior: "instant" });
    else window.scrollTo({ top: opts.keepScroll ? y : 0, behavior: "instant" });
    updateUI();
  }


  /* =================================================================
     6. PREVIEW: LINKS BETWEEN PAGES
     ================================================================= */
  function routeOf(href, base) {
    if (href == null) return {};
    href = String(href).trim();
    if (/^(https?:|mailto:|tel:|\/\/)/i.test(href)) return { external: true };
    if (href.charAt(0) === "#") {
      var m = /^#\/([^/]+\.html?)(?:\/(.*))?$/.exec(href);
      if (m) return { page: m[1], anchor: m[2] || "" };
      return { anchor: href.slice(1) };
    }
    if (/^[a-z][a-z0-9+.\-]*:/i.test(href)) return { other: true };
    var hashAt = href.indexOf("#"), anchor = hashAt >= 0 ? href.slice(hashAt + 1) : "";
    var p = resolvePath(base, href);
    if (p && S.files[p] && isPagePath(p)) return { page: p, anchor: anchor };
    if (p && S.files[p + (p ? "/" : "") + "index.html"]) return { page: p + "/index.html", anchor: anchor };
    if (p) return { asset: p };
    return {};
  }
  function scrollToAnchor(id) {
    var t = id && id !== "top" ? D.getElementById(id) : null;
    if (t) t.scrollIntoView({ block: "start", behavior: "instant" }); else window.scrollTo({ top: 0, behavior: "instant" });
  }
  /* Links to files (PDFs …) open in the same tab on the website; the preview cannot leave this page, so it says so. */
  function openAsset(path) {
    if (!S.files[path]) { toast("This link points to " + path + ", which is not in the website folder yet."); return; }
    toast("On the website this link opens " + path + " (in the same tab).");
  }
  function onPreviewClick(e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var r = routeOf(a.getAttribute("href"), S.page);
    if (r.page) { e.preventDefault(); e.stopPropagation(); if (S.files[r.page]) render(r.page, "preview", r.anchor); else toast(r.page + " does not exist."); }
    else if (r.anchor != null && !r.external && !r.asset && !r.other) { e.preventDefault(); scrollToAnchor(r.anchor); }
    else if (r.asset) { e.preventDefault(); openAsset(r.asset); }
  }

  /* =================================================================
     7. EDITING: what a click picks
     A "text" is the outermost element that holds only words and inline
     marks (a paragraph, a heading, a list item, a table cell …). It
     becomes editable when clicked. A "block" is what the block toolbar
     acts on: the nearest list item, table row, card or button, or else
     the nearest paragraph, heading, figure, list, section …
     ================================================================= */
  var INLINE = toSet("a abbr b bdi bdo br cite code data dfn em i img kbd mark q s samp small span strong sub sup time u var wbr del ins");
  var NO_TEXT = toSet("script style template svg math img br hr input select textarea button iframe video audio canvas object embed html head body main noscript");
  var TEXT_BLOCK = toSet("p h1 h2 h3 h4 h5 h6 li td th dt dd figcaption blockquote address caption summary");
  var SPLIT_BLOCK = toSet("p li");
  var SINGLE_LINE = toSet("h1 h2 h3 h4 h5 h6 dt th a summary label caption");
  var PRIORITY = "li, tr, dl > div, [data-item], .btn, .card, .tile";
  var BLOCKS = "p, h1, h2, h3, h4, h5, h6, blockquote, address, figure, img, table, ul, ol, dl, section, article, aside, header, footer, nav, details, pre, hr, form, main, li, tr, .card, .btn, video, iframe";

  function inUI(n) { return !!n && (n === host || (n.nodeType === 1 && !!n.closest("[data-ed-ui]"))); }
  function eventInUI(e) { return e.target === host || (e.composedPath && e.composedPath().indexOf(host) > -1); }
  function inlineOnly(e) {
    for (var k = e.firstChild; k; k = k.nextSibling) {
      if (k.nodeType !== 1) continue;
      if (k.namespaceURI !== HTML_NS || !INLINE[k.localName] || !inlineOnly(k)) return false;
    }
    return true;
  }
  function isLeaf(e) {
    if (!e || e.nodeType !== 1 || e.namespaceURI !== HTML_NS || NO_TEXT[e.localName] || inUI(e)) return false;
    if (e.closest("svg, [data-ed-locked]") || !inlineOnly(e)) return false;
    return /\S/.test(e.textContent) || !!TEXT_BLOCK[e.localName] || e.hasAttribute("data-ed-ce");
  }
  function leafFor(t) {
    var e = t && (t.nodeType === 1 ? t : t.parentElement);
    while (e && e !== D.body && !isLeaf(e)) e = e.parentElement;
    if (!e || e === D.body) return null;
    while (e.parentElement && e.parentElement !== D.body && isLeaf(e.parentElement)) e = e.parentElement;
    return e;
  }
  function firstLeaf(root) {
    if (isLeaf(root)) return leafFor(root);
    var all = qsa("*", root);
    for (var i = 0; i < all.length; i++) if (isLeaf(all[i]) && !all[i].closest("[data-ed-was-hidden]")) return leafFor(all[i]);
    return null;
  }
  function depth(from, to) { var n = 0; while (from && from !== to) { from = from.parentElement; n++; } return n; }
  function itemFor(t, exact) {
    var e = t && (t.nodeType === 1 ? t : t.parentElement);
    if (!e || inUI(e) || e === D.body || e === D.documentElement) return null;
    if (exact) return e;
    var p = e.closest(PRIORITY);
    /* a faded (hidden) element is selected itself, so it can be shown again */
    var hid = e.closest("[data-ed-was-hidden]");
    if (hid && hid !== D.body && (!p || p.contains(hid))) return hid;
    if (p && p !== D.body && depth(e, p) <= 4) return p;
    var b = e.closest(BLOCKS);
    return b && b !== D.body ? b : e;
  }

  function setCaret(node, atEnd) {
    var r = D.createRange();
    r.selectNodeContents(node);
    r.collapse(!atEnd);
    var s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  function selectContents(node) {
    var r = D.createRange(); r.selectNodeContents(node);
    var s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  function caretAtPoint(x, y) {
    var r = null;
    if (D.caretRangeFromPoint) r = D.caretRangeFromPoint(x, y);
    else if (D.caretPositionFromPoint) { var p = D.caretPositionFromPoint(x, y); if (p) { r = D.createRange(); r.setStart(p.offsetNode, p.offset); } }
    if (r && S.leaf && S.leaf.contains(r.startContainer)) { var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
  }

  function startEditing(leaf) {
    if (S.leaf === leaf) return;
    stopEditing();
    S.leaf = leaf;
    S.leafNbsp = leaf.textContent.indexOf("\u00a0") > -1;   /* keep non-breaking spaces only if the text had them */
    S.leafText = leaf.textContent.trim();
    S.leafTbaHomes = qsa(".tba", leaf).map(function (t) { return t.parentNode; });   /* where "TBA" marks sit, see tidyLeaf */
    leaf.setAttribute("data-ed-ce", "");
    leaf.setAttribute("contenteditable", "true");
    leaf.setAttribute("spellcheck", "true");
    updateBars();
  }
  function stopEditing(silent) {
    var leaf = S.leaf;
    if (!leaf) return;
    S.leaf = null;
    if (!silent) tidyLeaf(leaf);
    var s = getSelection();
    if (s.rangeCount && leaf.contains(s.anchorNode)) s.removeAllRanges();
    leaf.removeAttribute("contenteditable");
    leaf.removeAttribute("spellcheck");
    leaf.removeAttribute("data-ed-ce");
    updateBars();
    if (!silent) commit();
  }

  /* After typing: tidy what browsers leave behind */
  var PLACEHOLDER = /\b(TBA|TBC|TBD)\b|to be (announced|confirmed|decided|added|updated|published)|coming soon/i;
  function tidyLeaf(leaf) {
    if (!leaf.isConnected) return;
    qsa("font", leaf).forEach(unwrap);
    qsa("span[style]:not([class])", leaf).forEach(unwrap);
    qsa(".tba", leaf).forEach(function (t) {
      if (!/\S/.test(t.textContent)) remove(t);
      else if (!PLACEHOLDER.test(t.textContent)) {   /* a real value was typed over a "TBA" mark */
        var iso = isoDate(t.textContent);
        if (iso && t.localName === "span" && t.parentNode) {   /* a date: kept as a date for search engines and calendars */
          var tm = D.createElement("time");
          tm.setAttribute("datetime", iso);
          while (t.firstChild) tm.appendChild(t.firstChild);
          t.parentNode.replaceChild(tm, t);
        } else unwrap(t);
      }
    });
    /* typing over a whole "TBA" mark removes the mark itself: a date typed in its place still becomes a date */
    (S.leafTbaHomes || []).forEach(function (home) {
      if (!home.isConnected || !leaf.contains(home) || qs(".tba, time", home) || home.firstElementChild) return;
      var iso = isoDate(home.textContent);
      if (!iso) return;
      var tm = D.createElement("time");
      tm.setAttribute("datetime", iso);
      tm.textContent = home.textContent.replace(/\s+/g, " ").trim();
      home.textContent = "";
      home.appendChild(tm);
    });
    S.leafTbaHomes = null;
    /* dates: <time datetime="2026-11-01">1 November 2026</time> follows what was typed;
       a date replaced by "TBA" becomes a TBA mark, other text becomes plain text */
    (leaf.localName === "time" ? [] : qsa("time", leaf)).forEach(function (tm) {
      var txt = tm.textContent.replace(/\s+/g, " ").trim(), old = tm.getAttribute("datetime") || "";
      var iso = isoDate(txt, /^\d{4}/.test(old) ? old.slice(0, 4) : "");
      if (iso) { if (iso !== old) tm.setAttribute("datetime", iso); return; }
      if (/^\d{4}-\d{2}(-\d{2})?$/.test(txt)) return;
      if (txt && PLACEHOLDER.test(txt) && !qs(".tba", tm)) {
        var sp = D.createElement("span");
        sp.className = "tba";
        while (tm.firstChild) sp.appendChild(tm.firstChild);
        tm.parentNode.replaceChild(sp, tm);
      } else unwrap(tm);
    });
    /* a row marked e.g. class="speaker--tba" loses that mark once it has no placeholder left */
    for (var up = leaf; up && up !== D.body; up = up.parentElement) {
      var mods = (up.getAttribute("class") || "").split(/\s+/).filter(function (c) { return /--tba$/.test(c); });
      if (mods.length && !qs(".tba", up)) { mods.forEach(function (c) { up.classList.remove(c); }); }
    }
    qsa("b, strong, em, i, sup, sub, u, s, small, mark, code, span:not([class])", leaf).forEach(function (f) {
      if (!/\S/.test(f.textContent) && !f.querySelector("img, br")) remove(f);
    });
    if (!S.leafNbsp) {
      var tw = D.createTreeWalker(leaf, NodeFilter.SHOW_TEXT), tn;
      while ((tn = tw.nextNode())) if (tn.data.indexOf("\u00a0") > -1) tn.data = tn.data.replace(/\u00a0/g, " ");
    }
    /* a gallery caption also becomes the photo's description, unless that was written separately */
    if (leaf.localName === "figcaption" && leaf.closest(".gallery__item")) {
      var gimg = qs("img", leaf.closest("figure")), cap = leaf.textContent.trim();
      if (gimg && (gimg.getAttribute("alt") === GALLERY_ALT || gimg.getAttribute("alt") === S.leafText || !gimg.getAttribute("alt"))) gimg.setAttribute("alt", cap || GALLERY_ALT);
    }
    var last = leaf.lastChild;
    while (last && isWs(last)) last = last.previousSibling;
    if (last && last.nodeType === 1 && last.localName === "br") remove(last);
    leaf.normalize();
  }
  /* "1 November 2026", "1 Nov 2026", "15–19 Dec 2026", "November 1, 2026" → "2026-11-01" */
  var MONTH_NUM = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  function isoDate(text, year) {
    var t = String(text || "").replace(/\s+/g, " ").trim(), m, d, mo, y;
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    if ((m = /^(\d{1,2})(?:st|nd|rd|th)?(?: ?[–—-] ?\d{1,2}(?:st|nd|rd|th)?)? ([A-Za-z]{3,})\.?,?(?: (\d{4}))?$/.exec(t))) { d = +m[1]; mo = MONTH_NUM[m[2].slice(0, 3).toLowerCase()]; y = m[3]; }
    else if ((m = /^([A-Za-z]{3,})\.? (\d{1,2})(?:st|nd|rd|th)?(?: ?[–—-] ?\d{1,2}(?:st|nd|rd|th)?)?,?(?: (\d{4}))?$/.exec(t))) { mo = MONTH_NUM[m[1].slice(0, 3).toLowerCase()]; d = +m[2]; y = m[3]; }
    y = y || year;
    if (!mo || !d || d > 31 || !y) return null;
    return y + "-" + (mo < 10 ? "0" : "") + mo + "-" + (d < 10 ? "0" : "") + d;
  }
  function unwrap(e) {
    var p = e.parentNode;
    if (!p) return;
    while (e.firstChild) p.insertBefore(e.firstChild, e);
    p.removeChild(e);
    p.normalize();
  }

  function onEditMouseDown(e) {
    if (e.button !== 0) return;
    var t = e.target;
    var toggle = t.closest && t.closest(".menu-toggle");
    if (toggle) {
      e.preventDefault();
      var nav = qs(".site-nav");
      if (nav) { if (nav.hasAttribute("data-ed-open")) nav.removeAttribute("data-ed-open"); else nav.setAttribute("data-ed-open", ""); }
      return;
    }
    if (t.localName === "img" || (t.closest && t.closest("svg"))) e.preventDefault();
    S.lastCell = t.closest ? t.closest("td, th") : null;   /* for the table column tools */
    var leaf = e.altKey ? null : leafFor(t);
    if (leaf) startEditing(leaf); else stopEditing();
    select(itemFor(t, e.altKey) || leaf);
    /* clicking a "TBA" placeholder (or a line that is only a placeholder) selects it, so typing replaces it */
    var tba = t.closest && t.closest(".tba");
    if (!tba && leaf) {
      var only = qsa(".tba", leaf);
      if (only.length === 1 && only[0].textContent.trim() === leaf.textContent.trim()) tba = only[0];
    }
    S.pendingTba = leaf && tba && leaf.contains(tba) ? tba : null;
  }
  function onEditClick(e) {
    var t = e.target;
    if (t.closest && t.closest("a, button, label, summary, input, select, textarea")) e.preventDefault();
    if (S.leaf && D.activeElement !== S.leaf) { S.leaf.focus(); caretAtPoint(e.clientX, e.clientY); }
    if (S.pendingTba && S.leaf && S.leaf.contains(S.pendingTba) && e.detail < 2) selectContents(S.pendingTba);
    S.pendingTba = null;
    updateBars();
  }
  function onEditDblClick(e) {
    var img = e.target.closest && e.target.closest("img");
    if (img && !inUI(img)) { e.preventDefault(); openImageDialog(img); }
  }

  function onEnter(shift) {
    var leaf = S.leaf, n = leaf.localName, heading = /^h[1-6]$/.test(n);
    if (shift || !(SPLIT_BLOCK[n] || heading)) {
      if (SINGLE_LINE[n] && !shift) { var l = leaf; stopEditing(); if (!S.sel || !S.sel.isConnected) select(itemFor(l)); return; }
      D.execCommand("insertLineBreak");
      scheduleCommit();
      return;
    }
    var s = getSelection();
    if (!s.rangeCount) return;
    var r = s.getRangeAt(0);
    r.deleteContents();
    var tail = D.createRange();
    tail.setStart(r.endContainer, r.endOffset);
    tail.setEnd(leaf, leaf.childNodes.length);
    var frag = tail.extractContents();
    var fresh = D.createElement(heading ? "p" : n);
    if (!heading && leaf.getAttribute("class")) fresh.setAttribute("class", leaf.getAttribute("class"));
    fresh.appendChild(frag);
    qsa(".tba", fresh).forEach(function (t) { if (!/\S/.test(t.textContent)) remove(t); });
    if (!/\S/.test(fresh.textContent)) fresh.textContent = "";
    insertAfter(fresh, leaf);
    stopEditing(true);
    tidyLeaf(leaf);
    startEditing(fresh);
    fresh.focus();
    setCaret(fresh, false);
    select(itemFor(fresh));
    commit();
  }
  function removeEmptyLeaf() {
    var leaf = S.leaf, prev = leaf.previousElementSibling;
    var target = prev && isLeaf(prev) ? prev : null;
    stopEditing(true);
    transact(function () { nodesBefore(leaf, false).forEach(remove); remove(leaf); });
    if (target) { startEditing(target); target.focus(); setCaret(target, true); select(itemFor(target)); }
  }

  function onEditKeyDown(e) {
    if (eventInUI(e)) return;
    var mod = e.ctrlKey || e.metaKey, k = e.key;
    if (mod && !e.altKey && (k === "z" || k === "Z")) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && (k === "y" || k === "Y")) { e.preventDefault(); redo(); return; }
    if (mod && (k === "s" || k === "S")) { e.preventDefault(); saveDefault(); return; }
    if (S.leaf && (e.target === S.leaf || S.leaf.contains(e.target))) {
      if (mod && (k === "b" || k === "B")) { e.preventDefault(); fmt("b"); return; }
      if (mod && (k === "i" || k === "I")) { e.preventDefault(); fmt("em"); return; }
      if (mod && (k === "k" || k === "K")) { e.preventDefault(); fmt("link"); return; }
      if (k === "Escape") { e.preventDefault(); var l = S.leaf; stopEditing(); if (!S.sel || !S.sel.isConnected) select(itemFor(l)); return; }
      if (k === "Enter") { e.preventDefault(); onEnter(e.shiftKey); return; }
      if (k === "Backspace" && SPLIT_BLOCK[S.leaf.localName] && !/\S/.test(S.leaf.textContent) && !S.leaf.querySelector("img")) { e.preventDefault(); removeEmptyLeaf(); return; }
      return;
    }
    if (!S.sel) return;
    if (k === "Escape") { select(null); return; }
    if (k === "Delete" || k === "Backspace") { e.preventDefault(); opDelete(); return; }
    if (e.altKey && k === "ArrowUp") { e.preventDefault(); opMove(-1); return; }
    if (e.altKey && k === "ArrowDown") { e.preventDefault(); opMove(1); return; }
    if (mod && (k === "d" || k === "D")) { e.preventDefault(); opDuplicate(); return; }
    if (k === "Enter") {
      var lf = firstLeaf(S.sel);
      if (lf) { e.preventDefault(); startEditing(lf); lf.focus(); setCaret(lf, true); }
    }
  }
  function onEditInput(e) {
    if (S.leaf && S.leaf.contains(e.target)) { scheduleCommit(); placeBars(); }
  }
  function onEditPaste(e) {
    if (!S.leaf || !S.leaf.contains(e.target)) return;
    e.preventDefault();
    var text = (e.clipboardData && e.clipboardData.getData("text/plain")) || "";
    text = text.replace(/\r/g, "").replace(/[ \t]*\n[ \t]*/g, SINGLE_LINE[S.leaf.localName] ? " " : "\n").replace(/\n{2,}/g, "\n");
    var lines = text.split("\n");
    lines.forEach(function (line, i) {
      if (i) D.execCommand("insertLineBreak");
      if (line) D.execCommand("insertText", false, line);
    });
    scheduleCommit();
  }
  function onEditDrop(e) {
    if (eventInUI(e)) return;
    e.preventDefault();
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f || !/^image\//.test(f.type)) return;
    var t = e.target.closest && e.target.closest("img");
    if (!t) { var it = itemFor(e.target); t = it && (it.localName === "img" ? it : qs("img", it)); }
    if (t && !inUI(t)) openImageDialog(t, { file: f });
    else toast("Drop a photo onto an image to replace it.");
  }


  /* =================================================================
     8. BLOCKS: select, move, copy, hide, delete, insert
     ================================================================= */
  function select(e) {
    if (e && (e === D.body || e === D.documentElement || inUI(e))) e = null;
    if (S.sel === e) { updateBars(); return; }
    if (S.sel) S.sel.removeAttribute("data-ed-sel");
    S.sel = e;
    if (e) e.setAttribute("data-ed-sel", "");
    updateBars();
  }
  function nodesBefore(e, withComments) {
    var out = [], s = e.previousSibling;
    while (s && (isWs(s) || (withComments && s.nodeType === 8))) { out.unshift(s); s = s.previousSibling; }
    return out;
  }
  function prevElement(e) { var p = e.previousElementSibling; while (p && (inUI(p) || p.hasAttribute("data-ed-run"))) p = p.previousElementSibling; return p; }
  function nextElement(e) { var n = e.nextElementSibling; while (n && (inUI(n) || n.hasAttribute("data-ed-run"))) n = n.nextElementSibling; return n; }
  function insertAfter(node, ref) {
    var ws = ref.previousSibling && isWs(ref.previousSibling) ? ref.previousSibling.cloneNode() : null;
    var next = ref.nextSibling;
    if (ws) ref.parentNode.insertBefore(ws, next);
    ref.parentNode.insertBefore(node, next);
  }
  function appendInside(node, parent) {
    var last = parent.lastChild, indent = null;
    var lastEl = parent.lastElementChild;
    if (lastEl && isWs(lastEl.previousSibling)) indent = lastEl.previousSibling.cloneNode();
    if (indent) parent.insertBefore(indent, isWs(last) ? last : null);
    parent.insertBefore(node, isWs(last) ? last : null);
  }
  function stripMarks(root) {
    [root].concat(qsa("*", root)).forEach(function (x) {
      x.removeAttribute("data-ed-sel"); x.removeAttribute("data-ed-hover");
      if (x.hasAttribute("data-ed-ce")) { x.removeAttribute("data-ed-ce"); x.removeAttribute("contenteditable"); x.removeAttribute("spellcheck"); }
    });
  }
  function uniqueIds(root) {
    var map = {};
    [root].concat(qsa("[id]", root)).forEach(function (x) {
      if (!x.id) return;
      var base = x.id.replace(/-\d+$/, ""), n = 2;
      while (D.getElementById(base + "-" + n) || map[base + "-" + n]) n++;
      map[x.id] = base + "-" + n;
      x.id = base + "-" + n;
    });
    [root].concat(qsa("*", root)).forEach(function (x) {
      ["aria-labelledby", "aria-describedby", "aria-controls", "for"].forEach(function (a) {
        if (x.hasAttribute(a)) x.setAttribute(a, x.getAttribute(a).split(/\s+/).map(function (v) { return map[v] || v; }).join(" "));
      });
      var h = x.localName === "a" && x.getAttribute("href");
      if (h && h.charAt(0) === "#" && map[h.slice(1)]) x.setAttribute("href", "#" + map[h.slice(1)]);
    });
  }

  function opParent() {
    if (!S.sel) return;
    var p = S.sel.parentElement;
    if (p && p !== D.body) { stopEditing(); select(p); }
  }
  function opMove(dir) {
    var e = S.sel;
    if (!e) return;
    var other = dir < 0 ? prevElement(e) : nextElement(e);
    if (!other) { toast(dir < 0 ? "This is already the first one." : "This is already the last one."); return; }
    stopEditing();
    transact(function () {
      var a = dir < 0 ? other : e, b = dir < 0 ? e : other;
      var target = nodesBefore(a, true)[0] || a;
      nodesBefore(b, true).concat([b]).forEach(function (n) { a.parentNode.insertBefore(n, target); });
    });
    e.scrollIntoView({ block: "nearest" });
    placeBars();
  }
  function opDuplicate() {
    var e = S.sel, c = null;
    if (!e) return;
    stopEditing();
    transact(function () {
      c = e.cloneNode(true);
      stripMarks(c);
      uniqueIds(c);
      c.classList.remove("is-active");
      if (c.getAttribute("class") === "") c.removeAttribute("class");
      qsa('[aria-current="page"]', c).forEach(function (x) { x.removeAttribute("aria-current"); });
      insertAfter(c, e);
    });
    if (c) { select(c); c.scrollIntoView({ block: "nearest" }); toast("Copied. Edit the copy, or move it with the arrows."); }
  }
  function opDelete() {
    var e = S.sel;
    if (!e) return;
    stopEditing(true);
    var next = nextElement(e) || prevElement(e) || (e.parentElement !== D.body ? e.parentElement : null);
    transact(function () { nodesBefore(e, e.localName === "section").forEach(remove); remove(e); });
    select(next && next.isConnected ? next : null);
    toast("Deleted. Undo brings it back (Ctrl+Z).");
  }
  function opHide() {
    var e = S.sel;
    if (!e) return;
    stopEditing();
    var hide = !e.hasAttribute("data-ed-was-hidden");
    transact(function () { if (hide) e.setAttribute("data-ed-was-hidden", ""); else e.removeAttribute("data-ed-was-hidden"); });
    if (hide && !S.showHidden) {
      select(e.parentElement !== D.body ? e.parentElement : null);
      toast("Hidden from visitors. Turn on “Show hidden items” to see it again.");
    } else {
      toast(hide ? "Hidden from visitors (shown faded while editing)." : "Visible to visitors again.");
    }
    updateBars();
  }

  var SNIPPETS = {
    p: { label: "Paragraph", html: "<p>New paragraph.</p>" },
    h2: { label: "Heading", html: "<h2>New <em>heading</em></h2>" },
    h3: { label: "Small heading", html: '<h3 class="subhead">New heading</h3>' },
    ul: { label: "Bulleted list", html: '<div class="prose">\n  <ul>\n    <li>First point</li>\n    <li>Second point</li>\n  </ul>\n</div>' },
    ol: { label: "Numbered list", html: '<ol class="numbered">\n  <li>First step</li>\n  <li>Second step</li>\n</ol>' },
    btn: { label: "Button", html: '<p class="mt-5"><a class="btn btn--primary" href="index.html">Button text</a></p>' },
    img: { label: "Image with caption", image: true, html: '<figure class="figure mt-5">\n  <img src="{src}" alt="" width="{w}" height="{h}">\n  <figcaption>Caption</figcaption>\n</figure>' },
    note: { label: "“To be announced” note", html: '<p class="tba-note mt-4">Details will be announced here.</p>' },
    callout: { label: "Note (confirmed information)", html: '<p class="callout mt-5"><b>Note:</b> Write the note here.</p>' },
    table: { label: "Table", html: '<div class="data-table-wrap mt-5">\n  <table class="data-table">\n    <thead>\n      <tr><th scope="col">Item</th><th scope="col">Details</th></tr>\n    </thead>\n    <tbody>\n      <tr><th scope="row">First row</th><td>Text</td></tr>\n      <tr><th scope="row">Second row</th><td>Text</td></tr>\n    </tbody>\n  </table>\n</div>' },
    section: { label: "New section", html: '<section class="band" id="new-section">\n    <div class="wrap">\n      <div class="section-head">\n        <p class="eyebrow">Section</p>\n        <h2>New <em>section</em></h2>\n      </div>\n      <div class="prose">\n        <p>Write the text of this section here.</p>\n      </div>\n    </div>\n  </section>' },
    li: { label: "Empty list item", html: "<li>New item</li>" },
    row: { label: "Empty table row" },
    fact: { label: "Detail row", html: "<div><dt>Label</dt><dd>Value</dd></div>" },
    copy: { label: "Copy of this block" },
    colAfter: { label: "A new column after the clicked cell" },
    colDelete: { label: "Delete the column of the clicked cell" },
    photos: { label: "Photos for the gallery (several at once)…" },
    fill: { label: "Rows pasted from a spreadsheet…" },
    html: { label: "Your own HTML…" }
  };
  function insertChoices() {
    var e = S.sel;
    if (!e) return [];
    var n = e.localName;
    if (galleryFor(e)) return ["photos", "copy", "html"].concat(n === "li" ? [] : ["p", "h2", "note", "section"]);
    if (n === "li") return ["copy", "li", "html"];
    if (n === "tr") return ["copy", "row", "fill", "colAfter", "colDelete", "html"];
    if ((n === "td" || n === "th") && e.closest("table")) return ["colAfter", "colDelete", "fill", "html"];
    if (n === "table" || (e.closest && e.closest(".data-table-wrap"))) return ["fill", "copy", "p", "h2", "note", "html"];
    if (n === "div" && e.parentElement && e.parentElement.localName === "dl") return ["copy", "fact", "html"];
    if (n === "td" || n === "th" || n === "dt" || n === "dd") return ["html"];
    return ["p", "h2", "h3", "ul", "ol", "btn", "img", "callout", "note", "table", "section", "copy", "html"];
  }
  function htmlToNodes(html) {
    var t = D.createElement("template");
    t.innerHTML = html;
    prepare(t.content, S.page, "edit");
    return t.content;
  }
  function placeNew(frag, kind) {
    var e = S.sel, first = null;
    var nodes = kids(frag).filter(function (n) { return n.nodeType === 1; });
    first = nodes[0];
    var containerish = /^(section|main|article|aside)$/.test(e.localName) || e.classList.contains("wrap") || e.classList.contains("page-head");
    if (kind === "section") {
      var sec = e.localName === "section" ? e : e.closest("section");
      if (sec && sec.parentElement) e = sec;
      kids(frag).reverse().forEach(function (n) { insertAfter(n, e); });
    } else if (containerish && kind !== "copy") {
      var box = qs(":scope > .wrap", e) || e;
      kids(frag).forEach(function (n) { appendInside(n, box); });
    } else {
      kids(frag).reverse().forEach(function (n) { if (n.nodeType === 1 || /\S/.test(n.textContent)) insertAfter(n, e); });
    }
    return first;
  }
  function opInsert(kind) {
    var e = S.sel;
    if (!e) return;
    if (kind === "copy") { opDuplicate(); return; }
    if (kind === "html") { openHTMLDialog(null); return; }
    if (kind === "photos") { openAddPhotos(galleryFor(e)); return; }
    if (kind === "fill") { openFillTable(e.closest("table") || qs("table", e)); return; }
    if (kind === "colAfter" || kind === "colDelete") { opColumn(kind === "colDelete"); return; }
    var sn = SNIPPETS[kind];
    if (sn.image) {
      openImageDialog(null, { onPick: function (info) {
        insertHTML(sn.html.replace("{src}", esc(info.path)).replace("{w}", info.w || 1200).replace("{h}", info.h || 800), kind, info.alt, info.addFile);
      } });
      return;
    }
    var html = sn.html;
    if (kind === "row") {
      var c = e.cloneNode(true); stripMarks(c);
      qsa("th, td", c).forEach(function (cell) { cell.textContent = cell.localName === "th" ? "Label" : "Text"; });
      html = cleanHTML(c);
    }
    if (kind === "li" && e.getAttribute("class")) html = '<li class="' + esc(e.getAttribute("class")) + '">New item</li>';
    if (kind === "section") html = html.replace('id="new-section"', 'id="' + freeId("new-section") + '"');
    insertHTML(html, kind);
  }
  /* Table columns: add after, or delete, the column of the clicked cell */
  function columnCells(table, idx) {
    return qsa("tr", table).map(function (row) {
      var i = 0;
      for (var c = row.firstElementChild; c; c = c.nextElementSibling) { if (i === idx) return c; i += c.colSpan || 1; }
      return null;
    }).filter(Boolean);
  }
  function opColumn(del) {
    var e = S.sel;
    var cell = e && /^(td|th)$/.test(e.localName) ? e : (S.lastCell && S.lastCell.isConnected && e && e.contains(S.lastCell) ? S.lastCell : null);
    if (!cell) { toast("Click a cell of that column first."); return; }
    var table = cell.closest("table"), idx = 0, row = cell.parentElement;
    for (var c = cell.previousElementSibling; c; c = c.previousElementSibling) idx += c.colSpan || 1;
    var cells = columnCells(table, idx);
    if (del && row.children.length < 2) { toast("A table needs at least one column."); return; }
    stopEditing(true);
    transact(function () {
      cells.forEach(function (c) {
        if (del) { remove(c); return; }
        var head = !!c.closest("thead"), n = D.createElement(head ? "th" : "td");
        if (head) n.setAttribute("scope", "col");
        n.innerHTML = head ? '<span class="tba">New column</span>' : '<span class="tba">TBA</span>';
        c.parentNode.insertBefore(n, c.nextSibling);
      });
    });
    select(row.isConnected ? row : table);
    toast(del ? "Column deleted (Undo brings it back)." : "Column added. Click its cells to fill them in.");
  }
  function freeId(base) { if (!D.getElementById(base)) return base; var n = 2; while (D.getElementById(base + "-" + n)) n++; return base + "-" + n; }
  function insertHTML(html, kind, alt, before) {
    stopEditing();
    var first = null;
    transact(function () {
      if (before) before();
      var frag = htmlToNodes(html);
      if (alt != null) { var im = qs("img", frag); if (im) im.setAttribute("alt", alt); }
      first = placeNew(frag, kind);
    });
    if (!first) return;
    select(first);
    first.scrollIntoView({ block: "nearest" });
    var lf = firstLeaf(first);
    if (lf) { startEditing(lf); lf.focus(); selectContents(lf); }
  }


  /* =================================================================
     9. TEXT FORMATTING (bold, italic, link, "TBA" mark …)
     ================================================================= */
  var WRAPS = {
    b: { tag: "b", match: "b, strong" },
    em: { tag: "em", match: "em, i" },
    sup: { tag: "sup", match: "sup" },
    tba: { tag: "span", cls: "tba", match: ".tba" }
  };
  function selRange() {
    var s = getSelection();
    if (!S.leaf || !s.rangeCount) return null;
    var r = s.getRangeAt(0);
    return S.leaf.contains(r.commonAncestorContainer) ? r : null;
  }
  function closestIn(node, selector) {
    var e = node && (node.nodeType === 1 ? node : node.parentElement);
    var c = e && e.closest(selector);
    return c && S.leaf && S.leaf.contains(c) ? c : null;
  }
  function fmt(kind) {
    if (!S.leaf) return;
    var r = selRange();
    if (kind === "link") { openLinkDialog(r ? closestIn(r.startContainer, "a") : null, r ? r.cloneRange() : null); return; }
    if (!r) { toast("Click inside the text first."); return; }
    if (kind === "unlink") { var a = closestIn(r.startContainer, "a") || closestIn(r.endContainer, "a"); if (a) unwrap(a); }
    else if (kind === "clear") clearFormatting(r);
    else toggleWrap(r, kind);
    scheduleCommit();
    updateBars();
  }
  function toggleWrap(r, kind) {
    var w = WRAPS[kind];
    var a = closestIn(r.startContainer, w.match), b = closestIn(r.endContainer, w.match);
    if (a && (a === b || r.collapsed)) { unwrap(a); return; }
    var el = D.createElement(w.tag);
    if (w.cls) el.className = w.cls;
    if (r.collapsed) {
      if (kind !== "tba") { toast("Select some words first."); return; }
      el.textContent = "TBA";
      r.insertNode(el);
    } else {
      var frag = r.extractContents();
      qsa(w.match, frag).forEach(unwrap);
      el.appendChild(frag);
      r.insertNode(el);
    }
    selectContents(el);
  }
  function clearFormatting(r) {
    if (r.collapsed) {
      var f = closestIn(r.startContainer, "b, strong, em, i, sup, sub, u, s, small, mark, code, span");
      if (f && f !== S.leaf) unwrap(f);
      return;
    }
    var text = r.toString();
    r.deleteContents();
    var tn = D.createTextNode(text);
    r.insertNode(tn);
    qsa("b, strong, em, i, sup, sub, u, s, small, mark, code, span", S.leaf).forEach(function (f) { if (!/\S/.test(f.textContent)) remove(f); });
    selectContents(tn);
  }


  /* =================================================================
     10. SAVING EACH CHANGE · UNDO · SHARED HEADER AND FOOTER
     The page shown is written back to its file after every change
     (and after a short pause while typing). Each change is one undo
     step. A change to the header or footer is copied to every page.
     ================================================================= */
  var commitTimer = 0;
  function scheduleCommit() { clearTimeout(commitTimer); commitTimer = setTimeout(commit, 600); }
  function snapshot() { return { files: Object.assign(Object.create(null), S.files), page: S.page }; }
  function sameFiles(a, b) {
    var ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (var i = 0; i < ka.length; i++) if (a[ka[i]] !== b[ka[i]]) return false;
    return true;
  }
  function pushHistory(snap) { S.history.push(snap); if (S.history.length > 300) S.history.shift(); S.future = []; }

  function buildPageFromLive() {
    var d = parseHTML(S.files[S.page].text);
    var body = d.importNode(cleanClone(D.body), true);
    copyAttributes(body, d.body);          /* <body> attributes come from the file, never from the browser */
    d.documentElement.replaceChild(body, d.body);
    return serializeDocument(d);
  }
  function commitCore() {
    if (S.mode !== "edit" || !S.files[S.page]) return false;
    var before = S.files[S.page].text, after = buildPageFromLive();
    if (after === before) return false;
    setText(S.page, after);
    if (S.syncShared) shareParts(S.page, before, after);
    return true;
  }
  function commit() {
    clearTimeout(commitTimer);
    commitTimer = 0;
    if (S.mode !== "edit") return false;
    var snap = snapshot();
    if (!commitCore()) return false;
    pushHistory(snap);
    changed();
    return true;
  }
  /* Run a change as one undo step. opts.model: fn changes files directly
     (the page shown is then rebuilt from its file). */
  function transact(fn, opts) {
    opts = opts || {};
    if (S.mode === "edit") commit();
    var snap = snapshot();
    try { fn(); } catch (err) { console.error(err); toast("That did not work: " + err.message); }
    if (!opts.model && S.mode === "edit") commitCore();
    if (sameFiles(snap.files, S.files)) return false;
    pushHistory(snap);
    if (opts.model) render(S.files[S.page] ? S.page : pagePaths()[0], S.mode, null, { keepScroll: !opts.top });
    changed();
    return true;
  }
  function undo() {
    if (S.mode === "edit") commit();
    if (!S.history.length) { toast("Nothing to undo."); return; }
    S.future.push(snapshot());
    restoreSnap(S.history.pop());
  }
  function redo() {
    if (S.mode === "edit") commit();
    if (!S.future.length) { toast("Nothing to redo."); return; }
    S.history.push(snapshot());
    restoreSnap(S.future.pop());
  }
  function restoreSnap(s) {
    var same = s.page === S.page;
    S.files = s.files;
    render(S.files[s.page] ? s.page : pagePaths()[0], S.mode, null, { keepScroll: same });
    changed();
  }

  function sharedSignature(d) {
    return CONFIG.sharedParts.map(function (sel) {
      var e = qs(sel, d);
      if (!e) return "";
      var c = e.cloneNode(true);
      qsa("[aria-current]", c).forEach(function (x) { x.removeAttribute("aria-current"); });
      return serialize(c);
    }).join("\n");
  }
  /* aria-current="page" marks the menu link of the page you are on */
  function markCurrent(root, page) {
    qsa("nav a[href]", root).forEach(function (a) {
      var href = a.getAttribute("href");
      var p = href.indexOf("#") < 0 ? resolvePath(page, href) : null;
      if (p === page) a.setAttribute("aria-current", "page");
      else if (a.getAttribute("aria-current") === "page") a.removeAttribute("aria-current");
    });
  }
  function copySharedParts(fromDoc, fromPath, onlyIfChangedFrom) {
    if (onlyIfChangedFrom && sharedSignature(fromDoc) === sharedSignature(onlyIfChangedFrom)) return 0;
    var n = 0;
    pagePaths().forEach(function (q) {
      if (q === fromPath || !S.files[q]) return;
      var d = parseHTML(S.files[q].text), touched = false;
      CONFIG.sharedParts.forEach(function (sel) {
        var src = qs(sel, fromDoc), dst = qs(sel, d);
        if (!src || !dst) return;
        var c = d.importNode(src, true);
        markCurrent(c, q);
        if (serialize(c) !== serialize(dst)) { dst.parentNode.replaceChild(c, dst); touched = true; }
      });
      if (touched) { setText(q, serializeDocument(d)); n++; }
    });
    return n;
  }
  function shareParts(path, before, after) {
    var n = copySharedParts(parseHTML(after), path, parseHTML(before));
    if (n) toast("Header and footer updated on " + plural(n, "other page") + ".");
  }

  /* =================================================================
     11. DIALOGS
     ================================================================= */
  function field(label, control, hint) {
    return '<label class="field"><span class="field__label">' + esc(label) + "</span>" + control + (hint ? '<small class="field__hint">' + esc(hint) + "</small>" : "") + "</label>";
  }
  function dialog(o) {
    var dlg = D.createElement("dialog");
    dlg.className = "dlg" + (o.wide ? " dlg--wide" : "");
    var buttons = o.buttons || [{ act: "cancel", label: "Cancel" }, { act: "ok", label: "Apply", primary: true }];
    dlg.innerHTML = '<div class="dlg__in">' +
      '<header class="dlg__head"><h2>' + esc(o.title) + '</h2><button type="button" class="x" data-dlg="cancel" aria-label="Close">×</button></header>' +
      '<div class="dlg__body">' + o.body + "</div>" +
      '<footer class="dlg__foot">' + buttons.map(function (b) {
        return '<button type="button" class="btn' + (b.primary ? " primary" : "") + (b.danger ? " danger" : "") + (b.left ? " left" : "") + '" data-dlg="' + b.act + '">' + esc(b.label) + "</button>";
      }).join("") + "</footer></div>";
    ui.appendChild(dlg);
    var done = false;
    function close() { if (dlg.open) dlg.close(); }
    function act(name, btn) {
      if (name === "cancel") { close(); return; }
      var keep = o.onAction ? o.onAction(name, dlg, btn) : undefined;
      if (keep === false) return;
      if (keep && typeof keep.then === "function") { keep.then(function (k) { if (k !== false) close(); }); return; }
      close();
    }
    /* Enter in a one-line field applies (no <form>: some previews block form submission) */
    dlg.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" || e.shiftKey || e.isComposing || !e.target.matches('input[type="text"], input[type="search"], input:not([type])')) return;
      if (e.target.list && e.target.value === "") return;
      e.preventDefault();
      var p = qs(".dlg__foot button.primary", dlg);
      if (p) act(p.getAttribute("data-dlg"), p);
    });
    dlg.addEventListener("click", function (e) {
      var b = e.target.closest("[data-dlg]");
      if (!b) return;
      e.preventDefault();
      act(b.getAttribute("data-dlg"), b);
    });
    dlg.addEventListener("close", function () { if (done) return; done = true; remove(dlg); if (o.onClose) o.onClose(); });
    dlg.showModal();
    if (o.onOpen) o.onOpen(dlg);
    return dlg;
  }
  function confirmBox(title, html, okLabel, fn, danger) {
    dialog({ title: title, body: html, buttons: [{ act: "cancel", label: "Cancel" }, { act: "ok", label: okLabel, primary: true, danger: !!danger }], onAction: function () { fn(); } });
  }
  function tabKeys(ta) {
    ta.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || e.shiftKey) return;
      e.preventDefault();
      var s = ta.selectionStart;
      ta.setRangeText("  ", s, ta.selectionEnd, "end");
    });
  }

  /* ---- names for new files ---- */
  function safeName(name) {
    var m = /^(.*?)(\.[a-z0-9]+)?$/i.exec(String(name || "file").toLowerCase());
    var base = m[1].replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "") || "file";
    return base + (m[2] || "");
  }
  function freePath(folder, name) {
    var p = folder + name;
    if (!S.files[p]) return p;
    var m = /^(.*?)(\.[a-z0-9]+)?$/i.exec(name), n = 2;
    while (S.files[folder + m[1] + "-" + n + (m[2] || "")]) n++;
    return folder + m[1] + "-" + n + (m[2] || "");
  }
  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var rd = new FileReader();
      rd.onload = function () { resolve(rd.result); };
      rd.onerror = function () { reject(rd.error); };
      rd.readAsDataURL(file);
    });
  }
  function processImage(file, shrink, maxSide) {
    maxSide = maxSide || CONFIG.maxImageSide;
    return readFile(file).then(function (url) {
      return new Promise(function (resolve) {
        var im = new Image(), type = file.type || mimeOf(file.name), name = safeName(file.name);
        im.onload = function () {
          var w = im.naturalWidth, h = im.naturalHeight;
          if (shrink && Math.max(w, h) > maxSide && /^image\/(jpeg|png|webp)$/.test(type)) {
            var k = maxSide / Math.max(w, h), cw = Math.round(w * k), ch = Math.round(h * k);
            var cv = D.createElement("canvas");
            cv.width = cw; cv.height = ch;
            cv.getContext("2d").drawImage(im, 0, 0, cw, ch);
            var outType = type === "image/png" ? "image/png" : "image/jpeg";
            if (outType === "image/jpeg") name = name.replace(/\.[a-z0-9]+$/i, "") + ".jpg";
            resolve({ name: name, b64: cv.toDataURL(outType, CONFIG.jpegQuality).split(",")[1], w: cw, h: ch, type: outType, resized: true });
          } else {
            resolve({ name: name, b64: url.split(",")[1], w: w, h: h, type: type });
          }
        };
        im.onerror = function () { resolve({ name: name, b64: url.split(",")[1], w: 0, h: 0, type: type }); };
        im.src = url;
      });
    });
  }
  function imageSize(rec) {
    return new Promise(function (resolve) {
      var im = new Image();
      im.onload = function () { resolve({ w: im.naturalWidth, h: im.naturalHeight }); };
      im.onerror = function () { resolve({ w: 0, h: 0 }); };
      im.src = dataURL(rec);
    });
  }

  /* ---- Image ---- */
  function openImageDialog(img, opts) {
    opts = opts || {};
    stopEditing();
    var current = img ? getSource(img, "src") || "" : "";
    var galleryLink = img && img.parentElement && img.parentElement.matches("a.gallery__link") ? img.parentElement : null;
    if (galleryLink) current = galleryLink.getAttribute("href") || current;
    var currentPath = img ? resolvePath(S.page, current) : "";
    var staged = null, picked = null;
    var images = Object.keys(S.files).filter(function (p) { return isImagePath(p) && !/^assets\/(vendor|fonts)\//.test(p); }).sort();
    var body =
      '<div class="imgrow"><div class="thumb"><img alt="" data-thumb' + (img ? ' src="' + esc(img.getAttribute("src")) + '"' : "") + '></div><div class="imgside">' +
      '<p class="muted" data-info>' + (img ? "Now: <code>" + esc(current) + "</code>" : "No image chosen yet.") + "</p>" +
      '<label class="btn file">Upload a photo from your computer…<input type="file" accept="image/*" data-upload></label>' +
      '<label class="check"><input type="checkbox" data-shrink checked> Make large photos web-sized (recommended)</label>' +
      "</div></div>" +
      field("…or use an image that is already on the website", '<select data-pick><option value="">Choose an image…</option>' +
        images.map(function (p) { return '<option value="' + esc(p) + '"' + (p === currentPath ? " selected" : "") + ">" + esc(p) + "</option>"; }).join("") + "</select>") +
      field("Description for screen readers (alt text)", '<textarea rows="2" data-alt>' + esc(img ? img.getAttribute("alt") || "" : "") + "</textarea>",
        "Say what the picture shows. Leave it empty only for purely decorative images.");
    dialog({
      title: img ? "Change image" : "Add an image",
      body: body,
      buttons: [{ act: "cancel", label: "Cancel" }, { act: "ok", label: img ? "Apply" : "Add image", primary: true }],
      onOpen: function (dlg) {
        var thumb = qs("[data-thumb]", dlg), info = qs("[data-info]", dlg), pick = qs("[data-pick]", dlg), up = qs("[data-upload]", dlg);
        function useFile(f) {
          info.textContent = "Preparing " + f.name + "…";
          (galleryLink ? preparePhoto(f, qs("[data-shrink]", dlg).checked).then(function (st) {
            return { name: st.full, b64: st.fullB64, w: st.w, h: st.h, type: "image/jpeg", resized: true, path: st.full, gallery: st };
          }) : processImage(f, qs("[data-shrink]", dlg).checked)).then(function (res) {
            staged = res;
            staged.path = res.path || freePath(CONFIG.imageFolder, res.name);
            thumb.src = "data:" + res.type + ";base64," + res.b64;
            info.innerHTML = "New: <code>" + esc(staged.path) + "</code>" + (res.w ? " · " + res.w + " × " + res.h + " px" : "") + (res.resized ? " (scaled down)" : "");
            pick.value = "";
            picked = null;
          });
        }
        up.addEventListener("change", function () { if (up.files[0]) useFile(up.files[0]); });
        pick.addEventListener("change", function () {
          staged = null;
          picked = pick.value ? { path: pick.value } : null;
          if (!picked) return;
          var r = S.files[picked.path];
          thumb.src = dataURL(r);
          info.innerHTML = "Use: <code>" + esc(picked.path) + "</code>";
          imageSize(r).then(function (s) { if (picked && picked.path === pick.value) { picked.w = s.w; picked.h = s.h; info.innerHTML += " · " + s.w + " × " + s.h + " px"; } });
        });
        if (opts.file) useFile(opts.file);
      },
      onAction: function (act, dlg) {
        var alt = qs("[data-alt]", dlg).value.trim();
        var choice = staged || picked;
        if (!img && !choice) { toast("Choose or upload an image first."); return false; }
        var path = choice ? choice.path : null;
        var addFile = function () {
          if (!staged) return;
          S.files[staged.path] = makeRecord(staged.path, { b64: staged.b64 });
          if (staged.gallery && staged.gallery.thumbB64) S.files[staged.gallery.thumb] = makeRecord(staged.gallery.thumb, { b64: staged.gallery.thumbB64 });
        };
        if (opts.onPick) { opts.onPick({ path: relativePath(S.page, path), w: choice.w, h: choice.h, alt: alt, addFile: addFile }); return; }
        transact(function () {
          addFile();
          if (path && galleryLink) {
            var g = staged && staged.gallery;
            galleryLink.setAttribute("href", relativePath(S.page, path));
            setSource(img, "src", relativePath(S.page, g ? g.thumb : path));
            var tw = g ? g.tw : choice.w, th = g ? g.th : choice.h;
            if (tw && th) { img.setAttribute("width", tw); img.setAttribute("height", th); }
          } else if (path) {
            setSource(img, "src", relativePath(S.page, path));
            if (choice.w && choice.h && img.hasAttribute("width")) { img.setAttribute("width", choice.w); img.setAttribute("height", choice.h); }
          }
          img.setAttribute("alt", alt);
        });
        select(itemFor(img));
      }
    });
  }

  /* ---- Gallery: add many photos at once ---- */
  function galleryFor(e) {
    if (e && e.isConnected) {
      var g = e.closest("[data-gallery]") || qs("[data-gallery]", e);
      var sec = !g && e.closest("section");
      if (!g && sec) g = qs("[data-gallery]", sec);
      if (g) return g;
      return null;
    }
    return qs("main [data-gallery]");
  }
  var GALLERY_ALT = "Photograph from the National Strings Meeting 2026";
  function captionFromName(name) {
    var base = String(name).replace(/\.[a-z0-9]+$/i, "");
    if (/^(img|dsc|dscn|dcim|pxl|mvimg|whatsapp|screenshot|photo|image|p\d|\d)/i.test(base) || /^[a-f0-9-]{12,}$/i.test(base)) return "";
    base = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
    return base ? base.charAt(0).toUpperCase() + base.slice(1) : "";
  }
  function indentOf(el) {
    var w = el.previousSibling, m = w && w.nodeType === 3 ? /([ \t]*)$/.exec(w.data) : null;
    return m ? m[1] : "";
  }
  function galleryItemHTML(st, ind) {
    return '<li class="gallery__item">\n' +
      ind + '  <figure>\n' +
      ind + '    <a class="gallery__link" href="' + esc(st.full) + '"><img src="' + esc(st.thumb) + '" alt="' + esc(st.alt) + '" width="' + st.tw + '" height="' + st.th + '" loading="lazy" decoding="async"></a>\n' +
      ind + "    <figcaption>" + esc(st.caption) + "</figcaption>\n" +
      ind + "  </figure>\n" +
      ind + "</li>";
  }
  /* Read a photo: a web-sized copy and a small copy for the grid */
  function preparePhoto(file, shrink) {
    return Promise.all([processImage(file, shrink), processImage(file, true, CONFIG.thumbSide)]).then(function (res) {
      var full = res[0], thumb = res[1];
      var fullPath = freePath(CONFIG.galleryFolder, full.name);
      var st = { name: file.name, full: fullPath, fullOrig: fullPath, fullB64: full.b64, w: full.w, h: full.h, thumb: fullPath, thumbB64: null, tw: full.w, th: full.h };
      if (thumb.resized) {
        st.thumb = CONFIG.galleryFolder + "thumbs/" + fullPath.slice(CONFIG.galleryFolder.length).replace(/\.[a-z0-9]+$/i, "") + (thumb.type === "image/png" ? ".png" : ".jpg");
        st.thumbB64 = thumb.b64; st.tw = thumb.w; st.th = thumb.h; st.thumbType = thumb.type;
      }
      return st;
    });
  }
  function openAddPhotos(list) {
    list = list || galleryFor(null);
    if (!list) { toast("This page has no photo gallery. Use the Gallery page, or add a list with data-gallery."); return; }
    if (S.mode !== "edit") render(S.page, "edit", null, { keepScroll: true });
    stopEditing();
    var staged = [], busy = 0, reserved = {};
    dialog({
      title: "Add photos to the gallery",
      wide: true,
      body: "<p>Choose one or more photos. Each one is scaled to web size and stored in <code>" + esc(CONFIG.galleryFolder) + "</code>, with a small copy for the grid. You can change captions afterwards by clicking them.</p>" +
        '<p><label class="btn primary file">Choose photos…<input type="file" accept="image/*" multiple data-upload></label></p>' +
        '<label class="check"><input type="checkbox" data-shrink checked> Make large photos web-sized (recommended)</label>' +
        '<label class="check"><input type="checkbox" data-names checked> Use the file names as first captions (photo-camera names such as IMG_1234 are left blank)</label>' +
        '<label class="check"><input type="checkbox" data-first> Put them at the start of the gallery (newest first)</label>' +
        '<p class="muted" data-info>No photos chosen yet.</p><div class="photogrid" data-grid></div>',
      buttons: [{ act: "cancel", label: "Cancel" }, { act: "ok", label: "Add photos", primary: true }],
      onOpen: function (dlg) {
        var info = qs("[data-info]", dlg), grid = qs("[data-grid]", dlg);
        qs("[data-upload]", dlg).addEventListener("change", function () {
          var files = Array.prototype.slice.call(this.files).filter(function (f) { return /^image\//.test(f.type) || isImagePath(f.name); });
          var shrink = qs("[data-shrink]", dlg).checked;
          busy += files.length;
          info.textContent = "Preparing " + plural(files.length, "photo") + "…";
          files.reduce(function (chain, f) {
            return chain.then(function () {
              return preparePhoto(f, shrink).then(function (st) {
                /* keep names unique within this batch too */
                while (reserved[st.full] || (S.files[st.full] && st.full !== st.fullOrig)) { st.full = st.full.replace(/(-\d+)?(\.[a-z0-9]+)$/i, function (m, n, ext) { return "-" + ((n ? -parseInt(n, 10) : 1) + 1) + ext; }); }
                reserved[st.full] = 1;
                if (st.thumbB64) st.thumb = CONFIG.galleryFolder + "thumbs/" + st.full.slice(CONFIG.galleryFolder.length).replace(/\.[a-z0-9]+$/i, "") + (st.thumbType === "image/png" ? ".png" : ".jpg");
                else st.thumb = st.full;
                staged.push(st);
                var fig = D.createElement("figure");
                fig.innerHTML = '<img alt="" src="data:image/jpeg;base64,' + (st.thumbB64 || st.fullB64) + '"><figcaption>' + esc(f.name) + "</figcaption>";
                grid.appendChild(fig);
              });
            }).catch(function () { toast("Could not read " + f.name + "."); }).then(function () {
              busy--;
              info.textContent = busy ? "Preparing… " + plural(staged.length, "photo") + " ready." : plural(staged.length, "photo") + " ready to add.";
            });
          }, Promise.resolve());
        });
      },
      onAction: function (act, dlg) {
        if (busy) { toast("Still preparing the photos — a moment please."); return false; }
        if (!staged.length) { toast("Choose some photos first."); return false; }
        var names = qs("[data-names]", dlg).checked, first = qs("[data-first]", dlg).checked, added = [];
        transact(function () {
          var ind = indentOf(list) + "  ";
          var tail = list.lastChild && isWs(list.lastChild) ? list.lastChild : null;
          if (!tail) { tail = D.createTextNode("\n" + indentOf(list)); list.appendChild(tail); }
          var firstEl = list.firstElementChild;
          var ref = first && firstEl ? (nodesBefore(firstEl, true)[0] || firstEl) : tail;
          staged.forEach(function (st) {
            S.files[st.full] = makeRecord(st.full, { b64: st.fullB64 });
            if (st.thumbB64) S.files[st.thumb] = makeRecord(st.thumb, { b64: st.thumbB64 });
            st.caption = names ? captionFromName(st.name) : "";
            st.alt = st.caption || GALLERY_ALT;
            var frag = htmlToNodes(galleryItemHTML(st, ind));
            var li = qs("li", frag);
            list.insertBefore(D.createTextNode("\n" + ind), ref);
            list.insertBefore(li, ref);
            added.push(li);
          });
        });
        if (added[0]) { select(added[0]); added[0].scrollIntoView({ block: "center" }); }
        toast("Added " + plural(added.length, "photo") + ". Click a caption to change it; select a photo to move or remove it.", 6000);
      }
    });
  }

  /* ---- Fill a table from a spreadsheet (e.g. the list of participants) ---- */
  /* Rows copied from Excel / Google Sheets arrive tab-separated; a .csv file
     is comma- (or semicolon-) separated. Quotes around cells are handled. */
  function parseRows(text) {
    text = String(text || "").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
    if (!/\S/.test(text)) return [];
    var head = text.split("\n", 1)[0];
    var delim = text.indexOf("\t") !== -1 ? "\t" : ((head.match(/;/g) || []).length > (head.match(/,/g) || []).length ? ";" : ",");
    var rows = [], row = [], cell = "", q = false, i, ch;
    for (i = 0; i < text.length; i++) {
      ch = text.charAt(i);
      if (q) {
        if (ch === '"') { if (text.charAt(i + 1) === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"' && !/\S/.test(cell)) { q = true; cell = ""; }
      else if (ch === delim) { row.push(cell); cell = ""; }
      else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += ch;
    }
    row.push(cell); rows.push(row);
    return rows.map(function (r) { return r.map(function (c) { return c.replace(/\s+/g, " ").trim(); }); })
      .filter(function (r) { return r.some(function (c) { return c; }); });
  }
  function isPlaceholderRow(tr) {
    var first = tr.cells && tr.cells[0];
    return /(^|[\s_-])tba($|[\s_-])/i.test(tr.getAttribute("class") || "") || !!(first && qs(".tba", first));
  }
  function tableHeads(table) {
    var hr = qs("thead tr", table) || qs("tr", table);
    return hr ? qsa("th, td", hr).map(function (c) { return c.textContent.replace(/\s+/g, " ").trim() || "Column"; }) : [];
  }
  function tableName(table, i) {
    var cap = qs("caption", table), sec = table.closest("section"), h = sec && qs("h2, h3", sec);
    return (cap && cap.textContent.trim()) || (h && h.textContent.trim()) || "Table " + (i + 1);
  }
  /* Which kind of column a heading names ("Name of institute" is an institution) */
  var COLUMN_WORDS = [
    ["email", /\b(e-?mail)\b/i],
    ["institution", /\b(institution|institute|affiliation|university|organi[sz]ation|college|department)\b/i],
    ["position", /\b(position|designation|category|status|role)\b/i],
    ["name", /\b(full ?name|name|participant|attendee)\b/i],
    ["time", /\b(time ?stamp|date)\b/i]
  ];
  function columnKind(h) {
    for (var i = 0; i < COLUMN_WORDS.length; i++) if (COLUMN_WORDS[i][1].test(h)) return COLUMN_WORDS[i][0];
    return "";
  }
  function guessColumn(head, pastedHeads) {
    var h = head.toLowerCase().trim(), kind = columnKind(head), best = -1;
    pastedHeads.some(function (p, i) { if (p.toLowerCase().trim() === h) { best = i; return true; } return false; });
    if (best < 0 && kind) pastedHeads.some(function (p, i) { if (columnKind(p) === kind) { best = i; return true; } return false; });
    return best;
  }
  function openFillTable(table) {
    if (S.mode !== "edit") render(S.page, "edit", null, { keepScroll: true });
    stopEditing();
    var tables = qsa("main table");
    if (table && !table.isConnected) table = null;
    if (!tables.length) { toast("This page has no table. Add one with ＋ → Table first."); return; }
    var pick = table ? tables.indexOf(table) : 0;
    var rows = [], firstRun = true;
    dialog({
      title: "Fill a table from a spreadsheet",
      wide: true,
      body:
        "<p>In Excel, Google Sheets or LibreOffice, select the rows (for example the responses of the registration form), copy them, and paste them below. Each line becomes one row of the table. You can also open a .csv file.</p>" +
        (tables.length > 1 ? field("Table", '<select data-table>' + tables.map(function (t, i) { return '<option value="' + i + '"' + (i === pick ? " selected" : "") + ">" + esc(tableName(t, i)) + "</option>"; }).join("") + "</select>") : "") +
        field("Rows", '<textarea data-paste rows="7" spellcheck="false" placeholder="Paste here (Ctrl+V / ⌘+V)"></textarea>') +
        '<p><label class="btn file">Open a .csv file…<input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" data-upload></label></p>' +
        '<label class="check"><input type="checkbox" data-header> The first line holds column names (it is not added to the table)</label>' +
        '<div class="mapgrid" data-map></div>' +
        '<fieldset class="radios"><legend>Rows already in the table</legend>' +
          '<label class="check"><input type="radio" name="ed-fill-mode" value="replace" checked> Replace them with the pasted rows</label>' +
          '<label class="check"><input type="radio" name="ed-fill-mode" value="append"> Keep them and add the pasted rows after them</label>' +
          '<span class="muted">“TBA” placeholder rows are removed either way.</span>' +
        "</fieldset>" +
        field("Order", '<select data-order><option value="">As pasted</option><option value="first">A to Z by the first column</option><option value="surname">A to Z by surname (the last word of the first column)</option></select>') +
        '<label class="check"><input type="checkbox" data-dedupe checked> Leave out repeated rows (for example someone who filled in the form twice)</label>' +
        '<p class="count" data-info></p><div class="tablepreview" data-preview></div>',
      buttons: [{ act: "cancel", label: "Cancel" }, { act: "ok", label: "Fill the table", primary: true }],
      onOpen: function (dlg) {
        var ta = qs("[data-paste]", dlg);
        function current() { return tables[qs("[data-table]", dlg) ? +qs("[data-table]", dlg).value : pick]; }
        function heads() { return tableHeads(current()); }
        function pastedHeads(hasHead) {
          var n = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0), out = [];
          for (var i = 0; i < n; i++) {
            var letter = String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : "");
            out.push(hasHead && rows[0] && rows[0][i] ? rows[0][i] : "Column " + letter + (rows[hasHead ? 1 : 0] && rows[hasHead ? 1 : 0][i] ? " (" + rows[hasHead ? 1 : 0][i].slice(0, 28) + ")" : ""));
          }
          return out;
        }
        function buildMap() {
          var hasHead = qs("[data-header]", dlg).checked, ph = pastedHeads(hasHead), th = heads();
          qs("[data-map]", dlg).innerHTML = rows.length ? th.map(function (h, j) {
            var g = hasHead ? guessColumn(h, ph) : -1;
            if (g < 0) g = j < ph.length ? j : -1;
            return field("Table column “" + h + "” gets", '<select data-col="' + j + '"><option value="-1">(leave empty)</option>' +
              ph.map(function (p, i) { return '<option value="' + i + '"' + (i === g ? " selected" : "") + ">" + esc(p) + "</option>"; }).join("") + "</select>");
          }).join("") : "";
          preview();
        }
        function preview() {
          var res = fillResult(dlg, rows, current());
          var info = qs("[data-info]", dlg), box = qs("[data-preview]", dlg);
          if (!rows.length) { info.textContent = ""; box.innerHTML = ""; return; }
          info.textContent = plural(res.rows.length, "row") + " will be " + (res.mode === "append" ? "added" : "put in the table") + (res.skipped ? " (" + plural(res.skipped, "repeated row") + " left out)" : "") + ".";
          box.innerHTML = "<table><thead><tr>" + res.heads.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") + "</tr></thead><tbody>" +
            res.rows.slice(0, 6).map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") +
            (res.rows.length > 6 ? '<tr><td colspan="' + res.heads.length + '">… and ' + (res.rows.length - 6) + " more</td></tr>" : "") + "</tbody></table>";
        }
        function parse() {
          rows = parseRows(ta.value);
          if (firstRun && rows.length > 1) {
            firstRun = false;
            /* a first line made of column names? */
            var first = rows[0].join(" ");
            qs("[data-header]", dlg).checked = rows[0].filter(function (c) { return columnKind(c); }).length >= Math.min(2, rows[0].length);
          }
          buildMap();
        }
        ta.addEventListener("input", parse);
        qs("[data-header]", dlg).addEventListener("change", buildMap);
        if (qs("[data-table]", dlg)) qs("[data-table]", dlg).addEventListener("change", buildMap);
        dlg.addEventListener("change", function (e) { if (e.target.matches("[data-col], [data-order], [data-dedupe], [name=ed-fill-mode]")) preview(); });
        qs("[data-upload]", dlg).addEventListener("change", function () {
          var f = this.files[0];
          if (!f) return;
          var rd = new FileReader();
          rd.onload = function () { ta.value = String(rd.result); firstRun = true; parse(); };
          rd.onerror = function () { toast("Could not read " + f.name + "."); };
          rd.readAsText(f);
        });
        ta.focus();
      },
      onAction: function (act, dlg) {
        var t = tables[qs("[data-table]", dlg) ? +qs("[data-table]", dlg).value : pick];
        var res = fillResult(dlg, rows, t);
        if (!res.rows.length) { toast(rows.length ? "Nothing to add: choose which pasted column goes into each table column." : "Paste some rows first."); return false; }
        applyFill(t, res);
        toast(res.mode === "append" ? "Added " + plural(res.rows.length, "row") + ". Undo removes them again." : "The table now has " + plural(res.rows.length, "row") + " from the spreadsheet. Undo brings the old rows back.", 6000);
      }
    });
  }
  /* What the table will get, from the pasted rows and the dialog's choices */
  function fillResult(dlg, rows, table) {
    var hasHead = qs("[data-header]", dlg).checked;
    var heads = tableHeads(table);
    var map = heads.map(function (h, j) { var s = qs('[data-col="' + j + '"]', dlg); return s ? +s.value : j; });
    var mode = (qs("[name=ed-fill-mode]:checked", dlg) || {}).value || "replace";
    var body = (hasHead ? rows.slice(1) : rows).map(function (r) { return map.map(function (i) { return i >= 0 ? r[i] || "" : ""; }); })
      .filter(function (r) { return r.some(function (c) { return c; }); });
    /* a repeated row = the same first two columns (name and institution) */
    var seen = Object.create(null), skipped = 0;
    var rowKey = function (cells) { return cells.slice(0, 2).join("\t").replace(/\s+/g, " ").trim().toLowerCase(); };
    if (mode === "append") qsa("tbody tr", table).forEach(function (tr) { if (!isPlaceholderRow(tr)) seen[rowKey(qsa("th, td", tr).map(function (c) { return c.textContent; }))] = 1; });
    if (qs("[data-dedupe]", dlg).checked) {
      body = body.filter(function (r) {
        var k = rowKey(r);
        if (seen[k]) { skipped++; return false; }
        seen[k] = 1; return true;
      });
    }
    var order = qs("[data-order]", dlg).value;
    if (order) {
      var key = function (r) { var s = r[0] || ""; if (order === "surname") { var w = s.replace(/[.,]/g, " ").trim().split(/\s+/); s = w[w.length - 1] + " " + s; } return s; };
      body.sort(function (a, b) { return key(a).localeCompare(key(b), undefined, { sensitivity: "base" }); });
    }
    return { rows: body, heads: heads, mode: mode, skipped: skipped };
  }
  function applyFill(table, res) {
    var tbody = qs("tbody", table) || table;
    var existing = qsa(":scope > tr", tbody);
    var model = existing.filter(function (tr) { return !isPlaceholderRow(tr); })[0] || existing[0];
    var ind = model ? indentOf(model) : indentOf(tbody) + "  ";
    var cells = model ? qsa(":scope > th, :scope > td", model) : [];
    var cls = model ? (model.getAttribute("class") || "").split(/\s+/).filter(function (c) { return c && !/tba/i.test(c); }).join(" ") : "";
    function rowHTML(r) {
      return "<tr" + (cls ? ' class="' + esc(cls) + '"' : "") + ">" + r.map(function (v, j) {
        var c = cells[j] || cells[cells.length - 1], tag = c ? c.localName : (j === 0 ? "th" : "td");
        var scope = tag === "th" ? ' scope="' + esc((c && c.getAttribute("scope")) || "row") + '"' : "";
        var cc = c && c.getAttribute("class") ? ' class="' + esc(c.getAttribute("class")) + '"' : "";
        return "<" + tag + scope + cc + ">" + esc(v) + "</" + tag + ">";
      }).join("") + "</tr>";
    }
    transact(function () {
      existing.forEach(function (tr) {
        if (res.mode === "replace" || isPlaceholderRow(tr)) { var w = tr.previousSibling; if (isWs(w)) remove(w); remove(tr); }
      });
      var tail = tbody.lastChild && isWs(tbody.lastChild) ? tbody.lastChild : null;
      if (!tail) { tail = D.createTextNode("\n" + indentOf(tbody)); tbody.appendChild(tail); }
      var frag = htmlToNodes("<table><tbody>" + res.rows.map(rowHTML).join("") + "</tbody></table>");
      qsa("tr", frag).forEach(function (tr) {
        tbody.insertBefore(D.createTextNode("\n" + ind), tail);
        tbody.insertBefore(tr, tail);
      });
    });
    select(table);
    table.scrollIntoView({ block: "nearest" });
  }

  /* ---- Link ---- */
  function linkTargets() {
    var out = [];
    pagePaths().forEach(function (p) {
      out.push(p);
      qsa("main [id]", parseHTML(S.files[p].text)).forEach(function (e) {
        if (/^(section|article|div|h2|h3|ol|ul)$/.test(e.localName) && !/title$/.test(e.id)) out.push(p + "#" + e.id);
      });
    });
    Object.keys(S.files).sort().forEach(function (p) { if (/^assets\/(docs|talks)\//.test(p) && !/readme/i.test(p)) out.push(p); });
    return out;
  }
  function openLinkDialog(a, range) {
    var href = a ? a.getAttribute("href") || "" : "", staged = null;
    var body =
      field("Link to", '<input type="text" data-href list="ed-link-list" autocomplete="off" value="' + esc(href) + '" placeholder="registration.html  ·  https://…  ·  name@iitk.ac.in">' +
        '<datalist id="ed-link-list">' + linkTargets().map(function (t) { return '<option value="' + esc(t) + '">'; }).join("") + "</datalist>",
        "A page of this site (registration.html), a part of a page (registration.html#fees), a web address (https://…) or an e-mail address.") +
      '<p class="mt"><label class="btn file">Upload a file (PDF, slides …) and link to it<input type="file" data-upload></label> <span class="muted" data-info></span></p>';
    var buttons = [];
    if (a) buttons.push({ act: "unlink", label: "Remove link", danger: true, left: true });
    buttons.push({ act: "cancel", label: "Cancel" }, { act: "ok", label: a ? "Apply" : "Add link", primary: true });
    dialog({
      title: a ? "Edit link" : "Add a link",
      body: body,
      buttons: buttons,
      onOpen: function (dlg) {
        var up = qs("[data-upload]", dlg), input = qs("[data-href]", dlg);
        up.addEventListener("change", function () {
          var f = up.files[0];
          if (!f) return;
          readFile(f).then(function (url) {
            staged = { path: freePath(CONFIG.fileFolder, safeName(f.name)), b64: url.split(",")[1] };
            input.value = staged.path;
            qs("[data-info]", dlg).textContent = "Will be saved as " + staged.path;
          });
        });
        input.focus();
        input.select();
      },
      onAction: function (act, dlg) {
        if (act === "unlink") { transact(function () { unwrap(a); }); return; }
        var v = qs("[data-href]", dlg).value.trim();
        if (!v) { toast("Type where the link should go."); return false; }
        if (/^www\./i.test(v)) v = "https://" + v;
        if (/^[^@\s/:]+@[^@\s/]+\.[a-z]{2,}$/i.test(v)) v = "mailto:" + v;
        transact(function () {
          if (staged && staged.path === v) S.files[staged.path] = makeRecord(staged.path, { b64: staged.b64 });
          var el = a;
          if (!el) {
            if (!range) return;
            el = D.createElement("a");
            if (range.collapsed) { el.textContent = v.replace(/^mailto:/, ""); }
            else { var frag = range.extractContents(); qsa("a", frag).forEach(unwrap); el.appendChild(frag); }
            range.insertNode(el);
          }
          el.setAttribute("href", v);
          /* every link of the site opens in the same tab */
          el.removeAttribute("target");
          if (/^(noopener|noreferrer|noopener noreferrer)$/.test(el.getAttribute("rel") || "")) el.removeAttribute("rel");
        });
      }
    });
  }

  /* ---- HTML of one block ---- */
  function openHTMLDialog(el) {
    stopEditing();
    var anchor = S.sel;
    var code = el ? cleanHTML(el) : '<p>Your text or HTML here.</p>';
    dialog({
      title: el ? "Edit the HTML of this block" : "Add your own HTML",
      wide: true,
      body: '<p class="muted">' + (el ? "Change anything below and press Apply. Empty the box to delete the block." : "It is added after the selected block.") + "</p>" +
        '<textarea class="code" data-code spellcheck="false" autocapitalize="off" autocomplete="off">' + esc(code) + "</textarea>",
      onOpen: function (dlg) { var ta = qs("[data-code]", dlg); tabKeys(ta); ta.focus(); },
      onAction: function (act, dlg) {
        var html = qs("[data-code]", dlg).value, first = null;
        transact(function () {
          var frag = htmlToNodes(html);
          if (!el) { S.sel = anchor; first = placeNew(frag, "html"); return; }
          first = kids(frag).filter(function (n) { return n.nodeType === 1; })[0] || null;
          kids(frag).forEach(function (n) { el.parentNode.insertBefore(n, el); });
          if (!first) nodesBefore(el, false).forEach(remove);
          remove(el);
        });
        S.sel = null;
        select(first && first.isConnected ? first : null);
      }
    });
  }

  /* ---- Page title and description ---- */
  function openPageSettings() {
    if (S.mode === "edit") commit();
    var d = parseHTML(S.files[S.page].text);
    var t = qs("title", d.head), m = qs('meta[name="description"]', d.head);
    dialog({
      title: "Page title and description",
      body: '<p class="muted">Page file: <code>' + esc(S.page) + "</code></p>" +
        field("Title (browser tab, bookmarks, search results)", '<input type="text" data-title value="' + esc(t ? t.textContent : "") + '">') +
        field("Description (shown by search engines)", '<textarea rows="3" data-desc>' + esc(m ? m.getAttribute("content") : "") + "</textarea>"),
      onAction: function (act, dlg) {
        var nt = qs("[data-title]", dlg).value.trim(), nd = qs("[data-desc]", dlg).value.trim();
        transact(function () {
          var d2 = parseHTML(S.files[S.page].text);
          var t2 = qs("title", d2.head);
          if (!t2) { t2 = d2.createElement("title"); d2.head.appendChild(t2); }
          t2.textContent = nt;
          var m2 = qs('meta[name="description"]', d2.head);
          if (!m2 && nd) { m2 = d2.createElement("meta"); m2.setAttribute("name", "description"); t2.parentNode.insertBefore(m2, t2.nextSibling); t2.parentNode.insertBefore(d2.createTextNode("\n  "), m2); }
          if (m2) m2.setAttribute("content", nd);
          setText(S.page, serializeDocument(d2));
        }, { model: true });
      }
    });
  }

  /* ---- New page / remove page ---- */
  function titleHTML(label) {
    var words = esc(label).split(" ");
    if (words.length === 1) return "<em>" + words[0] + "</em>";
    var last = words.pop();
    return words.join(" ") + " <em>" + last + "</em>";
  }
  function addListLink(list, d, href, label) {
    var li = d.createElement("li"), a = d.createElement("a");
    a.setAttribute("href", href);
    a.textContent = label;
    li.appendChild(a);
    appendInside(li, list);
  }
  function createPage(file, label, from, addMenu) {
    var d = parseHTML(S.files[S.page].text);
    if (from === "blank") {
      var main = qs("main", d.body);
      if (main) main.innerHTML =
        "\n\n  <!-- ===================================================================\n       PAGE TITLE\n       =================================================================== -->\n" +
        '  <header class="page-head">\n    <div class="wrap">\n      <p class="eyebrow">NSM 2026 · <b>' + esc(label) + "</b></p>\n" +
        "      <h1>" + titleHTML(label) + "</h1>\n" +
        '      <p class="lead">A short introduction to this page.</p>\n    </div>\n  </header>\n\n\n' +
        '  <section class="band" id="content">\n    <div class="wrap">\n      <div class="prose">\n        <p>Write the content of this page here.</p>\n      </div>\n    </div>\n  </section>\n\n';
    }
    var t = qs("title", d.head);
    if (t) t.textContent = label + " · National Strings Meeting 2026 · IIT Kanpur";
    var m = qs('meta[name="description"]', d.head);
    if (m) m.setAttribute("content", label + " — National Strings Meeting 2026, IIT Kanpur.");
    if (addMenu) {
      var nav = qs("header.masthead nav ul", d.body), foot = qs("footer.site-footer .footer__list", d.body);
      if (nav) addListLink(nav, d, file, label);
      if (foot) addListLink(foot, d, file, label);
    }
    CONFIG.sharedParts.forEach(function (sel) { var part = qs(sel, d); if (part) markCurrent(part, file); });
    setText(file, serializeDocument(d));
    if (addMenu) copySharedParts(d, file, null);
  }
  function openNewPage() {
    if (S.mode === "edit") commit();
    var edited = false;
    dialog({
      title: "Add a page",
      body: field("Name in the menu", '<input type="text" data-label value="New page">') +
        field("File name", '<input type="text" data-file value="new-page.html">', "Lower-case letters, digits and hyphens, ending in .html.") +
        '<fieldset class="radios"><legend>Start from</legend>' +
        '<label class="check"><input type="radio" name="from" value="blank" checked> A simple page with a title and one section</label>' +
        '<label class="check"><input type="radio" name="from" value="copy"> A copy of this page (' + esc(S.page) + ")</label></fieldset>" +
        '<label class="check"><input type="checkbox" data-menu checked> Add it to the menu and the footer of every page</label>',
      buttons: [{ act: "cancel", label: "Cancel" }, { act: "ok", label: "Add page", primary: true }],
      onOpen: function (dlg) {
        var label = qs("[data-label]", dlg), file = qs("[data-file]", dlg);
        file.addEventListener("input", function () { edited = true; });
        label.addEventListener("input", function () { if (!edited) file.value = (safeName(label.value).replace(/\./g, "-") || "page") + ".html"; });
        label.focus(); label.select();
      },
      onAction: function (act, dlg) {
        var label = qs("[data-label]", dlg).value.trim() || "New page";
        var file = qs("[data-file]", dlg).value.trim().toLowerCase();
        var from = qs('input[name="from"]:checked', dlg).value, menu = qs("[data-menu]", dlg).checked;
        if (!/^[a-z0-9][a-z0-9-]*\.html$/.test(file)) { toast("Use a file name like my-page.html"); return false; }
        if (S.files[file]) { toast(file + " already exists."); return false; }
        transact(function () { createPage(file, label, from, menu); S.page = file; }, { model: true, top: true });
        if (S.mode !== "edit") render(file, "edit");
        toast("Page added: " + file);
      }
    });
  }
  function openRemovePage() {
    var gone = S.page;
    if (gone === "index.html") { toast("The home page (index.html) cannot be removed."); return; }
    dialog({
      title: "Remove this page?",
      body: "<p>This removes <code>" + esc(gone) + "</code> from the website.</p>" +
        '<label class="check"><input type="checkbox" data-links checked> Also remove links to it from the menu and the footer</label>' +
        '<p class="muted">Links to it inside the text of other pages are not changed. Undo brings the page back.</p>',
      buttons: [{ act: "cancel", label: "Cancel" }, { act: "ok", label: "Remove page", primary: true, danger: true }],
      onAction: function (act, dlg) {
        var links = qs("[data-links]", dlg).checked;
        transact(function () {
          delete S.files[gone];
          var home = S.files["index.html"] ? "index.html" : pagePaths()[0];
          S.page = home;
          if (!links || !home) return;
          var d = parseHTML(S.files[home].text);
          qsa(CONFIG.sharedParts.join(","), d).forEach(function (part) {
            qsa("a[href]", part).forEach(function (a) {
              if (resolvePath(home, a.getAttribute("href")) !== gone) return;
              var li = a.closest("li");
              if (li) { nodesBefore(li, false).forEach(remove); remove(li); }
            });
          });
          setText(home, serializeDocument(d));
          copySharedParts(d, home, null);
        }, { model: true, top: true });
        toast(gone + " removed.");
      }
    });
  }

  /* ---- Find and replace ---- */
  function findAll(find, o, replacement) {
    var re = new RegExp(escRe(find), o.cs ? "g" : "gi"), total = 0, pages = 0;
    (o.all ? pagePaths() : [S.page]).forEach(function (p) {
      var d = parseHTML(S.files[p].text), n = 0;
      function fix(s) {
        var m = s.match(re);
        if (!m) return s;
        n += m.length;
        return replacement == null ? s : s.replace(re, function () { return replacement; });
      }
      var w = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT), list = [];
      while (w.nextNode()) list.push(w.currentNode);
      list.forEach(function (t) {
        if (t.parentElement && /^(script|style)$/.test(t.parentElement.localName)) return;
        var v = fix(t.data);
        if (v !== t.data) t.data = v;
      });
      if (o.attrs) {
        qsa("[alt], [title], [aria-label]", d.body).forEach(function (e) {
          ["alt", "title", "aria-label"].forEach(function (a) { if (e.hasAttribute(a)) { var v = fix(e.getAttribute(a)); if (v !== e.getAttribute(a)) e.setAttribute(a, v); } });
        });
        var t = qs("title", d.head), m = qs('meta[name="description"]', d.head);
        if (t) { var tv = fix(t.textContent); if (tv !== t.textContent) t.textContent = tv; }
        if (m) { var mv = fix(m.getAttribute("content") || ""); if (mv !== m.getAttribute("content")) m.setAttribute("content", mv); }
      }
      if (n) { total += n; pages++; if (replacement != null) setText(p, serializeDocument(d)); }
    });
    return { count: total, pages: pages };
  }
  function openFindReplace() {
    if (S.mode === "edit") commit();
    var initial = "";
    var s = getSelection();
    if (s && s.rangeCount && !s.isCollapsed) initial = s.toString().slice(0, 80);
    dialog({
      title: "Find and replace",
      body: field("Find", '<input type="text" data-find value="' + esc(initial) + '">') +
        field("Replace with", '<input type="text" data-repl>') +
        '<label class="check"><input type="checkbox" data-all checked> On every page</label>' +
        '<label class="check"><input type="checkbox" data-attrs checked> Also in page titles, descriptions and image descriptions</label>' +
        '<label class="check"><input type="checkbox" data-cs> Match capital letters exactly</label>' +
        '<p class="count" data-count aria-live="polite"></p>',
      buttons: [{ act: "cancel", label: "Close" }, { act: "ok", label: "Replace all", primary: true }],
      onOpen: function (dlg) {
        function opts() { return { all: qs("[data-all]", dlg).checked, attrs: qs("[data-attrs]", dlg).checked, cs: qs("[data-cs]", dlg).checked }; }
        function count() {
          var f = qs("[data-find]", dlg).value;
          var out = qs("[data-count]", dlg);
          if (!f) { out.textContent = ""; return; }
          var r = findAll(f, opts(), null);
          out.textContent = r.count ? plural(r.count, "match", "matches") + " on " + plural(r.pages, "page") + "." : "No matches.";
        }
        qsa("input", dlg).forEach(function (i) { i.addEventListener("input", count); i.addEventListener("change", count); });
        dlg._opts = opts;
        count();
        qs("[data-find]", dlg).focus();
      },
      onAction: function (act, dlg) {
        var f = qs("[data-find]", dlg).value, r = qs("[data-repl]", dlg).value;
        if (!f) { toast("Type the text to find."); return false; }
        var res = null;
        transact(function () { res = findAll(f, dlg._opts(), r); }, { model: true });
        toast(res && res.count ? "Replaced " + plural(res.count, "match", "matches") + " on " + plural(res.pages, "page") + "." : "Nothing to replace.");
      }
    });
  }

  /* ---- Colours and fonts (the :root settings of css/style.css) ---- */
  function parseRoot(css) {
    var m = /:root\s*\{([\s\S]*?)\n\}/.exec(css);
    if (!m) return null;
    var start = m.index + m[0].indexOf("{") + 1, rows = [];
    m[1].split("\n").forEach(function (line) {
      var g = /^\s*\/\*\s*(.*?)\s*\*\/\s*$/.exec(line);
      if (g) { rows.push({ group: g[1] }); return; }
      var v = /^\s*(--[\w-]+)\s*:\s*([^;]+);\s*(?:\/\*\s*(.*?)\s*\*\/)?/.exec(line);
      if (v) rows.push({ name: v[1], value: v[2].trim(), note: v[3] || "" });
    });
    return { start: start, end: start + m[1].length, body: m[1], rows: rows };
  }
  function hex6(v) {
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v.trim());
    if (!m) return null;
    var h = m[1];
    return "#" + (h.length === 3 ? h.split("").map(function (c) { return c + c; }).join("") : h).toLowerCase();
  }
  function openTheme() {
    var path = CONFIG.themeFile, rec = S.files[path];
    if (!rec || rec.text == null) { toast(path + " was not found."); return; }
    var info = parseRoot(rec.text);
    if (!info) { toast("No :root settings found in " + path + "."); return; }
    var fonts = {};
    rec.text.replace(/@font-face\s*\{[^}]*font-family:\s*["']?([^"';]+)["']?/g, function (m, f) { fonts[f] = 1; return m; });
    var rows = info.rows.map(function (r) {
      if (r.group) return '<h3 class="group">' + esc(r.group) + "</h3>";
      var hx = hex6(r.value);
      var label = '<span class="tok">' + esc(r.name.replace(/^--/, "")) + "</span>" + (r.note ? '<span class="note">' + esc(r.note) + "</span>" : "");
      var control = (hx ? '<input type="color" value="' + hx + '" data-color="' + esc(r.name) + '" aria-label="' + esc(r.name) + ' colour">' : "") +
        '<input type="text" data-var="' + esc(r.name) + '" value="' + esc(r.value) + '"' + (/font/.test(r.name) ? ' list="ed-fonts"' : "") + ">";
      return '<div class="tokrow"><div class="toklabel">' + label + '</div><div class="tokctl">' + control + "</div></div>";
    }).join("");
    dialog({
      title: "Colours and fonts",
      wide: true,
      body: '<p class="muted">These are the settings at the top of <code>' + esc(path) + "</code>. Change a colour or a font and press Apply; Undo takes it back.</p>" +
        '<datalist id="ed-fonts">' + Object.keys(fonts).map(function (f) { return '<option value="&quot;' + esc(f) + '&quot;, Georgia, serif">'; }).join("") + "</datalist>" +
        '<div class="tokens">' + rows + "</div>",
      onOpen: function (dlg) {
        qsa("[data-color]", dlg).forEach(function (c) {
          var t = qs('[data-var="' + c.getAttribute("data-color") + '"]', dlg);
          c.addEventListener("input", function () { t.value = c.value; });
          t.addEventListener("input", function () { var h = hex6(t.value); if (h) c.value = h; });
        });
      },
      onAction: function (act, dlg) {
        var values = {};
        qsa("[data-var]", dlg).forEach(function (i) { values[i.getAttribute("data-var")] = i.value.trim(); });
        transact(function () {
          var css = S.files[path].text, cur = parseRoot(css);
          var body = cur.body.replace(/^(\s*)(--[\w-]+)(\s*:\s*)([^;]+)(;)/gm, function (m, a, name, b, val, c) {
            return a + name + b + (values[name] ? values[name] : val) + c;
          });
          setText(path, css.slice(0, cur.start) + body + css.slice(cur.end));
        }, { model: true });
      }
    });
  }

  /* ---- Files and code ---- */
  function fileSize(r) { var n = r.text != null ? enc.encode(r.text).length : Math.floor(r.b64.length * 3 / 4); return n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  function openFiles(startPath) {
    if (S.mode === "edit") commit();
    var current = null;
    var dlg = dialog({
      title: "Files and code",
      wide: true,
      body: '<div class="files"><div class="files__side">' +
        '<input type="search" placeholder="Filter files…" data-filter aria-label="Filter files">' +
        '<ul class="files__list" data-list></ul>' +
        '<div class="files__add"><label class="field small"><span class="field__label">Add files to folder</span><input type="text" data-folder value="' + esc(CONFIG.fileFolder) + '"></label>' +
        '<label class="btn small file">Add files…<input type="file" multiple data-add></label></div>' +
        '</div><div class="files__main" data-main><p class="muted">Choose a file on the left. Pages, styles (CSS), scripts (JS) and text files open here for editing; you can also add, replace, download or delete files.</p></div></div>',
      buttons: [{ act: "cancel", label: "Close" }],
      onOpen: function (dlg) {
        qs("[data-filter]", dlg).addEventListener("input", function () { list(dlg); });
        qs("[data-list]", dlg).addEventListener("click", function (e) { var b = e.target.closest("[data-file]"); if (b) { e.preventDefault(); show(dlg, b.getAttribute("data-file")); } });
        qs("[data-add]", dlg).addEventListener("change", function () {
          var input = this, folder = qs("[data-folder]", dlg).value.trim().replace(/^\/+/, "");
          if (folder && !/\/$/.test(folder)) folder += "/";
          var files = Array.prototype.slice.call(input.files);
          Promise.all(files.map(function (f) {
            return (isTextPath(f.name) ? f.text().then(function (t) { return { text: t }; }) : readFile(f).then(function (u) { return { b64: u.split(",")[1] }; }))
              .then(function (data) { return { path: freePath(folder, safeName(f.name)), data: data }; });
          })).then(function (items) {
            transact(function () { items.forEach(function (it) { S.files[it.path] = makeRecord(it.path, it.data); }); }, { model: true });
            toast("Added " + items.map(function (i) { return i.path; }).join(", "));
            list(dlg);
            if (items[0]) show(dlg, items[0].path);
          });
        });
        list(dlg);
        if (startPath) show(dlg, startPath);
      },
      onAction: function (act, dlg) { return fileAction(act, dlg); }
    });
    function list(dlg) {
      var f = qs("[data-filter]", dlg).value.toLowerCase();
      var paths = Object.keys(S.files).filter(function (p) { return !f || p.toLowerCase().indexOf(f) > -1; });
      paths.sort(function (a, b) {
        var pa = isPagePath(a) ? 0 : 1, pb = isPagePath(b) ? 0 : 1;
        return pa - pb || (a < b ? -1 : 1);
      });
      qs("[data-list]", dlg).innerHTML = paths.map(function (p) {
        var tag = !S.orig[p] ? '<span class="badge new">new</span>' : isChanged(p) ? '<span class="badge">changed</span>' : "";
        return '<li><button type="button" data-file="' + esc(p) + '"' + (p === current ? ' aria-current="true"' : "") + ">" + esc(p) + tag + "</button></li>";
      }).join("");
    }
    function show(dlg, p) {
      current = p;
      var r = S.files[p], main = qs("[data-main]", dlg);
      list(dlg);
      if (!r) { main.innerHTML = '<p class="muted">This file was deleted.</p>'; return; }
      var head = '<p class="filehead"><code>' + esc(p) + "</code> · " + fileSize(r) + (isChanged(p) ? ' · <span class="badge">changed</span>' : "") + "</p>";
      var acts = '<div class="fileacts">' +
        (r.text != null ? '<button type="button" class="btn primary" data-dlg="file-save">Apply changes</button>' : '<label class="btn file">Replace with another file…<input type="file" data-replace></label>') +
        (S.orig[p] && isChanged(p) ? '<button type="button" class="btn" data-dlg="file-revert">Undo all changes to this file</button>' : "") +
        '<button type="button" class="btn" data-dlg="file-download">Download</button>' +
        '<button type="button" class="btn danger" data-dlg="file-delete">Delete file</button></div>';
      if (r.text != null) {
        main.innerHTML = head + '<textarea class="code" data-text spellcheck="false" autocapitalize="off" autocomplete="off">' + esc(r.text) + "</textarea>" + acts;
        tabKeys(qs("[data-text]", main));
      } else {
        main.innerHTML = head + (isImagePath(p) ? '<div class="filepreview"><img alt="" src="' + dataURL(r) + '"></div>' : '<p class="muted">This file cannot be shown as text.</p>') + acts;
        qs("[data-replace]", main).addEventListener("change", function () {
          var f = this.files[0];
          if (!f) return;
          readFile(f).then(function (u) {
            transact(function () { S.files[p] = makeRecord(p, { b64: u.split(",")[1] }); }, { model: true });
            toast(p + " replaced.");
            show(dlg, p);
          });
        });
      }
    }
    function fileAction(act, dlg) {
      var p = current;
      if (act === "file-save") {
        var text = qs("[data-text]", dlg).value;
        transact(function () { setText(p, text); }, { model: true });
        toast("Saved " + p + " (Undo takes it back).");
        show(dlg, p);
        return false;
      }
      if (act === "file-revert") { transact(function () { S.files[p] = S.orig[p]; }, { model: true }); show(dlg, p); return false; }
      if (act === "file-download") { var r = outputRecord(p) || S.files[p]; download(p.split("/").pop(), new Blob([recordBytes(r)], { type: r.type })); return false; }
      if (act === "file-delete") {
        if (p === "index.html") { toast("The home page cannot be deleted."); return false; }
        transact(function () { delete S.files[p]; if (S.page === p) S.page = pagePaths()[0]; }, { model: true });
        toast(p + " deleted (Undo brings it back).");
        current = null;
        list(dlg);
        qs("[data-main]", dlg).innerHTML = '<p class="muted">Deleted ' + esc(p) + ".</p>";
        return false;
      }
    }
    return dlg;
  }

  /* ---- Check the website: broken links, wrong day links, empty headings … ---- */
  function elementPath(el) {
    var path = [];
    while (el && el.parentElement && el.localName !== "body") {
      var i = 0, s = el;
      while ((s = s.previousElementSibling)) i++;
      path.unshift(i);
      el = el.parentElement;
    }
    return path;
  }
  function elementAt(path) {
    var el = D.body;
    for (var i = 0; i < path.length && el; i++) el = el.children[path[i]];
    return el;
  }
  function checkSite() {
    var pages = pagePaths(), docs = {}, ids = {}, issues = [];
    pages.forEach(function (p) {
      docs[p] = parseHTML(S.files[p].text);
      ids[p] = {};
      qsa("[id]", docs[p]).forEach(function (e) { ids[p][e.id] = 1; });
    });
    pages.forEach(function (p) {
      var d = docs[p], seen = {};
      function add(el, kind, msg) { issues.push({ page: p, kind: kind, msg: msg, path: elementPath(el) }); }
      function txt(e) { return (e.textContent || "").replace(/\s+/g, " ").trim(); }
      qsa("[id]", d.body).forEach(function (e) {
        if (seen[e.id]) add(e, "error", "Two elements share the id “" + e.id + "”.");
        seen[e.id] = 1;
      });
      qsa("[aria-labelledby]", d.body).forEach(function (e) {
        e.getAttribute("aria-labelledby").split(/\s+/).forEach(function (id) {
          if (id && !ids[p][id]) add(e, "error", "Its label points to the id “" + id + "”, which does not exist.");
        });
      });
      qsa("a[href]", d.body).forEach(function (a) {
        if (a.closest("[hidden]")) return;   /* hidden examples are not checked */
        var href = a.getAttribute("href").trim(), t = txt(a) || a.getAttribute("aria-label") || (qs("img[alt]", a) ? qs("img[alt]", a).getAttribute("alt") : "");
        if (!t) add(a, "error", "A link has no text.");
        if (a.getAttribute("target") === "_blank") add(a, "warn", "“" + t + "” opens in a new tab; the site's links open in the same tab.");
        if (/^(https?:|mailto:|tel:)/i.test(href)) return;
        if (/^javascript:/i.test(href)) { add(a, "error", "“" + t + "” runs a script instead of linking."); return; }
        var hashAt = href.indexOf("#"), path = hashAt >= 0 ? href.slice(0, hashAt) : href, anchor = hashAt >= 0 ? href.slice(hashAt + 1) : "";
        var target = path ? resolvePath(p, path) : p;
        if (path && !S.files[target]) { add(a, "error", "“" + t + "” points to " + target + ", which does not exist."); return; }
        if (anchor && anchor !== "top" && isPagePath(target) && ids[target] && !ids[target][anchor]) add(a, "error", "“" + t + "” points to #" + anchor + (target !== p ? " on " + target : "") + ", which does not exist.");
        /* a link reading "Day N" must lead to the part headed "Day N" */
        var day = /^Day\s*(\d+)/i.exec(t);
        if (day && anchor && isPagePath(target) && docs[target]) {
          var dest = docs[target].getElementById(anchor), h = dest && qs("h1, h2, h3", dest), hd = h && /Day\s*(\d+)/i.exec(txt(h));
          if (hd && hd[1] !== day[1]) add(a, "error", "“" + t + "” goes to " + txt(h) + ".");
        }
      });
      /* two links in one list going to the same place with different words */
      qsa("ul, ol", d.body).forEach(function (list) {
        var map = {};
        qsa(":scope > li > a[href]", list).forEach(function (a) {
          if (a.closest("[hidden]")) return;
          var h = a.getAttribute("href"), t = txt(a);
          if (map[h] && map[h] !== t && h.charAt(0) === "#") add(a, "error", "“" + t + "” and “" + map[h] + "” both go to " + h + ".");
          else map[h] = map[h] || t;
        });
      });
      var h1 = qsa("h1", d.body).length;
      if (h1 !== 1) add(d.body, "warn", "The page has " + h1 + " main titles (h1); it should have exactly one.");
      qsa("h1, h2, h3, h4, h5, h6", d.body).forEach(function (h) { if (!txt(h)) add(h, "error", "An empty heading."); });
      qsa("img", d.body).forEach(function (im) {
        if (!im.hasAttribute("alt")) add(im, "error", "An image has no description (alt text).");
        var src = resolvePath(p, im.getAttribute("src"));
        if (src && !S.files[src]) add(im, im.hasAttribute("data-optional-image") ? "warn" : "error", "Image file missing: " + src);
      });
      qsa("td, th", d.body).forEach(function (c) { if (!txt(c) && !c.querySelector("img")) add(c, "warn", "An empty table cell."); });
      /* a date shown as text must match the date given to search engines and calendars */
      qsa("time[datetime]", d.body).forEach(function (tm) {
        if (tm.closest("[hidden]")) return;
        var shown = txt(tm), iso = isoDate(shown, tm.getAttribute("datetime").slice(0, 4)), dt = tm.getAttribute("datetime");
        if (!/\d/.test(shown)) add(tm, "error", "The date reads “" + shown + "” but is marked as " + dt + " for search engines. Retype the date, or type TBA again to turn it into a TBA mark.");
        else if (iso && iso !== dt.slice(0, 10)) add(tm, "warn", "The date reads “" + shown + "” but is marked as " + dt + ".");
      });
      qsa("p, li, dd, dt, figcaption", d.body).forEach(function (e) {
        if (!txt(e) && !e.querySelector("img, svg, a, br, button, input") && !e.closest("[hidden], [aria-hidden], .slot__kind, template, [role=status], [aria-live], [data-count-for]")) add(e, "warn", "An empty " + labelOf(e).toLowerCase() + ".");
      });
      var tba = qsa(".tba, .tba-note", d.body).filter(function (e) { return !e.closest("[hidden]"); }).length;
      if (tba) add(d.body, "info", plural(tba, "“to be announced” mark") + " still shown.");
    });
    return issues;
  }
  function openCheck() {
    if (S.mode === "edit") commit();
    var issues = checkSite();
    var errors = issues.filter(function (i) { return i.kind === "error"; }).length, warns = issues.filter(function (i) { return i.kind === "warn"; }).length;
    var byPage = {};
    issues.forEach(function (it, n) { it.n = n; (byPage[it.page] = byPage[it.page] || []).push(it); });
    var summary = !errors && !warns ? "No problems found." : [errors ? plural(errors, "problem") : "", warns ? plural(warns, "thing") + " to look at" : ""].filter(Boolean).join(" and ") + ".";
    var body = '<p class="count">' + summary + "</p>" +
      '<p class="muted">Checked: links and the parts they point to (including “Day” links of the schedule), page titles and headings, images and their descriptions, empty cells and paragraphs, and “to be announced” marks.</p>' +
      Object.keys(byPage).map(function (p) {
        return '<h3 class="checkpage">' + esc(p) + "</h3><ul class=\"issues\">" + byPage[p].map(function (it) {
          return '<li class="issue issue--' + it.kind + '"><span class="issue__kind">' + (it.kind === "error" ? "Problem" : it.kind === "warn" ? "Check" : "Note") + "</span><span>" + esc(it.msg) + '</span><button type="button" class="btn small" data-dlg="go:' + it.n + '">Show</button></li>';
        }).join("") + "</ul>";
      }).join("");
    dialog({
      title: "Check the website", wide: true, body: body,
      buttons: [{ act: "again", label: "Check again" }, { act: "cancel", label: "Close", primary: true }],
      onAction: function (act) {
        if (act === "again") { setTimeout(openCheck, 0); return; }
        if (act.indexOf("go:") !== 0) return;
        var it = issues[+act.slice(3)];
        render(it.page, "edit");
        var el = elementAt(it.path);
        if (el && el !== D.body) {
          if (el.closest("[data-ed-was-hidden]") && !S.showHidden) setShowHidden(true);
          select(el);
          el.scrollIntoView({ block: "center" });
        }
      }
    });
  }

  /* ---- "Last updated" in the footer follows the date of saving ---- */
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function stampLastUpdated() {
    if (!changedPaths().some(isPagePath)) return;
    var now = new Date(), today = now.getDate() + " " + MONTHS[now.getMonth()] + " " + now.getFullYear();
    var re = /(Last updated )(\d{1,2} [A-Z][a-z]+ \d{4})/;
    if (!pagePaths().some(function (p) { var m = re.exec(S.files[p].text); return m && m[2] !== today; })) return;
    transact(function () {
      pagePaths().forEach(function (p) { var t = S.files[p].text; if (re.test(t)) setText(p, t.replace(re, "$1" + today)); });
    }, { model: true });
  }

  /* ---- Help ---- */
  function openHelp() {
    var inChat = !S.storage;
    dialog({
      title: "How to edit the website",
      wide: true,
      body:
        '<div class="help">' +
        "<h3>Text</h3><ul>" +
        "<li><b>Click any text</b> and type. <kbd>Enter</kbd> starts a new paragraph or list item, <kbd>Shift</kbd>+<kbd>Enter</kbd> a new line.</li>" +
        "<li>Select words to make them <b>bold</b>, <i>italic</i> (shown in the accent colour in headings), a link, or a “TBA” mark.</li>" +
        "<li>Click a “TBA” mark and type the real value: the mark turns into normal text.</li>" +
        "<li>Maths: write it as <code>$…$</code>; it is typeset in Preview and on the website.</li></ul>" +
        "<h3>Blocks</h3><ul>" +
        "<li>Click something to select its block (orange outline). Its toolbar can select the larger block around it, move it up or down, copy it, add something after it (paragraph, heading, list, button, image, table, section, your own HTML), change its image or link, hide it from visitors, edit its HTML, or delete it.</li>" +
        "<li>The bar at the bottom shows where the selected block sits; click a name there to select that larger block. <kbd>Alt</kbd>+click selects exactly what is under the mouse.</li>" +
        "<li>To add a speaker, a committee member, a talk, a date or a photo: select an existing one and copy it, then change the copy.</li>" +
        "<li>Tables: click a cell, then ＋ offers a new row, a new column after that cell, or deleting that cell's column.</li>" +
        "<li><b>Long lists</b> (participants, fees …): <b>Page → Fill a table from a spreadsheet</b>. Copy the rows in Excel or Google Sheets (or open a .csv file), paste them, choose which column goes where, and the table is filled in one step, sorted if you like.</li></ul>" +
        "<h3>Photos and links</h3><ul>" +
        "<li>Double-click a photo, or drop a photo file onto it, to replace it. New photos are scaled to web size and stored in <code>" + esc(CONFIG.imageFolder) + "</code>.</li>" +
        "<li>Click a link (or select a button) and use the link button to change where it goes, or upload a PDF and link to it. Every link opens in the same tab.</li>" +
        "<li><b>Gallery:</b> on the Gallery page choose <b>Page → Add photos to the gallery</b> and pick many photos at once. Each gets a small copy for the grid; click a caption to change it, select a photo to move or remove it.</li></ul>" +
        "<h3>Pages and the whole site</h3><ul>" +
        "<li><b>Page</b> menu: title and description, the page's HTML, add a page (it can go into the menu automatically), remove a page.</li>" +
        "<li><b>Site</b> menu: <b>Check the website</b> (broken links, “Day” links going to the wrong day, empty headings, missing images …), find and replace on every page, colours and fonts, and <b>Files and code</b> — edit any file (CSS, JavaScript, README), add or replace files.</li>" +
        "<li>The header and footer are the same on every page: change them on one page and every page follows.</li>" +
        "<li><b>Show hidden</b> reveals hidden blocks (faded), such as example entries and screen-reader headings.</li></ul>" +
        "<h3>Saving</h3><ul>" +
        "<li><b>Save</b> writes into your website folder (Chrome, Edge), or downloads the whole website as a .zip to upload to the server.</li>" +
        "<li>Saving also sets the “Last updated” date in the footer to today.</li>" +
        "<li>Undo: <kbd>Ctrl</kbd>+<kbd>Z</kbd> · Redo: <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> · Save: <kbd>Ctrl</kbd>+<kbd>S</kbd> (<kbd>⌘</kbd> on a Mac).</li>" +
        (inChat ? "<li><b>Inside the chat preview</b>, downloads may be blocked and changes are lost when the preview closes. To keep them: download this preview file, open it in Chrome or Firefox and edit there — or use <b>Save → Copy changes as text</b> and paste the text to Claude.</li>" : "") +
        "</ul></div>",
      buttons: [{ act: "ok", label: "Got it", primary: true }]
    });
  }

  /* ---- Show a long text to copy ---- */
  function showText(title, text, note) {
    dialog({
      title: title, wide: true,
      body: (note ? '<p class="muted">' + esc(note) + "</p>" : "") + '<textarea class="code" readonly data-out>' + esc(text) + "</textarea>",
      buttons: [{ act: "copy", label: "Copy" }, { act: "ok", label: "Done", primary: true }],
      onOpen: function (dlg) { var ta = qs("[data-out]", dlg); ta.focus(); ta.select(); },
      onAction: function (act, dlg) {
        if (act !== "copy") return;
        var ta = qs("[data-out]", dlg); ta.focus(); ta.select();
        var ok = false; try { ok = D.execCommand("copy"); } catch (e) {}
        toast(ok ? "Copied." : "Select the text and press Ctrl+C (⌘+C).");
        return false;
      }
    });
  }


  /* =================================================================
     12. SAVING FILES: folder, .zip, single page, copy as text
     ================================================================= */
  var CRC = null;
  function crc32(bytes) {
    if (!CRC) {
      CRC = new Uint32Array(256);
      for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; }
    }
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) crc = CRC[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  /* A standard .zip (files stored as they are: photos and fonts are compressed already). */
  function makeZip(entries) {
    var now = new Date();
    var time = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    var date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    var parts = [], central = [], offset = 0, cdSize = 0;
    entries.forEach(function (en) {
      var name = enc.encode(en.name), data = en.bytes, crc = crc32(data);
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true);
      h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(h.buffer, name, data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 0x0314, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true);
      c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true);
      c.setUint16(30, 0, true); c.setUint16(32, 0, true); c.setUint16(34, 0, true); c.setUint16(36, 0, true);
      c.setUint32(38, (0x81A4 << 16) >>> 0, true); c.setUint32(42, offset, true);
      central.push(c.buffer, name);
      cdSize += 46 + name.length;
      offset += 30 + name.length + data.length;
    });
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true);
    e.setUint32(12, cdSize, true); e.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [e.buffer]), { type: "application/zip" });
  }
  function download(name, blob) {
    try {
      var url = URL.createObjectURL(blob), a = D.createElement("a");
      a.href = url; a.download = name; a.hidden = true;
      ui.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); remove(a); }, 60000);
      return true;
    } catch (e) {
      toast("Downloading is not possible here. Use Save → Copy changes as text.");
      return false;
    }
  }
  /* After a download we cannot know it worked; in a locked-down preview we assume it did not. */
  function markSaved() { if (S.storage || S.dir) S.savedMark = fingerprint(); updateUI(); }
  /* In a locked-down preview (no storage, no downloads) explain the way out once. */
  function downloadHint() {
    if (S.storage || S.hintShown) return;
    S.hintShown = true;
    dialog({
      title: "Did the download start?",
      body: "<p>Some previews (for example inside a chat) block downloads. If nothing was downloaded, you can:</p>" +
        "<ul><li><b>Copy your changes as text</b> and paste them into the chat with Claude, who can apply them to the website files; or</li>" +
        "<li>download this preview file itself, open it in Chrome, Edge or Firefox, and save from there (everything you can do here works there too).</li></ul>" +
        '<p class="muted">Changes made here are lost when this preview is closed.</p>',
      buttons: [{ act: "cancel", label: "It downloaded" }, { act: "copy", label: "Copy changes as text", primary: true }],
      onAction: function (act) { if (act === "copy") copyChanges(); }
    });
  }
  function entriesFor(paths) {
    return paths.map(function (p) { return { name: CONFIG.zipFolder + "/" + p, bytes: recordBytes(outputRecord(p)) }; });
  }
  function downloadSite() {
    if (S.mode === "edit") commit();
    stampLastUpdated();
    var paths = Object.keys(S.files).sort();
    if (download(CONFIG.zipFolder + ".zip", makeZip(entriesFor(paths)))) {
      markSaved();
      setTimeout(downloadHint, 900);
      if (S.storage) toast("Downloading the whole website (" + plural(paths.length, "file") + "). Unzip it and upload the files to the server.", 7000);
    }
  }
  function downloadChanged() {
    if (S.mode === "edit") commit();
    stampLastUpdated();
    var ch = changedPaths();
    if (!ch.length) { toast("No changes yet."); return; }
    var entries = entriesFor(ch.filter(function (p) { return S.files[p]; }));
    var gone = ch.filter(function (p) { return !S.files[p]; });
    if (gone.length) entries.push({ name: CONFIG.zipFolder + "/DELETE-THESE-FILES.txt", bytes: enc.encode("Delete these files from the website folder:\n" + gone.join("\n") + "\n") });
    if (download(CONFIG.zipFolder + "-changes.zip", makeZip(entries))) {
      markSaved();
      setTimeout(downloadHint, 900);
      if (S.storage) toast("Downloading " + plural(entries.length, "changed file") + ". Copy them into your website folder, replacing the old ones.", 7000);
    }
  }
  function downloadPage() {
    if (S.mode === "edit") commit();
    stampLastUpdated();
    var r = outputRecord(S.page);
    download(S.page, new Blob([recordBytes(r)], { type: "text/html" }));
    setTimeout(downloadHint, 900);
    var extra = changedPaths().filter(function (p) { return p !== S.page; }).length;
    if (extra) toast("Only " + S.page + " was downloaded; " + plural(extra, "other file") + " also changed.");
  }
  function saveToFolder() {
    if (!S.dir) { downloadSite(); return; }
    if (S.mode === "edit") commit();
    stampLastUpdated();
    var list = changedPaths();
    if (!list.length) { toast("Nothing to save: no changes."); return; }
    var dir = S.dir;
    var perm = dir.requestPermission ? dir.requestPermission({ mode: "readwrite" }) : Promise.resolve("granted");
    perm.then(function (state) {
      if (state !== "granted") throw new Error("permission to write was not given");
      return list.reduce(function (chain, p) {
        return chain.then(function () {
          var parts = p.split("/"), name = parts.pop();
          return parts.reduce(function (c, seg) { return c.then(function (d) { return d.getDirectoryHandle(seg, { create: true }); }); }, Promise.resolve(dir))
            .then(function (d) {
              if (!S.files[p]) return d.removeEntry(name).catch(function () {}).then(function () { delete S.orig[p]; });
              return d.getFileHandle(name, { create: true }).then(function (fh) { return fh.createWritable(); })
                .then(function (w) { return w.write(recordBytes(S.files[p])).then(function () { return w.close(); }); })
                .then(function () { S.orig[p] = S.files[p]; });
            });
        });
      }, Promise.resolve());
    }).then(function () {
      markSaved();
      clearDraft();
      toast("Saved " + plural(list.length, "file") + " into your website folder.");
    }).catch(function (err) {
      toast("Could not save into the folder (" + err.message + "). Downloading a .zip instead.", 6000);
      downloadSite();
    });
  }
  function saveDefault() { if (S.dir) saveToFolder(); else downloadSite(); }
  function changesAsText() {
    var ch = changedPaths();
    if (!ch.length) return "";
    var out = ["NSM 2026 website — changed files (" + new Date().toISOString().slice(0, 16).replace("T", " ") + ")", ""];
    ch.forEach(function (p) {
      var r = S.files[p];
      if (!r) out.push("===== DELETED: " + p + " =====", "");
      /* inside a code block, so chat apps do not turn addresses into links */
      else if (r.text != null) out.push("===== FILE: " + p + " =====", "````" + (extOf(p) || "text"), r.text.replace(/\n$/, ""), "````", "===== END OF " + p + " =====", "");
      else out.push("===== NEW OR REPLACED FILE (not text, not included): " + p + " =====", "");
    });
    return out.join("\n");
  }
  function copyChanges() {
    if (S.mode === "edit") commit();
    stampLastUpdated();
    var text = changesAsText();
    if (!text) { toast("No changes yet."); return; }
    var note = "These are your edited files as text. Paste them into a chat with Claude to have them applied, or keep them somewhere safe. New photos and other non-text files are listed by name only: attach them to the chat as well.";
    function fallback() { showText("Your changes as text", text, note); }
    if (S.storage && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("Copied " + plural(changedPaths().length, "changed file") + " as text. Paste it into the chat with Claude."); }, fallback);
    } else fallback();
  }
  function discardAll() {
    confirmBox("Discard all changes?", "<p>Every page and file goes back to how it was when you opened it (or last saved it). Undo can still bring the changes back while this tab is open.</p>", "Discard changes", function () {
      transact(function () { S.files = Object.assign(Object.create(null), S.orig); if (!S.files[S.page]) S.page = pagePaths()[0]; }, { model: true });
      clearDraft();
    }, true);
  }


  /* =================================================================
     13. DRAFTS: unsaved changes are kept in this browser
     ================================================================= */
  var draftTimer = 0;
  function draftKey() { return CONFIG.draftKey + ":" + S.siteKey; }
  function saveDraftSoon() { clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 1200); }
  function saveDraft() {
    if (!S.storage || !S.siteKey) return;
    var ch = changedPaths();
    try {
      if (!ch.length) { localStorage.removeItem(draftKey()); return; }
      var data = { at: Date.now(), page: S.page, files: {}, deleted: [] };
      ch.forEach(function (p) { var r = S.files[p]; if (!r) data.deleted.push(p); else data.files[p] = r.text != null ? { text: r.text } : { b64: r.b64 }; });
      try { localStorage.setItem(draftKey(), JSON.stringify(data)); }
      catch (e) {
        Object.keys(data.files).forEach(function (p) { if (data.files[p].b64 != null) delete data.files[p]; });
        localStorage.setItem(draftKey(), JSON.stringify(data));
        if (!S.warnedQuota) { S.warnedQuota = true; toast("New photos are too large to keep in this browser. Save or download before closing.", 7000); }
      }
    } catch (e) { S.storage = false; }
  }
  function clearDraft() { try { localStorage.removeItem(draftKey()); } catch (e) {} }
  function checkDraft() {
    if (!S.storage) return;
    var raw = null, data = null;
    try { raw = localStorage.getItem(draftKey()); data = raw && JSON.parse(raw); } catch (e) { return; }
    if (!data) return;
    var n = Object.keys(data.files || {}).length + (data.deleted || []).length;
    if (!n) return;
    dialog({
      title: "Continue where you left off?",
      body: "<p>This browser kept " + plural(n, "changed file") + " from " + esc(new Date(data.at).toLocaleString()) + " that were not saved.</p>" +
        '<p class="muted">' + esc(Object.keys(data.files || {}).concat(data.deleted || []).join(", ")) + "</p>",
      buttons: [{ act: "discard", label: "Discard them", danger: true, left: true }, { act: "cancel", label: "Decide later" }, { act: "ok", label: "Restore my changes", primary: true }],
      onAction: function (act) {
        if (act === "discard") { clearDraft(); toast("Discarded."); return; }
        transact(function () {
          Object.keys(data.files || {}).forEach(function (p) { S.files[p] = makeRecord(p, data.files[p]); });
          (data.deleted || []).forEach(function (p) { delete S.files[p]; });
          if (data.page && S.files[data.page]) S.page = data.page;
        }, { model: true, top: true });
        toast("Your changes are back. Remember to save.");
      }
    });
  }

  /* =================================================================
     14. INTERFACE
     The editor's own buttons live in a shadow root, so the website's
     styles never affect them (and they never affect the website).
     ================================================================= */
  function svgIcon(d) { return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>"; }
  var ICON = {
    parent: svgIcon('<path d="M14 9 9 4 4 9"/><path d="M9 4v10.5a5.5 5.5 0 0 0 5.5 5.5H20"/>'),
    up: svgIcon('<path d="M12 19V5M5 12l7-7 7 7"/>'),
    down: svgIcon('<path d="M12 5v14M19 12l-7 7-7-7"/>'),
    copy: svgIcon('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
    plus: svgIcon('<path d="M12 5v14M5 12h14"/>'),
    image: svgIcon('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>'),
    link: svgIcon('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
    unlink: svgIcon('<path d="M18.8 13.2 20.5 11.5a5 5 0 0 0-7-7L11.8 6.2M5.2 10.8 3.5 12.5a5 5 0 0 0 7 7l1.7-1.7"/><path d="M8 2v3M2 8h3M16 22v-3M22 16h-3"/>'),
    eye: svgIcon('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    eyeOff: svgIcon('<path d="M17.9 17.9A10.4 10.4 0 0 1 12 19c-6.5 0-10-7-10-7a18 18 0 0 1 5.1-5.9M9.9 5.2A9 9 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.2 3.2"/><path d="m2 2 20 20"/>'),
    code: svgIcon('<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>'),
    trash: svgIcon('<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'),
    undo: svgIcon('<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
    redo: svgIcon('<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>'),
    pen: svgIcon('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
    clear: svgIcon('<path d="M4 7V4h16v3M9 20h6M12 4v16"/><path d="m3 3 18 18"/>')
  };

  var EDIT_CSS = [
    'html[data-ed-mode="edit"] body { padding-bottom: 110px; }',
    'html[data-ed-mode="edit"] [data-ed-hover]:not([data-ed-sel]) { outline: 1px dashed rgba(11, 109, 102, 0.85) !important; outline-offset: 2px; }',
    'html[data-ed-mode="edit"] [data-ed-sel] { outline: 2px solid #a8421a !important; outline-offset: 3px; }',
    'html[data-ed-mode="edit"] [data-ed-ce] { outline: 2px solid #0b6d66 !important; outline-offset: 3px; cursor: text; caret-color: #a8421a; }',
    'html[data-ed-mode="edit"] [data-ed-ce]:empty::before { content: "Type here…"; color: #8a7d68; font-style: italic; }',
    'html[data-ed-mode="edit"] figcaption:empty { display: block !important; min-height: 1.4em; }',
    'html[data-ed-mode="edit"] figcaption:empty:not([data-ed-ce])::before { content: "Add a caption…"; color: #8a7d68; font-style: italic; }',
    'html[data-ed-mode="edit"] a[href], html[data-ed-mode="edit"] button { cursor: pointer; }',
    'html[data-ed-mode="edit"] [data-ed-ce] a[href] { cursor: text; }',
    'html[data-ed-mode="edit"] img { cursor: pointer; }',
    'html[data-ed-mode="edit"]:not([data-ed-show-hidden]) [data-ed-was-hidden] { display: none !important; }',
    'html[data-ed-show-hidden] [data-ed-was-hidden] { opacity: 0.5; outline: 1px dashed #8a7d68; outline-offset: 2px; }',
    'html[data-ed-show-hidden] .visually-hidden { position: static !important; width: auto !important; height: auto !important; margin: 0 0 0.5rem !important; clip: auto !important; clip-path: none !important; overflow: visible !important; white-space: normal !important; opacity: 0.5; outline: 1px dashed #8a7d68; }',
    'html[data-ed-mode="edit"] [data-optional] { display: block !important; outline: 1px dashed #d4a07f; outline-offset: -8px; }',
    'html[data-ed-mode="edit"] [data-optional]::before { content: "Shown on the website only when it has at least one visible entry"; display: block; width: max-content; max-width: 90%; margin: 0 auto 1rem; padding: 0.3rem 0.7rem; font: 600 12px/1.3 system-ui, sans-serif; color: #8a3a0e; background: #f8ece1; border-radius: 4px; }',
    'html[data-ed-mode="edit"] .slideshow__slides { aspect-ratio: auto !important; display: grid !important; grid-template-columns: repeat(auto-fill, minmax(min(100%, 210px), 1fr)); gap: 12px; overflow: visible !important; background: none !important; box-shadow: none !important; }',
    'html[data-ed-mode="edit"] .slide { position: relative !important; inset: auto !important; opacity: 1 !important; visibility: visible !important; aspect-ratio: 3 / 2; border-radius: 6px; overflow: hidden; background: #12151c; transition: none !important; }',
    'html[data-ed-mode="edit"] .slide img { transform: none !important; transition: none !important; }',
    'html[data-ed-mode="edit"] .slide[data-fit="contain"] img { object-fit: contain; }',
    'html[data-ed-mode="edit"] .string-figure__canvas { outline: 1px dashed #8a5629; }',
    'html[data-ed-mode="edit"] .string-figure__canvas::after { content: "String animation — plays in Preview and on the website"; position: absolute; left: 14%; right: 14%; top: 44%; text-align: center; font: 600 12px/1.4 system-ui, sans-serif; color: #8a5629; }',
    '@media (max-width: 1023px) { html[data-ed-mode="edit"] .site-nav[data-ed-open] { display: block; } }'
  ].join("\n");

  var UI_CSS = [
    ':host { all: initial; }',
    '.ui, .ui * { box-sizing: border-box; }',
    '.ui { font: 14px/1.4 "Instrument Sans Variable", "Instrument Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #14161b; -webkit-font-smoothing: antialiased; }',
    '[hidden] { display: none !important; }',
    'button, input, select, textarea { font: inherit; color: inherit; }',
    'button { cursor: pointer; }',
    'button:disabled { cursor: default; }',
    'code, kbd { font-family: "IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace; font-size: 0.9em; }',
    'kbd { padding: 1px 5px; border: 1px solid #cfc6b3; border-bottom-width: 2px; border-radius: 4px; background: #fff; }',
    '.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }',
    /* bottom bar */
    '.bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483000; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 8px 12px; background: #14161b; color: #efe6d4; box-shadow: 0 -8px 28px rgba(10, 12, 16, 0.22); }',
    '.bar__group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }',
    '.bar__group--end { margin-left: auto; }',
    '.bar button, .pill button, .bar select { min-height: 34px; padding: 0 12px; border: 1px solid #3a404d; border-radius: 6px; background: transparent; color: #efe6d4; display: inline-flex; align-items: center; gap: 6px; }',
    '.bar button:hover:not(:disabled), .pill button:hover { border-color: #ec7a3c; color: #fff; }',
    '.bar button:disabled { opacity: 0.4; }',
    '.bar button:focus-visible, .pill button:focus-visible, .bar select:focus-visible, .itembar button:focus-visible, .fmtbar button:focus-visible { outline: 2px solid #ec7a3c; outline-offset: 2px; }',
    '.bar button.icon { padding: 0; width: 34px; justify-content: center; }',
    '.bar .primary, .pill .primary { background: #ec7a3c; border-color: #ec7a3c; color: #14161b; font-weight: 600; }',
    '.bar .primary:hover, .pill .primary:hover { background: #f39a66; border-color: #f39a66; color: #14161b; }',
    '.bar select { padding: 0 8px; background: #1b1f28; max-width: 260px; }',
    '.brandmark { font: 600 11px/1 "IBM Plex Mono", ui-monospace, monospace; letter-spacing: 0.1em; text-transform: uppercase; color: #ec7a3c; padding-right: 2px; }',
    '.toggle { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #b9b1a1; cursor: pointer; white-space: nowrap; }',
    '.toggle input { accent-color: #ec7a3c; }',
    '.crumbs { display: flex; align-items: center; gap: 2px; min-width: 0; flex: 1 1 240px; overflow: hidden; font: 12px/1 "IBM Plex Mono", ui-monospace, monospace; color: #8b8577; }',
    '.crumbs button { min-height: 26px; padding: 0 6px; border: 0; border-radius: 4px; background: none; color: #b9b1a1; white-space: nowrap; font: inherit; }',
    '.crumbs button:hover { background: #2c313d; color: #fff; }',
    '.crumbs button[aria-current] { color: #ec7a3c; }',
    '.crumbs .sep { color: #50555f; padding: 0 1px; }',
    '.crumbs .hint { font: 13px/1.3 "Instrument Sans", system-ui, sans-serif; color: #8b8577; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
    '.state { font-size: 12px; color: #b9b1a1; white-space: nowrap; }',
    '.state.dirty { color: #f1b98c; }',
    /* preview pill */
    '.pill { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; display: flex; align-items: center; gap: 6px; padding: 6px; background: #14161b; color: #efe6d4; border-radius: 999px; box-shadow: 0 10px 30px rgba(10, 12, 16, 0.3); }',
    '.pill button { border-radius: 999px; }',
    '.pill .state { padding: 0 4px 0 6px; }',
    /* floating toolbars */
    '.itembar, .fmtbar { position: fixed; z-index: 2147483001; display: flex; align-items: center; gap: 1px; padding: 3px; background: #14161b; color: #efe6d4; border-radius: 8px; box-shadow: 0 8px 24px rgba(10, 12, 16, 0.28); }',
    '.itembar button, .fmtbar button { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: 5px; background: transparent; color: #efe6d4; font-size: 14px; }',
    '.itembar button:hover:not(:disabled), .fmtbar button:hover { background: #2c313d; color: #fff; }',
    '.itembar button:disabled { opacity: 0.3; }',
    '.itembar .del:hover:not(:disabled) { background: #a8421a; }',
    '.fmtbar button[aria-pressed="true"] { background: #ec7a3c; color: #14161b; }',
    '.fmtbar .txt { width: auto; padding: 0 8px; font: 700 11px/1 "IBM Plex Mono", ui-monospace, monospace; letter-spacing: 0.04em; }',
    '.fmtbar sup { font-size: 9px; line-height: 0; position: relative; top: -0.4em; vertical-align: baseline; }',
    '.tag { font: 600 11px/1 "IBM Plex Mono", ui-monospace, monospace; color: #b9b1a1; padding: 0 8px 0 6px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.vsep { width: 1px; height: 20px; background: #2c313d; margin: 0 3px; }',
    /* menus */
    '.menu { position: fixed; z-index: 2147483002; min-width: 260px; max-width: min(380px, calc(100vw - 16px)); max-height: calc(100vh - 120px); overflow: auto; padding: 6px; background: #fff; color: #14161b; border: 1px solid #cfc6b3; border-radius: 10px; box-shadow: 0 18px 44px rgba(10, 12, 16, 0.28); }',
    '.menu button { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; padding: 9px 10px; border: 0; border-radius: 6px; background: none; color: #14161b; }',
    '.menu button:hover:not(:disabled), .menu button:focus-visible { background: #f6e7dd; outline: none; }',
    '.menu button:disabled { color: #a9a294; }',
    '.menu .check { width: 14px; color: #a8421a; font-weight: 700; flex: none; }',
    '.menu hr { border: 0; border-top: 1px solid #e2dccf; margin: 5px 4px; }',
    '.menu .note { margin: 0; font-size: 12px; color: #646973; padding: 6px 10px 8px; line-height: 1.45; }',
    '.menu .danger { color: #a8421a; }',
    /* toasts */
    '.toasts { position: fixed; left: 50%; bottom: 84px; transform: translateX(-50%); z-index: 2147483003; display: grid; gap: 8px; justify-items: center; pointer-events: none; width: max-content; max-width: calc(100vw - 32px); }',
    '.toast { pointer-events: auto; background: #14161b; color: #efe6d4; padding: 10px 16px; border-radius: 8px; border-left: 3px solid #ec7a3c; box-shadow: 0 10px 28px rgba(10, 12, 16, 0.3); max-width: 560px; line-height: 1.45; transition: opacity 0.3s, transform 0.3s; }',
    '.toast.out { opacity: 0; transform: translateY(6px); }',
    /* dialogs */
    'dialog { padding: 0; border: 0; border-radius: 12px; width: min(640px, calc(100vw - 24px)); max-height: calc(100vh - 32px); background: #f9f7f2; color: #14161b; box-shadow: 0 30px 80px rgba(10, 12, 16, 0.45); }',
    'dialog.dlg--wide { width: min(1060px, calc(100vw - 24px)); }',
    'dialog::backdrop { background: rgba(18, 21, 28, 0.55); }',
    '.dlg__in { display: flex; flex-direction: column; max-height: calc(100vh - 32px); margin: 0; }',
    '.dlg__head { display: flex; align-items: center; gap: 12px; padding: 16px 20px 12px; border-bottom: 1px solid #e2dccf; }',
    '.dlg__head h2 { margin: 0; flex: 1; font: 500 25px/1.15 "EB Garamond", Garamond, Georgia, serif; color: #14161b; }',
    '.x { width: 34px; height: 34px; border: 0; border-radius: 6px; background: none; font-size: 22px; line-height: 1; color: #50555f; }',
    '.x:hover { background: #f2eee4; }',
    '.dlg__body { padding: 14px 20px; overflow: auto; }',
    '.dlg__body p { margin: 0 0 10px; line-height: 1.5; }',
    '.dlg__foot { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; padding: 12px 20px 16px; border-top: 1px solid #e2dccf; }',
    '.dlg__foot .left { margin-right: auto; }',
    '.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 38px; padding: 0 16px; border: 1px solid #8a7d68; border-radius: 6px; background: #fff; color: #14161b; font-weight: 500; }',
    '.btn:hover { border-color: #14161b; }',
    '.btn.primary { background: #a8421a; border-color: #a8421a; color: #fff; font-weight: 600; }',
    '.btn.primary:hover { background: #86330f; border-color: #86330f; }',
    '.btn.danger { color: #a8421a; border-color: #d4a07f; }',
    '.btn.danger.primary { color: #fff; border-color: #a8421a; }',
    '.btn.small { min-height: 32px; padding: 0 12px; font-size: 13px; }',
    '.btn.file { position: relative; overflow: hidden; cursor: pointer; }',
    '.btn.file input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }',
    '.field { display: block; margin: 12px 0; }',
    '.field__label { display: block; margin-bottom: 5px; font-weight: 600; font-size: 13px; color: #262931; }',
    '.field__hint { display: block; margin-top: 5px; font-size: 12px; color: #646973; line-height: 1.45; }',
    '.field.small { margin: 6px 0; }',
    'dialog input[type=text], dialog input[type=search], dialog select, dialog textarea { width: 100%; padding: 8px 10px; border: 1px solid #8a7d68; border-radius: 6px; background: #fff; color: #14161b; }',
    'input:focus-visible, select:focus-visible, textarea:focus-visible, .btn:focus-visible, .x:focus-visible, .menu button:focus-visible { outline: 2px solid #0b6d66; outline-offset: 1px; }',
    'textarea { resize: vertical; line-height: 1.45; }',
    'textarea.code { display: block; min-height: 52vh; font: 12.5px/1.55 "IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace; white-space: pre; overflow: auto; tab-size: 2; background: #fffdf8; }',
    '.check { display: flex; align-items: flex-start; gap: 8px; margin: 8px 0; cursor: pointer; line-height: 1.4; }',
    '.mapgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0 16px; }',
    '.tablepreview { overflow-x: auto; }',
    '.tablepreview table { border-collapse: collapse; width: 100%; font-size: 12.5px; }',
    '.tablepreview th, .tablepreview td { border: 1px solid #e2dccf; padding: 4px 8px; text-align: left; vertical-align: top; }',
    '.tablepreview th { background: #f6f1e7; font-weight: 600; }',
    '.check input { margin-top: 3px; accent-color: #a8421a; }',
    '.radios { border: 0; padding: 0; margin: 12px 0; }',
    '.radios legend { font-weight: 600; font-size: 13px; margin-bottom: 4px; padding: 0; }',
    '.muted { color: #646973; font-size: 13px; }',
    '.mt { margin-top: 12px; }',
    '.count { min-height: 1.4em; font-weight: 600; color: #0b6d66; }',
    '.imgrow { display: grid; grid-template-columns: 190px 1fr; gap: 16px; align-items: start; }',
    '.thumb { aspect-ratio: 4 / 3; background: #12151c; border-radius: 8px; overflow: hidden; display: grid; place-items: center; }',
    '.thumb img { max-width: 100%; max-height: 100%; object-fit: contain; }',
    '.thumb img:not([src]) { display: none; }',
    '.imgside { display: grid; gap: 8px; align-content: start; }',
    '.imgside .muted { margin: 0; word-break: break-all; }',
    '@media (max-width: 560px) { .imgrow { grid-template-columns: 1fr; } }',
    '.files { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 16px; min-height: 60vh; }',
    '.files__side { display: flex; flex-direction: column; gap: 8px; min-width: 0; }',
    '.files__list { list-style: none; margin: 0; padding: 0; overflow: auto; max-height: 50vh; border: 1px solid #e2dccf; border-radius: 8px; background: #fff; }',
    '.files__list button { display: flex; justify-content: space-between; align-items: center; gap: 8px; width: 100%; padding: 6px 10px; border: 0; background: none; text-align: left; font: 12px/1.35 "IBM Plex Mono", ui-monospace, monospace; color: #262931; word-break: break-all; }',
    '.files__list button:hover { background: #f6e7dd; }',
    '.files__list button[aria-current] { background: #14161b; color: #efe6d4; }',
    '.files__add { display: flex; flex-wrap: wrap; align-items: end; gap: 8px; }',
    '.files__add .field { flex: 1 1 160px; }',
    '.files__main { min-width: 0; }',
    '.files__main textarea.code { min-height: 48vh; }',
    '.filehead { font-size: 13px; word-break: break-all; }',
    '.fileacts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }',
    '.filepreview { background: #12151c; border-radius: 8px; padding: 12px; display: grid; place-items: center; max-height: 48vh; overflow: auto; }',
    '.filepreview img { max-width: 100%; }',
    '.badge { display: inline-block; padding: 1px 6px; border-radius: 999px; background: #f6e7dd; color: #8a3a0e; font: 600 10px/1.5 "Instrument Sans", system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }',
    '.badge.new { background: #e0efec; color: #0b6d66; }',
    '@media (max-width: 760px) { .files { grid-template-columns: 1fr; } .files__list { max-height: 26vh; } }',
    '.tokens { display: grid; gap: 0; }',
    '.group { margin: 18px 0 6px; font: 600 12px/1 "IBM Plex Mono", ui-monospace, monospace; letter-spacing: 0.1em; text-transform: uppercase; color: #a8421a; }',
    '.tokrow { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr); gap: 12px; align-items: center; padding: 6px 0; border-bottom: 1px solid #ece6da; }',
    '.tok { display: block; font: 600 13px/1.3 "IBM Plex Mono", ui-monospace, monospace; }',
    '.note { display: block; font-size: 12px; color: #646973; }',
    '.tokctl { display: flex; gap: 8px; align-items: center; }',
    '.tokctl input[type=color] { width: 44px; height: 36px; padding: 2px; border: 1px solid #8a7d68; border-radius: 6px; background: #fff; flex: none; }',
    '.photogrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px; margin-top: 8px; }',
    '.photogrid figure { margin: 0; }',
    '.photogrid img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 4px; background: #12151c; }',
    '.photogrid figcaption { margin-top: 3px; font-size: 11px; color: #646973; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.checkpage { margin: 18px 0 6px; font: 600 13px/1.3 "IBM Plex Mono", ui-monospace, monospace; color: #14161b; }',
    '.issues { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }',
    '.issue { display: grid; grid-template-columns: 74px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 8px 10px; background: #fff; border: 1px solid #e2dccf; border-radius: 8px; }',
    '.issue__kind { font: 600 10px/1.4 "IBM Plex Mono", ui-monospace, monospace; letter-spacing: 0.08em; text-transform: uppercase; }',
    '.issue--error .issue__kind { color: #a8421a; } .issue--warn .issue__kind { color: #8a5f12; } .issue--info .issue__kind { color: #0b6d66; }',
    '.help h3 { margin: 18px 0 6px; font: 500 21px/1.2 "EB Garamond", Garamond, Georgia, serif; }',
    '.help h3:first-child { margin-top: 0; }',
    '.help ul { margin: 0; padding-left: 20px; }',
    '.help li { margin: 6px 0; line-height: 1.5; }',
    '.welcome { position: fixed; inset: 0; z-index: 2147483004; display: grid; place-items: center; padding: 24px; background: #f9f7f2; overflow: auto; }',
    '.welcome__card { max-width: 580px; }',
    '.welcome .welcome__kicker { font: 600 12px/1 "IBM Plex Mono", ui-monospace, monospace; letter-spacing: 0.12em; text-transform: uppercase; color: #a8421a; margin: 0 0 14px; }',
    '.welcome h1 { margin: 0 0 12px; font: 500 46px/1.05 "EB Garamond", Garamond, Georgia, serif; color: #14161b; }',
    '.welcome p { margin: 0 0 14px; line-height: 1.55; color: #262931; font-size: 15px; }',
    '.welcome .btn { min-height: 48px; padding: 0 24px; font-size: 15px; margin: 6px 0 20px; }',
    '@media (max-width: 760px) { .label-wide, .brandmark, .toggle, .crumbs, .bar .state, .bar [data-act="redo"] { display: none !important; } .bar { gap: 6px; padding: 6px 8px; } .bar__group:first-child { flex: 1 1 100%; flex-wrap: nowrap; } .bar select { flex: 1 1 auto; max-width: none; min-width: 0; } .bar__group--end { margin-left: 0; } .bar button { padding: 0 9px; } }'
  ].join("\n");

  function ib(act, title, icon, cls) {
    return '<button type="button" data-act="' + act + '" title="' + esc(title) + '" aria-label="' + esc(title) + '"' + (cls ? ' class="' + cls + '"' : "") + ">" + icon + "</button>";
  }
  function fb(f, title, inner, cls) {
    return '<button type="button" data-fmt="' + f + '" title="' + esc(title) + '" aria-label="' + esc(title) + '" aria-pressed="false"' + (cls ? ' class="' + cls + '"' : "") + ">" + inner + "</button>";
  }
  function uiHTML() {
    return '' +
      '<div class="pill" data-pill hidden>' +
        '<button type="button" class="primary" data-act="edit">' + ICON.pen + "<span>Edit this page</span></button>" +
        '<span class="state" data-state></span>' +
        '<button type="button" data-act="menu:save" data-pill-save>Save ▾</button>' +
      "</div>" +
      '<div class="bar" data-bar hidden role="toolbar" aria-label="Website editor">' +
        '<div class="bar__group">' +
          '<span class="brandmark">Editing</span>' +
          '<select data-page aria-label="Page to edit"></select>' +
          '<button type="button" class="icon" data-act="undo" title="Undo (Ctrl+Z)" aria-label="Undo">' + ICON.undo + "</button>" +
          '<button type="button" class="icon" data-act="redo" title="Redo (Ctrl+Shift+Z)" aria-label="Redo">' + ICON.redo + "</button>" +
        "</div>" +
        '<div class="crumbs" data-crumbs></div>' +
        '<div class="bar__group bar__group--end">' +
          '<label class="toggle" title="Show blocks that visitors do not see"><input type="checkbox" data-hidden-toggle> Show hidden</label>' +
          '<button type="button" data-act="menu:page">Page ▾</button>' +
          '<button type="button" data-act="menu:site">Site ▾</button>' +
          '<span class="state" data-state></span>' +
          '<button type="button" class="primary" data-act="menu:save">Save ▾</button>' +
          '<button type="button" data-act="preview" title="See the page as visitors do">' + ICON.eye + '<span class="label-wide">Preview</span></button>' +
          '<button type="button" class="icon" data-act="help" title="Help" aria-label="Help">?</button>' +
        "</div>" +
      "</div>" +
      '<div class="itembar" data-itembar hidden role="toolbar" aria-label="Selected block">' +
        '<span class="tag" data-tag></span>' +
        ib("parent", "Select the larger block around it", ICON.parent) +
        ib("up", "Move up (Alt+↑)", ICON.up) +
        ib("down", "Move down (Alt+↓)", ICON.down) +
        ib("dup", "Duplicate (Ctrl+D)", ICON.copy) +
        ib("menu:insert", "Add something after it", ICON.plus) +
        ib("image", "Change the image", ICON.image) +
        ib("link", "Change the link", ICON.link) +
        ib("hide", "Hide from visitors", ICON.eyeOff) +
        ib("html", "Edit the HTML", ICON.code) +
        '<span class="vsep"></span>' +
        ib("delete", "Delete (Del)", ICON.trash, "del") +
      "</div>" +
      '<div class="fmtbar" data-fmtbar hidden role="toolbar" aria-label="Text formatting">' +
        fb("b", "Bold (Ctrl+B)", "<b>B</b>") +
        fb("em", "Italic / emphasis (Ctrl+I)", '<i style="font-family: Georgia, serif">I</i>') +
        fb("sup", "Superscript", "x<sup>2</sup>") +
        fb("link", "Link (Ctrl+K)", ICON.link) +
        fb("unlink", "Remove link", ICON.unlink) +
        fb("tba", "Mark as “to be announced”", "TBA", "txt") +
        fb("clear", "Remove formatting", ICON.clear) +
      "</div>" +
      '<div class="menu" data-menu hidden></div>' +
      '<div class="toasts" data-toasts role="status" aria-live="polite"></div>' +
      '<div class="welcome" data-welcome hidden><div class="welcome__card">' +
        '<p class="welcome__kicker">NSM 2026 · website editor</p>' +
        "<h1>Open your website folder</h1>" +
        "<p>Choose the folder that contains <code>index.html</code> — for example the unzipped <code>" + esc(CONFIG.zipFolder) + "</code> folder.</p>" +
        '<button type="button" class="btn primary" data-act="open-folder">Open website folder…</button>' +
        '<input type="file" data-folder-input webkitdirectory directory multiple hidden>' +
        '<p class="muted">Chrome and Edge can save your changes straight back into the folder. In other browsers you download the edited website as a .zip.</p>' +
        '<p class="muted">Nothing is uploaded anywhere: the files stay on this computer.</p>' +
      "</div></div>";
  }

  var host = null, shadow = null, ui = null, crumbEls = [], menuOpen = null, hovered = null;
  function buildUI() {
    host = D.createElement("nsm-site-editor");
    host.setAttribute("data-ed-ui", "");
    shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = "<style>" + UI_CSS + '</style><div class="ui" data-ui role="region" aria-label="Website editor">' + uiHTML() + "</div>";
    ui = qs("[data-ui]", shadow);
    D.body.appendChild(host);
  }

  function toast(msg, ms) {
    if (!ui) return;
    var box = qs("[data-toasts]", ui), t = D.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    box.appendChild(t);
    while (box.children.length > 3) remove(box.firstChild);
    setTimeout(function () { t.classList.add("out"); setTimeout(function () { remove(t); }, 320); }, ms || 4200);
  }

  var NAMES = { section: "Section", header: "Header", footer: "Footer", nav: "Menu", main: "Page content", article: "Article", aside: "Side box", div: "Box", p: "Paragraph", h1: "Page title", h2: "Heading", h3: "Small heading", h4: "Heading", h5: "Heading", h6: "Heading", ul: "List", ol: "Numbered list", li: "Item", dl: "Details", dt: "Label", dd: "Value", table: "Table", thead: "Table head", tbody: "Table body", tr: "Row", td: "Cell", th: "Heading cell", figure: "Figure", figcaption: "Caption", img: "Image", a: "Link", blockquote: "Quote", address: "Address", span: "Text", em: "Emphasis", b: "Bold", strong: "Bold", time: "Date", svg: "Drawing", form: "Form", button: "Button", small: "Small text" };
  function labelOf(e) {
    var n = NAMES[e.localName] || e.localName;
    if (e.matches(".btn")) n = "Button";
    else if (e.matches("dl > div")) n = "Detail row";
    else if (e.matches(".slide")) n = "Photo";
    if (e.id) return n + " #" + e.id;
    var cls = (e.getAttribute("class") || "").split(/\s+/).filter(function (c) { return c && !/^(is-|mt-|mb-|btn)/.test(c); })[0];
    return cls ? n + " · " + cls : n;
  }
  function renderCrumbs() {
    var box = qs("[data-crumbs]", ui);
    crumbEls = [];
    if (S.mode !== "edit") { box.innerHTML = ""; return; }
    if (!S.sel) { box.innerHTML = '<span class="hint">Click any text to change it · click around it to select its block · ? for help</span>'; return; }
    var chain = [];
    for (var e = S.sel; e && e !== D.body; e = e.parentElement) chain.unshift(e);
    var shown = chain.slice(-5);
    crumbEls = shown;
    function draw() {
      crumbEls = shown;
      box.innerHTML = (chain.length > shown.length ? '<span class="sep">…</span>' : "") + shown.map(function (el, i) {
        return (i ? '<span class="sep">›</span>' : "") + '<button type="button" data-crumb="' + i + '"' + (el === S.sel ? ' aria-current="true"' : "") + ' title="Select this block">' + esc(labelOf(el)) + "</button>";
      }).join("");
    }
    draw();
    while (shown.length > 1 && box.clientWidth && box.scrollWidth > box.clientWidth + 1) { shown = shown.slice(1); draw(); }
  }
  function updateBars() {
    if (!ui) return;
    var itembar = qs("[data-itembar]", ui), fmtbar = qs("[data-fmtbar]", ui);
    var e = S.mode === "edit" && S.sel && S.sel.isConnected ? S.sel : null;
    itembar.hidden = !e;
    if (e) {
      qs("[data-tag]", itembar).textContent = labelOf(e);
      qs('[data-act="parent"]', itembar).disabled = !e.parentElement || e.parentElement === D.body;
      qs('[data-act="up"]', itembar).disabled = !prevElement(e);
      qs('[data-act="down"]', itembar).disabled = !nextElement(e);
      qs('[data-act="image"]', itembar).hidden = !(e.localName === "img" || qsa("img", e).length === 1);
      qs('[data-act="link"]', itembar).hidden = !(e.localName === "a" || qsa("a[href]", e).length === 1);
      var hb = qs('[data-act="hide"]', itembar), hid = e.hasAttribute("data-ed-was-hidden");
      hb.innerHTML = hid ? ICON.eye : ICON.eyeOff;
      hb.title = hid ? "Show to visitors again" : "Hide from visitors";
      hb.setAttribute("aria-label", hb.title);
    }
    fmtbar.hidden = !(S.mode === "edit" && S.leaf);
    if (!fmtbar.hidden) {
      var r = selRange(), node = r ? r.startContainer : null;
      var state = { b: "b, strong", em: "em, i", sup: "sup", tba: ".tba", link: "a" };
      Object.keys(state).forEach(function (k) {
        qs('[data-fmt="' + k + '"]', fmtbar).setAttribute("aria-pressed", node && closestIn(node, state[k]) ? "true" : "false");
      });
    }
    renderCrumbs();
    placeBars();
  }
  function overlaps(a, b) { return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom; }
  function placeBars() {
    if (!ui) return;
    var itembar = qs("[data-itembar]", ui), fmtbar = qs("[data-fmtbar]", ui);
    var vw = D.documentElement.clientWidth, vh = window.innerHeight;
    var barH = S.mode === "edit" ? (qs("[data-bar]", ui).offsetHeight || 56) : 0, itemBox = null;
    qs("[data-toasts]", ui).style.bottom = (S.mode === "edit" ? barH + 14 : 76) + "px";
    if (!itembar.hidden && S.sel && S.sel.isConnected) {
      var r = S.sel.getBoundingClientRect(), w = itembar.offsetWidth, h = itembar.offsetHeight;
      var top = r.top - h - 8;
      if (top < 6) top = r.top >= 6 ? r.top + 6 : 6;
      top = Math.min(top, vh - barH - h - 6);
      var left = clamp(r.right - w, 6, vw - w - 6);
      itembar.style.top = top + "px";
      itembar.style.left = left + "px";
      itemBox = { top: top, left: left, bottom: top + h, right: left + w };
    }
    if (!fmtbar.hidden && S.leaf && S.leaf.isConnected) {
      var lr = S.leaf.getBoundingClientRect(), fw = fmtbar.offsetWidth, fh = fmtbar.offsetHeight;
      var below = Math.min(lr.bottom + 8, vh - barH - fh - 6);
      var ft = lr.top - fh - 8, fl = clamp(lr.left, 6, vw - fw - 6);
      if (ft < 6) ft = below;
      if (itemBox && overlaps({ top: ft, left: fl, bottom: ft + fh, right: fl + fw }, itemBox)) {
        var shifted = itemBox.left - fw - 8;
        if (shifted >= 6 && ft >= 6) fl = shifted;          /* stay above the text, left of the block toolbar */
        else {
          ft = below;
          if (overlaps({ top: ft, left: fl, bottom: ft + fh, right: fl + fw }, itemBox)) fl = clamp(itemBox.left - fw - 8, 6, vw - fw - 6);
        }
      }
      fmtbar.style.top = ft + "px";
      fmtbar.style.left = fl + "px";
    }
  }
  var placeQueued = false;
  function placeBarsSoon() {
    if (placeQueued) return;
    placeQueued = true;
    requestAnimationFrame(function () { placeQueued = false; placeBars(); });
  }

  function pageNames() {
    var names = {};
    qsa("header.masthead nav a[href]").forEach(function (a) {
      var r = routeOf(a.getAttribute("href"), S.page);
      if (r.page && !r.anchor) names[r.page] = a.textContent.trim();
    });
    return names;
  }
  var lastPageOptions = "";
  function updateUI() {
    if (!ui) return;
    var loaded = !!S.files[S.page];
    qs("[data-pill]", ui).hidden = !loaded || S.mode !== "preview";
    qs("[data-bar]", ui).hidden = !loaded || S.mode !== "edit";
    var sel = qs("[data-page]", ui), names = pageNames();
    var opts = pagePaths().map(function (p) {
      return '<option value="' + esc(p) + '" title="' + esc(p) + '">' + esc(names[p] || p) + "</option>";
    }).join("");
    if (opts !== lastPageOptions) { sel.innerHTML = opts; lastPageOptions = opts; }
    sel.value = S.page;
    var n = changedPaths().length, dirty = isDirty();
    qsa("[data-state]", ui).forEach(function (s) {
      s.textContent = !n ? "No changes" : dirty ? plural(n, "changed file") + " · not saved" : plural(n, "changed file") + " · saved";
      s.classList.toggle("dirty", dirty);
    });
    qs("[data-pill-save]", ui).hidden = !n;
    qs('[data-act="undo"]', ui).disabled = !S.history.length;
    qs('[data-act="redo"]', ui).disabled = !S.future.length;
    qs("[data-hidden-toggle]", ui).checked = S.showHidden;
    updateBars();
  }
  function changed() { updateUI(); saveDraftSoon(); }

  function openMenu(name, btn) {
    var m = qs("[data-menu]", ui);
    if (menuOpen === name && !m.hidden) { closeMenu(); return; }
    m.innerHTML = menuItems(name).filter(function (it) { return !it.hide; }).map(function (it) {
      if (it === "-") return "<hr>";
      if (it.note) return '<p class="note">' + it.note + "</p>";
      return '<button type="button" data-menu-act="' + it.act + '"' + (it.danger ? ' class="danger"' : "") + (it.disabled ? " disabled" : "") + ">" +
        (it.check != null ? '<span class="check">' + (it.check ? "✓" : "") + "</span>" : "") + esc(it.label) + "</button>";
    }).join("");
    m.hidden = false;
    menuOpen = name;
    var r = btn.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
    var top = r.top - mh - 6;
    if (top < 8) top = Math.min(r.bottom + 6, window.innerHeight - mh - 8);
    m.style.left = clamp(r.left, 8, D.documentElement.clientWidth - mw - 8) + "px";
    m.style.top = Math.max(8, top) + "px";
    var first = qs("button:not([disabled])", m);
    if (first) first.focus();
  }
  function closeMenu() { if (!ui) return; qs("[data-menu]", ui).hidden = true; menuOpen = null; }
  function menuItems(name) {
    if (name === "page") return [
      { act: "page-settings", label: "Title and description…" },
      { act: "page-html", label: "Edit this page's HTML…" },
      { act: "add-photos", label: "Add photos to the gallery…", hide: !qs("main [data-gallery]") },
      { act: "fill-table", label: "Fill a table from a spreadsheet…", hide: !qs("main table") },
      "-",
      { act: "page-new", label: "Add a page…" },
      { act: "page-remove", label: "Remove this page…", danger: true, disabled: S.page === "index.html" }
    ];
    if (name === "site") return [
      { act: "check", label: "Check the website…" },
      { act: "find", label: "Find and replace…" },
      { act: "theme", label: "Colours and fonts…" },
      { act: "files", label: "Files and code…" },
      "-",
      { act: "toggle-sync", label: "Same header and footer on every page", check: S.syncShared },
      { act: "toggle-hidden", label: "Show hidden items", check: S.showHidden }
    ];
    if (name === "save") {
      var ch = changedPaths();
      var items = [{ note: ch.length ? "Changed: " + ch.slice(0, 6).map(esc).join(", ") + (ch.length > 6 ? " and " + (ch.length - 6) + " more" : "") : "No changes yet." }];
      if (S.dir) items.push({ act: "save-folder", label: "Save into the website folder" });
      items.push(
        { act: "dl-site", label: "Download the whole website (.zip)" },
        { act: "dl-changed", label: "Download only the changed files (.zip)", disabled: !ch.length },
        { act: "dl-page", label: "Download this page (" + S.page + ")" },
        "-",
        { act: "copy-changes", label: "Copy changes as text (to paste to Claude)", disabled: !ch.length },
        "-",
        { act: "discard", label: "Discard all changes…", danger: true, disabled: !ch.length }
      );
      return items;
    }
    if (name === "insert") return [{ note: "Add after the selected block:" }].concat(insertChoices().map(function (k) { return { act: "ins:" + k, label: SNIPPETS[k].label }; }));
    return [];
  }

  function enterEdit() {
    render(S.page, "edit", null, { keepScroll: true });
    if (!S.toldHowTo) { S.toldHowTo = true; toast("Click any text to change it. Click around it to select its block. ? explains everything.", 6500); }
  }
  function enterPreview() {
    if (S.mode === "edit") commit();
    render(S.page, "preview", null, { keepScroll: true });
  }
  function setShowHidden(on) {
    S.showHidden = !!on;
    if (S.showHidden && S.mode === "edit") D.documentElement.setAttribute("data-ed-show-hidden", "");
    else D.documentElement.removeAttribute("data-ed-show-hidden");
    if (!S.showHidden && S.sel && S.sel.closest("[data-ed-was-hidden]")) select(null);
    updateUI();
  }

  function runAct(act, btn) {
    if (act.indexOf("menu:") === 0) { openMenu(act.slice(5), btn); return; }
    closeMenu();
    if (act.indexOf("ins:") === 0) { opInsert(act.slice(4)); return; }
    var e = S.sel, x;
    switch (act) {
      case "edit": enterEdit(); break;
      case "preview": enterPreview(); break;
      case "undo": undo(); break;
      case "redo": redo(); break;
      case "help": openHelp(); break;
      case "parent": opParent(); break;
      case "up": opMove(-1); break;
      case "down": opMove(1); break;
      case "dup": opDuplicate(); break;
      case "hide": opHide(); break;
      case "delete": opDelete(); break;
      case "html": if (e) openHTMLDialog(e); break;
      case "image": x = e && (e.localName === "img" ? e : qs("img", e)); if (x) openImageDialog(x); break;
      case "link": x = e && (e.localName === "a" ? e : qs("a[href]", e)); if (x) { stopEditing(); openLinkDialog(x, null); } break;
      case "page-settings": openPageSettings(); break;
      case "page-html": openFiles(S.page); break;
      case "add-photos": openAddPhotos(galleryFor(S.sel)); break;
      case "fill-table": openFillTable(S.sel && S.sel.isConnected ? (S.sel.closest("table") || qs("table", S.sel)) : null); break;
      case "page-new": openNewPage(); break;
      case "page-remove": openRemovePage(); break;
      case "find": openFindReplace(); break;
      case "check": openCheck(); break;
      case "theme": openTheme(); break;
      case "files": openFiles(); break;
      case "toggle-sync":
        S.syncShared = !S.syncShared;
        toast(S.syncShared ? "Changes to the header and footer are copied to every page." : "Changes to the header and footer now stay on this page only.");
        break;
      case "toggle-hidden": setShowHidden(!S.showHidden); break;
      case "save-folder": saveToFolder(); break;
      case "dl-site": downloadSite(); break;
      case "dl-changed": downloadChanged(); break;
      case "dl-page": downloadPage(); break;
      case "copy-changes": copyChanges(); break;
      case "discard": discardAll(); break;
      case "open-folder": openFolder(); break;
    }
  }

  function wireUI() {
    shadow.addEventListener("click", function (e) {
      if (e.target.closest("dialog")) return;
      var b = e.target.closest("[data-act]");
      if (b) { e.preventDefault(); runAct(b.getAttribute("data-act"), b); return; }
      var c = e.target.closest("[data-crumb]");
      if (c) { var el = crumbEls[+c.getAttribute("data-crumb")]; if (el) { stopEditing(); select(el); el.scrollIntoView({ block: "nearest" }); } return; }
      var f = e.target.closest("[data-fmt]");
      if (f) { e.preventDefault(); fmt(f.getAttribute("data-fmt")); return; }
      var m = e.target.closest("[data-menu-act]");
      if (m) { e.preventDefault(); closeMenu(); runAct(m.getAttribute("data-menu-act"), m); }
    });
    shadow.addEventListener("mousedown", function (e) {
      if (e.target.closest(".fmtbar, .itembar, .crumbs")) e.preventDefault();
      if (!e.target.closest('[data-menu], [data-act^="menu:"]')) closeMenu();
    });
    shadow.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menuOpen) { e.preventDefault(); closeMenu(); return; }
      var t = e.target;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.closest("dialog")) return;
      var mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === "z" || e.key === "Z")) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (mod && (e.key === "y" || e.key === "Y")) { e.preventDefault(); redo(); }
      else if (mod && (e.key === "s" || e.key === "S")) { e.preventDefault(); saveDefault(); }
    });
    qs("[data-page]", ui).addEventListener("change", function () {
      if (S.mode === "edit") commit();
      render(this.value, S.mode);
    });
    qs("[data-hidden-toggle]", ui).addEventListener("change", function () { setShowHidden(this.checked); });
    qs("[data-folder-input]", ui).addEventListener("change", function () { readPickedFiles(this.files); });
  }

  function wirePage() {
    D.addEventListener("mousedown", function (e) {
      if (eventInUI(e)) return;
      closeMenu();
      if (S.mode === "edit") onEditMouseDown(e);
    }, true);
    D.addEventListener("click", function (e) {
      if (eventInUI(e)) return;
      if (S.mode === "edit") onEditClick(e); else onPreviewClick(e);
    }, true);
    D.addEventListener("dblclick", function (e) { if (S.mode === "edit" && !eventInUI(e)) onEditDblClick(e); }, true);
    D.addEventListener("mouseover", function (e) {
      if (S.mode !== "edit" || eventInUI(e)) return;
      var it = itemFor(e.target, e.altKey);
      if (it === hovered) return;
      if (hovered) hovered.removeAttribute("data-ed-hover");
      hovered = it;
      if (it) it.setAttribute("data-ed-hover", "");
    }, true);
    D.addEventListener("mouseleave", function () { if (hovered) { hovered.removeAttribute("data-ed-hover"); hovered = null; } });
    D.addEventListener("keydown", function (e) { if (S.mode === "edit") onEditKeyDown(e); }, true);
    D.addEventListener("input", function (e) { if (S.mode === "edit") onEditInput(e); }, true);
    D.addEventListener("paste", function (e) { if (S.mode === "edit" && !eventInUI(e)) onEditPaste(e); }, true);
    D.addEventListener("selectionchange", function () { if (S.mode === "edit" && S.leaf) updateBars(); });
    D.addEventListener("dragstart", function (e) { if (S.mode === "edit" && !eventInUI(e)) e.preventDefault(); }, true);
    D.addEventListener("dragover", function (e) { if (S.mode === "edit" && !eventInUI(e)) e.preventDefault(); }, true);
    D.addEventListener("drop", function (e) { if (S.mode === "edit") onEditDrop(e); }, true);
    window.addEventListener("scroll", placeBarsSoon, { passive: true });
    window.addEventListener("resize", placeBarsSoon);
    window.addEventListener("hashchange", function () {
      var m = /^#\/([^/]+\.html?)(?:\/(.*))?$/.exec(window.location.hash || "");
      if (m && S.files[m[1]]) { if (S.mode === "edit") commit(); render(m[1], S.mode, m[2] || ""); }
    });
    window.addEventListener("beforeunload", function (e) {
      if (S.mode === "edit") commit();
      if (S.files[S.page] && isDirty()) { saveDraft(); e.preventDefault(); e.returnValue = ""; }
    });
  }


  /* =================================================================
     15. START: the website comes either built into this file (the
     preview) or from a folder chosen on this computer (edit.html).
     ================================================================= */
  var SKIP = /(^|\/)(\.[^/]*|node_modules|__MACOSX)(\/|$)|(^|\/)(Thumbs\.db|desktop\.ini)$/i;
  function findSiteRoot(paths) {
    if (paths.indexOf("index.html") > -1) return "";
    var c = paths.filter(function (p) { return /(^|\/)index\.html$/.test(p); })
      .sort(function (a, b) { return a.split("/").length - b.split("/").length; })[0];
    return c ? c.slice(0, -"index.html".length) : null;
  }
  function stripPrefix(map, prefix) {
    var out = {};
    Object.keys(map).forEach(function (p) { if (p.indexOf(prefix) === 0) out[p.slice(prefix.length)] = map[p]; });
    return out;
  }
  function fileData(path, file) {
    if (isTextPath(path)) return file.text().then(function (t) { return { text: t }; });
    return file.arrayBuffer().then(function (b) { return { b64: bytesToB64(new Uint8Array(b)) }; });
  }
  function readDirectory(dir, prefix, out) {
    var it = dir.values(), jobs = [];
    function step() {
      return it.next().then(function (res) {
        if (res.done) return Promise.all(jobs);
        var entry = res.value, p = prefix + entry.name;
        if (!SKIP.test(p)) {
          if (entry.kind === "directory") jobs.push(readDirectory(entry, p + "/", out));
          else jobs.push(entry.getFile().then(function (f) { return fileData(p, f); }).then(function (d) { out[p] = d; }));
        }
        return step();
      });
    }
    return step();
  }
  function openFolder() {
    if (window.showDirectoryPicker && window.top === window) {
      window.showDirectoryPicker({ id: "nsm2026-site", mode: "readwrite" }).then(function (dir) {
        toast("Reading the folder…");
        var map = {};
        return readDirectory(dir, "", map).then(function () {
          var prefix = findSiteRoot(Object.keys(map));
          if (prefix == null) { toast("There is no index.html in that folder. Choose the folder that contains index.html.", 6000); return; }
          var handle = Promise.resolve(dir);
          prefix.split("/").filter(Boolean).forEach(function (seg) { handle = handle.then(function (d) { return d.getDirectoryHandle(seg); }); });
          return handle.then(function (d) { S.dir = d; loadFiles(stripPrefix(map, prefix), "folder"); });
        });
      }).catch(function (err) {
        if (err && err.name === "AbortError") return;
        qs("[data-folder-input]", ui).click();
      });
    } else {
      qs("[data-folder-input]", ui).click();
    }
  }
  function readPickedFiles(list) {
    var files = Array.prototype.slice.call(list || []);
    if (!files.length) return;
    toast("Reading the folder…");
    var map = {};
    Promise.all(files.map(function (f) {
      var p = (f.webkitRelativePath || f.name).replace(/\\/g, "/");
      if (SKIP.test(p)) return null;
      return fileData(p, f).then(function (d) { map[p] = d; });
    })).then(function () {
      var prefix = findSiteRoot(Object.keys(map));
      if (prefix == null) { toast("There is no index.html in that folder. Choose the folder that contains index.html.", 6000); return; }
      S.dir = null;
      loadFiles(stripPrefix(map, prefix), "folder");
    });
  }
  function loadFiles(map, origin) {
    S.files = Object.create(null);
    S.orig = Object.create(null);
    Object.keys(map).sort().forEach(function (p) { var r = makeRecord(p, map[p]); S.files[p] = r; S.orig[p] = r; });
    S.origin = origin;
    S.history = [];
    S.future = [];
    S.siteKey = hash((S.files["index.html"] ? S.files["index.html"].text : "") + "|" + Object.keys(S.files).join("|"));
    S.savedMark = fingerprint();
    try { localStorage.setItem(CONFIG.draftKey + ":test", "1"); localStorage.removeItem(CONFIG.draftKey + ":test"); S.storage = true; } catch (e) { S.storage = false; }
    var start = "index.html", anchor = "";
    var m = /^#\/([^/]+\.html?)(?:\/(.*))?$/.exec(window.location.hash || "");
    if (m && S.files[m[1]]) { start = m[1]; anchor = m[2] || ""; }
    if (!S.files[start]) start = pagePaths()[0];
    if (!start) { toast("No .html pages were found in this folder."); return; }
    qs("[data-welcome]", ui).hidden = true;
    render(start, origin === "folder" ? "edit" : "preview", anchor);
    if (origin === "folder") toast(S.dir ? "Folder opened. Save writes your changes straight into it." : "Folder opened. When you are done, Save downloads the edited website as a .zip.", 6000);
    checkDraft();
  }

  function boot() {
    var style = D.createElement("style");
    style.setAttribute("data-ed-style", "");
    style.textContent = EDIT_CSS;
    D.head.appendChild(style);
    buildUI();
    wireUI();
    wirePage();
    var emb = D.getElementById("nsm-site-files");
    if (emb) {
      var data = null;
      try { data = JSON.parse(emb.textContent); } catch (e) { toast("The built-in website could not be read."); }
      remove(emb);
      if (data) { loadFiles(data.files || data, "embedded"); return; }
    }
    qs("[data-welcome]", ui).hidden = false;
  }

  /* For checking and scripting from the browser console */
  window.NSMEditor = {
    state: S, render: render, commit: commit, undo: undo, redo: redo,
    changedPaths: changedPaths, serializeDocument: serializeDocument, parseHTML: parseHTML,
    outputText: function (p) { var r = outputRecord(p); return r && r.text; },
    makeZip: makeZip, entries: function (all) { return entriesFor(all ? Object.keys(S.files).sort() : changedPaths().filter(function (p) { return S.files[p]; })); }
  };

  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
