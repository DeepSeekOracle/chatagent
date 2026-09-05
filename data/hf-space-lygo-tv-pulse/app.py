"""Anonymous live occupancy for LYGO TV. No PII. RESOURCE pulse, not canon."""
from __future__ import annotations

import threading
import time
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, Field

LIVE_TTL = 75.0
MAX_SIDS = 20000
app = FastAPI(title="LYGO TV Pulse", docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://(chatagent\.ca|www\.chatagent\.ca|deepseekoracle\.github\.io)",
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
    max_age=3600,
)

_lock = threading.Lock()
_seen: dict[str, float] = {}
_day = ""
_pulses_today = 0


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _prune(now: float) -> None:
    global _day, _pulses_today
    dead = [k for k, t in _seen.items() if now - t > LIVE_TTL]
    for k in dead:
        _seen.pop(k, None)
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if day != _day:
        _day = day
        _pulses_today = 0
    if len(_seen) > MAX_SIDS:
        oldest = sorted(_seen.items(), key=lambda kv: kv[1])[: len(_seen) - MAX_SIDS]
        for k, _ in oldest:
            _seen.pop(k, None)


def _stats(now: float) -> dict:
    _prune(now)
    return {
        "live": len(_seen),
        "pulses_today": _pulses_today,
        "updated_utc": utc_now(),
        "ttl_sec": int(LIVE_TTL),
        "page": "https://chatagent.ca/sources/",
        "class": "RESOURCE",
        "note": "Anonymous occupancy. Not a fake ticker.",
    }


class PulseIn(BaseModel):
    sid: str = Field(min_length=8, max_length=80)
    page: str = Field(default="sources", max_length=40)


@app.get("/", response_class=HTMLResponse)
def home() -> str:
    return (
        "<!doctype html><meta charset=utf-8><title>LYGO TV Pulse</title>"
        "<body style='font-family:sans-serif;background:#05070d;color:#e8eef7;padding:2rem'>"
        "<h1>LYGO TV Pulse</h1>"
        "<p>Anonymous live count for "
        "<a href='https://chatagent.ca/sources/' style='color:#7dd3fc'>chatagent.ca/sources</a>.</p>"
        "<p><a href='/stats' style='color:#d4a017'>/stats</a></p></body>"
    )


@app.get("/health")
def health() -> dict:
    return {"ok": True, "updated_utc": utc_now()}


@app.get("/stats")
def stats() -> JSONResponse:
    with _lock:
        return JSONResponse(_stats(time.time()))


@app.get("/pulse")
def pulse_get(sid: str = "") -> JSONResponse:
    return _pulse(sid or "")


@app.post("/pulse")
def pulse_post(body: PulseIn) -> JSONResponse:
    return _pulse(body.sid)


def _pulse(sid: str) -> JSONResponse:
    sid = "".join(ch for ch in sid if ch.isalnum() or ch in "-_")[:80]
    if len(sid) < 8:
        return JSONResponse({"error": "sid required"}, status_code=400)
    now = time.time()
    global _pulses_today
    with _lock:
        _prune(now)
        _seen[sid] = now
        _pulses_today += 1
        return JSONResponse(_stats(now))
