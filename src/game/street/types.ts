// Street life (batch 5, 23 Nov 2026): the shape of the street moments and the overheard chatter. Written by Claude;
// the content lives in src/content/street.ts (Maple Harbor) and src/editions/es/content/street.ts (Puerto Colibrí).
// The engine (pacing, the shuffle bag, memory in the save, the townsperson, the card, the bubbles) reads only this.
//
// Language fields follow the editions' habit (as in content/ambient.ts):
//   `en` = the town's language: English in Maple Harbor, Spanish in Puerto Colibrí (Mexican Spanish by default);
//   `lt` = the learner's language: Lithuanian in Maple Harbor; English in Puerto Colibrí (its es-lt layer swaps in
//          Lithuanian from ~/puerto-colibri-lt/done/street.json).
// Gender switches inside any text:
//   {m:…|f:…}   the learner's gender (what a townsperson says to or about them, and what the learner says of
//               themselves: "Estoy {m:perdido|f:perdida}");
//   {nm:…|nf:…} the townsperson in this moment (their own gender: "Aš toks {nm:išsiblaškęs|nf:išsiblaškiusi}").

/** One spoken line. Puerto Colibrí only: `neutral` (Latin American Spanish) and `spain` (Spain) twins of `en`, used
 *  when the learner picked that Spanish in Settings; without a twin the line is said as it is. */
export interface StreetLine { en: string; lt: string; neutral?: string; spain?: string }

/** A value that may differ by who is in the moment: `{ byCast: { a: …, b: … } }` (keys = StreetCast ids). */
export type ByCast<T> = T | { byCast: Record<string, T> };

/** What a townsperson carries, has beside them, or what lies on the ground or flies past. Built in code, low-poly. */
export type StreetProp =
  // the regulars' things
  | "guitar" | "small_guitar" | "cart" | "dog" | "easel" | "kite" | "water_bottle" | "mailbag" | "package"
  | "fishing_rod" | "fish_bucket" | "net" | "bread_bag" | "skateboard" | "hammocks" | "chair_fan" | "watering_can"
  | "coconuts" | "shoeshine_box"
  // dropped, lost, carried, blown away
  | "wallet" | "keys" | "glove" | "sunglasses" | "map" | "phone" | "guidebook" | "camera" | "tablet"
  | "fruit" | "hat" | "scarf" | "newspaper" | "cap" | "bike" | "box" | "flowers" | "cake_box" | "water_jug"
  | "market_bags" | "clipboard" | "microphone"
  // given to the learner (the arcs)
  | "coffee_cup" | "postcard" | "pie" | "bracelet" | "fruit_cup";

/** One person (and their thing) who can play a moment. Regulars repeat the same person in every entry (same name,
 *  same look); what changes is what they have with them today. Incidents rotate different people and objects. */
export interface StreetCast {
  id: string;
  gender: "m" | "f";
  age: "kid" | "teen" | "young" | "adult" | "old";
  /** Shown on the card above their lines, in the learner's language: „Gatvės muzikantas“ / "Street musician". */
  role: string;
  /** Regulars: the name they tell the learner (also on the card once told: see StreetScript.named). */
  name?: string;
  prop?: StreetProp;
  /** The prop's color or kind where it matters (a red kite, a white dog, apples or oranges): a CSS color name or a
   *  short word the prop builder knows ("apples", "oranges", "lemons", "mangos", "limes", "pretzels", "cider",
   *  "elotes", "marquesitas", "coconut_water"…). */
  propKind?: string;
  /** Their voice set: a regular's own ("st_eli"), or a shared one by age and gender ("st_f_adult", "st_m_old",
   *  "st_kid_f"…). v2 voices are g_<voice>. */
  voice: string;
}

/** What the learner can say (tap it, or say it where the conversations already take speech). */
export interface StreetChoice {
  say: ByCast<StreetLine>;
  /** The townsperson's answer (1–2 lines). Without one, the script's `reply`. */
  reply?: ByCast<StreetLine[]>;
  /** false: this answer doesn't help or join in ("Sorry, I'm in a hurry!"): the moment counts as seen, not helped,
   *  and no arc follows from it. Default true. */
  helped?: false;
}

/** One meeting: a short scene of 1–3 exchanges (15–45 s). */
export interface StreetScript {
  /** Narration in the learner's language, never voiced (what the learner sees happen):
   *  „Vyras pametė piniginę ir nieko nepastebėjo.“ / "A man dropped his wallet and didn't notice." */
  scene?: ByCast<string>;
  /** What the townsperson says first (0–2 lines; none when the learner speaks first, e.g. calling after a dropped
   *  wallet). */
  open?: ByCast<StreetLine[]>;
  choices: StreetChoice[];
  /** The answer to any choice without its own. */
  reply?: ByCast<StreetLine[]>;
  /** An optional second exchange after the first answer. */
  then?: { open?: ByCast<StreetLine[]>; choices: StreetChoice[]; reply?: ByCast<StreetLine[]> };
  /** Their goodbye when the learner walks away before answering (said once, as the learner leaves). */
  away?: ByCast<StreetLine>;
  /** The phrase card the learner keeps. Without one, the learner's own chosen line (the last one they said). */
  card?: ByCast<StreetLine>;
  /** From this meeting on, the card shows their name instead of only the role (a regular introduced themselves). */
  named?: true;
}

export interface StreetMoment {
  id: string;
  /** regular: one recurring person who remembers the learner. incident: a one-off that rotates people and objects
   *  (the same person at most twice: the second time is the callback). arc: a payoff that comes back from an earlier
   *  moment (the wallet's owner brings a coffee the next day). */
  kind: "regular" | "incident" | "arc";
  /** 2–3 entries. Arcs: the same ids as the moment they come from (`after.id`): the person who was helped returns. */
  cast: StreetCast[];
  /** Where it can happen: near the shore or harbor water, in the main square / zócalo, or (default) anywhere outdoors
   *  in town. */
  near?: "water" | "square";
  /** Which meeting: regulars by how often the learner has met them (0 → first, 1 → second, 2+ → familiar);
   *  incidents by how often the learner has met this one person (0 → first, 1 → second = the callback, 2+ →
   *  familiar: they greet the learner and nothing is lost). Arcs play `first` once. */
  first: StreetScript;
  second?: StreetScript;
  familiar?: StreetScript;
  /** Arcs: what has to come first. `helped`: the learner helped in that moment on an earlier day (the arc then
   *  brings back that same person); `seen`: the learner has met that regular at least this many times. */
  after?: { id: string; helped?: true; seen?: number };
}

/** Two townspeople talking as the learner walks past: two lines, the translation on tap, no reply needed. Either
 *  speaker may be a man or a woman, so the text says nothing that depends on their gender (or uses {nm:…|nf:…}). */
export interface StreetChatter {
  id: string;
  lines: [StreetLine, StreetLine];
  /** Only where it makes sense: at the café tables, by the water, in the square. Default: any pair in town. */
  near?: "cafe" | "water" | "square";
}
