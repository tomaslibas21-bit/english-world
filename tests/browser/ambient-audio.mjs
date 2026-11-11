// Real audio rendering plus town lifecycle coverage. Run against local Vite development:
// WORLD_TEST_URL=http://127.0.0.1:5193 WORLD_BROWSER_CHANNEL=chrome WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/ambient-audio.mjs
import assert from "node:assert/strict";
const { chromium, webkit } = await import(
  process.env.WORLD_PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5188";

for (const [name, engine] of [
  ["Chromium", chromium],
  ["WebKit", webkit],
]) {
  const browser = await engine.launch({
    headless: true,
    ...(name === "Chromium"
      ? {
          channel: process.env.WORLD_BROWSER_CHANNEL || undefined,
          args: ["--enable-unsafe-swiftshader"],
        }
      : {}),
  });
  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(15000);
    await page.route("**/ambient-audio-harness.html", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Audio check</title>",
      }),
    );
    await page.goto(`${base}/ambient-audio-harness.html`);
    const rendered = await page.evaluate(async () => {
      const { AudioSystem, audio: shared } = await import("/src/game/audio.ts");
      const results = [];
      for (const cancel of [
        "none",
        "disabled",
        "hidden",
        "pagehide",
        "unmount",
        "light-mode",
      ]) {
        const offline = new OfflineAudioContext(1, 48000 * 7, 48000);
        let now = 0,
          buffers = 0;
        const ctx = new Proxy(offline, {
          get(target, key) {
            if (key === "state") return "running";
            if (key === "currentTime") return now;
            if (key === "createBufferSource")
              return () => {
                buffers++;
                return target.createBufferSource();
              };
            const value = Reflect.get(target, key, target);
            return typeof value === "function" ? value.bind(target) : value;
          },
        });
        const audio = cancel === "light-mode" ? shared : new AudioSystem();
        audio.ctx = ctx;
        const unbind = audio.bindGestures();
        const environment = { sea: 1, gulls: true, birds: 1, cafe: true };
        audio.ambience(true, environment);
        now = 5;
        audio.ambience(true, environment);
        const sounds = audio.ambientSounds.size;
        if (cancel === "disabled") audio.ambience(false, environment);
        if (cancel === "hidden") {
          Object.defineProperty(document, "hidden", {
            configurable: true,
            value: true,
          });
          document.dispatchEvent(new Event("visibilitychange"));
          delete document.hidden;
        }
        if (cancel === "pagehide") window.dispatchEvent(new Event("pagehide"));
        if (cancel === "unmount") unbind();
        if (cancel === "light-mode") {
          const { LightGame } = await import("/src/game/LightGame.ts");
          const game = new LightGame();
          game.init();
          game.dispose();
        }
        const remaining = audio.ambientSounds.size;
        const buffer = await Promise.race([
          offline.startRendering(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error(`Rendering timed out: ${cancel}`)),
              10000,
            ),
          ),
        ]);
        const samples = buffer.getChannelData(0);
        let energy = 0,
          tail = 0;
        for (const sample of samples) energy += sample * sample;
        for (const sample of samples.subarray(48000 * 6.5))
          tail += sample * sample;
        results.push({ cancel, buffers, sounds, remaining, energy, tail });
        unbind();
      }
      return results;
    });
    for (const result of rendered) {
      assert.equal(
        result.buffers,
        0,
        `${name}/${result.cancel}: no continuous noise buffers`,
      );
      assert(
        result.sounds > 0,
        `${name}/${result.cancel}: keep identifiable short sounds`,
      );
      assert.equal(
        result.tail,
        0,
        `${name}/${result.cancel}: no sustained audio tail`,
      );
      if (result.cancel === "none")
        assert(result.energy > 0, `${name}: the short effects really render`);
      else {
        assert.equal(
          result.remaining,
          0,
          `${name}/${result.cancel}: release all ambient ownership`,
        );
        assert.equal(
          result.energy,
          0,
          `${name}/${result.cancel}: canceled sounds produce digital silence`,
        );
      }
    }
    console.log(
      `${name}: real rendered effects end cleanly; disabled/background/unmount/mode-switch output is silent`,
    );
    await page.close();

    if (name === "Chromium") {
      const town = await browser.newPage({
        viewport: { width: 640, height: 480 },
      });
      town.on("pageerror", (error) =>
        console.log(`Town error: ${error.message}`),
      );
      await town.addInitScript(() => {
        localStorage.setItem(
          "english-world-progress-v1",
          JSON.stringify({
            version: 1,
            profile: {
              name: "Test",
              surname: "",
              gender: "m",
              lookId: "m1",
              look: {
                skin: "#f2d3bd",
                hair: { style: "short", color: "#5a3a25" },
                top: "#2a9d8f",
                bottom: "#264653",
              },
            },
            settings: { play: "town", quality: "low", v: 5 },
            place: { zone: "town", x: 0, z: 0, rot: 0 },
            sits: {},
            phrases: {},
            seenIntro: {},
            started: Date.now(),
          }),
        );
        sessionStorage.setItem("ew-play-now", "1");
      });
      await town.goto(base, { waitUntil: "domcontentloaded" });
      await town.waitForFunction(
        () => window.__ew?.store.getState().screen === "play",
        undefined,
        { timeout: 30000 },
      );
      await town.evaluate(async () => {
        const { audio } = await import("/src/game/audio.ts");
        const button = document.createElement("button");
        button.id = "audio-check-start";
        button.textContent = "Start audio check";
        button.style.cssText = "position:fixed;inset:0;z-index:99999";
        button.onclick = () => audio.sfx("pop");
        document.body.appendChild(button);
      });
      await town.locator("#audio-check-start").click();
      const stopped = await town.evaluate(async () => {
        const { audio } = await import("/src/game/audio.ts");
        const { game, store } = window.__ew;
        const ctx = audio.ctx;
        if (ctx?.state !== "running")
          throw new Error("A real click must start the effects context");
        store.getState().setHud({ panel: null });
        const trigger = () => {
          audio.amb = { nextGull: -1, nextBird: -1, nextClink: -1 };
          audio.ambience(true, { sea: 1, gulls: true, birds: 1, cafe: true });
          if (!audio.ambientSounds.size)
            throw new Error("No sounds were scheduled");
        };
        const results = {};
        trigger();
        store.getState().setHud({ panel: "settings" });
        results.panel = audio.ambientSounds.size;
        store.getState().setHud({ panel: null });
        trigger();
        store.getState().setConv({ active: true });
        results.conversation = audio.ambientSounds.size;
        store.getState().setConv({ active: false });
        trigger();
        game.dispose();
        results.disposed = audio.ambientSounds.size;
        results.unsubscribed = game.unbindAmbience === null;
        await ctx.close();
        return results;
      });
      assert.deepEqual(stopped, {
        panel: 0,
        conversation: 0,
        disposed: 0,
        unsubscribed: true,
      });
      console.log(
        "Chromium: actual town panel/conversation/disposal cancels scheduled sounds synchronously",
      );
      await town.close();
    }
  } finally {
    await browser.close();
  }
}
