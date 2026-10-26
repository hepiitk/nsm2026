/* =====================================================================
   js/gallery.js — the photo viewer of the Gallery page
   ---------------------------------------------------------------------
   Works on every  <ul class="gallery" data-gallery>  in a page.
   • A click on a photo opens it large, with its caption.
   • ← and → (buttons, keys or a swipe) move through the photos of that
     gallery; Esc, × or a click beside the photo closes the viewer.
   • Without JavaScript the link simply opens the photo file.
   • Hidden photos (hidden attribute) are skipped.

   To add photos, edit gallery.html (search "PHOTOS"), or use the visual
   editor: Page → Add photos to the gallery. You do not need to edit
   this file.
   ===================================================================== */

(function () {
  "use strict";

  var viewer = null, items = [], index = 0, opener = null;

  function build() {
    var d = document.createElement("dialog");
    d.className = "lightbox";
    d.setAttribute("aria-label", "Photo viewer");
    d.innerHTML =
      '<div class="lightbox__bar">' +
        '<p class="lightbox__count" aria-live="polite"></p>' +
        '<button type="button" class="lightbox__btn lightbox__close" aria-label="Close the photo viewer">×</button>' +
      "</div>" +
      '<div class="lightbox__stage">' +
        '<button type="button" class="lightbox__btn lightbox__prev" aria-label="Previous photo"><span aria-hidden="true">←</span></button>' +
        '<img class="lightbox__img" alt="">' +
        '<button type="button" class="lightbox__btn lightbox__next" aria-label="Next photo"><span aria-hidden="true">→</span></button>' +
      "</div>" +
      '<p class="lightbox__caption"></p>';
    document.body.appendChild(d);

    d.querySelector(".lightbox__close").addEventListener("click", close);
    d.querySelector(".lightbox__prev").addEventListener("click", function () { show(index - 1); });
    d.querySelector(".lightbox__next").addEventListener("click", function () { show(index + 1); });
    d.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); show(index - 1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1); }
    });
    /* a click on the dark area (not on the photo or a button) closes */
    d.addEventListener("click", function (e) {
      if (e.target === d || e.target.classList.contains("lightbox__stage")) close();
    });
    d.addEventListener("close", function () {
      document.documentElement.classList.remove("has-lightbox");
      if (opener && opener.isConnected) opener.focus();
    });
    /* swipe on touch screens */
    var x0 = null;
    d.addEventListener("pointerdown", function (e) { x0 = e.clientX; });
    d.addEventListener("pointerup", function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    });
    return d;
  }

  function show(i) {
    if (!items.length) return;
    index = (i + items.length) % items.length;
    var it = items[index], many = items.length > 1;
    var img = viewer.querySelector(".lightbox__img");
    img.src = it.href;
    img.alt = it.alt;
    viewer.querySelector(".lightbox__caption").textContent = it.caption;
    viewer.querySelector(".lightbox__count").textContent = many ? (index + 1) + " / " + items.length : "";
    viewer.querySelector(".lightbox__prev").hidden = !many;
    viewer.querySelector(".lightbox__next").hidden = !many;
    if (many) { var next = new Image(); next.src = items[(index + 1) % items.length].href; }   /* load the next one early */
  }

  function open(list, link) {
    if (!viewer) viewer = build();
    if (typeof viewer.showModal !== "function") return false;   /* very old browser: just follow the link */
    items = Array.prototype.slice.call(list.querySelectorAll(".gallery__link"))
      .filter(function (a) { return !a.closest("[hidden]"); })
      .map(function (a) {
        var img = a.querySelector("img"), fig = a.closest("figure");
        var cap = fig ? fig.querySelector("figcaption") : null;
        return { link: a, href: a.getAttribute("href"), alt: img ? img.getAttribute("alt") || "" : "", caption: cap ? cap.textContent.trim() : "" };
      });
    var i = items.map(function (x) { return x.link; }).indexOf(link);
    opener = link;
    show(i < 0 ? 0 : i);
    viewer.showModal();
    document.documentElement.classList.add("has-lightbox");
    viewer.querySelector(".lightbox__close").focus();
    return true;
  }

  function close() { if (viewer && viewer.open) viewer.close(); }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-gallery]"), function (list) {
      list.addEventListener("click", function (e) {
        var a = e.target.closest(".gallery__link");
        if (!a || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        if (open(list, a)) e.preventDefault();
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
