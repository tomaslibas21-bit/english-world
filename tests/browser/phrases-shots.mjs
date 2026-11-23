// Use the Puerto Colibrí Vite dev server. SHOTS_DIR is required.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { launchBrowser, openGame, phraseFor } from "./phrases.mjs";

const directory = process.env.SHOTS_DIR;
const tag = process.env.SHOTS_TAG || `pc-${process.env.VITE_LEARNER || "en"}`;
assert.ok(directory, "Set SHOTS_DIR to the screenshot output directory");
await mkdir(directory, { recursive: true });

const browser = await launchBrowser();
try {
  for (const game of ["road", "sea"]) {
    for (const size of ["390x844", "1280x800"]) {
      const run = await openGame(browser, game, size);
      const shot = async (name) => {
        const path = join(directory, `${tag}-${game}-${size}-${name}.png`);
        await run.page.screenshot({ path, scale: "css", animations: "disabled" });
        console.log(path);
      };
      try {
        await run.reachChoice();
        await shot("1-choice");

        await run.choose("phrases");
        let passed = 0;
        let item = phraseFor(await run.gate(passed));
        // Leave at least one word unlit in the mid-line shot.
        while (item.words.length < 3 && passed < 5) {
          await run.answer(true);
          item = phraseFor(await run.gate(++passed));
        }
        assert.ok(item.words.length >= 3, "expected a phrase long enough for the mid-line shot");
        await run.approach(passed);
        assert.equal(await run.cue.innerText(), item.p);
        await shot("2-prompt");

        const rightFrom = run.mp3Urls.length;
        await run.answer(true);
        await run.reveal(item, rightFrom);
        // The stepped RAF clock holds the debug state until the screenshot finishes.
        await run.waitState(({ karaoke }) => karaoke.visible && karaoke.current >= 1
          && [2, 3].includes(karaoke.lit.length) && karaoke.lit.length < item.words.length, "holds mid-line karaoke", 1);
        await shot("3-right-karaoke");

        const wrong = phraseFor(await run.gate(passed + 1));
        const wrongFrom = run.mp3Urls.length;
        await run.answer(false);
        await run.reveal(wrong, wrongFrom);
        await run.waitState(({ karaoke }) => karaoke.visible && karaoke.current >= 0, "holds the correction", 1);
        await shot("4-wrong");
      } finally {
        await run.context.close();
      }
    }
  }
} finally {
  await browser.close();
}
