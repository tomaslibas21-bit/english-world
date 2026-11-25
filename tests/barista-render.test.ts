import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Box3, FrontSide, InstancedMesh, Mesh, MeshLambertMaterial, MeshStandardMaterial, Raycaster, Vector3, type Object3D } from "three";
import { describe, expect, it, vi } from "vitest";
import { BARISTA_ORDERS } from "../src/content/barista";
import { cafe } from "../src/content/situations/s72-cafe";
import { counterShot } from "../src/game/barista/framing";
import { baristaPieceLine } from "../src/game/barista/menu";
import { CounterProps, disposeBaristaProps, makeServing } from "../src/game/barista/props";
import { resetBaristaUi, useBarista } from "../src/game/barista/store";
import { getInterior } from "../src/game/world/interiors";
import { BaristaOverlay } from "../src/ui/Barista";

vi.mock("../src/game/barista/store", async (load) => {
  const store = await load<typeof import("../src/game/barista/store")>();
  return { ...store, useBarista: Object.assign(() => store.useBarista.getState(), store.useBarista) };
});

it("shows the complete bilingual transcript only after revealing either back-to-back order", () => {
  try {
    for (const order of BARISTA_ORDERS.slice(4)) {
      const hiddenOrder = order.pieces.map((piece) => baristaPieceLine(cafe, piece, order.gender));
      useBarista.setState({ hiddenOrder, revealed: false });
      expect(renderToStaticMarkup(createElement(BaristaOverlay, { touch: true }))).not.toContain("barista-order-text");
      useBarista.setState({ revealed: true });
      const html = renderToStaticMarkup(createElement(BaristaOverlay, { touch: true }));
      const rows = html.match(/<li data-line=.*?<\/li>/g) ?? [];
      expect(rows).toHaveLength(hiddenOrder.length);
      rows.forEach((row, i) => {
        const { en, nat } = hiddenOrder[i].sentence;
        expect(row).toContain(renderToStaticMarkup(createElement("span", { lang: "en" }, en)));
        expect(row).toContain(renderToStaticMarkup(createElement("small", { lang: "lt" }, nat)));
      });
    }
  } finally {
    resetBaristaUi();
  }
});

function meshBudget(root: Object3D) {
  let meshes = 0, triangles = 0;
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const geometry = object.geometry;
    const instances = object instanceof InstancedMesh ? object.count : 1;
    meshes++;
    triangles += (geometry.index?.count ?? geometry.getAttribute("position").count) / 3 * instances;
  });
  return { meshes, triangles };
}

it("keeps the Sunny Cup window wall, shift props and ordinary room within their mesh budgets", () => {
  const draw = () => {};
  const gradient = () => ({ addColorStop: draw });
  const canvas = new Proxy({
    measureText: (text: string) => ({ width: text.length * 9 }), createLinearGradient: gradient, createRadialGradient: gradient,
  }, { get: (target, key) => Reflect.get(target, key) ?? draw });
  vi.stubGlobal("document", { createElement: () => ({ getContext: () => canvas }) });
  let props: CounterProps | undefined;
  try {
    props = new CounterProps();
    const windows = props.root.getObjectsByProperty("name", "barista-shop-windows");
    expect(windows).toHaveLength(1);
    const wall = windows[0] as Mesh;
    expect(wall).toBeInstanceOf(Mesh);
    expect(wall.material).toBeInstanceOf(MeshLambertMaterial);
    expect(wall.material).toMatchObject({ transparent: false, opacity: 1, side: FrontSide, vertexColors: true });
    expect(meshBudget(wall).meshes).toBe(1);
    expect(meshBudget(wall).triangles).toBeLessThanOrEqual(272);

    const shift = meshBudget(props.root);
    expect(shift.meshes).toBeLessThanOrEqual(33);
    expect(shift.triangles).toBeLessThanOrEqual(3_314);

    const room = meshBudget(getInterior("sunny-cup")!.group);
    expect(room.meshes).toBeLessThanOrEqual(11);
    expect(room.triangles).toBeLessThanOrEqual(1_970);
  } finally {
    try {
      if (props) disposeBaristaProps(props.root);
    } finally {
      vi.unstubAllGlobals();
    }
  }
});

const latte = { drink: "latte", size: "medium", milk: "whole", dine: "here", extras: [] };
const camera = counterShot(new Vector3(-1.2, 0, -4.2), 1.75).pos;

describe("barista serving meshes", () => {
  it.each([
    ["latte", "whole", "fff0ce"],
    ["americano", "none", "4a291d"],
    ["hot_chocolate", undefined, "824a31"],
  ])("shows the %s surface through the mug opening from the counter camera", (drink, milk, hex) => {
    const serving = makeServing({ ...latte, drink, milk });
    serving.updateMatrixWorld(true);
    expect(serving.getObjectByName("barista-cup-handle")).toBeDefined();
    expect(serving.getObjectByName("barista-saucer")).toBeDefined();
    const fill = serving.getObjectByName("barista-cup-fill") as Mesh<never, MeshStandardMaterial>;
    const toward = fill.getWorldPosition(new Vector3()).sub(camera).normalize();
    const [hit] = new Raycaster(camera, toward).intersectObject(serving);
    expect(hit?.object).toBe(fill);
    expect(fill.material.color.getHexString()).toBe(hex);
  });

  it("uses a lid over the paper cup and shows ice inside the clear cup", () => {
    const paper = makeServing({ ...latte, dine: "togo" });
    expect(paper.getObjectByName("keepsake")).toBeDefined();
    expect(paper.getObjectByName("barista-cup-lid")).toBeDefined();
    expect(paper.getObjectByName("barista-cup-fill")).toBeUndefined();
    expect(paper.getObjectByName("barista-saucer")).toBeUndefined();

    const cold = makeServing({ ...latte, extras: ["iced"] });
    const glass = cold.getObjectByName("barista-cup-wall") as Mesh<never, MeshStandardMaterial>;
    expect(glass.material.transparent).toBe(true);
    expect(glass.material.opacity).toBeLessThan(0.5);
    const pieces = cold.getObjectsByProperty("name", "barista-ice");
    expect(pieces).toHaveLength(3);
    expect(pieces.every((ice) => new Box3().setFromObject(ice).max.y < new Box3().setFromObject(glass).max.y)).toBe(true);
    expect(cold.getObjectByName("barista-saucer")).toBeDefined();
  });

  it("changes the actual height and diameter between small, medium and large", () => {
    const [small, medium, large] = ["small", "medium", "large"].map((size) =>
      new Box3().setFromObject(makeServing({ ...latte, size })).getSize(new Vector3()));
    for (const axis of ["x", "y", "z"] as const) {
      expect(medium[axis] / small[axis]).toBeGreaterThan(1.2);
      expect(large[axis] / medium[axis]).toBeGreaterThan(1.2);
    }
  });
});
