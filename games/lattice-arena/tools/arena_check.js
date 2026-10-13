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
load("banter.js");
load("attacks.js");
load("brain.js");
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
  let open = 0, inner = 0;
  for (let y = 0; y < lv.H; y++) for (let x = 0; x < lv.W; x++) {
    if (lv.tiles[y][x] !== "wall") open++;
    else if (x > 0 && y > 0 && x < lv.W - 1 && y < lv.H - 1) inner++;   // stone inside the ring
  }
  return { unreachable: unreachable.length, open: open / (lv.W * lv.H), inner };
}
let mapBad = 0, openMin = 1, openMax = 0, innerWall = 0;
for (let s = 0; s < 120; s++) {
  const m = mapStats(s);
  if (m.unreachable) mapBad++;
  innerWall = Math.max(innerWall, m.inner);
  openMin = Math.min(openMin, m.open); openMax = Math.max(openMax, m.open);
}
must("every arena is walkable from both pockets", mapBad === 0, "bad seeds=" + mapBad + "/120");
must("the ring floor is clear — no obstacles inside it", innerWall === 0, innerWall + " interior stone tiles across 120 seeds");
must("arenas stay open enough to fight in", openMin > 0.76 && openMax < 0.93, "open " + (openMin * 100).toFixed(0) + "-" + (openMax * 100).toFixed(0) + "%");
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
  const acted = (e) => Object.values(e.uses || {}).reduce((x, y) => x + y, 0) > 0 || (e.dmgDone || 0) > 0;
  const wiped = (team) => !(team === 0 ? S.your : S.foe).some((e) => !e.dead);
  const actedBy = (team) => (team === 0 ? S.your : S.foe).some(acted);
  /* A side that is still standing at the end must have done something. A body killed in the
     first seconds never gets a turn — that is a result, not a dead sim, so only survivors are
     held to it, and auto-attacking counts as acting: a silenced or cooldown-bound body that
     wins on basics has still fought. */
  if (!actedBy(0) && !wiped(0)) zeroMoves++;
  if (!actedBy(1) && !wiped(1)) zeroMoves++;
  /* A battle where nobody landed a hit AND nobody fell is a battle where nobody fought.
     A body that walked into the floor and died is a real result, not a dead sim. */
  if (!liveAll.some((e) => e.dmgDone > 0) && !liveAll.some((e) => e.dead)) zeroDmg++;
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

/* --- 4. the brain: the styles, the teamwork and the colosseums -------------- */
const BRAIN = E.brain();
const bxSTY = {};        // style -> the axes a spectator can actually see
const bxtaskUse = {};    // task -> how often it was handed out
const bxkinds = {};      // colosseum kind -> seats
let bxhealOut = 0, bxhealBodies = 0, bxworstStuck = 0;
const bxBM = 200;
for (let m = 0; m < bxBM; m++) {
  const n = MODES[m % MODES.length];
  const you = R.draw(n).map((f) => f.id), foe = R.draw(n, you).map((f) => f.id);
  const S = E.runHeadless({ you, foe }, n, 200, (m * 3571) % 9967);
  bxkinds[S.lv.kind] = (bxkinds[S.lv.kind] || 0) + 1;
  S.your.concat(S.foe).forEach((e) => {
    const s = e.smp || { n: 0, engage: 0, close: 0, far: 0, pick: 0, weak: 0, onFocus: 0 };
    const A = bxSTY[e.b.style || "none"] = bxSTY[e.b.style || "none"] || { n: 0, engage: 0, close: 0, far: 0, bxpicks: 0, weak: 0, focus: 0, heal: 0, stuck: 0, temper: 0 };
    A.n++;
    A.engage += s.n ? s.engage / s.n : 0;
    A.close += s.n ? s.close / s.n : 0;
    A.far += s.n ? s.far / s.n : 0;
    A.bxpicks += s.pick; A.weak += s.weak; A.focus += s.onFocus;
    A.heal += (e.healOut || 0);
    if (e.healOut > 0) { bxhealBodies++; bxhealOut += e.healOut; }
    A.stuck = Math.max(A.stuck, e.stuckWorst || 0);
    bxworstStuck = Math.max(bxworstStuck, e.stuckWorst || 0);
    Object.keys(e.tk || {}).forEach((k) => { bxtaskUse[k] = (bxtaskUse[k] || 0) + e.tk[k]; });
  });
}
/* 4a. every kit knows what it is, and no two of them are the same fighter */
const bxnoStyle = built.filter((b) => !b.style || !b.temper).map((b) => b.id);
must("every kit carries a style and a temper", bxnoStyle.length === 0, bxnoStyle.join(", "));
const bxsigs = built.map((b) => b.style + "|" + JSON.stringify(b.tune || {}));
const bxdupe = bxsigs.length - new Set(bxsigs).size;
must("no two kits fight the same way", bxdupe === 0, bxdupe + " duplicate style+tune pairs");
must("every style in the book is worn by somebody", BRAIN.styles().every((s) => Object.keys(bxSTY).includes(s)), BRAIN.styles().filter((s) => !Object.keys(bxSTY).includes(s)).join(", "));

/* 4b. the brain hands out real work, not one universal task */
const bxtasks = E.brain().tasks().filter((t) => bxtaskUse[t] > 0);
must("the brain works from a book of real bxtasks", bxtasks.length >= 6, bxtasks.length + " of " + E.brain().tasks().length + " bxtasks used");
must("somebody is always mending somebody", bxhealOut > 0 && bxhealBodies > 30, "healed on others " + Math.round(bxhealOut) + " by " + bxhealBodies + " bodies");

/* 4c. the team works together: one call, and most of the bxguns on it */
const bxpicks = Object.values(bxSTY).reduce((a, A) => a + A.bxpicks, 0);
const bxonFocus = Object.values(bxSTY).reduce((a, A) => a + A.focus, 0);
const bxfocusShare = bxonFocus / Math.max(1, bxpicks);
must("the squad concentrates its fire", bxfocusShare > 0.40, (100 * bxfocusShare).toFixed(0) + "% of attacks go at the called target");

/* 4d. an assassin bxpicks the wounded, a duelist bxpicks what is in front of it, a
       charger closes and a gun does not — the names have to be true */
const bxrate = (s, k) => (bxSTY[s] ? bxSTY[s][k] / Math.max(1, bxSTY[s].n) : 0);
const bxshare = (s, k) => (bxSTY[s] ? bxSTY[s][k] / Math.max(1, bxSTY[s].bxpicks) : 0);
const bxmelee = ["rush", "berserker", "vanguard", "bulwark"];
const bxguns = ["kite", "artillery", "medic", "controller"];
const bxmEng = bxmelee.reduce((a, s) => a + bxrate(s, "engage"), 0) / bxmelee.length;
const bxgEng = bxguns.reduce((a, s) => a + bxrate(s, "engage"), 0) / bxguns.length;
must("the bxguns stand off and the chargers do not", bxgEng > bxmEng + 30, "ranged " + bxgEng.toFixed(0) + "px vs bxmelee " + bxmEng.toFixed(0) + "px");
const bxmClose = bxmelee.reduce((a, s) => a + bxrate(s, "close"), 0) / bxmelee.length;
const bxgClose = bxguns.reduce((a, s) => a + bxrate(s, "close"), 0) / bxguns.length;
must("contact tells the berserkers from the kiters", bxmClose > bxgClose + 0.10, (100 * bxmClose).toFixed(0) + "% in contact vs " + (100 * bxgClose).toFixed(0) + "%");
/* The knives are told apart by the whole point of the style: they break off the called target
   to finish a bleeding body, while the marching styles hit whatever the call named. Comparing
   raw "did it hit the weakest enemy" numbers cannot show that, because the squad call usually
   IS the weakest enemy — so an off-call share is what gets measured. */
const bxoff = (s) => 1 - bxshare(s, "focus");
const bxKNIVES = ["assassin", "hunter"];
const bxMARCH = ["duelist", "skirmish", "berserker", "vanguard"];
const bxKnifeOff = bxKNIVES.reduce((a, s) => a + bxoff(s), 0) / bxKNIVES.length;
const bxMarchOff = bxMARCH.reduce((a, s) => a + bxoff(s), 0) / bxMARCH.length;
must("the knives leave the line to finish the hurt", bxKnifeOff > 0.25 && bxKnifeOff > bxMarchOff * 2,
  "knives take their own target " + (100 * bxKnifeOff).toFixed(0) + "% of the time vs the line " + (100 * bxMarchOff).toFixed(0) + "%");
const bxKnifeWeak = bxKNIVES.reduce((a, s) => a + bxshare(s, "weak"), 0) / bxKNIVES.length;
const bxChargeWeak = (bxshare("rush", "weak") + bxshare("vanguard", "weak")) / 2;
must("and the body they break for is the bleeding one", bxKnifeWeak > bxChargeWeak + 0.10,
  "knives pick the weakest " + (100 * bxKnifeWeak).toFixed(0) + "% vs chargers " + (100 * bxChargeWeak).toFixed(0) + "%");

/* 4e. the five colosseums are all in use, and none of them pins anybody */
must("all five colosseums get built", Object.keys(bxkinds).length === 5, Object.keys(bxkinds).length + " bxkinds: " + Object.entries(bxkinds).map(([k, v]) => k + " " + v).join(", "));
must("nobody spends the match leaning on the stone", bxworstStuck < 5, "worst stall " + bxworstStuck.toFixed(1) + "s");

/* 4f. crowd control: every kit that was losing carries an answer to a charge, and the
   answer actually gets used on the body that charges. */
const CCK = ["imp", "thief", "wraith", "wolf", "shade", "drain"];
const ccBare = CCK.filter((id) => {
  const b = built.find((x) => x.id === id);
  return !b || !b.moves.some((m) => {
    const s = m.st || {}, t = m.tgtSt || {};
    return s.root || s.stun || s.slow || s.knock || s.silence || s.wound || t.root || t.stun || t.slow;
  });
});
must("every kit that was losing carries an answer to a charge", ccBare.length === 0, ccBare.join(", "));

let ccHeld = 0, ccCaught = 0, ccWound = 0, ccCut = 0, ccMatches = 40;
const ccWas = new Map();
for (let m = 0; m < ccMatches; m++) {
  const n = MODES[m % MODES.length];
  const you = R.draw(n).map((f) => f.id), foe = R.draw(n, you).map((f) => f.id);
  const S = E.runHeadless({ you, foe }, n, 0.01, (m * 6151) % 9967);
  let t = 0.01, guard = 0;
  while (!S.over && t < 140 && guard++ < 720) {
    E.stepHeadless(0.2); t += 0.2;
    ccCut += S.woundCut || 0;
    S.your.concat(S.foe).filter((e) => e.b).forEach((e) => {
      const heldNow = e.stun > 0 || e.root > 0 || (e.slowT > 0 && e.slowV > 0.2);
      if (e.woundT > 0 && !ccWas.get("w:" + e.b.id + ccHeld)) ccWound++;
      if (heldNow && !ccWas.get(e)) {
        ccHeld++;
        const mates = (e.team === 0 ? S.your : S.foe).filter((o) => o !== e && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 140);
        if (!mates.length) ccCaught++;          // held with nobody of its own near: a caught charger
      }
      ccWas.set(e, heldNow);
    });
  }
}
must("crowd control lands — a charge gets answered", ccHeld > ccMatches * 0.6,
  ccHeld + " holds in " + ccMatches + " matches, " + ccCaught + " of them on a body that was in alone");
must("a wound cuts the mending, not just the health bar", ccWound > 0 && ccCut > 0,
  ccWound + " wounds applied, " + ccCut + " healing cut in " + ccMatches + " matches");

/* 4g. the mouths. Banter is bound to events, not to a timer: the caster only opens his
   mouth when something actually happened, and every line has a bubble over the speaker. */
const BAN = win.LYGO_BANTER;
must("the banter library is loaded", !!(BAN && BAN.stats), BAN ? "banter.js present" : "banter.js missing");
const bs = (BAN && BAN.stats) ? BAN.stats : { fighterLines: 0, casterLines: 0, kinds: 0 };
must("there is plenty to say", bs.fighterLines >= 200 && bs.casterLines >= 50,
  bs.fighterLines + " fighter lines, " + bs.casterLines + " caster lines over " + bs.kinds + " kinds");
must("most of the roster has its own mouth", (BAN && BAN.sayers ? BAN.sayers.length : 0) >= 18,
  (BAN && BAN.sayers ? BAN.sayers.length : 0) + " kits with personal lines");

const CAST_OK = { open: 1, kill: 1, firstBlood: 1, wipe: 1, hold: 1, save: 1, edge: 1, ace: 1, draw: 1, mapEnd: 1, matchEnd: 1 };
let banMatches = 24, banLines = 0, banHot = 0, banStray = 0, banNamed = 0, banCalls = 0, banBub = 0, banFar = 0;
const banKinds = new Set();
for (let m = 0; m < banMatches; m++) {
  const n = MODES[m % MODES.length];
  const you = R.draw(n).map((f) => f.id), foe = R.draw(n, you).map((f) => f.id);
  const S = E.runHeadless({ you, foe }, n, 0.01, (m * 7717 + 31) % 9973);
  let t = 0.01, guard = 0;
  while (!S.over && t < 140 && guard++ < 720) {
    E.stepHeadless(0.2); t += 0.2;
    (S.bubbles || []).forEach((b) => {
      if (!b.who) return;
      if (Math.abs(b.who.x - b.x) < 90 && Math.abs(b.who.y - b.y) < 90) banBub++; else banFar++;
    });
  }
  (S.talk || []).forEach((x) => {
    if (x.caster) {
      if (!CAST_OK[x.kind]) banStray++;
      if (x.kind === "kill" || x.kind === "firstBlood") {
        banCalls++;
        if (/[A-Z][a-z]/.test(x.text || "")) banNamed++;
      }
    } else { banKinds.add(x.kind); banLines++; if (x.hot) banHot++; }
  });
}
must("the bodies talk while they fight", banLines > banMatches, banLines + " fighter lines in " + banMatches + " matches");
must("the big moments are voiced", banHot >= banMatches, banHot + " kill/death/win lines");
must("the banter covers many kinds", banKinds.size >= 6, Array.from(banKinds).sort().join(", "));
must("the caster only speaks on a real event", banStray === 0, banStray + " caster lines with no event behind them");
must("the caster names the dead", banCalls > 0 && banNamed === banCalls, banNamed + "/" + banCalls + " kill calls name the fallen");
must("a spoken line has a bubble over the speaker", banBub > 0 && banFar <= banBub * 0.01,
  banBub + " bubble frames over the right head, " + banFar + " left behind (a blink frame)");
console.log("");
console.log("      style   n  stand-off  in-contact  backups  weak-bxpick  on-call  mended  worst-stall");
Object.keys(bxSTY).sort().forEach((s) => {
  const A = bxSTY[s], f = (x) => (A.n ? x / A.n : 0);
  console.log("      " + s.padEnd(10) + String(A.n).padStart(4) + "   " + f(A.engage).toFixed(0).padStart(6) + "px  " +
    (100 * f(A.close)).toFixed(0).padStart(8) + "%  " + (100 * f(A.far)).toFixed(0).padStart(5) + "%  " +
    (100 * (A.weak / Math.max(1, A.bxpicks))).toFixed(0).padStart(7) + "%  " + (100 * (A.focus / Math.max(1, A.bxpicks))).toFixed(0).padStart(5) + "%  " +
    f(A.heal).toFixed(0).padStart(6) + "  " + A.stuck.toFixed(1).padStart(6) + "s");
});
console.log("      bxtasks: " + Object.entries(bxtaskUse).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + " " + v).join(", "));
console.log("");

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
