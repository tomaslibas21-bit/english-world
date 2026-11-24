import assert from "node:assert/strict";
import { questBrowser, questTestUrl, worldStorage } from "./quests-harness.mjs";

const spanish = worldStorage === "puerto-colibri";
const learner = process.env.WORLD_LEARNER || (spanish ? "en" : "lt");
const browser = await questBrowser();
try {
  const page = await browser.newPage();
  await page.goto(questTestUrl, { waitUntil: "domcontentloaded" });

  const { edition, quests } = await page.evaluate(async () => {
    const { EDITION, TL, HL, photoWalkContent, directionsContent } = await import("/tests/browser/fixtures/quest-content.mjs");
    const photo = await photoWalkContent();
    const directions = await directionsContent();
    return {
      edition: { storage: EDITION.storage, TL, HL },
      quests: { photo: photo.situation, directions: directions.situation },
    };
  });
  assert.deepEqual(edition, { storage: worldStorage, TL: spanish ? "es" : "en", HL: learner }, "Vite served the requested edition and learner layer");
  assert.deepEqual(quests, spanish
    ? { photo: "x12-album", directions: "x13-por-donde" }
    : { photo: "x02-photo-walk", directions: "x03-ask-the-way" });
  console.log(`Quest content passed (${worldStorage}, ${learner})`);
} finally {
  await browser.close();
}
