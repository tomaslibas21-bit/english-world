import * as THREE from "three";
import type { AddPhotoSpot } from "../../content/townQuests";
import { BUILDINGS } from "./layout";
import { boxGeo, cylGeo, mat, textTexture, type Colliders, type Merger } from "./util";

type Add = (g: THREE.BufferGeometry, color: string, options?: { flat?: boolean; emissive?: string; cast?: boolean }) => void;

export function addMapleQuestProps(merger: Merger, colliders: Colliders, group: THREE.Group, photo: AddPhotoSpot) {
  const add: Add = (g, color, { cast = true, ...options } = {}) =>
    merger.add("quest-" + color + options.flat + options.emissive, mat(color, options), g, cast);
  const placePumpkin: PlacePumpkin = (x, y, z, scale, seed) => {
    pumpkin(add, x, y, z, scale, seed);
    photo("pumpkin", x, y + scale * 0.7, z);
  };
  addDoorPumpkins(placePumpkin);
  addLobsterTruck(add, colliders, group, photo, placePumpkin);
}

function pumpkin(add: Add, x: number, y: number, z: number, r: number, k = 0) {
  add(new THREE.SphereGeometry(r, 6, 4).scale(1, 0.76, 1).translate(x, y + r * 0.74, z), ["#e8833a", "#d9692b", "#f09a3e", "#f1e3c2"][k % 4], { flat: true });
  add(boxGeo(r * 0.22, r * 0.4, r * 0.22, x, y + r * 1.6, z), "#5d7a3a");
}

type PlacePumpkin = (x: number, y: number, z: number, scale: number, seed: number) => void;

function addDoorPumpkins(placePumpkin: PlacePumpkin) {
  // --- pumpkins by the doors on Main Street and in front of the houses ---
  for (const b of BUILDINGS) {
    const n = ({ n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] } as Record<string, [number, number]>)[b.face], t: [number, number] = [-n[1], n[0]];
    const hd = b.face === "n" || b.face === "s" ? b.d / 2 : b.w / 2, off = b.doorOffset ?? 0;
    const house = b.style === "house";
    if (!house && !(b.style === "shop" || b.style === "restaurant" || b.id === "visitor" || b.id === "post")) continue;
    const dw = (b.doorWidth ?? 1.8) / 2 + (house ? 1.5 : 0.75), out = hd + (house ? 2.7 : 0.42);
    const s = (b.x + b.z) % 2 > 0 ? 1 : -1, px = b.x + n[0] * out + t[0] * (off + s * dw), pz = b.z + n[1] * out + t[1] * (off + s * dw);
    placePumpkin(px, 0, pz, 0.26, Math.abs(Math.round(b.x)));
    placePumpkin(px + t[0] * s * 0.42 + n[0] * 0.1, 0, pz + t[1] * s * 0.42 + n[1] * 0.1, 0.17, Math.abs(Math.round(b.x)) + 1);
    if (house) placePumpkin(px - t[0] * s * 0.4 + n[0] * 0.25, 0, pz - t[1] * s * 0.4 + n[1] * 0.25, 0.2, Math.abs(Math.round(b.x)) + 3);
  }
}

function addLobsterTruck(add: Add, col: Colliders, group: THREE.Group, photo: AddPhotoSpot, placePumpkin: PlacePumpkin) {
  // the truck: its cab to the north, the serving window on the east side under a striped awning
  const X = 11.4, Z = -31;
  photo("food_truck", X, 1.9, Z);
  const body = "#2a9d8f", cream = "#f6ecd9", dark = "#2b3338";
  add(boxGeo(2.4, 2.3, 4.5, X, 1.7, Z + 0.75), body);
  add(boxGeo(2.42, 0.34, 4.52, X, 0.95, Z + 0.75), cream, { cast: false });
  add(boxGeo(2.3, 1.45, 1.5, X, 1.28, Z - 2.25), body);
  add(boxGeo(2.1, 0.62, 0.06, X, 1.62, Z - 3.0), "#9ccbe6", { emissive: "#1b3a4c", cast: false });
  for (const s of [-1, 1]) add(boxGeo(0.06, 0.5, 0.8, X + s * 1.15, 1.62, Z - 2.4), "#9ccbe6", { emissive: "#1b3a4c", cast: false });
  add(boxGeo(2.34, 0.3, 0.2, X, 0.62, Z - 3.02), "#c9cfd4");
  for (const s of [-1, 1]) add(boxGeo(0.3, 0.16, 0.05, X + s * 0.85, 0.95, Z - 3.02), "#fff4c4", { emissive: "#a08a3a", cast: false });
  for (const [wx, wz] of [[-1.1, -2.2], [1.1, -2.2], [-1.1, 1.9], [1.1, 1.9]]) add(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10).rotateZ(Math.PI / 2).translate(X + wx, 0.42, Z + wz), "#22252a");
  add(boxGeo(2.44, 0.1, 4.56, X, 2.88, Z + 0.75), cream);
  add(boxGeo(0.7, 0.3, 0.7, X - 0.3, 3.06, Z + 2.1), "#c9cfd4"); // the roof vent
  // the window: a dark opening, its shelf, what stands on it
  add(boxGeo(0.06, 0.95, 2.7, X + 1.2, 2.0, Z + 0.8), dark, { cast: false });
  add(boxGeo(0.42, 0.06, 2.9, X + 1.38, 1.5, Z + 0.8), "#e9e2d2");
  for (const [dz, cc] of [[-0.9, "#c8392f"], [-0.72, "#f2c14e"], [0.2, "#f6ecd9"], [0.38, "#f6ecd9"]] as [number, string][]) add(cylGeo(0.05, 0.05, 0.2, X + 1.42, 1.63, Z + 0.8 + dz, 6), cc, { cast: false });
  add(boxGeo(0.2, 0.14, 0.3, X + 1.4, 1.6, Z + 1.75), "#8a939b", { cast: false });
  // the awning: five stripes sloping out over the window, on two struts
  for (let i = 0; i < 6; i++) add(boxGeo(1.25, 0.05, 0.5, 0.6, 0, 0).rotateZ(-0.32).translate(X + 1.2, 2.72, Z - 0.45 + i * 0.5), i % 2 ? cream : "#c8392f");
  for (const dz of [-0.65, 2.25]) add(boxGeo(1.2, 0.04, 0.04, 0.58, 0, 0).rotateZ(0.42).translate(X + 1.2, 1.86, Z + dz), "#c9cfd4", { cast: false });
  // a lobster on the roof, as such trucks have: body, tail, two claws held up, feelers
  const R = "#d6402f";
  add(new THREE.CapsuleGeometry(0.3, 0.8, 3, 8).rotateX(Math.PI / 2).translate(X, 3.28, Z + 0.5), R, { flat: true });
  for (let i = 0; i < 3; i++) add(boxGeo(0.5 - i * 0.08, 0.2 - i * 0.03, 0.3, X, 3.2 - i * 0.03, Z + 1.3 + i * 0.28), R);
  add(boxGeo(0.7, 0.06, 0.3, X, 3.1, Z + 2.12), R);
  for (const s of [-1, 1]) {
    add(boxGeo(0.12, 0.12, 0.7, 0, 0, -0.3).rotateY(-s * 0.5).rotateX(0.5).translate(X + s * 0.3, 3.4, Z - 0.1), R);
    add(new THREE.SphereGeometry(0.24, 6, 4).scale(0.8, 0.6, 1.3).translate(X + s * 0.68, 3.78, Z - 0.75), R, { flat: true });
    add(cylGeo(0.012, 0.012, 0.7, 0, 0.35, 0, 3).rotateX(-1.0).rotateY(-s * 0.3).translate(X + s * 0.1, 3.4, Z - 0.1), "#8a2a1f", { cast: false });
    for (let i = 0; i < 3; i++) add(boxGeo(0.36, 0.04, 0.05, s * 0.4, 0, 0).rotateZ(-s * 0.5).translate(X, 3.24, Z + 0.3 + i * 0.22), R, { cast: false });
  }
  col.addBox(X, Z, 2.7, 6.3);
  // its name over the window, towards the square
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.42), new THREE.MeshBasicMaterial({ map: textTexture("Harbor Lobster Rolls", { bg: "#fffaf0", fg: "#b5382c", w: 512, h: 74 }) }));
  // (a board standing on the roof's edge, clear of the awning below it)
  sign.position.set(X + 1.215, 3.16, Z + 0.8);
  sign.rotation.y = Math.PI / 2;
  group.add(sign);
  add(boxGeo(0.06, 0.5, 2.98, X + 1.18, 3.16, Z + 0.8), "#b5382c", { cast: false });
  // two standing tables, a menu board on its legs, a crate of pumpkins
  for (const [tx, tz] of [[15.9, -33.4], [16.2, -29.3]]) {
    add(cylGeo(0.42, 0.42, 0.05, tx, 1.06, tz, 12), cream); add(cylGeo(0.04, 0.04, 1.05, tx, 0.52, tz, 6), "#3a3d42"); add(cylGeo(0.26, 0.28, 0.04, tx, 0.02, tz, 10), "#3a3d42", { cast: false });
    add(cylGeo(0.035, 0.035, 0.16, tx + 0.12, 1.16, tz - 0.08, 6), "#c8392f", { cast: false }); add(cylGeo(0.035, 0.035, 0.16, tx + 0.02, 1.16, tz + 0.1, 6), "#f2c14e", { cast: false });
    add(boxGeo(0.14, 0.1, 0.12, tx - 0.14, 1.13, tz), "#e9e2d2", { cast: false });
    col.addCircle(tx, tz, 0.44);
  }
  for (const s of [-1, 1]) add(boxGeo(0.62, 1.0, 0.04, 0, 0.5, 0).rotateX(s * 0.2).translate(14.1, 0, -27.3 + s * 0.14), "#2f3a33");
  for (let i = 0; i < 4; i++) add(boxGeo(0.4 - (i % 2) * 0.1, 0.03, 0.01, 14.1, 0.78 - i * 0.14, -27.02 - i * 0.026), "#f6ecd9", { cast: false });
  col.addBox(14.1, -27.3, 0.7, 0.5);
  add(boxGeo(0.8, 0.4, 0.6, 12.4, 0.2, -27.2), "#9c6b43");
  placePumpkin(12.2, 0.4, -27.25, 0.2, 0); placePumpkin(12.62, 0.4, -27.15, 0.17, 2); placePumpkin(13.0, 0, -26.9, 0.24, 1);
  col.addBox(12.4, -27.2, 0.85, 0.65);
}
