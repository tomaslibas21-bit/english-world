import * as THREE from "three";
import { SURF_CHALKBOARD, SURF_SCHOOL_SIGN } from "../../content/surf-signs";
import { vertexColorMaterial, STYLED } from "../style";
import { surfboardParts, type Part } from "../surf/shapes";
import { sandY } from "../water";
import { HARBOR_SURF, SURF_SPOT } from "./surf";
import { boxGeo, colourMerge, cylGeo, textTexture } from "./util";
import type { MapleCtx } from "./maple";

const CEDAR = "#a67552", CREAM = "#f6ecd9", GABLE = "#315b62", TEAL = "#287c79";
const ORANGE = "#e8833a", DARK = "#2b3338";

/** The permanent school and walk-on rental display. The lesson brings its own boards to the waterline. */
export function addHarborSurf({ col, group, M }: MapleCtx, add: (g: THREE.BufferGeometry, color: string) => void) {
  const parts: Part[] = [];
  const put = STYLED ? (g: THREE.BufferGeometry, color: string) => parts.push([g, color]) : add;
  const { shack: { x, z, w, d, eave, ridge }, counter } = HARBOR_SURF;
  const y = sandY(x, z), front = z - d / 2, back = z + d / 2;
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, c: string) => put(boxGeo(w, h, d, x, y, z), c);
  const wall = (w: number, h: number, d: number, x: number, y: number, z: number, c: string) => {
    box(w, h, d, x, y, z, c);
    col.addBox(x, z, w, d);
  };

  const post = 0.16;
  for (const side of [-1, 1]) {
    const px = x + side * (w - post) / 2;
    for (const pz of [front + post / 2, back - post / 2]) {
      const foot = sandY(px, pz), top = y + eave;
      wall(post, top - foot, post, px, (foot + top) / 2, pz, CEDAR);
    }
    wall(0.09, 1.66, d / 2, px, y + 1.02, back - d / 4, CEDAR);
    box(0.13, 0.12, d, px, y + eave - 0.06, z, CREAM);
  }
  wall(w - post, 2.05, 0.11, x, y + 1.15, back - 0.08, CEDAR);
  for (const pz of [front + 0.04, back - 0.04]) box(w, 0.12, 0.08, x, y + eave - 0.06, pz, CREAM);
  const roof = new THREE.Shape();
  roof.moveTo(-w / 2, eave); roof.lineTo(0, ridge); roof.lineTo(w / 2, eave); roof.closePath();
  put(new THREE.ExtrudeGeometry(roof, { depth: d, bevelEnabled: false }).translate(x, y, front), GABLE);

  wall(counter.w, counter.top - 0.06, counter.d, x, y + (counter.top - 0.06) / 2, counter.z, TEAL);
  box(counter.w, 0.06, counter.d, x, y + counter.top - 0.03, counter.z, CREAM);
  // The west post carries the plate beside Maren's name tag in the customer view.
  const signW = 1.42, signH = 0.4, signD = 0.10;
  const signX = x - (w - signW) / 2, signY = y + eave - 0.16;
  box(signW, signH, signD, signX, signY, front - signD / 2, GABLE);
  const chalkX = x + 1.32, chalkZ = back - 0.17, chalkY = y + 1.53;
  box(1.48, 1.08, 0.045, chalkX, chalkY, chalkZ, GABLE);
  const sign = textTexture(SURF_SCHOOL_SIGN.en, { bg: CREAM, fg: GABLE, w: 512, h: 80 });
  const atlas = document.createElement("canvas");
  atlas.width = atlas.height = 512;
  const ink = atlas.getContext("2d")!;
  ink.fillStyle = DARK;
  ink.fillRect(0, 0, 512, 512);
  ink.drawImage(sign.image, 0, 0);
  sign.dispose();
  ink.font = "600 26px sans-serif";
  ink.textBaseline = "middle";
  ink.fillStyle = CREAM;
  Object.values(SURF_CHALKBOARD).forEach(({ en }, i) => ink.fillText(en, 26, 113 + i * 49, 460));
  const map = new THREE.CanvasTexture(atlas);
  map.colorSpace = THREE.SRGBColorSpace;
  const lettering = new THREE.MeshLambertMaterial({ map });
  const signFace = (w: number, h: number, x: number, y: number, z: number, v0: number, v1: number) => {
    const g = new THREE.PlaneGeometry(w, h).rotateY(Math.PI).translate(x, y, z);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, THREE.MathUtils.lerp(v0 / 512, v1 / 512, uv.getY(i)));
    M.add("harbor-surf-sign", lettering, g, false);
  };
  signFace(signW - 0.05, signH - 0.005, signX, signY, front - signD - 0.002, 432, 512);
  signFace(1.4, 1.0, chalkX, chalkY, chalkZ - 0.025, 0, 428);

  const board = (len: number, width: number, deck: string, stripe: string, thick: number, place: (g: THREE.BufferGeometry) => THREE.BufferGeometry) => {
    for (const [g, color] of surfboardParts(len, width, deck, stripe, thick)) put(place(g), String(color));
  };
  const [rackX, rackZ] = SURF_SPOT.boards[0];
  const rackY = sandY(rackX, rackZ);
  for (const h of [0.2, 1.17]) box(2.4, 0.08, 0.09, rackX, rackY + h, rackZ, CEDAR);
  for (const dx of [-1.12, 1.12]) box(0.12, 1.28, 0.13, rackX + dx, rackY + 0.64, rackZ, CEDAR);
  for (const [dx, len, deck, stripe] of [[-0.47, 2.74, CREAM, ORANGE], [0.46, 1.98, TEAL, CREAM]] as const) {
    board(len, 0.57, deck, stripe, 0.08, (g) => g.translate(0, 0, len / 2).rotateX(-Math.PI / 2 + 0.2)
      .rotateY(Math.PI + 0.28).translate(rackX + dx, rackY + 0.04, rackZ + 0.22));
  }

  const paddle = (x: number, y: number, z: number, rot: number) => {
    const place = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(x, y, z);
    put(place(cylGeo(0.021, 0.021, 1.56, 0, 0, 0, 5).rotateX(Math.PI / 2)), DARK);
    for (const end of [-1, 1]) put(place(new THREE.SphereGeometry(1, 6, 4)
      .scale(0.095, 0.023, 0.18).translate(0, 0, end * 0.85)), GABLE);
  };
  const [supX, supZ] = SURF_SPOT.boards[1];
  const supY = sandY(supX, supZ);
  board(2.75, 0.78, TEAL, CREAM, 0.1, (g) => g.rotateY(0.23).translate(supX - 0.46, supY + 0.035, supZ));
  board(2.55, 0.76, CREAM, TEAL, 0.1, (g) => g.rotateX(-0.13).rotateY(-0.17).translate(supX + 0.48, supY + 0.19, supZ));
  paddle(supX - 0.61, supY + 0.17, supZ, 0.41);

  const [kayakX, kayakZ] = SURF_SPOT.boards[2];
  const kayakY = sandY(kayakX, kayakZ), yaw = 1.18;
  const hull = (g: THREE.BufferGeometry, color: string) =>
    put(g.rotateY(yaw).translate(kayakX, kayakY + 0.27, kayakZ), color);
  const dish = () => new THREE.SphereGeometry(1, 12, 3, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const deck = new THREE.Shape(), cockpit = new THREE.Path();
  deck.absellipse(0, 0, 0.34, 1.4, 0, Math.PI * 2, false);
  cockpit.absellipse(0, 0, 0.22, 0.45, 0, Math.PI * 2, true);
  deck.holes.push(cockpit);
  hull(dish().scale(0.34, 0.275, 1.4), "#f2c14e");
  hull(new THREE.ShapeGeometry(deck, 6).rotateX(-Math.PI / 2), "#f2c14e");
  const seat = dish().scale(0.22, 0.1, 0.45).toNonIndexed();
  // Turn the normals inward so the cockpit is visible from above through the deck.
  const p = seat.attributes.position;
  for (let i = 0; i < p.count; i += 3) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    p.setXYZ(i, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
    p.setXYZ(i + 2, x, y, z);
  }
  seat.computeVertexNormals();
  hull(seat, DARK);
  paddle(kayakX + 0.34, kayakY + 0.30, kayakZ + 0.26, -0.2);

  if (parts.length) {
    const mesh = new THREE.Mesh(colourMerge(parts), vertexColorMaterial());
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = "harbor-surf";
    group.add(mesh);
  }
}
