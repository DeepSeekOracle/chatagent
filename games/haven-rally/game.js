/* Haven Rally — follows ./whitepaper.html */
(function () {
  "use strict";
  const SAVE_KEY = "lygo-haven-rally-v1";
  const CRAFTS = [
    { id: "mira", name: "Mira Needle", tag: "Drift", src: "./assets/p-mira.jpg", acc: 38, vmax: 92, turn: 2.35, grip: 0.72, boost: 1.0, color: "#5eead4" },
    { id: "reed", name: "Reed Hauler", tag: "Line", src: "./assets/p-reed.jpg", acc: 30, vmax: 84, turn: 1.85, grip: 1.15, boost: 0.85, color: "#fbbf24" },
    { id: "kai", name: "Kai Pulse", tag: "Boost", src: "./assets/p-kai.jpg", acc: 34, vmax: 88, turn: 2.05, grip: 0.92, boost: 1.35, color: "#c084fc" }
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

  function densifyClosed(pts, step) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const len = dist(a, b) || 1;
      const n = Math.max(1, Math.ceil(len / step));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    return out;
  }
  function pathLen(pts) {
    let n = 0;
    for (let i = 0; i < pts.length; i++) n += dist(pts[i], pts[(i + 1) % pts.length]);
    return n;
  }
  function project(p, samples) {
    let best = 1e9, lat = 0, s = 0, hx = 1, hy = 0, acc = 0;
    let along = 0;
    for (let i = 0; i < samples.length; i++) {
      const a = samples[i], b = samples[(i + 1) % samples.length];
      const dx = b.x - a.x, dy = b.y - a.y;
      const l2 = dx * dx + dy * dy || 1;
      let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
      t = clamp(t, 0, 1);
      const qx = a.x + dx * t, qy = a.y + dy * t;
      const d = Math.hypot(p.x - qx, p.y - qy);
      if (d < best) {
        best = d;
        const len = Math.sqrt(l2);
        hx = dx / (len || 1); hy = dy / (len || 1);
        lat = (p.x - qx) * (-hy) + (p.y - qy) * hx;
        s = acc + t * len;
      }
      acc += Math.sqrt(l2);
    }
    return { d: best, lat: lat, s: s, hx: hx, hy: hy, len: acc };
  }

  function makeTrack(spec) {
    const pts = spec.ctrl.slice();
    const samples = densifyClosed(pts, 5);
    const len = pathLen(samples);
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
      sectors: [0.28, 0.55, 0.82]
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
    return { name: "", craft: "mira", ghosts: {}, rounds: [] };
  }
  function loadSave() {
    try { return Object.assign(defaultSave(), JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); }
    catch (e) { return defaultSave(); }
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
    bestMs: null
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
  }
  function showSheet(html, studio) {
    const ov = $("overlay");
    ov.classList.remove("hidden");
    ov.classList.toggle("studio", !!studio);
    ov.innerHTML = studio ? html : "<div class='sheet'>" + html + "</div>";
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
    const tr = G.track;
    const a = tr.pts[0], b = tr.pts[1];
    const h = Math.atan2(b.y - a.y, b.x - a.x);
    G.car = { x: a.x, y: a.y, h: h, speed: 0, steer: 0, boost: 1 };
    G.lap = 0;
    G.lastS = 0;
    G.gates = [false, false, false];
    G.splits = [];
    G.rec = [];
    G.phase = "count";
    G.countN = 3;
    G.countT = performance.now();
    G.t0 = 0;
    const gk = tr.id + "|" + G.craft.id;
    G.ghost = (G.save.ghosts && G.save.ghosts[gk]) || null;
    G.bestMs = G.ghost && G.ghost.ms;
    paintPilot();
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

  function stepCar(dt) {
    const c = G.craft;
    const k = G.keys;
    const throttle = (k.KeyW || k.ArrowUp) ? 1 : 0;
    const brake = (k.KeyS || k.ArrowDown) ? 1 : 0;
    let steerIn = 0;
    if (k.KeyA || k.ArrowLeft) steerIn -= 1;
    if (k.KeyD || k.ArrowRight) steerIn += 1;
    G.car.steer += (steerIn - G.car.steer) * clamp(dt * 8, 0, 1);
    const boostOn = (k.ShiftLeft || k.ShiftRight) && G.car.boost > 0.04;
    if (boostOn) G.car.boost = Math.max(0, G.car.boost - dt * 0.42);
    else G.car.boost = Math.min(1, G.car.boost + dt * 0.18 * c.boost);
    const proj = project(G.car, G.track.samples);
    const on = Math.abs(proj.lat) <= G.track.width;
    const grip = c.grip * (on ? 1 : 0.32);
    const vmax = c.vmax * (boostOn ? 1.18 : 1);
    const acc = c.acc * throttle * (boostOn ? 1.45 : 1) - brake * 52 - G.car.speed * 0.55;
    G.car.speed = clamp(G.car.speed + acc * dt, -18, vmax);
    const turn = G.car.steer * c.turn * (0.35 + 0.65 * (1 - Math.abs(G.car.speed) / (vmax + 8)));
    const want = turn * (Math.abs(G.car.speed) / 18);
    const limited = clamp(want, -grip * 2.8, grip * 2.8);
    G.car.h += limited * dt;
    if (Math.abs(want) > Math.abs(limited) + 0.15 && Math.abs(G.car.speed) > 28) {
      G.car.speed *= (1 - 0.55 * dt);
      G.sparks = 1;
    } else G.sparks *= 0.9;
    G.car.x += Math.cos(G.car.h) * G.car.speed * dt;
    G.car.y += Math.sin(G.car.h) * G.car.speed * dt;
    if (!on) G.car.speed *= (1 - 1.8 * dt);
    return proj;
  }

  function crossed(prev, now, target, total) {
    if (total < 8) return false;
    if (prev <= now) return prev <= target && now > target;
    return prev <= target || now > target;
  }

  function heatHud(now) {
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
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, h: a.h + (b.h - a.h) * u };
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
    const gh = ghostAt(elapsed);
    if (use3d && window.Rally3D && Rally3D.active()) {
      Rally3D.setState({ car: G.car, ghost: gh, sparks: G.sparks });
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
    c.fillStyle = G.craft.color;
    c.beginPath();
    c.arc(G.car.x * scale, G.car.y * scale, 7, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function help() {
    showSheet(
      "<p class='kicker'>How to play</p><h2>Haven Rally</h2>" +
      "<ol class='lore'><li>W throttle, S brake, A D steer. Shift boosts while the gold bar lasts.</li>" +
      "<li>Stay on the ribbon. Off-track dumps speed. Drift when you ask more turn than grip.</li>" +
      "<li>Hit sectors in order, then the start line. Three laps (two on endless).</li>" +
      "<li>A faster finish writes the ghost for this circuit + craft.</li></ol>" +
      "<p class='lore'><a href='./whitepaper.html'>Whitepaper</a> is the spec.</p>" +
      "<button class='btn gold' id='hk'>Back to grid</button>"
    );
    $("hk").onclick = hideOverlay;
  }

  function menu() {
    G.mode = "menu";
    G.phase = "idle";
    $("app").classList.add("hidden");
    $("boot").classList.add("hidden");
    const name = (G.save.name || "").replace(/[<>]/g, "");
    showSheet(
      "<div class='title-screen'>" +
        "<div class='title-art'><img src='./assets/menu.jpg' alt='Haven Rally grid'><div class='title-art-fade'></div></div>" +
        "<div class='title-panel'>" +
          "<p class='kicker'>Δ9Φ963 · chatagent.ca</p>" +
          "<h1>HAVEN RALLY</h1>" +
          "<p class='title-tag'>Beat the ghost. Hold the line. Boost is a debt.</p>" +
          "<p class='lore'>W throttle · A D steer · Shift boost · R restart</p>" +
          "<div class='modes' style='margin:.55rem 0 0'><button type='button' class='btn' id='menuRadio'>Play radio</button></div>" +
          "<p class='lore' style='margin:.35rem 0 0'><a href='https://ffm.to/eovnvo9' target='_blank' rel='noopener noreferrer'>Stream Excavationpro</a> · <a href='https://asiancoastline.com/listen.html' target='_blank' rel='noopener'>Free listen</a></p>" +
          "<label style='margin-top:.85rem;display:block'>Operator name</label>" +
          "<input class='name' id='nm' maxlength='24' value='" + name.replace(/'/g, "") + "' placeholder='Operator'>" +
          "<p class='kicker' style='margin-top:.75rem'>Choose craft</p>" +
          "<div class='cast-grid'>" +
            CRAFTS.map(function (c) {
              const on = (G.save.craft || "mira") === c.id ? " on" : "";
              return "<button type='button' class='cast" + on + "' data-cast='" + c.id + "'>" +
                "<img src='" + c.src + "' alt='" + c.name + "'><b>" + c.name + "</b><span>" + c.tag + "</span></button>";
            }).join("") +
          "</div>" +
          "<div class='mode-grid'>" +
            "<button type='button' class='mode-card' data-go='pine'><b>Pine Coil</b><span>" + PINE.lore + "</span></button>" +
            "<button type='button' class='mode-card' data-go='coral'><b>Coral Coast</b><span>" + CORAL.lore + "</span></button>" +
            "<button type='button' class='mode-card' data-go='star'><b>Singularity Ring</b><span>" + STAR.lore + "</span></button>" +
            "<button type='button' class='mode-card' data-go='endless'><b>Endless coil</b><span>Seeded loop. Two laps. Make a ghost.</span></button>" +
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
      if (go === "pine") startHeat(PINE);
      if (go === "coral") startHeat(CORAL);
      if (go === "star") startHeat(STAR);
      if (go === "endless") startHeat(randomTrack((Date.now() ^ (Math.random() * 1e9)) >>> 0));
    };
  }

  window.addEventListener("keydown", function (e) {
    if (e.target && e.target.tagName === "INPUT") return;
    G.keys[e.code] = true;
    if (e.key === "Escape") {
      if (overlayOpen() && G.mode !== "menu") { hideOverlay(); return; }
      menu();
      return;
    }
    if (G.mode === "menu" || overlayOpen()) return;
    if (e.key === "r" || e.key === "R") { e.preventDefault(); spawnOnGrid(); }
    if (e.key === " " || e.key === "Enter") e.preventDefault();
  });
  window.addEventListener("keyup", function (e) { G.keys[e.code] = false; });
  window.addEventListener("blur", function () { G.keys = {}; });

  if ($("btnHelp")) $("btnHelp").onclick = help;
  if ($("btnPaper")) $("btnPaper").onclick = function () { location.href = "./whitepaper.html"; };
  if ($("btnRestart")) $("btnRestart").onclick = function () { if (G.mode === "race") spawnOnGrid(); };
  if ($("btnMenu")) $("btnMenu").onclick = menu;
  window.addEventListener("resize", function () {
    if (use3d && window.Rally3D) Rally3D.resize();
  });

  $("boot").classList.add("hidden");
  G.craft = craftOf(G.save.craft);
  menu();
  requestAnimationFrame(tick);
})();
