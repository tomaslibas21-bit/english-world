// Slate Cove's first keeper and the three-stone gate. Includes the actual reader and My Cards.
import assert from "node:assert/strict";
import { setTimeout as wall } from "node:timers/promises";
import {
  DEVICES, TIDE, TIDE_LINE, CAVE, at, audioKey, bramTalk, calls, cardKey, closeRune, crossIn, cue,
  distance, exitVia, forward, glyph, inspectPicker, interact, openRune, prompt, solve, suite, surface,
  toolbar, trail, watch,
  TOAST_WAIT,
} from "./fixtures/mh-cave.mjs";

const tideKey = audioKey("g_coach_m", 1, TIDE_LINE[0]);
const stored = (run) => run.ev(() => JSON.parse(localStorage.getItem("english-world-cards-v1") || "{}").cards || []);
const tideCredit = (run) => run.ev(() => window.__ew.store.getState().progress.phrases["x08-old-oak:tide_01"]);

async function saveReader(run) {
  const save = run.page.locator(".glyph-card [data-phrase-save]");
  assert.equal(await save.getAttribute("aria-label"), "Į korteles");
  assert.equal((await stored(run)).filter((c) => cardKey(c.en) === cardKey(TIDE_LINE[0])).length, 0);
  await run.press(save);
  const original = (await stored(run)).filter((c) => cardKey(c.en) === cardKey(TIDE_LINE[0]));
  assert.equal(original.length, 1);
  const [card] = original;
  assert.deepEqual([card.en, card.lt, card.sentence.en, card.sentence.lt, card.situationId, card.sourceLabel],
    [...TIDE_LINE, ...TIDE_LINE, "x08-old-oak", CAVE[0]]);
  assert.equal(await save.getAttribute("aria-label"), "Kortelėse");
  await run.press(save);
  assert.deepEqual((await stored(run)).filter((c) => cardKey(c.en) === cardKey(TIDE_LINE[0])), original);
  return original;
}

async function firstRune(run) {
  await at(run, -6.4, -24.5, -Math.PI / 2);
  const q = await openRune(run, "tide-1");
  const card = run.page.locator(".glyph-card"), reading = card.locator(".glyph-text");
  assert.deepEqual([q.text, q.lt, q.options.length, q.shown, q.solved, q.wrong], [...TIDE_LINE, 3, false, false, []]);
  assert.equal(await reading.count(), 0);
  assert.equal(await card.locator("[data-phrase-save]").count(), 0);
  await run.mark("tide-hidden");
  await run.press(card.locator(".glyph-show"));
  await cue(run, reading, TIDE_LINE[0]);
  await run.press(card.getByRole("button", { name: "IPA", exact: true }));
  const ipa = reading.locator(".ipa:visible");
  assert.equal(await ipa.count(), 5);
  assert((await ipa.allTextContents()).every((s) => s.trim()));
  await run.mark("tide-reveal-ipa");

  const wrong = (q.answer + 1) % 3;
  const choice = card.locator(".glyph-opt").nth(wrong);
  await run.press(choice);
  await run.wait(() => window.__ew.store.getState().hud.glyph?.wrong.length === 1, "wrong meaning is registered", 10_000);
  const incorrect = await glyph(run);
  assert(incorrect.shown && !incorrect.solved && !(await run.state()).cave.lit.length);
  assert(await choice.isDisabled());
  assert.match(await choice.getAttribute("class"), /\bwrong\b/);
  assert.equal(await choice.evaluate((button) => getComputedStyle(button).textDecorationLine), "line-through");
  await surface(run, card, ["Pamėgink pasirinkti kitą reikšmę.", TIDE_LINE[1]]);
  await run.mark("tide-wrong");

  await run.withoutFrameCapture(() => replayNearDeadline(run, q, card, reading));
  const original = await saveReader(run);
  await run.mark("tide-solved-saved");
  await closeRune(run);
  assert.deepEqual((await watch(run)).hush, [true, false]);
  assert.equal(await run.ev(() => window.__ew.audio.hushed.has("cave-reader")), false);
  assert.equal((await tideCredit(run)).count, 1);
  assert.equal((await run.state()).card.lit, 1);
  return original;
}

async function replayNearDeadline(run, q, card, reading) {
  await solve(run, q, TIDE_LINE);
  const node = await reading.elementHandle();
  assert.equal(await reading.locator(".u > .lt").nth(1).innerText(), "potvynis");
  assert.equal(await reading.locator(".u > .lt").nth(3).innerText(), "Jūsų");
  assert.equal(await card.locator(".glyph-opt").count(), 0);
  assert.deepEqual((await run.state()).cave.lit, ["tide-1"]);
  assert.equal((await tideCredit(run)).count, 1);
  // 79 frames bring the simulation to 3.95 s while native time tracks the former deadline.
  const solvedAt = (await watch(run)).solvedAt;
  for (let i = 0; i < 79; i += 4) {
    const frames = Math.min(4, 79 - i);
    const elapsed = await run.ev((t) => window.__caveWallNow() - t, solvedAt);
    await wall(Math.max(0, (i + frames) * 50 - elapsed));
    await run.step(frames);
  }
  const before = (await calls(run)).length;
  await run.page.keyboard.press("r");
  const replay = () => calls(run).then((entries) => entries[before]);
  await run.until(replay, "R starts the solved line", { timeout: 5000, frames: 0 });
  assert((await replay()).at - solvedAt >= 3950 && (await replay()).at - solvedAt < 4200, JSON.stringify(await replay()));
  await run.wait(() => window.__ew.voice() === "playing", "the actual recorded cue plays", 5000, undefined, 0);
  const recording = await run.ev(() => {
    const { audio } = window.__ew, clip = audio.clip;
    return { key: clip.key, length: clip.el?.duration ?? audio.manifest[clip.key] };
  });
  assert.equal(recording.key, tideKey);
  assert(Math.abs(recording.length - 1.2) < 0.01);
  await wall(350);
  await run.step(7);
  assert(await run.ev((t) => window.__caveWallNow() - t > 4300, solvedAt));
  assert.equal((await replay()).end, null);
  assert(await card.isVisible() && (await glyph(run)).solved);
  const full = await run.until(async () => (await replay())?.end && replay(), "replay settles", { timeout: 5000, frames: 0 });
  assert.deepEqual([full.voice, full.speed, full.text, full.glyph, full.result, full.aborted],
    ["g_coach_m", 1, TIDE_LINE[0], "tide-1", true, false]);
  assert(full.end - full.at >= 1100);
  assert.equal((await calls(run)).filter((c) => c.glyph === "tide-1" && c.solved).length, 1);
  assert(run.requests.some((r) => r.key === tideKey && r.duration === 1.2));
  await wall(910);
  await run.step(19);
  assert(await card.isVisible() && await node.evaluate((el) => el === document.querySelector(".glyph-card.solved .glyph-text")));
}

async function main(run) {
  const course = (await run.state()).course;
  assert(course);
  await inspectPicker(run);
  await trail(run, "main");
  const start = await crossIn(run, "main");
  assert(start.card.n === 1 && start.card.of === 5 && start.card.open === 1 && /Bram/.test(start.card.next));
  assert(start.calls > 3 && start.calls < 40, JSON.stringify(start));
  await surface(run, run.page.locator(".cave-card"), ["Tide Hall", "1 / 5"]);
  await surface(run, run.page.locator(".town-toasts .toast.tip").first(), ["Radai Skalūnų įlankos olą!", "Pasikalbėk su Bramu ant pilkojo tako."]);

  await forward(run, async () => {
    await prompt(run, "talk", "cave_bram", ["Pasikalbėti su Bramu"]);
    await run.step(50);
    const held = await run.state();
    assert(held.z > -7.6 && held.z < -6.7 && held.mask === 0 && held.path === 0, JSON.stringify(held));
  });
  await run.mark("bram-gate-held");
  await at(run, 0.3, -2.5, Math.PI);
  await prompt(run, "talk", "cave_bram", ["Pasikalbėti su Bramu"], 15_000);
  await interact(run);
  await bramTalk(run);
  const passed = await run.state();
  assert.deepEqual(passed.cave.passed, ["bram"]);
  assert.deepEqual((await watch(run)).events, [["cave-pass", "bram"]]);
  assert.equal(passed.course, course);
  assert(await run.ev(() => {
    const g = window.__ew.game, route = g.orderedSituations();
    return route.length >= 50 && !route.some((q) => q.id === "x06-bram");
  }));
  await at(run, 0, -6, Math.PI);
  await forward(run, () => run.wait(() => window.__ew.game.player.root.position.z < -11, "walk through Bram's open gate", 20_000));
  assert((await run.state()).z <= -11);
  const original = await firstRune(run);
  assert.equal((await watch(run)).toasts["Akmuo sušvito!"].length, 1);

  // Same isolated two-solve gate fixture as the donor. Walk against the collider without a route.
  await run.ev((ids) => window.__ew.store.getState().updateProgress((p) => { p.cave.lit = ids; }), TIDE.slice(0, 2));
  await at(run, -7.4, -43.2, Math.PI);
  await forward(run, () => run.step(50));
  const blocked = await run.state();
  assert(blocked.z > -48.5 && blocked.z < -44 && blocked.mask === 1 && blocked.path === 0 && blocked.card.lit === 2 && blocked.card.open === 1, JSON.stringify(blocked));
  assert.match(blocked.card.count, /2 iš 5/);
  await surface(run, run.page.locator(".cave-card"), ["Tide Hall", "Čia šviečia 2 iš 3 akmenų"]);
  await run.mark("two-stones-gate-held");

  await at(run, 2.05, -37.6, Math.PI + 0.25);
  const q = await openRune(run, "tide-3");
  const masksBefore = (await watch(run)).masks.length;
  await solve(run, q, ["The oak holds up the sky.", "Ąžuolas laiko dangų."]);
  const before = (await calls(run)).length;
  await run.press(run.page.locator(".glyph-play"));
  await run.wait(() => window.__ew.voice() === "playing", "real replay begins before explicit close", 5000, undefined, 0);
  await closeRune(run, true);
  const cut = await run.until(async () => (await calls(run))[before]?.end && (await calls(run))[before],
    "close settles the interrupted playback", { timeout: 5000, frames: 0 });
  assert.deepEqual([cut.text, cut.aborted, cut.result], ["The oak holds up the sky.", true, false]);
  assert(cut.end - cut.at < 1200);
  assert.deepEqual((await watch(run)).hush, [true, false, true, false]);
  await surface(run, run.page.locator(".town-toasts .toast").filter({ hasText: "Šviečia visi trys akmenys!" }),
    ["Šviečia visi trys akmenys!", "Kelias į Šaknų sodą atviras."], TOAST_WAIT);
  await run.wait(() => window.__ew.store.getState().hud.cave?.open === 2, "Tide opens Root Garden", 15_000);
  await wall(4300);
  await run.step(20);
  assert.deepEqual((await watch(run)).masks.slice(masksBefore), [3]);
  assert.equal((await watch(run)).toasts["Šviečia visi trys akmenys!"].length, 1);
  const third = await run.state();
  assert.deepEqual(third.cave.lit, TIDE);
  assert.equal(third.card.open, 2);
  assert(await run.ev(() => {
    const { game, store } = window.__ew, p = store.getState().progress;
    return !game.orderedSituations().some((sit) => p.sits[sit.id]?.completions);
  }));

  await at(run, -7.4, -43.2, Math.PI + 0.43);
  await forward(run, () => run.wait(() => window.__ew.game.player.root.position.z < -49, "walk through g2 into Root Garden", 20_000));
  assert((await run.state()).z < -49 && (await run.state()).card.open === 2);
  await run.mark("three-stones-gate-open");

  await at(run, 0, 4.2, 0);
  const outside = await exitVia(run, "main");
  assert(distance(outside, [-131.8, -63]) < 4);
  await crossIn(run, "main");
  assert.deepEqual((await run.state()).cave.lit, TIDE);

  await at(run, -3, -30, Math.PI);
  await run.step(8);
  await run.ev(() => window.__ew.game.savePlace());
  const saved = await run.state();
  await run.enter(true);
  const restored = await run.state();
  assert(restored.zone === "gruta" && distance(restored, [saved.x, saved.z]) < 0.1);
  assert.deepEqual(restored.cave, saved.cave);
  assert.equal(restored.course, course);
  assert.equal(restored.visits, saved.visits);
  await toolbar(run, "Kuprinė");
  await run.press(run.page.getByRole("tab", { name: /^Išsaugotos kortelės/ }));
  const row = run.page.locator(".cd-row").filter({ has: run.page.getByText(TIDE_LINE[0], { exact: true }) });
  await surface(run, row, TIDE_LINE);
  assert.equal(await row.count(), 1);
  assert.equal(await row.locator(".cd-en").getAttribute("lang"), "en");
  assert.equal(await row.locator(".cd-lt").getAttribute("lang"), "lt");
  assert.deepEqual((await stored(run)).filter((c) => cardKey(c.en) === cardKey(TIDE_LINE[0])), original);
  await run.mark("my-cards-reloaded");
}

async function missingMedia(run, listed) {
  await run.wait(() => !window.__ew.audio.initializing, "manifest request finishes", 15_000);
  assert.equal(await run.ev(() => window.__ew.audio.ready), listed);
  const q = await openRune(run, "tide-1");
  if (!listed) assert(q.shown && q.unavailable);
  else await run.wait(() => {
    const q = window.__ew.store.getState().hud.glyph;
    return q?.shown && q.unavailable;
  }, "listed clip fails and reveals the authored cue", 12_000, undefined, 0);
  assert.equal(run.requests.some((r) => r.key === tideKey), listed);
  assert(run.requests.some((r) => r.manifest === (listed ? "listed-missing" : "no-manifest")));
  assert.equal(await run.ev(() => typeof speechSynthesis), "undefined");
  await cue(run, run.page.locator(".glyph-text"), TIDE_LINE[0]);
  await surface(run, run.page.locator(".glyph-card"), ["Perskaityk žodžius ir pasirink jų reikšmę.", TIDE_LINE[1]]);
  if (listed) {
    const played = (await calls(run)).filter((c) => c.glyph === "tide-1");
    assert.equal(played.length, 1);
    assert.deepEqual([played[0].text, played[0].voice, played[0].result], [TIDE_LINE[0], "g_coach_m", false]);
  }
  await solve(run, q, TIDE_LINE);
  await surface(run, run.page.locator(".glyph-card"), ["Čia gali dar kartą perskaityti frazę.", TIDE_LINE[1]]);
  const attempts = (await calls(run)).length;
  await run.press(run.page.locator(".glyph-play"));
  assert.equal((await calls(run)).length, attempts);
  await wall(4300);
  await run.step(86);
  assert(await run.page.locator(".glyph-card.solved").isVisible());
  await run.mark("text-only-solved");
  await closeRune(run);
  assert.deepEqual((await watch(run)).hush, [true, false]);
}

await suite("mh-cave", async (run) => {
  for (const device of DEVICES) {
    await run(device, "first-visit", {}, main);
    for (const media of ["no-manifest", "listed-missing"]) {
      await run(device, media, {
        media, save: { cave: { passed: ["bram"], lit: [], seen: true }, place: { zone: "gruta", x: -6.4, z: -24.5, rot: -Math.PI / 2 } },
      }, (view) => missingMedia(view, media === "listed-missing"));
    }
  }
});
