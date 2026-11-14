// The conversation's phrase rows: the speaker button with the repeat button under it in one narrow column at the left,
// the phrase with the rest of the row's width; both buttons named, a finger's size on a phone, and the repeat button
// still starting and cancelling a practice. At a computer's and a phone's size, at the three text sizes.
// WORLD_TEST_URL=http://127.0.0.1:5188 WORLD_STORAGE=english-world WORLD_SIT=s69-local WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/phrase-rows.mjs
import assert from "node:assert/strict";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5188";
const storage = process.env.WORLD_STORAGE || "english-world";
const sit = process.env.WORLD_SIT || "s69-local";
const check = (name, value, detail) => {
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name);
};
const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] });
try {
  for (const phone of [false, true]) for (const textSize of [1, 1.15, 1.3]) {
    const label = `${phone ? "phone" : "computer"}, text ×${textSize}`;
    const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const progress = {
      version: 1,
      profile: { name: "Test", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
      settings: { v: 5, play: "town", quality: "low", scenes: false, volume: 0, sounds: 0, textSize, suggestions: true, sayLt: true, sayIpa: false, lt: true },
      sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: 28, z: -14.6, rot: Math.PI }, coach: { done: true, run: true },
    };
    await page.addInitScript(([k, v]) => {
      localStorage.setItem(k, v); try { sessionStorage.setItem("ew-play-now", "1"); } catch {}
      // (a browser that can listen, so the repeat button shows; it hears nothing)
      if (!window.SpeechRecognition && !window.webkitSpeechRecognition) window.webkitSpeechRecognition = class { start() {} stop() {} abort() {} addEventListener() {} removeEventListener() {} };
    }, [`${storage}-progress-v1`, JSON.stringify(progress)]);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__ew?.store?.getState().screen === "play", null, { timeout: 120000 });
    await page.evaluate((id) => { window.__ew.coach?.finish?.(); window.__ew.game.startScenario(id); }, sit);
    // the learner's turn (past the scene's card, and reading on where a voice clip is not there to play)
    let turn = false;
    for (let i = 0; i < 100 && !turn; i++) {
      turn = await page.evaluate(() => { const c = window.__ew.store.getState().conv; return c.active && c.phase === "you" && c.suggest.length > 0 && !!document.querySelector(".gx"); });
      if (turn) break;
      const next = page.locator("button").filter({ hasText: /^(Pradėti|Tęsti skaitant|Start|Keep going by reading)$/ }).first();
      if (await next.count()) await next.click({ timeout: 800 }).catch(() => {});
      await page.waitForTimeout(350);
    }
    check(`${label}: the learner's turn shows its phrases`, turn);
    await page.evaluate(() => window.__ew.game.activeSession?.stopListening?.());
    await page.waitForTimeout(300);
    const rows = await page.evaluate(() => [...document.querySelectorAll(".gx")].map((r) => {
      const q = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height }; };
      const play = r.querySelector(".play"), rp = r.querySelector(".rp-btn"), text = r.querySelector(".gx-text");
      // how far a finger's tap still lands on a button: up, down, left and right of its middle
      const reach = (el) => {
        const b = el.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
        const hit = (dx, dy) => { const e = document.elementFromPoint(cx + dx, cy + dy); return e === el || el.contains(e); };
        let up = 0, down = 0, side = 0;
        while (up < 40 && hit(0, -(up + 1))) up++;
        while (down < 40 && hit(0, down + 1)) down++;
        while (side < 40 && hit(side + 1, 0) && hit(-(side + 1), 0)) side++;
        return { up, down, side };
      };
      r.scrollIntoView({ block: "center" });
      return { row: q(r), play: q(play), rp: rp && q(rp), text: q(text), playReach: reach(play), rpReach: rp && reach(rp), name: rp?.getAttribute("aria-label"), tip: rp?.getAttribute("title"), playName: play.getAttribute("aria-label"), words: rp?.innerText.trim() };
    }));
    check(`${label}: there are phrase rows, each with its repeat button`, rows.length > 0 && rows.every((r) => r.rp), rows.length);
    for (const [i, r] of rows.entries()) {
      check(`${label}: row ${i + 1}: the repeat button is under the speaker's, in its column`, r.rp.t >= r.play.b - 0.5 && Math.abs((r.rp.l + r.rp.r) / 2 - (r.play.l + r.play.r) / 2) < 1.5, r);
      check(`${label}: row ${i + 1}: the phrase starts right of the buttons and runs to the row's edge`, r.text.l >= Math.max(r.play.r, r.rp.r) && r.row.r - r.text.r < 12, r);
      check(`${label}: row ${i + 1}: the repeat button is the microphone alone, with a name and a tooltip`, r.words === "" && !!r.name && !!r.tip && !!r.playName, r);
      if (phone) {
        // a finger's 44 px each way, and the two buttons' reaches side by side, not over each other
        check(`${label}: row ${i + 1}: each button takes a 44 px finger`, r.playReach.up + r.playReach.down + 1 >= 43 && r.rpReach.up + r.rpReach.down + 1 >= 43 && r.playReach.side * 2 + 1 >= 43 && r.rpReach.side * 2 + 1 >= 43, r);
      }
    }
    // the repeat button still starts a practice (it listens to the example first) and cancels it; from the keyboard too
    const rp = page.locator(".gx .rp-btn").first();
    await rp.scrollIntoViewIfNeeded();
    await rp.click();
    await page.waitForTimeout(250);
    const busy = await rp.getAttribute("aria-pressed");
    await rp.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
    const idle = await rp.getAttribute("aria-pressed");
    check(`${label}: the repeat button starts a practice and cancels it`, busy === "true" && idle === "false", { busy, idle });
    check(`${label}: no page errors`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
  console.log("phrase rows: all ok");
} finally {
  await browser.close();
}
