import * as THREE from "three";
import { KEEPER_LOOK, KEEPER_NPC } from "../../content/keeper";
import type { TalkActor } from "../Game";
import type { OcclusionField } from "../occlusion";
import { createCharacter } from "../characters";
import { addIslandTower, addLighthouse } from "./lighthouseTower";
import { buoy, mums } from "./maple";
import { boxGeo, colourMerge, rand } from "./util";
import type { IslandPlan, IslandPoint } from "./island";

type Parts = [THREE.BufferGeometry, THREE.ColorRepresentation][];

export function attachLighthouseIsland(island: IslandPlan, town: THREE.Group, field: OcclusionField,
  learnerAt: THREE.Vector3, dry?: THREE.Object3D[]) {
  const scene = buildLighthouseIsland(island);
  try {
    scene.keeper.watch = learnerAt;
    scene.group.visible = !dry;
    town.add(scene.group);
    scene.ground.updateWorldMatrix(true, false);
    field.addGeometry(scene.ground.geometry, scene.ground.matrixWorld);
    dry?.push(scene.group);
    return scene;
  } catch (error) {
    scene.dispose();
    throw error;
  }
}

function facet(points: [number, number, number][]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(points.flat(), 3));
  g.computeVertexNormals();
  return g;
}

function addGull(parts: Parts, x: number, y: number, z: number, rot: number, flight: boolean) {
  const add = (g: THREE.BufferGeometry, color: string) => parts.push([g.rotateY(rot).translate(x, y, z), color]);
  add(new THREE.SphereGeometry(0.22, 7, 4).scale(0.65, 0.68, 1.48).translate(0, 0.18, 0), "#e5e3da");
  add(new THREE.SphereGeometry(0.13, 7, 4).translate(0, 0.27, 0.22), "#fcf7e8");
  add(new THREE.ConeGeometry(0.058, 0.19, 4).rotateX(Math.PI / 2).translate(0, 0.245, 0.40), "#dba03b");
  for (const s of [-1, 1]) {
    const wing = flight ? 0.81 : 0.2;
    add(new THREE.SphereGeometry(1, 6, 3).scale(wing, 0.055, 0.18)
      .rotateY(s * 0.20).translate(s * (wing + 0.06) * 0.71, 0.18, -0.06), "#a9b6bd");
    add(new THREE.SphereGeometry(1, 5, 3).scale(0.14, 0.043, 0.09)
      .translate(s * (flight ? 1.23 : 0.18), 0.179, -0.18), "#455259");
    if (!flight) add(boxGeo(0.035, 0.14, 0.035, s * 0.06, 0.07, 0.055), "#dba03b");
  }
}

/** Steam-bent hoops and spaced wooden laths on a pair of skids. */
function addLobsterPot(parts: Parts, x: number, y: number, z: number) {
  const add = (g: THREE.BufferGeometry, color: string) => parts.push([g.rotateY(-0.23).translate(x, y, z), color]);
  for (const side of [-0.38, 0.38]) add(boxGeo(1.65, 0.12, 0.14, 0, 0.06, side), "#76533b");
  for (let i = 0; i <= 8; i++) {
    const a = i * Math.PI / 8;
    const color = i % 3 === 1 ? "#c89c65" : "#ab7b50";
    add(new THREE.BoxGeometry(1.53, 0.075, 0.115).rotateX(Math.PI / 2 - a)
      .translate(0, 0.16 + Math.sin(a) * 0.5, Math.cos(a) * 0.5), color);
  }
  for (const u of [-0.7, 0, 0.7]) {
    add(new THREE.TorusGeometry(0.52, 0.041, 4, 8, Math.PI).rotateY(Math.PI / 2).translate(u, 0.16, 0), "#37524e");
    add(boxGeo(0.08, 0.09, 1.04, u, 0.15, 0), "#37524e");
  }
  // Funnel in the end of the pot, with daylight around the throat.
  add(new THREE.TorusGeometry(0.18, 0.033, 4, 8).rotateY(Math.PI / 2).translate(-0.67, 0.34, 0), "#e2ca97");
  for (const side of [-1, 1]) {
    add(new THREE.BoxGeometry(0.036, 0.035, 0.31).rotateX(side * 0.35)
      .translate(-0.68, 0.32, side * 0.33), "#aeab85");
  }
}

export function buildLighthouseIsland(island: IslandPlan) {
  const group = new THREE.Group();
  group.name = "lighthouse-island";
  const { center, outline, jetty: d, cottage, bench, keeper, y } = island;
  const parts: Parts = [], glow: Parts = [];
  const add = (g: THREE.BufferGeometry, color: string) => parts.push([g, color]);
  const box = (color: string, w: number, h: number, depth: number, x: number, yy: number, z: number, rot = 0) =>
    add(boxGeo(w, h, depth, x, yy, z, rot), color);
  const r = rand(182);

  // Sod over split granite. The dry lip follows the collision ring, while wet stones
  // tuck under it and break through the wash at different heights.
  const green = ["#89a463", "#85a063", "#91a968", "#819e63", "#8ba568"];
  const slate = ["#807e80", "#a39b91", "#99958e", "#748084", "#b5ab99"];
  const wet = ["#546769", "#667275", "#726f72"];
  const v = (p: IslandPoint, h: number): [number, number, number] => [p.x, h, p.z];
  const turf = outline.map(p => v(p, y - 0.12 - r() * 0.11));
  const toe = outline.map(p => v({
    x: THREE.MathUtils.lerp(center.x, p.x, 1.025), z: THREE.MathUtils.lerp(center.z, p.z, 1.025),
  }, -0.6 - r() * 0.26));
  for (let i = 0; i < outline.length; i++) {
    const j = (i + 1) % outline.length, p = outline[i], q = outline[j], a = v(p, y), b = v(q, y);
    add(facet([v(center, y), b, a]), green[i % green.length]);
    add(facet([a, b, turf[i], b, turf[j], turf[i]]), "#778651");
    add(facet([turf[i], turf[j], toe[i], turf[j], toe[j], toe[i]]), slate[i % slate.length]);
    add(facet([toe[i], toe[j], v(p, -2.4), toe[j], v(q, -2.4), v(p, -2.4)]), wet[i % wet.length]);

    const dx = q.x - p.x, dz = q.z - p.z, len = Math.hypot(dx, dz);
    const along = Math.atan2(-dz, dx);
    const count = Math.ceil(len / 2.6);
    for (let k = 0; k < count; k++) {
      const t = (k + 0.2 + 0.6 * r()) / count;
      const x = p.x + t * dx, z = p.z + t * dz;
      const height = 0.45 + 0.47 * r();
      add(new THREE.DodecahedronGeometry(1).rotateY(r() * 2).scale(0.8 + r() * 1.05, height, 0.58 + r() * 0.42)
        .rotateZ((r() - 0.5) * 0.36).rotateY(along).translate(x, y - height * 0.84, z), slate[Math.floor(r() * slate.length)]);
      const out = 0.48 + 0.32 * r();
      add(new THREE.IcosahedronGeometry(1).scale(0.59 + r() * 0.62, 0.32 + r() * 0.23, 0.53)
        .rotateY(along + r()).translate(x + dz / len * out, -0.31, z - dx / len * out), wet[k % wet.length]);
    }
  }

  for (const [i, t] of [[2, 0.30], [5, 0.57], [10, 0.39]]) {
    const p = outline[i], q = outline[(i + 1) % outline.length];
    const x = THREE.MathUtils.lerp(p.x, q.x, t), z = THREE.MathUtils.lerp(p.z, q.z, t);
    const yy = y - 0.32;
    add(new THREE.DodecahedronGeometry(0.48, 0).scale(1, 0.68, 1.25).translate(x, yy, z), slate[i % slate.length]);
    addGull(parts, x, yy + 0.29, z, i, false);
  }

  // Clusters of salt grass on the headland and at the turns in the path.
  for (const [ox, oz] of [[-10.2, -1], [-8.5, 2.0], [-5.2, 2.4], [-3, 5.95], [2.9, 5.8],
    [4.55, 1.45], [10.9, 1.0], [12, -2], [8.5, -4], [3.6, -6.8], [-4.3, -6.5], [-9.3, -4.7]]) {
    for (let clump = 0; clump < 4; clump++) {
      const cx = center.x + ox + (r() - 0.5) * 0.85, cz = center.z + oz + (r() - 0.5) * 0.55;
      for (let blade = 0; blade < 5; blade++) {
        const a = blade * 1.26 + r(), h = 0.24 + 0.3 * r();
        add(new THREE.ConeGeometry(0.07 + r() * 0.035, h, 3).translate(0, h / 2, 0)
          .rotateZ(0.15 + r() * 0.52).rotateY(a).translate(cx + 0.09 * Math.cos(a), y, cz - 0.09 * Math.sin(a)),
        ["#657d4b", "#849455", "#b3aa66"][blade % 3]);
      }
    }
  }
  for (const [ox, oz, size] of [[-8.8, 2.4, 0.34], [-8.25, 2.35, 0.26], [4.85, 1.7, 0.38],
    [5.38, 1.81, 0.31], [10.65, 1.62, 0.37], [10.9, 1.26, 0.28]]) {
    mums(add, center.x + ox, y, center.z + oz, size, Math.floor(r() * 5));
  }

  const gravel = (a: IslandPoint, b: IslandPoint, order: number) => {
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
    const rot = Math.atan2(dx, dz);
    const base = y + order * 0.005;
    box("#c4b38f", 1.62, 0.025, len + 0.7, a.x + dx / 2, base + 0.014, a.z + dz / 2, rot);
    for (let i = 0; i < len * 6; i++) {
      const t = r(), side = (r() - 0.5) * 1.39;
      box(i % 3 ? "#b59f79" : "#dfcbaa", 0.08 + r() * 0.12, 0.014, 0.09 + r() * 0.13,
        a.x + dx * t + Math.cos(rot) * side, base + 0.035, a.z + dz * t - Math.sin(rot) * side, r() * 5);
    }
  };
  const junction = { x: 101, z: -83.1 };
  gravel({ x: d.x1 - 0.27, z: -83.15 }, junction, 0);
  gravel(junction, { x: center.x, z: center.z + 3.3 }, 1);
  gravel(junction, { x: cottage.x, z: -83.65 }, 2);
  gravel({ x: cottage.x, z: -83.65 }, { x: cottage.x, z: cottage.z + cottage.d / 2 + 0.3 }, 3);

  const lift = y - 0.45;
  const towerPart = (g: THREE.BufferGeometry, color: string) => add(g.translate(0, lift, 0), color);
  const panes = addIslandTower(towerPart, (g, color) => glow.push([g.translate(0, lift, 0), color]), center)
    .translate(0, lift, 0);
  addLighthouse(towerPart, center);

  const { x: cx, z: cz, w, d: depth } = cottage, front = cz + depth / 2;
  box("#8d8b7d", w + 0.12, 0.20, depth + 0.12, cx, y + 0.10, cz);
  box("#f0ddaf", w, 2.2, depth, cx, y + 1.24, cz);
  for (let k = 0; k < 10; k++) {
    const h = y + 0.26 + k * 0.195;
    box("#e6cf9f", w + 0.025, 0.029, depth + 0.035, cx, h, cz);
  }
  const roofY = y + 2.32, end = w / 2, slope = Math.atan2(1.15, depth / 2);
  add(facet([[cx - end, roofY, cz - depth / 2], [cx - end, roofY, front], [cx - end, roofY + 1.15, cz]]), "#f0ddaf");
  add(facet([[cx + end, roofY, front], [cx + end, roofY, cz - depth / 2], [cx + end, roofY + 1.15, cz]]), "#f0ddaf");
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(w + 0.45, 0.16, Math.hypot(depth / 2 + 0.22, 1.28))
    .rotateX(s * slope).translate(cx, roofY + 0.53, cz + s * (depth / 2 + 0.22) / 2), "#3d6966");
  box("#a66a53", 0.53, 1.48, 0.58, cx + 1.23, roofY + 0.85, cz - 0.68);
  box("#754f45", 0.66, 0.13, 0.68, cx + 1.23, roofY + 1.60, cz - 0.68);
  box("#f4ebd7", 1.03, 1.78, 0.10, cx, y + 1.02, front);
  box("#90433a", 0.84, 1.63, 0.12, cx, y + 0.97, front + 0.045);
  box("#d5aa59", 0.08, 0.09, 0.09, cx + 0.30, y + 0.93, front + 0.12);
  box("#8b8375", 1.18, 0.13, 0.43, cx, y + 0.065, front + 0.14);
  for (const s of [-1, 1]) {
    const wx = cx + s * 1.4;
    box("#f7ebcf", 0.93, 0.84, 0.11, wx, y + 1.35, front + 0.035);
    box("#568b9a", 0.71, 0.62, 0.10, wx, y + 1.35, front + 0.075);
    box("#f7ebcf", 0.048, 0.67, 0.03, wx, y + 1.35, front + 0.132);
    box("#f7ebcf", 0.77, 0.048, 0.03, wx, y + 1.35, front + 0.132);
  }

  // A striped cork life ring on the west gable, facing the landing.
  const gable = cx - w / 2;
  box("#685a48", 0.14, 0.8, 0.17, gable - 0.04, y + 1.48, cz + 0.43);
  for (let i = 0; i < 8; i++) {
    add(new THREE.TorusGeometry(0.36, 0.105, 6, 3, Math.PI / 4)
      .rotateZ(i * Math.PI / 4).rotateY(-Math.PI / 2).translate(gable - 0.17, y + 1.34, cz + 0.43),
    i % 2 ? "#fcf1d5" : "#c34d38");
  }

  for (const dz of [-0.58, 0.58]) box("#3a5452", 0.46, 0.41, 0.12, bench.x, y + 0.20, bench.z + dz);
  box("#b88653", 0.58, 0.08, 1.58, bench.x, y + 0.43, bench.z);
  for (const h of [0.66, 0.84]) box("#b88653", 0.075, 0.13, 1.58, bench.x - 0.24, y + h, bench.z);
  for (const dz of [-0.60, 0.60]) box("#3a5452", 0.09, 0.85, 0.08, bench.x - 0.24, y + 0.43, bench.z + dz);

  const plank = (d.x1 - d.x0) / 26, zm = (d.z1 + d.z0) / 2;
  const timber = ["#ac8558", "#bd9868", "#9c784e", "#b38b5d"];
  for (let i = 0; i < 26; i++) box(timber[i % timber.length], plank - 0.027, 0.15, d.z1 - d.z0,
    d.x0 + plank * (i + 0.5), d.y - 0.075, zm);
  for (const px of [d.x0 + 0.19, d.x0 + 3.25, d.x0 + 6.25]) for (const pz of [d.z0 + 0.19, d.z1 - 0.19]) {
    box("#765942", 0.26, 2.15, 0.26, px, d.y - 0.57, pz);
    box("#b79b72", 0.28, 0.07, 0.28, px, d.y + 0.50, pz);
  }
  const px = d.x0 + 0.19, pz = d.z0 + 0.19;
  box("#775940", 0.19, 1.19, 0.19, px, d.y + 0.65, pz);
  glow.push([boxGeo(0.30, 0.34, 0.30, px, d.y + 1.37, pz), "#ffe6a4"]);
  box("#39474a", 0.39, 0.06, 0.39, px, d.y + 1.19, pz);
  add(new THREE.ConeGeometry(0.28, 0.17, 4).rotateY(Math.PI / 4).translate(px, d.y + 1.61, pz), "#39474a");

  const potX = d.x1 + 0.54, potZ = d.z0 - 0.42;
  addLobsterPot(parts, potX, y, potZ);
  buoy(parts, potX - 0.98, y, potZ + 0.22, "#d95842", "#fff3ce", -0.34);
  buoy(parts, potX - 1.28, y, potZ - 0.08, "#e4b448", "#397675", 0.23);
  for (let i = 0; i < 2; i++) {
    add(new THREE.TorusGeometry(0.31 - i * 0.05, 0.044, 5, 12).rotateX(Math.PI / 2)
      .translate(potX + 0.15, y + 0.05 + 0.07 * i, potZ + 0.86), "#d2b584");
  }

  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const ground = new THREE.Mesh(colourMerge(parts), material);
  ground.name = "lighthouse-island-static";
  ground.receiveShadow = true;
  ground.castShadow = true;
  // One opaque pass for both lamps, then the eight panes together around the Fresnel lens.
  const lamps = colourMerge([...glow, [panes, "#afdad7"]]);
  const paneCount = panes.index!.count;
  const lampCount = lamps.attributes.position.count - paneCount;
  lamps.addGroup(0, lampCount, 0);
  lamps.addGroup(lampCount, paneCount, 1);
  const glass = new THREE.Mesh(lamps, [
    new THREE.MeshLambertMaterial({ vertexColors: true, emissive: "#ffd28a", emissiveIntensity: 0.56 }),
    new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 65,
      transparent: true, opacity: 0.27, depthWrite: false }),
  ]);
  glass.name = "lighthouse-island-lanterns";
  const bird: Parts = [];
  addGull(bird, 0, 0, 0, 0, true);
  const gull = new THREE.Mesh(colourMerge(bird), material);
  gull.name = "lighthouse-island-gull";

  const ch = createCharacter({ female: false, ...KEEPER_LOOK });
  ch.root.name = "lighthouse-keeper";
  ch.root.position.set(keeper.x, y, keeper.z);
  const { x, z } = keeper.approach;
  const rot = Math.atan2(keeper.x - x, keeper.z - z);
  ch.root.rotation.y = Math.atan2(x - keeper.x, z - keeper.z);
  const keeperActor: TalkActor = {
    id: KEEPER_NPC, ch, home: ch.root.position.clone(), rot: ch.root.rotation.y, approach: new THREE.Vector3(x, y, z),
  };
  group.add(ground, glass, gull, ch.root);

  return {
    group, ground, keeper: ch, keeperActor, keeperSpawn: { x, z, rot },
    // From across the path, the keeper is in three-quarter view against the cottage and water.
    keeperView: {
      pos: new THREE.Vector3(keeper.x - 0.8, y + 2.12, keeper.z + 4.85),
      look: new THREE.Vector3(keeper.x - 0.24, y + 1.25, keeper.z),
    },
    update(t: number) {
      const a = t * 0.29, dx = -13 * Math.sin(a), dz = 9 * Math.cos(a);
      gull.position.set(center.x + 13 * Math.cos(a), 5.8 + 0.65 * Math.sin(t * 0.83), center.z + 9 * Math.sin(a));
      gull.rotation.set(0, Math.atan2(dx, dz), -0.17 + 0.18 * Math.sin(t * 3.7));
    },
    dispose() {
      group.removeFromParent();
      for (const mesh of [ground, glass, gull]) mesh.geometry.dispose();
      material.dispose();
      for (const m of glass.material) m.dispose();
      ch.dispose?.();
    },
  };
}
