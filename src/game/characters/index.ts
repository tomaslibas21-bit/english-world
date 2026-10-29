// Character factory: the original blocky Character for "blocks", a styled one otherwise.
import * as THREE from "three";
import type { Look } from "../../content/npcs";
import { Character, type Anim, type Moment } from "./Character";
import { StyledCharacter } from "./StyledCharacter";
import { STYLED } from "../style";

/** What the game needs from a character (the original Character and StyledCharacter both fit). */
export interface GameCharacter {
  root: THREE.Group;
  anim: Anim;
  readonly height: number;
  setAnim(a: Anim): void;
  update(dt: number): void;
  /** Talk for `seconds`; `level` tells how loud the voice is right now (0–1; -1: it has ended; null: no recording to
   *  follow), for the mouth. */
  talk(seconds: number, level?: () => number | null): void;
  /** The real speed (m/s) and a sideways lean into turns (the original Character; others ignore them). */
  moveSpeed?: number;
  bank?: number;
  /** A nod when the learner's answer was understood, a puzzled look when not, applause when the task is done (the
   *  original Character). */
  react?(kind: "nod" | "puzzled" | "clap"): void;
  /** The seat top's height for the "sit" pose (the original Character; StyledCharacter assumes 0.5 m). */
  seatY?: number;
  /** The little things people do while they wait (the original Character): `attentive` stops them (the player is
   *  close by, or talking with them), `fidgets` false means none at all (the player), `busy` is what their hands do. */
  attentive?: boolean;
  fidgets?: boolean;
  busy?: "wipe" | "type" | "cup" | "paper" | null;
  holdMoment?(kind: Moment): void;
  /** Frees GPU memory the character doesn't share (Game calls it before removing an NPC). The styled
   *  characters need none: their geometry is cached per look, their materials are shared and the
   *  skeleton frees its bone texture when removed from the scene. */
  dispose?(): void;
}

/** Soft round shadows under everyone's feet, for the quality without sun shadows. */
export function setBlobShadows(on: boolean) { Character.blobShadows = on; }

/** The player's look with their backpack, in a colour that stands out from their top (dark navy on warm tops, mustard on
 *  cool ones): no townsperson or NPC carries one, so the player is told apart at a glance. */
export function withBackpack(look: Look): Look {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(look.top).getHSL(hsl);
  const warm = hsl.h < 0.17 || hsl.h > 0.92;
  return { ...look, backpack: warm ? "#1d3557" : "#e9a23b" };
}

export function createCharacter(look: Look): GameCharacter {
  return STYLED ? new StyledCharacter(look) : new Character(look);
}
