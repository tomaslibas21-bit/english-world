// The game the UI talks to: the 3D town (Game.ts) or the light mode without 3D (LightGame.ts).
// Kept apart from Game.ts so the light mode never loads three.js: Game.ts is imported only for the town.
import type { Session } from "./session";
import type { SituationMeta } from "../content/types";
import type { Door } from "./world/town";
import type { Do, SurfArrow } from "./surf/logic";
import { watchSituations } from "./prefetch";

export type WalkPlace = "pool-hall" | "gym";

export type TagBox = { x0: number; x1: number; y0: number; y1: number };
export type PlacedNametag = TagBox & { tag: HTMLElement };
export type NametagSize = [width: number, height: number];

/** Placed bounds in the tag layer's CSS pixels, valid until the next layout. */
export interface NametagLayout {
  boxes?: readonly PlacedNametag[];
  rect?: DOMRectReadOnly;
  scaleX: number;
  scaleY: number;
  size(tag: HTMLElement, previous?: NametagSize): NametagSize;
  blocker(): TagBox | undefined;
  position(boxes: readonly PlacedNametag[]): void;
  dispose(): void;
}

/** What the UI uses from the game: the 3D town (Game), or the light mode without 3D (LightGame, whose
 *  world members are no-ops). A new call from the UI goes here and into both classes. */
export interface GameApi {
  readonly noticeboard?: import("./noticeboard/posting").DailyBoard;
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
  handlePhoneCard?(id: string, answer: boolean): void;
  reactPosition?(id: number): { x: number; y: number; opacity: number } | null;
  extendReaction?(id: number): void;
  watchNametagLayout?(create: (layer: HTMLElement) => NametagLayout): () => void;
  closeConversation(): void;
  orderedSituations(): SituationMeta[];
  currentObjective(): SituationMeta | null;
  setObjective(sitId: string | null): void;
  // the 3D world
  interact(): void;
  autoWalkToObjective(mode?: "objective" | "cave"): void;
  objectiveTarget?(mode: "objective", townMap: true): { x: number; z: number } | null;
  guideToPoolHall?(): void;
  guideToPlace?(place: WalkPlace): void;
  teleportTo(loc: string): void;
  setJoystick(x: number, y: number): void;
  /** A jump (Space, the phone's button); again in the air: a flip; a third time: the high jump, twice head over heels. */
  jump(): void;
  /** The jump button held down or let go (at a wheel it is the brake). */
  hold(on: boolean): void;
  horn?(): void;
  /** The surf lesson (game/surf): start one at this level, leave it, tap an answer (its cue), another lesson from the
   *  score card, close the level's choice. */
  surfStart(level: "beginner" | "advanced"): void;
  surfStop(): void;
  surfChoose(cue: string): void;
  /** In the lesson: the move she asked for done by a tap (its name), her line once more, the microphone on or off
   *  ("finish": what was heard so far is the answer). */
  surfAct(what: Do): void;
  surfArrow(dir: SurfArrow, down: boolean): void;
  surfRepeat(): void;
  surfMic(on: boolean | "finish"): void;
  surfAgain(level?: "beginner" | "advanced"): void;
  /** An activity the end card can hand over to when the conversation closes. */
  modeOffer(sitId: string): { id: string; label: string } | null;
  modeFromConversation(id: string): void;
  modeStart?(id: string, option?: string): void;
  modeExit(): void;
  modeAction(id: string, name: string, value?: string | boolean): void;
  setQuality(q: "high" | "low"): void;
  /** The name tags say the role in the Spanish just chosen (the Spanish edition's switch; compose.ts roleSaid). */
  refreshNameTags(): void;
  readonly groundCanvas: HTMLCanvasElement | undefined;
  /** What one can take (the boats, the convertibles) and where it is, for the round map. */
  rideMarks?(): import("../ui/mapMarks").RideMark[];
  readonly doors: Door[];
  /** Puerto Colibrí's grotto while the player is down there (src/game/cave/quest.ts): the glyph stone's card. */
  readonly cave?: { say(): void; showWords(): void; pick(i: number): void; listen(): void; close(): void } | null;
  /** The conversations of the people near the player and of the room they are in (src/game/prefetch.ts fetches their
   *  files before they are needed); none in the light mode. */
  nearSituations?(): string[];
}

export let game: GameApi | null = null;
export function setGame(g: GameApi | null) { game = g; watchSituations(g); }
