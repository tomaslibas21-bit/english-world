export const CABINETS = {
  road: { x: 3.20, title: "Desert Road", lt: "Kelias per dykumą", action: "Vairuoti" },
  billiards: { x: 4.20, title: "Pool", lt: "Biliardas", action: "Žaisti biliardą" },
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
