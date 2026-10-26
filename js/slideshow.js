/* =====================================================================
   js/slideshow.js — the IIT Kanpur photo slideshow on the home page
   ---------------------------------------------------------------------
   Works on any  <div class="slideshow" data-slideshow data-interval="6">
   that contains  <ul class="slideshow__slides"> <li class="slide">…</li> </ul>

   • The photos change by themselves every data-interval seconds: a soft
     cross-fade while each photo slowly drifts and zooms ("Ken Burns"),
     and its caption rises in. The active dot fills up as time runs.
   • Arrows, dots, swipe and the ← → keys move between photos; the
     slideshow then carries on by itself.
   • The pause button stops it. It also waits while keyboard focus is on
     its buttons, when it is off screen, and in background tabs. (It does
     not stop under the mouse, so it never looks "stuck".)
   • Visitors who ask for reduced motion get a plain cross-fade, without
     the drift and zoom.
   • A photo whose file is missing is dropped automatically.
   • <li class="slide" data-fit="contain"> shows the whole photo over a
     blurred copy of itself (for very wide or tall photos).

   Look of the transition: css/style.css, section 9.1.
   To change the photos, edit index.html (search "PHOTO SLIDESHOW").
   You do not need to edit this file.
   ===================================================================== */

(function () {
  "use strict";

  function makeButton(className, label, html) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = className;
    b.setAttribute("aria-label", label);
    b.innerHTML = html;
    return b;
  }

  function fadeMs(root) {
    var v = getComputedStyle(root).getPropertyValue("--slide-fade").trim();
    var n = parseFloat(v);
    if (!n) return 1400;
    return /ms$/.test(v) ? n : n * 1000;
  }

  function setup(root) {
    var list = root.querySelector(".slideshow__slides");
    if (!list) return;
    var seconds = parseFloat(root.getAttribute("data-interval")) || 6;
    root.style.setProperty("--slide-interval", seconds + "s");
    var slides = [];
    var current = 0;
    var timer = 0;
    var paused = false;          // the pause button
    var hold = false;            // keyboard focus inside
    var onScreen = true;

    /* ---- controls (built here so pages without JavaScript stay clean) ---- */
    var controls = document.createElement("div");
    controls.className = "slideshow__controls";
    var dots = document.createElement("div");
    dots.className = "slideshow__dots";
    var count = document.createElement("p");
    count.className = "slideshow__count";
    count.setAttribute("aria-hidden", "true");
    var buttons = document.createElement("div");
    buttons.className = "slideshow__buttons";
    var prev = makeButton("slideshow__btn", "Previous photo", '<span aria-hidden="true">←</span>');
    var pause = makeButton("slideshow__btn slideshow__btn--pause", "Pause slideshow", "");
    var next = makeButton("slideshow__btn", "Next photo", '<span aria-hidden="true">→</span>');
    buttons.appendChild(prev);
    buttons.appendChild(pause);
    buttons.appendChild(next);
    controls.appendChild(dots);
    controls.appendChild(count);
    controls.appendChild(buttons);
    root.appendChild(controls);

    function pad(n) { return (n < 10 ? "0" : "") + n; }

    /* one dot per photo (rebuilt only when the number of photos changes) */
    function buildDots() {
      dots.innerHTML = "";
      slides.forEach(function (s, i) {
        var d = makeButton("slideshow__dot", "Show photo " + (i + 1), "");
        d.addEventListener("click", function () { go(i); });
        dots.appendChild(d);
      });
    }

    function render() {
      var before = slides.length;
      slides = Array.prototype.slice.call(list.querySelectorAll(".slide"));
      if (!slides.length) { root.hidden = true; return; }
      if (slides.length !== before || dots.children.length !== slides.length) buildDots();
      if (current >= slides.length) current = 0;
      slides.forEach(function (s, i) {
        var on = i === current;
        s.classList.toggle("is-active", on);
        var group = s.querySelector("figure") || s;   // the <li> stays a list item
        group.setAttribute("role", "group");
        group.setAttribute("aria-roledescription", "slide");
        group.setAttribute("aria-label", (i + 1) + " of " + slides.length);
        if (on) s.removeAttribute("aria-hidden"); else s.setAttribute("aria-hidden", "true");
        var d = dots.children[i];
        if (on) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
      });
      count.textContent = pad(current + 1) + " / " + pad(slides.length);
      controls.hidden = slides.length < 2;
      pause.innerHTML = paused ? '<span aria-hidden="true">▶</span>' : '<span aria-hidden="true">❚❚</span>';
      pause.setAttribute("aria-label", paused ? "Play slideshow" : "Pause slideshow");
      list.setAttribute("aria-live", paused ? "polite" : "off");
    }

    function go(n) {
      if (!slides.length) return;
      var from = slides[current];
      current = (n + slides.length) % slides.length;
      if (from && from !== slides[current]) {
        /* the old photo keeps drifting while it fades out */
        from.classList.add("is-leaving");
        clearTimeout(from.leaveTimer);
        from.leaveTimer = setTimeout(function () { from.classList.remove("is-leaving"); }, fadeMs(root) + 100);
      }
      render();
      schedule();
    }

    function running() { return !paused && !hold && onScreen && !document.hidden && slides.length > 1; }

    function schedule() {
      clearTimeout(timer);
      var on = running();
      root.classList.toggle("is-paused", !on);
      /* restart the "time left" fill of the active dot */
      Array.prototype.forEach.call(dots.children, function (d) { d.classList.remove("is-running"); });
      if (!on) return;
      var active = dots.children[current];
      if (active) { void active.offsetWidth; active.classList.add("is-running"); }
      timer = setTimeout(function () { go(current + 1); }, seconds * 1000);
    }

    /* Whole-photo slides get a blurred copy behind them */
    Array.prototype.forEach.call(list.querySelectorAll('.slide[data-fit="contain"]'), function (s) {
      var img = s.querySelector("img");
      if (!img || s.querySelector(".slide__backdrop")) return;
      s.classList.add("slide--contain");
      var bg = img.cloneNode(false);
      bg.className = "slide__backdrop";
      bg.alt = "";
      bg.setAttribute("aria-hidden", "true");
      img.parentNode.insertBefore(bg, img);
    });

    /* Drop a slide whose photo file is missing */
    Array.prototype.forEach.call(list.querySelectorAll(".slide > figure > img:not(.slide__backdrop)"), function (img) {
      function drop() {
        var li = img.closest(".slide");
        if (li && li.parentNode) { li.parentNode.removeChild(li); render(); schedule(); }
      }
      if (img.complete && img.naturalWidth === 0) drop();
      else img.addEventListener("error", drop);
    });

    prev.addEventListener("click", function () { go(current - 1); });
    next.addEventListener("click", function () { go(current + 1); });
    pause.addEventListener("click", function () { paused = !paused; render(); schedule(); });

    /* wait while someone moves through the controls with the keyboard */
    function keyboardFocus(el) { try { return el.matches(":focus-visible"); } catch (e) { return false; } }
    root.addEventListener("focusin", function (e) { if (e.target !== pause && keyboardFocus(e.target)) { hold = true; schedule(); } });
    root.addEventListener("focusout", function (e) { if (!root.contains(e.relatedTarget)) { hold = false; schedule(); } });
    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); go(current - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); go(current + 1); }
    });

    /* Swipe on touch screens */
    var startX = null;
    list.addEventListener("pointerdown", function (e) { startX = e.clientX; });
    list.addEventListener("pointerup", function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1));
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        schedule();
      }, { threshold: 0.25 }).observe(root);
    }
    document.addEventListener("visibilitychange", schedule);

    /* start on the slide marked is-active (or the first one) */
    var all = Array.prototype.slice.call(list.querySelectorAll(".slide"));
    var marked = all.findIndex ? all.findIndex(function (s) { return s.classList.contains("is-active"); }) : 0;
    current = marked > 0 ? marked : 0;
    root.classList.add("is-ready");
    render();
    schedule();
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-slideshow]"), setup);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
