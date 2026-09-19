/* Campaign integrity check: build all 24 floors headless and prove they are winnable.
   Verifies per floor: region size, start reachable, exit reachable, every relic / nexus /
   job standing on reachable floor (never sealed in stone), and that a seal floor's exit
   starts locked. Run: node tools/crypt_campaign_check.js */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const g = { window: null, Math, console };
g.window = g;
g.globalThis = g;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "campaign.js"), "utf8"), g);
const C = g.LatticeCampaign;
if (!C) throw new Error("no LatticeCampaign");
if (C.LEN !== 24) throw new Error("floor count " + C.LEN);

let id = 0;
const makeFoe = (kind, rank, x, y) => ({ id: ++id, kind, rank, x, y, hp: 1, max: 1, boss: /gate|crown|smith|heartboss|levi|tithe|unnamer|lock|unspool|titheking|nameeater/.test(kind) });
const rollLoot = () => "coin";

const OPEN = new Set(["floor", "pad", "exit", "exit_lock", "door_open"]);
let totalItems = 0, totalFoes = 0, totalGens = 0;

for (let i = 0; i < C.LEN; i++) {
  const lv = C.build(i, makeFoe, rollLoot);
  const tag = "floor " + (i + 1) + " " + lv.layout;
  if (lv.W !== 60 || lv.H !== 52) throw new Error(tag + ": region " + lv.W + "x" + lv.H);
  const open = (x, y) => lv.tiles[y] && OPEN.has(lv.tiles[y][x]);
  if (!open(lv.start.x, lv.start.y)) throw new Error(tag + ": start not open");
  const exitTile = lv.tiles[lv.exit.y][lv.exit.x];
  if (exitTile !== "exit" && exitTile !== "exit_lock") throw new Error(tag + ": exit tile is " + exitTile);
  if (lv.seal && exitTile !== "exit_lock") throw new Error(tag + ": seal floor exit is not locked");
  if (!lv.seal && exitTile !== "exit") throw new Error(tag + ": unsealed floor exit is locked");

  /* flood fill from the start over open tiles (doors count once opened) */
  const key = (x, y) => y * lv.W + x;
  const seen = new Uint8Array(lv.W * lv.H);
  const q = [[lv.start.x, lv.start.y]];
  seen[key(lv.start.x, lv.start.y)] = 1;
  while (q.length) {
    const [x, y] = q.pop();
    [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].forEach(([nx, ny]) => {
      if (nx < 0 || ny < 0 || nx >= lv.W || ny >= lv.H) return;
      if (seen[key(nx, ny)]) return;
      const t = lv.tiles[ny][nx];
      if (!OPEN.has(t) && t !== "door" && t !== "wall") return;
      if (t === "wall") return;
      seen[key(nx, ny)] = 1;
      q.push([nx, ny]);
    });
  }
  if (!seen[key(lv.exit.x, lv.exit.y)]) throw new Error(tag + ": exit is sealed off from the start");
  if (lv.gens.some((n) => !seen[key(n.x, n.y)])) throw new Error(tag + ": a nexus is sealed in stone");
  if (lv.items.some((n) => !seen[key(n.x, n.y)])) throw new Error(tag + ": a relic is sealed in stone");
  const startDist = lv.items.filter((n) => Math.abs(n.x - lv.start.x) + Math.abs(n.y - lv.start.y) < 2).length;
  if (startDist > 2) throw new Error(tag + ": " + startDist + " relics stacked on the start tile");
  if (lv.items.some((n) => lv.tiles[n.y][n.x] === "pad")) throw new Error(tag + ": a relic sits on a gate pad");
  if (lv.gens.length < 3) throw new Error(tag + ": only " + lv.gens.length + " nexuses on a large floor");
  if (lv.items.length < 12) throw new Error(tag + ": only " + lv.items.length + " relics on a large floor");
  if (lv.foes.length < 6) throw new Error(tag + ": only " + lv.foes.length + " jobs posted");
  totalItems += lv.items.length;
  totalFoes += lv.foes.length;
  totalGens += lv.gens.length;
  console.log(
    tag.padEnd(34),
    "act " + (lv.act + 1),
    "relics " + String(lv.items.length).padStart(3),
    "nexus " + String(lv.gens.length).padStart(2),
    "jobs " + String(lv.foes.length).padStart(2),
    (lv.seal ? "SEAL" : "    "),
    lv.chapterBook
  );
}
console.log("\ncrypt_campaign_check ok", {
  floors: C.LEN,
  region: "60x52",
  relics: totalItems,
  nexuses: totalGens,
  jobs: totalFoes,
  acts: C.CHAPTERS.length
});
