import * as THREE from "three";
import { ROADS } from "../world/layout";
import { colourMerge } from "../world/util";
import { approach, STOP_BOUNDS, type TaxiRoute } from "./route";

export function createStopBay(route: TaxiRoute) {
  const path = approach(route, route.decisions.length - 1);
  const stop = path[path.length - 1], previous = path[path.length - 2];
  const dx = stop.x - previous.x, dz = stop.z - previous.z;
  const eastWest = Math.abs(dx) > Math.abs(dz);
  const direction = Math.sign(eastWest ? dx : dz);
  const along = eastWest ? stop.x : stop.z, across = eastWest ? stop.z : stop.x;
  const { halfLength, halfWidth } = STOP_BOUNDS;
  const road = ROADS.find(({ x1, z1, x2, z2, w }) => {
    const [start, end, centre] = eastWest ? [x1, x2, z1] : [z1, z2, x1];
    return (eastWest ? z1 === z2 : x1 === x2)
      && along - halfLength >= start && along + halfLength <= end && Math.abs(across - centre) <= w / 2;
  });
  const dashWidth = 0.34;
  const curbSide = eastWest ? direction : -direction;
  const laneCentre = road ? (across - (eastWest ? road.z1 : road.x1)) * curbSide : halfWidth + 0.13;
  // The curb is on local -X. Leave extra room at the hotel, where the parked van occupies the curb lane.
  const nearestRail = -halfWidth + dashWidth / 2 + 0.30;
  const curbRail = road ? Math.max(nearestRail, laneCentre - road.w / 2 + 0.30) : nearestRail;
  const laneRail = Math.min(halfWidth, laneCentre - 0.13) - dashWidth / 2;
  const center = (curbRail + laneRail) / 2;
  const width = laneRail - curbRail + dashWidth;
  const endDepth = 0.38;
  const end = halfLength - endDepth / 2;
  const dashSpacing = (halfLength - endDepth) / 2;
  const strips: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [];
  const stripe = (x: number, z: number, w: number, d: number, color: THREE.ColorRepresentation) => {
    strips.push([new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2).translate(x, 0, z), color]);
  };
  for (const x of [curbRail, laneRail]) {
    for (const offset of [-1.5, -0.5, 0.5, 1.5]) stripe(x, dashSpacing * offset, dashWidth, 1.25, "#ffd05b");
  }
  for (const z of [-end, end]) stripe(center, z, width, endDepth, "#fff2cc");
  const paint = new THREE.Mesh(colourMerge(strips), new THREE.MeshBasicMaterial({
    vertexColors: true, toneMapped: false,
  }));

  // The circle's vertex alpha falls to zero at the rim, so the pulse stays soft on asphalt.
  const halo = new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2)
    .scale(width / 2, 1, 0.95).translate(center, -0.006, end);
  const colors = new THREE.BufferAttribute(new Float32Array(halo.attributes.position.count * 4).fill(1), 4);
  for (let i = 1; i < colors.count; i++) colors.setW(i, 0);
  halo.setAttribute("color", colors);
  const glow = new THREE.Mesh(halo, new THREE.MeshBasicMaterial({
    color: "#ffbf38", vertexColors: true, toneMapped: false, transparent: true, depthWrite: false,
  }));

  const root = new THREE.Group().add(paint, glow);
  root.name = "taxi-stop-bay";
  root.position.set(stop.x, 0.045, stop.z);
  root.rotation.y = road ? (eastWest ? direction * Math.PI / 2 : direction > 0 ? 0 : Math.PI) : Math.atan2(dx, dz);
  root.visible = false;
  return {
    root,
    pulse(elapsed: number) {
      glow.material.opacity = 0.30 + 0.16 * Math.cos(elapsed * Math.PI);
    },
    dispose() {
      root.removeFromParent();
      for (const mesh of [paint, glow]) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    },
  };
}
