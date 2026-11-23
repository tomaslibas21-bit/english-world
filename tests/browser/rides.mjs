// What one can drive, in the real game: a convertible taken from its people at the curb (they hop out and stand by),
// driven, braked and left; nobody talked to from the wheel; a closed parked car, its driver out of sight under its roof; the boat taken out, left for a swim, a dive and back up;
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
    // (what is said and what the wheels feel, counted from here on)
    await page.evaluate(() => {
      const h = window.__ew.game.rides.host, say = h.say, thud = h.thud;
      window.__said = []; window.__thuds = 0;
      h.say = (l, v, f, c) => { window.__said.push(v); say(l, v, f, c); };
      h.thud = (k) => { window.__thuds++; thud(k); };
    });
    await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "drive", null, { timeout: 5000 });
    if (phone) check("phone: the round button says what it does", (await page.locator(".act-btn").innerText()).length > 3, await page.locator(".act-btn").innerText());
    await press();
    await page.waitForFunction(() => { const g = window.__ew.game; return g.rides.riding && g.rides.phase === "on"; }, null, { timeout: 5000 });
    let s = await state();
    const owners = await page.evaluate(() => window.__ew.game.rides.riding.owners.map((o) => ({ state: o.state, d: +window.__ew.game.rides.reach(window.__ew.game.rides.riding, o.ch.root.position.x, o.ch.root.position.z).toFixed(2) })));
    check(`${label}: its people hopped out and stand beside it, the player is at the wheel`, s.ride === car.id && owners.every((o) => o.state !== "in" && o.d > 0.3), { s, owners });
    check(`${label}: in a convertible the driver sits in sight`, await page.evaluate(() => window.__ew.game.player.root.visible));
    const said = await page.evaluate(() => window.__said);
    check(`${label}: one of them says something, in a voice of their own`, said.length === 1 && /_ride_/.test(said[0]), said);
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
    // the brake in a turn at speed is the brake (16 Nov: no slide started by hand): it stops, pointing where it goes;
    // the phone's button stays STOP
    await page.evaluate(() => {
      const g = window.__ew.game, r = g.rides.riding;
      r.m.set(100, 76, -Math.PI / 2);
      window.__drift = { most: 0, was: false };
      window.__driftT = setInterval(() => { const m = g.rides.riding?.m; if (!m) return; if (m.pace > 3) window.__drift.most = Math.max(window.__drift.most, Math.abs(m.drifted)); window.__drift.was ||= m.drift; }, 16);
    });
    await go(true);
    await page.waitForFunction(() => window.__ew.game.rides.riding.m.speed > 9, null, { timeout: 6000 });
    if (phone) {
      check("phone: at speed the brake button is still STOP", (await page.locator(".brake-btn").innerText()).trim() === "STOP");
      await page.evaluate(() => { window.__ew.game.setJoystick(-1, 1); window.__ew.game.hold(true); });
      await page.waitForTimeout(1300);
      await page.evaluate(() => { window.__ew.game.hold(false); window.__ew.game.setJoystick(0, 0); });
    } else {
      await page.keyboard.down("a"); await page.keyboard.down("Space");
      await page.waitForTimeout(1300);
      await page.keyboard.up("Space"); await page.keyboard.up("a");
      await go(false);
    }
    const slid = await page.evaluate(() => { clearInterval(window.__driftT); const m = window.__ew.game.rides.riding.m; return { ...window.__drift, most: +window.__drift.most.toFixed(2), pace: +m.pace.toFixed(1) }; });
    check(`${label}: the brake in a turn at speed stops it: no slide, its course on its nose`, !slid.was && slid.most < 0.2 && slid.pace < 1.5, slid);
    // over a kerb: set down on a quiet street facing its sidewalk, it drives up onto it with a thud (a few places
    // tried: someone walking by may hold it up at one)
    let kerb = null;
    for (const z of [20, 56, 62, -30]) {
      await page.evaluate((z) => { const g = window.__ew.game, r = g.rides.riding; window.__thuds = 0; r.m.set(-70, z, -Math.PI / 2); }, z);
      await go(true);
      await page.waitForTimeout(1500);
      await go(false);
      kerb = await page.evaluate(() => { const g = window.__ew.game, r = g.rides.riding; return { x: +r.m.x.toFixed(2), z: +r.m.z.toFixed(2), thuds: window.__thuds, dry: g.rides.drivable.has(r.m.x, r.m.z) }; });
      await page.waitForTimeout(500);
      if (kerb.thuds >= 1 && kerb.x < -72.6) break;
    }
    check(`${label}: over the kerb onto the sidewalk, with a thud`, kerb.thuds >= 1 && kerb.x < -72.6 && kerb.dry, kerb);
    if (phone) { await page.evaluate(() => window.__ew.game.hold(true)); await page.waitForTimeout(700); await page.evaluate(() => window.__ew.game.hold(false)); }
    else { await page.keyboard.down("Space"); await page.waitForTimeout(700); await page.keyboard.up("Space"); }
    await press();
    await page.waitForFunction(() => !window.__ew.game.rides.riding, null, { timeout: 5000 });
    s = await state();
    const beside = await page.evaluate((id) => { const g = window.__ew.game, r = g.rides.list.find((q) => q.id === id), p = g.player.root.position; return +g.rides.reach(r, p.x, p.z).toFixed(2); }, car.id);
    check(`${label}: out, on foot beside it`, s.ride === null && s.y === 0 && beside > 0.3 && beside < 2.5, { s, beside });

    // ---- a closed car (a parked one of the car kit's): the driver is under its roof and out of sight (the roof would
    // cut through their head and backpack); they step to its door and in, and are in sight again the moment they step
    // out of it
    const closed = await page.evaluate(() => {
      const g = window.__ew.game, R = g.rides, r = [...R.modeCars.keys()].find((q) => q.parked && R.roofed(q));
      const h = r.m.heading, d = r.m.spec.wide + 0.7, x = r.m.x + Math.cos(h) * d, z = r.m.z - Math.sin(h) * d;
      g.keys.clear(); g.enterZone("town", { x, z, rot: h }, true); g.rig.yaw = h; g.rig.snap();
      return { id: r.id, model: r.model, visible: g.player.root.visible };
    });
    check(`${label}: on foot by a closed car, in sight`, closed.visible, closed);
    // (each frame from here on: in or out of it, and whether the figure is drawn and how far it is from the body)
    const sample = () => page.evaluate(() => {
      const g = window.__ew.game;
      window.__seen = [];
      window.__seenOn = true;
      const tick = () => {
        const r = g.rides.riding, p = g.player.root.position;
        if (r) window.__seen.push({ phase: g.rides.phase, shown: g.player.root.visible, d: +g.rides.reach(r, p.x, p.z).toFixed(2) });
        if (window.__seenOn) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const sampled = () => page.evaluate(() => { window.__seenOn = false; return window.__seen; });
    await page.waitForFunction((id) => window.__ew.store.getState().hud.prompt?.kind === "drive" && window.__ew.game.rides.near(window.__ew.game.player.root.position.x, window.__ew.game.player.root.position.z)?.id === id, closed.id, { timeout: 5000 });
    await sample();
    await press();
    await page.waitForFunction(() => { const g = window.__ew.game; return g.rides.riding && g.rides.phase === "on"; }, null, { timeout: 5000 });
    await page.waitForTimeout(400);
    let seen = await sampled();
    const stepIn = seen.filter((f) => f.phase === "in");
    check(`${label}: into the closed car: a step to its door in sight, never inside its body`, stepIn.length > 0 && stepIn.every((f) => !f.shown || f.d > 0), stepIn.slice(-4));
    check(`${label}: at its wheel the driver is out of sight`, seen.some((f) => f.phase === "on") && seen.filter((f) => f.phase === "on").every((f) => !f.shown), { model: closed.model, on: seen.filter((f) => f.phase === "on").length });
    await go(true);
    await page.waitForTimeout(1000);
    await go(false);
    if (phone) { await page.evaluate(() => window.__ew.game.hold(true)); await page.waitForTimeout(1200); await page.evaluate(() => window.__ew.game.hold(false)); }
    else { await page.keyboard.down("Space"); await page.waitForTimeout(1200); await page.keyboard.up("Space"); }
    s = await state();
    check(`${label}: driven, still out of sight`, s.ride === closed.id && Math.abs(s.v) < 0.3 && !(await page.evaluate(() => window.__ew.game.player.root.visible)), s);
    await sample();
    await press();
    await page.waitForFunction(() => !window.__ew.game.rides.riding, null, { timeout: 5000 });
    seen = await sampled();
    const stepOut = seen.filter((f) => f.phase === "out");
    check(`${label}: out of the closed car: in sight at once, at its door and beyond`, stepOut.length > 0 && stepOut.every((f) => f.shown && f.d > 0), stepOut.slice(0, 3));
    const outside = await page.evaluate((id) => { const g = window.__ew.game, r = g.rides.find(id), p = g.player.root.position; return { shown: g.player.root.visible, d: +g.rides.reach(r, p.x, p.z).toFixed(2), y: +p.y.toFixed(2) }; }, closed.id);
    check(`${label}: on foot beside the closed car, in sight`, outside.shown && outside.d > 0.3 && outside.d < 2.5 && outside.y < 0.1, outside);

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
    check(`${label}: from the water the bay's buoys are in the picture`, await page.evaluate(() => window.__ew.game.rides.buoys.visible));
    await page.waitForTimeout(1500);
    await press();
    await page.waitForFunction(() => !window.__ew.game.rides.riding && window.__ew.game.swimming, null, { timeout: 8000 });
    await page.waitForTimeout(900);
    s = await state();
    check(`${label}: over the side: swimming, the head above the water`, s.swim && s.hud === "swim" && s.y < -0.9 && s.y > -1.9, s);
    if (phone) await page.locator(".jump-btn").tap(); else await page.keyboard.press("Space");
    // (and the camera has followed the diver down: it eases after them)
    await page.waitForFunction(() => window.__ew.game.diveK > 0.95 && window.__ew.game.undersea.on && window.__ew.game.rig.cam.position.y < -0.45, null, { timeout: 6000 });
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
    check(`${label}: from the town the buoys are not drawn`, await page.evaluate(() => !window.__ew.game.rides.buoys.visible));
    check(`${label}: put down elsewhere: on foot, the boat back at its place`, s.ride === null && s.hud === null && home < 0.1, { s, home });
    check(`${label}: no page errors`, errors.length === 0, errors.slice(0, 5));
    await ctx.close();
  }
  console.log("rides: all checks passed");
} finally { await browser.close(); }
