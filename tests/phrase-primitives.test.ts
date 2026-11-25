import { PassThrough } from "node:stream";
import { createElement, isValidElement, type MouseEvent, type ReactNode } from "react";
import { renderToPipeableStream, renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Sentence } from "../src/convo/compose";
import { ipaForSentence } from "../src/convo/ipa";
import { PHRASE_CARD_UI } from "../src/content/phrase-card-ui";
import { sentenceInput, useCards } from "../src/state/cards";
import { useStore } from "../src/state/store";
import { GlossLine } from "../src/ui/kit/GlossLine";
import PhraseReview, { PhraseReviewRow, reviewLine } from "../src/ui/kit/PhraseReview";
import { PhraseSave, type PhraseSaveProps } from "../src/ui/kit/PhraseSave";
import { ScoreCard } from "../src/ui/kit/ScoreCard";
import StonePhraseCard, { type StonePhraseCardProps } from "../src/ui/kit/StonePhraseCard";
import { resolvePhrase } from "../src/ui/kit/phraseLine";

// Read the live Zustand state in the node renderer while keeping real store methods.
vi.mock("../src/state/store", async (load) => {
  const actual = await load<typeof import("../src/state/store")>();
  const useStore = Object.assign((select: (s: ReturnType<typeof actual.useStore.getState>) => unknown) =>
    select(actual.useStore.getState()), actual.useStore);
  return { ...actual, useStore };
});
vi.mock("../src/state/cards", async (load) => {
  const actual = await load<typeof import("../src/state/cards")>();
  const useCards = Object.assign((select: (s: ReturnType<typeof actual.useCards.getState>) => unknown) =>
    select(actual.useCards.getState()), actual.useCards);
  return { ...actual, useCards };
});

const authored: Sentence = {
  en: "Call 612.", nat: "Paskambinkite numeriu 612.", say: "Call six one two.",
  units: [{ en: "Call", lt: "Skambinkite" }, { en: "612.", lt: "612." }],
};
const pair = { targetText: "Call 602. Zqxv.", helperText: "Paskambinkite numeriu 602.", actualSay: "Call six oh two. Zqxv." };
const source = { situationId: "example-source", sourceLabel: "Source label" };
const settings = useStore.getState().settings;
const originalCards = useCards.getState();

afterEach(() => {
  useStore.setState({ settings });
  useCards.setState(originalCards, true);
});

const stone = (props: Partial<StonePhraseCardProps> = {}) => renderToStaticMarkup(createElement(StonePhraseCard, {
  title: "Stone", source, phrase: { sentence: authored }, shown: false, solved: false, onReplay() {}, onDismiss() {},
  classNames: { veil: "glyph-veil", card: "glyph-card", text: "glyph-text", line: "glyph-line", replay: "glyph-play", close: "glyph-x" },
  ...props,
}));
const setReading = (lt: boolean, ltNatural: boolean, ipa: boolean) => useStore.setState({
  settings: { ...settings, lt, ltNatural, ipa, sayLt: !lt, sayIpa: !ipa },
});

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

describe("stone phrase reading", () => {
  it("hides the cue initially and reveals only target text and IPA until solved", () => {
    setReading(true, true, true);
    const reveal = createElement("button", null, "Show words");
    const hidden = stone({ reveal });
    expect(hidden).toContain("Show words");
    expect(hidden).not.toMatch(/glyph-text|data-phrase-save|612|Paskambinkite/);
    const shown = stone({ shown: true, reveal });
    expect(shown).toContain("glyph-text");
    expect(shown).toContain("data-phrase-save");
    expect(shown).toContain(ipaForSentence(authored.units.map((unit) => unit.en), authored.say)[1]);
    expect(shown).not.toMatch(/data-i=|Skambinkite|Paskambinkite|Show words/);
  });

  it("keeps authored units and follows the transcript settings, including the natural line", () => {
    expect(resolvePhrase({ sentence: authored })).toBe(authored);
    setReading(true, false, true);
    const gloss = stone({ solved: true });
    expect(gloss).toContain("glyph-line");
    expect(gloss).toContain('data-i="0"');
    expect(gloss).toContain('class="lt" lang="lt">Skambinkite');
    expect(gloss).toContain('class="ipa"');
    expect(gloss).toContain('aria-pressed="true">LT');
    expect(gloss).not.toContain('class="nat"');
    setReading(true, true, false);
    const natural = stone({ solved: true });
    expect(natural).toContain(`class="nat" lang="lt">${authored.nat}`);
    expect(natural).toContain('aria-pressed="false">IPA');
    expect(natural).not.toContain('class="ipa"');
    setReading(false, true, false);
    expect(stone({ solved: true })).not.toMatch(/Skambinkite|Paskambinkite/);
  });

  it("keeps an unaligned pair whole, using its spoken form for IPA and one natural line", () => {
    const fallback = resolvePhrase(pair)!;
    expect(fallback).toEqual({ en: pair.targetText, nat: pair.helperText, say: pair.actualSay, units: [] });
    expect(resolvePhrase({ ...pair, actualSay: "" })?.say).toBe(pair.targetText);
    expect(resolvePhrase({ ...pair, targetText: "  " })).toBeNull();
    expect(resolvePhrase({ ...pair, helperText: "  " })).toBeNull();
    expect(sentenceInput(fallback, source.situationId).sentence.say).toBe(pair.actualSay);
    setReading(true, true, true);
    const out = stone({ phrase: pair, solved: true });
    expect(out).toContain(ipaForSentence(["Call", "602.", "Zqxv."], pair.actualSay)[1]);
    expect(out).toContain('Zqxv.</span><span class="ipa"> </span>');
    expect(out).not.toMatch(/data-i=|class="lt"|glyph-line/);
    expect(out.split(pair.helperText)).toHaveLength(2);
    setReading(true, true, false);
    expect(stone({ phrase: pair, solved: true })).toContain(pair.targetText);
    const gloss = renderToStaticMarkup(createElement(GlossLine, { sentence: fallback, gloss: true, source }));
    expect(gloss).toContain(pair.targetText);
    expect(gloss.split(pair.helperText)).toHaveLength(2);
    expect(gloss).not.toContain('class="il"');
  });
});

describe("phrase review and saving", () => {
  it("renders optional review before the existing score actions and outside the score rows", async () => {
    const html = await renderReview(createElement(ScoreCard, {
      title: "Score", rows: [{ label: "Points", value: 4 }], phrases: { label: "Count", count: 2 },
      review: [{ sentence: authored, ...source }], actions: createElement("button", null, "Again"),
      children: createElement("div", null, "Existing content"),
    }));
    expect(html).toContain("<dl><div><dt>Points</dt><dd>4</dd></div><div><dt>Count</dt><dd>2</dd></div></dl>");
    expect(html.indexOf("Existing content")).toBeLessThan(html.indexOf("data-phrase-save"));
    expect(html.indexOf("data-phrase-save")).toBeLessThan(html.indexOf("mode-score-actions"));
  });

  it("keeps the first distinct valid entries in order and collapses one or zero entries", async () => {
    const first = { sentence: authored, ...source };
    const duplicate = { targetText: "  call   612!", helperText: "Duplicate", situationId: "other" };
    const invalid = { ...pair, helperText: " ", ...source };
    const review = (entries: Parameters<typeof PhraseReview>[0]["entries"]) => renderReview(createElement(PhraseReview, { entries }));
    expect(await review([])).toBe("");
    expect(await review([invalid])).not.toMatch(/<select|data-phrase-save|phrase-review-row/);
    const single = await review([first, duplicate]);
    expect(single).not.toContain("<select");
    expect(single).toContain(authored.en);
    expect(single).toContain(authored.nat);
    const many = await review([invalid, first, duplicate, { ...pair, ...source }]);
    expect(many).toContain(`aria-label="${PHRASE_CARD_UI.phrases}"`);
    expect(many.match(/<option/g)).toHaveLength(2);
    expect(many).toContain(`selected="">${authored.en}</option><option value="call 602. zqxv">${pair.targetText}</option>`);
    expect(many).toContain(authored.nat);
    expect(many.match(/data-phrase-save/g)).toHaveLength(1);
  });

  it("saves a selected row with its own source and spoken form once, retaining the same schedule and learning state", async () => {
    const selected = createElement("div", { className: "existing-item" }, pair.targetText, " · ", pair.helperText);
    const entry = { ...pair, ...source };
    const row = createElement(PhraseReviewRow, { entry, children: selected });
    const save = reviewLine(entry)?.save;
    if (!isValidElement<PhraseSaveProps>(save)) throw new Error("Missing row save action");
    const activate = () => {
      const action = PhraseSave({ ...save.props, onSaved });
      if (!isValidElement<{ onClick(event: MouseEvent): void }>(action)) throw new Error("Missing save button");
      action.props.onClick({ stopPropagation() {} } as MouseEvent);
    };
    const onSaved = vi.fn();
    const progress = useStore.getState().progress.phrases;
    const before = await renderReview(row);
    expect(before).toContain(` ${PHRASE_CARD_UI.add}</button>`);
    expect(before).toContain('class="existing-item"');
    activate();
    const [kept] = useCards.getState().cards;
    expect(kept).toMatchObject({ ...source, sentence: { en: pair.targetText, lt: pair.helperText, say: pair.actualSay }, box: 1 });
    expect(await renderReview(row)).toMatch(new RegExp(`<button[^>]*data-phrase-save[^>]*>.* ${PHRASE_CARD_UI.inCards}</button>`));
    activate();
    expect(useCards.getState().cards).toEqual([kept]);
    expect(useCards.getState().cards[0]).toBe(kept);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(useStore.getState().progress.phrases).toBe(progress);
  });
});
