// Spanish IPA (src/editions/es/convo/ipa.ts): every Spanish unit of every conversation's lines and hints (the game's
// cards are made of these) has a transcription, in each of the three Spanishes, and the rules give the sounds each
// Spanish has.
import { describe, expect, it } from "vitest";
import { SITUATIONS } from "@/content/situations";
import { GLOBAL_LINES } from "@/content/global";
import { setVariety } from "@/convo/compose";
import { ipaForUnit } from "@/convo/ipa";
import type { SentSrc } from "@/content/types";

const choose = (s: string) => s.replace(/\{(?:m|sm|u):([^|{}]*)\|(?:f|sf|t):[^{}]*\}/g, "$1");
const textOf = (u: string) => u.replace(/\{[^{}]*\}/g, " ").trim();

function sentences(): SentSrc[] {
  const out: SentSrc[] = [];
  const add = (s?: SentSrc) => { if (s?.en) { out.push(s); if (s.neutral) out.push(s.neutral as SentSrc); if (s.spain) out.push(s.spain as SentSrc); } };
  for (const sit of SITUATIONS) {
    for (const list of Object.values(sit.lines)) list.forEach(add);
    for (const g of Object.values(sit.hints)) g.items.forEach((it) => add(it.s));
  }
  for (const list of Object.values(GLOBAL_LINES)) list.forEach(add);
  return out;
}

describe("Spanish IPA", () => {
  it("every Spanish unit of every line and hint has one, in every Spanish", () => {
    const all = sentences();
    expect(all.length).toBeGreaterThan(10000);
    const empty: string[] = [];
    for (const v of ["default", "neutral", "spain"] as const) {
      setVariety(v);
      for (const s of all) for (const u of choose(s.en).split(" | ")) {
        const t = textOf(u);
        if (/[\p{L}\d]/u.test(t) && !ipaForUnit(t)) empty.push(`${v}: "${u}" in ${s.en}`);
      }
    }
    setVariety("default");
    expect(empty.slice(0, 20)).toEqual([]);
  });

  it("follows the chosen Spanish: seseo, distinción, yeísmo, México's x, Mayan x", () => {
    setVariety("default");
    expect(ipaForUnit("cerveza")).toBe("seɾˈbesa");
    expect(ipaForUnit("calle")).toBe("ˈkaʝe");
    expect(ipaForUnit("México")).toBe("ˈmexiko");
    expect(ipaForUnit("Xcacel")).toBe("ʃkaˈsel");
    expect(ipaForUnit("¿Me puede dar")).toBe("me ˈpwede daɾ");
    expect(ipaForUnit("$85")).toBe("oˈtʃenta i ˈsinko ˈpesos");
    setVariety("spain");
    expect(ipaForUnit("cerveza")).toBe("θeɾˈbeθa");
    expect(ipaForUnit("gracias")).toBe("ˈɡɾaθjas");
    setVariety("default");
  });
});
