// The town HUD while walking and driving, with the same viewports as talk-view.mjs.
// WORLD_TEST_URL=http://127.0.0.1:8176 WORLD_STORAGE=english-world WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/playing-screen.mjs
import assert from "node:assert/strict";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8176";
const storage = process.env.WORLD_STORAGE || "english-world";
const returning = {
  version: 1,
  profile: { name: "Test", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", volume: 0, sounds: 0, scenes: false, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: 100, z: 76, rot: -Math.PI / 2 },
  coach: { done: true, run: true, view: true, seen: { list: true } },
};
const iPhone = { deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1" };
const sizes = { computer: { viewport: { width: 1280, height: 800 } }, phone: { ...iPhone, viewport: { width: 375, height: 812 } }, "short phone": { ...iPhone, viewport: { width: 375, height: 667 } } };

const hudBoxes = [".objective-card", ".minimap", ".toolbar", ".toolbar.menu-open .toolbar-tools", ".prompt", ".joy", ".jump-btn", ".act-btn"];

async function settledBoxes(page, selectors) {
  return page.evaluate(async (selectors) => {
    const read = () => selectors.flatMap((selector) => {
      const el = document.querySelector(selector), r = el?.getBoundingClientRect();
      if (!r?.width || !r.height || getComputedStyle(el).visibility !== "visible") return [];
      return [{ selector, left: r.left, top: r.top, right: r.right, bottom: r.bottom }];
    });
    const deadline = performance.now() + 2200;
    let previous = read();
    while (performance.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const current = read();
      const animating = current.some(({ selector }) => document.querySelector(selector).getAnimations().some((a) => a.playState === "running" && Number.isFinite(a.effect?.getComputedTiming().endTime)));
      if (!animating && JSON.stringify(previous) === JSON.stringify(current)) return current;
      previous = current;
    }
    throw new Error(`HUD boxes did not settle: ${JSON.stringify(previous)}`);
  }, selectors);
}

async function layout(page, selectors = hudBoxes) {
  const boxes = await settledBoxes(page, selectors);
  const overlaps = [];
  for (const [i, a] of boxes.entries()) for (const b of boxes.slice(i + 1)) {
    if (a.selector.startsWith(".toolbar") && b.selector.startsWith(".toolbar")) continue;
    if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) overlaps.push([a.selector, b.selector]);
  }
  return { boxes, overlaps };
}

async function checkNoteLayout(page, label, selector, { folded, phone, height }) {
  await page.locator(selector).waitFor();
  const targets = phone ? hudBoxes.filter((s) => s !== ".prompt") : [".objective-card", ".minimap"];
  const { boxes, overlaps } = await layout(page, [...targets, selector]);
  const note = boxes.find((box) => box.selector === selector);
  const card = boxes.find((box) => box.selector === ".objective-card");
  assert(note && card, `${label}: the note and task card are visible`);
  assert.equal(await page.locator(".objective-card.collapsed").count(), Number(folded), `${label}: task card fold state`);
  assert.deepEqual(overlaps.filter((pair) => pair.includes(selector)), [], `${label}: ${JSON.stringify(boxes)}`);
  if (phone && (selector !== ".zone-banner" || !folded)) {
    const gap = note.top - card.bottom;
    assert(gap >= 0 && gap <= 20 && note.left === card.left, `${label}: note is left-aligned just below the task card`);
  }
  if (phone && selector === ".zone-banner" && folded) assert(Math.abs(note.top - height * 0.18) < 1, `${label}: the banner keeps its usual height with the card folded`);
  if (phone && selector !== ".zone-banner") assert(note.top < height / 2, `${label}: toast starts above the middle of the screen`);
}

async function checkMovingNotes(page, label, height) {
  const state = { folded: true, phone: true, height };
  await page.evaluate(() => {
    const st = window.__ew.store.getState();
    for (const { toast } of st.townToasts) st.dismissToast(toast.id);
    st.setHud({ zoneBanner: { title: "Main Street", sub: "Maple Harbor" } });
  });
  await checkNoteLayout(page, `${label} banner`, ".zone-banner", state);
  await page.evaluate(() => {
    const st = window.__ew.store.getState();
    st.setHud({ zoneBanner: null });
    st.toast({ kind: "tip", title: "Kelias užimtas", body: "Mašina sustoja pati. Pasuk į šoną ir apvažiuok arba pavažiuok atbulas." });
  });
  await checkNoteLayout(page, `${label} toast`, ".town-toasts .toast.tip", state);
  await page.locator(".town-toasts .toast.tip .x").tap();
}

async function checkFolded(page, label, limit) {
  await settledBoxes(page, [".objective-card"]);
  const result = await page.locator(".objective-card").evaluate((card) => {
    const title = card.querySelector(".objective-title"), style = title && getComputedStyle(title);
    return {
      collapsed: card.classList.contains("collapsed"), height: card.getBoundingClientRect().height,
      oneLine: style?.whiteSpace === "nowrap" && style.textOverflow === "ellipsis",
      title: title?.textContent, task: window.__ew.store.getState().hud.objective?.title,
      distance: /\d+ m$/.test(card.querySelector(".dist")?.textContent ?? ""), arrow: !!card.querySelector(".dist .arrow"),
      details: [...card.querySelectorAll("p, .en-title, .row")].some((el) => el.getClientRects().length > 0),
    };
  });
  assert(result.collapsed && result.height <= limit && result.oneLine && result.title === result.task && result.distance && result.arrow && !result.details,
    `${label}: folded card: ${JSON.stringify(result)}`);
}

const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio"] });
try {
  for (const [label, options] of Object.entries(sizes)) {
    const phone = !!options.hasTouch;
    const ctx = await browser.newContext(options);
    // The course voices need a sign-in. An empty response keeps this test independent of it.
    await ctx.route(/\.mp3(\?|$)/, (r) => r.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } }));
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.addInitScript(([key, progress]) => {
      localStorage.setItem(key, progress);
      sessionStorage.setItem("ew-play-now", "1");
      localStorage.setItem("english-world-cards-v1", JSON.stringify([{ en: "Hello", lt: "Labas", due: 0 }]));
    }, [`${storage}-progress-v1`, JSON.stringify(returning)]);
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__ew?.store.getState().screen === "play" && window.__ew.game?.ledges?.ready, null, { timeout: 240000 });
    await page.locator(".objective-card .row button").first().waitFor();
    const press = (selector) => phone ? page.locator(selector).tap() : page.locator(selector).click();
    const go = (on) => phone ? page.evaluate((v) => window.__ew.game.setJoystick(0, v ? 1 : 0), on) : page.keyboard[on ? "down" : "up"]("w");
    const toolbar = page.locator(".toolbar");
    const menu = toolbar.locator(".ride-menu");
    const radio = toolbar.locator(".radio-btn");
    const due = toolbar.locator(".toolbar-tools .due-badge");
    const walkingTools = await toolbar.locator(".icon-btn:visible").count();
    const [firstTool] = await settledBoxes(page, [".toolbar-tools .icon-btn"]);
    const radioCount = await radio.count();
    assert(walkingTools >= 8 && await due.innerText() === "1", `${label}: the full toolbar and the due card`);

    await go(true);
    await page.waitForFunction(() => window.__ew.store.getState().hud.walking);
    await page.waitForTimeout(2000);
    await checkFolded(page, label, phone ? 44 : 48);
    // Keep a two-line door prompt on screen for the measurement, even along an empty road.
    await page.evaluate(() => window.__ew.store.getState().setHud({ prompt: { kind: "enter", label: "Įeiti: Maple Harbor Airport", lt: "Maple Harbor oro uostas" } }));
    await page.locator(".prompt").waitFor();
    const walking = await layout(page);
    assert.deepEqual(walking.overlaps, [], `${label}: walking ${JSON.stringify(walking)}`);
    assert(walking.boxes.some(({ selector }) => selector === ".prompt"), `${label}: the settled door prompt is visible`);
    if (phone) assert.equal(walking.boxes.filter(({ selector }) => [".joy", ".jump-btn", ".act-btn"].includes(selector)).length, 3);
    if (phone) await checkMovingNotes(page, `${label} walking`, options.viewport.height);
    await go(false);
    await page.waitForTimeout(2000);
    assert(await page.locator(".objective-card .row button").first().isVisible(), `${label}: the task reopened while standing still`);

    // Start by the driver's door, as in rides.mjs.
    await page.evaluate(() => {
      const g = window.__ew.game, r = g.rides.list.find((q) => q.kind === "car"), h = r.m.heading;
      g.keys.clear();
      g.enterZone("town", { x: r.m.x + Math.cos(h) * 2.2, z: r.m.z - Math.sin(h) * 2.2, rot: h }, true);
    });
    await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "drive", null, { timeout: 5000 });
    if (phone) await press(".act-btn"); else await page.keyboard.press("e");
    await page.waitForFunction(() => window.__ew.game.rides.phase === "on" && window.__ew.store.getState().hud.prompt?.kind === "out", null, { timeout: 5000 });
    await menu.waitFor();
    await toolbar.locator(".toolbar-tools").waitFor({ state: "hidden" });
    assert.equal(await toolbar.locator(".icon-btn:visible").count(), 1 + radioCount, `${label}: only Meniu and the available radio`);
    assert.equal(await menu.locator(".due-badge").innerText(), "1", `${label}: Meniu shows the due card`);
    const [menuBox] = await settledBoxes(page, [".ride-menu"]);
    assert.equal(menuBox.left, firstTool.left, `${label}: menu in the first tool's column`);
    assert.equal(menuBox.top, firstTool.top, `${label}: menu in the first tool's row`);
    await checkFolded(page, label, phone ? 44 : 48);
    if (!phone) assert(await page.locator(".ride-strip").isVisible(), "the first ride starts with the full key strip");

    const parked = await layout(page);
    const anchored = (boxes) => boxes.filter(({ selector }) => [".minimap", ".joy", ".jump-btn", ".act-btn"].includes(selector));
    await press(".ride-menu");
    await toolbar.locator(".toolbar-tools").waitFor();
    const expanded = await layout(page);
    assert.equal(await toolbar.locator(".icon-btn:visible").count(), walkingTools + 1, `${label}: Meniu revealed the full toolbar`);
    assert.equal(await due.innerText(), "1", `${label}: the phrasebook shows the due card`);
    assert.deepEqual(anchored(expanded.boxes), anchored(parked.boxes), `${label}: the minimap and controls stayed in place`);
    assert.deepEqual(expanded.overlaps, [], `${label}: open ride toolbar ${JSON.stringify(expanded)}`);
    if (phone) await checkMovingNotes(page, `${label} open ride toolbar`, options.viewport.height);
    await page.waitForTimeout(6000);
    assert.equal(await toolbar.locator(".icon-btn:visible").count(), 1 + radioCount, `${label}: Meniu folded after five idle seconds`);
    await page.keyboard.press("m");
    await page.locator(".overlay .sheet").waitFor();
    assert.equal(await page.evaluate(() => window.__ew.store.getState().hud.panel), "map", `${label}: M opens the map while folded`);
    await page.keyboard.press("Escape");
    await page.locator(".overlay").waitFor({ state: "hidden" });

    // Drive on the quiet stretch of Station Road used by the existing ride test.
    await page.evaluate(() => window.__ew.game.rides.riding.m.set(100, 76, -Math.PI / 2));
    await go(true);
    await page.waitForFunction(() => window.__ew.game.rides.riding.m.speed > 3, null, { timeout: 6000 });
    await checkFolded(page, label, phone ? 44 : 48);
    const driving = await layout(page);
    assert.deepEqual(driving.overlaps, [], `${label}: driving ${JSON.stringify(driving)}`);
    assert(driving.boxes.some(({ selector }) => selector === (phone ? ".act-btn" : ".prompt")), `${label}: the exit prompt is still available`);
    if (phone) assert(await page.locator(".brake-btn").isVisible(), `${label}: the brake is still available`);
    if (phone) await checkMovingNotes(page, `${label} driving`, options.viewport.height);
    await go(false);
    await page.evaluate(() => window.__ew.game.hold(true));
    await page.waitForFunction(() => Math.abs(window.__ew.game.rides.riding.m.speed) < 0.3, null, { timeout: 5000 });
    await page.evaluate(() => window.__ew.game.hold(false));

    if (!phone) {
      const chip = page.getByRole("button", { name: "Klavišai" });
      await chip.waitFor();
      assert(!(await page.locator(".ride-strip").isVisible()), "the key strip shrank to the chip");
      await chip.hover();
      assert(await page.locator(".ride-strip").isVisible(), "hovering reveals the keys");
      await chip.click();
      await page.mouse.move(400, 400);
      assert(await page.locator(".ride-strip").isVisible(), "clicking keeps the keys open");
      await press(".objective-summary");
      assert(await page.locator(".objective-card .row button").first().isVisible(), "clicking the folded card opens it while riding");
      await press(".objective-card .collapse-btn");
      await page.evaluate(() => window.__ew.game.setObjective("s72-cafe"));
      await page.locator(".objective-card.fresh").waitFor();
      await page.waitForTimeout(2400);
      assert(await page.locator(".objective-card .row button").first().isVisible(), "the new task stays open through its pop while riding");
      await page.locator(".objective-card.collapsed").waitFor();
      await page.evaluate(() => window.__ew.store.getState().setHud({ objective: null }));
      assert.equal(await page.locator(".objective-card.collapsed .objective-title").innerText(), "Visos užduotys atliktos");
    }
    if (phone) await press(".act-btn"); else await page.keyboard.press("e");
    await page.waitForFunction(() => !window.__ew.game.rides.riding && !window.__ew.store.getState().hud.ride, null, { timeout: 5000 });
    await page.waitForTimeout(2000);
    assert(!(await menu.isVisible()) && await toolbar.locator(".icon-btn:visible").count() === walkingTools, `${label}: getting out restores all tools`);
    assert(await page.locator(".objective-card:not(.collapsed) p").isVisible(), `${label}: getting out and standing still reopens the card`);
    const savedRides = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).coach.rides, `${storage}-progress-v1`);
    assert.equal(savedRides, 1, `${label}: the first drive was saved`);

    await page.evaluate(() => {
      const st = window.__ew.store.getState();
      for (const { toast } of st.townToasts) st.dismissToast(toast.id);
      const sample = { sequence: [], overlaps: [] };
      window.__playingNotes = sample;
      const frame = () => {
        const shown = [...document.querySelectorAll(".zone-banner, .coach, .toast")].filter((el) => {
          const style = getComputedStyle(el);
          return el.getClientRects().length && style.visibility === "visible" && Number(style.opacity) > 0;
        }).map((el) => el.classList.contains("toast") ? el.querySelector("b").textContent : el.classList[0]);
        if (shown.length > 1) sample.overlaps.push(shown);
        const name = shown.join(",");
        if (name && sample.sequence.at(-1) !== name) sample.sequence.push(name);
        sample.frame = requestAnimationFrame(frame);
      };
      sample.frame = requestAnimationFrame(frame);
      st.setHud({ zoneBanner: { title: "Main Street", sub: "Maple Harbor" }, coach: { step: "walk", ok: false } });
      st.toast({ kind: "tip", title: "Kelias užimtas", ms: 1 });
      st.toast({ kind: "stamp", title: "Pasirašyta", ms: 1 });
      st.toast({ kind: "success", title: "Puiku!", ms: 1 });
      setTimeout(() => st.setHud({ zoneBanner: null }), 2600);
    });
    const openCard = { folded: false, phone, height: options.viewport.height };
    if (phone) await checkNoteLayout(page, `${label} standing banner`, ".zone-banner", openCard);
    await page.locator(".coach").waitFor({ timeout: 6000 });
    await page.waitForTimeout(350);
    await press(".coach-next");
    await checkNoteLayout(page, `${label} standing toast`, ".town-toasts .toast.tip", openCard);
    await page.waitForFunction(() => window.__playingNotes.sequence.includes("Puiku!"), null, { timeout: 12000 });
    const notes = await page.evaluate(() => {
      const sample = window.__playingNotes;
      cancelAnimationFrame(sample.frame);
      return sample;
    });
    assert.deepEqual(notes.overlaps, [], `${label}: at most one visible note on every frame`);
    assert.deepEqual(notes.sequence, ["zone-banner", "coach", "Kelias užimtas", "Pasirašyta", "Puiku!"], `${label}: banner, guide and all three toasts in order`);
    assert.deepEqual(errors, [], `${label}: no page or console errors`);
    await ctx.close();
    console.log("ok", label);
  }
  console.log("playing screen: all checks passed");
} finally {
  await browser.close();
}
