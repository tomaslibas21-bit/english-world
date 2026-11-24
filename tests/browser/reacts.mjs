// Run on the same local Vite server and Chromium setup as phone-rings.mjs.
import assert from "node:assert/strict";
import { contentUrl, contextOptions, installTown, key, manualFrames, probeEffects, progress, screenshot, stubVoiceClips, viewports } from "./life-harness.mjs";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const url = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const durationMs = (text) => Math.max(2600, 1600 + 55 * Array.from(text).length);
const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  for (const [width, height] of viewports) {
    // A separate context isolates cookies and storage as well as the page's reaction scheduler.
    const context = await browser.newContext(contextOptions(width, height));
    try {
      const save = { ...progress, started: Date.now() };
      await context.addInitScript(installTown, { key, progress: save, manual: true });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await stubVoiceClips(page);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const { step, waitFor, during } = manualFrames(page);
      await waitFor(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"), "town opens");
      await waitFor(() => page.evaluate(() => !window.__ew.store.getState().hud.zoneBanner), "zone banner clears");
      await probeEffects(page);
      const lines = await page.evaluate(async (url) => (await import(url)).REACT_LINES, contentUrl(url, "content/reacts"));
      const hint = await page.evaluate(async (url) => (await import(url)).STREET_WORDS.translation, contentUrl(url, "game/street/words"));
      const state = () => page.evaluate(() => window.__ew.game.reactState());
      assert.equal(await page.evaluate(() => window.__ew.store.getState().progress.started), save.started, "this viewport loaded its own save");
      assert.deepEqual(await state(), { last: null, count: 0, blockedUntil: 0 });
      const place = (kind) => page.evaluate((kind) => window.__ew.game.placeForReaction(kind), kind);
      const force = (kind) => page.evaluate((kind) => window.__ew.game.react(kind, { force: true }), kind);
      const effectCount = () => page.evaluate(() => window.__lifeEffects.filter((name) => name === "horn" || name === "doubleHonk").length);
      const bubble = page.locator(".reaction-bubble");
      const reactionStart = async () => ((await state()).blockedUntil - 20) * 1000;
      const stepTo = (ms) => page.evaluate((ms) => window.__lifeStep(1, Math.max(0, ms - performance.now())), ms);
      const opacityIs = async (expected) => {
        const actual = await bubble.evaluate((el) => Number(el.style.opacity));
        assert(Math.abs(actual - expected) < 0.02, `expected opacity ${expected}, got ${actual}`);
      };
      const checkPlacement = async (clamped = false) => {
        const box = await bubble.boundingBox();
        assert(box, "the bubble is visible");
        const below = await bubble.getAttribute("data-below") !== null;
        const top = box.y - (below ? 7 : 0), edge = box.y + box.height + (below ? 0 : 7);
        assert(box.x >= 11.9 && top >= 11.9 && box.x + box.width <= width - 11.9 && edge <= height - 11.9,
          `bubble and tail stay within ${width}×${height}: ${JSON.stringify(box)}`);
        const cards = await page.locator(".hud .objective-card, .hud .minimap, .hud .ride-menu")
          .evaluateAll((nodes) => nodes.map((node) => ({ name: node.className, rect: node.getBoundingClientRect().toJSON() })));
        assert(cards.some(({ name }) => name.includes("objective-card")), "the task card is present");
        for (const { name, rect } of cards) {
          assert(box.x + box.width <= rect.left || box.x >= rect.right || edge <= rect.top || top >= rect.bottom,
            `the bubble and tail are clear of ${name} at ${width}×${height}`);
        }
        let bottom = height;
        if (Math.min(width, height) < 600) {
          const controls = await page.locator(".hud .joy, .hud .jump-btn, .hud .act-btn, .hud .drive-horn, .hud .prompt.touch")
            .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect()).filter((r) => r.height).map((r) => r.top));
          assert(controls.length >= 2, "the joystick and jump button are both present");
          bottom = Math.min(...controls);
          assert(edge <= bottom - 11.9, "bubble and tail stay above the topmost touch control");
        }
        if (clamped) {
          assert(Math.abs(box.x + box.width - (width - 12)) < 0.1, "the projected bubble is clamped at the right edge");
          assert(Math.abs(edge - (bottom - 12)) < 0.1, "the projected bubble is clamped above the bottom edge or controls");
        }
      };
      const assertLine = async (kind) => {
        const last = (await state()).last;
        assert.equal(last?.kind, kind);
        assert(lines[kind].some((line) => line.en === last.text && line.lt === last.lt));
        return last;
      };
      const dropOntoCar = (withOwner) => page.evaluate((withOwner) => {
        const { game: g } = window.__ew;
        const candidates = withOwner ? g.rides.list : [...g.rides.modeCars.keys()].filter((car) => car.parked);
        for (const car of candidates) {
          if (car.kind !== "car") continue;
          const owner = car.owners.find((o) => o.state === "in");
          const walker = !withOwner && g.ambient.nearbyWalker(car.m.x, car.m.z, 14);
          const speaker = withOwner ? owner : walker;
          if (!speaker) continue;
          const tops = g.rides.townCarPieces(car.m.x, car.m.z).filter((piece) => g.rides.carUnder(piece) === car);
          const top = tops.sort((a, b) => b.top - a.top)[0];
          if (!top) continue;
          const x = (top.minX + top.maxX) / 2, z = (top.minZ + top.maxZ) / 2;
          if (g.ledges.supportPiece(x, z, top.top + 1, true) !== top || g.zone.colliders.blocked(x, z, 0.38, true)) continue;
          if (walker && walker.kind === "walk") walker.wait = Math.max(walker.wait, 2);
          const target = speaker.ch.root.position;
          g.setJoystick(0, 0);
          g.vel.set(0, 0, 0);
          g.placeOnFoot(x, z, Math.atan2(target.x - x, target.z - z));
          // Begin above the roof (or the convertible's body). The normal physics step resolves the fall and landing.
          g.hop.land(top.top + 1);
          g.hop.air = true;
          g.applyHop();
          return { id: car.id, top: top.top, speaker: owner ? `owner:${owner.who.id}` : null };
        }
        return null;
      }, withOwner);

      if (width === 390 && height === 664) {
        const expand = page.locator(".objective-card.collapsed .objective-summary");
        if (await expand.count()) await during(() => expand.tap());
      }
      await waitFor(async () => !!await place("honk"), "a moving traffic car has a clear lane ahead");
      await waitFor(async () => await effectCount() === 1, "walking into the lane makes the car honk");
      assert.equal((await state()).count, 0, "the driver waits briefly after the horn");
      await waitFor(async () => (await state()).last?.kind === "honk", "the driver says a honk line", 25);
      const honk = await assertLine("honk");
      const honkStart = await reactionStart();
      await stepTo(honkStart + 75);
      await waitFor(() => bubble.isVisible(), "the honk bubble appears", 0);
      assert.equal(await bubble.locator('[lang="en"]').innerText(), honk.text);
      await opacityIs(0.5);
      await stepTo(honkStart + 150);
      await opacityIs(1);
      assert.equal(await bubble.locator("small").innerText(), hint);
      if (width === 390 && height === 664) await checkPlacement();
      const translate = bubble.getByRole("button");
      await during(() => Math.min(width, height) < 600 ? translate.tap() : translate.click());
      assert.equal(await bubble.locator("small").innerText(), honk.lt);
      await stepTo(honkStart + durationMs(honk.text) + 100);
      await opacityIs(1);
      await checkPlacement();
      await during(() => screenshot(page, "react-translation", width, height));
      // Drive the real clamping code with a low projection even if this driver's bubble is naturally higher.
      await page.evaluate(() => {
        const { game } = window.__ew;
        const original = game.reactPosition;
        window.__restoreReactionPosition = () => { game.reactPosition = original; };
        window.__reactionTestAnchor = { x: innerWidth + 100, y: innerHeight + 100 };
        game.reactPosition = function (id) {
          const p = original.call(this, id);
          return p && { ...p, ...window.__reactionTestAnchor };
        };
      });
      await step(1, 0);
      await checkPlacement(true);
      if (width === 390 && height === 664) {
        const card = page.locator(".objective-card:not(.collapsed)");
        const box = await card.boundingBox();
        assert(box, "the short portrait phone has an expanded task card");
        await page.evaluate(({ x, y }) => { window.__reactionTestAnchor = { x, y }; },
          { x: box.x + box.width / 2, y: box.y + box.height - 8 });
        await step(1, 0);
        await checkPlacement();
        assert.equal(await bubble.getAttribute("data-below"), "", "a speaker under the task card gets a bubble below the anchor");
      }
      await page.evaluate(() => window.__restoreReactionPosition());

      const honkEnd = honkStart + durationMs(honk.text) + 3000;
      await stepTo(honkEnd - 125);
      await opacityIs(0.5);
      await stepTo(honkEnd + 5);
      assert.equal(await bubble.count(), 0);
      const first = Number(honk.speaker.split(":")[1]);
      const cooldownEnd = honkStart + 40000;
      const second = await page.evaluate(({ first, clearSpot, deadline }) => {
        const { game } = window.__ew, step = window.__lifeStep;
        const clearLane = () => game.placeOnFoot(clearSpot.x, clearSpot.z, clearSpot.rot);
        // Give the first car and anything queued behind it room to get moving again.
        clearLane();
        while (performance.now() + 500 < deadline) {
          step(10, 50);
          const spot = game.placeForReaction("honk", first) || game.placeForReaction("honk");
          if (!spot) continue;
          const car = game.ambient.traffic[spot.carIndex];
          const until = Math.min(deadline, performance.now() + 3000);
          while (performance.now() + 50 <= until) {
            step(1, 50);
            if (car.brakingForPlayer) return { car: car.index, at: performance.now() };
          }
          clearLane();
        }
        return null;
      }, { first, clearSpot: save.place, deadline: cooldownEnd - 500 });
      assert(second && second.at < cooldownEnd, "a moving car brakes again inside the honk cooldown");
      await step(10);
      assert.equal(await effectCount(), 1, `car ${second.car}'s stop adds no horn effect`);
      assert.equal((await state()).count, 1, "the cooldown suppresses the second honk reaction");
      assert.equal(await bubble.count(), 0);

      assert(await force("crashDriver"), "a nearby traffic car can speak after a crash");
      const crashDriver = await assertLine("crashDriver");
      const closed = await page.evaluate(async ({ module, honking, crashed }) => {
        const { carHasRoof } = await import(module);
        const { game } = window.__ew, traffic = game.ambient.traffic, car = traffic[crashed], p = game.player.root.position;
        game.placeOnFoot(p.x, p.z, Math.atan2(car.x - p.x, car.lane - p.z));
        return carHasRoof(traffic[honking].model) && carHasRoof(car.model);
      }, { module: contentUrl(url, "game/world/carModels"), honking: first, crashed: Number(crashDriver.speaker.split(":")[1]) });
      assert(closed, "the honk and crash speakers are both roofed traffic cars");
      await waitFor(() => bubble.isVisible(), "the roofed car projects its crashDriver bubble");
      assert.equal(await bubble.locator(".reaction-copy > span").innerText(), crashDriver.text);

      await step(1, 22000);
      const beforeBump = (await state()).count;
      assert(await place("bump"), "a passer-by stands within reach");
      await page.evaluate(() => window.__ew.game.setJoystick(0, 1));
      await waitFor(async () => (await state()).count === beforeBump + 1, "walking into the passer-by triggers a bump");
      await page.evaluate(() => window.__ew.game.setJoystick(0, 0));
      const bump = await assertLine("bump");
      await waitFor(() => bubble.isVisible(), "the bump shows a bubble");
      assert.equal(await bubble.locator("small").count(), 0, "later reactions omit the tap hint");
      const bumpEnd = await reactionStart() + durationMs(bump.text);
      await stepTo(bumpEnd - 125);
      await opacityIs(0.5);
      await stepTo(bumpEnd + 5);
      assert.equal(await bubble.count(), 0, "the untranslated bubble expires at its normal reading time");

      await waitFor(() => page.evaluate(() => window.__ew.game.ledges.ready), "town collision surfaces are ready");
      await step(1, 181000); // The witness to the parked-car landing can be the same walker as the bump.
      for (const withOwner of [false, true]) {
        const kind = withOwner ? "carJumpOwner" : "carJump";
        const count = (await state()).count;
        let target;
        await waitFor(async () => { target = await dropOntoCar(withOwner); return !!target; }, `a car is available for ${kind}`);
        assert.equal((await state()).count, count, "the reaction waits for the feet to land");
        if (withOwner) {
          await step();
          assert(await page.evaluate((id) => {
            const { game } = window.__ew, car = game.rides.find(id), p = game.player.root.position;
            return game.hop.air && Math.hypot(p.x - car.m.x, p.z - car.m.z) <= 8 && car.owners.some((o) => o.state === "in" && o.ch.root.visible);
          }, target.id), "the convertible's owner is visible and nearby before landing");
        }
        await waitFor(() => page.evaluate(() => !window.__ew.game.hop.air), `the learner lands for ${kind}`);
        const top = await page.evaluate(() => window.__ew.game.hop.y);
        assert(Math.abs(top - target.top) < 0.01, `expected to land on the car at ${target.top}, got ${top}`);
        assert.equal((await state()).count, count + 1);
        const line = await assertLine(kind);
        if (target.speaker) assert.equal(line.speaker, target.speaker);
        else assert.match(line.speaker, /^walker:/);
        await waitFor(() => bubble.isVisible(), `the real ${kind} landing shows a bubble`);
        await step(1, 21000);
      }

      assert(await place("bump"), "a nearby walker is in view for the forced reactions");
      for (const kind of ["crash", "boat", "swim"]) {
        assert(await force(kind), kind);
        const line = await assertLine(kind);
        await waitFor(() => bubble.isVisible(), `the ${kind} bubble is visible`);
        assert.equal(await bubble.locator(".reaction-copy > span").innerText(), line.text);
      }

      const assertSuppressed = async (label) => {
        const count = (await state()).count;
        assert.equal(await force("bump"), false, label);
        await step();
        assert.equal((await state()).count, count, label);
        assert.equal(await bubble.count(), 0, label);
        assert.equal(await page.evaluate(() => !!window.__ew.store.getState().hud.reaction), false, label);
      };
      await page.evaluate(() => window.__ew.store.getState().setHud({ panel: "phone" }));
      await waitFor(() => page.locator(".phone[role=dialog]").isVisible(), "the phone panel opens");
      await assertSuppressed("an open panel clears the bubble and blocks reactions");
      await page.evaluate(() => window.__ew.store.getState().setHud({ panel: null }));
      assert(await force("bump"), "a reaction can start after the panel closes");
      await waitFor(() => bubble.isVisible(), "the bubble is visible before the talk view opens");
      await page.evaluate(() => {
        const { game, store } = window.__ew;
        if (store.getState().conv.active) throw new Error("the talk camera guard must be checked independently of conversations");
        game.rig.mode = "talk";
      });
      await assertSuppressed("the talk view clears the bubble and blocks reactions even without a conversation");
      await page.evaluate(() => { window.__ew.game.rig.mode = "follow"; });

      await page.evaluate(() => {
        const { game } = window.__ew;
        game.call(game.orderedSituations().find((s) => s.mode === "phone" || s.location === "phone").id);
      });
      await waitFor(() => page.evaluate(() => window.__ew.store.getState().conv.active), "a real conversation opens");
      await assertSuppressed("an active conversation blocks reactions");
      await page.evaluate(() => window.__ew.game.closeConversation());
      await waitFor(() => page.evaluate(() => !window.__ew.store.getState().conv.active), "conversation closes");
      assert.equal(await force("bump"), false, "protected quiet time after conversation");
      assert.deepEqual(errors, []);
      console.log(`ok reactions ${width}×${height}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
