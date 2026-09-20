"""Add the V1 installers, the model vault and the web portal to the SkillHub catalog.

Replicates tools/pack_public_witness.py's hashing convention exactly:
  raw = json.dumps(hub_without_recompute, indent=2, ensure_ascii=False) + "\n"
  hub["catalog_sha256"] = sha256(raw)
Note the generator computes the digest over the JSON *as loaded* (i.e. including
the previous catalog_sha256 value) - so do we, or the ledger would break.
"""
import hashlib
import io
import json
import os
from datetime import datetime, timezone

P = os.path.join(os.path.expandvars(r"%LOCALAPPDATA%\Temp"), "chatagent_site", "data", "lygoskillhub_catalog.json")

HF = "https://huggingface.co/DeepSeekOracle/lygo-console-builds"
TAG = "console-v1"

NEW = [
    {
        "kind": "download",
        "slug": "lygo-llm-console-pc-v1",
        "name": "LYGO LLM Console V1 — PC LOCAL installer (light)",
        "summary": "The V1 console for a Windows PC as an installer: build 1.1.1, build-line 2026-09-20, sealed to the canon vault and clean-room re-verified (605 tests green, certify + verify_install 26/26). 553,444,248 B. No model inside — it ships the fetcher and a pinned manifest so you pull only what your machine can run, from our own vault, SHA-256 checked. Drop a bigger GGUF in later; no reinstall.",
        "downloads": 0,
        "category": "download",
        "url": HF + "/resolve/" + TAG + "/LYGO_LLM_CONSOLE_V1_PC_SETUP.exe",
        "docs": HF + "/blob/" + TAG + "/README.md",
        "install": "1) Verify: CertUtil -hashfile LYGO_LLM_CONSOLE_V1_PC_SETUP.exe SHA256 — expect 7dda0e354142eb33b5b86b15aefa3289143f8f7f99cd11d2970280508c2e64db. 2) Run the installer (per-user; defaults to D:\\). 3) Models: python fetch_models.py --profile basic --dest D:\\LYGO_MODELS. 4) LYGO_LLM_CONSOLE.bat → Scan drives → Boot. Read READ_DISCLAIMER_FIRST.md.",
        "source": "download",
        "channel": "usb",
        "channel_label": "USB / kit download",
    },
    {
        "kind": "download",
        "slug": "lygo-llm-console-usb-v1",
        "name": "LYGO LLM Console V1 — USB LOCAL installer (light)",
        "summary": "The same V1 console built for a stick (LYGO BUILDER KEY / CLAW): keep its own save/ and models/ on the USB root and run stand-alone. 562,222,511 B, build 1.1.1, 361 files / 49 folders sealed, clean-room re-verified. No model inside — fetch from our vault.",
        "downloads": 0,
        "category": "download",
        "url": HF + "/resolve/" + TAG + "/LYGO_LLM_CONSOLE_V1_USB_SETUP.exe",
        "docs": HF + "/blob/" + TAG + "/INSTALL_NOTES_USB.txt",
        "install": "1) Verify: CertUtil -hashfile LYGO_LLM_CONSOLE_V1_USB_SETUP.exe SHA256 — expect d21e608f5801a7838d13453ed3c609923458e18b6a3efa536604b9513b6fbe8d. 2) Run the installer and point it at your USB root. 3) Models on the stick: python fetch_models.py --profile basic --dest <stick>\\models. 4) LYGO_LLM_CONSOLE.bat → Scan drives → Boot.",
        "source": "download",
        "channel": "usb",
        "channel_label": "USB / kit download",
    },
    {
        "kind": "download",
        "slug": "lygo-llm-console-pc-v1-full",
        "name": "LYGO LLM Console V1 — PC LOCAL installer (FULL, gemma4-12b inside)",
        "summary": "The V1 PC console with gemma4-12b (text · image · audio) and its projector already installed — runs with no network at all. 8,109,962,376 B across three files: …FULL.exe is disc 1, the two .bin files are discs 2-3. Keep all three in one folder. Windows cannot build a single .exe past ~4.2 GB, so the set is split (normal Inno disk spanning). Wants ~32 GB RAM.",
        "downloads": 0,
        "category": "download",
        "url": HF + "/tree/" + TAG,
        "docs": HF + "/blob/" + TAG + "/INSTALL_NOTES_PC_FULL.txt",
        "install": "1) Download all three files into one folder: LYGO_LLM_CONSOLE_V1_PC_SETUP_FULL.exe (2,141,953 B, sha256 529f9d05294e60eb7268abd4fc496a5932bc71e01a1ae203c9a6f9e790342c68), …FULL-1.bin (4,292,825,087 B, sha256 2ec98638c2b028eaf272daaa62c81f7165cf6abd69b1b8df6db53f81fdd4b6e3), …FULL-2.bin (3,814,995,336 B, sha256 d9eb3316d4d06d0fc50aa7a9f762c67d2c811e4db7bda95e0b8310c9197cf5f5). 2) Verify each with CertUtil -hashfile FILE SHA256. 3) Run …FULL.exe. 4) LYGO_LLM_CONSOLE.bat → Scan drives → Boot.",
        "source": "download",
        "channel": "usb",
        "channel_label": "USB / kit download",
    },
    {
        "kind": "download",
        "slug": "lygo-console-model-vault-v1",
        "name": "LYGO Console Model Vault (our own host)",
        "summary": "The weights the console boots, hosted by us and pinned to an immutable revision with a SHA-256 per file: gemma4-12b + vision/audio projector, qwen2.5-coder-7b, nomic-embed-text (all Apache-2.0). The light installers' fetcher reads models.lock.json and pulls only from this vault — nothing from a third-party site, nothing from a moving branch. GitHub mirror included.",
        "downloads": 0,
        "category": "download",
        "url": "https://huggingface.co/DeepSeekOracle/lygo-console-models",
        "docs": "https://github.com/DeepSeekOracle/lygo-console-models",
        "install": "python fetch_models.py --list; python fetch_models.py --profile basic --dest D:\\LYGO_MODELS (gemma4-12b + projector, 7.3 GB) or --profile full (all four, 11.7 GB). Every file is digest-checked before it is kept. --check --dest <dir> verifies an existing collection.",
        "source": "download",
        "channel": "usb",
        "channel_label": "USB / kit download",
    },
    {
        "kind": "surface",
        "slug": "lygo-api-portal-web",
        "name": "LYGO API Portal (site) — WEB PORTAL, API only",
        "summary": "The third system: a stand-alone web portal for people who need a ninja console and have no GPU. Bring your own key from any vendor (Groq, Gemini, OpenRouter, Cerebras, OpenAI, Grok, DeepSeek) — browser tools and 15 champions work in the tab, keys stay in the tab. No install, no local model. Legal summary at /portal/legal.html.",
        "category": "surface",
        "url": "https://chatagent.ca/portal/",
        "docs": "https://chatagent.ca/portal/legal.html",
        "source": "surface",
        "channel": "surface",
        "channel_label": "Lattice surface",
    },
]

with io.open(P, encoding="utf-8") as fh:
    hub = json.loads(fh.read())

skills = hub.setdefault("skills", [])
slugs = {e["slug"] for e in NEW}
before = len(skills)
skills[:] = [s for s in skills if s.get("slug") not in slugs]
removed = before - len(skills)
skills[0:0] = NEW

counts = hub.setdefault("counts", {})
counts["skills"] = sum(1 for s in skills if s.get("kind") == "skill")
counts["plugins"] = sum(1 for s in skills if s.get("kind") == "plugin")
counts["downloads"] = sum(1 for s in skills if s.get("kind") == "download")
counts["surfaces"] = sum(1 for s in skills if s.get("kind") == "surface")
counts["total"] = len(skills)
hub["skill_count"] = counts["skills"]
hub["item_count"] = len(skills)
hub["updated_utc"] = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

raw = json.dumps(hub, indent=2, ensure_ascii=False) + "\n"
hub["catalog_sha256"] = hashlib.sha256(raw.encode("utf-8")).hexdigest()

with io.open(P, "w", encoding="utf-8") as fh:
    fh.write(json.dumps(hub, indent=2, ensure_ascii=False) + "\n")

print(f"replaced {removed} existing entries, inserted {len(NEW)}")
print("counts:", json.dumps(counts))
print("updated_utc:", hub["updated_utc"])
print("catalog_sha256:", hub["catalog_sha256"])
print("items now:", len(skills))
