/* Haven Rally — follows ./whitepaper.html */
(function () {
  "use strict";
  const SAVE_KEY = "lygo-haven-rally-v1";
  const YD = 0.9144;
  const G0 = 9.81;
  const RHO = 1.225;
  const DEFAULT_GEARS = [3.91, 2.48, 1.78, 1.36, 1.10, 0.89];
  const DEFAULT_CRAFT = {
    id: "apex", name: "Apex Mk I", tag: "Lattice GT",
    src: "./assets/apex-plate.jpg", hero: "./assets/apex-hero.jpg",
    lore: "Base chassis. RWD GT. Slide charges boost. Future bays use the same powertrain math.",
    color: "#165e66",
    massKg: 1380,
    hp: 470,
    torque: 420,
    idle: 900,
    redline: 7800,
    tqRpm: 4200,
    hpRpm: 7200,
    gears: DEFAULT_GEARS.slice(),
    finalDrive: 3.73,
    wheelRadius: 0.33,
    drive: "rwd",
    cd: 0.52,
    area: 2.1,
    crr: 0.015,
    mu: 1.32,
    brakeMu: 1.58,
    turn: 2.05,
    boost: 1.1,
    eta: 0.88,
    upgHp: 0,
    upgTq: 0
  };
  const CRAFTS = [Object.assign({}, DEFAULT_CRAFT)];
  const LOCKED_BAYS = [
    { name: "Bay 02", tag: "Soon" },
    { name: "Bay 03", tag: "Soon" }
  ];
  const LANE_W = 4.4;
  const TRACK_LANES = 3;
  const TRACK_HALF = LANE_W * TRACK_LANES * 0.5;

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
  function craftNorm(raw) {
    const c = Object.assign({}, DEFAULT_CRAFT, raw || {});
    c.gears = (c.gears && c.gears.length) ? c.gears.slice() : DEFAULT_GEARS.slice();
    c.hp = (c.hp || 0) + (c.upgHp || 0);
    c.torque = (c.torque || 0) + (c.upgTq || 0);
    c.drive = c.drive === "fwd" || c.drive === "awd" ? c.drive : "rwd";
    return c;
  }
  function craftOf(id) {
    return craftNorm(CRAFTS.find(function (c) { return c.id === id; }) || CRAFTS[0]);
  }
  function driveFrac(c) {
    if (c.drive === "fwd") return { f: 1, r: 0 };
    if (c.drive === "awd") return { f: 0.4, r: 0.6 };
    return { f: 0, r: 1 };
  }
  function engineTorqueNm(c, rpm) {
    const peak = c.torque * 1.35582;
    if (rpm >= c.redline) return peak * 0.12;
    if (rpm <= c.idle * 0.6) return peak * 0.2 * (rpm / (c.idle * 0.6));
    const s = 2100;
    const bell = Math.exp(-Math.pow((rpm - c.tqRpm) / s, 2));
    return peak * (0.42 + 0.58 * bell);
  }
  function roadRpm(c, speedYd, gearIndex) {
    const v = Math.abs(speedYd) * YD;
    const ratio = (c.gears[gearIndex] || c.gears[0]) * c.finalDrive;
    return (v / c.wheelRadius) * ratio * 60 / (Math.PI * 2);
  }
  function topSpeedYd(c) {
    const P = Math.max(1, c.hp) * 745.7;
    const k = 0.5 * RHO * c.cd * c.area;
    return Math.pow(P / Math.max(k, 0.05), 1 / 3) / YD;
  }

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
      width: TRACK_HALF,
      laneW: LANE_W,
      lanes: TRACK_LANES,
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
      width: TRACK_HALF,
      laneW: LANE_W,
      lanes: TRACK_LANES,
      lane: LANE_W,
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
    id: "pine-coil", name: "Pine Coil", theme: "pine-coil", laps: 3,
    lore: "Golden-hour parkland. Three lanes, chain the esses, slide to fill boost.",
    ctrl: loopFromPolar(10, 92, 22, mulberry(19), 0.2)
  });
  const CORAL = makeTrack({
    id: "coral-coast", name: "Coral Coast", theme: "coral-coast", laps: 3,
    lore: "Sunset coast highway. Long straights, then don't overcook the hairpin.",
    ctrl: loopFromPolar(8, 110, 28, mulberry(41), 0.6)
  });
  const STAR = makeTrack({
    id: "singularity-ring", name: "Singularity Ring", theme: "singularity-ring", laps: 3,
    lore: "Night city ring. Neon walls. Boost on the slide, don't miss the apex.",
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

  const RUN_NAMES = ["Gold Hour Coast", "Lattice Bypass", "Neon Harbor", "Coral Overpass", "Apex Line", "Haven Run"];

  function ridgeCtrl(seed) {
    const rng = mulberry(seed >>> 0);
    const st = { x: 0, y: 0, h: 0 };
    const pts = [{ x: 0, y: 0 }];
    function add(dist, dH) {
      const steps = Math.max(3, Math.ceil(dist / 10));
      let k;
      for (k = 1; k <= steps; k++) {
        st.h += dH / steps;
        st.x += Math.cos(st.h) * (dist / steps);
        st.y += Math.sin(st.h) * (dist / steps);
        pts.push({ x: st.x, y: st.y });
      }
    }
    add(90 + rng() * 40, 0);
    let n = 0;
    while (pathLen(pts, false) < 3800 && n < 36) {
      n += 1;
      const roll = rng();
      const dir = rng() < 0.5 ? -1 : 1;
      if (roll < 0.2) add(170 + rng() * 240, (rng() - 0.5) * 0.1);
      else if (roll < 0.4) add(110 + rng() * 90, dir * (0.5 + rng() * 0.75));
      else if (roll < 0.55) {
        add(48 + rng() * 18, dir * 0.42);
        add(52 + rng() * 18, -dir * 0.88);
        add(48 + rng() * 18, dir * 0.42);
      } else if (roll < 0.68) {
        add(36, dir * 0.35);
        add(62 + rng() * 20, dir * (2.15 + rng() * 0.45));
        add(40, dir * 0.3);
      } else if (roll < 0.82) {
        add(80 + rng() * 40, dir * 0.48);
        add(70 + rng() * 30, dir * 0.32);
      } else {
        add(70 + rng() * 40, 0);
        add(42, dir * (0.5 + rng() * 0.25));
      }
      st.h += wrapDelta(0 - st.h, Math.PI * 2) * 0.1;
    }
    add(160 + rng() * 80, wrapDelta(0 - st.h, Math.PI * 2) * 0.35);
    add(80, 0);
    return pts;
  }

  function makeRidgeTrack(seed) {
    seed = seed >>> 0;
    const pts = ridgeCtrl(seed);
    const samples = densifyPath(pts, 5, false);
    const len = pathLen(samples, false);
    const name = RUN_NAMES[seed % RUN_NAMES.length];
    return {
      id: "ridge-" + seed.toString(16),
      name: name,
      theme: "endless",
      lore: "One long start-to-finish highway. Straights, esses, hairpins, a tunnel. Slide to charge boost.",
      width: TRACK_HALF,
      laneW: LANE_W,
      lanes: TRACK_LANES,
      laps: 1,
      pts: pts,
      samples: samples,
      len: len,
      closed: false,
      kind: "ridge",
      sectors: [0.22, 0.48, 0.74],
      seed: seed
    };
  }

  function randomTrack(seed) {
    return makeRidgeTrack(seed);
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
    car: { x: 0, y: 0, h: 0, vh: 0, speed: 0, steer: 0, boost: 1, gear: 1, rpm: 900, thr: 0, brk: 0, shiftT: 0, wheelSlip: 0 },
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
    lastLap: null,
    bestLap: null,
    lapStartMs: 0,
    lapTimes: [],
    hudSpd: 0,
    hudRpm: 800,
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
    G.car = { x: a.x, y: a.y, h: h, vh: h, speed: 0, steer: 0, boost: 1, gear: 1, rpm: 900, thr: 0, brk: 0, shiftT: 0, wheelSlip: 0 };
    G.ai = null;
    G.lap = 0;
    G.lastS = 0;
    G.gates = [false, false, false];
    G.splits = [];
    G.rec = [];
    G.lastLap = null;
    G.bestLap = null;
    G.lapStartMs = 0;
    G.lapTimes = [];
    G.hudSpd = 0;
    G.hudRpm = 800;
    G._ridgeDone = false;
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
    log(tr.name + " · " + G.craft.name + " · " + (tr.kind === "ridge" ? Math.round(tr.len) + " yd to FINISH" : tr.laps + " laps"));
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
    G.car = { x: x0, y: -lane, h: 0, vh: 0, speed: 0, steer: 0, boost: 1, gear: 1, rpm: 900, thr: 0, brk: 0, shiftT: 0, wheelSlip: 0 };
    const c = G.craft;
    G.ai = {
      x: x0, y: lane, h: 0, speed: 0, boost: 1,
      acc: (c.mu * G0 * 0.5) / YD * (0.92 + Math.random() * 0.1),
      vmax: topSpeedYd(c) * (0.96 + Math.random() * 0.07),
      boostMul: c.boost
    };
    G.lap = 0;
    G.lastS = x0;
    G.gates = [false, false, false];
    G.splits = [];
    G.rec = [];
    G.ghost = null;
    G.bestMs = null;
    (G.save.rounds || []).forEach(function (r) {
      if (r.trackId === tr.id && r.ms && !r.foul && (G.bestMs == null || r.ms < G.bestMs)) G.bestMs = r.ms;
    });
    G.lastLap = null;
    G.bestLap = G.bestMs;
    G.lapStartMs = 0;
    G.hudSpd = 0;
    G.hudRpm = 800;
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
      G.car.vh = 0;
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
    G.car.thr = throttle;
    G.car.brk = brake || (ebrake ? 1 : 0);
    let steerIn = 0;
    if (k.KeyA || k.ArrowLeft) steerIn -= 1;
    if (k.KeyD || k.ArrowRight) steerIn += 1;
    if (opt("invertSteer")) steerIn *= -1;
    const spd = Math.abs(G.car.speed);
    const vmaxEst = topSpeedYd(c);
    const spd01 = clamp(spd / (vmaxEst + 6), 0, 1);
    const steerRate = (2.15 + 1.35 * (c.turn / 2.4)) * (1.12 - 0.58 * spd01);
    G.car.steer += (steerIn - G.car.steer) * clamp(dt * steerRate, 0, 1);
    const boostOn = !!k.ShiftRight && G.car.boost > 0.04 && !ebrake;
    const proj0 = project(G.car, G.track.samples, G.lastS, G.track.closed !== false);
    const on0 = Math.abs(proj0.lat) <= G.track.width;
    if (boostOn) G.car.boost = Math.max(0, G.car.boost - dt * 0.42);
    else if (on0) G.car.boost = Math.min(1, G.car.boost + dt * 0.18 * c.boost);
    stepPowertrain(c, G.car, dt, {
      throttle: throttle,
      brake: brake,
      ebrake: ebrake,
      boostOn: boostOn,
      onTrack: on0
    });
    if (G.car.vh == null) G.car.vh = G.car.h;
    const turnAuth = c.turn * 0.62 * (1.08 - 0.58 * spd01);
    let yaw = G.car.steer * turnAuth;
    if (ebrake && spd > 9) {
      yaw += G.car.steer * (0.95 + 0.7 * c.turn) * (0.35 + 0.65 * spd01);
    }
    const wslip = G.car.wheelSlip || 0;
    if (wslip > 0.28 && c.drive === "rwd") yaw += G.car.steer * wslip * 1.15;
    if (wslip > 0.28 && c.drive === "fwd") yaw *= (1 - 0.5 * wslip);
    yaw = clamp(yaw, -2.05, 2.05);
    G.car.h += yaw * dt;
    let latGrip = (c.mu * 0.74) * (on0 ? 1 : 0.3);
    if (ebrake && spd > 10) latGrip *= 0.16;
    else latGrip *= 0.82 + 0.18 * (1 - spd01);
    const slip = wrapDelta(G.car.h - G.car.vh, Math.PI * 2);
    const counter = (G.car.steer * slip) < -0.04;
    let align = latGrip * (ebrake ? 4.2 : 8.4);
    if (ebrake && counter) align *= 1.85;
    else if (ebrake && Math.abs(G.car.steer) > 0.25) align *= 0.62;
    G.car.vh += slip * clamp(align * dt, 0, 1);
    const slipAbs = Math.abs(wrapDelta(G.car.h - G.car.vh, Math.PI * 2));
    if (slipAbs > 0.16 && spd > 12) {
      G.sparks = Math.max(G.sparks, clamp(slipAbs * 1.5, 0, 1));
      if (ebrake) G.car.speed *= (1 - 0.12 * dt);
      if (on0 && !boostOn) G.car.boost = Math.min(1, G.car.boost + dt * 0.42 * c.boost * clamp(slipAbs, 0, 0.8));
    } else if ((G.car.wheelSlip || 0) < 0.25) G.sparks *= 0.88;
    G.car.x += Math.cos(G.car.vh) * G.car.speed * dt;
    G.car.y += Math.sin(G.car.vh) * G.car.speed * dt;
    let proj = project(G.car, G.track.samples, G.lastS, G.track.closed !== false);
    const hw = G.track.width;
    if (Math.abs(proj.lat) > hw) {
      const extra = Math.abs(proj.lat) - hw;
      const dir = proj.lat >= 0 ? 1 : -1;
      G.car.x -= (-proj.hy) * dir * extra;
      G.car.y -= proj.hx * dir * extra;
      G.car.speed *= 0.78;
      const trackH = Math.atan2(proj.hy, proj.hx);
      G.car.h += wrapDelta(trackH - G.car.h, Math.PI * 2) * 0.08;
      G.car.vh += wrapDelta(trackH - G.car.vh, Math.PI * 2) * 0.18;
      proj = project(G.car, G.track.samples, G.lastS, G.track.closed !== false);
    }
    return proj;
  }

  function stepPowertrain(c, car, dt, inp) {
    const gears = c.gears;
    const nG = gears.length;
    if (car.gear == null) car.gear = 1;
    if (car.shiftT == null) car.shiftT = 0;
    if (car.wheelSlip == null) car.wheelSlip = 0;
    const vMs = car.speed * YD;
    const vAbs = Math.abs(vMs);
    if (car.shiftT > 0) car.shiftT -= dt;
    if (vMs < -1.6) car.gear = -1;
    else if (vAbs < 0.9 && !inp.throttle) car.gear = 0;
    else if (car.gear <= 0 && inp.throttle) {
      car.gear = 1;
      car.shiftT = 0.1;
    }
    let gIdx = car.gear < 1 ? 0 : car.gear - 1;
    if (gIdx > nG - 1) gIdx = nG - 1;
    const clutch = (car.gear === 0 || car.shiftT > 0) ? 0 : 1;
    const ratio = clutch === 0 ? 0 : (car.gear < 0 ? -gears[0] * 0.82 : gears[gIdx]) * c.finalDrive;
    let rpm = c.idle;
    if (ratio !== 0) rpm = (vAbs / c.wheelRadius) * Math.abs(ratio) * 60 / (Math.PI * 2);
    if (vAbs < 2.4 && inp.throttle && clutch) rpm = Math.max(rpm, c.idle + inp.throttle * (c.tqRpm - c.idle) * 0.92);
    rpm = rpm + car.wheelSlip * (c.redline - rpm) * 0.85;
    rpm = clamp(rpm, c.idle * 0.7, c.redline + 200);
    if (car.shiftT <= 0 && car.gear > 0) {
      if (rpm > c.redline * 0.93 && car.gear < nG) {
        car.gear += 1;
        car.shiftT = 0.12;
      } else if (rpm < Math.max(c.idle + 900, c.tqRpm * 0.48) && car.gear > 1 && inp.throttle < 0.55) {
        const low = roadRpm(c, car.speed, car.gear - 2);
        if (low < c.redline * 0.88) {
          car.gear -= 1;
          car.shiftT = 0.09;
        }
      }
    }
    const tq = engineTorqueNm(c, rpm) * (inp.boostOn ? 1 + 0.32 * c.boost : 1);
    let Fdrive = clutch * inp.throttle * tq * ratio * c.eta / c.wheelRadius;
    const axEst = car.speed >= 0 ? 1 : -1;
    const df = driveFrac(c);
    const rearLoad = clamp(0.47 + 0.16 * clamp(-axEst * inp.throttle + inp.brake, -1, 1), 0.28, 0.72);
    const frontLoad = 1 - rearLoad;
    const drivenN = c.massKg * G0 * (df.r * rearLoad + df.f * frontLoad);
    const surf = inp.onTrack ? 1 : 0.32;
    const Fmax = Math.max(400, c.mu * drivenN * surf);
    const want = Math.abs(Fdrive);
    if (want > Fmax && clutch && inp.throttle > 0.2) {
      car.wheelSlip = clamp(car.wheelSlip + dt * ((want - Fmax) / (Fmax + 1)) * 2.4, 0, 1);
      Fdrive = Math.sign(Fdrive) * Fmax * (1 - 0.35 * car.wheelSlip);
      G.sparks = Math.max(G.sparks || 0, 0.4 + car.wheelSlip * 0.7);
    } else {
      car.wheelSlip = Math.max(0, car.wheelSlip - dt * 1.8);
    }
    const Fdrag = 0.5 * RHO * c.cd * c.area * vMs * vMs * (vMs >= 0 ? 1 : -1);
    const Froll = c.crr * c.massKg * G0 * (vAbs < 0.15 ? 0 : (vMs >= 0 ? 1 : -1));
    const Fbrk = inp.brake * c.brakeMu * c.massKg * G0 * 0.72 * (vAbs < 0.2 && !inp.throttle ? (vMs >= 0 ? 1 : -1) : (vMs >= 0 ? 1 : -1));
    const Feb = inp.ebrake ? c.mu * c.massKg * G0 * 0.28 * (vMs >= 0 ? 1 : -1) : 0;
    let Fnet = Fdrive - Fdrag - Froll;
    if (vAbs > 0.25 || inp.brake || inp.ebrake) Fnet -= Fbrk * (vAbs > 0.25 ? 1 : 0) + Feb;
    const a = Fnet / c.massKg;
    car.speed += (a / YD) * dt;
    if (inp.brake && !inp.throttle && car.speed < 0 && car.speed > -5) car.speed = 0;
    if (!inp.throttle && Math.abs(car.speed) < 0.35) car.speed = 0;
    car.rpm = rpm;
    car.wheelSlip = car.wheelSlip || 0;
  }

  function gearLabel(g) {
    if (g < 0) return "R";
    if (!g) return "N";
    return String(g);
  }

  function fmtDelta(ms) {
    if (ms == null || !isFinite(ms)) return "DELTA —";
    const s = ms / 1000;
    const sign = s >= 0 ? "+" : "−";
    return "DELTA " + sign + Math.abs(s).toFixed(3);
  }

  function crossed(prev, now, target, total) {
    if (total < 8) return false;
    if (prev <= now) return prev <= target && now > target;
    return prev <= target || now > target;
  }

  function paintRaceHud(now) {
    const racing = G.phase === "race";
    const elapsed = racing && G.t0 ? now - G.t0 : 0;
    const lapMs = racing ? elapsed - (G.lapStartMs || 0) : 0;
    const drag = G.track && G.track.kind === "drag";
    const ridge = G.track && G.track.kind === "ridge";
    const laps = G.track ? G.laps : 3;
    const lapN = Math.min(laps, (G.lap || 0) + 1);
    if ($("rhLap")) {
      $("rhLap").textContent = drag ? (G.track.feet + "′") : (ridge ? "RUN" : (lapN + "/" + laps));
    }
    if ($("rhLapT")) $("rhLapT").textContent = fmt(drag ? elapsed : lapMs);
    if ($("rhSess")) $("rhSess").textContent = fmt(elapsed);
    if ($("rhBest")) $("rhBest").textContent = fmt(G.bestLap);
    if ($("rhLast")) $("rhLast").textContent = fmt(G.lastLap);
    const beat = G.bestMs;
    if ($("rhBeat")) $("rhBeat").textContent = fmt(beat);
    const len = G.track && G.track.len ? G.track.len : 1;
    let prog = 0;
    if (drag && G.track) prog = clamp((G.car.x - G.track.startX) / Math.max(1, G.track.finishX - G.track.startX), 0, 1);
    else prog = clamp((G.lastS || 0) / len, 0, 1);
    if ($("rhProg")) $("rhProg").style.width = Math.round(prog * 100) + "%";
    const deltaEl = $("rhDelta");
    if (deltaEl) {
      let d = null;
      if (drag && beat && racing && prog > 0.04) d = elapsed / prog - beat;
      else if (G.bestLap && racing && prog > 0.06) d = lapMs / prog - G.bestLap;
      else if (beat && racing && laps) d = elapsed - beat * ((G.lap + prog) / laps);
      deltaEl.textContent = d == null ? "DELTA —" : fmtDelta(d);
      deltaEl.classList.toggle("up", d != null && d < -8);
      deltaEl.classList.toggle("down", d != null && d > 12);
    }
    let pos = "P1";
    if (drag && G.ai) pos = G.ai.x > G.car.x + 1.2 ? "P2" : "P1";
    else if (racing && G.ghost && G.ghost.samples && G.track) {
      const gh = ghostAt(elapsed);
      if (gh) {
        const gs = project(gh, G.track.samples, null, G.track.closed !== false).s;
        pos = gs > (G.lastS || 0) + 3 ? "P2" : "P1";
      }
    }
    if ($("rhPos")) $("rhPos").textContent = pos;
    const mph = Math.abs(G.car.speed || 0) * 2.04545;
    G.hudSpd += (mph - (G.hudSpd || 0)) * 0.22;
    G.hudRpm += ((G.car.rpm || 800) - (G.hudRpm || 800)) * 0.28;
    if ($("rhSpd")) $("rhSpd").textContent = String(Math.round(Math.max(0, G.hudSpd)));
    if ($("rhRpm")) $("rhRpm").textContent = String(Math.round(G.hudRpm)).padStart(4, "0");
    const gearEl = $("rhGear");
    if (gearEl) {
      gearEl.textContent = gearLabel(G.car.gear);
      gearEl.classList.toggle("shift", (G.car.shiftT || 0) > 0);
    }
    const red = (G.craft && G.craft.redline) || 7800;
    const rpmN = clamp((G.hudRpm || 0) / red, 0, 1);
    if ($("rhNeedle")) $("rhNeedle").setAttribute("transform", "rotate(" + (-120 + rpmN * 240).toFixed(1) + " 120 128)");
    if ($("rhArc")) $("rhArc").style.strokeDashoffset = String((289 * (1 - rpmN)).toFixed(1));
    const leds = document.querySelectorAll("#rhShift i");
    const nOn = Math.round(rpmN * 7);
    const flash = rpmN > 0.92 && Math.floor(now / 70) % 2 === 0;
    leds.forEach(function (el, i) { el.classList.toggle("on", i < nOn); });
    if ($("rhShift")) $("rhShift").classList.toggle("flash", flash);
    if ($("rhThr")) $("rhThr").style.width = Math.round((G.car.thr || 0) * 100) + "%";
    if ($("rhBrk")) $("rhBrk").style.width = Math.round((G.car.brk || 0) * 100) + "%";
    if ($("rhBoost")) $("rhBoost").style.width = Math.round((G.car.boost || 0) * 100) + "%";
    if ($("rhSectors")) {
      if (drag) {
        const st = G.tree || {};
        $("rhSectors").textContent = "60' " + fmt(st.ft60) + " · TRAP " + (st.trapMph != null ? Math.round(st.trapMph) + " mph" : "—");
      } else {
        $("rhSectors").textContent = (G.gates || [false, false, false]).map(function (g, i) {
          return "S" + (i + 1) + " " + (g ? "■" : "□");
        }).join(" · ");
      }
    }
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
      paintRaceHud(now);
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
    paintRaceHud(now);
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
    if (window.HavenSfx) {
      const radioEl = $("radioEl");
      const radioOn = !!(radioEl && !radioEl.paused && !radioEl.muted && radioEl.volume > 0.02);
      const slipLat = G.car && G.car.h != null && G.car.vh != null
        ? Math.abs(wrapDelta(G.car.h - G.car.vh, Math.PI * 2))
        : 0;
      HavenSfx.tick({
        racing: G.mode === "race" && G.phase !== "done" && G.phase !== "idle",
        rpm: G.car.rpm,
        gear: G.car.gear,
        thr: G.car.thr,
        slip: Math.max(G.car.wheelSlip || 0, G.sparks || 0, slipLat > 0.14 ? slipLat : 0),
        speed: Math.abs(G.car.speed || 0),
        radio: radioOn,
        reduceFx: opt("reduceFx")
      });
    }
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
    if ((G.rec.length < 2 || elapsed / 1000 - G.rec[G.rec.length - 1].t > 0.05) && G.rec.length < 4800) {
      G.rec.push({ t: elapsed / 1000, x: G.car.x, y: G.car.y, h: G.car.h });
    }
    G.track.sectors.forEach(function (frac, i) {
      const target = frac * proj.len;
      if (!G.gates[i] && crossed(G.lastS, proj.s, target, proj.len)) {
        G.gates[i] = true;
        G.splits.push(elapsed);
        log((G.track.kind === "ridge" ? "Checkpoint " : "Sector ") + (i + 1) + " · " + fmt(elapsed));
      }
    });
    if (G.track.kind === "ridge") {
      if (!G._ridgeDone && proj.s >= proj.len * 0.982 && G.lastS < proj.len * 0.982) {
        G._ridgeDone = true;
        G.lap = 1;
        const lapMs = elapsed - (G.lapStartMs || 0);
        G.lastLap = lapMs;
        if (G.bestLap == null || lapMs < G.bestLap) G.bestLap = lapMs;
        finishHeat(elapsed);
      }
    } else if (G.gates.every(Boolean) && crossed(G.lastS, proj.s, 0, proj.len) && G.lastS > proj.len * 0.7) {
      G.lap += 1;
      G.gates = [false, false, false];
      const lapMs = elapsed - (G.lapStartMs || 0);
      G.lastLap = lapMs;
      G.lapTimes.unshift(lapMs);
      if (G.bestLap == null || lapMs < G.bestLap) {
        G.bestLap = lapMs;
        log("Best lap · " + fmt(lapMs));
      }
      G.lapStartMs = elapsed;
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
    if (G.track.closed !== false) c.closePath();
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
      "<li>Circuits: three laps, sectors, then the line. Endless run is one long start-to-finish highway — checkpoints, then FINISH.</li>" +
      "<li>Hold a slide to charge boost. Right Shift spends it.</li>" +
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
            "<p class='lore'>" + String(c.drive || "rwd").toUpperCase() + " · " + c.hp + " hp · " + c.torque + " lb-ft · " +
            c.massKg + " kg · " + (c.gears && c.gears.length) + "-spd</p>" +
            statRow("Power", c.hp, 850) +
            statRow("Torque", c.torque, 750) +
            statRow("Grip μ", c.mu, 2) +
            statRow("Turn", c.turn, 2.6) +
            statRow("Boost", c.boost, 1.6) +
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
          "<p class='title-tag'>Slide the corner. Charge the boost. Beat the ghost.</p>" +
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
            "<button type='button' class='mode-card' data-go='endless'><b>Endless run</b><span>New start-to-finish highway every time. Checkpoints, tunnel, FINISH.</span></button>" +
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
