"""Stock Market Masters TOP Cashout ledger — public JSON API.

Writes to a HF dataset. HF_TOKEN is a Space secret. Names + match metadata only.
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

DATASET = os.environ.get("LEDGER_DATASET", "DeepSeekOracle/stock-market-masters-cashouts")
TOKEN = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
NAME_RE = re.compile(r"^[\w .'\-]{1,18}$", re.UNICODE)
MAX_ROWS = 4000
RATE_WINDOW = 3600
RATE_MAX = 20

LOCK = threading.Lock()
HITS: dict[str, list[float]] = {}
CACHE: dict[str, Any] = {"t": 0.0, "data": None}

app = FastAPI(title="Stock Market Masters TOP Cashout", docs_url=None, redoc_url=None)
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
        "game": "stock-market-masters",
        "title": "Stock Market Masters TOP Cashout",
        "updated": None,
        "cashouts": [],
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
        if not isinstance(data, dict) or not isinstance(data.get("cashouts"), list):
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
        commit_message="inscribe cashout",
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
    if body.get("event") != "cashout":
        return None, "only cashouts are inscribed"
    name = clean_name(body.get("name"))
    if not name:
        return None, "name rejected"
    worth = as_int(body.get("worth"), 0, 50_000_000)
    cash = as_int(body.get("cash"), 0, 50_000_000)
    rounds = as_int(body.get("rounds"), 1, 9999)
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
        rows = data.get("cashouts") or []
        if any(w.get("id") == rec["id"] for w in rows):
            return {"ok": True, "status": "duplicate", "id": rec["id"]}
        rows.append(rec)
        rows.sort(key=lambda w: (-int(w.get("worth") or 0), str(w.get("iso") or "")))
        data["cashouts"] = rows[:MAX_ROWS]
        data["updated"] = utc_now()
        data["game"] = "stock-market-masters"
        try:
            save_ledger(data)
        except Exception:
            CACHE["data"] = None
            return JSONResponse({"ok": False, "error": "inscribe failed"}, status_code=502)
    return {
        "ok": True,
        "status": "inscribed",
        "id": rec["id"],
        "rank": next((i + 1 for i, w in enumerate(data["cashouts"]) if w.get("id") == rec["id"]), None),
    }


@app.get("/", response_class=HTMLResponse)
def home():
    return """<!doctype html><html><head><meta charset="utf-8"><title>SMM TOP Cashout</title></head>
<body style="font-family:system-ui;background:#070b10;color:#e8eef4;padding:2rem">
<h1>Stock Market Masters TOP Cashout</h1>
<p><a href="https://chatagent.ca/games/stock-market-masters/ledger.html">Hall</a> · <a href="/ledger.json">ledger.json</a></p>
</body></html>"""
