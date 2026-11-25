// Every board at the school gives the lesson's prompt, including the kayak. A ring marks the start on dry sand.
// The first time one comes near the school a hint says the lesson is
// there, and the end card of the school's conversation leads with "Surf lesson" (its yes starts the lesson at its
// level, else the level's choice). Check the map and walking approach too, with the town clock stepped by hand.
// WORLD_TEST_URL=http://127.0.0.1:5188 WORLD_STORAGE=english-world WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/surf-find.mjs
import assert from "node:assert/strict";
import { HARBOR_START, SEEDED_RANDOM, checkSurfTownView, readConversationState, sampleSurfRender, waitForLearnerTurn } from "./fixtures/surf-town.mjs";
import { HARBOR_PHONE_VIEW, checkHarborCalls, openHarbor, originalHarborCalls } from "./fixtures/harbor-calls.mjs";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5188";
const storage = process.env.WORLD_STORAGE || "english-world";
const shots = process.env.WORLD_SHOTS || "";
const check = (name, value, detail) => {
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name, detail === undefined ? "" : JSON.stringify(detail));
};
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: -85, z: -63, rot: -Math.PI / 2 },
  // The surf hint is the only one this returning learner has yet to see.
  coach: { seen: { walk: true, run: true, jump: true, talk: true, list: true, car: true, boat: true, water: true, radio: true }, run: true, view: true },
};
const INIT = `(() => {
  try { sessionStorage.setItem("ew-play-now", "1"); } catch {}
  window.SpeechRecognition = undefined;
  window.webkitSpeechRecognition = undefined;
  ${SEEDED_RANDOM}
  let now = 1000;
  performance.now = () => now;
  const q = [];
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = (n, dt = 1000 / 60) => { for (let i = 0; i < n; i++) { now += dt; const cbs = q.splice(0); for (const cb of cbs) cb(now); } return now; };
})();`;

const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  // Use the lighthouse suite's seed, clock and fixed camera for its phone budget.
  const originalCalls = await originalHarborCalls(browser, process.env.WORLD_BASELINE_URL, storage);
  const harborContext = await browser.newContext(HARBOR_PHONE_VIEW);
  try {
    const page = await openHarbor(harborContext, base, storage);
    await page.waitForFunction(() => !!window.__ew.game.islandScene);
    await checkHarborCalls(page, originalCalls);
  } finally {
    await harborContext.close();
  }
  for (const [label, width, height] of [["computer", 1280, 800], ["phone", 375, 812], ["short-phone", 390, 664]]) {
    const phone = label !== "computer";
    const ctx = await browser.newContext({ viewport: { width, height }, ...(phone ? { deviceScaleFactor: 2, isMobile: true, hasTouch: true } : {}) });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error" && /WebGLProgram: Shader Error/.test(m.text())) errors.push(m.text()); });
    await page.route(/\.mp3(?:\?|$)/, (route) => route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } }));
    await page.addInitScript(([k, v]) => { if (sessionStorage.getItem("seeded") !== "1") { sessionStorage.setItem("seeded", "1"); localStorage.clear(); localStorage.setItem(k, v); } }, [`${storage}-progress-v1`, JSON.stringify(progress)]);
    await page.addInitScript(INIT);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    const t0 = Date.now();
    for (;;) {
      const st = await page.evaluate(() => { window.__step?.(2); return window.__ew?.store?.getState().screen ?? "loading"; }).catch(() => "navigating");
      if (st === "play") break;
      assert(Date.now() - t0 < 180000, "the game did not start: " + st);
      await new Promise((r) => setTimeout(r, 300));
    }
    const step = (n) => page.evaluate((k) => window.__step(k), n);
    const real = (ms) => new Promise((r) => setTimeout(r, ms));
    const shot = async (name, frames = 2) => { if (shots) { if (frames) await step(frames); await real(300); await page.screenshot({ path: `${shots}/${label}-${name}.png` }); } };
    await page.evaluate(() => window.__ew.store.getState().setHud({ panel: null }));
    const at = async (x, z, rot = Math.PI) => { await page.evaluate(([x, z, rot]) => { const g = window.__ew.game; g.keys.clear(); g.enterZone("town", { x, z, rot }, true); }, [x, z, rot]); await step(20); };
    const hud = () => page.evaluate(() => window.__ew.store.getState().hud);
    assert.equal(await page.evaluate(() => document.documentElement.lang), "lt");
    check(`${label}: Maple Harbor has its surf school`, await page.evaluate(() => window.__ew.game.surf?.content.npc === "maren"));
    const spot = await page.evaluate(() => ({ ...window.__ew.game.surf.spot }));
    const counter = [-99.8, -68.55];
    assert.deepEqual(spot.start, HARBOR_START);
    assert.deepEqual(spot.boards, [[-104.2, -68.6, 2.8], [-104.5, -65.8, 2.4], [-108, -68.9, 2.6]]);
    assert.deepEqual([spot.x, spot.z, spot.hintWithin], [-94.5, -72.2, 15]);

    // The same hint is only shown once, even after leaving its range and walking back in.
    await at(-85, -63, -Math.PI / 2);
    check(`${label}: away from the school, no hint about it`, (await hud()).coach?.step !== "surf");
    await at(-93, -64.5, -Math.PI / 2);
    await step(20);
    let h = await hud();
    check(`${label}: coming near Harbor Surf, the hint about the lesson`, h.coach?.step === "surf", h.coach);
    await page.locator(".coach").waitFor();
    const hint = await page.locator(".coach .coach-text p").innerText();
    const action = phone ? "bakstelėkite „Banglentė“" : "spauskite E";
    assert.equal(hint, `Prie „Harbor Surf“ lentų ${action}. Maren pakvies pagauti bangą ir pokalbio pabaigoje.`);
    await shot("hint");
    await page.locator(".coach-next").click();
    await step(10);
    assert.equal((await hud()).coach, null, `${label}: the hint is dismissed`);
    for (const [x, z] of [[-85, -63], [-93, -64.5]]) {
      await page.evaluate(([x, z]) => window.__ew.game.walkTo(x, z, { kind: "point" }), [x, z]);
      for (let i = 0; i < 100 && await page.evaluate(() => !!window.__ew.game.autoPath?.length); i++) await step(12);
      const arrived = await page.evaluate(([x, z]) => {
        const { game, store } = window.__ew, p = game.player.root.position;
        return { distance: Math.hypot(p.x - x, p.z - z), walking: !!game.autoPath?.length, hint: store.getState().hud.coach };
      }, [x, z]);
      check(`${label}: walked to (${x}, ${z}) without repeating the surf hint`, arrived.distance < 0.5 && !arrived.walking && !arrived.hint, arrived);
    }

    // ---- every board gives the lesson's prompt: the kayak the owner stood on, the rack, the paddleboards, the start
    const ring = await page.evaluate(() => {
      const m = window.__ew.game.surf.marker;
      return { visible: m.visible && m.children[0]?.visible, x: m.position.x, y: m.position.y, z: m.position.z, color: m.children[0]?.material.color.getHexString() };
    });
    check(`${label}: the gold ring marks the lesson's dry start`, ring.visible && ring.color === "ffd166" && ring.y > 0 && Math.hypot(ring.x - spot.start.x, ring.z - spot.start.z) < 0.1, ring);
    for (const [name, x, z] of [["on the yellow kayak", spot.boards[2][0], spot.boards[2][1]], ["beside the kayak", spot.boards[2][0] - 1.4, spot.boards[2][1] + 0.6], ["at the rack", spot.boards[0][0], spot.boards[0][1] - 0.6], ["by the paddleboards", spot.boards[1][0] + 0.9, spot.boards[1][1]], ["on the ring", spot.start.x, spot.start.z]]) {
      await at(x, z);
      h = await hud();
      check(`${label}: ${name}, the lesson's prompt`, h.prompt?.kind === "surf", { name, prompt: h.prompt });
      check(`${label}: ${name} is on dry ground`, await page.evaluate(() => !window.__ew.game.swimming && window.__ew.game.player.root.position.y >= -0.01));
      if (name === "on the yellow kayak") await shot("kayak-prompt");
    }
    if (phone) check(`${label}: its round button says "Banglentė"`, (await page.locator(".act-btn").innerText()) === "Banglentė");
    // at her counter it is still her talk prompt
    const npcSpot = await page.evaluate(() => { const n = window.__ew.game.npcs.find((q) => q.id === window.__ew.game.surf.content.npc); return n ? { x: n.home.x, z: n.home.z } : null; });
    await at(...counter, 0);
    h = await hud();
    assert.deepEqual(npcSpot, { x: -99.8, z: -66.45 });
    check(`${label}: at her counter, still her talk prompt`, h.prompt?.kind === "talk" && h.prompt.label.includes("Maren Pike"), { prompt: h.prompt, npcSpot });
    if (shots) {
      await page.locator(".zone-banner").waitFor({ state: "hidden" });
    }
    await step(60);
    await page.locator(".nametag").filter({ has: page.getByText("Maren Pike", { exact: true }) }).waitFor({ state: "visible" });
    const customerView = await checkSurfTownView(page, "manual counter", "counter", () => shot("counter", 0));
    await sampleSurfRender(page, "school counter");
    await at(spot.start.x, spot.start.z);
    if (phone) await page.locator(".act-btn").tap(); else await page.keyboard.press("e");
    await page.locator(".surf-pick .surf-level").first().waitFor();
    await step(5);
    check(`${label}: the prompt opens the level's choice`, await page.locator(".surf-pick .surf-level").count() === 2);
    assert.deepEqual(await page.locator(".surf-pick .surf-level b").allTextContents(), ["Pradedantiesiems", "Pažengusiesiems"]);
    assert.equal(await page.locator(".surf-pick .surf-later").innerText(), "Ne dabar");
    await page.locator(".surf-later").click();
    await step(5);
    assert.equal(await page.locator(".surf-pick").count(), 0, `${label}: cancel closes the level picker`);

    const sitId = await page.evaluate(() => window.__ew.game.surf.situation);
    assert.equal(sitId, "x04-surf");
    const panel = (name) => page.evaluate((name) => window.__ew.store.getState().setHud({ panel: name }), name);
    const schoolCard = '.sit-card[data-sit="x04-surf"]';
    const schoolRow = page.locator(".map-wrap .sit-list > div").filter({ has: page.locator(schoolCard) });
    const map = async () => {
      await panel("map");
      const map = page.locator(".map-wrap");
      const pin = map.getByRole("button", { name: "Harbor Surf", exact: true });
      await pin.click();
      await map.locator(schoolCard).waitFor();
      const pos = await pin.evaluate((el) => {
        const frame = el.parentElement;
        const point = frame.querySelector(".map-selected-point") ?? el;
        const { width, height } = frame.getBoundingClientRect();
        const { left, top } = getComputedStyle(point);
        return [parseFloat(left) / width * 100, parseFloat(top) / height * 100];
      });
      check(`${label}: the map pin is at the shack`, Math.abs(pos[0] - (12.2 / 294 * 100)) < 0.05 && Math.abs(pos[1] - (38.4 / 200 * 100)) < 0.05, pos);
    };
    const clickSchoolAction = async (name) => {
      assert.equal(await schoolRow.count(), 1, `${label}: one Harbor Surf map row`);
      const action = schoolRow.locator(".sit-actions").getByRole("button", { name, exact: true });
      assert.equal(await action.count(), 1, `${label}: one ${name} action in the Harbor Surf map row`);
      await action.waitFor({ state: "visible" });
      await action.click();
    };
    await page.evaluate(() => window.__ew.game.setObjective("s72-cafe"));
    const objective = () => page.evaluate(() => {
      const { progress, hud } = window.__ew.store.getState();
      return [progress.objective, hud.objective?.sitId];
    });
    const originalObjective = await objective();
    assert.deepEqual(originalObjective, ["s72-cafe", "s72-cafe"]);
    const walker = () => page.evaluate(() => {
      const { game, store } = window.__ew, pos = game.player.root.position;
      return { x: pos.x, y: pos.y, z: pos.z, zone: game.zone.id, walking: !!game.autoPath?.length,
        rot: game.heading, swimming: game.swimming, prompt: store.getState().hud.prompt,
        camera: game.rig.cam.position.toArray() };
    });
    const follow = async (name, originZone) => {
      await map();
      const origin = await walker();
      assert.equal(origin.zone, originZone);
      await clickSchoolAction("Nuvesk mane");
      const began = await walker();
      check(`${label}: ${name} begins walking from the current position`,
        began.walking && began.zone === originZone && Math.hypot(began.x - origin.x, began.z - origin.z) < 0.01 && (await hud()).panel === null,
        { origin, began });
      assert.deepEqual(await objective(), originalObjective);
      await shot(`guide-${originZone}-started`);
      let walked = false;
      let p = began;
      for (let i = 0; i < 160; i++) {
        p = await walker();
        if (p.zone === "town") assert(!p.swimming && p.y >= -0.01 && p.z >= -70.1, `${name}: route stays on dry ground: ${JSON.stringify(p)}`);
        if (p.zone === originZone && p.walking && Math.hypot(p.x - origin.x, p.z - origin.z) > 0.1) walked = true;
        if (p.zone === "town" && !p.walking && Math.hypot(p.x - counter[0], p.z - counter[1]) < 0.5 && p.prompt?.kind === "talk") {
          check(`${label}: ${name} walks to Maren on dry sand and faces her`, walked && p.rot === 0 && p.prompt.label.includes("Maren Pike"), p);
          assert.deepEqual(await objective(), originalObjective);
          await step(60);
          const view = await checkSurfTownView(page, `${name} settled arrival`, "counter", () => shot(`guide-${originZone}-arrival`, 0));
          check(`${label}: ${name} settles toward the frontal customer view`, Math.abs(view.yaw) < 0.03
            && Math.hypot(...view.camera.map((v, j) => v - customerView.camera[j])) < 0.75, view.camera);
          return;
        }
        await step(18); await real(10);
      }
      assert.fail(`${name}: guide never reached the customer anchor: ${JSON.stringify(p)}`);
    };
    const picker = page.locator(".sheet.scenarios");
    const courseCount = () => picker.locator("h2").innerText();
    await panel("scenarios");
    await page.locator(".scn-card").first().waitFor();
    const courseBefore = await courseCount();
    assert.match(courseBefore, /\b0\/50$/);
    assert.equal(await picker.locator('[data-sit="x04-surf"]').count(), 0);
    await panel(null);
    await at(-86, -61.5, -Math.PI / 2);
    await real(25);
    const mark = await page.locator(".minimap canvas").evaluate((canvas) => {
      const { px, pz } = window.__ew.store.getState().hud.minimap;
      const x = Math.round(((-99.8 - px) / 90 + 0.5) * canvas.width);
      const y = Math.round(((-65.6 - pz) / 90 + 0.5) * canvas.height);
      const inRange = x >= 10 && x < canvas.width - 10 && y >= 10 && y < canvas.height - 10;
      const area = inRange ? canvas.getContext("2d").getImageData(x - 5, y - 5, 11, 11).data : [];
      let teal = 0, cream = 0;
      for (let i = 0; i < area.length; i += 4) {
        if (area[i] === 40 && area[i + 1] === 124 && area[i + 2] === 121) teal++;
        if (area[i] === 246 && area[i + 1] === 236 && area[i + 2] === 217) cream++;
      }
      return { inRange, x, y, teal, cream };
    });
    check(`${label}: the minimap paints the teal and cream board at the projected school`, mark.inRange && mark.teal > 0 && mark.cream > 0, mark);
    await shot("minimap");
    await follow("Harbor Road", "town");

    const waitForSession = (id = sitId) => waitForLearnerTurn(page, id);
    if (phone) await page.locator(".act-btn").tap(); else await page.keyboard.press("e");
    await waitForSession();
    await step(60);
    await page.locator(".convo .meta").filter({ hasText: "Maren Pike" }).first().waitFor({ state: "visible" });
    await checkSurfTownView(page, "first real rental turn", "conversation", () => shot("rental-conversation", 0));
    // A completed rental records the bonus for the picker through the real dialogue engine.
    for (const answer of ["Hi! I want to rent a surfboard.", "For two hours.", "Here's my passport.", "In cash.", "Yes, let's go!"]) {
      await page.waitForFunction(() => window.__ew.store.getState().conv.phase === "you", null, { polling: 50, timeout: 20000 });
      await page.evaluate((text) => window.__ew.game.activeSession.submit(text, [], "typed"), answer);
    }
    await page.waitForFunction(() => window.__ew.store.getState().progress.sits["x04-surf"]?.completions > 0, null, { polling: 50, timeout: 20000 });
    const ended = page.locator(".convo[data-phase=ended] .ended-box");
    const cta = ended.getByRole("button", { name: "Banglenčių pamoka", exact: true });
    await cta.waitFor();
    const actionOrder = await ended.locator("button").evaluateAll((buttons) => {
      const ctaIndex = buttons.findIndex((b) => b.matches(".surf-cta"));
      // (the phrase row's replay and save-to-cards buttons may come first: they act on the phrase, not on where to go)
      return { firstNavigation: buttons.find((b) => b.matches(".btn:not([data-phrase-save])"))?.classList.contains("surf-cta"),
        onlyReplayBefore: buttons.slice(0, ctaIndex).every((b) => b.matches(".ended-phrase :is(button.play, [data-phrase-save])")) };
    });
    check(`${label}: the real rental completion leads with the surf navigation action`, actionOrder.firstNavigation && actionOrder.onlyReplayBefore, actionOrder);
    assert.deepEqual(await page.evaluate(() => {
      const { game } = window.__ew;
      return [game.pendingSurf, game.modes.queued];
    }), ["beginner", null], "Maren's real invitation remembers beginner for the lesson button");
    await shot("rental-completion");
    await ended.getByRole("button", { name: "Visos situacijos", exact: true }).click();
    assert(await page.evaluate(() => !window.__ew.game.modes.owns("surf")), "opening the picker does not start the lesson");
    const completedCard = picker.locator('[data-sit="x04-surf"]');
    await completedCard.waitFor({ state: "attached" });
    check(`${label}: the completed bonus appears exactly once and the course total is unchanged`,
      await completedCard.count() === 1 && await completedCard.evaluate((el) => el.matches(".scn-card.done")) && await courseCount() === courseBefore);
    if (phone && shots) {
      await completedCard.scrollIntoViewIfNeeded();
      await shot("completed-picker");
    }
    assert.deepEqual(await objective(), originalObjective);
    await panel(null);

    await page.evaluate(() => window.__ew.game.enterZone("sunny-cup", { x: 0, z: 4.4, rot: 0 }, true));
    await step(12);
    await follow("Sunny Cup exit", "sunny-cup");
    await map();

    // The school's end card leads with the lesson and honours the queued level.
    const seedEndCard = async () => {
      await page.evaluate(() => {
        window.__ew.audio.stop();
        window.__ew.store.getState().setConv({ phase: "ended", completed: true });
      });
      await step(4);
    };
    const endCard = async () => {
      if ((await hud()).panel === "map") await clickSchoolAction("Pradėti dabar");
      else await page.evaluate((id) => window.__ew.game.startScenario(id), sitId);
      await waitForSession();
      assert.equal(await page.locator(".surf-cta").count(), 0, "the surf action waits for the end card");
      await seedEndCard();
    };
    await endCard();
    const btns = await page.locator(".ended-box button").allInnerTexts();
    check(`${label}: the seeded end card's first button is "Banglenčių pamoka"`, btns[0]?.trim() === "Banglenčių pamoka" && await cta.count() === 1, btns);
    await shot("end-card");
    await page.locator(".surf-cta").click();
    await page.locator(".surf-pick .surf-level").first().waitFor();
    check(`${label}: tapped without a yes: the conversation closes and the level's choice opens`, !(await page.evaluate(() => window.__ew.game.activeSession?.active)) && await page.locator(".surf-pick .surf-level").count() === 2);
    await page.locator(".surf-later").click();
    await step(5);
    // After "Yes, let's go!", the same button starts the queued level.
    await endCard();
    await page.evaluate(() => window.__ew.game.onSessionEvent("surf", { level: "advanced" }));
    await page.locator(".surf-cta").click();
    for (let i = 0; i < 80 && !(await page.evaluate(() => !!window.__ew.game.surf.logic)); i++) { await step(4); await real(25); }
    const lvl = await page.evaluate(() => window.__ew.game.surf.logic?.level ?? null);
    check(`${label}: after Maren's invitation and a yes, the button starts the lesson at its level`, lvl === "advanced", lvl);
    await page.evaluate(() => window.__ew.game.surfStop());
    await real(700); await step(30);
    // The end card's other actions leave the conversation without launching the lesson.
    await endCard();
    await page.evaluate(() => window.__ew.game.onSessionEvent("surf", { level: "beginner" }));
    await page.locator(".ended-secondary .btn").first().click();
    await real(700); await step(30);
    check(`${label}: after a yes, "Continue" returns to town`, await page.evaluate(() => {
      const g = window.__ew.game;
      return !g.activeSession?.active && !g.modes.owns("surf");
    }));
    await endCard();
    await page.evaluate(() => window.__ew.game.onSessionEvent("surf", { level: "beginner" }));
    await page.locator(".ended-secondary .btn").last().click();
    await waitForSession();
    for (let i = 0; i < 60; i++) { await step(4); await real(15); }
    check(`${label}: restarting after a yes clears the queued lesson`, !(await page.evaluate(() => {
      const { game, store } = window.__ew;
      return game.pendingSurf || game.modes.queued || game.surf.logic || game.surf_picking || store.getState().hud.ride === "surf";
    })));
    // any other conversation's end card has no such button
    await page.evaluate(() => { const g = window.__ew.game; g.activeSession?.close(); });
    await step(20);
    const other = await page.evaluate(() => window.__ew.game.orderedSituations().find((s) => s.id !== window.__ew.game.surf.situation && s.mode !== "phone" && s.mode !== "video" && s.location !== "phone")?.id);
    assert(other);
    assert.notEqual(other, sitId);
    const allSituations = ended.getByRole("button", { name: "Visos situacijos", exact: true });
    try {
      await page.evaluate((id) => window.__ew.game.startScenario(id), other);
      const run = await waitForSession(other);
      await seedEndCard();
      await ended.waitFor({ state: "visible" });
      const state = await readConversationState(page, 1);
      assert.deepEqual(state, { activeSessionId: other, sessionActive: true,
        conv: { active: true, sitId: other, phase: "ended", introOpen: false, completed: true, run } });
      assert(await ended.isVisible(), "the end card stays visible on the next frame");
      assert(await allSituations.isVisible(), "the end card shows Visos situacijos");
      check(`${label}: another conversation's end card has no "Surf lesson"`, await page.locator(".surf-cta").count() === 0, other);
      await shot("other-end-card");
    } catch (error) {
      const state = await readConversationState(page);
      const cardVisible = await ended.isVisible();
      throw new Error(`${label}: expected the end card for ${other}: ${JSON.stringify({ ...state, cardVisible })}`, { cause: error });
    }
    check(`${label}: no errors on the page`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
  console.log("surf-find: all checks passed");
} finally {
  await browser.close();
}
