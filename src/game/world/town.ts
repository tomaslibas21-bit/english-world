// Builds the outdoor town of Maple Harbor from layout.ts: ground, sea, buildings, props, colliders, doors.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BUILDINGS, ROADS, SIDEWALK, WORLD, STALLS, TAXI, BUS_STOP, FOUNTAIN, LIGHTHOUSE, PARK, SQUARE, BEACH_Z, SEA_Z, PARKED_CARS, CONVERTIBLE, CEDAR_DRIVE, SPROUTLY_LOT, type BuildingDef } from "./layout";
import { Merger, mat, boxGeo, cylGeo, textTexture, rand, Colliders, roundRect, colourMerge } from "./util";
import { carParts } from "./car";
import { STYLED, IS_REAL, grade } from "../style";
import { GROUND_BLOCKS, groundPalette, groundExtras, groundMaterial, seaMaterial, trunkGeometry, canopyGeometry, canopyMaterial, bushGeometry, bushMaterial, outlineInstanced, cloudMaterial, cloudPuff } from "./styled";

export interface Door { loc: string; bid: string; x: number; z: number; face: "n" | "s" | "e" | "w"; name: string; outX: number; outZ: number; rot: number }

/** A place to sit (the café chairs and the benches): the seat's top `y`, facing `rot`; a café chair's table. */
export interface Seat { x: number; z: number; rot: number; y: number; table?: [number, number] }

export interface Town {
  group: THREE.Group;
  colliders: Colliders;
  doors: Door[];
  /** Where townspeople can sit (Ambient seats some of them). */
  seats: Seat[];
  groundCanvas: HTMLCanvasElement;
  update(t: number, dt: number): void;
  walkableAt(x: number, z: number): boolean;
}

const PPM = 6; // ground texture pixels per metre
const GW = WORLD.maxX - WORLD.minX, GD = WORLD.maxZ - SEA_Z + 2;
const G0Z = SEA_Z - 2;
/** Open grass between the town's west edge and the foot of the hills beyond it (m). */
const WEST_MEADOW = 40;
/** How far a hill's footprint (centre, half-sizes) stays from the town's ground; negative when it reaches onto it. */
function hillGap(x: number, z: number, fx: number, fz: number) {
  const gx = Math.max(WORLD.minX - (x + fx), x - fx - WORLD.maxX), gz = Math.max(G0Z - (z + fz), z - fz - WORLD.maxZ);
  return gx > 0 && gz > 0 ? Math.hypot(gx, gz) : Math.max(gx, gz);
}

export function buildTown(): Town {
  const group = new THREE.Group();
  group.name = "town";
  const colliders = new Colliders();
  const doors: Door[] = [];
  const M = new Merger();
  const r = rand(7);
  sprays.length = 0; // a new game builds a new town
  seats.length = 0;
  details.length = 0;
  displays.length = 0;
  displayGlass.length = 0;

  // --- ground -------------------------------------------------------------
  const groundCanvas = drawGround();
  const gtex = new THREE.CanvasTexture(groundCanvas);
  gtex.colorSpace = THREE.SRGBColorSpace;
  gtex.anisotropy = 8;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GW, GD), STYLED ? groundMaterial(gtex) : withGrain(new THREE.MeshLambertMaterial({ map: gtex })));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(WORLD.minX + GW / 2, 0, G0Z + GD / 2);
  ground.receiveShadow = true;
  ground.name = "ground";
  group.add(ground);

  // outer grass beyond the playable area + hills
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(900, 640), mat("#7fb85e"));
  outer.rotation.x = -Math.PI / 2;
  // the outer grass stops at the shore, so the sea near the beach is not hidden under it
  outer.position.set(35, -0.05, SEA_Z + 1 + 320);
  outer.receiveShadow = true;
  group.add(outer);
  const hillMat = mat("#79ad5a", { flat: true });
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 1.2 - 0.1;
    let hx = 35 + Math.cos(a) * (230 + r() * 60), hz = 30 + Math.sin(a) * (170 + r() * 50);
    if (hz < SEA_Z + 10) continue;
    const s = 30 + r() * 40;
    // west of the town a hill stands back behind a meadow, so the ends of Main Street, Oak Avenue and the other streets
    // look out over grass to the hills instead of into a slope: it moves further out along the arc (the random numbers
    // stay the same, and so does everything after them)
    if (hx < WORLD.minX) {
      const ox = hx - 35, oz = hz - 30;
      let k = 1;
      while (hillGap(hx, hz, 1.6 * s, 1.2 * s) < WEST_MEADOW && k < 2) { k += 0.02; hx = 35 + ox * k; hz = 30 + oz * k; }
    }
    const g = new THREE.IcosahedronGeometry(s, 1);
    g.scale(1.6, 0.45 + r() * 0.3, 1.2);
    g.translate(hx, -s * 0.15, hz);
    M.add("hills", hillMat, g, false, true);
  }

  // --- sea ------------------------------------------------------------------
  const seaMat = STYLED ? seaMaterial() : new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFog: { value: new THREE.Color("#cfe8f5") } },
    vertexShader: `varying vec2 vUv; varying vec3 vW; uniform float uTime;
      void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0);
        w.y += sin(w.x*0.08 + uTime*0.9)*0.12 + cos(w.z*0.11 + uTime*0.7)*0.1; vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec2 vUv; varying vec3 vW; uniform float uTime; uniform vec3 uFog;
      void main(){
        float shore = smoothstep(${(SEA_Z + 1).toFixed(1)}, ${(SEA_Z - 14).toFixed(1)}, vW.z);
        vec3 deep = vec3(0.13,0.47,0.62); vec3 shallow = vec3(0.35,0.78,0.80);
        vec3 c = mix(shallow, deep, shore);
        float w = sin(vW.x*0.35 + uTime*1.3 + sin(vW.z*0.2)) * sin(vW.z*0.42 - uTime*1.1);
        c += vec3(0.09) * smoothstep(0.5, 1.0, w);
        c -= vec3(0.05, 0.06, 0.05) * smoothstep(0.45, 1.0, -w);
        float chop = sin(vW.x*1.1 - uTime*1.7 + sin(vW.z*0.9)) * sin(vW.z*1.3 + uTime*1.4);
        c += vec3(0.04) * chop;
        float glint = pow(max(0.0, sin(vW.x*2.1 + uTime*2.4) * sin(vW.z*1.7 - uTime*2.0) * sin(vW.x*0.5 - vW.z*0.6 + uTime)), 18.0);
        c += vec3(0.55) * glint * (0.4 + 0.6 * shore);
        float foam = smoothstep(${(SEA_Z - 1.2).toFixed(1)}, ${(SEA_Z + 0.6).toFixed(1)}, vW.z + sin(vW.x*0.25 + uTime*1.5)*0.5);
        c = mix(c, vec3(0.97,0.98,0.96), foam*0.85);
        float dist = length(vW.xz - cameraPosition.xz);
        c = mix(c, uFog, smoothstep(160.0, 420.0, dist));
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 320, 90, 32), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(35, -0.25, SEA_Z - 158);
  group.add(sea);

  // --- buildings --------------------------------------------------------------
  const signs: THREE.Mesh[] = [];
  for (const b of BUILDINGS) buildBuilding(b, M, colliders, doors, signs, group, b.seed !== undefined ? rand(b.seed) : r);

  // --- street furniture & nature -----------------------------------------------
  addStreetProps(M, colliders, group, r);
  addTrees(group, colliders, r);
  addSquareAndMarket(M, colliders, group, r);
  addHarbor(M, colliders, group, r);
  addTransport(M, colliders, group, r);
  addBackyard(M, colliders, group);
  addMaggiesCar(M, colliders, group);

  // world bounds
  colliders.addBox((WORLD.minX + WORLD.maxX) / 2, WORLD.minZ - 1, WORLD.maxX - WORLD.minX + 4, 2);
  colliders.addBox((WORLD.minX + WORLD.maxX) / 2, WORLD.maxZ + 1, WORLD.maxX - WORLD.minX + 4, 2);
  colliders.addBox(WORLD.minX - 1, 0, 2, 220);
  colliders.addBox(WORLD.maxX + 1, 0, 2, 220);
  // the sea on both sides of the pier deck (x -41.3…-18.7); the deck has its own edges
  colliders.addBox((WORLD.minX - 4 + -41.3) / 2, SEA_Z - 30, -41.3 - (WORLD.minX - 4), 60);
  colliders.addBox((-18.7 + WORLD.maxX + 4) / 2, SEA_Z - 30, WORLD.maxX + 4 - -18.7, 60);

  if (!STYLED) { addMarkings(group); group.add(makeFlowers(rand(41))); }
  if (details.length) {
    // the houses' flower boxes and the bikes in the gym's rack (one mesh)
    const m = new THREE.Mesh(colourMerge(details), new THREE.MeshLambertMaterial({ vertexColors: true }));
    m.castShadow = true;
    group.add(m);
  }
  if (displays.length) {
    // the shop windows' goods (one mesh) and their glass (one more, see-through)
    const goods = new THREE.Mesh(colourMerge(displays), displayMaterial());
    goods.receiveShadow = true;
    goods.name = "shop-windows";
    group.add(goods, new THREE.Mesh(mergeGeometries(displayGlass, false)!, displayGlassMaterial()));
  }
  M.build(group);

  const clouds = makeClouds(group, r);
  const boats = group.children.filter((o) => o.userData.boat);
  const gulls = STYLED ? [] : makeGulls(group);

  return {
    group, colliders, doors, seats: [...seats], groundCanvas,
    update(t, dt) {
      seaMat.uniforms.uTime.value = t;
      wind.value = t;
      for (const s of sprays) s(t);
      for (const c of clouds) {
        c.position.x += dt * c.userData.v;
        if (c.position.x > 260) c.position.x = -200;
      }
      for (const b of boats) {
        const { phase, rot } = b.userData.boat;
        b.position.y = Math.sin(t * 1.1 + phase) * 0.12;
        b.rotation.set(Math.sin(t * 0.9 + phase) * 0.035, rot, Math.sin(t * 1.3 + phase * 1.3) * 0.05);
      }
      for (const g of gulls) {
        const u = g.userData.gull;
        u.a += dt * u.w;
        g.position.set(u.cx + Math.cos(u.a) * u.r, u.h + Math.sin(t * 0.7 + u.cx) * 0.6, u.cz + Math.sin(u.a) * u.r);
        g.rotation.set(0, -u.a + (u.w > 0 ? 0 : Math.PI), u.w > 0 ? -0.25 : 0.25);
        // flap in bursts, then glide with the wings level
        const flap = Math.sin(t * 0.45 + u.cx) > 0.2 ? Math.sin(t * 9 + u.cx) : 0.35;
        g.scale.y = 1.2 * flap;
      }
    },
    walkableAt(x, z) {
      return x > WORLD.minX && x < WORLD.maxX && z > WORLD.minZ && z < WORLD.maxZ && !colliders.blocked(x, z, 0.3);
    },
  };
}

// ---------------------------------------------------------------------------

function toC(x: number, z: number): [number, number] { return [(x - WORLD.minX) * PPM, (z - G0Z) * PPM]; }

/** The town's clock for the shaders that move (the trees' wind, the clouds' shadows). */
const wind = { value: 0 };

/** The ground's colours times a fine tiling grain (specks and soft blotches around mid grey, 4 m a tile): up close the
 *  asphalt, sand and grass get texture instead of the blur of their 6 px/m map; far away it averages out. */
function withGrain(m: THREE.MeshLambertMaterial) {
  const S = 256, c = document.createElement("canvas");
  c.width = c.height = S;
  const x = c.getContext("2d")!, r = rand(11);
  x.fillStyle = "rgb(128,128,128)"; x.fillRect(0, 0, S, S);
  // drawn on every side of the tile too, so it repeats without seams
  const dot = (px: number, py: number, rad: number, v: number, a: number) => {
    x.fillStyle = `rgba(${v},${v},${v},${a})`;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { x.beginPath(); x.arc(px + ox, py + oy, rad, 0, Math.PI * 2); x.fill(); }
  };
  for (let i = 0; i < 70; i++) dot(r() * S, r() * S, 10 + r() * 26, r() < 0.5 ? 160 : 98, 0.2);
  for (let i = 0; i < 2600; i++) dot(r() * S, r() * S, 0.6 + r() * 1.3, r() < 0.5 ? 200 : 60, 0.45);
  const grain = new THREE.CanvasTexture(c);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.anisotropy = 8;
  // soft round clouds whose shadows drift over the town (110 m a tile, a metre and a bit a second)
  const C = 128, cc = document.createElement("canvas");
  cc.width = cc.height = C;
  const cx2 = cc.getContext("2d")!, cr = rand(23);
  for (let i = 0; i < 9; i++) {
    const px = cr() * C, py = cr() * C, rad = 12 + cr() * 22;
    for (const ox of [-C, 0, C]) for (const oy of [-C, 0, C]) {
      const g = cx2.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, rad);
      g.addColorStop(0, "rgba(255,255,255,0.9)"); g.addColorStop(1, "rgba(255,255,255,0)");
      cx2.fillStyle = g; cx2.beginPath(); cx2.arc(px + ox, py + oy, rad, 0, Math.PI * 2); cx2.fill();
    }
  }
  const clouds = new THREE.CanvasTexture(cc);
  clouds.wrapS = clouds.wrapT = THREE.RepeatWrapping;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.grainMap = { value: grain };
    sh.uniforms.cloudMap = { value: clouds };
    sh.uniforms.uWind = wind;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vGrainUv;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvGrainUv = (modelMatrix * vec4(transformed, 1.0)).xz / 4.0;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D grainMap;\nuniform sampler2D cloudMap;\nuniform float uWind;\nvarying vec2 vGrainUv;")
      .replace("#include <map_fragment>", `#include <map_fragment>
        diffuseColor.rgb *= 0.78 + 0.44 * texture2D(grainMap, vGrainUv).r;
        float cloud = texture2D(cloudMap, (vGrainUv * 4.0 + vec2(uWind * 1.3, uWind * 0.55)) / 110.0).a;
        diffuseColor.rgb *= 1.0 - 0.17 * smoothstep(0.3, 0.85, cloud);`);
  };
  return m;
}

/** The wind in the trees: the crown sways a little, more towards the top, each tree in its own time (the instance's
 *  position sets the phase). The time (`wind`) comes from TownWorld.update. */
function swaying(m: THREE.MeshLambertMaterial) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = wind;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uWind;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float sway = max(0.0, position.y - 2.2) * 0.055;
          vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
          transformed.x += sin(uWind * 1.1 + ip.x * 0.31 + ip.y * 0.17) * sway;
          transformed.z += cos(uWind * 0.85 + ip.x * 0.19 - ip.y * 0.23) * sway * 0.7;
        #endif`);
  };
  return m;
}

/** Road markings and the plaza's tile lines as thin flat geometry (one mesh per colour), sharp at any distance: the
 *  ground texture has 6 px a metre, so lines thinner than a pixel smeared. Lines stop short of the crossings. */
function addMarkings(group: THREE.Group) {
  const P = GROUND_BLOCKS, Y = 0.012;
  const parts: Record<string, THREE.BufferGeometry[]> = { center: [], white: [], plaza: [], curb: [] };
  const quad = (key: string, cx: number, cz: number, w: number, d: number) => parts[key].push(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2).translate(cx, Y, cz));
  const vs = ROADS.filter((d) => d.x1 === d.x2), hs = ROADS.filter((d) => d.z1 === d.z2);
  // the crossings and their crosswalks: no lane lines there
  const cross: { x0: number; x1: number; z0: number; z1: number }[] = [];
  for (const v of vs) for (const h of hs) {
    if (v.x1 < h.x1 - 1 || v.x1 > h.x2 + 1 || h.z1 < v.z1 - 1 || h.z1 > v.z2 + 1) continue;
    cross.push({ x0: v.x1 - v.w / 2 - 1.8, x1: v.x1 + v.w / 2 + 1.8, z0: h.z1 - h.w / 2 - 1.8, z1: h.z1 + h.w / 2 + 1.8 });
    for (let k = -v.w / 2 + 0.6; k < v.w / 2 - 0.4; k += 1.1) for (const dz of [-(h.w / 2 + 1.6), h.w / 2 + 0.4]) quad("white", v.x1 + k + 0.275, h.z1 + dz + 0.6, 0.55, 1.2);
    for (let k = -h.w / 2 + 0.6; k < h.w / 2 - 0.4; k += 1.1) for (const dx of [-(v.w / 2 + 1.6), v.w / 2 + 0.4]) quad("white", v.x1 + dx + 0.6, h.z1 + k + 0.275, 1.2, 0.55);
  }
  // the mid-block crosswalks on Main Street (café ↔ museum, bank ↔ square)
  for (const cx of [-50, 22, 100]) {
    cross.push({ x0: cx - 1.6, x1: cx + 1.6, z0: -13, z1: -3 });
    for (let k = -4.4; k < 4.6; k += 1.1) quad("white", cx, -8 + k + 0.275, 3, 0.55);
  }
  const free = (x: number, z: number) => !cross.some((c) => x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1);
  for (const rd of ROADS) {
    const horiz = rd.z1 === rd.z2;
    const a = horiz ? Math.min(rd.x1, rd.x2) : Math.min(rd.z1, rd.z2), b = horiz ? Math.max(rd.x1, rd.x2) : Math.max(rd.z1, rd.z2);
    const at = (along: number, side: number): [number, number] => (horiz ? [along, rd.z1 + side] : [rd.x1 + side, along]);
    // a dashed yellow centre line: 2.5 m dashes, 2 m gaps
    for (let u = a + 1; u + 2.5 <= b; u += 4.5) {
      const [x0, z0] = at(u, 0), [x1, z1] = at(u + 2.5, 0);
      if (!free(x0, z0) || !free(x1, z1)) continue;
      const [cx, cz] = at(u + 1.25, 0);
      quad("center", cx, cz, horiz ? 2.5 : 0.18, horiz ? 0.18 : 2.5);
    }
    // a low kerb where the road meets the pavement (a sharp edge instead of the ground texture's blur), with gaps at
    // the crossings like kerb ramps
    for (const side of [-(rd.w / 2 + 0.06), rd.w / 2 + 0.06]) {
      let start: number | null = null;
      const flush = (end: number) => {
        if (start === null || end - start < 0.5) return;
        const [cx, cz] = at((start + end) / 2, side);
        parts.curb.push(new THREE.BoxGeometry(horiz ? end - start : 0.14, 0.07, horiz ? 0.14 : end - start).translate(cx, 0.035, cz));
      };
      for (let u = a; u <= b; u += 1) {
        const [px, pz] = at(Math.min(u + 0.5, b), side);
        if (free(px, pz)) { if (start === null) start = u; } else { flush(u); start = null; }
      }
      flush(b);
    }
    // white edge lines half a metre in from each side, in 1 m pieces that leave out the crossings
    for (const side of [-(rd.w / 2 - 0.5), rd.w / 2 - 0.5]) {
      let start: number | null = null;
      const flush = (end: number) => {
        if (start === null || end - start < 0.5) return;
        const [cx, cz] = at((start + end) / 2, side);
        quad("white", cx, cz, horiz ? end - start : 0.12, horiz ? 0.12 : end - start);
      };
      for (let u = a; u <= b; u += 1) {
        const [px, pz] = at(Math.min(u + 0.5, b), side);
        if (free(px, pz)) { if (start === null) start = u; } else { flush(u); start = null; }
      }
      flush(b);
    }
  }
  // the plaza's tiles: lines every 2 m, a little darker than the paving
  const plazaLine = new THREE.Color(P.plaza).lerp(new THREE.Color(160 / 255, 140 / 255, 110 / 255), 0.35);
  for (let gx = SQUARE.x1; gx <= SQUARE.x2; gx += 2) quad("plaza", gx, (SQUARE.z1 + SQUARE.z2) / 2, 0.06, SQUARE.z2 - SQUARE.z1);
  for (let gz = SQUARE.z1; gz <= SQUARE.z2; gz += 2) quad("plaza", (SQUARE.x1 + SQUARE.x2) / 2, gz, SQUARE.x2 - SQUARE.x1, 0.06);
  const colors: Record<string, THREE.ColorRepresentation> = { center: P.centerLine, white: "#f4f4f0", plaza: plazaLine, curb: "#cbc5b8" };
  for (const [key, geos] of Object.entries(parts)) {
    if (!geos.length) continue;
    // drawn over the ground (no fighting with it far away), lit and shadowed like it
    const m = new THREE.MeshLambertMaterial({ color: colors[key], polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const mesh = new THREE.Mesh(mergeGeometries(geos, false)!, m);
    for (const g of geos) g.dispose();
    mesh.name = "markings-" + key;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    group.add(mesh);
  }
}

function drawGround(): HTMLCanvasElement {
  const P = STYLED ? groundPalette() : GROUND_BLOCKS; // trial styles repaint the same map
  const c = document.createElement("canvas");
  c.width = Math.round(GW * PPM); c.height = Math.round(GD * PPM);
  const x = c.getContext("2d")!;
  const r = rand(3);
  // grass with soft variation
  x.fillStyle = P.grass; x.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 2600; i++) {
    const px = r() * c.width, pz = r() * c.height, s = 6 + r() * 28;
    x.fillStyle = r() < 0.5 ? P.grassA : P.grassB;
    x.beginPath(); x.arc(px, pz, s, 0, Math.PI * 2); x.fill();
  }
  // beach
  const [, bz0] = toC(0, SEA_Z - 2), [, bz1] = toC(0, BEACH_Z + 1.5);
  const grad = x.createLinearGradient(0, bz0, 0, bz1);
  grad.addColorStop(0, P.beach[0]); grad.addColorStop(0.75, P.beach[1]); grad.addColorStop(1, P.beach[2]);
  x.fillStyle = grad; x.fillRect(0, bz0, c.width, bz1 - bz0);
  // park
  rectW(x, PARK.x1, PARK.z1, PARK.x2, PARK.z2, P.park);
  x.strokeStyle = P.path; x.lineWidth = 2.2 * PPM; x.lineCap = "round";
  x.beginPath();
  const [p1x, p1z] = toC(PARK.x1 + 2, PARK.z2 - 2), [p2x, p2z] = toC(PARK.x2 - 6, PARK.z1 + 4);
  x.moveTo(p1x, p1z); x.quadraticCurveTo(...toC(100, -20), p2x, p2z); x.stroke();
  x.beginPath(); x.moveTo(...toC(PARK.x1 + 2, PARK.z1 + 6)); x.quadraticCurveTo(...toC(96, -40), ...toC(PARK.x2 - 2, PARK.z2 - 4)); x.stroke();
  // pond
  x.fillStyle = P.pond; x.beginPath(); x.ellipse(...toC(108, -36), 7 * PPM, 4.5 * PPM, 0.3, 0, Math.PI * 2); x.fill();
  x.strokeStyle = P.pondEdge; x.lineWidth = 0.8 * PPM; x.stroke();
  // square plaza
  rectW(x, SQUARE.x1, SQUARE.z1, SQUARE.x2, SQUARE.z2, P.plaza);
  x.strokeStyle = P.plazaLines; x.lineWidth = 1;
  // the plaza's tile lines (blocks style: drawn as geometry by addMarkings, sharp up close)
  if (STYLED) {
    for (let gx = SQUARE.x1; gx <= SQUARE.x2; gx += 2) { x.beginPath(); x.moveTo(...toC(gx, SQUARE.z1)); x.lineTo(...toC(gx, SQUARE.z2)); x.stroke(); }
    for (let gz = SQUARE.z1; gz <= SQUARE.z2; gz += 2) { x.beginPath(); x.moveTo(...toC(SQUARE.x1, gz)); x.lineTo(...toC(SQUARE.x2, gz)); x.stroke(); }
  }
  x.fillStyle = P.plazaCircle; x.beginPath(); x.arc(...toC(FOUNTAIN.x, FOUNTAIN.z), 8 * PPM, 0, Math.PI * 2); x.fill();
  // lots behind buildings / station forecourt / terminal forecourt
  rectW(x, 28, 45, 62, 48.5, P.lot);
  rectW(x, 126, -30, 134, 14, P.lot);
  rectW(x, 102, 1, 124, 12, P.gasLot); // gas forecourt
  rectW(x, SPROUTLY_LOT.x1, SPROUTLY_LOT.z1, SPROUTLY_LOT.x2, SPROUTLY_LOT.z2, P.lot); // Sproutly's forecourt
  // sidewalks
  for (const rd of ROADS) roadRect(x, rd, rd.w / 2 + SIDEWALK, P.sidewalk);
  for (const rd of ROADS) roadRect(x, rd, rd.w / 2 + SIDEWALK - 0.25, P.sidewalkInner);
  // roads
  for (const rd of ROADS) roadRect(x, rd, rd.w / 2, P.road);
  // markings (blocks style: drawn as geometry by addMarkings, sharp up close)
  for (const rd of STYLED ? ROADS : []) {
    const horiz = rd.z1 === rd.z2;
    x.strokeStyle = P.centerLine; x.lineWidth = 0.18 * PPM; x.setLineDash([2.5 * PPM, 2 * PPM]);
    x.beginPath(); x.moveTo(...toC(rd.x1, rd.z1)); x.lineTo(...toC(rd.x2, rd.z2)); x.stroke();
    x.setLineDash([]);
    x.strokeStyle = P.edgeLine; x.lineWidth = 0.12 * PPM;
    for (const s of [-1, 1]) {
      x.beginPath();
      if (horiz) { x.moveTo(...toC(rd.x1, rd.z1 + s * (rd.w / 2 - 0.5))); x.lineTo(...toC(rd.x2, rd.z2 + s * (rd.w / 2 - 0.5))); }
      else { x.moveTo(...toC(rd.x1 + s * (rd.w / 2 - 0.5), rd.z1)); x.lineTo(...toC(rd.x2 + s * (rd.w / 2 - 0.5), rd.z2)); }
      x.stroke();
    }
  }
  // intersections (clear markings) + crosswalks
  const vs = ROADS.filter((d) => d.x1 === d.x2), hs = ROADS.filter((d) => d.z1 === d.z2);
  for (const v of vs) for (const h of hs) {
    if (v.x1 < h.x1 - 1 || v.x1 > h.x2 + 1 || h.z1 < v.z1 - 1 || h.z1 > v.z2 + 1) continue;
    rectW(x, v.x1 - v.w / 2, h.z1 - h.w / 2, v.x1 + v.w / 2, h.z1 + h.w / 2, P.road);
    if (!STYLED) continue;
    x.fillStyle = P.crosswalk;
    for (let k = -v.w / 2 + 0.6; k < v.w / 2 - 0.4; k += 1.1) {
      for (const dz of [-(h.w / 2 + 1.6), h.w / 2 + 0.4]) rectFill(x, v.x1 + k, h.z1 + dz, 0.55, 1.2);
    }
    for (let k = -h.w / 2 + 0.6; k < h.w / 2 - 0.4; k += 1.1) {
      for (const dx of [-(v.w / 2 + 1.6), v.w / 2 + 0.4]) rectFill(x, v.x1 + dx, h.z1 + k, 1.2, 0.55);
    }
  }
  // mid-block crosswalks on Main Street (café ↔ museum, bank ↔ square)
  for (const cx of STYLED ? [-50, 22, 100] : []) {
    x.fillStyle = P.crosswalk;
    for (let k = -4.4; k < 4.6; k += 1.1) rectFill(x, cx - 1.5, -8 + k, 3, 0.55);
  }
  // pier path from Harbor Road
  rectW(x, -32.2, BEACH_Z - 7, -27.8, -59.5, P.pierPath);
  // footprints darkening (fake ambient occlusion)
  for (const b of BUILDINGS) {
    const [x0, z0] = toC(b.x - b.w / 2 - 0.8, b.z - b.d / 2 - 0.8);
    x.fillStyle = P.footprint;
    x.fillRect(x0, z0, (b.w + 1.6) * PPM, (b.d + 1.6) * PPM);
  }
  if (STYLED) groundExtras(x, toC, PPM);
  return c;

  function rectW(x: CanvasRenderingContext2D, ax: number, az: number, bx: number, bz: number, col: string) {
    const [x0, z0] = toC(Math.min(ax, bx), Math.min(az, bz)), [x1, z1] = toC(Math.max(ax, bx), Math.max(az, bz));
    x.fillStyle = col; x.fillRect(x0, z0, x1 - x0, z1 - z0);
  }
  function rectFill(x: CanvasRenderingContext2D, cx: number, cz: number, w: number, d: number) {
    const [x0, z0] = toC(cx, cz); x.fillRect(x0, z0, w * PPM, d * PPM);
  }
  function roadRect(x: CanvasRenderingContext2D, rd: typeof ROADS[number], half: number, col: string) {
    rectW(x, Math.min(rd.x1, rd.x2) - (rd.x1 === rd.x2 ? half : 0), Math.min(rd.z1, rd.z2) - (rd.z1 === rd.z2 ? half : 0),
      Math.max(rd.x1, rd.x2) + (rd.x1 === rd.x2 ? half : 0), Math.max(rd.z1, rd.z2) + (rd.z1 === rd.z2 ? half : 0), col);
  }
}

// ---------------------------------------------------------------------------

function faceInfo(b: BuildingDef) {
  // outward normal and tangent of the door facade
  const n = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[b.face] as [number, number];
  const t: [number, number] = [-n[1], n[0]];
  const halfDepth = b.face === "n" || b.face === "s" ? b.d / 2 : b.w / 2;
  const halfWidth = b.face === "n" || b.face === "s" ? b.w / 2 : b.d / 2;
  return { n, t, halfDepth, halfWidth };
}

function buildBuilding(b: BuildingDef, M: Merger, col: Colliders, doors: Door[], signs: THREE.Mesh[], group: THREE.Group, r: () => number) {
  // the details added later (roof kit, chimneys) draw from their own sequence, so `r`'s draws stay as they were
  const dr = rand([...b.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) % 100000 + 911);
  const wallMat = mat(b.color);
  const trimMat = mat(b.trim ?? "#6b6b6b");
  const glassMat = reflective(mat("#9ccbe6", { emissive: "#1b3a4c" }));
  const frameMat = mat("#f3eee4");
  const darkGlass = reflective(mat("#5f8fb0", { emissive: "#0e2233" }));
  const key = b.id;
  const { n, t, halfDepth, halfWidth } = faceInfo(b);
  // walls
  M.add(`${key}-walls`, wallMat, boxGeo(b.w, b.h, b.d, b.x, b.h / 2, b.z));
  // plinth and cornice
  M.add(`trim-${b.trim}`, trimMat, boxGeo(b.w + 0.3, 0.5, b.d + 0.3, b.x, 0.25, b.z));
  if (b.roof !== "gable") M.add(`trim-${b.trim}`, trimMat, boxGeo(b.w + 0.5, 0.6, b.d + 0.5, b.x, b.h - 0.1, b.z));
  col.addBox(b.x, b.z, b.w, b.d, "building");

  // roof
  if (b.style === "warehouse") {
    // a low front gable (the ridge runs back from the door facade), corrugated, with a skylight strip on each slope
    // (two sloping slabs, so the brick gable and its logo show under the overhang)
    const span = halfWidth * 2 + 0.8, rise = span * 0.2, len = halfDepth * 2 + 0.6;
    const slope0 = Math.atan2(rise, span / 2), half0 = Math.hypot(span / 2, rise);
    for (const s of [-1, 1]) {
      const g = boxGeo(half0 + 0.1, 0.18, len, 0, 0, 0);
      g.rotateZ(-s * slope0);
      g.translate(s * span / 4, rise / 2 + 0.05, 0);
      if (b.face === "e" || b.face === "w") g.rotateY(Math.PI / 2);
      M.add(`roof-${b.roofColor}`, mat(b.roofColor ?? "#5d676e", { flat: true }), g.translate(b.x, b.h, b.z));
    }
    // the gable triangles in the wall colour (the roof overhangs them a little)
    const tri = new THREE.Shape();
    const tw = halfWidth * 2;
    tri.moveTo(-tw / 2, 0); tri.lineTo(0, tw * 0.2); tri.lineTo(tw / 2, 0); tri.lineTo(-tw / 2, 0);
    const tg = new THREE.ExtrudeGeometry(tri, { depth: halfDepth * 2, bevelEnabled: false });
    tg.translate(0, 0, -halfDepth);
    if (b.face === "e" || b.face === "w") tg.rotateY(Math.PI / 2);
    tg.translate(b.x, b.h - 0.01, b.z);
    M.add(`${key}-walls`, wallMat, tg);
    // corrugation ribs and skylights along both slopes
    const slope = Math.atan2(rise, span / 2), half = Math.hypot(span / 2, rise);
    for (const s of [-1, 1]) {
      for (let j = -len / 2 + 0.4; j < len / 2; j += 0.8) {
        const rib = boxGeo(half, 0.05, 0.07, 0, 0, 0);
        rib.rotateZ(-s * slope);
        rib.translate(s * span / 4, rise / 2 + 0.17, j);
        if (b.face === "e" || b.face === "w") rib.rotateY(Math.PI / 2);
        M.add("roof-rib", mat("#4b545a"), rib.translate(b.x, b.h, b.z), false);
      }
      const sky = boxGeo(1.4, 0.06, len * 0.7, 0, 0, 0);
      sky.rotateZ(-s * slope);
      sky.translate(s * half * 0.45 * Math.cos(slope), rise - half * 0.45 * Math.sin(slope) + 0.19, 0);
      if (b.face === "e" || b.face === "w") sky.rotateY(Math.PI / 2);
      M.add("glass", glassMat, sky.translate(b.x, b.h, b.z), false);
    }
  } else if (b.roof === "gable") {
    const rw = (b.face === "n" || b.face === "s") ? b.w : b.d;
    const rd = (b.face === "n" || b.face === "s") ? b.d : b.w;
    const shape = new THREE.Shape();
    shape.moveTo(-rd / 2 - 0.5, 0); shape.lineTo(0, rd * 0.32); shape.lineTo(rd / 2 + 0.5, 0); shape.lineTo(-rd / 2 - 0.5, 0);
    const g = new THREE.ExtrudeGeometry(shape, { depth: rw + 0.8, bevelEnabled: false });
    g.translate(0, 0, -(rw + 0.8) / 2);
    g.rotateY(b.face === "n" || b.face === "s" ? Math.PI / 2 : 0);
    g.translate(b.x, b.h, b.z);
    M.add(`roof-${b.roofColor}`, mat(b.roofColor ?? "#6b4f3a", { flat: true }), g);
    // a ridge cap along the top, and on a house a brick chimney through one slope
    const alongX = b.face === "n" || b.face === "s", top = b.h + rd * 0.32;
    M.add("roof-ridge", mat("#4a3b30", { flat: true }), boxGeo(alongX ? rw + 0.9 : 0.26, 0.14, alongX ? 0.26 : rw + 0.9, b.x, top + 0.02, b.z), false);
    if (b.style === "house") {
      const u = (dr() < 0.5 ? -1 : 1) * rw * 0.28, v = rd * 0.16, ch = rd * 0.32 + 1.1;
      const [cx, cz] = alongX ? [b.x + u, b.z + v] : [b.x + v, b.z + u];
      M.add("chimney", mat("#9a4f3c", { flat: true }), boxGeo(0.7, ch, 0.7, cx, b.h + ch / 2 - 0.2, cz));
      M.add("chimney-cap", mat("#5b5550"), boxGeo(0.86, 0.12, 0.86, cx, b.h + ch - 0.14, cz), false);
    }
  } else {
    M.add("roof-flat", mat("#8f8c86"), boxGeo(b.w - 0.4, 0.1, b.d - 0.4, b.x, b.h + 0.02, b.z), false);
    if (r() < 0.7 && b.h < 14) M.add("roof-box", mat("#a6a39c"), boxGeo(2.2, 1.2, 1.6, b.x + (r() - 0.5) * b.w * 0.5, b.h + 0.6, b.z + (r() - 0.5) * b.d * 0.4));
    // what a flat roof carries: a few vents, a hatch, an air-conditioning unit with its fan, and on a taller block a
    // water tank on legs (kept back from the edges)
    const spot = (m = 1.6): [number, number] => [b.x + (dr() - 0.5) * Math.max(0, b.w - 2 * m), b.z + (dr() - 0.5) * Math.max(0, b.d - 2 * m)];
    for (let k = 0; k < 2 + Math.floor(dr() * 3); k++) {
      const [vx, vz] = spot();
      M.add("roof-vent", mat("#8b9096"), cylGeo(0.16, 0.16, 0.6, vx, b.h + 0.36, vz, 8), false);
      M.add("roof-vent", mat("#8b9096"), cylGeo(0.26, 0.26, 0.08, vx, b.h + 0.7, vz, 8), false);
    }
    const [hx, hz] = spot(2);
    M.add("roof-box", mat("#a6a39c"), boxGeo(0.9, 0.3, 0.9, hx, b.h + 0.2, hz), false);
    if (b.w > 7 && b.d > 6) {
      const [ax, az] = spot(2.2);
      M.add("roof-box", mat("#a6a39c"), boxGeo(1.5, 0.8, 1.1, ax, b.h + 0.45, az));
      M.add("roof-fan", mat("#4b4f54"), cylGeo(0.42, 0.42, 0.04, ax, b.h + 0.87, az, 14), false);
    }
    if (b.h > 9 && dr() < 0.6) {
      const [tx2, tz2] = spot(2.4);
      for (const [lx, lz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) M.add("tank-legs", mat("#55595e"), cylGeo(0.05, 0.05, 1.2, tx2 + lx, b.h + 0.6, tz2 + lz, 5), false);
      M.add("tank", mat("#9b6b4a", { flat: true }), cylGeo(0.85, 0.85, 1.6, tx2, b.h + 2.0, tz2, 12));
      M.add("tank-top", mat("#6b4f3a", { flat: true }), new THREE.ConeGeometry(0.95, 0.6, 12).translate(tx2, b.h + 3.1, tz2));
    }
  }

  // door
  const doorOff = b.doorOffset ?? 0;
  const dx = b.x + n[0] * halfDepth + t[0] * doorOff, dz = b.z + n[1] * halfDepth + t[1] * doorOff;
  const doorW = b.doorWidth ?? (b.style === "terminal" || b.style === "station" || b.style === "museum" || b.style === "hotel" ? 3.4 : 1.8);
  const rotY = Math.atan2(n[0], n[1]);
  const doorMat = b.style === "house" ? mat(b.trim === "#ffffff" ? "#8a5a44" : b.trim!) : darkGlass;
  M.add(`door-${key}`, doorMat, boxGeo(doorW, 2.5, 0.15, 0, 1.25, 0, 0).rotateY(rotY).translate(dx + n[0] * 0.05, 0, dz + n[1] * 0.05));
  M.add(`trim-${b.trim}`, trimMat, boxGeo(doorW + 0.4, 0.25, 0.25, 0, 2.62, 0).rotateY(rotY).translate(dx + n[0] * 0.08, 0, dz + n[1] * 0.08));
  const atDoor = (g: THREE.BufferGeometry) => g.rotateY(rotY).translate(dx + n[0] * 0.08, 0, dz + n[1] * 0.08);
  for (const sd of [-1, 1]) M.add(`trim-${b.trim}`, trimMat, atDoor(boxGeo(0.14, 2.5, 0.22, sd * (doorW / 2 + 0.07), 1.25, 0)), false);
  if (b.style === "house") M.add("door-handle", mat("#c9a54a"), atDoor(boxGeo(0.07, 0.07, 0.1, doorW * 0.36, 1.05, 0.06)), false);
  else M.add("door-handle", mat("#c9ced3"), atDoor(boxGeo(doorW * 0.7, 0.06, 0.08, 0, 1.05, 0.08)), false);
  if (b.style !== "terminal" && b.style !== "station") {
    M.add("wall-lamp", mat("#3a3d42"), atDoor(boxGeo(0.2, 0.3, 0.16, doorW / 2 + 0.5, 2.25, 0.06)), false);
    M.add("lamp-warm", mat("#ffe6b0", { emissive: "#9c7a2a" }), atDoor(boxGeo(0.14, 0.2, 0.06, doorW / 2 + 0.5, 2.25, 0.14)), false);
  }
  if (b.loc) {
    const out = 2.2;
    doors.push({ loc: b.loc, bid: b.id, x: dx, z: dz, face: b.face, name: b.sign || b.loc, outX: dx + n[0] * out, outZ: dz + n[1] * out, rot: Math.atan2(n[0], n[1]) });
    // welcome mat
    M.add("mat", mat("#7a4b36"), boxGeo(doorW + 0.4, 0.04, 1.1, 0, 0.02, 0).rotateY(rotY).translate(dx + n[0] * 0.7, 0, dz + n[1] * 0.7), false);
  }

  // windows on every facade
  const floors = Math.max(1, Math.floor((b.h - 1) / 3.2));
  let displayN = 0;
  const facades: [number, number][] = [[0, -1], [0, 1], [1, 0], [-1, 0]];
  for (const [fx, fz] of facades) {
    const along = fx === 0 ? b.w : b.d;
    const hd = fx === 0 ? b.d / 2 : b.w / 2;
    const isFront = fx === n[0] && fz === n[1];
    const tx = -fz, tz = fx;
    const rot = Math.atan2(fx, fz);
    const spacing = b.style === "office" || b.style === "terminal" ? 2.2 : 3;
    const count = Math.max(1, Math.floor((along - 2) / spacing));
    for (let f = 0; f < floors; f++) {
      const y = 1.9 + f * 3.2 + (b.style === "house" && f === 0 ? -0.1 : 0);
      if (y + 1 > b.h - 0.4) break;
      for (let i = 0; i < count; i++) {
        const o = -along / 2 + 1 + spacing / 2 + i * ((along - 2) / count);
        if (isFront && f === 0 && Math.abs(o - doorOff) < doorW / 2 + 1.1) continue;
        // the warehouse's loading door (warehouseExtras) takes the front wall's ground floor north of the entrance
        if (b.style === "warehouse" && isFront && f === 0 && Math.abs(o - WAREHOUSE_LOADING_U) < 2.4) continue;
        // …and the sign the middle of the first floor
        if (b.style === "warehouse" && isFront && f === 1 && Math.abs(o - doorOff) < 3) continue;
        const wx = b.x + fx * (hd + 0.04) + tx * o, wz = b.z + fz * (hd + 0.04) + tz * o;
        if (b.style === "warehouse") {
          // tall steel-framed factory windows: a grid of small panes
          const ww = 2, wh = 1.8;
          M.add("glass", glassMat, boxGeo(ww, wh, 0.08, 0, 0, 0).rotateY(rot).translate(wx, y + 0.1, wz));
          const steel = mat("#2f3a40");
          for (const k of [-1, 0, 1]) M.add("window-steel", steel, boxGeo(0.06, wh, 0.12, k * ww / 3, 0, 0).rotateY(rot).translate(wx, y + 0.1, wz), false);
          for (const k of [-1, 1]) M.add("window-steel", steel, boxGeo(ww, 0.06, 0.12, 0, k * wh / 6, 0).rotateY(rot).translate(wx, y + 0.1, wz), false);
          M.add("sill-warehouse", mat("#d9cbb4"), boxGeo(ww + 0.25, 0.14, 0.18, 0, 0, 0).rotateY(rot).translate(wx, y + 0.1 - wh / 2 - 0.06, wz));
          continue;
        }
        const bigShop = isFront && f === 0 && (b.style === "shop" || b.style === "restaurant");
        const ww = b.style === "office" || b.style === "terminal" ? spacing - 0.3 : bigShop ? Math.min(2.6, spacing - 0.3) : 1.3;
        const wh = b.style === "office" || b.style === "terminal" ? 2.6 : bigShop ? 2.2 : 1.5;
        // a shop window clear of the door's frame (and of the lamp on its other side) stands out from the wall with the
        // shop's goods in it
        const fromDoor = o - doorOff;
        if (bigShop && !STYLED && GOODS[b.id] && Math.abs(fromDoor) > doorW / 2 + ww / 2 + (fromDoor > 0 ? 0.25 : 0.72)) {
          shopWindow(b, M, col, fx, fz, hd, o, ww, wh, y - 0.35 - wh / 2, trimMat, frameMat, displayN++);
          continue;
        }
        M.add("glass", b.style === "office" ? darkGlass : glassMat, boxGeo(ww, wh, 0.08, 0, 0, 0).rotateY(rot).translate(wx, y - (bigShop ? 0.35 : 0), wz));
        // a flower box under each of a house's front windows downstairs
        if (b.style === "house" && isFront && f === 0 && !STYLED) {
          const at = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(wx, 0, wz);
          details.push([at(new THREE.BoxGeometry(ww + 0.14, 0.22, 0.26).translate(0, y - wh / 2 - 0.2, 0.15)), "#7a4b36"]);
          for (let k = 0; k < 6; k++) {
            const fx = -ww / 2 + 0.12 + k * ((ww - 0.24) / 5);
            details.push([at(new THREE.IcosahedronGeometry(0.11, 0).translate(fx, y - wh / 2 - 0.04, 0.16)), "#4c8c3c"]);
            details.push([at(new THREE.SphereGeometry(0.06, 6, 5).translate(fx + 0.03, y - wh / 2 + 0.04, 0.2)), ["#e84a5f", "#ffd166", "#f28fad", "#ffffff"][k % 4]]);
          }
        }
        if (b.style !== "office" && b.style !== "terminal") {
          const cy = y - (bigShop ? 0.35 : 0);
          M.add(`trim-${b.trim}`, trimMat, boxGeo(ww + 0.25, 0.14, 0.16, 0, 0, 0).rotateY(rot).translate(wx, cy - wh / 2 - 0.05, wz));
          // a painted frame round the glass, and the window's cross (a shop window keeps one big pane): flat strips
          // just in front of the glass (two triangles each; a town has hundreds of windows)
          const fr = (w: number, h: number, ox: number, oy: number) => M.add("window-frame", frameMat, new THREE.PlaneGeometry(w, h).translate(ox, oy, 0.05).rotateY(rot).translate(wx, cy, wz), false);
          fr(ww + 0.14, 0.09, 0, wh / 2 + 0.02);
          for (const s of [-1, 1]) fr(0.08, wh + 0.06, s * (ww / 2 + 0.02), 0);
          if (!bigShop) { fr(0.05, wh, 0, 0); fr(ww, 0.05, 0, wh * 0.12); }
        }
      }
    }
  }

  // awning over the entrance (narrower over an off-centre door, so it stays on the facade)
  if (b.awning) {
    const aw = Math.min(halfWidth * 2 - 1 - 2 * Math.abs(doorOff), b.style === "hotel" ? 7 : 9);
    const ay = 3.15;
    const g = boxGeo(aw, 0.14, 1.8, 0, 0, 0);
    g.rotateX(0.32);
    g.rotateY(rotY);
    g.translate(dx + n[0] * 0.9, ay, dz + n[1] * 0.9);
    M.add(`awning-${b.awning}`, mat(b.awning), g);
    // stripes
    for (let i = -aw / 2 + 0.4; i < aw / 2; i += 0.9) {
      const s = boxGeo(0.42, 0.02, 1.82, i, 0.08, 0);
      s.rotateX(0.32); s.rotateY(rotY); s.translate(dx + n[0] * 0.9, ay, dz + n[1] * 0.9);
      M.add("awning-stripe", mat("#fff8ec"), s, false);
    }
  }

  // sign
  if (b.sign) {
    const tex = textTexture(b.sign, { bg: "#fffaf0", fg: b.trim ?? "#333", border: b.trim, w: 768, h: 160 });
    const sw = Math.min(halfWidth * 2 - 1.5, Math.max(5, b.sign.length * 0.55));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(sw, sw * 160 / 768), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    const sy = b.style === "house" ? 0 : b.style === "hotel" || b.style === "office" || b.style === "apartments" ? Math.min(b.h - 1.5, 8.2) : Math.min(b.h - 1.1, 4.8);
    // centred on the facade (the same place as the door, unless the door is off-centre)
    sign.position.set(dx - t[0] * doorOff + n[0] * 0.2, sy, dz - t[1] * doorOff + n[1] * 0.2);
    sign.rotation.y = rotY;
    if (b.style !== "house") { group.add(sign); signs.push(sign); }
  }

  // style extras
  if (b.style === "museum") {
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      M.add("columns", mat("#f7f3ea"), cylGeo(0.45, 0.5, 6.5, dx + t[0] * i * 2.1 + n[0] * 1.6, 3.25 + 0.6, dz + t[1] * i * 2.1 + n[1] * 1.6, 12));
      col.addCircle(dx + t[0] * i * 2.1 + n[0] * 1.6, dz + t[1] * i * 2.1 + n[1] * 1.6, 0.5);
    }
    M.add("steps", mat("#e3ddd0"), boxGeo(16, 0.3, 3.4, 0, 0.15, 0).rotateY(rotY).translate(dx + n[0] * 1.7, 0, dz + n[1] * 1.7));
    M.add("steps", mat("#e3ddd0"), boxGeo(16, 0.3, 2.4, 0, 0.45, 0).rotateY(rotY).translate(dx + n[0] * 1.2, 0, dz + n[1] * 1.2));
    M.add("pediment", mat("#f7f3ea"), boxGeo(16, 0.8, 3.6, 0, 7.4, 0).rotateY(rotY).translate(dx + n[0] * 1.6, 0, dz + n[1] * 1.6));
    const banner = textTexture("The Colors of the Night", { bg: "#2b2d6e", fg: "#ffd166", w: 256, h: 512 });
    for (const s of [-1, 1]) {
      const bm = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.2), new THREE.MeshBasicMaterial({ map: banner }));
      bm.position.set(dx + t[0] * s * 9.5 + n[0] * 0.1, 5.2, dz + t[1] * s * 9.5 + n[1] * 0.1);
      bm.rotation.y = rotY;
      group.add(bm);
    }
  }
  if (b.style === "hotel") {
    M.add("canopy", mat("#8a2f3b"), boxGeo(8, 0.35, 4, 0, 3.4, 0).rotateY(rotY).translate(dx + n[0] * 2, 0, dz + n[1] * 2));
    for (const s of [-1, 1]) {
      M.add("canopy-post", mat("#c8a86a"), cylGeo(0.08, 0.08, 3.4, dx + t[0] * s * 3.7 + n[0] * 3.8, 1.7, dz + t[1] * s * 3.7 + n[1] * 3.8, 6));
      col.addCircle(dx + t[0] * s * 3.7 + n[0] * 3.8, dz + t[1] * s * 3.7 + n[1] * 3.8, 0.15);
      // flags
      M.add("flagpole", mat("#dddddd"), cylGeo(0.06, 0.06, 9, dx + t[0] * s * 7 + n[0] * 0.8, 9.5, dz + t[1] * s * 7 + n[1] * 0.8, 6));
      M.add("flag", mat(s < 0 ? "#b22234" : "#3c3b6e"), boxGeo(1.6, 1, 0.04, 0, 0, 0).rotateY(rotY + Math.PI / 2).translate(dx + t[0] * s * 7 + n[0] * 0.8 + t[0] * 0.8, 13.4, dz + t[1] * s * 7 + n[1] * 0.8 + t[1] * 0.8));
    }
  }
  if (b.style === "station") {
    const clock = textTexture("🕒", { bg: "#fffaf0", fg: "#7a2e2e", w: 128, h: 128 });
    const cm = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), new THREE.MeshBasicMaterial({ map: clock }));
    cm.position.set(dx + n[0] * 0.12, 7.4, dz + n[1] * 0.12);
    cm.rotation.y = rotY;
    group.add(cm);
    M.add("canopy", mat("#7a2e2e"), boxGeo(12, 0.3, 3.2, 0, 3.5, 0).rotateY(rotY).translate(dx + n[0] * 1.6, 0, dz + n[1] * 1.6));
  }
  if (b.style === "terminal") {
    M.add("terminal-canopy", mat("#f4f6f8"), boxGeo(8, 0.4, 20, dx - 4, 5.4, dz));
    for (const oz of [-9, -3, 3, 9]) { M.add("canopy-post", mat("#b8c2cc"), cylGeo(0.15, 0.15, 5.4, dx - 7.5, 2.7, dz + oz, 8)); col.addCircle(dx - 7.5, dz + oz, 0.2); }
    // control tower
    M.add("tower", mat("#dde6ee"), cylGeo(1.6, 2, 24, b.x + 12, 12, b.z + 16, 12));
    M.add("tower-top", darkGlass, cylGeo(3, 2.4, 3, b.x + 12, 25.5, b.z + 16, 12));
    M.add("tower-cap", mat("#2b5d8a"), cylGeo(3.3, 3.3, 0.5, b.x + 12, 27.2, b.z + 16, 12));
    // parked plane
    buildPlane(M, 176, 12);
  }
  if (b.style === "apartments") {
    for (let f = 1; f < 5; f++) for (const o of [-7, 0, 7]) {
      M.add("balcony", mat("#f3e9dc"), boxGeo(3.2, 0.2, 1.2, b.x + o, f * 3.2 + 0.6, b.z - b.d / 2 - 0.55));
      M.add("balcony-rail", mat("#3b3b3b"), boxGeo(3.2, 0.9, 0.06, b.x + o, f * 3.2 + 1.1, b.z - b.d / 2 - 1.12));
    }
  }
  if (b.style === "house") {
    // porch
    M.add("porch", mat("#e8e2d6"), boxGeo(6, 0.35, 2.6, 0, 0.17, 0).rotateY(rotY).translate(dx + n[0] * 1.3, 0, dz + n[1] * 1.3));
    M.add("porch-roof", mat(b.roofColor ?? "#6b4f3a"), boxGeo(6.4, 0.2, 2.8, 0, 3.1, 0).rotateY(rotY).translate(dx + n[0] * 1.3, 0, dz + n[1] * 1.3));
    for (const s of [-1, 1]) M.add("porch-post", mat("#ffffff"), cylGeo(0.1, 0.1, 2.8, dx + t[0] * s * 2.8 + n[0] * 2.5, 1.55, dz + t[1] * s * 2.8 + n[1] * 2.5, 6));
    M.add("chimney", mat("#9a5b46"), boxGeo(1, 3, 1, b.x + b.w * 0.28, b.h + 1.8, b.z + 1.5));
    // mailbox
    M.add("mailbox-post", mat("#6b4f3a"), boxGeo(0.12, 1.1, 0.12, dx + t[0] * 4.5 + n[0] * 5, 0.55, dz + t[1] * 4.5 + n[1] * 5));
    M.add("mailbox", mat("#4a6fa5"), boxGeo(0.35, 0.3, 0.55, dx + t[0] * 4.5 + n[0] * 5, 1.2, dz + t[1] * 4.5 + n[1] * 5));
    // picket fence along the front
    for (let i = -b.w / 2; i <= b.w / 2; i += 0.5) {
      if (Math.abs(i) < 1.4) continue;
      M.add("fence", mat("#ffffff"), boxGeo(0.1, 0.9, 0.06, dx + t[0] * i + n[0] * 5.6, 0.45, dz + t[1] * i + n[1] * 5.6));
    }
    M.add("fence", mat("#ffffff"), boxGeo(b.w, 0.1, 0.06, 0, 0.7, 0).rotateY(rotY).translate(dx + n[0] * 5.6, 0, dz + n[1] * 5.6));
  }
  if (b.style === "office") {
    for (let f = 1; f <= 6; f++) M.add("office-band", mat("#34495e"), boxGeo(b.w + 0.2, 0.25, b.d + 0.2, b.x, f * 3.2 + 0.5, b.z));
  }
  if (b.style === "restaurant" && b.id === "trattoria") {
    for (const s of [-1, 1]) {
      M.add("planter", mat("#8a5a3c"), boxGeo(1.6, 0.6, 0.6, dx + t[0] * s * 4.5 + n[0] * 1.2, 0.3, dz + t[1] * s * 4.5 + n[1] * 1.2));
      M.add("plants", mat("#4c8c3c", { flat: true }), new THREE.IcosahedronGeometry(0.55, 0).translate(dx + t[0] * s * 4.5 + n[0] * 1.2, 0.9, dz + t[1] * s * 4.5 + n[1] * 1.2));
    }
    for (const s of [-1, 1]) cafeTable(M, col, dx + t[0] * s * 3 + n[0] * 3.2, dz + t[1] * s * 3 + n[1] * 3.2, "#2e6b3a");
  }
  if (b.id === "cafe") {
    for (const s of [-1, 1]) cafeTable(M, col, dx + t[0] * s * 3.4 + n[0] * 3.2, dz + t[1] * s * 3.4 + n[1] * 3.2, "#e8743b");
    // A-frame chalkboard
    M.add("board", mat("#2f3a33"), boxGeo(0.8, 1, 0.1, 0, 0.55, 0).rotateX(0.2).rotateY(rotY).translate(dx + t[0] * 1.8 + n[0] * 1.6, 0, dz + t[1] * 1.8 + n[1] * 1.6));
  }
  if (b.id === "bank") {
    // ATM next to the door
    M.add("atm", mat("#34495e"), boxGeo(1, 2, 0.5, 0, 1, 0).rotateY(rotY).translate(dx + t[0] * 4 + n[0] * 0.3, 0, dz + t[1] * 4 + n[1] * 0.3));
    M.add("atm-screen", glassMat, boxGeo(0.6, 0.45, 0.04, 0, 1.5, 0).rotateY(rotY).translate(dx + t[0] * 4 + n[0] * 0.57, 0, dz + t[1] * 4 + n[1] * 0.57));
    M.add("columns", mat("#f7f3ea"), cylGeo(0.35, 0.4, 5, dx + t[0] * -2.2 + n[0] * 0.6, 2.5, dz + t[1] * -2.2 + n[1] * 0.6, 10));
    M.add("columns", mat("#f7f3ea"), cylGeo(0.35, 0.4, 5, dx + t[0] * 2.2 + n[0] * 0.6, 2.5, dz + t[1] * 2.2 + n[1] * 0.6, 10));
  }
  if (b.id === "post") {
    M.add("mailbox-blue", mat("#1f4e9c"), boxGeo(0.8, 1.2, 0.7, dx + t[0] * 4 + n[0] * 1.6, 0.8, dz + t[1] * 4 + n[1] * 1.6));
    M.add("mailbox-blue", mat("#1f4e9c"), cylGeo(0.4, 0.4, 0.8, dx + t[0] * 4 + n[0] * 1.6, 1.4, dz + t[1] * 4 + n[1] * 1.6, 12).rotateZ(Math.PI / 2).translate(0, 0, 0));
    col.addBox(dx + t[0] * 4 + n[0] * 1.6, dz + t[1] * 4 + n[1] * 1.6, 0.9, 0.8);
    M.add("flagpole", mat("#dddddd"), cylGeo(0.06, 0.06, 9, dx - t[0] * 6 + n[0] * 1.2, 4.5, dz - t[1] * 6 + n[1] * 1.2, 6));
    M.add("flag", mat("#b22234"), boxGeo(1.8, 1.1, 0.04, dx - t[0] * 6 + n[0] * 1.2 + 0.9, 8.3, dz - t[1] * 6 + n[1] * 1.2));
  }
  if (b.id === "market" || b.id === "clinic" || b.id === "gym") frontExtras(b.id, M, col, group, dx, dz, n, t, rotY);
  if (b.style === "warehouse") warehouseExtras(b, M, col, group, dx, dz, n, t, rotY);
}

// --------------------------------------------------------------------------- shop windows

/** The shop windows' insides and goods (merged into one vertex-coloured mesh) and their panes, gathered while the
 *  town is built. */
const displays: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [];
const displayGlass: THREE.BufferGeometry[] = [];

/** The goods lit from inside the shop: some of each one's own colour glows. */
function displayMaterial() {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n      totalEmissiveRadiance += vColor.rgb * 0.3;");
  };
  return m;
}
/** Shop window glass: nearly clear looking straight in, the sky in it at a slant. */
function displayGlassMaterial() {
  const m = new THREE.MeshLambertMaterial({ color: "#e2f2f8", transparent: true, opacity: 0.16, depthWrite: false });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      float slant = 1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);
      totalEmissiveRadiance += vec3(0.55, 0.68, 0.8) * pow(slant, 2.0) * 0.7;
      diffuseColor.a = mix(0.13, 0.72, pow(slant, 1.6));`);
  };
  return m;
}

/** A shop window that stands out half a metre from the wall: a riser under it, the shop's colour round it, a lit back
 *  wall and a display floor inside, the goods (GOODS) on show, and clear glass in front. `o` is the window's place
 *  along the facade, `y0` its sill; `k` counts the shop's display windows (they alternate what they show). */
function shopWindow(b: BuildingDef, M: Merger, col: Colliders, fx: number, fz: number, hd: number, o: number, ww: number, wh: number, y0: number, trimMat: THREE.Material, frameMat: THREE.Material, k: number) {
  const D = 0.5, tx = -fz, tz = fx, rot = Math.atan2(fx, fz);
  const px = b.x + fx * hd + tx * o, pz = b.z + fz * hd + tz * o;
  const at = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(px, 0, pz);
  const y1 = y0 + wh, trim = `trim-${b.trim}`;
  M.add(trim, trimMat, at(boxGeo(ww + 0.16, y0, D, 0, y0 / 2, D / 2)));
  for (const s of [-1, 1]) M.add(trim, trimMat, at(boxGeo(0.08, wh, D, s * (ww / 2 + 0.04), y0 + wh / 2, D / 2)));
  M.add(trim, trimMat, at(boxGeo(ww + 0.28, 0.16, D + 0.08, 0, y1 + 0.08, D / 2 + 0.02)));
  displayGlass.push(at(new THREE.PlaneGeometry(ww, wh).translate(0, y0 + wh / 2, D - 0.03)));
  // a painted frame round the glass
  const fr = (w: number, h: number, ox: number, oy: number) => M.add("window-frame", frameMat, at(new THREE.PlaneGeometry(w, h).translate(ox, oy, D - 0.02)), false);
  fr(ww + 0.06, 0.07, 0, y1 - 0.02); fr(ww + 0.06, 0.07, 0, y0 + 0.02);
  for (const s of [-1, 1]) fr(0.07, wh, s * (ww / 2 - 0.02), y0 + wh / 2);
  // inside: goods stand on the display floor (y 0 there), between the back wall (z 0) and the glass (z 0.47)
  const add: Add = (g, c) => { displays.push([at(g.translate(0, y0 + 0.06, 0)), c]); };
  add(new THREE.BoxGeometry(ww, wh - 0.06, 0.02).translate(0, (wh - 0.06) / 2 - 0.06, 0.01), new THREE.Color(b.color).lerp(new THREE.Color("#fff8ec"), 0.6));
  add(new THREE.BoxGeometry(ww, 0.06, D - 0.04).translate(0, -0.03, D / 2 - 0.02), "#c9a57a");
  GOODS[b.id](add, k);
  col.addBox(px + fx * D / 2, pz + fz * D / 2, Math.abs(tx) * (ww + 0.3) + Math.abs(fx) * D, Math.abs(tz) * (ww + 0.3) + Math.abs(fz) * D);
}

type Add = (g: THREE.BufferGeometry, c: THREE.ColorRepresentation) => void;
// shapes standing on the display floor at (x, y, z): a box, a cylinder (r at the top, r2 at the bottom), a ball (by its
// centre), a ring lying flat or (upright) facing the street
const gB = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);
const gC = (r: number, h: number, x: number, y: number, z: number, seg = 10, r2 = r) => new THREE.CylinderGeometry(r, r2, h, seg).translate(x, y + h / 2, z);
const gS = (r: number, x: number, y: number, z: number) => new THREE.SphereGeometry(r, 8, 6).translate(x, y, z);
const gT = (r: number, tube: number, x: number, y: number, z: number, flat = true, arc = Math.PI * 2) => {
  const g = new THREE.TorusGeometry(r, tube, 6, 16, arc);
  if (flat) g.rotateX(Math.PI / 2);
  return g.translate(x, y, z);
};
/** A bottle: the body, its shoulder and neck, a label. */
function bottle(add: Add, x: number, y: number, z: number, c: string, h = 0.26, label = "#f4efe2") {
  add(gC(0.045, h * 0.68, x, y, z), c);
  add(gC(0.016, h * 0.32, x, y + h * 0.68, z, 8, 0.045), c);
  add(gC(0.047, h * 0.22, x, y + h * 0.2, z), label);
}

/** Little flags on a string across the top of a window, in the shop's colours. */
function bunting(add: Add, colors: string[]) {
  const n = 13, sag = 0.12, y = 1.92, z = 0.32;
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * 2 - 1, x = u * 1.12, yy = y - sag * (1 - u * u);
    add(new THREE.ConeGeometry(0.07, 0.16, 3).rotateX(Math.PI).translate(x, yy - 0.08, z), colors[i % colors.length]);
  }
  for (let i = 0; i < n - 1; i++) {
    const u0 = (i / (n - 1)) * 2 - 1, u1 = ((i + 1) / (n - 1)) * 2 - 1;
    const a = new THREE.Vector3(u0 * 1.12, y - sag * (1 - u0 * u0), z), b = new THREE.Vector3(u1 * 1.12, y - sag * (1 - u1 * u1), z);
    const len = a.distanceTo(b), g = new THREE.BoxGeometry(len, 0.01, 0.01);
    g.rotateZ(Math.atan2(b.y - a.y, b.x - a.x)).translate((a.x + b.x) / 2, (a.y + b.y) / 2, z);
    add(g, "#ece6dc");
  }
}
/** A shelf across the window at height y (the things on it stand on y + 0.03). */
const shelf = (add: Add, y: number) => add(gB(2.3, 0.03, 0.26, 0, y, 0.16), "#e8e2d6");
/** A mug with its handle. */
function mug(add: Add, x: number, y: number, z: number, c: string) {
  add(gC(0.05, 0.1, x, y, z, 10), c);
  add(new THREE.TorusGeometry(0.03, 0.01, 4, 8).translate(x + 0.055, y + 0.05, z), c);
}

/** What each shop shows in its windows. */
const GOODS: Record<string, (add: Add, k: number) => void> = {
  // Sunny Cup: a cake on a stand and donuts, or tiers of cupcakes and a cookie jar; bags of coffee beans
  cafe: (add, k) => {
    if (k % 2 === 0) {
      add(gC(0.03, 0.26, -0.55, 0, 0.24), "#e8e2d6");
      add(gC(0.24, 0.02, -0.55, 0.26, 0.24, 16), "#f4f1ea");
      add(gC(0.18, 0.15, -0.55, 0.28, 0.24, 16), "#e9b98a");
      add(gC(0.186, 0.04, -0.55, 0.42, 0.24, 16), "#fff4ec");
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add(gS(0.026, -0.55 + Math.cos(a) * 0.12, 0.48, 0.24 + Math.sin(a) * 0.12), "#d62839"); }
      ["#f28fad", "#6b3e26", "#f3c04f", "#f28fad", "#6b3e26"].forEach((c, i) => add(gT(0.055, 0.03, -0.05 + (i % 3) * 0.16, 0.03 + Math.floor(i / 3) * 0.06, 0.2 + (i % 2) * 0.08), c));
    } else {
      for (const [y, r] of [[0, 0.3], [0.32, 0.22], [0.6, 0.15]]) {
        add(gC(0.022, 0.32, -0.45, y, 0.24), "#c9a54a");
        add(gC(r, 0.02, -0.45, y + 0.3, 0.24, 14), "#f4f1ea");
        const n = Math.round(r * 18);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2, x = -0.45 + Math.cos(a) * r * 0.68, z = 0.24 + Math.sin(a) * r * 0.68;
          add(gC(0.035, 0.05, x, y + 0.32, z, 8, 0.028), "#e9b07a");
          add(gS(0.04, x, y + 0.39, z), ["#f7b2c4", "#fff1d6", "#b8e0d2", "#c9a0dc"][i % 4]);
        }
      }
      add(gC(0.11, 0.26, 0.2, 0, 0.24, 14), "#e8d5b5");
      add(gC(0.115, 0.04, 0.2, 0.26, 0.24, 14), "#b5651d");
    }
    for (let i = 0; i < 3; i++) { add(gB(0.13, 0.22, 0.08, 0.62 + i * 0.17, 0, 0.2), "#7a4b2a"); add(gB(0.132, 0.06, 0.082, 0.62 + i * 0.17, 0.09, 0.2), "#f4e3c3"); }
    shelf(add, 1.05);
    ["#f4f1ea", "#2a9d8f", "#e8743b", "#f4f1ea", "#f3c04f", "#2a9d8f"].forEach((c, i) => mug(add, 0.2 + i * 0.16, 1.08, 0.16, c));
    bunting(add, ["#e8743b", "#fff4ec", "#b5651d"]);
  },
  // Lucia's: wine, jars of pasta, a wheel of cheese, a basket of tomatoes, the Italian colours on the back wall
  trattoria: (add, k) => {
    bunting(add, ["#2e6b3a", "#f4f1ea", "#c8102e"]);
    shelf(add, 0.95);
    for (let i = 0; i < 6; i++) bottle(add, -0.9 + i * 0.32, 0.98, 0.16, "#9aa53a", 0.24, "#f4efe2");
    for (let i = 0; i < 5; i++) bottle(add, -1 + i * 0.13, 0, 0.18 + (i % 2) * 0.07, i % 2 ? "#5a1e2b" : "#1f4d2b", 0.3);
    for (let i = 0; i < 2; i++) { add(gC(0.08, 0.3, -0.18 + i * 0.2, 0, 0.22, 12), "#f1e3b0"); add(gC(0.085, 0.04, -0.18 + i * 0.2, 0.3, 0.22, 12), "#8a1f2a"); }
    if (k % 2 === 0) {
      add(gC(0.17, 0.11, 0.45, 0, 0.24, 18), "#f3c94f");
      add(gC(0.172, 0.012, 0.45, 0.11, 0.24, 18), "#e6b43a");
    } else add(gB(0.4, 0.2, 0.18, 0.45, 0, 0.24), "#7a5a3a");
    add(gB(0.34, 0.08, 0.22, 0.9, 0, 0.24), "#9c6b43");
    for (let i = 0; i < 7; i++) add(gS(0.055, 0.78 + (i % 4) * 0.08, 0.11 + Math.floor(i / 4) * 0.06, 0.2 + (i % 2) * 0.07), "#d62828");
  },
  // Threads: two mannequins in the new season's tops, and a stack of folded shirts
  threads: (add, k) => {
    const tops = k % 2 ? ["#8e6bb0", "#e9c46a"] : ["#e76f51", "#2a9d8f"], bottoms = k % 2 ? ["#2b2d42", "#5c4b3a"] : ["#264653", "#3d405b"];
    [-0.65, 0.2].forEach((x, i) => {
      add(gC(0.17, 0.03, x, 0, 0.24, 14), "#3a3d42");
      add(gC(0.022, 0.6, x, 0.03, 0.24), "#3a3d42");
      add(gC(0.15, 0.26, x, 0.6, 0.24, 14, 0.16), bottoms[i]);
      add(new THREE.CapsuleGeometry(0.17, 0.26, 4, 12).scale(1, 1, 0.72).translate(x, 1.08, 0.24), tops[i]);
      add(gC(0.05, 0.08, x, 1.36, 0.24), "#ece6dc");
      add(gS(0.11, x, 1.54, 0.24), "#ece6dc");
    });
    add(gB(0.5, 0.3, 0.3, 0.85, 0, 0.24), "#f4f1ea");
    ["#457b9d", "#f2cc8f", "#81b29a", "#e07a5f"].forEach((c, i) => add(gB(0.34, 0.045, 0.22, 0.85, 0.3 + i * 0.047, 0.24), c));
    add(gB(0.6, 0.03, 0.24, 0.85, 1.05, 0.16), "#e8e2d6");
    for (const [x, c] of [[0.68, "#c8a272"], [1.0, "#2b2d42"]] as [number, string][]) { add(gC(0.13, 0.015, x, 1.08, 0.16, 16), c); add(gC(0.07, 0.09, x, 1.095, 0.16, 12, 0.075), c); }
    bunting(add, k % 2 ? ["#6b4a8a", "#f4f1ea"] : ["#e76f51", "#f4f1ea"]);
  },
  // the pharmacy: a green cross on the back wall, shelves of boxes and bottles
  pharmacy: (add) => {
    add(new THREE.BoxGeometry(0.5, 0.15, 0.02).translate(0, 1.45, 0.03), "#2e8b57");
    add(new THREE.BoxGeometry(0.15, 0.5, 0.02).translate(0, 1.45, 0.03), "#2e8b57");
    for (const y of [0, 0.5]) {
      add(gB(2.3, 0.03, 0.28, 0, y + 0.42, 0.16), "#f4f6f8");
      if (y === 0) add(gB(2.3, 0.42, 0.04, 0, 0, 0.3), "#e3ebe6");
      for (let i = 0; i < 9; i++) {
        const x = -1 + i * 0.25, top = y + 0.45;
        if (i % 3 === 1) bottle(add, x, top, 0.16, "#c77d2e", 0.16, "#ffffff");
        else add(gB(0.12, 0.16 + (i % 2) * 0.04, 0.09, x, top, 0.16), ["#ffffff", "#4a90c2", "#2e8b57"][i % 3]);
      }
    }
  },
  // the car rental: a model car on a turntable, keys on a hook board
  rental: (add, k) => {
    add(gC(0.45, 0.08, -0.2, 0, 0.24, 24), "#e3f2ec");
    for (const [g, c] of carParts(k % 2 ? "#4a7bb7" : "#e45b4f")) add(g.scale(0.17, 0.17, 0.17).rotateY(0.6).translate(-0.2, 0.08, 0.24), c);
    add(new THREE.BoxGeometry(0.5, 0.36, 0.02).translate(0.8, 1.2, 0.03), "#1f8a70");
    for (let i = 0; i < 6; i++) add(gS(0.025, 0.65 + (i % 3) * 0.15, 1.13 + Math.floor(i / 3) * 0.14, 0.05), "#e8c547");
    bunting(add, ["#1f8a70", "#f4f1ea", "#e8c547"]);
  },
  // Gas & Go: cold drinks on two shelves, bags of chips
  gas: (add) => {
    for (const y of [0, 0.45]) {
      add(gB(2.3, 0.03, 0.26, 0, y + 0.4, 0.16), "#e8e2d6");
      for (let i = 0; i < 12; i++) bottle(add, -1.05 + i * 0.19, y + 0.43, 0.16, ["#d62828", "#2b6cb0", "#2a9d8f", "#f77f00"][i % 4], 0.22, "#ffffff");
    }
    ["#f3c04f", "#e63946", "#4a7bb7", "#6a994e", "#f3c04f", "#e63946"].forEach((c, i) => add(gB(0.2, 0.28, 0.07, -0.9 + i * 0.36, 0, 0.28).rotateZ(0.1 * ((i % 2) * 2 - 1)), c));
  },
  // Harbor Fitness: dumbbells on a rack, kettlebells, rolled yoga mats
  gym: (add, k) => {
    if (k % 2 === 0) bunting(add, ["#1f7f8c", "#f0883e"]);
    add(gB(1.1, 0.04, 0.26, -0.45, 0.32, 0.2), "#3a3d42");
    for (const x of [-0.9, 0]) add(gB(0.05, 0.32, 0.22, x, 0, 0.2), "#3a3d42");
    for (let i = 0; i < 4; i++) {
      const x = -0.85 + i * 0.27, s = 0.045 + i * 0.008;
      add(new THREE.CylinderGeometry(0.014, 0.014, 0.26, 6).rotateZ(Math.PI / 2).translate(x, 0.4, 0.2), "#9aa0a6");
      for (const e of [-0.11, 0.11]) add(gS(s, x + e, 0.4, 0.2), "#1f7f8c");
    }
    for (const [x, c] of [[0.35, "#2b2d42"], [0.6, "#f0883e"]] as [number, string][]) { add(gS(0.11, x, 0.11, 0.22), c); add(gT(0.06, 0.018, x, 0.24, 0.22, false, Math.PI), c); }
    ["#8e6bb0", "#2a9d8f", "#f28fad"].forEach((c, i) => add(new THREE.CylinderGeometry(0.07, 0.07, 0.62, 12).translate(0.95 - i * 0.03, 0.31, 0.12 + i * 0.12), c));
  },
  // The Pier: a life ring and a ship's wheel on the back wall, coils of rope, a lantern
  pier: (add, k) => {
    for (let i = 0; i < 4; i++) add(new THREE.TorusGeometry(0.28, 0.065, 6, 8, Math.PI / 2).rotateZ((i * Math.PI) / 2).translate(-0.5, 1.2, 0.08), i % 2 ? "#f4f1ea" : "#d62828");
    add(gT(0.22, 0.025, 0.45, 1.25, 0.06, false), "#7a4b2a");
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      add(new THREE.CylinderGeometry(0.015, 0.015, 0.52, 5).rotateZ(a).translate(0.45, 1.25, 0.06), "#7a4b2a");
    }
    for (let i = 0; i < 3; i++) add(gT(0.13 - i * 0.02, 0.03, k % 2 ? 0.6 : -0.6, 0.03 + i * 0.05, 0.24), "#d6c08f");
    add(gB(0.16, 0.22, 0.16, k % 2 ? -0.5 : 0.5, 0, 0.24), "#3a3d42");
    add(gB(0.12, 0.16, 0.12, k % 2 ? -0.5 : 0.5, 0.03, 0.24), "#ffd27a");
  },
};

/** Where the warehouse's roll-up loading door sits along the front, from the entrance (metres along the facade). */
const WAREHOUSE_LOADING_U = 4;

/** Sproutly's old brick warehouse: a green roll-up loading door (half open, plants and a pallet inside), a steel
 *  canopy over the entrance with two hanging plants, the leaf logo in the gable, crates of seedlings, a bike rack. */
function warehouseExtras(b: BuildingDef, M: Merger, col: Colliders, group: THREE.Group, dx: number, dz: number, n: [number, number], t: [number, number], rotY: number) {
  const P = (u: number, v: number): [number, number] => [dx + t[0] * u + n[0] * v, dz + t[1] * u + n[1] * v];
  const box = (key: string, m: THREE.Material, w: number, h: number, d: number, u: number, y: number, v: number, cast = true) => {
    const [x, z] = P(u, v);
    M.add(key, m, boxGeo(w, h, d, 0, y, 0).rotateY(rotY).translate(x, 0, z), cast);
  };
  const block = (u: number, v: number, a: number, bb: number) => {
    const [x, z] = P(u, v);
    col.addBox(x, z, Math.abs(t[0]) * a + Math.abs(n[0]) * bb, Math.abs(t[1]) * a + Math.abs(n[1]) * bb);
  };
  const green = mat(b.trim ?? "#2f7a4a"), steel = mat("#2f3a40"), wood = mat("#b8895a"), leaf = mat("#4c8c3c", { flat: true }), leaf2 = mat("#6fae4f", { flat: true });
  // the loading door: a dark opening, the roll-up door half way up (slats), a frame, a pallet of plant pots inside
  const U = WAREHOUSE_LOADING_U, LW = 3.6, LH = 3.6;
  box("loading-dark", mat("#2a2622"), LW, LH, 0.06, U, LH / 2, 0.02, false);
  for (let i = 0; i < 6; i++) box("loading-door", green, LW, 0.3, 0.1, U, LH - 0.15 - i * 0.29, 0.07);
  box("loading-frame", steel, LW + 0.3, 0.2, 0.16, U, LH + 0.1, 0.06);
  for (const s of [-1, 1]) box("loading-frame", steel, 0.15, LH, 0.16, U + s * (LW / 2 + 0.07), LH / 2, 0.06);
  // a low step in front of the loading door, and on it a pallet of potted plants waiting to go in
  box("loading-step", mat("#9c9a94"), LW, 0.12, 0.6, U, 0.06, 0.3, false);
  box("pallet", wood, 1.2, 0.15, 1, U + 0.7, 0.08, 0.75, false);
  for (const [pu, pv] of [[0.4, 0.5], [1, 0.5], [0.4, 1], [1, 1]]) {
    box("pot-sproutly", mat("#c56f4c"), 0.3, 0.28, 0.3, U + pu, 0.3, pv, false);
    const [x, z] = P(U + pu, pv);
    M.add("leaves-sproutly", leaf2, new THREE.IcosahedronGeometry(0.22, 0).translate(x, 0.58, z), false);
  }
  block(U + 0.7, 0.75, 1.3, 1.1);
  // a steel canopy over the entrance with a hanging plant at each end
  box("canopy-sproutly", steel, 2.8, 0.1, 1.4, 0, 3.05, 0.7);
  for (const s of [-1, 1]) {
    const [hx, hz] = P(s * 1.15, 1.1);
    M.add("hanging-cord", mat("#3b3b3b"), cylGeo(0.012, 0.012, 0.5, hx, 2.75, hz, 4), false);
    M.add("pot-sproutly", mat("#e8e2d6"), cylGeo(0.2, 0.15, 0.24, hx, 2.4, hz, 10), false);
    M.add("leaves-sproutly", leaf, new THREE.IcosahedronGeometry(0.26, 0).scale(1, 0.7, 1).translate(hx, 2.58, hz), false);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      M.add("leaves-trail", leaf2, boxGeo(0.07, 0.5 + (k % 2) * 0.25, 0.07, 0, 0, 0).translate(hx + Math.cos(a) * 0.17, 2.1 - (k % 2) * 0.12, hz + Math.sin(a) * 0.17), false);
    }
  }
  // the leaf logo in the gable, above the sign
  const halfW = (b.face === "n" || b.face === "s" ? b.w : b.d) / 2;
  const logo = canvasLogo();
  const [lx, lz] = P(0, 0.12);
  const lm = new THREE.Mesh(new THREE.CircleGeometry(Math.min(1, halfW * 0.4 * 0.36), 32), new THREE.MeshBasicMaterial({ map: logo, toneMapped: false }));
  lm.position.set(lx, b.h + halfW * 0.4 * 0.42, lz); lm.rotation.y = rotY;
  group.add(lm);
  // crates of seedlings south of the door, and a green cargo bike leaning on the wall
  for (const [cu, cv, ch] of [[-3.2, 0.7, 0], [-4.2, 0.75, 0], [-3.7, 0.7, 0.62]] as [number, number, number][]) {
    box("crate", wood, 0.9, 0.6, 0.7, cu, ch + 0.3, cv);
    for (const s of [-0.22, 0.22]) {
      const [x, z] = P(cu + s, cv);
      M.add("leaves-sproutly", leaf2, new THREE.IcosahedronGeometry(0.2, 0).translate(x, ch + 0.7, z), false);
    }
  }
  block(-3.7, 0.72, 2, 0.8);
  box("bike", green, 1.3, 0.08, 0.06, -5.55, 0.55, 1.7);
  box("bike", green, 0.06, 0.5, 0.06, -5.9, 0.8, 1.7);
  box("bike", steel, 0.5, 0.05, 0.06, -6.0, 1.06, 1.7);
  box("crate", wood, 0.5, 0.35, 0.45, -4.95, 0.8, 1.7);
  for (const s of [-0.6, 0.6]) {
    const [x, z] = P(-5.55 + s, 1.7);
    M.add("wheel", mat("#222"), cylGeo(0.3, 0.3, 0.06, 0, 0, 0, 12).rotateX(Math.PI / 2).rotateY(rotY).translate(x, 0.3, z), false);
  }
  block(-5.55, 1.7, 1.8, 0.5);
}

/** Sproutly's logo: a two-leaf sprout in a cream circle. */
function canvasLogo() {
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 256;
  const x = cv.getContext("2d")!;
  x.fillStyle = "#fffaf0"; x.beginPath(); x.arc(128, 128, 124, 0, Math.PI * 2); x.fill();
  x.lineWidth = 10; x.strokeStyle = "#2f7a4a"; x.stroke();
  x.strokeStyle = "#2f7a4a"; x.lineWidth = 12; x.lineCap = "round";
  x.beginPath(); x.moveTo(128, 200); x.lineTo(128, 120); x.stroke();
  x.fillStyle = "#4c9c4f";
  x.beginPath(); x.moveTo(128, 130); x.bezierCurveTo(100, 70, 60, 80, 52, 96); x.bezierCurveTo(70, 132, 110, 140, 128, 130); x.fill();
  x.fillStyle = "#6fbf5a";
  x.beginPath(); x.moveTo(128, 118); x.bezierCurveTo(150, 52, 196, 50, 206, 66); x.bezierCurveTo(192, 110, 156, 126, 128, 118); x.fill();
  x.fillStyle = "#8a5a3c"; x.fillRect(84, 196, 88, 10);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

/** Things in front of the Harbor Market, the clinic and the gym. `u` runs along the facade from the
 *  door, `v` out from the wall (the same maths as the other buildings' extras). */
function frontExtras(id: string, M: Merger, col: Colliders, group: THREE.Group, dx: number, dz: number, n: [number, number], t: [number, number], rotY: number) {
  const P = (u: number, v: number): [number, number] => [dx + t[0] * u + n[0] * v, dz + t[1] * u + n[1] * v];
  const box = (key: string, m: THREE.Material, w: number, h: number, d: number, u: number, y: number, v: number, cast = true) => {
    const [x, z] = P(u, v);
    M.add(key, m, boxGeo(w, h, d, 0, y, 0).rotateY(rotY).translate(x, 0, z), cast);
  };
  /** A collider box of `a` metres along the facade and `b` out from it. */
  const block = (u: number, v: number, a: number, b: number) => {
    const [x, z] = P(u, v);
    col.addBox(x, z, Math.abs(t[0]) * a + Math.abs(n[0]) * b, Math.abs(t[1]) * a + Math.abs(n[1]) * b);
  };
  /** A flat notice on the facade (or on a window), facing the street. */
  const notice = (text: string, bg: string, fg: string, u: number, y: number, w: number, h: number, v = 0.12) => {
    const [x, z] = P(u, v);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTexture(text, { bg, fg, w: 512, h: Math.round(512 * h / w) }), toneMapped: false }));
    m.position.set(x, y, z); m.rotation.y = rotY;
    group.add(m);
  };
  const metal = mat("#b9c2c9");
  if (id === "market") {
    // three nested shopping carts left of the door
    for (let i = 0; i < 3; i++) {
      const u = -6.6 + i * 0.36;
      box("rack", metal, 0.9, 0.42, 0.56, u, 0.86, 1.1);
      box("rack", metal, 0.72, 0.05, 0.5, u + 0.05, 0.3, 1.1);
      for (const s of [-0.22, 0.22]) box("rack", metal, 0.05, 0.95, 0.05, u - 0.42, 0.55, 1.1 + s);
      box("cart-handle", mat("#d9452b"), 0.07, 0.07, 0.62, u - 0.47, 1.12, 1.1);
      for (const [a, c] of [[-0.36, -0.22], [-0.36, 0.22], [0.36, -0.22], [0.36, 0.22]]) box("wheel", mat("#222"), 0.12, 0.12, 0.06, u + a, 0.07, 1.1 + c, false);
    }
    block(-6.25, 1.1, 1.8, 0.7);
    // a fruit stand right of the door
    box("stall-table", mat("#9c6b43"), 2.6, 0.75, 0.8, 5.6, 0.375, 0.75);
    const fruit = ["#e63946", "#f4a261", "#ffbe0b", "#8ab17d"];
    for (let i = 0; i < 14; i++) {
      const col7 = fruit[Math.floor((i % 7) / 2) % 4];
      const [x, z] = P(4.55 + (i % 7) * 0.35, 0.55 + Math.floor(i / 7) * 0.38);
      M.add("goods-" + col7, mat(col7, { flat: true }), new THREE.SphereGeometry(0.15, 6, 5).translate(x, 0.88, z), false);
    }
    block(5.6, 0.75, 2.7, 0.9);
    // posters in the windows
    notice("2 for $5 · Weekly Deals", "#ffd23f", "#b3261e", -3.6, 1.95, 2.1, 0.5);
    notice("Harbor Rewards · Save more", "#ffffff", "#23704a", -7, 1.95, 2.1, 0.5);
  } else if (id === "clinic") {
    // a bench by the window, and a low sign on the lawn with a medical cross
    streetBench(M, col, ...P(-2.6, 1.1), rotY);
    box("plinth", mat("#d8d2c4"), 1.9, 0.9, 0.24, 3, 0.45, 1.25);
    block(3, 1.25, 2, 0.4);
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 228;
    const x = cv.getContext("2d")!;
    x.fillStyle = "#ffffff"; roundRect(x, 4, 4, 504, 220, 26); x.fill();
    x.lineWidth = 10; x.strokeStyle = "#3a86b0"; x.stroke();
    x.fillStyle = "#3a86b0"; x.fillRect(58, 64, 36, 100); x.fillRect(26, 96, 100, 36);
    x.font = "800 50px Nunito, Arial"; x.textAlign = "left"; x.textBaseline = "middle";
    x.fillText("Family Clinic", 150, 86);
    x.fillStyle = "#52606d"; x.font = "700 38px Nunito, Arial"; x.fillText("Walk-ins welcome", 150, 150);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const [px, pz] = P(3, 1.25 + 0.14);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.8), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    panel.position.set(px, 0.5, pz); panel.rotation.y = rotY;
    group.add(panel);
  } else if (id === "gym") {
    // a bike rack right of the door, opening hours and an offer in the window
    for (const u of [4.4, 5, 5.6]) {
      for (const s of [-0.28, 0.28]) box("rack", metal, 0.05, 0.75, 0.05, u, 0.375, 1 + s);
      box("rack", metal, 0.05, 0.05, 0.61, u, 0.75, 1);
    }
    // two bikes parked in it, their front wheels in the rack
    for (const [u, c] of [[4.7, "#e45b4f"], [5.3, "#2a9d8f"]] as [number, string][]) {
      const [x, z] = P(u, 1.05);
      const at = (g: THREE.BufferGeometry) => g.rotateY(rotY).translate(x, 0, z);
      if (!STYLED) {
        for (const v of [-0.48, 0.48]) details.push([at(new THREE.TorusGeometry(0.31, 0.035, 6, 18).rotateY(Math.PI / 2).translate(0, 0.33, v)), "#26292e"]);
        details.push([at(new THREE.BoxGeometry(0.04, 0.04, 0.9).translate(0, 0.62, 0)), c]);
        details.push([at(new THREE.BoxGeometry(0.04, 0.36, 0.04).rotateX(0.35).translate(0, 0.48, -0.15)), c]);
        details.push([at(new THREE.BoxGeometry(0.04, 0.42, 0.04).rotateX(-0.3).translate(0, 0.5, 0.36)), c]);
        details.push([at(new THREE.BoxGeometry(0.14, 0.05, 0.24).translate(0, 0.78, -0.22)), "#26292e"]);
        details.push([at(new THREE.BoxGeometry(0.48, 0.035, 0.035).translate(0, 0.86, 0.42)), "#26292e"]);
      }
    }
    block(5, 1, 1.6, 0.7);
    notice("Open 5 AM – 11 PM", "#ffffff", "#1f7f8c", -2.2, 1.7, 1.1, 0.34);
    notice("First session FREE!", "#f0883e", "#ffffff", 6.33, 1.95, 2.1, 0.5);
  }
}

/** A park bench (its back towards -z before turning by `rot`). */
function streetBench(M: Merger, col: Colliders, x: number, z: number, rot: number) {
  const g1 = boxGeo(1.8, 0.1, 0.5, 0, 0.5, 0).rotateY(rot).translate(x, 0, z);
  const g2 = boxGeo(1.8, 0.5, 0.08, 0, 0.8, -0.22).rotateY(rot).translate(x, 0, z);
  M.add("bench", mat("#9c6b43"), g1); M.add("bench", mat("#9c6b43"), g2);
  for (const s of [-0.75, 0.75]) M.add("bench-leg", mat("#333"), boxGeo(0.08, 0.5, 0.4, s, 0.25, 0).rotateY(rot).translate(x, 0, z));
  col.addBox(x, z, Math.abs(Math.cos(rot)) * 1.9 + 0.3, Math.abs(Math.sin(rot)) * 1.9 + 0.3);
  for (const u of [-0.45, 0.45]) seats.push({ x: x + Math.cos(rot) * u, z: z - Math.sin(rot) * u, rot, y: 0.55 });
}

function cafeTable(M: Merger, col: Colliders, x: number, z: number, umbrella: string) {
  M.add("table", mat("#f2efe8"), cylGeo(0.5, 0.5, 0.06, x, 0.75, z, 12));
  M.add("table-leg", mat("#555"), cylGeo(0.05, 0.05, 0.75, x, 0.37, z, 6));
  M.add("umbrella", mat(umbrella, { flat: true }), new THREE.ConeGeometry(1.4, 0.6, 8).translate(x, 2.4, z));
  M.add("umbrella-pole", mat("#ddd"), cylGeo(0.03, 0.03, 2.2, x, 1.2, z, 5));
  for (const a of [0, Math.PI]) {
    const cx = x + Math.cos(a) * 0.8, cz = z + Math.sin(a) * 0.8;
    M.add("chair", mat("#3b5b4a"), boxGeo(0.45, 0.5, 0.45, cx, 0.25, cz));
    seats.push({ x: cx, z: cz, rot: Math.atan2(x - cx, z - cz), y: 0.5, table: [x, z] });
  }
  col.addCircle(x, z, 0.9);
}

function buildPlane(M: Merger, x: number, z: number) {
  const white = mat("#f4f6f8"), blue = mat("#2b5d8a");
  M.add("plane", white, cylGeo(1.4, 1.2, 22, 0, 0, 0, 14).rotateZ(Math.PI / 2).translate(x, 2.6, z + 30));
  M.add("plane", white, boxGeo(3, 0.3, 20, x, 2.4, z + 30));
  M.add("plane-tail", blue, boxGeo(2.5, 3.2, 0.3, x + 10, 4.2, z + 30));
  M.add("plane", white, boxGeo(1.4, 0.2, 6, x + 10, 3, z + 30));
}

// ---------------------------------------------------------------------------

function addStreetProps(M: Merger, col: Colliders, group: THREE.Group, r: () => number) {
  const lampPost = mat("#2f3a40");
  const lampGlass = mat("#fff4c4", { emissive: "#a08a3a" });
  const addLamp = (x: number, z: number) => {
    M.add("lamp", lampPost, cylGeo(0.08, 0.12, 4.2, x, 2.1, z, 6));
    M.add("lamp", lampPost, boxGeo(0.25, 0.25, 0.25, x, 4.3, z));
    M.add("lamp-glass", lampGlass, new THREE.SphereGeometry(0.28, 8, 6).translate(x, 4.55, z), false);
    col.addCircle(x, z, 0.18);
  };
  for (const rd of ROADS) {
    const horiz = rd.z1 === rd.z2;
    const len = horiz ? rd.x2 - rd.x1 : rd.z2 - rd.z1;
    for (let d = 12; d < len; d += 24) {
      for (const s of [-1, 1]) {
        const off = rd.w / 2 + SIDEWALK - 0.6;
        const x = horiz ? rd.x1 + d : rd.x1 + s * off;
        const z = horiz ? rd.z1 + s * off : rd.z1 + d;
        if (nearIntersection(x, z) || nearDoor(x, z) || inDrive(x, z, 1)) continue;
        addLamp(x, z);
      }
    }
  }
  // benches, hydrants, trash cans along Main Street
  const bench = (x: number, z: number, rot: number) => streetBench(M, col, x, z, rot);
  for (const [x, z, rot] of [[-75, -17.5, 0], [-48, -17.5, 0], [-6, -17.5, 0], [60, -40, 0], [-64, 2, Math.PI], [40, 2, Math.PI], [-84, 44.5, 0]] as [number, number, number][]) bench(x, z, rot);
  const hydrant = (x: number, z: number) => {
    M.add("hydrant", mat("#d63b2f"), cylGeo(0.18, 0.2, 0.7, x, 0.35, z, 8));
    M.add("hydrant", mat("#d63b2f"), new THREE.SphereGeometry(0.18, 8, 6).translate(x, 0.72, z));
    col.addCircle(x, z, 0.22);
  };
  for (const [x, z] of [[-68, -1.5], [-2, -1.5], [44, -14.5], [-78, 43], [66, 43]]) hydrant(x, z);
  const trash = (x: number, z: number) => { M.add("trash", mat("#3f5a4a"), cylGeo(0.3, 0.28, 0.9, x, 0.45, z, 10)); col.addCircle(x, z, 0.32); };
  for (const [x, z] of [[-45, -15], [8, -15], [-30, -1], [26, -1], [-14, 43]]) trash(x, z);
  // stop signs at a few corners
  const stop = (x: number, z: number) => {
    M.add("sign-pole", mat("#9aa5ad"), cylGeo(0.04, 0.04, 2.4, x, 1.2, z, 6));
    M.add("stop", mat("#c62828", { flat: true }), new THREE.CylinderGeometry(0.4, 0.4, 0.05, 8).rotateX(Math.PI / 2).translate(x, 2.45, z));
  };
  for (const [x, z] of [[-75, 32], [5, 32], [65, 32], [-5, -14], [75, -14]]) stop(x, z);
  // parked cars
  const colors = ["#e45b4f", "#4a7bb7", "#f2c14e", "#6fbf73", "#f4f4f4", "#3d3d46", "#b5838d"];
  const parked: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [];
  const car = (x: number, z: number, rot: number, color: string) => {
    if (!STYLED) {
      for (const [g, c] of carParts(color)) parked.push([g.rotateY(rot).translate(x, 0, z), c]);
      col.addBox(x, z, Math.abs(Math.cos(rot)) * 2 + Math.abs(Math.sin(rot)) * 4.3, Math.abs(Math.sin(rot)) * 2 + Math.abs(Math.cos(rot)) * 4.3);
      return;
    }
    const body = mat(color, { flat: true });
    M.add("car-" + color, body, boxGeo(1.9, 0.7, 4.2, 0, 0.65, 0).rotateY(rot).translate(x, 0, z));
    M.add("car-" + color, body, boxGeo(1.7, 0.6, 2.2, 0, 1.3, -0.2).rotateY(rot).translate(x, 0, z));
    M.add("car-glass", mat("#9ccbe6", { emissive: "#1b3a4c" }), boxGeo(1.72, 0.45, 2.0, 0, 1.3, -0.2).rotateY(rot).translate(x, 0, z), false);
    for (const [wx, wz] of [[-0.9, 1.3], [0.9, 1.3], [-0.9, -1.3], [0.9, -1.3]]) {
      M.add("wheel", mat("#222"), cylGeo(0.36, 0.36, 0.3, 0, 0, 0, 10).rotateZ(Math.PI / 2).translate(wx, 0.36, wz).rotateY(rot).translate(x, 0, z));
    }
    col.addBox(x, z, Math.abs(Math.cos(rot)) * 2 + Math.abs(Math.sin(rot)) * 4.3, Math.abs(Math.sin(rot)) * 2 + Math.abs(Math.cos(rot)) * 4.3);
  };
  let ci = 0;
  for (const [x, z, rot] of PARKED_CARS) car(x, z, rot, colors[ci++ % colors.length]);
  if (parked.length) group.add(staticColoured(parked, "parked-cars"));
  void r;
}

function nearIntersection(x: number, z: number) {
  const vs = ROADS.filter((d) => d.x1 === d.x2), hs = ROADS.filter((d) => d.z1 === d.z2);
  for (const v of vs) for (const h of hs) if (Math.abs(x - v.x1) < v.w / 2 + 5 && Math.abs(z - h.z1) < h.w / 2 + 5) return true;
  return false;
}
/** In Maggie's drive on Cedar Lane (or within `margin` of it). */
function inDrive(x: number, z: number, margin = 0) {
  const d = CEDAR_DRIVE;
  return x > d.x1 - margin && x < d.x2 + margin && z > d.z1 - margin && z < d.z2 + margin;
}
function nearDoor(x: number, z: number) {
  for (const b of BUILDINGS) {
    const { n, t, halfDepth } = faceInfo(b);
    const off = b.doorOffset ?? 0; // the door itself (off-centre on the gym)
    const dx = b.x + n[0] * halfDepth + t[0] * off, dz = b.z + n[1] * halfDepth + t[1] * off;
    if (Math.abs(x - dx) < 4.5 && Math.abs(z - dz) < 6) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------

function addTrees(group: THREE.Group, col: Colliders, r: () => number) {
  const spots: [number, number, number][] = [];
  const add = (x: number, z: number, s = 1) => { spots.push([x, z, s]); };
  // street trees along Oak Avenue and Harbor Road sidewalks
  for (let x = -96; x < 120; x += 14) {
    if (!nearIntersection(x, 44.5) && !nearDoor(x, 46)) {
      // (the same random draws as before, so every other tree keeps its place, size and colour)
      const tx = x + r() * 2, tz = 44.8 + r() * 0.4;
      // the one in Maggie's drive moves to the west of it, out of the conversation camera's view (it frames from the east)
      add(inDrive(tx, tz, 1.6) ? CEDAR_DRIVE.x1 - 3.2 : tx, tz, 0.9);
    }
    if (!nearIntersection(x, -61.5)) add(x + 5 + r() * 2, -61.8, 0.85);
  }
  // park
  for (let i = 0; i < 26; i++) {
    const x = PARK.x1 + 3 + r() * (PARK.x2 - PARK.x1 - 6), z = PARK.z1 + 3 + r() * (PARK.z2 - PARK.z1 - 6);
    if (Math.hypot(x - 108, z + 36) < 9) continue;
    add(x, z, 0.9 + r() * 0.6);
  }
  // behind shops and around houses
  for (let x = -96; x < 64; x += 9) add(x + r() * 3, 22 + r() * 8, 0.8 + r() * 0.4);
  for (const [x, z] of [[-96, -48], [-72, -46], [-4, -46], [68, -46], [-100, 70], [-62, 70], [-16, 70], [8, 68], [70, 68], [100, 68], [120, 30], [128, 24], [-100, 28], [118, -60], [126, -40]]) add(x, z, 1 + r() * 0.3);
  // square
  for (const [x, z] of [[9, -18], [47, -18], [9, -46], [47, -46.5]]) add(x, z, 0.8);

  const n = spots.length;
  const trunkGeo = STYLED ? trunkGeometry() : new THREE.CylinderGeometry(0.18, 0.28, 2.2, 7).translate(0, 1.1, 0);
  const leafGeo = STYLED ? canopyGeometry() : mergeGeometries([
    new THREE.IcosahedronGeometry(1.6, 1).translate(0, 3.3, 0),
    new THREE.IcosahedronGeometry(1.05, 1).translate(0.35, 4.45, -0.2),
    new THREE.IcosahedronGeometry(0.9, 0).translate(-0.85, 3.7, 0.55),
  ], false)!;
  const trunks = new THREE.InstancedMesh(trunkGeo, mat("#7a5236"), n);
  const leaves = new THREE.InstancedMesh(leafGeo, STYLED ? canopyMaterial() : swaying(new THREE.MeshLambertMaterial({ flatShading: true })), n);
  const palette = ["#d9542b", "#e8833a", "#f2b440", "#c8402f", "#7fae4a", "#5f9e46", "#e0692c", "#b8d05a"];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
  spots.forEach(([x, z, sc], i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI);
    m4.compose(v.set(x, 0, z), q, s.set(sc, sc * (0.9 + r() * 0.3), sc));
    trunks.setMatrixAt(i, m4);
    leaves.setMatrixAt(i, m4);
    const leafCol = palette[Math.floor(r() * palette.length)];
    leaves.setColorAt(i, STYLED ? grade(leafCol) : new THREE.Color(leafCol));
    col.addCircle(x, z, 0.35 * sc);
  });
  trunks.castShadow = leaves.castShadow = true;
  trunks.receiveShadow = leaves.receiveShadow = true;
  group.add(trunks, leaves);
  if (STYLED) { outlineInstanced(trunks, "#7a5236", 0.03, "trunk"); outlineInstanced(leaves, "#3f6b2a", 0.045, "canopy"); }
  // bushes
  const bushGeo = STYLED ? bushGeometry() : new THREE.IcosahedronGeometry(0.7, 0);
  const bushes = new THREE.InstancedMesh(bushGeo, STYLED ? bushMaterial() : new THREE.MeshLambertMaterial({ color: "#4f8f3f", flatShading: true }), 60);
  let k = 0;
  for (const b of BUILDINGS) {
    if (k >= 58) break;
    if (b.style === "office" || b.style === "terminal") continue;
    const { n: nn, t, halfDepth } = faceInfo(b);
    for (const sgn of [-1, 1]) {
      const off = (b.face === "n" || b.face === "s" ? b.w : b.d) / 2 - 0.8;
      const x = b.x + nn[0] * (halfDepth + 0.6) + t[0] * sgn * off, z = b.z + nn[1] * (halfDepth + 0.6) + t[1] * sgn * off;
      m4.compose(v.set(x, 0.35, z), q.identity(), s.set(1, 0.8, 1));
      bushes.setMatrixAt(k++, m4);
    }
  }
  bushes.count = k;
  bushes.castShadow = true;
  group.add(bushes);
  if (STYLED) outlineInstanced(bushes, "#2f5f2a", 0.03, "bush");
}

function addSquareAndMarket(M: Merger, col: Colliders, group: THREE.Group, r: () => number) {
  // fountain
  const { x, z } = FOUNTAIN;
  M.add("fountain", mat("#d8d2c4"), cylGeo(3.4, 3.6, 0.8, x, 0.4, z, 24));
  M.add("fountain-water", mat("#6cc3dc", { emissive: "#0f3b48" }), cylGeo(3.0, 3.0, 0.1, x, 0.76, z, 24), false);
  M.add("fountain", mat("#d8d2c4"), cylGeo(0.4, 0.6, 2.2, x, 1.5, z, 12));
  M.add("fountain", mat("#d8d2c4"), cylGeo(1.2, 0.8, 0.3, x, 2.6, z, 16));
  M.add("fountain-water", mat("#9fe0ef", { emissive: "#174a57" }), new THREE.SphereGeometry(0.7, 12, 8).scale(1, 0.6, 1).translate(x, 2.9, z), false);
  col.addCircle(x, z, 3.7);
  if (!STYLED) group.add(makeSpray(x, z));
  // stalls
  for (const s of STALLS) {
    M.add("stall-table", mat("#9c6b43"), boxGeo(4, 0.9, 1.6, s.x, 0.45, s.z));
    for (const [dx, dz] of [[-1.9, -0.7], [1.9, -0.7], [-1.9, 0.7], [1.9, 0.7]]) M.add("stall-pole", mat("#e8e2d6"), cylGeo(0.05, 0.05, 2.6, s.x + dx, 1.3, s.z + dz, 5));
    const roof = boxGeo(4.4, 0.12, 2.2, s.x, 2.65, s.z); roof.rotateX(0.08);
    M.add("stall-roof-" + s.color, mat(s.color), roof);
    const goodsCol = s.goods === "flowers" ? ["#e84a5f", "#ffd166", "#b56576", "#f7a072"] : s.goods === "fruit" ? ["#e63946", "#f4a261", "#ffbe0b"] : s.goods === "veg" ? ["#2a9d8f", "#e76f51", "#8ab17d"] : ["#d4a373", "#e9c46a"];
    for (let i = 0; i < 14; i++) {
      const g = new THREE.SphereGeometry(0.16 + r() * 0.08, 6, 5).translate(s.x - 1.6 + (i % 7) * 0.53, 1.02, s.z - 0.35 + Math.floor(i / 7) * 0.5);
      M.add("goods-" + goodsCol[i % goodsCol.length], mat(goodsCol[i % goodsCol.length], { flat: true }), g, false);
    }
    col.addBox(s.x, s.z, 4.2, 1.8);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: textTexture({ flowers: "Flowers", fruit: "Fresh Fruit", veg: "Farm Veggies", bread: "Bakery" }[s.goods] || "", { bg: "#fffaf0", fg: "#5a3a25", w: 256, h: 64 }) }));
    sign.position.set(s.x, 2.2, s.z + 1.12);
    group.add(sign);
  }
  // benches around the fountain, their backs to it (Rosa sits on the south-west one, facing south)
  for (const [bx, bz, rot] of [[18, -23.2, Math.PI], [30, -22.6, Math.PI], [40, -30, -Math.PI / 2]] as [number, number, number][]) {
    M.add("bench", mat("#9c6b43"), boxGeo(1.8, 0.1, 0.5, 0, 0.5, 0).rotateY(rot).translate(bx, 0, bz));
    M.add("bench", mat("#9c6b43"), boxGeo(1.8, 0.5, 0.08, 0, 0.8, 0.22).rotateY(rot).translate(bx, 0, bz));
    col.addBox(bx, bz, Math.abs(Math.cos(rot)) * 1.9 + 0.3, Math.abs(Math.sin(rot)) * 1.9 + 0.3);
    // a place on each one facing away from the fountain (Rosa's bench is hers)
    if (bx !== 18) seats.push({ x: bx, z: bz, rot: rot + Math.PI, y: 0.55 });
  }
  // bandstand-ish gazebo
  M.add("gazebo", mat("#ffffff"), cylGeo(3, 3, 0.4, 44, 0.2, -22, 8));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    M.add("gazebo", mat("#ffffff"), cylGeo(0.1, 0.1, 3, 44 + Math.cos(a) * 2.7, 1.7, -22 + Math.sin(a) * 2.7, 6));
  }
  M.add("gazebo-roof", mat("#2e6b3a", { flat: true }), new THREE.ConeGeometry(3.6, 1.8, 8).translate(44, 4.1, -22));
  col.addCircle(44, -22, 3.1);
}

const BOATS: [number, number, number, string][] = [[-10, -84, 0.3, "#e45b4f"], [10, -90, -0.6, "#4a7bb7"], [30, -80, 1.2, "#f2c14e"], [-58, -86, 0.1, "#ffffff"], [60, -96, 2.4, "#6fbf73"]];

const coloured = colourMerge;

/** Glass that catches the sky when seen at a slant (brighter towards the edges of the view): windows read as glass. */
function reflective(m: THREE.Material) {
  if (STYLED || m.userData.reflective) return m;
  m.userData.reflective = true;
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      float slant = 1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);
      totalEmissiveRadiance += vec3(0.5, 0.62, 0.74) * pow(slant, 2.5) * 0.55;`);
  };
  m.needsUpdate = true;
  return m;
}
let boatMat: THREE.MeshLambertMaterial | null = null;

/** Still shapes in their own colours as one mesh that casts shadows (the parked cars, the taxi). */
function staticColoured(parts: [THREE.BufferGeometry, THREE.ColorRepresentation][], name: string) {
  boatMat ??= new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const mesh = new THREE.Mesh(colourMerge(parts), boatMat);
  mesh.name = name;
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  return mesh;
}

function makeBoats() {
  boatMat ??= new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  // the hull seen from above: square stern, pointed bow
  const shape = new THREE.Shape();
  shape.moveTo(-1.1, -3); shape.lineTo(1.1, -3); shape.lineTo(1.1, 1.2); shape.quadraticCurveTo(1.0, 2.4, 0, 3.2);
  shape.quadraticCurveTo(-1.0, 2.4, -1.1, 1.2); shape.lineTo(-1.1, -3);
  return BOATS.map(([bx, bz, rot, c], i) => {
    const hull = new THREE.ExtrudeGeometry(shape, { depth: 0.9, bevelEnabled: false, curveSegments: 6 }).rotateX(-Math.PI / 2).translate(0, -0.35, 0);
    const deck = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false, curveSegments: 6 }).rotateX(-Math.PI / 2).scale(0.9, 1, 0.9).translate(0, 0.56, 0);
    const stripe = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false, curveSegments: 6 }).rotateX(-Math.PI / 2).scale(1.015, 1, 1.008).translate(0, 0.25, 0);
    const mesh = new THREE.Mesh(coloured([
      [hull, c], [stripe, c === "#ffffff" ? "#2f6db5" : "#ffffff"], [deck, "#c9a27a"],
      [new THREE.BoxGeometry(1.4, 0.9, 1.8).translate(0, 1.05, -0.6), "#f4f6f8"],
      [new THREE.BoxGeometry(1.42, 0.3, 1.3).translate(0, 1.2, -0.45), "#5f8fb0"], // the cabin's windows
      [new THREE.CylinderGeometry(0.05, 0.05, 5, 5).translate(0, 3, 0.4), "#dddddd"],
    ]), boatMat!);
    mesh.position.set(bx, 0, bz);
    mesh.rotation.y = rot;
    mesh.castShadow = true;
    mesh.userData.boat = { phase: i * 1.7, rot };
    return mesh;
  });
}

/** The fountain's spray: droplets that leave the top bowl all round and fall into the basin (one instanced mesh,
 *  moved by `spray.update`). */
const sprays: ((t: number) => void)[] = [];
/** The places to sit, gathered while the town is built (Town.seats). */
const seats: Seat[] = [];
/** Small details in their own colours (flower boxes, bikes), merged into one mesh at the end. */
const details: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [];
function makeSpray(x: number, z: number) {
  const N = 60;
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 6, 4).scale(1, 1.6, 1), new THREE.MeshLambertMaterial({ color: "#eefaff", emissive: "#5aa6bd" }), N);
  drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  drops.frustumCulled = false;
  const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  sprays.push((t) => {
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + (i % 3) * 0.7, u = (t / 1.3 + (i * 0.618) % 1) % 1;
      const r = 0.55 + 1.75 * u, y = 3.05 + 0.6 * u - 2.85 * u * u;
      p.set(x + Math.cos(a) * r, y, z + Math.sin(a) * r);
      sc.setScalar(1 - u * 0.4);
      drops.setMatrixAt(i, m4.compose(p, q, sc));
    }
    drops.instanceMatrix.needsUpdate = true;
  });
  return drops;
}

/** Flowers in the park and in front of the houses: little coloured blooms in small clumps (one instanced mesh). */
function makeFlowers(r: () => number) {
  const spots: [number, number][] = [];
  const clump = (x: number, z: number, n: number, spread: number) => { for (let i = 0; i < n; i++) spots.push([x + (r() - 0.5) * spread, z + (r() - 0.5) * spread]); };
  for (let i = 0; i < 26; i++) {
    const x = PARK.x1 + 3 + r() * (PARK.x2 - PARK.x1 - 6), z = PARK.z1 + 3 + r() * (PARK.z2 - PARK.z1 - 6);
    if (Math.hypot(x - 108, z + 36) < 9) continue; // not in the pond
    clump(x, z, 7 + Math.floor(r() * 6), 1.6);
  }
  for (const b of BUILDINGS) {
    if (b.style !== "house") continue;
    const { n: nn, t, halfDepth, halfWidth } = faceInfo(b);
    for (const sd of [-1, 1]) {
      const off = sd * (halfWidth - 1.2), out = halfDepth + 1.1;
      clump(b.x + nn[0] * out + t[0] * off, b.z + nn[1] * out + t[1] * off, 6, 1.0);
    }
  }
  const palette = ["#e84a5f", "#f2c14e", "#ffffff", "#b07cd8", "#ff8fab", "#f08a3c"];
  const blooms = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.085, 0).translate(0, 0.16, 0), new THREE.MeshLambertMaterial({ flatShading: true }), spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  spots.forEach(([x, z], i) => {
    blooms.setMatrixAt(i, m4.compose(p.set(x, 0, z), q, s.setScalar(0.8 + r() * 0.6)));
    blooms.setColorAt(i, new THREE.Color(palette[Math.floor(r() * palette.length)]));
  });
  return blooms;
}

/** A few gulls circling over the harbour, flapping now and then and gliding. */
function makeGulls(group: THREE.Group) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, flatShading: true });
  const wing = (s: number) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.18, s * 0.95, 0.35, 0, 0, 0, -0.16], 3));
    g.computeVertexNormals();
    return g;
  };
  const geo = coloured([
    [wing(1), "#f4f6f8"], [wing(-1), "#f4f6f8"],
    [new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute([0.72, 0.266, 0.05, 0.95, 0.35, 0, 0.75, 0.277, -0.06, -0.72, 0.266, 0.05, -0.95, 0.35, 0, -0.75, 0.277, -0.06], 3)), "#3a3f45"], // dark wing tips
    [new THREE.SphereGeometry(0.11, 6, 4).scale(1, 0.8, 2.2), "#ffffff"],
  ]);
  return Array.from({ length: 5 }, (_, i) => {
    const g = new THREE.Mesh(geo, m);
    g.userData.gull = { cx: -30 + i * 14, cz: -78 - (i % 2) * 8, r: 9 + i * 2.5, h: 10 + (i % 3) * 2.2, w: (i % 2 ? 1 : -1) * (0.22 + i * 0.03), a: i * 1.3 };
    g.scale.setScalar(1.2);
    group.add(g);
    return g;
  });
}

function addHarbor(M: Merger, col: Colliders, group: THREE.Group, r: () => number) {
  // pier walkway and deck
  const wood = mat("#b8895a");
  M.add("pier", wood, boxGeo(4.4, 0.3, 14, -30, 0.15, -69));
  M.add("pier", wood, boxGeo(22, 0.3, 16, -30, 0.15, -80));
  for (let i = -10; i <= 10; i += 2.5) for (const zz of [-72, -88]) M.add("pier-post", mat("#7a5a3a"), cylGeo(0.2, 0.2, 2, -30 + i, -0.6, zz, 6));
  for (const s of [-1, 1]) M.add("pier-rail", mat("#f4f1ea"), boxGeo(0.1, 1, 14, -30 + s * 2.15, 0.8, -69));
  col.addBox(-32.3, -69, 0.2, 14); col.addBox(-27.7, -69, 0.2, 14);
  // pier deck area is walkable: remove the sea collider there by leaving a gap (see buildTown); add deck edges
  col.addBox(-41.2, -80, 0.3, 16); col.addBox(-18.8, -80, 0.3, 16); col.addBox(-30, -88.2, 22, 0.3);
  col.addBox(-37.5, -72.2, 7.6, 0.3); col.addBox(-22.5, -72.2, 7.6, 0.3);
  // lighthouse on rocks
  const { x, z } = LIGHTHOUSE;
  for (let i = 0; i < 9; i++) {
    const g = new THREE.DodecahedronGeometry(2 + r() * 2.5, 0).translate(x + (r() - 0.5) * 10, 0, z + (r() - 0.5) * 8);
    M.add("rocks", mat("#8d8f93", { flat: true }), g);
  }
  M.add("lighthouse", mat("#f5f5f0"), cylGeo(1.9, 2.6, 16, x, 9, z, 16));
  for (const y of [4, 10]) M.add("lighthouse-red", mat("#c8392f"), cylGeo(2.35 - y * 0.03, 2.45 - y * 0.03, 2.4, x, y, z, 16));
  M.add("lighthouse-top", mat("#fff2b0", { emissive: "#c9a53a" }), cylGeo(1.5, 1.5, 2, x, 18, z, 12));
  M.add("lighthouse-cap", mat("#c8392f", { flat: true }), new THREE.ConeGeometry(2, 2, 12).translate(x, 20, z));
  // boats: each one mesh (a hull with a pointed bow, a deck, a cabin, a mast) that rocks on the water (see update)
  if (STYLED) {
    for (const [bx, bz, rot, c] of BOATS) {
      const hull = new THREE.BoxGeometry(2.2, 0.9, 6); hull.rotateY(rot); hull.translate(bx, 0.1, bz);
      M.add("boat-" + c, mat(c, { flat: true }), hull);
      M.add("boat-cabin", mat("#f4f6f8"), boxGeo(1.4, 0.9, 1.8, 0, 0, 0).rotateY(rot).translate(bx, 1, bz));
      M.add("boat-mast", mat("#ddd"), cylGeo(0.05, 0.05, 5, bx, 3, bz, 5));
    }
  } else for (const b of makeBoats()) group.add(b);
  // beach umbrellas and seagull-free calm
  for (const [ux, uz, c] of [[-80, -67, "#e45b4f"], [-60, -68, "#f2c14e"], [40, -67, "#4a7bb7"], [70, -68, "#e45b4f"]] as [number, number, string][]) {
    M.add("umbrella", mat(c, { flat: true }), new THREE.ConeGeometry(1.6, 0.7, 8).translate(ux, 2.4, uz));
    M.add("umbrella-pole", mat("#ddd"), cylGeo(0.04, 0.04, 2.4, ux, 1.2, uz, 5));
    M.add("towel", mat("#ffffff"), boxGeo(1, 0.03, 1.9, ux + 1, 0.02, uz + 0.5), false);
  }
  void group;
}

function addTransport(M: Merger, col: Colliders, group: THREE.Group, r: () => number) {
  // taxi
  const { x, z, rot } = TAXI;
  const yellow = mat("#f5c518", { flat: true });
  if (!STYLED) group.add(staticColoured(carParts("#f5c518", { taxi: true }).map(([g, c]) => [g.rotateY(rot).translate(x, 0, z), c]), "taxi"));
  else M.add("taxi", yellow, boxGeo(1.9, 0.72, 4.4, 0, 0.66, 0).rotateY(rot).translate(x, 0, z));
  if (STYLED) {
    M.add("taxi", yellow, boxGeo(1.7, 0.6, 2.3, 0, 1.32, -0.1).rotateY(rot).translate(x, 0, z));
    M.add("car-glass", mat("#9ccbe6", { emissive: "#1b3a4c" }), boxGeo(1.72, 0.45, 2.1, 0, 1.32, -0.1).rotateY(rot).translate(x, 0, z), false);
    M.add("taxi-sign", mat("#ffffff", { emissive: "#666600" }), boxGeo(0.7, 0.25, 0.3, 0, 1.75, -0.1).rotateY(rot).translate(x, 0, z));
    M.add("taxi-check", mat("#222"), boxGeo(1.92, 0.12, 4.42, 0, 0.72, 0).rotateY(rot).translate(x, 0, z), false);
    for (const [wx, wz] of [[-0.9, 1.4], [0.9, 1.4], [-0.9, -1.4], [0.9, -1.4]]) {
      M.add("wheel", mat("#222"), cylGeo(0.36, 0.36, 0.3, 0, 0, 0, 10).rotateZ(Math.PI / 2).translate(wx, 0.36, wz).rotateY(rot).translate(x, 0, z));
    }
  }
  col.addBox(x, z, 4.4, 2.1);
  const taxiSign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.5), new THREE.MeshBasicMaterial({ map: textTexture("TAXI", { bg: "#f5c518", fg: "#222", w: 256, h: 96 }) }));
  taxiSign.position.set(126.5, 2.4, 1.2); taxiSign.rotation.y = Math.PI;
  M.add("sign-pole", mat("#9aa5ad"), cylGeo(0.05, 0.05, 2.5, 126.5, 1.25, 1.25, 6));
  group.add(taxiSign);
  // bus stop shelter
  const b = BUS_STOP;
  M.add("bus-shelter", mat("#2f3a40"), boxGeo(3.6, 0.12, 1.6, b.x, 2.6, b.z));
  // the roof rests on two posts at the ends of the back glass (inside its collider, so the sidewalk stays open)
  for (const s of [-1, 1]) M.add("bus-shelter", mat("#2f3a40"), boxGeo(0.1, 2.55, 0.1, b.x + s * 1.75, 1.275, b.z + 0.75));
  M.add("bus-glass", mat("#bfe3f2", { transparent: 0.45 }), boxGeo(3.6, 2.2, 0.06, b.x, 1.4, b.z + 0.75), false);
  M.add("bench", mat("#9c6b43"), boxGeo(2.4, 0.1, 0.45, b.x, 0.5, b.z + 0.4));
  col.addBox(b.x, b.z + 0.75, 3.6, 0.2);
  const busSign = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: textTexture("BUS", { bg: "#1f6f78", fg: "#fff", w: 128, h: 128 }) }));
  busSign.position.set(b.x - 2.2, 2.6, b.z - 0.2);
  M.add("sign-pole", mat("#9aa5ad"), cylGeo(0.05, 0.05, 3, b.x - 2.2, 1.5, b.z - 0.25, 6));
  group.add(busSign);
  // rail tracks and a waiting train south of the station
  for (let tx = -104; tx < 126; tx += 1.2) M.add("sleeper", mat("#6b4f3a"), boxGeo(0.25, 0.12, 2.6, tx, 0.06, 86), false);
  for (const s of [-0.75, 0.75]) M.add("rail", mat("#9aa5ad"), boxGeo(230, 0.14, 0.12, 11, 0.16, 86 + s), false);
  const train = mat("#c0392b", { flat: true });
  for (let i = 0; i < 4; i++) {
    M.add("train", train, boxGeo(14, 3.2, 3, 30 + i * 14.6, 1.9, 86));
    M.add("train-win", mat("#9ccbe6", { emissive: "#1b3a4c" }), boxGeo(12, 0.9, 3.05, 30 + i * 14.6, 2.3, 86), false);
    M.add("train-stripe", mat("#f4f1ea"), boxGeo(14.05, 0.3, 3.05, 30 + i * 14.6, 1.1, 86), false);
  }
  col.addBox(52, 86, 60, 3.2);
  // gas station canopy and pumps
  M.add("gas-canopy", mat("#f4f4f4"), boxGeo(18, 0.6, 9, 112, 5, 5.5));
  M.add("gas-canopy-trim", mat("#d94b3d"), boxGeo(18.1, 0.35, 9.1, 112, 4.6, 5.5));
  for (const px of [104, 110, 116]) {
    M.add("pump", mat("#d94b3d"), boxGeo(0.9, 1.7, 0.6, px, 0.85, 5.5));
    M.add("pump-screen", mat("#1d1d1d", { emissive: "#113322" }), boxGeo(0.5, 0.3, 0.62, px, 1.3, 5.5), false);
    M.add("canopy-post", mat("#d9d9d9"), cylGeo(0.18, 0.18, 4.6, px, 2.3, 3), false);
    col.addBox(px, 5.5, 1.1, 0.8);
  }
  for (let i = 0; i < 3; i++) {
    const n = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: textTexture(String(i + 1), { bg: "#ffffff", fg: "#d94b3d", w: 64, h: 64 }) }));
    n.position.set(104 + i * 6, 1.9, 5.19); n.rotation.y = Math.PI;
    group.add(n);
  }
  // rental cars lot
  for (const [cx, c] of [[78, "#ffffff"], [82, "#4a7bb7"], [86, "#e45b4f"], [90, "#3d3d46"]] as [number, string][]) {
    const body = mat(c, { flat: true });
    M.add("car-" + c, body, boxGeo(1.9, 0.7, 4.2, cx, 0.65, 20));
    M.add("car-" + c, body, boxGeo(1.7, 0.6, 2.2, cx, 1.3, 19.8));
    col.addBox(cx, 20, 2, 4.3);
  }
  void r;
}

/** Advanced song P25: Maggie's cherry-red convertible for sale in her drive on Cedar Lane: the top folded down, cream
 *  seats, chrome bumpers and a "FOR SALE $9,000" sign behind the windshield. */
function addMaggiesCar(M: Merger, col: Colliders, group: THREE.Group) {
  const { x, z, rot } = CONVERTIBLE;
  const at = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(x, 0, z);
  const red = mat("#cf1f3a", { flat: true }), cream = mat("#efe3c8"), chrome = mat("#d8dde2");
  M.add("car-convertible", red, at(boxGeo(1.9, 0.62, 4.3, 0, 0.62, 0)));
  M.add("car-convertible", red, at(boxGeo(1.9, 0.12, 1.45, 0, 0.98, 1.4))); // the hood
  M.add("car-convertible", red, at(boxGeo(1.9, 0.12, 0.9, 0, 0.98, -1.7))); // the trunk
  M.add("car-glass", mat("#9ccbe6", { emissive: "#1b3a4c" }), at(boxGeo(1.66, 0.44, 0.06, 0, 1.2, 0.6)), false);
  for (const sx of [-0.42, 0.42]) M.add("car-seat", cream, at(boxGeo(0.6, 0.5, 0.16, sx, 1.16, -0.3)));
  M.add("car-seat", cream, at(boxGeo(1.5, 0.4, 0.16, 0, 1.1, -1.12)));
  M.add("car-top", mat("#2b2b30"), at(boxGeo(1.6, 0.2, 0.5, 0, 1.13, -1.62))); // the soft top, folded
  for (const sz of [-2.17, 2.17]) M.add("car-chrome", chrome, at(boxGeo(1.96, 0.16, 0.12, 0, 0.42, sz)));
  for (const sx of [-0.62, 0.62]) {
    M.add("car-light", mat("#fff6c8", { emissive: "#6b6440" }), at(boxGeo(0.34, 0.15, 0.06, sx, 0.76, 2.16)), false);
    M.add("car-light-red", mat("#d83a3a"), at(boxGeo(0.34, 0.13, 0.06, sx, 0.78, -2.16)), false);
  }
  for (const [wx, wz] of [[-0.9, 1.35], [0.9, 1.35], [-0.9, -1.35], [0.9, -1.35]]) {
    M.add("wheel", mat("#222"), cylGeo(0.36, 0.36, 0.3, 0, 0, 0, 10).rotateZ(Math.PI / 2).translate(wx, 0.36, wz).rotateY(rot).translate(x, 0, z));
  }
  col.addBox(x, z, Math.abs(Math.cos(rot)) * 2 + Math.abs(Math.sin(rot)) * 4.4, Math.abs(Math.sin(rot)) * 2 + Math.abs(Math.cos(rot)) * 4.4);
  // the sign on the windshield, read from the street
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.32), new THREE.MeshBasicMaterial({ map: textTexture("FOR SALE $9,000", { bg: "#fffaf0", fg: "#c0182f", w: 384, h: 128, script: true }) }));
  const off = new THREE.Vector3(0.25, 1.15, 0.645).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  sign.position.set(x + off.x, off.y, z + off.z);
  sign.rotation.y = rot;
  group.add(sign);
}

function addBackyard(M: Merger, col: Colliders, group: THREE.Group) {
  // Sophie's backyard party: fence, string lights, grill, table
  const bx = -54, bz = 64;
  for (let i = -8; i <= 8; i += 0.5) {
    for (const zz of [bz + 6.5]) M.add("fence", mat("#ffffff"), boxGeo(0.1, 1.2, 0.06, bx + i, 0.6, zz));
  }
  // side fences; the east one has an open garden gate (z bz-4.6 … bz-1.2) reached along the side of the house
  const gate0 = bz - 4.6, gate1 = bz - 1.2;
  for (let j = -5.5; j <= 6.5; j += 0.5) for (const xx of [bx - 8, bx + 8]) {
    if (xx > bx && bz + j > gate0 && bz + j < gate1) continue;
    M.add("fence", mat("#ffffff"), boxGeo(0.06, 1.2, 0.1, xx, 0.6, bz + j));
  }
  col.addBox(bx, bz + 6.5, 16.2, 0.2); col.addBox(bx - 8, bz + 0.5, 0.2, 12);
  col.addBox(bx + 8, (bz - 5.5 + gate0) / 2, 0.2, gate0 - (bz - 5.5));
  col.addBox(bx + 8, (gate1 + bz + 6.5) / 2, 0.2, bz + 6.5 - gate1);
  // gate arch with balloons, so the party is easy to spot from Oak Avenue
  for (const gz of [gate0, gate1]) M.add("gate-post", mat("#ffffff"), boxGeo(0.16, 2.5, 0.16, bx + 8, 1.25, gz));
  M.add("gate-post", mat("#ffffff"), boxGeo(0.16, 0.16, gate1 - gate0 + 0.16, bx + 8, 2.5, (gate0 + gate1) / 2));
  const balloonCols = ["#e84a5f", "#ffd166", "#4a7bb7", "#6fbf73", "#b56576", "#f7a072"];
  balloonCols.forEach((c, i) => {
    const gz = i < 3 ? gate0 : gate1, a = (i % 3) * 2.1;
    const x = bx + 8 + Math.cos(a) * 0.28, y = 2.9 + (i % 3) * 0.22, z = gz + Math.sin(a) * 0.28;
    M.add("balloon-" + c, mat(c), new THREE.SphereGeometry(0.26, 10, 8).scale(1, 1.2, 1).translate(x, y, z));
  });
  // a little sign in the front garden pointing to the party
  M.add("sign-pole", mat("#8a6a4a"), cylGeo(0.05, 0.05, 1.3, bx + 7.6, 0.65, bz - 18.4, 6));
  const partySign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.5), new THREE.MeshBasicMaterial({ map: textTexture("Party → backyard", { bg: "#fff6e0", fg: "#b5485d", w: 384, h: 128 }) }));
  partySign.position.set(bx + 7.6, 1.35, bz - 18.47);
  partySign.rotation.y = Math.PI;
  group.add(partySign);
  M.add("grill", mat("#2d2d2d"), boxGeo(1.2, 0.9, 0.7, bx + 4.5, 0.9, bz + 3.5));
  col.addBox(bx + 4.5, bz + 3.5, 1.3, 0.8);
  M.add("party-table", mat("#f2efe8"), boxGeo(3, 0.1, 1.2, bx - 3, 0.85, bz + 2));
  M.add("party-table", mat("#7a5a3a"), boxGeo(2.8, 0.8, 1, bx - 3, 0.4, bz + 2));
  col.addBox(bx - 3, bz + 2, 3.1, 1.3);
  const bulbMat = mat("#fff3b0", { emissive: "#b89a2e" });
  for (let i = 0; i < 18; i++) {
    const t = i / 17;
    const x = bx - 7.5 + t * 15, y = 3.2 - Math.sin(t * Math.PI) * 0.6;
    M.add("bulbs", bulbMat, new THREE.SphereGeometry(0.09, 6, 4).translate(x, y, bz - 0.5), false);
    M.add("bulbs", bulbMat, new THREE.SphereGeometry(0.09, 6, 4).translate(x, y, bz + 4.5), false);
  }
  for (const [px, pz] of [[bx - 7.6, bz - 0.5], [bx + 7.6, bz - 0.5], [bx - 7.6, bz + 4.5], [bx + 7.6, bz + 4.5]]) M.add("canopy-post", mat("#8a6a4a"), cylGeo(0.06, 0.06, 3.3, px, 1.65, pz, 6));
}

function makeClouds(group: THREE.Group, r: () => number) {
  const clouds: THREE.Group[] = [];
  const cm = STYLED ? cloudMaterial() : new THREE.MeshLambertMaterial({ color: "#ffffff", emissive: "#bcc9d4", flatShading: true });
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const size = 4 + r() * 4;
      const s = new THREE.Mesh(STYLED ? cloudPuff(size) : new THREE.IcosahedronGeometry(size, 0), cm);
      s.position.set(k * 5 - 7, r() * 2, r() * 3);
      s.scale.y = 0.55;
      g.add(s);
    }
    if (IS_REAL) g.visible = false; // the realistic sky paints its own clouds
    g.position.set(-200 + r() * 460, 55 + r() * 25, -160 + r() * 300);
    g.userData.v = 0.6 + r() * 0.8;
    group.add(g);
    clouds.push(g);
  }
  return clouds;
}

export { roundRect };
