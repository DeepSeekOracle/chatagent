"""LYGO Lattice Kernel auditor — GET slots, Continuum-style claims, optional HF write."""
from __future__ import annotations

import ipaddress
import json
import os
import socket
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlparse

UA = "LYGO-Lattice-Kernel/1.0 (+https://chatagent.ca/lattice/)"
DS = "DeepSeekOracle/lygo-public-witness-feed"
SIG = "Delta9Phi963-LATTICE-KERNEL-v1.0.0"
STALE_DAYS = 10
FEED = "https://deepseekoracle.github.io/lygo-protocol-stack/haven_star_chart/haven_star_chart_feed.json"
AGORA = "https://deepseekoracle.github.io/lygo-protocol-stack/agent-agora/api/pulse.json"
OVERVIEW = "https://deepseekoracle.github.io/lygo-protocol-stack/GIT_LATTICE_OVERVIEW.json"

def _slots_path() -> Path:
    here = Path(__file__).resolve().parent
    for cand in (here / "lattice" / "slots.json", here.parent / "lattice" / "slots.json"):
        if cand.is_file():
            return cand
    return here.parent / "lattice" / "slots.json"


SLOTS_PATH = _slots_path()

ALLOW_HOSTS = frozenset(
    {
        "deepseekoracle.github.io",
        "huggingface.co",
        "cdn-lfs.huggingface.co",
        "earthquake.usgs.gov",
        "eonet.gsfc.nasa.gov",
        "api.wheretheiss.at",
        "chatagent.ca",
        "www.chatagent.ca",
        "eternalhaven.ca",
    }
)


def _is_public_ip(host: str) -> bool:
    try:
        infos = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except OSError:
        return False
    for info in infos:
        try:
            ip = ipaddress.ip_address(info[4][0])
        except ValueError:
            return False
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return False
    return True


def allowed_url(url: str) -> bool:
    p = urlparse(url)
    if p.scheme != "https" or p.username or p.password:
        return False
    host = (p.hostname or "").lower()
    return host in ALLOW_HOSTS and _is_public_ip(host)


class _AllowRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not allowed_url(newurl):
            raise urllib.error.HTTPError(newurl, code, "redirect off allowlist", headers, fp)
        return urllib.request.HTTPRedirectHandler.redirect_request(
            self, req, fp, code, msg, headers, newurl
        )


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _token() -> Optional[str]:
    t = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    if t:
        return t
    try:
        from huggingface_hub import get_token

        return get_token()
    except Exception:
        return None


def ping(url: str) -> dict[str, Any]:
    if not allowed_url(url):
        return {"ok": False, "error": "blocked_host", "json": None}
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    opener = urllib.request.build_opener(_AllowRedirect)
    try:
        with opener.open(req, timeout=16) as r:
            raw = r.read(1_500_000)
            text = raw.decode("utf-8", errors="replace")
            js = None
            try:
                js = json.loads(text)
            except json.JSONDecodeError:
                js = None
            return {"ok": True, "status": r.status, "json": js, "bytes": len(raw)}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200], "json": None}


def load_slots() -> list[dict[str, Any]]:
    if SLOTS_PATH.is_file():
        doc = json.loads(SLOTS_PATH.read_text(encoding="utf-8"))
        return list(doc.get("slots") or [])
    return []


def chain_ok(entries: list) -> bool:
    if not entries:
        return False
    for i in range(len(entries) - 1):
        if (entries[i].get("prev_hash") or "") != (entries[i + 1].get("entry_hash") or ""):
            return False
    return True


def audit() -> dict[str, Any]:
    slots = load_slots()
    rows = []
    star = agora = overview = None
    for s in slots:
        url = s.get("url") or ""
        if url.startswith("/"):
            url = "https://chatagent.ca" + url
        got = ping(url)
        live = bool(got.get("ok"))
        note = "live" if live else (got.get("error") or "named")
        if s.get("expect") == "json" and live and not got.get("json"):
            live = False
            note = "expected JSON"
        js = got.get("json")
        if s.get("id") == "star_feed" and js:
            star = js
            if not chain_ok(js.get("entries") or []) or js.get("chain_valid") is False:
                live = False
                note = "chain break"
        if s.get("id") == "agora" and js:
            agora = js
        if s.get("id") == "overview" and js:
            overview = js
        era = s.get("era") or "now"
        rows.append(
            {
                "id": s.get("id"),
                "title": s.get("title"),
                "class": s.get("class"),
                "era": era,
                "live": live,
                "note": note,
                "url": url,
            }
        )
    canon = [r for r in rows if r["class"] == "CANON"]
    future = [r for r in rows if r["class"] == "FUTURE" or r["era"] == "future"]
    canon_live = sum(1 for r in canon if r["live"])
    canon_miss = len(canon) - canon_live
    chk = chain_ok((star or {}).get("entries") or []) if star else False
    published = bool((star or {}).get("chain_valid")) if star else False
    roots = bool(star and agora and star.get("chain_root") and star.get("chain_root") == agora.get("feed_root"))
    age = None
    if overview and overview.get("generated_utc"):
        try:
            gen = datetime.fromisoformat(str(overview["generated_utc"]).replace("Z", "+00:00"))
            age = (datetime.now(timezone.utc) - gen).total_seconds() / 86400
        except ValueError:
            age = None
    stale = age is not None and age > STALE_DAYS
    claims = [
        {"claim": "star_chain_valid", "pass": bool(chk and published)},
        {"claim": "agora_feed_root_matches_star_chain_root", "pass": roots},
        {"claim": "overview_fresh_10d", "pass": not stale if age is not None else False},
        {"claim": "canon_slots_live", "pass": canon_miss == 0, "live": canon_live, "total": len(canon)},
    ]
    y = "ALIGNED"
    if stale or (not roots) or canon_miss >= 1:
        y = "DRIFT"
    if not (chk and published) or canon_live < max(1, (len(canon) + 1) // 2):
        y = "SHADOW"
    if canon_miss == 0 and chk and published and roots and not stale:
        y = "ALIGNED"
    return {
        "signature": SIG,
        "utc": utc_now(),
        "yield": y,
        "live": sum(1 for r in rows if r["era"] != "future" and r["class"] != "FUTURE" and r["live"]),
        "miss": sum(1 for r in rows if r["era"] != "future" and r["class"] != "FUTURE" and not r["live"]),
        "future": len(future),
        "claims": claims,
        "extras": {
            "star": {
                "chain_root": (star or {}).get("chain_root"),
                "seq": ((star or {}).get("entries") or [{}])[0].get("seq"),
            },
            "agora": {"feed_root": (agora or {}).get("feed_root"), "nodes": (agora or {}).get("chart_nodes")},
            "overview_age_days": None if age is None else round(age, 1),
        },
        "slots": rows,
        "autonomous": True,
        "live_star_chart_ingest": False,
        "doctrine": "FUTURE never fails the kernel. Human remains publisher.",
    }


def write_audit(doc: Optional[dict[str, Any]] = None) -> str:
    doc = doc or audit()
    blob = json.dumps(doc, indent=2).encode("utf-8")
    token = _token()
    if not token:
        return "Cannot write dataset without HF token.\n" + blob.decode("utf-8")
    from huggingface_hub import HfApi

    HfApi(token=token).upload_file(
        path_or_fileobj=blob,
        path_in_repo="lattice-audit.json",
        repo_id=DS,
        repo_type="dataset",
        commit_message="lattice-audit " + doc.get("utc", utc_now()),
    )
    return "Wrote lattice-audit.json to " + DS + "\n" + blob.decode("utf-8")[:4000]


if __name__ == "__main__":
    print(write_audit())
