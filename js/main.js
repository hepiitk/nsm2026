/* =====================================================================
   js/main.js — small helpers shared by all pages
   ---------------------------------------------------------------------
   1. Mobile menu (the "Menu" button on narrow screens)
   2. A hairline under the header once the page is scrolled
   3. Optional sections hide themselves when they are empty
        <section data-optional> … <li data-item> … </section>
      If a [data-optional] block contains no [data-item], it is hidden,
      so empty placeholders never show on the live site.
      (Used for the Talk Materials section on the Schedule page.)
   4. Photos marked  data-optional-image  are hidden if the file is
      missing, instead of showing a broken-image icon.
   5. Maths written as $…$ is typeset with KaTeX (assets/vendor/katex).
      A page that does not load KaTeX itself gets it only if it contains
      a $ sign, so pages without maths never download it.
   6. Wide maps on phones start scrolled to their centre.
   7. E-mail addresses marked class="copy-email" are copied with a click.
   8. The Participants table: a search box, sorting by a click on the
      arrow of a column heading, and a count by position.
   9. Links to other websites open in a new tab (links within this site
      open in the same tab).
   Preview mode: open any page with ?preview after its address to see the
   example entries (data-preview-only); visitors never see them.

   You do not need to edit this file to change any content.
   ===================================================================== */

(function () {
  "use strict";

  /* ---------- 1. Mobile menu ---------- */
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    var closeMenu = function () {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    };
    toggle.addEventListener("click", function () {
      var open = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { closeMenu(); toggle.focus(); }
    });
  }

  /* ---------- 2. Header hairline on scroll ---------- */
  var header = document.querySelector(".masthead");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 4); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Preview mode ----------
     Add ?preview to a page's address (e.g. schedule.html?preview) to see
     the example entries marked data-preview-only. Visitors never see them. */
  if (/[?&]preview\b/.test(window.location.search) || window.NSM_PREVIEW === true) {
    var examples = document.querySelectorAll("[data-preview-only]");
    for (var e = 0; e < examples.length; e++) examples[e].hidden = false;
    var hidden = document.querySelectorAll("[data-hide-in-preview]");
    for (var h = 0; h < hidden.length; h++) hidden[h].hidden = true;
    if (examples.length) {
      var banner = document.createElement("p");
      banner.className = "preview-banner";
      banner.textContent = "Preview mode: example entries are shown. Visitors do not see them.";
      document.body.appendChild(banner);
    }
  }

  /* ---------- 3 & 4. Optional content ---------- */
  function refreshOptional() {
    var blocks = document.querySelectorAll("[data-optional]");
    for (var i = 0; i < blocks.length; i++) {
      var items = blocks[i].querySelectorAll("[data-item]");
      var visible = 0;
      for (var j = 0; j < items.length; j++) { if (!items[j].hidden) visible += 1; }
      blocks[i].hidden = visible === 0;
    }
  }

  var images = document.querySelectorAll("img[data-optional-image]");
  for (var k = 0; k < images.length; k++) {
    (function (img) {
      var hideFigure = function () {
        var holder = img.closest("[data-item]") || img;
        holder.hidden = true;
        refreshOptional();
      };
      if (img.complete && img.naturalWidth === 0) hideFigure();
      else img.addEventListener("error", hideFigure);
    })(images[k]);
  }
  refreshOptional();

  /* ---------- 5. Maths ---------- */
  function typeset() {
    if (typeof window.renderMathInElement !== "function") return;
    window.renderMathInElement(document.body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false }
      ],
      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
      throwOnError: false
    });
  }
  /* Is there a $ in the text of the page (outside code, scripts …)? */
  function hasMaths() {
    var walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), node;
    while ((node = walk.nextNode())) {
      if (node.nodeValue.indexOf("$") >= 0 && !node.parentNode.closest("script, noscript, style, textarea, pre, code")) return true;
    }
    return false;
  }
  /* Load KaTeX (style sheet, then the two scripts); done() runs when all are in. */
  function loadKatex(done) {
    var base = "assets/vendor/katex/", waiting = 2;
    function ready() { if (--waiting === 0) done(); }
    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = base + "katex.min.css";
    css.onload = css.onerror = ready;
    document.head.appendChild(css);
    var lib = document.createElement("script");
    lib.src = base + "katex.min.js";
    lib.onload = function () {
      var auto = document.createElement("script");
      auto.src = base + "auto-render.min.js";
      auto.onload = auto.onerror = ready;
      document.head.appendChild(auto);
    };
    lib.onerror = ready;
    document.head.appendChild(lib);
  }
  /* As before, the maths is typeset once the page has loaded. A page without
     KaTeX in its HTML starts fetching it straight away if it has a $ sign. */
  var katexIn = typeof window.renderMathInElement === "function";
  var pageLoaded = document.readyState === "complete";
  function maths() { if (katexIn && pageLoaded) typeset(); }
  if (!katexIn && hasMaths()) loadKatex(function () { katexIn = true; maths(); });
  if (pageLoaded) maths();
  else window.addEventListener("load", function () { pageLoaded = true; maths(); });

  /* ---------- 7. E-mail addresses that copy on click ----------
     <a class="copy-email" href="mailto:name@iitk.ac.in">name@iitk.ac.in</a>
     A click copies the address and shows "Copied"; if the browser cannot
     copy, the link opens the e-mail program as usual. */
  var copyLinks = document.querySelectorAll("a.copy-email");
  for (var c = 0; c < copyLinks.length; c++) {
    copyLinks[c].setAttribute("data-copy-ready", "");
    copyLinks[c].setAttribute("title", "Click to copy the address");
  }
  if (!window.NSM_COPY_READY) {
    window.NSM_COPY_READY = true;
    var copyStatus = null;
    var announce = function (msg) {
      if (!copyStatus || !copyStatus.isConnected) {
        copyStatus = document.createElement("p");
        copyStatus.className = "visually-hidden";
        copyStatus.setAttribute("role", "status");
        document.body.appendChild(copyStatus);
      }
      copyStatus.textContent = "";
      setTimeout(function () { copyStatus.textContent = msg; }, 50);
    };
    var copyText = function (text) {
      if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
      return new Promise(function (resolve, reject) {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
        document.body.removeChild(ta);
        if (ok) resolve(); else reject();
      });
    };
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a.copy-email");
      if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      var addr = (a.textContent || "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(addr)) addr = (a.getAttribute("href") || "").replace(/^mailto:/i, "").split("?")[0];
      if (!addr) return;
      e.preventDefault();
      copyText(addr).then(function () {
        a.classList.add("is-copied");
        announce("Copied " + addr);
        clearTimeout(a.copyTimer);
        a.copyTimer = setTimeout(function () { a.classList.remove("is-copied"); }, 2000);
      }, function () { window.location.href = a.href; });
    });
  }

  /* ---------- 6. Centre wide maps on small screens ---------- */
  var scrollers = document.querySelectorAll(".scroll-x");
  for (var m = 0; m < scrollers.length; m++) {
    (function (box) {
      var centre = function () { box.scrollLeft = (box.scrollWidth - box.clientWidth) / 2; };
      var img = box.querySelector("img");
      if (img && !img.complete) img.addEventListener("load", centre); else centre();
    })(scrollers[m]);
  }

  /* ---------- 8. Searchable, sortable table (Participants) ----------
     <div data-list-tools="TABLE-ID">
       <input type="search" data-filter-for="TABLE-ID">
       <p data-count-for="TABLE-ID"></p>
     </div>
     Column headings with data-sort get a clickable arrow: the first click
     sorts by that column, the next click reverses it.
       <th scope="col" data-sort="0">Name</th>              alphabetical by first name
       <th scope="col" data-sort="1:group">Institution</th>  everyone from the same institution
                                                             together, then names alphabetical
       <th scope="col" data-sort="2:rank">Position</th>      in the groups of data-rank
     (":surname", e.g. data-sort="0:surname", sorts by the last word.)
     <table id="TABLE-ID" data-count-label="participant"
            data-rank-column="2" data-rank="faculty professor … | postdoc … | student …">
     data-rank lists the groups of the Position column, in order, separated
     by "|"; a row joins the first group with a word found in its cell.
     The count then also says how many are in each group.
     Rows whose first cell holds a "TBA" mark are placeholders: they are
     not counted, searched or sorted, and stay at the top. */
  var fold = function (s) {
    s = String(s || "").toLowerCase();
    return s.normalize ? s.normalize("NFD").replace(/[̀-ͯ]/g, "") : s;
  };
  var cellText = function (c) { return c ? c.textContent.replace(/\s+/g, " ").trim() : ""; };
  var boxes = document.querySelectorAll("[data-list-tools]");
  for (var b = 0; b < boxes.length; b++) {
    (function (box) {
      var id = box.getAttribute("data-list-tools");
      var table = document.getElementById(id);
      if (!table || !table.tBodies.length) return;
      var body = table.tBodies[0];
      var rows = [], placeholders = [];
      for (var r = 0; r < body.rows.length; r++) {
        var row = body.rows[r], first = row.cells[0];
        if (row.hidden) continue;
        if (first && first.querySelector(".tba")) { placeholders.push(row); continue; }
        rows.push({ el: row, i: rows.length, cells: Array.prototype.map.call(row.cells, cellText), text: fold(row.textContent.replace(/\s+/g, " ")) });
      }
      var input = box.querySelector("[data-filter-for]");
      var sorter = box.querySelector("[data-sort-for]");   /* an optional <select>, as in earlier versions */
      var count = box.querySelector("[data-count-for]");
      var one = table.getAttribute("data-count-label") || "entry";
      var many = table.getAttribute("data-count-label-plural") || (one === "entry" ? "entries" : one + "s");
      var label = function (n) { return n + " " + (n === 1 ? one : many); };

      /* position groups, e.g. faculty | postdoc | student */
      var groups = (table.getAttribute("data-rank") || "").split("|").map(function (g) {
        return g.trim().toLowerCase().split(/\s+/).filter(Boolean);
      }).filter(function (g) { return g.length; });
      var rankCol = parseInt(table.getAttribute("data-rank-column"), 10);
      var rankOf = function (t) {
        t = fold(t);
        for (var g = 0; g < groups.length; g++) {
          for (var w = 0; w < groups[g].length; w++) if (t.indexOf(groups[g][w]) !== -1) return g;
        }
        return groups.length;
      };
      var groupName = function (g, n) { var w = groups[g][0]; return n === 1 || /y$/.test(w) ? w : w + "s"; };
      var breakdown = function () {
        if (!groups.length || isNaN(rankCol)) return "";
        var n = groups.map(function () { return 0; });
        rows.forEach(function (x) { var g = rankOf(x.cells[rankCol]); if (g < groups.length) n[g]++; });
        return n.map(function (k, g) { return k ? k + " " + groupName(g, k) : ""; }).filter(Boolean).join(" · ");
      };

      var collator = window.Intl && Intl.Collator ? new Intl.Collator(undefined, { sensitivity: "base", numeric: true }) : null;
      var cmp = function (a, z) { return collator ? collator.compare(a, z) : (a < z ? -1 : a > z ? 1 : 0); };
      var surname = function (s) { var w = s.replace(/[.,]/g, " ").trim().split(/\s+/); return w[w.length - 1] + " " + s; };
      /* "IIT Kanpur", "IIT, Kanpur" and "iit  kanpur" count as the same institution */
      var groupKey = function (s) { return fold(s).replace(/[^a-z0-9]+/g, " ").trim(); };
      var groupOf = function (x, col, mode) { return mode === "rank" ? String(rankOf(x.cells[col] || "")) : groupKey(x.cells[col] || ""); };

      var state = { v: "", dir: 1 };   /* which column, and 1 = up (A to Z) or -1 = down */
      var sortRows = function () {
        var v = sorter ? sorter.value : state.v, dir = sorter ? 1 : state.dir;
        var col = parseInt(v, 10), mode = v.split(":")[1] || "";
        var list = rows.slice();
        if (v !== "" && !isNaN(col)) {
          list.sort(function (a, z) {
            var r = 0;
            if (mode === "rank") r = rankOf(a.cells[col] || "") - rankOf(z.cells[col] || "");
            else if (mode === "group") r = cmp(groupKey(a.cells[col] || ""), groupKey(z.cells[col] || ""));
            else if (mode === "surname") r = cmp(surname(a.cells[col] || ""), surname(z.cells[col] || ""));
            else r = cmp(a.cells[col] || "", z.cells[col] || "");
            r *= dir;
            /* within an institution or a position group, names stay alphabetical */
            return r || (col === 0 ? 0 : cmp(a.cells[0] || "", z.cells[0] || "")) || a.i - z.i;
          });
        } else list.sort(function (a, z) { return a.i - z.i; });
        list.forEach(function (x) { body.appendChild(x.el); });
        grouping = (mode === "group" || mode === "rank") && !isNaN(col) ? { col: col, mode: mode } : null;
        markGroups();
        /* the arrow of the sorted column lights up; screen readers hear the order */
        var heads = table.tHead ? table.tHead.rows[0].cells : [];
        for (var h = 0; h < heads.length; h++) {
          if (v !== "" && h === col) heads[h].setAttribute("aria-sort", dir === 1 ? "ascending" : "descending"); else heads[h].removeAttribute("aria-sort");
        }
      };

      /* turn the headings marked data-sort into buttons with an up/down arrow */
      var ARROWS = '<svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true" focusable="false"><path class="sort-btn__up" d="M5 1.5 9 6.5H1z"/><path class="sort-btn__down" d="M5 14.5 1 9.5h8z"/></svg>';
      Array.prototype.forEach.call(table.tHead ? table.tHead.rows[0].cells : [], function (th) {
        var v = th.getAttribute("data-sort");
        if (v === null || th.querySelector(".sort-btn")) return;
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sort-btn";
        while (th.firstChild) btn.appendChild(th.firstChild);
        btn.insertAdjacentHTML("beforeend", ARROWS);
        btn.title = "Sort by " + btn.textContent.trim().toLowerCase();
        th.appendChild(btn);
        btn.addEventListener("click", function () {
          if (state.v === v) state.dir = -state.dir; else { state.v = v; state.dir = 1; }
          sortRows();
        });
      });

      /* when sorted by institution or position, a line separates the groups */
      var grouping = null;
      var markGroups = function () {
        var last = null;
        rows.slice().sort(function (a, z) { return a.el.compareDocumentPosition(z.el) & 2 ? 1 : -1; }).forEach(function (x) {
          x.el.classList.remove("group-start");
          if (!grouping || x.el.hidden) return;
          var g = groupOf(x, grouping.col, grouping.mode);
          if (last !== null && g !== last) x.el.classList.add("group-start");
          last = g;
        });
      };

      var update = function () {
        var words = fold(input ? input.value : "").split(/\s+/).filter(Boolean), shown = 0;
        rows.forEach(function (x) {
          var hit = words.every(function (w) { return x.text.indexOf(w) !== -1; });
          x.el.hidden = !hit;
          if (hit) shown++;
        });
        placeholders.forEach(function (p) { p.hidden = words.length > 0; });
        markGroups();
        if (!count) return;
        if (!rows.length) count.textContent = words.length ? "No " + one + " matches “" + input.value.trim() + "” yet." : "No " + many + " listed yet.";
        else if (!words.length) { var bd = breakdown(); count.textContent = label(rows.length) + (bd ? " · " + bd : ""); }
        else count.textContent = shown ? shown + " of " + label(rows.length) : "No " + one + " matches “" + input.value.trim() + "”";
      };

      box.hidden = false;
      if (input) input.addEventListener("input", update);
      if (sorter) sorter.addEventListener("change", sortRows);
      sortRows();
      update();
    })(boxes[b]);
  }

  /* ---------- 9. Links to other websites open in a new tab ----------
     A link counts as "another website" when it starts with http:// or
     https:// and leads outside this site (a different address, or the
     same address outside the folder of this site). Links within the site,
     e-mail and phone links are left alone. Works for links added later. */
  var siteHome = location.protocol + "//" + location.host + location.pathname.replace(/[^\/]*$/, "");
  function markExternal(a) {
    if (!a || a.hasAttribute("target")) return;
    var href = a.getAttribute("href") || "";
    if (!/^https?:\/\//i.test(href) || a.href.indexOf(siteHome) === 0) return;
    a.setAttribute("target", "_blank");
    var rel = (a.getAttribute("rel") || "").split(/\s+/);
    if (rel.indexOf("noopener") < 0) a.setAttribute("rel", (rel.join(" ") + " noopener").trim());
  }
  var links = document.querySelectorAll("a[href]");
  for (var l = 0; l < links.length; l++) markExternal(links[l]);
  document.addEventListener("click", function (e) {
    if (e.target.closest) markExternal(e.target.closest("a[href]"));
  }, true);
})();
