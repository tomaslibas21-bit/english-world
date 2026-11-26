import * as THREE from "three";
import { Dog } from "../dog";
import { vertexColorMaterial } from "../style";
import { colourMerge } from "../world/util";
import type { StreetProp } from "./types";
import { guitarFinishParts, walletFinishParts } from "./finishes";

type Part = [THREE.BufferGeometry, THREE.ColorRepresentation];
const wood = "#a96f43", dark = "#344048", paper = "#fcf0d8", red = "#c65e4d", green = "#548865";
const metal = "#a9b8bd";
const box = (w: number, h: number, d: number, color: string, x = 0, y = 0, z = 0): Part =>
  [new THREE.BoxGeometry(w, h, d).translate(x, y, z), color];
const ball = (r: number, color: string, x = 0, y = 0, z = 0): Part =>
  [new THREE.IcosahedronGeometry(r, 1).translate(x, y, z), color];
const cylinder = (top: number, bottom: number, h: number, color: string, y = 0): Part =>
  [new THREE.CylinderGeometry(top, bottom, h, 8).translate(0, y, 0), color];
const ring = (r: number, width: number, color: string, x = 0, y = 0): Part =>
  [new THREE.TorusGeometry(r, width, 5, 14).translate(x, y, 0), color];

function stick(from: number[], to: number[], radius: number, color: string): Part {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const delta = b.clone().sub(a);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
  const mid = a.lerp(b, 0.5);
  return [new THREE.CylinderGeometry(radius, radius, delta.length(), 5).applyQuaternion(q).translate(mid.x, mid.y, mid.z), color];
}

let material: THREE.Material | undefined;
const mesh = (parts: Part[]) => new THREE.Mesh(colourMerge(parts), material ??= vertexColorMaterial("prop"));
const catalog = {
  guitar: () => guitar(1),
  small_guitar: () => guitar(0.73),
  cart: (kind) => [
    box(0.95, 0.42, 0.56, green, 0, 0.49), box(1.05, 0.08, 0.65, paper, 0, 0.74),
    ring(0.17, 0.045, dark, -0.33, 0.18), ring(0.17, 0.045, dark, 0.33, 0.18),
    box(0.035, 0.56, 0.035, dark, -0.39, 1.03), box(0.035, 0.56, 0.035, dark, 0.39, 1.03),
    box(1.15, 0.09, 0.73, red, 0, 1.33),
    ...(kind === "cider" ? [cylinder(0.09, 0.1, 0.22, wood, 0.9)] : [ring(0.07, 0.018, wood, 0, 0.88)]),
  ],
  dog: () => [],
  easel: (kind) => [
    stick([-0.34, 0, 0.06], [-0.15, 1.5, 0], 0.027, wood),
    stick([0.34, 0, 0.06], [0.15, 1.5, 0], 0.027, wood),
    stick([0, 0, -0.48], [0, 1.45, 0], 0.023, wood),
    box(0.65, 0.55, 0.05, paper, 0, 1.09, 0.045), box(0.57, 0.18, 0.01, "#70afc0", 0, 0.97, 0.075),
    kind === "boats" ? box(0.29, 0.055, 0.012, red, 0.03, 1.04, 0.086) : box(0.09, 0.27, 0.012, red, 0.07, 1.15, 0.086),
  ],
  kite: (kind) => {
    const shape = new THREE.Shape().moveTo(0, 0.45).lineTo(-0.32, 0.08).lineTo(0, -0.5).lineTo(0.32, 0.08).closePath();
    return [[new THREE.ExtrudeGeometry(shape, { depth: 0.015, bevelEnabled: false }), colorOf(kind, red)],
      stick([0, 0.44, 0.025], [0, -0.57, 0.025], 0.018, paper),
      stick([0, -0.49, 0], [0.16, -0.95, 0], 0.018, dark)];
  },
  water_bottle: () => [cylinder(0.09, 0.09, 0.28, "#7cc2cf"), cylinder(0.046, 0.063, 0.07, dark, 0.17)],
  mailbag: () => [box(0.35, 0.32, 0.15, wood), box(0.36, 0.15, 0.025, "#d39955", 0, 0.08, 0.087), ring(0.15, 0.021, dark, 0, 0.19)],
  package: () => packageBox(0.36, 0.25, 0.28, wood),
  fishing_rod: () => [
    stick([-0.15, 0, 0], [1.15, 0.55, 0], 0.018, dark), stick([1.15, 0.55, 0], [1.55, 0.58, 0], 0.012, dark),
    stick([1.55, 0.58, 0], [1.55, -0.82, 0], 0.004, paper), ball(0.028, red, 1.55, -0.82), ring(0.065, 0.022, metal, 0.1, -0.02),
  ],
  fish_bucket: () => [cylinder(0.19, 0.14, 0.28, "#538c9c", 0.14), cylinder(0.17, 0.17, 0.026, "#36687e", 0.27), ring(0.171, 0.016, metal, 0, 0.31)],
  net: () => [ring(0.27, 0.022, wood, 0.2, 0.26), stick([-0.52, -0.42, 0], [0.02, 0.09, 0], 0.024, wood),
    stick([-0.02, 0.26, 0], [0.43, 0.26, 0], 0.009, paper), stick([0.2, 0, 0], [0.2, 0.5, 0], 0.009, paper)],
  bread_bag: () => [...bag(), stick([-0.07, 0.04, 0], [0.07, 0.4, 0], 0.049, "#d69d51")],
  skateboard: () => [box(0.78, 0.05, 0.22, wood, 0, 0.13), box(0.7, 0.012, 0.21, dark, 0, 0.16),
    ...[-0.26, 0.26].flatMap((x) => [-0.11, 0.11].map((z) => ball(0.056, red, x, 0.06, z)))],
  hammocks: () => [stick([-0.72, 0, 0], [-0.72, 1.04, 0], 0.035, wood), stick([0.72, 0, 0], [0.72, 1.04, 0], 0.035, wood),
    stick([-0.72, 0.96, 0], [-0.28, 0.56, 0], 0.03, paper), box(0.57, 0.06, 0.45, red, 0, 0.56),
    stick([0.72, 0.96, 0], [0.28, 0.56, 0], 0.03, paper)],
  chair_fan: () => [box(0.48, 0.1, 0.49, wood, 0, 0.43), box(0.48, 0.47, 0.08, wood, 0, 0.68, -0.24),
    ...[-0.19, 0.19].flatMap((x) => [-0.19, 0.19].map((z) => box(0.055, 0.42, 0.055, wood, x, 0.21, z))),
    ring(0.21, 0.02, metal, 0, 0.75), ball(0.11, "#83bcbf", 0, 0.75)],
  watering_can: () => [cylinder(0.14, 0.17, 0.23, green), ring(0.12, 0.02, green, -0.13, 0.01),
    stick([0.12, -0.035, 0], [0.34, 0.16, 0], 0.029, green), ball(0.043, metal, 0.34, 0.16)],
  coconuts: () => [ball(0.13, wood, -0.13, 0.01), ball(0.14, "#82964c", 0.1, 0.03), ball(0.075, paper, -0.13, 0.1)],
  shoeshine_box: () => [...packageBox(0.55, 0.32, 0.38, wood), box(0.32, 0.09, 0.2, dark, 0, 0.2)],
  wallet: () => [box(0.22, 0.065, 0.14, "#74483d"), box(0.21, 0.012, 0.126, "#ac6a53", 0, 0.036), box(0.09, 0.025, 0.055, paper, 0.035, 0.008, 0.044), ...walletFinishParts()],
  keys: () => [ring(0.052, 0.013, metal, -0.07), box(0.15, 0.04, 0.032, "#ceb471"),
    box(0.043, 0.046, 0.076, "#ceb471", 0.055, 0, 0.023)],
  glove: () => [box(0.16, 0.052, 0.14, red), box(0.065, 0.045, 0.18, red, 0.07),
    box(0.06, 0.056, 0.11, dark, -0.105), box(0.075, 0.045, 0.06, red, 0.002, 0, 0.084)],
  sunglasses: () => [box(0.088, 0.052, 0.028, dark, -0.058), box(0.088, 0.052, 0.028, dark, 0.058),
    box(0.045, 0.012, 0.024, wood), box(0.012, 0.014, 0.11, wood, -0.095, 0, -0.05),
    box(0.012, 0.014, 0.11, wood, 0.095, 0, -0.05)],
  map: () => [box(0.37, 0.19, 0.018, paper), stick([-0.17, -0.06, 0.013], [0.15, 0.07, 0.013], 0.013, green), box(0.04, 0.13, 0.01, "#71a8c0", 0.04, 0, 0.014)],
  phone: () => screen(0.094, 0.17),
  guidebook: () => [box(0.17, 0.24, 0.047, green), box(0.15, 0.22, 0.024, paper, 0.015), box(0.1, 0.045, 0.012, paper, 0, 0.06, 0.025)],
  camera: () => [box(0.25, 0.145, 0.11, dark), [new THREE.CylinderGeometry(0.051, 0.058, 0.085, 8).rotateX(Math.PI / 2).translate(0, 0, 0.082), metal], box(0.065, 0.036, 0.035, metal, 0.072, 0.086)],
  tablet: () => screen(0.25, 0.33),
  fruit: () => bag(),
  hat: (kind) => [cylinder(0.24, 0.25, 0.037, colorOf(kind, wood), 0.04), cylinder(0.118, 0.15, 0.15, colorOf(kind, wood), 0.11), cylinder(0.146, 0.149, 0.036, dark, 0.077)],
  scarf: (kind) => [box(0.61, 0.04, 0.13, colorOf(kind, red), 0, 0.06), box(0.13, 0.038, 0.21, "#eb9a70", 0.22, 0.038, 0.04)],
  newspaper: () => [box(0.35, 0.028, 0.24, paper), box(0.28, 0.009, 0.025, dark, 0, 0.018, -0.07), box(0.09, 0.009, 0.11, "#7da7ad", -0.09, 0.018, 0.027)],
  cap: (kind) => [ball(0.135, colorOf(kind, green), 0, 0.108), box(0.23, 0.032, 0.18, dark, 0, 0.033, 0.14)],
  bike: (kind) => bicycle(kind === "small" ? 0.71 : 1),
  box: () => packageBox(0.61, 0.5, 0.45, wood),
  flowers: () => [
    ...[-0.13, 0, 0.14].flatMap((x, i) => [stick([0, -0.18, 0], [x, 0.19 + i * 0.045, 0], 0.016, green),
      ball(0.073, [red, "#e6bb62", "#ba87af"][i], x, 0.21 + i * 0.045)]),
    cylinder(0.114, 0.03, 0.19, paper, -0.1),
  ],
  cake_box: () => packageBox(0.45, 0.23, 0.45, "#e3a6b5"),
  water_jug: () => [cylinder(0.16, 0.2, 0.35, "#78b8c1"), cylinder(0.083, 0.12, 0.096, dark, 0.21), ring(0.09, 0.024, paper, 0.14, 0.15)],
  market_bags: () => [...bag(), ...bag().map(([g, c]): Part => [g.scale(0.8, 0.82, 0.8).translate(0.26, -0.05, 0), c])],
  clipboard: () => [box(0.225, 0.31, 0.028, wood), box(0.19, 0.27, 0.015, paper, 0, 0, 0.019), box(0.085, 0.04, 0.023, metal, 0, 0.135, 0.029)],
  microphone: () => [cylinder(0.037, 0.027, 0.2, dark), ball(0.063, metal, 0, 0.12)],
  coffee_cup: () => [cylinder(0.067, 0.047, 0.15, paper), cylinder(0.063, 0.055, 0.062, wood), cylinder(0.069, 0.072, 0.026, dark, 0.082)],
  postcard: () => [box(0.22, 0.145, 0.012, paper), box(0.19, 0.11, 0.01, "#78b2c4", 0, 0, 0.008), ball(0.027, "#edbb76", 0.05, 0.022, 0.015)],
  pie: () => [cylinder(0.18, 0.13, 0.077, wood), cylinder(0.171, 0.155, 0.037, "#dba25e", 0.05),
    [new THREE.TorusGeometry(0.154, 0.021, 5, 14).rotateX(Math.PI / 2).translate(0, 0.055, 0), "#b47b41"]],
  bracelet: () => [ring(0.082, 0.019, "#d7a348"), ...[-0.046, 0, 0.046].map((x) => ball(0.022, "#6baea6", x, 0.072))],
  fruit_cup: () => [cylinder(0.107, 0.065, 0.14, paper), ball(0.052, red, -0.055, 0.08),
    ball(0.054, "#e9af4f", 0.046, 0.1), ball(0.047, "#8bad62", 0.005, 0.12, 0.043)],
} satisfies Record<StreetProp, (kind?: string) => Part[]>;

function colorOf(kind: string | undefined, fallback: string) {
  return kind && (Object.hasOwn(THREE.Color.NAMES, kind.toLowerCase()) || /^#[\da-f]{6}$/i.test(kind)) ? kind : fallback;
}

function guitar(scale: number): Part[] {
  const parts = [ball(0.21, "#bf7f42", -0.14), ball(0.145, "#d99d58", 0.05), box(0.39, 0.064, 0.04, wood, 0.26, 0, 0.08),
    box(0.12, 0.1, 0.055, dark, 0.46, 0, 0.08), ball(0.057, dark, -0.05, 0.035, 0.163),
    stick([-0.22, 0.01, 0.17], [0.39, 0.01, 0.115], 0.008, paper)];
  parts.push(...guitarFinishParts());
  return parts.map(([g, c]) => [g.scale(scale, scale, scale * 0.6), c]);
}

function packageBox(w: number, h: number, d: number, color: string): Part[] {
  return [box(w, h, d, color), box(w * 0.17, h + 0.012, d + 0.012, paper)];
}

function bag(): Part[] {
  return [box(0.26, 0.29, 0.18, "#bf925e"), box(0.275, 0.035, 0.185, wood, 0, 0.131), ring(0.07, 0.013, wood, 0, 0.167)];
}

function screen(w: number, h: number): Part[] {
  return [box(w, h, 0.023, dark), box(w * 0.86, h * 0.83, 0.008, "#77acbb", 0, 0, 0.014)];
}

function bicycle(scale: number): Part[] {
  const bottom = [-0.14, 0.4, 0], seat = [-0.27, 0.83, 0], bar = [0.42, 0.89, 0];
  const parts = [ring(0.31, 0.035, dark, -0.57, 0.345), ring(0.31, 0.035, dark, 0.57, 0.345),
    stick([-0.57, 0.345, 0], bottom, 0.028, red), stick(bottom, seat, 0.031, red), stick(seat, bar, 0.031, red),
    stick(bar, bottom, 0.035, red), stick(bar, [0.57, 0.345, 0], 0.025, metal),
    box(0.18, 0.055, 0.11, dark, -0.27, 0.86), box(0.08, 0.046, 0.37, dark, 0.43, 0.93)];
  return parts.map(([g, c]) => [g.scale(scale, scale, scale), c]);
}

export const STREET_PROPS = Object.keys(catalog) as StreetProp[];
export const DROP_PROPS: readonly StreetProp[] = ["wallet", "keys", "glove", "sunglasses"];
export const WIND_PROPS: readonly StreetProp[] = ["hat", "scarf", "newspaper", "cap"];
export const GROUND_PROPS: readonly StreetProp[] = ["cart", "easel", "bike", "fish_bucket", "hammocks", "chair_fan", "shoeshine_box", "skateboard"];
export const CARRY_PROPS: readonly StreetProp[] = ["box", "flowers", "cake_box", "water_jug", "market_bags", "package"];

export function makeStreetProp(id: StreetProp, kind?: string) {
  const root = new THREE.Group();
  const builder: (kind?: string) => Part[] = catalog[id];
  const parts = builder(kind);
  if (parts.length) root.add(mesh(parts));
  if (id === "wallet") root.scale.y = 0.5; // A folded billfold stays low in profile.
  return root;
}

export function makeStreetDog(kind?: string) {
  return new Dog(kind === "black" ? 1 : kind === "white" ? 2 : kind === "gold" ? 3 : 0, 0.95);
}

export function makeFruit(kind?: string) {
  const colors: Record<string, string> = { apples: red, oranges: "#ed963e", lemons: "#e3c34b", mangos: "#e9aa53", limes: "#90b856" };
  return mesh([ball(0.076, colors[kind ?? ""] ?? red), stick([0, 0.062, 0], [0.013, 0.096, 0], 0.009, wood)]);
}

export function disposeStreetGeometry(root: THREE.Object3D) {
  root.removeFromParent();
  root.traverse((node) => {
    if (node instanceof THREE.Mesh || node instanceof THREE.Line) node.geometry.dispose();
    if (node instanceof THREE.InstancedMesh) node.dispose();
  });
}
