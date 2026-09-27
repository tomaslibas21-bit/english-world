// Answer contexts of a situation: every point in its sims where the learner has to answer,
// with the NPC's question, the intents that answer it, the Lithuanian suggestions and the chips.
// Written for people (and agents) who write test sentences without looking at the grammar.
// Usage: npx tsx tools/contexts.ts [situation-prefix ...] [--out=dir]   (default: print JSON)
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { SITUATIONS } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import type { Conversation } from "../src/convo/dialogue";
import { playSim } from "./sim-play";
import type { SituationDef } from "../src/content/types";

export interface AnswerContext {
  /** Step id or pending-question id. */
  id: string;
  kind: "step" | "pending";
  /** What the NPC said right before (up to 3 different examples). */
  npc: string[];
  /** Intents that answer this context (they get a ranking bonus). */
  expects: string[];
  /** Does a bare yes/no answer mean something here? */
  yesNo: boolean;
  /** Lithuanian suggestions shown to the learner (what to communicate). */
  suggest: string[];
  /** Chip values (entity names) offered with the suggestions. */
  options: string[];
}

export function situationContexts(sit: SituationDef): { contexts: Record<string, AnswerContext>; intents: string[]; globalIntents: string[] } {
  const ctxs = new Map<string, AnswerContext>();
  const record = (conv: Conversation, npcText: string) => {
    const pend = conv.pending;
    const st = conv.effectiveStep();
    const id = pend?.id ?? st?.id;
    if (!id) return;
    const kind = pend ? "pending" : "step";
    const sup = conv.support();
    const options: string[] = [];
    for (const sg of sup.suggest) {
      if (!sg.options) continue;
      const ids = Array.isArray(sg.options) ? sg.options : (sit.entities?.[sg.options] || []).map((e) => e.id);
      for (const eid of ids) {
        const e = conv.look(eid);
        if (e) options.push(e.en.split(" | ").join(" "));
      }
    }
    const yesNo = !!(pend ? (pend.yes || pend.no) : (st?.yes || st?.no));
    const prev = ctxs.get(id);
    if (prev) {
      if (npcText && prev.npc.length < 3 && !prev.npc.includes(npcText)) prev.npc.push(npcText);
      for (const e of conv.expectedIntents()) if (!prev.expects.includes(e)) prev.expects.push(e);
      for (const o of options) if (!prev.options.includes(o)) prev.options.push(o);
      prev.yesNo = prev.yesNo || yesNo;
      return;
    }
    ctxs.set(id, {
      id, kind, npc: npcText ? [npcText] : [], expects: [...new Set(conv.expectedIntents())], yesNo,
      suggest: sup.suggest.map((s) => s.lt), options: [...new Set(options)],
    });
  };
  // every moment the scripted conversations reach, played as in tools/sim-play.ts
  for (const sim of sit.sims || []) {
    for (let seed = 1; seed <= 12; seed++) {
      playSim(sit, sim, seed, { onTurn: (conv, _t, out) => { if (!conv.ended) record(conv, out.lines.map((l) => l.sentence.en).join(" ")); } });
    }
  }
  return {
    contexts: Object.fromEntries(ctxs),
    intents: Object.keys(sit.intents),
    globalIntents: Object.keys(GLOBAL.intents).filter((k) => !sit.intents[k]),
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("contexts.ts");
if (isMain) {
  const args = process.argv.slice(2);
  const outDir = args.find((a) => a.startsWith("--out="))?.slice(6);
  const filters = args.filter((a) => !a.startsWith("--"));
  const sits = SITUATIONS.filter((s) => !filters.length || filters.some((f) => s.id.startsWith(f) || String(s.song) === f));
  for (const sit of sits) {
    const data = { situation: sit.id, title: sit.title.en, goal: sit.goal, ...situationContexts(sit) };
    if (outDir) {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(path.join(outDir, `${sit.id}.json`), JSON.stringify(data, null, 1));
      console.log(`${sit.id}: ${Object.keys(data.contexts).length} contexts`);
    } else console.log(JSON.stringify(data, null, 1));
  }
}
