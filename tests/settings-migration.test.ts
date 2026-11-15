import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, migrateSettings, picturesOn, useStore } from "../src/state/store";
import { emptyProgress } from "../src/state/progress";

afterEach(() => { vi.unstubAllGlobals(); });

describe("automatic microphone settings migration", () => {
  it.each([false, true, undefined])("retires legacy autoListen=%s while preserving other preferences", (autoListen) => {
    const saved = { autoListen, v: 4, volume: 0.35, onDevice: true, play: "light", lt: false, textSize: 1.3 };
    const settings = migrateSettings(saved);
    expect(settings).not.toHaveProperty("autoListen");
    expect(settings).toMatchObject({ v: 6, volume: 0.35, onDevice: true, play: "light", lt: false, textSize: 1.3 });
    expect(saved).toHaveProperty("autoListen", autoListen);
    expect(DEFAULT_SETTINGS).not.toHaveProperty("autoListen");
  });

  it("drops reintroduced legacy values before saving settings without losing learner progress", () => {
    const progress = emptyProgress();
    progress.objective = "s72-cafe";
    progress.sits["s72-cafe"] = { visits: 4, completions: 2, used: ["order"], twists: [], memory: { lastDrink: "latte" } };
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { setItem });
    useStore.setState({ settings: migrateSettings({ v: 4, autoListen: false, volume: 0.3 }), progress });
    useStore.getState().setSettings({ volume: 0.55, autoListen: false } as any);
    expect(useStore.getState().settings).not.toHaveProperty("autoListen");
    const saved = JSON.parse(setItem.mock.lastCall![1]);
    expect(saved.settings).not.toHaveProperty("autoListen");
    expect(saved.settings.volume).toBe(0.55);
    expect(saved.sits).toEqual(progress.sits);
    expect(saved.objective).toBe(progress.objective);
  });

  it("sanitizes a previously saved manual-only setting on actual store initialization", async () => {
    const progress = emptyProgress();
    progress.settings = { v: 4, autoListen: false, volume: 0.4, play: "light" };
    progress.objective = "s35-gym";
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(progress), setItem: vi.fn() });
    vi.resetModules();
    const loaded = await import("../src/state/store");
    expect(loaded.useStore.getState().settings).not.toHaveProperty("autoListen");
    expect(loaded.useStore.getState().settings).toMatchObject({ volume: 0.4, play: "light" });
    expect(loaded.useStore.getState().progress.settings).not.toHaveProperty("autoListen");
    expect(loaded.useStore.getState().progress.objective).toBe("s35-gym");
  });
});

// Owner, 15 Nov 2026: a conversation in the 3D town starts with the person in 3D; the picture comes when asked for.
describe("conversations start in 3D unless the learner picked the picture (settings v6)", () => {
  it("a new learner talks with the person in 3D in the town, and in front of the pictures in the pictures-only mode", () => {
    expect(DEFAULT_SETTINGS).not.toHaveProperty("scenes");
    expect(picturesOn({ ...migrateSettings(undefined), play: "town" })).toBe(false);
    expect(picturesOn({ ...migrateSettings(undefined), play: "light" })).toBe(true);
  });

  it.each([1, 4, 5])("a picture setting saved as on before v6 (from v%i) was never a choice: forgotten", (v) => {
    const settings = migrateSettings({ v, scenes: true, volume: 0.4, play: "town" });
    expect(settings).not.toHaveProperty("scenes");
    expect(settings).toMatchObject({ v: 6, volume: 0.4 });
    expect(picturesOn(settings)).toBe(false);
    // (the pictures-only mode keeps its pictures)
    expect(picturesOn(migrateSettings({ v, scenes: true, play: "light" }))).toBe(true);
  });

  it("pictures switched off before v6 stay off, in both modes", () => {
    expect(migrateSettings({ v: 5, scenes: false, play: "town" }).scenes).toBe(false);
    expect(picturesOn(migrateSettings({ v: 5, scenes: false, play: "light" }))).toBe(false);
  });

  it("from v6 on the learner's choice is kept: the picture stays for whoever picked it", () => {
    expect(picturesOn(migrateSettings({ v: 6, scenes: true, play: "town" }))).toBe(true);
    expect(picturesOn(migrateSettings({ v: 6, scenes: false, play: "town" }))).toBe(false);
    expect(picturesOn(migrateSettings({ v: 6, play: "town" }))).toBe(false);
  });

  it("picking the picture is saved with the progress, and loads again as the picture", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { setItem });
    useStore.setState({ settings: migrateSettings({ v: 5, scenes: true, play: "town" }), progress: emptyProgress() });
    expect(picturesOn(useStore.getState().settings)).toBe(false);
    useStore.getState().setSettings({ volume: 0.5 });
    expect(JSON.parse(setItem.mock.lastCall![1]).settings).not.toHaveProperty("scenes");
    useStore.getState().setSettings({ scenes: true });
    const saved = JSON.parse(setItem.mock.lastCall![1]).settings;
    expect(saved).toMatchObject({ v: 6, scenes: true });
    expect(picturesOn(migrateSettings(saved))).toBe(true);
  });
});
