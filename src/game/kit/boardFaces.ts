import { Matrix4, Vector4, type Camera } from "three";

export const FACE_WIDTH = 128;
export const FACE_SIZES = { road: [3.52, 1.56, 0.47], sea: [6.144, 2.346, 0.25] } as const;
export type FaceMode = keyof typeof FACE_SIZES;
export const faceHeight = (mode: FaceMode) => FACE_WIDTH * FACE_SIZES[mode][1] / FACE_SIZES[mode][0];
export const WIDE_BOARD_VIEW = 900;
export const BOARD_FONT = "Nunito";
export const preloadBoardFont = (options: readonly string[]) =>
  globalThis.document?.fonts?.load(`800 32px "${BOARD_FONT}"`, options.join(" ")).catch(() => []);

let nextId = 0;
export const boardId = () => ++nextId;

export type BoardFace = { lane: number; world: Matrix4; opacity: number; interactive?: boolean };

const probes = [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5]];
const clip = new Vector4();
const toClip = new Matrix4();
const plane = new Matrix4();

/** Project the design rectangle by composing its plane with the render camera and CSS viewport. */
export function projectFace(mode: FaceMode, face: BoardFace, viewProjection: Matrix4, width: number, height: number) {
  const [w, h, z] = FACE_SIZES[mode];
  plane.set(w / FACE_WIDTH, 0, 0, -w / 2, 0, -h / faceHeight(mode), 0, h / 2, 0, 0, 1, z, 0, 0, 0, 1);
  const m = toClip.multiplyMatrices(viewProjection, face.world).multiply(plane).elements;
  const points = [];
  for (const [u, v] of probes) {
    clip.set(u * FACE_WIDTH, v * faceHeight(mode), 0, 1).applyMatrix4(toClip);
    if (clip.w <= 0 || clip.z < -clip.w || clip.z >= clip.w) return;
    points.push({ x: (1 + clip.x / clip.w) * width / 2, y: (1 - clip.y / clip.w) * height / 2 });
  }
  const xs = points.map(({ x }) => x), ys = points.map(({ y }) => y);
  if (Math.max(...xs) <= 0 || Math.min(...xs) >= width || Math.max(...ys) <= 0 || Math.min(...ys) >= height) return;
  // CSS divides by the same W as WebGL. Normalize by the top left W to keep coefficients small.
  const column = (i: number) => [(m[i] + m[i + 3]) * width / (2 * m[15]),
    (m[i + 3] - m[i + 1]) * height / (2 * m[15]), 0, m[i + 3] / m[15]];
  return { points, transform: `matrix3d(${[...column(0), ...column(4), 0, 0, 1, 0, ...column(12)].join(",")})` };
}

type Pose = { transform: string; opacity: number; interactive: boolean };

class BoardFaces {
  private nodes = new Map<number, Map<number, HTMLElement>>();
  private poses = new Map<number, Pose>();
  private id?: number;
  private viewProjection = new Matrix4();
  private projection = new Matrix4();
  private view = new Matrix4();
  private faces: readonly BoardFace[] = [];
  private width = 0;
  private height = 0;
  serial = 0;
  top = Infinity;

  constructor(private mode: FaceMode) {}

  private apply(node: HTMLElement, pose?: Pose) {
    node.style.visibility = pose ? "visible" : "hidden";
    node.style.pointerEvents = pose?.interactive ? "auto" : "none";
    node.style.opacity = String(pose?.opacity ?? 0);
    if (pose) node.style.transform = pose.transform;
    if (node instanceof HTMLButtonElement) node.disabled = !pose?.interactive;
  }

  register(id: number, lane: number, node: HTMLElement | null) {
    if (!node) {
      const lanes = this.nodes.get(id);
      lanes?.delete(lane);
      if (!lanes?.size) this.nodes.delete(id);
      return;
    }
    let lanes = this.nodes.get(id);
    if (!lanes) this.nodes.set(id, lanes = new Map());
    lanes.set(lane, node);
    this.apply(node, this.id === id ? this.poses.get(lane) : undefined);
  }

  draw(camera: Camera, width: number, height: number, id?: number, faces: readonly BoardFace[] = []) {
    this.serial++;
    this.id = id;
    this.width = width;
    this.height = height;
    this.faces = faces;
    this.projection.copy(camera.projectionMatrix);
    this.view.copy(camera.matrixWorldInverse);
    this.viewProjection.multiplyMatrices(this.projection, this.view);
    this.poses.clear();
    this.top = Infinity;
    for (const face of faces) {
      const projected = projectFace(this.mode, face, this.viewProjection, width, height);
      if (face.opacity > 0 && projected) {
        for (const point of projected.points) this.top = Math.min(this.top, point.y);
        this.poses.set(face.lane, { transform: projected.transform, opacity: face.opacity, interactive: !!face.interactive });
      }
    }
    for (const [key, lanes] of this.nodes) {
      for (const [lane, node] of lanes) this.apply(node, key === id ? this.poses.get(lane) : undefined);
    }
  }

  debug() {
    return { renderSerial: this.serial, gateId: this.id, width: this.width, height: this.height,
      view: this.view.toArray(), projection: this.projection.toArray(), faceSize: FACE_SIZES[this.mode],
      boards: this.faces.map(({ lane, world, opacity }) => ({ lane, world: world.toArray(), opacity, visible: this.poses.has(lane) })) };
  }
}

export const boardFaces = { road: new BoardFaces("road"), sea: new BoardFaces("sea") };
