/* Lattice Marines — isometric three-phase island war. Local AI, fog, campaign. */
(() => {
  const MAP = 26;
  const TW = 72, TH = 36;
  const SAVE = "lygo_lattice_marines_v1";
  const ASSET = "./assets/";

  const SPR_FILES = {
    plains: "tile-plains.png", hills: "tile-hills.png", forest: "tile-forest.png",
    water: "tile-water.png", ruins: "tile-ruins.png",
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
    radar:   { name: "Radar Tower", cost: 180, hp: 65, pwr: 1, cat: "intel", spr: "radar",
               desc: "Reveals a scan disc on the enemy half each turn." },
    sat:     { name: "Spy Satellite", cost: 520, hp: 55, pwr: 3, cat: "intel", spr: "sat", unlock: "sat",
               desc: "Reveal the whole map for 1 turn. Cooldown 4." },
    gun:     { name: "Gun Pod", cost: 100, hp: 95, pwr: 0, cat: "defense", spr: "gun",
               desc: "Auto-fires on nearby ground units." },
    aa:      { name: "AA Launcher", cost: 160, hp: 75, pwr: 1, cat: "defense", spr: "aa",
               desc: "Chance to intercept missiles and ICBMs." },
    mine:    { name: "Minefield", cost: 55, hp: 28, pwr: 0, cat: "defense", spr: "mine",
               desc: "Damages the first ground unit that steps in." },
    shield:  { name: "Shield Generator", cost: 280, hp: 80, pwr: 1, cat: "defense", spr: "shield", unlock: "shield",
               desc: "Absorbs missile splash in radius 2 (charges = 2)." },
    emp:     { name: "EMP Tower", cost: 300, hp: 70, pwr: 2, cat: "defense", spr: "emp", unlock: "emp",
               desc: "Queue an EMP to silence electronics 1 turn." },
    fake:    { name: "Decoy HQ", cost: 80, hp: 42, pwr: 0, cat: "decoy", spr: "fake",
               desc: "Looks like a command centre until it detonates." },
    silo:    { name: "Missile Silo", cost: 220, hp: 90, pwr: 1, cat: "offense", spr: "silo",
               desc: "Queue conventional missiles (medium damage)." },
    icbm:    { name: "ICBM Silo", cost: 420, hp: 95, pwr: 2, cat: "offense", spr: "icbm", unlock: "icbm",
               desc: "Cross-map devastation. Costly. Interceptable." }
  };

  const WPN = {
    probe:     { name: "Probe shot", cost: 25, fuel: 0, dmg: 10, r: 0, reveal: 1,
                 desc: "Battleship ping — reveal 3×3, light damage." },
    missile:   { name: "Cruise missile", cost: 90, fuel: 2, dmg: 52, r: 1, need: "silo",
                 desc: "Needs a Missile Silo. Area blast." },
    icbm:      { name: "ICBM", cost: 190, fuel: 6, dmg: 135, r: 2, need: "icbm",
                 desc: "Needs an ICBM Silo. Huge crater." },
    drop:      { name: "Marine drop", cost: 75, fuel: 3, need: "hangar", spawn: "marine",
                 desc: "Drop an autonomous marine on a tile." },
    tankdrop:  { name: "Tank drop", cost: 150, fuel: 4, need: "hangar", spawn: "tank", unlock: "tank",
                 desc: "Heavy armour. Slow cannon." },
    scout:     { name: "Scout run", cost: 55, fuel: 2, need: "factory", spawn: "scout", unlock: "scout",
                 desc: "Fast. Reveals a line. No attack." },
    airstrike: { name: "Airstrike", cost: 170, fuel: 4, dmg: 78, r: 1, unlock: "airstrike",
                 desc: "Jet bombs a cluster. Can be flakked." },
    emp:       { name: "EMP pulse", cost: 85, fuel: 2, need: "emp", emp: true, unlock: "emp",
                 desc: "Silence radars, AA, silos, sat 1 turn." },
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
  const $ = (id) => document.getElementById(id);
  const canvas = () => $("iso");
  const ctxOf = () => canvas().getContext("2d");

  let cam = { x: 0, y: 0, z: 1 };
  let S = null;
  let hover = null, sel = null, tool = null, weapon = null;
  let dragging = false, lastM = null;
  let tFrame = 0, raf = 0;
  let overlayMode = "menu";

  const persist = {
    name: "Commander",
    unlocks: {},
    pts: 0,
    wins: 0,
    campaign: 1,
    prestige: 0,
    best: 0,
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
    const R = rng(seed);
    const tiles = Array.from({ length: MAP }, () => Array(MAP).fill("water"));
    const paint = (cx, cy, rad) => {
      for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
        const n = (R() - 0.5) * 3.2;
        if (Math.hypot(x - cx, y - cy) < rad + n) tiles[y][x] = "plains";
      }
    };
    paint(MAP * 0.68, MAP * 0.72, 8.2);
    paint(MAP * 0.30, MAP * 0.28, 8.2);
    if (R() > 0.35) paint(MAP * 0.5, MAP * 0.5, 3.4);
    for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
      if (tiles[y][x] === "water") continue;
      const r = R();
      if (r < 0.14) tiles[y][x] = "hills";
      else if (r < 0.26) tiles[y][x] = "forest";
      else if (r < 0.32) tiles[y][x] = "ruins";
    }
    return tiles;
  }

  function landTiles(owner) {
    const out = [];
    for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
      if (S.tiles[y][x] === "water") continue;
      const south = y >= MAP / 2;
      if ((owner === 0 && south) || (owner === 1 && !south)) out.push({ x, y });
    }
    return out;
  }

  function occupied(x, y) {
    return S.buildings.some((b) => b.x === x && b.y === y && b.hp > 0)
      || S.units.some((u) => u.x === x && u.y === y && u.hp > 0);
  }

  function buildingAt(x, y) { return S.buildings.find((b) => b.x === x && b.y === y && b.hp > 0); }
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
      if (b.owner !== owner || b.hp <= 0) continue;
      p -= BLD[b.type].pwr * (b.offline ? 0 : 1);
    }
    return p;
  }

  function newMatch(opts) {
    const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 1e9) | 0);
    const R = rng(seed);
    S = {
      seed, R,
      tiles: genMap(seed),
      buildings: [],
      units: [],
      fog: [grid(false), grid(false)],
      lastSeen: [grid(null), grid(null)],
      fogAge: [grid(0), grid(0)],
      players: [
        { credits: 900, fuel: 6, emp: 0, satCD: 0, stats: zeroStats() },
        { credits: Math.round(900 * DIFF[opts.diff].eco * (1 + (opts.campaign - 1) * 0.12)),
          fuel: 6, emp: 0, satCD: 0, stats: zeroStats() }
      ],
      phase: "defense",
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
    placeHQs(0, R);
    placeHQs(1, R);
    for (const o of [0, 1]) {
      for (const t of landTiles(o)) reveal(o, t.x, t.y, 0);
      radarSweep(o);
    }
    tickEconomy(true);
    focusOwner(me());
    log(`Island seeded ${seed}. Enemy profile: ${S.ai.profile}. Campaign ${S.campaign}.`);
    sel = null; tool = null; weapon = null;
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
    const land = landTiles(owner).filter((t) => S.tiles[t.y][t.x] !== "water");
    land.sort((a, b) => {
      const ca = owner === 0 ? a.y - b.y : b.y - a.y;
      return ca;
    });
    const picks = [];
    for (const t of land) {
      if (picks.length >= 3) break;
      if (picks.some((p) => dist(p, t) < 3)) continue;
      if (S.tiles[t.y][t.x] === "water") continue;
      picks.push(t);
    }
    while (picks.length < 3 && land.length) {
      const t = land[Math.floor(R() * land.length)];
      if (!picks.some((p) => p.x === t.x && p.y === t.y)) picks.push(t);
    }
    for (const t of picks.slice(0, 3)) spawnB("hq", owner, t.x, t.y);
  }

  function spawnB(type, owner, x, y, lvl = 1) {
    const def = BLD[type];
    const b = {
      id: S.uid++, type, owner, x, y, lvl,
      hp: def.hp + (lvl - 1) * 25, max: def.hp + (lvl - 1) * 25,
      charges: type === "shield" ? 2 : 0,
      cd: 0, fake: type === "fake", offline: false
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
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const tx = x + dx, ty = y + dy;
      if (!inB(tx, ty)) continue;
      if (opts && opts.radar && S.tiles[ty][tx] === "forest") continue;
      S.fog[viewer][ty][tx] = true;
      S.fogAge[viewer][ty][tx] = S.turn + 3;
      const b = buildingAt(tx, ty);
      const u = unitAt(tx, ty);
      S.lastSeen[viewer][ty][tx] = {
        b: b && b.owner !== viewer ? { type: b.fake ? "hq" : b.type, hp: b.hp } : null,
        u: u && u.owner !== viewer ? { type: u.type } : null
      };
    }
  }

  function visible(viewer, x, y) {
    if (!inB(x, y)) return false;
    const south = y >= MAP / 2;
    if ((viewer === 0 && south) || (viewer === 1 && !south)) return true;
    return S.fog[viewer][y][x];
  }

  function radarSweep(owner) {
    const radars = S.buildings.filter((b) => b.owner === owner && b.type === "radar" && b.hp > 0 && !b.offline);
    for (const r of radars) {
      const scanX = r.x;
      const scanY = owner === 0 ? Math.round(MAP * 0.28) : Math.round(MAP * 0.72);
      const range = 3 + r.lvl;
      reveal(owner, scanX, scanY, range, { radar: true });
    }
    const sats = S.buildings.filter((b) => b.owner === owner && b.type === "sat" && b.hp > 0 && b.cd === 0 && !b.offline);
    /* sat is an offense action, not auto */
    void sats;
  }

  function tickEconomy(first) {
    for (const o of [0, 1]) {
      const p = S.players[o];
      let inc = 40;
      for (const b of S.buildings) {
        if (b.owner !== o || b.hp <= 0 || b.offline) continue;
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
    const south = y >= MAP / 2;
    if ((owner === 0 && !south) || (owner === 1 && south)) return "Build only on your half.";
    if (occupied(x, y)) return "Tile occupied.";
    if (!unlocked(BLD[type].unlock)) return "Locked.";
    if (S.players[owner].credits < BLD[type].cost) return "Not enough credits.";
    if (type === "hq") return "Command centres are already placed.";
    return null;
  }

  function tryBuild(type, owner, x, y) {
    const err = canBuild(type, owner, x, y);
    if (err) { toast(err); return false; }
    pay(owner, BLD[type].cost, 0);
    spawnB(type, owner, x, y);
    log(`${owner === 0 ? "You" : "Enemy"} raise a ${BLD[type].name} at ${x},${y}.`);
    beep(440, 0.06);
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

  function queueStrike(owner, kind, x, y) {
    const w = WPN[kind];
    if (!w) return;
    if (w.unlock && !unlocked(w.unlock)) return toast("Weapon locked.");
    if (w.need && !countB(w.need, owner)) return toast("Need a " + BLD[w.need].name + ".");
    if (!canAfford(owner, w.cost, w.fuel)) return toast("Need credits/fuel.");
    if (w.sat) {
      if (S.players[owner].satCD > 0) return toast("Satellite recharging (" + S.players[owner].satCD + ").");
      pay(owner, w.cost, w.fuel);
      for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
        const south = y >= MAP / 2;
        if ((owner === 0 && !south) || (owner === 1 && south)) reveal(owner, x, y, 0);
      }
      S.players[owner].satCD = 4;
      log("Spy satellite paints the theatre.");
      beep(880, 0.08);
      paintUI();
      return;
    }
    if (!inB(x, y)) return;
    const south = y >= MAP / 2;
    if ((owner === 0 && south) || (owner === 1 && !south)) return toast("Strike the enemy half.");
    pay(owner, w.cost, w.fuel);
    S.queue.push({ owner, kind, x, y });
    reveal(owner, x, y, w.reveal || 0);
    log(`${owner === 0 ? "You" : "Enemy"} queued ${w.name} @ ${x},${y}.`);
    beep(660, 0.05);
  }

  function endDefense() {
    if (S.phase !== "defense") return;
    S.phase = "offense";
    tool = null; weapon = "probe";
    log("Offense phase — probe the fog or fire what you built.");
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
    let t = 8;
    for (const q of shots) {
      S.events.push({ at: t, kind: "shot", q });
      t += 18;
    }
    S.events.push({ at: t + 8, kind: "autoguns" });
    S.events.push({ at: t + 20, kind: "march" });
    S.events.push({ at: t + 34, kind: "done" });
    S.queue = S.queue.filter((q) => q.owner !== owner);
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
      if (e.kind === "done") finishResolve();
    }
    S.fx = S.fx.filter((f) => {
      f.life--;
      return f.life > 0;
    });
  }

  function fireShot(q) {
    const w = WPN[q.kind];
    const defender = 1 - q.owner;
    const from = nearestSilo(q.owner, q.kind, q) || hqCentroid(q.owner);
    S.fx.push({
      kind: q.kind === "airstrike" ? "jet" : q.kind === "drop" || q.kind === "tankdrop" || q.kind === "scout" ? "drop" : "missile",
      x0: from.x, y0: from.y, x1: q.x, y1: q.y, life: 16, max: 16
    });
    if (w.emp) {
      S.players[defender].emp = 1;
      for (const b of S.buildings) {
        if (b.owner === defender && ["radar", "aa", "silo", "icbm", "sat", "emp"].includes(b.type)) b.offline = true;
      }
      log("EMP silences enemy electronics.");
      boom(q.x, q.y);
      return;
    }
    let intercept = false;
    if (["missile", "icbm", "airstrike"].includes(q.kind)) {
      const aa = S.buildings.filter((b) => b.owner === defender && b.type === "aa" && b.hp > 0 && !b.offline);
      const chance = DIFF[S.diff].aa + aa.length * 0.08;
      if (aa.length && S.R() < chance) intercept = true;
    }
    if (intercept) {
      log(`${w.name} intercepted by AA.`);
      boom(q.x, q.y);
      return;
    }
    if (w.spawn) {
      if (S.tiles[q.y][q.x] === "water") { log("Drop lost at sea."); return; }
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
      } else {
        if (unitAt(q.x, q.y)) {
          const n = neighbors(q.x, q.y).find((t) => inB(t.x, t.y) && !occupied(t.x, t.y) && S.tiles[t.y][t.x] !== "water");
          if (n) spawnU(w.spawn, q.owner, n.x, n.y);
        } else spawnU(w.spawn, q.owner, q.x, q.y);
      }
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
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const tx = x + dx, ty = y + dy;
      if (!inB(tx, ty)) continue;
      const fall = 1 - Math.max(Math.abs(dx), Math.abs(dy)) * 0.28;
      const d = Math.round(dmg * Math.max(0.4, fall));
      const sh = S.buildings.find((b) => b.owner !== attacker && b.type === "shield" && b.hp > 0 && b.charges > 0 && dist(b, { x: tx, y: ty }) <= 2);
      let dealt = d;
      if (sh) {
        sh.charges--;
        dealt = Math.max(0, d - 80);
        if (sh.charges <= 0) log("Shield generator exhausted.");
      }
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
      if (attacker != null) S.players[attacker].stats.bKill++;
      log(`${BLD[b.type].name} destroyed.`);
      boom(b.x, b.y);
      if (b.fake || b.type === "fake") {
        for (const u of S.units) {
          if (u.hp > 0 && dist(u, b) <= 2) hurtU(u, 28, b.owner);
        }
        log("Decoy HQ detonates!");
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
    const guns = S.buildings.filter((b) => b.type === "gun" && b.hp > 0 && !b.offline);
    for (const g of guns) {
      const foes = S.units.filter((u) => u.owner !== g.owner && u.hp > 0 && dist(u, g) <= 2);
      if (!foes.length) continue;
      foes.sort((a, b) => dist(a, g) - dist(b, g));
      hurtU(foes[0], 18 + g.lvl * 4, g.owner);
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
      const enemies = [
        ...S.buildings.filter((b) => b.owner !== u.owner && b.hp > 0 && b.type === "hq"),
        ...S.buildings.filter((b) => b.owner !== u.owner && b.hp > 0),
        ...S.units.filter((o) => o.owner !== u.owner && o.hp > 0)
      ];
      if (!enemies.length) continue;
      enemies.sort((a, b) => dist(a, u) - dist(b, u));
      const t = enemies[0];
      if (dist(t, u) <= (def.range || 1)) continue;
      let step = { x: u.x, y: u.y };
      if (Math.abs(t.x - u.x) > Math.abs(t.y - u.y)) step.x += Math.sign(t.x - u.x);
      else step.y += Math.sign(t.y - u.y);
      if (!inB(step.x, step.y) || S.tiles[step.y][step.x] === "water") continue;
      if (buildingAt(step.x, step.y) && buildingAt(step.x, step.y).owner !== u.owner) continue;
      if (unitAt(step.x, step.y)) continue;
      u.x = step.x; u.y = step.y;
      if (def.reveal) reveal(u.owner, u.x, u.y, 2);
    }
  }

  function finishResolve() {
    S.buildings = S.buildings.filter((b) => b.hp > 0);
    S.units = S.units.filter((u) => u.hp > 0);
    const pHQ = hqCount(0), eHQ = hqCount(1);
    if (pHQ <= 0 || eHQ <= 0) {
      S.over = pHQ > 0 ? "win" : "lose";
      S.phase = "end";
      tally();
      paintUI();
      showEnd();
      return;
    }
    if (S.mode === "ai") {
      if (S.resolveWho !== "enemy") enemyTurn();
      else nextTurn();
      return;
    }
    if (S.actor === 0) {
      S.actor = 1;
      S.phase = "defense";
      tool = "energy"; weapon = null;
      focusOwner(1);
      log("Hot-seat — pass the keyboard. Northern commander, fortify.");
      paintUI();
    } else {
      S.actor = 0;
      nextTurn();
    }
  }

  function nextTurn() {
    S.turn++;
    S.phase = "defense";
    for (const o of [0, 1]) {
      for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
        if (S.fogAge[o][y][x] && S.fogAge[o][y][x] < S.turn) S.fog[o][y][x] = false;
      }
      radarSweep(o);
    }
    S.players[0].emp = 0;
    S.players[1].emp = 0;
    for (const b of S.buildings) b.offline = false;
    tickEconomy(false);
    maybeSwitchAI();
    tool = "energy"; weapon = null;
    log(`Turn ${S.turn}. Defense — fortify the island.`);
    paintUI();
  }

  function maybeSwitchAI() {
    const d = DIFF[S.diff];
    if (S.R() > d.switch) return;
    const losing = hqCount(1) < hqCount(0) || countB("econ", 1) < countB("econ", 0);
    S.ai.profile = losing ? "Aggressor" : (S.R() > 0.5 ? "Turtle" : "Intelligence");
    S.ai.switches++;
    log(`Enemy doctrine shifts → ${S.ai.profile}.`);
  }

  function enemyTurn() {
    S.phase = "enemy";
    paintUI();
    aiDefense();
    aiOffense();
    setTimeout(() => startResolve("enemy"), 700);
  }

  function aiDefense() {
    const o = 1;
    const p = S.players[o];
    const profile = S.ai.profile;
    const want = [];
    const nE = countB("energy", o), nC = countB("econ", o), nR = countB("radar", o);
    const nG = countB("gun", o), nS = countB("silo", o), nH = countB("hangar", o), nA = countB("aa", o);
    if (nE < 3) want.push("energy", "energy");
    if (nC < (profile === "Economist" ? 5 : 3)) want.push("econ", "econ");
    if (nR < (profile === "Intelligence" ? 3 : 1)) want.push("radar");
    if (profile === "Turtle") want.push("gun", "aa", "gun", "shield", "mine");
    if (profile === "Aggressor") want.push("hangar", "silo", "factory", "silo");
    if (profile === "Intelligence") want.push("radar", "aa", "emp");
    want.push("silo", "gun", "aa", "hangar", "factory", "fake");
    if (unlocked("icbm") && (profile === "Turtle" || S.turn > 4)) want.push("icbm");
    const spots = landTiles(o).filter((t) => !occupied(t.x, t.y) && S.tiles[t.y][t.x] !== "water");
    const hqs = S.buildings.filter((b) => b.owner === o && b.type === "hq");
    spots.sort((a, b) => Math.min(...hqs.map((h) => dist(h, a))) - Math.min(...hqs.map((h) => dist(h, b))));
    for (const type of want) {
      if (!BLD[type] || (BLD[type].unlock && !unlocked(BLD[type].unlock))) continue;
      if (p.credits < BLD[type].cost) continue;
      const tile = spots.shift();
      if (!tile) break;
      tryBuild(type, o, tile.x, tile.y);
    }
    const fac = S.buildings.find((b) => b.owner === o && b.type === "factory" && b.hp > 0);
    if (fac && profile !== "Turtle") tryTrain(fac, "marine");
  }

  function aiOffense() {
    const o = 1;
    const vis = [];
    for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
      if (y < MAP / 2) continue;
      if (S.fog[o][y][x]) {
        const b = buildingAt(x, y);
        vis.push({ x, y, b });
      }
    }
    const hqs = vis.filter((v) => v.b && v.b.type === "hq");
    const valuable = vis.filter((v) => v.b && ["hq", "silo", "icbm", "econ", "radar"].includes(v.b.type));
    const fogTiles = [];
    for (let y = Math.floor(MAP / 2); y < MAP; y++) for (let x = 0; x < MAP; x++) {
      if (S.tiles[y][x] === "water") continue;
      if (!S.fog[o][y][x]) fogTiles.push({ x, y });
    }
    const aims = hqs.length ? hqs : (valuable.length ? valuable : []);
    const profile = S.ai.profile;
    const fire = (kind, t) => queueStrike(o, kind, t.x, t.y);
    let shots = profile === "Aggressor" ? 4 : profile === "Turtle" ? 2 : 3;
    shots = Math.round(shots * DIFF[S.diff].aim);
    if (countB("silo", o) && aims.length) {
      for (let i = 0; i < Math.min(shots, aims.length); i++) fire("missile", aims[i]);
    }
    if (countB("icbm", o) && hqs.length && (profile === "Turtle" || S.turn > 3)) fire("icbm", hqs[0]);
    if (countB("hangar", o) && (profile === "Aggressor" || S.R() > 0.5)) {
      const t = aims[0] || fogTiles[Math.floor(S.R() * fogTiles.length)];
      if (t) fire("drop", t);
    }
    while (S.players[o].credits >= 25 && shots-- > 0) {
      const t = fogTiles.length ? fogTiles.splice(Math.floor(S.R() * fogTiles.length), 1)[0] : aims[0];
      if (!t) break;
      fire("probe", t);
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
    cam.z = Math.max(0.7, Math.min(1.4, cv.height / 720));
    cam.x = cv.width / 2 - w.sx * cam.z;
    cam.y = cv.height / 2 - w.sy * cam.z;
  }

  function draw() {
    const cv = canvas(), ctx = ctxOf();
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== (w * dpr | 0) || cv.height !== (h * dpr | 0)) {
      cv.width = w * dpr | 0; cv.height = h * dpr | 0;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!S) return;
    const order = [];
    for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) order.push({ x, y, k: x + y });
    order.sort((a, b) => a.k - b.k);
    for (const t of order) drawTile(ctx, t.x, t.y);
    for (const t of order) drawOcc(ctx, t.x, t.y);
    for (const f of S.fx) drawFx(ctx, f);
    if (hover && inB(hover.x, hover.y)) drawDiamond(ctx, hover.x, hover.y, "rgba(34,211,238,.85)", false);
    if (sel) drawDiamond(ctx, sel.x, sel.y, "rgba(251,191,36,.95)", false);
    tFrame++;
  }

  function drawTile(ctx, x, y) {
    const vis = visible(me(), x, y);
    const terr = S.tiles[y][x];
    const img = SPR[terr];
    const p = iso(x, y);
    const tw = TW * cam.z, th = TH * cam.z;
    if (img) {
      const ih = tw * (img.height / img.width);
      ctx.globalAlpha = vis ? 1 : 0.22;
      ctx.drawImage(img, p.sx - tw / 2, p.sy - ih * 0.55, tw, ih);
      ctx.globalAlpha = 1;
    } else {
      fillDiamond(ctx, x, y, vis ? terrainColor(terr) : "#0b1220");
    }
    if (!vis) {
      fillDiamond(ctx, x, y, "rgba(4,8,16,.62)");
    }
  }

  function terrainColor(t) {
    return { plains: "#3f6b3a", hills: "#6b7280", forest: "#14532d", water: "#164e63", ruins: "#57534e" }[t] || "#222";
  }

  function drawOcc(ctx, x, y) {
    const vis = visible(me(), x, y);
    const b = buildingAt(x, y);
    const u = unitAt(x, y);
    if (b) {
      if (b.owner === me() || vis) {
        const key = b.fake && b.owner !== me() && vis ? "hq" : b.type;
        drawSpr(ctx, SPR[BLD[key] ? BLD[key].spr : b.type] || SPR[b.type], x, y, b.owner !== me());
        hpBar(ctx, x, y, b.hp / b.max, b.owner);
      } else if (S.lastSeen[me()][y][x] && S.lastSeen[me()][y][x].b) {
        ctx.globalAlpha = 0.35;
        drawSpr(ctx, SPR[S.lastSeen[me()][y][x].b.type] || SPR.hq, x, y, 1);
        ctx.globalAlpha = 1;
      }
    }
    if (u && (u.owner === me() || vis)) {
      const bob = Math.sin((tFrame + u.id * 7) / 10) * 2 * cam.z;
      drawSpr(ctx, SPR[u.type], x, y, u.owner !== me(), bob);
      hpBar(ctx, x, y, u.hp / u.max, u.owner);
    }
  }

  function drawSpr(ctx, img, x, y, enemy, bob = 0) {
    const p = iso(x, y);
    const tw = TW * cam.z * 1.05;
    if (!img) {
      ctx.fillStyle = enemy ? "#a78bfa" : "#22d3ee";
      ctx.fillRect(p.sx - 8, p.sy - 18 - bob, 16, 18);
      return;
    }
    const ih = tw * (img.height / img.width);
    if (enemy) {
      ctx.filter = "hue-rotate(70deg) saturate(1.15)";
    }
    ctx.drawImage(img, p.sx - tw / 2, p.sy - ih * 0.82 - bob, tw, ih);
    ctx.filter = "none";
  }

  function hpBar(ctx, x, y, r, owner) {
    const p = iso(x, y);
    const w = 28 * cam.z, h = 4 * cam.z;
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(p.sx - w / 2, p.sy + 6 * cam.z, w, h);
    ctx.fillStyle = owner === me() ? "#22d3ee" : "#c084fc";
    ctx.fillRect(p.sx - w / 2, p.sy + 6 * cam.z, w * Math.max(0, Math.min(1, r)), h);
  }

  function fillDiamond(ctx, x, y, color) {
    const p = iso(x, y);
    const hw = (TW / 2) * cam.z, hh = (TH / 2) * cam.z;
    ctx.beginPath();
    ctx.moveTo(p.sx, p.sy - hh);
    ctx.lineTo(p.sx + hw, p.sy);
    ctx.lineTo(p.sx, p.sy + hh);
    ctx.lineTo(p.sx - hw, p.sy);
    ctx.closePath();
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
      defense: "DEFENSE", offense: "OFFENSE", resolve: "ATTACK PLAYBACK",
      enemy: "ENEMY RESPONSE", end: S.over === "win" ? "VICTORY" : "DEFEAT"
    })[S.phase] || S.phase;
    $("resHud").innerHTML = `
      <span>Turn <b>${S.turn}</b></span>
      <span>Credits <b>${p.credits}</b></span>
      <span>Fuel <b>${p.fuel}</b></span>
      <span>Power <b>${Math.max(0, powerOf(me()))}</b></span>
      <span>Campaign <b>${S.campaign}</b></span>
      <span>AI <b>${S.mode === "ai" ? S.ai.profile : "hot-seat"}</b></span>`;
    const ph = hqCount(me()), eh = hqCount(1 - me());
    $("hqPips").innerHTML = `YOU ${pips(ph, "me")} <span style="width:8px"></span> FOE ${pips(eh, "foe")}`;
    paintLeft();
    paintSel();
    paintBoard();
    $("btnEnd").disabled = S.phase === "resolve" || S.phase === "enemy" || S.phase === "end";
    $("btnSkip").disabled = S.phase !== "resolve";
    $("btnEnd").textContent = S.phase === "defense" ? "Commit defenses →" : S.phase === "offense" ? "Launch attacks →" : "End phase";
    $("dockStatus").textContent = S.phase === "defense"
      ? "Place and upgrade on your half, then commit."
      : S.phase === "offense"
        ? "Click enemy fog to probe or fire. Launch when ready."
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
    if (S.phase === "defense") {
      const cats = ["economy", "production", "intel", "defense", "decoy", "offense"];
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
        const need = w.need && !countB(w.need, me());
        html += itemBtn(k, w.name, w.desc, `${w.cost}c · ${w.fuel}f`, ASSET + (k === "airstrike" ? SPR_FILES.jet : SPR_FILES.missile), weapon === k, lock || need);
      }
      rail.innerHTML = html;
      rail.querySelectorAll("[data-k]").forEach((el) => {
        el.onclick = () => { if (el.disabled) return; weapon = el.dataset.k; tool = null; paintUI(); };
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
      box.innerHTML = `<h3>Tile</h3><p class="sel-meta">Click the island. Your half is always visible. Enemy fog lifts with radar, probes, and strikes — like Battleship.</p>`;
      return;
    }
    const vis = visible(me(), sel.x, sel.y);
    const terr = S.tiles[sel.y][sel.x];
    const b = buildingAt(sel.x, sel.y);
    const u = unitAt(sel.x, sel.y);
    let html = `<h3>${sel.x},${sel.y} · ${terr}${vis ? "" : " · FOG"}</h3>`;
    if (!vis && (!b || b.owner !== 0) && (!u || u.owner !== 0)) {
      html += `<p class="sel-meta">Unknown. Probe it or wait for radar.</p>`;
      box.innerHTML = html; return;
    }
    if (b) {
      html += `<p class="nm">${b.fake && b.owner === 1 ? BLD.hq.name : BLD[b.type].name} Mk${b.lvl}</p>
        <div class="hpbar"><i style="width:${(b.hp / b.max) * 100}%"></i></div>
        <p class="sel-meta">${b.hp}/${b.max} HP · ${b.owner === me() ? "friendly" : "hostile"}${b.offline ? " · OFFLINE" : ""}</p>`;
      if (b.owner === me() && S.phase === "defense") {
        html += `<div class="row">
          <button class="btn" id="upg">Upgrade (${Math.round(BLD[b.type].cost * 0.55 * b.lvl)}c)</button>
          ${b.type === "factory" || b.type === "hangar" ? `<button class="btn" id="trM">Train marine</button>` : ""}
          ${b.type === "factory" && unlocked("scout") ? `<button class="btn" id="trS">Train scout</button>` : ""}
          ${b.type === "hangar" && unlocked("tank") ? `<button class="btn" id="trT">Build tank</button>` : ""}
        </div>`;
      }
    }
    if (u) html += `<p class="sel-meta">${UNIT[u.type].name} ${u.hp}/${u.max}</p>`;
    box.innerHTML = html;
    const bind = (id, fn) => { const e = $(id); if (e) e.onclick = fn; };
    bind("upg", () => { tryUpgrade(b); paintUI(); });
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
  function showOverlay(html) {
    const o = $("overlay");
    o.innerHTML = `<div class="modal">${html}</div>`;
    o.classList.add("show");
  }
  function hideOverlay() { $("overlay").classList.remove("show"); $("overlay").innerHTML = ""; }

  function showMenu() {
    overlayMode = "menu";
    showOverlay(`
      <p class="kicker">chatagent.ca · Δ9Φ963</p>
      <h2>Lattice Marines</h2>
      <p>Three-phase island war. Fortify your half, probe the fog like Battleship, then watch missiles and autonomous marines resolve. An adaptive AI switches doctrine mid-match. Unlocks persist. The campaign does not end.</p>
      <div class="row">
        <label>Commander <input id="nm" maxlength="18" value="${esc(persist.name)}"></label>
        <label>Difficulty
          <select id="df">${Object.keys(DIFF).map((k) => `<option value="${k}" ${k === "normal" ? "selected" : ""}>${DIFF[k].label}</option>`).join("")}</select>
        </label>
        <label>Mode
          <select id="md"><option value="ai">vs Adaptive AI</option><option value="hotseat">Hot-seat (pass the keyboard)</option></select>
        </label>
      </div>
      <div class="row">
        <button class="btn gold" id="go">Deploy campaign ${persist.campaign}</button>
        <button class="btn" id="fresh">New island (same unlocks)</button>
      </div>
      <p class="sel-meta">Unlocked: ${Object.keys(persist.unlocks).filter((k) => persist.unlocks[k]).join(", ") || "starter kit (probe, silo, hangar, radar, AA, mines, decoys)"} · Wins ${persist.wins}</p>
      <h3>How a turn works</h3>
      <p><b>Defense</b> — spend credits on plants, guns, radars, silos. Train units. <b>Offense</b> — click fog to probe or fire. <b>Playback</b> — everything flies. Then the enemy answers.</p>
    `);
    $("go").onclick = () => startFromForm(false);
    $("fresh").onclick = () => startFromForm(true);
  }
  function startFromForm(resetCamp) {
    persist.name = ($("nm").value || "Commander").slice(0, 18);
    savePersist();
    if (resetCamp) persist.campaign = Math.max(1, persist.campaign);
    newMatch({
      seed: Math.floor(Math.random() * 1e9),
      diff: $("df").value,
      campaign: persist.campaign,
      mode: $("md").value
    });
  }

  function showHelp() {
    showOverlay(`
      <h2>Field manual</h2>
      <p>You always see your southern island. The north is fog. Radar paints a disc each turn. A probe or any strike reveals the blast area — same idea as Battleship. Forests hide from radar until something actually hits them (still revealed by strikes).</p>
      <p><b>Win:</b> level all three enemy Command Centres. <b>Lose:</b> yours fall. Score rewards wreckage, surviving kit, and a brisk economy; long wars pay a time tax. Wins unlock scouts, tanks, shields, ICBMs, EMP, airstrikes, and the spy satellite. After 10 wins you prestige for a score multiplier.</p>
      <p>Drag / WASD pan, wheel zoom. Enter commits the phase. Esc cancels a tool. Hot-seat is local only — no server. AI profiles: Aggressor, Turtle, Economist, Intelligence.</p>
      <div class="row"><button class="btn gold" id="ok">Close</button></div>
    `);
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
      </div>
    `);
    $("again").onclick = () => newMatch({ seed: Math.floor(Math.random() * 1e9), diff: S.diff, campaign: persist.campaign, mode: S.mode });
    $("mm").onclick = showMenu;
  }

  /* ---------- input ---------- */
  function resize() { /* canvas tracks client in draw */ }

  function onDown(e) {
    if (!S || overlayMode) return;
    const r = canvas().getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    if (e.button === 1 || e.button === 2 || e.shiftKey) {
      dragging = true; lastM = { mx, my }; return;
    }
    const t = pickTile(mx, my);
    if (!inB(t.x, t.y)) return;
    sel = t;
    if (S.phase === "defense" && tool) {
      tryBuild(tool, me(), t.x, t.y);
    } else if (S.phase === "offense" && weapon) {
      queueStrike(me(), weapon, t.x, t.y);
    }
    paintUI();
  }
  function onMove(e) {
    if (!S) return;
    const r = canvas().getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    hover = pickTile(mx, my);
    $("hint").textContent = hover && inB(hover.x, hover.y)
      ? `${hover.x},${hover.y} ${S.tiles[hover.y][hover.x]}${visible(me(), hover.x, hover.y) ? "" : "  fog"}`
      : "";
    if (dragging && lastM) {
      cam.x += mx - lastM.mx;
      cam.y += my - lastM.my;
      lastM = { mx, my };
    }
  }
  function onUp() { dragging = false; }
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
    if (overlayMode === "menu") return;
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
    while (S.phase === "resolve") stepResolve();
  }

  /* ---------- audio ---------- */
  let AC = null;
  function ac() { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); return AC; }
  function beep(f, d) {
    try {
      const a = ac(); const o = a.createOscillator(); const g = a.createGain();
      o.frequency.value = f; o.type = "triangle";
      g.gain.value = 0.04; o.connect(g); g.connect(a.destination);
      o.start(); o.stop(a.currentTime + d);
    } catch (_) {}
  }
  function bang() {
    try {
      const a = ac(); const o = a.createOscillator(); const g = a.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(180, a.currentTime);
      o.frequency.exponentialRampToValueAtTime(40, a.currentTime + 0.18);
      g.gain.setValueAtTime(0.05, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.2);
      o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + 0.22);
    } catch (_) {}
  }

  /* ---------- loop / boot ---------- */
  function loop() {
    if (S && S.phase === "resolve") {
      stepResolve();
      if (S.t % 4 === 0) paintUI();
    }
    draw();
    raf = requestAnimationFrame(loop);
  }

  async function boot() {
    loadPersist();
    autoUnlock();
    const names = Object.keys(SPR_FILES);
    let n = 0;
    await Promise.all(names.map((k) => new Promise((res) => {
      const img = new Image();
      img.onload = () => { SPR[k] = img; n++; $("bootMsg").textContent = `Assets ${n}/${names.length}`; res(); };
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
      if (S.phase === "defense") endDefense();
      else if (S.phase === "offense") endOffense();
    };
    $("btnSkip").onclick = skipPlayback;
    $("btnHelp").onclick = showHelp;
    $("btnMenu").onclick = () => { S = null; showMenu(); };
    loop();
    showMenu();
  }

  boot();
})();
