import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Vector3 } from "three";
import { Game } from "../src/game/Game";
import { Session } from "../src/game/session";
import { loadSituation } from "../src/content/situations/catalog";
import { audio } from "../src/game/audio";
import type { CaveView } from "../src/game/cave/Cave";
import { stoneGain } from "../src/game/cave/call";
import { EXITS, SPAWNS, TREES } from "../src/game/cave/plan";
import { CaveQuest, type CaveSave } from "../src/game/cave/quest";
import { applyCaveEvent, caveRouting, caveRules, saveCaveProgress, stonePhrases } from "../src/game/cave/zone";
import { CaveRules } from "../src/game/cave/progress";
import { createCaveRouting } from "../src/game/cave/routing";
import { CaveGuide } from "../src/game/cave/guide";
import { CHAMBERS, SLATE_CAVE } from "../src/game/world/slateCave";
import { COVE_DOORS, RING_TARGET } from "../src/game/world/slateCovePlan";
import { emptyProgress } from "../src/state/progress";
import { CAVE_COPY } from "../src/content/cave-copy";
import { EMPTY_CONV, useStore } from "../src/state/store";

const tides = ["tide-1", "tide-2", "tide-3"];
const ready: CaveSave = { lit: [...tides, "root-1", "root-2"], passed: ["bram", "fern"], heart: true };
const at = (id: string) => CHAMBERS.flatMap((room) => room.stones).find((stone) => stone.id === id)!;
const glyph = () => useStore.getState().hud.glyph!;

async function visit(initial?: CaveSave, rules = caveRules) {
  const view = { setGate: vi.fn(), setHeart: vi.fn(), setStone: vi.fn(), setCalling: vi.fn(), burst: vi.fn() };
  const persist = vi.fn(), gates = vi.fn();
  const quest = new CaveQuest(view as unknown as CaveView, initial, persist, rules,
    rules === caveRules ? caveRouting : createCaveRouting(rules), gates, stonePhrases);
  await quest.loadLines();
  return { quest, view, persist, gates };
}

function solve(quest: CaveQuest, id: string) {
  expect(quest.open(id, at(id))).toBe(true);
  const quiz = glyph();
  quest.pick(quiz.answer);
  expect(glyph().solved).toBe(true);
  return quiz;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(audio, "hasClip").mockReturnValue(false);
  vi.spyOn(audio, "sfx").mockImplementation(() => {});
  useStore.getState().setHud({ glyph: null, panel: null, cave: null });
});
afterEach(() => {
  useStore.getState().setHud({ glyph: null, cave: null });
  for (const toast of useStore.getState().toasts) useStore.getState().dismissToast(toast.id);
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Slate Cove listening and story", () => {
  it("guides through Bram, two, three, four and five distinct stones before the Oak", async () => {
    const { quest, gates, persist } = await visit();
    expect(quest.guide(SPAWNS.cleft)?.id).toBe("cave_bram");
    expect(quest.guideTo("cave_oak", SPAWNS.cleft)?.id).toBe("cave_bram");
    expect(quest.pass("fern")).toBe(false);
    expect(quest.open("tide-1", at("tide-1"))).toBe(false);
    expect(quest.light("tide-1")).toBe(false);
    expect(quest.pass("bram")).toBe(true);
    expect(quest.pass("bram")).toBe(false);
    expect(quest.open("root-1", at("root-1"))).toBe(false);
    expect(quest.open("tide-1", SPAWNS.cleft)).toBe(false);
    for (const id of tides.slice(0, 2)) {
      solve(quest, id);
      quest.pick(glyph().answer);
      quest.close();
      expect(quest.open(id, at(id))).toBe(false);
    }
    expect(quest.mask).toBe(1);
    expect(quest.guideTo("cave_fern", SPAWNS.cleft)?.id).toBe("tide-3");
    solve(quest, "tide-3"); quest.close();
    expect(quest.mask).toBe(3);
    solve(quest, "root-1"); quest.close();
    expect(quest.mask).toBe(7);
    expect(quest.treeNear(TREES[1])).toBe(false);
    expect(quest.open("river-1", at("river-1"))).toBe(false);
    expect(quest.guide(SPAWNS.cleft)?.id).toBe("cave_fern");
    expect(quest.pass("fern")).toBe(true);
    expect(quest.mask).toBe(15);
    expect(quest.treeHeard()).toBe(false);
    solve(quest, "river-1"); quest.close();
    expect(quest.mask).toBe(63);
    expect(quest.save.heart).toBe(true);
    expect(quest.guide(SPAWNS.cleft)?.id).toBe("cave_oak");
    expect(persist.mock.calls.filter(([, line]) => line)).toHaveLength(5);
    expect(gates.mock.calls.flat()).toEqual([0, 1, 3, 7, 15, 63]);
    quest.dispose();
  });

  it("uses the configured speakers, sessions, event names and prerequisite masks", async () => {
    const [first, second] = SLATE_CAVE.keepers;
    const entrance = { ...first, gate: "entry-key", npc: "entry-actor", sitId: "entry-scene" };
    const bridge = { ...second, gate: "bridge-key", npc: "bridge-actor", sitId: "bridge-scene" };
    const ids: Record<string, string> = { [first.gate]: entrance.gate, [second.gate]: bridge.gate };
    const rules = new CaveRules({ ...SLATE_CAVE, keepers: [entrance, bridge],
      gates: SLATE_CAVE.gates.map((gate) => ({
        ...gate, id: ids[gate.id] ?? gate.id,
        keeper: gate.keeper && ids[gate.keeper], pass: gate.pass && ids[gate.pass],
      })),
      keeperEvent: "keeper-release", treeEvent: "tree-finished", treeNpc: "tree-actor", treeSituation: "tree-scene",
    });
    const { quest, view } = await visit({ lit: [], passed: [first.gate] }, rules);
    const session = (id: string, completed = true, active = true) => ({ sit: { id }, conv: { completed }, active });
    const release = (speaker: string, id: string, gate: string, completed = true, active = true) =>
      applyCaveEvent(quest, session(id, completed, active), speaker, false, "keeper-release", { gate });
    try {
      expect(quest.save.passed).toEqual([]);
      expect(quest.guide(SPAWNS.cleft)?.id).toBe(entrance.npc);
      expect(release(entrance.npc, entrance.sitId, entrance.gate, false)).toBe(false);
      expect(release(entrance.npc, entrance.sitId, entrance.gate, true, false)).toBe(false);
      expect(release(bridge.npc, entrance.sitId, entrance.gate)).toBe(false);
      expect(release(entrance.npc, first.sitId, entrance.gate)).toBe(false);
      expect(release(entrance.npc, entrance.sitId, first.gate)).toBe(false);
      expect(applyCaveEvent(quest, session(entrance.sitId), entrance.npc, false, "cave-pass", { gate: entrance.gate })).toBe(false);
      expect(release(entrance.npc, entrance.sitId, entrance.gate)).toBe(true);
      expect(view.setGate).toHaveBeenCalledWith(entrance.gate, true, false);
      expect(release(bridge.npc, bridge.sitId, bridge.gate)).toBe(false);
      expect(quest.mask).toBe(1);
      for (const id of ready.lit) expect(quest.light(id)).toBe(true);
      expect(quest.guide(SPAWNS.cleft)?.id).toBe(bridge.npc);
      quest.update(0, SPAWNS.cleft, 0, true);
      expect(useStore.getState().hud.cave).toMatchObject({ nextSitId: bridge.sitId, next: bridge.guide.lt });
      expect(applyCaveEvent(quest, session("tree-scene"), undefined, true, "tree-finished", {})).toBe(false);
      expect(release(bridge.npc, bridge.sitId, bridge.gate)).toBe(true);
      expect(view.setGate).toHaveBeenCalledWith(bridge.gate, true, false);
      expect(quest.mask).toBe(63);
      expect(quest.guide(TREES[1])?.id).toBe("tree-actor");
      expect(applyCaveEvent(quest, session("tree-scene"), undefined, false, "tree-finished", {})).toBe(false);
      expect(applyCaveEvent(quest, session("tree-scene"), undefined, true, "tree-finished", {})).toBe(true);
      expect(quest.save.tree).toBe(true);
    } finally {
      quest.dispose();
    }
  });

  it("holds Fern at five and restores first cues until the Oak is heard once", async () => {
    const five = { ...ready, passed: ["bram"], told: 2 };
    const { quest, gates } = await visit({ ...five, lit: [...five.lit, "root-1", "invalid"] });
    expect(caveRules.normalize(five)).toEqual(quest.save);
    expect(quest.mask).toBe(7);
    expect(quest.replay).toBe(false);
    expect(quest.treeHeard()).toBe(false);
    expect(quest.guide(TREES[1])?.id).toBe("cave_fern");
    expect(quest.phrases.get("root-1")?.id).toBe("root_01");
    expect(quest.pass("fern")).toBe(true);
    expect(gates.mock.calls.flat()).toEqual([7, 63]);
    const tree = TREES[1], offer = vi.fn(() => true);
    quest.update(0.1, { ...tree, x: tree.x + 3.7 }, 0, false, offer);
    quest.update(0.1, tree, 0, true, offer);
    expect(offer).not.toHaveBeenCalled();
    quest.update(0.1, tree, 0, false, offer);
    quest.update(0.1, tree, 0, false, offer);
    expect(offer).toHaveBeenCalledTimes(1);
    quest.update(0.1, { ...tree, x: tree.x + 5 }, 0, false, offer);
    quest.update(0.1, tree, 0, false, offer);
    expect(offer).toHaveBeenCalledTimes(2);
    expect(quest.treeHeard()).toBe(true);
    expect(quest.treeHeard()).toBe(false);
    expect(quest.save.lit).toEqual(ready.lit);
    expect(quest.replay).toBe(true);
    expect(new Set([...quest.phrases.values()].map((line) => line.id)).size).toBe(15);
    quest.dispose();
  });

  it("shows the same authored cue with zero clips and keeps the solved card open", async () => {
    const { quest, persist, view } = await visit({ lit: [], passed: ["bram"] });
    const play = vi.spyOn(audio, "play");
    quest.update(2.49, at("tide-1"), 0, false);
    expect(view.setCalling).not.toHaveBeenCalled();
    quest.update(0.02, at("tide-1"), 0, false);
    expect(view.setCalling).toHaveBeenCalledWith("tide-1");
    expect(quest.open("tide-1")).toBe(true);
    expect(glyph().shown).toBe(true);
    expect(glyph().text).toBe("The tide remembers your name.");
    expect(new Set(glyph().options).size).toBe(3);
    const quiz = glyph(), wrong = (quiz.answer + 1) % 3;
    quest.showWords(); quest.pick(wrong); quest.pick(wrong); quest.say();
    expect(glyph().wrong).toEqual([wrong]);
    expect(quest.save.lit).toEqual([]);
    expect(play).not.toHaveBeenCalled();
    quest.pick(quiz.answer);
    quest.say();
    expect(useStore.getState().toasts.filter((toast) => toast.title === CAVE_COPY.toast.stoneLit.title.lt)).toHaveLength(1);
    vi.advanceTimersByTime(6000);
    expect(glyph().solved).toBe(true);
    expect(glyph().s).toBe(quiz.s);
    expect(persist).toHaveBeenLastCalledWith(expect.objectContaining({ lit: ["tide-1"], heard: ["tide_01"] }),
      expect.objectContaining({ id: "tide_01", s: quiz.s }));
    quest.close();
    expect(glyph()).toBeNull();
    quest.dispose();
  });

  it("retains the line and distractors through a late manifest and cancels only its own replay", async () => {
    const { quest } = await visit({ lit: [], passed: ["bram"] });
    expect(quest.open("tide-1", at("tide-1"))).toBe(true);
    const original = glyph();
    vi.mocked(audio.hasClip).mockReturnValue(true);
    const replays: { finish: (played: boolean) => void; signal?: AbortSignal }[] = [];
    const play = vi.spyOn(audio, "play").mockImplementation((_, __, ___, opt) => new Promise((finish) => {
      replays.push({ finish, signal: opt?.signal });
    }));
    const stop = vi.spyOn(audio, "stop");
    quest.say(); quest.say();
    expect(play).toHaveBeenCalledTimes(1);
    expect(glyph().s).toBe(original.s);
    expect(glyph().options).toBe(original.options);
    quest.close();
    expect(replays[0].signal?.aborted).toBe(true);
    expect(stop).not.toHaveBeenCalled();
    expect(quest.open("tide-1", at("tide-1"))).toBe(true);
    const replacement = glyph();
    quest.pick(original.answer, original.opening);
    quest.close(original.opening);
    replays[0].finish(false);
    await Promise.resolve();
    expect(glyph()).toBe(replacement);
    expect(replays[1].signal?.aborted).toBe(false);
    quest.dispose();
    expect(replays[1].signal?.aborted).toBe(true);
    replays[1].finish(true);
    await Promise.resolve();
    expect(glyph()).toBeNull();
  });

  it("reveals an unavailable recording once and keeps the authored quiz playable", async () => {
    const { quest } = await visit({ lit: [], passed: ["bram"] });
    vi.mocked(audio.hasClip).mockReturnValue(true);
    const ready = audio.ready;
    audio.ready = true;
    const play = vi.spyOn(audio, "play").mockImplementation(async (_voice, _speed, _text, options) => {
      options?.onUnavailable?.();
      return false;
    });
    try {
      expect(quest.open("tide-1", at("tide-1"))).toBe(true);
      await Promise.resolve();
      expect(glyph()).toMatchObject({ shown: true, unavailable: true, solved: false });
      quest.say();
      expect(play).toHaveBeenCalledTimes(1);
      quest.pick(glyph().answer);
      expect(quest.save.lit).toEqual(["tide-1"]);
    } finally {
      audio.ready = ready;
      quest.dispose();
    }
  });

  it("keeps replay assignments unique and rearms only after time and dismissal", async () => {
    const { quest } = await visit({ ...ready, tree: true, heard: ["tide_01", "tide_02", "tide_03"] });
    const lines = [...quest.phrases.values()];
    expect(new Set(lines.map((line) => line.id)).size).toBe(15);
    expect(lines.slice(0, 3).every((line) => line.chamber === 0 && !quest.save.heard?.includes(line.id))).toBe(true);
    const id = "root-3";
    const previous = quest.phrases.get(id)?.id;
    solve(quest, id);
    expect(quest.save.lit).toEqual([...ready.lit, id]);
    expect(quest.mask).toBe(63);
    expect(quest.rearm.get(id)).toBe(40);
    quest.update(39, at(id), 0, true);
    expect(quest.rearm.get(id)).toBe(1);
    quest.update(2, at(id), 0, true);
    expect(quest.rearm.get(id)).toBe(0);
    expect(glyph()).toMatchObject({ id, solved: true });
    expect(quest.relit.has(id)).toBe(true);
    quest.close();
    quest.update(0.01, at(id), 0, true);
    expect(quest.rearm.get(id)).toBe(0);
    quest.update(0.01, at(id), 0, false);
    expect(quest.rearm.get(id)).toBeUndefined();
    expect(quest.relit.has(id)).toBe(false);
    expect(quest.phrases.get(id)?.id).not.toBe(previous);
    expect(new Set([...quest.phrases.values()].map((line) => line.id)).size).toBe(15);
    solve(quest, id); quest.close();
    expect(quest.save.lit.length).toBe(6);
    quest.dispose();
    const again = await visit(quest.save);
    expect(again.quest.relit.size).toBe(0);
    expect(again.quest.phrases.size).toBe(15);
    again.quest.dispose();
  });

  it("rolls over once when the 215th line is understood", async () => {
    const lines = (await stonePhrases()).flat();
    const last = lines.at(-1)!;
    const { quest, persist } = await visit({ ...ready, tree: true, rounds: 2, heard: lines.slice(0, -1).map((line) => line.id) });
    const assigned = [...quest.phrases].find(([, line]) => line.id === last.id)!;
    const quiz = solve(quest, assigned[0]);
    quest.pick(quiz.answer);
    quest.close(); quest.close();
    expect(quest.save.heard).toEqual([]);
    expect(quest.save.rounds).toBe(3);
    expect(persist.mock.calls.filter(([save]) => save.rounds === 3)).toHaveLength(1);
    quest.dispose();
  });


  it("keeps cave book origins and leaves the course objective and other progress intact", async () => {
    const previous = useStore.getState().progress;
    useStore.setState({ progress: { ...emptyProgress(), objective: "s69-local" } });
    try {
      const phrase = (await stonePhrases())[0][0];
      saveCaveProgress(ready, phrase);
      saveCaveProgress(ready, phrase);
      expect(useStore.getState().progress).toMatchObject({
        objective: "s69-local", cave: ready,
        phrases: { "x08-old-oak:tide_01": { en: phrase.en, lt: phrase.lt, sitId: "x08-old-oak", count: 2 } },
      });
    } finally { useStore.setState({ progress: previous }); }
  });

  it("selects the cleft and ruins without moving, and continues a town objective after a guided exit", async () => {
    const { quest } = await visit(ready);
    const progress = useStore.getState().progress;
    useStore.setState({ progress: emptyProgress() });
    const walkTo = vi.fn();
    const game: Game = Object.create(Game.prototype);
    const town = { id: "town" }, entrance = COVE_DOORS.cleft, exit = EXITS[1];
    const player = { root: { position: new Vector3(entrance.out.x, 0, entrance.out.z) } };
    const main = {
      caveGuide: new CaveGuide(), coveArt: { load: vi.fn() }, town: { group: {} }, caveTravel: { pending: false },
      zone: town, player, rides: {}, hop: { air: false }, vel: new Vector3(2, 0, -0.8),
      guidance: { setKind: vi.fn(), setBeacon: vi.fn() }, walkTo,
    };
    Object.assign(game, main);
    try {
      game.guideToPlace("gruta", undefined, "cave_fern");
      expect(game.objectiveTarget()).toMatchObject({ kind: "cave-entry", id: "cleft", x: entrance.x });
      expect(walkTo).not.toHaveBeenCalled();
      game.autoWalkToObjective();
      expect(walkTo).toHaveBeenLastCalledWith(entrance.x, entrance.z + 1.7, { kind: "cave-entry", id: "cleft", onward: true });
      game.guideToPlace("old-stone-ring");
      expect(walkTo).toHaveBeenCalledTimes(1);
      game.autoWalkToObjective();
      expect(walkTo).toHaveBeenLastCalledWith(RING_TARGET.x, RING_TARGET.z, expect.objectContaining({ kind: "point" }));

      const leave = vi.fn((_id: string, resume?: () => void) => {
        Object.assign(game, { zone: town, caveZone: undefined });
        resume?.();
      });
      Object.assign(game, {
        zone: { id: "gruta", interior: { wild: { exits: EXITS } } },
        caveZone: { quest, exitTarget: { ...exit, kind: "exit", label: CAVE_COPY.door.dryExit.en } },
        leaveCave: leave, resumeObjectiveWalk: () => game.autoWalkToObjective(),
      });
      game.setObjective("s69-local");
      expect(game.objectiveTarget()).toMatchObject({ kind: "exit", id: "cleft" });
      game.autoWalkToObjective();
      const target = { kind: "cave-exit", id: "cleft", onward: true };
      expect(walkTo).toHaveBeenLastCalledWith(exit.x, exit.z, target);
      Object.assign(game, { autoTarget: target });
      Reflect.get(game, "checkCoveDoor").call(game, new Vector3(exit.x, 0, exit.z), false);
      expect(leave).toHaveBeenCalledWith("cleft", expect.any(Function));
      expect(game.currentObjective()?.id).toBe("s69-local");
      expect(walkTo).toHaveBeenLastCalledWith(expect.any(Number), expect.any(Number), expect.objectContaining({ kind: "npc" }));
    } finally {
      quest.dispose();
      useStore.setState({ progress });
    }
  });

  it("waits for Pradėti and completes the real Oak transcript with zero recordings", async () => {
    await loadSituation("x08-old-oak");
    const previous = useStore.getState();
    const { ready, manifest, recordedDialogue } = audio;
    useStore.setState({ progress: emptyProgress(), conv: { ...EMPTY_CONV } });
    vi.stubGlobal("document", Object.assign(new EventTarget(), { visibilityState: "visible" }));
    vi.spyOn(audio, "init").mockResolvedValue(undefined);
    Object.assign(audio, { ready: true, manifest: {}, recordedDialogue: true });
    const onEvent = vi.fn();
    const session = new Session("x08-old-oak", { npcTalk() {}, onEvent, onEnd() {} });
    try {
      const start = session.begin();
      await vi.advanceTimersByTimeAsync(10000);
      expect(useStore.getState().conv).toMatchObject({ introOpen: true, transcript: [] });
      useStore.getState().setConv({ introOpen: false });
      await start;
      expect(useStore.getState().conv.phase).toBe("you");
      for (const text of ["You're the old oak.", "I feel at home here.", "Yes, I'll keep learning.", "Goodbye."]) {
        await session.submit(text, [], "typed");
      }
      const { conv, progress } = useStore.getState();
      expect(onEvent.mock.calls.filter(([event]) => event === "tree-heard")).toHaveLength(1);
      expect(conv).toMatchObject({ completed: true, phase: "ended" });
      expect(conv.transcript.at(-1)?.sentence?.say).toBe("Walk home in peace. I'll be here.");
      expect(progress.sits["x08-old-oak"].completions).toBe(1);
      expect(progress.cave).toBeUndefined();
    } finally {
      session.close();
      Object.assign(audio, { ready, manifest, recordedDialogue });
      useStore.setState({ progress: previous.progress, conv: previous.conv });
      vi.unstubAllGlobals();
    }
  });

  it("uses the donor distance curve for local positioning", () => {
    expect(stoneGain(0)).toBe(1);
    expect(stoneGain(15)).toBeCloseTo(0.1775);
    expect(stoneGain(30)).toBe(0.06);
    expect(stoneGain(34.01)).toBe(0);
  });
});
