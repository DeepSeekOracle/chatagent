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

  function H(par, name, path, opt) {
    opt = opt || {};
    return {
      par: par,
      name: name,
      path: path,
      bunkers: opt.bunkers || [],
      water: opt.water || [],
      groves: opt.groves || [],
      greenR: opt.greenR || (par === 3 ? 13 : 16),
      fairW: opt.fairW || (par === 3 ? 24 : par === 5 ? 34 : 30),
      hint: opt.hint || "",
    };
  }

  const PINE = {
    id: "pine-haven",
    name: "Pine Haven Championship",
    wind: [0, 4],
    lore: "Parkland doglegs through old-growth. Play the corner. The pin is rarely the first shot.",
    holes: [
      H(4, "Opening Cut", [{ x: 0, y: 0 }, { x: 205, y: -8 }, { x: 385, y: 88 }], {
        hint: "Dogleg right. A pine wall sits on the straight line to the pin. Play the corner.",
        forests: [{ x: 85, y: 10, w: 250, h: 82 }],
        bunkers: [{ x: 198, y: -28, r: 13 }, { x: 368, y: 104, r: 11 }],
        groves: [{ x: 230, y: -42, n: 5, r: 16 }],
      }),
      H(3, "Chapel Pond", [{ x: 0, y: 0 }, { x: 168, y: 0 }], {
        hint: "Island green. The pond covers every line. Carry it or drop.",
        water: [{ x: 24, y: -58, w: 122, h: 116 }],
        bunkers: [{ x: 158, y: 18, r: 9 }],
        greenR: 12,
        fairW: 16,
      }),
      H(5, "Twin Pines", [{ x: 0, y: 0 }, { x: 215, y: 62 }, { x: 405, y: -48 }, { x: 590, y: 22 }], {
        hint: "Double dogleg. Woods fill both insides. Three shots around, not through.",
        forests: [{ x: 70, y: 8, w: 210, h: 58 }, { x: 270, y: -40, w: 200, h: 52 }],
        bunkers: [{ x: 208, y: 80, r: 13 }, { x: 398, y: -66, r: 12 }, { x: 572, y: 38, r: 11 }],
        water: [{ x: 430, y: -8, w: 48, h: 40 }],
      }),
      H(4, "Orchard Elbow", [{ x: 0, y: 0 }, { x: 210, y: 6 }, { x: 395, y: -92 }], {
        hint: "Severe dogleg left. The orchard is the Eisenhower tree: the cut is dead.",
        forests: [{ x: 80, y: -88, w: 260, h: 78 }],
        groves: [{ x: 230, y: 28, n: 6, r: 18 }],
        bunkers: [{ x: 202, y: -18, r: 12 }, { x: 378, y: -74, r: 11 }],
      }),
      H(3, "North Watch", [{ x: 0, y: 0 }, { x: 205, y: 48 }], {
        hint: "Redan. Green sits diagonal. The front-left bunker eats a line at the pin.",
        bunkers: [{ x: 168, y: 36, r: 14 }, { x: 198, y: 66, r: 10 }],
        greenR: 14,
        fairW: 22,
      }),
      H(4, "Miller's Cape", [{ x: 0, y: 0 }, { x: 175, y: -52 }, { x: 355, y: -18 }], {
        hint: "Cape. Bite off water if you want — driver cannot clear it. Play left, then in.",
        water: [{ x: 40, y: -22, w: 300, h: 88 }],
        bunkers: [{ x: 168, y: -70, r: 12 }],
      }),
      H(5, "Creek Walk", [{ x: 0, y: 0 }, { x: 200, y: 8 }, { x: 390, y: 8 }, { x: 575, y: -40 }], {
        hint: "Two creeks cut the fairway. Carry each, or lay short of each.",
        water: [
          { x: 168, y: -36, w: 46, h: 88 },
          { x: 408, y: -70, w: 50, h: 92 },
        ],
        forests: [{ x: 250, y: 28, w: 120, h: 42 }],
        bunkers: [{ x: 360, y: 26, r: 12 }, { x: 558, y: -22, r: 11 }],
      }),
      H(4, "Ridge Turn", [{ x: 0, y: 0 }, { x: 245, y: -10 }, { x: 460, y: 86 }], {
        hint: "Long dogleg right. Bunkers at the elbow, pines on the cut.",
        forests: [{ x: 90, y: 8, w: 300, h: 82 }],
        bunkers: [{ x: 238, y: -28, r: 14 }, { x: 242, y: 14, r: 12 }, { x: 442, y: 102, r: 12 }],
      }),
      H(3, "Haven Stamp", [{ x: 0, y: 0 }, { x: 132, y: 0 }], {
        hint: "Postage stamp. Tiny green. The front bunker is on the line — carry it.",
        bunkers: [{ x: 100, y: 0, r: 15 }],
        greenR: 9,
        fairW: 16,
      }),
    ],
  };
  const CORAL = {
    id: "coral-lattice",
    name: "Coral Lattice Links",
    wind: [2, 8],
    lore: "Coastal lattice. Wind is a teacher. Water is the examiner. Play around the inlets.",
    holes: [
      H(4, "Salt Flats", [{ x: 0, y: 0 }, { x: 200, y: 8 }, { x: 375, y: -78 }], {
        hint: "Ocean left of the turn. The shoreline wall kills a cut at the pin.",
        water: [{ x: 30, y: -110, w: 310, h: 55 }],
        forests: [{ x: 90, y: -72, w: 230, h: 62 }],
        bunkers: [{ x: 192, y: 24, r: 13 }, { x: 358, y: -60, r: 11 }],
      }),
      H(3, "Cay Carry", [{ x: 0, y: 0 }, { x: 155, y: 0 }], {
        hint: "Sawgrass island. Water on every line. Hit the green or swim.",
        water: [{ x: 18, y: -62, w: 118, h: 124 }],
        greenR: 11,
        fairW: 14,
      }),
      H(5, "Lagoon Bend", [{ x: 0, y: 0 }, { x: 215, y: 70 }, { x: 400, y: 70 }, { x: 575, y: -8 }], {
        hint: "Heroic lagoon. Water fills the elbow — you cannot fly the cut.",
        water: [{ x: 70, y: -6, w: 360, h: 62 }],
        bunkers: [{ x: 208, y: 88, r: 13 }, { x: 556, y: 12, r: 12 }],
      }),
      H(4, "Backwind", [{ x: 0, y: 0 }, { x: 205, y: -6 }, { x: 445, y: 96 }], {
        hint: "Hard dogleg right. A forest wall is the straight shot.",
        forests: [{ x: 85, y: 8, w: 300, h: 90 }],
        bunkers: [{ x: 198, y: -24, r: 13 }, { x: 428, y: 112, r: 12 }],
      }),
      H(4, "Inlet Cape", [{ x: 0, y: 0 }, { x: 160, y: -58 }, { x: 350, y: 12 }], {
        hint: "Cape over the inlet. The water is on the pin line. Driver cannot clear it.",
        water: [{ x: 45, y: -24, w: 280, h: 78 }],
        bunkers: [{ x: 152, y: -74, r: 11 }],
      }),
      H(3, "Marsh Pin", [{ x: 0, y: 0 }, { x: 220, y: 0 }], {
        hint: "Forced carry. Marsh covers the entire shot. Club up and commit.",
        water: [{ x: 28, y: -50, w: 168, h: 100 }],
        bunkers: [{ x: 210, y: 20, r: 10 }],
        greenR: 12,
        fairW: 16,
      }),
      H(5, "Two Cays", [{ x: 0, y: 0 }, { x: 195, y: -58 }, { x: 375, y: 52 }, { x: 595, y: -12 }], {
        hint: "S around two cays. Water down the spine blocks the chord.",
        water: [{ x: 70, y: -18, w: 400, h: 40 }],
        bunkers: [{ x: 188, y: -76, r: 12 }, { x: 368, y: 70, r: 13 }, { x: 578, y: 8, r: 11 }],
      }),
      H(4, "Dune Gate", [{ x: 0, y: 0 }, { x: 230, y: 4 }, { x: 455, y: 78 }], {
        hint: "Bottleneck. Two bunkers and a dune wood make a slot. Thread it.",
        forests: [{ x: 70, y: 22, w: 280, h: 62 }],
        bunkers: [{ x: 218, y: -18, r: 15 }, { x: 222, y: 28, r: 15 }, { x: 438, y: 60, r: 11 }],
      }),
      H(3, "Last Light", [{ x: 0, y: 0 }, { x: 128, y: -8 }], {
        hint: "Water short of the pin on the line. Carry the front or it's wet.",
        water: [{ x: 32, y: -48, w: 78, h: 88 }],
        bunkers: [{ x: 118, y: 12, r: 10 }],
        greenR: 11,
      }),
    ],
  };

  function pathLen(path) {
    let n = 0;
    for (let i = 0; i < path.length - 1; i++) n += dist(path[i], path[i + 1]);
    return n;
  }
  function distToPath(p, path) {
    let best = 1e9;
    for (let i = 0; i < path.length - 1; i++) best = Math.min(best, distToSeg(p, path[i], path[i + 1]));
    return best;
  }
  function nextAim(hole, ball) {
    if (dist(ball, hole.pin) <= hole.greenR + 8) return { x: hole.pin.x, y: hole.pin.y };
    const path = hole.path;
    for (let i = 1; i < path.length; i++) {
      if (dist(ball, path[i]) > 36) return { x: path[i].x, y: path[i].y };
    }
    return { x: hole.pin.x, y: hole.pin.y };
  }

  function worldHole(h) {
    const origin = { x: 48, y: CENTER };
    const path = (h.path && h.path.length ? h.path : [{ x: 0, y: 0 }, { x: h.yards || 350, y: 0 }]).map(function (p) {
      return { x: origin.x + p.x, y: origin.y + p.y };
    });
    const tee = { x: path[0].x, y: path[0].y };
    const pin = { x: path[path.length - 1].x, y: path[path.length - 1].y };
    const bunkers = (h.bunkers || []).map(function (b) {
      return { x: origin.x + b.x, y: origin.y + b.y, r: b.r };
    });
    const water = (h.water || []).map(function (w) {
      return { x: origin.x + w.x, y: origin.y + w.y, w: w.w, h: w.h };
    });
    const fairW = h.fairW || 30;
    const seed = ((pathLen(path) * 97) ^ (h.par * 13) ^ (path.length * 19)) >>> 0;
    const rng = mulberry(seed);
    const trees = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const seg = dist(a, b);
      const nx = -(b.y - a.y) / (seg || 1);
      const ny = (b.x - a.x) / (seg || 1);
      const nAlong = Math.max(2, Math.round(seg / 55));
      for (let k = 0; k < nAlong; k++) {
        const t = (k + 0.35) / nAlong;
        const side = (k % 2 === 0 ? 1 : -1) * (rng() < 0.22 ? -1 : 1);
        const lat = fairW + 26 + rng() * 22;
        trees.push({
          x: a.x + (b.x - a.x) * t + nx * side * lat,
          y: a.y + (b.y - a.y) * t + ny * side * lat,
          r: 4 + rng() * 5.2,
        });
      }
    }
    (h.groves || []).forEach(function (g) {
      const cx = origin.x + g.x, cy = origin.y + g.y;
      const n = g.n || 6;
      for (let i = 0; i < n; i++) {
        const ang = (Math.PI * 2 * i) / n + rng() * 0.4;
        const rad = rng() * (g.r || 20);
        trees.push({
          x: cx + Math.cos(ang) * rad,
          y: cy + Math.sin(ang) * rad,
          r: 4.5 + rng() * 4.5,
          block: true,
        });
      }
    });
    const forestSpec = h.forests && h.forests.length ? h.forests : [];
    const forests = forestSpec.map(function (f) {
      return { x: origin.x + f.x, y: origin.y + f.y, w: f.w, h: f.h };
    });
    forests.forEach(function (f) {
      const n = Math.max(8, Math.round((f.w * f.h) / 95));
      for (let i = 0; i < n; i++) {
        trees.push({
          x: f.x + 4 + rng() * Math.max(4, f.w - 8),
          y: f.y + 4 + rng() * Math.max(4, f.h - 8),
          r: 4.2 + rng() * 4.8,
          block: true,
        });
      }
    });
    const cutProbe = { path: path, fairW: fairW, water: water, forests: forests };
    for (let e = 0; e < path.length - 2; e++) {
      const a = path[e], b = path[e + 1], c = path[e + 2];
      for (let n = 0; n < 28; n++) {
        let u = rng(), v = rng();
        if (u + v > 1) { u = 1 - u; v = 1 - v; }
        const p = { x: a.x + u * (b.x - a.x) + v * (c.x - a.x), y: a.y + u * (b.y - a.y) + v * (c.y - a.y) };
        if (inDoglegCut(p, cutProbe) && !inWater(p, cutProbe)) {
          trees.push({ x: p.x, y: p.y, r: 4.4 + rng() * 5, block: true });
        }
      }
    }
    return {
      par: h.par,
      name: h.name || "",
      hint: h.hint || "",
      yards: pathLen(path),
      tee: tee,
      pin: pin,
      path: path,
      greenR: h.greenR || 16,
      bunkers: bunkers,
      water: water,
      forests: forests,
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
  function inRect(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }
  function pointInTri(p, a, b, c) {
    const d = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
    if (Math.abs(d) < 1e-8) return false;
    const u = ((b.y - c.y) * (p.x - c.x) + (c.x - b.x) * (p.y - c.y)) / d;
    const v = ((c.y - a.y) * (p.x - c.x) + (a.x - c.x) * (p.y - c.y)) / d;
    const w = 1 - u - v;
    return u >= -0.001 && v >= -0.001 && w >= -0.001;
  }
  function inWater(p, hole) {
    const w = hole.water || [];
    for (let i = 0; i < w.length; i++) if (inRect(p, w[i])) return true;
    return false;
  }
  function inDoglegCut(p, hole) {
    const path = hole.path;
    if (!path || path.length < 3) return false;
    if (distToPath(p, path) <= (hole.fairW || 30) + 8) return false;
    for (let i = 0; i < path.length - 2; i++) {
      if (pointInTri(p, path[i], path[i + 1], path[i + 2])) return true;
    }
    return false;
  }
  function firstFlightHit(from, to, hole) {
    const len = dist(from, to);
    if (len < 10) return null;
    const steps = Math.max(20, Math.ceil(len / 2.5));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (t * len < 10) continue;
      const p = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      if (inWater(p, hole)) continue;
      if (inDoglegCut(p, hole)) return { p: p, kind: "trees" };
      const forests = hole.forests || [];
      for (let f = 0; f < forests.length; f++) {
        if (inRect(p, forests[f]) && distToPath(p, hole.path) > hole.fairW + 6) return { p: p, kind: "trees" };
      }
      const trees = hole.trees || [];
      for (let k = 0; k < trees.length; k++) {
        if (trees[k].block && dist(p, trees[k]) <= trees[k].r * 1.08) return { p: p, kind: "trees" };
      }
    }
    return null;
  }
  function elbowForest(path, fairW) {
    if (!path || path.length < 3) return [];
    const a = path[0], b = path[1], c = path[path.length - 1];
    const mid = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 };
    const vx = mid.x - b.x, vy = mid.y - b.y;
    const vlen = Math.hypot(vx, vy) || 1;
    const pad = (fairW || 30) + 16;
    const inward = { x: b.x + (vx / vlen) * pad, y: b.y + (vy / vlen) * pad };
    const x0 = Math.min(a.x + 55, inward.x, mid.x, c.x - 25);
    const x1 = Math.max(a.x + 90, inward.x, mid.x, c.x - 20);
    const y0 = Math.min(inward.y, mid.y, (a.y + c.y) / 2);
    const y1 = Math.max(inward.y, mid.y, (a.y + c.y) / 2);
    const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);
    if (w < 36 || h < 22) return [];
    return [{ x: Math.min(x0, x1), y: Math.min(y0, y1), w: w, h: Math.max(28, h) }];
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
      if (inRect(p, hole.water[i])) return "water";
    }
    for (let i = 0; i < hole.bunkers.length; i++) {
      if (dist(p, hole.bunkers[i]) <= hole.bunkers[i].r) return "bunker";
    }
    const forests = hole.forests || [];
    for (let i = 0; i < forests.length; i++) {
      if (inRect(p, forests[i]) && distToPath(p, hole.path) > hole.fairW + 4) return "trees";
    }
    const trees = hole.trees || [];
    for (let i = 0; i < trees.length; i++) {
      if (trees[i].block && dist(p, trees[i]) <= trees[i].r * 0.9) return "trees";
    }
    const lat = distToPath(p, hole.path);
    if (lat < hole.fairW) return "fairway";
    if (lat < hole.fairW + 26) return "rough";
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
    G.marker = nextAim(G.hole, G.ball);
    G.strokes = 0;
    G.lastBall = null;
    G.flying = null;
    rollWind();
    autoClub();
    $("holePill").textContent = "HOLE " + (G.hi + 1);
    renderHoleCard();
    log("Hole " + (G.hi + 1) + (G.hole.name ? " · " + G.hole.name : "") +
      " · par " + G.hole.par + " · " + Math.round(G.hole.yards) + " yd" +
      (G.hole.hint ? " — " + G.hole.hint : ""));
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
    const hole = G.hole;
    let minX = hole.tee.x, minY = hole.tee.y, maxX = hole.tee.x, maxY = hole.tee.y;
    function grow(x, y, r) {
      r = r || 0;
      minX = Math.min(minX, x - r);
      minY = Math.min(minY, y - r);
      maxX = Math.max(maxX, x + r);
      maxY = Math.max(maxY, y + r);
    }
    (hole.path || []).forEach(function (p) { grow(p.x, p.y, hole.fairW + 36); });
    hole.bunkers.forEach(function (b) { grow(b.x, b.y, b.r); });
    hole.water.forEach(function (wt) { grow(wt.x, wt.y, 0); grow(wt.x + wt.w, wt.y + wt.h, 0); });
    (hole.forests || []).forEach(function (f) { grow(f.x, f.y, 0); grow(f.x + f.w, f.y + f.h, 0); });
    grow(hole.pin.x, hole.pin.y, hole.greenR + 8);
    const pad = 28;
    const bw = Math.max(80, maxX - minX + pad * 2);
    const bh = Math.max(80, maxY - minY + pad * 2);
    view.scale = Math.min(w / bw, h / bh) * 0.94;
    view.ox = (w - (minX + maxX) * view.scale) / 2;
    view.oy = (h - (minY + maxY) * view.scale) / 2;
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

    const pathPts = hole.path || [hole.tee, hole.pin];
    if (pathPts.length >= 3) {
      c.fillStyle = "rgba(10, 40, 20, .9)";
      for (let e = 0; e < pathPts.length - 2; e++) {
        const a = toScr(pathPts[e]), b = toScr(pathPts[e + 1]), d = toScr(pathPts[e + 2]);
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
        c.lineTo(d.x, d.y);
        c.closePath();
        c.fill();
      }
    }
    (hole.forests || []).forEach(function (f) {
      const p = toScr({ x: f.x, y: f.y });
      c.fillStyle = "rgba(8, 36, 18, .5)";
      roundRect(c, p.x, p.y, f.w * view.scale, f.h * view.scale, 10);
      c.fill();
    });

    function ribbon(widthYd, color) {
      const pts = hole.path || [hole.tee, hole.pin];
      c.lineWidth = widthYd * 2 * view.scale;
      c.strokeStyle = color;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.beginPath();
      const a = toScr(pts[0]);
      c.moveTo(a.x, a.y);
      for (let i = 1; i < pts.length; i++) {
        const p = toScr(pts[i]);
        c.lineTo(p.x, p.y);
      }
      c.stroke();
    }
    ribbon(hole.fairW + 44, "#14321e");
    ribbon(hole.fairW + 28, "#1d4d2e");
    ribbon(hole.fairW, "#2f7a45");
    ribbon(hole.fairW * 0.4, "rgba(90,190,110,.28)");

    const pts = hole.path || [hole.tee, hole.pin];
    c.save();
    c.globalAlpha = 0.14;
    c.strokeStyle = "#5eead4";
    c.lineWidth = 1;
    for (let s = 0; s < pts.length - 1; s++) {
      const a = toScr(pts[s]);
      const b = toScr(pts[s + 1]);
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const px = -dy / len, py = dx / len;
      const n = Math.max(3, Math.round(len / 38));
      for (let i = 1; i < n; i++) {
        const t = i / n;
        const x = a.x + dx * t;
        const y = a.y + dy * t;
        const hw = hole.fairW * view.scale;
        c.beginPath();
        c.moveTo(x + px * hw, y + py * hw);
        c.lineTo(x - px * hw, y - py * hw);
        c.stroke();
      }
    }
    c.restore();

    (pts || []).forEach(function (wp, i) {
      if (i === 0 || i === pts.length - 1) return;
      const p = toScr(wp);
      c.fillStyle = "rgba(251,191,36,.85)";
      c.beginPath();
      c.arc(p.x, p.y, 4, 0, Math.PI * 2);
      c.fill();
    });

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
      "<p>" + (G.hole.name ? G.hole.name + " · " : "") + "Par " + G.hole.par + " · " + Math.round(G.hole.yards) + " yd</p>" +
      "<p>To pin <b>" + d.toFixed(1) + " yd</b></p>" +
      "<p>Lie: " + lie + " · strokes " + G.strokes + "</p>" +
      (G.hole.hint ? "<p class='lore'>" + G.hole.hint + "</p>" : "");
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
    if (lie === "rough" || lie === "trees") lieMul = lie === "trees" ? 0.62 : 0.88;
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
    let flightNote = null;
    if (!G.club.putt) {
      const hit = firstFlightHit(from, dest, G.hole);
      if (hit) {
        dest = hit.p;
        flightNote = hit.kind;
      }
    }
    const holed = !flightNote && shotHolesOut(from, dest, pin, G.club.putt);
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
      } else if (flightNote === "trees") {
        log("Into the trees. Ball stops. " + dist(from, dest).toFixed(0) + " yd · " + now);
      } else {
        log(G.club.name + " " + Math.round(G.power * 100) + "% → " + actual.toFixed(1) + " yd · " + now);
      }
      G.marker = nextAim(G.hole, G.ball);
      autoClub();
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
    G.card.push({
      hole: G.hi + 1,
      name: G.hole.name || ("Hole " + (G.hi + 1)),
      par: G.hole.par,
      yards: Math.round(G.hole.yards),
      strokes: G.strokes,
      vsPar: G.strokes - G.hole.par,
      hint: G.hole.hint || "",
    });
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
      courseId: G.course ? G.course.id : "endless",
      holes: G.card.length,
      par: G.card.reduce(function (n, h) { return n + h.par; }, 0),
      yards: G.card.reduce(function (n, h) { return n + (h.yards || 0); }, 0),
      total: t,
      vsPar: v,
      at: Date.now(),
      card: G.card.slice(),
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
      "<p class='kicker'>Round closed</p><h2>" + t + " strokes · " + vsLabel(v) + "</h2>" +
      extra + scorecardHtml(true) +
      "<div class='modes'><button class='btn gold' id='again'>Play again</button><button class='btn' id='scCopy'>Copy card</button><button class='btn' id='toMenu'>Menu</button></div>",
      false,
      true
    );
    bindScorecard();
    $("again").onclick = function () { startRound(G.mode, G.course, G.campaign); };
    $("toMenu").onclick = menu;
  }

  function vsLabel(n) {
    if (n == null || n === 0) return "E";
    return n > 0 ? "+" + n : String(n);
  }
  function scoreWord(vs) {
    if (vs <= -3) return "albatross";
    if (vs === -2) return "eagle";
    if (vs === -1) return "birdie";
    if (vs === 0) return "par";
    if (vs === 1) return "bogey";
    if (vs === 2) return "double bogey";
    return "+" + vs;
  }
  function scoreClass(vs) {
    if (vs <= -2) return "sc-eagle";
    if (vs === -1) return "sc-birdie";
    if (vs === 0) return "sc-par";
    if (vs === 1) return "sc-bogey";
    return "sc-double";
  }
  function holeYards(src) {
    if (!src) return 0;
    if (src.yards) return Math.round(src.yards);
    if (src.path && src.path.length) return Math.round(pathLen(src.path));
    return 0;
  }
  function cardRows() {
    const n = Math.max(G.holes.length, G.card.length);
    const rows = [];
    for (let i = 0; i < n; i++) {
      const src = G.holes[i] || {};
      const played = G.card[i];
      const par = (played && played.par) || src.par || 4;
      rows.push({
        n: i + 1,
        name: (played && played.name) || src.name || ("Hole " + (i + 1)),
        par: par,
        yards: (played && played.yards) || holeYards(src),
        hint: (played && played.hint) || src.hint || "",
        strokes: played ? played.strokes : null,
        vs: played ? played.strokes - par : null,
        current: G.mode !== "menu" && i === G.hi && !played,
        best: G.save.bestHole[(G.course ? G.course.id : "endless") + ":" + (i + 1)],
      });
    }
    return rows;
  }
  function sumField(rows, key) {
    return rows.reduce(function (n, r) { return n + (r[key] || 0); }, 0);
  }
  function scoreGroupTable(label, rows, offset) {
    let head = "<th class='sc-lab'>" + label + "</th>";
    let yds = "<th class='sc-lab'>Yds</th>";
    let par = "<th class='sc-lab'>Par</th>";
    let sc = "<th class='sc-lab'>Score</th>";
    let rel = "<th class='sc-lab'>+/−</th>";
    rows.forEach(function (r, i) {
      const idx = offset + i;
      const cls = (r.current ? " sc-now" : "") + (r.strokes != null ? " " + scoreClass(r.vs) : " sc-open");
      const attr = " data-sc='" + idx + "' tabindex='0' role='button' title='" + String(r.name || "").replace(/'/g, "") + "'";
      head += "<th" + attr + " class='sc-h" + (r.current ? " sc-now" : "") + "'>" + r.n + "</th>";
      yds += "<td" + attr + ">" + (r.yards || "—") + "</td>";
      par += "<td" + attr + ">" + r.par + "</td>";
      sc += "<td" + attr + " class='sc-score" + cls + "'>" + (r.strokes == null ? (r.current ? "·" : "—") : r.strokes) + "</td>";
      rel += "<td" + attr + " class='" + (r.strokes == null ? "" : scoreClass(r.vs)) + "'>" + (r.strokes == null ? "" : vsLabel(r.vs)) + "</td>";
    });
    const played = rows.filter(function (r) { return r.strokes != null; });
    const totS = sumField(played, "strokes");
    const totP = sumField(rows, "par");
    const totY = sumField(rows, "yards");
    const totV = played.length ? totS - sumField(played, "par") : null;
    head += "<th>T</th>";
    yds += "<td>" + totY + "</td>";
    par += "<td>" + totP + "</td>";
    sc += "<td><b>" + (played.length ? totS : "—") + "</b></td>";
    rel += "<td><b>" + (totV == null ? "—" : vsLabel(totV)) + "</b></td>";
    return "<div class='sc-wrap'><table class='score-table sc-table'><tr>" + head + "</tr><tr>" + yds +
      "</tr><tr>" + par + "</tr><tr>" + sc + "</tr><tr>" + rel + "</tr></table></div>";
  }
  function scorecardHtml() {
    const rows = cardRows();
    if (!rows.length) return "<p class='lore'>No holes on this card yet.</p>";
    const groups = [];
    if (rows.length > 9) {
      groups.push({ label: "Out", rows: rows.slice(0, 9), off: 0 });
      groups.push({ label: "In", rows: rows.slice(9, 18), off: 9 });
      if (rows.length > 18) groups.push({ label: "Extra", rows: rows.slice(18), off: 18 });
    } else {
      groups.push({ label: "Nine", rows: rows, off: 0 });
    }
    const played = G.card;
    const t = played.length ? total(played) : 0;
    const v = played.length ? vsPar(played) : 0;
    const parTot = rows.reduce(function (n, r) { return n + r.par; }, 0);
    const ydsTot = rows.reduce(function (n, r) { return n + r.yards; }, 0);
    const thru = played.length;
    const when = new Date().toLocaleString();
    const meta =
      "<div class='sc-meta'>" +
        "<div><span>Operator</span><b>" + (G.save.name || "Operator").replace(/[<>]/g, "") + "</b></div>" +
        "<div><span>Course</span><b>" + ((G.course && G.course.name) || "Endless") + "</b></div>" +
        "<div><span>Thru</span><b>" + thru + "/" + rows.length + "</b></div>" +
        "<div><span>Par</span><b>" + parTot + "</b></div>" +
        "<div><span>Yards</span><b>" + ydsTot + "</b></div>" +
        "<div><span>Score</span><b>" + (thru ? t + " · " + vsLabel(v) : "—") + "</b></div>" +
        "<div><span>Wind</span><b>" + (G.wind.mph ? G.wind.mph.toFixed(1) + " mph" : "—") + "</b></div>" +
        "<div><span>Local</span><b>" + when + "</b></div>" +
      "</div>";
    let tables = "";
    groups.forEach(function (g) {
      if (g.rows.length) tables += scoreGroupTable(g.label, g.rows, g.off);
    });
    return meta + tables +
      "<p class='sc-legend'><span class='sc-eagle'>eagle</span> <span class='sc-birdie'>birdie</span> <span class='sc-par'>par</span> <span class='sc-bogey'>bogey</span> <span class='sc-double'>double+</span> · click a hole</p>" +
      "<div class='sc-detail' id='scDetail'>Click a hole for name, yards, your line, and the best this browser has posted there.</div>";
  }
  function cardPlaintext() {
    const rows = cardRows();
    let t = "Lattice Golf — " + ((G.course && G.course.name) || "Endless") + "\n";
    t += (G.save.name || "Operator") + " · " + new Date().toLocaleString() + "\n";
    rows.forEach(function (r) {
      t += r.n + ". " + r.name + "  par " + r.par + "  " + r.yards + " yd  " +
        (r.strokes == null ? "—" : r.strokes + "  " + vsLabel(r.vs)) + "\n";
    });
    if (G.card.length) t += "Total " + total(G.card) + "  " + vsLabel(vsPar(G.card)) + "\n";
    t += "eternalhaven.ca/games/lattice-golf/\n";
    return t;
  }
  function bindScorecard() {
    const detail = $("scDetail");
    const cells = document.querySelectorAll("[data-sc]");
    function show(i, el) {
      const rows = cardRows();
      const r = rows[i];
      if (!r || !detail) return;
      cells.forEach(function (c) { c.classList.toggle("sc-pick", c.getAttribute("data-sc") === String(i)); });
      const line = r.strokes == null
        ? (r.current ? "On this hole now." : "Not played yet.")
        : (r.strokes + " strokes · " + scoreWord(r.vs) + " (" + vsLabel(r.vs) + ")");
      detail.innerHTML = "<b>" + r.n + ". " + r.name + "</b> · par " + r.par + " · " + r.yards + " yd" +
        (r.best != null ? " · best here " + r.best : "") +
        "<br>" + line +
        (r.hint ? "<br><span class='lore'>" + r.hint + "</span>" : "");
    }
    cells.forEach(function (el) {
      el.onclick = function () { show(Number(el.getAttribute("data-sc")), el); };
    });
    const copy = $("scCopy");
    if (copy) {
      copy.onclick = function () {
        const text = cardPlaintext();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            copy.textContent = "Copied";
            setTimeout(function () { copy.textContent = "Copy card"; }, 1400);
          }).catch(function () { /* private */ });
        }
      };
    }
  }

  function randomHole() {
    const rng = G.rng;
    const pars = [3, 3, 4, 4, 4, 5, 5];
    const par = pars[(rng() * pars.length) | 0];
    const long = rng() > 0.58;
    const shapes = par === 3 ? ["carry", "pinch"] : par === 5 ? ["s", "double"] : ["dogL", "dogR", "cape"];
    const shape = shapes[(rng() * shapes.length) | 0];
    let path, water = [], bunkers = [], groves = [], forests = [], hint = "Play the fairway.";
    if (par === 3 && shape === "carry") {
      const yds = long ? 200 + rng() * 40 : 135 + rng() * 55;
      path = [{ x: 0, y: 0 }, { x: yds, y: 0 }];
      water = [{ x: 22, y: -56, w: yds * 0.72, h: 112 }];
      hint = long ? "Island carry. Club up." : "Island. Carry the water.";
    } else if (par === 3) {
      const yds = long ? 205 + rng() * 35 : 140 + rng() * 50;
      path = [{ x: 0, y: 0 }, { x: yds, y: (rng() * 2 - 1) * 22 }];
      bunkers = [{ x: yds * 0.78, y: -16, r: 11 }, { x: yds * 0.8, y: 18, r: 10 }];
      hint = long ? "Long three. Wood or hybrid." : "Bunkers pinch the green.";
    } else if (shape === "dogL") {
      const mid = long ? 210 + rng() * 30 : 175 + rng() * 40;
      const end = long ? 450 + rng() * 45 : 340 + rng() * 50;
      path = [{ x: 0, y: 0 }, { x: mid, y: 6 }, { x: end, y: -78 - rng() * 16 }];
      groves = [{ x: mid + 20, y: 24, n: 7, r: 22 }];
      bunkers = [{ x: mid, y: -22, r: 12 }];
      hint = long ? "Long dogleg left. Trees own the cut." : "Dogleg left. Trees own the cut.";
    } else if (shape === "dogR") {
      const mid = long ? 210 + rng() * 30 : 175 + rng() * 40;
      const end = long ? 450 + rng() * 45 : 345 + rng() * 50;
      path = [{ x: 0, y: 0 }, { x: mid, y: -6 }, { x: end, y: 78 + rng() * 16 }];
      groves = [{ x: mid + 20, y: -24, n: 7, r: 22 }];
      bunkers = [{ x: mid, y: 22, r: 12 }];
      hint = long ? "Long dogleg right. Trees own the cut." : "Dogleg right. Trees own the cut.";
    } else if (shape === "cape") {
      const mid = long ? 175 + rng() * 20 : 150 + rng() * 20;
      const end = long ? 430 + rng() * 40 : 340 + rng() * 40;
      path = [{ x: 0, y: 0 }, { x: mid, y: -52 }, { x: end, y: -16 }];
      water = [{ x: 40, y: -22, w: Math.max(240, end - 70), h: 86 }];
      hint = long ? "Cape. Water sits on the pin line. Play around." : "Cape. Water sits on the pin line.";
    } else if (shape === "s") {
      const end = long ? 590 + rng() * 45 : 500 + rng() * 30;
      path = [{ x: 0, y: 0 }, { x: 210, y: 52 }, { x: 380, y: -32 }, { x: end, y: 18 }];
      water = [{ x: 340, y: 4, w: 80, h: 34 }];
      bunkers = [{ x: 200, y: 70, r: 13 }, { x: 372, y: -50, r: 12 }];
      hint = long ? "Long S-curve. Three honest shots." : "S-curve. Two turns.";
    } else {
      const end = long ? 600 + rng() * 40 : 520;
      path = [{ x: 0, y: 0 }, { x: 220, y: 28 }, { x: 390, y: 28 }, { x: end, y: -22 }];
      water = [{ x: 190, y: -6, w: 42, h: 68 }, { x: 420, y: -50, w: 46, h: 74 }];
      hint = long ? "Long five. Two carries." : "Two carries.";
    }
    if (path && path.length >= 3 && !forests.length) forests = elbowForest(path, par === 5 ? 34 : 30);
    return H(par, "Random " + shape, path, {
      bunkers: bunkers,
      water: water,
      groves: groves,
      forests: forests,
      hint: hint,
      greenR: 11 + rng() * 6,
    });
  }

  function startRound(mode, course, campaign) {
    G.mode = mode;
    G.course = course || null;
    G.campaign = campaign || 0;
    G.rng = mulberry((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    G.card = [];
    G.log = [];
    G.hi = 0;
    if (mode === "endless") {
      G.holes = [randomHole()];
      G.course = { id: "endless", name: "Endless walk", wind: [1, 7], lore: "Random holes. End the walk to post the card." };
    } else if (mode === "18") G.holes = PINE.holes.concat(CORAL.holes);
    else G.holes = (course || PINE).holes.slice();
    if (mode === "18") G.course = { id: "haven-open", name: "Haven Open 18", wind: [1, 7], lore: "Pine Haven front nine, Coral Lattice back nine." };
    hideOverlay();
    $("app").classList.remove("hidden");
    $("boot").classList.add("hidden");
    paintEndBtn();
    setupHole();
    paintClubs();
    canvas.focus();
  }

  function paintEndBtn() {
    const b = $("btnEnd");
    if (!b) return;
    b.classList.toggle("hidden", G.mode !== "endless");
  }

  function askEndEndless() {
    if (G.mode !== "endless" || G.flying) return;
    if (!G.card.length) {
      showSheet(
        "<p class='kicker'>Endless</p><h2>No holes closed</h2>" +
        "<p class='lore'>Finish at least one hole, then End walk posts the card to this browser’s ledger.</p>" +
        "<button class='btn gold' id='keepWalk'>Keep walking</button>"
      );
      $("keepWalk").onclick = hideOverlay;
      return;
    }
    const t = total(G.card);
    const v = vsPar(G.card);
    showSheet(
      "<p class='kicker'>End the walk</p><h2>" + G.card.length + " holes · " + t + " strokes · " + vsLabel(v) + "</h2>" +
      "<p class='lore'>The hole you are on now is not counted. Posting writes this card to the local ledger.</p>" +
      scorecardHtml() +
      "<div class='modes'><button class='btn gold' id='postWalk'>Post card</button><button class='btn' id='keepWalk'>Keep walking</button></div>",
      false,
      true
    );
    bindScorecard();
    $("postWalk").onclick = function () { finishEndless(); };
    $("keepWalk").onclick = hideOverlay;
  }

  function finishEndless() {
    if (G.mode !== "endless") return;
    if (!G.card.length) return;
    G.holes = G.holes.slice(0, G.card.length);
    G.hi = G.card.length;
    roundOver();
  }

  function hideOverlay() {
    $("overlay").classList.add("hidden");
    $("overlay").classList.remove("studio");
  }
  function showSheet(html, studio, wide) {
    const ov = $("overlay");
    ov.classList.remove("hidden");
    ov.classList.toggle("studio", !!studio);
    ov.innerHTML = studio ? html : "<div class='sheet" + (wide ? " sheet-wide" : "") + "'>" + html + "</div>";
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
    paintEndBtn();
    $("boot").classList.add("hidden");
    $("app").classList.add("hidden");
    const name = (G.save.name || "").replace(/[<>]/g, "");
    showSheet(
      "<div class='title-screen'>" +
        "<div class='title-art'>" +
          "<img src='./assets/menu.jpg?v=10' alt='Lattice Golf — twilight pin and cup'>" +
          "<div class='title-art-fade'></div>" +
        "</div>" +
        "<div class='title-panel'>" +
          "<p class='kicker'>Δ9Φ963 · eternalhaven.ca</p>" +
          "<h1>LATTICE GOLF</h1>" +
          "<p class='title-tag'>Trees stop the cut. Water you carry or drop. Play the hole that was built.</p>" +
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
      "<ol class='lore'><li>Fairways bend on purpose. A forest or pond sits on the straight line to the pin. Fly through trees and the ball stops. Come up short of water and you drop.</li>" +
      "<li>Click to plant a marker. Pick a club whose range covers that line. Gold ring is this power’s carry.</li>" +
      "<li>Choose 25 / 50 / 75 / 100. Wind shifts the ball a little.</li>" +
      "<li>On the green, plant the marker on the cup. 100% rolls to the marker. The cup swallows the ball if the path goes through it.</li>" +
      "<li>Water and OOB cost a stroke and you drop.</li>" +
      "<li>Z undoes the last shot. Esc opens the menu. In Endless, End walk posts the card to the local ledger.</li></ol>" +
      "<button class='btn gold' id='hk'>Back to the tee</button>"
    );
    $("hk").onclick = hideOverlay;
  }

  function cardSheet() {
    const endBtn = G.mode === "endless"
      ? "<button class='btn gold' id='scEnd'>End walk</button>"
      : "";
    showSheet(
      "<p class='kicker'>Scorecard</p><h2>" + ((G.course && G.course.name) || "Endless") + "</h2>" +
      scorecardHtml() +
      "<div class='modes'><button class='btn gold' id='ck'>Back to the tee</button><button class='btn' id='scCopy'>Copy card</button>" + endBtn + "</div>",
      false,
      true
    );
    bindScorecard();
    $("ck").onclick = hideOverlay;
    if ($("scEnd")) $("scEnd").onclick = askEndEndless;
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
  $("btnEnd").onclick = askEndEndless;
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
