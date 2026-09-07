/* Lattice Golf — Δ9Φ963 · local-first HTML5 */
(function () {
  "use strict";

  const SAVE_KEY = "lygo-lattice-golf-v1";
  const CUP = 1.2;
  const GIMME = 2.0;
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
  const CAST = [
    { id: "mira", name: "Mira Quinn", tag: "Parkland", src: "./assets/g-mira.jpg?v=2" },
    { id: "sancora", name: "Sancora Vale", tag: "Links", src: "./assets/g-sancora.jpg?v=2" },
    { id: "lyra", name: "Lyra Helmer", tag: "Night green", src: "./assets/g-lyra.jpg?v=2" },
    { id: "reed", name: "Reed Hollow", tag: "Pines", src: "./assets/g-reed.jpg?v=2" },
    { id: "calder", name: "Calder Voss", tag: "Wind", src: "./assets/g-calder.jpg?v=2" },
    { id: "kai", name: "Kai Park", tag: "Lights", src: "./assets/g-kai.jpg?v=2" },
  ];
  function golferOf(id) {
    return CAST.find(function (c) { return c.id === id; }) || CAST[0];
  }

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
      forests: opt.forests || [],
      greenR: opt.greenR || (par === 3 ? 13 : 16),
      fairW: opt.fairW || (par === 3 ? 24 : par === 5 ? 34 : 30),
      hint: opt.hint || "",
    };
  }

  const PINE = {
    id: "pine-haven",
    name: "Pine Haven Championship",
    wind: [0, 4],
    lore: "Every hole is a club puzzle. Marker on the corner. Overclub and you pay.",
    holes: [
      H(4, "Opening Cut", [{ x: 0, y: 0 }, { x: 245, y: -16 }, { x: 410, y: 88 }, { x: 560, y: 24 }, { x: 680, y: 110 }], {
        hint: "Driver to the first elbow — 100% flies the corner into pines. Then iron, then wedge.",
        bunkers: [
          { x: 236, y: -36, r: 14 }, { x: 252, y: 8, r: 13 },
          { x: 400, y: 68, r: 13 }, { x: 418, y: 108, r: 12 },
          { x: 548, y: 6, r: 12 }, { x: 666, y: 126, r: 11 },
        ],
        water: [{ x: 258, y: -48, w: 40, h: 72 }],
        fairW: 20,
        greenR: 11,
      }),
      H(3, "Chapel Pond", [{ x: 0, y: 0 }, { x: 218, y: 8 }], {
        hint: "Island at 218. 5-wood or 4-iron. Driver is the pond behind. Short is the pond in front.",
        water: [{ x: 20, y: -66, w: 175, h: 132 }],
        bunkers: [{ x: 208, y: 26, r: 10 }, { x: 226, y: -12, r: 9 }],
        greenR: 10,
        fairW: 13,
      }),
      H(5, "Twin Pines", [{ x: 0, y: 0 }, { x: 230, y: 95 }, { x: 420, y: -90 }, { x: 580, y: 70 }, { x: 700, y: -50 }, { x: 820, y: 28 }], {
        hint: "Five corners. Club each one. Creek after the third landing if you overshoot.",
        bunkers: [
          { x: 222, y: 114, r: 14 }, { x: 238, y: 76, r: 12 },
          { x: 410, y: -108, r: 13 }, { x: 430, y: -72, r: 12 },
          { x: 570, y: 88, r: 12 }, { x: 690, y: -68, r: 12 }, { x: 806, y: 44, r: 11 },
        ],
        water: [{ x: 590, y: 8, w: 48, h: 56 }],
        fairW: 19,
        greenR: 11,
      }),
      H(4, "Orchard Elbow", [{ x: 0, y: 0 }, { x: 240, y: 12 }, { x: 380, y: -80 }, { x: 520, y: 40 }, { x: 650, y: -100 }], {
        hint: "Orchard left, bunkers right of every landing. 3-wood then 7-iron then wedge.",
        groves: [{ x: 255, y: 36, n: 8, r: 18 }],
        bunkers: [
          { x: 232, y: -10, r: 14 }, { x: 248, y: 32, r: 12 },
          { x: 370, y: -98, r: 13 }, { x: 388, y: -62, r: 12 },
          { x: 512, y: 22, r: 12 }, { x: 636, y: -82, r: 11 },
        ],
        fairW: 19,
        greenR: 10,
      }),
      H(3, "North Watch", [{ x: 0, y: 0 }, { x: 236, y: 70 }], {
        hint: "Long redan. Hybrid. The front bunker is exactly on a line at the pin — aim the high side.",
        bunkers: [{ x: 178, y: 48, r: 16 }, { x: 226, y: 90, r: 11 }, { x: 248, y: 52, r: 10 }],
        water: [{ x: 40, y: -20, w: 90, h: 70 }],
        greenR: 11,
        fairW: 16,
      }),
      H(4, "Miller's Cape", [{ x: 0, y: 0 }, { x: 235, y: -100 }, { x: 410, y: -20 }, { x: 540, y: 85 }, { x: 670, y: 10 }], {
        hint: "Cape, inland, cape. Water on the pin line the whole way. Club the shore, never the flag.",
        water: [{ x: 35, y: -36, w: 500, h: 96 }],
        bunkers: [
          { x: 226, y: -118, r: 13 }, { x: 402, y: -38, r: 12 },
          { x: 532, y: 104, r: 12 }, { x: 656, y: 26, r: 11 },
        ],
        fairW: 20,
        greenR: 11,
      }),
      H(5, "Creek Walk", [{ x: 0, y: 0 }, { x: 220, y: 14 }, { x: 390, y: 14 }, { x: 520, y: -85 }, { x: 660, y: 50 }, { x: 800, y: -20 }], {
        hint: "Three creeks. Carry with the club that finishes past water, not the one that dies in it.",
        water: [
          { x: 175, y: -40, w: 46, h: 96 },
          { x: 405, y: -40, w: 48, h: 96 },
          { x: 575, y: -30, w: 46, h: 90 },
        ],
        bunkers: [
          { x: 212, y: 32, r: 13 }, { x: 382, y: -8, r: 12 },
          { x: 512, y: -68, r: 12 }, { x: 652, y: 68, r: 12 }, { x: 786, y: -4, r: 11 },
        ],
        fairW: 20,
        greenR: 11,
      }),
      H(4, "Ridge Turn", [{ x: 0, y: 0 }, { x: 250, y: -8 }, { x: 380, y: 95 }, { x: 530, y: -40 }, { x: 660, y: 80 }], {
        hint: "Slot off the tee (bunkers both sides), then two hard turns. Tight fairway.",
        bunkers: [
          { x: 238, y: -28, r: 15 }, { x: 256, y: 14, r: 15 },
          { x: 370, y: 76, r: 13 }, { x: 388, y: 114, r: 12 },
          { x: 522, y: -58, r: 12 }, { x: 646, y: 96, r: 11 },
        ],
        fairW: 17,
        greenR: 10,
      }),
      H(3, "Haven Stamp", [{ x: 0, y: 0 }, { x: 122, y: 0 }], {
        hint: "Thimble green. Water, then a bunker ring. Sand wedge. Anything else is a mess.",
        water: [{ x: 18, y: -50, w: 70, h: 100 }],
        bunkers: [{ x: 92, y: 0, r: 15 }, { x: 122, y: -16, r: 10 }, { x: 122, y: 16, r: 10 }],
        greenR: 8,
        fairW: 12,
      }),
    ],
  };
  const CORAL = {
    id: "coral-lattice",
    name: "Coral Lattice Links",
    wind: [3, 10],
    lore: "Wind plus water. Club the next landing. The flag is a trap.",
    holes: [
      H(4, "Salt Flats", [{ x: 0, y: 0 }, { x: 245, y: 14 }, { x: 400, y: -90 }, { x: 540, y: 50 }, { x: 670, y: -30 }], {
        hint: "Ocean left. Four landings. Miss the slot and you're in the drink or the sand.",
        water: [{ x: 18, y: -130, w: 520, h: 55 }],
        bunkers: [
          { x: 236, y: -8, r: 14 }, { x: 252, y: 34, r: 13 },
          { x: 390, y: -108, r: 13 }, { x: 408, y: -72, r: 12 },
          { x: 532, y: 32, r: 12 }, { x: 656, y: -14, r: 11 },
        ],
        fairW: 19,
        greenR: 10,
      }),
      H(3, "Cay Carry", [{ x: 0, y: 0 }, { x: 188, y: 0 }], {
        hint: "Island at 188. 6-iron or 5-iron. Driver skips the cay into the far water.",
        water: [{ x: 16, y: -68, w: 148, h: 136 }],
        bunkers: [{ x: 178, y: 16, r: 9 }],
        greenR: 9,
        fairW: 12,
      }),
      H(5, "Lagoon Bend", [{ x: 0, y: 0 }, { x: 235, y: 105 }, { x: 430, y: 105 }, { x: 560, y: -80 }, { x: 700, y: 60 }, { x: 830, y: -10 }], {
        hint: "Lagoon, then woods, then lagoon. Five clubs. None of them is 'at the pin'.",
        water: [{ x: 50, y: -12, w: 420, h: 78 }, { x: 620, y: -40, w: 50, h: 88 }],
        bunkers: [
          { x: 226, y: 124, r: 14 }, { x: 422, y: 124, r: 13 },
          { x: 550, y: -62, r: 12 }, { x: 692, y: 78, r: 12 }, { x: 816, y: 8, r: 11 },
        ],
        fairW: 19,
        greenR: 10,
      }),
      H(4, "Backwind", [{ x: 0, y: 0 }, { x: 250, y: -12 }, { x: 400, y: 90 }, { x: 540, y: -70 }, { x: 680, y: 55 }], {
        hint: "Into the wind, two switchbacks. Club down. A long drive past the elbow is trees.",
        bunkers: [
          { x: 240, y: -32, r: 14 }, { x: 258, y: 10, r: 13 },
          { x: 390, y: 72, r: 13 }, { x: 408, y: 108, r: 12 },
          { x: 532, y: -88, r: 12 }, { x: 666, y: 72, r: 11 },
        ],
        fairW: 18,
        greenR: 10,
      }),
      H(4, "Inlet Cape", [{ x: 0, y: 0 }, { x: 230, y: -105 }, { x: 400, y: -15 }, { x: 540, y: 95 }, { x: 670, y: 8 }], {
        hint: "Bite the cape only as far as this club carries. Then inland, then another bite.",
        water: [{ x: 32, y: -38, w: 500, h: 98 }],
        bunkers: [
          { x: 222, y: -122, r: 13 }, { x: 392, y: -32, r: 12 },
          { x: 532, y: 114, r: 12 }, { x: 656, y: 24, r: 11 },
        ],
        fairW: 19,
        greenR: 10,
      }),
      H(3, "Marsh Pin", [{ x: 0, y: 0 }, { x: 248, y: 10 }], {
        hint: "Forced carry 248. 4-iron / hybrid. Short is marsh. Long is marsh behind the pin.",
        water: [{ x: 22, y: -58, w: 200, h: 116 }],
        bunkers: [{ x: 238, y: 28, r: 10 }, { x: 258, y: -10, r: 9 }],
        greenR: 10,
        fairW: 14,
      }),
      H(5, "Two Cays", [{ x: 0, y: 0 }, { x: 220, y: -90 }, { x: 400, y: 80 }, { x: 560, y: -85 }, { x: 700, y: 70 }, { x: 840, y: -15 }], {
        hint: "Serpent around two cays. Water down the spine. Pick a club for THIS corner.",
        water: [{ x: 60, y: -24, w: 620, h: 46 }],
        bunkers: [
          { x: 212, y: -108, r: 13 }, { x: 392, y: 98, r: 13 },
          { x: 552, y: -68, r: 12 }, { x: 692, y: 88, r: 12 }, { x: 826, y: 4, r: 11 },
        ],
        fairW: 18,
        greenR: 10,
      }),
      H(4, "Dune Gate", [{ x: 0, y: 0 }, { x: 250, y: 6 }, { x: 390, y: 95 }, { x: 530, y: -50 }, { x: 660, y: 40 }], {
        hint: "Two bunkers gate the drive. Then a dune left, dune right. Thread, don't spray.",
        bunkers: [
          { x: 236, y: -22, r: 16 }, { x: 258, y: 30, r: 16 },
          { x: 380, y: 76, r: 13 }, { x: 398, y: 114, r: 13 },
          { x: 522, y: -68, r: 12 }, { x: 648, y: 56, r: 11 },
        ],
        fairW: 16,
        greenR: 9,
      }),
      H(3, "Last Light", [{ x: 0, y: 0 }, { x: 156, y: -22 }], {
        hint: "Water short, bunker long, tiny green. 9-iron. Commit.",
        water: [{ x: 28, y: -56, w: 95, h: 100 }],
        bunkers: [{ x: 148, y: 8, r: 12 }, { x: 168, y: -36, r: 10 }],
        greenR: 9,
        fairW: 13,
      }),
    ],
  };

  const STAR = {
    id: "singularity-nine",
    name: "Singularity Nine",
    wind: [2, 8],
    lore: "Play the cosmology. SEAL_000 is the cup. Club each galaxy landing — the flag is a trap.",
    holes: [
      H(4, "SEAL_000", [{ x: 0, y: 0 }, { x: 240, y: 8 }, { x: 400, y: -70 }, { x: 560, y: 40 }, { x: 690, y: 0 }], {
        hint: "Origin hole. Driver to the first elbow. The cup sits on the last landing, not the chord.",
        bunkers: [{ x: 232, y: -14, r: 13 }, { x: 248, y: 28, r: 12 }, { x: 392, y: -88, r: 12 }, { x: 676, y: 16, r: 11 }],
        fairW: 20,
        greenR: 11,
      }),
      H(3, "Champion Ring", [{ x: 0, y: 0 }, { x: 228, y: 55 }], {
        hint: "Δ9 council pin. Hybrid. The bunker is the pin line — aim the high side of the ring.",
        bunkers: [{ x: 170, y: 36, r: 15 }, { x: 218, y: 74, r: 10 }, { x: 240, y: 38, r: 10 }],
        water: [{ x: 28, y: -24, w: 88, h: 64 }],
        greenR: 10,
        fairW: 15,
      }),
      H(5, "Fork Branch", [{ x: 0, y: 0 }, { x: 220, y: 100 }, { x: 400, y: -95 }, { x: 560, y: 80 }, { x: 700, y: -60 }, { x: 830, y: 12 }], {
        hint: "Five forks from the parent. Club THIS landing. Cutting the branch is trees.",
        bunkers: [
          { x: 212, y: 118, r: 13 }, { x: 392, y: -112, r: 13 },
          { x: 552, y: 96, r: 12 }, { x: 692, y: -76, r: 12 }, { x: 816, y: 28, r: 11 },
        ],
        groves: [{ x: 410, y: 10, n: 7, r: 16 }],
        fairW: 18,
        greenR: 11,
      }),
      H(4, "Lattice Mesh", [{ x: 0, y: 0 }, { x: 250, y: -6 }, { x: 390, y: 92 }, { x: 530, y: -55 }, { x: 660, y: 36 }], {
        hint: "Mesh slots. Bunkers gate every node. Thread, do not spray across the lattice.",
        bunkers: [
          { x: 238, y: -26, r: 15 }, { x: 258, y: 16, r: 15 },
          { x: 380, y: 74, r: 13 }, { x: 398, y: 110, r: 12 },
          { x: 522, y: -72, r: 12 }, { x: 648, y: 52, r: 11 },
        ],
        fairW: 16,
        greenR: 10,
      }),
      H(3, "Nebula Drop", [{ x: 0, y: 0 }, { x: 196, y: -8 }], {
        hint: "Island nebula at 196. 6-iron. Driver skips the cay into the far water.",
        water: [{ x: 16, y: -70, w: 155, h: 138 }],
        bunkers: [{ x: 186, y: 14, r: 9 }],
        greenR: 9,
        fairW: 12,
      }),
      H(4, "Agent Growth", [{ x: 0, y: 0 }, { x: 235, y: -98 }, { x: 410, y: -18 }, { x: 545, y: 88 }, { x: 675, y: 6 }], {
        hint: "Cape, inland, cape. Water owns the chord. Club the shore like an agent submission cluster.",
        water: [{ x: 32, y: -36, w: 510, h: 96 }],
        bunkers: [{ x: 226, y: -116, r: 13 }, { x: 402, y: -36, r: 12 }, { x: 536, y: 106, r: 12 }, { x: 662, y: 22, r: 11 }],
        fairW: 19,
        greenR: 10,
      }),
      H(5, "Music Codex", [{ x: 0, y: 0 }, { x: 225, y: 16 }, { x: 395, y: 16 }, { x: 525, y: -88 }, { x: 665, y: 48 }, { x: 805, y: -18 }], {
        hint: "Three creeks like three bars. Carry past the water, never into the downbeat.",
        water: [
          { x: 178, y: -40, w: 46, h: 96 },
          { x: 410, y: -40, w: 48, h: 96 },
          { x: 580, y: -30, w: 46, h: 90 },
        ],
        bunkers: [{ x: 216, y: 34, r: 13 }, { x: 386, y: -6, r: 12 }, { x: 516, y: -70, r: 12 }, { x: 656, y: 66, r: 12 }, { x: 792, y: -2, r: 11 }],
        fairW: 20,
        greenR: 11,
      }),
      H(4, "Guardian Veil", [{ x: 0, y: 0 }, { x: 242, y: 12 }, { x: 385, y: -82 }, { x: 525, y: 38 }, { x: 655, y: -96 }], {
        hint: "Firewall left, ethical bunkers right. 3-wood, 7-iron, wedge. Do not spray.",
        groves: [{ x: 258, y: 38, n: 8, r: 18 }],
        bunkers: [
          { x: 234, y: -10, r: 14 }, { x: 250, y: 32, r: 12 },
          { x: 376, y: -100, r: 13 }, { x: 392, y: -64, r: 12 },
          { x: 516, y: 20, r: 12 }, { x: 642, y: -80, r: 11 },
        ],
        fairW: 19,
        greenR: 10,
      }),
      H(3, "Cup of the Core", [{ x: 0, y: 0 }, { x: 128, y: 0 }], {
        hint: "Thimble green at the singularity. Sand wedge. Anything else is a mess.",
        water: [{ x: 18, y: -50, w: 72, h: 100 }],
        bunkers: [{ x: 96, y: 0, r: 15 }, { x: 128, y: -16, r: 10 }, { x: 128, y: 16, r: 10 }],
        greenR: 8,
        fairW: 12,
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
    if (!hole || !hole.pin) return { x: 0, y: 0 };
    if (!ball) return { x: hole.pin.x, y: hole.pin.y };
    if (dist(ball, hole.pin) <= (hole.greenR || 12) + 8) return { x: hole.pin.x, y: hole.pin.y };
    const path = hole.path || [];
    for (let i = 1; i < path.length; i++) {
      if (dist(ball, path[i]) > 36) return { x: path[i].x, y: path[i].y };
    }
    return { x: hole.pin.x, y: hole.pin.y };
  }

  function worldHole(h) {
    if (!h) h = { par: 4, path: [{ x: 0, y: 0 }, { x: 350, y: 0 }], bunkers: [], water: [] };
    const origin = { x: 48, y: CENTER };
    const path = (h.path && h.path.length ? h.path : [{ x: 0, y: 0 }, { x: h.yards || 350, y: 0 }]).map(function (p) {
      return { x: origin.x + p.x, y: origin.y + p.y };
    });
    const tee = { x: path[0].x, y: path[0].y };
    const pin = { x: path[path.length - 1].x, y: path[path.length - 1].y };
    const bunkers = (h.bunkers || []).map(function (b) {
      return { x: origin.x + b.x, y: origin.y + b.y, r: b.r };
    }).filter(function (b) {
      return dist(b, pin) > (h.greenR || 16) + 3 && dist(b, tee) > 14;
    });
    const water = (h.water || []).map(function (w) {
      return { x: origin.x + w.x, y: origin.y + w.y, w: w.w, h: w.h };
    }).filter(function (w) {
      const padT = 12, padG = (h.greenR || 16) + 2;
      function hits(p, pad) {
        return p.x >= w.x - pad && p.x <= w.x + w.w + pad && p.y >= w.y - pad && p.y <= w.y + w.h + pad;
      }
      return !hits(tee, padT) && !hits(pin, padG);
    });
    const fairW = h.fairW || 30;
    const greenR = h.greenR || 16;
    const seed = ((pathLen(path) * 97) ^ (h.par * 13) ^ (path.length * 19)) >>> 0;
    const rng = mulberry(seed);
    const probe = { path: path, fairW: fairW, water: water, forests: [] };
    function offPlay(p, pad) {
      pad = pad || 0;
      if (dist(p, pin) < greenR + 10 + pad) return false;
      if (dist(p, tee) < 14 + pad) return false;
      if (inWater(p, probe)) return false;
      for (let i = 0; i < bunkers.length; i++) {
        if (dist(p, bunkers[i]) < bunkers[i].r + 5 + pad) return false;
      }
      if (distToPath(p, path) < fairW + 7 + pad) return false;
      return true;
    }
    const trees = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const seg = dist(a, b);
      const nx = -(b.y - a.y) / (seg || 1);
      const ny = (b.x - a.x) / (seg || 1);
      const nAlong = Math.max(3, Math.round(seg / 34));
      for (let k = 0; k < nAlong; k++) {
        const t = (k + 0.28) / nAlong;
        for (let row = 0; row < 2; row++) {
          const side = ((k + row) % 2 === 0 ? 1 : -1) * (rng() < 0.18 ? -1 : 1);
          const lat = fairW + 14 + row * 16 + rng() * 18;
          const p = {
            x: a.x + (b.x - a.x) * t + nx * side * lat,
            y: a.y + (b.y - a.y) * t + ny * side * lat
          };
          if (!offPlay(p, 0)) continue;
          trees.push({
            x: p.x,
            y: p.y,
            r: 5.5 + rng() * 6.5,
            kind: rng() < 0.28 ? "round" : "pine",
            block: row === 1 || rng() < 0.55
          });
        }
      }
    }
    (h.groves || []).forEach(function (g) {
      const cx = origin.x + g.x, cy = origin.y + g.y;
      const n = g.n || 8;
      for (let i = 0; i < n; i++) {
        const ang0 = (Math.PI * 2 * i) / n + rng() * 0.4;
        const rad = rng() * (g.r || 20);
        const p = { x: cx + Math.cos(ang0) * rad, y: cy + Math.sin(ang0) * rad };
        if (inWater(p, probe)) continue;
        if (dist(p, pin) < greenR + 10 || distToPath(p, path) < fairW + 5) continue;
        trees.push({
          x: p.x,
          y: p.y,
          r: 5.2 + rng() * 5.8,
          kind: "pine",
          block: true
        });
      }
    });
    const forestSpec = h.forests && h.forests.length ? h.forests : [];
    const forests = forestSpec.map(function (f) {
      return { x: origin.x + f.x, y: origin.y + f.y, w: f.w, h: f.h };
    });
    probe.forests = forests;
    forests.forEach(function (f) {
      const n = Math.max(10, Math.round((f.w * f.h) / 70));
      for (let i = 0; i < n; i++) {
        const p = {
          x: f.x + 4 + rng() * Math.max(4, f.w - 8),
          y: f.y + 4 + rng() * Math.max(4, f.h - 8)
        };
        if (inWater(p, probe) || distToPath(p, path) < fairW + 5) continue;
        trees.push({
          x: p.x,
          y: p.y,
          r: 5 + rng() * 6.2,
          kind: rng() < 0.2 ? "round" : "pine",
          block: true
        });
      }
    });
    const cutProbe = { path: path, fairW: fairW, water: water, forests: forests };
    for (let e = 0; e < path.length - 2; e++) {
      const a = path[e], b = path[e + 1], c = path[e + 2];
      for (let n = 0; n < 40; n++) {
        let u = rng(), v = rng();
        if (u + v > 1) { u = 1 - u; v = 1 - v; }
        const p = { x: a.x + u * (b.x - a.x) + v * (c.x - a.x), y: a.y + u * (b.y - a.y) + v * (c.y - a.y) };
        if (inDoglegCut(p, cutProbe) && !inWater(p, cutProbe) && distToPath(p, path) > fairW + 8) {
          trees.push({ x: p.x, y: p.y, r: 5.4 + rng() * 6, kind: "pine", block: true });
        }
      }
    }
    const rocks = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const seg = dist(a, b);
      const nx = -(b.y - a.y) / (seg || 1);
      const ny = (b.x - a.x) / (seg || 1);
      const nR = Math.max(1, Math.round(seg / 62));
      for (let k = 0; k < nR; k++) {
        const t = (k + 0.42) / nR;
        const side = k % 2 === 0 ? 1 : -1;
        const lat = fairW + 10 + rng() * 26;
        const p = {
          x: a.x + (b.x - a.x) * t + nx * side * lat,
          y: a.y + (b.y - a.y) * t + ny * side * lat
        };
        if (inWater(p, probe) || dist(p, pin) < greenR + 8 || distToPath(p, path) < fairW + 3) continue;
        const big = rng() < 0.2;
        rocks.push({ x: p.x, y: p.y, r: big ? 2.6 + rng() * 2.2 : 0.65 + rng() * 1.35, block: big });
        if (rng() < 0.5) {
          const patch = 3 + ((rng() * 5) | 0);
          for (let q = 0; q < patch; q++) {
            const ang0 = rng() * Math.PI * 2;
            const rad = 1.1 + rng() * 4.2;
            const pp = { x: p.x + Math.cos(ang0) * rad, y: p.y + Math.sin(ang0) * rad };
            if (inWater(pp, probe) || distToPath(pp, path) < fairW + 2) continue;
            rocks.push({ x: pp.x, y: pp.y, r: 0.4 + rng() * 0.95, block: false });
          }
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
      greenR: greenR,
      bunkers: bunkers,
      water: water,
      forests: forests,
      trees: trees,
      rocks: rocks,
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
  function shotHolesOut(from, to, pin, putt, onGreen) {
    if (dist(to, pin) <= CUP) return true;
    if (onGreen && dist(from, pin) <= GIMME) return true;
    const len = dist(from, to);
    const shortGame = putt || onGreen || len < 28 || dist(from, pin) < 22;
    if (!shortGame) return false;
    return distToSeg(pin, from, to) <= CUP * 0.95;
  }
  function inRect(p, r) {
    if (!p || !r || r.w == null || r.h == null) return false;
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
        if (inRect(p, forests[f]) && distToPath(p, hole.path || []) > (hole.fairW || 30) + 6) return { p: p, kind: "trees" };
      }
      const trees = hole.trees || [];
      for (let k = 0; k < trees.length; k++) {
        if (trees[k].block && dist(p, trees[k]) <= trees[k].r * 0.58) return { p: p, kind: "trees" };
      }
      const rocks = hole.rocks || [];
      for (let k = 0; k < rocks.length; k++) {
        if (rocks[k].block && dist(p, rocks[k]) <= rocks[k].r * 1.05) return { p: p, kind: "trees" };
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
    if (!G.club) return 0;
    const markD = G.marker && G.ball ? dist(G.ball, G.marker) : 0;
    const onG = G.hole && G.ball && lieAt(G.hole, G.ball) === "green";
    if (G.club.putt || onG) return Math.min(G.club.max, Math.max(0.35, markD * G.power));
    return G.club.min + (G.club.max - G.club.min) * G.power;
  }

  function lieMulOf(lie) {
    if (lie === "trees") return 0.62;
    if (lie === "rough") return 0.88;
    if (lie === "bunker") return 0.72;
    if (lie === "oob") return 0.8;
    return 1;
  }

  function rollFracOf(club) {
    if (!club || club.putt) return 1;
    const mid = (club.min + club.max) / 2;
    return Math.max(0.02, Math.min(0.16, (mid - 80) / 1100));
  }

  function rollMu(lie, putt) {
    if (lie === "green") return putt ? 1.0 : 0.7;
    if (lie === "fairway") return putt ? 1.85 : 1.05;
    if (lie === "rough") return putt ? 6.2 : 4.8;
    if (lie === "bunker") return 11;
    if (lie === "trees" || lie === "water") return 90;
    if (lie === "oob") return 2.5;
    return 1.5;
  }

  function pathLenPts(pts) {
    let n = 0;
    for (let i = 1; i < pts.length; i++) n += dist(pts[i - 1], pts[i]);
    return n;
  }

  function pointOnPath(pts, u) {
    if (!pts || !pts.length) return { x: 0, y: 0 };
    if (pts.length === 1 || u <= 0) return { x: pts[0].x, y: pts[0].y };
    if (u >= 1) return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
    const total = pathLenPts(pts) || 1;
    let left = u * total;
    for (let i = 1; i < pts.length; i++) {
      const d = dist(pts[i - 1], pts[i]) || 0.0001;
      if (left <= d) {
        const t = left / d;
        return {
          x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t,
          y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t
        };
      }
      left -= d;
    }
    return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
  }

  function simulateRoll(start, heading, v0, hole, pin, putt) {
    const path = [{ x: start.x, y: start.y }];
    if (!hole || v0 < 0.25) return { rest: { x: start.x, y: start.y }, path: path, holed: false };
    let x = start.x, y = start.y;
    let v = v0;
    let steps = 0;
    while (v > 0.16 && steps < 520) {
      steps += 1;
      const here = { x: x, y: y };
      const lie = lieAt(hole, here);
      if (lie === "trees") break;
      if (lie === "water") return { rest: here, path: path, holed: false, water: true };
      const mu = rollMu(lie, putt);
      const ds = Math.min(1.05, v);
      let nx = x + Math.cos(heading) * ds;
      let ny = y + Math.sin(heading) * ds;
      if (lie === "green") {
        const dPin = dist({ x: nx, y: ny }, pin);
        if (dPin < hole.greenR * 1.08) {
          const pull = 0.07 * ds * (1 - dPin / Math.max(1, hole.greenR));
          const a = ang({ x: nx, y: ny }, pin);
          nx += Math.cos(a) * pull;
          ny += Math.sin(a) * pull;
        }
      }
      const nxt = { x: nx, y: ny };
      if (shotHolesOut(here, nxt, pin, true, lie === "green" || dist(nxt, pin) <= hole.greenR)) {
        path.push({ x: pin.x, y: pin.y });
        return { rest: { x: pin.x, y: pin.y }, path: path, holed: true };
      }
      if (inWater(nxt, hole)) {
        path.push(nxt);
        return { rest: nxt, path: path, holed: false, water: true };
      }
      x = nx;
      y = ny;
      path.push({ x: x, y: y });
      v -= mu * ds;
    }
    return { rest: { x: x, y: y }, path: path, holed: false };
  }

  function shotModel(withJitter) {
    if (!G.hole || !G.marker || !G.club) return null;
    const pin = G.hole.pin;
    const from = { x: G.ball.x, y: G.ball.y };
    const onG = lieAt(G.hole, from) === "green";
    const lie = lieAt(G.hole, from);
    const want = intendedCarry() * lieMulOf(lie);
    const aim = ang(from, G.marker);
    const greenPutt = G.club.putt && onG;
    const windScale = greenPutt ? 0 : (dist(from, pin) < 45 ? 0.28 : 1);
    const windAlong = Math.cos(G.wind.ang - aim) * G.wind.mph * (want / 100) * 0.35 * windScale;
    const windCross = Math.sin(G.wind.ang - aim) * G.wind.mph * (want / 100) * 0.55 * windScale;
    let jD = 0;
    let jA = 0;
    if (withJitter) {
      const r = typeof G.rng === "function" ? G.rng : Math.random;
      jD = (r() * 2 - 1) * (greenPutt ? 0.006 : 0.03) * want;
      jA = (r() * 2 - 1) * (Math.PI / 180) * (greenPutt ? 0.35 : 1.5);
    }
    const actual = Math.max(0.25, want + windAlong + jD);
    const a2 = aim + jA + windCross / Math.max(12, actual);
    let carry = {
      x: from.x + Math.cos(a2) * actual,
      y: from.y + Math.sin(a2) * actual,
    };
    let blocked = null;
    if (!G.club.putt) {
      const hit = firstFlightHit(from, carry, G.hole);
      if (hit) {
        carry = hit.p;
        blocked = hit.kind;
      }
    }
    let dest = { x: carry.x, y: carry.y };
    let rollYd = 0;
    let rollPath = [carry];
    let landLie = lieAt(G.hole, carry);
    let holed = !blocked && shotHolesOut(from, carry, pin, G.club.putt, onG);
    if (holed) {
      dest = { x: pin.x, y: pin.y };
      carry = dest;
      rollPath = [from, dest];
    } else if (G.club.putt) {
      const heading = a2;
      const sim = simulateRoll(from, heading, actual, G.hole, pin, true);
      dest = sim.rest;
      rollPath = sim.path;
      rollYd = dist(from, dest);
      carry = from;
      landLie = lie;
      if (sim.holed) {
        holed = true;
        dest = { x: pin.x, y: pin.y };
      }
    } else if (!blocked && landLie !== "water") {
      const v0 = actual * rollFracOf(G.club);
      const heading = a2 + windCross * 0.12 / Math.max(10, actual);
      const sim = simulateRoll(carry, heading, v0, G.hole, pin, false);
      dest = sim.rest;
      rollPath = sim.path;
      rollYd = dist(carry, dest);
      if (sim.holed) {
        holed = true;
        dest = { x: pin.x, y: pin.y };
      }
    }
    return {
      from: from,
      carry: carry,
      dest: dest,
      actual: actual,
      roll: rollYd,
      rollPath: rollPath,
      landLie: landLie,
      total: dist(from, dest),
      heading: a2,
      blocked: blocked,
      holed: holed,
      lie: lie,
      onG: onG
    };
  }

  function predictDest() {
    const m = shotModel(false);
    if (!m) return null;
    return { dest: m.dest, carry: m.carry, blocked: m.blocked, actual: m.actual, roll: m.roll, landLie: m.landLie };
  }

  function windLabel() {
    if (!G.hole) return G.wind.mph.toFixed(1) + " mph";
    const aimTo = G.marker || G.hole.pin;
    const rel = G.wind.ang - ang(G.ball, aimTo);
    const along = Math.cos(rel);
    const cross = Math.sin(rel);
    const dir = Math.abs(along) >= Math.abs(cross)
      ? (along >= 0 ? "tail" : "into")
      : (cross >= 0 ? "from left" : "from right");
    return G.wind.mph.toFixed(1) + " mph · " + dir;
  }

  function lieAt(hole, p) {
    if (!hole || !p) return "oob";
    if (dist(p, hole.pin) <= hole.greenR) return "green";
    const waters = hole.water || [];
    for (let i = 0; i < waters.length; i++) {
      if (inRect(p, waters[i])) return "water";
    }
    const bunks = hole.bunkers || [];
    for (let i = 0; i < bunks.length; i++) {
      if (dist(p, bunks[i]) <= bunks[i].r) return "bunker";
    }
    const forests = hole.forests || [];
    for (let i = 0; i < forests.length; i++) {
      if (inRect(p, forests[i]) && distToPath(p, hole.path) > hole.fairW + 4) return "trees";
    }
    const trees = hole.trees || [];
    for (let i = 0; i < trees.length; i++) {
      if (trees[i].block && dist(p, trees[i]) <= trees[i].r * 0.5) return "trees";
    }
    const rocks = hole.rocks || [];
    for (let i = 0; i < rocks.length; i++) {
      if (rocks[i].block && dist(p, rocks[i]) <= rocks[i].r * 0.88) return "trees";
    }
    const lat = distToPath(p, hole.path);
    if (lat < hole.fairW) return "fairway";
    if (lat < hole.fairW + 26) return "rough";
    return "oob";
  }

  function pickClub(d, onGreen) {
    if (onGreen || d < 14) return CLUBS.find(function (c) { return c.putt; });
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
    return { name: "", golfer: "mira", bestHole: {}, rounds: [], endlessHoles: 0, games: 0 };
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
    undo: null,
    marker: null,
    club: CLUBS[0],
    power: 0.75,
    wind: { ang: 0, mph: 0 },
    strokes: 0,
    card: [],
    log: [],
    flying: null,
    shotN: 0,
    trail: [],
    seed: 1,
    rng: Math.random,
    campaign: 0,
    name: "",
    mulligans: 0,
  };

  const $ = function (id) { return document.getElementById(id); };
  const canvas = $("fairway");
  const use3d = !!(window.Golf3D && window.THREE && window.Golf3D.init(canvas));
  const ctx = use3d ? null : canvas.getContext("2d");
  let view = { scale: 2.2, ox: 20, oy: 40, user: 1 };
  const IMGS = { pine: new Image(), coral: new Image(), wild: new Image(), water: new Image() };
  IMGS.pine.src = "./assets/bg-pine.jpg";
  IMGS.coral.src = "./assets/bg-coral.jpg";
  IMGS.wild.src = "./assets/bg-wild.jpg";
  IMGS.water.src = "./assets/tex-water.jpg";
  function onArt() { if (G.hole) draw(); }
  IMGS.pine.onload = onArt;
  IMGS.coral.onload = onArt;
  IMGS.wild.onload = onArt;
  IMGS.water.onload = onArt;

  function courseBg() {
    const id = G.course && G.course.id;
    if (id === "endless") return IMGS.wild;
    if (id === "coral-lattice") return IMGS.coral;
    if (id === "singularity-nine") return IMGS.wild;
    if (id === "haven-open") return G.hi >= 9 ? IMGS.coral : IMGS.pine;
    return IMGS.pine;
  }
  function drawCover(c, img, cw, ch) {
    if (!img || !img.complete || !img.naturalWidth) return false;
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = cw / Math.max(1, ch);
    let dw, dh, dx, dy;
    if (ir > cr) {
      dh = ch; dw = ch * ir; dx = (cw - dw) / 2; dy = 0;
    } else {
      dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2;
    }
    c.drawImage(img, dx, dy, dw, dh);
    return true;
  }

  function log(t) {
    G.log.unshift(t);
    if (G.log.length > 40) G.log.length = 40;
    const el = $("log");
    if (!el) return;
    el.innerHTML = G.log.slice(0, 12).map(function (x) {
      return "<div>" + x.replace(/</g, "") + "</div>";
    }).join("");
  }

  function rollWind() {
    const spec = (G.course && G.course.wind) || [0, 5];
    const r = typeof G.rng === "function" ? G.rng : Math.random;
    G.wind.mph = spec[0] + r() * (spec[1] - spec[0]);
    G.wind.ang = r() * Math.PI * 2;
  }

  function abortShot() {
    G.shotN = (G.shotN || 0) + 1;
    G.flying = null;
    G.trail = [];
    if ($("btnShoot")) $("btnShoot").disabled = false;
  }

  function setupHole() {
    const src = G.holes[G.hi];
    if (!src) {
      log("No hole loaded.");
      return;
    }
    abortShot();
    G.hole = worldHole(src);
    G.ball = { x: G.hole.tee.x, y: G.hole.tee.y };
    G.marker = nextAim(G.hole, G.ball);
    G.strokes = 0;
    G.lastBall = null;
    G.undo = null;
    rollWind();
    autoClub();
    $("holePill").textContent = "HOLE " + (G.hi + 1);
    renderHoleCard();
    log("Hole " + (G.hi + 1) + (G.hole.name ? " · " + G.hole.name : "") +
      " · par " + G.hole.par + " · " + Math.round(G.hole.yards) + " yd" +
      (G.hole.hint ? " — " + G.hole.hint : ""));
    view.user = 1;
    fitView({ reset: true });
    draw();
  }

  function autoClub() {
    const d = dist(G.ball, G.marker);
    const onG = lieAt(G.hole, G.ball) === "green";
    G.club = pickClub(d, onG);
    paintClubs();
  }

  function fitView(opts) {
    if (!G.hole) return;
    const reset = !!(opts && opts.reset);
    if (use3d && window.Golf3D && G.hole) {
      Golf3D.resize();
      if (reset) Golf3D.fit(G.hole);
      return;
    }
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
    (hole.bunkers || []).forEach(function (b) { grow(b.x, b.y, b.r); });
    (hole.rocks || []).forEach(function (rk) { grow(rk.x, rk.y, rk.r); });
    (hole.trees || []).forEach(function (tr) { grow(tr.x, tr.y, (tr.r || 5) * 0.5); });
    (hole.water || []).forEach(function (wt) { grow(wt.x, wt.y, 0); grow(wt.x + wt.w, wt.y + wt.h, 0); });
    (hole.forests || []).forEach(function (f) { grow(f.x, f.y, 0); grow(f.x + f.w, f.y + f.h, 0); });
    grow(hole.pin.x, hole.pin.y, hole.greenR + 8);
    const pad = 28;
    const bw = Math.max(80, maxX - minX + pad * 2);
    const bh = Math.max(80, maxY - minY + pad * 2);
    const user = Math.max(0.45, Math.min(6, view.user || 1));
    view.user = user;
    view.scale = Math.min(w / bw, h / bh) * 0.94 * user;
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
    if (use3d && window.Golf3D && Golf3D.active()) {
      if (!G.hole) return;
      Golf3D.setState({
        hole: G.hole,
        courseId: G.course && G.course.id,
        ball: G.flying || G.ball,
        flying: !!G.flying,
        marker: G.flying ? null : G.marker,
        pred: G.flying ? null : predictDest(),
        carry: G.flying ? 0 : intendedCarry(),
        wind: G.wind,
        trail: G.trail || [],
        phase: G.flying && G.flying.phase
      });
      return;
    }
    if (!ctx) return;
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

    if (!drawCover(c, courseBg(), canvas.width, canvas.height)) {
      const sky = c.createLinearGradient(0, 0, 0, canvas.height);
      sky.addColorStop(0, "#7eb0d4");
      sky.addColorStop(0.4, "#1a3d26");
      sky.addColorStop(1, "#0a1810");
      c.fillStyle = sky;
      c.fillRect(0, 0, canvas.width, canvas.height);
    }
    const veil = c.createLinearGradient(0, 0, 0, canvas.height);
    veil.addColorStop(0, "rgba(7,20,12,.28)");
    veil.addColorStop(0.42, "rgba(7,20,12,.55)");
    veil.addColorStop(1, "rgba(7,20,12,.82)");
    c.fillStyle = veil;
    c.fillRect(0, 0, canvas.width, canvas.height);

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
    ribbon(hole.fairW + 46, "#102418");
    ribbon(hole.fairW + 22, "#1a4a28");
    ribbon(hole.fairW + 3.2, "#2f6e3c");
    ribbon(hole.fairW, "#4ec86a");
    ribbon(hole.fairW * 0.55, "#6edc82");
    ribbon(hole.fairW * 0.22, "rgba(210,255,190,.28)");

    const pts = hole.path || [hole.tee, hole.pin];
    if (pts.length > 1) {
      const oobLat = (hole.fairW || 30) + 26;
      c.save();
      c.strokeStyle = "rgba(243,239,230,.7)";
      c.lineWidth = Math.max(1.2, 0.45 * view.scale);
      c.setLineDash([7, 8]);
      function oobSide(sign) {
        c.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const prev = pts[Math.max(0, i - 1)];
          const next = pts[Math.min(pts.length - 1, i + 1)];
          const tx = next.x - prev.x, ty = next.y - prev.y;
          const len = Math.hypot(tx, ty) || 1;
          const p = toScr({ x: pts[i].x + (-ty / len) * oobLat * sign, y: pts[i].y + (tx / len) * oobLat * sign });
          if (i === 0) c.moveTo(p.x, p.y);
          else c.lineTo(p.x, p.y);
        }
        c.stroke();
      }
      oobSide(1);
      oobSide(-1);
      c.setLineDash([]);
      c.fillStyle = "rgba(247,244,238,.85)";
      for (let i = 1; i < pts.length - 1; i++) {
        const prev = pts[i - 1], next = pts[Math.min(pts.length - 1, i + 1)];
        const tx = next.x - prev.x, ty = next.y - prev.y;
        const len = Math.hypot(tx, ty) || 1;
        for (const sign of [1, -1]) {
          const p = toScr({ x: pts[i].x + (-ty / len) * oobLat * sign, y: pts[i].y + (tx / len) * oobLat * sign });
          c.fillRect(p.x - 1.5, p.y - 4, 3, 8);
        }
      }
      c.restore();
    }
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

    if (pts && pts.length > 1) {
      const lat = (hole.fairW || 30) + 8.4;
      c.strokeStyle = "#8a8278";
      c.lineWidth = Math.max(2.2, 2.4 * view.scale);
      c.lineCap = "round";
      c.lineJoin = "round";
      c.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(pts.length - 1, i + 1)];
        const tx = next.x - prev.x, ty = next.y - prev.y;
        const len = Math.hypot(tx, ty) || 1;
        const p = toScr({ x: pts[i].x + (-ty / len) * lat, y: pts[i].y + (tx / len) * lat });
        if (i === 0) c.moveTo(p.x, p.y);
        else c.lineTo(p.x, p.y);
      }
      c.stroke();
    }

    (pts || []).forEach(function (wp, i) {
      if (i === 0 || i === pts.length - 1) return;
      const p = toScr(wp);
      c.fillStyle = "rgba(251,191,36,.85)";
      c.beginPath();
      c.arc(p.x, p.y, 4, 0, Math.PI * 2);
      c.fill();
    });

    (hole.rocks || []).forEach(function (rk) {
      const p = toScr(rk);
      const r = Math.max(3, rk.r * view.scale);
      c.fillStyle = rk.block ? "#6b6258" : "#8a8074";
      c.beginPath();
      c.ellipse(p.x, p.y, r, r * 0.62, 0.2, 0, Math.PI * 2);
      c.fill();
    });

    (hole.trees || []).forEach(function (tr) {
      const p = toScr(tr);
      const r = Math.max(6, tr.r * view.scale * 0.55);
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

    (hole.water || []).forEach(function (wtr) {
      const p = toScr({ x: wtr.x, y: wtr.y });
      const ww = wtr.w * view.scale, hh = wtr.h * view.scale;
      const tex = IMGS.water;
      c.save();
      roundRect(c, p.x - 2, p.y - 2, ww + 4, hh + 4, 14);
      c.fillStyle = "#0a3a4a";
      c.fill();
      roundRect(c, p.x, p.y, ww, hh, 12);
      c.clip();
      if (tex.complete && tex.naturalWidth) {
        const tile = Math.max(96, Math.min(ww, hh) * 1.4);
        for (let x = p.x - 8; x < p.x + ww + tile; x += tile) {
          for (let y = p.y - 8; y < p.y + hh + tile; y += tile) {
            c.drawImage(tex, x, y, tile, tile);
          }
        }
        c.fillStyle = "rgba(8,40,60,.28)";
        c.fillRect(p.x, p.y, ww, hh);
      } else {
        const grd = c.createLinearGradient(p.x, p.y, p.x + ww * 0.2, p.y + hh);
        grd.addColorStop(0, "#4aa0c8");
        grd.addColorStop(0.45, "#1d4e6e");
        grd.addColorStop(1, "#0c2438");
        c.fillStyle = grd;
        c.fillRect(p.x, p.y, ww, hh);
      }
      c.strokeStyle = "rgba(220,245,255,.45)";
      c.lineWidth = 1.4;
      for (let i = 1; i < 5; i++) {
        c.beginPath();
        c.moveTo(p.x + 6, p.y + hh * i / 5);
        c.quadraticCurveTo(p.x + ww * 0.35, p.y + hh * i / 5 - 6, p.x + ww * 0.7, p.y + hh * i / 5 + 3);
        c.quadraticCurveTo(p.x + ww * 0.85, p.y + hh * i / 5 + 2, p.x + ww - 6, p.y + hh * i / 5);
        c.stroke();
      }
      c.restore();
      c.save();
      c.strokeStyle = "rgba(186,230,253,.55)";
      c.lineWidth = 2;
      roundRect(c, p.x, p.y, ww, hh, 12);
      c.stroke();
      c.restore();
    });

    (hole.bunkers || []).forEach(function (bnk) {
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
      const aimA = ang(G.ball, G.marker);
      const land = toScr({
        x: G.ball.x + Math.cos(aimA) * reach,
        y: G.ball.y + Math.sin(aimA) * reach,
      });
      c.strokeStyle = "rgba(94,234,212,.9)";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(m.x, m.y, 10, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.moveTo(m.x - 13, m.y);
      c.lineTo(m.x + 13, m.y);
      c.moveTo(m.x, m.y - 13);
      c.lineTo(m.x, m.y + 13);
      c.stroke();
      c.fillStyle = "#5eead4";
      c.beginPath();
      c.arc(m.x, m.y, 4.2, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#fbbf24";
      c.beginPath();
      c.arc(m.x, m.y, 1.6, 0, Math.PI * 2);
      c.fill();
      const pred = predictDest();
      if (pred && pred.carry) {
        const cp = toScr(pred.carry);
        c.fillStyle = "#fbbf24";
        c.beginPath();
        c.arc(cp.x, cp.y, 4.2, 0, Math.PI * 2);
        c.fill();
      }
      if (pred && pred.dest) {
        const wp = toScr(pred.dest);
        const fromPip = pred.carry ? toScr(pred.carry) : land;
        c.strokeStyle = pred.blocked ? "rgba(248,113,113,.85)" : "rgba(192,132,252,.9)";
        c.setLineDash([3, 4]);
        c.beginPath();
        c.moveTo(fromPip.x, fromPip.y);
        c.lineTo(wp.x, wp.y);
        c.stroke();
        c.setLineDash([]);
        c.fillStyle = pred.blocked ? "#f87171" : "#c084fc";
        c.beginPath();
        c.arc(wp.x, wp.y, 5, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = "#111";
        c.lineWidth = 1.1;
        c.stroke();
      }
    }
    const trail = G.trail || [];
    for (let i = 0; i < trail.length; i++) {
      const t = trail[i];
      const p = toScr(t);
      const lift = (t.z || 0) * view.scale * 0.4;
      const a = 0.08 + (i / trail.length) * 0.35;
      c.fillStyle = "rgba(247,250,246," + a + ")";
      c.beginPath();
      c.arc(p.x, p.y - lift, 1.6 + (t.z || 0) * 0.08, 0, Math.PI * 2);
      c.fill();
    }
    const ball = G.flying || G.ball;
    const z = ball.z || 0;
    const ground = toScr(ball);
    const bp = { x: ground.x, y: ground.y - z * view.scale * 0.42 };
    const r = 5.6 + z * 0.22;
    c.fillStyle = "rgba(0,0,0," + (0.22 + Math.min(0.28, z * 0.008)) + ")";
    c.beginPath();
    c.ellipse(ground.x + 1, ground.y + 3 + z * 0.08, 5.2 + z * 0.12, 2.1 + z * 0.04, 0, 0, Math.PI * 2);
    c.fill();
    const shine = c.createRadialGradient(bp.x - r * 0.28, bp.y - r * 0.32, r * 0.1, bp.x, bp.y, r);
    shine.addColorStop(0, "#ffffff");
    shine.addColorStop(0.35, "#f4f7f2");
    shine.addColorStop(1, "#c5cdc0");
    c.fillStyle = shine;
    c.beginPath();
    c.arc(bp.x, bp.y, r, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#1a1a1a";
    c.lineWidth = 1;
    c.stroke();
    c.strokeStyle = "rgba(40,40,40,.35)";
    c.beginPath();
    c.arc(bp.x, bp.y, r * 0.55, -0.4, 1.1);
    c.stroke();
  }

  function renderHoleCard() {
    if (!G.hole) return;
    const d = dist(G.ball, G.hole.pin);
    const md = G.marker ? dist(G.ball, G.marker) : 0;
    const lie = lieAt(G.hole, G.ball);
    const rec = pickClub(md || d, lie === "green");
    const pred = predictDest();
    const caddie = $("caddieHud");
    if (caddie) {
      caddie.innerHTML =
        "<p>Pin <b>" + d.toFixed(0) + " yd</b> · marker <b>" + md.toFixed(0) + " yd</b></p>" +
        "<p>Caddie: <b>" + rec.name + "</b> · lie " + lie + "</p>" +
        "<p>Club " + intendedCarry().toFixed(0) + " yd" +
        (pred ? " · carry " + pred.actual.toFixed(0) + " yd" : "") +
        (pred && pred.landLie ? " · land " + pred.landLie : "") +
        (pred && pred.roll > 0.6 ? " · roll " + pred.roll.toFixed(0) + " yd" : "") +
        (pred && pred.blocked ? " · blocked" : "") + "</p>" +
        "<p>Mulligans <b>" + G.mulligans + "</b> · M to replay the hole</p>";
    }
    if ($("holeCard")) {
      $("holeCard").innerHTML =
        "<p><b>" + (G.course ? G.course.name : "Endless") + "</b></p>" +
        "<p>" + (G.hole.name ? G.hole.name + " · " : "") + "Par " + G.hole.par + " · " + Math.round(G.hole.yards) + " yd</p>" +
        "<p>To pin <b>" + d.toFixed(1) + " yd</b></p>" +
        "<p>Lie: " + lie + " · strokes " + G.strokes + "</p>" +
        (G.hole.hint ? "<p class='lore'>" + G.hole.hint + "</p>" : "");
    }
    if ($("windHud")) $("windHud").textContent = windLabel();
    if ($("hudMeta")) {
      $("hudMeta").innerHTML =
        "<span>Strokes <b>" + G.strokes + "</b></span>" +
        "<span>Hole <b>" + (G.hi + 1) + "/" + G.holes.length + "</b></span>" +
        "<span>To pin <b>" + d.toFixed(0) + " yd</b></span>";
    }
    if ($("dockStatus") && G.club) {
      $("dockStatus").textContent = G.club.name + " · " + Math.round(G.power * 100) + "% · " + intendedCarry().toFixed(0) + " yd · marker " + md.toFixed(0) + " yd";
    }
    paintPower();
  }

  function setPower(p) {
    G.power = Math.max(0, Math.min(1, p));
    paintPower();
    if (G.hole) {
      renderHoleCard();
      draw();
    }
  }

  function paintPower() {
    if (!G.club) return;
    const pct = Math.round(G.power * 100);
    const yd = intendedCarry();
    const putt = !!(G.club && G.club.putt);
    const minLab = putt ? "0 yd" : (G.club.min + " yd");
    const maxLab = putt ? "to marker" : (G.club.max + " yd");
    const fill = pct + "%";
    if ($("powPct")) $("powPct").textContent = pct + "%";
    if ($("powYd")) $("powYd").textContent = yd.toFixed(0) + " yd";
    if ($("powMin")) $("powMin").textContent = minLab;
    if ($("powMax")) $("powMax").textContent = maxLab;
    if ($("powClub")) $("powClub").textContent = G.club ? G.club.name : "";
    if ($("powerFill")) $("powerFill").style.width = fill;
    if ($("powerHudFill")) $("powerHudFill").style.width = fill;
    if ($("powerHudRead")) $("powerHudRead").textContent = pct + "% · " + yd.toFixed(0) + " yd";
    ["powerRange", "powerHudRange"].forEach(function (id) {
      const el = $(id);
      if (el && String(el.value) !== String(pct)) el.value = String(pct);
    });
    document.querySelectorAll(".pow").forEach(function (btn) {
      const v = Number(btn.getAttribute("data-p"));
      btn.classList.toggle("on", Math.abs(v - G.power) < 0.005);
    });
  }

  function paintClubs() {
    if (!$("clubs") || !G.club) return;
    $("clubs").innerHTML = CLUBS.map(function (c) {
      return '<button type="button" class="club' + (c.id === G.club.id ? " on" : "") + '" data-id="' + c.id + '">' +
        c.name + "<small>" + (c.putt ? "to marker" : (c.min + "–" + c.max + " yd")) + "</small></button>";
    }).join("");
  }

  function shoot() {
    if (G.flying || G.mode === "menu" || !G.hole || !G.marker || !G.club) return;
    const pin = G.hole.pin;
    const onG = lieAt(G.hole, G.ball) === "green";
    if (G.club.putt && !onG && dist(G.ball, pin) > 40) {
      log("Putter wants the green.");
      return;
    }
    G.undo = {
      ball: { x: G.ball.x, y: G.ball.y },
      marker: G.marker ? { x: G.marker.x, y: G.marker.y } : null,
      strokes: G.strokes,
    };
    G.lastBall = { x: G.ball.x, y: G.ball.y };
    const from = { x: G.ball.x, y: G.ball.y };
    if (onG && dist(from, pin) <= GIMME) {
      G.strokes += 1;
      G.ball = { x: pin.x, y: pin.y };
      log("Tap-in. " + G.strokes + " · par " + G.hole.par);
      holeDone();
      return;
    }
    const m = shotModel(true);
    if (!m) return;
    G.strokes += 1;
    G.flying = { x: from.x, y: from.y, z: 0, phase: G.club.putt ? "roll" : "fly" };
    animateShot(from, m, function () {
      if (G.mode === "menu" || !G.hole) return;
      G.ball = { x: m.dest.x, y: m.dest.y };
      if (m.holed || dist(G.ball, pin) <= CUP || (lieAt(G.hole, G.ball) === "green" && dist(G.ball, pin) <= GIMME)) {
        log("Cup. " + G.strokes + " · par " + G.hole.par);
        holeDone();
        return;
      }
      const now = lieAt(G.hole, G.ball);
      if (now === "water" || now === "oob") {
        G.strokes += 1;
        G.ball = { x: G.undo.ball.x, y: G.undo.ball.y };
        log((now === "water" ? "Water. Drop +1." : "Out of bounds. Stroke and distance.") + " Now " + G.strokes);
      } else if (m.blocked === "trees") {
        log("Into the trees. Ball stops. " + dist(from, m.dest).toFixed(0) + " yd · " + now);
      } else {
        const rollBit = m.roll > 0.8 ? " + " + m.roll.toFixed(0) + " yd roll" : " · no roll";
        log(G.club.name + " " + Math.round(G.power * 100) + "% → " + m.actual.toFixed(1) + " yd carry" + rollBit + " · " + (m.landLie || now) + " → " + now);
      }
      G.marker = nextAim(G.hole, G.ball);
      autoClub();
      renderHoleCard();
      draw();
    });
  }

  function animateShot(from, model, done) {
    const carry = model.carry || model.dest;
    const rest = model.dest;
    const putt = !!(G.club && G.club.putt);
    const blocked = !!model.blocked;
    const landLie = model.landLie || lieAt(G.hole, carry);
    const rollPts = (model.rollPath && model.rollPath.length > 1)
      ? model.rollPath
      : (putt ? [from, rest] : [carry, rest]);
    const flyLen = dist(from, carry);
    const rollLen = pathLenPts(rollPts);
    const loft = putt ? 0 : Math.min(46, 8 + flyLen * 0.095);
    const flyMs = putt ? 0 : (560 + flyLen * 5.1);
    const canBounce = !putt && !blocked && loft > 6 && (landLie === "fairway" || landLie === "green");
    const bounceMs = canBounce ? Math.min(480, 160 + Math.min(rollLen, 36) * 5) : (landLie === "rough" && !putt && !blocked ? 90 : 0);
    const roughSlow = landLie === "rough" || landLie === "bunker";
    const rollMs = (blocked || landLie === "water")
      ? 0
      : (putt ? (480 + rollLen * 16) : (roughSlow ? (140 + rollLen * 12) : (240 + rollLen * 24)));
    const holdMs = model.holed ? 1180 : 920;
    const t0 = performance.now();
    const shotN = ++G.shotN;
    G.trail = [];
    if ($("btnShoot")) $("btnShoot").disabled = true;

    function pose(x, y, z, phase) {
      G.flying = { x: x, y: y, z: z, phase: phase };
      G.trail.push({ x: x, y: y, z: z });
      if (G.trail.length > 36) G.trail.shift();
      draw();
    }

    function tick(now) {
      if (shotN !== G.shotN || G.mode === "menu" || !G.hole) {
        if ($("btnShoot")) $("btnShoot").disabled = false;
        return;
      }
      const t = now - t0;
      let x, y, z, phase;
      if (!putt && flyMs > 0 && t < flyMs) {
        const u = t / flyMs;
        const e = 1 - Math.pow(1 - u, 1.55);
        x = from.x + (carry.x - from.x) * e;
        y = from.y + (carry.y - from.y) * e;
        const apex = Math.pow(u, 0.82);
        z = Math.sin(Math.PI * apex) * loft;
        phase = "fly";
      } else if (bounceMs && t < flyMs + bounceMs) {
        const u = (t - flyMs) / bounceMs;
        const p = pointOnPath(rollPts, u * 0.12);
        x = p.x;
        y = p.y;
        if (canBounce) {
          const hopI = u < 0.58 ? 0 : 1;
          const hu = hopI === 0 ? u / 0.58 : (u - 0.58) / 0.42;
          z = Math.sin(Math.PI * Math.max(0, Math.min(1, hu))) * loft * (hopI === 0 ? 0.12 : 0.045);
        } else {
          z = Math.sin(Math.PI * u) * 1.1;
        }
        phase = "bounce";
      } else if (rollMs && t < flyMs + bounceMs + rollMs) {
        const u = (t - flyMs - bounceMs) / rollMs;
        const e = 1 - Math.pow(1 - u, roughSlow ? 1.7 : 2.55);
        const p = pointOnPath(rollPts, e);
        x = p.x;
        y = p.y;
        z = 0;
        phase = "roll";
      } else if (t < flyMs + bounceMs + rollMs + holdMs) {
        x = rest.x;
        y = rest.y;
        z = 0;
        phase = "hold";
      } else {
        if (shotN !== G.shotN) return;
        G.flying = null;
        G.trail = [];
        if ($("btnShoot")) $("btnShoot").disabled = false;
        done();
        return;
      }
      pose(x, y, z, phase);
      requestAnimationFrame(tick);
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
      golfer: golferOf(G.save.golfer).name,
      golferId: G.save.golfer || "mira",
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
    if (window.ArcadeLedger) {
      ArcadeLedger.golf({
        name: (G.save.name || "Operator").slice(0, 18),
        event: "round",
        course: String((G.course && G.course.name) || "Endless").slice(0, 40),
        courseId: String((G.course && G.course.id) || "endless").slice(0, 32),
        mode: String(G.mode || "9").slice(0, 16),
        holes: G.card.length,
        par: G.card.reduce(function (n, h) { return n + h.par; }, 0),
        total: t,
        vsPar: v,
        golfer: golferOf(G.save.golfer).name.slice(0, 24),
        date: new Date().toISOString().slice(0, 10)
      });
    }
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
      "<div class='modes'><button class='btn gold' id='again'>Play again</button><button class='btn' id='scCopy'>Copy card</button><button class='btn' id='toMenu'>Menu</button><a class='btn' href='./ledger.html'>Live hall</a></div>",
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
        "<div><span>Golfer</span><b>" + golferOf(G.save.golfer).name.replace(/[<>]/g, "") + "</b></div>" +
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
    t += "chatagent.ca/games/lattice-golf/\n";
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
    const rng = G.rng || Math.random;
    const j = function (n, s) { return n + (rng() * 2 - 1) * s; };
    function clampN(v, a, b) { return v < a ? a : v > b ? b : v; }
    function segPerp(path, i) {
      const prev = path[Math.max(0, i - 1)];
      const next = path[Math.min(path.length - 1, i + 1)];
      const tx = next.x - prev.x, ty = next.y - prev.y;
      const len = Math.hypot(tx, ty) || 1;
      return { x: -ty / len, y: tx / len };
    }
    function cleanPath(src) {
      const out = [{ x: src[0].x, y: src[0].y }];
      for (let i = 1; i < src.length; i++) {
        if (dist(out[out.length - 1], src[i]) >= 40) out.push({ x: src[i].x, y: src[i].y });
      }
      if (out.length < 2) out.push({ x: 380, y: 0 });
      return out;
    }
    function scalePath(src, target) {
      const len = pathLen(src) || 1;
      const s = target / len;
      return src.map(function (p, i) {
        if (i === 0) return { x: 0, y: 0 };
        return { x: p.x * s, y: p.y * s };
      });
    }
    function circleHitsRect(c, r, w) {
      const nx = clampN(c.x, w.x, w.x + w.w);
      const ny = clampN(c.y, w.y, w.y + w.h);
      return dist(c, { x: nx, y: ny }) < r;
    }
    function waterBlocksPlay(w, path, fairW, greenR) {
      const tee = path[0], pin = path[path.length - 1];
      if (circleHitsRect(tee, 16, w) || circleHitsRect(pin, greenR + 6, w)) return true;
      if (path.length <= 2) return false;
      for (let i = 1; i < path.length - 1; i++) {
        if (circleHitsRect(path[i], fairW + 5, w)) return true;
      }
      return false;
    }
    function waterAlongInside(path, i0, i1, depth, fairW) {
      let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
      const a = path[i0], b = path[Math.min(path.length - 1, i1)];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const cut = path[Math.max(i0, Math.min(i1, ((i0 + i1) / 2) | 0))];
      const inward = { x: mid.x - cut.x, y: mid.y - cut.y };
      const ilen = Math.hypot(inward.x, inward.y) || 1;
      const ox = (inward.x / ilen) * (fairW + depth * 0.55 + 6);
      const oy = (inward.y / ilen) * (fairW + depth * 0.55 + 6);
      for (let i = i0; i <= i1 && i < path.length; i++) {
        const px = path[i].x + ox, py = path[i].y + oy;
        minx = Math.min(minx, px - depth * 0.45);
        miny = Math.min(miny, py - depth * 0.45);
        maxx = Math.max(maxx, px + depth * 0.45);
        maxy = Math.max(maxy, py + depth * 0.45);
      }
      if (maxx - minx < 24 || maxy - miny < 18) return null;
      return { x: minx, y: miny, w: maxx - minx, h: maxy - miny };
    }
    function islandWater(path, greenR) {
      const pin = path[path.length - 1];
      const gap = Math.max(28, greenR * 2.2);
      const w = Math.max(40, pin.x - 18 - gap);
      if (w < 36) return null;
      return { x: 18, y: -68, w: w, h: 136 };
    }
    function guardBunkers(path, fairW, greenR) {
      const out = [];
      for (let i = 1; i < path.length; i++) {
        const pt = path[i];
        const n = segPerp(path, i);
        const isGreen = i === path.length - 1;
        const r = isGreen ? 9 + rng() * 3 : 10 + rng() * 3.5;
        const lat = (isGreen ? greenR : fairW) + r + 3 + rng() * 4;
        const side = i % 2 === 0 ? 1 : -1;
        const b = { x: pt.x + n.x * lat * side, y: pt.y + n.y * lat * side, r: r };
        if (dist(b, path[0]) < 18) continue;
        if (dist(b, path[path.length - 1]) < greenR + 3) continue;
        out.push(b);
        if (!isGreen && rng() < 0.45) {
          const b2 = { x: pt.x - n.x * lat * side * 0.85, y: pt.y - n.y * lat * side * 0.85, r: r * 0.85 };
          if (dist(b2, path[path.length - 1]) >= greenR + 4) out.push(b2);
        }
      }
      return out;
    }

    const par = [3, 3, 4, 4, 4, 4, 5, 5][(rng() * 8) | 0];
    const pack = par === 3
      ? ["alcatraz", "needle3", "redan", "postage"]
      : par === 4
        ? ["zigzag", "hairpin", "gauntlet", "capeKick", "pretzel"]
        : ["serpent", "archipelago", "spiral", "doubleCape", "maze"];
    const shape = pack[(rng() * pack.length) | 0];
    const s = rng() < 0.5 ? 1 : -1;
    let raw = [{ x: 0, y: 0 }, { x: 400, y: 0 }];
    let hint = "Wild hole.";
    let waterMode = "";
    let creekIs = [];
    let wantGuards = true;
    let fairW = par === 3 ? 15 : par === 5 ? 20 : 18;
    let greenR = par === 3 ? 9 : par === 5 ? 12 : 11;
    let target = par === 3 ? 155 + rng() * 70 : par === 4 ? 350 + rng() * 100 : 510 + rng() * 100;

    if (shape === "alcatraz") {
      raw = [{ x: 0, y: 0 }, { x: 1, y: j(0, 0.04) }];
      hint = "Alcatraz. Tiny island. Carry all of it — short is the pond.";
      waterMode = "island";
      wantGuards = false;
      fairW = 13; greenR = 8;
      target = 165 + rng() * 50;
    } else if (shape === "needle3") {
      raw = [{ x: 0, y: 0 }, { x: 0.55, y: 0.22 * s }, { x: 1, y: -0.06 * s }];
      hint = "Needle over water, then a kick. Short of either landing is wet.";
      waterMode = "island";
      fairW = 14; greenR = 9;
      target = 175 + rng() * 45;
    } else if (shape === "redan") {
      raw = [{ x: 0, y: 0 }, { x: 1, y: 0.32 * s }];
      hint = "Redan. Long diagonal. The bunker sits on the pin line — aim the high side.";
      wantGuards = true;
      fairW = 16; greenR = 10;
      target = 180 + rng() * 45;
    } else if (shape === "postage") {
      raw = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
      hint = "Postage. Water, then a bunker ring around a thimble green.";
      waterMode = "island";
      wantGuards = true;
      fairW = 12; greenR = 7;
      target = 108 + rng() * 22;
    } else if (shape === "zigzag") {
      raw = [{ x: 0, y: 0 }, { x: 0.28, y: 0.22 * s }, { x: 0.55, y: -0.2 * s }, { x: 0.78, y: 0.2 * s }, { x: 1, y: -0.03 * s }];
      hint = "Zigzag four. Four elbows. Every cut is trees. Walk it.";
      fairW = 17;
    } else if (shape === "hairpin") {
      raw = [{ x: 0, y: 0 }, { x: 0.42, y: 0.03 * s }, { x: 0.48, y: 0.28 * s }, { x: 0.86, y: 0.26 * s }, { x: 1, y: 0.06 * s }];
      hint = "Hairpin. Almost 180°. Inside is dead. Go out, turn, come back.";
      waterMode = "inside";
      fairW = 16;
    } else if (shape === "gauntlet") {
      raw = [{ x: 0, y: 0 }, { x: 0.32, y: -0.02 }, { x: 0.52, y: 0.14 * s }, { x: 0.74, y: -0.12 * s }, { x: 1, y: 0.08 * s }];
      hint = "Gauntlet. Bunkers gate every landing. The fairway is a slot.";
      fairW = 16;
    } else if (shape === "capeKick") {
      raw = [{ x: 0, y: 0 }, { x: 0.32, y: -0.18 * s }, { x: 0.58, y: -0.05 * s }, { x: 0.8, y: 0.14 * s }, { x: 1, y: 0.03 * s }];
      hint = "Cape, kick, cape again. Water owns the chord. Club the shore.";
      waterMode = "inside";
      fairW = 18;
    } else if (shape === "pretzel") {
      raw = [{ x: 0, y: 0 }, { x: 0.28, y: 0.18 * s }, { x: 0.36, y: -0.12 * s }, { x: 0.66, y: -0.15 * s }, { x: 0.74, y: 0.14 * s }, { x: 1, y: 0.02 * s }];
      hint = "Pretzel. The fairway folds. Five turns. No hero line.";
      fairW = 17;
    } else if (shape === "serpent") {
      raw = [{ x: 0, y: 0 }, { x: 0.22, y: 0.2 * s }, { x: 0.44, y: -0.2 * s }, { x: 0.64, y: 0.18 * s }, { x: 0.84, y: -0.16 * s }, { x: 1, y: 0.04 * s }];
      hint = "Serpent five. Six legs. This is a hike — club each corner.";
      fairW = 18;
    } else if (shape === "archipelago") {
      raw = [{ x: 0, y: 0 }, { x: 0.24, y: 0.03 }, { x: 0.42, y: -0.12 * s }, { x: 0.62, y: 0.1 * s }, { x: 0.82, y: -0.04 * s }, { x: 1, y: 0.05 * s }];
      hint = "Archipelago. Creeks between landings. Short is the drink.";
      creekIs = [1, 2, 3];
      fairW = 17;
    } else if (shape === "spiral") {
      raw = [{ x: 0, y: 0 }, { x: 0.28, y: 0.06 }, { x: 0.46, y: 0.22 }, { x: 0.36, y: 0.38 }, { x: 0.62, y: 0.4 }, { x: 0.84, y: 0.2 }, { x: 1, y: 0.05 }];
      hint = "Spiral. The hole coils. Play around the woods, never through.";
      fairW = 17;
    } else if (shape === "doubleCape") {
      raw = [{ x: 0, y: 0 }, { x: 0.24, y: -0.14 * s }, { x: 0.46, y: 0.03 * s }, { x: 0.68, y: -0.14 * s }, { x: 0.88, y: 0.04 * s }, { x: 1, y: 0.1 * s }];
      hint = "Double cape. Two bites of water. Neither is driveable.";
      waterMode = "inside";
      fairW = 18;
    } else {
      raw = [{ x: 0, y: 0 }, { x: 0.22, y: 0.16 * s }, { x: 0.42, y: 0.03 * s }, { x: 0.48, y: -0.16 * s }, { x: 0.7, y: -0.05 * s }, { x: 0.78, y: 0.16 * s }, { x: 1, y: 0.02 * s }];
      hint = "Maze five. Six corners and a creek. The pin is a rumor.";
      creekIs = [3];
      fairW = 16;
    }

    let path = scalePath(cleanPath(raw), target);
    path = path.map(function (p, i) {
      if (i === 0) return { x: 0, y: 0 };
      return { x: j(p.x, 4), y: j(p.y, 5) };
    });
    path = cleanPath(path);
    path[0] = { x: 0, y: 0 };

    let bunkers = wantGuards ? guardBunkers(path, fairW, greenR) : [];
    if (shape === "postage") {
      const pin = path[path.length - 1];
      bunkers = [
        { x: pin.x - greenR - 11, y: pin.y, r: 11 },
        { x: pin.x, y: pin.y - greenR - 9, r: 8 },
        { x: pin.x, y: pin.y + greenR + 9, r: 8 }
      ];
    } else if (shape === "redan") {
      const pin = path[path.length - 1];
      bunkers.push({ x: pin.x * 0.74, y: pin.y * 0.62, r: 14 });
    }

    let water = [];
    if (waterMode === "island") {
      if (path.length <= 2) {
        const iw = islandWater(path, greenR);
        if (iw && !waterBlocksPlay(iw, path, fairW, greenR)) water.push(iw);
      } else {
        const a = path[0], b = path[1];
        const span = Math.max(36, dist(a, b) * 0.52);
        const box = { x: 20, y: -58, w: span, h: 116 };
        if (!waterBlocksPlay(box, path, fairW, greenR)) water.push(box);
      }
    } else if (waterMode === "inside" && path.length >= 3) {
      const span = shape === "doubleCape" ? [[0, 2], [2, 4]] : [[0, Math.min(3, path.length - 1)]];
      span.forEach(function (ab) {
        const box = waterAlongInside(path, ab[0], ab[1], 52, fairW);
        if (box && !waterBlocksPlay(box, path, fairW, greenR)) water.push(box);
      });
    }
    creekIs.forEach(function (i) {
      if (i >= path.length - 1) return;
      const a = path[i], b = path[i + 1];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const n = segPerp(path, i);
      const box = { x: mx - 22 + n.x * 8, y: my - 36 + n.y * 8, w: 44, h: 72 };
      if (!waterBlocksPlay(box, path, fairW, greenR)) water.push(box);
    });

    const pin = path[path.length - 1];
    const nPin = segPerp(path, path.length - 1);
    const groves = [{
      x: pin.x + nPin.x * (greenR + 22),
      y: pin.y + nPin.y * (greenR + 22),
      n: 5,
      r: 14
    }];
    const forests = path.length >= 3 ? elbowForest(path, fairW) : [];
    return H(par, "Wild " + shape, path, {
      bunkers: bunkers,
      water: water,
      groves: groves,
      forests: forests,
      hint: hint,
      fairW: fairW,
      greenR: greenR
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
    G.mulligans = mode === "18" ? 2 : 1;
    if (mode === "endless") {
      G.holes = [randomHole()];
      G.course = { id: "endless", name: "Endless wilds", wind: [4, 12], lore: "Extreme random holes. End the walk to post the card." };
    } else if (mode === "18") G.holes = PINE.holes.concat(CORAL.holes);
    else G.holes = (course || PINE).holes.slice();
    if (mode === "18") G.course = { id: "haven-open", name: "Haven Open 18", wind: [1, 7], lore: "Pine Haven front nine, Coral Lattice back nine." };
    hideOverlay();
    $("app").classList.remove("hidden");
    $("boot").classList.add("hidden");
    paintEndBtn();
    paintGolfer();
    setupHole();
    paintClubs();
    canvas.focus();
  }

  function paintGolfer() {
    const g = golferOf(G.save.golfer);
    const img = $("golferImg");
    if (!img) return;
    img.src = g.src;
    img.alt = g.name;
    $("golferName").textContent = g.name;
    $("golferTag").textContent = g.tag;
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
        "<p class='lore'>Finish at least one hole, then End walk posts the card to the live hall.</p>" +
        "<button class='btn gold' id='keepWalk'>Keep walking</button>"
      );
      $("keepWalk").onclick = hideOverlay;
      return;
    }
    const t = total(G.card);
    const v = vsPar(G.card);
    showSheet(
      "<p class='kicker'>End the walk</p><h2>" + G.card.length + " holes · " + t + " strokes · " + vsLabel(v) + "</h2>" +
      "<p class='lore'>The hole you are on now is not counted. Posting writes this card to the live hall.</p>" +
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
    abortShot();
    paintEndBtn();
    $("boot").classList.add("hidden");
    $("app").classList.add("hidden");
    const name = (G.save.name || "").replace(/[<>]/g, "");
    showSheet(
      "<div class='title-screen'>" +
        "<div class='title-art'>" +
          "<img src='./assets/menu.jpg?v=19' alt='Lattice Golf — twilight pin and cup'>" +
          "<div class='title-art-fade'></div>" +
        "</div>" +
        "<div class='title-panel'>" +
          "<p class='kicker'>Δ9Φ963 · chatagent.ca</p>" +
          "<h1>LATTICE GOLF</h1>" +
          "<p class='title-tag'>Club the next landing, not the flag. Overclub is sand, trees, or water.</p>" +
          "<p class='lore'>Drag the power bar · ← → fine · 1–4 snap · [ ] clubs · Space shoot</p>" +
          "<div class='modes' style='margin:.55rem 0 0'><button type='button' class='btn' id='menuRadio'>Play radio</button></div>" +
          "<p class='lore' style='margin:.35rem 0 0'><a href='https://ffm.to/eovnvo9' target='_blank' rel='noopener noreferrer'>Stream Excavationpro</a> · <a href='https://asiancoastline.com/listen.html' target='_blank' rel='noopener'>Free listen</a></p>" +
          "<label style='margin-top:.85rem;display:block'>Operator name</label>" +
          "<input class='name' id='nm' maxlength='24' value='" + name.replace(/'/g, "") + "' placeholder='Operator'>" +
          "<p class='kicker' style='margin-top:.75rem'>Choose golfer</p>" +
          "<div class='cast-grid'>" +
            CAST.map(function (c) {
              const on = (G.save.golfer || "mira") === c.id ? " on" : "";
              return "<button type='button' class='cast" + on + "' data-cast='" + c.id + "'>" +
                "<img src='" + c.src + "' alt='" + c.name + "'>" +
                "<b>" + c.name + "</b><span>" + c.tag + "</span></button>";
            }).join("") +
          "</div>" +
          "<div class='mode-grid'>" +
            "<button type='button' class='mode-card' data-go='pine'><b>Pine Haven 9</b><span>" + PINE.lore + "</span></button>" +
            "<button type='button' class='mode-card' data-go='coral'><b>Coral Lattice 9</b><span>" + CORAL.lore + "</span></button>" +
            "<button type='button' class='mode-card' data-go='star'><b>Singularity Nine</b><span>" + STAR.lore + "</span></button>" +
            "<button type='button' class='mode-card' data-go='18'><b>Haven Open 18</b><span>Front nine parkland, back nine coastal wind.</span></button>" +
            "<button type='button' class='mode-card' data-go='endless'><b>Endless wilds</b><span>Extreme generated holes. Tight, long, mean. End walk to post the card.</span></button>" +
            "<button type='button' class='mode-card' data-go='campaign'><b>Campaign vs AI</b><span>The Haven Circuit. Colder swing. Same pin.</span></button>" +
            "<a class='mode-card' href='./ledger.html'><b>Live hall</b><span>Public rounds. Names and totals only.</span></a>" +
          "</div>" +
          donateHtml() +
          "<p class='lore' style='margin-top:.8rem'><a href='/games/'>All games</a> · Support keeps the arcade on.</p>" +
        "</div>" +
      "</div>",
      true
    );
    $("overlay").onclick = function (e) {
      const pick = e.target.closest("[data-cast]");
      if (pick) {
        G.save.golfer = pick.getAttribute("data-cast");
        writeSave(G.save);
        document.querySelectorAll(".cast").forEach(function (el) {
          el.classList.toggle("on", el.getAttribute("data-cast") === G.save.golfer);
        });
        paintGolfer();
        return;
      }
      const b = e.target.closest("[data-go]");
      if (!b) return;
      const nm = ($("nm") && $("nm").value || "").replace(/[<>]/g, "").trim().slice(0, 24);
      if (nm) { G.save.name = nm; writeSave(G.save); }
      const go = b.getAttribute("data-go");
      if (go === "pine") startRound("9", PINE);
      if (go === "coral") startRound("9", CORAL);
      if (go === "star") startRound("9", STAR);
      if (go === "18") startRound("18");
      if (go === "endless") startRound("endless");
      if (go === "campaign") startCampaign();
    };
    const mr = $("menuRadio");
    if (mr) {
      mr.onclick = function (e) {
        e.stopPropagation();
        const b = $("radioPlay");
        if (b) b.click();
      };
    }
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
      "<ol class='lore'><li>Do not click the hole. The first marker sits on the next landing. Pick a club that finishes there — 100% driver often flies the corner into trouble.</li>" +
      "<li>Gold ring is this power’s carry. Gold pip is the air landing. Violet pip is rest after roll. Trees stop a cut. Water you must actually carry.</li>" +
      "<li>Drag the full power bar (0–100%) inside this club’s range. 1–4 snaps 25/50/75/100. Arrows nudge 1%. Shift+arrow is 5%. Wind still moves the ball a little.</li>" +
      "<li>On the green, plant the marker on the cup. 100% rolls to the marker. The cup swallows the ball if the path goes through it.</li>" +
      "<li>Water and OOB cost a stroke and you drop.</li>" +
      "<li>The hole is a 2.5D course. Click the ground to plant the marker. Gold ring is club carry. Violet pip is the wind landing. Red means trees stop the flight.</li>" +
      "<li>Scroll or +/− zooms the course. Right-drag orbits. Shift-drag or middle-drag pans. R or double-click fits the hole. Z undoes. M is a mulligan. Esc opens the menu.</li></ol>" +
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
    if (!G.hole || G.flying) return;
    if (e.button !== 0 || e.shiftKey || e.altKey) return;
    const r = canvas.getBoundingClientRect();
    if (use3d && window.Golf3D) {
      const w3 = Golf3D.pick(e.clientX, e.clientY);
      if (w3) G.marker = w3;
      else return;
    } else {
      G.marker = toWorld(e.clientX - r.left, e.clientY - r.top);
    }
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
    if (pow) setPower(Number(pow.getAttribute("data-p")));
  });

  function bindPowerBar(el) {
    if (!el) return;
    el.addEventListener("input", function () {
      G.power = Math.max(0, Math.min(1, Number(el.value) / 100));
      paintPower();
      if (G.hole) {
        if ($("dockStatus") && G.club) {
          const md = G.marker && G.ball ? dist(G.ball, G.marker).toFixed(0) : "0";
          $("dockStatus").textContent = G.club.name + " · " + Math.round(G.power * 100) + "% · " + intendedCarry().toFixed(0) + " yd · marker " + md + " yd";
        }
        draw();
      }
    });
    el.addEventListener("wheel", function (ev) {
      ev.preventDefault();
      setPower(G.power + (ev.deltaY < 0 ? 0.01 : -0.01));
    }, { passive: false });
  }
  bindPowerBar($("powerRange"));
  bindPowerBar($("powerHudRange"));

  $("btnShoot").onclick = shoot;
  $("btnUndo").onclick = function () {
    if (!G.undo || G.flying) return;
    G.ball = { x: G.undo.ball.x, y: G.undo.ball.y };
    G.marker = G.undo.marker ? { x: G.undo.marker.x, y: G.undo.marker.y } : nextAim(G.hole, G.ball);
    G.strokes = G.undo.strokes;
    G.undo = null;
    G.lastBall = null;
    G.flying = null;
    G.trail = [];
    if ($("btnShoot")) $("btnShoot").disabled = false;
    log("Shot undone.");
    autoClub();
    renderHoleCard();
    draw();
  };
  function useMulligan() {
    if (G.flying || !G.hole || G.mode === "menu") return;
    if (G.mulligans < 1) {
      log("No mulligans left.");
      return;
    }
    G.mulligans -= 1;
    G.ball = { x: G.hole.tee.x, y: G.hole.tee.y };
    G.marker = nextAim(G.hole, G.ball);
    G.strokes = 0;
    G.lastBall = null;
    G.undo = null;
    G.flying = null;
    G.trail = [];
    if ($("btnShoot")) $("btnShoot").disabled = false;
    autoClub();
    log("Mulligan. Hole reset. " + G.mulligans + " left.");
    renderHoleCard();
    draw();
  }
  if (window.ArcadeLedger) ArcadeLedger.boot();
  if ($("btnMulligan")) $("btnMulligan").onclick = useMulligan;
  $("btnHelp").onclick = help;
  $("btnCard").onclick = cardSheet;
  $("btnEnd").onclick = askEndEndless;
  $("btnMenu").onclick = menu;

  window.addEventListener("keydown", function (e) {
    if (e.target && (e.target.tagName === "INPUT")) return;
    if (e.key === "Escape") {
      if (overlayOpen() && G.mode !== "menu") { hideOverlay(); return; }
      menu();
      return;
    }
    if (G.mode === "menu" || overlayOpen()) return;
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); shoot(); }
    if (e.key === "z" || e.key === "Z") { if ($("btnUndo")) $("btnUndo").click(); }
    if (e.key === "m" || e.key === "M") useMulligan();
    if ((e.key === "[" || e.key === "]") && G.club) {
      const i = CLUBS.findIndex(function (c) { return c.id === G.club.id; });
      const n = e.key === "]" ? Math.min(CLUBS.length - 1, i + 1) : Math.max(0, i - 1);
      G.club = CLUBS[n];
      paintClubs();
      renderHoleCard();
      draw();
    }
    if (e.key >= "1" && e.key <= "4") {
      const map = { 1: 0.25, 2: 0.5, 3: 0.75, 4: 1 };
      setPower(map[e.key]);
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const step = e.shiftKey ? 0.05 : 0.01;
      setPower(G.power + (e.key === "ArrowRight" ? step : -step));
    }
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      if (use3d && window.Golf3D) Golf3D.zoom(0.84);
      else { view.user = Math.min(6, (view.user || 1) * 1.16); fitView(); draw(); }
    }
    if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      if (use3d && window.Golf3D) Golf3D.zoom(1.18);
      else { view.user = Math.max(0.45, (view.user || 1) / 1.16); fitView(); draw(); }
    }
    if (e.key === "r" || e.key === "R") {
      view.user = 1;
      fitView({ reset: true });
      draw();
    }
  });

  if (!use3d) {
    canvas.addEventListener("wheel", function (ev) {
      ev.preventDefault();
      const f = ev.deltaY < 0 ? 1.14 : 1 / 1.14;
      view.user = Math.max(0.45, Math.min(6, (view.user || 1) * f));
      fitView();
      draw();
    }, { passive: false });
  }

  function bindZoomBtns() {
    if ($("zoomIn")) $("zoomIn").onclick = function () {
      if (use3d && window.Golf3D) Golf3D.zoom(0.84);
      else { view.user = Math.min(6, (view.user || 1) * 1.16); fitView(); draw(); }
    };
    if ($("zoomOut")) $("zoomOut").onclick = function () {
      if (use3d && window.Golf3D) Golf3D.zoom(1.18);
      else { view.user = Math.max(0.45, (view.user || 1) / 1.16); fitView(); draw(); }
    };
    if ($("zoomReset")) $("zoomReset").onclick = function () {
      view.user = 1;
      fitView({ reset: true });
      draw();
    };
  }
  bindZoomBtns();

  window.addEventListener("resize", function () { if (G.hole) { fitView(); draw(); } });

  $("boot").classList.add("hidden");
  menu();
})();
