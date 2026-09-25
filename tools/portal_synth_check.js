#!/usr/bin/env node
/* LYGO portal — bench synthesis check (node, no browser)
 *
 * The splitter, the assembler and the meta-prompt are pure, so they are tested here rather than by
 * clicking: what this file proves is what the browser runs, because both load portal/synth.js itself.
 *
 *   node tools/portal_synth_check.js
 *
 * Exits non-zero on the first failure and prints every assertion as it goes.
 */
"use strict";
const path = require("path");
const S = require(path.join(__dirname, "..", "portal", "synth.js"));

let pass = 0, fail = 0;
function must(cond, what) {
  if (cond) { pass++; console.log("  ok   " + what); }
  else { fail++; console.log("  FAIL " + what); }
}
function eq(got, want, what) {
  const ok = got === want;
  must(ok, what + (ok ? "" : "  (got " + JSON.stringify(String(got).slice(0, 120)) + ", want " + JSON.stringify(String(want).slice(0, 120)) + ")"));
}
const squash = (s) => S.flat(s);

console.log("\nsplitter");
{
  eq(S.splitSegments("").length, 0, "empty answer makes no segments");
  eq(S.splitSegments("   \n\n  ").length, 0, "whitespace-only answer makes no segments");
  const one = S.splitSegments("A single short paragraph.");
  eq(one.length, 1, "one short paragraph is one segment");
  eq(one[0].i, 1, "the first segment is index 1");
  eq(one[0].text, "A single short paragraph.", "the segment keeps the text");

  const two = S.splitSegments("First paragraph here.\n\nSecond paragraph here.");
  eq(two.length, 2, "two paragraphs are two segments");
  eq(two.map((s) => s.i).join(","), "1,2", "segment indexes are contiguous from 1");

  const list = ["Here are the steps:", "", "- read the key from the box", "- send it to the vendor", "1. then nothing else", "* and keep it local", "- never store it"].join("\n");
  const ls = S.splitSegments(list);
  eq(ls.length, 6, "a list splits one segment per line, beside its lead-in");
  eq(ls.filter((s) => s.kind === "line").length, 5, "the five list lines are marked as lines");
  must(ls[0].text.indexOf("Here are the steps") >= 0, "the lead-in paragraph stays its own segment");

  // A wall of text must break at its own sentences, and no segment may be a runt.
  const sentence = "This clause runs on for a while so that the whole paragraph climbs past the splitter's own limit and has to be broken at a sentence boundary instead of being handed to the reader as one block. ";
  const wall = sentence.repeat(9);
  const ws = S.splitSegments(wall);
  must(ws.length >= 3, "a wall of text breaks into several segments (got " + ws.length + ")");
  must(ws.every((s) => s.text.length <= S.SEG_MAX * 1.6), "no broken segment is a wall itself (max " + Math.max(...ws.map((s) => s.text.length)) + ")");
  must(ws.filter((s) => s.text.length < S.SEG_MIN).length === 0, "no broken segment is a runt");
  must(ws.every((s) => s.kind === "sentence"), "the broken segments are marked as sentences");

  // Nothing is added and nothing is dropped, on every shape above.
  [one, two, ls, ws].forEach((set, i) => {
    eq(squash(set.map((s) => s.text).join(" ")), squash(set === ws ? wall : set === ls ? list : set === two ? "First paragraph here. Second paragraph here." : "A single short paragraph."), "shape " + i + " round-trips through the splitter");
  });

  // A paragraph under the limit stays whole even when it holds several sentences.
  const short3 = S.splitSegments("One. Two. Three.");
  eq(short3.length, 1, "a short multi-sentence paragraph is left whole");
}

console.log("\nassembler");
{
  const rows = [
    { lane: "A", label: "Groq · openai/gpt-oss-20b", seg: { i: 2, text: "The first picked point, verbatim." } },
    { lane: "B", label: "Gemini · gemini-2.0-flash", seg: { i: 1, text: "A different angle from the second answer." } },
    { lane: "A", label: "Groq · openai/gpt-oss-20b", seg: { i: 5, text: "And a closing point from the first answer again." } },
  ];
  const a = S.assemble(rows);
  eq(a.count, 3, "the assembly counts every picked segment");
  must(a.text.indexOf("The first picked point, verbatim. (A2)") === 0, "the first block is verbatim and tagged with its answer and segment");
  must(a.text.indexOf("A different angle from the second answer. (B1)") > 0, "the second answer's segment follows in reading order");
  must(a.text.indexOf("(A5)") > 0, "a second segment from the same answer is tagged with its own number");
  must(a.text.indexOf("A2") < a.text.indexOf("B1"), "the tags appear in the order the reader picked");
  must(a.text.indexOf("Groq · openai/gpt-oss-20b — segments 2, 5") > 0, "the sources line groups one answer's segments together");
  must(a.text.indexOf("Gemini · gemini-2.0-flash — segment 1") > 0, "the sources line names the second answer");
  must(a.text.indexOf("no model rewrote these") > 0, "the assembly says it was kept verbatim");
  must(a.text.indexOf("the tag after a block (A2) is answer A, segment 2") > 0, "the tag example is a tag that is really in this answer");
  const other = S.assemble([{ lane: "B", label: "x", seg: { i: 1, text: "only a B pick" } }]);
  must(other.text.indexOf("the tag after a block (B1) is answer B, segment 1") > 0, "the example follows the first tag of THIS pick, not a fixed one");
  must(S.assemble(rows, { tags: false }).text.indexOf("the tag after a block") < 0, "with tags off there is no tag to explain");
  eq(a.tags.join(","), "A2,B1,A5", "the tag list is returned for the caller");
  eq(a.lanes.length, 2, "two answers contributed");

  const clean = S.assemble(rows, { tags: false });
  must(clean.text.indexOf("(A2)") < 0, "tags can be turned off");
  must(clean.text.indexOf("Groq · openai/gpt-oss-20b — segments 2, 5") > 0, "provenance survives turning the tags off");

  const none = S.assemble([]);
  eq(none.count, 0, "an empty pick assembles nothing");
  eq(none.text, "", "an empty pick makes no text");
  const blank = S.assemble([{ lane: "A", label: "x", seg: { i: 1, text: "   " } }]);
  eq(blank.count, 0, "a blank segment is not a pick");
}

console.log("\nmeta-prompt");
{
  const full = [
    { label: "Groq · openai/gpt-oss-20b", text: "Answer one says the cheapest route is a queue." },
    { label: "Gemini · gemini-2.0-flash", text: "Answer two says the queue is wrong." },
  ];
  const all = S.synthPrompt({ prompt: "Which route is cheapest?", mode: "all", body: S.sourceBlock(full) });
  must(all.indexOf("Which route is cheapest?") > 0, "the original prompt is carried into the meta-prompt");
  must(all.indexOf("--- ANSWER A (Groq · openai/gpt-oss-20b) ---") > 0, "each answer is labelled for the synthesizer");
  must(all.indexOf("Answer two says the queue is wrong.") > 0, "the second answer's text is present");
  must(/ONE refined answer/.test(all), "it asks for one refined answer, not a comparison");
  must(/Invent nothing/.test(all), "it forbids invention");
  must(/Provenance:/.test(all), "it requires a provenance line");
  must(/disagree/.test(all), "it asks for disagreements to be surfaced");
  must(all.indexOf("hand-picked") < 0, "the 'all answers' prompt does not claim the material was picked");

  const picks = [{ lane: "A", label: "Groq · openai/gpt-oss-20b · segment 2", text: "the cheapest route is a queue" }];
  const pickPrompt = S.synthPrompt({ prompt: "Which route is cheapest?", mode: "picks", body: S.sourceBlock(picks) });
  must(pickPrompt.indexOf("Groq · openai/gpt-oss-20b · segment 2") > 0, "the picked segment is labelled with its answer and segment");
  must(pickPrompt.indexOf("--- ANSWER A (Groq · openai/gpt-oss-20b · segment 2) ---") > 0, "the segment's section carries the same lane letter the tags use");
  must(pickPrompt.indexOf("the cheapest route is a queue") > 0, "the picked segment's words reach the synthesizer");
  must(pickPrompt.indexOf("Answer two says the queue is wrong.") < 0, "material the reader rejected is not sent");
  must(/hand-picked by the person reading the bench/.test(pickPrompt), "the picks prompt says a human chose the material");
  must(/only them, as your material/.test(pickPrompt), "the picks prompt forbids material from outside the picks");

  must(S.synthSystem("picks").indexOf("hand-picked") > 0, "the picks system line says the material was chosen");
  must(S.synthSystem("all").indexOf("hand-picked") < 0, "the full-answers system line does not");

  const noLane = S.sourceBlock([{ label: "solo", text: "t" }]);
  must(noLane.indexOf("--- ANSWER A (solo) ---") === 0, "a source with no lane letter falls back to its position");
  const ordered = S.sourceBlock([{ lane: "B", label: "second", text: "t" }]);
  must(ordered.indexOf("--- ANSWER B (second) ---") === 0, "a source with a lane letter keeps it, so both routes name answers the same way");
  must(S.sourceBlock([]) === "", "no sources make no block");
}

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
