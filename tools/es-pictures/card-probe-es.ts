// For the course's game flashcards (Spanish Master English, docs/es/COURSE.md): which scene picture is on screen when
// Puerto Colibrí first offers each phrase group, and what the other person had just said. English Master's probe
// made for the Spanish edition. Groups are rebuilt as SME's scripts/course/export_game_phrases.ts builds
// game-phrases.json (same order, same leaving-out of repeats, Mexican Spanish), so group i here is group i there; the
// three decks (México / neutral / España) share the groups and so the pictures. Pictures follow tools/scene-walk.ts.
//   EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-pictures/card-probe-es.ts <out.json> [--seeds=6]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SITUATIONS } from "../../src/content/situations";
import { NPCS } from "../../src/content/npcs";
import { modelAnswers, playerVars } from "../../src/convo/suggest";
import { EDITION } from "../../src/edition";
import { playSim } from "../sim-play";
import type { SceneFile } from "../../src/ui/scenes";

if (EDITION.id !== "es") throw new Error("run with EDITION=es and the edition hook");
const ROOT = path.resolve(import.meta.dirname, "../..");
const DATA = path.join(ROOT, "src/editions/es/ui/scene-data");
const dest = process.argv[2];
const seeds = Number(process.argv.find((a) => a.startsWith("--seeds="))?.split("=")[1] ?? 6);
// as the course's export: a new (male) learner, usted or tú as the conversation's main person is addressed
const optsFor = (sit: { npc: string }) => ({ formal: !NPCS[sit.npc]?.informal, gender: "m" as const, npcGender: NPCS[sit.npc]?.gender ?? "f", vars: playerVars(null) });
const keyOf = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, "").replace(/\s+/g, " ").trim();
const out: Record<string, unknown> = {};
// --only=x01-surf,x02-alux-kin: these conversations only (new ones: cards.py map --only merges them into the map)
const only = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1].split(",");
for (const sit of SITUATIONS as any[]) {
  if (only && !only.includes(sit.id)) continue;
  const key = existsSync(path.join(DATA, sit.id + ".json")) ? sit.id : `${sit.id}@emma`;
  const f: SceneFile = JSON.parse(readFileSync(path.join(DATA, key + ".json"), "utf8"));
  const votes: Record<string, Record<string, number>> = {};
  const steps: Record<string, Record<string, number>> = {};
  const said: Record<string, string> = {};
  for (const sim of sit.sims || []) for (let seed = 1; seed <= seeds; seed++) {
    let kept: string | undefined;
    const seen = new Set<string>();
    try {
      playSim(sit, sim, seed, {
        gender: "m",
        datePartner: key.includes("@") ? key.split("@")[1] : undefined,
        onTurn: (conv, _turn, o) => {
          const stepId = conv.ended ? "closing" : conv.pending?.id ?? conv.effectiveStep()?.id ?? null;
          // as SceneBackdrop: each line said shows its own picture, or else the moment's; the last one stays
          const at = (lineId?: string) => (kept && f.sticky?.includes(kept) && kept) || (lineId && f.lines?.[lineId]) || (stepId && f.phases[stepId]) || (conv.completed && f.done) || kept || f.start;
          if (!o?.lines?.length) kept = at(undefined);
          for (const l of o?.lines ?? []) kept = at((l as any).lineId);
          const pic = kept!;
          if (conv.ended) return;
          for (const h of conv.support().hints) {
            if (seen.has(h)) continue;
            seen.add(h);
            (votes[h] ??= {})[pic] = (votes[h][pic] ?? 0) + 1;
            (steps[h] ??= {})[stepId ?? "-"] = (steps[h][stepId ?? "-"] ?? 0) + 1;
            said[h] ??= (o?.lines ?? []).map((l: any) => l.sentence?.say ?? l.sentence?.en ?? "").filter(Boolean).join(" ");
          }
        },
      });
    } catch { /* a sim that fails here is the game tests' business */ }
  }
  const top = (v?: Record<string, number>) => (v ? Object.entries(v).sort((a, b) => b[1] - a[1])[0][0] : null);
  const groups = [];
  const seenKeys = new Set<string>();
  for (const [hint, g] of Object.entries(sit.hints ?? {}) as [string, any][]) {
    const answers = modelAnswers(sit, g, undefined, optsFor(sit), g.items.length);
    const items: string[] = [];
    const meaning: string[] = [];
    for (const s of answers) {
      const k = keyOf(s.en);
      if (!k || seenKeys.has(k)) continue;
      seenKeys.add(k);
      items.push(s.en);
      if ((s as any).nat) meaning.push((s as any).nat);
    }
    if (!items.length) continue;
    groups.push({ hint, goal: g.lt, items, meaning, pic: top(votes[hint]), step: top(steps[hint]), said: said[hint] ?? null });
  }
  out[sit.id] = { scene: key, title: sit.title?.en, npc: f.npc, focus: f.focus, start: f.start, images: f.images, groups };
}
writeFileSync(dest, JSON.stringify(out, null, 1));
console.log(`${Object.keys(out).length} conversations, ${Object.values(out).reduce((a: number, v: any) => a + v.groups.length, 0)} groups → ${dest}`);
