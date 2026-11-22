import * as T from "three";
import { aimGuide, HALF_LENGTH, HALF_WIDTH, POCKETS, POCKET_IDS, RADIUS, type Ball, type Pocket, type Point } from "./physics";
import type { Call } from "./calls";

export const FELT_Y = 0.84;
const RAIL = 0.115;
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

const ballMaps = new Map<number, T.CanvasTexture>();
function ballMap(id: number) {
  if (ballMaps.has(id)) return ballMaps.get(id)!;
  const cv = document.createElement("canvas");
  cv.width = 256; cv.height = 128;
  const x = cv.getContext("2d")!;
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
  const map = new T.CanvasTexture(cv);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 4;
  ballMaps.set(id, map);
  return map;
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
  private ring = new T.Mesh(new T.TorusGeometry(RADIUS + 0.010, 0.0028, 6, 24).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: "#ffdd7f" }));
  private ghost = new T.Mesh(new T.TorusGeometry(RADIUS, 0.002, 5, 24).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: "#fcf2c9", transparent: true, opacity: 0.78 }));
  private dots = new T.InstancedMesh(new T.CircleGeometry(0.0041, 8).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: "#fff1c2" }), 68);
  private trail = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]), new T.LineBasicMaterial({ color: "#ffc776" }));
  private axis = new T.Vector3();
  private transform = new T.Matrix4();

  constructor() {
    this.root.name = TABLE_NAME;
    this.root.userData.table = this;
    const wood = solid("#6b3822"), edge = solid("#a06138"), gold = solid("#ddb477", 0.42);
    const felt = solid("#1f8157", 0.98), cushion = solid("#1a573e"), black = solid("#121d1b");
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
      add(new T.CylinderGeometry(0.067, 0.078, 0.052, 8), gold, x, 0.032, z);
    }
    const mouth = 0.079;
    for (const side of [-1, 1]) {
      for (const z of [-HALF_LENGTH / 2, HALF_LENGTH / 2]) {
        box(RAIL, 0.058, HALF_LENGTH - 2 * mouth, side * (HALF_WIDTH + RAIL / 2), FELT_Y + 0.018, z, edge);
        box(0.024, 0.044, HALF_LENGTH - 2 * mouth, side * (HALF_WIDTH + 0.008), FELT_Y + 0.018, z, cushion);
        for (const offset of [-0.245, 0, 0.245]) {
          add(new T.CylinderGeometry(0.010, 0.010, 0.005, 4), gold, side * (HALF_WIDTH + 0.068), FELT_Y + 0.049, z + offset);
        }
      }
      box(2 * (HALF_WIDTH - mouth), 0.058, RAIL, 0, FELT_Y + 0.018, side * (HALF_LENGTH + RAIL / 2), edge);
      box(2 * (HALF_WIDTH - mouth), 0.044, 0.024, 0, FELT_Y + 0.017, side * (HALF_LENGTH + 0.008), cushion);
      for (const x of [-0.25, 0, 0.25]) {
        add(new T.CylinderGeometry(0.010, 0.010, 0.005, 4), gold, x, FELT_Y + 0.049, side * (HALF_LENGTH + 0.068));
      }
    }
    const net = new T.MeshBasicMaterial({ color: "#534537", wireframe: true, transparent: true, opacity: 0.68 });
    for (const [id, { x, z }] of Object.entries(POCKETS) as [Pocket, Point][]) {
      add(new T.CylinderGeometry(0.073, 0.059, 0.023, 20), black, x, FELT_Y - 0.007, z);
      add(new T.CylinderGeometry(0.049, 0.029, 0.027, 8, 2, true), net, x, FELT_Y + 0.003, z);
      const lip = add(new T.TorusGeometry(0.071, 0.008, 5, 20).rotateX(-Math.PI / 2), wood, x, FELT_Y + 0.005, z);
      lip.receiveShadow = false;
      const halo = add(new T.RingGeometry(0.075, 0.085, 24).rotateX(-Math.PI / 2),
        new T.MeshBasicMaterial({ color: "#ffe29b", transparent: true, opacity: 0.7, depthWrite: false }),
        x, FELT_Y + 0.052, z);
      halo.visible = false;
      this.holes.set(id, halo);
    }
    for (const z of [-0.495, 0.495]) {
      add(new T.CircleGeometry(0.007, 10).rotateX(-Math.PI / 2), black, 0, FELT_Y + 0.001, z);
    }
    this.dots.count = 0;
    this.dots.frustumCulled = this.trail.frustumCulled = false;
    this.root.add(this.cue, this.ring, this.ghost, this.dots, this.trail);
    this.indicate(null, null, false);
    this.hideAim();
  }

  setRack(balls: Ball[]) {
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
