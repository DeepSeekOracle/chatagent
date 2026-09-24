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
| The module where the code is entered | `#supporter-suite` in `portal/index.html`, under the image suite — a console module, not an overlay. `⚿ Supporter` in the top nav, `⚿ Supporter code` under the composer, the door on the reminder card and the entrance all scroll to it |
| The post that carries the code | <https://www.patreon.com/Excavationpro/posts/chatagent-ca-api-170485961> — linked from the entrance, the reminder card and the module's "Get this month's code" button |

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

### The pre-loaded shelf (30 months, to March 2029)

The portal currently ships **33 accepted codes**: the steward's permanent one, this month's, the rotated-out
example, and **30 monthly codes from 2026-10 through 2029-03** — all generated at once and all valid today.
Every one of them was verified through the live page code, so from here the monthly step is only:

> On the 1st, paste that month's code from the vault into the Patreon post. No push, no rebuild, no tool run.

The plaintext shelf lives **outside the repo**, on the USB stick:

| File | What it is |
|---|---|
| `E:\Data Vault\LYGO_PORTAL_SUPPORTER_CODES.txt` | the rotation shelf: every month's code, the date it is good through, and the instructions |
| `E:\Data Vault\lygo-portal-supporter-codes.json` | the same list machine-readable (`month`, `code`, `until`, `sha256`) |
| `~/.lygo-supporter-codes/supporter-code-series-*.txt` | the working copy the tool writes on this PC |
| `~/.lygo-supporter-codes/supporter-code-steward.txt` | the steward's permanent code — never post this |

Regenerate the shelf (idempotent per month: re-running replaces that month's code and hash):

```bash
python portal/supporter/rotate.py --series 30 --from-month 2026-10 --vault-dir "E:/Data Vault"
```

**One trade-off to know:** because all 30 months work now, whoever holds a *future* month's code can use it
early and stays unlocked through that month's date (a 2029-03 code reads "through 2029-04-05"). The shelf is
therefore a steward's file: publish one month at a time, and if a future code leaks, regenerate that month
(`--add --month YYYY-MM --until <today>` kills the leaked one) and push.

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
2. Enter the portal. Press `⚿ Supporter` (it scrolls to the **Supporter access** module under the image
   suite) and paste a wrong code → it must say the code is not one of this portal's codes (no vague failure).
3. Paste the real code → "Unlocked … through `<date>`", the `⚿ SUPPORTER` chip appears next to the header stamp.
4. Wait: the donation reminder must not appear (it fires every 15 minutes; in a test you can watch the
   network tab stay quiet, or temporarily open the console and check `LYGO_SUPPORTER.unlocked()` is `true`).
5. Press **Lock this browser again** in the module → the reminders are back. Reload: the intro does not
   return, and the unlock you had is gone.
6. QA switch: `https://chatagent.ca/portal/?intro=0` opens the portal with no intro (it does not mark the
   intro as seen) — useful when you are checking something else.

## Troubleshooting

- **"This browser will not hash anything outside a secure page"** — the panel needs `https` (or `localhost`).
  That is WebCrypto's rule, not a bug; the live portal is https.
- **A supporter says the code does not work** — first `--check` it. `no match` means the code never shipped
  (the file was not pushed, or the push has not deployed yet); `EXPIRED` means the grace date passed. Then ask
  whether they pasted it into the module on the console (the field under the image suite) rather than the search bar.
- **The reminders still appear after unlocking** — check the `⚿ SUPPORTER` chip. If the chip is missing but the
  module says active, the browser has `localStorage` disabled (private mode with storage blocked), and nothing
  this page can do will stick.
