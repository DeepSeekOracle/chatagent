#!/usr/bin/env python3
"""LYGO limb bridge — one local engine, exposed to the portal in one file.

    python limb_server.py --limb image   --port 8191 --backend comfy --models E:\\LYGO_LIMBS\\image
    python limb_server.py --limb sound   --port 8192 --backend comfy --models E:\\LYGO_LIMBS\\sound
    python limb_server.py --limb video   --port 8193 --backend comfy --models E:\\LYGO_LIMBS\\video
    python limb_server.py --limb image   --port 8191 --backend stub      # prove the wiring, no weights

Why this exists: chatagent.ca/portal/ runs in a browser and can only call a local engine that (a) answers
CORS preflights, including Chrome's Local Network Access header, and (b) speaks one small JSON contract.
ComfyUI answers neither, so the browser cannot talk to it directly. This file is the adapter: it takes a
prompt, drives the engine, and hands the portal bytes with the right headers. Nothing leaves the machine.

Endpoints
    GET  /health    -> JSON, unauthenticated, cheap: what this limb is and whether it can draw
    POST /generate  -> JSON in, bytes out (image/png, audio/wav, video/mp4)
    GET  /progress  -> JSON: what the current job is doing (the portal shows a clock, not a spinner)

Backends
    stub      synthetic output, no weights — use it to verify the page <-> limb loop before downloading 20 GB
    comfy     a running ComfyUI (default http://127.0.0.1:8188) plus a workflow JSON; this is the path that
              runs Qwen-Image 2.1, ACE-Step 1.5 and Wan 2.2
    diffusers the HF pipeline loaded directly (image only; needs torch + diffusers + the weights)

The workflow for --backend comfy is a ComfyUI **API-format** graph. Your agent builds it against the
ComfyUI it installed (GET /object_info tells you the node names and their inputs), saves it next to this
file, and passes --workflow. Node titles this bridge understands are documented in
portal/limbs/skills/*.md; unknown titles are left alone.
"""
from __future__ import annotations

import argparse
import base64
import io
import json
import math
import os
import random
import shutil
import struct
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import zlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

VERSION = "1.0.0"
ALLOWED_ORIGIN_PREFIXES = ("https://chatagent.ca", "https://www.chatagent.ca",
                           "http://127.0.0.1", "http://localhost")

LIMB_DEFAULTS = {
    "image": {"port": 8191, "content_type": "image/png", "ext": "png",
              "model": "Qwen-Image 2.1", "seconds": 60},
    "sound": {"port": 8192, "content_type": "audio/wav", "ext": "wav",
              "model": "ACE-Step 1.5", "seconds": 120},
    "video": {"port": 8193, "content_type": "video/mp4", "ext": "mp4",
              "model": "Wan 2.2 TI2V-5B", "seconds": 600},
}

STATE = {"limb": "image", "backend": "stub", "model": "", "busy": False, "stage": "idle",
         "started": 0.0, "last_seconds": None, "jobs": 0, "error": ""}
LOCK = threading.Lock()


# ---------------------------------------------------------------- CORS ----------
def origin_ok(origin: str) -> bool:
    if not origin:
        return True                      # curl, the agent, a native client
    return origin.startswith(ALLOWED_ORIGIN_PREFIXES)


# ------------------------------------------------------------- stub assets ------
def _png(width: int, height: int, prompt: str) -> bytes:
    """A real PNG, drawn with zlib only: gradient + a band keyed to the prompt."""
    seed = abs(hash(prompt)) % 360
    row = bytearray()
    raw = bytearray()
    for y in range(height):
        raw.append(0)                                    # filter byte
        for x in range(width):
            u, v = x / max(1, width - 1), y / max(1, height - 1)
            band = 1.0 if (int(v * 12) % 2) else 0.55
            r = int(255 * (0.15 + 0.55 * u) * band)
            g = int(255 * (0.10 + 0.45 * (1 - v)) * band)
            b = int(255 * (0.25 + 0.45 * ((seed / 360) * u)) * band)
            raw += bytes((r & 255, g & 255, b & 255))
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) +
            chunk(b"IDAT", zlib.compress(bytes(raw), 6)) + chunk(b"IEND", b""))


def _wav(prompt: str, seconds: float = 4.0, rate: int = 22050) -> bytes:
    """A WAV that is unmistakably synthetic: an arpeggio whose key comes from the prompt."""
    import wave
    base = 220.0 * (2 ** ((abs(hash(prompt)) % 12) / 12.0))
    frames = bytearray()
    n = int(rate * seconds)
    for i in range(n):
        t = i / rate
        step = int(t * 2) % 4
        f = base * (2 ** (step / 4.0))
        env = min(1.0, t * 4) * (1.0 - (t / seconds) ** 3)
        s = 0.35 * env * math.sin(2 * math.pi * f * t)
        frames += struct.pack("<h", int(max(-1.0, min(1.0, s)) * 32000))
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
        w.writeframes(bytes(frames))
    return buf.getvalue()


def _mp4(prompt: str, seconds: float = 3.0) -> bytes:
    """Synthetic clip via ffmpeg's own sources; needs ffmpeg on PATH."""
    ff = shutil.which("ffmpeg")
    if not ff:
        raise RuntimeError("ffmpeg is not on PATH; install it (winget install Gyan.FFmpeg) or use --backend comfy")
    hue = abs(hash(prompt)) % 360
    out = os.path.join(tempfile.mkdtemp(prefix="limb_"), "stub.mp4")
    cmd = [ff, "-v", "error", "-f", "lavfi", "-i",
           f"testsrc2=size=960x544:rate=24:duration={seconds}",
           "-vf", f"hue=h={hue}", "-pix_fmt", "yuv420p", "-y", out]
    subprocess.run(cmd, check=True, timeout=120)
    with open(out, "rb") as fh:
        data = fh.read()
    shutil.rmtree(os.path.dirname(out), ignore_errors=True)
    return data


# ------------------------------------------------------------- comfy backend ----
class Comfy:
    """Minimal ComfyUI API client: submit an API-format graph, wait, fetch the artifact."""

    def __init__(self, base: str, workflow: dict, timeout: int):
        self.base = base.rstrip("/")
        self.workflow = workflow
        self.timeout = timeout
        self.client_id = "lygo-limb-%d" % random.randint(1000, 9999)

    def _req(self, path: str, payload=None, raw=False):
        url = self.base + path
        data = json.dumps(payload).encode() if payload is not None else None
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read() if raw else json.loads(r.read() or b"{}")

    def health(self) -> bool:
        try:
            self._req("/system_stats")
            return True
        except Exception:
            return False

    def run(self, prompt: str, opts: dict) -> bytes:
        graph = json.loads(json.dumps(self.workflow))       # deep copy
        for node in graph.values():
            title = (node.get("_meta") or {}).get("title", "")
            inputs = node.setdefault("inputs", {})
            if title == "PROMPT":
                inputs["text"] = prompt
            elif title in ("SEED", "NOISE_SEED"):
                inputs["seed"] = int(opts.get("seed") or random.randint(1, 2**31))
            elif title == "WIDTH":
                inputs["value"] = int(opts.get("width") or 1024)
            elif title == "HEIGHT":
                inputs["value"] = int(opts.get("height") or 1024)
            elif title == "SECONDS":
                inputs["value"] = float(opts.get("seconds") or 5)
            elif title == "STEPS":
                inputs["steps"] = int(opts.get("steps") or 20)
        job = self._req("/prompt", {"prompt": graph, "client_id": self.client_id})
        pid = job.get("prompt_id")
        if not pid:
            raise RuntimeError("ComfyUI refused the workflow: " + json.dumps(job)[:400])
        deadline = time.time() + self.timeout
        while time.time() < deadline:
            hist = self._req("/history/" + pid)
            if pid in hist:
                outs = hist[pid].get("outputs") or {}
                for node in outs.values():
                    for key in ("images", "gifs", "audio", "videos"):
                        for item in (node.get(key) or []):
                            q = urllib.parse.urlencode({"filename": item.get("filename", ""),
                                                        "subfolder": item.get("subfolder", ""),
                                                        "type": item.get("type", "output")})
                            return self._req("/view?" + q, raw=True)
                raise RuntimeError("ComfyUI finished but returned no file: " + json.dumps(outs)[:400])
            with LOCK:
                STATE["stage"] = "engine running · %.0fs" % (time.time() - STATE["started"])
            time.sleep(1.5)
        raise RuntimeError("the engine did not finish within %ds (raise --timeout)" % self.timeout)


class DiffusersImage:
    """Direct HF pipeline path: Qwen-Image 2.1 (or any text-to-image pipeline)."""

    def __init__(self, models_dir: str, device: str):
        self.pipe = None
        self.models_dir = models_dir
        self.device = device

    def health(self) -> bool:
        return os.path.isdir(self.models_dir) and any(
            f.endswith((".safetensors", ".gguf")) for f in os.listdir(self.models_dir))

    def load(self):
        if self.pipe is not None:
            return self.pipe
        import torch                                            # noqa: F401  (honest failure if absent)
        from diffusers import DiffusionPipeline
        dtype = "float16" if self.device.startswith("cuda") else "float32"
        self.pipe = DiffusionPipeline.from_pretrained(
            self.models_dir, torch_dtype=getattr(torch, dtype))
        self.pipe = self.pipe.to(self.device)
        return self.pipe

    def run(self, prompt: str, opts: dict) -> bytes:
        pipe = self.load()
        img = pipe(prompt=prompt, num_inference_steps=int(opts.get("steps") or 30),
                   width=int(opts.get("width") or 1024),
                   height=int(opts.get("height") or 1024)).images[0]
        buf = io.BytesIO(); img.save(buf, format="PNG"); return buf.getvalue()


# ------------------------------------------------------------------ HTTP --------
class Handler(BaseHTTPRequestHandler):
    server_version = "LYGO-Limb/" + VERSION
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        sys.stderr.write("  %s %s\n" % (self.command, self.path))

    def _cors(self):
        origin = self.headers.get("Origin", "")
        if origin_ok(origin):
            self.send_header("Access-Control-Allow-Origin", origin or "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "600")

    def _json(self, code: int, body: dict):
        data = json.dumps(body).encode()
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/health"):
            defaults = LIMB_DEFAULTS[STATE["limb"]]
            self._json(200, {
                "ok": True, "limb": STATE["limb"], "backend": STATE["backend"],
                "model": STATE["model"] or defaults["model"], "ready": not STATE["busy"],
                "device": STATE["device"], "version": VERSION, "cors": True,
                "jobs": STATE["jobs"], "last_seconds": STATE["last_seconds"],
                "note": "stub output" if STATE["backend"] == "stub" else "",
            })
            return
        if self.path.startswith("/progress"):
            self._json(200, {"busy": STATE["busy"], "stage": STATE["stage"],
                             "elapsed": round(time.time() - STATE["started"], 1) if STATE["busy"] else 0,
                             "error": STATE["error"]})
            return
        self._json(404, {"ok": False, "why": "GET /health, /progress"})

    def do_POST(self):
        if not self.path.startswith("/generate"):
            self._json(404, {"ok": False, "why": "POST /generate"})
            return
        length = int(self.headers.get("Content-Length") or 0)
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            self._json(400, {"ok": False, "why": "body must be JSON"})
            return
        prompt = (body.get("prompt") or "").strip()
        if not prompt:
            self._json(400, {"ok": False, "why": "prompt is required"})
            return
        with LOCK:
            if STATE["busy"]:
                self._json(429, {"ok": False, "why": "one job at a time; poll /progress"})
                return
            STATE.update(busy=True, stage="starting", started=time.time(), error="")
        try:
            backend, limb = STATE["backend"], STATE["limb"]
            if backend == "stub":
                with LOCK:
                    STATE["stage"] = "drawing a stub"
                if limb == "image":
                    data = _png(int(body.get("width") or 768), int(body.get("height") or 768), prompt)
                elif limb == "sound":
                    data = _wav(prompt, float(body.get("seconds") or 4))
                else:
                    data = _mp4(prompt, float(body.get("seconds") or 3))
            elif backend == "comfy":
                engine: Comfy = self.server.engine
                if not engine.health():
                    raise RuntimeError("ComfyUI is not answering at " + engine.base +
                                       " — start it, or pass --comfy http://127.0.0.1:8188")
                data = engine.run(prompt, body)
            else:
                data = self.server.engine.run(prompt, body)
            ctype = LIMB_DEFAULTS[limb]["content_type"]
            took = round(time.time() - STATE["started"], 1)
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("X-Limb-Model", STATE["model"] or LIMB_DEFAULTS[limb]["model"])
            self.send_header("X-Limb-Backend", backend)
            self.send_header("X-Limb-Seconds", str(took))
            self.end_headers()
            self.wfile.write(data)
            with LOCK:
                STATE.update(busy=False, stage="idle", last_seconds=took, jobs=STATE["jobs"] + 1)
        except Exception as e:                                   # noqa: BLE001 - report, never crash
            with LOCK:
                STATE.update(busy=False, stage="error", error=str(e)[:600])
            self._json(500, {"ok": False, "why": str(e)[:600]})


def main() -> int:
    ap = argparse.ArgumentParser(description="LYGO limb bridge: one local engine, one JSON contract.")
    ap.add_argument("--limb", choices=sorted(LIMB_DEFAULTS), required=True)
    ap.add_argument("--port", type=int, default=0)
    ap.add_argument("--backend", choices=("stub", "comfy", "diffusers"), default="stub")
    ap.add_argument("--comfy", default="http://127.0.0.1:8188", help="ComfyUI base URL")
    ap.add_argument("--workflow", help="ComfyUI API-format workflow JSON (required for --backend comfy)")
    ap.add_argument("--models", default="", help="model folder (--backend diffusers)")
    ap.add_argument("--device", default="cuda", help="cuda | cpu (--backend diffusers)")
    ap.add_argument("--timeout", type=int, default=0, help="seconds to wait for the engine")
    ap.add_argument("--bind", default="127.0.0.1", help="127.0.0.1 keeps it on this machine")
    args = ap.parse_args()

    d = LIMB_DEFAULTS[args.limb]
    port = args.port or d["port"]
    timeout = args.timeout or d["seconds"] * 4
    STATE.update(limb=args.limb, backend=args.backend, model="", device=args.device)

    engine = None
    if args.backend == "comfy":
        if not args.workflow or not os.path.isfile(args.workflow):
            print("--backend comfy needs --workflow <api.json>; build it against your ComfyUI "
                  "(GET /object_info) — see portal/limbs/skills/%s.md" % args.limb)
            return 2
        with open(args.workflow, encoding="utf-8") as fh:
            engine = Comfy(args.comfy, json.load(fh), timeout)
        STATE["model"] = d["model"]
    elif args.backend == "diffusers":
        if args.limb != "image":
            print("--backend diffusers is wired for image only; use comfy for sound and video")
            return 2
        engine = DiffusersImage(args.models, args.device)
        STATE["model"] = d["model"]

    srv = ThreadingHTTPServer((args.bind, port), Handler)
    srv.engine = engine
    print("\n  LYGO %s limb · %s backend · %s" % (args.limb, args.backend, STATE["model"] or d["model"]))
    print("  listening  http://%s:%d  (health: /health, generate: POST /generate)" % (args.bind, port))
    if args.backend == "stub":
        print("  stub mode: output is synthetic. It proves the portal <-> limb loop, not your model.")
    if args.backend == "comfy":
        print("  engine     %s  %s" % (args.comfy, "answers" if engine.health() else "NOT answering yet"))
    print("  leave this window open while the portal is in use. Ctrl+C stops it.\n")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n  stopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
