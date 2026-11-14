// The grotto under Cenote Ka'an (Puerto Colibrí; theme.ts `cenote.grotto`) as a zone of the game: built the first time
// someone swims into the cave's mouth at the cenote's far side. plan.ts: its plan and rules; Cave.ts: how it looks;
// quest.ts: the glyph stones' listening quest. Maple Harbor has none.
import * as THREE from "three";
import type { Interior } from "../world/interiors";
import { THEME } from "../world/theme";
import { buildCave, type CaveView } from "./Cave";
import * as P from "./plan";

export const CAVE_ZONE = "gruta";
export type CaveZone = Interior & { view: CaveView };
let cave: CaveZone | null = null;

/** The cenote's water, its radius and the cave's mouth at its far (west) side, in the town's coordinates. */
const R = 6;
/** Where one swims up to the cave's mouth (the prompt, and swimming on into it), and where one is back in the water. */
export function caveDoor(): { x: number; z: number; out: { x: number; z: number; rot: number } } | null {
  const c = THEME.cenote;
  if (!c?.grotto) return null;
  return { x: c.x - R + 1.25, z: c.z, out: { x: c.x - R + 2.9, z: c.z, rot: Math.PI / 2 } };
}

export function getCave(id: string): CaveZone | null {
  if (id !== CAVE_ZONE || !caveDoor()) return null;
  if (cave) return cave;
  const view = buildCave();
  cave = {
    id, view, group: view.group, colliders: view.colliders,
    w: P.BOUNDS.maxX - P.BOUNDS.minX, d: P.BOUNDS.maxZ - P.BOUNDS.minZ,
    exit: P.EXIT, spawn: P.ENTRY,
    npcs: P.ALUXES.map((a) => ({ npc: a.npc, x: a.x, z: a.z, rot: a.rot, ax: a.ax, az: a.az })),
    wild: {
      fog: view.fog, background: "#05232c", hemi: ["#a8eef2", "#1d5560", 1.55], sun: ["#fff1d0", 1.25],
      space: view.space, floor: P.floorY, walkable: P.walkable, bounds: P.BOUNDS, out: caveDoor()!.out,
      camera: { pitch: 0.3, dist: 9.5 },
      frame: (t, dt, cam, at, h) => view.update(t, dt, cam, at, h),
    },
  };
  return cave;
}

/** What shows of it from the cenote: a glow in the cave's dark mouth and a few fireflies drifting out over the water
 *  (two small meshes in the town's group). */
export function caveLure(): THREE.Group | null {
  const door = caveDoor();
  if (!door) return null;
  const g = new THREE.Group(), x = THEME.cenote!.x - R + 0.56, z = THEME.cenote!.z;
  g.name = "gruta-lure";
  const u = { uTime: { value: 0 } };
  const glow = new THREE.Mesh(new THREE.CircleGeometry(1.75, 18, 0, Math.PI).scale(1.15, 0.92, 1).rotateY(Math.PI / 2).translate(x, 0.05, z), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: u, side: THREE.DoubleSide,
    vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `varying vec3 vP; uniform float uTime; void main(){
      float d = length(vec2((vP.z - (${z.toFixed(2)})) / 1.9, vP.y / 1.6));
      float a = smoothstep(1.0, 0.1, d) * (0.5 + 0.18 * sin(uTime * 1.3 + vP.y * 3.0));
      gl_FragColor = vec4(vec3(0.2, 0.95, 0.85) * a, 1.0); }`,
  }));
  const N = 14, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = x + 0.4 + Math.random() * 2.6; pos[i * 3 + 1] = 0.4 + Math.random() * 1.5; pos[i * 3 + 2] = z + (Math.random() - 0.5) * 3; seed[i] = Math.random() * 6.28; }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  pg.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const flies = new THREE.Points(pg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: u,
    vertexShader: `attribute float aSeed; uniform float uTime; varying float vA; void main(){ float t = uTime * 0.7 + aSeed;
      vec3 p = position + vec3(sin(t) * 0.6, sin(t * 1.3 + 1.0) * 0.3, cos(t * 0.8) * 0.6);
      vA = 0.5 + 0.5 * sin(t * 2.3 + aSeed * 4.0); vA *= vA;
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = min(130.0 / max(1.0, -mv.z), 40.0); }`,
    fragmentShader: "varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float s = max(0.0, 1.0 - d); gl_FragColor = vec4(vec3(0.95, 1.0, 0.55) * s * s * vA, 1.0); }",
  }));
  // (in the picture only when the cave's mouth is: its own bounds, and nothing at all from further off than the mirador)
  pg.boundingSphere = new THREE.Sphere(new THREE.Vector3(x + 1.5, 1, z), 4.5);
  g.add(glow, flies);
  g.userData.tick = (t: number, px: number, pz: number) => { u.uTime.value = t; g.visible = (px - x) ** 2 + (pz - z) ** 2 < 70 * 70; };
  // (nothing here stands in the camera's way or is jumped onto)
  g.userData.thin = true;
  return g;
}
