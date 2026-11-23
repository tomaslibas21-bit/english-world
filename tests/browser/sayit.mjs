// Vite dev server. WORLD_SIZES and SAY_IT_GAMES can narrow the run. SAY_IT_SHOTS saves screenshots.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const storage = process.env.WORLD_STORAGE || "english-world";
const sizes = (process.env.WORLD_SIZES || "390x844,390x664,844x390,1280x800").split(",");
const games = (process.env.SAY_IT_GAMES || "road,sea,billiards,gofish").split(",");
const shots = process.env.SAY_IT_SHOTS;
if (shots) await mkdir(shots, { recursive: true });
const words = {
  mic: "Pasakyti garsiai", hit: "Puikiai pasakyta! +1", miss: "Beveik! Galite bandyti dar",
  tip: "Pasakykite garsiai – gausite +1", stat: "Pasakyta garsiai",
};
const finished = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
const progress = {
  version: 1,
  profile: {
    name: "Test", surname: "Tester", gender: "f", lookId: "f1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" },
  },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0, sounds: 0, cameraFollow: true },
  sits: { "s65a-passport": finished, "s65b-baggage": finished, "s66-taxi": finished },
  phrases: {}, seenIntro: {}, started: 1, coach: { done: true, run: true, view: true, seen: { list: true } },
};
const places = {
  road: { zone: "town", x: -40, z: -13.65, rot: 0 },
  sea: { zone: "town", x: -10, z: -69.5, rot: Math.PI },
  billiards: { zone: "town", x: -14, z: 31.4, rot: Math.PI },
  gofish: { zone: "dans-house", x: 1.5, z: 0.25, rot: Math.PI },
};

function init({ key, save, supported }) {
  localStorage.setItem(key, JSON.stringify(save));
  sessionStorage.setItem("ew-play-now", "1");
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
  if (supported) {
    let active;
    window.SpeechRecognition = class {
      start() {
        active = this;
        this.onstart?.();
      }
      abort() {
        if (active === this) active = null;
        this.onend?.();
      }
    };
    window.__sayItHear = (transcript) => {
      if (!active) throw new Error("SpeechRecognition is idle");
      const result = Object.assign([{ transcript }], { isFinal: true });
      active.onspeechstart?.();
      active.onresult?.({ resultIndex: 0, results: [result] });
      active.onspeechend?.();
    };
  }

  let now = 1000;
  let seed = 20261122;
  Math.random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
  performance.now = () => now;
  const frames = [];
  window.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
  window.cancelAnimationFrame = () => {};
  window.__stepSayIt = (count) => {
    for (let i = 0; i < count; i++) {
      now += 50;
      for (const fn of frames.splice(0)) fn(now);
    }
  };
}

const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio"],
});

async function testGame(context, game, size, touch, supported) {
  const label = `${size} ${game} ${supported ? "speech" : "no speech"}`;
  await context.addInitScript(init, { key: `${storage}-progress-v1`, save: { ...progress, place: places[game] }, supported });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base, { waitUntil: "domcontentloaded" });
  const step = (count = 4) => page.evaluate((n) => window.__stepSayIt(n), count);
  const read = () => page.evaluate((id) => {
    const ew = window.__ew;
    return id === "sea" ? ew?.sea?.() : ew?.[id]?.state();
  }, game);
  const wait = async (predicate, description, attempts = 240, frames = 4) => {
    for (let i = 0; i < attempts; i++) {
      if (await predicate()) return;
      await step(frames);
    }
    assert.fail(`${label}: ${description}: ${JSON.stringify(await read())} ${errors.join(", ")}`);
  };
  const press = (target) => touch ? target.tap() : target.click();
  const mic = page.getByRole("button", { name: words.mic, exact: true });
  const bonus = page.locator(".say-it");
  const score = page.locator(".mode-score-card");
  const capture = (name) => shots && page.screenshot({
    path: join(shots, `${size}-${game}-${name}.png`),
    animations: name === "hit" ? "allow" : "disabled",
  });

  await wait(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"), "town loads", 1800);
  await page.evaluate(() => {
    const { audio, coach, store } = window.__ew;
    audio.play = async () => true;
    coach?.finish?.();
    store.getState().setHud({ panel: null, zoneBanner: null });
  });

  async function checkMicPosition(controls) {
    assert(await mic.evaluate((button, selector) => {
      const b = button.getBoundingClientRect();
      const clear = (c) => c.width === 0 || c.height === 0 || b.left >= c.right || b.right <= c.left
        || b.bottom <= c.top || b.top >= c.bottom;
      const target = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight && button.contains(target)
        && [...document.querySelectorAll(selector)].every((node) => getComputedStyle(node).visibility !== "visible"
          || clear(node.getBoundingClientRect()));
    }, controls), `${label}: the mic fits without covering gameplay controls`);
  }

  async function checkBonus({ hit, miss, untouched, keepMoving, controls, cueText }) {
    if (!supported) {
      assert.equal(await bonus.count(), 0, `${label}: the bonus mic is absent without speech support`);
      return;
    }
    await mic.waitFor();
    await bonus.getByText(words.tip, { exact: true }).waitFor();
    assert.equal(await page.evaluate((id) => localStorage.getItem(`ew-say-it-tip:${id}`), game), "1");
    await checkMicPosition(controls);
    async function checkNote(text) {
      const note = bonus.getByText(text, { exact: true });
      await note.waitFor();
      const covered = await note.evaluate((badge, selector) => {
        const box = badge.getBoundingClientRect();
        if (box.left < 0 || box.right > innerWidth || box.top < 0 || box.bottom > innerHeight) return "viewport edge";
        const range = document.createRange();
        for (const element of document.querySelectorAll(selector)) {
          if (getComputedStyle(element).visibility !== "visible") continue;
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (!node.textContent.trim()) continue;
            range.selectNodeContents(node);
            if ([...range.getClientRects()].some((rect) => rect.width && rect.height
              && box.left < rect.right && box.right > rect.left && box.top < rect.bottom && box.bottom > rect.top)) {
              return node.textContent.trim();
            }
          }
        }
        return null;
      }, `${controls}, ${cueText}`);
      assert.equal(covered, null, `${label}: ${text} covers ${covered}`);
    }
    await checkNote(words.tip);
    await capture("mic");
    const before = await read();
    await press(mic);
    await page.getByRole("button", { name: "Nebeklausyti", exact: true }).waitFor();
    if (keepMoving) {
      await step(2);
      assert((await read()).elapsed > before.elapsed, `${label}: the run advances while the mic listens`);
    }
    await page.evaluate((text) => window.__sayItHear(text), miss);
    await checkNote(words.miss);
    const missed = await read();
    assert.deepEqual(untouched(missed), untouched(before));
    assert.equal(missed.said, before.said);
    if (before.points !== undefined) assert.equal(missed.points, before.points);
    await press(mic);
    await page.evaluate((text) => window.__sayItHear(text), hit);
    await checkNote(words.hit);
    assert(await bonus.locator(".say-it-sparkle").isVisible());
    await capture("hit");
    assert.equal(await mic.getAttribute("aria-disabled"), "true");
    const said = await read();
    assert.deepEqual(untouched(said), untouched(before));
    assert.equal(said.said, before.said + 1);
    if (before.points !== undefined) assert.equal(said.points, before.points + 1);
  }

  if (game === "road" || game === "sea") {
    if (game === "road") {
      const drive = page.locator(".prompt").getByText("Vairuoti", { exact: true });
      await wait(() => drive.isVisible(), "parked van");
      await press(drive);
      await wait(() => page.evaluate(() => window.__ew.game.rides.phase === "on"), "boards the van");
      const { exit } = await read();
      await page.evaluate(({ x, z, outward }) => {
        const { game } = window.__ew;
        const ride = game.rides.riding;
        game.rides.resetPosition(ride, { x: x - 19 * Math.sin(outward), z: z - 19 * Math.cos(outward), rot: outward });
        game.modeHost.snapRide(ride);
      }, exit);
      await wait(async () => (await read()).ready, "road is ready aboard the van");
      await page.keyboard.down("ArrowUp");
      await wait(async () => (await read()).phase === "briefing", "drives over the crest", 240, 1);
      await page.keyboard.up("ArrowUp");
    } else {
      await page.keyboard.down("ArrowUp");
      await wait(() => page.evaluate(() => {
        const { game, store } = window.__ew;
        return game.swimming && store.getState().hud.prompt?.kind === "boat" && game.nearest?.id === "anchored-1";
      }), "swims to the anchored boat");
      await page.keyboard.up("ArrowUp");
      await page.keyboard.press("e");
      await wait(async () => (await read()).ready, "boat and open water are ready");
      const { edge, town } = await read();
      assert.equal(await page.evaluate(([x, z]) => window.__ew.seaPlaceBoat(x, z), [town.x, edge + 34]), true);
      await page.keyboard.down("ArrowUp");
      await wait(async () => (await read()).phase === "briefing", "sails out past the buoy line");
      await page.keyboard.up("ArrowUp");
    }
    await press(page.locator('[data-way="words"]'));
    await wait(async () => (await read()).phase === "drive" && await page.locator(".road-question").isVisible(), "first word gate");
    const prompt = await read();
    const controls = ".road-gate, .road-replay, .road-dash button, .joy, .brake-btn, .drive-horn";
    await checkBonus({
      hit: prompt.word, miss: "purple dinosaurs on the moon",
      untouched: (s) => [s.totalGates, s.rightGates, s.streak], keepMoving: true, controls,
      cueText: ".road-dash, .road-question strong, .road-gap, .road-hint, .road-controls",
    });
    if (supported) {
      await wait(async () => (await read()).gateDistance <= (game === "road" ? 45 : 30), "approaches the pinned boards", 240, 1);
      assert.equal(await page.locator(".road-gate:visible").count(), 3);
      await checkMicPosition(controls);
    }
    await page.evaluate((id) => {
      const { road, sea, seaSteer } = window.__ew;
      if (id === "road") road.steer(road.state().right);
      else seaSteer(sea().right);
    }, game);
    await wait(async () => (await read()).rightGates === 1, "the standard steering answer still scores");
    assert.equal(await bonus.count(), 0, `${label}: crossing the gate closes the bonus cue`);
    await page.evaluate((id) => {
      const { road, seaTimer } = window.__ew;
      if (id === "road") road.jumpTimer();
      else seaTimer();
    }, game);
    await wait(() => score.isVisible(), "the points score card opens");
    assert.equal((await read()).result.points, 100 + Number(supported));
  } else if (game === "billiards") {
    assert(await page.evaluate(() => window.__ew.billiards.start("solids")));
    const phase = (...names) => wait(async () => names.includes((await read())?.phase), names.join(" or "));
    const shoot = (power) => page.evaluate((value) => {
      window.__ew.billiards.shoot(value);
      window.__ew.billiards.settle();
    }, power);

    await phase("break");
    await shoot(0.06);
    await phase("listen");
    const shot = await read();
    await checkBonus({
      hit: shot.call.sentence.en, miss: `${shot.ai.ball} ball ${shot.ai.pocket.endsWith("s") ? "corner" : "side"} pocket`,
      untouched: (s) => [s.shots, s.phase, s.selection], controls: ".bl-ball-option, .bl-pocket-chips button, .bl-replay",
      cueText: ".bl-panel h2, .bl-speech, .bl-chip-heading, .bl-status, .bl-exit",
    });
    for (let i = 0; i < 8 && (await read()).phase === "listen"; i++) {
      const { ai } = await read();
      await press(page.locator(`.bl-ball-chips [data-ball="${ai.ball}"]`));
      await press(page.locator(`.bl-pocket-chips [data-pocket="${ai.pocket}"]`));
      await phase("feedback");
      assert.equal((await read()).correct, true);
      // Mark the learner's solids as down, then take the actual winning shot into the side pocket.
      await page.evaluate(() => {
        const pool = window.__ew.billiards;
        pool.layout(pool.state().layout.filter(({ id }) => id > 0 && id < 8).map((ball) => ({ ...ball, pocket: "ls" })));
      });
      await phase("rolling");
      await page.evaluate(() => window.__ew.billiards.settle());
      await phase("call", "listen");
    }
    assert.deepEqual((await read()).available, [8]);
    await page.evaluate(() => {
      const pool = window.__ew.billiards;
      pool.layout(pool.state().layout.filter(({ pocket }) => !pocket).map(({ id }, i) =>
        id === 0 ? { id, x: 0.18, z: 0 } : id === 8 ? { id, x: -0.23, z: 0 }
          : { id, x: -0.34 + (i % 5) * 0.15, z: -0.71 - Math.floor(i / 5) * 0.11 }));
      pool.callShot(8, "ls");
    });
    await phase("aim");
    await page.evaluate(() => window.__ew.billiards.aimAtGhost());
    await shoot(0.45);
    await phase("reply");
    await wait(() => page.locator('.bl-choice[data-line="h_gg"]').isVisible(), "the closing line is ready");
    await press(page.locator('.bl-choice[data-line="h_gg"]'));
    await wait(() => score.isVisible(), "the pool score card opens");
    assert.equal((await read()).result.understood > 0, true);
  } else {
    assert.equal(game, "gofish");
    assert(await page.evaluate(() => window.__ew.gofish.start(124)));
    const choice = (key) => page.locator(`.gofish-choice[data-line="${key}"]:enabled`);
    const cards = page.locator(".gofish-card:enabled");
    const pond = page.locator(".gofish-fish:enabled");
    const drawn = page.locator(".gofish-drawn");
    let sawDraw = false;
    for (let i = 0; i < 100; i++) {
      await wait(async () => await score.isVisible() || await pond.isVisible() || await choice("gf_yes").isVisible()
        || await choice("gf_pair").isVisible() || await cards.first().isVisible(), "next Go Fish action");
      const { step: turn, round } = await read();
      if (turn === "score") break;
      if (turn === "ask") {
        const asks = round.hands.learner.flatMap((word) => ["dan", "nora"].filter((id) => round.hands[id].length)
          .map((id) => ({ word, id, hit: round.hands[id].includes(word) })));
        const miss = !sawDraw && round.pond.length ? asks.find(({ hit }) => !hit) : undefined;
        const ask = miss ?? asks.find(({ hit }) => hit) ?? asks[0];
        await press(page.locator(`.gofish-person[data-target="${ask.id}"]`));
        await press(page.locator(`.gofish-card[data-word="${ask.word}"]:enabled`).first());
        await press(choice(`gf_ask_${ask.word}`));
      } else if (turn === "fish") {
        await press(pond);
        if (sawDraw) continue;
        await wait(() => drawn.isVisible(), "the learner's drawn card", 240, 1);
        const name = await drawn.locator("strong[lang=en]").innerText();
        await checkBonus({
          hit: `It's ${/^[aeiou]/i.test(name) ? "an" : "a"} ${name}`, miss: "purple dinosaurs on the moon",
          untouched: (s) => [s.round.hands, s.round.pairs, s.right, s.replies], controls: ".gofish-pond, .gofish-card, .gofish-choice",
          cueText: ".gofish-drawn strong, .gofish-drawn small, .gofish-cue, .gofish-person, .gofish-tip, .gofish-hand-caption",
        });
        sawDraw = true;
      } else if (turn === "reply") {
        const cue = await page.locator(".gofish-cue").getAttribute("data-line");
        const word = cue.slice("gf_ask_".length);
        await press(choice(round.hands.learner.includes(word) ? "gf_yes" : "gf_nope"));
      } else if (turn === "pair") await press(choice("gf_pair"));
      else assert.fail(`${label}: unexpected Go Fish turn ${turn}`);
    }
    assert(sawDraw, `${label}: drew a card from the pond`);
    await wait(() => score.isVisible(), "the Go Fish score card opens");
  }

  const row = score.locator("dl > div").filter({ has: page.getByText(words.stat, { exact: true }) });
  assert.equal(await row.count(), Number(supported));
  if (supported) {
    assert.equal(await row.locator("dd").innerText(), "1");
    await capture("score");
  }
  assert.deepEqual(errors, [], `${label}: page errors`);
  console.log("ok", label);
}

try {
  for (const size of sizes) {
    const [width, height] = size.split("x").map(Number);
    const touch = width === 390 || height === 390;
    for (const game of games) {
      for (const supported of [true, false]) {
        const context = await browser.newContext({ viewport: { width, height }, isMobile: touch, hasTouch: touch, deviceScaleFactor: touch ? 2 : 1 });
        try {
          await context.route(/\.mp3(?:\?|$)/, (route) => route.fulfill({ status: 204, body: "", headers: { "access-control-allow-origin": "*" } }));
          await testGame(context, game, size, touch, supported);
        } finally {
          await context.close();
        }
      }
    }
  }
} finally {
  await browser.close();
}
