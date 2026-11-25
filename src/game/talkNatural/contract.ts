// Type-only seams shared with the eager character and audio code.
import type { Object3D } from "three";
import type { GameCharacter } from "../characters";

export type TalkLineId = string | number;
export type AnchorKind = "map" | "menu" | "handoff" | "machine";
export interface ClassifiedCue {
  family: "goodbye" | "repeat" | "offer" | "point" | "shrug" | "yes" | "no" | "count" | "greeting" | "question" | "rest";
  /** A direction in the learner's frame. */
  side?: -1 | 1;
  quantity?: 1 | 2 | 3;
  anchor?: AnchorKind;
}
export interface TalkPersonality {
  armChance: number;
  farewell: "yes" | "heart" | "wave";
}

/** Pass the same object to the pose and to audio.play. Create a fresh object for every playback, including replays. */
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
  eye: Object3D;
  browL: Object3D;
  browR?: Object3D;
  corners?: Object3D;
  mouth: Object3D;
  handLength: number;
  carry?: "coffee" | "bag" | "cup" | "paper";
}

/** The adapter writes the existing local base pose first, then hands its joints to the mixer. */
export interface NaturalPoseDriver {
  readonly weight: number;
  readonly reduced: boolean;
  readonly mouth: number;
  readonly roundness: number;
  advance(dt: number): void;
  apply(dt: number, moving: boolean, blink: number, watching?: boolean): void;
  restoreBody(): void;
  interrupt(): void;
}
