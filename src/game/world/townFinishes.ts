// Small surface finishes: keep the authored solids, seats, paths and RNG while sharing their render batches.
import * as THREE from "three";
import { boxGeo, cylGeo, mat, type Merger } from "./util";
import { chamferBox } from "./shapes";

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

/** Five existing street bins, with an inset dark mouth and ribs over their original ten-sided bodies. */
export function finishStreetBin(M: Merger, x: number, z: number) {
  M.addVisual("glow-b8-bin-rim", mat("#526b5d"), cylGeo(0.307, 0.307, 0.05, x, 0.88, z, 10));
  M.addVisual("glow-b8-bin-lid", mat("#68816e"), new THREE.RingGeometry(0.105, 0.306, 10)
    .rotateX(-Math.PI / 2).translate(x, 0.907, z));
  M.addVisual("glow-b8-bin-mouth", mat("#1d2e29"), new THREE.CircleGeometry(0.105, 10)
    .rotateX(-Math.PI / 2).translate(x, 0.909, z));
  for (let i = 0; i < 10; i++) {
    const angle = (i + 0.5) * Math.PI / 5;
    M.addVisual("glow-b8-bin-rib", mat("#263f35"), new THREE.PlaneGeometry(0.028, 0.68).rotateY(angle)
      .translate(x + Math.sin(angle) * 0.289, 0.46, z + Math.cos(angle) * 0.289));
  }
}

export function finishPostOffice(M: Merger, x: number, z: number, rotation: number, width: number, doorWidth: number) {
  const place = (g: THREE.BufferGeometry) => g.rotateY(rotation).translate(x, 0, z);
  const gap = (doorWidth + 0.44) / 2, span = width / 2 - gap;
  for (const side of [-1, 1]) {
    const center = side * (gap + span / 2);
    M.addVisual("glow-b8-post-brick", mat("#a76d55"), place(new THREE.PlaneGeometry(span, 0.54).translate(center, 0.79, 0.018)));
    for (const y of [0.70, 0.88]) M.addVisual("glow-b8-post-mortar", mat("#c7b89b"),
      place(new THREE.PlaneGeometry(span, 0.018).translate(center, y, 0.021)));
    for (let row = 0; row < 3; row++) for (let joint = 1; joint <= 5; joint++) {
      const along = gap + span * (joint / 6 + (row % 2) / 12);
      M.addVisual("glow-b8-post-mortar", mat("#c7b89b"), place(new THREE.PlaneGeometry(0.015, 0.162)
        .translate(side * along, 0.61 + row * 0.18, 0.021)));
    }
    M.addVisual("glow-b8-post-stone", mat("#dad1bc"), place(new THREE.PlaneGeometry(span, 0.04).translate(center, 1.075, 0.024)));
    M.addVisual("glow-b8-post-stone", mat("#dad1bc"), place(new THREE.PlaneGeometry(0.24, 2.65)
      .translate(side * (width / 2 - 0.12), 1.835, 0.026)));
  }
}

/** Only the spare table's dust cover changes; the playable table, spare model and its collider stay intact. */
export function finishPracticeCover(M: Merger, x: number, z: number) {
  const place = (g: THREE.BufferGeometry) => g.translate(x, 0, z);
  M.addVisual("glow-b8-practice-top", mat("#66796d"), place(chamferBox(1.92, 0.10, 1.07, 0.012).translate(0, 0.88, 0)));
  for (const side of [-1, 1]) {
    for (const offset of [-0.62, 0, 0.62]) M.addVisual("glow-b8-practice-fold", mat(offset === 0 ? "#52665b" : "#5f7168"),
      place(new THREE.PlaneGeometry(0.612, 0.19).rotateY(side === 1 ? 0 : Math.PI).translate(offset, 0.785, side * 0.538)));
    M.addVisual("glow-b8-practice-fold", mat("#5f7168"), place(new THREE.PlaneGeometry(0.99, 0.19)
      .rotateY(side * Math.PI / 2).translate(side * 0.963, 0.785, 0)));
    M.addVisual("glow-b8-practice-hem", mat("#b5a77b"), place(new THREE.PlaneGeometry(1.86, 0.018)
      .rotateY(side === 1 ? 0 : Math.PI).translate(0, 0.704, side * 0.541)));
    M.addVisual("glow-b8-practice-hem", mat("#b5a77b"), place(new THREE.PlaneGeometry(0.99, 0.018)
      .rotateY(side * Math.PI / 2).translate(side * 0.966, 0.704, 0)));
    M.addVisual("glow-b8-practice-hem", mat("#b5a77b"), place(new THREE.PlaneGeometry(1.77, 0.018)
      .rotateX(-Math.PI / 2).translate(0, 0.932, side * 0.45)));
  }
}

export function finishLivingSofa(M: Merger, x: number, z: number) {
  const place = (g: THREE.BufferGeometry) => g.translate(x, 0, z);
  for (const side of [-1, 1]) {
    M.addVisual("glow-b8-sofa-seat", mat("#bf725d"), place(chamferBox(0.94, 0.09, 0.64, 0.03).translate(side * 0.5, 0.6, 0.07)));
    M.addVisual("glow-b8-sofa-back", mat("#b46653"), place(chamferBox(0.9, 0.38, 0.12, 0.04).translate(side * 0.5, 0.83, -0.17)));
    M.addVisual("glow-b8-sofa-piping", mat("#d7baa1"), place(new THREE.PlaneGeometry(0.84, 0.012).translate(side * 0.5, 0.60, 0.393)));
    M.addVisual("glow-b8-sofa-piping", mat("#d7baa1"), place(new THREE.PlaneGeometry(0.012, 0.26).translate(side * 0.5, 0.83, -0.107)));
  }
  M.addVisual("glow-b8-sofa-throw", mat("#cbb99a"), place(new THREE.PlaneGeometry(0.21, 0.72)
    .rotateX(-Math.PI / 2).translate(-1.1, 0.827, 0.02)));
  M.addVisual("glow-b8-sofa-throw", mat("#cbb99a"), place(new THREE.PlaneGeometry(0.72, 0.35)
    .rotateY(-Math.PI / 2).translate(-1.227, 0.65, 0.02)));
  M.addVisual("glow-b8-sofa-hem", mat("#9c8870"), place(new THREE.PlaneGeometry(0.72, 0.018)
    .rotateY(-Math.PI / 2).translate(-1.23, 0.49, 0.02)));
  M.addVisual("glow-b8-sofa-hem", mat("#9c8870"), place(new THREE.PlaneGeometry(0.21, 0.018)
    .rotateX(-Math.PI / 2).translate(-1.1, 0.829, 0.36)));
}

export function finishPoliceEntry(M: Merger, x: number, z: number, rotation: number, doorWidth: number) {
  const place = (g: THREE.BufferGeometry) => g.rotateY(rotation).translate(x, 0, z);
  for (const side of [-1, 1]) {
    M.addVisual("glow-b9-police-frame", mat("#536f7d"), place(new THREE.PlaneGeometry(0.16, 2.5)
      .translate(side * (doorWidth / 2 + 0.12), 1.3, 0.208)));
    M.addVisual("glow-b9-police-tile", mat("#809697"), place(new THREE.PlaneGeometry(0.95, 0.8)
      .rotateX(-Math.PI / 2).translate(side * 0.5, 0.043, 0.7)));
    M.addVisual("glow-b9-police-edge", mat("#c6beac"), place(new THREE.PlaneGeometry(0.05, 0.9)
      .rotateX(-Math.PI / 2).translate(side * 1.03, 0.045, 0.7)));
  }
  M.addVisual("glow-b9-police-frame", mat("#536f7d"), place(new THREE.PlaneGeometry(doorWidth + 0.36, 0.10).translate(0, 2.62, 0.208)));
  M.addVisual("glow-b9-police-kick", mat("#7c9197"), place(new THREE.PlaneGeometry(doorWidth - 0.28, 0.38).translate(0, 0.78, 0.138)));
}

/** Basswood case fronts and recognizable key stems, around the original miniature cars and key heads. */
export function finishRentalDisplay(M: Merger, x: number, z: number, rotation: number, width: number, height: number, sill: number) {
  const place = (g: THREE.BufferGeometry) => g.rotateY(rotation).translate(x, 0, z);
  const face = (key: string, color: string, w: number, h: number, px: number, y: number, depth: number) =>
    M.addVisual("glow-b9-rental-" + key, mat(color), place(new THREE.PlaneGeometry(w, h).translate(px, y, depth)));
  face("wood", "#b79a71", width - 0.14, 0.26, 0, sill / 2, 0.506);
  face("rail", "#cfb377", width, 0.035, 0, sill - 0.06, 0.510);
  for (const side of [-1, 1]) {
    face("joint", "#7b826c", 0.018, 0.22, side * 0.75, sill / 2, 0.509);
    face("cheek", "#ac946c", 0.07, height - 0.14, side * (width / 2 - 0.025), sill + height / 2, 0.484);
  }
  for (let i = 0; i < 6; i++) {
    const px = 0.65 + (i % 3) * 0.15, y = sill + 0.06 + 1.13 + Math.floor(i / 3) * 0.14;
    face("key", "#c3a25a", 0.018, 0.075, px, y - 0.053, 0.079);
    face("key", "#c3a25a", 0.028, 0.014, px + 0.012, y - 0.082, 0.079);
  }
}
