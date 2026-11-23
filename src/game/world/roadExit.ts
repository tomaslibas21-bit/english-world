import * as THREE from "three";
import { ROAD_EDITION } from "../../content/road";
import { ROAD_LOOK } from "../road/look";
import { groundPalette } from "./styled";
import { colourMerge, textTexture, type Colliders } from "./util";

const { edge } = ROAD_EDITION;
const { lerp, smoothstep } = THREE.MathUtils;
const nx = Math.sin(edge.outward), nz = Math.cos(edge.outward);
export const CREST_DISTANCE = 32;
export const ASPHALT_END = 2.3 - CREST_DISTANCE;
const CREST_HEIGHT = 1.32;
export const ROAD_HALF = 6.3;
export const LANE = 4;
export const EXIT_SHARED_LENGTH = 64;
export const EXIT_VERGE = 34;
export const EXIT_ASPHALT = "#5b626b";
export const EXIT_HAZE = { near: 120, far: 180 };

const yaw = edge.outward - Math.PI;
const origin = new THREE.Vector3(edge.x + nx * CREST_DISTANCE, CREST_HEIGHT, edge.z + nz * CREST_DISTANCE);
export const exitToTown = new THREE.Matrix4().makeRotationY(yaw).setPosition(origin);
export const townToExit = exitToTown.clone().invert();
export const exitRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

export function exitCoordinates(x: number, z: number) {
  const dx = x - origin.x, dz = z - origin.z;
  return { s: dx * nx + dz * nz, x: dz * nx - dx * nz };
}

export const roadCenter = (s: number) => (7 * Math.sin(s / 55) + 3 * Math.sin(s / 24)) * smoothstep(s, 0, 50);
export const roadHeight = (s: number) => s < 0 ? -CREST_HEIGHT * (1 - smoothstep(s, ASPHALT_END, 0))
  : (1.1 * Math.sin(s / 31) + 0.7 * Math.sin(s / 71)) * smoothstep(s, 5, 60) - 0.75 * Math.sin(Math.PI * smoothstep(s, 0, 52));
export const exitHalf = (s: number) => lerp(edge.width / 2, ROAD_HALF, smoothstep(s, ASPHALT_END, -4));
export const exitHeight = (x: number, z: number) => {
  const { s } = exitCoordinates(x, z);
  return CREST_HEIGHT + roadHeight(Math.min(s, 0));
};

export function onExitAsphalt(x: number, z: number) {
  const p = exitCoordinates(x, z);
  return p.s >= ASPHALT_END && p.s <= 4 && Math.abs(p.x) <= exitHalf(p.s);
}

export function keepOnExit(point: { x: number; z: number }, radius: number) {
  const { s, x } = exitCoordinates(point.x, point.z);
  const wide = exitHalf(s) - radius;
  const side = THREE.MathUtils.clamp(x, -wide, wide);
  point.x -= (side - x) * nz;
  point.z += (side - x) * nx;
}

export function exitSightline(x: number, z: number, halfX: number, halfZ: number) {
  const p = exitCoordinates(x, z);
  const far = p.s + Math.abs(nx) * halfX + Math.abs(nz) * halfZ;
  return far > 32 && Math.abs(p.x) < Math.min(310, EXIT_VERGE + far) + Math.abs(nz) * halfX + Math.abs(nx) * halfZ;
}

/** Town ground and water must not show through the low parts of the desert dunes. */
export function exitBackdropCutout(position: string) {
  const vec = (x: number, z: number) => `vec2(${x.toFixed(6)}, ${z.toFixed(6)})`;
  return `
    vec2 exitDelta = ${position}.xz - ${vec(origin.x, origin.z)};
    float exitDistance = dot(exitDelta, ${vec(nx, nz)});
    float exitSide = dot(exitDelta, ${vec(-nz, nx)});
    if (exitDistance >= 0.0 && abs(exitSide) < min(310.0, ${EXIT_VERGE}.0 + exitDistance)) discard;
  `;
}

export const exitPostTops = [-1, 1].map((side) =>
  new THREE.Vector3(roadCenter(9) + side * (ROAD_HALF + 1.05), roadHeight(9) + 1.02, -9));

/** The connecting asphalt and its incoming verge, in road-local coordinates. */
export function makeExitGeometry() {
  const parts: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [];
  const verge: typeof parts = [];
  const palette = groundPalette();
  const town = new THREE.Color(palette.grass);
  const sand = new THREE.Color(ROAD_LOOK.sand[0]);
  const shoulder = new THREE.Color(ROAD_LOOK.shoulder);
  const road = new THREE.Color(EXIT_ASPHALT);
  const townRoad = new THREE.Color(palette.road);
  const sections = [ASPHALT_END, -28, -24, -20, -16, -12, -8, -4, 0, ...Array.from({ length: 32 }, (_, i) => 2 * (i + 1))];
  const point = (s: number, x: number, lift: number) => new THREE.Vector3(roadCenter(s) + x, roadHeight(s) + lift, -s);
  const strip = (s: number, e: number, a: number, b: number, c: number, d: number, y: number,
    color: THREE.ColorRepresentation, into = parts) => {
    const tl = point(s, a, y), tr = point(s, b, y), bl = point(e, c, y), br = point(e, d, y);
    into.push([new THREE.BufferGeometry().setFromPoints([tl, tr, bl, tr, br, bl]), color]);
  };
  for (let i = 1; i < sections.length; i++) {
    const s = sections[i - 1], e = sections[i], half = exitHalf(s), endHalf = exitHalf(e);
    const desert = smoothstep((s + e) / 2, ASPHALT_END, -5);
    const vergeEdge = (distance: number) => lerp(edge.width / 2 + 3.1, EXIT_VERGE, smoothstep(distance, ASPHALT_END, -14));
    strip(s, e, -half, half, -endHalf, endHalf, 0, townRoad.clone().lerp(road, desert));
    for (const side of [-1, 1]) {
      const band = (a: number, b: number, c: number, d: number, y: number, color: THREE.ColorRepresentation, into = parts) => {
        if (side < 0) strip(s, e, -b, -a, -d, -c, y, color, into);
        else strip(s, e, a, b, c, d, y, color, into);
      };
      if (s < 0) {
        band(half, half + 1.25, endHalf, endHalf + 1.25, -0.018, shoulder);
        band(half + 1.25, vergeEdge(s), endHalf + 1.25, vergeEdge(e), -0.018, town.clone().lerp(sand, desert), verge);
      }
      band(half - 0.30, half - 0.16, endHalf - 0.30, endHalf - 0.16, 0.025, "#f3c982");
    }
  }
  // The town's centre dashes branch into the two lane dividers.
  for (let s = ASPHALT_END; s < -12; s += 4.5) {
    const end = Math.min(s + 2.5, -12);
    strip(s, end, -0.08, 0.08, -0.08, 0.08, 0.027, palette.centerLine);
  }
  for (const side of [-1, 1]) for (let s = -14; s < EXIT_SHARED_LENGTH; s += 8) {
    const end = s + 3;
    const lane = (d: number) => side * LANE / 2 * smoothstep(d, -15, 0);
    strip(s, end, lane(s) - 0.045, lane(s) + 0.045, lane(end) - 0.045, lane(end) + 0.045, 0.026, "#eee6d7");
  }
  for (const s of [-18, -5, 9, 23, 44]) for (const side of [-1, 1]) {
    const base = point(s, (exitHalf(s) + 1.05) * side, 0);
    parts.push([new THREE.BoxGeometry(0.14, 1.02, 0.18).translate(base.x, base.y + 0.51, base.z), "#efe0bb"]);
    parts.push([new THREE.BoxGeometry(0.11, 0.20, 0.028).translate(base.x, base.y + 0.81, base.z + 0.101), "#b65e38"]);
  }
  // Sloped talus, a sediment band and a sheer cap form two silhouettes on either shoulder.
  for (const [s, x, w, h, spin] of [[54, -27, 12, 5.6, 0.3], [62, -38, 17, 8.9, 0.8],
    [77, 34, 16, 6.6, 0.5], [81, 46, 22, 9.4, 0.1], [101, -52, 20, 8.5, 0.9], [114, 59, 27, 11.7, 0.2]]) {
    const base = point(s, x, -0.25);
    const tier = (bottom: number, top: number, y0: number, y1: number, colour: THREE.ColorRepresentation) =>
      parts.push([new THREE.CylinderGeometry(top, bottom, y1 - y0, 7).rotateY(spin)
        .scale(w * 0.78, h, w).translate(base.x, base.y + (y0 + y1) * h / 2, base.z), colour]);
    tier(1, 0.57, 0, 0.51, ROAD_LOOK.rock[1]);
    tier(0.57, 0.56, 0.51, 0.60, ROAD_LOOK.sand[2]);
    tier(0.56, 0.48, 0.60, 1, ROAD_LOOK.rock[0]);
  }
  return { strip: colourMerge(parts), verge: colourMerge(verge) };
}

export function makeExitSign(colliders?: Colliders) {
  const { x, z, rot } = ROAD_EDITION.edge.sign;
  const root = new THREE.Group();
  root.name = "desert-road-sign";
  root.position.set(x, 0, z);
  root.rotation.y = rot;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 0.9), new THREE.MeshBasicMaterial({
    map: textTexture(ROAD_EDITION.sign, { bg: "#27634e", fg: "#fff8df", w: 768, h: 144 }),
    side: THREE.DoubleSide,
    alphaTest: 0.5,
  }));
  face.name = "desert-road-sign-face";
  face.position.set(0, 2.4, 0.09);
  const postColor = "#867e65";
  const posts: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [];
  for (const side of [-1, 1]) {
    const offset = side * 1.85;
    posts.push([new THREE.BoxGeometry(0.11, 2.45, 0.11).translate(offset, 1.225, 0), postColor]);
    colliders?.addCircle(x + offset * Math.cos(rot), z - offset * Math.sin(rot), 0.1);
  }
  root.add(face, new THREE.Mesh(colourMerge(posts), new THREE.MeshLambertMaterial({ vertexColors: true })));
  return { root, face };
}
