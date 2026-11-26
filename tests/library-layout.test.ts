import { Group, Mesh, Light, Vector3, type MeshBasicMaterial, type BufferGeometry } from "three";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { hasLibraryShelf } from "../src/content/library";
import { LOCATIONS } from "../src/content/locations";
import { iconForEmoji } from "../src/ui/icons";
import { Game } from "../src/game/Game";
import { Gait, Hop, Steer } from "../src/game/movement";
import { audio } from "../src/game/audio";
import { coach } from "../src/game/coach";
import { buildTownField, buildTownLedges } from "../src/game/townCollision";
import { CameraRig } from "../src/game/camera";
import { NavGrid } from "../src/game/nav";
import { BUILDINGS, ROADS, WORLD } from "../src/game/world/layout";
import { SLATE_COVE, filterSlateCoveNav } from "../src/game/world/slateCovePlan";
import { buildTown } from "../src/game/world/town";
import { getInterior } from "../src/game/world/interiors";
import { LIBRARY_CHAIRS, LIBRARY_STOPS } from "../src/game/world/libraryRoom";
import { townCanvasDocument } from "../tools/town-canvas-stub";

vi.mock("../src/content/library", async (original) => ({
  ...await original<typeof import("../src/content/library")>(), LIBRARY_ENABLED: true,
}));

beforeEach(() => vi.stubGlobal("document", townCanvasDocument()));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("opens only for the Maple shelf in a course or private review build", () => {
  expect(hasLibraryShelf({})).toBe(false);
  expect(hasLibraryShelf({ VITE_RADIO_FILES: "https://audio.dvikalbesdainos.lt/fluent-steps" })).toBe(true);
  expect(hasLibraryShelf({ VITE_BOOK_REVIEW: "1", VITE_BOOK_PROFILE: "em-lt", VITE_RADIO_FILES: "/__files/em-lt" })).toBe(true);
  expect(hasLibraryShelf({ VITE_BOOK_REVIEW: "1", VITE_BOOK_PROFILE: "em-lt", VITE_RADIO_FILES: "/__files/sm-lt" })).toBe(false);
});

it("reaches the civic door from Union Station with an uninterrupted sidewalk and level approach", () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const town = buildTown();
  expect(fetch).not.toHaveBeenCalled();
  expect(BUILDINGS.filter((b) => b.loc === "library")).toMatchObject([{ id: "house3", x: 22, z: 54, w: 12, d: 10, face: "n", roof: "gable" }]);
  expect(LOCATIONS.library).toMatchObject({ name: "Maple Harbor Public Library", lt: "Meipl Harboro viešoji biblioteka", district: "residential", kind: "interior" });
  expect(iconForEmoji(LOCATIONS.library.icon)).toBe("bookOpen");
  const doors = town.doors.filter((d) => d.loc === "library");
  expect(doors).toHaveLength(1);
  const [door] = doors, station = town.doors.find((d) => d.loc === "station")!;
  expect(door).toMatchObject({ x: 22, z: 49, outX: 22, outZ: 46.8, name: LOCATIONS.library.name });
  const nav = new NavGrid(SLATE_COVE.minX, WORLD.minZ, WORLD.maxX, WORLD.maxZ, 1, town.colliders);
  for (const [x, z] of [[station.outX, station.outZ], [22, 44.5], [22, 45.8], [22, 45.3]]) {
    expect(town.walkableAt(x, z)).toBe(true);
    expect(nav.free(nav.idx(x, z)), `${x}, ${z}`).toBe(true);
    expect(nav.path(x, z, door.outX, door.outZ)?.at(-1)).toEqual([door.outX, door.outZ]);
  }
  for (const x of [20.9, 22, 23.1]) for (let z = 43; z <= 48.6; z += 0.2)
    expect(town.colliders.blocked(x, z, 0.38), `${x}, ${z}`).toBe(false);
  for (let x = 16; x < 28; x += 0.25) expect(town.walkableAt(x, 43.4)).toBe(true);
  const signs = town.group.getObjectByName("oak-civic-signs") as Mesh<BufferGeometry, MeshBasicMaterial>;
  expect(signs.userData.signQuads.map((q: { key: string }) => q.key)).toEqual([LOCATIONS.station.name, LOCATIONS.library.name]);
  expect(signs.geometry.groups).toHaveLength(0);
  expect(signs.geometry.index?.count).toBe(12);
  expect(signs.material.map!.image).toMatchObject({ width: 768, height: 190 });
  const mipBytes = (width: number, height: number): number => {
    const base = width * height * 4;
    return width === 1 && height === 1 ? base : base + mipBytes(Math.max(1, Math.floor(width / 2)), Math.max(1, Math.floor(height / 2)));
  };
  expect(mipBytes(768, 190) - mipBytes(768, 160)).toBeLessThanOrEqual(128 * 1024);
  const calls = (root: typeof town.group) => {
    let count = 0;
    root.traverse((o) => { if (o instanceof Mesh) count += Array.isArray(o.material) ? o.geometry.groups.length : 1; });
    return count;
  };
  const index = BUILDINGS.findIndex((b) => b.id === "house3"), parcel = BUILDINGS[index];
  try {
    BUILDINGS[index] = { ...parcel, loc: undefined, sign: "", color: "#d7c0e0", trim: "#ffffff", style: "house" };
    expect(calls(town.group) - calls(buildTown().group)).toBeLessThanOrEqual(1);
  } finally { BUILDINGS[index] = parcel; }
});


it("walks from the saved station start to the library using Game's own navigation and movement", () => {
  const town = buildTown();
  const nav = new NavGrid(SLATE_COVE.minX, WORLD.minZ, WORLD.maxX, WORLD.maxZ, 1, town.colliders);
  filterSlateCoveNav(nav, town.colliders);
  for (const road of ROADS) {
    if (road.z1 === road.z2) nav.setCost(road.x1, road.z1 - road.w / 2, road.x2, road.z1 + road.w / 2, 5);
    else nav.setCost(road.x1 - road.w / 2, road.z1, road.x1 + road.w / 2, road.z2, 5);
  }
  const ledges = buildTownLedges(town, buildTownField(town));
  vi.spyOn(audio, "step").mockImplementation(() => {});
  vi.spyOn(coach, "stroll").mockImplementation(() => {});
  const planned = vi.spyOn(nav, "path");
  const door = town.doors.find((d) => d.loc === "library")!;
  const noop = () => {};
  for (const fps of [30, 60]) {
    // Use the production walking methods without constructing a renderer, actors or effects.
    const game: Game = Object.assign(Object.create(Game.prototype), {
      zone: { id: "town", group: town.group, nav, colliders: town.colliders }, town, ledges,
      player: { root: new Group(), setAnim: noop, update: noop },
      rig: new CameraRig(390 / 844), pointer: { down: false },
      rides: { riding: null, resolvePlayer: noop }, modes: { active: null }, npcs: [],
      ambient: { checkBump: noop, resolvePlayer: noop, resolvePeople: noop, carAt: () => false },
      splashes: { update: noop }, dust: { update: noop, puff: noop }, pigeons: { update: noop },
      keys: new Set(), joy: { x: 0, y: 0 }, steer: new Steer(), gait: new Gait(), hop: new Hop(),
      vel: new Vector3(), moveVel: new Vector3(), tmpV: new Vector3(), walkWant: new Vector3(), walkFrom: new Vector3(),
      wading: { depth: 0 }, swimK: 0, diveK: 0, diveT: 0, swimming: false,
      gaitOn: false, jogT: 0, jogDir: null, heading: 0, lastHeading: 0, lastSpeed: 0,
      stepOut: 0, stepDist: 0.6, stepN: null, washT: 0, t: 0,
      applyHop: noop, checkCoveDoor: noop, underfoot: () => "pavement",
    });
    const enter = vi.spyOn(game as unknown as { enterDoor(loc: string): void }, "enterDoor").mockImplementation(noop);
    const walk = (x: number, z: number, kind: "point" | "door") => {
      game.walkTo(x, z, { kind, id: kind === "door" ? "library" : undefined, rot: 0 });
      expect(game["autoPath"]?.at(-1)).toEqual([x, z]);
      for (let frame = 0; frame < fps * 30 && game["autoPath"]?.length; frame++) {
        game["updatePlayer"](1 / fps, false);
        const p = game["player"].root.position;
        expect(town.walkableAt(p.x, p.z)).toBe(true);
      }
      const p = game["player"].root.position, distance = Math.hypot(p.x - x, p.z - z);
      expect(game["autoPath"]).toBeNull();
      expect(distance, JSON.stringify({ fps, position: p.toArray(), target: [x, z] })).toBeLessThan(0.35);
    };
    game["player"].root.position.set(45, 0, 46.8);
    walk(22, 44.4, "point");
    expect(planned).toHaveBeenCalledWith(45, 46.8, 22, 44.4, true);
    walk(door.outX, door.outZ, "point");
    game["player"].root.position.set(45, 0, 46.8);
    game["vel"].set(0, 0, 0);
    walk(door.outX, door.outZ, "door");
    expect(enter).toHaveBeenCalledExactlyOnceWith("library");
  }
});

it("keeps the center aisle, exit and all three approaches free at avatar width", () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const room = getInterior("library")!;
  expect(fetch).not.toHaveBeenCalled();
  expect(room).toMatchObject({ w: 12, d: 10, spawn: { x: 0, z: 3.4, rot: Math.PI }, exit: { x: 0, z: 4.8 }, npcs: [] });
  const nav = new NavGrid(-7, -6, 7, 8, 0.5, room.colliders, 0.35);
  for (const { x, z } of [room.exit, { x: -4.3, z: -2.2 }, { x: -4.3, z: 0.98 }, ...LIBRARY_STOPS.map((s) => s.approach)]) {
    expect(room.colliders.blocked(x, z, 0.38)).toBe(false);
    expect(nav.free(nav.idx(x, z)), `${x}, ${z}`).toBe(true);
    expect(nav.path(0, 3.4, x, z)?.at(-1)).toEqual([x, z]);
    expect(nav.path(x, z, room.exit.x, room.exit.z)?.at(-1)).toEqual([0, 4.8]);
  }
  for (const chair of LIBRARY_CHAIRS) {
    expect(room.colliders.blocked(chair.x, chair.z, 0.1)).toBe(true);
    expect(room.colliders.blocked(chair.approach.x, chair.approach.z, 0.6)).toBe(false);
    expect(chair.seatY).toBeCloseTo(0.55);
    expect(Math.atan2(chair.approach.x - chair.x, chair.approach.z - chair.z)).toBeCloseTo(chair.rot);
  }
  for (let z = -2.7; z <= 3.5; z += 0.25) expect(room.colliders.blocked(0, z, 0.8)).toBe(false);
});


it("shows the shelves, jackets and both reading lamps in the doorway composition at every review size", () => {
  const room = getInterior("library")!;
  for (const [width, height] of [[390, 844], [844, 390], [1280, 800]]) {
    const rig = new CameraRig(width / height);
    rig.mode = "interior"; rig.interiorBounds = { w: room.w, d: room.d }; rig.interiorView = room.camera;
    rig.target.set(room.spawn.x, 0, room.spawn.z);
    rig.cam.fov = rig.fovFor(width, height, false);
    rig.cam.updateProjectionMatrix();
    rig.snap(); rig.applyPose(); rig.cam.updateMatrixWorld(true);
    for (const name of ["library-furniture", "library-lamps"]) {
      const geometry = (room.group.getObjectByName(name) as Mesh).geometry;
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const p = new Vector3().fromBufferAttribute(position, i).project(rig.cam);
        expect(Math.abs(p.x), `${width}×${height} ${name} horizontal`).toBeLessThan(0.98);
        expect(Math.abs(p.y), `${width}×${height} ${name} vertical`).toBeLessThan(0.98);
        expect(Math.abs(p.z)).toBeLessThan(1);
      }
    }
  }
});

const ids = ["BOOK-CANT", "BOOK-NOTE", "BOOK-OZ", "BOOK-JEKYLL"];
function shelfRequests(books = ids) {
  const fetch = vi.fn(async (url: string) => url === "/knygos/index.json"
    ? Response.json({ books: books.map((id) => ({ id })) })
    : new Response(new Blob(["cover"])));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

it("batches the four uncropped jackets, fits the phone budgets and releases every visit's art", async () => {
  const room = getInterior("library")!, fetch = shelfRequests();
  const close = vi.fn();
  vi.stubGlobal("createImageBitmap", async () => ({ width: 160, height: 241, close }));
  const meshes = () => room.group.children.filter((o): o is Mesh => o instanceof Mesh);
  const baseCount = meshes().length;
  expect(room.group.getObjectByName("library-jackets")).toBeUndefined();
  for (let visit = 0; visit < 10; visit++) {
    const leave = room.onEnter!(room.group);
    await vi.waitFor(() => expect(room.group.getObjectByName("library-jackets")).toBeDefined());
    const jackets = room.group.getObjectByName("library-jackets") as Mesh<BufferGeometry, MeshBasicMaterial>;
    expect(fetch.mock.calls.filter(([url]) => url.endsWith(".160.webp"))).toHaveLength(4 * (visit + 1));
    expect(close).toHaveBeenCalledTimes(4 * (visit + 1));
    expect(jackets.userData.bookIds).toEqual(ids);
    const map = jackets.material.map!, canvas = map.image as HTMLCanvasElement;
    expect(map.image).toMatchObject({ width: 512, height: 512 });
    expect(map.generateMipmaps).toBe(false);
    const library = meshes().filter((o) => o.name.startsWith("library-"));
    const materials = new Set(library.map((o) => o.material));
    let triangles = 0, bytes = canvas.width * canvas.height * 4;
    for (const { geometry: g } of library) {
      triangles += (g.index?.count ?? g.attributes.position.count) / 3;
      bytes += g.index?.array.byteLength ?? 0;
      for (const a of Object.values(g.attributes)) bytes += a.array.byteLength;
      expect(g.groups).toHaveLength(0);
    }
    expect(room.group.children.some((o) => o instanceof Light)).toBe(false);
    expect(library.length).toBeLessThanOrEqual(5);
    expect(materials.size).toBeLessThanOrEqual(4);
    expect(triangles).toBeLessThanOrEqual(6000);
    expect(bytes).toBeLessThanOrEqual(4 * 1024 ** 2);
    if (visit === 0) console.info("Library geometry budget", { meshes: library.length, materials: materials.size, triangles, bytes, fullRoomMeshes: meshes().length });
    const disposed = vi.fn();
    for (const resource of [map, jackets.material, jackets.geometry]) resource.addEventListener("dispose", disposed);
    leave();
    expect(disposed).toHaveBeenCalledTimes(3);
    expect(meshes()).toHaveLength(baseCount);
    expect(canvas.width).toBe(0);
  }
});

it("closes a late bitmap after departure without attaching it to the next visit", async () => {
  const room = getInterior("library")!, close = vi.fn();
  shelfRequests(["BOOK-CANT", "BOOK-OZ"]);
  let resolve!: (image: unknown) => void;
  const decode = vi.fn(() => new Promise((r) => { resolve = r; }));
  vi.stubGlobal("createImageBitmap", decode);
  const old = room.onEnter!(room.group);
  await vi.waitFor(() => expect(decode).toHaveBeenCalledOnce());
  old();
  vi.stubGlobal("createImageBitmap", async () => ({ width: 160, height: 241, close() {} }));
  const leave = room.onEnter!(room.group);
  await vi.waitFor(() => expect(room.group.getObjectByName("library-jackets")?.userData.bookIds).toEqual(["BOOK-CANT", "BOOK-OZ"]));
  resolve({ width: 160, height: 241, close });
  await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
  expect(room.group.children.filter((o) => o.name === "library-jackets")).toHaveLength(1);
  leave();
});

it("features an unfinished book from the current catalog while requesting at most four thumbnails", async () => {
  const room = getInterior("library")!;
  const fetch = shelfRequests([...ids, "BOOK-FRANK"]);
  vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({
    v: 1, items: { "book/BOOK-FRANK/author": {
      lastChapter: "BOOK-FRANK-01", chapters: { "BOOK-FRANK-01": {
        sentence: "BOOK-FRANK-01-S001", leg: "lt", offsetSec: 2, fraction: 0.1,
        complete: false, audioVersion: "aabbcc", updatedAt: 1,
      } },
    } },
  }) });
  vi.stubGlobal("createImageBitmap", async () => ({ width: 160, height: 241, close() {} }));
  const leave = room.onEnter!(room.group);
  try {
    await vi.waitFor(() => expect(room.group.getObjectByName("library-jackets")?.userData.bookIds)
      .toEqual(["BOOK-FRANK", "BOOK-CANT", "BOOK-NOTE", "BOOK-OZ"]));
    expect(fetch.mock.calls.filter(([url]) => url.endsWith(".160.webp"))).toHaveLength(4);
  } finally { leave(); }
});

it("leaves cloth spines in the empty stands when a thumbnail is missing", async () => {
  const room = getInterior("library")!;
  vi.stubGlobal("fetch", async (url: string) => url === "/knygos/index.json"
    ? Response.json({ books: [{ id: "BOOK-CANT" }, { id: "BOOK-OZ" }] })
    : new Response(new Blob(["cover"]), { status: url.includes("BOOK-CANT") ? 404 : 200 }));
  const close = vi.fn();
  vi.stubGlobal("createImageBitmap", async () => ({ width: 160, height: 241, close }));
  const leave = room.onEnter!(room.group);
  try {
    await vi.waitFor(() => expect(room.group.getObjectByName("library-jackets")?.userData.bookIds).toEqual(["BOOK-OZ"]));
    expect(room.group.getObjectByName("library-furniture")).toBeDefined();
    expect(close).toHaveBeenCalledOnce();
  } finally { leave(); }
});
