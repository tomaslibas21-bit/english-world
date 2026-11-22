import type { BufferGeometry, Mesh } from "three";

export type TownBoat = {
  id: string;
  half: number;
  wide: number;
  deck: number;
  helm: [number, number];
  tint: string;
};

export function markTownBoat(mesh: Mesh, hull: BufferGeometry, id: string, tint: string, deck: number, helm: TownBoat["helm"]) {
  hull.computeBoundingBox();
  const { min, max } = hull.boundingBox!;
  const data: TownBoat = {
    id, tint, deck, helm,
    half: Math.max(max.z, -min.z),
    wide: Math.max(max.x, -min.x),
  };
  mesh.userData.rideBoat = data;
}
