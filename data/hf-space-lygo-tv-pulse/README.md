---
title: LYGO TV Pulse
emoji: 📺
colorFrom: yellow
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: Anonymous live-visitor pulse for chatagent.ca/sources
---

# LYGO TV Pulse

Anonymous presence for [https://chatagent.ca/sources/](https://chatagent.ca/sources/).

- `GET /stats` → `{ live, pulses_today, updated_utc }`
- `POST /pulse` JSON `{ "sid": "<uuid>", "page": "sources" }`
- Random session id only. No names, no accounts. Access logs off.
- A sid that does not heartbeat for 75 seconds drops off **live**.
- This is occupancy on the portal page, not a fake ticker.

Primary site: chatagent.ca/sources

**Note (2026-09-06):** new Gradio/Docker Spaces on free CPU now require Hugging Face PRO. This FastAPI image is kept for a future PRO Space. The live player uses an anonymous MQTT occupancy pulse until then — still a real browser count, never a fake ticker.
