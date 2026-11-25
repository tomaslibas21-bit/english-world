import assert from "node:assert/strict";

export function cardsFor(page, target) {
  return page.evaluate(async (text) => {
    const { cardKey, STORAGE_KEY } = await import("/src/state/cards.ts");
    const { cards = [] } = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return cards.filter((card) => cardKey(card.en) === cardKey(text));
  }, target);
}

export async function activatePhraseControl(page, control, touch, key = "Enter") {
  const bounds = await control.evaluate((element) => {
    const { left, top, width, height } = element.getBoundingClientRect();
    const x = left + width / 2, y = top + height / 2;
    return { x, y, width, height, hit: element.contains(document.elementFromPoint(x, y)) };
  });
  assert(bounds.width >= 44 && bounds.height >= 44 && bounds.hit, JSON.stringify(bounds));
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
