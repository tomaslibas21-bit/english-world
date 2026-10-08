// Authoring types for situations. See AUTHORING.md for the full guide.
import type { Gender } from "../convo/lt-morph";
import type { SlotDefs } from "../convo/grammar";

/** An authored sentence. `en` and `lt` are unit strings separated by " | " and line up one to one
 *  (TOMAS-INTERLINEAR-v2: one English word per unit unless a registered merge applies; articles
 *  a/an/the with no Lithuanian word get "—"). `nat` is the natural Lithuanian sentence.
 *  Placeholders: {X} {X.np} {X.the} {X.pl} in EN and {X:case} {X.np:case} … in LT/nat for an entity
 *  bound to X; {$price} {$time} {$num} {$text} for values; {agreeLemma@X:case} in LT for agreement. */
export interface SentSrc {
  en: string;
  lt: string;
  nat: string;
  /** Spoken form for the recording when it differs from the text (numbers, abbreviations). */
  say?: string;
  /** Unit index → decision note for a flagged unit (shown as a dotted underline with a tooltip). */
  flags?: Record<number, string>;
  /** A word the NPC can spell out if asked "How do you spell that?". */
  spell?: string;
  /** Text the NPC can write down if asked "Could you write it down?". */
  write?: string;
}

export interface EntityDef {
  id: string;
  /** English head; several units separated by " | " ("green | tea"). */
  en: string;
  /** Plural head with the same unit count. */
  pl?: string;
  /** Article used in {X.np}: computed from the first word if omitted; "" = none (uncountable); "some"; "the" for places like "the museum". */
  art?: "a" | "an" | "" | "some" | "the";
  /** Lithuanian case forms per unit: "latė/latės/latei/latę/late/latėje"; one form = indeclinable. Units separated by " | ". */
  lt: string;
  ltPl?: string;
  /** Lithuanian gender for agreement. */
  g: Gender;
  /** Feminine forms for entities that describe the player (jobs…): used when the player is female
   *  ("slaugytoja" instead of "slaugytojas"). Same unit count as `lt`. */
  ltF?: string;
  ltPlF?: string;
  /** Gender of the feminine forms (default "f"). */
  gF?: Gender;
  /** Lithuanian label for suggestion chips (default: the nominative). */
  chip?: string;
  /** Extra recognised surface forms (synonyms, common mis-recognitions). EN singular/plural are added automatically. */
  forms?: string[];
  attrs?: Record<string, any>;
}

export interface HintItem {
  /** Credited in the phrasebook when a pattern tagged #h:<id> matches. */
  id: string;
  /** Example sentence; may contain placeholders for the group's slot entity (X). */
  s: SentSrc;
  /** Restrict to entities this pattern suits ("a cup of …" only for hot drinks). */
  only?: (e: EntityDef) => boolean;
  register?: "polite" | "neutral" | "casual";
  /** Short Lithuanian usage note. */
  note?: string;
}

export interface HintGroup {
  /** What you want to communicate, in Lithuanian ("Užsisakyti gėrimą"). */
  lt: string;
  /** Entity type used for chips/examples; the placeholder name in items is "X". */
  slot?: string;
  /** Entity ids used for examples when nothing is chosen (rotated). */
  examples?: string[];
  items: HintItem[];
}

export interface Suggestion {
  /** Lithuanian intention label. */
  lt: string;
  /** Hint group opened for this intention. */
  hint?: string;
  /** Chips: an entity type or explicit entity ids (choosing never submits anything). */
  options?: string | string[];
}

export interface IntentDef {
  /** Grammar patterns (see grammar.ts). Tag hint expressions with #h:<hintItemId>; blunt forms with #blunt. */
  patterns: string[];
}

export interface Tip { key: string; lt: string; better?: string }

/** Runtime context handed to handlers. */
export interface Ctx {
  /** Situation state; free-form, initialised by `init`. */
  s: Record<string, any>;
  /** How many times this situation was completed before (0 on the first visit). */
  visits: number;
  rng(): number;
  chance(p: number): boolean;
  pick<T>(arr: readonly T[]): T;
  /** Queue an NPC line (random variant) with placeholder bindings. */
  say(lineId: string, vars?: Record<string, any>): void;
  /** Switch the speaking NPC (multi-NPC scenes). */
  speaker(npcId: string): void;
  /** Ask a specific step now (instead of the automatic next step). */
  ask(stepId: string): void;
  /** Stop automatic advancing this turn (the handler asked its own question). */
  hold(): void;
  /** Set a pending question; its handlers run before normal intent handling on the next turn. */
  expect(p: Pending): void;
  /** Optional language tip (non-blocking). */
  tip(t: Tip): void;
  /** Mark the situation's goal as reached (stamp, stars). */
  complete(): void;
  /** End the conversation after the NPC finishes speaking. */
  end(): void;
  /** The learner's profile. `datePartner` = "sam" | "emma" (song 84), chosen in settings. */
  player: { name: string; surname: string; gender: Gender; datePartner?: string };
  /** Current step id (the last question asked). */
  step: string | null;
  /** Mark a twist as having happened (for stars / variety). */
  twist(id: string): void;
  /** The raw text of the current learner utterance. */
  heard: string;
  /** Send an event to the world (e.g. "taxi-ride", "give-item"). */
  event(name: string, data?: any): void;
  /** Per-situation memory kept between visits (e.g. the regular's usual order). */
  memory: Record<string, any>;
  /** Save values into the memory (persisted when the conversation ends). */
  remember(patch: Record<string, any>): void;
}

export interface Pending {
  id: string;
  /** Drop this question if the learner does something else instead (small talk, offers). */
  optional?: boolean;
  /** Intents that answer this question (ranking bonus and hints). */
  expects?: string[];
  yes?: (ctx: Ctx) => void;
  no?: (ctx: Ctx) => void;
  /** Handle an intent while this question is pending; return true if handled. */
  on?: Record<string, (ctx: Ctx, slots: any, seg: Segment) => boolean | void>;
  suggest?: Suggestion[];
  hints?: string[];
  /** Re-ask this question after the learner handled something else first. */
  ask?: (ctx: Ctx) => void;
}

export interface Segment { intent: string; slots: any; tags: string[] }

export interface MissionItem {
  lt: string;
  step?: string;
  done?: (ctx: Ctx) => boolean;
  when?: (ctx: Ctx) => boolean;
  /** Shown only while it applies (or once done). */
  optional?: boolean;
}

export interface StepDef {
  id: string;
  /** Short Lithuanian checklist label ("Gėrimas", "Dydis"); default: the first suggestion. */
  label?: string;
  /** Applicable now? (default true) */
  when?: (ctx: Ctx) => boolean;
  /** Already satisfied? */
  done: (ctx: Ctx) => boolean;
  /** NPC asks (usually ctx.say(...)). */
  ask: (ctx: Ctx) => void;
  /** Intents that answer this step. */
  expects?: string[];
  /** What to do now (the "your turn" guide). A function when it depends on the conversation so far
   *  ("What kind of tea?" shows teas; "Anything else?" shows food first until some is ordered). */
  suggest?: Suggestion[] | ((ctx: Ctx) => Suggestion[]);
  hints?: string[];
  yes?: (ctx: Ctx) => void;
  no?: (ctx: Ctx) => void;
  /** When the learner says "I don't know"/"What do you have?" etc. */
  help?: (ctx: Ctx) => void;
}

export type Handler = (ctx: Ctx, slots: any, seg: Segment) => void;

export interface SituationDef {
  id: string;
  /** Mission checklist shown to the learner from the start: 3–6 short imperative labels ("Užsisakyk gėrimą").
   *  Each item is either tied to a step (`step`: ticked when the step is done or resolved) or has its own
   *  `done` predicate on the conversation state. `when` (or the step's `when`) + `optional` hides items that
   *  don't apply ("Pasirink dydį" only for drinks with sizes). Without `mission`, the steps are listed. */
  mission?: MissionItem[];
  /** Source song: its number (31–35, 62–91: the course's S96–S100, S62–S91) or, for the advanced songs, the course's
   *  own id ("P25"). */
  song: number | string;
  songTitle: string;
  title: { en: string; lt: string };
  topic: { en: string; lt: string };
  chapter: number;
  /** Order within the suggested route. */
  order: number;
  location: string;
  npc: string;
  npcs?: string[];
  /** "phone" for phone/video calls started from the phone. */
  mode?: "talk" | "phone" | "video";
  /** Objective in Lithuanian ("Užsisakyk kavos ir susimokėk"). */
  goal: string;
  /** Short Lithuanian scene intro shown once. */
  intro?: string;
  entities?: Record<string, EntityDef[]>;
  grammar?: { macros?: Record<string, string | string[]>; slots?: SlotDefs };
  intents: Record<string, IntentDef>;
  lines: Record<string, SentSrc[]>;
  /** Value domains for enumerating audio of lines with value placeholders ({$price} …). */
  domains?: Record<string, () => any[]>;
  hints: Record<string, HintGroup>;
  steps: StepDef[];
  init?: (ctx: Ctx) => void;
  start: (ctx: Ctx) => void;
  handlers: Record<string, Handler>;
  /** Called when no step is left. */
  finish?: (ctx: Ctx) => void;
  /** Default suggestions/hints when no step is active. */
  suggest?: Suggestion[];
  /** Optional language tips triggered by #tip:<key> tags in patterns. */
  tips?: Record<string, Tip>;
  /** Merge records for multiword units used only in this situation (key: lowercase unit, see merges.ts). */
  merges?: Record<string, { reason: "lexical_expression" | "grammatical_fusion" | "bound_morphology"; split: string; minimal: string }>;
  /** Automatic tests. */
  tests?: NluTest[];
  sims?: SimTest[];
}

export interface NluTest {
  say: string;
  /** Expected first intent (or "none" for not understood). */
  intent: string | "none";
  /** Partial slot expectations (deep compare on given keys). */
  slots?: Record<string, any>;
  /** Step/pending context for ranking. */
  step?: string;
  not?: string[];
}

export interface SimTest {
  name: string;
  seed?: number;
  turns: string[];
  /** Answers used when the NPC asks an optional/random question (keyed by step or pending id). */
  auto?: Record<string, string>;
  /** Runs right after `init` on every seed: forces the twist or choice the sim is about (`s` is `c.s`). */
  setup?: (s: Record<string, any>) => void;
  /** Expected: completed, and optionally state checks. */
  expect: { complete?: boolean; state?: Record<string, any> };
}
