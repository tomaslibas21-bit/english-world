import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const BOARD = { x: 32, z: -18.9, readZ: -17.3, width: 1.45, depth: 0.14 } as const;

/** Three boxes in one mesh. All faces sample maple at the atlas edge except the south-facing sheet. */
export function makeNoticeboard() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  function paint(phrase: string) {
    ctx.fillStyle = "#9a623c";
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "#583e2b";
    ctx.fillRect(8, 8, 240, 240);
    ctx.fillStyle = "#fff4d8";
    ctx.fillRect(11, 11, 234, 234);
    ctx.fillStyle = "#ad853a";
    ctx.beginPath();
    ctx.arc(128, 24, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = "#234d3b";
    ctx.font = "bold 20px Georgia, serif";
    ctx.fillText("Phrase of the day", 128, 62);
    ctx.fillStyle = "#bc9e65";
    ctx.fillRect(65, 76, 126, 2);
    ctx.font = "bold 30px Georgia, serif";
    const lines: string[] = [];
    for (const word of phrase.split(" ")) {
      const line = lines.at(-1);
      if (line && ctx.measureText(line + " " + word).width <= 204) lines[lines.length - 1] += " " + word;
      else lines.push(word);
    }
    ctx.fillStyle = "#213d31";
    lines.forEach((line, i) => ctx.fillText(line, 128, 163 + (i - (lines.length - 1) / 2) * 34, 204));
    texture.needsUpdate = true;
  }
  paint("");

  function box(w: number, h: number, d: number, x: number, y: number, sheet = false) {
    const geometry = new THREE.BoxGeometry(w, h, d).translate(x, y, 0);
    const uv = geometry.getAttribute("uv");
    const normal = geometry.getAttribute("normal");
    for (let i = 0; i < uv.count; i++) {
      if (!sheet || normal.getZ(i) !== 1) uv.setXY(i, 0.012, 0.5);
    }
    return geometry;
  }
  const parts = [box(BOARD.width, 1.22, BOARD.depth, 0, 1.63, true),
    box(0.09, 1.04, 0.10, -0.52, 0.52), box(0.09, 1.04, 0.10, 0.52, 0.52)];
  const geometry = mergeGeometries(parts)!;
  parts.forEach((part) => part.dispose());
  const material = new THREE.MeshLambertMaterial({ map: texture });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "phrase-noticeboard";
  mesh.position.set(BOARD.x, 0, BOARD.z);
  return { mesh, paint, dispose() { geometry.dispose(); material.dispose(); texture.dispose(); } };
}
