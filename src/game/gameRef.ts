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
  horn?(): void;
  modeStart(id: string, option?: string): void;
  modeExit(): void;
  modeAction(id: string, name: string, value?: string | boolean): void;
  modeOffer(sitId: string): { id: string; label: string } | null;
  modeFromConversation(id: string): void;
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
