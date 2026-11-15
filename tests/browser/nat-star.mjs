// The natural-translation "*" (Interlinear.tsx NatTip): a superscript tight against the last English letter, whatever
// the gloss or IPA under that word ("deal." over "susitarimą."), taking no room in the line (the same lines wrap
// the same with it and without it), a finger's target round it, and its tooltip above it. Maggie Holt's car sale
// (her lines and the learner's examples, with prices, ellipses and multi-word units), at a computer's and a
// phone's size, with IPA on and off (owner, 15 Nov 2026).
// WORLD_TEST_URL=http://127.0.0.1:5188 WORLD_STORAGE=english-world WORLD_SIT=p25-used-car WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/nat-star.mjs
// (Puerto Colibrí: VITE_EDITION=es, WORLD_STORAGE=puerto-colibri, WORLD_SIT=a situation id of that edition.)
import assert from "node:assert/strict";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5188";
const storage = process.env.WORLD_STORAGE || "english-world";
const sit = process.env.WORLD_SIT || "p25-used-car";
// the learner's lines up to Maggie's "Wait! … $7,500…" (a walk-away after the first price talk)
const lines = (process.env.WORLD_LINES ?? "Hi! I'm here about the car.|Is there any flexibility on the price?|That's a bit more than I was hoping to spend. I'll pass, thank you.").split("|").filter(Boolean);
const check = (name, value, detail) => {
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name);
};
const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true });
try {
  for (const phone of [false, true]) for (const ipa of [true, false]) {
    const label = `${phone ? "phone" : "computer"}, IPA ${ipa ? "on" : "off"}`;
    const ctx = await browser.newContext(phone ? { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const progress = {
      version: 1,
      profile: { name: "Test", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
      settings: { v: 5, play: "light", quality: "low", scenes: true, volume: 0, sounds: 0, textSize: 1, suggestions: true, hintsOpen: true, lt: true, ltNatural: false, ipa, sayLt: true, sayIpa: ipa },
      sits: {}, phrases: {}, seenIntro: {}, started: 1, coach: { done: true, run: true },
    };
    await page.addInitScript(([k, v]) => {
      localStorage.setItem(k, v); try { sessionStorage.setItem("ew-play-now", "1"); } catch {}
      if (!window.SpeechRecognition && !window.webkitSpeechRecognition) window.webkitSpeechRecognition = class { start() {} stop() {} abort() {} addEventListener() {} removeEventListener() {} };
    }, [`${storage}-progress-v1`, JSON.stringify(progress)]);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__ew?.store?.getState().screen === "play", null, { timeout: 120000 });
    await page.evaluate((id) => { window.__ew.coach?.finish?.(); window.__ew.game.startScenario(id); }, sit);
    const yourTurn = async () => {
      for (let i = 0; i < 100; i++) {
        if (await page.evaluate(() => { const c = window.__ew.store.getState().conv; return c.active && c.phase === "you"; })) return true;
        const next = page.locator("button").filter({ hasText: /^(Pradėti|Tęsti skaitant|Start|Keep going by reading)$/ }).first();
        if (await next.count()) await next.click({ timeout: 800 }).catch(() => {});
        await page.waitForTimeout(300);
      }
      return false;
    };
    for (const line of lines) {
      check(`${label}: the learner's turn before “${line}”`, await yourTurn());
      await page.evaluate((t) => { void window.__ew.game.activeSession.submit(t, [], "typed"); }, line);
      await page.waitForTimeout(400);
    }
    check(`${label}: the learner's turn`, await yourTurn());
    await page.evaluate(() => window.__ew.game.activeSession?.stopListening?.());
    await page.waitForTimeout(300);

    const stars = await page.evaluate(async () => {
      const all = [];
      for (const b of document.querySelectorAll(".msg .il .nat-star, .gx .il .nat-star")) all.push(await measure(b));
      return all;
      async function measure(b) {
      b.scrollIntoView({ block: "center" });
      await new Promise((r) => setTimeout(r, 500)); // (the transcript scrolls smoothly; the help lists out of sight are left out)
      const en = b.closest(".en");
      const text = [...en.childNodes].filter((n) => n.nodeType === 3).pop();
      const r = document.createRange();
      r.setStart(text, text.length - 1); r.setEnd(text, text.length);
      const glyph = r.getBoundingClientRect(), star = b.getBoundingClientRect(), pin = b.parentElement.getBoundingClientRect();
      // a finger's reach round the star's middle (its hit-slop), up/down and to the right
      const cx = star.left + star.width / 2, cy = star.top + star.height / 2;
      // (points outside the scrolling transcript or hints, under the panel's header, don't count against it)
      let sp = b.parentElement;
      while (sp && !/(auto|scroll)/.test(getComputedStyle(sp).overflowY)) sp = sp.parentElement;
      const box = (sp ?? document.documentElement).getBoundingClientRect();
      const hit = (dx, dy) => {
        const x = cx + dx, y = cy + dy;
        if (y < box.top || y > box.bottom || x > box.right) return true;
        const e = document.elementFromPoint(x, y); return e === b || b.contains(e);
      };
      let up = 0, down = 0, right = 0;
      while (up < 30 && hit(0, -(up + 1))) up++;
      while (down < 30 && hit(0, down + 1)) down++;
      while (right < 40 && hit(right + 1, 0)) right++;
      return {
        line: [...b.closest(".il").querySelectorAll(".u .en")].map((e) => e.firstChild?.textContent).join(" "),
        last: en.closest(".u").textContent, gap: star.left - glyph.right, overlap: glyph.right - star.left,
        // raised: its middle above the middle of the English line, its top no lower than a quarter down it
        superscript: star.top + star.height / 2 < glyph.top + glyph.height / 2 && star.top <= glyph.top + glyph.height / 4,
        rise: [star.top - glyph.top, star.bottom - glyph.bottom, glyph.height],
        pinWidth: pin.width, reach: { up, down, right }, seen: cy > box.top && cy < box.bottom && hit(0, 0),
      };
      }
    });
    check(`${label}: there are asterisks to check`, stars.length > 0, stars.length);
    for (const s of stars) {
      check(`${label}: “${s.line}” *: tight against the last letter`, s.gap <= 3 && s.overlap <= 1, s);
      check(`${label}: “${s.line}” *: a superscript`, s.superscript, s);
      check(`${label}: “${s.line}” *: no width in the line`, s.pinWidth === 0, s);
      // (one in sight: a phone keeps the older lines under the latest ones)
      if (s.seen) check(`${label}: “${s.line}” *: a finger's target`, s.reach.up + s.reach.down + 1 >= 40 && s.reach.right >= 25, s);
    }
    check(`${label}: asterisks in sight to tap`, stars.filter((s) => s.seen).length >= 3, stars.map((s) => s.seen));
    // the lines wrap the same with the asterisks as without them
    const layout = () => page.evaluate(() => [...document.querySelectorAll(".il")].filter((il) => il.querySelector(".nat-star")).map((il) => [...il.querySelectorAll(".u")].map((u) => { const r = u.getBoundingClientRect(); return `${Math.round(r.left)},${Math.round(r.top)}`; }).join(" ")));
    const withStars = await layout();
    await page.addStyleTag({ content: ".nat-pin { display: none !important; }" });
    const without = await layout();
    await page.evaluate(() => document.querySelectorAll("style").forEach((s) => s.textContent.includes(".nat-pin { display: none") && s.remove()));
    check(`${label}: the asterisks move no word`, JSON.stringify(withStars) === JSON.stringify(without), { withStars, without });
    // a tap opens the tooltip above the asterisk (the word popover stays shut), a second tap closes it
    const star = page.locator(".il .nat-star").first();
    await star.scrollIntoViewIfNeeded();
    await star.click();
    await page.waitForTimeout(250);
    const tip = await page.evaluate(() => {
      const s = document.querySelector(".il .nat-star").getBoundingClientRect(), t = document.querySelector(".nat-tipbox:not([hidden])");
      if (!t) return null;
      const b = t.getBoundingClientRect(), arrow = b.left + parseFloat(t.style.getPropertyValue("--arrow"));
      return { text: t.textContent, placed: t.classList.contains("below") ? b.top >= s.bottom : b.bottom <= s.top, arrow: Math.abs(arrow - (s.left + s.width / 2)), popover: !!document.querySelector(".wpop") };
    });
    check(`${label}: a tap opens the tooltip next to the asterisk, not the word's popover`, tip && tip.text && tip.placed && tip.arrow < 2 && !tip.popover, tip);
    await star.click();
    await page.mouse.move(2, 2); // (a mouse over the asterisk keeps it open)
    await page.waitForTimeout(350);
    check(`${label}: a second tap closes it`, await page.evaluate(() => !document.querySelector(".nat-tipbox:not([hidden])")));
    // the word itself still opens its popover
    await page.locator(".il .nat-star").first().evaluate((b) => b.closest(".u").querySelector(".en").scrollIntoView({ block: "center" }));
    const word = await page.locator(".il .nat-star").first().evaluate((b) => { const r = b.closest(".u").querySelector(".en").getBoundingClientRect(); return { x: r.left + 4, y: r.top + r.height / 2 }; });
    await page.mouse.click(word.x, word.y);
    await page.waitForTimeout(250);
    check(`${label}: a tap on the last word still opens its popover`, await page.evaluate(() => !!document.querySelector(".wpop")));
    check(`${label}: no page errors`, errors.length === 0, errors);
    await ctx.close();
  }
} finally {
  await browser.close();
}
