// Puerto Colibrí: EDITION=es node --import tsx --import ./tools/edition-hook.mjs tools/convfm/routes.ts
import { playSim } from "../sim-play";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { EDITION } from "../../src/edition";
import { loadValueText } from "../../src/editions/es-lt/tables/loaded";
import { MEXICAN } from "./pc";
import { NPCS } from "../../src/content/npcs";
import { SITUATIONS, loadSituation } from "../../src/content/situations/catalog";
import type { SituationDef } from "../../src/content/types";
import type { RadioScene, SceneInfo, SceneTurn } from "../../src/content/radioScenes/types";
import { packScene, unpackScene, type PackedRadioScene } from "../../src/content/radioScenes/pack";
import { learnerVoices, learnerTake } from "../../src/content/radioScenes/voice";
import { cachedNlu, makeWalker, type Context, type Cue, type Manifest, type Reply, type Run } from "./walk";

const ROOT = resolve(import.meta.dirname, "../..");
const PC = EDITION.id === "es";
const FOLDER = resolve(ROOT, PC ? "src/editions/es/generated/convfm" : "src/generated/convfm");
const STATUS = resolve(ROOT, `.b8/convfm-status-${PC ? "pc" : "mh"}`);
export const POOL_LIMIT = 40;
export const MIN_TURNS = 8;
export const MIN_SECONDS = 20;
const MAX_REPLIES = 48;
const BEAM_WIDTH = 3;
const STORIES_PER_CONTEXT = 3;
const hash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 16);
const round = (n: number) => Math.round(n * 100) / 100;
const normalized = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();

export interface RouteProof { context: Context; replies: string[] }
export interface Discovery {
  stories: { context: Context; cues: Cue[]; refs: string[]; successful: boolean }[];
  errors: Map<string, number>;
  contexts: number;
  diagnostics: Set<string>;
  titleLt?: string;
}

export function readManifest(): Manifest {
  return JSON.parse(readFileSync(resolve(ROOT, PC ? "public/audio-es/manifest.json" : "public/audio-v2/manifest.json"), "utf8"));
}

function contextsFor(sit: SituationDef): Context[] {
  const contexts: Context[] = [];
  for (const visits of [0, 1, 2, 3]) for (const seed of [1, 2]) contexts.push({ visits, seed });
  for (const [sim, definition] of (sit.sims ?? []).entries()) {
    contexts.push({ sim, visits: definition.expect.complete === false ? 1 : 0, seed: definition.seed ?? sim + 1 });
  }
  if (sit.id === "s84-date") {
    return contexts.flatMap((context) => (["sam", "emma"] as const).map((partner) => ({ ...context, partner })));
  }
  return contexts;
}

function parseKey(parse: ReturnType<Run["conv"]["nlu"]["parse"]>["best"]) {
  return JSON.stringify([parse?.yn, parse?.segments.map(({ intent, slots, tags }) => [intent, slots, tags])]);
}

type ScoredReply = { reply: Reply; score: number; semantics: string };

type Search = "quick" | "wide" | "exhaustive";

export function discover(sit: SituationDef, manifest: Manifest, search: Search = "quick"): Discovery {
  const exhaustive = search === "exhaustive";
  const quick = search === "quick";
  const walker = makeWalker(sit, manifest, cachedNlu(sit));
  const stories: Discovery["stories"] = [];
  const errors = new Map<string, number>();
  const signatures = new Set<string>();
  const candidateCache = new Map<string, ScoredReply[]>();
  const authoredContexts = contextsFor(sit);
  const contexts = exhaustive ? authoredContexts.slice(0, 4) : authoredContexts;
  const error = (cause: unknown) => {
    const message = cause instanceof Error ? cause.message : String(cause);
    if (errors.size >= 128 && !errors.has(message)) return;
    errors.set(message, (errors.get(message) ?? 0) + 1);
  };

  for (const context of contexts) {
    const sim = context.sim === undefined ? undefined : sit.sims?.[context.sim];
    const guided = sim ? [...sim.turns, ...Object.values(sim.auto ?? {})].map(normalized) : [];
    let opening: Run;
    try { opening = walker.run(context, []); } catch (cause) { error(cause); continue; }
    let beam = [{ run: opening, score: 0 }];
    const width = exhaustive ? 32 : quick ? (sim ? 1 : 2) : BEAM_WIDTH;
    const goal = exhaustive ? POOL_LIMIT : quick ? 2 : STORIES_PER_CONTEXT;
    const depthLimit = quick ? 32 : MAX_REPLIES;
    let completed = 0;
    let terminals = 0;
    const visited = new Map<string, number>();
    const tieBreaks = new Map<string, string>();
    const tieBreak = (depth: number, ref: string) => {
      const key = `${depth}/${ref}`;
      let tie = tieBreaks.get(key);
      if (!tie) { tie = hash(`${context.seed}/${key}`); tieBreaks.set(key, tie); }
      return tie;
    };
    for (let depth = 0; depth < depthLimit && beam.length && completed < goal && terminals < (exhaustive ? 512 : 48); depth++) {
      const next: typeof beam = [];
      for (const { run, score } of beam) {
        const conv = run.conv;
        const expected = conv.expectedIntents();
        const primary = conv.pending ? [...conv.pending.expects ?? [], ...Object.keys(conv.pending.on ?? {})] : [];
        const hints = conv.support().hints;
        const bank = walker.bank(conv);
        const key = JSON.stringify([context.sim, expected, primary, hints, conv.completed, conv.lastTurn.at(-1)?.npc ?? conv.speakerId, conv.opt.player.gender,
          !!conv.pending?.yes, !!conv.pending?.no, !!conv.effectiveStep()?.yes, !!conv.effectiveStep()?.no]);
        let candidates = candidateCache.get(key);
        if (!candidates) {
          const byText = new Map<string, ScoredReply>();
          for (const reply of bank) {
            if (quick && !hints.includes(reply.group) && !reply.group.startsWith("g_") &&
                !/^(ask|question|back|q_)/.test(reply.group) && !guided.includes(normalized(reply.input))) continue;
            // Returning cards belong to the moments where the game actually offers them.
            if (reply.group.startsWith("return_") && !hints.includes(reply.group)) continue;
            if (reply.group.startsWith("g_") && !hints.includes(reply.group) &&
                !["g_yesno", "g_social", "g_howareyou", "g_clarify"].includes(reply.group)) continue;
            const parse = conv.nlu.parse(reply.input, expected, primary).best;
            if (!parse) continue;
            const intents = parse.segments.map(({ intent }) => intent);
            const fits = intents.some((id) => expected.includes(id)) ||
              !!(parse.yn && (conv.pending?.[parse.yn] || conv.effectiveStep()?.[parse.yn]));
            const own = intents.some((id) => !!sit.handlers[id] && !id.startsWith("g_"));
            const social = intents.some((id) => id === "g_bye" || id === "g_thanks" || id === "g_ok");
            const clarify = intents.some((id) => ["g_repeat", "g_slower", "g_dont_understand", "g_meaning"].includes(id));
            const side = own && /^(ask|question|back|q_)/.test(reply.group);
            if (!fits && !hints.includes(reply.group) && !side && !social && !clarify && !guided.includes(normalized(reply.input))) continue;
            const wording = normalized(reply.input);
            const words = new Set(wording.split(" "));
            const overlap = Math.max(0, ...guided.map((text) => {
              const tokens = text.split(" ");
              return tokens.filter((word) => words.has(word)).length / Math.max(words.size, tokens.length);
            }));
            const guidedScore = overlap * 8;
            const direct = guided.includes(wording) ? 4 : 0;
            const q = Number(fits) * 12 + Number(hints.includes(reply.group)) * 6 + guidedScore + direct -
              Number(clarify) * 4 - Number(social && !conv.completed) * 4;
            const old = byText.get(reply.sentence.say);
            if (!old || q > old.score) byText.set(reply.sentence.say, { reply, score: q, semantics: parseKey(parse) });
          }
          candidates = [...byText.values()].sort((a, b) => b.score - a.score || a.reply.ref.localeCompare(b.reply.ref));
          if (candidateCache.size >= 256) candidateCache.delete(candidateCache.keys().next().value!);
          candidateCache.set(key, candidates);
        }
        if (!candidates.length && expected.length) {
          error(`No recorded learner reply for ${conv.pending?.id ?? conv.step}: ${expected.join(", ")}`);
        }
        // Walk semantic alternatives as well as example wording. Context-dependent rotation spreads slot items.
        const sorted = candidates.map((candidate) => ({
          ...candidate, tie: tieBreak(depth, candidate.reply.ref),
        })).sort((a, b) => b.score - a.score || a.tie.localeCompare(b.tie));
        const semantics = new Map<string, ScoredReply[]>();
        for (const candidate of sorted) {
          const list = semantics.get(candidate.semantics) ?? [];
          list.push(candidate);
          semantics.set(candidate.semantics, list);
        }
        const alternatives = [...semantics.values()];
        const budget = quick ? 10 : 24;
        const selected = exhaustive ? sorted.slice(0, 64) : alternatives.slice(0, budget).map((list) =>
          quick && sim ? list[0] : list[(context.seed + depth) % list.length]);
        for (const { reply, score: candidateScore } of selected) {
          if (run.refs.includes(reply.ref)) continue;
          let result: Run;
          try { result = walker.run(context, [...run.refs, reply.ref]); } catch (cause) { error(cause); continue; }
          const state = result.states.at(-1)!;
          // A repeat/clarification may revisit a state once. Repeating the same recorded example is bounded above.
          if (run.states.filter((previous) => previous === state).length >= 2) continue;
          const progress = state !== run.states.at(-1);
          const q = score + candidateScore / 8 + (progress ? 2 : quick ? -3 : 0) + Number(result.conv.completed) * 4;
          if (result.complete) {
            const signature = JSON.stringify(result.cues.map((cue) => "options" in cue ?
              [cue.lineId, cue.vars, cue.options.map((take) => take.clipKey)] : [cue.turn.to, cue.turn.text]));
            if (!result.conv.completed) continue;
            if (!signatures.has(signature)) {
              signatures.add(signature);
              stories.push({ context, cues: result.cues, refs: result.refs, successful: result.conv.completed });
              terminals++;
              if (result.conv.completed) completed++;
            }
            continue;
          }
          const stateKey = exhaustive ? JSON.stringify(result.refs) : JSON.stringify([state, reply.ref, result.refs.length]);
          if ((visited.get(stateKey) ?? -Infinity) >= q) continue;
          visited.set(stateKey, q);
          next.push({ run: result, score: q });
        }
      }
      // Deduplicate semantic states before the beam, preserving wording in completed route variants.
      const states = new Map<string, typeof next[number]>();
      for (const entry of next.sort((a, b) => b.score - a.score)) {
        const key = exhaustive ? JSON.stringify(entry.run.refs) : entry.run.states.at(-1)!;
        if (!states.has(key)) states.set(key, entry);
      }
      beam = [...states.values()].slice(0, width);
    }
  }
  return { stories, errors, contexts: contexts.length, diagnostics: walker.errors, titleLt: walker.titleLt };
}

function cueOptions(cue: Cue): SceneTurn[] {
  return "options" in cue ? cue.options : [cue.turn];
}

type Story = Discovery["stories"][number];
interface Candidate {
  story: Story;
  turns: SceneTurn[];
  seconds: number;
  signature: string;
  tie: string;
  features: Set<string>;
}

/** Use the authored simulation as a guide, but replay only lines the manifest and both helper layers can supply. */
function scriptedStory(sit: SituationDef, context: Context, walker: ReturnType<typeof makeWalker>): Story | undefined {
  const sim = context.sim === undefined ? undefined : sit.sims?.[context.sim];
  if (!sim?.expect.complete) return;
  const gender = NPCS[context.partner ?? sit.npc].gender === "f" ? "m" : "f";
  try {
    const scripted = playSim(sit, sim, context.seed, { visits: context.visits, gender, datePartner: context.partner, variety: MEXICAN });
    if (!scripted.conv.completed) return;
    const refs: string[] = [];
    for (const turn of scripted.turns) {
      const current = walker.run(context, refs);
      if (current.complete) break;
      const expected = current.conv.expectedIntents();
      const pending = current.conv.pending;
      const primary = pending ? [...pending.expects ?? [], ...Object.keys(pending.on ?? {})] : [];
      const parse = current.conv.nlu.parse(turn.say, expected, primary).best;
      if (!parse) return;
      const bank = walker.bank(current.conv);
      const equivalent = bank.find((reply) => normalized(reply.input) === normalized(turn.say)) ??
        bank.find((reply) => parseKey(current.conv.nlu.parse(reply.input, expected, primary).best) === parseKey(parse));
      if (!equivalent) return;
      refs.push(equivalent.ref);
    }
    const run = walker.run(context, refs);
    if (run.complete && run.conv.completed) return { context, refs, cues: run.cues, successful: true };
  } catch {
    // A simulation only supplies evidence if every turn can be replayed.
  }
}

function happyPath(sit: SituationDef, stories: Story[], manifest: Manifest): Story | undefined {
  const sims = sit.sims ?? [];
  let sim = sims.findIndex((s) => s.expect.complete && /happy path|classic|perfect|full order|accepts/i.test(s.name));
  if (sim < 0) sim = sims.findIndex((s) => s.expect.complete);
  const first = sim >= 0
    ? scriptedStory(sit, { sim, visits: 0, seed: sims[sim].seed ?? sim + 1 }, makeWalker(sit, manifest))
    : [...stories].sort((a, b) => a.cues.length - b.cues.length)[0];
  if (!first) return;
  const seconds = first.cues.reduce((sum, cue) => sum +
    ("options" in cue ? Math.min(...cue.options.map((turn) => turn.duration)) : cue.duration), 0);
  return first.cues.length < MIN_TURNS || round(seconds) < MIN_SECONDS ? first : undefined;
}

function candidateFor(story: Story, ordinal: number, manifest: Manifest): Candidate | null {
  const cardinality = story.cues.reduce((size, cue) => size * BigInt(cueOptions(cue).length), 1n);
  if (BigInt(ordinal) >= cardinality) return null;
  const salt = BigInt("0x" + hash(JSON.stringify([story.context, story.refs])));
  let stride = salt % cardinality || 1n;
  const gcd = (a: bigint, b: bigint): bigint => b ? gcd(b, a % b) : a;
  while (gcd(stride, cardinality) !== 1n) stride++;
  let remainder = (salt + BigInt(ordinal) * stride) % cardinality;
  const turns: SceneTurn[] = [];
  const priorVariants = new Map<string, string>();
  const features = new Set<string>();
  for (const cue of story.cues) {
    const options = cueOptions(cue);
    const index = Number(remainder % BigInt(options.length));
    remainder /= BigInt(options.length);
    let turn = options[index];
    if ("options" in cue) {
      if (cue.reuse !== undefined) turn = turns[cue.reuse];
      else if (options.length > 1 && "clipKey" in turn && turn.clipKey === priorVariants.get(cue.lineId)) {
        turn = options[(index + 1) % options.length];
      }
      if ("clipKey" in turn) {
        priorVariants.set(cue.lineId, turn.clipKey);
        features.add("line/" + cue.lineId);
        features.add("variant/" + cue.lineId + "/" + turn.clipKey);
      }
    } else {
      features.add("reply/" + cue.group + "/" + cue.item);
      if (cue.entity) features.add("slot/" + cue.group + "/" + cue.entity);
    }
    turns.push(turn);
  }
  if (!turns.length || turns[0].speaker === "learner" || turns.at(-1)!.speaker === "learner") return null;
  let seconds = 0;
  const spoken = [];
  for (const turn of turns) {
    const take = "to" in turn ? learnerTake(turn.to, turn.speed, turn.text, manifest) : turn;
    if (!take || !(take.duration > 0)) return null;
    seconds += take.duration;
    spoken.push([turn.speaker, turn.text, take.voice]);
  }
  const signature = JSON.stringify(spoken);
  return { story, turns, seconds: round(seconds), signature, tie: hash(signature), features };
}

/** Greedy coverage across branches, wording and slot items, with a deterministic tie-break. */
function spread(candidates: Candidate[], first: Story | undefined): Candidate[] {
  const frequency = new Map<string, number>();
  for (const candidate of candidates) for (const feature of candidate.features) {
    frequency.set(feature, (frequency.get(feature) ?? 0) + 1);
  }
  const weight = (feature: string) => (feature.startsWith("slot/") ? 4 :
    feature.startsWith("reply/") ? 2 : feature.startsWith("line/") ? 1.5 : 1) / Math.sqrt(frequency.get(feature)!);
  const selected: Candidate[] = [];
  const covered = new Set<string>();
  const remaining = new Set(candidates);
  const choose = (candidate: Candidate) => {
    selected.push(candidate);
    remaining.delete(candidate);
    for (const feature of candidate.features) covered.add(feature);
  };
  const happy = candidates.find((candidate) => candidate.story === first);
  if (happy) choose(happy);
  while (selected.length < POOL_LIMIT && remaining.size) {
    let best: Candidate | undefined;
    let score = -1;
    for (const candidate of remaining) {
      let novelty = 0;
      for (const feature of candidate.features) if (!covered.has(feature)) novelty += weight(feature);
      const value = novelty / Math.sqrt(candidate.features.size);
      if (value > score || (value === score && candidate.tie < best!.tie)) {
        best = candidate; score = value;
      }
    }
    choose(best!);
  }
  return selected;
}

export function compilePool(sit: SituationDef, discovery: Discovery, manifest: Manifest) {
  const stories = discovery.stories.filter((story) => story.successful).sort((a, b) =>
    hash(JSON.stringify([a.context, a.refs])).localeCompare(hash(JSON.stringify([b.context, b.refs]))));
  const short = happyPath(sit, stories, manifest);
  if (short) stories.unshift(short);
  const candidates = new Map<string, Candidate>();
  for (let ordinal = 0; ordinal < POOL_LIMIT && candidates.size < 3200; ordinal++) {
    let unfinished = false;
    for (const story of stories) {
      if (!short && story.cues.length < MIN_TURNS) continue;
      const candidate = candidateFor(story, ordinal, manifest);
      if (!candidate) continue;
      unfinished = true;
      if (!short && candidate.seconds < MIN_SECONDS) continue;
      if (!candidates.has(candidate.signature)) candidates.set(candidate.signature, candidate);
      if (candidates.size >= 3200) break;
    }
    if (!unfinished) break;
  }
  const selected = spread([...candidates.values()], short);
  const turns: SceneTurn[] = [];
  const turnIds = new Map<string, number>();
  const paths: RouteProof[] = [];
  const pathIds = new Map<string, number>();
  const routePaths: number[] = [];
  const routes = selected.map((candidate) => {
    const path = { context: candidate.story.context, replies: candidate.story.refs };
    const key = JSON.stringify(path);
    let pathId = pathIds.get(key);
    if (pathId === undefined) { pathId = paths.length; paths.push(path); pathIds.set(key, pathId); }
    routePaths.push(pathId);
    return candidate.turns.map((turn) => {
      const key = JSON.stringify(turn);
      let id = turnIds.get(key);
      if (id === undefined) { id = turns.length; turns.push(turn); turnIds.set(key, id); }
      return id;
    });
  });
  const shortHappyPath = short ? { context: short.context, replies: short.refs } : undefined;
  const scene: RadioScene = {
    id: sit.id, place: sit.location, title: sit.title, ...(discovery.titleLt && { titleLt: discovery.titleLt }), version: hash(JSON.stringify([turns, routes])),
    turns, routes, paths, routePaths, ...(shortHappyPath ? { shortHappyPath } : {}),
  };
  const lengths = routes.map((route) => route.length);
  const seconds = selected.map((candidate) => candidate.seconds);
  const info: SceneInfo = {
    id: sit.id, place: sit.location, title: sit.title, ...(discovery.titleLt && { titleLt: discovery.titleLt }), poolSize: routes.length,
    minTurns: lengths.length ? Math.min(...lengths) : 0, maxTurns: lengths.length ? Math.max(...lengths) : 0,
    minSeconds: seconds.length ? Math.min(...seconds) : 0, maxSeconds: seconds.length ? Math.max(...seconds) : 0,
    ...(shortHappyPath ? { shortHappyPath: true as const } : {}),
  };
  return { scene, info };
}

export function voiceCounts(scene: RadioScene, manifest: Manifest) {
  let opposite = 0;
  let fallback = 0;
  for (const route of scene.routes) for (const id of route) {
    const turn = scene.turns[id];
    if (!("to" in turn)) continue;
    const take = learnerTake(turn.to, turn.speed, turn.text, manifest);
    if (!take) throw new Error("Unrecorded learner line in " + scene.id);
    if (take.voice === learnerVoices(turn.to)[0]) opposite++;
    else fallback++;
  }
  return { opposite, fallback };
}

export async function writeProgram(only: string[] = []) {
  if (PC && EDITION.helper !== "en") throw new Error("Generate both translations from the SME source. Use EDITION=es without a learner override.");
  if (PC) await loadValueText();
  const manifest = readManifest();
  const folder = FOLDER;
  mkdirSync(folder, { recursive: true });
  mkdirSync(STATUS, { recursive: true });
  for (const meta of SITUATIONS) {
    if (only.length && !only.some((id) => meta.id.startsWith(id))) continue;
    const sit = (await loadSituation(meta.id))!;
    const discovery = discover(sit, manifest);
    let { scene, info } = compilePool(sit, discovery, manifest);
    if (scene.routes.length < POOL_LIMIT) {
      const walker = makeWalker(sit, manifest);
      for (const context of contextsFor(sit)) {
        if (context.sim === undefined) continue;
        const story = scriptedStory(sit, context, walker);
        if (story) discovery.stories.push(story);
      }
      for (const diagnostic of walker.errors) discovery.diagnostics.add(diagnostic);
      ({ scene, info } = compilePool(sit, discovery, manifest));
    }
    if (scene.routes.length < POOL_LIMIT) {
      for (const search of ["wide", "exhaustive"] as const) {
        const extra = discover(sit, manifest, search);
        discovery.stories.push(...extra.stories);
        for (const diagnostic of extra.diagnostics) discovery.diagnostics.add(diagnostic);
        for (const [message, count] of extra.errors) discovery.errors.set(message, (discovery.errors.get(message) ?? 0) + count);
        ({ scene, info } = compilePool(sit, discovery, manifest));
        if (scene.routes.length === POOL_LIMIT) break;
      }
    }
    const data = JSON.stringify(packScene(scene)) + "\n";
    writeFileSync(resolve(folder, sit.id + ".json"), data);
    const failures = [...discovery.errors].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([message, count]) => `${message} (${count})`);
    const missingTranslations = [...discovery.diagnostics].filter((message) => /SME? \(/.test(message)).sort();
    const reason = scene.routes.length ? "" : "No complete recorded path met the length rule. " + failures.join(". ");
    const diagnostics = [...discovery.diagnostics].sort();
    writeFileSync(resolve(STATUS, sit.id + ".json"), JSON.stringify({ info, reason, missingTranslations, diagnostics }));
    console.log(`${sit.id}:${scene.routes.length} · ${info.minTurns}–${info.maxTurns} turns · ${info.minSeconds}–${info.maxSeconds} s · ${Buffer.byteLength(data)} bytes${reason ? " · " + reason : ""}`);
  }
  if (!only.length) summarizeProgram();
}

export function summarizeProgram() {
  const folder = FOLDER;
  const manifest = readManifest();
  const index: SceneInfo[] = [];
  const rows: string[] = [];
  const voices: { opposite: number; fallback: number }[] = [];
  const translationRows: string[] = [];
  let bytes = 0;
  let largest = { id: "", bytes: 0 };
  for (const { id } of SITUATIONS) {
    const status = JSON.parse(readFileSync(resolve(STATUS, id + ".json"), "utf8")) as { info: SceneInfo; reason: string; missingTranslations: string[] };
    const data = readFileSync(resolve(folder, id + ".json"));
    const scene = unpackScene(JSON.parse(data.toString()) as PackedRadioScene);
    bytes += data.byteLength;
    if (data.byteLength > largest.bytes) largest = { id, bytes: data.byteLength };
    index.push(status.info);
    const counts = voiceCounts(scene, manifest);
    voices.push(counts);
    const s = status.info;
    if (status.missingTranslations.length) {
      translationRows.push(`- ${id}`, ...status.missingTranslations.map((message) => `  - ${message}`));
    }
    rows.push(`- ${id} — ${s.poolSize} routes · ${s.minTurns}–${s.maxTurns} turns · ${s.minSeconds}–${s.maxSeconds} s · ${counts.opposite} opposite-sex coach lines · ${counts.fallback} fallbacks.${s.shortHappyPath ? " Short complete happy-path exception." : ""}${status.reason ? " " + status.reason : ""}`);
  }
  const data = JSON.stringify(index) + "\n";
  bytes += Buffer.byteLength(data);
  writeFileSync(resolve(folder, "index.json"), data);
  const total = index.reduce((sum, scene) => sum + scene.poolSize, 0);
  const playable = index.filter((scene) => scene.poolSize > 0).length;
  const short = index.filter((scene) => scene.shortHappyPath).length;
  const opposite = voices.reduce((sum, item) => sum + item.opposite, 0);
  const fallback = voices.reduce((sum, item) => sum + item.fallback, 0);

  const report = [
    `# Conversation FM — ${EDITION.town}`, "",
    `${index.length} situations · ${playable} playable · ${index.length - playable} empty · ${total} routes · ${bytes} bytes.`,
    `The index is ${Buffer.byteLength(data)} bytes. The largest pool is ${largest.id} at ${largest.bytes} bytes.`, "",
    `Pools contain complete exchanges. Routes have at least 8 turns and 20 seconds, with ${short} exceptions for a shorter complete happy path.`,
    "The deterministic selection spreads coverage across authored branches, NPC variants, learner wording and slot items. Each pool is capped at 40. Turn rows, contexts and reply references are shared.",
    "The bounded graph walk explores recorded examples and keeps up to two visits to an identical state, one use per example, and 48 learner replies.", "",
    ...rows, "", "## Learner voices", "",
    `Opposite-sex coach — ${opposite} learner lines. Other-coach fallback — ${fallback} learner lines.`,
    "Counts are line occurrences across all retained routes.", "",
    ...(PC ? ["## Translation coverage", "",
      "Every retained turn has authored SME English and table-backed SM Lithuanian. Both layers use the same Mexican Spanish clip.",
      ...(translationRows.length ? ["", "The generator excluded recorded lines with the following missing translations.", "", ...translationRows] : []),
    ] : []),
  ];
  writeFileSync(resolve(ROOT, `.b8/CONVFM-REPORT-${PC ? "pc" : "mh"}.md`), report.join("\n") + "\n");
  console.log(`${total} routes · ${bytes} bytes · largest ${largest.id} (${largest.bytes} bytes)`);
  console.log(`Learner lines — ${opposite} opposite-sex · ${fallback} fallback`);

}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.includes("--report")) summarizeProgram();
  else await writeProgram(args);
}
