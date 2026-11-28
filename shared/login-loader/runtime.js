/*
 * Hexpertify sign-in loader for the panels (apps/client, apps/consultant, apps/admin).
 *
 * The same scene as the website's loading screen (styles: apps/web/app/styles/loader.css), without React, so it
 * can be inlined into each panel's index.html (see vite-plugin.mjs) and paint before the panel's JavaScript
 * has even downloaded. That keeps it on screen, without a white flash, across the full page load from the login
 * page into a panel.
 *
 *   window.hxLoader.start()  login page, right after a successful sign-in, before leaving for the panel
 *   window.hxLoader.done()   the panel, once the server has confirmed the session (or the login page, on mount)
 *
 * The ring keeps counting from where the login page left it, then runs to 100 and the screen wipes away.
 */
(function () {
  if (window.hxLoader) return;

  var KEY = "hx-login-loader";
  var FONT_ID = "hx-loader-font";
  var FONT_HREF = "https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap";
  /** Shown for at least this long from the moment of sign-in, so the animation reads */
  var MIN_MS = 1800;
  /** Gives up and wipes away if no panel says it is ready by then */
  var MAX_MS = 15000;
  var EXIT_MS = 1350;
  /** The Hexpertify logo, cropped to its edges (served by the website, same origin as the panels) */
  var LOGO_SRC = "/hexpertify-logo-tight.png";

  var root = document.documentElement;
  var el = null;
  var startedAt = 0;
  var shown = 0;
  var ready = false;
  var leaving = false;
  var raf = 0;
  var clockTimer = 0;
  var giveUpTimer = 0;
  var previousOverflow = "";
  var reduceMotion = false;

  function readFlag() {
    try {
      var data = JSON.parse(sessionStorage.getItem(KEY) || "null");
      return data && typeof data.t === "number" ? data : null;
    } catch (e) {
      return null;
    }
  }
  function writeFlag(t) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ t: t }));
    } catch (e) {}
  }
  function clearFlag() {
    try {
      sessionStorage.removeItem(KEY);
    } catch (e) {}
  }

  function ensureFont() {
    if (document.getElementById(FONT_ID)) return;
    var link = document.createElement("link");
    link.id = FONT_ID;
    link.rel = "stylesheet";
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }

  function markup() {
    return (
      '<span class="sr-only" data-hxl="sr">Signing you in to Hexpertify</span>' +
      '<div class="hxl-blobs" aria-hidden="true"><span class="hxl-blob hxl-blob-a"></span><span class="hxl-blob hxl-blob-b"></span><span class="hxl-blob hxl-blob-c"></span></div>' +
      '<div class="hxl-top hxl-fade" aria-hidden="true"><span class="hxl-mono">H<i>/</i>X</span><span class="hxl-clock" data-hxl="clock"></span>' +
      '<span class="hxl-nav">Signing<i>/</i>In</span><span class="hxl-dot"></span></div>' +
      '<span class="hxl-side hxl-side-l hxl-fade" aria-hidden="true">hexpertify &copy;' + new Date().getFullYear() + "</span>" +
      '<span class="hxl-side hxl-side-r hxl-fade" aria-hidden="true" data-hxl="side">signing in</span>' +
      '<div class="hxl-center" aria-hidden="true"><div class="hxl-word"><span class="hxl-logo">' +
      '<img src="' + LOGO_SRC + '" alt="" width="652" height="199" decoding="async" draggable="false"></span></div>' +
      '<p class="hxl-meta hxl-fade">Account. Verified<i>/</i>Panel. Opening</p>' +
      '<div class="hxl-row hxl-fade"><p>Getting your Hexpertify workspace ready. This only takes a moment.</p>' +
      '<span class="hxl-pill" data-hxl="pill"><span data-hxl="pill-text">Loading</span>' +
      '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 8 8 2M3.5 2H8v4.5"/></svg></span></div></div>' +
      '<div class="hxl-counter" aria-hidden="true"><svg viewBox="0 0 100 100"><circle class="hxl-ring-track" cx="50" cy="50" r="49"/>' +
      '<circle class="hxl-ring-arc" data-hxl="arc" cx="50" cy="50" r="49" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" transform="rotate(-90 50 50)"/>' +
      '<line class="hxl-ring-cross" x1="24" y1="76" x2="76" y2="24"/></svg>' +
      '<span class="hxl-counter-label top">Loading</span><span class="hxl-num now" data-hxl="num">00</span>' +
      '<span class="hxl-num total">100</span><span class="hxl-counter-label bottom">Percent</span></div>' +
      '<p class="hxl-hello hxl-fade" aria-hidden="true">Welcome to Hexpertify. Verified experts, one call away, whenever you need them.</p>' +
      '<div class="hxl-badge" aria-hidden="true"><div class="hxl-cube"><span class="f1"></span><span class="f2"></span><span class="f3"></span>' +
      '<span class="f4"></span><span class="f5"></span><span class="f6"></span></div></div>'
    );
  }

  function part(name) {
    return el ? el.querySelector('[data-hxl="' + name + '"]') : null;
  }

  function tickClock() {
    var clock = part("clock");
    if (!clock) return;
    try {
      clock.textContent = new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZoneName: "short",
      })
        .format(new Date())
        .toUpperCase();
    } catch (e) {}
  }

  function render(pct) {
    var arc = part("arc");
    var num = part("num");
    if (arc) arc.setAttribute("stroke-dashoffset", String(100 - pct));
    if (num) num.textContent = (pct < 10 ? "0" : "") + pct;
    if (pct >= 100) {
      var pill = part("pill");
      var pillText = part("pill-text");
      var side = part("side");
      var sr = part("sr");
      if (pill) pill.className = "hxl-pill is-ready";
      if (pillText) pillText.textContent = "Enter";
      if (side) side.textContent = "welcome";
      if (sr) sr.textContent = "Signed in. Opening your panel.";
    }
  }

  /** Mounts the scene. `resume`: carried over from the page before, so it skips the entry animation */
  function mount(t, resume) {
    if (el || !document.body) return;
    startedAt = t;
    reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    ensureFont();
    root.setAttribute("data-hx-intro", "show");

    var wrapper = document.createElement("div");
    wrapper.className = "hxl-intro";
    el = document.createElement("div");
    el.className = "hxl hxl-signin" + (resume ? " hxl-resume" : "");
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    // Drifting blobs and the cube carry on from where they were instead of jumping back
    el.style.setProperty("--hxl-t", "-" + Math.max(0, Date.now() - t) + "ms");
    el.innerHTML = markup();
    wrapper.appendChild(el);
    document.body.insertBefore(wrapper, document.body.firstChild);

    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    tickClock();
    clockTimer = window.setInterval(tickClock, 15000);
    giveUpTimer = window.setTimeout(done, Math.max(2000, MAX_MS - (Date.now() - t)));

    var last = performance.now();
    var loop = function (now) {
      var dt = now - last;
      last = now;
      var elapsed = Date.now() - startedAt;
      var finishing = ready && elapsed >= (reduceMotion ? 500 : MIN_MS);
      // Creeps towards 92% while the panel loads, then runs to 100% once it is ready
      var target = finishing ? 100 : 92 * (1 - Math.exp(-elapsed / 1400));
      if (shown === 0 && resume) shown = target;
      shown += (target - shown) * (1 - Math.pow(finishing ? 0.86 : 0.9, dt / 16.7));
      if (finishing && shown > 99.5) {
        render(100);
        leave();
        return;
      }
      render(Math.round(shown));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  function leave() {
    if (leaving || !el) return;
    leaving = true;
    clearFlag();
    window.clearTimeout(giveUpTimer);
    el.className += " is-leaving";
    window.setTimeout(function () {
      window.clearInterval(clockTimer);
      cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
      root.setAttribute("data-hx-intro", "done");
      if (el && el.parentNode && el.parentNode.parentNode) el.parentNode.parentNode.removeChild(el.parentNode);
      el = null;
    }, reduceMotion ? 350 : EXIT_MS);
  }

  function start() {
    var t = Date.now();
    writeFlag(t);
    mount(t, false);
  }

  function done() {
    if (!el) {
      clearFlag();
      return;
    }
    ready = true;
  }

  window.hxLoader = { start: start, done: done };

  // Back button to the login page, restored from the browser's page cache with the loader frozen on it
  window.addEventListener("pageshow", function (event) {
    if (event.persisted && el) {
      startedAt = 0;
      done();
    }
  });

  // Arriving from the login page: pick the scene up straight away, before the panel's own code loads
  var flag = readFlag();
  if (flag) {
    var age = Date.now() - flag.t;
    if (age > 3 * 60 * 1000) {
      clearFlag();
    } else {
      // Back from a longer detour (e.g. Google's sign-in page): count up again from near the start
      var fresh = age > 10000;
      var t = fresh ? Date.now() - 600 : flag.t;
      if (fresh) writeFlag(t);
      mount(t, !fresh);
    }
  }
})();
