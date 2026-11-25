// Seams for the character adapters and playback.
import type { Object3D, Vector3 } from "three";
import type { TranscriptLine } from "../../state/store";
import type { GameCharacter } from "../characters";

export type TalkLineId = string | number;
export const ENTRY_SECONDS = 0.24;

export function blockedHands(actor: GameCharacter, rig: NaturalRig, idleWorkHands?: boolean) {
  const busy = actor.busy;
  if (actor.handsOccupied || busy === "paper" || rig.carry === "paper" || busy === "wheel" || (!idleWorkHands && (busy === "type" || busy === "wipe"))) return 3;
  const left = rig.carry === "bag" || busy === "doorL";
  const right = actor.rightHand.children.length || rig.carry === "coffee" || rig.carry === "cup"
    || busy === "cup" || busy === "tiller" || busy === "doorR";
  return (left ? 1 : 0) | (right ? 2 : 0);
}

/** Create a fresh object per play, including a replay of the same line on the same mounted actor. */
export interface VoiceVisualOwner {
  readonly actor: GameCharacter;
  readonly line: TalkLineId;
  readonly replay?: "turn" | "transcript";
  /** A line that has to be read after a skipped or unsuccessful request. */
  onUnavailable?(): void;
}

export function presentTalkVoice(actor: GameCharacter, line: number, replay: VoiceVisualOwner["replay"], entry?: TranscriptLine): VoiceVisualOwner {
  if (replay === "transcript" || entry?.id !== line) return { actor, line, replay };
  const acting: NonNullable<TranscriptLine["acting"]> = { at: performance.now(), replay: replay === "turn", unavailable: false };
  entry.acting = acting;
  return { actor, line, replay, onUnavailable() { acting.unavailable = true; } };
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
  readonly baseGaze?: boolean;
  readonly baseWork?: boolean;
  readonly poolHead?: boolean;
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
  directs?: true;
}
