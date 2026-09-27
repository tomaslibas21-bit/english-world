// World pieces that look different in the trial styles (see ../style.ts): ground colours and
// details, the sea, trees, bushes, clouds, interior floors and the passing cars. Nothing here is
// used by the original "blocks" style.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { STYLE, IS_TOON, IS_STORY, IS_REAL, grade, gradeHex, surface, toonRamp, withGrain, withGroundDetail, makeOutline, outlineColorFor } from "../style";
import { ROADS, SIDEWALK, SEA_Z } from "./layout";
import { chamferBox, blobCluster, lumpySphere, paint } from "./shapes";
import { rand } from "./util";
import { styleLook } from "../styleScene";

// ---------------------------------------------------------------------------- ground

export interface GroundPalette {
  grass: string; grassA: string; grassB: string; beach: [string, string, string]; park: string; path: string;
  pond: string; pondEdge: string; plaza: string; plazaLines: string; plazaCircle: string; lot: string; gasLot: string;
  sidewalk: string; sidewalkInner: string; road: string; centerLine: string; edgeLine: string; crosswalk: string;
  pierPath: string; footprint: string;
}

/** The original colours (blocks). */
export const GROUND_BLOCKS: GroundPalette = {
  grass: "#8fc66a", grassA: "rgba(120,176,84,0.22)", grassB: "rgba(170,210,120,0.18)", beach: ["#e9d9b0", "#f1e3bd", "#d8cf98"],
  park: "#9bd070", path: "#e6d8b8", pond: "#5fb4c9", pondEdge: "#d9cfae", plaza: "#e8dcc3", plazaLines: "rgba(160,140,110,0.35)",
  plazaCircle: "rgba(200,120,80,0.25)", lot: "#d9d4c7", gasLot: "#6a6f75", sidewalk: "#d9d3c5", sidewalkInner: "#e4dfd2",
  road: "#5b6067", centerLine: "#f2c84b", edgeLine: "rgba(255,255,255,0.75)", crosswalk: "rgba(255,255,255,0.88)",
  pierPath: "#b8895a", footprint: "rgba(40,50,40,0.18)",
};

const GROUND: Record<string, GroundPalette> = {
  toon: {
    grass: "#7ccb57", grassA: "rgba(96,176,70,0.25)", grassB: "rgba(150,220,100,0.22)", beach: ["#f5e2a8", "#fbeec2", "#f0d890"],
    park: "#8bd65f", path: "#f4e3bd", pond: "#46c2dc", pondEdge: "#f4e8c8", plaza: "#f6e6c6", plazaLines: "rgba(200,160,110,0.35)",
    plazaCircle: "rgba(240,140,90,0.3)", lot: "#e6e0d2", gasLot: "#6c7384", sidewalk: "#e9e1d0", sidewalkInner: "#f6f0e2",
    road: "#5f6678", centerLine: "#ffd23f", edgeLine: "rgba(255,255,255,0.85)", crosswalk: "rgba(255,255,255,0.95)",
    pierPath: "#c99464", footprint: "rgba(40,70,40,0.16)",
  },
  storybook: {
    grass: "#a7b986", grassA: "rgba(125,145,100,0.2)", grassB: "rgba(196,204,150,0.2)", beach: ["#ead9b6", "#f2e5c8", "#e2cfa4"],
    park: "#b0c28e", path: "#efe1c4", pond: "#7aa7aa", pondEdge: "#eadcbe", plaza: "#eee0c4", plazaLines: "rgba(150,120,90,0.25)",
    plazaCircle: "rgba(210,130,80,0.22)", lot: "#e2d7c2", gasLot: "#737a7d", sidewalk: "#ddd3c0", sidewalkInner: "#ebe2d0",
    road: "#7d8487", centerLine: "#e7bf73", edgeLine: "rgba(250,244,232,0.7)", crosswalk: "rgba(250,244,232,0.85)",
    pierPath: "#b98a5c", footprint: "rgba(70,60,40,0.14)",
  },
  realistic: {
    grass: "#6f9748", grassA: "rgba(80,120,50,0.3)", grassB: "rgba(140,170,90,0.22)", beach: ["#d8c69c", "#e3d3ad", "#cdbd8c"],
    park: "#6d9c45", path: "#cdbb98", pond: "#3d7d90", pondEdge: "#b9ad90", plaza: "#cbbfa8", plazaLines: "rgba(90,80,65,0.4)",
    plazaCircle: "rgba(150,95,70,0.25)", lot: "#b9b4aa", gasLot: "#55595e", sidewalk: "#b3ada3", sidewalkInner: "#c4beb3",
    road: "#46494e", centerLine: "#e2b53c", edgeLine: "rgba(235,235,230,0.8)", crosswalk: "rgba(235,235,230,0.85)",
    pierPath: "#8f6c4a", footprint: "rgba(30,35,30,0.25)",
  },
};
export function groundPalette(): GroundPalette { return GROUND[STYLE] ?? GROUND_BLOCKS; }

/** Extra painting on the ground canvas for the trial styles (after the normal map is drawn). */
export function groundExtras(x: CanvasRenderingContext2D, toC: (wx: number, wz: number) => [number, number], ppm: number) {
  const r = rand(99);
  const W = x.canvas.width, H = x.canvas.height;
  let img: Uint8ClampedArray | null = null; // read back once (per-pixel reads would be very slow)
  const onGrass = (px: number, pz: number) => {
    if (!img) img = x.getImageData(0, 0, W, H).data;
    const i = ((pz | 0) * W + (px | 0)) * 4;
    return img[i + 1] > img[i] + 12 && img[i + 1] > img[i + 2] + 12; // greenish
  };
  if (IS_TOON) {
    // tiny flowers in the grass
    const cols = ["#ffffff", "#ffe066", "#ff9fb2", "#ffd6a5"];
    for (let i = 0; i < 2600; i++) {
      const px = r() * W, pz = r() * H;
      if (!onGrass(px, pz)) continue;
      x.fillStyle = cols[i % cols.length];
      x.beginPath(); x.arc(px, pz, 1.3 + r() * 1.2, 0, Math.PI * 2); x.fill();
    }
  }
  if (IS_STORY) {
    // soft stipple, like the grain of the illustrations
    for (let i = 0; i < 9000; i++) {
      const px = r() * W, pz = r() * H;
      x.fillStyle = r() < 0.5 ? "rgba(90,80,60,0.06)" : "rgba(255,250,235,0.08)";
      x.fillRect(px, pz, 2, 2);
    }
  }
  if (IS_REAL) {
    // sidewalk slab joints
    x.strokeStyle = "rgba(60,55,50,0.22)"; x.lineWidth = 1;
    for (const rd of ROADS) {
      const horiz = rd.z1 === rd.z2;
      const len = horiz ? rd.x2 - rd.x1 : rd.z2 - rd.z1;
      for (let d = 0; d < len; d += 1.6) for (const s of [-1, 1]) {
        const a = rd.w / 2 + 0.1, b = rd.w / 2 + SIDEWALK - 0.1;
        x.beginPath();
        if (horiz) { x.moveTo(...toC(rd.x1 + d, rd.z1 + s * a)); x.lineTo(...toC(rd.x1 + d, rd.z1 + s * b)); }
        else { x.moveTo(...toC(rd.x1 + s * a, rd.z1 + d)); x.lineTo(...toC(rd.x1 + s * b, rd.z1 + d)); }
        x.stroke();
      }
    }
    // asphalt: patches and speckle; grass: tufts
    for (const rd of ROADS) {
      const horiz = rd.z1 === rd.z2;
      const len = horiz ? rd.x2 - rd.x1 : rd.z2 - rd.z1;
      for (let i = 0; i < len / 6; i++) {
        const d = r() * len, o = (r() - 0.5) * (rd.w - 1.5);
        const [px, pz] = horiz ? toC(rd.x1 + d, rd.z1 + o) : toC(rd.x1 + o, rd.z1 + d);
        x.fillStyle = r() < 0.5 ? "rgba(20,22,26,0.18)" : "rgba(120,120,120,0.1)";
        x.beginPath(); x.ellipse(px, pz, (1 + r() * 3) * ppm, (0.6 + r() * 1.5) * ppm, r() * 3, 0, Math.PI * 2); x.fill();
      }
    }
    for (let i = 0; i < 26000; i++) {
      const px = r() * W, pz = r() * H;
      x.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.05)";
      x.fillRect(px, pz, 1.5, 1.5);
    }
  }
}

/** The ground's material in the trial styles. */
export function groundMaterial(map: THREE.Texture): THREE.Material {
  if (IS_REAL) return withGroundDetail(new THREE.MeshStandardMaterial({ map, roughness: 0.93, metalness: 0, envMapIntensity: 0.6 }));
  return surface(new THREE.Color("#ffffff"), { map });
}

// ---------------------------------------------------------------------------- sea

export function seaMaterial(): THREE.ShaderMaterial {
  const L = styleLook()!;
  const fogColor = new THREE.Color(L.fog[0]), fogNear = L.fog[1], fogFar = L.fog[2];
  const P = IS_TOON ? { deep: "#1a86c6", shallow: "#43d0d6", foam: "#ffffff" }
    : IS_STORY ? { deep: "#437f8a", shallow: "#8cbcb4", foam: "#f8efe0" }
    : { deep: "#0d3f58", shallow: "#2b8490", foam: "#e9efec" };
  const sz = SEA_Z - 2.2; // where the beach (ground texture) actually ends
  return new THREE.ShaderMaterial({
    uniforms: {
      // fog is mixed in after tone mapping, in display colours, like three.js does for its own materials
      uTime: { value: 0 }, uFog: { value: fogColor.clone().convertLinearToSRGB() }, uFogNear: { value: fogNear }, uFogFar: { value: fogFar },
      uDeep: { value: new THREE.Color(P.deep) }, uShallow: { value: new THREE.Color(P.shallow) }, uFoam: { value: new THREE.Color(P.foam) },
      uSkyTop: { value: new THREE.Color(L.sky[0]) }, uSkyLow: { value: new THREE.Color(L.sky[2]) },
      uSun: { value: new THREE.Vector3(...L.sun[3]).normalize() },
    },
    defines: { STYLE_TOON: IS_TOON ? 1 : 0, STYLE_STORY: IS_STORY ? 1 : 0, STYLE_REAL: IS_REAL ? 1 : 0 },
    vertexShader: `varying vec3 vW; uniform float uTime;
      void main(){ vec4 w = modelMatrix * vec4(position,1.0);
        w.y += sin(w.x*0.08 + uTime*0.9)*0.12 + cos(w.z*0.11 + uTime*0.7)*0.1; vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec3 vW; uniform float uTime; uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar;
      uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uFoam; uniform vec3 uSkyTop; uniform vec3 uSkyLow; uniform vec3 uSun;
      void main(){
        float shore = smoothstep(${(sz + 1).toFixed(1)}, ${(sz - 18).toFixed(1)}, vW.z);
        vec3 c = mix(uShallow, uDeep, shore);
        float w = sin(vW.x*0.35 + uTime*1.3 + sin(vW.z*0.2)) * sin(vW.z*0.42 - uTime*1.1);
        #if STYLE_TOON
          c = mix(c, uShallow * 1.18, step(0.62, w) * 0.55);          // banded cartoon ripples
          float f = step(${(sz - 1.0).toFixed(1)}, vW.z + sin(vW.x*0.3 + uTime*1.5)*0.6);
          float f2 = step(0.5, sin((vW.z - ${sz.toFixed(1)}) * 1.6 + uTime * 1.2)) * step(${(sz - 5.0).toFixed(1)}, vW.z);
          c = mix(c, uFoam, max(f, f2 * 0.35));
        #elif STYLE_STORY
          c += vec3(0.05, 0.05, 0.04) * smoothstep(0.7, 0.95, w);     // soft light strokes
          float f = smoothstep(${(sz - 1.4).toFixed(1)}, ${(sz + 0.4).toFixed(1)}, vW.z + sin(vW.x*0.25 + uTime*1.2)*0.5);
          c = mix(c, uFoam, f * 0.8);
        #else
          // a little physically-flavoured water: waves, fresnel sky reflection and sun glints
          vec2 q = vW.xz; float tt = uTime;
          vec3 N = normalize(vec3(
            0.05 * cos(q.x*0.35 + tt*1.3 + sin(q.y*0.2)) + 0.03 * cos(q.x*1.1 - q.y*0.7 + tt*1.9) + 0.015 * cos(q.x*3.1 + q.y*2.3 - tt*2.7),
            1.0,
            0.05 * cos(q.y*0.42 - tt*1.1) + 0.03 * cos(q.y*1.3 + q.x*0.5 - tt*1.6) + 0.015 * cos(q.y*2.9 - q.x*3.3 + tt*2.3)));
          vec3 V = normalize(cameraPosition - vW);
          float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
          vec3 R = reflect(-V, N);
          vec3 sky = mix(mix(uSkyLow, uSkyTop, 0.35), uSkyTop, clamp(R.y * 2.5, 0.0, 1.0)) * 0.9;
          c = mix(c, sky, clamp(fres, 0.0, 0.65));
          float spec = pow(max(dot(R, uSun), 0.0), 180.0);
          c += vec3(1.0, 0.95, 0.85) * spec * 3.0;
          float f = smoothstep(${(sz - 1.2).toFixed(1)}, ${(sz + 0.6).toFixed(1)}, vW.z + sin(vW.x*0.25 + uTime*1.5)*0.5);
          c = mix(c, uFoam, f * 0.75);
        #endif
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        float dist = length(vW.xz - cameraPosition.xz);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uFog, smoothstep(uFogNear, uFogFar, dist));
      }`,
  });
}

// ---------------------------------------------------------------------------- trees & bushes

/** Tree trunk (instanced), same footprint as the original. */
export function trunkGeometry(): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(IS_REAL ? 0.14 : 0.2, IS_REAL ? 0.26 : 0.3, IS_REAL ? 2.6 : 2.2, IS_REAL ? 9 : 10);
  g.translate(0, IS_REAL ? 1.3 : 1.1, 0);
  if (IS_REAL) {
    // a couple of branches reaching into the canopy
    const b1 = new THREE.CylinderGeometry(0.05, 0.09, 1.2, 6).rotateZ(0.7).translate(0.35, 2.5, 0);
    const b2 = new THREE.CylinderGeometry(0.05, 0.09, 1.1, 6).rotateX(-0.7).translate(0, 2.45, -0.3);
    for (const g2 of [g, b1, b2]) g2.deleteAttribute("uv");
    return mergeGeometries([g.toNonIndexed(), b1.toNonIndexed(), b2.toNonIndexed()], false)!;
  }
  return g;
}

const TOON_CANOPY: [number, number, number, number][] = [[0, 3.35, 0, 1.3], [0.95, 3.0, 0.3, 0.95], [-0.9, 3.05, -0.2, 1.0], [0.1, 3.0, -0.95, 0.9], [-0.25, 3.1, 0.95, 0.9], [0.2, 4.15, 0.1, 0.9]];
const TOON_BUSH: [number, number, number, number][] = [[0, 0, 0, 0.62], [0.42, -0.08, 0.1, 0.42], [-0.4, -0.06, -0.05, 0.45], [0.05, 0.3, 0, 0.4]];

/** Tree canopy (instanced). Toon: round fluffy puffs; storybook: soft simple blob; realistic: lumpy clusters. */
export function canopyGeometry(): THREE.BufferGeometry {
  if (IS_TOON) return blobCluster(TOON_CANOPY, 12, 9);
  if (IS_STORY) return blobCluster([[0, 3.4, 0, 1.45, 1.1], [0.7, 3.0, 0.2, 0.95], [-0.7, 3.05, -0.1, 0.95]], 16, 11);
  const parts = [
    lumpySphere(1.3, 2, 1.3).translate(0, 3.5, 0),
    lumpySphere(0.95, 1, 2.7, 0.14).translate(0.85, 3.0, 0.35),
    lumpySphere(1.0, 1, 4.1, 0.14).translate(-0.8, 3.1, -0.3),
    lumpySphere(0.85, 1, 5.9, 0.14).translate(0.1, 4.3, -0.15),
    lumpySphere(0.85, 1, 7.3, 0.14).translate(-0.2, 2.9, 0.9),
  ];
  return mergeGeometries(parts, false)!;
}

export function canopyMaterial(): THREE.Material {
  if (IS_REAL) return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
  return withGrain(new THREE.MeshToonMaterial({ gradientMap: toonRamp(IS_TOON ? [0.55, 0.82, 1.0] : [0.7, 0.86, 1.0]) }));
}

export function bushGeometry(): THREE.BufferGeometry {
  if (IS_REAL) return lumpySphere(0.72, 2, 3.3, 0.16, 0.6);
  return blobCluster(TOON_BUSH, 10, 7);
}
export function bushMaterial(): THREE.Material {
  if (IS_REAL) return new THREE.MeshStandardMaterial({ color: grade("#4a7f38"), vertexColors: true, roughness: 0.85 });
  return surface(grade("#4f8f3f"));
}

/** Toon: outlines for instanced trees and bushes (added as children, with a coarser hull to save triangles). */
export function outlineInstanced(mesh: THREE.InstancedMesh, color: string, thickness: number, what: "canopy" | "bush" | "trunk") {
  if (!IS_TOON) return;
  const hull = what === "canopy" ? blobCluster(TOON_CANOPY, 8, 6) : what === "bush" ? blobCluster(TOON_BUSH, 7, 5) : undefined;
  mesh.add(makeOutline(mesh, outlineColorFor(new THREE.Color(color)), thickness, hull));
}

// ---------------------------------------------------------------------------- clouds

export function cloudMaterial(): THREE.Material {
  if (IS_TOON) return new THREE.MeshToonMaterial({ color: "#ffffff", emissive: new THREE.Color("#b9d8f2").multiplyScalar(0.45), gradientMap: toonRamp([0.78, 1.0]) });
  if (IS_STORY) return withGrain(new THREE.MeshToonMaterial({ color: "#fbf3e4", emissive: new THREE.Color("#e8d8bd").multiplyScalar(0.55), gradientMap: toonRamp([0.85, 1.0]) }));
  return new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1 });
}
export function cloudPuff(radius: number): THREE.BufferGeometry {
  return new THREE.SphereGeometry(radius, 14, 9);
}

// ---------------------------------------------------------------------------- interiors

export function floorMaterial(map: THREE.Texture, kind: string): THREE.Material {
  if (IS_REAL) {
    const rough = kind === "tile" ? 0.25 : kind === "wood" ? 0.5 : kind === "stone" ? 0.4 : 0.95;
    return new THREE.MeshStandardMaterial({ map, roughness: rough, metalness: 0, envMapIntensity: kind === "carpet" ? 0.3 : 1 });
  }
  return surface(new THREE.Color("#ffffff"), { map });
}
/** The floor's base colour as the style sees it (the pattern is painted on top). */
export function floorColor(hex: string) { return gradeHex(hex); }

// ---------------------------------------------------------------------------- cars

/** One low-poly car (forward = +Z) as a single vertex-coloured mesh, rounded for the style.
 *  Realistic cars also carry per-vertex roughness/metalness (aPbr). */
export function carGeometry(color: string): THREE.BufferGeometry {
  const parts: { g: THREE.BufferGeometry; c: string; pbr: [number, number] }[] = [];
  const R = IS_TOON ? 1 : IS_STORY ? 0.7 : 0.35; // roundness
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, c: string, pbr: [number, number], r = 0.08) =>
    parts.push({ g: chamferBox(w, h, d, Math.min(r * R * 2.2, Math.min(w, h, d) * 0.45)).translate(x, y, z), c, pbr });
  const paintPbr: [number, number] = [0.3, 0.45];
  if (IS_TOON) {
    box(1.95, 0.72, 4.1, 0, 0.66, 0, color, paintPbr, 0.14);
    box(1.72, 0.66, 2.3, 0, 1.3, -0.2, color, paintPbr, 0.14);
    box(1.76, 0.44, 2.05, 0, 1.33, -0.2, "#bfe8ff", [0.05, 0.3], 0.1);
  } else {
    box(1.9, 0.62, 4.25, 0, 0.62, 0, color, paintPbr, 0.08);
    box(1.68, 0.56, 2.25, 0, 1.2, -0.25, color, paintPbr, 0.1);
    box(1.72, 0.4, 2.02, 0, 1.22, -0.25, IS_REAL ? "#1f2c36" : "#a9c9cc", [0.05, 0.4], 0.06);
  }
  box(1.94, 0.16, 4.28, 0, 0.36, 0, "#34343a", [0.7, 0.05], 0.05);
  for (const x of [-0.62, 0.62]) {
    box(0.36, 0.14, 0.06, x, 0.76, 2.12, "#fff6c8", [0.2, 0], 0.02);
    box(0.36, 0.13, 0.06, x, 0.78, -2.12, "#d83a3a", [0.3, 0], 0.02);
  }
  for (const [x, z] of [[-0.88, 1.35], [0.88, 1.35], [-0.88, -1.35], [0.88, -1.35]]) {
    const wheel = new THREE.CylinderGeometry(0.37, 0.37, 0.3, 16).rotateZ(Math.PI / 2).translate(x, 0.37, z);
    parts.push({ g: wheel, c: "#222226", pbr: [0.9, 0] });
    const hub = new THREE.CylinderGeometry(0.17, 0.17, 0.32, 12).rotateZ(Math.PI / 2).translate(x, 0.37, z);
    parts.push({ g: hub, c: IS_TOON ? "#f4f4f4" : "#c9ccd1", pbr: [0.3, 0.8] });
  }
  const geos = parts.map(({ g, c, pbr }) => {
    const ng = g.index ? g.toNonIndexed() : g;
    ng.deleteAttribute("uv");
    paint(ng, grade(c));
    const n = ng.attributes.position.count;
    const a = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { a[i * 2] = pbr[0]; a[i * 2 + 1] = pbr[1]; }
    ng.setAttribute("aPbr", new THREE.BufferAttribute(a, 2));
    return ng;
  });
  return mergeGeometries(geos, false)!;
}
