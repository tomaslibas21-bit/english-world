// The pieces of a small Mexican Caribbean town that the Spanish edition's theme switches on outdoors (theme.ts,
// docs/es/TOWN.md tasks 1–5): the malecón, the palapas and the lanchas on the beach, the flat roofs with their
// parapets and tinacos, the window bars, the painted signs, the church, the street signs, the topes, the elote cart,
// the houses' walls and gates, the bougainvillea and the corner shop; and the last details: the mercado's crates, the
// diablito and the cargo tricycle, the Correos buzón, the backyard's barda, the cenote and the ruins. Maple Harbor
// never calls anything here.
// Everything solid is pushed as [geometry, colour] into one list that town.ts merges into a single vertex-coloured
// mesh, and every new sign is a cell of one texture (SignAtlas): the whole restyle costs a few draw calls.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rand, roundRect, type Colliders } from "./util";
import type { TianguisGoods } from "./theme";

export type Part = [THREE.BufferGeometry, THREE.ColorRepresentation];
type Face = "n" | "s" | "e" | "w";

const box = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const cyl = (rt: number, rb: number, h: number, x: number, y: number, z: number, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y, z);
/** Geometry made round (0, 0) with its front towards +z, turned to `rot` and moved to (x, z). */
const place = (g: THREE.BufferGeometry, x: number, z: number, rot: number) => g.rotateY(rot).translate(x, 0, z);
/** The heading of a face's outward side (0: +z), as buildBuilding has it. */
const faceRot = (f: Face) => ({ n: Math.PI, s: 0, e: Math.PI / 2, w: -Math.PI / 2 })[f];
/** A collider over a rectangle made round (0, 0) (x0…x1 across, z0…z1 out) and placed like `place`. */
function blockRect(col: Colliders, x: number, z: number, rot: number, x0: number, x1: number, z0: number, z1: number) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const pts = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].map(([lx, lz]) => [x + lx * c + lz * s, z - lx * s + lz * c]);
  const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
  const [ax, bx, az, bz] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  col.addBox((ax + bx) / 2, (az + bz) / 2, bx - ax, bz - az);
}

// ------------------------------------------------------------------------------------------------ the sign atlas

type Draw = (x: CanvasRenderingContext2D, w: number, h: number) => void;
const FONT = "'Nunito', 'Arial Rounded MT Bold', Arial, sans-serif";

/** Every new sign of the town drawn on one canvas, and every place it is shown as a quad of one mesh: one draw call
 *  however many signs. A cell is drawn once and can be shown in many places (the street names, ALTO, TOPE). */
export class SignAtlas {
  private cells = new Map<string, { draw: Draw; w: number; h: number; x0: number; y0: number }>();
  private quads: { key: string; w: number; h: number; m: THREE.Matrix4 }[] = [];
  /** Shows sign `key` (drawn by `draw` on a pw × ph canvas the first time) as a w × h metre plane centred at
   *  (x, y, z), facing `rot` (0: +z); `back` puts it on the back too, for a blade read from both sides. */
  add(key: string, pw: number, ph: number, draw: Draw, w: number, h: number, x: number, y: number, z: number, rot: number, back = false) {
    if (!this.cells.has(key)) this.cells.set(key, { draw, w: pw, h: ph, x0: 0, y0: 0 });
    const m = new THREE.Matrix4().makeRotationY(rot).setPosition(x, y, z);
    this.quads.push({ key, w, h, m });
    if (back) {
      const o = new THREE.Vector3(0, 0, -0.012).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
      this.quads.push({ key, w, h, m: new THREE.Matrix4().makeRotationY(rot + Math.PI).setPosition(x + o.x, y, z + o.z) });
    }
  }
  build(): THREE.Mesh | null {
    if (!this.quads.length) return null;
    // rows of cells on a canvas 1024 wide, tallest first, 6 px apart (so the mipmaps don't bleed)
    const W = 1024, PAD = 6;
    const cells = [...this.cells.values()].sort((a, b) => b.h - a.h);
    let x = PAD, y = PAD, rowH = 0;
    for (const c of cells) {
      if (x + c.w + PAD > W) { x = PAD; y += rowH + PAD; rowH = 0; }
      c.x0 = x; c.y0 = y; x += c.w + PAD; rowH = Math.max(rowH, c.h);
    }
    const H = y + rowH + PAD;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d")!;
    for (const c of cells) {
      ctx.save(); ctx.translate(c.x0, c.y0);
      ctx.beginPath(); ctx.rect(0, 0, c.w, c.h); ctx.clip();
      c.draw(ctx, c.w, c.h);
      ctx.restore();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const geos = this.quads.map(({ key, w, h, m }) => {
      const c = this.cells.get(key)!;
      const g = new THREE.PlaneGeometry(w, h);
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (c.x0 + uv.getX(i) * c.w) / W, 1 - (c.y0 + (1 - uv.getY(i)) * c.h) / H);
      return g.applyMatrix4(m);
    });
    const mesh = new THREE.Mesh(mergeGeometries(geos, false)!, new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, toneMapped: false }));
    for (const g of geos) g.dispose();
    mesh.name = "town-signs";
    return mesh;
  }
}

/** Text that fits: the biggest size up to `size` px with which `text` is at most `max` px wide. */
function fit(x: CanvasRenderingContext2D, text: string, size: number, max: number, font = FONT, weight = "800") {
  let s = size;
  x.font = `${weight} ${s}px ${font}`;
  while (x.measureText(text).width > max && s > 8) { s -= 1; x.font = `${weight} ${s}px ${font}`; }
  return s;
}

/** A street's name blade: white letters on blue with a white border, the kind of word ("Calle", "Av.") smaller. */
const drawBlade = (name: string): Draw => (x, w, h) => {
  x.fillStyle = "#1f4f8f"; roundRect(x, 2, 2, w - 4, h - 4, h * 0.14); x.fill();
  x.lineWidth = 4; x.strokeStyle = "#f4f1ea"; roundRect(x, 7, 7, w - 14, h - 14, h * 0.1); x.stroke();
  const [kind, ...rest] = name.split(" ");
  const main = rest.join(" ") || kind, small = rest.length ? kind : "";
  x.fillStyle = "#ffffff"; x.textBaseline = "middle";
  const sm = small ? fit(x, small, h * 0.3, w * 0.25, FONT, "700") : 0;
  const smW = small ? x.measureText(small).width + 10 : 0;
  const big = fit(x, main, h * 0.56, w * 0.86 - smW);
  const bigW = x.measureText(main).width, x0 = (w - bigW - smW) / 2;
  if (small) { x.font = `700 ${sm}px ${FONT}`; x.textAlign = "left"; x.fillText(small, x0, h / 2 + 2); }
  x.font = `800 ${big}px ${FONT}`; x.textAlign = "left"; x.fillText(main, x0 + smW, h / 2 + 2);
};

/** A hand-painted sign (a rótulo): a coloured board with a darker edge, the name in big outlined letters with a
 *  shadow, a smaller line under it, and little painted flowers in the corners. */
const drawPainted = (title: string, sub: string, bg: string, fg: string, edge: string): Draw => (x, w, h) => {
  x.fillStyle = edge; roundRect(x, 0, 0, w, h, h * 0.12); x.fill();
  x.fillStyle = bg; roundRect(x, h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12, h * 0.1); x.fill();
  const ty = sub ? h * 0.42 : h * 0.52;
  const s = fit(x, title, h * (sub ? 0.46 : 0.58), w * 0.78, "Georgia, 'Times New Roman', serif", "italic 900");
  x.textAlign = "center"; x.textBaseline = "middle";
  x.lineJoin = "round"; x.lineWidth = s * 0.16; x.strokeStyle = edge;
  x.fillStyle = edge; x.fillText(title, w / 2 + s * 0.06, ty + s * 0.06);
  x.strokeText(title, w / 2, ty);
  x.fillStyle = fg; x.fillText(title, w / 2, ty);
  if (sub) {
    const ss = fit(x, sub, h * 0.2, w * 0.8, FONT, "800");
    x.font = `800 ${ss}px ${FONT}`; x.fillStyle = edge; x.fillText(sub, w / 2, h * 0.8);
  }
  for (const [px, py] of [[h * 0.32, h * 0.32], [w - h * 0.32, h * 0.32], [h * 0.32, h * 0.68], [w - h * 0.32, h * 0.68]]) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      x.fillStyle = fg; x.beginPath(); x.arc(px + Math.cos(a) * h * 0.06, py + Math.sin(a) * h * 0.06, h * 0.045, 0, Math.PI * 2); x.fill();
    }
    x.fillStyle = edge; x.beginPath(); x.arc(px, py, h * 0.035, 0, Math.PI * 2); x.fill();
  }
};

/** The stop sign: a red octagon with a white border and the word (ALTO), clear round it. */
const drawOctagon = (word: string): Draw => (x, w, h) => {
  const oct = (r: number) => { x.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i / 8) * Math.PI * 2; x[i ? "lineTo" : "moveTo"](w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); } x.closePath(); };
  x.fillStyle = "#ffffff"; oct(w * 0.5); x.fill();
  x.fillStyle = "#c62828"; oct(w * 0.44); x.fill();
  x.fillStyle = "#ffffff"; x.textAlign = "center"; x.textBaseline = "middle";
  fit(x, word, h * 0.36, w * 0.7);
  x.fillText(word, w / 2, h / 2 + 2);
};

/** The speed bump warning: a yellow diamond, a black border, the word (TOPE) and a bump under it. */
const drawDiamond = (word: string): Draw => (x, w, h) => {
  const dia = (r: number) => { x.beginPath(); x.moveTo(w / 2, h / 2 - r); x.lineTo(w / 2 + r, h / 2); x.lineTo(w / 2, h / 2 + r); x.lineTo(w / 2 - r, h / 2); x.closePath(); };
  x.fillStyle = "#1d1d1d"; dia(w * 0.5); x.fill();
  x.fillStyle = "#f6c90e"; dia(w * 0.44); x.fill();
  x.fillStyle = "#1d1d1d"; x.textAlign = "center"; x.textBaseline = "middle";
  fit(x, word, h * 0.2, w * 0.46);
  x.fillText(word, w / 2, h * 0.44);
  x.beginPath(); x.ellipse(w / 2, h * 0.64, w * 0.15, h * 0.06, 0, Math.PI, 0); x.fill();
  x.fillRect(w * 0.3, h * 0.64, w * 0.4, h * 0.025);
};

// ------------------------------------------------------------------------------------------------ the malecón

const WHITE = "#f4f1ea", STONE = "#d9cdb5", WOOD = "#8a6a4a", THATCH = "#c49a5c", THATCH_DARK = "#a57c45", IRON = "#2b2b2e";

/** Where the malecón's wall stands (z) and how far it runs (x). */
export const MALECON = { z: -66.3, x0: -104, x1: 124 };
/** The openings in the wall: down to the beach, and the pier's boardwalk. */
const OPENINGS: [number, number][] = [[-97.2, -94.8], [-73.2, -70.8], [-49.2, -46.8], [-32.6, -27.4], [-13.2, -10.8], [10.8, 13.2], [34.8, 37.2], [58.8, 61.2], [82.8, 85.2], [106.8, 109.2]];

/** The malecón: a low white wall with a stone cap and pillars along the top of the beach, open where steps go down to
 *  the sand and where the pier's boardwalk crosses; a plaque with its name by the pier. Returns where its benches go
 *  (facing the sea; town.ts puts them there, with their seats). */
export function malecon(parts: Part[], col: Colliders, atlas: SignAtlas, name: string): [number, number, number][] {
  const { z, x0, x1 } = MALECON;
  let a = x0;
  const pillar = (x: number) => {
    parts.push([box(0.5, 0.95, 0.5, x, 0.475, z), WHITE]);
    parts.push([box(0.6, 0.1, 0.6, x, 1.0, z), STONE]);
  };
  for (const [o0, o1] of [...OPENINGS, [x1, x1] as [number, number]]) {
    const len = o0 - a;
    if (len > 0.4) {
      parts.push([box(len, 0.7, 0.36, (a + o0) / 2, 0.35, z), WHITE]);
      parts.push([box(len, 0.08, 0.46, (a + o0) / 2, 0.74, z), STONE]);
      col.addBox((a + o0) / 2, z, len, 0.5);
      for (let k = 1; k * 6 < len - 1; k++) pillar(a + (len / Math.ceil(len / 6)) * k);
      pillar(a); pillar(o0);
    }
    a = o1;
  }
  // the name on a tile plaque by the pier's boardwalk, on the road side
  atlas.add("malecon", 384, 128, (x, w, h) => {
    x.fillStyle = "#f7f3ea"; roundRect(x, 2, 2, w - 4, h - 4, 14); x.fill();
    x.lineWidth = 8; x.strokeStyle = "#1f6f8b"; roundRect(x, 10, 10, w - 20, h - 20, 10); x.stroke();
    x.fillStyle = "#1f6f8b"; x.textAlign = "center"; x.textBaseline = "middle";
    fit(x, name, h * 0.5, w * 0.8, "Georgia, serif", "italic 900"); x.fillText(name, w / 2, h / 2 + 3);
  }, 1.2, 0.4, -34.1, 0.55, z + 0.19, 0);
  // benches facing the sea, between the openings and clear of the lamps
  const benches: [number, number, number][] = [];
  for (const bx of [-88, -60, -40, -21, 0, 22, 46, 70, 94, 116]) benches.push([bx, z + 1.25, Math.PI]);
  return benches;
}

/** The two lanterns of a malecón lamp post, on a curved arm (the post itself is town.ts's). */
export function lanternArm(add: (key: "post" | "glass", g: THREE.BufferGeometry) => void, x: number, z: number) {
  add("post", box(1.5, 0.09, 0.09, x, 4.25, z));
  for (const s of [-1, 1]) {
    add("post", cyl(0.03, 0.03, 0.3, x + s * 0.7, 4.07, z, 5));
    add("post", cyl(0.17, 0.12, 0.12, x + s * 0.7, 3.88, z, 6));
    add("glass", new THREE.SphereGeometry(0.2, 7, 5).scale(1, 1.25, 1).translate(x + s * 0.7, 3.62, z));
    add("post", box(0.08, 0.08, 0.08, x + s * 0.74, 4.33, z));
  }
}

/** A kiosk on the malecón (cenote tours): a little painted hut with a counter, a thatched roof and its sign. */
export function kiosk(parts: Part[], col: Colliders, atlas: SignAtlas, x: number, z: number, sign: string) {
  const wall = "#2a9d8f";
  parts.push([box(2.4, 2.2, 1.5, x, 1.1, z), wall]);
  parts.push([box(2.5, 0.12, 0.5, x, 1.1, z + 0.95), "#c08a52"]); // the counter
  parts.push([box(1.8, 0.9, 0.04, x, 1.75, z + 0.76), "#3b2f2a"]); // the window behind it
  parts.push([box(2.5, 0.25, 1.6, x, 0.12, z), "#1f6f62"]);
  for (const s of [-1, 1]) parts.push([cyl(0.06, 0.06, 2.6, x + s * 1.3, 1.3, z + 1.05, 6), WOOD]);
  parts.push([new THREE.ConeGeometry(2.1, 1.4, 4).rotateY(Math.PI / 4).scale(1, 1, 0.82).translate(x, 2.9, z + 0.15), THATCH]);
  parts.push([new THREE.ConeGeometry(0.5, 0.4, 4).rotateY(Math.PI / 4).translate(x, 3.75, z + 0.15), THATCH_DARK]);
  col.addBox(x, z + 0.15, 2.6, 2.0);
  // the sign painted on its front under the counter, towards the street
  atlas.add("kiosk", 512, 160, drawPainted(sign, "Snorkel · Ruinas · Tulum", "#fdf3d7", "#1f6f8b", "#0f4c5c"), 2.3, 0.72, x, 0.6, z + 0.77, 0);
}

/** Palapas on the sand: a thatched umbrella on a wooden pole, with two wooden loungers in front of it (towards the
 *  sea) and a towel on one. */
export function palapas(parts: Part[], col: Colliders, spots: [number, number][], thatch = false, roofs: Part[] = parts): [number, number][] {
  const r = rand(91);
  const towels = ["#e4007c", "#00a6a6", "#f6a800", "#ff5a36", "#1f6fd1"];
  const loungers: [number, number][] = [];
  spots.forEach(([x, z], i) => {
    parts.push([new THREE.CylinderGeometry(0.09, 0.11, 2.7, 6, 1, true).translate(x, 1.35, z), WOOD]);
    roofs.push([new THREE.ConeGeometry(2.1, 1.05, 10).translate(x, 3.05, z), THATCH]);
    roofs.push([new THREE.CylinderGeometry(2.1, 2.2, 0.3, 10, 1, true).translate(x, 2.4, z), THATCH_DARK]);
    roofs.push([new THREE.ConeGeometry(0.4, 0.4, 8).translate(x, 3.72, z), THATCH_DARK]);
    if (thatch) {
      // (graphics round 4) the thatch in layers, a second, darker skirt of palm leaves over the first, and a ragged
      // fringe of leaf ends round its edge
      roofs.push([new THREE.ConeGeometry(1.55, 0.75, 10, 1, true).rotateY(0.3).translate(x, 3.3, z), THATCH_DARK]);
      roofs.push([new THREE.ConeGeometry(1.0, 0.5, 9, 1, true).rotateY(0.6).translate(x, 3.55, z), THATCH]);
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * Math.PI * 2 + (k % 2) * 0.08, rr = 2.12 + (k % 3) * 0.05;
        roofs.push([new THREE.ConeGeometry(0.17, 0.4 + (k % 3) * 0.1, 4).rotateX(Math.PI).translate(x + Math.cos(a) * rr, 2.12 - (k % 3) * 0.05, z + Math.sin(a) * rr), k % 2 ? THATCH : THATCH_DARK]);
      }
    }
    col.addCircle(x, z, 0.16);
    for (const s of [-1, 1]) {
      const lx = x + s * 0.95, lz = z - 0.9; // in front of the pole, towards the sea (-z)
      parts.push([box(0.62, 0.08, 1.4, lx, 0.32, lz - 0.2), "#b07a46"]);
      parts.push([box(0.62, 0.07, 0.75, 0, 0, 0).rotateX(-0.6).translate(lx, 0.55, lz + 0.72), "#b07a46"]);
      for (const dz of [-0.8, 0.45]) parts.push([box(0.56, 0.3, 0.05, lx, 0.15, lz + dz), "#7a5236"]);
      if ((i + (s > 0 ? 1 : 0)) % 2 === 0) parts.push([box(0.5, 0.02, 1.3, lx, 0.37, lz - 0.15), towels[Math.floor(r() * towels.length)]]);
      col.addBox(lx, lz, 0.7, 2.0);
      loungers.push([lx, lz - 0.2]);
    }
  });
  return loungers;
}

/** A lancha (an open fishing boat, white with a stripe in `stripe`) made round (0, 0), the bow towards +z: its hull
 *  with a floor inside, the stripe along the gunwale, two thwarts and an outboard motor at the stern. */
export function lanchaParts(stripe: string): Part[] {
  const parts: Part[] = [];
  const outline = (inset: number) => {
    const s = new THREE.Shape();
    const w = 0.85 - inset, b = 3.3 - inset * 1.6, st = -3.0 + inset;
    s.moveTo(-w, st); s.lineTo(w, st); s.lineTo(w, 1.0); s.quadraticCurveTo(w * 0.95, 2.4, 0, b);
    s.quadraticCurveTo(-w * 0.95, 2.4, -w, 1.0); s.lineTo(-w, st);
    return s;
  };
  // ExtrudeGeometry lies along +z: turned so it stands up (y) and the outline is the boat seen from above
  const ext = (s: THREE.Shape, depth: number, y: number) => new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 4 }).rotateX(-Math.PI / 2).translate(0, y, 0);
  const shell = outline(0);
  shell.holes.push(new THREE.Path(outline(0.09).getPoints(4)));
  parts.push([ext(outline(0), 0.22, 0), "#f4f6f8"]);
  parts.push([ext(shell, 0.55, 0.22), "#f4f6f8"]);
  const band = outline(-0.01);
  band.holes.push(new THREE.Path(outline(0.08).getPoints(4)));
  parts.push([ext(band, 0.12, 0.62), stripe]);
  parts.push([ext(outline(0.09), 0.02, 0.22), "#9fb7c4"]); // the floor
  for (const z of [-1.2, 0.6]) parts.push([box(1.62, 0.06, 0.32, 0, 0.55, z), "#b8895a"]);
  parts.push([box(0.4, 0.5, 0.45, 0, 1.0, -3.15), "#2f3136"]); // the motor's cowl
  parts.push([box(0.12, 0.7, 0.14, 0, 0.45, -3.25), "#55595e"]);
  parts.push([box(0.4, 0.1, 0.45, 0, 1.27, -3.15), "#e9ecef"]);
  return parts;
}

/** Lanchas pulled up on the sand, leaning a little on their keel. */
export function beachedLanchas(parts: Part[], col: Colliders, boats: [number, number, number, string][]) {
  for (const [x, z, rot, stripe] of boats) {
    for (const [g, c] of lanchaParts(stripe)) parts.push([g.rotateZ(0.09).rotateY(rot).translate(x, 0.02, z), c]);
    for (const k of [-2, 0, 2]) col.addCircle(x + Math.sin(rot) * k, z + Math.cos(rot) * k, 0.95);
  }
}

// ------------------------------------------------------------------------------------------------ buildings

/** A palapa roof: a thatched hip roof over the whole building, overhanging, with a darker crown. */
export function palapaRoof(parts: Part[], x: number, z: number, w: number, d: number, h: number) {
  const k = 1 / Math.SQRT1_2, hw = w / 2 + 1.6, hd = d / 2 + 1.6, H = 3.4;
  parts.push([new THREE.ConeGeometry(1, H, 4).rotateY(Math.PI / 4).scale(hw / k, 1, hd / k).translate(x, h - 0.25 + H / 2, z), THATCH]);
  parts.push([new THREE.ConeGeometry(1, 0.9, 4).rotateY(Math.PI / 4).scale((hw * 0.28) / k, 1, (hd * 0.28) / k).translate(x, h - 0.25 + H - 0.18, z), THATCH_DARK]);
  parts.push([new THREE.CylinderGeometry(1, 1, 0.25, 4, 1, true).rotateY(Math.PI / 4).scale(hw / k, 1, hd / k).translate(x, h - 0.32, z), THATCH_DARK]);
}

/** A flat roof's parapet (in the wall's colour, capped in the trim's) and its tinacos: black water tanks on little
 *  stands at these spots, sometimes with a white gas tank beside one. */
export function parapetAndTinacos(parts: Part[], b: { x: number; z: number; w: number; d: number; h: number; color: string; trim?: string; id: string }, tanks: [number, number][]) {
  const y0 = b.h + 0.2, ph = 0.75, t = 0.28, cap = b.trim ?? "#ffffff";
  for (const s of [-1, 1]) {
    parts.push([box(b.w + 0.1, ph, t, b.x, y0 + ph / 2, b.z + s * (b.d / 2 - t / 2 + 0.05)), b.color]);
    parts.push([box(t, ph, b.d + 0.1, b.x + s * (b.w / 2 - t / 2 + 0.05), y0 + ph / 2, b.z), b.color]);
    parts.push([box(b.w + 0.24, 0.07, t + 0.12, b.x, y0 + ph + 0.035, b.z + s * (b.d / 2 - t / 2 + 0.05)), cap]);
    parts.push([box(t + 0.12, 0.07, b.d + 0.24, b.x + s * (b.w / 2 - t / 2 + 0.05), y0 + ph + 0.035, b.z), cap]);
  }
  const r = rand([...b.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 3) % 100000 + 4242);
  tanks.forEach(([tx, tz], i) => {
    const big = r() < 0.5 ? 1.1 : 0.9;
    parts.push([box(0.95 * big, 0.45, 1.0 * big, tx, b.h + 0.35, tz), "#9a9890"]);
    parts.push([new THREE.CylinderGeometry(0.56 * big, 0.56 * big, 1.15 * big, 10, 1, true).translate(tx, b.h + 0.58 + 0.575 * big, tz), "#1d1f22"]);
    parts.push([new THREE.ConeGeometry(0.56 * big, 0.22 * big, 10).translate(tx, b.h + 0.58 + 1.26 * big, tz), "#1d1f22"]);
    parts.push([new THREE.ConeGeometry(0.22, 0.12, 8).translate(tx, b.h + 0.64 + 1.37 * big, tz), "#2b2e33"]);
    if (i === 0 && r() < 0.5) {
      parts.push([cyl(0.2, 0.2, 1.0, tx + 1.1, b.h + 0.7, tz + 0.3, 8), "#e8e8e8"]);
      parts.push([new THREE.ConeGeometry(0.2, 0.14, 8).translate(tx + 1.1, b.h + 1.27, tz + 0.3), "#e8e8e8"]);
    }
  });
}

/** Iron bars ("protecciones") in front of a window: upright bars and three cross bars, as flat strips facing the
 *  street (two triangles each: a town has a hundred barred windows). `at` places geometry made round the window's
 *  centre (x across it, z out of the wall). */
export function windowBars(parts: Part[], at: (g: THREE.BufferGeometry) => THREE.BufferGeometry, ww: number, wh: number) {
  const n = Math.max(3, Math.round(ww / 0.3));
  for (let i = 0; i <= n; i++) parts.push([at(new THREE.PlaneGeometry(0.04, wh + 0.14).translate(-ww / 2 + (i * ww) / n, 0, 0.13)), IRON]);
  for (const y of [-wh / 2 - 0.04, wh / 2 + 0.04, wh * 0.1]) parts.push([at(new THREE.PlaneGeometry(ww + 0.08, 0.04).translate(0, y, 0.135)), IRON]);
}

/** A house's front in the Mexican way, where Maple Harbor has a picket fence, a mailbox and a chimney: a low wall
 *  (a barda) in the house's colours with gate posts and an iron gate standing open, and a potted plant where the
 *  mailbox was. `P(u, v)` is a point `u` along the front and `v` out from it, `rot` the front's heading. */
export function houseFront(parts: Part[], P: (u: number, v: number) => [number, number], rot: number, w: number, wall: string, trim: string, gate: number, mailbox: [number, number]) {
  const v = 5.6, len = w / 2 - gate;
  for (const s of [-1, 1]) {
    const [x, z] = P(s * (gate + len / 2), v);
    parts.push([place(box(len, 1.0, 0.25, 0, 0.5, 0), x, z, rot), wall]);
    parts.push([place(box(len + 0.06, 0.08, 0.35, 0, 1.04, 0), x, z, rot), trim]);
    const [gx, gz] = P(s * gate, v);
    parts.push([place(box(0.38, 1.35, 0.38, 0, 0.675, 0), gx, gz, rot), wall]);
    parts.push([place(new THREE.OctahedronGeometry(0.18).translate(0, 1.47, 0), gx, gz, rot), trim]);
  }
  // the gate: one iron leaf swung open into the yard
  const [hx, hz] = P(-gate + 0.15, v);
  const lp: Part[] = [];
  const lw = gate * 2 - 0.4;
  lp.push([box(lw, 0.05, 0.05, lw / 2, 0.15, 0), IRON], [box(lw, 0.05, 0.05, lw / 2, 1.05, 0), IRON]);
  // (the bars as strips seen from both sides: two each way)
  for (let i = 0; i <= 8; i++) for (const r of [0, Math.PI]) lp.push([new THREE.PlaneGeometry(0.035, 0.95).rotateY(r).translate((i / 8) * lw, 0.6, 0), IRON]);
  for (const [g, c] of lp) parts.push([place(g.rotateY(-1.25), hx, hz, rot), c]);
  // a big terracotta pot with a plant
  const [mx, mz] = mailbox;
  parts.push([cyl(0.32, 0.24, 0.55, mx, 0.275, mz, 10), "#c56f4c"]);
  parts.push([new THREE.IcosahedronGeometry(0.48, 0).scale(1, 1.1, 1).translate(mx, 0.95, mz), "#3f7d3a"]);
  for (let i = 0; i < 5; i++) parts.push([new THREE.OctahedronGeometry(0.1).translate(mx + Math.cos(i * 1.3) * 0.32, 1.05 + (i % 2) * 0.2, mz + Math.sin(i * 1.3) * 0.32), "#e63946"]);
}

/** Bougainvillea climbing a front wall beside the door and spilling along its top: a woody trunk from the ground that
 *  branches out, the leaves as clumps flattened against the wall, close enough to overlap into one mass that fans out
 *  towards the top, the magenta bracts in clusters over its outside, and a crown along the top of the wall, thickest
 *  over the trunk and thinner towards its ends, that spills over the top. `P(u, v)` as for houseFront; `u0` where it
 *  grows, `span` how far the crown reaches each way, `top` the wall's height. */
export function bougainvillea(parts: Part[], P: (u: number, v: number) => [number, number], u0: number, span: number, top: number, seed: number) {
  const r = rand(seed);
  const LEAVES = ["#3f7d3a", "#2f6b34", "#4a8a3c"], PINKS = ["#f2369a", "#e62e8a", "#ff4fa8", "#d81b7a", "#c2187f"];
  // the wall's frame: x along it, y up, z out of it (P's v), for shapes flattened against it
  const [ox, oz] = P(0, 0), [nx, nz] = P(0, 1);
  const out = new THREE.Vector3(nx - ox, 0, nz - oz).normalize(), up = new THREE.Vector3(0, 1, 0);
  const frame = new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(up, out), up, out);
  const at = (g: THREE.BufferGeometry, u: number, y: number, v: number, c: string) => { const [x, z] = P(u, v); parts.push([g.applyMatrix4(frame).translate(x, y, z), c]); };
  const clump = (u: number, y: number, v: number, s: number, c: string, wide: number, flat: number) => at(new THREE.IcosahedronGeometry(s, 0).rotateZ(r() * Math.PI).scale(wide, 0.78 + r() * 0.18, flat), u, y, v, c);
  const leaves = (u: number, y: number, s: number, v = 0.2) => clump(u, y, v, s, LEAVES[Math.floor(r() * LEAVES.length)], 1.35, 0.42);
  const bracts = (u: number, y: number, s: number, v = 0.36) => clump(u, y, v, s, PINKS[Math.floor(r() * PINKS.length)], 1.2, 0.55);
  // the trunk, leaning a little, and two branches from it towards the sides of the mass
  const lean = (r() - 0.5) * 0.4, fork = 1.5;
  const stem = (pts: [number, number][], r0: number) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ua, ya] = pts[i], [ub, yb] = pts[i + 1];
      const [xa, za] = P(ua, 0.1), [xb, zb] = P(ub, 0.1);
      const a = new THREE.Vector3(xa, ya, za), b = new THREE.Vector3(xb, yb, zb);
      const g = new THREE.CylinderGeometry(r0 * 0.8, r0, a.distanceTo(b) + 0.04, 5, 1, true);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, b.clone().sub(a).normalize())).translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      parts.push([g, "#6b4a2f"]);
    }
  };
  stem([[u0, 0], [u0 + lean * 0.5, 0.8], [u0 + lean, fork]], 0.07);
  for (const s of [-1, 1]) stem([[u0 + lean, fork], [u0 + lean + s * 0.45, fork + 0.9], [u0 + lean + s * 0.7, fork + 2.0]], 0.045);
  // the mass: rows of clumps fanning out from just under the fork to the top, leaves and bracts over them (about a
  // thousand triangles a plant: the town draws them all in one mesh, at every view)
  const rows = Math.max(3, Math.round((top - fork + 0.3) / 0.75));
  for (let k = 0; k < rows; k++) {
    const f = k / (rows - 1), y = fork - 0.3 + f * (top - fork - 0.1);
    const half = 0.3 + f * 1.25, n = 1 + Math.round(half / 0.68);
    for (let i = 0; i < n; i++) {
      const u = u0 + lean + (n === 1 ? 0 : -half + (2 * half * i) / (n - 1)) + (r() - 0.5) * 0.25, yy = y + (r() - 0.5) * 0.25;
      leaves(u, yy, 0.5 + r() * 0.14);
      if (r() < 0.75) bracts(u + (r() - 0.5) * 0.45, yy + (r() - 0.3) * 0.35, 0.3 + r() * 0.1);
    }
  }
  // the crown along the top: thickest over the trunk, thinner towards its ends, spilling over the wall's top
  const n = Math.max(3, Math.round(span * 1.9));
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * 2 - 1, mid = 1 - Math.abs(t), u = u0 + lean + t * span + (r() - 0.5) * 0.2;
    leaves(u, top - 0.05 - mid * 0.3, 0.44 + mid * 0.2, 0.12);
    bracts(u + (r() - 0.5) * 0.35, top + 0.02 - mid * 0.2, 0.28 + mid * 0.08, 0.3);
    if (r() < 0.5) bracts(u + (r() - 0.5) * 0.3, top + 0.22, 0.17 + r() * 0.06, 0.05);
  }
}

/** A Mexican flag hanging at (x, y, z), turned to `rot`: green, white and red, the eagle a brown dot in the middle. */
export function mexicanFlag(parts: Part[], x: number, y: number, z: number, rot: number, w: number, h: number) {
  ["#006847", "#ffffff", "#ce1126"].forEach((c, i) => parts.push([place(box(w / 3 + 0.002, h, 0.04, (i - 1) * (w / 3), y, 0), x, z, rot), c]));
  parts.push([place(new THREE.CylinderGeometry(h * 0.13, h * 0.13, 0.06, 10).rotateX(Math.PI / 2).translate(0, y, 0), x, z, rot), "#8a5a2b"]);
}

// ------------------------------------------------------------------------------------------------ the church

/** A parroquia facing the square: an ochre nave under a barrel vault with buttresses and small windows, a white
 *  facade with pilasters, an arched wooden door at the top of three steps and a round window over it, and on top an
 *  espadaña (a bell gable) with three bells in two tiers and a cross. (x, z) is the foot of the steps' top. */
export function church(parts: Part[], col: Colliders, x: number, z: number, face: Face): void {
  const rot = faceRot(face), add = (g: THREE.BufferGeometry, c: string) => parts.push([place(g, x, z, rot), c]);
  const OCHRE = "#e7b04a", TRIM = "#f7f2e6", D = 10, W = 9;
  // the nave and its vault
  add(box(W - 0.6, 7.4, D - 0.6, 0, 3.7, -(0.6 + (D - 0.6) / 2)), OCHRE);
  add(new THREE.CylinderGeometry((W - 0.6) / 2, (W - 0.6) / 2, D - 0.9, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2).scale(1, 0.45, 1).translate(0, 7.4, -(0.6 + (D - 0.6) / 2)), "#f1ece2");
  add(box(W - 0.4, 0.25, D - 0.4, 0, 7.45, -(0.6 + (D - 0.6) / 2)), TRIM);
  for (const s of [-1, 1]) {
    for (const bz of [-3.6, -7.4]) add(box(0.5, 6.2, 0.9, s * (W / 2 - 0.05), 3.1, bz), TRIM); // buttresses
    for (const wz of [-2.1, -5.5, -8.9]) {
      add(box(0.06, 1.5, 0.8, s * (W / 2 - 0.27), 4.7, wz), "#3b4654");
      add(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI / 2).translate(s * (W / 2 - 0.27), 5.45, wz), "#3b4654");
    }
  }
  // the facade: the wall, its plinth and cornice, two pilasters
  add(box(W, 8.6, 0.6, 0, 4.3, -0.3), OCHRE);
  add(box(W + 0.2, 0.7, 0.8, 0, 0.35, -0.3), "#cdb98f");
  add(box(W + 0.4, 0.32, 0.85, 0, 8.6, -0.3), TRIM);
  for (const s of [-1, 1]) add(box(0.7, 8.4, 0.25, s * (W / 2 - 0.35), 4.3, 0.1), TRIM);
  // three steps up to the door
  for (let i = 0; i < 3; i++) add(box(4.6, 0.15 * (i + 1), 0.45, 0, 0.075 * (i + 1), 1.13 - i * 0.45), "#d6c7a8");
  // the arched door and its stone frame, the round window
  add(box(2.0, 3.0, 0.1, 0, 1.95, 0.04), "#5b3a22");
  add(new THREE.CylinderGeometry(1.0, 1.0, 0.1, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2).translate(0, 3.45, 0.04), "#5b3a22");
  add(box(0.04, 2.9, 0.12, 0, 1.95, 0.1), "#3d2716");
  for (const s of [-1, 1]) add(box(0.32, 3.0, 0.2, s * 1.16, 1.95, 0.08), TRIM);
  add(new THREE.TorusGeometry(1.16, 0.16, 4, 12, Math.PI).translate(0, 3.45, 0.08), TRIM);
  add(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 18).rotateX(Math.PI / 2).translate(0, 6.15, 0.02), "#2d3a4a");
  add(new THREE.TorusGeometry(0.8, 0.12, 4, 14).translate(0, 6.15, 0.06), TRIM);
  // the espadaña: two tiers of openings with a bell in each, on the facade above the cornice
  const pier = (x0: number, x1: number, y0: number, y1: number) => add(box(x1 - x0, y1 - y0, 0.6, (x0 + x1) / 2, (y0 + y1) / 2, -0.3), OCHRE);
  const bell = (bx: number, top: number, s: number) => {
    const g = new THREE.LatheGeometry([[0.02, 0.5], [0.12, 0.48], [0.18, 0.4], [0.21, 0.22], [0.28, 0.05], [0.33, 0]].map(([r, y]) => new THREE.Vector2(r * s, y * s)), 10);
    add(g.translate(bx, top - 0.5 * s, -0.3), "#8c6a2c");
    add(box(1.0, 0.1, 0.12, bx, top + 0.02, -0.3), "#3d2716");
  };
  pier(-3.2, -2.05, 8.75, 11.2); pier(-0.95, 0.95, 8.75, 11.2); pier(2.05, 3.2, 8.75, 11.2);
  for (const s of [-1, 1]) { pier(s > 0 ? 0.95 : -2.05, s > 0 ? 2.05 : -0.95, 8.75, 9.1); pier(s > 0 ? 0.95 : -2.05, s > 0 ? 2.05 : -0.95, 10.85, 11.2); bell(s * 1.5, 10.8, 1); }
  add(box(6.8, 0.18, 0.75, 0, 11.27, -0.3), TRIM);
  pier(-1.6, -0.5, 11.35, 13.0); pier(0.5, 1.6, 11.35, 13.0); pier(-0.5, 0.5, 11.35, 11.6); pier(-0.5, 0.5, 12.65, 13.0);
  bell(0, 12.6, 0.85);
  for (const s of [-1, 1]) {
    add(box(1.6, 0.4, 0.6, s * 2.4, 11.55, -0.3), OCHRE); // the shoulders stepping down to the sides
    add(box(0.9, 0.35, 0.6, s * 2.05, 11.92, -0.3), OCHRE);
    add(new THREE.ConeGeometry(0.18, 0.55, 6).translate(s * 3.05, 12.03, -0.3), TRIM); // finials
    add(new THREE.SphereGeometry(0.13, 8, 6).translate(s * 1.6, 13.25, -0.3), TRIM);
  }
  const crest = new THREE.Shape();
  crest.moveTo(-1.7, 0); crest.lineTo(0, 0.75); crest.lineTo(1.7, 0); crest.lineTo(-1.7, 0);
  add(new THREE.ExtrudeGeometry(crest, { depth: 0.6, bevelEnabled: false }).translate(0, 13.08, -0.6), OCHRE);
  add(box(3.6, 0.15, 0.72, 0, 13.05, -0.3), TRIM);
  add(box(0.13, 1.1, 0.13, 0, 14.35, -0.3), TRIM); // the cross
  add(box(0.62, 0.13, 0.13, 0, 14.55, -0.3), TRIM);
  blockRect(col, x, z, rot, -W / 2 - 0.3, W / 2 + 0.3, -D, 0);
}

// ------------------------------------------------------------------------------------------------ street furniture

/** A street sign post at a corner: a pole and two name blades, one along each street (both read from both sides). */
export function streetSign(parts: Part[], col: Colliders, atlas: SignAtlas, x: number, z: number, ew: string, ns: string) {
  parts.push([cyl(0.045, 0.05, 3.3, x, 1.65, z, 6), "#7d868c"]);
  parts.push([new THREE.SphereGeometry(0.07, 6, 5).translate(x, 3.32, z), "#7d868c"]);
  if (ew) atlas.add("street:" + ew, 384, 96, drawBlade(ew), 1.3, 0.32, x, 3.02, z, 0, true);
  if (ns) atlas.add("street:" + ns, 384, 96, drawBlade(ns), 1.3, 0.32, x, 2.66, z, Math.PI / 2, true);
  col.addCircle(x, z, 0.1);
}

/** The stop sign's face (its octagon, front and back) at the top of Maple Harbor's pole. */
export function stopFace(atlas: SignAtlas, word: string, x: number, z: number) {
  atlas.add("stop:" + word, 128, 128, drawOctagon(word), 0.8, 0.8, x, 2.45, z + 0.02, 0, true);
}

/** A tope (speed bump) across a road from (x1, z1) to (x2, z2): a low hump painted in yellow and black stripes; and
 *  its yellow warning sign on a post at (sx, sz), facing the traffic coming up to it. */
export function tope(parts: Part[], col: Colliders, atlas: SignAtlas, word: string, x1: number, z1: number, x2: number, z2: number, sx: number, sz: number, srot: number) {
  const len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(2, Math.round(len / 0.6)), rot = Math.atan2(x2 - x1, z2 - z1);
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n, piece = len / n;
    // a closed cylinder lying along the bump's line (across the road), squashed into a hump 0.1 m high and 0.8 m
    // wide, its middle at the road's surface (the lower half is under it)
    const g = new THREE.CylinderGeometry(0.4, 0.4, piece, 12).rotateX(Math.PI / 2).scale(1, 0.25, 1);
    parts.push([place(g, x1 + (x2 - x1) * f, z1 + (z2 - z1) * f, rot), i % 2 ? "#2a2a2a" : "#f2c230"]);
  }
  parts.push([cyl(0.04, 0.04, 2.3, sx, 1.15, sz, 6), "#7d868c"]);
  atlas.add("tope:" + word, 128, 128, drawDiamond(word), 0.75, 0.75, sx, 2.2, sz, srot, false);
  col.addCircle(sx, sz, 0.08);
}

/** A tricycle food cart (elotes and esquites): a steel box on two front wheels with a pot steaming on top, the
 *  rider's seat and a wheel behind, a striped parasol and the painted sign on the box's sides. */
export function foodCart(parts: Part[], col: Colliders, atlas: SignAtlas, x: number, z: number, rot: number, sign: string) {
  const add = (g: THREE.BufferGeometry, c: THREE.ColorRepresentation) => parts.push([place(g, x, z, rot), c]);
  const steel = "#c9ced3", red = "#c8102e";
  add(box(0.85, 0.65, 1.2, 0, 0.82, 0.45), steel);
  add(box(0.87, 0.14, 1.22, 0, 0.62, 0.45), red);
  for (const s of [-1, 1]) add(new THREE.TorusGeometry(0.27, 0.045, 6, 14).rotateY(Math.PI / 2).translate(s * 0.5, 0.3, 0.45), "#26292e");
  add(new THREE.TorusGeometry(0.27, 0.045, 6, 14).rotateY(Math.PI / 2).translate(0, 0.3, -0.85), "#26292e");
  add(box(0.06, 0.06, 1.0, 0, 0.55, -0.4), "#26292e");
  add(box(0.06, 0.5, 0.06, 0, 0.8, -0.65), "#26292e");
  add(box(0.3, 0.08, 0.36, 0, 1.08, -0.68), "#1d1d1d");
  add(box(0.6, 0.05, 0.05, 0, 1.25, -0.2), "#26292e");
  add(cyl(0.26, 0.24, 0.42, 0.1, 1.36, 0.6, 14), "#dfe3e6"); // the pot of elotes and its lid
  add(new THREE.SphereGeometry(0.26, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.4, 1).translate(0.1, 1.57, 0.6), "#c9ced3");
  for (const [bx, c] of [[-0.25, "#f4f1ea"], [-0.32, "#c8102e"], [-0.18, "#f2c230"]] as [number, string][]) add(cyl(0.04, 0.04, 0.18, bx, 1.24, 0.1 + bx, 8), c);
  add(cyl(0.02, 0.02, 1.7, -0.36, 1.95, 0.9, 5), "#7d868c");
  const colours = ["#f6a800", "#ffffff", "#e4007c", "#ffffff", "#00a6a6", "#ffffff", "#7ac143", "#ffffff"];
  for (let i = 0; i < 8; i++) add(new THREE.ConeGeometry(1.0, 0.42, 1, 1, false, (i / 8) * Math.PI * 2, Math.PI / 4).translate(-0.36, 2.9, 0.9), colours[i]);
  // the sign on both sides of the box
  for (const s of [-1, 1]) {
    const o = new THREE.Vector3(s * 0.44, 0.84, 0.45).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
    atlas.add("cart:" + sign, 384, 128, drawPainted(sign, "", "#fff3d0", "#c8102e", "#7a1020"), 1.1, 0.37, x + o.x, o.y, z + o.z, rot + s * Math.PI / 2);
  }
  blockRect(col, x, z, rot, -0.6, 0.6, -1.2, 1.15);
}

// ------------------------------------------------------------------------------------------------ the corner shop

/** A tiendita in the ground floor of a building's front: an opening with shelves of goods, a counter, the rolled-up
 *  shutter, the painted sign over it, crates of soda bottles by the door, and a painted sign on the side wall. `P(u,
 *  v)` and `rot` as for houseFront; `side` places the side wall's sign (x, z, heading). */
export function tiendita(parts: Part[], col: Colliders, atlas: SignAtlas, P: (u: number, v: number) => [number, number], rot: number, u: number, w: number, sign: string, side: { x: number; z: number; rot: number; text: string } | null) {
  const add = (g: THREE.BufferGeometry, uu: number, v: number, c: THREE.ColorRepresentation) => { const [x, z] = P(uu, v); parts.push([place(g, x, z, rot), c]); };
  const r = rand(77);
  add(box(w - 0.4, 2.5, 0.06, 0, 1.35, 0), u, 0.04, "#3a2f2a");
  for (let k = 0; k < 3; k++) {
    add(box(w - 0.6, 0.04, 0.3, 0, 1.0 + k * 0.55, 0), u, 0.2, "#e8e2d6");
    for (let i = 0; i < 14; i++) {
      const gx = -w / 2 + 0.5 + i * ((w - 1) / 13), gh = 0.2 + r() * 0.2;
      add(box(0.15, gh, 0.15, gx, 1.02 + k * 0.55 + gh / 2, 0), u, 0.22, ["#e63946", "#f6a800", "#1f6fd1", "#2a9d8f", "#f4f1ea", "#7ac143", "#b5179e"][Math.floor(r() * 7)]);
    }
  }
  add(box(w - 0.3, 0.95, 0.55, 0, 0.475, 0), u, 0.42, "#2f6db5"); // the counter
  add(box(w - 0.2, 0.06, 0.65, 0, 0.98, 0), u, 0.42, "#c08a52");
  for (let i = 0; i < 4; i++) add(cyl(0.1, 0.1, 0.24, -w / 2 + 0.6 + i * 0.35, 1.13, 0), u, 0.42, i % 2 ? "#f4d35e" : "#e9c46a");
  add(new THREE.CylinderGeometry(0.2, 0.2, w - 0.2, 10).rotateZ(Math.PI / 2).translate(0, 2.75, 0), u, 0.18, "#8d939a");
  for (let i = 0; i < 3; i++) { // crates of empty bottles stacked by the door
    add(box(0.45, 0.32, 0.35, 0, 0.16 + i * 0.32, 0), u + w / 2 + 0.45, 0.45, i % 2 ? "#f2c230" : "#c8102e");
    for (let k = 0; k < 4; k++) add(cyl(0.035, 0.035, 0.12, -0.12 + (k % 2) * 0.24, 0.32 + i * 0.32 + 0.06, -0.08 + Math.floor(k / 2) * 0.16), u + w / 2 + 0.45, 0.45, "#5a3a25");
  }
  const [cx, cz] = P(u, 0.42);
  blockRect(col, cx, cz, rot, -w / 2, w / 2 + 0.75, -0.35, 0.35);
  const [sx, sz] = P(u, 0.07);
  atlas.add("shop:" + sign, 768, 128, drawPainted(sign, "", "#f6d743", "#c8102e", "#1f4f8f"), w + 0.2, 0.75, sx, 3.15, sz, rot);
  // (between the ground floor's windows and the first floor's)
  if (side) atlas.add("shopside:" + side.text, 512, 160, drawPainted(sign, side.text, "#ffffff", "#2f6db5", "#c8102e"), 4.2, 1.3, side.x, 3.5, side.z, side.rot);
}

/** The shop signs painted by hand (task 2): a painted board with the name, as drawPainted, on its own canvas (the
 *  same size as Maple Harbor's printed board). */
export function paintedSignTexture(text: string, bg: string, fg: string, edge: string) {
  const cv = document.createElement("canvas");
  cv.width = 768; cv.height = 160;
  drawPainted(text, "", bg, fg, edge)(cv.getContext("2d")!, 768, 160);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ------------------------------------------------------------------------------------------------ the last details

/** A huacal: a crate of wooden slats (two rows), open at the top, its bottom at (x, y, z) in the frame of `add`; the
 *  top layer of `fruit` (a colour, or none) in it. */
function huacal(add: (g: THREE.BufferGeometry, c: THREE.ColorRepresentation) => void, x: number, y: number, z: number, fruit: string | null, r: () => number) {
  const w = 0.52, d = 0.36, h = 0.3, wood = "#cfa86e", dark = "#9c7a48";
  add(box(w, 0.02, d, x, y + 0.01, z), dark);
  for (const k of [0, 1]) {
    const yy = y + 0.07 + k * (h - 0.12);
    for (const s of [-1, 1]) {
      add(box(w, 0.05, 0.016, x, yy, z + s * (d / 2 - 0.008)), wood);
      add(box(0.016, 0.05, d, x + s * (w / 2 - 0.008), yy, z), wood);
    }
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(box(0.035, h, 0.035, x + sx * (w / 2 - 0.02), y + h / 2, z + sz * (d / 2 - 0.02)), dark);
  if (!fruit) return;
  add(box(w - 0.04, 0.02, d - 0.04, x, y + h - 0.07, z), dark); // what's under the top layer
  for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) {
    const g = new THREE.OctahedronGeometry(fruit === "#3f9b2f" ? 0.05 : 0.065, 0).translate(x - 0.18 + i * 0.12 + (r() - 0.5) * 0.02, y + h - 0.02 + r() * 0.03, z - 0.11 + k * 0.11);
    add(g, fruit);
  }
}

/** In front of the mercado, where Maple Harbor's supermarket keeps its shopping carts (task: the last details): stacks
 *  of huacales of tomatoes, oranges, limes and chiles against the wall, a diablito (a red hand truck) leaning by them
 *  with two crates on its nose, and a cargo tricycle with its box full of crates, parked along the front. `P(u, v)`
 *  and `rot` as for houseFront (u along the front from the door, v out from the wall). */
export function mercadoFront(parts: Part[], col: Colliders, P: (u: number, v: number) => [number, number], rot: number) {
  const r = rand(91);
  /** Parts made round (0, 0) with their front to the street, placed at P(u, v), turned `turn` more. */
  const at = (u: number, v: number, turn = 0) => (g: THREE.BufferGeometry, c: THREE.ColorRepresentation) => { const [x, z] = P(u, v); parts.push([place(g.rotateY(turn), x, z, rot), c]); };
  const TOMATO = "#d62828", ORANGE = "#f77f00", LIME = "#3f9b2f", CHILE = "#2d6a1f", MANGO = "#f4b400";
  // the stacks against the wall: three, two and one crates high, and one in front
  ([[-7.75, 0.3, 3, ORANGE, 0.05], [-7.18, 0.3, 2, TOMATO, -0.04], [-6.6, 0.3, 1, LIME, 0.06], [-7.0, 0.75, 1, CHILE, 0.3], [-6.45, 0.74, 1, MANGO, -0.2]] as [number, number, number, string, number][])
    .forEach(([u, v, n, fruit, turn]) => { for (let i = 0; i < n; i++) huacal(at(u, v, turn + (i % 2) * 0.06), 0, i * 0.3, 0, i === n - 1 ? fruit : null, r); });
  blockRect(col, ...P(-7.1, 0.55), rot, -1.0, 1.0, -0.45, 0.45);
  // the diablito: two rails on two wheels, its nose plate on the ground, leaning back against the wall, two crates on it
  {
    const lean: Part[] = [];
    const add = (g: THREE.BufferGeometry, c: THREE.ColorRepresentation) => lean.push([g, c]);
    const RED = "#c8102e", BLACK = "#26292e";
    for (const s of [-1, 1]) add(box(0.04, 1.3, 0.04, s * 0.21, 0.69, -0.02), RED);
    for (const y of [0.45, 0.9, 1.3]) add(box(0.46, 0.035, 0.03, 0, y, -0.02), RED);
    add(new THREE.TorusGeometry(0.13, 0.025, 4, 10, Math.PI).rotateZ(0).translate(0, 1.34, -0.02), RED); // the handle
    add(box(0.46, 0.02, 0.24, 0, 0.03, 0.1), "#8d939a"); // the nose plate
    huacal(add, 0, 0.04, 0.2, TOMATO, r);
    huacal(add, 0, 0.35, 0.2, LIME, r);
    const tilt = new THREE.Matrix4().makeRotationX(-0.3);
    const [x, z] = P(-5.75, 0.45);
    for (const [g, c] of lean) parts.push([place(g.applyMatrix4(tilt).translate(0, 0.06, 0), x, z, rot), c]);
    for (const s of [-1, 1]) parts.push([place(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 12).rotateZ(Math.PI / 2).translate(s * 0.27, 0.13, -0.12), x, z, rot), BLACK]);
    blockRect(col, x, z, rot, -0.35, 0.35, -0.4, 0.45);
  }
  // the cargo tricycle: a blue box on two front wheels, the rider's seat and a wheel behind, crates in the box; it
  // stands along the front, its box towards the corner
  {
    const add = at(-4.0, 1.25, Math.PI / 2);
    const BLUE = "#2f6db5", BLACK = "#26292e";
    add(box(0.95, 0.06, 0.85, 0, 0.62, 0.55), "#8d939a"); // the box's floor
    for (const s of [-1, 1]) add(box(0.04, 0.3, 0.85, s * 0.46, 0.79, 0.55), BLUE);
    for (const s of [-1, 1]) add(box(0.95, 0.3, 0.04, 0, 0.79, 0.55 + s * 0.41), BLUE);
    for (const s of [-1, 1]) add(new THREE.TorusGeometry(0.28, 0.045, 6, 14).rotateY(Math.PI / 2).translate(s * 0.52, 0.3, 0.55), BLACK);
    add(new THREE.TorusGeometry(0.3, 0.045, 6, 14).rotateY(Math.PI / 2).translate(0, 0.32, -0.95), BLACK);
    add(box(0.05, 0.05, 1.15, 0, 0.55, -0.4), BLUE); // the frame
    add(box(0.05, 0.55, 0.05, 0, 0.8, -0.62), BLUE);
    add(box(0.24, 0.07, 0.3, 0, 1.1, -0.64), "#1d1d1d"); // the seat
    add(box(0.05, 0.4, 0.05, 0, 0.95, 0.1), BLUE);
    add(box(0.62, 0.04, 0.04, 0, 1.15, 0.1), BLACK); // the handlebar
    huacal(add, -0.2, 0.65, 0.35, TOMATO, r);
    huacal(add, 0.22, 0.65, 0.74, ORANGE, r);
    huacal(add, 0.22, 0.65, 0.35, null, r);
    huacal(add, 0.22, 0.95, 0.35, MANGO, r);
    const [x, z] = P(-4.0, 1.25);
    blockRect(col, x, z, rot + Math.PI / 2, -0.62, 0.62, -1.3, 1.02);
  }
}

/** The service's own colours (Correos de México: rosa mexicano and lime green, since 2008). */
const drawBuzon: Draw = (x, w, h) => {
  x.fillStyle = "#ffffff"; roundRect(x, 2, 2, w - 4, h - 4, h * 0.12); x.fill();
  x.lineWidth = 5; x.strokeStyle = "#e4007c"; roundRect(x, 6, 6, w - 12, h - 12, h * 0.1); x.stroke();
  x.fillStyle = "#e4007c"; x.textAlign = "center"; x.textBaseline = "middle";
  const s = fit(x, "BUZÓN", h * 0.42, w * 0.8);
  x.font = `900 ${s}px ${FONT}`; x.fillText("BUZÓN", w / 2, h * 0.4);
  const s2 = fit(x, "Correos de México", h * 0.2, w * 0.82, FONT, "800");
  x.fillStyle = "#5f6b2d"; x.font = `800 ${s2}px ${FONT}`; x.fillText("Correos de México", w / 2, h * 0.76);
};

/** A Correos de México buzón where Maple Harbor's post office has its blue mailbox: a box in rosa mexicano on a grey
 *  post, a lime-green rounded top and band, the slot, and its plate ("BUZÓN · Correos de México"). Its foot at (x, z),
 *  the slot facing `rot`. (The collider is the old mailbox's.) */
export function buzon(parts: Part[], atlas: SignAtlas | null, x: number, z: number, rot: number) {
  const add = (g: THREE.BufferGeometry, c: THREE.ColorRepresentation) => parts.push([place(g, x, z, rot), c]);
  const PINK = "#e4007c", LIME = "#9bc53d", GREY = "#5f6368";
  add(box(0.42, 0.04, 0.36, 0, 0.02, 0), GREY);
  add(box(0.2, 0.74, 0.2, 0, 0.4, 0), GREY);
  add(box(0.58, 0.74, 0.46, 0, 1.13, 0), PINK);
  add(box(0.62, 0.07, 0.5, 0, 0.79, 0), LIME);
  add(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 14, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).scale(1, 0.55, 0.96).translate(0, 1.5, 0), LIME);
  add(box(0.36, 0.04, 0.03, 0, 1.38, 0.235), "#2a2a2a"); // the slot
  add(box(0.42, 0.012, 0.05, 0, 1.415, 0.238), "#c2006a");
  if (!atlas) {
    // (in a room, which has no sign atlas: the plate without its words)
    add(box(0.46, 0.23, 0.012, 0, 1.1, 0.236), "#ffffff");
    add(box(0.38, 0.08, 0.014, 0, 1.14, 0.237), PINK);
    return;
  }
  const o = new THREE.Vector3(0, 0, 0.237).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  atlas.add("buzon", 256, 128, drawBuzon, 0.46, 0.23, x + o.x, 1.1, z + o.z, rot);
}

/** The backyard party's walls in the Mexican way (s63), where Maple Harbor has a white picket fence: a block wall (a
 *  barda) painted in `look.wall` over a darker base, with a cap and pillars, along the back (z bz+6.5) and the sides
 *  (x bx±8) of the yard, open on the east side between z gate0 and gate1, where a metal gate's two leaves stand open
 *  against the yard. Balloons on strings from the gate's pillars. The colliders are town.ts's (the fence's). */
export function bardaYard(parts: Part[], col: Colliders, bx: number, bz: number, gate0: number, gate1: number, look: { wall: string; base: string; cap: string; gate: string }, balloons: [number, number, number][]) {
  const H = 1.85, T = 0.2;
  /** A stretch of wall from (xa, za) to (xb, zb) (along x or along z). */
  const wall = (xa: number, za: number, xb: number, zb: number) => {
    const alongX = za === zb, len = Math.abs(alongX ? xb - xa : zb - za), cx = (xa + xb) / 2, cz = (za + zb) / 2;
    const g = (w: number, h: number, y: number) => alongX ? box(len, h, w, cx, y, cz) : box(w, h, len, cx, y, cz);
    parts.push([g(T, H - 0.3, 0.3 + (H - 0.3) / 2), look.wall], [g(T + 0.02, 0.3, 0.15), look.base], [g(T + 0.1, 0.07, H + 0.035), look.cap]);
    // pillars every 3 m or so
    const n = Math.max(1, Math.round(len / 3));
    for (let i = 0; i <= n; i++) {
      const f = i / n, px = xa + (xb - xa) * f, pz = za + (zb - za) * f;
      parts.push([box(0.34, H + 0.1, 0.34, px, (H + 0.1) / 2, pz), look.wall], [box(0.4, 0.08, 0.4, px, H + 0.14, pz), look.cap]);
    }
  };
  wall(bx - 8, bz + 6.5, bx + 8, bz + 6.5);
  wall(bx - 8, bz - 5.5, bx - 8, bz + 6.5);
  wall(bx + 8, bz - 5.5, bx + 8, gate0);
  wall(bx + 8, gate1, bx + 8, bz + 6.5);
  // the gate: two leaves of sheet metal below and bars above, swung open into the yard against nothing
  const lw = (gate1 - gate0) / 2 - 0.12;
  for (const [hz, s] of [[gate0 + 0.06, 1], [gate1 - 0.06, -1]] as [number, number][]) {
    const x0 = bx + 8 - 0.2, xm = x0 - lw / 2;
    parts.push([box(lw, 0.8, 0.04, xm, 0.55, hz), look.gate]); // the sheet
    for (const y of [0.13, 0.96, 1.7]) parts.push([box(lw, 0.05, 0.05, xm, y, hz), look.gate]);
    for (const xx of [x0, x0 - lw]) parts.push([box(0.06, 1.62, 0.06, xx, 0.92, hz), look.gate]);
    for (let i = 1; i < 8; i++) parts.push([box(0.025, 0.74, 0.025, x0 - (i / 8) * lw, 1.33, hz), look.gate]);
    for (let i = 1; i < 8; i++) parts.push([new THREE.ConeGeometry(0.04, 0.1, 4).translate(x0 - (i / 8) * lw, 1.77, hz), look.gate]);
    col.addBox(xm, hz + s * 0.02, lw, 0.12);
  }
  // the balloons' strings, from the pillars' tops
  for (const [x, y, z] of balloons) {
    const gz = Math.abs(z - gate0) < Math.abs(z - gate1) ? gate0 : gate1;
    const a = new THREE.Vector3(bx + 8, H + 0.2, gz), b = new THREE.Vector3(x, y - 0.3, z), len = a.distanceTo(b);
    const g = new THREE.CylinderGeometry(0.006, 0.006, len, 3).translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())).translate(a.x, a.y, a.z);
    parts.push([g, "#f4f1ea"]);
  }
}

// ------------------------------------------------------------------------------------------- the cenote and the ruins

const LIMESTONE = ["#d8cfb8", "#c9bfa6", "#b8ad93", "#e2dac6"];
/** A limestone boulder: a lumpy low-poly stone `s` across at (x, y, z), squashed by `sy`. */
function stone(parts: Part[], r: () => number, x: number, y: number, z: number, s: number, sy: number, colour?: string) {
  parts.push([new THREE.IcosahedronGeometry(s / 2, 0).scale(1 + r() * 0.3, sy, 1 + r() * 0.3).rotateY(r() * Math.PI).translate(x, y, z), colour ?? LIMESTONE[Math.floor(r() * LIMESTONE.length)]]);
}
/** A clump of jungle: two or three green blobs. */
function jungle(parts: Part[], r: () => number, x: number, y: number, z: number, s: number) {
  const greens = ["#3f7d3a", "#4f9a3e", "#2f6b33", "#5aa83c"];
  for (let i = 0; i < 3; i++) parts.push([new THREE.IcosahedronGeometry(s * (0.55 + r() * 0.35), 0).scale(1, 0.8, 1).translate(x + (r() - 0.5) * s, y + s * 0.4 + r() * s * 0.3, z + (r() - 0.5) * s), greens[Math.floor(r() * greens.length)]]);
}

/** A cenote in the meadow west of town (TOWN.md task 8): turquoise water at the foot of a curved limestone cliff with a
 *  dark cave mouth, vines hanging and the jungle on top, a low rim of stones on the town's side (east) with a wooden
 *  deck and steps down to the water, and a palapa where the entrance is paid, with its painted sign. One part of the
 *  town's merged meshes (the one that casts no shadow: it is seen from afar, beyond the town's edge); nothing to walk
 *  on. */
export function cenote(parts: Part[], atlas: SignAtlas, x: number, z: number, sign: string) {
  const r = rand(808);
  const R = 5.2;
  // the water: dark at the edge, turquoise, light over the white sand in the middle
  parts.push([new THREE.CircleGeometry(R + 0.4, 32).rotateX(-Math.PI / 2).translate(x, 0.03, z), "#13808a"]);
  parts.push([new THREE.CircleGeometry(R - 0.3, 32).rotateX(-Math.PI / 2).translate(x, 0.04, z), "#22aeb0"]);
  parts.push([new THREE.CircleGeometry(R * 0.5, 24).rotateX(-Math.PI / 2).translate(x + 0.8, 0.05, z), "#5fd3c8"]);
  // the cliff round the far side (west), higher in the middle, leaning in over the water; the cave's dark mouth in it
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * 0.45 + (i / 16) * Math.PI * 1.1; // from the north-west round to the south-west
    const k = Math.sin(((i / 16)) * Math.PI); // highest in the middle
    for (const [rr, y, s] of [[R + 0.9, 0.6, 2.2], [R + 1.4, 1.6 + k * 0.8, 2.0], [R + 0.6, 2.6 + k * 1.0, 1.7]] as [number, number, number][]) {
      stone(parts, r, x + Math.cos(a) * rr, y * (0.6 + k * 0.5), z + Math.sin(a) * rr, s + r() * 0.6, 0.8);
    }
    if (i % 2 === 0) jungle(parts, r, x + Math.cos(a) * (R + 2.2), 2.6 + k * 1.8, z + Math.sin(a) * (R + 2.2), 1.6 + r());
    if (i % 3 === 1) parts.push([box(0.06, 1.2 + r() * 1.2, 0.06, x + Math.cos(a) * (R + 0.2), 2.2 + k * 0.8, z + Math.sin(a) * (R + 0.2)), "#3f7d3a"]); // a vine
  }
  parts.push([new THREE.CircleGeometry(1.6, 16, 0, Math.PI).scale(1.3, 0.75, 1).rotateY(Math.PI / 2).translate(x - R - 0.25, 0.05, z), "#1d2a2c"]);
  // the low rim on the town's side, and the deck with its steps down to the water
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI * 0.55 + (i / 11) * Math.PI * 1.1;
    if (Math.abs(a) < 0.22) continue; // the deck
    stone(parts, r, x + Math.cos(a) * (R + 0.5), 0.15, z + Math.sin(a) * (R + 0.5), 0.9 + r() * 0.5, 0.5);
  }
  const WOOD = "#8a6a4a", DARK = "#6b4f36";
  parts.push([box(2.2, 0.1, 1.8, x + R + 0.6, 0.55, z), WOOD]);
  for (const [px, pz] of [[0.9, 0.8], [0.9, -0.8], [-0.9, 0.8], [-0.9, -0.8]]) parts.push([box(0.12, 0.6, 0.12, x + R + 0.6 + px, 0.25, z + pz), DARK]);
  for (let i = 0; i < 3; i++) parts.push([box(0.4, 0.06, 1.4, x + R - 0.75 - i * 0.4, 0.42 - i * 0.14, z), WOOD]);
  for (const s of [-1, 1]) {
    parts.push([box(0.06, 0.9, 0.06, x + R + 1.6, 0.95, z + s * 0.85), DARK], [box(0.06, 0.9, 0.06, x + R - 0.4, 0.95, z + s * 0.85), DARK]);
    parts.push([box(2.1, 0.06, 0.06, x + R + 0.6, 1.38, z + s * 0.85), DARK]);
  }
  // the palapa where the entrance is paid, and the sign on a post facing the town
  const hx = x + R + 4.2, hz = z + 4.4;
  for (const [px, pz] of [[1.2, 1.0], [1.2, -1.0], [-1.2, 1.0], [-1.2, -1.0]]) parts.push([cyl(0.08, 0.1, 2.3, hx + px, 1.15, hz + pz, 6), WOOD]);
  parts.push([box(1.8, 0.95, 0.5, hx, 0.475, hz + 0.7), "#2a9d8f"], [box(1.9, 0.06, 0.6, hx, 0.98, hz + 0.7), "#c08a52"]);
  parts.push([new THREE.ConeGeometry(2.2, 1.4, 4).rotateY(Math.PI / 4).scale(1.15, 1, 1).translate(hx, 2.95, hz), THATCH]);
  parts.push([new THREE.ConeGeometry(0.5, 0.5, 4).rotateY(Math.PI / 4).translate(hx, 3.75, hz), THATCH_DARK]);
  const sx = x + R + 5.6, sz = z - 1.6;
  parts.push([cyl(0.06, 0.06, 1.7, sx, 0.85, sz, 6), WOOD]);
  atlas.add("cenote:" + sign, 512, 192, drawPainted(sign, "Nado · Snorkel · Entrada", "#e9f7f2", "#13808a", "#1f4f8f"), 1.8, 0.68, sx + 0.05, 1.6, sz, Math.PI / 2);
  for (const [jx, jz, s] of [[x + R + 6.5, z + 7.5, 2.4], [x + 2, z + R + 2.6, 2.2], [x + 3, z - R - 2.4, 2.0], [x + R + 7, z - 5, 1.8]] as [number, number, number][]) jungle(parts, r, jx, 0, jz, s);
}

/** Small Mayan ruins on a rocky point by the sea west of the beach (TOWN.md task 8), in Tulum's way: a stepped platform
 *  of grey limestone on the rocks, a little temple on it with a dark doorway between two columns and a cornice, stairs
 *  up from the land, a smaller shrine lower down, fallen stones; the temple faces the land (`rot` 0: +z). */
export function ruins(parts: Part[], x: number, z: number) {
  const r = rand(919);
  const GREY = ["#c9c1aa", "#b9b09a", "#d6cfbb", "#a9a08a"], DARK = "#3a3530";
  // the point: big rocks from the shore out into the sea, highest under the platform
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, d = r() * 7;
    const rx = x + Math.cos(a) * d * 1.1, rz = z - 3 + Math.sin(a) * d - r() * 3;
    stone(parts, r, rx, -0.4 + Math.max(0, 2.2 - d * 0.35), rz, 3.5 + r() * 2.5, 0.75, ["#9a9483", "#8d8778", "#a8a190"][i % 3]);
  }
  // the platform in two tiers, the stairs up from the land (south), the temple on top
  const add = (g: THREE.BufferGeometry, c: string) => parts.push([g.translate(x, 0, z), c]);
  add(box(9, 1.0, 7, 0, 2.6, -2.6), GREY[0]);
  add(box(6.6, 0.8, 5, 0, 3.5, -2.8), GREY[1]);
  for (let i = 0; i < 9; i++) add(box(2.4, 0.42, 0.5, 0, 0.21 + i * 0.42, 2.6 - i * 0.48), GREY[i % 2 ? 2 : 0]);
  add(box(4.2, 2.3, 3.2, 0, 5.05, -3.1), GREY[2]);
  add(box(4.6, 0.3, 3.6, 0, 6.35, -3.1), GREY[1]); // the cornice
  add(box(4.3, 0.35, 3.3, 0, 6.67, -3.1), GREY[0]); // the roof
  for (const s of [-1.6, -0.55, 0.55, 1.6]) add(box(0.5, 0.35, 0.5, s, 7.0, -3.1), GREY[3]); // what is left of the crest
  add(box(1.6, 1.7, 0.1, 0, 4.75, -1.47), DARK); // the doorway
  for (const s of [-1, 1]) add(cyl(0.22, 0.24, 1.75, s * 0.55, 4.77, -1.38, 8), GREY[3]);
  add(box(1.8, 0.25, 0.4, 0, 5.75, -1.4), GREY[1]); // the lintel
  // the weathered corners: stones missing from the tiers
  for (const [bx, by, bz] of [[-4.3, 3.0, 0.7], [4.2, 2.3, -6.0], [3.1, 3.8, -0.4]]) add(box(0.7, 0.5, 0.7, bx, by, bz), "#8d8778");
  // a little shrine lower down on the point, and fallen stones
  add(box(2.6, 0.6, 2.4, -6.6, 1.3, -6.4), GREY[1]);
  add(box(1.6, 1.3, 1.4, -6.6, 2.25, -6.4), GREY[2]);
  add(box(1.9, 0.25, 1.7, -6.6, 3.0, -6.4), GREY[0]);
  add(box(0.6, 0.8, 0.08, -6.6, 1.95, -5.66), DARK);
  for (let i = 0; i < 7; i++) add(box(0.5 + r() * 0.4, 0.35, 0.4 + r() * 0.3, -3 + r() * 8, 0.3 + r() * 1.2, 1.5 + r() * 2.5).rotateY(r() * 2), GREY[i % 4]);
  // and the jungle at the land's edge
  for (const [jx, jz, s] of [[-5.5, 3.5, 2.2], [5.8, 3.0, 2.4], [7.5, -1.5, 1.8], [-8.5, 0.5, 1.9]] as [number, number, number][]) jungle(parts, r, x + jx, 0, z + jz, s);
}

// ------------------------------------------------------------------------------------------------ the tianguis

const POLE = "#7d868c", TIN = "#a3abb2", CLAY = ["#b5562f", "#c4683a", "#a24a2a", "#cf7a45"];
/** A tianguis stall's extents in its own frame (x across, z towards the customers): the solid table and the lona. */
export const STALL_SIZE = { table: { x: 2.1, z0: -0.9, z1: 0.9 }, lona: { x: 2.25, z0: -1.5, z1: 1.7 } };
const CLOTHS = ["#f4f1ea", "#e9f2f7", "#fdf3d7", "#f7e1ea"];
/** A color made darker (for a sign's letters in its lona's color). */
const darker = (hex: string, k = 0.72) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0")).join("");

/** A tianguis stall (theme.ts `tianguis`; s91a) made round (x, z), its front (where the customers stand) towards `rot`
 *  (0: +z): a table under an oilcloth, four poles (the front two out over the customers' side) with the bars a lona is
 *  tied to, the lona itself tilted down to the front and sagging a little between the bars, with a white valance;
 *  the goods on the table (and in front of it, or hanging from the frame), and the stall's painted sign standing on
 *  the front bar, where it hides nobody's face. The table and the front poles are solid. */
export function tianguisStall(parts: Part[], goodsParts: Part[], col: Colliders, atlas: SignAtlas, x: number, z: number, rot: number, goods: TianguisGoods, lona: string, sign: [string, string], seed: number, lonaParts: Part[] = parts) {
  const r = rand(seed);
  const add = (g: THREE.BufferGeometry, c: THREE.ColorRepresentation) => parts.push([place(g, x, z, rot), c]);
  // (the lona and its valance may go in a mesh of their own: `lonaParts`, which the camera looks through, town.ts)
  const addLona = (g: THREE.BufferGeometry, c: THREE.ColorRepresentation) => lonaParts.push([place(g, x, z, rot), c]);
  const addGoods = (g: THREE.BufferGeometry, c: THREE.ColorRepresentation) => goodsParts.push([place(g, x, z, rot), c]);
  // the table
  const W = 4.0, D = 1.5, H = 0.85, cloth = CLOTHS[Math.floor(r() * CLOTHS.length)];
  add(box(W, 0.05, D, 0, H - 0.025, 0), "#a87b4f");
  add(box(W + 0.04, 0.012, D + 0.04, 0, H + 0.006, 0), cloth);
  add(box(W + 0.04, 0.42, 0.012, 0, H - 0.2, D / 2 + 0.025), cloth);
  for (const s of [-1, 1]) for (const t of [-1, 1]) add(box(0.06, H - 0.05, 0.06, s * (W / 2 - 0.25), (H - 0.05) / 2, t * (D / 2 - 0.12)), "#6f5236");
  // the frame
  const zb = -1.0, zf = 1.45, yb = 2.8, yf = 2.57, xp = 1.95;
  for (const s of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.035, 0.035, yb, 6, 1, true).translate(s * xp, yb / 2, zb), POLE);
    add(new THREE.CylinderGeometry(0.035, 0.035, yf, 6, 1, true).translate(s * xp, yf / 2, zf), POLE);
  }
  add(box(2 * xp + 0.1, 0.05, 0.05, 0, yb, zb), POLE);
  add(box(2 * xp + 0.1, 0.05, 0.05, 0, yf, zf), POLE);
  // the lona, seen from above and from below, and its valance
  const L0 = STALL_SIZE.lona.z0, L1 = STALL_SIZE.lona.z1, LW = 2 * STALL_SIZE.lona.x;
  const yAt = (lz: number) => yb + 0.03 + (yf - yb) * ((lz - zb) / (zf - zb));
  for (const down of [false, true]) {
    const g = new THREE.PlaneGeometry(LW, L1 - L0, 8, 4).rotateX(down ? Math.PI / 2 : -Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const lx = p.getX(i), lz = p.getZ(i) + (L0 + L1) / 2;
      const along = Math.min(1, Math.max(0, (lz - zb) / (zf - zb)));
      p.setXYZ(i, lx, yAt(lz) - 0.11 * Math.sin(Math.PI * (lx / LW + 0.5)) * Math.sin(Math.PI * along) - (down ? 0.015 : 0), lz);
    }
    g.computeVertexNormals();
    addLona(g, lona);
  }
  for (const s of [1, -1]) addLona(new THREE.PlaneGeometry(LW, 0.2).rotateY(s > 0 ? 0 : Math.PI).translate(0, yAt(L1) - 0.1, L1 + s * 0.004), "#f4f1ea");
  // the painted sign standing on the front bar, on a board (its back seen from behind)
  const ink = darker(lona.toLowerCase() === "#f6c000" ? "#c98a00" : lona);
  add(box(1.78, 0.56, 0.03, 0, yf + 0.33, zf), "#3b2a20");
  const o = new THREE.Vector3(0, 0, zf + 0.02).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  atlas.add("tianguis:" + sign.join("|") + ink, 512, 160, drawPainted(sign[0], sign[1], "#fff6dc", ink, "#3b2a20"), 1.72, 0.52, x + o.x, yf + 0.33, z + o.z, rot);
  // solid: the table, the front poles
  blockRect(col, x, z, rot, -STALL_SIZE.table.x, STALL_SIZE.table.x, STALL_SIZE.table.z0, STALL_SIZE.table.z1);
  for (const s of [-1, 1]) { const q = new THREE.Vector3(s * xp, 0, zf).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot); col.addCircle(x + q.x, z + q.z, 0.08); }
  STALL_GOODS[goods](addGoods, r, H);
}

/** A crate of produce for the stalls (lighter than the mercado's huacal: the stalls show dozens): the box, its
 *  shadowed inside and the top layer of `fruit`. */
function crate(add: Add, x: number, y: number, z: number, fruit: string) {
  add(box(0.5, 0.26, 0.34, x, y + 0.13, z), "#cfa86e");
  add(box(0.52, 0.05, 0.36, x, y + 0.2, z), "#b38b55");
  add(box(0.44, 0.02, 0.28, x, y + 0.25, z), "#7a5a32");
  for (let i = 0; i < 6; i++) add(new THREE.OctahedronGeometry(0.075, 0).translate(x - 0.15 + (i % 3) * 0.15, y + 0.29, z - 0.07 + Math.floor(i / 3) * 0.14), fruit);
}

type Add = (g: THREE.BufferGeometry, c: THREE.ColorRepresentation) => void;

/** What each kind of stall shows, in its frame (the table top at height h, from x -2 to 2 and z -0.75 to 0.75, the
 *  customers at +z). */
const STALL_GOODS: Record<TianguisGoods, (add: Add, r: () => number, h: number) => void> = {
  // Doña Mari's flowers: buckets of roses, sunflowers (girasoles), cempasúchil, gerberas and white callas on the table,
  // tall gladiolas in buckets on the ground in front
  flowers: (add, r, h) => {
    const bunch = (bx: number, by: number, bz: number, c: string, tall: number) => {
      add(new THREE.CylinderGeometry(0.15, 0.12, 0.3, 8).translate(bx, by + 0.15, bz), TIN);
      add(new THREE.ConeGeometry(0.2, tall, 6).rotateX(Math.PI).translate(bx, by + 0.3 + tall / 2, bz), "#3f7d3a");
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + r(), d = i ? 0.1 : 0;
        add(new THREE.OctahedronGeometry(0.075, 0).translate(bx + Math.cos(a) * d, by + 0.3 + tall + (i ? -0.03 : 0.04), bz + Math.sin(a) * d), c);
      }
    };
    const sunflower = (bx: number, by: number, bz: number) => {
      add(new THREE.CylinderGeometry(0.15, 0.12, 0.3, 8).translate(bx, by + 0.15, bz), TIN);
      for (let i = 0; i < 3; i++) {
        const fx = bx + (i - 1) * 0.11, fy = by + 0.75 + (i % 2) * 0.12, fz = bz + 0.04;
        add(new THREE.CylinderGeometry(0.012, 0.012, fy - by - 0.3, 4, 1, true).translate(fx, (fy + by + 0.3) / 2, fz - 0.03), "#3f7d3a");
        add(new THREE.CylinderGeometry(0.12, 0.12, 0.025, 10).rotateX(Math.PI / 2 - 0.35).translate(fx, fy, fz), "#ffc300");
        add(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 8).rotateX(Math.PI / 2 - 0.35).translate(fx, fy + 0.005, fz + 0.012), "#5a3a1a");
      }
    };
    const cols = ["#d62839", "#f77f00", "#ff8fab", "#f8f4ec", "#e4007c", "#ffd166"];
    [-1.6, -1.05, -0.5, 0.6, 1.15, 1.65].forEach((bx, i) => bunch(bx, h, -0.32 + (i % 2) * 0.12, cols[i], 0.32 + r() * 0.12));
    for (const bx of [-0.95, 1.4]) bunch(bx, h, 0.35, cols[(Math.floor(r() * 6))], 0.25);
    sunflower(0.05, h, -0.2);
    // gladiolas: tall spikes of color in buckets on the ground, in front of the table's ends
    for (const [bx, c] of [[-1.55, "#e4007c"], [-1.15, "#f8f4ec"], [1.2, "#d62839"], [1.6, "#ff8fab"]] as [number, string][]) {
      add(new THREE.CylinderGeometry(0.17, 0.14, 0.38, 8).translate(bx, 0.19, 1.05), TIN);
      for (let i = 0; i < 4; i++) add(new THREE.ConeGeometry(0.05, 0.7, 5).translate(bx + (i % 2 ? 0.06 : -0.06), 0.75 + (i % 2) * 0.08, 1.05 + (i < 2 ? 0.05 : -0.05)), c);
      add(new THREE.ConeGeometry(0.14, 0.5, 5).rotateX(Math.PI).translate(bx, 0.6, 1.05), "#3f7d3a");
    }
  },
  // fruit: huacales of mangos, oranges and limes, papayas, pineapples, half a watermelon
  fruit: (add, r, h) => {
    const MANGO = "#f4b400", ORANGE = "#f77f00", LIME = "#3f9b2f";
    crate(add, -1.45, h, -0.15, MANGO); crate(add, -0.85, h, -0.15, ORANGE); crate(add, -1.15, h, 0.3, MANGO);
    crate(add, 0.35, h, 0.25, LIME);
    for (let i = 0; i < 3; i++) add(new THREE.SphereGeometry(0.1, 6, 4).scale(1, 1, 1.8).rotateY(0.3 + i * 0.4).translate(-0.15 + i * 0.22, h + 0.09, -0.3 + (i % 2) * 0.08), i % 2 ? "#f28c28" : "#9bbf3b");
    for (let i = 0; i < 3; i++) {
      const px = 0.85 + i * 0.32, pz = -0.25 + (i % 2) * 0.2;
      add(new THREE.SphereGeometry(0.12, 6, 4).scale(1, 1.35, 1).translate(px, h + 0.16, pz), "#c98b2b");
      add(new THREE.ConeGeometry(0.09, 0.22, 5).translate(px, h + 0.42, pz), "#3f7d3a");
    }
    add(new THREE.SphereGeometry(0.26, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.9, 1.2).translate(1.55, h, 0.3), "#2f7d32");
    add(new THREE.CylinderGeometry(0.26, 0.26, 0.01, 8).scale(1, 1, 1.2).translate(1.55, h + 0.005, 0.3), "#e63946");
    // crates stacked on the ground in front
    crate(add, -1.5, 0, 1.0, ORANGE); crate(add, -1.5, 0.26, 1.0, MANGO); crate(add, 1.5, 0, 1.0, LIME);
  },
  // vegetables: huacales of tomatoes, chiles, onions and avocados, a stack of nopales, limes
  veg: (add, r, h) => {
    crate(add, -1.45, h, -0.15, "#d62828"); crate(add, -0.85, h, -0.15, "#2d6a1f"); crate(add, -0.25, h, -0.15, "#f1ead8");
    crate(add, 0.4, h, -0.15, "#33502a"); crate(add, -1.15, h, 0.3, "#c1121f");
    for (let i = 0; i < 6; i++) add(new THREE.CylinderGeometry(0.12, 0.12, 0.025, 7).scale(1, 1, 1.5).rotateY(0.4 * i).translate(0.9 + (i % 2) * 0.05, h + 0.015 + i * 0.026, 0.25), i % 2 ? "#5a9a3a" : "#4b8a33");
    for (let i = 0; i < 9; i++) add(new THREE.OctahedronGeometry(0.05, 0).translate(1.35 + (i % 3) * 0.1, h + 0.05 + Math.floor(i / 3) * 0.03, 0.15 + Math.floor(i / 3) * 0.08), "#4caf50");
    crate(add, 1.5, 0, 1.0, "#d62828"); crate(add, -1.5, 0, 1.0, "#2d6a1f");
  },
  // pan dulce: trays of conchas (white, pink and chocolate sugar tops) and a basket of bolillos
  bread: (add, r, h) => {
    const TOPS = ["#f6efe2", "#f2b8c6", "#6b3d24", "#f3d9a4"];
    for (let k = 0; k < 3; k++) {
      const tx = -1.25 + k * 1.05;
      add(box(0.9, 0.03, 0.62, tx, h + 0.015, -0.05), "#c9ced3");
      for (let i = 0; i < 8; i++) add(new THREE.SphereGeometry(0.085, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 1).translate(tx - 0.3 + (i % 4) * 0.2, h + 0.03, -0.22 + Math.floor(i / 4) * 0.28), TOPS[(i + k) % TOPS.length]);
    }
    add(new THREE.CylinderGeometry(0.3, 0.24, 0.16, 9, 1, true).translate(1.55, h + 0.08, 0.2), "#b8844a");
    for (let i = 0; i < 6; i++) add(new THREE.SphereGeometry(0.08, 6, 4).scale(1.6, 0.8, 1).rotateY(i).translate(1.45 + (i % 3) * 0.1, h + 0.16, 0.12 + Math.floor(i / 3) * 0.14), "#d9a35b");
  },
  // piñatas: three stars hanging from the front bar, a burro and two small stars on the table
  pinatas: (add, r, h) => {
    const PAPER = ["#e4007c", "#f6c000", "#1f6fd1", "#f77f00", "#2a9d5c", "#8e3fd1"];
    const star = (sx: number, sy: number, sz: number, s: number, k: number) => {
      add(new THREE.IcosahedronGeometry(0.26 * s, 0).translate(sx, sy, sz), PAPER[k % PAPER.length]);
      const dirs: [number, number, number][] = [[0, 1, 0], [0, -1, 0], [1, 0.2, 0], [-1, 0.2, 0], [0.5, -0.4, 0.75], [-0.5, -0.4, 0.75], [0, 0.3, -1]];
      dirs.forEach(([dx, dy, dz], i) => {
        const d = new THREE.Vector3(dx, dy, dz).normalize();
        const g = new THREE.ConeGeometry(0.085 * s, 0.38 * s, 5).translate(0, 0.19 * s + 0.2 * s, 0);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)).translate(sx, sy, sz);
        add(g, PAPER[(k + i + 1) % PAPER.length]);
      });
    };
    [[-1.2, 0], [0, 2], [1.2, 4]].forEach(([sx, k]) => {
      add(box(0.01, 0.42, 0.01, sx, 2.32, 1.45), "#f4f1ea");
      star(sx, 1.82, 1.45, 1, k);
    });
    star(-1.3, h + 0.28, -0.1, 0.7, 1); star(1.35, h + 0.28, 0.0, 0.7, 3);
    // the burro: fringed bands of paper, a long neck, big ears
    const B = (w: number, hh: number, d: number, bx: number, by: number, bz: number, c: string) => add(box(w, hh, d, bx, by, bz), c);
    const y0 = h + 0.4;
    for (let i = 0; i < 4; i++) B(0.14, 0.3, 0.28, -0.24 + i * 0.14, y0, 0.05, PAPER[(i + 1) % PAPER.length]);
    B(0.14, 0.32, 0.16, 0.3, y0 + 0.22, 0.05, PAPER[5]); B(0.26, 0.14, 0.14, 0.38, y0 + 0.36, 0.05, PAPER[0]);
    for (const s of [-1, 1]) B(0.05, 0.16, 0.04, 0.32, y0 + 0.5, 0.05 + s * 0.05, PAPER[1]);
    for (const [lx, lz] of [[-0.24, -0.07], [-0.24, 0.17], [0.16, -0.07], [0.16, 0.17]]) B(0.06, 0.26, 0.06, lx, h + 0.13, lz, PAPER[2]);
  },
  // barro: ollas, cazuelas and jarritos on the table, big ollas on the ground in front
  pottery: (add, r, h) => {
    const olla = (ox: number, oy: number, oz: number, s: number, c: string) => {
      const pts = [[0.0, 0], [0.12, 0.005], [0.2, 0.1], [0.19, 0.22], [0.11, 0.31], [0.1, 0.34], [0.12, 0.37]].map(([a, b]) => new THREE.Vector2(a * s, b * s));
      add(new THREE.LatheGeometry(pts, 7).translate(ox, oy, oz), c);
    };
    const cazuela = (cx: number, cy: number, cz: number, s: number) => {
      const pts = [[0.0, 0], [0.16, 0.01], [0.26, 0.08], [0.3, 0.13]].map(([a, b]) => new THREE.Vector2(a * s, b * s));
      add(new THREE.LatheGeometry(pts, 8).translate(cx, cy, cz), CLAY[2]);
      add(new THREE.CylinderGeometry(0.27 * s, 0.27 * s, 0.01, 8, 1, true).translate(cx, cy + 0.11 * s, cz), "#5a2a18");
    };
    olla(-1.6, h, -0.3, 1.2, CLAY[0]); olla(-1.1, h, -0.25, 1.0, CLAY[1]); olla(-1.35, h, 0.2, 0.8, CLAY[3]);
    cazuela(-0.4, h, -0.2, 1.0); cazuela(-0.4, h + 0.12, -0.2, 0.85); cazuela(0.25, h, 0.15, 1.1);
    for (let i = 0; i < 6; i++) {
      const jx = 0.75 + (i % 3) * 0.2, jz = -0.25 + Math.floor(i / 3) * 0.24;
      add(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 8).translate(jx, h + 0.06, jz), CLAY[i % 4]);
      add(new THREE.TorusGeometry(0.035, 0.012, 4, 6, Math.PI).rotateZ(-Math.PI / 2).translate(jx + 0.06, h + 0.07, jz), CLAY[i % 4]);
    }
    olla(1.55, h, -0.15, 1.3, CLAY[1]); olla(1.6, h, 0.35, 0.9, CLAY[0]);
    for (const [ox, oz, s] of [[-1.55, 1.05, 2.0], [-0.95, 1.1, 1.6], [1.25, 1.05, 1.8], [1.75, 1.1, 1.4]] as [number, number, number][]) olla(ox, 0, oz, s, CLAY[Math.floor(r() * 4)]);
  },
  // sombreros de palma: stacks of straw hats on the table, three hung from the back bar
  hats: (add, r, h) => {
    const STRAW = ["#e6c27a", "#dcb466", "#ecd08f"];
    const hat = (hx: number, hy: number, hz: number, crown: boolean, k: number, tilt = 0) => {
      const brim = new THREE.CylinderGeometry(0.3, 0.31, 0.02, 9).rotateX(tilt).translate(hx, hy, hz);
      add(brim, STRAW[k % 3]);
      if (crown) {
        add(new THREE.CylinderGeometry(0.11, 0.135, 0.13, 7).rotateX(tilt).translate(hx, hy + 0.07, hz), STRAW[(k + 1) % 3]);
        add(new THREE.CylinderGeometry(0.137, 0.137, 0.03, 7, 1, true).rotateX(tilt).translate(hx, hy + 0.025, hz), "#3b2a20");
      }
    };
    [-1.45, -0.7, 0.05, 0.8, 1.5].forEach((sx, i) => {
      const n = 3 + (i % 3);
      for (let k = 0; k < n; k++) hat(sx, h + 0.012 + k * 0.035, (i % 2 ? 0.18 : -0.15), k === n - 1, k + i);
    });
    for (const [hx, k] of [[-1.2, 0], [0, 1], [1.2, 2]] as [number, number][]) hat(hx, 1.95, -0.96, true, k, Math.PI / 2 - 0.15);
  },
  // rebozos y sarapes: folded stacks in stripes, two sarapes hanging from the back bar
  textiles: (add, r, h) => {
    const BANDS = ["#c8102e", "#f77f00", "#f6c000", "#2a9d5c", "#1f6fd1", "#8e3fd1", "#e4007c", "#f4f1ea", "#3b2a20"];
    [-1.5, -0.9, -0.3, 0.3, 0.9, 1.5].forEach((sx, i) => {
      const n = 4 + (i % 3);
      for (let k = 0; k < n; k++) add(box(0.48, 0.045, 0.34, sx, h + 0.023 + k * 0.046, (i % 2 ? 0.12 : -0.12)), BANDS[(i * 3 + k * 2) % BANDS.length]);
    });
    for (const [sx, k] of [[-0.95, 0], [0.95, 4]] as [number, number][]) {
      for (let i = 0; i < 9; i++) add(box(0.12, 1.25, 0.012, sx - 0.48 + i * 0.12, 2.12, -0.98), BANDS[(k + i) % BANDS.length]);
      add(box(1.1, 0.04, 0.03, sx, 2.76, -0.98), "#3b2a20");
    }
  },
  // hamacas de Yucatán: three hanging from the back bar in rainbow stripes, rolled ones on the table
  hammocks: (add, r, h) => {
    const RAINBOW = ["#e4007c", "#f77f00", "#f6c000", "#2a9d5c", "#1f6fd1", "#8e3fd1"];
    for (const [hx, k] of [[-1.25, 0], [0, 2], [1.25, 4]] as [number, number][]) {
      // gathered at the top, wide below: bands from the bar down, each a little wider
      for (let i = 0; i < 7; i++) {
        const w = 0.25 + i * 0.12;
        add(box(w, 0.2, 0.015, hx, 2.6 - i * 0.2, -0.95 + i * 0.012), RAINBOW[(k + i) % RAINBOW.length]);
      }
      add(new THREE.ConeGeometry(0.13, 0.25, 4).translate(hx, 2.68, -0.95), "#f4f1ea");
    }
    for (let i = 0; i < 6; i++) add(new THREE.CylinderGeometry(0.1, 0.1, 0.62, 8).rotateZ(Math.PI / 2).translate(-1.2 + (i % 3) * 0.7, h + 0.1 + Math.floor(i / 3) * 0.19, 0.2 - Math.floor(i / 3) * 0.05), RAINBOW[(i * 2) % RAINBOW.length]);
  },
};

// ------------------------------------------------------------------------------------------------ graphics round 2

/** An agave in the ground or a planter at (x, y, z): pointed blue-green leaves fanning out of its heart. */
function agave(parts: Part[], x: number, y: number, z: number, s = 1, k = 0) {
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + k * 0.7, tilt = 0.45 + (i % 3) * 0.22;
    parts.push([new THREE.ConeGeometry(0.08 * s, 0.85 * s, 4).translate(0, 0.42 * s, 0).rotateZ(tilt).rotateY(a).translate(x, y, z), i % 2 ? "#5f8f6a" : "#6fa37a"]);
  }
  parts.push([new THREE.ConeGeometry(0.07 * s, 0.75 * s, 4).translate(x, y + 0.37 * s, z), "#7bb088"]);
}

/** A long low planter (`len` m along `rot`'s x, 0.9 wide) of limestone, with agaves in it. */
function planter(parts: Part[], col: Colliders, x: number, z: number, rot: number, len: number) {
  parts.push([place(box(len, 0.5, 0.9, 0, 0.25, 0), x, z, rot), STONE]);
  parts.push([place(box(len + 0.08, 0.07, 0.98, 0, 0.53, 0), x, z, rot), WHITE]);
  parts.push([place(box(len - 0.2, 0.04, 0.7, 0, 0.5, 0), x, z, rot), "#6b4a2f"]);
  const n = Math.max(1, Math.round(len / 1.6));
  for (let i = 0; i < n; i++) {
    const u = -len / 2 + (i + 0.5) * (len / n), c = Math.cos(rot), s = Math.sin(rot);
    agave(parts, x + u * c, 0.5, z - u * s, 0.95, i);
  }
  blockRect(col, x, z, rot, -len / 2, len / 2, -0.45, 0.45);
}

/** An intercity coach (an autobús de primera, no brand) made round (0, 0), its front towards +z: tall, white over a
 *  band in `stripe` with a line and a swoosh in `accent`, a long band of tinted windows, the windshield under the
 *  destination's dark band (town.ts paints the destination on it), mirrors on stalks, the luggage bays' doors and
 *  three axles. */
export function coachParts(stripe: string, accent: string): Part[] {
  const parts: Part[] = [], L = 11.6, W = 2.5;
  const add = (g: THREE.BufferGeometry, c: THREE.ColorRepresentation) => parts.push([g, c]);
  add(box(W, 0.85, L, 0, 0.88, 0), stripe);
  add(box(W, 2.0, L - 0.1, 0, 2.3, -0.05), "#f4f6f8");
  add(box(W - 0.12, 0.14, L - 0.5, 0, 3.36, -0.1), "#e3e6ea");
  for (const s of [-1, 1]) {
    add(box(0.03, 1.0, L - 2.4, s * (W / 2 + 0.01), 2.42, -0.7), "#2f4a5c");
    for (let z = -L / 2 + 0.6; z < L / 2 - 1.9; z += 1.55) add(box(0.04, 1.02, 0.08, s * (W / 2 + 0.02), 2.42, z), "#f4f6f8");
    add(box(0.03, 0.14, L - 0.6, s * (W / 2 + 0.02), 1.5, 0), accent);
    for (const k of [0, 1]) add(box(0.035, 0.2, 2.6, 0, 0, 0).rotateX(0.32).translate(s * (W / 2 + 0.025), 1.82 + k * 0.3, -L / 2 + 2.2 + k * 0.45), accent);
    for (const z of [-2.4, 0.2]) add(box(0.03, 0.55, 2.0, s * (W / 2 + 0.02), 0.85, z), darker(stripe, 0.82));
    add(box(0.06, 0.06, 0.55, s * 1.35, 2.95, L / 2 - 0.15), "#2b2d31");
    add(box(0.1, 0.34, 0.08, s * 1.58, 2.66, L / 2 + 0.12), "#2b2d31");
  }
  add(box(W - 0.2, 1.45, 0.05, 0, 2.3, L / 2 - 0.02), "#3d6178");
  add(box(W - 0.06, 0.42, 0.06, 0, 3.14, L / 2 - 0.02), "#1d1f22");
  add(box(W, 0.32, 0.16, 0, 0.5, L / 2 + 0.03), "#2b2d31");
  add(box(W, 0.32, 0.16, 0, 0.5, -L / 2 - 0.03), "#2b2d31");
  for (const x of [-0.9, 0.9]) { add(box(0.38, 0.16, 0.05, x, 0.85, L / 2 + 0.02), "#fff4c2"); add(box(0.22, 0.44, 0.05, x, 1.1, -L / 2 - 0.02), "#d8343a"); }
  for (const z of [L / 2 - 2.3, -L / 2 + 2.3, -L / 2 + 3.5]) for (const s of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.52, 0.52, 0.34, 12).rotateZ(Math.PI / 2).translate(s * (W / 2 - 0.1), 0.52, z), "#1d1f22");
    add(new THREE.CylinderGeometry(0.27, 0.27, 0.36, 8).rotateZ(Math.PI / 2).translate(s * (W / 2 - 0.1), 0.52, z), "#9aa3ab");
  }
  return parts;
}

/** A coach's destination in amber capitals on its dark band. */
const drawDestination = (dest: string): Draw => (x, w, h) => {
  x.fillStyle = "#1d1f22"; x.fillRect(0, 0, w, h);
  x.fillStyle = "#ffb627"; x.textAlign = "center"; x.textBaseline = "middle";
  fit(x, dest, h * 0.72, w * 0.9, "'Courier New', monospace", "900"); x.fillText(dest, w / 2, h / 2 + 2);
};

/** The bus terminal outside (theme.ts `busTerminal`; s67a: the andenes, the coaches to Cancún and Tulum) on the station
 *  `b` (layout.ts; it faces north, -z): canopies over its andenes either side of the door (the station's own canopy is
 *  over the door), their painted signs under the front edge, agave planters by the door, and intercity coaches at the
 *  curb of Oak Avenue in front, facing east with the traffic, each with its destination over the windshield. Returns
 *  where benches go under the canopies, facing the street (town.ts puts the town's benches there, with their seats). */
export function busTerminalFront(parts: Part[], col: Colliders, atlas: SignAtlas, b: { x: number; z: number; d: number }, andenes: string[], buses: { x: number; dest: string }[], curbZ: number): [number, number, number][] {
  const front = b.z - b.d / 2, benches: [number, number, number][] = [];
  andenes.forEach((name, i) => {
    const cx = b.x + (i === 0 ? -8.5 : 8.5), half = 2.6, z0 = front - 3.1;
    parts.push([box(half * 2 + 0.4, 0.16, 3.3, cx, 3.55, front - 1.55), "#7a2e2e"]);
    parts.push([box(half * 2 + 0.44, 0.24, 0.08, cx, 3.42, z0 - 0.08), "#f1c27d"]);
    for (const s of [-1, 1]) { parts.push([cyl(0.07, 0.08, 3.5, cx + s * half, 1.75, z0 + 0.15, 8), "#5a5f66"]); col.addCircle(cx + s * half, z0 + 0.15, 0.12); }
    atlas.add("anden:" + name, 384, 112, drawPainted(name, "", "#fff3d0", "#7a2e2e", "#4a1c1c"), 1.7, 0.5, cx, 3.0, z0 - 0.13, Math.PI);
    for (const s of [-1, 1]) benches.push([cx + s * 1.3, front - 1.35, Math.PI]);
  });
  for (const s of [-1, 1]) planter(parts, col, b.x + s * 4.1, front - 0.75, 0, 1.4);
  for (const bus of buses) {
    const z = curbZ - 1.08, rot = Math.PI / 2; // (tight to the curb: clear of the eastbound lane's cars)
    for (const [g, c] of coachParts("#1f6f8b", "#e4007c")) parts.push([place(g, bus.x, z, rot), c]);
    blockRect(col, bus.x, z, rot, -1.3, 1.3, -5.9, 5.9);
    atlas.add("coach:" + bus.dest, 320, 64, drawDestination(bus.dest), 1.9, 0.38, bus.x + 5.79 + 0.02, 3.14, z, rot);
  }
  return benches;
}

/** The airport outside (theme.ts `airportOut`): its drop-off canopy over x0…x1, z0…z1 (the slab's top at y) thatched like
 *  a palapa, a low hip of thatch no higher than `top` (the follow camera's box over it, Game.ts) with a fringe round its
 *  edge; agave planters along the forecourt either side of it; and the painted welcome sign on two posts at the
 *  forecourt's north end, facing the road. */
export function airportFront(parts: Part[], col: Colliders, atlas: SignAtlas, roofs: Part[], c: { x0: number; x1: number; z0: number; z1: number; y: number; top: number }, welcome: [string, string]) {
  const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2, hw = (c.x1 - c.x0) / 2 + 0.5, hd = (c.z1 - c.z0) / 2 + 0.5, k = Math.SQRT2;
  roofs.push([box(c.x1 - c.x0, 0.2, c.z1 - c.z0, cx, c.y - 0.1, cz), "#8a6a4a"]); // the frame under the thatch
  roofs.push([new THREE.CylinderGeometry(1, 1, 0.36, 4, 1, true).rotateY(Math.PI / 4).scale(hw * k, 1, hd * k).translate(cx, c.y - 0.02, cz), THATCH_DARK]);
  roofs.push([new THREE.ConeGeometry(1, c.top - c.y, 4).rotateY(Math.PI / 4).scale(hw * k, 1, hd * k).translate(cx, c.y + (c.top - c.y) / 2, cz), THATCH]);
  // the fringe's ragged lower edge all round
  const edge = (len: number, at: (u: number) => [number, number]) => {
    for (let u = -len / 2 + 0.15; u < len / 2; u += 0.3) { const [x, z] = at(u); roofs.push([new THREE.ConeGeometry(0.13, 0.42, 4).rotateX(Math.PI).translate(x, c.y - 0.32, z), Math.round(u / 0.3) % 2 ? THATCH : THATCH_DARK]); }
  };
  for (const s of [-1, 1]) { edge(hw * 2, (u) => [cx + u, cz + s * hd]); edge(hd * 2, (u) => [cx + s * hw, cz + u]); }
  planter(parts, col, c.x0 + 2.3, c.z0 - 8, Math.PI / 2, 6);
  planter(parts, col, c.x0 + 2.3, c.z1 + 7, Math.PI / 2, 8);
  // (the sign turned a little towards the avenue coming up to the terminal)
  const sx = c.x0 + 1.2, sz = c.z0 - 3.6, rot = -1.15;
  const ax = Math.cos(rot), az = -Math.sin(rot); // (along the sign)
  for (const s of [-1, 1]) { parts.push([cyl(0.09, 0.1, 3.9, sx + s * 2.45 * ax, 1.95, sz + s * 2.45 * az, 8), WOOD]); col.addCircle(sx + s * 2.45 * ax, sz + s * 2.45 * az, 0.14); }
  atlas.add("welcome:" + welcome[0], 640, 192, drawPainted(welcome[0], welcome[1], "#fff6dc", "#1f6f8b", "#e4007c"), 5.0, 1.5, sx + 0.1 * Math.sin(rot), 3.0, sz + 0.1 * Math.cos(rot), rot, true);
}

/** An iron banca for the zócalo (theme.ts `zocalo`), made round (x, z) as town.ts's street bench is (the seat facing
 *  `rot`: 0 is +z): honey wooden slats on dark green wrought-iron ends with curled armrests. */
export function banca(parts: Part[], x: number, z: number, rot: number) {
  const add = (g: THREE.BufferGeometry, c: string) => parts.push([place(g, x, z, rot), c]);
  const iron = "#245a43", wood = "#b07a46";
  for (let i = 0; i < 3; i++) add(box(1.86, 0.05, 0.14, 0, 0.48, -0.15 + i * 0.16), wood);
  for (let i = 0; i < 2; i++) add(box(1.86, 0.12, 0.04, 0, 0.66 + i * 0.18, -0.26), wood);
  for (const s of [-1, 1]) {
    add(box(0.06, 0.06, 0.5, s * 0.86, 0.43, 0), iron);
    for (const dz of [-0.2, 0.2]) add(box(0.05, 0.44, 0.05, s * 0.86, 0.22, dz), iron);
    add(box(0.05, 0.6, 0.05, s * 0.86, 0.75, -0.27), iron);
    add(new THREE.TorusGeometry(0.12, 0.022, 4, 10, Math.PI * 1.3).rotateY(Math.PI / 2).translate(s * 0.9, 0.62, 0.08), iron);
  }
}

/** A laurel's whitewashed trunk (theme.ts `zocalo`): the lower metre and a bit painted white, round a trunk of radius r. */
export function whitewash(parts: Part[], x: number, z: number, r: number) {
  parts.push([cyl(r * 0.92, r * 1.04, 1.25, x, 0.62, z, 10), "#f4f1ea"]);
}

/** The blocks of each letter the town's big letters use, on a grid 4 wide (2 for I) and 6 high: [x0, y0, x1, y1]; a
 *  diagonal as [x0, y0, x1, y1, tilt] (a block turned about its middle). Í is I with its accent. */
const LETTER: Record<string, { w: number; b: number[][] }> = {
  P: { w: 4, b: [[0, 0, 1, 6], [1, 5, 3.4, 6], [3, 2.8, 4, 5.4], [1, 2.6, 3.4, 3.6]] },
  U: { w: 4, b: [[0, 0.6, 1, 6], [3, 0.6, 4, 6], [0.4, 0, 3.6, 1]] },
  E: { w: 4, b: [[0, 0, 1, 6], [1, 5, 4, 6], [1, 2.5, 3.2, 3.5], [1, 0, 4, 1]] },
  R: { w: 4, b: [[0, 0, 1, 6], [1, 5, 3.4, 6], [3, 3.2, 4, 5.4], [1, 2.6, 3.4, 3.6], [1.9, 0, 3.1, 3, -0.38]] },
  T: { w: 4, b: [[0, 5, 4, 6], [1.5, 0, 2.5, 5]] },
  O: { w: 4, b: [[0, 0.6, 1, 5.4], [3, 0.6, 4, 5.4], [0.4, 0, 3.6, 1], [0.4, 5, 3.6, 6]] },
  C: { w: 4, b: [[0, 0.6, 1, 5.4], [0.4, 0, 4, 1], [0.4, 5, 4, 6]] },
  L: { w: 4, b: [[0, 0, 1, 6], [1, 0, 4, 1]] },
  I: { w: 1.6, b: [[0.3, 0, 1.3, 6]] },
  B: { w: 4, b: [[0, 0, 1, 6], [1, 5, 3.2, 6], [1, 2.5, 3.2, 3.5], [1, 0, 3.4, 1], [3, 3.4, 4, 5.4], [3, 0.6, 4, 2.6]] },
  "Í": { w: 1.6, b: [[0.3, 0, 1.3, 6], [0.5, 6.5, 1.5, 7.1, -0.5]] },
};

/** Letras monumentales (theme.ts `letras`): the town's name in big block letters `h` m high standing on a low white
 *  plinth, each letter in its own bright color with a white band across it, their fronts towards +z, from x0 along x
 *  at z. With their collider. */
export function letras(parts: Part[], col: Colliders, text: string, x0: number, z: number, h: number, colors: string[]) {
  const u = h / 6, depth = 0.38, gap = 0.9 * u, space = 2.6 * u;
  let x = x0, k = 0;
  for (const ch of text) {
    if (ch === " ") { x += space; continue; }
    const L = LETTER[ch];
    if (!L) continue;
    const c = colors[k++ % colors.length];
    for (const [a, b, cx, cy, tilt = 0] of L.b) {
      const w = (cx - a) * u, hh = (cy - b) * u, g = box(w, hh, depth, 0, 0, 0);
      if (tilt) g.rotateZ(tilt);
      parts.push([g.translate(x + ((a + cx) / 2) * u, 0.28 + ((b + cy) / 2) * u, z), c]);
    }
    // a white band across the letter's front, a third of the way up (its strokes only: drawn over each block there)
    for (const [a, b, cx, cy, tilt = 0] of L.b) {
      const y0 = 2.0, y1 = 2.35;
      if (tilt || cy <= y0 || b >= y1) continue;
      parts.push([box((cx - a) * u + 0.01, (y1 - y0) * u, 0.02, x + ((a + cx) / 2) * u, 0.28 + ((y0 + y1) / 2) * u, z + depth / 2 + 0.005), "#ffffff"]);
    }
    x += L.w * u + gap;
  }
  const len = x - gap - x0;
  parts.push([box(len + 0.6, 0.28, depth + 0.5, x0 + len / 2, 0.14, z), WHITE]);
  parts.push([box(len + 0.7, 0.05, depth + 0.6, x0 + len / 2, 0.3, z), STONE]);
  col.addBox(x0 + len / 2, z, len + 0.6, depth + 0.5);
}

/** A house number on a talavera tile: a cobalt number on white inside a blue border with little corner flowers. */
const drawTile = (n: string): Draw => (x, w, h) => {
  x.fillStyle = "#f7f3ea"; roundRect(x, 2, 2, w - 4, h - 4, 10); x.fill();
  x.lineWidth = 7; x.strokeStyle = "#1f4e9c"; roundRect(x, 8, 8, w - 16, h - 16, 8); x.stroke();
  x.fillStyle = "#f2b705";
  for (const [cx, cy] of [[18, 18], [w - 18, 18], [18, h - 18], [w - 18, h - 18]]) { x.beginPath(); x.arc(cx, cy, 5, 0, Math.PI * 2); x.fill(); }
  x.fillStyle = "#1f4e9c"; x.textAlign = "center"; x.textBaseline = "middle";
  fit(x, n, h * 0.6, w * 0.7, "Georgia, serif", "900"); x.fillText(n, w / 2, h / 2 + 3);
};

/** A house front's Mexican details (theme.ts `houseFronts`): a painted band (a rodapié) along the bottom of the front
 *  wall, an iron grille (a protección) over the front door, its number on a talavera tile beside it, and potted plants
 *  either side of the door. `P(u, v)` as for houseFront, from the door (u along the front, v out of it), `rot` the
 *  front's heading, `w` the front's width, the door `doorW` wide. */
export function houseDetails(parts: Part[], atlas: SignAtlas, P: (u: number, v: number) => [number, number], rot: number, w: number, doorW: number, wall: string, num: string) {
  const at = (g: THREE.BufferGeometry, u: number, v: number, c: string) => { const [x, z] = P(u, v); parts.push([place(g, x, z, rot), c]); };
  const band = darker(wall, 0.78);
  at(box(w + 0.02, 0.62, 0.04, 0, 0.31, 0), 0, 0.02, band);
  at(box(w + 0.03, 0.05, 0.06, 0, 0.64, 0), 0, 0.02, "#f4f1ea");
  // the grille: upright bars, three cross bars and a scroll, standing out from the door's frame
  const gw = doorW + 0.1, v = 0.27;
  for (let i = 0; i <= 8; i++) at(box(0.035, 2.45, 0.035, -gw / 2 + (i * gw) / 8, 1.25, 0), 0, v, IRON);
  for (const y of [0.05, 1.05, 2.45]) at(box(gw + 0.04, 0.045, 0.045, 0, y, 0), 0, v, IRON);
  at(new THREE.TorusGeometry(0.16, 0.02, 4, 12), 0, v, IRON);
  parts[parts.length - 1][0].translate(0, 1.75, 0);
  const [tx, tz] = P(-(doorW / 2 + 0.62), 0.05);
  atlas.add("tile:" + num, 128, 96, drawTile(num), 0.36, 0.27, tx, 1.95, tz, rot);
  for (const s of [-1, 1]) {
    at(cyl(0.2, 0.15, 0.36, 0, 0.18, 0), s * (doorW / 2 + 0.55), 0.55, "#c56f4c");
    at(new THREE.IcosahedronGeometry(0.28, 0).scale(1, 1.2, 1).translate(0, 0.62, 0), s * (doorW / 2 + 0.55), 0.55, s > 0 ? "#3f7d3a" : "#4a8a3c");
    at(new THREE.OctahedronGeometry(0.08).translate(0.12, 0.82, 0.1), s * (doorW / 2 + 0.55), 0.55, s > 0 ? "#e63946" : "#f6c000");
  }
}

// ------------------------------------------------------------------------------------- graphics round 3

/** The overhead lines of a Mexican street (theme.ts `cables`): concrete poles with a cross arm and a transformer on
 *  every third (in `parts`), three lines sagging from pole to pole, and service drops from a pole to a house's front
 *  (pole index, then the point on the wall) (in `lines`: a mesh of their own in town.ts, without shadows, thin, so the
 *  walking camera neither comes in for them nor stops at them: occlusion.ts leaves them out). */
export function cables(parts: Part[], lines: Part[], col: Colliders, poles: [number, number][], drops: [number, number, number, number][]) {
  const CONCRETE = "#b9b4aa", LINE = "#26292e";
  const line = (a: THREE.Vector3, b: THREE.Vector3, sag: number, r = 0.024) => {
    const n = 6;
    let p = a.clone();
    for (let i = 1; i <= n; i++) {
      const t = i / n, q = new THREE.Vector3().lerpVectors(a, b, t);
      q.y -= Math.sin(t * Math.PI) * sag;
      const d = q.clone().sub(p), len = d.length();
      const g = new THREE.BoxGeometry(r, r, len + 0.01).lookAt(d);
      lines.push([g.translate((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2), LINE]);
      p = q;
    }
  };
  const tops: THREE.Vector3[][] = [];
  poles.forEach(([x, z], i) => {
    parts.push([cyl(0.1, 0.15, 8.6, x, 4.3, z, 6), CONCRETE]);
    parts.push([box(0.12, 0.12, 1.5, x, 7.9, z), "#8a8f94"]);
    for (const dz of [-0.6, 0, 0.6]) parts.push([cyl(0.035, 0.035, 0.12, x, 8.02, z + dz, 5), "#e8e2d6"]);
    if (i % 3 === 1) {
      parts.push([cyl(0.22, 0.22, 0.6, x + 0.32, 6.6, z, 8), "#8a8f94"]);
      parts.push([box(0.05, 0.05, 0.3, x + 0.32, 6.95, z), "#5a5f64"]);
    }
    col.addCircle(x, z, 0.18);
    tops.push([-0.6, 0, 0.6].map((dz) => new THREE.Vector3(x, 8.06, z + dz)));
  });
  for (let i = 0; i + 1 < tops.length; i++) for (let k = 0; k < 3; k++) {
    const a = tops[i][k], b = tops[i + 1][k];
    line(a, b, 0.3 + 0.012 * a.distanceTo(b));
  }
  for (const [pi, x, y, z] of drops) {
    const a = tops[pi][1].clone().setY(7.6), b = new THREE.Vector3(x, y, z);
    line(a, b, 0.25 + 0.02 * a.distanceTo(b), 0.02);
    lines.push([box(0.12, 0.18, 0.08, x, y - 0.12, z), "#d9d4c7"]);
  }
}

/** Clay pots with plants by the shops' doors (a pair at each spot: x, z of the door, how far either side, facing). */
/** (graphics round 5, theme.ts `adoquin`) What stands on a centro's sidewalks: green trash bins on posts (x, z, which
 *  way the bin's opening looks), rows of iron bolardos at the curb (from x0, z0 to x1, z1, one every 1.4 m) and a
 *  shoeshine stand (a bolero's raised chair on its box, the brushes' box at its foot; x, z, the chair facing `rot`). */
export function sidewalkProps(parts: Part[], col: Colliders, o: { bins: [number, number, number][]; bolardos: [number, number, number, number][]; bolero: [number, number, number] | null }) {
  const GREEN = "#2f6b4f", IRON = "#2b2b2b";
  for (const [x, z, rot] of o.bins) {
    const add = (g: THREE.BufferGeometry, c: string) => parts.push([place(g, x, z, rot), c]);
    add(cyl(0.05, 0.05, 1.05, 0, 0.52, -0.2, 6), IRON);
    add(cyl(0.25, 0.21, 0.55, 0, 0.82, 0.05, 8), GREEN);
    add(cyl(0.26, 0.26, 0.05, 0, 1.1, 0.05, 8), "#24533d");
    add(box(0.3, 0.12, 0.02, 0, 0.88, 0.3), "#f4f1ea");
    col.addCircle(x, z, 0.3);
  }
  for (const [x0, z0, x1, z1] of o.bolardos) {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.4));
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n;
      parts.push([cyl(0.1, 0.13, 0.7, x, 0.35, z, 6), IRON]);
      parts.push([new THREE.SphereGeometry(0.11, 6, 3).translate(x, 0.72, z), IRON]);
      parts.push([cyl(0.135, 0.135, 0.06, x, 0.5, z, 6), "#c9a227"]);
      col.addCircle(x, z, 0.15);
    }
  }
  if (o.bolero) {
    const [x, z, rot] = o.bolero, add = (g: THREE.BufferGeometry, c: string) => parts.push([place(g, x, z, rot), c]);
    const WOODB = "#7a4a2c", RED = "#b5332e";
    add(box(0.9, 0.42, 1.0, 0, 0.21, -0.05), WOODB); // the platform
    add(box(0.62, 0.08, 0.5, 0, 0.84, -0.1), RED); // the seat
    add(box(0.62, 0.62, 0.08, 0, 1.17, -0.36), RED); // its back
    for (const sx of [-1, 1]) {
      add(box(0.06, 0.42, 0.46, sx * 0.31, 0.63, -0.1), WOODB);
      add(box(0.08, 0.06, 0.46, sx * 0.34, 1.02, -0.1), WOODB); // the arms
      add(box(0.1, 0.32, 0.12, sx * 0.13, 0.58, 0.32), "#9a9a9a"); // the foot rests
    }
    add(box(0.42, 0.24, 0.26, 0.15, 0.12, 0.8), "#5a3a22"); // the brushes' box
    add(box(0.06, 0.12, 0.26, 0.15, 0.3, 0.8), "#5a3a22");
    add(cyl(0.025, 0.025, 1.5, -0.4, 1.17, -0.45, 5), IRON); // the umbrella
    add(new THREE.ConeGeometry(0.85, 0.32, 8, 1, true).translate(-0.4, 1.95, -0.3), "#1f6fd1");
    blockRect(col, x, z, rot, -0.5, 0.5, -0.6, 0.95);
  }
}

export function macetas(parts: Part[], col: Colliders, spots: [number, number, number][]) {
  const r = rand(7171);
  for (const [x, z, half] of spots) for (const s of [-1, 1]) {
    const px = x + s * half, k = 0.85 + r() * 0.3;
    parts.push([cyl(0.28 * k, 0.2 * k, 0.5 * k, px, 0.25 * k, z, 7), "#b5562f"]);
    parts.push([cyl(0.3 * k, 0.3 * k, 0.06 * k, px, 0.5 * k, z, 7), "#a24a2a"]);
    if (r() < 0.5) for (let i = 0; i < 7; i++) {
      // an agave: pointed leaves fanning out
      const a = (i / 7) * Math.PI * 2 + r(), tilt = 0.35 + (i % 3) * 0.22;
      parts.push([new THREE.ConeGeometry(0.07 * k, 0.75 * k, 4).translate(0, 0.37 * k, 0).rotateZ(-tilt).rotateY(a).translate(px, 0.5 * k, z), i % 2 ? "#5b8c5a" : "#6f9e66"]);
    } else {
      parts.push([new THREE.IcosahedronGeometry(0.42 * k, 0).scale(1, 1.1, 1).translate(px, 0.92 * k, z), "#3f7d3a"]);
      for (let i = 0; i < 5; i++) parts.push([new THREE.OctahedronGeometry(0.07 * k, 0).translate(px + Math.cos(i * 1.3) * 0.3 * k, 1.0 * k + (i % 2) * 0.18 * k, z + Math.sin(i * 1.3) * 0.3 * k), ["#e4007c", "#ff8fab", "#f6c000"][i % 3]]);
    }
    col.addCircle(px, z, 0.3 * k);
  }
}

/** A fruit cart (frutas picadas, cocos): a cart with a glass case of cut fruit in cups, coconuts on top, a striped
 *  umbrella, three bicycle wheels; its painted sign both sides (the atlas). Facing `rot` (its front to +z). */
export function fruitCart(parts: Part[], col: Colliders, atlas: SignAtlas, x: number, z: number, rot: number, sign: string) {
  const add = (g: THREE.BufferGeometry, c: THREE.ColorRepresentation) => parts.push([place(g, x, z, rot), c]);
  add(box(1.3, 0.55, 0.75, 0, 0.75, 0), "#f4f1ea");
  add(box(1.32, 0.12, 0.77, 0, 0.53, 0), "#1f8a4c");
  add(box(1.2, 0.36, 0.62, 0, 1.21, 0), "#cfe8ef");
  add(box(1.24, 0.04, 0.66, 0, 1.41, 0), "#f4f1ea");
  const FR = ["#ff8a00", "#e63946", "#f6c000", "#8ac926", "#ff8fab"];
  for (let i = 0; i < 10; i++) {
    const cx = -0.45 + (i % 5) * 0.225, cz = i < 5 ? -0.13 : 0.13;
    add(cyl(0.06, 0.05, 0.16, cx, 1.12, cz, 6), "#f4f1ea");
    add(cyl(0.055, 0.055, 0.04, cx, 1.22, cz, 6), FR[i % FR.length]);
  }
  for (let i = 0; i < 5; i++) add(new THREE.SphereGeometry(0.13, 6, 4).scale(1, 0.9, 1).translate(-0.4 + i * 0.2, 1.53, (i % 2) * 0.12 - 0.06), "#5a8f2e");
  for (const s of [-1, 1]) add(new THREE.TorusGeometry(0.27, 0.04, 4, 10).translate(s * 0.45, 0.28, -0.42), "#26292e");
  add(new THREE.TorusGeometry(0.27, 0.04, 4, 10).translate(0, 0.28, 0.75), "#26292e");
  add(box(0.05, 0.05, 0.6, 0, 0.45, 0.5), "#26292e");
  add(cyl(0.02, 0.02, 1.8, 0.5, 1.95, 0, 5), "#7d868c");
  const colours = ["#e4007c", "#ffffff", "#f6c000", "#ffffff", "#00a6a6", "#ffffff", "#f77f00", "#ffffff"];
  for (let i = 0; i < 8; i++) add(new THREE.ConeGeometry(1.0, 0.4, 1, 1, false, (i / 8) * Math.PI * 2, Math.PI / 4).translate(0.5, 2.95, 0), colours[i]);
  for (const s of [-1, 1]) {
    const o = new THREE.Vector3(0, 0.75, s * 0.385).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
    atlas.add("fruit:" + sign, 384, 128, drawPainted(sign, "", "#fff3d0", "#1f8a4c", "#14532d"), 1.2, 0.4, x + o.x, o.y, z + o.z, rot + (s > 0 ? 0 : Math.PI));
  }
  blockRect(col, x, z, rot, -0.75, 0.75, -0.75, 1.1);
}

/** The water man's cargo tricycle (the garrafones delivered to the houses): a front box of blue water jugs, a seat, the
 *  rear wheel; facing `rot` (the box ahead, to +z). */
export function waterTrike(parts: Part[], col: Colliders, x: number, z: number, rot: number) {
  const add = (g: THREE.BufferGeometry, c: THREE.ColorRepresentation) => parts.push([place(g, x, z, rot), c]);
  for (const s of [-1, 1]) add(new THREE.TorusGeometry(0.3, 0.04, 4, 10).rotateY(Math.PI / 2).translate(s * 0.48, 0.3, 0.55), "#26292e");
  add(new THREE.TorusGeometry(0.3, 0.04, 4, 10).rotateY(Math.PI / 2).translate(0, 0.3, -0.75), "#26292e");
  add(box(1.05, 0.08, 0.95, 0, 0.55, 0.55), "#1f6fd1");
  for (const [w, d, ox, oz] of [[1.05, 0.04, 0, 0.08], [1.05, 0.04, 0, 1.02], [0.04, 0.95, -0.5, 0.55], [0.04, 0.95, 0.5, 0.55]] as [number, number, number, number][]) add(box(w, 0.3, d, ox, 0.74, oz), "#1f6fd1");
  for (let i = 0; i < 4; i++) {
    const jx = -0.24 + (i % 2) * 0.48, jz = 0.32 + Math.floor(i / 2) * 0.46;
    add(cyl(0.17, 0.17, 0.42, jx, 0.8, jz, 7), "#9fd3ec");
    add(cyl(0.06, 0.07, 0.07, jx, 1.05, jz, 6), "#2a7fc0");
  }
  add(box(0.06, 0.06, 1.2, 0, 0.55, -0.2), "#26292e");
  add(box(0.06, 0.5, 0.06, 0, 0.8, -0.5), "#26292e");
  add(box(0.28, 0.08, 0.32, 0, 1.08, -0.52), "#1d1d1d");
  add(box(0.6, 0.05, 0.05, 0, 1.15, 0.1), "#26292e");
  blockRect(col, x, z, rot, -0.6, 0.6, -1.1, 1.1);
}

/** El Muelle's terrace on the sand beside its pier (theme.ts `terrace`): a wooden deck on posts with a rail, tables in
 *  bright colours with their chairs, a palapa umbrella over each pair. Each deck x0, x1, z0, z1; one collider for it. */
export function terrace(parts: Part[], col: Colliders, decks: [number, number, number, number][]) {
  const CLOTH = ["#e4007c", "#00a6a6", "#f6a800", "#7ac143", "#1f6fd1", "#ff5a36"];
  let k = 0;
  for (const [x0, x1, z0, z1] of decks) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    parts.push([box(w, 0.28, d, cx, 0.26, cz), "#b8895a"]);
    for (let i = 0; i <= Math.round(w / 0.5); i++) parts.push([box(0.02, 0.005, d, x0 + i * (w / Math.round(w / 0.5)), 0.402, cz), "#9a6f45"]);
    for (const [px, pz] of [[x0 + 0.2, z0 + 0.2], [x1 - 0.2, z0 + 0.2], [x0 + 0.2, z1 - 0.2], [x1 - 0.2, z1 - 0.2]]) parts.push([cyl(0.1, 0.1, 0.8, px, 0.0, pz, 6), "#7a5a3a"]);
    // the rail along its sea side and its ends
    parts.push([box(w, 0.06, 0.06, cx, 1.25, z0 + 0.05), "#f4f1ea"]);
    for (let i = 0; i <= 6; i++) parts.push([box(0.05, 0.85, 0.05, x0 + 0.05 + i * ((w - 0.1) / 6), 0.82, z0 + 0.05), "#f4f1ea"]);
    for (const ex of [x0 + 0.05, x1 - 0.05]) parts.push([box(0.06, 0.06, d, ex, 1.25, cz), "#f4f1ea"]);
    const n = Math.max(1, Math.floor(w / 2.6));
    for (let i = 0; i < n; i++) {
      const tx = x0 + (i + 0.5) * (w / n), tz = cz - 0.1, cloth = CLOTH[k++ % CLOTH.length];
      parts.push([cyl(0.42, 0.42, 0.05, tx, 1.12, tz, 8), cloth]);
      parts.push([cyl(0.045, 0.045, 0.7, tx, 0.75, tz, 6), "#3a3d42"]);
      for (const s of [-1, 1]) {
        const chx = tx + s * 0.72, chair = CLOTH[(k + (s > 0 ? 2 : 4)) % CLOTH.length];
        parts.push([box(0.42, 0.05, 0.42, chx, 0.86, tz), chair]);
        parts.push([box(0.05, 0.45, 0.42, chx + s * 0.19, 1.09, tz), chair]);
        for (const [lx, lz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) parts.push([box(0.03, 0.42, 0.03, chx + lx, 0.62, tz + lz), "#3a3d42"]);
      }
      // a palapa umbrella over the table
      parts.push([cyl(0.05, 0.05, 2.5, tx, 1.65, tz, 6), WOOD]);
      parts.push([new THREE.ConeGeometry(1.35, 0.7, 8).translate(tx, 3.15, tz), THATCH]);
      parts.push([new THREE.CylinderGeometry(1.35, 1.42, 0.2, 8, 1, true).translate(tx, 2.72, tz), THATCH_DARK]);
    }
    col.addBox(cx, cz, w, d);
  }
}

/** A coconut seller's cart on the malecón (cocos fríos): a cart with an ice box, green coconuts piled on it, a
 *  machete's block, straws, a parasol; its sign both sides. Facing `rot`. */
export function cocoCart(parts: Part[], col: Colliders, atlas: SignAtlas, x: number, z: number, rot: number, sign: string) {
  const add = (g: THREE.BufferGeometry, c: THREE.ColorRepresentation) => parts.push([place(g, x, z, rot), c]);
  add(box(1.4, 0.7, 0.8, 0, 0.7, 0), "#1f6fd1");
  add(box(1.44, 0.06, 0.84, 0, 1.08, 0), "#f4f1ea");
  for (let i = 0; i < 9; i++) add(new THREE.SphereGeometry(0.15, 6, 4).scale(1, 1.08, 1).translate(-0.45 + (i % 4) * 0.3, 1.24 + Math.floor(i / 4) * 0.2, -0.12 + (i % 2) * 0.24), i % 3 ? "#6aa84f" : "#4f8a3a");
  add(box(0.3, 0.12, 0.3, 0.52, 1.17, 0.2), "#8a5a3c");
  for (let i = 0; i < 6; i++) add(cyl(0.008, 0.008, 0.2, 0.45 + (i % 3) * 0.03, 1.3, -0.2 + Math.floor(i / 3) * 0.03, 4), ["#e4007c", "#f6c000", "#00a6a6"][i % 3]);
  for (const s of [-1, 1]) add(new THREE.TorusGeometry(0.28, 0.045, 4, 10).translate(s * 0.5, 0.29, -0.4), "#26292e");
  add(cyl(0.02, 0.02, 1.7, -0.6, 1.95, 0.3, 5), "#7d868c");
  const colours = ["#00a6a6", "#ffffff", "#7ac143", "#ffffff", "#00a6a6", "#ffffff", "#7ac143", "#ffffff"];
  for (let i = 0; i < 8; i++) add(new THREE.ConeGeometry(0.95, 0.38, 1, 1, false, (i / 8) * Math.PI * 2, Math.PI / 4).translate(-0.6, 2.85, 0.3), colours[i]);
  for (const s of [-1, 1]) {
    const o = new THREE.Vector3(0, 0.7, s * 0.41).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
    atlas.add("coco:" + sign, 384, 128, drawPainted(sign, "", "#eafbe0", "#1f6fd1", "#0b3b7a"), 1.2, 0.4, x + o.x, o.y, z + o.z, rot + (s > 0 ? 0 : Math.PI));
  }
  blockRect(col, x, z, rot, -0.8, 0.8, -0.7, 0.7);
}

/** Towels on the sand (x, z, which way they lie, colour) and a beach bag beside some: flat, in the no-shadow mesh. */
export function towels(parts: Part[], spots: [number, number, number, string][]) {
  spots.forEach(([x, z, rot, c], i) => {
    parts.push([place(box(0.95, 0.025, 1.85, 0, 0.012, 0), x, z, rot), c]);
    for (let k = 0; k < 3; k++) parts.push([place(box(0.95, 0.027, 0.09, 0, 0.013, -0.6 + k * 0.6), x, z, rot), "#ffffff"]);
    if (i % 2 === 0) parts.push([place(box(0.42, 0.3, 0.2, 0.75, 0.15, -0.4), x, z, rot), ["#f6a800", "#e4007c", "#1f6fd1"][i % 3]]);
  });
}

/** The atrial cross before the church (a stone cross on a stepped base, as colonial churches have in their atriums). */
export function atrialCross(parts: Part[], col: Colliders, x: number, z: number) {
  for (let k = 0; k < 3; k++) parts.push([box(1.5 - k * 0.4, 0.25, 1.5 - k * 0.4, x, 0.125 + k * 0.25, z), k % 2 ? "#cfc6b0" : "#ddd5c0"]);
  parts.push([box(0.24, 2.2, 0.24, x, 0.75 + 1.1, z), "#e8e1cf"]);
  parts.push([box(1.0, 0.22, 0.22, x, 2.35, z), "#e8e1cf"]);
  col.addCircle(x, z, 0.8);
}

/** A mirador at the meadow's edge (theme.ts `mirador`): a wooden platform up two steps, its rail, a bench, and the sign
 *  pointing out to the cenote across the meadow (the atlas). Facing `rot` (the view to +z). */
export function mirador(parts: Part[], col: Colliders, atlas: SignAtlas, x: number, z: number, rot: number, sign: string) {
  const add = (g: THREE.BufferGeometry, c: THREE.ColorRepresentation) => parts.push([place(g, x, z, rot), c]);
  add(box(4.0, 0.5, 3.0, 0, 0.25, 0), "#a07a52");
  for (const k of [0, 1]) add(box(1.4, 0.18, 0.4, 0, 0.09 + k * 0.18, -1.7 + k * 0.2), "#8a6a4a");
  for (let i = 0; i <= 8; i++) add(box(0.06, 0.9, 0.06, -1.95 + i * (3.9 / 8), 0.95, 1.45), "#7a5a3a");
  add(box(4.0, 0.08, 0.08, 0, 1.4, 1.45), "#7a5a3a");
  for (const s of [-1, 1]) { add(box(0.08, 0.08, 3.0, s * 1.96, 1.4, 0), "#7a5a3a"); for (let i = 0; i < 4; i++) add(box(0.06, 0.9, 0.06, s * 1.96, 0.95, -1.4 + i * 0.95), "#7a5a3a"); }
  add(box(1.6, 0.08, 0.4, 0, 0.95, -0.6), "#8a6a4a");
  for (const s of [-1, 1]) add(box(0.08, 0.42, 0.36, s * 0.7, 0.71, -0.6), "#7a5a3a");
  add(cyl(0.05, 0.05, 2.3, 1.6, 1.15, -1.2, 6), "#7a5a3a");
  const o = new THREE.Vector3(1.6, 2.15, -1.12).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  atlas.add("mirador:" + sign, 512, 160, drawPainted(sign, "", "#fff3d0", "#2f6b34", "#1d4a22"), 1.6, 0.5, x + o.x, o.y, z + o.z, rot + Math.PI);
  blockRect(col, x, z, rot, -2.0, 2.0, -1.5, 1.5);
}

// ------------------------------------------------------------------------------------------------ graphics round 4

/** The town's street trees as the tropics grow them (theme.ts `tropicalTrees`), each made round (0, 0) on the ground
 *  as town.ts's round tree is (the same instancing, a colour each). The trunk: taller and forking into two limbs under
 *  the crown, so the crown reads as an umbrella held up, not a ball on a stick. */
export function tropicalTrunk(): THREE.BufferGeometry {
  // (open-ended: the ends are hidden in the ground and the crown; the triangles go to the crowns)
  const parts = [
    new THREE.CylinderGeometry(0.15, 0.27, 2.5, 5, 1, true).translate(0, 1.25, 0),
    new THREE.CylinderGeometry(0.07, 0.13, 1.5, 4, 1, true).rotateZ(0.75).translate(-0.5, 2.85, 0.05),
    new THREE.CylinderGeometry(0.07, 0.12, 1.4, 4, 1, true).rotateZ(-0.7).rotateY(0.5).translate(0.42, 2.85, -0.22),
  ];
  return mergeGeometries(parts.map((g) => g.toNonIndexed()), false)!;
}

/** An almendro's trunk: straight up through its layers (they hang off it), with a level limb out under each of the two
 *  lower layers, so between the layers it reads as the tree it is. */
export function almendroTrunk(): THREE.BufferGeometry {
  const parts = [
    new THREE.CylinderGeometry(0.09, 0.26, 4.6, 5, 1, true).translate(0, 2.3, 0),
    new THREE.CylinderGeometry(0.05, 0.1, 1.9, 4, 1, true).rotateZ(1.45).translate(0.85, 2.95, -0.1),
    new THREE.CylinderGeometry(0.05, 0.09, 1.6, 4, 1, true).rotateZ(-1.45).rotateY(0.9).translate(-0.45, 3.75, 0.5),
  ];
  return mergeGeometries(parts.map((g) => g.toNonIndexed()), false)!;
}

/** A flamboyán's (or a parota's) crown: wide, flat-topped and a little lumpy, lower at its rim, lifted high. Few
 *  triangles (a town has a hundred and more, all drawn wherever one is in view): a faceted dome, flat lumps on it and
 *  round its rim. */
export function flamboyanCrown(): THREE.BufferGeometry {
  const lump = (sx: number, sy: number, sz: number, x: number, y: number, z: number, rot = 0) => new THREE.OctahedronGeometry(1, 0).rotateY(rot).scale(sx, sy, sz).translate(x, y, z);
  const parts: THREE.BufferGeometry[] = [
    new THREE.SphereGeometry(1, 7, 3).scale(2.75, 0.62, 2.55).translate(0, 3.7, 0),
    lump(1.55, 0.5, 1.4, 0.55, 4.05, -0.35, 0.4),
    lump(1.3, 0.45, 1.2, -0.95, 3.98, 0.65, 1.1),
  ];
  for (let i = 0; i < 4; i++) {
    const a = i * 1.57 + 0.3, r = 2.35 + (i % 2) * 0.25;
    parts.push(lump(0.95, 0.42, 0.85, Math.cos(a) * r, 3.45 - (i % 3) * 0.08, Math.sin(a) * r, a));
  }
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false)!;
}

/** An almendro's (Indian almond's) crown, as the tree grows: its branches come out in whorls, level, so the crown is
 *  three broad flat layers of leaves with sky between them, the top one hardly narrower than the bottom (wider than
 *  tall, never a cone: graphics round 5, the round-4 tiers narrowing upward read as fir trees). Each layer is a flat
 *  dome of leaves and three or four flat lumps off its edge, turned against the one below, so its outline is ragged and
 *  lop-sided; the layers step out to one side and back as they rise. */
export function almendroCrown(): THREE.BufferGeometry {
  const lump = (sx: number, sy: number, sz: number, x: number, y: number, z: number, rot = 0) => new THREE.OctahedronGeometry(1, 0).rotateY(rot).scale(sx, sy, sz).translate(x, y, z);
  const parts: THREE.BufferGeometry[] = [];
  // [radius x, radius z, height, offset x, offset z, turn, lumps]
  ([[2.75, 2.35, 3.05, 0.15, -0.1, 0.2, 4], [2.35, 2.05, 3.85, -0.35, 0.25, 1.3, 4], [1.75, 1.55, 4.55, 0.25, 0.05, 2.2, 3]] as const).forEach(([rx, rz, y, ox, oz, rot, n], t) => {
    parts.push(new THREE.SphereGeometry(1, 8, 2, 0, Math.PI * 2, 0, Math.PI / 2).scale(rx, 0.34, rz).rotateY(rot).translate(ox, y, oz));
    parts.push(new THREE.CircleGeometry(1, 8).rotateX(Math.PI / 2).scale(rx, 1, rz).rotateY(rot).translate(ox, y, oz)); // (its underside)
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2 + t * 0.4, r = 0.82 + (i % 2) * 0.12;
      parts.push(lump(0.95 - t * 0.12, 0.2, 0.75 - t * 0.08, ox + Math.cos(a) * rx * r, y + 0.05 - (i % 2) * 0.06, oz + Math.sin(a) * rz * r, a));
    }
  });
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false)!;
}

/** A house's front as a Mexican house has it (theme.ts `casas`), where Maple Harbor has a porch roof on two thin posts:
 *  the ground floor's concrete portal (a slab on two square columns, its edge in the trim's colour) with the upstairs
 *  terrace on it behind an iron railing, potted plants up there; two plastic chairs under it; on the flat roof the
 *  rebar left standing at its corners for the next floor (varillas) and a clothesline with the wash. `P(u, v)` as for
 *  houseFront, `rot` the front's heading; `w`, `d`, `h` the house's width, depth and height. In `parts` what casts a
 *  shadow, in `flat` the thin things. */
export function casa(parts: Part[], flat: Part[], P: (u: number, v: number) => [number, number], rot: number, w: number, d: number, h: number, wall: string, trim: string, seed: number) {
  const at = (list: Part[], g: THREE.BufferGeometry, u: number, v: number, c: THREE.ColorRepresentation) => { const [x, z] = P(u, v); list.push([place(g, x, z, rot), c]); };
  const r = rand(seed);
  // the slab's width, depth out from the wall, underside (no wider or deeper than Maple Harbor's porch roof: P25's
  // camera at Cedar Lane looks past house5's corner to Maggie)
  const SW = 6.4, SD = 2.6, Y = 3.0;
  at(parts, box(SW, 0.3, SD, 0, Y + 0.15, 0), 0, SD / 2, wall);
  at(parts, box(SW + 0.08, 0.32, 0.1, 0, Y + 0.15, 0), 0, SD + 0.01, trim);
  for (const s of [-1, 1]) at(parts, box(0.1, 0.32, SD, 0, Y + 0.15, 0), s * (SW / 2 + 0.01), SD / 2, trim);
  // the columns where the porch's posts were (their colliders: town.ts), and a pilaster against the wall behind each
  for (const s of [-1, 1]) {
    at(parts, box(0.36, Y, 0.36, 0, Y / 2, 0), s * 2.8, 2.5, wall);
    at(parts, box(0.44, 0.12, 0.44, 0, Y - 0.06, 0), s * 2.8, 2.5, trim);
  }
  // the terrace's railing: a top rail and a bottom rail, posts, and the bars between (flat strips facing the street,
  // and along the sides); a parapet-height wall at the ends against the house
  const ry = Y + 0.3, rh = 0.95;
  for (const y of [ry + 0.08, ry + rh]) {
    at(flat, box(SW - 0.1, 0.05, 0.05, 0, y, 0), 0, SD - 0.08, IRON);
    for (const s of [-1, 1]) at(flat, box(0.05, 0.05, SD - 0.1, 0, y, 0), s * (SW / 2 - 0.05), SD / 2, IRON);
  }
  for (let u = -SW / 2 + 0.05; u <= SW / 2; u += SW / 4) at(flat, box(0.07, rh, 0.07, 0, ry + rh / 2, 0), u, SD - 0.08, IRON);
  for (let u = -SW / 2 + 0.2; u < SW / 2 - 0.1; u += 0.19) at(flat, new THREE.PlaneGeometry(0.03, rh - 0.1).translate(0, ry + rh / 2 + 0.02, 0.0), u, SD - 0.06, IRON);
  for (const s of [-1, 1]) for (let v = 0.25; v < SD - 0.1; v += 0.19) at(flat, new THREE.PlaneGeometry(0.03, rh - 0.1).rotateY(Math.PI / 2).translate(0, ry + rh / 2 + 0.02, 0), s * (SW / 2 - 0.05), v, IRON);
  // pots up on the terrace (a palm, a geranium)
  for (const [u, big] of [[-2.6, 1], [2.2, 0.8]] as const) {
    at(parts, cyl(0.24 * big, 0.18 * big, 0.36 * big, 0, ry + 0.18 * big, 0), u, SD - 0.55, "#c56f4c");
    at(parts, new THREE.IcosahedronGeometry(0.4 * big, 0).scale(1, 1.2, 1).translate(0, ry + 0.36 * big + 0.36 * big, 0), u, SD - 0.55, big > 0.9 ? "#3f7d3a" : "#4a8a3c");
    if (big < 0.9) at(flat, new THREE.OctahedronGeometry(0.09).translate(0.1, ry + 0.95, 0.15), u, SD - 0.55, "#e63946");
  }
  // two plastic chairs under the portal, either side of the door, facing the street (on the porch's floor, 0.35 up)
  for (const [u, c] of [[-1.95, "#f2f1ec"], [1.95, "#c8312f"]] as const) {
    const y0 = 0.35, turn = u < 0 ? 0.25 : -0.3;
    const chair: Part[] = [
      [box(0.46, 0.05, 0.44, 0, y0 + 0.44, 0), c], [box(0.46, 0.46, 0.05, 0, y0 + 0.7, -0.21).rotateX(-0.12), c],
      ...[[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]].map(([lx, lz]) => [box(0.05, 0.44, 0.05, lx, y0 + 0.22, lz), c] as Part),
    ];
    for (const [g, cc] of chair) at(parts, g.rotateY(turn), u, 1.15, cc);
  }
  // on the roof: rebar at its four corners (bundles of four rods, rusty), and the wash on a line across its front half
  const RUST = "#6b4630";
  for (const su of [-1, 1]) for (const sv of [0.3, d - 0.3]) for (const [a, b] of [[-0.06, -0.06], [0.06, -0.06], [-0.06, 0.06], [0.06, 0.06]]) {
    const tilt = (r() - 0.5) * 0.12;
    for (const turn of [0, Math.PI / 2]) at(flat, new THREE.PlaneGeometry(0.035, 0.85).rotateY(turn).rotateZ(tilt).translate(0, h + 1.3, 0), su * (w / 2 - 0.3) + a, -sv + b, RUST);
  }
  const lv = -2.2, lu0 = -w / 2 + 1.6, lu1 = w / 2 - 3.2, ly = h + 1.75;
  for (const u of [lu0, lu1]) at(flat, box(0.05, 1.55, 0.05, 0, h + 0.97, 0), u, lv, "#8a8f94");
  at(flat, box(lu1 - lu0, 0.015, 0.015, 0, ly, 0), (lu0 + lu1) / 2, lv, "#e8e2d6");
  const WASH = ["#f4f1ea", "#e4007c", "#1f6fd1", "#f6c000", "#ffffff", "#2a9d5c", "#ff8fab", "#f77f00"];
  for (let u = lu0 + 0.35; u < lu1 - 0.3; u += 0.55 + r() * 0.25) {
    const ww = 0.35 + r() * 0.25, hh = 0.35 + r() * 0.35;
    at(flat, new THREE.PlaneGeometry(ww, hh).translate(0, ly - hh / 2 - 0.02, 0), u, lv, WASH[Math.floor(r() * WASH.length)]);
    at(flat, new THREE.PlaneGeometry(ww, hh).rotateY(Math.PI).translate(0, ly - hh / 2 - 0.02, 0), u, lv - 0.01, "#d9d4c7");
  }
}

/** The church's atrium and a bolder facade (theme.ts `atrio`; the church as `church` builds it, at x, z facing `face`):
 *  a whitewashed atrium wall with merlons round a paved atrium before the door, its gate between two pillars with
 *  finials; on the facade white columns either side of the door on pedestals, an entablature over them, and a niche with
 *  a saint in white stone either side. `depth`: how far the atrium reaches out from the facade, `left` and `right` how far
 *  it reaches either side of the door (seen from the facade: the left side is -x in its own frame). */
export function atrio(parts: Part[], flat: Part[], col: Colliders, x: number, z: number, face: Face, depth: number, left: number, right: number, gate: number) {
  const rot = faceRot(face), add = (list: Part[], g: THREE.BufferGeometry, c: string) => list.push([place(g, x, z, rot), c]);
  const LIME = "#f6f1e4", CAP = "#e3d6b8", TRIM = "#f7f2e6";
  // the paving: limestone slabs in two tones, a band down the middle to the door
  add(flat, box(left + right, 0.04, depth, (right - left) / 2, 0.02, depth / 2), "#e2d6bd");
  add(flat, box(2.4, 0.045, depth, 0, 0.025, depth / 2), "#cdbd9c");
  const H = 0.95, T = 0.34;
  const wall = (x0: number, x1: number, z0: number, z1: number) => {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    add(parts, box(w, H, d, cx, H / 2, cz), LIME);
    add(parts, box(w + 0.06, 0.08, d + 0.06, cx, H + 0.04, cz), CAP);
    // merlons along its top
    const along = w > d, len = along ? w : d;
    for (let s = -len / 2 + 0.45; s <= len / 2 - 0.3; s += 1.05) {
      add(parts, new THREE.ConeGeometry(0.2, 0.42, 4).rotateY(Math.PI / 4).translate(along ? cx + s : cx, H + 0.29, along ? cz : cz + s), LIME);
    }
    blockRect(col, x, z, rot, x0, x1, z0, z1);
  };
  wall(-left, -gate, depth - T, depth); wall(gate, right, depth - T, depth);
  wall(-left, -left + T, 0.3, depth - T); wall(right - T, right, 0.3, depth - T);
  // the gate's pillars with their finials
  for (const s of [-1, 1]) {
    add(parts, box(0.6, 1.9, 0.6, s * (gate + 0.15), 0.95, depth - T / 2), LIME);
    add(parts, box(0.72, 0.12, 0.72, s * (gate + 0.15), 1.94, depth - T / 2), CAP);
    add(parts, new THREE.SphereGeometry(0.2, 8, 6).translate(s * (gate + 0.15), 2.2, depth - T / 2), LIME);
    add(parts, new THREE.ConeGeometry(0.08, 0.3, 6).translate(s * (gate + 0.15), 2.5, depth - T / 2), CAP);
  }
  // the facade: columns either side of the door on pedestals, their capitals, the entablature over them
  for (const s of [-1, 1]) {
    add(parts, box(0.56, 0.6, 0.46, s * 1.75, 0.75, 0.2), TRIM);
    add(parts, new THREE.CylinderGeometry(0.17, 0.2, 3.3, 10).translate(s * 1.75, 2.7, 0.2), TRIM);
    add(parts, box(0.56, 0.18, 0.46, s * 1.75, 4.42, 0.2), TRIM);
  }
  add(parts, box(4.4, 0.26, 0.42, 0, 4.64, 0.17), TRIM);
  add(parts, box(1.1, 0.24, 0.3, 0, 4.9, 0.12), TRIM);
  // a niche either side with a saint in white stone
  for (const s of [-1, 1]) {
    const nx = s * 3.05;
    add(flat, box(0.78, 1.35, 0.04, nx, 3.35, 0.02), "#6e5434");
    add(flat, new THREE.CylinderGeometry(0.39, 0.39, 0.04, 12, 1, false, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2).translate(nx, 4.02, 0.02), "#6e5434");
    add(parts, new THREE.TorusGeometry(0.47, 0.08, 4, 10, Math.PI).translate(nx, 4.02, 0.06), TRIM);
    for (const t of [-1, 1]) add(parts, box(0.12, 1.4, 0.14, nx + t * 0.47, 3.33, 0.06), TRIM);
    add(parts, box(0.95, 0.12, 0.3, nx, 2.62, 0.12), TRIM);
    add(parts, new THREE.CylinderGeometry(0.13, 0.2, 0.95, 8).translate(nx, 3.17, 0.1), "#fbf8f0");
    add(parts, new THREE.SphereGeometry(0.12, 8, 6).translate(nx, 3.76, 0.1), "#fbf8f0");
  }
}

/** The airport's terminal as a small Riviera Maya airport's (theme.ts `airportOut.terminal`; its walls' colours are
 *  theme.ts `buildings`): a thatched palapa roof over the front hall, and a Maya step-fret frieze (a greca) in
 *  terracotta along the top of the front wall. The building is `b` (facing -x: its front wall at x - w / 2), the hall
 *  under the thatch `hall` metres deep. */
export function airportTerminal(parts: Part[], flat: Part[], col: Colliders, b: { x: number; z: number; w: number; d: number; h: number }, hall: number, arcades: [number, number][]) {
  const fx = b.x - b.w / 2;
  palapaRoof(parts, fx + hall / 2, b.z, hall, b.d, b.h);
  // a portal of arches against the front wall either side of the drop-off (z0…z1 each), cream with a terracotta cap
  const BAY = 3.65, AH = 5.6, AW = 2.65, SPRING = 3.25, DEPTH = 0.5;
  for (const [z0, z1] of arcades) {
    const n = Math.max(1, Math.round((z1 - z0) / BAY)), bay = (z1 - z0) / n;
    for (let i = 0; i < n; i++) {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0); sh.lineTo(bay, 0); sh.lineTo(bay, AH); sh.lineTo(0, AH); sh.lineTo(0, 0);
      const hole = new THREE.Path(), c = bay / 2, r = AW / 2;
      hole.moveTo(c - r, 0); hole.lineTo(c - r, SPRING); hole.absarc(c, SPRING, r, Math.PI, 0, true); hole.lineTo(c + r, 0); hole.lineTo(c - r, 0);
      sh.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(sh, { depth: DEPTH, bevelEnabled: false, curveSegments: 5 });
      // (the shape's x along the front, toward +z; extruded out from the wall, toward -x)
      parts.push([g.rotateY(-Math.PI / 2).translate(fx - 0.02, 0, z0 + i * bay), "#fbf1dc"]);
    }
    parts.push([box(DEPTH + 0.16, 0.22, z1 - z0 + 0.1, fx - DEPTH / 2 - 0.02, AH + 0.11, (z0 + z1) / 2), "#b5523b"]);
    col.addBox(fx - DEPTH / 2, (z0 + z1) / 2, DEPTH + 0.1, z1 - z0);
  }
  // the greca: a band top and bottom, and between them steps going up and down in turn (flat strips on the wall)
  const y0 = 10.15, y1 = 11.75, step = 0.32, len = b.d - 1.2, RED = "#b5523b";
  const strip = (z: number, y: number, w: number, h: number) => flat.push([new THREE.PlaneGeometry(w, h).rotateY(-Math.PI / 2).translate(fx - 0.06, y, z), RED]);
  strip(b.z, y0, len, 0.14); strip(b.z, y1, len, 0.14);
  const motif = 6 * step;
  for (let s = -len / 2 + 0.1; s + motif <= len / 2; s += motif) {
    for (let k = 0; k < 3; k++) {
      // three steps up from the bottom band, then three down from the top band
      strip(b.z + s + (k + 0.5) * step, y0 + 0.07 + ((k + 1) * 0.36) / 2, step * 0.9, (k + 1) * 0.36);
      strip(b.z + s + (3 + k + 0.5) * step, y1 - 0.07 - ((3 - k) * 0.36) / 2, step * 0.9, (3 - k) * 0.36);
    }
  }
}

/** The bus terminal's front as a central de autobuses' (theme.ts `busTerminal.front`; `b` the building, facing -z):
 *  white pilasters up its front between the windows, a terracotta band along its foot; and travellers' suitcases by
 *  the benches (x, z each: a rolling case standing up, its handle out). */
export function terminalFront(parts: Part[], flat: Part[], col: Colliders, b: { x: number; z: number; w: number; d: number; h: number }, pilasters: number[], cases: [number, number][]) {
  const front = b.z - b.d / 2;
  for (const u of pilasters) {
    parts.push([box(0.5, b.h - 0.9, 0.16, b.x + u, 0.5 + (b.h - 0.9) / 2, front - 0.08), "#fbf6ea"]);
    parts.push([box(0.66, 0.2, 0.24, b.x + u, b.h - 0.35, front - 0.1), "#fbf6ea"]);
  }
  flat.push([box(b.w + 0.04, 0.75, 0.04, b.x, 0.5 + 0.375, front - 0.02), "#c4683a"]);
  const COLORS = ["#1f6fd1", "#e4007c", "#2b2d42", "#f6a800"];
  cases.forEach(([x, z], i) => {
    const c = COLORS[i % COLORS.length];
    parts.push([box(0.42, 0.6, 0.26, x, 0.36, z), c]);
    parts.push([box(0.44, 0.04, 0.28, x, 0.5, z), darker(c)]);
    for (const s of [-1, 1]) parts.push([box(0.03, 0.42, 0.03, x + s * 0.12, 0.87, z + 0.1), "#55595e"]);
    parts.push([box(0.27, 0.04, 0.04, x, 1.08, z + 0.1), "#2b2b2e"]);
    for (const s of [-1, 1]) parts.push([cyl(0.04, 0.04, 0.05, x + s * 0.16, 0.05, z - 0.08, 6).rotateZ(Math.PI / 2).translate(0, 0, 0), "#1d1f22"]);
    col.addCircle(x, z, 0.3);
  });
}

/** The meadow round the cenote as the Yucatán's scrub (theme.ts `meadow`): low shrubs in clumps and tufts of tall
 *  grass scattered over x0…x1, z0…z1 (none within the `clear` circles: x, z, radius), and ceibas standing over the selva
 *  behind it (x, z each: a tall grey trunk with buttress roots, a wide flat crown high up). */
export function meadow(parts: Part[], x0: number, x1: number, z0: number, z1: number, clear: [number, number, number][], ceibas: [number, number][]) {
  const r = rand(5150), GREENS = ["#4f8a3a", "#5c9a3f", "#3f7d3a", "#6aa346", "#7a9a48"], DRY = ["#9cb04e", "#8fa848", "#b3bd62"];
  const free = (x: number, z: number) => clear.every(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) > cr);
  for (let i = 0; i < 48; i++) {
    const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0), s = 0.5 + r() * 0.65;
    if (!free(x, z)) continue;
    const g = GREENS[Math.floor(r() * GREENS.length)];
    parts.push([new THREE.IcosahedronGeometry(s, 0).scale(1.3, 0.75, 1.1).translate(x, s * 0.55, z), g]);
    if (r() < 0.5) parts.push([new THREE.IcosahedronGeometry(s * 0.7, 0).scale(1.2, 0.8, 1).translate(x + s * 0.9, s * 0.4, z + (r() - 0.5) * s), GREENS[Math.floor(r() * GREENS.length)]]);
  }
  for (let i = 0; i < 30; i++) {
    const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0);
    if (!free(x, z)) continue;
    const c = DRY[Math.floor(r() * DRY.length)];
    for (let k = 0; k < 2; k++) parts.push([new THREE.ConeGeometry(0.16, 0.6 + r() * 0.35, 4).rotateZ((k - 1) * 0.35).translate(x + (k - 1) * 0.12, 0.35, z), c]);
  }
  for (const [x, z] of ceibas) {
    parts.push([new THREE.CylinderGeometry(0.42, 0.62, 10, 8, 1, true).translate(x, 5, z), "#9a958a"]);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      parts.push([new THREE.ConeGeometry(0.5, 2.2, 4).scale(0.35, 1, 1).rotateY(-a).translate(x + Math.cos(a) * 0.6, 1.0, z + Math.sin(a) * 0.6), "#8c877b"]);
    }
    for (const s of [-1, 1]) parts.push([new THREE.CylinderGeometry(0.12, 0.22, 3.2, 6, 1, true).rotateZ(s * 0.8).translate(x + s * 1.1, 10.6, z), "#9a958a"]);
    parts.push([flamboyanCrown().scale(2.1, 1.5, 2.1).translate(x, 6.2, z), "#3f7d3a"]);
  }
}
