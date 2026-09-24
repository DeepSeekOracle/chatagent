# LYGO portal supporter codes — how to rotate them, and what they do

The portal's only interruption is a donation reminder that appears every 15 minutes. A **supporter code**
switches those reminders off in the browser where it is entered. Codes rotate monthly, so one shared code
cannot serve everyone forever.

Nothing else on the portal is gated. Every provider, every model, the compare bench, the image suite and the
browser tools work exactly the same with or without a code.

## What the code is, honestly

- It is checked **inside the visitor's browser**, against a **SHA-256 hash** stored in `portal/supporter.js`.
  The plaintext code is never shipped to the web. That means the page can only ever prove *"this browser was
  given this month's code"* — it cannot be a licence or DRM. Anyone determined can bypass a client-side check;
  rotation and the low stakes (a pop-up) are what make this reasonable.
- An unlocked browser stores **only** `{label, until, at}` in `localStorage["lygo_portal_supporter"]` — never
  the code itself.
- A code is valid **through `until`** (inclusive). The default `until` is the **5th of the following month**,
  a grace window so a supporter who paid in September is not locked out at midnight on rotation day. After
  that date the reminders come back and the panel says the code has lapsed.
- The steward code (`permanent: true`) never expires. Keep its plaintext private.

## The pieces

| Thing | Where |
|---|---|
| The codes' hashes, the intro, the supporter panel | `portal/supporter.js` — the array between `/* @supporter-hashes:start */` and `/* @supporter-hashes:end */` |
| The rotation tool | `portal/supporter/rotate.py` |
| The plaintext codes it prints | `~/.lygo-supporter-codes/supporter-code-<label>.txt` (outside the repo, on purpose) |
| The reminder that gets switched off | `portal/donate.js` — asks `window.LYGO_SUPPORTER.unlocked()` before it ever schedules |
| Entry points for the code | `⚿ Supporter` in the top nav, `⚿ Supporter code` under the composer, the door on the donor card, and the intro |

## Rotating (once a month, about a minute)

From the repo root, on the machine that has the repo:

```bash
python portal/supporter/rotate.py --list                      # what is in the file now
python portal/supporter/rotate.py --add --month 2026-10       # generate October's code
python portal/supporter/rotate.py --check LYGO-2610-XXXX-XXXX # prove it, before you post it
node --check portal/supporter.js                              # the file still parses
```

`--add` prints the new code, writes the plaintext to `~/.lygo-supporter-codes/`, and adds its hash. Then:

1. Paste the code into this month's Patreon post (template below).
2. Commit and push `portal/supporter.js` so the live portal accepts the new code.
3. Post the Patreon announcement — the old code keeps working through its grace date, so nobody is cut off.

Useful variants:

```bash
python portal/supporter/rotate.py --add --month 2026-10 --until 2026-11-10   # a longer grace window
python portal/supporter/rotate.py --steward                                  # rotate the steward's permanent code
python portal/supporter/rotate.py --check "lygo 2609 xv2e vzg8"              # spellings/case do not matter
```

**If a code leaks widely:** re-run `--add` for the same month — the tool replaces the entry with that label —
and set `--until` to today so the leaked code dies immediately, then post the new code. Supporters lose nothing:
they get the new code from the same Patreon post.

Editing the hash array by hand is possible but pointless: you would have to compute the SHA-256 yourself. Let
the tool write it.

## The Patreon post template

```text
⚿ LYGO API Portal — supporter code for <MONTH>

The portal is free and always will be. The only interruption is a donation reminder that shows up
every 15 minutes. Supporters get this month's code, and those reminders stay off in whatever
browser you paste it into.

This month's code:   LYGO-XXXX-XXXX-XXXX
Good through:        <YYYY-MM-DD>        (then this post gets the new month's code)

How to use it
  1. Open https://chatagent.ca/portal/
  2. Press "⚿ Supporter" in the top nav (or "⚿ Supporter code" under the chat box)
  3. Paste the code, press Unlock this browser. The panel tells you the date it is good through.

What it does and does not do
  · It turns off the donation reminders in that one browser. On a new browser or a cleared cache,
    paste the code again.
  · Nothing else is locked — no model, no tool, no feature is withheld. There is nothing to "unlock"
    except peace and quiet.
  · The code is checked inside your own browser. Your API keys and your chats never leave it, and the
    portal never sees the code you typed.
  · Codes rotate monthly. If yours has lapsed, this post always holds the current one.

Thank you — you keep the lattice lit. Δ9Φ963
```

## For the next agent (copy-paste prompt)

> Rotate the LYGO portal supporter code for `<YYYY-MM>`. Run
> `python portal/supporter/rotate.py --add --month <YYYY-MM>` from the repo root, run
> `python portal/supporter/rotate.py --check <the code it printed>`, then `node --check portal/supporter.js`.
> Show me the code and the date it is good through, and tell me whether the previous month's entry is still
> inside its grace window. Do not commit the plaintext code anywhere in the repo — it belongs in
> `~/.lygo-supporter-codes/` and on Patreon. Then push `portal/supporter.js`.

## Checking the live portal accepts it (60 seconds)

1. `https://chatagent.ca/portal/` in a **fresh private window** — the intro should cover the page.
2. Enter the portal. Press `⚿ Supporter`, paste a wrong code → it must say the code is not one of this
   portal's codes (no vague failure).
3. Paste the real code → "Unlocked … through `<date>`", the `⚿ SUPPORTER` chip appears next to the header stamp.
4. Wait: the donation reminder must not appear (it fires every 15 minutes; in a test you can watch the
   network tab stay quiet, or temporarily open the console and check `LYGO_SUPPORTER.unlocked()` is `true`).
5. Press `⚿ Supporter` → **Lock this browser again** → the reminders are back. Reload: the intro does not
   return, and the unlock you had is gone.
6. QA switch: `https://chatagent.ca/portal/?intro=0` opens the portal with no intro (it does not mark the
   intro as seen) — useful when you are checking something else.

## Troubleshooting

- **"This browser will not hash anything outside a secure page"** — the panel needs `https` (or `localhost`).
  That is WebCrypto's rule, not a bug; the live portal is https.
- **A supporter says the code does not work** — first `--check` it. `no match` means the code never shipped
  (the file was not pushed, or the push has not deployed yet); `EXPIRED` means the grace date passed.
- **The reminders still appear after unlocking** — check the `⚿ SUPPORTER` chip. If the chip is missing but the
  panel says active, the browser has `localStorage` disabled (private mode with storage blocked), and nothing
  this page can do will stick.
