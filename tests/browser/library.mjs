// Claude runs this against a configured local Maple build. Covers come from the read-only course checkout.
// WORLD_SHOTS receives <viewport>-<state>.png. WORLD_LIBRARY_ART_ROOT can select another local /art/s folder.
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = new URL(process.env.WORLD_TEST_URL || "http://127.0.0.1:8700");
const storage = process.env.WORLD_STORAGE || "english-world";
const shots = process.env.WORLD_SHOTS;
const artRoot = process.env.WORLD_LIBRARY_ART_ROOT || join(homedir(), "fluent-steps/public/art/s");
const index = await readFile(resolve(artRoot, "../../knygos/index.json"));
const sizes = [[390, 844], [844, 390], [1280, 800]];
const repeats = 10;
const chairs = [{ x: 2.7, z: -1.6, rot: -0.82 }, { x: 4.1, z: 1.1, rot: -1.95 }];
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", volume: 0, sounds: 0, scenes: false,
    phoneCalls: false, textMessages: false, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1,
  place: { zone: "town", x: 45, z: 46.8, rot: 0 },
  coach: { done: true, run: true, view: true, seen: { list: true, walk: true } },
};
if (shots) await mkdir(shots, { recursive: true });
const failures = [];
const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  for (const [width, height] of sizes) {
    const label = `${width}x${height}`, phone = width === 390 || height === 390;
    const context = await browser.newContext({
      viewport: { width, height }, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 2 : 1,
      reducedMotion: width === 1280 ? "reduce" : "no-preference",
    });
    try {
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== base.origin) return route.abort();
        if (url.pathname === "/knygos/index.json")
          return route.fulfill({ status: 200, contentType: "application/json", body: index });
        const cover = /^\/art\/s\/books\/(BOOK-[A-Z]+\.[a-f0-9]{8}\.(?:160|320)\.webp)$/.exec(url.pathname);
        if (cover) {
          try { return await route.fulfill({ contentType: "image/webp", body: await readFile(join(artRoot, "books", cover[1])) }); }
          catch { return route.fulfill({ status: 404, body: "" }); }
        }
        if (/\.mp3$/.test(url.pathname)) return route.fulfill({ status: 204, body: "" });
        return route.continue();
      });
      await context.addInitScript(([key, save]) => {
        localStorage.setItem(key, JSON.stringify(save));
        sessionStorage.setItem("ew-play-now", "1");
        window.SpeechRecognition = window.webkitSpeechRecognition = undefined;
        let seed = 20261126;
        Math.random = () => (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
      }, [`${storage}-progress-v1`, {
        ...progress, profile: { ...progress.profile, look: { ...progress.profile.look, height: width === 390 ? 0.9 : 1.1 } },
      }]);
      const page = await context.newPage(), errors = [], metrics = [], viewportChecks = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(base.href, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.__ew?.game?.zoneId === "town" && !window.__ew.store.getState().hud.fade,
        null, { timeout: 180_000 });
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const doors = await page.evaluate(() => window.__ew.game.doors.filter((d) => d.loc === "library"));
      assert.equal(doors.length, 1, "Enable the Maple shelf configuration before running the library review");
      const [door] = doors;
      assert.deepEqual([door.x, door.z], [22, 49]);
      await page.evaluate(() => {
        window.__libraryActions = [];
        const g = window.__ew.game;
        // The world action remains installed. These stand in for the shelf/reader on the UI branch.
        g.onLibraryShelf = () => window.__libraryActions.push(["browse", null]);
        g.onLibraryReader = (chairIndex) => window.__libraryActions.push(["sit", chairIndex]);
        // Track resources actually submitted to WebGL and remove them on disposal. Retain duplicate names
        // so an orphaned atlas, jacket or page block from a previous visit fails the ownership check.
        const live = new Map();
        const track = (kind, resource, name) => {
          if (!resource || live.has(resource.uuid)) return;
          live.set(resource.uuid, { kind, name });
          const disposed = () => {
            live.delete(resource.uuid);
            resource.removeEventListener("dispose", disposed);
          };
          resource.addEventListener("dispose", disposed);
        };
        const geometryName = (object, geometry) => {
          if (geometry.name) return geometry.name;
          const path = [];
          for (let node = object; node; node = node.parent) {
            const npc = g.npcs.find((n) => n.ch.root === node);
            if (npc) return `town-npc/${npc.id}/${geometry.type}`;
            path.unshift(node.name || `${node.type}[${node.parent?.children.indexOf(node) ?? 0}]`);
          }
          return path.join("/");
        };
        const prototype = Object.getPrototypeOf(Object.getPrototypeOf(g.zone.group));
        const afterRender = prototype.onAfterRender;
        prototype.onAfterRender = function(renderer, scene, camera, geometry, material, group) {
          afterRender.call(this, renderer, scene, camera, geometry, material, group);
          if (!geometry) return;
          const name = geometryName(this, geometry);
          track("geometries", geometry, name);
          if (name.startsWith("library-")) {
            track("materials", material, material.name);
            if (material.map) track("textures", material.map, material.map.name);
          }
        };
        window.__libraryResources = () => {
          const result = { library: { geometries: [], materials: [], textures: [] }, townGeometryNames: [] };
          for (const { kind, name } of live.values()) {
            if (name.startsWith("library-")) result.library[kind].push(name);
            else if (kind === "geometries") result.townGeometryNames.push(name);
          }
          for (const names of [...Object.values(result.library), result.townGeometryNames]) names.sort();
          return result;
        };
      });
      const waitZone = (id) => page.waitForFunction((zone) => {
        const { game, store } = window.__ew;
        return game.zoneId === zone && !game.transitioning && !store.getState().hud.fade;
      }, id, { timeout: 30_000 });
      const arrive = async (x, z) => {
        try {
          await page.waitForFunction(([x, z]) => {
            const g = window.__ew.game, p = g.player.root.position;
            // Game completes paths within 0.35 m. Leave a small margin for the next rendered frame.
            return !g.autoPath?.length && Math.hypot(p.x - x, p.z - z) < 0.4;
          }, [x, z], { timeout: 30_000 });
        } catch (error) {
          const state = await page.evaluate(([x, z]) => {
            const g = window.__ew.game, p = g.player.root.position;
            return {
              playerPosition: p.toArray(), remainingAutoPath: g.autoPath, target: { x, z },
              autoTarget: g.autoTarget, distance: Math.hypot(p.x - x, p.z - z), zone: g.zoneId,
            };
          }, [x, z]);
          throw new Error(`${label} arrival failed ${JSON.stringify(state)}`, { cause: error });
        }
      };
      const walk = async (x, z, facing) => {
        await page.evaluate(([x, z, rot]) => window.__ew.game.walkTo(x, z,
          { kind: "point", rot, alignCamera: rot !== undefined }), [x, z, facing]);
        await arrive(x, z);
      };
      const artReady = () => page.waitForFunction(() =>
        window.__ew.game.zone.group.getObjectByName("library-jackets")?.userData.bookIds.length > 0,
      null, { timeout: 15_000 });
      const settle = () => page.waitForTimeout(1200);
      const sample = () => page.evaluate(() => {
        const g = window.__ew.game, info = g.renderer.info;
        return { calls: info.render.calls, triangles: info.render.triangles, ...info.memory, ...window.__libraryResources() };
      });
      const capture = async (state) => {
        await settle();
        const { townGeometryNames, ...reading } = await sample();
        try {
          if (["street", "doorstep", "display", "chair", "seated", "stood-up", "exit"].includes(state)) {
            const task = page.locator(".objective-card.collapsed.library-task .objective-summary");
            assert.equal(await task.count(), 1, "The library folds the unrelated task to one icon");
            assert((await task.getAttribute("aria-label"))?.length > 0, "The icon retains the accessible task name");
            assert.equal(await task.getAttribute("aria-expanded"), "false");
            const box = await task.boundingBox();
            assert(box && Math.abs(box.width - 44) < 0.5 && Math.abs(box.height - 44) < 0.5, "A 44 px task button");
            assert.equal(await task.locator(".objective-title, .objective-meta").count(), 0);
          }
          if (phone && ["street", "doorstep", "exit"].includes(state)) {
            const doorPrompt = page.locator(".prompt.touch.library-door-prompt");
            assert.equal(await doorPrompt.count(), 1, "One library door action in the lower-right slot");
            assert.equal(await doorPrompt.getAttribute("lang"), "lt");
            assert.equal(await doorPrompt.locator(".prompt-text").innerText(), state === "doorstep" ? "Išeiti į lauką" : "Įeiti į biblioteką");
            assert.equal(await page.locator(".act-btn").count(), 0, "No duplicate door button");
            const box = await doorPrompt.boundingBox();
            assert(box && box.width <= 144.5 && box.height >= 52, "The library door action fits its touch slot");
          }
          if (["doorstep", "display", "chair", "stood-up"].includes(state)) {
            assert(reading.calls <= 50, `${label} ${state} draw calls ${reading.calls}`);
            assert.equal(await page.locator(".objective-card.collapsed").count(), 1, "The unrelated task starts folded");
            assert.equal(await page.locator(".objective-summary .dist").count(), 0, "The summary omits exit-distance metres");
            assert(await page.evaluate(() => {
              const g = window.__ew.game;
              return !g.guidance.beam.visible && !g.guidance.gem.visible
                && g.guidance.ring.scale.x === 0.72 && g.guidance.ring.material.opacity === 0.4
                && (!g.rig.cam.view || g.rig.cam.view.offsetY === 0);
            }), "The library has a floor exit ring and a vertically centered view");
            if (width === 390) assert(await page.evaluate(() => {
              const g = window.__ew.game, x = g.player.root.position.x;
              return g.rig.interiorView.portrait.halfWidth === 4.7
                && Math.abs(g.rig.presentedLook.x - Math.max(-1.8, Math.min(1.8, x))) < 0.25;
            }), "The upright view follows the reader within the ±1.8 m range");
          }
          if (state === "seated") {
            assert(reading.calls <= 50, `${label} seated draw calls ${reading.calls}`);
            assert(await page.evaluate(() => {
              const g = window.__ew.game, phones = g.player.root.getObjectByName("library-headphones");
              const head = g.player.headJoint.getWorldPosition(g.player.root.position.clone());
              const clip = head.project(g.rig.cam);
              return g.libraryChair === 0 && g.player.anim === "sit" && g.player.root.visible
                && phones?.parent === g.player.headJoint && phones.children.length === 0
                && g.rig.mode === "stage" && !g.guidance.group.visible
                && Math.abs(clip.x) < 0.9 && Math.abs(clip.y) < 0.9
                && (!g.rig.cam.view || g.rig.cam.view.offsetY === 0);
            }), "The side view contains the visible avatar and its one headphone mesh");
            assert.equal(reading.library.geometries.filter((name) => name === "library-headphones").length, 1);
          }
          if (phone && ["display", "chair", "seated"].includes(state)) {
            const prompt = page.locator(".prompt.touch.library-prompt");
            assert.equal(await prompt.count(), 1);
            assert.equal(await prompt.locator("small[lang=lt]").count(), 1);
            assert.equal(await page.locator(".act-btn").count(), 0, "One bilingual touch action");
          }
        } catch (error) {
          viewportChecks.push(new Error(`${label} ${state} visual check failed`, { cause: error }));
        }
        metrics.push({ state, ...reading });
        if (shots) await page.screenshot({ path: join(shots, `${label}-${state}.png`) });
      };
      const activate = async (label) => {
        const prompt = page.locator(".prompt").filter({ hasText: label });
        await prompt.waitFor();
        if (phone) await prompt.tap();
        else {
          await page.locator("canvas").first().evaluate((canvas) => canvas.focus());
          await page.keyboard.press("e");
        }
      };
      const enter = async (reviewArrival = false) => {
        await walk(door.outX, door.outZ, 0);
        await activate("Įeiti į biblioteką");
        if (reviewArrival) {
          const card = page.locator(".minimap.library-arrival .mm-card");
          await card.waitFor({ state: "visible", timeout: 30_000 });
          assert.equal(await card.locator("b").innerText(), "Maple Harbor Public Library");
          assert.equal(await card.locator(".mm-arrival-sub[lang=lt]").innerText(), "Meipl Harboro viešoji biblioteka");
          assert.deepEqual(await card.evaluate((el) => [
            parseFloat(getComputedStyle(el.querySelector("b")).fontSize),
            parseFloat(getComputedStyle(el.querySelector(".mm-arrival-sub")).fontSize),
          ]), [16, 13]);
          assert.equal(await page.locator(".zone-banner").count(), 0, "The title stays in the location card");
        }
        await waitZone("library");
        await artReady();
      };
      const exit = async () => {
        const approach = await page.evaluate(() => {
          const ex = window.__ew.game.zone.interior.exit;
          return { x: ex.x, z: ex.z - 0.6 };
        });
        await walk(approach.x, approach.z);
        await activate("Išeiti į lauką");
        await waitZone("town");
        assert(await page.evaluate(() => {
          const g = window.__ew.game, p = g.player.root.position;
          return g.town.walkableAt(p.x, p.z) && !g.zones.get("library").group.getObjectByName("library-jackets")
            && !g.zones.get("library").group.getObjectByName("library-pages");
        }), "The outside return is walkable and the visit atlas has been detached");
      };

      const seated = (index) => page.waitForFunction(({ index, chair }) => {
        const g = window.__ew.game, p = g.player.root.position;
        const dx = p.x - chair.x, dz = p.z - chair.z;
        return g.libraryChair === index && g.player.anim === "sit"
          && Math.abs(dx * Math.sin(chair.rot) + dz * Math.cos(chair.rot) - 0.25) < 0.001
          && Math.abs(dx * Math.cos(chair.rot) - dz * Math.sin(chair.rot)) < 0.001
          && !!g.player.root.getObjectByName("library-headphones");
      }, { index, chair: chairs[index] }, { timeout: 30_000 });
      const stood = () => page.waitForFunction(() => {
        const g = window.__ew.game, p = g.player.root.position;
        return g.libraryChair === null && !g.modes.engaged && g.player.anim !== "sit"
          && !g.player.root.getObjectByName("library-headphones") && !g.zone.colliders.blocked(p.x, p.z, 0.38);
      }, null, { timeout: 10_000 });

      // All movement after the saved Union Station start uses the ordinary walking path and door actions.
      await walk(22, 44.4, 0);
      await capture("street");
      await enter(true);
      await capture("doorstep");
      await page.waitForFunction(() => !window.__ew.store.getState().hud.zoneBanner, null, { timeout: 4000 });
      assert.equal(await page.locator(".minimap.library-arrival").count(), 0, "The arrival returns to the compact location card");
      assert.equal(await page.locator(".minimap .mm-arrival-sub").count(), 0);
      const spots = await page.evaluate(() => window.__ew.game.zone.interior.spots);
      await walk(spots.display.x, spots.display.z);
      await activate("Browse books");
      await capture("display");
      const task = page.locator(".library-task .objective-summary");
      if (phone) await task.tap(); else await task.click();
      await page.locator(".objective-card:not(.collapsed)").waitFor();
      const fold = page.locator('.objective-card button[aria-label="Suskleisti"]');
      if (phone) await fold.tap(); else await fold.click();
      await page.locator(".library-task .objective-summary").waitFor();
      await walk(spots["chair-0"].x, spots["chair-0"].z);
      await capture("chair");
      await activate("Sit and read");
      await seated(0);
      await capture("seated");
      await activate("Stand up");
      await stood();
      await capture("stood-up");
      await walk(spots["chair-1"].x, spots["chair-1"].z);
      await activate("Sit and read");
      await seated(1);
      // Movement exits the second chair, including on touch-sized viewports.
      await page.locator("canvas").first().evaluate((canvas) => canvas.focus());
      await page.keyboard.down("w"); await page.waitForTimeout(150); await page.keyboard.up("w");
      await stood();
      assert.deepEqual(await page.evaluate(() => window.__libraryActions), [["browse", null], ["sit", 0], ["sit", 1]]);
      await exit();
      await capture("exit");
      const firstOutside = await sample();
      const expectedLibrary = {
        geometries: ["library-furniture", "library-lamps"],
        materials: ["library-furniture", "library-lamps"], textures: [],
      };
      assert.deepEqual(firstOutside.library, expectedLibrary, "Cached furniture survives the first exit");
      const extraNames = (names, baseline) => {
        const remaining = [...baseline];
        return names.filter((name) => {
          const at = remaining.indexOf(name);
          if (at < 0) return true;
          remaining.splice(at, 1);
          return false;
        });
      };
      const allocation = [];
      for (let visit = 1; visit < repeats; visit++) {
        await enter();
        await page.evaluate((index) => window.__ew.game.onLibraryAction("sit", index), visit % 2);
        await seated(visit % 2);
        await settle(); // Submit the accessory to WebGL before testing its disposal.
        await page.evaluate(() => window.__ew.game.standFromLibrary());
        await stood();
        await exit();
        await settle();
        const { townGeometryNames, ...reading } = await sample();
        allocation.push({
          ...reading,
          addedTownGeometries: extraNames(townGeometryNames, firstOutside.townGeometryNames),
          removedTownGeometries: extraNames(firstOutside.townGeometryNames, townGeometryNames),
        });
      }
      console.log(JSON.stringify({ viewport: label, metrics, visits: repeats, allocation }));
      for (const [visit, reading] of allocation.entries())
        assert.deepEqual(reading.library, expectedLibrary, `${label} visit ${visit + 2} library-owned resources`);
      assert.deepEqual(errors, [], `${label} page errors`);
      if (viewportChecks.length) throw new AggregateError(viewportChecks, `${label} visual checks failed`);
    } catch (error) {
      failures.push(error);
      console.error(`${label} failed`, error);
    } finally { await context.close(); }
  }
  if (failures.length) throw new AggregateError(failures, "Library viewport checks failed");
} finally { await browser.close(); }
