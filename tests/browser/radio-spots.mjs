// See README-life.md for the local Vite server and browser profiles.
import assert from "node:assert/strict";
import { openPhoneMenu } from "./screen-harness.mjs";
import { assertTownProfile, contentUrl, contextOptions, helperLang, installTown, key, learnerLabel, lifeContentUrl, openContentPage, profileName, progress, radioContentUrl, screenshot, targetLang, variety, viewports } from "./life-harness.mjs";
import { cardCentre, cardsFor, checkCardList } from "./fixtures/phrase-saves.mjs";
import { keepRadioLocal, saveRadioPhrase, silence } from "./radio-fixtures.mjs";

const { chromium, webkit } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const url = process.env.WORLD_TEST_URL || "http://127.0.0.1:5198";
const songDuration = 1.8, spotDuration = 4.8;
const phraseDuration = 36;
const wave = { contentType: "audio/wav", body: silence(songDuration) };
const spotWave = { contentType: "audio/wav", body: silence(spotDuration) };
const songs = Array.from({ length: 8 }, (_, i) => ({
  id: `G0${i + 1}`, t: `Song ${i + 1}`, tl: "", c: "g", n: i + 1, g: "", tp: "", d: songDuration, a: `/songs/audio/G0${i + 1}.mp3`,
}));
const phoneAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 Version/26.6 Mobile/15E148 Safari/604.1";

async function radioContent(page) {
  const spotFile = lifeContentUrl(url, "radioSpots");
  await keepRadioLocal(page, url);
  await openContentPage(page, url);
  return page.evaluate(async ([spots, hash, radio]) => {
    const { RADIO_SPOTS, RADIO_SPOT_VOICE } = await import(spots);
    const { RADIO_NAME } = await import(radio);
    const { audioKey } = await import(hash);
    const contents = ["jingle", "ad"].map((kind) => {
      const spot = RADIO_SPOTS.find((spot) => spot.kind === kind);
      return { ...spot, key: audioKey(RADIO_SPOT_VOICE, 1, spot.id) };
    });
    return { contents, radioName: RADIO_NAME };
  }, [spotFile, contentUrl(url, "audio-key"), radioContentUrl(url)]);
}

async function playFixture(context, ready, contents, radioName, mobile, phraseLines) {
  await context.addInitScript(installTown, { key, progress, manual: false, variety });
  const page = await context.newPage(), errors = [], requested = [];
  await keepRadioLocal(page, url);
  page.on("pageerror", (e) => errors.push(e.message));
  const { en, lt } = phraseLines ? { en: contents[1].lines[2].en, lt: " " } : contents[0].lines[0];
  const lyric = { s: 0, e: songDuration, src: en, lt, u: [[en, lt, 1]], w: [[0, songDuration]], wt: [en] };
  const fixtureSongs = phraseLines ? [{ ...songs[0], d: phraseDuration }, ...songs.slice(1)] : songs;
  const phraseWave = phraseLines && { contentType: "audio/wav", body: silence(phraseDuration) };
  await page.route("**/songs/index.json", (route) => route.fulfill({ json: { lang: targetLang, songs: fixtureSongs } }));
  await page.route(/\/songs\/data\/G0\d\.json/, (route) => route.fulfill({ json: { L: phraseLines && route.request().url().includes("G01.json") ? phraseLines : [lyric] } }));
  await page.route(/\/songs\/audio\/G0\d\.mp3/, (route) => route.fulfill(phraseWave && route.request().url().includes("G01.mp3") ? phraseWave : wave));
  const manifest = ready ? Object.fromEntries(contents.map((spot) => [spot.key, phraseLines ? phraseDuration : spotDuration])) : {};
  await page.route(/\/audio[^/]*\/manifest\.json(?:\?|$)/, (route) => route.fulfill({ json: manifest }));
  for (const spot of contents) {
    await page.route(new RegExp(`/${spot.key}\\.mp3(?:\\?|$)`), (route) => {
      requested.push(spot.id);
      return route.fulfill(ready ? phraseWave || spotWave : { status: 404, body: "" });
    });
  }
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await assertTownProfile(page, url);
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
  const name = set.locator(".rs-name");
  assert.equal(await name.textContent(), radioName);
  // The Puerto Colibrí skin displays its name in uppercase in both learner layers.
  assert.equal(await name.innerText(), targetLang === "es" ? radioName.toLocaleUpperCase("es") : radioName);
  await set.locator(".rs-x").click();
  return { page, until, set, errors, requested, openRadio };
}

async function checkRadioPhrases(context, contents, radioName, mobile) {
  const [jingle, ad] = contents;
  const [paired, translated] = ad.lines;
  const songLine = ({ en, lt }, s, e) => ({ s, e, src: en, lt, u: [[en, lt, 1]], w: [[s, e]], wt: [en] });
  const phraseLines = [songLine(paired, 0, 12), { ...songLine(translated, 32, 35), en: { s: 12, e: 31 } }];
  const { page, until, set, errors, openRadio } = await playFixture(context, true, contents, radioName, mobile, phraseLines);
  const press = (locator) => mobile ? locator.tap() : locator.click();
  const openSet = () => mobile ? openRadio() : press(page.locator(".radio-plate"));
  const strip = page.locator(".radio-strip");
  const toggle = set.locator(".rs-phrases");
  const chooser = set.locator(".rs-phrase-panel");
  const save = chooser.locator("[data-phrase-save]");
  const heart = set.locator(".rs-heart");
  await until((text) => document.querySelector(".radio-strip .rt")?.textContent === text, paired.en);
  assert.equal(await strip.locator(".radio-nat").textContent(), paired.lt);
  assert.equal(await strip.getAttribute("aria-hidden"), "true");
  assert.equal(await strip.locator("button, a, [tabindex]").count(), 0);
  assert.equal(await strip.evaluate((element) => getComputedStyle(element).pointerEvents), "none");

  await openSet();
  await press(heart);
  assert.equal(await heart.getAttribute("aria-pressed"), "true");
  // Playback advances with the set open. Both the line that led here and the helper-only row are available.
  await until(() => !!document.querySelector(".radio-strip .radio-line.translation"));
  assert.equal(await strip.locator(".radio-line.translation .rt").allTextContents().then((words) => words.join(" ")), translated.lt);
  await page.evaluate(() => {
    window.__radioTownInput = 0;
    window.__radioTownActivation = 0;
    document.querySelector(".stage canvas").addEventListener("pointerdown", () => { window.__radioTownInput++; });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") window.__radioTownActivation++;
    });
  });
  await cardCentre(toggle, 44);
  assert.equal(await toggle.getAttribute("aria-label"), learnerLabel("Frazės", "Phrases"));
  await press(toggle);
  const pick = chooser.getByRole("combobox", { name: learnerLabel("Frazės", "Phrases") });
  await pick.waitFor();
  assert(await strip.locator(".radio-line.translation").isVisible(), "the Spanish singing has yet to appear");
  if (mobile) await chooser.evaluate((element) => { element.style.fontSize = "200%"; });
  const selectBox = await cardCentre(pick, 44), saveBox = await cardCentre(save, 44);
  assert(selectBox.x + selectBox.width / 2 <= saveBox.x - saveBox.width / 2, "the chooser and save have separate hit areas");
  assert.deepEqual(await pick.locator("option").allTextContents(), [translated.en, paired.en]);
  assert.equal(await chooser.locator(`small[lang="${helperLang}"]`).textContent(), translated.lt);
  await pick.selectOption({ label: paired.en });
  assert.equal(await chooser.locator(`small[lang="${helperLang}"]`).textContent(), paired.lt);
  const pairedCard = await saveRadioPhrase(page, mobile, helperLang, paired, radioName);
  await press(toggle);
  await press(set.locator(".rs-knob"));
  await until(() => !window.__ew.radio.store.getState().playing);
  await press(toggle);
  await save.waitFor();
  assert.equal(await pick.locator("option:checked").textContent(), translated.en);
  const translatedCard = await saveRadioPhrase(page, mobile, helperLang, translated, radioName);
  assert.deepEqual(await cardsFor(page, translated.lt), [], "the helper-only singing was never saved as the target");
  await press(toggle);
  await press(set.locator(".rs-knob"));
  await press(set.locator(".rs-x"));

  assert.equal(jingle.id, "spot:jingle-1");
  await until((id) => document.querySelector(".radio-strip")?.dataset.spot === id, jingle.id);
  assert.equal(await strip.locator(".rt").textContent(), jingle.lines[0].en);
  assert.equal(await strip.locator(".radio-nat").textContent(), jingle.lines[0].lt);
  await openSet();
  assert.equal(await heart.count(), 0, "a spot has no song favorite button");
  await press(toggle);
  await save.waitFor();
  assert.equal(await pick.locator("option:checked").textContent(), jingle.lines[0].en);
  assert.deepEqual(await pick.locator("option").allTextContents(), [jingle.lines[0].en, translated.en], "the intervening blank-helper lyric offers no card");
  const jingleCard = await saveRadioPhrase(page, mobile, helperLang, jingle.lines[0], radioName);
  const viewport = page.viewportSize();
  await screenshot(page, "radio-phrase-save", viewport.width, viewport.height);

  const station = await page.evaluate(() => window.__ew.radio.store.getState().station);
  await press(set.locator(".rs-x"));
  const point = await strip.evaluate((element) => {
    const r = element.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    return { x, y, hit: document.elementFromPoint(x, y)?.matches(".stage canvas"), through: getComputedStyle(element).pointerEvents };
  });
  assert(point.hit && point.through === "none", JSON.stringify(point));
  await (mobile ? page.touchscreen.tap(point.x, point.y) : page.mouse.click(point.x, point.y));
  assert.equal(await page.evaluate(() => window.__radioTownInput), 1, "tapping the caption reached the town");
  await page.reload({ waitUntil: "domcontentloaded" });
  await until(() => window.__ew?.store.getState().screen === "play" && window.__ew.radio.store.getState().ready);
  assert.deepEqual(await page.evaluate(() => {
    const { station, on, playing, counts } = window.__ew.radio.store.getState();
    return { station, on, playing, favorites: counts.favorites };
  }), { station, on: false, playing: false, favorites: 1 });
  const cards = [pairedCard, translatedCard, jingleCard];
  await checkCardList(page, { learner: helperLang, target: targetLang, cards, press });
  for (const card of cards) assert.deepEqual(await cardsFor(page, card.en), [card]);
  assert.deepEqual(errors, []);
}

for (const [name, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await engine.launch({ headless: true, ...(name === "chromium" ? {
    channel: process.env.WORLD_BROWSER_CHANNEL || undefined,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=document-user-activation-required"],
  } : {}) });
  try {
    const setup = await browser.newContext();
    const { contents, radioName } = await radioContent(await setup.newPage());
    await setup.close();
    const [jingle, ad] = contents;

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    try {
      const { page, until, errors, requested } = await playFixture(context, false, contents, radioName, false);
      await until(() => window.__radioSpotsLog.length >= 3);
      const sequence = await page.evaluate(() => window.__radioSpotsLog.slice(0, 3));
      assert.deepEqual(sequence, songs.slice(0, 3).map((song) => ({ song: song.id, spot: null })));
      assert.equal(await page.locator(".radio-strip[data-spot]").count(), 0);
      assert.deepEqual(requested, []);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }

    if (targetLang === "es") {
      const mobile = name === "webkit";
      const context = await browser.newContext(mobile ? { ...contextOptions(390, 844), userAgent: phoneAgent } : contextOptions(1280, 800));
      try {
        await checkRadioPhrases(context, contents, radioName, mobile);
        console.log(`ok ${profileName} radio phrase saves ${name}`);
      } finally {
        await context.close();
      }
    }

    for (const [width, height] of viewports) {
      const mobile = Math.min(width, height) < 600;
      const context = await browser.newContext({ ...contextOptions(width, height), ...(mobile ? { userAgent: phoneAgent } : {}) });
      try {
        const { page, until, set, errors, requested, openRadio } = await playFixture(context, true, contents, radioName, mobile);
        const strip = page.locator(".radio-strip[data-spot]");
        const checkSpotWords = async (spot) => {
          const visible = await strip.evaluate((node, [target, helper]) => ({
            id: node.getAttribute("data-spot"),
            text: node.querySelector(`.rt[lang="${target}"]`)?.textContent,
            meaning: node.querySelector(`.radio-nat[lang="${helper}"]`)?.textContent,
          }), [targetLang, helperLang]);
          assert.equal(visible.id, spot.id);
          const line = spot.lines.find(({ en }) => en === visible.text);
          assert(line, `${spot.id} shows a ${targetLang} line from the edition`);
          assert.equal(visible.meaning, line.lt, `${spot.id} shows the matching ${helperLang} meaning`);
          return line.en;
        };
        await until((id) => document.querySelector(".radio-strip")?.dataset.spot === id, jingle.id);
        const first = await page.evaluate(() => window.__radioSpotsLog.slice(0, 3));
        assert.deepEqual(first, [{ song: "G01", spot: null }, { song: "G02", spot: null }, { song: "G02", spot: jingle.id }]);
        await checkSpotWords(jingle);
        assert.equal(await strip.locator(".radio-notes, .radio-pic").count(), 0);
        await screenshot(page, `radio-jingle-${name}`, width, height);
        await until((id) => document.querySelector(".radio-strip")?.dataset.spot === id, ad.id);
        assert.equal(await strip.locator(".radio-spot-label").innerText(), learnerLabel("Reklama", "Ad"));
        const firstAdLine = await checkSpotWords(ad);
        if (ad.lines.length > 1) {
          await until(({ id, first }) => {
            const words = document.querySelector(`.radio-strip[data-spot="${id}"] .rt`);
            return !!words && words.textContent !== first;
          }, { id: ad.id, first: firstAdLine });
          await checkSpotWords(ad);
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
        console.log(`ok ${profileName} radio spots ${name} ${width}×${height}`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
