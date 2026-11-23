// Saved progress (this browser only). All reads/writes are guarded: private windows or
// blocked storage simply start fresh.
import type { Look } from "../content/npcs";
import type { Invitation } from "../content/phoneCalls";

export interface SitProgress {
  visits: number;
  completions: number;
  /** Hint expressions the learner has used successfully (ids). */
  used: string[];
  twists: string[];
  memory: Record<string, any>;
  lastPlayed?: number;
  /** The learner made this conversation speak slowly („Lėčiau“). */
  slow?: boolean;
}

export interface PhoneProgress {
  played: number;
  lastCard?: number;
  lastCardEnd?: number;
  lastText?: number;
  missed: Record<string, { presentations: number; retryAt: number }>;
  invitation?: Invitation;
  office?: boolean;
  followUp?: "invitation" | "office";
}

export interface TextProgress {
  pending: Record<string, { day: string; played: number }>;
  got: Record<string, { at: number; read?: true; reply?: number }>;
  translated?: true;
}

export interface Progress {
  version: 1;
  profile: { name: string; surname: string; gender: "m" | "f"; look: Look; lookId: string; datePartner?: string } | null;
  settings?: Record<string, any>;
  sits: Record<string, SitProgress>;
  /** Phrasebook: expression id → { en, lt, sitId, count, last } */
  phrases: Record<string, { en: string; lt: string; sitId: string; count: number; last: number }>;
  objective: string | null;
  place: {
    zone: string; x: number; z: number; rot: number;
    boat?: { id: string; x: number; z: number; rot: number; mooring?: { x: number; z: number; rot: number } };
  } | null;
  seenIntro: Record<string, boolean>;
  started: number;
  /** The 3D town's guide (game/coach.ts): `seen`: the hints shown so far (each comes once, when its thing first
   *  matters); `done`: no more of them (switched off; before 16 Nov 2026: the guide was finished or skipped); `run`:
   *  the hint about running was shown; `view`: the hint beside a conversation's picture / 3D chip was shown
   *  (ui/ViewSwitch.tsx); `rides`: the number of drives, boat trips and swims started. */
  coach?: { done?: boolean; run?: boolean; view?: boolean; seen?: Partial<Record<string, true>>; rides?: number };
  /** How the game is used, for the course's owner: openings, days, minutes in the town and in the pictures, the
   *  radio (state/playStats.ts). */
  play?: import("./playStats").PlayStats;
  /** The help level and clean streak for each mini-game that uses the kit. */
  miniGameHelp?: Record<string, import("../game/kit/help").HelpProgress>;
  photoWalk?: import("../game/photowalk/state").PhotoWalkProgress;
  taxi?: { nextRoute: number };
  lighthouse?: { greeted?: boolean; boat?: { id: string; x: number; z: number; rot: number } };
  phone?: PhoneProgress;
  texts?: TextProgress;
  /** The surf lesson (game/surf): waves ridden and seconds on them, commands followed of those asked, lessons taken,
   *  and how often each of the instructor's lines has been heard (their help fades with it). */
  surf?: { waves: number; seconds: number; followed: number; asked: number; lessons: number; heard: Record<string, number> };
}

export const PROGRESS_KEY = "english-world-progress-v1";

export function emptyProgress(): Progress {
  return { version: 1, profile: null, sits: {}, phrases: {}, objective: null, place: null, seenIntro: {}, started: Date.now() };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress();
    const p = JSON.parse(raw);
    if (p?.version !== 1) return emptyProgress();
    return { ...emptyProgress(), ...p };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(p: Progress) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* storage unavailable: progress lives for this session */ }
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
