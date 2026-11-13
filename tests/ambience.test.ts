import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioSystem } from "../src/game/audio";

class Param {
  value = 0;
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
  setTargetAtTime = vi.fn();
  cancelScheduledValues = vi.fn();
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
  // every node of a sound is let go; the two buses the sounds go through (the world's and the effects') stay for
  // as long as the context does
  expect(
    nodes
      .filter((node) => !isBus(node))
      .every((node) => node.disconnect.mock.calls.length > 0),
  ).toBe(true);
}
const isBus = (node: Node) =>
  node.connect.mock.calls.some(([to]) => to === ctx.destination);

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

// The world's sounds beyond the brief ones (docs/SOUNDS.md): a bus that falls silent when something must be heard
// or said, two recorded loops that follow the distance, steps by surface, the jump.
describe("the world's sounds make way and follow the place", () => {
  type Private = {
    out(c: unknown): Node;
    fx(c: unknown): Node;
    setState(state: string): void;
    loops: Map<string, { buf?: unknown; src?: Node; gain?: Node }>;
  };
  const inner = () => audio as unknown as Private;
  const target = (bus: Node) => bus.gain.setTargetAtTime.mock.calls.at(-1)?.[0];
  beforeEach(() => {
    const node = () => {
      const value = new Node();
      nodes.push(value);
      return value;
    };
    Object.assign(ctx, {
      sampleRate: 48000,
      createBufferSource: vi.fn(node),
      createBuffer: vi.fn((_c: number, length: number) => ({
        getChannelData: () => new Float32Array(length),
      })),
    });
  });

  it("the world falls silent for a voice, the microphone or a conversation, and the effects do not", () => {
    const world = inner().out(ctx), effects = inner().fx(ctx);
    expect(world.connect).toHaveBeenCalledWith(ctx.destination);
    for (const [quiet, back] of [
      [() => inner().setState("playing"), () => inner().setState("idle")],
      [() => audio.hush("microphone", true, true), () => audio.hush("microphone", false)],
      [() => audio.ambience(false), () => audio.ambience(true)],
    ]) {
      quiet();
      expect(target(world)).toBe(0);
      back();
      expect(target(world)).toBe(1);
    }
    // two reasons at once: silent until both are over
    audio.hush("microphone", true, true);
    inner().setState("loading");
    audio.hush("microphone", false);
    expect(target(world)).toBe(0);
    inner().setState("idle");
    expect(target(world)).toBe(1);
    expect(effects.gain.setTargetAtTime.mock.calls.every(([v]) => v === 1)).toBe(true);
  });

  it("the Sounds setting scales the world and the effects; at 0 nothing of the town plays", () => {
    const world = inner().out(ctx), effects = inner().fx(ctx);
    audio.sounds = 0.4;
    expect(target(world)).toBeCloseTo(0.5);
    expect(target(effects)).toBeCloseTo(0.5);
    audio.sounds = 0;
    audio.ambience(true, { sea: 1, gulls: true, birds: 1, surf: 1 });
    ctx.currentTime += 5;
    audio.ambience(true, { sea: 1, gulls: true, birds: 1, surf: 1 });
    expect(ctx.createOscillator).not.toHaveBeenCalled();
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
    expect(audio.volume).toBe(0.9);
  });

  it("the surf is a loop inside its recording, as loud as the shore is near, lower under the radio, and stops when out of earshot", () => {
    inner().loops.set("sea", { buf: { duration: 8.1 } });
    audio.ambience(true, { surf: 0 });
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
    audio.ambience(true, { surf: 1 });
    const loop = inner().loops.get("sea")!, src = loop.src!, gain = loop.gain!;
    expect(src).toMatchObject({ loop: true, loopStart: 0.15, loopEnd: 7.75 });
    const [when, from] = src.start.mock.calls[0];
    expect(when).toBe(ctx.currentTime);
    expect(from).toBeGreaterThanOrEqual(0.15);
    expect(from).toBeLessThan(7.75);
    expect(target(gain)).toBeCloseTo(0.9 * 0.5);
    audio.ambience(true, { surf: 0.5 });
    expect(target(gain)).toBeCloseTo(0.9 * 0.5 * 0.5);
    audio.underRadio(true);
    audio.ambience(true, { surf: 1 });
    expect(target(gain)).toBeCloseTo(0.9 * 0.5 * 0.4);
    audio.underRadio(false);
    // out of earshot: faded at once, stopped a few seconds later, and started afresh on the way back
    audio.ambience(true, { surf: 0 });
    expect(target(gain)).toBe(0);
    expect(src.stop).not.toHaveBeenCalled();
    ctx.currentTime += 5;
    audio.ambience(true, { surf: 0 });
    expect(src.stop).toHaveBeenCalled();
    expect(inner().loops.get("sea")!.src).toBeUndefined();
    audio.ambience(true, { surf: 0.8 });
    expect(inner().loops.get("sea")!.src).not.toBe(src);
    // a conversation ends it too
    const again = inner().loops.get("sea")!.src!;
    audio.ambience(false);
    expect(again.stop).toHaveBeenCalled();
  });

  it("a step sounds of what is underfoot, and the jump is a short rising note", () => {
    const bands = (run: () => void) => {
      const before = ctx.createBiquadFilter.mock.results.length;
      run();
      return ctx.createBiquadFilter.mock.results.slice(before).map(({ value }) => (value as Node).frequency.value);
    };
    const stone = bands(() => audio.step("stone", false)), sand = bands(() => audio.step("sand", false));
    expect(stone).toHaveLength(1);
    expect(sand).toHaveLength(2);                      // the step and the sand's faint rustle
    expect(sand[0]).toBeLessThan(stone[0]);
    const before = ctx.createOscillator.mock.results.length;
    audio.step("wood", false);
    expect(ctx.createOscillator.mock.results.length).toBe(before + 1);   // the boards' low knock
    audio.jump();
    const note = ctx.createOscillator.mock.results.at(-2)!.value as Node;
    const ramps = note.frequency.exponentialRampToValueAtTime.mock.calls;
    expect(ramps[0][0]).toBeGreaterThan(note.frequency.setValueAtTime.mock.calls[0][0] * 1.8);   // up nearly an octave
    expect(note.stop.mock.calls[0][0]).toBeLessThan(ctx.currentTime + 0.35);
    // all of it through the world's bus, none of it straight to the speakers
    const world = inner().out(ctx);
    const direct = nodes.filter((node) => !isBus(node) && node.connect.mock.calls.some(([to]) => to === ctx.destination));
    expect(direct).toHaveLength(0);
    expect(nodes.some((node) => node.connect.mock.calls.some(([to]) => to === world))).toBe(true);
  });
});
