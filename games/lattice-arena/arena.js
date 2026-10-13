/* LYGO Arena — engine.
   A real-time arena: two AI teams, one tile arena built from Lattice Crypt's stone, every
   body moving, aiming, casting and dying on its own. The player does not drive anyone.
   Spectating is the game — so everything worth watching is telegraphed, numbered and logged.

   Public surface (window.ArenaEngine) is deliberately probe-friendly: state() returns the
   live match, so a verification harness can run a battle without touching the DOM. */
(function (w) {
  "use strict";

  const TILE = 32;
  const R = w.LYGO_ARENA;
  const MAP_W = 34, MAP_H = 22;
  const STEP = 1 / 60;
  const SUDDEN = 80;           // seconds before the arena starts closing
  const HARD_STOP = 200;

  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const dist2 = (a, b, c, d) => Math.hypot(a - c, b - d);
  const rnd = (n) => (Math.random() * n) | 0;

  /* ------------------------------------------------------------- atlases --- */
  const AT = { heroes: null, creatures: null, pets: null, tiles: null, fx: null, meta: {} };
  function loadImg(src) {
    return new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("missing " + src));
      i.src = src;
    });
  }
  async function loadAssets() {
    if (AT.heroes) return AT;
    const pairs = [["heroes", "heroes.png"], ["creatures", "creatures.png"], ["pets", "pets.png"], ["tiles", "tiles.png"], ["fx", "fx.png"]];
    const out = await Promise.all(pairs.map(([k, f]) => Promise.all([loadImg("./assets/" + f), fetch("./assets/" + k + ".json").then((r) => r.json())])));
    pairs.forEach(([k], i) => { AT[k] = out[i][0]; AT.meta[k] = out[i][1]; });
    return AT;
  }
  function atlasFor(sheet) { return AT[sheet]; }
  function cellOf(sheet, key, frame) {
    const m = AT.meta[sheet];
    let name = key;
    if (sheet === "heroes") name = key + "_" + (frame.face | 0) + "_" + (frame.fr | 0);
    else if (sheet === "creatures" || sheet === "pets") name = key + "_" + (frame.fr | 0);
    let i = m.names[name];
    if (i == null && sheet === "heroes") i = m.names[key + "_0_" + (frame.fr | 0)];
    if (i == null) return null;
    return { sx: (i % m.cols) * m.cell, sy: ((i / m.cols) | 0) * m.cell, cell: m.cell };
  }

  /* Small sprite icons for the picker and the HUD, cut straight out of the atlas. */
  const iconCache = {};
  function iconFor(tpl) {
    if (iconCache[tpl.id]) return iconCache[tpl.id];
    const sheet = tpl.spr.sheet;
    const img = AT[sheet];
    if (!img) return "";
    const c = cellOf(sheet, tpl.spr.key, { face: 0, fr: 0 });
    if (!c) return "";
    const cv = document.createElement("canvas");
    cv.width = c.cell; cv.height = c.cell;
    const cx = cv.getContext("2d");
    cx.imageSmoothingEnabled = false;
    cx.drawImage(img, c.sx, c.sy, c.cell, c.cell, 0, 0, c.cell, c.cell);
    const url = cv.toDataURL("image/png");
    iconCache[tpl.id] = url;
    return url;
  }

  /* ----------------------------------------------------------------- map ---
     One arena, mirrored down the middle so neither side owns a lane: a border, cover blocks
     on each flank, a central spine with gaps top and bottom, and four alcoves. Everything a
     spectator needs to read a fight: two ways round, cover to break sight, open middle. */
  const REALMS = ["stone", "frost", "ember", "gold", "lattice", "void", "tide", "root"];
  /* Each ring is a small readable law. Numbers stay mild so a 3v3 still ends. */
  const LAWS = {
    stone: { name: "Stone Ring", line: "Stone Ring — the floor takes no side." },
    frost: { name: "Frost Ring", line: "Frost Ring — every stride is shorter." },
    ember: { name: "Ember Ring", line: "Ember Ring — the centre burns." },
    gold: { name: "Gold Ring", line: "Gold Ring — a kill pays the killer a spark." },
    lattice: { name: "Lattice Ring", line: "Lattice Ring — moves come back faster." },
    void: { name: "Void Ring", line: "Void Ring — a fall leaves a slow pocket." },
    tide: { name: "Tide Ring", line: "Tide Ring — the floor shoves every few seconds." },
    root: { name: "Root Ring", line: "Root Ring — the floor feeds whoever is still standing." }
  };
  function lawById(id) { return LAWS[id] || LAWS.stone; }
  function lawForSeed(seed) {
    return lawById(REALMS[(seed == null ? 0 : Math.abs(seed | 0)) % REALMS.length]);
  }
  /* ---------------------------------------------------------- the colosseums ---
     Five kinds of fighting ground, all mirrored down the middle so neither side
     owns a lane, all deliberately nearly empty: the obstacles are few and every one
     of them is worth standing next to. That is the whole design brief — cover to
     break a sight line, a gap to hold, a lane to run, and open sand everywhere else
     so a body that wants to go somewhere can go there.

       colosseum  the classic: open oval sand, four pillar knots on the diagonals
       gauntlet   a spine down the middle with a mouth at each end, and two ways round
       pit        low cross-walls with single-tile gates — four doorways to fight over
       colonnade  two broken rows of pillars, making lanes and hard cover
       ruin       a court of rubble: three short walls, scattered tooth-shaped blocks

     Every kind is authored for the left half and mirrored, then repaired: the spawn
     aprons are cleared and anything the repair cuts through is linked back in, so no
     seed can strand a body behind stone. */
  const KINDS = ["colosseum", "gauntlet", "pit", "colonnade", "ruin"];
  const KIND_BLURB = {
    colosseum: "Colosseum — open sand, cover on the corners.",
    gauntlet: "Gauntlet — a spine down the middle and a mouth at each end.",
    pit: "The Pit — four doorways in a low wall. Hold one or lose the middle.",
    colonnade: "Colonnade — pillars in rows: lanes to run, columns to hide behind.",
    ruin: "Ruin — a court of broken walls and loose stone."
  };
  /* which colosseum a seed stands in — derived from the seed so the pre-fight card can
     name it before the match exists */
  function kindOf(seed) { return KINDS[(((seed | 0) >> 3) % KINDS.length + KINDS.length) % KINDS.length]; }
  function buildMap(seed) {
    const t = [];
    for (let y = 0; y < MAP_H; y++) { t.push([]); for (let x = 0; x < MAP_W; x++) t[y].push("floor"); }
    const block = (x, y, w, h) => {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const px = x + i, py = y + j;
        if (px > 0 && py > 0 && px < MAP_W - 1 && py < MAP_H - 1) t[py][px] = "wall";
      }
    };
    const carve = (x, y, w, h) => {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const px = x + i, py = y + j;
        if (px >= 0 && py >= 0 && px < MAP_W && py < MAP_H) t[py][px] = "floor";
      }
    };
    for (let x = 0; x < MAP_W; x++) { t[0][x] = "wall"; t[MAP_H - 1][x] = "wall"; }
    for (let y = 0; y < MAP_H; y++) { t[y][0] = "wall"; t[y][MAP_W - 1] = "wall"; }
    /* both a mirrored block and its twin, so a builder only writes the left half */
    const twin = (x, y, w2, h) => { block(x, y, w2, h); block(MAP_W - x - w2, y, w2, h); };

    const kind = kindOf(seed);
    if (kind === "colosseum") {
      /* four knots on the diagonals, two tiles square, and nothing in the middle:
         the centre of a colosseum is where the fight should happen */
      twin(7, 5, 2, 2); twin(7, 15, 2, 2);
      twin(12, 9, 2, 1); twin(12, 12, 2, 1);
      twin(4, 10, 1, 2);
    } else if (kind === "gauntlet") {
      /* the spine, with a wide mouth above and below it, and a shoulder to break
         sight on each flank — the only structure that rewards holding a gap */
      for (let y = 7; y <= 14; y++) { t[y][MAP_W / 2 - 1 | 0] = "wall"; t[y][MAP_W / 2 | 0] = "wall"; }
      twin(5, 3, 2, 2); twin(5, 17, 2, 2);
      twin(9, 8, 2, 1); twin(9, 13, 2, 1);
      twin(12, 1, 3, 2); twin(12, 19, 3, 2);
    } else if (kind === "pit") {
      /* low cross-walls with single-tile gates: four doorways, and open sand in
         the middle, where the pit is */
      for (let x = 8; x <= 14; x++) { if (x !== 10 && x !== 12) { t[6][x] = "wall"; t[MAP_H - 7][x] = "wall"; } }
      for (let y = 7; y <= 14; y++) { if (y !== 10 && y !== 12) { t[y][16] = "wall"; t[y][MAP_W - 17] = "wall"; } }
      twin(3, 5, 1, 2); twin(3, 15, 1, 2);
    } else if (kind === "colonnade") {
      /* two rows of single pillars: lanes between them, and a column to break the
         line of every gun in the arena */
      for (let x = 6; x <= 13; x += 3) { t[7][x] = "wall"; t[MAP_H - 8][x] = "wall"; }
      for (let x = 8; x <= 13; x += 3) { t[4][x] = "wall"; t[MAP_H - 5][x] = "wall"; }
      twin(2, 10, 1, 2); twin(14, 10, 1, 2);
      t[MAP_H / 2 | 0][MAP_W / 2 - 1 | 0] = "wall"; t[MAP_H / 2 | 0][MAP_W / 2 | 0] = "wall";
    } else {
      /* ruin: three short walls at different angles of the court, plus loose stone */
      twin(6, 4, 3, 1); twin(6, 17, 3, 1);
      twin(12, 2, 1, 3); twin(12, 17, 1, 3);
      twin(9, 10, 1, 1); twin(4, 8, 1, 1); twin(4, 13, 1, 1);
      t[4][16] = "wall"; t[MAP_H - 5][16] = "wall";
    }

    /* spawn pockets stay clear — nothing in front of a gate is a fair arena */
    const slots = spawnSlots();
    slots.forEach((s) => carve(s.x - 2, s.y - 1, 5, 3));
    /* guaranteed connectivity: flood from the left pocket, cut to anything stranded */
    const seen = flood(t, 2, 11);
    slots.forEach((s) => {
      if (!seen[s.y * MAP_W + s.x]) {
        let x = 2, y = s.y;
        while (x !== s.x) { t[y][x] = "floor"; x += Math.sign(s.x - x) || 0; if (x === s.x) break; }
        x = s.x;
        while (y !== 11) { t[y][x] = "floor"; y += Math.sign(11 - y) || 0; if (y === 11) break; }
      }
    });
    return { W: MAP_W, H: MAP_H, tiles: t, realm: REALMS[seed % REALMS.length], kind: kind };
  }
  function spawnSlots() {
    const out = [];
    for (let i = 0; i < 5; i++) {
      const y = 3 + i * 4;
      out.push({ x: 3, y: y, team: 0 });
      out.push({ x: MAP_W - 4, y: y, team: 1 });
    }
    return out;
  }
  function flood(t, sx, sy) {
    const seen = new Uint8Array(MAP_W * MAP_H);
    const q = [sy * MAP_W + sx];
    seen[q[0]] = 1;
    while (q.length) {
      const i = q.pop(), x = i % MAP_W, y = (i / MAP_W) | 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (nx < 1 || ny < 1 || nx >= MAP_W - 1 || ny >= MAP_H - 1) return;
        const ni = ny * MAP_W + nx;
        if (seen[ni] || t[ny][nx] === "wall") return;
        seen[ni] = 1; q.push(ni);
      });
    }
    return seen;
  }
  function solid(lv, tx, ty) {
    if (tx < 0 || ty < 0 || tx >= lv.W || ty >= lv.H) return true;
    return lv.tiles[ty][tx] === "wall";
  }
  function solidAt(lv, x, y) { return solid(lv, Math.floor(x / TILE), Math.floor(y / TILE)); }

  /* flow field: BFS from a destination cell, cached per destination. Units sharing a target
     share the field, so thirty bodies cost about one BFS. */
  const fieldCache = new Map();
  function flowField(lv, tx, ty) {
    const key = ty * lv.W + tx;
    let f = fieldCache.get(key);
    if (f) return f;
    const next = new Int32Array(lv.W * lv.H).fill(-2);
    if (solid(lv, tx, ty)) { fieldCache.set(key, next); return next; }
    const start = key;
    next[start] = -1;
    let q = [start];
    while (q.length) {
      const nq = [];
      for (let k = 0; k < q.length; k++) {
        const i = q[k], x = i % lv.W, y = (i / lv.W) | 0;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= lv.W || ny >= lv.H) return;
          const ni = ny * lv.W + nx;
          if (next[ni] !== -2 || lv.tiles[ny][nx] === "wall") return;
          next[ni] = i;
          nq.push(ni);
        });
      }
      q = nq;
    }
    if (fieldCache.size > 40) fieldCache.clear();
    fieldCache.set(key, next);
    return next;
  }

  /* --------------------------------------------------------------- state --- */
  let canvas = null, ctx = null, floorCv = null;
  const S = {
    phase: "idle",           // idle | count | live | over
    mode: 3,
    lv: null,
    your: [], foe: [],
    projectiles: [], pending: [], drops: [], texts: [], marks: [], swings: [],
    time: 0, speed: 1, paused: false, countdown: 0,
    events: [], winner: null, over: false, sudden: false,
    rng: 0, shake: 0, hitStop: 0, zones: [], tideIn: 12
  };
  let seq = 0;
  function pushEvent(text, kind, sfx) {
    S.events.push({ t: S.time, text: text, kind: kind || "", sfx: sfx || "" });
    if (S.events.length > 140) S.events.shift();
  }

  /* ------------------------------------------------------------- entity --- */
  function mkEntity(built, team, x, y, isToken) {
    return {
      uid: ++seq, team: team, b: built, x: x * TILE, y: y * TILE,
      hp: built.max, max: built.max, mana: built.manaMax, shd: Math.round(built.max * (built.mods.startShield || 0)),
      armorBuff: 0, armorBuffT: 0,
      stun: 0, root: 0, silence: 0, slowT: 0, slowV: 0, swiftT: 0, swiftV: 0, hasteT: 0, hasteV: 0,
      rageT: 0, rageV: 0, weakT: 0, weakV: 0, burnT: 0, burnDps: 0, bleedT: 0, bleedDps: 0,
      regenT: 0, regenHps: 0, thornsT: 0, thornsV: 0, reflectT: 0, reflectV: 0, veilT: 0, veilV: 0,
      lifestealT: 0, lifestealV: 0, tauntT: 0, shieldWallT: 0,
      cds: built.moves.map(() => 0), atkCd: 0.6 + Math.random() * 0.5,
      face: 0, walk: 0, animT: 0, animMax: 0.34, animVis: "", aimA: 0, flash: 0, dead: false, dieT: 0,
      target: null, retarget: 0, stuck: 0, lastX: 0, lastY: 0, kite: 0, idleT: 0,
      firstUsed: false, usedLastStand: false, usedRevive: false, lastCardCheck: 0,
      kills: 0, dmgDone: 0, healDone: 0, taken: 0, uses: {}, tokens: 0, ttl: isToken ? (built.ttl || 20) : 0,
      isToken: !!isToken
    };
  }

  function mkTeam(ids, team) {
    const tpls = ids.map((id) => (typeof id === "string" ? R.byId[id] : id)).filter(Boolean);
    const built = R.buildTeam(tpls);
    const slots = spawnSlots().filter((s) => s.team === team);
    const mid = (tpls.length - 1) / 2;
    return built.map((b, i) => {
      const slot = slots[clamp(i, 0, slots.length - 1)];
      const y = clamp(slot.y + (i - mid) * 0.3, 1.6, MAP_H - 2.6);
      return mkEntity(b, team, slot.x + (b.range > 100 ? -0.5 : 0.3), y, false);
    });
  }

  function all() { return S.your.concat(S.foe); }
  function live(team) { return (team == null ? all() : (team === 0 ? S.your : S.foe)).filter((e) => !e.dead); }
  function enemiesOf(e) { return live(e.team === 0 ? 1 : 0); }
  function alliesOf(e) { return live(e.team); }

  /* --------------------------------------------------------------- stats --- */
  function buffed(e) {
    const b = e.b;
    const hpFrac = e.hp / e.max;
    let dmg = b.dmg * (1 + (e.rageT > 0 ? e.rageV : 0)) * (1 - (e.weakT > 0 ? e.weakV : 0));
    if (b.mods.fury && hpFrac < 0.4) dmg *= 1 + b.mods.fury;
    let speed = b.speed * (1 + (e.swiftT > 0 ? e.swiftV : 0)) * (1 - (e.slowT > 0 ? e.slowV : 0)) * (e.stun > 0 || e.root > 0 ? 0 : 1);
    if (S.lv && S.lv.realm === "frost") speed *= 0.88;
    return {
      dmg: dmg,
      rate: b.rate * (1 + (e.hasteT > 0 ? e.hasteV : 0)),
      speed: speed,
      armor: b.armor + e.armorBuff,
      range: b.range + (e.shieldWallT > 0 ? 12 : 0)
    };
  }
  function statusList(e) {
    const out = [];
    if (e.stun > 0) out.push(["stun", e.stun]);
    if (e.root > 0) out.push(["root", e.root]);
    if (e.silence > 0) out.push(["hush", e.silence]);
    if (e.slowT > 0) out.push(["slow", e.slowT]);
    if (e.swiftT > 0) out.push(["swift", e.swiftT]);
    if (e.hasteT > 0) out.push(["haste", e.hasteT]);
    if (e.rageT > 0) out.push(["rage", e.rageT]);
    if (e.weakT > 0) out.push(["weak", e.weakT]);
    if (e.burnT > 0) out.push(["burn", e.burnT]);
    if (e.bleedT > 0) out.push(["bleed", e.bleedT]);
    if (e.regenT > 0) out.push(["regen", e.regenT]);
    if (e.thornsT > 0) out.push(["thorn", e.thornsT]);
    if (e.reflectT > 0) out.push(["mirror", e.reflectT]);
    if (e.veilT > 0 || e.b.mods.veil) out.push(["veil", e.veilT]);
    if (e.shd > 0) out.push(["aegis", e.shd]);
    if (e.tauntT > 0) out.push(["taunt", e.tauntT]);
    if (e.lifestealT > 0) out.push(["drink", e.lifestealT]);
    return out;
  }
  function applySt(e, st, from) {
    if (!st) return;
    if (st.stun) e.stun = Math.max(e.stun, st.stun);
    if (st.root) e.root = Math.max(e.root, st.root);
    if (st.silence) e.silence = Math.max(e.silence, st.silence);
    if (st.slow) { e.slowT = Math.max(e.slowT, st.slow[1]); e.slowV = Math.max(e.slowV, st.slow[0]); }
    if (st.swift) { e.swiftT = Math.max(e.swiftT, st.swift[1]); e.swiftV = Math.max(e.swiftV, st.swift[0]); }
    if (st.haste) { e.hasteT = Math.max(e.hasteT, st.haste[1]); e.hasteV = Math.max(e.hasteV, st.haste[0]); }
    if (st.rage) { e.rageT = Math.max(e.rageT, st.rage[1]); e.rageV = Math.max(e.rageV, st.rage[0]); }
    if (st.weak) { e.weakT = Math.max(e.weakT, st.weak[1]); e.weakV = Math.max(e.weakV, st.weak[0]); }
    if (st.burn) { e.burnT = Math.max(e.burnT, st.burn[1]); e.burnDps = Math.max(e.burnDps, st.burn[0]); }
    if (st.bleed) { e.bleedT = Math.max(e.bleedT, st.bleed[1]); e.bleedDps = Math.max(e.bleedDps, st.bleed[0]); }
    if (st.regen) { e.regenT = Math.max(e.regenT, st.regen[1]); e.regenHps = Math.max(e.regenHps, st.regen[0]); }
    if (st.thorns) { e.thornsT = Math.max(e.thornsT, st.thorns[1]); e.thornsV = Math.max(e.thornsV, st.thorns[0]); }
    if (st.reflect) { e.reflectT = Math.max(e.reflectT, st.reflect[1]); e.reflectV = Math.max(e.reflectV, st.reflect[0]); }
    if (st.veil) { e.veilT = Math.max(e.veilT, st.veil[1]); e.veilV = Math.max(e.veilV, st.veil[0]); }
    if (st.lifesteal) { e.lifestealT = Math.max(e.lifestealT, st.lifesteal[1]); e.lifestealV = Math.max(e.lifestealV, st.lifesteal[0]); }
    if (st.aegis) e.shd += Math.round(e.max * st.aegis);
    if (st.armor) { e.armorBuff = Math.max(e.armorBuff, st.armor[0]); e.armorBuffT = Math.max(e.armorBuffT, st.armor[1]); }
    if (st.heal) { const amt = Math.round(e.max * st.heal); heal(e, amt, from); }
    if (st.cdReset) e.cds = e.cds.map(() => 0.15);
    if (st.knock) shove(e, from, st.knock * TILE);
    if (st.pull) pullTo(e, from, st.pull * TILE);
  }
  function heal(e, amt, from) {
    if (e.dead) return 0;
    const before = e.hp;
    e.hp = Math.min(e.max, e.hp + amt);
    const real = e.hp - before;
    if (from && real > 0) {
      from.healDone += real;
      /* "utility" has to mean something: the mending that lands on somebody else is
         counted apart from a kit drinking its own flask */
      if (from !== e) from.healOut = (from.healOut || 0) + real;
    }
    if (real > 2) S.texts.push({ x: e.x, y: e.y - 22, t: "+" + Math.round(real), life: 0.9, col: "#6ee7b7" });
    return real;
  }
  /* facing and aim in one place: sprites use 0 front, 2 side (mirrored), 3 the other side */
  function faceTo(e, x, y) {
    const dx = x - e.x, dy = y - e.y;
    e.aimA = Math.atan2(dy, dx);
    if (Math.abs(dx) > Math.abs(dy) * 0.7) e.face = dx > 0 ? 3 : 2;
    else e.face = 0;
  }
  /* is the straight line between two bodies free of stone? */
  function clearLine(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.ceil(d / 12));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      if (solidAt(S.lv, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
    }
    return true;
  }
  function lowestAlly(e) {
    return alliesOf(e).reduce((a, b) => (b.hp / b.max < a.hp / a.max ? b : a));
  }
  function shove(e, from, px) {
    if (!from) return;
    const a = Math.atan2(e.y - from.y, e.x - from.x);
    const nx = e.x + Math.cos(a) * px, ny = e.y + Math.sin(a) * px;
    if (!solidAt(S.lv, nx, e.y)) e.x = clamp(nx, TILE * 1.1, (MAP_W - 1.1) * TILE);
    if (!solidAt(S.lv, e.x, ny)) e.y = clamp(ny, TILE * 1.1, (MAP_H - 1.1) * TILE);
  }
  function pullTo(e, from, px) {
    if (!from) return;
    const a = Math.atan2(from.y - e.y, from.x - e.x);
    const nx = e.x + Math.cos(a) * px, ny = e.y + Math.sin(a) * px;
    if (!solidAt(S.lv, nx, e.y)) e.x = nx;
    if (!solidAt(S.lv, e.x, ny)) e.y = ny;
  }

  /* -------------------------------------------------------------- damage --- */
  function damage(src, tgt, amount, opts) {
    opts = opts || {};
    if (!tgt || tgt.dead) return 0;
    let dmg = amount;
    /* veil: a miss is a miss, and it reads as one */
    const veil = (tgt.veilT > 0 ? tgt.veilV : 0) + (tgt.b.mods.veil || 0);
    if (!opts.sure && Math.random() < veil) {
      S.texts.push({ x: tgt.x, y: tgt.y - 24, t: "miss", life: 0.7, col: "#cbd5e1" });
      return 0;
    }
    let crit = false;
    if (src && !opts.noCrit && Math.random() < src.b.crit) {
      crit = true;
      dmg *= src.b.critMul;
    }
    if (opts.doubleFirst && src && !src.firstUsed) { dmg *= 2; src.firstUsed = true; }
    if (src && src.b.mods.execute && tgt.hp / tgt.max < 0.32) dmg *= 1 + src.b.mods.execute;
    if (tgt.b.mods.bulwark && tgt.hp / tgt.max > 0.6) dmg *= 1 - tgt.b.mods.bulwark;
    if (!opts.ignoreArmor) dmg = Math.max(3, dmg - (tgt.b.armor + tgt.armorBuff) * 1.1);
    if (opts.strips && tgt.shd > 0) { dmg *= 2; tgt.shd = 0; }
    if (tgt.shd > 0) {
      const absorbed = Math.min(tgt.shd, dmg);
      tgt.shd -= absorbed;
      dmg -= absorbed;
    }
    dmg = Math.round(dmg);
    tgt.hp -= dmg;
    tgt.taken += dmg;
    if (!opts.dot) {
      tgt.flash = 0.16;
      S.texts.push({ x: tgt.x, y: tgt.y - 26, t: dmg + (crit ? "!" : ""), life: crit ? 1.0 : 0.75, col: crit ? "#fbbf24" : "#f8fafc", big: crit });
    }
    if (src) { src.dmgDone += dmg; src.idleT = 0; }
    /* lifesteal, leech and vampirism all feed the attacker */
    if (src) {
      let back = 0;
      if (src.lifestealT > 0) back += dmg * src.lifestealV;
      if (src.b.mods.leech) back += dmg * src.b.mods.leech;
      if (back > 0.5) heal(src, Math.round(back), src);
    }
    /* thorns answer melee, reflect answers everything aimed */
    if (src && !opts.dot && !opts.reflect) {
      let back = 0;
      if (opts.melee || opts.contact) back += dmg * (tgt.thornsT > 0 ? tgt.thornsV : 0) + dmg * (tgt.b.mods.thorns || 0);
      if (opts.ranged) back += dmg * (tgt.reflectT > 0 ? tgt.reflectV : 0);
      if (back > 1) damage(tgt, src, back, { noCrit: true, dot: true, reflect: true, ignoreArmor: true, sure: true });
    }
    if (tgt.hp <= 0) die(tgt, src);
    return dmg;
  }

  function die(e, src) {
    if (e.dead) return;
    e.hp = 0;
    /* the recall cards get their one moment */
    if (!e.usedRevive && e.b.cards.some((c) => c.hook === "secondLife")) {
      e.usedRevive = true;
      e.hp = Math.round(e.max * 0.4);
      e.dead = false;
      e.shd += Math.round(e.max * 0.15);
      pushEvent(e.b.name + " is called back — Name Recall, " + Math.round(e.max * 0.4) + " back.", "gift");
      S.marks.push({ x: e.x, y: e.y, r: 0, life: 0.9, col: "#fbbf24" });
      return;
    }
    e.dead = true;
    e.dieT = 0;
    e.hp = 0;
    if (src) {
      src.kills++;
      if (src.b.mods.vamp) heal(src, Math.round(src.max * src.b.mods.vamp), src);
      if (S.lv && S.lv.realm === "gold") heal(src, Math.round(src.max * 0.05), src);
      pushEvent(src.b.name + " cuts down " + e.b.name + ".", "kill");
    } else {
      pushEvent(e.b.name + " falls.", "kill");
    }
    if (S.lv && S.lv.realm === "void") S.zones.push({ x: e.x, y: e.y, r: 70, life: 3.5, slow: 0.32 });
    /* Hit-stop is read by frame(), never by step(), so the headless ladder stays at sim speed. */
    S.hitStop = 0.1;
    S.shake = Math.max(S.shake, 0.34);
    S.marks.push({ x: e.x, y: e.y, r: 0, life: 0.8, col: "#f87171" });
    S.texts.push({ x: e.x, y: e.y - 30, t: "DOWN", life: 1.2, col: "#f87171", big: true });
    checkOver();
    if (S.over) {
      S.hitStop = 0.42;
      S.shake = Math.max(S.shake, 0.72);
      S.texts.push({ x: e.x, y: e.y - 48, t: "FINISH", life: 1.7, col: "#fbbf24", big: true });
    }
  }

  function checkOver() {
    if (S.over) return;
    const a = live(0).length, b = live(1).length;
    if (a && b) return;
    S.over = true;
    S.phase = "over";
    S.winner = a ? 0 : (b ? 1 : -1);
    pushEvent(S.winner === 0 ? "YOUR TEAM TAKES THE ARENA." : S.winner === 1 ? "THE CHALLENGERS TAKE THE ARENA." : "Both sides are down — a draw.", "over");
  }

  /* ---------------------------------------------------------------- moves --- */
  function moveCost(mv) { return Math.min(mv.cd * 1.1, 40); }
  function pickTarget(e, mode) {
    const en = enemiesOf(e);
    if (!en.length) return null;
    if (mode === "weakest") return en.reduce((a, b) => (b.hp / b.max < a.hp / a.max ? b : a));
    if (mode === "clump") {
      let best = null, bestScore = -1;
      en.forEach((c) => {
        let n = 0;
        en.forEach((o) => { if (dist2(o.x, o.y, c.x, c.y) < 120) n++; });
        const sc = n * 100 - dist2(e.x, e.y, c.x, c.y) * 0.2;
        if (sc > bestScore) { bestScore = sc; best = c; }
      });
      return best;
    }
    if (mode === "protect") {
      const hurt = alliesOf(e).reduce((a, b) => (b.hp / b.max < a.hp / a.max ? b : a));
      if (hurt && hurt !== e) return en.reduce((a, b) => (dist2(b.x, b.y, hurt.x, hurt.y) < dist2(a.x, a.y, hurt.x, hurt.y) ? b : a));
    }
    if (mode === "deadally") return null;
    /* default: nearest, with a bias onto anything already hurt (bodies finish fights) */
    return en.reduce((a, b) => {
      const sa = dist2(e.x, e.y, a.x, a.y) - (1 - a.hp / a.max) * 60;
      const sb = dist2(e.x, e.y, b.x, b.y) - (1 - b.hp / b.max) * 60;
      return sb < sa ? b : a;
    });
  }

  function castMove(e, mv, idx) {
    const cost = moveCost(mv);
    if (e.mana < cost || e.silence > 0 || e.stun > 0) return false;
    e.mana -= cost;
    e.cds[idx] = mv.cd * e.b.cdMul;
    e.uses[mv.name] = (e.uses[mv.name] || 0) + 1;
    const caster = e;
    const tgt = (mv.aim === "enemy" || mv.aim === "weakest" || mv.aim === "clump") ? pickTarget(e, mv.aim) :
      (mv.aim === "deadally" ? (e.team === 0 ? S.your : S.foe).find((x) => x.dead) : null);
    const anchorAlly = mv.aim === "allylow" ? lowestAlly(caster) : null;

    function reachPoint() {
      if (tgt) return { x: tgt.x, y: tgt.y };
      if (anchorAlly) return { x: anchorAlly.x, y: anchorAlly.y };
      if (mv.atRange) {
        const en = enemiesOf(caster);
        if (en.length) {
          const cx = en.reduce((s, o) => s + o.x, 0) / en.length, cy = en.reduce((s, o) => s + o.y, 0) / en.length;
          return { x: cx, y: cy };
        }
      }
      return { x: caster.x, y: caster.y };
    }
    const P = reachPoint();
    faceTo(caster, P.x, P.y);
    flourish(caster, mv.vis || "slash", P.x, P.y);
    if (mv.fx) S.marks.push({ x: caster.x, y: caster.y - 10, r: 0, life: 0.22, col: caster.b.color, spark: true });

    switch (mv.shape) {
      case "melee":
      case "arc": {
        const radius = mv.range * TILE;
        const hits = enemiesOf(caster).filter((o) => {
          const d = dist2(caster.x, caster.y, o.x, o.y);
          if (d > radius) return false;
          if (mv.shape === "melee") return true;
          const a = Math.atan2(o.y - caster.y, o.x - caster.x);
          let diff = Math.abs(((a - caster.aimA + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          return diff < 1.15;
        });
        hits.forEach((o) => {
          damage(caster, o, caster.b.dmg * mv.dmg, { melee: true, doubleFirst: !!caster.b.mods.firstDouble, ignoreArmor: !!mv.ignoreArmor });
          applySt(o, mv.st, caster);
        });
        if (!hits.length) applySt(anchorAlly || caster, mv.selfSt, caster);
        if (mv.selfSt && hits.length) applySt(caster, mv.selfSt, caster);
        break;
      }
      case "aura": {
        const radius = (mv.radius || 3) * TILE;
        const cx = mv.atRange ? P.x : caster.x, cy = mv.atRange ? P.y : caster.y;
        S.marks.push({ x: cx, y: cy, r: radius, life: 0.4, col: caster.b.color, ring: true });
        enemiesOf(caster).forEach((o) => {
          if (dist2(cx, cy, o.x, o.y) > radius) return;
          if (mv.dmg) damage(caster, o, caster.b.dmg * mv.dmg, { melee: true, ignoreArmor: !!mv.ignoreArmor });
          applySt(o, mv.st, caster);
        });
        if (mv.selfSt) applySt(caster, mv.selfSt, caster);
        if (mv.st && mv.st.aegis) applySt(caster, mv.st, caster);
        break;
      }
      case "blast": {
        S.pending.push({ t: 0.32, x: P.x, y: P.y, r: (mv.radius || 2) * TILE, dmg: caster.b.dmg * mv.dmg, src: caster, st: mv.st, col: caster.b.color, strips: mv.strips });
        if (mv.selfSt) applySt(caster, mv.selfSt, caster);
        break;
      }
      case "beam": {
        const a = Math.atan2(P.y - caster.y, P.x - caster.x);
        const len = mv.range * TILE;
        S.marks.push({ x: caster.x, y: caster.y, x2: caster.x + Math.cos(a) * len, y2: caster.y + Math.sin(a) * len, life: 0.3, col: caster.b.color, beam: true });
        enemiesOf(caster).forEach((o) => {
          const dx = o.x - caster.x, dy = o.y - caster.y;
          const along = dx * Math.cos(a) + dy * Math.sin(a);
          if (along < 0 || along > len) return;
          const side = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
          if (side > 14) return;
          damage(caster, o, caster.b.dmg * mv.dmg, { ignoreArmor: !!mv.ignoreArmor || !!mv.pierce, ranged: true });
          applySt(o, mv.st, caster);
        });
        break;
      }
      case "bolt":
      case "multi": {
        const n = (mv.n || 1) + (mv.n ? (caster.b.mods.volleyAdd || 0) : 0);
        const a0 = Math.atan2(P.y - caster.y, P.x - caster.x);
        for (let i = 0; i < n; i++) {
          const spread = n > 1 ? (i - (n - 1) / 2) * 0.24 : 0;
          const a = a0 + spread;
          S.projectiles.push({
            x: caster.x, y: caster.y - 8, a: a, spd: 430,
            dmg: caster.b.dmg * mv.dmg, src: caster, team: caster.team, w: mv.w || caster.b.atk.w,
            vis: mv.vis || caster.b.atk.vis, col: caster.b.color,
            life: 2.2, pierce: (mv.pierce || 0), lob: false,
            tx: P.x, ty: P.y, st: mv.st, frame: 0, ignoreWall: false
          });
        }
        break;
      }
      case "lob": {
        S.projectiles.push({
          x: caster.x, y: caster.y - 8, a: Math.atan2(P.y - caster.y, P.x - caster.x), spd: 200,
          dmg: caster.b.dmg * mv.dmg, src: caster, team: caster.team, w: mv.w || "comet",
          life: 3, pierce: 0, radius: (mv.radius || 2) * TILE, lob: true, tx: P.x, ty: P.y, st: mv.st, ignoreWall: true, frame: 0,
          vis: mv.vis || "stone", col: caster.b.color
        });
        break;
      }
      case "self": applySt(caster, mv.st, caster); break;
      case "ally": if (anchorAlly) { applySt(anchorAlly, mv.st, caster); S.marks.push({ x: anchorAlly.x, y: anchorAlly.y, r: 18, life: 0.5, col: "#7dd3fc", ring: true }); } break;
      case "allies": {
        const radius = (mv.aim === "allies" ? (mv.range || 7) : 6) * TILE;
        alliesOf(caster).forEach((o) => { if (dist2(caster.x, caster.y, o.x, o.y) <= radius) applySt(o, mv.st, caster); });
        S.marks.push({ x: caster.x, y: caster.y, r: radius, life: 0.45, col: "#7dd3fc", ring: true });
        break;
      }
      case "blink": {
        const t2 = tgt || pickTarget(caster, "weakest");
        if (t2) {
          const a = Math.atan2(caster.y - t2.y, caster.x - t2.x);
          const land = { x: t2.x + Math.cos(a) * 26, y: t2.y + Math.sin(a) * 26 };
          if (!solidAt(S.lv, land.x, land.y)) { caster.x = land.x; caster.y = land.y; }
          S.marks.push({ x: caster.x, y: caster.y, r: 14, life: 0.4, col: caster.b.color, ring: true });
          if (mv.dmg) { damage(caster, t2, caster.b.dmg * mv.dmg, { melee: true }); applySt(t2, mv.st, caster); }
        }
        if (mv.st) applySt(caster, mv.st, caster);
        break;
      }
      case "revive": {
        const dead = (caster.team === 0 ? S.your : S.foe).find((x) => x.dead);
        if (!dead) return false;
        dead.dead = false;
        dead.hp = Math.round(dead.max * (mv.heal || 0.4));
        dead.shd += Math.round(dead.max * 0.1);
        dead.stun = 0; dead.root = 0; dead.cds = dead.cds.map(() => 1.5);
        pushEvent(caster.b.name + " remembers " + dead.b.name + " — Provenance, back at " + dead.hp + ".", "gift");
        S.marks.push({ x: dead.x, y: dead.y, r: 24, life: 0.9, col: "#fbbf24", ring: true });
        checkOver();
        break;
      }
      case "summon": {
        const tk = R.TOKENS[mv.token];
        const tpl = { id: mv.token + "_" + (++caster.tokens), name: tk.name, tag: "Summoned", cls: "token", spr: tk.spr,
          hp: tk.hp, dmg: tk.dmg, rate: tk.rate, speed: tk.speed, armor: tk.armor, range: tk.range, mana: 30, manaRegen: 4, crit: 0.1, cdMul: 1,
          atk: { name: "Warden Bolt", type: "bolt", w: tk.w }, moves: [], cards: [], bio: "", counter: "", ttl: tk.ttl };
        R.byId[tpl.id] = tpl;
        const built = R.build(tpl, [], null, Math.random);
        built.power = 0;
        for (let i = 0; i < (mv.n || 1); i++) {
          const e2 = mkEntity(built, caster.team, caster.x / TILE + (i ? 0.9 : -0.9), caster.y / TILE + 0.4, true);
          e2.b = built;
          (caster.team === 0 ? S.your : S.foe).push(e2);
        }
        pushEvent(caster.b.name + " calls " + (mv.n || 1) + " " + tk.name.toLowerCase() + " into the arena.", "summon");
        break;
      }
      default: return false;
    }
    if (mv.name) {
      pushEvent(caster.b.name + " — " + mv.name + (tgt && (mv.aim === "enemy" || mv.aim === "weakest") ? " on " + tgt.b.name : "") + ".", "move", mv.sfx || "");
    }
    return true;
  }

  /* ------------------------------------------------------------------ AI ---
     The brain (brain.js) decides; this is the body's hands and feet — pick the
     move, walk the ground the task asks for, and deal with stone. Every tactical
     judgement lives in brain.js so a spectator can read one file and know what a
     kit wants; everything here is execution. */
  const OPEN = { x: 0, y: 0 };
  /* the nearest open cell to a cell — a destination inside stone is no destination */
  function openTile(tx, ty) {
    if (!solid(S.lv, tx, ty)) { OPEN.x = tx; OPEN.y = ty; return OPEN; }
    for (let r = 1; r <= 4; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = clamp(tx + dx, 1, MAP_W - 2), ny = clamp(ty + dy, 1, MAP_H - 2);
        if (!solid(S.lv, nx, ny)) { OPEN.x = nx; OPEN.y = ny; return OPEN; }
      }
    }
    OPEN.x = clamp(tx, 1, MAP_W - 2); OPEN.y = clamp(ty, 1, MAP_H - 2);
    return OPEN;
  }
  /* the count of a body's own corners that are inside stone: the measure a move is
     judged by. A body that is already in the wall may always push its way out. */
  function overlapAt(x, y) {
    const rad = 11;
    let n = 0;
    if (solidAt(S.lv, x - rad, y - rad)) n++;
    if (solidAt(S.lv, x + rad, y - rad)) n++;
    if (solidAt(S.lv, x - rad, y + rad)) n++;
    if (solidAt(S.lv, x + rad, y + rad)) n++;
    return n;
  }

  function think(e, dt) {
    const b = e.b;
    const st = buffed(e);
    if (e.stun > 0 || e.dead) return;
    /* lazily stamped so a body that never moved still has honest counters */
    if (e.blockedT == null) {
      e.blockedT = 0; e.blockedWorst = 0; e.bailT = 0; e.slideT = 0; e.slideDir = 1;
      e.strafeDir = Math.random() < 0.5 ? -1 : 1; e.stuckS = 0; e.stuckWorst = 0;
      e.mvT = 0; e.mvX = e.x; e.mvY = e.y; e.goalNow = false; e.pathOn = false; e.pathT = 0;
      e.idleT = 0; e.braveT = 0; e.recoilT = 0;
    }
    e.idleT += dt;
    e.braveT = Math.max(0, e.braveT - dt);
    e.recoilT = Math.max(0, e.recoilT - dt);

    const B = w.LYGO_BRAIN;
    const stl = B ? B.styleOf(b) : { band: 0.9, commit: 1.4, prefer: "nearest", retreat: 0.25 };
    const plan = B ? B.plan(S, e, dt) : { task: "press", band: b.range, gait: 1, point: null, target: null };
    if (B) B.age(e, dt);
    e.plan = plan;

    let t = plan.target;
    if (!t || t.dead) t = pickTarget(e, !stl.prefer || stl.prefer === "attack" ? "nearest" : stl.prefer);
    if (!t) return;
    e.target = t;

    /* ---- the kit: whatever is in reach and off cooldown, in the kit's own order.
       A body that cannot reach the called target still helps: the moves that land
       on its own side are thrown for whoever needs them. */
    for (let i = 0; i < b.moves.length; i++) {
      const mv = b.moves[i];
      if (e.cds[i] > 0 || e.mana < moveCost(mv)) continue;
      const d = dist2(e.x, e.y, t.x, t.y);
      const reach = (mv.range || 0) * TILE;
      const ring = (mv.radius || 3) * TILE;
      let ready = true;
      if (mv.aim === "allylow") { const low = lowestAlly(e); ready = low && low.hp / low.max < (mv.selfSt ? 0.72 : 0.8); }
      else if (mv.aim === "allies" || mv.shape === "allies") ready = e.hp / e.max < 0.92 || d < Math.max(reach, 5 * TILE);
      else if (mv.aim === "deadally") ready = (e.team === 0 ? S.your : S.foe).some((o) => o.dead);
      else if (mv.aim === "self" || mv.shape === "aura") ready = d < Math.max(reach, ring);
      else ready = d <= reach + 30;
      if (ready) { if (castMove(e, mv, i)) { if (stl.recoil) e.recoilT = 0.55; return; } }
    }

    /* ---- the ground. A plan either names a point or asks the body to hold where
       it stands; both are executed with the same walker. */
    const d = dist2(e.x, e.y, t.x, t.y);
    const band = Math.max(plan.band || (b.range > 100 ? b.range * 0.9 : 26), b.range <= 100 ? 24 : 58);
    let gx2 = plan.point ? plan.point.x : t.x;
    let gy2 = plan.point ? plan.point.y : t.y;
    /* hit-and-run: a body that just threw something steps back off its line */
    if (stl.recoil && e.recoilT > 0.35) {
      gx2 = e.x + (e.x - t.x) * 0.8; gy2 = e.y + (e.y - t.y) * 0.8; e.recoilT = 0;
    }
    /* Which of the two things is this body doing: going somewhere, or standing on
       the ground it has already won? A plan that names a point is always walked to.
       A plan that does not (press, hold) means "get to your band" — INSIDE the band
       that is a hold, outside it is a walk. Getting this wrong is not cosmetic: read
       every press as a hold and no team in the arena ever closes, every fight runs to
       the clock and the floor decides it. */
    const holdClass = plan.task === "hold" || plan.task === "overwatch" || plan.task === "screen";
    const inBand = d <= band + 18;
    const standing = plan.point ? false : (holdClass || inBand);
    if (standing) {
      /* in position: face the enemy, drift across its front. A body blocked on that
         drift turns around instead of grinding its shoulder into a wall. */
      if (e.blockedT > 0.25) { e.strafeDir = -e.strafeDir; }
      const sAmt = stl.strafe == null ? 0.5 : stl.strafe;
      const sa = Math.atan2(t.y - e.y, t.x - e.x) + Math.PI / 2;
      const mvx2 = Math.cos(sa) * st.speed * sAmt * 0.7 * dt * e.strafeDir;
      const mvy2 = Math.sin(sa) * st.speed * sAmt * 0.7 * dt * e.strafeDir;
      moveEntity(e, mvx2, mvy2);
      faceTo(e, t.x, t.y);
      e.aimA = Math.atan2(t.y - e.y, t.x - e.x);
      stampStuck(e, dt, false);
      return;
    }

    /* ---- pathing. In the open, walk the straight line; follow stone around
       corners. The choice is HELD for half a second: an enemy stepping in and out
       of cover flips a line-of-sight test every few ticks, and a heading that
       alternates between the direct line and the way round the rock walks on the
       spot for the rest of the match. */
    const cx = Math.floor(e.x / TILE), cy = Math.floor(e.y / TILE);
    /* A body whose own cell is stone is not walking anywhere sensible, whatever its plan
       says. It walks to the middle of the nearest open cell, straight through the
       collision test: it is already in the wall, so the only way out is through. Without
       this, a body shoved into the border by a knockback can sit in the stone for the
       rest of the match while its plan asks it to walk somewhere. */
    if (solid(S.lv, cx, cy)) {
      const ot = openTile(cx, cy);
      const tx2 = ot.x * TILE + TILE / 2, ty2 = ot.y * TILE + TILE / 2;
      const ang = Math.atan2(ty2 - e.y, tx2 - e.x);
      e.x = clamp(e.x + Math.cos(ang) * 52 * dt, 6, MAP_W * TILE - 6);
      e.y = clamp(e.y + Math.sin(ang) * 52 * dt, 6, MAP_H * TILE - 6);
      faceTo(e, t.x, t.y);
      e.aimA = Math.atan2(t.y - e.y, t.x - e.x);
      stampStuck(e, dt, true);
      return;
    }
    let inStone = false;
    if (solid(S.lv, cx, cy)) {
      inStone = true;
      e.slideT = 0;
      const out = openTile(cx, cy);
      gx2 = out.x * TILE + TILE / 2; gy2 = out.y * TILE + TILE / 2;
    } else {
      const gt = openTile(clamp(Math.floor(gx2 / TILE), 1, MAP_W - 2), clamp(Math.floor(gy2 / TILE), 1, MAP_H - 2));
      const gtx = gt.x, gty = gt.y;
      e.pathT = Math.max(0, e.pathT - dt);
      const needsField = !clearLine(e.x, e.y, gx2, gy2) || e.blockedT > 0.35;
      if (needsField) { e.pathOn = true; e.pathT = 0.5; }
      else if (e.pathT <= 0) e.pathOn = false;
      if (!(cx === gtx && cy === gty) && e.pathOn) {
        const f = flowField(S.lv, gtx, gty);
        const nxt = f[cy * MAP_W + cx];
        if (nxt >= 0) { gx2 = (nxt % MAP_W) * TILE + TILE / 2; gy2 = ((nxt / MAP_W) | 0) * TILE + TILE / 2; }
      }
    }
    /* a body that has been trying to move for over a second and gets nowhere walks
       to the middle of the arena for a moment. The pockets between the border and a
       pillar are the one place a wall-slide cannot reason its way out of. */
    if (e.blockedT > 1.2) e.bailT = 0.7;
    const bail = e.bailT > 0;
    if (bail) {
      e.bailT -= dt;
      gx2 = MAP_W * TILE * 0.5; gy2 = MAP_H * TILE * 0.5;
      e.pathOn = true; e.pathT = 0.7;      // and take the route, not the straight line
    }
    let a = Math.atan2(gy2 - e.y, gx2 - e.x);
    if (!inStone && e.slideT > 0) a += e.slideDir * Math.PI / 2;

    let mvx = Math.cos(a) * st.speed * dt;
    let mvy = Math.sin(a) * st.speed * dt;
    /* separation — a nudge, never a wall. Uncapped, four allies crowded round one
       slow body sum to more push-back than that body's walking speed. */
    let sx = 0, sy = 0;
    all().forEach((o) => {
      if (o === e || o.dead) return;
      const dd = dist2(e.x, e.y, o.x, o.y);
      if (dd < 17 && dd > 0.01) { sx += (e.x - o.x) / dd; sy += (e.y - o.y) / dd; }
    });
    const sepN = Math.hypot(sx, sy);
    if (sepN > 1e-6) {
      const sepVel = Math.min(26 * sepN, st.speed * 0.45);
      mvx += (sx / sepN) * sepVel * dt;
      mvy += (sy / sepN) * sepVel * dt;
    }
    const wanted = Math.hypot(mvx, mvy);
    const walked = moveEntity(e, mvx, mvy);
    if (wanted > 0.06 && walked < wanted * 0.45) {
      e.blockedT += dt;
      if (e.blockedT > e.blockedWorst) e.blockedWorst = e.blockedT;
      if (e.blockedT > 0.2 && e.slideT <= 0 && !inStone) {
        /* step to the side that is actually open, not a coin flip */
        const p1 = a + Math.PI / 2, p2 = a - Math.PI / 2;
        const ok1 = !solidAt(S.lv, e.x + Math.cos(p1) * 22, e.y + Math.sin(p1) * 22);
        const ok2 = !solidAt(S.lv, e.x + Math.cos(p2) * 22, e.y + Math.sin(p2) * 22);
        e.slideDir = ok1 && !ok2 ? 1 : ok2 && !ok1 ? -1 : (Math.random() < 0.5 ? 1 : -1);
        e.slideT = 0.42;
      }
    } else {
      e.blockedT = 0;
    }
    if (e.slideT > 0) e.slideT -= dt;
    e.walk += walked > 0.02 ? dt * 6 : 0;
    if (Math.abs(mvx) > Math.abs(mvy) * 0.7) e.face = mvx > 0 ? 3 : 2;
    else e.face = mvy > 0 ? 0 : 1;
    e.aimA = Math.atan2(t.y - e.y, t.x - e.x);
    stampStuck(e, dt, true);
  }

  /* The measure that matches the complaint "they get caught on things": a body that
     has somewhere to be, is leaning on stone, and has not moved for two seconds.
     Sampled in windows because a single frame says nothing — a body pressed into a
     wall while it dies is fine, a body pressed into one for a minute is not. */
  function stampStuck(e, dt, moving) {
    e.goalNow = moving;
    e.mvT += dt;
    if (e.mvT < 1.0) return;
    e.mvT = 0;
    const net = Math.hypot(e.x - e.mvX, e.y - e.mvY);
    e.mvX = e.x; e.mvY = e.y;
    if (e.goalNow && e.blockedT > 0.4 && net < 14) {
      e.stuckS += 1;
      if (e.stuckS > e.stuckWorst) e.stuckWorst = e.stuckS;
    } else e.stuckS = 0;
  }

  function moveEntity(e, dx, dy) {
    const x0 = e.x, y0 = e.y;
    const before = overlapAt(x0, y0);
    const nx = e.x + dx;
    /* A body standing inside stone — knocked there, pulled there, blinking there —
       may always push its way back out. The old rule demanded a fully clear
       destination, so a kit shoved into the border wall had EVERY direction
       refused, including the one that would have freed it, and it stood frozen for
       the rest of the match. This one rule was the whole of the "caught on the
       obstacles" report. */
    if (overlapAt(nx, e.y) <= before) e.x = nx;
    const ny = e.y + dy;
    if (overlapAt(e.x, ny) <= before) e.y = ny;
    return Math.hypot(e.x - x0, e.y - y0);
  }

  function flourish(e, vis, x2, y2) {
    e.animT = 0.34;
    e.animMax = 0.34;
    e.animVis = vis || "slash";
    if (w.LYGO_ATTACKS) w.LYGO_ATTACKS.cast(S, e, e.animVis, x2, y2);
  }

  function attack(e) {
    if (e.atkCd > 0 || e.stun > 0) return;
    const b = e.b;
    const t = e.target && !e.target.dead ? e.target : pickTarget(e, "nearest");
    if (!t) return;
    const st = buffed(e);
    const d = dist2(e.x, e.y, t.x, t.y);
    if (d > st.range + 16) return;
    if (e.silence > 0) return;
    faceTo(e, t.x, t.y);
    e.atkCd = 1 / Math.max(0.15, st.rate);
    flourish(e, b.atk.vis || (b.atk.type === "bolt" ? "shard" : "slash"), t.x, t.y);
    if (b.atk.sfx && w.ArenaUI && w.ArenaUI.sfx) w.ArenaUI.sfx(b.atk.sfx, 0.22);
    const isMelee = b.atk.type !== "bolt" && b.range <= 100;
    const echo = b.mods.echo || 0;
    const dmg = st.dmg * (1 + (b.atk.dmg || 0));
    if (isMelee) {
      damage(e, t, dmg, { melee: true, doubleFirst: !!b.mods.firstDouble });
      if (b.atk.splash) {
        enemiesOf(e).forEach((o) => {
          if (o === t) return;
          if (dist2(t.x, t.y, o.x, o.y) < b.atk.splash * TILE) damage(e, o, dmg * 0.45, { melee: true, dot: true });
        });
      }
      if (b.atk.burn) applySt(t, { burn: [b.atk.burn, 3] }, e);
      S.marks.push({ x: t.x, y: t.y - 8, r: 0, life: 0.18, col: e.b.color, spark: true });
    } else {
      S.projectiles.push({
        x: e.x, y: e.y - 8, a: Math.atan2(t.y - e.y, t.x - e.x), spd: 420, dmg: 0, src: e, team: e.team,
        w: b.atk.w, vis: b.atk.vis, col: b.color, life: 2.0, pierce: b.pierce || 0, frame: 0,
        direct: dmg, splashR: (b.atk.nova || 0) * TILE, splashMul: 0.5, doubleFirst: !!b.mods.firstDouble
      });
    }
    /* Echo Round: the shot arrives twice — the second one a beat later */
    if (echo) S.pending.push({ t: 0.32, x: t.x, y: t.y, r: 16, dmg: dmg * echo, src: e, col: e.b.color, echo: true, single: t });
  }

  /* -------------------------------------------------------------- projectiles */
  function stepProjectiles(dt) {
    for (let i = S.projectiles.length - 1; i >= 0; i--) {
      const p = S.projectiles[i];
      p.frame += dt * 14;
      const sp = p.spd * dt;
      p.x += Math.cos(p.a) * sp;
      p.y += Math.sin(p.a) * sp;
      p.life -= dt;
      let done = false;
      if (!p.ignoreWall && solidAt(S.lv, p.x, p.y)) done = true;
      if (p.lob) {
        if (dist2(p.x, p.y, p.tx, p.ty) < Math.max(14, p.spd * dt)) {
          blast(p.x, p.y, p.radius, p.dmg, p.src, p.st, p.team);
          done = true;
        }
      } else {
        const hits = all().filter((e) => !e.dead && e.team !== p.team && dist2(e.x, e.y - 6, p.x, p.y) < 15);
        hits.forEach((h) => {
          const amount = p.direct != null ? p.direct : p.dmg;
          damage(p.src, h, amount, { ranged: true, doubleFirst: !!p.doubleFirst });
          applySt(h, p.st, p.src);
          if (p.splashR) blast(p.x, p.y, p.splashR, amount * (p.splashMul || 0.5), p.src, null, p.team, true);
          done = true;
        });
      }
      if (p.life <= 0 || (p.x < 0 || p.y < 0 || p.x > MAP_W * TILE || p.y > MAP_H * TILE)) done = true;
      if (done) {
        if (p.pierce > 0 && p.life > 0) p.pierce--;
        else S.projectiles.splice(i, 1);
      }
    }
  }
  function blast(x, y, radius, dmg, src, st, team, quiet) {
    if (!quiet) S.marks.push({ x: x, y: y, r: radius, life: 0.35, col: (src && src.b.color) || "#fbbf24", ring: true });
    all().forEach((o) => {
      if (o.dead) return;
      if (team != null && o.team === team) return;
      if (dist2(x, y, o.x, o.y) > radius) return;
      if (dmg) damage(src, o, dmg, { ranged: true });
      applySt(o, st, src);
    });
  }

  /* -------------------------------------------------------------- the tick --- */
  function step(dt) {
    S.time += dt;
    /* the team call is made on the squad's own clock, before anybody moves */
    if (w.LYGO_BRAIN) w.LYGO_BRAIN.tick(S, dt);
    if (!S.sudden && S.time > SUDDEN) {
      S.sudden = true;
      pushEvent("The arena begins to close — every body starts losing the floor.", "warn");
    }
    all().forEach((e) => {
      if (e.dead) { e.dieT += dt; return; }
      e.stun = Math.max(0, e.stun - dt);
      e.root = Math.max(0, e.root - dt);
      e.silence = Math.max(0, e.silence - dt);
      e.slowT = Math.max(0, e.slowT - dt);
      e.swiftT = Math.max(0, e.swiftT - dt);
      e.hasteT = Math.max(0, e.hasteT - dt);
      e.rageT = Math.max(0, e.rageT - dt);
      e.weakT = Math.max(0, e.weakT - dt);
      e.thornsT = Math.max(0, e.thornsT - dt);
      e.reflectT = Math.max(0, e.reflectT - dt);
      e.veilT = Math.max(0, e.veilT - dt);
      e.regenT = Math.max(0, e.regenT - dt);
      e.lifestealT = Math.max(0, e.lifestealT - dt);
      e.tauntT = Math.max(0, e.tauntT - dt);
      e.armorBuffT = Math.max(0, e.armorBuffT - dt);
      if (e.armorBuffT <= 0) e.armorBuff = 0;
      e.shieldWallT = Math.max(0, e.shieldWallT - dt);
      e.flash = Math.max(0, e.flash - dt);
      e.animT = Math.max(0, e.animT - dt);
      if (e.ttl) { e.ttl -= dt; if (e.ttl <= 0) { e.dead = true; S.texts.push({ x: e.x, y: e.y - 20, t: "fades", life: 0.7, col: "#94a3b8" }); checkOver(); return; } }
      /* the well: regen status plus the card */
      const regen = (e.regenT > 0 ? e.regenHps : 0) + (e.b.mods.regen || 0);
      if (regen) e.hp = Math.min(e.max, e.hp + regen * dt);
      const realm = S.lv && S.lv.realm;
      if (realm === "root") e.hp = Math.min(e.max, e.hp + 1.8 * dt);
      if (realm === "ember") {
        const cx = MAP_W * TILE * 0.5, cy = MAP_H * TILE * 0.5;
        if (dist2(e.x, e.y, cx, cy) < 108) {
          e.emberHold = (e.emberHold || 0) + 11 * dt;
          if (e.emberHold >= 4) {
            const bite = e.emberHold;
            e.emberHold = 0;
            damage(null, e, bite, { dot: true, sure: true, noCrit: true, ignoreArmor: true });
            if (e.dead) return;
          }
        }
      }
      if (e.burnT > 0) { e.burnT -= dt; damage(null, e, e.burnDps * dt, { dot: true, sure: true, noCrit: true, ignoreArmor: true }); }
      if (e.bleedT > 0) { e.bleedT -= dt; damage(null, e, e.bleedDps * dt, { dot: true, sure: true, noCrit: true, ignoreArmor: true }); }
      if (S.sudden) {
        /* the arena closes for real: a share of maximum health per second, climbing, so no
           two healers can out-sustain the floor and leave a match unresolved. */
        const bite = e.max * (0.045 + Math.max(0, S.time - SUDDEN) * 0.0018) * dt;
        e.hp -= bite;
      }
      if (e.hp <= 0 && !e.dead) { die(e, null); return; }
      if (e.shd < 0) e.shd = 0;
      /* the last-stand card */
      if (!e.usedLastStand && e.b.cards.some((c) => c.hook === "lastStand") && e.hp / e.max < 0.3) {
        e.usedLastStand = true;
        heal(e, Math.round(e.max * 0.35), e);
        pushEvent(e.b.name + " will not go down — Second Wind.", "gift");
      }
      e.mana = Math.min(e.b.manaMax, e.mana + e.b.manaRegen * dt);
      const cdStep = dt * ((S.lv && S.lv.realm === "lattice") ? 1.1 : 1);
      e.cds = e.cds.map((c) => Math.max(0, c - cdStep));
      e.atkCd = Math.max(0, e.atkCd - cdStep);
      think(e, dt);
      attack(e);
      /* contact damage for anything standing in something's face, so melee always matters */
    });
    stepProjectiles(dt);
    for (let i = S.pending.length - 1; i >= 0; i--) {
      const p = S.pending[i];
      p.t -= dt;
      if (p.t > 0) continue;
      if (p.single) {
        if (!p.single.dead) damage(p.src, p.single, p.dmg, { ranged: true, dot: true });
      } else blast(p.x, p.y, p.r, p.dmg, p.src, p.st, p.src ? p.src.team : null);
      S.pending.splice(i, 1);
    }
    S.texts.forEach((t) => { t.life -= dt; t.y -= 18 * dt; });
    S.texts = S.texts.filter((t) => t.life > 0);
    S.marks.forEach((m) => { m.life -= dt; if (m.ring) m.r += 90 * dt; });
    S.marks = S.marks.filter((m) => m.life > 0);
    S.swings.forEach((s) => { s.life -= dt; });
    S.swings = S.swings.filter((s) => s.life > 0);
    S.zones.forEach((z) => {
      z.life -= dt;
      if (S.lv && S.lv.realm === "void") {
        live().forEach((e) => {
          if (dist2(e.x, e.y, z.x, z.y) <= z.r) {
            e.slowT = Math.max(e.slowT, 0.2);
            e.slowV = Math.max(e.slowV, z.slow);
          }
        });
      }
    });
    S.zones = S.zones.filter((z) => z.life > 0);
    if (S.lv && S.lv.realm === "tide" && !S.over) {
      S.tideIn -= dt;
      if (S.tideIn <= 0) {
        S.tideIn = 12;
        const cx = MAP_W * TILE * 0.5, cy = MAP_H * TILE * 0.5;
        pushEvent("The tide turns.", "law");
        S.marks.push({ x: cx, y: cy, r: 40, life: 0.7, col: "#38bdf8", ring: true });
        live().forEach((e) => {
          const a = Math.atan2(e.y - cy, e.x - cx) + 1.5708;
          moveEntity(e, Math.cos(a) * 36, Math.sin(a) * 36);
        });
      }
    }
    if (!S.over && S.time > HARD_STOP) {
      const a = live(0).reduce((s, e) => s + e.hp, 0), b2 = live(1).reduce((s, e) => s + e.hp, 0);
      S.over = true; S.phase = "over"; S.winner = a >= b2 ? 0 : 1;
      pushEvent("The clock runs out — the arena calls it on health remaining.", "over");
    }
  }

  /* ---------------------------------------------------------------- render --- */
  function paintFloor(lv) {
    if (!AT.tiles || !AT.meta.tiles) return null;
    const cv = document.createElement("canvas");
    cv.width = lv.W * TILE; cv.height = lv.H * TILE;
    const cx = cv.getContext("2d");
    cx.imageSmoothingEnabled = false;
    cx.fillStyle = "#05060a"; cx.fillRect(0, 0, cv.width, cv.height);
    const m = AT.meta.tiles, img = AT.tiles;
    const z = lv.realm;
    const tile = (name, x, y) => {
      const i = m.names[name];
      if (i == null) return;
      cx.drawImage(img, (i % m.cols) * m.cell, ((i / m.cols) | 0) * m.cell, m.cell, m.cell, x, y, TILE + 1, TILE + 1);
    };
    for (let y = 0; y < lv.H; y++) for (let x = 0; x < lv.W; x++) {
      const px = x * TILE, py = y * TILE;
      if (lv.tiles[y][x] === "wall") {
        const N = !solid(lv, x, y - 1), Sd = !solid(lv, x, y + 1), E = !solid(lv, x + 1, y), Wl = !solid(lv, x - 1, y);
        if (!N && !Sd && !E && !Wl) continue;
        tile(z + "_top", px, py);
        if (Sd) tile(z + "_face", px, py);
      } else {
        tile(z + "_f" + ((x & 3) + ((y & 3) << 2)), px, py);
      }
    }
    /* ---- the dressing. Each kind of colosseum paints its own floor, so a
       spectator knows which arena they are watching before the first blow lands. */
    const ring = (x, y, r, col, lw) => { cx.strokeStyle = col; cx.lineWidth = lw; cx.beginPath(); cx.arc(x, y, r, 0, 6.283); cx.stroke(); };
    const cxp = cv.width / 2, cyp = cv.height / 2;
    const kind = lv.kind || "colosseum";
    cx.save();
    /* sand grain: a seeded speckle so the sand never reads as flat colour */
    let sd = 1337;
    const rnd2 = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };
    cx.globalAlpha = 0.07;
    for (let i = 0; i < 900; i++) {
      const px = rnd2() * cv.width, py = rnd2() * cv.height;
      if (solid(lv, Math.floor(px / TILE), Math.floor(py / TILE))) continue;
      cx.fillStyle = rnd2() > 0.5 ? "#fde68a" : "#0f172a";
      cx.fillRect(px, py, 2, 2);
    }
    cx.globalAlpha = 0.30;
    if (kind === "pit") {
      ring(cxp, cyp, 118, "#fbbf24", 3);
      cx.globalAlpha = 0.10; cx.fillStyle = "#7f1d1d";
      cx.beginPath(); cx.arc(cxp, cyp, 96, 0, 6.283); cx.fill();
    } else if (kind === "colonnade") {
      cx.globalAlpha = 0.22;
      for (let i = -3; i <= 3; i++) {
        cx.strokeStyle = i % 2 ? "#5eead4" : "#fbbf24";
        cx.beginPath(); cx.moveTo(cxp + i * 54, 0); cx.lineTo(cxp + i * 54, cv.height); cx.stroke();
      }
    } else if (kind === "gauntlet") {
      cx.globalAlpha = 0.35;
      ring(cxp, cyp, 190, "#f87171", 2);
      cx.fillStyle = "#7f1d1d"; cx.globalAlpha = 0.12;
      cx.fillRect(cxp - TILE * 1.2, 0, TILE * 2.4, cv.height);
    } else if (kind === "ruin") {
      cx.globalAlpha = 0.16; cx.fillStyle = "#a16207";
      for (let i = 0; i < 26; i++) { const px = rnd2() * cv.width, py = rnd2() * cv.height; if (!solid(lv, Math.floor(px / TILE), Math.floor(py / TILE))) cx.fillRect(px, py, 8, 5); }
    } else {
      cx.globalAlpha = 0.28;
      ring(cxp, cyp, 150, "#5eead4", 3); ring(cxp, cyp, 100, "#fbbf24", 2); ring(cxp, cyp, 40, "#5eead4", 2);
    }
    /* the gates: a wash down each side so the two camps are legible at a glance */
    cx.fillStyle = "#22d3ee"; cx.globalAlpha = 0.10;
    cx.fillRect(TILE, 0, TILE * 3.2, cv.height);
    cx.fillStyle = "#f87171";
    cx.fillRect(cv.width - TILE * 4.2, 0, TILE * 3.2, cv.height);
    /* a stone lip round the whole floor, so the sand sits inside a building */
    cx.globalAlpha = 0.5; cx.strokeStyle = "#0b1220"; cx.lineWidth = 6;
    cx.strokeRect(3, 3, cv.width - 6, cv.height - 6);
    cx.globalAlpha = 0.25; cx.strokeStyle = "#e2e8f0"; cx.lineWidth = 1;
    cx.strokeRect(TILE + 1, TILE + 1, cv.width - TILE * 2 - 2, cv.height - TILE * 2 - 2);
    cx.restore();
    return cv;
  }

  function drawSprite(e) {
    const b = e.b, sheet = b.spr.sheet, img = AT[sheet];
    if (!img) return 0;
    const fr = b.spr.sheet === "heroes" ? ((e.walk | 0) % 2) : ((e.walk | 0) % 4);
    let frame = { face: e.face === 2 ? 2 : e.face === 3 ? 3 : 0, fr: fr };
    if (b.spr.sheet === "pets" || b.spr.sheet === "creatures") frame = { fr: fr };
    const c = cellOf(sheet, b.spr.key, frame);
    if (!c) return 0;
    const size = b.cls === "token" ? 34 : b.boss ? 52 : b.cls === "pet" ? 40 : 46;
    const flip = e.face === 2;
    const pose = w.LYGO_ATTACKS ? w.LYGO_ATTACKS.pose(e) : null;
    ctx.save();
    ctx.translate(Math.round(e.x + (pose ? pose.dx : 0)), Math.round(e.y + (pose ? pose.dy : 0)));
    if (pose) ctx.scale(pose.sx || 1, pose.sy || 1);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, c.sx, c.sy, c.cell, c.cell, -size / 2, -size * 0.78, size, size);
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
    if (e.flash > 0) {
      ctx.save();
      ctx.globalAlpha = e.flash * 3;
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(e.x, e.y - size * 0.3, size * 0.42, 0, 6.283); ctx.fill();
      ctx.restore();
    }
    return size;
  }

  function draw() {
    if (!ctx || !S.lv) return;
    const wpx = canvas.clientWidth, hpx = canvas.clientHeight;
    const dpr = Math.min(2, w.devicePixelRatio || 1);
    if (canvas.width !== (wpx * dpr | 0) || canvas.height !== (hpx * dpr | 0)) {
      canvas.width = wpx * dpr | 0; canvas.height = hpx * dpr | 0;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, wpx, hpx);
    const scale = Math.min(wpx / (S.lv.W * TILE), hpx / (S.lv.H * TILE));
    const ox = (wpx - S.lv.W * TILE * scale) / 2, oy = (hpx - S.lv.H * TILE * scale) / 2;
    const kick = S.shake > 0 ? S.shake * 16 : 0;
    const sx = kick ? (Math.random() - 0.5) * kick : 0;
    const sy = kick ? (Math.random() - 0.5) * kick : 0;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (ox + sx), dpr * (oy + sy));
    if (floorCv) ctx.drawImage(floorCv, 0, 0);
    drawLaw();

    /* pending blasts are telegraphed before they land: a spectator needs to see it coming */
    S.pending.forEach((p) => {
      ctx.save();
      ctx.strokeStyle = p.col || "#fbbf24";
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(S.time * 30);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r || 24, 0, 6.283); ctx.stroke();
      ctx.restore();
    });
    S.marks.forEach((m) => {
      ctx.save();
      ctx.strokeStyle = m.col || "#5eead4";
      ctx.globalAlpha = Math.max(0, m.life * 2.2);
      ctx.lineWidth = m.beam ? 6 : 3;
      if (m.beam) { ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x2, m.y2); ctx.stroke(); }
      else if (m.ring) { ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.283); ctx.stroke(); }
      else {
        ctx.fillStyle = m.col || "#fff";
        ctx.beginPath(); ctx.arc(m.x, m.y, 6 + (1 - m.life) * 12, 0, 6.283); ctx.fill();
      }
      ctx.restore();
    });
    /* shadows, then bodies sorted by depth */
    ctx.save(); ctx.globalAlpha = 0.32; ctx.fillStyle = "#000";
    all().forEach((e) => { if (e.dead) return; ctx.beginPath(); ctx.ellipse(e.x, e.y + 2, 13, 5, 0, 0, 6.283); ctx.fill(); });
    ctx.restore();
    const order = all().filter((e) => !e.dead).sort((a, b) => a.y - b.y);
    order.forEach((e) => {
      const size = drawSprite(e);
      /* team ring under the feet: the only thing a spectator must never have to guess */
      ctx.save();
      ctx.strokeStyle = e.team === 0 ? "#22d3ee" : "#f87171";
      ctx.lineWidth = 2; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + 2, 14, 6, 0, 0, 6.283); ctx.stroke();
      if (e.tauntT > 0 || e.shieldWallT > 0) {
        ctx.globalAlpha = 0.5; ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(e.x, e.y + 2, 20, 9, 0, 0, 6.283); ctx.stroke();
      }
      ctx.restore();
      /* health bar over the head with the shield stacked on top */
      const bw = e.b.boss ? 54 : 40, bx = e.x - bw / 2, by = e.y - size * 0.86 - 8;
      ctx.fillStyle = "rgba(3,6,12,0.82)";
      ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
      ctx.fillStyle = e.team === 0 ? "#22d3ee" : "#f87171";
      ctx.fillRect(bx, by, bw * clamp(e.hp / e.max, 0, 1), 5);
      if (e.shd > 0) {
        ctx.fillStyle = "rgba(251,191,36,0.85)";
        ctx.fillRect(bx, by - 3, bw * clamp(e.shd / e.max, 0, 1), 2);
      }
      /* ability pips: lit when a move is ready */
      const pips = e.b.moves.length;
      for (let i = 0; i < pips; i++) {
        const px = bx + (bw / (pips + 1)) * (i + 1) - 3;
        const ready = e.cds[i] <= 0 && e.mana >= moveCost(e.b.moves[i]);
        ctx.fillStyle = ready ? "#fbbf24" : "rgba(148,163,184,0.45)";
        ctx.fillRect(px, by - 8, 6, 4);
      }
      if (e.stun > 0 || e.root > 0 || e.silence > 0) {
        ctx.fillStyle = "#cbd5e1";
        ctx.font = "700 9px 'IBM Plex Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(e.stun > 0 ? "STUN" : e.root > 0 ? "ROOT" : "HUSH", e.x, by - 11);
      }
    });
    if (w.LYGO_ATTACKS) w.LYGO_ATTACKS.draw(ctx, S);
    /* projectiles */
    S.projectiles.forEach((p) => {
      if (w.LYGO_ATTACKS && p.vis) { w.LYGO_ATTACKS.shot(ctx, p); return; }
      const c = cellOf("fx", "bolt_" + p.w, { fr: (p.frame | 0) % 4 });
      if (c) ctx.drawImage(AT.fx, c.sx, c.sy, c.cell, c.cell, p.x - 9, p.y - 9, 18, 18);
      else { ctx.fillStyle = "#fbbf24"; ctx.fillRect(p.x - 3, p.y - 3, 6, 6); }
      if (p.lob) { ctx.strokeStyle = "rgba(148,163,184,0.5)"; ctx.beginPath(); ctx.arc(p.tx, p.ty, 10, 0, 6.283); ctx.stroke(); }
    });
    /* damage numbers */
    ctx.textAlign = "center";
    S.texts.forEach((t) => {
      ctx.save();
      ctx.globalAlpha = clamp(t.life * 1.6, 0, 1);
      ctx.font = (t.t === "FINISH" ? "800 22px " : t.big ? "800 15px " : "700 12px ") + "'IBM Plex Mono', monospace";
      ctx.fillStyle = "#000"; ctx.fillText(t.t, t.x + 1, t.y + 1);
      ctx.fillStyle = t.col; ctx.fillText(t.t, t.x, t.y);
      ctx.restore();
    });
    /* the closing arena */
    if (S.sudden) {
      const k = clamp((S.time - SUDDEN) / 60, 0, 1);
      ctx.save();
      ctx.strokeStyle = "rgba(248,113,113," + (0.25 + k * 0.5) + ")";
      ctx.lineWidth = 10 + k * 30;
      ctx.setLineDash([18, 14]);
      ctx.strokeRect(0, 0, S.lv.W * TILE, S.lv.H * TILE);
      ctx.restore();
    }
  }

  /* ----------------------------------------------------------------- API --- */
  let acc = 0, last = 0, raf = 0;
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const now = ts / 1000;
    const dt = Math.min(0.1, last ? now - last : 0);
    last = now;
    if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 1.35);
    if (S.phase === "count") {
      S.countdown -= dt;
      if (S.countdown <= 0) { S.phase = "live"; pushEvent("FIGHT.", "over"); }
    } else if (S.phase === "live" && !S.paused && S.hitStop > 0) {
      S.hitStop -= dt;
    } else if (S.phase === "live" && !S.paused) {
      acc += dt * S.speed;
      let steps = 0;
      while (acc >= STEP && steps < 24) { step(STEP); acc -= STEP; steps++; }
      if (acc > STEP * 24) acc = 0;
    }
    draw();
    if (w.ArenaUI) w.ArenaUI.tick();
  }

  async function init(cv) {
    canvas = cv;
    ctx = canvas.getContext("2d");
    await loadAssets();
    if (!raf) raf = requestAnimationFrame(frame);
    return true;
  }

  function newMatch(ids, mode, seed) {
    S.mode = mode;
    S.lv = buildMap(seed == null ? rnd(9999) : seed);
    fieldCache.clear();
    S.your = mkTeam(ids.you, 0);
    S.foe = mkTeam(ids.foe, 1);
    S.projectiles = []; S.pending = []; S.texts = []; S.marks = []; S.swings = []; S.zones = [];
    S.time = 0; S.over = false; S.winner = null; S.sudden = false; S.events = []; S.paused = false;
    S.countdown = 3.2; S.shake = 0; S.hitStop = 0; S.tideIn = 12;
    S.phase = "count";
    floorCv = paintFloor(S.lv);
    pushEvent(KIND_BLURB[S.lv.kind || "colosseum"], "law");
    pushEvent(lawById(S.lv.realm).line, "law");
    pushEvent("The arena opens. " + S.your.length + "v" + S.foe.length + ".", "over");
  }

  function drawLaw() {
    if (!S.lv) return;
    const realm = S.lv.realm;
    const cx = MAP_W * TILE * 0.5, cy = MAP_H * TILE * 0.5;
    ctx.save();
    if (realm === "ember") {
      ctx.globalAlpha = 0.16 + 0.07 * Math.sin(S.time * 4);
      ctx.fillStyle = "#f97316";
      ctx.beginPath(); ctx.arc(cx, cy, 108, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 0.75; ctx.strokeStyle = "#fb923c"; ctx.lineWidth = 2; ctx.stroke();
    } else if (realm === "frost") {
      ctx.globalAlpha = 0.07; ctx.fillStyle = "#7dd3fc";
      ctx.fillRect(0, 0, MAP_W * TILE, MAP_H * TILE);
    } else if (realm === "root") {
      ctx.globalAlpha = 0.05 + 0.03 * Math.sin(S.time * 2);
      ctx.fillStyle = "#4ade80";
      ctx.fillRect(0, 0, MAP_W * TILE, MAP_H * TILE);
    } else if (realm === "gold") {
      ctx.globalAlpha = 0.35; ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 78 + 8 * Math.sin(S.time * 2), 0, 6.283); ctx.stroke();
    } else if (realm === "lattice") {
      ctx.globalAlpha = 0.22; ctx.strokeStyle = "#5eead4"; ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) ctx.strokeRect(cx - i * 48, cy - i * 34, i * 96, i * 68);
    } else if (realm === "tide") {
      ctx.globalAlpha = 0.2; ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 90 + 14 * Math.sin(S.time * 1.4), 0, 6.283); ctx.stroke();
    }
    S.zones.forEach((z) => {
      ctx.globalAlpha = Math.max(0.12, (z.life / 3.5) * 0.4);
      ctx.fillStyle = "rgba(88,28,135,0.35)";
      ctx.strokeStyle = "#c4b5fd"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 6.283); ctx.fill(); ctx.stroke();
    });
    ctx.restore();
  }

  w.ArenaEngine = {
    init: init, newMatch: newMatch, draw: draw,
    setSpeed(n) { S.speed = n; },
    pause(on) { S.paused = !!on; },
    iconFor: iconFor,
    assets: () => AT,
    state: () => S,
    statusList: statusList,
    moveCost: moveCost,
    lawFor: lawForSeed,
    ringFor(seed) {
      const kind = kindOf(seed);
      return { law: lawForSeed(seed), kind: kind, blurb: KIND_BLURB[kind] };
    },
    stepHeadless(seconds) {
      const n = Math.round(seconds / STEP);
      for (let i = 0; i < n && !S.over; i++) step(STEP);
      return S;
    },
    brain: () => w.LYGO_BRAIN,
    law() { return lawById(S.lv && S.lv.realm); },
    /* a headless battle: step the sim without the renderer (used by the check tool) */
    runHeadless(ids, mode, seconds, seed) {
      newMatch(ids, mode, seed);
      S.phase = "live";
      const n = Math.round(seconds / STEP);
      for (let i = 0; i < n && !S.over; i++) step(STEP);
      return S;
    }
  };
})(window);
