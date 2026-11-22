// The instanced props (trees, palms: InstancedMesh) that stand between the follow camera and the player, or right in
// front of the camera, fade to a fine see-through dither and come back once they are out of the way. Large props
// marked fadeNearCamera also fade when the lens comes close enough for them to cover the edge of the view.
import * as THREE from "three";
import { smoothstep } from "./movement";

interface FadeSet {
  mesh: THREE.InstancedMesh;
  /** Each instance's bounding sphere: x, y, z, radius. */
  spheres: Float32Array;
  /** How faded each instance is (0: not at all), and the attribute the shader reads it from. */
  now: Float32Array;
  attr: THREE.InstancedBufferAttribute;
  /** The set whose fade this one follows too, instance for instance (a trunk its crown: userData.fadeWith). */
  leader?: FadeSet;
}

interface ForegroundProp {
  bounds: THREE.Box3;
  materials: { material: THREE.Material; opacity: number }[];
}

/** At most this much of a faded prop's surface is left out (0–1). */
const MOST = 0.82;

export class PropFader {
  private foreground: ForegroundProp[] = [];
  private sets: FadeSet[] = [];
  private a = new THREE.Vector3();
  private b = new THREE.Vector3();

  /** Every instanced mesh under `root` that stands taller than `minTop` m and isn't skipped. `deep`: this edition's
   *  deeper fade (theme.ts `fade`; none: Maple Harbor's, wantFade). */
  constructor(root: THREE.Object3D, skip?: (o: THREE.Object3D) => boolean, minTop = 1.3, private deep: { most: number; near: number } | null = null) {
    root.updateMatrixWorld(true);
    const m4 = new THREE.Matrix4(), s = new THREE.Sphere(), box = new THREE.Box3();
    root.traverse((o) => {
      if (o.userData.fadeNearCamera && !skip?.(o)) this.addForeground(o);
      const mesh = o as THREE.InstancedMesh;
      if (!mesh.isInstancedMesh || skip?.(o) || Array.isArray(mesh.material)) return;
      const g = mesh.geometry;
      if (!g.boundingSphere) g.computeBoundingSphere();
      if (!g.boundingBox) g.computeBoundingBox();
      const n = mesh.count;
      const spheres = new Float32Array(n * 4);
      let tall = false;
      for (let i = 0; i < n; i++) {
        mesh.getMatrixAt(i, m4);
        m4.premultiply(mesh.matrixWorld);
        s.copy(g.boundingSphere!).applyMatrix4(m4);
        box.copy(g.boundingBox!).applyMatrix4(m4);
        if (box.max.y >= minTop) tall = true;
        spheres.set([s.center.x, s.center.y, s.center.z, s.radius], i * 4);
      }
      if (!tall) return;
      const now = new Float32Array(n);
      const attr = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
      attr.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute("aFadeOut", attr);
      // its own copy of the material (a shared one would fade other things too), taught to fade
      mesh.material = withFade(copyOf(mesh.material));
      this.sets.push({ mesh, spheres, now, attr });
    });
    // (a trunk that fades with its crown, userData.fadeWith: after its crown, each frame)
    for (const set of this.sets) {
      const lead = set.mesh.userData.fadeWith as THREE.InstancedMesh | undefined;
      set.leader = lead ? this.sets.find((o) => o.mesh === lead) : undefined;
    }
    this.sets.sort((a, b) => (a.leader ? 1 : 0) - (b.leader ? 1 : 0));
  }

  private addForeground(root: THREE.Object3D) {
    const materials: ForegroundProp["materials"] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material)) return;
      const material = mesh.material = copyOf(mesh.material);
      material.alphaHash = true;
      materials.push({ material, opacity: material.opacity });
    });
    this.foreground.push({ bounds: new THREE.Box3().setFromObject(root), materials });
  }

  private showForeground(prop: ForegroundProp, amount: number) {
    for (const { material, opacity } of prop.materials) material.opacity = opacity * amount;
  }

  get count() { return this.sets.reduce((n, s) => n + s.mesh.count, 0); }

  /** Everything whole again at once (a new place, a conversation). */
  reset() {
    for (const prop of this.foreground) this.showForeground(prop, 1);
    for (const set of this.sets) {
      if (!set.now.some((v) => v !== 0)) continue;
      set.now.fill(0);
      (set.attr.array as Float32Array).fill(0);
      set.attr.clearUpdateRanges();
      set.attr.needsUpdate = true;
    }
  }

  /** Fade props along the walking sightline. A stage can also clear flagged canopies around its lens. */
  update(dt: number, cam: THREE.Vector3, subject: THREE.Vector3, on = true, stageClearance = 0) {
    // A wide roof can fill the edge of the view while the centre sightline is clear.
    for (const prop of this.foreground) {
      this.showForeground(prop, on ? smoothstep(5.5, 7.5, prop.bounds.distanceToPoint(cam)) : 1);
    }
    const k = Math.min(1, dt * 7), deep = this.deep;
    for (const set of this.sets) {
      const clearance = set.mesh.userData.fadeNearStage ? stageClearance : 0;
      let changed = -1, last = -1;
      for (let i = 0; i < set.mesh.count; i++) {
        let want = on ? (deep ? deepFade(set.spheres, i, cam, subject, deep, this.a, this.b) : wantFade(set.spheres, i, cam, subject, this.a, this.b)) : 0;
        if (clearance > 0) {
          const s = set.spheres, j = i * 4;
          const distance = Math.hypot(s[j] - cam.x, s[j + 1] - cam.y, s[j + 2] - cam.z);
          if (distance < s[j + 3] + clearance) want = 1;
        }
        if (set.leader && set.leader.now[i] > want) want = set.leader.now[i];
        const cur = set.now[i];
        if (cur === want) continue;
        let next = cur + (want - cur) * k;
        if (Math.abs(next - want) < 0.01) next = want;
        set.now[i] = next;
        set.attr.array[i] = deep ? next : next * MOST;
        if (changed < 0) changed = i;
        last = i;
      }
      if (changed >= 0) {
        set.attr.clearUpdateRanges();
        set.attr.addUpdateRange(changed, last - changed + 1);
        set.attr.needsUpdate = true;
      }
    }
  }
}

/** 1 when the sphere `i` stands in the way of the line from `cam` to `subject` (its centre within 85 % of its radius
 *  of the line), or the camera is inside it or close to it; else 0. */
export function wantFade(sp: Float32Array, i: number, cam: THREE.Vector3, subject: THREE.Vector3, a = new THREE.Vector3(), b = new THREE.Vector3()) {
  const cx = sp[i * 4], cy = sp[i * 4 + 1], cz = sp[i * 4 + 2], r = sp[i * 4 + 3];
  const dc = Math.hypot(cx - cam.x, cy - cam.y, cz - cam.z);
  if (dc < r + 0.8) return 1;
  // the nearest point of the line to the centre
  a.subVectors(subject, cam);
  const len2 = a.lengthSq();
  if (len2 < 1e-6) return 0;
  b.set(cx - cam.x, cy - cam.y, cz - cam.z);
  const t = Math.max(0, Math.min(1, b.dot(a) / len2));
  const px = cam.x + a.x * t - cx, py = cam.y + a.y * t - cy, pz = cam.z + a.z * t - cz;
  // (not a prop just behind the subject's back: the line ends at their chest)
  return t < 0.97 && Math.hypot(px, py, pz) < r * 0.85 ? 1 : 0;
}

/** This edition's deeper fade (theme.ts `fade`: the zócalo's laureles are big and dark, and as high as the walking
 *  camera stands), as the share of the surface left out: all of it when the camera is in the crown or within `near` m
 *  of it; `most` when the crown stands in the way of the line from the camera to the player's chest or to her head, or
 *  close in front of the camera (within two of its radii, where the player is: a crown filling half the picture);
 *  else 0. */
export function deepFade(sp: Float32Array, i: number, cam: THREE.Vector3, subject: THREE.Vector3, o: { most: number; near: number }, a = new THREE.Vector3(), b = new THREE.Vector3()) {
  const cx = sp[i * 4], cy = sp[i * 4 + 1], cz = sp[i * 4 + 2], r = sp[i * 4 + 3];
  const dc = Math.hypot(cx - cam.x, cy - cam.y, cz - cam.z);
  if (dc < r + o.near) return 1;
  b.set(cx - cam.x, cy - cam.y, cz - cam.z);
  for (const up of [0, 0.55]) {
    a.set(subject.x - cam.x, subject.y + up - cam.y, subject.z - cam.z);
    const len2 = a.lengthSq();
    if (len2 < 1e-6) return 0;
    const t = Math.max(0, Math.min(1, b.dot(a) / len2));
    const px = cam.x + a.x * t - cx, py = cam.y + a.y * t - cy, pz = cam.z + a.z * t - cz;
    if (t < 0.97 && Math.hypot(px, py, pz) < r * 0.9) return o.most;
    // (close in front of the lens, on the way to her: the angle from the line to her under 40°)
    if (up === 0 && dc < r * 2 && b.dot(a) > Math.cos(0.7) * dc * Math.sqrt(len2) && dc < Math.sqrt(len2)) return o.most;
  }
  return 0;
}

/** A copy of the material that keeps its own shader changes (a clone drops them: the trees' sway). */
function copyOf<M extends THREE.Material>(m: M): M {
  const c = m.clone() as M;
  if (Object.prototype.hasOwnProperty.call(m, "onBeforeCompile")) c.onBeforeCompile = m.onBeforeCompile;
  if (Object.prototype.hasOwnProperty.call(m, "customProgramCacheKey")) c.customProgramCacheKey = m.customProgramCacheKey;
  return c;
}

/** The material, with a per-instance amount of its surface left out in a fine dither (interleaved gradient noise on
 *  the screen's pixels): `aFadeOut` 0 draws it whole, as before. Its shadow stays whole. */
export function withFade<M extends THREE.Material>(m: M): M {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aFadeOut;\nvarying float vFadeOut;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvFadeOut = aFadeOut;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vFadeOut;")
      .replace("void main() {", "void main() {\n\tif (vFadeOut > 0.002 && fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) < vFadeOut) discard;");
  };
  // (the cache key of what it had before: its own, or by default the source of its earlier shader change)
  const own = Object.prototype.hasOwnProperty.call(m, "customProgramCacheKey") ? m.customProgramCacheKey.bind(m) : null;
  const before = own ? own() : prev.toString();
  m.customProgramCacheKey = () => before + "|fade";
  return m;
}
