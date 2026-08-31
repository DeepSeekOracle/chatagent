/* Lattice Golf — Δ9Φ963 · local-first HTML5 */
(function () {
  "use strict";

  const SAVE_KEY = "lygo-lattice-golf-v1";
  const CUP = 2.4;
  const CENTER = 140;
  const CLUBS = [
    { id: "dr", name: "Driver", min: 220, max: 290 },
    { id: "3w", name: "3 Wood", min: 190, max: 250 },
    { id: "5w", name: "5 Wood", min: 170, max: 225 },
    { id: "3h", name: "3 Hybrid", min: 180, max: 235 },
    { id: "4i", name: "4 Iron", min: 170, max: 220 },
    { id: "5i", name: "5 Iron", min: 160, max: 210 },
    { id: "6i", name: "6 Iron", min: 150, max: 195 },
    { id: "7i", name: "7 Iron", min: 140, max: 180 },
    { id: "8i", name: "8 Iron", min: 130, max: 165 },
    { id: "9i", name: "9 Iron", min: 120, max: 150 },
    { id: "pw", name: "P-Wedge", min: 100, max: 130 },
    { id: "gw", name: "Gap Wedge", min: 90, max: 120 },
    { id: "sw", name: "Sand Wedge", min: 80, max: 110 },
    { id: "lw", name: "Lob Wedge", min: 70, max: 100 },
    { id: "pt", name: "Putter", min: 0, max: 32, putt: true },
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

  function H(par, yards, lat, bunkers, water, greenR) {
    return { par: par, yards: yards, lat: lat || 0, bunkers: bunkers || [], water: water || [], greenR: greenR || 16 };
  }

  const PINE = {
    id: "pine-haven",
    name: "Pine Haven Championship",
    wind: [0, 4],
    lore: "Parkland cut through old-growth in 1924. Fairways remember every lie.",
    holes: [
      H(4, 378, 8, [{ x: 210, y: 18, r: 14 }], [], 16),
      H(3, 168, -6, [{ x: 140, y: -22, r: 12 }], [], 14),
      H(5, 512, 12, [{ x: 260, y: 20, r: 16 }, { x: 400, y: -18, r: 13 }], [], 17),
      H(4, 405, -10, [{ x: 240, y: -24, r: 14 }], [{ x: 300, y: 40, w: 70, h: 36 }], 15),
      H(3, 192, 4, [{ x: 150, y: 20, r: 11 }], [], 13),
      H(4, 362, 14, [{ x: 200, y: 22, r: 13 }], [], 16),
      H(5, 538, -8, [{ x: 280, y: -16, r: 15 }], [{ x: 420, y: -48, w: 80, h: 40 }], 18),
      H(4, 428, 6, [{ x: 250, y: 18, r: 12 }, { x: 360, y: -20, r: 12 }], [], 15),
      H(3, 146, -4, [{ x: 110, y: -16, r: 10 }], [], 12),
    ],
  };
  const CORAL = {
    id: "coral-lattice",
    name: "Coral Lattice Links",
    wind: [2, 8],
    lore: "Coastal lattice. Wind is a teacher. Water is the examiner.",
    holes: [
      H(4, 391, -12, [{ x: 220, y: -20, r: 15 }], [{ x: 180, y: 48, w: 90, h: 34 }], 15),
      H(3, 154, 10, [], [{ x: 80, y: -40, w: 60, h: 28 }], 13),
      H(5, 521, 6, [{ x: 300, y: 18, r: 16 }], [{ x: 430, y: 42, w: 86, h: 38 }], 17),
      H(4, 412, 16, [{ x: 240, y: 22, r: 13 }], [], 15),
      H(4, 388, -14, [{ x: 200, y: -18, r: 14 }], [{ x: 310, y: -50, w: 70, h: 32 }], 16),
      H(3, 201, 2, [{ x: 160, y: 16, r: 11 }], [], 13),
      H(5, 548, -10, [{ x: 270, y: -14, r: 15 }, { x: 430, y: 16, r: 13 }], [{ x: 360, y: 48, w: 78, h: 36 }], 18),
      H(4, 436, 8, [{ x: 260, y: 20, r: 12 }], [], 15),
      H(3, 139, -8, [], [{ x: 70, y: 36, w: 55, h: 26 }], 12),
    ],
  };

  function worldHole(h) {
    const tee = { x: 28, y: CENTER };
    const pin = { x: 28 + h.yards, y: CENTER + h.lat };
    const bunkers = (h.bunkers || []).map(function (b) {
      return { x: tee.x + b.x, y: CENTER + b.y, r: b.r };
    });
    const water = (h.water || []).map(function (w) {
      return { x: tee.x + w.x, y: CENTER + w.y, w: w.w, h: w.h };
    });
    return {
      par: h.par,
      yards: h.yards,
      tee: tee,
      pin: pin,
      greenR: h.greenR,
      bunkers: bunkers,
      water: water,
      fairW: h.par === 3 ? 28 : h.par === 5 ? 36 : 32,
    };
  }

  function dist(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }
  function ang(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  function lieAt(hole, p) {
    if (dist(p, hole.pin) <= hole.greenR) return "green";
    for (let i = 0; i < hole.water.length; i++) {
      const w = hole.water[i];
      if (p.x >= w.x && p.x <= w.x + w.w && p.y >= w.y && p.y <= w.y + w.h) return "water";
    }
    for (let i = 0; i < hole.bunkers.length; i++) {
      if (dist(p, hole.bunkers[i]) <= hole.bunkers[i].r) return "bunker";
    }
    const t = Math.max(0, Math.min(1, (p.x - hole.tee.x) / Math.max(1, hole.pin.x - hole.tee.x)));
    const cx = hole.tee.x + (hole.pin.x - hole.tee.x) * t;
    const cy = hole.tee.y + (hole.pin.y - hole.tee.y) * t;
    const lat = Math.hypot(p.x - cx, p.y - cy);
    if (lat < hole.fairW) return "fairway";
    if (lat < hole.fairW + 28) return "rough";
    return "oob";
  }

  function pickClub(d, onGreen) {
    if (onGreen || d < 35) return CLUBS.find(function (c) { return c.putt; });
    let best = CLUBS[0];
    let bestErr = 1e9;
    for (let i = 0; i < CLUBS.length; i++) {
      const c = CLUBS[i];
      if (c.putt) continue;
      const mid = (c.min + c.max) / 2;
      const err = Math.abs(mid - d);
      if (d <= c.max * 1.05 && err < bestErr) {
        best = c;
        bestErr = err;
      }
    }
    return best;
  }

  function defaultSave() {
    return { name: "", bestHole: {}, rounds: [], endlessHoles: 0, games: 0 };
  }
  function loadSave() {
    try {
      const t = localStorage.getItem(SAVE_KEY);
      if (!t) return defaultSave();
      return Object.assign(defaultSave(), JSON.parse(t));
    } catch (e) {
      return defaultSave();
    }
  }
  function writeSave(s) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { /* private */ }
  }

  const G = {
    save: loadSave(),
    mode: "menu",
    course: null,
    holes: [],
    hi: 0,
    hole: null,
    ball: { x: 0, y: 0 },
    lastBall: null,
    marker: null,
    club: CLUBS[0],
    power: 0.75,
    wind: { ang: 0, mph: 0 },
    strokes: 0,
    card: [],
    log: [],
    flying: null,
    seed: 1,
    rng: Math.random,
    campaign: 0,
    name: "",
  };

  const $ = function (id) { return document.getElementById(id); };
  const canvas = $("fairway");
  const ctx = canvas.getContext("2d");
  let view = { scale: 2.2, ox: 20, oy: 40 };

  function log(t) {
    G.log.unshift(t);
    if (G.log.length > 40) G.log.length = 40;
    $("log").innerHTML = G.log.slice(0, 12).map(function (x) {
      return "<div>" + x.replace(/</g, "") + "</div>";
    }).join("");
  }

  function rollWind() {
    const spec = (G.course && G.course.wind) || [0, 5];
    G.wind.mph = spec[0] + G.rng() * (spec[1] - spec[0]);
    G.wind.ang = G.rng() * Math.PI * 2;
  }

  function setupHole() {
    const src = G.holes[G.hi];
    G.hole = worldHole(src);
    G.ball = { x: G.hole.tee.x, y: G.hole.tee.y };
    G.marker = { x: G.hole.pin.x, y: G.hole.pin.y };
    G.strokes = 0;
    G.lastBall = null;
    G.flying = null;
    rollWind();
    autoClub();
    $("holePill").textContent = "HOLE " + (G.hi + 1);
    renderHoleCard();
    log("Hole " + (G.hi + 1) + " · par " + G.hole.par + " · " + Math.round(G.hole.yards) + " yd");
    fitView();
    draw();
  }

  function autoClub() {
    const d = dist(G.ball, G.marker);
    const onG = lieAt(G.hole, G.ball) === "green";
    G.club = pickClub(d, onG);
    paintClubs();
  }

  function fitView() {
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 480;
    const maxX = G.hole.pin.x + 40;
    view.scale = Math.min(w / maxX, h / 280) * 0.92;
    view.ox = 16;
    view.oy = h / 2 - CENTER * view.scale;
  }

  function toScr(p) {
    return { x: view.ox + p.x * view.scale, y: view.oy + p.y * view.scale };
  }
  function toWorld(sx, sy) {
    return { x: (sx - view.ox) / view.scale, y: (sy - view.oy) / view.scale };
  }

  function draw() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      if (G.hole) fitView();
    }
    const c = ctx;
    c.clearRect(0, 0, canvas.width, canvas.height);
    if (!G.hole) return;
    const hole = G.hole;
    c.fillStyle = "#16351f";
    c.fillRect(0, 0, canvas.width, canvas.height);

    function stadium() {
      const a = toScr(hole.tee);
      const b = toScr(hole.pin);
      c.lineWidth = hole.fairW * 2 * view.scale;
      c.strokeStyle = "#2f7a45";
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
    }
    stadium();
    c.lineWidth = (hole.fairW + 28) * 2 * view.scale;
    c.strokeStyle = "#1d4d2e";
    c.globalCompositeOperation = "destination-over";
    stadium();
    c.globalCompositeOperation = "source-over";

    hole.water.forEach(function (wtr) {
      const p = toScr({ x: wtr.x, y: wtr.y });
      c.fillStyle = "#1d4e6e";
      c.fillRect(p.x, p.y, wtr.w * view.scale, wtr.h * view.scale);
    });
    hole.bunkers.forEach(function (b) {
      const p = toScr(b);
      c.fillStyle = "#c4a574";
      c.beginPath();
      c.arc(p.x, p.y, b.r * view.scale, 0, Math.PI * 2);
      c.fill();
    });
    const g = toScr(hole.pin);
    c.fillStyle = "#3d9a58";
    c.beginPath();
    c.arc(g.x, g.y, hole.greenR * view.scale, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#fbbf24";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(g.x, g.y);
    c.lineTo(g.x, g.y - 18);
    c.stroke();
    c.fillStyle = "#fbbf24";
    c.beginPath();
    c.moveTo(g.x, g.y - 18);
    c.lineTo(g.x + 10, g.y - 14);
    c.lineTo(g.x, g.y - 10);
    c.fill();

    if (G.marker) {
      const m = toScr(G.marker);
      const b = toScr(G.ball);
      c.strokeStyle = "rgba(94,234,212,.7)";
      c.setLineDash([6, 5]);
      c.beginPath();
      c.moveTo(b.x, b.y);
      c.lineTo(m.x, m.y);
      c.stroke();
      c.setLineDash([]);
      const reach = G.club.min + (G.club.max - G.club.min) * G.power;
      c.strokeStyle = "rgba(251,191,36,.35)";
      c.beginPath();
      c.arc(b.x, b.y, reach * view.scale, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = "#5eead4";
      c.beginPath();
      c.arc(m.x, m.y, 5, 0, Math.PI * 2);
      c.fill();
    }
    const ball = G.flying || G.ball;
    const bp = toScr(ball);
    c.fillStyle = "#f4f7f2";
    c.beginPath();
    c.arc(bp.x, bp.y, 5, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#111";
    c.lineWidth = 1;
    c.stroke();
  }

  function renderHoleCard() {
    const d = dist(G.ball, G.hole.pin);
    const lie = lieAt(G.hole, G.ball);
    $("holeCard").innerHTML =
      "<p><b>" + (G.course ? G.course.name : "Endless") + "</b></p>" +
      "<p>Par " + G.hole.par + " · " + Math.round(G.hole.yards) + " yd</p>" +
      "<p>To pin <b>" + d.toFixed(1) + " yd</b></p>" +
      "<p>Lie: " + lie + " · strokes " + G.strokes + "</p>";
    const wx = Math.cos(G.wind.ang);
    const wy = Math.sin(G.wind.ang);
    const dir = Math.abs(wx) > Math.abs(wy) ? (wx > 0 ? "tail" : "head") : (wy > 0 ? "right" : "left");
    $("windHud").textContent = G.wind.mph.toFixed(1) + " mph · " + dir;
    $("hudMeta").innerHTML =
      "<span>Strokes <b>" + G.strokes + "</b></span>" +
      "<span>Thru <b>" + G.hi + "/" + G.holes.length + "</b></span>" +
      "<span>To pin <b>" + d.toFixed(0) + " yd</b></span>";
    $("dockStatus").textContent = G.club.name + " · " + Math.round(G.power * 100) + "% · marker " + dist(G.ball, G.marker).toFixed(0) + " yd";
  }

  function paintClubs() {
    $("clubs").innerHTML = CLUBS.map(function (c) {
      return '<button type="button" class="club' + (c.id === G.club.id ? " on" : "") + '" data-id="' + c.id + '">' +
        c.name + "<small>" + c.min + "–" + c.max + " yd</small></button>";
    }).join("");
  }

  function shoot() {
    if (G.flying || !G.hole || !G.marker) return;
    const onG = lieAt(G.hole, G.ball) === "green";
    if (G.club.putt && !onG && dist(G.ball, G.hole.pin) > 40) {
      log("Putter wants the green.");
      return;
    }
    G.lastBall = { x: G.ball.x, y: G.ball.y };
    const lie = lieAt(G.hole, G.ball);
    let lieMul = 1;
    if (lie === "rough") lieMul = 0.88;
    if (lie === "bunker") lieMul = 0.72;
    if (lie === "oob") lieMul = 0.8;
    const span = G.club.max - G.club.min;
    let want = G.club.min + span * G.power;
    if (G.club.putt) want = G.club.max * G.power;
    want *= lieMul;
    const aim = ang(G.ball, G.marker);
    const windAlong = Math.cos(G.wind.ang - aim) * G.wind.mph * (want / 100) * 0.35;
    const windCross = Math.sin(G.wind.ang - aim) * G.wind.mph * (want / 100) * 0.55;
    const jitterD = (G.rng() * 2 - 1) * 0.03 * want;
    const jitterA = (G.rng() * 2 - 1) * (Math.PI / 180) * 1.5;
    const actual = Math.max(1, want + windAlong + jitterD);
    const a2 = aim + jitterA + windCross / Math.max(12, actual);
    const dest = {
      x: G.ball.x + Math.cos(a2) * actual,
      y: G.ball.y + Math.sin(a2) * actual,
    };
    G.strokes += 1;
    animateShot(G.ball, dest, function () {
      G.ball = dest;
      const now = lieAt(G.hole, G.ball);
      if (now === "water" || now === "oob") {
        G.strokes += 1;
        G.ball = { x: G.lastBall.x, y: G.lastBall.y };
        log((now === "water" ? "Water. Drop +1." : "Out of bounds. Stroke and distance.") + " Now " + G.strokes);
      } else if (dist(G.ball, G.hole.pin) <= CUP) {
        log("Cup. " + G.strokes + " · par " + G.hole.par);
        holeDone();
        return;
      } else {
        log(G.club.name + " " + Math.round(G.power * 100) + "% → " + actual.toFixed(0) + " yd · " + now);
      }
      autoClub();
      G.marker = { x: G.hole.pin.x, y: G.hole.pin.y };
      renderHoleCard();
      draw();
    });
  }

  function animateShot(from, to, done) {
    const t0 = performance.now();
    const ms = 420 + dist(from, to) * 2.2;
    function tick(now) {
      const u = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - u, 2);
      G.flying = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e };
      draw();
      if (u < 1) requestAnimationFrame(tick);
      else {
        G.flying = null;
        done();
      }
    }
    requestAnimationFrame(tick);
  }

  function holeDone() {
    G.card.push({ hole: G.hi + 1, par: G.hole.par, strokes: G.strokes });
    const vs = G.strokes - G.hole.par;
    const key = (G.course ? G.course.id : "endless") + ":" + (G.hi + 1);
    const prev = G.save.bestHole[key];
    if (prev == null || G.strokes < prev) G.save.bestHole[key] = G.strokes;
    writeSave(G.save);
    G.hi += 1;
    if (G.mode === "endless") {
      G.save.endlessHoles = (G.save.endlessHoles || 0) + 1;
      writeSave(G.save);
      G.holes.push(randomHole());
      setupHole();
      return;
    }
    if (G.hi >= G.holes.length) roundOver();
    else setupHole();
  }

  function vsPar(card) {
    return card.reduce(function (n, h) { return n + (h.strokes - h.par); }, 0);
  }
  function total(card) {
    return card.reduce(function (n, h) { return n + h.strokes; }, 0);
  }

  function roundOver() {
    const t = total(G.card);
    const v = vsPar(G.card);
    G.save.games += 1;
    G.save.rounds.unshift({
      name: (G.save.name || "Operator").slice(0, 24),
      mode: G.mode,
      course: G.course ? G.course.name : "Endless",
      holes: G.card.length,
      total: t,
      vsPar: v,
      at: Date.now(),
    });
    G.save.rounds = G.save.rounds.slice(0, 30);
    writeSave(G.save);
    let extra = "";
    if (G.campaign) {
      let ai = 0;
      G.card.forEach(function (h) {
        ai += h.par + ((G.rng() * 4) | 0) - 1;
      });
      extra = "<p class='lore'>AI rival posted " + ai + ". You posted " + t + ". " +
        (t <= ai ? "You hold the lattice." : "The rival walks away with the pin.") + "</p>";
    }
    showSheet(
      "<p class='kicker'>Round closed</p><h2>" + t + " strokes · " + (v === 0 ? "E" : (v > 0 ? "+" + v : String(v))) + "</h2>" +
      extra + scoreTable() +
      "<div class='modes'><button class='btn gold' id='again'>Play again</button><button class='btn' id='toMenu'>Menu</button></div>"
    );
    $("again").onclick = function () { startRound(G.mode, G.course, G.campaign); };
    $("toMenu").onclick = menu;
  }

  function scoreTable() {
    let h = "<table class='score-table'><tr>";
    G.card.forEach(function (x) { h += "<th>" + x.hole + "</th>"; });
    h += "<th>T</th></tr><tr>";
    G.card.forEach(function (x) { h += "<td>" + x.strokes + "</td>"; });
    h += "<td><b>" + total(G.card) + "</b></td></tr></table>";
    return h;
  }

  function randomHole() {
    const pars = [3, 3, 4, 4, 4, 5, 5];
    const par = pars[(G.rng() * pars.length) | 0];
    const yards = par === 3 ? 130 + G.rng() * 80 : par === 5 ? 480 + G.rng() * 80 : 340 + G.rng() * 90;
    const lat = (G.rng() * 2 - 1) * 18;
    const bunkers = [];
    const nB = 1 + ((G.rng() * 2) | 0);
    for (let i = 0; i < nB; i++) bunkers.push({ x: yards * (0.35 + G.rng() * 0.45), y: (G.rng() * 2 - 1) * 26, r: 10 + G.rng() * 6 });
    const water = G.rng() > 0.55 ? [{ x: yards * 0.5, y: 30 + G.rng() * 20, w: 50 + G.rng() * 40, h: 24 + G.rng() * 14 }] : [];
    return H(par, yards, lat, bunkers, water, 12 + G.rng() * 6);
  }

  function startRound(mode, course, campaign) {
    G.mode = mode;
    G.course = course || null;
    G.campaign = campaign || 0;
    G.rng = mulberry((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    G.card = [];
    G.log = [];
    G.hi = 0;
    if (mode === "endless") G.holes = [randomHole()];
    else if (mode === "18") G.holes = PINE.holes.concat(CORAL.holes);
    else G.holes = (course || PINE).holes.slice();
    if (mode === "18") G.course = { id: "haven-open", name: "Haven Open 18", wind: [1, 7], lore: "Pine Haven front nine, Coral Lattice back nine." };
    hideOverlay();
    $("app").classList.remove("hidden");
    $("boot").classList.add("hidden");
    setupHole();
    paintClubs();
    canvas.focus();
  }

  function hideOverlay() {
    $("overlay").classList.add("hidden");
    $("overlay").classList.remove("studio");
  }
  function showSheet(html, studio) {
    const ov = $("overlay");
    ov.classList.remove("hidden");
    ov.classList.toggle("studio", !!studio);
    ov.innerHTML = studio ? html : "<div class='sheet'>" + html + "</div>";
  }

  function donateHtml() {
    return (
      "<div class='donate-row'>" +
        "<a class='donate-paypal' href='https://www.paypal.com/paypalme/ExcavationPro' target='_blank' rel='noopener noreferrer'>PayPal.me/ExcavationPro</a>" +
        "<a class='donate-patreon' href='https://www.patreon.com/Excavationpro' target='_blank' rel='noopener noreferrer'>Patreon</a>" +
      "</div>"
    );
  }

  function menu() {
    G.mode = "menu";
    $("boot").classList.add("hidden");
    $("app").classList.add("hidden");
    const name = (G.save.name || "").replace(/[<>]/g, "");
    showSheet(
      "<div class='studio-hero'>" +
        "<div class='studio-fade'>" +
          "<p class='kicker'>Δ9Φ963 · eternalhaven.ca</p>" +
          "<h1>LATTICE<br>GOLF</h1>" +
          "<p class='lore'>Pick a club. Plant a marker. Choose 25–100%. Wind is slight and honest — compensate if you can read it.</p>" +
          donateHtml() +
          "<p class='lore' style='margin-top:1rem'>Click the course to plant a marker. 1–4 power. [ ] clubs. Space shoot. Z undo.</p>" +
        "</div>" +
        "<div class='studio-panel'>" +
          "<p class='kicker'>Studio menu</p>" +
          "<label>Operator name</label>" +
          "<input class='name' id='nm' maxlength='24' value='" + name.replace(/'/g, "") + "' placeholder='Operator'>" +
          "<div class='mode-grid'>" +
            "<button type='button' class='mode-card' data-go='pine'><b>Pine Haven 9</b><span>" + PINE.lore + "</span></button>" +
            "<button type='button' class='mode-card' data-go='coral'><b>Coral Lattice 9</b><span>" + CORAL.lore + "</span></button>" +
            "<button type='button' class='mode-card' data-go='18'><b>Haven Open 18</b><span>Front nine parkland, back nine coastal wind.</span></button>" +
            "<button type='button' class='mode-card' data-go='endless'><b>Endless</b><span>Random holes. Count the walk.</span></button>" +
            "<button type='button' class='mode-card' data-go='campaign'><b>Campaign vs AI</b><span>The Haven Circuit. Colder swing. Same pin.</span></button>" +
            "<a class='mode-card' href='./ledger.html'><b>Local ledger</b><span>This browser’s hall of rounds.</span></a>" +
          "</div>" +
          donateHtml() +
          "<p class='lore' style='margin-top:.8rem'><a href='/games/'>All games</a> · Support keeps the arcade on.</p>" +
        "</div>" +
      "</div>",
      true
    );
    $("overlay").onclick = function (e) {
      const b = e.target.closest("[data-go]");
      if (!b) return;
      const nm = ($("nm") && $("nm").value || "").replace(/[<>]/g, "").trim().slice(0, 24);
      if (nm) { G.save.name = nm; writeSave(G.save); }
      const go = b.getAttribute("data-go");
      if (go === "pine") startRound("9", PINE);
      if (go === "coral") startRound("9", CORAL);
      if (go === "18") startRound("18");
      if (go === "endless") startRound("endless");
      if (go === "campaign") startCampaign();
    };
  }

  function startCampaign() {
    showSheet(
      "<p class='kicker'>Campaign</p><h2>The Haven Circuit</h2>" +
      "<p class='lore'>Three events. You play the course. An AI walks the same holes with a colder swing. Lowest total vs par holds the lattice.</p>" +
      donateHtml() +
      "<div class='modes'><button class='btn gold' id='cgo'>Begin Pine Haven</button><button class='btn' id='cno'>Back</button></div>"
    );
    $("cgo").onclick = function () { startRound("9", PINE, 1); };
    $("cno").onclick = menu;
  }

  function help() {
    showSheet(
      "<h2>How to play</h2>" +
      "<ol class='lore'><li>Click the course to plant a marker. It shows distance and line.</li>" +
      "<li>Pick a club whose range covers that line. Gold ring is this power’s carry.</li>" +
      "<li>Choose 25 / 50 / 75 / 100. Wind shifts the ball a little. Aim off the pin to compensate.</li>" +
      "<li>Putter on the green. Water and OOB cost a stroke and you drop.</li>" +
      "<li>Z undoes the last shot. Esc opens the menu.</li></ol>" +
      "<button class='btn gold' id='hk'>Back to the tee</button>"
    );
    $("hk").onclick = hideOverlay;
  }

  function cardSheet() {
    showSheet("<h2>Scorecard</h2>" + (G.card.length ? scoreTable() : "<p class='lore'>No holes closed yet.</p>") +
      "<button class='btn gold' id='ck'>Close</button>");
    $("ck").onclick = hideOverlay;
  }

  canvas.addEventListener("pointerdown", function (e) {
    if (!G.hole) return;
    const r = canvas.getBoundingClientRect();
    G.marker = toWorld(e.clientX - r.left, e.clientY - r.top);
    autoClub();
    renderHoleCard();
    draw();
  });

  document.addEventListener("click", function (e) {
    const club = e.target.closest(".club");
    if (club) {
      G.club = CLUBS.find(function (c) { return c.id === club.getAttribute("data-id"); }) || G.club;
      paintClubs();
      renderHoleCard();
      draw();
    }
    const pow = e.target.closest(".pow");
    if (pow) {
      G.power = Number(pow.getAttribute("data-p"));
      document.querySelectorAll(".pow").forEach(function (p) {
        p.classList.toggle("on", p === pow);
      });
      renderHoleCard();
      draw();
    }
  });

  $("btnShoot").onclick = shoot;
  $("btnUndo").onclick = function () {
    if (!G.lastBall || G.flying) return;
    G.ball = { x: G.lastBall.x, y: G.lastBall.y };
    G.strokes = Math.max(0, G.strokes - 1);
    G.lastBall = null;
    log("Shot undone.");
    autoClub();
    renderHoleCard();
    draw();
  };
  $("btnHelp").onclick = help;
  $("btnCard").onclick = cardSheet;
  $("btnMenu").onclick = menu;

  window.addEventListener("keydown", function (e) {
    if (e.target && (e.target.tagName === "INPUT")) return;
    if (e.key === "Escape") { menu(); return; }
    if (G.mode === "menu") return;
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); shoot(); }
    if (e.key === "z" || e.key === "Z") $("btnUndo").click();
    if (e.key === "[" || e.key === "]") {
      const i = CLUBS.findIndex(function (c) { return c.id === G.club.id; });
      const n = e.key === "]" ? Math.min(CLUBS.length - 1, i + 1) : Math.max(0, i - 1);
      G.club = CLUBS[n];
      paintClubs();
      renderHoleCard();
      draw();
    }
    if (e.key >= "1" && e.key <= "4") {
      const map = { 1: 0.25, 2: 0.5, 3: 0.75, 4: 1 };
      G.power = map[e.key];
      document.querySelectorAll(".pow").forEach(function (p) {
        p.classList.toggle("on", Number(p.getAttribute("data-p")) === G.power);
      });
      renderHoleCard();
      draw();
    }
  });

  window.addEventListener("resize", function () { if (G.hole) { fitView(); draw(); } });

  $("boot").classList.add("hidden");
  menu();
})();
