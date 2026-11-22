import * as THREE from "three";
import { colourMerge } from "../world/util";
import { STOP_BOUNDS } from "./route";

export function createStopBay() {
  const { halfLength, halfWidth } = STOP_BOUNDS;
  const dashWidth = 0.34;
  // Both directions approach with the curb on local -X. The dashes pick out the existing edge line.
  const curbRail = -1;
  const laneRail = halfWidth - dashWidth / 2;
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
