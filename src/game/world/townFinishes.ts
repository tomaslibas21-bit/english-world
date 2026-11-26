// Small surface finishes: keep the authored solids, seats, paths and RNG while sharing their render batches.
import * as THREE from "three";
import { boxGeo, cylGeo, mat, type Merger } from "./util";

/** Fountain benches use the opposite back orientation from streetBench. Coordinates below match their local frame. */
export function finishPlazaBench(M: Merger, x: number, z: number, rotation: number) {
  const place = (g: THREE.BufferGeometry) => g.rotateY(rotation).translate(x, 0, z);
  const wood = mat("#bc9264"), endWood = mat("#ab8058"), iron = mat("#36423d");
  for (const y of [0.64, 0.8, 0.96]) {
    M.addVisual("glow-b7-bench-wood", wood, place(new THREE.PlaneGeometry(1.72, 0.135).translate(0, y, 0.262)));
    M.addVisual("glow-b7-bench-wood", endWood, place(new THREE.PlaneGeometry(1.72, 0.135).rotateY(Math.PI).translate(0, y, 0.178)));
  }
  for (const depth of [-0.165, 0, 0.165]) M.addVisual("glow-b7-bench-seat", wood,
    place(new THREE.PlaneGeometry(1.76, 0.145).rotateX(-Math.PI / 2).translate(0, 0.552, depth)));
  for (const side of [-1, 1]) {
    M.addVisual("glow-b7-bench-iron", iron, place(boxGeo(0.12, 0.45, 0.42, side * 0.64, 0.225, 0)));
    M.addVisual("glow-b7-bench-iron", iron, place(boxGeo(0.055, 0.055, 0.5, side * 0.82, 0.72, 0)));
    M.addVisual("glow-b7-bench-iron", iron, place(boxGeo(0.055, 0.22, 0.055, side * 0.82, 0.61, -0.2)));
  }
}

export function finishBank(M: Merger, x: number, z: number, rotation: number, width: number, doorWidth: number, columnOffset: number) {
  const place = (g: THREE.BufferGeometry) => g.rotateY(rotation).translate(x, 0, z);
  for (const side of [-1, 1]) {
    M.addVisual("glow-b7-bank-foot", mat("#89948d"), place(cylGeo(0.42, 0.46, 0.2, side * columnOffset, 0.1, 0.6, 10)));
    M.addVisual("glow-b7-bank-capital", mat("#d8ccb2"), place(cylGeo(0.42, 0.42, 0.16, side * columnOffset, 4.82, 0.6, 10)));
    // Two dressed-stone panels end at the door frame; neither the glass nor the threshold is painted over.
    const inner = (doorWidth + 0.4) / 2, outer = (width + 0.3) / 2, span = outer - inner;
    const center = side * (inner + span / 2);
    M.addVisual("glow-b7-bank-stone", mat("#a3a79c"), place(new THREE.PlaneGeometry(span, 0.38).translate(center, 0.25, 0.158)));
    for (const fraction of [0.2, 0.4, 0.6, 0.8]) M.addVisual("glow-b7-bank-joint", mat("#7c877f"),
      place(new THREE.PlaneGeometry(0.018, 0.38).translate(side * (inner + span * fraction), 0.25, 0.161)));
  }
}

export function finishPoolHallDoor(M: Merger, x: number, z: number, rotation: number, width: number) {
  const place = (g: THREE.BufferGeometry) => g.rotateY(rotation).translate(x, 0, z);
  const panel = (key: string, color: string, w: number, h: number, px: number, y: number, depth: number) =>
    M.addVisual("glow-b7-pocket-" + key, mat(color), place(new THREE.PlaneGeometry(w, h).translate(px, y, depth)));
  // The old plinth projects 0.15 m beyond the wall, including across the bottom of the door.
  panel("oak", "#98754f", width - 0.28, 0.72, 0, 0.5, 0.164);
  panel("glazing", "#86a8ac", width - 0.33, 1.2, 0, 1.73, 0.138);
  for (const side of [-1, 1]) {
    panel("oak", "#98754f", 0.08, 2.3, side * (width / 2 - 0.1), 1.25, 0.164);
    panel("joint", "#715b43", 0.014, 0.66, side * 0.24, 0.5, 0.167);
  }
  panel("oak", "#98754f", width - 0.28, 0.08, 0, 0.92, 0.164);
  panel("brass", "#b99b61", width - 0.28, 0.1, 0, 0.22, 0.168);
  panel("glazing-bar", "#d4c6a4", 0.035, 1.12, 0, 1.74, 0.144);
  // Leave the original welcome mat clear, then finish the outer end of the existing path with two inset flags.
  for (const side of [-1, 1]) {
    M.addVisual("glow-b7-pocket-flag", mat("#8b9185"), place(new THREE.PlaneGeometry(1.01, 0.55)
      .rotateX(-Math.PI / 2).translate(side * 0.525, 0.028, 1.76)));
    M.addVisual("glow-b7-pocket-brass", mat("#b99b61"), place(new THREE.PlaneGeometry(0.055, 2.06)
      .rotateX(-Math.PI / 2).translate(side * 1.08, 0.028, 1.12)));
  }
}

export function finishSquarePlanter(M: Merger, x: number, z: number, sx: number, sz: number) {
  for (let side = 0; side < 4; side++) {
    const rotation = side * Math.PI / 2;
    const face = (g: THREE.BufferGeometry) => g.rotateY(rotation).translate(x, 0, z);
    M.addVisual("glow-b7-planter-cedar", mat("#ad845e"), face(new THREE.PlaneGeometry(0.92, 0.37).translate(0, 0.25, 0.506)));
    for (const offset of [-0.16, 0.16]) M.addVisual("glow-b7-planter-joint", mat("#725e48"),
      face(new THREE.PlaneGeometry(0.014, 0.37).translate(offset, 0.25, 0.509)));
  }
  const palette = ["#cb9c4b", "#b76e53", "#d7be82", "#9a6872"];
  for (const [cx, cz, radius, seed] of [[x - 0.18, z - 0.12, 0.44, sx + 2], [x + 0.22, z + 0.2, 0.36, sz + 3]]) {
    for (let i = 0; i < 4; i++) {
      const angle = i * 1.7 + seed;
      // The icosahedron encloses the original pointed bloom. Its unchanged geometry still supplies collision data.
      const bloom = new THREE.IcosahedronGeometry(radius * 0.55, 0).translate(
        cx + Math.cos(angle) * radius * 0.5, 0.46 + radius * 0.8 + (i % 2) * radius * 0.12,
        cz + Math.sin(angle) * radius * 0.5);
      M.addVisual("glow-b7-planter-bloom", mat(palette[(seed + i) % palette.length], { flat: true }), bloom);
    }
  }
}
