import * as THREE from "three";
import { boxGeo, colourMerge, cylGeo, type Colliders } from "../world/util";
import { BETOS_STAND, CALLER_CARD, LOTERIA_BULBS, LOTERIA_HOLDER, TABLE_SEAT, TABLE_Z, TABLES } from "./location";

export function loteriaTables(col: Colliders) {
  const group = new THREE.Group();
  group.name = "loteria-tables";
  const parts: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [];
  const bulbs: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [];
  const wood = "#91623f", iron = "#513d35", paper = "#fff0c8", red = "#aa3c40";
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) =>
    parts.push([boxGeo(w, h, d, x, y, z), color]);
  const table = (x: number, z: number, w: number, d: number, cloth: string) => {
    box(w, 0.12, d, x, 0.88, z, wood);
    box(w - 0.3, 0.025, d + 0.05, x, 0.95, z, cloth);
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
      box(0.12, 0.82, 0.12, x + dx * (w / 2 - 0.18), 0.41, z + dz * (d / 2 - 0.15), iron);
    }
    col.addBox(x, z, w, d);
  };
  const seats = [21.55, 22.75, 25.1, 26.2, 27.15];
  TABLES.forEach((x, i) => table(x, TABLE_Z, 3.35, 1, i === 0 ? "#af544a" : "#4c8581"));
  for (const [i, x] of seats.entries()) {
    const z = TABLE_Z + 0.98;
    box(0.56, 0.09, 0.53, x, TABLE_SEAT - 0.045, z, wood);
    box(0.56, 0.35, 0.08, x, 0.70, z + 0.25, wood);
    for (const dx of [-0.23, 0.23]) for (const dz of [-0.21, 0.21]) box(0.065, 0.52, 0.065, x + dx, 0.26, z + dz, iron);
    col.addBox(x, z, 0.56, 0.54);
    box(0.37, 0.025, 0.32, x, 0.97, TABLE_Z + 0.26, red);
    box(0.33, 0.015, 0.28, x, 0.99, TABLE_Z + 0.26, paper);
    for (let n = 0; n < 5; n++) {
      parts.push([new THREE.SphereGeometry(0.022, 6, 4).scale(1.3, 0.5, 1)
        .translate(x + n * 0.033 - 0.08, 1, TABLE_Z + 0.12 + (n % 2) * 0.045), i % 2 ? "#754331" : "#603329"]);
    }
  }
  const { x, z } = BETOS_STAND;
  table(x, z + 0.67, 1.62, 0.62, "#d8a65c");
  box(0.39, 0.085, 0.26, x - 0.46, 0.99, z + 0.64, iron);
  box(0.24, 0.06, 0.17, x - 0.46, 1.056, z + 0.64, paper);
  box(0.55, 0.07, 0.32, CALLER_CARD.x, 0.99, CALLER_CARD.z, iron);

  const flagColors = ["#eb7083", "#f8bd54", "#65b6a0", "#70a7d7", "#e38b52"];
  const poles = [20.05, 27.95];
  for (const row of [-25.03, -29.4]) {
    for (const px of poles) {
      parts.push([cylGeo(0.047, 0.065, 3.3, px, 1.65, row, 7), iron]);
      col.addCircle(px, row, 0.1);
    }
    const stringY = (t: number) => 3.24 - 0.48 * 4 * t * (1 - t);
    for (let i = 0; i < 20; i++) {
      const t = i / 20, next = (i + 1) / 20;
      const px = THREE.MathUtils.lerp(poles[0], poles[1], t);
      const end = THREE.MathUtils.lerp(poles[0], poles[1], next);
      const rise = stringY(next) - stringY(t);
      parts.push([new THREE.BoxGeometry(Math.hypot(end - px, rise) + 0.015, 0.022, 0.022)
        .rotateZ(Math.atan2(rise, end - px)).translate((px + end) / 2, (stringY(t) + stringY(next)) / 2, row), iron]);
      const y = stringY(t);
      bulbs.push([new THREE.SphereGeometry(0.05, 7, 5).translate(px, y - 0.045, row), i % 3 ? "#ffd081" : "#ffedac"]);
      if (i % 2 === 0 || i >= 19) continue;
      const flag = new THREE.Shape();
      flag.moveTo(-0.14, -0.06); flag.lineTo(0.14, -0.06); flag.lineTo(0.14, -0.26);
      flag.lineTo(0.07, -0.22); flag.lineTo(0, -0.27); flag.lineTo(-0.07, -0.23); flag.lineTo(-0.14, -0.26);
      const hole = new THREE.Path();
      hole.moveTo(0, -0.1); hole.lineTo(0.038, -0.155); hole.lineTo(0, -0.205); hole.lineTo(-0.038, -0.155); hole.closePath();
      flag.holes.push(hole);
      parts.push([new THREE.ShapeGeometry(flag).rotateY(i % 4 === 1 ? 0.28 : -0.22).translate(px + 0.18, y, row), flagColors[i % flagColors.length]]);
    }
  }
  const tables = new THREE.Mesh(colourMerge(parts), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  tables.receiveShadow = true;
  group.add(tables);
  const bulbGeometry = colourMerge(bulbs);
  const unlit = new THREE.Mesh(bulbGeometry, new THREE.MeshLambertMaterial({ vertexColors: true, color: "#847366" }));
  const lit = new THREE.Mesh(bulbGeometry, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
  lit.name = LOTERIA_BULBS;
  lit.visible = false;
  unlit.name = "loteria-bulbs-unlit";
  group.add(unlit, lit);

  const holder = new THREE.Mesh(colourMerge([
    [boxGeo(0.39, 0.5, 0.035, 0, 0, 0), red],
    [boxGeo(0.345, 0.45, 0.016, 0, 0, 0.02), paper],
    [new THREE.CylinderGeometry(0.09, 0.09, 0.01, 16).rotateX(Math.PI / 2).translate(0, 0.01, 0.032), red],
    [boxGeo(0.31, 0.41, 0.012, 0, 0, -0.021), "#d68165"],
  ]), new THREE.MeshLambertMaterial({ vertexColors: true }));
  holder.name = LOTERIA_HOLDER;
  holder.position.set(CALLER_CARD.x, CALLER_CARD.y, CALLER_CARD.z);
  holder.rotation.set(-0.14, -0.28, 0);
  group.add(holder);
  return group;
}

export function loteriaDusk(sky: THREE.Mesh, sun: THREE.DirectionalLight, hemi: THREE.HemisphereLight, fog: THREE.Scene["fog"]) {
  const uniforms = (sky.material as THREE.ShaderMaterial).uniforms;
  const dusk = { top: "#474467", mid: "#c1848a", bottom: "#f2b78a" };
  const colors = Object.entries(dusk).flatMap(([name, value]) => {
    const color: unknown = uniforms?.[name]?.value;
    return color instanceof THREE.Color ? [{ color, original: color.clone(), value }] : [];
  });
  if (!colors.length) return () => {};
  const daylight = { sun: sun.intensity, hemi: hemi.intensity, fog: fog?.color.clone() };
  for (const { color, value } of colors) color.set(value);
  sun.intensity *= 0.46;
  hemi.intensity *= 0.79;
  fog?.color.set("#c69ca4");
  return () => {
    for (const { color, original } of colors) color.copy(original);
    sun.intensity = daylight.sun;
    hemi.intensity = daylight.hemi;
    if (fog && daylight.fog) fog.color.copy(daylight.fog);
  };
}
