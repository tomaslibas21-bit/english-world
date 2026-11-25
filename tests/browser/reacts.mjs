// See README-life.md for the local Vite server and browser profiles.
import assert from "node:assert/strict";
import { cardsFor, checkCardList, checkManualSave } from "./fixtures/phrase-saves.mjs";
import { assertTownProfile, contentUrl, contextOptions, helperLang, installTown, key, learnerLabel, lifeContentUrl, lineText, manualFrames, probeEffects, profileName, progress, screenshot, stubVoiceClips, targetLang, variety, viewports } from "./life-harness.mjs";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const url = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const durationMs = (text) => Math.max(2600, 1600 + 55 * Array.from(text).length);
const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  for (const [width, height] of viewports) {
    const touch = Math.min(width, height) < 600;
    const context = await browser.newContext(contextOptions(width, height));
    try {
      await context.addInitScript(installTown, { key, progress, manual: true, variety });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await stubVoiceClips(page);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await assertTownProfile(page, url);
      const { step, waitFor, during } = manualFrames(page);
      const savedReactions = [];
      const evidence = async (name) => {
        const frame = await page.evaluate(() => window.__lifeFrame);
        const edition = targetLang === "es" ? "PC" : "MH";
        await during(() => screenshot(page, `${edition}-${name}-F${frame}`, width, height));
      };
      await waitFor(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"), "town opens");
      await waitFor(() => page.evaluate(() => !window.__ew.store.getState().hud.zoneBanner), "zone banner clears");
      await probeEffects(page);
      const lines = await page.evaluate(async (url) => (await import(url)).REACT_LINES, lifeContentUrl(url, "reacts"));
      const state = () => page.evaluate(() => window.__ew.game.reactState());
      const place = (kind, exclude) => page.evaluate(([kind, exclude]) => window.__ew.game.placeForReaction(kind, exclude), [kind, exclude]);
      const force = (kind) => page.evaluate((kind) => window.__ew.game.react(kind, { force: true }), kind);
      const effectCount = () => page.evaluate(() => window.__lifeEffects.filter((name) => name === "horn" || name === "doubleHonk").length);
      const bubble = page.locator(".reaction-bubble");
      const translate = bubble.getByRole("button", { name: learnerLabel("Vertimas", "Translation"), exact: true });
      const save = bubble.locator("[data-phrase-save]");
      const press = (button) => during(() => touch ? button.tap() : button.click());
      const snapshot = () => page.evaluate(() => {
        const { game, store } = window.__ew;
        const { hud, conv } = store.getState();
        const { id, start, end } = game.reactions.active;
        return { id, start, end, schedule: game.reactState(), panel: hud.panel, talking: conv.active,
          position: game.player.root.position.toArray(), air: game.hop.air, pointer: game.pointer.down, keys: [...game.keys] };
      });
      const saveGeometry = () => save.evaluate((el) => {
        const r = el.getBoundingClientRect(), text = el.previousElementSibling, b = text.getBoundingClientRect();
        const hit = (node, box) => node.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
        return { width: r.width, height: r.height, left: el.offsetLeft, top: el.offsetTop, gap: r.left - b.right,
          separate: hit(el, r) && hit(text, b) && b.width >= 44 && b.height >= 44 };
      });
      const saveTwice = async (line, expanded) => {
        const start = await saveGeometry();
        assert(start.width === 44 && start.height === 44 && start.gap >= 4 && start.gap <= 8 && start.separate,
          `the translation and save have independent hit areas at ${width}x${height} (${JSON.stringify(start)})`);
        const card = await checkManualSave(page, save, touch, line.text, "street", snapshot);
        savedReactions.push(card);
        assert.deepEqual([card.lt, card.sentence, card.sourceLabel],
          [line.lt, { en: line.text, lt: line.lt }, learnerLabel("Išgirsta gatvėje", "Overheard")]);
        assert.deepEqual(await saveGeometry(), start, "the checked action keeps its hit box");
        assert.equal(await translate.getAttribute("aria-expanded"), String(expanded), "saving preserves disclosure");
        assert.equal(await bubble.locator(".reaction-copy > span").innerText(), line.text);
        if (!expanded) assert.equal(await bubble.locator("small").count(), 0);
      };
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
        const cards = await page.locator(".hud .objective-card, .hud .minimap, .hud .ride-menu, .hud .prompt:not(.touch)")
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
        assert(lines[kind].some((line) => lineText(line) === last.text && line.lt === last.lt),
          `${kind} uses the ${variety} line and its ${helperLang} meaning`);
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
          if (withOwner) {
            // Frame the driver's side so the learner and the seated speaker are visible together.
            g.rig.yaw = car.m.heading - Math.PI / 2;
            g.rig.snap();
          }
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
      let first;
      await waitFor(async () => { first = await place("honk"); return !!first; }, "a moving traffic car has a clear lane ahead");
      await waitFor(async () => await effectCount() === 1, "walking into the lane makes the car honk");
      assert.equal((await state()).count, 0, "the driver waits briefly after the horn");
      await waitFor(async () => (await state()).last?.kind === "honk", "the driver says a honk line", 25);
      const honk = await assertLine("honk");
      assert.equal(honk.speaker, `traffic:${first.carIndex}`);
      const honkStart = await reactionStart();
      await stepTo(honkStart + 75);
      await waitFor(() => bubble.isVisible(), "the honk bubble appears", 0);
      assert.equal(await bubble.locator(`[lang="${targetLang}"]`).innerText(), honk.text);
      await opacityIs(0.5);
      assert((await saveGeometry()).separate, "both controls have clean hit centres on the fade-in");
      await stepTo(honkStart + 150);
      await opacityIs(1);
      const helperLine = bubble.locator(`small[lang="${helperLang}"]`);
      assert.equal(await helperLine.innerText(), learnerLabel("Paliesk – pamatysi vertimą", "Tap to see the translation"));
      assert(await helperLine.isVisible(), "the first reaction shows how to reveal its meaning");
      await checkPlacement();
      const beforeTranslate = await snapshot();
      await press(translate);
      assert.deepEqual(await snapshot(), { ...beforeTranslate, end: beforeTranslate.end + 3 }, "translation alone extends the reading time");
      assert.equal(await helperLine.innerText(), honk.lt);
      assert.equal(await bubble.locator(`[lang="${targetLang}"]`).innerText(), honk.text);
      await step(1, 0);
      await checkPlacement();
      await saveTwice(honk, true);
      await during(() => screenshot(page, "react-translation", width, height));
      await evidence("react-save");
      await stepTo(honkStart + durationMs(honk.text) + 100);
      await opacityIs(1);
      await checkPlacement();
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
      await waitFor(() => page.evaluate((index) => window.__ew.game.ambient.traffic[index].speed < 1, first.carIndex),
        "the first car gives way");
      let second;
      await waitFor(async () => { second = await place("honk", first.carIndex); return !!second; }, "another moving traffic car is available");
      await waitFor(() => page.evaluate((index) => window.__ew.game.ambient.traffic[index].brakingForPlayer, second.carIndex), "the second car brakes for the player");
      await step(10);
      assert.equal((await state()).count, 1, "the cooldown suppresses the second honk reaction");
      assert.equal(await bubble.count(), 0);

      await step(1, 22000);
      assert(await place("bump"), "a passer-by stands within reach");
      await page.evaluate(() => window.__ew.game.setJoystick(0, 1));
      await waitFor(async () => (await state()).count === 2, "walking into the passer-by triggers a bump");
      await page.evaluate(() => window.__ew.game.setJoystick(0, 0));
      const bump = await assertLine("bump");
      await waitFor(() => bubble.isVisible(), "the bump shows a bubble");
      assert.equal(await helperLine.count(), 0, "subsequent reactions omit the hint");
      await saveTwice(bump, false);
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
        if (withOwner) {
          await step(8);
          await checkPlacement();
          await during(() => Math.min(width, height) < 600 ? translate.tap() : translate.click());
          assert.equal(await translate.getAttribute("aria-expanded"), "true");
          assert.equal(await bubble.locator(`[lang="${targetLang}"]`).innerText(), line.text);
          assert.equal(await helperLine.innerText(), line.lt);
          await step(1, 0);
          await checkPlacement();
          const { anchor, tail, textFits } = await bubble.evaluate((el) => {
            const { game, store } = window.__ew;
            const anchor = game.reactPosition(store.getState().hud.reaction.id);
            const box = el.getBoundingClientRect();
            const style = getComputedStyle(el, "::after");
            const below = el.hasAttribute("data-below");
            const height = parseFloat(below ? style.borderBottomWidth : style.borderTopWidth);
            const tail = { x: box.left + parseFloat(style.left), y: below ? box.top - height : box.bottom + height, height, below };
            const copy = el.querySelector(".reaction-copy");
            const bounds = copy.getBoundingClientRect();
            const textFits = [...copy.children].every((child) => {
              const range = document.createRange();
              range.selectNodeContents(child);
              const rects = [...range.getClientRects()];
              return rects.length > 0 && rects.every((r) => r.left >= bounds.left && r.right <= bounds.right && r.top >= bounds.top && r.bottom <= bounds.bottom);
            });
            return { anchor, tail, textFits };
          });
          assert(textFits, `both owner lines fit inside the bubble at ${width}×${height}`);
          assert(anchor && tail.height > 0 && Math.abs(tail.x - anchor.x) <= 1 &&
            (tail.below ? tail.y >= anchor.y - 1 : tail.y <= anchor.y + 1),
          `the tail points at the owner at ${width}×${height}: ${JSON.stringify({ tail, anchor })}`);
          await during(() => screenshot(page, "carroof-owner", width, height));
        }
        await step(1, 21000);
      }

      assert(await place("bump"), "a nearby walker is in view for the forced reactions");
      for (const kind of ["crash", "crashDriver", "boat", "swim"]) {
        if (targetLang === "es" && kind === "boat") {
          const count = (await state()).count;
          await step(1, 181000);
          await page.evaluate(() => window.__ew.game.placeOnFoot(64, -68, Math.PI));
          await waitFor(() => page.evaluate(() => window.__ew.game.nearest?.id === "lancha-beached-3"), "the beached lancha is in reach");
          await page.keyboard.press("e");
          await waitFor(async () => (await state()).count === count + 1, "boarding triggers a shore reaction");
        } else if (targetLang === "es" && kind === "swim") {
          const count = (await state()).count;
          await step(1, 181000);
          await page.evaluate(async (url) => {
            const { SHORE } = await import(url);
            const { game } = window.__ew;
            game.endRide();
            game.placeOnFoot(0, SHORE.limit - 12, Math.PI);
            game.setJoystick(0, 1);
          }, contentUrl(url, "game/water"));
          await waitFor(async () => (await state()).count === count + 1, "swimming out triggers a warning from the shore");
          await page.evaluate(() => window.__ew.game.setJoystick(0, 0));
        } else {
          assert(await force(kind), kind);
        }
        const line = await assertLine(kind);
        if (["carJump", "crash", "boat", "swim"].includes(kind)) {
          await waitFor(() => bubble.isVisible(), `the ${kind} bubble is visible`);
          assert.equal(await bubble.locator(".reaction-copy > span").innerText(), line.text);
        }
        if (targetLang === "es" && kind === "boat" && width === 1280 && height === 800) {
          await page.evaluate(() => {
            const { game } = window.__ew;
            const boat = game.rides.riding;
            game.endRide();
            game.rides.resetPosition(boat, boat.home);
            game.placeOnFoot(64, -68, Math.PI);
          });
          const prompt = page.locator(".hud .prompt").filter({ hasText: "Lancha" });
          await waitFor(() => prompt.isVisible(), "the Lancha prompt returns while the vendor is still speaking");
          const original = await page.evaluateHandle(() => window.__ew.game.reactPosition);
          await page.evaluate((original) => {
            window.__ew.game.reactPosition = (id) => {
              const p = original.call(window.__ew.game, id);
              return p && { ...p, x: innerWidth / 2, y: innerHeight };
            };
          }, original);
          await step(1, 0);
          await checkPlacement();
          await page.evaluate((original) => { window.__ew.game.reactPosition = original; }, original);
          await original.dispose();
        }
      }
      if (targetLang === "es") {
        await page.evaluate(() => window.__ew.game.placeOnFoot(28, -20, Math.PI));
        assert(await place("bump"), "a passer-by is in view again after swimming");
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

      if (targetLang === "es") {
        await step(1, 21000);
        for (const id of ["surf", "pool", "loteria", "billiards"]) {
          await waitFor(() => page.evaluate(() => !window.__ew.game.transitioning), "the town is ready for the next mode");
          const started = await page.evaluate((id) => {
            const { game } = window.__ew;
            if (id === "billiards") return game.debugBilliards().start();
            if (id === "pool") game.poolTeleport();
            return game.modes.start(id, id === "surf" ? "beginner" : undefined);
          }, id);
          assert(started, `starts ${id}`);
          await waitFor(() => page.evaluate((id) => window.__ew.store.getState().hud.modeScreen?.id === id, id), `${id} mode opens`);
          await assertSuppressed(`${id} blocks reactions`);
          await waitFor(() => page.evaluate(() => !window.__ew.game.transitioning), `${id} finishes entering`);
          await page.evaluate(() => window.__ew.game.modes.exit(true));
        }
        await waitFor(() => page.evaluate(() => !window.__ew.game.modes.engaged && !window.__ew.game.transitioning), "back in town after the last mode");
        await page.evaluate(() => window.__ew.game.placeOnFoot(-124, -61, Math.PI));
        assert.equal(await page.evaluate(() => window.__ew.game.zone.id), "town");
        await assertSuppressed("the outdoor ruins precinct blocks reactions");
        await page.evaluate(() => window.__ew.game.enterZone("gruta", undefined, true));
        await waitFor(() => page.evaluate(() => window.__ew.game.zone.id === "gruta" && !window.__ew.game.caveLoading), "the grotto opens");
        await assertSuppressed("the grotto blocks reactions");
      }
      await page.reload({ waitUntil: "domcontentloaded" });
      await waitFor(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"
        && !window.__ew.store.getState().hud.zoneBanner), "town returns after a real reload");
      for (const card of savedReactions) assert.deepEqual(await cardsFor(page, card.en), [card]);
      await checkCardList(page, { learner: helperLang, target: targetLang, cards: savedReactions, press });
      await evidence("react-post-reload-cards");
      assert.deepEqual(errors, []);
      console.log(`ok ${profileName} reactions ${width}×${height}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
