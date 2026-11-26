// Claude's K2–K5 review. Run against an already running game configured with
// VITE_RADIO_INDEX=/songs/index.json and VITE_RADIO_FILES=/karaoke-files.
// WORLD_TEST_URL=http://127.0.0.1:5198 WORLD_SHOTS=/tmp/karaoke-k3 \
// WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/karaoke.mjs
// Course files are read locally. No course or Worker writes, or external media downloads.
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { freezeConfettiBurst } from "./fixtures/confetti.mjs";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5198";
const shots = process.env.WORLD_SHOTS || "/tmp/karaoke-k3";
const course = process.env.WORLD_COURSE_PUBLIC || join(homedir(), "fluent-steps/public");
const index = JSON.parse(await readFile(join(course, "songs/index.json"), "utf8"));
const lyric = JSON.parse(await readFile(join(course, "songs/data/G01.json"), "utf8"));
const recording = await readFile(join(course, "songs/audio/G01.mp3"));
const token = "karaoke-k2-fixture";
const sizes = [[390, 844], [390, 664], [844, 390], [1280, 800]];
await mkdir(shots, { recursive: true });

function install({ token, short, microphone }) {
  localStorage.setItem("english-world-progress-v1", JSON.stringify({
    version: 1,
    profile: { name: "Test", surname: "Singer", gender: "f", lookId: "f1",
      look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
    settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0.5, sounds: 0, textSize: short ? 1.3 : 1, cameraFollow: false, phoneCalls: false },
    sits: {}, phrases: {}, seenIntro: {}, started: 1,
    place: { zone: "town", x: -58, z: -6, rot: 0 }, coach: { done: true, run: true, view: true },
  }));
  localStorage.setItem("fs-files-token", JSON.stringify({ token, exp: Math.floor(Date.now() / 1000) + 3600 }));
  localStorage.setItem("fluentsteps.songs.favorites.v1", JSON.stringify({ G01: { liked: true, at: 1 } }));
  sessionStorage.setItem("ew-play-now", "1");
  window.SpeechRecognition = undefined;
  window.webkitSpeechRecognition = undefined;
  if (microphone) {
    // A complete fake local service, never the headless browser's native recognizer. Production keeps its guard.
    Object.defineProperty(navigator, "userAgent", { get: () => "Chrome/143.0" });
    Object.defineProperty(navigator, "userAgentData", { get: () => ({ brands: [{ brand: "Google Chrome" }] }) });
    window.__karaokeMicStarts = 0; window.__karaokeRemoteStarts = 0; window.__karaokeMicInstalls = 0;
    window.SpeechRecognition = class {
      static async available(options) {
        assertLocal(options); return "available";
      }
      static async install() { window.__karaokeMicInstalls++; return false; }
      local = false; lang = "";
      get processLocally() { return this.local; }
      set processLocally(value) { this.local = value === true; }
      start() {
        if (this.processLocally === true && this.lang === "en-US") window.__karaokeMicStarts++;
        else window.__karaokeRemoteStarts++;
        window.__karaokeActiveRecognizer = this;
        queueMicrotask(() => this.onstart?.());
      }
      abort() { queueMicrotask(() => this.onend?.()); }
    };
    function assertLocal(options) {
      if (options.processLocally !== true || options.langs.length !== 1 || options.langs[0] !== "en-US") throw new Error("unexpected local pack probe");
    }
  }
}

const browser = await chromium.launch({
  headless: true, channel: process.env.WORLD_BROWSER_CHANNEL || undefined,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=document-user-activation-required"],
});
try {
  for (const [width, height] of sizes) {
    const label = `${width}x${height}`, phone = width < 900;
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: phone, deviceScaleFactor: 1, reducedMotion: "no-preference" });
    const microphone = height === 664 || width === 1280;
    await context.addInitScript(install, { token, short: height === 664, microphone });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/songs/index.json", (route) => route.fulfill({ json: index }));
    await page.route(/\/songs\/data\/[^/]+\.json(?:\?.*)?$/, (route) => {
      const path = new URL(route.request().url()).pathname;
      return path.endsWith("/G01.json") ? route.fulfill({ json: lyric }) : route.fulfill({ status: 404, body: "" });
    });
    await page.route(/\/songs\/audio\/G01\.mp3(?:\?.*)?$/, (route) => {
      // Serve byte ranges like the files Worker does, so the media element can seek.
      const size = recording.length, m = /bytes=(\d*)-(\d*)/.exec(route.request().headers().range || "");
      if (!m) return route.fulfill({ status: 200, contentType: "audio/mpeg", headers: { "accept-ranges": "bytes" }, body: recording });
      const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
      const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
      return route.fulfill({ status: 206, contentType: "audio/mpeg", body: recording.subarray(start, end + 1),
        headers: { "accept-ranges": "bytes", "content-range": `bytes ${start}-${end}/${size}` } });
    });
    await page.route("**/art/s/songs/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      const name = path.split("/").at(-1);
      if (!/^[A-Z]+\d+\.[a-f0-9]+\.(160|320|640)\.webp$/.test(name)) return route.fulfill({ status: 404, body: "" });
      try { await route.fulfill({ contentType: "image/webp", body: await readFile(join(course, "art/s/songs", name)) }); }
      catch { await route.fulfill({ status: 404, body: "" }); }
    });
    const shot = async (state) => {
      await page.screenshot({ path: join(shots, `${label}-${state}.png`) });
    };
    const press = async (locator) => phone ? locator.tap() : locator.click();
    const anotherSong = async () => {
      await press(page.getByRole("button", { name: "Daugiau", exact: true }));
      await press(page.locator(".karaoke-more").getByRole("button", { name: "Pasirinkti kitą dainą", exact: true }));
    };
    const until = (predicate, timeout = 30000) => page.waitForFunction(predicate, null, { timeout });
    try {
      await page.goto(base, { waitUntil: "domcontentloaded" });
      await until(() => window.__ew?.store.getState().screen === "play", 90000);
      await page.evaluate((touch) => window.__ew.store.getState().setHud({ panel: null, showTouch: touch }), phone);
      await until(() => window.__ew.radio.store.getState().ready);
      // Start on Main Street, walk to the actual mapped door, and use its normal enter transition.
      await page.evaluate(() => {
        const game = window.__ew.game, door = game.town.doors.find((door) => door.loc === "sunny-cup");
        game.walkTo(door.outX, door.outZ, { kind: "door", id: door.loc });
      });
      await until(() => window.__ew.store.getState().hud.minimap.zone === "sunny-cup" && !window.__ew.game.transitioning);
      await shot("door-view");
      await page.evaluate(() => window.__ew.game.walkTo(4.2, 2.8, { kind: "point" }));
      await until(() => window.__ew.store.getState().hud.prompt?.kind === "karaoke" && !window.__ew.game.autoPath);
      await shot("prompt");
      const sceneBefore = await page.evaluate(() => {
        const game = window.__ew.game;
        return { position: game.player.root.position.toArray(), heading: game.player.root.rotation.y,
          guests: game.extras.slice(0, 2).map((guest) => guest.root.position.toArray()) };
      });
      await press(page.locator(".prompt"));
      const picker = page.locator(".karaoke-picker");
      await picker.waitFor();
      await picker.locator('[data-song="G01"] img').evaluate((image) => image.decode());
      await shot("picker");
      assert.equal(await page.evaluate(() => window.__ew.radio.store.getState().karaoke), null, "browsing borrows no audio output");
      const favoritesBefore = await page.evaluate(() => localStorage.getItem("fluentsteps.songs.favorites.v1"));
      await picker.locator("select").selectOption("favorites");
      assert.equal(await picker.locator("[data-song]").count(), 1);
      await picker.locator("select").selectOption("all");
      // A long-list return keeps both scroll and the chosen cover's keyboard focus.
      const last = picker.locator("[data-song]").last();
      await last.scrollIntoViewIfNeeded();
      await press(last);
      await press(picker.locator("[data-pad-back]"));
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.song), index.songs.at(-1).id);
      assert(await picker.locator(".karaoke-list").evaluate((list) => list.scrollTop > 0));
      await picker.locator('[data-song="G01"]').scrollIntoViewIfNeeded();
      await press(picker.locator('[data-song="G01"]'));
      await picker.locator('[data-song-detail="G01"] img').evaluate((image) => image.decode());
      await shot("details");
      const start = picker.getByRole("button", { name: "Pradėti dainą", exact: true });
      const bounds = await start.boundingBox();
      assert(bounds && bounds.height >= 44 && bounds.y >= 0 && bounds.y + bounds.height <= height, "Start stays visible");
      await press(start);
      await page.locator(".karaoke-performance").waitFor();
      await until(() => window.__ew.radio.store.getState().karaoke?.store.getState().status === "playing");
      assert(await page.evaluate(() => window.__ew.game.rig.cam.position.distanceTo(window.__ew.game.rig.stage.pos) < 0.001), "entry uses the stage camera immediately");
      const pausedTake = await page.evaluate(async () => {
        const take = window.__ew.radio.store.getState().karaoke;
        await take.seek(7.1); take.pause();
        const state = take.store.getState();
        return { status: state.status, position: take.position(), first: state.timeline?.lines[0]?.src, rows: state.timeline?.lines.length };
      });
      assert.equal(pausedTake.status, "paused");
      assert(Math.abs(pausedTake.position - 7.1) < 0.15, `seek/pause clock: ${JSON.stringify(pausedTake)}`);
      assert.equal(pausedTake.first, lyric.L[0].src, "the stage has G01's loaded lyric data");
      assert(pausedTake.rows >= lyric.L.length);
      await page.locator('.karaoke-current-line[data-line="0"] .karaoke-word.now').waitFor();
      await until(() => {
        const { game } = window.__ew, stage = game.rig.stage;
        return stage && game.rig.cam.position.distanceTo(stage.pos) < 0.03;
      });
      assert(await page.evaluate(() => !!window.__ew.game.player.rightHand.getObjectByName("karaoke-hand-mic")));
      await shot("stage");
      await shot("first-line");
      const primaryBefore = await page.locator(".karaoke-transport-primary").boundingBox();
      if (width <= 600) {
        const tops = await page.locator(".karaoke-current-line .karaoke-unit").evaluateAll((units) => units.map((unit) => Math.round(unit.getBoundingClientRect().top)));
        assert(new Set(tops).size === 1 || (tops[0] === tops[1] && tops[2] === tops[3]), "wrapped opening balances the two Every evening phrases");
      }
      await press(page.getByRole("button", { name: "Rodyti reikšmę", exact: true }));
      await page.locator(".karaoke-natural").waitFor();
      assert.equal(await page.locator(".karaoke-natural").textContent(), lyric.L[0].lt);
      if (width <= 600) assert((await page.locator(".karaoke-reader").boundingBox()).height <= height * 0.46 + 1, "meaning fits its content within the phone cap");
      await shot("meaning");
      await press(page.getByRole("button", { name: "Slėpti reikšmę", exact: true }));
      assert.equal(await page.evaluate(() => window.__ew.radio.store.getState().karaoke.store.getState().status), "paused", "closing meanings preserves a manual pause");
      await press(page.getByRole("button", { name: "Daugiau", exact: true }));
      await page.keyboard.press("Escape");
      await page.locator(".karaoke-more").waitFor({ state: "detached" });
      assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("karaoke-transport-more")), true, "Back closes More and restores its focus");
      await anotherSong();
      await picker.waitFor();
      await picker.getByRole("combobox", { name: "Praktikos būdas", exact: true }).selectOption("word");
      await press(picker.getByRole("button", { name: "Pradėti dainą", exact: true }));
      await until(() => window.__ew.radio.store.getState().karaoke?.store.getState().status === "playing");
      // The repeated opening is deliberately ineligible. G01 rows 1 and 2 each have unique single-word units.
      const manualRow = 1, autoRow = 2, challengeAt = lyric.L[manualRow].s + 0.6;
      await page.evaluate(async (seconds) => {
        const take = window.__ew.radio.store.getState().karaoke;
        await take.seek(seconds); take.pause();
      }, challengeAt);
      const blank = page.locator(`.karaoke-current-line[data-line="${manualRow}"] .karaoke-blank`);
      await blank.waitFor();
      assert.equal((await blank.textContent()).trim(), "", "the blank contains no hidden answer text");
      assert.equal(await page.locator(".karaoke-natural, .karaoke-next").count(), 0, "no meaning or preview gives the answer away");
      assert((await page.locator(".karaoke-current-line .karaoke-accessible").first().textContent()).includes("Praleistas žodis"));
      const slotWidth = (await blank.boundingBox()).width;
      await shot("blank");
      await press(page.getByRole("button", { name: "Parodyti žodį", exact: true }));
      await blank.waitFor({ state: "detached" });
      const revealed = page.locator(`.karaoke-current-line[data-line="${manualRow}"] .karaoke-revealed`);
      await revealed.waitFor();
      assert(Math.abs((await revealed.boundingBox()).width - slotWidth) < 1, "reveal reserves the blank's width");
      assert.equal(await page.locator(".karaoke-current-line .karaoke-accessible").first().textContent(), lyric.L[manualRow].src);
      await until(() => document.activeElement?.classList.contains("karaoke-reading"));
      await shot("revealed");
      // No tap is needed for the next line's reveal or its ordinary practiced-line tally.
      await page.evaluate(async (seconds) => {
        const take = window.__ew.radio.store.getState().karaoke;
        await take.seek(seconds); await take.resume();
      }, lyric.L[autoRow].s);
      await page.locator(`.karaoke-current-line[data-line="${autoRow}"] .karaoke-blank`).waitFor();
      await page.locator(`.karaoke-current-line[data-line="${autoRow}"] .karaoke-revealed`).waitFor();
      await page.evaluate(() => window.__ew.radio.store.getState().karaoke.pause());
      assert.equal(await page.evaluate(() => window.__ew.radio.store.getState().karaoke.store.getState().practice.completed), 1);
      await page.evaluate(async (seconds) => { await window.__ew.radio.store.getState().karaoke.seek(seconds); }, challengeAt);
      const speed = page.getByRole("combobox", { name: "Greitis", exact: true });
      const canSlow = await page.evaluate(() => window.__ew.radio.store.getState().karaoke.store.getState().canSlow);
      if (canSlow) {
        await speed.selectOption("0.8");
        assert.equal(await page.evaluate(() => window.__ew.radio.store.getState().karaoke.store.getState().rate), 0.8);
        const clock = await page.evaluate(async () => {
          const take = window.__ew.radio.store.getState().karaoke;
          await take.resume();
          const before = take.position(), wall = performance.now();
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const elapsed = (performance.now() - wall) / 1000, media = take.position() - before;
          take.pause(); return { elapsed, media };
        });
        assert(Math.abs(clock.media / clock.elapsed - 0.8) < 0.15, `slow media clock: ${JSON.stringify(clock)}`);
      } else {
        assert(await speed.isDisabled());
        assert.equal(await speed.locator('option[value="0.8"]').count(), 0, "buffer/unverified output offers only 1×");
      }
      await shot("slow");
      await anotherSong();
      await picker.waitFor();
      await picker.getByRole("combobox", { name: "Praktikos būdas", exact: true }).selectOption("echo");
      await press(picker.getByRole("button", { name: "Pradėti dainą", exact: true }));
      await page.locator(".karaoke-turn").waitFor();
      assert.equal(await page.evaluate(() => window.__ew.radio.store.getState().karaoke.store.getState().rate), 1, "each new performance starts at 1×");
      assert.equal(await page.evaluate(() => window.__ew.radio.store.getState().karaoke.store.getState().practice.completed), 1);
      if (width <= 600) {
        const primary = await page.locator(".karaoke-transport-primary").boundingBox();
        assert(Math.abs(primary.y - primaryBefore.y) < 1 && Math.abs(primary.height - primaryBefore.height) < 1, "the primary action stays under the same thumb for Echo");
        const controls = await page.locator(".karaoke-transport-grid > button, .karaoke-transport-grid > .karaoke-rate").evaluateAll((nodes) => nodes.map((node) => ({ y: Math.round(node.getBoundingClientRect().top), h: node.getBoundingClientRect().height })));
        assert.equal(new Set(controls.map((control) => control.y)).size, 2, "phone controls occupy exactly two rows");
        assert(controls.every((control) => control.h >= 44));
      }
      if (microphone) await page.getByRole("button", { name: "Naudoti mikrofoną šiai eilutei", exact: true }).focus();
      await shot("echo-turn");
      if (microphone) {
        const mic = page.getByRole("button", { name: "Naudoti mikrofoną šiai eilutei", exact: true });
        await mic.waitFor(); await mic.focus(); // the opt-in stays available while a keyboard/controller learner reads
        await page.locator("#karaoke-mic-privacy").scrollIntoViewIfNeeded();
        assert(await mic.isVisible());
        await shot("mic-optin");
        await press(mic);
        await until(() => window.__ew.radio.store.getState().karaoke.store.getState().microphone.phase === "listening");
        assert.equal(await page.evaluate(() => window.__ew.radio.store.getState().karaoke.store.getState().held), true);
        assert.equal(await page.evaluate(() => window.__karaokeMicStarts), 1);
        assert.equal(await page.evaluate(() => window.__karaokeRemoteStarts), 0);
        assert.equal(await page.evaluate(() => window.__karaokeMicInstalls), 0);
        await page.evaluate((sentence) => {
          const rec = window.__karaokeActiveRecognizer;
          rec.onresult?.({ results: [Object.assign([{ transcript: sentence }], { isFinal: true })] });
          rec.onend?.(); // confirmation, not an elapsed timeout, releases this fake capture
        }, lyric.L[0].src);
        await until(() => {
          const take = window.__ew.radio.store.getState().karaoke.store.getState();
          return !take.held && take.microphone.phase === "done" && take.microphone.matches.length > 0;
        });
        await page.locator(".karaoke-word.heard").first().waitFor();
        await page.locator(".karaoke-heard").scrollIntoViewIfNeeded();
        await shot("mic-heard");
        assert.equal(await page.evaluate(() => window.__ew.radio.store.getState().karaoke.store.getState().status), "paused");
      }
      await press(page.getByRole("button", { name: "Išklausyti eilutę dar kartą", exact: true }));
      await page.locator(".karaoke-turn").waitFor({ state: "detached" });
      await page.locator(".karaoke-turn").waitFor();
      assert.equal(await page.evaluate(() => window.__ew.radio.store.getState().karaoke.store.getState().practice.completed), 1, "replaying a line adds no second point");
      if (microphone) assert.equal(await page.evaluate(() => window.__karaokeMicStarts), 1, "Replay never starts the mic again");
      await page.evaluate(() => {
        const audio = window.__ew.audio, sfx = audio.sfx.bind(audio);
        window.__karaokeCheers = 0;
        audio.sfx = (name, ...args) => { if (name === "crowdCheer") window.__karaokeCheers++; return sfx(name, ...args); };
      });
      await press(page.getByRole("button", { name: "Tęsti", exact: true }));
      const lastLine = lyric.L.at(-1);
      await page.evaluate(async (seconds) => { await window.__ew.radio.store.getState().karaoke.seek(seconds); }, lastLine.s);
      await page.waitForFunction((last) => window.__ew.radio.store.getState().karaoke?.store.getState().practice.turn?.rows.includes(last), lyric.L.length - 1);
      assert.equal(await page.evaluate(() => window.__ew.radio.store.getState().karaoke.store.getState().status), "paused", "the last sung line gets its turn");
      await press(page.getByRole("button", { name: "Tęsti", exact: true }));
      await page.locator(".karaoke-finish").waitFor({ timeout: 40000 });
      const result = await page.evaluate(() => window.__ew.radio.store.getState().karaoke.store.getState().practice);
      assert.equal(result.total, lyric.L.length);
      assert(result.completed >= 2 && result.completed < result.total, "skipped rows receive no practice credit");
      assert.equal(await page.evaluate(() => window.__karaokeCheers), 1);
      await page.locator(".confetti").waitFor({ state: "attached" });
      await page.waitForFunction(freezeConfettiBurst); // zero-size origin is never Playwright-visible; the pieces are
      await shot("finish");
      await press(page.getByRole("button", { name: "Nulipti nuo scenos", exact: true }));
      await picker.waitFor({ state: "detached" });
      await until(() => window.__ew.store.getState().hud.prompt?.kind === "karaoke");
      const sceneAfter = await page.evaluate(() => {
        const game = window.__ew.game;
        return { position: game.player.root.position.toArray(), heading: game.player.root.rotation.y,
          guests: game.extras.slice(0, 2).map((guest) => guest.root.position.toArray()) };
      });
      // The guests come back exactly; the learner may be nudged a few centimetres by the stand's collider.
      const near = (a, b, e = 1e-3) => Math.abs(a - b) < e;
      const same = (a, b, e) => a.length === b.length && a.every((v, i) => near(v, b[i], e));
      assert(same(sceneAfter.position, sceneBefore.position, 0.25) && near(sceneAfter.heading, sceneBefore.heading, 0.01)
        && sceneAfter.guests.length === sceneBefore.guests.length
        && sceneAfter.guests.every((g, i) => same(g, sceneBefore.guests[i])),
        `leaving restores the avatar and both guests: ${JSON.stringify({ sceneBefore, sceneAfter })}`);
      assert.equal(await page.evaluate(() => window.__ew.radio.store.getState().karaoke), null);
      assert.equal(await page.evaluate(() => localStorage.getItem("fluentsteps.songs.favorites.v1")), favoritesBefore);
      await shot("after-leave");
      // Walk to the ordinary counter approach and launch the real café conversation.
      await page.evaluate(() => window.__ew.game.walkTo(-1.2, -2.05, { kind: "point" }));
      await until(() => window.__ew.store.getState().hud.prompt?.kind === "talk" && !window.__ew.game.autoPath);
      await page.keyboard.press("e");
      await until(() => window.__ew.store.getState().conv.active && window.__ew.store.getState().conv.sitId === "s72-cafe");
      // The fake recognizer makes speech supported; preserve the original script's typed coffee-order path.
      if (microphone) await page.evaluate(() => window.__ew.store.getState().setConv({ typing: true }));
      await page.locator(".convo").waitFor();
      await press(page.locator(".scene-start"));
      const replies = {
        order: "A latte, please", kind: "A latte", size: "Medium", milk: "Whole milk", whole_ok: "Yes",
        alt_milk: "Yes, that's fine", temp: "Hot, please", warm: "Yes, please", more: "That's all",
        dine: "For here", name: "Test", pay: "Card", receipt: "No, thanks", usual: "Yes, please", closing: "Thank you!",
      };
      for (let turn = 0; turn < 16; turn++) {
        await until(() => {
          const conv = window.__ew.store.getState().conv;
          return conv.completed || conv.phase === "you";
        });
        const turnState = await page.evaluate(() => {
          const { completed, stepId } = window.__ew.store.getState().conv;
          return { completed, stepId };
        });
        if (turnState.completed) break;
        assert(replies[turnState.stepId], `known café turn ${turnState.stepId}`);
        await page.locator(".typebox input").fill(replies[turnState.stepId]);
        await press(page.locator(".typebox button[type=submit]"));
      }
      await until(() => window.__ew.store.getState().conv.completed);
      assert.deepEqual(errors, [], `${label} has no page errors`);
      console.log(`ok ${label}: Main Street → café → picker → stage → leave → completed coffee order`);
    } catch (error) {
      await page.screenshot({ path: join(shots, `${label}-failure.png`) }).catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
