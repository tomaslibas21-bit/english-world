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
  talk(seconds: number): void;
  /** Frees GPU memory the character doesn't share (Game calls it before removing an NPC). The styled
   *  characters need none: their geometry is cached per look, their materials are shared and the
   *  skeleton frees its bone texture when removed from the scene. */
  dispose?(): void;
}

export function createCharacter(look: Look): GameCharacter {
  return STYLED ? new StyledCharacter(look) : new Character(look);
}
