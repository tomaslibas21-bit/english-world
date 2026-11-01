// In the course the game's voice clips are only for learners who have it (fluent-steps docs/GAME.md): each clip's
// address carries the course's files token (src/game/audio.ts).
import { afterEach, describe, expect, it } from "vitest";
import { clipUrl, filesToken } from "../src/game/audio";

const store = (value: string | null) => {
  (globalThis as any).localStorage = { getItem: () => value };
};
afterEach(() => { delete (globalThis as any).localStorage; });

describe("a clip's address", () => {
  it("is the folder and the key, with the version of a re-recorded clip", () => {
    expect(clipUrl("https://host/game/audio-v2/", "7ff0b374e4c1")).toBe("https://host/game/audio-v2/7ff0b374e4c1.mp3");
    expect(clipUrl("/audio-v2/", "k", "0123456789abcdef")).toBe("/audio-v2/k.mp3?v=0123456789ab");
  });
  it("carries the files token when there is one", () => {
    expect(clipUrl("https://host/", "k", undefined, "v1.1.a.b")).toBe("https://host/k.mp3?t=v1.1.a.b");
    expect(clipUrl("https://host/", "k", "abc", "v1.1+a/b")).toBe("https://host/k.mp3?v=abc&t=v1.1%2Ba%2Fb");
    expect(clipUrl("https://host/", "k", undefined, null)).toBe("https://host/k.mp3");
  });
});

describe("the files token", () => {
  it("is the course's newer one from localStorage while it lasts", () => {
    store(JSON.stringify({ account: "a", token: "fresh", exp: Date.now() / 1000 + 3600 }));
    expect(filesToken()).toBe("fresh");
  });
  it("is none outside the course, or once the kept one has ended", () => {
    expect(filesToken()).toBe(null);
    store(JSON.stringify({ account: "a", token: "old", exp: Date.now() / 1000 - 10 }));
    expect(filesToken()).toBe(null);
    store("not json");
    expect(filesToken()).toBe(null);
  });
});
