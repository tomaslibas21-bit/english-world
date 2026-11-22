import * as THREE from "three";

// The sky of the games outside town (the desert road, the open water): one dome, one draw call, no textures.
// It paints the gradient, the sun with its halo, thin high cloud, and two far ranges on the horizon that the sun can
// sink behind. A look is one moment of the day; two looks blend, so a run can travel from afternoon into sunset.

export type SkyLook = {
  /** The dome from the top down to the horizon. Everything far fades into `horizon` (use it as the fog colour). */
  zenith: string; mid: string; horizon: string;
  sun: string; halo: string;
  /** The sun's height above the horizon, in degrees. */
  elevation: number;
  /** The far ranges painted on the horizon, back and front. */
  ridgeFar: string; ridgeNear: string;
  /** Thin high cloud: its colour and how much of it there is (0–1). */
  streak: string; streaks: number;
  /** Cumulus: the lit side, and a tint over the whole cloud. */
  cloud: string;
  /** The light this sky gives the things under it. */
  light: string; lightPower: number; fillSky: string; fillGround: string; fill: number;
};

const COLOURS = ["zenith", "mid", "horizon", "sun", "halo", "ridgeFar", "ridgeNear", "streak", "cloud", "light", "fillSky", "fillGround"] as const;
const NUMBERS = ["elevation", "streaks", "lightPower", "fill"] as const;
type Compiled = Record<typeof COLOURS[number], THREE.Color> & Record<typeof NUMBERS[number], number>;

const compile = (look: SkyLook) => {
  const out = {} as Compiled;
  for (const key of COLOURS) out[key] = new THREE.Color(look[key]);
  for (const key of NUMBERS) out[key] = look[key];
  return out;
};

const vertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragment = /* glsl */ `
uniform vec3 zenith, mid, horizon, sunColor, haloColor, ridgeFar, ridgeNear, streakColor, sunDir;
uniform float streaks, flash, ridges, drift;
varying vec3 vDir;
float tri(float x) { return abs(fract(x) - 0.5) * 2.0; }
// A low-poly silhouette: straight slopes between peaks. Whole multipliers keep it seamless around the dome.
float ridge(float turn, float seed) {
  return tri(turn * 5.0 + seed) * 0.52 + tri(turn * 13.0 + seed * 2.3) * 0.30 + tri(turn * 31.0 + seed * 5.1) * 0.18;
}
void main() {
  vec3 d = normalize(vDir);
  float e = d.y;
  float turn = atan(d.x, -d.z) / 6.2831853;
  vec3 col = mix(horizon, mid, smoothstep(0.0, 0.11, e));
  col = mix(col, zenith, smoothstep(0.07, 0.52, e));

  float toSun = max(dot(d, sunDir), 0.0);
  float wide = toSun * toSun; wide *= wide; wide *= wide; wide *= wide;   // ^16
  float tight = wide * wide; tight *= tight;                              // ^64
  vec2 flat2 = normalize(d.xz + vec2(0.0, -1e-4));
  float side = max(dot(flat2, normalize(sunDir.xz)), 0.0);
  float band = exp(-abs(e) * 8.0) * (0.25 + 0.75 * side * side);
  col += haloColor * (wide * 0.22 + tight * 0.95 + band * 0.22) * (1.0 + flash * 1.6);
  col += haloColor * flash * 0.07;

  // thin high cloud: long wavy bands, brightest toward the sun
  float wave = sin(e * 88.0 + sin(turn * 18.850 + drift) * 1.1 + sin(turn * 69.115 + 1.3) * 0.7);
  float veil = smoothstep(0.72, 1.0, wave) * smoothstep(0.06, 0.17, e) * (1.0 - smoothstep(0.30, 0.52, e));
  veil *= smoothstep(-0.2, 0.7, sin(turn * 31.416 + e * 33.0 + 0.6 * sin(turn * 81.68)));
  col = mix(col, streakColor + haloColor * wide * 0.5, clamp(veil, 0.0, 1.0) * streaks * 0.6);

  // brighter than white, so that the tone mapping leaves it glowing
  float disc = smoothstep(0.9992, 0.99962, dot(d, sunDir));
  col = mix(col, sunColor * 3.2, disc);

  float soft = 0.0018;
  float far = ridges * (0.018 + 0.032 * ridge(turn, 1.7));
  float near = ridges * (0.006 + 0.024 * ridge(turn + 0.137, 4.2));
  col = mix(col, mix(ridgeFar, horizon, 0.35), smoothstep(far + soft, far - soft, e));
  col = mix(col, mix(ridgeNear, horizon, smoothstep(0.03, 0.0, e) * 0.55), smoothstep(near + soft, near - soft, e));
  col = mix(col, horizon, smoothstep(0.004, -0.004, e));

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class OpenSky {
  readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  /** What the sky gives the scene now (filled by `blend`). */
  readonly haze = new THREE.Color();
  readonly light = new THREE.Color();
  readonly fillSky = new THREE.Color();
  readonly fillGround = new THREE.Color();
  readonly cloud = new THREE.Color();
  readonly halo = new THREE.Color();
  readonly sunDir = new THREE.Vector3();
  lightPower = 1;
  fill = 1;
  private looks: Compiled[];
  private flash = 0;

  /** `azimuth`: where the sun stands, in radians from straight ahead (-z), positive to the right.
   *  `ridges`: the height of the far ranges on the horizon; 0 for a clean horizon. */
  constructor(radius: number, looks: SkyLook[], private azimuth: number, ridges = 1) {
    this.looks = looks.map(compile);
    const colour = () => ({ value: new THREE.Color() });
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex, fragmentShader: fragment, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
      uniforms: {
        zenith: colour(), mid: colour(), horizon: colour(), sunColor: colour(), haloColor: colour(), ridgeFar: colour(),
        ridgeNear: colour(), streakColor: colour(), sunDir: { value: this.sunDir }, streaks: { value: 0 },
        flash: { value: 0 }, ridges: { value: ridges }, drift: { value: 0 },
      },
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
    this.blend(0);
  }

  /** `day`: 0 at the first look, 1 at the last. */
  blend(day: number) {
    const span = this.looks.length - 1;
    const at = THREE.MathUtils.clamp(day, 0, 1) * span;
    const i = Math.min(Math.max(0, span - 1), Math.floor(at)), t = span ? at - i : 0;
    const a = this.looks[i], b = this.looks[Math.min(span, i + 1)];
    const u = this.mesh.material.uniforms;
    const mix = (key: typeof COLOURS[number], out: THREE.Color) => out.copy(a[key]).lerp(b[key], t);
    mix("zenith", u.zenith.value); mix("mid", u.mid.value); mix("horizon", u.horizon.value);
    mix("sun", u.sunColor.value); mix("halo", u.haloColor.value); mix("ridgeFar", u.ridgeFar.value);
    mix("ridgeNear", u.ridgeNear.value); mix("streak", u.streakColor.value);
    mix("light", this.light); mix("fillSky", this.fillSky); mix("fillGround", this.fillGround); mix("cloud", this.cloud);
    this.haze.copy(u.horizon.value);
    this.halo.copy(u.haloColor.value);
    const num = (key: typeof NUMBERS[number]) => THREE.MathUtils.lerp(a[key], b[key], t);
    u.streaks.value = num("streaks");
    this.lightPower = num("lightPower");
    this.fill = num("fill");
    const up = THREE.MathUtils.degToRad(num("elevation"));
    this.sunDir.set(Math.sin(this.azimuth) * Math.cos(up), Math.sin(up), -Math.cos(this.azimuth) * Math.cos(up));
  }

  /** A moment of joy: the halo flares and settles. */
  pulse(strength = 1) { this.flash = Math.max(this.flash, strength); }

  update(dt: number, centre: THREE.Vector3) {
    this.flash = Math.max(0, this.flash - dt * 1.9);
    const u = this.mesh.material.uniforms;
    u.flash.value = this.flash * this.flash;
    u.drift.value += dt * 0.012;
    this.mesh.position.copy(centre);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
