// Numbers in Puerto Colibrí (owner, 16 Nov 2026): the IPA under a number says what the voice says (a Mexican phone
// number in its groups, the last four digits often in pairs), and the speech check takes a number said the usual ways.
import { describe, expect, it } from "vitest";
import { ipaForSentence } from "../../src/convo/ipa";
import { buildNlu } from "../../src/convo/dialogue";
import { GLOBAL } from "../../src/content/global";
import { NPCS } from "../../src/content/npcs";
import { SITUATION_BY_ID } from "../../src/content/situations";

const ipa = (units: string, say?: string) => ipaForSentence(units.split(" | "), say);

describe("IPA of numbers (Spanish)", () => {
  it("reads a phone number as the clip says it", () => {
    expect(ipa("Mi | número | es | 984 | 123 | 4567.", "Mi número es nueve ocho cuatro, uno dos tres, cuarenta y cinco, sesenta y siete.").slice(3))
      .toEqual(["ˈnwebe ˈotʃo ˈkwatɾo", "ˈuno dos tɾes", "kwaˈɾenta i ˈsinko seˈsenta i ˈsjete"]);
    expect(ipa("Es | el | +1 | 512 | 555 | 0142.", "Es el más uno, cinco uno dos, cinco cinco cinco, cero uno, cuarenta y dos.").slice(2))
      .toEqual(["mas ˈuno", "ˈsinko ˈuno dos", "ˈsinko ˈsinko ˈsinko", "ˈseɾo ˈuno kwaˈɾenta i dos"]);
  });
  it("without a spoken form, a phone number or a code digit by digit, a seat as a number and a letter", () => {
    expect(ipa("984 | 123 | 4567")).toEqual(["ˈnwebe ˈotʃo ˈkwatɾo", "ˈuno dos tɾes", "ˈkwatɾo ˈsinko sei̯s ˈsjete"]);
    expect(ipa("HP-4471")[0]).toBe("ˈatʃe pe ˈkwatɾo ˈkwatɾo ˈsjete ˈuno");
    expect(ipa("12A")[0]).toBe("ˈdose a");
    expect(ipa("$2,500")[0]).toBe("dos mil kiˈnjentos ˈpesos");
  });
});

describe("speech check of a phone number (Spanish)", () => {
  const nlu = buildNlu(SITUATION_BY_ID["s65b-baggage"], GLOBAL, NPCS);
  const intent = (text: string) => nlu.parse(text, ["phone", "phone_ctx", "phone_none"]).best?.segments.map((s) => s.intent) ?? [];
  it.each([
    "mi número es 984 123 4567", "984-123-4567", "es el +1 512 555 0142",
    "mi número es nueve ocho cuatro uno dos tres cuatro cinco seis siete",
    "mi número es nueve ocho cuatro uno dos tres cuarenta y cinco sesenta y siete",
    "es el más uno cinco uno dos cinco cinco cinco cero uno cuatro dos",
  ])("%s", (text) => {
    expect(intent(text).some((i) => i === "phone" || i === "phone_ctx")).toBe(true);
  });
});
