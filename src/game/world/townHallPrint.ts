import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, type BufferGeometry } from "three";
import type { Part } from "./mexican";
import { L } from "../../ui/i18n";

export const passportPrompt = { kind: "passport", label: "Abrir el pasaporte", lt: L("Atversti pasą") } as const;

// The painted capitals join the existing static façade geometry.
const strokes: Record<string, number[][]> = {
  A: [[0, 0, .36, 1, .72, 0], [.14, .38, .58, .38]],
  C: [[.72, .9, .55, 1, .17, 1, 0, .82, 0, .18, .17, 0, .55, 0, .72, .1]],
  I: [[.13, 0, .59, 0], [.36, 0, .36, 1], [.13, 1, .59, 1]],
  L: [[0, 1, 0, 0, .68, 0]],
  M: [[0, 0, 0, 1, .36, .44, .72, 1, .72, 0]],
  N: [[0, 0, 0, 1, .72, 0, .72, 1]],
  O: [[.17, 0, .55, 0, .72, .18, .72, .82, .55, 1, .17, 1, 0, .82, 0, .18, .17, 0]],
  P: [[0, 0, 0, 1, .54, 1, .72, .86, .72, .64, .54, .5, 0, .5]],
  U: [[0, 1, 0, .18, .17, 0, .55, 0, .72, .18, .72, 1]],
};
export function townHallLintel(parts: Part[], place: (g: BufferGeometry) => BufferGeometry, label: string, w: number, h: number, y: number) {
  const face = (width: number, height: number, x: number, dy: number, z: number, color: string, angle = 0) =>
    parts.push([place(new PlaneGeometry(width, height).rotateZ(angle).translate(x, y + dy, z)), color]);
  face(w, h, 0, 0, .08, "#216565");
  for (const side of [-1, 1]) {
    face(w - .13, .028, 0, side * (h / 2 - .07), .09, "#c6d9c9");
    face(.028, h - .14, side * (w / 2 - .07), 0, .09, "#c6d9c9");
  }
  const text = label.toUpperCase();
  const advance = .31, gap = .20, width = .27, height = .45;
  const textWidth = [...text].reduce((n, letter) => n + (letter === " " ? gap : advance), width - advance);
  let x = -textWidth / 2;
  for (const letter of text) {
    if (letter === " ") { x += gap; continue; }
    for (const path of strokes[letter] ?? []) for (let i = 2; i < path.length; i += 2) {
      const [ax, ay, bx, by] = path.slice(i - 2, i + 2);
      const dx = (bx - ax) * width, dy = (by - ay) * height;
      face(Math.hypot(dx, dy) + .02, .037, x + (ax + bx - .72) * width / 2 + width / 2,
        (ay + by - 1) * height / 2, .10, "#fff3da", Math.atan2(dy, dx));
    }
    x += advance;
  }
}

let print: MeshBasicMaterial | undefined;
/** The hall's only room texture, drawn locally on entry. */
export function townHallDeskCard() {
  if (!print) {
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 96;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f4ead7"; ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = "#ae9261"; ctx.lineWidth = 2; ctx.strokeRect(4, 4, 248, 88);
    ctx.fillStyle = "#283b63"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold 26px Georgia, serif"; ctx.fillText(passportPrompt.label, 128, 37, 234);
    ctx.font = "20px Nunito, sans-serif"; ctx.fillText(passportPrompt.lt, 128, 66, 234);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.name = "Palacio Municipal desk card";
    print = new MeshBasicMaterial({ map, toneMapped: false });
  }
  return new Mesh(new PlaneGeometry(.95, .36), print);
}
