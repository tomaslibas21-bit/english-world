// Café La Ceiba review against an existing local es server. Set WORLD_LEARNER=lt for es-lt.
// Configure VITE_RADIO_INDEX=/songs/index.json, VITE_RADIO_FILES=/karaoke-files,
// VITE_RADIO_RECORDINGS=https://audio.dvikalbesdainos.lt/spanish-master.
// WORLD_TEST_URL and WORLD_SHOTS select the review origin and output directory.
// Course lyrics and artwork are read locally. Silent WAVs exercise the media clock.
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { keepRadioLocal, silence } from "./radio-fixtures.mjs";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = new URL(process.env.WORLD_TEST_URL || "http://127.0.0.1:5188");
const lt = process.env.WORLD_LEARNER === "lt";
const profile = lt ? "sm" : "sme";
const shots = join(process.env.WORLD_SHOTS || "/tmp/karaoke-pc", profile);
const course = process.env.WORLD_COURSE_PUBLIC || join(homedir(), lt ? "spanish-master/public" : "spanish-master-english/public");
const readJson = async (path) => JSON.parse(await readFile(join(course, path), "utf8"));
const index = await readJson("songs/index.json");
assert.equal(index.songs.length, lt ? 130 : 186);
const ids = lt ? ["SG01", "SV64"] : ["SG01", "SV64", "SB01"];
const texts = new Map(await Promise.all(ids.map(async (id) => [id, await readJson(`songs/data/${id}.json`)])));
const tracks = new Map(ids.map((id) => {
  const { a, d } = index.songs.find((song) => song.id === id);
  return [new URL(a).pathname.split("/").at(-1), silence(d)];
}));
const token = "karaoke-pc+fixture &";
const words = lt ? {
  enter: "Dainuoti karaokę", start: "Pradėti dainą", show: "Rodyti reikšmę", hide: "Slėpti reikšmę",
  back: "Grįžti", mode: "Praktikos būdas", repeat: "Išklausyti eilutę dar kartą",
  next: "Tęsti", leave: "Nulipti nuo scenos", missing: "Praleistas žodis", reveal: "Parodyti žodį", speed: "Greitis",
} : {
  enter: "Sing karaoke", start: "Start song", show: "Show meaning", hide: "Hide meaning",
  back: "Go back", mode: "Practice mode", repeat: "Replay line",
  next: "Continue", leave: "Leave stage", missing: "Missing word", reveal: "Reveal word", speed: "Speed",
};
const sizes = [[390, 844], [390, 664], [844, 390], [1280, 800]];
await mkdir(shots, { recursive: true });

function install({ token, short }) {
  localStorage.setItem("puerto-colibri-progress-v1", JSON.stringify({
    version: 1,
    profile: { name: "Test", surname: "Singer", gender: "f", lookId: "f1",
      look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
    settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0.5, sounds: 0, textSize: short ? 1.3 : 1, cameraFollow: false, phoneCalls: false },
    sits: {}, phrases: {}, seenIntro: {}, started: 1,
    place: { zone: "town", x: -58, z: -6, rot: 0 }, coach: { done: true, run: true, view: true },
  }));
  localStorage.setItem("fs-files-token", JSON.stringify({ token, exp: Math.floor(Date.now() / 1000) + 3600 }));
  localStorage.setItem("fluentsteps.songs.favorites.v1", JSON.stringify({ SG01: { liked: true, at: 1 } }));
  sessionStorage.setItem("ew-play-now", "1");
  window.SpeechRecognition = undefined;
  window.webkitSpeechRecognition = undefined;
}

async function serveTrack(route, recording) {
  const headers = {
    "content-type": "audio/wav", "accept-ranges": "bytes", "content-length": String(recording.length),
  };
  const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range ?? "");
  if (!range) return route.fulfill({ headers, body: recording });
  const start = Number(range[1]), end = Math.min(range[2] ? Number(range[2]) : recording.length - 1, recording.length - 1);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end) {
    return route.fulfill({ status: 416, headers: {
      "accept-ranges": "bytes", "content-range": `bytes */${recording.length}`, "content-length": "0",
    }, body: "" });
  }
  // The recording is requested at its indexed MP3 URL. Chromium seeks with Range and needs a partial response.
  return route.fulfill({ status: 206, headers: {
    ...headers, "content-range": `bytes ${start}-${end}/${recording.length}`, "content-length": String(end - start + 1),
  }, body: recording.subarray(start, end + 1) });
}

const browser = await chromium.launch({
  headless: true, channel: process.env.WORLD_BROWSER_CHANNEL || undefined,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=document-user-activation-required"],
});
try {
  for (const [width, height] of sizes) {
    const label = `${width}x${height}`, phone = width < 900, reduced = width === 1280;
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: phone, deviceScaleFactor: 1,
      reducedMotion: reduced ? "reduce" : "no-preference" });
    await context.addInitScript(install, { token, short: height === 664 });
    const page = await context.newPage(), errors = [], routes = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await keepRadioLocal(page, base.href);
    await page.route((url) => url.origin === base.origin && url.pathname === "/songs/index.json", (route) => route.fulfill({ json: index }));
    await page.route((url) => url.origin === base.origin && /\/songs\/data\/[^/]+\.json$/.test(url.pathname), (route) => {
      const url = new URL(route.request().url());
      const lyric = texts.get(url.pathname.split("/").at(-1).replace(".json", ""));
      routes.push({ path: url.pathname, signed: url.searchParams.get("t") === token });
      return lyric ? route.fulfill({ json: lyric }) : route.fulfill({ status: 404, body: "" });
    });
    await page.route((url) => url.origin === base.origin && /^\/karaoke-files\/songs\/v1\/[^/]+\.mp3$/.test(url.pathname), (route) => {
      const url = new URL(route.request().url()), track = tracks.get(url.pathname.split("/").at(-1));
      routes.push({ path: url.pathname, signed: url.searchParams.get("t") === token });
      return track ? serveTrack(route, track) : route.fulfill({ status: 404, body: "" });
    });
    await page.route((url) => url.origin === base.origin && url.pathname.startsWith("/art/s/songs/"), async (route) => {
      const url = new URL(route.request().url()), name = url.pathname.split("/").at(-1);
      assert.equal(url.search, "");
      if (!/^[A-Z]+\d+\.[a-f0-9]+\.(160|320|640)\.webp$/.test(name)) return route.fulfill({ status: 404, body: "" });
      try { await route.fulfill({ contentType: "image/webp", body: await readFile(join(course, "art/s/songs", name)) }); }
      catch { await route.fulfill({ status: 404, body: "" }); }
    });

    const shot = (state) => page.screenshot({ path: join(shots, `${label}-${state}.png`) });
    const press = (locator) => phone ? locator.tap() : locator.click();
    const button = (name) => page.getByRole("button", { name, exact: true });
    const until = (predicate, timeout = 30000) => page.waitForFunction(predicate, null, { timeout });
    const choose = async (id) => {
      const row = page.locator(`.karaoke-picker [data-song="${id}"]`);
      await row.scrollIntoViewIfNeeded();
      await press(row);
    };
    const pauseAt = (seconds) => page.evaluate(async (at) => {
      const take = window.__ew.radio.store.getState().karaoke;
      await take.seek(at);
      take.pause();
      return take.position();
    }, seconds);

    try {
      await page.goto(base.href, { waitUntil: "domcontentloaded" });
      await until(() => window.__ew?.store.getState().screen === "play", 90000);
      await page.evaluate((touch) => window.__ew.store.getState().setHud({ panel: null, showTouch: touch }), phone);
      await until(() => window.__ew.radio.store.getState().ready);
      await page.evaluate(() => {
        const game = window.__ew.game, door = game.town.doors.find((door) => door.loc === "sunny-cup");
        game.walkTo(door.outX, door.outZ, { kind: "door", id: door.loc });
      });
      await until(() => window.__ew.store.getState().hud.minimap.zone === "sunny-cup" && !window.__ew.game.transitioning);
      await shot("cafe");
      await page.evaluate(() => window.__ew.game.walkTo(4.2, 2.8, { kind: "point" }));
      await until(() => window.__ew.store.getState().hud.prompt?.kind === "karaoke" && !window.__ew.game.autoPath);
      assert.equal(await page.locator(".prompt-text").textContent(), words.enter);

      const snapshot = () => page.evaluate(() => {
        const { game } = window.__ew;
        return { position: game.player.root.position.toArray(), guests: game.extras.slice(0, 2).map((guest) => guest.root.position.toArray()) };
      });
      const before = await snapshot();
      await press(page.locator(".prompt"));
      const picker = page.locator(".karaoke-picker");
      await picker.waitFor();
      await picker.locator('[data-song="SG01"] img').evaluate((image) => image.decode());
      assert.equal(await picker.locator("[data-song]").count(), index.songs.length);
      await shot("picker");
      assert.equal(routes.length, 0, "browsing requests no words or recording");
      await picker.locator("select").selectOption("favorites");
      assert.equal(await picker.locator("[data-song]").count(), 1);
      await picker.locator("select").selectOption("all");
      await choose(index.songs.at(-1).id);
      await press(picker.locator("[data-pad-back]"));
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.song), index.songs.at(-1).id);

      if (!lt) {
        await choose("SB01");
        const sleeve = picker.locator(".karaoke-jacket .karaoke-sleeve");
        assert.match(await sleeve.textContent(), /SB01/);
        assert.equal(await picker.locator(".karaoke-jacket img").count(), 0);
        await shot("sb01-sleeve");
        await press(picker.locator("[data-pad-back]"));
      }

      await choose("SG01");
      await picker.locator(".karaoke-jacket img").evaluate((image) => image.decode());
      await shot("sg01-details");
      const size = await button(words.start).boundingBox();
      assert(size && size.height >= 44 && size.y >= 0 && size.y + size.height <= height);
      await press(button(words.start));
      await page.locator(".karaoke-performance").waitFor();
      assert(Math.abs(await pauseAt(7.1) - 7.1) < 0.15);
      assert(routes.some((request) => request.path === `${lt ? "/karaoke-files" : ""}/songs/data/SG01.json` && request.signed === lt));
      assert(routes.some((request) => request.path.endsWith("/songs/v1/SG01.mp3") && request.signed));
      await page.locator('.karaoke-current-line[data-line="0"] .karaoke-word.now').waitFor();
      await until(() => {
        const { rig } = window.__ew.game;
        return rig.stage && rig.cam.position.distanceTo(rig.stage.pos) < 0.03;
      });
      assert(await page.evaluate(() => !!window.__ew.game.player.rightHand.getObjectByName("karaoke-hand-mic")));
      await shot("sg01-line");
      await press(button(words.show));
      const natural = page.locator(".karaoke-natural");
      assert.equal(await natural.textContent(), texts.get("SG01").L[0].lt);
      assert.equal(await natural.getAttribute("lang"), lt ? "lt" : "en");
      await shot("sg01-meaning");
      await press(button(words.hide));
      assert.equal(await page.evaluate(() => window.__ew.radio.store.getState().karaoke.store.getState().status), "paused");

      await press(button(words.back));
      await picker.waitFor();
      await picker.getByRole("combobox", { name: words.mode }).selectOption("word");
      await press(button(words.start));
      await until(() => window.__ew.radio.store.getState().karaoke?.store.getState().status === "playing");
      await pauseAt(7.1);
      const blank = page.locator('.karaoke-current-line[data-line="0"] .karaoke-blank');
      await blank.waitFor();
      assert.equal((await blank.textContent()).trim(), "");
      assert.equal(await page.locator(".karaoke-natural, .karaoke-next").count(), 0);
      assert((await page.locator(".karaoke-current-line .karaoke-accessible").first().textContent()).includes(words.missing));
      const widthBefore = (await blank.boundingBox()).width;
      await shot("word-blank");
      await press(button(words.reveal));
      await blank.waitFor({ state: "detached" });
      const revealed = page.locator('.karaoke-current-line[data-line="0"] .karaoke-revealed');
      await revealed.waitFor();
      assert(Math.abs((await revealed.boundingBox()).width - widthBefore) < 1);
      assert.equal(await page.locator(".karaoke-current-line .karaoke-accessible").first().textContent(), texts.get("SG01").L[0].src);
      await until(() => document.activeElement?.classList.contains("karaoke-reading"));
      await shot("word-revealed");
      await page.evaluate(async (at) => {
        const take = window.__ew.radio.store.getState().karaoke;
        await take.seek(at);
        await take.resume();
      }, texts.get("SG01").L[1].s);
      await page.locator('.karaoke-current-line[data-line="1"] .karaoke-blank').waitFor();
      await page.locator('.karaoke-current-line[data-line="1"] .karaoke-revealed').waitFor();
      await page.evaluate(() => window.__ew.radio.store.getState().karaoke.pause());
      assert.equal(await page.evaluate(() => window.__ew.radio.store.getState().karaoke.store.getState().practice.completed), 1);
      await pauseAt(7.1);
      const speed = page.getByRole("combobox", { name: words.speed, exact: true });
      const canSlow = await page.evaluate(() => window.__ew.radio.store.getState().karaoke.store.getState().canSlow);
      if (canSlow) {
        await speed.selectOption("0.8");
        const clock = await page.evaluate(async () => {
          const take = window.__ew.radio.store.getState().karaoke;
          await take.resume();
          const from = take.position(), wall = performance.now();
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const elapsed = (performance.now() - wall) / 1000, media = take.position() - from;
          take.pause();
          return { elapsed, media, rate: take.store.getState().rate };
        });
        assert.equal(clock.rate, 0.8);
        assert(Math.abs(clock.media / clock.elapsed - 0.8) < 0.15);
      } else {
        assert(await speed.isDisabled());
        assert.equal(await speed.locator('option[value="0.8"]').count(), 0);
      }
      await shot("slow");
      await press(button(words.back));
      await picker.waitFor();
      await press(picker.locator("[data-pad-back]"));
      await choose("SV64");
      await press(button(words.start));
      await page.locator(".karaoke-performance").waitFor();
      assert.equal(await page.evaluate(() => window.__ew.radio.store.getState().karaoke.store.getState().rate), 1);
      const alternate = lt ? "SV64.mp3" : "SV64-en.mp3";
      assert(routes.some((request) => request.path.endsWith("/songs/v1/" + alternate) && request.signed));
      const sv64 = texts.get("SV64").L[0];
      await pauseAt(sv64.s + 0.25);
      assert.equal(await page.locator(".karaoke-current-line .karaoke-accessible").first().textContent(), sv64.src);
      await press(button(words.back));
      await picker.waitFor();
      await press(picker.locator("[data-pad-back]"));

      const echoId = lt ? "SG01" : "SB01", lyric = texts.get(echoId);
      await choose(echoId);
      await picker.getByRole("combobox", { name: words.mode }).selectOption("echo");
      await press(button(words.start));
      if (!lt) {
        const helper = page.locator('.karaoke-current-line .karaoke-accessible[lang="en"]');
        await helper.waitFor();
        assert.equal(await helper.textContent(), lyric.L[0].lt);
        await shot("sb01-helper");
        const target = page.locator('.karaoke-current-line .karaoke-accessible[lang="es-MX"]');
        await target.waitFor();
        assert.equal(await target.textContent(), lyric.L[0].src);
        await shot("sb01-target");
      }
      const turn = page.locator(".karaoke-turn");
      const progress = () => page.evaluate(() => window.__ew.radio.store.getState().karaoke.store.getState().practice);
      await turn.waitFor();
      assert.equal((await progress()).completed, 1);
      await shot("echo-turn");
      await press(button(words.repeat));
      await turn.waitFor({ state: "detached" });
      await turn.waitFor();
      assert.equal((await progress()).completed, 1);
      await page.evaluate(() => {
        const audio = window.__ew.audio, sfx = audio.sfx.bind(audio);
        window.__karaokeCheers = 0;
        audio.sfx = (name, ...args) => { if (name === "crowdCheer") window.__karaokeCheers++; return sfx(name, ...args); };
      });
      await press(button(words.next));
      const last = lyric.L.at(-1);
      await page.evaluate(async (seconds) => { await window.__ew.radio.store.getState().karaoke.seek(seconds); }, last.en?.s ?? last.s);
      await page.waitForFunction((index) => {
        const state = window.__ew.radio.store.getState().karaoke?.store.getState();
        return state?.practice?.turn?.rows.some((row) => state.timeline.lines[row].i === index);
      }, lyric.L.length - 1);
      await press(button(words.next));
      await page.locator(".karaoke-finish").waitFor({ timeout: 40000 });
      const result = await progress();
      assert.equal(result.total, lyric.L.length);
      assert(result.completed >= 2 && result.completed < result.total);
      assert.equal(await page.evaluate(() => window.__karaokeCheers), 1);
      if (!reduced) await page.locator(".confetti").waitFor();
      else assert.equal(await page.locator(".confetti").count(), 0);
      await shot("finish");
      await press(button(words.leave));
      await until(() => window.__ew.store.getState().hud.prompt?.kind === "karaoke");
      assert.deepEqual(await snapshot(), before);
      assert.equal(await page.evaluate(() => window.__ew.radio.store.getState().karaoke), null);
      await page.evaluate(() => window.__ew.game.walkTo(-1.2, -2.05, { kind: "point" }));
      await until(() => window.__ew.store.getState().hud.prompt?.kind === "talk" && !window.__ew.game.autoPath);
      await page.keyboard.press("e");
      await until(() => window.__ew.store.getState().conv.active && window.__ew.store.getState().conv.sitId === "s72-cafe");
      assert.deepEqual(errors, []);
      console.log(`ok ${profile} ${label} Café La Ceiba, jackets, recordings, Echo, finish and counter`);
    } catch (error) {
      await shot("failure").catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
