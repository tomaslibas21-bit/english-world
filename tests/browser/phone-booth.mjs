// Run against a Puerto Colibrí build with WORLD_STORAGE=puerto-colibri and WORLD_LEARNER=en or lt.
import assert from "node:assert/strict";
import { silence } from "./radio-fixtures.mjs";
import { installTown, key, progress, manualFrames, screenshot, variety, helperLang, learnerLabel as label } from "./life-harness.mjs";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
assert.equal(process.env.WORLD_STORAGE, "puerto-colibri");
const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  executablePath: process.env.WORLD_BROWSER_EXECUTABLE,
  headless: true,
});
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [], requests = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("request", r => requests.push(new URL(r.url()).pathname));
  let deny = true;
  const recording = silence(0.4);
  await page.route(/\.mp3(?:\?|$)/, r => r.fulfill(deny ? { status: 403 } : { contentType: "audio/wav", body: recording }));
  await page.addInitScript(installTown, { key, variety, manual: true, progress: {
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
        window.__drawBooth(game.scene, game.rig.cam);
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
  const book = page.getByRole("dialog", { name: label("Miesto telefonų knyga", "Town directory") });
  const button = name => book.getByRole("button", { name, exact: true });
  const click = locator => during(() => locator.click({ timeout: 15000 }));
  const start = () => click(button(label("Pradėti mokomąjį skambutį", "Start practice call")));
  const next = () => click(button(label("Pereiti prie kitos replikos", "Next turn")));
  const hang = () => click(button(label("Padėti ragelį", "Hang up")));
  const contact = id => book.locator(`[data-contact="${id}"]`);
  const line = book.locator(".booth-line");
  const holds = () => page.evaluate(() => [...window.__ew.radio.holds].sort());
  const open = () => page.keyboard.press("e");
  await waitFor(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"), "town loads");
  assert.equal(await page.locator("html").getAttribute("lang"), helperLang);
  // Draw on demand for the screenshots and renderer checks. The game clock and input still run on every step.
  await page.evaluate(() => {
    const renderer = window.__ew.game.renderer;
    window.__drawBooth = renderer.render.bind(renderer);
    renderer.render = () => {};
  });
  await waitFor(async () => (await hud()).prompt?.kind === "enter", "station door on calle Hidalgo");
  assert(!requests.some(p => /\/phoneBooth[.-]/i.test(p)), "no directory boot request");
  await open();
  await waitFor(async () => (await hud()).minimap.zone === "station" && !(await hud()).zoneBanner, "inside Terminal de Autobuses");
  await showTouch(false);
  await shot("doorway");
  const sign = await page.evaluate(() => {
    const sign = window.__ew.game.zone.interior.group.getObjectByName("public-phone-sign");
    const { normal } = sign.geometry.attributes;
    const canvas = sign.material.map.image;
    return { faces: Array.from({ length: normal.count }, (_, i) => normal.getZ(i)), size: [canvas.width, canvas.height] };
  });
  assert.deepEqual(sign.size, [256, 128]);
  assert(sign.faces.some(z => z > 0.99) && sign.faces.some(z => z < -0.99), "both sides carry the painted face");
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
  await during(() => page.getByRole("button", { name: label("Viešasis telefonas", "Public phone"), exact: true }).tap());
  await waitFor(() => book.isVisible(), "named directory opens");
  assert.deepEqual(await holds(), idleHolds);
  assert.equal(await contact("lizzie").count(), 1);
  assert(!requests.some(p => /\/(?:s83-invite-call|s90-running-late)[.-]/.test(p)), "silent browsing loads neither script");
  await page.setViewportSize({ width: 390, height: 664 });
  await shot("index");
  await click(contact("walter"));
  assert((await book.innerText()).includes("Terminal de Autobuses"));
  assert((await book.innerText()).includes(label("Mokomojo skambučio nėra", "No practice call available")));
  await shot("walter");
  await page.keyboard.press("Escape");
  await click(contact("lizzie"));
  assert.equal(await book.getByRole("button", { name: new RegExp(label("Atverti savo telefone", "Open on my phone")) }).count(), 0);
  const practiceTopic = book.getByText(label("Pakviesti draugę", "Invite a friend"), { exact: true });
  const personal = book.getByRole("heading", { name: label("Tavo telefone", "On your phone") });
  const [topicBox, startBox, personalBox] = await Promise.all([
    practiceTopic.boundingBox(), button(label("Pradėti mokomąjį skambutį", "Start practice call")).boundingBox(), personal.boundingBox(),
  ]);
  assert(topicBox.x + topicBox.width <= startBox.x && topicBox.y < startBox.y + startBox.height,
    "the practice topic sits beside its start action at 390 × 664 A++");
  assert(startBox.y + startBox.height <= personalBox.y, "personal-phone topics follow the practice action");
  await shot("lizzie");
  await start();
  await waitFor(() => line.isVisible(), "Friday hello");
  assert((await holds()).includes("phonebooth"));
  await waitFor(() => button(label("Bandyti dar kartą", "Try again")).isVisible(), "failed recording offers retry");
  await shot("denied");
  deny = false;
  await click(button(label("Bandyti dar kartą", "Try again")));
  await waitFor(async () => !(await button(label("Bandyti dar kartą", "Try again")).count()) && await page.evaluate(() => window.__ew.voice() === "idle"), "silent fixture plays to the end");
  assert.equal(await line.innerText(), "¿Bueno?", "audio completion leaves the turn in place");
  await next();
  assert.equal(await line.innerText(), "¿Estás libre el viernes?");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("friday");
  await click(button(label("Rodyti reikšmę", "Show meaning")));
  assert.equal(await book.locator(".booth-meaning").innerText(), label("Ar esi laisva penktadienį?", "Are you free on Friday?"));
  await shot("friday-meaning");
  await click(button(label("Klausytis atsakymo pavyzdžio", "Hear model reply")));
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.setViewportSize({ width: 844, height: 390 });
  assert.equal(await button(label("Tęsti skambutį", "Resume call")).isVisible(), true);
  assert.equal(await button(label("Pereiti prie kitos replikos", "Next turn")).isEnabled(), false);
  await click(button(label("Tęsti skambutį", "Resume call")));
  assert.equal(await line.innerText(), "¿Estás libre el viernes?");
  await next();
  await next();
  await next();
  assert((await book.innerText()).includes(label("Praktika baigta", "Practice complete")));
  const course = book.getByRole("link", { name: new RegExp(label("Atverti kurse", "Open in the course")) });
  if (await course.count()) assert.equal(await course.innerText(), label("Atverti kurse · Planai ir kvietimai", "Open in the course · Plans and invitations"));
  if (await course.count()) assert.equal(new URL(await course.getAttribute("href")).pathname, `/${helperLang === "lt" ? "situacijos" : "situations"}/SS22`);
  await click(button(label("Kartoti skambutį", "Practice again")));
  await hang();
  assert.equal(await contact("lizzie").evaluate(el => el === document.activeElement), true);
  await shot("returned-focus");
  await click(contact("harris"));
  await start();
  await waitFor(() => line.isVisible(), "Montes hello");
  await next();
  assert.equal(await line.innerText(), "Voy tarde.");
  await next();
  await click(button(label("Rodyti reikšmę", "Show meaning")));
  assert.equal(await line.innerText(), "¿Como a qué hora llega?");
  const replay = button(label("Dar kartą klausytis eilutės", "Replay line"));
  const [dialogueBox, meaningBox, replayBox, hangBox] = await Promise.all([
    book.locator(".booth-body").boundingBox(), button(label("Slėpti reikšmę", "Hide meaning")).boundingBox(),
    replay.boundingBox(), button(label("Padėti ragelį", "Hang up")).boundingBox(),
  ]);
  assert(meaningBox.height >= 44);
  assert(replayBox.height >= 44);
  assert.equal(meaningBox.y, replayBox.y);
  assert(dialogueBox.y + dialogueBox.height <= replayBox.y && replayBox.y + replayBox.height <= hangBox.y);
  // A visible bounding box can still be covered. Hit-test each corner and activate Replay with the meaning open.
  for (const control of [button(label("Slėpti reikšmę", "Hide meaning")), replay]) {
    assert(await control.evaluate(el => {
      const { left, right, top, bottom } = el.getBoundingClientRect();
      return [left + 5, right - 5].every(x => [top + 5, bottom - 5].every(y => el.contains(document.elementFromPoint(x, y))));
    }));
  }
  await click(replay);
  assert.equal(await book.locator(".booth-meaning").innerText(), label("Maždaug kada atvyksite?", "Around what time will you get here?"));
  await shot("eta");
  await next();
  assert.equal(await line.innerText(), "En media hora, más o menos.");
  await next();
  if (await course.count()) {
    assert.equal(new URL(await course.getAttribute("href")).pathname, `/${helperLang === "lt" ? "situacijos" : "situations"}/SS29`);
    assert.equal(await course.innerText(), label("Atverti kurse · Kai vėluoji", "Open in the course · When you’re running late"));
    await context.route("**/SS29", r => r.fulfill({ body: "SS29" }));
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
    pagehide: await listeners("window", "pagehide"), ...await page.evaluate(({ pose, timed }) => {
    const { game, audio, radio } = window.__ew;
    const cam = game.rig.cam.clone();
    cam.position.fromArray(pose.position);
    cam.quaternion.fromArray(pose.quaternion);
    const draw = () => window.__drawBooth(game.scene, cam);
    draw();
    let p95;
    if (timed) {
      const gl = game.renderer.getContext(), pixel = new Uint8Array(4);
      // The harness advances simulation time manually. Use the browser's real clock for draws.
      const now = Performance.prototype.now.bind(performance);
      const samples = [];
      for (let i = 0; i < 45; i++) {
        const start = now();
        draw();
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        if (i >= 5) samples.push(now() - start);
      }
      p95 = samples.sort((a, b) => a - b)[Math.ceil(samples.length * .95) - 1];
    }
    return { p95, ...game.renderer.info.memory, calls: game.renderer.info.render.calls, holds: [...radio.holds],
      voice: audio.getState(), pendingVoice: !!audio.request };
  }, { pose: fixedView, timed: process.env.WORLD_PHONE_TIMING === "1" }) });
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
  assert.deepEqual({ ...after, calls: before.calls, p95: before.p95 }, before);
  console.log("Ten returns", after);
  assert.deepEqual(await world(), mark);
  assert.deepEqual(await snapshot(), baseline);
  assert.equal(await page.locator(".hud .prompt").evaluate(el => el === document.activeElement), true);
  await walk(-3, 6.3);
  await walk(-3, -4.8);
  await walk(-6, -4.85);
  await waitFor(async () => (await hud()).prompt?.kind === "talk", "ticket counter prompt");
  await walk(-3, -4.8);
  await walk(0, 8.2);
  await waitFor(async () => (await hud()).prompt?.kind === "exit", "station exit");
  await open();
  await waitFor(async () => (await hud()).minimap.zone === "town", "back on calle Hidalgo");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ baseline, before, after, mark, walkedToCounterAndExit: true }));
} finally { await browser.close(); }
