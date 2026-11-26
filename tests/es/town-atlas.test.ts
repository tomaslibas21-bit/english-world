import { createHash } from "node:crypto";
import * as THREE from "three";
import { afterEach, expect, it, vi } from "vitest";
import { SignAtlas, kiosk, paintedSignTexture, stopFace, streetSign, tiendita } from "../../src/game/world/mexican";
import { buildTown } from "../../src/game/world/town";
import { Colliders } from "../../src/game/world/util";

function recordCanvases() {
  const canvases = new Map<unknown, ReturnType<typeof recordingCanvas>>();
  vi.stubGlobal("document", { createElement: () => {
    const record = recordingCanvas();
    canvases.set(record.canvas, record);
    return record.canvas;
  } });
  return canvases;
}

function recordingCanvas() {
  const commands: unknown[] = [];
  const words: string[] = [];
  let measures = 0;
  const defaults = {
    font: "10px sans-serif", fillStyle: "#000000", strokeStyle: "#000000",
    textAlign: "start", textBaseline: "alphabetic", lineWidth: 1, lineJoin: "miter",
  };
  const stack: (typeof defaults)[] = [];
  const state = { ...defaults };
  const special = {
    save() { stack.push({ ...state }); commands.push(["save"]); },
    restore() { commands.push(["restore", { ...state }]); Object.assign(state, stack.pop()); },
    measureText(text: string) {
      measures++;
      const size = Number(/([\d.]+)px/.exec(state.font)?.[1]);
      // Keep hinted-width ties, accent advances and a nonmonotonic italic face in the fixture.
      const advance = Array.from(text, c => c === " " ? 0.28 : /[ÁÉÍÓÚñ]/.test(c) ? 0.72 : 0.56)
        .reduce((sum, width) => sum + width, 0);
      const italic = state.font.startsWith("italic") && Math.floor(size) % 3 === 0 ? 0.65 : 1;
      return { width: Math.round(advance * size * italic / 2) * 2 };
    },
  };
  const ctx = new Proxy(state, {
    get(target, key) {
      return Reflect.get(target, key) ?? Reflect.get(special, key) ?? ((...args: unknown[]) => {
        if (key === "fillText" || key === "strokeText") words.push(String(args[0]));
        commands.push([key, args, { ...state }]);
        if (key === "createLinearGradient" || key === "createRadialGradient") return { addColorStop() {} };
      });
    },
  });
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  return {
    canvas, words,
    report() {
      return {
        measures, draws: words.length, font: state.font, size: [canvas.width, canvas.height],
        paintSHA: createHash("sha256").update(JSON.stringify(commands)).digest("hex"),
      };
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

// Hash the original painters' complete canvas command streams and the packed atlas UVs.
function atlasReport(mesh: THREE.Mesh, canvases: ReturnType<typeof recordCanvases>) {
  const map = (mesh.material as THREE.MeshBasicMaterial).map!;
  const record = canvases.get(map.image)!;
  const { array } = mesh.geometry.getAttribute("uv");
  return {
    ...record.report(), anisotropy: map.anisotropy,
    uvSHA: createHash("sha256").update(Buffer.from(array.buffer, array.byteOffset, array.byteLength)).digest("hex"),
  };
}

it("matches the original PC atlas paint, packing and UVs", () => {
  const canvases = recordCanvases();
  const { group } = buildTown({ movableParking: true });
  const mesh = group.getObjectByName("town-signs") as THREE.Mesh;
  const { measures, paintSHA, ...paint } = atlasReport(mesh, canvases);
  expect(measures).toBeLessThan(766);
  // Both complete streams were captured from the original painter (before 567ffbee).
  // Keep exact hashes for the original review runtime and the Linux x64 test runtime.
  expect([
    "fc5a89d0062812147fabd3e39ed03b89c5aafb932d4244a026b3709dd7d0324c",
    "30ff12545ee8831e56f2c686f0acc0dd8d4f4c99bd5b94fef28727d487a7fea4",
  ]).toContain(paintSHA);
  expect(paint).toStrictEqual({
    draws: 92, font: "10px sans-serif", size: [1024, 5224], anisotropy: 16,
    uvSHA: "8e897558a5cd07165d19c0f24e7de76251ae9afe817df6bbf8880aeadfe89b5d",
  });
  expect(canvases.get((mesh.material as THREE.MeshBasicMaterial).map!.image)!.words).toContain("ALTO");
});

it("matches the original blades, fractional floor, stacked boards and outlined script", () => {
  const canvases = recordCanvases();
  const atlas = new SignAtlas();
  const col = new Colliders();
  streetSign([], col, atlas, 0, 0, "Av. " + "Malecón de los Camarónes ".repeat(5), "Calle Peñas");
  kiosk([], col, atlas, 0, 0, "Rutas Arqueológicas · Colibrí");
  tiendita([], col, atlas, (x, z) => [x, z], 0, 0, 2, "El Rincón de la Señora Úrsula", {
    x: 0, z: 0, rot: 0, text: "Panadería · Abarrotes",
  });
  stopFace(atlas, "ALTO", 0, 0);
  const mesh = atlas.build()!;
  const { measures, paintSHA, ...paint } = atlasReport(mesh, canvases);
  expect(measures).toBeLessThan(285);
  expect([
    "e90b05a0fbd3981195376d8f55f7c75a629dd76d52fc3de8d5421fe9db1e99b2",
    "8da2b905287ba960261da4fa3e6c7a401bc2478d49c11211daef04c93e497f6d",
  ]).toContain(paintSHA);
  expect(paint).toStrictEqual({
    draws: 17, font: "10px sans-serif", size: [1024, 786], anisotropy: 16,
    uvSHA: "4e812188975ce8f7a742067bde58d2dbfb1deda169dd125e0ed940ee805b7083",
  });
  const script = paintedSignTexture("El Rincón de la Señora Úrsula ".repeat(4), "#fd0", "#300", "#131", "Café · Mañana");
  expect(canvases.get(script.image)!.report()).toStrictEqual({
    measures: 107, draws: 4, font: "800 51.2px 'Nunito', 'Arial Rounded MT Bold', Arial, sans-serif", size: [768, 256],
    paintSHA: "701ef23854831b18a5309df0a1a2ec5d94c8381cb4db70023f33d45b894c1e63",
  });
  expect(canvases.get((mesh.material as THREE.MeshBasicMaterial).map!.image)!.words).toEqual(expect.arrayContaining([
    "ALTO", "Rutas Arqueológicas", "Colibrí", "Panadería · Abarrotes", "Snorkel · Ruinas · Tulum",
  ]));
});
