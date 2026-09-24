LYGO IMAGE ENGINE 1.0.0  —  the picture engine for the LYGO LLM Console
=======================================================================

This installed stable-diffusion.cpp (the CPU build) into:

    tools\sd-cpu\sd-cli.exe   + the DLLs it needs

That is the whole engine. It runs on any 64-bit Windows PC: no CUDA, no card,
no Python, no service, no admin rights. An 8 GB card makes it ~4x faster, but
the CPU build is the one that always works.

THE ONE STEP LEFT: A CHECKPOINT
-------------------------------
The weights are not in this installer (they are 4-7 GB and they belong to their
authors). Fetch one once:

    powershell -ExecutionPolicy Bypass -File get_model.ps1 -List
    powershell -ExecutionPolicy Bypass -File get_model.ps1

The default is SDXL Turbo (6.9 GB, 4 steps, the fast one). It resumes if it is
interrupted — run the same command again. Or drop any .safetensors checkpoint of
your own into  models\sd\  and this installer's launcher will pick it up.

THEN: POINT THE CONSOLE AT IT AND START THE GATEWAY
---------------------------------------------------
    LYGO_IMAGE_ENGINE.bat

It looks for the console, writes  <console>\config\local.json  with
media_root + sd_exe + sd_model (merging, never overwriting), says out loud
whether it found both, and starts  PUBLIC_GATEWAY.bat  on 127.0.0.1:9642.

On the web portal, open:

    https://chatagent.ca/portal/?console=http://127.0.0.1:9642

The console row in the image suite turns "ready" and the module draws the
picture on YOUR machine — free, unlimited, no API key, nothing sent anywhere.

WHAT IT DOES NOT DO
-------------------
* It does not open your PC to the network. The gateway binds 127.0.0.1 — this
  PC only. LAN or public exposure is a separate, explicit decision
  (gateway_bind in config\local.json, and the gateway asks for consent).
* It does not install a chat model. Pictures work without one; chat needs a
  model in the console's vault.
* It does not put anything on PATH or in the registry beyond a normal per-user
  uninstall entry.

HONEST SPEED, measured on the steward's own box (8 GB card, chat model loaded):
    512x512   about 55 s    1024x1024  about 5 minutes
With the card free, the CUDA build does 1024x1024 in about 12.5 s. The CPU
build is the one you have; the difference is the card, not the software.

Where the engine comes from: stable-diffusion.cpp (MIT) — source and releases
at https://github.com/leejet/stable-diffusion.cpp
Where the checkpoints come from: Hugging Face, with the licences their authors
set (SDXL Turbo: Stability AI non-commercial research; SD 1.5: CreativeML Open
RAIL-M). See LICENSE_NOTES.txt.
