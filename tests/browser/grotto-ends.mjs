// VITE_EDITION=es EDITION=es on the server. Run with WORLD_TEST_URL and optionally
// WORLD_PLAYWRIGHT_MODULE, then node tests/browser/grotto-ends.mjs [--shots=<dir>].
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import path from "node:path";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8176";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const shots = process.argv.find((arg) => arg.startsWith("--shots="))?.slice(8);
if (shots) mkdirSync(shots, { recursive: true });

const start = { zone: "town", x: -101, z: -7.4, rot: -Math.PI / 2 };
const progress = {
  version: 1,
  profile: { name: "Test", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 5, play: "town", quality: "low", scenes: false, volume: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: start, coach: { done: true, run: true },
};

async function timeoutState(page) {
  if (!page) return null;
  const read = page.evaluate(() => {
    const g = window.__ew?.game, st = window.__ew?.store.getState();
    const p = g?.player?.root.position;
    const target = g?.zone && p ? g.objectiveTarget() : null;
    const action = (target) => target && [target.kind, target.id].filter(Boolean).join(":");
    return {
      screen: st?.screen, zone: g?.zoneId,
      at: p && [+p.x.toFixed(2), +p.z.toFixed(2)], t: g?.t?.toFixed(1),
      task: st?.hud.objective?.sitId, guide: g?.caveGuideMode, target: action(target),
      auto: action(g?.autoTarget), legs: g?.autoPath?.length ?? 0, walking: st?.hud.walking,
      fade: st?.hud.fade, panel: st?.hud.panel, conv: st?.conv.active ? st.conv.sitId : null,
    };
  }).catch(() => null);
  let timer;
  try {
    return await Promise.race([read, new Promise((resolve) => { timer = setTimeout(resolve, 2000, null); })]);
  } finally {
    clearTimeout(timer);
  }
}

const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  for (const [label, width, height] of [["computer", 1280, 800], ["phone", 390, 844], ["short-phone", 390, 664]]) {
    const phone = width === 390;
    const withGame = async (scenario, save, check) => {
      const ctx = await browser.newContext({
        viewport: { width, height }, ...(phone ? { deviceScaleFactor: 2, isMobile: true, hasTouch: true } : {}),
      });
      let page;
      try {
        await ctx.route(/\.mp3(?:\?|$)/, (request) => request.fulfill({ status: 204, body: "", headers: { "access-control-allow-origin": "*" } }));
        page = await ctx.newPage();
        const errors = [];
        page.on("pageerror", (err) => errors.push(err.message));
        await page.addInitScript(([key, value]) => {
          sessionStorage.setItem("ew-play-now", "1");
          localStorage.setItem(key, value);
        }, [`${storage}-progress-v1`, JSON.stringify(save)]);
        await page.goto(base, { waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => window.__ew?.store.getState().screen === "play" && window.__ew.game?.ledges?.ready, null, { timeout: 120000 });
        await page.evaluate(() => {
          window.__ew.coach?.finish?.();
          window.__ew.store.getState().setHud({ panel: null });
        });
        await check(page);
        assert.deepEqual(errors, [], `${label}: page errors`);
      } catch (error) {
        if (error.name === "TimeoutError") {
          console.error(`${label} ${scenario} timeout ${JSON.stringify(await timeoutState(page) ?? {})}`);
        }
        throw error;
      } finally {
        await ctx.close();
      }
    };
    const press = (locator) => phone ? locator.tap() : locator.click();
    const shot = (locator, name) => shots && locator.screenshot({ path: path.join(shots, `${name}-${label}.png`) });
    const resume = (page) => page.evaluate(() => window.__ew.game.renderer.setAnimationLoop(window.__ew.game.loop));
    const mapState = (page) => page.locator(".minimap canvas").evaluate((canvas) => ({
      map: canvas.dataset.map,
      player: canvas.dataset.player.split(",").map(Number),
      gates: Number(canvas.dataset.gates),
    }));
    const walk = async (page, x, z) => {
      await page.evaluate(([x, z]) => window.__ew.game.walkTo(x, z, { kind: "point" }), [x, z]);
      await page.waitForFunction(([x, z]) => {
        const g = window.__ew.game, p = g.player.root.position;
        return !g.autoPath && Math.hypot(p.x - x, p.z - z) < 0.65;
      }, [x, z], { timeout: 25000 });
    };
    const pose = (page, id) => page.evaluate((id) => {
      const g = window.__ew.game, n = g.npcs.find((n) => n.id === id), p = g.player.root.position;
      const wanted = Math.atan2(p.x - n.home.x, p.z - n.home.z);
      const yaw = n.ch.root.rotation.y;
      return {
        yaw,
        facingError: Math.abs(Math.atan2(Math.sin(wanted - yaw), Math.cos(wanted - yaw))),
        body: n.ch.body.position.y,
        lift: n.ch.lift,
        calls: g.renderer.info.render.calls,
      };
    }, id);

    await withGame("Kin and La Grieta", progress, async (page) => {
      await press(page.locator(".minimap"));
      await press(page.getByRole("button", { name: "Gruta de los Aluxes", exact: true }));
      const kin = page.locator(".sit-list > div").filter({ has: page.locator('[data-sit="x02-alux-kin"]') });
      await press(kin.locator(".sit-actions .btn.ghost"));
      await page.waitForFunction(() => {
        const { game: g, store } = window.__ew;
        const p = g.player.root.position, target = g.objectiveTarget(), o = store.getState().hud.objective;
        return g.zoneId === "town" && Math.hypot(p.x + 101, p.z + 7.4) < 0.5 &&
          target?.kind === "cave-entry" && target.id === "grieta" && o?.angle != null;
      });
      // Click the regular objective button, then observe actual movement before the transition.
      await press(page.locator('.objective-card .btn[title="G"]'));
      await page.waitForFunction(() => {
        const { game: g } = window.__ew, p = g.player.root.position;
        const map = document.querySelector(".minimap canvas");
        if (g.zoneId !== "town" || p.x > -127 || g.swimming || map?.dataset.map !== "cenote" || !g.guidance.dots.count) return false;
        g.renderer.setAnimationLoop(null);
        return true;
      }, null, { timeout: 50000 });
      const outside = await mapState(page);
      assert.equal(outside.map, "cenote");
      assert(outside.player.every((value) => Math.abs(value - 0.5) < 0.01));
      await shot(page.locator(".minimap"), "cenote-minimap");
      await shot(page, "la-grieta-arrow");
      await press(page.locator(".minimap"));
      await page.locator('.map-canvas canvas[data-map="cenote"]').waitFor();
      const bigMapPlayer = await page.locator(".map-me").evaluate((dot) => [parseFloat(dot.style.left), parseFloat(dot.style.top)]);
      assert(bigMapPlayer.every((value) => value > 0 && value < 100));
      await page.evaluate(() => window.__ew.store.getState().setHud({ panel: null }));
      await resume(page);

      await page.waitForFunction(() => {
        const { game: g, store } = window.__ew, p = g.player.root.position;
        const conv = store.getState().conv;
        return g.zoneId === "gruta" && g.caveVia === "grieta" && conv.active && conv.sitId === "x02-alux-kin" &&
          Math.hypot(p.x - 1.9, p.z + 4.3) < 2.9;
      }, null, { timeout: 50000 });
      assert.equal((await pose(page, "alux_kin")).lift, 0);
      await page.evaluate(() => window.__ew.game.closeConversation());
      await page.waitForFunction(() => document.querySelector(".minimap canvas")?.dataset.map === "gruta");
      const inside = await mapState(page);
      assert(inside.player.every((value) => value > 0 && value < 1));
      assert.equal(inside.gates, 0);
      await shot(page.locator(".minimap"), "grotto-minimap");

      await walk(page, -2, -3.2);
      await page.waitForFunction(() => {
        const { game: g } = window.__ew, n = g.npcs.find((n) => n.id === "alux_kin"), p = g.player.root.position;
        const wanted = Math.atan2(p.x - n.home.x, p.z - n.home.z);
        return Math.cos(wanted - n.ch.root.rotation.y) > 0.98;
      });
      const before = await pose(page, "alux_kin");
      await walk(page, 0.9, 0.25);
      await page.waitForFunction(() => {
        const { game: g } = window.__ew, n = g.npcs.find((n) => n.id === "alux_kin"), p = g.player.root.position;
        const wanted = Math.atan2(p.x - n.home.x, p.z - n.home.z);
        if (n.ch.lift < 0.16 || Math.cos(wanted - n.ch.root.rotation.y) < 0.98) return false;
        g.renderer.setAnimationLoop(null);
        return true;
      }, null, { timeout: 35000 });
      const hop = await pose(page, "alux_kin");
      assert(Math.abs(hop.yaw - before.yaw) > 0.45 && hop.facingError < 0.25);
      assert(hop.body - before.body > 0.1 && hop.calls < 40);
      if (phone) {
        const layout = await page.locator(".cave-card").evaluate((card) => {
          const tip = document.querySelector(".town-toasts .tip")?.getBoundingClientRect();
          const box = card.getBoundingClientRect();
          return { cardHeight: box.height, cardBottom: box.bottom, tipTop: tip?.top, tipBottom: tip?.bottom };
        });
        assert(layout.cardHeight <= 48, "The chamber summary fits in one tappable row");
        if (layout.tipTop !== undefined) {
          assert(layout.tipTop >= layout.cardBottom && layout.tipBottom <= height / 2, "The tip fits between the card and the middle of the scene");
        }
      }
      await shot(page, "kin-mid-hop");
      await resume(page);

      // Select a regular task from inside. Its arrow points to the dry exit and the walk resumes in town.
      await page.evaluate(() => window.__ew.game.setObjective("s69-local"));
      await page.waitForFunction(() => window.__ew.game.objectiveTarget()?.id === "grieta");
      if (phone) {
        const toggle = page.locator(".cave-card .collapse-btn");
        assert.equal(await toggle.getAttribute("aria-expanded"), "false");
        assert.equal(await page.locator('.cave-guide button[data-guide="cave"]').isVisible(), false);
        await press(toggle);
        assert.equal(await toggle.getAttribute("aria-expanded"), "true");
      }
      assert.match(await page.locator(".cave-guide").filter({ has: page.locator('[data-guide="cave"]') }).innerText(), /Kin/);
      await press(page.locator('.cave-guide button[data-guide="objective"]'));
      await page.waitForFunction(() => {
        const g = window.__ew.game;
        return g.autoTarget?.kind === "exit" && g.autoTarget.id === "grieta" && g.autoPath?.length;
      }, null, { timeout: 5000 });
      await page.waitForFunction(() => {
        const g = window.__ew.game, p = g.player.root.position;
        // La Grieta exits south of the cenote, on dry ground.
        return g.zoneId === "town" && p.x < -139 && p.z > 0 && !g.swimming;
      }, null, { timeout: 20000 });
      await page.waitForFunction(() => {
        const g = window.__ew.game;
        return g.zoneId === "town" && g.player.root.position.x > -116 && g.autoPath?.length;
      }, null, { timeout: 60000 });
    });

    // A saved visit on the north bank, with the two earlier rooms completed and Nikté's gate still shut.
    const save = {
      ...progress, place: { zone: "gruta", x: -6.5, z: -93.5, rot: Math.PI },
      cave: { passed: ["kin"], lit: ["agua-1", "agua-2", "agua-3", "raices-1", "raices-2", "raices-3"], seen: true },
    };
    await withGame("Nikté", save, async (page) => {
      await page.waitForFunction(() => document.querySelector(".minimap canvas")?.dataset.map === "gruta");
      assert.equal((await mapState(page)).gates, 7);
      const before = await pose(page, "alux_nikte");
      await walk(page, -7, -97);
      await page.waitForFunction(() => {
        const g = window.__ew.game, n = g.npcs.find((n) => n.id === "alux_nikte");
        if (n.ch.lift <= 0.1 || !n.ch.steady) return false;
        g.renderer.setAnimationLoop(null);
        return true;
      }, null, { timeout: 35000 });
      const hop = await pose(page, "alux_nikte");
      assert(Math.abs(hop.yaw - before.yaw) > 0.35 && hop.facingError < 0.35);
      assert(hop.body - before.body > 0.06);
    });
    console.log("ok", label);
  }
} finally {
  await browser.close();
}
