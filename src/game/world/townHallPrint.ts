import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, type BufferGeometry } from "three";
import { mat, type Merger } from "./util";

export const passportPrompt = { kind: "passport", label: "Open passport", lt: "Atversti pasą" } as const;

// Painted capitals on the oak lintel. Each stroke is two triangles in the existing street batch.
const strokes: Record<string, number[][]> = {
  T: [[0, 1, .72, 1], [.36, 1, .36, 0]],
  O: [[.17, 0, .55, 0, .72, .18, .72, .82, .55, 1, .17, 1, 0, .82, 0, .18, .17, 0]],
  W: [[0, 1, .17, 0, .42, .58, .68, 0, .84, 1]],
  N: [[0, 0, 0, 1, .72, 0, .72, 1]],
  H: [[0, 1, 0, 0], [.72, 1, .72, 0], [0, .52, .72, .52]],
  A: [[0, 0, .36, 1, .72, 0], [.14, .38, .58, .38]],
  L: [[0, 1, 0, 0, .65, 0]],
};
export function townHallLintel(batch: Merger, place: (g: BufferGeometry) => BufferGeometry) {
  const y = 4.25;
  function face(w: number, h: number, x: number, dy: number, z: number, color: string, angle = 0) {
    const shape = new PlaneGeometry(w, h).rotateZ(angle).translate(x, y + dy, z);
    const paint = color === "#eddfc2" ? mat(color, { emissive: "#a49a82" }) : mat(color);
    batch.add("town-hall-lintel-" + color, paint, place(shape), false);
  }
  face(5.1, 1.07, 0, 0, .12, "#eddfc2");
  for (const dy of [-.47, .47]) face(4.98, .045, 0, dy, .145, "#476658");
  for (const dx of [-2.47, 2.47]) face(.045, .945, dx, 0, .145, "#476658");
  const text = "TOWN HALL", scale = .5, advance = .99, space = .48;
  let start = -((text.length - 1) * advance + space - .31) * scale / 2;
  for (const letter of text) {
    if (letter === " ") { start += space * scale; continue; }
    for (const path of strokes[letter]) for (let i = 2; i < path.length; i += 2) {
      const [ax, ay, bx, by] = path.slice(i - 2, i + 2);
      const dx = bx - ax, dy = by - ay;
      face(Math.hypot(dx, dy) * scale + .026, .065, start + (ax + bx) * scale / 2,
        (ay + by - 1) * scale / 2, .146, "#254d40", Math.atan2(dy, dx));
    }
    start += advance * scale;
  }
}

let print: MeshBasicMaterial | undefined;
/** The only room texture, printed locally when the room opens. */
export function townHallDeskCard() {
  if (!print) {
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 96;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f4ead7"; ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = "#ae9261"; ctx.lineWidth = 2; ctx.strokeRect(4, 4, 248, 88);
    ctx.fillStyle = "#24493e"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold 29px Georgia, serif"; ctx.fillText(passportPrompt.label, 128, 37);
    ctx.font = "20px Nunito, sans-serif"; ctx.fillText(passportPrompt.lt, 128, 66);
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; map.name = "Town Hall desk card";
    print = new MeshBasicMaterial({ map, toneMapped: false });
  }
  return new Mesh(new PlaneGeometry(.95, .36), print);
}
