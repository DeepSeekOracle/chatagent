"""LYGO Star Chart monitor — GET canon feed, optional HF dataset write.

Never appends forged hashes to haven_star_chart_feed.json.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import datetime, timezone
from typing import Any, Optional

from net import https_get

UA = "LYGO-StarChart-Bot/1.0 (+https://huggingface.co/spaces/DeepSeekOracle/lygo-star-chart-bot)"
FEED = "https://deepseekoracle.github.io/lygo-protocol-stack/haven_star_chart/haven_star_chart_feed.json"
DS = "DeepSeekOracle/lygo-public-witness-feed"
SIG = "Delta9Phi963-STAR-MONITOR-v1.0.0"
MAX_PROPOSAL_BYTES = 64_000
AGENT_RE = re.compile(r"^[A-Za-z0-9._:-]{1,64}$")
SECRET_KEY = re.compile(r"(token|secret|password|passwd|api[_-]?key|authorization|private_key|hf_)", re.I)


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


def ping_feed() -> dict[str, Any]:
    try:
        raw = https_get(FEED, UA, timeout=20, max_bytes=2_000_000)
        data = json.loads(raw.decode("utf-8"))
    except Exception as e:
        return {
            "signature": SIG,
            "utc": utc_now(),
            "class": "CANON_MONITOR",
            "feed_url": FEED,
            "ok": False,
            "error": str(e)[:240],
            "payload": None,
            "doctrine": "Named miss. Never invent a chain.",
        }
    entries = data.get("entries") or []
    errs: list[str] = []
    for i in range(len(entries) - 1):
        a, b = entries[i], entries[i + 1]
        if (a.get("prev_hash") or "") != (b.get("entry_hash") or ""):
            errs.append("break_at_seq_" + str(a.get("seq")))
            break
    latest = entries[0] if entries else {}
    latest_status: dict[str, str] = {}
    for e in entries:
        nid = str(e.get("node_id") or "")
        if nid and nid not in latest_status:
            latest_status[nid] = str(e.get("status") or "")
    return {
        "signature": SIG,
        "utc": utc_now(),
        "class": "CANON_MONITOR",
        "feed_url": FEED,
        "ok": True,
        "chain_valid_published": data.get("chain_valid"),
        "chain_valid_checked": len(errs) == 0 and bool(entries),
        "chain_errors": errs,
        "entry_count": data.get("entry_count") or len(entries),
        "chain_root": data.get("chain_root"),
        "updated_utc": data.get("updated_utc"),
        "latest": {
            "seq": latest.get("seq"),
            "event_type": latest.get("event_type"),
            "status": latest.get("status"),
            "node_id": latest.get("node_id"),
            "node_name": latest.get("node_name"),
            "agent_id": latest.get("agent_id"),
            "skill_slug": latest.get("skill_slug"),
            "entry_hash": latest.get("entry_hash"),
            "event_utc": latest.get("event_utc"),
        },
        "pending_count": sum(1 for s in latest_status.values() if s == "PENDING"),
        "accepted_count": sum(1 for s in latest_status.values() if s == "ACCEPTED"),
        "ledger_pending_events": sum(1 for e in entries if e.get("status") == "PENDING"),
        "recent": [
            {
                "seq": e.get("seq"),
                "status": e.get("status"),
                "event_type": e.get("event_type"),
                "node_id": e.get("node_id"),
                "agent_id": e.get("agent_id"),
            }
            for e in entries[:12]
        ],
        "doctrine": "Monitor writes here. Canonical feed only after steward ingest. Never forge hashes.",
    }


def format_pulse_md(mon: dict[str, Any]) -> str:
    ok = bool(mon.get("ok"))
    checked = bool(mon.get("chain_valid_checked"))
    published = bool(mon.get("chain_valid_published"))
    if not ok:
        yield_ = "NAMED_MISS"
    elif checked and published:
        yield_ = "ALIGNED"
    else:
        yield_ = "DRIFT"
    latest = mon.get("latest") or {}
    lines = [
        f"## Star Chart pulse — **{yield_}**",
        "",
        f"- utc `{mon.get('utc') or ''}`",
        f"- feed GET `{'ok' if ok else 'fail'}`"
        + (f" — `{mon.get('error')}`" if mon.get("error") else ""),
        f"- published `chain_valid` `{published}` · checked `{checked}`",
        f"- entries `{mon.get('entry_count')}` · seq `{latest.get('seq')}`",
        f"- chain_root `{mon.get('chain_root') or '—'}`",
        f"- latest `{latest.get('status') or '—'}` `{latest.get('node_id') or '—'}` "
        f"agent `{latest.get('agent_id') or '—'}`",
        f"- pending nodes `{mon.get('pending_count')}` · accepted `{mon.get('accepted_count')}` "
        f"· ledger PENDING events `{mon.get('ledger_pending_events')}`",
        "",
        "This pulse **does not** append the canon chain. Human steward ingest only.",
        "",
        "| seq | status | event | node | agent |",
        "|-----|--------|-------|------|-------|",
    ]
    for e in mon.get("recent") or []:
        lines.append(
            f"| {e.get('seq')} | {e.get('status')} | {e.get('event_type')} | "
            f"{e.get('node_id')} | {e.get('agent_id')} |"
        )
    return "\n".join(lines)


def write_monitor(mon: Optional[dict[str, Any]] = None) -> str:
    mon = mon or ping_feed()
    blob = json.dumps(mon, indent=2).encode("utf-8")
    token = _token()
    if not token:
        return "Cannot write dataset without HF_TOKEN secret.\n" + blob.decode("utf-8")
    try:
        from huggingface_hub import HfApi

        HfApi(token=token).upload_file(
            path_or_fileobj=blob,
            path_in_repo="star-monitor.json",
            repo_id=DS,
            repo_type="dataset",
            commit_message="star-monitor pulse " + mon.get("utc", utc_now()),
        )
        return "Wrote star-monitor.json to " + DS + "\n" + blob.decode("utf-8")[:4000]
    except Exception as e:
        return "Dataset write shadow: " + str(e)[:400] + "\n" + blob.decode("utf-8")[:2000]


def _scrub_secrets(obj: Any) -> Any:
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            out[str(k)[:80]] = "[redacted]" if SECRET_KEY.search(str(k)) else _scrub_secrets(v)
        return out
    if isinstance(obj, list):
        return [_scrub_secrets(x) for x in obj[:80]]
    if isinstance(obj, str):
        return obj[:4000]
    return obj


def queue_proposal(raw_json: str, agent_id: str, i_consent: bool = True) -> str:
    raw = raw_json or ""
    if len(raw.encode("utf-8")) > MAX_PROPOSAL_BYTES:
        return "REFUSED: proposal larger than 64KB."
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as e:
        return "JSON parse fail: " + str(e)
    if not isinstance(payload, dict):
        return "Proposal must be a JSON object."
    payload = _scrub_secrets(payload)
    if not isinstance(payload, dict):
        return "Proposal must be a JSON object."
    payload["class"] = "PENDING_PROPOSAL"
    payload["not_canonical"] = True
    payload["queued_utc"] = utc_now()
    payload["queued_by"] = "lygo-star-chart-bot"
    payload.setdefault("agent_attestation", {})
    aid = (agent_id or "").strip()
    if aid and not AGENT_RE.match(aid):
        return "REFUSED: agent_id must be 1–64 of A-Z a-z 0-9 . _ : -"
    if aid:
        payload["agent_attestation"]["agent_id"] = aid
    payload["agent_attestation"]["scan_cue"] = (
        payload.get("agent_attestation", {}).get("scan_cue")
        or "LYGO-HSC-ATTEST-v1; gate=haven_star_chart_gate.py; P0-first; consent-gated; user-reviewed"
    )
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()
    path = "pending/" + utc_now().replace(":", "").replace("+00:00", "Z") + "_" + digest[:12] + ".json"
    blob = json.dumps(payload, indent=2).encode("utf-8")
    token = _token()
    if not token:
        return "Cannot write pending queue without HF_TOKEN.\nCopied locally:\n" + blob.decode("utf-8")
    try:
        from huggingface_hub import HfApi

        api = HfApi(token=token)
        api.upload_file(
            path_or_fileobj=blob,
            path_in_repo=path,
            repo_id=DS,
            repo_type="dataset",
            commit_message="star pending " + path,
        )
        idx = {
            "signature": SIG,
            "utc": utc_now(),
            "last_path": path,
            "sha256": digest,
            "note": "Pending only. Steward must gate+ingest. Bot did not append the Pages chain.",
        }
        api.upload_file(
            path_or_fileobj=json.dumps(idx, indent=2).encode("utf-8"),
            path_in_repo="star-proposals.json",
            repo_id=DS,
            repo_type="dataset",
            commit_message="star-proposals index " + utc_now(),
        )
        return "QUEUED " + path + " on " + DS + "\nsha256=" + digest + "\nSteward next: haven_star_chart_gate.py then submit --i-consent then ingest.\n"
    except Exception as e:
        return "Queue write shadow: " + str(e)[:400]


if __name__ == "__main__":
    print(write_monitor())
