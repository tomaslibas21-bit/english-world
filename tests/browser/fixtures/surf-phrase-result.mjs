import assert from "node:assert/strict";
import { assertSavedSentence, checkManualSave, fixtureSentence } from "./phrase-saves.mjs";

// Used at the real result of each lesson in surf.mjs, after the original score checks.
export async function checkSurfPhraseResult(page, score, touch, beginner, shots) {
  const situation = "x01-surf";
  const first = await fixtureSentence(page, situation, "sg_board_take_long");
  const line = beginner ? first : await fixtureSentence(page, situation, "sg_board_take_short");
  const learner = process.env.WORLD_LEARNER || "en";
  assert.equal(await page.locator("html").getAttribute("lang"), learner);
  const review = score.locator(".phrase-review-row");
  const choice = review.getByRole("combobox");
  await choice.waitFor({ state: "attached" });
  if (!beginner) assert(!(await choice.locator("option").allTextContents()).includes(first.en), "the advanced result excludes the beginner-only cue");
  await choice.selectOption({ label: line.en });
  assert.equal(await review.locator(`small[lang="${learner}"]`).textContent(), line.nat);
  const save = review.locator("[data-phrase-save]");
  await save.scrollIntoViewIfNeeded();
  const snapshot = () => page.evaluate(() => {
    const { surf, store } = window.__ew;
    const { score, review, over, choice, mic } = surf.getState();
    const { play, surf: progress } = store.getState().progress;
    return { score, review, over, choice, mic, play, progress };
  });
  const card = await checkManualSave(page, save, touch, line.en, situation, snapshot, "Space");
  assertSavedSentence(card, line, situation);
  if (shots) {
    const { width, height } = page.viewportSize();
    const frame = await page.evaluate(() => Math.round((performance.now() - 1000) * 60 / 1000));
    await page.screenshot({ path: `${shots}/PC-${learner}-${width}x${height}-surf-${beginner ? "beginner" : "advanced"}-review-F${frame}.png` });
  }
}
