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

it("uses the Shift-arrow aim increment while LB is held", async () => {
  const { mode, debug, clockUntil } = game();
  const angle = () => debug.state()!.angle;
  const degrees = (from: number) => (angle() - from) * 180 / Math.PI;
  try {
    mode.start("solids");
    await clockUntil("break");
    const start = angle();
    mode.padTick(null, PadButton.LB, 0, 0, 0, PadButton.LB);
    expect(angle()).toBe(start);
    mode.padTick(null, 0, 0, 0, PadButton.Right, PadButton.LB);
    expect(degrees(start)).toBeCloseTo(-0.1);
    mode.input({ kind: "key", key: "arrowleft", repeat: false, keys: new Set(), shift: true });
    expect(angle()).toBeCloseTo(start);
    mode.padTick(null, 0, PadButton.LB, 0, PadButton.Left, 0);
    expect(degrees(start)).toBeCloseTo(0.5);
  } finally {
    mode.exit();
  }
});

it("releases a shot from its own input and cancels only the pad charge on pad loss", async () => {
  const { mode, clockUntil } = game();
  const space = () => mode.input({ kind: "key", key: " ", repeat: false, keys: new Set() });
  const pad = (down: boolean) => mode.padTick(null, down ? PadButton.A : 0, down ? 0 : PadButton.A, 0, 0);
  const charge = () => mode.update({ dt: 0.35, time: 1, x: 0, y: 0, brake: false, blocked: false });
  try {
    mode.start("solids");
    await clockUntil("break");

    pad(true);
    charge();
    expect(useBilliards.getState().power).toBeGreaterThan(0);
    space();
    expect(mode.release(" ")).toBe(false);
    mode.padCancel();
    pad(false);
    expect(useBilliards.getState()).toMatchObject({ phase: "break", power: 0 });

    space();
    charge();
    pad(true);
    mode.padCancel();
    pad(false);
    expect(useBilliards.getState().phase).toBe("break");
    expect(useBilliards.getState().power).toBeGreaterThan(0);
    expect(mode.release(" ", true)).toBe(true);

    pad(true);
    charge();
    space();
    expect(mode.release(" ")).toBe(false);
    pad(false);
    expect(useBilliards.getState().phase).toBe("rolling");
  } finally {
    mode.exit();
  }
});

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
