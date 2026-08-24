---
title: Lattice Marines Ledger
emoji: 🏝️
colorFrom: blue
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: Eternal vs-AI win ledger for Lattice Marines
---

# Lattice Marines Eternal Ledger

Public JSON API. **AI wins only.** Commander name + match metadata are appended to the dataset [`DeepSeekOracle/lattice-marines-wins`](https://huggingface.co/datasets/DeepSeekOracle/lattice-marines-wins).

- Hall of records: [chatagent.ca/games/lattice-marines/ledger.html](https://chatagent.ca/games/lattice-marines/ledger.html)
- Play: [chatagent.ca/games/lattice-marines/](https://chatagent.ca/games/lattice-marines/)
- `GET /ledger.json` · `POST /submit`

Hot-seat and losses are rejected. No secrets in the game client — the Space secret writes the dataset.
