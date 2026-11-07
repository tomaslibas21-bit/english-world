import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, migrateSettings, useStore } from "../src/state/store";
import { emptyProgress } from "../src/state/progress";

afterEach(() => { vi.unstubAllGlobals(); });

describe("automatic microphone settings migration", () => {
  it.each([false, true, undefined])("retires legacy autoListen=%s while preserving other preferences", (autoListen) => {
    const saved = { autoListen, v: 4, volume: 0.35, onDevice: true, play: "light", lt: false, textSize: 1.3 };
    const settings = migrateSettings(saved);
    expect(settings).not.toHaveProperty("autoListen");
    expect(settings).toMatchObject({ v: 5, volume: 0.35, onDevice: true, play: "light", lt: false, textSize: 1.3 });
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
