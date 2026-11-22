import { expect, it, vi } from "vitest";
import { Group, PerspectiveCamera, Vector3 } from "three";
import { BARISTA_ORDERS, type Row } from "../src/content/barista";
import { loadSituation } from "../src/content/situations/catalog";
import { COUNTER_SEAT, MIA_ASIDE, counterDetails, fitCounterView } from "../src/game/barista/framing";
import { createBaristaMode, BARISTA_PROMPT } from "../src/game/barista/mode";
import { CUP_AT, CUP_SERVED } from "../src/game/barista/props";
import { useBarista } from "../src/game/barista/store";
import { createCharacter, type GameCharacter } from "../src/game/characters";
import { FrameFade } from "../src/game/kit/frameFade";
import type { ModeHost } from "../src/game/kit/host";
import { ModeRegistry, type ModeScreen } from "../src/game/kit/modes";
import { coachVoice, npcVoice } from "../src/content/voices";
import { NPCS } from "../src/content/npcs";
import { EDITION } from "../src/edition";
import { useStore } from "../src/state/store";

const es = EDITION.id === "es";
const playback = vi.hoisted(() => vi.fn(async (..._args: unknown[]) => true));
const sfx = vi.hoisted(() => vi.fn());
vi.mock("../src/game/audio", () => ({
  audio: { sfx, clipDuration: () => 1, play: playback, stop: () => {}, getState: () => "playing" },
}));
vi.mock("../src/game/characters", async () => {
  const { Group } = await import("three");
  return { createCharacter: (look: (typeof NPCS)[string]["look"]) => {
    const root = new Group();
    const rightHand = new Group();
    root.add(rightHand);
    return {
      root, rightHand, height: 1.75 * (look.height ?? 1), anim: "idle", update() {}, talk() {},
      setAnim(this: GameCharacter, anim: GameCharacter["anim"]) { this.anim = anim; },
    };
  } };
});

it("runs the counter offer, guided correction, concealed order, scoring and cleanup through the mode registry", async () => {
  vi.stubGlobal("document", { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {} }) }) });
  const player = createCharacter(NPCS.rosa.look);
  const mia = createCharacter(NPCS.mia.look);
  const staff = new Vector3(-1.2, 0, -4.2);
  mia.root.position.copy(staff);
  mia.busy = "wipe";
  const room = new Group(), oldProps = new Group();
  oldProps.name = "sunny-cup-counter-props";
  room.add(oldProps);
  let screen: ModeScreen | null = null;
  const registry = new ModeRegistry({ read: () => screen, set: (value) => { screen = value; } });
  let opacity = 0;
  const fade = new FrameFade((value) => { opacity = value; });
  const rig = { stage: null, mode: "interior", stageSnap() {}, cam: new PerspectiveCamera() };
  const host = {
    player: () => player, rig, prepare() {}, updatePose() {}, canStart: () => !fade.active,
    entered: (id: string) => registry.entered(id), left: (id: string) => registry.left(id), owns: (id: string) => registry.owns(id),
    fade: (fn: () => void) => { fade.start(fn); return true; },
  } as unknown as ModeHost;
  const place = (x: number, z: number, yaw = 0) => {
    player.root.position.set(x, 0, z);
    player.root.rotation.y = yaw;
    rig.mode = "interior";
  };
  const savedPlace = vi.fn();
  const mode = createBaristaMode(host, { place, room: () => room, mia: () => mia, savePlace: savedPlace });
  registry.register(mode);
  place(BARISTA_PROMPT.x, BARISTA_PROMPT.z);
  const ui = useBarista.getState;
  let time = 0;
  const frame = async () => {
    time += 0.05;
    fade.update(0.05);
    registry.tick(0.05, false);
    registry.update({ dt: 0.05, time, x: 0, y: 0, brake: false, blocked: fade.active });
    await Promise.resolve();
  };
  const until = async (ready: () => boolean) => {
    for (let i = 0; i < 150 && !ready(); i++) await frame();
    expect(ready(), JSON.stringify(mode.state())).toBe(true);
  };
  const choose = async (key: string) => {
    await until(() => ui().choices.some((line) => line.key === key));
    mode.action("choose", key);
  };
  const pick = (row: Row, id: string) => mode.action(row, id);
  const views = [[390, 664, 285], [390, 844, 465], [1280, 800, 497]];
  const aimAtStage = (width: number, height: number) => {
    const { cam, stage } = host.rig;
    cam.fov = width / height < 0.87 ? 62 : 55;
    cam.position.copy(stage!.pos);
    cam.lookAt(stage!.look);
    return cam;
  };
  const pixel = (point: Vector3, cam: PerspectiveCamera, width: number, height: number) => {
    const { x, y } = point.clone().project(cam);
    return { x: (1 + x) * width / 2, y: (1 - y) * height / 2 };
  };
  try {
    expect(registry.prompt(BARISTA_PROMPT.x, BARISTA_PROMPT.z, Infinity, true)).toBeNull();
    useStore.getState().updateProgress((p) => { p.sits["s72-cafe"] = { visits: 1, completions: 1, used: [], twists: [], memory: {} }; });
    expect(registry.offer("s72-cafe")).toMatchObject({ id: "barista" });
    expect(registry.prompt(BARISTA_PROMPT.x, BARISTA_PROMPT.z, Infinity, true)?.kind).toBe("barista");
    expect(registry.start("barista")).toBe(true);
    expect(ui().line).toBeNull();
    await loadSituation("s72-cafe");
    await until(() => ui().line?.key === "bs_offer");
    if (EDITION.helper === "lt") expect(ui().line?.sentence.nat).toBe("Norite pabandyti pabūti už prekystalio?");
    place(0, 4);
    await until(() => mode.state() === null);
    place(BARISTA_PROMPT.x, BARISTA_PROMPT.z);
    expect(registry.start("barista")).toBe(true);
    // The clip can stall even while the browser reports it playing. Intro still advances on frames.
    playback.mockImplementationOnce(() => new Promise(() => {}));
    mode.action("start");
    expect(mode.state()).toEqual({ step: "starting" });
    for (let i = 0; i < 5; i++) await frame();
    expect(player.root.position.z).toBe(BARISTA_PROMPT.z);
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
    await until(() => mode.active);
    expect(opacity).toBe(1);
    expect(player.root.position).toEqual(staff);
    expect(player.root.rotation.y).toBe(0);
    expect(rig.mode).toBe("stage");
    const rosa = room.getObjectByName("barista-rosa")!;
    expect(rosa.position.z).toBe(5.8);
    await until(() => ui().choices[0]?.key === "bs_a_hi");
    const menu = ui().menu!;
    expect([...menu.dine.map(({ lt }) => lt), menu.milk.find(({ id }) => id === "none")?.lt])
      .toEqual(EDITION.helper === "lt" ? ["čia", "išsinešti", "be pieno"] : ["for here", "to go", "no milk"]);
    expect(opacity).toBe(0);
    expect(screen).toMatchObject({ id: "barista", kind: "menu" });
    expect(oldProps.visible).toBe(false);
    expect(mia.root.visible && player.root.visible).toBe(true);
    expect(mia.root.position).toEqual(MIA_ASIDE);
    expect(rosa.position).toEqual(COUNTER_SEAT);
    expect(Math.cos(rosa.rotation.y)).toBeLessThan(-0.99);

    for (const [i, order] of BARISTA_ORDERS.entries()) {
      await choose("bs_a_hi");
      if (i < 4) {
        for (const [j, piece] of order.pieces.entries()) {
          await until(() => ui().step === "order" && ui().ready && mode.state()?.piece === j);
          expect(ui().highlight?.id).toBe(i < 2 ? piece.id : undefined);
          sfx.mockClear();
          pick(piece.row, piece.id);
          expect(sfx).toHaveBeenCalledExactlyOnceWith("tick");
        }
      } else {
        await until(() => ui().step === "build" && ui().ready);
        expect(ui()).toMatchObject({ tray: true, revealed: false, line: null });
        expect(ui().menu?.drink).toHaveLength(es ? 7 : 8);
        expect(ui().hiddenOrder).toHaveLength(order.pieces.length);
        mode.action("show");
        expect(ui().revealed).toBe(true);
        mode.action("hear");
        expect(ui().step).toBe("order");
        await until(() => ui().step === "build" && ui().ready);
        sfx.mockClear();
        for (const piece of order.pieces) pick(piece.row, piece.id);
        expect(sfx).not.toHaveBeenCalled();
      }
      if (i === 0) {
        const { stage } = host.rig;
        const cup = room.getObjectByName("barista-serving")!.position;
        const customerHeight = 1.75 * (NPCS.rosa.look.height ?? 1);
        const customerFace = rosa.position.clone().setY(customerHeight * 0.91);
        const miaFace = mia.root.position.clone().setY(mia.height * 0.91);
        expect(stage!.pos.z).toBeLessThan(staff.z);
        for (const [width, height, freeBottom] of views) {
          const cam = aimAtStage(width, height);
          const bottom = Math.min(freeBottom, height - Math.min(width <= 600 ? 350 : 325, height * 0.54));
          const wide = fitCounterView(cam, width, height, bottom, counterDetails(customerHeight, mia.height));
          const wideProjection = cam.projectionMatrix.toArray();
          mode.frameView(width, height, freeBottom);
          if (height === 844) {
            const zoomRatio = cam.zoom / wide.zoom;
            expect(zoomRatio).toBeGreaterThan(1.1);
            expect(zoomRatio).toBeLessThan(1.18);
            const nearCounterEdge = pixel(CUP_AT.clone().setZ(-3.81), cam, width, height);
            expect(nearCounterEdge.x).toBeGreaterThan(0);
            expect(nearCounterEdge.x).toBeLessThan(width);
            expect(nearCounterEdge.y).toBeGreaterThan(pixel(cup, cam, width, height).y);
            expect(nearCounterEdge.y).toBeLessThan(freeBottom);
          } else {
            expect(cam.projectionMatrix.toArray()).toEqual(wideProjection);
          }
          for (const position of [cup, customerFace, miaFace]) {
            const { x, y } = pixel(position, cam, width, height);
            expect(x).toBeGreaterThan(0);
            expect(x).toBeLessThan(width);
            expect(y).toBeGreaterThan(60);
            expect(y).toBeLessThan(freeBottom - 20);
          }
          expect(pixel(customerFace, cam, width, height).y).toBeLessThan(freeBottom / 2);
          const separation = Math.abs(customerFace.clone().project(cam).x - miaFace.clone().project(cam).x);
          expect(separation / 2).toBeGreaterThanOrEqual(0.15);
        }
        sfx.mockClear();
        pick("size", "large");
        expect(sfx).not.toHaveBeenCalled();
        mode.action("give");
        expect(ui().line?.key).toBe("bs_c_sorry");
        await until(() => ui().step === "build" && ui().ready);
        expect(ui().highlight?.id).toBe("medium");
        pick("size", "medium");
        expect(sfx).toHaveBeenCalledExactlyOnceWith("tick");
      }
      const drink = room.getObjectsByProperty("name", "barista-serving").find((item) => item.position.equals(CUP_AT))!;
      expect(drink).toBeDefined();
      const [width, height, trayTop] = views[i % views.length];
      const cam = aimAtStage(width, height);
      mode.frameView(width, height, trayTop);
      const orderLens = cam.projectionMatrix.toArray(), orderZoom = cam.zoom;
      mode.action("give");
      expect(ui().step).toBe("handover");
      mode.frameView(width, height, height);
      expect(cam.projectionMatrix.toArray()).toEqual(orderLens);

      await until(() => !drink.position.equals(CUP_AT));
      mode.frameView(width, height, height);
      const slideLens = cam.projectionMatrix.toArray();
      if (width <= 600) expect(cam.zoom).toBeGreaterThan(orderZoom);
      else expect(slideLens).toEqual(orderLens);
      const face = COUNTER_SEAT.clone().setY(1.75 * (NPCS[order.npc].look.height ?? 1) * 0.91);
      const faceY = pixel(face, cam, width, height).y;
      for (const point of [CUP_AT, CUP_SERVED]) {
        const projected = pixel(point, cam, width, height);
        expect(projected.x).toBeGreaterThan(0);
        expect(projected.x).toBeLessThan(width);
        expect(projected.y).toBeGreaterThan(faceY);
        expect(projected.y).toBeLessThan(height * 0.77);
      }
      await until(() => ui().price === order.price);
      mode.frameView(width, height, height - 150);
      expect(cam.projectionMatrix.toArray()).toEqual(slideLens);
      expect(drink.position.distanceTo(CUP_SERVED)).toBeLessThan(0.001);
      await choose(order.priceLine);
      await choose("bs_a_welcome");
    }

    await until(() => ui().result?.served === 6);
    expect(ui().result).toMatchObject({ firstTime: 5, served: 6 });
    expect(mia.root.position).toEqual(COUNTER_SEAT);
    for (const [width, height] of views) {
      const cardTop = height - 300;
      const cam = aimAtStage(width, height);
      mode.frameView(width, height, cardTop);
      const { x, y } = pixel(mia.root.position.clone().setY(mia.height * 0.91), cam, width, height);
      expect(x).toBeGreaterThan(width * 0.25);
      expect(x).toBeLessThan(width * 0.75);
      expect(y).toBeGreaterThan(60);
      expect(y).toBeLessThan(cardTop / 2);
    }
    expect(playback).toHaveBeenCalledWith(npcVoice(NPCS.mia), 1, es ? "¿Quiere probar de este lado de la barra?" : "Want to try my side of the counter?", expect.anything());
    expect(playback).toHaveBeenCalledWith(coachVoice("f"), 1, es ? "Ay, perdón, eso no es lo que pedí." : "Oh, sorry, that's not what I ordered.", expect.anything());
    expect(playback).toHaveBeenCalledWith(coachVoice("m"), 1, es ? "Quisiera un capuchino, por favor." : "I'd like a cappuccino, please.", expect.anything());
    expect(playback).toHaveBeenCalledWith(coachVoice("m"), 1, es ? "¡Muchas gracias!" : "Thank you very much!", expect.anything());
    mode.action("again");
    await until(() => ui().choices[0]?.key === "bs_a_hi");
    expect(mode.state()).toMatchObject({ customer: 1, wrong: 0, served: 0, help: 0 });
    registry.exit();
    await until(() => !fade.active);
    expect(mode.state()).toBeNull();
    expect(screen).toBeNull();
    expect(room.children).toEqual([oldProps]);
    expect(oldProps.visible && mia.root.visible && player.root.visible).toBe(true);
    expect(player.root.position.z).toBe(BARISTA_PROMPT.z);
    expect(mia.root.position).toEqual(staff);
    expect(mia.busy).toBe("wipe");
    expect(rig.mode).toBe("interior");
    expect(rig.cam.zoom).toBe(1);
    expect(savedPlace).toHaveBeenCalledOnce();
  } finally {
    registry.dispose();
    vi.unstubAllGlobals();
  }
});
