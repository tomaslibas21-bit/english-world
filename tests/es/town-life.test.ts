import { Vector3 } from "three";
import { afterEach, expect, it, vi } from "vitest";
import { REACT_LINES } from "../../src/content/reacts";
import { SITUATION_BY_ID } from "../../src/content/situations/catalog";
import { TEXT_THREADS } from "../../src/content/texts";
import { shoutVoice } from "../../src/content/voices";
import { setVariety } from "../../src/convo/compose";
import { audio } from "../../src/game/audio";
import { Ambient, type TrafficCar } from "../../src/game/ambient";
import { townLineText } from "../../src/game/life/lineText";
import { inTownRuins, TownReactions } from "../../src/game/life/townReactions";
import { NavGrid } from "../../src/game/nav";
import { TownPhone } from "../../src/game/phone/Phone";
import type { PhoneSnapshot } from "../../src/game/phone/schedule";
import type { Ride } from "../../src/game/rides/Rides";
import { BAY, SHORE } from "../../src/game/water";
import { WORLD } from "../../src/game/world/layout";
import { RIDES } from "../../src/game/world/rides";
import { THEME } from "../../src/game/world/theme";
import { Colliders } from "../../src/game/world/util";
import { emptyProgress, sitProgress } from "../../src/state/progress";
import { useStore } from "../../src/state/store";

afterEach(() => {
  setVariety("default");
  useStore.setState(useStore.getInitialState());
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each([
  ["default", "es-MX", true], ["neutral", "es-419", false], ["spain", "es-ES", false],
] as const)("shows and voices the %s traffic line", (selected, fallbackLang, recorded) => {
  setVariety(selected);
  vi.spyOn(Math, "random").mockReturnValue(0);
  const now = vi.spyOn(performance, "now").mockReturnValue(0);
  vi.spyOn(audio, "sfx").mockImplementation(() => {});
  vi.spyOn(audio, "hasClip").mockReturnValue(recorded);
  const play = vi.spyOn(audio, "play").mockResolvedValue(true);
  const car = { index: 0, front: 0, x: 0, lane: 0, dir: 1, hidden: 0 } as TrafficCar;
  const reactions = new TownReactions(() => false);
  reactions.honk(car);
  now.mockReturnValue(400);
  reactions.observe(false);
  const text = useStore.getState().hud.reaction?.text;
  const line = REACT_LINES.honk[0];
  expect(line.neutral).toBeTruthy();
  expect(text).toBe(selected === "default" ? line.en : line.neutral);
  expect(play).toHaveBeenCalledWith(shoutVoice(true, 0), 1, text, expect.objectContaining({
    optional: true, recordingOnly: false, fallbackLang,
  }));
});

it.each(["low", "high"] as const)("has a shore witness for the lanchas and far swimmers at %s quality", (quality) => {
  const nav = new NavGrid(WORLD.minX, WORLD.minZ, WORLD.maxX, WORLD.maxZ, 1, new Colliders());
  const ambient = new Ambient(nav, [[0, 0]], quality);
  vi.spyOn(audio, "hasClip").mockReturnValue(false);
  vi.spyOn(audio, "play").mockResolvedValue(true);
  const { beached, afloat } = THEME.lanchas!;
  const boats = [...RIDES.boats, ...[...beached, ...afloat].map(([x, z]) => ({ x, z }))];
  for (const { x, z } of boats) {
    const reactions = new TownReactions(() => false);
    reactions.boat(ambient, { m: { x, z } } as Ride);
    expect(reactions.schedule.state().last?.kind, `boat at ${x}, ${z}`).toBe("boat");
    reactions.clear();
  }
  const reactions = new TownReactions(() => false);
  reactions.swim(ambient, new Vector3(0, 0, SHORE.limit), true);
  expect(reactions.schedule.state().count).toBe(0);
  reactions.swim(ambient, new Vector3(0, 0, SHORE.limit + (BAY.z0 - SHORE.limit) / 3), true);
  expect(reactions.schedule.state().last?.kind).toBe("swim");
  reactions.clear();
});

it("recognizes the ruins precinct within the town zone", () => {
  const { x, z } = THEME.ruins!;
  expect(inTownRuins(new Vector3(x, 0, z + 12))).toBe(true);
  expect(inTownRuins(new Vector3(x, 5.3, z))).toBe(true);
  expect(inTownRuins(new Vector3(WORLD.minX + 1, 0, z + 7.5))).toBe(false);
});

it.each([
  ["default", "en"], ["neutral", "neutral"], ["spain", "neutral"],
] as const)("selects town lines for the %s variety", (selected, field) => {
  setVariety(selected);
  const answer = TEXT_THREADS.find(({ from }) => from === "memo")!.replies[0].answer[0];
  expect(answer.neutral).toBeTruthy();
  const lines = [
    ...Object.values(REACT_LINES).flat(),
    ...TEXT_THREADS.flatMap(({ lines, replies }) => [...lines, ...replies.flatMap((reply) => [reply, ...reply.answer])]),
  ];
  for (const line of lines) expect(townLineText(line), line.en).toBe(line[field] ?? line.en);
});

const walking: PhoneSnapshot = {
  town: true, onFoot: true, grounded: true, visible: true, enabled: false, conversation: false, panel: false, dialog: false,
  guide: false, banner: false, cardOpen: false, flight: false, loading: false, transition: false, mode: false,
};

it.each([
  ["s85-dinner", "dan-dinner", "nextDay"],
  ["s82-neighbor", "rita-package", "nextDay"],
  ["x11-billar", "memo-tournament", "later"],
  ["s86-old-friend", "lucy-coffee", "later"],
  ["x10-loteria", "tona-loteria", "later"],
] as const)("schedules %s's thread %s once its wait has elapsed", (conversation, thread, wait) => {
  expect(SITUATION_BY_ID[conversation]).toBeDefined();
  vi.setSystemTime(new Date(2026, 10, 23, 12));
  vi.stubGlobal("navigator", { vibrate: vi.fn() });
  vi.spyOn(audio, "sfx").mockImplementation(() => {});
  const progress = emptyProgress();
  progress.sits[conversation] = { ...sitProgress(progress, conversation), visits: 1 };
  useStore.setState({ progress });
  const phone = new TownPhone();
  phone.tick(0, walking);
  expect(phone.textsState()).toMatchObject({ pending: {}, due: null, sessionCount: 0 });

  useStore.getState().updateProgress((p) => {
    p.sits[conversation].completions = 1;
  });
  phone.tick(0, walking);
  expect(phone.textsState().pending).toEqual({ [thread]: { day: "2026-11-23", played: 0 } });

  phone.tick(wait === "nextDay" ? 480 : 479, walking);
  expect(phone.textsState().due).toBeNull();
  expect(phone.textsState().sessionCount).toBe(0);
  if (wait === "nextDay") vi.setSystemTime(new Date(2026, 10, 24, 12));
  phone.tick(1, walking);
  expect(useStore.getState().hud.textArrival).toBe(thread);
  expect(phone.textsState()).toMatchObject({ pending: {}, due: null, sessionCount: 1, unread: 1 });
  expect(Object.keys(phone.textsState().got)).toEqual([thread]);
});
