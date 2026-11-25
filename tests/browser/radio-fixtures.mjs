import assert from "node:assert/strict";
import { cardCentre, cardsFor } from "./fixtures/phrase-saves.mjs";

/** A silent recording of length seconds (8-bit mono PCM in a WAV file). */
export function silence(length, rate = 8000) {
  const n = Math.round(length * rate), wav = Buffer.alloc(44 + n, 128);
  wav.write("RIFF", 0); wav.writeUInt32LE(36 + n, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate, 28); wav.writeUInt16LE(1, 32); wav.writeUInt16LE(8, 34); wav.write("data", 36); wav.writeUInt32LE(n, 40);
  return wav;
}

export async function keepRadioLocal(page, base) {
  const local = new URL(base);
  assert(["localhost", "127.0.0.1", "[::1]"].includes(local.hostname), "radio fixtures require a local server");
  await page.route("**/*", (route) => new URL(route.request().url()).origin === local.origin ? route.continue() : route.abort());
}

export async function saveRadioPhrase(page, mobile, helperLang, line, sourceLabel) {
  const button = page.locator(".rs-phrase-panel [data-phrase-save]");
  await button.waitFor();
  const name = helperLang === "lt" ? ["Į korteles", "Kortelėse"] : ["Add to cards", "In cards"];
  assert.equal(await button.getAttribute("aria-label"), name[0]);
  assert.equal(await button.getAttribute("aria-pressed"), "false");
  assert.deepEqual(await cardsFor(page, line.en), []);
  if (!mobile) await button.focus();
  const sample = () => page.evaluate(() => {
    const { radio, store, game } = window.__ew;
    const { on, playing, station, song, spot, liked, counts, lyrics, lyricSize, nat, notes, pictures, shuffle, open } = radio.store.getState();
    const { hud, settings } = store.getState();
    return {
      state: { on, playing, station, song: song?.id, spot: spot?.spot.id, liked, counts, lyrics, lyricSize, nat, notes, pictures, shuffle, open,
        panel: hud.panel, settings, keys: [...(game.keys ?? [])], input: window.__radioTownInput, activation: window.__radioTownActivation,
        favoriteStorage: localStorage.getItem("fluentsteps.songs.favorites.v1") },
      position: spot ? radio.spotPosition() : radio.position(),
      observedAt: performance.now(),
    };
  });
  const box = await cardCentre(button, 44);
  const before = await sample();
  let saved;
  for (const key of ["Enter", "Space"]) {
    if (mobile) await page.touchscreen.tap(box.x, box.y);
    else await button.press(key);
    assert.equal(await button.getAttribute("aria-label"), name[1]);
    assert.equal(await button.getAttribute("aria-pressed"), "true");
    assert.deepEqual(await cardCentre(button, 44), box);
    if (!mobile) assert(await button.evaluate((element) => document.activeElement === element), "save keeps keyboard focus");
    const after = await sample();
    assert.deepEqual(after.state, before.state, "save leaves radio, settings, favorites and town input alone");
    if (before.state.playing) {
      const elapsed = after.position - before.position;
      assert(elapsed >= 0 && elapsed <= (after.observedAt - before.observedAt) / 1000 + 0.35, "save leaves the playing clock running forward");
    } else assert.equal(after.position, before.position, "save leaves the paused clock still");
    const cards = await cardsFor(page, line.en);
    if (saved) assert.deepEqual(cards, [saved], "repeated activation preserves the original card");
    else {
      assert.equal(cards.length, 1);
      [saved] = cards;
      assert.deepEqual([saved.en, saved.lt, saved.sentence.en, saved.sentence.lt, saved.situationId, saved.sourceLabel],
        [line.en, line.lt, line.en, line.lt, "radio", sourceLabel]);
    }
  }
  return saved;
}
