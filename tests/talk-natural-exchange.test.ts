import { Group } from "three";
import { afterEach, expect, it, vi } from "vitest";
import { NPCS } from "../src/content/npcs";
import { createCharacter } from "../src/game/characters";
import { ActorTalk } from "../src/game/talkNatural/binding";
import type { VoiceVisualOwner } from "../src/game/talkNatural/contract";

const voice = vi.hoisted(() => ({
  visualOwner: undefined as VoiceVisualOwner | undefined,
  visualState(owner: VoiceVisualOwner) { return voice.visualOwner === owner ? "playing" : "interrupt"; },
  visualElapsed: () => 0.2,
  level: vi.fn(() => 0.8),
  vowel: () => null,
}));
vi.mock("../src/game/audio", () => ({ audio: voice }));

afterEach(() => {
  voice.visualOwner = undefined;
  voice.level.mockReset().mockReturnValue(0.8);
  vi.unstubAllGlobals();
});

it("follows a pending request before hydration and keeps its pause and learner turn after hydration", async () => {
  const debug = {} as { __talkNatural?: { sample(): { reaction?: unknown } | null } };
  vi.stubGlobal("window", debug);
  const world = new Group();
  const ch = createCharacter(NPCS.mia.look), player = createCharacter(NPCS.rosa.look);
  player.root.position.z = 3;
  world.add(ch.root, player.root);
  const target = { actor: ch, id: "mia", player, scope: "street" as const };
  const talk = new ActorTalk();
  const line = talk.speak(target, "0:open:0", "Hi!", 0.1, true)!;
  voice.visualOwner = line.owner;
  const pending = ch.talkPose;
  ch.update(0.045);
  expect(pending?.mouth).toBeCloseTo(0.8 * (1 - Math.exp(-1)));
  voice.level.mockReturnValue(0);
  ch.update(0.08);
  const quiet = pending!.mouth;
  expect(quiet).toBeCloseTo(0.8 * (1 - Math.exp(-1)) * Math.exp(-1));

  await vi.dynamicImportSettled();
  expect(ch.talkPose).not.toBe(pending);
  expect(ch.talkPose?.mouth).toBe(quiet);
  expect(debug.__talkNatural?.sample()).toMatchObject({ scope: "street", actorId: "mia", player: { role: "learner" } });
  for (let i = 0; i < 10; i++) ch.update(0.025);
  expect(ch.talkPose?.mouth).toBe(0);
  voice.level.mockReturnValue(0.8);
  ch.update(0.045);
  expect(ch.talkPose?.mouth).toBeGreaterThan(0.4);
  talk.pause(true);
  expect(ch.talkPose?.mouth).toBe(0);
  talk.pause(false);

  // A practice or learner model can use the same audio system while the NPC waits.
  talk.listen(target, true);
  voice.visualOwner = { actor: player, line: "example" };
  line.finished = true;
  ch.update(0.1);
  expect(debug.__talkNatural?.sample()).toMatchObject({ phase: "you", listening: true, mouth: 0, requestOwned: false });
  talk.react("understood");
  ch.update(0.1);
  expect(debug.__talkNatural?.sample()?.reaction).toMatchObject({ kind: "understood", sequence: 1 });
  talk.release();
  ch.update(0.3);
  player.update(0.3);
  expect(debug.__talkNatural?.sample()).toBeNull();
  expect(ch.talkPose).toBeUndefined();
  expect(player.talkPose).toBeUndefined();
});

it("discards a cancelled or unmounted actor while the mixer loads", async () => {
  const scene = new Group(), zone = new Group();
  scene.add(zone);
  const a = createCharacter(NPCS.mia.look), b = createCharacter(NPCS.rosa.look);
  zone.add(a.root, b.root);
  const talk = new ActorTalk();
  talk.speak({ actor: a, id: "mia" }, "first", "Hello!", 3, true);
  const next = talk.speak({ actor: b, id: "rosa" }, "second", "Hello!", 3, true);
  voice.visualOwner = next?.owner;
  scene.remove(zone);
  await vi.dynamicImportSettled();
  expect(a.talkPose).toBeUndefined();
  expect(b.talkPose).toBeUndefined();
});
