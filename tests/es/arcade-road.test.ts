import { afterEach, expect, it, vi } from "vitest";
import { audio } from "../../src/game/audio";
import { RoadEntry, type RoadHost } from "../../src/game/road/entry";
import { RoadMode } from "../../src/game/road/mode";
import { useRoad } from "../../src/game/road/store";
import { useStore } from "../../src/state/store";
import { loadPhrasePool } from "../../src/game/road/phrasePool";
import type { PromptPool } from "../../src/game/road/words";

vi.mock("../../src/ui/roadOverlay", () => ({ preloadRoadOverlay: async () => {} }));
vi.mock("../../src/game/road/phrasePool", () => ({ loadPhrasePool: vi.fn() }));

function host() {
  return { cabinetAvailable: () => true, canStart: (indoors?: boolean) => !!indoors,
    prepare: vi.fn(), entered: vi.fn(), left: vi.fn(), owns: () => true, clearTownHud: vi.fn(), returnCar: vi.fn(),
    deferLift: vi.fn(), speedFeel: () => undefined, place: vi.fn() } as unknown as RoadHost;
}
const key = { kind: "key" as const, key: "escape", repeat: false, keys: new Set<string>() };
afterEach(() => { vi.restoreAllMocks(); });

it("releases Road while its indoor chunk is pending and ignores the late completion", async () => {
  const h = host();
  const entry = new RoadEntry(h);
  const briefing = vi.spyOn(RoadMode.prototype, "startFromCabinet");
  expect(entry.start("cabinet")).toBe(true);
  expect(useRoad.getState().loadingCabinet).toBe(true);
  expect(entry.input(key)).toBe(true);
  await vi.dynamicImportSettled();
  expect(entry.active).toBe(false);
  expect(useRoad.getState().loadingCabinet).toBe(false);
  expect(briefing).not.toHaveBeenCalled();
  expect(h.left).toHaveBeenCalledOnce();
  expect(h.place).not.toHaveBeenCalled();
});

it("keeps an empty phrase pool escapable and ignores a pool resolved after cancellation", async () => {
  const h = host();
  const mode = new RoadMode(h);
  vi.spyOn(audio, "primeFile").mockImplementation(() => {});
  vi.spyOn(useStore.getState(), "updateProgress").mockImplementation(() => {});
  const empty: PromptPool = { listen: [], gaps: [] };
  vi.mocked(loadPhrasePool).mockResolvedValueOnce(empty);
  mode.startFromCabinet();
  expect(mode.startWay("phrases")).toBe(true);
  await vi.waitFor(() => expect(useRoad.getState().phase).toBe("unavailable"));
  mode.exit(false);
  let finish!: (p: PromptPool) => void;
  vi.mocked(loadPhrasePool).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
  mode.startFromCabinet(); mode.startWay("phrases"); mode.exit(true);
  finish(empty); await Promise.resolve(); await Promise.resolve();
  expect(mode.active).toBe(false);
  expect(h.place).not.toHaveBeenCalled();
  expect(h.returnCar).not.toHaveBeenCalled();
  expect(h.deferLift).not.toHaveBeenCalled();
});
