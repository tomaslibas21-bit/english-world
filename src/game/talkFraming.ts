// Loaded with the talk overlay. The fit uses the same shifted perspective lens as the renderer.
import * as THREE from "three";
import type { CameraRig } from "./camera";
import type { GameCharacter } from "./characters";
import type { OcclusionField } from "./occlusion";
import { watchTalkLayout, type TalkLayout } from "./talkLayout";
import { covers, type Body, type Shot } from "./talkShot";
import { rayReaches, TalkMeshRanges } from "./talkMeshRange";

type Actor = { ch: GameCharacter; rot: number; sit?: boolean };
type Mesh = THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
type Screen = TalkLayout;
type Box = Screen["picture"];

interface FitInput {
  speaker: Actor;
  learner: GameCharacter;
  people: GameCharacter[];
  scene: THREE.Scene;
  lens: THREE.PerspectiveCamera;
  screen: Screen;
  room?: { w: number; d: number };
  field?: OcclusionField;
  max: number;
  previous?: Framing;
  presented?: { pos: THREE.Vector3; look: THREE.Vector3 };
  allowNear?: boolean;
  hint?: THREE.Vector3;
  /** An authored shot with room for scenery beside the speaker. */
  composition?: Pick<Shot, "pos" | "look">;
  report?: (stats: FitStats) => void;
}

interface FitStats {
  poses: number;
  tested: number;
  rays: number;
  meshes: number;
  ms: number;
  screenMs: number;
  prepareMs: number;
  blocker: string | null;
}

export interface Framing extends Shot {
  dx: number;
  dy: number;
  fov: number;
  blend: boolean;
  clear: boolean;
}

type HeadVertex = { index: number; fixed?: THREE.Vector3 };
const headShapes = new WeakMap<Mesh, HeadVertex[]>();
const SLACK = 0.04;
const MAX_RAY_POSES = 8;
const RAD = Math.PI / 180;
const FRONT_LIMIT = Math.cos(85 * RAD);
const FACE_PREFERENCE = Math.cos(55 * RAD);
const painted = (m?: THREE.Material) => !!m?.visible && m.opacity > 0;

function within(object: THREE.Object3D, ancestor: THREE.Object3D) {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) if (node === ancestor) return true;
  return false;
}

function headVertices(mesh: Mesh, head: THREE.Object3D, inverse: THREE.Matrix4) {
  const cached = headShapes.get(mesh);
  if (cached) return cached;
  const skin = (mesh as THREE.SkinnedMesh).isSkinnedMesh ? (mesh as THREE.SkinnedMesh) : null;
  const { position, skinIndex, skinWeight } = mesh.geometry.attributes;
  const bones = skin?.skeleton.bones;
  const belongs = bones?.map((bone) => within(bone, head));
  if (!position || (skin ? !skinIndex || !belongs?.some(Boolean) : !within(mesh, head))) return [];
  const vertices: HeadVertex[] = [];
  for (let i = 0; i < position.count; i++) {
    if (skin && !belongs![skinIndex.getX(i)]) continue;
    const rigid = skin ? bones![skinIndex.getX(i)] === head && skinWeight.getX(i) === 1 : mesh.parent === head && !mesh.matrixAutoUpdate;
    vertices.push({ index: i, fixed: rigid ? mesh.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse) : undefined });
  }
  headShapes.set(mesh, vertices);
  return vertices;
}

/** Resolve animated descendants once per fit. Rigid vertices already live in the head's coordinate system. */
function posedHead(speaker: GameCharacter, layers: THREE.Layers, checkLowerFace: boolean) {
  const head = speaker.headJoint;
  const inverse = head.matrixWorld.clone().invert();
  const local = new THREE.Box3(), bounds = new THREE.Box3();
  const crown = new THREE.Vector3(), chin = new THREE.Vector3();
  const points: { world: THREE.Vector3; x: number; y: number; z: number }[] = [];
  const v = new THREE.Vector3();
  speaker.root.traverseVisible((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh || !layers.test(mesh.layers)) return;
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
  if (checkLowerFace) {
    const headLinear = new THREE.Matrix3().setFromMatrix4(head.matrixWorld);
    // Cover the lower skin between the legacy mouth point and the profile, at mouth and jaw height.
    // Resolve the samples on the actual posed front surface, below hats and away from the back of the head.
    for (const height of [0.19, 0.34]) for (const width of [-0.38, -0.13, 0.13, 0.38]) {
      const y = local.min.y + height * span.y, x = middle.x + width * span.x;
      let nearest: THREE.Vector3 | undefined, distance = Infinity;
      for (const p of points) {
        if (p.z < middle.z + span.z * 0.18) continue;
        const d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d < distance) { nearest = p.world; distance = d; }
      }
      if (nearest) {
        // Leave a small gap at the outer jaw for the speaker's turn and the held-line motion.
        lowerFace.push(Math.abs(width) > 0.3
          ? new THREE.Vector3(Math.sign(width) * 0.024, -0.012, 0).applyMatrix3(headLinear).add(nearest) : nearest);
      }
    }
  }
  return {
    bounds, corners, middle: middle.clone().applyMatrix4(head.matrixWorld), crown, chin,
    forward: new THREE.Vector3(0, 0, 1).transformDirection(head.matrixWorld),
    vertices: points.map(({ world }) => world),
    landmarks: [front(0, 0.5), crown, chin, front(-0.5, 0.42), front(0.5, 0.42),
      front(-0.23, 0.57), front(0.23, 0.57), front(0, 0.76), front(0, 0.31)],
    cheeks: points.filter(({ y }) => y >= local.min.y + span.y * 0.32 && y <= local.min.y + span.y * 0.52).map(({ world }) => world),
    lowerFace,
  };
}

type MeshBounds = { mesh: Mesh; box: THREE.Box3; matrix: THREE.Matrix4; geometry: THREE.BufferGeometry; version: number; count: number };
class TalkMeshes {
  private bounds = new WeakMap<Mesh, MeshBounds>();
  private shapeBounds = new WeakMap<THREE.BufferGeometry, THREE.Box3>();
  private local: MeshBounds[] = [];
  private ranges = new TalkMeshRanges();
  private ray = new THREE.Raycaster();
  private up = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
  private down = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
  private hits: THREE.Intersection<Mesh>[] = [];
  private direction = new THREE.Vector3();
  private at = new THREE.Vector3();
  private matrix = new THREE.Matrix4();
  private instanceBox = new THREE.Box3();

  prepare(scene: THREE.Scene, speaker: THREE.Object3D, cam: THREE.Camera, region: THREE.Box3) {
    this.local.length = 0;
    this.ranges.fit++;
    this.ray.camera = cam;
    this.ray.layers.mask = cam.layers.mask;
    scene.traverseVisible((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh || !mesh.geometry.attributes.position || !cam.layers.test(mesh.layers) || within(mesh, speaker)) return;
      const { material } = mesh;
      if (!(Array.isArray(material) ? material.some(painted) : painted(material))) return;
      const instanced = (mesh as THREE.InstancedMesh).isInstancedMesh ? (mesh as THREE.InstancedMesh) : null;
      const version = instanced?.instanceMatrix.version ?? -1, count = instanced?.count ?? -1;
      let cached = this.bounds.get(mesh);
      if (!cached || cached.geometry !== mesh.geometry || cached.version !== version || cached.count !== count || !cached.matrix.equals(mesh.matrixWorld)) {
        const skin = (mesh as THREE.SkinnedMesh).isSkinnedMesh ? (mesh as THREE.SkinnedMesh) : null;
        const box = cached?.box ?? new THREE.Box3();
        if (instanced) {
          const shape = this.shapeBox(mesh.geometry);
          box.makeEmpty();
          for (let i = 0; i < instanced.count; i++) {
            instanced.getMatrixAt(i, this.matrix);
            box.union(this.instanceBox.copy(shape).applyMatrix4(this.matrix));
          }
        } else if (skin?.boundingBox) box.copy(skin.boundingBox);
        else if (skin?.boundingSphere) skin.boundingSphere.getBoundingBox(box);
        else box.copy(this.shapeBox(mesh.geometry));
        box.applyMatrix4(mesh.matrixWorld);
        cached = { mesh, box, matrix: (cached?.matrix ?? new THREE.Matrix4()).copy(mesh.matrixWorld), geometry: mesh.geometry, version, count };
        this.bounds.set(mesh, cached);
      }
      if (cached.box.intersectsBox(region)) this.local.push(cached);
    });
    return this.local.length;
  }

  private shapeBox(geometry: THREE.BufferGeometry) {
    let box = geometry.boundingBox ?? this.shapeBounds.get(geometry);
    if (!box) {
      const position = geometry.attributes.position;
      box = new THREE.Box3();
      for (let i = 0; i < position.count; i++) box.expandByPoint(this.at.fromBufferAttribute(position, i));
      this.shapeBounds.set(geometry, box);
    }
    return box;
  }

  /** Catch a lens at a pane or inside a solid. Merger bounds can span the whole room, so use the nearest surfaces. */
  lensBlocker(pos: THREE.Vector3, look: THREE.Vector3, stats: FitStats) {
    this.direction.subVectors(look, pos).normalize();
    this.at.copy(pos).addScaledVector(this.direction, -0.11);
    this.ray.set(this.at, this.direction);
    this.ray.far = 0.22;
    stats.rays++;
    let checkedUp = false, checkedDown = false;
    for (const { mesh, box } of this.local) {
      if (!this.inRange(box)) continue;
      if (this.hit(mesh)) return mesh;
      if (!box.containsPoint(pos) || mesh.raycast !== THREE.Mesh.prototype.raycast || Array.isArray(mesh.material)) continue;
      if (mesh.geometry.type === "BoxGeometry"
        && this.shapeBox(mesh.geometry).containsPoint(this.at.copy(pos).applyMatrix4(this.matrix.copy(mesh.matrixWorld).invert()))) return mesh;
      // Inside a closed surface, the first triangles above and below the lens both face outwards.
      if (!checkedUp) {
        this.up.origin.copy(pos);
        stats.rays++;
        checkedUp = true;
      }
      const solid = mesh as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
      if (this.ranges.hits(solid, this.up, 1.2, true)) {
        if (!checkedDown) {
          this.down.origin.copy(pos);
          stats.rays++;
          checkedDown = true;
        }
        if (this.ranges.hits(solid, this.down, 1.2, true)) return mesh;
      }
    }
    return null;
  }

  blocker(pos: THREE.Vector3, to: THREE.Vector3, stats: FitStats, fraction = 0.97) {
    const distance = this.direction.subVectors(to, pos).length();
    if (distance === 0) return null;
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
    return rayReaches(this.ray.ray, this.ray.far ** 2, box, this.at);
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

interface Candidate extends Shot {
  dx: number;
  dy: number;
  fov: number;
  kind: "normal" | "close" | "raised" | "front" | "counter" | "hint" | "composition";
  yaw: number;
  clearance: number;
  size: number;
  tall: number;
  angle: number;
  facing: number;
  shoulder: number;
  quality: number;
  penalty: number;
  safeLens: boolean;
  open: boolean;
  prior?: boolean;
}

function cylinder(character: GameCharacter, radius: number, height = character.height * 1.1): Body {
  const { x, y, z } = character.root.position;
  const scale = character.root.scale;
  return { x, y, z, top: y + height * scale.y, r: radius * Math.max(1, scale.x, scale.z) };
}

function inside(pos: THREE.Vector3, body: Body) {
  return pos.y > body.y - 0.05 && pos.y < body.top && (pos.x - body.x) ** 2 + (pos.z - body.z) ** 2 < body.r ** 2;
}

/** The closest horizontal point may be above a character. Check where the ray enters its height range too. */
function crossesBody(pos: THREE.Vector3, face: THREE.Vector3, body: Body, edge: THREE.Vector3) {
  if (covers(pos, face, body)) return true;
  const dy = face.y - pos.y;
  if (!dy) return false;
  const t = ((dy < 0 ? body.top - 0.0001 : body.y) - pos.y) / dy;
  return t > 0 && t < 0.97 && inside(edge.lerpVectors(pos, face, t), body);
}

const distanceToBand = (n: number, lo: number, hi: number) => Math.max(lo - n, n - hi, 0);
const boxGap = (a: Box, b: Box) => Math.max(a.x0 - b.x1, b.x0 - a.x1, a.y0 - b.y1, b.y0 - a.y1);

// Move the silhouette just far enough inside the opening. If it cannot fit, balance the overflow.
function insideShift(min: number, max: number, lo: number, hi: number) {
  const start = max - hi, end = min - lo;
  return start <= end ? THREE.MathUtils.clamp(0, start, end) : (start + end) / 2;
}

export class TalkFraming {
  private meshes = new TalkMeshes();

  fit(input: FitInput): Framing | null {
    const started = performance.now();
    const { speaker, learner, screen, lens, room, field, previous, presented, scene } = input;
    const { width: w, height: h, picture, obstacles } = screen;
    const feet = speaker.ch.root.position;
    scene.updateMatrixWorld(true);
    const head = posedHead(speaker.ch, lens.layers, !!room);
    if (!head) return null;

    const portrait = w < h && w < 768, desktop = w > 900;
    const minSize = portrait ? 6 : 8, maxSize = portrait ? 32 : 38;
    // An authored composition can trade some face size for scenery.
    const outsideSizeBand = (f: Candidate) => distanceToBand(f.size, f.kind === "composition" ? 6 : minSize, maxSize);
    const short = portrait && (picture.y1 - picture.y0) / screen.viewportHeight < 0.19;
    const preferred = short ? 10.5 : portrait ? 13 : 17;
    const aimX = w / 2 - screen.shiftX, aimY = h / 2 - screen.shiftY;
    const me = cylinder(learner, 0.34);
    const crowd = input.people.filter((ch) => ch !== speaker.ch && ch !== learner && ch.root.visible
      && ch.root.position.distanceToSquared(feet) < 14 ** 2).map((ch) => cylinder(ch, 0.28));
    const actor = cylinder(speaker.ch, 0.36);
    actor.top = head.bounds.max.y + 0.06;
    const front = new THREE.Vector3(me.x - feet.x, 0, me.z - feet.z);
    const authored = new THREE.Vector3(Math.sin(speaker.rot), 0, Math.cos(speaker.rot));
    if (front.lengthSq() < 0.01) front.copy(authored);
    front.normalize();
    const basis = speaker.sit ? authored : front;
    const turnsToLearner = !speaker.sit && feet.distanceToSquared(learner.root.position) < 7 ** 2;
    const counterApproach = room && turnsToLearner && front.dot(authored) > 0.85;
    const side = new THREE.Vector3(-basis.z, 0, basis.x);
    const toward = room ? Math.sign(-feet.x * side.x - feet.z * side.z) || 1 : 1;
    const focus = head.middle.clone().addScaledVector(front, Math.min(0.18, Math.hypot(me.x - feet.x, me.z - feet.z) * 0.05));
    focus.y -= 0.12;
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, lens.far);
    camera.layers.mask = lens.layers.mask;
    camera.zoom = lens.zoom;
    camera.filmGauge = lens.filmGauge;
    camera.filmOffset = lens.filmOffset;
    camera.up.copy(lens.up);
    const defaultFocal = h * camera.zoom / (2 * Math.tan(25 * RAD));
    const projection = new THREE.Matrix4();
    const projected = new THREE.Vector3(), offset = new THREE.Vector3(), edge = new THREE.Vector3();
    const legacyFace = feet.clone().add(new THREE.Vector3(0, (speaker.sit ? 0.72 : 0.9) * speaker.ch.height, 0));
    const legacyTop = feet.clone().add(new THREE.Vector3(0, speaker.ch.height, 0));
    const shoulder = learner.root.position.clone().add(new THREE.Vector3(0, learner.height * 0.72, 0));
    const candidates: Candidate[] = [];
    const stats: FitStats = { poses: 0, tested: 0, rays: 0, meshes: 0, ms: 0, screenMs: 0, prepareMs: 0, blocker: null };

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
    const roomForLens = (pos: THREE.Vector3) => (!room || (Math.abs(pos.x) <= room.w / 2 - 0.5 && pos.z >= -room.d / 2 + 0.5))
      && !field?.solidAt(pos.x, pos.y, pos.z, 0.06) && !head.bounds.containsPoint(pos)
      && !inside(pos, actor) && !inside(pos, me) && !crowd.some((body) => inside(pos, body));
    const placeLens = (f: Candidate) => {
      camera.position.copy(f.pos);
      camera.lookAt(f.look);
      camera.updateMatrixWorld();
      camera.fov = f.fov;
    };
    const measure = (f: Candidate, recenter: boolean) => {
      placeLens(f);
      if (recenter) {
        shift(0, 0);
        project(head.landmarks[0]);
        f.dx = projected.x - aimX;
        f.dy = projected.y - aimY;
      }
      shift(f.dx, f.dy);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      let depth = Infinity, spreadX = 0, spreadY = 0, inDepth = true;
      for (const corner of head.corners) {
        offset.copy(corner).applyMatrix4(camera.matrixWorldInverse);
        depth = Math.min(depth, -offset.z);
        spreadX = Math.max(spreadX, Math.abs(offset.x / offset.z));
        spreadY = Math.max(spreadY, Math.abs(offset.y / offset.z));
        inDepth = -offset.z >= camera.near && -offset.z <= camera.far && inDepth;
      }
      for (const vertex of head.vertices) {
        project(vertex);
        x0 = Math.min(x0, projected.x); x1 = Math.max(x1, projected.x);
        y0 = Math.min(y0, projected.y); y1 = Math.max(y1, projected.y);
      }
      const focal = camera.projectionMatrix.elements[5] * h / 2;
      const padX = SLACK * focal * (1 + spreadX) / Math.max(0.01, depth - SLACK);
      const padY = SLACK * focal * (1 + spreadY) / Math.max(0.01, depth - SLACK);
      x0 -= padX; x1 += padX; y0 -= padY; y1 += padY;
      if (recenter) {
        // Allow a small centering correction for the asymmetry of a turned head or a hat.
        let dx = THREE.MathUtils.clamp((x0 + x1) / 2 - aimX, -12, 12);
        let dy = THREE.MathUtils.clamp((y0 + y1) / 2 - aimY, -14, 14);
        dx += THREE.MathUtils.clamp(insideShift(x0 - dx, x1 - dx, picture.x0, picture.x1), -8, 8);
        dy += THREE.MathUtils.clamp(insideShift(y0 - dy, y1 - dy, picture.y0, picture.y1), -8, 8);
        f.dx += dx; f.dy += dy;
        x0 -= dx; x1 -= dx; y0 -= dy; y1 -= dy;
        shift(f.dx, f.dy);
      }
      const bounds = { x0, x1, y0, y1 };
      const margin = Math.min(x0 - picture.x0, picture.x1 - x1, y0 - picture.y0, picture.y1 - y1);
      f.clearance = obstacles.reduce((gap, box) => Math.min(gap, boxGap(bounds, box)), margin);
      inDepth = project(head.crown) && inDepth;
      const crown = projected.y;
      inDepth = project(head.chin) && inDepth;
      f.size = Math.abs(crown - projected.y) * 100 / screen.viewportHeight;
      const legacyVisible = project(legacyFace) && projected.x >= picture.x0 && projected.x <= picture.x1
        && projected.y >= picture.y0 && projected.y <= picture.y1;
      project(legacyTop);
      const top = projected.y;
      project(feet);
      f.tall = projected.y - top;
      f.shoulder = Number(project(shoulder) && projected.x > picture.x0 - 24 && projected.x < picture.x1 + 24
        && projected.y > picture.y0 && projected.y < picture.y1 + 48);
      offset.subVectors(f.pos, feet).setY(0).normalize();
      f.angle = Math.min(offset.dot(front), offset.dot(basis));
      offset.subVectors(f.pos, head.middle).normalize();
      f.facing = offset.dot(head.forward);
      // A standing speaker turns toward the learner while the shot is held. Rank for both ends of that turn.
      if (turnsToLearner) f.facing = Math.min(f.facing, offset.dot(front));
      f.safeLens = roomForLens(f.pos);
      const outsideBand = outsideSizeBand(f);
      f.penalty = (f.safeLens ? 0 : 350) + (inDepth ? 0 : 200) + (legacyVisible ? 0 : 15)
        + Math.max(0, -f.clearance) * 1.5 + outsideBand * 5 + Math.max(0, FRONT_LIMIT - f.angle) * 150;
      f.open = f.safeLens && inDepth && legacyVisible && f.angle >= FRONT_LIMIT && outsideBand === 0 && f.clearance >= -0.0001;
      f.quality = Math.min(f.clearance, 9) - Math.abs(f.size - preferred) * 1.7 + f.angle * 13 + f.facing * 3 + f.shoulder * 3
        - Math.max(0, FACE_PREFERENCE - f.facing) * 60
        - (desktop ? Math.max(0, 245 - f.tall) * 0.14 : 0);
    };
    const centre = feet.clone().setY(head.middle.y);
    const add = (pos: THREE.Vector3, look: THREE.Vector3, kind: Candidate["kind"], yaw: number, oldFov?: number) => {
      if (pos.distanceToSquared(centre) > input.max ** 2) return;
      const closeLens = kind !== "composition" && (short || kind !== "normal");
      const targetSize = short && kind === "counter" ? 10.1 : preferred;
      const pixels = screen.viewportHeight * targetSize / 100;
      const focal = pixels * pos.distanceTo(head.middle) / (head.crown.y - head.chin.y);
      const maxFov = portrait && (kind === "front" || kind === "close") ? 114 : short ? 94 : 80;
      const fov = oldFov ?? (closeLens ? THREE.MathUtils.clamp(2 * Math.atan(h * camera.zoom / (2 * focal)) / RAD, 50, maxFov) : 50);
      const f: Candidate = { pos, look, kind, yaw, prior: oldFov !== undefined, fov, dx: 0, dy: 0, clearance: 0, size: 0, tall: 0, angle: 0, facing: 0,
        shoulder: 0, quality: 0, penalty: 0, safeLens: false, open: false };
      stats.poses++;
      measure(f, kind !== "composition");
      candidates.push(f);
    };
    const pose = (yaw: number, distance: number, down: number, kind: Candidate["kind"] = "normal", axis = basis) => {
      const a = yaw * RAD;
      const forward = Math.cos(a) * distance, across = Math.sin(a) * distance;
      const pos = new THREE.Vector3(head.middle.x + axis.x * forward - axis.z * across,
        focus.y + Math.tan(down * RAD) * distance, head.middle.z + axis.z * forward + axis.x * across);
      add(pos, focus, kind, yaw);
    };
    const estimate = THREE.MathUtils.clamp((head.crown.y - head.chin.y) * defaultFocal / (screen.viewportHeight * preferred / 100), 2, input.max * 0.9);
    if (previous?.clear) add(previous.pos, previous.look, "normal", 0, previous.fov);
    for (const d of [2.4, 3.3, 4.4]) for (const a of d === 3.3 ? [36, 50, 66] : [36, 50, 66, 80]) {
      if (counterApproach && desktop && d === 4.4 && a === 80) continue;
      pose(a * toward, d, 15);
      pose(-a * toward, d, 15);
    }
    for (const d of [Math.abs(estimate - 3.3) < 0.25 ? 4.8 : estimate, 3.3]) for (const a of [0, 22 * toward, -22 * toward]) pose(a, d, 12);
    for (const s of [toward, -toward]) {
      pose(28 * s, 2.05, 13, "close");
      pose(78 * s, 1.8, 12, "close");
      if (counterApproach) {
        // Near the customer edge, look over a pane instead of along it. The authored axis keeps
        // the two approaches aligned with the counter as the learner moves sideways.
        if (portrait) pose(45 * s, 2.8, 23, "counter", authored);
        else pose(6 * s, 1.7, 29, "counter", authored);
        if (desktop) pose(26 * s, 3.3, 26, "raised");
      } else pose(84 * s, 2.1, 16, "close");
      pose(22 * s, 2.6, 28, "raised");
      pose(48 * s, Math.min(3.5, Math.max(2.45, estimate)), 27, "raised");
    }
    // A narrow opening may line up with the counter's authored front even as the learner steps to either side.
    const straight = feet.clone().addScaledVector(authored, 1.8);
    straight.y = focus.y + Math.tan(12 * RAD) * 1.8;
    add(straight, focus, "front", 0);
    pose(0, 2.45, 29, "raised");
    if (input.hint) add(input.hint, focus, "hint", 0);
    if (input.composition) add(input.composition.pos, input.composition.look, "composition", 0);
    if (!candidates.length) return null;

    const screenedAt = input.report ? performance.now() : 0;
    const region = head.bounds.clone();
    for (const f of candidates) if (f.safeLens) region.expandByPoint(f.pos);
    if (presented && region.distanceToPoint(presented.pos) < 0.4) region.expandByPoint(presented.pos);
    region.expandByScalar(0.22);
    stats.meshes = this.meshes.prepare(scene, speaker.ch.root, camera, region);
    if (input.report) {
      stats.screenMs = screenedAt - started;
      stats.prepareMs = performance.now() - screenedAt;
    }

    const blocked = (f: Candidate) => {
      // The old standing-body check also guards the learner's profile as they finish turning at a walk-up.
      const rightX = f.pos.z - legacyFace.z, rightZ = legacyFace.x - f.pos.x;
      const len = Math.hypot(rightX, rightZ) || 1;
      for (const s of [-0.2, 0, 0.2]) for (const lift of [-0.2, 0, 0.12]) {
        offset.set(legacyFace.x + s * rightX / len, legacyFace.y + lift, legacyFace.z + s * rightZ / len);
        if (crossesBody(f.pos, offset, me, edge)) return true;
      }
      for (const point of head.landmarks) {
        if (crossesBody(f.pos, point, me, edge) || crowd.some((body) => crossesBody(f.pos, point, body, edge))) return true;
      }
      return false;
    };
    const geometry = (f: Candidate) => {
      stats.tested++;
      const lensHit = this.meshes.lensBlocker(f.pos, f.look, stats);
      if (lensHit) {
        f.safeLens = false;
        f.penalty += 350;
        return lensHit;
      }
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
      return null;
    };
    const byFacing = (a: Candidate, b: Candidate) => Number(b.facing >= FACE_PREFERENCE) - Number(a.facing >= FACE_PREFERENCE);
    const compare = (a: Candidate, b: Candidate) => a.penalty - b.penalty || byFacing(a, b) || b.quality - a.quality;
    for (const f of candidates) if (f.safeLens && blocked(f)) { f.open = false; f.penalty += 90; }
    candidates.sort(compare);
    const open = candidates.filter((f) => f.open);
    // Keep ray slots for the front, a close diagonal and a raised view even when the shoulders rank higher.
    const shortlist = new Set<Candidate>();
    const best = (select: (f: Candidate) => boolean) => {
      if (shortlist.size >= MAX_RAY_POSES) return;
      const f = open.find((f) => !shortlist.has(f) && select(f));
      if (f) shortlist.add(f);
      return f;
    };
    best((f) => f.kind === "composition");
    best((f) => !!f.prior && f.facing >= FACE_PREFERENCE);
    best((f) => f.kind === "hint");
    const first = best((f) => f.kind === "normal" && !f.prior);
    best((f) => f.kind === "normal" && Math.sign(f.yaw) === -Math.sign(first?.yaw ?? 0));
    const shoulderView = counterApproach && desktop && best((f) => f.kind === "raised" && f.shoulder > 0 && f.facing >= FACE_PREFERENCE);
    if (shoulderView) best((f) => f.kind === "raised" && f.shoulder > 0 && f.facing >= FACE_PREFERENCE
      && f.yaw * shoulderView.yaw < 0);
    best((f) => f.kind === "counter");
    best((f) => f.kind === "counter" && f.facing >= FACE_PREFERENCE);
    best((f) => f.kind === "front");
    best((f) => f.kind === "close" && Math.abs(f.yaw) < 45);
    if (!shoulderView) best((f) => f.kind === "raised");
    if (shortlist.size < MAX_RAY_POSES - 1) best((f) => f.kind === "close");
    if (shortlist.size < MAX_RAY_POSES) best((f) => f.kind === "normal" && Math.abs(f.yaw) >= 65);
    for (const f of open) if (shortlist.size < MAX_RAY_POSES - 1) shortlist.add(f);
    const retry = candidates.find((f) => f.safeLens && !f.open && f.penalty < 90);
    if (shortlist.size < MAX_RAY_POSES && retry) shortlist.add(retry);

    let chosen: Candidate | undefined, fallback: Candidate | undefined;
    let obstruction: Mesh | undefined;
    for (const f of shortlist) {
      placeLens(f);
      shift(f.dx, f.dy);
      const hit = geometry(f);
      if (hit) {
        if (!fallback || compare(f, fallback) < 0) { obstruction = hit; fallback = f; }
        continue;
      }
      if (!f.open) { fallback = f; obstruction = undefined; continue; }
      if (f.kind === "composition") { chosen = f; break; }
      if (!chosen || byFacing(f, chosen) < 0 || (byFacing(f, chosen) === 0 && f.quality > chosen.quality && !(chosen.prior && f.clearance - chosen.clearance <= 2
        && Math.abs(f.size - chosen.size) < 3 && Math.abs(f.angle - chosen.angle) < 0.2
        && f.facing - chosen.facing < 0.12))) chosen = f;
      // Use the padded opening even when trading a little size for a clear view over a counter.
      const counter = f.kind === "counter", hinted = f.kind === "hint";
      const preferredSize = hinted || distanceToBand(f.size, short && counter ? 8 : portrait ? 10 : 13, portrait ? 15 : 20) === 0;
      if (f.clearance >= (hinted || counter ? 5 : 7) && preferredSize && f.angle > 0.55
        && f.facing >= FACE_PREFERENCE && (!desktop || f.tall >= 230)) break;
    }
    const f = chosen ?? fallback ?? candidates[0];
    const result: Framing = { pos: f.pos, look: f.look, dx: f.dx, dy: f.dy, fov: f.fov, clear: !!chosen, blend: false };

    // The live lens and the midpoint must both keep the incoming face clear before a visible move.
    const sample = (pos: THREE.Vector3, look: THREE.Vector3, fov = f.fov, dx = f.dx, dy = f.dy) => {
      const between = { ...f, pos, look, fov, dx, dy };
      measure(between, false);
      return between.open && !blocked(between) && !geometry(between);
    };
    const view = lens.view?.enabled ? lens.view : null;
    const sameCanvas = lens.aspect === w / h && (!view || (view.fullWidth === w && view.fullHeight === h && view.width === w && view.height === h));
    if (chosen && f.kind !== "composition" && presented && presented.pos.distanceTo(f.pos) <= 0.32 && presented.look.distanceTo(f.look) <= 0.36
      && offset.subVectors(presented.look, presented.pos).angleTo(edge.subVectors(f.look, f.pos)) <= 8 * RAD
      && sameCanvas && lens.near === 0.1 && stats.tested <= MAX_RAY_POSES - 2) {
      const dx = (view?.offsetX ?? 0) - screen.shiftX, dy = (view?.offsetY ?? 0) - screen.shiftY;
      result.blend = this.meshes.travelClear(presented.pos, f.pos, stats)
        && sample(presented.pos, presented.look, lens.fov, dx, dy)
        && camera.quaternion.angleTo(lens.quaternion) < 0.0001
        && sample(presented.pos.clone().lerp(f.pos, 0.5), presented.look.clone().lerp(f.look, 0.5),
          (lens.fov + f.fov) / 2, (dx + f.dx) / 2, (dy + f.dy) / 2);
    }
    if (input.allowNear !== false && chosen && f.kind !== "composition" && !result.blend && f.clearance >= 7 && stats.tested <= MAX_RAY_POSES - 2) {
      const near = f.pos.clone().lerp(f.look, 0.06);
      if (this.meshes.travelClear(f.pos, near, stats) && sample(f.pos.clone().lerp(near, 0.5), f.look) && sample(near, f.look)) result.near = near;
    }
    if (input.report) {
      stats.blocker = chosen ? null : obstruction?.name || (obstruction ? obstruction.geometry.type :
        !f.safeLens ? "lens is outside the room or inside a solid" :
        f.angle < FRONT_LIMIT ? "camera is behind the conversational front" :
        f.clearance < 0 ? "head silhouette intersects the opening margin" :
        outsideSizeBand(f) ? "face size is outside the band" : "face depth or body clearance");
      stats.ms = performance.now() - started;
      input.report(stats);
    }
    return result;
  }
}

const MOVE_SECONDS = 0.4;

/** Owns the measured shot and its presentation for one conversation run. */
export class TalkPresentation {
  layout: TalkLayout | null = null;
  private readonly watch: ReturnType<typeof watchTalkLayout>;
  private readonly framing = new TalkFraming();
  private readonly views = new Map<Actor, Framing>();
  private shot?: Framing;
  private elapsed = MOVE_SECONDS;
  private readonly from = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 0, x: 0, y: 0 };
  private readonly to = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 0, x: 0, y: 0 };
  private readonly motion = typeof matchMedia === "undefined" ? undefined : matchMedia("(prefers-reduced-motion: reduce)");

  constructor(canvas: HTMLCanvasElement, private readonly rig: CameraRig, private speaker: Actor,
    private readonly valid: () => boolean, hasArt: boolean,
    private readonly inputs: () => Omit<FitInput, "speaker" | "lens" | "screen" | "presented" | "previous">,
    private readonly covered: () => boolean) {
    this.watch = watchTalkLayout(canvas, valid, hasArt, (layout) => {
      this.layout = layout;
      this.views.clear();
      this.fit();
    });
  }

  get reducedMotion() { return this.motion?.matches ?? false; }
  resize() { this.watch.dirty(); }
  dispose() {
    this.watch.dispose();
    this.elapsed = MOVE_SECONDS;
  }

  aim(speaker: Actor) {
    if (this.speaker === speaker) return;
    this.speaker = speaker;
    const last = this.shot;
    this.watch.flush();
    if (this.shot === last) this.fit(this.views.get(speaker) ?? last);
  }

  private fit(previous?: Framing) {
    const { layout, rig, speaker } = this;
    if (!layout || !this.valid()) return;
    const cam = rig.cam;
    const animate = !this.covered() && !this.reducedMotion;
    const opening = !this.shot;
    const presented = animate ? { pos: cam.position, look: rig.presentedLook } : undefined;
    const shot = this.framing.fit({ ...this.inputs(), speaker, lens: cam, screen: layout, previous, presented, allowNear: opening });
    if (!shot) return;
    this.shot = shot;
    this.views.set(speaker, shot);

    const glide = animate && shot.blend;
    const near = opening ? shot.near : undefined;
    const x = layout.shiftX + shot.dx, y = layout.shiftY + shot.dy;
    this.to.pos.copy(near ?? shot.pos);
    this.to.look.copy(shot.look);
    this.to.fov = shot.fov;
    this.to.x = x;
    this.to.y = y;
    this.from.pos.copy(glide ? cam.position : shot.pos);
    this.from.look.copy(glide ? rig.presentedLook : shot.look);
    this.from.fov = glide ? cam.fov : shot.fov;
    const view = cam.view?.enabled ? cam.view : null;
    this.from.x = glide ? view?.offsetX ?? 0 : x;
    this.from.y = glide ? view?.offsetY ?? 0 : y;

    // If walking-to-talk travel is unsafe, the first frame uses the measured home.
    // A separately checked push-in from that home can still play in the opening.
    this.elapsed = glide || (animate && near) ? 0 : MOVE_SECONDS;
    rig.talk = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: shot.fov };
    this.place(this.elapsed ? 1 : 0);
    cam.position.copy(rig.talk.pos);
    cam.lookAt(rig.talk.look);
    cam.updateMatrixWorld();
  }

  update(dt: number) {
    this.watch.flush();
    if (this.elapsed >= MOVE_SECONDS || !this.layout || !this.valid()) return;
    this.elapsed = this.reducedMotion ? MOVE_SECONDS : Math.min(MOVE_SECONDS, this.elapsed + dt);
    const t = this.elapsed / MOVE_SECONDS;
    this.place(t * t * (3 - 2 * t));
  }

  private place(t: number) {
    const { from, to, rig } = this, { width, height } = this.layout!, target = rig.talk!;
    const cam = rig.cam;
    // Copy the endpoint exactly and keep the look reference and lens stable during the hold.
    if (t === 1) {
      target.pos.copy(to.pos);
      target.look.copy(to.look);
      target.fov = to.fov;
    } else {
      target.pos.lerpVectors(from.pos, to.pos, t);
      target.look.lerpVectors(from.look, to.look, t);
      target.fov = THREE.MathUtils.lerp(from.fov, to.fov, t);
    }
    const x = t === 1 ? to.x : THREE.MathUtils.lerp(from.x, to.x, t);
    const y = t === 1 ? to.y : THREE.MathUtils.lerp(from.y, to.y, t);
    const lensChanged = cam.fov !== target.fov || cam.near !== 0.1;
    cam.fov = target.fov;
    cam.near = 0.1;
    const view = cam.view;
    if (!view?.enabled || view.fullWidth !== width || view.fullHeight !== height || view.width !== width || view.height !== height
      || view.offsetX !== x || view.offsetY !== y || cam.aspect !== width / height) {
      cam.setViewOffset(width, height, x, y, width, height);
    } else if (lensChanged) cam.updateProjectionMatrix();
    // The rig still owns the live camera and the return to walking. Apply the already-eased pose once.
    rig.snap();
  }
}
