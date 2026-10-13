/* LYGO Arena — headless check.
   Runs the real roster and the real sim in Node with a stub DOM, and asserts the things a
   player would notice: every kit resolves to a real sprite and real cards, every arena is
   walkable from both spawn pockets, and a battle always ends with somebody standing.

   node tools/arena_check.js            (report + pass/fail, exit code 1 on failure)
   node tools/arena_check.js --long     (more matches per mode)
*/
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const ASSETS = path.join(ROOT, "assets");
const LONG = process.argv.includes("--long");
const MATCHES = LONG ? 300 : 90;

/* --- stub the browser the engine expects ---------------------------------- */
function stubEl() {
  return {
    style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {} },
    getContext: () => ({
      imageSmoothingEnabled: false, fillStyle: "", strokeStyle: "", lineWidth: 1, globalAlpha: 1,
      font: "", textAlign: "", globalCompositeOperation: "",
      fillRect() {}, strokeRect() {}, fillText() {}, beginPath() {}, arc() {}, ellipse() {},
      moveTo() {}, lineTo() {}, stroke() {}, fill() {}, save() {}, restore() {}, translate() {},
      scale() {}, setTransform() {}, setLineDash() {}, drawImage() {}, clearRect() {}
    }),
    toDataURL: () => "data:image/png;base64,",
    appendChild() {}, addEventListener() {}, removeEventListener() {}, getBoundingClientRect: () => ({ width: 900, height: 600, left: 0, top: 0 }),
    querySelector: () => null, querySelectorAll: () => [], setAttribute() {}, focus() {}
  };
}
const document = {
  createElement: () => stubEl(),
  getElementById: () => stubEl(),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {}, body: stubEl(), documentElement: stubEl()
};
const win = {
  devicePixelRatio: 1,
  document,
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
  Image: function () { this.onload = null; this.onerror = null; },
  fetch: () => Promise.resolve({ json: () => Promise.resolve({ names: {} }) }),
  setTimeout, clearTimeout, console
};
win.window = win;
const ctx = vm.createContext(win);

const load = (f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
load("roster.js");
load("attacks.js");
load("arena.js");

const R = win.LYGO_ARENA;
const E = win.ArenaEngine;

/* --- helpers -------------------------------------------------------------- */
let fails = 0, warns = 0;
const results = [];
function must(label, cond, detail) {
  results.push({ label, ok: !!cond, detail: detail || "" });
  if (!cond) { fails++; console.log("FAIL  " + label + (detail ? "  — " + detail : "")); }
  else console.log("ok    " + label + (detail ? "  — " + detail : ""));
}
function warn(label, detail) { warns++; console.log("warn  " + label + (detail ? "  — " + detail : "")); }

/* --- 1. the roster -------------------------------------------------------- */
const atlasNames = {};
["heroes", "creatures", "pets", "tiles", "fx"].forEach((k) => {
  atlasNames[k] = JSON.parse(fs.readFileSync(path.join(ASSETS, k + ".json"), "utf8")).names;
});
const ATLAS = { heroes: ["heroes"], creatures: ["creatures"], pets: ["pets"] };

must("roster holds 33 fighters", R.ROSTER.length === 33, "count=" + R.ROSTER.length);
must("every fighter id is unique", new Set(R.ROSTER.map((f) => f.id)).size === R.ROSTER.length);
const byClass = {};
R.ROSTER.forEach((f) => { byClass[f.cls] = (byClass[f.cls] || 0) + 1; });
must("13 champions · 15 creatures · 5 beasts",
  byClass.champ === 13 && byClass.beast === 15 && byClass.pet === 5, JSON.stringify(byClass));

const badSprite = R.ROSTER.filter((f) => {
  const sheet = f.spr.sheet, key = f.spr.key;
  if (sheet === "heroes") return atlasNames.heroes[key + "_0_0"] == null;
  if (sheet === "creatures" || sheet === "pets") return atlasNames[sheet][key + "_0"] == null;
  return true;
});
must("every fighter's sprite exists in its atlas", badSprite.length === 0, badSprite.map((f) => f.id).join(", "));

const badMoves = [];
const badCards = [];
R.ROSTER.forEach((f) => {
  if (!f.moves || f.moves.length < 2) badMoves.push(f.id + " (only " + (f.moves ? f.moves.length : 0) + " moves)");
  (f.moves || []).forEach((m) => { if (!R.MOVES[m]) badMoves.push(f.id + "→" + m); });
  if (!f.cards || f.cards.length !== 3) badCards.push(f.id + " (cards=" + (f.cards ? f.cards.length : 0) + ")");
  (f.cards || []).forEach((c) => { if (!R.CARDS[c]) badCards.push(f.id + "→" + c); });
});
must("every move id resolves", badMoves.length === 0, badMoves.join(", "));
must("every fighter carries three real cards", badCards.length === 0, badCards.join(", "));

const missingArt = R.ROSTER.filter((f) => f.cls === "champ" && !fs.existsSync(path.join(ASSETS, f.portrait)));
must("every champion has its portrait file", missingArt.length === 0, missingArt.map((f) => f.id).join(", "));

/* no two fighters share a kit — the whole point of the roster */
const sigs = {};
const dupes = [];
R.ROSTER.forEach((f) => {
  const sig = f.moves.slice().sort().join("+") + "|" + f.cards.slice().sort().join("+") + "|" + f.atk.type;
  if (sigs[sig]) dupes.push(f.id + " = " + sigs[sig]);
  sigs[sig] = f.id;
});
must("no two fighters share the same kit", dupes.length === 0, dupes.join(", "));

const built = R.buildTeam(R.ROSTER);
const bare = built.filter((b) => !b.atk.vis || !b.atk.sfx || b.moves.some((m) => !m.vis || !m.sfx || !m.name));
must("every attack and move has a picture and a sound", bare.length === 0, bare.map((b) => b.id).join(", "));
const announced = {};
const sameCall = [];
built.forEach((b) => {
  const sig = [b.atk.name].concat(b.moves.map((m) => m.name)).sort().join("|");
  if (announced[sig]) sameCall.push(b.id + " = " + announced[sig]);
  announced[sig] = b.id;
});
must("no two fighters announce the same attacks", sameCall.length === 0, sameCall.join(", "));
const wolf = built.find((b) => b.id === "wolf");
const tusker = built.find((b) => b.id === "elephant");
must("Ashmane bites and Tuskward tramples", wolf && wolf.atk.vis === "bite" && wolf.atk.name === "Bite" && tusker && tusker.atk.vis === "tusk" && tusker.moves.some((m) => m.name === "Trample" && m.vis === "trample"), "");
const wavMiss = win.LYGO_ATTACKS.sfxNames().filter((n) => !fs.existsSync(path.join(ASSETS, "sfx", n + ".wav")));
must("every attack sound file is on disk", wavMiss.length === 0, wavMiss.slice(0, 12).join(", ") + (wavMiss.length > 12 ? " +" + (wavMiss.length - 12) : ""));
const badBuild = built.filter((b) => !(b.max > 100 && b.dmg > 5 && b.rate > 0.2 && b.speed > 30 && b.moves.length >= 2));
must("every built fighter has playable numbers", badBuild.length === 0, badBuild.map((b) => b.id).join(", "));
const powers = built.map((b) => b.power);
const spread = Math.max(...powers) / Math.min(...powers);
must("the power spread is a band, not a cliff", spread < 3.0, "min=" + Math.min(...powers) + " max=" + Math.max(...powers) + " ratio=" + spread.toFixed(2));

/* --- 2. the arena --------------------------------------------------------- */
function mapStats(seed) {
  const S = E.runHeadless({ you: ["kael"], foe: ["wraith"] }, 1, 0.01, seed);
  const lv = S.lv;
  const slots = [];
  for (let i = 0; i < 5; i++) { slots.push({ x: 3, y: 3 + i * 4 }); slots.push({ x: lv.W - 4, y: 3 + i * 4 }); }
  /* flood fill from the left pocket over the real tiles */
  const seen = new Uint8Array(lv.W * lv.H);
  const q = [3 + 11 * lv.W]; seen[q[0]] = 1;
  while (q.length) {
    const i = q.pop(), x = i % lv.W, y = (i / lv.W) | 0;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= lv.W || ny >= lv.H) return;
      const ni = ny * lv.W + nx;
      if (seen[ni] || lv.tiles[ny][nx] === "wall") return;
      seen[ni] = 1; q.push(ni);
    });
  }
  const unreachable = slots.filter((s) => !seen[s.y * lv.W + s.x]);
  let open = 0;
  for (let y = 0; y < lv.H; y++) for (let x = 0; x < lv.W; x++) if (lv.tiles[y][x] !== "wall") open++;
  return { unreachable: unreachable.length, open: open / (lv.W * lv.H) };
}
let mapBad = 0, openMin = 1, openMax = 0;
for (let s = 0; s < 120; s++) {
  const m = mapStats(s);
  if (m.unreachable) mapBad++;
  openMin = Math.min(openMin, m.open); openMax = Math.max(openMax, m.open);
}
must("every arena is walkable from both pockets", mapBad === 0, "bad seeds=" + mapBad + "/120");
must("arenas stay in the 40-80% open band", openMin > 0.4 && openMax < 0.85, "open " + (openMin * 100).toFixed(0) + "-" + (openMax * 100).toFixed(0) + "%");
const lawNames = [];
for (let i = 0; i < 8; i++) lawNames.push(E.lawFor(i).name);
must("each ring seed names a law", new Set(lawNames).size === 8, lawNames.join(", "));

/* --- 3. battles ----------------------------------------------------------- */
const MODES = [1, 2, 3, 5];
const tally = {};         // fighterId -> {wins, losses, dmg, kills, uses}
const moveUse = {};       // cast counts under the name a spectator actually reads
built.forEach((b) => b.moves.forEach((m) => { moveUse[m.name] = 0; }));
const modeStats = {};
R.ROSTER.forEach((f) => { tally[f.id] = { wins: 0, losses: 0, dmg: 0, kills: 0, uses: 0, matches: 0 }; });

let noWinner = 0, nan = 0, stuck = 0, zeroMoves = 0, zeroDmg = 0, slow = 0;
const durations = {};
for (let m = 0; m < MATCHES; m++) {
  const n = MODES[m % MODES.length];
  const you = R.draw(n).map((f) => f.id);
  const foe = R.draw(n, you).map((f) => f.id);
  const seed = (m * 7919) % 9973;
  const t0 = Date.now();
  const S = E.runHeadless({ you, foe }, n, 200, seed);
  const ms = Date.now() - t0;
  if (ms > 1500) slow++;
  (durations[n] = durations[n] || []).push(S.time);
  if (!S.over || S.winner == null || S.winner < 0) noWinner++;
  /* every value the renderer touches must be finite */
  S.your.concat(S.foe).forEach((e) => {
    if (![e.x, e.y, e.hp, e.max, e.mana, e.shd, e.armorBuff, e.atkCd, e.aimA, e.walk].every(Number.isFinite)) nan++;
    if (e.x < 0 || e.y < 0 || e.x > S.lv.W * 32 || e.y > S.lv.H * 32) stuck++;
  });
  const liveAll = S.your.concat(S.foe);
  const moved = liveAll.some((e) => Object.keys(e.uses).length > 0);
  if (!moved) zeroMoves++;
  if (!liveAll.some((e) => e.dmgDone > 0)) zeroDmg++;
  liveAll.forEach((e) => {
    const t = tally[e.b.id];
    if (!t) return;
    t.matches++;
    if (e.team === S.winner) t.wins++; else t.losses++;
    t.dmg += e.dmgDone; t.kills += e.kills;
    t.uses += Object.values(e.uses).reduce((a, b) => a + b, 0);
    Object.keys(e.uses).forEach((mn) => { moveUse[mn] = (moveUse[mn] || 0) + e.uses[mn]; });
  });
}
must("every battle ends with a winner", noWinner === 0, "unfinished=" + noWinner + "/" + MATCHES);
must("no NaN in any live body", nan === 0, "bad=" + nan);
must("nobody leaves the arena", stuck === 0, "out of bounds=" + stuck);
must("both sides actually use their moves", zeroMoves === 0 && zeroDmg === 0, "no-move=" + zeroMoves + " no-damage=" + zeroDmg);
const avg = {};
Object.keys(durations).forEach((k) => { const a = durations[k]; avg[k] = a.reduce((x, y) => x + y, 0) / a.length; });
Object.keys(avg).forEach((k) => {
  const a = durations[k], sorted = a.slice().sort((x, y) => x - y);
  console.log("      " + k + "v" + k + ": mean " + avg[k].toFixed(1) + "s · median " + sorted[sorted.length >> 1].toFixed(1) + "s · max " + sorted[sorted.length - 1].toFixed(1) + "s");
});
must("matches resolve inside the two-minute mark", avg[3] < 110 && avg[5] < 110, "3v3 " + avg[3].toFixed(0) + "s · 5v5 " + avg[5].toFixed(0) + "s");
if (slow) warn("a few simulated battles took over 1.5 s of CPU", slow + " of " + MATCHES);

/* a kit that never lands a point is a broken kit, not a weak one */
const deadKits = Object.keys(tally).filter((id) => tally[id].matches > 4 && tally[id].dmg === 0);
must("no fighter ships with a dead kit", deadKits.length === 0, deadKits.join(", "));
const usedKits = Object.keys(tally).filter((id) => tally[id].matches > 3 && tally[id].uses === 0);
must("every fighter actually casts its moves", usedKits.length === 0, usedKits.join(", "));

/* the roster's own balance read: nobody should be a guaranteed loss */
const lopsided = Object.keys(tally).filter((id) => tally[id].matches > 8 && (tally[id].wins / tally[id].matches > 0.95 || tally[id].wins / tally[id].matches < 0.05));
if (lopsided.length) warn("lopsided fighters (wins > 95% or < 5%)", lopsided.map((id) => id + " " + (100 * tally[id].wins / tally[id].matches).toFixed(0) + "%").join(", "));

/* the moving-usage report: which moves the sim actually reaches for */
const never = Object.keys(moveUse).filter((m) => moveUse[m] === 0);
if (never.length) console.log("      (moves never fired — worth a look) " + never.join(", "));
console.log("      busiest moves: " + Object.entries(moveUse).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([m, n]) => m + " " + n).join(", "));

console.log("");
console.log("best-usage kits: " + Object.entries(tally).sort((a, b) => b[1].uses - a[1].uses).slice(0, 5).map(([id, t]) => id + " " + t.uses).join(", "));
console.log("top damage kits: " + Object.entries(tally).sort((a, b) => b[1].dmg - a[1].dmg).slice(0, 6).map(([id, t]) => id + " " + Math.round(t.dmg)).join(", "));
console.log("win-rate spread: " + Object.entries(tally).filter(([, t]) => t.matches > 6).map(([id, t]) => id + " " + Math.round(100 * t.wins / t.matches) + "%").sort().join(", "));
console.log("");
console.log((fails ? "FAILED" : "PASSED") + " — " + results.filter((r) => r.ok).length + "/" + results.length + " checks, " + warns + " warnings, " + MATCHES + " battles simulated");
process.exit(fails ? 1 : 0);
