import { afterEach, describe, expect, it, vi } from "vitest";
import type { WebGLRenderer } from "three";
import { CinemaMode } from "../src/game/cinema/mode";
import { CINEMA_SEAT, FILM_SECONDS, SHOTS } from "../src/game/cinema/program";
import { useCinema } from "../src/game/cinema/state";
import type { ModeHost } from "../src/game/kit/host";

const { pose, draw, dispose, cut, radio, audio } = vi.hoisted(() => {
  const cut = vi.fn();
  return { pose: vi.fn(), draw: vi.fn(), dispose: vi.fn(), cut, radio: { hold: vi.fn(), release: vi.fn() },
    audio: { pluck: vi.fn(() => cut), hush: vi.fn() } };
});
vi.mock("../src/game/cinema/film", () => ({ HarborFilm: class { pose = pose; draw = draw; dispose = dispose; } }));
vi.mock("../src/radio", () => ({ radio }));
vi.mock("../src/game/audio", () => ({ audio }));
vi.mock("../src/state/store", () => ({ useStore: { getState: () => ({ setHud: vi.fn() }) } }));

function theater(reduced = false) {
  let museum = false;
  const page = { hidden: false };
  vi.stubGlobal("document", page);
  vi.stubGlobal("matchMedia", () => ({ matches: reduced }));
  const player = { setAnim: vi.fn(), seatY: 0.5 };
  const host = { player: () => player, canStart: () => true, entered: vi.fn(), left: vi.fn(), place: vi.fn(),
    prepare: vi.fn(), rides: {} };
  const mode = new CinemaMode(host as unknown as ModeHost, () => museum);
  expect(mode.start()).toBe(false);
  museum = true;
  const renderer = { getPixelRatio: () => 1 } as WebGLRenderer;
  return { mode, host, page, player, frame: (dt: number, width = 390) => mode.project(renderer, width, 664, dt) };
}

afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe("the museum theater", () => {
  it("starts from the bench and releases the seat, scene and sound on skip or completion", () => {
    const { mode, host, player, frame } = theater();
    expect(mode.prompt(0, 0)).toBeNull();
    expect(mode.prompt(CINEMA_SEAT.approachX, CINEMA_SEAT.z)?.kind).toBe("cinema");
    expect(mode.conversation.situation).toBe("x09-box-office");
    for (const skip of [true, false]) {
      expect(mode.start()).toBe(true);
      expect(mode.start()).toBe(false);
      expect(player.setAnim).toHaveBeenLastCalledWith("sit");
      expect(radio.hold).toHaveBeenLastCalledWith("cinema", true);
      frame(0);
      if (skip) mode.input({ kind: "key", key: "escape", repeat: false, keys: new Set() });
      else frame(FILM_SECONDS);
      expect(mode.active).toBe(false);
      expect(player.seatY).toBe(0.5);
      expect(host.place).toHaveBeenLastCalledWith(CINEMA_SEAT.approachX, CINEMA_SEAT.z, CINEMA_SEAT.heading);
      expect(radio.release).toHaveBeenLastCalledWith("cinema");
    }
    mode.dispose();
    expect(dispose).toHaveBeenCalledTimes(2);
    expect(host.left).toHaveBeenCalledTimes(2);
    expect(cut).toHaveBeenCalledTimes(2);
  });

  it("holds each storyboard pose, repaints on rotation and freezes the clock while paused or hidden", () => {
    const { mode, page, frame } = theater(true);
    mode.start(); frame(0); frame(1); frame(1);
    expect(draw).toHaveBeenCalledTimes(1);
    frame(0, 844);
    expect(draw).toHaveBeenCalledTimes(2);
    mode.action("pause"); frame(85);
    expect(useCinema.getState().title).toBe(true);
    page.hidden = true; mode.action("pause"); frame(85);
    page.hidden = false; frame(3);
    expect(pose.mock.lastCall?.slice(0, 2)).toEqual([SHOTS[1].still, 1]);
    expect(useCinema.getState().title).toBe(false);
    frame(1);
    expect(pose).toHaveBeenCalledTimes(2);
    frame(70);
    expect(mode.active).toBe(false);
  });
});
