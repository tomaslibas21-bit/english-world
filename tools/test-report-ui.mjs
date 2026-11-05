// Focused browser regression: use a local dev server. Recognition input is deterministic; no microphone/audio is recorded.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:5188";
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "chrome",
});
try {
  for (const width of [390, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
    });
    const posted = [];
    await context.addInitScript(() => {
      localStorage.setItem(
        "english-world-progress-v1",
        JSON.stringify({
          version: 1,
          profile: {
            name: "Testas",
            surname: "",
            gender: "m",
            look: {},
            lookId: "test",
          },
          sits: {},
          phrases: {},
          seenIntro: {},
          started: Date.now(),
          settings: { play: "light", autoListen: false, volume: 0 },
        }),
      );
      localStorage.setItem(
        "fs-files-token",
        JSON.stringify({
          token: "v1.9999999999.test-account.test",
          exp: 9999999999,
        }),
      );
      HTMLMediaElement.prototype.play = function () {
        setTimeout(() => this.dispatchEvent(new Event("ended")), 10);
        return Promise.resolve();
      };
      speechSynthesis.speak = (u) =>
        setTimeout(() => u.onend?.(new Event("end")), 10);
    });
    await context.route("**/_game_reports", async (route) => {
      posted.push(route.request().postDataJSON());
      await route.fulfill({ status: 201, json: { ok: true } });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(base + "/?sit=s35-gym");
    await page.waitForFunction(
      () =>
        window.__ew?.game?.activeSession &&
        window.__ew.store.getState().conv.phase === "you",
    );
    assert(await page.getByText("Beta · dar tobulinamas").isVisible());
    await page.evaluate(async () => {
      await window.__ew.game.activeSession.submit(
        "I can tomorrow",
        ["I can't tomorrow"],
        "voice",
      );
    });
    await page
      .getByRole("button", { name: "I can't tomorrow", exact: true })
      .waitFor();
    assert.equal(
      await page.evaluate(
        () =>
          window.__ew.store
            .getState()
            .conv.transcript.filter((x) => x.who === "you").length,
      ),
      0,
    );
    await page
      .getByRole("button", { name: "I can't tomorrow", exact: true })
      .click();
    await page.waitForFunction(() =>
      window.__ew.store.getState().conv.transcript.some((x) => x.who === "you"),
    );
    const said = await page.evaluate(() =>
      window.__ew.store.getState().conv.transcript.find((x) => x.who === "you"),
    );
    assert.match(said.text, /can.t tomorrow/i);
    assert.equal(said.heard, "I can tomorrow");
    await page.waitForFunction(
      () => window.__ew.store.getState().conv.phase === "you",
    );
    await page.evaluate(async () => {
      window.__ew.store.getState().setSettings({ confirmSpeech: true });
      await window.__ew.game.activeSession.submit("Hello", [], "voice");
    });
    await page.getByText("Ar teisingai išgirdo?", { exact: false }).waitFor();
    await page
      .getByRole("button", { name: "Pataisyti tekstą", exact: true })
      .first()
      .click();
    assert.equal(
      await page.evaluate(() => window.__ew.store.getState().conv.typing),
      true,
    );
    await page
      .getByRole("button", { name: "Pranešti apie klaidą", exact: true })
      .click();
    await page
      .getByLabel("Kas įvyko?", { exact: true })
      .fill("Test: can/cannot and changing a day.");
    await page
      .getByLabel("Ką norėjai pasakyti arba kokio atsakymo tikėjaisi?")
      .fill("I can't tomorrow");
    await context.setOffline(true);
    await page
      .getByRole("button", { name: "Siųsti pranešimą", exact: true })
      .click();
    await page
      .getByText("Pranešimas išsaugotas šiame įrenginyje.", { exact: false })
      .waitFor();
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem("english-world-reports-v1-test-account"),
          ).length,
      ),
      1,
    );
    await context.setOffline(false);
    await page.waitForFunction(
      () =>
        JSON.parse(
          localStorage.getItem("english-world-reports-v1-test-account") || "[]",
        ).length === 0,
    );
    assert.equal(posted.length, 1);
    assert.equal(posted[0].situation, "s35-gym");
    assert(posted[0].turns.some((t) => t.heard === "I can tomorrow"));
    assert(!JSON.stringify(posted[0]).includes("9999999999"));
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: `/private/tmp/english-world-report-${width}.png`,
    });
    await page
      .getByRole("button", { name: "Grįžti į pokalbį", exact: true })
      .click();
    assert.equal(
      await page.evaluate(() => window.__ew.store.getState().conv.active),
      true,
    );
    console.log(
      `ok: ${width}px speech-choice, confirmation/edit, private report, offline retry, no overflow`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
