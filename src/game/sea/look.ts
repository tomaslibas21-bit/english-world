import * as THREE from "three";
import { ROAD_EDITION } from "../../content/road";
import { farMaterial, lightFar } from "../kit/farShapes";
import type { SeaLook } from "../kit/openSea";
import type { OpenSky, SkyLook } from "../kit/openSky";
import { colourMerge, rand } from "../world/util";

// How the open water looks in each town: the sky from afternoon to sunset (the run's timer is the time of day), the
// water's colours, and what stands on the horizon — islands, sea stacks, sails, a freighter far out.

type Part = [THREE.BufferGeometry, THREE.ColorRepresentation];
export type SeaView = {
  sky: SkyLook[]; sunAzimuth: number; water: SeaLook;
  island: { sand: string; green: [string, string]; rock: string; trees: "pine" | "palm" };
  sails: string[];
};

// Maple Harbor: a clear, cool New England afternoon that turns gold.
const MAPLE_HARBOR: SeaView = {
  sky: [
    { zenith: "#1458c6", mid: "#5aa9ec", horizon: "#e3f0ee", sun: "#fffbe9", halo: "#ffe0a6", elevation: 13,
      ridgeFar: "#9fb6cf", ridgeNear: "#86a2bd", streak: "#ffffff", streaks: 0.5, cloud: "#ffffff",
      light: "#fff0d2", lightPower: 2.3, fillSky: "#e8f1f6", fillGround: "#8fb2c4", fill: 1.35 },
    { zenith: "#1e50bb", mid: "#eeb486", horizon: "#ffd595", sun: "#fff0bd", halo: "#ffa65a", elevation: 8,
      ridgeFar: "#a892b4", ridgeNear: "#93799e", streak: "#ffdcb8", streaks: 0.75, cloud: "#ffe6cf",
      light: "#ffd6a0", lightPower: 2.1, fillSky: "#e6dfe6", fillGround: "#a99aa8", fill: 1.3 },
    { zenith: "#28389a", mid: "#ec7f6c", horizon: "#ffa55e", sun: "#ffd894", halo: "#ff7440", elevation: 4,
      ridgeFar: "#8a6aa0", ridgeNear: "#735888", streak: "#ffb08e", streaks: 0.9, cloud: "#ffc7b2",
      light: "#ffbe8c", lightPower: 1.9, fillSky: "#d5c9e6", fillGround: "#a58aa0", fill: 1.26 },
  ],
  sunAzimuth: 0.26,
  water: { deep: "#0d4a78", bright: "#2a86ad", foam: "#f4fbf8" },
  island: { sand: "#cdb892", green: ["#3f6f52", "#a8552f"], rock: "#7f7a78", trees: "pine" },
  sails: ["#ffffff", "#f6e9cf", "#e8553f"],
};

// Puerto Colibrí: Caribbean turquoise under a tall blue sky, then pink and violet.
const PUERTO_COLIBRI: SeaView = {
  sky: [
    { zenith: "#0668c4", mid: "#4cc3e2", horizon: "#e4f6ea", sun: "#fffbe9", halo: "#ffe3a0", elevation: 13,
      ridgeFar: "#9cc3cf", ridgeNear: "#7fb0b8", streak: "#ffffff", streaks: 0.45, cloud: "#ffffff",
      light: "#fff1cf", lightPower: 2.35, fillSky: "#e3f4f3", fillGround: "#7fc3c4", fill: 1.35 },
    { zenith: "#2247b6", mid: "#f78a8e", horizon: "#ffb866", sun: "#fff0bd", halo: "#ff9558", elevation: 8,
      ridgeFar: "#a583b8", ridgeNear: "#8e6aa6", streak: "#ffc9b8", streaks: 0.75, cloud: "#ffe0d5",
      light: "#ffd09a", lightPower: 2.1, fillSky: "#e7d9e6", fillGround: "#a894b0", fill: 1.3 },
    { zenith: "#2b2788", mid: "#e04a90", horizon: "#ff8a4c", sun: "#ffd28c", halo: "#ff634a", elevation: 4,
      ridgeFar: "#7b5aa6", ridgeNear: "#664690", streak: "#ff9fa0", streaks: 0.9, cloud: "#ffb7c0",
      light: "#ffb68e", lightPower: 1.9, fillSky: "#d3c1e8", fillGround: "#9f80ac", fill: 1.26 },
  ],
  sunAzimuth: -0.26,
  water: { deep: "#07678f", bright: "#1fc2c0", foam: "#f6fffb" },
  island: { sand: "#f0dcae", green: ["#3f9a62", "#6fb85e"], rock: "#8d8478", trees: "palm" },
  sails: ["#ffffff", "#ffd45c", "#ff6f61"],
};

export const SEA_VIEW: SeaView = (ROAD_EDITION.id as string) === "puerto-colibri" ? PUERTO_COLIBRI : MAPLE_HARBOR;

const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => g.translate(x, y, z);

function tree(kind: "pine" | "palm", r: () => number, x: number, y: number, z: number, size: number, green: string): Part[] {
  if (kind === "pine") return [
    [at(new THREE.CylinderGeometry(0.16 * size, 0.2 * size, 1.2 * size, 5), x, y + 0.6 * size, z), "#6b4a38"],
    [at(new THREE.ConeGeometry(1.25 * size, 2.6 * size, 6), x, y + 2.2 * size, z), green],
    [at(new THREE.ConeGeometry(0.9 * size, 2.1 * size, 6), x, y + 3.6 * size, z), green],
  ];
  const lean = (r() - 0.5) * 0.5, top = 4.2 * size;
  const parts: Part[] = [[at(new THREE.CylinderGeometry(0.12 * size, 0.2 * size, top, 5).rotateZ(lean), x - Math.sin(lean) * top / 2, y + top / 2, z), "#8f7354"]];
  const hx = x - Math.sin(lean) * top, hy = y + Math.cos(lean) * top;
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + r();
    const frond = new THREE.ConeGeometry(0.42 * size, 2.5 * size, 3).rotateZ(Math.PI / 2 + 0.45).translate(1.1 * size, -0.25 * size, 0).rotateY(a);
    parts.push([at(frond, hx, hy, z), green]);
  }
  return parts;
}

function island(view: SeaView, r: () => number, x: number, z: number, radius: number, height: number, light = false): Part[] {
  const { sand, green, rock, trees } = view.island;
  const stretch = 1.2 + r() * 0.7, spin = r() * Math.PI;
  const shape = (g: THREE.BufferGeometry, y: number) => at(g.scale(1, 1, stretch).rotateY(spin), x, y, z);
  const parts: Part[] = [
    [shape(new THREE.CylinderGeometry(radius * 0.94, radius * 1.08, 1.5, 9), 0.1), sand],
    [shape(new THREE.CylinderGeometry(radius * 0.36, radius * 0.8, height, 8), 0.8 + height / 2), green[0]],
  ];
  if (r() < 0.6) parts.push([shape(new THREE.DodecahedronGeometry(radius * 0.3, 0).translate(radius * 0.55, 0, radius * 0.2), 1.1), rock]);
  const count = Math.round(radius / 3.2);
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2, d = radius * (0.15 + r() * 0.5);
    const up = trees === "palm" ? 0.9 + (1 - d / radius) * height * 0.5 : 0.9 + (1 - d / (radius * 0.8)) * height * 0.8;
    parts.push(...tree(trees, r, x + Math.sin(a) * d, up, z + Math.cos(a) * d * 1.2, 0.85 + r() * 0.6, green[trees === "pine" && r() < 0.3 ? 1 : i % 2]));
  }
  if (light) {
    const y = 0.8 + height;
    parts.push([at(new THREE.CylinderGeometry(0.75, 1.15, 7, 8), x, y + 3.5, z), "#fbf6ea"],
      [at(new THREE.CylinderGeometry(0.96, 1.02, 1.5, 8), x, y + 3.4, z), "#d6453c"],
      [at(new THREE.CylinderGeometry(0.62, 0.62, 1.1, 6), x, y + 7.5, z), "#ffe9a8"],
      [at(new THREE.ConeGeometry(0.95, 1.1, 8), x, y + 8.6, z), "#3d4a57"]);
  }
  return parts;
}

function sailboat(x: number, z: number, heading: number, size: number, sail: string, jib: string): Part[] {
  const place = (g: THREE.BufferGeometry, color: string): Part => [at(g.scale(size, size, size).rotateY(heading), x, -0.25, z), color];
  const tri = (pts: number[][]) => {
    const g = new THREE.BufferGeometry().setFromPoints([...pts, pts[0], pts[2], pts[1]].map(([px, py, pz]) => new THREE.Vector3(px, py, pz)));
    g.computeVertexNormals();
    return g;
  };
  return [
    place(new THREE.CylinderGeometry(1.15, 0.7, 1.1, 6).scale(1, 1, 3.4).translate(0, 0.45, 0), "#f4efe6"),
    place(new THREE.BoxGeometry(1.5, 0.22, 6.4).translate(0, 1.02, 0), "#2f6f8f"),
    place(new THREE.CylinderGeometry(0.07, 0.09, 10, 5).translate(0, 6, 0.6), "#6b5a4c"),
    place(tri([[0, 1.9, 0.45], [0, 10.6, 0.5], [0, 1.9, -3.9]]), sail),
    place(tri([[0, 1.6, 0.85], [0, 9.2, 0.7], [0, 1.4, 3.6]]), jib),
  ];
}

function freighter(x: number, z: number, heading: number): Part[] {
  const place = (g: THREE.BufferGeometry, color: string): Part => [at(g.rotateY(heading), x, -0.25, z), color];
  const parts: Part[] = [
    place(new THREE.BoxGeometry(11, 5, 78).translate(0, 2.2, 0), "#32465a"),
    place(new THREE.BoxGeometry(11.2, 1.2, 78.2).translate(0, 0.4, 0), "#b6453a"),
    place(new THREE.BoxGeometry(9, 9, 9).translate(0, 9, -30), "#f1ece2"),
    place(new THREE.CylinderGeometry(1.5, 1.7, 5, 8).translate(0, 15.5, -32), "#d6453c"),
  ];
  const stack = ["#d98b3a", "#3f8f8a", "#c9c2b4", "#b6453a", "#4c6f9c"];
  for (let i = 0; i < 6; i++) parts.push(place(new THREE.BoxGeometry(9.4, 3 + (i * 7 % 3) * 2.2, 8.6).translate(0, 6.2 + (i * 7 % 3) * 1.1, -18 + i * 9.6), stack[i % stack.length]));
  return parts;
}

/** Everything on the horizon as one mesh, laid out from the point where the run starts and heads out along -z:
 *  near stacks and islets to pass close by, bigger islands farther off on both sides, sails between them and a
 *  freighter on the skyline. Add it at the start point. */
export function seaHorizon(sky: OpenSky, view = SEA_VIEW) {
  const r = rand(view.island.trees === "palm" ? 3301 : 8123);
  const parts: Part[] = [];
  const { rock } = view.island;
  // [how far out, how far to the side, radius, height]
  const islands: [number, number, number, number][] = [
    [210, -64, 13, 6], [430, 82, 20, 9], [640, -150, 34, 16], [820, 58, 11, 5], [980, 190, 42, 20],
    [1180, -92, 22, 10], [1420, 120, 18, 8], [1500, -260, 60, 26], [1760, -70, 15, 7], [1900, 240, 52, 22],
    [2300, 30, 70, 30],
  ];
  islands.forEach(([out, side, radius, height], i) => parts.push(...island(view, r, side, -out, radius, height, i === 2 || i === 8)));
  for (const [out, side, size] of [[120, 38, 2.2], [330, -40, 3], [545, 36, 2.6], [760, -44, 3.4], [1090, 46, 3], [1330, -38, 2.4], [1640, 42, 3.2]]) {
    parts.push([at(new THREE.DodecahedronGeometry(size, 0).scale(1, 1.25 + r() * 0.6, 1).rotateY(r() * 3), side, size * 0.35, -out), rock]);
    parts.push([at(new THREE.DodecahedronGeometry(size * 0.55, 0).rotateY(r() * 3), side + size * 1.3, size * 0.1, -out + size), rock]);
  }
  const [main, cream, bold] = view.sails;
  const boats: [number, number, number, number, string, string][] = [
    [300, 120, 1.9, 1.1, main, cream], [520, -95, 2.4, 2.2, cream, bold], [900, -60, 2.1, 0.8, main, bold],
    [1050, 110, 2.6, 2.6, bold, main], [1500, 70, 2.2, 1.4, main, cream], [1700, -150, 2.8, 2.0, cream, main],
  ];
  for (const [out, side, heading, size, sail, jib] of boats) parts.push(...sailboat(side, -out, heading, size, sail, jib));
  parts.push(...freighter(-420, -1250, 1.35), ...freighter(520, -2100, -1.2));
  const material = farMaterial(260, 2300, 0.86);
  const mesh = new THREE.Mesh(colourMerge(parts), material);
  mesh.frustumCulled = false;
  mesh.name = "sea-horizon";
  lightFar(material, sky.haze, sky.light);
  return mesh;
}
