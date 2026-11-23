import * as T from "three";
import { aimGuide, HALF_LENGTH, HALF_WIDTH, POCKETS, POCKET_IDS, RADIUS, type Ball, type Pocket, type Point } from "./physics";
import type { Call } from "./calls";

export const FELT_Y = 0.84;
const RAIL = 0.115;
const CUSHION = 0.038;
const POINT_SECONDS = 0.5;
export const TABLE_X = HALF_WIDTH + RAIL;
export const TABLE_Z = HALF_LENGTH + RAIL;
export const TABLE_NAME = "billiards-table";
export const TINA_HOME = { x: 1.35, z: -0.37, rot: -Math.PI / 2 };
export const TABLE_PROMPT = { x: 0, z: 1.58, rot: Math.PI };
export const BALL_COLORS = ["#faf5df", "#eab520", "#2c65c7", "#d43f3f", "#7753ab", "#ed8238", "#298057", "#822b46", "#22252b"];
export const ballColor = (id: number) => BALL_COLORS[id > 8 ? id - 8 : id];

function solid(color: string, roughness = 0.75) {
  return new T.MeshStandardMaterial({ color, roughness });
}

export function makeCue() {
  const cue = new T.Group();
  const add = (length: number, top: number, bottom: number, y: number, color: string) => {
    const part = new T.Mesh(new T.CylinderGeometry(top, bottom, length, 8), solid(color));
    part.position.y = y;
    cue.add(part);
  };
  add(0.79, 0.0058, 0.009, -0.405, "#e7c58d");
  add(0.46, 0.009, 0.013, -1.03, "#542b23");
  add(0.026, 0.0059, 0.006, -0.012, "#f1e0be");
  add(0.007, 0.0059, 0.0059, 0.004, "#74b6c8");
  return cue;
}

function canvasMap(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext("2d")!);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

const ballMaps = new Map<number, T.CanvasTexture>();
function ballMap(id: number) {
  if (ballMaps.has(id)) return ballMaps.get(id)!;
  const map = canvasMap(256, 128, (x) => {
    x.fillStyle = id > 8 ? BALL_COLORS[0] : ballColor(id);
    x.fillRect(0, 0, 256, 128);
    if (id > 8) {
      x.fillStyle = ballColor(id);
      x.fillRect(0, 36, 256, 56);
    }
    for (const at of [32, 96, 160, 224]) {
      x.fillStyle = "#fffdf1";
      x.beginPath(); x.ellipse(at, 64, 13, 14, 0, 0, 2 * Math.PI); x.fill();
      x.fillStyle = "#19181a";
      x.font = `bold ${id < 10 ? 21 : 16}px sans-serif`;
      x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText(String(id), at, 64);
    }
  });
  ballMaps.set(id, map);
  return map;
}

let maps: { felt: T.CanvasTexture; walnut: T.CanvasTexture; point: T.CanvasTexture } | undefined;
function tableMaps() {
  return maps ??= {
    felt: canvasMap(64, 128, (ctx) => {
      // The bed is twice as long as it is wide, so the map's radial falloff stays round on the cloth.
      const light = ctx.createRadialGradient(32, 26, 0, 32, 26, 69);
      light.addColorStop(0, "#359567");
      light.addColorStop(0.45, "#2d8b5e");
      light.addColorStop(1, "#227e53");
      ctx.fillStyle = light; ctx.fillRect(0, 0, 64, 128);
    }),
    walnut: canvasMap(64, 128, (ctx) => {
      ctx.fillStyle = "#523229";
      ctx.fillRect(0, 0, 64, 128);
      for (let i = 0; i < 22; i++) {
        const x = (i + 0.5) * 64 / 22 + Math.sin(i * 7.3);
        const bend = 3 * Math.sin(i * 1.8);
        ctx.strokeStyle = i % 4 === 0 ? "#a3775a55" : "#23131044";
        ctx.lineWidth = i % 3 === 0 ? 1.1 : 0.6;
        ctx.beginPath(); ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + bend, 37, x - bend, 87, x + bend * 0.4, 128);
        ctx.stroke();
      }
    }),
    point: canvasMap(128, 64, (ctx) => {
      ctx.font = "bold 49px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 6; ctx.lineJoin = "round";
      ctx.strokeStyle = "#271a12"; ctx.strokeText("+1", 64, 35);
      ctx.fillStyle = "#fff0ae"; ctx.fillText("+1", 64, 35);
    }),
  };
}

interface BallMesh {
  mesh: T.Mesh<T.SphereGeometry, T.MeshStandardMaterial>;
  shadow: T.Mesh;
  position: Point;
  pocket: Pocket | null;
  fall: number;
}

export class TableView {
  readonly root = new T.Group();
  private balls = new Map<number, BallMesh>();
  private sphere = new T.SphereGeometry(RADIUS, 20, 12).rotateY(Math.PI / 4).rotateX(Math.PI / 2);
  private contact = new T.CircleGeometry(RADIUS * 0.9, 14).rotateX(-Math.PI / 2);
  private shadowMaterial = new T.MeshBasicMaterial({ color: "#152d23", transparent: true, opacity: 0.4, depthWrite: false });
  private cue = makeCue();
  private holes = new Map<Pocket, T.Mesh>();
  private pointLeft = 0;
  private pointRing = new T.Mesh(new T.RingGeometry(0.069, 0.088, 26).rotateX(-Math.PI / 2),
    new T.MeshBasicMaterial({ color: "#ffdc88", transparent: true, depthWrite: false, toneMapped: false }));
  private pointSprite = new T.Sprite(new T.SpriteMaterial({ map: tableMaps().point, transparent: true,
    depthTest: false, depthWrite: false, toneMapped: false }));
  private ring = new T.Mesh(new T.TorusGeometry(RADIUS + 0.010, 0.0028, 6, 24).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: "#ffdd7f" }));
  private ghost = new T.Mesh(new T.TorusGeometry(RADIUS, 0.002, 5, 24).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: "#fcf2c9", transparent: true, opacity: 0.78 }));
  private dots = new T.InstancedMesh(new T.CircleGeometry(0.0041, 8).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: "#fff1c2" }), 68);
  private trail = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]), new T.LineBasicMaterial({ color: "#ffc776" }));
  private axis = new T.Vector3();
  private transform = new T.Matrix4();

  constructor() {
    this.root.name = TABLE_NAME;
    this.root.userData.table = this;
    const wood = solid("#3f251e"), edge = solid("#6a4535", 0.53), brass = solid("#b18a53", 0.48);
    const walnut = new T.MeshStandardMaterial({ map: tableMaps().walnut, roughness: 0.56 });
    const felt = new T.MeshStandardMaterial({ map: tableMaps().felt, roughness: 0.98 });
    const cushion = solid("#1a5038"), well = solid("#151412"), leather = solid("#35251e", 0.58);
    const pearl = new T.MeshStandardMaterial({ color: "#dde5df", roughness: 0.34, metalness: 0.12 });
    const add = (geo: T.BufferGeometry, material: T.Material, x: number, y: number, z: number) => {
      const mesh = new T.Mesh(geo, material);
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      this.root.add(mesh);
      return mesh;
    };
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: T.Material) =>
      add(new T.BoxGeometry(w, h, d), m, x, y, z);
    box(TABLE_X * 2, 0.18, TABLE_Z * 2, 0, FELT_Y - 0.12, 0, wood);
    box(TABLE_X * 2 + 0.012, 0.018, TABLE_Z * 2 + 0.012, 0, FELT_Y - 0.156, 0, edge);
    box(HALF_WIDTH * 2, 0.026, HALF_LENGTH * 2, 0, FELT_Y - 0.013, 0, felt);
    for (const x of [-0.43, 0.43]) for (const z of [-0.73, 0.73]) {
      add(new T.CylinderGeometry(0.083, 0.063, 0.67, 8), wood, x, 0.335, z);
      add(new T.CylinderGeometry(0.067, 0.078, 0.052, 8), brass, x, 0.032, z);
    }
    const mouth = 0.079;
    const sights = new T.InstancedMesh(new T.PlaneGeometry(0.014, 0.014).rotateX(-Math.PI / 2).rotateY(Math.PI / 4), pearl, 18);
    sights.receiveShadow = true;
    let sight = 0;
    const cushionProfile = new T.Shape();
    cushionProfile.moveTo(0, -0.009);
    cushionProfile.lineTo(0, 0.012);
    cushionProfile.lineTo(0.014, 0.038);
    cushionProfile.lineTo(CUSHION, 0.043);
    cushionProfile.lineTo(CUSHION, -0.009);
    cushionProfile.closePath();
    // The profile runs from the inside of the playing area towards the outside of the rail.
    const rail = (span: number, angle: number, x: number, z: number, marks: number[]) => {
      const place = (geo: T.BufferGeometry, material: T.Material, out: number, y: number) =>
        add(geo.translate(out, 0, 0).rotateY(angle), material, x, FELT_Y + y, z);
      place(new T.ExtrudeGeometry(cushionProfile, { depth: span, bevelEnabled: false }).translate(0, 0, -span / 2), cushion, 0, 0);
      place(new T.BoxGeometry(RAIL - CUSHION, 0.058, span), walnut, (CUSHION + RAIL) / 2, 0.018);
      place(new T.BoxGeometry(0.010, 0.009, span), edge, RAIL - 0.005, 0.047);
      for (const at of marks) {
        const across = (CUSHION + RAIL) / 2;
        sights.setMatrixAt(sight++, this.transform.makeTranslation(
          x + across * Math.cos(angle) + at * Math.sin(angle), FELT_Y + 0.048,
          z - across * Math.sin(angle) + at * Math.cos(angle)));
      }
    };
    for (const side of [-1, 1]) {
      for (const z of [-HALF_LENGTH / 2, HALF_LENGTH / 2]) {
        rail(HALF_LENGTH - 2 * mouth, side === 1 ? 0 : Math.PI, side * HALF_WIDTH, z, [-0.245, 0, 0.245]);
      }
      rail(2 * (HALF_WIDTH - mouth), -side * Math.PI / 2, 0, side * HALF_LENGTH, [-0.25, 0, 0.25]);
    }
    sights.instanceMatrix.needsUpdate = true;
    this.root.add(sights);
    const net = new T.MeshBasicMaterial({ color: "#40332b", wireframe: true, transparent: true, opacity: 0.52 });
    for (const [id, { x, z }] of Object.entries(POCKETS) as [Pocket, Point][]) {
      add(new T.CylinderGeometry(0.072, 0.051, 0.024, 24), well, x, FELT_Y - 0.009, z);
      add(new T.CylinderGeometry(0.049, 0.029, 0.027, 8, 2, true), net, x, FELT_Y + 0.003, z);
      add(new T.TorusGeometry(0.066, 0.010, 8, 24).rotateX(-Math.PI / 2), leather, x, FELT_Y + 0.009, z);
      const halo = add(new T.RingGeometry(0.075, 0.085, 24).rotateX(-Math.PI / 2),
        new T.MeshBasicMaterial({ color: "#ffe29b", transparent: true, opacity: 0.7, depthWrite: false }),
        x, FELT_Y + 0.052, z);
      halo.visible = false;
      this.holes.set(id, halo);
    }
    for (const z of [-0.495, 0.495]) {
      add(new T.CircleGeometry(0.007, 10).rotateX(-Math.PI / 2), well, 0, FELT_Y + 0.001, z);
    }
    this.dots.count = 0;
    this.dots.frustumCulled = this.trail.frustumCulled = false;
    this.pointRing.name = "billiards-point-ring";
    this.pointSprite.name = "billiards-point";
    // Other code raycasts the room (the talk camera) without a camera set, which a Sprite needs: never pick it.
    this.pointSprite.raycast = () => {};
    this.pointSprite.renderOrder = 4;
    this.root.add(this.cue, this.ring, this.ghost, this.dots, this.trail, this.pointRing, this.pointSprite);
    this.clearPoint();
    this.indicate(null, null, false);
    this.hideAim();
  }

  setRack(balls: Ball[]) {
    this.clearPoint();
    for (const { mesh, shadow } of this.balls.values()) {
      this.root.remove(mesh, shadow);
      mesh.material.dispose();
    }
    this.balls.clear();
    for (const ball of balls) {
      const mesh = new T.Mesh(this.sphere, solid(ball.id ? "#ffffff" : BALL_COLORS[0], 0.27));
      if (ball.id) mesh.material.map = ballMap(ball.id);
      mesh.position.set(ball.x, FELT_Y + RADIUS, ball.z);
      const shadow = new T.Mesh(this.contact, this.shadowMaterial);
      shadow.position.set(ball.x + 0.008, FELT_Y + 0.0015, ball.z + 0.006);
      this.root.add(shadow, mesh);
      this.balls.set(ball.id, { mesh, shadow, position: { ...ball }, pocket: null, fall: 0 });
    }
  }

  sync(balls: Ball[], dt: number) {
    if (this.pointLeft > 0) {
      this.pointLeft -= dt;
      if (this.pointLeft > 0) this.drawPoint(); else this.clearPoint();
    }
    for (const ball of balls) {
      const visual = this.balls.get(ball.id);
      if (!visual) continue;
      const { mesh, shadow, position } = visual;
      shadow.visible = !ball.pocket;
      if (ball.pocket) {
        const hole = POCKETS[ball.pocket];
        const k = Math.min(1, (visual.fall += dt) / 0.24);
        mesh.position.set(T.MathUtils.lerp(position.x, hole.x, k), FELT_Y + RADIUS - 0.135 * k ** 2,
          T.MathUtils.lerp(position.z, hole.z, k));
        mesh.visible = k < 1;
        visual.pocket = ball.pocket;
        continue;
      }
      const dx = ball.x - position.x, dz = ball.z - position.z;
      const length = Math.hypot(dx, dz);
      if (length > 1e-6 && !visual.pocket) mesh.rotateOnWorldAxis(this.axis.set(dz, 0, -dx).normalize(), length / RADIUS);
      visual.position = { x: ball.x, z: ball.z };
      visual.fall = 0; visual.pocket = null;
      mesh.visible = true;
      mesh.position.set(ball.x, FELT_Y + RADIUS, ball.z);
      shadow.position.set(ball.x + 0.008, FELT_Y + 0.0015, ball.z + 0.006);
    }
  }

  showPoint(pocket: Pocket) {
    const { x, z } = POCKETS[pocket];
    this.pointRing.position.set(x, FELT_Y + 0.061, z);
    this.pointLeft = POINT_SECONDS;
    this.pointRing.visible = this.pointSprite.visible = true;
    this.drawPoint();
  }

  private drawPoint() {
    const t = 1 - this.pointLeft / POINT_SECONDS;
    const { x, z } = this.pointRing.position;
    this.pointRing.scale.setScalar(1 + t * 0.45);
    this.pointRing.material.opacity = (1 - t) ** 1.4;
    const pop = 1 + 0.20 * Math.sin(Math.min(t * 3, 1) * Math.PI);
    this.pointSprite.scale.set(0.18 * pop, 0.09 * pop, 1);
    this.pointSprite.position.set(x, FELT_Y + 0.065 + 0.12 * t, z + (z < -0.7 ? 0.06 : 0) - 0.09 * t);
    this.pointSprite.material.opacity = Math.min(1, (1 - t) * 2.6);
  }

  private clearPoint() {
    this.pointLeft = 0;
    this.pointRing.visible = this.pointSprite.visible = false;
  }

  indicate(ball: Point | null, pocket: Pocket | null, targets: boolean) {
    this.ring.visible = !!ball;
    if (ball) this.ring.position.set(ball.x, FELT_Y + 0.004, ball.z);
    for (const [id, halo] of this.holes) {
      halo.visible = targets || id === pocket;
      (halo.material as T.MeshBasicMaterial).opacity = id === pocket ? 1 : 0.46;
    }
  }

  hideAim() {
    this.cue.visible = this.ghost.visible = this.dots.visible = this.trail.visible = false;
  }

  drawCue(cue: Point, angle: number, pull: number) {
    const dx = Math.sin(angle), dz = Math.cos(angle);
    this.cue.visible = true;
    this.cue.position.set(cue.x - dx * pull, FELT_Y + RADIUS, cue.z - dz * pull);
    this.cue.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), this.axis.set(dx, 0.05, dz).normalize());
  }

  drawAim(balls: Ball[], angle: number, power: number) {
    const cue = balls[0];
    this.drawCue(cue, angle, RADIUS + 0.022 + power * 0.21);
    const { end, length, hit } = aimGuide(cue, angle, balls);
    const y = FELT_Y + 0.005;
    this.dots.visible = true;
    this.dots.count = Math.min(68, Math.max(0, Math.floor((length - 0.025) / 0.032)));
    for (let i = 0; i < this.dots.count; i++) {
      const d = (i + 1) * 0.032;
      this.dots.setMatrixAt(i, this.transform.makeTranslation(cue.x + d * Math.sin(angle), y, cue.z + d * Math.cos(angle)));
    }
    this.dots.instanceMatrix.needsUpdate = true;
    this.ghost.visible = this.trail.visible = !!hit;
    if (!hit) return;
    this.ghost.position.set(end.x, y, end.z);
    const p = this.trail.geometry.getAttribute("position");
    p.setXYZ(0, hit.x, y, hit.z);
    p.setXYZ(1, hit.x + (hit.x - end.x) * 3.6, y, hit.z + (hit.z - end.z) * 3.6);
    p.needsUpdate = true;
  }

  markCall(balls: Ball[], call: Partial<Call>, targets: boolean) {
    const ball = balls.find((b) => b.id === call.ball && !b.pocket);
    this.indicate(ball ?? null, call.pocket ?? null, targets);
  }
}
