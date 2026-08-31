#!/usr/bin/env python3
"""Copy LYGO Public Witness across sites, skills, FULL zip, catalogs."""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT_SKILL = Path(r"I:\E Drive\.grok\skills\lygo-public-witness")
USER_SKILL = Path(r"C:\Users\justi\.grok\skills\lygo-public-witness")
STACK_SKILL = Path(r"I:\E Drive\lygo-protocol-stack\docs\skills\lygo-public-witness")
MIRROR_SKILL = Path(r"I:\E Drive\lygo-protocol-stack\clawhub\mirrors\lygo-public-witness")
CHAT = Path(r"D:\chatagent")
HAVEN = Path(r"D:\eternalhaven")
STACK_DOCS = Path(r"I:\E Drive\lygo-protocol-stack\docs\public-witness")
OG_SRC = Path(r"C:\Users\justi\.grok\sessions\I:\E Drive\019e871e-6673-7801-ac84-a128dcb04c93\images\105.jpg")
# session path uses encoded colon
OG_CANDIDATES = [
    Path(r"C:\Users\justi\.grok\sessions\I:\E Drive\019e871e-6673-7801-ac84-a128dcb04c93\images\105.jpg"),
    Path(os.path.expandvars(r"%USERPROFILE%\.grok\sessions")) ,
]
UTC = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")


def copytree(src: Path, dst: Path) -> None:
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))


def find_og() -> Path | None:
    p = Path(r"C:\Users\justi\.grok\sessions")
    if not p.exists():
        return None
    hits = list(p.glob("**/images/105.jpg"))
    return hits[0] if hits else None


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    og = find_og()
    if og:
        shutil.copy2(og, CHAT / "witness" / "og.jpg")
        print("og", og)

    # website mirrors
    for dest in (HAVEN / "witness", STACK_DOCS):
        dest.mkdir(parents=True, exist_ok=True)
        for name in ("index.html", "app.js", "app.css", "doctrine.json", "favicon.svg", "shadows.json", "feed-snapshot.json", "cameras.json", "news-monitor.json", "event-ledger.json", "world-land.json", "radio.js", "radio.json", "disc.js"):
            src = CHAT / "witness" / name
            text = src.read_text(encoding="utf-8")
            if dest == HAVEN / "witness":
                text = text.replace("https://chatagent.ca/witness/", "https://eternalhaven.ca/witness/")
                text = text.replace('href="/"', 'href="https://chatagent.ca/"')
                text = text.replace('href="/guides/', 'href="https://chatagent.ca/guides/')
                text = text.replace('href="/champions', 'href="https://chatagent.ca/champions')
                text = text.replace('href="/games/', 'href="https://chatagent.ca/games/')
                text = text.replace('href="/app.html"', 'href="https://chatagent.ca/app.html"')
                text = text.replace('href="/witness/"', 'href="/witness/"')
                text = text.replace('href="/lygoskillhub.html"', 'href="https://chatagent.ca/lygoskillhub.html"')
                text = text.replace('href="/about.html"', 'href="https://chatagent.ca/about.html"')
                text = text.replace('src="/witness/', 'src="/witness/')
                text = text.replace('href="/witness/', 'href="/witness/')
                text = text.replace("ca-pub-0646320966060599", "ca-pub-0646320966060599")
            dest.joinpath(name).write_text(text, encoding="utf-8")
        if (CHAT / "witness" / "og.jpg").exists():
            shutil.copy2(CHAT / "witness" / "og.jpg", dest / "og.jpg")

    # skill copies
    for dest in (USER_SKILL, STACK_SKILL, MIRROR_SKILL):
        dest.parent.mkdir(parents=True, exist_ok=True)
        copytree(ROOT_SKILL, dest)

    # FULL zip: skill + website
    full_root = CHAT / "data" / "lygo-full-skills" / "dist"
    full_root.mkdir(parents=True, exist_ok=True)
    zip_path = full_root / "lygo-public-witness-full.zip"
    if zip_path.exists():
        zip_path.unlink()
    skip = {"__pycache__", ".pyc"}
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for p in ROOT_SKILL.rglob("*"):
            if p.is_dir() or p.suffix == ".pyc" or "__pycache__" in p.parts:
                continue
            z.write(p, "lygo-public-witness/" + str(p.relative_to(ROOT_SKILL)).replace("\\", "/"))
        web = CHAT / "witness"
        for p in web.rglob("*"):
            if p.is_dir():
                continue
            z.write(p, "lygo-public-witness/website/" + str(p.relative_to(web)).replace("\\", "/"))
    digest = sha256_file(zip_path)
    nbytes = zip_path.stat().st_size
    # count files inside
    with zipfile.ZipFile(zip_path) as z:
        nfiles = len(z.namelist())
    print("zip", zip_path, nbytes, digest, nfiles)

    # hub catalog
    hub_path = CHAT / "data" / "lygoskillhub_catalog.json"
    hub = json.loads(hub_path.read_text(encoding="utf-8"))
    skills = hub.setdefault("skills", [])
    if not any(s.get("slug") == "lygo-public-witness" for s in skills if s.get("kind") == "skill"):
        skills.insert(
            0,
            {
                "kind": "skill",
                "slug": "lygo-public-witness",
                "name": "LYGO Public Witness",
                "summary": "Public feeds are REFERENCE; dual ledgers, kernel eggs, and Haven Star Chart are CANON. HTTPS GET allowlist (USGS, NASA EONET, ISS, lattice JSON). Never invent missing sources. Never live Star Chart write. Optional localhost Ollama.",
                "downloads": 0,
                "version": "1.0.0",
                "published": False,
                "pending_publication": True,
                "category": "lattice",
                "clawhub_url": "https://clawhub.ai/deepseekoracle/skills/lygo-public-witness",
                "install": "npx clawhub@latest install deepseekoracle/lygo-public-witness",
                "has_local_skill": True,
                "has_stack_mirror": True,
                "source": "mirror",
                "channel": "public_tentacle",
                "channel_label": "Public tentacle (ClawHub)",
                "has_full_zip": True,
                "full_lygo": "https://chatagent.ca/lygoskillhub.html#full-lygo",
            },
        )
    surfaces = [s for s in skills if s.get("kind") == "surface"]
    if not any(s.get("slug") == "public-witness" for s in surfaces):
        skills.append(
            {
                "kind": "surface",
                "slug": "public-witness",
                "name": "LYGO Public Witness (site)",
                "summary": "Two globes: Earth REFERENCE (USGS/EONET/ISS) and lattice CANON (dual ledgers, eggs, Star Chart). Empty beats fake.",
                "category": "surface",
                "url": "https://chatagent.ca/witness/",
                "mirrors": ["https://eternalhaven.ca/witness/"],
                "source": "surface",
                "channel": "surface",
                "channel_label": "Lattice surface",
            }
        )
    hub["updated_utc"] = UTC
    n_skill = sum(1 for s in skills if s.get("kind") == "skill")
    n_surf = sum(1 for s in skills if s.get("kind") == "surface")
    hub["skill_count"] = n_skill
    hub["item_count"] = len(skills)
    hub.setdefault("counts", {})
    hub["counts"]["skills"] = n_skill
    hub["counts"]["surfaces"] = n_surf
    hub["counts"]["total"] = len(skills)
    raw = json.dumps(hub, indent=2, ensure_ascii=False) + "\n"
    hub["catalog_sha256"] = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    hub_path.write_text(json.dumps(hub, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    full_cat_path = CHAT / "data" / "lygo-full-skills" / "catalog.json"
    full = json.loads(full_cat_path.read_text(encoding="utf-8"))
    full["updated_utc"] = UTC
    if "lygo-public-witness" not in full.get("featured", []):
        full.setdefault("featured", []).insert(1, "lygo-public-witness")
    fs = full.setdefault("skills", [])
    fs[:] = [s for s in fs if s.get("slug") != "lygo-public-witness"]
    fs.insert(
        0,
        {
            "slug": "lygo-public-witness",
            "name": "LYGO Public Witness — FULL zip",
            "package": "lygo-public-witness-full",
            "zip": "lygo-public-witness-full.zip",
            "zip_rel": "dist/lygo-public-witness-full.zip",
            "zip_sha256": digest,
            "bytes": nbytes,
            "file_count": nfiles,
            "role": "Unlocked Public Witness: labeled REFERENCE vs CANON overlay CLI + website + optional Celestrak REFERENCE feeds. Never live Star Chart write.",
            "tier": "lattice",
            "featured": True,
            "harm_default": "read_mostly",
            "source_path": str(ROOT_SKILL),
            "tier_label": "Lattice mesh",
            "channel_label": "FULL engineer zip (not ClawHub)",
        },
    )
    full_cat_path.write_text(json.dumps(full, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # patch lygoskillhub.html boot JSON
    html_path = CHAT / "lygoskillhub.html"
    html = html_path.read_text(encoding="utf-8")
    hub_min = json.dumps(json.loads(hub_path.read_text(encoding="utf-8")), separators=(",", ":"), ensure_ascii=False)
    full_min = json.dumps(json.loads(full_cat_path.read_text(encoding="utf-8")), separators=(",", ":"), ensure_ascii=False)

    def replace_boot(html: str, eid: str, payload: str) -> str:
        start = html.find(f'<script id="{eid}" type="application/json">')
        if start < 0:
            raise SystemExit("missing " + eid)
        start = html.find(">", start) + 1
        end = html.find("</script>", start)
        return html[:start] + payload + html[end:]

    html = replace_boot(html, "boot-catalog", hub_min)
    html = replace_boot(html, "boot-full", full_min)
    html_path.write_text(html, encoding="utf-8")

    # clawhub skills.json
    cj = Path(r"I:\E Drive\lygo-protocol-stack\clawhub\skills.json")
    if cj.exists():
        data = json.loads(cj.read_text(encoding="utf-8"))
        lst = data.setdefault("skills", [])
        if not any(s.get("slug") == "lygo-public-witness" for s in lst):
            lst.insert(
                0,
                {
                    "slug": "lygo-public-witness",
                    "name": "LYGO Public Witness",
                    "summary": "Public feeds are REFERENCE. Dual ledgers, eggs, and Haven Star Chart are CANON. HTTPS GET allowlist. Never invent missing sources.",
                    "clawhub_url": "https://clawhub.ai/deepseekoracle/skills/lygo-public-witness",
                    "mirror": "mirrors/lygo-public-witness",
                    "published": False,
                    "pending_publication": True,
                    "downloads": 0,
                    "version": "1.0.0",
                },
            )
            data["count_mirrored"] = len(lst)
            cj.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(json.dumps({"ok": True, "zip_sha256": digest, "bytes": nbytes, "files": nfiles}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
