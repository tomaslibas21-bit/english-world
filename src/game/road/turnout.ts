// The last stretch of Main Street, looking west. Coordinates here are relative to
// the end of the town asphalt, with negative X continuing into the desert.
import * as THREE from "three";
import { ROAD_EDITION } from "../../content/road";
import { WORLD } from "../world/layout";
import { colourMerge, rand, textTexture } from "../world/util";
import { cactus } from "./props";

export const turnoutOrigin = new THREE.Vector3(WORLD.minX, 0, ROAD_EDITION.edge.z);

type Part = [THREE.BufferGeometry, THREE.ColorRepresentation];

// Distance west, road centre, near and far limits of the sandy verge.
const sections = [
  [0, 0, -9, 6], [4.5, 0.35, -12, 8], [6.75, 1.4, -13, 10],
  [11.25, 5.1, -14, 15], [13.5, 6.4, -15, 17], [15.75, 7.15, -16, 19],
  [27, 8.5, -24, 31], [45, 4.5, -43, 46], [72, 9, -64, 68],
  [108, 18, -82, 96], [162, 21, -110, 125],
];

export function turnoutHeight(x: number) {
  return 0.008 + Math.max(0, -x - 13.5) * 0.023;
}

function roadbed(parts: Part[]) {
  const half = ROAD_EDITION.edge.width / 2;
  const asphalt = "#586068", chalk = "#eae4cc", gravel = "#c4a078";
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
      strip(Math.floor(s / 2.25) % 2 ? asphalt : "#edc366",
        centre(s) - 0.09, centre(s) + 0.09, centre(e) - 0.09, centre(e) + 0.09, s, e);
    }
  }
  for (const [colour, vertices] of surfaces) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    parts.push([g, colour]);
  }
}

export function makeTurnout() {
  const parts: Part[] = [];
  roadbed(parts);
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, colour: string) =>
    parts.push([new THREE.BoxGeometry(w, h, d).translate(x, y, z), colour]);

  // A little enamel route marker. Its sun and banded cliffs repeat the skyline behind it.
  const sx = -18.5, sz = 0.55;
  for (const dz of [-1.02, 1.02]) {
    box(sx - 0.10, 1.3, sz + dz, 0.16, 2.6, 0.17, "#87644c");
    box(sx - 0.10, 0.32, sz + dz, 0.19, 0.64, 0.20, "#594d47");
  }
  box(sx, 2.67, sz, 0.16, 0.91, 3.12, "#275b57");
  const disc = (r: number, x: number, y: number, colour: string) =>
    parts.push([new THREE.CylinderGeometry(r, r, 0.08, 16).rotateZ(Math.PI / 2).translate(x, y, sz), colour]);
  disc(0.61, sx - 0.01, 3.34, "#305e58");
  disc(0.52, sx + 0.04, 3.34, "#ffe1a1");
  disc(0.34, sx + 0.09, 3.36, "#e99250");
  box(sx + 0.14, 3.19, sz, 0.035, 0.16, 0.80, "#a95f47");
  box(sx + 0.14, 3.31, sz - 0.14, 0.035, 0.12, 0.30, "#a95f47");

  // Split rails turn away from the turnout. Reflector posts continue around the bend.
  for (let i = 0; i < 5; i++) {
    const x = -15.3 - i * 2.3;
    box(x, 0.54, -4.1, 0.16, 1.08, 0.18, "#805e49");
    if (i < 4) for (const y of [0.38, 0.8]) box(x - 1.15, y, -4.02, 2.34, 0.12, 0.10, "#af865e");
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
  mesh.position.copy(turnoutOrigin);
  mesh.receiveShadow = true;
  const map = textTexture(ROAD_EDITION.sign, { bg: "#275b57", fg: "#fff3d3", border: "#eddaa4", w: 512, h: 138 });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 0.89), new THREE.MeshBasicMaterial({ map, alphaTest: 0.5, toneMapped: false }));
  label.name = "turnout-sign";
  label.position.set(sx + 0.085, 2.67, sz);
  label.rotation.y = Math.PI / 2;
  mesh.add(label);
  return {
    mesh,
    dispose() {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      mesh.material.dispose();
      label.geometry.dispose();
      label.material.dispose();
      map.dispose();
    },
  };
}
