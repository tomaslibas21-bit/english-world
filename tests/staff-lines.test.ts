// The rooms' staff with no conversation of their own say one line when talked to (roomPeople.ts `says`, Game.ts
// staffSays): the airport coffee stand's barista sends you to Sunny Cup.
import { describe, expect, it } from "vitest";
import { ROOM_PEOPLE } from "../src/game/world/roomPeople";
import { STAFF_LINES } from "../src/content/ambient";

describe("staff with one line", () => {
  it("every `says` has its line, with its meaning, and a fixed gender for the voice", () => {
    let n = 0;
    for (const [room, people] of Object.entries(ROOM_PEOPLE)) for (const q of people) {
      if (!q.says) continue;
      n++;
      const l = STAFF_LINES[q.says];
      expect(l, `${room}: ${q.says}`).toBeTruthy();
      expect(l.en.length).toBeGreaterThan(5); expect(l.lt.length).toBeGreaterThan(5);
      expect(q.female, `${room}: ${q.says}`).not.toBeUndefined();
    }
    expect(n).toBeGreaterThan(0);
  });

  it("the airport's barista points to the café's conversation (s72, Mia at Sunny Cup)", () => {
    const barista = ROOM_PEOPLE.airport.find((q) => q.says === "airport_coffee")!;
    expect(barista).toBeTruthy();
    expect(STAFF_LINES.airport_coffee.en).toMatch(/Sunny Cup/);
    expect(STAFF_LINES.airport_coffee.lt).toMatch(/Sunny Cup/);
  });
});
