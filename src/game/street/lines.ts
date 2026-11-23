import { variety, type Sentence } from "../../convo/compose";
import { ambientVoice, VOICES_V2 } from "../../content/voices";
import type { ByCast, StreetLine } from "./types";

export type Gender = "m" | "f";
export const STREET_GENDER = /\{(m|nm):([^{}|]*)\|(f|nf):([^{}|]*)\}/g;

export function streetText(text: string, learner: Gender, speaker: Gender) {
  return text.replace(STREET_GENDER, (match, a, male, b, female) => {
    if ((a === "m") !== (b === "f")) return match;
    return (a === "m" ? learner : speaker) === "m" ? male : female;
  });
}

export function byCast<T>(value: ByCast<T> | undefined, id: string): T | undefined {
  return value && typeof value === "object" && "byCast" in value ? value.byCast[id] : value;
}

/** The kit reads sentence.say for its existing clip lookup, and sentence.nat for the translation. */
export function resolveStreetLine(line: StreetLine, learner: Gender, speaker: Gender, spanish = variety()): Sentence {
  const text = spanish === "spain" ? line.spain ?? line.neutral ?? line.en : spanish === "neutral" ? line.neutral ?? line.en : line.en;
  const en = streetText(text, learner, speaker);
  return { units: [], en, say: en, nat: streetText(line.lt, learner, speaker) };
}

export function streetVoice(gender: Gender, voice?: string, v2 = VOICES_V2, hasRecording?: (id: string) => boolean) {
  const passerby = ambientVoice(gender, v2);
  if (!voice || !v2) return passerby;
  // Dedicated street voices share the passers-by's edition and accent prefix.
  const dedicated = passerby.replace(/amb_[fm]$/, voice);
  return hasRecording && !hasRecording(dedicated) && hasRecording(passerby) ? passerby : dedicated;
}

export function streetSpeechTexts(line: StreetLine, learner: Gender, speaker: Gender) {
  return [line.en, line.neutral, line.spain].flatMap((text) => text ? [streetText(text, learner, speaker)] : []);
}
