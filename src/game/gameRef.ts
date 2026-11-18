// The game the UI talks to: the 3D town (Game.ts) or the light mode without 3D (LightGame.ts).
// Kept apart from Game.ts so the light mode never loads three.js: Game.ts is imported only for the town.
import type { Session } from "./session";
import type { SituationMeta } from "../content/types";
import type { Door } from "./world/town";
import { watchSituations } from "./prefetch";

/** What the UI uses from the game: the 3D town (Game), or the light mode without 3D (LightGame, whose
 *  world members are no-ops). A new call from the UI goes here and into both classes. */
export interface GameApi {
  /** The light mode: no town to walk on in, so its end box leads to the next conversation. */
  readonly light: boolean;
  readonly activeSession: Session | null;
  lastScenario: string | null;
  startScenario(sitId: string): void;
  /** Cuts the first visit's flight over the town short (the 3D town only). */
  endFlight?(): void;
  restartScenario(): void;
  nextScenarioId(after?: string): string | null;
  call(sitId: string): void;
  closeConversation(): void;
  orderedSituations(): SituationMeta[];
  currentObjective(): SituationMeta | null;
  setObjective(sitId: string | null): void;
  // the 3D world
  interact(): void;
  autoWalkToObjective(): void;
  teleportTo(loc: string): void;
  setJoystick(x: number, y: number): void;
  /** A jump (Space, the phone's button); again in the air: a flip; a third time: the high jump, twice head over heels. */
  jump(): void;
  /** The jump button held down or let go (at a wheel it is the brake). */
  hold(on: boolean): void;
  /** The surf lesson (game/surf): start one at this level, leave it, tap an answer (its cue), another lesson from the
   *  score card, close the level's choice. */
  surfStart(level: "beginner" | "advanced"): void;
  surfStop(): void;
  surfChoose(cue: string): void;
  /** In the lesson: the move she asked for done by a tap (its name), her line once more, the microphone on or off
   *  ("finish": what was heard so far is the answer). */
  surfAct(what: string): void;
  surfRepeat(): void;
  surfMic(on: boolean | "finish"): void;
  surfAgain(level?: "beginner" | "advanced"): void;
  /** The end card of a conversation: true for the surf school's (its first button then starts the lesson). */
  surfAfter(sitId: string): boolean;
  /** That button: the conversation closes and the lesson starts. */
  surfFromConversation(): void;
  setQuality(q: "high" | "low"): void;
  readonly groundCanvas: HTMLCanvasElement | undefined;
  /** What one can take (the boats, the convertibles) and where it is, for the round map. */
  rideMarks?(): import("../ui/mapMarks").RideMark[];
  readonly doors: Door[];
  /** The conversations of the people near the player and of the room they are in (src/game/prefetch.ts fetches their
   *  files before they are needed); none in the light mode. */
  nearSituations?(): string[];
}

export let game: GameApi | null = null;
export function setGame(g: GameApi | null) { game = g; watchSituations(g); }
