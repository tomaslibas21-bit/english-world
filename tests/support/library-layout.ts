import { Box3, Group, Matrix4, Mesh, Light, Raycaster, Vector3, type MeshBasicMaterial, type MeshLambertMaterial, type BufferGeometry } from "three";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useStore } from "../../src/state/store";
import { hasLibraryShelf, LIBRARY_PROFILE, LIBRARY_COPY } from "../../src/content/library";
import { LOCATIONS } from "../../src/content/locations";
import { iconForEmoji } from "../../src/ui/icons";
import { Game } from "../../src/game/Game";
import { readingHeadphones, readingSeatShot } from "../../src/game/library/readingSeat";
import { Gait, Hop, Steer } from "../../src/game/movement";
import { audio } from "../../src/game/audio";
import { coach } from "../../src/game/coach";
import { Character } from "../../src/game/characters/Character";
import { Guidance } from "../../src/game/guidance";
import { CameraRig } from "../../src/game/camera";
import { NavGrid } from "../../src/game/nav";
import { BUILDINGS, ROADS, WORLD } from "../../src/game/world/layout";
import { buildTownField, buildTownLedges, TOWN_WEST } from "../../src/game/townCollision";
import { THEME } from "../../src/game/world/theme";
import { buildTown } from "../../src/game/world/town";
import { getInterior } from "../../src/game/world/interiors";
import { LIBRARY_CHAIRS, LIBRARY_STOPS } from "../../src/game/world/libraryRoom";
import { townCanvasDocument } from "../../tools/town-canvas-stub";

vi.mock("../../src/content/library", async (original) => ({
  ...await original<typeof import("../../src/content/library")>(), LIBRARY_ENABLED: true,
}));
vi.mock("../../src/state/store", async (load) => {
  const store = await load<typeof import("../../src/state/store")>();
  type State = ReturnType<typeof store.useStore.getState>;
  return { ...store, useStore: Object.assign((select: (state: State) => unknown) => select(store.useStore.getState()), store.useStore) };
});

beforeEach(() => vi.stubGlobal("document", townCanvasDocument()));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

export function checkLibraryLayer(profile: "sme-en" | "sm-lt", name: string, browse: string) {
  it("renders one bilingual touch action on each side of the library door", async () => {
    vi.stubGlobal("location", { search: "" });
    const { Hud } = await import("../../src/ui/Hud");
    vi.stubGlobal("window", { innerWidth: 390, innerHeight: 844, matchMedia: (q: string) => ({ matches: q.includes("portrait") }) });
    const prior = useStore.getState().hud;
    const p = new Vector3(22, 0, 46.8);
    const enterDoor = vi.fn(), exitInterior = vi.fn();
    const game: Game = Object.assign(Object.create(Game.prototype), {
      player: { root: { position: p } }, zone: { id: "town" }, npcs: [], staff: [], rides: { near: () => null },
      town: { doors: [{ loc: "library", name: LOCATIONS.library.name, outX: p.x, outZ: p.z }] },
      hop: new Hop(), diveK: 0, modes: { prompt: () => null }, routeVisualTarget: () => null,
      guidanceTarget: () => null, saveAtHudTick: () => {}, enterDoor, exitInterior,
    });
    vi.spyOn(audio, "sfx").mockImplementation(() => {});
    const lt = profile === "sm-lt";
    try {
      useStore.getState().setHud({ showTouch: true, objective: null });
      for (const side of ["enter", "exit"]) {
        game["updateHud"]();
        const gloss = side === "enter" ? (lt ? "Įeiti į Kolibrių uosto biblioteką" : "Enter the Puerto Colibrí Library")
          : (lt ? "Išeiti iš Kolibrių uosto bibliotekos" : "Leave the Puerto Colibrí Library");
        expect(useStore.getState().hud.prompt?.kind).toBe(side);
        const html = renderToStaticMarkup(createElement(Hud));
        expect(html.match(/<button[^>]*data-library-door="true"/g)).toHaveLength(1);
        expect(html).toContain(`lang="es">Biblioteca de Puerto Colibrí<small lang="${lt ? "lt" : "en"}">${gloss}</small>`);
        expect(html).not.toContain('class="act-btn"');
        game.interact();
        Object.assign(game, { zone: { id: "library", interior: { exit: { x: 0, z: 4.8 } } } });
        p.set(0, 0, 4.4);
      }
      expect(enterDoor).toHaveBeenCalledExactlyOnceWith("library");
      expect(exitInterior).toHaveBeenCalledOnce();
    } finally { useStore.getState().setHud(prior); }
  });

  it("opens only with this learner's course or review shelf", () => {
    const other = profile === "sm-lt" ? "sme-en" : "sm-lt";
    const root = "https://audio.dvikalbesdainos.lt/spanish-master";
    expect(LIBRARY_PROFILE).toBe(profile);
    expect(hasLibraryShelf({})).toBe(false);
    expect(hasLibraryShelf({ VITE_RADIO_FILES: profile === "sm-lt" ? root : root + "-en" })).toBe(true);
    expect(hasLibraryShelf({ VITE_RADIO_FILES: profile === "sm-lt" ? root + "-en" : root })).toBe(false);
    expect(hasLibraryShelf({ VITE_BOOK_REVIEW: "1", VITE_BOOK_PROFILE: profile, VITE_RADIO_FILES: "/__files/" + profile })).toBe(true);
    expect(hasLibraryShelf({ VITE_BOOK_REVIEW: "1", VITE_BOOK_PROFILE: other, VITE_RADIO_FILES: "/__files/" + other })).toBe(false);
    expect(LOCATIONS.library).toMatchObject({ name: "Biblioteca de Puerto Colibrí", lt: name, district: "residential", kind: "interior" });
    expect(LIBRARY_COPY.browse).toEqual({ label: "Explorar libros", lt: browse });
  });
}

it("reaches the library from Calle Hidalgo and keeps both bus bays and their approaches clear", () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const town = buildTown();
  expect(fetch).not.toHaveBeenCalled();
  expect(BUILDINGS.filter((b) => b.loc === "library")).toMatchObject([{ id: "house3", x: 22, z: 54, w: 12, d: 10, face: "n", style: "civic" }]);
  expect(THEME.buildings.library).toMatchObject({ roof: "flat", trim: "#fff3e0" });
  expect(THEME.bougainvillea).toContain("house3");
  expect(iconForEmoji(LOCATIONS.library.icon)).toBe("bookOpen");
  const doors = town.doors.filter((d) => d.loc === "library");
  expect(doors).toHaveLength(1);
  const [door] = doors, station = town.doors.find((d) => d.loc === "station")!;
  expect(door).toMatchObject({ x: 22, z: 49, outX: 22, outZ: 46.8, name: LOCATIONS.library.name });
  const nav = new NavGrid(WORLD.minX - TOWN_WEST, WORLD.minZ, WORLD.maxX, WORLD.maxZ, 1, town.colliders);
  for (const [x, z] of [[station.outX, station.outZ], [22, 44.5], [22, 45.8], [22, 45.3]]) {
    expect(town.walkableAt(x, z)).toBe(true);
    expect(nav.free(nav.idx(x, z)), `${x}, ${z}`).toBe(true);
    expect(nav.path(x, z, door.outX, door.outZ)?.at(-1)).toEqual([door.outX, door.outZ]);
  }
  for (const x of [20.9, 22, 23.1]) for (let z = 43; z <= 48.6; z += 0.2)
    expect(town.colliders.blocked(x, z, 0.38), `${x}, ${z}`).toBe(false);
  for (let x = 16; x < 28; x += 0.25) expect(town.walkableAt(x, 43.4)).toBe(true);
  const signs = town.group.getObjectByName("town-signs") as Mesh<BufferGeometry, MeshBasicMaterial>;
  const keys = signs.userData.signQuads.map((q: { key: string }) => q.key);
  const signIndex = keys.indexOf(LOCATIONS.library.name);
  expect(signIndex).toBeGreaterThanOrEqual(0);
  const matrix = new Matrix4().fromArray(signs.userData.signQuads[signIndex].m);
  const eye = new Vector3(door.x, 1.65, 44.5);
  town.group.updateMatrixWorld(true);
  for (const offset of [-3, 0, 3]) {
    const toSign = new Vector3(offset, 0, 0).applyMatrix4(matrix).sub(eye);
    const ray = new Raycaster(eye, toSign.clone().normalize(), 0, toSign.length() + 0.03);
    const hit = ray.intersectObjects(town.group.children)[0];
    expect(hit?.object.name).toBe("town-signs");
    expect(Math.floor(hit.faceIndex! / 2)).toBe(signIndex);
  }
  expect(keys).toEqual(expect.arrayContaining(["coach:CANCÚN", "coach:TULUM", "anden:Andén 1", "anden:Andén 2"]));
  expect(signs.geometry.groups).toHaveLength(0);
  expect(town.group.getObjectByName("library-furniture")).toBeUndefined();
  const calls = (root: typeof town.group) => {
    let count = 0;
    root.traverse((o) => { if (o instanceof Mesh) count += Array.isArray(o.material) ? o.geometry.groups.length : 1; });
    return count;
  };
  const index = BUILDINGS.findIndex((b) => b.id === "house3"), parcel = BUILDINGS[index];
  try {
    BUILDINGS[index] = { ...parcel, loc: undefined, sign: "", color: "#d7c0e0", trim: "#ffffff", style: "house" };
    const cottage = buildTown();
    expect(calls(town.group) - calls(cottage.group)).toBeLessThanOrEqual(1);
    for (const { x: bus } of THEME.busTerminal!.buses) {
      // Removing the former cottage fence may free space on its parcel. The terminal itself stays identical.
      for (let x = bus - 6; x <= bus + 6; x += 0.5) for (let z = 34; z <= 48; z += 0.5) {
        const before = cottage.colliders.blocked(x, z, 0.38);
        if (!before || x >= 28.5 || z < 43)
          expect(town.colliders.blocked(x, z, 0.38), `bus bay at ${x}, ${z}`).toBe(before);
      }
      expect(nav.path(bus, 44.5, door.outX, door.outZ)?.at(-1)).toEqual([door.outX, door.outZ]);
    }
  } finally { BUILDINGS[index] = parcel; }
});

it("walks from the saved station start to the library using Game's own navigation and movement", () => {
  const town = buildTown();
  const nav = new NavGrid(WORLD.minX - TOWN_WEST, WORLD.minZ, WORLD.maxX, WORLD.maxZ, 1, town.colliders);
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
      ambient: { checkBump: noop, resolvePlayer: noop, resolvePeople: noop, carInWay: () => false },
      splashes: { update: noop }, dust: { update: noop, puff: noop }, pigeons: { update: noop },
      keys: new Set(), joy: { x: 0, y: 0 }, steer: new Steer(), gait: new Gait(), hop: new Hop(),
      vel: new Vector3(), moveVel: new Vector3(), tmpV: new Vector3(),
      wading: { depth: 0 }, swimK: 0, diveK: 0, diveT: 0, swimming: false,
      gaitOn: false, jogT: 0, jogDir: null, heading: 0, lastHeading: 0, lastSpeed: 0,
      stepOut: 0, stepDist: 0.6, stepN: null, washT: 0, t: 0,
      applyHop: noop, underfoot: () => "pavement",
    });
    const enter = vi.spyOn(game as unknown as { enterDoor(loc: string): void }, "enterDoor").mockImplementation(noop);
    const walk = (x: number, z: number, kind: "point" | "door") => {
      game.walkTo(x, z, { kind, id: kind === "door" ? "library" : undefined });
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

it("fits the fascia with 16 px to spare and keeps feet above the touch card on approach", () => {
  const town = buildTown(), door = town.doors.find((d) => d.loc === "library")!;
  const field = buildTownField(town);
  for (const [w, h] of [[390, 844], [390, 664], [844, 390]]) {
    const rig = new CameraRig(w / h);
    rig.resize(w, h, w > h);
    rig.libraryEntrance = door;
    rig.space = { free: (a, b) => field.free(a, b), inside: (p) => field.solidAt(p.x, p.y, p.z, 0.15),
      overSolid: (x, z) => field.overSolid(x, z) };
    rig.cam.fov = rig.fovFor(w, h, false);
    rig.cam.updateProjectionMatrix();
    rig.applyViewShift(w, h, 0, -h * (w > h ? 0.1 : 0.12));
    rig.target.set(door.x, 0, door.outZ - 4.5);
    rig.snap();
    for (const [dx, dz] of [[0, -2.4], [1.5, 0], [0, 1.5]]) {
      rig.target.set(door.x + dx, 0, door.outZ + dz);
      for (let i = 0; i < 240; i++) rig.update(1 / 60, 0, false, false, true);
      rig.cam.updateMatrixWorld();
      for (const edge of [-4.125, 4.125]) for (const y of [2.88, 3.66]) {
        const corner = new Vector3(door.x + edge, y, door.z - 0.64).project(rig.cam);
        expect((1 - Math.abs(corner.x)) * w / 2, `${w}x${h} at ${dx}, ${dz}`).toBeGreaterThanOrEqual(16);
        expect(Math.abs(corner.y)).toBeLessThan(1);
      }
      // Reserve the bottom 150 CSS pixels for the wrapped bilingual card and its inset.
      expect((1 - rig.target.clone().project(rig.cam).y) * h / 2).toBeLessThan(h - (w > h ? 100 : 150));
    }
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
  for (const [width, height] of [[390, 844], [390, 664], [844, 390], [1280, 800]]) {
    const rig = new CameraRig(width / height);
    rig.mode = "interior"; rig.interiorBounds = { w: room.w, d: room.d }; rig.interiorView = room.camera;
    rig.target.set(room.spawn.x, 0, room.spawn.z);
    rig.cam.fov = rig.fovFor(width, height, false);
    rig.cam.updateProjectionMatrix();
    rig.snap(); rig.applyPose(); rig.cam.updateMatrixWorld(true);
    for (const name of ["library-furniture", "library-lamps"]) {
      const geometry = (room.group.getObjectByName(name) as Mesh).geometry;
      const position = geometry.attributes.position;
      let maxX = 0, maxY = 0, maxZ = 0;
      for (let i = 0; i < position.count; i++) {
        const p = new Vector3().fromBufferAttribute(position, i).project(rig.cam);
        maxX = Math.max(maxX, Math.abs(p.x)); maxY = Math.max(maxY, Math.abs(p.y)); maxZ = Math.max(maxZ, Math.abs(p.z));
      }
      expect(maxX).toBeLessThan(0.98); expect(maxY).toBeLessThan(0.98); expect(maxZ).toBeLessThan(1);
    }
  }
});

it("frames the tiled bird on the back wall above the first chair and lamp", () => {
  const room = getInterior("library")!;
  const vertices = (room.group.getObjectByName("library-furniture") as Mesh).geometry.attributes.position;
  const panel = new Box3();
  for (let i = 0; i < vertices.count; i++) {
    const p = new Vector3().fromBufferAttribute(vertices, i);
    if (p.x > 1.5 && p.z < -4.9 && p.y >= 2) panel.expandByPoint(p);
  }
  const size = panel.getSize(new Vector3());
  expect(size.x).toBeCloseTo(2.4); expect(size.y).toBeCloseTo(1.2);
  expect(panel.getCenter(new Vector3()).y).toBeCloseTo(2.8);
  const chair = LIBRARY_CHAIRS[0];
  for (const [w, h] of [[390, 844], [390, 664], [844, 390], [1280, 800]]) {
    const rig = new CameraRig(w / h);
    rig.mode = "stage"; rig.stage = readingSeatShot(0, w / h, 1.95);
    rig.stageSnap(); rig.applyPose(); rig.cam.updateMatrixWorld();
    const lowest = panel.min.clone().project(rig.cam).y;
    for (const p of [panel.min, panel.max]) {
      const corner = p.clone().project(rig.cam);
      expect(Math.abs(corner.y)).toBeLessThan(1);
      expect(Math.abs(corner.x)).toBeLessThan(1);
    }
    expect(lowest).toBeGreaterThan(new Vector3(chair.x, 1.95, chair.z).project(rig.cam).y);
    expect(lowest).toBeGreaterThan(new Vector3(chair.tableX, 2, chair.tableZ).project(rig.cam).y);
  }
});

const ids = ["BK01", "BK02", "BK03", "BK04"];
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
    expect(fetch).toHaveBeenCalledWith("/art/s/books/BK01.65adb81f.160.webp", expect.anything());
    const pages = room.group.getObjectByName("library-pages") as Mesh<BufferGeometry, MeshLambertMaterial>;
    expect(pages).toBeDefined();
    expect(pages.geometry.index!.count / 3).toBe(48);
    const cover = jackets.geometry.attributes.position;
    const bottom = new Vector3().fromBufferAttribute(cover, 2), top = new Vector3().fromBufferAttribute(cover, 0);
    expect(top.distanceTo(bottom)).toBeCloseTo(1.30);
    const map = jackets.material.map!, canvas = map.image as HTMLCanvasElement;
    expect(map.image).toMatchObject({ width: 512, height: 512 });
    expect(map.generateMipmaps).toBe(false);
    const library = meshes().filter((o) => o.name.startsWith("library-"));
    const furniture = room.group.getObjectByName("library-furniture") as Mesh<BufferGeometry, MeshLambertMaterial>;
    const headphones = readingHeadphones(furniture.material);
    library.push(headphones);
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
    if (visit === 0) {
      const player = new Character({ skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" });
      player.headJoint.add(headphones);
      player.setAnim("sit"); player.update(0);
      let draws = 0;
      for (const root of [player.root, room.group]) root.traverseVisible((part) => {
        if (part instanceof Mesh) draws += Array.isArray(part.material) ? part.geometry.groups.length : 1;
      });
      expect(draws).toBeLessThanOrEqual(50);
      headphones.removeFromParent(); player.dispose();
    }
    if (visit === 0) console.info("Library geometry budget", { meshes: library.length, materials: materials.size, triangles, bytes, fullRoomMeshes: meshes().length });
    headphones.geometry.dispose();
    const disposed = vi.fn();
    for (const resource of [map, jackets.material, jackets.geometry, pages.material, pages.geometry]) resource.addEventListener("dispose", disposed);
    leave();
    expect(disposed).toHaveBeenCalledTimes(5);
    expect(meshes()).toHaveLength(baseCount);
    expect(canvas.width).toBe(0);
  }
});

it("selects each face-out jacket from the doorway and opens that book at the display", async () => {
  const room = getInterior("library")!, width = 390, height = 844;
  shelfRequests();
  vi.stubGlobal("createImageBitmap", async () => ({ width: 160, height: 241, close() {} }));
  const leave = room.onEnter!(room.group);
  try {
    await vi.waitFor(() => expect(room.group.getObjectByName("library-jackets")).toBeDefined());
    const jackets = room.group.getObjectByName("library-jackets") as Mesh;
    const rig = new CameraRig(width / height);
    rig.mode = "interior"; rig.interiorView = room.camera;
    rig.interiorBounds = { w: room.w, d: room.d };
    rig.target.set(0, 0, 3.4);
    rig.cam.fov = rig.fovFor(width, height, false);
    rig.cam.updateProjectionMatrix(); rig.snap(); rig.applyPose(); rig.cam.updateMatrixWorld(true);
    room.group.updateMatrixWorld(true);
    const walkTo = vi.fn(), shelf = vi.fn();
    const game: Game = Object.assign(Object.create(Game.prototype), {
      zone: { id: "library", group: room.group }, rig, raycaster: new Raycaster(), rides: {}, modes: {}, walkTo,
      renderer: { domElement: { getBoundingClientRect: () => ({ width, height, left: 0, top: 0 }) } }, onLibraryShelf: shelf,
    });
    for (const [i, bookId] of ids.entries()) {
      const vertices = jackets.geometry.attributes.position;
      const center = new Vector3().fromBufferAttribute(vertices, i * 4)
        .lerp(new Vector3().fromBufferAttribute(vertices, i * 4 + 3), 0.5).project(rig.cam);
      game["onClick"]((center.x + 1) * width / 2, (1 - center.y) * height / 2);
      const { x, z } = LIBRARY_STOPS[0].approach;
      expect(walkTo).toHaveBeenLastCalledWith(x, z, { kind: "library", id: "display", bookId });
      game["autoTarget"] = walkTo.mock.lastCall![2];
      game["arrived"]();
      expect(shelf).toHaveBeenLastCalledWith(bookId);
    }
  } finally { leave(); }
});

it("enlarges every jacket over the last two metres and returns to the doorway view on retreat", async () => {
  const room = getInterior("library")!, stop = LIBRARY_STOPS[0].approach;
  shelfRequests();
  vi.stubGlobal("createImageBitmap", async () => ({ width: 160, height: 250, close() {} }));
  const leave = room.onEnter!(room.group);
  try {
    await vi.waitFor(() => expect(room.group.getObjectByName("library-jackets")).toBeDefined());
    const vertices = (room.group.getObjectByName("library-jackets") as Mesh).geometry.attributes.position;
    for (const [w, h] of [[390, 844], [390, 664], [844, 390], [1280, 800]]) {
      const rig = new CameraRig(w / h);
      rig.mode = "interior"; rig.interiorView = room.camera;
      rig.cam.fov = rig.fovFor(w, h, false); rig.cam.updateProjectionMatrix();
      rig.target.set(room.spawn.x, 0, room.spawn.z); rig.snap();
      const widths = (z: number) => {
        rig.target.set(stop.x, 0, z);
        for (let i = 0; i < 120; i++) rig.update(1 / 60, 0, false, false, true);
        rig.cam.updateMatrixWorld();
        return ids.map((_, i) => {
          const corners = [0, 1, 2, 3].map((j) => new Vector3().fromBufferAttribute(vertices, i * 4 + j).project(rig.cam));
          expect(corners.every((p) => Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && Math.abs(p.z) < 1)).toBe(true);
          return Math.min(corners[1].x - corners[0].x, corners[3].x - corners[2].x) * w / 2;
        });
      };
      const wide = widths(stop.z + 2), halfway = widths(stop.z + 1), near = widths(stop.z + 0.3);
      const retreat = widths(stop.z + 2);
      for (const i of ids.keys()) {
        expect(halfway[i]).toBeGreaterThan(wide[i]);
        expect(near[i]).toBeGreaterThan(halfway[i]);
        expect(near[i]).toBeGreaterThanOrEqual(w >= 1000 ? 70 : 44);
        expect(retreat[i]).toBeCloseTo(wide[i], 3);
      }
    }
  } finally { leave(); }
});

it("closes a late bitmap after departure without attaching it to the next visit", async () => {
  const room = getInterior("library")!, close = vi.fn();
  shelfRequests(["BK01", "BK03"]);
  let resolve!: (image: unknown) => void;
  const decode = vi.fn(() => new Promise((r) => { resolve = r; }));
  vi.stubGlobal("createImageBitmap", decode);
  const old = room.onEnter!(room.group);
  await vi.waitFor(() => expect(decode).toHaveBeenCalledOnce());
  old();
  vi.stubGlobal("createImageBitmap", async () => ({ width: 160, height: 241, close() {} }));
  const leave = room.onEnter!(room.group);
  await vi.waitFor(() => expect(room.group.getObjectByName("library-jackets")?.userData.bookIds).toEqual(["BK01", "BK03"]));
  resolve({ width: 160, height: 241, close });
  await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
  expect(room.group.children.filter((o) => o.name === "library-jackets")).toHaveLength(1);
  leave();
});

it("features an unfinished book from the current catalog while requesting at most four thumbnails", async () => {
  const room = getInterior("library")!;
  const fetch = shelfRequests([...ids, "BK05"]);
  vi.stubGlobal("localStorage", { getItem: (key: string) => key !== "ew-talk-v1:" + LIBRARY_PROFILE ? null : JSON.stringify({
    v: 1, items: { "book/BK05/standard": {
      lastChapter: "BK05-01", chapters: { "BK05-01": {
        sentence: "BK05-01-S001", leg: "es", offsetSec: 2, fraction: 0.1,
        complete: false, audioVersion: "aabbcc", updatedAt: 1,
      } },
    } },
  }) });
  vi.stubGlobal("createImageBitmap", async () => ({ width: 160, height: 241, close() {} }));
  const leave = room.onEnter!(room.group);
  try {
    await vi.waitFor(() => expect(room.group.getObjectByName("library-jackets")?.userData.bookIds)
      .toEqual(["BK05", "BK01", "BK02", "BK03"]));
    expect(fetch.mock.calls.filter(([url]) => url.endsWith(".160.webp"))).toHaveLength(4);
  } finally { leave(); }
});

it("leaves cloth spines in the empty stands when a thumbnail is missing", async () => {
  const room = getInterior("library")!;
  vi.stubGlobal("fetch", async (url: string) => url === "/knygos/index.json"
    ? Response.json({ books: [{ id: "BK01" }, { id: "BK03" }] })
    : new Response(new Blob(["cover"]), { status: url.includes("BK01") ? 404 : 200 }));
  const close = vi.fn();
  vi.stubGlobal("createImageBitmap", async () => ({ width: 160, height: 241, close }));
  const leave = room.onEnter!(room.group);
  try {
    await vi.waitFor(() => expect(room.group.getObjectByName("library-jackets")?.userData.bookIds).toEqual(["BK03"]));
    expect(room.group.getObjectByName("library-furniture")).toBeDefined();
    expect(close).toHaveBeenCalledOnce();
  } finally { leave(); }
});

it("uses a floor exit ring and zero vertical walking shift in the library, restoring the town beacon", () => {
  const guidance = new Guidance(), rig = new CameraRig(390 / 844);
  const game: Game = Object.assign(Object.create(Game.prototype), { guidance, rig, zone: { id: "library" } });
  rig.mode = "interior";
  game["showBeacon"]({ kind: "exit", x: 0, z: 4.4 });
  expect(guidance["beam"].visible).toBe(false);
  expect(guidance["gem"].visible).toBe(false);
  expect(guidance["ring"].scale.x).toBe(0.72);
  expect((guidance["ring"].material as MeshBasicMaterial).opacity).toBe(0.4);
  const shift = vi.spyOn(rig, "applyViewShift");
  game["applyWalkingViewShift"](390, 844, false);
  expect(shift).toHaveBeenLastCalledWith(390, 844, 0, 0);

  game["applyWalkingViewShift"](844, 390, false);
  expect(shift).toHaveBeenLastCalledWith(844, 390, 0, 0);
  game["zone"].id = "town";
  game["showBeacon"]({ kind: "door", x: 22, z: 46.8 });
  expect(guidance["beam"].visible).toBe(true);
  expect(guidance["gem"].visible).toBe(true);
  expect(guidance["ring"].scale.x).toBe(1);
  expect((guidance["ring"].material as MeshBasicMaterial).opacity).toBe(0.8);
});
