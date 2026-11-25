// Run on each PC learner's local dev server with WORLD_STORAGE=puerto-colibri and WORLD_LEARNER=en or lt.
import assert from "node:assert/strict";
import { activatePhraseControl, cardsFor, checkManualSave } from "./fixtures/phrase-saves.mjs";
import { assertTownProfile, contextOptions, helperLang, installTown, key, learnerLabel, lifeContentUrl,
  manualFrames, profileName, progress, screenshot, stubVoiceClips } from "./life-harness.mjs";

assert.equal(key, "puerto-colibri-progress-v1", "run the PC speech case against a matching PC dev server");
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const url = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const viewports = process.env.WORLD_PHONE_WIDTH || process.env.WORLD_PHONE_HEIGHT
  ? [[Number(process.env.WORLD_PHONE_WIDTH || 390), Number(process.env.WORLD_PHONE_HEIGHT || 844)]]
  : [[390, 844], [1280, 800]];
const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true,
  args: process.platform === "darwin" ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"]
    : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

try {
  for (const [width, height] of viewports) {
    const touch = Math.min(width, height) <= 520;
    const context = await browser.newContext({ ...contextOptions(width, height), reducedMotion: "reduce" });
    try {
      // The tianguis vendors are part of the high-quality town's ambient cast.
      const settings = { ...progress.settings, quality: "high", volume: 0, sounds: 0 };
      await context.addInitScript(installTown, { key, progress: { ...progress, settings }, manual: true, variety: "default" });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await stubVoiceClips(page);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await assertTownProfile(page, url);
      const { step, waitFor, during } = manualFrames(page);
      const ready = () => page.evaluate(() => {
        const world = window.__ew;
        return world?.store.getState().screen === "play" && world.game?.ledges?.ready && !world.store.getState().hud.zoneBanner;
      });
      await waitFor(ready, "the town and its collision surfaces are ready");
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const ambient = await page.evaluate(async (path) => {
        const { AMBIENT_LINES, VENDOR_LINES, STAFF_LINES } = await import(path);
        return { walkers: AMBIENT_LINES, vendors: VENDOR_LINES, staff: STAFF_LINES };
      }, lifeContentUrl(url, "ambient"));
      const owners = await page.evaluate(async (path) => (await import(path)).RIDE_OWNERS, lifeContentUrl(url, "rides"));
      assert.deepEqual([ambient.walkers.length, ambient.vendors.length, Object.keys(ambient.staff).length], [7, 2, 0]);

      const townToast = page.locator(".town-toasts .toast");
      const stackedToast = page.locator(".toasts:not(.town-toasts) .toast");
      const notice = () => page.evaluate(() => window.__ew.store.getState().townToasts[0]);
      const saved = [];
      const clear = () => page.evaluate(() => {
        const { toasts, townToasts, dismissToast } = window.__ew.store.getState();
        for (const toast of [...toasts, ...townToasts.map(({ toast }) => toast)]) dismissToast(toast.id);
      });
      const click = (point) => touch ? page.touchscreen.tap(point.x, point.y) : page.mouse.click(point.x, point.y);
      const press = (button) => during(() => touch ? button.tap() : button.click());
      const snapshot = () => page.evaluate(() => {
        const { game, store } = window.__ew, { hud, conv, townToasts, toasts } = store.getState();
        return { panel: hud.panel, talking: conv.active, position: game.player.root.position.toArray(),
          pointer: game.pointer, air: game.hop.air, keys: [...game.keys], riding: game.rides.riding?.id,
          phase: game.rides.phase, progress: store.getState().progress, townToasts, toasts };
      });

      async function saveSpeech(name, phrase, display) {
        await waitFor(() => display.isVisible(), `${name} renders as a bilingual toast`, 0);
        const title = display.locator(".t-text b");
        const helper = display.locator(".t-text p");
        assert((await title.textContent()).includes(phrase.en), "the title contains the spoken target");
        assert.equal(await title.getAttribute("lang"), "es");
        assert.equal(await helper.getAttribute("lang"), helperLang);
        assert.equal(await helper.textContent(), phrase.lt);
        assert.equal(await display.locator(".x").count(), 1);
        const button = display.locator("[data-phrase-save]");
        const box = () => button.evaluate((el) => {
          const r = el.getBoundingClientRect(), dismiss = el.nextElementSibling;
          const x = dismiss.getBoundingClientRect();
          return { width: r.width, height: r.height, gutter: x.left - r.right,
            target: dismiss.contains(document.elementFromPoint(x.left + x.width / 2, x.top + x.height / 2)) };
        });
        const before = await box();
        assert(before.target && before.width === 44 && before.height === 44 && before.gutter >= 4 && before.gutter <= 8,
          `the speech save and dismiss have distinct hit areas (${JSON.stringify(before)})`);
        const card = await checkManualSave(page, button, touch, phrase.en, "street", snapshot);
        if (!touch) {
          const input = await snapshot();
          await activatePhraseControl(page, button, false, "Space");
          assert.deepEqual(await snapshot(), input, "Space on the checked toast save does not interact, jump or brake");
        }
        assert.deepEqual([card.lt, card.sentence, card.sourceLabel],
          [phrase.lt, phrase, learnerLabel("Išgirsta gatvėje", "Overheard")]);
        assert.deepEqual(await box(), before);
        saved.push(card);
        await during(() => screenshot(page, `speech-toast-${name}`, width, height));
        console.log(`${profileName} ${width}x${height} ${name} ${JSON.stringify(phrase)}`);
        // Use the original dismiss button even after the repeated save.
        await press(display.locator(".x"));
        assert(!(await display.isVisible()), "dismiss still closes the spoken toast");
      }

      // Find a visible mesh with the game's camera and the same walker ray, then deliver real canvas input.
      const walkerId = await page.evaluate(() => {
        const { game } = window.__ew;
        const player = game.player.root.position;
        return game.ambient.walkers.map((w, index) => ({ w, index }))
          .filter(({ w }) => w.kind === "walk" && !w.vendor)
          .sort((a, b) => a.w.ch.root.position.distanceTo(player) - b.w.ch.root.position.distanceTo(player))
          .map(({ index }) => index);
      });
      const placeForWalker = (index, angle) => page.evaluate(({ index, angle }) => {
        const { game } = window.__ew, p = game.ambient.walkers[index].ch.root.position;
        game.placeOnFoot(p.x + 4.5 * Math.sin(angle), p.z + 4.5 * Math.cos(angle), angle + Math.PI);
      }, { index, angle });
      const personHit = (index, vendor) => page.evaluate(({ index, vendor }) => {
        const { game } = window.__ew;
        const walker = vendor ? game.ambient.walkers.find((w) => w.vendor && Math.abs(w.ch.root.position.x - 32) < 0.1)
          : game.ambient.walkers[index];
        if (!walker) return null;
        const cam = game.rig.cam, canvas = game.renderer.domElement;
        const rect = canvas.getBoundingClientRect(), roots = game.ambient.walkerRoots;
        for (const height of [0.75, 0.66, 0.9, 0.55]) {
          const p = walker.ch.root.position.clone();
          p.y += walker.ch.height * height;
          p.project(cam);
          if (p.z >= 1) continue;
          const x = Math.round(rect.left + (1 + p.x) * rect.width / 2);
          const y = Math.round(rect.top + (1 - p.y) * rect.height / 2);
          if (document.elementFromPoint(x, y) !== canvas) continue;
          p.set((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2, 0);
          game.raycaster.setFromCamera(p, cam);
          const [hit] = game.raycaster.intersectObjects(roots, true);
          if (hit && hit.distance < 40 && game.ambient.walkerFor(hit.object) === walker) return { x, y };
        }
        return null;
      }, { index, vendor });

      let point;
      for (const index of walkerId.slice(0, 12)) {
        for (const angle of [Math.PI, Math.PI / 2, 0, -Math.PI / 2]) {
          await placeForWalker(index, angle);
          await step(2, 16);
          point = await personHit(index, false);
          if (point) break;
        }
        if (point) break;
      }
      assert(point, "a walking passer-by has a real canvas hit centre");
      await clear();
      await click(point);
      const walker = await notice();
      assert(ambient.walkers.some(({ en, lt }) => en === walker?.toast.phrase?.en && lt === walker.toast.phrase.lt));
      assert.equal(walker.remaining, 4500);
      assert.equal(walker.toast.ms, undefined);
      await saveSpeech("walker", walker.toast.phrase, townToast);

      // The two tianguis lines go through the same real click route, using the catalog position for selection.
      await page.evaluate(() => window.__ew.game.placeOnFoot(32, -41.6, Math.PI));
      await step(10, 16);
      for (const [index, phrase] of ambient.vendors.entries()) {
        await clear();
        point = await personHit(-1, true);
        assert(point, "the tianguis vendor behind the pottery stall is hit-testable");
        await page.evaluate((roll) => {
          const canvas = window.__ew.game.renderer.domElement;
          canvas.addEventListener("pointerup", () => {
            const random = Math.random;
            Math.random = () => roll;
            setTimeout(() => { Math.random = random; }, 0);
          }, { once: true, capture: true });
        }, (index + 0.5) / ambient.vendors.length);
        await click(point);
        assert.deepEqual((await notice())?.toast.phrase, phrase);
        // Also exercise the general stack with the very same speech notice when a town panel opens.
        if (index === 0) {
          await page.evaluate(() => window.__ew.store.getState().setHud({ panel: "map" }));
          await saveSpeech("vendor-stack", phrase, stackedToast);
          await page.evaluate(() => window.__ew.store.getState().setHud({ panel: null }));
          await step(2, 0);
        } else await saveSpeech("vendor-town", phrase, townToast);
      }

      await clear();
      const ride = await page.evaluate(() => {
        const { game } = window.__ew;
        const r = game.rides.list.find((r) => r.kind === "car" && r.owners.some((o) => o.state === "in"));
        const h = r.m.heading;
        game.placeOnFoot(r.m.x + Math.cos(h) * 2.2, r.m.z - Math.sin(h) * 2.2, h);
        return r.id;
      });
      await waitFor(() => page.evaluate(() => window.__ew.store.getState().hud.prompt?.kind === "drive"), "the occupied convertible offers a drive");
      if (touch) await press(page.locator(".act-btn"));
      else await page.keyboard.press("e");
      const owner = await notice();
      assert.equal(owner?.toast.ms, 3200, "the ride owner's saysAloud notice has its original timeout");
      assert.equal(owner.remaining, 3200);
      assert(owners[ride].some(({ take }) => take.some(({ en, lt }) => en === owner.toast.phrase?.en && lt === owner.toast.phrase.lt)),
        "an actual boarding owner selects the saysAloud pair from their catalog");
      assert.notEqual(owner.toast.phrase.en, walker.toast.phrase.en);
      await saveSpeech("ride-owner", owner.toast.phrase, townToast);

      await clear();
      await page.evaluate(() => window.__ew.game.autoWalkToObjective());
      const ordinary = await notice();
      assert(ordinary && !ordinary.toast.phrase, "the guide's get-out-first notice carries no speech pair");
      assert.equal(await townToast.locator("[data-phrase-save]").count(), 0);
      assert.equal(await townToast.locator(".x").count(), 1);
      await press(townToast.locator(".x"));
      await page.reload({ waitUntil: "domcontentloaded" });
      await waitFor(ready, "the saved town opens again");
      for (const card of saved) assert.deepEqual(await cardsFor(page, card.en), [card], "the raw pair survives reload with its source");
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
