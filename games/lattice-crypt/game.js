/* Lattice Crypt — four-warden co-op dungeon. Original pixel crawl. */
(() => {
  const TILE = 32;
  const SAVE = "lygo_lattice_crypt_v1";
  const ASSET = "./assets/";
  const HEROES = [
    { id: "kael", name: "Kael", tag: "Blade", shot: 3, speed: 3.1, magic: 2, armor: 4, melee: 5, color: "#ef4444", file: "p-kael.jpg" },
    { id: "vale", name: "Vale", tag: "Aegis", shot: 3, speed: 3.6, magic: 3, armor: 5, melee: 4, color: "#22d3ee", file: "p-vale.jpg" },
    { id: "orin", name: "Orin", tag: "Sigil", shot: 5, speed: 3.0, magic: 5, armor: 1, melee: 1, color: "#fbbf24", file: "p-orin.jpg" },
    { id: "nia", name: "Nia", tag: "Path", shot: 4, speed: 4.4, magic: 3, armor: 2, melee: 2, color: "#4ade80", file: "p-nia.jpg" }
  ];
  const REALMS = [
    { id: "stone", name: "Stone", floor: "floor", wall: "wall" },
    { id: "frost", name: "Frost", floor: "floor2", wall: "wall2" },
    { id: "ember", name: "Ember", floor: "floor3", wall: "wall3" },
    { id: "root", name: "Root", floor: "floor", wall: "wall" },
    { id: "tide", name: "Tide", floor: "floor2", wall: "wall2" },
    { id: "gold", name: "Gold", floor: "floor3", wall: "wall3" },
    { id: "void", name: "Void", floor: "floor2", wall: "wall4" },
    { id: "lattice", name: "Lattice", floor: "floor", wall: "wall4" }
  ];
  const FOE = {
    wraith: { hp: 1, dmg: 12, speed: 1.7, melee: false, pts: 10 },
    brute: { hp: 1, dmg: 7, speed: 1.5, melee: true, pts: 8 },
    imp: { hp: 1, dmg: 9, speed: 1.3, melee: true, shoot: true, pts: 12 },
    hurler: { hp: 1, dmg: 10, speed: 1.1, melee: true, lob: true, pts: 14 },
    shade: { hp: 2, dmg: 11, speed: 1.6, melee: true, flicker: true, pts: 16 },
    thief: { hp: 2, dmg: 4, speed: 2.4, melee: true, steal: true, pts: 50 },
    drain: { hp: 99, dmg: 4, speed: 1.35, melee: true, drain: true, ghost: true, pts: 250 }
  };
  const KEYS_P = [
    { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD", fire: ["KeyJ"], mag: ["KeyK", "ShiftLeft"] },
    { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", fire: ["Semicolon", "Numpad1"], mag: ["Quote", "Numpad2"] },
    { up: "KeyT", down: "KeyG", left: "KeyF", right: "KeyH", fire: ["KeyR"], mag: ["KeyY"] },
    { up: "Numpad8", down: "Numpad5", left: "Numpad4", right: "Numpad6", fire: ["Numpad0"], mag: ["NumpadEnter"] }
  ];
  const PLAY_CODES = new Set([
    "KeyW", "KeyA", "KeyS", "KeyD", "KeyJ", "KeyK", "ShiftLeft", "Space",
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Semicolon", "Quote",
    "KeyT", "KeyG", "KeyF", "KeyH", "KeyR", "KeyY",
    "Numpad8", "Numpad5", "Numpad4", "Numpad6", "Numpad0", "Numpad1", "Numpad2", "NumpadEnter", "Enter"
  ]);
  const BAG = ["food", "flask", "chest", "key", "vial", "poison", "codex", "swift", "aegis", "veil", "pulse", "warp", "reflect"];
  const KINDS = ["wraith", "brute", "imp", "hurler", "shade"];

  const $ = (id) => document.getElementById(id);
  const canvas = $("crypt");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  let atlas = null, names = {}, cell = 32, cols = 16;
  let keys = {};
  let keyEdge = {};
  let G = null;
  let overlayMode = "menu";
  let announce = { t: "", life: 0 };
  let persist = { name: "Warden", best: 0, runs: 0, hero: "kael" };
  let cam = { x: 0, y: 0 };
  let actx = null;

  function loadPersist() {
    try { Object.assign(persist, JSON.parse(localStorage.getItem(SAVE) || "{}")); } catch (_) {}
  }
  function savePersist() { localStorage.setItem(SAVE, JSON.stringify(persist)); }

  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function heroOf(id) { return HEROES.find((h) => h.id === id) || HEROES[0]; }

  function beep(kind) {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.connect(g); g.connect(actx.destination);
      const now = actx.currentTime;
      const map = { shot: [620, 0.05], hit: [180, 0.07], vial: [240, 0.18], pick: [880, 0.06], hurt: [90, 0.12], pad: [320, 0.08] };
      const m = map[kind] || [440, 0.05];
      o.frequency.value = m[0];
      o.type = kind === "shot" ? "square" : "triangle";
      g.gain.setValueAtTime(0.04, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + m[1]);
      o.start(now); o.stop(now + m[1] + 0.02);
    } catch (_) {}
  }
  function say(t) { announce = { t: t, life: 2.4 }; log(t); }
  function log(t) {
    if (!G) return;
    G.log.unshift(t);
    G.log = G.log.slice(0, 40);
    const el = $("log");
    if (el) el.innerHTML = G.log.slice(0, 12).map((x) => "<div>" + String(x).replace(/</g, "") + "</div>").join("");
  }

  function spr(name) {
    const i = names[name];
    if (i == null) return null;
    return { sx: (i % cols) * cell, sy: Math.floor(i / cols) * cell };
  }
  function drawSpr(name, x, y, w) {
    const s = spr(name);
    if (!s || !atlas) return;
    w = w || TILE;
    ctx.drawImage(atlas, s.sx, s.sy, cell, cell, x, y, w, w);
  }

  function fillRect(tiles, W, H, x, y, w, h, t) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (xx > 0 && yy > 0 && xx < W - 1 && yy < H - 1) tiles[yy][xx] = t;
      }
    }
  }

  function carveLayout(tiles, W, H, R, kind) {
    const rooms = [];
    function addRoom(rx, ry, rw, rh) {
      fillRect(tiles, W, H, rx, ry, rw, rh, "floor");
      rooms.push({ x: rx, y: ry, w: rw, h: rh, cx: rx + (rw >> 1), cy: ry + (rh >> 1) });
    }
    function tunnel(a, b) {
      let x = a.cx, y = a.cy;
      while (x !== b.cx) { tiles[y][x] = "floor"; x += x < b.cx ? 1 : -1; }
      while (y !== b.cy) { tiles[y][x] = "floor"; y += y < b.cy ? 1 : -1; }
    }
    if (kind === "cross") {
      addRoom(2, (H >> 1) - 2, W - 4, 5);
      addRoom((W >> 1) - 2, 2, 5, H - 4);
    } else if (kind === "ring") {
      addRoom(2, 2, W - 4, H - 4);
      fillRect(tiles, W, H, 7, 6, W - 14, H - 12, "wall");
      tiles[6][W >> 1] = "floor";
      tiles[H - 7][W >> 1] = "floor";
    } else if (kind === "halls") {
      for (let y = 3; y < H - 3; y += 4) addRoom(2, y, W - 4, 2);
      for (let x = 4; x < W - 3; x += 7) addRoom(x, 2, 2, H - 4);
    } else if (kind === "cells") {
      for (let y = 2; y < H - 5; y += 5) {
        for (let x = 2; x < W - 5; x += 6) addRoom(x, y, 4, 3);
      }
      for (let i = 1; i < rooms.length; i++) tunnel(rooms[i - 1], rooms[i]);
    } else if (kind === "arena") {
      addRoom(4, 3, W - 8, H - 6);
      addRoom(2, (H >> 1) - 1, W - 4, 3);
    } else if (kind === "vault") {
      addRoom(3, 3, 8, 7);
      addRoom(W - 12, 3, 8, 7);
      addRoom(8, H - 10, W - 16, 6);
      addRoom((W >> 1) - 4, (H >> 1) - 3, 8, 6);
      for (let i = 1; i < rooms.length; i++) tunnel(rooms[i - 1], rooms[i]);
    } else if (kind === "spiral") {
      addRoom(2, 2, W - 4, 2);
      addRoom(W - 4, 2, 2, H - 4);
      addRoom(2, H - 4, W - 4, 2);
      addRoom(2, 6, 2, H - 10);
      addRoom(2, 6, W - 10, 2);
      addRoom(W - 10, 6, 2, H - 14);
      addRoom(6, H - 8, W - 16, 2);
    } else {
      const nR = 6 + ((R() * 5) | 0);
      for (let n = 0; n < nR; n++) {
        const rw = 4 + ((R() * 6) | 0), rh = 4 + ((R() * 5) | 0);
        const rx = 1 + ((R() * (W - rw - 2)) | 0);
        const ry = 1 + ((R() * (H - rh - 2)) | 0);
        addRoom(rx, ry, rw, rh);
      }
      for (let i = 1; i < rooms.length; i++) tunnel(rooms[i - 1], rooms[i]);
    }
    for (let x = 0; x < W; x++) { tiles[0][x] = "wall"; tiles[H - 1][x] = "wall"; }
    for (let y = 0; y < H; y++) { tiles[y][0] = "wall"; tiles[y][W - 1] = "wall"; }
    return rooms;
  }

  function floorsOf(tiles, W, H) {
    const out = [];
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (tiles[y][x] === "floor") out.push({ x, y });
      }
    }
    return out;
  }

  function genLevel(seed, floor) {
    const R = rng(seed ^ (floor * 7919));
    const W = 30, H = 26;
    const tiles = Array.from({ length: H }, () => Array(W).fill("wall"));
    const layouts = ["rooms", "cross", "cells", "halls", "arena", "ring", "vault", "spiral"];
    const kind = floor % 8 === 0 && floor > 0 ? "vault" : layouts[floor % 8];
    const rooms = carveLayout(tiles, W, H, R, kind);
    const spots = floorsOf(tiles, W, H);
    const pickSpot = () => spots[(R() * spots.length) | 0] || { x: 2, y: 2 };
    const start = rooms[0] ? { x: rooms[0].cx, y: rooms[0].cy } : pickSpot();
    if (tiles[start.y][start.x] === "wall") Object.assign(start, pickSpot());
    let exit = rooms.length ? { x: rooms[rooms.length - 1].cx, y: rooms[rooms.length - 1].cy } : pickSpot();
    let best = 0;
    spots.forEach((p) => {
      const d = Math.abs(p.x - start.x) + Math.abs(p.y - start.y);
      if (d > best) { best = d; exit = p; }
    });
    const treasure = floor % 8 === 0 && floor > 0;
    if (treasure) {
      const corners = [
        { x: 2, y: 2 }, { x: W - 3, y: 2 }, { x: 2, y: H - 3 }, { x: W - 3, y: H - 3 }
      ].filter((p) => tiles[p.y] && tiles[p.y][p.x] === "floor");
      if (corners.length) exit = corners[(R() * corners.length) | 0];
    }
    tiles[exit.y][exit.x] = "exit";

    const items = [];
    const gens = [];
    const foes = [];
    const doors = [];
    const pads = [];
    const rank = 1 + Math.min(2, (floor / 12) | 0);
    const used = {};
    function mark(x, y) { used[x + "," + y] = 1; }
    mark(start.x, start.y); mark(exit.x, exit.y);
    function empty() {
      for (let k = 0; k < 120; k++) {
        const x = 1 + ((R() * (W - 2)) | 0), y = 1 + ((R() * (H - 2)) | 0);
        if (tiles[y][x] === "floor" && !used[x + "," + y]) { mark(x, y); return { x, y }; }
      }
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          if (tiles[y][x] === "floor" && !used[x + "," + y]) { mark(x, y); return { x, y }; }
        }
      }
      return null;
    }
    const gN = 3 + ((R() * 4) | 0) + Math.min(4, (floor / 8) | 0);
    for (let i = 0; i < gN; i++) {
      const p = empty();
      if (!p) break;
      gens.push({ x: p.x, y: p.y, kind: KINDS[(R() * KINDS.length) | 0], rank, hp: 3 * rank, t: R() * 0.6 });
    }
    const itemN = treasure ? 14 : 6 + ((R() * 5) | 0);
    for (let i = 0; i < itemN; i++) {
      const p = empty();
      if (!p) break;
      const k = treasure ? (R() < 0.55 ? "chest" : BAG[(R() * BAG.length) | 0]) : BAG[(R() * BAG.length) | 0];
      items.push({ x: p.x, y: p.y, kind: k });
    }
    if (R() < 0.45 || floor % 5 === 4) {
      const p = empty();
      if (p) items.push({ x: p.x, y: p.y, kind: "vial", hidden: true });
    }
    const dN = 1 + ((R() * 3) | 0);
    for (let i = 0; i < dN; i++) {
      const p = empty();
      if (!p) break;
      tiles[p.y][p.x] = "door";
      doors.push(p);
    }
    if (R() < 0.4) {
      const a = empty(), b = empty();
      if (a && b) {
        tiles[a.y][a.x] = "pad";
        tiles[b.y][b.x] = "pad";
        pads.push({ x: a.x, y: a.y, tx: b.x + 0.5, ty: b.y + 0.5 });
        pads.push({ x: b.x, y: b.y, tx: a.x + 0.5, ty: a.y + 0.5 });
      }
    }
    if (R() < 0.35) {
      const p = empty();
      if (p) items.push({ x: p.x, y: p.y, kind: "trap" });
    }
    const idle = 2 + ((R() * 4) | 0);
    for (let i = 0; i < idle; i++) {
      const p = empty();
      if (!p) break;
      foes.push(makeFoe(KINDS[(R() * KINDS.length) | 0], rank, p.x + 0.5, p.y + 0.5));
    }
    if (floor >= 6 && R() < 0.22 + floor * 0.01) {
      foes.push(makeFoe("drain", 1, exit.x + 0.5, exit.y + 0.5));
    }
    return {
      W, H, tiles, start, items, gens, foes, doors, pads,
      realm: REALMS[floor % 8],
      layout: kind,
      treasure: treasure ? 30 : 0,
      quiet: 0
    };
  }

  function makeFoe(kind, rank, x, y) {
    const d = FOE[kind];
    return {
      kind, rank, x, y,
      hp: kind === "drain" ? 99 : d.hp * rank,
      max: kind === "drain" ? 99 : d.hp * rank,
      vx: 0, vy: 0, t: 0, hurt: 0, flicker: 0, stun: 0
    };
  }

  function inB(lv, x, y) { return x >= 0 && y >= 0 && x < lv.W && y < lv.H; }
  function tileAt(lv, x, y) {
    const tx = Math.floor(x), ty = Math.floor(y);
    if (!inB(lv, tx, ty)) return "wall";
    return lv.tiles[ty][tx];
  }
  function blocked(lv, x, y) {
    const t = tileAt(lv, x, y);
    return t === "wall" || t === "door";
  }
  function shadeHidden(f) {
    return FOE[f.kind] && FOE[f.kind].flicker && (f.flicker % 1.2) < 0.5;
  }

  function newRun(opts) {
    opts = opts || {};
    const seed = ((opts.seed != null ? opts.seed : (Math.random() * 0xFFFFFFFF)) ^ Date.now()) >>> 0;
    G = {
      seed, floor: 0, score: 0, credits: 1, t: 0, log: [],
      level: null, shots: [], fx: [],
      players: [],
      thiefT: 8,
      over: false
    };
    joinHero(opts.hero || persist.hero, 0);
    loadFloor(0);
    overlayMode = null;
    hideOverlay();
    $("app").classList.remove("hidden");
    say("The lattice opens.");
    if (opts.coop) {
      credit();
      say("Cabinet co-op — P2 arrows · ; fire · ' vial.");
    }
    paintUI();
  }

  function joinHero(id, slot) {
    if (!G || G.players.length >= 4) return null;
    const h = heroOf(id);
    const s = slot != null ? slot : G.players.length;
    const p = {
      slot: s, hero: h, x: 2, y: 2, hp: 700, max: 700,
      keys: 0, vials: 1, facing: 2, aimX: 1, aimY: 0, walk: 0, fireT: 0, magT: 0,
      shotBoost: 0, swift: 0, aegis: 0, veil: 0, reflect: 0, stun: 0, padT: 0,
      dead: false, pad: -1, hurtBeep: 0
    };
    G.players.push(p);
    return p;
  }

  function loadFloor(n) {
    G.floor = n;
    G.level = genLevel(G.seed, n);
    const st = G.level.start;
    G.players.forEach((p, i) => {
      if (p.dead) return;
      p.x = st.x + 0.5 + (i % 2) * 0.4;
      p.y = st.y + 0.5 + ((i / 2) | 0) * 0.4;
      p.padT = 0;
    });
    G.shots = [];
    G.thiefT = 10 + (Math.random() * 18);
    $("holePill").textContent = G.level.realm.name.toUpperCase() + " " + (n + 1);
    if (G.level.treasure) say("Treasure rush — thirty seconds.");
    else if (G.level.items.some((it) => it.hidden)) say("A hidden vial waits.");
    if (G.level.foes.some((f) => f.kind === "drain")) say("The Drain walks.");
    const foc = G.players.find((p) => !p.dead) || G.players[0];
    const cw = canvas.clientWidth || 800, ch = canvas.clientHeight || 480;
    cam.x = foc.x * TILE - cw / 2;
    cam.y = foc.y * TILE - ch / 2;
    paintUI();
  }

  function dirFrom(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 1 : 2;
    return dy < 0 ? 3 : 0;
  }

  function claimedPads() {
    const s = new Set();
    G.players.forEach((p) => { if (p.pad >= 0) s.add(p.pad); });
    return s;
  }

  function bindIdlePads() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const claimed = claimedPads();
    G.players.forEach((p) => {
      if (p.dead || p.pad >= 0) return;
      for (let i = 0; i < pads.length; i++) {
        const pad = pads[i];
        if (!pad || claimed.has(i)) continue;
        const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
        const used = Math.hypot(ax, ay) > 0.5 || (pad.buttons[0] && pad.buttons[0].pressed) ||
          (pad.buttons[7] && pad.buttons[7].pressed);
        if (used) { p.pad = i; claimed.add(i); break; }
      }
    });
  }

  function inputFor(p) {
    const map = KEYS_P[p.slot] || KEYS_P[0];
    let dx = 0, dy = 0;
    if (keys[map.up]) dy -= 1;
    if (keys[map.down]) dy += 1;
    if (keys[map.left]) dx -= 1;
    if (keys[map.right]) dx += 1;
    let fire = map.fire.some((k) => keys[k] || keyEdge[k]);
    let mag = map.mag.some((k) => keys[k] || keyEdge[k]);
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = p.pad >= 0 ? pads[p.pad] : null;
    if (pad) {
      const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
      if (Math.abs(ax) > 0.35) dx += ax;
      if (Math.abs(ay) > 0.35) dy += ay;
      if (pad.buttons[12] && pad.buttons[12].pressed) dy -= 1;
      if (pad.buttons[13] && pad.buttons[13].pressed) dy += 1;
      if (pad.buttons[14] && pad.buttons[14].pressed) dx -= 1;
      if (pad.buttons[15] && pad.buttons[15].pressed) dx += 1;
      if (pad.buttons[0] && pad.buttons[0].pressed) fire = true;
      if (pad.buttons[7] && pad.buttons[7].pressed) fire = true;
      if (pad.buttons[1] && pad.buttons[1].pressed) mag = true;
      if (pad.buttons[2] && pad.buttons[2].pressed) mag = true;
      if (pad.buttons[6] && pad.buttons[6].pressed) mag = true;
    }
    if (dx || dy) {
      const l = Math.hypot(dx, dy) || 1;
      dx /= l; dy /= l;
      p.facing = dirFrom(dx, dy);
      p.aimX = dx; p.aimY = dy;
    }
    return { dx, dy, fire, mag };
  }

  function tryMove(ent, dx, dy, speed, dt, ghost) {
    const nx = ent.x + dx * speed * dt;
    const ny = ent.y + dy * speed * dt;
    const r = 0.28;
    if (ghost || (!blocked(G.level, nx, ent.y) && !blocked(G.level, nx - r, ent.y) && !blocked(G.level, nx + r, ent.y))) ent.x = nx;
    if (ghost || (!blocked(G.level, ent.x, ny) && !blocked(G.level, ent.x, ny - r) && !blocked(G.level, ent.x, ny + r))) ent.y = ny;
    if (ent.keys != null) bumpDoor(ent);
  }

  function bumpDoor(ent) {
    const tx = Math.floor(ent.x), ty = Math.floor(ent.y);
    const near = [[tx, ty], [tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1]];
    for (const [x, y] of near) {
      if (!inB(G.level, x, y)) continue;
      if (G.level.tiles[y][x] !== "door") continue;
      if (Math.hypot(ent.x - (x + 0.5), ent.y - (y + 0.5)) > 1.2) continue;
      if (ent.keys > 0) {
        ent.keys--;
        G.level.tiles[y][x] = "door_open";
        log("Door opens.");
      }
    }
  }

  function fireShot(p) {
    const live = G.shots.filter((s) => s.owner === p).length;
    const cap = p.shotBoost > 0 ? 3 : 1;
    if (live >= cap || p.fireT > 0) return;
    let ax = p.aimX, ay = p.aimY;
    const l = Math.hypot(ax, ay) || 1;
    ax /= l; ay /= l;
    let sx = p.x + ax * 0.35, sy = p.y + ay * 0.35;
    if (blocked(G.level, sx, sy)) { sx = p.x; sy = p.y; }
    G.shots.push({
      x: sx, y: sy, vx: ax * 11, vy: ay * 11,
      dmg: p.hero.shot, owner: p, life: 1.15, grace: 0.08, hero: p.hero.id, bounced: false
    });
    beep("shot");
    p.fireT = p.shotBoost > 0 ? 0.12 : 0.28;
  }

  function useVial(p) {
    if (p.vials < 1 || p.magT > 0) return;
    p.vials--;
    p.magT = 0.5;
    beep("vial");
    const pow = 20 * p.hero.magic;
    say(p.hero.name + " spends a vial.");
    G.level.foes.forEach((f) => {
      if (Math.hypot(f.x - p.x, f.y - p.y) > 11) return;
      if (f.kind === "drain") { f.hp = 0; G.score += 250; say("The Drain is unmade."); }
      else f.hp -= pow;
    });
    G.level.gens.forEach((g) => { g.hp -= Math.max(1, (pow / 20) | 0); });
    G.fx.push({ x: p.x, y: p.y, life: 0.45, kind: "nova" });
  }

  function randomFloor(p) {
    const lv = G.level;
    for (let k = 0; k < 80; k++) {
      const x = 1 + ((Math.random() * (lv.W - 2)) | 0);
      const y = 1 + ((Math.random() * (lv.H - 2)) | 0);
      if (lv.tiles[y][x] === "floor") { p.x = x + 0.5; p.y = y + 0.5; return; }
    }
  }

  function pickup(p) {
    G.level.items = G.level.items.filter((it) => {
      if (Math.hypot(it.x + 0.5 - p.x, it.y + 0.5 - p.y) > 0.55) return true;
      G.level.quiet = 0;
      beep("pick");
      if (it.kind === "food") { p.hp = Math.min(9999, p.hp + 100); G.score += 100; say(p.hero.name + " takes rations."); }
      else if (it.kind === "flask") { p.hp = Math.min(9999, p.hp + 200); G.score += 100; say(p.hero.name + " drinks a flask."); }
      else if (it.kind === "poison") { p.hp -= 100; p.shotBoost = 0; p.swift = 0; p.aegis = 0; p.veil = 0; p.reflect = 0; say(p.hero.name + " drank blight."); }
      else if (it.kind === "key") { p.keys++; G.score += 50; }
      else if (it.kind === "chest") { G.score += 200; }
      else if (it.kind === "vial") { p.vials++; G.score += 50; say("Vial."); }
      else if (it.kind === "codex") { p.shotBoost = 12; G.score += 80; say("Shot Codex."); }
      else if (it.kind === "swift") { p.swift = 12; G.score += 80; say("Swift."); }
      else if (it.kind === "aegis") { p.aegis = 14; G.score += 80; say("Aegis."); }
      else if (it.kind === "veil") { p.veil = 8; G.score += 80; say("Veil."); }
      else if (it.kind === "reflect") { p.reflect = 10; G.score += 80; say("Reflect."); }
      else if (it.kind === "pulse") {
        G.level.foes.forEach((f) => { if (Math.hypot(f.x - p.x, f.y - p.y) < 8) f.stun = 3; });
        G.score += 80; say("Pulse — foes freeze.");
        G.fx.push({ x: p.x, y: p.y, life: 0.35, kind: "nova" });
      }
      else if (it.kind === "warp") { randomFloor(p); G.score += 40; say(p.hero.name + " warps."); }
      else if (it.kind === "trap") { p.stun = 0.8; p.hp -= 15; }
      return false;
    });
  }

  function hitFoe(f, dmg, melee) {
    if (f.kind === "wraith" && melee) return;
    if (shadeHidden(f)) return;
    if (f.kind === "drain") return;
    f.hp -= dmg;
    f.hurt = 0.12;
    if (f.hp <= 0) G.score += (FOE[f.kind].pts || 10) * f.rank;
  }

  function stepPad(p) {
    if (p.padT > 0) return;
    if (tileAt(G.level, p.x, p.y) !== "pad") return;
    const tx = Math.floor(p.x), ty = Math.floor(p.y);
    const pad = (G.level.pads || []).find((d) => d.x === tx && d.y === ty);
    if (!pad) return;
    p.x = pad.tx; p.y = pad.ty; p.padT = 0.85;
    beep("pad");
    say("Lattice gate.");
  }

  function update(dt) {
    if (!G || G.over || overlayMode === "menu" || overlayMode === "sheet") { keyEdge = {}; return; }
    G.t += dt;
    announce.life -= dt;
    const lv = G.level;
    if (lv.treasure > 0) {
      lv.treasure -= dt;
      if (lv.treasure <= 0) { say("Rush over."); nextFloor(); return; }
    }
    lv.quiet += dt;
    if (lv.quiet > 18) {
      for (let y = 0; y < lv.H; y++) for (let x = 0; x < lv.W; x++) {
        if (lv.tiles[y][x] === "door") lv.tiles[y][x] = "door_open";
      }
    }
    if (lv.quiet > 180 && !lv._stallExit) {
      lv._stallExit = true;
      const live = G.players.find((p) => !p.dead);
      if (live) {
        const tx = Math.floor(live.x), ty = Math.floor(live.y);
        const near = [[tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1]];
        for (const [x, y] of near) {
          if (inB(lv, x, y) && lv.tiles[y][x] === "wall") { lv.tiles[y][x] = "exit"; say("A wall yawns open."); break; }
        }
      }
    }

    G.thiefT -= dt;
    if (G.thiefT <= 0) {
      G.thiefT = 38 + Math.random() * 18;
      lv.foes.push(makeFoe("thief", 1, lv.start.x + 0.5, lv.start.y + 0.5));
      say("A thief slips the gate.");
    }

    lv.gens.forEach((g) => {
      if (g.hp <= 0) return;
      g.t += dt;
      const cap = 2 + g.rank;
      const live = lv.foes.filter((f) => f.kind === g.kind && Math.hypot(f.x - g.x, f.y - g.y) < 8).length;
      if (g.t > (1.4 / g.rank) && live < cap) {
        g.t = 0;
        lv.foes.push(makeFoe(g.kind, g.rank, g.x + 0.5, g.y + 0.5));
      }
    });
    lv.gens = lv.gens.filter((g) => g.hp > 0);

    bindIdlePads();
    G.players.forEach((p) => {
      if (p.dead) return;
      p.hp -= dt * 1.05;
      p.fireT = Math.max(0, p.fireT - dt);
      p.magT = Math.max(0, p.magT - dt);
      p.stun = Math.max(0, p.stun - dt);
      p.padT = Math.max(0, p.padT - dt);
      p.shotBoost = Math.max(0, p.shotBoost - dt);
      p.swift = Math.max(0, p.swift - dt);
      p.aegis = Math.max(0, p.aegis - dt);
      p.veil = Math.max(0, p.veil - dt);
      p.reflect = Math.max(0, p.reflect - dt);
      p.hurtBeep = Math.max(0, (p.hurtBeep || 0) - dt);
      if (p.hp <= 0) {
        p.dead = true;
        p.hp = 0;
        say(p.hero.name + " falls. Credit to rise.");
        return;
      }
      const inn = inputFor(p);
      if (p.stun <= 0) {
        const spd = (2.2 + p.hero.speed * 0.55) * (p.swift > 0 ? 1.35 : 1);
        tryMove(p, inn.dx, inn.dy, spd, dt, false);
        if (inn.dx || inn.dy) p.walk += dt * 8;
      }
      if (inn.fire) fireShot(p);
      if (inn.mag) useVial(p);
      pickup(p);
      stepPad(p);
      unstack(p);
      if (tileAt(lv, p.x, p.y) === "exit") G._exit = true;
    });
    if (G._exit) { G._exit = false; nextFloor(); return; }

    if (G.players.every((p) => p.dead)) {
      G.over = true;
      persist.runs++;
      persist.best = Math.max(persist.best, G.score);
      savePersist();
      const posted = Math.max(0, (G.score / Math.max(1, G.credits)) | 0);
      if (window.ArcadeLedger) {
        ArcadeLedger.crypt({
          name: (persist.name || "Warden").slice(0, 18),
          score: posted, raw: G.score, floor: G.floor + 1, credits: G.credits,
          date: new Date().toISOString().slice(0, 10)
        });
      }
      showSheet(
        "<p class='kicker'>Run closed</p><h2>" + G.score + " · floor " + (G.floor + 1) + "</h2>" +
        "<p class='lore'>Hall score " + posted + " (per credit) · Best " + persist.best + " · credits " + G.credits + "</p>" +
        "<div class='modes'><button class='btn gold' id='again'>Descend again</button><button class='btn' id='mm'>Menu</button></div>"
      );
      $("again").onclick = () => newRun({ hero: persist.hero });
      $("mm").onclick = menu;
      return;
    }

    const liveP = G.players.filter((p) => !p.dead);
    lv.foes.forEach((f) => {
      f.t += dt; f.hurt = Math.max(0, f.hurt - dt); f.flicker += dt;
      f.stun = Math.max(0, (f.stun || 0) - dt);
      if (f.stun > 0) return;
      const def = FOE[f.kind];
      let tgt = null, bd = 1e9;
      liveP.forEach((p) => {
        if (p.veil > 0 && Math.hypot(p.x - f.x, p.y - f.y) > 0.42) return;
        const d = Math.hypot(p.x - f.x, p.y - f.y);
        if (d < bd) { bd = d; tgt = p; }
      });
      if (!tgt) return;
      const ang = Math.atan2(tgt.y - f.y, tgt.x - f.x);
      const ghost = !!def.ghost;
      let mx = Math.cos(ang), my = Math.sin(ang);
      if (def.shoot) {
        if (bd < 3.2) { mx = -mx; my = -my; }
        else if (bd < 5.2) { mx = -my; my = mx; }
      }
      tryMove(f, mx, my, def.speed * (0.9 + f.rank * 0.15), dt, ghost);
      if (bd < 0.55) {
        const arm = tgt.aegis > 0 ? tgt.hero.armor + 2 : tgt.hero.armor;
        const dmg = Math.max(2, def.dmg * f.rank - arm);
        tgt.hp -= dmg * dt * (f.kind === "drain" ? 8 : 3.2);
        lv.quiet = 0;
        if (!tgt.hurtBeep) { beep("hurt"); tgt.hurtBeep = 0.25; }
        if (tgt.reflect > 0) f.hp -= 14 * dt;
        if (f.kind === "thief" && tgt.vials > 0) { tgt.vials--; f.hp = 0; say("Thief stole a vial!"); }
        if (f.kind === "drain") {
          f._sip = (f._sip || 0) + dmg * dt * 8;
          if (f._sip > 200) { f.hp = 0; say("The Drain leaves, sated."); }
        }
        if (def.melee && f.kind !== "wraith") f.hp -= tgt.hero.melee * dt * 2.2;
      }
      if (def.shoot && f.t > 1.1 && bd < 9) {
        f.t = 0;
        G.shots.push({ x: f.x, y: f.y, vx: Math.cos(ang) * 6, vy: Math.sin(ang) * 6, dmg: 8, foe: true, life: 1.4, hero: "imp" });
      }
      if (def.lob && f.t > 1.4) {
        f.t = 0;
        G.shots.push({ x: f.x, y: f.y, vx: Math.cos(ang) * 4, vy: Math.sin(ang) * 4, dmg: 10, foe: true, life: 1.6, lob: true, hero: "hurler" });
      }
    });
    lv.foes = lv.foes.filter((f) => f.hp > 0);

    G.shots.forEach((s) => {
      s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
      s.grace = Math.max(0, (s.grace || 0) - dt);
      const inWall = blocked(lv, s.x, s.y) && tileAt(lv, s.x, s.y) !== "door_open";
      if (!inWall) s.air = true;
      if (!s.lob && s.air && inWall) {
        if (!s.foe && s.owner && s.owner.reflect > 0 && !s.bounced) {
          s.vx *= -1; s.vy *= -1; s.bounced = true; s.x += s.vx * dt; s.y += s.vy * dt;
        } else {
          smashItem(s); s.life = 0; return;
        }
      }
      if (s.foe) {
        liveP.forEach((p) => {
          if (p.veil > 0) return;
          if (Math.hypot(p.x - s.x, p.y - s.y) < 0.38) {
            p.hp -= Math.max(3, s.dmg - p.hero.armor);
            s.life = 0;
          }
        });
      } else {
        lv.gens.forEach((g) => {
          if (s.life <= 0) return;
          if (Math.hypot(g.x + 0.5 - s.x, g.y + 0.5 - s.y) <= 0.62) { g.hp -= 1; s.life = 0; G.score += 5; lv.quiet = 0; beep("hit"); }
        });
        if (s.life > 0) {
          lv.foes.forEach((f) => {
            if (s.life <= 0) return;
            if (Math.hypot(f.x - s.x, f.y - s.y) < 0.48) { hitFoe(f, s.dmg, false); s.life = 0; beep("hit"); }
          });
        }
        if (s.life > 0) smashItem(s);
      }
    });
    G.shots = G.shots.filter((s) => s.life > 0);
    G.fx = G.fx.filter((f) => { f.life -= dt; return f.life > 0; });
    pollJoin();
    paintHud();
    keyEdge = {};
  }

  function pollJoin() {
    if (!G || G.over) return;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let start = false;
    for (let i = 0; i < pads.length; i++) {
      const pad = pads[i];
      if (!pad || !pad.buttons[9] || !pad.buttons[9].pressed) continue;
      start = true;
      if (G._startLatch) return;
      G._startLatch = true;
      const owned = G.players.some((p) => p.pad === i);
      if (!owned && G.players.length < 4) {
        credit();
        const p = G.players[G.players.length - 1];
        if (p) p.pad = i;
      } else credit();
      return;
    }
    if (!start) G._startLatch = false;
  }

  function unstack(p) {
    G.players.forEach((o) => {
      if (o === p || o.dead) return;
      const dx = p.x - o.x, dy = p.y - o.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.001) { p.x += 0.22; return; }
      if (d < 0.38) {
        p.x += (dx / d) * 0.04;
        p.y += (dy / d) * 0.04;
        if (blocked(G.level, p.x, p.y)) { p.x -= (dx / d) * 0.04; p.y -= (dy / d) * 0.04; }
      }
    });
  }

  function smashItem(s) {
    G.level.items = G.level.items.filter((it) => {
      if (Math.hypot(it.x + 0.5 - s.x, it.y + 0.5 - s.y) > 0.4) return true;
      if (it.kind === "flask") { say("Shot the flask."); return false; }
      if (it.kind === "vial") {
        G.level.foes.forEach((f) => { if (Math.hypot(f.x - it.x, f.y - it.y) < 6) f.hp -= 12; });
        say("Floor vial bursts.");
        return false;
      }
      return true;
    });
  }

  function nextFloor() {
    G.score += 80 + G.players.filter((p) => !p.dead).reduce((n, p) => n + Math.min(40, (p.hp / 20) | 0), 0);
    say("Floor " + (G.floor + 1) + " sealed.");
    loadFloor(G.floor + 1);
  }

  function credit() {
    if (!G || G.over) return;
    const down = G.players.find((p) => p.dead);
    if (!down) {
      if (G.players.length < 4) {
        const used = G.players.map((p) => p.hero.id);
        const next = HEROES.find((h) => !used.includes(h.id)) || HEROES[G.players.length % 4];
        const p = joinHero(next.id);
        if (!p) return;
        const st = G.level.start;
        p.x = st.x + 0.5; p.y = st.y + 0.5;
        G.credits++;
        say(p.hero.name + " joins the lattice.");
      }
      return;
    }
    down.dead = false; down.hp = 700; G.credits++;
    say(down.hero.name + " rises.");
  }

  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== (w * dpr | 0) || canvas.height !== (h * dpr | 0)) {
      canvas.width = w * dpr | 0; canvas.height = h * dpr | 0;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, w, h);
    if (!G || !G.level) return;
    const lv = G.level;
    const live = G.players.filter((p) => !p.dead);
    let fx = 0, fy = 0, fn = 0;
    live.forEach((p) => { fx += p.x; fy += p.y; fn++; });
    const focus = fn ? { x: fx / fn, y: fy / fn } : (G.players[0] || { x: 2, y: 2 });
    cam.x += (focus.x * TILE - w / 2 - cam.x) * 0.14;
    cam.y += (focus.y * TILE - h / 2 - cam.y) * 0.14;
    const fl = lv.realm.floor || "floor";
    const wl = lv.realm.wall || "wall";
    for (let y = 0; y < lv.H; y++) for (let x = 0; x < lv.W; x++) {
      const px = x * TILE - cam.x, py = y * TILE - cam.y;
      if (px < -TILE || py < -TILE || px > w || py > h) continue;
      const t = lv.tiles[y][x];
      if (t === "wall") drawSpr(wl, px, py);
      else {
        drawSpr(fl, px, py);
        if (t === "door") drawSpr("door", px, py);
        if (t === "door_open") drawSpr("door_open", px, py);
        if (t === "exit") drawSpr("exit", px, py);
        if (t === "pad") drawSpr("pad", px, py);
      }
    }
    lv.gens.forEach((g) => {
      drawSpr("gen_" + g.kind + "_" + g.rank, g.x * TILE - cam.x, g.y * TILE - cam.y);
    });
    lv.items.forEach((it) => {
      if (it.hidden) {
        const near = live.some((p) => Math.hypot(p.x - (it.x + 0.5), p.y - (it.y + 0.5)) < 0.85);
        if (!near) return;
      }
      drawSpr(it.kind === "trap" ? "trap" : it.kind, it.x * TILE - cam.x, it.y * TILE - cam.y);
    });
    lv.foes.forEach((f) => {
      const hid = shadeHidden(f);
      const fr = hid ? 1 : ((f.t * 6) | 0) % 2;
      ctx.globalAlpha = f.hurt > 0 ? 0.55 : (hid ? 0.22 : (f.stun > 0 ? 0.7 : 1));
      drawSpr("foe_" + f.kind + "_" + fr, f.x * TILE - TILE / 2 - cam.x, f.y * TILE - TILE / 2 - cam.y);
      ctx.globalAlpha = 1;
    });
    G.shots.forEach((s) => {
      const sz = 16;
      drawSpr("shot_" + (s.hero === "imp" || s.hero === "hurler" ? "orin" : (s.hero || "kael")), s.x * TILE - sz / 2 - cam.x, s.y * TILE - sz / 2 - cam.y, sz);
    });
    G.fx.forEach((f) => {
      ctx.globalAlpha = Math.max(0, f.life * 2);
      ctx.strokeStyle = "#5eead4";
      ctx.beginPath();
      ctx.arc(f.x * TILE - cam.x, f.y * TILE - cam.y, (1 - f.life) * 80, 0, 6.28);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
    G.players.forEach((p) => {
      if (p.dead) return;
      const fr = (p.walk | 0) % 2;
      ctx.globalAlpha = p.veil > 0 ? 0.45 : 1;
      if (p.reflect > 0) {
        ctx.strokeStyle = "#93c5fd";
        ctx.beginPath();
        ctx.arc(p.x * TILE - cam.x, p.y * TILE - cam.y, 16, 0, 6.28);
        ctx.stroke();
      }
      drawSpr("hero_" + p.hero.id + "_" + p.facing + "_" + fr, p.x * TILE - TILE / 2 - cam.x, p.y * TILE - TILE / 2 - cam.y);
      ctx.globalAlpha = 1;
    });
    $("announce").textContent = announce.life > 0 ? announce.t : "";
  }

  function buffs(p) {
    let s = "";
    if (p.shotBoost > 0) s += " · COD";
    if (p.swift > 0) s += " · SWT";
    if (p.aegis > 0) s += " · AEG";
    if (p.veil > 0) s += " · VEIL";
    if (p.reflect > 0) s += " · REF";
    return s;
  }

  function paintHud() {
    if (!G) return;
    $("hudMeta").innerHTML = "<span>Score <b>" + G.score + "</b></span><span>Floor <b>" + (G.floor + 1) + "</b></span><span>Credits <b>" + G.credits + "</b></span>";
    $("pips").innerHTML = G.players.map((p) =>
      "<div class='pip'><div class='nm' style='color:" + p.hero.color + "'>" + p.hero.name + (p.dead ? " · DOWN" : "") + "</div>" +
      "<div class='bar'><i style='width:" + Math.max(0, Math.min(100, p.hp / 10)) + "%;background:" + p.hero.color + "'></i></div>" +
      "<div class='st'>HP " + Math.max(0, p.hp | 0) + " · keys " + p.keys + " · vials " + p.vials + buffs(p) + "</div></div>"
    ).join("");
    $("dockStatus").textContent = G.players.some((p) => p.dead) ? "Space / Start — credit in" : "Fire · vial · smash nexuses · find the exit";
    $("holeCard").innerHTML = "<p><b>" + G.level.realm.name + "</b> floor " + (G.floor + 1) + "</p><p class='lore'>Seed " + G.seed + " · " + (G.level.layout || "rooms") + (G.level.treasure > 0 ? " · rush " + G.level.treasure.toFixed(0) + "s" : "") + "</p>";
  }
  function paintUI() { if (G) paintHud(); }

  function showSheet(html, studio) {
    const o = $("overlay");
    o.className = "overlay" + (studio ? " studio" : "");
    o.innerHTML = studio ? html : "<div class='sheet'>" + html + "</div>";
    overlayMode = studio ? "menu" : "sheet";
  }
  function hideOverlay() { $("overlay").className = "overlay hidden"; overlayMode = null; }

  function menu() {
    overlayMode = "menu";
    if (G) G.over = true;
    $("app").classList.add("hidden");
    showSheet(
      "<div class='title-screen'><div class='title-art'><img src='./assets/menu.jpg' alt='Lattice Crypt'><div class='title-art-fade'></div></div>" +
      "<div class='title-panel'><p class='kicker'>Δ9Φ963 · chatagent.ca</p><h1>LATTICE CRYPT</h1>" +
      "<p class='lore'>Four wardens. Endless floors. Smash the nexuses. Don't shoot the flask.</p>" +
      "<label>Callsign</label><input class='name' id='nm' maxlength='18' value='" + String(persist.name).replace(/[<>]/g, "") + "'>" +
      "<p class='kicker' style='margin-top:.7rem'>Choose warden</p><div class='cast-grid'>" +
      HEROES.map((x) => "<button type='button' class='cast" + (x.id === persist.hero ? " on" : "") + "' data-h='" + x.id + "'>" +
        "<img src='" + ASSET + x.file + "' alt='" + x.name + "'><b>" + x.name + "</b><span>" + x.tag + "</span></button>").join("") +
      "</div><div class='mode-grid'>" +
      "<button type='button' class='mode-card' data-go='solo'><b>Descend</b><span>One credit. Survive the lattice.</span></button>" +
      "<button type='button' class='mode-card' data-go='coop'><b>Cabinet co-op</b><span>Drop in a second warden. Pads and keyboards, up to four.</span></button>" +
      "</div><div class='modes' style='margin-top:.6rem'><button class='btn' id='menuRadio'>Play radio</button>" +
      "<a class='btn ghost' href='/games/'>All games</a></div>" +
      "<div class='donate-row'><a class='donate-paypal' href='https://www.paypal.com/paypalme/ExcavationPro' target='_blank' rel='noopener'>PayPal.me/ExcavationPro</a>" +
      "<a class='donate-patreon' href='https://www.patreon.com/Excavationpro' target='_blank' rel='noopener'>Patreon</a></div>" +
      "<p class='lore' style='margin-top:.6rem'>Best " + persist.best + " · Runs " + persist.runs + " · <a href='./whitepaper.html'>Whitepaper</a></p></div></div>",
      true
    );
    $("overlay").onclick = function (e) {
      const c = e.target.closest("[data-h]");
      if (c) {
        persist.hero = c.getAttribute("data-h"); savePersist();
        document.querySelectorAll(".cast").forEach((el) => el.classList.toggle("on", el.getAttribute("data-h") === persist.hero));
        return;
      }
      const b = e.target.closest("[data-go]");
      if (!b) return;
      persist.name = ($("nm").value || "Warden").slice(0, 18); savePersist();
      newRun({ hero: persist.hero, coop: b.getAttribute("data-go") === "coop" });
    };
    const mr = $("menuRadio");
    if (mr) mr.onclick = (e) => { e.stopPropagation(); const p = $("radioPlay"); if (p) p.click(); };
  }

  function help() {
    showSheet("<h2>How to play</h2><ol class='lore'>" +
      "<li>Health ticks down. Smash <b>nexuses</b> or the floor fills. Find the cyan exit.</li>" +
      "<li>P1 WASD · <b>J fire</b> · K/Shift vial. P2 arrows · ; fire · ' vial. P3 TFGH · R/Y. P4 numpad.</li>" +
      "<li>Pads: stick, A/RT fire, B/Y/LT vial, Start join. Space / Enter credit a fallen warden.</li>" +
      "<li>Keys open doors. Don't shoot flasks. Vials clear a room — only they stop the Drain.</li>" +
      "<li>Codex / Swift / Aegis / Veil / Reflect / Pulse / Warp. Gates teleport. Help pauses.</li></ol>" +
      "<button class='btn gold' id='hk'>Close</button>");
    $("hk").onclick = () => { hideOverlay(); overlayMode = null; };
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (overlayMode !== "menu" && overlayMode !== "sheet") update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  window.addEventListener("keydown", (e) => {
    if (!keys[e.code]) keyEdge[e.code] = true;
    keys[e.code] = true;
    if (e.code === "Escape") { menu(); return; }
    if (overlayMode === "menu" || overlayMode === "sheet") return;
    if (PLAY_CODES.has(e.code)) e.preventDefault();
    if ((e.code === "Space" || e.code === "Enter") && G) {
      if (e.code === "Space" && !G.players.some((p) => p.dead)) return;
      credit();
    }
  });
  window.addEventListener("keyup", (e) => { keys[e.code] = false; });
  window.addEventListener("blur", () => { keys = {}; keyEdge = {}; });

  $("btnHelp").onclick = help;
  $("btnMenu").onclick = menu;
  $("btnCredit").onclick = () => { if (G) credit(); };

  window.LatticeCrypt = {
    get: () => G,
    credit,
    fire: (i) => { if (G && G.players[i || 0]) fireShot(G.players[i || 0]); },
    nextFloor: () => { if (G) nextFloor(); }
  };

  async function boot() {
    loadPersist();
    try {
      const [img, meta] = await Promise.all([
        new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = ASSET + "sprites.png?v=4"; }),
        fetch(ASSET + "sprites.json").then((r) => r.json())
      ]);
      atlas = img; names = meta.names; cell = meta.cell; cols = meta.cols;
    } catch (_) {}
    $("boot").classList.add("hidden");
    if (window.ArcadeLedger) ArcadeLedger.boot();
    menu();
    requestAnimationFrame(loop);
  }
  boot();
})();
