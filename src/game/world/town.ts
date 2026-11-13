// Builds the outdoor town of Maple Harbor from layout.ts: ground, sea, buildings, props, colliders, doors.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BUILDINGS, ROADS, SIDEWALK, WORLD, STALLS, TAXI, BUS_STOP, FOUNTAIN, LIGHTHOUSE, PARK, SQUARE, BEACH_Z, SEA_Z, PARKED_CARS, CONVERTIBLE, CEDAR_DRIVE, SPROUTLY_LOT, type BuildingDef } from "./layout";
import { Merger, mat, boxGeo, cylGeo, textTexture, rand, Colliders, roundRect, colourMerge } from "./util";
import { carParts, vochoParts, mxTaxiParts } from "./car";
import { THEME, type TianguisGoods } from "./theme";
import * as MX from "./mexican";
import { LOCATIONS } from "../../content/locations";
import { STYLED, IS_REAL, grade } from "../style";
import { SHORE, sandY, SAND_GLSL, SHORE_GLSL, SWELL_GLSL } from "../water";
import { GROUND_BLOCKS, groundPalette, groundExtras, groundMaterial, seaMaterial, trunkGeometry, canopyGeometry, canopyMaterial, bushGeometry, bushMaterial, outlineInstanced, cloudMaterial, cloudPuff } from "./styled";

export interface Door { loc: string; bid: string; x: number; z: number; face: "n" | "s" | "e" | "w"; name: string; outX: number; outZ: number; rot: number }

/** A place to sit (the café chairs and the benches): the seat's top `y`, facing `rot`; a café chair's table. */
export interface Seat {
  x: number; z: number; rot: number; y: number; table?: [number, number];
  /** A lounger (the Spanish edition's palapas): whoever sits here lies back this far (radians from upright). */
  recline?: number;
}

export interface Town {
  group: THREE.Group;
  colliders: Colliders;
  doors: Door[];
  /** Where townspeople can sit (Ambient seats some of them). */
  seats: Seat[];
  groundCanvas: HTMLCanvasElement;
  /** `cam`: where the camera is (the edition's small things far from it are left out: theme.ts `farHide`). */
  update(t: number, dt: number, cam?: THREE.Vector3): void;
  walkableAt(x: number, z: number): boolean;
  /** (theme.ts `casas`, graphics round 6) the houses' portals overhead (their slab and the terrace's railing on it): the
   *  conversation's camera treats a line through one as hidden (Game.ts fitTalk). Empty in Maple Harbor. */
  portals: { minX: number; maxX: number; minZ: number; maxZ: number; y0: number; y1: number }[];
}

const PPM = 6; // ground texture pixels per metre
const GW = WORLD.maxX - WORLD.minX, GD = WORLD.maxZ - SEA_Z + 2;
const G0Z = SEA_Z - 2;
/** Open grass between the town's west edge and the foot of the hills beyond it (m). */
const WEST_MEADOW = 40;
/** The follow camera can stand 22 m behind a player at any boundary. Keep the backdrop beyond that arm,
 *  including south of Station Road and behind the airport, where a 6 m gap looked like a green wall. */
export const HILL_MARGIN = 40;
/** How far a hill's footprint (centre, half-sizes) stays from the town's ground; negative when it reaches onto it. */
function hillGap(x: number, z: number, fx: number, fz: number) {
  const gx = Math.max(WORLD.minX - (x + fx), x - fx - WORLD.maxX), gz = Math.max(G0Z - (z + fz), z - fz - WORLD.maxZ);
  return gx > 0 && gz > 0 ? Math.hypot(gx, gz) : Math.max(gx, gz);
}

/** Moves only distant scenery, preserving the random sequence used for the town's other details. */
export function backgroundHillPosition(x: number, z: number, fx: number, fz: number) {
  const ox = x - 35, oz = z - 30, gap = x < WORLD.minX ? WEST_MEADOW : HILL_MARGIN;
  let k = 1;
  while (hillGap(x, z, fx, fz) < gap && k < 4) { k += 0.02; x = 35 + ox * k; z = 30 + oz * k; }
  return { x, z };
}

export function buildTown(): Town {
  const group = new THREE.Group();
  group.name = "town";
  const colliders = new Colliders();
  const doors: Door[] = [];
  const M = THEME.townMerge && !STYLED ? new TownMerger(THEME.townMerge) : new Merger();
  const r = rand(7);
  sprays.length = 0; // a new game builds a new town
  seats.length = 0;
  details.length = 0;
  displays.length = 0;
  displayGlass.length = 0;
  displayParts = {};
  mx.length = 0;
  mxFlat.length = 0;
  wires.length = 0;
  mxFar.length = 0;
  portals.length = 0;
  mxRoofs.length = 0;
  poleParts.length = 0;
  farHidden.length = 0;
  beachPalms.length = 0;
  atlas = new MX.SignAtlas();

  // --- ground -------------------------------------------------------------
  const groundCanvas = drawGround();
  const gtex = new THREE.CanvasTexture(groundCanvas);
  gtex.colorSpace = THREE.SRGBColorSpace;
  gtex.anisotropy = 8;
  const ground = new THREE.Mesh(groundGeometry(), STYLED ? groundMaterial(gtex) : withGrain(new THREE.MeshLambertMaterial({ map: gtex }), THEME.adoquin ? adoquinMaps(THEME.adoquin.streets) : null));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(WORLD.minX + GW / 2, 0, G0Z + GD / 2);
  ground.receiveShadow = true;
  ground.name = "ground";
  group.add(ground);

  // outer grass beyond the playable area + hills
  const outer = new THREE.Mesh(outerGeometry(), mat("#7fb85e"));
  outer.rotation.x = -Math.PI / 2;
  // the outer grass stops at the shore, so the sea near the beach is not hidden under it
  outer.position.set(35, -0.05, SEA_Z + 1 + 320);
  outer.receiveShadow = true;
  group.add(outer);
  // (round the edition's town, theme.ts `selva`, low rises in the jungle's green instead: the same random draws)
  const hillMat = mat(THEME.selva?.hills ?? "#79ad5a", { flat: true });
  const hillK = THEME.selva ? 0.36 : 1;
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 1.2 - 0.1;
    let hx = 35 + Math.cos(a) * (230 + r() * 60), hz = 30 + Math.sin(a) * (170 + r() * 50);
    if (hz < SEA_Z + 10) continue;
    const s = 30 + r() * 40;
    // west of the town a hill stands back behind a meadow, so the ends of Main Street, Oak Avenue and the other streets
    // look out over grass to the hills instead of into a slope: it moves further out along the arc (the random numbers
    // stay the same, and so does everything after them)
    // elsewhere the camera also needs room between the playable ground and the distant scenery
    {
      const p = backgroundHillPosition(hx, hz, 1.6 * s, 1.2 * s);
      hx = p.x; hz = p.z;
    }
    const g = new THREE.IcosahedronGeometry(s, 1);
    // Low rolling hills leave sky above them in the narrow phone view, rather than a tall flat green face (Puerto
    // Colibrí's selva hills keep their own, lower heights).
    g.scale(1.6, THEME.selva ? (0.45 + r() * 0.3) * hillK : 0.28 + r() * 0.12, 1.2);
    g.translate(hx, -s * 0.15, hz);
    M.add("hills", hillMat, g, false, true);
  }
  if (THEME.selva) group.add(makeSelva());

  // --- sea ------------------------------------------------------------------
  const seaMat = STYLED ? seaMaterial() : new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFog: { value: new THREE.Color("#cfe8f5") } },
    vertexShader: `varying vec2 vUv; varying vec3 vW; uniform float uTime;
      void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0);
        w.y += ${SWELL_GLSL}; vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec2 vUv; varying vec3 vW; uniform float uTime; uniform vec3 uFog;
      ${SAND_GLSL}
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
        // the sand under the shallows, the foam along the waterline as it washes up and down the beach (water.ts)
        ${SHORE_GLSL()}
        float dist = length(vW.xz - cameraPosition.xz);
        c = mix(c, uFog, smoothstep(160.0, 420.0, dist));
        gl_FragColor = vec4(c, 1.0); }`,
  });
  // this edition's own sea colors (theme.ts `sea`): Maple Harbor's shader above is left exactly as it is
  if (THEME.sea && seaMat instanceof THREE.ShaderMaterial && !STYLED) seaMat.fragmentShader = seaColors(THEME.sea);
  // (and its far water fading into this edition's fog, theme.ts `light`)
  if (THEME.light && seaMat instanceof THREE.ShaderMaterial && !STYLED) seaMat.uniforms.uFog.value.set(THEME.light.fog);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 320, 90, 32), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(35, -0.25, SEA_Z - 158);
  group.add(sea);

  // --- buildings --------------------------------------------------------------
  const signs: THREE.Mesh[] = [];
  for (const b of BUILDINGS) buildBuilding(themed(b), M, colliders, doors, signs, group, b.seed !== undefined ? rand(b.seed) : r, b.roof);

  // --- street furniture & nature -----------------------------------------------
  addStreetProps(M, colliders, group, r);
  addTrees(group, colliders, r);
  addSquareAndMarket(M, colliders, group, r);
  // the edition's own additions (theme.ts): none in Maple Harbor
  addTownMx(M, colliders);
  if (THEME.papelPicado.length) group.add(makePapelPicado());
  if (THEME.palms.length || beachPalms.length) group.add(makePalms(colliders, beachPalms));
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
  // ("sea": the passers-by and the way-finding stop at it; the player wades in to the shore's limit, Game.ts)
  colliders.addBox((WORLD.minX - 4 + -41.3) / 2, SEA_Z - 30, -41.3 - (WORLD.minX - 4), 60, "sea");
  colliders.addBox((-18.7 + WORLD.maxX + 4) / 2, SEA_Z - 30, WORLD.maxX + 4 - -18.7, 60, "sea");

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
  for (const [part, list] of Object.entries(displayParts)) {
    const goods = new THREE.Mesh(colourMerge(list), displayMaterial());
    goods.receiveShadow = true;
    goods.name = "shop-windows-" + part;
    group.add(goods);
  }
  if (!displays.length && displayGlass.length) group.add(new THREE.Mesh(mergeGeometries(displayGlass, false)!, displayGlassMaterial()));
  // the edition's outdoor pieces (mexican.ts) as one mesh, and their signs as another: none in Maple Harbor
  // (theme.ts `regions`: a mesh for each part of town)
  if (M instanceof TownMerger) {
    // (theme.ts `townMerge`: the edition's pieces in the town's squares too, each drawn only where it is in view)
    M.addParts(mx, "cast"); M.addParts(mxFlat, "still"); M.addParts(mxFar, "still"); M.addParts(wires, "thin"); M.addParts(mxRoofs, "thinCast");
  } else {
    if (mx.length) group.add(staticColoured(mx, "town-mx"));
    if (mxFlat.length) { const m = staticColoured(mxFlat, "town-mx-small"); m.castShadow = false; group.add(m); }
    // (theme.ts `regions`: what stands at the town's far ends in a mesh of its own, drawn only where it is in view; and
    // the overhead lines in a western and an eastern half)
    if (mxFar.length) { const m = staticColoured(mxFar, "town-mx-far"); m.castShadow = false; group.add(m); }
    if (mxRoofs.length) { const m = staticColoured(mxRoofs, "town-mx-roofs"); m.userData.thin = true; group.add(m); }
    for (const half of ["w", "e"]) {
      const list = wires.filter(([g]) => (g.boundingSphere ?? (g.computeBoundingSphere(), g.boundingSphere!)).center.x < 0 === (half === "w"));
      if (list.length) { const m = staticColoured(list, "cables-" + half); m.castShadow = false; m.userData.thin = true; group.add(m); }
    }
  }
  if (poleParts.length && THEME.poleFade) {
    // (theme.ts `poleFade`) the poles dissolve within a few metres of the camera, as the lamps do nearer, and the walking
    // camera looks through them (thin): they no longer sweep through the picture as grey bars
    const [near, far] = THEME.poleFade, m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    m.onBeforeCompile = (sh) => nearFadeShader(sh, near, far);
    m.customProgramCacheKey = () => `nearfade-${near}-${far}`;
    const poles = new THREE.Mesh(colourMerge(poleParts), m);
    poles.name = "cable-poles";
    poles.castShadow = poles.receiveShadow = true;
    poles.userData.thin = true;
    poles.matrixAutoUpdate = false;
    poles.updateMatrix();
    group.add(poles);
  }
  const signsMesh = atlas!.build();
  // (theme.ts `townMerge`: the signs drawn after the town's squares, so that one painted on a surface, a coach's
  // destination over its windshield, stays in front of it)
  if (signsMesh && M instanceof TownMerger) signsMesh.renderOrder = 1;
  if (signsMesh) group.add(signsMesh);
  M.build(group);
  // the gas station's canopy: looked through by the camera (cutout.ts) rather than a roof it must stay under, or under
  // it, at the store's door, the camera has nowhere to go but behind the player's head (Game.ts's field skips it)
  for (const o of group.children) if (/^gas-canopy/.test(o.name)) o.userData.thin = true;

  const clouds = makeClouds(group, r);
  const boats = group.children.filter((o) => o.userData.boat);
  const gulls = STYLED ? [] : makeGulls(group);

  return {
    group, colliders, doors, seats: [...seats], groundCanvas, portals: [...portals],
    update(t, dt, cam) {
      seaMat.uniforms.uTime.value = t;
      if (cam) for (const f of farHidden) f.mesh.visible = (cam.x - f.x) ** 2 + (cam.z - f.z) ** 2 < f.r * f.r;
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

/** The ground: flat, but for its last metres at the sea, where the sand slopes down under the water (water.ts sandY:
 *  the sea then meets real sand, and its swell washes up and down it). A strip of small quads there, one big one for
 *  the rest; laid out as PlaneGeometry lays its own (the mesh is turned flat), with the same texture coordinates. */
function groundGeometry() {
  const zs = [WORLD.maxZ], x0 = WORLD.minX, z0 = G0Z;
  for (let z = SHORE.top + 0.9; z > z0 + 1e-3; z -= 0.45) zs.push(z);
  zs.push(z0);
  const nx = Math.round(GW / 3), pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const cx = x0 + GW / 2, cz = z0 + GD / 2;
  for (const z of zs) for (let i = 0; i <= nx; i++) {
    const x = x0 + (GW * i) / nx;
    pos.push(x - cx, -(z - cz), sandY(x, z));
    uv.push((x - x0) / GW, 1 - (z - z0) / GD);
  }
  for (let k = 0; k + 1 < zs.length; k++) for (let i = 0; i < nx; i++) {
    const a = k * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** The grass beyond the town (900 × 640 m, laid out as PlaneGeometry lays its own), cut back from the sea along the
 *  town's own beach, where the ground's sand slopes down below it (groundGeometry). */
function outerGeometry() {
  const back = 2.6, x0 = WORLD.minX + 1 - 35, x1 = WORLD.maxX - 1 - 35;
  return mergeGeometries([
    new THREE.PlaneGeometry(900, 640 - back).translate(0, -back / 2, 0),
    new THREE.PlaneGeometry(x0 + 450, back).translate((x0 - 450) / 2, 320 - back / 2, 0),
    new THREE.PlaneGeometry(450 - x1, back).translate((x1 + 450) / 2, 320 - back / 2, 0),
  ], false)!;
}

function toC(x: number, z: number): [number, number] { return [(x - WORLD.minX) * PPM, (z - G0Z) * PPM]; }

/** The sea's fragment shader in this edition's colors (theme.ts `sea`): the same waves, chop, glints and fog as Maple
 *  Harbor's, over bands of color from the shore out (the sand showing through at the edge, a turquoise shallow, aqua,
 *  then deep blue), light rippling over the shallows' floor, and a whiter, wider line of foam. */
function seaColors(s: NonNullable<typeof THEME.sea>) {
  const v = (hex: string) => `vec3(${[1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(",")})`;
  const f = (n: number) => n.toFixed(1);
  return `varying vec2 vUv; varying vec3 vW; uniform float uTime; uniform vec3 uFog;
      ${SAND_GLSL}
      void main(){
        float d = ${f(SEA_Z + 1)} - vW.z;
        vec3 c = mix(${v(s.shore)}, ${v(s.shallow)}, smoothstep(0.0, 6.0, d));
        c = mix(c, ${v(s.mid)}, smoothstep(${f(s.shallowTo * 0.55)}, ${f(s.shallowTo)}, d));
        c = mix(c, ${v(s.deep)}, smoothstep(${f(s.midTo * 0.6)}, ${f(s.midTo)}, d));
        float shallows = 1.0 - smoothstep(${f(s.shallowTo * 0.5)}, ${f(s.midTo)}, d);
        float w = sin(vW.x*0.35 + uTime*1.3 + sin(vW.z*0.2)) * sin(vW.z*0.42 - uTime*1.1);
        c += vec3(0.08) * smoothstep(0.5, 1.0, w);
        c -= vec3(0.04, 0.05, 0.04) * smoothstep(0.45, 1.0, -w) * (1.0 - 0.5 * shallows);
        float chop = sin(vW.x*1.1 - uTime*1.7 + sin(vW.z*0.9)) * sin(vW.z*1.3 + uTime*1.4);
        c += vec3(0.035) * chop;
        float caustic = sin(vW.x*1.6 + sin(vW.z*1.2 + uTime*0.9)*1.5) * sin(vW.z*1.8 + sin(vW.x*1.1 - uTime*0.7)*1.5);
        c += vec3(0.07, 0.09, 0.08) * smoothstep(0.55, 1.0, caustic) * shallows;
        float glint = pow(max(0.0, sin(vW.x*2.1 + uTime*2.4) * sin(vW.z*1.7 - uTime*2.0) * sin(vW.x*0.5 - vW.z*0.6 + uTime)), 18.0);
        c += vec3(0.55) * glint * (0.4 + 0.6 * smoothstep(0.0, 15.0, d));
        // the sand under the shallows and the foam along the waterline, as it washes up and down the beach (water.ts)
        ${SHORE_GLSL("vec3(0.99,0.99,0.98)", "vec3(0.87, 0.81, 0.67)")}
        float dist = length(vW.xz - cameraPosition.xz);
        c = mix(c, uFog, smoothstep(160.0, 420.0, dist));
        gl_FragColor = vec4(c, 1.0); }`;
}

/** The town's clock for the shaders that move (the trees' wind, the clouds' shadows). */
const wind = { value: 0 };

/** The ground's colours times a fine tiling grain (specks and soft blotches around mid grey, 4 m a tile): up close the
 *  asphalt, sand and grass get texture instead of the blur of their 6 px/m map; far away it averages out. */
/** (theme.ts `adoquin`, graphics round 5) The cobbles: a 2 m tile of grey and rose stones laid in courses across the
 *  street with dark joints, and where they are (a mask over the ground, its map's layout, 3 px a metre). */
function adoquinMaps(streets: [number, number, number, number][]) {
  const S = 256, c = document.createElement("canvas");
  c.width = c.height = S;
  const x = c.getContext("2d")!, r = rand(77);
  x.fillStyle = "#6f6558"; x.fillRect(0, 0, S, S);
  // courses 0.25 m deep (32 px), stones 0.28–0.4 m long, each course's joints offset; a stone a shade of grey or rose
  const tones = ["#b8ae9e", "#aea392", "#c2b6a3", "#b3a596", "#c4a99a", "#a99d8c", "#bdb2a2", "#c9b2a0"];
  for (let row = 0; row < S / 32; row++) {
    let u = -((row * 47) % 40);
    while (u < S) {
      const len = 36 + Math.floor(r() * 16);
      const t = tones[Math.floor(r() * tones.length)];
      for (const ox of [-S, 0, S]) {
        x.fillStyle = t;
        const x0 = u + ox + 2, y0 = row * 32 + 2, w = len - 4, h = 28;
        x.beginPath(); x.roundRect(x0, y0, w, h, 5); x.fill();
        // worn top: a lighter middle, a darker lower edge
        x.fillStyle = "rgba(255,255,255,0.08)"; x.beginPath(); x.roundRect(x0 + 4, y0 + 3, w - 8, h * 0.45, 4); x.fill();
        x.fillStyle = "rgba(0,0,0,0.10)"; x.fillRect(x0 + 2, y0 + h - 5, w - 4, 4);
      }
      u += len;
    }
  }
  const tile = new THREE.CanvasTexture(c);
  tile.colorSpace = THREE.SRGBColorSpace;
  tile.wrapS = tile.wrapT = THREE.RepeatWrapping;
  tile.anisotropy = 8;
  const K = 3, mc = document.createElement("canvas");
  mc.width = Math.round(GW * K); mc.height = Math.round(GD * K);
  const mx2 = mc.getContext("2d")!;
  mx2.fillStyle = "#000"; mx2.fillRect(0, 0, mc.width, mc.height);
  mx2.fillStyle = "#fff";
  for (const [x0, z0, x1, z1] of streets) {
    const [a, b] = toC(Math.min(x0, x1), Math.min(z0, z1)), [c2, d] = toC(Math.max(x0, x1), Math.max(z0, z1));
    mx2.fillRect(a / PPM * K, b / PPM * K, (c2 - a) / PPM * K, (d - b) / PPM * K);
  }
  const mask = new THREE.CanvasTexture(mc);
  return { tile, mask };
}

function withGrain(m: THREE.MeshLambertMaterial, ado: { tile: THREE.Texture; mask: THREE.Texture } | null = null) {
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
  if (ado) {
    // (theme.ts `adoquin`) the cobbles over the ground's colour where the mask says, then the grain and the clouds' shade
    // as everywhere
    m.onBeforeCompile = (sh) => {
      grainShader(sh);
      sh.uniforms.adoMap = { value: ado.tile };
      sh.uniforms.adoMask = { value: ado.mask };
      sh.fragmentShader = sh.fragmentShader.replace("uniform sampler2D grainMap;", "uniform sampler2D grainMap;\nuniform sampler2D adoMap;\nuniform sampler2D adoMask;")
        .replace("#include <map_fragment>\n", "#include <map_fragment>\n        diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(adoMap, vGrainUv * 2.0).rgb, texture2D(adoMask, vMapUv).r);\n");
    };
    m.customProgramCacheKey = () => "ground-adoquin";
    return m;
  }
  m.onBeforeCompile = grainShader;
  return m;
  function grainShader(sh: THREE.WebGLProgramParametersWithUniforms) {
    sh.uniforms.grainMap = { value: grain };
    sh.uniforms.cloudMap = { value: clouds };
    sh.uniforms.uWind = wind;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vGrainUv;\nvarying float vWet;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvec4 grainW = modelMatrix * vec4(transformed, 1.0);\nvGrainUv = grainW.xz / 4.0;\nvWet = grainW.y;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D grainMap;\nuniform sampler2D cloudMap;\nuniform float uWind;\nvarying vec2 vGrainUv;\nvarying float vWet;")
      .replace("#include <map_fragment>", `#include <map_fragment>
        diffuseColor.rgb *= 0.78 + 0.44 * texture2D(grainMap, vGrainUv).r;
        // the sand going down to the water: wet, darker (the sea's own shader takes over under the surface)
        diffuseColor.rgb *= mix(vec3(1.0), vec3(0.80, 0.76, 0.69), smoothstep(-0.015, -0.19, vWet));
        float cloud = texture2D(cloudMap, (vGrainUv * 4.0 + vec2(uWind * 1.3, uWind * 0.55)) / 110.0).a;
        diffuseColor.rgb *= 1.0 - 0.17 * smoothstep(0.3, 0.85, cloud);`);
  }
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
        const kerb = (a: number, b: number) => { const [cx, cz] = at((a + b) / 2, side); return new THREE.BoxGeometry(horiz ? b - a : 0.14, 0.07, horiz ? 0.14 : b - a).translate(cx, 0.035, cz); };
        // (the edition's streets, theme.ts `streetPaint`: the curb painted yellow near the crossings, in its own mesh)
        const paint = THEME.streetPaint, c = paint ? Math.min(paint.corner, (end - start) / 2) : 0;
        if (paint) for (const [a, b] of [[start, start + c], [end - c, end]]) mxFlat.push([kerb(a, b).scale(1, 1.02, 1.04), paint.color]);
        if (end - start - 2 * c > 0.01) parts.curb.push(kerb(start + c, end - c));
      };
      for (let u = a; u <= b; u += 1) {
        const [px, pz] = at(Math.min(u + 0.5, b), side);
        if (free(px, pz)) { if (start === null) start = u; } else { flush(u); start = null; }
      }
      flush(b);
    }
    // white edge lines half a metre in from each side, in 1 m pieces that leave out the crossings (none on the edition's
    // streets, theme.ts `streetPaint`)
    for (const side of THEME.streetPaint ? [] : [-(rd.w / 2 - 0.5), rd.w / 2 - 0.5]) {
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
  // the malecón's paving joints (theme.ts): across the walk every 1.5 m, and a line along it
  if (THEME.malecon) {
    const z0 = MX.MALECON.z + 0.25, z1 = -62.7;
    const { x0, x1 } = MX.MALECON;
    for (let gx = x0 + 0.75; gx < x1 + 2; gx += 1.5) quad("plaza", gx, (z0 + z1) / 2, 0.05, z1 - z0);
    quad("plaza", (x0 + x1 + 2) / 2, (z0 + z1) / 2, x1 + 2 - x0, 0.06);
  }
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
  // the malecón's paving, from the sidewalk to the sea side of its wall (theme.ts; the tiles' joints: addMarkings)
  if (THEME.malecon) rectW(x, MX.MALECON.x0, MX.MALECON.z - 0.25, MX.MALECON.x1 + 2, -62.7, "#e8dfca");
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

function buildBuilding(b: BuildingDef, M: Merger, col: Colliders, doors: Door[], signs: THREE.Mesh[], group: THREE.Group, r: () => number, baseRoof = b.roof) {
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
  if (b.roof === "palapa") MX.palapaRoof(mx, b.x, b.z, b.w, b.d, b.h); // (theme.ts: El Muelle's thatch)
  else if (b.style === "warehouse") {
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
    // Mexican roofs (theme.ts) are painted red (one material for all of them), and all but the airport's and the
    // office tower's get a parapet and tinacos
    const mxRoof = !!THEME.mexican && b.style !== "terminal" && b.style !== "office";
    // (a Mexican roof's paint shows: above the cornice's top, which covers Maple Harbor's slab)
    M.add("roof-flat", mat(THEME.mexican?.roof ?? "#8f8c86"), boxGeo(b.w - 0.4, 0.1, b.d - 0.4, b.x, b.h + (THEME.mexican ? 0.23 : 0.02), b.z), false);
    // a box on most low roofs, from the town's own random numbers (only on roofs that layout.ts has flat, so the
    // draws stay the same whatever roofs an edition gives the houses); a Mexican roof has a tinaco there instead
    let roofBox: [number, number] | null = null;
    if (baseRoof !== "gable" && r() < 0.7 && b.h < 14) {
      roofBox = [b.x + (r() - 0.5) * b.w * 0.5, b.z + (r() - 0.5) * b.d * 0.4];
      if (!mxRoof) M.add("roof-box", mat("#a6a39c"), boxGeo(2.2, 1.2, 1.6, roofBox[0], b.h + 0.6, roofBox[1]));
    }
    // what a flat roof carries: a few vents, a hatch, an air-conditioning unit with its fan, and on a taller block a
    // water tank on legs (kept back from the edges); in Mexico a parapet round it and tinacos (theme.ts)
    const spot = (m = 1.6): [number, number] => [b.x + (dr() - 0.5) * Math.max(0, b.w - 2 * m), b.z + (dr() - 0.5) * Math.max(0, b.d - 2 * m)];
    if (mxRoof) {
      const tanks: [number, number][] = roofBox ? [roofBox] : [];
      const want = b.w * b.d > 260 ? 3 : b.w * b.d > 150 ? 2 : 1;
      for (let k = 0; k < 12 && tanks.length < want; k++) {
        const p = spot(2);
        if (tanks.every(([tx, tz]) => Math.hypot(p[0] - tx, p[1] - tz) > 2.6)) tanks.push(p);
      }
      MX.parapetAndTinacos(mxFlat, b, tanks); // (their shadows fall on roofs nobody sees from the street)
    } else {
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
  }

  // door
  const doorOff = b.doorOffset ?? 0;
  const dx = b.x + n[0] * halfDepth + t[0] * doorOff, dz = b.z + n[1] * halfDepth + t[1] * doorOff;
  const doorW = b.doorWidth ?? (b.style === "terminal" || b.style === "station" || b.style === "museum" || b.style === "hotel" ? 3.4 : 1.8);
  const rotY = Math.atan2(n[0], n[1]);
  const doorMat = b.style === "house" ? mat(b.trim === "#ffffff" || THEME.mexican ? "#8a5a44" : b.trim!) : darkGlass;
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
  const shop = THEME.tiendita?.building === b.id ? THEME.tiendita : null;
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
        // …and a corner shop's front (theme.ts) the ground floor where it is
        if (shop && isFront && f === 0 && Math.abs(o - shop.u) < shop.w / 2 + 0.6) continue;
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
        // (theme.ts `lean`: the pane's front face alone, where the box's front was)
        const pane = THEME.lean ? new THREE.PlaneGeometry(ww, wh).translate(0, 0, 0.04) : boxGeo(ww, wh, 0.08, 0, 0, 0);
        M.add("glass", b.style === "office" ? darkGlass : glassMat, pane.rotateY(rot).translate(wx, y - (bigShop ? 0.35 : 0), wz));
        // a flower box under each of a house's front windows downstairs
        if (b.style === "house" && isFront && f === 0 && !STYLED && !THEME.mexican) {
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
          // iron bars on the ground floor's front windows (theme.ts), and on a house's all round
          if (THEME.mexican && f === 0 && !bigShop && (isFront || b.style === "house") && BARRED.has(b.style)) MX.windowBars(mxFlat, (g) => g.rotateY(rot).translate(wx, cy, wz), ww, wh);
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
    // a shop's sign painted by hand in a Mexican town (theme.ts), else a printed board; (theme.ts `signLines`) a long
    // name painted big over a smaller line, on a taller board
    const painted = THEME.mexican && (b.style === "shop" || b.style === "restaurant");
    const lines = painted ? THEME.buildings[b.id]?.signLines : undefined;
    const tex = painted
      ? MX.paintedSignTexture(lines?.[0] ?? b.sign, b.trim ?? "#333", "#fff6dc", new THREE.Color(b.trim ?? "#333").multiplyScalar(0.5).getStyle(), lines?.[1])
      : textTexture(b.sign, { bg: "#fffaf0", fg: signInk(b), border: b.trim, w: 768, h: 160 });
    const sw = Math.min(halfWidth * 2 - 1.5, Math.max(5, lines ? lines[0].length * 0.78 : b.sign.length * 0.55));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(sw, sw * (lines ? 256 : 160) / 768), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
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
    // (the words a line each down the banner, big enough to read from the street: one line across it was too small)
    const banner = textTexture(townSign("The Colors of the Night"), { bg: "#2b2d6e", fg: "#ffd166", w: 256, h: 512, lines: 4 });
    for (const s of [-1, 1]) {
      const bm = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.2), new THREE.MeshBasicMaterial({ map: banner }));
      // (hung clear of the upper windows' sills, which crossed its words)
      bm.position.set(dx + t[0] * s * 9.5 + n[0] * 0.2, 5.2, dz + t[1] * s * 9.5 + n[1] * 0.2);
      bm.rotation.y = rotY;
      group.add(bm);
    }
  }
  if (b.style === "hotel") {
    // (the edition's merger has the walking camera look through the hotel's canopy and its posts: graphics round 6)
    const tm = THEME.townMerge ? "hotel-" : "";
    M.add(tm + "canopy", mat("#8a2f3b"), boxGeo(8, 0.35, 4, 0, 3.4, 0).rotateY(rotY).translate(dx + n[0] * 2, 0, dz + n[1] * 2));
    for (const s of [-1, 1]) {
      M.add(tm + "canopy-post", mat("#c8a86a"), cylGeo(0.08, 0.08, 3.4, dx + t[0] * s * 3.7 + n[0] * 3.8, 1.7, dz + t[1] * s * 3.7 + n[1] * 3.8, 6));
      col.addCircle(dx + t[0] * s * 3.7 + n[0] * 3.8, dz + t[1] * s * 3.7 + n[1] * 3.8, 0.15);
      // flags
      M.add("flagpole", mat("#dddddd"), cylGeo(0.06, 0.06, 9, dx + t[0] * s * 7 + n[0] * 0.8, 9.5, dz + t[1] * s * 7 + n[1] * 0.8, 6));
      col.addCircle(dx + t[0] * s * 7 + n[0] * 0.8, dz + t[1] * s * 7 + n[1] * 0.8, 0.12);
      const fx = dx + t[0] * s * 7 + n[0] * 0.8 + t[0] * 0.8, fz = dz + t[1] * s * 7 + n[1] * 0.8 + t[1] * 0.8;
      if (THEME.mexican) MX.mexicanFlag(mx, fx, 13.4, fz, rotY + Math.PI / 2, 1.6, 1);
      else M.add("flag", mat(s < 0 ? "#b22234" : "#3c3b6e"), boxGeo(1.6, 1, 0.04, 0, 0, 0).rotateY(rotY + Math.PI / 2).translate(fx, 13.4, fz));
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
    // (thatched like a palapa in the edition's town, theme.ts `airportOut`: addTownMx)
    if (!THEME.airportOut) M.add("terminal-canopy", mat("#f4f6f8"), boxGeo(8, 0.4, 20, dx - 4, 5.4, dz));
    for (const oz of [-9, -3, 3, 9]) { M.add(THEME.townMerge ? "dropoff-post" : "canopy-post", mat("#b8c2cc"), cylGeo(0.15, 0.15, 5.4, dx - 7.5, 2.7, dz + oz, 8)); col.addCircle(dx - 7.5, dz + oz, 0.2); }
    // control tower
    M.add("tower", mat("#dde6ee"), cylGeo(1.6, 2, 24, b.x + 12, 12, b.z + 16, 12));
    M.add("tower-top", darkGlass, cylGeo(3, 2.4, 3, b.x + 12, 25.5, b.z + 16, 12));
    M.add("tower-cap", mat("#2b5d8a"), cylGeo(3.3, 3.3, 0.5, b.x + 12, 27.2, b.z + 16, 12));
    // parked plane
    buildPlane(M, 176, 12);
    col.addBox(176, 42, 22, 2.8);
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
    // (theme.ts `casas`: a concrete portal with the terrace on it instead, mexican.ts `casa`)
    if (THEME.casas) {
      const P = (u: number, v: number): [number, number] => [dx + t[0] * u + n[0] * v, dz + t[1] * u + n[1] * v];
      MX.casa(mx, mxFlat, P, rotY, halfWidth * 2, halfDepth * 2, b.h, b.color, b.trim ?? "#ffffff", 700 + b.id.length * 53 + Math.round(b.x));
      const cs = [P(-3.25, 0), P(3.25, 0), P(-3.25, 2.65), P(3.25, 2.65)];
      portals.push({ minX: Math.min(...cs.map((q) => q[0])), maxX: Math.max(...cs.map((q) => q[0])), minZ: Math.min(...cs.map((q) => q[1])), maxZ: Math.max(...cs.map((q) => q[1])), y0: 2.9, y1: 4.3 });
    } else {
      M.add("porch-roof", mat(b.roofColor ?? "#6b4f3a"), boxGeo(6.4, 0.2, 2.8, 0, 3.1, 0).rotateY(rotY).translate(dx + n[0] * 1.3, 0, dz + n[1] * 1.3));
      for (const s of [-1, 1]) M.add("porch-post", mat("#ffffff"), cylGeo(0.1, 0.1, 2.8, dx + t[0] * s * 2.8 + n[0] * 2.5, 1.55, dz + t[1] * s * 2.8 + n[1] * 2.5, 6));
    }
    for (const s of [-1, 1]) col.addCircle(dx + t[0] * s * 2.8 + n[0] * 2.5, dz + t[1] * s * 2.8 + n[1] * 2.5, 0.14);
    if (THEME.mexican) {
      // a low wall with an iron gate and a potted plant instead of the picket fence, the mailbox and the chimney
      const P = (u: number, v: number): [number, number] => [dx + t[0] * u + n[0] * v, dz + t[1] * u + n[1] * v];
      MX.houseFront(mx, P, rotY, b.w, b.color, b.trim ?? "#ffffff", 1.4, P(4.5, 5));
      // (graphics round 2, theme.ts `houseFronts`: the band along the wall, the door's grille and its number, plants)
      const num = THEME.houseFronts[b.id];
      if (num) MX.houseDetails(mxFlat, atlas!, P, rotY, halfWidth * 2, doorW, b.color, num);
    } else {
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
    // the mailbox's (or the pot's) and the fence's (or the wall's) colliders
    col.addCircle(dx + t[0] * 4.5 + n[0] * 5, dz + t[1] * 4.5 + n[1] * 5, 0.22);
    // the fence blocks on both sides of its gate
    for (const sd of [-1, 1]) {
      const len = b.w / 2 - 1.4, u = sd * (1.4 + len / 2), fx = dx + t[0] * u + n[0] * 5.6, fz = dz + t[1] * u + n[1] * 5.6;
      col.addBox(fx, fz, Math.abs(t[0]) * len + Math.abs(n[0]) * 0.16, Math.abs(t[1]) * len + Math.abs(n[1]) * 0.16);
    }
  }
  if (b.style === "office") {
    for (let f = 1; f <= 6; f++) M.add("office-band", mat("#34495e"), boxGeo(b.w + 0.2, 0.25, b.d + 0.2, b.x, f * 3.2 + 0.5, b.z));
  }
  if (b.style === "restaurant" && b.id === "trattoria") {
    for (const s of [-1, 1]) {
      M.add("planter", mat("#8a5a3c"), boxGeo(1.6, 0.6, 0.6, dx + t[0] * s * 4.5 + n[0] * 1.2, 0.3, dz + t[1] * s * 4.5 + n[1] * 1.2));
      M.add("plants", mat("#4c8c3c", { flat: true }), new THREE.IcosahedronGeometry(0.55, 0).translate(dx + t[0] * s * 4.5 + n[0] * 1.2, 0.9, dz + t[1] * s * 4.5 + n[1] * 1.2));
      col.addBox(dx + t[0] * s * 4.5 + n[0] * 1.2, dz + t[1] * s * 4.5 + n[1] * 1.2, Math.abs(t[0]) * 1.7 + Math.abs(n[0]) * 0.7, Math.abs(t[1]) * 1.7 + Math.abs(n[1]) * 0.7);
    }
    for (const s of [-1, 1]) cafeTable(M, col, dx + t[0] * s * 3 + n[0] * 3.2, dz + t[1] * s * 3 + n[1] * 3.2, "#2e6b3a");
  }
  if (b.id === "cafe") {
    for (const s of [-1, 1]) cafeTable(M, col, dx + t[0] * s * 3.4 + n[0] * 3.2, dz + t[1] * s * 3.4 + n[1] * 3.2, "#e8743b");
    // A-frame chalkboard
    M.add("board", mat("#2f3a33"), boxGeo(0.8, 1, 0.1, 0, 0.55, 0).rotateX(0.2).rotateY(rotY).translate(dx + t[0] * 1.8 + n[0] * 1.6, 0, dz + t[1] * 1.8 + n[1] * 1.6));
    col.addBox(dx + t[0] * 1.8 + n[0] * 1.6, dz + t[1] * 1.8 + n[1] * 1.6, Math.abs(t[0]) * 0.9 + Math.abs(n[0]) * 0.45, Math.abs(t[1]) * 0.9 + Math.abs(n[1]) * 0.45);
  }
  if (b.id === "bank") {
    // ATM next to the door
    M.add("atm", mat("#34495e"), boxGeo(1, 2, 0.5, 0, 1, 0).rotateY(rotY).translate(dx + t[0] * 4 + n[0] * 0.3, 0, dz + t[1] * 4 + n[1] * 0.3));
    M.add("atm-screen", glassMat, boxGeo(0.6, 0.45, 0.04, 0, 1.5, 0).rotateY(rotY).translate(dx + t[0] * 4 + n[0] * 0.57, 0, dz + t[1] * 4 + n[1] * 0.57));
    col.addBox(dx + t[0] * 4 + n[0] * 0.3, dz + t[1] * 4 + n[1] * 0.3, Math.abs(t[0]) * 1.05 + Math.abs(n[0]) * 0.6, Math.abs(t[1]) * 1.05 + Math.abs(n[1]) * 0.6);
    M.add("columns", mat("#f7f3ea"), cylGeo(0.35, 0.4, 5, dx + t[0] * -2.2 + n[0] * 0.6, 2.5, dz + t[1] * -2.2 + n[1] * 0.6, 10));
    M.add("columns", mat("#f7f3ea"), cylGeo(0.35, 0.4, 5, dx + t[0] * 2.2 + n[0] * 0.6, 2.5, dz + t[1] * 2.2 + n[1] * 0.6, 10));
  }
  if (b.id === "post") {
    // the mailbox: Maple Harbor's blue one, or a Correos de México buzón (theme.ts `mailbox`)
    if (THEME.mailbox === "correos") MX.buzon(mx, atlas!, dx + t[0] * 4 + n[0] * 1.6, dz + t[1] * 4 + n[1] * 1.6, rotY);
    else {
      M.add("mailbox-blue", mat("#1f4e9c"), boxGeo(0.8, 1.2, 0.7, dx + t[0] * 4 + n[0] * 1.6, 0.8, dz + t[1] * 4 + n[1] * 1.6));
      M.add("mailbox-blue", mat("#1f4e9c"), cylGeo(0.4, 0.4, 0.8, dx + t[0] * 4 + n[0] * 1.6, 1.4, dz + t[1] * 4 + n[1] * 1.6, 12).rotateZ(Math.PI / 2).translate(0, 0, 0));
    }
    col.addBox(dx + t[0] * 4 + n[0] * 1.6, dz + t[1] * 4 + n[1] * 1.6, 0.9, 0.8);
    M.add("flagpole", mat("#dddddd"), cylGeo(0.06, 0.06, 9, dx - t[0] * 6 + n[0] * 1.2, 4.5, dz - t[1] * 6 + n[1] * 1.2, 6));
    col.addCircle(dx - t[0] * 6 + n[0] * 1.2, dz - t[1] * 6 + n[1] * 1.2, 0.12);
    if (THEME.mexican) MX.mexicanFlag(mx, dx - t[0] * 6 + n[0] * 1.2 + 0.9, 8.3, dz - t[1] * 6 + n[1] * 1.2, 0, 1.8, 1.1);
    else M.add("flag", mat("#b22234"), boxGeo(1.8, 1.1, 0.04, dx - t[0] * 6 + n[0] * 1.2 + 0.9, 8.3, dz - t[1] * 6 + n[1] * 1.2));
  }
  if (b.id === "market" || b.id === "clinic" || b.id === "gym") frontExtras(b.id, M, col, group, dx, dz, n, t, rotY);
  if (b.style === "warehouse") warehouseExtras(b, M, col, group, dx, dz, n, t, rotY);
  // the edition's corner shop in the ground floor and its bougainvillea (theme.ts): none in Maple Harbor
  const front = (u: number, v: number): [number, number] => [b.x + n[0] * halfDepth + t[0] * u + n[0] * v, b.z + n[1] * halfDepth + t[1] * u + n[1] * v];
  if (shop) {
    const s = Math.sign(shop.u) || 1, [sx, sz] = front(s * (halfWidth + 0.05), -3.2);
    MX.tiendita(mx, col, atlas!, front, rotY, shop.u, shop.w, shop.sign, shop.side ? { x: sx, z: sz, rot: Math.atan2(t[0] * s, t[1] * s), text: shop.side } : null);
  }
  if (THEME.bougainvillea.includes(b.id)) {
    const side = dr() < 0.5 ? -1 : 1;
    MX.bougainvillea(mxFlat, front, side * (halfWidth - 1.3), 2.6, Math.min(b.h, 7.2) + (b.roof === "flat" && THEME.mexican ? 0.9 : 0.2), 400 + b.id.length * 37 + b.x);
  }
}

/** The letters' colour on a building's printed sign: its trim; in the edition's town (theme.ts) a dark one when the
 *  trim is too pale to read on the cream board (Correos, Departamentos Las Palmas). */
function signInk(b: BuildingDef) {
  const ink = b.trim ?? "#333";
  if (!THEME.mexican) return ink;
  const c = new THREE.Color(ink);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b > 0.6 ? b.awning ?? "#3a2f2a" : ink;
}

/** An outdoor sign's text in this edition (theme.ts townSigns), or Maple Harbor's own. */
const townSign = (text: string) => THEME.townSigns[text] ?? text;

/** The kinds of building whose ground floor windows have iron bars in a Mexican town (theme.ts). */
const BARRED = new Set<BuildingDef["style"]>(["house", "shop", "civic", "restaurant", "apartments"]);

// --------------------------------------------------------------------------- shop windows

/** The shop windows' insides and goods (merged into one vertex-coloured mesh) and their panes, gathered while the
 *  town is built. */
const displays: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [];
const displayGlass: THREE.BufferGeometry[] = [];
/** …in the edition's town (theme.ts `lean`) by part of town. */
let displayParts: Record<string, [THREE.BufferGeometry, THREE.ColorRepresentation][]> = {};

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
  // (theme.ts `lean`: each part of town's shop windows in a mesh of their own)
  const list = THEME.lean ? (displayParts[b.z > 40 ? "south" : b.z < -40 ? "north" : b.x < 0 ? "west" : "east"] ??= []) : displays;
  const add: Add = (g, c) => { list.push([at(g.translate(0, y0 + 0.06, 0)), c]); };
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
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTexture(townSign(text), { bg, fg, w: 512, h: Math.round(512 * h / w), lines: 2 }), toneMapped: false }));
    m.position.set(x, y, z); m.rotation.y = rotY;
    group.add(m);
  };
  const metal = mat("#b9c2c9");
  if (id === "market" && THEME.marketFront === "mercado") {
    // the mercado's crates of produce, a diablito and a cargo tricycle where the carts are (theme.ts, mexican.ts)
    MX.mercadoFront(mx, col, P, rotY);
  } else if (id === "market") {
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
  }
  if (id === "market") {
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
    // (an edition's own words are squeezed to the panel's width if they must be)
    const say = (text: string, px: number, py: number) => { const tr = townSign(text); if (tr === text) x.fillText(text, px, py); else x.fillText(tr, px, py, 345); };
    say("Family Clinic", 150, 86);
    x.fillStyle = "#52606d"; x.font = "700 38px Nunito, Arial"; say("Walk-ins welcome", 150, 150);
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
    block(5, 1.05, 1.1, 1.65);
    block(5, 1, 1.6, 0.7);
    notice("Open 5 AM – 11 PM", "#ffffff", "#1f7f8c", -2.2, 1.75, 1.5, 0.5);
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
  // (in the edition's town, theme.ts `nearFade`, a lamp beside the follow camera dissolves instead of filling the picture)
  const lampPost = THEME.nearFade ? nearFaded(mat("#2f3a40").clone()) : mat("#2f3a40");
  const lampGlass = THEME.nearFade ? nearFaded(mat("#fff4c4", { emissive: "#a08a3a" }).clone()) : mat("#fff4c4", { emissive: "#a08a3a" });
  const addLamp = (x: number, z: number) => {
    M.add("lamp", lampPost, cylGeo(0.08, 0.12, 4.2, x, 2.1, z, 6));
    // on the malecón (theme.ts) a post with two lanterns on an arm, along the beach
    if (THEME.malecon && z < -60) MX.lanternArm((k, g) => M.add(k === "post" ? "lamp" : "lamp-glass", k === "post" ? lampPost : lampGlass, g, k === "post"), x, z);
    else {
      M.add("lamp", lampPost, boxGeo(0.25, 0.25, 0.25, x, 4.3, z));
      M.add("lamp-glass", lampGlass, (THEME.lean ? new THREE.SphereGeometry(0.28, 7, 5) : new THREE.SphereGeometry(0.28, 8, 6)).translate(x, 4.55, z), false);
    }
    col.addCircle(x, z, 0.18);
  };
  // the zócalo's colonial lamp posts (theme.ts `zocalo`): a fluted black post on a base, a four-sided lantern with a cap
  for (const [x, z] of THEME.zocalo?.lamps ?? []) {
    M.add("lamp", lampPost, cylGeo(0.2, 0.26, 0.6, x, 0.3, z, 8));
    M.add("lamp", lampPost, cylGeo(0.07, 0.1, 3.3, x, 1.9, z, 8));
    M.add("lamp", lampPost, cylGeo(0.16, 0.12, 0.14, x, 3.6, z, 8));
    M.add("lamp-glass", lampGlass, boxGeo(0.34, 0.5, 0.34, x, 3.92, z), false);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) M.add("lamp", lampPost, boxGeo(0.04, 0.54, 0.04, x + dx * 0.17, 3.92, z + dz * 0.17), false);
    M.add("lamp", lampPost, new THREE.ConeGeometry(0.3, 0.26, 4).rotateY(Math.PI / 4).translate(x, 4.3, z));
    M.add("lamp", lampPost, new THREE.SphereGeometry(0.05, 6, 4).translate(x, 4.47, z), false);
    col.addCircle(x, z, 0.24);
  }
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
  for (const [x, z, rot] of [[-75, -17.5, 0], [-48, -17.5, 0], [-6, -17.5, 0], [60, -40, 0], [-64, 2, Math.PI], [40, 2, Math.PI], [-84, 44.5, 0]] as [number, number, number][]) {
    if (THEME.church && Math.hypot(x - THEME.church.x, z - THEME.church.z) < 11) continue; // where the church stands
    bench(x, z, rot);
  }
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
    // the edition's word on it (theme.ts: ALTO), or Maple Harbor's plain octagon
    if (THEME.stopWord) MX.stopFace(atlas!, THEME.stopWord, x, z);
    else M.add("stop", mat("#c62828", { flat: true }), new THREE.CylinderGeometry(0.4, 0.4, 0.05, 8).rotateX(Math.PI / 2).translate(x, 2.45, z));
    col.addCircle(x, z, 0.1);
  };
  for (const [x, z] of [[-75, 32], [5, 32], [65, 32], [-5, -14], [75, -14]]) stop(x, z);
  // parked cars
  const colors = ["#e45b4f", "#4a7bb7", "#f2c14e", "#6fbf73", "#f4f4f4", "#3d3d46", "#b5838d"];
  const parked: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [];
  const car = (x: number, z: number, rot: number, color: string, look?: { kind: "sedan" | "vocho"; color: string }) => {
    if (!STYLED) {
      // the edition's cars (theme.ts: vochitos and small sedans in its colours), or Maple Harbor's
      const parts = look ? (look.kind === "vocho" ? vochoParts(look.color) : carParts(look.color)) : carParts(color);
      for (const [g, c] of parts) parked.push([g.rotateY(rot).translate(x, 0, z), c]);
      col.addBox(x, z, Math.abs(Math.cos(rot)) * 2 + Math.abs(Math.sin(rot)) * 4.3, Math.abs(Math.sin(rot)) * 2 + Math.abs(Math.cos(rot)) * 4.3, "car");
      return;
    }
    const body = mat(color, { flat: true });
    M.add("car-" + color, body, boxGeo(1.9, 0.7, 4.2, 0, 0.65, 0).rotateY(rot).translate(x, 0, z));
    M.add("car-" + color, body, boxGeo(1.7, 0.6, 2.2, 0, 1.3, -0.2).rotateY(rot).translate(x, 0, z));
    M.add("car-glass", mat("#9ccbe6", { emissive: "#1b3a4c" }), boxGeo(1.72, 0.45, 2.0, 0, 1.3, -0.2).rotateY(rot).translate(x, 0, z), false);
    for (const [wx, wz] of [[-0.9, 1.3], [0.9, 1.3], [-0.9, -1.3], [0.9, -1.3]]) {
      M.add("wheel", mat("#222"), cylGeo(0.36, 0.36, 0.3, 0, 0, 0, 10).rotateZ(Math.PI / 2).translate(wx, 0.36, wz).rotateY(rot).translate(x, 0, z));
    }
    col.addBox(x, z, Math.abs(Math.cos(rot)) * 2 + Math.abs(Math.sin(rot)) * 4.3, Math.abs(Math.sin(rot)) * 2 + Math.abs(Math.cos(rot)) * 4.3, "car");
  };
  let ci = 0;
  for (const [x, z, rot] of PARKED_CARS) { const look = THEME.parkedCars[ci]; car(x, z, rot, colors[ci++ % colors.length], look); }
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
    if (!nearIntersection(x, -61.5)) {
      // along the beach a malecón (theme.ts) has palms instead: the tree keeps its place among the town's random
      // numbers, unseen
      const tx = x + 5 + r() * 2;
      if (THEME.malecon) beachPalms.push([tx, -61.8]);
      add(tx, -61.8, THEME.malecon ? 0 : 0.85);
    }
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
  // the zócalo's laureles (theme.ts `zocalo`), after the town's trees, from their own random numbers: none in Maple Harbor
  const town = spots.length, rl = rand(2611);
  for (const [x, z] of THEME.zocalo?.laureles ?? []) add(x, z, 1.6);

  const n = spots.length;
  // (theme.ts `tropicalTrees`: the town's trees as flamboyanes and almendros, built below; the laureles round as here)
  if (THEME.tropicalTrees && !STYLED) { tropicalTrees(group, col, r, rl, spots, town); return; }
  const trunkGeo = STYLED ? trunkGeometry() : new THREE.CylinderGeometry(0.18, 0.28, 2.2, 7).translate(0, 1.1, 0);
  const leafGeo = STYLED ? canopyGeometry() : mergeGeometries([
    new THREE.IcosahedronGeometry(1.6, 1).translate(0, 3.3, 0),
    new THREE.IcosahedronGeometry(1.05, 1).translate(0.35, 4.45, -0.2),
    new THREE.IcosahedronGeometry(0.9, 0).translate(-0.85, 3.7, 0.55),
  ], false)!;
  const trunks = new THREE.InstancedMesh(trunkGeo, mat("#7a5236"), n);
  const leaves = new THREE.InstancedMesh(leafGeo, STYLED ? canopyMaterial() : swaying(new THREE.MeshLambertMaterial({ flatShading: true })), n);
  // (this edition's own, theme.ts `treeColors`: the trees in bloom of a Caribbean town)
  const palette = THEME.treeColors.length ? THEME.treeColors : ["#d9542b", "#e8833a", "#f2b440", "#c8402f", "#7fae4a", "#5f9e46", "#e0692c", "#b8d05a"];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
  spots.forEach(([x, z, sc], i) => {
    const rr = i < town ? r : rl; // (a laurel: dark, dense and a little broader)
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rr() * Math.PI);
    m4.compose(v.set(x, 0, z), q, s.set(sc * (i < town ? 1 : 1.12), sc * (0.9 + rr() * 0.3), sc * (i < town ? 1 : 1.12)));
    trunks.setMatrixAt(i, m4);
    leaves.setMatrixAt(i, m4);
    const leafCol = i < town ? palette[Math.floor(r() * palette.length)] : ["#2f6b34", "#2a6330", "#356f37"][Math.floor(rl() * 3)];
    leaves.setColorAt(i, STYLED ? grade(leafCol) : new THREE.Color(leafCol));
    if (sc > 0) col.addCircle(x, z, 0.35 * sc); // (not the unseen ones: a palm stands there)
  });
  trunks.castShadow = leaves.castShadow = true;
  trunks.receiveShadow = leaves.receiveShadow = true;
  group.add(trunks, leaves);
  if (STYLED) { outlineInstanced(trunks, "#7a5236", 0.03, "trunk"); outlineInstanced(leaves, "#3f6b2a", 0.045, "canopy"); }
  addBushes(group, col);
}

function addBushes(group: THREE.Group, col: Colliders) {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
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
      if (THEME.tiendita && col.blocked(x, z, 0.3)) continue; // a corner shop's crates are there (theme.ts)
      m4.compose(v.set(x, 0.35, z), q.identity(), s.set(1, 0.8, 1));
      bushes.setMatrixAt(k++, m4);
      col.addCircle(x, z, 0.62);
    }
  }
  bushes.count = k;
  bushes.castShadow = true;
  group.add(bushes);
  if (STYLED) outlineInstanced(bushes, "#2f5f2a", 0.03, "bush");
}

/** (theme.ts `tropicalTrees`) The town's trees at the same spots, sizes and turns from the same random numbers, as
 *  flamboyanes and almendros (mexican.ts): one in three an almendro, by its place in the list; the bloom colours of the
 *  theme's palette go to the flamboyanes (an almendro drawing one is green). The zócalo's laureles keep the round
 *  crown, denser and darker, in a mesh of their own. Then the bushes, as for Maple Harbor's trees. */
function tropicalTrees(group: THREE.Group, col: Colliders, r: () => number, rl: () => number, spots: [number, number, number][], town: number) {
  const palette = THEME.treeColors, BLOOM = new Set(["#f2c230", "#e8432b"]), GREENS = palette.filter((c) => !BLOOM.has(c));
  const roundTrunk = new THREE.CylinderGeometry(0.18, 0.28, 2.2, 7).translate(0, 1.1, 0);
  const roundCrown = mergeGeometries([
    new THREE.IcosahedronGeometry(1.6, 1).translate(0, 3.3, 0),
    new THREE.IcosahedronGeometry(1.05, 1).translate(0.35, 4.45, -0.2),
    new THREE.IcosahedronGeometry(0.9, 0).translate(-0.85, 3.7, 0.55),
  ], false)!;
  const isAlmendro = (i: number) => i % 3 === 1;
  const counts = [0, 0, 0];
  const kind = (i: number) => (i >= town ? 2 : isAlmendro(i) ? 1 : 0);
  spots.forEach((_, i) => counts[kind(i)]++);
  const trunkMat = mat("#7a5236"), leafMat = swaying(new THREE.MeshLambertMaterial({ flatShading: true }));
  const make = (trunk: THREE.BufferGeometry, crown: THREE.BufferGeometry, n: number) => {
    const t = new THREE.InstancedMesh(trunk, trunkMat, Math.max(1, n)), l = new THREE.InstancedMesh(crown, leafMat, Math.max(1, n));
    t.count = l.count = 0;
    t.castShadow = l.castShadow = t.receiveShadow = l.receiveShadow = true;
    // (graphics round 5) a trunk fades with its crown (fade.ts): no bare trunk left standing where a crown went
    t.userData.fadeWith = l;
    group.add(t, l);
    return [t, l] as const;
  };
  const sets = [make(MX.tropicalTrunk(), MX.flamboyanCrown(), counts[0]), make(MX.almendroTrunk(), MX.almendroCrown(), counts[1]), make(roundTrunk, roundCrown, counts[2])];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
  // (a town tree where the theme wants a palm instead, theme.ts `treePalms`: a coconut palm there, the tree unseen)
  const palm = (x: number, z: number) => THEME.treePalms.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
  spots.forEach(([x, z, sc0], i) => {
    const k = kind(i), rr = i < town ? r : rl;
    const sc = i < town && sc0 > 0 && palm(x, z) ? (beachPalms.push([x, z]), 0) : sc0;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rr() * Math.PI);
    m4.compose(v.set(x, 0, z), q, s.set(sc * (i < town ? 1 : 1.12), sc * (0.9 + rr() * 0.3), sc * (i < town ? 1 : 1.12)));
    let leafCol = i < town ? palette[Math.floor(r() * palette.length)] : ["#2f6b34", "#2a6330", "#356f37"][Math.floor(rl() * 3)];
    if (k === 1 && BLOOM.has(leafCol)) leafCol = GREENS[i % GREENS.length];
    const [t, l] = sets[k];
    t.setMatrixAt(t.count, m4);
    l.setMatrixAt(l.count, m4);
    l.setColorAt(l.count, new THREE.Color(leafCol));
    t.count++; l.count++;
    if (sc > 0) col.addCircle(x, z, 0.35 * sc);
  });
  for (const [t, l] of sets) { t.computeBoundingSphere(); l.computeBoundingSphere(); }
  // (theme.ts `ceibas`) a ceiba or two in town: each a mesh of its own (trunk and crown in one, coloured in the
  // vertices: one draw call, and only where it is in view), instanced as the trees are, so it fades out of the walking
  // camera's way with them; solid at the foot, buttress roots and all
  if (THEME.ceibas.length) {
    const ceibaMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    THEME.ceibas.forEach(([x, z, sc], i) => {
      const c = new THREE.InstancedMesh(colourMerge([[MX.ceibaTrunk(), "#9a958a"], [MX.ceibaCrown(), i % 2 ? "#3f7d3a" : "#468a3f"]]), ceibaMat, 1);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 1.9 + 0.4);
      c.setMatrixAt(0, m4.compose(v.set(x, 0, z), q, s.set(sc, sc, sc)));
      c.castShadow = c.receiveShadow = true;
      c.name = "ceiba";
      c.computeBoundingSphere();
      col.addCircle(x, z, 0.95 * sc);
      group.add(c);
    });
  }
  addBushes(group, col);
}

function addSquareAndMarket(M: Merger, col: Colliders, group: THREE.Group, r: () => number) {
  const { x, z } = FOUNTAIN;
  if (THEME.centrepiece === "kiosco") addKiosco(M, col, x, z);
  else {
  // fountain
  M.add("fountain", mat("#d8d2c4"), cylGeo(3.4, 3.6, 0.8, x, 0.4, z, 24));
  M.add("fountain-water", mat("#6cc3dc", { emissive: "#0f3b48" }), cylGeo(3.0, 3.0, 0.1, x, 0.76, z, 24), false);
  M.add("fountain", mat("#d8d2c4"), cylGeo(0.4, 0.6, 2.2, x, 1.5, z, 12));
  M.add("fountain", mat("#d8d2c4"), cylGeo(1.2, 0.8, 0.3, x, 2.6, z, 16));
  M.add("fountain-water", mat("#9fe0ef", { emissive: "#174a57" }), new THREE.SphereGeometry(0.7, 12, 8).scale(1, 0.6, 1).translate(x, 2.9, z), false);
  col.addCircle(x, z, 3.7);
  if (!STYLED) group.add(makeSpray(x, z));
  }
  // the square's own mesh (the tianguis, the zócalo's bancas: drawn only where the square is in view; none in Maple Harbor)
  const sq: MX.Part[] = [];
  // stalls (in this edition's tianguis, theme.ts, its own: the town's random numbers drawn as before)
  if (THEME.tianguis) { for (let i = 0; i < STALLS.length * 14; i++) r(); addTianguis(col, group, sq); }
  else for (const s of STALLS) {
    M.add("stall-table", mat("#9c6b43"), boxGeo(4, 0.9, 1.6, s.x, 0.45, s.z));
    for (const [dx, dz] of [[-1.9, -0.7], [1.9, -0.7], [-1.9, 0.7], [1.9, 0.7]]) M.add("stall-pole", mat("#e8e2d6"), cylGeo(0.05, 0.05, 2.6, s.x + dx, 1.3, s.z + dz, 5));
    // the roof tilted about its own middle, then set on the poles' tops (tilted after the move, it turned about the
    // world's origin and hung about 3 m above the stall)
    const roof = boxGeo(4.4, 0.12, 2.2, 0, 0, 0).rotateX(0.08).translate(s.x, 2.6, s.z);
    M.add("stall-roof-" + s.color, mat(s.color), roof);
    const goodsCol = s.goods === "flowers" ? ["#e84a5f", "#ffd166", "#b56576", "#f7a072"] : s.goods === "fruit" ? ["#e63946", "#f4a261", "#ffbe0b"] : s.goods === "veg" ? ["#2a9d8f", "#e76f51", "#8ab17d"] : ["#d4a373", "#e9c46a"];
    for (let i = 0; i < 14; i++) {
      const g = new THREE.SphereGeometry(0.16 + r() * 0.08, 6, 5).translate(s.x - 1.6 + (i % 7) * 0.53, 1.02, s.z - 0.35 + Math.floor(i / 7) * 0.5);
      M.add("goods-" + goodsCol[i % goodsCol.length], mat(goodsCol[i % goodsCol.length], { flat: true }), g, false);
    }
    col.addBox(s.x, s.z, 4.2, 1.8);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: textTexture(THEME.stallSigns[s.goods] ?? { flowers: "Flowers", fruit: "Fresh Fruit", veg: "Farm Veggies", bread: "Bakery" }[s.goods] ?? "", { bg: "#fffaf0", fg: "#5a3a25", w: 256, h: 64 }) }));
    sign.position.set(s.x, 2.2, s.z + 1.12);
    group.add(sign);
  }
  // benches around the fountain, their backs to it (Rosa sits on the south-west one, facing south)
  for (const [bx, bz, rot] of [[18, -23.2, Math.PI], [30, -22.6, Math.PI], [40, -30, -Math.PI / 2]] as [number, number, number][]) {
    // (iron bancas on a zócalo, theme.ts `zocalo`: the same seat)
    if (THEME.zocalo) MX.banca(sq, bx, bz, rot + Math.PI);
    else {
      M.add("bench", mat("#9c6b43"), boxGeo(1.8, 0.1, 0.5, 0, 0.5, 0).rotateY(rot).translate(bx, 0, bz));
      M.add("bench", mat("#9c6b43"), boxGeo(1.8, 0.5, 0.08, 0, 0.8, 0.22).rotateY(rot).translate(bx, 0, bz));
    }
    col.addBox(bx, bz, Math.abs(Math.cos(rot)) * 1.9 + 0.3, Math.abs(Math.sin(rot)) * 1.9 + 0.3);
    // a place on each one facing away from the fountain (Rosa's bench is hers)
    if (bx !== 18) seats.push({ x: bx, z: bz, rot: rot + Math.PI, y: 0.55 });
  }
  // the zócalo's other bancas and its laureles' whitewashed trunks (theme.ts `zocalo`)
  for (const [bx, bz, rot] of THEME.zocalo?.bancas ?? []) {
    MX.banca(sq, bx, bz, rot);
    col.addBox(bx, bz, Math.abs(Math.cos(rot)) * 1.9 + 0.3, Math.abs(Math.sin(rot)) * 1.9 + 0.3);
    for (const u of [-0.45, 0.45]) seats.push({ x: bx + Math.cos(rot) * u, z: bz - Math.sin(rot) * u, rot, y: 0.53 });
  }
  for (const [lx, lz] of THEME.zocalo?.laureles ?? []) MX.whitewash(sq, lx, lz, 0.28 * 1.6 * 1.12);
  // (graphics round 3, theme.ts `atrialCross`: the cross before the church, in the square's mesh)
  if (THEME.atrialCross) MX.atrialCross(sq, col, ...THEME.atrialCross);
  if (sq.length) group.add(staticColoured(sq, "tianguis"));
  // bandstand-ish gazebo
  if (!THEME.gazebo) return;
  M.add("gazebo", mat("#ffffff"), cylGeo(3, 3, 0.4, 44, 0.2, -22, 8));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    M.add("gazebo", mat("#ffffff"), cylGeo(0.1, 0.1, 3, 44 + Math.cos(a) * 2.7, 1.7, -22 + Math.sin(a) * 2.7, 6));
  }
  M.add("gazebo-roof", mat("#2e6b3a", { flat: true }), new THREE.ConeGeometry(3.6, 1.8, 8).translate(44, 4.1, -22));
  col.addCircle(44, -22, 3.1);
}

/** The square's market as a tianguis (theme.ts `tianguis`; mexican.ts `tianguisStall`): layout.ts's four stalls and the
 *  theme's own, into `parts` (the square's own mesh, with the zócalo's bancas: addSquareAndMarket; drawn, with its
 *  shadow, only where the square is in view), their goods in a mesh of their own that casts no shadow (its many little
 *  goods cost no triangles elsewhere), their painted signs in the town's sign atlas. */
function addTianguis(col: Colliders, group: THREE.Group, parts: MX.Part[]) {
  const t = THEME.tianguis!;
  const goods: MX.Part[] = [], lonas: MX.Part[] = [];
  const stalls = [...STALLS.map((s) => ({ x: s.x, z: s.z, rot: 0, goods: s.goods as TianguisGoods })), ...t.stalls];
  stalls.forEach((s, i) => MX.tianguisStall(parts, goods, col, atlas!, s.x, s.z, s.rot, s.goods, t.lonas[i % t.lonas.length], t.signs[s.goods] ?? [s.goods, ""], 700 + i, lonas));
  // the lonas in a mesh of their own that the camera looks through (userData.thin, Game.ts; cutout.ts opens a hole in
  // them on the line to the player) rather than a roof it must stay under: under them it was 1–3 m behind her head
  const lm = staticColoured(lonas, "tianguis-lonas");
  lm.userData.thin = true;
  group.add(lm);
  // (the stalls' mesh: addSquareAndMarket, with the zócalo's bancas)
  // the goods in a mesh that casts no shadow (under the lonas' shade they would add triangles and nothing to see)
  const g = staticColoured(goods, "tianguis-goods");
  g.castShadow = false;
  group.add(g);
  // (theme.ts `farHide`: too small to see from farther than that, they are left out)
  if (THEME.farHide !== null) { const sp = g.geometry.boundingSphere ?? (g.geometry.computeBoundingSphere(), g.geometry.boundingSphere!); farHidden.push({ mesh: g, x: sp.center.x, z: sp.center.z, r: sp.radius + THEME.farHide }); }
}

/** The edition's outdoor pieces beyond the square (theme.ts, docs/es/TOWN.md tasks 1–4 and 8): the malecón with its
 *  benches and kiosk, the palapas, the lanchas on the sand, the church, the street signs, the topes, the elote cart,
 *  the cenote and the ruins. Nothing in Maple Harbor. */
function addTownMx(M: Merger, col: Colliders) {
  const a = atlas!;
  if (THEME.malecon) {
    for (const [x, z, rot] of MX.malecon(mx, col, a, THEME.malecon.plaque)) streetBench(M, col, x, z, rot);
    MX.kiosk(mx, col, a, THEME.malecon.kiosk[0], THEME.malecon.kiosk[1], THEME.malecon.kioskSign);
  }
  const L = THEME.letras;
  if (L) MX.letras(mx, col, L.text, L.x, L.z, L.h, L.colors);
  if (THEME.palapas.length) {
    // (graphics round 4, theme.ts `beachLife`: the palapas thatched in layers, and their loungers places to sit)
    // (graphics round 5: their thatch looked through by the walking camera, mxRoofs)
    const loungers = MX.palapas(mx, col, THEME.palapas, !!THEME.beachLife, mxRoofs);
    if (THEME.beachLife) for (const [x, z] of loungers) seats.push({ x, z, rot: Math.PI, y: 0.42, recline: 0.9 });
  }
  if (THEME.lanchas) MX.beachedLanchas(mx, col, THEME.lanchas.beached);
  if (THEME.church) MX.church(mx, col, THEME.church.x, THEME.church.z, THEME.church.face);
  // (graphics round 4) its atrium, walled, and its facade's columns and niches
  if (THEME.church && THEME.atrio) MX.atrio(mx, mxFlat, col, THEME.church.x, THEME.church.z, THEME.church.face, THEME.atrio.depth, THEME.atrio.left, THEME.atrio.right, THEME.atrio.gate);
  for (const [x, z, ew, ns] of THEME.streetSigns) MX.streetSign(mxFlat, col, a, x, z, ew, ns);
  for (const [x1, z1, x2, z2, sx, sz, srot] of THEME.topes?.at ?? []) MX.tope(mxFlat, col, a, THEME.topes!.word, x1, z1, x2, z2, sx, sz, srot);
  const f = THEME.foodCart;
  if (f) MX.foodCart(mx, col, a, f.x, f.z, f.rot, f.sign);
  // beyond the town's edge: the cenote across the west meadow, the ruins on the point past the beach (TOWN.md task 8)
  // (in the mesh that casts no shadow: they stand beyond the town's edge, seen from afar)
  if (THEME.cenote) MX.cenote(THEME.regions ? mxFar : mxFlat, a, THEME.cenote.x, THEME.cenote.z, THEME.cenote.sign);
  // (graphics round 4) the scrub on the meadow round it, ceibas over the selva behind it
  const md = THEME.meadow;
  if (md) MX.meadow(THEME.regions ? mxFar : mxFlat, md.x0, md.x1, md.z0, md.z1, md.clear, md.ceibas);
  if (THEME.ruins) MX.ruins(THEME.regions ? mxFar : mxFlat, THEME.ruins.x, THEME.ruins.z, a);
  // (graphics round 2) the bus terminal's andenes and coaches, the airport's thatched canopy, planters and welcome sign
  const bt = THEME.busTerminal, station = BUILDINGS.find((b) => b.id === "station");
  if (bt && station) {
    const oak = ROADS.find((r) => r.z1 === r.z2 && r.z1 > station.z - station.d / 2 - 20 && r.z1 < station.z)!;
    for (const [x, z, rot] of MX.busTerminalFront(mx, col, a, station, bt.andenes, bt.buses, oak.z1 + oak.w / 2)) streetBench(M, col, x, z, rot);
    // (graphics round 4) its pilasters and band, the travellers' suitcases
    if (bt.front) MX.terminalFront(mx, mxFlat, col, station, bt.front.pilasters, bt.front.cases);
  }
  // (graphics round 3) the overhead lines (a mesh of their own: `wires`), the sidewalks, El Muelle's terrace, the beach,
  // the atrial cross, the mirador
  // (graphics round 4, theme.ts `poleFade`: the poles in a mesh of their own that dissolves near the camera)
  if (THEME.cables) MX.cables(THEME.poleFade ? poleParts : mx, wires, col, THEME.cables.poles, THEME.cables.drops);
  const sw = THEME.sidewalks;
  if (sw) {
    MX.macetas(mx, col, sw.macetas);
    if (sw.fruitCart) MX.fruitCart(mx, col, a, ...sw.fruitCart);
    if (sw.trike) MX.waterTrike(mx, col, ...sw.trike);
  }
  if (THEME.terrace.length) MX.terrace(mx, col, THEME.terrace);
  // (graphics round 5) the centro's sidewalks: bins, bolardos, a shoeshine stand (the cobbles: withGrain)
  if (THEME.adoquin) MX.sidewalkProps(mxFlat, col, THEME.adoquin);
  if (THEME.beach) {
    MX.towels(mxFlat, THEME.beach.towels);
    if (THEME.beach.cocos) MX.cocoCart(mx, col, a, ...THEME.beach.cocos);
  }
  const mi = THEME.mirador;
  if (mi) MX.mirador(THEME.regions ? mxFar : mx, col, a, mi.x, mi.z, mi.rot, mi.sign);
  const terminal = BUILDINGS.find((b) => b.style === "terminal");
  if (THEME.airportOut && terminal) {
    // the canopy over the drop-off (buildBuilding: 8 m out from the door, 20 m along the front, on posts 5.4 m high);
    // the thatch stays under the follow camera's box over it (Game.ts: 6.2 m)
    const dx = terminal.x - terminal.w / 2, dz = terminal.z;
    MX.airportFront(mx, col, a, mxRoofs, { x0: dx - 8, x1: dx, z0: dz - 10, z1: dz + 10, y: 5.5, top: 6.15 }, THEME.airportOut.welcome);
    // (graphics round 4) the thatch over the front hall and the greca along its front
    if (THEME.airportOut.terminal) MX.airportTerminal(mx, mxFlat, col, terminal, THEME.airportOut.terminal.hall, [[terminal.z - terminal.d / 2, dz - 11], [dz + 11, terminal.z + terminal.d / 2]]);
  }
}

/** A building as this edition shows it (theme.ts): its colours and its sign. In Maple Harbor, as layout.ts has it. */
function themed(b: BuildingDef): BuildingDef {
  const look = THEME.buildings[b.id];
  const sign = THEME.locationSigns && b.loc && LOCATIONS[b.loc] ? LOCATIONS[b.loc].name : b.sign;
  return look || sign !== b.sign ? { ...b, ...look, sign } : b;
}

/** A Mexican kiosco in the middle of the square (the Spanish edition's zócalo): an octagonal stone platform with
 *  steps on the south side, green iron columns and railing, a red tiled cupola with a lantern on top. */
function addKiosco(M: Merger, col: Colliders, x: number, z: number) {
  const stone = mat("#e6d7bd"), band = mat("#b98a5e"), iron = mat("#2f6b4f"), roof = mat("#c0533a", { flat: true }), trim = mat("#f7f1e3");
  M.add("kiosco-stone", stone, cylGeo(4.2, 4.4, 1.0, 0, 0, 0, 8).rotateY(Math.PI / 8).translate(x, 0.5, z));
  M.add("kiosco-band", band, cylGeo(4.45, 4.45, 0.18, 0, 0, 0, 8).rotateY(Math.PI / 8).translate(x, 0.12, z));
  M.add("kiosco-band", band, cylGeo(4.28, 4.28, 0.12, 0, 0, 0, 8).rotateY(Math.PI / 8).translate(x, 1.04, z));
  // steps up on the south side (towards Main Street)
  for (let i = 0; i < 3; i++) M.add("kiosco-stone", stone, boxGeo(2.6, 0.33 * (i + 1), 0.45, x, 0.165 * (i + 1), z + 5.15 - i * 0.45));
  // eight columns and a railing between them (open where the steps arrive)
  const R = 3.75;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    M.add("kiosco-iron", iron, cylGeo(0.11, 0.13, 3.3, x + Math.cos(a) * R, 2.75, z + Math.sin(a) * R, 8));
    M.add("kiosco-trim", trim, cylGeo(0.2, 0.2, 0.16, x + Math.cos(a) * R, 4.42, z + Math.sin(a) * R, 8));
    const b = a + Math.PI / 4, mid = (a + b) / 2, len = 2 * R * Math.sin(Math.PI / 8);
    if (Math.abs(Math.sin(mid) - 1) < 0.05) continue; // the opening above the steps
    for (const y of [1.55, 2.05]) M.add("kiosco-iron", iron, boxGeo(len, 0.07, 0.07, 0, 0, 0).rotateY(-mid + Math.PI / 2).translate(x + Math.cos(mid) * R * 0.92, y, z + Math.sin(mid) * R * 0.92));
  }
  // the cupola: a band under the eaves, the tiled roof, a lantern and a finial
  M.add("kiosco-trim", trim, cylGeo(4.3, 4.3, 0.28, 0, 0, 0, 8).rotateY(Math.PI / 8).translate(x, 4.6, z));
  M.add("kiosco-roof", roof, new THREE.ConeGeometry(4.75, 1.9, 8).rotateY(Math.PI / 8).translate(x, 5.7, z));
  M.add("kiosco-trim", trim, cylGeo(0.55, 0.6, 0.6, x, 6.9, z, 8));
  M.add("kiosco-roof", roof, new THREE.ConeGeometry(0.75, 0.7, 8).rotateY(Math.PI / 8).translate(x, 7.5, z));
  M.add("kiosco-band", band, new THREE.SphereGeometry(0.16, 8, 6).translate(x, 7.95, z));
  col.addCircle(x, z, 4.5);
  col.addBox(x, z + 4.9, 2.7, 1.5);
}

/** Papel picado: strings of cut-paper flags from the kiosco's eaves to the square's edges (theme.ts), all in one mesh
 *  (one draw call) that sways a little in the wind. */
function makePapelPicado(): THREE.Mesh {
  const { x: cx, z: cz } = FOUNTAIN;
  const COLORS = ["#e4007c", "#f6a800", "#00a6a6", "#7ac143", "#ff5a36", "#6d2e9e", "#1f6fd1"];
  const parts: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [];
  const strings: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [];
  THEME.papelPicado.forEach(([tx, tz, ty], k) => {
    const a = Math.atan2(tz - cz, tx - cx);
    const sx = cx + Math.cos(a) * 4.2, sz = cz + Math.sin(a) * 4.2, sy = 4.75;
    const len = Math.hypot(tx - sx, tz - sz);
    const n = Math.floor(len / 0.62);
    for (let i = 1; i < n; i++) {
      const f = i / n;
      const y = sy + (ty - sy) * f - Math.sin(f * Math.PI) * 0.9;
      const g = new THREE.PlaneGeometry(0.42, 0.52).translate(0, -0.29, 0).rotateY(-a).translate(sx + (tx - sx) * f, y, sz + (tz - sz) * f);
      parts.push([g, COLORS[(i + k * 3) % COLORS.length]]);
    }
    // the string itself
    for (let i = 0; i < n; i++) {
      const f0 = i / n, f1 = (i + 1) / n;
      const y0 = sy + (ty - sy) * f0 - Math.sin(f0 * Math.PI) * 0.9, y1 = sy + (ty - sy) * f1 - Math.sin(f1 * Math.PI) * 0.9;
      const seg = new THREE.BoxGeometry(0.02, 0.02, len / n + 0.02);
      seg.lookAt(new THREE.Vector3((tx - sx) / n, y1 - y0, (tz - sz) / n));
      seg.translate(sx + (tx - sx) * (f0 + f1) / 2, (y0 + y1) / 2, sz + (tz - sz) * (f0 + f1) / 2);
      strings.push([seg, "#f4f1ea"]);
    }
  });
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, map: papelTexture(), alphaTest: 0.5, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = wind;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uWind;\nvarying float vNear;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        transformed.x += sin(uWind * 2.1 + position.x * 0.9 + position.z * 0.7) * 0.04;
        transformed.z += cos(uWind * 1.7 + position.x * 0.6) * 0.04;`)
      .replace("#include <project_vertex>", "#include <project_vertex>\nvNear = length(mvPosition.xyz);");
    // flags and string nearer than about 3.3 m to the camera dissolve (a short dither), so a camera passing among the
    // strings (the follow camera over the square, a conversation's) never has a flag filling the picture
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vNear;")
      .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
        float nearFade = smoothstep(3.0, 3.6, vNear);
        if (nearFade < fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))))) discard;`);
  };
  const mesh = new THREE.Mesh(papelMerge(parts, strings), m);
  mesh.name = "papel-picado";
  return mesh;
}

/** The flags and strings merged with their colours in the vertices, keeping the flags' texture coordinates (colourMerge
 *  drops them, and then every flag samples the paper's cut-away corner and is discarded whole); the strings sample the
 *  paper's plain middle, canvas (32, 32). */
function papelMerge(flags: [THREE.BufferGeometry, THREE.ColorRepresentation][], strings: [THREE.BufferGeometry, THREE.ColorRepresentation][]) {
  const c = new THREE.Color();
  const geos = [...flags.map((p) => [...p, false] as const), ...strings.map((p) => [...p, true] as const)].map(([g0, col, plain]) => {
    const g = g0.index ? g0.toNonIndexed() : g0;
    for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal" && k !== "uv") g.deleteAttribute(k);
    const n = g.attributes.position.count;
    if (plain || !g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2).map((_, i) => (i % 2 ? 0.6 : 0.5)), 2));
    c.set(col);
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute("color", new THREE.BufferAttribute(a, 3));
    return g;
  });
  const merged = mergeGeometries(geos, false)!;
  for (const g of geos) g.dispose();
  return merged;
}

/** One flag of papel picado: white paper with cut-out holes (the vertex colour tints it); the strings use its
 *  plain middle. */
function papelTexture() {
  const cv = document.createElement("canvas");
  cv.width = 64; cv.height = 80;
  const x = cv.getContext("2d")!;
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, 64, 80);
  x.globalCompositeOperation = "destination-out";
  // a scalloped bottom edge, diamonds and dots
  for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(5 + i * 10.8, 80, 5, 0, Math.PI * 2); x.fill(); }
  for (const [px, py] of [[16, 26], [48, 26], [32, 44], [16, 60], [48, 60]]) {
    x.beginPath(); x.moveTo(px, py - 6); x.lineTo(px + 5, py); x.lineTo(px, py + 6); x.lineTo(px - 5, py); x.closePath(); x.fill();
  }
  for (const [px, py] of [[32, 18], [8, 44], [56, 44], [32, 66]]) { x.beginPath(); x.arc(px, py, 2.6, 0, Math.PI * 2); x.fill(); }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Palm trees (theme.ts): a slightly bent ringed trunk, eight drooping fronds and a few coconuts, one instanced mesh
 *  (one draw call, and one in the shadow pass) whose crowns sway in the wind. */
function makePalms(col: Colliders, extra: [number, number][] = []): THREE.InstancedMesh {
  const parts: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [];
  let px = 0, pz = 0;
  for (let i = 0; i < 6; i++) {
    const h = 1.05, y = 0.5 + i * h;
    parts.push([new THREE.CylinderGeometry(0.2 - i * 0.012, 0.24 - i * 0.012, h, 7, 1, true).translate(px, y, pz), i % 2 ? "#8b6a4f" : "#9a7a5c"]);
    px += 0.07 + i * 0.012;
  }
  const top = new THREE.Vector3(px, 6.6, pz);
  // the crown: ten fronds, each folded down its midrib, arching out and drooping to a point, the young ones higher
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + (i % 2) * 0.22, k = i % 3;
    parts.push([palmFrond(3.0 + k * 0.4, 0.9 + k * 0.08, 0.75 - k * 0.32).rotateY(a).translate(top.x, top.y - 0.05, top.z), ["#3f8f3a", "#4fa64a", "#57b04f"][k]]);
  }
  parts.push([new THREE.CylinderGeometry(0.2, 0.26, 0.5, 6, 1, true).translate(top.x, top.y - 0.15, top.z), "#6f8a3a"]); // the crown's green base
  // a cluster of coconuts under it
  for (let i = 0; i < 5; i++) parts.push([new THREE.OctahedronGeometry(0.18, 0).translate(top.x + Math.cos(i * 1.26) * 0.27, top.y - 0.38 - (i % 2) * 0.14, top.z + Math.sin(i * 1.26) * 0.27), i % 3 ? "#6b4a2b" : "#6f8a2f"]);
  // (two-sided: the fronds are thin leaves seen from below; within ~3 m of the camera they dissolve, so a palm beside
  // the follow camera never fills the picture)
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = wind;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uWind;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float sway = max(0.0, position.y - 4.0) * 0.07;
          vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
          transformed.x += sin(uWind * 0.9 + ip.x * 0.31 + ip.y * 0.17) * sway;
          transformed.z += cos(uWind * 0.7 + ip.x * 0.19 - ip.y * 0.23) * sway * 0.7;
        #endif`);
    nearFadeShader(sh);
  };
  m.customProgramCacheKey = () => "palms-sway-nearfade";
  const spots = [...THEME.palms, ...extra].filter(([x, z]) => !col.blocked(x, z, 0.5));
  const mesh = new THREE.InstancedMesh(colourMerge(parts), m, spots.length);
  const r = rand(77);
  const o = new THREE.Object3D();
  spots.forEach(([x, z], i) => {
    o.position.set(x, 0, z);
    o.rotation.set(0, r() * Math.PI * 2, 0);
    o.scale.setScalar(0.9 + r() * 0.25);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    col.addCircle(x, z, 0.4);
  });
  mesh.castShadow = true;
  mesh.name = "palms";
  return mesh;
}

/** A palm frond along +z from the crown: `len` long, `w` across at its widest, leaving the crown `rise` radians above
 *  the horizontal and arching down under its weight; its two halves fold down from the midrib, it narrows to the stalk
 *  at the crown and to a point at its tip. */
function palmFrond(len: number, w: number, rise: number) {
  const N = 4, pos: number[] = [];
  const at = (t: number) => {
    const d = len * t, y = Math.sin(rise) * d - 0.55 * d * d / len, z = Math.cos(rise) * d * (1 - 0.08 * t);
    const half = (w / 2) * Math.min(1, Math.sin(Math.PI * Math.min(1, t * 1.05)) * 1.25) * (t < 0.12 ? t / 0.12 : 1);
    return { y, z, half, fold: half * 0.55 };
  };
  for (let i = 0; i < N; i++) {
    const a = at(i / N), b = at((i + 1) / N);
    for (const s of [-1, 1]) {
      const A = [0, a.y, a.z], B = [0, b.y, b.z], C = [s * b.half, b.y - b.fold, b.z], D = [s * a.half, a.y - a.fold, a.z];
      // (wound so each half faces up)
      if (s > 0) pos.push(...A, ...B, ...C, ...A, ...C, ...D); else pos.push(...A, ...C, ...B, ...A, ...D, ...C);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** The near-camera dissolve (theme.ts `nearFade`; the palms): fragments nearer than about 4.5 m to the camera are
 *  dropped in a short dither, as the papel picado's are, so a crown or a lantern beside the follow camera never fills
 *  the picture. Added to a material's shaders in onBeforeCompile. */
function nearFadeShader(sh: { vertexShader: string; fragmentShader: string }, near = 4.4, far = 5.0) {
  sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying float vNearCam;")
    .replace("#include <project_vertex>", "#include <project_vertex>\nvNearCam = length(mvPosition.xyz);");
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vNearCam;")
    .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
      if (smoothstep(${near.toFixed(2)}, ${far.toFixed(2)}, vNearCam) < fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))))) discard;`);
}
/** A material (a copy of one of the town's: the lamps') with the near-camera dissolve. */
function nearFaded<T extends THREE.Material>(m: T): T {
  m.onBeforeCompile = (sh) => nearFadeShader(sh);
  m.customProgramCacheKey = () => "nearfade";
  return m;
}

/** The selva round the town (theme.ts `selva`): the low jungle's canopy as soft round crowns in its greens, lighter on
 *  top, packed close in bands beyond the west meadow (behind the cenote), south of the railway and east behind the
 *  airport, and a ring round the cenote's far side; one instanced mesh with no shadow (it stands beyond the shadow's
 *  reach), drawn from its own random numbers. */
function makeSelva(): THREE.InstancedMesh {
  const greens = THEME.selva!.canopy, r = rand(4711);
  const spots: [number, number, number, number][] = []; // x, z, size, height
  const band = (x0: number, x1: number, z0: number, z1: number, step: number) => {
    for (let x = x0; x <= x1; x += step) for (let z = z0; z <= z1; z += step) spots.push([x + (r() - 0.5) * step * 0.9, z + (r() - 0.5) * step * 0.9, 3.4 + r() * 2.2, 0.65 + r() * 0.35]);
  };
  band(-180, -158, -66, 150, 6);
  band(-152, 228, 104, 122, 6);
  band(196, 214, -66, 98, 6);
  if (THEME.cenote) {
    const { x, z } = THEME.cenote;
    for (let i = 0; i < 18; i++) {
      const a = Math.PI * 0.35 + (i / 17) * Math.PI * 1.3, d = 12.5 + r() * 4; // round its far side (west), not the town's
      spots.push([x + Math.cos(a) * d, z + Math.sin(a) * d, 2.6 + r() * 1.6, 0.75 + r() * 0.3]);
    }
  }
  // a round crown: an icosahedron with a sphere's normals (soft), its top lighter than its underside
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const p = geo.attributes.position, nrm = geo.attributes.normal, col = new Float32Array(p.count * 3), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    nrm.setXYZ(i, v.x, v.y, v.z);
    const k = 0.72 + 0.42 * (v.y + 1) / 2;
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }), spots.length);
  const o = new THREE.Object3D(), c = new THREE.Color();
  spots.forEach(([x, z, s, h], i) => {
    o.position.set(x, s * h * 0.7 + 1.2, z);
    o.rotation.set(0, r() * Math.PI, 0);
    o.scale.set(s * (0.9 + r() * 0.3), s * h, s * (0.9 + r() * 0.3));
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    mesh.setColorAt(i, c.set(greens[Math.floor(r() * greens.length)]));
  });
  mesh.name = "selva";
  return mesh;
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

/** Lanchas afloat (theme.ts), each one mesh that rocks on the water like the boats. */
function makeLanchas() {
  boatMat ??= new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  return THEME.lanchas!.afloat.map(([bx, bz, rot, stripe], i) => {
    const mesh = new THREE.Mesh(coloured(MX.lanchaParts(stripe).map(([g, c]) => [g.translate(0, -0.3, 0), c])), boatMat!);
    mesh.position.set(bx, 0, bz);
    mesh.rotation.y = rot;
    mesh.castShadow = true;
    mesh.userData.boat = { phase: i * 1.7, rot };
    return mesh;
  });
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
/** The edition's outdoor pieces (theme.ts, mexican.ts), merged into one mesh at the end, and their signs (one
 *  texture). Nothing in Maple Harbor. */
const mx: MX.Part[] = [];
/** …and the ones that cast no shadow worth drawing (window bars, bougainvillea, roof parapets and tinacos, topes,
 *  sign posts). */
const mxFlat: MX.Part[] = [];
/** This edition's town (theme.ts `townMerge`): every plain coloured shape (an opaque Lambert colour with no texture, no
 *  glow, no shader of its own, no polygon offset) goes into a vertex-coloured mesh for its square of the town (`cell`
 *  metres a side, by its middle), one that casts shadows and one that doesn't, instead of a mesh per colour spread over
 *  the whole town: the same look (a flat-shaded colour keeps its facets) in a few draw calls for what is in view, and
 *  no triangles for the squares out of it. The rest (glass, lamps, signs, textured walls) is merged per material as
 *  before. */
/** What a square's mesh holds: shapes that cast shadows, ones that don't, the overhead lines (thin: the walking camera
 *  looks through them, no shadow) and roofs it looks through that do cast one (the gas station's canopy). */
type Kind = "cast" | "still" | "thin" | "thinCast";
class TownMerger extends Merger {
  private cells = new Map<string, Record<Kind, [THREE.BufferGeometry, THREE.Color][]>>();
  private box = new THREE.Box3();
  private c = new THREE.Vector3();
  constructor(private cell: number) { super(); }
  /** Each key as Merger has it: its first shape's shadow stands for every shape added under it, and each shape keeps
   *  its own material's colour (a plain one baked into the squares' meshes, another in Merger's own mesh). */
  private keys = new Map<string, { cast: boolean; receive: boolean; mats: Map<THREE.Material, { plain: boolean; color: THREE.Color; flat: boolean }> }>();
  add(key: string, m: THREE.Material, geo: THREE.BufferGeometry, cast = true, receive = true) {
    let k = this.keys.get(key);
    if (!k) { k = { cast, receive, mats: new Map() }; this.keys.set(key, k); }
    let e = k.mats.get(m);
    if (!e) {
      const l = m as THREE.MeshLambertMaterial;
      const plain = !!l.isMeshLambertMaterial && !l.map && !l.transparent && !l.vertexColors && l.side === THREE.FrontSide && l.emissive.getHex() === 0 && k.receive
        && !l.polygonOffset && l.depthWrite && !Object.prototype.hasOwnProperty.call(l, "onBeforeCompile");
      e = { plain, color: plain ? l.color.clone() : new THREE.Color(), flat: plain && l.flatShading };
      k.mats.set(m, e);
    }
    if (!e.plain) return super.add(key, m, geo, k.cast, k.receive);
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (e.flat) { g.deleteAttribute("normal"); g.computeVertexNormals(); } // (each triangle its own normal)
    else if (!g.attributes.normal) g.computeVertexNormals();
    // (the gas station's canopy: a roof the walking camera looks through, as Maple Harbor's own mesh is: after M.build)
    // (graphics round 6: and the hotel's canopy and its posts, the drop-off's posts, the taxi stand's sign pole: the camera
    // no longer shortens to a metre or goes up over her head walking by one, it looks through)
    this.put(g, e.color, /^gas-canopy|^hotel-canopy|^dropoff-post$|^taxi-sign-pole$/.test(key) ? "thinCast" : k.cast ? "cast" : "still");
  }
  /** The edition's vertex-coloured pieces (mexican.ts: flat-shaded) into the squares too: `kind` "thin" for the overhead
   *  lines (a mesh the walking camera looks through: userData.thin, no shadow). */
  addParts(parts: MX.Part[], kind: Kind) {
    for (const [geo, col] of parts) {
      const g = geo.index ? geo.toNonIndexed() : geo;
      g.deleteAttribute("normal"); g.computeVertexNormals();
      this.put(g, new THREE.Color(col), kind);
    }
  }
  private put(g: THREE.BufferGeometry, col: THREE.Color, kind: Kind) {
    this.box.setFromBufferAttribute(g.attributes.position as THREE.BufferAttribute).getCenter(this.c);
    const k = Math.floor(this.c.x / this.cell) + "," + Math.floor(this.c.z / this.cell);
    const e = this.cells.get(k) ?? this.cells.set(k, { cast: [], still: [], thin: [], thinCast: [] }).get(k)!;
    e[kind].push([g, col]);
  }
  build(parent: THREE.Object3D) {
    super.build(parent);
    const mat = (townMat ??= new THREE.MeshLambertMaterial({ vertexColors: true }));
    for (const [k, e] of this.cells) for (const kind of ["cast", "still", "thin", "thinCast"] as const) {
      if (!e[kind].length) continue;
      const mesh = new THREE.Mesh(colourMerge(e[kind]), mat);
      mesh.castShadow = kind === "cast" || kind === "thinCast";
      if (kind === "thin" || kind === "thinCast") mesh.userData.thin = true;
      mesh.receiveShadow = true;
      mesh.name = "town-" + kind + "-" + k;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
    }
    this.cells.clear();
    this.keys.clear();
  }
}
let townMat: THREE.MeshLambertMaterial | null = null;

/** The edition's overhead lines (theme.ts `cables`): a mesh the walking camera looks through (userData.thin). */
const wires: MX.Part[] = [];
/** (theme.ts `poleFade`) the overhead lines' poles, in a mesh that dissolves near the camera. */
const poleParts: MX.Part[] = [];
/** (theme.ts `regions`) the cenote, the ruins and the mirador at the town's far ends. */
const mxFar: MX.Part[] = [];
/** (theme.ts `casas`) the houses' portals overhead, for the conversation's camera (Town.portals). */
const portals: Town["portals"] = [];
/** (graphics round 5) roofs the walking camera looks through rather than stays under (userData.thin, cutout.ts), that
 *  still cast their shade: the palapas' thatch on the beach, the airport drop-off's thatch. */
const mxRoofs: MX.Part[] = [];
/** (theme.ts `farHide`) meshes of small things left out when the camera is farther than `r` from (x, z). */
const farHidden: { mesh: THREE.Object3D; x: number; z: number; r: number }[] = [];
let atlas: MX.SignAtlas | null = null;
/** Palms where the street trees along the beach would be, on a malecón (theme.ts). */
const beachPalms: [number, number][] = [];
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
  } else for (const b of THEME.lanchas ? makeLanchas() : makeBoats()) group.add(b);
  // beach umbrellas and seagull-free calm (palapas instead where the edition has them: addTownMx)
  if (!THEME.palapas.length) for (const [ux, uz, c] of [[-80, -67, "#e45b4f"], [-60, -68, "#f2c14e"], [40, -67, "#4a7bb7"], [70, -68, "#e45b4f"]] as [number, number, string][]) {
    M.add("umbrella", mat(c, { flat: true }), new THREE.ConeGeometry(1.6, 0.7, 8).translate(ux, 2.4, uz));
    M.add("umbrella-pole", mat("#ddd"), cylGeo(0.04, 0.04, 2.4, ux, 1.2, uz, 5));
    col.addCircle(ux, uz, 0.1);
    M.add("towel", mat("#ffffff"), boxGeo(1, 0.03, 1.9, ux + 1, 0.02, uz + 0.5), false);
  }
  void group;
}

function addTransport(M: Merger, col: Colliders, group: THREE.Group, r: () => number) {
  // taxi
  const { x, z, rot } = TAXI;
  const yellow = mat("#f5c518", { flat: true });
  if (!STYLED) group.add(staticColoured([[x, z, rot] as [number, number, number], ...(THEME.taxi ? THEME.taxis : [])].flatMap(([tx, tz, tr]) =>
    (THEME.taxi ? mxTaxiParts(THEME.taxi.body, THEME.taxi.trim) : carParts("#f5c518", { taxi: true })).map(([g, c]) => [g.rotateY(tr).translate(tx, 0, tz), c] as [THREE.BufferGeometry, THREE.ColorRepresentation])), "taxi"));
  else M.add("taxi", yellow, boxGeo(1.9, 0.72, 4.4, 0, 0.66, 0).rotateY(rot).translate(x, 0, z));
  // (theme.ts `taxis`: more waiting at the stand)
  if (THEME.taxi && !STYLED) for (const [tx, tz] of THEME.taxis) col.addBox(tx, tz, 4.4, 2.1);
  if (STYLED) {
    M.add("taxi", yellow, boxGeo(1.7, 0.6, 2.3, 0, 1.32, -0.1).rotateY(rot).translate(x, 0, z));
    M.add("car-glass", mat("#9ccbe6", { emissive: "#1b3a4c" }), boxGeo(1.72, 0.45, 2.1, 0, 1.32, -0.1).rotateY(rot).translate(x, 0, z), false);
    M.add("taxi-sign", mat("#ffffff", { emissive: "#666600" }), boxGeo(0.7, 0.25, 0.3, 0, 1.75, -0.1).rotateY(rot).translate(x, 0, z));
    M.add("taxi-check", mat("#222"), boxGeo(1.92, 0.12, 4.42, 0, 0.72, 0).rotateY(rot).translate(x, 0, z), false);
    for (const [wx, wz] of [[-0.9, 1.4], [0.9, 1.4], [-0.9, -1.4], [0.9, -1.4]]) {
      M.add("wheel", mat("#222"), cylGeo(0.36, 0.36, 0.3, 0, 0, 0, 10).rotateZ(Math.PI / 2).translate(wx, 0.36, wz).rotateY(rot).translate(x, 0, z));
    }
  }
  col.addBox(x, z, 4.4, 2.1, "car");
  // the stand's sign: Maple Harbor's yellow TAXI, or the edition's (theme.ts: a "Sitio de Taxis" in the taxis' colours)
  const taxiSign = THEME.taxi
    ? new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.6), new THREE.MeshBasicMaterial({ map: textTexture(THEME.taxi.sign, { bg: THEME.taxi.trim, fg: "#ffffff", border: "#ffffff", w: 512, h: 134 }) }))
    : new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.5), new THREE.MeshBasicMaterial({ map: textTexture("TAXI", { bg: "#f5c518", fg: "#222", w: 256, h: 96 }) }));
  taxiSign.position.set(126.5, 2.4, 1.2); taxiSign.rotation.y = Math.PI;
  M.add(THEME.townMerge ? "taxi-sign-pole" : "sign-pole", mat("#9aa5ad"), cylGeo(0.05, 0.05, 2.5, 126.5, 1.25, 1.25, 6));
  col.addCircle(126.5, 1.25, 0.1);
  // (the edition's: looked through by the walking camera, as its pole is: graphics round 6, TownMerger)
  if (THEME.taxi && THEME.townMerge) taxiSign.userData.thin = true;
  group.add(taxiSign);
  // bus stop shelter
  const b = BUS_STOP;
  M.add("bus-shelter", mat("#2f3a40"), boxGeo(3.6, 0.12, 1.6, b.x, 2.6, b.z));
  // the roof rests on two posts at the ends of the back glass (inside its collider, so the sidewalk stays open)
  for (const s of [-1, 1]) M.add("bus-shelter", mat("#2f3a40"), boxGeo(0.1, 2.55, 0.1, b.x + s * 1.75, 1.275, b.z + 0.75));
  M.add("bus-glass", mat("#bfe3f2", { transparent: 0.45 }), boxGeo(3.6, 2.2, 0.06, b.x, 1.4, b.z + 0.75), false);
  M.add("bench", mat("#9c6b43"), boxGeo(2.4, 0.1, 0.45, b.x, 0.5, b.z + 0.4));
  // solid, only its back half, so Frank's talk spot under the shelter's roof stays open
  col.addBox(b.x, b.z + 0.55, 2.4, 0.18);
  col.addBox(b.x, b.z + 0.75, 3.6, 0.2);
  const busWide = THEME.busSign.length > 4; // a longer word gets a wider sign
  const busSign = new THREE.Mesh(new THREE.PlaneGeometry(busWide ? 1.3 : 0.8, busWide ? 0.5 : 0.8), new THREE.MeshBasicMaterial({ map: textTexture(THEME.busSign, { bg: "#1f6f78", fg: "#fff", w: busWide ? 256 : 128, h: busWide ? 98 : 128 }) }));
  busSign.position.set(b.x - 2.2, 2.6, b.z - 0.2);
  M.add("sign-pole", mat("#9aa5ad"), cylGeo(0.05, 0.05, 3, b.x - 2.2, 1.5, b.z - 0.25, 6));
  col.addCircle(b.x - 2.2, b.z - 0.25, 0.1);
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
  // the station's name on the canopy's front, where the street sees it (the canopy hides the shop's sign behind it from
  // the street); see-through for the walking camera with the canopy (its name: buildTown, userData.thin)
  // (this edition's name for it: themed, as the building's own sign)
  const gasDef = BUILDINGS.find((b) => b.id === "gas"), gasName = gasDef && themed(gasDef).sign;
  if (gasName) {
    const gs = new THREE.Mesh(new THREE.PlaneGeometry(7, 0.58), new THREE.MeshBasicMaterial({ map: textTexture(gasName, { bg: "#f4f4f4", fg: "#d94b3d", w: 1024, h: 85 }), alphaTest: 0.5, toneMapped: false }));
    gs.name = "gas-canopy-sign";
    gs.position.set(112, 5.0, 0.94); gs.rotation.y = Math.PI;
    group.add(gs);
  }
  // the pumps' numbers on the canopy's posts, towards the street (on the pumps, the posts hid them from the street)
  for (let i = 0; i < 3; i++) {
    const n = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: textTexture(String(i + 1), { bg: "#ffffff", fg: "#d94b3d", w: 128, h: 128 }) }));
    n.position.set(104 + i * 6, 2.2, 2.8); n.rotation.y = Math.PI;
    group.add(n);
  }
  // rental cars lot
  for (const [cx, c] of [[78, "#ffffff"], [82, "#4a7bb7"], [86, "#e45b4f"], [90, "#3d3d46"]] as [number, string][]) {
    const body = mat(c, { flat: true });
    M.add("car-" + c, body, boxGeo(1.9, 0.7, 4.2, cx, 0.65, 20));
    M.add("car-" + c, body, boxGeo(1.7, 0.6, 2.2, cx, 1.3, 19.8));
    col.addBox(cx, 20, 2, 4.3, "car");
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
  col.addBox(x, z, Math.abs(Math.cos(rot)) * 2 + Math.abs(Math.sin(rot)) * 4.4, Math.abs(Math.sin(rot)) * 2 + Math.abs(Math.cos(rot)) * 4.4, "car");
  // the sign on the windshield, read from the street
  // (bold, on two lines and as big as the windshield allows: the thin one-line script could not be read from the street)
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.4), new THREE.MeshBasicMaterial({ map: textTexture(townSign("FOR SALE $9,000"), { bg: "#fffaf0", fg: "#c0182f", w: 384, h: 134, lines: 2 }) }));
  const off = new THREE.Vector3(0.2, 1.2, 0.645).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  sign.position.set(x + off.x, off.y, z + off.z);
  sign.rotation.y = rot;
  group.add(sign);
}

function addBackyard(M: Merger, col: Colliders, group: THREE.Group) {
  // Sophie's backyard party: fence, string lights, grill, table
  const bx = -54, bz = 64;
  // side fences; the east one has an open garden gate (z bz-4.6 … bz-1.2) reached along the side of the house
  const gate0 = bz - 4.6, gate1 = bz - 1.2;
  const wall = THEME.backyardWall; // (this edition's barda instead of the picket fence: mexican.ts bardaYard)
  if (!wall) {
    for (let i = -8; i <= 8; i += 0.5) {
      for (const zz of [bz + 6.5]) M.add("fence", mat("#ffffff"), boxGeo(0.1, 1.2, 0.06, bx + i, 0.6, zz));
    }
    for (let j = -5.5; j <= 6.5; j += 0.5) for (const xx of [bx - 8, bx + 8]) {
      if (xx > bx && bz + j > gate0 && bz + j < gate1) continue;
      M.add("fence", mat("#ffffff"), boxGeo(0.06, 1.2, 0.1, xx, 0.6, bz + j));
    }
  }
  col.addBox(bx, bz + 6.5, 16.2, 0.2); col.addBox(bx - 8, bz + 0.5, 0.2, 12);
  col.addBox(bx + 8, (bz - 5.5 + gate0) / 2, 0.2, gate0 - (bz - 5.5));
  col.addBox(bx + 8, (gate1 + bz + 6.5) / 2, 0.2, bz + 6.5 - gate1);
  // gate arch with balloons, so the party is easy to spot from Oak Avenue (the barda's pillars hold the balloons)
  if (!wall) {
    for (const gz of [gate0, gate1]) M.add("gate-post", mat("#ffffff"), boxGeo(0.16, 2.5, 0.16, bx + 8, 1.25, gz));
    M.add("gate-post", mat("#ffffff"), boxGeo(0.16, 0.16, gate1 - gate0 + 0.16, bx + 8, 2.5, (gate0 + gate1) / 2));
  }
  const balloonCols = ["#e84a5f", "#ffd166", "#4a7bb7", "#6fbf73", "#b56576", "#f7a072"];
  const balloons: [number, number, number][] = [];
  balloonCols.forEach((c, i) => {
    const gz = i < 3 ? gate0 : gate1, a = (i % 3) * 2.1;
    const x = bx + 8 + Math.cos(a) * 0.28, y = 2.9 + (i % 3) * 0.22, z = gz + Math.sin(a) * 0.28;
    M.add("balloon-" + c, mat(c), new THREE.SphereGeometry(0.26, 10, 8).scale(1, 1.2, 1).translate(x, y, z));
    balloons.push([x, y, z]);
  });
  if (wall) MX.bardaYard(mx, col, bx, bz, gate0, gate1, wall, balloons);
  // a little sign in the front garden pointing to the party
  M.add("sign-pole", mat("#8a6a4a"), cylGeo(0.05, 0.05, 1.3, bx + 7.6, 0.65, bz - 18.4, 6));
  col.addCircle(bx + 7.6, bz - 18.4, 0.1);
  const partySign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.5), new THREE.MeshBasicMaterial({ map: textTexture(townSign("Party → backyard"), { bg: "#fff6e0", fg: "#b5485d", w: 384, h: 128, lines: 2 }) }));
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
  for (const [px, pz] of [[bx - 7.6, bz - 0.5], [bx + 7.6, bz - 0.5], [bx - 7.6, bz + 4.5], [bx + 7.6, bz + 4.5]]) {
    M.add("canopy-post", mat("#8a6a4a"), cylGeo(0.06, 0.06, 3.3, px, 1.65, pz, 6));
    col.addCircle(px, pz, 0.12);
  }
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
    if (THEME.light) g.scale.setScalar(THEME.light.clouds); // (bigger cumulus over the edition's town)
    g.userData.v = 0.6 + r() * 0.8;
    group.add(g);
    clouds.push(g);
  }
  return clouds;
}

export { roundRect };
