import { Group } from "three";
import { afterEach, expect, it, vi } from "vitest";
import { NPCS } from "../src/content/npcs";
import type { AudioSystem } from "../src/game/audio";
import { createCharacter } from "../src/game/characters";
import { ActorTalk } from "../src/game/talkNatural/binding";
import type { VoiceVisualOwner } from "../src/game/talkNatural/contract";

function voice() {
  return {
    visualOwner: undefined as VoiceVisualOwner | undefined,
    visualState(owner: VoiceVisualOwner) { return this.visualOwner === owner ? "playing" : "interrupt"; },
    disownVisual(owner: VoiceVisualOwner) { if (this.visualOwner === owner) this.visualOwner = undefined; },
    visualElapsed: () => 0,
    level: vi.fn(() => 0.8),
    vowel: () => null,
  };
}

function mount() {
  const world = new Group();
  const actor = createCharacter(NPCS.vinnie.look);
  const partner = createCharacter(NPCS.mia.look);
  world.add(actor.root, partner.root);
  const audio = voice(), talk = new ActorTalk(audio as unknown as AudioSystem);
  return { actor, partner, world, audio, talk };
}

afterEach(() => vi.unstubAllGlobals());

it("keeps the envelope through deferred hydration, then disowns on pause and settles for learner playback", async () => {
  const window = {} as { __talkNatural?: { sample(): unknown } };
  vi.stubGlobal("window", window);
  const { actor, partner, world, audio, talk } = mount();
  partner.root.position.z = 2;
  const target = { actor, id: "vinnie", player: partner, scope: "street" as const };
  const first = talk.speak(target, "first", "Hello!", 2, true)!;
  audio.visualOwner = first.owner;
  const pending = actor.talkPose!;
  actor.update(0.045);
  expect(pending.mouth).toBeCloseTo(0.8 * (1 - Math.exp(-1)));
  audio.level.mockReturnValue(0);
  actor.update(0.08);
  const quiet = pending.mouth;
  await vi.dynamicImportSettled();
  expect(actor.talkPose).not.toBe(pending);
  expect(actor.talkPose?.mouth).toBeCloseTo(quiet);
  for (let i = 0; i < 12; i++) actor.update(0.02);
  expect(actor.talkPose?.mouth).toBe(0);

  talk.pause(true);
  expect(audio.visualOwner).toBeUndefined();
  expect(actor.talkPose?.mouth).toBe(0);
  talk.pause(false);
  const replay = talk.speak(target, "first", "Hello!", 2, true, true)!;
  expect(replay.owner).not.toBe(first.owner);
  expect(replay.owner).toMatchObject({ actor, line: "first", replay: "turn" });
  audio.visualOwner = replay.owner;
  audio.level.mockReturnValue(0.8);
  actor.update(0.055);
  expect(actor.talkPose?.mouth).toBeGreaterThan(0.4);

  talk.listen(target, true);
  const learner = { actor: partner, line: "example" };
  audio.visualOwner = learner;
  talk.learner(true);
  expect(audio.visualOwner).toBe(learner);
  expect(actor.talkPose?.mouth).toBe(0);
  expect(window.__talkNatural?.sample()).toMatchObject({ requestOwned: false, gestureWeight: 0, mouth: 0 });
  talk.learner(false);
  actor.update(0.1);
  expect(window.__talkNatural?.sample()).toMatchObject({ actorId: "vinnie", phase: "you", listening: true, mouth: 0 });
  talk.react("understood");
  actor.update(0.19);
  expect(window.__talkNatural?.sample()).toMatchObject({ reaction: { kind: "understood" } });
  talk.release();
  actor.update(0.14);
  expect(actor.talkPose?.releasing).toBe(true);
  actor.update(0.16);
  partner.update(0.30);
  expect(actor.talkPose).toBeUndefined();
  expect(partner.talkPose).toBeUndefined();
  expect(window.__talkNatural?.sample()).toBeNull();
  world.clear();
});

it("discards cancelled and unmounted speakers with the same role during a pending import", async () => {
  const { world, actor, partner, audio, talk } = mount();
  const scene = new Group();
  scene.add(world);
  const first = talk.speak({ actor, id: "shopper" }, "same-line", "Hi!", 2, true)!;
  audio.visualOwner = first.owner;
  talk.release(0);
  expect(audio.visualOwner).toBeUndefined();
  const next = talk.speak({ actor: partner, id: "shopper" }, "same-line", "Hi!", 2, true)!;
  audio.visualOwner = next.owner;
  expect(next.owner?.actor).toBe(partner);
  talk.finish(first);
  expect(audio.visualOwner).toBe(next.owner);
  scene.remove(world);
  await vi.dynamicImportSettled();
  expect(audio.visualOwner).toBeUndefined();
  expect(actor.talkPose).toBeUndefined();
  expect(partner.talkPose).toBeUndefined();
});

it("keeps the current handoff when motion preference changes during the deferred entry", async () => {
  const query = Object.assign(new EventTarget(), { matches: false });
  vi.stubGlobal("matchMedia", () => query);
  const { world, actor, talk } = mount();
  const rig = actor.naturalRig!()!;
  actor.setAnim("wave");
  actor.update(0.02);
  const raised = rig.upperR.rotation.z;
  talk.listen({ actor, id: "vinnie" }, true);
  actor.update(0.04);
  expect(rig.upperR.rotation.z).toBeCloseTo(raised, 0);
  query.matches = true;
  query.dispatchEvent(new Event("change"));
  await vi.dynamicImportSettled();
  actor.update(0.04);
  expect(actor.talkPose?.reduced).toBe(true);
  expect(Math.abs(rig.upperR.rotation.z - raised)).toBeGreaterThan(0.5);
  query.matches = false;
  query.dispatchEvent(new Event("change"));
  actor.update(0.04);
  expect(actor.talkPose?.reduced).toBe(false);
  expect(Math.abs(rig.upperR.rotation.z - raised)).toBeGreaterThan(0.5);
  world.clear();
});
