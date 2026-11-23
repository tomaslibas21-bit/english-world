// Use radio.mjs's server environment, with VITE_RADIO_INDEX=/songs/index.json and VITE_RADIO_FILES=/radio-files.
// RADIO_SPOTS_REAL=1 plays the town's own recorded spots (the real clip list and MP3s from the server) instead of the
// silent stand-ins, with the other spots taken out of the list so the same jingle and ad come up; the songs stay
// stand-ins either way.
import assert from "node:assert/strict";
import { openPhoneMenu } from "./screen-harness.mjs";
import { contentUrl, contextOptions, installTown, key, openContentPage, progress, screenshot, viewports } from "./life-harness.mjs";
import { silence } from "./radio-fixtures.mjs";

const { chromium, webkit } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const url = process.env.WORLD_TEST_URL || "http://127.0.0.1:5198";
const songDuration = 1.8, spotDuration = 4.8, real = process.env.RADIO_SPOTS_REAL === "1";
const wave = { contentType: "audio/wav", body: silence(songDuration) };
const spotWave = { contentType: "audio/wav", body: silence(spotDuration) };
const songs = Array.from({ length: 8 }, (_, i) => ({
  id: `G0${i + 1}`, t: `Song ${i + 1}`, tl: "", c: "g", n: i + 1, g: "", tp: "", d: songDuration, a: `/songs/audio/G0${i + 1}.mp3`,
}));
const lyric = { s: 0, e: songDuration, src: "Every evening", lt: "Kiekvieną vakarą", u: [["Every evening", "Kiekvieną vakarą", 1]], w: [[0, songDuration]], wt: ["Every evening"] };
const phoneAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 Version/26.6 Mobile/15E148 Safari/604.1";

async function radioContent(page) {
  const spotFile = contentUrl(url, "content/radioSpots");
  await openContentPage(page, url);
  return page.evaluate(async ([spots, hash]) => {
    const { RADIO_SPOTS, RADIO_SPOT_VOICE } = await import(spots);
    const { audioKey } = await import(hash);
    const all = RADIO_SPOTS.map((spot) => audioKey(RADIO_SPOT_VOICE, 1, spot.id));
    return ["jingle", "ad"].map((kind) => {
      const spot = RADIO_SPOTS.find((spot) => spot.kind === kind);
      return { ...spot, key: audioKey(RADIO_SPOT_VOICE, 1, spot.id), all };
    });
  }, [spotFile, contentUrl(url, "audio-key")]);
}

async function playFixture(context, ready, contents, mobile) {
  await context.addInitScript(installTown, { key, progress, manual: false });
  const page = await context.newPage(), errors = [], requested = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/songs/index.json", (route) => route.fulfill({ json: { lang: "en", songs } }));
  await page.route(/\/songs\/data\/G0\d\.json/, (route) => route.fulfill({ json: { L: [lyric] } }));
  await page.route(/\/songs\/audio\/G0\d\.mp3/, (route) => route.fulfill(wave));
  const manifest = ready ? Object.fromEntries(contents.map((spot) => [spot.key, spotDuration])) : {};
  await page.route(/\/audio[^/]*\/manifest\.json(?:\?|$)/, async (route) => {
    if (!(ready && real)) return route.fulfill({ json: manifest });
    const response = await route.fetch(), json = await response.json(), keep = contents.map((spot) => spot.key);
    for (const other of contents[0].all) if (!keep.includes(other)) delete json[other];
    assert(keep.every((k) => json[k] > 0), "the recorded spots are in the clip list");
    return route.fulfill({ response, json });
  });
  for (const spot of contents) {
    await page.route(new RegExp(`/${spot.key}\\.mp3(?:\\?|$)`), (route) => {
      requested.push(spot.id);
      if (ready && real) return route.continue();
      return route.fulfill(ready ? spotWave : { status: 404, body: "" });
    });
  }
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const until = (test, arg) => page.waitForFunction(test, arg, { timeout: 90000 });
  await until(() => window.__ew?.store.getState().screen === "play" && window.__ew.radio.store.getState().ready);
  await page.evaluate(() => {
    const { radio } = window.__ew;
    radio.setNat(true);
    radio.setNotes(true);
    radio.setPictures(true);
    window.__radioSpotsLog = [];
    radio.store.subscribe((s, before) => {
      if ((s.playing && !before.playing) || (s.playing && s.song !== before.song)) {
        window.__radioSpotsLog.push({ song: s.song?.id, spot: s.spot?.spot.id ?? null });
      }
    });
  });
  const button = page.locator(".radio-btn");
  const openRadio = async () => {
    if (mobile) await openPhoneMenu(page);
    await (mobile ? button.tap() : button.click());
  };
  await openRadio();
  const set = page.locator(".radio-set");
  await set.locator(".rs-x").click();
  return { page, until, set, errors, requested, openRadio };
}

for (const [name, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await engine.launch({ headless: true, ...(name === "chromium" ? {
    channel: process.env.WORLD_BROWSER_CHANNEL || undefined,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=document-user-activation-required"],
  } : {}) });
  try {
    const setup = await browser.newContext();
    const contents = await radioContent(await setup.newPage());
    await setup.close();
    const [jingle, ad] = contents;

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    try {
      const { page, until, errors, requested } = await playFixture(context, false, contents, false);
      await until(() => window.__radioSpotsLog.length >= 3);
      const sequence = await page.evaluate(() => window.__radioSpotsLog.slice(0, 3));
      assert.deepEqual(sequence, songs.slice(0, 3).map((song) => ({ song: song.id, spot: null })));
      assert.equal(await page.locator(".radio-strip[data-spot]").count(), 0);
      assert.deepEqual(requested, []);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }

    for (const [width, height] of viewports) {
      const mobile = Math.min(width, height) < 600;
      const context = await browser.newContext({ ...contextOptions(width, height), ...(mobile ? { userAgent: phoneAgent } : {}) });
      try {
        const { page, until, set, errors, requested, openRadio } = await playFixture(context, true, contents, mobile);
        const strip = page.locator(".radio-strip[data-spot]");
        await until((id) => document.querySelector(".radio-strip")?.dataset.spot === id, jingle.id);
        const first = await page.evaluate(() => window.__radioSpotsLog.slice(0, 3));
        assert.deepEqual(first, [{ song: "G01", spot: null }, { song: "G02", spot: null }, { song: "G02", spot: jingle.id }]);
        assert(jingle.lines.map((line) => line.en).includes(await strip.locator(".rt").innerText()));
        assert(jingle.lines.map((line) => line.lt).includes(await strip.locator(".radio-nat").innerText()));
        assert.equal(await strip.locator(".radio-notes, .radio-pic").count(), 0);
        await screenshot(page, `radio-jingle-${name}`, width, height);
        await until((id) => document.querySelector(".radio-strip")?.dataset.spot === id, ad.id);
        assert.equal(await strip.locator(".radio-spot-label").innerText(), "Reklama");
        const firstAdLine = await strip.locator(".rt").innerText();
        assert(ad.lines.map((line) => line.en).includes(firstAdLine));
        if (ad.lines.length > 1) {
          await until((first) => {
            const words = document.querySelector(".radio-strip[data-spot] .rt");
            return !!words && words.textContent !== first;
          }, firstAdLine);
        }
        await screenshot(page, `radio-ad-${name}`, width, height);
        await until((id) => {
          const log = window.__radioSpotsLog;
          const i = log.findIndex((entry) => entry.spot === id);
          return i >= 0 && log[i + 1] && !log[i + 1].spot;
        }, ad.id);
        const adSequence = await page.evaluate((id) => {
          const log = window.__radioSpotsLog, i = log.findIndex((entry) => entry.spot === id);
          return [log[i - 1].song, log[i + 1].song];
        }, ad.id);
        assert.deepEqual(adSequence, adSequence[0] === "G04" ? ["G04", "G05"] : ["G05", "G06"]);

        await strip.waitFor({ state: "visible", timeout: 30000 });
        const before = await page.evaluate(() => window.__ew.radio.store.getState().song.id);
        if (mobile) await openRadio();
        else await page.locator(".radio-plate").click();
        assert.equal(await set.locator(".rs-heart").count(), 0);
        const skip = set.locator(".rs-keys button").nth(3);
        await (mobile ? skip.tap() : skip.click());
        const next = songs[(songs.findIndex((song) => song.id === before) + 1) % songs.length].id;
        await until((id) => {
          const s = window.__ew.radio.store.getState();
          return s.song?.id === id && !s.spot && s.playing;
        }, next);
        assert(requested.includes(jingle.id) && requested.includes(ad.id));
        assert.deepEqual(errors, []);
        console.log(`ok radio spots ${name} ${width}×${height}${real ? " (recorded spots)" : ""}`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
