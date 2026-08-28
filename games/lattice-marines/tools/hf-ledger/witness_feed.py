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

UA = "LYGO-PublicWitness/1.1.1 (+https://chatagent.ca/witness/; +https://huggingface.co/datasets/DeepSeekOracle/lygo-public-witness-feed)"
SIG = "Delta9Phi963-PUBLIC-WITNESS-FEED-v1.1.1"
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
    {"id": "openmeteo_hubs", "url": "https://api.open-meteo.com/v1/forecast?latitude=40.7,51.5,35.7,1.3,-33.9,-23.55,19.43,55.75,28.61,-1.29,30.04,-33.92,59.33,41.01,-37.81&longitude=-74.0,-0.1,139.7,103.8,151.2,-46.63,-99.13,37.62,77.21,36.82,31.24,18.42,18.07,28.98,144.96&current=temperature_2m,precipitation,weather_code,wind_speed_10m&timezone=UTC", "role": "weather"},
    {"id": "openmeteo_aq", "url": "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=28.61,39.9,19.43,51.5,34.05,6.52,-23.55&longitude=77.21,116.4,-99.13,-0.1,-118.25,3.38,-46.63&current=pm2_5,us_aqi", "role": "air"},
    {"id": "openmeteo_marine", "url": "https://marine-api.open-meteo.com/v1/marine?latitude=35.9,1.3,51.4,22.3,-33.9&longitude=-5.3,103.8,0.8,114.2,18.4&current=wave_height,wave_period", "role": "marine"},
    {"id": "rainviewer", "url": "https://api.rainviewer.com/public/weather-maps.json", "role": "radar"},
    {"id": "wxalert_na", "url": "https://api.librewxr.net/v2/alerts?bbox=-125,24,-66,50", "role": "world_alerts"},
    {"id": "wxalert_euw", "url": "https://api.librewxr.net/v2/alerts?bbox=-12,36,8,60", "role": "world_alerts"},
    {"id": "wxalert_eue", "url": "https://api.librewxr.net/v2/alerts?bbox=8,36,40,62", "role": "world_alerts"},
    {"id": "wxalert_jp", "url": "https://api.librewxr.net/v2/alerts?bbox=128,30,146,46", "role": "world_alerts"},
    {"id": "wxalert_au", "url": "https://api.librewxr.net/v2/alerts?bbox=112,-45,155,-10", "role": "world_alerts"},
    {"id": "wxalert_sa", "url": "https://api.librewxr.net/v2/alerts?bbox=-75,-40,-34,12", "role": "world_alerts"},
    {"id": "wxalert_in", "url": "https://api.librewxr.net/v2/alerts?bbox=68,6,97,36", "role": "world_alerts"},
    {"id": "dwd_warnings", "url": "https://www.dwd.de/DWD/warnungen/warnapp/json/warnings.json", "role": "dwd"},
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
                text = body.decode("utf-8", errors="replace")
                if text.startswith("warnWetter.loadWarnings("):
                    text = text[len("warnWetter.loadWarnings("):]
                    if text.rstrip().endswith(");"):
                        text = text.rstrip()[:-2]
                parsed = json.loads(text)
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


WX_HUBS = [
    ("New York", 40.7, -74.0), ("London", 51.5, -0.1), ("Tokyo", 35.7, 139.7),
    ("Singapore", 1.3, 103.8), ("Sydney", -33.9, 151.2), ("São Paulo", -23.55, -46.63),
    ("Mexico City", 19.43, -99.13), ("Moscow", 55.75, 37.62), ("Delhi", 28.61, 77.21),
    ("Nairobi", -1.29, 36.82), ("Cairo", 30.04, 31.24), ("Cape Town", -33.92, 18.42),
    ("Stockholm", 59.33, 18.07), ("Istanbul", 41.01, 28.98), ("Melbourne", -37.81, 144.96),
]


def _meteo_rows(js: Any) -> list[dict[str, Any]]:
    if isinstance(js, list):
        return [x for x in js if isinstance(x, dict)]
    if isinstance(js, dict) and isinstance(js.get("latitude"), list):
        lats, lons = js.get("latitude") or [], js.get("longitude") or []
        cur = js.get("current")
        rows = []
        n = min(len(lats), len(lons), 20)
        for i in range(n):
            row = {"latitude": lats[i], "longitude": lons[i]}
            if isinstance(cur, list) and i < len(cur) and isinstance(cur[i], dict):
                row["current"] = cur[i]
            elif isinstance(cur, dict):
                row["current"] = {k: (v[i] if isinstance(v, list) and i < len(v) else v) for k, v in cur.items()}
            rows.append(row)
        return rows
    if isinstance(js, dict) and "latitude" in js:
        return [js]
    return []


def parse_openmeteo(js: Any) -> list[dict[str, Any]]:
    out = []
    for i, row in enumerate(_meteo_rows(js)[:20]):
        name = WX_HUBS[i][0] if i < len(WX_HUBS) else f"hub{i}"
        cur = row.get("current") or {}
        t = cur.get("temperature_2m")
        pr = cur.get("precipitation")
        extra = {"temp": t, "precip": pr, "wind": cur.get("wind_speed_10m")}
        title = f"{name} {t}°"
        if pr not in (None, 0, 0.0):
            title += f" rain {pr}"
        pt = _pt(row.get("latitude"), row.get("longitude"), title, "weather", extra)
        if pt:
            out.append(pt)
            if pr not in (None, 0, 0.0):
                rp = dict(pt)
                rp["layer"] = "radar"
                rp["title"] = f"{name} precip {pr}"
                out.append(rp)
    return out


def parse_aq(js: Any) -> list[dict[str, Any]]:
    names = ["Delhi", "Beijing", "Mexico City", "London", "Los Angeles", "Lagos", "São Paulo"]
    out = []
    for i, row in enumerate(_meteo_rows(js)[:10]):
        cur = row.get("current") or {}
        aqi = cur.get("us_aqi")
        pm = cur.get("pm2_5")
        name = names[i] if i < len(names) else f"city{i}"
        pt = _pt(row.get("latitude"), row.get("longitude"), f"{name} AQI {aqi} PM2.5 {pm}", "air", {"aqi": aqi, "pm25": pm})
        if pt:
            out.append(pt)
    return out


def parse_marine(js: Any) -> list[dict[str, Any]]:
    names = ["Gibraltar", "Singapore Strait", "English Channel", "South China Sea", "Cape of Good Hope"]
    out = []
    for i, row in enumerate(_meteo_rows(js)[:8]):
        cur = row.get("current") or {}
        h = cur.get("wave_height")
        name = names[i] if i < len(names) else f"sea{i}"
        pt = _pt(row.get("latitude"), row.get("longitude"), f"{name} waves {h}m", "marine", {"waves": h})
        if pt:
            out.append(pt)
    return out


def _centroid(geom: Any) -> tuple[Any, Any]:
    if not isinstance(geom, dict):
        return None, None
    pts: list[tuple[float, float]] = []

    def walk(x: Any) -> None:
        if not isinstance(x, list) or not x:
            return
        if isinstance(x[0], (int, float)) and len(x) >= 2:
            try:
                pts.append((float(x[0]), float(x[1])))
            except (TypeError, ValueError):
                return
            return
        for y in x[:80]:
            walk(y)

    walk(geom.get("coordinates"))
    if not pts:
        return None, None
    lon = sum(p[0] for p in pts) / len(pts)
    lat = sum(p[1] for p in pts) / len(pts)
    return lat, lon


def parse_world_alerts(js: Any) -> list[dict[str, Any]]:
    out = []
    feats = js.get("features") if isinstance(js, dict) else None
    if not isinstance(feats, list):
        return out
    for f in feats[:90]:
        if not isinstance(f, dict):
            continue
        props = f.get("properties") or {}
        lat, lon = _centroid(f.get("geometry"))
        title = props.get("title") or props.get("event") or "weather alert"
        sev = props.get("severity")
        if sev:
            title = f"{sev}: {title}"
        pt = _pt(lat, lon, title, "world_alerts", {"severity": sev})
        if pt:
            out.append(pt)
    return out


def parse_rainviewer(js: Any) -> list[dict[str, Any]]:
    if not isinstance(js, dict):
        return []
    radar = js.get("radar") or {}
    past = radar.get("past") or []
    last = past[-1] if past else {}
    host = js.get("host") or "https://tilecache.rainviewer.com"
    path = last.get("path")
    ts = last.get("time")
    hubs = [
        ("N. America radar mosaic", 39.0, -98.0),
        ("Europe radar mosaic", 50.0, 10.0),
        ("Japan radar mosaic", 36.0, 138.0),
        ("Australia radar mosaic", -25.0, 134.0),
        ("SE Asia radar mosaic", 5.0, 115.0),
    ]
    out = []
    for name, la, lo in hubs:
        pt = _pt(la, lo, name + (f" t={ts}" if ts else ""), "radar", {"host": host, "path": path, "time": ts})
        if pt:
            out.append(pt)
    return out


DWD_STATE = {
    "Baden-Württemberg": (48.6, 9.0),
    "Bayern": (48.8, 11.6),
    "Berlin": (52.52, 13.4),
    "Brandenburg": (52.4, 13.0),
    "Bremen": (53.08, 8.8),
    "Hamburg": (53.55, 10.0),
    "Hessen": (50.6, 9.0),
    "Mecklenburg-Vorpommern": (53.8, 12.5),
    "Niedersachsen": (52.6, 9.8),
    "Nordrhein-Westfalen": (51.5, 7.5),
    "Rheinland-Pfalz": (49.9, 7.5),
    "Saarland": (49.4, 7.0),
    "Sachsen": (51.1, 13.4),
    "Sachsen-Anhalt": (52.0, 11.7),
    "Schleswig-Holstein": (54.2, 9.8),
    "Thüringen": (50.9, 11.0),
}


def parse_dwd(js: Any) -> list[dict[str, Any]]:
    data = js
    if isinstance(js, str):
        s = js.strip()
        if s.startswith("warnWetter.loadWarnings("):
            s = s[len("warnWetter.loadWarnings("):]
            if s.endswith(");"):
                s = s[:-2]
            try:
                data = json.loads(s)
            except Exception:
                return []
    if not isinstance(data, dict):
        return []
    warnings = data.get("warnings") or {}
    out = []
    if not isinstance(warnings, dict):
        return out
    for _code, items in list(warnings.items())[:80]:
        if not isinstance(items, list):
            continue
        for w in items[:3]:
            if not isinstance(w, dict):
                continue
            state = w.get("state") or ""
            lat, lon = DWD_STATE.get(state, (51.2, 10.4))
            title = (w.get("headline") or w.get("event") or w.get("descr") or "DWD warning")[:140]
            pt = _pt(lat, lon, f"DWD {state}: {title}", "world_alerts")
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
    elif role == "air":
        row["points"] = parse_aq(js)
    elif role == "marine":
        row["points"] = parse_marine(js)
    elif role == "radar":
        row["points"] = parse_rainviewer(js)
        if isinstance(js, dict):
            past = ((js.get("radar") or {}).get("past") or [])
            row["radar"] = {
                "host": js.get("host"),
                "latest": past[-1] if past else None,
                "frames": len(past),
                "note": "RainViewer public mosaic (personal/educational). Tiles are REFERENCE, not classified.",
            }
    elif role == "world_alerts":
        row["points"] = parse_world_alerts(js)
    elif role == "dwd":
        row["points"] = parse_dwd(js)
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
    with ThreadPoolExecutor(max_workers=12) as ex:
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
