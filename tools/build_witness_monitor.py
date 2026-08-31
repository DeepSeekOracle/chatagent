#!/usr/bin/env python3
"""Build a public disaster/news monitor snapshot from legal RSS/ATOM/JSON."""
from __future__ import annotations

import hashlib
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

UA = "LYGO-PublicWitness/1.2.0 (+https://chatagent.ca/witness/)"
OUT = Path(r"D:\chatagent\witness\news-monitor.json")
LEDGER = Path(r"D:\chatagent\witness\event-ledger.json")
LEDGER_MAX = 600
HARSH = re.compile(
    r"\b(earthquake|quake|tsunami|hurricane|typhoon|cyclone|wildfire|wildfires|"
    r"volcano|eruption|flood|flooding|famine|starvation|massacre|genocide|"
    r"war|airstrike|missile|explosion|collapse|deadly|killed|deaths|casualty|"
    r"disaster|evacuation|outbreak|landslide|drought|heatwave|aftershock|"
    r"emergency|alert|warning)\b",
    re.I,
)

FEEDS = [
    {"id": "gdacs", "url": "https://www.gdacs.org/xml/rss.xml", "kind": "rss", "lane": "disaster"},
    {"id": "usgs_sig", "url": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.atom", "kind": "atom", "lane": "disaster"},
    {"id": "usgs_m45", "url": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.atom", "kind": "atom", "lane": "disaster"},
    {"id": "reliefweb", "url": "https://reliefweb.int/updates/rss.xml", "kind": "rss", "lane": "disaster"},
    {"id": "nhc_at", "url": "https://www.nhc.noaa.gov/index-at.xml", "kind": "rss", "lane": "disaster"},
    {"id": "nhc_ep", "url": "https://www.nhc.noaa.gov/index-ep.xml", "kind": "rss", "lane": "disaster"},
    {"id": "un_news", "url": "https://news.un.org/feed/subscribe/en/news/all/rss.xml", "kind": "rss", "lane": "news"},
    {"id": "who_news", "url": "https://www.who.int/rss-feeds/news-english.xml", "kind": "rss", "lane": "news"},
    {"id": "bbc_world", "url": "https://feeds.bbci.co.uk/news/world/rss.xml", "kind": "rss", "lane": "news"},
    {"id": "guardian_world", "url": "https://www.theguardian.com/world/rss", "kind": "rss", "lane": "news"},
    {"id": "nyt_world", "url": "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", "kind": "rss", "lane": "news"},
    {"id": "nasa_eonet", "url": "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=30", "kind": "eonet", "lane": "disaster"},
    {"id": "nws_alerts", "url": "https://api.weather.gov/alerts/active?status=actual", "kind": "nws", "lane": "disaster"},
]


def get(url: str, timeout: float = 18.0) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "application/rss+xml,application/atom+xml,application/geo+json,application/json,application/xml,text/xml,*/*",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read(2_500_000)


def txt(el, *tags) -> str:
    if el is None:
        return ""
    for t in tags:
        n = el.find(t)
        if n is not None and (n.text or "").strip():
            return (n.text or "").strip()
    return ""


def parse_eonet(body: bytes, src: dict) -> list[dict]:
    data = json.loads(body.decode("utf-8", "replace"))
    out = []
    for ev in (data.get("events") or [])[:30]:
        title = str(ev.get("title") or "").strip()
        eid = str(ev.get("id") or "")
        link = ""
        for s in ev.get("sources") or []:
            u = str(s.get("url") or "")
            if u.startswith("https://"):
                link = u
                break
        if not link and eid:
            link = "https://eonet.gsfc.nasa.gov/api/v3/events/" + eid
        geo = (ev.get("geometry") or [{}])[-1]
        date = str(geo.get("date") or "")
        row = make(title, link, date, src)
        if row:
            out.append(row)
    return out


def parse_nws(body: bytes, src: dict) -> list[dict]:
    data = json.loads(body.decode("utf-8", "replace"))
    out = []
    for f in (data.get("features") or [])[:40]:
        p = f.get("properties") or {}
        title = str(p.get("headline") or p.get("event") or "").strip()
        link = str(p.get("@id") or p.get("id") or "")
        if not link.startswith("https://"):
            if str(p.get("id") or "").startswith("urn:oid:"):
                link = "https://api.weather.gov/alerts/" + str(p.get("id"))
            else:
                continue
        date = str(p.get("sent") or p.get("effective") or "")
        row = make(title, link, date, src)
        if row:
            out.append(row)
    return out


def parse_body(body: bytes, src: dict) -> list[dict]:
    kind = src.get("kind") or "rss"
    if kind == "eonet":
        return parse_eonet(body, src)
    if kind == "nws":
        return parse_nws(body, src)
    return parse_rss(body, src)


def parse_rss(body: bytes, src: dict) -> list[dict]:
    root = ET.fromstring(body)
    ns = {"a": "http://www.w3.org/2005/Atom"}
    items = []
    for it in root.findall(".//item")[:40]:
        title = txt(it, "title")
        link = txt(it, "link")
        date = txt(it, "pubDate", "date")
        items.append(make(title, link, date, src))
    for it in root.findall(".//a:entry", ns)[:40]:
        title = txt(it, "{http://www.w3.org/2005/Atom}title")
        link_el = it.find("{http://www.w3.org/2005/Atom}link")
        href = (link_el.get("href") if link_el is not None else "") or txt(it, "{http://www.w3.org/2005/Atom}id")
        date = txt(it, "{http://www.w3.org/2005/Atom}updated", "{http://www.w3.org/2005/Atom}published")
        items.append(make(title, href, date, src))
    return [x for x in items if x]


def make(title: str, link: str, date: str, src: dict) -> dict | None:
    title = re.sub(r"\s+", " ", title or "").strip()
    if not title or not link.startswith("https://"):
        return None
    harsh = bool(HARSH.search(title))
    return {
        "title": title[:240],
        "url": link,
        "date": date[:80],
        "source": src["id"],
        "lane": "severe" if (src["lane"] == "disaster" or harsh) else "world",
        "class": "RESOURCE",
        "payload": None,
    }


def main() -> int:
    sources = []
    rows: list[dict] = []
    for src in FEEDS:
        rec = {"id": src["id"], "url": src["url"], "ok": False, "error": None, "n": 0}
        try:
            body = get(src["url"])
            got = parse_body(body, src)
            rec["ok"] = True
            rec["n"] = len(got)
            rows.extend(got)
        except Exception as e:
            rec["error"] = str(e)[:160]
            rec["class"] = "SHADOW"
        sources.append(rec)
    seen = set()
    uniq = []
    for r in rows:
        k = r["url"]
        if k in seen:
            continue
        seen.add(k)
        uniq.append(r)
    severe = [r for r in uniq if r["lane"] == "severe"]
    world = [r for r in uniq if r["lane"] == "world"]
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    out = {
        "ok": any(s.get("ok") for s in sources),
        "signature": "Delta9Phi963-PUBLIC-WITNESS-MONITOR-v1.2.0",
        "utc": now,
        "class": "RESOURCE",
        "live_star_chart_ingest": False,
        "doctrine": "Public headlines only. Severe lane = disaster agencies + keyword filter. RESOURCE snapshot — not Star Chart CANON.",
        "sources": sources,
        "severe": severe[:50],
        "world": world[:40],
        "counts": {"severe": len(severe), "world": len(world)},
        "event_ledger": "event-ledger.json",
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    tip = write_event_ledger(uniq, now)
    print(json.dumps({"ok": out["ok"], "severe": len(severe), "world": len(world), "ledger_tip": tip, "sources": sources}, indent=2))
    return 0 if out["ok"] else 1


def write_event_ledger(rows: list[dict], now: str) -> str:
    prev = {"entries": [], "tip_sha256": ""}
    if LEDGER.is_file():
        try:
            prev = json.loads(LEDGER.read_text(encoding="utf-8"))
        except Exception:
            prev = {"entries": [], "tip_sha256": ""}
    by_url = {}
    for e in prev.get("entries") or []:
        u = e.get("url")
        if u:
            by_url[u] = e
    for r in rows:
        u = r.get("url")
        if not u:
            continue
        hid = hashlib.sha256(u.encode("utf-8")).hexdigest()[:16]
        old = by_url.get(u)
        if old:
            old["last_seen_utc"] = now
            old["title"] = r.get("title") or old.get("title")
            old["source"] = r.get("source") or old.get("source")
            old["lane"] = r.get("lane") or old.get("lane")
        else:
            by_url[u] = {
                "id": hid,
                "title": r.get("title"),
                "url": u,
                "source": r.get("source"),
                "lane": r.get("lane"),
                "class": "RESOURCE",
                "first_seen_utc": now,
                "last_seen_utc": now,
                "payload": None,
            }
    entries = sorted(by_url.values(), key=lambda x: x.get("last_seen_utc") or "", reverse=True)[:LEDGER_MAX]
    joined = "\n".join(sorted(e["url"] for e in entries))
    tip = hashlib.sha256(joined.encode("utf-8")).hexdigest()
    pack = {
        "signature": "Delta9Phi963-PUBLIC-WITNESS-EVENT-LEDGER-v1.0.0",
        "class": "RESOURCE",
        "live_star_chart_ingest": False,
        "note": "Append-only public RESOURCE log of witnessed headlines. Not dual-ledger CANON. Never silent Star Chart ingest.",
        "updated_utc": now,
        "prev_tip": prev.get("tip_sha256") or "",
        "tip_sha256": tip,
        "count": len(entries),
        "entries": entries,
    }
    LEDGER.write_text(json.dumps(pack, ensure_ascii=False, indent=2), encoding="utf-8")
    return tip


if __name__ == "__main__":
    raise SystemExit(main())
