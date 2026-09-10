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
S.pool.shot.free(a);
S.pool.shot.free(b);
if (S.pool.shot.live() !== 0) throw new Error("live after free " + S.pool.shot.live());
S.burst(1, 1, "#fff", 12);
S.floater(1, 1, "9", "#fff");
S.cleanup();
const c = S.counts();
if (c.particles !== 0 || c.floaters !== 0) throw new Error("cleanup leak " + JSON.stringify(c));
if (S.restarts < 1) throw new Error("restarts");
console.log("crypt_studio_smoke ok", S.counts());
