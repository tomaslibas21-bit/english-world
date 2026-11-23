import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** The phrase sets of the road and open-water phrase mode: course phrases with both recordings and word timings. */
export function checkPhraseSet(url: URL, foreign: string, prompt: string) {
  const set = JSON.parse(readFileSync(url, "utf8"));
  describe(`phrase set ${set.set}`, () => {
    it("has its languages and 150–250 items with unique ids and phrases", () => {
      expect([set.foreign, set.prompt]).toEqual([foreign, prompt]);
      expect(set.items.length).toBeGreaterThanOrEqual(150);
      expect(set.items.length).toBeLessThanOrEqual(250);
      expect(new Set(set.items.map((i: { id: string }) => i.id)).size).toBe(set.items.length);
      expect(new Set(set.items.map((i: { f: string }) => i.f)).size).toBe(set.items.length);
    });
    it("gives every phrase 2–7 words, ≤ 40 characters, a timing per word and both clips", () => {
      for (const item of set.items) {
        expect(item.words.join(" "), item.id).toBe(item.f);
        expect(item.words.length, item.id).toBeGreaterThanOrEqual(2);
        expect(item.words.length, item.id).toBeLessThanOrEqual(7);
        expect(item.f.length, item.id).toBeLessThanOrEqual(40);
        expect(item.p.trim().length, item.id).toBeGreaterThan(0);
        expect(item.t.length, item.id).toBe(item.words.length);
        let last = 0;
        for (const [start, end] of item.t) {
          expect(start, item.id).toBeGreaterThanOrEqual(last - 0.001);
          expect(end, item.id).toBeGreaterThan(start);
          last = end;
        }
        expect(item.fClip, item.id).toMatch(/^ph-[0-9a-f]{10}\.mp3$/);
        expect(item.pClip, item.id).toMatch(/^ph-[0-9a-f]{10}\.mp3$/);
      }
    });
  });
}

