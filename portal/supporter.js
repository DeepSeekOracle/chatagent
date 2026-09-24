/* LYGO portal — the one-time entrance and the supporter gate.
   Two jobs, one owner:
     1. the intro that covers the portal on a first visit: LYGO-branded matrix, the terms of the page,
        and one deliberate click to enter (the click also marks the intro as seen for this browser);
     2. the supporter code: a monthly-rotating code from the steward's Patreon post turns the donation
        reminders off in the browser where it is entered.
   What this check is, honestly: the code is verified INSIDE the browser against a SHA-256 stored in
   this file, so it proves "you were given this month's code" and nothing more. It is a thank-you
   gate, not a licence and not a locked door — every part of the portal works without it. It cannot be
   DRM: anything the browser can check, a determined visitor can bypass. Monthly rotation is what
   keeps a shared code from spreading too far, and the grace window (until the 5th of the next month)
   is what keeps an honest supporter from being locked out on rotation day.
   The code itself is never stored: localStorage keeps only {label, until, at}, so a shared machine
   does not carry the plaintext around. */
(function (g) {
  "use strict";

  var INTRO_STORE = "lygo_portal_intro";
  var UNLOCK_STORE = "lygo_portal_supporter";
  var INTRO_VERSION = "2026-09-24";        // bump to show the entrance again after a real redesign
  var REMINDER_URL = "https://www.patreon.com/Excavationpro";
  var DAY = 24 * 60 * 60 * 1000;

  /* Accepted codes, as SHA-256 of the normalized code (uppercase, A-Z0-9 only).
     Written by portal/supporter/rotate.py — do not hand-edit: run the tool, so the plaintext it
     prints is the only copy of the code. `until` is inclusive; `permanent` never expires. */
  /* @supporter-hashes:start */
  var CODE_HASHES = [
    {"label": "2026-08", "sha256": "5d29c090b2e2ee7796cc7cbbffa78ec50544cc1e45df8e9224b557704fcf0f5d", "until": "2026-09-05", "note": "rotated out"},
    {"label": "2026-09", "sha256": "31f34f39b74ad94630e9b2c8ebceb64660ea5546b83d9f88447523eb73498990", "until": "2026-10-05", "note": "this month's code"},
    {"label": "steward", "sha256": "9dc55ba3412edfbaedd8c62140cb23168bb613934983f8c4b7337f36f3026e16", "until": null, "permanent": true, "note": "steward: never expires \u2014 keep the plaintext private"}
  ];
  /* @supporter-hashes:end */

  var introEl = null;
  var panelEl = null;
  var lastFocus = null;
  var rain = null;

  function el(id) { return document.getElementById(id); }
  function store(key) { try { return g.localStorage.getItem(key); } catch (_) { return null; } }
  function save(key, value) { try { g.localStorage.setItem(key, String(value)); } catch (_) {} }
  function drop(key) { try { g.localStorage.removeItem(key); } catch (_) {} }

  function normalize(code) { return String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }

  function endOfDay(day) {
    var d = new Date(String(day) + "T23:59:59");
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  async function sha256hex(text) {
    if (!g.crypto || !g.crypto.subtle) throw new Error("no_webcrypto");
    var buf = await g.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(function (b) {
      return ("0" + b.toString(16)).slice(-2);
    }).join("");
  }

  // The stored record: what was unlocked, until when, and when. Never the code.
  function record() {
    var raw = store(UNLOCK_STORE);
    if (!raw) return null;
    try {
      var r = JSON.parse(raw);
      return (r && typeof r === "object") ? r : null;
    } catch (_) { return null; }
  }

  function state() {
    var r = record();
    if (!r) return { unlocked: false, label: "", until: "", lapsed: false };
    var live = !r.until || Date.now() <= endOfDay(r.until);
    return { unlocked: live, label: String(r.label || ""), until: String(r.until || ""), lapsed: !live && !!r.until };
  }

  function announce() {
    try {
      document.dispatchEvent(new CustomEvent("lygo-supporter", { detail: state() }));
    } catch (_) {}
    paintChip();
  }

  function paintChip() {
    var chip = el("supporterChip");
    if (!chip) return;
    var s = state();
    chip.hidden = !s.unlocked;
    chip.textContent = s.until ? ("⚿ SUPPORTER · through " + s.until) : "⚿ SUPPORTER";
    chip.title = "A supporter code is active in this browser: the donation reminders stay off" +
      (s.until ? (" through " + s.until + ". After that, get the new month's code.") : ".")
    ;
  }

  /* ---- the code ---------------------------------------------------------------- */

  async function tryCode(code) {
    var n = normalize(code);
    if (n.length < 12) return { ok: false, why: "That looks too short. The code looks like LYGO-2609-XXXX-XXXX." };
    var h;
    try {
      h = await sha256hex(n);
    } catch (_) {
      return { ok: false, why: "This browser will not hash anything outside a secure page (https). The live portal is https, so open chatagent.ca/portal/ and try there." };
    }
    var hit = null;
    for (var i = 0; i < CODE_HASHES.length; i++) {
      if (CODE_HASHES[i].sha256 === h) { hit = CODE_HASHES[i]; break; }
    }
    if (!hit) {
      return { ok: false, why: "That code is not one of this portal's codes. Codes rotate every month — the current one is on the Patreon post linked below." };
    }
    if (!hit.permanent && hit.until && Date.now() > endOfDay(hit.until)) {
      return { ok: false, why: "That code was valid through " + hit.until + " and has been rotated out. The current month's code is on the Patreon post." };
    }
    save(UNLOCK_STORE, JSON.stringify({
      label: hit.label, until: hit.permanent ? "" : (hit.until || ""), at: new Date().toISOString(),
    }));
    announce();
    return { ok: true, label: hit.label, until: hit.permanent ? "" : (hit.until || "") };
  }

  function relock() {
    drop(UNLOCK_STORE);
    announce();
  }

  /* ---- the supporter panel ------------------------------------------------------ */

  function panelOpen() { return panelEl && !panelEl.hidden; }

  function paintPanel(msg) {
    if (!panelEl) return;
    var s = state();
    var st = el("supState");
    if (st) {
      st.textContent = s.unlocked
        ? ("Active in this browser" + (s.label ? " · code " + s.label : "") + (s.until ? " · through " + s.until : " · permanent") +
           (s.until ? " — after that the reminders come back and this month's code is on Patreon." : ""))
        : (s.lapsed
            ? ("The code from " + s.label + " was valid through " + s.until + " and has lapsed, so the reminders are back. Enter the new month's code to switch them off again.")
            : "No supporter code in this browser yet. The portal works the same without one — the code only stops the donation reminders.");
    }
    var go = el("supGo");
    if (go) go.hidden = s.unlocked;
    var rl = el("supRelock");
    if (rl) rl.hidden = !s.unlocked;
    var inp = el("supCode");
    if (inp && s.unlocked) inp.value = "";
    var m = el("supMsg");
    if (m) m.textContent = msg || "";
  }

  function openPanel(msg) {
    if (!panelEl) return;
    lastFocus = document.activeElement;
    panelEl.hidden = false;
    panelEl.classList.add("is-open");
    document.documentElement.classList.add("sup-modal");
    paintPanel(msg);
    var inp = el("supCode");
    if (inp) inp.focus();
  }

  function closePanel() {
    if (!panelEl) return;
    panelEl.hidden = true;
    panelEl.classList.remove("is-open");
    document.documentElement.classList.remove("sup-modal");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  async function submitCode() {
    var inp = el("supCode");
    var msg = el("supMsg");
    if (!inp) return;
    if (msg) msg.textContent = "Checking…";
    var r = await tryCode(inp.value);
    if (r.ok) {
      inp.value = "";
      paintPanel("Unlocked" + (r.until ? (" — the reminders stay off in this browser through " + r.until + ".") : " — permanently, for this browser.") + " Thank you for keeping the lattice lit.");
    } else {
      paintPanel(r.why);
    }
  }

  /* ---- the entrance ------------------------------------------------------------ */

  function introDue() {
    var skip = /[?&]intro=(0|off|skip)\b/.test(location.search);
    if (skip) return false;
    return store(INTRO_STORE) !== INTRO_VERSION;
  }

  function introSeen() { save(INTRO_STORE, INTRO_VERSION); }

  function reducedMotion() {
    return !!(g.matchMedia && g.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function startRain() {
    var canvas = el("introCanvas");
    if (!canvas || rain) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var GLYPHS = "Δ9Φ963ΛΞΣΩ01⊹⟡✕⌘アカサタナハマヤラワ";
    var size = 16;
    var drops = [];
    var raf = 0, last = 0, still = reducedMotion();

    function resize() {
      canvas.width = canvas.clientWidth * Math.min(g.devicePixelRatio || 1, 2);
      canvas.height = canvas.clientHeight * Math.min(g.devicePixelRatio || 1, 2);
      var cols = Math.ceil(canvas.width / size);
      drops = [];
      for (var i = 0; i < cols; i++) drops.push({ y: Math.random() * canvas.height, sp: 0.6 + Math.random() * 1.8 });
      if (still) draw(true);                    // the still backdrop survives a resize or a rotation
    }

    function draw(advance) {
      ctx.fillStyle = "rgba(6, 5, 4, 0.16)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = size + "px 'IBM Plex Mono', monospace";
      for (var i = 0; i < drops.length; i++) {
        var d = drops[i];
        var ch = GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
        var head = Math.random() < 0.06;
        ctx.fillStyle = head ? "rgba(240, 226, 190, 0.95)" : "rgba(224, 179, 106, " + (0.28 + Math.random() * 0.5) + ")";
        ctx.fillText(ch, i * size, d.y);
        if (advance) {
          d.y += d.sp * size * 0.6;
          if (d.y > canvas.height + size) { d.y = -size * (1 + Math.random() * 12); d.sp = 0.6 + Math.random() * 1.8; }
        }
      }
    }

    function frame(t) {
      raf = g.requestAnimationFrame(frame);
      if (t - last < 55) return;                // ~18 fps: readable, and cheap on a phone
      last = t;
      draw(true);
    }

    resize();
    g.addEventListener("resize", resize);
    if (still) {                                // no animation to run: the frame above is the entrance
      rain = { stop: function () {}, still: true };
      return;
    }
    rain = { stop: function () { if (raf) g.cancelAnimationFrame(raf); raf = 0; } };
    raf = g.requestAnimationFrame(frame);
  }

  function stopRain() { if (rain) { rain.stop(); rain = null; } }

  var LINES = [
    "> Δ9Φ963 // LYGO LATTICE · PUBLIC GATE",
    "> handshake ......... ok",
    "> kernel eggs ....... sealed (consent required)",
    "> visitor key ....... stays in this tab, never sent to chatagent.ca",
    "> P0 gate ........... armed",
    "> you are clear to enter."
  ];

  function typeLines(done) {
    var box = el("introTerm");
    if (!box) { done(); return; }
    box.textContent = "";
    if (reducedMotion() || !LINES.length) {
      box.textContent = LINES.join("\n");
      done();
      return;
    }
    var i = 0, j = 0, text = "";
    (function step() {
      if (i >= LINES.length) { done(); return; }
      text = LINES[i].slice(0, ++j);
      box.textContent = LINES.slice(0, i).join("\n") + (i ? "\n" : "") + text;
      if (j >= LINES[i].length) { i++; j = 0; g.setTimeout(step, 190); }
      else { g.setTimeout(step, 16); }
    })();
  }

  function openIntro() {
    if (!introEl) return;
    lastFocus = document.activeElement;
    introEl.hidden = false;
    introEl.classList.add("is-open");
    document.documentElement.classList.add("sup-modal");
    startRain();
    var ctas = el("introEnter");
    if (ctas) { ctas.disabled = true; ctas.textContent = "Entering…"; }
    typeLines(function () {
      if (ctas) { ctas.disabled = false; ctas.textContent = "Enter the portal →"; ctas.focus(); }
    });
    var sup = el("introSupporter");
    if (sup) {
      var s = state();
      sup.hidden = !s.unlocked;
      if (s.unlocked) sup.textContent = "⚿ Supporter access is active in this browser — the donation reminders are off" + (s.until ? (" through " + s.until) : "") + ".";
    }
  }

  function closeIntro() {
    if (!introEl) return;
    introSeen();
    introEl.hidden = true;
    introEl.classList.remove("is-open");
    document.documentElement.classList.remove("sup-modal");
    stopRain();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    // A visitor who entered from the intro should not be fighting a reminder seconds later.
    try { document.dispatchEvent(new CustomEvent("lygo-intro-entered")); } catch (_) {}
  }

  function trapTab(e, root) {
    if (e.key !== "Tab" || !root) return;
    var list = root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])');
    var vis = Array.prototype.filter.call(list, function (n) { return n.offsetParent !== null || n === document.activeElement; });
    if (!vis.length) return;
    var first = vis[0], last = vis[vis.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---- wiring ------------------------------------------------------------------ */

  function boot() {
    introEl = el("introLayer");
    panelEl = el("supporterLayer");
    paintChip();

    if (introEl && introDue()) openIntro();
    else if (introEl) { introEl.hidden = true; introEl.classList.remove("is-open"); }

    var enter = el("introEnter");
    if (enter) enter.addEventListener("click", closeIntro);

    var toCode = el("introCode");
    if (toCode) toCode.addEventListener("click", function () { closeIntro(); openPanel(); });

    var guide = el("introGuide");
    if (guide) guide.addEventListener("click", closeIntro);

    ["supporterOpen", "supporterOpenFoot"].forEach(function (id) {
      var b = el(id);
      if (b) b.addEventListener("click", function () { openPanel(); });
    });

    var go = el("supGo");
    if (go) go.addEventListener("click", submitCode);

    var inp = el("supCode");
    if (inp) inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); submitCode(); } });

    var rl = el("supRelock");
    if (rl) rl.addEventListener("click", function () { relock(); paintPanel("Locked again — the reminders resume in this browser."); });

    var cl = el("supClose");
    if (cl) cl.addEventListener("click", closePanel);

    // The donor card is where a supporter looks first: give it a door into the panel.
    var du = el("donateUnlock");
    if (du) du.addEventListener("click", function () {
      try { document.dispatchEvent(new CustomEvent("lygo-portal-close-donate")); } catch (_) {}
      openPanel();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (panelOpen()) { e.preventDefault(); closePanel(); return; }
        if (introEl && !introEl.hidden) { e.preventDefault(); closeIntro(); return; }
      }
      if (panelOpen()) trapTab(e, panelEl);
      else if (introEl && !introEl.hidden) trapTab(e, introEl);
    });

    if (panelEl) panelEl.addEventListener("click", function (e) { if (e.target === panelEl) closePanel(); });

    document.addEventListener("lygo-supporter", function () { paintPanel(); });
  }

  g.LYGO_SUPPORTER = {
    version: INTRO_VERSION,
    unlocked: function () { return state().unlocked; },
    state: state,
    unlock: tryCode,            // async (code) -> { ok, why?, label?, until? }
    relock: relock,
    openPanel: openPanel,
    entries: function () { return CODE_HASHES.map(function (r) { return r.label; }); },
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
