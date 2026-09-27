// Saved progress (this browser only). All reads/writes are guarded: private windows or
// blocked storage simply start fresh.
import type { Look } from "../content/npcs";

export interface SitProgress {
  visits: number;
  completions: number;
  /** Hint expressions the learner has used successfully (ids). */
  used: string[];
  twists: string[];
  memory: Record<string, any>;
  lastPlayed?: number;
}

export interface Progress {
  version: 1;
  profile: { name: string; surname: string; gender: "m" | "f"; look: Look; lookId: string; datePartner?: string } | null;
  settings?: Record<string, any>;
  sits: Record<string, SitProgress>;
  /** Phrasebook: expression id → { en, lt, sitId, count, last } */
  phrases: Record<string, { en: string; lt: string; sitId: string; count: number; last: number }>;
  objective: string | null;
  place: { zone: string; x: number; z: number; rot: number } | null;
  seenIntro: Record<string, boolean>;
  started: number;
}

const KEY = "english-world-progress-v1";

export function emptyProgress(): Progress {
  return { version: 1, profile: null, sits: {}, phrases: {}, objective: null, place: null, seenIntro: {}, started: Date.now() };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProgress();
    const p = JSON.parse(raw);
    if (p?.version !== 1) return emptyProgress();
    return { ...emptyProgress(), ...p };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(p: Progress) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage unavailable: progress lives for this session */ }
}

export function sitProgress(p: Progress, id: string): SitProgress {
  return p.sits[id] ?? { visits: 0, completions: 0, used: [], twists: [], memory: {} };
}

/** Stars: ★ completed · ★★ used 6+ different expressions · ★★★ completed 3 times (or met a twist twice). */
export function stars(sp: SitProgress | undefined): number {
  if (!sp || !sp.completions) return 0;
  let s = 1;
  if (sp.used.length >= 6) s++;
  if (sp.completions >= 3 || (sp.twists.length >= 2 && sp.completions >= 2)) s++;
  return s;
}
