// Trial looks for the 3D world (Settings → "Pasaulio stilius"):
//   blocks    – the original look. Every hook in this file is a no-op for it, so its code path is unchanged.
//   toon      – "Animacija": bright cartoon universe, toon shading, rounded shapes, dark outlines.
//   storybook – "Iliustracija": the illustrated scenes' semi-flat look (teal, warm orange, cream, wood).
//   realistic – "Tikroviškas": a "realistic cartoon" (PBR materials, filmic light, reflections).
// The style is read once; the settings panel reloads the page when it changes.
import * as THREE from "three";
import { useStore, type WorldStyle } from "../state/store";

export type { WorldStyle };
const STYLES: WorldStyle[] = ["blocks", "toon", "storybook", "realistic"];

function readStyle(): WorldStyle {
  try {
    // "?style=toon" etc. in the address overrides the saved setting (handy for comparing styles in tabs);
    // picking a style in Settings reloads without it
    const q = typeof location !== "undefined" ? new URLSearchParams(location.search).get("style") : null;
    if (q && STYLES.includes(q as WorldStyle)) return q as WorldStyle;
    const s = useStore.getState().settings.worldStyle;
    return STYLES.includes(s) ? s : "blocks";
  } catch { return "blocks"; }
}

/** The active world style (fixed for the lifetime of the page). */
export const STYLE: WorldStyle = readStyle();
/** True for the trial styles (everything except the original "blocks"). */
export const STYLED = STYLE !== "blocks";
export const IS_TOON = STYLE === "toon";
export const IS_STORY = STYLE === "storybook";
export const IS_REAL = STYLE === "realistic";

/** Outline meshes live on this layer only; the camera shows it when outlines are on. */
export const OUTLINE_LAYER = 1;

// ---------------------------------------------------------------------------- colour grading

/** The storybook palette, taken from the illustrated scenes (public/scenes). */
const STORY_PALETTE = [
  "#1f4e53", "#2f6b6e", "#4d8c8c", "#8fbcb5", "#c9ddd6", // teals
  "#d9804a", "#b8613a", "#eab089", "#d6a64a",            // warm orange, mustard
  "#f4ead8", "#fbf5ea", "#e6d3b0",                       // creams, sand
  "#b8804f", "#7a5237", "#5a3d2b",                       // warm woods
  "#8fa878", "#6f8458", "#4f6b4a",                       // sage, olive
  "#b5584a", "#d58c86", "#7d5a6e",                       // brick, rose, plum
  "#2b3d57", "#6f90a8", "#55606b", "#34363b", "#b9b1a4", // navy, dusty blue, slate, charcoal, stone
].map((h) => new THREE.Color(h).convertLinearToSRGB());

const gradeCache = new Map<string, THREE.Color>();
const _hsl = { h: 0, s: 0, l: 0 };

/** The colour a hex takes in the active style (a new Color; blocks returns it unchanged). */
export function grade(hex: string): THREE.Color {
  const key = STYLE + hex;
  const hit = gradeCache.get(key);
  if (hit) return hit.clone();
  const c = new THREE.Color(hex);
  if (STYLE === "toon") {
    c.getHSL(_hsl);
    if (_hsl.s > 0.08) _hsl.s = Math.min(1, _hsl.s * 1.14 + 0.04);
    _hsl.l = 0.03 + _hsl.l * 0.97;
    c.setHSL(_hsl.h, _hsl.s, _hsl.l);
  } else if (STYLE === "storybook") {
    c.getHSL(_hsl);
    _hsl.s *= 0.84;
    _hsl.l = 0.05 + _hsl.l * 0.93; // no pure blacks in the illustrations
    c.setHSL(_hsl.h, _hsl.s, _hsl.l);
    // pull 30 % of the way towards the nearest palette colour (in sRGB)
    const s = c.clone().convertLinearToSRGB();
    let best = STORY_PALETTE[0], bd = Infinity;
    for (const p of STORY_PALETTE) {
      const d = (p.r - s.r) ** 2 * 0.8 + (p.g - s.g) ** 2 + (p.b - s.b) ** 2 * 0.7;
      if (d < bd) { bd = d; best = p; }
    }
    s.lerp(best, 0.3);
    // warm the light: a little cream in everything
    s.lerp(new THREE.Color(0.98, 0.93, 0.84), 0.06);
    c.copy(s).convertSRGBToLinear();
  } else if (STYLE === "realistic") {
    c.getHSL(_hsl);
    _hsl.s = Math.min(1, _hsl.s * 1.04); // filmic tone mapping already mutes colours a little
    _hsl.l *= 0.95;
    c.setHSL(_hsl.h, _hsl.s, _hsl.l);
  }
  gradeCache.set(key, c.clone());
  return c;
}
export function gradeHex(hex: string): string { return "#" + grade(hex).getHexString(); }

// ---------------------------------------------------------------------------- shading helpers

const gradients = new Map<string, THREE.DataTexture>();
/** A toon ramp: one texel per tone (nearest filtering gives hard steps). */
export function toonRamp(steps: number[]): THREE.DataTexture {
  const key = steps.join(",");
  let t = gradients.get(key);
  if (!t) {
    const data = new Uint8Array(steps.length * 4);
    steps.forEach((v, i) => { const b = Math.round(v * 255); data.set([b, b, b, 255], i * 4); });
    t = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    gradients.set(key, t);
  }
  return t;
}
/** Toon: three clear tones. Storybook: soft, few tones. */
export const TOON_RAMP = [0.5, 0.8, 1.0];
export const STORY_RAMP = [0.66, 0.8, 0.92, 1.0];
export function styleRamp() { return toonRamp(IS_TOON ? TOON_RAMP : STORY_RAMP); }

/** Material features injected into the built-in shaders (kept in one place so programs are shared). */
interface Inject { grain?: number; pbrVertex?: boolean; groundDetail?: boolean }
const injected = new WeakMap<THREE.Material, Inject>();

function applyInjections(m: THREE.Material, inj: Inject) {
  injected.set(m, inj);
  m.onBeforeCompile = (sh) => {
    let vs = sh.vertexShader, fs = sh.fragmentShader;
    if (inj.pbrVertex) {
      vs = vs.replace("#include <common>", "#include <common>\nattribute vec2 aPbr;\nvarying vec2 vPbr;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvPbr = aPbr;");
      fs = fs.replace("#include <common>", "#include <common>\nvarying vec2 vPbr;")
        .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = vPbr.x;")
        .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = vPbr.y;");
    }
    if (inj.groundDetail) {
      // fine world-space variation so the low-resolution ground texture does not look smeared up close
      vs = vs.replace("#include <common>", "#include <common>\nvarying vec3 vGW;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvGW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      fs = fs.replace("#include <common>", `#include <common>
varying vec3 vGW;
float gHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), f.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), f.x), f.y); }`)
        .replace("#include <map_fragment>", `#include <map_fragment>
{ float gd = gNoise(vGW.xz * 1.3) * 0.55 + gNoise(vGW.xz * 6.0) * 0.3 + gNoise(vGW.xz * 23.0) * 0.15;
  diffuseColor.rgb *= 0.86 + gd * 0.26; }`);
    }
    if (inj.grain) {
      // static paper grain in screen space (the illustrations have a fine grain texture)
      fs = fs.replace("#include <dithering_fragment>", `#include <dithering_fragment>
{ float gn = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
  gl_FragColor.rgb *= 1.0 + (gn - 0.5) * ${inj.grain.toFixed(3)}; }`);
    }
    sh.vertexShader = vs; sh.fragmentShader = fs;
  };
  const key = `inj:${inj.grain ?? 0}:${inj.pbrVertex ? 1 : 0}:${inj.groundDetail ? 1 : 0}`;
  m.customProgramCacheKey = () => key;
}

/** Adds the storybook paper grain to a material (no-op in other styles). */
export function withGrain<T extends THREE.Material>(m: T, amount = 0.05): T {
  if (IS_STORY) applyInjections(m, { ...(injected.get(m) ?? {}), grain: amount });
  return m;
}
/** World-space detail noise on a (ground) material. */
export function withGroundDetail<T extends THREE.Material>(m: T): T {
  applyInjections(m, { ...(injected.get(m) ?? {}), groundDetail: true });
  return m;
}

// ---------------------------------------------------------------------------- world materials

export interface MatOpts { emissive?: string; flat?: boolean; transparent?: number; side?: THREE.Side }

/** The style's basic surface for a colour (MeshToon for toon/storybook, MeshStandard for realistic). */
export function surface(color: THREE.Color, o: { emissive?: THREE.Color; transparent?: number; side?: THREE.Side; flat?: boolean; map?: THREE.Texture; roughness?: number; metalness?: number } = {}): THREE.Material {
  const common: THREE.MeshToonMaterialParameters = { color, map: o.map ?? null };
  if (o.emissive) common.emissive = o.emissive;
  if (o.transparent !== undefined) { common.transparent = true; common.opacity = o.transparent; common.depthWrite = false; }
  if (o.side !== undefined) common.side = o.side;
  if (IS_REAL) {
    return new THREE.MeshStandardMaterial({ ...common, roughness: o.roughness ?? 0.8, metalness: o.metalness ?? 0, flatShading: !!o.flat });
  }
  const m = new THREE.MeshToonMaterial({ ...common, gradientMap: styleRamp() });
  return withGrain(m);
}

const styledCache = new Map<string, THREE.Material>();
/** mat() for the trial styles: the same colour and options, graded and shaded the style's way. */
export function styledMat(color: string, opts: MatOpts): THREE.Material {
  const key = color + JSON.stringify(opts);
  let m = styledCache.get(key);
  if (!m) {
    m = surface(grade(color), {
      emissive: opts.emissive ? grade(opts.emissive).multiplyScalar(IS_REAL ? 0.8 : 0.9) : undefined,
      transparent: opts.transparent, side: opts.side, flat: opts.flat,
    });
    m.userData.src = { color, opts };
    styledCache.set(key, m);
  }
  return m;
}

// ---------------------------------------------------------------------------- per-surface refinement

type Kind = "wall" | "trim" | "glass" | "roof" | "roofFlat" | "fabric" | "stone" | "wood" | "metal" | "paint" | "rubber"
  | "mirror" | "rock" | "foliage" | "water" | "ceramic" | "plaster" | "polished" | "glow" | "plain";

/** What a merged mesh is made of, guessed from its Merger key (town.ts / interiors.ts). */
export function kindFor(key: string, m: THREE.Material): Kind {
  const src = m.userData.src as { color: string; opts: MatOpts } | undefined;
  const glowing = !!src?.opts.emissive;
  if (src?.opts.transparent !== undefined) return "glass";
  if (key === "mirror") return "mirror";
  if (/^lamp-glass$|^lamp-shade$|^bulbs$|^candle$|^lighthouse-top$|^taxi-sign$|^cross$|screen|^win-/.test(key)) return glowing ? "glow" : "plain";
  if (/glass|-win$/.test(key)) return "glass";
  if (/^door-/.test(key)) return glowing ? "glass" : "wood";
  if (/-walls$/.test(key)) return "wall";
  if (/^trim-|^office-band$|^front-top$|^baseboard$/.test(key)) return "trim";
  if (/^roof-flat$|^roof-box$/.test(key)) return "roofFlat";
  if (/^roof-|^porch-roof$|^gazebo-roof$|^canopy$|^stall-roof/.test(key)) return key.startsWith("roof-") ? "roof" : "paint";
  if (/awning|^rug-|^sofa-|^towel$|^cloth-|^umbrella$|^flag$|^fitting|^salon-chair$|^seats$|^queue-rope$|^rope$|^chair-office$/.test(key)) return "fabric";
  if (/^columns$|^steps$|^pediment$|^plinth$|^statue$|^fountain$|^lighthouse$|^lighthouse-red$|^porch$|^tower|^chimney$|^pier-post$/.test(key)) return "stone";
  if (/^counter-top|^desk$|^table-|^party-table$|^sink$|^kitchen$/.test(key)) return key.startsWith("table-") || key === "party-table" ? "wood" : "polished";
  if (/^bench$|^pier$|^stall-table$|^sleeper$|^chair|^counter-|^shelf-|^host-stand$|^kitchen-door$|^fence$|^gate-post$|^coat-rack$|^boxes$|^parcel$|^planter$|^board$|^mailbox-post$|^po-wall$|^form-desk$|^coffee-table$|^door-rita$|^door-2b$/.test(key)) return "wood";
  if (/^lamp$|^sign-pole$|canopy-post|^rack$|^rail$|^queue-post$|^rope-post$|^flagpole$|^hydrant$|^trash$|^bench-leg$|^mailbox|^table-leg$|^desk-leg$|^arch$|^scale$|^atm$|^booth$|^elevator|^pump$|^grill$|^espresso$|^register$|^coffee-machine|^printer$|^monitor$|^key|^bell$|^conveyor$|^bin$|^carousel|^salon-base$|^umbrella-pole$|^boat-mast$|^radiator$|^stove$|^tv$|^lamp-cord$|^po-box$/.test(key)) return "metal";
  if (/^car-|^taxi$|^taxi-check$|^boat-|^train$|^train-stripe$|^bus$|^plane|^gas-canopy|^bus-shelter$|^stop$|^balloon-/.test(key)) return "paint";
  if (/^wheel$|^mat$|^exit-mat$/.test(key)) return "rubber";
  if (/^rocks$|^hills$/.test(key)) return "rock";
  if (/^leaves$|^plants$|^goods-|^flowers$|^pastry$|^lasagna$/.test(key)) return "foliage";
  if (/water/.test(key)) return "water";
  if (/^pot$|^plate$|^vase$/.test(key)) return "ceramic";
  if (/^wall$|^front$|^divider$|^partition$|^fitting-wall$/.test(key)) return "plaster";
  return "plain";
}

const refined = new Map<string, THREE.Material>();
/** The material a merged mesh actually uses in the active style (called from Merger.add). */
export function refineForKey(key: string, m: THREE.Material): THREE.Material {
  if (!STYLED || !m.userData.src) return m;
  const kind = kindFor(key, m);
  const texKind = IS_REAL ? textureKindFor(key, kind) : null;
  const rkey = m.uuid + ":" + kind + ":" + (texKind ?? "");
  let r = refined.get(rkey);
  if (r) return r;
  const src = m.userData.src as { color: string; opts: MatOpts };
  const base = m as THREE.MeshStandardMaterial | THREE.MeshToonMaterial;
  if (IS_REAL) {
    const P: Record<Kind, [number, number, number?]> = { // roughness, metalness, envMapIntensity
      wall: [0.88, 0], trim: [0.55, 0.05], glass: [0.06, 0.35, 1.6], roof: [0.85, 0], roofFlat: [0.95, 0], fabric: [0.95, 0],
      stone: [0.55, 0], wood: [0.62, 0], metal: [0.42, 0.6, 1.1], paint: [0.32, 0.35, 1.2], rubber: [0.92, 0], mirror: [0.04, 1, 1.4],
      rock: [0.92, 0], foliage: [0.8, 0], water: [0.08, 0.2, 1.4], ceramic: [0.45, 0], plaster: [0.9, 0], polished: [0.22, 0.05, 1.1],
      glow: [0.5, 0], plain: [0.75, 0],
    };
    const [rough, metal, env] = P[kind];
    const mm = new THREE.MeshStandardMaterial({
      color: kind === "glass" && !src.opts.transparent ? new THREE.Color("#2c4556").lerp(base.color, 0.25) : base.color.clone(),
      emissive: kind === "glow" ? base.emissive.clone() : new THREE.Color(0),
      roughness: rough, metalness: metal, envMapIntensity: env ?? 1,
      transparent: base.transparent, opacity: base.opacity, depthWrite: base.depthWrite, side: base.side,
      flatShading: !!src.opts.flat,
    });
    if (texKind) {
      const t = surfaceTexture(texKind);
      mm.map = t.tex; mm.bumpMap = t.tex; mm.bumpScale = t.bump;
      mm.userData.uvScale = t.scale;
    }
    r = mm;
  } else {
    // toon / storybook: only a few surfaces change
    if (kind === "glass" && !src.opts.transparent) {
      const c = IS_TOON ? new THREE.Color("#8fd3f5") : grade("#9fc4c6");
      r = surface(c, { emissive: IS_TOON ? new THREE.Color("#3a86b0").multiplyScalar(0.55) : grade("#4d7f86").multiplyScalar(0.5) });
    } else if (kind === "mirror") {
      r = surface(new THREE.Color("#e8f6ff"), { emissive: new THREE.Color("#7fa2b5") });
    } else r = m;
  }
  r.userData.src = src;
  refined.set(rkey, r);
  return r;
}

// ---------------------------------------------------------------------------- realistic surface textures

type TexKind = "brick" | "siding" | "plaster" | "stone" | "panel" | "shingle" | "wood" | "gravel";

/** Walls by building (realistic): what each facade is made of. */
const WALLS: Record<string, TexKind> = {
  hotel: "brick", visitor: "siding", museum: "stone", police: "plaster", pharmacy: "plaster", cafe: "brick", trattoria: "plaster",
  threads: "brick", salon: "plaster", bank: "stone", post: "brick", office: "panel", rental: "plaster", gas: "plaster",
  apartments: "brick", sophie: "siding", dan: "siding", house3: "siding", house4: "siding", house5: "siding", station: "brick",
  pier: "siding", terminal: "panel",
};

function textureKindFor(key: string, kind: Kind): TexKind | null {
  if (kind === "wall") return WALLS[key.replace(/-walls$/, "")] ?? "plaster";
  if (kind === "roof") return "shingle";
  if (kind === "roofFlat") return "gravel";
  if (kind === "plaster" && key === "wall") return "plaster";
  if (kind === "wood" && /^bench$|^pier$|^stall-table$|^table-|^party-table$|^counter-|^host-stand$/.test(key)) return "wood";
  return null;
}

const texCache = new Map<TexKind, { tex: THREE.Texture; scale: number; bump: number }>();
/** Small tiling canvas textures (greyscale detail multiplied by the surface colour). */
export function surfaceTexture(kind: TexKind) {
  const hit = texCache.get(kind);
  if (hit) return hit;
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const x = c.getContext("2d")!;
  let seed = kind.length * 7919;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const g = (v: number) => { const b = Math.round(Math.max(0, Math.min(1, v)) * 255); return `rgb(${b},${b},${b})`; };
  let scale = 2, bump = 1.2;
  const speckle = (n: number, lo: number, hi: number, size = 2) => {
    for (let i = 0; i < n; i++) { x.fillStyle = g(lo + rnd() * (hi - lo)); x.fillRect(rnd() * S, rnd() * S, size, size); }
  };
  if (kind === "brick") {
    x.fillStyle = g(0.8); x.fillRect(0, 0, S, S); // mortar
    const rows = 16, bw = 64, bh = S / rows;
    for (let r = 0; r < rows; r++) for (let k = -1; k < S / bw + 1; k++) {
      const ox = (r % 2) * bw / 2;
      x.fillStyle = g(0.88 + rnd() * 0.12);
      x.fillRect(k * bw + ox + 1.5, r * bh + 1.5, bw - 3, bh - 3);
    }
    speckle(900, 0.82, 1, 2);
    scale = 2; bump = 1.6;
  } else if (kind === "siding") {
    const rows = 12, bh = S / rows;
    for (let r = 0; r < rows; r++) {
      const grd = x.createLinearGradient(0, r * bh, 0, (r + 1) * bh);
      grd.addColorStop(0, g(0.8)); grd.addColorStop(0.18, g(0.97)); grd.addColorStop(1, g(1));
      x.fillStyle = grd; x.fillRect(0, r * bh, S, bh);
    }
    speckle(300, 0.9, 1, 1);
    scale = 2; bump = 1.4;
  } else if (kind === "plaster") {
    x.fillStyle = g(0.97); x.fillRect(0, 0, S, S);
    speckle(2500, 0.88, 1, 2);
    scale = 3; bump = 0.6;
  } else if (kind === "stone") {
    x.fillStyle = g(0.84); x.fillRect(0, 0, S, S);
    const rows = 6, bw = 96, bh = S / rows;
    for (let r = 0; r < rows; r++) for (let k = -1; k < S / bw + 1; k++) {
      const ox = (r % 2) * bw / 2;
      x.fillStyle = g(0.93 + rnd() * 0.07);
      x.fillRect(k * bw + ox + 1.5, r * bh + 1.5, bw - 3, bh - 3);
    }
    speckle(1400, 0.86, 1, 2);
    scale = 3; bump = 1.2;
  } else if (kind === "panel") {
    x.fillStyle = g(0.97); x.fillRect(0, 0, S, S);
    x.fillStyle = g(0.78);
    for (let i = 0; i <= S; i += 128) { x.fillRect(i - 1, 0, 2, S); x.fillRect(0, i - 1, S, 2); }
    speckle(500, 0.92, 1, 2);
    scale = 3.2; bump = 0.8;
  } else if (kind === "shingle") {
    x.fillStyle = g(0.62); x.fillRect(0, 0, S, S);
    const rows = 10, bh = S / rows, bw = 32;
    for (let r = 0; r < rows; r++) for (let k = -1; k < S / bw + 1; k++) {
      const ox = (r % 2) * bw / 2;
      const grd = x.createLinearGradient(0, r * bh, 0, (r + 1) * bh);
      const v = 0.86 + rnd() * 0.14;
      grd.addColorStop(0, g(v * 0.8)); grd.addColorStop(1, g(v));
      x.fillStyle = grd;
      x.fillRect(k * bw + ox + 1, r * bh + 1, bw - 2, bh - 2);
    }
    scale = 2.5; bump = 1.8;
  } else if (kind === "wood") {
    x.fillStyle = g(0.92); x.fillRect(0, 0, S, S);
    const planks = 8, ph = S / planks;
    for (let p = 0; p < planks; p++) {
      x.fillStyle = g(0.86 + rnd() * 0.12); x.fillRect(0, p * ph + 1, S, ph - 2);
      for (let i = 0; i < 14; i++) {
        x.strokeStyle = `rgba(0,0,0,${0.05 + rnd() * 0.07})`; x.lineWidth = 1;
        const y0 = p * ph + 2 + rnd() * (ph - 4);
        x.beginPath(); x.moveTo(0, y0);
        for (let s = 0; s <= S; s += 32) x.lineTo(s, y0 + Math.sin(s * 0.05 + i) * 1.5);
        x.stroke();
      }
    }
    scale = 1.2; bump = 0.8;
  } else { // gravel
    x.fillStyle = g(0.9); x.fillRect(0, 0, S, S);
    speckle(4000, 0.7, 1, 3);
    scale = 2; bump = 1.2;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  const out = { tex, scale, bump };
  texCache.set(kind, out);
  return out;
}

// ---------------------------------------------------------------------------- outlines (toon)

/** Keys of merged meshes that get an outline in the toon style (big, solid things only). */
const OUTLINED = /-walls$|^roof-(?!flat|box)|^trim-|^awning-(?!stripe)|^columns$|^pediment$|^canopy$|^terminal-canopy$|^tower|^plane|^balcony$|^porch$|^porch-roof$|^chimney$|^mailbox$|^planter$|^plants$|^table$|^umbrella$|^chair$|^atm$|^fountain$|^stall-table$|^stall-roof|^gazebo|^pier$|^lighthouse|^rocks$|^boat-|^taxi$|^car-|^bus-shelter$|^train$|^gas-canopy$|^pump$|^grill$|^party-table$|^bench$|^hydrant$|^trash$|^lamp$|^counter-(?!top)|^shelf-|^sofa-|^desk$|^host-stand$|^kitchen$|^fridge$|^carousel$|^booth$|^seats$|^partition$|^plinth$|^statue$|^sink$|^salon-chair$|^espresso$|^coffee-machine$|^printer$|^bus$|^pot$|^leaves$|^chair-|^board$|^mailbox-blue$|^steps$|^divider$|^form-desk$/;
export function wantsOutline(key: string) { return IS_TOON && OUTLINED.test(key); }

const outlineMats = new Map<string, THREE.MeshBasicMaterial>();
/** Inverted-hull outline material: back faces pushed out along `outlineNormal` (thicker far away). */
export function outlineMaterial(color: THREE.Color, thickness: number): THREE.MeshBasicMaterial {
  const key = color.getHexString() + ":" + thickness;
  let m = outlineMats.get(key);
  if (m) return m;
  m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.userData.outline = true;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uOutline = { value: thickness };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec3 outlineNormal;\nuniform float uOutline;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
{
  vec4 ow = modelMatrix * vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    ow = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
  #endif
  float od = distance(ow.xyz, cameraPosition);
  transformed += normalize(outlineNormal) * uOutline * clamp(od / 11.0, 0.75, 3.2);
}`);
  };
  m.customProgramCacheKey = () => "outline-hull";
  outlineMats.set(key, m);
  return m;
}

/** A darker, slightly cooler shade of a surface colour for its outline. */
export function outlineColorFor(c: THREE.Color): THREE.Color {
  return c.clone().multiplyScalar(0.22).lerp(new THREE.Color("#140f1f"), 0.45);
}

/** Smooth per-position normals for the outline hull (hard-edged boxes would crack otherwise). */
export function addOutlineNormals(g: THREE.BufferGeometry) {
  if (g.getAttribute("outlineNormal")) return;
  const p = g.attributes.position, n = g.attributes.normal;
  const acc = new Map<string, [number, number, number]>();
  const keys: string[] = new Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const k = Math.round(p.getX(i) * 500) + "," + Math.round(p.getY(i) * 500) + "," + Math.round(p.getZ(i) * 500);
    keys[i] = k;
    let a = acc.get(k);
    if (!a) { a = [0, 0, 0]; acc.set(k, a); }
    a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i);
  }
  const out = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const a = acc.get(keys[i])!;
    const l = Math.hypot(a[0], a[1], a[2]);
    if (l < 1e-5) { out[i * 3] = n.getX(i); out[i * 3 + 1] = n.getY(i); out[i * 3 + 2] = n.getZ(i); }
    else { out[i * 3] = a[0] / l; out[i * 3 + 1] = a[1] / l; out[i * 3 + 2] = a[2] / l; }
  }
  g.setAttribute("outlineNormal", new THREE.BufferAttribute(out, 3));
}

/** An outline twin of a mesh (same geometry), shown only on the outline layer. Add it as a child
 *  of the mesh (identity transform) so it follows the mesh around. */
export function makeOutline(mesh: THREE.Mesh, color: THREE.Color, thickness: number, hull?: THREE.BufferGeometry): THREE.Mesh {
  const geo = hull ?? mesh.geometry;
  addOutlineNormals(geo);
  let o: THREE.Mesh;
  const mat = outlineMaterial(color, thickness);
  if ((mesh as THREE.InstancedMesh).isInstancedMesh) {
    const im = mesh as THREE.InstancedMesh;
    const oi = new THREE.InstancedMesh(geo, mat, im.count);
    oi.instanceMatrix = im.instanceMatrix;
    oi.count = im.count;
    o = oi;
  } else o = new THREE.Mesh(geo, mat);
  o.name = mesh.name + "-outline";
  o.castShadow = false;
  o.receiveShadow = false;
  o.layers.set(OUTLINE_LAYER);
  return o;
}

// ---------------------------------------------------------------------------- vertex-coloured things

const vcMats = new Map<string, THREE.Material>();
/** One shared material for vertex-coloured meshes (characters, cars). Realistic meshes carry
 *  per-vertex roughness/metalness in an `aPbr` attribute. */
export function vertexColorMaterial(use: "prop" | "character" = "prop"): THREE.Material {
  let m = vcMats.get(use);
  if (m) return m;
  if (IS_REAL) {
    m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 1 });
    applyInjections(m, { pbrVertex: true });
  } else {
    const ramp = use === "character" ? (IS_TOON ? [0.64, 0.86, 1.0] : [0.74, 0.88, 1.0]) : IS_TOON ? TOON_RAMP : STORY_RAMP;
    m = withGrain(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp(ramp) }));
  }
  vcMats.set(use, m);
  return m;
}

// ---------------------------------------------------------------------------- misc

/** Box bevel radius for the active style (0 = keep the sharp box). */
export function bevelRadius(w: number, h: number, d: number): number {
  const m = Math.min(w, h, d);
  if (m < 0.18) return 0; // thin things (sills, panels, pickets) stay plain boxes: cheaper, and nobody sees it
  const r = IS_TOON ? Math.min(0.34, m * 0.22) : IS_STORY ? Math.min(0.2, m * 0.15) : Math.min(0.06, m * 0.1);
  return r < 0.012 ? 0 : r;
}
