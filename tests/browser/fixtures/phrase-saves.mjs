import assert from "node:assert/strict";

export async function readCardFile(page, key) {
  const data = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
  if (data === null) return [];
  assert.equal(data.v, 1, "cards use the persistent v1 envelope");
  assert(Array.isArray(data.cards));
  return data.cards;
}

export async function cardCentre(control, minimum = 1) {
  const bounds = await control.evaluate((element) => {
    const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
    const x = left + width / 2, y = top + height / 2;
    return { x, y, width, height, inside: left >= -0.5 && top >= -0.5 && right <= innerWidth + 0.5 && bottom <= innerHeight + 0.5,
      hit: !element.disabled && element.contains(document.elementFromPoint(x, y)) };
  });
  assert(bounds.width >= minimum && bounds.height >= minimum && bounds.inside && bounds.hit, `control centre: ${JSON.stringify(bounds)}`);
  return bounds;
}

export async function checkCardList(page, { learner, target, cards, press }) {
  const book = learner === "lt" ? "Kuprinė" : "Backpack";
  const tab = learner === "lt" ? "Išsaugotos kortelės" : "Saved cards";
  const toolbar = page.locator(".toolbar");
  const fold = toolbar.locator('.ride-menu[aria-expanded="false"]');
  if (await fold.isVisible()) await press(fold);
  await press(toolbar.locator(`button[title="${book}"]`));
  const listTab = page.getByRole("dialog").getByRole("tablist").getByRole("tab").filter({ hasText: tab });
  await press(listTab);
  assert.equal(await listTab.getAttribute("aria-selected"), "true");
  const list = page.locator(".cd-list");
  await list.waitFor();
  for (const card of cards) await checkNotebookCard(page, card, { learner, target, press });
  assert(await list.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), "Saved cards fits horizontally");
}

export async function checkNotebookCard(page, card, { learner, target, press }) {
  const row = page.locator(".cd-row").filter({ has: page.locator(".cd-en").and(page.getByText(card.en, { exact: true })) });
  assert.equal(await row.count(), 1, `one visible card row for ${card.en}`);
  await press(row);
  const detail = page.locator(".nb-reading");
  const en = detail.locator("[data-reading-title]");
  assert.equal(await en.textContent(), card.en);
  assert.equal(await en.getAttribute("lang"), target);
  await press(detail.locator(".nb-reveal"));
  const helper = detail.locator(".nb-meaning");
  assert.equal(await helper.innerText(), card.lt);
  assert.equal(await helper.getAttribute("lang"), learner);
  assert(await en.isVisible() && await helper.isVisible());
  await press(page.locator(".notebook [data-pad-back]"));
}

export function cardsFor(page, target) {
  return page.evaluate(async ({ text, key }) => {
    const { cardKey, STORAGE_KEY } = await import("/src/state/cards.ts");
    const data = JSON.parse(localStorage.getItem(key || STORAGE_KEY));
    if (!data) return [];
    if (data.v !== 1 || !Array.isArray(data.cards)) throw new Error("Expected the v1 cards envelope");
    const { cards } = data;
    return cards.filter((card) => cardKey(card.en) === cardKey(text));
  }, { text: target, key: process.env.WORLD_CARDS_KEY });
}

export function fixtureSentence(page, situation, key, learnerLine = false) {
  return page.evaluate(async ({ situation, key, learnerLine }) => {
    const { loadSituation } = await import("/src/content/situations/catalog.ts");
    const { conversationLine } = await import("/src/game/kit/lines.ts");
    const def = await loadSituation(situation);
    const sentence = conversationLine(situation, def.npc, key, undefined, learnerLine);
    if (!sentence) throw new Error(`Missing fixture line ${situation}:${key}`);
    return sentence;
  }, { situation, key, learnerLine });
}

export function assertSavedSentence(card, sentence, situationId) {
  assert.deepEqual([card.en, card.lt, card.sentence.en, card.sentence.lt, card.situationId, card.sourceLabel],
    [sentence.en, sentence.nat, sentence.en, sentence.nat, situationId, undefined]);
  assert.equal(card.sentence.say ?? card.sentence.en, sentence.say);
}

export async function activatePhraseControl(page, control, touch, key = "Enter") {
  const bounds = await control.evaluate((element) => {
    const { left, top, width, height } = element.getBoundingClientRect();
    const x = left + width / 2, y = top + height / 2;
    return { x, y, width, height, hit: element.contains(document.elementFromPoint(x, y)) };
  });
  // (A sliding notice can measure 43.999996 px: compare at a hundredth of a pixel.)
  assert(Math.round(bounds.width * 100) >= 4400 && Math.round(bounds.height * 100) >= 4400 && bounds.hit, JSON.stringify(bounds));
  if (touch) await page.touchscreen.tap(bounds.x, bounds.y);
  else await control.press(key);
}

export async function checkManualSave(page, control, touch, target, situationId, snapshot, key = "Enter") {
  const before = await snapshot();
  assert.deepEqual(await cardsFor(page, target), []);
  assert.equal(await control.getAttribute("aria-pressed"), "false");
  await activatePhraseControl(page, control, touch, key);
  assert.equal(await control.getAttribute("aria-pressed"), "true");
  const saved = await cardsFor(page, target);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].en, target);
  assert.equal(saved[0].situationId, situationId);
  assert.deepEqual(await snapshot(), before, "saving leaves the game state alone");
  await activatePhraseControl(page, control, touch, key);
  assert.deepEqual(await cardsFor(page, target), saved, "checked save keeps the original card");
  assert.deepEqual(await snapshot(), before, "the checked action leaves the game state alone");
  return saved[0];
}
