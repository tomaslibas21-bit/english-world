// Dev only (not part of the build): finds solid things that have no collider, so people would walk through them.
// It renders a zone from straight above into a height map (geometry above 2.3 m — lamps, roofs, awnings, treetops —
// is left out), then lists the places where something stands 0.25–1.4 m high that the zone's colliders don't block:
// tables, chairs, planters, trolleys… Flowers, rugs and mats stay under the cut. Run it from the browser console or a
// probe: `(await import("/src/dev/solidAudit.ts")).solidAudit(renderer, zone.group, zone.colliders, box)`.
import * as THREE from "three";
import type { Colliders } from "../game/world/util";

export interface SolidSpot { x: number; z: number; area: number; height: number; w: number; d: number }

export function solidAudit(renderer: THREE.WebGLRenderer, group: THREE.Object3D, col: Colliders, box: { x0: number; z0: number; x1: number; z1: number }, mpp = 0.1, low = 0.25, high = 1.4, minWidth = 0.1): SolidSpot[] {
  const W = Math.ceil((box.x1 - box.x0) / mpp), H = Math.ceil((box.z1 - box.z0) / mpp);
  const cx = (box.x0 + box.x1) / 2, cz = (box.z0 + box.z1) / 2, hw = (W * mpp) / 2, hh = (H * mpp) / 2;
  // looking straight down, north (-z) up on the picture
  const cam = new THREE.OrthographicCamera(-hw, hw, hh, -hh, 1, 60);
  cam.position.set(cx, 30, cz);
  cam.up.set(0, 0, -1);
  cam.lookAt(cx, 0, cz);
  cam.updateMatrixWorld();
  const target = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType });
  const heightMat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    vertexShader: `varying float vY;
      void main() {
        vec4 p = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
        #endif
        vec4 w = modelMatrix * p;
        vY = w.y;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `varying float vY; void main() { if (vY > 2.3) discard; gl_FragColor = vec4(vY, 0.0, 0.0, 1.0); }`,
  });
  const scene = new THREE.Scene();
  const parent = group.parent;
  scene.add(group);
  scene.overrideMaterial = heightMat;
  const clear = renderer.getClearColor(new THREE.Color()), alpha = renderer.getClearAlpha();
  renderer.setClearColor(new THREE.Color(-10, 0, 0), 1);
  renderer.setRenderTarget(target);
  renderer.clear();
  renderer.render(scene, cam);
  renderer.setRenderTarget(null);
  renderer.setClearColor(clear, alpha);
  parent?.add(group);
  const px = new Float32Array(W * H * 4);
  renderer.readRenderTargetPixels(target, 0, 0, W, H, px);
  target.dispose();
  heightMat.dispose();
  // the pixels standing up but not blocked (slivers thinner than `minWidth` dropped: a table top overhanging its
  // collider by a few centimetres stops nobody), then grouped into spots
  const at = (c: number, r: number): [number, number] => [cx - hw + (c + 0.5) * mpp, cz + hh - (r + 0.5) * mpp];
  const flag = new Uint8Array(W * H);
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const h = px[(r * W + c) * 4];
    if (h < low || h > high) continue;
    const [x, z] = at(c, r);
    if (!col.blocked(x, z, 0)) flag[r * W + c] = 1;
  }
  const e = Math.max(0, Math.round(minWidth / mpp / 2));
  if (e) {
    const keep = new Uint8Array(W * H);
    for (let r = e; r < H - e; r++) for (let c = e; c < W - e; c++) {
      let all = 1;
      for (let dr = -e; dr <= e && all; dr++) for (let dc = -e; dc <= e; dc++) if (!flag[(r + dr) * W + c + dc]) { all = 0; break; }
      keep[r * W + c] = all;
    }
    flag.set(keep);
  }
  const spots: SolidSpot[] = [];
  const seen = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (!flag[i] || seen[i]) continue;
    const stack = [i];
    seen[i] = 1;
    let n = 0, sx = 0, sz = 0, maxH = 0, c0 = W, c1 = 0, r0 = H, r1 = 0;
    while (stack.length) {
      const k = stack.pop()!, c = k % W, r = (k - c) / W;
      const [x, z] = at(c, r);
      n++; sx += x; sz += z; maxH = Math.max(maxH, px[k * 4]);
      c0 = Math.min(c0, c); c1 = Math.max(c1, c); r0 = Math.min(r0, r); r1 = Math.max(r1, r);
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const cc = c + dc, rr = r + dr;
        if (cc < 0 || rr < 0 || cc >= W || rr >= H) continue;
        const kk = rr * W + cc;
        if (flag[kk] && !seen[kk]) { seen[kk] = 1; stack.push(kk); }
      }
    }
    if (n * mpp * mpp >= 0.04) spots.push({ x: +(sx / n).toFixed(2), z: +(sz / n).toFixed(2), area: +(n * mpp * mpp).toFixed(2), height: +maxH.toFixed(2), w: +((c1 - c0 + 1) * mpp).toFixed(2), d: +((r1 - r0 + 1) * mpp).toFixed(2) });
  }
  return spots.sort((a, b) => b.area - a.area);
}
