import { Group } from "three";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { audio } from "../src/game/audio";
import { BilliardsMode } from "../src/game/billiards/mode";
import { useBilliards, type Phase } from "../src/game/billiards/store";
import type { TableView } from "../src/game/billiards/table";
import { CameraRig } from "../src/game/camera";
import type { GameCharacter } from "../src/game/characters";
import type { ModeHost } from "../src/game/kit/host";
import { PadButton } from "../src/game/padButtons";

function game() {
  const noop = () => {};
  const player = { root: new Group(), height: 1.7 } as GameCharacter;
  const tina = { root: new Group(), height: 1.65, rightHand: new Group(), talk: noop, update: noop } as unknown as GameCharacter;
  const rig = new CameraRig(1280 / 800);
  const mode = new BilliardsMode({
    player: () => player, rig, canStart: () => true, prepare: noop, entered: noop, left: noop,
    scoreShot: () => null, updatePose: noop, time: () => 1,
  } as unknown as ModeHost, {
    table: () => ({ setRack: noop, hideAim: noop, indicate: noop, markCall: noop, sync: noop, drawAim: noop, drawCue: noop }) as unknown as TableView,
    tina: () => tina, place: (x, z, rot) => { player.root.position.set(x, 0, z); player.root.rotation.y = rot; }, save: noop,
  });
  const debug = mode.debug()!;
  async function clockUntil(...phases: Phase[]) {
    for (let i = 0; i < 250 && !phases.includes(useBilliards.getState().phase); i++) {
      mode.update({ dt: 0.05, blocked: false, time: i * 0.05, x: 0, y: 0, brake: false });
      await Promise.resolve();
    }
    expect(phases).toContain(useBilliards.getState().phase);
    return debug.state()!;
  }
  return { mode, debug, clockUntil, rig, player, tina };
}

beforeEach(() => {
  vi.stubGlobal("document", { hidden: false });
  vi.stubGlobal("window", { innerWidth: 1280, innerHeight: 800 });
  vi.spyOn(audio, "play").mockResolvedValue(true);
  vi.spyOn(audio, "stop").mockImplementation(() => {});
  vi.spyOn(audio, "sfx").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("chooses a group by tapping a voiced example and plays Tina's two call pieces in order", async () => {
  const { mode, debug, clockUntil } = game();
  try {
    expect(mode.conversation).toEqual({ situation: "x01-pool-hall", label: "Žaisti biliardą" });
    expect(mode.event("billiards", { group: "solids" })).toBe("solids");
    expect(mode.start()).toBe(true);
    expect((await clockUntil("group")).choices.map(({ key }) => key)).toEqual(["h_solids", "h_stripes"]);
    mode.action("choice", "h_stripes");
    expect(await clockUntil("break")).toMatchObject({ group: "stripes", shots: 0 });
    debug.shoot(0.08);
    debug.settle();
    const listening = await clockUntil("listen");
    expect(listening).toMatchObject({ side: "tina", reveal: true, shots: 0 });
    expect(listening.call?.pieces).toHaveLength(2);
    expect(vi.mocked(audio.play).mock.calls.slice(-2).map((args) => args[2])).toEqual(listening.call?.pieces?.map((piece) => piece.say));
    mode.action("ball", String(listening.ai!.ball));
    mode.action("pocket", listening.ai!.pocket);
    expect(debug.state()?.correct).toBe(true);
    await clockUntil("rolling");
    debug.settle();
    await clockUntil("call", "listen");
  } finally {
    mode.exit();
  }
  expect(debug.state()).toBeNull();
});

it("fits the entire rail box and clears the actors while aiming at all three sizes", async () => {
  const { mode, debug, rig, player, tina, clockUntil } = game();
  try {
    mode.start("solids");
    await clockUntil("break");
    rig.update(0.05, 0, false, true, true);
    for (const [w, h, footer] of [[1280, 800, 173], [390, 844, 248], [390, 664, 264]]) {
      Object.assign(window, { innerWidth: w, innerHeight: h });
      rig.cam.aspect = w / h;
      const rect = { left: 14, top: 98, width: w - 70, height: h - 98 - footer };
      mode.frameView(w, h, rect as DOMRect);
      const { table } = debug.state()!;
      expect(table.left).toBeGreaterThan(rect.left);
      expect(table.right).toBeLessThan(rect.left + rect.width);
      expect(table.top).toBeGreaterThan(rect.top);
      expect(table.bottom).toBeLessThan(h - footer);
      expect(table.height).toBeGreaterThan(table.width);
      // Simulate a character crossing the table-facing camera ray during a slide.
      player.root.position.set(0, 0, 0.85);
      tina.root.position.set(0.6, 0, 0.85);
      mode.frameView(w, h, rect as DOMRect);
      expect(player.root.visible).toBe(false);
      expect(tina.root.visible).toBe(false);
    }
  } finally {
    mode.exit();
  }
  expect(player.root.visible && tina.root.visible).toBe(true);
});

it("publishes the current Space charge on both sides of the peak and fires on release", async () => {
  const { mode, debug, clockUntil } = game();
  try {
    mode.start("solids");
    await clockUntil("break");
    expect(mode.input({ kind: "key", key: " ", repeat: false, keys: new Set() })).toBe(true);
    const step = (frames: number) => {
      for (let i = 0; i < frames; i++) mode.update({ dt: 0.05, time: i * 0.05, x: 0, y: 0, brake: false, blocked: false });
      return useBilliards.getState().power;
    };
    expect(step(12)).toBeCloseTo(0.5);
    expect(step(12)).toBeCloseTo(1);
    expect(step(12)).toBeCloseTo(0.5);
    expect(mode.release(" ")).toBe(true);
    expect(debug.state()?.phase).toBe("rolling");
  } finally {
    mode.exit();
  }
});

it("applies fine aim and releases or cancels only the source that owns the power", async () => {
  const { mode, debug, clockUntil } = game();
  const sample = (pressed = 0, released = 0, direction = 0, held = pressed) => mode.padTick(null, pressed, released, 0.05, direction, held);
  const space = { kind: "key", key: " ", repeat: false, keys: new Set<string>() } as const;
  const step = () => mode.update({ dt: 0.12, time: 1, x: 0, y: 0, brake: false, blocked: false });
  try {
    mode.start("solids");
    await clockUntil("break");
    const angle = debug.state()!.angle;
    sample(0, 0, PadButton.Right, PadButton.LB);
    expect(debug.state()!.angle).toBeCloseTo(angle - 0.1 * Math.PI / 180, 8);
    sample(0, 0, PadButton.Left);
    expect(debug.state()!.angle).toBeCloseTo(angle + 0.4 * Math.PI / 180, 8);

    sample(PadButton.A);
    mode.input(space);
    step();
    // A pad charge paints the meter directly and publishes the store once, when it ends (no React update per frame):
    // the mode's own power (the debug state) carries it meanwhile.
    expect(debug.state()!.power).toBeCloseTo(0.1);
    expect(useBilliards.getState().power).toBe(0);
    expect(mode.release(" ")).toBe(false);
    mode.padCancel();
    sample(0, PadButton.A);
    expect(useBilliards.getState()).toMatchObject({ phase: "break", power: 0 });

    mode.input(space);
    sample(PadButton.A);
    step();
    mode.padCancel();
    sample(0, PadButton.A);
    expect(useBilliards.getState()).toMatchObject({ phase: "break" });
    expect(useBilliards.getState().power).toBeCloseTo(0.1);
    expect(mode.release(" ", true)).toBe(true);

    mode.action("power-start");
    mode.action("power", "0.5");
    sample(PadButton.A);
    step();
    mode.padCancel();
    sample(0, PadButton.A);
    expect(useBilliards.getState()).toMatchObject({ phase: "break", power: 0.5 });
    mode.action("power", "0");
    mode.action("power-end");

    sample(PadButton.A);
    step();
    sample(0, PadButton.A);
    expect(useBilliards.getState().phase).toBe("rolling");
    expect(sample(0, PadButton.A)).toBeUndefined();
  } finally {
    mode.exit();
  }
});
