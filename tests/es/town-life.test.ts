import { afterEach, expect, it, vi } from "vitest";
import { REACT_LINES } from "../../src/content/reacts";
import { TEXT_THREADS } from "../../src/content/texts";
import { shoutVoice } from "../../src/content/voices";
import { setVariety } from "../../src/convo/compose";
import { audio } from "../../src/game/audio";
import type { TrafficCar } from "../../src/game/ambient";
import { townLineText } from "../../src/game/life/lineText";
import { TownReactions } from "../../src/game/life/townReactions";
import { useStore } from "../../src/state/store";

afterEach(() => {
  setVariety("default");
  useStore.setState(useStore.getInitialState());
  vi.restoreAllMocks();
});

it.each(["default", "neutral", "spain"] as const)("shows and voices the %s traffic line", (selected) => {
  setVariety(selected);
  vi.spyOn(Math, "random").mockReturnValue(0);
  const now = vi.spyOn(performance, "now").mockReturnValue(0);
  vi.spyOn(audio, "sfx").mockImplementation(() => {});
  vi.spyOn(audio, "hasClip").mockReturnValue(true);
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
  expect(play).toHaveBeenCalledWith(shoutVoice(true, 0), 1, text, expect.objectContaining({ recordingOnly: true }));
});

it.each(["default", "neutral", "spain"] as const)("selects the %s text answer", (selected) => {
  setVariety(selected);
  const answer = TEXT_THREADS.find(({ from }) => from === "memo")!.replies[0].answer[0];
  expect(answer.neutral).toBeTruthy();
  expect(townLineText(answer)).toBe(selected === "default" ? answer.en : answer.neutral);
});
