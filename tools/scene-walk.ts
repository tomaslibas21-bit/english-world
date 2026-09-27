// Checks the illustrated scenes (src/ui/scene-data/*.json, pictures in public/scenes/) and shows which
// picture is on screen at each moment of the simulated conversations. It mirrors session.ts (the id of
// the pending question or step when the person starts talking, "closing" for the goodbye turn) and
// SceneBackdrop (a sticky picture once shown, else that id's picture, else the "done" picture once
// the task is complete, else the current picture).
//   npx tsx tools/scene-walk.ts                 every scene
//   npx tsx tools/scene-walk.ts s72 s84-date    only these (prefix of the file name)
//   --seeds=12   seeds per simulated conversation      --quiet   no picture sequences
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { SITUATION_BY_ID } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { Conversation } from "../src/convo/dialogue";
import type { SituationDef } from "../src/content/types";
import type { SceneFile } from "../src/ui/scenes";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "src/ui/scene-data");
const PICS = path.join(ROOT, "public/scenes");
const args = process.argv.slice(2);
const seeds = Number(args.find((a) => a.startsWith("--seeds="))?.split("=")[1] ?? 12);
const quiet = args.includes("--quiet");
const only = args.filter((a) => !a.startsWith("--"));

let errors = 0, warnings = 0;
const err = (m: string) => { errors++; console.log(`  ✗ ${m}`); };
const warn = (m: string) => { warnings++; console.log(`  ! ${m}`); };

/** Width and height of a WebP picture, from its first chunk (lossy VP8, lossless VP8L or extended
 *  VP8X); null when the file is not a complete WebP file. */
function webpSize(file: string): [number, number] | null {
  const b = readFileSync(file);
  if (b.length < 30 || b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") return null;
  if (b.readUInt32LE(4) + 8 !== b.length) return null; // cut short, or something after the picture
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8 " && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (chunk === "VP8L" && b[20] === 0x2f) {
    const bits = b.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
  }
  if (chunk === "VP8X") return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
  return null;
}

function walk(sit: SituationDef, f: SceneFile, onTurn: (stepId: string | null, pic: string, sim: string, seed: number) => void) {
  for (const sim of sit.sims || []) for (let seed = 1; seed <= seeds; seed++) {
    const defaults: Record<string, string> = { howareyou: "Good, thanks. And you?", closing: "Thank you, bye!", ...((sim as any).auto || {}) };
    const conv = new Conversation(sit, { global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "Mikalauskas", gender: "m" }, visits: seed % 3, seed, memory: {} });
    let kept: string | undefined;
    const show = () => {
      const stepId = conv.ended ? "closing" : conv.pending?.id ?? conv.effectiveStep()?.id ?? null;
      const pic = (kept && f.sticky?.includes(kept) && kept) || (stepId && f.phases[stepId]) || (conv.completed && f.done) || kept || f.start;
      kept = pic;
      onTurn(stepId, pic, sim.name, seed);
    };
    conv.start();
    show();
    const usedAuto = new Set<string>();
    let i = 0, guard = 0;
    while (!conv.ended && guard++ < 30) {
      const waiting = conv.pending?.id ?? conv.step ?? "";
      const key = waiting + ":" + conv.history.length;
      let say: string | undefined;
      if (defaults[waiting] && !usedAuto.has(key) && !(i < sim.turns.length && conv.nlu.parse(sim.turns[i], conv.expectedIntents()).best?.segments.some((s) => conv.expectedIntents().includes(s.intent)))) {
        say = defaults[waiting]; usedAuto.add(key);
      } else if (i < sim.turns.length) say = sim.turns[i++];
      else if (defaults[waiting]) say = defaults[waiting];
      else break;
      conv.input(say);
      show();
      if (conv.completed && i >= sim.turns.length && !conv.pending) break;
    }
  }
}

const files = readdirSync(DATA).filter((n) => n.endsWith(".json")).map((n) => n.slice(0, -5))
  .filter((k) => !only.length || only.some((o) => k.startsWith(o)));
if (!files.length) { console.log("No scene files match."); process.exit(1); }

for (const key of files.sort()) {
  const [sitId, npc] = key.split("@");
  const dir = key.replace("@", "-");
  console.log(`\n${key}`);
  let f: SceneFile;
  try { f = JSON.parse(readFileSync(path.join(DATA, key + ".json"), "utf8")); } catch (e) { err(`not valid JSON: ${(e as Error).message}`); continue; }
  const sit = SITUATION_BY_ID[sitId];
  if (!sit) { err(`no situation "${sitId}"`); continue; }
  if (npc && !NPCS[npc]) err(`no person "${npc}" in npcs.ts`);

  // the file itself
  const images = new Set(f.images ?? []);
  if (!images.size) { err("no images"); continue; }
  if (images.size !== f.images.length) err("an image is listed twice");
  for (const n of images) {
    const file = path.join(PICS, dir, n + ".webp");
    if (!existsSync(file)) { err(`missing picture public/scenes/${dir}/${n}.webp`); continue; }
    const size = webpSize(file);
    if (!size) err(`${dir}/${n}.webp is not a complete WebP picture`);
    else if (size[0] < 1600 || size[0] > 2048 || size[0] / size[1] < 1.7 || size[0] / size[1] > 1.85) warn(`${dir}/${n}.webp is ${size[0]}×${size[1]} (expected 2048 px wide, about 16:9)`);
    if (statSync(file).size > 250_000) warn(`${dir}/${n}.webp is ${Math.round(statSync(file).size / 1000)} kB (expected under 200: WebP quality 80)`);
  }
  if (existsSync(path.join(PICS, dir))) {
    for (const n of readdirSync(path.join(PICS, dir))) {
      if (n.startsWith(".")) continue;
      if (!n.endsWith(".webp")) warn(`public/scenes/${dir}/${n} is not used: the game loads only .webp pictures (see docs/SCENE-ART.md)`);
      else if (!images.has(n.slice(0, -5))) warn(`public/scenes/${dir}/${n} is not listed in images`);
    }
  }
  if (!images.has(f.start)) err(`start "${f.start}" is not in images`);
  if (f.done && !images.has(f.done)) err(`done "${f.done}" is not in images`);
  for (const n of f.sticky ?? []) if (!images.has(n)) err(`sticky "${n}" is not in images`);
  for (const [id, n] of Object.entries(f.phases ?? {})) if (!images.has(n)) err(`phase "${id}" → "${n}" is not in images`);
  if (!Array.isArray(f.focus) || f.focus.length !== 2 || f.focus.some((v) => typeof v !== "number" || v < 0 || v > 100)) err("focus must be [x%, y%]");

  // the simulated conversations
  const shown = new Map<string, number>();
  const seen = new Set<string>();
  const unmapped = new Map<string, Set<string>>();
  const seqs = new Map<string, string[]>();
  walk(sit, f, (stepId, pic, sim, seed) => {
    shown.set(pic, (shown.get(pic) ?? 0) + 1);
    if (stepId) {
      seen.add(stepId);
      if (!f.phases[stepId]) { if (!unmapped.has(stepId)) unmapped.set(stepId, new Set()); unmapped.get(stepId)!.add(pic); }
    }
    if (seed === 1) { if (!seqs.has(sim)) seqs.set(sim, []); seqs.get(sim)!.push(`${stepId ?? "–"}→${pic}`); }
  });
  if (!quiet) for (const [sim, seq] of seqs) console.log(`  · ${sim}: ${seq.join("  ")}`);
  const never = [...images].filter((n) => !shown.has(n));
  console.log(`  pictures shown (turns, ${seeds} seeds): ${[...images].map((n) => `${n} ${shown.get(n) ?? 0}`).join(", ")}`);
  if (never.length) warn(`never shown in the simulated conversations: ${never.join(", ")}`);
  if (unmapped.size) console.log(`  ids without their own picture (keep the current one): ${[...unmapped].map(([id, p]) => `${id} (${[...p].join("/")})`).join(", ")}`);
  const steps = new Set(sit.steps.map((s) => s.id));
  const stray = Object.keys(f.phases).filter((id) => !steps.has(id) && !seen.has(id) && id !== "howareyou" && id !== "closing");
  if (stray.length) warn(`phase ids that are not steps and never came up: ${stray.join(", ")} (typo?)`);
}
console.log(`\n${errors ? "✗" : "✓"} ${errors} errors, ${warnings} warnings`);
process.exit(errors ? 1 : 0);
