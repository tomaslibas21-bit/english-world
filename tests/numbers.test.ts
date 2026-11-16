// Numbers (owner, 16 Nov 2026): the IPA under a number says what the voice says (a phone number digit by digit, not
// "six hundred twelve"), every number has IPA, and the speech check takes a number said the usual ways.
import { describe, expect, it } from "vitest";
import { ipaForSentence, readNumber } from "../src/convo/ipa";
import { spokenNumbers, hasDigit } from "../src/convo/sayAlign";
import { buildNlu } from "../src/convo/dialogue";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { SITUATION_BY_ID } from "../src/content/situations";
import { enumerateAll } from "../tools/enumerate";

const ipa = (units: string, say?: string) => ipaForSentence(units.split(" | "), say);

describe("IPA of numbers", () => {
  it("reads a phone number digit by digit, as the clip says it", () => {
    expect(ipa("My | number | is | +370 | 612 | 34567.", "My number is plus three seven zero, six one two, three four five six seven.").slice(3))
      .toEqual(["plʌs θri ˈsɛvən ˈziroʊ", "sɪks wʌn tu", "θri fɔr faɪv sɪks ˈsɛvən"]);
    expect(ipa("It's | 555 | 0142.", "It's five five five, oh one four two.").slice(1)).toEqual(["faɪv faɪv faɪv", "oʊ wʌn fɔr tu"]);
  });
  it("without a spoken form, reads numbers the way Americans say them", () => {
    expect(ipa("It's | 555 | 0142.").slice(1)).toEqual(["faɪv faɪv faɪv", "oʊ wʌn fɔr tu"]);
    expect(readNumber("555-0142")).toEqual(["five", "five", "five", "oh", "one", "four", "two"]);
    expect(readNumber("$12.76")).toEqual(["twelve", "seventy", "six"]);
    expect(readNumber("$5")).toEqual(["five", "dollars"]);
    expect(readNumber("7:30")).toEqual(["seven", "thirty"]);
    expect(readNumber("1998")).toEqual(["nineteen", "ninety", "eight"]);
    expect(readNumber("4th")).toEqual(["fourth"]);
    expect(readNumber("5–7")).toEqual(["five", "to", "seven"]);
    expect(readNumber("12A")).toEqual(["twelve", "A"]);
    expect(readNumber("HH-4471")).toEqual(["H", "H", "four", "four", "seven", "one"]);
    expect(readNumber("$9,000")).toEqual(["nine", "thousand", "dollars"]);
  });
  it("spells initialisms (US, ID)", () => {
    expect(ipa("I | don't have | a | US | number.")[3]).toBe("ju ɛs");
  });
  it("every number the game says has IPA that follows its clip", () => {
    const { utts } = enumerateAll({ fuzzRuns: 0, v2: true });
    let numbers = 0, followed = 0;
    const empty: string[] = [];
    for (const u of utts) {
      if (!/\d/.test(u.en)) continue;
      const words = u.en.split(/\s+/).filter(Boolean);
      const sp = spokenNumbers(words, u.say);
      const ip = ipaForSentence(words, u.say);
      words.forEach((w, i) => {
        if (!hasDigit(w)) return;
        numbers++;
        if (sp[i]) followed++;
        if (!ip[i]) empty.push(`${w} in "${u.en}"`);
      });
    }
    expect(empty).toEqual([]);
    expect(followed / numbers).toBeGreaterThan(0.99);
  });
});

describe("speech check of a phone number", () => {
  const sit = SITUATION_BY_ID["s65b-baggage"];
  const nlu = buildNlu(sit, GLOBAL, NPCS);
  const intent = (text: string) => nlu.parse(text, ["phone", "phone_ctx", "phone_none"]).best?.segments.map((s) => s.intent) ?? [];
  it.each([
    "370-612-3456", "plus 370 612 34567", "my number is +370 612 34567", "my number is 555-0142", "555 0142",
    "five five five zero one four two", "five five five oh one four two", "it's 555 oh one four two",
    "my number is plus three seven zero six one two three four five six seven",
  ])("%s", (text) => {
    expect(intent(text).some((i) => i === "phone" || i === "phone_ctx")).toBe(true);
  });
});
