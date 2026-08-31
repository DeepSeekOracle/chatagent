/* Lattice Golf — Δ9Φ963 · local-first HTML5 */
(function () {
  "use strict";

  const SAVE_KEY = "lygo-lattice-golf-v1";
  const CUP = 3.2;
  const GIMME = 1.8;
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
    { id: "pt", name: "Putter", min: 0, max: 40, putt: true },
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
    const fairW = h.par === 3 ? 28 : h.par === 5 ? 36 : 32;
    const rng = mulberry(((h.yards * 97) ^ (h.par * 13) ^ ((h.lat || 0) * 31)) >>> 0);
    const trees = [];
    const nTree = 10 + (h.par === 5 ? 6 : h.par === 4 ? 3 : 0);
    for (let i = 0; i < nTree; i++) {
      const t = 0.06 + rng() * 0.86;
      const side = rng() < 0.5 ? -1 : 1;
      const lat = fairW + 30 + rng() * 26;
      trees.push({
        x: tee.x + (pin.x - tee.x) * t + (rng() * 8 - 4),
        y: tee.y + (pin.y - tee.y) * t + side * lat,
        r: 4.2 + rng() * 5.4,
      });
    }
    return {
      par: h.par,
      yards: h.yards,
      tee: tee,
      pin: pin,
      greenR: h.greenR,
      bunkers: bunkers,
      water: water,
      trees: trees,
      fairW: fairW,
    };
  }

  function dist(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }
  function ang(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x);
  }
  function distToSeg(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    if (l2 < 1e-8) return dist(p, a);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }
  function shotHolesOut(from, to, pin, putt) {
    const len = dist(from, to);
    if (dist(to, pin) <= CUP) return true;
    if (dist(from, pin) <= GIMME) return true;
    const shortGame = putt || len < 52 || dist(from, pin) < 42;
    if (!shortGame) return false;
    return distToSeg(pin, from, to) <= CUP * 0.92;
  }
  function roundRect(c, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }
  function intendedCarry() {
    const markD = G.marker ? dist(G.ball, G.marker) : 0;
    const near = G.hole && (G.club.putt || dist(G.ball, G.hole.pin) < 45);
    if (near) return Math.min(G.club.max, Math.max(0.35, markD * G.power));
    return G.club.min + (G.club.max - G.club.min) * G.power;
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

    const sky = c.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, "#7eb0d4");
    sky.addColorStop(0.34, "#c9dec8");
    sky.addColorStop(0.5, "#1a3d26");
    sky.addColorStop(1, "#0a1810");
    c.fillStyle = sky;
    c.fillRect(0, 0, canvas.width, canvas.height);

    c.fillStyle = "#1b4a30";
    c.beginPath();
    c.moveTo(0, canvas.height * 0.4);
    c.quadraticCurveTo(canvas.width * 0.22, canvas.height * 0.3, canvas.width * 0.48, canvas.height * 0.38);
    c.quadraticCurveTo(canvas.width * 0.78, canvas.height * 0.46, canvas.width, canvas.height * 0.33);
    c.lineTo(canvas.width, canvas.height);
    c.lineTo(0, canvas.height);
    c.fill();

    function ribbon(widthYd, color) {
      const a = toScr(hole.tee);
      const b = toScr(hole.pin);
      c.lineWidth = widthYd * 2 * view.scale;
      c.strokeStyle = color;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
    }
    ribbon(hole.fairW + 44, "#14321e");
    ribbon(hole.fairW + 28, "#1d4d2e");
    ribbon(hole.fairW, "#2f7a45");
    ribbon(hole.fairW * 0.4, "rgba(90,190,110,.28)");

    const a = toScr(hole.tee);
    const b = toScr(hole.pin);
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len, py = dx / len;
    c.save();
    c.globalAlpha = 0.14;
    c.strokeStyle = "#5eead4";
    c.lineWidth = 1;
    for (let i = 1; i < 12; i++) {
      const t = i / 12;
      const x = a.x + dx * t;
      const y = a.y + dy * t;
      const hw = hole.fairW * view.scale;
      c.beginPath();
      c.moveTo(x + px * hw, y + py * hw);
      c.lineTo(x - px * hw, y - py * hw);
      c.stroke();
    }
    c.restore();

    (hole.trees || []).forEach(function (tr) {
      const p = toScr(tr);
      const r = Math.max(6, tr.r * view.scale);
      c.fillStyle = "rgba(0,0,0,.22)";
      c.beginPath();
      c.ellipse(p.x, p.y + r * 0.4, r * 0.9, r * 0.32, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#14532d";
      c.beginPath();
      c.arc(p.x, p.y - r * 0.12, r, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#166534";
      c.beginPath();
      c.arc(p.x - r * 0.28, p.y - r * 0.32, r * 0.62, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#4ade80";
      c.beginPath();
      c.arc(p.x + r * 0.18, p.y - r * 0.48, r * 0.28, 0, Math.PI * 2);
      c.fill();
    });

    hole.water.forEach(function (wtr) {
      const p = toScr({ x: wtr.x, y: wtr.y });
      const ww = wtr.w * view.scale, hh = wtr.h * view.scale;
      const grd = c.createLinearGradient(p.x, p.y, p.x + ww * 0.2, p.y + hh);
      grd.addColorStop(0, "#4aa0c8");
      grd.addColorStop(0.4, "#1d4e6e");
      grd.addColorStop(1, "#0c2438");
      c.fillStyle = grd;
      roundRect(c, p.x, p.y, ww, hh, 12);
      c.fill();
      c.strokeStyle = "rgba(186,230,253,.4)";
      c.lineWidth = 1.2;
      for (let i = 1; i < 4; i++) {
        c.beginPath();
        c.moveTo(p.x + 8, p.y + hh * i / 4);
        c.quadraticCurveTo(p.x + ww * 0.5, p.y + hh * i / 4 - 5, p.x + ww - 8, p.y + hh * i / 4);
        c.stroke();
      }
    });

    hole.bunkers.forEach(function (bnk) {
      const p = toScr(bnk);
      const r = bnk.r * view.scale;
      c.fillStyle = "#7a5c28";
      c.beginPath();
      c.ellipse(p.x, p.y, r, r * 0.7, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#e7d3a1";
      c.beginPath();
      c.ellipse(p.x, p.y - r * 0.08, r * 0.84, r * 0.55, 0, 0, Math.PI * 2);
      c.fill();
    });

    const tee = toScr(hole.tee);
    c.fillStyle = "#3f8f54";
    c.fillRect(tee.x - 12, tee.y - 9, 18, 18);
    c.fillStyle = "#f8fafc";
    c.fillRect(tee.x - 9, tee.y - 4, 3, 3);
    c.fillRect(tee.x - 9, tee.y + 3, 3, 3);

    const g = toScr(hole.pin);
    const gR = hole.greenR * view.scale;
    c.fillStyle = "#245c34";
    c.beginPath();
    c.arc(g.x, g.y, gR * 1.2, 0, Math.PI * 2);
    c.fill();
    const gg = c.createRadialGradient(g.x - gR * 0.28, g.y - gR * 0.28, 3, g.x, g.y, gR);
    gg.addColorStop(0, "#63d07e");
    gg.addColorStop(0.5, "#3d9a58");
    gg.addColorStop(1, "#2a7542");
    c.fillStyle = gg;
    c.beginPath();
    c.arc(g.x, g.y, gR, 0, Math.PI * 2);
    c.fill();

    const cupR = Math.max(5.5, 2.1 * view.scale);
    c.fillStyle = "#070b08";
    c.beginPath();
    c.arc(g.x, g.y, cupR, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#efe8d6";
    c.lineWidth = 1.6;
    c.stroke();

    c.strokeStyle = "#f8fafc";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(g.x, g.y);
    c.lineTo(g.x, g.y - 28);
    c.stroke();
    c.fillStyle = "#ef4444";
    c.beginPath();
    c.moveTo(g.x, g.y - 28);
    c.lineTo(g.x + 15, g.y - 21);
    c.lineTo(g.x, g.y - 14);
    c.fill();
    c.fillStyle = "#fbbf24";
    c.fillRect(g.x - 2.2, g.y - 2.2, 4.4, 4.4);

    if (G.marker) {
      const m = toScr(G.marker);
      const bp = toScr(G.ball);
      c.strokeStyle = "rgba(94,234,212,.75)";
      c.setLineDash([6, 5]);
      c.beginPath();
      c.moveTo(bp.x, bp.y);
      c.lineTo(m.x, m.y);
      c.stroke();
      c.setLineDash([]);
      const reach = intendedCarry();
      c.strokeStyle = "rgba(251,191,36,.4)";
      c.beginPath();
      c.arc(bp.x, bp.y, reach * view.scale, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = "#5eead4";
      c.beginPath();
      c.arc(m.x, m.y, 5, 0, Math.PI * 2);
      c.fill();
    }
    const ball = G.flying || G.ball;
    const bp = toScr(ball);
    c.fillStyle = "rgba(0,0,0,.28)";
    c.beginPath();
    c.ellipse(bp.x + 1, bp.y + 4, 5, 2.2, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#f7faf6";
    c.beginPath();
    c.arc(bp.x, bp.y, 5.4, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#111";
    c.lineWidth = 1;
    c.stroke();
    c.fillStyle = "rgba(255,255,255,.55)";
    c.beginPath();
    c.arc(bp.x - 1.6, bp.y - 1.8, 1.6, 0, Math.PI * 2);
    c.fill();
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
        c.name + "<small>" + (c.putt ? "to marker" : (c.min + "–" + c.max + " yd")) + "</small></button>";
    }).join("");
  }

  function shoot() {
    if (G.flying || !G.hole || !G.marker) return;
    const pin = G.hole.pin;
    const onG = lieAt(G.hole, G.ball) === "green";
    if (G.club.putt && !onG && dist(G.ball, pin) > 40) {
      log("Putter wants the green.");
      return;
    }
    G.lastBall = { x: G.ball.x, y: G.ball.y };
    const from = { x: G.ball.x, y: G.ball.y };
    if (onG && dist(from, pin) <= GIMME) {
      G.strokes += 1;
      G.ball = { x: pin.x, y: pin.y };
      log("Tap-in. " + G.strokes + " · par " + G.hole.par);
      holeDone();
      return;
    }
    const lie = lieAt(G.hole, G.ball);
    let lieMul = 1;
    if (lie === "rough") lieMul = 0.88;
    if (lie === "bunker") lieMul = 0.72;
    if (lie === "oob") lieMul = 0.8;
    let want = intendedCarry() * lieMul;
    const aim = ang(G.ball, G.marker);
    const greenPutt = G.club.putt && onG;
    const windScale = greenPutt ? 0 : (dist(from, pin) < 45 ? 0.28 : 1);
    const windAlong = Math.cos(G.wind.ang - aim) * G.wind.mph * (want / 100) * 0.35 * windScale;
    const windCross = Math.sin(G.wind.ang - aim) * G.wind.mph * (want / 100) * 0.55 * windScale;
    const jD = greenPutt ? 0.006 : 0.03;
    const jA = greenPutt ? 0.35 : 1.5;
    const jitterD = (G.rng() * 2 - 1) * jD * want;
    const jitterA = (G.rng() * 2 - 1) * (Math.PI / 180) * jA;
    const actual = Math.max(0.25, want + windAlong + jitterD);
    const a2 = aim + jitterA + windCross / Math.max(12, actual);
    let dest = {
      x: G.ball.x + Math.cos(a2) * actual,
      y: G.ball.y + Math.sin(a2) * actual,
    };
    const holed = shotHolesOut(from, dest, pin, G.club.putt);
    if (holed) dest = { x: pin.x, y: pin.y };
    G.strokes += 1;
    animateShot(from, dest, function () {
      G.ball = dest;
      if (holed || dist(G.ball, pin) <= CUP || (lieAt(G.hole, G.ball) === "green" && dist(G.ball, pin) <= GIMME)) {
        log("Cup. " + G.strokes + " · par " + G.hole.par);
        holeDone();
        return;
      }
      const now = lieAt(G.hole, G.ball);
      if (now === "water" || now === "oob") {
        G.strokes += 1;
        G.ball = { x: G.lastBall.x, y: G.lastBall.y };
        log((now === "water" ? "Water. Drop +1." : "Out of bounds. Stroke and distance.") + " Now " + G.strokes);
      } else {
        log(G.club.name + " " + Math.round(G.power * 100) + "% → " + actual.toFixed(1) + " yd · " + now);
      }
      autoClub();
      G.marker = { x: pin.x, y: pin.y };
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
      "<div class='title-screen'>" +
        "<div class='title-art'>" +
          "<img src='./assets/menu.jpg?v=5' alt='Lattice Golf — twilight pin and cup'>" +
          "<div class='title-art-fade'></div>" +
        "</div>" +
        "<div class='title-panel'>" +
          "<p class='kicker'>Δ9Φ963 · eternalhaven.ca</p>" +
          "<h1>LATTICE GOLF</h1>" +
          "<p class='title-tag'>Plant the marker on the cup. 100% rolls that line in.</p>" +
          "<p class='lore'>1–4 power · [ ] clubs · Space shoot · Z undo</p>" +
          "<label style='margin-top:.85rem;display:block'>Operator name</label>" +
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
      "<li>On the green, plant the marker on the cup. Power is a fraction of that line — 100% rolls to the marker, 25% is a tap. The cup swallows the ball if the path goes through it.</li>" +
      "<li>Water and OOB cost a stroke and you drop.</li>" +
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
