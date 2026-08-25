"""Lattice Marines eternal ledger — public JSON API. Writes to a HF dataset.

No secrets in responses. HF_TOKEN is a Space secret used only to commit wins.
AI victories only. Hot-seat and losses are rejected.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import threading
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from huggingface_hub import HfApi, hf_hub_download

DATASET = os.environ.get("LEDGER_DATASET", "DeepSeekOracle/lattice-marines-wins")
SMM_DATASET = os.environ.get("SMM_DATASET", "DeepSeekOracle/stock-market-masters-cashouts")
TOKEN = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
MAPS = {32, 40, 48, 64, 80, 128, 192}
DIFFS = {"easy", "normal", "hard", "insane"}
PROFILES = {"Aggressor", "Turtle", "Economist", "Intelligence"}
NAME_RE = re.compile(r"^[\w .'\-]{1,18}$", re.UNICODE)
MAX_WINS = 8000
RATE_WINDOW = 3600
RATE_MAX = 12

LOCK = threading.Lock()
HITS: dict[str, list[float]] = {}
CACHE: dict[str, Any] = {"t": 0.0, "data": None}
SMM_CACHE: dict[str, Any] = {"t": 0.0, "data": None}

app = FastAPI(title="Lattice Marines Eternal Ledger", docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def empty() -> dict:
    return {
        "game": "lattice-marines",
        "title": "Lattice Marines Eternal Ledger",
        "updated": None,
        "wins": [],
    }


def load_ledger() -> dict:
    now = time.time()
    if CACHE["data"] is not None and now - CACHE["t"] < 8:
        return CACHE["data"]
    try:
        path = hf_hub_download(
            DATASET, "ledger.json", repo_type="dataset", token=TOKEN, force_download=True
        )
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict) or not isinstance(data.get("wins"), list):
            data = empty()
    except Exception:
        data = empty()
    CACHE["data"] = data
    CACHE["t"] = now
    return data


def save_ledger(data: dict) -> None:
    if not TOKEN:
        raise RuntimeError("writer offline")
    payload = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
    api = HfApi(token=TOKEN)
    api.upload_file(
        path_or_fileobj=payload,
        path_in_repo="ledger.json",
        repo_id=DATASET,
        repo_type="dataset",
        commit_message="inscribe AI win",
    )
    CACHE["data"] = data
    CACHE["t"] = time.time()


def rate_ok(ip: str) -> bool:
    t = time.time()
    bucket = [x for x in HITS.get(ip, []) if t - x < RATE_WINDOW]
    if len(bucket) >= RATE_MAX:
        HITS[ip] = bucket
        return False
    bucket.append(t)
    HITS[ip] = bucket
    return True


def clean_name(raw: Any) -> str | None:
    s = str(raw or "").strip()[:18]
    s = re.sub(r"\s+", " ", s)
    if not s or not NAME_RE.match(s):
        return None
    low = s.lower()
    if any(x in low for x in ("http://", "https://", "<", ">", "javascript:")):
        return None
    return s


def as_int(v: Any, lo: int, hi: int) -> int | None:
    try:
        n = int(v)
    except (TypeError, ValueError):
        return None
    if n < lo or n > hi:
        return None
    return n


def validate(body: dict) -> tuple[dict | None, str]:
    if not isinstance(body, dict):
        return None, "bad payload"
    if body.get("mode") != "ai" or body.get("result") != "win":
        return None, "only vs-AI wins are inscribed"
    name = clean_name(body.get("name"))
    if not name:
        return None, "commander name rejected"
    score = as_int(body.get("score"), 0, 500000)
    turns = as_int(body.get("turns"), 1, 800)
    campaign = as_int(body.get("campaign"), 1, 999)
    map_n = as_int(body.get("mapN"), 32, 192)
    seed = as_int(body.get("seed"), 0, 2**32 - 1)
    b_kill = as_int(body.get("bKill"), 0, 5000)
    u_kill = as_int(body.get("uKill"), 0, 5000)
    prestige = as_int(body.get("prestige"), 0, 200)
    if None in (score, turns, campaign, map_n, seed, b_kill, u_kill, prestige):
        return None, "numeric field out of range"
    if map_n not in MAPS:
        return None, "unknown map size"
    diff = str(body.get("diff") or "")
    if diff not in DIFFS:
        return None, "unknown difficulty"
    profile = str(body.get("profile") or "")
    if profile not in PROFILES:
        return None, "unknown AI profile"
    day = str(body.get("date") or utc_now()[:10])[:10]
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", day):
        day = utc_now()[:10]
    note = str(body.get("mapNote") or "")[:80]
    key = f"{name}|{seed}|{score}|{turns}|{map_n}|{diff}|{campaign}|{day}"
    rec_id = hashlib.sha256(key.encode("utf-8")).hexdigest()[:24]
    rec = {
        "id": rec_id,
        "name": name,
        "score": score,
        "diff": diff,
        "campaign": campaign,
        "mapN": map_n,
        "seed": seed,
        "turns": turns,
        "profile": profile,
        "bKill": b_kill,
        "uKill": u_kill,
        "prestige": prestige,
        "mapNote": note,
        "date": day,
        "iso": utc_now(),
        "mode": "ai",
        "result": "win",
    }
    return rec, "ok"


@app.get("/health")
def health():
    return {"ok": True, "dataset": DATASET, "writer": bool(TOKEN)}


@app.get("/ledger.json")
def ledger_json():
    data = load_ledger()
    return JSONResponse(data, headers={"Cache-Control": "public, max-age=20"})


@app.post("/submit")
async def submit(request: Request):
    ip = request.client.host if request.client else "0"
    if not rate_ok(ip):
        return JSONResponse({"ok": False, "error": "slow down"}, status_code=429)
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"ok": False, "error": "need JSON"}, status_code=400)
    rec, err = validate(body)
    if not rec:
        return JSONResponse({"ok": False, "error": err}, status_code=400)
    if not TOKEN:
        return JSONResponse({"ok": False, "error": "writer offline"}, status_code=503)
    with LOCK:
        data = load_ledger()
        wins = data.get("wins") or []
        if any(w.get("id") == rec["id"] for w in wins):
            return {"ok": True, "status": "duplicate", "id": rec["id"]}
        wins.append(rec)
        wins.sort(key=lambda w: (-int(w.get("score") or 0), str(w.get("iso") or "")))
        data["wins"] = wins[:MAX_WINS]
        data["updated"] = utc_now()
        data["game"] = "lattice-marines"
        data["title"] = "Lattice Marines Eternal Ledger"
        try:
            save_ledger(data)
        except Exception:
            CACHE["data"] = None
            return JSONResponse({"ok": False, "error": "inscribe failed"}, status_code=502)
    return {"ok": True, "status": "inscribed", "id": rec["id"], "rank": next((i + 1 for i, w in enumerate(data["wins"]) if w.get("id") == rec["id"]), None)}


def smm_empty() -> dict:
    return {
        "game": "stock-market-masters",
        "title": "Stock Market Masters TOP Cashout",
        "updated": None,
        "cashouts": [],
    }


def smm_load() -> dict:
    now = time.time()
    if SMM_CACHE["data"] is not None and now - SMM_CACHE["t"] < 8:
        return SMM_CACHE["data"]
    try:
        path = hf_hub_download(
            SMM_DATASET, "ledger.json", repo_type="dataset", token=TOKEN, force_download=True
        )
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict) or not isinstance(data.get("cashouts"), list):
            data = smm_empty()
    except Exception:
        data = smm_empty()
    SMM_CACHE["data"] = data
    SMM_CACHE["t"] = now
    return data


def smm_save(data: dict) -> None:
    if not TOKEN:
        raise RuntimeError("writer offline")
    payload = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
    api = HfApi(token=TOKEN)
    api.upload_file(
        path_or_fileobj=payload,
        path_in_repo="ledger.json",
        repo_id=SMM_DATASET,
        repo_type="dataset",
        commit_message="inscribe cashout",
    )
    SMM_CACHE["data"] = data
    SMM_CACHE["t"] = time.time()


def smm_validate(body: dict) -> tuple[dict | None, str]:
    if not isinstance(body, dict):
        return None, "bad payload"
    if body.get("event") != "cashout":
        return None, "only cashouts are inscribed"
    name = clean_name(body.get("name"))
    if not name:
        return None, "name rejected"
    worth = as_int(body.get("worth"), 0, 50_000_000)
    cash = as_int(body.get("cash"), 0, 50_000_000)
    rounds = as_int(body.get("rounds"), 1, 80)
    seats = as_int(body.get("seats"), 1, 4)
    jackpots = as_int(body.get("jackpots"), 0, 40)
    if None in (worth, cash, rounds, seats, jackpots):
        return None, "numeric field out of range"
    day = str(body.get("date") or utc_now()[:10])[:10]
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", day):
        day = utc_now()[:10]
    key = f"{name}|{worth}|{rounds}|{seats}|{day}"
    rec_id = hashlib.sha256(key.encode("utf-8")).hexdigest()[:24]
    rec = {
        "id": rec_id,
        "name": name,
        "worth": worth,
        "cash": cash,
        "rounds": rounds,
        "seats": seats,
        "jackpots": jackpots,
        "date": day,
        "iso": utc_now(),
        "event": "cashout",
    }
    return rec, "ok"


@app.get("/smm/ledger.json")
def smm_ledger_json():
    data = smm_load()
    return JSONResponse(data, headers={"Cache-Control": "public, max-age=20"})


@app.post("/smm/submit")
async def smm_submit(request: Request):
    ip = request.client.host if request.client else "0"
    if not rate_ok(ip):
        return JSONResponse({"ok": False, "error": "slow down"}, status_code=429)
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"ok": False, "error": "need JSON"}, status_code=400)
    rec, err = smm_validate(body)
    if not rec:
        return JSONResponse({"ok": False, "error": err}, status_code=400)
    if not TOKEN:
        return JSONResponse({"ok": False, "error": "writer offline"}, status_code=503)
    with LOCK:
        data = smm_load()
        rows = data.get("cashouts") or []
        if any(w.get("id") == rec["id"] for w in rows):
            return {"ok": True, "status": "duplicate", "id": rec["id"]}
        rows.append(rec)
        rows.sort(key=lambda w: (-int(w.get("worth") or 0), str(w.get("iso") or "")))
        data["cashouts"] = rows[:8000]
        data["updated"] = utc_now()
        data["game"] = "stock-market-masters"
        try:
            smm_save(data)
        except Exception:
            SMM_CACHE["data"] = None
            return JSONResponse({"ok": False, "error": "inscribe failed"}, status_code=502)
    return {
        "ok": True,
        "status": "inscribed",
        "id": rec["id"],
        "rank": next((i + 1 for i, w in enumerate(data["cashouts"]) if w.get("id") == rec["id"]), None),
    }


@app.get("/", response_class=HTMLResponse)
def home():
    return """<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lattice Marines Eternal Ledger</title>
<style>
body{margin:0;background:#070b12;color:#e8eef7;font-family:system-ui,sans-serif;padding:2rem}
a{color:#22d3ee} code{color:#fbbf24}
</style></head><body>
<p style="letter-spacing:.2em;text-transform:uppercase;color:#22d3ee;font-size:.75rem">Δ9Φ963</p>
<h1>Lattice Marines Eternal Ledger</h1>
<p>Public write API for vs-AI wins. The hall of records lives on the game sites.</p>
<ul>
<li><a href="https://chatagent.ca/games/lattice-marines/ledger.html">chatagent.ca ledger</a></li>
<li><a href="https://eternalhaven.ca/games/lattice-marines/ledger.html">eternalhaven.ca ledger</a></li>
<li><a href="/ledger.json">ledger.json</a></li>
<li><a href="https://huggingface.co/datasets/DeepSeekOracle/lattice-marines-wins">dataset</a></li>
</ul>
<p>POST <code>/submit</code> JSON · GET <code>/ledger.json</code></p>
</body></html>"""
