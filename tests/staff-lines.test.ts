// The rooms' staff with no conversation of their own say one line when talked to (roomPeople.ts `says`, Game.ts
// staffSays), and the guidance marks the talk spots that have no door to find them by (guidance.ts setMarks).
import { describe, expect, it } from "vitest";
import { ROOM_PEOPLE } from "../src/game/world/roomPeople";
import { STAFF_LINES } from "../src/content/ambient";
import { Guidance } from "../src/game/guidance";

describe("staff with one line", () => {
  it("every `says` has its line, with its meaning, and a fixed gender for the voice", () => {
    for (const [room, people] of Object.entries(ROOM_PEOPLE)) for (const q of people) {
      if (!q.says) continue;
      const l = STAFF_LINES[q.says];
      expect(l, `${room}: ${q.says}`).toBeTruthy();
      expect(l.en.length).toBeGreaterThan(5); expect(l.lt.length).toBeGreaterThan(5);
      expect(q.female, `${room}: ${q.says}`).not.toBeUndefined();
    }
  });
});

describe("talk spots marked all the time", () => {
  it("a ring where one stands and a slim beam over the person; under the beacon, the beacon's own instead", () => {
    const g = new Guidance();
    g.setMarks([{ x: 111.6, z: 8.3, person: { x: 111.35, z: 6.1 } }]);
    const marks = (g as any).marks.children as { visible: boolean; position: { x: number; z: number } }[];
    expect(marks.length).toBe(2);
    g.update(0.016);
    expect(marks.every((m) => m.visible)).toBe(true);
    g.setBeacon(111.35, 6.1, 2.9, { x: 111.6, z: 8.3 });
    g.update(0.016);
    expect(marks.every((m) => !m.visible)).toBe(true);
    g.setBeacon(null);
    g.update(0.016);
    expect(marks.every((m) => m.visible)).toBe(true);
    g.setMarks([]);
    expect((g as any).marks.children.length).toBe(0);
  });
});
