// What one can drive, in the real game: a convertible taken from its people at the curb (they hop out and stand by),
// driven, braked and left; nobody talked to from the wheel; the boat taken out, left for a swim, a dive and back up;
// the same from a phone's buttons. Against a dev server or a built game, either town:
// WORLD_TEST_URL=http://127.0.0.1:5188 WORLD_STORAGE=english-world WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/rides.mjs
import assert from "node:assert/strict";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5188";
const storage = process.env.WORLD_STORAGE || "english-world";
const check = (name, value, detail) => {
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name, detail === undefined ? "" : JSON.stringify(detail));
};
const progress = {
  version: 1,
  profile: { name: "Test", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 5, play: "town", quality: "low", scenes: false, volume: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: 28, z: -14.6, rot: Math.PI },
  coach: { done: true, run: true },
};
const LIMIT = -77.4; // water.ts SHORE.limit: as far as one wades

const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  for (const phone of [false, true]) {
    const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(([k, v]) => { localStorage.setItem(k, v); try { sessionStorage.setItem("ew-play-now", "1"); } catch {} }, [`${storage}-progress-v1`, JSON.stringify(progress)]);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__ew?.store?.getState().screen === "play" && window.__ew.game?.ledges?.ready, null, { timeout: 120000 });
    await page.evaluate(() => { window.__ew.coach?.finish?.(); window.__ew.store.getState().setHud({ panel: null }); });
    const label = phone ? "phone" : "computer";
    const state = () => page.evaluate(() => {
      const g = window.__ew.game, p = g.player.root.position, r = g.rides.riding, hud = window.__ew.store.getState().hud;
      return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), ride: r ? r.id : null, phase: r ? g.rides.phase : null, v: r ? +r.m.speed.toFixed(2) : 0, swim: g.swimming, dive: +g.diveK.toFixed(2), prompt: hud.prompt?.kind ?? null, hud: hud.ride };
    });
    const press = async () => { if (phone) await page.locator(".act-btn").tap(); else await page.keyboard.press("e"); };
    const go = async (on) => { if (phone) await page.evaluate((v) => window.__ew.game.setJoystick(0, v ? 1 : 0), on); else await page.keyboard[on ? "down" : "up"]("w"); };

    // ---- a convertible: beside its driver's door
    const car = await page.evaluate(() => {
      const g = window.__ew.game, r = g.rides.list.find((q) => q.kind === "car"), h = r.m.heading;
      const x = r.m.x + Math.cos(h) * 2.2, z = r.m.z - Math.sin(h) * 2.2;
      g.keys.clear(); g.enterZone("town", { x, z, rot: h }, true); g.rig.yaw = h; g.rig.snap();
      return { id: r.id, x: r.m.x, z: r.m.z, owners: r.owners.length, cars: g.rides.list.filter((q) => q.kind === "car").length };
    });
    check(`${label}: two or three convertibles, people in them`, car.cars >= 2 && car.cars <= 3 && car.owners >= 1, car);
    await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "drive", null, { timeout: 5000 });
    if (phone) check("phone: the round button says what it does", (await page.locator(".act-btn").innerText()).length > 3, await page.locator(".act-btn").innerText());
    await press();
    await page.waitForFunction(() => { const g = window.__ew.game; return g.rides.riding && g.rides.phase === "on"; }, null, { timeout: 5000 });
    let s = await state();
    const owners = await page.evaluate(() => window.__ew.game.rides.riding.owners.map((o) => ({ state: o.state, d: +window.__ew.game.rides.reach(window.__ew.game.rides.riding, o.ch.root.position.x, o.ch.root.position.z).toFixed(2) })));
    check(`${label}: its people hopped out and stand beside it, the player is at the wheel`, s.ride === car.id && owners.every((o) => o.state !== "in" && o.d > 0.3), { s, owners });
    await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "out", null, { timeout: 3000 });
    check(`${label}: from the wheel only the way out is offered`, (await state()).hud === "car");
    if (phone) check("phone: the jump button is the brake", await page.locator(".brake-btn").count() === 1);
    await go(true);
    await page.waitForTimeout(1800);
    s = await state();
    const onRoad = await page.evaluate(() => { const g = window.__ew.game, r = g.rides.riding; return g.rides.drivable.has(r.m.x, r.m.z); });
    check(`${label}: it drives, on the street`, s.v > 3 && Math.hypot(s.x - car.x, s.z - car.z) > 3 && onRoad, s);
    await go(false);
    if (phone) { await page.evaluate(() => window.__ew.game.hold(true)); await page.waitForTimeout(900); await page.evaluate(() => window.__ew.game.hold(false)); }
    else { await page.keyboard.down("Space"); await page.waitForTimeout(900); await page.keyboard.up("Space"); }
    s = await state();
    check(`${label}: the brake stops it`, Math.abs(s.v) < 0.3, s);
    await press();
    await page.waitForFunction(() => !window.__ew.game.rides.riding, null, { timeout: 5000 });
    s = await state();
    const beside = await page.evaluate((id) => { const g = window.__ew.game, r = g.rides.list.find((q) => q.id === id), p = g.player.root.position; return +g.rides.reach(r, p.x, p.z).toFixed(2); }, car.id);
    check(`${label}: out, on foot beside it`, s.ride === null && s.y === 0 && beside > 0.3 && beside < 2.5, { s, beside });

    // ---- the boat: from the pier's boards, or wading out to it
    const boat = await page.evaluate((LIMIT) => {
      const g = window.__ew.game, r = g.rides.list.find((q) => q.kind === "boat"), h = r.m.heading;
      let at = null;
      for (let a = 0; a < 6.3 && !at; a += 0.2) for (const d of [2.4, 2.9, 3.3]) {
        const x = r.m.x + Math.cos(a) * d, z = r.m.z + Math.sin(a) * d;
        if (g.town.walkableAt(x, z) && g.rides.near(x, z) === r) { at = { x, z }; break; }
      }
      at ??= { x: r.m.x - Math.sin(h) * 0.4, z: LIMIT + 0.25 };
      g.keys.clear(); g.enterZone("town", { x: at.x, z: at.z, rot: Math.PI }, true); g.rig.yaw = Math.PI; g.rig.snap();
      return { id: r.id, x: r.m.x, z: r.m.z, at };
    }, LIMIT);
    await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "boat", null, { timeout: 5000 });
    await press();
    await page.waitForFunction(() => { const g = window.__ew.game; return g.rides.riding?.kind === "boat" && g.rides.phase === "on"; }, null, { timeout: 5000 });
    await go(true);
    await page.waitForTimeout(3200);
    await go(false);
    s = await state();
    check(`${label}: the boat goes out on the water`, s.v > 2 && Math.hypot(s.x - boat.x, s.z - boat.z) > 5 && s.z < LIMIT, s);
    await page.waitForTimeout(1500);
    await press();
    await page.waitForFunction(() => !window.__ew.game.rides.riding && window.__ew.game.swimming, null, { timeout: 8000 });
    await page.waitForTimeout(900);
    s = await state();
    check(`${label}: over the side: swimming, the head above the water`, s.swim && s.hud === "swim" && s.y < -0.9 && s.y > -1.9, s);
    if (phone) await page.locator(".jump-btn").tap(); else await page.keyboard.press("Space");
    await page.waitForFunction(() => window.__ew.game.diveK > 0.95 && window.__ew.game.undersea.on, null, { timeout: 6000 });
    s = await state();
    const under = await page.evaluate(() => { const g = window.__ew.game; return { cam: +g.rig.cam.position.y.toFixed(2), seabed: g.undersea.group.visible, sky: g.sky.visible }; });
    check(`${label}: a dive: the camera under the water, the seabed in the picture`, s.hud === "dive" && under.cam < -0.4 && under.seabed && !under.sky, { s, under });
    if (phone) await page.locator(".jump-btn").tap(); else await page.keyboard.press("Space");
    await page.waitForFunction(() => window.__ew.game.diveK === 0 && !window.__ew.game.undersea.on && window.__ew.game.sky.visible, null, { timeout: 6000 });
    check(`${label}: and back up: the sky again`, (await state()).hud === "swim");
    // back into the boat from the water
    await page.evaluate((id) => { const g = window.__ew.game, r = g.rides.list.find((q) => q.id === id), h = r.m.heading; g.player.root.position.x = r.m.x + Math.cos(h) * 1.7; g.player.root.position.z = r.m.z - Math.sin(h) * 1.7; }, boat.id);
    await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "boat", null, { timeout: 5000 });
    await press();
    await page.waitForFunction(() => { const g = window.__ew.game; return g.rides.riding?.kind === "boat" && g.rides.phase === "on" && !g.swimming; }, null, { timeout: 5000 });
    check(`${label}: and into the boat again from the water`, true);
    // a door, a taxi, the list of conversations: on foot at once, and what was driven is back at its place
    await page.evaluate(() => { const g = window.__ew.game; g.enterZone("town", { x: 28, z: -14.6, rot: Math.PI }, true); });
    s = await state();
    const home = await page.evaluate((id) => { const g = window.__ew.game, r = g.rides.list.find((q) => q.id === id); return Math.hypot(r.m.x - r.home.x, r.m.z - r.home.z); }, boat.id);
    check(`${label}: put down elsewhere: on foot, the boat back at its place`, s.ride === null && s.hud === null && home < 0.1, { s, home });
    check(`${label}: no page errors`, errors.length === 0, errors.slice(0, 5));
    await ctx.close();
  }
  console.log("rides: all checks passed");
} finally { await browser.close(); }
