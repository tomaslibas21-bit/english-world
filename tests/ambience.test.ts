import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioSystem } from "../src/game/audio";

class Param {
  value = 0;
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}
class Node {
  gain = new Param();
  frequency = new Param();
  Q = new Param();
  playbackRate = new Param();
  onended: (() => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

let audio: AudioSystem;
let ctx: {
  state: string;
  currentTime: number;
  destination: Node;
  createOscillator: ReturnType<typeof vi.fn>;
  createGain: ReturnType<typeof vi.fn>;
  createBiquadFilter: ReturnType<typeof vi.fn>;
  createBufferSource: ReturnType<typeof vi.fn>;
};
let nodes: Node[];
let doc: EventTarget & { hidden: boolean };
beforeEach(() => {
  nodes = [];
  const node = () => {
    const value = new Node();
    nodes.push(value);
    return value;
  };
  ctx = {
    state: "running",
    currentTime: 0,
    destination: new Node(),
    createOscillator: vi.fn(node),
    createGain: vi.fn(node),
    createBiquadFilter: vi.fn(node),
    createBufferSource: vi.fn(() => {
      throw new Error("Ambient noise buffers must not be created");
    }),
  };
  doc = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", new EventTarget());
  audio = new AudioSystem();
  Object.assign(audio, { ctx });
});
afterEach(() => {
  audio.stopAmbience();
  vi.unstubAllGlobals();
});

const sounds = () =>
  ctx.createOscillator.mock.results.map(({ value }) => value as Node);
function startAmbient() {
  audio.ambience(true, { sea: 1, gulls: true, birds: 1, cafe: true });
  ctx.currentTime += 5;
  audio.ambience(true, { sea: 1, gulls: true, birds: 1, cafe: true });
  expect(sounds().length).toBeGreaterThan(0);
}
function expectStopped() {
  expect(
    sounds().every(
      (source) =>
        source.onended === null &&
        source.stop.mock.calls.some((call) => call.length === 0),
    ),
  ).toBe(true);
  expect(nodes.every((node) => node.disconnect.mock.calls.length > 0)).toBe(
    true,
  );
}

describe("town sound lifecycle", () => {
  it("uses finite identifiable effects without any continuous noise source", () => {
    startAmbient();
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
    expect(
      sounds().every((source) =>
        source.stop.mock.calls.some(
          ([at]) => at > ctx.currentTime && at < ctx.currentTime + 2,
        ),
      ),
    ).toBe(true);
  });

  it.each(["conversation or panel", "muted", "suspended context"])(
    "immediately cancels active and scheduled sounds when %s",
    (reason) => {
      startAmbient();
      if (reason === "muted") audio.volume = 0;
      if (reason === "suspended context") ctx.state = "suspended";
      audio.ambience(reason !== "conversation or panel", {
        gulls: true,
        birds: 1,
        cafe: true,
      });
      expectStopped();
    },
  );

  it("releases ended nodes and restarts quietly after cancellation", () => {
    startAmbient();
    const sources = sounds();
    sources.forEach((source) => source.onended?.());
    const stops = sources.map((source) => source.stop.mock.calls.length);
    audio.stopAmbience();
    expect(sources.map((source) => source.stop.mock.calls.length)).toEqual(
      stops,
    );
    audio.ambience(true, { gulls: true, birds: 1, cafe: true });
    expect(sounds()).toHaveLength(sources.length);
  });

  it.each(["visibilitychange", "pagehide", "unmount"])(
    "cancels sounds on %s without changing speech volume",
    (event) => {
      const unbind = audio.bindGestures();
      startAmbient();
      if (event === "visibilitychange") {
        doc.hidden = true;
        doc.dispatchEvent(new Event(event));
      } else if (event === "pagehide") window.dispatchEvent(new Event(event));
      else unbind();
      expectStopped();
      expect(audio.volume).toBe(0.9);
      unbind();
    },
  );
});
