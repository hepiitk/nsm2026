/* =====================================================================
   js/string-animation.js — THE STRING ANIMATION (home page hero)
   ---------------------------------------------------------------------
   A closed string sweeps out a tube in spacetime: its worldsheet Σ.
   Each ring is the string at one instant τ, vibrating as a sum of a few
   normal modes (n = 2, 3, 5). One ring, drawn in the accent colour,
   travels along τ with a small "hot spot" on it.

   WHERE IT APPEARS   index.html → look for  data-string-animation
   SIZE / POSITION    css/style.css → section "4. STRING ANIMATION"
                      (variables --string-size, --string-shift-x/-y)
   COLOURS            css/style.css → same section (--string-line,
                      --string-accent …). Add the class
                      "string-figure--night" to the figure for the
                      original dark "night sky" look.
   SPEED / LABELS     the CONFIG block just below.

   The drawing pauses when it is off screen or the tab is hidden, and
   stays still for visitors who ask their system to reduce motion.
   ===================================================================== */

(function () {
  "use strict";

  /* ----------------------------- CONFIG ----------------------------- */
  var CONFIG = {
    travelSeconds: 22,     // time for the accent string to travel along τ
    vibration: 1,          // 1 = original speed of the ring vibrations; 0.5 = half speed
    frameEveryMs: 40,      // redraw interval (40 ms ≈ 25 frames per second)
    showLabels: true,      // τ, Σ and Xμ(σ, τ) labels
    showMarks: true        // faint "+" registration marks behind the drawing
  };
  /* ------------------------------------------------------------------ */

  var SVGNS = "http://www.w3.org/2000/svg";
  var TAU = Math.PI * 2;

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function n1(x) { return Math.round(x * 10) / 10; }

  function worldsheet(svg) {
    var P = [[70, 1100], [720, 870], [250, 380], [910, -100]];   // spine (cubic Bézier)
    var LOOPS = 15, SIG = 64, LONG = 18, TS = 44, K = 0.36;
    var V = CONFIG.vibration;

    function bez(u) {
      var v = 1 - u;
      return [
        v * v * v * P[0][0] + 3 * v * v * u * P[1][0] + 3 * v * u * u * P[2][0] + u * u * u * P[3][0],
        v * v * v * P[0][1] + 3 * v * v * u * P[1][1] + 3 * v * u * u * P[2][1] + u * u * u * P[3][1]
      ];
    }
    function dbez(u) {
      var v = 1 - u;
      return [
        3 * v * v * (P[1][0] - P[0][0]) + 6 * v * u * (P[2][0] - P[1][0]) + 3 * u * u * (P[3][0] - P[2][0]),
        3 * v * v * (P[1][1] - P[0][1]) + 6 * v * u * (P[2][1] - P[1][1]) + 3 * u * u * (P[3][1] - P[2][1])
      ];
    }
    function radius(tau) { return 150 * (1.12 - 0.36 * Math.sin(Math.PI * tau)); }

    function frame(tau) {
      var b = bez(tau), d = dbez(tau), l = Math.hypot(d[0], d[1]);
      var T = [d[0] / l, d[1] / l];
      return { b: b, T: T, N: [-T[1], T[0]], r: radius(tau) };
    }

    function point(sigma, tau, t, fr) {
      fr = fr || frame(tau);
      var delta =
        0.060 * Math.cos(2 * sigma + 0.7) * Math.cos(0.00090 * V * t + 3 * tau) +
        0.045 * Math.cos(3 * sigma + 1.9) * Math.cos(0.00140 * V * t + 5 * tau + 1) +
        0.028 * Math.cos(5 * sigma + 0.3) * Math.cos(0.00210 * V * t + 7 * tau + 2);
      var rr = fr.r * (1 + delta), c = Math.cos(sigma), s = Math.sin(sigma);
      return [fr.b[0] + fr.N[0] * rr * c + fr.T[0] * rr * K * s, fr.b[1] + fr.N[1] * rr * c + fr.T[1] * rr * K * s];
    }

    function arc(tau, from, to, t, steps) {
      var fr = frame(tau), d = "";
      for (var i = 0; i <= steps; i++) {
        var p = point(from + ((to - from) * i) / steps, tau, t, fr);
        d += (i ? "L" : "M") + n1(p[0]) + " " + n1(p[1]);
      }
      return d;
    }

    function el(name, attrs, parent) {
      var e = document.createElementNS(SVGNS, name);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(e);
      return e;
    }

    svg.textContent = "";
    var i;

    /* registration marks, like a star chart */
    if (CONFIG.showMarks) {
      var marks = el("g", { "class": "sa-marks" });
      for (var gx = 125; gx < 1000; gx += 125) {
        for (var gy = 125; gy < 1000; gy += 125) {
          el("path", { d: "M" + (gx - 4) + " " + gy + "H" + (gx + 4) + "M" + gx + " " + (gy - 4) + "V" + (gy + 4) }, marks);
        }
      }
    }

    var gBack = el("g", { "class": "sa-back" });
    var gFront = el("g", { "class": "sa-front" });
    var longs = [], loopBack = [], loopFront = [];

    for (i = 0; i < LONG; i++) {
      var sg = ((i + 0.5) / LONG) * TAU;
      var front = Math.sin(sg) < 0;
      longs.push({ path: el("path", { "class": front ? "sa-long" : "sa-long-back" }, front ? gFront : gBack), sigma: sg });
    }
    for (i = 0; i < LOOPS; i++) {
      var tau = i / (LOOPS - 1);
      loopBack.push({ path: el("path", { "class": "sa-ring-back" }, gBack), tau: tau });
      loopFront.push({ path: el("path", { "class": "sa-ring" }, gFront), tau: tau });
    }

    /* the travelling string */
    var accentBack = el("path", { "class": "sa-accent-back" });
    var accentFront = el("path", { "class": "sa-accent" });
    var hot = el("circle", { r: 4.5, "class": "sa-hot" });
    var tag = null;

    if (CONFIG.showLabels) {
      tag = el("text", { "class": "sa-tag" });
      tag.textContent = "X";
      el("tspan", { dy: "-6", "font-size": "11" }, tag).textContent = "μ";
      el("tspan", { dy: "6" }, tag).textContent = "(σ, τ)";

      /* τ arrow beside the tube */
      var f1 = frame(0.30), f2 = frame(0.47), off = 1.55;
      var a1 = [f1.b[0] + f1.N[0] * f1.r * off, f1.b[1] + f1.N[1] * f1.r * off];
      var a2 = [f2.b[0] + f2.N[0] * f2.r * off, f2.b[1] + f2.N[1] * f2.r * off];
      el("path", { d: "M" + n1(a1[0]) + " " + n1(a1[1]) + "L" + n1(a2[0]) + " " + n1(a2[1]), "class": "sa-guide" });
      var ang = Math.atan2(a2[1] - a1[1], a2[0] - a1[0]);
      el("path", {
        d: "M" + n1(a2[0] - 12 * Math.cos(ang - 0.4)) + " " + n1(a2[1] - 12 * Math.sin(ang - 0.4)) +
          "L" + n1(a2[0]) + " " + n1(a2[1]) +
          "L" + n1(a2[0] - 12 * Math.cos(ang + 0.4)) + " " + n1(a2[1] - 12 * Math.sin(ang + 0.4)),
        "class": "sa-guide"
      });
      el("text", { x: n1(a2[0] + 14), y: n1(a2[1] + 6), "class": "sa-label" }).textContent = "τ";

      /* (The fixed "σ" arc that used to sit across the top of the tube was
         removed in October 2026: it did not move with the rings.) */

      /* Σ, the worldsheet */
      var fsig = frame(0.16);
      el("text", {
        x: n1(fsig.b[0] + fsig.N[0] * fsig.r * 1.45),
        y: n1(fsig.b[1] + fsig.N[1] * fsig.r * 1.45),
        "class": "sa-label sa-label-big"
      }).textContent = "Σ";
    }

    function draw(t) {
      var j, k, d;
      for (j = 0; j < LOOPS; j++) {
        loopFront[j].path.setAttribute("d", arc(loopFront[j].tau, Math.PI, TAU, t, SIG / 2));
        loopBack[j].path.setAttribute("d", arc(loopBack[j].tau, 0, Math.PI, t, SIG / 2));
      }
      for (j = 0; j < longs.length; j++) {
        d = "";
        for (k = 0; k <= TS; k++) {
          var p = point(longs[j].sigma, k / TS, t);
          d += (k ? "L" : "M") + n1(p[0]) + " " + n1(p[1]);
        }
        longs[j].path.setAttribute("d", d);
      }
      /* the accent string fades in at the start of its journey and out at the end */
      var still = reducedMotion();
      var phase = still ? 0.62 : (t / (CONFIG.travelSeconds * 1000)) % 1;
      var te = 0.05 + 0.9 * phase;
      var op = still ? 1 : Math.min(1, Math.sin(Math.PI * phase) * 1.6);
      accentFront.setAttribute("d", arc(te, Math.PI, TAU, t, SIG));
      accentBack.setAttribute("d", arc(te, 0, Math.PI, t, SIG));
      accentFront.style.opacity = op;
      accentBack.style.opacity = op * 0.5;
      var hp = point(Math.PI * 1.5, te, t);
      hot.setAttribute("cx", n1(hp[0]));
      hot.setAttribute("cy", n1(hp[1]));
      hot.style.opacity = op;
      if (tag) {
        var lp = point(Math.PI * 1.02, te, t);
        tag.setAttribute("x", n1(lp[0] + 16));
        tag.setAttribute("y", n1(lp[1] + 4));
        tag.style.opacity = op;
      }
    }

    draw(0);
    if (reducedMotion()) return;

    var running = false, raf = 0, last = 0, start = performance.now(), inView = true;
    function loop(now) {
      if (!running) return;
      if (now - last > CONFIG.frameEveryMs) { draw(now - start); last = now; }
      raf = requestAnimationFrame(loop);
    }
    function play() { if (!running) { running = true; raf = requestAnimationFrame(loop); } }
    function pause() { running = false; cancelAnimationFrame(raf); }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          inView = e.isIntersecting;
          if (inView && !document.hidden) play(); else pause();
        });
      }).observe(svg);
    } else {
      play();
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) pause(); else if (inView) play();
    });
  }

  /* Start every <svg data-string-animation> on the page */
  function init() {
    var svgs = document.querySelectorAll("svg[data-string-animation]");
    for (var i = 0; i < svgs.length; i++) worldsheet(svgs[i]);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
