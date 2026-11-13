// Which line of a song shows at a moment, and how far the singing is in it. The clocks are the course's song
// player's (fluent-steps src/lib/songs/player-engine.ts, buildTimeline and the word sweep): a line comes in a little
// before its first word, stays until the next one, and leaves in a long break between lines and after the last one.
import type { SongLine } from "./songs";

/** A line comes in this long before it is sung (PRE), and no sooner than this after the line before (D). */
const PRE = 0.46, D = 0.62;
/** A word lights up this much before its start. */
const LEAD = 0.05;
/** A silence between lines longer than this is a break: the line leaves soon after its last word. */
const GAP_T = 5.0, GAP_OUT = 1.9;
/** The last line stays this long after its last word. */
const LAST_OUT = 2.1;

export interface Timeline {
  lines: SongLine[];
  /** when each line comes in, and when it goes */
  from: number[];
  to: number[];
}

export function buildTimeline(lines: SongLine[]): Timeline {
  const n = lines.length, from = new Array<number>(n), to = new Array<number>(n);
  for (let i = 0; i < n; i++) from[i] = i === 0 ? lines[0].s - 1.05 : Math.max(lines[i].s - PRE, from[i - 1] + D);
  for (let i = 0; i < n; i++) {
    if (i === n - 1) to[i] = lines[i].e + LAST_OUT;
    else to[i] = lines[i + 1].s - lines[i].e > GAP_T ? Math.min(lines[i].e + GAP_OUT, from[i + 1]) : from[i + 1];
  }
  return { lines, from, to };
}

/** The line on show at `t` seconds, or -1: before the first one, in a break, after the last. */
export function lineAt(tl: Timeline, t: number): number {
  const { from, to } = tl;
  let lo = 0, hi = from.length - 1, i = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (from[mid] <= t) { i = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return i >= 0 && t < to[i] ? i : -1;
}

/** How many of a line's words have begun at `t`. */
export function wordsBegun(line: SongLine, t: number): number {
  let n = 0;
  while (n < line.w.length && t >= line.w[n][0] - LEAD) n++;
  return n;
}

/** Where the singing is among a line's units at `t`: units before `now` are sung, `now` is being sung (-1 before the
 *  first word; the line's length once its last word has ended). A unit holds one or more words (its third field). */
export function unitAt(line: SongLine, t: number): number {
  const begun = wordsBegun(line, t);
  if (!begun) return -1;
  const last = line.w[line.w.length - 1];
  if (begun >= line.w.length && last && t >= last[1]) return line.u.length;
  let words = 0;
  for (let k = 0; k < line.u.length; k++) {
    words += Math.max(1, Number(line.u[k][2]) || 1);
    if (begun <= words) return k;
  }
  return line.u.length - 1;
}

/** "Lipkite! (šokite į vidų)" → "Lipkite!": the strip has room for the meaning, not for the literal one too. */
export function shortGloss(gloss: string): string {
  const whole = String(gloss || "").trim();
  return whole.replace(/\s*\([^)]*\)/g, "").replace(/\s{2,}/g, " ").trim() || whole;
}
