/* Haven Rally — follows ./whitepaper.html */
(function () {
  "use strict";
  const SAVE_KEY = "lygo-haven-rally-v1";
  const CRAFTS = [
    {
      id: "apex", name: "Apex Mk I", tag: "Lattice GT",
      src: "./assets/apex-plate.jpg", hero: "./assets/apex-hero.jpg",
      lore: "Base chassis. Pearl teal, gold wing, cyan DRLs. More bays open as the game grows.",
      acc: 34, vmax: 88, turn: 2.05, grip: 0.95, boost: 1.1, color: "#165e66"
    }
  ];
  const LOCKED_BAYS = [
    { name: "Bay 02", tag: "Soon" },
    { name: "Bay 03", tag: "Soon" }
  ];

  function mulberry(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function fmt(ms) {
    if (ms == null || !isFinite(ms)) return "—";
    const s = ms / 1000;
    const m = Math.floor(s / 60);
    const r = s - m * 60;
    return m + ":" + r.toFixed(3).padStart(6, "0");
  }
  function craftOf(id) { return CRAFTS.find(function (c) { return c.id === id; }) || CRAFTS[0]; }

  const OPTIONS = [
    { key: "ghost", group: "Race", type: "toggle", label: "Show ghost", hint: "Best heat for this circuit + craft rides with you.", def: true },
    { key: "countdown", group: "Race", type: "toggle", label: "Countdown lights", hint: "3–2–1 before green.", def: true },
    { key: "invertSteer", group: "Controls", type: "toggle", label: "Invert steer", hint: "Swap A/D and the arrow keys.", def: false },
    { key: "camDist", group: "Camera", type: "range", label: "Chase distance", min: 0.7, max: 1.7, step: 0.05, def: 1 },
    { key: "camHeight", group: "Camera", type: "range", label: "Chase height", min: 0.7, max: 1.8, step: 0.05, def: 1 },
    { key: "showPilot", group: "HUD", type: "toggle", label: "Pilot plate", def: true },
    { key: "showHint", group: "HUD", type: "toggle", label: "On-track hint", def: true },
    { key: "reduceFx", group: "Graphics", type: "toggle", label: "Reduce effects", hint: "Hides drift sparks and underglow.", def: false },
    { key: "assist", group: "Controls", type: "soon", label: "Steering assist", hint: "Coming with the handling pack." },
    { key: "abs", group: "Controls", type: "soon", label: "Brake assist", hint: "Coming with the handling pack." },
    { key: "weather", group: "Race", type: "soon", label: "Weather", hint: "Rain and wind as circuits grow." }
  ];

  function defaultOptions() {
    const o = {};
    OPTIONS.forEach(function (s) {
      if (s.type !== "soon") o[s.key] = s.def;
    });
    return o;
  }
  function opt(key) {
    const spec = OPTIONS.find(function (s) { return s.key === key; });
    const o = (G.save && G.save.options) || {};
    if (o[key] == null) return spec ? spec.def : false;
    return o[key];
  }
  function setOpt(key, val) {
    if (!G.save.options) G.save.options = defaultOptions();
    G.save.options[key] = val;
    writeSave(G.save);
    applyOptions();
  }
  function applyOptions() {
    if ($("pilotPlate")) $("pilotPlate").classList.toggle("hidden", !opt("showPilot"));
    if ($("hint")) $("hint").classList.toggle("hidden", !opt("showHint"));
    if (window.Rally3D && Rally3D.setCam) {
      Rally3D.setCam({ dist: Number(opt("camDist")) || 1, height: Number(opt("camHeight")) || 1 });
    }
  }
  function optRowHtml(s) {
    const hint = s.hint ? "<p class='lore'>" + s.hint + "</p>" : "";
    const left = "<div><b>" + s.label + "</b>" + hint + "</div>";
    let right = "";
    if (s.type === "toggle") {
      const on = !!opt(s.key);
      right = "<button type='button' class='opt-toggle" + (on ? " on" : "") + "' data-opt='" + s.key + "'>" +
        (on ? "On" : "Off") + "</button>";
    } else if (s.type === "range") {
      const v = Number(opt(s.key));
      right = "<label class='opt-range'><span data-opt-val='" + s.key + "'>" + v.toFixed(2) + "</span>" +
        "<input type='range' data-opt='" + s.key + "' min='" + s.min + "' max='" + s.max +
        "' step='" + s.step + "' value='" + v + "'></label>";
    } else {
      right = "<span class='opt-soon'>Soon</span>";
    }
    return "<div class='opt-row'>" + left + right + "</div>";
  }
  function optionsMenu() {
    G._sheet = "options";
    const groups = [];
    OPTIONS.forEach(function (s) {
      if (!groups.length || groups[groups.length - 1].name !== s.group) {
        groups.push({ name: s.group, rows: [] });
      }
      groups[groups.length - 1].rows.push(s);
    });
    const body = groups.map(function (g) {
      return "<p class='opt-group'>" + g.name + "</p>" + g.rows.map(optRowHtml).join("");
    }).join("");
    showSheet(
      "<p class='kicker'>Configuration</p><h2>Options</h2>" +
      "<p class='lore'>Saved with the local ledger. New settings drop in as extra rows — this sheet is the fill-as-we-go panel.</p>" +
      body +
      "<div class='modes'><button type='button' class='btn gold' id='optBack'>Back</button>" +
      "<button type='button' class='btn' id='optReset'>Reset defaults</button></div>",
      false,
      "sheet-opts"
    );
    $("optBack").onclick = function () {
      G._sheet = "";
      if (G.mode === "menu") menu();
      else hideOverlay();
    };
    $("optReset").onclick = function () {
      G.save.options = defaultOptions();
      writeSave(G.save);
      applyOptions();
      optionsMenu();
    };
    const ov = $("overlay");
    ov.querySelectorAll("[data-opt]").forEach(function (el) {
      const key = el.getAttribute("data-opt");
      const spec = OPTIONS.find(function (s) { return s.key === key; });
      if (!spec || spec.type === "soon") return;
      if (spec.type === "toggle") {
        el.onclick = function () {
          setOpt(key, !opt(key));
          const on = !!opt(key);
          el.classList.toggle("on", on);
          el.textContent = on ? "On" : "Off";
        };
      } else if (spec.type === "range") {
        el.oninput = function () {
          const n = Number(el.value);
          setOpt(key, n);
          const valEl = ov.querySelector("[data-opt-val='" + key + "']");
          if (valEl) valEl.textContent = n.toFixed(2);
        };
      }
    });
  }

  function densifyPath(pts, step, closed) {
    const out = [];
    const segs = closed ? pts.length : Math.max(0, pts.length - 1);
    for (let i = 0; i < segs; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const len = dist(a, b) || 1;
      const n = Math.max(1, Math.ceil(len / step));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    if (!closed && pts.length) out.push(pts[pts.length - 1]);
    return out;
  }
  function pathLen(pts, closed) {
    let n = 0;
    const segs = closed ? pts.length : Math.max(0, pts.length - 1);
    for (let i = 0; i < segs; i++) n += dist(pts[i], pts[(i + 1) % pts.length]);
    return n;
  }
  function wrapDelta(ds, len) {
    if (ds > len * 0.5) ds -= len;
    if (ds < -len * 0.5) ds += len;
    return ds;
  }
  function project(p, samples, lastS, closed) {
    if (closed == null) closed = true;
    let best = 1e15, lat = 0, s = 0, hx = 1, hy = 0, acc = 0;
    const segs = closed ? samples.length : Math.max(0, samples.length - 1);
    let total = 0;
    for (let i = 0; i < segs; i++) total += dist(samples[i], samples[(i + 1) % samples.length]);
    for (let i = 0; i < segs; i++) {
      const a = samples[i], b = samples[(i + 1) % samples.length];
      const dx = b.x - a.x, dy = b.y - a.y;
      const l2 = dx * dx + dy * dy || 1;
      let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
      t = clamp(t, 0, 1);
      const qx = a.x + dx * t, qy = a.y + dy * t;
      const d = Math.hypot(p.x - qx, p.y - qy);
      const len = Math.sqrt(l2);
      const sHere = acc + t * len;
      const jump = lastS == null ? 0 : Math.abs(closed ? wrapDelta(sHere - lastS, total || 1) : (sHere - lastS));
      const score = d + 0.12 * jump;
      if (score < best) {
        best = score;
        hx = dx / (len || 1); hy = dy / (len || 1);
        lat = (p.x - qx) * (-hy) + (p.y - qy) * hx;
        s = sHere;
      }
      acc += len;
    }
    return { d: best, lat: lat, s: s, hx: hx, hy: hy, len: acc };
  }

  function makeTrack(spec) {
    const pts = spec.ctrl.slice();
    const samples = densifyPath(pts, 5, true);
    const len = pathLen(samples, true);
    return {
      id: spec.id,
      name: spec.name,
      theme: spec.theme || spec.id,
      lore: spec.lore || "",
      width: spec.width,
      laps: spec.laps || 3,
      pts: pts,
      samples: samples,
      len: len,
      closed: true,
      kind: "circuit",
      sectors: [0.28, 0.55, 0.82]
    };
  }

  function makeDragTrack(spec) {
    const race = spec.yards;
    const pad = 48;
    const shut = Math.max(160, race * 0.42);
    const total = pad + race + shut;
    const pts = [];
    for (let x = 0; x <= total; x += 6) pts.push({ x: x, y: 0 });
    if (pts[pts.length - 1].x < total) pts.push({ x: total, y: 0 });
    const samples = densifyPath(pts, 4, false);
    return {
      id: spec.id,
      name: spec.name,
      theme: "drag-strip",
      lore: spec.lore,
      width: 9.2,
      lane: 2.2,
      laps: 1,
      pts: pts,
      samples: samples,
      len: pathLen(samples, false),
      closed: false,
      kind: "drag",
      startX: pad,
      finishX: pad + race,
      yards: race,
      feet: spec.feet,
      sectors: []
    };
  }
  function loopFromPolar(n, radius, jitter, rng, spin) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (spin || 0);
      const r = radius + Math.sin(a * 2.2) * jitter * 0.45 + (rng() * 2 - 1) * jitter;
      pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.78 });
    }
    return pts;
  }

  const PINE = makeTrack({
    id: "pine-coil", name: "Pine Coil", theme: "pine-coil", width: 7.2, laps: 3,
    lore: "Parkland esses. Hold Reed or slide Mira.",
    ctrl: loopFromPolar(10, 92, 22, mulberry(19), 0.2)
  });
  const CORAL = makeTrack({
    id: "coral-coast", name: "Coral Coast", theme: "coral-coast", width: 8.4, laps: 3,
    lore: "Long straights. Boost on the coast, don't overcook the hairpin.",
    ctrl: loopFromPolar(8, 110, 28, mulberry(41), 0.6)
  });
  const STAR = makeTrack({
    id: "singularity-ring", name: "Singularity Ring", theme: "singularity-ring", width: 6.2, laps: 3,
    lore: "Night and tight. Kai's boost is a trap if you miss the apex.",
    ctrl: loopFromPolar(12, 78, 16, mulberry(73), 1.1)
  });
  const DRAG_EIGHTH = makeDragTrack({
    id: "drag-eighth", name: "Drag · 1/8 mile", feet: 660, yards: 220,
    lore: "NHRA eighth-mile. 660 ft. Short tree, short trap."
  });
  const DRAG_THOU = makeDragTrack({
    id: "drag-1000", name: "Drag · 1000 ft", feet: 1000, yards: 1000 / 3,
    lore: "1000-foot trap. Same length NHRA used for Top Fuel."
  });
  const DRAG_QUARTER = makeDragTrack({
    id: "drag-quarter", name: "Drag · 1/4 mile", feet: 1320, yards: 440,
    lore: "Classic quarter-mile. 1320 ft. Full sportsman tree vs AI."
  });

  function randomTrack(seed) {
    const rng = mulberry(seed >>> 0);
    const n = 8 + ((rng() * 5) | 0);
    return makeTrack({
      id: "endless", name: "Endless coil", theme: "endless", width: 6.4 + rng() * 2.2, laps: 2,
      lore: "Seeded loop. Two laps. Beat the ghost or make one.",
      ctrl: loopFromPolar(n, 70 + rng() * 40, 14 + rng() * 18, rng, rng() * 2)
    });
  }

  function defaultSave() {
    return { name: "", craft: "apex", ghosts: {}, rounds: [], options: defaultOptions() };
  }
  function loadSave() {
    try {
      const s = Object.assign(defaultSave(), JSON.parse(localStorage.getItem(SAVE_KEY) || "{}"));
      s.options = Object.assign(defaultOptions(), s.options || {});
      if (!CRAFTS.some(function (c) { return c.id === s.craft; })) s.craft = "apex";
      return s;
    } catch (e) { return defaultSave(); }
  }
  function writeSave(s) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { /* private */ }
  }

  const G = {
    save: loadSave(),
    mode: "menu",
    track: null,
    craft: CRAFTS[0],
    phase: "idle",
    car: { x: 0, y: 0, h: 0, speed: 0, steer: 0, boost: 1 },
    ai: null,
    tree: { phase: "off" },
    keys: {},
    lap: 0,
    laps: 3,
    t0: 0,
    lastS: 0,
    gates: [false, false, false],
    splits: [],
    ghost: null,
    rec: [],
    sparks: 0,
    log: [],
    bestMs: null,
    _sheet: ""
  };

  const $ = function (id) { return document.getElementById(id); };
  const canvas = $("circuit");
  const use3d = !!(window.Rally3D && window.THREE && window.Rally3D.init(canvas));
  const ctx = use3d ? null : canvas.getContext("2d");

  function log(t) {
    G.log.unshift(t);
    if (G.log.length > 24) G.log.length = 24;
    const el = $("log");
    if (el) el.innerHTML = G.log.slice(0, 10).map(function (x) {
      return "<div>" + String(x).replace(/</g, "") + "</div>";
    }).join("");
  }

  function overlayOpen() {
    const ov = $("overlay");
    return !!(ov && !ov.classList.contains("hidden"));
  }
  function hideOverlay() {
    const ov = $("overlay");
    if (!ov) return;
    ov.classList.add("hidden");
    ov.classList.remove("studio");
    G._sheet = "";
    if (window.HavenCar) HavenCar.closeStudio();
  }
  function showSheet(html, studio, sheetClass) {
    const ov = $("overlay");
    ov.classList.remove("hidden");
    ov.classList.toggle("studio", !!studio);
    ov.innerHTML = studio ? html : "<div class='sheet" + (sheetClass ? " " + sheetClass : "") + "'>" + html + "</div>";
    G._sheet = sheetClass === "sheet-opts" ? "options" : (studio ? "menu" : "");
  }
  function donateHtml() {
    return "<div class='donate-row'>" +
      "<a class='donate-paypal' href='https://www.paypal.com/paypalme/ExcavationPro' target='_blank' rel='noopener noreferrer'>PayPal.me/ExcavationPro</a>" +
      "<a class='donate-patreon' href='https://www.patreon.com/Excavationpro' target='_blank' rel='noopener noreferrer'>Patreon</a></div>";
  }

  function paintPilot() {
    const c = G.craft;
    if ($("pilotImg")) $("pilotImg").src = c.src;
    if ($("pilotName")) $("pilotName").textContent = c.name;
    if ($("pilotTag")) $("pilotTag").textContent = c.tag;
  }

  function spawnOnGrid() {
    if (G.track && G.track.kind === "drag") {
      spawnDrag(false);
      return;
    }
    const tr = G.track;
    const a = tr.pts[0], b = tr.pts[1];
    const h = Math.atan2(b.y - a.y, b.x - a.x);
    G.car = { x: a.x, y: a.y, h: h, speed: 0, steer: 0, boost: 1 };
    G.ai = null;
    G.lap = 0;
    G.lastS = 0;
    G.gates = [false, false, false];
    G.splits = [];
    G.rec = [];
    G.phase = opt("countdown") ? "count" : "race";
    G.countN = 3;
    G.countT = performance.now();
    G.t0 = opt("countdown") ? 0 : performance.now();
    G._last = 0;
    applyOptions();
    const gk = tr.id + "|" + G.craft.id;
    G.ghost = (G.save.ghosts && G.save.ghosts[gk]) || null;
    G.bestMs = G.ghost && G.ghost.ms;
    paintPilot();
    showDragUi(false);
    if (use3d && window.Rally3D) Rally3D.setTrack(tr);
    log(tr.name + " · " + G.craft.name + " · " + tr.laps + " laps");
    $("app").classList.remove("hidden");
    hideOverlay();
    canvas.focus();
  }

  function startHeat(track) {
    G.mode = "race";
    G.track = track;
    G.laps = track.laps;
    G.craft = craftOf(G.save.craft);
    spawnOnGrid();
  }

  function showDragUi(on) {
    if ($("dragTree")) $("dragTree").classList.toggle("hidden", !on);
    if ($("dragHud")) $("dragHud").classList.toggle("hidden", !on);
  }

  function beginTree(now) {
    const foulAi = Math.random() < 0.035;
    return {
      t0: now,
      phase: "pre",
      foul: false,
      rt: null,
      launched: false,
      aiFoul: foulAi,
      aiRt: foulAi ? -(0.02 + Math.random() * 0.08) : (0.072 + Math.random() * 0.155),
      aiGoAt: 0,
      greenAt: 0,
      playerDone: false,
      aiDone: false,
      playerMs: null,
      aiMs: null,
      trapMph: null,
      aiMph: null,
      ft60: null
    };
  }

  function spawnDrag(runTree) {
    const tr = G.track;
    const lane = tr.lane;
    const x0 = runTree ? tr.startX : tr.startX - 22;
    G.car = { x: x0, y: -lane, h: 0, speed: 0, steer: 0, boost: 1 };
    const c = G.craft;
    G.ai = {
      x: x0, y: lane, h: 0, speed: 0, boost: 1,
      acc: c.acc * (0.94 + Math.random() * 0.1),
      vmax: c.vmax * (0.97 + Math.random() * 0.07),
      boostMul: c.boost
    };
    G.lap = 0;
    G.lastS = x0;
    G.gates = [false, false, false];
    G.splits = [];
    G.rec = [];
    G.ghost = null;
    G.bestMs = null;
    G._last = 0;
    G.t0 = 0;
    G.sparks = 0;
    applyOptions();
    paintPilot();
    showDragUi(true);
    if (use3d && window.Rally3D) Rally3D.setTrack(tr);
    $("app").classList.remove("hidden");
    hideOverlay();
    canvas.focus();
    if (runTree) {
      G.phase = "tree";
      G.tree = beginTree(performance.now());
      log("Staged · sportsman tree · " + tr.feet + " ft");
    } else {
      G.phase = "drag_idle";
      G.tree = { phase: "off", foul: false };
      log(tr.name + " · roll to the tree · F stages and runs the lights");
    }
  }

  function treeLights(st) {
    const p = st && st.phase;
    return {
      pre: p === "pre" || p === "stage" || p === "a1" || p === "a2" || p === "a3" || p === "green" || p === "red",
      stage: p === "stage" || p === "a1" || p === "a2" || p === "a3" || p === "green" || p === "red",
      a1: p === "a1" || p === "a2" || p === "a3" || p === "green" || p === "red",
      a2: p === "a2" || p === "a3" || p === "green" || p === "red",
      a3: p === "a3" || p === "green" || p === "red",
      green: p === "green",
      redL: !!(st && st.foul),
      redR: !!(st && st.aiFoul && (p === "green" || p === "red"))
    };
  }

  function paintTreeDom(st) {
    const el = $("dragTree");
    if (!el) return;
    const L = treeLights(st);
    el.querySelectorAll("[data-bulb]").forEach(function (b) {
      const id = b.getAttribute("data-bulb");
      let on = false;
      if (id === "pre") on = L.pre;
      if (id === "stage") on = L.stage;
      if (id === "a1") on = L.a1;
      if (id === "a2") on = L.a2;
      if (id === "a3") on = L.a3;
      if (id === "green") on = L.green;
      if (id === "redL") on = L.redL;
      if (id === "redR") on = L.redR;
      b.classList.toggle("on", on);
    });
  }

  function stepAi(dt, now) {
    const ai = G.ai;
    if (!ai) return;
    const st = G.tree || {};
    const go = G.phase === "race" && st.greenAt && now >= (st.aiGoAt || st.greenAt);
    if (!go || ai.done) {
      if (!go) { ai.speed = 0; }
      ai.x += Math.cos(ai.h) * ai.speed * dt;
      return;
    }
    const boostOn = ai.boost > 0.05;
    if (boostOn) ai.boost = Math.max(0, ai.boost - dt * 0.38);
    const vmax = ai.vmax * (boostOn ? 1.16 : 1);
    const acc = ai.acc * (boostOn ? 1.4 : 1) - ai.speed * 0.5;
    ai.speed = clamp(ai.speed + acc * dt, 0, vmax);
    ai.h = 0;
    ai.y += (G.track.lane - ai.y) * clamp(dt * 6, 0, 1);
    ai.x += ai.speed * dt;
  }

  function finishDrag() {
    if (G.phase === "done") return;
    G.phase = "done";
    const st = G.tree;
    const pMs = st.playerMs;
    const aMs = st.aiMs;
    const win = !st.foul && (st.aiFoul || (pMs != null && (aMs == null || pMs < aMs)));
    if (!Array.isArray(G.save.rounds)) G.save.rounds = [];
    G.save.rounds.unshift({
      name: (G.save.name || "Operator").slice(0, 24),
      craft: G.craft.name,
      track: G.track.name,
      trackId: G.track.id,
      ms: pMs,
      rt: st.rt,
      aiMs: aMs,
      win: win,
      foul: !!st.foul,
      at: Date.now()
    });
    G.save.rounds = G.save.rounds.slice(0, 40);
    writeSave(G.save);
    const title = st.foul ? "Red light" : (win ? "Lane 1 wins" : "Lane 2 wins");
    log(title + " · ET " + fmt(pMs) + " vs " + fmt(aMs));
    showSheet(
      "<p class='kicker'>Drag · " + G.track.feet + " ft</p><h2>" + title + "</h2>" +
      "<p class='lore'>You RT <b>" + (st.rt != null ? (st.rt / 1000).toFixed(3) + "s" : "—") + "</b> · ET <b>" + fmt(pMs) + "</b>" +
      (st.trapMph != null ? " · " + Math.round(st.trapMph) + " mph" : "") + "</p>" +
      "<p class='lore'>AI RT <b>" + (st.aiFoul ? "foul" : (st.aiRt != null ? st.aiRt.toFixed(3) + "s" : "—")) +
      "</b> · ET <b>" + fmt(aMs) + "</b></p>" +
      donateHtml() +
      "<div class='modes'><button class='btn gold' id='again'>Restage (F)</button><button class='btn' id='toMenu'>Menu</button></div>"
    );
    $("again").onclick = function () { spawnDrag(true); };
    $("toMenu").onclick = menu;
  }

  function tickDrag(now) {
    if (G.phase === "done") {
      heatHud(now);
      draw(now);
      return;
    }
    const tr = G.track;
    const st = G.tree || { phase: "off" };
    const k = G.keys;
    const throttle = !!(k.KeyW || k.ArrowUp);
    if (overlayOpen() && (G.phase === "race" || G.phase === "tree")) {
      if (G._last && G.phase === "race" && G.t0) G.t0 += now - G._last;
      G._last = now;
      heatHud(now);
      draw(now);
      return;
    }
    if (G.phase === "tree") {
      const t = (now - st.t0) / 1000;
      if (t < 0.4) st.phase = "pre";
      else if (t < 0.9) st.phase = "stage";
      else if (t < 1.4) st.phase = "a1";
      else if (t < 1.9) st.phase = "a2";
      else if (t < 2.4) st.phase = "a3";
      else if (st.phase !== "green" && st.phase !== "red") {
        st.phase = st.foul ? "red" : "green";
        st.greenAt = now;
        st.aiGoAt = now + st.aiRt * 1000;
        G.phase = "race";
        G.t0 = now;
        log(st.foul ? "Red-light start." : "Green.");
      }
      if (throttle && t < 2.4 && st.phase !== "green") {
        st.foul = true;
      }
    }
    const dt = Math.min(0.033, G._last ? (now - G._last) / 1000 : 0.016);
    G._last = now;
    const locked = G.phase === "tree" && !st.foul;
    if (G.phase === "drag_idle" || G.phase === "race" || (G.phase === "tree" && st.foul)) {
      stepCar(dt);
    } else if (locked) {
      G.car.speed = 0;
      G.car.x = tr.startX;
      G.car.y = -tr.lane;
      G.car.h = 0;
    }
    if (G.phase === "race" && st.greenAt && !st.launched && throttle) {
      st.launched = true;
      st.rt = now - st.greenAt;
    }
    stepAi(dt, now);
    if (G.phase === "race") {
      const px = G.car.x - tr.startX;
      if (st.ft60 == null && px >= 20) st.ft60 = now - G.t0;
      if (!st.playerDone && G.car.x >= tr.finishX) {
        st.playerDone = true;
        st.playerMs = now - G.t0;
        st.trapMph = Math.abs(G.car.speed) * 2.04545;
        log("Trap · " + fmt(st.playerMs) + " · " + Math.round(st.trapMph) + " mph");
      }
      if (G.ai && !st.aiDone && G.ai.x >= tr.finishX) {
        st.aiDone = true;
        st.aiMs = now - G.t0;
        st.aiMph = Math.abs(G.ai.speed) * 2.04545;
        log("Lane 2 trap · " + fmt(st.aiMs));
      }
      if ((st.playerDone && st.aiDone) ||
          ((st.playerDone || st.aiDone) && now - G.t0 > 14000) ||
          (now - G.t0 > 28000)) finishDrag();
    }
    paintTreeDom(st);
    if (use3d && window.Rally3D && Rally3D.setTree) Rally3D.setTree(treeLights(st));
    heatHud(now);
    draw(now);
  }

  function stepCar(dt) {
    const c = G.craft;
    const k = G.keys;
    const throttle = (k.KeyW || k.ArrowUp) ? 1 : 0;
    const brake = (k.KeyS || k.ArrowDown || k.Space) ? 1 : 0;
    const ebrake = !!k.ShiftLeft;
    let steerIn = 0;
    if (k.KeyA || k.ArrowLeft) steerIn -= 1;
    if (k.KeyD || k.ArrowRight) steerIn += 1;
    if (opt("invertSteer")) steerIn *= -1;
    G.car.steer += (steerIn - G.car.steer) * clamp(dt * 8, 0, 1);
    const boostOn = !!k.ShiftRight && G.car.boost > 0.04 && !ebrake;
    const proj0 = project(G.car, G.track.samples, G.lastS, G.track.closed !== false);
    const on0 = Math.abs(proj0.lat) <= G.track.width;
    if (boostOn) G.car.boost = Math.max(0, G.car.boost - dt * 0.42);
    else if (on0) G.car.boost = Math.min(1, G.car.boost + dt * 0.18 * c.boost);
    let grip = c.grip * (on0 ? 1 : 0.32);
    if (ebrake) grip *= 0.26;
    const vmax = c.vmax * (boostOn ? 1.18 : 1);
    const acc = c.acc * throttle * (boostOn ? 1.45 : 1) - brake * 52 - (ebrake ? 36 : 0) - G.car.speed * 0.55;
    G.car.speed = clamp(G.car.speed + acc * dt, -18, vmax);
    const turn = G.car.steer * c.turn * (0.35 + 0.65 * (1 - Math.abs(G.car.speed) / (vmax + 8)));
    const want = turn * (Math.abs(G.car.speed) / 18) * (ebrake ? 1.65 : 1);
    const yawCap = grip * (ebrake ? 4.4 : 2.8);
    const limited = clamp(want, -yawCap, yawCap);
    G.car.h += limited * dt;
    if (ebrake && Math.abs(G.car.speed) > 16) {
      G.car.speed *= (1 - 0.42 * dt);
      G.sparks = Math.max(G.sparks, 0.85);
    }
    if (Math.abs(want) > Math.abs(limited) + 0.15 && Math.abs(G.car.speed) > 28) {
      G.car.speed *= (1 - 0.55 * dt);
      G.sparks = 1;
    } else if (!ebrake) G.sparks *= 0.9;
    G.car.x += Math.cos(G.car.h) * G.car.speed * dt;
    G.car.y += Math.sin(G.car.h) * G.car.speed * dt;
    let proj = project(G.car, G.track.samples, G.lastS, G.track.closed !== false);
    const hw = G.track.width;
    if (Math.abs(proj.lat) > hw) {
      const extra = Math.abs(proj.lat) - hw;
      const dir = proj.lat >= 0 ? 1 : -1;
      G.car.x -= (-proj.hy) * dir * extra;
      G.car.y -= proj.hx * dir * extra;
      G.car.speed *= 0.7;
      G.car.h += wrapDelta(Math.atan2(proj.hy, proj.hx) - G.car.h, Math.PI * 2) * 0.12;
      proj = project(G.car, G.track.samples, G.lastS, G.track.closed !== false);
    }
    return proj;
  }

  function crossed(prev, now, target, total) {
    if (total < 8) return false;
    if (prev <= now) return prev <= target && now > target;
    return prev <= target || now > target;
  }

  function heatHud(now) {
    if (G.track && G.track.kind === "drag") {
      const st = G.tree || {};
      const elapsed = G.phase === "race" && G.t0 ? now - G.t0 : 0;
      if ($("lapPill")) $("lapPill").textContent = (G.track.feet || "") + " FT";
      if ($("hudMeta")) {
        $("hudMeta").innerHTML =
          "<span>RT <b>" + (st.rt != null ? (st.rt / 1000).toFixed(3) : "—") + "</b></span>" +
          "<span>ET <b>" + fmt(st.playerMs != null ? st.playerMs : elapsed) + "</b></span>";
      }
      if ($("speedo")) {
        const mph = Math.abs(G.car.speed) * 2.04545;
        $("speedo").innerHTML = Math.round(mph) + "<small>MPH</small>";
      }
      if ($("boostFill")) $("boostFill").style.width = Math.round(G.car.boost * 100) + "%";
      if ($("heatCard")) {
        $("heatCard").innerHTML = "<p><b>" + G.track.name + "</b></p><p>" +
          (G.phase === "drag_idle" ? "Roll to the tree · press F" : G.phase === "tree" ? "Tree · hold" : G.phase) +
          "</p><p>60' <b>" + fmt(st.ft60) + "</b></p>";
      }
      if ($("secCard")) {
        $("secCard").innerHTML = "You " + fmt(st.playerMs) + (st.foul ? " FOUL" : "") +
          "<br>AI " + fmt(st.aiMs) + (st.aiFoul ? " FOUL" : "");
      }
      if ($("ghostCard")) {
        $("ghostCard").innerHTML = G.ai
          ? "Lane 2 AI · RT " + (st.aiFoul ? "foul" : (st.aiRt != null && G.phase !== "drag_idle" ? st.aiRt.toFixed(3) + "s" : "—"))
          : "No opponent.";
      }
      if ($("dragHud")) {
        $("dragHud").innerHTML = "RT " + (st.rt != null ? (st.rt / 1000).toFixed(3) : "—") +
          " · ET " + fmt(st.playerMs != null ? st.playerMs : elapsed) +
          " · AI " + fmt(st.aiMs);
      }
      if ($("dockStatus")) {
        $("dockStatus").textContent = G.phase === "drag_idle" ? "F to stage" :
          (G.phase === "tree" ? "Tree…" : (st.foul ? "Red light" : "On the power"));
      }
      if ($("hint") && G.phase === "drag_idle") $("hint").textContent = "Drive to the tree · F stages both lanes and runs the lights";
      return;
    }
    const elapsed = G.phase === "race" ? now - G.t0 : 0;
    if ($("lapPill")) $("lapPill").textContent = "LAP " + Math.min(G.laps, G.lap + 1) + "/" + G.laps;
    if ($("hudMeta")) {
      $("hudMeta").innerHTML =
        "<span>Time <b>" + fmt(elapsed) + "</b></span>" +
        "<span>Best <b>" + fmt(G.bestMs) + "</b></span>";
    }
    if ($("speedo")) $("speedo").innerHTML = Math.round(Math.abs(G.car.speed)) + "<small>YD/S</small>";
    if ($("boostFill")) $("boostFill").style.width = Math.round(G.car.boost * 100) + "%";
    if ($("heatCard")) {
      $("heatCard").innerHTML = "<p><b>" + G.track.name + "</b></p><p>" + G.craft.name + " · " +
        (G.phase === "count" ? "countdown" : G.phase) + "</p><p>Lap time <b>" + fmt(elapsed) + "</b></p>";
    }
    if ($("secCard")) {
      $("secCard").innerHTML = G.gates.map(function (g, i) {
        return "S" + (i + 1) + " " + (g ? "■" : "□");
      }).join(" · ");
    }
    if ($("ghostCard")) {
      $("ghostCard").innerHTML = G.ghost
        ? "Ghost on · " + fmt(G.ghost.ms)
        : "No ghost for this craft yet.";
    }
    if ($("dockStatus")) $("dockStatus").textContent = G.phase === "count" ? "Lights…" : (G.sparks > 0.4 ? "Drifting" : "On line");
  }

  function ghostAt(elapsed) {
    const g = G.ghost;
    if (!g || !g.samples || !g.samples.length) return null;
    const t = elapsed / 1000;
    const sm = g.samples;
    if (t <= sm[0].t) return sm[0];
    if (t >= sm[sm.length - 1].t) return sm[sm.length - 1];
    for (let i = 1; i < sm.length; i++) {
      if (sm[i].t >= t) {
        const a = sm[i - 1], b = sm[i];
        const u = (t - a.t) / Math.max(0.001, b.t - a.t);
        const dh = wrapDelta(b.h - a.h, Math.PI * 2);
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, h: a.h + dh * u };
      }
    }
    return sm[sm.length - 1];
  }

  function finishHeat(ms) {
    G.phase = "done";
    const key = G.track.id + "|" + G.craft.id;
    let beat = false;
    if (!G.save.ghosts) G.save.ghosts = {};
    if (!G.save.ghosts[key] || ms < G.save.ghosts[key].ms) {
      G.save.ghosts[key] = { ms: ms, samples: G.rec.slice() };
      beat = true;
    }
    if (!Array.isArray(G.save.rounds)) G.save.rounds = [];
    G.save.rounds.unshift({
      name: (G.save.name || "Operator").slice(0, 24),
      craft: G.craft.name,
      track: G.track.name,
      trackId: G.track.id,
      ms: ms,
      laps: G.laps,
      at: Date.now(),
      beat: beat
    });
    G.save.rounds = G.save.rounds.slice(0, 40);
    writeSave(G.save);
    log((beat ? "New ghost. " : "Heat closed. ") + fmt(ms));
    showSheet(
      "<p class='kicker'>Heat closed</p><h2>" + fmt(ms) + "</h2>" +
      "<p class='lore'>" + G.track.name + " · " + G.craft.name + (beat ? " · ghost rewritten" : "") + "</p>" +
      donateHtml() +
      "<div class='modes'><button class='btn gold' id='again'>Replay</button><button class='btn' id='toMenu'>Menu</button></div>"
    );
    $("again").onclick = function () { spawnOnGrid(); };
    $("toMenu").onclick = menu;
  }

  function tick(now) {
    requestAnimationFrame(tick);
    if (G.mode !== "race" || !G.track) return;
    if (G.track.kind === "drag") { tickDrag(now); return; }
    if (overlayOpen() && G.phase === "race") {
      if (G._last) G.t0 += now - G._last;
      G._last = now;
      heatHud(now);
      draw(now);
      return;
    }
    if (G.phase === "count") {
      const u = (now - G.countT) / 700;
      const n = 3 - Math.floor(u);
      const flash = $("countFlash");
      if (flash) {
        flash.classList.remove("hidden");
        flash.textContent = n > 0 ? String(n) : "GO";
      }
      if (u >= 4) {
        if (flash) flash.classList.add("hidden");
        G.phase = "race";
        G.t0 = now;
        log("Green.");
      }
      heatHud(now);
      draw(now);
      return;
    }
    if (G.phase !== "race") {
      heatHud(now);
      draw(now);
      return;
    }
    const dt = Math.min(0.033, G._last ? (now - G._last) / 1000 : 0.016);
    G._last = now;
    const proj = stepCar(dt);
    const elapsed = now - G.t0;
    if ((G.rec.length < 2 || elapsed / 1000 - G.rec[G.rec.length - 1].t > 0.05) && G.rec.length < 2400) {
      G.rec.push({ t: elapsed / 1000, x: G.car.x, y: G.car.y, h: G.car.h });
    }
    G.track.sectors.forEach(function (frac, i) {
      const target = frac * proj.len;
      if (!G.gates[i] && crossed(G.lastS, proj.s, target, proj.len)) {
        G.gates[i] = true;
        G.splits.push(elapsed);
        log("Sector " + (i + 1) + " · " + fmt(elapsed));
      }
    });
    if (G.gates.every(Boolean) && crossed(G.lastS, proj.s, 0, proj.len) && G.lastS > proj.len * 0.7) {
      G.lap += 1;
      G.gates = [false, false, false];
      log("Lap " + G.lap + " · " + fmt(elapsed));
      if (G.lap >= G.laps) {
        finishHeat(elapsed);
      }
    }
    G.lastS = proj.s;
    heatHud(now);
    draw(now);
  }

  function draw(now) {
    const elapsed = G.phase === "race" ? now - G.t0 : 0;
    const gh = opt("ghost") ? ghostAt(elapsed) : null;
    if (use3d && window.Rally3D && Rally3D.active()) {
      Rally3D.setState({ car: G.car, ghost: gh, ai: G.ai, sparks: G.sparks, reduceFx: opt("reduceFx") });
      return;
    }
    if (!ctx || !G.track) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const c = ctx;
    c.fillStyle = "#071018";
    c.fillRect(0, 0, w, h);
    const scale = 2.1;
    c.save();
    c.translate(w / 2, h * 0.62);
    c.rotate(-G.car.h + Math.PI / 2);
    c.translate(-G.car.x * scale, -G.car.y * scale);
    c.strokeStyle = "#1a3a28";
    c.lineWidth = (G.track.width + 4.5) * 2 * scale;
    c.lineJoin = "round";
    c.beginPath();
    G.track.pts.forEach(function (p, i) {
      if (i === 0) c.moveTo(p.x * scale, p.y * scale);
      else c.lineTo(p.x * scale, p.y * scale);
    });
    c.closePath();
    c.stroke();
    c.strokeStyle = "#334";
    c.lineWidth = G.track.width * 2 * scale;
    c.stroke();
    c.strokeStyle = "#fbbf24";
    c.lineWidth = 2;
    c.stroke();
    if (gh) {
      c.fillStyle = "rgba(192,132,252,.7)";
      c.beginPath();
      c.arc(gh.x * scale, gh.y * scale, 6, 0, Math.PI * 2);
      c.fill();
    }
    if (G.ai) {
      c.fillStyle = "rgba(251,191,36,.85)";
      c.beginPath();
      c.arc(G.ai.x * scale, G.ai.y * scale, 7, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = G.craft.color;
    c.beginPath();
    c.arc(G.car.x * scale, G.car.y * scale, 7, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function help() {
    showSheet(
      "<p class='kicker'>How to play</p><h2>Haven Rally</h2>" +
      "<ol class='lore'><li>W throttle, Space or S brake, A D steer. Left Shift is e-brake / drift. Right Shift boosts while the gold bar lasts.</li>" +
      "<li>Drag: F at the tree stages both lanes and runs a sportsman Christmas tree vs AI. Leave before green is a red-light foul.</li>" +
      "<li>Stay on the ribbon. Off-track dumps speed. Drift when you ask more turn than grip.</li>" +
      "<li>Hit sectors in order, then the start line. Three laps (two on endless).</li>" +
      "<li>A faster finish writes the ghost for this circuit + craft.</li>" +
      "<li>Options (title card or dock) holds ghost, camera, HUD. New rows land there as the game grows.</li></ol>" +
      "<p class='lore'><a href='./whitepaper.html'>Whitepaper</a> is the spec.</p>" +
      "<button class='btn gold' id='hk'>Back to grid</button>"
    );
    $("hk").onclick = hideOverlay;
  }

  function statRow(label, val, max) {
    const pct = Math.round(clamp(val / max, 0, 1) * 100);
    return "<div class='stat-row'><span>" + label + "</span><div class='stat-bar'><i style='width:" + pct + "%'></i></div><b>" + val + "</b></div>";
  }

  function garage() {
    if (window.HavenCar) HavenCar.closeStudio();
    const c = craftOf(G.save.craft);
    G.save.craft = c.id;
    writeSave(G.save);
    showSheet(
      "<div class='title-screen garage-screen'>" +
        "<div class='garage-stage'>" +
          "<canvas id='garageCanvas'></canvas>" +
          "<img class='garage-fallback' id='garageFallback' src='" + (c.hero || c.src) + "' alt='" + c.name + "'>" +
          "<div class='garage-stage-fade'></div>" +
          "<p class='garage-hint'>Drag to orbit · Apex Mk I is the base chassis</p>" +
        "</div>" +
        "<div class='title-panel'>" +
          "<p class='kicker'>Garage · bay 01 live</p>" +
          "<h1>" + c.name + "</h1>" +
          "<p class='title-tag'>" + c.tag + "</p>" +
          "<p class='lore'>" + c.lore + "</p>" +
          "<div class='stat-block'>" +
            statRow("Accel", c.acc, 42) +
            statRow("Vmax", c.vmax, 100) +
            statRow("Turn", c.turn, 2.6) +
            statRow("Grip", c.grip, 1.3) +
            statRow("Boost", c.boost, 1.5) +
          "</div>" +
          "<p class='kicker' style='margin-top:.85rem'>Bays</p>" +
          "<div class='cast-grid garage-bays'>" +
            "<button type='button' class='cast on' data-cast='" + c.id + "'>" +
              "<img src='" + c.src + "' alt='" + c.name + "'><b>" + c.name + "</b><span>" + c.tag + "</span></button>" +
            LOCKED_BAYS.map(function (b) {
              return "<button type='button' class='cast locked' disabled><span class='cast-soon'>Locked</span><b>" + b.name + "</b><span>" + b.tag + "</span></button>";
            }).join("") +
          "</div>" +
          "<div class='modes'>" +
            "<button type='button' class='btn gold' data-go='confirmCraft'>Lock in chassis</button>" +
            "<button type='button' class='btn' data-go='title'>Back</button>" +
          "</div>" +
          donateHtml() +
        "</div></div>",
      true
    );
    G._sheet = "garage";
    const cv = $("garageCanvas");
    const fb = $("garageFallback");
    const paint = parseInt(String(c.color).replace("#", ""), 16);
    const ok3 = cv && window.THREE && window.HavenCar && HavenCar.openStudio(cv, { paint: paint });
    if (ok3) {
      requestAnimationFrame(function () {
        HavenCar.resizeStudio();
        requestAnimationFrame(function () {
          HavenCar.resizeStudio();
          if (fb && HavenCar.studioReady && HavenCar.studioReady()) fb.classList.add("hidden");
        });
      });
    } else if (cv) cv.classList.add("hidden");
  }

  function menu() {
    G.mode = "menu";
    G.phase = "idle";
    showDragUi(false);
    if (window.HavenCar) HavenCar.closeStudio();
    $("app").classList.add("hidden");
    $("boot").classList.add("hidden");
    const name = (G.save.name || "").replace(/[<>]/g, "");
    const c = craftOf(G.save.craft);
    showSheet(
      "<div class='title-screen'>" +
        "<div class='title-art'><img src='./assets/apex-hero.jpg' alt='Apex Mk I'><div class='title-art-fade'></div></div>" +
        "<div class='title-panel'>" +
          "<p class='kicker'>Δ9Φ963 · chatagent.ca</p>" +
          "<h1>HAVEN RALLY</h1>" +
          "<p class='title-tag'>Beat the ghost. Hold the line. Boost is a debt.</p>" +
          "<p class='lore'>W throttle · Space brake · L-Shift drift · R-Shift boost · R restart</p>" +
          "<div class='modes' style='margin:.55rem 0 0'><button type='button' class='btn' id='menuRadio'>Play radio</button></div>" +
          "<p class='lore' style='margin:.35rem 0 0'><a href='https://ffm.to/eovnvo9' target='_blank' rel='noopener noreferrer'>Stream Excavationpro</a> · <a href='https://asiancoastline.com/listen.html' target='_blank' rel='noopener'>Free listen</a></p>" +
          "<label style='margin-top:.85rem;display:block'>Operator name</label>" +
          "<input class='name' id='nm' maxlength='24' value='" + name.replace(/'/g, "") + "' placeholder='Operator'>" +
          "<p class='kicker' style='margin-top:.75rem'>Chassis</p>" +
          "<div class='garage-chip'>" +
            "<img src='" + c.src + "' alt='" + c.name + "'>" +
            "<div><b>" + c.name + "</b><span>" + c.tag + " · base model</span></div>" +
            "<button type='button' class='btn gold' data-go='garage'>Garage</button>" +
          "</div>" +
          "<div class='mode-grid'>" +
            "<button type='button' class='mode-card' data-go='garage'><b>Garage</b><span>Studio turntable. One bay live — more crafts later.</span></button>" +
            "<button type='button' class='mode-card' data-go='pine'><b>Pine Coil</b><span>" + PINE.lore + "</span></button>" +
            "<button type='button' class='mode-card' data-go='coral'><b>Coral Coast</b><span>" + CORAL.lore + "</span></button>" +
            "<button type='button' class='mode-card' data-go='star'><b>Singularity Ring</b><span>" + STAR.lore + "</span></button>" +
            "<button type='button' class='mode-card' data-go='endless'><b>Endless coil</b><span>Seeded loop. Two laps. Make a ghost.</span></button>" +
            "<button type='button' class='mode-card' data-go='drag8'><b>Drag · 1/8 mile</b><span>660 ft. Short strip vs AI. F runs the tree.</span></button>" +
            "<button type='button' class='mode-card' data-go='drag1k'><b>Drag · 1000 ft</b><span>NHRA 1000-foot trap vs AI.</span></button>" +
            "<button type='button' class='mode-card' data-go='drag14'><b>Drag · 1/4 mile</b><span>1320 ft. Full sportsman tree.</span></button>" +
            "<button type='button' class='mode-card' data-go='options'><b>Options</b><span>Ghost, camera, HUD. Extra rows as the game grows.</span></button>" +
            "<a class='mode-card' href='./ledger.html'><b>Local ledger</b><span>This browser’s hall of heats.</span></a>" +
            "<a class='mode-card' href='./whitepaper.html'><b>Whitepaper</b><span>Physics, circuits, out of scope.</span></a>" +
          "</div>" +
          donateHtml() +
          "<p class='lore' style='margin-top:.8rem'><a href='/games/'>All games</a> · Support keeps the arcade on.</p>" +
        "</div></div>",
      true
    );
    $("overlay").onclick = function (e) {
      const pick = e.target.closest("[data-cast]");
      if (pick) {
        G.save.craft = pick.getAttribute("data-cast");
        writeSave(G.save);
        document.querySelectorAll(".cast").forEach(function (el) {
          el.classList.toggle("on", el.getAttribute("data-cast") === G.save.craft);
        });
        G.craft = craftOf(G.save.craft);
        return;
      }
      if (e.target.closest("#menuRadio")) {
        const rp = $("radioPlay");
        if (rp) rp.click();
        return;
      }
      const b = e.target.closest("[data-go]");
      if (!b) return;
      const nm = ($("nm") && $("nm").value || "").replace(/[<>]/g, "").trim().slice(0, 24);
      if (nm) { G.save.name = nm; writeSave(G.save); }
      const go = b.getAttribute("data-go");
      if (go === "options") { optionsMenu(); return; }
      if (go === "garage") { garage(); return; }
      if (go === "confirmCraft" || go === "title") { menu(); return; }
      if (go === "pine") startHeat(PINE);
      if (go === "coral") startHeat(CORAL);
      if (go === "star") startHeat(STAR);
      if (go === "endless") startHeat(randomTrack((Date.now() ^ (Math.random() * 1e9)) >>> 0));
      if (go === "drag8") startHeat(DRAG_EIGHTH);
      if (go === "drag1k") startHeat(DRAG_THOU);
      if (go === "drag14") startHeat(DRAG_QUARTER);
    };
  }

  window.addEventListener("keydown", function (e) {
    if (e.target && e.target.tagName === "INPUT") return;
    if (e.key === "Escape") {
      if (overlayOpen() && G.mode !== "menu") { hideOverlay(); return; }
      if (overlayOpen() && (G._sheet === "options" || G._sheet === "garage")) { menu(); return; }
      menu();
      return;
    }
    if (G.mode === "menu" || overlayOpen()) return;
    G.keys[e.code] = true;
    if (e.key === "r" || e.key === "R") { e.preventDefault(); spawnOnGrid(); }
    if ((e.key === "f" || e.key === "F") && G.track && G.track.kind === "drag") {
      e.preventDefault();
      spawnDrag(true);
    }
    if (e.key === " " || e.key === "Enter") e.preventDefault();
  });
  window.addEventListener("keyup", function (e) { G.keys[e.code] = false; });
  window.addEventListener("blur", function () { G.keys = {}; });

  if ($("btnHelp")) $("btnHelp").onclick = help;
  if ($("btnOptions")) $("btnOptions").onclick = optionsMenu;
  if ($("btnPaper")) $("btnPaper").onclick = function () { location.href = "./whitepaper.html"; };
  if ($("btnRestart")) $("btnRestart").onclick = function () { if (G.mode === "race") spawnOnGrid(); };
  if ($("btnMenu")) $("btnMenu").onclick = menu;
  window.addEventListener("resize", function () {
    if (use3d && window.Rally3D) Rally3D.resize();
    if (window.HavenCar) HavenCar.resizeStudio();
  });

  $("boot").classList.add("hidden");
  G.craft = craftOf(G.save.craft);
  applyOptions();
  menu();
  requestAnimationFrame(tick);
})();
