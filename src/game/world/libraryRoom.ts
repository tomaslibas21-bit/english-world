// Oak Avenue reading room. Local +Z is the open front of each chair, shelf and book.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { chamferBox } from "./shapes";
import { colourMerge, type Colliders } from "./util";

export const LIBRARY_VIEW = {
  look: [0.2, 1.2, 0.15] as const, pitch: 0.74, distance: 15.2, halfWidth: 7.1,
};

export type LibraryAction = "browse" | "sit";
export const LIBRARY_DISPLAY = { x: -2.58, z: -4.15, w: 5.4, d: 1.08, approach: { x: -2.58, z: -2.65 } };
function readingChair(x: number, z: number, rot: number, tableX: number, tableZ: number) {
  return { x, z, rot, seatY: 0.55, tableX, tableZ,
    approach: { x: x + 1.8 * Math.sin(rot), z: z + 1.8 * Math.cos(rot) } };
}
export const LIBRARY_CHAIRS = [
  readingChair(2.7, -1.6, -0.82, 3.98, -2.25),
  readingChair(4.1, 1.1, -1.95, 4.72, 2.33),
];
export const LIBRARY_STOPS = [
  { id: "display", action: "browse", chairIndex: undefined, approach: LIBRARY_DISPLAY.approach, label: "Browse books", lt: "Rinktis knygą" },
  ...LIBRARY_CHAIRS.map(({ approach }, i) => ({
    id: "chair-" + i, action: "sit" as const, chairIndex: i, approach, label: "Sit and read", lt: "Prisėsti paskaityti",
  })),
] satisfies { id: string; action: LibraryAction; chairIndex?: number; approach: { x: number; z: number }; label: string; lt: string }[];

type Pieces = [THREE.BufferGeometry, THREE.ColorRepresentation][];
const MAPLE = "#c89560", END_GRAIN = "#a16d47", WALNUT = "#684934", BRASS = "#bc9757";
const CLOTH = ["#435966", "#985747", "#727754", "#d1ad77", "#536b72", "#745563", "#9e7b52", "#3b5255"];
const box = (w: number, h: number, d: number, x: number, y: number, z: number) =>
  new THREE.BoxGeometry(w, h, d).translate(x, y, z);

// Joinery is modelled in the case's local coordinates, then baked in world space.
function joinery(parts: Pieces, x: number, z: number, rot = 0) {
  const add = (g: THREE.BufferGeometry, color: string) => parts.push([g.rotateY(rot).translate(x, 0, z), color]);
  return { add, board: (w: number, h: number, d: number, u: number, y: number, v: number, color: string) =>
    add(box(w, h, d, u, y, v), color) };
}

function spines(c: ReturnType<typeof joinery>, start: number, width: number, y: number, z: number, height: number, seed: number) {
  let u = start;
  for (let i = seed; u + 0.08 < start + width; i++) {
    const w = Math.min(0.105 + (i * 7 % 11) * 0.013, start + width - u);
    const h = height * (0.79 + (i * 3 % 7) * 0.035);
    const face = z + (i % 4) * 0.008;
    c.board(w - 0.01, h, 0.27, u + w / 2, y + h / 2, face - 0.135, CLOTH[i % CLOTH.length]);
    if (i % 3 === 0) c.board(w * 0.72, 0.024, 0.008, u + w / 2, y + h * 0.72, face + 0.005, "#d7bf93");
    u += w;
  }
}

function bookcase(parts: Pieces, col: Colliders, z: number, seed: number) {
  const x = -5.57, w = 2.94;
  const c = joinery(parts, x, z, Math.PI / 2);
  c.board(w, 1.72, 0.08, 0, 1.01, -0.29, WALNUT);
  c.board(w - 0.12, 0.16, 0.52, 0, 0.08, -0.02, WALNUT);
  for (const side of [-1, 1]) c.board(0.1, 1.77, 0.64, side * (w / 2 - 0.05), 1.02, 0, END_GRAIN);
  for (let row = 0; row < 3; row++) {
    const y = 0.2 + row * 0.56;
    c.board(w - 0.2, 0.08, 0.59, 0, y, 0, MAPLE);
    spines(c, -w / 2 + 0.14, row === 1 ? 2.12 : 2.62, y + 0.04, 0.23, 0.465, seed + 5 * row);
    if (row === 1) {
      for (let b = 0; b < 3; b++) c.board(0.37, 0.061, 0.28, 1.05, y + 0.071 + b * 0.063, 0.035, CLOTH[seed % 4 + b]);
    }
  }
  c.board(w + 0.08, 0.11, 0.71, 0, 1.94, 0.015, MAPLE);
  col.addBox(x, z, 0.71, w + 0.08);
}

const coverX = (i: number) => LIBRARY_DISPLAY.x - 1.93 + i * 1.13;
const coverHeight = 1.06, lean = -0.25;
function display(parts: Pieces, col: Colliders) {
  const { x, z, w, d } = LIBRARY_DISPLAY, c = joinery(parts, x, z);
  for (const side of [-1, 1]) {
    c.board(0.13, 0.97, d - 0.14, side * (w / 2 - 0.13), 0.485, 0, END_GRAIN);
    c.board(w - 0.22, 0.19, 0.07, 0, 0.87, side * (d / 2 - 0.11), END_GRAIN);
  }
  c.board(w, 0.11, d, 0, 1.005, 0, MAPLE);
  c.board(w - 0.28, 0.1, d - 0.16, 0, 0.23, 0, MAPLE);
  spines(c, -2.4, 2.0, 0.28, 0.34, 0.43, 5);
  spines(c, 0.38, 1.55, 0.28, 0.33, 0.39, 11);
  for (let i = 0; i < 4; i++) {
    const u = coverX(i) - x;
    // A little row behind each sloping jacket also dresses an unoccupied stand.
    spines(c, u - 0.37, 0.74, 1.06, -0.12, 0.61, i * 3);
    c.board(0.86, 0.07, 0.09, u, 1.095, 0.29, END_GRAIN);
  }
  // An open folio on the end of the table. Its red place-marker folds across the edge.
  const u = 2.17;
  c.board(0.66, 0.045, 0.49, u, 1.085, 0.24, "#824736");
  for (const s of [-1, 1]) c.add(box(0.31, 0.042, 0.45, 0, 0, 0).rotateZ(s * 0.07).translate(u + s * 0.154, 1.128, 0.24), "#f7edd8");
  c.board(0.088, 0.014, 0.42, u, 1.155, 0.34, "#a44836");
  c.board(0.088, 0.29, 0.018, u, 1.01, 0.548, "#954336");
  col.addBox(x, z, w, d);
}

function armchair(parts: Pieces, col: Colliders, chair: typeof LIBRARY_CHAIRS[number]) {
  const { x, z, rot, seatY } = chair, c = joinery(parts, x, z, rot);
  const cushion = (w: number, h: number, d: number, u: number, y: number, v: number, tilt: number, color: string) =>
    c.add(chamferBox(w, h, d, 0.085).rotateX(tilt).translate(u, y, v), color);
  for (const u of [-0.48, 0.48]) for (const v of [-0.42, 0.44])
    c.add(new THREE.CylinderGeometry(0.079, 0.052, 0.24, 6).translate(u, 0.145, v), WALNUT);
  cushion(1.28, 0.26, 1.18, 0, 0.3, 0, 0, "#243b4e");
  cushion(0.91, 0.18, 0.95, 0, seatY - 0.09, 0.085, 0, "#405d72");
  cushion(1.22, 0.96, 0.26, 0, 0.83, -0.48, -0.14, "#2c465b");
  cushion(0.92, 0.68, 0.19, 0, 0.89, -0.34, -0.14, "#38566b");
  for (const side of [-1, 1]) cushion(0.21, 0.43, 1.07, side * 0.541, 0.565, 0, -0.045, "#344f64");
  // A turned seam along the front edge of the loose seat.
  c.board(0.74, 0.014, 0.012, 0, seatY - 0.08, 0.562, "#60788a");
  col.addCircle(x, z, 0.76);
}

function readingLamp(parts: Pieces, lights: Pieces, col: Colliders, x: number, z: number) {
  const c = joinery(parts, x, z);
  const turned = (r1: number, r2: number, h: number, y: number, color: string) =>
    c.add(new THREE.CylinderGeometry(r1, r2, h, 12).translate(0, y, 0), color);
  turned(0.29, 0.35, 0.09, 0.075, WALNUT);
  turned(0.12, 0.17, 0.52, 0.38, END_GRAIN);
  turned(0.46, 0.43, 0.1, 0.69, MAPLE);
  turned(0.21, 0.24, 0.065, 0.776, "#65513a");
  turned(0.055, 0.1, 0.24, 0.925, BRASS);
  turned(0.035, 0.042, 0.49, 1.28, BRASS);
  const shade = new THREE.CylinderGeometry(0.235, 0.438, 0.47, 12, 1, true).translate(x, 1.67, z);
  lights.push([shade, "#ffe1a1"]);
  lights.push([new THREE.CircleGeometry(0.429, 12).rotateX(Math.PI / 2).translate(x, 1.442, z), "#fff1bf"]);
  turned(0.44, 0.443, 0.027, 1.437, "#ad8755");
  turned(0.237, 0.245, 0.023, 1.908, "#b4925e");
  turned(0.04, 0.052, 0.07, 1.951, BRASS);
  col.addCircle(x, z, 0.46);
}

// The rug carries both lamplight pools in its vertex colours. No transparent discs or per-frame lights.
function woolRug() {
  const w = 5.02, d = 6.32;
  const grid = new THREE.PlaneGeometry(w, d, 22, 28).rotateX(-Math.PI / 2).translate(3.12, 0.021, 0.06);
  const p = grid.attributes.position, colors = [], wool = new THREE.Color(), amber = new THREE.Color("#e8be82");
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const edge = Math.min(w / 2 - Math.abs(x - 3.12), d / 2 - Math.abs(z - 0.06));
    wool.set(edge < 0.06 ? "#826554" : edge < 0.24 ? "#ae7b62" : edge < 0.48 ? "#d4b38a" : "#ba9e7e");
    wool.multiplyScalar(i % 2 ? 1 : 0.976);
    for (const { tableX, tableZ } of LIBRARY_CHAIRS)
      wool.lerp(amber, 0.81 * Math.exp(-((x - tableX) ** 2 + (z - tableZ) ** 2) / 1.35));
    colors.push(wool.r, wool.g, wool.b);
  }
  grid.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  grid.deleteAttribute("uv");
  const rug = grid.toNonIndexed(); grid.dispose();
  return rug;
}

function sashWindow(parts: Pieces) {
  // A broad fanlight above two divided sashes, set into the ivory back wall.
  const c = joinery(parts, 2.65, -4.96);
  const arch = (radius: number, rise: number, v: number, color: string) =>
    c.add(new THREE.CircleGeometry(1, 16, 0, Math.PI).scale(radius, rise, 1).translate(0, 2.95, v), color);
  c.board(3.52, 1.42, 0.12, 0, 2.24, 0.04, END_GRAIN);
  arch(1.76, 0.91, 0.094, END_GRAIN);
  arch(1.64, 0.78, 0.106, "#c2d5cc");
  for (const side of [-1, 1]) {
    c.board(1.57, 1.23, 0.045, side * 0.832, 2.25, 0.09, "#c2d5cc");
    c.board(1.57, 0.34, 0.022, side * 0.832, 1.81, 0.115, "#95b2ad");
    c.board(1.58, 0.045, 0.039, side * 0.832, 2.31, 0.144, "#ebdec5");
    c.board(0.047, 1.24, 0.042, side * 0.832, 2.25, 0.144, "#ebdec5");
    c.add(box(0.05, 1.12, 0.03, 0, 0, 0).rotateZ(side * 1.02).translate(-side * 0.47, 3.23, 0.135), "#ebdec5");
  }
  c.board(3.52, 0.09, 0.15, 0, 2.95, 0.12, MAPLE);
  c.board(3.73, 0.115, 0.31, 0, 1.53, 0.12, MAPLE);
}

export function furnishLibrary({ g, col }: { g: THREE.Group; col: Colliders }) {
  const parts: Pieces = [], lights: Pieces = [];
  bookcase(parts, col, -2.2, 2);
  bookcase(parts, col, 0.98, 11);
  display(parts, col);
  sashWindow(parts);
  for (const chair of LIBRARY_CHAIRS) {
    armchair(parts, col, chair);
    readingLamp(parts, lights, col, chair.tableX, chair.tableZ);
  }
  const furniture = colourMerge(parts), rug = woolRug();
  const solid = new THREE.Mesh(mergeGeometries([furniture, rug], false)!, new THREE.MeshLambertMaterial({ vertexColors: true }));
  furniture.dispose(); rug.dispose();
  solid.receiveShadow = true;
  solid.name = "library-furniture";
  const lamps = new THREE.Mesh(colourMerge(lights), new THREE.MeshLambertMaterial({
    vertexColors: true, emissive: "#b57a38", emissiveIntensity: 0.75,
  }));
  lamps.name = "library-lamps";
  g.add(solid, lamps);
}

async function featuredJackets(signal: AbortSignal) {
  // Read the public index on the enclosing course/review origin. Its order and membership
  // also work for a trimmed offline shelf. Only the four selected thumbnails are requested.
  const [response, { default: covers }, { coverUrls }, { TalkProgress }] = await Promise.all([
    fetch("/knygos/index.json", { signal, redirect: "error" }),
    import("../../content/book-covers/books.json"), import("../../radio/books"), import("../../radio/talkProgress"),
  ]);
  if (!response.ok) return [];
  const index = await response.json();
  if (!Array.isArray(index.books) || signal.aborted) return [];
  const ids = new Set<string>();
  for (const book of index.books) if (typeof book?.id === "string" && Object.hasOwn(covers, book.id)) ids.add(book.id);
  const progress = new TalkProgress("em-lt", { events: null });
  const [kind, current] = progress.continueListening()?.itemKey.split("/") ?? [];
  const ordered = [...ids];
  if (kind === "book" && ids.has(current)) {
    ordered.splice(ordered.indexOf(current), 1);
    ordered.unshift(current);
  }
  return ordered.slice(0, 4).map((id) => ({ id, url: coverUrls(covers, "books", id)[160]! }));
}

/** Visit-owned art. The cached shelves stay dressed in cloth spines during a load or a missing cover. */
export function mountLibraryCovers(group: THREE.Group) {
  const controller = new AbortController(), { signal } = controller;
  let jackets: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | undefined;
  let canvas: HTMLCanvasElement | undefined;
  async function load() {
    const featured = await featuredJackets(signal);
    if (signal.aborted || !featured.length) return;
    canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    const planes: THREE.BufferGeometry[] = [], bookIds: string[] = [];
    // Decode one small image at a time. Each bitmap can be released as soon as it has been painted.
    for (const [i, { id, url }] of featured.entries()) {
      if (signal.aborted) break;
      try {
        const res = await fetch(url, { signal, redirect: "error" });
        if (!res.ok) continue;
        const bitmap = await createImageBitmap(await res.blob());
        try {
          if (signal.aborted) break;
          const scale = 250 / Math.max(bitmap.width, bitmap.height);
          const w = bitmap.width * scale, h = bitmap.height * scale;
          const px = (i % 2) * 256 + (256 - w) / 2, py = Math.floor(i / 2) * 256 + (256 - h) / 2;
          ctx.drawImage(bitmap, px, py, w, h);
          const bookScale = Math.min(0.85 / w, coverHeight / h);
          const height = h * bookScale;
          const plane = new THREE.PlaneGeometry(w * bookScale, height);
          plane.translate(0, height / 2, 0).rotateX(lean).translate(coverX(i), 1.08, LIBRARY_DISPLAY.z + 0.23);
          const uv = plane.attributes.uv;
          for (let k = 0; k < uv.count; k++) uv.setXY(k, (px + 0.5 + uv.getX(k) * (w - 1)) / 512,
            1 - (py + 0.5 + (1 - uv.getY(k)) * (h - 1)) / 512);
          planes.push(plane); bookIds.push(id);
        } finally { bitmap.close(); }
      } catch { /* A missing jacket reveals its row of cloth spines. */ }
    }
    if (planes.length && !signal.aborted) {
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace; map.generateMipmaps = false; map.minFilter = THREE.LinearFilter;
      jackets = new THREE.Mesh(mergeGeometries(planes, false)!, new THREE.MeshBasicMaterial({ map, toneMapped: false }));
      jackets.name = "library-jackets";
      jackets.userData.bookIds = bookIds; // two consecutive triangles per selectable jacket
      group.add(jackets);
    }
    planes.forEach((p) => p.dispose());
  }
  void load().catch(() => { /* The room also opens when the course catalog is offline. */ });
  return () => {
    controller.abort();
    if (jackets) {
      group.remove(jackets); jackets.material.map!.dispose(); jackets.material.dispose(); jackets.geometry.dispose();
      jackets = undefined;
    }
    if (canvas) { canvas.width = canvas.height = 0; canvas = undefined; }
  };
}
