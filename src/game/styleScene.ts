// Renderer, sky, light and atmosphere for the trial world styles (see style.ts). The original
// "blocks" look never calls into this file (createStyleFx returns null for it), unless the edition grades its light
// outdoors (theme.ts `light`: blocksGrade below; null in Maple Harbor).
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { STYLE, STYLED, IS_TOON, IS_STORY, IS_REAL, OUTLINE_LAYER } from "./style";
import { THEME } from "./world/theme";

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
  if (!L) return THEME.light ? blocksGrade(o, THEME.light) : null;
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

/** The sun's shadow pass draws every caster with one shared depth material, and three.js looks that material's program
 *  up again (its parameters and key built anew) each time the kind of mesh changes from one caster to the next: plain,
 *  instanced, instanced with colors, skinned, 8 to 11 times a frame outdoors. Each kind gets a depth material of its own
 *  here (the same shadows), once per zone, when everything in it is in the scene: 0.2–0.3 ms less a frame (theme.ts
 *  `lean`). Materials that cut their shadow with a texture keep three.js's own handling. (Made on the first call, never
 *  in Maple Harbor: a new material draws random numbers for its uuid.) */
let DEPTH: { inst: THREE.MeshDepthMaterial; instColor: THREE.MeshDepthMaterial; skin: THREE.MeshDepthMaterial } | null = null;
function depthByKind(scene: THREE.Object3D) {
  DEPTH ??= { inst: new THREE.MeshDepthMaterial(), instColor: new THREE.MeshDepthMaterial(), skin: new THREE.MeshDepthMaterial() };
  const D = DEPTH;
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.castShadow || m.customDepthMaterial) return;
    const mat = m.material as THREE.Material & { displacementMap?: THREE.Texture | null };
    if (Array.isArray(m.material) || mat.alphaTest > 0 || mat.alphaToCoverage || mat.clippingPlanes?.length || mat.displacementMap) return;
    const inst = o as THREE.InstancedMesh;
    if (inst.isInstancedMesh) m.customDepthMaterial = inst.instanceColor ? D.instColor : D.inst;
    else if ((o as THREE.SkinnedMesh).isSkinnedMesh) m.customDepthMaterial = D.skin;
  });
}

/** The "blocks" look's light graded outdoors for the edition's town (theme.ts `light`): a warmer sun, a little more
 *  exposure (the tone curve greys bright walls less), a bluer zenith over a warmer horizon, the fog and the hemisphere in
 *  the same key. Indoors, the game's own values come back (Game.ts sets the intensities; this keeps its colors). The sun
 *  keeps following the player as Game.ts places it. */
function blocksGrade(o: { renderer: THREE.WebGLRenderer; scene: THREE.Scene; hemi: THREE.HemisphereLight; sun: THREE.DirectionalLight; sky: THREE.Mesh }, g: NonNullable<typeof THEME.light>): StyleFx {
  const { renderer, scene, hemi, sun, sky } = o;
  // (graphics round 6, `late`) the painted dome instead of the plain gradient
  const late = g.late;
  const dome = late ? skyDome(g, late) : null;
  if (dome) sky.material = dome;
  const u = (sky.material as THREE.ShaderMaterial).uniforms;
  const keep = { sun: sun.color.clone(), hemi: hemi.color.clone(), ground: hemi.groundColor.clone(), exposure: renderer.toneMappingExposure };
  const fog = new THREE.Fog(g.fog, 110, 420);
  // (late) the shadow's box shortened across the sun's way in the proportion the lower sun stretches its footprint on
  // the ground (Game.ts's sun is 54° up), so the shadow pass draws no more casters than at noon
  const sc = sun.shadow.camera as THREE.OrthographicCamera, box = { top: sc.top, bottom: sc.bottom };
  const k = late ? 0.9 * Math.sin(Math.atan2(late.at[1], Math.hypot(late.at[0], late.at[2]))) / Math.sin(Math.atan2(70, 50)) : 1;
  const shadowBox = (f: number) => { sc.top = box.top * f; sc.bottom = box.bottom * f; sc.updateProjectionMatrix(); };
  return {
    zone(indoor) {
      if (THEME.lean) depthByKind(scene);
      if (late) shadowBox(indoor ? 1 : k);
      if (indoor) {
        renderer.toneMappingExposure = keep.exposure;
        sun.color.copy(keep.sun); hemi.color.copy(keep.hemi); hemi.groundColor.copy(keep.ground);
        return;
      }
      renderer.toneMappingExposure = g.exposure;
      sun.color.set(g.sun); hemi.color.set(g.hemi[0]); hemi.groundColor.set(g.hemi[1]);
      if (late) { sun.intensity = late.sunI; hemi.intensity = late.hemiI; }
      u.top.value.set(g.sky[0]); u.mid.value.set(g.sky[1]); u.bottom.value.set(g.sky[2]);
      scene.fog = fog;
    },
    frame(p, indoor) {
      if (!late || indoor) return;
      sun.position.set(p.x + late.at[0], late.at[1], p.z + late.at[2]);
      dome!.uniforms.uTime.value = performance.now() / 1000;
    },
    quality() {},
  };
}

/** (theme.ts `light.late`, graphics round 6) The edition's sky dome for a late Caribbean afternoon: the zenith's blue
 *  down to a warm horizon, the low sun's halo and its disc where it shines from, and a band of fair-weather cumulus
 *  round the horizon painted once into a small texture (white tops, `clouds[1]`'s undersides, warmer towards the sun)
 *  that drifts very slowly. One texture lookup a sky pixel; the same one mesh and draw call as the plain dome. */
function skyDome(g: NonNullable<typeof THEME.light>, late: NonNullable<NonNullable<typeof THEME.light>["late"]>) {
  const sunDir = new THREE.Vector3(...late.at).normalize();
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(g.sky[0]) }, mid: { value: new THREE.Color(g.sky[1]) }, bottom: { value: new THREE.Color(g.sky[2]) },
      glow: { value: new THREE.Color(late.glow) }, lit: { value: new THREE.Color(late.clouds[0]) }, shade: { value: new THREE.Color(late.clouds[1]) },
      sunDir: { value: sunDir }, clouds: { value: cloudBand() }, uTime: { value: 0 },
    },
    vertexShader: "varying vec3 vP; void main(){ vP = (modelMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.); }",
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform vec3 glow; uniform vec3 lit; uniform vec3 shade;
      uniform vec3 sunDir; uniform sampler2D clouds; uniform float uTime; varying vec3 vP;
      void main(){
        vec3 d = normalize(vP - cameraPosition); float h = d.y;
        vec3 c = h > 0.15 ? mix(mid, top, smoothstep(0.15, 0.7, h)) : mix(bottom, mid, smoothstep(-0.05, 0.15, h));
        float s = max(dot(d, sunDir), 0.0);
        c += glow * (pow(s, 5.0) * 0.32 + pow(s, 48.0) * 0.55);
        float u = atan(d.z, d.x) * 0.31830989 + uTime * 0.0008;
        vec4 k = texture2D(clouds, vec2(u, clamp(h * 3.0, 0.0, 1.0)));
        vec3 cc = mix(shade, lit, k.g) + glow * pow(s, 3.0) * 0.45 * k.g;
        c = mix(c, cc, k.a * smoothstep(-0.01, 0.025, h));
        c = mix(c, vec3(1.0, 0.96, 0.86), smoothstep(0.9985, 0.9993, s) * (1.0 - k.a));
        gl_FragColor = vec4(c, 1.0); }`,
  });
}

/** The cumulus round the horizon (skyDome): 2048 × 512, the bottom row the horizon and the top row a third of the
 *  way up the sky, wrapping round. Alpha is the cloud, green how lit it is (1 on the tops, 0 on the flat bases).
 *  Drawn with the same random numbers every time; it goes twice round the sky (sharper on a phone). */
function cloudBand() {
  const W = 2048, H = 512, cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const main = cv.getContext("2d")!;
  // (each cloud drawn on a scratch canvas, its base cut flat there, then laid over the others)
  const tmp = document.createElement("canvas");
  tmp.width = W; tmp.height = H;
  let x = tmp.getContext("2d")!;
  let seed = 9173;
  const r = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const puff = (cx: number, cy: number, rr: number, g: number, a: number, soft = 0.93) => {
    for (const ox of [-W, 0, W]) {
      const gr = x.createRadialGradient(cx + ox, cy, rr * 0.1, cx + ox, cy, rr);
      gr.addColorStop(0, `rgba(0,${g},0,${a})`); gr.addColorStop(soft, `rgba(0,${g},0,${a})`); gr.addColorStop(1, `rgba(0,${g},0,0)`);
      x.fillStyle = gr; x.beginPath(); x.arc(cx + ox, cy, rr, 0, Math.PI * 2); x.fill();
    }
  };
  // the cumulus in clusters with sky between them: the far ones low and flat on the horizon, nearer ones bigger and
  // higher; each a shaded flat base, then the lit heaped tops
  for (let i = 0; i < 17; i++) {
    const cx = (i + r() * 0.6) * W / 17, near = r() * r() * 0.8, w = 45 + near * 170 + r() * 35, base = H - 4 - near * 150, hh = w * (0.32 + r() * 0.18);
    const n = 4 + Math.floor(r() * 4);
    x.clearRect(0, 0, W, H);
    for (let k = 0; k < n; k++) puff(cx + (k / (n - 1) - 0.5) * w * 1.5, base - r() * hh * 0.15, w * (0.22 + r() * 0.1), 70, 1);
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1) - 0.5;
      puff(cx + t * w * 1.25 + (r() - 0.5) * 10, base - hh * (0.25 + (0.5 - Math.abs(t)) * 1.1) - r() * hh * 0.2, w * (0.22 + r() * 0.14), 255, 1);
    }
    // the base cut flat (a cumulus sits on a level line)
    x.save(); x.globalCompositeOperation = "destination-out"; x.fillStyle = "#000";
    for (const ox of [-W, 0, W]) x.fillRect(cx + ox - w * 1.2, base + w * 0.08, w * 2.4, 400);
    x.restore();
    main.drawImage(tmp, 0, 0);
  }
  x = main;
  // thin streaks higher up
  for (let i = 0; i < 16; i++) {
    const cx = r() * W, cy = 60 + r() * 200, len = 120 + r() * 240;
    for (let k = 0; k < 10; k++) puff(cx + k * len / 10, cy + Math.sin(k * 0.8) * 5, 16 + r() * 12, 235, 0.25, 0.3);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}
