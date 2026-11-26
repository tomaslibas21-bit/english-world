import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { colourMerge, type Colliders } from "../world/util";
import { paintCabinetArt } from "./art";
import { CABINETS, CABINET_Z, type Cabinet } from "./cabinets";

export function addCabinets(room: THREE.Group, colliders: Colliders) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const bodies: [THREE.BufferGeometry, string][] = [];
  const prints: THREE.PlaneGeometry[] = [];
  const walnut = "#684132", green = "#214c43", brass = "#c89a5c", ivory = "#fff0cb";
  // The two uprights share a woven green runner with an inset brass border.
  const runner = (w: number, d: number, y: number, color: string) => {
    bodies.push([new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2).translate(3.7, y, CABINET_Z + 0.35), color]);
  };
  runner(2.40, 1.95, 0.009, "#294942");
  runner(2.30, 1.85, 0.012, "#c0a16c");
  runner(2.25, 1.80, 0.015, "#325348");
  const ids: Cabinet[] = ["road", "billiards"];
  for (const [i, id] of ids.entries()) {
    const { x, title } = CABINETS[id];
    const road = id === "road";
    const box = (w: number, h: number, d: number, y: number, z: number, color: string, dx = 0) =>
      bodies.push([new THREE.BoxGeometry(w, h, d).translate(x + dx, y, CABINET_Z + z), color]);
    box(0.76, 2.24, 0.44, 1.12, -0.17, walnut);
    box(0.70, 0.87, 0.74, 0.49, 0, green);
    box(0.17, 0.22, 0.026, 0.62, 0.376, brass, 0.15);
    box(0.075, 0.026, 0.028, 0.66, 0.388, "#342c23", 0.15);
    for (const y of [0.28, 0.33, 0.38]) box(0.33, 0.012, 0.019, y, 0.371, brass);
    box(0.73, 0.12, 0.70, 0.09, 0, walnut);
    box(0.78, 0.10, 0.82, 0.96, 0, brass);
    box(0.75, 0.065, 0.80, 1.015, 0, green);
    box(0.78, 0.31, 0.64, 2.18, -0.045, green);
    for (const dx of [-0.368, 0.368]) box(0.034, 1.02, 0.64, 1.55, -0.07, walnut, dx);
    if (road) {
      bodies.push([new THREE.TorusGeometry(0.131, 0.024, 6, 16).rotateX(-0.8)
        .translate(x, 1.14, CABINET_Z + 0.32), "#302a29"]);
      box(0.024, 0.15, 0.04, 1.075, 0.31, brass);
    } else {
      for (const dx of [-0.12, 0.12]) bodies.push([new THREE.CylinderGeometry(0.051, 0.055, 0.039, 12)
        .translate(x + dx, 1.065, CABINET_Z + 0.31), ivory]);
    }

    // One atlas column per cabinet: a backlit marquee, the print, a strip lamp and its pool of floor light.
    ctx.save(); ctx.translate(i * 256, 0);
    const header = ctx.createLinearGradient(0, 0, 0, 54);
    header.addColorStop(0, road ? "#ffe9a1" : "#d6ffe5"); header.addColorStop(1, road ? "#f6ac62" : "#82d9be");
    ctx.fillStyle = header; ctx.fillRect(0, 0, 256, 55);
    ctx.strokeStyle = road ? "#b66644" : "#3d8d78"; ctx.lineWidth = 2; ctx.strokeRect(4, 4, 248, 46);
    ctx.font = "bold 43px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = road ? "#522c32" : "#143e39"; ctx.fillText(title, 128, 29, 228);
    ctx.save(); ctx.translate(0, 56); paintCabinetArt(ctx, id); ctx.restore();
    ctx.fillStyle = road ? "#ffd08b" : "#a9f5d5"; ctx.fillRect(0, 193, 256, 7);
    ctx.save(); ctx.translate(128, 228); ctx.scale(126, 26);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    const rgb = road ? "255,176,91" : "99,236,189";
    glow.addColorStop(0, `rgba(${rgb},0.60)`); glow.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = glow; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
    ctx.restore();

    const addPrint = (plane: THREE.PlaneGeometry, top: number, bottom: number, left: number, right: number) => {
      const uv = plane.getAttribute("uv");
      for (let v = 0; v < uv.count; v++) {
        uv.setXY(v, (i * 256 + left + uv.getX(v) * (right - left)) / 512, 1 - (uv.getY(v) === 1 ? top : bottom) / 256);
      }
      prints.push(plane);
    };
    const print = (w: number, h: number, y: number, z: number, tilt: number, top: number, bottom: number,
      left = 1, right = 255, dx = 0) => {
      addPrint(new THREE.PlaneGeometry(w, h).rotateX(tilt).translate(x + dx, y, CABINET_Z + z), top, bottom, left, right);
    };
    print(0.75, 0.29, 2.20, 0.365, -0.36, 1, 53);
    // Crop the wide card master around the focal point to keep the sun and eight ball round on the upright screen.
    print(0.70, 0.96, 1.54, 0.25, -0.35, 57, 191, road ? 72 : 90, road ? 205 : 207);
    for (const dx of [-0.362, 0.362]) print(0.013, 0.99, 1.54, 0.252, -0.35, 194, 198, 1, 255, dx);
    print(0.75, 0.028, 2.337, 0.17, -Math.PI / 2, 194, 198);
    print(0.60, 0.013, 2.337, -0.19, -Math.PI / 2, 194, 198);
    print(0.64, 0.023, 0.83, 0.373, 0, 194, 198);
    print(1.55, 1.76, 0.026, 0.47, -Math.PI / 2, 201, 255);
    // The strip light reflects on the wainscoting. It shares the translucent floor swatch.
    if (!road) {
      const wall = new THREE.PlaneGeometry(3.1, 2.65).rotateY(-Math.PI / 2).translate(5.405, 1.48, CABINET_Z);
      addPrint(wall, 201, 255, 1, 255);
    }
    colliders.addBox(x, CABINET_Z, 0.78, 0.82);
  }
  const atlas = new THREE.CanvasTexture(canvas);
  atlas.colorSpace = THREE.SRGBColorSpace;
  const body = new THREE.Mesh(colourMerge(bodies), new THREE.MeshLambertMaterial({ vertexColors: true }));
  const faces = new THREE.Mesh(mergeGeometries(prints), new THREE.MeshBasicMaterial({
    map: atlas, toneMapped: false, transparent: true, depthWrite: false,
  }));
  body.name = "arcade-cabinets"; faces.name = "arcade-marquees";
  room.add(body, faces);
}
