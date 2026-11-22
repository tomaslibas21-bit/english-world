import { NPCS } from "../../content/npcs";
import { ROAD_FUNCTION_WORDS as functionWords } from "../../content/road-vocabulary";
import { loadSituation, SITUATIONS } from "../../content/situations/catalog";
import type { SentSrc, SituationDef } from "../../content/types";
import { coachVoice, npcVoice } from "../../content/voices";
import { compose, type Sentence } from "../../convo/compose";
import { EDITION } from "../../edition";
import type { Card } from "../../state/cards";
import { sitProgress, type Progress } from "../../state/progress";
import { gapLabel, RoadWordForms } from "./wordForms";
import { entityKinds, hearKind, kindOf, wordKey as key, type WordKind } from "./wordKinds";

export type Clip = { say: string; voice: string; speed: number; male: boolean };
type Choice = { en: string; lt: string; kind?: WordKind; gapKind?: WordKind; hearLt?: string | null; gapEn?: string };
export type Word = Choice & { situation: string; clip: Clip; saved?: boolean; inContext?: boolean };
export type Gap = { word: Word; sentence: Sentence; full: Sentence; clip: Clip };
export type Pool = { words: Word[]; gaps: Gap[]; borrowed?: Choice[]; gapChoices?: Choice[] };
export type Prompt = { word: Word; options: string[]; right: number; gap?: Gap };
type Voice = Omit<Clip, "say">;
type HasClip = (voice: string, speed: number, text: string) => boolean;

export const starterIds = [...SITUATIONS]
  .sort((a, b) => a.chapter - b.chapter || a.order - b.order)
  .slice(0, 3).map(({ id }) => id);

export function wordSources(progress: Progress) {
  const finished = SITUATIONS.filter(({ id }) => sitProgress(progress, id).completions > 0).map(({ id }) => id);
  return { finished, ids: finished.length ? finished : starterIds };
}

const bare = (s: string) => s.trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
const length = (s: string) => s.trim().split(/\s+/).length;
const spanish = EDITION.id === "es";
const short = (en: string, lt: string) => !!lt && /^[\p{L}][\p{L}'’ -]*$/u.test(en) && length(en) <= 2;

const coach = (gender: "f" | "m"): Voice => ({ voice: coachVoice(gender), speed: 1, male: gender === "m" });

export function makeGap(full: Sentence, index: number): Sentence {
  const units = full.units.map((unit, i) => i === index
    ? { en: `____${unit.en.match(/[^\p{L}\p{N}]+$/u)?.[0] ?? ""}`, lt: unit.lt }
    : { en: unit.en, lt: unit.lt });
  return { units, en: units.map(({ en }) => en).join(" "), say: "", nat: "" };
}

export function buildPool(defs: SituationDef[], progress: Progress, cards: readonly Card[], hasClip: HasClip): Pool {
  const { words, gaps, gapChoices } = collectWords(defs, progress, cards, hasClip);
  return gapChoices.length ? { words, gaps, gapChoices } : { words, gaps };
}

function collectWords(defs: SituationDef[], progress: Progress, cards: readonly Card[], hasClip: HasClip, choicesOnly = false) {
  const words = new Map<string, Word>(), gaps = new Map<string, Gap>(), borrowed = new Map<string, Choice>();
  const gapChoices = new Map<string, Choice>();
  const sources = wordSources(progress), finished = new Set(sources.finished), primary = new Set(sources.ids);
  const npcVoices = Object.values(NPCS).map((n) => ({ voice: npcVoice(n), speed: n.speed ?? 1, male: n.gender === "m" }));
  const gender = progress.profile?.gender ?? "f";
  const playerNames = progress.profile ? [progress.profile.name, progress.profile.surname] : [];
  const forms = new RoadWordForms(defs.flatMap((def) => Object.values(def.entities ?? {}).flat()), playerNames);
  const choiceFor = (en: string, lt: string, kinds?: Map<string, WordKind>, inContext = false): Choice => {
    const kind = hearKind(en, lt, kindOf(en, false, kinds));
    return { en, lt, kind, hearLt: forms.hear(en, lt, kind, inContext) };
  };
  const addBorrowed = (text: string, gloss: string, kinds?: Map<string, WordKind>, inContext = false) => {
    const en = bare(text), lt = bare(gloss);
    if (!short(en, lt)) return;
    const choice = choiceFor(en, lt, kinds, inContext);
    if (choice.kind && choice.hearLt) borrowed.set(`${key(en)}|${key(lt)}`, choice);
  };
  const coaches = [coach(gender), coach(gender === "f" ? "m" : "f")];
  const rec = (say: string, voices: Voice[]): Clip | undefined => {
    const match = voices.find(({ voice, speed }) => hasClip(voice, speed, say));
    return match && { ...match, say };
  };
  const recordings = new Map<string, Clip | undefined>();
  const standalone = (en: string, voices: Voice[]) => {
    const capital = en[0].toUpperCase() + en.slice(1);
    const cacheKey = `${voices[0]?.voice}|${en}`;
    if (!recordings.has(cacheKey)) {
      const candidates = [...new Set([capital, en, ...[".", "!", "?"].map((p) => capital + p),
        ...(spanish ? [`¡${capital}!`, `¿${capital}?`] : [])])];
      let match: Clip | undefined;
      for (const cast of [voices, npcVoices]) {
        for (const text of candidates) {
          match = rec(text, cast);
          if (match) break;
        }
        if (match) break;
      }
      recordings.set(cacheKey, match);
    }
    return recordings.get(cacheKey);
  };
  for (const def of defs) {
    const situation = def.id;
    const voices = [def.npc, ...(def.npcs ?? [])].flatMap((id) => {
      const n = NPCS[id];
      return n ? [{ voice: npcVoice(n), speed: n.speed ?? 1, male: n.gender === "m" }] : [];
    });
    const allVoices = [...voices, ...coaches];
    const kinds = entityKinds(def);
    const add = (text: string, gloss: string, saved = false, exact?: Clip, inContext = false, context?: { previous?: string; next?: string }) => {
      const en = bare(text), lt = bare(gloss);
      if (!short(en, lt)) return;
      const clip = exact ?? standalone(en, allVoices);
      if (!clip) return;
      const id = `${situation}|${key(en)}|${key(lt)}`;
      const previous = words.get(id);
      if (!previous || saved || (previous.inContext && !inContext)) {
        const gapKind = kindOf(en, true, kinds, context);
        words.set(id, { ...choiceFor(en, lt, kinds, inContext), situation, clip, saved, inContext, gapKind, gapEn: forms.gap(en, gapKind) });
      }
      const word = words.get(id)!;
      if (context && !word.gapKind) word.gapKind = kindOf(en, true, kinds, context);
      return word;
    };
    if (!choicesOnly) {
      for (const card of cards) if (card.situationId === situation) add(card.en, card.lt, true);
      for (const phrase of Object.values(progress.phrases)) if (phrase.sitId === situation) add(phrase.en, phrase.lt, true);
    }

    const addSentence = (sentence: Sentence, cast: Voice[]) => {
      if (!sentence.say || /[{}]/.test(sentence.en) || sentence.units.some(({ en }) => !en)) return;
      const gloss = sentence.nat || sentence.units.map(({ lt }) => lt).join(" ");
      if (choicesOnly) {
        addBorrowed(sentence.en, gloss, kinds);
        for (const unit of sentence.units) {
          if (!functionWords.has(key(unit.en))) addBorrowed(unit.en, unit.lt, kinds, true);
        }
        return;
      }
      const clip = rec(sentence.say, cast);
      if (clip) add(sentence.en, gloss, false, clip);
      for (const [i, unit] of sentence.units.entries()) {
        if (functionWords.has(key(unit.en))) continue;
        const context = {
          previous: sentence.units[i - 1]?.en, next: sentence.units[i + 1]?.en,
        };
        let word = add(unit.en, unit.lt, false, undefined, true, context);
        if (spanish && finished.has(situation)) {
          const en = bare(unit.en), lt = bare(unit.lt);
          const gapKind = kindOf(en, true, kinds, context);
          if (gapKind && lt && /^[\p{L}]+$/u.test(en)) {
            const choice = { en, lt, gapKind, gapEn: forms.gap(en, gapKind) };
            gapChoices.set(`${key(en)}|${key(lt)}`, choice);
            if (clip) word = { ...choice, situation, clip: word?.clip ?? clip };
          }
        }
        if (finished.has(situation) && clip && word && length(word.en) === 1 && !word.en.includes("-")
            && sentence.units.length >= 4 && sentence.units.length <= 13
            && sentence.units.filter(({ en }) => key(en) === key(word.en)).length === 1) {
          const gapKey = `${situation}|${key(sentence.en)}|${i}`;
          if (!gaps.has(gapKey)) gaps.set(gapKey, { word, sentence: makeGap(sentence, i), full: sentence, clip });
        }
      }
    };
    const entitiesById = new Map(Object.values(def.entities ?? {}).flat().map((entity) => [entity.id, entity]));
    const authored = (src: SentSrc, cast: Voice[], learner: boolean, vars = {}) => {
      const npc = NPCS[def.npc];
      const other = npc?.gender ?? "f";
      try {
        addSentence(compose(src, { name: progress.profile?.name ?? EDITION.simPlayer.name, ...vars }, {
          look: (id) => entitiesById.get(id), addressee: learner ? other : gender,
          speaker: learner ? gender : other, formal: !npc?.informal,
        }), cast);
      } catch { /* An authored line may require values supplied only in its dialogue. */ }
    };
    if (!spanish || choicesOnly || primary.has(situation)) {
      for (const [id, lines] of Object.entries(def.lines)) {
        if (/^(rd|tx)_/.test(id)) continue;
        for (const line of lines) authored(line, voices, false);
      }
      for (const group of Object.values(def.hints)) for (const item of group.items) {
        const entities = group.slot ? def.entities?.[group.slot] ?? [] : [];
        if (!entities.length) authored(item.s, coaches, true);
        else for (const entity of entities) if (!item.only || item.only(entity)) authored(item.s, coaches, true, { X: entity.id });
      }
    }
    for (const card of cards) {
      if (choicesOnly || (!spanish && !finished.has(situation)) || card.situationId !== situation) continue;
      const clip = rec(card.sentence.say ?? card.sentence.en, allVoices);
      if (!clip) continue;
      add(card.sentence.en, card.sentence.lt, true, clip);
    }
  }
  if (choicesOnly) {
    const kinds = new Map(defs.map((def) => [def.id, entityKinds(def)]));
    for (const card of cards) addBorrowed(card.en, card.lt, kinds.get(card.situationId));
    for (const phrase of Object.values(progress.phrases)) addBorrowed(phrase.en, phrase.lt, kinds.get(phrase.sitId));
  }
  return { words: [...words.values()], gaps: [...gaps.values()], borrowed: [...borrowed.values()], gapChoices: [...gapChoices.values()] };
}

export async function loadPool(progress: Progress, cards: readonly Card[], hasClip: HasClip): Promise<Pool> {
  const { ids, finished } = wordSources(progress);
  const definitions = async (sources: string[]) => {
    const results = await Promise.allSettled(sources.map(loadSituation));
    return results.flatMap((r) => r.status === "fulfilled" && r.value ? [r.value] : []);
  };
  // Prefer recent conversations and places represented in the learner's cards.
  const saved = new Set([...cards.map((card) => card.situationId), ...Object.values(progress.phrases).map((phrase) => phrase.sitId)]);
  const ordered = finished.length ? [...ids].sort((a, b) => Number(saved.has(b)) - Number(saved.has(a))
    || (sitProgress(progress, b).lastPlayed ?? 0) - (sitProgress(progress, a).lastPlayed ?? 0)) : [...ids];
  if (spanish) for (const sit of saved) if (!ordered.includes(sit)) ordered.push(sit);
  const [primary, starters] = await Promise.all([definitions(ordered.slice(0, 8)), definitions(starterIds)]);
  const first = buildPool(primary, progress, cards, hasClip);
  const { borrowed } = collectWords(starters, progress, cards, hasClip, true);
  const pool = { ...first, borrowed };
  if (ordered.length <= 8) return pool;
  const pick = makePicker(pool, () => 0);
  if (pick(0) && (!spanish || !finished.length || pick(7)?.gap)) return pool;
  const rest = buildPool(await definitions(ordered.slice(8)), progress, cards, hasClip);
  return { words: [...first.words, ...rest.words], gaps: [...first.gaps, ...rest.gaps], borrowed,
    gapChoices: [...(first.gapChoices ?? []), ...(rest.gapChoices ?? [])] };
}

function shuffle<T>(values: readonly T[], rng: () => number): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function meanings(words: readonly Choice[]) {
  const byEnglish = new Map<string, Set<string>>();
  for (const word of words) {
    const en = key(word.en);
    let lt = byEnglish.get(en);
    if (!lt) byEnglish.set(en, lt = new Set());
    lt.add(key(word.lt));
    if (word.hearLt) lt.add(key(word.hearLt));
  }
  return byEnglish;
}

const listenGloss = (word: Choice) => {
  const gloss = word.hearLt === undefined ? word.lt : word.hearLt;
  if (!gloss) return gloss;
  if (length(gloss) === 1) return gloss.toLocaleLowerCase(EDITION.helper);
  if (/^\p{Lu}/u.test(word.lt) && length(word.lt) > 1) return gloss[0].toLocaleUpperCase(EDITION.helper) + gloss.slice(1);
  return gloss;
};
const matchKind = (word: Choice, gap: boolean) => gap ? word.gapKind ?? kindOf(word.en, true)
  : hearKind(word.en, listenGloss(word) ?? word.lt, word.kind);

export function distractors<T extends Choice>(word: Choice, words: readonly T[], gap: boolean, byEnglish = meanings(words),
  owned?: ReadonlySet<Choice>) {
  const answer = key(word.en), meaning = gap ? word.lt : listenGloss(word), kind = matchKind(word, gap);
  if (!kind || !meaning) return [];
  const gloss = key(meaning);
  const en = new Set([answer]), lt = new Set([gloss]);
  const knownGlosses = byEnglish.get(answer);
  const candidates = words.flatMap((other) => {
    const otherGloss = gap ? other.lt : listenGloss(other);
    if (!otherGloss) return [];
    const e = key(other.en), l = key(otherGloss), otherKind = matchKind(other, gap);
    if (e === answer || l === gloss || knownGlosses?.has(l) || length(e) !== length(answer) || otherKind?.role !== kind.role) return [];
    const enDiff = Math.abs(e.length - answer.length), ltDiff = Math.abs(l.length - gloss.length);
    if (enDiff > Math.max(5, answer.length * 0.56)) return [];
    if (gap && (functionWords.has(e) || [...(byEnglish.get(e) ?? [])].some((alias) => knownGlosses?.has(alias)))) return [];
    const sameTopic = !kind.topic || kind.topic === otherKind.topic;
    const borrowed = !!owned && !owned.has(other);
    const rank = Number(!sameTopic) * 32 + enDiff + (gap ? 0 : ltDiff * 0.6);
    return [{ other, e, l, rank, borrowed }];
  });
  return candidates.sort((a, b) => Number(a.borrowed) - Number(b.borrowed) || a.rank - b.rank).flatMap(({ other, e, l }) => {
    if (en.has(e) || lt.has(l)) return [];
    en.add(e); lt.add(l);
    return [other];
  });
}

export function makePicker(pool: Pool, rng = Math.random) {
  const heard = new Set<string>(), gapped = new Set<string>();
  const allHear = [...pool.words, ...(pool.borrowed ?? [])];
  const gapWords = [...pool.words, ...(pool.gapChoices ?? [])];
  const hearMeanings = meanings(allHear), gapMeanings = meanings(gapWords);
  const owned = new Set(pool.words);
  const hearChoices = (word: Word) => distractors(word, allHear, false, hearMeanings, owned).slice(0, 2);
  const take = <T,>(items: T[], history: Set<string>, identify: (item: T) => string, prefer?: (item: T) => boolean) => {
    if (!items.length) return undefined;
    let fresh = items.filter((item) => !history.has(identify(item)));
    if (!fresh.length) { history.clear(); fresh = items; }
    const preferred = prefer ? fresh.filter(prefer) : [];
    const item = (preferred.length ? preferred : fresh)[Math.floor(rng() * (preferred.length || fresh.length))];
    history.add(identify(item));
    return item;
  };
  const standalone = pool.words.filter((word) => !word.inContext);
  const hear = standalone.filter((word) => hearChoices(word).length === 2);
  // A finished conversation can have very few short recordings compared with the number of voiced sentences.
  const shortListen = hear.length ? hear : pool.words.filter((word) => hearChoices(word).length === 2);
  const gapOptions = (gap: Gap) => {
    const context = new Set(gap.full.units.map((unit) => key(unit.en)));
    context.delete(key(gap.word.en));
    return gapWords.filter((word) => !context.has(key(word.en)));
  };
  const gaps = pool.gaps.filter((gap) => distractors(gap.word, gapOptions(gap), true, gapMeanings).length >= 2);
  return (index: number): Prompt | undefined => {
    const gap = index >= 7 ? take(gaps, gapped, (g) => key(g.full.en)) : undefined;
    const word = gap?.word ?? take(shortListen, heard, (w) => key(w.en), (w) => !!w.saved);
    if (!word) return undefined;
    const answer = gap ? word.gapEn ?? gapLabel(word.en) : listenGloss(word)!;
    const labels = gap
      ? distractors(word, gapOptions(gap), true, gapMeanings).slice(0, 2).map((w) => w.gapEn ?? gapLabel(w.en))
      : hearChoices(word).map((w) => listenGloss(w)!);
    const options = shuffle([answer, ...labels], rng);
    return { word: gap ? word : { ...word, lt: answer }, options, right: options.indexOf(answer), gap };
  };
}
