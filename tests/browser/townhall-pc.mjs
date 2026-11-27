// Use an installed Playwright and an SME or SM build with VITE_CARDS_TARGET=fluentsteps.
// WORLD_BASELINE=1 takes matched street measurements on a build of plans8/pc.
import assert from "node:assert/strict";
import { openTown, shot } from "./screen-harness.mjs";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({
  executablePath: process.env.WORLD_CHROMIUM,
  args: process.env.WORLD_SOFTWARE_GL === "1" ? ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] : [],
});
const sm = process.env.WORLD_LEARNER === "lt";
const baseline = process.env.WORLD_BASELINE === "1";
const helper = sm ? "Atversti pasą" : "Open passport";
const mission = (sm ? "/situacijos/" : "/situations/") + "SS11";
const chapter = (sm ? "/knygos/" : "/books/") + "BK01-01";
const passport = ".passport";
const prompt = ".hud .prompt";

async function measure(page) {
  return page.evaluate(async () => {
    const { renderer, zone, rig } = window.__ew.game;
    const textures = new Set();
    let meshes = 0, triangles = 0;
    zone.group.traverse(o => {
      if (!o.isMesh) return;
      meshes++;
      triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
      for (const m of [].concat(o.material)) for (const value of Object.values(m)) if (value?.isTexture) textures.add(value);
    });
    const next = () => new Promise(done => requestAnimationFrame(done));
    const frames = [];
    let last = await next();
    for (let i = 0; i < 30; i++) {
      const time = await next();
      frames.push(time - last);
      last = time;
    }
    frames.sort((a, b) => a - b);
    return {
      calls: renderer.info.render.calls, drawnTriangles: renderer.info.render.triangles,
      meshes, triangles, textures: textures.size, cameraY: +rig.cam.position.y.toFixed(2),
      dpr: renderer.getPixelRatio(), p95ms: +frames[Math.ceil(frames.length * .95) - 1].toFixed(1),
    };
  });
}

async function connectPad(page) {
  await page.evaluate(() => {
    const pad = { id: "Passport review controller", mapping: "standard", index: 0, connected: true, timestamp: 0,
      axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })) };
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [pad] });
    window.dispatchEvent(Object.assign(new Event("gamepadconnected"), { gamepad: pad }));
    const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
    window.tapPassportPad = async i => {
      Object.assign(pad.buttons[i], { pressed: true, value: 1, touched: true }); pad.timestamp++;
      await frames();
      Object.assign(pad.buttons[i], { pressed: false, value: 0, touched: false }); pad.timestamp++;
      await frames();
    };
  });
  await page.waitForFunction(() => window.__pad?.connected);
}

async function check(page, width, height, touch) {
  const size = width + "x" + height;
  assert.equal(await page.evaluate(() => document.documentElement.lang), sm ? "lt" : "en");
  await page.evaluate(() => {
    const g = window.__ew.game;
    g.setObjective("s72-cafe");
    g.enterZone("town", { x: 90, z: 43.6, rot: 0 }, true);
    const r = g.rig;
    r.stage = { pos: r.target.clone().set(83, 5.4, 31), look: r.target.clone().set(90, 3.7, 51), rate: 1000, fov: 55 };
    r.mode = "stage";
  });
  await page.waitForFunction(() => !window.__ew.game.transitioning && window.__ew.game.zone.id === "town");
  await page.waitForTimeout(2200);
  console.log(size, "street", JSON.stringify(await measure(page)));
  if (baseline) return;
  await shot(page, size + "-hidalgo");

  assert.equal(await page.evaluate(() => performance.getEntriesByType("resource").filter(e =>
    /\/(?:songs|knygos)\/index\.json|\/Passport-/.test(new URL(e.name).pathname)).length), 0);
  await page.evaluate(() => {
    const g = window.__ew.game;
    g.rig.mode = "follow";
    g.rig.stage = null;
    g.rig.snap();
    g.guideToPlace("town-hall");
  });
  await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.label.includes("Palacio Municipal"));
  if (touch) await page.locator(prompt).tap();
  else await page.keyboard.press("e");
  await page.waitForFunction(() => !window.__ew.game.transitioning && window.__ew.game.zone.id === "town-hall");
  await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "passport");
  assert.equal(await page.locator(prompt + " small").innerText(), helper);
  await page.waitForFunction(() => {
    const { rig } = window.__ew.game, camera = rig.cam;
    const project = (x, y, z) => rig.target.clone().set(x, y, z).project(camera);
    const left = project(-.85, 1.16, -.94), right = project(.31, 1.16, -.94);
    const pad = project(.63, 1.14, -1.11), stamp = project(.70, 1.41, -1.52);
    return camera.position.y < 4.2 && [left, right, pad, stamp].every(p => Math.abs(p.x) < .95 && Math.abs(p.y) < .75)
      && (right.x - left.x) * innerWidth / 2 >= 75
      && Math.hypot((pad.x - stamp.x) * innerWidth / 2, (pad.y - stamp.y) * innerHeight / 2) > 17;
  });
  console.log(size, "hall", JSON.stringify(await measure(page)));
  await shot(page, size + "-doorway");

  await page.route("**/songs/index.json", route => route.fulfill({ json: { songs: [
    { id: "SG01", t: "La cumbia del panadero", tl: sm ? "Kepėjo kumbija" : "The Baker’s Cumbia", a: "/songs/audio/SG01.mp3" },
  ] } }));
  await page.route("**/knygos/index.json", route => route.fulfill({ json: { books: [
    { id: "BK01", title: "Cuentos de la selva", title_lt: sm ? "Džiunglių pasakos" : "Jungle Tales",
      chapters: [{ id: "BK01-00", title: "Cuentos de la selva" }, { id: "BK01-01", title: "La tortuga gigante" }] },
  ] } }));
  for (const path of [mission, chapter, "/songs/SG01"]) {
    await page.context().route("**" + path, route => route.fulfill({ body: "Course fixture " + path, contentType: "text/plain" }));
  }
  await page.evaluate(() => {
    window.__ew.store.getState().updateProgress(p => {
      const completed = { completions: 1, visits: 1, used: [], twists: [], memory: {} };
      p.sits["s72-cafe"] = completed;
      p.sits["x10-loteria"] = completed;
    });
    localStorage.setItem("fluentsteps.course.v1", JSON.stringify({ version: 1, items: {
      "songs:SG01": { heard: 100 }, "books:BK01-01": { heard: 200, read: 250 },
    } }));
  });
  const open = async () => {
    if (touch) await page.locator(prompt).tap(); else await page.keyboard.press("e");
    await page.locator(passport).waitFor();
  };
  await open();
  assert.equal(await page.locator(".passport-proof").count(), 0, "old evidence opens dry");
  assert.equal(await page.locator(".passport h2 [lang=es]").innerText(), "Mi pasaporte del pueblo");
  assert.equal(await page.locator(".passport h2 small").innerText(), sm ? "Mano miesto pasas" : "My town passport");
  assert(await page.locator(".passport-cell").count() <= 8);
  const to = async section => {
    const picker = page.locator(".passport-picker");
    if (await picker.isVisible()) await picker.selectOption(section);
    else await page.locator(".passport-sections nav button").filter({ hasText: section }).click();
  };
  const follow = async path => {
    const link = page.locator(".passport-link");
    assert.equal(await link.getAttribute("href"), path);
    const popupReady = page.waitForEvent("popup");
    await link.click();
    const popup = await popupReady;
    await popup.waitForLoadState();
    assert.equal(new URL(popup.url()).pathname, path);
    await popup.close();
    assert(await page.locator(".passport-proof").isVisible(), "return preserves the open leaf");
    await page.keyboard.press("Escape");
  };
  const stamp = id => page.locator('[data-stamp="' + id + '"]');
  await stamp("situations:s72-cafe").click();
  assert.match(await page.locator(".passport-proof").innerText(), /Conversaciones terminadas · 1/);
  await shot(page, size + "-cafe");
  await follow(mission);
  await to("keepsakes");
  await stamp("keepsakes:loteria_card").click();
  assert.equal(await page.locator(".passport-proof h3 small").innerText(), sm ? "Loterijos korta" : "Lotería card");
  await shot(page, size + "-loteria");
  await page.keyboard.press("Escape");
  assert(await stamp("keepsakes:loteria_card").evaluate(el => el === document.activeElement));
  await to("songs");
  await stamp("songs:SG01").click();
  await follow("/songs/SG01");
  await to("books");
  await stamp("books:BK01-01").click();
  assert.match(await page.locator(".passport-proof").innerText(), /Capítulos terminados · 1\/2/);
  await follow(chapter);
  await page.keyboard.press("Escape");
  await page.locator(passport).waitFor({ state: "detached" });
  assert(await page.locator(prompt).evaluate(el => el === document.activeElement));

  if (touch) {
    await page.evaluate(() => window.__ew.store.getState().updateProgress(p => {
      p.sits["s70-museum"] = { completions: 1, visits: 1, used: [], twists: [], memory: {} };
    }));
    await connectPad(page);
    const tap = i => page.evaluate(i => window.tapPassportPad(i), i);
    await tap(2); // X opens the counter.
    await page.waitForSelector(".passport[data-detail=true] .printing");
    await page.waitForSelector(".passport-pad-dock [data-pad-slot]");
    await tap(1); // B returns to the index.
    assert(await stamp("situations:s70-museum").evaluate(el => el === document.activeElement));
    await tap(15); // D-pad right, A reads the neighboring stamp.
    await tap(0);
    await page.waitForSelector(".passport[data-detail=true]");
    await tap(1);
    await tap(1);
    await page.locator(passport).waitFor({ state: "detached" });

    // The same completion also earned this place and keepsake. Each can press once
    // on a later visit, and Escape returns through its index before closing the book.
    for (const id of ["places:museum", "keepsakes:ticket"]) {
      await open();
      await page.waitForSelector(".passport[data-detail=true] .printing");
      await page.keyboard.press("Escape");
      assert(await stamp(id).evaluate(el => el === document.activeElement));
      await page.keyboard.press("Escape");
      await page.locator(passport).waitFor({ state: "detached" });
    }
  }

  const resources = () => page.evaluate(() => {
    const { geometries, textures } = window.__ew.game.renderer.info.memory;
    return { geometries, textures };
  });
  const first = await resources();
  for (let i = 0; i < 10; i++) {
    await open();
    await page.keyboard.press("Escape");
    await page.locator(passport).waitFor({ state: "detached" });
  }
  assert.deepEqual(await resources(), first);
  console.log(size, "ten visits", JSON.stringify(first));
}

try {
  for (const [width, height] of [[390, 844], [1280, 800]]) {
    const touch = width === 390;
    const { page, context } = await openTown(browser, width, height, touch);
    try {
      await check(page, width, height, touch);
    } catch (error) {
      console.error(await page.evaluate(() => ({
        focus: document.activeElement?.outerHTML.slice(0, 160),
        panel: window.__ew?.store.getState().hud.panel,
        passport: document.querySelector(".passport")?.dataset.detail,
      })).catch(() => null));
      await shot(page, width + "x" + height + "-failure").catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
