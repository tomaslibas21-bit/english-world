// The small "*" after the other person's sentence that holds its natural translation (src/ui/natTip.ts,
// Interlinear.tsx NatTip): which lines get one, where its tooltip goes, and what the markup says.
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { compose, type Sentence } from "../src/convo/compose";
import { t } from "../src/content/dsl";
import { natDiffers, natNorm, glossLine, placeTip } from "../src/ui/natTip";
import { Interlinear } from "../src/ui/Interlinear";

/** A sentence as the conversation shows it (units split on " | "). */
const sent = (en: string, lt: string, nat: string): Sentence => compose(t(en, lt, nat), {}, { look: () => undefined });
const pleasure = () => sent("My | pleasure!", "Mano | malonumas!", "Mielai!");
const business = () => sent("Business | or | pleasure?", "Darbo reikalais | ar | poilsiui?", "Darbo reikalais ar poilsiui?");

describe("which lines get the asterisk: the natural sentence says something the word glosses don't", () => {
  it("yes for “My pleasure!” (Mano malonumas! word by word, Mielai! naturally)", () => {
    expect(natDiffers(pleasure())).toBe(true);
  });
  it("no for “Business or pleasure?” (the same words both ways)", () => {
    expect(natDiffers(business())).toBe(false);
  });
  it("no when only punctuation, quotes, dashes or capitals differ", () => {
    expect(natDiffers(sent("Hot | or | iced?", "Karštą | ar | su ledu?", "Karštą ar su ledu!"))).toBe(false);
    expect(natDiffers(sent("Hot | or | iced?", "Karštą | ar | su ledu?", "Karštą – ar su ledu…"))).toBe(false);
    expect(natDiffers(sent("A | flat white, | please.", "— | „Flat white“, | prašom.", "«Flat white» prašom"))).toBe(false);
    expect(natDiffers(sent("Hello!", "Sveiki!", "SVEIKI"))).toBe(false);
  });
  it("reads the glosses without the — units (words Lithuanian doesn't say on their own)", () => {
    const s = sent("What | would | you | like?", "Ko | — | jūs | norėtumėte?", "Ko jūs norėtumėte?");
    expect(glossLine(s.units)).toBe("Ko jūs norėtumėte?");
    expect(natDiffers(s)).toBe(false);
    expect(natDiffers(sent("What | would | you | like?", "Ko | — | jūs | norėtumėte?", "Ko norėtumėte?"))).toBe(true);
  });
  it("never without a natural sentence", () => {
    expect(natDiffers({ units: [{ en: "Hi!", lt: "Labas!" }], nat: "" })).toBe(false);
    expect(natDiffers({ units: [{ en: "Hi!", lt: "Labas!" }], nat: " – " })).toBe(false);
  });
  it("compares lower case, without punctuation, with single spaces", () => {
    expect(natNorm("„Labas,  RYTAS!“ – sakė…")).toBe("labas rytas sakė");
    expect(natNorm("Ačiū — ŽINOMA.")).toBe("ačiū žinoma");
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
