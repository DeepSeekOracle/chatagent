"""LYGO Public Witness live overlay — public GET aggregator.

HTTPS only. Cache ~90s. Every point is class RESOURCE. Failures become named
SHADOW nodes (existence + url, payload null). Never invent coordinates.
"""
from __future__ import annotations

import hashlib
import json
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse

UA = "LYGO-PublicWitness/1.1.0 (+https://chatagent.ca/witness/; +https://huggingface.co/spaces/DeepSeekOracle/lattice-marines-ledger)"
SIG = "Delta9Phi963-PUBLIC-WITNESS-FEED-v1.1.0"
CACHE_SEC = 90.0
MAX_BODY = 2_500_000
TIMEOUT = 12.0

SOURCES: list[dict[str, str]] = [
    {"id": "usgs_m25_day", "url": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson", "role": "quakes"},
    {"id": "usgs_m45_week", "url": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson", "role": "quakes"},
    {"id": "usgs_sig_month", "url": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson", "role": "quakes"},
    {"id": "eonet_open", "url": "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50", "role": "events"},
    {"id": "iss", "url": "https://api.wheretheiss.at/v1/satellites/25544", "role": "iss"},
    {"id": "nws_alerts", "url": "https://api.weather.gov/alerts/active?status=actual", "role": "alerts"},
    {"id": "uk_floods", "url": "https://environment.data.gov.uk/flood-monitoring/id/floods", "role": "floods"},
    {"id": "gdacs", "url": "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ;TC;VO;FL;TS", "role": "disasters"},
    {"id": "swpc_xrays", "url": "https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json", "role": "space_weather"},
    {"id": "swpc_aurora", "url": "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json", "role": "aurora"},
    {"id": "launches", "url": "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=12&mode=detailed", "role": "launches"},
    {"id": "usgs_potomac", "url": "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=01646500&parameterCd=00060", "role": "water"},
    {"id": "openmeteo_hubs", "url": "https://api.open-meteo.com/v1/forecast?latitude=40.7,51.5,35.7,1.3,-33.9&longitude=-74.0,-0.1,139.7,103.8,151.2&current=temperature_2m,wind_speed_10m,weather_code&timezone=UTC", "role": "weather"},
    {"id": "coingecko", "url": "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd", "role": "markets"},
    {"id": "opensky_ne", "url": "https://opensky-network.org/api/states/all?lamin=38&lomin=-78&lamax=43&lomax=-70", "role": "flights"},
    {"id": "celestrak_stations", "url": "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json", "role": "tle"},
    {"id": "lattice_anchors", "url": "https://deepseekoracle.github.io/lygo-protocol-stack/network_builder/IMMUTABLE_ANCHORS.json", "role": "canon_mirror"},
    {"id": "star_feed", "url": "https://deepseekoracle.github.io/lygo-protocol-stack/haven_star_chart/haven_star_chart_feed.json", "role": "canon_mirror"},
]

_CACHE: dict[str, Any] = {"t": 0.0, "feed": None}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def https_only(url: str) -> bool:
    p = urlparse(url)
    return p.scheme == "https" and bool(p.netloc)


def fetch(url: str) -> dict[str, Any]:
    if not https_only(url):
        return {"ok": False, "error": "https_only", "json": None, "bytes": 0, "sha256": None}
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/geo+json,application/json"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            body = resp.read(MAX_BODY)
            parsed = None
            try:
                parsed = json.loads(body.decode("utf-8", errors="replace"))
            except Exception:
                parsed = None
            return {
                "ok": 200 <= resp.status < 400,
                "status": resp.status,
                "error": None,
                "json": parsed,
                "bytes": len(body),
                "sha256": hashlib.sha256(body).hexdigest(),
            }
    except Exception as e:
        return {"ok": False, "status": 0, "error": str(e)[:180], "json": None, "bytes": 0, "sha256": None}


def _pt(lat, lon, title, layer, extra=None) -> dict[str, Any] | None:
    try:
        la, lo = float(lat), float(lon)
    except (TypeError, ValueError):
        return None
    if not (-90 <= la <= 90 and -180 <= lo <= 180):
        return None
    d = {"lat": la, "lon": lo, "title": str(title)[:160], "layer": layer, "class": "RESOURCE"}
    if extra:
        d.update(extra)
    return d


def parse_usgs(js: Any, layer: str) -> list[dict[str, Any]]:
    out = []
    if not isinstance(js, dict):
        return out
    for f in (js.get("features") or [])[:120]:
        if not isinstance(f, dict):
            continue
        c = (f.get("geometry") or {}).get("coordinates") or [None, None]
        p = f.get("properties") or {}
        pt = _pt(c[1], c[0], p.get("place") or "quake", layer, {"mag": p.get("mag")})
        if pt:
            out.append(pt)
    return out


def parse_eonet(js: Any) -> list[dict[str, Any]]:
    out = []
    if not isinstance(js, dict):
        return out
    for ev in (js.get("events") or [])[:60]:
        geos = ev.get("geometry") or []
        geo = geos[-1] if geos else {}
        c = (geo.get("coordinates") if isinstance(geo, dict) else None) or [None, None]
        pt = _pt(c[1] if len(c) > 1 else None, c[0] if c else None, ev.get("title") or "event", "events")
        if pt:
            out.append(pt)
    return out


def parse_iss(js: Any) -> list[dict[str, Any]]:
    if not isinstance(js, dict):
        return []
    pt = _pt(js.get("latitude"), js.get("longitude"), "ISS", "iss", {"alt": js.get("altitude")})
    return [pt] if pt else []


def parse_nws(js: Any) -> list[dict[str, Any]]:
    out = []
    if not isinstance(js, dict):
        return out
    for f in (js.get("features") or [])[:80]:
        geom = f.get("geometry") if isinstance(f, dict) else None
        coords = None
        if isinstance(geom, dict):
            c = geom.get("coordinates")
            if geom.get("type") == "Point" and isinstance(c, list) and len(c) >= 2:
                coords = c
            elif isinstance(c, list) and c and isinstance(c[0], list):
                ring = c[0][0] if isinstance(c[0][0], list) else c[0]
                if isinstance(ring, list) and len(ring) >= 2 and not isinstance(ring[0], list):
                    coords = ring
        props = (f.get("properties") or {}) if isinstance(f, dict) else {}
        if not coords:
            continue
        pt = _pt(coords[1], coords[0], props.get("headline") or props.get("event") or "NWS alert", "alerts")
        if pt:
            out.append(pt)
    return out


def parse_uk_floods(js: Any) -> list[dict[str, Any]]:
    out = []
    if not isinstance(js, dict):
        return out
    for it in (js.get("items") or [])[:50]:
        fa = (it.get("floodArea") or {}) if isinstance(it, dict) else {}
        lat, lon = fa.get("lat"), fa.get("long") or fa.get("lon")
        title = it.get("description") or fa.get("riverOrSea") or "UK flood"
        pt = _pt(lat, lon, title, "floods")
        if pt:
            out.append(pt)
    return out


def parse_gdacs(js: Any) -> list[dict[str, Any]]:
    out = []
    features = None
    if isinstance(js, dict):
        features = js.get("features") or js.get("events") or js.get("featuresData")
    if isinstance(js, list):
        features = js
    if not isinstance(features, list):
        return out
    for ev in features[:80]:
        if not isinstance(ev, dict):
            continue
        geom = ev.get("geometry") or {}
        c = geom.get("coordinates") if isinstance(geom, dict) else None
        props = ev.get("properties") or ev
        lat = lon = None
        if isinstance(c, list) and len(c) >= 2 and not isinstance(c[0], list):
            lon, lat = c[0], c[1]
        lat = lat if lat is not None else props.get("lat") or props.get("latitude")
        lon = lon if lon is not None else props.get("lon") or props.get("longitude")
        title = props.get("name") or props.get("eventname") or props.get("eventtype") or "GDACS"
        pt = _pt(lat, lon, title, "disasters")
        if pt:
            out.append(pt)
    return out


def parse_aurora(js: Any) -> list[dict[str, Any]]:
    out = []
    coords = None
    if isinstance(js, dict):
        coords = js.get("coordinates") or (js.get("forecast") or {}).get("coordinates")
    if not isinstance(coords, list):
        return out
    step = max(1, len(coords) // 70)
    for i, row in enumerate(coords[::step][:70]):
        if not isinstance(row, (list, tuple)) or len(row) < 3:
            continue
        lon, lat, val = row[0], row[1], row[2]
        try:
            if float(val) < 3:
                continue
        except (TypeError, ValueError):
            continue
        pt = _pt(lat, lon, "Aurora forecast cell", "aurora", {"n": val})
        if pt:
            out.append(pt)
    return out


def parse_xrays(js: Any) -> list[dict[str, Any]]:
    if not isinstance(js, list) or not js:
        return []
    last = js[-1] if isinstance(js[-1], dict) else {}
    flux = last.get("flux")
    return [{
        "lat": 0.0, "lon": 0.0, "title": "GOES X-ray flux " + str(flux),
        "layer": "space_weather", "class": "RESOURCE", "flux": flux,
    }]


def parse_launches(js: Any) -> list[dict[str, Any]]:
    out = []
    results = js.get("results") if isinstance(js, dict) else None
    if not isinstance(results, list):
        return out
    for L in results[:12]:
        pad = (L.get("pad") or {}) if isinstance(L, dict) else {}
        loc = pad.get("location") or {}
        title = L.get("name") or pad.get("name") or "launch"
        pt = _pt(pad.get("latitude") or loc.get("latitude"), pad.get("longitude") or loc.get("longitude"), title, "launches")
        if pt:
            out.append(pt)
    return out


def parse_water(js: Any) -> list[dict[str, Any]]:
    try:
        ts = js["value"]["timeSeries"][0]
        src = ts["sourceInfo"]
        geo = src["geoLocation"]["geogLocation"]
        name = src.get("siteName") or "USGS gauge"
        v = ts["values"][0]["value"][0]["value"]
        pt = _pt(geo.get("latitude"), geo.get("longitude"), f"{name} flow {v}", "water")
        return [pt] if pt else []
    except Exception:
        return []


def parse_openmeteo(js: Any) -> list[dict[str, Any]]:
    out = []
    hubs = [
        ("New York", 40.7, -74.0),
        ("London", 51.5, -0.1),
        ("Tokyo", 35.7, 139.7),
        ("Singapore", 1.3, 103.8),
        ("Sydney", -33.9, 151.2),
    ]
    if isinstance(js, list):
        rows = js
    elif isinstance(js, dict) and "latitude" in js:
        rows = [js]
    else:
        rows = []
    for i, row in enumerate(rows[:5]):
        name, la, lo = hubs[i] if i < len(hubs) else (f"hub{i}", None, None)
        cur = (row.get("current") or {}) if isinstance(row, dict) else {}
        lat = row.get("latitude") if isinstance(row, dict) else la
        lon = row.get("longitude") if isinstance(row, dict) else lo
        t = cur.get("temperature_2m")
        pt = _pt(lat, lon, f"{name} {t}°", "weather", {"temp": t, "wind": cur.get("wind_speed_10m")})
        if pt:
            out.append(pt)
    return out


def parse_opensky(js: Any) -> list[dict[str, Any]]:
    out = []
    states = js.get("states") if isinstance(js, dict) else None
    if not isinstance(states, list):
        return out
    for st in states[:80]:
        if not isinstance(st, list) or len(st) < 7:
            continue
        call = (st[1] or st[0] or "ac").strip()
        lon, lat = st[5], st[6]
        pt = _pt(lat, lon, call, "flights")
        if pt:
            out.append(pt)
    return out


def parse_one(src: dict[str, str], got: dict[str, Any]) -> dict[str, Any]:
    row: dict[str, Any] = {
        "id": src["id"],
        "url": src["url"],
        "role": src["role"],
        "ok": bool(got.get("ok")),
        "error": got.get("error"),
        "bytes": got.get("bytes"),
        "sha256": got.get("sha256"),
        "class": "RESOURCE" if got.get("ok") else "SHADOW",
        "payload": None,
        "points": [],
        "note": None,
    }
    js = got.get("json")
    if not got.get("ok"):
        row["note"] = "named shadow — public URL still the check; do not invent points"
        return row
    role, sid = src["role"], src["id"]
    if role == "quakes":
        row["points"] = parse_usgs(js, "quakes")
    elif role == "events":
        row["points"] = parse_eonet(js)
    elif role == "iss":
        row["points"] = parse_iss(js)
    elif role == "alerts":
        row["points"] = parse_nws(js)
    elif role == "floods":
        row["points"] = parse_uk_floods(js)
    elif role == "disasters":
        row["points"] = parse_gdacs(js)
    elif role == "aurora":
        row["points"] = parse_aurora(js)
    elif role == "space_weather":
        row["points"] = parse_xrays(js)
    elif role == "launches":
        row["points"] = parse_launches(js)
    elif role == "water":
        row["points"] = parse_water(js)
    elif role == "weather":
        row["points"] = parse_openmeteo(js)
    elif role == "flights":
        row["points"] = parse_opensky(js)
    elif role == "markets":
        row["markets"] = js if isinstance(js, dict) else {}
        row["note"] = "public prices — not a geographic claim"
    elif role == "tle":
        row["count"] = len(js) if isinstance(js, list) else 0
        row["note"] = "public TLEs — orbital elements, not classified video"
    elif role == "canon_mirror":
        row["class"] = "CANON"
        row["note"] = "lattice mirror on the live overlay — still canon, not invented geo"
        if isinstance(js, dict):
            row["keys"] = sorted(list(js.keys()))[:12]
            row["chain_valid"] = js.get("chain_valid")
            row["entry_count"] = js.get("entry_count")
    return row


def build_feed() -> dict[str, Any]:
    now = time.time()
    if _CACHE["feed"] is not None and now - _CACHE["t"] < CACHE_SEC:
        return _CACHE["feed"]
    sources_out: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=10) as ex:
        futs = {ex.submit(fetch, s["url"]): s for s in SOURCES}
        for fut in as_completed(futs):
            src = futs[fut]
            try:
                got = fut.result()
            except Exception as e:
                got = {"ok": False, "error": str(e)[:180], "json": None, "bytes": 0, "sha256": None}
            sources_out.append(parse_one(src, got))
    sources_out.sort(key=lambda r: r["id"])
    points: list[dict[str, Any]] = []
    for s in sources_out:
        points.extend(s.get("points") or [])
    feed = {
        "ok": any(s.get("ok") for s in sources_out),
        "signature": SIG,
        "class": "RESOURCE",
        "doctrine": "Public nodes are resources. Failed GETs stay named SHADOW. Never invent payloads.",
        "utc": utc_now(),
        "cache_sec": CACHE_SEC,
        "source_count": len(sources_out),
        "live_count": sum(1 for s in sources_out if s.get("ok")),
        "shadow_count": sum(1 for s in sources_out if not s.get("ok")),
        "point_count": len(points),
        "sources": sources_out,
        "points": points[:600],
        "live_star_chart_write": False,
        "site": "https://chatagent.ca/witness/",
    }
    _CACHE["feed"] = feed
    _CACHE["t"] = now
    return feed
