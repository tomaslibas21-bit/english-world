// Coordinates are relative to the end of the town asphalt. Local -X continues
// into the desert and local -Z is the roadside where the learner waits.
import * as THREE from "three";
import { ROAD_EDITION } from "../../content/road";
import { WORLD } from "../world/layout";
import { groundPalette } from "../world/styled";
import { colourMerge, rand } from "../world/util";
import type { RoadHost } from "./entry";
import { cactus } from "./props";

const { edge } = ROAD_EDITION;
const south = Math.cos(edge.outward) > 0.5;
const turnoutOrigin = south ? new THREE.Vector3(edge.x, 0, WORLD.maxZ) : new THREE.Vector3(WORLD.minX, 0, edge.z);
export const turnoutYaw = edge.outward + Math.PI / 2;
const up = new THREE.Vector3(0, 1, 0);

export function turnoutPoint(x: number, y: number, z: number) {
  return new THREE.Vector3(x, y, z).applyAxisAngle(up, turnoutYaw).add(turnoutOrigin);
}

type Part = [THREE.BufferGeometry, THREE.ColorRepresentation];

// Distance from town, road centre, then the near and far limits of the sandy verge.
const sections = [
  [0, 0, -9, 9], [4.5, 0.35, -12, 12], [6.75, 1.4, -13, 13],
  [11.25, 5.1, -14, 15], [13.5, 6.4, -15, 17], [15.75, 7.15, -16, 19],
  [27, 8.5, -33, 38], [45, 4.5, -46, 52], [72, 9, -66, 68],
  [108, 18, -82, 96], [162, 21, -110, 125],
];

export function turnoutHeight(x: number) {
  return 0.008 + Math.max(0, -x - 13.5) * 0.023;
}

function roadbed(parts: Part[]) {
  const half = ROAD_EDITION.edge.width / 2;
  const { road: asphalt, centerLine } = groundPalette();
  const chalk = "#eae4cc", gravel = "#c4a078";
  const surfaces = new Map<string, number[]>();
  for (let i = 1; i < sections.length; i++) {
    const [start, from, nearA, farA] = sections[i - 1], [end, to, nearB, farB] = sections[i];
    // Adjacent strips share edges so the paint stays clean all the way to the crest.
    const strip = (colour: string, a: number, b: number, c: number, d: number, s = start, e = end) => {
      let vertices = surfaces.get(colour);
      if (!vertices) surfaces.set(colour, vertices = []);
      const y0 = turnoutHeight(-s), y1 = turnoutHeight(-e);
      vertices.push(-s, y0, a, -e, y1, c, -e, y1, d, -s, y0, a, -e, y1, d, -s, y0, b);
    };
    strip("#d9b383", nearA, from - half - 0.65, nearB, to - half - 0.65);
    strip("#e3bb8f", from + half + 0.65, farA, to + half + 0.65, farB);
    for (const side of [-1, 1]) {
      const band = (colour: string, inner: number, outer: number) => {
        const a = Math.min(side * inner, side * outer), b = Math.max(side * inner, side * outer);
        strip(colour, from + a, from + b, to + a, to + b);
      };
      band(asphalt, 0.09, half - 0.56);
      band(chalk, half - 0.56, half - 0.44);
      band(asphalt, half - 0.44, half);
      band(gravel, half, half + 0.65);
    }
    const centre = (s: number) => THREE.MathUtils.lerp(from, to, (s - start) / (end - start));
    for (let s = start; s < end; s += 2.25) {
      const e = Math.min(end, s + 2.25);
      strip(Math.floor(s / 2.25) % 2 ? asphalt : centerLine,
        centre(s) - 0.09, centre(s) + 0.09, centre(e) - 0.09, centre(e) + 0.09, s, e);
    }
  }
  for (const [colour, vertices] of surfaces) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    parts.push([g, colour]);
  }
}

export function makeTurnout(roadSign: RoadHost["roadSign"]) {
  const parts: Part[] = [];
  roadbed(parts);
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, colour: string) =>
    parts.push([new THREE.BoxGeometry(w, h, d).translate(x, y, z), colour]);

  // Reuse the town sign at the turnout, with its posts baked into the scenery.
  const sx = -18.5, sz = 0.25, sy = turnoutHeight(sx);
  const signPosts = roadSign.postGeometry.clone().rotateY(Math.PI / 2).translate(sx, sy, sz);
  parts.push([signPosts, roadSign.postColor]);

  // Split rails turn away from the turnout. Reflector posts continue around the bend.
  for (let i = 0; i < 5; i++) {
    const x = -15.3 - i * 2.3;
    box(x, turnoutHeight(x) + 0.54, -4.1, 0.16, 1.08, 0.18, "#805e49");
    if (i < 4) for (const y of [0.38, 0.8]) {
      const mid = x - 1.15;
      box(mid, turnoutHeight(mid) + y, -4.02, 2.34, 0.12, 0.10, "#af865e");
    }
  }
  for (const [x, z] of [[-10, 10], [-20, 13.5], [-32, 13.4], [-46, 10.5]]) {
    const y = turnoutHeight(x);
    box(x, y + 0.47, z, 0.14, 0.94, 0.18, "#efe0bb");
    box(x + 0.075, y + 0.76, z, 0.025, 0.18, 0.13, "#b65e38");
  }

  for (const [x, z, scale] of [[-21, 15, 1.15], [-26, -4.8, 0.83], [-41, -7, 1.35], [-52, 18, 1.0]]) {
    for (const [g, colour] of cactus()) parts.push([g.scale(scale, scale, scale)
      .rotateY(1.1).translate(x, turnoutHeight(x), z), colour]);
  }
  const r = rand(6612);
  for (const [x, z] of [[-7, -9.5], [-13, -4.7], [-19, 13], [-23, -6], [-34, 16]]) {
    for (let i = 0; i < 4; i++) {
      const size = 0.15 + r() * 0.43;
      parts.push([new THREE.DodecahedronGeometry(size).scale(1.45, 0.68, 1).rotateY(r() * 4)
        .translate(x + r() * 1.8, size * 0.25 + turnoutHeight(x), z + r()),
      i % 2 ? "#b68a66" : "#c89c75"]);
    }
  }

  // Talus slopes, a pale sediment band and a sheer cap. Adjacent buttes form stepped silhouettes.
  for (const [x, z, w, h, spin] of [
    [-52, -15, 12, 5.6, 0.3], [-55, -6.2, 5, 3.9, 0.8], [-68, 32, 16, 6.6, 0.5],
    [-70, 19.9, 4.7, 7.4, 0.1], [-100, 1, 11, 7.5, 0.9], [-130, 45, 22, 8.7, 0.2],
  ]) {
    const tier = (bottom: number, top: number, y0: number, y1: number, colour: string) =>
      parts.push([new THREE.CylinderGeometry(top, bottom, y1 - y0, 7).rotateY(spin)
        .scale(w * 0.78, h, w).translate(x, (y0 + y1) * h / 2 + turnoutHeight(x) - 0.35, z), colour]);
    tier(1, 0.57, 0, 0.51, "#bd8069");
    tier(0.57, 0.56, 0.51, 0.60, "#e2ad82");
    tier(0.56, 0.48, 0.60, 1, "#bd7359");
  }

  const mesh = new THREE.Mesh(colourMerge(parts), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.name = "road-turnout";
  mesh.position.copy(turnoutOrigin);
  mesh.rotation.y = turnoutYaw;
  mesh.receiveShadow = true;
  const label = roadSign.face.clone();
  label.name = "turnout-sign";
  label.position.set(sx + roadSign.face.position.z, sy + roadSign.face.position.y, sz);
  label.rotation.y = Math.PI / 2;
  mesh.add(label);
  const signVisible = roadSign.root.visible;
  roadSign.root.visible = false;
  return {
    mesh,
    dispose() {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      mesh.material.dispose();
      roadSign.root.visible = signVisible;
    },
  };
}
