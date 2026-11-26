import { keepsakeFor, type KeepsakeKind } from "../content/keepsakes";
import { SITUATIONS, SITUATION_BY_ID } from "../content/situations/catalog";
import type { SituationMeta } from "../content/types";
import { STREET_WORDS } from "../game/street/words";
import { sitProgress, type Progress } from "../state/progress";
import { ipaFor, type CardInput } from "../state/cards";

export type PracticedPhrase = Progress["phrases"][string];
export type PhraseEntry = [string, PracticedPhrase];

export function practicedRows(phrases: Progress["phrases"], source?: string): PhraseEntry[] {
  const groups = new Map<string, PhraseEntry[]>();
  const entries = Object.entries(phrases).filter(([, v]) => source === undefined || source === v.sitId);
  for (const entry of entries.sort((a, b) => b[1].last - a[1].last)) {
    const id = entry[1].sitId;
    const group = groups.get(id);
    if (group) group.push(entry);
    else groups.set(id, [entry]);
  }
  return Array.from(groups.values()).flat();
}

export function phraseCard(v: PracticedPhrase): CardInput {
  return { en: v.en, lt: v.lt, ipa: ipaFor(v.en), sentence: { en: v.en, lt: v.lt }, situationId: v.sitId };
}

export function keepsakePockets(progress: Progress) {
  const pockets = new Map<KeepsakeKind, SituationMeta[]>();
  for (const sit of SITUATIONS) {
    if (sitProgress(progress, sit.id).completions < 1) continue;
    const kind = keepsakeFor(sit.id);
    const sources = pockets.get(kind);
    if (sources) sources.push(sit);
    else pockets.set(kind, [sit]);
  }
  return pockets;
}

export function sourceName(situationId: string, stored?: string) {
  // This conversation’s catalog title is the Friday card’s answer, even on older saves.
  if (situationId === "s83-invite-call") return "Pokalbis telefonu";
  const title = Object.hasOwn(SITUATION_BY_ID, situationId) ? SITUATION_BY_ID[situationId].title.lt :
    situationId === "street" ? STREET_WORDS.cards : undefined;
  return [title, stored && stored !== title ? stored : undefined].filter(Boolean).join(" · ");
}

/** Only mark one complete occurrence. A saved "in" must never color the middle of "Friday". */
export function unitRange(sentence: string, part: string) {
  if (!part) return;
  const text = sentence.toLowerCase(), term = part.toLowerCase();
  const word = /[\p{L}\p{N}'’]/u;
  let range: [number, number] | undefined;
  for (let start = text.indexOf(term); start !== -1; start = text.indexOf(term, start + 1)) {
    const end = start + term.length;
    if ((word.test(term[0]) && word.test(text[start - 1] || "")) ||
        (word.test(term.at(-1)!) && word.test(text[end] || ""))) continue;
    if (range) return;
    range = [start, end];
  }
  return range;
}

export function courseCardsUrl(target: string | undefined, back: string | undefined, origin: string) {
  if (target !== "fluentsteps") return;
  try {
    const host = new URL(back || "/", origin);
    if (host.protocol === "https:" || host.protocol === "http:") return new URL("/korteles?mode=mine", host).href;
  } catch { /* A standalone build can have no course host. */ }
}
