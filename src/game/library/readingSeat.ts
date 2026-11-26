import { Box3, CylinderGeometry, Mesh, TorusGeometry, Vector3, type Group, type Material } from "three";
import { LIBRARY_CHAIRS, LIBRARY_PANEL } from "../world/libraryRoom";
import { colourMerge, type Colliders } from "../world/util";
import { CameraRig, stageFov } from "../camera";
import type { GameCharacter } from "../characters";
import { STYLE } from "../style";
import type { NavGrid } from "../nav";
import type { GameMode, ModeFrame, ModeInput } from "../kit/modes";
import type { PadScalars } from "../gamepad";
import { PadButton } from "../padButtons";

export const READING_SEAT = "library-reading";
type Point = { x: number; z: number; rot: number };
export type ReadingRoom = { group: Group; nav: NavGrid; colliders: Colliders };
export interface ReadingSeatHost {
  room(): ReadingRoom | null;
  player(): GameCharacter;
  rig: CameraRig;
  canStart(): boolean;
  prepare(): void;
  approach(x: number, z: number, chair: number): boolean;
  approaching(): boolean;
  cancelApproach(): void;
  place(x: number, z: number, rot: number): void;
  entered(): void;
  left(): void;
  save(): void;
  reader(chair: number): void;
  reducedMotion(): boolean;
}

/** A reload or stand always uses clear ground, including when the first approach was occupied meanwhile. */
export function libraryStandingPoint(room: ReadingRoom, preferred: Point): Point {
  const clear = (x: number, z: number) => room.nav.free(room.nav.idx(x, z)) && !room.colliders.blocked(x, z, 0.38);
  if (clear(preferred.x, preferred.z)) return { ...preferred };
  // Search all free cells, rather than trusting a nav cache that may predate an extra room collider.
  let best: Point | undefined, distance = Infinity;
  for (let i = 0; i < room.nav.blocked.length; i++) {
    if (!room.nav.free(i)) continue;
    const [x, z] = room.nav.center(i), d = (x - preferred.x) ** 2 + (z - preferred.z) ** 2;
    if (d < distance && clear(x, z)) { distance = d; best = { x, z, rot: preferred.rot }; }
  }
  // The room's entrance remains clear even when both chair approaches are occupied.
  return best ?? { x: 0, z: 3.4, rot: Math.PI };
}

/** One vertex-coloured mesh. The furniture material is borrowed and never disposed here. */
export function readingHeadphones(material: Material) {
  // The original heads have a fixed radius at both profile heights. Styled heads have a neck-origin joint.
  const fit = STYLE === "toon" ? [0.27, 0.2565, 0.2052]
    : STYLE === "storybook" ? [0.1395, 0.162, 0.1377]
    : STYLE === "realistic" ? [0.10672, 0.12992, 0.123424] : [0.27, 0.2754, 0];
  const [rx, ry, cy] = fit, scale = rx / 0.27;
  const parts: Parameters<typeof colourMerge>[0] = [
    [new TorusGeometry(rx + 0.044 * scale, 0.023 * scale, 4, 14, Math.PI)
      .scale(1, (ry + 0.06 * scale) / (rx + 0.044 * scale), 1).translate(0, cy, -0.015 * scale), "#293d50"],
  ];
  for (const side of [-1, 1]) {
    parts.push([new CylinderGeometry(0.106 * scale, 0.106 * scale, 0.085 * scale, 10).rotateZ(Math.PI / 2)
      .translate(side * (rx + 0.035 * scale), cy - 0.025 * scale, -0.015 * scale), "#283d50"]);
    parts.push([new CylinderGeometry(0.071 * scale, 0.071 * scale, 0.009 * scale, 10).rotateZ(Math.PI / 2)
      .translate(side * (rx + 0.081 * scale), cy - 0.025 * scale, -0.015 * scale), "#bc9757"]);
  }
  const geometry = colourMerge(parts);
  // colourMerge owns its expanded copies. Release the source indexed primitives as well.
  for (const [source] of parts) source.dispose();
  geometry.name = "library-headphones";
  const mesh = new Mesh(geometry, material);
  mesh.name = "library-headphones";
  mesh.userData.triangles = geometry.attributes.position.count / 3;
  return mesh;
}

/** A quiet side/front view includes the lamp and visible avatar at every review aspect ratio. */
export function readingSeatShot(index: number, aspect: number, headY = 1.65) {
  const c = LIBRARY_CHAIRS[index], bearing = c.rot + 0.8, pitch = 0.28;
  const bounds = new Box3(new Vector3(Math.min(c.x - 0.85, c.tableX - 0.5), 0, Math.min(c.z - 0.85, c.tableZ - 0.5)),
    new Vector3(Math.max(c.x + 0.85, c.tableX + 0.5), Math.max(2.15, headY + 0.18), Math.max(c.z + 0.85, c.tableZ + 0.5)));
  const look = bounds.getCenter(new Vector3());
  const back = new Vector3(Math.sin(bearing) * Math.cos(pitch), Math.sin(pitch), Math.cos(bearing) * Math.cos(pitch));
  const right = new Vector3(Math.cos(bearing), 0, -Math.sin(bearing)), up = new Vector3().crossVectors(back, right);
  const fov = stageFov(aspect), tan = Math.tan(fov * Math.PI / 360);
  let distance = 4.2;
  const include = (x: number, y: number, z: number) => {
    const d = new Vector3(x, y, z).sub(look);
    distance = Math.max(distance, d.dot(back) + Math.max(Math.abs(d.dot(right)) / (tan * aspect * 0.82), Math.abs(d.dot(up)) / (tan * 0.82)));
  };
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) include(x, y, z);
  if (index === 0 && LIBRARY_PANEL) {
    const { x, y, z, w, h } = LIBRARY_PANEL;
    for (const side of [-1, 1]) include(x + side * w / 2, y + h / 2, z + 0.05);
  }
  return { pos: look.clone().addScaledVector(back, distance), look, rate: 4, fov, shiftY: 0 };
}

type Run = {
  index: number;
  room: ReadingRoom;
  headphones: ReturnType<typeof readingHeadphones>;
  pose: Pick<GameCharacter, "seatY" | "busy" | "watch" | "steady" | "attentive" | "fidgets" | "recline">;
  visible: boolean;
  camera: { mode: CameraRig["mode"]; stage: CameraRig["stage"]; zoom: number; fov: number; view: CameraRig["cam"]["view"]; yaw: number; pitch: number; dist: number };
  aspect: number;
  headY: number;
  seatedFor: number;
};
const movement = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);

/** Movement ownership only: no audio clock, playback command, bed, microphone hold or reader UI. */
export class ReadingSeat implements GameMode {
  readonly id = READING_SEAT;
  readonly cleanScreen = "world";
  readonly camera = "stage";
  readonly padDriving = true;
  readonly padAction = true;
  private pending: number | null = null;
  private run: Run | null = null;
  private disposed = false;
  constructor(private host: ReadingSeatHost) {}
  get active() { return this.run !== null; }
  get modal() { return this.pending !== null; }
  get chairIndex() { return this.run?.index ?? null; }
  get standingPoint(): Point | undefined {
    if (!this.run) return;
    const c = LIBRARY_CHAIRS[this.run.index];
    return libraryStandingPoint(this.run.room, { ...c.approach, rot: c.rot });
  }

  start(option?: string) {
    if (this.disposed || this.active || this.modal || !this.host.canStart()) return false;
    const index = option === undefined ? -1 : Number(option), c = LIBRARY_CHAIRS[index], room = this.host.room();
    if (!Number.isInteger(index) || !c || !room) return false;
    if (!room.nav.free(room.nav.idx(c.approach.x, c.approach.z)) || room.colliders.blocked(c.approach.x, c.approach.z, 0.38)) return false;
    this.pending = index;
    if (!this.host.approach(c.approach.x, c.approach.z, index)) { this.exit(true); return false; }
    return true;
  }

  arrive(index: number) {
    if (this.pending !== index || this.disposed) return false;
    const room = this.host.room(), player = this.host.player(), c = LIBRARY_CHAIRS[index];
    if (!room || !this.host.canStart() || Math.hypot(player.root.position.x - c.approach.x, player.root.position.z - c.approach.z) > 0.4
      || room.colliders.blocked(c.approach.x, c.approach.z, 0.38)) { this.exit(true); return false; }
    const furniture = room.group.getObjectByName("library-furniture") as Mesh | undefined;
    if (!furniture || Array.isArray(furniture.material)) { this.exit(true); return false; }
    const rig = this.host.rig, visible = player.root.visible;
    const pose = { seatY: player.seatY, busy: player.busy, watch: player.watch, steady: player.steady,
      attentive: player.attentive, fidgets: player.fidgets, recline: player.recline };
    const camera = { mode: rig.mode, stage: rig.stage, zoom: rig.cam.zoom, fov: rig.cam.fov,
      view: rig.cam.view ? { ...rig.cam.view } : null, yaw: rig.yaw, pitch: rig.pitch, dist: rig.dist };
    this.host.prepare();
    this.host.place(c.x, c.z, c.rot);
    player.seatY = c.seatY;
    player.busy = player.watch = null;
    player.steady = player.attentive = true;
    player.fidgets = false;
    player.recline = 0.08;
    player.root.visible = true;
    player.setAnim("sit");
    player.update(0);
    const headphones = readingHeadphones(furniture.material);
    player.headJoint.add(headphones);
    player.root.updateWorldMatrix(true, true);
    const headY = player.headJoint.getWorldPosition(new Vector3()).y + 0.4;
    this.pending = null;
    this.run = { index, room, headphones, pose, camera, visible, aspect: rig.cam.aspect, headY, seatedFor: 0 };
    rig.cam.zoom = 1;
    rig.cam.clearViewOffset();
    rig.stage = readingSeatShot(index, rig.cam.aspect, headY);
    rig.mode = "stage";
    // An immediate settled shot avoids a sweep through nearby furniture, including with reduced motion.
    rig.stageSnap();
    this.host.entered();
    this.host.save();
    this.host.reader(index);
    return true;
  }

  tick() {
    if ((this.pending !== null && (!this.host.room() || !this.host.approaching()))
      || (this.run && this.host.room()?.group !== this.run.room.group)) this.exit(true);
  }

  update(frame: ModeFrame) {
    const run = this.run;
    if (!run) return;
    run.seatedFor += frame.dt;
    if (!frame.blocked && Math.hypot(frame.x, frame.y) > 0.15) { this.exit(false); return; }
    const rig = this.host.rig;
    if (run.aspect !== rig.cam.aspect) {
      run.aspect = rig.cam.aspect;
      rig.stage = readingSeatShot(run.index, run.aspect, run.headY);
      if (this.host.reducedMotion()) rig.stageSnap();
    }
    this.host.player().update(frame.dt);
  }

  padTick(_input: Readonly<PadScalars>, pressed: number) {
    if (pressed & (PadButton.X | PadButton.A)) {
      this.input({ kind: "interact" });
      return "interact" as const;
    }
  }

  input(input: ModeInput) {
    if (input.kind === "key") {
      if (movement.has(input.key)) { this.exit(false); return false; } // Continue this press into ordinary walking.
      if (!["e", "enter", " ", "escape"].includes(input.key)) return false;
      if (input.repeat) return true;
      if (this.pending !== null && input.key !== "escape") return true;
      this.exit(false); return true;
    }
    if (input.kind === "interact" || input.kind === "jump") {
      if (this.pending === null) this.exit(false);
      return true;
    }
    // Swallow a second tap on the cushion during seating. Later ground taps use ordinary click-to-walk.
    return !this.run || this.run.seatedFor < 0.25;
  }

  exit(_immediate: boolean) {
    const pending = this.pending, run = this.run;
    this.pending = null;
    this.run = null; // Clear ownership before callbacks so reset/zone change can safely re-enter cleanup.
    if (pending !== null) this.host.cancelApproach();
    if (run) {
      const player = this.host.player(), c = LIBRARY_CHAIRS[run.index];
      run.headphones.removeFromParent();
      run.headphones.geometry.dispose();
      Object.assign(player, run.pose);
      player.root.visible = run.visible;
      player.setAnim("idle");
      const stand = libraryStandingPoint(run.room, { ...c.approach, rot: c.rot });
      this.host.place(stand.x, stand.z, stand.rot);
      player.update(0);
      const rig = this.host.rig;
      rig.mode = run.camera.mode;
      rig.stage = run.camera.stage;
      rig.yaw = run.camera.yaw; rig.pitch = run.camera.pitch; rig.dist = run.camera.dist;
      rig.cam.zoom = run.camera.zoom;
      rig.cam.fov = run.camera.fov;
      rig.cam.view = run.camera.view;
      rig.cam.updateProjectionMatrix();
      rig.snap();
    }
    if (run || pending !== null) {
      this.host.left();
      if (run) this.host.save();
    }
  }
  dispose() { this.exit(true); this.disposed = true; }
}
