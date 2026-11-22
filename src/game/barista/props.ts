import * as THREE from "three";
import { BARISTA_CHOCOLATE, BARISTA_MENU, priceText } from "../../content/barista";
import { makeKeepsake } from "../keepsake";
import type { Build } from "./tray";

const TOP = 1.08;
const CREAM = "#fff3d6";
const TEAL = "#38786b";
const TRIM = "#26564e";
const METAL = "#b6c9c1";
const DARK = "#243b39";
const PAPER = "#d79c63";

type Parent = THREE.Object3D;
function mesh(parent: Parent, geometry: THREE.BufferGeometry, color: string, x: number, y: number, z: number, opacity = 1) {
  const material = new THREE.MeshStandardMaterial({ color, flatShading: true, transparent: opacity < 1, opacity, depthWrite: opacity === 1 });
  const part = new THREE.Mesh(geometry, material);
  part.position.set(x, y, z);
  parent.add(part);
  return part;
}

const box = (parent: Parent, color: string, w: number, h: number, d: number, x: number, y: number, z: number, opacity = 1) =>
  mesh(parent, new THREE.BoxGeometry(w, h, d), color, x, y, z, opacity);
const cylinder = (parent: Parent, color: string, top: number, bottom: number, h: number, x: number, y: number, z: number, sides = 12) =>
  mesh(parent, new THREE.CylinderGeometry(top, bottom, h, sides), color, x, y, z);
const torus = (parent: Parent, color: string, radius: number, tube: number, x: number, y: number, z: number) =>
  mesh(parent, new THREE.TorusGeometry(radius, tube, 6, 14), color, x, y, z);
const ball = (parent: Parent, color: string, size: number, x: number, y: number, z: number) =>
  mesh(parent, new THREE.IcosahedronGeometry(size, 1), color, x, y, z);

export function disposeBaristaProps(group: Parent) {
  group.removeFromParent();
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    object.material.map?.dispose();
    object.material.dispose();
  });
}

function pastry(parent: Parent, id: string, x: number, y: number, z: number, scale = 1) {
  const baked = new THREE.Group();
  baked.position.set(x, y, z);
  baked.scale.setScalar(scale);
  parent.add(baked);
  if (id === "croissant") {
    for (let i = -3; i <= 3; i++) {
      const piece = ball(baked, i % 2 ? "#d98d40" : "#efaf58", 0.1 - Math.abs(i) * 0.013, i * 0.046, 0.072 - Math.abs(i) * 0.009, i * i * 0.009);
      piece.scale.set(0.83, 0.82, 1.15);
      piece.rotation.y = i * 0.31;
    }
  } else if (id === "blueberry_muffin") {
    cylinder(baked, "#ae674f", 0.102, 0.074, 0.1, 0, 0.05, 0);
    ball(baked, "#d89655", 0.118, 0, 0.105, 0).scale.y = 0.63;
    for (const [dx, dy, dz] of [[-0.055, 0.154, 0.04], [0.06, 0.153, 0.036], [-0.03, 0.157, -0.065]]) ball(baked, "#514067", 0.02, dx, dy, dz);
  } else if (id === "cookie") {
    cylinder(baked, "#cf9857", 0.113, 0.119, 0.036, 0, 0.022, 0);
    for (const [dx, dz] of [[-0.05, 0.05], [0.042, 0.058], [-0.023, -0.046], [0.064, -0.032]]) ball(baked, "#74412e", 0.019, dx, 0.04, dz);
  } else if (id === "donut") {
    torus(baked, "#d98d40", 0.073, 0.04, 0, 0.039, 0).rotation.x = Math.PI / 2;
    torus(baked, "#f2b8c6", 0.073, 0.034, 0, 0.058, 0).rotation.x = Math.PI / 2;
  } else if (id === "concha") {
    ball(baked, "#d9a35e", 0.105, 0, 0.039, 0).scale.y = 0.53;
    ball(baked, CREAM, 0.098, 0, 0.052, 0).scale.y = 0.49;
    for (const angle of [-0.6, 0, 0.6]) {
      box(baked, "#b98a52", 0.14, 0.009, 0.009, 0, 0.097, 0).rotation.y = angle;
    }
  } else {
    cylinder(baked, "#ba7440", 0.105, 0.1, 0.076, 0, 0.041, 0);
    const spiral = Array.from({ length: 25 }, (_, i) => {
      const a = i * 0.42, r = 0.008 + i * 0.0034;
      return new THREE.Vector3(Math.sin(a) * r, 0.082, Math.cos(a) * r);
    });
    mesh(baked, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiral), 24, 0.009, 5, false), CREAM, 0, 0, 0);
  }
}

export class CounterProps {
  readonly root = new THREE.Group();
  private canvas = document.createElement("canvas");
  private texture = new THREE.CanvasTexture(this.canvas);

  constructor() {
    const machine = new THREE.Group();
    machine.position.set(0.91, TOP, -3.42);
    machine.scale.setScalar(0.74);
    this.root.add(machine);
    box(machine, TRIM, 1.42, 0.13, 0.81, 0, 0.065, 0);
    box(machine, TEAL, 1.35, 0.58, 0.53, 0, 0.42, 0.102);
    box(machine, TEAL, 1.35, 0.25, 0.78, 0, 0.65, 0);
    box(machine, METAL, 1.4, 0.045, 0.81, 0, 0.79, 0);
    box(machine, METAL, 1.11, 0.087, 0.046, 0, 0.63, -0.39);
    for (const x of [-0.32, 0.31]) {
      cylinder(machine, METAL, 0.11, 0.095, 0.085, x, 0.492, -0.25);
      box(machine, DARK, 0.078, 0.064, 0.22, x, 0.48, -0.4);
      cylinder(machine, CREAM, 0.074, 0.059, 0.079, x, 0.174, -0.27);
    }
    for (const [x, color] of [[-0.1, "#ffbe72"], [0.06, "#faf4cc"], [0.22, "#a5cf9f"]] as const) {
      ball(machine, color, 0.037, x, 0.65, -0.426);
    }

    for (const [x, color] of [[0.45, CREAM], [0.68, "#afc7a3"], [0.91, "#e6b27c"]] as const) {
      cylinder(this.root, color, 0.064, 0.079, 0.16, x, TOP + 0.08, -2.97);
      cylinder(this.root, CREAM, 0.067, 0.067, 0.02, x, TOP + 0.169, -2.97);
      torus(this.root, color, 0.051, 0.011, x + 0.071, TOP + 0.08, -2.97);
    }

    const displayCase = new THREE.Group();
    displayCase.position.set(-3.95, TOP, -2.99);
    this.root.add(displayCase);
    box(displayCase, TRIM, 1.45, 0.075, 0.65, 0, 0.037, 0);
    box(displayCase, "#c8e6dc", 1.45, 0.33, 0.025, 0, 0.24, 0.315, 0.23);
    box(displayCase, "#c8e6dc", 1.45, 0.025, 0.65, 0, 0.414, 0, 0.24);
    for (const x of [-0.7, 0.7]) box(displayCase, METAL, 0.045, 0.38, 0.66, x, 0.22, 0, 0.7);
    BARISTA_MENU.food.forEach((id, i) => pastry(displayCase, id, -0.5 + i * 0.33, 0.08, 0, 0.92));

    const till = new THREE.Group();
    till.position.set(-0.41, TOP, -3.34);
    this.root.add(till);
    box(till, TRIM, 0.65, 0.125, 0.52, 0, 0.062, 0);
    box(till, TEAL, 0.58, 0.25, 0.29, 0, 0.22, 0.07);
    for (let i = 0; i < 4; i++) box(till, CREAM, 0.063, 0.028, 0.075, 0.17 - i * 0.105, 0.136, -0.15);
    this.canvas.width = 256;
    this.canvas.height = 96;
    this.texture.colorSpace = THREE.SRGBColorSpace;
    const display = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.18), new THREE.MeshBasicMaterial({ map: this.texture }));
    display.position.set(0, 0.241, -0.077);
    display.rotation.y = Math.PI;
    till.add(display);
    this.price(null);
  }

  price(cents: number | null) {
    const ctx = this.canvas.getContext("2d")!;
    ctx.fillStyle = DARK;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (cents !== null) {
      ctx.fillStyle = "#c2e6a5";
      ctx.font = "bold 59px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(priceText(cents), 128, 49);
    }
    this.texture.needsUpdate = true;
  }
}

export const CUP_AT = new THREE.Vector3(-1.12, TOP, -3.18);
export const CUP_SERVED = new THREE.Vector3(-1.12, TOP, -2.7);

function cupWall(parent: Parent, color: string, base: number, rim: number, foot: number, lip: number, opacity = 1) {
  const profile = [
    [0, base], [foot, base], [foot + 0.005, base + 0.016], [lip, rim - 0.012], [lip, rim],
    [lip - 0.012, rim], [lip - 0.014, rim - 0.016], [foot - 0.011, base + 0.024], [0, base + 0.024],
  ];
  const wall = mesh(parent, new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 16), color, 0, 0, 0, opacity);
  wall.name = "barista-cup-wall";
  return wall;
}

function cupHandle(cup: Parent, color: string, y: number) {
  const handle = torus(cup, color, 0.064, 0.023, -0.112, y, 0.112);
  handle.rotation.y = -3 * Math.PI / 4;
  handle.name = "barista-cup-handle";
  return handle;
}

function servingDrink(cup: THREE.Group, built: Build) {
  const toGo = built.dine === "togo";
  const iced = built.extras.includes("iced");
  const color = built.drink === BARISTA_CHOCOLATE ? "#824a31"
    : built.milk && built.milk !== "none" ? "#fff0ce" : "#4a291d";

  if (!toGo) {
    const saucer = cylinder(cup, CREAM, 0.19, 0.155, 0.045, 0, 0.0225, 0);
    saucer.name = "barista-saucer";
  }

  if (iced) {
    const glass = "#beede9";
    const base = toGo ? 0 : 0.043;
    const rim = toGo ? 0.333 : 0.346;
    const surface = rim - 0.071;
    const wall = cupWall(cup, glass, base, rim, 0.092, 0.145, 0.42);
    wall.material.roughness = 0.32;
    if (!toGo) cupHandle(cup, glass, 0.205);
    const depth = surface - base - 0.032;
    cylinder(cup, color, 0.12, 0.082, depth, 0, surface - depth / 2, 0, 16).name = "barista-cup-fill";
    for (const [dx, dy, dz] of [[-0.057, 0.008, 0.033], [0.053, 0.021, 0.017], [0.005, 0.012, -0.056]]) {
      const cube = box(cup, "#bdebf0", 0.066, 0.058, 0.062, dx, surface + dy, dz);
      cube.name = "barista-ice";
      cube.rotation.set(0.26, dx * 12, -0.24);
    }
    if (toGo) cylinder(cup, "#e1f3ef", 0.14, 0.15, 0.025, 0, rim + 0.011, 0, 16).name = "barista-cup-lid";
  } else if (toGo) {
    const paperCup = makeKeepsake("coffee_cup");
    paperCup.scale.setScalar(0.031);
    paperCup.position.y = 0.124;
    cup.add(paperCup);
    cylinder(cup, "#f2e4c6", 0.133, 0.145, 0.055, 0, 0.329, 0, 16).name = "barista-cup-lid";
    cylinder(cup, CREAM, 0.092, 0.122, 0.022, 0, 0.367, 0, 16);
  } else {
    cupWall(cup, TEAL, 0.043, 0.284, 0.105, 0.145);
    cupHandle(cup, TEAL, 0.168);
    torus(cup, CREAM, 0.138, 0.006, 0, 0.284, 0).rotation.x = Math.PI / 2;
    cylinder(cup, color, 0.128, 0.128, 0.012, 0, 0.265, 0, 16).name = "barista-cup-fill";
  }
}

export function makeServing(built: Build) {
  const root = new THREE.Group();
  root.name = "barista-serving";
  root.position.copy(CUP_AT);
  const cup = new THREE.Group();
  cup.name = "barista-drink";
  cup.scale.setScalar(built.size === "large" ? 1.23 : built.size === "small" ? 0.76 : 1);
  root.add(cup);
  servingDrink(cup, built);

  const food = built.extras.filter((id) => id !== "iced");
  if (food.length && built.dine === "togo") {
    box(root, PAPER, 0.3, 0.255, 0.207, -0.34, 0.1275, 0);
    box(root, "#edc28c", 0.31, 0.028, 0.22, -0.34, 0.253, 0);
    box(root, "#efcc9c", 0.11, 0.043, 0.006, -0.34, 0.185, -0.107);
  } else if (food.length) {
    cylinder(root, CREAM, 0.18, 0.15, 0.048, -0.35, 0.024, 0);
    food.forEach((id, i) => pastry(root, id, -0.35 + (food.length > 1 ? Math.cos(i * 1.6) * 0.08 : 0), 0.047,
      food.length > 1 ? Math.sin(i * 1.6) * 0.08 : 0, food.length > 1 ? 0.58 : 1));
  }
  return root;
}
