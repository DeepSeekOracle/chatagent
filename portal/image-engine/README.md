# LYGO Image Engine — installer source

The public page for all of this is <https://chatagent.ca/portal/image-engine.html>.
The agent-facing skill is [SKILL.md](SKILL.md).

This folder builds the 12 MB add-on that gives the LYGO LLM Console its picture engine on a machine
that has none: the **CPU build of stable-diffusion.cpp**, plus three helper files that fetch a
checkpoint, hand the console the paths, and start the console's own public gateway.

Published: `LYGO_IMAGE_ENGINE_SETUP.exe` — 12,930,665 B,
sha256 `56934538d1847921d03a96a49b64a59081bdbcf08dc3a1f1bb1d7229716a5a`
on revision `image-engine-v1` of <https://huggingface.co/DeepSeekOracle/lygo-console-builds>.

## What is in here

| file | job |
|---|---|
| `installer/lygo_image_engine.iss` | Inno Setup script: per-user install, no admin, no PATH, no service |
| `installer/get_model.ps1` | fetches a checkpoint from Hugging Face (resumable, size-checked, discards a bad file) |
| `installer/LYGO_IMAGE_ENGINE.bat` | finds the console → merges `config\local.json` → starts `PUBLIC_GATEWAY.bat` |
| `installer/README.txt` | what the user reads inside the install folder |
| `installer/LICENSE_NOTES.txt` | what is ours (MIT engine, our scripts) vs the model authors' (the weights) |

No engine binaries and no weights are committed here — the binaries come from the machine that
already has the engine, and the weights are fetched from their authors by the user.

## Rebuilding it

1. Have the CPU engine on disk (stable-diffusion.cpp CPU release). The `{#EngineSrc}` define at the
   top of the `.iss` points at it; on the steward's box that is `D:\LYGO_MEDIA\tools\sd-cpu`.
2. `"C:\Users\<you>\AppData\Local\Programs\Inno Setup 6\ISCC.exe" portal\image-engine\installer\lygo_image_engine.iss`
3. The output is `D:\LYGO_IMAGE_ENGINE_SETUP.exe`. Hash it, then publish it on a **new revision** of
   the HF repo so a published byte can never move under anyone:
   `resolve/image-engine-v1/...` → `resolve/image-engine-v2/...`.

## Two things that bit, so they are written down

* **`config\local.json` must be UTF-8 without a BOM.** The console reads its config with
  `encoding="utf-8"` (`src/paths.py`), so a BOM makes the whole file unreadable and the engine looks
  missing. PowerShell's `Set-Content -Encoding UTF8` writes a BOM — use
  `[System.IO.File]::WriteAllText($p, $text, (New-Object System.Text.UTF8Encoding($false)))`.
* **Parentheses inside an `echo` in a parenthesised `if`/`else` block break `cmd`.** `echo ... (it
  resumes, ...)` closed the block early and the launcher died with `or was unexpected at this time.`
  Use dashes, or the script fails on a machine that has no idea why.

## Verifying an install, honestly

A silent install into a scratch folder, a stub console root, and the launcher's own output is enough
to prove the wiring without touching a working console:

    LYGO_IMAGE_ENGINE_SETUP.exe /VERYSILENT /DIR="D:\LYGO_IE_TEST"
    set LYGO_CONSOLE_ROOT=D:\LYGO_IE_TEST\console_stub
    LYGO_IMAGE_ENGINE.bat        rem must print engine OK, checkpoint OK, console OK, keys now: ...
    od -An -tx1 -N4 D:\LYGO_IE_TEST\console_stub\config\local.json    rem 7b 0d 0a 20 = { with no BOM

Then remove the scratch install with its own uninstaller.
