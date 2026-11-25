import type { Box3, Object3D } from "three";
import type { GameCharacter } from "../characters";
import type { CameraRig } from "../camera";
import type { Ride, Rides } from "../rides/Rides";
import type { Controls } from "../rides/drive";
import type { Door, StandTaxi } from "../world/town";
import type { ActorTalk } from "../talkNatural/binding";

export interface ModeHost {
  acting?(): ActorTalk;
  npc?(id: string): GameCharacter | undefined;
  player(): GameCharacter;
  rig: CameraRig;
  rides: Rides;
  standTaxi?: StandTaxi;
  doors: Door[];
  add(...objects: Object3D[]): void;
  time(): number;
  canStart(indoors?: boolean): boolean;
  fade(fn: () => void): boolean;
  hideNpc(id: string, hidden: boolean): void;
  entered(id: string): void;
  left(id: string): void;
  owns(id: string): boolean;
  splash(x: number, y: number, z: number, dx: number, dz: number, k: number): void;
  portrait(): boolean;
  prepare(): void;
  place(x: number, z: number, rot: number): void;
  updatePose(dt: number, heading: number): void;
  board(ride: Ride): boolean;
  startTownDrive(ride: Ride): void;
  drive(dt: number, controls: Controls | null): void;
  horn?(): void;
  dismount(x?: number, z?: number, rot?: number, keepParked?: boolean): void;
  snapTaxi(ride: Ride, dimensions: { width: number; length: number; height: number }): void;
  scoreShot(beside?: Box3): CameraRig["stage"];
}
