// Builds src/generated/known-words.json: every real English word (in the CMU dictionary) of 5+ letters
// that the game itself uses (NPC lines, hints, entity names and forms, grammar patterns). The recognizer-typo tolerance never
// "corrects" a word from this list into another one ("hungry" is not "Hungary", "hostel" is not
// "hotel"), because a real word was most likely meant as said.
// Usage: npx tsx tools/build-vocab.ts   (re-run after content changes, like build-ipa)
import fs from "node:fs";
import path from "node:path";
import { SITUATIONS } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { tokenizePatternWords } from "../src/convo/normalize";

const words = new Set<string>();
const addText = (text: string) => {
  const clean = text
    .replace(/\{[^}]*\}/g, " ")     // slots / placeholders
    .replace(/[@#][A-Za-z0-9_:.\-]+/g, " ") // macros, tags
    .replace(/[()[\]|?]/g, " ");
  for (const w of tokenizePatternWords(clean)) if (w.length >= 5 && /^[a-z']+$/.test(w)) words.add(w);
};
const addPatterns = (p: string | string[]) => (Array.isArray(p) ? p : [p]).forEach(addText);

for (const def of Object.values(GLOBAL.intents)) addPatterns(def.patterns);
for (const p of Object.values(GLOBAL.macros)) addPatterns(p);
for (const lines of Object.values(GLOBAL.lines)) for (const l of lines) addText(l.en.split(" | ").join(" "));
for (const g of Object.values(GLOBAL.hints)) for (const it of g.items) addText(it.s.en.split(" | ").join(" "));

for (const sit of SITUATIONS) {
  for (const def of Object.values(sit.intents)) addPatterns(def.patterns);
  for (const p of Object.values(sit.grammar?.macros || {})) addPatterns(p as string | string[]);
  for (const def of Object.values(sit.grammar?.slots || {}) as any[]) {
    if (def.pattern) addPatterns(def.pattern);
    if (def.lexicon) for (const e of def.lexicon) addPatterns(e.forms);
  }
  for (const list of Object.values(sit.entities || {})) for (const e of list) {
    addText(e.en.split(" | ").join(" "));
    if (e.pl) addText(e.pl.split(" | ").join(" "));
    for (const f of e.forms || []) addText(f);
  }
  for (const lines of Object.values(sit.lines)) for (const l of lines) addText(l.en.split(" | ").join(" "));
  for (const g of Object.values(sit.hints)) for (const it of g.items) addText(it.s.en.split(" | ").join(" "));
}

// only real English words (CMU dictionary): recognizer spellings listed as forms ("cappucino") stay out
const CMU: Record<string, unknown> = JSON.parse(fs.readFileSync(path.resolve("tools/data/cmudict.json"), "utf8"));
for (const w of [...words]) if (!CMU[w]) words.delete(w);

const out = path.resolve("src/generated/known-words.json");
fs.writeFileSync(out, JSON.stringify([...words].sort()));
console.log(`known words: ${words.size} → ${path.relative(process.cwd(), out)}`);
