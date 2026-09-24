/* LYGO games — the donation gate and the supporter code.
   The same system as the portal, byte-for-byte the same code list and the same check:
     * a donation reminder every ten minutes, pointing at PayPal or at the Patreon post;
     * a Supporter access row at the bottom of the game's menu where a monthly code from that
       Patreon post switches the reminders off in this browser;
     * the unlock is stored under the same key the portal uses (lygo_portal_supporter), so one
       code quiets the whole site — enter it in a game or in the portal, either way.
   What this check is, honestly: the code is verified inside the browser against a SHA-256 in this
   file, so it proves "you were given this month's code" and nothing more. It is a thank-you gate,
   not a licence and not a locked door: every game plays exactly the same without it. It cannot be
   DRM — anything a browser can check, a determined visitor can bypass. Monthly rotation is what
   keeps a shared code from spreading, and the grace window (codes run to the 5th) keeps an honest
   supporter from being locked out on rotation day. The plaintext code is never stored: localStorage
   keeps only {label, until, at}.
   Generated table: written by portal/supporter/rotate.py. Do not hand-edit — run the tool. */
(function (g) {
  "use strict";

  var UNLOCK_STORE = "lygo_portal_supporter";
  var GATE_VERSION = "2026-09-24";
  var NAG_MS = 10 * 60 * 1000;            // a reminder every ten minutes
  var PATREON = "https://www.patreon.com/Excavationpro/posts/chatagent-ca-api-170485961";
  var PAYPAL = "https://www.paypal.com/paypalme/ExcavationPro";

  /* @supporter-hashes:start */
  var CODE_HASHES = [
    {"label": "2026-08", "sha256": "5d29c090b2e2ee7796cc7cbbffa78ec50544cc1e45df8e9224b557704fcf0f5d", "until": "2026-09-05", "note": "rotated out"},
    {"label": "2026-09", "sha256": "31f34f39b74ad94630e9b2c8ebceb64660ea5546b83d9f88447523eb73498990", "until": "2026-10-05", "note": "this month's code"},
    {"label": "steward", "sha256": "9dc55ba3412edfbaedd8c62140cb23168bb613934983f8c4b7337f36f3026e16", "until": null, "permanent": true, "note": "steward: never expires \u2014 keep the plaintext private"},
    {"label": "2026-10", "sha256": "317714cd0c62c304d7eed6950347d44c1a8cf1f5588c098f41034cf9715ddd4f", "until": "2026-11-05", "note": "monthly rotation"},
    {"label": "2026-11", "sha256": "44cfbab3d9f3cb32c9c0164f14b0816af30be6c2b2958e4a7f47c16d011e354c", "until": "2026-12-05", "note": "monthly rotation"},
    {"label": "2026-12", "sha256": "4bba660370693a8c8ea242d17636d75321aa8f34819751214e76492babc37e76", "until": "2027-01-05", "note": "monthly rotation"},
    {"label": "2027-01", "sha256": "ff580f4a38fbf99c778b6bd1540913b716319cda4a9ab1b1d8cddc183920d3f9", "until": "2027-02-05", "note": "monthly rotation"},
    {"label": "2027-02", "sha256": "8a2b17eb5d47f99ac31393749a89e3653c77e34e35bc9125ae0a88d8e87c1844", "until": "2027-03-05", "note": "monthly rotation"},
    {"label": "2027-03", "sha256": "68c1cddefbffe22dd8d98f751bfee479b1084606aafaa47f17b94fe120107191", "until": "2027-04-05", "note": "monthly rotation"},
    {"label": "2027-04", "sha256": "626954aa4d23ce0a57acfa71fd8f4bab99d37eab6cee70f1b0b5e092a12fd49b", "until": "2027-05-05", "note": "monthly rotation"},
    {"label": "2027-05", "sha256": "c57c9f6f92f4c3888d1c1060ae300046deffef378ca5e6e54ce582a8b0e118bf", "until": "2027-06-05", "note": "monthly rotation"},
    {"label": "2027-06", "sha256": "10de61edec644146fd74a8c25bd61d1ad7320cee64c99c99be5b7d43bf2888fc", "until": "2027-07-05", "note": "monthly rotation"},
    {"label": "2027-07", "sha256": "6859a1071fa89e4ef5f4c7444947fb80ad88c90673a7c21ba8109d9aa495b0bf", "until": "2027-08-05", "note": "monthly rotation"},
    {"label": "2027-08", "sha256": "d27ac913e99bc83337a4c0f1e367329ca02141244c60df358b24828e187252b0", "until": "2027-09-05", "note": "monthly rotation"},
    {"label": "2027-09", "sha256": "10c5e57eb30e266128bfe2b224033f4b158f7e841cd3897a67237f1a0a8ecb13", "until": "2027-10-05", "note": "monthly rotation"},
    {"label": "2027-10", "sha256": "95d773b07ab019a8911892c26e883caf7e6532142a7e54335ebef3d7d2b1a11e", "until": "2027-11-05", "note": "monthly rotation"},
    {"label": "2027-11", "sha256": "01bf25a5fb3eb1fddd0750bfd0dd1d63759ce9deb59dda78e775116fafbab391", "until": "2027-12-05", "note": "monthly rotation"},
    {"label": "2027-12", "sha256": "93959640b22345b749a16a1d438961674e7e4a84cbeaf145bbf72890f66f27f4", "until": "2028-01-05", "note": "monthly rotation"},
    {"label": "2028-01", "sha256": "65861f7114d22d781add12ed799944df55047bafdcbd65099db3a3733026a4ba", "until": "2028-02-05", "note": "monthly rotation"},
    {"label": "2028-02", "sha256": "44c14568c6b534f325214a9291867ac77c5ba98067123b28ca39da4a1b4cbe21", "until": "2028-03-05", "note": "monthly rotation"},
    {"label": "2028-03", "sha256": "bbd85e479153d76a5d437916ee8f5614cfea3858b9ae8b3918f53e7af7e47a8e", "until": "2028-04-05", "note": "monthly rotation"},
    {"label": "2028-04", "sha256": "dbd8eed19924425f889992af55052256976f6fccc94a813ad840ad06647aeac2", "until": "2028-05-05", "note": "monthly rotation"},
    {"label": "2028-05", "sha256": "feff0d5a91086f9ea175342e766b2f81bd7c6499fe708b1f7a23666acd857235", "until": "2028-06-05", "note": "monthly rotation"},
    {"label": "2028-06", "sha256": "42e16c90fd05ec9290f41a7bf7d0965872ab7f87c86f4d7310778e4f0f4c94a0", "until": "2028-07-05", "note": "monthly rotation"},
    {"label": "2028-07", "sha256": "e17b51d928f7c9ea00a1e8691764b0dfbfc8921beb29e179599fc943240f0cd3", "until": "2028-08-05", "note": "monthly rotation"},
    {"label": "2028-08", "sha256": "440c5ab94352de12addf10ce37bc36724ab4297ddac5ceb38cc2d93b77cee971", "until": "2028-09-05", "note": "monthly rotation"},
    {"label": "2028-09", "sha256": "cae24e52d1271aabe19e21cd4a0cb3c90ef02956b0e82be3e1eefab208fc0fef", "until": "2028-10-05", "note": "monthly rotation"},
    {"label": "2028-10", "sha256": "82f239c06c7170624b25e81a6ab0d655cb0e1fc90059275a8488bce267119f03", "until": "2028-11-05", "note": "monthly rotation"},
    {"label": "2028-11", "sha256": "18aadac7c4bb4f7427d5a27eaea20d58a062f8a2b88e01c89f8b8fb7217a4309", "until": "2028-12-05", "note": "monthly rotation"},
    {"label": "2028-12", "sha256": "ebf7e1c300b9a5f48a158e39cfb3e239db961b262588340db8cd5e5c595223df", "until": "2029-01-05", "note": "monthly rotation"},
    {"label": "2029-01", "sha256": "e1a17c13eab698c08c3810ba46d451c591999396899baab5516c81e29fb0947a", "until": "2029-02-05", "note": "monthly rotation"},
    {"label": "2029-02", "sha256": "9cbd1c7dd297e89f4f5f889572ff89ba802b46a977a5b873e64dd827367a4400", "until": "2029-03-05", "note": "monthly rotation"},
    {"label": "2029-03", "sha256": "1d97297008142bf08bb5a02624d2c25b5252c335fadd2bfce089a4887d69c884", "until": "2029-04-05", "note": "monthly rotation"}
  ];
  /* @supporter-hashes:end */

  var card = null, rain = null, rainTimer = null, row = null, rowHost = null, lastFocus = null;
  var nagTimer = null, suppressUntil = 0;

  function el(id) { return document.getElementById(id); }
  function store(k) { try { return g.localStorage.getItem(k); } catch (_) { return null; } }
  function save(k, v) { try { g.localStorage.setItem(k, String(v)); } catch (_) {} }
  function drop(k) { try { g.localStorage.removeItem(k); } catch (_) {} }

  function normalize(code) { return String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
  function endOfDay(day) { var d = new Date(String(day) + "T23:59:59"); return isNaN(d.getTime()) ? 0 : d.getTime(); }

  async function sha256hex(text) {
    if (!g.crypto || !g.crypto.subtle) throw new Error("no_webcrypto");
    var buf = await g.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }

  function record() {
    var raw = store(UNLOCK_STORE);
    if (!raw) return null;
    try { var r = JSON.parse(raw); return (r && typeof r === "object") ? r : null; } catch (_) { return null; }
  }

  function state() {
    var r = record();
    if (!r) return { unlocked: false, label: "", until: "", lapsed: false };
    var live = !r.until || Date.now() <= endOfDay(r.until);
    return { unlocked: live, label: String(r.label || ""), until: String(r.until || ""), lapsed: !live && !!r.until };
  }

  function announce() {
    try { document.dispatchEvent(new CustomEvent("lygo-supporter", { detail: state() })); } catch (_) {}
    paintRow();
    if (state().unlocked) hideCard();
  }

  async function tryCode(code) {
    var n = normalize(code);
    if (n.length < 12) return { ok: false, why: "That looks too short. The code looks like LYGO-2609-XXXX-XXXX." };
    var h;
    try { h = await sha256hex(n); }
    catch (_) { return { ok: false, why: "This browser will not hash outside a secure page (https). The live games are https." }; }
    var hit = null;
    for (var i = 0; i < CODE_HASHES.length; i++) { if (CODE_HASHES[i].sha256 === h) { hit = CODE_HASHES[i]; break; } }
    if (!hit) return { ok: false, why: "That code is not one of this lattice's codes. Codes rotate every month — the current one is on the Patreon post." };
    if (!hit.permanent && hit.until && Date.now() > endOfDay(hit.until)) {
      return { ok: false, why: "That code was valid through " + hit.until + " and has been rotated out. The current month's code is on the Patreon post." };
    }
    save(UNLOCK_STORE, JSON.stringify({
      label: hit.label, until: hit.permanent ? "" : (hit.until || ""), at: new Date().toISOString()
    }));
    announce();
    return { ok: true, label: hit.label, until: hit.permanent ? "" : (hit.until || "") };
  }

  function relock() { drop(UNLOCK_STORE); announce(); }

  /* ---- the supporter row, at the bottom of the game menu ------------------------------ */

  var MENU_SELECTORS = ["#menu", "#pauseMenu", "#pause", "[data-lygo-menu]", ".game-menu", "#overlay"];

  function findMenu() {
    for (var i = 0; i < MENU_SELECTORS.length; i++) {
      var n = document.querySelector(MENU_SELECTORS[i]);
      if (n && n !== rowHost && n.offsetParent !== null) return n;
    }
    for (var j = 0; j < MENU_SELECTORS.length; j++) {
      var m = document.querySelector(MENU_SELECTORS[j]);
      if (m) return m;
    }
    return null;
  }

  function buildRow() {
    var box = document.createElement("div");
    box.className = "lyg-row";
    box.id = "lygSupporterRow";
    box.innerHTML =
      '<button class="lyg-row-tab" type="button">\u26bf Supporter access \u2014 enter this month\'s code</button>' +
      '<div class="lyg-row-head"><span class="lyg-row-title">Supporter access</span>' +
      '<span class="lyg-row-chip" id="lygChip" hidden></span></div>' +
      '<p class="lyg-row-note" id="lygState"></p>' +
      '<div class="lyg-row-fields">' +
      '<input id="lygCode" class="lyg-input" type="text" inputmode="latin" autocomplete="off" ' +
      'spellcheck="false" placeholder="LYGO-2609-XXXX-XXXX" aria-label="Supporter code">' +
      '<button id="lygGo" class="lyg-btn" type="button">Unlock</button>' +
      '<button id="lygRelock" class="lyg-btn lyg-btn-quiet" type="button" hidden>Lock again</button>' +
      '</div>' +
      '<p class="lyg-row-msg" id="lygMsg" role="status" aria-live="polite"></p>' +
      '<a class="lyg-row-get" id="lygGet" href="' + PATREON + '" target="_blank" rel="noopener">' +
      "Get this month's code — Patreon post &rarr;</a>";
    box.addEventListener("click", function (ev) { ev.stopPropagation(); });
    var tab = box.querySelector(".lyg-row-tab");
    if (tab) tab.addEventListener("click", function () { box.classList.toggle("is-open"); });
    var go = box.querySelector("#lygGo");
    var inp = box.querySelector("#lygCode");
    go.addEventListener("click", function () { submit(); });
    inp.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); submit(); } });
    box.querySelector("#lygRelock").addEventListener("click", function () {
      relock(); say("Locked again in this browser. The reminders will come back.");
    });
    async function submit() {
      var v = inp.value;
      var res = await tryCode(v);
      if (res.ok) {
        inp.value = "";
        say("Unlocked — the reminders stay off in this browser" + (res.until ? " through " + res.until : "") + ". Thank you for keeping the lattice lit.");
      } else { say(res.why); }
    }
    return box;
  }

  function say(msg) { var m = el("lygMsg"); if (m) m.textContent = msg || ""; }

  function paintRow() {
    var chip = el("lygChip"), st = el("lygState"), go = el("lygGo"), rl = el("lygRelock"), inp = el("lygCode");
    if (!chip && !st) return;
    var s = state();
    if (chip) { chip.hidden = !s.unlocked; chip.textContent = s.until ? "through " + s.until : (s.unlocked ? "permanent" : ""); }
    if (st) {
      st.textContent = s.unlocked
        ? ("Active in this browser" + (s.label ? " · code " + s.label : "") + (s.until ? " · through " + s.until : " · permanent") +
           (s.until ? " — after that the reminders come back and this month's code is on Patreon." : ""))
        : (s.lapsed
            ? ("The code from " + s.label + " was valid through " + s.until + " and has lapsed, so the reminders are back.")
            : "One monthly code from Patreon switches the donation reminders off in this browser. Every game plays the same without it.");
    }
    if (go) go.hidden = s.unlocked;
    if (rl) rl.hidden = !s.unlocked;
    if (inp) inp.disabled = s.unlocked;
  }

  function mountRow() {
    if (!row) row = buildRow();
    var host = findMenu();
    if (host) {
      if (row.parentNode !== host) host.appendChild(row);
      row.classList.remove("lyg-row-fixed");
      rowHost = host;
    } else {
      if (row.parentNode !== document.body) document.body.appendChild(row);
      row.classList.add("lyg-row-fixed");
      rowHost = document.body;
    }
    paintRow();
  }

  /* ---- the reminder --------------------------------------------------------------- */

  function paintRain(cv) {
    if (!cv || !cv.getContext) return;
    var c = cv.getContext("2d"), dpr = Math.min(2, g.devicePixelRatio || 1);
    cv.width = Math.floor(cv.clientWidth * dpr); cv.height = Math.floor(cv.clientHeight * dpr);
    var glyphs = "\u0394\u03a6\u03a9\u03a3\u03a8\u2317\u25b3\u25bd\u25cf\u2022\u00b7\u03b1\u03b2\u2207\u2211\u221a\u221e\u2295\u2731\u2732\u2733";
    var fs = 18 * dpr, cols = Math.ceil(cv.width / fs);
    c.fillStyle = "#060504"; c.fillRect(0, 0, cv.width, cv.height);
    c.font = Math.floor(15 * dpr) + "px monospace";
    for (var i = 0; i < cols; i++) {
      var x = i * fs + fs * 0.2, y = -fs;
      var runs = 4 + Math.floor(Math.random() * 9);
      for (var j = 0; j < runs; j++) {
        var ch = glyphs.charAt(Math.floor(Math.random() * glyphs.length));
        var lead = j === runs - 1;
        c.fillStyle = lead ? "#f0d59a" : ("rgba(224,179,106," + (j / runs * 0.5).toFixed(2) + ")");
        c.fillText(ch, x, y); y += fs * 1.05;
      }
    }
  }

  function buildCard() {
    var lay = document.createElement("div");
    lay.className = "lyg-layer";
    lay.id = "lygLayer";
    lay.hidden = true;
    lay.innerHTML =
      '<canvas class="lyg-rain" id="lygRain" aria-hidden="true"></canvas>' +
      '<div class="lyg-card" role="dialog" aria-modal="true" aria-labelledby="lygTitle">' +
      '<p class="lyg-kicker">\u03949\u03a6963 \u00b7 CHATAGENT.CA \u00b7 PUBLIC RESOURCE</p>' +
      '<h2 class="lyg-title" id="lygTitle">KEEP THE LATTICE LIT</h2>' +
      '<p class="lyg-lead">This game is free and stays free — there is nothing behind this card to buy.</p>' +
      '<ul class="lyg-list">' +
      "<li><strong>You do not have to donate.</strong> Opening PayPal or the Patreon post unlocks Continue — even if you give $0.</li>" +
      "<li><strong>Supporters get this month's code</strong> from the <a href=\"" + PATREON + "\" target=\"_blank\" rel=\"noopener\">Patreon post</a>. " +
      "Enter it in the Supporter access row at the bottom of the game menu and these reminders stop in this browser.</li>" +
      "<li><strong>Everything works without it</strong> — every level, every mode, the leaderboards and the whole arcade.</li>" +
      "</ul>" +
      '<div class="lyg-actions">' +
      '<a class="lyg-btn lyg-btn-gold" id="lygPaypal" href="' + PAYPAL + '" target="_blank" rel="noopener">Open PayPal.me/ExcavationPro</a>' +
      '<a class="lyg-btn lyg-btn-gold" id="lygPatreon" href="' + PATREON + '" target="_blank" rel="noopener">Patreon post — donate or get this month\'s code</a>' +
      '<button class="lyg-btn lyg-btn-cta" id="lygContinue" type="button" disabled>Open a donate page to continue</button>' +
      '<button class="lyg-btn lyg-btn-door" id="lygDoor" type="button">I am a supporter — enter this month\'s code</button>' +
      '</div>' +
      '<p class="lyg-foot">Code and support: <a href="' + PATREON + '" target="_blank" rel="noopener">chatagent-ca-api</a> \u00b7 ' +
      '<a href="/legal.html">Legal &amp; disclaimers</a></p>' +
      '</div>';
    var cta = lay.querySelector("#lygContinue");
    function opened() { cta.disabled = false; cta.textContent = "Continue"; }
    lay.querySelector("#lygPaypal").addEventListener("click", opened);
    lay.querySelector("#lygPatreon").addEventListener("click", opened);
    cta.addEventListener("click", function () { hideCard(NAG_MS); });
    lay.querySelector("#lygDoor").addEventListener("click", function () {
      hideCard(NAG_MS);
      mountRow();
      if (row) {
        row.classList.add("lyg-flash");
        setTimeout(function () { row.classList.remove("lyg-flash"); }, 1600);
        row.scrollIntoView({ block: "center", behavior: "smooth" });
        var inp = el("lygCode");
        if (inp && !inp.disabled) setTimeout(function () { inp.focus(); }, 350);
      }
    });
    lay.addEventListener("click", function (ev) { if (ev.target === lay) ev.stopPropagation(); });
    return lay;
  }

  function showCard() {
    if (state().unlocked) return;
    if (!card) { card = buildCard(); document.body.appendChild(card); }
    card.hidden = false;
    card.classList.add("lyg-open");
    lastFocus = document.activeElement;
    rain = el("lygRain");
    paintRain(rain);
    clearInterval(rainTimer);
    rainTimer = setInterval(function () { paintRain(rain); }, 900);
    try { document.dispatchEvent(new CustomEvent("lygo-gate-open")); } catch (_) {}
  }

  function hideCard(nextMs) {
    if (card) { card.hidden = true; card.classList.remove("lyg-open"); }
    clearInterval(rainTimer); rainTimer = null;
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (_) {} }
    if (nextMs) schedule(nextMs);
  }

  function schedule(ms) {
    clearTimeout(nagTimer);
    nagTimer = setTimeout(function () {
      if (state().unlocked) return schedule(NAG_MS);
      if (document.hidden) return schedule(60 * 1000);
      if (!card || card.hidden) showCard();
      schedule(NAG_MS);
    }, ms);
  }

  function boot() {
    mountRow();
    [400, 1500, 4000, 9000].forEach(function (t) { setTimeout(mountRow, t); });
    schedule(NAG_MS);
  }

  g.LYGO_GATE = {
    version: GATE_VERSION, storeKey: UNLOCK_STORE, patreon: PATREON, paypal: PAYPAL,
    nagMs: NAG_MS, codeCount: CODE_HASHES.length,
    state: state, unlock: tryCode, relock: relock, open: showCard, close: hideCard,
    mount: mountRow, host: function () { return rowHost; },
    hashes: function () { return CODE_HASHES.map(function (c) { return c.sha256; }); }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
