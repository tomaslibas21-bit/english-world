// The game the UI talks to: the 3D town (Game.ts) or the light mode without 3D (LightGame.ts).
// Kept apart from Game.ts so the light mode never loads three.js: Game.ts is imported only for the town.
import type { Session } from "./session";
import type { SituationDef } from "../content/types";
import type { Door } from "./world/town";

/** What the UI uses from the game: the 3D town (Game), or the light mode without 3D (LightGame, whose
 *  world members are no-ops). A new call from the UI goes here and into both classes. */
export interface GameApi {
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
  setQuality(q: "high" | "low"): void;
  readonly groundCanvas: HTMLCanvasElement | undefined;
  readonly doors: Door[];
}

export let game: GameApi | null = null;
export function setGame(g: GameApi | null) { game = g; }
