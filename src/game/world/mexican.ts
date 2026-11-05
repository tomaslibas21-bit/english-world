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
    add("glass", new THREE.SphereGeometry(0.2, 8, 6).scale(1, 1.25, 1).translate(x + s * 0.7, 3.62, z));
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
export function palapas(parts: Part[], col: Colliders, spots: [number, number][]) {
  const r = rand(91);
  const towels = ["#e4007c", "#00a6a6", "#f6a800", "#ff5a36", "#1f6fd1"];
  spots.forEach(([x, z], i) => {
    parts.push([new THREE.CylinderGeometry(0.09, 0.11, 2.7, 6, 1, true).translate(x, 1.35, z), WOOD]);
    parts.push([new THREE.ConeGeometry(2.1, 1.05, 10).translate(x, 3.05, z), THATCH]);
    parts.push([new THREE.CylinderGeometry(2.1, 2.2, 0.3, 10, 1, true).translate(x, 2.4, z), THATCH_DARK]);
    parts.push([new THREE.ConeGeometry(0.4, 0.4, 8).translate(x, 3.72, z), THATCH_DARK]);
    col.addCircle(x, z, 0.16);
    for (const s of [-1, 1]) {
      const lx = x + s * 0.95, lz = z - 0.9; // in front of the pole, towards the sea (-z)
      parts.push([box(0.62, 0.08, 1.4, lx, 0.32, lz - 0.2), "#b07a46"]);
      parts.push([box(0.62, 0.07, 0.75, 0, 0, 0).rotateX(-0.6).translate(lx, 0.55, lz + 0.72), "#b07a46"]);
      for (const dz of [-0.8, 0.45]) parts.push([box(0.56, 0.3, 0.05, lx, 0.15, lz + dz), "#7a5236"]);
      if ((i + (s > 0 ? 1 : 0)) % 2 === 0) parts.push([box(0.5, 0.02, 1.3, lx, 0.37, lz - 0.15), towels[Math.floor(r() * towels.length)]]);
      col.addBox(lx, lz, 0.7, 2.0);
    }
  });
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

/** Bougainvillea climbing a front wall beside the door and spilling along its top: a thick cascade of leaves and
 *  magenta and pink bracts down one side, and a crown along the top that hangs over the wall. `P(u, v)` as for
 *  houseFront; `u0` where it grows, `span` how far the crown reaches each way, `top` the wall's height. */
export function bougainvillea(parts: Part[], P: (u: number, v: number) => [number, number], u0: number, span: number, top: number, seed: number) {
  const r = rand(seed);
  const pinks = ["#d6247a", "#e0479e", "#b5179e", "#f15bb5", "#c9184a"];
  // (octahedra turned every which way: eight triangles a clump)
  const blob = (u: number, y: number, s: number) => {
    const [x, z] = P(u, 0.12 + s * 0.7 + r() * 0.12);
    const g = new THREE.OctahedronGeometry(s, 0).rotateX(r() * 3).rotateY(r() * 3).scale(1, 0.85, 0.75).translate(x, y, z);
    parts.push([g, r() < 0.32 ? (r() < 0.5 ? "#3f7d3a" : "#2f6b34") : pinks[Math.floor(r() * pinks.length)]]);
  };
  // the cascade: from the ground up, widening towards the top
  for (let y = 0.35; y < top - 0.6; y += 0.32) {
    const w = 0.35 + (y / top) * 0.6;
    for (let k = 0; k < 2; k++) blob(u0 + (r() - 0.5) * w * 2, y + r() * 0.2, 0.22 + r() * 0.12);
  }
  // the crown along the top of the wall, thickest over the stem, hanging down as it goes
  const n = Math.round(span * 13);
  for (let i = 0; i < n; i++) {
    const t = (r() - 0.5) * 2, u = u0 + t * span;
    blob(u, top - 0.15 - r() * (0.5 + (1 - Math.abs(t)) * 0.9), 0.22 + r() * 0.16);
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
    // a half cylinder lying across the road, its hump up, flattened
    const g = new THREE.CylinderGeometry(0.4, 0.4, piece, 6, 1, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2).rotateZ(Math.PI / 2).rotateX(Math.PI / 2);
    g.scale(1, 0.25, 1);
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
export function buzon(parts: Part[], atlas: SignAtlas, x: number, z: number, rot: number) {
  const add = (g: THREE.BufferGeometry, c: THREE.ColorRepresentation) => parts.push([place(g, x, z, rot), c]);
  const PINK = "#e4007c", LIME = "#9bc53d", GREY = "#5f6368";
  add(box(0.42, 0.04, 0.36, 0, 0.02, 0), GREY);
  add(box(0.2, 0.74, 0.2, 0, 0.4, 0), GREY);
  add(box(0.58, 0.74, 0.46, 0, 1.13, 0), PINK);
  add(box(0.62, 0.07, 0.5, 0, 0.79, 0), LIME);
  add(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 14, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).scale(1, 0.55, 0.96).translate(0, 1.5, 0), LIME);
  add(box(0.36, 0.04, 0.03, 0, 1.38, 0.235), "#2a2a2a"); // the slot
  add(box(0.42, 0.012, 0.05, 0, 1.415, 0.238), "#c2006a");
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
