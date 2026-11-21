// The town HUD while walking and driving, including tall and short portrait viewports.
// WORLD_TEST_URL=http://127.0.0.1:8176 WORLD_STORAGE=puerto-colibri WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/playing-screen.mjs
import assert from "node:assert/strict";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8176";
const storage = process.env.WORLD_STORAGE || "english-world";
const puerto = storage === "puerto-colibri";
const shots = process.env.WORLD_SHOTS || "";
const snap = async (page, name) => { if (shots) { (await import("node:fs")).mkdirSync(shots, { recursive: true }); await page.screenshot({ path: `${shots}/${name}.png` }); } };
// Calle Uxmal and Station Road are the corresponding roads in the shared town layout.
const drive = { x: puerto ? 110 : 100, z: 76, rot: -Math.PI / 2 };
const placeName = puerto ? { title: "Calle Uxmal", sub: "Puerto Colibrí" } : { title: "Main Street", sub: "Maple Harbor" };
const airportName = puerto ? "Aeropuerto de Puerto Colibrí" : "Maple Harbor Airport";
const firstTask = "s65a-passport";
const nextTask = "s72-cafe"; // Café La Ceiba in Puerto Colibrí, Sunny Cup in Maple Harbor.
const returning = {
  version: 1,
  profile: { name: "Test", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", volume: 0, sounds: 0, scenes: false, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, objective: firstTask, place: { zone: "town", ...drive },
  coach: { done: true, run: true, view: true, seen: { list: true } },
};
const iPhone = { deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1" };
const sizes = {
  computer: { viewport: { width: 1280, height: 800 } },
  phone: { ...iPhone, viewport: { width: 375, height: 812 } },
  "short phone": { ...iPhone, viewport: { width: 375, height: 667 } },
  "tall 390 px phone": { ...iPhone, viewport: { width: 390, height: 844 } },
  "short 390 px phone": { ...iPhone, viewport: { width: 390, height: 664 } },
  "tall 412 px phone": { ...iPhone, viewport: { width: 412, height: 915 } },
};

const hudBoxes = [".objective-card", ".minimap", ".toolbar", ".toolbar.menu-open .toolbar-tools", ".toolbar.menu-open .toolbar-drawer", ".prompt", ".joy", ".jump-btn", ".act-btn"];

async function settledBoxes(page, selectors) {
  return page.evaluate(async (selectors) => {
    const read = () => selectors.flatMap((selector) => [...document.querySelectorAll(selector)].flatMap((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).visibility !== "visible") return [];
      return [{ selector, radio: el.matches(".radio-btn"), lr: el.matches(".light-mode-btn"), course: el.matches(".course-link"), left: r.left, top: r.top, right: r.right, bottom: r.bottom }];
    }));
    const deadline = performance.now() + 2200;
    let previous = read();
    while (performance.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const current = read();
      const elements = selectors.flatMap((selector) => [...document.querySelectorAll(selector)]);
      const animating = elements.some((el) => el.getAnimations().some((a) => a.playState === "running" && Number.isFinite(a.effect?.getComputedTiming().endTime)));
      if (!animating && JSON.stringify(previous) === JSON.stringify(current)) return current;
      previous = current;
    }
    throw new Error(`HUD boxes did not settle: ${JSON.stringify(previous)}`);
  }, selectors);
}

async function checkPhoneToolbar(page, label, { width, columns, radio, course, prompt = false }) {
  const drawerButtons = ".toolbar-drawer .icon-btn";
  const menu = ".toolbar .ride-menu";
  const obstacles = [".objective-card", ".minimap", ".zone-banner", ".town-toasts .toast", ".coach", ".joy", ".jump-btn", ".act-btn", ".prompt.touch"];
  const { boxes, overlaps } = await layout(page, [drawerButtons, menu, ...obstacles]);
  const drawer = boxes.filter((b) => b.selector === drawerButtons), all = boxes.filter((b) => b.selector.startsWith(".toolbar"));
  const lefts = [...new Set(drawer.map((b) => b.left))].sort((a, b) => b - a);
  assert.equal(drawer.filter((b) => b.radio).length, Number(radio), `${label}: radio counted in the drawer`);
  assert.equal(drawer.filter((b) => b.lr).length, 1, `${label}: LR is in the drawer`);
  assert.equal(drawer.filter((b) => b.course).length, Number(course), `${label}: optional course link counted in the drawer`);
  assert.equal(drawer.length, 8 + Number(radio) + Number(course), `${label}: every drawer button is visible`);
  assert.equal(lefts.length, columns, `${label}: ${JSON.stringify(drawer)}`);
  assert(all.every((b) => lefts.includes(b.left)), `${label}: every button is in a right-edge column`);
  assert(width - lefts[0] <= 60 && all.every((b) => width - b.left <= 120), `${label}: the columns are within 120 px of the right edge`);
  if (columns === 2) {
    const counts = lefts.map((left) => drawer.filter((b) => b.left === left).length);
    assert(counts[0] >= counts[1] && counts[0] - counts[1] <= 1, `${label}: the right column takes the extra button in an odd split: ${counts}`);
    assert.deepEqual([...drawer].sort((a, b) => b.left - a.left || a.top - b.top), drawer, `${label}: the drawer keeps its order down the right column first`);
  } else {
    const clearances = boxes.filter((b) => [".jump-btn", ".act-btn", ".prompt.touch"].includes(b.selector));
    if (prompt) assert(clearances.some((b) => b.selector === ".prompt.touch"), `${label}: the touch talk prompt is visible`);
    assert(clearances.some((b) => b.selector === ".jump-btn"), `${label}: the jump or brake button is visible`);
    const end = Math.max(...all.map((b) => b.bottom));
    assert(clearances.every((b) => b.top - end >= 12), `${label}: the column has 12 px of clearance: ${JSON.stringify({ end, clearances })}`);
    const actionsAndLinks = drawer.filter((b) => !b.radio);
    assert.deepEqual([...actionsAndLinks].sort((a, b) => a.top - b.top), actionsAndLinks, `${label}: the actions keep their order with LR and the course link at the bottom`);
  }
  assert.deepEqual(overlaps.filter((pair) => pair.some((s) => s.startsWith(".toolbar"))), [], `${label}: no tool overlaps another HUD element: ${JSON.stringify(boxes)}`);
}

async function setRadioAvailable(page, available) {
  await page.evaluate((available) => window.__ew.radio.store.setState({ available }), available);
  await page.locator(".toolbar .radio-btn").waitFor({ state: available ? "visible" : "hidden" });
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
  await page.evaluate((zoneBanner) => {
    const st = window.__ew.store.getState();
    for (const { toast } of st.townToasts) st.dismissToast(toast.id);
    st.setHud({ zoneBanner });
  }, placeName);
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
  await page.locator(".objective-card.collapsed").waitFor();
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
    const { width, height } = options.viewport;
    const ctx = await browser.newContext(options);
    // The course voices need a sign-in. An empty response keeps this test independent of it.
    await ctx.route(/\.mp3(\?|$)/, (r) => r.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } }));
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.addInitScript(([storage, progress]) => {
      localStorage.setItem(`${storage}-progress-v1`, progress);
      sessionStorage.setItem("ew-play-now", "1");
      localStorage.setItem(`${storage}-cards-v1`, JSON.stringify([{ en: storage === "puerto-colibri" ? "Hola" : "Hello", lt: "Labas", due: 0 }]));
    }, [storage, JSON.stringify(returning)]);
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__ew?.store.getState().screen === "play" && window.__ew.game?.ledges?.ready, null, { timeout: 240000 });
    await page.locator(".objective-card .row button").first().waitFor();
    const englishUi = (await page.locator("html").getAttribute("lang")) === "en";
    // Exercise the radio button even on a build with no songs configured.
    if (phone) await setRadioAvailable(page, true);
    const press = (selector) => phone ? page.locator(selector).tap() : page.locator(selector).click();
    const go = (on) => phone ? page.evaluate((v) => window.__ew.game.setJoystick(0, v ? 1 : 0), on) : page.keyboard[on ? "down" : "up"]("w");
    const toolbar = page.locator(".toolbar");
    const phoneLayout = { width, columns: label.startsWith("short") ? 2 : 1, radio: true, course: await toolbar.locator(".course-link").count() > 0 };
    const menu = toolbar.locator(".ride-menu");
    const radio = toolbar.locator(".radio-btn");
    const due = toolbar.locator(".toolbar-tools .due-badge");
    const firstAction = toolbar.locator(".toolbar-tools button.icon-btn:not(.radio-btn)").first();
    const walkingTools = await toolbar.locator(".icon-btn:visible").count();
    const [firstTool] = await settledBoxes(page, [".toolbar-tools .icon-btn"]);
    const radioCount = await radio.count();
    assert(walkingTools >= 8 && await due.innerText() === "1", `${label}: the full toolbar and the due card`);

    await go(true);
    await page.waitForFunction(() => window.__ew.store.getState().hud.walking);
    await page.waitForTimeout(2000);
    await checkFolded(page, label, phone ? 44 : 48);
    // Keep a two-line door prompt on screen for the measurement, even along an empty road.
    const prompt = { kind: "enter", label: englishUi ? `Enter ${airportName}` : `Įeiti: ${airportName}`, lt: englishUi ? "The airport" : puerto ? "Oro uostas" : "Maple Harbor oro uostas" };
    await page.evaluate((prompt) => window.__ew.store.getState().setHud({ prompt }), prompt);
    await page.locator(".prompt").waitFor();
    await snap(page, `${label.replace(/\W+/g, "-")}-walking`);
    const walking = await layout(page);
    assert.deepEqual(walking.overlaps, [], `${label}: walking ${JSON.stringify(walking)}`);
    assert(walking.boxes.some(({ selector }) => selector === ".prompt"), `${label}: the settled door prompt is visible`);
    if (phone) assert.equal(walking.boxes.filter(({ selector }) => [".joy", ".jump-btn", ".act-btn"].includes(selector)).length, 3);
    if (phone) {
      await checkPhoneToolbar(page, `${label} walking`, { ...phoneLayout, prompt: true });
      await setRadioAvailable(page, false);
      await checkPhoneToolbar(page, `${label} walking without radio`, { ...phoneLayout, radio: false, prompt: true });
      await setRadioAvailable(page, true);
      await checkMovingNotes(page, `${label} walking`, height);
    }
    await go(false);
    await page.waitForTimeout(2000);
    assert(await page.locator(".objective-card .row button").first().isVisible(), `${label}: the task reopened while standing still`);
    if (phone) await checkPhoneToolbar(page, `${label} with the task open`, phoneLayout);

    // Start by the driver's door, as in rides.mjs.
    await page.evaluate((carId) => {
      const g = window.__ew.game, r = g.rides.list.find((q) => q.kind === "car" && (!carId || q.id === carId)), h = r.m.heading;
      g.keys.clear();
      g.enterZone("town", { x: r.m.x + Math.cos(h) * 2.2, z: r.m.z - Math.sin(h) * 2.2, rot: h }, true);
    }, puerto ? "park" : null);
    await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "drive", null, { timeout: 5000 });
    if (phone) await press(".act-btn"); else await page.keyboard.press("e");
    await page.waitForFunction(() => window.__ew.game.rides.phase === "on" && window.__ew.store.getState().hud.prompt?.kind === "out", null, { timeout: 5000 });
    await snap(page, `${label.replace(/\W+/g, "-")}-ride`);
    await menu.waitFor();
    await firstAction.waitFor({ state: "hidden" });
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
    await firstAction.waitFor();
    const expanded = await layout(page);
    assert.equal(await toolbar.locator(".icon-btn:visible").count(), walkingTools + 1, `${label}: Meniu revealed the full toolbar`);
    await snap(page, `${label.replace(/\W+/g, "-")}-ride-menu-open`);
    assert.equal(await due.innerText(), "1", `${label}: the phrasebook shows the due card`);
    assert.deepEqual(anchored(expanded.boxes), anchored(parked.boxes), `${label}: the minimap and controls stayed in place`);
    assert.deepEqual(expanded.overlaps, [], `${label}: open ride toolbar ${JSON.stringify(expanded)}`);
    if (phone) {
      await checkPhoneToolbar(page, `${label} open ride toolbar`, phoneLayout);
      await setRadioAvailable(page, false);
      await checkPhoneToolbar(page, `${label} open ride toolbar without radio`, { ...phoneLayout, radio: false });
      await setRadioAvailable(page, true);
      await checkMovingNotes(page, `${label} open ride toolbar`, height);
    }
    await page.waitForTimeout(6000);
    assert.equal(await toolbar.locator(".icon-btn:visible").count(), 1 + radioCount, `${label}: Meniu folded after five idle seconds`);
    if (phone) {
      // A new task opens the card briefly without taking the learner out of the car.
      await press(".ride-menu");
      await page.evaluate((id) => window.__ew.game.setObjective(id), nextTask);
      await page.locator(".objective-card.fresh").waitFor();
      await checkPhoneToolbar(page, `${label} open ride toolbar and open task`, phoneLayout);
      await press(".ride-menu");
      await page.locator(".objective-card.collapsed").waitFor();
    }
    await page.keyboard.press("m");
    await page.locator(".overlay .sheet").waitFor();
    assert.equal(await page.evaluate(() => window.__ew.store.getState().hud.panel), "map", `${label}: M opens the map while folded`);
    await page.keyboard.press("Escape");
    await page.locator(".overlay").waitFor({ state: "hidden" });

    // Drive on the quiet stretch of Calle Uxmal or Station Road.
    await page.evaluate(({ x, z, rot }) => window.__ew.game.rides.riding.m.set(x, z, rot), drive);
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
      await page.evaluate((id) => window.__ew.game.setObjective(id), nextTask);
      await page.locator(".objective-card.fresh").waitFor();
      await page.waitForTimeout(2400);
      assert(await page.locator(".objective-card .row button").first().isVisible(), "the new task stays open through its pop while riding");
      await page.locator(".objective-card.collapsed").waitFor();
      await page.evaluate(() => window.__ew.store.getState().setHud({ objective: null }));
      assert.equal(await page.locator(".objective-card.collapsed .objective-title").innerText(), englishUi ? "All tasks done" : "Visos užduotys atliktos");
    } else {
      assert.equal(await page.getByRole("button", { name: "Klavišai" }).count(), 0, "touch controls have no key chip");
    }
    if (phone) await press(".act-btn"); else await page.keyboard.press("e");
    await page.waitForFunction(() => !window.__ew.game.rides.riding && !window.__ew.store.getState().hud.ride, null, { timeout: 5000 });
    await page.waitForTimeout(2000);
    assert(!(await menu.isVisible()) && await toolbar.locator(".icon-btn:visible").count() === walkingTools, `${label}: getting out restores all tools`);
    assert(await page.locator(".objective-card:not(.collapsed) p").isVisible(), `${label}: getting out and standing still reopens the card`);
    const savedRides = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).coach.rides, `${storage}-progress-v1`);
    assert.equal(savedRides, 1, `${label}: the first drive was saved`);

    await page.evaluate((zoneBanner) => {
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
      st.setHud({ zoneBanner, coach: { step: "walk", ok: false } });
      st.toast({ kind: "tip", title: "Kelias užimtas", ms: 1 });
      st.toast({ kind: "stamp", title: "Pasirašyta", ms: 1 });
      st.toast({ kind: "success", title: "Puiku!", ms: 1 });
      setTimeout(() => st.setHud({ zoneBanner: null }), 2600);
    }, placeName);
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

    if (puerto && !phone) {
      const shore = (z) => page.evaluate((z) => window.__ew.game.enterZone("town", { x: 38, z, rot: Math.PI }, true), z);
      await shore(-76.5);
      await page.waitForFunction(() => window.__ew.store.getState().hud.wading);
      await menu.waitFor();
      assert.equal(await page.locator(".ride-keys").count(), 0, "wading keeps the walking controls");
      await shore(-84);
      await page.waitForFunction(() => window.__ew.store.getState().hud.ride === "swim");
      assert(await menu.isVisible(), "swimming keeps the town menu folded");
      await shore(-67);
      await menu.waitFor({ state: "hidden" });
    }

    assert.deepEqual(errors, [], `${label}: no page or console errors`);
    await ctx.close();
    console.log("ok", label);
  }
  console.log("playing screen: all checks passed");
} finally {
  await browser.close();
}
