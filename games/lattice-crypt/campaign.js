/* Lattice Crypt — 24 authored campaign floors. Haven original. */
window.LatticeCampaign = (function () {
  const CHAPTERS = [
    { realm: 0, title: "Stone", lore: "The Gate of First Light. This was a lock, not a tomb. Four names were the key." },
    { realm: 1, title: "Frost", lore: "Breath that never thawed. The second circle keeps what the first named." },
    { realm: 2, title: "Ember", lore: "A forge that ate its smiths. Do not linger in the glow." },
    { realm: 3, title: "Root", lore: "Living stone. It remembers every foot that tried to leave." },
    { realm: 4, title: "Tide", lore: "The lattice learned to drink. Gates trade one room for another." },
    { realm: 5, title: "Gold", lore: "Tithe rooms. The thief-god's joke: take it, or the clock will." },
    { realm: 6, title: "Void", lore: "Where names go when the vial is empty. The Drain keeps the ledger." },
    { realm: 7, title: "Lattice", lore: "Last geometry. Hold the door with four names or it holds you." }
  ];

  /* Each floor: rooms [x,y,w,h], halls [x1,y1,x2,y2] orthogonal, then placed bits. */
  const FLOORS = [
    /* 0 Stone approach — teach move, food, one nexus, door+key, exit */
    { name: "Threshold", rank: 1, rooms: [[2, 10, 8, 6], [12, 10, 7, 6], [21, 8, 7, 10]], halls: [[9, 13, 12, 13], [18, 13, 21, 13]],
      start: [4, 13], exit: [25, 12], doors: [[18, 13]],
      gens: [[14, 12, "brute"]], items: [[6, 12, "food"], [7, 14, "key"], [23, 10, "flask"]], foes: [[15, 14, "brute"]] },
    /* 1 Stone knot — two gens, key behind the far one */
    { name: "Keywell", rank: 1, rooms: [[2, 2, 8, 7], [12, 2, 6, 6], [20, 2, 8, 8], [4, 16, 10, 8], [18, 16, 10, 8]],
      halls: [[9, 5, 12, 5], [17, 5, 20, 5], [6, 8, 6, 16], [23, 9, 23, 16], [13, 20, 18, 20]],
      start: [4, 4], exit: [24, 20], doors: [[17, 5], [13, 20]],
      gens: [[14, 4, "brute"], [22, 4, "wraith"]], items: [[5, 6, "food"], [21, 6, "key"], [7, 18, "key"], [20, 18, "vial"], [22, 6, "fan"]],
      foes: [[13, 5, "brute"], [22, 18, "wraith"]] },
    /* 2 Stone seal — smash three nexuses to wake the exit */
    { name: "First Seal", rank: 1, seal: true, rooms: [[3, 3, 10, 8], [17, 3, 10, 8], [8, 14, 14, 9]],
      halls: [[12, 6, 17, 6], [10, 10, 10, 14], [20, 10, 20, 14]],
      start: [5, 6], exit: [15, 18],
      gens: [[6, 5, "brute"], [22, 5, "wraith"], [15, 16, "imp"]],
      items: [[8, 8, "food"], [20, 8, "flask"], [12, 16, "vial"], [18, 20, "chest"]],
      foes: [[8, 4, "brute"], [24, 7, "wraith"]], boss: [[15, 16, "gate"]], lore: "The exit sleeps until the nexuses die." },

    /* 3 Frost approach — long hall, hurlers around corners */
    { name: "White Corridor", rank: 1, rooms: [[2, 11, 26, 5], [2, 2, 8, 7], [20, 2, 8, 7], [2, 18, 8, 6], [20, 18, 8, 6]],
      halls: [[5, 8, 5, 11], [24, 8, 24, 11], [5, 15, 5, 18], [24, 15, 24, 18]],
      start: [4, 13], exit: [25, 20], doors: [[20, 13]],
      gens: [[4, 4, "hurler"], [24, 4, "hurler"], [24, 20, "brute"]],
      items: [[14, 13, "food"], [16, 12, "key"], [3, 20, "flask"], [22, 13, "aegis"]],
      foes: [[10, 13, "hurler"], [22, 4, "hurler"]] },
    /* 4 Frost knot — ring with inner vault */
    { name: "Ice Ring", rank: 1, rooms: [[2, 2, 26, 22]], inner: [[8, 7, 14, 12]],
      start: [4, 4], exit: [25, 21], doors: [[15, 7]],
      halls: [[15, 2, 15, 7], [15, 18, 15, 23]],
      gens: [[4, 12, "hurler"], [25, 12, "hurler"], [10, 10, "wraith"]],
      items: [[12, 12, "key"], [14, 10, "vial"], [6, 20, "food"], [22, 4, "swift"], [10, 12, "comet"]],
      foes: [[20, 20, "hurler"], [10, 14, "wraith"]] },
    /* 5 Frost seal + drain tease */
    { name: "Cold Seal", rank: 1, seal: true, drain: true,
      rooms: [[3, 3, 8, 20], [12, 3, 6, 8], [19, 3, 8, 8], [12, 14, 15, 9]],
      halls: [[10, 7, 12, 7], [17, 7, 19, 7], [15, 10, 15, 14]],
      start: [5, 20], exit: [24, 18],
      gens: [[5, 5, "hurler"], [22, 5, "wraith"], [16, 16, "hurler"]],
      items: [[6, 18, "food"], [7, 6, "vial"], [21, 16, "flask"], [14, 5, "chest"]],
      foes: [[6, 12, "hurler"]], boss: [[15, 16, "crown"]], lore: "Something walks the walls. A vial, or it leaves sated." },

    /* 6 Ember approach — imp galleries */
    { name: "Spark Lane", rank: 1, rooms: [[2, 2, 6, 22], [10, 2, 6, 8], [18, 2, 10, 8], [10, 16, 18, 8]],
      halls: [[7, 6, 10, 6], [15, 6, 18, 6], [12, 9, 12, 16], [22, 9, 22, 16]],
      start: [4, 20], exit: [24, 18], doors: [[12, 16]],
      gens: [[4, 4, "imp"], [12, 4, "imp"], [22, 4, "brute"]],
      items: [[5, 18, "food"], [11, 18, "key"], [20, 18, "flask"], [26, 4, "codex"], [12, 6, "cinder"]],
      foes: [[4, 10, "imp"], [20, 6, "imp"]] },
    /* 7 Ember knot — crossfire plus blight */
    { name: "Ash Cross", rank: 2, rooms: [[2, 11, 26, 5], [12, 2, 6, 22]],
      start: [4, 13], exit: [25, 13],
      gens: [[14, 4, "imp"], [14, 20, "imp"], [8, 13, "brute"], [22, 13, "hurler"]],
      items: [[15, 13, "food"], [6, 12, "flask"], [7, 14, "poison"], [24, 12, "vial"], [14, 8, "aegis"]],
      foes: [[14, 13, "imp"]], traps: [[10, 13], [18, 13]] },
    /* 8 Ember seal */
    { name: "Forge Seal", rank: 2, seal: true,
      rooms: [[2, 2, 12, 10], [16, 2, 12, 10], [8, 14, 14, 10]],
      halls: [[13, 6, 16, 6], [10, 11, 10, 14], [20, 11, 20, 14]],
      start: [4, 6], exit: [15, 18],
      gens: [[6, 4, "imp"], [22, 4, "imp"], [12, 16, "brute"], [18, 18, "hurler"]],
      items: [[8, 8, "food"], [20, 8, "vial"], [14, 16, "flask"], [10, 20, "chest"]],
      foes: [[24, 8, "imp"]], boss: [[15, 16, "smith"]], drain: true },

    /* 9 Root approach — maze cells */
    { name: "Catacomb", rank: 2, rooms: [[2, 2, 5, 4], [9, 2, 5, 4], [16, 2, 5, 4], [23, 2, 5, 4],
      [2, 8, 5, 4], [9, 8, 5, 4], [16, 8, 5, 4], [23, 8, 5, 4],
      [2, 14, 5, 4], [9, 14, 5, 4], [16, 14, 5, 4], [23, 14, 5, 4],
      [2, 20, 5, 4], [9, 20, 5, 4], [16, 20, 5, 4], [23, 20, 5, 4]],
      halls: [[6, 4, 9, 4], [13, 4, 16, 4], [20, 4, 23, 4], [4, 5, 4, 8], [11, 5, 11, 8], [18, 11, 18, 14], [25, 11, 25, 14],
        [6, 16, 9, 16], [13, 16, 16, 16], [20, 22, 23, 22], [11, 17, 11, 20]],
      start: [4, 3], exit: [25, 22], doors: [[13, 16], [20, 22]],
      gens: [[11, 3, "shade"], [25, 3, "shade"], [4, 16, "wraith"], [18, 16, "brute"]],
      items: [[4, 10, "key"], [18, 10, "key"], [4, 22, "food"], [11, 22, "vial"], [18, 3, "veil"]],
      foes: [[11, 10, "shade"], [25, 16, "shade"]], hidden: [[25, 10, "vial"]] },
    /* 10 Root knot */
    { name: "Remembering Hall", rank: 2, rooms: [[2, 2, 26, 4], [2, 20, 26, 4], [2, 2, 4, 22], [24, 2, 4, 22], [10, 8, 10, 10]],
      halls: [[13, 5, 13, 8], [13, 17, 13, 20]],
      start: [4, 3], exit: [26, 21], doors: [[13, 8], [13, 17]],
      gens: [[14, 10, "shade"], [14, 14, "shade"], [4, 12, "wraith"], [26, 12, "imp"]],
      items: [[6, 3, "key"], [22, 3, "key"], [6, 21, "food"], [15, 12, "warp"], [22, 21, "flask"], [14, 10, "needle"]],
      foes: [[13, 12, "shade"]], traps: [[8, 3], [20, 21]] },
    /* 11 Root seal */
    { name: "Green Seal", rank: 2, seal: true,
      rooms: [[4, 4, 22, 18], [10, 8, 10, 10]],
      start: [6, 6], exit: [20, 16],
      gens: [[6, 12, "shade"], [23, 12, "shade"], [14, 6, "wraith"], [14, 20, "brute"]],
      items: [[8, 8, "food"], [21, 8, "vial"], [8, 18, "flask"], [21, 18, "chest"]],
      foes: [[12, 12, "shade"], [16, 12, "shade"]], boss: [[14, 16, "heartboss"]], hidden: [[14, 14, "vial"]] },

    /* 12 Tide approach — first gates */
    { name: "First Gate", rank: 2, rooms: [[2, 2, 10, 10], [18, 2, 10, 10], [2, 16, 10, 8], [18, 16, 10, 8]],
      halls: [[11, 6, 18, 6]],
      start: [4, 4], exit: [24, 20], doors: [[11, 6]],
      pads: [[6, 8, 22, 8], [6, 20, 22, 4]],
      gens: [[8, 4, "imp"], [22, 14, "hurler"], [8, 18, "wraith"]],
      items: [[4, 8, "key"], [20, 18, "food"], [24, 6, "vial"], [4, 20, "swift"], [22, 6, "halo"]],
      foes: [[20, 6, "imp"]] },
    /* 13 Tide knot — pad maze */
    { name: "Exchange", rank: 2, rooms: [[2, 2, 8, 8], [11, 2, 8, 8], [20, 2, 8, 8], [2, 16, 8, 8], [11, 16, 8, 8], [20, 16, 8, 8]],
      start: [4, 4], exit: [24, 20],
      pads: [[5, 6, 24, 6], [15, 6, 5, 20], [24, 4, 15, 20]],
      gens: [[14, 4, "wraith"], [4, 18, "imp"], [24, 18, "hurler"]],
      items: [[12, 18, "food"], [14, 18, "vial"], [22, 4, "flask"], [6, 18, "reflect"]],
      foes: [[14, 18, "thief"]] },
    /* 14 Tide seal */
    { name: "Salt Seal", rank: 2, seal: true, drain: true,
      rooms: [[3, 3, 24, 6], [3, 17, 24, 6], [3, 3, 6, 20], [21, 3, 6, 20]],
      start: [5, 5], exit: [25, 20],
      pads: [[5, 19, 25, 5], [16, 5, 16, 19]],
      gens: [[8, 5, "imp"], [16, 5, "hurler"], [8, 19, "wraith"], [22, 19, "shade"]],
      items: [[6, 6, "food"], [24, 6, "vial"], [6, 20, "flask"], [18, 19, "chest"]],
      foes: [[16, 12, "imp"]], boss: [[16, 12, "levi"]] },

    /* 15 Gold approach — chests and a clock */
    { name: "Tithe", rank: 2, treasure: 40, rooms: [[2, 2, 26, 22]],
      start: [4, 4], exit: [25, 21],
      gens: [[8, 8, "brute"], [22, 8, "brute"], [8, 18, "wraith"], [22, 18, "imp"]],
      items: [[12, 6, "chest"], [16, 6, "chest"], [12, 12, "chest"], [16, 12, "flask"], [14, 18, "vial"], [20, 12, "poison"], [6, 12, "food"]],
      foes: [[14, 10, "thief"]], lore: "Thirty-odd seconds. Take the gold. Leave through the far light." },
    /* 16 Gold knot */
    { name: "Ledger Room", rank: 3, rooms: [[2, 8, 8, 10], [11, 2, 8, 8], [20, 8, 8, 10], [11, 16, 8, 8]],
      halls: [[9, 12, 11, 12], [18, 12, 20, 12], [14, 9, 14, 16]],
      start: [4, 12], exit: [24, 12], doors: [[18, 12]],
      gens: [[14, 4, "wraith"], [4, 10, "brute"], [24, 10, "imp"], [14, 18, "shade"]],
      items: [[6, 10, "key"], [14, 6, "chest"], [22, 14, "chest"], [14, 20, "vial"], [6, 14, "food"], [14, 18, "core"]],
      foes: [[14, 12, "thief"]] },
    /* 17 Gold seal */
    { name: "Gilded Seal", rank: 3, seal: true, treasure: 28,
      rooms: [[4, 4, 22, 18]],
      start: [6, 6], exit: [24, 18],
      gens: [[8, 8, "brute"], [22, 8, "imp"], [8, 18, "shade"], [22, 16, "hurler"]],
      items: [[14, 6, "chest"], [16, 6, "chest"], [14, 20, "chest"], [12, 12, "vial"], [18, 12, "poison"], [10, 12, "flask"]],
      foes: [[15, 12, "thief"], [16, 14, "thief"]], boss: [[15, 10, "tithe"]], drain: true },

    /* 18 Void approach — scarce food, drain */
    { name: "Unnaming", rank: 3, drain: true,
      rooms: [[2, 2, 8, 22], [20, 2, 8, 22], [8, 11, 14, 5]],
      halls: [[9, 13, 20, 13]],
      start: [4, 20], exit: [24, 4],
      gens: [[4, 4, "shade"], [24, 20, "wraith"], [14, 13, "imp"]],
      items: [[5, 18, "food"], [22, 18, "vial"], [6, 6, "veil"]],
      foes: [[4, 12, "shade"], [24, 12, "wraith"]], traps: [[10, 13], [18, 13]] },
    /* 19 Void knot */
    { name: "Quiet Book", rank: 3, drain: true,
      rooms: [[4, 4, 22, 6], [4, 16, 22, 6], [12, 8, 6, 10]],
      start: [6, 6], exit: [24, 18], doors: [[12, 10], [17, 16]],
      gens: [[8, 6, "shade"], [22, 6, "hurler"], [8, 18, "imp"], [22, 18, "wraith"]],
      items: [[14, 12, "key"], [15, 12, "key"], [6, 18, "vial"], [16, 6, "food"]],
      foes: [[14, 6, "shade"]] },
    /* 20 Void seal */
    { name: "Black Seal", rank: 3, seal: true, drain: true,
      rooms: [[2, 2, 26, 22]], inner: [[8, 7, 14, 12]],
      start: [4, 4], exit: [15, 12],
      gens: [[4, 12, "shade"], [25, 12, "shade"], [15, 4, "imp"], [15, 21, "hurler"]],
      items: [[6, 6, "vial"], [24, 6, "vial"], [6, 20, "flask"], [24, 20, "food"]],
      foes: [[10, 4, "wraith"], [20, 21, "brute"]], boss: [[15, 10, "unnamer"]], lore: "Two vials. One Drain. The seal will not lift while nexuses live." },

    /* 21 Lattice approach */
    { name: "Four Names", rank: 3, rooms: [[2, 2, 12, 10], [16, 2, 12, 10], [2, 14, 12, 10], [16, 14, 12, 10]],
      halls: [[13, 6, 16, 6], [13, 18, 16, 18], [7, 11, 7, 14], [22, 11, 22, 14]],
      start: [4, 6], exit: [24, 18],
      gens: [[8, 4, "imp"], [22, 4, "hurler"], [8, 18, "shade"], [22, 20, "wraith"]],
      items: [[6, 8, "food"], [24, 8, "vial"], [6, 20, "codex"], [24, 16, "aegis"]],
      foes: [[12, 6, "brute"], [18, 18, "shade"]], drain: true },
    /* 22 Lattice knot — pads + seal-like doors */
    { name: "Geodesic", rank: 3, rooms: [[2, 2, 8, 8], [20, 2, 8, 8], [2, 16, 8, 8], [20, 16, 8, 8], [11, 9, 8, 8]],
      start: [4, 4], exit: [24, 20], doors: [[11, 12], [18, 12]],
      pads: [[5, 6, 24, 6], [5, 20, 24, 4]],
      gens: [[6, 4, "imp"], [24, 4, "shade"], [6, 18, "hurler"], [14, 12, "wraith"]],
      items: [[4, 8, "key"], [22, 8, "key"], [14, 10, "vial"], [14, 14, "food"], [22, 18, "reflect"]],
      foes: [[14, 11, "shade"]], drain: true },
    /* 23 Lattice finale */
    { name: "The Last Geometry", rank: 3, seal: true, drain: true,
      rooms: [[3, 3, 24, 20]],
      start: [5, 18], exit: [15, 6],
      gens: [[6, 6, "imp"], [24, 6, "hurler"], [6, 16, "shade"], [24, 16, "wraith"], [15, 12, "brute"]],
      items: [[8, 18, "vial"], [10, 18, "vial"], [20, 18, "flask"], [22, 18, "food"], [15, 16, "chest"], [12, 8, "codex"]],
      foes: [[15, 10, "thief"], [10, 12, "shade"], [20, 12, "imp"]], boss: [[15, 10, "lock"]],
      lore: "Hold the door. The crypt is a lock. You are the last four teeth." }
  ];

  function fill(tiles, x, y, w, h, v) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (tiles[yy] && tiles[yy][xx] !== undefined) tiles[yy][xx] = v;
      }
    }
  }
  function tunnel(tiles, x1, y1, x2, y2, wide) {
    let x = x1, y = y1;
    const carve = (cx, cy) => {
      if (tiles[cy]) tiles[cy][cx] = "floor";
      if (!wide) return;
      if (x1 === x2) {
        if (tiles[cy] && tiles[cy][cx - 1] === "wall") tiles[cy][cx - 1] = "floor";
      } else if (tiles[cy - 1] && tiles[cy - 1][cx] === "wall") tiles[cy - 1][cx] = "floor";
    };
    while (x !== x2) { carve(x, y); x += x < x2 ? 1 : -1; }
    while (y !== y2) { carve(x, y); y += y < y2 ? 1 : -1; }
    carve(x2, y2);
  }
  function onHall(d, h) {
    const x1 = h[0], y1 = h[1], x2 = h[2], y2 = h[3];
    if (x1 === x2) return d[0] === x1 && d[1] >= Math.min(y1, y2) && d[1] <= Math.max(y1, y2);
    if (y1 === y2) return d[1] === y1 && d[0] >= Math.min(x1, x2) && d[0] <= Math.max(x1, x2);
    return false;
  }

  function build(i, makeFoe) {
    const spec = FLOORS[i];
    const ch = CHAPTERS[(i / 3) | 0];
    const W = 30, H = 26;
    const tiles = Array.from({ length: H }, () => Array(W).fill("wall"));
    (spec.rooms || []).forEach((r) => fill(tiles, r[0], r[1], r[2], r[3], "floor"));
    const doorPts = (spec.doors || []);
    (spec.halls || []).forEach((h) => {
      const wide = !doorPts.some((d) => onHall(d, h));
      tunnel(tiles, h[0], h[1], h[2], h[3], wide);
    });
    (spec.rooms || []).forEach((r) => {
      if (r[2] < 10 || r[3] < 8) return;
      const inset = 2;
      const spots = [
        [r[0] + inset, r[1] + inset], [r[0] + r[2] - 1 - inset, r[1] + inset],
        [r[0] + inset, r[1] + r[3] - 1 - inset], [r[0] + r[2] - 1 - inset, r[1] + r[3] - 1 - inset]
      ];
      spots.forEach((p) => {
        if (!tiles[p[1]] || tiles[p[1]][p[0]] !== "floor") return;
        const s = spec.start, e = spec.exit;
        if (Math.abs(p[0] - s[0]) + Math.abs(p[1] - s[1]) < 3) return;
        if (Math.abs(p[0] - e[0]) + Math.abs(p[1] - e[1]) < 3) return;
        tiles[p[1]][p[0]] = "wall";
      });
    });
    (spec.pillars || []).forEach((p) => {
      if (tiles[p[1]]) tiles[p[1]][p[0]] = "wall";
    });
    if (spec.inner) spec.inner.forEach((r) => {
      const x = r[0], y = r[1], w = r[2], h = r[3];
      for (let xx = x; xx < x + w; xx++) {
        if (tiles[y]) tiles[y][xx] = "wall";
        if (tiles[y + h - 1]) tiles[y + h - 1][xx] = "wall";
      }
      for (let yy = y; yy < y + h; yy++) {
        if (!tiles[yy]) continue;
        tiles[yy][x] = "wall";
        tiles[yy][x + w - 1] = "wall";
      }
    });
    for (let x = 0; x < W; x++) { tiles[0][x] = "wall"; tiles[H - 1][x] = "wall"; }
    for (let y = 0; y < H; y++) { tiles[y][0] = "wall"; tiles[y][W - 1] = "wall"; }

    function isOpen(x, y) {
      const t = tiles[y] && tiles[y][x];
      return t === "floor" || t === "pad" || t === "exit" || t === "exit_lock" || t === "door_open";
    }
    function snap(x, y) {
      x = x | 0; y = y | 0;
      if (isOpen(x, y)) return { x, y };
      for (let r = 1; r < 10; r++) {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nx = x + dx, ny = y + dy;
          if (isOpen(nx, ny)) return { x: nx, y: ny };
        }
      }
      return { x: Math.max(1, Math.min(W - 2, x)), y: Math.max(1, Math.min(H - 2, y)) };
    }
    const doorList = (spec.doors || []).map((d) => [d[0], d[1]]);
    if (spec.inner) spec.inner.forEach((r) => {
      const x = r[0], y = r[1], w = r[2], hgt = r[3];
      const hasDoor = doorList.some((d) =>
        d[0] >= x && d[0] < x + w && d[1] >= y && d[1] < y + hgt &&
        (d[0] === x || d[0] === x + w - 1 || d[1] === y || d[1] === y + hgt - 1)
      );
      if (hasDoor) return;
      const sx = spec.start[0], sy = spec.start[1];
      const cx = x + (w >> 1), cy = y + (hgt >> 1);
      const dx = cx - sx, dy = cy - sy;
      let px, py;
      if (Math.abs(dx) > Math.abs(dy)) { px = dx < 0 ? x : x + w - 1; py = cy; }
      else { px = cx; py = dy < 0 ? y : y + hgt - 1; }
      doorList.push([px, py]);
    });

    const items = [];
    const gens = [];
    const foes = [];
    const doors = [];
    const pads = [];
    const rank = spec.rank || 1;
    doorList.forEach((d) => {
      const x = d[0] | 0, y = d[1] | 0;
      if (!tiles[y] || tiles[y][x] === undefined) return;
      tiles[y][x] = "door";
      doors.push({ x, y });
    });
    (spec.pads || []).forEach((p) => {
      const a = snap(p[0], p[1]), b = snap(p[2], p[3]);
      tiles[a.y][a.x] = "pad"; tiles[b.y][b.x] = "pad";
      pads.push({ x: a.x, y: a.y, tx: b.x + 0.5, ty: b.y + 0.5 });
      pads.push({ x: b.x, y: b.y, tx: a.x + 0.5, ty: a.y + 0.5 });
    });
    (spec.gens || []).forEach((g) => {
      const p = snap(g[0], g[1]);
      gens.push({ x: p.x, y: p.y, kind: g[2], rank, hp: 3 * rank, t: 0.2 });
    });
    (spec.items || []).forEach((it) => {
      const p = snap(it[0], it[1]);
      items.push({ x: p.x, y: p.y, kind: it[2] });
    });
    (spec.hidden || []).forEach((it) => {
      const p = snap(it[0], it[1]);
      items.push({ x: p.x, y: p.y, kind: it[2], hidden: true });
    });
    (spec.traps || []).forEach((t) => {
      const p = snap(t[0], t[1]);
      items.push({ x: p.x, y: p.y, kind: "trap" });
    });
    (spec.foes || []).forEach((f) => {
      const p = snap(f[0], f[1]);
      foes.push(makeFoe(f[2], rank, p.x + 0.5, p.y + 0.5));
    });
    (spec.boss || []).forEach((b) => {
      const p = snap(b[0], b[1]);
      foes.push(makeFoe(b[2], rank, p.x + 0.5, p.y + 0.5));
    });
    const start = snap(spec.start[0], spec.start[1]);
    const exit = snap(spec.exit[0], spec.exit[1]);
    tiles[start.y][start.x] = "floor";
    if (spec.seal) tiles[exit.y][exit.x] = "exit_lock";
    else tiles[exit.y][exit.x] = "exit";
    if (spec.drain) foes.push(makeFoe("drain", 1, exit.x + 0.5, exit.y + 0.5));

    const built = {
      W, H, tiles, start, exit, items, gens, foes, doors, pads,
      realm: { id: ["stone", "frost", "ember", "root", "tide", "gold", "void", "lattice"][ch.realm],
        name: ch.title, floor: ["floor", "floor2", "floor3", "floor", "floor2", "floor3", "floor2", "floor"][ch.realm],
        wall: ["wall", "wall2", "wall3", "wall", "wall2", "wall3", "wall4", "wall4"][ch.realm] },
      layout: spec.name,
      lore: spec.lore || ch.lore,
      chapter: ch.title,
      seal: !!spec.seal,
      treasure: spec.treasure || 0,
      quiet: 0,
      campaign: true,
      index: i
    };
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (tiles[y][x] === "wall") continue;
      if (x < x0) x0 = x; if (y < y0) y0 = y;
      if (x > x1) x1 = x; if (y > y1) y1 = y;
    }
    built.box = { x0, y0, x1, y1 };
    return built;
  }

  return { CHAPTERS, FLOORS, LEN: FLOORS.length, build };
})();
