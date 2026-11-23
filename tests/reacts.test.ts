import { describe, expect, it } from "vitest";
import { REACT_LINES } from "../src/content/reacts";
import { ReactionSchedule, reactionDuration } from "../src/game/life/reacts";

describe("town reaction schedule", () => {
  it("enforces the global, kind, and speaker cooldowns", () => {
    const schedule = new ReactionSchedule(() => 0);
    expect(schedule.say("honk", "driver-1", 0, false)?.kind).toBe("honk");
    expect(schedule.state().blockedUntil).toBe(20);
    expect(schedule.say("bump", "walker-1", 19.9, false)).toBeNull();
    expect(schedule.say("honk", "driver-2", 39.9, false)).toBeNull();
    expect(schedule.say("crashDriver", "driver-1", 40, false)).toBeNull();
    expect(schedule.say("honk", "driver-2", 40, false)?.speaker).toBe("driver-2");
    expect(schedule.say("crashDriver", "driver-1", 180, false)?.speaker).toBe("driver-1");
  });

  it.each([["boat", 180], ["swim", 240]] as const)("waits longer between %s reactions", (kind, wait) => {
    const schedule = new ReactionSchedule();
    expect(schedule.say(kind, "walker-1", 0, false)).not.toBeNull();
    expect(schedule.say(kind, "walker-2", wait - 0.1, false)).toBeNull();
    expect(schedule.say(kind, "walker-2", wait, false)).not.toBeNull();
  });

  it("respects suppression and the conversation cooldown even with forced reactions", () => {
    const schedule = new ReactionSchedule();
    expect(schedule.say("bump", "walker", 0, true, true)).toBeNull();
    schedule.conversation(true, 10);
    expect(schedule.say("bump", "walker", 12, false, true)).toBeNull();
    schedule.conversation(false, 18);
    expect(schedule.state().blockedUntil).toBe(38);
    expect(schedule.say("bump", "walker", 37.99, false, true)).toBeNull();
    expect(schedule.say("bump", "walker", 38, false)?.kind).toBe("bump");
  });

  it("deals each kind's lines once per bag and caps the session", () => {
    const schedule = new ReactionSchedule(() => 0.5);
    const draw = () => schedule.say("honk", "driver", 10, false, true)?.text;
    const bag = Array.from({ length: REACT_LINES.honk.length }, draw);
    expect(new Set(bag)).toEqual(new Set(REACT_LINES.honk.map((line) => line.en)));
    expect(draw()).not.toBe(bag.at(-1));
    while (schedule.state().count < 12) expect(draw()).toBeDefined();
    expect(schedule.say("bump", "walker", 500, false)).toBeNull();
    expect(schedule.say("bump", "walker", 500, false, true)).toBeNull();
  });

  it("uses character count with a minimum reading time", () => {
    expect(reactionDuration("X")).toBe(2.6);
    expect(reactionDuration("X".repeat(60))).toBeCloseTo(4.9);
  });
});
