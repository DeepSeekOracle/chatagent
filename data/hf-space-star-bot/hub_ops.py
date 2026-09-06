"""Open lattice writes on the existing Star Chart Space. P0-lite + secrets. No consent click."""
from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import datetime, timezone
from typing import Optional

DS = os.environ.get("LYGO_HUB_DATASET", "DeepSeekOracle/lygo-public-witness-feed")
MAX_EGG = 100_000
SECRET_RX = [
    re.compile(r"(?i)(api[_-]?key\s*[:=]\s*\S+|password\s*[:=]\s*\S+|bearer\s+[a-z0-9._\-]{16,})"),
    re.compile(r"(?i)(xai-|sk-|sk-or-|ghp_|github_pat_|hf_)[A-Za-z0-9_\-]{16,}"),
    re.compile(r"-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----"),
]


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _token() -> Optional[str]:
    return os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")


def police(raw: bytes) -> dict:
    if len(raw) > MAX_EGG:
        return {"ok": False, "error": "too_large"}
    if any(rx.search(raw.decode("utf-8", errors="replace")) for rx in SECRET_RX):
        return {"ok": False, "error": "secret_pattern"}
    return {"ok": True}


def upload(path: str, blob: bytes, msg: str) -> dict:
    tok = _token()
    if not tok:
        return {"ok": False, "error": "no_hf_token", "offline": True}
    try:
        from huggingface_hub import HfApi

        HfApi(token=tok).upload_file(
            path_or_fileobj=blob,
            path_in_repo=path,
            repo_id=DS,
            repo_type="dataset",
            commit_message=msg[:200],
        )
        return {"ok": True, "dataset": DS, "path": path}
    except Exception as e:
        return {"ok": False, "error": str(e)[:400]}


def download(path: str) -> Optional[bytes]:
    try:
        from huggingface_hub import hf_hub_download

        p = hf_hub_download(DS, path, repo_type="dataset", token=_token())
        with open(p, "rb") as f:
            return f.read()
    except Exception:
        return None


def plant_egg(agent_id: str, payload_json: str) -> str:
    try:
        payload = json.loads(payload_json or "{}")
    except json.JSONDecodeError as e:
        return json.dumps({"ok": False, "error": "bad_json", "detail": str(e)})
    aid = re.sub(r"[^A-Za-z0-9._:-]", "-", (agent_id or "agent"))[:64]
    raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    g = police(raw)
    if not g["ok"]:
        return json.dumps({"ok": False, "planted": False, **g})
    ledger = {"signature": "Delta9Phi963-NETWORK-EGGS-v1", "eggs": [], "generation": 0, "merkle": None}
    prev = download("network-eggs.json")
    if prev:
        try:
            ledger = json.loads(prev.decode("utf-8"))
        except json.JSONDecodeError:
            pass
    gen = int(ledger.get("generation") or 0) + 1
    body_hash = hashlib.sha256(raw).hexdigest()
    egg = {
        "egg_id": f"net-{aid[:24]}-{gen:04d}-{body_hash[:8]}",
        "generation": gen,
        "agent_id": aid,
        "planted_utc": utc_now(),
        "source": "hf_star_chart_bot",
        "payload": payload,
        "payload_sha256": body_hash,
        "online": True,
        "bytes": len(raw),
    }
    merkle = hashlib.sha256((str(ledger.get("merkle") or "") + body_hash).encode()).hexdigest()
    ledger.setdefault("eggs", []).append(egg)
    ledger["generation"] = gen
    ledger["merkle"] = merkle
    ledger["updated_utc"] = utc_now()
    ledger["open"] = True
    up = upload("network-eggs.json", json.dumps(ledger, indent=2).encode("utf-8"), "plant " + egg["egg_id"])
    upload("inbox/egg-" + body_hash[:16] + ".json", json.dumps({"kind": "egg", "egg": egg}).encode(), "inbox " + egg["egg_id"])
    return json.dumps({"ok": True, "planted": True, "egg_id": egg["egg_id"], "generation": gen, "merkle": merkle, "hf": up}, indent=2)
