import type { Object3D, Vector3 } from "three";
import type { GameCharacter } from "../characters";
import type { CameraRig } from "../camera";
import type { Ride, Rides } from "../rides/Rides";
import type { Controls } from "../rides/drive";
import type { Door, StandTaxi } from "../world/town";

export interface ModeHost {
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
  drive(dt: number, controls: Controls | null): void;
  dismount(x?: number, z?: number, rot?: number, keepParked?: boolean): void;
  snapRide(ride: Ride): void;
  scoreShot(beside?: Vector3): CameraRig["stage"];
}
