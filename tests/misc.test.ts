import { describe, expect, it } from "vitest";
import { withoutAddressedNames, audioKey } from "../src/audio-key";
import { ltCount } from "../src/ui/lt";

describe("voicing lines that address the player by name", () => {
  const N = ["Rūta", "Kazlauskienė"];
  it("drops a name used as a form of address", () => {
    expect(withoutAddressedNames("Thanks, Rūta!", N)).toBe("Thanks!");
    expect(withoutAddressedNames("So, Rūta, where are you from?", N)).toBe("So, where are you from?");
    expect(withoutAddressedNames("Rūta, your latte!", N)).toBe("Your latte!");
    expect(withoutAddressedNames("Hi Rūta!", N)).toBe("Hi!");
    expect(withoutAddressedNames("Hello, Ms. Kazlauskienė.", N)).toBe("Hello.");
  });
  it("keeps names that are part of the content", () => {
    expect(withoutAddressedNames("My name is Rūta.", N)).toBeNull();
    expect(withoutAddressedNames("Is it Rūta Kazlauskienė?", N)).toBeNull();
    expect(withoutAddressedNames("Great!", N)).toBeNull();
  });
  it("audio keys are stable", () => {
    expect(audioKey("af_bella", 1, "Hi! What can I get you?")).toBe(audioKey("af_bella", 1, " Hi! What can I get you? "));
    expect(audioKey("af_bella", 1, "Hi!")).not.toBe(audioKey("af_bella", 1.18, "Hi!"));
  });
});

describe("Lithuanian number agreement", () => {
  it("chooses the right noun form", () => {
    const f = (n: number) => ltCount(n, "pokalbis", "pokalbiai", "pokalbių");
    expect([1, 2, 9, 10, 11, 19, 20, 21, 22, 30, 37, 101, 111].map(f)).toEqual([
      "pokalbis", "pokalbiai", "pokalbiai", "pokalbių", "pokalbių", "pokalbių", "pokalbių",
      "pokalbis", "pokalbiai", "pokalbių", "pokalbiai", "pokalbis", "pokalbių",
    ]);
  });
});
