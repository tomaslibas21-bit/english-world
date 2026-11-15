// Dev only (not part of the build): does anything stand in front of a place's name? Every sign in the town (a plane
// with lettering drawn on a canvas: a building's board, a standing sign, a canopy's name, an awning's) is looked at
// from where a player sees it: from the street in front at eye height (1.6 m, a few metres off, straight on and from
// either side) and from where the follow camera stands when the player walks up to it (camera.ts FOLLOW: about 10 m
// behind the player and 6.5 m up). A grid of points over the lettering (the board's middle, inside its margins) is
// ray-cast from each viewpoint; a point is hidden when the ray meets anything else of the town first (a bush, a
// bougainvillea, a palm's leaves, an awning, a lamp, papel picado, a parked car, another sign). A viewpoint that is
// not open street (inside something, on the water, outside the town) is left out. Also flagged, the other way round:
// a sign whose front faces a wall (it would be read from inside), one whose lettering is inside a wall, and one with
// nothing behind it or under it (floating).
// Run it from the browser console or a probe:
// `(await import("/src/dev/signAudit.ts")).signAudit(window.__ew.game.town)`; tests/browser/signs.mjs runs it in both
// towns and takes a picture of each sign it flags (docs/SIGNS.md).
import * as THREE from "three";
import type { Town } from "../game/world/town";

export interface SignView { kind: "eye" | "cam"; d: number; angle: number; hidden: number; pos: [number, number, number] }
export interface SignReport {
  /** The mesh's name, else the board's words (util.ts textTexture names its texture after them). */
  name: string;
  center: [number, number, number];
  /** Which way it faces (unit, level). */
  normal: [number, number];
  width: number;
  height: number;
  /** Viewpoints that were open street, each with the share of the lettering hidden from it (0–1). */
  views: SignView[];
  /** The median share hidden over the viewpoints straight on and up to 25° aside (the one that matters). */
  front: number;
  /** The worst viewpoint of all. */
  worst: number;
  /** What hides it most (the hit object's name, or its material's colour). */
  by: string[];
  /** Reverse checks: "faces-wall", "in-wall", "floats", "no-view" (no open street in front of it at all). */
  flags: string[];
}

const GRID_U = 11, GRID_V = 4;
/** The lettering's part of the board: the middle, inside its margins (util.ts textTexture keeps 5% each side). */
const INNER_U = 0.86, INNER_V = 0.62;
const EYE = { y: 1.6, d: [4, 7, 10], angles: [-35, -18, 0, 18, 35] };
const CAM = { y: 6.5, d: [12, 16], angles: [-25, 0, 25] };

/** Is this mesh a sign: a flat board whose picture is lettering drawn on a canvas? */
export function isSign(o: THREE.Object3D): o is THREE.Mesh {
  const m = o as THREE.Mesh;
  if (!m.isMesh || (m as unknown as THREE.InstancedMesh).isInstancedMesh) return false;
  if (o.userData.sign === false) return false;
  if (o.userData.sign) return true;
  const g = m.geometry as THREE.PlaneGeometry;
  if (g?.type !== "PlaneGeometry") return false;
  const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshBasicMaterial;
  const img = mat?.map?.image as HTMLCanvasElement | undefined;
  return !!img && typeof (img as HTMLCanvasElement).getContext === "function";
}

function visibleChain(o: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

function label(o: THREE.Object3D): string {
  if (o.name) return o.name;
  const m = o as THREE.Mesh;
  const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial | undefined;
  const c = mat?.color ? "#" + mat.color.getHexString() : "?";
  return `${o.type}${(o as THREE.InstancedMesh).isInstancedMesh ? "[inst]" : ""}${c}`;
}

/** Everything solid the rays may meet: the town's visible meshes, less the signs' own see-through bits. */
function blockers(root: THREE.Object3D, skip: (o: THREE.Object3D) => boolean) {
  const out: THREE.Object3D[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !visibleChain(o) || skip(o)) return;
    const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.Material;
    // glass and what one sees through (a bus shelter's panes, a shop window): the words read through it
    if (mat && mat.transparent && mat.opacity < 0.8) return;
    if (/glass|window-pane/i.test(o.name)) return;
    out.push(o);
  });
  return out;
}

export function signAudit(town: Town, opts: { root?: THREE.Object3D; skip?: (o: THREE.Object3D) => boolean; only?: (name: string) => boolean } = {}): SignReport[] {
  const root = opts.root ?? town.group;
  root.updateMatrixWorld(true);
  const skip = opts.skip ?? ((o: THREE.Object3D) => /cloud|gull|bird|pigeon|boat-moving|traffic/i.test(o.name));
  // the boards: a mesh each (a building's sign), and the quads of a merged sign atlas (userData.signQuads: the
  // edition's town draws its painted signs, street names and stands into one mesh, mexican.ts SignAtlas)
  interface Board { name: string; self: THREE.Object3D | null; C: THREE.Vector3; ax: THREE.Vector3; ay: THREE.Vector3; nz: THREE.Vector3; W: number; H: number; double: boolean }
  const boards: Board[] = [];
  root.traverse((o) => {
    if (!visibleChain(o)) return;
    const quads = o.userData.signQuads as { key: string; w: number; h: number; m: number[] }[] | undefined;
    if (quads) {
      for (const qd of quads) {
        const m = new THREE.Matrix4().fromArray(qd.m).premultiply(o.matrixWorld);
        const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(m));
        boards.push({ name: qd.key, self: null, C: new THREE.Vector3().setFromMatrixPosition(m), ax: new THREE.Vector3(1, 0, 0).applyQuaternion(q), ay: new THREE.Vector3(0, 1, 0).applyQuaternion(q), nz: new THREE.Vector3(0, 0, 1).applyQuaternion(q), W: qd.w, H: qd.h, double: false });
      }
      return;
    }
    if (!isSign(o)) return;
    const s = o as THREE.Mesh, g = s.geometry as THREE.PlaneGeometry;
    const sc = new THREE.Vector3().setFromMatrixScale(s.matrixWorld);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(s.matrixWorld));
    const mat = (Array.isArray(s.material) ? s.material[0] : s.material) as THREE.MeshBasicMaterial;
    boards.push({
      name: s.name || (mat.map?.name ?? "") || (s.userData.text as string) || "", self: s,
      C: new THREE.Vector3().setFromMatrixPosition(s.matrixWorld), ax: new THREE.Vector3(1, 0, 0).applyQuaternion(q), ay: new THREE.Vector3(0, 1, 0).applyQuaternion(q), nz: new THREE.Vector3(0, 0, 1).applyQuaternion(q),
      W: g.parameters.width * sc.x, H: g.parameters.height * sc.y, double: mat.side === THREE.DoubleSide,
    });
  });
  const solid = blockers(root, skip);
  const ray = new THREE.Raycaster();
  const reports: SignReport[] = [];
  const col = town.colliders;
  const inside = (x: number, z: number, r: number) =>
    col.boxes.some((b) => x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r) ||
    col.circles.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + r);

  for (const bd of boards) {
    if (opts.only && !opts.only(bd.name)) continue;
    const { C, ax, ay, nz, W, H } = bd, s = bd.self;
    // a sign that lies flat (a painted floor marking) is not read from the street
    if (Math.abs(nz.y) > 0.8) continue;
    const sides = bd.double ? [1, -1] : [1];
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < GRID_U; i++) for (let k = 0; k < GRID_V; k++) {
      const u = ((i + 0.5) / GRID_U - 0.5) * W * INNER_U, v = ((k + 0.5) / GRID_V - 0.5) * H * INNER_V;
      pts.push(C.clone().addScaledVector(ax, u).addScaledVector(ay, v));
    }
    let best: SignReport | null = null;
    for (const side of sides) {
      const n = new THREE.Vector3(nz.x * side, 0, nz.z * side).normalize();
      const views: SignView[] = [];
      const byCount = new Map<string, number>();
      const look = (kind: "eye" | "cam", d: number, angle: number, y: number) => {
        const a = THREE.MathUtils.degToRad(angle);
        const dir = n.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
        const P = new THREE.Vector3(C.x + dir.x * d, y, C.z + dir.z * d);
        // the player stands on open ground: at the viewpoint (eye), or 10.2 m nearer the sign than the camera (cam)
        const stand = kind === "eye" ? P : new THREE.Vector3(C.x + dir.x * (d - 10.2), 0, C.z + dir.z * (d - 10.2));
        if (kind === "cam" && d - 10.2 < 1.5) return;
        if (!town.walkableAt(stand.x, stand.z) || inside(stand.x, stand.z, 0.3)) return;
        // the camera itself must not be inside something (it keeps clear of walls and roofs)
        if (kind === "cam" && inside(P.x, P.z, 0) && P.y < 8) return;
        let hid = 0;
        for (const p of pts) {
          const to = p.clone().sub(P), dist = to.length();
          ray.set(P, to.divideScalar(dist));
          ray.far = dist - 0.04;
          const hit = ray.intersectObjects(solid, false).find((x) => x.object !== s);
          if (hit) { hid++; const k = label(hit.object); byCount.set(k, (byCount.get(k) ?? 0) + 1); }
        }
        views.push({ kind, d, angle, hidden: hid / pts.length, pos: [+P.x.toFixed(2), +P.y.toFixed(2), +P.z.toFixed(2)] });
      };
      for (const d of EYE.d) for (const a of EYE.angles) look("eye", d, a, EYE.y);
      for (const d of CAM.d) for (const a of CAM.angles) look("cam", d, a, CAM.y);
      const near = views.filter((v) => Math.abs(v.angle) <= 25).map((v) => v.hidden).sort((a, b) => a - b);
      const front = near.length ? near[Math.floor((near.length - 1) / 2)] : 1;
      const r: SignReport = {
        name: bd.name,
        center: [+C.x.toFixed(2), +C.y.toFixed(2), +C.z.toFixed(2)],
        normal: [+n.x.toFixed(2), +n.z.toFixed(2)],
        width: +W.toFixed(2), height: +H.toFixed(2),
        views, front, worst: views.reduce((m, v) => Math.max(m, v.hidden), 0),
        by: [...byCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, c]) => `${k}×${c}`),
        flags: views.length ? [] : ["no-view"],
      };
      if (!best || (best.flags.length && !r.flags.length) || (r.views.length > best.views.length && r.front <= best.front)) best = r;
    }
    const r = best!;
    // the other way round: does it face a wall, sit in one, or hang in the air?
    const n3 = new THREE.Vector3(r.normal[0], 0, r.normal[1]);
    ray.far = 0.6;
    ray.set(C.clone().addScaledVector(n3, 0.02), n3);
    if (ray.intersectObjects(solid, false).some((x) => x.object !== s && x.distance < 0.3) && inside(C.x + n3.x * 0.5, C.z + n3.z * 0.5, 0)) r.flags.push("faces-wall");
    let inWall = 0;
    for (const p of pts) {
      ray.set(p.clone().addScaledVector(n3, 0.3), n3.clone().negate());
      ray.far = 0.3 - 0.01;
      if (ray.intersectObjects(solid, false).some((x) => x.object !== s)) inWall++;
    }
    // (counted already as hidden from the front; flagged when most of the lettering is under a surface right on it)
    if (inWall / pts.length > 0.5 && r.front > 0.5) r.flags.push("in-wall");
    // held: something right behind it (a wall, a board, a pole), or under its bottom edge (a pole, a post, a stand),
    // tried at a few places across it and a little behind its face (a pole stands behind the board, not in its plane)
    const hits = (from: THREE.Vector3, dir: THREE.Vector3, far: number) => { ray.set(from, dir); ray.far = far; return ray.intersectObjects(solid, false).some((x) => x.object !== s); };
    const down = new THREE.Vector3(0, -1, 0), back = n3.clone().negate();
    let behind = false, below = false;
    for (const u of [-0.4, -0.2, 0, 0.2, 0.4]) {
      for (const v of [-0.3, 0, 0.3]) if (!behind && hits(C.clone().addScaledVector(ax, u * W).addScaledVector(ay, v * H).addScaledVector(n3, -0.01), back, 0.8)) behind = true;
      for (const o of [0, -0.05, -0.1, -0.2]) if (!below && hits(C.clone().addScaledVector(ax, u * W).addScaledVector(ay, -H / 2 - 0.01).addScaledVector(n3, o), down, 1.2)) below = true;
    }
    if (!behind && !below && C.y - H / 2 > 0.4) r.flags.push("floats");
    reports.push(r);
  }
  return reports;
}

/** The camera that sees a sign as a player does from the street (straight on, the follow camera's place). */
export function signCamera(r: SignReport, aspect: number, kind: "eye" | "cam" = "cam") {
  const cam = new THREE.PerspectiveCamera(50, aspect, 0.1, 900);
  const v = r.views.filter((x) => x.kind === kind).sort((a, b) => Math.abs(a.angle) - Math.abs(b.angle) || a.d - b.d)[0] ?? r.views[0];
  const [cx, cy, cz] = r.center;
  if (v) cam.position.set(...v.pos);
  else cam.position.set(cx + r.normal[0] * 12, 6.5, cz + r.normal[1] * 12);
  cam.lookAt(cx, cy, cz);
  cam.updateMatrixWorld();
  return cam;
}

/** A picture of a sign from where the follow camera stands (signCamera), w × h, as a JPEG data URL. */
export function signShot(rd: THREE.WebGLRenderer, scene: THREE.Scene, r: SignReport, w: number, h: number, kind: "eye" | "cam" = "cam") {
  const size = rd.getSize(new THREE.Vector2()), dpr = rd.getPixelRatio();
  rd.setPixelRatio(1); rd.setSize(w, h, false);
  rd.render(scene, signCamera(r, w / h, kind));
  const data = rd.domElement.toDataURL("image/jpeg", 0.85);
  rd.setPixelRatio(dpr); rd.setSize(size.x, size.y, false);
  return data;
}
