// Type-only seams for the character adapters and playback.
import type { Object3D, Vector3 } from "three";
import type { GameCharacter } from "../characters";

export type TalkLineId = string | number;

/** Create a fresh object per play, including a replay of the same line on the same mounted actor. */
export interface VoiceVisualOwner {
  readonly actor: GameCharacter;
  readonly line: TalkLineId;
  readonly replay?: "turn" | "transcript";
}

export interface NaturalRig {
  body: Object3D;
  head: Object3D;
  upperL: Object3D;
  upperR: Object3D;
  foreL: Object3D;
  foreR: Object3D;
  thighL: Object3D;
  thighR: Object3D;
  shinL: Object3D;
  shinR: Object3D;
  eye: Object3D;
  browL: Object3D;
  browR?: Object3D;
  corners?: Object3D;
  mouth: Object3D;
  hair?: Object3D | null;
  handLength: number;
  carry?: "coffee" | "bag" | "cup" | "paper";
}

/** The adapter writes its local base before applying the optional overlay. */
export interface NaturalPoseDriver {
  readonly releasing: boolean;
  readonly reduced: boolean;
  readonly watch?: Vector3 | null;
  readonly watchSpeed?: number;
  readonly mouth: number;
  readonly roundness: number;
  advance(dt: number): void;
  apply(moving: boolean, blink: number, watching?: boolean): void;
  restoreBase(): void;
  interrupt(): void;
}

export type AnchorKind = "handoff" | "menu" | "machine" | "map";

export interface ClassifiedCue {
  family: "greeting" | "question" | "point" | "shrug" | "yes" | "no" | "count" | "offer" | "goodbye" | "repeat" | "rest";
  side?: -1 | 1;
  straight?: true;
  quantity?: 1 | 2 | 3;
  anchor?: AnchorKind;
}

export interface TalkPersonality {
  armChance: number;
  farewell: "yes" | "wave" | "heart";
  smallGreeting?: true;
  quickSmile?: true;
}
