// Character factory: the original blocky Character for "blocks", a styled one otherwise.
import type * as THREE from "three";
import type { Look } from "../../content/npcs";
import { Character, type Anim } from "./Character";
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
  /** A nod when the learner's answer was understood, a puzzled look when not (the original Character). */
  react?(kind: "nod" | "puzzled"): void;
  /** The seat top's height for the "sit" pose (the original Character; StyledCharacter assumes 0.5 m). */
  seatY?: number;
  /** Frees GPU memory the character doesn't share (Game calls it before removing an NPC). The styled
   *  characters need none: their geometry is cached per look, their materials are shared and the
   *  skeleton frees its bone texture when removed from the scene. */
  dispose?(): void;
}

export function createCharacter(look: Look): GameCharacter {
  return STYLED ? new StyledCharacter(look) : new Character(look);
}
