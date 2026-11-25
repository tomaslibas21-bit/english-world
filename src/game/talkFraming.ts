// Loaded on an actor-backed conversation request.
import * as THREE from "three";
import type { CameraRig } from "./camera";
import type { GameCharacter } from "./characters";
import type { OcclusionField } from "./occlusion";
import { watchTalkLayout, type TalkLayout } from "./talkLayout";
import { covers, type Body, type Shot } from "./talkShot";
import { rayReaches, TalkMeshRanges } from "./talkMeshRange";

type Actor = { ch: GameCharacter; rot: number; sit?: boolean; alux?: unknown };
type Mesh = THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
type Box = TalkLayout["picture"];

interface FitInput {
  speaker: Actor;
  learner: GameCharacter;
  people: GameCharacter[];
  cast?: readonly Actor[];
  scene: THREE.Scene;
  lens: THREE.PerspectiveCamera;
  screen: TalkLayout;
  room?: { w: number; d: number };
  wild?: Pick<NonNullable<CameraRig["space"]>, "inside" | "free">;
  field?: OcclusionField;
  max: number;
  previous?: Framing;
  presented?: { pos: THREE.Vector3; look: THREE.Vector3 };
  allowNear?: boolean;
  report?: (stats: FitStats) => void;
}

interface FitStats {
  poses: number;
  tested: number;
  rays: number;
  meshes: number;
  ms: number;
  blocker: string | null;
  facing: number | null;
  size: number | null;
  tall: number | null;
}

export interface Framing extends Shot {
  dx: number;
  dy: number;
  fov: number;
  nearPlane: number;
  blend: boolean;
  clear: boolean;
}

const RAD = Math.PI / 180;
const FRONT_LIMIT = Math.cos(85 * RAD);
const FACE_PREFERENCE = Math.cos(55 * RAD);
const MOTION_MARGIN = 0.04;
const MAX_RAY_POSES = 8;
const TALK_NEAR = 0.1;
const painted = (m?: THREE.Material) => !!m?.visible && m.opacity > 0 && m.colorWrite;

function within(object: THREE.Object3D, ancestor: THREE.Object3D) {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) if (node === ancestor) return true;
  return false;
}

type HeadVertex = { index: number; fixed?: THREE.Vector3 };
const headShapes = new WeakMap<Mesh, HeadVertex[]>();

function headVertices(mesh: Mesh, head: THREE.Object3D, inverse: THREE.Matrix4) {
  const cached = headShapes.get(mesh);
  if (cached) return cached;
  const skin = (mesh as THREE.SkinnedMesh).isSkinnedMesh ? mesh as THREE.SkinnedMesh : null;
  const { position, skinIndex, skinWeight } = mesh.geometry.attributes;
  const bones = skin?.skeleton.bones;
  const belongs = bones?.map((bone) => within(bone, head));
  if (!position || (skin ? !skinIndex || !skinWeight || !belongs?.some(Boolean) : !within(mesh, head))) return [];
  const vertices: HeadVertex[] = [];
  for (let i = 0; i < position.count; i++) {
    let weight = 1, joint = 0;
    if (skin) {
      weight = 0;
      for (let slot = 0; slot < 4; slot++) {
        const next = skinWeight.getComponent(i, slot);
        if (next > weight) { weight = next; joint = skinIndex.getComponent(i, slot); }
      }
      if (!belongs![joint]) continue;
    }
    const rigid = skin ? bones![joint] === head && weight === 1 : mesh.parent === head && !mesh.matrixAutoUpdate;
    const fixed = rigid ? mesh.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse) : undefined;
    vertices.push({ index: i, fixed });
  }
  headShapes.set(mesh, vertices);
  return vertices;
}

function posedHead(character: GameCharacter, layers: THREE.Layers) {
  const head = character.headJoint;
  if (!head.matrixWorld.determinant()) return null;
  const inverse = head.matrixWorld.clone().invert();
  const local = new THREE.Box3(), bounds = new THREE.Box3();
  const crown = new THREE.Vector3(), chin = new THREE.Vector3();
  const points: { world: THREE.Vector3; x: number; y: number; z: number }[] = [];
  const v = new THREE.Vector3();
  character.root.traverseVisible((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh || !layers.test(mesh.layers)) return;
    if (!(Array.isArray(mesh.material) ? mesh.material.some(painted) : painted(mesh.material))) return;
    for (const { index, fixed } of headVertices(mesh, head, inverse)) {
      if (fixed) v.copy(fixed);
      else mesh.getVertexPosition(index, v).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
      local.expandByPoint(v);
      const world = v.clone().applyMatrix4(head.matrixWorld);
      if (world.y > bounds.max.y) crown.copy(world);
      if (world.y < bounds.min.y) chin.copy(world);
      bounds.expandByPoint(world);
      points.push({ world, x: v.x, y: v.y, z: v.z });
    }
  });
  if (bounds.isEmpty() || !(crown.y > chin.y)) return null;
  const span = local.getSize(new THREE.Vector3()), middle = local.getCenter(new THREE.Vector3());
  const corners: THREE.Vector3[] = [];
  for (const x of [local.min.x, local.max.x]) for (const y of [local.min.y, local.max.y]) for (const z of [local.min.z, local.max.z]) {
    corners.push(new THREE.Vector3(x, y, z).applyMatrix4(head.matrixWorld));
  }
  const front = (x: number, y: number) => {
    const depth = Math.sqrt(Math.max(0, 1 - (2 * x) ** 2 - (2 * y - 1) ** 2));
    return new THREE.Vector3(middle.x + x * span.x, local.min.y + y * span.y, middle.z + depth * span.z / 2).applyMatrix4(head.matrixWorld);
  };
  const lowerFace: THREE.Vector3[] = [];
  const linear = new THREE.Matrix3().setFromMatrix4(head.matrixWorld);
  // Sample the front surface between the mouth and the profile, at mouth and jaw height.
  for (const height of [0.19, 0.34]) for (const width of [-0.38, -0.13, 0.13, 0.38]) {
    const y = local.min.y + height * span.y, x = middle.x + width * span.x;
    let nearest: THREE.Vector3 | undefined, distance = Infinity;
    for (const p of points) {
      if (p.z < middle.z + span.z * 0.18) continue;
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < distance) { nearest = p.world; distance = d; }
    }
    if (nearest) lowerFace.push(Math.abs(width) > 0.3
      ? new THREE.Vector3(Math.sign(width) * 0.024, -0.012, 0).applyMatrix3(linear).add(nearest) : nearest);
  }
  return {
    bounds, corners, crown, chin, lowerFace, middle: middle.clone().applyMatrix4(head.matrixWorld),
    forward: new THREE.Vector3(0, 0, 1).transformDirection(head.matrixWorld),
    vertices: points.map(({ world }) => world),
    landmarks: [front(0, 0.5), crown, chin, front(-0.5, 0.42), front(0.5, 0.42),
      front(-0.23, 0.57), front(0.23, 0.57), front(0, 0.76), front(0, 0.31)],
    cheeks: points.filter(({ y }) => y >= local.min.y + span.y * 0.32 && y <= local.min.y + span.y * 0.52).map(({ world }) => world),
  };
}

type MeshBounds = { mesh: Mesh; box: THREE.Box3; matrix: THREE.Matrix4; geometry: THREE.BufferGeometry; version: number; count: number };

class TalkMeshes {
  private readonly bounds = new WeakMap<Mesh, MeshBounds>();
  private readonly local: MeshBounds[] = [];
  private readonly ranges = new TalkMeshRanges();
  private readonly ray = new THREE.Raycaster();
  private readonly up = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
  private readonly down = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
  private readonly hits: THREE.Intersection<Mesh>[] = [];
  private readonly direction = new THREE.Vector3();
  private readonly point = new THREE.Vector3();
  private readonly matrix = new THREE.Matrix4();
  private readonly instanceBox = new THREE.Box3();

  prepare(scene: THREE.Scene, speaker: THREE.Object3D, cam: THREE.Camera, region: THREE.Box3) {
    this.local.length = 0;
    this.ranges.beginFit();
    this.ray.camera = cam;
    this.ray.layers.mask = cam.layers.mask;
    scene.traverseVisible((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh || !mesh.geometry.attributes.position || !cam.layers.test(mesh.layers) || within(mesh, speaker)) return;
      const { material, geometry } = mesh;
      if (!(Array.isArray(material) ? material.some(painted) : painted(material))) return;
      const instanced = (mesh as THREE.InstancedMesh).isInstancedMesh ? mesh as THREE.InstancedMesh : null;
      const skin = (mesh as THREE.SkinnedMesh).isSkinnedMesh ? mesh as THREE.SkinnedMesh : null;
      const version = instanced?.instanceMatrix.version ?? -1, count = instanced?.count ?? -1;
      let cached = this.bounds.get(mesh);
      if (!cached || cached.geometry !== geometry || cached.version !== version || cached.count !== count || !cached.matrix.equals(mesh.matrixWorld)) {
        const box = cached?.box ?? new THREE.Box3();
        if (!geometry.boundingBox) geometry.computeBoundingBox();
        if (instanced) {
          box.makeEmpty();
          for (let i = 0; i < instanced.count; i++) {
            instanced.getMatrixAt(i, this.matrix);
            box.union(this.instanceBox.copy(geometry.boundingBox!).applyMatrix4(this.matrix));
          }
        } else if (skin?.boundingSphere) {
          // Game characters provide a conservative draw sphere around their animated limbs.
          skin.boundingSphere.getBoundingBox(box);
        } else {
          box.copy(geometry.boundingBox!);
          if (skin) box.expandByScalar(0.65);
        }
        box.applyMatrix4(mesh.matrixWorld);
        cached = { mesh, box, matrix: (cached?.matrix ?? new THREE.Matrix4()).copy(mesh.matrixWorld), geometry, version, count };
        this.bounds.set(mesh, cached);
      }
      if (cached.box.intersectsBox(region)) this.local.push(cached);
    });
    return this.local.length;
  }

  lensBlocker(pos: THREE.Vector3, look: THREE.Vector3, near: number, stats: FitStats) {
    this.direction.subVectors(look, pos).normalize();
    const reach = near + 0.015;
    this.ray.set(this.point.copy(pos).addScaledVector(this.direction, -reach), this.direction);
    this.ray.far = 2 * reach;
    this.up.origin.copy(pos);
    this.down.origin.copy(pos);
    stats.rays++;
    for (const { mesh, box } of this.local) {
      if (!this.inRange(box)) continue;
      if (this.hit(mesh)) return mesh;
      if (!box.containsPoint(pos) || mesh.raycast !== THREE.Mesh.prototype.raycast || Array.isArray(mesh.material)) continue;
      const solid = mesh as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
      if (mesh.geometry.type === "BoxGeometry" && mesh.geometry.boundingBox!.containsPoint(
        this.point.copy(pos).applyMatrix4(this.matrix.copy(mesh.matrixWorld).invert()))) return mesh;
      // The first surface above and below a lens inside a closed piece of scenery faces out.
      stats.rays++;
      if (this.ranges.hits(solid, this.up, 1.2, true)) {
        stats.rays++;
        if (this.ranges.hits(solid, this.down, 1.2, true)) return mesh;
      }
    }
    return null;
  }

  blocker(pos: THREE.Vector3, to: THREE.Vector3, stats: FitStats, fraction = 0.97) {
    const distance = this.direction.subVectors(to, pos).length();
    if (!distance) return null;
    this.ray.set(pos, this.direction.multiplyScalar(1 / distance));
    this.ray.far = distance * fraction;
    stats.rays++;
    for (const { mesh, box } of this.local) if (this.inRange(box) && this.hit(mesh)) return mesh;
    return null;
  }

  travelClear(from: THREE.Vector3, to: THREE.Vector3, stats: FitStats) {
    return !this.blocker(from, to, stats, 1) && !this.blocker(to, from, stats, 1);
  }

  private inRange(box: THREE.Box3) {
    return rayReaches(this.ray.ray, this.ray.far ** 2, box, this.point);
  }

  private hit(mesh: Mesh) {
    const materials = mesh.material;
    if (!Array.isArray(materials)) {
      const hits = this.ranges.hits(mesh as THREE.Mesh<THREE.BufferGeometry, THREE.Material>, this.ray.ray, this.ray.far);
      if (hits !== undefined) return hits;
    }
    this.hits.length = 0;
    mesh.raycast(this.ray, this.hits);
    return this.hits.some((hit) => hit.distance < this.ray.far
      && painted(Array.isArray(materials) ? materials[hit.face?.materialIndex ?? -1] : materials));
  }
}

interface Candidate extends Framing {
  kind: "shoulder" | "front" | "level" | "close" | "raised" | "counter" | "over" | "steep" | "near" | "cave";
  yaw: number;
  clearance: number;
  size: number;
  tall: number;
  angle: number;
  facing: number;
  quality: number;
  prior: boolean;
}

function cylinder(character: GameCharacter, radius: number): Body {
  const { x, y, z } = character.root.getWorldPosition(new THREE.Vector3());
  const scale = character.root.getWorldScale(new THREE.Vector3());
  return { x, y, z, top: y + character.height * 1.1 * scale.y, r: radius * Math.max(1, scale.x, scale.z) };
}

function inside(pos: THREE.Vector3, body: Body) {
  return pos.y > body.y - 0.05 && pos.y < body.top && (pos.x - body.x) ** 2 + (pos.z - body.z) ** 2 < body.r ** 2;
}

function crossesBody(pos: THREE.Vector3, face: THREE.Vector3, body: Body, edge: THREE.Vector3) {
  if (covers(pos, face, body)) return true;
  const dy = face.y - pos.y;
  if (!dy) return false;
  const t = ((dy < 0 ? body.top - 0.0001 : body.y) - pos.y) / dy;
  return t > 0 && t < 0.97 && inside(edge.lerpVectors(pos, face, t), body);
}

const distanceToBand = (n: number, lo: number, hi: number) => Math.max(lo - n, n - hi, 0);
const boxGap = (a: Box, b: Box) => Math.max(a.x0 - b.x1, b.x0 - a.x1, a.y0 - b.y1, b.y0 - a.y1);

function insideShift(min: number, max: number, lo: number, hi: number) {
  const start = max - hi, end = min - lo;
  return start <= end ? THREE.MathUtils.clamp(0, start, end) : (start + end) / 2;
}

/** Translate the projected head around painted islands while retaining the panel and viewport margins. */
function clearShift(head: Box, required: Box, opening: Box, obstacles: readonly Box[]) {
  const left = required.x1 - opening.x1, right = required.x0 - opening.x0;
  const up = required.y1 - opening.y1, down = required.y0 - opening.y0;
  if (left > right || up > down) return null;
  const xs = [THREE.MathUtils.clamp(0, left, right)], ys = [THREE.MathUtils.clamp(0, up, down)];
  for (const box of obstacles) {
    const fromLeft = head.x1 - box.x0, fromRight = head.x0 - box.x1;
    const fromTop = head.y1 - box.y0, fromBottom = head.y0 - box.y1;
    if (fromLeft >= left && fromLeft <= right) xs.push(fromLeft);
    if (fromRight >= left && fromRight <= right) xs.push(fromRight);
    if (fromTop >= up && fromTop <= down) ys.push(fromTop);
    if (fromBottom >= up && fromBottom <= down) ys.push(fromBottom);
  }
  let best: [number, number] | null = null, distance = Infinity;
  for (const x of xs) for (const y of ys) {
    const cost = x * x + y * y;
    if (cost >= distance) continue;
    const at = { x0: head.x0 - x, x1: head.x1 - x, y0: head.y0 - y, y1: head.y1 - y };
    if (obstacles.some((box) => boxGap(at, box) < -0.0001)) continue;
    best = [x, y];
    distance = cost;
  }
  return best;
}

export class TalkFraming {
  private readonly meshes = new TalkMeshes();

  fit(input: FitInput): Framing | null {
    const started = performance.now();
    const { speaker, learner, screen, lens, room, wild, field, previous, presented, scene } = input;
    const { width: w, height: h, picture, obstacles } = screen;
    scene.updateMatrixWorld(true);
    const head = posedHead(speaker.ch, lens.layers);
    if (!head) return null;

    const portrait = w < h && w < 768, desktop = w > 900;
    const minSize = portrait ? 6 : 8, maxSize = portrait ? 32 : 38;
    const short = portrait && (picture.y1 - picture.y0) / screen.viewportHeight < 0.19;
    const preferred = short ? 10.5 : portrait ? 13 : 17;
    const aimX = w / 2 - screen.shiftX, aimY = h / 2 - screen.shiftY;
    const feet = speaker.ch.root.getWorldPosition(new THREE.Vector3());
    const me = cylinder(learner, 0.34);
    const crowd = input.people.filter((ch) => ch !== speaker.ch && ch !== learner && ch.root.visible)
      .map((ch) => cylinder(ch, 0.28)).filter((body) => (body.x - feet.x) ** 2 + (body.z - feet.z) ** 2 < 14 ** 2);
    const actor = cylinder(speaker.ch, 0.36);
    actor.top = head.bounds.max.y + 0.06;
    const parent = speaker.ch.root.parent;
    const authored = new THREE.Vector3(Math.sin(speaker.rot), 0, Math.cos(speaker.rot));
    if (parent) authored.transformDirection(parent.matrixWorld).setY(0).normalize();
    const front = new THREE.Vector3(me.x - feet.x, 0, me.z - feet.z);
    const apart = front.length();
    if (apart < 0.1) front.copy(authored);
    front.normalize();
    const turnsToLearner = !!speaker.alux || (!speaker.sit && apart < 7);
    const basis = turnsToLearner ? front : head.forward.clone().setY(0).normalize();
    if (!basis.lengthSq()) basis.copy(authored);
    const counterApproach = room && !wild && turnsToLearner && front.dot(authored) > 0.85;
    const focus = head.middle.clone().addScaledVector(front, Math.min(0.18, apart * 0.05));
    focus.y -= 0.12;

    const camera = new THREE.PerspectiveCamera(50, w / h, TALK_NEAR, lens.far);
    camera.layers.mask = lens.layers.mask;
    camera.zoom = lens.zoom;
    camera.filmGauge = lens.filmGauge;
    camera.filmOffset = lens.filmOffset;
    camera.up.copy(lens.up);
    const defaultFocal = h * camera.zoom / (2 * Math.tan(25 * RAD));
    const projection = new THREE.Matrix4();
    const projected = new THREE.Vector3(), offset = new THREE.Vector3(), edge = new THREE.Vector3();
    const legacyHeight = speaker.ch.height;
    const legacyFace = feet.clone().add(new THREE.Vector3(0, (speaker.sit ? 0.72 : 0.9) * legacyHeight, 0));
    const legacyTop = feet.clone().setY(feet.y + legacyHeight);
    const chest = feet.clone().setY(feet.y + (speaker.sit ? 0.45 : 0.62) * legacyHeight);
    const shoulder = new THREE.Vector3(me.x, me.y + (me.top - me.y) * 0.65, me.z);
    const nearby = (input.cast ?? []).filter((n) => n !== speaker && n.ch.root.visible)
      .map((n) => n.ch.headJoint.getWorldPosition(new THREE.Vector3())).filter((p) => p.distanceToSquared(head.middle) < 2.6 ** 2);
    const caveSize = Math.max(minSize + 0.8, Math.min(preferred,
      (picture.y1 - picture.y0) / screen.viewportHeight * 100 * (head.crown.y - head.chin.y)
        / (Math.max(head.crown.y - chest.y, head.crown.y - head.chin.y) + 2 * MOTION_MARGIN)));
    const candidates: Candidate[] = [];
    const stats: FitStats = { poses: 0, tested: 0, rays: 0, meshes: 0, ms: 0, blocker: null, facing: null, size: null, tall: null };

    const shift = (dx: number, dy: number) => {
      camera.setViewOffset(w, h, screen.shiftX + dx, screen.shiftY + dy, w, h);
      projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    };
    const project = (v: THREE.Vector3) => {
      projected.copy(v).applyMatrix4(projection);
      projected.x = (1 + projected.x) * w / 2;
      projected.y = (1 - projected.y) * h / 2;
      return projected.z >= -1 && projected.z <= 1;
    };
    const inPicture = (v: THREE.Vector3) => project(v) && projected.x >= picture.x0 && projected.x <= picture.x1
      && projected.y >= picture.y0 && projected.y <= picture.y1;
    const roomForLens = (pos: THREE.Vector3) => (wild
      ? !wild.inside(pos) && wild.free(pos, legacyFace) >= 0.999 && wild.free(pos, head.middle) >= 0.999 && wild.free(pos, chest) >= 0.999
      : (!room || (Math.abs(pos.x) <= room.w / 2 - 0.5 && pos.z >= -room.d / 2 + 0.5)) && !field?.solidAt(pos.x, pos.y, pos.z, 0.06))
      && !head.bounds.containsPoint(pos) && !inside(pos, actor) && !inside(pos, me) && !crowd.some((body) => inside(pos, body));
    const placeLens = (f: Candidate) => {
      camera.position.copy(f.pos);
      camera.lookAt(f.look);
      camera.updateMatrixWorld();
      camera.fov = f.fov;
      camera.near = f.nearPlane;
    };

    const measure = (f: Candidate, recenter: boolean) => {
      if (!roomForLens(f.pos)) return false;
      placeLens(f);
      if (recenter) {
        shift(0, 0);
        project(head.landmarks[0]);
        f.dx = projected.x - aimX;
        f.dy = projected.y - aimY;
      }
      shift(f.dx, f.dy);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      let depth = Infinity, spreadX = 0, spreadY = 0;
      for (const corner of head.corners) {
        offset.copy(corner).applyMatrix4(camera.matrixWorldInverse);
        if (-offset.z < camera.near || -offset.z > camera.far) return false;
        depth = Math.min(depth, -offset.z);
        spreadX = Math.max(spreadX, Math.abs(offset.x / offset.z));
        spreadY = Math.max(spreadY, Math.abs(offset.y / offset.z));
      }
      for (const vertex of head.vertices) {
        project(vertex);
        x0 = Math.min(x0, projected.x); x1 = Math.max(x1, projected.x);
        y0 = Math.min(y0, projected.y); y1 = Math.max(y1, projected.y);
      }
      const pad = MOTION_MARGIN * camera.projectionMatrix.elements[5] * h / 2 / Math.max(0.01, depth - MOTION_MARGIN);
      x0 -= pad * (1 + spreadX); x1 += pad * (1 + spreadX);
      y0 -= pad * (1 + spreadY); y1 += pad * (1 + spreadY);
      if (recenter) {
        // In the cave the opening must also contain the original chest point.
        let bottom = y1;
        if (wild && project(chest)) bottom = Math.max(bottom, projected.y);
        let dx = THREE.MathUtils.clamp((x0 + x1) / 2 - aimX, -12, 12);
        let dy = THREE.MathUtils.clamp((y0 + y1) / 2 - aimY, -14, 14);
        dx += THREE.MathUtils.clamp(insideShift(x0 - dx, x1 - dx, picture.x0, picture.x1), -8, 8);
        const vertical = insideShift(y0 - dy, bottom - dy, picture.y0, picture.y1);
        dy += wild ? vertical : THREE.MathUtils.clamp(vertical, -8, 8);
        f.dx += dx; f.dy += dy;
        x0 -= dx; x1 -= dx; y0 -= dy; y1 -= dy;
        shift(f.dx, f.dy);
      }
      let bounds = { x0, x1, y0, y1 };
      if (recenter && obstacles.some((box) => boxGap(bounds, box) < 0)) {
        const required = { ...bounds };
        const include = (point: THREE.Vector3) => {
          project(point);
          required.x0 = Math.min(required.x0, projected.x); required.x1 = Math.max(required.x1, projected.x);
          required.y0 = Math.min(required.y0, projected.y); required.y1 = Math.max(required.y1, projected.y);
        };
        include(legacyFace);
        if (wild) include(chest);
        const move = clearShift(bounds, required, picture, obstacles);
        if (move) {
          const [dx, dy] = move;
          f.dx += dx; f.dy += dy;
          bounds = { x0: x0 - dx, x1: x1 - dx, y0: y0 - dy, y1: y1 - dy };
          shift(f.dx, f.dy);
        }
      }
      const margin = Math.min(bounds.x0 - picture.x0, picture.x1 - bounds.x1, bounds.y0 - picture.y0, picture.y1 - bounds.y1);
      f.clearance = obstacles.reduce((gap, box) => Math.min(gap, boxGap(bounds, box)), margin);
      if (f.clearance < -0.0001 || !head.landmarks.every(inPicture) || !inPicture(legacyFace) || (wild && !inPicture(chest))) return false;
      project(head.crown);
      const crown = projected.y;
      project(head.chin);
      f.size = Math.abs(crown - projected.y) * 100 / screen.viewportHeight;
      if (distanceToBand(f.size, minSize, maxSize) > 0) return false;
      project(legacyTop);
      const top = projected.y;
      project(feet);
      f.tall = projected.y - top;
      if (desktop && f.tall < 120) return false;

      offset.subVectors(f.pos, feet).setY(0).normalize();
      f.angle = offset.dot(front);
      if (f.angle < FRONT_LIMIT) return false;
      offset.subVectors(f.pos, head.middle).normalize();
      f.facing = offset.dot(head.forward);
      if (turnsToLearner) f.facing = Math.min(f.facing, offset.dot(front));
      if (f.facing < FRONT_LIMIT) return false;
      const showShoulder = project(shoulder) && projected.y > picture.y0 && projected.y < picture.y1 + 48;
      const shoulderAtEdge = showShoulder && (Math.abs(projected.x - picture.x0) < 55 || Math.abs(projected.x - picture.x1) < 55);
      // Eye-level views leave more of the expression visible under brows, glasses and hat brims.
      f.quality = Math.min(f.clearance, 9) - Math.abs(f.size - preferred) * 1.7 + f.angle * 6 + f.facing * 19 - Math.abs(offset.y) * 14
        + (shoulderAtEdge ? 5 : showShoulder && projected.x > picture.x0 && projected.x < picture.x1 ? 1 : 0)
        + nearby.filter(inPicture).length - (desktop ? Math.max(0, 230 - f.tall) * 0.24 : 0);
      return true;
    };

    const blockedByBody = (f: Candidate) => {
      // Cover the legacy face region as the learner turns, including the backpack.
      const rx = f.pos.z - legacyFace.z, rz = legacyFace.x - f.pos.x, len = Math.hypot(rx, rz) || 1;
      for (const s of [-0.2, 0, 0.2]) for (const lift of [-0.2, 0, 0.12]) {
        offset.set(legacyFace.x + s * rx / len, legacyFace.y + lift, legacyFace.z + s * rz / len);
        if (crossesBody(f.pos, offset, me, edge)) return true;
      }
      return head.landmarks.some((p) => crossesBody(f.pos, p, me, edge) || crowd.some((body) => crossesBody(f.pos, p, body, edge)));
    };

    const add = (pos: THREE.Vector3, look: THREE.Vector3, kind: Candidate["kind"], yaw: number, old?: Framing) => {
      if (pos.distanceToSquared(head.middle) > input.max ** 2) return;
      const target = kind === "cave" ? caveSize : short && kind === "counter" ? 10.1 : preferred;
      const focal = screen.viewportHeight * target / 100 * pos.distanceTo(head.middle) / (head.crown.y - head.chin.y);
      const maxFov = portrait && (kind === "front" || kind === "level" || kind === "close" || kind === "near" || kind === "cave") ? 114 : short ? 94 : 80;
      const adaptive = short || kind !== "shoulder";
      const fov = old?.fov ?? (adaptive ? THREE.MathUtils.clamp(2 * Math.atan(h * camera.zoom / (2 * focal)) / RAD, 50, maxFov) : 50);
      const f: Candidate = { pos, look, fov, nearPlane: old?.nearPlane ?? TALK_NEAR, dx: 0, dy: 0, kind, yaw,
        prior: !!old, clearance: 0, size: 0, tall: 0, angle: 0, facing: 0, quality: 0, clear: false, blend: false };
      stats.poses++;
      if (measure(f, true) && !blockedByBody(f)) candidates.push(f);
    };
    const pose = (yaw: number, distance: number, down: number, kind: Candidate["kind"], axis = basis) => {
      const f = Math.cos(yaw * RAD) * distance, s = Math.sin(yaw * RAD) * distance;
      const pos = new THREE.Vector3(head.middle.x + axis.x * f - axis.z * s,
        focus.y + Math.tan(down * RAD) * distance, head.middle.z + axis.z * f + axis.x * s);
      add(pos, focus, kind, yaw);
    };

    const estimate = THREE.MathUtils.clamp((head.crown.y - head.chin.y) * defaultFocal / (screen.viewportHeight * preferred / 100), 1.2, input.max * 0.9);
    if (previous?.clear) add(previous.pos, previous.look, "shoulder", 0, previous);
    for (const side of [1, -1]) {
      for (const d of [2.4, 3.3, 4.4]) for (const yaw of [36, 50, 66]) pose(yaw * side, d, 15, "shoulder");
      pose(28 * side, 2.05, 13, "close");
      pose(78 * side, 1.8, 12, "close");
      pose(22 * side, 2.6, 28, "raised");
      pose(48 * side, THREE.MathUtils.clamp(estimate, 2.45, 3.5), 27, "raised");
      pose(22 * side, estimate, 12, "front");
      if (!wild) {
        pose(22 * side, 2.2, 7, "level");
        pose(38 * side, 3.1, 6, "level");
      }
      if (counterApproach) {
        if (portrait) pose(45 * side, 2.8, 23, "counter", authored);
        else pose(6 * side, 1.7, 29, "counter", authored);
        if (desktop) pose(26 * side, 3.3, 26, "raised");
        // A tall partition can leave space above its customer edge or in the aisle behind it.
        pose(46 * side, 2.65, 31, "over", authored);
        // A more centred view over a tall pane can expose the far eye past glasses or the nose.
        pose(24 * side, 2.5, 41, "steep", authored);
        pose(30 * side, 3.1, 39, "steep", authored);
      }
      if (!room && !wild) {
        // Under an awning, the sightline may open between the speaker and a display on the counter.
        pose(28 * side, 1.75, 24, "near");
        pose(38 * side, 2.55, 34, "over");
      }
      if (wild) for (const yaw of [28, 48, 68]) for (const d of [1.25, 1.85, 2.5, 3.4, 4.4]) pose(yaw * side, d, 8, "cave");
    }
    pose(0, estimate, 12, "front");
    pose(0, 1.8, 12, "front", authored);
    if (!wild) pose(0, 2.7, 7, "level");
    pose(0, 2.45, 29, "raised");
    const headAxis = head.forward.clone().setY(0).normalize();
    if (headAxis.lengthSq() && headAxis.dot(basis) < 0.96) {
      for (const yaw of [0, 25, -25]) pose(yaw, estimate, 12, "front", headAxis);
    }

    const finish = (f?: Candidate) => {
      stats.ms = performance.now() - started;
      stats.facing = f ? Math.acos(THREE.MathUtils.clamp(f.facing, -1, 1)) / RAD : null;
      stats.size = f?.size ?? null;
      stats.tall = f?.tall ?? null;
      input.report?.(stats);
      return f ?? null;
    };
    if (!candidates.length) {
      stats.blocker = "no lens clears the opening, facing and body checks";
      return finish();
    }

    const region = head.bounds.clone();
    for (const f of candidates) region.expandByPoint(f.pos);
    if (wild) region.expandByPoint(chest);
    if (presented && region.distanceToPoint(presented.pos) < 0.4) region.expandByPoint(presented.pos);
    region.expandByScalar(0.23);
    stats.meshes = this.meshes.prepare(scene, speaker.ch.root, camera, region);
    const geometry = (f: Candidate) => {
      stats.tested++;
      const lensHit = this.meshes.lensBlocker(f.pos, f.look, f.nearPlane, stats);
      if (lensHit) return lensHit;
      let left = head.landmarks[3], right = head.landmarks[4], leftX = Infinity, rightX = -Infinity;
      for (const p of head.cheeks) {
        project(p);
        if (projected.x < leftX) { left = p; leftX = projected.x; }
        if (projected.x > rightX) { right = p; rightX = projected.x; }
      }
      for (let i = 0; i < head.landmarks.length; i++) {
        const hit = this.meshes.blocker(f.pos, i === 3 ? left : i === 4 ? right : head.landmarks[i], stats);
        if (hit) return hit;
      }
      for (const p of head.lowerFace) {
        const hit = this.meshes.blocker(f.pos, p, stats);
        if (hit) return hit;
      }
      // The cave's analytic rock check and drawn rock both guard the head and chest.
      return wild ? this.meshes.blocker(f.pos, legacyFace, stats) ?? this.meshes.blocker(f.pos, chest, stats) : null;
    };
    const compare = (a: Candidate, b: Candidate) =>
      Number(b.facing >= FACE_PREFERENCE) - Number(a.facing >= FACE_PREFERENCE)
      || (a.facing < FACE_PREFERENCE && b.facing < FACE_PREFERENCE ? b.facing - a.facing : 0)
      || Number(a.kind === "steep") - Number(b.kind === "steep") || b.quality - a.quality;
    candidates.sort(compare);

    // Save slots for both sides and alternate heights before testing a second variation of a lens.
    const shortlist = new Set<Candidate>();
    const pick = (filter: (f: Candidate) => boolean) => {
      if (shortlist.size === MAX_RAY_POSES) return undefined;
      const f = candidates.find((f) => !shortlist.has(f) && filter(f));
      if (f) shortlist.add(f);
      return f;
    };
    pick(() => true);
    const first = pick((f) => f.kind === "shoulder" && !f.prior);
    if (first) pick((f) => f.kind === "shoulder" && f.yaw * first.yaw < 0);
    pick((f) => f.kind === "level" && f.facing >= FACE_PREFERENCE);
    const close = pick((f) => f.kind === "counter" || f.kind === "near" || f.kind === "cave");
    if (close?.kind === "near") pick((f) => f.kind === close.kind && f.yaw * close.yaw < 0);
    const high = pick((f) => f.kind === "over");
    if (room && high) pick((f) => f.kind === "over" && f.yaw * high.yaw < 0);
    pick((f) => f.kind === "steep");
    pick((f) => f.kind === "front");
    pick((f) => f.kind === "raised");
    pick((f) => f.kind === "close");
    pick((f) => f.yaw * candidates[0].yaw < 0 && f.facing >= FACE_PREFERENCE);
    for (const f of candidates) if (shortlist.size < MAX_RAY_POSES) shortlist.add(f);

    let chosen: Candidate | undefined;
    for (const f of [...shortlist].sort(compare)) {
      placeLens(f);
      shift(f.dx, f.dy);
      const hit = geometry(f);
      if (hit) { stats.blocker ??= hit.name || hit.geometry.type; continue; }
      chosen = f;
      break;
    }
    if (!chosen) return finish();
    const f = chosen;
    f.clear = true;
    stats.blocker = null;

    const sample = (pos: THREE.Vector3, look: THREE.Vector3, fov = f.fov, dx = f.dx, dy = f.dy, nearPlane = f.nearPlane) => {
      const between = { ...f, pos, look, fov, dx, dy, nearPlane };
      return measure(between, false) && !blockedByBody(between) && !geometry(between);
    };
    const travelClear = (from: THREE.Vector3, to: THREE.Vector3) =>
      (!wild || (!wild.inside(from) && !wild.inside(to) && wild.free(from, to) >= 0.999 && wild.free(to, from) >= 0.999))
      && this.meshes.travelClear(from, to, stats);
    const view = lens.view?.enabled ? lens.view : null;
    const sameCanvas = lens.aspect === w / h && (!view || (view.fullWidth === w && view.fullHeight === h && view.width === w && view.height === h));
    if (presented && sameCanvas && presented.pos.distanceTo(f.pos) <= 0.32 && presented.look.distanceTo(f.look) <= 0.36
      && offset.subVectors(presented.look, presented.pos).angleTo(edge.subVectors(f.look, f.pos)) <= 8 * RAD
      && stats.tested <= MAX_RAY_POSES - 3) {
      const dx = (view?.offsetX ?? 0) - screen.shiftX, dy = (view?.offsetY ?? 0) - screen.shiftY;
      f.blend = sample(presented.pos, presented.look, lens.fov, dx, dy, lens.near)
        && camera.quaternion.angleTo(lens.quaternion) < 0.0001 && travelClear(presented.pos, f.pos)
        && [1 / 3, 2 / 3].every((t) => sample(presented.pos.clone().lerp(f.pos, t), presented.look.clone().lerp(f.look, t),
          THREE.MathUtils.lerp(lens.fov, f.fov, t), THREE.MathUtils.lerp(dx, f.dx, t), THREE.MathUtils.lerp(dy, f.dy, t),
          THREE.MathUtils.lerp(lens.near, f.nearPlane, t)));
    }
    if (input.allowNear !== false && !f.blend && f.clearance >= 7 && stats.tested <= MAX_RAY_POSES - 3) {
      const near = f.pos.clone().lerp(f.look, 0.06);
      if (travelClear(f.pos, near) && [1 / 3, 2 / 3, 1].every((t) => sample(f.pos.clone().lerp(near, t), f.look))) f.near = near;
    }
    return finish(f);
  }
}

const MOVE_SECONDS = 0.4;
const lensPose = () => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 50, near: TALK_NEAR, x: 0, y: 0 });

/** Owns the measured pose and finite move for one conversation. */
export class TalkPresentation {
  layout: TalkLayout | null = null;
  private readonly watch: ReturnType<typeof watchTalkLayout>;
  private readonly framing = new TalkFraming();
  private readonly views = new Map<Actor, Framing>();
  private shot?: Framing;
  private elapsed = MOVE_SECONDS;
  private stopped = false;
  private width = 0;
  private height = 0;
  private readonly from = lensPose();
  private readonly to = lensPose();
  private readonly motion = typeof matchMedia === "undefined" ? undefined : matchMedia("(prefers-reduced-motion: reduce)");

  constructor(canvas: HTMLCanvasElement, private readonly rig: CameraRig, private speaker: Actor,
    private readonly valid: (speaker: Actor) => boolean, hasArt: boolean,
    private readonly inputs: () => Omit<FitInput, "speaker" | "lens" | "screen" | "presented" | "previous">,
    private readonly covered: () => boolean) {
    this.watch = watchTalkLayout(canvas, () => !this.stopped && valid(this.speaker), hasArt, (layout) => {
      this.layout = layout;
      this.fit();
    });
  }

  get reducedMotion() { return this.motion?.matches ?? false; }
  resize() { this.watch.dirty(); }
  dispose() {
    this.stopped = true;
    this.watch.dispose();
    this.elapsed = MOVE_SECONDS;
    this.rig.cam.clearViewOffset();
  }

  aim(speaker: Actor) {
    if (this.stopped || this.speaker === speaker) return;
    this.speaker = speaker;
    this.elapsed = MOVE_SECONDS;
    this.watch.refit();
  }

  private fit() {
    const { layout, rig, speaker } = this;
    const wasMoving = this.elapsed < MOVE_SECONDS;
    this.elapsed = MOVE_SECONDS;
    if (!layout || !this.valid(speaker)) return;
    const cam = rig.cam;
    const animate = !this.covered() && !this.reducedMotion;
    const opening = !this.shot;
    const presented = animate ? { pos: cam.position, look: rig.presentedLook } : undefined;
    const shot = this.framing.fit({ ...this.inputs(), speaker, lens: cam, screen: layout,
      previous: wasMoving ? undefined : this.views.get(speaker), presented, allowNear: opening && animate });
    if (!shot?.clear || !this.valid(speaker)) return;
    this.shot = shot;
    this.views.set(speaker, shot);
    const glide = animate && shot.blend;
    const near = opening && animate ? shot.near : undefined;
    const x = layout.shiftX + shot.dx, y = layout.shiftY + shot.dy;
    this.width = layout.width;
    this.height = layout.height;
    this.to.pos.copy(near ?? shot.pos);
    this.to.look.copy(shot.look);
    this.to.fov = shot.fov;
    this.to.near = shot.nearPlane;
    this.to.x = x;
    this.to.y = y;
    this.from.pos.copy(glide ? cam.position : shot.pos);
    this.from.look.copy(glide ? rig.presentedLook : shot.look);
    this.from.fov = glide ? cam.fov : shot.fov;
    this.from.near = glide ? cam.near : shot.nearPlane;
    const view = cam.view?.enabled ? cam.view : null;
    this.from.x = glide ? view?.offsetX ?? 0 : x;
    this.from.y = glide ? view?.offsetY ?? 0 : y;
    this.elapsed = glide || near ? 0 : MOVE_SECONDS;
    this.place(this.elapsed ? 1 : 0);
  }

  update(dt: number) {
    // Resize and speaker events can arrive after the game has queued its next
    // frame. Fit the dirty layout before that frame uses the old shot.
    this.watch.flush();
    if (this.elapsed >= MOVE_SECONDS || !this.valid(this.speaker)) return;
    this.elapsed = this.reducedMotion ? MOVE_SECONDS : Math.min(MOVE_SECONDS, this.elapsed + dt);
    const t = this.elapsed / MOVE_SECONDS;
    this.place(t * t * (3 - 2 * t));
  }

  private place(t: number) {
    const { from, to, rig } = this;
    const target = rig.talk ??= { pos: new THREE.Vector3(), look: new THREE.Vector3() };
    target.pos.lerpVectors(from.pos, to.pos, t);
    target.look.lerpVectors(from.look, to.look, t);
    const lerp = THREE.MathUtils.lerp;
    rig.presentTalk(this.width, this.height, lerp(from.x, to.x, t), lerp(from.y, to.y, t),
      lerp(from.fov, to.fov, t), lerp(from.near, to.near, t));
  }
}
