// Every moment a learner meets in a Puerto Colibrí conversation, with the card shown right after it: the NPC's
// lines of the turn, then each suggestion (its label) and the model answers the card offers for it (or its frames).
// The moments come from the scripted sims (6 seeds, both genders) and from random learner walks: at each turn the
// learner picks one of the offered suggestions and says one of its model answers (sometimes a sim turn instead).
// Flags: EMPTY (no suggestion, or a card with no answers and no frames), AGAIN (a suggestion whose hint the learner
// already used and was understood earlier in the walk).
//   EDITION=es [LEARNER=lt] npx tsx --import ./tools/edition-hook.mjs tools/es-playthrough.ts <out dir> [ids…] [--walks=60]
import { writeFileSync } from "node:fs";
import { SITUATIONS } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { Conversation, type TurnOut } from "../src/convo/dialogue";
import { addressInformal, setVariety, type Sentence } from "../src/convo/compose";
import { answerFrames, modelAnswers, playerVars } from "../src/convo/suggest";
import { EDITION } from "../src/edition";
import { playSim } from "./sim-play";
import type { SituationDef } from "../src/content/types";

const args = process.argv.slice(2);
const out = args[0];
const only = args.slice(1).filter((a) => !a.startsWith("--"));
const WALKS = Number(args.find((a) => a.startsWith("--walks="))?.slice(8) ?? 60);
setVariety("default");

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

interface Card { label: string; hint?: string; ex: { es: string; nat: string }[]; frames: boolean }
interface Moment { at: string; npc: { es: string; nat: string }[]; cards: Card[]; flags: string[]; n: number; first: number }

function cardsNow(sit: SituationDef, conv: Conversation, gender: "m" | "f"): Card[] {
  const { suggest, hints } = conv.support();
  const groupOf = (id: string) => sit.hints[id] ?? GLOBAL.hints[id];
  const lastNpc = conv.lastLines[conv.lastLines.length - 1]?.npc ?? sit.npc;
  const npc = NPCS[lastNpc];
  const o = { formal: !addressInformal(npc as any), gender, npcGender: npc?.gender ?? "f", vars: playerVars(null, (conv as any).said) } as const;
  return suggest.map((sg) => {
    let ex: Sentence[] = sg.hint && groupOf(sg.hint) ? modelAnswers(sit, groupOf(sg.hint), undefined, o, 3) : [];
    let frames = false;
    if (!ex.length) {
      const more = hints.filter((id) => id !== "g_clarify" && id !== sg.hint && groupOf(id));
      for (const id of more) for (const s of modelAnswers(sit, groupOf(id), undefined, o, 3)) if (ex.length < 3 && !ex.some((e) => e.en === s.en)) ex.push(s);
      if (ex.length) frames = false;
    }
    if (!ex.length) {
      const more = hints.filter((id) => id !== "g_clarify" && id !== sg.hint && groupOf(id));
      for (const id of [sg.hint, ...more]) if (id && groupOf(id)) for (const f of answerFrames(sit, groupOf(id), undefined, o, 3)) if (ex.length < 3 && !ex.some((x) => x.en === f.s.en)) ex.push(f.s);
      frames = ex.length > 0;
    }
    return { label: sg.lt, hint: sg.hint, ex: ex.map((s) => ({ es: s.en, nat: s.nat })), frames };
  });
}

import { mkdirSync } from "node:fs";
mkdirSync(out, { recursive: true });
for (const sit of SITUATIONS) {
  if (only.length && !only.some((p) => sit.id.startsWith(p))) continue;
  const moments = new Map<string, Moment>();
  let order = 0;
  const note = (conv: Conversation, o: TurnOut, gender: "m" | "f", used: Set<string>) => {
    if (conv.ended) return;
    const at = conv.pending?.id ? `?${conv.pending.id}` : conv.effectiveStep()?.id ?? (conv.completed ? "(done)" : "-");
    const npc = o.lines.map((l) => ({ es: l.sentence.en, nat: l.sentence.nat }));
    const cards = cardsNow(sit, conv, gender);
    const flags: string[] = [];
    if (!cards.length) flags.push("EMPTY:no suggestion");
    for (const c of cards) {
      if (!c.ex.length) flags.push(`EMPTY:${c.label}`);
      if (c.hint && used.has(c.hint) && !/^g_(thanks|ok|bye|clarify|sorry|repeat|slower)/.test(c.hint)) flags.push(`AGAIN:${c.hint}`);
    }
    const key = at + "|" + npc.map((l) => l.es).join(" ") + "|" + cards.map((c) => c.label + ":" + c.ex.map((e) => e.es).join("/")).join(";");
    const m = moments.get(key);
    if (m) { m.n++; for (const f of flags) if (!m.flags.includes(f)) m.flags.push(f); }
    else moments.set(key, { at, npc, cards, flags, n: 1, first: order++ });
  };
  const simTurns = (sit.sims ?? []).flatMap((s) => s.turns);
  const deaf = new Set<string>();
  // the scripted sims
  for (const sim of sit.sims ?? []) for (let seed = 1; seed <= 6; seed++) {
    const used = new Set<string>();
    const gender = seed % 2 ? "m" : "f";
    try {
      playSim(sit, sim, seed, { gender, onTurn: (conv, t, o) => { if (t && o.understood) for (const h of o.hintsUsed) used.add(h); note(conv, o, gender, used); } });
    } catch (e) { console.error(sit.id, sim.name, seed, String(e).slice(0, 200)); }
  }
  // random learner walks
  for (let w = 0; w < WALKS; w++) {
    const r = rng(1000 + w * 7919);
    const gender = r() < 0.5 ? "m" : "f";
    const used = new Set<string>();
    try {
      const conv = new Conversation(sit, { global: GLOBAL, npcs: NPCS, player: { name: EDITION.simPlayer.name, surname: EDITION.simPlayer.surname, gender, datePartner: "emma" }, visits: Math.floor(r() * 3), seed: 1 + w, memory: {} });
      let o = conv.start();
      note(conv, o, gender, used);
      for (let k = 0; k < 40 && !conv.ended; k++) {
        const cards = cardsNow(sit, conv, gender).filter((c) => c.ex.length && !c.frames);
        let say: string | undefined;
        if (cards.length && r() < 0.85) {
          const c = cards[r() < 0.5 ? 0 : Math.floor(r() * cards.length)];
          say = c.ex[Math.floor(r() * c.ex.length)].es;
        } else if (simTurns.length) say = simTurns[Math.floor(r() * simTurns.length)];
        if (!say) break;
        const atBefore = conv.pending?.id ? `?${conv.pending.id}` : conv.effectiveStep()?.id ?? "-";
        const fromCard = cards.some((c) => c.ex.some((e) => e.es === say));
        o = conv.input(say);
        if (fromCard && !o.understood) deaf.add(`${atBefore}: ${say}`);
        if (o.understood) for (const h of o.hintsUsed) used.add(h);
        note(conv, o, gender, used);
        if (conv.completed && !conv.pending && r() < 0.3) break;
      }
    } catch (e) { console.error(sit.id, "walk", w, String(e).slice(0, 200)); }
  }
  writeFileSync(`${out}/${sit.id}.json`, JSON.stringify([...moments.values()].sort((a, b) => a.first - b.first)));
  if (deaf.size) writeFileSync(`${out}/${sit.id}.deaf.txt`, [...deaf].join("\n") + "\n");
  console.log(sit.id, moments.size, new Date().toISOString().slice(11, 19));
}
