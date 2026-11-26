import { audioKey, withoutAddressedNames } from "../../src/audio-key";
import { GLOBAL } from "../../src/content/global";
import { NPCS } from "../../src/content/npcs";
import { learnerTake, sceneNpcVoice } from "../../src/content/radioScenes/voice";
import type { LearnerSceneTurn, NpcSceneTurn } from "../../src/content/radioScenes/types";
import type { SentSrc, SituationDef } from "../../src/content/types";
import { EDITION } from "../../src/edition";
import { addressInformal, compose, placeholders, type ComposeOpts, type Sentence, type Vars } from "../../src/convo/compose";
import { buildNlu, Conversation, type SpokenLine, type TurnOut } from "../../src/convo/dialogue";
import type { Nlu, NluResult } from "../../src/convo/nlu";
import { hintBinding } from "../../src/convo/target";
import { pcTranslations, MEXICAN } from "./pc";
import { EXAMPLE_PLAYER, exampleVars } from "../../src/convo/suggest";

export type Manifest = Readonly<Record<string, number>>;

export interface Context {
  seed: number;
  visits: number;
  sim?: number;
  partner?: "sam" | "emma";
}

export interface Reply {
  ref: string;
  group: string;
  item: number;
  entity?: string;
  sentence: Sentence;
  turn: LearnerSceneTurn;
  duration: number;
  input: string;
}

export interface NpcCue {
  options: NpcSceneTurn[];
  lineId: string;
  vars: Record<string, unknown>;
  /** Replays retain the exact earlier recorded variant. */
  reuse?: number;
}

export type Cue = NpcCue | Reply;
export interface Run {
  conv: Conversation;
  cues: Cue[];
  refs: string[];
  states: string[];
  complete: boolean;
}

const valid = (sentence: Sentence) => !!sentence.say.trim() && !!sentence.nat.trim() &&
  !/[{}]/.test(sentence.say + sentence.nat) &&
  !/\s[.,!?]/.test(sentence.say);

export function cachedNlu(sit: SituationDef): Map<string, Nlu> {
  const nlu = buildNlu(sit, GLOBAL, NPCS);
  const original = nlu.parse.bind(nlu);
  const cache = new Map<string, NluResult>();
  nlu.parse = (text, expected = [], primary = []) => {
    const key = JSON.stringify([text, expected, primary]);
    let result = cache.get(key);
    if (!result) {
      result = original(text, expected, primary);
      if (cache.size >= 2048) cache.delete(cache.keys().next().value!);
      cache.set(key, { ...result, alternatives: [] });
    }
    // Conversation marks handled segments. Never return the cached mutable slots to it.
    return {
      ...result,
      best: result.best && { ...result.best, segments: result.best.segments.map((s) => ({ ...s, slots: structuredClone(s.slots) })) },
    };
  };
  return new Map([[sit.id, nlu]]);
}

export function stateOf(conv: Conversation): string {
  return JSON.stringify([conv.s, conv.step, conv.pending?.id, conv.completed, conv.ended, [...conv.twists]]);
}

/** A tool-only adapter. All state transitions and pending questions remain in the game's Conversation. */
export function makeWalker(sit: SituationDef, manifest: Manifest, sharedNlu = cachedNlu(sit)) {
  const banks = new Map<string, Reply[]>();
  const takeCache = new Map<string, NpcSceneTurn[]>();
  const spanish = EDITION.id === "es";
  const pc = spanish && EDITION.helper === "en" ? pcTranslations(sit) : undefined;
  const errors = new Set<string>();
  const problem = (cause: unknown) => errors.add(cause instanceof Error ? cause.message : String(cause));

  function render(src: SentSrc, vars: Vars, opts: ComposeOpts): Sentence | undefined {
    const { values, entities } = placeholders(src);
    if ([...values, ...entities].some((name) => vars[name] == null)) return;
    try {
      const sentence = compose(src, vars, opts);
      if (valid(sentence)) return sentence;
      if (!sentence.nat.trim() || /[{}]/.test(sentence.nat)) {
        problem(`Missing or incomplete ${pc ? "SME (English)" : "Lithuanian"} sentence: ${src.en}`);
      }
    } catch (cause) {
      problem(cause);
    }
  }

  function translations(src: SentSrc, vars: Vars, opts: ComposeOpts, shared: boolean, sentence: Sentence) {
    if (!pc) return { translationLt: undefined };
    try {
      const translationLt = pc.lithuanian(src, vars, opts, shared);
      if (!valid({ ...sentence, nat: translationLt })) throw new Error(`Incomplete SM (Lithuanian) sentence: ${src.en}`);
      return { translationLt };
    } catch (cause) {
      problem(cause);
    }
  }

  function bank(conv: Conversation): Reply[] {
    const to = conv.lastTurn.at(-1)?.npc ?? conv.speakerId;
    const exampleGender = conv.opt.player.gender;
    const bankKey = `${to}/${exampleGender}`;
    const cached = banks.get(bankKey);
    if (cached) return cached;
    const npc = NPCS[to];
    const replies: Reply[] = [];
    for (const [group, hint] of Object.entries({ ...GLOBAL.hints, ...sit.hints })) {
      for (const [item, entry] of hint.items.entries()) {
        const pool = hint.slot ? (sit.entities?.[hint.slot] ?? []).filter((e) => !entry.only || entry.only(e)) : [];
        const entities = placeholders(entry.s).entities.length ? pool : [undefined];
        for (const entity of entities) {
          const vars = { ...exampleVars(), X: entity ? hintBinding(entity, entity.id) : undefined };
          const opts = {
            look: (id: string) => entity?.id === id ? entity : conv.look(id),
            addressee: exampleGender, speaker: npc.gender, formal: !addressInformal(npc, MEXICAN), variety: MEXICAN,
          };
          const sentence = render(entry.s, vars, opts);
          if (!sentence) continue;
          const take = learnerTake(to, 1, sentence.say, manifest);
          if (!take) continue;
          const meaning = translations(entry.s, vars, opts, !sit.hints[group], sentence);
          if (!meaning) continue;
          const { translationLt } = meaning;
          const ref = `${group}/${item}${entity ? "/" + entity.id : ""}`;
          replies.push({
            ref, group, item, entity: entity?.id, sentence, duration: take.duration,
            input: spanish ? sentence.say : sentence.en,
            turn: { speaker: "learner", to, text: sentence.say, translation: sentence.nat, speed: 1,
              ...(translationLt && { translationLt }) },
          });
        }
      }
    }
    banks.set(bankKey, replies);
    return replies;
  }

  function takes(conv: Conversation, line: SpokenLine, variants: boolean): NpcSceneTurn[] {
    const cacheKey = JSON.stringify([conv.opt.player.gender, line.npc, line.lineId, line.vars, variants ? null : line.variant]);
    const cached = takeCache.get(cacheKey);
    if (cached) return cached;
    const npc = NPCS[line.npc];
    const voice = sceneNpcVoice(npc);
    const speed = npc.speed ?? 1;
    const sources = sit.lines[line.lineId] ?? GLOBAL.lines[line.lineId];
    const options: NpcSceneTurn[] = [];
    const indices = variants ? [...sources.keys()] : [line.variant];
    for (const index of indices) {
      const opts = {
        look: conv.look, addressee: conv.opt.player.gender, speaker: npc.gender,
        formal: !addressInformal(npc, MEXICAN), variety: MEXICAN,
      };
      const source = sources[index];
      const sentence = render(source, line.vars, opts);
      if (!sentence) continue;
      const names = Object.values(EXAMPLE_PLAYER);
      const alt = withoutAddressedNames(sentence.say, names);
      const text = manifest[audioKey(voice, speed, sentence.say)] ? sentence.say : alt ?? sentence.say;
      const clipKey = audioKey(voice, speed, text);
      const duration = manifest[clipKey];
      if (!(duration > 0)) {
        problem(`Missing NPC clip ${line.npc}/${line.lineId}: ${text}`);
        continue;
      }
      const meaning = translations(source, line.vars, opts, !sit.lines[line.lineId], sentence);
      if (!meaning) continue;
      const { translationLt } = meaning;
      const stripAddress = (value: string, addressed: string[]) =>
        text === sentence.say ? value : withoutAddressedNames(value, addressed) ?? value;
      const translation = stripAddress(sentence.nat, spanish ? names : ["Tomai", "Tomas", "Mikalauskai", "Mikalauskas"]);
      options.push({ speaker: npc.id, voice, speed, text, translation, clipKey, duration,
        ...(translationLt && { translationLt: stripAddress(translationLt, names) }) });
    }
    const unique = [...new Map(options.map((turn) => [turn.clipKey, turn])).values()];
    if (takeCache.size >= 2048) takeCache.delete(takeCache.keys().next().value!);
    takeCache.set(cacheKey, unique);
    return unique;
  }

  function run(context: Context, refs: readonly string[]): Run {
    const sim = context.sim === undefined ? undefined : sit.sims?.[context.sim];
    if (context.sim !== undefined && !sim) throw new Error("Unknown authored simulation");
    const def = sim?.setup ? { ...sit, init: (ctx: Parameters<NonNullable<SituationDef["init"]>>[0]) => {
      sit.init?.(ctx); sim.setup!(ctx.s);
    } } : sit;
    const exampleGender = NPCS[context.partner ?? sit.npc].gender === "f" ? "m" : "f";
    const conv = new Conversation(def, {
      global: GLOBAL, npcs: NPCS, player: { ...EXAMPLE_PLAYER, gender: exampleGender, datePartner: context.partner },
      visits: context.visits, seed: context.seed, memory: {}, sharedNlu, variety: MEXICAN,
    });
    const options = new WeakMap<SpokenLine, NpcSceneTurn[]>();
    const access = conv as unknown as { out: TurnOut };
    const originalSay = conv.say.bind(conv);
    const originalPush = conv.pushLine.bind(conv);
    let randomVariant = false;
    conv.say = (lineId, vars) => {
      randomVariant = true;
      try { originalSay(lineId, vars); } finally { randomVariant = false; }
    };
    conv.pushLine = (lineId, variant, vars, slow) => {
      originalPush(lineId, variant, vars, slow);
      const line = access.out.lines.at(-1)!;
      options.set(line, takes(conv, line, randomVariant));
    };
    const cues: Cue[] = [];
    const states: string[] = [];
    const collect = (out: TurnOut) => {
      if (!out.understood) throw new Error("The engine did not understand the recorded example");
      for (const line of out.lines) {
        let available = options.get(line);
        let reuse: number | undefined;
        if (!available) {
          const prior = cues.findLastIndex((cue) => "options" in cue && cue.lineId === line.lineId &&
            cue.options[0]?.speaker === line.npc && JSON.stringify(cue.vars) === JSON.stringify(line.vars));
          if (prior >= 0) {
            reuse = prior;
            available = (cues[prior] as NpcCue).options;
          } else available = takes(conv, line, false);
        }
        if (!available.length) throw new Error(`No complete NPC take ${line.npc}/${line.lineId}: ${line.sentence.say}`);
        cues.push({ options: available, lineId: line.lineId, vars: line.vars, reuse });
      }
      states.push(stateOf(conv));
    };
    collect(conv.start());
    for (const ref of refs) {
      if (conv.ended) throw new Error("Reply after the authored ending");
      const reply = bank(conv).find((candidate) => candidate.ref === ref);
      if (!reply) throw new Error(`Missing learner clip or authored example ${ref}`);
      cues.push(reply);
      collect(conv.input(reply.input));
    }
    const complete = conv.ended || (conv.completed && !!conv.s.__finished && (!conv.pending || conv.pending.id === "closing"));
    return { conv, cues, refs: [...refs], states, complete };
  }
  return { bank, run, errors, titleLt: pc?.titleLt };
}
