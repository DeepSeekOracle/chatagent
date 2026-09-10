/* Node smoke: studio pools recycle; cleanup zeros live counts. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const src = fs.readFileSync(path.join(__dirname, "..", "studio.js"), "utf8");
const g = {
  addEventListener: function () {},
  AudioContext: function () { throw new Error("no audio"); },
  localStorage: { getItem: function () { return "{}"; }, setItem: function () {} }
};
g.window = g;
g.globalThis = g;
vm.runInNewContext(src, g);
const S = g.CryptStudio;
if (!S) throw new Error("no CryptStudio");
const a = S.pool.shot.alloc();
const b = S.pool.shot.alloc();
if (!a.isActive || !b.isActive) throw new Error("alloc inactive");
a._chained = true;
S.pool.shot.free(a);
S.pool.shot.free(b);
const recycled = S.pool.shot.alloc();
if (recycled._chained) throw new Error("sticky _chained on pooled shot");
S.pool.shot.free(recycled);
if (S.pool.shot.live() !== 0) throw new Error("live after free " + S.pool.shot.live());
S.burst(1, 1, "#fff", 12);
S.floater(1, 1, "9", "#fff");
S.cleanup();
const c = S.counts();
if (c.particles !== 0 || c.floaters !== 0) throw new Error("cleanup leak " + JSON.stringify(c));
if (S.restarts < 1) throw new Error("restarts");
for (let i = 0; i < 40; i++) {
  const s = S.pool.shot.alloc();
  S.burst(0, 0, "#fff", 6);
  S.floater(0, 0, "1", "#fff");
  S.pool.shot.free(s);
  S.cleanup();
}
if (S.counts().particles !== 0) throw new Error("restart leak");
if (S.restarts < 40) throw new Error("restart count");
const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
["seek", "chain", "barrage", "nova", "burst", "spawnling", "mend"].forEach(function (k) {
  if (game.indexOf(k) < 0) throw new Error("missing " + k);
});
if (game.indexOf("togglePause") < 0) throw new Error("no pause");
if (game.indexOf("cleanupGameState") < 0) throw new Error("no cleanup");
if (game.indexOf("keyEdge.KeyP") < 0) throw new Error("pause key-repeat");
if (game.indexOf("pool.shot.free") < 0) throw new Error("no floor shot free");
if (game.indexOf("s._chained = false") < 0) throw new Error("no chain reset");
console.log("crypt_studio_smoke ok", S.counts());
