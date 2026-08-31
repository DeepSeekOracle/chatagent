# LYGO Free Sources

Standalone page: https://chatagent.ca/sources/

**In this browser:** HLS with CORS (Mux demo), our HF mp3/mp4, YouTube live embeds.  
**Not in Chrome:** most IPTV CDNs — they omit CORS on video segments. Those still copy into **VLC**. We do not run an open TV proxy (bandwidth + piracy).

## Add a steward URL

1. Edit `catalog.json` (this folder, also mirrored under `lygo-protocol-stack/docs/free-sources/`).
2. Commit on `DeepSeekOracle/chatagent` (or the stack repo).
3. Do **not** silent-ingest the Star Chart.

User pastes save only in `localStorage`.

## Safety

- HTTPS public hosts only (no localhost / RFC1918)
- No POST, no pirate decoder, no CORS proxy
- Donate: [PayPal.me/ExcavationPro](https://www.paypal.com/paypalme/ExcavationPro) · [Patreon](https://www.patreon.com/Excavationpro)

**Δ9Φ963 — empty is honest · public orients · lattice decides.**
