// The small "*" after the other person's line (src/ui/natTip.ts, Interlinear.tsx NatTip) in the Spanish edition: the
// word glosses and the natural sentence are both English, so they are compared as English (src/editions/es/ui/lt.ts:
// English's grammar words don't count, two forms of an English word are one word), and the asterisk and its tooltip
// speak English. Runs in the vitest project "es" (vite.config.ts), where src/editions/es/ replaces the base files.
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { compose, type Sentence } from "../../src/convo/compose";
import { t } from "../../src/content/dsl";
import { natSaysMore, newWords, stem } from "../../src/ui/natTip";
import { Interlinear } from "../../src/ui/Interlinear";

/** A line as the conversation shows it (units split on " | "): the Spanish, its English glosses, the natural English. */
const sent = (es: string, en: string, nat: string): Sentence => compose(t(es, en, nat), {}, { look: () => undefined });
// s64a-checkin: "Muy bien" is meant as "Okay", and the maleta is a bag
const bag = () => sent("Muy | bien, | una | maleta.", "Very | good, | one | suitcase.", "Okay, one bag.");

describe("which lines get the asterisk: the natural English has a content word the English glosses don't", () => {
  it("yes for “Muy bien, una maleta.” (Very good, one suitcase / Okay, one bag)", () => {
    expect(newWords(bag())).toEqual(["okay", "bag"]);
  });
  it("yes for a different word or an idiom (“¿Lo quiere caliente o frío?”: would like; “Hey, ¿tienes un segundo?”)", () => {
    expect(newWords(sent("¿Lo | quiere | caliente | o | frío?", "It | you-want | hot | or | iced?", "Would you like it hot or iced?"))).toEqual(["like"]);
    expect(natSaysMore(sent("¿Tienes | un | segundo?", "Do-you-have | a | second?", "Got a sec?"))).toBe(true);
  });
  it("no when the natural sentence only adds English's grammar words or reorders the glosses", () => {
    // s33: "Now | I'm | retired." / "I'm retired now."; the glosses' hyphens and brackets read as words
    expect(natSaysMore(sent("Ya | estoy | jubilado.", "Now | I'm | retired.", "I'm retired now."))).toBe(false);
    expect(natSaysMore(sent("Se | lo | marco | en | su | mapa.", "It for you | — | I-mark | on | your | map.", "I'll mark it on your map for you."))).toBe(false);
    expect(natSaysMore(sent("Son | $720.", "That's | 720 pesos.", "That's 720 pesos."))).toBe(false);
    // the "—" units are left out, as in the English edition
    expect(natSaysMore(sent("Se | va | a | las | 8:10.", "— | It leaves | at | — | 8:10.", "It leaves at 8:10."))).toBe(false);
  });
  it("no for other forms of the glosses' words (goes / going, apology / apologize, knew / know) or a negation said another way", () => {
    expect(natSaysMore(sent("¡Buenas! | ¿Cómo | le | va?", "Hi! | How | (for) you | it-goes?", "Hi! How's it going?"))).toBe(false);
    expect(natSaysMore(sent("Le | ofrezco | una | disculpa.", "(To) you | I-offer | an | apology.", "I apologize."))).toBe(false);
    expect([stem("knew"), stem("know")]).toEqual(["know", "know"]);
    // p25: "sin cochera" / "with no garage"; s31: "no tiene fiebre" / "so no fever"
    expect(natSaysMore(sent("Me mudo | a | un | lugar | sin | cochera.", "I'm moving | to | a | place | without | garage.", "I'm moving to a place with no garage."))).toBe(false);
    expect(natSaysMore(sent("Eso | es | normal: | no tiene | fiebre.", "That | is | normal: | you don't have | fever.", "That's normal, so no fever."))).toBe(false);
  });
});

describe("the markup: the asterisk in English", () => {
  it("“Muy bien, una maleta.”: the asterisk's label and the tooltip in English, the line in Spanish", () => {
    const out = renderToStaticMarkup(createElement(Interlinear, { s: bag(), lt: true, ipa: false, nat: false, natTip: true }));
    const star = out.match(/<button[^>]*class="nat-star"[^>]*>\*<\/button>/)?.[0];
    expect(star).toContain('aria-label="Natural translation"');
    const tip = out.match(/<span[^>]*role="tooltip"[^>]*>([^<]*)<\/span>/);
    expect(tip?.[0]).toContain('lang="en"');
    expect(tip?.[1]).toBe("Okay, one bag.");
    expect(out).toContain('class="il" lang="es"');
  });
});
