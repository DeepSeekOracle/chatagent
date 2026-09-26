# The supporter code — how it works, and how to rotate it

One code switches the donation reminder off in the browser where it is entered. Nothing else is gated:
every provider, model, game mode and page works exactly the same with or without it.

The code itself is **never stored anywhere public**. What ships is its SHA-256, checked in the browser.

## Where the table lives (two copies, on purpose)

| File | Who reads it |
|---|---|
| `portal/supporter.js` | the web portal |
| `games/lygo-gate.js` | every arcade game — it keeps its own copy so a game still works offline, with no fetch |

The games' copy is the one that matters most in practice, and it ages on its own. **A rotation that
patches only the portal leaves every game still accepting the code you just retired** — so always pass
`--mirror`.

## Rotating (about a minute)

From the repo root, on the machine that has the repo and the USB:

```bash
python portal/supporter/rotate.py --list                 # what is accepted now
python portal/supporter/rotate.py --selftest              # normalization + expiry sanity
python portal/supporter/rotate.py --add --month 2026-10 --mirror games/lygo-gate.js
python portal/supporter/rotate.py --check LYGO-2610-XXXX-XXXX   # prove it before you post it
node --check portal/supporter.js && node --check games/lygo-gate.js
git add portal/supporter.js games/lygo-gate.js && git commit -m "rotate the supporter code" && git push
```

`--add` prints the new code, writes the plaintext to `~/.lygo-supporter-codes/` (outside the repo) and
adds its hash to both tables. Then paste the code into that month's Patreon post.

### The pre-loaded shelf

The shelf is generated in one go — one code per month, all valid today, so the monthly step is only
"paste this month's code from the vault onto Patreon". No push, no rebuild, no tool run.

```bash
python portal/supporter/rotate.py --series 31 --from-month 2026-09 --vault-dir "E:/Data Vault" --mirror games/lygo-gate.js
```

That writes the shelf to the USB **and** both hash tables. The shelf:

| File | What it is |
|---|---|
| `E:\Data Vault\LYGO_PORTAL_SUPPORTER_CODES.txt` | every month's code, the date it is good through, and the instructions |
| `E:\Data Vault\lygo-portal-supporter-codes.json` | the same list machine-readable (`month`, `code`, `until`, `sha256`) |
| `~/.lygo-supporter-codes/supporter-code-series-*.txt` | the working copy the tool writes on this PC |
| `~/.lygo-supporter-codes/supporter-code-steward.txt` | the steward's permanent code — never post this one |

### Why the shelf is regenerated rather than kept

Because all months are accepted at once, a leaked shelf is a leaked future: whoever holds a *future*
month's code can use it early. A shelf that has ever been public — in the repo, on a published page, in
a git history — is burned as a secret, and deleting the file does not un-publish it. Regenerate the
series (`--series`, which replaces each month's hash) and the leaked codes die everywhere at once:

```bash
python portal/supporter/rotate.py --series 31 --from-month 2026-09 --vault-dir "E:/Data Vault" --mirror games/lygo-gate.js
```

Verify with `--check` on any old code: it must report `no match`.

## The grace window

`--until` defaults to the 5th of the following month, so a supporter who paid in September is not locked
out at midnight on rotation day. Rotating this month's code mid-month is a real (if small) break: the
code on the Patreon post stops working until the post is updated, so do both in the same sitting.

## Never in the repo

Plaintext shelves are ignored by `.gitignore` (`portal/SUPPORTER_CODES.md`). The plaintext belongs on the
USB and in `~/.lygo-supporter-codes/`, nowhere else. If you ever find a code file tracked or served,
treat the whole shelf as burned and regenerate.
