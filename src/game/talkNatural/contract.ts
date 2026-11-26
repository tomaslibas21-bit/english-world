// Rig seams shared with the eager character and audio code.
import type { Object3D, Vector3 } from "three";
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
  energy: number;
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
  /** Entry already started by the synchronous driver. Consumed by the lazy mixer. */
  entry?: ArmEntry;
}

export const ENTRY_SECONDS = 0.24;
export const ease = (t: number) => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u); };

export function blockedHands(actor: GameCharacter, rig: NaturalRig) {
  const busy = actor.busy;
  // Wiping and typing stop when a customer speaks: those hands are free to gesture (above the counter).
  if (actor.handsOccupied || busy === "paper" || rig.carry === "paper" || busy === "wheel") return 3;
  const left = rig.carry === "bag" || busy === "doorL";
  const right = actor.rightHand.children.length || rig.carry === "coffee" || rig.carry === "cup" ||
    busy === "cup" || busy === "tiller" || busy === "doorR";
  return (left ? 1 : 0) | (right ? 2 : 0);
}

/** Local rotations captured before the adapters write a new base pose. */
export class ArmEntry {
  progress = 0;
  active = true;
  private blocked = 0;
  private readonly joints;
  private readonly rotations;

  constructor(rig: NaturalRig) {
    this.joints = [rig.upperL, rig.foreL, rig.upperR, rig.foreR];
    this.rotations = this.joints.map((joint) => joint.quaternion.clone());
  }

  capture() {
    for (let i = 0; i < this.joints.length; i++) this.rotations[i].copy(this.joints[i].quaternion);
  }

  apply(weight: number, blocked: number) {
    this.blocked |= blocked;
    for (let i = 0; i < this.joints.length; i++) {
      if (!(this.blocked & (i < 2 ? 1 : 2))) this.joints[i].quaternion.slerp(this.rotations[i], 1 - weight);
    }
  }
}

/** The adapter writes the existing local base pose first, then hands its joints to the mixer. */
export interface NaturalPoseDriver {
  readonly weight: number;
  readonly releasing?: boolean;
  readonly watch?: Vector3;
  readonly reduced: boolean;
  readonly mouth: number;
  readonly roundness: number;
  advance(dt: number): void;
  apply(dt: number, moving: boolean, blink: number, watching?: boolean): void;
  restoreBase(): void;
  interrupt(): void;
}
