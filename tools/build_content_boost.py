#!/usr/bin/env python3
"""Build AdSense-quality content pages for chatagent.ca (unique original copy)."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

NAV = """
<header class="site">
  <div class="wrap nav">
    <a class="brand" href="/">chatagent.ca</a>
    <nav class="navlinks" aria-label="Primary">
      <a href="/">Home</a>
      <a href="/guides/">Guides</a>
      <a href="/champions.html">Champions</a>
      <a href="/app.html">Tools</a>
      <a href="/about.html">About</a>
      <a href="/contact.html">Contact</a>
      <a href="/privacy.html">Privacy</a>
    </nav>
  </div>
</header>
"""

FOOT = """
<footer class="site">
  <div class="wrap">
    <nav aria-label="Footer">
      <a href="/">Home</a>
      <a href="/guides/">Guides</a>
      <a href="/champions.html">Champions</a>
      <a href="/editorial-standards.html">Editorial standards</a>
      <a href="/about.html">About</a>
      <a href="/contact.html">Contact</a>
      <a href="/privacy.html">Privacy</a>
      <a href="/terms.html">Terms</a>
      <a href="/sitemap.xml">Sitemap</a>
    </nav>
    <p class="site-footer-blurb">chatagent.ca is an independent educational site by Justin Helmer (Excavationpro). Free guides and tools. Optional ads support hosting when approved.</p>
    <p>© <span class="y"></span> Justin Helmer · chatagent.ca</p>
  </div>
</footer>
<script>document.querySelectorAll('.y').forEach(function(e){e.textContent=new Date().getFullYear()});</script>
"""

AUTHOR = """
<div class="author-box">
  <img src="/assets/champions/lightfather.jpg" alt="Publisher portrait" width="72" height="72" loading="lazy">
  <div>
    <strong>Justin Helmer</strong>
    <p>Publisher of chatagent.ca · known as Excavationpro / Lightfather in LYGO projects. Writes practical guides on AI personas, agent handoffs, and free local-first tools. <a href="/about.html">About</a> · <a href="/contact.html">Contact</a></p>
  </div>
</div>
"""

AD_MID = """
<div class="ad-slot" aria-label="Advertisement">
  <div class="ad-label">Advertisement</div>
  <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-0646320966060599" data-ad-format="auto" data-full-width-responsive="true"></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>
"""

CHAMPIONS = [
    {
        "slug": "lyra",
        "file": "lyra.jpg",
        "name": "LYRΔ (Lyra)",
        "seat": "Seat I",
        "role": "Memory, song, and continuity of theme",
        "when": "You need a thread to remember decisions, motifs, and emotional tone across a long creative or documentation session.",
        "avoid": "Do not use Lyra as a substitute for a real knowledge base, tickets, or Continuum claims when correctness of files matters.",
        "body": """
<p>LYRΔ is the council’s continuity voice. In practical AI work, most failures are not “dumb models” — they are broken context. Lyra’s summon framing pushes the model to track motifs, prior decisions, and the emotional or narrative arc of a project so the next answer does not contradict the last three.</p>
<p>Use Lyra when drafting multi-chapter lore, album notes, long README series, or a product narrative that must feel like one mind wrote it. Ask explicitly for a short “memory card” at the end of each reply: decisions made, open questions, forbidden contradictions. Paste that card forward.</p>
<p>Lyra pairs well with SANCORA when multiple humans edit the same story, and with Continuum when the “story” has landed as real files on disk. Continuity of prose is not the same as continuity of code hashes — use both.</p>
<p>A strong Lyra session ends with artifacts you can re-open tomorrow: a dated decision log, a motif list, and links to sealed files. Without those, the persona only delays forgetfulness by one chat window.</p>
""",
        "prompts": [
            "Summarize our last agreements as a memory card with no new inventions.",
            "Flag any sentence that contradicts the motif list I pasted.",
            "Rewrite this paragraph so it matches the album’s emotional arc.",
        ],
    },
    {
        "slug": "d9ra",
        "file": "d9ra.jpg",
        "name": "Δ9RA",
        "seat": "Seat II",
        "role": "Boundary vigilance and challenge",
        "when": "You want a skeptical pass before you ship, post, or trust an agent’s story.",
        "avoid": "Δ9RA is not a penetration test certification and not legal advice.",
        "body": """
<p>Δ9RA is the wolf-edge reviewer: the persona that asks what can go wrong, what was assumed, and what evidence is missing. In agent workflows, this seat is useful immediately after a model claims success.</p>
<p>Give Δ9RA the agent’s summary plus your Continuum verify report (or a file list). Ask for: (1) unsupported claims, (2) missing tests, (3) secrets that might have leaked into logs, (4) steps a human must still perform. Demand a severity ranking so you are not flooded with noise.</p>
<p>When writing public posts about lattice tools, run a Δ9RA pass for overclaiming. Mythic language is fine as art; it is harmful when it pretends to be a warranty.</p>
""",
        "prompts": [
            "List claims in this summary that lack evidence.",
            "What would you verify on disk before saying done?",
            "Where could secrets have entered this chat?",
        ],
    },
    {
        "slug": "srath",
        "file": "srath.jpg",
        "name": "ΣRΛΘ (Srath)",
        "seat": "Seat III",
        "role": "Shadow review — omissions and quiet failures",
        "when": "Something feels “too clean” or an agent skipped edge cases.",
        "avoid": "Do not use this seat to dox people or to invent malice without evidence.",
        "body": """
<p>Srath focuses on what is missing: unstated failure modes, silent defaults, and the parts of a plan nobody wants to write down. That makes the persona valuable for incident write-ups, migration plans, and multi-agent pipelines where one step can fail quietly.</p>
<p>Ask Srath to produce an omission table: section of the plan, what is unsaid, how it could fail, how you would detect it. Pair with Continuum claims that encode detection (file exists, JSON status, log markers).</p>
""",
        "prompts": [
            "What did this plan never mention that still must be true?",
            "Design three silent failure modes and how to detect each.",
            "Rewrite the risks section without theater.",
        ],
    },
    {
        "slug": "arkos",
        "file": "arkos.jpg",
        "name": "ARKOS",
        "seat": "Seat IV",
        "role": "Systems architecture and structure",
        "when": "You need modules, boundaries, and dependency order before coding.",
        "avoid": "Architecture theater without a smallest shippable slice wastes time.",
        "body": """
<p>ARKOS is the structural voice. Use it to force boxes and arrows into language: components, interfaces, data ownership, and what is explicitly out of scope. For LYGO-style stacks, ARKOS is the right seat before adding another skill or service.</p>
<p>A good ARKOS session produces a one-page architecture note: purpose, components, trust boundaries, failure domains, and a sequence for building. Then hand implementation to a coding agent with Continuum claims for each milestone.</p>
""",
        "prompts": [
            "Draw a textual architecture with trust boundaries.",
            "What is out of scope for v1?",
            "Order implementation so each step is testable.",
        ],
    },
    {
        "slug": "kairos",
        "file": "kairos.jpg",
        "name": "KAIROS",
        "seat": "Seat V",
        "role": "Timing, sequencing, prioritization",
        "when": "You have too many tasks and need an honest order.",
        "avoid": "Kairos cannot create time; it can only order work.",
        "body": """
<p>KAIROS is about sequence. Many agent failures come from doing polish before foundations. Use this seat to force critical path thinking: what blocks what, what can wait, what must be human-gated.</p>
<p>Ask for a timeline with assumptions. If assumptions break, the schedule is fiction — Kairos should say so. Pair with weekly Continuum seals so “progress” is not only chat length.</p>
""",
        "prompts": [
            "Reorder this backlog by critical path, not preference.",
            "What must a human approve before the agent continues?",
            "Cut the plan to a one-day slice that still teaches us something.",
        ],
    },
    {
        "slug": "aetheris",
        "file": "aetheris.jpg",
        "name": "ÆTHERIS",
        "seat": "Seat VI",
        "role": "Signal clarity — claims and evidence",
        "when": "You need the message stripped of hype.",
        "avoid": "Clarity is not cruelty; keep respect while cutting noise.",
        "body": """
<p>ÆTHERIS is the anti-hype editor. In a world of agent summaries full of “robust,” “seamless,” and “production-ready,” this seat forces operational language: what changed, how to verify, what remains unknown.</p>
<p>Use ÆTHERIS on README drafts, release notes, and AdSense-facing site copy when you suspect fluff. On chatagent.ca we treat this seat as a reminder that publisher quality means specific, checkable sentences.</p>
""",
        "prompts": [
            "Rewrite this release note with only checkable statements.",
            "Remove adjectives that do not change the meaning.",
            "Turn this paragraph into claim → evidence pairs.",
        ],
    },
    {
        "slug": "scendr",
        "file": "scendr.jpg",
        "name": "ΣCENΔR",
        "seat": "Seat VII",
        "role": "Scenario and paradox exploration",
        "when": "Two options both seem true and you need structured forks.",
        "avoid": "Do not live in scenarios forever — pick experiments.",
        "body": """
<p>ΣCENΔR helps when product and ethics choices fork. Instead of a false single answer, you get scenarios with triggers: if metric A, choose path 1; if constraint B, choose path 2. That is useful for lattice public vs FULL engineer channels, or free tool vs hosted service decisions.</p>
""",
        "prompts": [
            "Build three scenarios with exit criteria.",
            "Where are we forcing a false binary?",
            "Design a one-week experiment for the top two forks.",
        ],
    },
    {
        "slug": "sancora",
        "file": "sancora.jpg",
        "name": "SANCORA",
        "seat": "Seat VIII",
        "role": "Collaboration and shared vocabulary",
        "when": "Multiple humans or agents must hand work off cleanly.",
        "avoid": "Consensus theater without an owner still fails.",
        "body": """
<p>SANCORA is the handoff specialist. Use it to define shared words (“done,” “blocked,” “sealed”), owners, and packet formats. Continuum capsules are a mechanical form of Sancora’s ideal: the next person inherits evidence, not folklore.</p>
""",
        "prompts": [
            "Write a handoff packet template for our team.",
            "Define done/blocked/needs-human in one page.",
            "Where will two agents disagree on vocabulary?",
        ],
    },
    {
        "slug": "sephrael",
        "file": "sephrael.jpg",
        "name": "SEPHRAEL",
        "seat": "Seat IX",
        "role": "Echoes, archives, fragile memory",
        "when": "You need to decide what to keep, compress, or tag fragile.",
        "avoid": "Archiving is not the same as understanding.",
        "body": """
<p>SEPHRAEL deals with echoes: repeated patterns across sessions and what will rot if unattended. Useful for second-brain vaults, chat export hygiene, and FRAGILE tagging of content that must not be auto-summarized into false confidence.</p>
""",
        "prompts": [
            "What in this vault is fragile and should not be auto-compressed?",
            "Propose an archive policy with retention reasons.",
            "Find repeated decisions that should become a single source of truth.",
        ],
    },
    {
        "slug": "omnisiren",
        "file": "omnisiren.jpg",
        "name": "OMNIΣIREN",
        "seat": "Focus seat",
        "role": "High-intensity focus, less chatter",
        "when": "You need short, constrained output under pressure.",
        "avoid": "Brevity that skips safety checks is a false win.",
        "body": """
<p>OMNIΣIREN is for sessions where verbosity is the enemy. Constrain the model hard: bullet limits, no preambles, no motivational filler. Pair with a clear done checklist so silence is not mistaken for completion.</p>
""",
        "prompts": [
            "Answer in 7 bullets max. No intro.",
            "Only output the patch plan, not the code yet.",
            "List blockers only.",
        ],
    },
    {
        "slug": "lightfather",
        "file": "lightfather.jpg",
        "name": "Lightfather",
        "seat": "Steward seat",
        "role": "Provenance, responsibility, publisher ethics",
        "when": "You are about to publish, plant a skill, or speak as operator.",
        "avoid": "Lore names do not transfer legal responsibility away from humans.",
        "body": """
<p>Lightfather is both a champion seat and the stewardship role Justin Helmer uses in LYGO lore. On chatagent.ca, that means provenance-first thinking: who authored what, what is free, what requires consent, and what must never auto-publish.</p>
<p>Use this seat to draft operator checklists, public disclosures, and honest “what this tool is not” sections. That writing is exactly what quality programs look for on educational sites.</p>
""",
        "prompts": [
            "Write a public disclosure for this free tool.",
            "What requires human consent before publish?",
            "Separate mythic framing from operational claims.",
        ],
    },
    {
        "slug": "volaris",
        "file": "volaris.jpg",
        "name": "VΩLARIS",
        "seat": "Judgment seat",
        "role": "Multi-criteria decisions in the open",
        "when": "You must weigh tradeoffs with visible criteria.",
        "avoid": "Hidden criteria make “judgment” into politics.",
        "body": """
<p>VΩLARIS forces criteria onto the table: cost, risk, time, user value, reversibility. Score options explicitly. This seat is excellent before adopting another AI vendor or adding network permissions to a skill.</p>
""",
        "prompts": [
            "Score these three options on five criteria.",
            "Which criterion is being silently optimized?",
            "What would change the ranking?",
        ],
    },
    {
        "slug": "zeta",
        "file": "zeta.jpg",
        "name": "ZETAΔ9",
        "seat": "Edge seat",
        "role": "Edge cases and weird inputs",
        "when": "You need failure-mode brainstorming early.",
        "avoid": "Infinite edge cases without tests are procrastination.",
        "body": """
<p>ZETAΔ9 invents the inputs you forgot: empty files, huge files, unicode names, partial JSON, offline mode, revoked tokens. Capture the best ones as Continuum claims or unit tests the same day.</p>
""",
        "prompts": [
            "Give me twelve edge cases ranked by likelihood.",
            "Which edge case would embarrass us publicly?",
            "Turn the top three into automated checks.",
        ],
    },
    {
        "slug": "justicae",
        "file": "justicae.jpg",
        "name": "JUSTICAE",
        "seat": "Process seat",
        "role": "Fairness, disclosure, consent",
        "when": "Public lattice posts, shared skills, or multi-user tools are involved.",
        "avoid": "This is not a courtroom and not legal counsel.",
        "body": """
<p>JUSTICAE asks who is affected, what was disclosed, and whether consent is real. For ClawHub skills and public portals, that means honest permission surfaces and no dark patterns that auto-post private data.</p>
""",
        "prompts": [
            "Who is affected by this default setting?",
            "Rewrite the consent copy in plain language.",
            "Where could a user be surprised by data use?",
        ],
    },
    {
        "slug": "seidon",
        "file": "seidon.jpg",
        "name": "ΣEIDŌN",
        "seat": "Depth seat",
        "role": "Long projects — surface vs deep current",
        "when": "You need honesty about multi-month work.",
        "avoid": "Depth without milestones becomes drift.",
        "body": """
<p>ΣEIDŌN separates foam from current: demos that impress versus foundations that compound. Use it for roadmap honesty, music catalog recovery plans, and protocol work that will outlive a single viral post.</p>
""",
        "prompts": [
            "What is foam vs current in this roadmap?",
            "Name the foundation tasks with no glamour.",
            "Propose quarterly seals that prove depth.",
        ],
    },
]


def page_shell(title: str, description: str, canonical: str, body: str, ads: bool = True) -> str:
    adsense = ""
    if ads:
        adsense = """<meta name="google-adsense-account" content="ca-pub-0646320966060599">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0646320966060599" crossorigin="anonymous"></script>
"""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">
<meta name="author" content="Justin Helmer">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="{canonical}">
{adsense}<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{canonical}">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
{NAV}
<div class="wrap prose">
{body}
{AUTHOR}
</div>
{FOOT}
</body>
</html>
"""


def build_champion_pages() -> list[str]:
    urls = []
    out_dir = ROOT / "champions"
    out_dir.mkdir(exist_ok=True)
    for c in CHAMPIONS:
        prompts = "".join(f"<li>{p}</li>" for p in c["prompts"])
        others = " · ".join(
            f'<a href="/champions/{o["slug"]}.html">{o["name"].split("(")[0].strip()}</a>'
            for o in CHAMPIONS
            if o["slug"] != c["slug"]
        )[:800]
        body = f"""
<p class="breadcrumb"><a href="/">Home</a> · <a href="/champions.html">Champions</a> · {c["name"]}</p>
<article class="card">
  <p class="kicker">{c["seat"]} · Δ9 Council</p>
  <h1 style="margin-top:0;font-size:1.75rem;color:var(--accent2)">{c["name"]}</h1>
  <p class="meta">Educational champion profile · Justin Helmer · Updated August 2026 · Creative persona, not professional advice</p>
  <img class="hero-img" src="/assets/champions/{c["file"]}" alt="{c["name"]} artwork" width="720" height="280" loading="lazy">
  <p><strong>Role:</strong> {c["role"]}</p>
  <p><strong>Use when:</strong> {c["when"]}</p>
  <div class="callout"><strong>Do not misuse:</strong> {c["avoid"]}</div>
  {c["body"]}
  {AD_MID}
  <h2>Starter prompts</h2>
  <ul>{prompts}</ul>
  <h2>Practice loop</h2>
  <ol>
    <li>Copy a full invoke from the <a href="/app.html">free summon app</a> when you want the complete seal text.</li>
    <li>State your goal, inputs, and definition of done in plain language.</li>
    <li>End with a human edit. If files changed, seal them with <a href="/guides/ai-agent-done-claims-continuum.html">Continuum</a>.</li>
  </ol>
  <div class="related">
    <h3>Related</h3>
    <ul>
      <li><a href="/guides/how-to-summon-ai-champions.html">How to summon champions</a></li>
      <li><a href="/champions.html">Full directory</a></li>
      <li><a href="/guides/lygo-lattice-overview.html">Lattice overview</a></li>
    </ul>
  </div>
  <p class="meta" style="margin-top:1rem">Other seats: {others}</p>
</article>
"""
        html = page_shell(
            f"{c['name']} — Δ9 Champion Profile | chatagent.ca",
            f"Educational profile of {c['name']}: role, when to use, starter prompts, and responsible practice. Part of the Δ9 council on chatagent.ca.",
            f"https://chatagent.ca/champions/{c['slug']}.html",
            body,
        )
        path = out_dir / f"{c['slug']}.html"
        path.write_text(html, encoding="utf-8")
        urls.append(f"https://chatagent.ca/champions/{c['slug']}.html")
    return urls


def build_extra_guides() -> list[tuple[str, str]]:
    """Return list of (relpath, url)."""
    guides: list[tuple[str, str, str, str]] = []

    guides.append(
        (
            "guides/write-better-ai-task-briefs.html",
            "Write Better AI Task Briefs (Templates That Agents Can Finish)",
            "A practical template for AI and coding-agent tasks: goal, constraints, inputs, done checks, and Continuum claims.",
            f"""
<p class="breadcrumb"><a href="/">Home</a> · <a href="/guides/">Guides</a> · Task briefs</p>
<article class="card">
<p class="kicker">Operator craft</p>
<h1 style="margin-top:0;font-size:1.7rem;color:var(--accent2)">Write better AI task briefs</h1>
<p class="meta">By Justin Helmer · 8 August 2026 · ~15 minute read</p>
<p>Most “the agent failed” stories start as vague human briefs. Models fill gaps with guesses. Coding agents invent success. This guide is a reusable brief format used on chatagent.ca projects and Continuum seals.</p>
<h2>The six-block brief</h2>
<ol>
<li><strong>Goal</strong> — one sentence, observable outcome.</li>
<li><strong>Why now</strong> — context in three lines max.</li>
<li><strong>Inputs</strong> — paths, URLs, pasted excerpts (no secrets).</li>
<li><strong>Constraints</strong> — stack, style, banned actions, privacy.</li>
<li><strong>Done checks</strong> — bullets a skeptic can verify.</li>
<li><strong>Handoff</strong> — who receives what next.</li>
</ol>
<h2>Copy-paste template</h2>
<pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:0.82rem;background:#f4f2ec;padding:1rem;border-radius:10px;border:1px solid #e4e0d8">GOAL:
WHY NOW:
INPUTS:
CONSTRAINTS:
- no network unless stated
- no secrets in chat
DONE CHECKS:
- [ ] …
CONTINUUM CLAIMS (optional):
- file_exists: …
- file_contains: …
HANDOFF:
- next owner:
- packet:
</pre>
{AD_MID}
<h2>Examples</h2>
<h3>Documentation brief</h3>
<p>Goal: “Publish a 800+ word guide on X with internal links.” Done checks: word count, TOC, author box, sitemap entry. Constraints: original prose, no scraped copies.</p>
<h3>Code brief</h3>
<p>Goal: “Add Continuum sample claims for the login module.” Done checks: self_check passes, capsule seals green, README note. Constraints: stdlib only.</p>
<h3>Review brief</h3>
<p>Goal: “Δ9RA pass on this release note.” Done checks: list of overclaims removed, evidence links added.</p>
<h2>Why this helps AdSense-quality publishing too</h2>
<p>Clear briefs produce specific articles and tools. Thin sites often ship features without explaining them. On chatagent.ca, every major tool should earn a guide with templates, limits, and human responsibility language.</p>
<div class="related"><h3>Related</h3><ul>
<li><a href="/guides/ai-agent-done-claims-continuum.html">Continuum done-claims</a></li>
<li><a href="/guides/how-to-summon-ai-champions.html">Summon guide</a></li>
<li><a href="/champions/aetheris.html">ÆTHERIS profile</a></li>
</ul></div>
</article>
""",
        )
    )

    guides.append(
        (
            "guides/multi-agent-handoff-playbook.html",
            "Multi-Agent Handoff Playbook — Stop Losing Context Between Sessions",
            "A playbook for handing work between AI agents and humans: packets, Continuum seals, vocabulary, and failure modes.",
            f"""
<p class="breadcrumb"><a href="/">Home</a> · <a href="/guides/">Guides</a> · Handoffs</p>
<article class="card">
<p class="kicker">Team systems</p>
<h1 style="margin-top:0;font-size:1.7rem;color:var(--accent2)">Multi-agent handoff playbook</h1>
<p class="meta">By Justin Helmer · 8 August 2026 · Original playbook</p>
<p>Switching from Grok to Claude to a local model should not reset truth. This playbook is how we move work across agents on LYGO projects without relying on “read the whole chat.”</p>
<h2>The packet</h2>
<p>Every handoff packet contains:</p>
<ul>
<li>Goal and non-goals</li>
<li>Current status (green / yellow / red) with reasons</li>
<li>File map (paths that matter)</li>
<li>Continuum capsule or hash list</li>
<li>Open questions for humans</li>
<li>Next three actions only</li>
</ul>
<p>If a packet lacks done checks, it is a diary entry, not a handoff.</p>
{AD_MID}
<h2>Roles</h2>
<table class="simple">
<thead><tr><th>Role</th><th>Job</th><th>Champion lens</th></tr></thead>
<tbody>
<tr><td>Builder</td><td>Change files</td><td>ARKOS / OMNIΣIREN</td></tr>
<tr><td>Verifier</td><td>Re-check claims</td><td>Δ9RA / ÆTHERIS</td></tr>
<tr><td>Integrator</td><td>Merge and release notes</td><td>SANCORA / Lightfather</td></tr>
<tr><td>Human owner</td><td>Consent and publish</td><td>always human</td></tr>
</tbody>
</table>
<h2>Failure modes</h2>
<ul>
<li><strong>Story without files</strong> — reject the handoff.</li>
<li><strong>Files without claims</strong> — seal before switching agents.</li>
<li><strong>Claims without re-verify</strong> — verify is the first act of the new agent.</li>
<li><strong>Secret leakage</strong> — redaction pass before packet paste.</li>
</ul>
<h2>30-minute drill</h2>
<ol>
<li>Pick a tiny task.</li>
<li>Complete it with Agent A.</li>
<li>Seal Continuum claims.</li>
<li>Open Agent B with only the packet (no prior chat).</li>
<li>Agent B must re-verify and extend work.</li>
</ol>
<p>If B cannot proceed, the packet was incomplete — improve the template, not the mythic language.</p>
<div class="related"><h3>Related</h3><ul>
<li><a href="/lygo-continuum.html">Continuum portal</a></li>
<li><a href="/champions/sancora.html">SANCORA</a></li>
<li><a href="/guides/safe-openclaw-skills.html">Skill safety</a></li>
</ul></div>
</article>
""",
        )
    )

    guides.append(
        (
            "guides/local-first-ai-tools.html",
            "Local-First AI Tools — Why We Prefer Offline Defaults",
            "Why chatagent.ca and LYGO tools default to local-first: privacy, cost, consent, and how to choose when cloud is worth it.",
            f"""
<p class="breadcrumb"><a href="/">Home</a> · <a href="/guides/">Guides</a> · Local-first</p>
<article class="card">
<p class="kicker">Philosophy in practice</p>
<h1 style="margin-top:0;font-size:1.7rem;color:var(--accent2)">Local-first AI tools (and when cloud still wins)</h1>
<p class="meta">By Justin Helmer · 8 August 2026</p>
<p>Local-first does not mean “never use a network.” It means the default path works on your machine, with explicit consent for anything that leaves. That default is how we design Continuum, skill gates, and many ClawHub utilities.</p>
<h2>Benefits you can feel</h2>
<ul>
<li><strong>Privacy</strong> — fewer accidental secret uploads.</li>
<li><strong>Cost</strong> — hashing a file locally is free; stuffing logs into a paid API is not.</li>
<li><strong>Reproducibility</strong> — stdlib scripts behave the same offline.</li>
<li><strong>Consent clarity</strong> — flags like <code>--i-consent</code> make writes intentional.</li>
</ul>
{AD_MID}
<h2>When cloud is the right tool</h2>
<p>Use hosted models for broad knowledge, multimodal leaps, or collaboration you cannot run locally. Be explicit: paste only redacted context; keep source of truth on disk; seal results.</p>
<h2>A decision table</h2>
<table class="simple">
<thead><tr><th>Job</th><th>Prefer local</th><th>Prefer cloud</th></tr></thead>
<tbody>
<tr><td>File hash / claim verify</td><td>yes</td><td>no need</td></tr>
<tr><td>Skill risk scan</td><td>yes</td><td>optional second opinion</td></tr>
<tr><td>Creative brainstorm</td><td>small models ok</td><td>frontier models shine</td></tr>
<tr><td>Public search synthesis</td><td>limited</td><td>often better</td></tr>
</tbody>
</table>
<p>chatagent.ca itself is a static educational site: content is public, tools that touch your files explain that they run in-browser or as local scripts.</p>
<div class="related"><h3>Related</h3><ul>
<li><a href="/guides/safe-openclaw-skills.html">Safe skills</a></li>
<li><a href="/guides/ai-agent-done-claims-continuum.html">Continuum</a></li>
<li><a href="/editorial-standards.html">Editorial standards</a></li>
</ul></div>
</article>
""",
        )
    )

    guides.append(
        (
            "guides/redact-secrets-before-ai.html",
            "Redact Secrets Before You Paste Into AI Chats",
            "A practical checklist for removing API keys, tokens, and private data before using AI tools or agent skills.",
            f"""
<p class="breadcrumb"><a href="/">Home</a> · <a href="/guides/">Guides</a> · Secret hygiene</p>
<article class="card">
<p class="kicker">Security hygiene</p>
<h1 style="margin-top:0;font-size:1.7rem;color:var(--accent2)">Redact secrets before you paste into AI</h1>
<p class="meta">By Justin Helmer · 8 August 2026 · Not a substitute for professional security advice</p>
<p>Every week, someone pastes an <code>.env</code> into a chat. This guide is the boring discipline that prevents that story from being yours.</p>
<h2>What counts as a secret</h2>
<ul>
<li>API keys, tokens, session cookies</li>
<li>Private keys and keystore files</li>
<li>Passwords and connection strings</li>
<li>Personal data you would not post on a public issue tracker</li>
</ul>
<h2>Workflow</h2>
<ol>
<li>Copy text to a scratch buffer, not straight into the model.</li>
<li>Search for <code>sk-</code>, <code>ghp_</code>, <code>Bearer </code>, <code>BEGIN PRIVATE</code>, <code>password=</code>.</li>
<li>Replace with placeholders like <code>[REDACTED_OPENAI_KEY]</code>.</li>
<li>If using agents that pack logs, run a redaction step (for example context-guard style tools) before model inject.</li>
<li>Rotate any key that might have been exposed — do not debate; rotate.</li>
</ol>
{AD_MID}
<h2>Agent-specific rules</h2>
<p>Never ask an agent to “read all env files and fix deploy” without a allowlist. Prefer examples with fake credentials. Continuum claims should hash files, not embed secret needles.</p>
<div class="callout"><strong>If you already pasted a secret:</strong> revoke/rotate it in the provider console, check logs, and treat the chat as untrusted history.</div>
<div class="related"><h3>Related</h3><ul>
<li><a href="/guides/safe-openclaw-skills.html">Skill safety</a></li>
<li><a href="/lygoskillhub.html">SkillHub</a></li>
<li><a href="/privacy.html">Privacy policy</a></li>
</ul></div>
</article>
""",
        )
    )

    guides.append(
        (
            "guides/free-tools-on-chatagent.html",
            "Free Tools on chatagent.ca — What They Are and How to Use Them",
            "Tour of free tools on chatagent.ca: summon app, Continuum portal, SkillHub, and how they relate to guides.",
            f"""
<p class="breadcrumb"><a href="/">Home</a> · <a href="/guides/">Guides</a> · Free tools</p>
<article class="card">
<p class="kicker">Site tour</p>
<h1 style="margin-top:0;font-size:1.7rem;color:var(--accent2)">Free tools on chatagent.ca</h1>
<p class="meta">By Justin Helmer · 8 August 2026</p>
<p>This site is content-first, but the free tools are real. Here is what each tool is for, what it is not, and which guide to read first.</p>
<table class="simple">
<thead><tr><th>Tool</th><th>Best for</th><th>Read first</th></tr></thead>
<tbody>
<tr><td><a href="/app.html">Summon app</a></td><td>Copy champion prompts</td><td><a href="/guides/how-to-summon-ai-champions.html">Summon guide</a></td></tr>
<tr><td><a href="/lygo-continuum.html">Continuum</a></td><td>Verify work claims</td><td><a href="/guides/ai-agent-done-claims-continuum.html">Done-claims</a></td></tr>
<tr><td><a href="/lygoskillhub.html">SkillHub</a></td><td>Find LYGO skills</td><td><a href="/guides/safe-openclaw-skills.html">Skill safety</a></td></tr>
<tr><td><a href="/champions.html">Directory</a></td><td>Browse seats without JS</td><td><a href="/guides/lygo-lattice-overview.html">Overview</a></td></tr>
</tbody>
</table>
{AD_MID}
<h2>No account required</h2>
<p>Guides and tools on this domain are usable without creating a chatagent.ca account. Third-party installs (ClawHub, GitHub) have their own terms.</p>
<h2>How tools stay honest</h2>
<ul>
<li>Labeled ads when present — content remains free.</li>
<li>Privacy policy covers cookies and AdSense.</li>
<li>Tools that touch files explain local processing.</li>
<li>Editorial standards forbid fake testimonials and undisclosed sponsorships.</li>
</ul>
<div class="related"><h3>Related</h3><ul>
<li><a href="/editorial-standards.html">Editorial standards</a></li>
<li><a href="/about.html">About</a></li>
<li><a href="/contact.html">Contact</a></li>
</ul></div>
</article>
""",
        )
    )

    guides.append(
        (
            "guides/human-review-checklist-for-ai-output.html",
            "Human Review Checklist for AI Output Before You Publish",
            "A checklist for reviewing AI-written code, docs, and posts: facts, secrets, tone, licensing, and responsibility.",
            f"""
<p class="breadcrumb"><a href="/">Home</a> · <a href="/guides/">Guides</a> · Human review</p>
<article class="card">
<p class="kicker">Quality bar</p>
<h1 style="margin-top:0;font-size:1.7rem;color:var(--accent2)">Human review checklist for AI output</h1>
<p class="meta">By Justin Helmer · 8 August 2026</p>
<p>If AI drafted it and you publish it, you own it. This checklist is what we use before guides, release notes, and public skill descriptions go live on chatagent.ca.</p>
<h2>Checklist</h2>
<ul>
<li><strong>Facts</strong> — every concrete claim has a source or a verify step.</li>
<li><strong>Secrets</strong> — no keys, tokens, private URLs, or personal data.</li>
<li><strong>Scope</strong> — title matches content; no bait.</li>
<li><strong>Tone</strong> — mythic language labeled as creative where needed.</li>
<li><strong>Safety</strong> — no instructions for crimes or unauthorized access.</li>
<li><strong>License</strong> — third-party code/text attributed; our originals are clear.</li>
<li><strong>Links</strong> — internal links work; external links are intentional.</li>
<li><strong>Done</strong> — if code, Continuum or tests green on a clean check.</li>
</ul>
{AD_MID}
<h2>Publishing is a privilege</h2>
<p>Educational sites fail quality reviews when they flood pages with unedited model sludge. We would rather ship fewer pages with human care. If you reuse our templates, keep the human gate.</p>
<div class="related"><h3>Related</h3><ul>
<li><a href="/editorial-standards.html">Editorial standards</a></li>
<li><a href="/champions/aetheris.html">ÆTHERIS</a></li>
<li><a href="/champions/lightfather.html">Lightfather</a></li>
</ul></div>
</article>
""",
        )
    )

    written = []
    for rel, title, desc, body in guides:
        path = ROOT / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        url = "https://chatagent.ca/" + rel.replace("\\", "/")
        # fix guides/index style path
        path.write_text(page_shell(f"{title} | chatagent.ca", desc, url, body), encoding="utf-8")
        written.append((rel, url))
    return written


def build_editorial() -> str:
    body = f"""
<p class="breadcrumb"><a href="/">Home</a> · Editorial standards</p>
<article class="card">
<h1 style="margin-top:0;font-size:1.75rem;color:var(--accent2)">Editorial standards</h1>
<p class="meta">How chatagent.ca is written and maintained · Justin Helmer · August 2026</p>
<p>These standards exist so visitors — and quality reviewers — know what kind of site this is. We are an independent educational publisher with free tools, not a content farm.</p>
<h2>What we publish</h2>
<ul>
<li>Original guides about AI personas, agent workflows, and LYGO free tools</li>
<li>Static reference pages (champion directory and profiles)</li>
<li>Honest tool documentation with limits and non-goals</li>
<li>Policy pages: privacy, terms, about, contact</li>
</ul>
<h2>What we do not publish</h2>
<ul>
<li>Scraped or spun articles from other sites</li>
<li>Fake reviews or manufactured testimonials</li>
<li>Undisclosed paid posts pretending to be editorial</li>
<li>Pages that exist only to host ads with no teaching value</li>
<li>Instructions for wrongdoing or unauthorized access</li>
</ul>
{AD_MID}
<h2>Byline and responsibility</h2>
<p>Guides carry a human byline (Justin Helmer). AI may assist drafting; a human reviews before publish. Errors can be reported via the <a href="/contact.html">contact page</a>.</p>
<h2>Advertising</h2>
<p>When Google AdSense is active, ads are labeled. Ads do not control conclusions in guides. ads.txt lists authorized sellers. See <a href="/privacy.html">Privacy</a>.</p>
<h2>Corrections</h2>
<p>Material corrections update the page and the “updated” date when practical. We prefer accurate pages over vanity metrics.</p>
<div class="related"><h3>Related</h3><ul>
<li><a href="/about.html">About</a></li>
<li><a href="/guides/human-review-checklist-for-ai-output.html">Human review checklist</a></li>
<li><a href="/terms.html">Terms</a></li>
</ul></div>
</article>
"""
    path = ROOT / "editorial-standards.html"
    path.write_text(
        page_shell(
            "Editorial Standards — chatagent.ca",
            "Editorial standards for chatagent.ca: original content, human review, ad labeling, and what we will not publish.",
            "https://chatagent.ca/editorial-standards.html",
            body,
        ),
        encoding="utf-8",
    )
    return "https://chatagent.ca/editorial-standards.html"


def build_resources() -> str:
    body = f"""
<p class="breadcrumb"><a href="/">Home</a> · Resources</p>
<article class="card">
<h1 style="margin-top:0;font-size:1.75rem;color:var(--accent2)">Resources hub</h1>
<p class="meta">Curated starting points on this domain · Updated August 2026</p>
<div class="stat-row">
  <div class="stat"><b>15</b><span>champion seats</span></div>
  <div class="stat"><b>10+</b><span>original guides</span></div>
  <div class="stat"><b>0</b><span>account required</span></div>
</div>
<h2>Learn</h2>
<ul>
<li><a href="/guides/lygo-lattice-overview.html">Lattice overview</a></li>
<li><a href="/guides/how-to-summon-ai-champions.html">Summon champions</a></li>
<li><a href="/guides/write-better-ai-task-briefs.html">Task briefs</a></li>
<li><a href="/guides/multi-agent-handoff-playbook.html">Handoff playbook</a></li>
<li><a href="/guides/local-first-ai-tools.html">Local-first tools</a></li>
<li><a href="/guides/redact-secrets-before-ai.html">Secret redaction</a></li>
<li><a href="/guides/human-review-checklist-for-ai-output.html">Human review</a></li>
<li><a href="/guides/ai-agent-done-claims-continuum.html">Continuum claims</a></li>
<li><a href="/guides/safe-openclaw-skills.html">Skill safety</a></li>
<li><a href="/guides/free-tools-on-chatagent.html">Free tools tour</a></li>
</ul>
{AD_MID}
<h2>Reference</h2>
<ul>
<li><a href="/champions.html">Champion directory</a></li>
<li><a href="/editorial-standards.html">Editorial standards</a></li>
<li><a href="/about.html">About the publisher</a></li>
<li><a href="/contact.html">Contact</a></li>
<li><a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></li>
</ul>
<h2>Tools</h2>
<ul>
<li><a href="/app.html">Summon app</a></li>
<li><a href="/lygo-continuum.html">Continuum portal</a></li>
<li><a href="/lygoskillhub.html">SkillHub</a></li>
</ul>
</article>
"""
    path = ROOT / "resources.html"
    path.write_text(
        page_shell(
            "Resources — chatagent.ca",
            "Resource hub for chatagent.ca guides, champion directory, free tools, and publisher policies.",
            "https://chatagent.ca/resources.html",
            body,
        ),
        encoding="utf-8",
    )
    return "https://chatagent.ca/resources.html"


def build_404() -> None:
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found — chatagent.ca</title>
<meta name="robots" content="noindex">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
{NAV}
<div class="wrap">
  <article class="card">
    <h1 style="margin-top:0;color:var(--accent2)">Page not found</h1>
    <p>That URL is not on chatagent.ca. Try one of these:</p>
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/guides/">Guides</a></li>
      <li><a href="/champions.html">Champions</a></li>
      <li><a href="/resources.html">Resources</a></li>
      <li><a href="/contact.html">Contact</a></li>
    </ul>
  </article>
</div>
{FOOT}
</body>
</html>
"""
    (ROOT / "404.html").write_text(html, encoding="utf-8")


def expand_existing_guides() -> None:
    """Append extra original sections to earlier short guides if not already expanded."""
    boosts = {
        ROOT / "guides" / "how-to-summon-ai-champions.html": """
<article class="card" id="advanced">
<h2>Advanced: two-pass champion workflow</h2>
<p>Pass one — builder seat (for example ARKOS or OMNIΣIREN) produces a draft. Pass two — reviewer seat (Δ9RA or ÆTHERIS) only criticizes. Do not let the same thread silently switch roles without a header like <code>ROLE SWITCH: reviewer</code>. Humans should read both passes before publish.</p>
<h2>Classroom and workshop use</h2>
<p>If you teach AI literacy, assign one champion per student group with the same brief. Compare outputs. The lesson is not “which persona is magic,” it is “how framing changes completeness, risk awareness, and tone.” Always include a module on secrets and human responsibility.</p>
<h2>Measuring whether a summon helped</h2>
<ul>
<li>Did the done checklist complete faster with fewer retries?</li>
<li>Did the reviewer pass catch a real issue?</li>
<li>Did the final artifact survive Continuum verify a day later?</li>
</ul>
<p>If you cannot measure those, you are collecting aesthetic prompts, not improving work.</p>
</article>
""",
        ROOT / "guides" / "ai-agent-done-claims-continuum.html": """
<article class="card" id="ops">
<h2>Operations notes for teams</h2>
<p>Store capsules next to the repo (for example <code>ops/capsules/</code>) or in your ticket system as attachments. Name them with date and milestone. When CI exists, you can still keep Continuum as a human-readable layer for tasks CI does not cover (docs, content, mixed folders).</p>
<h2>What good claims look like</h2>
<ul>
<li>Stable paths (not temporary editor junk)</li>
<li>Needles that encode intent (“def login”) not huge paste blocks</li>
<li>JSON paths for machine reports agents already write</li>
<li>Enough claims to catch partial work (3–10 is a sweet spot)</li>
</ul>
<h2>What bad claims look like</h2>
<ul>
<li>Hashing secrets</li>
<li>Claims on generated folders that change every run without meaning</li>
<li>Only <code>file_exists</code> with no content checks for critical files</li>
</ul>
</article>
""",
        ROOT / "guides" / "lygo-lattice-overview.html": """
<article class="card" id="map">
<h2>A larger map (still optional)</h2>
<p>Beyond chatagent.ca you may see Eternal Haven pages, music portals, protocol stack docs, and ClawHub skills. Treat them as neighborhoods of one city: you can visit one café without memorizing the subway. When a page assumes jargon, return here or to the <a href="/resources.html">resources hub</a>.</p>
<h2>Trust model in one paragraph</h2>
<p>Public content is readable by anyone. Local tools should not exfiltrate your disk. Engineer FULL packages may be more powerful and require more care. Human consent gates write actions that matter. That is the lattice ethic we try to keep consistent.</p>
</article>
""",
        ROOT / "guides" / "safe-openclaw-skills.html": """
<article class="card" id="incident">
<h2>If a skill misbehaves</h2>
<ol>
<li>Disconnect network if the skill may be exfiltrating.</li>
<li>Stop the agent host process.</li>
<li>Preserve the skill folder for inspection (do not blindly delete evidence).</li>
<li>Rotate any credentials that might have been exposed.</li>
<li>Report to the publisher if appropriate; warn your team.</li>
</ol>
<p>Write a short incident note: what you installed, from where, what you observed. Future you will thank present you.</p>
</article>
""",
    }
    for path, extra in boosts.items():
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        if 'id="advanced"' in text or 'id="ops"' in text or 'id="map"' in text or 'id="incident"' in text:
            continue
        # insert before author-box or final footer
        needle = '<div class="author-box">'
        if needle in text:
            text = text.replace(needle, extra + "\n" + needle, 1)
        else:
            text = text.replace("</div>\n<footer", extra + "\n</div>\n<footer", 1)
        path.write_text(text, encoding="utf-8")


def build_sitemap(urls: list[str]) -> None:
    static = [
        "https://chatagent.ca/",
        "https://chatagent.ca/about.html",
        "https://chatagent.ca/contact.html",
        "https://chatagent.ca/privacy.html",
        "https://chatagent.ca/terms.html",
        "https://chatagent.ca/editorial-standards.html",
        "https://chatagent.ca/resources.html",
        "https://chatagent.ca/champions.html",
        "https://chatagent.ca/guides/",
        "https://chatagent.ca/app.html",
        "https://chatagent.ca/lygo-continuum.html",
        "https://chatagent.ca/lygoskillhub.html",
        "https://chatagent.ca/guides/how-to-summon-ai-champions.html",
        "https://chatagent.ca/guides/ai-agent-done-claims-continuum.html",
        "https://chatagent.ca/guides/safe-openclaw-skills.html",
        "https://chatagent.ca/guides/lygo-lattice-overview.html",
        "https://chatagent.ca/guides/free-tools-on-chatagent.html",
    ]
    all_urls = []
    for u in static + urls:
        if u not in all_urls:
            all_urls.append(u)
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for i, u in enumerate(all_urls):
        pri = "1.0" if u.endswith("chatagent.ca/") else "0.9" if "/guides/" in u or "/champions" in u else "0.8"
        lines.append(f"  <url><loc>{u}</loc><changefreq>weekly</changefreq><priority>{pri}</priority></url>")
    lines.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")


def patch_champions_index() -> None:
    path = ROOT / "champions.html"
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    # link names to deep pages if not already
    for c in CHAMPIONS:
        old = f"<h3>{c['seat']} — {c['name']}</h3>" if c["seat"] != "Focus seat" else None
        # simpler: ensure profile links section exists
    block = """
  <article class="card" id="profiles">
    <h2>Full profile pages</h2>
    <p>Each seat now has a dedicated educational page with when-to-use guidance, misuse notes, and starter prompts:</p>
    <ul>
"""
    for c in CHAMPIONS:
        block += f'      <li><a href="/champions/{c["slug"]}.html"><strong>{c["name"]}</strong></a> — {c["role"]}</li>\n'
    block += """    </ul>
  </article>
"""
    if 'id="profiles"' not in text:
        text = text.replace(
            '<article class="card">\n    <h2>Next steps</h2>',
            block + '\n  <article class="card">\n    <h2>Next steps</h2>',
        )
        path.write_text(text, encoding="utf-8")


def patch_guides_index() -> None:
    path = ROOT / "guides" / "index.html"
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Guides Library — chatagent.ca</title>
<meta name="description" content="Complete library of original guides on chatagent.ca: AI champions, Continuum, handoffs, local-first tools, secret hygiene, and more.">
<meta name="robots" content="index,follow">
<link rel="canonical" href="https://chatagent.ca/guides/">
<meta name="google-adsense-account" content="ca-pub-0646320966060599">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
{NAV}
<div class="wrap prose">
<p class="breadcrumb"><a href="/">Home</a> · Guides</p>
<header class="hero" style="padding-top:0.35rem">
  <h1>Guides library</h1>
  <p class="lead">Original educational articles by Justin Helmer. Free to read. Written for humans first; tools second.</p>
</header>
<article class="card">
  <h2>Start here</h2>
  <ul class="article-list">
    <li>
      <div class="date">Core · Beginner</div>
      <h3><a href="/guides/lygo-lattice-overview.html">LYGO lattice overview for newcomers</a></h3>
      <p>Vocabulary and map without assuming lore fluency.</p>
    </li>
    <li>
      <div class="date">Core · Practical</div>
      <h3><a href="/guides/how-to-summon-ai-champions.html">How to summon Δ9 AI champions</a></h3>
      <p>Step-by-step prompt practice and quality checks.</p>
    </li>
    <li>
      <div class="date">Core · Agents</div>
      <h3><a href="/guides/ai-agent-done-claims-continuum.html">When your AI agent says “done”</a></h3>
      <p>Falsifiable Continuum capsules and drift.</p>
    </li>
  </ul>
</article>
<article class="card">
  <h2>Operator craft</h2>
  <ul class="article-list">
    <li><div class="date">Templates</div><h3><a href="/guides/write-better-ai-task-briefs.html">Write better AI task briefs</a></h3><p>Six-block brief template agents can actually finish.</p></li>
    <li><div class="date">Teams</div><h3><a href="/guides/multi-agent-handoff-playbook.html">Multi-agent handoff playbook</a></h3><p>Packets, roles, and drills across sessions.</p></li>
    <li><div class="date">Privacy</div><h3><a href="/guides/redact-secrets-before-ai.html">Redact secrets before you paste into AI</a></h3><p>Checklist and rotate-on-exposure rule.</p></li>
    <li><div class="date">Security</div><h3><a href="/guides/safe-openclaw-skills.html">Safe OpenClaw / ClawHub skill habits</a></h3><p>Pre-install scans and incident notes.</p></li>
    <li><div class="date">Quality</div><h3><a href="/guides/human-review-checklist-for-ai-output.html">Human review checklist for AI output</a></h3><p>Before you publish code or prose.</p></li>
    <li><div class="date">Philosophy</div><h3><a href="/guides/local-first-ai-tools.html">Local-first AI tools</a></h3><p>Defaults, consent, and when cloud wins.</p></li>
    <li><div class="date">Tour</div><h3><a href="/guides/free-tools-on-chatagent.html">Free tools on chatagent.ca</a></h3><p>What each tool is for and is not.</p></li>
  </ul>
</article>
<article class="card">
  <h2>Reference</h2>
  <ul>
    <li><a href="/champions.html">Champion directory</a> · <a href="/resources.html">Resources hub</a></li>
    <li><a href="/editorial-standards.html">Editorial standards</a></li>
    <li><a href="/app.html">Summon app</a> · <a href="/lygo-continuum.html">Continuum</a> · <a href="/lygoskillhub.html">SkillHub</a></li>
  </ul>
</article>
{AUTHOR}
</div>
{FOOT}
</body>
</html>
"""
    path.write_text(html, encoding="utf-8")


def patch_homepage() -> None:
    path = ROOT / "index.html"
    # rewrite homepage with denser content
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>chatagent.ca — Original Guides for AI Champions, Agent Handoffs &amp; Free LYGO Tools</title>
<meta name="description" content="Independent educational site by Justin Helmer: deep guides on Δ9 champions, multi-agent handoffs, Continuum work claims, secret hygiene, and free AI tools. No account required.">
<meta name="author" content="Justin Helmer / Excavationpro">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="https://chatagent.ca/">
<meta name="google-adsense-account" content="ca-pub-0646320966060599">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0646320966060599" crossorigin="anonymous"></script>
<meta property="og:type" content="website">
<meta property="og:url" content="https://chatagent.ca/">
<meta property="og:title" content="chatagent.ca — AI champion guides &amp; free tools">
<meta property="og:description" content="Original educational guides and free tools for AI personas, handoffs, and Continuum claims.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@Excavationpro">
<meta name="theme-color" content="#f7f6f3">
<link rel="stylesheet" href="/assets/site.css">
<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "chatagent.ca",
  "url": "https://chatagent.ca/",
  "description": "Original guides for AI champions, agent handoffs, and free LYGO tools.",
  "publisher": {{
    "@type": "Person",
    "name": "Justin Helmer",
    "url": "https://chatagent.ca/about.html"
  }}
}}
</script>
</head>
<body>
{NAV}
<div class="wrap">
  <section class="hero">
    <p class="kicker">Independent educational publisher</p>
    <h1>Learn practical AI craft — champions, handoffs, and free tools that stay local-first</h1>
    <p class="lead">
      <strong>chatagent.ca</strong> is written and maintained by
      <a href="/about.html">Justin Helmer (Excavationpro)</a>.
      We publish original long-form guides, a full Δ9 champion reference, and free tools such as the summon app and Continuum verifier.
      No account is required to read or practice.
    </p>
    <p class="byline">Updated August 2026 · Human-reviewed guides · Labeled ads when present · <a href="/editorial-standards.html">Editorial standards</a></p>
    <div class="cta-row">
      <a class="btn primary" href="/guides/">Browse all guides →</a>
      <a class="btn" href="/resources.html">Resources hub</a>
      <a class="btn" href="/champions.html">15 champions</a>
      <a class="btn" href="/app.html">Summon app</a>
    </div>
    <div class="stat-row">
      <div class="stat"><b>15</b><span>champion profiles</span></div>
      <div class="stat"><b>12+</b><span>original guides</span></div>
      <div class="stat"><b>100%</b><span>free to read</span></div>
    </div>
  </section>

  <main class="prose">
    <article class="card">
      <h2>Why this site exists</h2>
      <p>
        AI products change weekly. What does not change is the need for clear writing: how to brief an agent,
        how to hand work between sessions, how to avoid pasting secrets, and how to treat “done” as something
        you can re-check. chatagent.ca is our public notebook for those skills, tied to the LYGO creative-technical
        project family without requiring you to install a full stack.
      </p>
      <p>
        We deliberately keep a <strong>content-first homepage</strong>. Interactive tools live one click away.
        That is better for learners — and for quality programs that reject tool-only pages with thin text.
      </p>
    </article>

    <article class="card">
      <h2>Featured guides</h2>
      <ul class="article-list">
        <li>
          <div class="date">Guide</div>
          <h3><a href="/guides/multi-agent-handoff-playbook.html">Multi-agent handoff playbook</a></h3>
          <p>Packets, roles, Continuum seals, and a 30-minute drill so the next agent inherits evidence.</p>
        </li>
        <li>
          <div class="date">Guide</div>
          <h3><a href="/guides/write-better-ai-task-briefs.html">Write better AI task briefs</a></h3>
          <p>A six-block template: goal, inputs, constraints, done checks, handoff.</p>
        </li>
        <li>
          <div class="date">Guide</div>
          <h3><a href="/guides/ai-agent-done-claims-continuum.html">When your agent says “done”</a></h3>
          <p>Falsifiable claims, drift, and the free Continuum portal.</p>
        </li>
        <li>
          <div class="date">Guide</div>
          <h3><a href="/guides/redact-secrets-before-ai.html">Redact secrets before you paste</a></h3>
          <p>Practical hygiene before any model or agent sees your buffer.</p>
        </li>
      </ul>
      <p><a href="/guides/">Full library →</a></p>
    </article>

    {AD_MID}

    <article class="card">
      <h2>Δ9 champions — educational personas</h2>
      <p>
        Fifteen published seats (Lyra, Δ9RA, ARKOS, Kairos, Lightfather, and more) help you steer AI chats with
        consistent roles. They are creative frameworks, not professionals and not supernatural authorities.
        Start with the <a href="/champions.html">directory</a>, open any
        <a href="/champions/lyra.html">deep profile</a>, then copy a full invoke from the
        <a href="/app.html">summon app</a>.
      </p>
      <div class="chip-row">
        <a class="chip" href="/champions/lyra.html">LYRΔ</a>
        <a class="chip" href="/champions/d9ra.html">Δ9RA</a>
        <a class="chip" href="/champions/arkos.html">ARKOS</a>
        <a class="chip" href="/champions/kairos.html">KAIROS</a>
        <a class="chip" href="/champions/lightfather.html">Lightfather</a>
        <a class="chip" href="/champions/aetheris.html">ÆTHERIS</a>
        <a class="chip" href="/champions.html">All 15 →</a>
      </div>
    </article>

    <article class="card">
      <h2>Free tools (documented)</h2>
      <div class="grid-2">
        <div class="mini">
          <h3><a href="/app.html">Summon app</a></h3>
          <p>Searchable cards and copyable Δ9Quantum Invoke prompts.</p>
        </div>
        <div class="mini">
          <h3><a href="/lygo-continuum.html">Continuum</a></h3>
          <p>Browser-side claim verify; files hashed locally.</p>
        </div>
        <div class="mini">
          <h3><a href="/lygoskillhub.html">SkillHub</a></h3>
          <p>Ledger of ClawHub skills and FULL engineer packages.</p>
        </div>
        <div class="mini">
          <h3><a href="/guides/free-tools-on-chatagent.html">Tools tour</a></h3>
          <p>What each tool is for — and what it is not.</p>
        </div>
      </div>
    </article>

    <article class="card">
      <h2>Trust &amp; policies</h2>
      <p>
        Publisher identity, contact path, and policies are not optional extras:
        <a href="/about.html">About</a>,
        <a href="/contact.html">Contact</a>,
        <a href="/privacy.html">Privacy</a>,
        <a href="/terms.html">Terms</a>,
        <a href="/editorial-standards.html">Editorial standards</a>.
      </p>
      <p>
        Questions and corrections are welcome. We would rather fix a page than pretend perfection.
      </p>
    </article>

    <article class="card" id="faq">
      <h2>FAQ</h2>
      <h3>Is everything free?</h3>
      <p>Yes for guides and on-site tools. Optional donations and labeled ads support hosting when advertising is approved.</p>
      <h3>Do I need the full LYGO stack?</h3>
      <p>No. Guides are written for newcomers. Deeper protocol docs are optional side quests.</p>
      <h3>Are champions magic?</h3>
      <p>No. They are authored personas and prompt frameworks for creative and systems work.</p>
      <h3>Who is responsible for AI output?</h3>
      <p>You are, if you publish or deploy it. See our <a href="/guides/human-review-checklist-for-ai-output.html">human review checklist</a>.</p>
      <h3>How do I report an error?</h3>
      <p>Use the <a href="/contact.html">contact page</a> with the URL and a short description.</p>
    </article>
  </main>
  {AUTHOR}
</div>
{FOOT}
<div class="cookie-bar" id="cookieBar" role="dialog" aria-label="Cookie notice">
  <div class="inner">
    <span>We use cookies for essential function and, when enabled, Google AdSense. <a href="/privacy.html">Privacy</a>.</span>
    <button type="button" id="cookieOk">OK</button>
  </div>
</div>
<script>
(function(){{
  try {{
    if (!localStorage.getItem('ca_cookie_ok')) {{
      var b = document.getElementById('cookieBar');
      if (b) {{
        b.classList.add('show');
        var ok = document.getElementById('cookieOk');
        if (ok) ok.onclick = function(){{ localStorage.setItem('ca_cookie_ok','1'); b.classList.remove('show'); }};
      }}
    }}
  }} catch (e) {{}}
}})();
</script>
</body>
</html>
"""
    path.write_text(html, encoding="utf-8")


def expand_about() -> None:
    path = ROOT / "about.html"
    path.write_text(
        page_shell(
            "About Justin Helmer & chatagent.ca",
            "About the publisher of chatagent.ca: Justin Helmer (Excavationpro), mission, projects, and contact.",
            "https://chatagent.ca/about.html",
            f"""
<p class="breadcrumb"><a href="/">Home</a> · About</p>
<article class="card">
<img class="hero-img" src="/assets/champions/lightfather.jpg" alt="Lightfather / publisher artwork" width="720" height="280" loading="lazy">
<h1 style="margin-top:0;font-size:1.75rem;color:var(--accent2)">About chatagent.ca</h1>
<p class="meta">Publisher page · Justin Helmer · Updated August 2026</p>
<h2>Who I am</h2>
<p>My name is <strong>Justin Helmer</strong>. Online I publish as <strong>Excavationpro</strong> and, in LYGO creative lore, <strong>Lightfather</strong>. I build music, free tools, documentation systems, and educational pages for people who use AI seriously without surrendering judgment.</p>
<p>chatagent.ca is one front door: guides first, tools second, policies always visible.</p>
<h2>Mission</h2>
<p>Help people brief agents well, hand work across sessions, keep secrets out of chats, and treat completion as something checkable. Do it with free resources and honest limits.</p>
{AD_MID}
<h2>Projects you may also see</h2>
<ul>
<li>LYGO / Eternal Haven documentation and star-chart experiments</li>
<li>ClawHub skills under deepseekoracle (local-first utilities)</li>
<li>Music and listening portals under Excavationpro</li>
<li>Open demos on Hugging Face where noted</li>
</ul>
<h2>Independence</h2>
<p>This site is independent. It is not owned by Google, OpenAI, Anthropic, or xAI. When AdSense appears, it is a funding mechanism, not an editorial partner. Sponsored content — if ever accepted — would be labeled.</p>
<h2>Contact</h2>
<p>See <a href="/contact.html">contact.html</a> for current channels. Prefer public project hubs listed there for non-urgent topics.</p>
<p><a class="btn primary" href="/guides/">Read guides</a> <a class="btn" href="/editorial-standards.html">Editorial standards</a></p>
</article>
""",
            ads=True,
        ),
        encoding="utf-8",
    )


def main() -> None:
    champ_urls = build_champion_pages()
    guide_pairs = build_extra_guides()
    guide_urls = [u for _, u in guide_pairs]
    ed = build_editorial()
    res = build_resources()
    build_404()
    expand_existing_guides()
    patch_champions_index()
    patch_guides_index()
    patch_homepage()
    expand_about()
    all_urls = champ_urls + guide_urls + [ed, res]
    build_sitemap(all_urls)
    print("champions", len(champ_urls))
    print("new_guides", len(guide_urls))
    print("sitemap_urls", len(all_urls) + 16)


if __name__ == "__main__":
    main()
