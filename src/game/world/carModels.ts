// Each entry maps a GLB's centred, ground-level mesh (+Z forward) to a collision box in town metres.
// Apply the same heading to the box, the climbable surfaces and the instance returned by loadCarModel.
import type { ColorRepresentation, Group, Object3D } from "three";
import type { Piece } from "../ledges";

const WHEELS = ["wheel-front-left", "wheel-front-right", "wheel-back-left", "wheel-back-right"] as const;
type Scale = readonly [x: number, y: number, z: number];
type Surface = readonly [startZ: number, endZ: number, width: number, top: number];

function entry(
  file: string, scale: Scale, source: readonly [width: number, minZ: number, maxZ: number, height: number],
  bodyTop: number, surfaces: readonly Surface[], paintColumn?: number, roof = true,
) {
  const [width, minZ, maxZ, height] = source;
  return {
    file, scale, sourceCenterZ: (minZ + maxZ) / 2, wheelNodes: WHEELS,
    // A roof over the seats (the kit's windows are opaque): whoever sits in it is not drawn, or their head and
    // backpack would stick out through it. An open model (none yet) keeps its driver and passengers in sight.
    roof,
    collisionBox: { width: width * scale[0], length: (maxZ - minZ) * scale[2], height: height * scale[1] },
    // Kenney's shaded body-paint swatch (rows 4–7 in the palette).
    paintColumn, surfaces: [[minZ, maxZ, width, bodyTop] as Surface, ...surfaces],
  };
}

export const CAR_MODELS = {
  sedan: entry("sedan.glb", [1.34, 1.2, 1.67], [1.5, -1.3, 1.25, 1.3], 0.75, [
    [-0.6, 0.3, 1.18, 1.12], [-0.51, 0.15, 1.1, 1.3],
  ], 13),
  suv: entry("suv.glb", [1.34, 1.29, 1.67], [1.5, -1.35, 1.35, 1.3], 0.79, [
    [-1.17, 0.59, 1.22, 1.03], [-0.92, 0.39, 1.15, 1.3],
  ], 7),
  van: entry("van.glb", [1.34, 1.25, 1.57], [1.5, -1.4, 1.35, 1.35], 0.74, [
    [-1.31, 0.81, 1.26, 1.03], [-1.13, 0.63, 1.19, 1.3], [-0.93, 0.5, 0.75, 1.35],
  ], 15),
  pickup: entry("truck.glb", [1.34, 1.24, 1.49], [1.5, -1.5, 1.45, 1.3], 0.72, [
    [-0.23, 0.7, 1.2, 1.05], [-0.04, 0.37, 1.1, 1.3],
  ], 7),
  delivery: entry("delivery.glb", [1.38, 1.29, 1.45], [1.5, -1.65, 1.6, 1.65], 0.75, [
    [0.41, 1.06, 1.21, 1.3], [-1.6, 0.44, 1.35, 1.6], [-1.05, -0.65, 0.55, 1.65],
  ], 7),
  taxi: entry("taxi.glb", [1.34, 1.2, 1.6], [1.5, -1.4, 1.35, 1.5], 0.75, [
    [-0.73, 0.48, 1.18, 1.1], [-0.62, 0.25, 1.1, 1.3], [-0.43, 0.05, 0.3, 1.5],
  ], 9),
  police: entry("police.glb", [1.34, 1.25, 1.5], [1.5, -1.55, 1.55, 1.3], 0.77, [
    [-0.83, 0.6, 1.2, 1.04], [-0.63, 0.32, 1.1, 1.2], [-0.04, 0.23, 0.78, 1.3],
  ]),
  ambulance: entry("ambulance.glb", [1.4, 1.32, 1.55], [1.5, -1.65, 1.6, 1.8], 0.75, [
    [0.44, 1.06, 1.21, 1.3], [-1.61, 0.44, 1.36, 1.6], [-1.24, 0.08, 1.15, 1.8],
  ]),
  firetruck: entry("firetruck.glb", [1.43, 1.36, 1.58], [1.5, -1.7, 1.7, 1.7], 0.89, [
    [0.35, 1.42, 1.25, 1.5], [-1.62, 0.34, 1.34, 1.7], [0.93, 1.19, 0.85, 1.6],
  ]),
  garbage: entry("garbage-truck.glb", [1.4, 1.39, 1.59], [1.6, -1.7, 1.75, 1.6], 0.74, [
    [-1.48, -1.08, 1.25, 0.94], [0.9, 1.16, 1.21, 1.08], [-0.96, 0.98, 1.24, 1.4], [-0.62, 0.45, 1.04, 1.6],
  ]),
};

export type CarModelName = keyof typeof CAR_MODELS;
export type CarModelEntry = ReturnType<typeof entry>;
export type CarPaint = ColorRepresentation | { body: ColorRepresentation; trim: ColorRepresentation };
export interface CarPlacement { model: CarModelName; x: number; z: number; rot: number; color: string; trim?: string }
export interface CarModel {
  readonly entry: CarModelEntry;
  /** A new poseable group. Its geometries and material are shared. */
  createInstance(paint?: CarPaint): Group;
}

export function carModelEntry(name: CarModelName): CarModelEntry { return CAR_MODELS[name]; }

/** Whether the people in a car are under a roof and out of sight. A car without a model is a convertible
 *  (rides/shapes.ts): its people sit in the open. */
export function carHasRoof(name: CarModelName | undefined) { return !!name && CAR_MODELS[name].roof; }

export type ExteriorCarModels = ReadonlyMap<CarModelName, CarModel>;

const pending = new Map<CarModelName, Promise<CarModel>>();
const loaded = new Map<CarModelName, CarModel>();

function loadFromChunk(name: CarModelName) {
  return import("./carModelLoader").then(({ load }) => load(name));
}

export function loadCarModel(name: CarModelName): Promise<CarModel> {
  return cacheCarModel(name, loadFromChunk);
}

export function cacheCarModel(name: CarModelName, load: typeof loadFromChunk): Promise<CarModel> {
  let request = pending.get(name);
  if (!request) {
    request = load(name).then((model) => {
      loaded.set(name, model);
      return model;
    }).catch((error) => {
      pending.delete(name);
      throw error;
    });
    pending.set(name, request);
  }
  return request;
}

export function isCarModelLoaded(name: CarModelName) { return loaded.has(name); }
export function loadedCarModelCount() { return loaded.size; }

export function spinCarWheels(mesh: Object3D, model: CarModelEntry, distance: number) {
  if (distance === 0) return;
  const radians = distance / (0.3 * model.scale[2]);
  for (const name of model.wheelNodes) mesh.getObjectByName(name)?.rotateX(radians);
}

/** The town's collision system uses axis-aligned boxes. */
function bounds(x: number, z: number, rot: number, width: number, length: number) {
  const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot));
  const hx = (c * width + s * length) / 2, hz = (s * width + c * length) / 2;
  return { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz };
}

export function carTop(x: number, z: number, rot: number, start: number, end: number, width: number, top: number): Piece {
  const offset = (start + end) / 2;
  return { ...bounds(x + Math.sin(rot) * offset, z + Math.cos(rot) * offset, rot, width, end - start), top };
}

export function carFootprint({ model, x, z, rot }: Pick<CarPlacement, "model" | "x" | "z" | "rot">) {
  const { width, length } = carModelEntry(model).collisionBox;
  return bounds(x, z, rot, width, length);
}

/** Solid steps with tops at the hood, trunk and roof, measured on the unscaled kit meshes. */
export function carLedges(model: CarModelName, x: number, z: number, rot: number): Piece[] {
  const { surfaces, scale: [sx, sy, sz], sourceCenterZ } = carModelEntry(model);
  return surfaces.map(([start, end, width, top]) =>
    carTop(x, z, rot, (start - sourceCenterZ) * sz, (end - sourceCenterZ) * sz, width * sx, top * sy));
}
