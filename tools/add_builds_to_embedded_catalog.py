"""Mirror the new installer/vault/portal entries into the page's embedded catalog.

The SkillHub grid renders from <script id="boot-catalog" type="application/json">,
not from data/lygoskillhub_catalog.json (that file is only linked in the ledger).
So the embedded copy has to carry the same five entries or they are invisible.

Hash convention: same as tools/pack_public_witness.py - sha256 over the INDENTED
serialisation plus a trailing newline, stored inside the object - then the block
is re-minified for the page.
"""
import hashlib
import io
import json
import os
import re
from datetime import datetime, timezone

SITE = os.path.join(os.path.expandvars(r"%LOCALAPPDATA%\Temp"), "chatagent_site")
PAGE = os.path.join(SITE, "lygoskillhub.html")
CAT = os.path.join(SITE, "data", "lygoskillhub_catalog.json")
SLUGS = ("lygo-llm-console-pc-v1", "lygo-llm-console-usb-v1", "lygo-llm-console-pc-v1-full",
         "lygo-console-model-vault-v1", "lygo-api-portal-web")

with io.open(CAT, encoding="utf-8") as fh:
    file_cat = json.loads(fh.read())
new_entries = [s for s in file_cat["skills"] if s.get("slug") in SLUGS]
assert len(new_entries) == len(SLUGS), f"expected {len(SLUGS)} entries, found {len(new_entries)}"

with io.open(PAGE, encoding="utf-8") as fh:
    html = fh.read()

m = re.search(r'(<script id="boot-catalog" type="application/json">)(.*?)(</script>)', html, re.S)
assert m, "boot-catalog block not found"
hub = json.loads(m.group(2))

items = hub["skills"]
before = len(items)
items[:] = [s for s in items if s.get("slug") not in SLUGS]
items[0:0] = new_entries

counts = hub.setdefault("counts", {})
counts["skills"] = sum(1 for s in items if (s.get("kind") or "skill") == "skill")
counts["downloads"] = sum(1 for s in items if s.get("kind") == "download")
counts["surfaces"] = sum(1 for s in items if s.get("kind") == "surface")
counts["total"] = len(items)
hub["skill_count"] = counts["skills"]
hub["item_count"] = len(items)
hub["updated_utc"] = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

hub["catalog_sha256"] = hashlib.sha256(
    (json.dumps(hub, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
).hexdigest()

compact = json.dumps(hub, indent=None, separators=(",", ":"), ensure_ascii=False)
assert json.loads(compact) == hub, "compact round-trip changed the data"
assert "</script" not in compact, "block would break the page"

html = html[:m.start(2)] + compact + html[m.end(2):]
with io.open(PAGE, "w", encoding="utf-8") as fh:
    fh.write(html)

print(f"embedded catalog: {before} -> {len(items)} items (inserted {len(new_entries)})")
print("counts:", json.dumps(counts))
print("embedded catalog_sha256:", hub["catalog_sha256"])
print("page chars now:", len(html))
