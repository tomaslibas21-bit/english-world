import { L } from "../../ui/i18n";

export const CABINETS = {
  road: { x: 3.20, title: "Carretera del Desierto", helper: L("Kelias per dykumą"), action: L("Vairuoti") },
  billiards: { x: 4.20, title: "Billar", helper: L("Biliardas"), action: L("Žaisti biliardą") },
} as const;
export type Cabinet = keyof typeof CABINETS;
export const CABINET_Z = 2.63;
export const cabinetPose = (id: Cabinet) => ({ x: CABINETS[id].x, z: CABINET_Z + 1, rot: Math.PI });

export function cabinetNear(x: number, z: number) {
  const id = Math.abs(x - CABINETS.road.x) <= Math.abs(x - CABINETS.billiards.x) ? "road" : "billiards";
  const mark = cabinetPose(id);
  const distance = Math.hypot(x - mark.x, z - mark.z);
  return z >= CABINET_Z + 0.4 && distance <= 1.15 ? { id, distance } as const : null;
}

export type TownGame = "taxi" | "sea" | "surf" | "photowalk" | "loteria" | "pool" | "barista" | "gym";
export const TOWN_GAMES: Record<Cabinet, readonly TownGame[]> = {
  road: ["taxi", "sea", "surf", "photowalk"],
  billiards: ["loteria", "barista", "gym", "pool"],
};
