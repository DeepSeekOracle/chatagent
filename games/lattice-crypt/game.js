/* Lattice Crypt — four-warden co-op dungeon. Original pixel crawl. */
(() => {
  const TILE = 32;
  const SAVE = "lygo_lattice_crypt_v1";
  const ASSET = "./assets/";
  const HEROES = [
    { id: "kael", name: "Kael", tag: "Gallant Blade", shot: 3, speed: 3.1, magic: 2, armor: 4, melee: 5, brave: 78, faith: 42, color: "#ef4444", file: "p-kael.jpg", unlock: 0, wep: "shard",
      special: "Rend", spec: "Vial also rips nexuses in reach.",
      bio: "First tooth of the lock. A squire of the Accord who would not drop the door when the first circle went dark." },
    { id: "vale", name: "Vale", tag: "Aegis Knight", shot: 3, speed: 3.6, magic: 3, armor: 5, melee: 4, brave: 70, faith: 55, color: "#22d3ee", file: "p-vale.jpg", unlock: 0, wep: "shard",
      special: "Cover", spec: "Vial grants nearby wardens a short Aegis.",
      bio: "Plate of the second circle. She learned to stand still so others could move. The crypt hits her first, by design." },
    { id: "orin", name: "Orin", tag: "Black Sigil", shot: 5, speed: 3.0, magic: 5, armor: 1, melee: 1, brave: 38, faith: 88, color: "#fbbf24", file: "p-orin.jpg", unlock: 0, wep: "shard",
      special: "Unwrite", spec: "Vials hit harder. Resonance is the weapon.",
      bio: "A chemist of names. His vials remember what the Drain would unwrite. Glass is cheaper than a forgotten friend." },
    { id: "nia", name: "Nia", tag: "Path Archer", shot: 4, speed: 4.4, magic: 3, armor: 2, melee: 2, brave: 62, faith: 50, color: "#4ade80", file: "p-nia.jpg", unlock: 0, wep: "shard",
      special: "Dash", spec: "Vial grants a burst of Swift.",
      bio: "She maps the corridors by running them. Speed is how the lattice stays honest — a slow warden is a closed door." },
    { id: "lyra", name: "Lyra", tag: "Spiral Bard", shot: 3, speed: 3.4, magic: 4, armor: 2, melee: 2, brave: 55, faith: 82, color: "#67e8f9", file: "p-lyra.jpg", unlock: 1, wep: "fan", hymn: true,
      special: "Hymn", spec: "Shots briefly stun nearby foes. Memory as lockpoint.",
      bio: "Seat of spiral memory. The crypt cannot erase a song it has heard. She keeps the names the Void would spend." },
    { id: "arkos", name: "Arkos", tag: "Lattice Lancer", shot: 4, speed: 3.2, magic: 2, armor: 3, melee: 4, brave: 74, faith: 48, color: "#2dd4bf", file: "p-arkos.jpg", unlock: 2, wep: "comet",
      special: "Geodesic", spec: "Starts with Comet — lobs the shortest true line.",
      bio: "Explorer of ethical cosmos. The spear is a geodesic: the shortest true line through a lie." },
    { id: "d9ra", name: "D9ra", tag: "Wolf Monk", shot: 2, speed: 3.8, magic: 2, armor: 3, melee: 7, brave: 90, faith: 30, color: "#f87171", file: "p-d9ra.jpg", unlock: 3, wep: "cinder",
      special: "Shockwave", spec: "Vial also slams foes in arm's reach.",
      bio: "Wolf-edge of the council. Fists first. The crypt respects what will not flinch, and nothing else." },
    { id: "srath", name: "Srath", tag: "Shadow Needle", shot: 4, speed: 4.2, magic: 2, armor: 1, melee: 3, brave: 58, faith: 44, color: "#86efac", file: "p-srath.jpg", unlock: 4, wep: "needle",
      special: "Doublespeak", spec: "Vial grants Veil. She is already gone.",
      bio: "Sentinel of doublespeak. She steals the vial back before the thief knows it left." },
    { id: "kairos", name: "Kairos", tag: "Hour Mage", shot: 4, speed: 3.3, magic: 5, armor: 1, melee: 1, brave: 40, faith: 86, color: "#c4b5fd", file: "p-kairos.jpg", unlock: 5, wep: "shard", time: true,
      special: "Right-time", spec: "Vial also warps you to another tile.",
      bio: "Keeper of right-time. A vial in his hand is also a door. He spends seconds like keys." },
    { id: "justicae", name: "Justicae", tag: "Accord Knight", shot: 3, speed: 3.0, magic: 3, armor: 6, melee: 4, brave: 72, faith: 70, color: "#e2e8f0", file: "p-justicae.jpg", unlock: 6, wep: "fan",
      special: "Fair Plate", spec: "Starts with Iron. Vial grants Reflect.",
      bio: "Fairness as plate. She will not open a seal that would crush the unnamed to save the named." },
    { id: "seidon", name: "Seidon", tag: "Tide Seer", shot: 4, speed: 3.5, magic: 4, armor: 2, melee: 2, brave: 50, faith: 76, color: "#22d3ee", file: "p-seidon.jpg", unlock: 7, wep: "halo",
      special: "Current", spec: "Gates recycle faster. Starts with Halo.",
      bio: "Depth and current. Gates listen to him because the lattice learned to drink, and he never argued with water." },
    { id: "sancora", name: "Sancora", tag: "Weave Chemist", shot: 3, speed: 3.2, magic: 5, armor: 3, melee: 1, brave: 46, faith: 92, color: "#fde68a", file: "p-sancora.jpg", unlock: 8, wep: "shard", heal: true,
      special: "Chorus Flask", spec: "Vial heals the whole party.",
      bio: "Collective healing nexus. Her flask is a chorus: one drink, four pulses. The weave does not heal alone." },
    { id: "lightfather", name: "Lightfather", tag: "Architect", shot: 4, speed: 3.4, magic: 5, armor: 4, melee: 4, brave: 80, faith: 96, color: "#fbbf24", file: "p-lightfather.jpg", unlock: 0, wep: "halo", accord: true,
      special: "Δ9 Seal", spec: "Vial stuns the room, Aegis on allies, a small heal. Provenance as a weapon.",
      bio: "Architect of the lock and of LYGO. He does not replace the four teeth — he remembers why the door was cut. Truth first. No auto-publish of a soul." }
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
    drain: { hp: 99, dmg: 4, speed: 1.35, melee: true, drain: true, ghost: true, pts: 250 },
    gate: { hp: 28, dmg: 16, speed: 0.85, melee: true, pts: 400, boss: true },
    crown: { hp: 30, dmg: 15, speed: 0.9, melee: true, lob: true, pts: 450, boss: true },
    smith: { hp: 32, dmg: 18, speed: 0.8, melee: true, shoot: true, pts: 500, boss: true },
    heartboss: { hp: 34, dmg: 14, speed: 0.95, melee: true, pts: 520, boss: true },
    levi: { hp: 36, dmg: 16, speed: 1.05, melee: true, ghost: true, pts: 560, boss: true },
    tithe: { hp: 30, dmg: 12, speed: 1.2, melee: true, steal: true, pts: 540, boss: true },
    unnamer: { hp: 40, dmg: 10, speed: 1.1, melee: true, drain: true, ghost: true, pts: 800, boss: true },
    lock: { hp: 48, dmg: 18, speed: 0.75, melee: true, shoot: true, pts: 1000, boss: true }
  };
  const KEYS_P = [
    { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD", fire: ["KeyJ"], mag: ["KeyK", "ShiftLeft"], cycle: ["KeyQ"] },
    { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", fire: ["Semicolon", "Numpad1"], mag: ["Quote", "Numpad2"], cycle: ["Period"] },
    { up: "KeyT", down: "KeyG", left: "KeyF", right: "KeyH", fire: ["KeyR"], mag: ["KeyY"], cycle: ["KeyU"] },
    { up: "Numpad8", down: "Numpad5", left: "Numpad4", right: "Numpad6", fire: ["Numpad0"], mag: ["NumpadEnter"], cycle: ["Numpad7"] }
  ];
  const PLAY_CODES = new Set([
    "KeyW", "KeyA", "KeyS", "KeyD", "KeyJ", "KeyK", "ShiftLeft", "Space",
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Semicolon", "Quote",
    "KeyT", "KeyG", "KeyF", "KeyH", "KeyR", "KeyY",
    "Numpad8", "Numpad5", "Numpad4", "Numpad6", "Numpad0", "Numpad1", "Numpad2", "NumpadEnter", "Enter", "KeyL",
    "KeyQ", "Period", "KeyU", "Numpad7"
  ]);
  const PICK = {
    food: { heal: 100, score: 100, say: "rations.", glow: "rgba(196,70,50,0.5)" },
    flask: { heal: 200, score: 100, say: "flask.", glow: "rgba(56,189,248,0.5)", smash: "flask" },
    poison: { special: "poison", glow: "rgba(74,222,128,0.45)", smash: "poison" },
    key: { keys: 1, score: 50, glow: "rgba(250,204,21,0.5)", spin: 1 },
    latch: { keys: 1, score: 70, say: "latch-key.", glow: "rgba(186,230,253,0.5)", spin: 1 },
    chest: { special: "chest", score: 200, glow: "rgba(251,191,36,0.55)", rare: 1 },
    vial: { vials: 1, score: 50, say: "Vial.", glow: "rgba(192,132,252,0.5)", smash: "vial" },
    phial: { vials: 2, score: 90, say: "Phial — two vials.", glow: "rgba(45,212,191,0.5)" },
    chalice: { vials: 3, score: 110, say: "Chalice — three vials.", glow: "rgba(168,85,247,0.55)", rare: 1 },
    trap: { special: "trap", glow: "rgba(127,29,29,0.4)" },
    codex: { shotBoost: 14, score: 80, say: "Shot Codex.", glow: "rgba(250,204,21,0.5)" },
    tome: { shotBoost: 20, vialPow: 1, score: 100, say: "Accord tome.", glow: "rgba(192,132,252,0.55)", rare: 1 },
    swift: { swift: 12, score: 80, say: "Swift.", glow: "rgba(74,222,128,0.5)" },
    boot: { stride: 1, swift: 8, score: 90, say: "Stride boots.", glow: "rgba(74,222,128,0.5)" },
    aegis: { aegis: 14, score: 80, say: "Aegis.", glow: "rgba(34,211,238,0.5)" },
    ward: { aegis: 22, score: 90, say: "Ward.", glow: "rgba(34,211,238,0.55)" },
    grit: { aegis: 10, iron: 1, score: 80, say: "Grit — plate holds.", glow: "rgba(148,163,184,0.45)" },
    veil: { veil: 8, score: 80, say: "Veil.", glow: "rgba(226,232,240,0.45)" },
    moon: { veil: 12, swift: 8, score: 100, say: "Moon veil.", glow: "rgba(191,219,254,0.5)", rare: 1 },
    reflect: { reflect: 10, score: 80, say: "Reflect.", glow: "rgba(147,197,253,0.5)" },
    ring: { reflect: 10, aegis: 10, score: 110, say: "Accord ring.", glow: "rgba(250,204,21,0.55)", spin: 1, rare: 1 },
    pulse: { special: "pulse", score: 80, glow: "rgba(250,204,21,0.5)" },
    frostorb: { special: "frostorb", score: 90, glow: "rgba(125,211,252,0.55)", rare: 1 },
    hymnstone: { special: "hymn", score: 90, glow: "rgba(103,232,249,0.55)" },
    sun: { special: "sun", score: 100, glow: "rgba(251,191,36,0.55)", rare: 1 },
    storm: { special: "storm", score: 100, glow: "rgba(147,197,253,0.55)", rare: 1 },
    bomb: { special: "bomb", score: 80, glow: "rgba(239,68,68,0.5)", smash: "bomb" },
    warp: { special: "warp", score: 40, glow: "rgba(147,51,234,0.5)" },
    scroll: { special: "scroll", score: 70, glow: "rgba(253,230,138,0.5)" },
    lantern: { special: "lantern", score: 80, glow: "rgba(251,191,36,0.55)" },
    dice: { special: "dice", score: 40, glow: "rgba(248,250,252,0.45)", spin: 1 },
    core: { cores: 1, score: 120, say: "Core.", glow: "rgba(255,80,60,0.55)", rare: 1 },
    crystal: { cores: 1, score: 100, say: "Crystal core.", glow: "rgba(34,211,238,0.55)", spin: 1 },
    spark: { cores: 1, score: 80, say: "Spark.", glow: "rgba(253,224,71,0.5)", spin: 1 },
    heart: { max: 80, score: 100, say: "Heart — deeper well.", glow: "rgba(239,68,68,0.55)", rare: 1 },
    soul: { max: 50, heal: 50, score: 90, say: "Soul-well.", glow: "rgba(191,219,254,0.5)", rare: 1 },
    iron: { iron: 1, score: 100, say: "Iron.", glow: "rgba(148,163,184,0.45)" },
    anvil: { iron: 1, score: 110, say: "Anvil-iron.", glow: "rgba(148,163,184,0.5)" },
    lens: { pierce: 1, score: 90, say: "Lens — bolts pass deeper.", glow: "rgba(186,230,253,0.5)" },
    quiver: { extraCap: 1, score: 90, say: "Quiver — one more live bolt.", glow: "rgba(251,146,60,0.5)" },
    magnet: { magnet: 0.5, score: 80, say: "Pull.", glow: "rgba(248,113,113,0.5)" },
    thorns: { thorns: 14, score: 80, say: "Thorns — bumpers bleed.", glow: "rgba(74,222,128,0.5)" },
    fury: { fury: 12, score: 90, say: "Fury — shots bite.", glow: "rgba(239,68,68,0.55)" },
    echo: { echo: 14, score: 90, say: "Echo — bolts linger.", glow: "rgba(147,197,253,0.5)" },
    moss: { regen: 14, score: 70, say: "Moss — the well seeps back.", glow: "rgba(74,222,128,0.5)" },
    weave: { regen: 22, score: 90, say: "Weave — slow mend.", glow: "rgba(253,224,71,0.5)", rare: 1 },
    berry: { heal: 40, score: 40, say: "lattice berry.", glow: "rgba(190,40,70,0.45)" },
    bread: { heal: 150, score: 80, say: "bread.", glow: "rgba(217,160,70,0.45)" },
    feast: { heal: 280, max: 20, score: 120, say: "a feast of the Accord.", glow: "rgba(251,191,36,0.55)", rare: 1 },
    nectar: { heal: 80, vials: 1, score: 90, say: "nectar of the weave.", glow: "rgba(250,204,21,0.5)" },
    elixir: { heal: 9999, score: 140, say: "elixir — well restored.", glow: "rgba(45,212,191,0.55)", rare: 1 },
    scrap: { heal: 50, score: 30, say: "scrap rations.", glow: "rgba(148,163,184,0.35)" },
    seed: { heal: 40, stride: 1, score: 60, say: "seed-stride.", glow: "rgba(74,222,128,0.45)" },
    coin: { score: 50, say: "coin.", glow: "rgba(250,204,21,0.5)", spin: 2 },
    gem: { score: 180, say: "gem.", glow: "rgba(56,189,248,0.55)", spin: 2, rare: 1 },
    crown: { cores: 1, score: 200, say: "Crown of the lock.", glow: "rgba(251,191,36,0.6)", rare: 1 },
    fan: { glow: "rgba(249,115,22,0.5)", spin: 1 },
    needle: { glow: "rgba(34,211,238,0.5)" },
    cinder: { glow: "rgba(249,115,22,0.5)" },
    comet: { glow: "rgba(96,165,250,0.5)" },
    halo: { glow: "rgba(253,224,71,0.5)", spin: 1 },
    cleave: { glow: "rgba(248,113,113,0.5)" },
    orbit: { glow: "rgba(226,232,240,0.45)", spin: 2 },
    aura: { glow: "rgba(74,222,128,0.5)" }
  };
  const BAG = [
    "food", "food", "food", "berry", "berry", "bread", "scrap", "flask", "flask", "nectar",
    "chest", "chest", "key", "key", "latch", "vial", "vial", "poison", "poison",
    "codex", "swift", "aegis", "veil", "pulse", "warp", "reflect", "ward", "grit",
    "coin", "coin", "coin", "gem", "boot", "lens", "magnet", "fury", "thorns", "moss", "echo",
    "core", "heart", "iron", "phial", "crystal", "spark", "seed", "scroll", "lantern", "dice",
    "bomb", "frostorb", "hymnstone", "quiver",
    "fan", "needle", "cinder", "comet", "halo", "cleave", "orbit", "aura",
    "feast", "elixir", "chalice", "tome", "ring", "moon", "sun", "storm", "crown", "soul", "anvil", "weave"
  ];
  const CHEST_DROP = ["fan", "needle", "cinder", "core", "heart", "cleave", "orbit", "aura", "comet", "halo", "elixir", "crown", "chalice", "tome", "ring", "crystal", "phial", "iron"];
  const WEAPONS = {
    shard: { name: "Shard", cap: 2, spd: 12, life: 1.2, cool: 0.2, dmg: 0 },
    fan: { name: "Fan", cap: 3, spd: 11, life: 0.55, cool: 0.2, dmg: -1, spread: 0.38 },
    needle: { name: "Needle", cap: 2, spd: 16, life: 1.3, cool: 0.16, dmg: 1, pierce: 2 },
    cinder: { name: "Cinder", cap: 2, spd: 9, life: 0.55, cool: 0.16, dmg: 1, flame: 1.8 },
    comet: { name: "Comet", cap: 1, spd: 7.6, life: 1.5, cool: 0.32, dmg: 3, lob: true },
    halo: { name: "Halo", cap: 2, spd: 12, life: 1.15, cool: 0.22, dmg: 0, halo: true },
    cleave: { name: "Cleave", melee: true, cool: 0.42, dmg: 2, range: 1.5 },
    orbit: { name: "Orbit", melee: true, cool: 0, dmg: 2 },
    aura: { name: "Aura", melee: true, cool: 0, dmg: 3 }
  };
  const SEAL_GIFT = ["fan", "comet", "cinder", "needle", "halo", "core", "phial", "iron"];
  const KINDS = ["wraith", "brute", "imp", "hurler", "shade"];

  const $ = (id) => document.getElementById(id);
  const canvas = $("crypt");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  let atlas = null, names = {}, cell = 32, cols = 16;
  let foeAtlas = null, foeNames = {}, foeCell = 64, foeCols = 8;
  let heroAtlas = null, heroNames = {}, heroCell = 64, heroCols = 8;
  let tileAtlas = null, tileNames = {}, tileCell = 32, tileCols = 16;
  let fxAtlas = null, fxNames = {}, fxCell = 32, fxCols = 8;
  let itemAtlas = null, itemNames = {}, itemCell = 32, itemCols = 8;
  const WEP_LOOK = {
    shard: { size: 28, col: "#fbbf24", glow: "rgba(251,191,36,0.38)" },
    fan: { size: 26, col: "#fb923c", glow: "rgba(249,115,22,0.38)" },
    needle: { size: 32, col: "#22d3ee", glow: "rgba(34,211,238,0.4)" },
    cinder: { size: 28, col: "#f97316", glow: "rgba(239,68,68,0.4)" },
    comet: { size: 30, col: "#60a5fa", glow: "rgba(96,165,250,0.4)" },
    halo: { size: 30, col: "#fde68a", glow: "rgba(253,224,71,0.42)" },
    imp: { size: 22, col: "#f87171", glow: "rgba(239,68,68,0.4)" },
    hurler: { size: 24, col: "#94a3b8", glow: "rgba(148,163,184,0.35)" },
    cleave: { size: 26, col: "#f87171", glow: "rgba(248,113,113,0.4)" },
    orbit: { size: 22, col: "#e2e8f0", glow: "rgba(226,232,240,0.35)" },
    aura: { size: 24, col: "#4ade80", glow: "rgba(74,222,128,0.35)" }
  };
  const BOSS_LOOT = {
    gate: ["core", "heart", "ward"],
    crown: ["comet", "swift", "frostorb"],
    smith: ["cinder", "iron", "fury"],
    heartboss: ["heart", "phial", "moss"],
    levi: ["halo", "aegis", "echo"],
    tithe: ["chest", "core", "gem"],
    unnamer: ["vial", "phial", "soul"],
    lock: ["iron", "codex", "crown"]
  };
  let keys = {};
  let keyEdge = {};
  let G = null;
  let overlayMode = "menu";
  let announce = { t: "", life: 0 };
  let persist = { name: "Warden", best: 0, runs: 0, hero: "kael", autoShot: false, campaignBest: 0, unlocked: ["kael", "vale", "orin", "nia"] };
  let cam = { x: 0, y: 0 };
  let actx = null;

  function loadPersist() {
    try { Object.assign(persist, JSON.parse(localStorage.getItem(SAVE) || "{}")); } catch (_) {}
    if (!Array.isArray(persist.unlocked) || persist.unlocked.length < 4) persist.unlocked = ["kael", "vale", "orin", "nia"];
    HEROES.forEach((h) => {
      if (h.unlock === 0 && persist.unlocked.indexOf(h.id) < 0) persist.unlocked.push(h.id);
    });
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
    let s = spr(name);
    if (!s && name.indexOf("hero_") === 0) s = spr(name.replace(/hero_[^_]+/, "hero_kael"));
    if (!s || !atlas) return;
    w = w || TILE;
    ctx.drawImage(atlas, s.sx, s.sy, cell, cell, Math.round(x), Math.round(y), w, w);
  }
  function drawTile(name, x, y) {
    const i = tileNames[name];
    const dw = TILE + 1;
    if (i == null || !tileAtlas) {
      drawSpr(name, x, y, dw);
      return;
    }
    const sx = (i % tileCols) * tileCell, sy = Math.floor(i / tileCols) * tileCell;
    ctx.drawImage(tileAtlas, sx, sy, tileCell, tileCell, Math.round(x), Math.round(y), dw, dw);
  }
  function floorName(z, x, y) {
    return z + "_f" + ((x & 3) + ((y & 3) << 2));
  }
  function drawFxSpr(name, x, y, w) {
    const i = fxNames[name];
    w = w || 32;
    if (i == null || !fxAtlas) {
      drawSpr(name, x, y, w);
      return;
    }
    const sx = (i % fxCols) * fxCell, sy = Math.floor(i / fxCols) * fxCell;
    ctx.drawImage(fxAtlas, sx, sy, fxCell, fxCell, Math.round(x), Math.round(y), w, w);
  }
  function drawItemSpr(name, x, y, w) {
    const i = itemNames[name];
    w = w || 32;
    if (i == null || !itemAtlas) {
      const base = name.replace(/_[01]$/, "");
      drawSpr(base, x, y, w);
      return;
    }
    const sx = (i % itemCols) * itemCell, sy = Math.floor(i / itemCols) * itemCell;
    ctx.drawImage(itemAtlas, sx, sy, itemCell, itemCell, Math.round(x), Math.round(y), w, w);
  }
  function drawItem(it) {
    const spec = PICK[it.kind] || {};
    const t = (G ? G.t : 0) + it.x * 0.73 + it.y * 0.41;
    const bob = Math.sin(t * 3.6) * 3.6;
    const fr = ((t * 5.4) | 0) % 2;
    const cx = it.x * TILE + TILE / 2 - cam.x;
    const cy = it.y * TILE + TILE / 2 - cam.y;
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 11, 9, 3.2, 0, 0, 6.28);
    ctx.fill();
    ctx.globalAlpha = 0.2 + 0.18 * (0.5 + 0.5 * Math.sin(t * 5.1));
    ctx.fillStyle = spec.glow || "rgba(251,191,36,0.4)";
    ctx.beginPath();
    ctx.arc(cx, cy + bob, spec.rare ? 16 : 13, 0, 6.28);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (spec.rare || spec.spin) {
      for (let n = 0; n < 3; n++) {
        const a = t * 2.4 + n * 2.09;
        ctx.fillStyle = "rgba(255,255,230,0.75)";
        ctx.fillRect(Math.round(cx + Math.cos(a) * 13), Math.round(cy + bob + Math.sin(a) * 10), 2, 2);
      }
    }
    ctx.save();
    ctx.translate(cx, cy + bob);
    if (spec.spin) ctx.rotate(t * (spec.spin === 2 ? 3.6 : 1.8));
    drawItemSpr(it.kind + "_" + fr, -16, -16, 32);
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
  }
  function wepKey(s) {
    if (s.foe) return s.hero === "hurler" ? "hurler" : "imp";
    return s.wep && WEP_LOOK[s.wep] ? s.wep : "shard";
  }
  function drawShot(s) {
    const wep = wepKey(s);
    const L = WEP_LOOK[wep] || WEP_LOOK.shard;
    const px = s.x * TILE - cam.x, py = s.y * TILE - cam.y;
    const u = 1 - s.life / Math.max(0.05, s.maxLife || 1.2);
    const lift = s.lob ? Math.sin(u * Math.PI) * 22 : 0;
    if (s.lob) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(px, py + 5, 8, 3.2, 0, 0, 6.28);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    const tr = s.trail || [];
    tr.forEach((t, i) => {
      const a = (i + 1) / tr.length;
      ctx.globalAlpha = a * 0.55;
      const tx = t.x * TILE - cam.x, ty = t.y * TILE - cam.y;
      if (wep === "needle" && i) {
        const p = tr[i - 1];
        ctx.strokeStyle = L.col;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(p.x * TILE - cam.x, p.y * TILE - cam.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      } else {
        ctx.fillStyle = L.col;
        const r = wep === "cinder" ? 3.4 + a * 2 : (wep === "comet" ? 3 : 2.1);
        ctx.beginPath();
        ctx.arc(tx, ty, r, 0, 6.28);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = L.glow;
    ctx.beginPath();
    ctx.arc(px, py - lift, L.size * 0.42, 0, 6.28);
    ctx.fill();
    const fr = ((G.t * 14) | 0) % 4;
    const sz = L.size;
    const ang = Math.atan2(s.vy, s.vx);
    ctx.save();
    ctx.translate(px, py - lift);
    if (wep === "halo") ctx.rotate(G.t * 7);
    else if (wep === "cinder") ctx.rotate(G.t * 5);
    else if (wep !== "imp") ctx.rotate(ang);
    drawFxSpr("bolt_" + wep + "_" + fr, -sz / 2, -sz / 2, sz);
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
  }
  function drawVfx(f) {
    const px = f.x * TILE - cam.x, py = f.y * TILE - cam.y;
    const max = f.max || f.life;
    const u = 1 - f.life / Math.max(0.05, max);
    if (f.kind === "pick") {
      ctx.globalAlpha = Math.max(0, 1 - u);
      ctx.strokeStyle = f.col || "#fde68a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 6 + u * 18, 0, 6.28);
      ctx.stroke();
      for (let n = 0; n < 5; n++) {
        const a = u * 6 + n * 1.26;
        ctx.fillStyle = "rgba(255,255,220,0.85)";
        ctx.fillRect(Math.round(px + Math.cos(a) * (8 + u * 14)), Math.round(py + Math.sin(a) * (8 + u * 14)), 2, 2);
      }
      ctx.globalAlpha = 1;
      return;
    }
    if (f.kind === "puff") {
      const pf = Math.min(3, 3 - ((f.life * 8) | 0));
      ctx.globalAlpha = Math.max(0, f.life * 3);
      drawSpr("puff_" + pf, px - 16, py - 16);
      ctx.globalAlpha = 1;
      return;
    }
    if (f.kind === "cinder") {
      ctx.globalAlpha = Math.min(1, f.life);
      drawFxSpr("bolt_cinder_" + (((G.t * 10) | 0) % 4), px - 16, py - 18, 28);
      ctx.fillStyle = "rgba(249,115,22,0.35)";
      ctx.beginPath();
      ctx.arc(px, py, 10 + (G.t * 8 % 4), 0, 6.28);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    if (f.kind === "muzzle") {
      const wep = f.wep && WEP_LOOK[f.wep] ? f.wep : "shard";
      ctx.globalAlpha = Math.max(0, f.life * 8);
      ctx.save();
      ctx.translate(px, py);
      if (f.ang) ctx.rotate(f.ang);
      drawFxSpr("mz_" + wep + "_" + (f.life > 0.06 ? 0 : 1), -18, -18, 36);
      ctx.restore();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 1;
      return;
    }
    if (f.kind === "hit") {
      const wep = f.wep && WEP_LOOK[f.wep] ? f.wep : "shard";
      const L = WEP_LOOK[wep];
      ctx.globalAlpha = Math.max(0, 1 - u);
      ctx.strokeStyle = L.col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 6 + u * 16, 0, 6.28);
      ctx.stroke();
      drawFxSpr("hit_" + wep + "_" + (u > 0.45 ? 1 : 0), px - 16, py - 16, 32);
      ctx.globalAlpha = 1;
      return;
    }
    if (f.kind === "nova") {
      const col = f.col || "#5eead4";
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.globalAlpha = (1 - u) * 0.85;
      ctx.lineWidth = 3;
      const r = 18 + u * 120;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, 6.28);
      ctx.stroke();
      ctx.globalAlpha = (1 - u) * 0.25;
      ctx.beginPath();
      ctx.arc(px, py, r * 0.72, 0, 6.28);
      ctx.fill();
      ctx.globalAlpha = (1 - u) * 0.7;
      ctx.lineWidth = 1.5;
      const spokes = f.job === "lightfather" || f.job === "orin" ? 8 : (f.job === "kael" ? 4 : 6);
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * 6.28 + u * 0.8;
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a) * 8, py + Math.sin(a) * 8);
        ctx.lineTo(px + Math.cos(a) * r, py + Math.sin(a) * r);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return;
    }
    if (f.kind === "shield") {
      ctx.strokeStyle = "#22d3ee";
      ctx.globalAlpha = (1 - u) * 0.8;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(px, py, 14 + u * 10, 0, 6.28);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }
    if (f.kind === "warp") {
      ctx.strokeStyle = "#c4b5fd";
      ctx.globalAlpha = (1 - u) * 0.85;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 6 + u * 22, u * 6.28, u * 6.28 + 4);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }
    if (f.kind === "slash") {
      const r = (f.r || 1.5) * TILE;
      ctx.strokeStyle = "rgba(248,113,113,0.9)";
      ctx.lineWidth = 5;
      ctx.globalAlpha = Math.max(0, f.life * 7);
      ctx.beginPath();
      ctx.arc(px, py, r, (f.ang || 0) - 0.85, (f.ang || 0) + 0.85);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }
    if (f.kind === "note") {
      ctx.fillStyle = "#67e8f9";
      ctx.globalAlpha = 1 - u;
      ctx.beginPath();
      ctx.arc(px + Math.sin(u * 8) * 8, py - u * 22, 3, 0, 6.28);
      ctx.fill();
      ctx.fillRect(px + 6, py - u * 18, 2, 8);
      ctx.globalAlpha = 1;
      return;
    }
    ctx.globalAlpha = Math.max(0, f.life * 2);
    ctx.strokeStyle = "#5eead4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, (1 - f.life) * 80, 0, 6.28);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  function solidAt(lv, x, y) {
    const t = tileAt(lv, x, y);
    return t === "wall" || t === "door" || t === "exit_lock";
  }
  function drawFoeSpr(name, x, y, w) {
    const i = foeNames[name];
    if (i == null || !foeAtlas) {
      drawSpr(name, x, y, w);
      return;
    }
    const sx = (i % foeCols) * foeCell, sy = Math.floor(i / foeCols) * foeCell;
    w = w || foeCell;
    ctx.drawImage(foeAtlas, sx, sy, foeCell, foeCell, Math.round(x), Math.round(y), w, w);
  }
  function drawHeroSpr(p, camx, camy) {
    const fr = (p.walk | 0) % 2;
    let face = p.facing;
    const flip = face === 1;
    if (face === 1) face = 2;
    let name = "hero_" + p.hero.id + "_" + face + "_" + fr;
    if (heroAtlas && heroNames[name] == null) name = "hero_" + p.hero.id + "_0_" + fr;
    const sz = 48;
    const dx = p.x * TILE - sz / 2 - camx, dy = p.y * TILE - sz / 2 - camy;
    if (heroAtlas && heroNames[name] != null) {
      const i = heroNames[name];
      const sx = (i % heroCols) * heroCell, sy = Math.floor(i / heroCols) * heroCell;
      if (flip) {
        ctx.save();
        ctx.translate(Math.round(dx + sz), Math.round(dy));
        ctx.scale(-1, 1);
        ctx.drawImage(heroAtlas, sx, sy, heroCell, heroCell, 0, 0, sz, sz);
        ctx.restore();
        ctx.imageSmoothingEnabled = false;
      } else {
        ctx.drawImage(heroAtlas, sx, sy, heroCell, heroCell, Math.round(dx), Math.round(dy), sz, sz);
      }
      return;
    }
    drawSpr("hero_" + p.hero.id + "_" + p.facing + "_" + fr, p.x * TILE - TILE / 2 - camx, p.y * TILE - TILE / 2 - camy);
  }
  function nearestWalk(lv, x, y) {
    const tx = Math.floor(x), ty = Math.floor(y);
    function ok(ix, iy) {
      if (!inB(lv, ix, iy)) return false;
      const t = lv.tiles[iy][ix];
      return t && t !== "wall" && t !== "door";
    }
    if (ok(tx, ty)) return { x: tx + 0.5, y: ty + 0.5 };
    for (let r = 1; r < 24; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (ok(tx + dx, ty + dy)) return { x: tx + dx + 0.5, y: ty + dy + 0.5 };
        }
      }
    }
    if (lv.start) return { x: lv.start.x + 0.5, y: lv.start.y + 0.5 };
    return { x: tx + 0.5, y: ty + 0.5 };
  }
  function unstick(ent) {
    if (!G || !blocked(G.level, ent.x, ent.y)) return;
    const p = nearestWalk(G.level, ent.x, ent.y);
    ent.x = p.x; ent.y = p.y;
  }
  function dropItemNear(x, y, kind) {
    const p = nearestWalk(G.level, x, y);
    G.level.items.push({ x: Math.floor(p.x), y: Math.floor(p.y), kind });
  }
  function dropBoss(f) {
    const loot = BOSS_LOOT[f.kind];
    if (!loot) return;
    loot.forEach((k, i) => dropItemNear(f.x + (i ? 0.35 : -0.15), f.y, k));
    say((f.kind === "lock" ? "The Lock" : "The guardian") + " yields relics.");
  }

  function surviveKind(w) {
    if (w > 10 && Math.random() < 0.08) return "thief";
    if (w > 6 && Math.random() < 0.14) return "shade";
    return KINDS[(Math.random() * KINDS.length) | 0];
  }
  function spawnSurviveAround(kind, boss) {
    const live = G.players.find((p) => !p.dead) || G.players[0];
    if (!live) return false;
    const vw = Math.max(16, (canvas.clientWidth / TILE) * 0.58);
    const vh = Math.max(12, (canvas.clientHeight / TILE) * 0.58);
    const ring = Math.max(vw, vh) + 2;
    for (let t = 0; t < 16; t++) {
      const ang = Math.random() * 6.28;
      const dist = ring + Math.random() * 12;
      let x = live.x + Math.cos(ang) * dist, y = live.y + Math.sin(ang) * dist;
      x = Math.max(4, Math.min(G.level.W - 5, x));
      y = Math.max(4, Math.min(G.level.H - 5, y));
      const tx = Math.floor(x), ty = Math.floor(y);
      let p;
      if (G.level.tiles[ty] && G.level.tiles[ty][tx] === "floor") p = { x: tx + 0.5, y: ty + 0.5 };
      else p = nearestWalk(G.level, x, y);
      if (blocked(G.level, p.x, p.y)) continue;
      if (Math.hypot(p.x - live.x, p.y - live.y) < 12) continue;
      const rank = 1 + Math.min(8, (surviveWave() / 4) | 0);
      const f = makeFoe(kind, rank, p.x, p.y);
      if (boss) f.boss = true;
      G.level.foes.push(f);
      return true;
    }
    return false;
  }
  function surviveCap(w) { return Math.min(280, 36 + w * 12); }
  function surviveTick(dt) {
    if (!G || G.mode !== "survive" || G.over) return;
    const w = surviveWave();
    if (w !== G.wave) {
      G.wave = w;
      say("Wave " + w + " — the pour thickens.");
      $("holePill").textContent = "SURVIVE · WAVE " + w;
    }
    const cap = surviveCap(w);
    G.spawnT -= dt;
    const gap = Math.max(0.05, 0.2 - w * 0.006);
    if (G.spawnT <= 0 && G.level.foes.length < cap) {
      G.spawnT = gap;
      const n = 4 + Math.min(16, (w * 0.9) | 0);
      for (let i = 0; i < n; i++) {
        if (G.level.foes.length >= cap) break;
        spawnSurviveAround(surviveKind(w), false);
      }
    }
    G.hordeT = (G.hordeT == null ? 7 : G.hordeT) - dt;
    if (G.hordeT <= 0) {
      G.hordeT = Math.max(5.5, 13 - w * 0.22);
      const pack = 10 + Math.min(28, w * 2);
      say("A pour — " + pack + " more.");
      for (let i = 0; i < pack; i++) {
        if (G.level.foes.length >= cap) break;
        spawnSurviveAround(surviveKind(w), false);
      }
    }
    if (w >= 5 && w % 5 === 0 && G.bossAt !== w) {
      G.bossAt = w;
      const nB = 1 + (w >= 15 ? 1 : 0) + (w >= 25 ? 1 : 0);
      for (let i = 0; i < nB; i++) {
        const bk = SURVIVE_BOSSES[(((w / 5) | 0) + i) % SURVIVE_BOSSES.length];
        spawnSurviveAround(bk, true);
      }
      say(nB > 1 ? "Named guardians enter the long crypt." : "A named guardian enters the long crypt.");
    }
    if (G.pendingLvl > 0 && overlayMode == null) offerSurviveUp();
  }
  function onSurviveKill(f) {
    G.kills = (G.kills || 0) + 1;
    G.score += 6 + surviveWave() * 2;
    G.xp += 1 + ((surviveWave() / 5) | 0);
    if (Math.random() < 0.07 && G.level.items.length < 90) {
      const loot = ["food", "berry", "coin", "scrap", "core", "heart", "moss", "vial", "fury", "magnet"];
      dropItemNear(f.x, f.y, loot[(Math.random() * loot.length) | 0]);
    }
    while (G.xp >= surviveXpNeed(G.lvl)) {
      G.xp -= surviveXpNeed(G.lvl);
      G.lvl++;
      G.pendingLvl = (G.pendingLvl || 0) + 1;
    }
  }
  function rollSurviveUps() {
    const pool = SURVIVE_UP.filter((u) => {
      if (!WEAPONS[u.id]) return true;
      let mx = 0;
      G.players.forEach((p) => { mx = Math.max(mx, wepLv(p, u.id)); });
      return mx < 8;
    });
    const out = [];
    const copy = pool.slice();
    while (out.length < 3 && copy.length) {
      const i = (Math.random() * copy.length) | 0;
      out.push(copy.splice(i, 1)[0]);
    }
    while (out.length < 3) out.push(SURVIVE_UP[out.length % SURVIVE_UP.length]);
    return out;
  }
  function applySurviveUp(u) {
    G.players.forEach((p) => {
      if (p.dead) return;
      if (u.id === "might") p.might = (p.might || 0) + 1;
      else if (u.id === "haste") p.haste = (p.haste || 0) + 1;
      else if (u.id === "iron") p.iron = (p.iron || 0) + 1;
      else if (u.id === "heart") { p.max += 80; p.hp = Math.min(p.max, p.hp + 80); }
      else if (u.id === "core") p.cores = (p.cores || 0) + 1;
      else if (u.id === "phial") p.vials += 2;
      else if (u.id === "pierce") p.pierce = (p.pierce || 0) + 1;
      else if (u.id === "cap") p.extraCap = (p.extraCap || 0) + 1;
      else if (u.id === "magnet") p.magnet = (p.magnet || 0) + 0.45;
      else if (u.id === "swift") p.stride = (p.stride || 0) + 1;
      else if (u.id === "vialpow") p.vialPow = (p.vialPow || 0) + 1;
      else if (WEAPONS[u.id]) giveWep(p, u.id);
    });
    say(u.name + " — " + u.spec);
  }
  function markUpgradeSel() {
    const cards = document.querySelectorAll("[data-up]");
    cards.forEach((el) => el.classList.toggle("on", +el.getAttribute("data-up") === (G._upSel || 0)));
  }
  function confirmSurviveUp(i) {
    if (!G || !G._ups || G._upLock) return;
    const u = G._ups[i];
    if (!u) return;
    G._upLock = true;
    applySurviveUp(u);
    G._ups = null;
    G._upLock = false;
    hideOverlay();
    overlayMode = null;
    $("overlay").onclick = null;
    if (G.pendingLvl > 0) offerSurviveUp();
  }
  function pollUpgradePick() {
    if (!G || !G._ups) return;
    const n = G._ups.length;
    if (G._upSel == null) G._upSel = 0;
    let dir = 0, ok = false;
    if (keyEdge.ArrowLeft || keyEdge.KeyA || keyEdge.KeyQ) dir = -1;
    if (keyEdge.ArrowRight || keyEdge.KeyD || keyEdge.KeyE) dir = 1;
    if (keyEdge.Digit1 || keyEdge.Numpad1) { confirmSurviveUp(0); keyEdge = {}; return; }
    if (keyEdge.Digit2 || keyEdge.Numpad2) { confirmSurviveUp(1); keyEdge = {}; return; }
    if (keyEdge.Digit3 || keyEdge.Numpad3) { confirmSurviveUp(2); keyEdge = {}; return; }
    if (keyEdge.Enter || keyEdge.KeyJ || keyEdge.Space || keyEdge.Numpad0) ok = true;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let anyHold = false;
    for (let i = 0; i < pads.length; i++) {
      const pad = pads[i];
      if (!pad) continue;
      const ax = pad.axes[0] || 0;
      const left = ax < -0.55 || (pad.buttons[14] && pad.buttons[14].pressed);
      const right = ax > 0.55 || (pad.buttons[15] && pad.buttons[15].pressed);
      const confirm = (pad.buttons[0] && pad.buttons[0].pressed) ||
        (pad.buttons[7] && pad.buttons[7].pressed) ||
        (pad.buttons[9] && pad.buttons[9].pressed);
      if (left || right || confirm) anyHold = true;
      if (G._upHold) continue;
      if (left && !G._upPadL) dir = -1;
      if (right && !G._upPadR) dir = 1;
      G._upPadL = left;
      G._upPadR = right;
      if (confirm) ok = true;
    }
    if (G._upHold) {
      if (!anyHold && !keys.Enter && !keys.KeyJ && !keys.Space && !keys.Numpad0) G._upHold = false;
      keyEdge = {};
      return;
    }
    if (dir) {
      G._upSel = (G._upSel + dir + n) % n;
      markUpgradeSel();
      beep("pick");
    }
    if (ok) confirmSurviveUp(G._upSel);
    keyEdge = {};
  }
  function offerSurviveUp() {
    const picks = rollSurviveUps();
    G._ups = picks;
    G._upSel = 0;
    G._upHold = true;
    G._upPadL = true;
    G._upPadR = true;
    G._upLock = false;
    G.pendingLvl--;
    overlayMode = "sheet";
    showSheet(
      "<p class='kicker'>The lattice grows</p><h2>Level " + G.lvl + "</h2>" +
      "<p class='lore'>Pick one. Stacks keep. Wave " + surviveWave() + ". Stick / D-pad to choose, A to take. 1–3 or Enter.</p>" +
      "<div class='mode-grid'>" + picks.map((u, i) =>
        "<button type='button' class='mode-card" + (i === 0 ? " on" : "") + "' data-up='" + i + "'><b>" + u.name + "</b><span>" + u.spec + "</span></button>"
      ).join("") + "</div>"
    );
    $("overlay").classList.add("upgrade-pick");
    $("overlay").onclick = function (e) {
      const b = e.target.closest("[data-up]");
      if (!b || !G._ups) return;
      confirmSurviveUp(+b.getAttribute("data-up"));
    };
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
      while (x !== b.cx) {
        tiles[y][x] = "floor";
        if (tiles[y][x - 1] === "wall") tiles[y][x - 1] = "floor";
        x += x < b.cx ? 1 : -1;
      }
      while (y !== b.cy) {
        tiles[y][x] = "floor";
        if (tiles[y - 1] && tiles[y - 1][x] === "wall") tiles[y - 1][x] = "floor";
        y += y < b.cy ? 1 : -1;
      }
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

  function contentBox(lv) {
    let x0 = lv.W, y0 = lv.H, x1 = 0, y1 = 0;
    for (let y = 0; y < lv.H; y++) {
      for (let x = 0; x < lv.W; x++) {
        if (lv.tiles[y][x] === "wall") continue;
        if (x < x0) x0 = x; if (y < y0) y0 = y;
        if (x > x1) x1 = x; if (y > y1) y1 = y;
      }
    }
    lv.box = { x0, y0, x1, y1 };
    return lv;
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

  const SURVIVE_UP = [
    { id: "might", name: "Might", spec: "Shot damage +1. Stacks." },
    { id: "haste", name: "Haste", spec: "Fire faster. Stacks." },
    { id: "iron", name: "Iron", spec: "Armor +1. Stacks." },
    { id: "heart", name: "Heart", spec: "+80 max HP and heal." },
    { id: "core", name: "Core", spec: "Shot +1. Stacks." },
    { id: "phial", name: "Phial", spec: "+2 vials." },
    { id: "pierce", name: "Pierce", spec: "Bolts pass +1 foe. Stacks." },
    { id: "cap", name: "Volley", spec: "+1 live bolt. Stacks." },
    { id: "magnet", name: "Pull", spec: "Pickups from farther. Stacks." },
    { id: "swift", name: "Stride", spec: "Move speed +8%. Stacks." },
    { id: "vialpow", name: "Resonance", spec: "Vials hit harder. Stacks." },
    { id: "fan", name: "Fan", spec: "Arm or stack the three-way crescent." },
    { id: "needle", name: "Needle", spec: "Arm or stack the piercing beam." },
    { id: "cinder", name: "Cinder", spec: "Arm or stack the fireball." },
    { id: "comet", name: "Comet", spec: "Arm or stack the ice lob." },
    { id: "halo", name: "Halo", spec: "Arm or stack the orbiting wards." },
    { id: "cleave", name: "Cleave", spec: "Short-range auto slash. Stacks range." },
    { id: "orbit", name: "Orbit", spec: "Spinning blades. Stacks more blades." },
    { id: "aura", name: "Aura", spec: "Hurt anything in arm's reach. Stacks." }
  ];
  const SURVIVE_BOSSES = ["gate", "crown", "smith", "heartboss", "levi", "tithe", "unnamer", "lock"];

  function surviveWave() { return G ? (1 + ((G.t / 28) | 0)) : 1; }
  function surviveXpNeed(lv) { return 10 + lv * 6; }

  function genSurvive(seed) {
    const R = rng(seed ^ 0x51A11);
    const W = 256, H = 224;
    const tiles = Array.from({ length: H }, () => Array(W).fill("floor"));
    for (let x = 0; x < W; x++) {
      for (let k = 0; k < 3; k++) { tiles[k][x] = "wall"; tiles[H - 1 - k][x] = "wall"; }
    }
    for (let y = 0; y < H; y++) {
      for (let k = 0; k < 3; k++) { tiles[y][k] = "wall"; tiles[y][W - 1 - k] = "wall"; }
    }
    const nRuin = 110 + ((R() * 50) | 0);
    for (let n = 0; n < nRuin; n++) {
      const rw = 2 + ((R() * 9) | 0), rh = 2 + ((R() * 8) | 0);
      const rx = 8 + ((R() * (W - rw - 16)) | 0);
      const ry = 8 + ((R() * (H - rh - 16)) | 0);
      fillRect(tiles, W, H, rx, ry, rw, rh, "wall");
      if (R() < 0.75) {
        const side = (R() * 4) | 0;
        if (side === 0) tiles[ry][rx + (rw >> 1)] = "floor";
        else if (side === 1) tiles[ry + rh - 1][rx + (rw >> 1)] = "floor";
        else if (side === 2) tiles[ry + (rh >> 1)][rx] = "floor";
        else tiles[ry + (rh >> 1)][rx + rw - 1] = "floor";
      }
    }
    for (let n = 0; n < 22; n++) {
      if (R() < 0.5) {
        const x = 10 + ((R() * (W - 20)) | 0);
        const y0 = 10 + ((R() * (H - 50)) | 0);
        const len = 22 + ((R() * 50) | 0);
        for (let y = y0; y < y0 + len && y < H - 8; y++) {
          tiles[y][x] = R() < 0.14 ? "floor" : "wall";
          if (R() < 0.35 && x + 1 < W - 4) tiles[y][x + 1] = tiles[y][x];
        }
      } else {
        const y = 10 + ((R() * (H - 20)) | 0);
        const x0 = 10 + ((R() * (W - 50)) | 0);
        const len = 22 + ((R() * 50) | 0);
        for (let x = x0; x < x0 + len && x < W - 8; x++) {
          tiles[y][x] = R() < 0.14 ? "floor" : "wall";
          if (R() < 0.35 && y + 1 < H - 4) tiles[y + 1][x] = tiles[y][x];
        }
      }
    }
    const start = { x: W >> 1, y: H >> 1 };
    fillRect(tiles, W, H, start.x - 14, start.y - 11, 28, 22, "floor");
    for (let x = 3; x < W - 3; x++) {
      tiles[start.y][x] = "floor";
      tiles[start.y - 1][x] = "floor";
      tiles[start.y + 1][x] = "floor";
    }
    for (let y = 3; y < H - 3; y++) {
      tiles[y][start.x] = "floor";
      tiles[y][start.x - 1] = "floor";
      tiles[y][start.x + 1] = "floor";
    }
    tiles[start.y][start.x] = "floor";
    const items = [];
    const bag = ["food", "food", "berry", "bread", "flask", "vial", "chest", "heart", "core", "coin", "moss", "scrap", "nectar", "magnet", "fury", "echo"];
    for (let i = 0; i < 96; i++) {
      let p = null;
      for (let k = 0; k < 40; k++) {
        const x = 6 + ((R() * (W - 12)) | 0), y = 6 + ((R() * (H - 12)) | 0);
        if (tiles[y][x] === "floor" && (x !== start.x || y !== start.y)) { p = { x, y }; break; }
      }
      if (p) items.push({ x: p.x, y: p.y, kind: bag[(R() * bag.length) | 0] });
    }
    return contentBox({
      W, H, tiles, start, items, gens: [], foes: [], doors: [], pads: [],
      realm: REALMS[seed % 8],
      layout: "The Long Crypt",
      lore: "No exit. A continent of stone. The lattice pours. Grow or be unnamed.",
      treasure: 0, quiet: 0, survive: true
    });
  }

  function genLevel(seed, floor, mode) {
    if (mode === "survive") return genSurvive(seed);
    if (mode === "campaign" && window.LatticeCampaign && floor < window.LatticeCampaign.LEN) {
      return window.LatticeCampaign.build(floor, makeFoe);
    }
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
    const rank = 1 + Math.min(2, (floor / (mode === "endless" ? 6 : 12)) | 0);
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
    const gN = 3 + ((R() * 4) | 0) + Math.min(mode === "endless" ? 7 : 4, (floor / (mode === "endless" ? 5 : 8)) | 0);
    for (let i = 0; i < gN; i++) {
      const p = empty();
      if (!p) break;
      gens.push({ x: p.x, y: p.y, kind: KINDS[(R() * KINDS.length) | 0], rank, hp: 3 * rank, t: R() * 0.6 });
    }
    const itemN = treasure ? 18 : Math.max(6, 9 + ((R() * 6) | 0) - (mode === "endless" ? (floor / 10) | 0 : 0));
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
    if (floor >= (mode === "endless" ? 3 : 6) && R() < 0.22 + floor * 0.01) {
      foes.push(makeFoe("drain", 1, exit.x + 0.5, exit.y + 0.5));
    }
    return contentBox({
      W, H, tiles, start, items, gens, foes, doors, pads,
      realm: REALMS[floor % 8],
      layout: kind,
      treasure: treasure ? 30 : 0,
      quiet: 0
    });
  }

  function makeFoe(kind, rank, x, y) {
    const d = FOE[kind] || FOE.brute;
    const k = FOE[kind] ? kind : "brute";
    let hp = k === "drain" ? 99 : (d.boss ? d.hp : d.hp * rank);
    if (G && G.mode === "survive") {
      const w = surviveWave();
      hp = k === "drain" ? 40 + w * 6 : (d.boss ? Math.round(16 + w * 9) : Math.max(1, Math.round(1 + w * 1.15)));
      rank = 1 + Math.min(8, (w / 4) | 0);
    }
    return {
      kind: k, rank, x, y,
      hp, max: hp,
      boss: !!d.boss,
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
    return t === "wall" || t === "door" || t === "exit_lock";
  }
  function firstWallOnSeg(x0, y0, x1, y1) {
    const lv = G.level;
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist * 12));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      if (blocked(lv, x, y) && tileAt(lv, x, y) !== "door_open") return { x, y };
    }
    return null;
  }
  function hasLos(x0, y0, x1, y1) {
    const lv = G.level;
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist * 10));
    const sx = Math.floor(x0), sy = Math.floor(y0);
    const tx = Math.floor(x1), ty = Math.floor(y1);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      const gx = Math.floor(x), gy = Math.floor(y);
      if ((gx === sx && gy === sy) || (gx === tx && gy === ty)) continue;
      if (blocked(lv, x, y) && tileAt(lv, x, y) !== "door_open") return false;
    }
    return true;
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
      thiefT: 24,
      over: false,
      mode: opts.mode || "campaign",
      xp: 0, lvl: 1, kills: 0, wave: 1, spawnT: 0.15, bossAt: 0, pendingLvl: 0, hordeT: 6
    };
    joinHero(opts.hero || persist.hero, 0);
    if (G.mode === "survive") {
      G.surviveAuto = true;
      G.players.forEach((p) => { p.vials = 2; p.magnet = 0.35; });
    }
    loadFloor(0);
    overlayMode = null;
    hideOverlay();
    $("app").classList.remove("hidden");
    $("app").classList.toggle("survive-mode", G.mode === "survive");
    const sh = $("studioHud");
    if (sh) sh.classList.toggle("hidden", G.mode !== "survive");
    if (G.mode === "campaign") say("Campaign — the First Descent.");
    else if (G.mode === "survive") {
      say("Survival — the Long Crypt. A continent of stone. Grow or drown.");
      for (let i = 0; i < 22; i++) spawnSurviveAround(surviveKind(1), false);
    }
    else say("Endless — the crypt does not end.");
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
      shotBoost: 0, swift: 0, aegis: 0, veil: 0, reflect: 0, fury: 0, thorns: 0, echo: 0, regen: 0, stun: 0, padT: 0, hurtT: 0,
      weapon: (h.wep && WEAPONS[h.wep]) ? h.wep : "shard",
      arsenal: ["shard"].concat(h.wep && h.wep !== "shard" && WEAPONS[h.wep] ? [h.wep] : []),
      wepLv: {}, coolT: {},
      cores: 0, iron: (h.id === "justicae" || h.id === "lightfather") ? 1 : 0,
      might: 0, haste: 0, stride: 0, pierce: 0, extraCap: 0, vialPow: 0, magnet: 0,
      dead: false, pad: -1, hurtBeep: 0, halo: null, orbit: null, cleaveT: 0
    };
    p.wepLv.shard = 1;
    if (p.weapon !== "shard") p.wepLv[p.weapon] = 1;
    G.players.push(p);
    return p;
  }

  function loadFloor(n) {
    G.floor = n;
    G.level = genLevel(G.seed, n, G.mode);
    const st = G.level.start;
    G.players.forEach((p, i) => {
      if (p.dead) return;
      p.x = st.x + 0.5 + (i % 2) * 0.4;
      p.y = st.y + 0.5 + ((i / 2) | 0) * 0.4;
      p.padT = 0;
    });
    G.level.foes.forEach((f) => {
      const p = nearestWalk(G.level, f.x, f.y);
      f.x = p.x; f.y = p.y;
    });
    G.level.items.forEach((it) => {
      const p = nearestWalk(G.level, it.x + 0.5, it.y + 0.5);
      it.x = Math.floor(p.x); it.y = Math.floor(p.y);
    });
    G.shots = [];
    G.thiefT = 24 + (Math.random() * 16);
    if (G.mode === "campaign") {
      $("holePill").textContent = G.level.realm.name.toUpperCase() + " " + (n + 1) + "/" + (window.LatticeCampaign ? window.LatticeCampaign.LEN : 24);
    } else if (G.mode === "survive") {
      $("holePill").textContent = "SURVIVE · WAVE 1";
    } else {
      $("holePill").textContent = (G.mode === "endless" ? "ENDLESS " : "") + G.level.realm.name.toUpperCase() + " " + (n + 1);
    }
    if (G.level.layout) say(G.level.layout + (G.level.seal ? " — smash the nexuses." : "."));
    else if (G.level.treasure) say("Treasure rush — grab and go.");
    else if (G.level.items.some((it) => it.hidden)) say("A hidden vial waits.");
    if (G.level.foes.some((f) => f.kind === "drain")) say("The Drain walks.");
    if (G.level.foes.some((f) => FOE[f.kind] && FOE[f.kind].boss)) say("A named guardian holds this seal.");
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
    let fire = persist.autoShot || G.surviveAuto || map.fire.some((k) => keys[k] || keyEdge[k]);
    let mag = map.mag.some((k) => keyEdge[k]);
    let cycle = (map.cycle || []).some((k) => keyEdge[k]);
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
      const magBtn = (pad.buttons[1] && pad.buttons[1].pressed) || (pad.buttons[2] && pad.buttons[2].pressed) || (pad.buttons[6] && pad.buttons[6].pressed);
      if (magBtn && !p._magLatch) { mag = true; p._magLatch = true; }
      if (!magBtn) p._magLatch = false;
      if (pad.buttons[4] && pad.buttons[4].pressed && !p._lbLatch) { cycle = true; p._lbLatch = true; }
      if (pad.buttons[4] && !pad.buttons[4].pressed) p._lbLatch = false;
    }
    if (dx || dy) {
      const l = Math.hypot(dx, dy) || 1;
      dx /= l; dy /= l;
      p.facing = dirFrom(dx, dy);
      p.aimX = dx; p.aimY = dy;
    }
    return { dx, dy, fire, mag, cycle };
  }

  function resolveCircle(lv, x, y, r) {
    const tx = Math.floor(x), ty = Math.floor(y);
    for (let iy = ty - 1; iy <= ty + 1; iy++) {
      for (let ix = tx - 1; ix <= tx + 1; ix++) {
        if (!blocked(lv, ix + 0.5, iy + 0.5)) continue;
        const cx = Math.max(ix, Math.min(ix + 1, x));
        const cy = Math.max(iy, Math.min(iy + 1, y));
        const ox = x - cx, oy = y - cy;
        const d = Math.hypot(ox, oy);
        if (d < 1e-4) {
          const p = nearestWalk(lv, x, y);
          x = p.x; y = p.y;
          continue;
        }
        if (d < r) {
          const s = (r - d) / d;
          x += ox * s;
          y += oy * s;
        }
      }
    }
    return { x, y };
  }
  function tryMove(ent, dx, dy, speed, dt, ghost) {
    const mx = dx * speed * dt, my = dy * speed * dt;
    if (ghost) {
      ent.x += mx; ent.y += my;
      if (ent.keys != null) bumpDoor(ent);
      return;
    }
    const lv = G.level;
    const lead = 0.14;
    if (mx) {
      const nx = ent.x + mx;
      const lx = nx + (mx > 0 ? lead : -lead);
      if (!blocked(lv, nx, ent.y) && !blocked(lv, lx, ent.y)) ent.x = nx;
    }
    if (my) {
      const ny = ent.y + my;
      const ly = ny + (my > 0 ? lead : -lead);
      if (!blocked(lv, ent.x, ny) && !blocked(lv, ent.x, ly)) ent.y = ny;
    }
    if (blocked(lv, ent.x, ent.y)) unstick(ent);
    if (ent.keys != null) bumpDoor(ent);
  }

  function bumpDoor(ent) {
    const tx = Math.floor(ent.x), ty = Math.floor(ent.y);
    const near = [[tx, ty], [tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1]];
    for (const [x, y] of near) {
      if (!inB(G.level, x, y)) continue;
      if (G.level.tiles[y][x] !== "door") continue;
      if (Math.hypot(ent.x - (x + 0.5), ent.y - (y + 0.5)) > 0.72) continue;
      if (ent.keys > 0) {
        ent.keys--;
        G.level.tiles[y][x] = "door_open";
        log("Door opens.");
      }
    }
  }

  function wepOf(p) { return WEAPONS[p.weapon] || WEAPONS.shard; }
  function wepLv(p, id) {
    if (!p.arsenal || p.arsenal.indexOf(id) < 0) return 0;
    return (p.wepLv && p.wepLv[id]) || 1;
  }
  function shotDmg(p, w) {
    return Math.max(1, p.hero.shot + (p.cores || 0) + (p.might || 0) + (w.dmg || 0) + (p.fury > 0 ? 2 : 0));
  }
  function distSeg(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    if (l2 < 1e-8) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  function spawnBolt(p, ax, ay, id) {
    const w = WEAPONS[id] || WEAPONS.shard;
    const lv = wepLv(p, id);
    let sx = p.x + ax * 0.35, sy = p.y + ay * 0.35;
    if (blocked(G.level, sx, sy)) { sx = p.x; sy = p.y; }
    G.shots.push({
      x: sx, y: sy, px: sx, py: sy, vx: ax * w.spd, vy: ay * w.spd,
      dmg: shotDmg(p, w) + Math.max(0, lv - 1), owner: p, life: w.life, maxLife: w.life, grace: 0.12,
      hero: p.hero.id, wep: id, bounced: false,
      pierce: (w.pierce || 0) + (p.pierce || 0) + Math.max(0, lv - 1) + (p.echo > 0 ? 1 : 0), lob: !!w.lob, flame: w.flame || 0, echo: p.echo > 0,
      trail: [{ x: sx, y: sy }]
    });
  }

  function fireWeapon(p, id) {
    const w = WEAPONS[id];
    if (!w || w.melee) return false;
    p.coolT = p.coolT || {};
    if ((p.coolT[id] || 0) > 0) return false;
    const lv = wepLv(p, id);
    const live = G.shots.filter((s) => s.owner === p && s.wep === id).length;
    const cap = (p.shotBoost > 0 ? Math.max(3, w.cap) : w.cap) + (p.extraCap || 0) + Math.max(0, lv - 1);
    if (live >= cap) return false;
    let ax = p.aimX, ay = p.aimY;
    const len = Math.hypot(ax, ay) || 1;
    ax /= len; ay /= len;
    if (w.halo) {
      const n = 2 + Math.min(4, lv);
      if (!p.halo || p.halo.length !== n) {
        p.halo = [];
        for (let i = 0; i < n; i++) p.halo.push({ ang: (i / n) * Math.PI * 2, r: 0.82 + lv * 0.04 });
      }
    }
    if (w.spread) {
      const ang = Math.atan2(ay, ax);
      const offs = lv >= 3 ? [-w.spread * 1.5, -w.spread, 0, w.spread, w.spread * 1.5] : [-w.spread, 0, w.spread];
      offs.forEach((off) => spawnBolt(p, Math.cos(ang + off), Math.sin(ang + off), id));
    } else {
      spawnBolt(p, ax, ay, id);
    }
    G.fx.push({ x: p.x + ax * 0.45, y: p.y + ay * 0.45, life: 0.1, kind: "muzzle", wep: id, ang: Math.atan2(ay, ax) });
    const cool = (p.shotBoost > 0 ? Math.min(0.12, w.cool) : w.cool) / (1 + (p.haste || 0) * 0.1);
    p.coolT[id] = Math.max(0.08, cool);
    return true;
  }
  function fireArsenal(p) {
    let any = false;
    (p.arsenal || [p.weapon]).forEach((id) => { if (fireWeapon(p, id)) any = true; });
    if (any && p.hero.hymn) {
      G.level.foes.forEach((f) => { if (Math.hypot(f.x - p.x, f.y - p.y) < 3.2) f.stun = Math.max(f.stun || 0, 0.35); });
      G.fx.push({ x: p.x, y: p.y, life: 0.35, kind: "note" });
    }
    if (any) beep("shot");
  }
  function tickMelee(p, dt) {
    const lvC = wepLv(p, "cleave");
    if (lvC) {
      p.cleaveT = (p.cleaveT || 0) - dt;
      if (p.cleaveT <= 0) {
        p.cleaveT = Math.max(0.18, 0.4 / (1 + (p.haste || 0) * 0.1));
        const range = 1.42 + lvC * 0.2;
        const ax = p.aimX || 1, ay = p.aimY || 0;
        const dmg = shotDmg(p, WEAPONS.cleave) + lvC;
        G.level.foes.forEach((f) => {
          const dx = f.x - p.x, dy = f.y - p.y;
          const d = Math.hypot(dx, dy);
          if (d > range || d < 0.04) return;
          if ((dx * ax + dy * ay) / d < 0.12) return;
          hitFoe(f, dmg, true);
        });
        G.fx.push({ x: p.x, y: p.y, life: 0.14, kind: "slash", ang: Math.atan2(ay, ax), r: range });
      }
    }
    const lvO = wepLv(p, "orbit");
    if (lvO) {
      const n = 2 + Math.min(5, lvO);
      const r = 0.92 + lvO * 0.08;
      if (!p.orbit || p.orbit.length !== n) {
        p.orbit = [];
        for (let i = 0; i < n; i++) p.orbit.push({ ang: (i / n) * Math.PI * 2, r });
      }
      p.orbit.forEach((o) => {
        o.r = r;
        o.ang += dt * (4.4 + lvO * 0.35);
        const hx = p.x + Math.cos(o.ang) * o.r, hy = p.y + Math.sin(o.ang) * o.r;
        G.level.foes.forEach((f) => {
          if (Math.hypot(f.x - hx, f.y - hy) < 0.62) hitFoe(f, Math.max(2, 2 + lvO + (p.might || 0)), true);
        });
      });
    }
    const lvA = wepLv(p, "aura");
    if (lvA) {
      const rad = 1.18 + lvA * 0.2;
      const dps = 3.2 + lvA * 1.4 + (p.might || 0);
      G.level.foes.forEach((f) => {
        if (Math.hypot(f.x - p.x, f.y - p.y) < rad) hitFoe(f, dps * dt, true);
      });
    }
  }

  function giveWep(p, id) {
    if (!WEAPONS[id]) return false;
    p.wepLv = p.wepLv || {};
    if (p.arsenal.includes(id)) {
      p.wepLv[id] = (p.wepLv[id] || 1) + 1;
      say(WEAPONS[id].name + " stacks to " + p.wepLv[id] + ".");
      return true;
    }
    p.arsenal.push(id);
    p.wepLv[id] = 1;
    p.weapon = id;
    say(p.hero.name + " arms " + WEAPONS[id].name + " — all arms fire.");
    return true;
  }

  function cycleWep(p) {
    if (!p.arsenal || p.arsenal.length < 2) { say("Only Shard — find a relic."); return; }
    const i = p.arsenal.indexOf(p.weapon);
    p.weapon = p.arsenal[(i + 1) % p.arsenal.length];
    say("Focus " + WEAPONS[p.weapon].name + " · all still fire.");
  }

  function faithMul(p) {
    return 0.7 + (p.hero.faith || 50) / 200;
  }
  function braveMul(p) {
    return 0.7 + (p.hero.brave || 50) / 200;
  }
  function jobVial(p, pow) {
    const id = p.hero.id;
    if (id === "kael") {
      G.level.gens.forEach((g) => { g.hp -= 2; });
    }
    if (id === "vale") {
      G.players.forEach((o) => {
        if (!o.dead && Math.hypot(o.x - p.x, o.y - p.y) < 6.5) {
          o.aegis = Math.max(o.aegis, 4.8);
          G.fx.push({ x: o.x, y: o.y, life: 0.4, max: 0.4, kind: "shield" });
        }
      });
    }
    if (id === "nia") p.swift = Math.max(p.swift, 3.4);
    if (id === "d9ra") {
      const md = Math.max(4, (p.hero.melee || 7) * 1.4 * braveMul(p));
      G.level.foes.forEach((f) => {
        if (Math.hypot(f.x - p.x, f.y - p.y) < 2.6) hitFoe(f, md, true);
      });
    }
    if (id === "srath") p.veil = Math.max(p.veil, 2.4);
    if (p.hero.time) {
      G.fx.push({ x: p.x, y: p.y, life: 0.35, kind: "warp" });
      randomFloor(p);
      G.fx.push({ x: p.x, y: p.y, life: 0.35, kind: "warp" });
    }
    if (id === "justicae") p.reflect = Math.max(p.reflect, 5.2);
    if (p.hero.heal) {
      G.players.forEach((o) => { if (!o.dead) o.hp = Math.min(o.max, o.hp + Math.round(70 * faithMul(p))); });
    }
    if (p.hero.accord) {
      G.level.foes.forEach((f) => {
        if (Math.hypot(f.x - p.x, f.y - p.y) < 11) f.stun = Math.max(f.stun || 0, 1.7);
      });
      G.players.forEach((o) => {
        if (o.dead) return;
        o.aegis = Math.max(o.aegis, 5.2);
        o.hp = Math.min(o.max, o.hp + Math.round(36 * faithMul(p)));
      });
    }
    return pow;
  }
  function useVial(p) {
    if (p.vials < 1 || p.magT > 0) return;
    p.vials--;
    p.magT = 0.22;
    beep("vial");
    const pow = Math.round(20 * p.hero.magic * faithMul(p) * (1 + (p.vialPow || 0) * 0.15));
    say(p.hero.name + " — " + (p.hero.special || "vial") + ".");
    G.level.foes.forEach((f) => {
      if (Math.hypot(f.x - p.x, f.y - p.y) > 11) return;
      if (f.kind === "drain") { f.hp = 0; G.score += 250; say("The Drain is unmade."); }
      else f.hp -= pow;
    });
    G.level.gens.forEach((g) => { g.hp -= Math.max(1, (pow / 20) | 0); });
    G.fx.push({ x: p.x, y: p.y, life: 0.58, max: 0.58, kind: "nova", col: p.hero.color, job: p.hero.id });
    jobVial(p, pow);
  }

  function randomFloor(p) {
    const lv = G.level;
    for (let k = 0; k < 80; k++) {
      const x = 1 + ((Math.random() * (lv.W - 2)) | 0);
      const y = 1 + ((Math.random() * (lv.H - 2)) | 0);
      if (lv.tiles[y][x] === "floor") { p.x = x + 0.5; p.y = y + 0.5; return; }
    }
  }

  function novaStun(x, y, r, t, col) {
    G.level.foes.forEach((f) => { if (Math.hypot(f.x - x, f.y - y) < r) f.stun = Math.max(f.stun || 0, t); });
    G.fx.push({ x, y, life: 0.42, max: 0.42, kind: "nova", col: col || "#93c5fd", job: "pulse" });
  }
  function blastFoes(x, y, r, dmg) {
    G.level.foes.forEach((f) => { if (Math.hypot(f.x - x, f.y - y) < r) hitFoe(f, dmg, false); });
    G.level.gens.forEach((g) => { if (Math.hypot(g.x + 0.5 - x, g.y + 0.5 - y) < r) g.hp -= 1; });
    G.fx.push({ x, y, life: 0.45, max: 0.45, kind: "nova", col: "#fb923c", job: "bomb" });
  }
  function applyPickup(p, it) {
    const k = it.kind;
    const spec = PICK[k] || {};
    G.fx.push({ x: p.x, y: p.y, life: 0.3, kind: "pick", col: spec.glow || "#fde68a" });
    if (WEAPONS[k]) { giveWep(p, k); G.score += spec.score || 90; return; }
    if (spec.heal) p.hp = Math.min(9999, (spec.heal >= 9999 ? p.max : p.hp + spec.heal));
    if (spec.max) { p.max += spec.max; p.hp = Math.min(p.max, p.hp + spec.max); }
    if (spec.vials) p.vials += spec.vials;
    if (spec.keys) p.keys += spec.keys;
    if (spec.cores) p.cores = (p.cores || 0) + spec.cores;
    if (spec.iron) p.iron = (p.iron || 0) + spec.iron;
    if (spec.pierce) p.pierce = (p.pierce || 0) + spec.pierce;
    if (spec.extraCap) p.extraCap = (p.extraCap || 0) + spec.extraCap;
    if (spec.magnet) p.magnet = (p.magnet || 0) + spec.magnet;
    if (spec.stride) p.stride = (p.stride || 0) + spec.stride;
    if (spec.vialPow) p.vialPow = (p.vialPow || 0) + spec.vialPow;
    if (spec.shotBoost) p.shotBoost = Math.max(p.shotBoost || 0, spec.shotBoost);
    if (spec.swift) p.swift = Math.max(p.swift || 0, spec.swift);
    if (spec.aegis) p.aegis = Math.max(p.aegis || 0, spec.aegis);
    if (spec.veil) p.veil = Math.max(p.veil || 0, spec.veil);
    if (spec.reflect) p.reflect = Math.max(p.reflect || 0, spec.reflect);
    if (spec.fury) p.fury = Math.max(p.fury || 0, spec.fury);
    if (spec.thorns) p.thorns = Math.max(p.thorns || 0, spec.thorns);
    if (spec.echo) p.echo = Math.max(p.echo || 0, spec.echo);
    if (spec.regen) p.regen = Math.max(p.regen || 0, spec.regen);
    if (spec.score) G.score += spec.score;
    const sp = spec.special;
    if (sp === "poison") {
      p.hp -= 100; p.shotBoost = 0; p.swift = 0; p.aegis = 0; p.veil = 0; p.reflect = 0; p.fury = 0; p.echo = 0;
      say(p.hero.name + " drank blight.");
      return;
    }
    if (sp === "chest") {
      if (Math.random() < 0.42) {
        const drop = CHEST_DROP[(Math.random() * CHEST_DROP.length) | 0];
        G.level.items.push({ x: it.x, y: it.y, kind: drop });
      }
    }
    if (sp === "pulse") { novaStun(p.x, p.y, 8, 3, "#93c5fd"); say("Pulse — foes freeze."); }
    if (sp === "frostorb") { novaStun(p.x, p.y, 9, 4.2, "#7dd3fc"); say("Frost — the room stills."); }
    if (sp === "hymn") { novaStun(p.x, p.y, 7, 2.4, "#67e8f9"); p.hp = Math.min(p.max, p.hp + 40); say("Hymnstone."); }
    if (sp === "sun") { novaStun(p.x, p.y, 7, 2.2, "#fbbf24"); p.hp = Math.min(p.max, p.hp + 80); say("Sun — light and heat."); }
    if (sp === "storm") { blastFoes(p.x, p.y, 10, 8); say("Storm walks the floor."); }
    if (sp === "bomb") { blastFoes(p.x, p.y, 5.5, 12); say("The charge blooms."); }
    if (sp === "warp") { randomFloor(p); say(p.hero.name + " warps."); }
    if (sp === "scroll") { randomFloor(p); p.shotBoost = Math.max(p.shotBoost || 0, 10); say("Scroll — elsewhere, armed."); }
    if (sp === "lantern") {
      G.level.items.forEach((o) => { o.hidden = false; });
      p.shotBoost = Math.max(p.shotBoost || 0, 8);
      say("Lantern — the floor is named.");
    }
    if (sp === "trap") { p.stun = 0.8; p.hp -= 15; }
    if (sp === "dice") {
      const pool = ["fury", "moss", "coin", "heart", "swift", "bomb", "elixir", "warp", "thorns", "echo"];
      say("The die turns.");
      applyPickup(p, { x: it.x, y: it.y, kind: pool[(Math.random() * pool.length) | 0] });
      return;
    }
    if (spec.say) say(p.hero.name + " — " + spec.say);
  }
  function pickup(p) {
    G.level.items = G.level.items.filter((it) => {
      if (Math.hypot(it.x + 0.5 - p.x, it.y + 0.5 - p.y) > 0.72 + (p.magnet || 0)) return true;
      G.level.quiet = 0;
      beep("pick");
      applyPickup(p, it);
      return false;
    });
  }

  function hitFoe(f, dmg, melee) {
    if (f.kind === "wraith" && melee) return;
    if (shadeHidden(f)) return;
    if (f.kind === "drain") return;
    f.hp -= dmg;
    f.hurt = 0.12;
    if (f.hp <= 0 && G.mode !== "survive") G.score += ((FOE[f.kind] && FOE[f.kind].pts) || 10) * (f.rank || 1);
  }

  function stepPad(p) {
    if (p.padT > 0) return;
    if (tileAt(G.level, p.x, p.y) !== "pad") return;
    const tx = Math.floor(p.x), ty = Math.floor(p.y);
    const pad = (G.level.pads || []).find((d) => d.x === tx && d.y === ty);
    if (!pad) return;
    p.x = pad.tx; p.y = pad.ty; p.padT = p.hero.id === "seidon" ? 0.35 : 0.85;
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
    if (lv.quiet > 14 && G.mode !== "survive") {
      for (let y = 0; y < lv.H; y++) for (let x = 0; x < lv.W; x++) {
        if (lv.tiles[y][x] === "door") lv.tiles[y][x] = "door_open";
      }
    }
    if (lv.quiet > 180 && !lv._stallExit && !lv.seal && G.mode !== "survive") {
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
    if (G.mode !== "survive" && G.thiefT <= 0) {
      G.thiefT = 52 + Math.random() * 22;
      lv.foes.push(makeFoe("thief", 1, lv.start.x + 0.5, lv.start.y + 0.5));
      say("A thief slips the gate.");
    }
    if (G.mode === "survive") {
      surviveTick(dt);
      if (overlayMode === "sheet") { paintHud(); keyEdge = {}; return; }
    }

    lv.gens.forEach((g) => {
      if (g.hp <= 0) return;
      g.t += dt;
      const cap = 1 + g.rank;
      const live = lv.foes.filter((f) => f.kind === g.kind && Math.hypot(f.x - g.x, f.y - g.y) < 8).length;
      if (g.t > (2.1 / Math.max(1, g.rank * 0.7)) && live < cap) {
        g.t = 0;
        const sp = nearestWalk(lv, g.x + 0.5, g.y + 0.5);
        lv.foes.push(makeFoe(g.kind, g.rank, sp.x, sp.y));
      }
    });
    lv.gens = lv.gens.filter((g) => g.hp > 0);
    if (lv.seal && lv.gens.length === 0) unlockSeal();

    bindIdlePads();
    G.players.forEach((p) => {
      if (p.dead) return;
      p.hp -= dt * (G.mode === "survive" ? 0.22 : (G.mode === "endless" ? 0.72 + Math.min(0.45, G.floor * 0.014) : (0.58 + G.floor * 0.016)));
      p.fireT = Math.max(0, p.fireT - dt);
      p.coolT = p.coolT || {};
      Object.keys(p.coolT).forEach((k) => { p.coolT[k] = Math.max(0, p.coolT[k] - dt); });
      p.hurtT = Math.max(0, (p.hurtT || 0) - dt);
      p.magT = Math.max(0, p.magT - dt);
      p.stun = Math.max(0, p.stun - dt);
      p.padT = Math.max(0, p.padT - dt);
      p.shotBoost = Math.max(0, p.shotBoost - dt);
      p.swift = Math.max(0, p.swift - dt);
      p.aegis = Math.max(0, p.aegis - dt);
      p.veil = Math.max(0, p.veil - dt);
      p.reflect = Math.max(0, p.reflect - dt);
      p.fury = Math.max(0, (p.fury || 0) - dt);
      p.thorns = Math.max(0, (p.thorns || 0) - dt);
      p.echo = Math.max(0, (p.echo || 0) - dt);
      p.regen = Math.max(0, (p.regen || 0) - dt);
      if (p.regen > 0) p.hp = Math.min(p.max, p.hp + dt * 18);
      p.hurtBeep = Math.max(0, (p.hurtBeep || 0) - dt);
      if (p.hp <= 0) {
        p.dead = true;
        p.hp = 0;
        say(p.hero.name + " falls. Credit to rise.");
        return;
      }
      const inn = inputFor(p);
      if (p.stun <= 0) {
        const spd = (2.55 + p.hero.speed * 0.6) * (p.swift > 0 ? 1.32 : 1) * (1 + (p.stride || 0) * 0.08);
        tryMove(p, inn.dx, inn.dy, spd, dt, false);
        if (inn.dx || inn.dy) p.walk += dt * 8;
      }
      if (inn.fire) fireArsenal(p);
      tickMelee(p, dt);
      if (inn.mag) useVial(p);
      if (inn.cycle) cycleWep(p);
      pickup(p);
      if (p.halo) {
        p.halo.forEach((h) => {
          h.ang += dt * 5.2;
          const hx = p.x + Math.cos(h.ang) * h.r, hy = p.y + Math.sin(h.ang) * h.r;
          G.level.foes.forEach((f) => {
            if (Math.hypot(f.x - hx, f.y - hy) < 0.56) hitFoe(f, Math.max(2, 2 + (p.cores || 0) + wepLv(p, "halo")), false);
          });
        });
      }
      stepPad(p);
      unstack(p);
      unstick(p);
      if (G.mode !== "survive" && tileAt(lv, p.x, p.y) === "exit") G._exit = true;
    });
    if (G._exit) { G._exit = false; nextFloor(); return; }

    if (G.players.every((p) => p.dead)) {
      G.over = true;
      persist.runs++;
      persist.best = Math.max(persist.best, G.score);
      if (G.mode === "survive") persist.surviveBest = Math.max(persist.surviveBest || 0, G.score);
      savePersist();
      const posted = Math.max(0, (G.score / Math.max(1, G.credits)) | 0);
      const waveOrFloor = G.mode === "survive" ? surviveWave() : G.floor + 1;
      if (window.ArcadeLedger) {
        ArcadeLedger.crypt({
          name: (persist.name || "Warden").slice(0, 18),
          score: posted, raw: G.score, floor: waveOrFloor, credits: G.credits,
          date: new Date().toISOString().slice(0, 10)
        });
      }
      showSheet(
        "<p class='kicker'>Run closed</p><h2>" + G.score + (G.mode === "survive" ? " · wave " + surviveWave() : " · floor " + (G.floor + 1)) + "</h2>" +
        "<p class='lore'>Hall score " + posted + " (per credit)" + (G.mode === "survive" ? " · kills " + (G.kills || 0) + " · lv " + G.lvl : "") + " · Best " + persist.best + " · credits " + G.credits + "</p>" +
        "<div class='modes'><button class='btn gold' id='again'>Descend again</button><button class='btn' id='mm'>Menu</button></div>"
      );
      $("again").onclick = () => newRun({ hero: persist.hero, mode: G.mode });
      $("mm").onclick = menu;
      return;
    }

    const liveP = G.players.filter((p) => !p.dead);
    liveP.forEach((p) => { p._touch = 0; });
    lv.foes.forEach((f) => {
      f.t += dt; f.hurt = Math.max(0, f.hurt - dt); f.flicker += dt;
      f.stun = Math.max(0, (f.stun || 0) - dt);
      if (f.stun > 0) return;
      const def = FOE[f.kind];
      if (!def) return;
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
      if (!ghost) unstick(f);
      else if (blocked(lv, f.x, f.y)) unstick(f);
      const hitR = def.boss ? 0.72 : 0.48;
      if (bd < hitR) {
        const arm = (tgt.aegis > 0 ? tgt.hero.armor + 2 : tgt.hero.armor) + (tgt.iron || 0);
        const dmg = Math.max(2, def.dmg * (G.mode === "survive" ? (1 + surviveWave() * 0.09) : f.rank) - arm);
        const iframe = (tgt.hurtT || 0) > 0.12;
        const surviveIframe = G.mode === "survive" && (tgt.hurtT || 0) > 0;
        if (f.kind === "drain") tgt.hp -= dmg * dt * 6.5;
        else if (surviveIframe) { /* horde i-frame — thorns still bite */ }
        else if (G.mode === "survive") {
          tgt._touch = (tgt._touch || 0) + 1;
          if (tgt._touch <= 5) tgt.hp -= dmg * dt * 1.85;
          if (!iframe) {
            tgt.hurtT = 0.46;
            tryMove(tgt, -Math.cos(ang), -Math.sin(ang), 6, 0.04, false);
          }
        } else {
          tgt.hp -= dmg * dt * (iframe ? 1.15 : 2.35);
          if (!iframe) {
            tgt.hurtT = 0.38;
            tryMove(tgt, -Math.cos(ang), -Math.sin(ang), 6, 0.04, false);
          }
        }
        lv.quiet = 0;
        if (!tgt.hurtBeep) { beep("hurt"); tgt.hurtBeep = 0.25; }
        if (tgt.reflect > 0) f.hp -= 14 * dt;
        if (tgt.thorns > 0) f.hp -= 22 * dt;
        if (f.kind === "thief" && tgt.vials > 0 && !iframe && !surviveIframe) { tgt.vials--; f.hp = 0; say("Thief stole a vial!"); }
        if (f.kind === "drain") {
          f._sip = (f._sip || 0) + dmg * dt * 8;
          if (f._sip > 200) { f.hp = 0; say("The Drain leaves, sated."); }
        }
        if (def.melee && f.kind !== "wraith") f.hp -= tgt.hero.melee * dt * 2.2 * braveMul(tgt);
      }
      if (def.shoot && f.t > 1.1 && bd < 9 && hasLos(f.x, f.y, tgt.x, tgt.y)) {
        f.t = 0;
        G.shots.push({ x: f.x, y: f.y, px: f.x, py: f.y, vx: Math.cos(ang) * 6, vy: Math.sin(ang) * 6, dmg: 8, foe: true, life: 1.4, maxLife: 1.4, hero: "imp", wep: "imp", air: true, grace: 0, trail: [{ x: f.x, y: f.y }] });
      }
      if (def.lob && f.t > 1.4 && hasLos(f.x, f.y, tgt.x, tgt.y)) {
        f.t = 0;
        G.shots.push({ x: f.x, y: f.y, px: f.x, py: f.y, vx: Math.cos(ang) * 4, vy: Math.sin(ang) * 4, dmg: 10, foe: true, life: 1.6, maxLife: 1.6, lob: true, hero: "hurler", wep: "hurler", air: true, grace: 0, trail: [{ x: f.x, y: f.y }] });
      }
    });
    lv.foes = lv.foes.filter((f) => {
      if (f.hp > 0) return true;
      if (f.boss) dropBoss(f);
      if (G.mode === "survive") onSurviveKill(f);
      G.fx.push({ x: f.x, y: f.y, life: 0.35, kind: "puff" });
      return false;
    });

    G.shots.forEach((s) => {
      s.life -= dt;
      s.px = s.x; s.py = s.y;
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.grace = Math.max(0, (s.grace || 0) - dt);
      s.trail = s.trail || [];
      s.trail.push({ x: s.x, y: s.y });
      if (s.trail.length > (s.wep === "needle" ? 12 : 8)) s.trail.shift();
      const wallHit = (s.foe || !s.lob) ? firstWallOnSeg(s.px || s.x, s.py || s.y, s.x, s.y) : null;
      if (!wallHit) s.air = true;
      if (wallHit && (s.air || (s.grace || 0) <= 0)) {
        if (!s.foe && ((s.owner && s.owner.reflect > 0) || s.echo) && !s.bounced) {
          s.vx *= -1; s.vy *= -1; s.bounced = true; s.x = (s.px || s.x); s.y = (s.py || s.y);
        } else {
          s.x = wallHit.x; s.y = wallHit.y;
          smashItem(s);
          G.fx.push({ x: s.x, y: s.y, life: 0.16, kind: "hit", wep: wepKey(s) });
          s.life = 0; return;
        }
      }
      if (s.foe) {
        liveP.forEach((p) => {
          if (p.veil > 0) return;
          if (Math.hypot(p.x - s.x, p.y - s.y) > 0.7 && firstWallOnSeg(s.px || s.x, s.py || s.y, p.x, p.y)) return;
          if (distSeg(p.x, p.y, s.px || s.x, s.py || s.y, s.x, s.y) < 0.46) {
            p.hp -= Math.max(3, s.dmg - p.hero.armor - (p.iron || 0));
            G.fx.push({ x: s.x, y: s.y, life: 0.18, kind: "hit", wep: wepKey(s) });
            s.life = 0;
          }
        });
      } else {
        lv.gens.forEach((g) => {
          if (s.life <= 0) return;
          if (distSeg(g.x + 0.5, g.y + 0.5, s.px || s.x, s.py || s.y, s.x, s.y) <= 0.78) {
            g.hp -= 1; G.score += 5; lv.quiet = 0; beep("hit");
            G.fx.push({ x: s.x, y: s.y, life: 0.2, kind: "hit", wep: wepKey(s) });
            if (s.pierce > 0) s.pierce--; else s.life = 0;
          }
        });
        if (s.life > 0) {
          lv.foes.forEach((f) => {
            if (s.life <= 0) return;
            if (distSeg(f.x, f.y, s.px || s.x, s.py || s.y, s.x, s.y) < ((FOE[f.kind] && FOE[f.kind].boss) ? 0.9 : 0.66)) {
              hitFoe(f, s.dmg, false); beep("hit");
              G.fx.push({ x: s.x, y: s.y, life: 0.22, kind: "hit", wep: wepKey(s) });
              if (s.flame) G.fx.push({ x: f.x, y: f.y, life: s.flame, kind: "cinder", dmg: Math.max(2, s.dmg - 1) });
              if (s.pierce > 0) s.pierce--; else s.life = 0;
            }
          });
        }
        if (s.life > 0) smashItem(s);
      }
      if (s.life <= 0 && s.flame) G.fx.push({ x: s.x, y: s.y, life: s.flame, kind: "cinder", dmg: Math.max(2, s.dmg - 1) });
    });
    G.shots = G.shots.filter((s) => s.life > 0);
    G.fx.forEach((f) => {
      if (f.kind !== "cinder") return;
      lv.foes.forEach((foe) => {
        if (Math.hypot(foe.x - f.x, foe.y - f.y) < 0.55) hitFoe(foe, (f.dmg || 2) * dt * 3.5, false);
      });
    });
    G.fx = G.fx.filter((f) => { f.life -= dt; return f.life > 0; });
    pollJoin();
    G._hudT = (G._hudT || 0) + dt;
    if (G._hudT > 0.1) { G._hudT = 0; paintHud(); }
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
      const smash = (PICK[it.kind] && PICK[it.kind].smash) || (it.kind === "flask" ? "flask" : (it.kind === "vial" ? "vial" : null));
      if (smash === "flask") { say("Shot the flask."); return false; }
      if (smash === "poison") { say("Blight bursts."); return false; }
      if (smash === "vial") {
        G.level.foes.forEach((f) => { if (Math.hypot(f.x - it.x, f.y - it.y) < 6) f.hp -= 12; });
        say("Floor vial bursts.");
        return false;
      }
      if (smash === "bomb") {
        blastFoes(it.x + 0.5, it.y + 0.5, 5.5, 10);
        say("Shot the charge.");
        return false;
      }
      return true;
    });
  }

  function unlockSeal() {
    const lv = G.level;
    if (!lv.seal) return;
    for (let y = 0; y < lv.H; y++) for (let x = 0; x < lv.W; x++) {
      if (lv.tiles[y][x] === "exit_lock") lv.tiles[y][x] = "exit";
    }
    lv.seal = false;
    say("The seal cracks. The exit wakes.");
    if (G.mode === "campaign" && lv.index != null) {
      const gift = SEAL_GIFT[(lv.index / 3) | 0];
      if (gift) {
        G.players.forEach((p) => {
          if (p.dead) return;
          if (WEAPONS[gift]) giveWep(p, gift);
          else if (gift === "core") { p.cores++; say("Seal core."); }
          else if (gift === "phial") { p.vials += 2; say("Seal phial."); }
          else if (gift === "iron") { p.iron++; say("Seal iron."); }
        });
      }
      const recruit = ["lyra", "arkos", "d9ra", "srath", "kairos", "justicae", "seidon", "sancora"][(lv.index / 3) | 0];
      if (recruit && persist.unlocked.indexOf(recruit) < 0) {
        persist.unlocked.push(recruit);
        savePersist();
        const rh = heroOf(recruit);
        say(rh.name + " the " + rh.tag + " joins the roster.");
      }
    }
  }

  function winCampaign() {
    G.over = true;
    persist.runs++;
    persist.best = Math.max(persist.best, G.score);
    persist.campaignBest = Math.max(persist.campaignBest || 0, G.score);
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
      "<p class='kicker'>The lock opens</p><h2>First Descent complete</h2>" +
      "<p class='lore'>Four names held the door. Score " + G.score + " · hall " + posted + " · credits " + G.credits + ".</p>" +
      "<p class='lore'>The crypt still goes down. Endless does not keep a last floor.</p>" +
      "<div class='modes'><button class='btn gold' id='toEndless'>Enter endless</button><button class='btn' id='mm'>Menu</button></div>"
    );
    $("toEndless").onclick = () => newRun({ hero: persist.hero, mode: "endless" });
    $("mm").onclick = menu;
  }

  function nextFloor() {
    if (G.mode === "survive") return;
    G.score += 80 + G.players.filter((p) => !p.dead).reduce((n, p) => n + Math.min(40, (p.hp / 20) | 0), 0);
    if (G.mode === "campaign" && window.LatticeCampaign && G.floor + 1 >= window.LatticeCampaign.LEN) {
      say("Floor " + (G.floor + 1) + " sealed.");
      winCampaign();
      return;
    }
    say("Floor " + (G.floor + 1) + " sealed.");
    loadFloor(G.floor + 1);
  }

  function credit() {
    if (!G || G.over) return;
    const down = G.players.find((p) => p.dead);
    if (!down) {
      if (G.players.length < 4) {
        const used = G.players.map((p) => p.hero.id);
        const pool = HEROES.filter((h) => (persist.unlocked || ["kael"]).indexOf(h.id) >= 0);
        const next = pool.find((h) => !used.includes(h.id)) || pool[G.players.length % pool.length];
        const p = joinHero(next.id);
        if (!p) return;
        const st = G.level.start;
        p.x = st.x + 0.5; p.y = st.y + 0.5;
        G.credits++;
        say(p.hero.name + " joins the lattice.");
      }
      return;
    }
    down.dead = false; down.hp = down.max; G.credits++;
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
    const bb = lv.box || { x0: 1, y0: 1, x1: lv.W - 2, y1: lv.H - 2 };
    const pad = TILE * 2.4;
    const minX = bb.x0 * TILE - pad, maxX = (bb.x1 + 1) * TILE + pad - w;
    const minY = bb.y0 * TILE - pad, maxY = (bb.y1 + 1) * TILE + pad - h;
    let tx = focus.x * TILE - w / 2, ty = focus.y * TILE - h / 2;
    if (maxX < minX) tx = ((bb.x0 + bb.x1 + 1) * TILE - w) / 2;
    else tx = Math.max(minX, Math.min(maxX, tx));
    if (maxY < minY) ty = ((bb.y0 + bb.y1 + 1) * TILE - h) / 2;
    else ty = Math.max(minY, Math.min(maxY, ty));
    cam.x += (tx - cam.x) * 0.42;
    cam.y += (ty - cam.y) * 0.42;
    const z = lv.realm.id || "stone";
    const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
    const y0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
    const x1 = Math.min(lv.W, Math.ceil((cam.x + w) / TILE) + 2);
    const y1 = Math.min(lv.H, Math.ceil((cam.y + h) / TILE) + 2);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const px = x * TILE - cam.x, py = y * TILE - cam.y;
      const t = lv.tiles[y][x];
      if (t === "wall") {
        const N = !solidAt(lv, x, y - 1), S = !solidAt(lv, x, y + 1);
        const E = !solidAt(lv, x + 1, y), W = !solidAt(lv, x - 1, y);
        if (!N && !S && !E && !W) {
          drawTile("void", px, py);
          continue;
        }
        drawTile(z + "_top", px, py);
        if (S) drawTile(z + "_face", px, py);
      } else {
        drawTile(floorName(z, x, y), px, py);
        if (t === "door") drawSpr("door", px, py);
        if (t === "door_open") drawSpr("door_open", px, py);
        if (t === "exit") drawSpr("exit", px, py);
        if (t === "exit_lock") { ctx.globalAlpha = 0.32; drawSpr("exit", px, py); ctx.globalAlpha = 1; }
        if (t === "pad") drawSpr("pad", px, py);
      }
    }
    lv.gens.forEach((g) => {
      const pulse = 0.78 + 0.22 * Math.sin((G.t + g.x) * 7);
      ctx.globalAlpha = pulse;
      drawSpr("gen_" + g.kind + "_" + g.rank, g.x * TILE + TILE / 2 - 16 - cam.x, g.y * TILE + TILE / 2 - 16 - cam.y);
      ctx.globalAlpha = 1;
    });
    lv.items.forEach((it) => {
      const ipx = it.x * TILE - cam.x, ipy = it.y * TILE - cam.y;
      if (ipx < -48 || ipy < -48 || ipx > w + 48 || ipy > h + 48) return;
      if (it.hidden) {
        const near = live.some((p) => Math.hypot(p.x - (it.x + 0.5), p.y - (it.y + 0.5)) < 0.85);
        if (!near) return;
      }
      drawItem(it);
    });
    lv.foes.forEach((f) => {
      const fpx = f.x * TILE - cam.x, fpy = f.y * TILE - cam.y;
      if (fpx < -72 || fpy < -72 || fpx > w + 72 || fpy > h + 72) return;
      const hid = shadeHidden(f);
      const rate = f.kind === "drain" || f.kind === "wraith" || f.kind === "unnamer" ? 5 : 8;
      const fr = ((f.t * rate) | 0) % 4;
      ctx.globalAlpha = f.hurt > 0 ? 0.6 : (hid ? 0.32 : (f.stun > 0 ? 0.7 : 1));
      const boss = FOE[f.kind] && FOE[f.kind].boss;
      const sz = boss ? 64 : 48;
      const dx = f.x * TILE - sz / 2 - cam.x, dy = f.y * TILE - sz / 2 - cam.y;
      drawFoeSpr("foe_" + f.kind + "_" + fr, dx, dy, sz);
      if (f.rank >= 3 && !boss && G.mode !== "survive") {
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(dx) + 2, Math.round(dy) + 2, sz - 4, sz - 4);
      }
      if (boss) {
        const bx = Math.round(f.x * TILE - 22 - cam.x), by = Math.round(dy - 7);
        ctx.fillStyle = "#111";
        ctx.fillRect(bx, by, 44, 5);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(bx, by, 44 * Math.max(0, f.hp / f.max), 5);
        ctx.strokeStyle = "#fbbf24";
        ctx.strokeRect(bx, by, 44, 5);
      }
      ctx.globalAlpha = 1;
    });
    G.shots.forEach((s) => drawShot(s));
    G.fx.forEach((f) => drawVfx(f));
    G.players.forEach((p) => {
      if (p.dead) return;
      ctx.globalAlpha = p.veil > 0 ? 0.45 : 1;
      if (p.reflect > 0) {
        ctx.strokeStyle = "#93c5fd";
        ctx.beginPath();
        ctx.arc(p.x * TILE - cam.x, p.y * TILE - cam.y, 16, 0, 6.28);
        ctx.stroke();
      }
      drawHeroSpr(p, cam.x, cam.y);
      if (p.aegis > 0) {
        ctx.strokeStyle = "rgba(34,211,238,0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x * TILE - cam.x, p.y * TILE - cam.y, 20, 0, 6.28);
        ctx.stroke();
      }
      if (p.fury > 0) {
        ctx.strokeStyle = "rgba(239,68,68,0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x * TILE - cam.x, p.y * TILE - cam.y, 17, G.t * 6, G.t * 6 + 4.2);
        ctx.stroke();
      }
      if (p.thorns > 0) {
        ctx.strokeStyle = "rgba(74,222,128,0.5)";
        ctx.beginPath();
        ctx.arc(p.x * TILE - cam.x, p.y * TILE - cam.y, 15, -G.t * 5, -G.t * 5 + 3.5);
        ctx.stroke();
      }
      if (p.regen > 0 && ((G.t * 8) | 0) % 2) {
        ctx.fillStyle = "rgba(74,222,128,0.45)";
        ctx.beginPath();
        ctx.arc(p.x * TILE - cam.x, p.y * TILE - 18 - cam.y, 3, 0, 6.28);
        ctx.fill();
      }
      const lvA = wepLv(p, "aura");
      if (lvA) {
        const rad = (1.18 + lvA * 0.2) * TILE;
        ctx.strokeStyle = "rgba(74,222,128," + (0.3 + 0.14 * Math.sin(G.t * 6)) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x * TILE - cam.x, p.y * TILE - cam.y, rad, 0, 6.28);
        ctx.stroke();
      }
      if (p.orbit) {
        p.orbit.forEach((o) => {
          const ox = p.x + Math.cos(o.ang) * o.r, oy = p.y + Math.sin(o.ang) * o.r;
          const sx = ox * TILE - cam.x, sy = oy * TILE - cam.y;
          ctx.fillStyle = "#e2e8f0";
          ctx.beginPath();
          ctx.arc(sx, sy, 5, 0, 6.28);
          ctx.fill();
          ctx.strokeStyle = "#f87171";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx - 8, sy);
          ctx.lineTo(sx + 8, sy);
          ctx.stroke();
        });
      }
      if (p.halo) {
        p.halo.forEach((h) => {
          const hx = p.x + Math.cos(h.ang) * h.r, hy = p.y + Math.sin(h.ang) * h.r;
          const sx = hx * TILE - cam.x, sy = hy * TILE - cam.y;
          ctx.fillStyle = "rgba(253,224,71,0.28)";
          ctx.beginPath();
          ctx.arc(sx, sy, 12, 0, 6.28);
          ctx.fill();
          drawFxSpr("bolt_halo_" + ((G.t * 10 | 0) % 4), sx - 14, sy - 14, 28);
        });
      }
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
    if (p.fury > 0) s += " · FURY";
    if (p.thorns > 0) s += " · THORN";
    if (p.echo > 0) s += " · ECHO";
    if (p.regen > 0) s += " · MEND";
    return s;
  }

  function paintHud() {
    if (!G) return;
    const autoOn = persist.autoShot || G.surviveAuto;
    $("hudMeta").innerHTML = "<span>Score <b>" + G.score + "</b></span><span>" +
      (G.mode === "survive" ? "Survive <b>W" + surviveWave() + "</b> · lv " + G.lvl : ((G.mode === "campaign" ? "Campaign" : "Endless") + " <b>" + (G.floor + 1) + (G.mode === "campaign" && window.LatticeCampaign ? "/" + window.LatticeCampaign.LEN : "") + "</b>")) +
      "</span><span>Credits <b>" + G.credits + "</b></span>";
    if (G.mode !== "survive") {
      $("pips").innerHTML = G.players.map((p) =>
        "<div class='pip'><div class='nm' style='color:" + p.hero.color + "'>" + p.hero.name + " · " + (p.hero.special || p.hero.tag) + (p.dead ? " · DOWN" : "") + "</div>" +
        "<div class='bar'><i style='width:" + Math.max(0, Math.min(100, 100 * p.hp / Math.max(1, p.max))) + "%;background:" + p.hero.color + "'></i></div>" +
        "<div class='st'>HP " + Math.max(0, p.hp | 0) + "/" + (p.max | 0) + " · " + (WEAPONS[p.weapon] ? WEAPONS[p.weapon].name : "Shard") +
        (p.cores ? " · CORE" + p.cores : "") + (p.iron ? " · IRN" + p.iron : "") +
        " · " + (p.arsenal || []).map((id) => {
          const n = (WEAPONS[id] && WEAPONS[id].name) || id;
          const lv = wepLv(p, id);
          return n.slice(0, 3) + (lv > 1 ? lv : "");
        }).join("/") +
        " · keys " + p.keys + " · vials " + p.vials + buffs(p) + "</div></div>"
      ).join("");
    }
    $("dockStatus").textContent = G.players.some((p) => p.dead) ? "Space / Start — credit in" : (G.mode === "survive" ? (autoOn ? "AUTO · survive · stack" : "Fire · vial · survive") : (autoOn ? "AUTO shot · vial · exit" : "Fire · vial · smash nexuses · find the exit"));
    const autoBtn = $("btnAuto");
    if (autoBtn) autoBtn.textContent = autoOn ? "Auto shot ON" : "Auto shot";
    if ($("holeCard")) {
      $("holeCard").innerHTML = "<p><b>" + G.level.realm.name + "</b>" + (G.level.layout ? " · " + G.level.layout : " floor " + (G.floor + 1)) + "</p>" +
        (G.mode === "survive" ? "<p class='lore'>Wave " + surviveWave() + " · " + (G.t | 0) + "s · kills " + (G.kills || 0) + " · XP " + G.xp + "/" + surviveXpNeed(G.lvl) + "</p><div class='bar'><i style='width:" + Math.max(0, Math.min(100, 100 * G.xp / surviveXpNeed(G.lvl))) + "%;background:#fbbf24'></i></div>" : "") +
        "<p class='lore'>" + (G.level.lore || ("Seed " + G.seed + " · " + (G.level.layout || "rooms"))) + (G.level.treasure > 0 ? " · rush " + G.level.treasure.toFixed(0) + "s" : "") + (G.level.seal ? " · SEAL" : "") + "</p>";
    }
    if (G.mode === "survive") paintStudioHud();
  }
  function paintStudioHud() {
    const w = surviveWave();
    const need = surviveXpNeed(G.lvl);
    const t = G.t | 0;
    const mm = (t / 60) | 0, ss = t % 60;
    const waveLeft = Math.max(0, 28 - (G.t % 28));
    if ($("hudWave")) $("hudWave").textContent = w;
    if ($("hudScore")) $("hudScore").textContent = G.score;
    if ($("hudXpFill")) $("hudXpFill").style.width = Math.max(0, Math.min(100, 100 * G.xp / need)) + "%";
    if ($("hudXpLab")) $("hudXpLab").textContent = "LV " + G.lvl + "  ·  " + G.xp + "/" + need;
    if ($("hudClock")) $("hudClock").textContent = mm + ":" + (ss < 10 ? "0" : "") + ss + "  ·  next wave " + waveLeft.toFixed(0) + "s";
    if ($("hudKills")) $("hudKills").textContent = "KILLS " + (G.kills || 0) + "  ·  HORDE " + G.level.foes.length + "/" + surviveCap(w);
    const p0 = G.players[0];
    if ($("hudPlayers")) {
      $("hudPlayers").innerHTML = G.players.map((p) => {
        const hp = Math.max(0, Math.min(100, 100 * p.hp / Math.max(1, p.max)));
        return "<div class='hud-ward'><div class='nm' style='color:" + p.hero.color + "'>" + p.hero.name + (p.dead ? " · DOWN" : "") + "</div>" +
          "<div class='hud-hp'><i style='width:" + hp + "%;background:" + p.hero.color + "'></i></div>" +
          "<div class='hud-meta-row'>HP " + Math.max(0, p.hp | 0) + "/" + (p.max | 0) +
          " · vials " + p.vials + " · keys " + p.keys +
          "<span class='hud-buffs'>" + buffs(p) + "</span></div></div>";
      }).join("");
    }
    if ($("hudArms") && p0) {
      $("hudArms").innerHTML = (p0.arsenal || []).map((id) => {
        const n = (WEAPONS[id] && WEAPONS[id].name) || id;
        const lv = wepLv(p0, id);
        return "<span class='chip'>" + n + (lv > 1 ? "<i> " + lv + "</i>" : "") + "</span>";
      }).join("");
    }
    if ($("hudStats") && p0) {
      const pills = [];
      if (p0.might) pills.push("MIGHT " + p0.might);
      if (p0.haste) pills.push("HASTE " + p0.haste);
      if (p0.iron) pills.push("IRON " + p0.iron);
      if (p0.cores) pills.push("CORE " + p0.cores);
      if (p0.stride) pills.push("STRIDE " + p0.stride);
      if (p0.pierce) pills.push("PIERCE " + p0.pierce);
      if (p0.extraCap) pills.push("VOLLEY " + p0.extraCap);
      if (p0.magnet) pills.push("PULL");
      if (p0.vialPow) pills.push("RES " + p0.vialPow);
      $("hudStats").innerHTML = pills.map((t) => "<span class='pill'>" + t + "</span>").join("");
    }
  }
  function paintUI() { if (G) paintHud(); }

  function showSheet(html, studio) {
    const o = $("overlay");
    o.className = "overlay" + (studio ? " studio" : "");
    o.innerHTML = studio ? html : "<div class='sheet'>" + html + "</div>";
    overlayMode = studio ? "menu" : "sheet";
  }
  function hideOverlay() {
    $("overlay").className = "overlay hidden";
    $("overlay").onclick = null;
    overlayMode = null;
  }

  function attrBar(n, max) {
    const v = Math.max(0, Math.min(100, 100 * n / max));
    return "<span class='stat'><i style='width:" + v + "%'></i></span>";
  }
  function heroSheet(h) {
    return "<div class='dossier' id='heroLore'><b>" + h.name + "</b> · " + h.tag + " · <em>" + h.special + "</em>" +
      "<p class='spec'>" + h.spec + "</p><p>" + h.bio + "</p>" +
      "<dl>" +
      "<dt>Shot</dt><dd>" + attrBar(h.shot, 5) + h.shot + "</dd>" +
      "<dt>Speed</dt><dd>" + attrBar(h.speed, 5) + h.speed + "</dd>" +
      "<dt>Magic</dt><dd>" + attrBar(h.magic, 5) + h.magic + "</dd>" +
      "<dt>Armor</dt><dd>" + attrBar(h.armor, 6) + h.armor + "</dd>" +
      "<dt>Melee</dt><dd>" + attrBar(h.melee, 7) + h.melee + "</dd>" +
      "<dt>Brave</dt><dd>" + attrBar(h.brave, 100) + h.brave + "</dd>" +
      "<dt>Faith</dt><dd>" + attrBar(h.faith, 100) + h.faith + "</dd>" +
      "</dl></div>";
  }
  function menu() {
    overlayMode = "menu";
    if (G) G.over = true;
    $("app").classList.add("hidden");
    $("app").classList.remove("survive-mode");
    const sh = $("studioHud");
    if (sh) sh.classList.add("hidden");
    showSheet(
      "<div class='title-screen'><div class='title-art'><img src='./assets/menu.jpg' alt='Lattice Crypt'><div class='title-art-fade'></div></div>" +
      "<div class='title-panel'><p class='kicker'>Δ9Φ963 · chatagent.ca</p><h1>LATTICE CRYPT</h1>" +
      "<p class='lore'>The crypt is a lock. Four wardens are the teeth. The Architect remembers why it was cut. Smash nexuses. Don't shoot the flask.</p>" +
      "<label>Callsign</label><input class='name' id='nm' maxlength='18' value='" + String(persist.name).replace(/[<>]/g, "") + "'>" +
      "<p class='kicker' style='margin-top:.7rem'>Roster — jobs of the Accord</p><div class='cast-grid roster'>" +
      HEROES.map((x) => {
        const open = (persist.unlocked || []).indexOf(x.id) >= 0 || x.unlock === 0;
        return "<button type='button' class='cast" + (x.id === persist.hero ? " on" : "") + (open ? "" : " locked") + "' data-h='" + x.id + "' data-open='" + (open ? "1" : "0") + "'>" +
          "<img src='" + ASSET + x.file + "' alt='" + x.name + "'><b>" + x.name + "</b><span>" + x.tag + "</span><span class='spec-tag'>" + x.special + "</span>" + (open ? "" : "<i>Seal " + x.unlock + "</i>") + "</button>";
      }).join("") +
      "</div>" + heroSheet(heroOf(persist.hero)) +
      "<label class='auto-lab'><input type='checkbox' id='autoBox'" + (persist.autoShot ? " checked" : "") + "> Auto-shoot — always fire</label>" +
      "<div class='mode-grid'>" +
      "<button type='button' class='mode-card' data-go='campaign'><b>Campaign</b><span>First Descent. 24 authored floors, eight seals, rising heat.</span></button>" +
      "<button type='button' class='mode-card' data-go='endless'><b>Endless</b><span>No last floor. Rank climbs. The hall wants score.</span></button>" +
      "<button type='button' class='mode-card' data-go='survive'><b>Survival</b><span>A continent of stone. Brotato-scale hordes. Stack arms or drown. Bosses every five waves. Hall score.</span></button>" +
      "<button type='button' class='mode-card' data-go='coop'><b>Cabinet co-op</b><span>Campaign with a second warden. Pads and keyboards, up to four.</span></button>" +
      "</div><div class='modes' style='margin-top:.6rem'><button class='btn' id='menuRadio'>Play radio</button>" +
      "<a class='btn ghost' href='/games/'>All games</a></div>" +
      "<div class='donate-row'><a class='donate-paypal' href='https://www.paypal.com/paypalme/ExcavationPro' target='_blank' rel='noopener'>PayPal.me/ExcavationPro</a>" +
      "<a class='donate-patreon' href='https://www.patreon.com/Excavationpro' target='_blank' rel='noopener'>Patreon</a></div>" +
      "<p class='lore' style='margin-top:.6rem'>Best " + persist.best + " · Survive " + (persist.surviveBest || 0) + " · Descent " + (persist.campaignBest || 0) + " · Runs " + persist.runs + " · <a href='./whitepaper.html'>Whitepaper</a></p></div></div>",
      true
    );
    $("overlay").onclick = function (e) {
      const c = e.target.closest("[data-h]");
      if (c) {
        if (c.getAttribute("data-open") === "0") return;
        persist.hero = c.getAttribute("data-h"); savePersist();
        document.querySelectorAll(".cast").forEach((el) => el.classList.toggle("on", el.getAttribute("data-h") === persist.hero));
        const lore = $("heroLore");
        if (lore) lore.outerHTML = heroSheet(heroOf(persist.hero));
        return;
      }
      const b = e.target.closest("[data-go]");
      if (!b) return;
      persist.name = ($("nm").value || "Warden").slice(0, 18);
      persist.autoShot = !!($("autoBox") && $("autoBox").checked);
      savePersist();
      const go = b.getAttribute("data-go");
      newRun({ hero: persist.hero, mode: go === "survive" ? "survive" : (go === "endless" ? "endless" : "campaign"), coop: go === "coop" });
    };
    const mr = $("menuRadio");
    if (mr) mr.onclick = (e) => { e.stopPropagation(); const p = $("radioPlay"); if (p) p.click(); };
    const ab = $("autoBox");
    if (ab) ab.onclick = (e) => e.stopPropagation();
  }

  function help() {
    showSheet("<h2>How to play</h2><ol class='lore'>" +
      "<li>Health ticks down. Smash <b>nexuses</b> or the floor fills. Find the cyan exit.</li>" +
      "<li>P1 WASD · <b>J fire</b> · K/Shift vial. P2 arrows · ; fire · ' vial. P3 TFGH · R/Y. P4 numpad.</li>" +
      "<li>Pads: stick, A/RT fire, B/Y/LT vial, Start join. Survival upgrades: D-pad / stick to choose, A to take (1–3 or Enter on keyboard). Space / Enter credit a fallen warden.</li>" +
      "<li>Keys open doors. Don't shoot flasks. Vials clear a room — only they stop the Drain.</li>" +
      "<li>Campaign is 24 hand-built floors. Seals hide the exit until nexuses die. Endless never stops. Survival is a vast crypt (256×224): Brotato-scale hordes, stacking upgrades, bosses every five waves, hall score.</li>" +
      "<li>Every armed weapon fires at once and can stack. Q only changes focus. Cleave / Orbit / Aura are short-range auto melee. Relics bob and glow — rations, coins, fury, moss, bombs, tomes, and more. Chests can spill rare arms.</li>" +
      "<li>Each job has a named special on vial (K). Named guardians drop relics. Brave scales bump damage. Faith scales vial power.</li>" +
      "<li>Auto-shoot (menu or L) keeps firing. Help pauses.</li></ol>" +
      "<button class='btn gold' id='hk'>Close</button>");
    $("hk").onclick = () => { hideOverlay(); overlayMode = null; };
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (overlayMode !== "menu" && overlayMode !== "sheet") update(dt);
    else if (G && G._ups) pollUpgradePick();
    draw();
    requestAnimationFrame(loop);
  }

  window.addEventListener("keydown", (e) => {
    if (!keys[e.code]) keyEdge[e.code] = true;
    keys[e.code] = true;
    if (e.code === "Escape") {
      if (G && G._ups) return;
      menu();
      return;
    }
    if (overlayMode === "menu" || overlayMode === "sheet") return;
    if (PLAY_CODES.has(e.code)) e.preventDefault();
    if (e.code === "KeyL" && G) {
      G.surviveAuto = false;
      persist.autoShot = !persist.autoShot; savePersist(); paintHud();
      say(persist.autoShot ? "Auto-shoot on." : "Auto-shoot off.");
      return;
    }
    if ((e.code === "Space" || e.code === "Enter") && G) {
      if (e.code === "Space" && !G.players.some((p) => p.dead)) return;
      credit();
    }
  });
  window.addEventListener("keyup", (e) => { keys[e.code] = false; });
  window.addEventListener("blur", () => { keys = {}; keyEdge = {}; });

  function toggleAuto() {
    if (G) G.surviveAuto = false;
    persist.autoShot = !persist.autoShot; savePersist();
    if (G) { paintHud(); say(persist.autoShot ? "Auto-shoot on." : "Auto-shoot off."); }
  }
  $("btnHelp").onclick = () => { if (G && G._ups) return; help(); };
  $("btnMenu").onclick = () => { if (G && G._ups) return; menu(); };
  $("btnCredit").onclick = () => { if (G) credit(); };
  if ($("btnAuto")) $("btnAuto").onclick = toggleAuto;

  window.LatticeCrypt = {
    get: () => G,
    credit,
    fire: (i) => { if (G && G.players[i || 0]) fireArsenal(G.players[i || 0]); },
    nextFloor: () => { if (G) nextFloor(); }
  };

  async function boot() {
    loadPersist();
    try {
      const [img, meta] = await Promise.all([
        new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = ASSET + "sprites.png?v=9"; }),
        fetch(ASSET + "sprites.json").then((r) => r.json())
      ]);
      atlas = img; names = meta.names; cell = meta.cell; cols = meta.cols;
    } catch (_) {}
    try {
      const [cimg, cmeta] = await Promise.all([
        new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = ASSET + "creatures.png?v=1"; }),
        fetch(ASSET + "creatures.json").then((r) => r.json())
      ]);
      foeAtlas = cimg; foeNames = cmeta.names; foeCell = cmeta.cell; foeCols = cmeta.cols;
    } catch (_) {}
    try {
      const [himg, hmeta] = await Promise.all([
        new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = ASSET + "heroes.png?v=1"; }),
        fetch(ASSET + "heroes.json").then((r) => r.json())
      ]);
      heroAtlas = himg; heroNames = hmeta.names; heroCell = hmeta.cell; heroCols = hmeta.cols;
    } catch (_) {}
    try {
      const [timg, tmeta] = await Promise.all([
        new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = ASSET + "tiles.png?v=2"; }),
        fetch(ASSET + "tiles.json").then((r) => r.json())
      ]);
      tileAtlas = timg; tileNames = tmeta.names; tileCell = tmeta.cell; tileCols = tmeta.cols;
    } catch (_) {}
    try {
      const [fximg, fxmeta] = await Promise.all([
        new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = ASSET + "fx.png?v=1"; }),
        fetch(ASSET + "fx.json").then((r) => r.json())
      ]);
      fxAtlas = fximg; fxNames = fxmeta.names; fxCell = fxmeta.cell; fxCols = fxmeta.cols;
    } catch (_) {}
    try {
      const [iimg, imeta] = await Promise.all([
        new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = ASSET + "items.png?v=1"; }),
        fetch(ASSET + "items.json").then((r) => r.json())
      ]);
      itemAtlas = iimg; itemNames = imeta.names; itemCell = imeta.cell; itemCols = imeta.cols;
    } catch (_) {}
    $("boot").classList.add("hidden");
    if (window.ArcadeLedger) ArcadeLedger.boot();
    menu();
    requestAnimationFrame(loop);
  }
  boot();
})();
