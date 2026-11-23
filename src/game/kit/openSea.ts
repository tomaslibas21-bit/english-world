import * as THREE from "three";

// Open water for the games beyond the swim limit: one disc of sea that travels with the boat, one draw call.
// The waves live in world space (so the boat moves through them), the colour runs from deep water under the bow to
// the sky's own colour at the horizon, the low sun lays a road of glitter, crests carry a little foam, and the boat
// leaves a V of wake. `openSwell` is the same surface for the hull to ride.

/** How much bigger the open sea rolls than the bay (0 at the swim limit, 1 well out). */
const ROLL = [
  // [x frequency, z frequency, speed, height]
  [0.045, 0.060, 0.80, 0.26],
  [-0.030, 0.130, -1.10, 0.15],
] as const;

/** The sea's height over rest level at (x, z) and time `t`; `open` 0–1 grows the long rollers. The bay's own swell
 *  (water.ts `swell`) is its first part, so the seam with the town's sea does not show. */
export function openSwell(x: number, z: number, t: number, open = 1) {
  let h = Math.sin(x * 0.08 + t * 0.9) * 0.12 + Math.cos(z * 0.11 + t * 0.7) * 0.1 + Math.sin(x * 0.05 - t * 1.9) * 0.045;
  for (const [fx, fz, speed, height] of ROLL) h += open * height * Math.sin(x * fx + z * fz + t * speed);
  return h;
}

const WAVES = /* glsl */ `
uniform float uTime, open;
float seaHeight(vec2 p) {
  float h = sin(p.x * 0.08 + uTime * 0.9) * 0.12 + cos(p.y * 0.11 + uTime * 0.7) * 0.1 + sin(p.x * 0.05 - uTime * 1.9) * 0.045;
  ${ROLL.map(([fx, fz, speed, height]) => `h += open * ${height.toFixed(3)} * sin(p.x * ${fx.toFixed(3)} + p.y * ${fz.toFixed(3)} + uTime * ${speed.toFixed(2)});`).join("\n  ")}
  return h;
}
vec2 seaSlope(vec2 p) {
  vec2 g = vec2(cos(p.x * 0.08 + uTime * 0.9) * 0.0096 + cos(p.x * 0.05 - uTime * 1.9) * 0.00225, -sin(p.y * 0.11 + uTime * 0.7) * 0.011);
  ${ROLL.map(([fx, fz, speed, height]) => `g += open * ${height.toFixed(3)} * cos(p.x * ${fx.toFixed(3)} + p.y * ${fz.toFixed(3)} + uTime * ${speed.toFixed(2)}) * vec2(${fx.toFixed(3)}, ${fz.toFixed(3)});`).join("\n  ")}
  return g;
}`;

const vertex = /* glsl */ `
${WAVES}
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  w.y += seaHeight(w.xz);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const fragment = /* glsl */ `
${WAVES}
uniform vec3 deep, bright, sky, haze, sunColor, foam, sunDir;
uniform vec4 boat;      // x, z, heading sin, heading cos
uniform float wake;     // 0–1 with the boat's speed
uniform float reach;    // where the water has become the horizon
uniform float alpha;
uniform vec4 floats;     // a row of four floats across the course: x of its middle, z, the gap between them, 0–1 shown
varying vec3 vW;
void main() {
  vec2 p = vW.xz;
  vec3 toEye = cameraPosition - vW;
  float far = length(toEye);
  vec3 v = toEye / far;
  // The long waves, and two layers of small chop that fade with distance so the far sea stays calm.
  vec2 g = seaSlope(p);
  float near = 1.0 - smoothstep(30.0, 260.0, far);
  float chopA = sin(p.x * 0.9 + p.y * 0.35 + uTime * 1.7), chopB = sin(p.y * 1.3 - p.x * 0.5 - uTime * 2.1);
  g += near * 0.07 * vec2(cos(p.x * 0.9 + p.y * 0.35 + uTime * 1.7) * 0.9 - cos(p.y * 1.3 - p.x * 0.5 - uTime * 2.1) * 0.5,
                          cos(p.x * 0.9 + p.y * 0.35 + uTime * 1.7) * 0.35 + cos(p.y * 1.3 - p.x * 0.5 - uTime * 2.1) * 1.3);
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));

  float lift = seaHeight(p);
  vec3 c = mix(deep, bright, smoothstep(-0.25, 0.55, lift + 0.06 * chopA * near));
  float graze = 1.0 - max(dot(n, v), 0.0);
  graze *= graze; graze *= graze;
  c = mix(c, sky, 0.04 + 0.5 * graze);

  // the sun's road: a wide soft band and hard glitter inside it
  vec3 r = reflect(-v, n);
  float s = max(dot(r, sunDir), 0.0);
  float s8 = s * s; s8 *= s8; s8 *= s8;
  float s64 = s8 * s8; s64 *= s64; s64 *= s64;
  // glitter in broken, drifting patches (warped, so it never lines up in rows)
  vec2 q = p + 1.7 * vec2(sin(p.y * 0.31 + uTime * 0.4), sin(p.x * 0.27 - uTime * 0.3));
  float flecks = smoothstep(0.35, 0.9, sin(q.x * 3.9 + sin(q.y * 2.3 + uTime * 1.6) * 1.9) * sin(q.y * 4.7 - uTime * 1.3 + sin(q.x * 1.9) * 1.6));
  // fewer and finer under the bow, where they would be the size of the boat
  flecks *= 0.35 + 0.65 * smoothstep(8.0, 70.0, far);
  c += sunColor * (s8 * 0.07 + s64 * (0.12 + 1.7 * flecks));

  // foam on the highest crests, in broken streaks
  float lace = sin(p.x * 1.9 + sin(p.y * 2.3 + uTime * 0.5) * 1.5) * sin(p.y * 2.6 - uTime * 0.8 + sin(p.x * 1.4) * 1.2);
  float cap = smoothstep(0.30, 0.50, lift) * smoothstep(0.55, 0.92, lace) * near * open;
  c = mix(c, foam, cap * 0.6);

  // the wake: two arms opening behind the stern and the churned water between them
  vec2 d = p - boat.xy;
  float astern = -(d.x * boat.z + d.y * boat.w);
  float abeam = abs(d.x * boat.w - d.y * boat.z);
  if (astern > 0.0 && astern < 70.0) {
    float fade = wake * (1.0 - astern / 70.0);
    float arm = 0.55 + astern * 0.30;
    float line = smoothstep(0.5 + astern * 0.035, 0.0, abs(abeam - arm)) * (0.45 + 0.55 * lace);
    float churn = smoothstep(arm * 0.5, 0.0, abeam) * smoothstep(22.0, 0.0, astern) * (0.5 + 0.5 * sin(astern * 2.2 - uTime * 6.0) * lace);
    c = mix(c, foam, clamp(line * 0.8 + churn * 0.85, 0.0, 1.0) * fade);
  }

  // rings spreading from each float of the gate ahead, so the buoys sit in the water
  vec2 row = p - floats.xy;
  if (floats.w > 0.0 && abs(row.y) < 6.0 && abs(row.x) < floats.z * 2.2) {
    float across = abs(row.x) < floats.z ? abs(abs(row.x) - floats.z * 0.5) : abs(abs(row.x) - floats.z * 1.5);
    float away = length(vec2(across, row.y - 0.34));
    float rings = smoothstep(0.55, 1.0, sin(away * 4.6 - uTime * 3.2)) * smoothstep(4.2, 1.0, away) * smoothstep(0.75, 1.15, away);
    float collar = smoothstep(1.35, 1.0, away) * smoothstep(0.8, 1.02, away);
    c = mix(c, foam, clamp(rings * 0.5 + collar * 0.75, 0.0, 1.0) * floats.w);
  }

  c = mix(c, haze, smoothstep(reach * 0.22, reach, far));
  gl_FragColor = vec4(c, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export type SeaLook = { deep: string; bright: string; foam: string };

export class OpenSea {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  /** How strongly the water draws the boat's wake itself (0 when something else draws it). */
  wakeStrength = 1;

  /** `reach`: the disc's radius in metres; the water has faded into the horizon by then. */
  constructor(look: SeaLook, level: number, readonly reach = 1100) {
    // Rings that widen outward: small facets under the boat, long ones toward the horizon.
    const spokes = 56, rings = 46;
    const positions: number[] = [0, 0, 0], index: number[] = [];
    for (let i = 0; i < rings; i++) {
      const radius = 3 * Math.pow(reach / 3, i / (rings - 1));
      for (let j = 0; j < spokes; j++) {
        const a = (j + (i % 2) * 0.5) / spokes * Math.PI * 2;
        positions.push(Math.sin(a) * radius, 0, Math.cos(a) * radius);
      }
    }
    for (let j = 0; j < spokes; j++) index.push(0, 1 + j, 1 + (j + 1) % spokes);
    for (let i = 0; i + 1 < rings; i++) for (let j = 0; j < spokes; j++) {
      const a = 1 + i * spokes + j, b = 1 + i * spokes + (j + 1) % spokes, c = a + spokes, d = b + spokes;
      if (i % 2) index.push(a, c, d, a, d, b); else index.push(a, c, b, b, c, d);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(index);
    const colour = (value: THREE.ColorRepresentation = "#ffffff") => ({ value: new THREE.Color(value) });
    this.mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
      vertexShader: vertex, fragmentShader: fragment, fog: false,
      uniforms: {
        uTime: { value: 0 }, open: { value: 0 }, deep: colour(look.deep), bright: colour(look.bright), foam: colour(look.foam),
        sky: colour(), haze: colour(), sunColor: colour(), sunDir: { value: new THREE.Vector3(0, 1, 0) },
        boat: { value: new THREE.Vector4(0, 0, 0, 1) }, wake: { value: 0 }, reach: { value: reach }, alpha: { value: 1 },
        floats: { value: new THREE.Vector4() },
      },
    }));
    this.mesh.position.y = level;
    this.mesh.frustumCulled = false;
  }

  /** Lay this sea over another one (a bay's, drawn before it): 0 shows the other, 1 this one. */
  set cover(alpha: number) {
    const material = this.mesh.material;
    material.uniforms.alpha.value = alpha;
    material.blending = alpha < 1 ? THREE.CustomBlending : THREE.NormalBlending;
  }

  /** A gate's row of four floats, `gap` metres apart, centred on (x, z); `shown` 0 hides their rings. */
  floats(x: number, z: number, gap: number, shown: number) { this.mesh.material.uniforms.floats.value.set(x, z, gap, shown); }

  /** What the sky lends the water: the colour it mirrors, the haze it ends in, the sun and where it stands. */
  light(sky: THREE.Color, haze: THREE.Color, sun: THREE.Color, sunDir: THREE.Vector3) {
    const u = this.mesh.material.uniforms;
    u.sky.value.copy(sky);
    u.haze.value.copy(haze);
    u.sunColor.value.copy(sun);
    u.sunDir.value.copy(sunDir);
  }

  /** `heading`: radians, 0 toward +z, as the rides use it. `open`: 0 at the bay's edge, 1 on the open sea. */
  update(time: number, x: number, z: number, heading: number, speed: number, open: number) {
    const u = this.mesh.material.uniforms;
    u.uTime.value = time;
    u.open.value = open;
    u.boat.value.set(x, z, Math.sin(heading), Math.cos(heading));
    u.wake.value = THREE.MathUtils.clamp(speed, 0, 1) * this.wakeStrength;
    this.mesh.position.x = x;
    this.mesh.position.z = z;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
