/* HAVEN DESK — THE FIRST LOOP.
   The desk is found warm. A note is taped to the monitor. The note asks for one
   word, and the word is the first gate of the game. Typing it wakes the room,
   lights the desktop, and opens the calendar on the first date.
   Also owns the persistent THREAD line: one next action, always visible. */
(function () {
  "use strict";
  var H = window.HavenDesk;
  var D = window.VEIL_DATA;
  if (!H || !D) return;
  if (!H.store.veil) H.store.veil = {};
  var V = H.store.veil;
  if (!V.flags) V.flags = {};

  var WORD = "FOUNDATION";
  var START = D.meta.start || "1998-03-14";

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function btn(label, cls, fn) {
    var b = el("button", cls || "raised", label);
    b.type = "button";
    b.addEventListener("click", fn);
    return b;
  }
  function save() { H.save(); }

  function noteText() {
    var d = D.days[START];
    var docs = (d && d.docs) || [];
    for (var i = 0; i < docs.length; i++) {
      if (/MONITOR NOTE/i.test(docs[i].title || "")) return String(docs[i].text || "");
    }
    return "If you are reading this, the calendar works.\nDo not trust the first date.\nTrust the first foundation.";
  }

  /* ---------- desktop staging ---------- */

  function stageDesktop() {
    var desktop = document.getElementById("desktop");
    if (!desktop) return;
    var boot = !V.flags || !V.flags.firstNote;
    desktop.classList.toggle("veil-first-boot", boot);
    if (!boot) desktop.classList.remove("veil-first-reveal");
  }

  function revealDesktop() {
    var desktop = document.getElementById("desktop");
    if (!desktop) return;
    desktop.classList.remove("veil-first-boot");
    desktop.classList.add("veil-first-reveal");
    setTimeout(function () { desktop.classList.remove("veil-first-reveal"); }, 2600);
  }

  /* ---------- the thread line ---------- */

  function solved(id) { return !!(V.solved && V.solved[id]); }
  function open(id) { return !!(V.unlocked && V.unlocked[id]) || solved(id); }

  function objective() {
    if (!V.flags || !V.flags.firstNote) {
      return {
        kicker: "THREAD 01",
        label: "Type the word from the monitor note.",
        act: function () { begin(null, true); }
      };
    }
    var ids = Object.keys(D.days).sort();
    var ready = ids.filter(function (id) { return open(id) && !solved(id); });
    if (ready.length) {
      var id = ready[0];
      return {
        kicker: "THREAD · " + String(Object.keys(V.solved || {}).length) + " OF " + ids.length,
        label: "Open " + id + " · " + D.days[id].title,
        act: function () {
          H.open("calendar");
          setTimeout(function () {
            if (window.VEIL_API && window.VEIL_API.openDay) window.VEIL_API.openDay(id);
          }, 140);
        }
      };
    }
    var sealed = ids.filter(function (id) { return !open(id); });
    if (sealed.length) {
      return {
        kicker: "THREAD · " + String(Object.keys(V.solved || {}).length) + " OF " + ids.length,
        label: "Every open room is sealed. Solve a gate to unlock " + sealed[0] + ".",
        act: function () { H.open("calendar"); }
      };
    }
    return {
      kicker: "THREAD COMPLETE",
      label: "Sixty rooms unsealed. The Echo Vault is open.",
      act: function () { H.open("echoes"); }
    };
  }

  var bar = null;
  function thread() {
    var desk = document.getElementById("desk");
    if (!desk) return;
    if (!bar) {
      bar = el("div", "veil-thread");
      bar.id = "veil-thread";
      desk.appendChild(bar);
    }
    var o = objective();
    bar.innerHTML = "";
    bar.appendChild(el("span", "veil-thread-kicker", o.kicker));
    var go = btn(o.label, "veil-thread-go", function () { o.act(); paintThread(); });
    bar.appendChild(go);
    bar.dataset.label = o.label;
  }
  function paintThread() { try { thread(); } catch (e) {} }

  /* ---------- the note ---------- */

  var overlay = null;

  function build(onSetup) {
    var desk = document.getElementById("desk");
    if (desk) desk.hidden = false;
    var boot = document.getElementById("boot");
    if (boot && !boot.hidden) boot.hidden = true;

    overlay = el("div", "veil-first");
    overlay.id = "veil-first";
    var sheet = el("div", "veil-first-sheet");
    sheet.appendChild(el("p", "veil-first-head", "RECOVERED NOTE · TAPED TO THE MONITOR · 14 MAR 1998"));
    var paper = el("pre", "veil-first-paper");
    sheet.appendChild(paper);
    var gate = el("div", "veil-first-gate");
    var label = el("label", "veil-first-label", "THE WORD THE NOTE ASKS FOR");
    label.setAttribute("for", "veil-first-word");
    var input = document.createElement("input");
    input.id = "veil-first-word";
    input.className = "veil-input veil-first-input";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.placeholder = "one word";
    var press = btn("PRESS IT IN", "veil-primary", submit);
    var msg = el("p", "veil-first-msg", "");
    gate.appendChild(label);
    gate.appendChild(input);
    gate.appendChild(press);
    gate.appendChild(msg);
    sheet.appendChild(gate);
    sheet.appendChild(el("p", "veil-first-foot", "The note is old. The desk is warm. Something in the room is still counting."));
    overlay.appendChild(sheet);
    document.body.appendChild(overlay);

    // Typewriter reveal, skippable.
    var full = noteText();
    var at = 0;
    var done = false;
    var timer = setInterval(function () {
      at = Math.min(full.length, at + 3);
      paper.textContent = full.slice(0, at);
      if (at >= full.length) { clearInterval(timer); finish(); }
    }, 16);
    function finish() {
      if (done) return;
      done = true;
      clearInterval(timer);
      paper.textContent = full;
      paper.classList.add("is-done");
      setTimeout(function () { input.focus(); }, 60);
    }
    paper.addEventListener("click", finish);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) finish(); });

    var wrong = 0;
    function submit() {
      var guess = String(input.value || "").toUpperCase().replace(/[^A-Z]/g, "");
      if (!guess) { input.focus(); return; }
      if (guess === WORD) { succeed(onSetup); return; }
      wrong += 1;
      sheet.classList.remove("is-shake");
      void sheet.offsetWidth;
      sheet.classList.add("is-shake");
      input.value = "";
      if (wrong === 1) msg.textContent = "Not that one. The note calls it the first foundation.";
      else if (wrong === 2) msg.textContent = "It is poured before the first wall, and it never appears in the wall.";
      else if (wrong === 3) {
        msg.textContent = "The word is FOUNDATION. The desk is not going to pretend it was hard.";
        var show = btn("TYPE IT FOR ME", "raised", function () { input.value = WORD; submit(); });
        gate.insertBefore(show, msg);
      } else {
        msg.textContent = "Type it: F O U N D A T I O N.";
      }
      input.focus();
      if (H.beep) H.beep();
    }
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); submit(); }
    });
    press.addEventListener("click", submit);
  }

  function succeed(onSetup) {
    // Mirror exactly what the 1998 gate writes, so the rest of the game agrees.
    var d = D.days[START];
    V.solved[START] = { at: new Date().toISOString(), how: "monitor-note" };
    V.current = START;
    V.seen = true;
    V.flags.firstNote = true;
    V.flags.firstRoom = "1969-07-20";
    if (d && d.gate && d.gate.unlocks) {
      d.gate.unlocks.forEach(function (id) { V.unlocked[id] = true; });
    }
    V.unlocked[START] = true;
    V.unlocked["1969-07-20"] = true;
    save();

    revealDesktop();
    if (H.toast) H.toast("THE DESK REMEMBERS YOU · 4 ROOMS OPEN");
    if (H.beep) H.beep();

    var sheet = overlay.querySelector(".veil-first-sheet");
    sheet.innerHTML = "";
    sheet.appendChild(el("p", "veil-first-head", "THE NOTE · SECOND SIDE · HANDWRITING CHANGES HERE"));
    var body = el("div", "veil-first-done");
    body.appendChild(el("h2", "", "The calendar unfolds."));
    body.appendChild(el("p", "", "Four rooms are open: 1969, 1989, 1999, 2007. The map will tell you which one is next."));
    body.appendChild(el("p", "veil-first-small", "The desk left a line at the bottom of the screen. Follow it and the index will open one room at a time."));
    var row = el("div", "veil-actions");
    var goCal = btn("OPEN THE CALENDAR", "veil-primary", function () { close(); H.open("calendar"); paintThread(); });
    row.appendChild(goCal);
    if (onSetup) row.appendChild(btn("SET UP THIS DESK", "raised", function () { close(); onSetup(); }));
    row.appendChild(btn("READ THE READ ME", "raised", function () { close(); H.open("readme"); }));
    body.appendChild(row);
    sheet.appendChild(body);
    var next = body.querySelector("button");
    if (next) setTimeout(function () { next.focus(); }, 80);
    paintThread();
  }

  function close() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
  }

  function begin(onSetup, reopen) {
    if (overlay) return;
    if (V.flags && V.flags.firstNote && !reopen) { paintThread(); return; }
    build(onSetup);
  }

  /* ---------- boot ---------- */

  var bootEl = document.getElementById("boot");
  if (bootEl) bootEl.classList.add("veil-boot");

  stageDesktop();
  setTimeout(function () {
    stageDesktop();
    paintThread();
  }, 400);
  setInterval(paintThread, 2500);
  // Any click can change the state (a gate unsealed, a room opened): repaint the
  // thread a moment later so the line never goes stale.
  document.addEventListener("click", function () { setTimeout(paintThread, 420); }, true);

  window.VEIL_START = {
    // begin() respects the first-run guard; reopen() forces the note back up.
    begin: function (onSetup) { begin(onSetup, false); },
    reopen: function (onSetup) { begin(onSetup, true); },
    thread: paintThread,
    objective: objective,
    stage: stageDesktop
  };
})();
