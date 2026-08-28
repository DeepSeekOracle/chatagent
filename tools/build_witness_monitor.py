#!/usr/bin/env python3
"""Build a public disaster/news monitor snapshot from legal RSS/ATOM/JSON."""
from __future__ import annotations

import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

UA = "LYGO-PublicWitness/1.1.1 (+https://chatagent.ca/witness/)"
OUT = Path(r"D:\chatagent\witness\news-monitor.json")
HARSH = re.compile(
    r"\b(earthquake|quake|tsunami|hurricane|typhoon|cyclone|wildfire|wildfires|"
    r"volcano|eruption|flood|flooding|famine|starvation|massacre|genocide|"
    r"war|airstrike|missile|explosion|collapse|deadly|killed|deaths|casualty|"
    r"disaster|evacuation|outbreak|landslide|drought|heatwave)\b",
    re.I,
)

FEEDS = [
    {"id": "gdacs", "url": "https://www.gdacs.org/xml/rss.xml", "kind": "rss", "lane": "disaster"},
    {"id": "usgs_sig", "url": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.atom", "kind": "atom", "lane": "disaster"},
    {"id": "bbc_world", "url": "https://feeds.bbci.co.uk/news/world/rss.xml", "kind": "rss", "lane": "news"},
    {"id": "guardian_world", "url": "https://www.theguardian.com/world/rss", "kind": "rss", "lane": "news"},
    {"id": "nyt_world", "url": "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", "kind": "rss", "lane": "news"},
]


def get(url: str, timeout: float = 18.0) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml,application/atom+xml,application/xml,text/xml,*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read(1_500_000)


def txt(el, *tags) -> str:
    if el is None:
        return ""
    for t in tags:
        n = el.find(t)
        if n is not None and (n.text or "").strip():
            return (n.text or "").strip()
    return ""


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
            got = parse_rss(body, src)
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
    out = {
        "ok": any(s.get("ok") for s in sources),
        "signature": "Delta9Phi963-PUBLIC-WITNESS-MONITOR-v1.1.1",
        "utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "doctrine": "Public headlines only. Severe lane = disaster agencies + keyword filter on public RSS. Not private intel.",
        "sources": sources,
        "severe": severe[:40],
        "world": world[:30],
        "counts": {"severe": len(severe), "world": len(world)},
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": out["ok"], "severe": len(severe), "world": len(world), "sources": sources}, indent=2))
    return 0 if out["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
