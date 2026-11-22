import { describe, expect, it, vi } from "vitest";
import { actionHelp, updateHelp } from "../src/game/kit/help";
import { ModeRegistry, type ModeScreen, type GameMode } from "../src/game/kit/modes";

describe("mini-game help", () => {
  it("waits for a clean streak, delays the chip, and restores help after a miss", () => {
    let help = updateHelp(undefined, true);
    expect(actionHelp(help.level, 0)).toEqual({ gloss: true, action: true });
    help = updateHelp(help, true);
    expect(help).toEqual({ level: 0, streak: 2 });
    help = updateHelp(help, false);
    expect(help).toEqual({ level: 0, streak: 0 });
    for (let i = 0; i < 3; i++) help = updateHelp(help, true);
    expect(help).toEqual({ level: 1, streak: 0 });
    expect(actionHelp(help.level, 1)).toEqual({ gloss: false, action: false });
    expect(actionHelp(help.level, 2)).toEqual({ gloss: false, action: true });
    for (let i = 0; i < 3; i++) help = updateHelp(help, true);
    expect(actionHelp(help.level, 20)).toEqual({ gloss: false, action: false });
    expect(updateHelp(help, false)).toEqual({ level: 1, streak: 0 });
  });
});

describe("mode registry", () => {
  it("reserves a start, forwards frames to one mode, and restores the previous screen", () => {
    const earlier: ModeScreen = { kind: "overlay", id: "previous" };
    let screen: ModeScreen | null = earlier;
    const modes = new ModeRegistry({ read: () => screen, set: (value) => { screen = value; } });
    const mode = (id: string): GameMode & { active: boolean } => ({
      id, active: false, cleanScreen: "menu",
      start: vi.fn(() => true), update: vi.fn(), input: vi.fn(() => true), dispose: vi.fn(),
      exit() { this.active = false; modes.left(id); },
    });
    const first = mode("one"), second = mode("two");
    modes.register(first);
    modes.register(second);
    expect(modes.start("one")).toBe(true);
    expect(modes.start("two")).toBe(false);
    expect(modes.start("one")).toBe(false);
    expect(first.start).toHaveBeenCalledOnce();
    expect(modes.active).toBeNull();
    first.active = true;
    modes.entered("one");
    expect(screen).toMatchObject({ kind: "menu", id: "one" });
    expect(modes.active).toBe(first);
    modes.update({ dt: 1, time: 10, x: 0, y: 0, brake: false, blocked: false });
    expect(first.update).toHaveBeenCalledOnce();
    expect(second.update).not.toHaveBeenCalled();
    modes.exit();
    expect(screen).toBe(earlier);
    expect(modes.active).toBeNull();
    expect(modes.start("two")).toBe(true);
    second.active = true;
    modes.entered("two");
    modes.dispose();
    expect(screen).toBe(earlier);
    expect(first.dispose).toHaveBeenCalledOnce();
    expect(second.dispose).toHaveBeenCalledOnce();
  });
});
