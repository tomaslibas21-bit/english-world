// Run against the private Puerto Colibrí review game serving its course covers and narration.
// WORLD_STORAGE=puerto-colibri WORLD_LEARNER=lt selects SM. WORLD_SHOTS is optional.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const learner = process.env.WORLD_LEARNER || "en";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
assert.equal(storage, "puerto-colibri");
assert.ok(["en", "lt"].includes(learner), "Use WORLD_LEARNER=en or lt");
const profile = learner === "lt" ? "sm-lt" : "sme-en";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = new URL(process.env.WORLD_TEST_URL || `http://127.0.0.1:${learner === "lt" ? 8722 : 8721}`);
const shots = process.env.WORLD_SHOTS;
const sizes = [[390, 844], [390, 664], [844, 390], [1280, 800]];
const repeats = 10;
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
  for (const [width, height] of sizes) for (const textSize of [1, 1.15, 1.3]) {
    const label = `${profile}-${width}x${height}-${textSize}`, phone = width === 390 || height === 390;
    const context = await browser.newContext({
      viewport: { width, height }, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 2 : 1,
      reducedMotion: width === 1280 ? "reduce" : "no-preference",
    });
    try {
      await context.route("**/*", (route) => new URL(route.request().url()).origin === base.origin
        ? route.continue() : route.abort());
      await context.addInitScript(([key, save]) => {
        localStorage.setItem(key, JSON.stringify(save));
        sessionStorage.setItem("ew-play-now", "1");
        window.SpeechRecognition = window.webkitSpeechRecognition = undefined;
        let seed = 20261126;
        Math.random = () => (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
      }, [`${storage}-progress-v1`, {
        ...progress, settings: { ...progress.settings, textSize }, profile: { ...progress.profile, look: { ...progress.profile.look, height: width === 390 ? 0.9 : 1.1 } },
      }]);
      const page = await context.newPage(), errors = [], metrics = [], viewportChecks = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(base.href, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.__ew?.game?.zoneId === "town" && !window.__ew.store.getState().hud.fade,
        null, { timeout: 180_000 });
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      assert.equal(await page.locator("html").getAttribute("lang"), learner);
      assert.equal(await page.evaluate(() => window.__ew.radio.books?.source.profile), profile);
      const doors = await page.evaluate(() => window.__ew.game.doors.filter((d) => d.loc === "library"));
      assert.equal(doors.length, 1, "Enable this course shelf before running the PC library review");
      const [door] = doors;
      assert.equal(door.name, "Biblioteca de Puerto Colibrí");
      assert.deepEqual([door.x, door.z], [22, 49]);
      await page.evaluate(() => {
        window.__libraryActions = [];
        const g = window.__ew.game;
        const shelf = g.onLibraryShelf, reader = g.onLibraryReader;
        g.onLibraryShelf = (id) => { window.__libraryActions.push(["browse", id ?? null]); shelf(id); };
        g.onLibraryReader = (chair) => { window.__libraryActions.push(["sit", chair]); reader(chair); };
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
        await page.evaluate(([x, z]) => window.__ew.game.walkTo(x, z, { kind: "point" }), [x, z]);
        await arrive(x, z);
        if (facing !== undefined) await page.evaluate((rot) => {
          const g = window.__ew.game;
          g.gait.facing = g.heading = g.player.root.rotation.y = g.rig.yaw = rot;
          g.rig.snap();
        }, facing);
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
            assert.equal(await prompt.locator(`small[lang=${learner}]`).count(), 1);
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
      const enter = async () => {
        await walk(door.outX, door.outZ, 0);
        await activate(door.name);
        await waitZone("library");
        await artReady();
      };
      const exit = async () => {
        await page.evaluate(() => {
          const g = window.__ew.game, ex = g.zone.interior.exit;
          g.walkTo(ex.x, ex.z - 0.6, { kind: "exit" });
        });
        await waitZone("town");
        assert(await page.evaluate(() => {
          const g = window.__ew.game, p = g.player.root.position;
          return g.town.walkableAt(p.x, p.z) && !g.zones.get("library").group.getObjectByName("library-jackets")
            && !g.zones.get("library").group.getObjectByName("library-pages");
        }), "The outside return is walkable and the visit atlas has been detached");
      };

      const seated = (index) => page.waitForFunction((chair) => {
        const g = window.__ew.game;
        return g.libraryChair === chair && g.player.anim === "sit"
          && !!g.player.root.getObjectByName("library-headphones");
      }, index, { timeout: 30_000 });
      const stood = () => page.waitForFunction(() => {
        const g = window.__ew.game, p = g.player.root.position;
        return g.libraryChair === null && !g.modes.engaged && g.player.anim !== "sit"
          && !g.player.root.getObjectByName("library-headphones") && !g.zone.colliders.blocked(p.x, p.z, 0.38);
      }, null, { timeout: 10_000 });

      // All movement after the saved Terminal de Autobuses start uses the ordinary walking path and door actions.
      await walk(22, 44.4, 0);
      await capture("street");
      await enter();
      await capture("doorstep");
      const spots = await page.evaluate(() => window.__ew.game.zone.interior.spots);
      await walk(spots.display.x, spots.display.z);
      const shelf = page.locator('.book-picker[open]'), reader = page.locator('.book-reader[open]');
      const closeReader = () => reader.locator("[data-pad-back]").click();
      await activate("Explorar libros");
      await shelf.locator('[data-book="BK01"]').waitFor();
      await shelf.locator("[data-pad-back]").click();
      await capture("display");
      await walk(spots["chair-0"].x, spots["chair-0"].z);
      await capture("chair");
      await activate("Sentarse a leer");
      await seated(0);
      await shelf.locator('[data-book="BK01"]').press("Enter");
      await shelf.locator("#chapter-BK01-01").click();
      const playing = () => page.waitForFunction(() => window.__ew.radio.books.player.getSnapshot().status === "playing");
      await playing();
      await reader.locator("[data-book-settings]").click();
      const settings = page.locator(".book-settings[open]");
      await settings.locator(".rates select").first().selectOption("0.9");
      await settings.locator("[data-pad-back]").click();
      assert.deepEqual(await page.evaluate(() => {
        const { prefs } = window.__ew.radio.books.player.getSnapshot();
        return [prefs.mode, prefs.rates.es];
      }), ["paired", 0.9]);
      await capture("seated-reader");
      await closeReader();
      await capture("seated");
      const bookPosition = () => page.evaluate(() => {
        const { books } = window.__ew.radio;
        return { chapter: books.player.getSnapshot().selection.chapterId, time: books.player.getSnapshot().position };
      });
      const beforeStanding = await bookPosition();
      await activate("Levantarse");
      await stood();
      await capture("stood-up");
      await walk(spots["chair-1"].x, spots["chair-1"].z);
      await activate("Sentarse a leer");
      await seated(1);
      await closeReader();
      // Movement exits the second chair, including on touch-sized viewports.
      await page.locator("canvas").first().evaluate((canvas) => canvas.focus());
      await page.keyboard.down("w"); await page.waitForTimeout(150); await page.keyboard.up("w");
      await stood();
      assert.deepEqual(await page.evaluate(() => window.__libraryActions), [["browse", null], ["sit", 0], ["sit", 1]]);
      await exit();
      await playing();
      await page.locator(".book-walking").waitFor();
      const outside = await bookPosition();
      assert.equal(outside.chapter, beforeStanding.chapter);
      assert(outside.time >= beforeStanding.time, "Playback continues from the chair into Calle Hidalgo");
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
        await closeReader();
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
