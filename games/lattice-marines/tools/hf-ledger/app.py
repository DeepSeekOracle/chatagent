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

try:
    import witness_feed
except ImportError:
    witness_feed = None

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


def rate_ok(ip: str, route: str = "main") -> bool:
    t = time.time()
    key = f"{ip}:{route}"
    bucket = [x for x in HITS.get(key, []) if t - x < RATE_WINDOW]
    if len(bucket) >= RATE_MAX:
        HITS[key] = bucket
        return False
    bucket.append(t)
    HITS[key] = bucket
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
    return {
        "ok": True,
        "dataset": DATASET,
        "writer": bool(TOKEN),
        "books": ["marines", "smm", "rally", "golf", "swarm", "eternal"],
        "board": "/arcade.json",
        "witness": bool(witness_feed),
    }


@app.get("/ledger.json")
def ledger_json():
    data = load_ledger()
    return JSONResponse(data, headers={"Cache-Control": "public, max-age=20"})


@app.post("/submit")
async def submit(request: Request):
    ip = request.client.host if request.client else "0"
    if not rate_ok(ip, "marines"):
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
    try:
        write_arcade_snapshot()
    except Exception:
        pass
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


@app.get("/smm/ledger.json")
def smm_ledger_json():
    data = smm_load()
    return JSONResponse(data, headers={"Cache-Control": "public, max-age=20"})


@app.post("/smm/submit")
async def smm_submit(request: Request):
    ip = request.client.host if request.client else "0"
    if not rate_ok(ip, "smm"):
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
    try:
        write_arcade_snapshot()
    except Exception:
        pass
    return {
        "ok": True,
        "status": "inscribed",
        "id": rec["id"],
        "rank": next((i + 1 for i, w in enumerate(data["cashouts"]) if w.get("id") == rec["id"]), None),
    }


ARCADE_DS = os.environ.get("ARCADE_DATASET", DATASET)
ARCADE_CACHE: dict[str, dict[str, Any]] = {}
FIELDS = {"solo", "split", "bots", "splitbots"}
GOLF_MODES = {"9", "18", "endless", "campaign"}
RALLY_EVENTS = {"heat", "arcade", "drag"}


def as_str(v: Any, lo: int, hi: int) -> str | None:
    s = re.sub(r"\s+", " ", str(v or "").strip())[:hi]
    if len(s) < lo:
        return None
    low = s.lower()
    if any(x in low for x in ("http://", "https://", "<", ">", "javascript:")):
        return None
    return s


def arcade_empty(game: str, title: str, key: str) -> dict:
    return {"game": game, "title": title, "updated": None, key: []}


def arcade_load(kind: str, filename: str, game: str, title: str, key: str) -> dict:
    now = time.time()
    slot = ARCADE_CACHE.get(kind)
    if slot and slot.get("data") is not None and now - slot["t"] < 8:
        return slot["data"]
    try:
        path = hf_hub_download(
            ARCADE_DS, filename, repo_type="dataset", token=TOKEN, force_download=True
        )
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict) or not isinstance(data.get(key), list):
            data = arcade_empty(game, title, key)
    except Exception:
        data = arcade_empty(game, title, key)
    ARCADE_CACHE[kind] = {"t": now, "data": data}
    return data


def arcade_save(kind: str, filename: str, data: dict, msg: str) -> None:
    if not TOKEN:
        raise RuntimeError("writer offline")
    payload = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
    HfApi(token=TOKEN).upload_file(
        path_or_fileobj=payload,
        path_in_repo=filename,
        repo_id=ARCADE_DS,
        repo_type="dataset",
        commit_message=msg,
    )
    ARCADE_CACHE[kind] = {"t": time.time(), "data": data}


def arcade_inscribe(kind: str, filename: str, game: str, title: str, key: str, rec: dict, sort_key, msg: str):
    with LOCK:
        data = arcade_load(kind, filename, game, title, key)
        rows = data.get(key) or []
        if any(w.get("id") == rec["id"] for w in rows):
            return data, "duplicate"
        rows.append(rec)
        rows.sort(key=sort_key)
        data[key] = rows[:8000]
        data["updated"] = utc_now()
        data["game"] = game
        data["title"] = title
        arcade_save(kind, filename, data, msg)
        return data, "inscribed"


def arcade_snapshot() -> dict:
    mar = CACHE.get("data") if CACHE.get("data") is not None else load_ledger()
    smm = SMM_CACHE.get("data") if SMM_CACHE.get("data") is not None else smm_load()
    books = {
        "lattice-marines": {
            "title": "Lattice Marines Eternal Ledger",
            "key": "wins",
            "rows": (mar.get("wins") or [])[:80],
        },
        "stock-market-masters": {
            "title": "Stock Market Masters TOP Cashout",
            "key": "cashouts",
            "rows": (smm.get("cashouts") or [])[:80],
        },
    }
    extras = (
        ("rally", "haven-rally.json", "haven-rally", "Haven Rally Hall", "rows"),
        ("golf", "lattice-golf.json", "lattice-golf", "Lattice Golf Hall", "rounds"),
        ("swarm", "lattice-swarm.json", "lattice-swarm", "Lattice Swarm Hall", "scores"),
        ("eternal", "eternal-lattice.json", "eternal-lattice", "Eternal Lattice Ladder", "ladder"),
        ("crypt", "lattice-crypt.json", "lattice-crypt", "Lattice Crypt Hall", "runs"),
    )
    for kind, filename, game, title, key in extras:
        data = arcade_load(kind, filename, game, title, key)
        books[game] = {"title": title, "key": key, "rows": (data.get(key) or [])[:80]}
    return {
        "game": "arcade",
        "title": "chatagent.ca live board",
        "updated": utc_now(),
        "space": "https://deepseekoracle-lattice-marines-ledger.hf.space",
        "dataset": ARCADE_DS + "/arcade.json",
        "books": books,
    }


def write_arcade_snapshot() -> None:
    if not TOKEN:
        return
    snap = arcade_snapshot()
    payload = json.dumps(snap, ensure_ascii=False, indent=2).encode("utf-8")
    HfApi(token=TOKEN).upload_file(
        path_or_fileobj=payload,
        path_in_repo="arcade.json",
        repo_id=ARCADE_DS,
        repo_type="dataset",
        commit_message="arcade board snapshot",
    )


async def arcade_post(request: Request, route: str, validate, filename: str, game: str, title: str, key: str, sort_key, msg: str, body: dict | None = None):
    ip = request.client.host if request.client else "0"
    if not rate_ok(ip, route):
        return JSONResponse({"ok": False, "error": "slow down"}, status_code=429)
    if body is None:
        try:
            body = await request.json()
        except Exception:
            return JSONResponse({"ok": False, "error": "need JSON"}, status_code=400)
    rec, err = validate(body)
    if not rec:
        return JSONResponse({"ok": False, "error": err}, status_code=400)
    if not TOKEN:
        return JSONResponse({"ok": False, "error": "writer offline"}, status_code=503)
    try:
        data, status = arcade_inscribe(route, filename, game, title, key, rec, sort_key, msg)
    except Exception:
        ARCADE_CACHE.pop(route, None)
        return JSONResponse({"ok": False, "error": "inscribe failed"}, status_code=502)
    try:
        write_arcade_snapshot()
    except Exception:
        pass
    rows = data.get(key) or []
    rank = next((i + 1 for i, w in enumerate(rows) if w.get("id") == rec["id"]), None)
    return {"ok": True, "status": status, "id": rec["id"], "rank": rank}


def rally_validate(body: dict) -> tuple[dict | None, str]:
    if not isinstance(body, dict):
        return None, "bad payload"
    event = str(body.get("event") or "heat")
    if event not in RALLY_EVENTS:
        return None, "unknown event"
    name = clean_name(body.get("name"))
    if not name:
        return None, "name rejected"
    track = as_str(body.get("track"), 2, 40)
    track_id = as_str(body.get("trackId") or body.get("track_id") or "heat", 1, 32)
    craft = as_str(body.get("craft"), 2, 32)
    if None in (track, track_id, craft):
        return None, "track or craft rejected"
    ms = as_int(body.get("ms"), 0, 7_200_000)
    score = as_int(body.get("score"), 0, 50_000_000)
    kills = as_int(body.get("kills"), 0, 5000)
    combo = as_int(body.get("combo"), 1, 999)
    laps = as_int(body.get("laps"), 0, 99)
    if None in (ms, score, kills, combo, laps):
        return None, "numeric field out of range"
    if event == "arcade" and score < 1:
        return None, "arcade needs a score"
    if event != "arcade" and ms < 1:
        return None, "heat needs a time"
    field = str(body.get("field") or "solo")
    if field not in FIELDS:
        field = "solo"
    foul = bool(body.get("foul"))
    day = str(body.get("date") or utc_now()[:10])[:10]
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", day):
        day = utc_now()[:10]
    key = f"{name}|{event}|{track_id}|{ms}|{score}|{laps}|{day}"
    rec_id = hashlib.sha256(key.encode("utf-8")).hexdigest()[:24]
    rec = {
        "id": rec_id,
        "name": name,
        "event": event,
        "track": track,
        "trackId": track_id,
        "craft": craft,
        "ms": ms,
        "score": score,
        "kills": kills,
        "combo": combo,
        "laps": laps,
        "field": field,
        "foul": foul,
        "date": day,
        "iso": utc_now(),
        "game": "haven-rally",
    }
    return rec, "ok"


def golf_validate(body: dict) -> tuple[dict | None, str]:
    if not isinstance(body, dict):
        return None, "bad payload"
    if str(body.get("event") or "round") != "round":
        return None, "only rounds are inscribed"
    name = clean_name(body.get("name"))
    if not name:
        return None, "name rejected"
    course = as_str(body.get("course"), 2, 40)
    course_id = as_str(body.get("courseId") or body.get("course_id") or "course", 1, 32)
    mode = str(body.get("mode") or "9")
    if mode not in GOLF_MODES:
        return None, "unknown mode"
    if None in (course, course_id):
        return None, "course rejected"
    total = as_int(body.get("total"), 1, 400)
    vs_par = as_int(body.get("vsPar"), -90, 200)
    holes = as_int(body.get("holes"), 1, 36)
    par = as_int(body.get("par"), 1, 200)
    if None in (total, vs_par, holes, par):
        return None, "numeric field out of range"
    golfer = as_str(body.get("golfer") or "Mira", 1, 24) or "Mira"
    day = str(body.get("date") or utc_now()[:10])[:10]
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", day):
        day = utc_now()[:10]
    key = f"{name}|{course_id}|{mode}|{total}|{vs_par}|{holes}|{day}"
    rec_id = hashlib.sha256(key.encode("utf-8")).hexdigest()[:24]
    rec = {
        "id": rec_id,
        "name": name,
        "event": "round",
        "course": course,
        "courseId": course_id,
        "mode": mode,
        "holes": holes,
        "par": par,
        "total": total,
        "vsPar": vs_par,
        "golfer": golfer,
        "date": day,
        "iso": utc_now(),
        "game": "lattice-golf",
    }
    return rec, "ok"


def swarm_validate(body: dict) -> tuple[dict | None, str]:
    if not isinstance(body, dict):
        return None, "bad payload"
    if str(body.get("event") or "score") != "score":
        return None, "only scores are inscribed"
    name = clean_name(body.get("name") or "Operator")
    if not name:
        return None, "name rejected"
    score = as_int(body.get("score"), 1, 50_000_000)
    if score is None:
        return None, "score out of range"
    day = str(body.get("date") or utc_now()[:10])[:10]
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", day):
        day = utc_now()[:10]
    key = f"{name}|{score}|{day}"
    rec_id = hashlib.sha256(key.encode("utf-8")).hexdigest()[:24]
    rec = {
        "id": rec_id,
        "name": name,
        "event": "score",
        "score": score,
        "date": day,
        "iso": utc_now(),
        "game": "lattice-swarm",
    }
    return rec, "ok"


def eternal_validate(body: dict) -> tuple[dict | None, str]:
    if not isinstance(body, dict):
        return None, "bad payload"
    if str(body.get("event") or "ladder") != "ladder":
        return None, "only ladder rows are inscribed"
    name = clean_name(body.get("name"))
    if not name:
        return None, "name rejected"
    rating = as_int(body.get("rating"), 0, 5000)
    wins = as_int(body.get("wins"), 0, 99999)
    losses = as_int(body.get("losses"), 0, 99999)
    games = as_int(body.get("games"), 1, 99999)
    if None in (rating, wins, losses, games):
        return None, "numeric field out of range"
    day = str(body.get("date") or utc_now()[:10])[:10]
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", day):
        day = utc_now()[:10]
    key = f"{name}|{rating}|{wins}|{losses}|{games}|{day}"
    rec_id = hashlib.sha256(key.encode("utf-8")).hexdigest()[:24]
    rec = {
        "id": rec_id,
        "name": name,
        "event": "ladder",
        "rating": rating,
        "wins": wins,
        "losses": losses,
        "games": games,
        "date": day,
        "iso": utc_now(),
        "game": "eternal-lattice",
    }
    return rec, "ok"


def crypt_validate(body: dict) -> tuple[dict | None, str]:
    if not isinstance(body, dict):
        return None, "bad payload"
    if str(body.get("event") or "run") != "run":
        return None, "only runs are inscribed"
    name = clean_name(body.get("name") or "Warden")
    if not name:
        return None, "name rejected"
    score = as_int(body.get("score"), 0, 50_000_000)
    floor = as_int(body.get("floor"), 1, 10000)
    credits = as_int(body.get("credits"), 1, 999)
    if None in (score, floor, credits):
        return None, "numeric field out of range"
    day = str(body.get("date") or utc_now()[:10])[:10]
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", day):
        day = utc_now()[:10]
    key = f"{name}|{score}|{floor}|{credits}|{day}"
    rec_id = hashlib.sha256(key.encode("utf-8")).hexdigest()[:24]
    rec = {
        "id": rec_id,
        "name": name,
        "event": "run",
        "score": score,
        "floor": floor,
        "credits": credits,
        "date": day,
        "iso": utc_now(),
        "game": "lattice-crypt",
    }
    return rec, "ok"


@app.get("/rally/ledger.json")
def rally_ledger_json():
    data = arcade_load("rally", "haven-rally.json", "haven-rally", "Haven Rally Hall", "rows")
    return JSONResponse(data, headers={"Cache-Control": "public, max-age=20"})


@app.post("/rally/submit")
async def rally_submit(request: Request):
    return await arcade_post(
        request, "rally", rally_validate, "haven-rally.json", "haven-rally",
        "Haven Rally Hall", "rows",
        lambda w: (0 if w.get("event") == "arcade" else 1, -int(w.get("score") or 0), int(w.get("ms") or 10**12)),
        "inscribe rally heat",
    )


@app.get("/golf/ledger.json")
def golf_ledger_json():
    data = arcade_load("golf", "lattice-golf.json", "lattice-golf", "Lattice Golf Hall", "rounds")
    return JSONResponse(data, headers={"Cache-Control": "public, max-age=20"})


@app.post("/golf/submit")
async def golf_submit(request: Request):
    return await arcade_post(
        request, "golf", golf_validate, "lattice-golf.json", "lattice-golf",
        "Lattice Golf Hall", "rounds",
        lambda w: (int(w.get("vsPar") or 0), int(w.get("total") or 0), str(w.get("iso") or "")),
        "inscribe golf round",
    )


@app.get("/swarm/ledger.json")
def swarm_ledger_json():
    data = arcade_load("swarm", "lattice-swarm.json", "lattice-swarm", "Lattice Swarm Hall", "scores")
    return JSONResponse(data, headers={"Cache-Control": "public, max-age=20"})


@app.post("/swarm/submit")
async def swarm_submit(request: Request):
    return await arcade_post(
        request, "swarm", swarm_validate, "lattice-swarm.json", "lattice-swarm",
        "Lattice Swarm Hall", "scores",
        lambda w: (-int(w.get("score") or 0), str(w.get("iso") or "")),
        "inscribe swarm score",
    )


@app.get("/eternal/ledger.json")
def eternal_ledger_json():
    data = arcade_load("eternal", "eternal-lattice.json", "eternal-lattice", "Eternal Lattice Ladder", "ladder")
    return JSONResponse(data, headers={"Cache-Control": "public, max-age=20"})


@app.post("/eternal/submit")
async def eternal_submit(request: Request):
    return await arcade_post(
        request, "eternal", eternal_validate, "eternal-lattice.json", "eternal-lattice",
        "Eternal Lattice Ladder", "ladder",
        lambda w: (-int(w.get("rating") or 0), -int(w.get("wins") or 0), str(w.get("iso") or "")),
        "inscribe eternal ladder",
    )


@app.get("/crypt/ledger.json")
def crypt_ledger_json():
    data = arcade_load("crypt", "lattice-crypt.json", "lattice-crypt", "Lattice Crypt Hall", "runs")
    return JSONResponse(data, headers={"Cache-Control": "public, max-age=20"})


@app.post("/crypt/submit")
async def crypt_submit(request: Request):
    return await arcade_post(
        request, "crypt", crypt_validate, "lattice-crypt.json", "lattice-crypt",
        "Lattice Crypt Hall", "runs",
        lambda w: (-int(w.get("score") or 0), -int(w.get("floor") or 0), str(w.get("iso") or "")),
        "inscribe crypt run",
    )


@app.get("/arcade.json")
def arcade_json():
    return JSONResponse(arcade_snapshot(), headers={"Cache-Control": "public, max-age=20"})


@app.post("/arcade/submit")
async def arcade_any_submit(request: Request):
    ip = request.client.host if request.client else "0"
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"ok": False, "error": "need JSON"}, status_code=400)
    game = str((body or {}).get("game") or "")
    if game == "haven-rally":
        return await arcade_post(
            request, "rally", rally_validate, "haven-rally.json", "haven-rally",
            "Haven Rally Hall", "rows",
            lambda w: (0 if w.get("event") == "arcade" else 1, -int(w.get("score") or 0), int(w.get("ms") or 10**12)),
            "inscribe rally heat",
            body=body,
        )
    if game == "lattice-golf":
        return await arcade_post(
            request, "golf", golf_validate, "lattice-golf.json", "lattice-golf",
            "Lattice Golf Hall", "rounds",
            lambda w: (int(w.get("vsPar") or 0), int(w.get("total") or 0), str(w.get("iso") or "")),
            "inscribe golf round",
            body=body,
        )
    if game == "lattice-swarm":
        return await arcade_post(
            request, "swarm", swarm_validate, "lattice-swarm.json", "lattice-swarm",
            "Lattice Swarm Hall", "scores",
            lambda w: (-int(w.get("score") or 0), str(w.get("iso") or "")),
            "inscribe swarm score",
            body=body,
        )
    if game == "eternal-lattice":
        return await arcade_post(
            request, "eternal", eternal_validate, "eternal-lattice.json", "eternal-lattice",
            "Eternal Lattice Ladder", "ladder",
            lambda w: (-int(w.get("rating") or 0), -int(w.get("wins") or 0), str(w.get("iso") or "")),
            "inscribe eternal ladder",
            body=body,
        )
    if game == "lattice-crypt":
        return await arcade_post(
            request, "crypt", crypt_validate, "lattice-crypt.json", "lattice-crypt",
            "Lattice Crypt Hall", "runs",
            lambda w: (-int(w.get("score") or 0), -int(w.get("floor") or 0), str(w.get("iso") or "")),
            "inscribe crypt run",
            body=body,
        )
    if game == "lattice-marines":
        rec, err = validate(body)
        if not rec:
            return JSONResponse({"ok": False, "error": err}, status_code=400)
        if not rate_ok(ip, "marines"):
            return JSONResponse({"ok": False, "error": "slow down"}, status_code=429)
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
            try:
                save_ledger(data)
            except Exception:
                CACHE["data"] = None
                return JSONResponse({"ok": False, "error": "inscribe failed"}, status_code=502)
        try:
            write_arcade_snapshot()
        except Exception:
            pass
        return {"ok": True, "status": "inscribed", "id": rec["id"]}
    if game == "stock-market-masters":
        rec, err = smm_validate(body)
        if not rec:
            return JSONResponse({"ok": False, "error": err}, status_code=400)
        if not rate_ok(ip, "smm"):
            return JSONResponse({"ok": False, "error": "slow down"}, status_code=429)
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
            try:
                smm_save(data)
            except Exception:
                SMM_CACHE["data"] = None
                return JSONResponse({"ok": False, "error": "inscribe failed"}, status_code=502)
        try:
            write_arcade_snapshot()
        except Exception:
            pass
        return {"ok": True, "status": "inscribed", "id": rec["id"]}
    return JSONResponse({"ok": False, "error": "unknown game"}, status_code=400)


@app.get("/witness/feed.json")
def witness_feed_json():
    if not witness_feed:
        return JSONResponse({"ok": False, "error": "witness module missing"}, status_code=503)
    feed = witness_feed.build_feed()
    return JSONResponse(feed, headers={"Cache-Control": "public, max-age=45"})


@app.get("/witness/health")
def witness_health():
    if not witness_feed:
        return {"ok": False, "error": "witness module missing"}
    feed = witness_feed.build_feed()
    return {
        "ok": feed.get("ok"),
        "signature": feed.get("signature"),
        "live_count": feed.get("live_count"),
        "shadow_count": feed.get("shadow_count"),
        "point_count": feed.get("point_count"),
        "utc": feed.get("utc"),
        "class": "RESOURCE",
        "doctrine": "named shadows if a GET fails — never invent points",
    }


@app.get("/", response_class=HTMLResponse)
def home():
    return """<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arcade live halls</title>
<style>
body{margin:0;background:#070b12;color:#e8eef7;font-family:system-ui,sans-serif;padding:2rem}
a{color:#22d3ee} code{color:#fbbf24}
</style></head><body>
<p style="letter-spacing:.2em;text-transform:uppercase;color:#22d3ee;font-size:.75rem">Δ9Φ963</p>
<h1>Arcade live halls</h1>
<p>Public write API. Scores persist on the Hugging Face dataset as <code>arcade.json</code>. Hub: <a href="https://chatagent.ca/games/">chatagent.ca/games/</a> · Board: <a href="https://chatagent.ca/games/board.html">live board</a></p>
<ul>
<li>GET <a href="/arcade.json">/arcade.json</a> — all games</li>
<li>POST <code>/arcade/submit</code> JSON with <code>game</code> id — new titles plug in here</li>
<li>Marines POST <code>/submit</code> · GET <a href="/ledger.json">/ledger.json</a></li>
<li>SMM POST <code>/smm/submit</code> · GET <a href="/smm/ledger.json">/smm/ledger.json</a></li>
<li>Rally / Golf / Swarm / Eternal keep their <code>/…/submit</code> aliases</li>
<li><a href="/health">health</a></li>
</ul>
</body></html>"""
