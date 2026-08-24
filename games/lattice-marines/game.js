/* Lattice Marines — isometric three-phase island war. Local AI, fog, campaign. */
(() => {
  let MAP = 48;
  const TW = 72, TH = 36;
  const MAP_SIZES = [
    { n: 32, label: "32×32 Raid" },
    { n: 40, label: "40×40 Theatre" },
    { n: 48, label: "48×48 Campaign" },
    { n: 64, label: "64×64 Archipelago" },
    { n: 80, label: "80×80 Vast war" }
  ];
  const SAVE = "lygo_lattice_marines_v1";
  const ASSET = "./assets/";

  const SPR_FILES = {
    plains: "tile-plains.png", hills: "tile-hills.png", forest: "tile-forest.png",
    water: "tile-water.png", ruins: "tile-ruins.png", fog: "tile-fog.png",
    "tex-plains": "tex-plains.jpg", "tex-hills": "tex-hills.jpg", "tex-forest": "tex-forest.jpg",
    "tex-water": "tex-water.jpg", "tex-ruins": "tex-ruins.jpg", "tex-fog": "tex-fog.jpg",
    hq: "b-hq.png", energy: "b-energy.png", econ: "b-econ.png", factory: "b-factory.png",
    radar: "b-radar.png", gun: "b-gun.png", aa: "b-aa.png", mine: "b-mine.png",
    shield: "b-shield.png", emp: "b-emp.png", fake: "b-fake.png", silo: "b-silo.png",
    icbm: "b-icbm.png", hangar: "b-hangar.png", sat: "b-sat.png",
    marine: "u-marine.png", scout: "u-scout.png", tank: "u-tank.png", jet: "u-jet.png",
    missile: "fx-missile.png", boom: "fx-boom.png"
  };

  const BLD = {
    hq:      { name: "Command Centre", cost: 0, hp: 240, pwr: 0, cat: "core", spr: "hq",
               desc: "Lose all three and the island falls." },
    energy:  { name: "Energy Plant", cost: 120, hp: 85, pwr: -2, cat: "economy", spr: "energy",
               desc: "+2 power and +1 fuel each turn." },
    econ:    { name: "Economic Centre", cost: 150, hp: 75, pwr: 1, cat: "economy", spr: "econ",
               desc: "+90 credits each turn (more on hills)." },
    factory: { name: "Factory", cost: 200, hp: 110, pwr: 1, cat: "production", spr: "factory",
               desc: "Train Marines and scouts on adjacent tiles." },
    hangar:  { name: "Marine Hangar", cost: 240, hp: 120, pwr: 1, cat: "production", spr: "hangar",
               desc: "Drop autonomous Lattice Marines across the fog." },
    relay:   { name: "Command Relay", cost: 160, hp: 70, pwr: 1, cat: "core", spr: "emp",
               desc: "Extends your build radius. If wrecked, repair it or that ground goes dark." },
    radar:   { name: "Radar Tower", cost: 180, hp: 65, pwr: 1, cat: "intel", spr: "radar",
               desc: "Reveals a scan disc on the enemy half each turn." },
    sat:     { name: "Spy Satellite", cost: 520, hp: 55, pwr: 3, cat: "intel", spr: "sat", unlock: "sat",
               desc: "Reveal the whole map for 1 turn. Cooldown 4." },
    gun:     { name: "Gun Pod", cost: 100, hp: 95, pwr: 0, cat: "defense", spr: "gun",
               desc: "Auto-fires on nearby ground units." },
    aa:      { name: "AA Launcher", cost: 160, hp: 75, pwr: 1, cat: "defense", spr: "aa",
               desc: "Intercepts missiles, drops, and jets that fall inside its range (7+Mk, +2 on hills)." },
    mine:    { name: "Minefield", cost: 55, hp: 28, pwr: 0, cat: "defense", spr: "mine",
               desc: "Damages the first ground unit that steps in." },
    shield:  { name: "Shield Generator", cost: 280, hp: 80, pwr: 1, cat: "defense", spr: "shield", unlock: "shield",
               desc: "Absorbs missile splash in radius 2 (charges = 2)." },
    emp:     { name: "EMP Tower", cost: 300, hp: 70, pwr: 2, cat: "defense", spr: "emp", unlock: "emp",
               desc: "Queue an EMP to silence electronics 1 turn." },
    fake:    { name: "Decoy HQ", cost: 80, hp: 42, pwr: 0, cat: "decoy", spr: "fake",
               desc: "Looks like a command centre until it detonates." },
    silo:    { name: "Missile Silo", cost: 220, hp: 90, pwr: 1, cat: "offense", spr: "silo",
               desc: "One cruise missile per silo, per salvo." },
    icbm:    { name: "ICBM Silo", cost: 420, hp: 95, pwr: 2, cat: "offense", spr: "icbm", unlock: "icbm",
               desc: "One ICBM per silo, per salvo. Costly. Interceptable." }
  };

  const WPN = {
    probe:     { name: "Probe shot", cost: 25, fuel: 0, dmg: 10, r: 0, reveal: 1,
                 desc: "Battleship ping — 3×3. Limited: 2 + radars per salvo." },
    missile:   { name: "Cruise missile", cost: 90, fuel: 2, dmg: 52, r: 1, need: "silo",
                 desc: "One shot per live Missile Silo." },
    icbm:      { name: "ICBM", cost: 190, fuel: 6, dmg: 135, r: 2, need: "icbm",
                 desc: "One shot per live ICBM Silo. Huge crater." },
    drop:      { name: "Marine drop", cost: 75, fuel: 3, need: "hangar", spawn: "marine",
                 desc: "One drop per hangar (shared with tanks/airstrike)." },
    tankdrop:  { name: "Tank drop", cost: 150, fuel: 4, need: "hangar", spawn: "tank", unlock: "tank",
                 desc: "Uses that hangar’s one launch this salvo." },
    scout:     { name: "Scout run", cost: 55, fuel: 2, need: "factory", spawn: "scout", unlock: "scout",
                 desc: "One scout per live Factory." },
    airstrike: { name: "Airstrike", cost: 170, fuel: 4, dmg: 78, r: 1, need: "hangar", unlock: "airstrike",
                 desc: "Uses a hangar launch. AA can intercept." },
    emp:       { name: "EMP pulse", cost: 85, fuel: 2, need: "emp", emp: true, unlock: "emp",
                 desc: "One pulse per live EMP Tower." },
    sat:       { name: "Satellite pass", cost: 40, fuel: 3, need: "sat", unlock: "sat", sat: true,
                 desc: "Paint the whole enemy half. Cooldown 4 turns." }
  };

  const UNIT = {
    marine: { name: "Lattice Marine", hp: 42, dmg: 14, mdmg: 20, range: 1, move: 1 },
    scout:  { name: "Scout", hp: 24, dmg: 0, mdmg: 0, range: 0, move: 2, reveal: true },
    tank:   { name: "Tank", hp: 95, dmg: 30, mdmg: 22, range: 2, move: 1 }
  };

  const PROFILES = ["Aggressor", "Turtle", "Economist", "Intelligence"];
  const DIFF = {
    easy:   { label: "Easy",   eco: 0.82, aim: 0.7,  aa: 0.32, switch: 0 },
    normal: { label: "Normal", eco: 1.00, aim: 0.85, aa: 0.42, switch: 0.15 },
    hard:   { label: "Hard",   eco: 1.22, aim: 1.00, aa: 0.52, switch: 0.35 },
    insane: { label: "Insane", eco: 1.45, aim: 1.12, aa: 0.6,  switch: 0.55 }
  };

  const SPR = {};
  const PAT = {};
  const $ = (id) => document.getElementById(id);
  const canvas = () => $("iso");
  const ctxOf = () => canvas().getContext("2d");

  let cam = { x: 0, y: 0, z: 1 };
  let S = null;
  let hover = null, sel = null, tool = null, weapon = null;
  let dragging = false, lastM = null, downPt = null, didDrag = false;
  let tFrame = 0, raf = 0;
  let overlayMode = "menu";
  let enemyTimer = 0;

  const persist = {
    name: "Commander",
    unlocks: {},
    pts: 0,
    wins: 0,
    campaign: 1,
    prestige: 0,
    best: 0,
    mapN: 48,
    board: []
  };

  function loadPersist() {
    try {
      const j = JSON.parse(localStorage.getItem(SAVE) || "null");
      if (j) Object.assign(persist, j);
    } catch (_) {}
  }
  function savePersist() {
    localStorage.setItem(SAVE, JSON.stringify(persist));
  }

  function hashSeed(s) {
    let h = 2166136261;
    const str = String(s);
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function inB(x, y) { return x >= 0 && y >= 0 && x < MAP && y < MAP; }
  function dist(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
  function euclid(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function worldIso(x, y) {
    return { sx: (x - y) * (TW / 2), sy: (x + y) * (TH / 2) };
  }
  function iso(x, y) {
    const w = worldIso(x, y);
    return { sx: cam.x + w.sx * cam.z, sy: cam.y + w.sy * cam.z };
  }
  function pickTile(mx, my) {
    const rx = (mx - cam.x) / cam.z;
    const ry = (my - cam.y) / cam.z;
    const x = (rx / (TW / 2) + ry / (TH / 2)) / 2;
    const y = (ry / (TH / 2) - rx / (TW / 2)) / 2;
    return { x: Math.round(x), y: Math.round(y) };
  }

  function genMap(seed) {
    const R = rng(seed >>> 0);
    const tiles = Array.from({ length: MAP }, () => Array(MAP).fill("water"));
    const n2 = (x, y, salt) => {
      let n = (Math.imul(x + 13, 374761393) ^ Math.imul(y + 17, 668265263) ^ Math.imul(salt ^ seed, 1274126177)) >>> 0;
      n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
      return (n & 0xffff) / 65535;
    };
    const fbm = (x, y, salt) =>
      n2(x, y, salt) * 0.5 + n2((x / 2) | 0, (y / 2) | 0, salt + 3) * 0.35 + n2((x / 4) | 0, (y / 4) | 0, salt + 9) * 0.15;
    const ellipse = (cx, cy, rx, ry, salt, thresh) => {
      for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        const d = Math.hypot(dx, dy) + (fbm(x, y, salt) - 0.5) * 0.85;
        if (d < thresh) tiles[y][x] = "plains";
      }
    };
    const south = {
      cx: MAP * (0.38 + R() * 0.4),
      cy: MAP * (0.60 + R() * 0.24),
      rx: MAP * (0.16 + R() * 0.18),
      ry: MAP * (0.14 + R() * 0.16)
    };
    const north = {
      cx: MAP * (0.18 + R() * 0.42),
      cy: MAP * (0.12 + R() * 0.24),
      rx: MAP * (0.16 + R() * 0.18),
      ry: MAP * (0.14 + R() * 0.16)
    };
    ellipse(south.cx, south.cy, south.rx, south.ry, 11, 0.92 + R() * 0.18);
    ellipse(north.cx, north.cy, north.rx, north.ry, 23, 0.92 + R() * 0.18);
    if (R() > 0.35) {
      ellipse(south.cx + (R() - 0.5) * MAP * 0.22, south.cy - R() * MAP * 0.08, south.rx * 0.55, south.ry * 0.5, 31, 0.9);
    }
    if (R() > 0.35) {
      ellipse(north.cx + (R() - 0.5) * MAP * 0.22, north.cy + R() * MAP * 0.08, north.rx * 0.55, north.ry * 0.5, 41, 0.9);
    }
    const extras = MAP >= 64 ? 2 + (R() > 0.5 ? 1 : 0) : (MAP >= 40 && R() > 0.4 ? 1 : 0);
    for (let i = 0; i < extras; i++) {
      ellipse(MAP * (0.2 + R() * 0.6), MAP * (0.35 + R() * 0.3), MAP * (0.06 + R() * 0.08), MAP * (0.05 + R() * 0.07), 50 + i * 7, 0.88);
    }
    const countHalf = (southSide) => {
      let n = 0;
      for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
        if (tiles[y][x] === "water") continue;
        if ((y >= MAP / 2) === southSide) n++;
      }
      return n;
    };
    const minLand = Math.round(MAP * 1.8);
    if (countHalf(true) < minLand) ellipse(MAP * 0.55, MAP * 0.78, MAP * 0.22, MAP * 0.18, 71, 1.05);
    if (countHalf(false) < minLand) ellipse(MAP * 0.45, MAP * 0.22, MAP * 0.22, MAP * 0.18, 81, 1.05);
    const hillAmt = 0.08 + R() * 0.1;
    const forestAmt = 0.16 + R() * 0.14;
    const ruinAmt = 0.04 + R() * 0.08;
    for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
      if (tiles[y][x] === "water") continue;
      const h = fbm(x, y, 101);
      const f = fbm(x + 9, y - 4, 202);
      if (h > 1 - hillAmt) tiles[y][x] = "hills";
      else if (f > 1 - forestAmt) tiles[y][x] = "forest";
      else if (n2(x, y, 303) < ruinAmt) tiles[y][x] = "ruins";
    }
    return tiles;
  }

  function onHome(owner, x, y) {
    if (!inB(x, y)) return false;
    const south = y >= MAP / 2;
    return owner === 0 ? south : !south;
  }
  function landTiles(owner) {
    const out = [];
    for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
      if (S.tiles[y][x] === "water") continue;
      if (onHome(owner, x, y)) out.push({ x, y });
    }
    return out;
  }

  function occupied(x, y) {
    return S.buildings.some((b) => b.x === x && b.y === y && (b.hp > 0 || b.wrecked))
      || S.units.some((u) => u.x === x && u.y === y && u.hp > 0);
  }

  function buildingAt(x, y) { return S.buildings.find((b) => b.x === x && b.y === y && (b.hp > 0 || b.wrecked)); }
  function unitAt(x, y) { return S.units.find((u) => u.x === x && u.y === y && u.hp > 0); }
  function countB(type, owner) {
    return S.buildings.filter((b) => b.owner === owner && b.type === type && b.hp > 0).length;
  }
  function hqCount(owner) {
    return S.buildings.filter((b) => b.owner === owner && b.type === "hq" && b.hp > 0).length;
  }
  function me() { return S && S.actor != null ? S.actor : 0; }
  function unlocked(key) {
    if (!key) return true;
    return !!persist.unlocks[key] || persist.wins >= unlockWins(key);
  }
  function unlockWins(k) {
    return { scout: 1, tank: 2, shield: 2, icbm: 3, emp: 4, airstrike: 5, sat: 6 }[k] || 0;
  }

  function powerOf(owner) {
    let p = 0;
    for (const b of S.buildings) {
      if (b.owner !== owner || b.hp <= 0 || b.wrecked) continue;
      p -= BLD[b.type].pwr * (b.offline ? 0 : 1);
    }
    return p;
  }

  function newMatch(opts) {
    opts = opts || {};
    if (!DIFF[opts.diff]) opts.diff = "normal";
    const size = Number(opts.mapN) || persist.mapN || 48;
    MAP = MAP_SIZES.some((m) => m.n === size) ? size : 48;
    persist.mapN = MAP;
    const seed = ((opts.seed != null && opts.seed !== "") ? (Number(opts.seed) >>> 0) : ((Math.random() * 0xFFFFFFFF) >>> 0)) || ((Math.random() * 0xFFFFFFFF) >>> 0);
    const R = rng(seed);
    const purse = Math.round(700 + MAP * 6);
    S = {
      seed, R, mapN: MAP,
      tiles: genMap(seed),
      buildings: [],
      units: [],
      fog: [grid(false), grid(false)],
      lastSeen: [grid(null), grid(null)],
      fogAge: [grid(0), grid(0)],
      players: [
        { credits: purse, fuel: 8, emp: 0, satCD: 0, stats: zeroStats() },
        { credits: (opts.mode === "hotseat") ? purse : Math.round(purse * DIFF[opts.diff].eco * (1 + (opts.campaign - 1) * 0.12)),
          fuel: 8, emp: 0, satCD: 0, stats: zeroStats() }
      ],
      phase: "deploy",
      turn: 1,
      campaign: opts.campaign,
      diff: opts.diff,
      mode: opts.mode || "ai",
      ai: { profile: PROFILES[Math.floor(R() * PROFILES.length)], switches: 0 },
      actor: 0,
      queue: [],
      events: [],
      fx: [],
      t: 0,
      over: null,
      score: 0,
      log: [],
      uid: 1
    };
    if (S.mode !== "hotseat") placeHQs(1, R);
    requestAnimationFrame(() => { if (S) focusHomeLand(0); });
    log(`${MAP}×${MAP} theatre. ${S.mode === "hotseat" ? "Southern commander: " : ""}Place your 3 Command Centres — cluster them or spread them.`);
    sel = null; tool = "hq"; weapon = null;
    overlayMode = null;
    hideOverlay();
    paintUI();
    $("app").classList.remove("hidden");
  }

  function zeroStats() {
    return { bKill: 0, uKill: 0, spent: 0, income: 0 };
  }

  function grid(v) { return Array.from({ length: MAP }, () => Array(MAP).fill(v)); }

  function placeHQs(owner, R) {
    const land = landTiles(owner).filter((t) => S.tiles[t.y][t.x] === "plains" || S.tiles[t.y][t.x] === "ruins");
    land.sort((a, b) => (owner === 0 ? b.y - a.y : a.y - b.y));
    const picks = [];
    for (const t of land) {
      if (picks.length >= 3) break;
      if (picks.some((p) => dist(p, t) < 6)) continue;
      if (S.tiles[t.y][t.x] === "water") continue;
      picks.push(t);
    }
    while (picks.length < 3 && land.length) {
      const t = land[Math.floor(R() * land.length)];
      if (!picks.some((p) => p.x === t.x && p.y === t.y)) picks.push(t);
    }
    if (!land.length) return;
    for (const t of picks.slice(0, 3)) spawnB("hq", owner, t.x, t.y);
  }

  function spawnB(type, owner, x, y, lvl = 1) {
    const def = BLD[type];
    const b = {
      id: S.uid++, type, owner, x, y, lvl,
      hp: def.hp + (lvl - 1) * 25, max: def.hp + (lvl - 1) * 25,
      charges: type === "shield" ? 2 : 0,
      cd: 0, fake: type === "fake", offline: false, wrecked: false
    };
    S.buildings.push(b);
    return b;
  }

  function spawnU(type, owner, x, y) {
    const def = UNIT[type];
    const u = { id: S.uid++, type, owner, x, y, hp: def.hp, max: def.hp, vet: 0 };
    S.units.push(u);
    return u;
  }

  function reveal(viewer, x, y, r, opts) {
    r = r || 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const tx = x + dx, ty = y + dy;
      if (!inB(tx, ty)) continue;
      if (opts && opts.disc && Math.hypot(dx, dy) > r + 0.15) continue;
      if (opts && opts.radar && S.tiles[ty][tx] === "forest") continue;
      S.fog[viewer][ty][tx] = true;
      S.fogAge[viewer][ty][tx] = S.turn + 4;
      const b = buildingAt(tx, ty);
      const u = unitAt(tx, ty);
      S.lastSeen[viewer][ty][tx] = {
        terr: S.tiles[ty][tx],
        b: b && b.owner !== viewer ? { type: b.fake ? "hq" : b.type, hp: b.hp } : null,
        u: u && u.owner !== viewer ? { type: u.type } : null
      };
    }
  }

  function visible(viewer, x, y) {
    if (!inB(x, y)) return false;
    if (onHome(viewer, x, y)) return true;
    return !!S.fog[viewer][y][x];
  }

  function hasMemory(viewer, x, y) {
    const ls = S.lastSeen[viewer][y] && S.lastSeen[viewer][y][x];
    return !!(ls && ls.terr);
  }

  function projectRadar(radar, owner) {
    const mx = radar.x;
    const my = MAP - 1 - radar.y;
    const land = landTiles(1 - owner);
    if (!land.length) return { x: mx, y: Math.max(0, Math.min(MAP - 1, my)) };
    let best = land[0], bd = 1e9;
    for (const t of land) {
      const d = Math.abs(t.x - mx) * 2 + Math.abs(t.y - my);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  function radarSweep(owner) {
    const radars = S.buildings.filter((b) => b.owner === owner && b.type === "radar" && b.hp > 0 && !b.offline);
    for (const r of radars) {
      const scan = projectRadar(r, owner);
      reveal(owner, scan.x, scan.y, 3 + r.lvl, { radar: true, disc: true });
    }
  }

  function tickEconomy(first) {
    for (const o of [0, 1]) {
      const p = S.players[o];
      let inc = 40;
      for (const b of S.buildings) {
        if (b.owner !== o || b.hp <= 0 || b.offline || b.wrecked) continue;
        if (b.type === "econ") {
          const hill = S.tiles[b.y][b.x] === "hills" ? 20 : 0;
          inc += 90 + (b.lvl - 1) * 25 + hill;
        }
        if (b.type === "energy") p.fuel = Math.min(24, p.fuel + 1 + (b.lvl - 1));
        if (b.cd > 0) b.cd--;
      }
      if (S.players[o].satCD > 0) S.players[o].satCD--;
      if (!first) {
        p.credits += inc;
        p.stats.income += inc;
      }
      const need = S.buildings.filter((b) => b.owner === o && b.hp > 0 && BLD[b.type].pwr > 0)
        .reduce((a, b) => a + BLD[b.type].pwr, 0);
      const have = S.buildings.filter((b) => b.owner === o && b.hp > 0 && b.type === "energy")
        .reduce((a, b) => a + 2 * b.lvl, 0);
      const ok = have >= need;
      for (const b of S.buildings) {
        if (b.owner !== o) continue;
        if (BLD[b.type].pwr > 0) b.offline = !ok && S.turn > 1;
      }
    }
  }

  function canAfford(owner, cred, fuel) {
    const p = S.players[owner];
    return p.credits >= cred && p.fuel >= fuel;
  }
  function pay(owner, cred, fuel) {
    S.players[owner].credits -= cred;
    S.players[owner].fuel -= fuel;
    S.players[owner].stats.spent += cred;
  }

  function canBuild(type, owner, x, y) {
    if (!inB(x, y) || S.tiles[y][x] === "water") return "Need land.";
    if (!onHome(owner, x, y)) return "Build only on your half.";
    if (occupied(x, y)) return "Tile occupied.";
    if (!unlocked(BLD[type].unlock)) return "Locked.";
    if (S.players[owner].credits < BLD[type].cost) return "Not enough credits.";
    const terrErr = terrainAllows(type, S.tiles[y][x]);
    if (terrErr) return terrErr;
    if (type === "hq") {
      if (S.phase !== "deploy") return "Command centres are already locked in.";
      if (countB("hq", owner) >= 3) return "All 3 command centres are placed. Pick one up to move it.";
      return null;
    }
    if (S.phase === "deploy") return "Lock your 3 HQs first.";
    if (!inBuildNet(owner, x, y)) {
      return "Out of command range. Expand from an HQ or a linked building.";
    }
    return null;
  }

  function reachOf(b) {
    if (b.wrecked || b.hp <= 0) return 0;
    if (b.type === "hq") return 4 + b.lvl;
    if (b.type === "relay") return 8 + 2 * b.lvl;
    return 1;
  }
  function cheb(a, x, y) {
    return Math.max(Math.abs(a.x - x), Math.abs(a.y - y));
  }
  function inBuildNet(owner, x, y) {
    for (const b of S.buildings) {
      if (b.owner !== owner || b.hp <= 0) continue;
      if (cheb(b, x, y) <= reachOf(b)) return true;
    }
    return false;
  }

  function terrainAllows(type, terr) {
    if (terr === "water") return "Need land.";
    if (terr === "hills") {
      if (type === "gun" || type === "aa" || type === "mine") return null;
      return "Mountains: gun pods, AA launchers, and mines only.";
    }
    if (terr === "forest") {
      if (type === "hq" || type === "factory" || type === "hangar" || type === "silo" || type === "icbm" || type === "sat" || type === "econ") {
        return "Forest is too dense. Use plains for HQs and industry. Guns, mines, radar, energy, shields, EMP, AA, decoys OK.";
      }
      return null;
    }
    if (type === "hq" && terr !== "plains" && terr !== "ruins") {
      return "Command centres need plains or ruins.";
    }
    if (type === "relay" && terr === "hills") return "Relays cannot sit on mountains.";
    return null;
  }

  function tryBuild(type, owner, x, y) {
    const err = canBuild(type, owner, x, y);
    if (err) { if (owner === me()) { toast(err); fx("error"); } return false; }
    pay(owner, BLD[type].cost, 0);
    spawnB(type, owner, x, y);
    log(`${owner === 0 ? "You" : "Enemy"} raise a ${BLD[type].name} at ${x},${y}.`);
    if (owner === me()) fx("build");
    return true;
  }

  function tryUpgrade(b) {
    if (!b || b.lvl >= 3) return;
    const cost = Math.round(BLD[b.type].cost * 0.55 * b.lvl);
    if (S.players[b.owner].credits < cost) { toast("Need " + cost + "c to upgrade."); return; }
    pay(b.owner, cost, 0);
    b.lvl++;
    b.max += 25; b.hp += 25;
    log(`Upgrade ${BLD[b.type].name} → Mk${b.lvl}.`);
  }

  function repairCost(b) {
    return Math.max(10, Math.round((BLD[b.type].cost || 80) * 0.25));
  }
  function tryRepair(b) {
    if (!b) return;
    if (!b.wrecked && b.hp >= b.max) { if (b.owner === me()) toast("Already at full integrity."); return; }
    if (b.repairTick) { if (b.owner === me()) toast("Already repairing this turn — 25% per turn."); return; }
    const cost = repairCost(b);
    if (S.players[b.owner].credits < cost) { toast("Need " + cost + "c (25% of build cost) to repair."); return; }
    pay(b.owner, cost, 0);
    const heal = Math.max(1, Math.round(b.max * 0.25));
    b.hp = Math.min(b.max, (b.hp || 0) + heal);
    if (b.hp > 0) b.wrecked = false;
    b.offline = false;
    b.repairTick = true;
    log(`Repair crew on ${BLD[b.type].name} +${heal} HP (${cost}c).`);
    if (b.owner === me()) fx("build");
  }
  function tryBulldoze(b) {
    if (!b || b.owner !== me()) return;
    if (b.type === "hq") { toast("Cannot bulldoze a Command Centre."); fx("error"); return; }
    S.buildings = S.buildings.filter((x) => x.id !== b.id);
    log(`Bulldozed ${BLD[b.type].name}. No salvage.`);
    fx("emp");
    sel = { x: b.x, y: b.y };
  }

  function tryTrain(b, utype) {
    if (!b || (b.type !== "factory" && b.type !== "hangar")) return;
    if (utype === "scout" && !unlocked("scout")) { toast("Scout locked."); return; }
    if (utype === "tank" && !unlocked("tank")) { toast("Tank locked."); return; }
    const cost = utype === "tank" ? 140 : utype === "scout" ? 50 : 70;
    if (S.players[b.owner].credits < cost) { toast("Need credits."); return; }
    const n = neighbors(b.x, b.y).find((t) => inB(t.x, t.y) && S.tiles[t.y][t.x] !== "water" && !occupied(t.x, t.y));
    if (!n) { toast("No free adjacent tile."); return; }
    pay(b.owner, cost, 0);
    spawnU(utype, b.owner, n.x, n.y);
    log(`Trained ${UNIT[utype].name}.`);
  }

  function neighbors(x, y) {
    return [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }];
  }

  function launcherOf(kind) {
    if (kind === "missile") return "silo";
    if (kind === "icbm") return "icbm";
    if (kind === "drop" || kind === "tankdrop" || kind === "airstrike") return "hangar";
    if (kind === "emp") return "emp";
    if (kind === "scout") return "factory";
    return null;
  }
  function livePads(owner, type) {
    return S.buildings.filter((b) => b.owner === owner && b.type === type && b.hp > 0 && !b.wrecked && !b.offline);
  }
  function queuedPads(owner, type) {
    return S.queue.filter((q) => q.owner === owner && launcherOf(q.kind) === type).length;
  }
  function probeCap(owner) {
    return 2 + livePads(owner, "radar").length;
  }
  function shotsLeft(owner, kind) {
    if (kind === "probe") return Math.max(0, probeCap(owner) - S.queue.filter((q) => q.owner === owner && q.kind === "probe").length);
    const type = launcherOf(kind);
    if (!type) return 1;
    return Math.max(0, livePads(owner, type).length - queuedPads(owner, type));
  }
  function claimPad(owner, kind) {
    const type = launcherOf(kind);
    if (!type) return null;
    const used = new Set(S.queue.filter((q) => q.owner === owner && q.pad).map((q) => q.pad));
    return livePads(owner, type).find((b) => !used.has(b.id)) || null;
  }

  function queueStrike(owner, kind, x, y) {
    const w = WPN[kind];
    if (!w) return;
    const fail = (msg) => { if (owner === me()) toast(msg); return false; };
    if (w.unlock && !unlocked(w.unlock)) return fail("Weapon locked.");
    if (kind === "probe" && shotsLeft(owner, "probe") <= 0) return fail("Probe limit this salvo (2 + radars).");
    const pad = claimPad(owner, kind);
    if (launcherOf(kind) && !pad) {
      const t = launcherOf(kind);
      return fail("No free " + BLD[t].name + " this salvo — one shot per live pad.");
    }
    if (w.need && !livePads(owner, w.need).length) return fail("Need a live " + BLD[w.need].name + ".");
    if (!canAfford(owner, w.cost, w.fuel)) return fail("Need credits/fuel.");
    if (w.sat) {
      if (S.players[owner].satCD > 0) return toast("Satellite recharging (" + S.players[owner].satCD + ").");
      pay(owner, w.cost, w.fuel);
      for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
        if (!onHome(owner, x, y)) reveal(owner, x, y, 0);
      }
      S.players[owner].satCD = 4;
      log("Spy satellite paints the theatre.");
      fx("radar");
      paintUI();
      return true;
    }
    if (!inB(x, y)) return;
    if (onHome(owner, x, y)) {
      sel = { x, y };
      toast("Strike the fogged enemy island — not your own.");
      return;
    }
    pay(owner, w.cost, w.fuel);
    S.queue.push({ owner, kind, x, y, pad: pad ? pad.id : null });
    if (w.reveal) reveal(owner, x, y, w.reveal);
    log(`${owner === 0 ? "You" : "Enemy"} queued ${w.name} @ ${x},${y}.`);
    if (owner === me()) fx(w.spawn ? "drop" : (kind === "probe" ? "probe" : "launch"));
    return true;
  }

  function endDeploy() {
    if (S.phase !== "deploy") return;
    if (hqCount(me()) < 3) {
      toast("Place all 3 Command Centres before locking.");
      fx("error");
      return;
    }
    if (S.mode === "hotseat" && S.actor === 0) {
      fx("phase");
      showPass(
        "Hand the keyboard to the northern commander. They place 3 Command Centres on their island — same staging as the south.",
        () => {
          S.actor = 1;
          tool = "hq";
          weapon = null;
          sel = null;
          focusHomeLand(1);
          log("Northern commander — deploy 3 Command Centres.");
          paintUI();
        }
      );
      return;
    }
    const startSouth = S.mode === "hotseat";
    if (startSouth) S.actor = 0;
    tickEconomy(true);
    for (const o of [0, 1]) radarSweep(o);
    S.phase = "defense";
    tool = null; weapon = null;
    fx("phase");
    if (startSouth) {
      showPass("Both command nets are live. Southern commander: fortify first.", () => {
        focusHomeLand(0);
        log("Command net live. Southern commander — Defense.");
        paintUI();
      });
      return;
    }
    log("Command net live. Fortify the island.");
    paintUI();
  }

  function showPass(msg, then) {
    overlayMode = "help";
    showOverlay(`
      <h2>Pass the keyboard</h2>
      <p>${msg}</p>
      <div class="row"><button class="btn gold" id="ok">Ready</button></div>
    `);
    $("ok").onclick = () => {
      hideOverlay();
      overlayMode = null;
      if (then) then();
    };
  }

  function endDefense() {
    if (S.phase !== "defense") return;
    S.phase = "offense";
    tool = null; weapon = "probe";
    log("Offense phase — probe the fog or fire what you built.");
    fx("phase");
    paintUI();
  }

  function endOffense() {
    if (S.phase !== "offense") return;
    startResolve("player");
  }

  function startResolve(who) {
    S.phase = "resolve";
    S.resolveWho = who;
    S.events = [];
    S.t = 0;
    S.fx = S.fx || [];
    const owner = who === "enemy" ? 1 : me();
    const shots = S.queue.filter((q) => q.owner === owner);
    let t = 16;
    for (const q of shots) {
      S.events.push({ at: t, kind: "shot", q });
      t += 36;
    }
    S.events.push({ at: t + 16, kind: "autoguns" });
    S.events.push({ at: t + 40, kind: "march" });
    S.events.push({ at: t + 68, kind: "done" });
    S.queue = S.queue.filter((q) => q.owner !== owner);
    for (const b of S.buildings) b.shotThis = false;
    log(who === "player" ? "Attack execution — watch the sky." : "Enemy salvo incoming.");
    paintUI();
  }

  function stepResolve() {
    if (S.phase !== "resolve") return;
    S.t++;
    const due = S.events.filter((e) => e.at === S.t);
    for (const e of due) {
      if (e.kind === "shot") fireShot(e.q);
      if (e.kind === "autoguns") autoCombat();
      if (e.kind === "march") marchUnits();
      if (e.kind === "done") {
        if (S.fx.some((f) => f.onEnd && f.life > 0)) S.events.push({ at: S.t + 1, kind: "done" });
        else finishResolve();
      }
    }
    S.fx = S.fx.filter((f) => {
      f.life--;
      if (f.life > 0) return true;
      if (typeof f.onEnd === "function") f.onEnd();
      return false;
    });
  }

  function aaCovering(defender, tx, ty) {
    return S.buildings.filter((b) => {
      if (b.owner !== defender || b.type !== "aa" || b.hp <= 0 || b.offline) return false;
      const hill = S.tiles[b.y][b.x] === "hills" ? 2 : 0;
      const range = 7 + b.lvl + hill;
      return cheb(b, tx, ty) <= range;
    });
  }

  function rollIntercept(q) {
    const w = WPN[q.kind];
    if (!w) return null;
    const air = ["missile", "icbm", "airstrike", "drop", "tankdrop"].includes(q.kind);
    if (!air) return null;
    const defender = 1 - q.owner;
    const batteries = aaCovering(defender, q.x, q.y);
    if (!batteries.length) return null;
    let skill = 1;
    if (S.mode === "ai" && defender === 1) {
      skill = { easy: 0.72, normal: 1, hard: 1.18, insane: 1.32 }[S.diff] || 1;
    } else if (S.mode === "ai" && defender === 0) {
      skill = { easy: 1.08, normal: 1, hard: 0.95, insane: 0.9 }[S.diff] || 1;
    }
    let kindMul = 1;
    if (q.kind === "icbm") kindMul = 0.48;
    else if (q.kind === "airstrike") kindMul = 0.82;
    else if (q.kind === "drop" || q.kind === "tankdrop") kindMul = 0.62;
    else if (q.kind === "missile") kindMul = 1;
    for (const b of batteries) {
      if (b.shotThis) continue;
      const hill = S.tiles[b.y][b.x] === "hills" ? 0.08 : 0;
      const p = Math.min(0.88, (0.22 + 0.12 * b.lvl + hill) * skill * kindMul);
      if (S.R() < p) {
        b.shotThis = true;
        return b;
      }
    }
    return null;
  }

  function fireShot(q) {
    const w = WPN[q.kind];
    if (!w) return;
    const defender = 1 - q.owner;
    const padB = q.pad && S.buildings.find((b) => b.id === q.pad);
    const from = padB || nearestSilo(q.owner, q.kind) || hqCentroid(q.owner);
    const fly = 32;
    const intercepted = rollIntercept(q);
    const hx = intercepted ? from.x + (q.x - from.x) * 0.68 : q.x;
    const hy = intercepted ? from.y + (q.y - from.y) * 0.68 : q.y;
    S.fx.push({
      kind: q.kind === "airstrike" ? "jet" : q.kind === "drop" || q.kind === "tankdrop" || q.kind === "scout" ? "drop" : "missile",
      x0: from.x, y0: from.y, x1: hx, y1: hy, life: fly, max: fly,
      onEnd: () => resolveImpact(q, intercepted, hx, hy)
    });
    if (w.emp) {
      /* EMP still flies then lands */
    }
  }

  function resolveImpact(q, aa, hx, hy) {
    const w = WPN[q.kind];
    if (!w) return;
    const defender = 1 - q.owner;
    if (aa) {
      log(`${w.name} intercepted by AA Mk${aa.lvl} at ${aa.x},${aa.y}.`);
      fx("aa");
      boom(hx, hy);
      reveal(q.owner, q.x, q.y, 1);
      return;
    }
    if (w.emp) {
      S.players[defender].emp = 1;
      for (const b of S.buildings) {
        if (b.owner === defender && ["radar", "aa", "silo", "icbm", "sat", "emp"].includes(b.type)) b.offline = true;
      }
      log("EMP silences enemy electronics.");
      fx("emp");
      boom(q.x, q.y);
      return;
    }
    if (w.spawn) {
      if (S.tiles[q.y][q.x] === "water") { log("Drop lost at sea."); boom(q.x, q.y); return; }
      const mine = buildingAt(q.x, q.y);
      if (mine && mine.type === "mine" && mine.owner !== q.owner) {
        const u = spawnU(w.spawn, q.owner, q.x, q.y);
        hurtU(u, 40);
        mine.hp = 0;
        log("Minefield detonates under the drop.");
        boom(q.x, q.y);
      } else if (occupied(q.x, q.y) && !unitAt(q.x, q.y)) {
        const n = neighbors(q.x, q.y).find((t) => inB(t.x, t.y) && S.tiles[t.y][t.x] !== "water" && !buildingAt(t.x, t.y));
        if (n) spawnU(w.spawn, q.owner, n.x, n.y);
        else log("Drop aborted — no landing zone.");
      } else if (unitAt(q.x, q.y)) {
        const n = neighbors(q.x, q.y).find((t) => inB(t.x, t.y) && !occupied(t.x, t.y) && S.tiles[t.y][t.x] !== "water");
        if (n) spawnU(w.spawn, q.owner, n.x, n.y);
      } else spawnU(w.spawn, q.owner, q.x, q.y);
      reveal(q.owner, q.x, q.y, w.spawn === "scout" ? 3 : 1);
      boom(q.x, q.y);
      return;
    }
    applySplash(q.owner, q.x, q.y, w.dmg || 0, w.r || 0);
    reveal(q.owner, q.x, q.y, 1 + (w.r || 0));
    boom(q.x, q.y);
  }

  function nearestSilo(owner, kind) {
    const need = WPN[kind].need;
    const list = S.buildings.filter((b) => b.owner === owner && b.hp > 0 && (need ? b.type === need : b.type === "silo" || b.type === "hangar" || b.type === "hq"));
    return list[0] || S.buildings.find((b) => b.owner === owner && b.type === "hq" && b.hp > 0);
  }
  function hqCentroid(owner) {
    const h = S.buildings.filter((b) => b.owner === owner && b.type === "hq" && b.hp > 0);
    if (!h.length) return { x: 12, y: owner === 0 ? 20 : 6 };
    return { x: Math.round(h.reduce((a, b) => a + b.x, 0) / h.length), y: Math.round(h.reduce((a, b) => a + b.y, 0) / h.length) };
  }

  function applySplash(attacker, x, y, dmg, r) {
    const sh = S.buildings.find((b) => b.owner !== attacker && b.type === "shield" && b.hp > 0 && b.charges > 0 && dist(b, { x, y }) <= 2);
    if (sh) {
      sh.charges--;
      dmg = Math.max(0, dmg - 80);
      if (sh.charges <= 0) log("Shield generator exhausted.");
    }
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const tx = x + dx, ty = y + dy;
      if (!inB(tx, ty)) continue;
      const fall = 1 - Math.max(Math.abs(dx), Math.abs(dy)) * 0.28;
      const dealt = Math.round(dmg * Math.max(0.4, fall));
      const b = buildingAt(tx, ty);
      const u = unitAt(tx, ty);
      if (b && b.owner !== attacker) hurtB(b, dealt, attacker);
      if (u && u.owner !== attacker) hurtU(u, dealt, attacker);
    }
  }

  function hurtB(b, dmg, attacker) {
    if (b.offline && b.type === "shield") { /* still takes */ }
    b.hp -= dmg;
    if (b.hp <= 0) {
      b.hp = 0;
      if (attacker != null && !b.wrecked) S.players[attacker].stats.bKill++;
      if (b.type === "hq") {
        log(`${BLD[b.type].name} destroyed.`);
        boom(b.x, b.y);
      } else if (!b.wrecked) {
        b.wrecked = true;
        log(`${BLD[b.type].name} wrecked. Repair to restore it.`);
        boom(b.x, b.y);
        if (b.type === "relay") log("Build radius collapsed around that relay.");
        if (b.fake || b.type === "fake") {
          for (const u of S.units) {
            if (u.hp > 0 && dist(u, b) <= 2) hurtU(u, 28, b.owner);
          }
          log("Decoy HQ detonates!");
          b.wrecked = false;
        }
      }
    }
  }
  function hurtU(u, dmg, attacker) {
    u.hp -= dmg;
    if (u.hp <= 0) {
      u.hp = 0;
      if (attacker != null) S.players[attacker].stats.uKill++;
    }
  }

  function boom(x, y) {
    S.fx.push({ kind: "boom", x, y, life: 14, max: 14 });
    bang();
  }

  function autoCombat() {
    const guns = S.buildings.filter((b) => b.type === "gun" && b.hp > 0 && !b.offline && !b.wrecked);
    for (const g of guns) {
      const hill = S.tiles[g.y][g.x] === "hills";
      const foes = S.units.filter((u) => u.owner !== g.owner && u.hp > 0 && dist(u, g) <= 2 + (hill ? 1 : 0));
      if (!foes.length) continue;
      foes.sort((a, b) => dist(a, g) - dist(b, g));
      hurtU(foes[0], 18 + g.lvl * 4 + (hill ? 8 : 0), g.owner);
      S.fx.push({ kind: "flash", x: foes[0].x, y: foes[0].y, life: 8, max: 8 });
    }
    for (const u of S.units.filter((x) => x.hp > 0)) {
      const def = UNIT[u.type];
      if (!def.dmg) {
        if (def.reveal) reveal(u.owner, u.x, u.y, 2);
        continue;
      }
      const targets = [
        ...S.units.filter((o) => o.owner !== u.owner && o.hp > 0),
        ...S.buildings.filter((o) => o.owner !== u.owner && o.hp > 0)
      ];
      targets.sort((a, b) => dist(a, u) - dist(b, u));
      const t = targets[0];
      if (!t || dist(t, u) > def.range + (dist(t, u) === 1 ? 0 : 0)) continue;
      if (dist(t, u) <= 1) {
        if (t.max && t.type && UNIT[t.type]) hurtU(t, def.mdmg, u.owner);
        else hurtB(t, def.mdmg, u.owner);
      } else if (dist(t, u) <= def.range) {
        if (UNIT[t.type]) hurtU(t, def.dmg, u.owner);
        else hurtB(t, def.dmg, u.owner);
      }
    }
    for (const u of S.units.filter((x) => x.hp > 0)) {
      const mine = buildingAt(u.x, u.y);
      if (mine && mine.type === "mine" && mine.owner !== u.owner) {
        hurtU(u, 40, mine.owner);
        mine.hp = 0;
        boom(u.x, u.y);
      }
    }
  }

  function marchUnits() {
    for (const u of S.units.filter((x) => x.hp > 0)) {
      const def = UNIT[u.type];
      const steps = def.move || 1;
      for (let s = 0; s < steps; s++) {
        const enemies = [
          ...S.buildings.filter((b) => b.owner !== u.owner && b.hp > 0 && b.type === "hq"),
          ...S.buildings.filter((b) => b.owner !== u.owner && b.hp > 0),
          ...S.units.filter((o) => o.owner !== u.owner && o.hp > 0)
        ];
        if (!enemies.length) break;
        enemies.sort((a, b) => dist(a, u) - dist(b, u));
        const t = enemies[0];
        if (def.dmg && dist(t, u) <= (def.range || 1)) break;
        let step = { x: u.x, y: u.y };
        if (Math.abs(t.x - u.x) > Math.abs(t.y - u.y)) step.x += Math.sign(t.x - u.x);
        else step.y += Math.sign(t.y - u.y);
        if (!inB(step.x, step.y) || S.tiles[step.y][step.x] === "water") break;
        if (buildingAt(step.x, step.y) && buildingAt(step.x, step.y).owner !== u.owner) break;
        if (unitAt(step.x, step.y)) break;
        u.x = step.x; u.y = step.y;
        if (def.reveal) reveal(u.owner, u.x, u.y, 2);
      }
    }
  }

  function finishResolve() {
    for (const b of S.buildings) {
      if (b.hp <= 0 && b.type !== "hq" && b.type !== "fake") b.wrecked = true;
    }
    S.buildings = S.buildings.filter((b) => (b.type === "hq" || b.type === "fake") ? b.hp > 0 : true);
    S.units = S.units.filter((u) => u.hp > 0);
    const pHQ = hqCount(0), eHQ = hqCount(1);
    if (pHQ <= 0 || eHQ <= 0) {
      S.over = pHQ > 0 ? "win" : "lose";
      S.phase = "end";
      tally();
      paintUI();
      fx(S.over === "win" ? "win" : "lose");
      showEnd();
      return;
    }
    if (S.mode === "ai") {
      if (S.resolveWho !== "enemy") enemyTurn();
      else nextTurn();
      return;
    }
    if (S.actor === 0) {
      showPass("Northern commander: Defense, then Offense.", () => {
        S.actor = 1;
        S.phase = "defense";
        tool = null; weapon = null;
        focusHomeLand(1);
        log("Hot-seat — northern commander, fortify.");
        paintUI();
      });
    } else {
      showPass("Southern commander: new turn. Defense first.", () => {
        S.actor = 0;
        nextTurn();
      });
    }
  }

  function nextTurn() {
    S.turn++;
    S.phase = "defense";
    for (const o of [0, 1]) {
      for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
        if (!onHome(o, x, y) && S.fogAge[o][y][x] && S.fogAge[o][y][x] < S.turn) {
          S.fog[o][y][x] = false;
        }
      }
      radarSweep(o);
    }
    S.players[0].emp = 0;
    S.players[1].emp = 0;
    for (const b of S.buildings) b.offline = false;
    tickEconomy(false);
    maybeSwitchAI();
    tool = null; weapon = null;
    for (const b of S.buildings) {
      b.repairTick = false;
      if (!b.wrecked && b.hp > 0 && b.type === "shield" && b.charges < 2) b.charges++;
    }
    log(`Turn ${S.turn}. Defense — fortify the island.`);
    paintUI();
  }

  function maybeSwitchAI() {
    const d = DIFF[S.diff];
    if (S.R() > d.switch) return;
    const intel = aiContacts(1);
    const seenHq = intel.some((c) => c.b && c.b.type === "hq");
    const losing = hqCount(1) < hqCount(0) || countB("silo", 1) + countB("aa", 1) < 2;
    if (losing) S.ai.profile = "Aggressor";
    else if (!seenHq) S.ai.profile = "Intelligence";
    else S.ai.profile = S.R() > 0.5 ? "Turtle" : "Economist";
    S.ai.switches++;
    log(`Enemy doctrine shifts → ${S.ai.profile}.`);
  }

  function enemyTurn() {
    S.phase = "enemy";
    paintUI();
    aiDefense();
    aiOffense();
    if (enemyTimer) clearTimeout(enemyTimer);
    enemyTimer = setTimeout(() => {
      enemyTimer = 0;
      if (S && S.phase === "enemy") startResolve("enemy");
    }, 900);
  }

  function aiContacts(viewer) {
    const list = [];
    for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
      if (onHome(viewer, x, y)) continue;
      if (S.fog[viewer][y][x]) {
        const b = buildingAt(x, y);
        list.push({
          x, y, live: true, terr: S.tiles[y][x],
          b: b && b.owner !== viewer ? b : null,
          u: unitAt(x, y)
        });
      } else if (hasMemory(viewer, x, y)) {
        const ls = S.lastSeen[viewer][y][x];
        list.push({
          x, y, live: false, terr: ls.terr,
          b: ls.b ? { type: ls.b.type, hp: ls.b.hp, max: 200, owner: 1 - viewer } : null
        });
      }
    }
    return list;
  }

  function aiTargetValue(c) {
    if (!c || !c.b) return 0;
    const t = c.b.type;
    const tab = {
      hq: 100, icbm: 78, silo: 70, hangar: 66, relay: 62, aa: 58,
      radar: 52, sat: 50, emp: 46, econ: 42, energy: 36, factory: 32,
      shield: 28, gun: 18, mine: 8, fake: 100
    };
    let s = tab[t] || 10;
    if (c.live && c.b.hp && c.b.max) s += (1 - c.b.hp / c.b.max) * 12;
    if (!c.live) s *= 0.72;
    return s;
  }

  function aiPickSpots(type, owner, minSep) {
    const hqs = S.buildings.filter((b) => b.owner === owner && b.type === "hq" && b.hp > 0);
    const legal = landTiles(owner).filter((t) =>
      !occupied(t.x, t.y) && !terrainAllows(type, S.tiles[t.y][t.x]) && inBuildNet(owner, t.x, t.y)
    );
    const score = (t) => {
      const terr = S.tiles[t.y][t.x];
      const hqD = hqs.length ? Math.min(...hqs.map((h) => dist(h, t))) : 8;
      const same = S.buildings.filter((b) => b.owner === owner && b.type === type && b.hp > 0 && dist(b, t) < minSep).length;
      const crowd = S.buildings.filter((b) => b.owner === owner && (b.hp > 0 || b.wrecked) && dist(b, t) < 2).length;
      const rear = owner === 1 ? (MAP - 1 - t.y) : t.y;
      const front = owner === 1 ? t.y : (MAP - 1 - t.y);
      let s = -same * 14 - crowd * 5 + S.R() * 3;
      if (type === "energy" || type === "econ" || type === "silo" || type === "icbm" || type === "hangar" || type === "factory") {
        s += rear * 1.2 + hqD * 0.8;
        if (type === "econ" && terr === "hills") s += 6;
      } else if (type === "aa" || type === "gun" || type === "shield" || type === "mine") {
        s += 10 - hqD * 2 + front * 0.15;
        if ((type === "gun" || type === "aa") && terr === "hills") s += 22;
      } else if (type === "relay") {
        s += hqD * 1.6 - same * 8;
      } else if (type === "radar") {
        s += 4 - same * 12;
        const rads = S.buildings.filter((b) => b.owner === owner && b.type === "radar" && b.hp > 0);
        if (rads.length) s += Math.min(...rads.map((r) => Math.abs(r.x - t.x)));
      } else if (type === "fake") {
        s += 8 - hqD * 3;
      } else if (type === "emp") {
        s += rear * 0.5;
      }
      return s;
    };
    legal.sort((a, b) => score(b) - score(a));
    return legal;
  }

  function aiPlace(type, owner) {
    if (!BLD[type] || S.players[owner].credits < BLD[type].cost) return false;
    if (BLD[type].unlock && !unlocked(BLD[type].unlock)) return false;
    const sep = type === "gun" || type === "mine" || type === "aa" ? 2 : 3;
    const spots = aiPickSpots(type, owner, sep);
    if (!spots.length) return false;
    return tryBuild(type, owner, spots[0].x, spots[0].y);
  }

  function aiDefense() {
    const o = 1;
    const profile = S.ai.profile;
    for (const w of S.buildings.filter((b) => b.owner === o && (b.wrecked || b.hp < b.max * 0.7))) tryRepair(w);
    const n = (t) => countB(t, o);
    const hqN = Math.max(1, hqCount(o));
    const plan = [];
    if (n("energy") < 2) plan.push("energy", "energy");
    else if (n("energy") < 3 + (profile === "Economist" ? 1 : 0)) plan.push("energy");
    if (n("econ") < (profile === "Economist" ? 4 : 2)) plan.push("econ");
    if (n("relay") < 1 + Math.floor(S.turn / 3)) plan.push("relay");
    if (n("aa") < hqN) plan.push("aa");
    if (n("gun") < hqN) plan.push("gun");
    if (n("radar") < (profile === "Intelligence" ? 3 : 1)) plan.push("radar");
    if (profile === "Aggressor") plan.push("silo", "hangar", "silo", "factory");
    else if (profile === "Turtle") plan.push("aa", "shield", "gun", "mine", "fake");
    else if (profile === "Economist") plan.push("econ", "energy", "silo");
    else plan.push("radar", "emp", "aa", "silo");
    if (n("silo") < 1) plan.push("silo");
    if (unlocked("icbm") && S.turn >= 4 && n("icbm") < 1) plan.push("icbm");
    if (n("fake") < 1 && profile !== "Aggressor") plan.push("fake");
    const cap = profile === "Turtle" ? 4 : 3;
    let built = 0;
    for (const type of plan) {
      if (built >= cap) break;
      if (aiPlace(type, o)) built++;
    }
    const fac = S.buildings.find((b) => b.owner === o && b.type === "factory" && b.hp > 0 && !b.wrecked);
    if (fac && profile !== "Turtle") tryTrain(fac, "marine");
  }

  function aiAssignTargets(contacts, n, maxStack) {
    const scored = contacts.filter((c) => c.b).map((c) => ({ c, s: aiTargetValue(c) }))
      .sort((a, b) => b.s - a.s);
    const out = [];
    const piled = {};
    let i = 0, guard = 0;
    while (out.length < n && scored.length && guard++ < 40) {
      const row = scored[i % scored.length];
      const key = row.c.x + "," + row.c.y;
      if ((piled[key] || 0) >= maxStack && scored.length > 1) { i++; continue; }
      piled[key] = (piled[key] || 0) + 1;
      out.push(row.c);
      i++;
    }
    return out;
  }

  function aiProbePlan(viewer, contacts) {
    const unknown = [];
    for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
      if (onHome(viewer, x, y)) continue;
      if (S.fog[viewer][y][x] || hasMemory(viewer, x, y)) continue;
      unknown.push({ x, y });
    }
    const seeds = contacts.filter((c) => c.b);
    unknown.sort((a, b) => {
      const da = seeds.length ? Math.min(...seeds.map((s) => dist(s, a))) : 99;
      const db = seeds.length ? Math.min(...seeds.map((s) => dist(s, b))) : 99;
      const ga = (a.x + a.y * 3) % 4;
      const gb = (b.x + b.y * 3) % 4;
      return da - db || ga - gb;
    });
    return unknown;
  }

  function aiOffense() {
    const o = 1;
    const contacts = aiContacts(o);
    const valued = contacts.filter((c) => c.b);
    const hqs = valued.filter((c) => c.b.type === "hq" || c.b.type === "fake");
    const aa = valued.filter((c) => c.b.type === "aa");
    const electronics = valued.filter((c) => ["radar", "aa", "silo", "icbm", "sat", "emp"].includes(c.b.type));
    const fire = (kind, t) => t && queueStrike(o, kind, t.x, t.y);
    const probes = aiProbePlan(o, contacts);

    const siloN = livePads(o, "silo").length;
    const missileTgts = hqs.length || aa.length
      ? aiAssignTargets(hqs.length ? hqs.concat(aa) : valued, siloN, 2)
      : [];
    if (missileTgts.length) {
      for (let i = 0; i < siloN; i++) fire("missile", missileTgts[i] || missileTgts[0]);
    } else {
      for (let i = 0; i < siloN; i++) fire("missile", probes[i] || probes[0]);
    }

    const icbmN = livePads(o, "icbm").length;
    if (icbmN && (hqs.length || S.turn >= 4)) {
      fire("icbm", hqs[0] || valued.sort((a, b) => aiTargetValue(b) - aiTargetValue(a))[0] || probes[0]);
    }

    if (livePads(o, "hangar").length) {
      const dropAt = hqs[0] || valued[0];
      if (dropAt && (S.ai.profile === "Aggressor" || dropAt.b && dropAt.b.type === "hq")) fire("drop", dropAt);
      else if (S.ai.profile === "Aggressor") fire("drop", probes[0]);
    }

    if (livePads(o, "emp").length && electronics.length >= 2) {
      electronics.sort((a, b) => {
        const na = electronics.filter((e) => dist(e, a) <= 3).length;
        const nb = electronics.filter((e) => dist(e, b) <= 3).length;
        return nb - na;
      });
      fire("emp", electronics[0]);
    }

    let p = 0;
    while (shotsLeft(o, "probe") > 0 && S.players[o].credits >= 25 && probes[p]) {
      if (!fire("probe", probes[p])) break;
      p++;
    }
  }

  function tally() {
    const st = S.players[0].stats;
    const survive = S.buildings.filter((b) => b.owner === 0 && b.hp > 0).length;
    const eco = Math.round(st.income * 0.05);
    const timePen = S.turn * 8;
    let score = st.bKill * 10 + st.uKill * 2 + survive * 5 + eco - timePen;
    if (S.over === "win") score += 250 + S.campaign * 40;
    score = Math.max(0, Math.round(score * (1 + persist.prestige * 0.15)));
    S.score = score;
    persist.best = Math.max(persist.best, score);
    persist.board.push({
      name: persist.name || "Commander",
      score, diff: S.diff, campaign: S.campaign,
      result: S.over, date: new Date().toISOString().slice(0, 10),
      profile: S.ai.profile
    });
    persist.board.sort((a, b) => b.score - a.score);
    persist.board = persist.board.slice(0, 50);
    if (S.over === "win") {
      persist.wins++;
      persist.campaign++;
      persist.pts += 2 + Math.floor(S.campaign / 2);
      persist.prestige = Math.floor(persist.wins / 10);
      autoUnlock();
    }
    savePersist();
  }

  function autoUnlock() {
    const map = { scout: 1, tank: 2, shield: 2, icbm: 3, emp: 4, airstrike: 5, sat: 6 };
    for (const [k, w] of Object.entries(map)) {
      if (persist.wins >= w) persist.unlocks[k] = true;
    }
  }

  function log(msg) {
    if (!S) return;
    S.log.unshift(`T${S.turn}  ${msg}`);
    S.log = S.log.slice(0, 80);
    const el = $("log");
    if (el) el.textContent = S.log.join("\n");
  }
  function toast(msg) {
    $("hint").textContent = msg;
    $("dockStatus").textContent = msg;
  }

  /* ---------- render ---------- */
  function focusOwner(o) {
    const c = hqCentroid(o);
    const w = worldIso(c.x, c.y);
    const cv = canvas();
    const cw = cv.clientWidth || 960;
    const ch = cv.clientHeight || 640;
    cam.z = Math.max(0.7, Math.min(1.4, ch / 720));
    cam.x = cw / 2 - w.sx * cam.z;
    cam.y = ch / 2 - w.sy * cam.z;
  }
  function focusHomeLand(owner) {
    const land = landTiles(owner);
    if (!land.length) return;
    const c = {
      x: land.reduce((a, t) => a + t.x, 0) / land.length,
      y: land.reduce((a, t) => a + t.y, 0) / land.length
    };
    const w = worldIso(c.x, c.y);
    const cv = canvas();
    const cw = cv.clientWidth || 960;
    const ch = cv.clientHeight || 640;
    cam.z = Math.max(0.38, Math.min(1.15, ch / (MAP * TH * 0.62)));
    cam.x = cw / 2 - w.sx * cam.z;
    cam.y = ch / 2 - w.sy * cam.z;
  }

  function draw() {
    const cv = canvas(), ctx = ctxOf();
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== (w * dpr | 0) || cv.height !== (h * dpr | 0)) {
      cv.width = w * dpr | 0; cv.height = h * dpr | 0;
      for (const k of Object.keys(PAT)) delete PAT[k];
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#243656");
    sky.addColorStop(0.35, "#121c2e");
    sky.addColorStop(1, "#070b12");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    if (!S) return;
    const order = [];
    const pad = TW * cam.z * 1.8;
    for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
      const p = iso(x, y);
      if (p.sx < -pad || p.sx > w + pad || p.sy < -pad || p.sy > h + pad) continue;
      order.push({ x, y, k: x + y });
    }
    order.sort((a, b) => a.k - b.k);
    for (const t of order) drawTile(ctx, t.x, t.y);
    if (S.phase === "defense" && tool && tool !== "hq") {
      for (const t of order) {
        if (S.tiles[t.y][t.x] === "water" || occupied(t.x, t.y) || !onHome(me(), t.x, t.y)) continue;
        if (!inBuildNet(me(), t.x, t.y)) continue;
        if (terrainAllows(tool, S.tiles[t.y][t.x])) continue;
        drawDiamondLift(ctx, t.x, t.y, "rgba(52,211,153,.45)");
      }
    }
    for (const t of order) drawOcc(ctx, t.x, t.y);
    for (const f of S.fx) drawFx(ctx, f);
    if (hover && inB(hover.x, hover.y)) drawDiamondLift(ctx, hover.x, hover.y, "rgba(34,211,238,.95)");
    if (sel) drawDiamondLift(ctx, sel.x, sel.y, "rgba(251,191,36,.95)");
    tFrame++;
  }

  function terrainColor(t) {
    return {
      plains: "#4d7330", hills: "#6e726c", forest: "#1d3d20",
      water: "#0e4a5c", ruins: "#6b645a", fog: "#070c14"
    }[t] || "#0a121c";
  }
  function terrainShade(t, k) {
    const hex = terrainColor(t).slice(1);
    const n = parseInt(hex, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, r * (1 + k) | 0));
    g = Math.max(0, Math.min(255, g * (1 + k) | 0));
    b = Math.max(0, Math.min(255, b * (1 + k) | 0));
    return `rgb(${r},${g},${b})`;
  }

  function tileLiftAmt(terr) {
    void terr;
    return 0;
  }
  function visTerr(x, y) {
    const viewer = me();
    const vis = visible(viewer, x, y);
    const mem = hasMemory(viewer, x, y);
    if (!vis && !mem) return "fog";
    return vis ? S.tiles[y][x] : ((S.lastSeen[viewer][y] && S.lastSeen[viewer][y][x] && S.lastSeen[viewer][y][x].terr) || "fog");
  }
  function isoTop(x, y) {
    const p = iso(x, y);
    return { sx: p.sx, sy: p.sy - tileLiftAmt(visTerr(x, y)) };
  }
  function hash01(x, y, k) {
    let n = (x * 374761393 + y * 668265263 + k * 1274126177) >>> 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
    return (n & 0xffff) / 65535;
  }

  function drawTile(ctx, x, y) {
    const viewer = me();
    const vis = visible(viewer, x, y);
    const mem = hasMemory(viewer, x, y);
    const unknown = !vis && !mem;
    const terr = unknown ? "fog" : (vis ? S.tiles[y][x] : (S.lastSeen[viewer][y][x].terr || "fog"));
    const base = iso(x, y);
    const lift = tileLiftAmt(terr);
    const top = { sx: base.sx, sy: base.sy - lift };
    const tw = TW * cam.z, th = TH * cam.z;
    diamondPathAt(ctx, top.sx, top.sy, 1.04);
    ctx.fillStyle = terrainColor(terr);
    ctx.fill();
    fillWorldTile(ctx, x, y, terr, top.sx, top.sy, vis || unknown ? 1 : 0.55);
    if (terr !== "water" && terr !== "fog") {
      const light = ctx.createLinearGradient(top.sx - tw / 2, top.sy - th / 2, top.sx + tw / 2, top.sy + th / 2);
      light.addColorStop(0, "rgba(255,255,255,0.07)");
      light.addColorStop(1, "rgba(0,0,0,0.08)");
      diamondPathAt(ctx, top.sx, top.sy, 1.04);
      ctx.fillStyle = light;
      ctx.fill();
    }

    if (vis && !unknown) drawProps(ctx, x, y, terr, top, tw, th);

    if (!vis && mem) {
      diamondPathAt(ctx, top.sx, top.sy, 1.04);
      ctx.fillStyle = "rgba(4,10,18,.35)";
      ctx.fill();
    }

    const land = terr !== "water" && terr !== "fog";
    if (vis && land) {
      const wet = neighbors(x, y).some((n) => inB(n.x, n.y) && S.tiles[n.y][n.x] === "water");
      if (wet) {
        diamondPathAt(ctx, top.sx, top.sy, 1.0);
        ctx.strokeStyle = "rgba(210, 230, 220, 0.28)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
  }

  function fillWorldTile(ctx, x, y, kind, sx, sy, alpha) {
    const img = SPR["tex-" + kind];
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!img) return;
    if (!PAT[kind]) {
      try { PAT[kind] = ctx.createPattern(img, "repeat"); } catch (_) { PAT[kind] = null; }
    }
    if (!PAT[kind]) return;
    ctx.save();
    diamondPathAt(ctx, sx, sy, 1.04);
    ctx.clip();
    ctx.globalAlpha = alpha;
    const k = 64;
    const drift = kind === "water" ? tFrame * 0.04 : 0;
    ctx.setTransform(
      dpr * (TW / 2) * cam.z / k,
      dpr * (TH / 2) * cam.z / k,
      dpr * (-TW / 2) * cam.z / k,
      dpr * (TH / 2) * cam.z / k,
      dpr * cam.x,
      dpr * cam.y
    );
    ctx.fillStyle = PAT[kind];
    ctx.fillRect((x - 1.5) * k + drift, (y - 1.5) * k + drift * 0.45, k * 3, k * 3);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawProps(ctx, x, y, terr, top, tw, th) {
    const n = 1 + ((x * 13 + y * 7) % 2);
    if (terr === "forest") {
      for (let i = 0; i < n; i++) {
        const u = hash01(x, y, 10 + i) - 0.5;
        const v = hash01(x, y, 20 + i) - 0.5;
        const px = top.sx + u * tw * 0.35;
        const py = top.sy + v * th * 0.35;
        const r = (2.2 + hash01(x, y, 30 + i) * 2.4) * cam.z;
        ctx.beginPath();
        ctx.ellipse(px, py + r * 0.15, r * 0.35, r * 0.2, 0, 0, 7);
        ctx.fillStyle = "rgba(0,0,0,.25)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py - r * 0.2, r, 0, 7);
        ctx.fillStyle = hash01(x, y, 40 + i) > 0.5 ? "#163c1a" : "#1f5a24";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px - r * 0.2, py - r * 0.35, r * 0.55, 0, 7);
        ctx.fillStyle = "#2a6b32";
        ctx.fill();
      }
    } else if (terr === "hills") {
      for (let i = 0; i < n; i++) {
        const u = hash01(x, y, 50 + i) - 0.5;
        const v = hash01(x, y, 60 + i) - 0.5;
        const px = top.sx + u * tw * 0.3;
        const py = top.sy + v * th * 0.25;
        const s = (1.8 + hash01(x, y, 70 + i) * 2) * cam.z;
        ctx.beginPath();
        ctx.moveTo(px, py - s);
        ctx.lineTo(px + s, py + s * 0.4);
        ctx.lineTo(px - s, py + s * 0.4);
        ctx.closePath();
        ctx.fillStyle = "#8a8880";
        ctx.fill();
      }
    } else if (terr === "ruins") {
      const px = top.sx + (hash01(x, y, 1) - 0.5) * tw * 0.2;
      const py = top.sy;
      ctx.fillStyle = "#4b463e";
      ctx.fillRect(px - 2.5 * cam.z, py - 5 * cam.z, 5 * cam.z, 6 * cam.z);
      ctx.fillStyle = "#6d6558";
      ctx.fillRect(px - 2 * cam.z, py - 7 * cam.z, 4 * cam.z, 3 * cam.z);
    } else if (terr === "plains" && hash01(x, y, 9) > 0.82) {
      ctx.fillStyle = "#3d5c28";
      ctx.fillRect(top.sx + 4 * cam.z, top.sy, 2 * cam.z, 5 * cam.z);
    }
  }

  function drawOcc(ctx, x, y) {
    const viewer = me();
    const vis = visible(viewer, x, y);
    const b = buildingAt(x, y);
    const u = unitAt(x, y);
    if (b) {
      if (b.owner === viewer || vis) {
        const key = b.fake && b.owner !== viewer && vis ? "hq" : b.type;
        if (b.wrecked) ctx.globalAlpha = 0.4;
        drawSpr(ctx, SPR[BLD[key] ? BLD[key].spr : b.type] || SPR[b.type], x, y, b.owner !== viewer);
        ctx.globalAlpha = 1;
        hpBar(ctx, x, y, b.hp / b.max, b.owner);
      } else if (S.lastSeen[viewer][y][x] && S.lastSeen[viewer][y][x].b) {
        ctx.globalAlpha = 0.4;
        drawSpr(ctx, SPR[S.lastSeen[viewer][y][x].b.type] || SPR.hq, x, y, true);
        ctx.globalAlpha = 1;
      }
    } else if (!vis && S.lastSeen[viewer][y][x] && S.lastSeen[viewer][y][x].b) {
      ctx.globalAlpha = 0.4;
      drawSpr(ctx, SPR[S.lastSeen[viewer][y][x].b.type] || SPR.hq, x, y, true);
      ctx.globalAlpha = 1;
    }
    if (u && (u.owner === viewer || vis)) {
      const bob = Math.sin((tFrame + u.id * 7) / 10) * 2 * cam.z;
      drawSpr(ctx, SPR[u.type], x, y, u.owner !== me(), bob);
      hpBar(ctx, x, y, u.hp / u.max, u.owner);
    }
  }

  function drawSpr(ctx, img, x, y, enemy, bob = 0) {
    const p = isoTop(x, y);
    const tw = TW * cam.z * 1.05;
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy + 8 * cam.z, 14 * cam.z, 6 * cam.z, 0, 0, 7);
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.fill();
    if (!img) {
      ctx.fillStyle = enemy ? "#a78bfa" : "#22d3ee";
      ctx.fillRect(p.sx - 8, p.sy - 18 - bob, 16, 18);
      return;
    }
    const ih = tw * (img.height / img.width);
    if (enemy) ctx.filter = "hue-rotate(70deg) saturate(1.15)";
    ctx.drawImage(img, p.sx - tw / 2, p.sy - ih * 0.88 - bob, tw, ih);
    ctx.filter = "none";
  }

  function hpBar(ctx, x, y, r, owner) {
    const p = isoTop(x, y);
    const w = 28 * cam.z, h = 4 * cam.z;
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(p.sx - w / 2, p.sy + 8 * cam.z, w, h);
    ctx.fillStyle = owner === me() ? "#22d3ee" : "#c084fc";
    ctx.fillRect(p.sx - w / 2, p.sy + 8 * cam.z, w * Math.max(0, Math.min(1, r)), h);
  }

  function diamondPathAt(ctx, sx, sy, scale) {
    const s = scale == null ? 1 : scale;
    const hw = (TW / 2) * cam.z * s, hh = (TH / 2) * cam.z * s;
    ctx.beginPath();
    ctx.moveTo(sx, sy - hh);
    ctx.lineTo(sx + hw, sy);
    ctx.lineTo(sx, sy + hh);
    ctx.lineTo(sx - hw, sy);
    ctx.closePath();
  }
  function diamondPath(ctx, x, y) {
    const p = isoTop(x, y);
    diamondPathAt(ctx, p.sx, p.sy);
  }
  function drawDiamondLift(ctx, x, y, color) {
    diamondPath(ctx, x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  function fillDiamond(ctx, x, y, color) {
    diamondPath(ctx, x, y);
    ctx.fillStyle = color;
    ctx.fill();
  }
  function drawDiamond(ctx, x, y, color) {
    const p = iso(x, y);
    const hw = (TW / 2) * cam.z, hh = (TH / 2) * cam.z;
    ctx.beginPath();
    ctx.moveTo(p.sx, p.sy - hh);
    ctx.lineTo(p.sx + hw, p.sy);
    ctx.lineTo(p.sx, p.sy + hh);
    ctx.lineTo(p.sx - hw, p.sy);
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawFx(ctx, f) {
    if (f.kind === "missile" || f.kind === "jet" || f.kind === "drop") {
      const k = 1 - f.life / f.max;
      const x = f.x0 + (f.x1 - f.x0) * k;
      const y = f.y0 + (f.y1 - f.y0) * k;
      const p = iso(x, y);
      const img = f.kind === "jet" ? SPR.jet : SPR.missile;
      const lift = Math.sin(k * Math.PI) * 40 * cam.z;
      if (img) ctx.drawImage(img, p.sx - 18 * cam.z, p.sy - 28 * cam.z - lift, 36 * cam.z, 36 * cam.z);
      else {
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath(); ctx.arc(p.sx, p.sy - lift, 4, 0, 6.28); ctx.fill();
      }
    } else if (f.kind === "boom") {
      const p = iso(f.x, f.y);
      const img = SPR.boom;
      const sc = (1.2 - f.life / f.max) * 52 * cam.z;
      ctx.globalAlpha = f.life / f.max;
      if (img) ctx.drawImage(img, p.sx - sc / 2, p.sy - sc / 2, sc, sc);
      else { ctx.fillStyle = "#fb923c"; ctx.beginPath(); ctx.arc(p.sx, p.sy, sc / 2, 0, 6.28); ctx.fill(); }
      ctx.globalAlpha = 1;
    } else if (f.kind === "flash") {
      const p = iso(f.x, f.y);
      ctx.globalAlpha = f.life / f.max;
      ctx.fillStyle = "#fff";
      ctx.fillRect(p.sx - 3, p.sy - 10, 6, 12);
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- UI ---------- */
  function paintUI() {
    if (!S) return;
    const p = S.players[me()];
    $("phasePill").textContent = ({
      deploy: "DEPLOY HQs",
      defense: "DEFENSE", offense: "OFFENSE", resolve: "ATTACK PLAYBACK",
      enemy: "ENEMY RESPONSE", end: S.over === "win" ? "VICTORY" : "DEFEAT"
    })[S.phase] || S.phase;
    $("resHud").innerHTML = `
      <span>Turn <b>${S.turn}</b></span>
      <span>Credits <b>${p.credits}</b></span>
      <span>Fuel <b>${p.fuel}</b></span>
      <span>Power <b>${Math.max(0, powerOf(me()))}</b></span>
      <span>Campaign <b>${S.campaign}</b></span>
      <span>Island <b>#${S.seed}</b></span>
      <span>AI <b>${S.mode === "ai" ? S.ai.profile : "hot-seat"}</b></span>`;
    const ph = hqCount(me()), eh = hqCount(1 - me());
    $("hqPips").innerHTML = `YOU ${pips(ph, "me")} <span style="width:8px"></span> FOE ${pips(eh, "foe")}`;
    paintLeft();
    paintSel();
    paintBoard();
    $("btnEnd").disabled = S.phase === "resolve" || S.phase === "enemy" || S.phase === "end";
    $("btnSkip").disabled = S.phase !== "resolve";
    $("btnEnd").textContent = S.phase === "deploy" ? "Lock 3 command centres →"
      : S.phase === "defense" ? "Commit defenses →" : S.phase === "offense" ? "Launch attacks →" : "End phase";
    $("dockStatus").textContent = S.phase === "deploy"
      ? `${me() === 0 ? "South" : "North"}: place ${3 - hqCount(me())} more Command Centre(s) on your island. Click an HQ to pick it up.`
      : S.phase === "defense"
      ? "Build in HQ/relay range (green). Place Command Relays to expand. Select a structure to repair or bulldoze."
      : S.phase === "offense"
        ? "Click black fog to probe (Battleship). Radar discs and strikes lift the dark."
        : S.phase === "resolve" ? "Playback — or skip." : "";
    const el = $("log");
    if (el) el.textContent = (S.log || []).join("\n");
  }
  function pips(n, cls) {
    let s = "";
    for (let i = 0; i < 3; i++) s += `<i class="pip ${i < n ? cls : "dead"}"></i>`;
    return s;
  }

  function paintLeft() {
    const rail = $("leftRail");
    if (S.phase === "deploy") {
      const left = 3 - hqCount(me());
      rail.innerHTML = `<div class="panel"><h3>Command net</h3>
        <p class="sel-meta">${me() === 0 ? "Southern" : "Northern"} commander — drop ${left} Command Centre${left === 1 ? "" : "s"} on your land. Cluster or spread. Click a placed HQ to pick it up.</p>
        ${itemBtn("hq", BLD.hq.name, BLD.hq.desc, left + " left", ASSET + SPR_FILES.hq, true, false)}
      </div>`;
      return;
    }
    if (S.phase === "defense") {
      const cats = ["core", "economy", "production", "intel", "defense", "decoy", "offense"];
      let html = `<p class="cat">Build</p>`;
      for (const c of cats) {
        html += `<div class="cat">${c}</div>`;
        for (const [k, b] of Object.entries(BLD)) {
          if (b.cat !== c || k === "hq") continue;
          const lock = b.unlock && !unlocked(b.unlock);
          html += itemBtn(k, b.name, b.desc, b.cost + "c", ASSET + SPR_FILES[b.spr], tool === k, lock);
        }
      }
      rail.innerHTML = html;
      rail.querySelectorAll("[data-k]").forEach((el) => {
        el.onclick = () => { if (el.disabled) return; tool = el.dataset.k; weapon = null; paintUI(); };
      });
    } else if (S.phase === "offense") {
      let html = `<p class="cat">Strike package</p>`;
      for (const [k, w] of Object.entries(WPN)) {
        const lock = w.unlock && !unlocked(w.unlock);
        const left = shotsLeft(me(), k);
        const need = (w.need && !livePads(me(), w.need).length) || left <= 0;
        html += itemBtn(k, w.name, w.desc, left < 99 ? `${w.cost}c · ${left} left` : `${w.cost}c · ${w.fuel}f`, ASSET + (k === "airstrike" ? SPR_FILES.jet : SPR_FILES.missile), weapon === k, lock || need);
      }
      rail.innerHTML = html;
      rail.querySelectorAll("[data-k]").forEach((el) => {
        el.onclick = () => {
          if (el.disabled) return;
          weapon = el.dataset.k;
          tool = null;
          if (weapon === "sat") queueStrike(me(), "sat", 0, 0);
          paintUI();
        };
      });
    } else {
      rail.innerHTML = `<div class="panel"><h3>Playback</h3><p class="sel-meta">Missiles, drops, and gunfire resolve in sequence. Marines march toward enemy command centres on their own.</p></div>`;
    }
  }

  function itemBtn(k, name, desc, cost, src, on, dis) {
    return `<button class="item ${on ? "on" : ""}" data-k="${k}" ${dis ? "disabled" : ""}>
      <img src="${src}" alt="">
      <span><div class="nm">${name}</div><div class="ds">${desc}</div></span>
      <span class="cost">${dis && !on ? "LOCK" : cost}</span>
    </button>`;
  }

  function paintSel() {
    const box = $("selPanel");
    if (!sel || !inB(sel.x, sel.y)) {
      box.innerHTML = `<h3>Tile</h3><p class="sel-meta">Your island is clear. The enemy island is black until a radar disc, probe, or strike lights a tile — like Battleship. Stale scans fade after a few turns but leave a ghost.</p>`;
      return;
    }
    const vis = visible(me(), sel.x, sel.y);
    const mem = hasMemory(me(), sel.x, sel.y);
    const terr = vis ? S.tiles[sel.y][sel.x] : (mem ? S.lastSeen[me()][sel.y][sel.x].terr : "unknown");
    const b = buildingAt(sel.x, sel.y);
    const u = unitAt(sel.x, sel.y);
    let html = `<h3>${sel.x},${sel.y} · ${terr}${vis ? "" : (mem ? " · last seen" : " · FOG")}</h3>`;
    if (!vis && !onHome(me(), sel.x, sel.y)) {
      if (!mem) {
        html += `<p class="sel-meta">Unknown water or land. Probe this tile or raise a radar.</p>`;
        box.innerHTML = html; return;
      }
      const ghost = S.lastSeen[me()][sel.y][sel.x];
      html += `<p class="sel-meta">Stale intel. ${ghost.b ? "Last contact: " + (BLD[ghost.b.type] ? BLD[ghost.b.type].name : ghost.b.type) : "No structure when last scanned."} Probe again to refresh.</p>`;
      box.innerHTML = html; return;
    }
    if (b) {
      html += `<p class="nm">${b.fake && b.owner === 1 ? BLD.hq.name : BLD[b.type].name} Mk${b.lvl}${b.wrecked ? " · WRECK" : ""}</p>
        <div class="hpbar"><i style="width:${(b.hp / b.max) * 100}%"></i></div>
        <p class="sel-meta">${b.hp}/${b.max} HP · ${b.owner === me() ? "friendly" : "hostile"}${b.offline ? " · OFFLINE" : ""}${b.wrecked ? " · wrecked" : ""}</p>`;
      if (b.owner === me() && S.phase === "defense") {
        html += `<div class="row">
          ${!b.wrecked && b.lvl < 3 ? `<button class="btn" id="upg">Upgrade (${Math.round(BLD[b.type].cost * 0.55 * b.lvl)}c)</button>` : ""}
          ${(b.wrecked || b.hp < b.max) ? `<button class="btn" id="rep">${b.repairTick ? "Repairing…" : "Repair 25% (" + repairCost(b) + "c)"}</button>` : ""}
          ${b.type !== "hq" ? `<button class="btn" id="doze">Bulldoze (no refund)</button>` : ""}
          ${!b.wrecked && (b.type === "factory" || b.type === "hangar") ? `<button class="btn" id="trM">Train marine</button>` : ""}
          ${!b.wrecked && b.type === "factory" && unlocked("scout") ? `<button class="btn" id="trS">Train scout</button>` : ""}
          ${!b.wrecked && b.type === "hangar" && unlocked("tank") ? `<button class="btn" id="trT">Build tank</button>` : ""}
        </div>`;
      }
    }
    if (u) html += `<p class="sel-meta">${UNIT[u.type].name} ${u.hp}/${u.max}</p>`;
    box.innerHTML = html;
    const bind = (id, fn) => { const e = $(id); if (e) e.onclick = fn; };
    bind("upg", () => { tryUpgrade(b); paintUI(); });
    bind("rep", () => { tryRepair(b); paintUI(); });
    bind("doze", () => { tryBulldoze(b); paintUI(); });
    bind("trM", () => { tryTrain(b, "marine"); paintUI(); });
    bind("trS", () => { tryTrain(b, "scout"); paintUI(); });
    bind("trT", () => { tryTrain(b, "tank"); paintUI(); });
  }

  function paintBoard() {
    const el = $("boardPanel");
    const rows = persist.board.slice(0, 8).map((r, i) =>
      `<tr><td>${i + 1}</td><td>${esc(r.name)}</td><td>${r.score}</td><td>${r.diff}</td></tr>`).join("");
    el.innerHTML = `<h3>Leaderboard</h3>
      <p class="sel-meta">Wins ${persist.wins} · Best ${persist.best} · Prestige ${persist.prestige}</p>
      <table class="lb"><thead><tr><th>#</th><th>Name</th><th>Score</th><th>Diff</th></tr></thead>
      <tbody>${rows || "<tr><td colspan=4>No sorties yet.</td></tr>"}</tbody></table>`;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  /* ---------- overlay ---------- */
  function showOverlay(html, kind) {
    const o = $("overlay");
    o.className = "overlay show" + (kind ? " " + kind : "");
    o.innerHTML = kind === "menu" ? html : `<div class="modal">${html}</div>`;
  }
  function hideOverlay() { $("overlay").className = "overlay"; $("overlay").innerHTML = ""; }

  function showMenu() {
    overlayMode = "menu";
    const sizeOpts = MAP_SIZES.map((m) =>
      `<option value="${m.n}" ${(persist.mapN || 48) === m.n ? "selected" : ""}>${m.label}</option>`).join("");
    const diffOpts = Object.keys(DIFF).map((k) =>
      `<option value="${k}" ${k === "normal" ? "selected" : ""}>${DIFF[k].label}</option>`).join("");
    showOverlay(`
      <div class="title-screen">
        <div class="title-art">
          <img src="./assets/menu.jpg" alt="Lattice Marines island fortress">
          <div class="title-art-fade"></div>
        </div>
        <div class="title-panel">
          <p class="kicker">Δ9Φ963 · chatagent.ca</p>
          <h1>LATTICE MARINES</h1>
          <p class="title-tag">Place three command centres. Probe the fog. Watch the island burn.</p>
          <p>You deploy your own HQs — bunker them in a cluster or scatter them. Maps run up to 80×80. Radio from the listen portal keeps playing if you hide the dock.</p>
          <div class="row">
            <label>Commander <input id="nm" maxlength="18" value="${esc(persist.name)}"></label>
            <label>Map
              <select id="ms">${sizeOpts}</select>
            </label>
            <label>Difficulty
              <select id="df">${diffOpts}</select>
            </label>
            <label>Mode
              <select id="md"><option value="ai">vs Adaptive AI</option><option value="hotseat">Hot-seat</option></select>
            </label>
            <label>Seed <input id="sd" placeholder="blank = new random" value=""></label>
          </div>
          <div class="row">
            <button class="btn gold" id="go">Deploy campaign ${persist.campaign}</button>
            <button class="btn" id="fresh">New island</button>
            <button class="btn" id="menuRadio">Play radio</button>
          </div>
          <p class="sel-meta">Wins ${persist.wins} · Best ${persist.best} · Prestige ${persist.prestige} · Unlocks: ${Object.keys(persist.unlocks).filter((k) => persist.unlocks[k]).join(", ") || "starter kit"}</p>
          <p class="sel-meta"><b>Deploy</b> 3 HQs → <b>Defense</b> build → <b>Offense</b> probe the black → <b>Playback</b>.</p>
          <div class="row">
            <a class="paypal-mini" href="https://www.paypal.com/paypalme/ExcavationPro" target="_blank" rel="noopener noreferrer">PayPal.me/ExcavationPro</a>
            <a class="btn ghost" href="https://asiancoastline.com/listen.html" target="_blank" rel="noopener">Listen portal</a>
            <a class="btn ghost" href="https://deepseekoracle.github.io/lygo-protocol-stack/HavenStarChart.html" target="_blank" rel="noopener">Star Chart</a>
          </div>
        </div>
      </div>
    `, "menu");
    $("go").onclick = () => startFromForm(false);
    $("fresh").onclick = () => startFromForm(true);
    $("menuRadio").onclick = () => { const b = $("radioPlay"); if (b) b.click(); };
  }
  function startFromForm(resetCamp) {
    persist.name = ($("nm").value || "Commander").slice(0, 18);
    persist.mapN = Number($("ms").value) || 48;
    savePersist();
    if (resetCamp) persist.campaign = Math.max(1, persist.campaign);
    const typed = ($("sd") && $("sd").value || "").trim();
    const seed = (!resetCamp && typed) ? (Number(typed) >>> 0 || hashSeed(typed)) : ((Math.random() * 0xFFFFFFFF) >>> 0);
    newMatch({
      seed,
      diff: $("df").value,
      campaign: persist.campaign,
      mode: $("md").value,
      mapN: persist.mapN
    });
  }

  function showHelp() {
    showOverlay(`
      <h2>Field manual</h2>
      <p><b>Salvo:</b> one rocket per live silo, one ICBM per ICBM silo, one hangar launch (marine / tank / airstrike), one EMP per tower. Each AA fires once per incoming wave. Repair is 25% HP per turn for 25% of the build cost — not instant.</p>
      <p><b>Win:</b> level all three enemy Command Centres. <b>Lose:</b> yours fall. Score rewards wreckage, surviving kit, and a brisk economy; long wars pay a time tax. Wins unlock scouts, tanks, shields, ICBMs, EMP, airstrikes, and the spy satellite. After 10 wins you prestige for a score multiplier.</p>
      <p>Left-drag or WASD pan, wheel zoom. Click a building in the list, then a tile — the palette does not stay “hot” by default. Enter commits the phase. Esc cancels a tool. Hot-seat is local only — no server. AI profiles: Aggressor, Turtle, Economist, Intelligence.</p>
      <div class="row"><button class="btn gold" id="ok">Close</button></div>
    `);
    overlayMode = "help";
    $("ok").onclick = () => { hideOverlay(); overlayMode = null; };
  }

  function showEnd() {
    const title = S.over === "win" ? "Island secured" : "Command net down";
    showOverlay(`
      <h2>${title}</h2>
      <p>Score <b>${S.score}</b> · ${S.diff} · ${S.ai.profile} · ${S.turn} turns</p>
      <p class="sel-meta">Buildings wrecked ${S.players[0].stats.bKill} · Units down ${S.players[0].stats.uKill} · Best ${persist.best}</p>
      <div class="row">
        <button class="btn gold" id="again">${S.over === "win" ? "Next campaign island" : "Retry island"}</button>
        <button class="btn" id="mm">Main menu</button>
        <a class="paypal-mini" href="https://www.paypal.com/paypalme/ExcavationPro" target="_blank" rel="noopener noreferrer">PayPal tip</a>
      </div>
    `);
    $("again").onclick = () => newMatch({ seed: Math.floor(Math.random() * 1e9), diff: S.diff, campaign: persist.campaign, mode: S.mode, mapN: S.mapN || persist.mapN });
    $("mm").onclick = showMenu;
  }

  /* ---------- input ---------- */
  function resize() { /* canvas tracks client in draw */ }

  function clickTile(t) {
    if (!inB(t.x, t.y)) return;
    sel = t;
    if (S.phase === "deploy") {
      const b = buildingAt(t.x, t.y);
      if (b && b.owner === me() && b.type === "hq") {
        S.buildings = S.buildings.filter((x) => x.id !== b.id);
        toast("Picked up a Command Centre. Place it again.");
        fx("ui");
        paintUI();
        return;
      }
      tryBuild("hq", me(), t.x, t.y);
      paintUI();
      return;
    }
    if (S.phase === "defense" && tool) {
      tryBuild(tool, me(), t.x, t.y);
    } else if (S.phase === "offense" && weapon) {
      queueStrike(me(), weapon, t.x, t.y);
    } else fx("select");
    paintUI();
  }
  function onDown(e) {
    if (!S || overlayMode) return;
    const r = canvas().getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    downPt = { mx, my, button: e.button, t: pickTile(mx, my) };
    didDrag = false;
    lastM = { mx, my };
    dragging = e.button === 1 || e.button === 2 || e.shiftKey;
    if (e.button !== 0) e.preventDefault();
  }
  function onMove(e) {
    if (!S) return;
    const r = canvas().getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    hover = pickTile(mx, my);
    if (hover && inB(hover.x, hover.y)) {
      const vis = visible(me(), hover.x, hover.y);
      const mem = hasMemory(me(), hover.x, hover.y);
      const home = onHome(me(), hover.x, hover.y);
      let label;
      if (home || vis) {
        label = `${hover.x},${hover.y} ${S.tiles[hover.y][hover.x]}`;
        if (S.phase === "defense" && tool && tool !== "hq" && home && S.tiles[hover.y][hover.x] !== "water") {
          const te = terrainAllows(tool, S.tiles[hover.y][hover.x]);
          if (te) label += "  · " + te;
          else label += inBuildNet(me(), hover.x, hover.y) ? "  · in range" : "  · OUT OF RANGE";
        }
      }
      else if (mem) label = `${hover.x},${hover.y} last seen ${S.lastSeen[me()][hover.y][hover.x].terr}`;
      else label = `${hover.x},${hover.y}  unknown fog`;
      $("hint").textContent = label;
    } else $("hint").textContent = "";
    if (downPt && lastM) {
      const dx = mx - downPt.mx, dy = my - downPt.my;
      if (!didDrag && Math.hypot(dx, dy) > 8) {
        didDrag = true;
        dragging = true;
      }
    }
    if (dragging && lastM) {
      cam.x += mx - lastM.mx;
      cam.y += my - lastM.my;
      lastM = { mx, my };
    }
  }
  function onUp(e) {
    if (downPt && !didDrag && e.button === 0 && S && !overlayMode) clickTile(downPt.t);
    dragging = false; downPt = null; didDrag = false; lastM = null;
  }
  function onWheel(e) {
    e.preventDefault();
    const r = canvas().getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const z0 = cam.z;
    cam.z = Math.max(0.45, Math.min(1.85, cam.z * (e.deltaY > 0 ? 0.9 : 1.1)));
    cam.x = mx - (mx - cam.x) * (cam.z / z0);
    cam.y = my - (my - cam.y) * (cam.z / z0);
  }
  function onKey(e) {
    if (overlayMode === "menu" || overlayMode === "help") return;
    const step = 28;
    if (e.key === "w" || e.key === "ArrowUp") cam.y += step;
    if (e.key === "s" || e.key === "ArrowDown") cam.y -= step;
    if (e.key === "a" || e.key === "ArrowLeft") cam.x += step;
    if (e.key === "d" || e.key === "ArrowRight") cam.x -= step;
    if (e.key === "Enter") { e.preventDefault(); $("btnEnd").click(); }
    if (e.key === "Escape") { tool = null; weapon = null; paintUI(); }
    if (e.key === " ") { e.preventDefault(); if (S && S.phase === "resolve") skipPlayback(); }
  }

  function skipPlayback() {
    if (!S || S.phase !== "resolve") return;
    S.skipping = true;
    while (S.phase === "resolve") stepResolve();
    if (S) S.skipping = false;
  }

  /* ---------- game SFX (WebAudio, independent of radio mute) ---------- */
  let AC = null;
  function ac() {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume().catch(() => {});
    return AC;
  }
  function envGain(a, peak, attack, dur) {
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, a.currentTime);
    g.gain.exponentialRampToValueAtTime(peak, a.currentTime + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    g.connect(a.destination);
    return g;
  }
  function osc(a, type, f0, f1, dur, peak) {
    const o = a.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, a.currentTime);
    if (f1 != null) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), a.currentTime + dur);
    o.connect(envGain(a, peak, 0.008, dur));
    o.start(); o.stop(a.currentTime + dur + 0.02);
  }
  function noiseBurst(a, dur, peak, hp) {
    const n = a.sampleRate * dur | 0;
    const buf = a.createBuffer(1, n, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.4);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = hp ? "highpass" : "lowpass"; f.frequency.value = hp || 420;
    src.connect(f); f.connect(envGain(a, peak, 0.004, dur));
    src.start();
  }
  function fx(kind) {
    if (S && S.skipping) return;
    try {
      const a = ac();
      switch (kind) {
        case "ui": osc(a, "triangle", 880, 880, 0.05, 0.03); break;
        case "build": osc(a, "square", 180, 90, 0.12, 0.04); osc(a, "triangle", 520, 260, 0.1, 0.02); break;
        case "select": osc(a, "sine", 640, 720, 0.06, 0.025); break;
        case "error": osc(a, "sawtooth", 140, 70, 0.16, 0.04); break;
        case "probe": osc(a, "sine", 920, 420, 0.22, 0.045); osc(a, "sine", 1380, 700, 0.18, 0.02); break;
        case "launch": osc(a, "sawtooth", 240, 70, 0.28, 0.05); noiseBurst(a, 0.18, 0.03, 900); break;
        case "drop": osc(a, "triangle", 110, 48, 0.2, 0.05); noiseBurst(a, 0.12, 0.025, 200); break;
        case "boom": noiseBurst(a, 0.28, 0.07, 180); osc(a, "sawtooth", 90, 32, 0.26, 0.05); break;
        case "aa": osc(a, "square", 1400, 400, 0.12, 0.035); break;
        case "emp": osc(a, "square", 80, 40, 0.35, 0.04); noiseBurst(a, 0.3, 0.04, 1200); break;
        case "radar": osc(a, "sine", 480, 1600, 0.4, 0.02); break;
        case "phase": osc(a, "triangle", 330, 990, 0.18, 0.03); break;
        case "win": osc(a, "triangle", 523, 784, 0.35, 0.04); setTimeout(() => { try { osc(ac(), "triangle", 659, 1046, 0.4, 0.04); } catch (_) {} }, 140); break;
        case "lose": osc(a, "sawtooth", 196, 80, 0.5, 0.045); break;
        default: osc(a, "sine", 440, 440, 0.05, 0.03);
      }
    } catch (_) {}
  }
  function beep(f, d) { fx(f > 700 ? "probe" : f > 500 ? "launch" : "build"); void d; }
  function bang() { fx("boom"); }

  /* ---------- loop / boot ---------- */
  function loop() {
    if (S && S.phase === "resolve") {
      stepResolve();
      if (S && S.t % 8 === 0) {
        const el = $("log");
        if (el) el.textContent = (S.log || []).join("\n");
      }
    }
    draw();
    raf = requestAnimationFrame(loop);
  }

  async function boot() {
    loadPersist();
    autoUnlock();
    const names = Object.keys(SPR_FILES);
    let n = 0;
    function keySprite(img, tile) {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth || img.width;
      c.height = img.naturalHeight || img.height;
      const x = c.getContext("2d");
      x.drawImage(img, 0, 0);
      const id = x.getImageData(0, 0, c.width, c.height);
      const d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const mag = r > 180 && b > 100 && g < 90 && r - g > 70;
        const hot = r > 220 && g < 70 && b > 80;
        if (mag || hot) d[i + 3] = 0;
        void tile;
      }
      x.putImageData(id, 0, 0);
      return c;
    }
    await Promise.all(names.map((k) => new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        SPR[k] = String(k).startsWith("tex-") ? img : keySprite(img, false);
        n++; $("bootMsg").textContent = `Assets ${n}/${names.length}`; res();
      };
      img.onerror = () => { SPR[k] = null; n++; res(); };
      img.src = ASSET + SPR_FILES[k];
    })));
    $("boot").classList.add("hidden");
    $("app").classList.remove("hidden");
    const cv = canvas();
    cv.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    cv.addEventListener("wheel", onWheel, { passive: false });
    cv.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", resize);
    $("btnEnd").onclick = () => {
      if (!S) return;
      if (S.phase === "deploy") endDeploy();
      else if (S.phase === "defense") endDefense();
      else if (S.phase === "offense") endOffense();
    };
    $("btnSkip").onclick = skipPlayback;
    $("btnHelp").onclick = showHelp;
    $("btnMenu").onclick = () => {
      if (enemyTimer) { clearTimeout(enemyTimer); enemyTimer = 0; }
      S = null;
      showMenu();
    };
    loop();
    showMenu();
  }

  boot();
})();
