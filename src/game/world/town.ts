// Builds the outdoor town of Maple Harbor from layout.ts: ground, sea, buildings, props, colliders, doors.
import * as THREE from "three";
import { BUILDINGS, ROADS, SIDEWALK, WORLD, STALLS, TAXI, BUS_STOP, FOUNTAIN, LIGHTHOUSE, PARK, SQUARE, BEACH_Z, SEA_Z, PARKED_CARS, CONVERTIBLE, CEDAR_DRIVE, type BuildingDef } from "./layout";
import { Merger, mat, boxGeo, cylGeo, textTexture, rand, Colliders, roundRect } from "./util";
import { STYLED, IS_REAL, grade } from "../style";
import { GROUND_BLOCKS, groundPalette, groundExtras, groundMaterial, seaMaterial, trunkGeometry, canopyGeometry, canopyMaterial, bushGeometry, bushMaterial, outlineInstanced, cloudMaterial, cloudPuff } from "./styled";

export interface Door { loc: string; bid: string; x: number; z: number; face: "n" | "s" | "e" | "w"; name: string; outX: number; outZ: number; rot: number }

export interface Town {
  group: THREE.Group;
  colliders: Colliders;
  doors: Door[];
  groundCanvas: HTMLCanvasElement;
  update(t: number, dt: number): void;
  walkableAt(x: number, z: number): boolean;
}

const PPM = 6; // ground texture pixels per metre
const GW = WORLD.maxX - WORLD.minX, GD = WORLD.maxZ - SEA_Z + 2;
const G0Z = SEA_Z - 2;

export function buildTown(): Town {
  const group = new THREE.Group();
  group.name = "town";
  const colliders = new Colliders();
  const doors: Door[] = [];
  const M = new Merger();
  const r = rand(7);

  // --- ground -------------------------------------------------------------
  const groundCanvas = drawGround();
  const gtex = new THREE.CanvasTexture(groundCanvas);
  gtex.colorSpace = THREE.SRGBColorSpace;
  gtex.anisotropy = 8;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GW, GD), STYLED ? groundMaterial(gtex) : new THREE.MeshLambertMaterial({ map: gtex }));
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
    const hx = 35 + Math.cos(a) * (230 + r() * 60), hz = 30 + Math.sin(a) * (170 + r() * 50);
    if (hz < SEA_Z + 10) continue;
    const s = 30 + r() * 40;
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
        c += vec3(0.08) * smoothstep(0.55, 1.0, w);
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

  M.build(group);

  const clouds = makeClouds(group, r);

  return {
    group, colliders, doors, groundCanvas,
    update(t, dt) {
      seaMat.uniforms.uTime.value = t;
      for (const c of clouds) {
        c.position.x += dt * c.userData.v;
        if (c.position.x > 260) c.position.x = -200;
      }
    },
    walkableAt(x, z) {
      return x > WORLD.minX && x < WORLD.maxX && z > WORLD.minZ && z < WORLD.maxZ && !colliders.blocked(x, z, 0.3);
    },
  };
}

// ---------------------------------------------------------------------------

function toC(x: number, z: number): [number, number] { return [(x - WORLD.minX) * PPM, (z - G0Z) * PPM]; }

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
  for (let gx = SQUARE.x1; gx <= SQUARE.x2; gx += 2) { x.beginPath(); x.moveTo(...toC(gx, SQUARE.z1)); x.lineTo(...toC(gx, SQUARE.z2)); x.stroke(); }
  for (let gz = SQUARE.z1; gz <= SQUARE.z2; gz += 2) { x.beginPath(); x.moveTo(...toC(SQUARE.x1, gz)); x.lineTo(...toC(SQUARE.x2, gz)); x.stroke(); }
  x.fillStyle = P.plazaCircle; x.beginPath(); x.arc(...toC(FOUNTAIN.x, FOUNTAIN.z), 8 * PPM, 0, Math.PI * 2); x.fill();
  // lots behind buildings / station forecourt / terminal forecourt
  rectW(x, 28, 45, 62, 48.5, P.lot);
  rectW(x, 126, -30, 134, 14, P.lot);
  rectW(x, 102, 1, 124, 12, P.gasLot); // gas forecourt
  // sidewalks
  for (const rd of ROADS) roadRect(x, rd, rd.w / 2 + SIDEWALK, P.sidewalk);
  for (const rd of ROADS) roadRect(x, rd, rd.w / 2 + SIDEWALK - 0.25, P.sidewalkInner);
  // roads
  for (const rd of ROADS) roadRect(x, rd, rd.w / 2, P.road);
  // markings
  for (const rd of ROADS) {
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
    x.fillStyle = P.crosswalk;
    for (let k = -v.w / 2 + 0.6; k < v.w / 2 - 0.4; k += 1.1) {
      for (const dz of [-(h.w / 2 + 1.6), h.w / 2 + 0.4]) rectFill(x, v.x1 + k, h.z1 + dz, 0.55, 1.2);
    }
    for (let k = -h.w / 2 + 0.6; k < h.w / 2 - 0.4; k += 1.1) {
      for (const dx of [-(v.w / 2 + 1.6), v.w / 2 + 0.4]) rectFill(x, v.x1 + dx, h.z1 + k, 1.2, 0.55);
    }
  }
  // mid-block crosswalks on Main Street (café ↔ museum, bank ↔ square)
  for (const cx of [-50, 22, 100]) {
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
  const wallMat = mat(b.color);
  const trimMat = mat(b.trim ?? "#6b6b6b");
  const glassMat = mat("#9ccbe6", { emissive: "#1b3a4c" });
  const darkGlass = mat("#5f8fb0", { emissive: "#0e2233" });
  const key = b.id;
  const { n, t, halfDepth, halfWidth } = faceInfo(b);
  // walls
  M.add(`${key}-walls`, wallMat, boxGeo(b.w, b.h, b.d, b.x, b.h / 2, b.z));
  // plinth and cornice
  M.add(`trim-${b.trim}`, trimMat, boxGeo(b.w + 0.3, 0.5, b.d + 0.3, b.x, 0.25, b.z));
  if (b.roof !== "gable") M.add(`trim-${b.trim}`, trimMat, boxGeo(b.w + 0.5, 0.6, b.d + 0.5, b.x, b.h - 0.1, b.z));
  col.addBox(b.x, b.z, b.w, b.d, "building");

  // roof
  if (b.roof === "gable") {
    const rw = (b.face === "n" || b.face === "s") ? b.w : b.d;
    const rd = (b.face === "n" || b.face === "s") ? b.d : b.w;
    const shape = new THREE.Shape();
    shape.moveTo(-rd / 2 - 0.5, 0); shape.lineTo(0, rd * 0.32); shape.lineTo(rd / 2 + 0.5, 0); shape.lineTo(-rd / 2 - 0.5, 0);
    const g = new THREE.ExtrudeGeometry(shape, { depth: rw + 0.8, bevelEnabled: false });
    g.translate(0, 0, -(rw + 0.8) / 2);
    g.rotateY(b.face === "n" || b.face === "s" ? Math.PI / 2 : 0);
    g.translate(b.x, b.h, b.z);
    M.add(`roof-${b.roofColor}`, mat(b.roofColor ?? "#6b4f3a", { flat: true }), g);
  } else {
    M.add("roof-flat", mat("#8f8c86"), boxGeo(b.w - 0.4, 0.1, b.d - 0.4, b.x, b.h + 0.02, b.z), false);
    if (r() < 0.7 && b.h < 14) M.add("roof-box", mat("#a6a39c"), boxGeo(2.2, 1.2, 1.6, b.x + (r() - 0.5) * b.w * 0.5, b.h + 0.6, b.z + (r() - 0.5) * b.d * 0.4));
  }

  // door
  const doorOff = b.doorOffset ?? 0;
  const dx = b.x + n[0] * halfDepth + t[0] * doorOff, dz = b.z + n[1] * halfDepth + t[1] * doorOff;
  const doorW = b.doorWidth ?? (b.style === "terminal" || b.style === "station" || b.style === "museum" || b.style === "hotel" ? 3.4 : 1.8);
  const rotY = Math.atan2(n[0], n[1]);
  const doorMat = b.style === "house" ? mat(b.trim === "#ffffff" ? "#8a5a44" : b.trim!) : darkGlass;
  M.add(`door-${key}`, doorMat, boxGeo(doorW, 2.5, 0.15, 0, 1.25, 0, 0).rotateY(rotY).translate(dx + n[0] * 0.05, 0, dz + n[1] * 0.05));
  M.add(`trim-${b.trim}`, trimMat, boxGeo(doorW + 0.4, 0.25, 0.25, 0, 2.62, 0).rotateY(rotY).translate(dx + n[0] * 0.08, 0, dz + n[1] * 0.08));
  if (b.loc) {
    const out = 2.2;
    doors.push({ loc: b.loc, bid: b.id, x: dx, z: dz, face: b.face, name: b.sign || b.loc, outX: dx + n[0] * out, outZ: dz + n[1] * out, rot: Math.atan2(n[0], n[1]) });
    // welcome mat
    M.add("mat", mat("#7a4b36"), boxGeo(doorW + 0.4, 0.04, 1.1, 0, 0.02, 0).rotateY(rotY).translate(dx + n[0] * 0.7, 0, dz + n[1] * 0.7), false);
  }

  // windows on every facade
  const floors = Math.max(1, Math.floor((b.h - 1) / 3.2));
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
        const wx = b.x + fx * (hd + 0.04) + tx * o, wz = b.z + fz * (hd + 0.04) + tz * o;
        const bigShop = isFront && f === 0 && (b.style === "shop" || b.style === "restaurant");
        const ww = b.style === "office" || b.style === "terminal" ? spacing - 0.3 : bigShop ? Math.min(2.6, spacing - 0.3) : 1.3;
        const wh = b.style === "office" || b.style === "terminal" ? 2.6 : bigShop ? 2.2 : 1.5;
        M.add("glass", b.style === "office" ? darkGlass : glassMat, boxGeo(ww, wh, 0.08, 0, 0, 0).rotateY(rot).translate(wx, y - (bigShop ? 0.35 : 0), wz));
        if (b.style !== "office" && b.style !== "terminal") {
          M.add(`trim-${b.trim}`, trimMat, boxGeo(ww + 0.25, 0.14, 0.16, 0, 0, 0).rotateY(rot).translate(wx, y - (bigShop ? 0.35 : 0) - wh / 2 - 0.05, wz));
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
}

function cafeTable(M: Merger, col: Colliders, x: number, z: number, umbrella: string) {
  M.add("table", mat("#f2efe8"), cylGeo(0.5, 0.5, 0.06, x, 0.75, z, 12));
  M.add("table-leg", mat("#555"), cylGeo(0.05, 0.05, 0.75, x, 0.37, z, 6));
  M.add("umbrella", mat(umbrella, { flat: true }), new THREE.ConeGeometry(1.4, 0.6, 8).translate(x, 2.4, z));
  M.add("umbrella-pole", mat("#ddd"), cylGeo(0.03, 0.03, 2.2, x, 1.2, z, 5));
  for (const a of [0, Math.PI]) M.add("chair", mat("#3b5b4a"), boxGeo(0.45, 0.5, 0.45, x + Math.cos(a) * 0.8, 0.25, z + Math.sin(a) * 0.8));
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
  const car = (x: number, z: number, rot: number, color: string) => {
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
  void group; void r;
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
  const leafGeo = STYLED ? canopyGeometry() : new THREE.IcosahedronGeometry(1.6, 1).translate(0, 3.3, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, mat("#7a5236"), n);
  const leaves = new THREE.InstancedMesh(leafGeo, STYLED ? canopyMaterial() : new THREE.MeshLambertMaterial({ flatShading: true }), n);
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
  // boats
  for (const [bx, bz, rot, c] of [[-10, -84, 0.3, "#e45b4f"], [10, -90, -0.6, "#4a7bb7"], [30, -80, 1.2, "#f2c14e"], [-58, -86, 0.1, "#ffffff"], [60, -96, 2.4, "#6fbf73"]] as [number, number, number, string][]) {
    const hull = new THREE.BoxGeometry(2.2, 0.9, 6); hull.rotateY(rot); hull.translate(bx, 0.1, bz);
    M.add("boat-" + c, mat(c, { flat: true }), hull);
    M.add("boat-cabin", mat("#f4f6f8"), boxGeo(1.4, 0.9, 1.8, 0, 0, 0).rotateY(rot).translate(bx, 1, bz));
    M.add("boat-mast", mat("#ddd"), cylGeo(0.05, 0.05, 5, bx, 3, bz, 5));
  }
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
  M.add("taxi", yellow, boxGeo(1.9, 0.72, 4.4, 0, 0.66, 0).rotateY(rot).translate(x, 0, z));
  M.add("taxi", yellow, boxGeo(1.7, 0.6, 2.3, 0, 1.32, -0.1).rotateY(rot).translate(x, 0, z));
  M.add("car-glass", mat("#9ccbe6", { emissive: "#1b3a4c" }), boxGeo(1.72, 0.45, 2.1, 0, 1.32, -0.1).rotateY(rot).translate(x, 0, z), false);
  M.add("taxi-sign", mat("#ffffff", { emissive: "#666600" }), boxGeo(0.7, 0.25, 0.3, 0, 1.75, -0.1).rotateY(rot).translate(x, 0, z));
  M.add("taxi-check", mat("#222"), boxGeo(1.92, 0.12, 4.42, 0, 0.72, 0).rotateY(rot).translate(x, 0, z), false);
  for (const [wx, wz] of [[-0.9, 1.4], [0.9, 1.4], [-0.9, -1.4], [0.9, -1.4]]) {
    M.add("wheel", mat("#222"), cylGeo(0.36, 0.36, 0.3, 0, 0, 0, 10).rotateZ(Math.PI / 2).translate(wx, 0.36, wz).rotateY(rot).translate(x, 0, z));
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
