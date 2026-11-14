// The game the UI talks to: the 3D town (Game.ts) or the light mode without 3D (LightGame.ts).
// Kept apart from Game.ts so the light mode never loads three.js: Game.ts is imported only for the town.
import type { Session } from "./session";
import type { SituationDef } from "../content/types";
import type { Door } from "./world/town";

/** What the UI uses from the game: the 3D town (Game), or the light mode without 3D (LightGame, whose
 *  world members are no-ops). A new call from the UI goes here and into both classes. */
export interface GameApi {
  /** The light mode: no town to walk on in, so its end box leads to the next conversation. */
  readonly light: boolean;
  readonly activeSession: Session | null;
  lastScenario: string | null;
  startScenario(sitId: string): void;
  restartScenario(): void;
  nextScenarioId(after?: string): string | null;
  call(sitId: string): void;
  closeConversation(): void;
  orderedSituations(): SituationDef[];
  currentObjective(): SituationDef | null;
  setObjective(sitId: string | null): void;
  // the 3D world
  interact(): void;
  autoWalkToObjective(): void;
  teleportTo(loc: string): void;
  setJoystick(x: number, y: number): void;
  /** A jump (Space, the phone's button); again in the air: a flip. */
  jump(): void;
  /** The jump button held down or let go (at a wheel it is the brake). */
  hold(on: boolean): void;
  setQuality(q: "high" | "low"): void;
  /** The name tags say the role in the Spanish just chosen (the Spanish edition's switch; compose.ts roleSaid). */
  refreshNameTags(): void;
  readonly groundCanvas: HTMLCanvasElement | undefined;
  readonly doors: Door[];
  /** Puerto Colibrí's grotto while the player is down there (src/game/cave/quest.ts): the glyph stone's card. */
  readonly cave?: { say(): void; showWords(): void; pick(i: number): void; listen(): void; close(): void } | null;
}

export let game: GameApi | null = null;
export function setGame(g: GameApi | null) { game = g; }
