import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const BOARD = { x: 32, z: -18.9, readZ: -17.3, width: 1.45, depth: 0.14 } as const;

/** Fit whole words in the paper below the masthead. Short questions can use two poster-sized lines. */
function paintHeadline(ctx: CanvasRenderingContext2D, phrase: string) {
  const width = 220, height = 180;
  const words = phrase.split(/\s+/);
  for (let size = 108; size >= 18; size -= 2) {
    ctx.font = `900 ${size}px "Arial Black", "DejaVu Sans", Arial, sans-serif`;
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? line + " " + word : word;
      if (line && ctx.measureText(candidate).width > width) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    lines.push(line);
    const metrics = ctx.measureText(phrase);
    const ascent = metrics.actualBoundingBoxAscent;
    const descent = metrics.actualBoundingBoxDescent;
    const leading = Math.max(size * 0.92, ascent + descent + 2);
    const inkHeight = ascent + descent + (lines.length - 1) * leading;
    if (inkHeight > height || lines.some(text => ctx.measureText(text).width > width)) continue;
    const baseline = 52 + (height - inkHeight) / 2 + ascent;
    ctx.fillStyle = "#103d2a";
    lines.forEach((text, i) => ctx.fillText(text, 128, baseline + i * leading));
    break;
  }
}

/** Three boxes in one mesh. All faces sample maple at the atlas edge except the south-facing sheet. */
export function makeNoticeboard() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  function paint(phrase: string) {
    // Mitered maple rails. Keep the grain at the edges where it can survive the walking camera.
    const maple = ctx.createLinearGradient(0, 0, 246, 256);
    maple.addColorStop(0, "#d19b62");
    maple.addColorStop(0.45, "#996039");
    maple.addColorStop(1, "#744b31");
    ctx.fillStyle = maple;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "#663f2966";
    ctx.lineWidth = 1;
    for (let inset = 2; inset <= 8; inset += 3) ctx.strokeRect(inset, inset, 256 - 2 * inset, 256 - 2 * inset);
    for (const x of [0, 256]) {
      for (const y of [0, 256]) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x === 0 ? 10 : 246, y === 0 ? 10 : 246);
        ctx.stroke();
      }
    }

    ctx.fillStyle = "#604930";
    ctx.fillRect(9, 9, 238, 238);
    const paper = ctx.createLinearGradient(38, 11, 212, 245);
    paper.addColorStop(0, "#fff6dd");
    paper.addColorStop(0.68, "#fff9e9");
    paper.addColorStop(1, "#ebe0c1");
    ctx.fillStyle = paper;
    ctx.beginPath();
    ctx.moveTo(12, 12);
    ctx.lineTo(243, 11);
    ctx.lineTo(244, 237);
    ctx.lineTo(239, 243);
    ctx.lineTo(154, 242);
    ctx.lineTo(89, 244);
    ctx.lineTo(12, 242);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#d3c39e";
    ctx.beginPath();
    ctx.moveTo(239, 243);
    ctx.lineTo(238, 236);
    ctx.lineTo(244, 237);
    ctx.fill();
    // Short fibers in the stock, in the same places after each change of posting.
    ctx.fillStyle = "#76583014";
    for (let i = 0; i < 170; i++) {
      const x = 14 + ((i * 71) % 227);
      const y = 14 + ((i * i * 13 + i * 37) % 223);
      ctx.fillRect(x, y, 1 + i % 3, 0.7);
    }
    for (const x of [22, 234]) {
      ctx.fillStyle = "#62451d66";
      ctx.beginPath();
      ctx.arc(x + 1, 23, 5, 0, 2 * Math.PI);
      ctx.fill();
      const brass = ctx.createRadialGradient(x - 2, 19, 0, x, 21, 5);
      brass.addColorStop(0, "#fff1b4");
      brass.addColorStop(0.55, "#cba058");
      brass.addColorStop(1, "#806133");
      ctx.fillStyle = brass;
      ctx.beginPath();
      ctx.arc(x, 21, 4.5, 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#315440";
    ctx.font = "bold 15px Georgia, serif";
    ctx.fillText("Phrase of the day", 128, 38);
    ctx.fillStyle = "#b69c65";
    ctx.fillRect(40, 46, 176, 1);

    if (phrase) paintHeadline(ctx, phrase);
    // A short highlight on the glazing leaves the ink clear from the square.
    ctx.strokeStyle = "#fffdf09c";
    ctx.beginPath();
    ctx.moveTo(10, 73);
    ctx.lineTo(10, 10);
    ctx.lineTo(62, 10);
    ctx.stroke();
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
