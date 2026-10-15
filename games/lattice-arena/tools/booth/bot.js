/* Battle TV booth. Listens on this PC only. Opens a Twitch prediction when a
   card starts and resolves it when the browser reports the winner. No token
   means it still records the fights and waits. */
"use strict";
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = 8791;
const SECRET = path.join(ROOT, "twitch.json");
const STATE = path.join(ROOT, "state.json");
const LOG = path.join(ROOT, "bot.log");

function log(line) {
  const row = new Date().toISOString() + " " + line;
  console.log(row);
  try { fs.appendFileSync(LOG, row + "\n"); } catch (e) {}
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return null; }
}
function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
}

let twitch = readJson(SECRET) || {};
let state = readJson(STATE) || { predictionId: "", outcomes: {}, lastCard: null, lastResult: null, note: "" };
let pools = null;
const GUIDE_EVERY = 6;
const GUIDE_MS = 12 * 60 * 1000;
const HOW = "How to vote: on this Twitch channel, click the prediction in chat, pick a side, and spend channel points. You have 45 seconds. The bar on the video is not a button. Points work on Twitch only.";

function saveState() { writeJson(STATE, state); }

function clip(s, n) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  return s.length <= n ? s : s.slice(0, n - 1).trim();
}
function sideTitle(names, fallback) {
  const list = (names || []).filter(Boolean);
  if (!list.length) return clip(fallback, 25);
  const both = list.slice(0, 2).join(" ");
  if (both.length <= 25) return both;
  return clip(list[0], 25);
}
function showName(v) {
  return Array.isArray(v) ? v.filter(Boolean).join(" ") : String(v || "");
}

function helix(method, urlPath, body) {
  return new Promise((resolve) => {
    if (!twitch.accessToken || !twitch.clientId) {
      resolve({ status: 0, json: { message: "no token" } });
      return;
    }
    const data = body ? JSON.stringify(body) : null;
    const req = https.request("https://api.twitch.tv" + urlPath, {
      method: method,
      headers: {
        "Authorization": "Bearer " + twitch.accessToken,
        "Client-Id": twitch.clientId,
        "Content-Type": "application/json",
        "Content-Length": data ? Buffer.byteLength(data) : 0
      }
    }, (res) => {
      let raw = "";
      res.on("data", (c) => { raw += c; });
      res.on("end", () => {
        let json = {};
        try { json = raw ? JSON.parse(raw) : {}; } catch (e) { json = { raw: raw.slice(0, 300) }; }
        resolve({ status: res.statusCode, json: json });
      });
    });
    req.on("error", (e) => resolve({ status: 0, json: { message: e.message } }));
    if (data) req.write(data);
    req.end();
  });
}

function validate() {
  return new Promise((resolve) => {
    if (!twitch.accessToken) { resolve(null); return; }
    const req = https.request("https://id.twitch.tv/oauth2/validate", {
      headers: { "Authorization": "OAuth " + twitch.accessToken }
    }, (res) => {
      let raw = "";
      res.on("data", (c) => { raw += c; });
      res.on("end", () => {
        try { resolve(res.statusCode === 200 ? JSON.parse(raw) : null); }
        catch (e) { resolve(null); }
      });
    });
    req.on("error", () => resolve(null));
    req.end();
  });
}

async function refresh() {
  if (!twitch.refreshToken || !twitch.clientId || !twitch.clientSecret) return false;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: twitch.refreshToken,
    client_id: twitch.clientId,
    client_secret: twitch.clientSecret
  }).toString();
  const out = await new Promise((resolve) => {
    const req = https.request("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body) }
    }, (res) => {
      let raw = "";
      res.on("data", (c) => { raw += c; });
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); } catch (e) { resolve(null); }
      });
    });
    req.on("error", () => resolve(null));
    req.write(body);
    req.end();
  });
  if (!out || !out.access_token) return false;
  twitch.accessToken = out.access_token;
  if (out.refresh_token) twitch.refreshToken = out.refresh_token;
  writeJson(SECRET, twitch);
  log("refreshed the Twitch token");
  return true;
}

async function readyTwitch() {
  let who = await validate();
  if (!who) {
    const ok = await refresh();
    if (ok) who = await validate();
  }
  if (!who) {
    state.note = "waiting for twitch.json";
    saveState();
    log(state.note);
    return false;
  }
  if (!twitch.broadcasterId) {
    twitch.broadcasterId = who.user_id;
    writeJson(SECRET, twitch);
  }
  state.note = "twitch " + (who.login || who.user_id);
  saveState();
  log("Twitch ready as " + state.note);
  return true;
}

function guideDue() {
  const last = state.guideAt ? Date.parse(state.guideAt) : 0;
  if (!last) return true;
  if ((state.cardsSinceGuide || 0) >= GUIDE_EVERY) return true;
  return (Date.now() - last) >= GUIDE_MS;
}

async function sayGuide(extra) {
  const status = await say(extra ? HOW + " " + extra : HOW);
  if (status !== 200) return;
  state.guideAt = new Date().toISOString();
  state.cardsSinceGuide = 0;
  saveState();
  log("vote guide sent");
}

async function say(text) {
  if (!twitch.broadcasterId) return 0;
  const res = await helix("POST", "/helix/chat/messages", {
    broadcaster_id: twitch.broadcasterId,
    sender_id: twitch.broadcasterId,
    message: clip(text, 480)
  });
  if (res.status !== 200) log("chat " + res.status + " " + JSON.stringify(res.json).slice(0, 180));
  return res.status;
}

async function openPrediction(card) {
  if (state.predictionId) await finishPrediction(-1);
  const left = sideTitle(card.left, "Cyan");
  const right = sideTitle(card.right, "Red");
  if (left.toLowerCase() === right.toLowerCase()) return;
  const title = clip((card.mode ? card.mode + " " : "") + "who takes it?", 45);
  const res = await helix("POST", "/helix/predictions", {
    broadcaster_id: twitch.broadcasterId,
    title: title,
    outcomes: [{ title: left }, { title: right }],
    prediction_window: 45
  });
  const pred = res.json && res.json.data && res.json.data[0];
  if (!pred) {
    log("prediction open failed " + res.status + " " + JSON.stringify(res.json).slice(0, 220));
    return;
  }
  const outcomes = {};
  (pred.outcomes || []).forEach((o, i) => { outcomes[i] = o.id; });
  state.predictionId = pred.id;
  state.outcomes = outcomes;
  state.until = Date.now() + 45000;
  state.lastCard = { left: left, right: right, at: new Date().toISOString() };
  pools = { left: 0, right: 0, leftUsers: 0, rightUsers: 0, status: "ACTIVE" };
  saveState();
  log("prediction open " + left + " vs " + right);
  state.cardsSinceGuide = (state.cardsSinceGuide || 0) + 1;
  if (guideDue()) await sayGuide("This card: " + left + " or " + right + ".");
  else {
    saveState();
    await say("45 seconds. Click the prediction in Twitch chat. " + left + " or " + right + ".");
  }
}

function outcomeBySide(pred, side) {
  const id = state.outcomes[String(side)] || state.outcomes[side];
  const outs = (pred && pred.outcomes) || [];
  return outs.find((o) => o.id === id) || outs[side] || null;
}

let pollNote = "";
async function pollPrediction() {
  if (!state.predictionId || !twitch.broadcasterId) {
    pools = null;
    return;
  }
  const res = await helix("GET", "/helix/predictions?broadcaster_id=" + encodeURIComponent(twitch.broadcasterId) + "&id=" + encodeURIComponent(state.predictionId));
  if (res.status !== 200) {
    const note = "prediction poll " + res.status;
    if (pollNote !== note) {
      pollNote = note;
      log(note + " " + JSON.stringify(res.json).slice(0, 160));
    }
    return;
  }
  pollNote = "";
  const pred = res.json && res.json.data && res.json.data[0];
  if (!pred) return;
  const left = outcomeBySide(pred, 0) || {};
  const right = outcomeBySide(pred, 1) || {};
  pools = {
    left: left.channel_points || 0,
    right: right.channel_points || 0,
    leftUsers: left.users || 0,
    rightUsers: right.users || 0,
    status: pred.status || ""
  };
}

async function finishPrediction(side, why) {
  if (!state.predictionId) return;
  const id = state.predictionId;
  if (side !== 0 && side !== 1) {
    const res = await helix("PATCH", "/helix/predictions", {
      broadcaster_id: twitch.broadcasterId, id: id, status: "CANCELED"
    });
    log("prediction canceled " + res.status);
    state.predictionId = "";
    state.until = 0;
    pools = null;
    saveState();
    if (why === "draw" && res.status === 200) await say("Draw. Channel points are refunded.");
    return;
  }
  const win = state.outcomes[String(side)] || state.outcomes[side];
  if (!win) { log("no outcome id for side " + side); return; }
  let res = await helix("PATCH", "/helix/predictions", {
    broadcaster_id: twitch.broadcasterId, id: id, status: "RESOLVED", winning_outcome_id: win
  });
  if (res.status === 400) {
    await helix("PATCH", "/helix/predictions", {
      broadcaster_id: twitch.broadcasterId, id: id, status: "LOCKED"
    });
    res = await helix("PATCH", "/helix/predictions", {
      broadcaster_id: twitch.broadcasterId, id: id, status: "RESOLVED", winning_outcome_id: win
    });
  }
  log("prediction resolved side " + side + " " + res.status);
  if (res.status !== 200) {
    const cancel = await helix("PATCH", "/helix/predictions", {
      broadcaster_id: twitch.broadcasterId, id: id, status: "CANCELED"
    });
    log("prediction could not pay, canceled " + cancel.status);
    if (cancel.status === 200) await say("Could not pay that prediction. Channel points are refunded.");
  }
  const pot = pools ? (pools.left || 0) + (pools.right || 0) : 0;
  state.predictionId = "";
  state.until = 0;
  pools = null;
  saveState();
  if (res.status === 200) {
    const name = side === 0 ? showName(state.lastCard && state.lastCard.left) : showName(state.lastCard && state.lastCard.right);
    let line = (name || "That side") + " takes it.";
    if (pot > 0) line += " " + pot + " channel points in the pool.";
    await say(line);
  }
}

let chain = Promise.resolve();
function queue(fn) {
  chain = chain.then(fn, fn);
  return chain;
}
async function onArena(msg) {
  if (!msg || (msg.kind !== "card" && msg.kind !== "result")) return;
  log("arena " + msg.kind + " " + JSON.stringify({ left: msg.left, right: msg.right, side: msg.side, mode: msg.mode }));
  if (msg.kind === "card") {
    state.lastCard = { left: msg.left, right: msg.right, mode: msg.mode, at: new Date().toISOString() };
    saveState();
    if (twitch.broadcasterId) await openPrediction(msg);
    return;
  }
  state.lastResult = { side: msg.side, at: new Date().toISOString() };
  saveState();
  if (twitch.broadcasterId) await finishPrediction(msg.side, (msg.side === 0 || msg.side === 1) ? "result" : "draw");
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
}

const server = http.createServer((req, res) => {
  cors(res);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (req.method === "GET" && req.url === "/board") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(BOARD);
    return;
  }
  if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      twitch: state.note || "",
      prediction: state.predictionId || "",
      until: state.until || 0,
      status: (pools && pools.status) || "",
      pools: pools,
      lastCard: state.lastCard || null,
      lastResult: state.lastResult || null
    }));
    return;
  }
  if (req.method === "POST" && req.url === "/arena") {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > 8000) req.destroy(); });
    req.on("end", () => {
      let msg = null;
      try { msg = JSON.parse(raw); } catch (e) { msg = null; }
      res.writeHead(msg ? 204 : 400);
      res.end();
      if (msg) queue(() => onArena(msg)).catch((e) => log("arena handler " + e.message));
    });
    return;
  }
  res.writeHead(404);
  res.end();
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") { log("already running"); process.exit(0); }
  log("server " + e.message);
  process.exit(1);
});
const BOARD = `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;background:transparent;color:#fff8e8;font:700 24px/1.15 "Segoe UI",sans-serif}
#bar{display:block;padding:8px 16px;background:rgba(8,6,12,.94);border:2px solid #e7c27a}
.k{font-size:13px;letter-spacing:.16em;color:#e7c27a}
#t{font-size:26px}
#h{font-size:16px;font-weight:600;color:#f3e2b4}
</style><div id="bar"><div class="k" id="k">TWITCH PREDICTION</div><div id="t">Opens on the next card</div><div id="h">Vote in Twitch chat. Click the prediction and spend channel points.</div></div>
<script>
function names(v){return Array.isArray(v)?v.filter(Boolean).join(" "):(v||"")}
function side(name, pts){return name+(pts==null?"":"  "+pts+" pts")}
async function tick(){
  try{
    const h=await fetch("/health").then(r=>r.json());
    const bar=document.getElementById("bar");
    bar.style.display="block";
    if(!(h.prediction&&h.lastCard)){
      document.getElementById("k").textContent="TWITCH PREDICTION";
      document.getElementById("t").textContent="Opens on the next card";
      document.getElementById("h").textContent="Vote in Twitch chat. Click the prediction and spend channel points.";
      return;
    }
    const p=h.pools||{};
    const hasPts=h.pools&&p.left!=null;
    document.getElementById("k").textContent="TWITCH PREDICTION";
    document.getElementById("t").textContent=side(names(h.lastCard.left), hasPts?p.left:null)+"    or    "+side(names(h.lastCard.right), hasPts?p.right:null);
    const leftMs=(h.until||0)-Date.now();
    const locked=h.status==="LOCKED"||(h.until&&leftMs<=0);
    const hint=document.getElementById("h");
    if(locked) hint.textContent="Bets locked. Points pay out when the map ends.";
    else {
      const s=h.until?Math.max(0,Math.ceil(leftMs/1000))+"s. ":"";
      hint.textContent=s+"Twitch chat: click the prediction and spend channel points. This bar is not a button.";
    }
  }catch(e){}
}
setInterval(tick,1000);tick();
</script>`;

setInterval(() => {
  const next = readJson(SECRET);
  if (!next || !next.accessToken) return;
  if (next.accessToken === twitch.accessToken && next.clientId === twitch.clientId) return;
  twitch = next;
  log("twitch.json changed");
  readyTwitch().catch((e) => log("twitch " + e.message));
}, 5000);

setInterval(() => {
  queue(() => pollPrediction()).catch((e) => log("poll " + e.message));
}, 3000);

server.listen(PORT, "127.0.0.1", () => {
  log("booth listening on 127.0.0.1:" + PORT);
  queue(async () => {
    const ok = await readyTwitch();
    if (ok && guideDue()) {
      const open = state.predictionId && state.lastCard;
      const extra = open ? "This card: " + showName(state.lastCard.left) + " or " + showName(state.lastCard.right) + "." : "";
      await sayGuide(extra);
    }
  }).catch((e) => log("twitch " + e.message));
});
