import { isRecord } from "./talkProgress";
import type { TalkCue, TalkTrack } from "./talkPlayer";

export function bookCueIndex(cues: readonly TalkCue[], position: number): number {
  let lo = 0;
  let hi = cues.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (cues[mid].start <= position) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** EM's English master uses the same takes, with 13,200 samples between them. */
export function englishBookCues(target: readonly TalkCue[]): TalkCue[] {
  let samples = 0;
  return target.map((cue, i) => {
    const start = samples / 24_000;
    samples += Math.round((cue.end - cue.start) * 24_000);
    const end = samples / 24_000;
    if (i + 1 < target.length) samples += 13_200;
    return { ...cue, start, end };
  });
}

const time = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;

export function bookRateSwitches(cues: readonly TalkCue[], raw: unknown, hash?: string): TalkTrack["rateSwitches"] {
  if (!isRecord(raw) || raw.version !== 1 || !hash || raw.audio_sha256 !== hash ||
      !Array.isArray(raw.sw) || !Array.isArray(raw.speech) || raw.sw.length !== cues.length ||
      raw.speech.length !== cues.length || raw.sw[0] !== 0) return;
  const zones: NonNullable<TalkTrack["rateSwitches"]>[number][] = [];
  let previousEnd = 0;
  for (const [i, cue] of cues.entries()) {
    const span: unknown = raw.speech[i];
    const from: unknown = raw.sw[i];
    if (!Array.isArray(span) || span.length !== 2 || !time(span[0]) || !time(span[1]) || !time(from) ||
        span[0] < cue.start - 0.001 || span[1] > cue.end + 0.001 || span[1] <= span[0] ||
        (i > 0 && (from <= zones[i - 1].from || from < previousEnd + 0.149 || from > span[0] - 0.079))) return;
    previousEnd = span[1];
    zones.push({ from, until: i ? span[0] - 0.079 : 0, language: cue.language });
  }
  return zones;
}
