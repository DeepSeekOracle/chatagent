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

function saveState() { writeJson(STATE, state); }

function clip(s, n) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  return s.length <= n ? s : s.slice(0, n - 1).trim();
}
function sideTitle(names, fallback) {
  const first = (names && names[0]) || fallback;
  return clip(first + " side", 25);
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

async function say(text) {
  if (!twitch.broadcasterId) return;
  const res = await helix("POST", "/helix/chat/messages", {
    broadcaster_id: twitch.broadcasterId,
    sender_id: twitch.broadcasterId,
    message: clip(text, 480)
  });
  if (res.status !== 200) log("chat " + res.status + " " + JSON.stringify(res.json).slice(0, 180));
}

async function openPrediction(card) {
  const left = sideTitle(card.left, "Cyan");
  const right = sideTitle(card.right, "Red");
  if (left.toLowerCase() === right.toLowerCase()) return;
  const res = await helix("POST", "/helix/predictions", {
    broadcaster_id: twitch.broadcasterId,
    title: clip("Who takes this fight?", 45),
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
  state.lastCard = { left: left, right: right, at: new Date().toISOString() };
  saveState();
  log("prediction open " + left + " vs " + right);
  await say("Prediction is up for 45 seconds. " + left + " or " + right + ".");
}

async function finishPrediction(side) {
  if (!state.predictionId) return;
  const id = state.predictionId;
  if (side !== 0 && side !== 1) {
    const res = await helix("PATCH", "/helix/predictions", {
      broadcaster_id: twitch.broadcasterId, id: id, status: "CANCELED"
    });
    log("prediction canceled " + res.status);
    state.predictionId = "";
    saveState();
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
  if (res.status === 200) {
    state.predictionId = "";
    saveState();
    const name = side === 0 ? (state.lastCard && state.lastCard.left) : (state.lastCard && state.lastCard.right);
    await say((name || "That side") + " takes it. Points go to the callers who had them.");
  }
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
  if (twitch.broadcasterId) await finishPrediction(msg.side);
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
  if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      twitch: state.note || "",
      prediction: state.predictionId || "",
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
      if (msg) onArena(msg).catch((e) => log("arena handler " + e.message));
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
server.listen(PORT, "127.0.0.1", () => {
  log("booth listening on 127.0.0.1:" + PORT);
  readyTwitch().catch((e) => log("twitch " + e.message));
});
