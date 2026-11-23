import { describe, expect, it, vi } from "vitest";
import { ASK_WAY_SITUATION } from "../src/content/ask-way-lines";
import { PHOTO_THINGS, PHOTO_WALK_ACCEPT, PHOTO_WALK_SITUATION } from "../src/content/photo-walk-lines";
import { QUEST_PEOPLE_SPOTS } from "../src/content/townQuests";
import { buildTown } from "../src/game/world/town";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { SITUATION_BY_ID } from "../src/content/situations";
import { Conversation } from "../src/convo/dialogue";
import { EMPTY_WALK, photoNameMatcher, photoWalkTransition } from "../src/game/photowalk/state";
import { CAST } from "../tools/casting";
import { enumerateAll } from "../tools/enumerate";

function conversation(id: string, visits = 0) {
  return new Conversation(SITUATION_BY_ID[id], { global: GLOBAL, npcs: NPCS, player: { name: "Test", surname: "", gender: "f" }, visits });
}

describe("town quest conversations", () => {
  it("opens the walk only after acceptance and offers it on a later visit", () => {
    const first = conversation(PHOTO_WALK_SITUATION);
    expect(first.start().lines.map(({ lineId }) => lineId)).toEqual(["pw_greet", "pw_book", "pw_list", "pw_ask"]);
    expect(first.input("Maybe later.")).toMatchObject({ completed: false, events: [] });
    const next = conversation(PHOTO_WALK_SITUATION, 1);
    expect(next.start().lines[0].lineId).toBe("pw_again");
    const yes = next.input("Sure, I'd love to!");
    expect(yes.completed).toBe(true);
    expect(yes.events.map(({ name }) => name)).toEqual(["photowalk"]);
  });

  it("gives both directions and opens the card at the end of the chat", () => {
    const earl = conversation(ASK_WAY_SITUATION);
    earl.start();
    const ask = earl.input("Where is the post office?");
    expect(ask.lines.map(({ lineId }) => lineId)).toEqual(["aw_post_1", "aw_post_2", "aw_easy"]);
    expect(ask.events.map(({ name }) => name)).toEqual(["directions-asked"]);
    const thanks = earl.input("Got it.");
    expect(thanks.completed).toBe(true);
    expect(thanks.events).toMatchObject([{ name: "directions", data: { dest: "post" } }]);
  });

  it("prepares the learner's finale lines for both coach voices", () => {
    const { utts } = enumerateAll({ v2: true, only: [PHOTO_WALK_SITUATION], fuzzRuns: 0 });
    for (const id of Object.keys(PHOTO_WALK_ACCEPT)) {
      expect(utts.filter((line) => line.where === `${PHOTO_WALK_SITUATION}:${id}[0]`).map(({ voice }) => voice).sort())
        .toEqual(["g_coach_f", "g_coach_m"]);
    }
  });

  it("keeps the casts for Hana and Earl exclusive to them", () => {
    for (const id of ["hana", "earl"]) {
      expect(Object.keys(CAST).filter((other) => CAST[other].voice === CAST[id].voice)).toEqual([id]);
    }
  });
});

describe("the photo book", () => {
  it("starts on acceptance, pauses, resumes, and keeps found things on quit", () => {
    const started = photoWalkTransition(EMPTY_WALK, { type: "accept" });
    expect(started.status).toBe("on");
    const one = photoWalkTransition(started, { type: "find", id: "mailbox" });
    expect(photoWalkTransition(one, { type: "find", id: "mailbox" })).toBe(one);
    const paused = photoWalkTransition(one, { type: "pause" });
    expect(paused.status).toBe("paused");
    expect(photoWalkTransition(paused, { type: "find", id: "boat" })).toBe(paused);
    expect(photoWalkTransition(paused, { type: "resume" })).toEqual(one);
    const quit = photoWalkTransition(paused, { type: "quit" });
    expect(quit).toEqual({ status: "off", found: ["mailbox"] });
    expect(photoWalkTransition(quit, { type: "accept" })).toEqual(one);
  });

  it("requires twelve different subjects and the finale to finish", () => {
    const started = photoWalkTransition(EMPTY_WALK, { type: "accept" });
    expect(photoWalkTransition(started, { type: "finish" })).toBe(started);
    const found = PHOTO_THINGS.reduce((state, { id }) => photoWalkTransition(state, { type: "find", id }), started);
    expect(found).toEqual({ status: "found", found: PHOTO_THINGS.map(({ id }) => id) });
    expect(photoWalkTransition(found, { type: "finish" })).toEqual({ ...found, status: "done" });
  });

  it("matches complete authored names after introductions and articles", () => {
    const mailbox = photoNameMatcher("mailbox");
    for (const text of ["It's a mailbox.", "mailbox", "a mail box", "Look! That’s the máilbox.", "this is a postbox"]) {
      expect(mailbox.read(text).answer?.key, text).toBe("mailbox");
    }
    for (const text of ["a bench", "It isn't a mailbox.", "mailbox and a bench", "mail"]) {
      expect(mailbox.read(text).answer, text).toBeUndefined();
    }
    const boat = photoNameMatcher("boat");
    expect(boat.read("That is a boat.").answer?.key).toBe("boat");
    expect(boat.read("b oat").answer).toBeUndefined();
    expect(boat.read("coat").answer).toBeUndefined();
  });
});

it("places every photo subject and keeps both quest conversations clear of town props", () => {
  const draw = () => {};
  const gradient = () => ({ addColorStop: draw });
  const context = new Proxy({
    measureText: (text: string) => ({ width: text.length * 9 }), createLinearGradient: gradient, createRadialGradient: gradient,
  }, { get: (target, key) => Reflect.get(target, key) ?? draw });
  vi.stubGlobal("document", { createElement: () => ({ getContext: () => context }) });
  try {
    const { colliders, photoSpots } = buildTown();
    expect(new Set(photoSpots.map(({ id }) => id))).toEqual(new Set(PHOTO_THINGS.map(({ id }) => id)));
    for (const id of ["hydrant", "pumpkin", "trash_can", "maple", "boat", "umbrella"]) {
      expect(photoSpots.filter((spot) => spot.id === id).length, id).toBeGreaterThan(1);
    }
    for (const { npc, x, z, ax, az } of QUEST_PEOPLE_SPOTS) {
      expect(colliders.blocked(x, z, 0.45), npc).toBe(false);
      expect(colliders.blocked(ax, az, 0.38), `${npc}'s approach`).toBe(false);
    }
  } finally { vi.unstubAllGlobals(); }
});
