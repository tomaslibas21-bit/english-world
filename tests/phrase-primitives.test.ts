import { PassThrough } from "node:stream";
import { createElement, isValidElement, type MouseEvent, type ReactNode } from "react";
import { renderToPipeableStream, renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Sentence } from "../src/convo/compose";
import { ipaForSentence } from "../src/convo/ipa";
import { PHRASE_CARD_UI as ui } from "../src/content/phrase-card-ui";
import { cardKey, useCards } from "../src/state/cards";
import { useStore } from "../src/state/store";
import { GlossLine } from "../src/ui/kit/GlossLine";
import { PhraseSave } from "../src/ui/kit/PhraseSave";
import PhraseReview from "../src/ui/kit/PhraseReview";
import { ScoreCard } from "../src/ui/kit/ScoreCard";
import StonePhraseCard, { type StonePhraseCardProps } from "../src/ui/kit/StonePhraseCard";
import { resolvePhrase } from "../src/ui/kit/phraseLine";
import { stoneReading } from "../src/ui/kit/stoneReading";

// The server renderer normally reads the initial Zustand state. Exercise the live selectors and actions.
vi.mock("../src/state/store", async (load) => {
  const actual = await load<typeof import("../src/state/store")>();
  return { ...actual, useStore: Object.assign(
    (select: (state: ReturnType<typeof actual.useStore.getState>) => unknown) => select(actual.useStore.getState()),
    actual.useStore,
  ) };
});
vi.mock("../src/state/cards", async (load) => {
  const actual = await load<typeof import("../src/state/cards")>();
  return { ...actual, useCards: Object.assign(
    (select: (state: ReturnType<typeof actual.useCards.getState>) => unknown) => select(actual.useCards.getState()),
    actual.useCards,
  ) };
});

const authored: Sentence = {
  en: "Call 612.", nat: "Paskambinkite numeriu 612.", say: "Call six one two.",
  units: [{ en: "Call", lt: "Skambinkite", flag: "An authored note" }, { en: "612.", lt: "612." }],
};
const pair = { targetText: "Call 602.", helperText: "Paskambinkite numeriu 602.", actualSay: "Call six oh two." };
const borrowed = resolvePhrase(pair)!;
const source = { situationId: "first-source", sourceLabel: "Original source" };
const settings = useStore.getState().settings;
const originalProgress = useStore.getState().progress;
const cards = useCards.getState();

afterEach(() => {
  useStore.setState({ settings, progress: originalProgress });
  useCards.setState(cards, true);
});

function reading(lt: boolean, ltNatural: boolean, ipa: boolean) {
  useStore.setState({ settings: { ...settings, lt, ltNatural, ipa, sayLt: !lt, sayIpa: !ipa } });
}

function stone(props: Partial<StonePhraseCardProps> = {}) {
  return renderToStaticMarkup(createElement(StonePhraseCard, {
    reader: stoneReading, title: "Stone", source, phrase: { sentence: authored }, shown: false, solved: false,
    onReplay() {}, onDismiss() {}, classNames: { text: "glyph-text", line: "glyph-line" },
    ...props,
  }));
}

function renderReview(node: ReactNode): Promise<string> {
  return new Promise((resolve, reject) => {
    const output = new PassThrough().setEncoding("utf8");
    let html = "";
    output.on("data", (chunk) => { html += chunk; });
    output.on("end", () => resolve(html));
    output.on("error", reject);
    const stream = renderToPipeableStream(node, { onAllReady: () => stream.pipe(output), onError: reject });
  });
}

describe("phrase reading", () => {
  it("toggles each conversation reading setting independently of the player-answer settings", () => {
    reading(false, false, false);
    for (const key of ["lt", "ltNatural", "ipa"] as const) {
      const before = useStore.getState().settings;
      stoneReading.toggle(key);
      expect(useStore.getState().settings).toEqual({ ...before, [key]: true });
    }
  });

  it("hides the reading and save until reveal, then shows target and spoken IPA alone", () => {
    reading(true, true, true);
    const reveal = createElement("button", null, "Show words");
    const hidden = stone({ reveal });
    expect(hidden).toContain("Show words");
    expect(hidden).not.toMatch(/glyph-text|data-phrase-save|612|Paskambinkite/);
    const shown = stone({ shown: true, reveal });
    expect(shown).toContain(authored.en);
    expect(shown).toContain("data-phrase-save");
    expect(shown).toContain(ipaForSentence(authored.units.map((unit) => unit.en), authored.say)[1]);
    expect(shown).not.toMatch(/data-i=|Skambinkite|Paskambinkite|Show words|An authored note/);
  });

  it("preserves authored units, notes, spoken form and natural settings on solve", () => {
    expect(resolvePhrase({ sentence: authored })).toBe(authored);
    reading(true, false, true);
    const gloss = stone({ solved: true, targetLang: "es", helperLang: "en" });
    expect(gloss).toContain('class="il" lang="es"');
    expect(gloss).toContain("glyph-line");
    expect(gloss).toContain('data-i="0"');
    expect(gloss).toContain('title="An authored note" lang="en">Skambinkite');
    expect(gloss).toContain('class="ipa"');
    expect(gloss).not.toContain('class="nat"');
    reading(true, true, false);
    const natural = stone({ solved: true });
    expect(natural).toContain(`class="nat" lang="lt">${authored.nat}`);
    expect(natural).not.toContain('class="ipa"');
    reading(false, true, false);
    expect(stone({ solved: true })).not.toMatch(/Skambinkite|Paskambinkite/);
  });

  it("uses the original plain pair and spoken form without creating pretend units", () => {
    expect(borrowed).toEqual({ en: pair.targetText, nat: pair.helperText, say: pair.actualSay, units: [] });
    expect(resolvePhrase({ ...pair, helperText: " " })).toBeNull();
    expect(resolvePhrase({ ...pair, targetText: "¡!" })).toBeNull();
    reading(true, true, true);
    const solved = stone({ phrase: pair, solved: true });
    expect(solved).toContain(pair.targetText);
    expect(solved).toContain(ipaForSentence(["Call", "602."], pair.actualSay)[1]);
    expect(solved).not.toMatch(/data-i=|class="lt"|glyph-line/);
    expect(solved.split(pair.helperText)).toHaveLength(2);
    expect(stone({ phrase: pair, shown: true })).not.toContain(pair.helperText);
    reading(true, false, true);
    expect(stone({ phrase: pair, solved: true })).not.toContain(pair.helperText);
    const gloss = renderToStaticMarkup(createElement(GlossLine, { sentence: borrowed, gloss: true, source }));
    expect(gloss).toContain(pair.targetText);
    expect(gloss.split(pair.helperText)).toHaveLength(2);
  });
});

describe("shared review and save", () => {
  it("keeps the first normalized entry and renders a full selected line before the score actions", async () => {
    const first = { sentence: authored, ...source };
    const duplicate = { sentence: { ...authored, en: " call   612!", nat: "Duplicate helper" }, situationId: "other" };
    const invalid = { sentence: { ...borrowed, nat: " " }, ...source };
    const render = (entries: Parameters<typeof PhraseReview>[0]["entries"]) => renderReview(createElement(PhraseReview, { entries }));
    expect(await render([])).toBe("");
    expect(await render([invalid])).not.toContain("data-phrase-save");
    const single = await render([first, duplicate]);
    expect(single).not.toContain("<select");
    expect(single).toContain(authored.nat);
    const many = await renderReview(createElement(ScoreCard, {
      title: "Score", rows: [{ label: "Points", value: 4 }], phrases: { label: "Count", count: 2 },
      review: [invalid, first, duplicate, { sentence: borrowed, ...source }],
      children: createElement("div", null, "Existing content"), actions: createElement("button", null, "Again"),
    }));
    expect(many).toContain("<dl><div><dt>Points</dt><dd>4</dd></div><div><dt>Count</dt><dd>2</dd></div></dl>");
    expect(many).toContain(`aria-label="${ui.phrases}"`);
    expect(many.match(/<option/g)).toHaveLength(2);
    expect(many).toContain(`selected="">${authored.en}</option>`);
    expect(many).toContain(`class="phrase-review-value" lang="en" aria-hidden="true">${authored.en}`);
    expect(many).not.toContain("Duplicate helper");
    expect(many.indexOf("Existing content")).toBeLessThan(many.indexOf("data-phrase-save"));
    expect(many.indexOf("data-phrase-save")).toBeLessThan(many.indexOf("mode-score-actions"));
  });

  it("uses the same focusable button before and after saving and keeps the first record on repeat activation", () => {
    const onSaved = vi.fn();
    const props = { sentence: borrowed, onSaved, ...source };
    const activate = (options = props) => {
      const button = PhraseSave(options);
      if (!isValidElement<{ onClick(event: MouseEvent): void }>(button)) throw new Error("Missing save button");
      button.props.onClick({ stopPropagation() {} } as MouseEvent);
    };
    const render = (popover?: "primary") => renderToStaticMarkup(createElement(PhraseSave, { ...props, popover }));
    const progress = useStore.getState().progress;
    expect(render()).toContain(`data-icon-only="" aria-label="${ui.add}" aria-pressed="false"`);
    expect(render("primary")).toContain(`aria-label="${ui.whole}" aria-pressed="false"`);
    activate();
    const [kept] = useCards.getState().cards;
    expect(kept).toMatchObject({ ...source, sentence: { en: pair.targetText, lt: pair.helperText, say: pair.actualSay } });
    expect(render()).toContain(`data-icon-only="" aria-label="${ui.inCards}" aria-pressed="true"`);
    expect(render("primary")).toContain(`aria-label="${ui.wholeInCards}" aria-pressed="true"`);
    expect(render("primary")).not.toMatch(/disabled|tabindex="-1"/i);
    useCards.getState().answer(kept.id, true);
    const [reviewed] = useCards.getState().cards;
    activate({ ...props, sentence: { ...borrowed, en: " call  602?!" }, situationId: "another-source" });
    expect(useCards.getState().keys).toEqual(new Set([cardKey(pair.targetText)]));
    expect(useCards.getState().cards[0]).toBe(reviewed);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(useStore.getState().progress).toBe(progress);
  });
});
