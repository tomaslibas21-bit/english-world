import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { colourMerge, type Colliders } from "../world/util";
import { CABINETS, CABINET_Z } from "./cabinets";

// Both screen prints share one atlas. Nothing here needs a clock or a game session.
export function addCabinets(room: THREE.Group, colliders: Colliders) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const bodies: [THREE.BufferGeometry, string][] = [];
  const prints: THREE.PlaneGeometry[] = [];
  const walnut = "#593927", green = "#244a3e", brass = "#ba995f", ivory = "#fff0cb";
  for (const [i, cabinet] of Object.values(CABINETS).entries()) {
    const { x, title } = cabinet;
    const box = (w: number, h: number, d: number, y: number, offset: number, color: string) =>
      bodies.push([new THREE.BoxGeometry(w, h, d).translate(x, y, CABINET_Z + offset), color]);
    box(0.78, 1.85, 0.64, 0.925, -0.09, walnut);
    box(0.72, 0.88, 0.77, 0.46, 0, green);
    box(0.77, 0.09, 0.82, 0.94, 0, brass);
    box(0.78, 0.17, 0.78, 1.83, -0.01, walnut);
    // Put the title on the projecting lip, above the recessed screen's sightline.
    const marquee = new THREE.PlaneGeometry(0.74, 0.17).translate(x, 1.83, CABINET_Z + 0.382);
    const screen = new THREE.PlaneGeometry(0.70, 0.70).translate(x, 1.38, CABINET_Z + 0.236);
    for (const print of [marquee, screen]) {
      const uv = print.getAttribute("uv");
      for (let v = 0; v < uv.count; v++) {
        const y = uv.getY(v);
        uv.setXY(v, (uv.getX(v) + i) / 2, print === marquee ? 0.76 + 0.24 * y : 0.76 * y);
      }
      prints.push(print);
    }
    ctx.save(); ctx.translate(i * 256, 0);
    ctx.fillStyle = "#193a32"; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = brass; ctx.lineWidth = 5; ctx.strokeRect(5, 5, 246, 246);
    ctx.fillStyle = ivory; ctx.font = "bold 32px Georgia"; ctx.textAlign = "center";
    ctx.fillText(title, 128, 48, 226);
    if (i === 0) {
      ctx.fillStyle = "#e0ab70"; ctx.fillRect(15, 65, 226, 171);
      ctx.fillStyle = "#9d674d"; ctx.beginPath(); ctx.moveTo(15, 148);
      ctx.lineTo(73, 89); ctx.lineTo(133, 139); ctx.lineTo(193, 98); ctx.lineTo(241, 140);
      ctx.lineTo(241, 174); ctx.lineTo(15, 174); ctx.fill();
      ctx.fillStyle = "#383b39"; ctx.beginPath(); ctx.moveTo(61, 236);
      ctx.bezierCurveTo(75, 181, 204, 158, 133, 126); ctx.bezierCurveTo(228, 154, 135, 195, 176, 236); ctx.fill();
      bodies.push([new THREE.TorusGeometry(0.119, 0.025, 6, 16).rotateX(-0.8)
        .translate(x, 1.07, CABINET_Z + 0.32), "#2d2925"]);
      box(0.022, 0.13, 0.045, 1.005, 0.31, brass);
    } else {
      ctx.fillStyle = "#171c19"; ctx.beginPath(); ctx.arc(128, 153, 76, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = ivory; ctx.beginPath(); ctx.arc(128, 141, 37, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = "#172b24"; ctx.font = "bold 57px Georgia"; ctx.fillText("8", 128, 161);
      for (const dx of [-0.12, 0.12]) bodies.push([new THREE.CylinderGeometry(0.051, 0.055, 0.035, 12)
        .translate(x + dx, 1.0, CABINET_Z + 0.31), ivory]);
    }
    ctx.restore();
    colliders.addBox(x, CABINET_Z, 0.78, 0.82);
  }
  const atlas = new THREE.CanvasTexture(canvas);
  atlas.colorSpace = THREE.SRGBColorSpace;
  const body = new THREE.Mesh(colourMerge(bodies), new THREE.MeshLambertMaterial({ vertexColors: true }));
  const faces = new THREE.Mesh(mergeGeometries(prints), new THREE.MeshBasicMaterial({ map: atlas, toneMapped: false }));
  body.name = "arcade-cabinets"; faces.name = "arcade-marquees";
  room.add(body, faces);
}
