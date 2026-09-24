# LYGO Image Engine 1.0.0 — the engine behind the picture module

**Use when** an agent (or a person) has to make a picture with the LYGO stack: on the web portal
with an API key, or on a machine that has the LYGO LLM Console and wants the same engine the
console uses — stable-diffusion.cpp — free and offline.

Δ9Φ963 · part of the LYGO protocol stack. Steward: Justin Helmer / Excavationpro (Lightfather).

## The two paths, and which one you are on

| | who it is for | install | what it costs | speed |
|---|---|---|---|---|
| **A. Web portal + a key** | anyone, no GPU, no install | none — the page does it | your provider's key (Gemini free tier exists) | provider's |
| **B. Your own engine** | a PC with the console | console + this add-on | nothing, unlimited | ~55 s at 512², ~5 min at 1024² on CPU |

Path A routes that a **browser** can call (measured 2026-09-24 from chatagent.ca): Google Gemini,
OpenRouter, SiliconFlow, Fireworks. Vendors that send no CORS header cannot work from a web page at
all — xAI, OpenAI images, DeepInfra, Hyperbolic, Together — and anthropic, groq, mistral, cerebras,
cohere, perplexity and deepseek have no image API. The portal's route table is generated from what
it can actually measure; read it before promising anybody a picture.

## What the agent does (both paths)

One function owns every picture: the portal's `lygoImageGenerate`, exposed to the model as the limb
`image_generate`. The module at the bottom of the portal and the agent in the chat call the same
function, so an agent cannot claim a picture the page did not make.

* Ask in plain words: "draw me a lime green sports car in a futuristic neon city".
* Optional arguments: `size` (256–1536, default 1024), `negative`, `route` (console / gemini /
  openrouter / siliconflow / fireworks), `steps`.
* The result comes back as **route · model · pixels · seconds · bytes**, and the picture is
  displayed to the human. The bytes are never put in the message history — a 1024² picture is
  ~2.8 MB of base64 per turn, which is a bill and a lie about what was seen.
* If the engine is not there, the answer says so (`image_failed`, with the engine's own log tail).
  Never narrate a picture that no engine produced.

## Path B, exactly

1. Install the console: <https://chatagent.ca/lygo-llm-console.html> (1.3.1 PC installer, or the
   FULL set which already contains the chat weights).
2. Install the engine add-on (12.3 MB, CPU build, no CUDA, no admin):
   `https://huggingface.co/DeepSeekOracle/lygo-console-builds/resolve/image-engine-v1/LYGO_IMAGE_ENGINE_SETUP.exe`
3. Fetch a checkpoint once (the only step that needs the network; it resumes):
   `powershell -ExecutionPolicy Bypass -File get_model.ps1` → SDXL Turbo, 6.94 GB and 4 steps.
   `-Model sd15` instead → SD 1.5, 4.27 GB, 20 steps. `-From <url>` for your own host.
   Licence is the model author's: SDXL Turbo is Stability's **non-commercial research** licence,
   SD 1.5 is CreativeML Open RAIL-M. Say which one is in use when commercial rights matter.
4. `LYGO_IMAGE_ENGINE.bat` — finds the console, merges `media_root` + `sd_exe` + `sd_model` into
   `<console>\config\local.json` (never clobbering it; the file must be UTF-8 **without** a BOM,
   because the console reads it with `encoding="utf-8"`), then starts `PUBLIC_GATEWAY.bat`.
5. Open `https://chatagent.ca/portal/?console=http://127.0.0.1:9642`. The console row turns
   **ready** and the module draws on the local machine. 9642 is the gateway's own default port.

Exposure is a decision, not a side effect: the gateway binds `127.0.0.1` and will not go public
without `--lan --i-consent`. Leave it loopback unless the steward says otherwise.

## Numbers worth repeating (measured, this box)

* CPU build: **55 s** at 512×512, **272–300 s** at 1024×1024 while the chat model holds the card.
* CUDA build (1.1 GB of DLLs, not in the add-on): **12.5 s** at 1024² when the card is free.
* The checkpoint decides the steps: distilled models (turbo/schnell/lightning/lcm/dmd/hyper) want
  4 steps at cfg 1.0; a normal SDXL wants ~20 at cfg 7. Running turbo at 20 steps is slow AND worse.
* Sizes are snapped to multiples of 64; 1536 is the ceiling the portal will ask for.

## Pitfalls this skill exists to prevent

* Do not judge engine support by grepping the binary for an architecture name — those strings are
  UTF-16 and a byte grep gives a false negative.
* A 5-minute picture request dies in any proxy: the portal starts a **job**, polls it, and fetches
  the bytes by name. Do not "simplify" it back into one long request.
* A strict CSP needs `frame-src` (TV) and `img-src data:` (pictures); the portal's policy already
  names them. Adding a third-party script to the page would put a stranger's code beside a
  visitor's API key — vendor it instead.
* Generated files land in `<console>\workspace\images\gen-<stamp>.png`; report the path that the
  limb returned, never a path you reconstructed.
