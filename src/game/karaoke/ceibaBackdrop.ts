import * as THREE from "three";
import { KARAOKE_SIGN } from "../../content/karaokeCopy";
import { canvasTex } from "../world/util";

/** One painted panel in the existing sign slot. The bird hovers to the singer's left in the camera view. */
export function ceibaBackdrop({ panel, trim, stand }: { panel: string; trim: string; stand: string }) {
  const map = canvasTex(576, 752, (ctx) => {
    ctx.scale(1.5, 1.5);
    ctx.fillStyle = panel;
    ctx.fillRect(0, 0, 384, 502);
    // Pinstriped arch, like a painted shopfront. Leave the centre quiet behind the singer.
    ctx.fillStyle = "#206466";
    ctx.beginPath();
    ctx.moveTo(16, 491);
    ctx.lineTo(16, 180);
    ctx.bezierCurveTo(16, -40, 368, -40, 368, 180);
    ctx.lineTo(368, 491);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#dfb874";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    function ellipse(color: string, x: number, y: number, rx: number, ry: number, angle = 0) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    function petal(color: string, x: number, y: number, width: number, length: number, angle: number) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-width, -length * 0.48, 0, -length);
      ctx.quadraticCurveTo(width, -length * 0.55, 0, 0);
      ctx.fill();
      ctx.restore();
    }

    // Two flowering stems at the edge of the panel, with leaves of alternating lengths.
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side === 1 ? 0 : 384, 0);
      ctx.scale(side, 1);
      ctx.strokeStyle = "#8fbfa2";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(27, 452);
      ctx.quadraticCurveTo(85, 365, 38, 291);
      ctx.stroke();
      for (const [x, y, tilt, length] of [[43, 424, -0.56, 52], [55, 402, 0.85, 63],
        [57, 374, -0.82, 49], [56, 352, 0.73, 52], [50, 325, -0.55, 41]]) {
        petal("#7cbda1", x, y, 15, length, tilt);
      }
      for (let i = 0; i < 5; i++) petal(trim, 38, 291, 16, 26, i * Math.PI * 2 / 5);
      ellipse("#ffd182", 38, 291, 6, 6);
      ctx.restore();
    }

    // Forked tail, throat flash and long bill of the town's colibrí.
    ctx.save();
    ctx.translate(71, 220);
    ctx.rotate(-0.37);
    petal("#67c3ae", -5, 2, 6, 60, -1.76);
    petal("#b0d9bc", -4, 4, 5, 53, -1.98);
    ellipse("#69c8b2", 0, 0, 29, 12);
    petal("#a9debd", 6, -3, 17, 59, -0.58);
    petal("#47aa97", 9, -1, 14, 48, -0.95);
    ellipse(stand, 20, -7, 13, 12);
    ellipse(trim, 21, -1, 9, 5, -0.3);
    petal("#f5c878", 29, -9, 3, 35, 1.52);
    ellipse(panel, 25, -10, 2, 2);
    ctx.restore();

    ctx.textAlign = "center";
    ctx.font = 'italic bold 45px Georgia, serif';
    ctx.fillStyle = "#123f43";
    ctx.fillText(KARAOKE_SIGN, 192, 71);
    ctx.fillStyle = stand;
    ctx.fillText(KARAOKE_SIGN, 192, 68);
    ctx.fillStyle = "#e9b86e";
    ctx.fillRect(136, 77, 112, 2);
    for (let x = 14; x < 384; x += 24) {
      petal("#e9b86e", x, 483, 6, 11, 0);
      petal(trim, x + 9, 480, 4, 8, Math.PI);
    }
  });
  map.name = KARAOKE_SIGN;
  return new THREE.Mesh(new THREE.PlaneGeometry(1.78, 2.33),
    new THREE.MeshBasicMaterial({ map, toneMapped: false }));
}
