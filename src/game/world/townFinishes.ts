// Small surface finishes: keep the authored solids, seats, paths and RNG while sharing their render batches.
import * as THREE from "three";
import { boxGeo, cylGeo, mat, type Merger } from "./util";
import { chamferBox, mumHead } from "./shapes";

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
      const bloom = mumHead(radius * 0.48).rotateY(angle).translate(
        cx + Math.cos(angle) * radius * 0.5, 0.46 + radius * 0.96 + (i % 2) * radius * 0.12,
        cz + Math.sin(angle) * radius * 0.5);
      M.addVisual("glow-b7-planter-bloom", mat(palette[(seed + i) % palette.length], { flat: true }), bloom);
    }
  }
}

/** Five existing street bins, with an inset dark mouth and ribs over their original ten-sided bodies. */
export function finishStreetBin(M: Merger, x: number, z: number) {
  M.addVisual("glow-b8-bin-rim", mat("#526b5d"), cylGeo(0.307, 0.307, 0.05, x, 0.88, z, 10));
  M.addVisual("glow-b8-bin-lid", mat("#68816e"), new THREE.RingGeometry(0.16, 0.306, 10)
    .rotateX(-Math.PI / 2).translate(x, 0.907, z));
  M.addVisual("glow-b8-bin-mouth", mat("#1d2e29"), new THREE.CircleGeometry(0.16, 10)
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
  M.addVisual("glow-b8-practice-top", mat("#66796d"), place(chamferBox(1.92, 0.052, 1.07, 0.022).translate(0, 0.904, 0)));
  // A crease radiates in from each pulled corner of the cover.
  for (const side of [-1, 1]) {
    const pleat = new THREE.Shape().moveTo(-0.86, -0.48).lineTo(-0.49, -0.24)
      .lineTo(-0.74, -0.47).closePath();
    M.addVisual("glow-b8-practice-fold", mat("#5f7168"), place(new THREE.ShapeGeometry(pleat)
      .rotateX(-Math.PI / 2).rotateY(side === 1 ? 0 : Math.PI).translate(0, 0.931, 0)));
    // Carry the binding along the same uneven lower edge as the cloth.
    // Follow one long edge and the adjoining short edge. Rotating the pair closes all four corners.
    const edge = [
      [-0.962, 0.538, 0.746], [-0.33, 0.541, 0.695], [0.27, 0.538, 0.729],
      [0.962, 0.538, 0.757], [0.962, -0.538, 0.746],
    ];
    for (let i = 0; i < edge.length - 1; i++) {
      const panel = (binding: boolean) => {
        const g = new THREE.PlaneGeometry(1, 1);
        const pos = g.getAttribute("position");
        for (let vertex = 0; vertex < 4; vertex++) {
          const [u, depth, hem] = edge[i + vertex % 2];
          const y = vertex < 2 ? (binding ? hem + 0.018 : 0.910) : hem;
          const lift = binding ? 1.003 : 1;
          pos.setXYZ(vertex, u * lift, y, depth * lift);
        }
        g.computeVertexNormals();
        return place(g.rotateY(side === 1 ? 0 : Math.PI));
      };
      M.addVisual("glow-b8-practice-fold", mat(i === 1 ? "#52665b" : "#5f7168"), panel(false));
      M.addVisual("glow-b8-practice-hem", mat("#b5a77b"), panel(true));
    }
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
  M.addVisual("glow-b8-sofa-throw", mat("#cbb99a"), place(new THREE.PlaneGeometry(0.21, 0.812)
    .rotateX(-Math.PI / 2).translate(-1.1, 0.827, 0.046)));
  M.addVisual("glow-b8-sofa-throw", mat("#cbb99a"), place(new THREE.PlaneGeometry(0.72, 0.35)
    .rotateY(-Math.PI / 2).translate(-1.227, 0.65, 0.02)));
  M.addVisual("glow-b8-sofa-hem", mat("#9c8870"), place(new THREE.PlaneGeometry(0.72, 0.018)
    .rotateY(-Math.PI / 2).translate(-1.23, 0.49, 0.02)));
  M.addVisual("glow-b8-sofa-hem", mat("#9c8870"), place(new THREE.PlaneGeometry(0.21, 0.018)
    .rotateX(-Math.PI / 2).translate(-1.1, 0.829, 0.36)));
  M.addVisual("glow-b8-sofa-throw", mat("#cbb99a"), place(new THREE.PlaneGeometry(0.21, 0.34).translate(-1.1, 0.657, 0.452)));
  for (const y of [0.514, 0.55]) M.addVisual("glow-b8-sofa-hem", mat("#9c8870"), place(
    new THREE.PlaneGeometry(0.21, 0.018).translate(-1.1, y, 0.455)));
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

/** Straw faces stop short of the original raised binding straps; the stacked boxes remain the physical bales. */
export function finishHarvestBale(M: Merger, x: number, y: number, z: number, rotation: number) {
  const place = (g: THREE.BufferGeometry) => g.rotateY(rotation).translate(x, y, z);
  for (const [left, right] of [[-0.48, -0.31], [-0.25, 0.25], [0.31, 0.48]]) {
    const width = right - left, center = (left + right) / 2;
    for (const side of [-1, 1]) {
      const face = (g: THREE.BufferGeometry) => place(g.rotateY(side === 1 ? 0 : Math.PI).translate(center, 0, side * 0.278));
      M.addVisual("glow-b10-bale-straw", mat("#d7bb7e"), face(new THREE.PlaneGeometry(width, 0.38).translate(0, 0.25, 0)));
      for (const h of [0.15, 0.29]) M.addVisual("glow-b10-bale-grain", mat("#b69b62"),
        face(new THREE.PlaneGeometry(width * (h < 0.2 ? 0.76 : 0.60), 0.023)
          .rotateZ((h < 0.2 ? 0.14 : -0.19) * side).translate(0, h, 0.003)));
    }
    M.addVisual("glow-b10-bale-top", mat("#e4cb91"), place(new THREE.PlaneGeometry(width, 0.5)
      .rotateX(-Math.PI / 2).translate(center, 0.502, 0)));
  }
  for (const side of [-1, 1]) M.addVisual("glow-b10-bale-end", mat("#c4a66c"), place(new THREE.PlaneGeometry(0.48, 0.4)
    .rotateY(side * Math.PI / 2).translate(side * 0.502, 0.25, 0)));
}

/** Inset timber on the truck's two existing standing tables; condiments and the original round slabs stay put. */
export function finishStandingTable(M: Merger, x: number, z: number) {
  const place = (g: THREE.BufferGeometry) => g.translate(x, 0, z);
  M.addVisual("glow-b10-standing-top", mat("#c5a97c"), place(new THREE.CircleGeometry(0.386, 12).rotateX(-Math.PI / 2).translate(0, 1.088, 0)));
  M.addVisual("glow-b10-standing-rim", mat("#8b785c"), place(new THREE.RingGeometry(0.386, 0.415, 12).rotateX(-Math.PI / 2).translate(0, 1.09, 0)));
  for (const depth of [-0.13, 0.13]) M.addVisual("glow-b10-standing-joint", mat("#998465"),
    place(new THREE.PlaneGeometry(0.68, 0.012).rotateX(-Math.PI / 2).translate(0, 1.091, depth)));
  for (const [height, center] of [[0.09, 0.98], [0.12, 0.1]]) M.addVisual("glow-b10-standing-collar", mat("#5e6e69"),
    place(new THREE.CylinderGeometry(0.068, 0.068, height, 6, 1, true).translate(0, center, 0)));
}

/** Ten tapered stave faces follow the old barrel facets, leaving both original hoops in front. */
export function finishCurbBarrel(M: Merger, x: number, z: number) {
  const face = (angle: number, low: number, high: number, half: number, center = 0.5, offset = 0.003) => {
    const points: number[] = [];
    // Interpolate the existing ten-sided cone's facet, with a small outward offset to avoid coincident faces.
    const point = (y: number, side: number) => {
      const radius = 0.3 + y * 0.12, a = angle - Math.PI / 10, b = angle + Math.PI / 10;
      const mix = center + side * half;
      return [x + radius * (Math.sin(a) * (1 - mix) + Math.sin(b) * mix) + Math.sin(angle) * offset,
        y, z + radius * (Math.cos(a) * (1 - mix) + Math.cos(b) * mix) + Math.cos(angle) * offset];
    };
    const q = [point(low, -1), point(low, 1), point(high, 1), point(high, -1)];
    for (const i of [0, 1, 2, 0, 2, 3]) points.push(...q[i]);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    g.computeVertexNormals();
    return g;
  };
  for (let i = 0; i < 10; i++) {
    const angle = (i + 0.5) * Math.PI / 5;
    M.addVisual("glow-b10-barrel-stave", mat(i % 2 ? "#af835c" : "#b58e66"), face(angle, 0.16, 0.365, 0.46));
    M.addVisual("glow-b10-barrel-grain", mat("#876c50"), face(angle, 0.185, 0.34, 0.025, 0.72, 0.006));
  }
  M.addVisual("glow-b10-barrel-lip", mat("#637367"), new THREE.RingGeometry(0.325, 0.357, 10)
    .rotateX(-Math.PI / 2).translate(x, 0.503, z));
}

/** Compact hose bosses fit inside the original 0.22 m blocking radius; the old red body and photo target remain. */
export function finishHydrant(M: Merger, x: number, z: number) {
  const body = mat("#bd594a"), cap = mat("#9eaca7"), brass = mat("#d3c6a8");
  const place = (g: THREE.BufferGeometry) => g.translate(x, 0, z);
  for (const side of [-1, 1]) {
    M.addVisual("glow-b10-hydrant-boss", body, place(new THREE.CylinderGeometry(0.075, 0.095, 0.05, 8, 1, true)
      .rotateZ(-side * Math.PI / 2).translate(side * 0.18, 0.5, 0)));
    M.addVisual("glow-b10-hydrant-cap", cap, place(new THREE.CircleGeometry(0.075, 8)
      .rotateY(side * Math.PI / 2).translate(side * 0.2055, 0.5, 0)));
  }
  M.addVisual("glow-b10-hydrant-boss", body, place(new THREE.CylinderGeometry(0.095, 0.075, 0.05, 8, 1, true)
    .rotateX(Math.PI / 2).translate(0, 0.5, -0.18)));
  M.addVisual("glow-b10-hydrant-cap", cap, place(new THREE.CircleGeometry(0.075, 8).rotateY(Math.PI).translate(0, 0.5, -0.2055)));
  M.addVisual("glow-b10-hydrant-nut", brass, place(new THREE.CircleGeometry(0.025, 6).rotateY(Math.PI).translate(0, 0.5, -0.2085)));
  M.addVisual("glow-b10-hydrant-nut", brass, place(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 6).translate(0, 0.9, 0)));
  M.addVisual("glow-b10-hydrant-foot", mat("#596b62"), place(new THREE.CylinderGeometry(0.205, 0.212, 0.06, 8, 1, true).translate(0, 0.09, 0)));
}

/** Fabric details remain behind the display glass, on the existing mannequins and folded shirts. */
export function finishThreadsDisplay(M: Merger, x: number, z: number, rotation: number, width: number, sill: number) {
  const place = (g: THREE.BufferGeometry) => g.rotateY(rotation).translate(x, 0, z);
  const face = (key: string, color: string, w: number, h: number, px: number, y: number, depth: number) =>
    M.addVisual("glow-b11-threads-" + key, mat(color), place(new THREE.PlaneGeometry(w, h).translate(px, y, depth)));
  const base = sill + 0.06;
  face("linen", "#9f8da8", width - 0.14, 0.24, 0, sill / 2, 0.506);
  face("toe", "#5a5264", width - 0.14, 0.04, 0, 0.08, 0.509);
  for (const px of [-0.65, 0.2]) {
    face("seam", "#d7d0be", 0.013, 0.24, px, base + 1.13, 0.365);
    face("seam", "#d7d0be", 0.23, 0.018, px, base + 0.9, 0.365);
    face("seam", "#d7d0be", 0.09, 0.022, px, base + 1.31, 0.347);
    for (const y of [1.08, 1.16, 1.24]) M.addVisual("glow-b11-threads-button", mat("#93836f"),
      place(new THREE.CircleGeometry(0.008, 6).translate(px, base + y, 0.368)));
  }
  for (let i = 0; i < 4; i++) face("seam", "#d7d0be", 0.28, 0.006, 0.85, base + 0.322 + i * 0.047, 0.352);
}

/** The north-facing salon's single ground-floor window is in the opposite bay; keep its pane and the door clear. */
export function finishSalonFront(M: Merger, x: number, z: number, rotation: number, width: number, doorWidth: number) {
  const place = (g: THREE.BufferGeometry) => g.rotateY(rotation).translate(x, 0, z);
  const face = (key: string, color: string, w: number, h: number, px: number, y: number, depth: number) =>
    M.addVisual("glow-b11-salon-" + key, mat(color), place(new THREE.PlaneGeometry(w, h).translate(px, y, depth)));
  const inner = doorWidth / 2 + 0.25, span = width / 2 - 0.2 - inner;
  for (const side of [-1, 1]) {
    face("base", "#9a6578", span, 0.3, side * (inner + span / 2), 0.23, 0.158);
    face("rail", "#e1c6bb", span, 0.04, side * (inner + span / 2), 0.402, 0.162);
  }
  const panelWidth = span / 2 - 0.13;
  for (const fraction of [0.25, 0.75]) {
    const cx = -(inner + span * fraction);
    face("panel", "#c68f99", panelWidth, 1.52, cx, 1.51, 0.018);
    for (const side of [-1, 1]) {
      face("border", "#ead7ce", 0.035, 1.52, cx + side * (panelWidth / 2 - 0.03), 1.51, 0.022);
      face("border", "#ead7ce", panelWidth, 0.035, cx, 1.51 + side * 0.7425, 0.022);
    }
    for (const offset of [-0.25, 0, 0.25]) face("reed", "#b77f8c", 0.018, 1.35, cx + offset * panelWidth, 1.51, 0.021);
  }
}

/** The street bench's back is toward -Z, unlike the fountain benches finished in B7. */
export function finishStreetBench(M: Merger, x: number, z: number, rotation: number) {
  const place = (g: THREE.BufferGeometry) => g.rotateY(rotation).translate(x, 0, z);
  for (const side of [-1, 1]) {
    for (const y of [0.63, 0.75, 0.87, 0.99]) M.addVisual("glow-b12-street-bench-wood", mat("#b18d66"),
      place(new THREE.PlaneGeometry(1.72, 0.105).rotateY(side === 1 ? 0 : Math.PI).translate(0, y, -0.22 + side * 0.043)));
    for (const u of [-0.72, 0.72]) M.addVisual("glow-b12-street-bench-fastener", mat("#a8b8aa"),
      place(new THREE.CircleGeometry(0.014, 6).rotateY(side === 1 ? 0 : Math.PI).translate(u, 0.75, -0.22 + side * 0.046)));
  }
  for (const depth of [-0.16, 0, 0.16]) M.addVisual("glow-b12-street-bench-wood", mat("#b18d66"),
    place(new THREE.PlaneGeometry(1.74, 0.145).rotateX(-Math.PI / 2).translate(0, 0.552, depth)));
}

/** Board joints follow both faces of the original tilted back and the original seat transform. */
export function finishShoreChair(M: Merger, x: number, z: number, rotation: number) {
  const place = (g: THREE.BufferGeometry) => g.rotateY(rotation).translate(x, 0, z);
  for (const side of [-1, 1]) for (const u of [-0.155, 0, 0.155]) M.addVisual("glow-b12-shore-chair-joint", mat("#58695e"),
    place(new THREE.PlaneGeometry(0.012, 0.83).rotateY(side === 1 ? 0 : Math.PI)
      .translate(u, 0, side * 0.033).rotateX(0.32).translate(0, 0.78, -0.42)));
  for (const u of [-0.1, 0.1]) M.addVisual("glow-b12-shore-chair-joint", mat("#58695e"),
    place(new THREE.PlaneGeometry(0.012, 0.51).rotateX(-Math.PI / 2).translate(u, 0.392, 0.02).rotateX(-0.14)));
  for (const u of [-0.38, 0.38]) for (const depth of [-0.12, 0.12]) M.addVisual("glow-b12-shore-chair-screw", mat("#c4c3a2"),
    place(new THREE.CircleGeometry(0.011, 6).rotateX(-Math.PI / 2).translate(u, 0.607, depth)));
}
