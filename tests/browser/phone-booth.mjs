// Maple Harbor. Use the same server, Playwright module and screenshot directory as phone-rings.mjs.
import assert from "node:assert/strict";
import { silence } from "./radio-fixtures.mjs";
import { installTown, key, progress, manualFrames, screenshot } from "./life-harness.mjs";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [], requests = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("request", r => requests.push(new URL(r.url()).pathname));
  let deny = true;
  const recording = silence(0.4);
  await page.route(/\.mp3(?:\?|$)/, r => r.fulfill(deny ? { status: 403 } : { contentType: "audio/wav", body: recording }));
  await page.addInitScript(installTown, { key, manual: true, progress: {
    ...progress, place: { zone: "town", x: 45, z: 46.8, rot: 0 },
    settings: { ...progress.settings, textSize: 1.3, volume: 0, sounds: 0 },
    coach: { done: true, seen: { list: true }, view: true },
  } });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  const { step, waitFor, during } = manualFrames(page);
  const showTouch = enabled => page.evaluate(showTouch => window.__ew.store.getState().setHud({ showTouch }), enabled);
  const hud = () => page.evaluate(() => window.__ew.store.getState().hud);
  const world = () => page.evaluate(() => window.__ew.game.player.root.position.toArray());
  const snapshot = () => page.evaluate(() => {
    const { sits, phrases, phone } = window.__ew.store.getState().progress;
    return { sits, phrases, phone, cards: Object.entries(localStorage).filter(([k]) => /card/i.test(k)) };
  });
  const shot = async name => {
    const { width, height } = page.viewportSize();
    if (process.env.WORLD_SHOTS || process.env.WORLD_SHOT_DIR) {
      await step(2);
      await page.evaluate(() => {
        const { game } = window.__ew;
        game.renderer.render(game.scene, game.rig.cam);
      });
      await during(() => screenshot(page, "booth-" + name, width, height));
    }
  };
  const walk = async (x, z) => {
    console.log("Walking to", x, z);
    await page.evaluate(([x, z]) => window.__ew.game.walkTo(x, z, { kind: "point" }), [x, z]);
    await waitFor(async () => {
      const [px, , pz] = await world();
      return Math.hypot(px - x, pz - z) < 0.42;
    }, `walking to ${x}, ${z}`);
  };
  const book = page.getByRole("dialog", { name: "Miesto telefonų knyga" });
  const button = name => book.getByRole("button", { name, exact: true });
  const click = locator => during(() => locator.click({ timeout: 15000 }));
  const start = () => click(button("Pradėti mokomąjį skambutį"));
  const next = () => click(button("Pereiti prie kitos replikos"));
  const hang = () => click(button("Padėti ragelį"));
  const contact = id => book.locator(`[data-contact="${id}"]`);
  const line = book.locator(".booth-line");
  const holds = () => page.evaluate(() => [...window.__ew.radio.holds].sort());
  const open = () => page.keyboard.press("e");
  await waitFor(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"), "town loads");
  await waitFor(async () => (await hud()).prompt?.kind === "enter", "station door on Oak Avenue");
  assert(!requests.some(p => /\/(?:PhoneBooth|phoneBooth)\./.test(p)), "no directory boot request");
  await open();
  await waitFor(async () => (await hud()).minimap.zone === "station" && !(await hud()).zoneBanner, "inside Union Station");
  await showTouch(false);
  await shot("doorway");
  await walk(-5.2, 6.65);
  await waitFor(async () => (await hud()).prompt?.kind === "phonebooth", "listening mark");
  await step(10);
  await page.setViewportSize({ width: 390, height: 844 });
  await step(5);
  await showTouch(true);
  await shot("mark");
  // An already visible native card has first claim even if the world prompt is tapped.
  await page.evaluate(() => {
    const st = window.__ew.store.getState();
    st.setHud({ phoneCard: "p24-flood" });
    window.__ew.game.interact();
  });
  assert.equal((await hud()).panel, null);
  assert.equal((await hud()).phoneCard, "p24-flood");
  await page.evaluate(() => window.__ew.store.getState().setHud({ phoneCard: null }));
  const mark = await world(), baseline = await snapshot(), idleHolds = await holds();
  await during(() => page.locator(".hud .prompt").tap());
  await waitFor(() => book.isVisible(), "named directory opens");
  assert.deepEqual(await holds(), idleHolds);
  assert.equal(await contact("lizzie").count(), 1);
  assert(!requests.some(p => /\/situations\/(s83-invite-call|s90-running-late)\./.test(p)), "silent browsing loads neither script");
  await page.setViewportSize({ width: 390, height: 664 });
  await shot("index");
  await click(contact("walter"));
  assert.match(await book.innerText(), /Union Station[\s\S]*Mokomojo skambučio nėra/);
  await shot("walter");
  await page.keyboard.press("Escape");
  await click(contact("lizzie"));
  assert.equal(await book.getByRole("button", { name: /Atverti savo telefone/ }).count(), 0);
  await shot("lizzie");
  await start();
  await waitFor(() => line.isVisible(), "Friday hello");
  assert((await holds()).includes("phonebooth"));
  await waitFor(() => button("Bandyti dar kartą").isVisible(), "failed recording offers retry");
  await shot("denied");
  deny = false;
  await click(button("Bandyti dar kartą"));
  await waitFor(async () => !(await button("Bandyti dar kartą").count()) && await page.evaluate(() => window.__ew.voice() === "idle"), "silent fixture plays to the end");
  assert.equal(await line.innerText(), "Hello?", "audio completion leaves the turn in place");
  await next();
  assert.equal(await line.innerText(), "Are you free on Friday?");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("friday");
  await click(button("Rodyti reikšmę"));
  await shot("friday-meaning");
  await click(button("Klausytis atsakymo pavyzdžio"));
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.setViewportSize({ width: 844, height: 390 });
  assert.equal(await button("Tęsti").isVisible(), true);
  assert.equal(await button("Pereiti prie kitos replikos").isEnabled(), false);
  await click(button("Tęsti"));
  assert.equal(await line.innerText(), "Are you free on Friday?");
  await next();
  await next();
  await next();
  assert.match(await book.innerText(), /Praktika baigta/);
  const course = book.getByRole("link", { name: /Atverti kurse/ });
  if (await course.count()) assert.equal(new URL(await course.getAttribute("href")).pathname, "/situacijos/S83");
  await click(button("Kartoti skambutį"));
  await hang();
  assert.equal(await contact("lizzie").evaluate(el => el === document.activeElement), true);
  await shot("returned-focus");
  await click(contact("harris"));
  await start();
  await waitFor(() => line.isVisible(), "Harris hello");
  await next();
  assert.equal(await line.innerText(), "I'm running late.");
  await next();
  await click(button("Rodyti reikšmę"));
  assert.match(await book.innerText(), /Kada, Jūsų manymu, atvyksite\?/);
  await shot("eta");
  await next();
  assert.equal(await line.innerText(), "In about half an hour.");
  await next();
  if (await course.count()) {
    assert.equal(new URL(await course.getAttribute("href")).pathname, "/situacijos/S90");
    await context.route("**/situacijos/S90", r => r.fulfill({ body: "S90" }));
    const popup = page.waitForEvent("popup", { timeout: 12000 });
    await click(course);
    await (await popup).close();
  } else await hang();
  assert.equal(await contact("harris").evaluate(el => el === document.activeElement), true);
  await page.keyboard.press("Escape");
  await waitFor(async () => !(await hud()).panel, "back at listening mark");
  console.log("Both calls and course handoff passed");
  const cdp = await context.newCDPSession(page);
  async function listeners(target, type) {
    const { result } = await cdp.send("Runtime.evaluate", { expression: target, objectGroup: "station-check" });
    const { listeners } = await cdp.send("DOMDebugger.getEventListeners", { objectId: result.objectId });
    return listeners.filter(l => l.type === type).length;
  }
  const fixedView = await page.evaluate(() => {
    const cam = window.__ew.game.rig.cam;
    return { position: cam.position.toArray(), quaternion: cam.quaternion.toArray() };
  });
  const resources = async () => ({ visibility: await listeners("document", "visibilitychange"),
    pagehide: await listeners("window", "pagehide"), ...await page.evaluate(pose => {
    const { game, audio, radio } = window.__ew;
    const cam = game.rig.cam.clone();
    cam.position.fromArray(pose.position);
    cam.quaternion.fromArray(pose.quaternion);
    game.renderer.render(game.scene, cam);
    return { ...game.renderer.info.memory, calls: game.renderer.info.render.calls, holds: [...radio.holds],
      voice: audio.getState(), pendingVoice: !!audio.request };
  }, fixedView) });
  await step(5);
  await page.setViewportSize({ width: 1280, height: 800 });
  await open();
  await click(contact("harris"));
  await showTouch(false);
  await shot("open-book");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 844, height: 390 });
  await step(12);
  const before = await resources();
  for (let cycle = 0; cycle < 10; cycle++) {
    await open();
    await click(contact("lizzie"));
    await start();
    await waitFor(() => line.isVisible(), "practice turn loads");
    await hang();
    await page.keyboard.press("Escape");
  }
  await step(5);
  const after = await resources();
  await cdp.send("Runtime.releaseObjectGroup", { objectGroup: "station-check" });
  await cdp.detach();
  assert(after.calls <= before.calls, `draws grew from ${before.calls} to ${after.calls}`);
  assert.deepEqual({ ...after, calls: before.calls }, before);
  console.log("Ten returns", after);
  assert.deepEqual(await world(), mark);
  assert.deepEqual(await snapshot(), baseline);
  assert.equal(await page.locator(".hud .prompt").evaluate(el => el === document.activeElement), true);
  await walk(-3, 6.3);
  await walk(-3, -4.8);
  await walk(-6, -4.85);
  await waitFor(async () => (await hud()).prompt?.label.includes("Walter"), "ticket counter prompt");
  await walk(-3, -4.8);
  await walk(0, 8.2);
  await waitFor(async () => (await hud()).prompt?.kind === "exit", "station exit");
  await open();
  await waitFor(async () => (await hud()).minimap.zone === "town", "back on Oak Avenue");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ baseline, before, after, mark, walkedToCounterAndExit: true }));
} finally { await browser.close(); }
