// The small "*" after the other person's sentence that holds its natural translation (src/ui/natTip.ts,
// Interlinear.tsx NatTip): which lines get one, where its tooltip goes, and what the markup says.
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { compose, type Sentence } from "../src/convo/compose";
import { t } from "../src/content/dsl";
import { natMatchesGloss, natSaysMore, newWords, natNorm, glossLine, stem, placeTip } from "../src/ui/natTip";
import { Interlinear } from "../src/ui/Interlinear";

/** A sentence as the conversation shows it (units split on " | "). */
const sent = (en: string, lt: string, nat: string): Sentence => compose(t(en, lt, nat), {}, { look: () => undefined });
const pleasure = () => sent("My | pleasure!", "Mano | malonumas!", "Mielai!");
const business = () => sent("Business | or | pleasure?", "Darbo reikalais | ar | poilsiui?", "Darbo reikalais ar poilsiui?");

describe("which lines get the asterisk: the natural sentence has a content word the glosses don't", () => {
  it("yes for “My pleasure!” (Mano malonumas! word by word, Mielai! naturally)", () => {
    expect(natSaysMore(pleasure())).toBe(true);
    expect(newWords(pleasure())).toEqual(["mielai"]);
  });
  it("no for “Business or pleasure?” (the same words both ways)", () => {
    expect(natSaysMore(business())).toBe(false);
  });
  it("no when only punctuation, quotes, dashes or capitals differ", () => {
    expect(natSaysMore(sent("Hot | or | iced?", "Karštą | ar | su ledu?", "Karštą ar su ledu!"))).toBe(false);
    expect(natSaysMore(sent("Hot | or | iced?", "Karštą | ar | su ledu?", "Karštą – ar su ledu…"))).toBe(false);
    expect(natSaysMore(sent("A | flat white, | please.", "— | „Flat white“, | prašom.", "«Flat white» prašom"))).toBe(false);
    expect(natSaysMore(sent("Hello!", "Sveiki!", "SVEIKI"))).toBe(false);
  });
  it("yes for a new word among other forms of the glosses' words (atvykau is new, atostogų is atostogose)", () => {
    const s = sent("I'm | here | on vacation.", "Aš esu | čia | atostogose.", "Atvykau atostogų.");
    expect(newWords(s)).toEqual(["atvykau"]);
    expect(natSaysMore(s)).toBe(true);
    expect(natSaysMore(sent("Sounds | good!", "Skamba | gerai!", "Puiku!"))).toBe(true);
  });
  it("no when the natural sentence only leaves words out (Jūs galite / Galite)", () => {
    expect(natSaysMore(sent("You | can.", "Jūs | galite.", "Galite."))).toBe(false);
    // the old rule gave this one an asterisk: the natural sentence only drops jūs
    expect(natSaysMore(sent("What | would | you | like?", "Ko | — | jūs | norėtumėte?", "Ko norėtumėte?"))).toBe(false);
  });
  it("no for other forms of the same words, or another word order", () => {
    expect(natSaysMore(sent("What | would | you | like?", "Ko | — | jūs | norėtumėte?", "Ko norite?"))).toBe(false);
    expect(natSaysMore(sent("I'll | take | the | chips | off.", "— | Išimsiu | — | traškučius | —.", "Traškučius išimsiu."))).toBe(false);
    expect(natSaysMore(sent("We | have | cars | available.", "Mes | turime | automobilių | laisvų.", "Turime laisvų automobilių."))).toBe(false);
  });
  it("no for fillers and particles (Tai… / Na…)", () => {
    expect(natSaysMore(sent("So, | how's it going?", "Tai, | kaip sekasi?", "Na, kaip sekasi?"))).toBe(false);
    expect(natSaysMore(sent("How's it going?", "Kaip sekasi?", "Na, ir kaip gi sekasi?"))).toBe(false);
  });
  it("reads the glosses without the — units (words Lithuanian doesn't say on their own)", () => {
    expect(glossLine(sent("What | would | you | like?", "Ko | — | jūs | norėtumėte?", "Ko jūs norėtumėte?").units)).toBe("Ko jūs norėtumėte?");
  });
  it("never without a natural sentence", () => {
    expect(natSaysMore({ units: [{ en: "Hi!", lt: "Labas!" }], nat: "" })).toBe(false);
    expect(natSaysMore({ units: [{ en: "Hi!", lt: "Labas!" }], nat: " – " })).toBe(false);
  });
  it("compares lower case, without punctuation, with single spaces, and words by a crude stem", () => {
    expect(natNorm("„Labas,  RYTAS!“ – sakė…")).toBe("labas rytas sakė");
    expect(natNorm("Ačiū — ŽINOMA.")).toBe("ačiū žinoma");
    expect([stem("atostogose"), stem("atostogų")]).toEqual(["atost", "atost"]);
    expect([stem("norite"), stem("norėtumėte"), stem("norėčiau")]).toEqual(["nor", "nore", "nore"]);
    expect(stem("atvykau")).toBe("atvyk");
  });
});

describe("where the tooltip goes", () => {
  const panel = { left: 0, top: 0, right: 400, bottom: 800 };
  it("centred above the asterisk when there's room", () => {
    expect(placeTip({ left: 200, right: 210, top: 300, bottom: 320 }, 120, 40, panel)).toEqual({ left: 145, top: 252, below: false, arrow: 60 });
  });
  it("below it when there's no room above", () => {
    expect(placeTip({ left: 200, right: 210, top: 30, bottom: 50 }, 120, 40, panel)).toEqual({ left: 145, top: 58, below: true, arrow: 60 });
  });
  it("inside the conversation panel, the arrow still on the asterisk", () => {
    // a phone 375 px wide: the panel 8 px from each side, the asterisk at the end of a line near its right edge
    const phone = { left: 8, top: 340, right: 367, bottom: 804 };
    const spot = placeTip({ left: 340, right: 350, top: 500, bottom: 520 }, 260, 64, phone);
    expect(spot.left).toBe(367 - 8 - 260);
    expect(spot.left + 260).toBeLessThanOrEqual(367 - 8);
    expect(spot.arrow).toBe(345 - spot.left);
    expect(placeTip({ left: 12, right: 22, top: 500, bottom: 520 }, 260, 64, phone).left).toBe(16);
  });
});

describe("the markup", () => {
  const html = (props: Parameters<typeof Interlinear>[0]) => renderToStaticMarkup(createElement(Interlinear, props));
  const starOf = (out: string) => out.match(/<button[^>]*class="nat-star"[^>]*>\*<\/button>/)?.[0];

  it("omits both the duplicate natural row and asterisk from matching player examples", () => {
    const out = html({ s: business(), lt: true, ipa: true, compactNat: true });
    expect(out).not.toContain('class="nat"');
    expect(out).not.toContain('nat-star');
    expect(out).toContain('class="lt"');
    expect(out).toContain('class="ipa"');
    const punctuation = sent("A | coffee, | please.", "— | Kavos, | prašom.", "KAVOS — prašom!");
    expect(natMatchesGloss(punctuation)).toBe(true);
    expect(html({ s: punctuation, lt: true, ipa: false, compactNat: true })).not.toContain('nat-star');
  });

  it("puts differing player wording behind the same accessible tooltip, without a natural row", () => {
    const out = html({ s: pleasure(), lt: true, ipa: true, compactNat: true });
    const star = starOf(out);
    expect(star).toContain('aria-label="Natūralus vertimas"');
    expect(star).toContain('aria-expanded="false"');
    const id = star!.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(out).toContain(`id="${id}" role="tooltip" lang="lt"`);
    expect(out).toMatch(/role="tooltip"[^>]*hidden=""[^>]*>Mielai!<\/span>/);
    expect(out).not.toContain('class="nat"');
    expect(out).toContain('class="lt"');
    expect(out).toContain('class="ipa"');
  });

  it("retains natural wording for changed grammar, word order and omitted words in player examples", () => {
    for (const s of [
      sent("I | knew | it!", "Aš | žinojau | tai!", "Taip ir žinojau!"),
      sent("What | would | you | like?", "Ko | — | jūs | norėtumėte?", "Ko norite?"),
      sent("We | have | cars | available.", "Mes | turime | automobilių | laisvų.", "Turime laisvų automobilių."),
      sent("I | have | a | reservation.", "Aš | turiu | — | rezervaciją.", "Turiu rezervaciją."),
    ]) {
      expect(natMatchesGloss(s)).toBe(false);
      expect(starOf(html({ s, lt: true, ipa: false, compactNat: true }))).toBeTruthy();
    }
  });

  it("never adds a player translation tooltip with LT off or without natural text", () => {
    for (const ipa of [true, false]) {
      const out = html({ s: pleasure(), lt: false, ipa, compactNat: true });
      expect(out).not.toContain('nat-star');
      expect(out).not.toContain('class="nat"');
    }
    const empty = { ...pleasure(), nat: "" };
    expect(html({ s: empty, lt: true, ipa: true, compactNat: true })).not.toContain('nat-star');
  });

  it("“My pleasure!”: an asterisk button right after the last word, its tooltip the natural sentence", () => {
    const out = html({ s: pleasure(), lt: true, ipa: false, nat: false, natTip: true });
    const star = starOf(out);
    expect(star).toBeTruthy();
    expect(star).toContain('type="button"');
    expect(star).toContain('aria-label="Natūralus vertimas"');
    expect(star).toContain('aria-expanded="false"');
    // the last unit and the asterisk together, nothing between them
    expect(out).toMatch(/<span class="nat-last"><span class="u tap" data-i="1"><span class="en">pleasure!<\/span>.*?<\/span><button/);
    // linked to a tooltip that holds the natural sentence (hidden until opened)
    const id = star!.match(/aria-describedby="([^"]+)"/)?.[1];
    const tip = out.match(/<span[^>]*role="tooltip"[^>]*>([^<]*)<\/span>/);
    expect(id).toBeTruthy();
    expect(tip?.[0]).toContain(`id="${id}"`);
    expect(tip?.[0]).toContain('lang="lt"');
    expect(tip?.[0]).toMatch(/ hidden=""/);
    expect(tip?.[1]).toBe("Mielai!");
    // and no separate natural line
    expect(out).not.toContain('class="nat"');
  });

  it("also with IPA on", () => {
    expect(starOf(html({ s: pleasure(), lt: true, ipa: true, nat: false, natTip: true }))).toBeTruthy();
  });

  it("“Business or pleasure?”: no asterisk (the glosses already say it)", () => {
    const out = html({ s: business(), lt: true, ipa: false, nat: false, natTip: true });
    expect(out).not.toContain("nat-star");
    expect(out).not.toContain('role="tooltip"');
  });

  it("no asterisk with the whole sentence on (it's under the line), with LT off, or on the learner's own phrases", () => {
    const on = html({ s: pleasure(), lt: true, ipa: false, nat: true, natTip: true });
    expect(on).not.toContain("nat-star");
    expect(on).toContain('<div class="nat" lang="lt">Mielai!</div>');
    expect(html({ s: pleasure(), lt: false, ipa: false, nat: false, natTip: true })).not.toContain("nat-star");
    expect(html({ s: pleasure(), lt: false, ipa: true, nat: false, natTip: true })).not.toContain("nat-star");
    // the hints ("Daugiau frazių") pass nat={lt}, the guide's examples pass no nat, and neither asks for the asterisk
    expect(html({ s: pleasure(), lt: true, ipa: false, nat: true })).not.toContain("nat-star");
    expect(html({ s: pleasure(), lt: true, ipa: true })).not.toContain("nat-star");
    expect(html({ s: pleasure(), lt: true, ipa: false, nat: false })).not.toContain("nat-star");
  });
});

describe("the line's word notes behind the asterisk (owner, 14 Nov 2026: on a phone the dotted underline is no help)", () => {
  const html = (props: Parameters<typeof Interlinear>[0]) => renderToStaticMarkup(createElement(Interlinear, props));
  const note = "cochinita pibil – lėtai kepta kiauliena su achiote.";
  const withNote = () => compose(t("The | cochinita | is | great.", "— | cochinita | yra | puiki.", "Cochinita – puiki.", { flags: { 1: note } }), {}, { look: () => undefined });
  const tipOf = (out: string) => out.match(/role="tooltip"[^>]*>(.*?)<\/span><\/span>/)?.[1] ?? out.match(/role="tooltip"[^>]*>(.*)$/)?.[1];

  it("a line with a note gets the asterisk even when the natural sentence adds nothing or is shown under it", () => {
    for (const nat of [true, false]) {
      const out = html({ s: withNote(), lt: true, ipa: false, nat, natTip: true });
      expect(out).toContain("nat-star");
      expect(out).toContain(`<span class="nat-tipnote">${note}</span>`);
    }
    // the learner's examples too
    expect(html({ s: withNote(), lt: true, ipa: false, compactNat: true })).toContain("nat-tipnote");
  });

  it("the natural sentence first, then the note, when both are new", () => {
    const s = compose(t("My | pleasure!", "Mano | malonumas!", "Mielai!", { flags: { 1: "malonumas: a note" } }), {}, { look: () => undefined });
    const out = html({ s, lt: true, ipa: false, nat: false, natTip: true });
    expect(out).toMatch(/role="tooltip"[^>]*>Mielai!<span class="nat-tipnote sep">malonumas: a note<\/span>/);
    expect(tipOf(out)).toBeTruthy();
  });

  it("no asterisk for notes with the word-by-word line off (the notes are about its words)", () => {
    expect(html({ s: withNote(), lt: false, ipa: true, nat: false, natTip: true })).not.toContain("nat-star");
  });
});
