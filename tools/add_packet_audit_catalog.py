"""Add packet-audit (ClawHub @deepseekoracle/packet-audit 1.0.0) to the SkillHub catalog.

Two copies must agree, because the page renders from the embedded block, not the file:
  lygoskillhub.html   <script id="boot-catalog" type="application/json">  (minified)
  data/lygoskillhub_catalog.json                                          (indent=2)

Digest convention, confirmed against the live page before this change (the page's own
stored digest reproduces exactly under it):
    sha256( json.dumps(obj_with_catalog_sha256_emptied,
                       separators=(",", ":"), ensure_ascii=False) )
for the page block, and the same object serialised with indent=2, ensure_ascii=False,
plus a trailing newline, for the ledger file. The value is written back into the object
after hashing, so a reader can reproduce it by emptying the field and re-hashing.
"""

import hashlib
import json
import re
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "lygoskillhub.html"
LEDGER = ROOT / "data" / "lygoskillhub_catalog.json"

ENTRY = {
    "kind": "skill",
    "slug": "packet-audit",
    "name": "Packet Audit",
    "summary": (
        "Use when documents must pass an authority first time - visa, rental, mortgage, "
        "insurance, benefits, licensing. Checks a folder for missing, expired, or mutually "
        "inconsistent documents with page citations, plus a SHA-256 manifest. Three bundled "
        "profiles, offline and deterministic, no model calls. Not legal advice, not eligibility, "
        "not OCR."
    ),
    "downloads": 0,
    "category": "tools",
    "clawhub_url": "https://clawhub.ai/deepseekoracle/skills/packet-audit",
    "install": "npx clawhub@latest install deepseekoracle/packet-audit",
    "has_local_skill": True,
    "has_stack_mirror": True,
    "source": "mirror",
    "note": "Present in clawhub/mirrors; ensure skills.json + ClawHub stay in sync",
    "channel": "public_tentacle",
    "channel_label": "Public tentacle (ClawHub)",
}

BLOCK = re.compile(r'(<script id="boot-catalog" type="application/json">)(.*?)(</script>)', re.S)


def page_digest(obj: dict) -> str:
    blank = dict(obj)
    blank["catalog_sha256"] = ""
    text = json.dumps(blank, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def ledger_digest(obj: dict) -> str:
    blank = dict(obj)
    blank["catalog_sha256"] = ""
    text = json.dumps(blank, indent=2, ensure_ascii=False) + "\n"
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def main() -> int:
    html = PAGE.read_text(encoding="utf-8")
    match = BLOCK.search(html)
    if not match:
        raise SystemExit("boot-catalog block not found")
    hub = json.loads(match.group(2))

    # 1. digest convention check on the unmodified page (proves the rule before we use it)
    stored = hub.get("catalog_sha256", "")
    assert page_digest(hub) == stored, "page digest convention does not reproduce; refusing to write"

    items = hub["skills"]
    before_total = len(items)
    items[:] = [item for item in items if item.get("slug") != ENTRY["slug"]]
    already_present = len(items) < before_total
    items.insert(0, json.loads(json.dumps(ENTRY)))

    # 2. counts: skill-shaped metrics move by one; stack_skills_json follows the real ledger file
    counts = hub["counts"]
    if not already_present:
        counts["clawhub_skills_indexed"] += 1
        counts["clawhub_profile_skills_listed"] += 1
    counts["total"] = len(items)
    counts["downloads"] = sum(1 for i in items if i.get("kind") == "download")
    counts["surfaces"] = sum(1 for i in items if i.get("kind") == "surface")
    counts["skills"] = sum(1 for i in items if i.get("kind") == "skill")
    counts["stack_skills_json"] = 45  # clawhub/skills.json lists 45 skills (44 public + packet-audit)
    hub["skill_count"] = counts["skills"]
    hub["item_count"] = counts["item_count"]

    # 3. stamp
    hub["version"] = "1.6.3"
    hub["updated_utc"] = time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime())
    status = hub.get("clawhub_status")
    if isinstance(status, dict):
        note = status.get("note", "")
        add = "packet-audit 1.0.0 new (offline submission-packet audit, 3 profiles)"
        if "packet-audit" not in note:
            status["note"] = (note.rstrip(". ") + ". " + add + ".") if note else add + "."
    elif isinstance(status, str) and "packet-audit" not in status:
        hub["clawhub_status"] = status + " Recent: packet-audit 1.0.0 new."

    # 4. seal and write both copies
    hub["catalog_sha256"] = page_digest(hub)
    PAGE.write_text(html[: match.start()] + match.group(1)
                    + json.dumps(hub, separators=(",", ":"), ensure_ascii=False)
                    + match.group(3) + html[match.end():], encoding="utf-8")

    ledger = json.loads(json.dumps(hub))
    ledger["catalog_sha256"] = ledger_digest(hub)
    LEDGER.write_text(json.dumps(ledger, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print("inserted:", ENTRY["slug"], "at index", 0)
    print("items:", before_total, "->", len(items))
    print("counts:", json.dumps(counts))
    print("version:", hub["version"], "updated:", hub["updated_utc"])
    print("page digest   :", hub["catalog_sha256"][:16])
    print("ledger digest :", ledger["catalog_sha256"][:16])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
