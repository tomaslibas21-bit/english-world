// The outdoor glow of the grotto under Cenote Ka'an. The cave scene and quest load on entry in zone.ts.
import * as THREE from "three";
import { THEME } from "../world/theme";
import { groundsGlow } from "./grounds";
import { caveWays, R } from "./groundsPlan";

export { CAVE_ZONE, caveWays } from "./groundsPlan";

/** What shows of it from the cenote: a glow in the cave's dark mouth and a few fireflies drifting out over the water
 *  (two small meshes in the town's group). */
export function caveLure(): THREE.Group | null {
  if (!caveWays().length) return null;
  if (THEME.cenote!.open) return groundsGlow(THEME.cenote!.x, THEME.cenote!.z);
  const g = new THREE.Group(), x = THEME.cenote!.x - R + 0.56, z = THEME.cenote!.z;
  g.name = "gruta-lure";
  const u = { uTime: { value: 0 } };
  const glow = new THREE.Mesh(new THREE.CircleGeometry(1.75, 18, 0, Math.PI).scale(1.15, 0.92, 1).rotateY(Math.PI / 2).translate(x, 0.05, z), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: u, side: THREE.DoubleSide,
    vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `varying vec3 vP; uniform float uTime; void main(){
      float d = length(vec2((vP.z - (${z.toFixed(2)})) / 1.9, vP.y / 1.6));
      float a = smoothstep(1.0, 0.05, d) * (0.95 + 0.25 * sin(uTime * 1.3 + vP.y * 3.0));
      // (brightest low, where the water inside shows; rays of it reach up the dark)
      float ray = 0.5 + 0.5 * sin((vP.z - (${z.toFixed(2)})) * 9.0 + sin(uTime * 0.7) * 1.5);
      a *= 0.75 + 0.5 * ray * smoothstep(1.6, 0.0, vP.y);
      gl_FragColor = vec4(vec3(0.25, 1.0, 0.9) * a, 1.0); }`,
  }));
  const N = 26, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = x + 0.4 + Math.random() * 3.4; pos[i * 3 + 1] = 0.3 + Math.random() * 1.7; pos[i * 3 + 2] = z + (Math.random() - 0.5) * 3.6; seed[i] = Math.random() * 6.28; }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  pg.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const flies = new THREE.Points(pg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: u,
    vertexShader: `attribute float aSeed; uniform float uTime; varying float vA; void main(){ float t = uTime * 0.7 + aSeed;
      vec3 p = position + vec3(sin(t) * 0.6, sin(t * 1.3 + 1.0) * 0.3, cos(t * 0.8) * 0.6);
      vA = 0.5 + 0.5 * sin(t * 2.3 + aSeed * 4.0); vA *= vA;
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = min(210.0 / max(1.0, -mv.z), 48.0); }`,
    fragmentShader: "varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float s = max(0.0, 1.0 - d); gl_FragColor = vec4(vec3(0.95, 1.0, 0.55) * s * s * vA, 1.0); }",
  }));
  // (in the picture only when the cave's mouth is: its own bounds, and nothing at all from further off than the mirador)
  pg.boundingSphere = new THREE.Sphere(new THREE.Vector3(x + 1.5, 1, z), 4.5);
  g.add(glow, flies);
  g.userData.tick = (t: number, px: number, pz: number) => { u.uTime.value = t; g.visible = (px - x) ** 2 + (pz - z) ** 2 < 70 * 70; };
  // (nothing here stands in the camera's way or is jumped onto)
  g.userData.thin = true;
  return g;
}
