// The same conversation carries its drawing from the task card to either picker, the phone and the map.
// WORLD_TEST_URL points to the game. WORLD_SHOTS saves each view at each screen size.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8443";
const storage = process.env.WORLD_STORAGE || "english-world";
const shots = process.env.WORLD_SHOTS;
if (shots) await mkdir(shots, { recursive: true });

const taxi = "s66-taxi";
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", volume: 0, cameraFollow: true },
  sits: { "s72-cafe": { visits: 1, completions: 1, used: [], twists: [], memory: {} } },
  phrases: { change: { en: "Keep the change.", lt: "Grąžos nereikia.", sitId: taxi, count: 1, last: 1 } },
  seenIntro: {}, started: 1, place: { zone: "town", x: 0, z: 0, rot: 0 }, objective: taxi,
  coach: { done: true, run: true, view: true },
};

// Check the words as drawn as well as their container. A long word can leave a perfectly sized column.
async function inspect(page, cards, titles, objective = false) {
  await page.locator(cards).first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  return page.locator(cards).evaluateAll((rows, { titles, objective }) => rows.map((card) => {
    const id = card.dataset.sit ?? card.querySelector("h3, .objective-title")?.textContent;
    const check = (ok, problem) => { if (!ok) throw new Error(id + ": " + problem); };
    const box = card.getBoundingClientRect();
    const inside = (r) => r.width > 0 && r.height > 0 && r.left >= box.left - 1 && r.right <= box.right + 1 && r.top >= box.top - 1 && r.bottom <= box.bottom + 1;
    const icons = card.querySelectorAll("svg[data-sit-icon]");
    check(icons.length === 1, "expected one situation icon");
    const icon = icons[0], mark = icon.getBoundingClientRect();
    check(inside(mark) && icon.checkVisibility({ visibilityProperty: true }), "icon hidden or outside card");
    check(icon.getAttribute("aria-hidden") === "true" && icon.childElementCount > 0, "expected a decorative drawing");
    const headings = card.querySelectorAll(titles);
    check(headings.length > 0, "missing title");
    for (const heading of headings) {
      check(inside(heading.getBoundingClientRect()), "title outside card");
      const range = document.createRange();
      range.selectNodeContents(heading);
      const lines = [...range.getClientRects()].filter((r) => r.width && r.height);
      // (a title cut short with an ellipsis, the folded card on a sideways phone, ends where its own box ends)
      const cut = getComputedStyle(heading).textOverflow === "ellipsis";
      check(lines.length && (cut || lines.every(inside)), "title text outside card");
      if (card.matches(".contact")) {
        const avatar = card.querySelector(".avatar");
        const badge = icon.closest(".contact-badge");
        check(badge && avatar.contains(badge), "expected a badge on the avatar");
        const face = avatar.getBoundingClientRect(), r = badge.getBoundingClientRect();
        check(inside(r) && r.left < face.right && r.right >= face.right && r.top < face.bottom && r.bottom >= face.bottom, "badge must overlap the bottom-right corner");
        check(r.right <= heading.getBoundingClientRect().left, "badge overlaps the title");
      } else {
        check(mark.right <= lines[0].left + 1, "icon must precede title");
      }
      if (objective) {
        check(mark.top < lines[0].bottom && mark.bottom > lines[0].top, "icon must be beside first title line");
        const front = document.elementFromPoint(mark.x + mark.width / 2, mark.y + mark.height / 2);
        check(card.contains(front), "task card is covered");
      }
    }
    return [card.dataset.sit, icon.dataset.sitIcon];
  }), { titles, objective });
}

// Use the same title, fonts and card width to measure the folded card with its original kicker and title.
async function checkFoldedHeight(page) {
  const [actual, original] = await page.locator(".objective-card.collapsed").evaluate((card) => {
    const reference = card.cloneNode(false);
    reference.className = "objective-card";
    reference.style.visibility = "hidden";
    const title = card.querySelector("h3, .objective-title").cloneNode(true);
    title.style.cssText = "display: block; margin: 4px 0 3px; font-size: 1.12em; line-height: 1.22; hyphens: manual; overflow-wrap: normal";
    // (the one-line folded card of the playing screen has no kicker of its own)
    const kicker = card.querySelector(".kicker");
    if (kicker) reference.append(kicker.cloneNode(true));
    reference.append(title);
    card.after(reference);
    const heights = [card.offsetHeight, reference.offsetHeight];
    reference.remove();
    return heights;
  });
  assert(actual <= original + 6, `folded task grew from ${original} to ${actual} px`);
}

const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  for (const [width, height] of [[390, 844], [390, 664], [375, 667], [844, 390], [1280, 800]]) {
    const mobile = width < 1000;
    const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const shot = async (view, focus) => {
      if (!shots) return;
      if (focus) await page.locator(focus).first().evaluate((el) => el.scrollIntoView({ block: "center" }));
      await page.screenshot({ path: join(shots, `${width}x${height}-${view}.png`), animations: "disabled" });
    };
    const panel = (name) => page.evaluate((panel) => window.__ew.store.getState().setHud({ panel }), name);
    try {
      await page.addInitScript(([key, save]) => {
        if (sessionStorage.getItem("seeded")) return;
        localStorage.setItem(key, JSON.stringify(save));
        sessionStorage.setItem("ew-play-now", "1");
        sessionStorage.setItem("seeded", "1");
      }, [`${storage}-progress-v1`, progress]);
      await page.goto(base, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.__ew?.store.getState().screen === "play", null, { timeout: 180000 });
      await page.evaluate(() => window.__ew.coach.finish());
      const situations = await page.evaluate(() => window.__ew.game.orderedSituations());

      for (const [id, name] of [[taxi, "car-taxi-front"], ["s64b-security", "laptop"], ["s78-bank", "credit-card"]]) {
        await page.evaluate((id) => window.__ew.game.setObjective(id), id);
        const card = page.locator(".objective-card");
        await card.locator(`svg[data-sit-icon="${name}"]`).waitFor();
        assert((await card.locator("h3, .objective-title").first().innerText()).includes(situations.find((s) => s.id === id).title.lt));
        for (const folded of [false, true]) {
          const button = card.locator(".collapse-btn");
          if ((await button.getAttribute("aria-expanded")) !== String(!folded)) await button.click();
          await page.locator(folded ? ".objective-card.collapsed" : ".objective-card:not(.collapsed)").waitFor();
          await inspect(page, ".objective-card", "h3, .objective-title", true);
          if (folded) await checkFoldedHeight(page);
          await shot(`${id}-${folded ? "folded" : "open"}`);
        }
      }

      await panel("scenarios");
      const picker = await inspect(page, ".scn-card", ".txt b, .txt i");
      const names = new Map(picker);
      assert.deepEqual(new Set(names.keys()), new Set(situations.map((s) => s.id)));
      assert.equal(new Set(names.values()).size, names.size, "each situation has its own drawing");
      const match = (rows) => {
        for (const [id, name] of rows) assert.equal(name, names.get(id), id);
      };
      match(picker); // The featured conversations also appear in their chapters.
      assert.equal(names.get(taxi), "car-taxi-front");
      await shot("picker", '.scn-card[data-sit="s66-taxi"]');

      await panel("journal");
      const journal = await inspect(page, ".sit-card", ".txt b, .txt i");
      assert.deepEqual(new Map(journal), names);
      await shot("tasks", '.sit-card[data-sit="s64b-security"]');

      await panel("phone");
      const calls = await inspect(page, ".contact", ".txt > span");
      match(calls);
      assert.deepEqual(new Set(calls.map(([id]) => id)), new Set(situations.filter((s) => s.mode === "video" || s.mode === "phone" || s.location === "phone").map((s) => s.id)));
      await shot("phone");

      await panel("map");
      const airport = page.getByRole("button", { name: "Maple Harbor Airport", exact: true });
      await airport.click();
      assert.equal(await airport.getAttribute("aria-pressed"), "true");
      const school = page.getByRole("button", { name: "Harbor Surf", exact: true });
      const mapIcons = page.locator(".map-pin svg[data-sit-icon]");
      assert.equal(await mapIcons.count(), 1);
      assert.equal(await school.locator("svg[data-sit-icon]").getAttribute("data-sit-icon"), "waves-horizontal");
      const places = await inspect(page, ".map-wrap .sit-card", ".txt b, .txt i");
      match(places);
      assert.deepEqual(new Set(places.map(([id]) => id)), new Set(situations.filter((s) => s.location === "airport").map((s) => s.id)));
      await shot("map", ".map-wrap .sit-card");
      await school.click();
      assert.equal(await school.getAttribute("aria-pressed"), "true");
      assert.equal(await page.locator(".place-title svg[data-sit-icon]").getAttribute("data-sit-icon"), "waves-horizontal");
      assert.deepEqual(await inspect(page, ".map-wrap .sit-card", ".txt b, .txt i"), [["x04-surf", "waves-horizontal"]]);

      await panel("phrasebook");
      await page.getByRole("tab", { name: /^Kartotos frazės/ }).click();
      await page.locator('.nb-group svg[data-sit-icon="car-taxi-front"]').waitFor();
      await shot("phrasebook");
      await page.locator(".nb-entry").click();
      await page.getByRole("button", { name: "Išsaugoti kortelėse", exact: true }).click();
      await page.getByRole("tab", { name: /^Išsaugotos kortelės/ }).click();
      await page.locator("[data-review]").click();
      await page.locator('.rv-sit svg[data-sit-icon="car-taxi-front"]').waitFor();
      await shot("review");

      await panel(null);
      // (on a phone the town's buttons are behind the menu button)
      if (await page.locator(".toolbar .ride-menu").count()) await page.locator(".toolbar .ride-menu").click();
      await page.locator(".light-mode-btn").click();
      const light = await inspect(page, ".lh-card", ".lh-txt b, .lh-txt i");
      match(light);
      assert.deepEqual(new Map(light), names);
      await shot("pictures", '.lh-card[data-sit="s66-taxi"]');
      assert.deepEqual(errors, [], "page errors");
      console.log(`ok ${width}×${height}, ${names.size} situation icons`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
