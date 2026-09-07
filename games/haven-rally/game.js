/* Haven Rally — follows ./whitepaper.html */
(function () {
  "use strict";
  const SAVE_KEY = "lygo-haven-rally-v1";
  const YD = 0.9144;
  const G0 = 9.81;
  const RHO = 1.225;
  const DEFAULT_GEARS = [3.28, 2.08, 1.48, 1.16, 0.97, 0.84];
  const COMBO_MPH = 5;
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
    boostPower: 1,
    boostTank: 1,
    body: "apex",
    eta: 0.88,
    upgHp: 0,
    upgTq: 0
  };
  const BOXCUT = {
    id: "boxcut", name: "Boxcut Mk I", tag: "Short-box race truck",
    src: "./assets/boxcut-plate.jpg", hero: "./assets/boxcut-hero.jpg",
    lore: "Haven short-box. C10 short-fleetside stance, original lattice. Heavier, bigger boost tank, 25% harder boost hit, a bit more bite in the corners. Apex still owns the long highway.",
    color: "#8b1e1e",
    massKg: 1520,
    hp: 405,
    torque: 495,
    idle: 850,
    redline: 6800,
    tqRpm: 3600,
    hpRpm: 6000,
    gears: DEFAULT_GEARS.slice(),
    finalDrive: 3.90,
    wheelRadius: 0.35,
    drive: "rwd",
    cd: 0.62,
    area: 2.55,
    crr: 0.017,
    mu: 1.40,
    brakeMu: 1.52,
    turn: 2.22,
    boost: 1.28,
    boostPower: 1.25,
    boostTank: 1.42,
    body: "boxcut",
    eta: 0.86,
    upgHp: 0,
    upgTq: 0
  };
  const CRAFTS = [Object.assign({}, DEFAULT_CRAFT), Object.assign({}, BOXCUT)];
  const LOCKED_BAYS = [
    { name: "Bay 03", tag: "Soon" }
  ];
  const LANE_W = 4.4;
  const TRACK_LANES = 4;
  const TRACK_HALF = LANE_W * TRACK_LANES * 0.5;
  const CAM_NAMES = ["Chase", "Close", "Hood", "Bumper", "Cockpit", "TV"];

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
  function speedVal(yds) {
    const v = Math.abs(yds || 0);
    return opt("metric") ? v * 3.29184 : v * 2.04545;
  }
  function speedUnit() {
    return opt("metric") ? "km/h" : "mph";
  }
  function fmtSpeed(yds) {
    return Math.round(speedVal(yds)) + " " + speedUnit();
  }
  function fmtSpeedMph(mph) {
    if (mph == null || !isFinite(mph)) return "—";
    if (opt("metric")) return Math.round(mph * 1.60934) + " km/h";
    return Math.round(mph) + " mph";
  }
  function craftNorm(raw) {
    const c = Object.assign({}, DEFAULT_CRAFT, raw || {});
    c.gears = (c.gears && c.gears.length) ? c.gears.slice() : DEFAULT_GEARS.slice();
    c.hp = (c.hp || 0) + (c.upgHp || 0);
    c.torque = (c.torque || 0) + (c.upgTq || 0);
    c.drive = c.drive === "fwd" || c.drive === "awd" ? c.drive : "rwd";
    c.boostTank = c.boostTank > 0 ? c.boostTank : 1;
    c.boostPower = c.boostPower > 0 ? c.boostPower : 1;
    c.body = c.body || c.id || "apex";
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
  function comboVmaxBonusYd() {
    return (G.combo || 0) * (COMBO_MPH / 2.04545);
  }
  function baseTopSpeedYd(c) {
    const P = Math.max(1, c.hp) * 745.7;
    const k = 0.5 * RHO * c.cd * c.area;
    return Math.pow(P / Math.max(k, 0.05), 1 / 3) / YD;
  }
  function topSpeedYd(c) {
    return baseTopSpeedYd(c) + comboVmaxBonusYd();
  }

  const OPTIONS = [
    { key: "ghost", group: "Race", type: "toggle", label: "Show ghost", hint: "Best heat for this circuit + craft rides with you.", def: true },
    { key: "countdown", group: "Race", type: "toggle", label: "Countdown lights", hint: "3–2–1 before green.", def: true },
    { key: "invertSteer", group: "Controls", type: "toggle", label: "Invert steer", hint: "Swap A/D and the arrow keys.", def: false },
    { key: "camView", group: "Camera", type: "range", label: "Camera", hint: "C cycles views.", min: 0, max: 5, step: 1, def: 0 },
    { key: "camDist", group: "Camera", type: "range", label: "Chase distance", min: 0.7, max: 1.7, step: 0.05, def: 1 },
    { key: "camHeight", group: "Camera", type: "range", label: "Chase height", min: 0.7, max: 1.8, step: 0.05, def: 1 },
    { key: "showPilot", group: "HUD", type: "toggle", label: "Pilot plate", def: true },
    { key: "showHint", group: "HUD", type: "toggle", label: "On-track hint", def: true },
    { key: "metric", group: "HUD", type: "toggle", label: "Speed in km/h", hint: "Off: mph (US). On: km/h (Canada).", def: false },
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
    if (key === "metric") G.hudSpd = speedVal(G.car.speed || 0);
    applyOptions();
  }
  function applyOptions() {
    if ($("pilotPlate")) $("pilotPlate").classList.toggle("hidden", !opt("showPilot"));
    if ($("hint")) $("hint").classList.toggle("hidden", !opt("showHint"));
    if (window.Rally3D && Rally3D.setCam) {
      Rally3D.setCam({
        dist: Number(opt("camDist")) || 1,
        height: Number(opt("camHeight")) || 1,
        view: Math.round(Number(opt("camView")) || 0)
      });
    }
    if ($("rhUnit")) $("rhUnit").textContent = opt("metric") ? "km/h" : "MPH";
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
      const shown = s.key === "camView" ? (CAM_NAMES[Math.round(v)] || String(v)) : v.toFixed(2);
      right = "<label class='opt-range'><span data-opt-val='" + s.key + "'>" + shown + "</span>" +
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
          if (valEl) valEl.textContent = spec.key === "camView" ? (CAM_NAMES[Math.round(n)] || String(n)) : n.toFixed(2);
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
    const pts = chaikin(spec.ctrl.slice(), 2, true);
    const samples = densifyPath(pts, 6, true);
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
      lane: LANE_W * 0.5,
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
  function loopFromPolar(n, radius, jitter, rng, spin, squash) {
    const pts = [];
    const sq = squash == null ? 0.7 : squash;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (spin || 0);
      const r = radius + Math.sin(a * 2.2) * jitter * 0.45 + (rng() * 2 - 1) * jitter;
      pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * sq });
    }
    return pts;
  }

  const PINE = makeTrack({
    id: "pine-coil", name: "Pine Coil", theme: "pine-coil", laps: 3,
    lore: "Golden-hour parkland highway. Four lanes, chain the esses, slide to fill boost.",
    ctrl: loopFromPolar(14, 280, 78, mulberry(19), 0.2, 0.72)
  });
  const CORAL = makeTrack({
    id: "coral-coast", name: "Coral Coast", theme: "coral-coast", laps: 3,
    lore: "Sunset coast highway. Four lanes, long straights, then don't overcook the hairpin.",
    ctrl: loopFromPolar(12, 360, 110, mulberry(41), 0.6, 0.52)
  });
  const STAR = makeTrack({
    id: "singularity-ring", name: "Singularity Ring", theme: "singularity-ring", laps: 3,
    lore: "Night city ring. Four lanes of neon. Boost on the slide, don't miss the apex.",
    ctrl: loopFromPolar(16, 250, 52, mulberry(73), 1.1, 0.74)
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
      st.h += dH;
      st.x += Math.cos(st.h) * dist;
      st.y += Math.sin(st.h) * dist;
      pts.push({ x: st.x, y: st.y });
    }
    add(320 + rng() * 80, 0);
    let n = 0;
    while (pathLen(pts, false) < 28000 && n < 220) {
      n += 1;
      const roll = rng();
      const dir = rng() < 0.5 ? -1 : 1;
      if (roll < 0.36) add(560 + rng() * 820, (rng() - 0.5) * 0.06);
      else if (roll < 0.54) add(260 + rng() * 200, dir * (0.2 + rng() * 0.26));
      else if (roll < 0.68) {
        add(110, dir * 0.16);
        add(140, -dir * 0.32);
        add(110, dir * 0.16);
      } else if (roll < 0.78) {
        add(90, dir * 0.18);
        add(160 + rng() * 40, dir * (0.52 + rng() * 0.2));
        add(90, dir * 0.14);
      } else if (roll < 0.9) {
        add(200 + rng() * 90, dir * 0.24);
        add(180 + rng() * 70, dir * 0.16);
      } else {
        add(180 + rng() * 90, 0);
        add(100, dir * (0.24 + rng() * 0.12));
      }
      st.h += wrapDelta(0 - st.h, Math.PI * 2) * 0.05;
    }
    add(360, wrapDelta(0 - st.h, Math.PI * 2) * 0.2);
    add(200, 0);
    return chaikin(pts, 3);
  }

  function chaikin(pts, rounds, closed) {
    let p = pts, r, i, out, a, b;
    for (r = 0; r < rounds; r++) {
      out = [];
      if (closed) {
        for (i = 0; i < p.length; i++) {
          a = p[i];
          b = p[(i + 1) % p.length];
          out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
          out.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
        }
      } else {
        out = [p[0]];
        for (i = 0; i < p.length - 1; i++) {
          a = p[i]; b = p[i + 1];
          out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
          out.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
        }
        out.push(p[p.length - 1]);
      }
      p = out;
    }
    return p;
  }

  function makeRidgeTrack(seed) {
    seed = seed >>> 0;
    const pts = ridgeCtrl(seed);
    const samples = densifyPath(pts, 8, false);
    const sAcc = [0];
    let i;
    for (i = 0; i < samples.length - 1; i++) sAcc.push(sAcc[i] + dist(samples[i], samples[i + 1]));
    const len = sAcc[sAcc.length - 1] || pathLen(samples, false);
    const name = RUN_NAMES[seed % RUN_NAMES.length];
    return {
      id: "ridge-" + seed.toString(16),
      name: name,
      theme: "endless",
      lore: "Four-lane start-to-finish. Light traffic. Right Shift boosts and fires the guns while the bar lasts. Wrecks refill boost and score.",
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
      seed: seed,
      sAcc: sAcc
    };
  }

  function poseAtS(track, s, lat) {
    const samples = track.samples;
    const acc = track.sAcc;
    if (!samples || !acc || samples.length < 2) return { x: 0, y: 0, h: 0, s: 0 };
    const total = acc[acc.length - 1] || 1;
    let t = track.closed !== false ? ((s % total) + total) % total : clamp(s, 0, total - 0.02);
    let lo = 0, hi = acc.length - 1, mid;
    while (lo < hi - 1) {
      mid = (lo + hi) >> 1;
      if (acc[mid] <= t) lo = mid;
      else hi = mid;
    }
    const a = samples[lo];
    const b = samples[Math.min(samples.length - 1, lo + 1)];
    const span = (acc[lo + 1] - acc[lo]) || 1;
    const u = clamp((t - acc[lo]) / span, 0, 1);
    const h = Math.atan2(b.y - a.y, b.x - a.x);
    const px = -Math.sin(h), py = Math.cos(h);
    const lat0 = lat || 0;
    return {
      x: a.x + (b.x - a.x) * u + px * lat0,
      y: a.y + (b.y - a.y) * u + py * lat0,
      h: h,
      s: t
    };
  }
  function laneLat(lane) {
    return (lane - (TRACK_LANES - 1) * 0.5) * LANE_W;
  }
  function spawnTraffic(track) {
    const rng = mulberry((track.seed || 1) ^ 0x91c3e);
    const cars = [];
    const cols = [0xb45309, 0x1d4ed8, 0x0f766e, 0x7c3aed, 0xb91c1c, 0x365314];
    let s = 28 + rng() * 12;
    let i = 0;
    while (s < track.len - 90 && i < 64) {
      const pack = rng() < 0.28 ? 2 : 1;
      let p, lane, pose, along;
      for (p = 0; p < pack && i < 64; p++) {
        lane = (rng() * TRACK_LANES) | 0;
        if (i < 2) lane = i === 0 ? 2 : 0;
        along = s + p * (8 + rng() * 6);
        pose = poseAtS(track, along, laneLat(lane));
        cars.push({
          id: i,
          s: along,
          lane: lane,
          speed: 14 + rng() * 22,
          hp: 1,
          alive: true,
          wreck: 0,
          hitT: 0,
          x: pose.x,
          y: pose.y,
          h: pose.h,
          color: cols[i % cols.length]
        });
        i += 1;
      }
      s += s < 420 ? (36 + rng() * 28) : s < 1600 ? (70 + rng() * 50) : (130 + rng() * 90);
    }
    return cars;
  }
  function resetArcade() {
    G.traffic = [];
    G.gunOn = false;
    G.gunCool = 0;
    G.tracers = [];
    G.score = 0;
    G.combo = 0;
    G.mult = 0;
    G.comboT = 0;
    G.kills = 0;
    G.bestCombo = 1;
    G.multPulse = 0;
    G.pops = [];
  }
  function arcadePop(text, kind) {
    const host = $("arcPops");
    if (!host) return;
    const el = document.createElement("div");
    el.className = "arc-pop" + (kind ? " " + kind : "");
    el.textContent = text;
    host.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, kind === "vo" ? 1400 : 780);
  }
  function wreckTraffic(car) {
    if (!car || !car.alive) return;
    car.alive = false;
    car.wreck = 1;
    car.hp = 0;
    G.kills += 1;
    G.combo += 1;
    G.mult = G.combo;
    if (G.combo > G.bestCombo) G.bestCombo = G.combo;
    const pts = 100 * G.mult;
    G.score += pts;
    G.car.boost = Math.min((G.craft && G.craft.boostTank) || 1, (G.car.boost || 0) + 0.11);
    G.multPulse = 1;
    arcadePop("+" + pts, "pts");
    arcadePop("x" + G.combo + "  +" + (G.combo * COMBO_MPH) + " MPH", "mult");
    const call = comboCallout(G.combo, G.kills);
    if (call) {
      arcadePop(call.label, "vo");
      if (window.HavenSfx && HavenSfx.announce) HavenSfx.announce(call.id);
    }
    log("Wreck · +" + pts + " · x" + G.combo + (call ? " · " + call.label : "") + " · vmax +" + (G.combo * COMBO_MPH) + " mph");
    const el = $("arcMult");
    if (el) {
      el.classList.remove("pop");
      void el.offsetWidth;
      el.classList.add("pop");
    }
    const sc = $("arcScore");
    if (sc) {
      sc.classList.remove("pop");
      void sc.offsetWidth;
      sc.classList.add("pop");
    }
  }
  function stepTraffic(dt) {
    const tr = G.track;
    if (!tr || tr.kind !== "ridge" || !G.traffic) return;
    const cars = G.traffic;
    const px = G.car.x, py = G.car.y;
    let i, c, pose, dx, dy, d;
    for (i = 0; i < cars.length; i++) {
      c = cars[i];
      if (c.alive) {
        c.s += c.speed * dt;
        if (c.s > tr.len - 40) c.s = tr.len * 0.08 + (i * 17) % 400;
        pose = poseAtS(tr, c.s, laneLat(c.lane));
        c.x = pose.x; c.y = pose.y; c.h = pose.h;
        dx = c.x - px; dy = c.y - py;
        d = Math.hypot(dx, dy);
        c.hitT = Math.max(0, (c.hitT || 0) - dt);
        if (d < 3.35 && G.phase === "race" && c.hitT <= 0) {
          G.car.speed *= 0.62;
          G.car.x -= Math.cos(G.car.vh) * 0.55;
          G.car.y -= Math.sin(G.car.vh) * 0.55;
          G.sparks = 1;
          c.s += 6;
          c.hitT = 0.5;
          breakCombo("HIT");
        }
      } else if (c.wreck > 0) {
        c.wreck = Math.max(0, c.wreck - dt * 0.35);
        c.h += dt * 1.8;
      }
    }
  }
  function comboCallout(n, kills) {
    if (kills === 1) return { id: "first-blood", label: "FIRST BLOOD" };
    if (n === 2) return { id: "double-kill", label: "DOUBLE KILL" };
    if (n === 3) return { id: "multi-kill", label: "MULTI KILL" };
    if (n === 4) return { id: "mega-kill", label: "MEGA KILL" };
    if (n === 5) return { id: "ultra-kill", label: "ULTRA KILL" };
    if (n === 6) return { id: "monster-kill", label: "MONSTER KILL" };
    if (n === 7) return { id: "ludicrous-kill", label: "LUDICROUS KILL" };
    if (n === 8) return { id: "killing-spree", label: "KILLING SPREE" };
    if (n === 9) return { id: "rampage", label: "RAMPAGE" };
    if (n === 10) return { id: "dominating", label: "DOMINATING" };
    if (n === 12) return { id: "unstoppable", label: "UNSTOPPABLE" };
    if (n === 15) return { id: "godlike", label: "GODLIKE" };
    if (n === 18) return { id: "wicked-sick", label: "WICKED SICK" };
    if (n >= 20 && n % 5 === 0) return { id: "beyond-godlike", label: "BEYOND GODLIKE" };
    return null;
  }
  function breakCombo(why) {
    if ((G.combo || 0) <= 0) return;
    if (G.combo >= 3 && window.HavenSfx && HavenSfx.announce) HavenSfx.announce("shut-down");
    arcadePop("COMBO BREAK", "break");
    log("Combo break · " + why + " · was x" + G.combo);
    G.combo = 0;
    G.mult = 0;
    G.comboT = 0;
    const el = $("arcMult");
    if (el) {
      el.classList.remove("pop");
      el.classList.remove("hot");
    }
  }
  function stepGuns(dt) {
    G.gunOn = false;
    G.tracers = [];
    const tr = G.track;
    if (!tr || tr.kind !== "ridge" || G.phase !== "race") return;
    if (G.multPulse > 0) G.multPulse = Math.max(0, G.multPulse - dt * 3);
    const boostOn = !!G.keys.ShiftRight && G.car.boost > 0.04 && !G.keys.ShiftLeft;
    if (!boostOn) return;
    G.gunOn = true;
    G.gunCool -= dt;
    const fx = Math.cos(G.car.h), fy = Math.sin(G.car.h);
    const rx = -fy, ry = fx;
    const ox = G.car.x + fx * 2.3, oy = G.car.y + fy * 2.3;
    let best = null, bestAlong = 80, i, c, dx, dy, along, perp;
    for (i = 0; i < (G.traffic || []).length; i++) {
      c = G.traffic[i];
      if (!c.alive) continue;
      dx = c.x - ox; dy = c.y - oy;
      along = dx * fx + dy * fy;
      perp = Math.abs(dx * rx + dy * ry);
      if (along > 2.5 && along < 52 && perp < 2.5 + along * 0.035 && along < bestAlong) {
        bestAlong = along;
        best = c;
      }
    }
    if (best) {
      best.hp -= 3.4 * dt;
      if (best.hp <= 0) wreckTraffic(best);
    }
    if (G.gunCool <= 0) {
      G.gunCool = 0.055;
      const side = (G.kills + Math.floor(performance.now() / 55)) % 2 ? 1 : -1;
      const sx = ox + rx * 0.42 * side;
      const sy = oy + ry * 0.42 * side;
      const reach = best ? bestAlong : 38;
      G.tracers.push({
        x: sx, y: sy,
        x2: sx + fx * reach + (best ? 0 : rx * (Math.random() - 0.5) * 1.2),
        y2: sy + fy * reach + (best ? 0 : ry * (Math.random() - 0.5) * 1.2)
      });
    }
  }

  function randomTrack(seed) {
    return makeRidgeTrack(seed);
  }

  function defaultSave() {
    return {
      name: "", craft: "apex", ghosts: {}, rounds: [], options: defaultOptions(),
      arcade: { bestScore: 0, bestCombo: 0, runs: [] }
    };
  }
  function loadSave() {
    try {
      const s = Object.assign(defaultSave(), JSON.parse(localStorage.getItem(SAVE_KEY) || "{}"));
      s.options = Object.assign(defaultOptions(), s.options || {});
      s.arcade = Object.assign({ bestScore: 0, bestCombo: 0, runs: [] }, s.arcade || {});
      if (!Array.isArray(s.arcade.runs)) s.arcade.runs = [];
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
    traffic: [],
    gunOn: false,
    gunCool: 0,
    tracers: [],
    score: 0,
    combo: 0,
    mult: 1,
    comboT: 0,
    kills: 0,
    bestCombo: 1,
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
    const tlen = dist(a, b) || 1;
    const lat0 = -LANE_W * 0.5;
    G.car = {
      x: a.x + (-(b.y - a.y) / tlen) * lat0,
      y: a.y + ((b.x - a.x) / tlen) * lat0,
      h: h, vh: h, speed: 0, steer: 0, boost: (G.craft && G.craft.boostTank) || 1, gear: 1, rpm: 900, thr: 0, brk: 0, shiftT: 0, wheelSlip: 0
    };
    G.ai = null;
    G.lap = 0;
    G.lastS = 0;
    G.gates = (tr.sectors || [0, 0, 0]).map(function () { return false; });
    const flashOff = $("countFlash");
    if (flashOff) flashOff.classList.add("hidden");
    G.splits = [];
    G.rec = [];
    G.lastLap = null;
    G.bestLap = null;
    G.lapStartMs = 0;
    G.lapTimes = [];
    G.hudSpd = 0;
    G.hudRpm = 800;
    G._ridgeDone = false;
    resetArcade();
    if (tr.kind === "ridge") {
      G.traffic = spawnTraffic(tr);
      log("Traffic · " + G.traffic.length + " cars on the highway");
    }
    if ($("arcadeHud")) $("arcadeHud").classList.toggle("hidden", tr.kind !== "ridge");
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
      phase: "ready",
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
    G.car = { x: x0, y: -lane, h: 0, vh: 0, speed: 0, steer: 0, boost: (G.craft && G.craft.boostTank) || 1, gear: 1, rpm: 900, thr: 0, brk: 0, shiftT: 0, wheelSlip: 0 };
    const c = G.craft;
    G.ai = {
      x: x0, y: lane, h: 0, speed: 0, boost: 1,
      acc: (c.mu * G0 * 0.5) / YD * (0.92 + Math.random() * 0.1),
      vmax: topSpeedYd(c) * (0.96 + Math.random() * 0.07),
      boostMul: c.boost
    };
    G.lap = 0;
    G.lastS = x0;
    G.gates = [];
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
      log("Staged · READY · wait for the tree · " + tr.feet + " ft");
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
    el.classList.toggle("is-ready", st && st.phase === "ready");
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
      (st.trapMph != null ? " · " + fmtSpeedMph(st.trapMph) : "") + "</p>" +
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
      if (t < 2.15) st.phase = "ready";
      else if (t < 2.6) st.phase = "pre";
      else if (t < 3.1) st.phase = "stage";
      else if (t < 3.6) st.phase = "a1";
      else if (t < 4.1) st.phase = "a2";
      else if (t < 4.6) st.phase = "a3";
      else if (st.phase !== "green" && st.phase !== "red") {
        st.phase = st.foul ? "red" : "green";
        st.greenAt = now;
        st.aiGoAt = now + st.aiRt * 1000;
        G.phase = "race";
        G.t0 = now;
        log(st.foul ? "Red-light start." : "Green.");
      }
      const flash = $("countFlash");
      if (flash) {
        if (st.phase === "ready") {
          flash.classList.remove("hidden");
          flash.textContent = "READY";
        } else if (flash.textContent === "READY") flash.classList.add("hidden");
      }
      if (throttle && (st.phase === "a1" || st.phase === "a2" || st.phase === "a3")) {
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
        log("Trap · " + fmt(st.playerMs) + " · " + fmtSpeedMph(st.trapMph));
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
    const tank = c.boostTank || 1;
    const boostOn = !!k.ShiftRight && G.car.boost > 0.04 && !ebrake;
    const proj0 = project(G.car, G.track.samples, G.lastS, G.track.closed !== false);
    const on0 = Math.abs(proj0.lat) <= G.track.width;
    const ridge = G.track && G.track.kind === "ridge";
    if (boostOn) G.car.boost = Math.max(0, G.car.boost - dt * (ridge ? 0.5 : 0.42));
    else if (on0) G.car.boost = Math.min(tank, G.car.boost + dt * (ridge ? 0.065 : 0.18) * c.boost);
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
      G.car.speed *= Math.max(0.22, 1 - 1.7 * dt);
      const trackH = Math.atan2(proj.hy, proj.hx);
      G.car.h += wrapDelta(trackH - G.car.h, Math.PI * 2) * 0.08;
      G.car.vh += wrapDelta(trackH - G.car.vh, Math.PI * 2) * 0.18;
      if (ridge) breakCombo("WALL");
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
    if (vAbs < 7.5 && car.gear === 1 && inp.throttle && clutch) {
      rpm = Math.max(rpm, c.idle + inp.throttle * (c.tqRpm - c.idle) * 1.02);
    }
    rpm = rpm + car.wheelSlip * (c.redline - rpm) * (car.gear <= 1 ? 0.92 : 0.55);
    rpm = clamp(rpm, c.idle * 0.7, c.redline + 200);
    if (car.shiftT <= 0 && car.gear > 0) {
      const shiftRpm = car.gear <= 3 ? c.redline * 0.965 : c.redline * 0.915;
      if (rpm > shiftRpm && car.gear < nG) {
        car.gear += 1;
        car.shiftT = car.gear <= 3 ? 0.09 : 0.14;
        if (car.gear === 2 || car.gear === 3) car.speed += 2.4;
      } else if (rpm < Math.max(c.idle + 900, c.tqRpm * 0.48) && car.gear > 1 && inp.throttle < 0.55) {
        const low = roadRpm(c, car.speed, car.gear - 2);
        if (low < c.redline * 0.88) {
          car.gear -= 1;
          car.shiftT = 0.09;
        }
      }
    }
    const tq = engineTorqueNm(c, rpm) * (inp.boostOn ? 1 + 0.32 * 1.1 * (c.boostPower || 1) : 1);
    let Fdrive = clutch * inp.throttle * tq * ratio * c.eta / c.wheelRadius;
    if (car.gear === 1) Fdrive *= 1.55;
    else if (car.gear === 2) Fdrive *= 3.05;
    else if (car.gear === 3) Fdrive *= 2.72;
    else if (car.gear === 4) Fdrive *= 0.9;
    else if (car.gear >= 5) Fdrive *= 0.84;
    const axEst = car.speed >= 0 ? 1 : -1;
    const df = driveFrac(c);
    const rearLoad = clamp(0.47 + 0.16 * clamp(-axEst * inp.throttle + inp.brake, -1, 1), 0.28, 0.72);
    const frontLoad = 1 - rearLoad;
    const drivenN = c.massKg * G0 * (df.r * rearLoad + df.f * frontLoad);
    const surf = inp.onTrack ? 1 : 0.32;
    let Fmax = Math.max(400, c.mu * drivenN * surf);
    if (car.gear === 1) Fmax *= 1.18;
    else if (car.gear === 2) Fmax *= 1.82;
    else if (car.gear === 3) Fmax *= 1.68;
    else if (car.gear >= 4) Fmax *= 1.08;
    const want = Math.abs(Fdrive);
    if (want > Fmax && clutch && inp.throttle > 0.2) {
      car.wheelSlip = clamp(car.wheelSlip + dt * ((want - Fmax) / (Fmax + 1)) * 2.4, 0, 1);
      Fdrive = Math.sign(Fdrive) * Fmax * (1 - 0.35 * car.wheelSlip);
      G.sparks = Math.max(G.sparks || 0, 0.4 + car.wheelSlip * 0.7);
    } else {
      car.wheelSlip = Math.max(0, car.wheelSlip - dt * 1.8);
    }
    let Fdrag = 0.5 * RHO * c.cd * c.area * vMs * vMs * (vMs >= 0 ? 1 : -1);
    const bonusYd = comboVmaxBonusYd();
    if (bonusYd > 0) {
      const v0 = baseTopSpeedYd(c);
      const v1 = v0 + bonusYd;
      Fdrag *= (v0 * v0) / (v1 * v1);
    }
    const Froll = c.crr * c.massKg * G0 * (vAbs < 0.15 ? 0 : (vMs >= 0 ? 1 : -1));
    const Fbrk = inp.brake * c.brakeMu * c.massKg * G0 * 0.72 * (vAbs < 0.2 && !inp.throttle ? (vMs >= 0 ? 1 : -1) : (vMs >= 0 ? 1 : -1));
    const Feb = inp.ebrake ? c.mu * c.massKg * G0 * 0.28 * (vMs >= 0 ? 1 : -1) : 0;
    let Fnet = Fdrive - Fdrag - Froll;
    if (vAbs > 0.25 || inp.brake || inp.ebrake) Fnet -= Fbrk * (vAbs > 0.25 ? 1 : 0) + Feb;
    if (bonusYd > 0 && inp.throttle) Fnet += (G.combo || 0) * 190;
    const a = Fnet / c.massKg;
    car.speed += (a / YD) * dt;
    const vmax = topSpeedYd(c);
    if (car.speed > vmax) car.speed = vmax;
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
    const disp = speedVal(G.car.speed || 0);
    G.hudSpd += (disp - (G.hudSpd || 0)) * 0.22;
    G.hudRpm += ((G.car.rpm || 800) - (G.hudRpm || 800)) * 0.28;
    if ($("rhSpd")) $("rhSpd").textContent = String(Math.round(Math.max(0, G.hudSpd)));
    if ($("rhUnit")) $("rhUnit").textContent = opt("metric") ? "km/h" : "MPH";
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
    if ($("rhBoost")) {
      const tank = (G.craft && G.craft.boostTank) || 1;
      $("rhBoost").style.width = Math.round(clamp((G.car.boost || 0) / tank, 0, 1) * 100) + "%";
    }
    if ($("arcadeHud")) {
      const on = !!(G.track && G.track.kind === "ridge" && G.mode === "race");
      $("arcadeHud").classList.toggle("hidden", !on);
      if (on) {
        if ($("arcScore")) $("arcScore").textContent = String(G.score || 0);
        if ($("arcMult")) {
          $("arcMult").textContent = "x" + (G.combo || 0);
          $("arcMult").classList.toggle("hot", (G.combo || 0) > 0);
          $("arcMult").classList.toggle("guns", !!G.gunOn);
        }
        if ($("arcCombo")) {
          const bonus = (G.combo || 0) * COMBO_MPH;
          const bonusTxt = bonus ? ("+" + Math.round(opt("metric") ? bonus * 1.60934 : bonus) + " " + (opt("metric") ? "km/h" : "MPH")) : "";
          $("arcCombo").textContent = bonusTxt || (G.gunOn ? "GUNS LIVE" : "HOLD R-SHIFT");
        }
        if ($("arcBest")) $("arcBest").textContent = "BEST " + ((G.save.arcade && G.save.arcade.bestScore) || 0);
        if ($("arcKills")) $("arcKills").textContent = (G.kills || 0) + " WRECKS";
      }
    }
    if ($("rhSectors")) {
      if (drag) {
        const st = G.tree || {};
        $("rhSectors").textContent = "60' " + fmt(st.ft60) + " · TRAP " + (st.trapMph != null ? fmtSpeedMph(st.trapMph) : "—");
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
        $("speedo").innerHTML = Math.round(speedVal(G.car.speed)) + "<small>" + (opt("metric") ? "km/h" : "MPH") + "</small>";
      }
      if ($("boostFill")) $("boostFill").style.width = Math.round(G.car.boost * 100) + "%";
      if ($("heatCard")) {
        $("heatCard").innerHTML = "<p><b>" + G.track.name + "</b></p><p>" +
          (G.phase === "drag_idle" ? "Roll to the tree · press F" : (G.tree && G.tree.phase === "ready") ? "READY · wait for the tree" : G.phase === "tree" ? "Tree · hold" : G.phase) +
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
      $("secCard").innerHTML = (G.gates || []).map(function (g, i) {
        return "S" + (i + 1) + " " + (g ? "■" : "□");
      }).join(" · ") || "—";
    }
    if ($("ghostCard")) {
      if (G.track && G.track.kind === "ridge") {
        $("ghostCard").innerHTML = "Arcade · " + (G.score || 0) + " pts · x" + (G.mult || 1) +
          "<br>Browser best <b>" + ((G.save.arcade && G.save.arcade.bestScore) || 0) + "</b>";
      } else {
        $("ghostCard").innerHTML = G.ghost
          ? "Ghost on · " + fmt(G.ghost.ms)
          : "No ghost for this craft yet.";
      }
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
      beat: beat,
      score: G.track.kind === "ridge" ? (G.score || 0) : null,
      kills: G.track.kind === "ridge" ? (G.kills || 0) : null,
      combo: G.track.kind === "ridge" ? (G.bestCombo || 1) : null
    });
    G.save.rounds = G.save.rounds.slice(0, 40);
    let high = false;
    if (G.track.kind === "ridge") {
      if (!G.save.arcade) G.save.arcade = { bestScore: 0, bestCombo: 0, runs: [] };
      if ((G.score || 0) > (G.save.arcade.bestScore || 0)) {
        G.save.arcade.bestScore = G.score;
        high = true;
      }
      if ((G.bestCombo || 1) > (G.save.arcade.bestCombo || 0)) G.save.arcade.bestCombo = G.bestCombo;
      if (!Array.isArray(G.save.arcade.runs)) G.save.arcade.runs = [];
      G.save.arcade.runs.unshift({
        name: (G.save.name || "Operator").slice(0, 24),
        craft: G.craft.name,
        track: G.track.name,
        ms: ms,
        score: G.score || 0,
        kills: G.kills || 0,
        combo: G.bestCombo || 1,
        at: Date.now()
      });
      G.save.arcade.runs = G.save.arcade.runs.slice(0, 20);
    }
    writeSave(G.save);
    log((beat ? "New ghost. " : "Heat closed. ") + fmt(ms) + (G.track.kind === "ridge" ? " · " + (G.score || 0) + " pts" : ""));
    const arcadeLine = G.track.kind === "ridge"
      ? "<p class='lore arc-result'>" + (G.score || 0) + " pts · " + (G.kills || 0) + " wrecks · x" + (G.bestCombo || 1) +
        " combo" + (high ? " · NEW HIGH" : "") + "</p>" +
        "<p class='lore'>Browser best <b>" + (G.save.arcade.bestScore || 0) + "</b></p>"
      : "";
    showSheet(
      "<p class='kicker'>Heat closed</p><h2>" + (G.track.kind === "ridge" ? String(G.score || 0) : fmt(ms)) + "</h2>" +
      (G.track.kind === "ridge" ? "<p class='lore'>" + fmt(ms) + "</p>" : "") +
      "<p class='lore'>" + G.track.name + " · " + G.craft.name + (beat ? " · ghost rewritten" : "") + "</p>" +
      arcadeLine +
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
        reduceFx: opt("reduceFx"),
        guns: !!(G.gunOn && G.track && G.track.kind === "ridge")
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
    if (G.track.kind === "ridge") {
      stepTraffic(dt);
      stepGuns(dt);
    }
    const elapsed = now - G.t0;
    if ((G.rec.length < 2 || elapsed / 1000 - G.rec[G.rec.length - 1].t > 0.05) && G.rec.length < 16000) {
      G.rec.push({ t: elapsed / 1000, x: G.car.x, y: G.car.y, h: G.car.h });
    }
    (G.track.sectors || []).forEach(function (frac, i) {
      const target = frac * proj.len;
      if (!G.gates[i] && crossed(G.lastS, proj.s, target, proj.len)) {
        G.gates[i] = true;
        G.splits.push(elapsed);
        log((G.track.kind === "ridge" ? "Checkpoint " : "Sector ") + (i + 1) + " · " + fmt(elapsed));
      }
    });
    if (G.track.kind === "ridge") {
      if (!G._ridgeDone && proj.s >= proj.len * 0.982) {
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
      const spdAbs = Math.abs(G.car.speed || 0);
      const burnout = G.car.gear === 1 && (G.car.thr || 0) > 0.35 && spdAbs < 34 &&
        ((G.car.wheelSlip || 0) > 0.08 || spdAbs < 16);
      const boostOn = !!G.keys.ShiftRight && (G.car.boost || 0) > 0.04 && !G.keys.ShiftLeft;
      Rally3D.setState({
        car: G.car, ghost: gh, ai: G.ai, sparks: G.sparks, reduceFx: opt("reduceFx"),
        traffic: G.track && G.track.kind === "ridge" ? G.traffic : null,
        gun: { on: G.gunOn, tracers: G.tracers || [] },
        burnout: burnout,
        boostOn: boostOn,
        body: (G.craft && G.craft.body) || "apex",
        paint: parseInt(String((G.craft && G.craft.color) || "#165e66").replace("#", ""), 16)
      });
      return;
    }
    if (!ctx || !G.track) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const c = ctx;
    c.fillStyle = "#071018";
    c.fillRect(0, 0, w, h);
    const view = Math.round(Number(opt("camView")) || 0);
    const scales = [2.1, 2.85, 3.7, 4.4, 5.2, 1.15];
    const scale = scales[view] || 2.1;
    c.save();
    c.translate(w / 2, h * (view === 5 ? 0.5 : 0.62));
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
    const nLn = G.track.lanes || TRACK_LANES;
    const lw = G.track.laneW || LANE_W;
    const nDiv = nLn - 1;
    let di, dlat, prevP, nextP, tx, tz, ln, px, pz;
    c.strokeStyle = "#e2e8f0";
    c.lineWidth = 1.4;
    for (di = 0; di < nDiv; di++) {
      dlat = (di - (nDiv - 1) / 2) * lw;
      c.beginPath();
      G.track.pts.forEach(function (p, i) {
        prevP = G.track.pts[(i - 1 + G.track.pts.length) % G.track.pts.length];
        nextP = G.track.pts[(i + 1) % G.track.pts.length];
        if (G.track.closed === false && i === 0) prevP = p;
        if (G.track.closed === false && i === G.track.pts.length - 1) nextP = p;
        tx = nextP.x - prevP.x; tz = nextP.y - prevP.y;
        ln = Math.hypot(tx, tz) || 1;
        px = -tz / ln; pz = tx / ln;
        const x = (p.x + px * dlat) * scale, y = (p.y + pz * dlat) * scale;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      });
      if (G.track.closed !== false) c.closePath();
      c.stroke();
    }
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
    if (G.traffic && G.track && G.track.kind === "ridge") {
      G.traffic.forEach(function (tc) {
        if (tc.wreck <= 0 && !tc.alive) return;
        c.fillStyle = tc.alive ? "#f59e0b" : "#64748b";
        c.beginPath();
        c.arc(tc.x * scale, tc.y * scale, 6, 0, Math.PI * 2);
        c.fill();
      });
    }
    if (G.gunOn && G.tracers) {
      c.strokeStyle = "#fde68a";
      c.lineWidth = 2;
      G.tracers.forEach(function (tr) {
        c.beginPath();
        c.moveTo(tr.x * scale, tr.y * scale);
        c.lineTo(tr.x2 * scale, tr.y2 * scale);
        c.stroke();
      });
    }
    c.restore();
  }

  function help() {
    showSheet(
      "<p class='kicker'>How to play</p><h2>Haven Rally</h2>" +
      "<ol class='lore'><li>W throttle, Space or S brake, A D steer. Left Shift is e-brake / drift. Right Shift boosts while the gold bar lasts — on Endless it also fires the front guns. Empty bar = no boost, no guns. C cycles camera.</li>" +
      "<li>Drag: F at the tree stages both lanes and runs a sportsman Christmas tree vs AI. Leave before green is a red-light foul.</li>" +
      "<li>Stay on the four-lane ribbon. Off-track dumps speed. Drift when you ask more turn than grip.</li>" +
      "<li>Endless: wreck traffic to chain combo. Each combo point is +5 mph top speed, no cap. Ram a car or leave the asphalt and the chain dumps. Launch is 1–2–3 torque slingshot; 4th-on is the long pull.</li>" +
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
          "<p class='garage-hint'>Drag to orbit · two bays live</p>" +
        "</div>" +
        "<div class='title-panel'>" +
          "<p class='kicker'>Garage · two bays live</p>" +
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
            statRow("Boost", c.boostTank || c.boost, 1.8) +
          "</div>" +
          "<p class='kicker' style='margin-top:.85rem'>Bays</p>" +
          "<div class='cast-grid garage-bays'>" +
            CRAFTS.map(function (cr) {
              return "<button type='button' class='cast" + (cr.id === c.id ? " on" : "") + "' data-cast='" + cr.id + "'>" +
                "<img src='" + cr.src + "' alt='" + cr.name + "'><b>" + cr.name + "</b><span>" + cr.tag + "</span></button>";
            }).join("") +
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
    const ok3 = cv && window.THREE && window.HavenCar && HavenCar.openStudio(cv, { paint: paint, body: c.body || c.id });
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
    G.keys = {};
    G.gunOn = false;
    showDragUi(false);
    if ($("arcadeHud")) $("arcadeHud").classList.add("hidden");
    const flash = $("countFlash");
    if (flash) flash.classList.add("hidden");
    if (window.HavenCar) HavenCar.closeStudio();
    $("app").classList.add("hidden");
    $("boot").classList.add("hidden");
    const name = (G.save.name || "").replace(/[<>]/g, "");
    const c = craftOf(G.save.craft);
    showSheet(
      "<div class='title-screen'>" +
        "<div class='title-art'><img src='" + (c.hero || c.src) + "' alt='" + c.name + "'><div class='title-art-fade'></div></div>" +
        "<div class='title-panel'>" +
          "<p class='kicker'>Δ9Φ963 · chatagent.ca</p>" +
          "<h1>HAVEN RALLY</h1>" +
          "<p class='title-tag'>Slide the corner. Charge the boost. Beat the ghost.</p>" +
          "<p class='lore'>W throttle · Space brake · L-Shift drift · R-Shift boost/guns · C camera · R restart</p>" +
          "<div class='modes' style='margin:.55rem 0 0'><button type='button' class='btn' id='menuRadio'>Play radio</button></div>" +
          "<p class='lore' style='margin:.35rem 0 0'><a href='https://ffm.to/eovnvo9' target='_blank' rel='noopener noreferrer'>Stream Excavationpro</a> · <a href='https://asiancoastline.com/listen.html' target='_blank' rel='noopener'>Free listen</a></p>" +
          "<label style='margin-top:.85rem;display:block'>Operator name</label>" +
          "<input class='name' id='nm' maxlength='24' value='" + name.replace(/'/g, "") + "' placeholder='Operator'>" +
          "<p class='kicker' style='margin-top:.75rem'>Chassis</p>" +
          "<div class='garage-chip'>" +
            "<img src='" + c.src + "' alt='" + c.name + "'>" +
            "<div><b>" + c.name + "</b><span>" + c.tag + (c.id === "apex" ? " · GT" : " · truck") + "</span></div>" +
            "<button type='button' class='btn gold' data-go='garage'>Garage</button>" +
          "</div>" +
          "<div class='mode-grid'>" +
            "<button type='button' class='mode-card' data-go='garage'><b>Garage</b><span>Studio turntable. Apex GT and Boxcut short-box live.</span></button>" +
            "<button type='button' class='mode-card' data-go='pine'><b>Pine Coil</b><span>" + PINE.lore + "</span></button>" +
            "<button type='button' class='mode-card' data-go='coral'><b>Coral Coast</b><span>" + CORAL.lore + "</span></button>" +
            "<button type='button' class='mode-card' data-go='star'><b>Singularity Ring</b><span>" + STAR.lore + "</span></button>" +
            "<button type='button' class='mode-card' data-go='endless'><b>Endless run</b><span>Traffic, boost-guns, combos. Wrecks refill the bar. High score stays in this browser.</span></button>" +
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
        if (G._sheet === "garage") garage();
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
    if (e.key === "c" || e.key === "C") {
      e.preventDefault();
      const n = (Math.round(Number(opt("camView")) || 0) + 1) % CAM_NAMES.length;
      setOpt("camView", n);
      log("Camera · " + CAM_NAMES[n]);
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
