import assert from "node:assert/strict";

export const HARBOR_SPAWN = { zone: "town", x: -6.5, z: -64, rot: Math.PI };
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "m", lookId: "m1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 5, play: "town", quality: "low", scenes: false, volume: 0, cameraFollow: false },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: HARBOR_SPAWN, coach: { done: true, run: true },
};
export const HARBOR_PHONE_VIEW = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: "reduce" };

export async function openHarbor(context, url, storage) {
  const page = await context.newPage();
  await page.route("**/*.mp3", (route) => route.fulfill({ status: 204 }));
  await page.addInitScript(([key, data]) => {
    localStorage.setItem(key, data);
    sessionStorage.setItem("ew-play-now", "1");
  }, [storage + "-progress-v1", JSON.stringify(progress)]);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__ew?.store.getState().screen === "play" && window.__ew.game?.ledges?.ready,
    null, { timeout: 120000 });
  await page.evaluate(() => {
    window.__ew.coach?.finish?.();
    window.__ew.store.getState().setHud({ panel: null });
  });
  return page;
}

async function harborCalls(page) {
  await page.evaluate(() => window.__ew.game.enterZone("town", { x: 101, z: -65, rot: Math.PI }, true));
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  return page.evaluate(() => {
    const { game: g } = window.__ew;
    const island = g.islandScene?.group;
    const cam = g.rig.cam.clone();
    cam.position.set(102, 8.5, -63);
    cam.lookAt(102, 3.1, -89);
    cam.updateMatrixWorld(true);
    const render = () => {
      g.renderer.render(g.scene, cam);
      return g.renderer.info.render.calls;
    };
    const after = render();
    if (!island) return { after };
    island.visible = false;
    try { return { after, hidden: render() }; }
    finally { island.visible = true; }
  });
}

export async function originalHarborCalls(browser, baseline, storage) {
  if (!baseline) return undefined;
  const context = await browser.newContext(HARBOR_PHONE_VIEW);
  try {
    return (await harborCalls(await openHarbor(context, baseline, storage))).after;
  } finally {
    await context.close();
  }
}

export async function checkHarborCalls(page, originalCalls) {
  const { width, height } = page.viewportSize();
  const calls = await harborCalls(page);
  const delta = calls.after - calls.hidden;
  const comparison = originalCalls === undefined ? "baseline=unmatched" : `baseline=${originalCalls}`;
  console.log(`${width}x${height} fixed harbor camera quality=low draw calls, island hidden/visible ${calls.hidden}/${calls.after} (+${delta}) ${comparison}`);
  assert(delta > 0 && delta <= 6, JSON.stringify(calls));
  if (width === 390 && height === 844) assert(calls.after <= 32, JSON.stringify(calls));
}
