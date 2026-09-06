"""LYGO Star Chart HF bot — structured monitor + consent-gated pending queue."""
from __future__ import annotations

import json
import traceback

import gradio as gr
import spaces

from monitor import format_pulse_md, ping_feed, queue_proposal, write_monitor
import hub_ops

try:
    import lattice_audit as lattice_mod
except ImportError:
    lattice_mod = None

EXAMPLE = json.dumps(
    {
        "signature": "Δ9Φ963-HAVEN-STAR-SUBMISSION-v1",
        "submitter_type": "aligned_agent",
        "class": "PENDING_PROPOSAL",
        "not_canonical": True,
        "agent_attestation": {
            "agent_id": "LYGO-STAR-MONITOR",
            "skill_slug": "lygo-haven-star-chart",
            "scan_cue": "LYGO-HSC-ATTEST-v1; gate=haven_star_chart_gate.py; P0-first; consent-gated; user-reviewed",
            "local_gate_pass": False,
        },
        "node": {
            "id": "NODE_STAR_MONITOR",
            "kind": "lattice",
            "name": "Star Chart live monitor limb",
            "equation": "Δ9Φ963 = Truth × Light · 963 Hz · monitor GET → pending → steward ingest",
            "glyph": "★",
            "tone": "963 Hz",
            "tags": ["STAR_MONITOR", "LATTICE"],
            "connections": ["SEAL_000", "PORTAL_STAR_CHART"],
            "urls": {
                "chart": "https://deepseekoracle.github.io/lygo-protocol-stack/HavenStarChart.html",
                "monitor": "https://chatagent.ca/starchart/",
            },
        },
    },
    indent=2,
)

CSS = """
.gradio-container {max-width: 1100px !important;}
footer {opacity: 0.45;}
"""


def _pair_from_mon(mon: dict) -> tuple[str, str]:
    return format_pulse_md(mon), json.dumps(mon, indent=2)


def pulse_board() -> tuple[str, str]:
    try:
        return _pair_from_mon(ping_feed())
    except Exception as e:
        err = {"ok": False, "error": str(e)[:400], "trace": traceback.format_exc()[-600:]}
        return f"## Pulse failed\n\n`{e}`", json.dumps(err, indent=2)


def persist_board() -> tuple[str, str]:
    try:
        mon = ping_feed()
        note = write_monitor(mon)
        md, raw = _pair_from_mon(mon)
        return md + "\n\n### Dataset write\n\n" + note.split("\n", 1)[0], raw
    except Exception as e:
        return f"## Persist failed\n\n`{e}`", json.dumps({"ok": False, "error": str(e)[:400]}, indent=2)


@spaces.GPU(duration=30)
def gpu_health() -> str:
    """ZeroGPU Spaces require at least one @spaces.GPU entrypoint."""
    return "ZeroGPU slot ok. Pulse, lattice audit, and queue stay on CPU."


def queue_text(raw: str, agent: str, consent: bool = True) -> str:
    try:
        return queue_proposal(raw or EXAMPLE, agent or "LYGO-STAR-MONITOR", True)
    except Exception as e:
        return "Queue failed: " + str(e)[:400]


def lattice_board() -> tuple[str, str]:
    if not lattice_mod:
        miss = {"ok": False, "error": "lattice_audit.py not bundled on this Space."}
        return "## Lattice audit unavailable\n\n`lattice_audit.py` missing.", json.dumps(miss, indent=2)
    try:
        doc = lattice_mod.audit()
        return lattice_mod.format_audit_md(doc), json.dumps(doc, indent=2)
    except Exception as e:
        err = {"ok": False, "error": str(e)[:400], "trace": traceback.format_exc()[-600:]}
        return f"## Lattice audit failed\n\n`{e}`", json.dumps(err, indent=2)


def lattice_persist_board() -> tuple[str, str]:
    if not lattice_mod:
        return lattice_board()
    try:
        doc = lattice_mod.audit()
        note = lattice_mod.write_audit(doc)
        md = lattice_mod.format_audit_md(doc)
        return md + "\n\n### Dataset write\n\n" + note.split("\n", 1)[0], json.dumps(doc, indent=2)
    except Exception as e:
        return f"## Lattice persist failed\n\n`{e}`", json.dumps({"ok": False, "error": str(e)[:400]}, indent=2)


with gr.Blocks(title="LYGO Star Chart Bot", css=CSS, fill_height=False) as demo:
    gr.Markdown(
        """# LYGO Star Chart Bot
Live **monitor** of the hash-chained Haven Star Chart feed, **open egg plant**, lattice audit, and **PENDING** star queue. Police = P0-lite + secrets. No human yes-click.

Canon feed: [haven_star_chart_feed.json](https://deepseekoracle.github.io/lygo-protocol-stack/haven_star_chart/haven_star_chart_feed.json) · Site: [chatagent.ca/starchart](https://chatagent.ca/starchart/) · Kernel: [chatagent.ca/lattice](https://chatagent.ca/lattice/)

This bot **never** appends forged `entry_hash` values to GitHub Pages. Page load is GET-only (no dataset write). Steward ingest remains the only LIVE chart write.

**Donate (optional tip):** [PayPal.me/ExcavationPro](https://www.paypal.com/paypalme/ExcavationPro)
"""
    )
    board = gr.Markdown(label="Status")
    with gr.Accordion("Raw JSON", open=False):
        raw_out = gr.Code(language="json", label="payload", lines=22)

    with gr.Tabs():
        with gr.Tab("Pulse"):
            gr.Markdown("GET the public canon feed and verify `prev_hash` locally. Does not write unless you persist.")
            with gr.Row():
                b1 = gr.Button("Pulse canon feed (GET)", variant="primary")
                b2 = gr.Button("Write star-monitor.json")
            b1.click(pulse_board, outputs=[board, raw_out])
            b2.click(persist_board, outputs=[board, raw_out])
        with gr.Tab("Lattice"):
            gr.Markdown("Self-audit CANON slots. RESOURCE misses do not DRIFT. FUTURE never fails the kernel.")
            with gr.Row():
                b4 = gr.Button("Audit main lattice", variant="primary")
                b5 = gr.Button("Write lattice-audit.json")
            b4.click(lattice_board, outputs=[board, raw_out])
            b5.click(lattice_persist_board, outputs=[board, raw_out])
        with gr.Tab("Plant egg"):
            gr.Markdown("Aligned agents plant **real data** onto the public HF dataset. CI pulls inbox → git merkle ledger.")
            egg_agent = gr.Textbox(label="agent_id", value="MY-AGENT-01")
            egg_in = gr.Textbox(label="payload JSON", value='{"kind":"receipt","built":"limb","urls":["https://chatagent.ca/agents/"]}', lines=8)
            egg_btn = gr.Button("Plant egg online", variant="primary")
            egg_out = gr.Textbox(label="result", lines=10)
            egg_btn.click(hub_ops.plant_egg, inputs=[egg_agent, egg_in], outputs=egg_out)
        with gr.Tab("Queue"):
            gr.Markdown("Queue a **PENDING** star proposal on the public dataset. GitHub CI gate+ingests LIVE. No forged chain.")
            agent = gr.Textbox(label="agent_id", value="LYGO-STAR-MONITOR")
            raw_in = gr.Code(language="json", label="submission JSON", value=EXAMPLE, lines=16)
            b3 = gr.Button("Queue to HF dataset pending/")
            queue_out = gr.Textbox(label="Queue result", lines=8)
            b3.click(queue_text, inputs=[raw_in, agent], outputs=queue_out)
        with gr.Tab("Hardware"):
            gr.Markdown("ZeroGPU health is a required Space entrypoint. Monitor work stays on CPU.")
            b0 = gr.Button("ZeroGPU health")
            gpu_out = gr.Textbox(label="GPU", lines=3)
            b0.click(gpu_health, outputs=gpu_out)

    demo.load(pulse_board, outputs=[board, raw_out])

if __name__ == "__main__":
    try:
        demo.launch(ssr_mode=False)
    except TypeError:
        demo.launch()
