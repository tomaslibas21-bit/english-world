// Renderer, sky, light and atmosphere for the trial world styles (see style.ts). The original
// "blocks" look never calls into this file (createStyleFx returns null for it).
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { STYLE, STYLED, IS_TOON, IS_STORY, IS_REAL, OUTLINE_LAYER } from "./style";

interface Look3D {
  toneMapping: THREE.ToneMapping; exposure: number;
  /** sky zenith, middle, horizon (the horizon matches the fog) */
  sky: [string, string, string];
  fog: [string, number, number];
  /** hemisphere sky colour, ground colour, intensity outdoors, indoors */
  hemi: [string, string, number, number];
  /** sun colour, intensity outdoors, indoors, and where it shines from (offset from the player) */
  sun: [string, number, number, [number, number, number]];
  shadow: { radius: number; intensity: number };
  /** background behind the dollhouse rooms: warm places, others */
  indoorBg: [string, string];
  env: [number, number];
}

const LOOKS: Record<"toon" | "storybook" | "realistic", Look3D> = {
  toon: {
    toneMapping: THREE.NeutralToneMapping, exposure: 1.0,
    sky: ["#3d8ee6", "#8dd2ff", "#e6f6ff"], fog: ["#d4efff", 140, 480],
    hemi: ["#e2f3ff", "#a9d18a", 1.45, 1.7], sun: ["#fff4de", 2.2, 1.8, [-30, 75, 22]],
    shadow: { radius: 1.5, intensity: 0.7 }, indoorBg: ["#3b2f4a", "#2d3a5a"], env: [0, 0],
  },
  storybook: {
    toneMapping: THREE.NeutralToneMapping, exposure: 1.0,
    sky: ["#9fc3cd", "#d5e2da", "#f2e5cd"], fog: ["#f0e3cb", 55, 300],
    hemi: ["#fff4e4", "#b89a78", 1.3, 1.45], sun: ["#ffdcae", 2.0, 1.55, [-48, 52, 40]],
    shadow: { radius: 7, intensity: 0.45 }, indoorBg: ["#e6d7bf", "#e2d9c8"], env: [0, 0],
  },
  realistic: {
    toneMapping: THREE.ACESFilmicToneMapping, exposure: 0.92,
    sky: ["#2e68ad", "#88b7de", "#dbe7ee"], fog: ["#d2dfe8", 90, 470],
    hemi: ["#d6e7ff", "#7c7f63", 0.5, 0.62], sun: ["#fff0da", 2.9, 1.95, [-45, 58, 34]],
    shadow: { radius: 3.5, intensity: 1 }, indoorBg: ["#262120", "#1f2329"], env: [0.8, 0.8],
  },
};

/** The active style's atmosphere (null for blocks). */
export function styleLook(): Look3D | null { return STYLED ? LOOKS[STYLE as "toon"] : null; }

/** Renderer settings (called from the Game constructor). */
export function styleRenderer(renderer: THREE.WebGLRenderer, cam: THREE.Camera, q: "high" | "low") {
  const L = styleLook();
  if (!L) return;
  renderer.toneMapping = L.toneMapping;
  renderer.toneMappingExposure = L.exposure;
  renderer.shadowMap.type = THREE.PCFShadowMap; // soft edges come from shadow.radius (PCFSoft is gone in r186)
  if (IS_TOON && q === "high") cam.layers.enable(OUTLINE_LAYER); else cam.layers.disable(OUTLINE_LAYER);
}

export interface StyleFx {
  zone(indoor: boolean, warm: boolean): void;
  frame(player: THREE.Vector3, indoor: boolean): void;
  quality(q: "high" | "low"): void;
}

function skyMaterial(L: Look3D, sunDir: THREE.Vector3) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, toneMapped: false,
    uniforms: {
      top: { value: new THREE.Color(L.sky[0]) }, mid: { value: new THREE.Color(L.sky[1]) }, bottom: { value: new THREE.Color(L.sky[2]) },
      sunDir: { value: sunDir.clone() }, glow: { value: new THREE.Color(IS_STORY ? "#ffe3b8" : IS_TOON ? "#fff6d8" : "#fff1d6") }, uTime: { value: 0 },
    },
    defines: { CLOUDS: IS_REAL ? 1 : 0 },
    vertexShader: "varying vec3 vP; void main(){ vP = (modelMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.); }",
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 glow; uniform float uTime; varying vec3 vP;
      float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hsh(i), hsh(i+vec2(1,0)), f.x), mix(hsh(i+vec2(0,1)), hsh(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec3 d = normalize(vP - cameraPosition);
        float h = d.y;
        vec3 c = h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.78, h)) : mix(bottom, mid, smoothstep(-0.04, 0.12, h));
        float sd = max(dot(d, normalize(sunDir)), 0.0);
        c = mix(c, glow, pow(sd, 6.0) * ${IS_STORY ? "0.45" : "0.3"} * smoothstep(-0.05, 0.1, h));
        #if CLOUDS
          if (h > 0.0) {
            vec2 uv = d.xz / (h + 0.18) * 1.6 + vec2(uTime * 0.006, uTime * 0.002);
            float n = vn(uv) * 0.5 + vn(uv * 2.1) * 0.27 + vn(uv * 4.3) * 0.15 + vn(uv * 8.7) * 0.08;
            float cov = smoothstep(0.52, 0.8, n) * smoothstep(0.0, 0.18, h);
            vec3 cloud = mix(vec3(0.78, 0.82, 0.88), vec3(1.0), smoothstep(0.52, 0.9, n));
            c = mix(c, cloud, cov * 0.9);
          }
        #endif
        c += pow(sd, 900.0) * vec3(1.0, 0.95, 0.85) * 1.5;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

/** Environment for reflections (realistic): the sky gradient with a sun, and a warm room indoors. */
function makeEnvironments(renderer: THREE.WebGLRenderer, L: Look3D, sunDir: THREE.Vector3) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { top: { value: new THREE.Color(L.sky[0]) }, mid: { value: new THREE.Color(L.sky[1]) }, bottom: { value: new THREE.Color(L.sky[2]) }, ground: { value: new THREE.Color("#6d6a58") }, sunDir: { value: sunDir } },
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }",
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform vec3 ground; uniform vec3 sunDir; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float h = d.y;
        vec3 c = h > 0.0 ? mix(bottom, mix(mid, top, smoothstep(0.1, 0.8, h)), smoothstep(0.0, 0.12, h)) : mix(bottom * 0.8, ground, smoothstep(0.0, -0.25, h));
        c += vec3(1.0, 0.92, 0.8) * pow(max(dot(d, normalize(sunDir)), 0.0), 400.0) * 40.0;
        gl_FragColor = vec4(c, 1.0); }`,
  });
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), m));
  const outdoor = pmrem.fromScene(envScene, 0.02).texture;
  const room = new RoomEnvironment();
  const indoor = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();
  return { outdoor, indoor };
}

/** Sets up the style's sky, lights and environment. Returns null for "blocks". */
export function createStyleFx(o: { renderer: THREE.WebGLRenderer; scene: THREE.Scene; hemi: THREE.HemisphereLight; sun: THREE.DirectionalLight; sky: THREE.Mesh; cam: THREE.Camera }): StyleFx | null {
  const L = styleLook();
  if (!L) return null;
  const { scene, hemi, sun, sky, cam, renderer } = o;
  const off = new THREE.Vector3(...L.sun[3]);
  const sunDir = off.clone().normalize();
  const skyMat = skyMaterial(L, sunDir);
  sky.material = skyMat;
  if (IS_REAL) sky.onBeforeRender = () => { skyMat.uniforms.uTime.value = performance.now() / 1000; };
  hemi.color.set(L.hemi[0]);
  hemi.groundColor.set(L.hemi[1]);
  sun.color.set(L.sun[0]);
  sun.shadow.radius = L.shadow.radius;
  sun.shadow.intensity = L.shadow.intensity;
  if (IS_REAL) { sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.035; }
  const env = IS_REAL ? makeEnvironments(renderer, L, sunDir) : null;
  const fog = new THREE.Fog(L.fog[0], L.fog[1], L.fog[2]);
  return {
    zone(indoor, warm) {
      scene.fog = indoor ? null : fog;
      scene.background = indoor ? new THREE.Color(warm ? L.indoorBg[0] : L.indoorBg[1]) : null;
      hemi.intensity = indoor ? L.hemi[3] : L.hemi[2];
      sun.intensity = indoor ? L.sun[2] : L.sun[1];
      if (env) {
        scene.environment = indoor ? env.indoor : env.outdoor;
        scene.environmentIntensity = indoor ? L.env[1] : L.env[0];
      }
    },
    frame(p, indoor) {
      if (indoor) {
        // light comes in over the low front wall, so the back wall is lit and the side walls cast no big shadows
        sun.position.set(p.x - 10, 34, p.z + 30);
        sun.target.position.set(p.x, 0, p.z - 2);
      } else {
        sun.position.set(p.x + off.x, off.y, p.z + off.z);
        sun.target.position.set(p.x, 0, p.z);
      }
    },
    quality(q) {
      if (IS_TOON && q === "high") cam.layers.enable(OUTLINE_LAYER); else cam.layers.disable(OUTLINE_LAYER);
    },
  };
}
