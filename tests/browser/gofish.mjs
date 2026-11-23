// Run against the dev server. WORLD_PHONE_HEIGHT can select one of the two phone sizes.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const storage = process.env.WORLD_STORAGE || "english-world";
const shots = process.env.SHOTS_DIR || "/tmp";
const dinner = "s85-dinner";
const start = "Pažaisti „Go Fish“";
const sizes = process.env.WORLD_SIZES ? process.env.WORLD_SIZES.split(",").map((s) => s.split("x").map(Number)) : [
  [1280, 800],
  ...(process.env.WORLD_PHONE_HEIGHT ? [[390, Number(process.env.WORLD_PHONE_HEIGHT)]] : [[390, 844], [390, 664]]),
];
const progress = {
  version: 1,
  profile: {
    name: "Test", surname: "Tester", gender: "f", lookId: "f1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" },
  },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0, sounds: 0, cameraFollow: true },
  sits: { [dinner]: { visits: 1, completions: 1, used: [], twists: [], memory: {} } },
  phrases: {}, seenIntro: {}, started: 1,
  place: { zone: "dans-house", x: 1.5, z: 0.25, rot: Math.PI },
  coach: { done: true, run: true, view: true },
};

function installControls([key, save]) {
  localStorage.setItem(key, save);
  sessionStorage.setItem("ew-play-now", "1");
  window.SpeechRecognition = undefined;
  window.webkitSpeechRecognition = undefined;
  let now = 1000;
  const frames = [];
  performance.now = () => now;
  requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
  cancelAnimationFrame = () => {};
  speechSynthesis.speak = (utterance) => requestAnimationFrame(() => utterance.onend?.());
  window.__stepGoFish = (count) => {
    for (let i = 0; i < count; i++) {
      now += 50;
      for (const fn of frames.splice(0)) fn(now);
    }
  };
}

const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  for (const [width, height] of sizes) {
    const phone = width === 390 || height === 390;
    const label = `${width}x${height}`;
    const dir = phone ? join(shots, label) : shots;
    await mkdir(dir, { recursive: true });
    const context = await browser.newContext({
      viewport: { width, height }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone,
    });
    await context.route(/\.mp3(?:\?|$)/, (route) =>
      route.fulfill({ status: 204, body: "", headers: { "access-control-allow-origin": "*" } }));
    await context.addInitScript(installControls, [`${storage}-progress-v1`, JSON.stringify(progress)]);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base, { waitUntil: "domcontentloaded" });

    const step = (n = 5) => page.evaluate((count) => window.__stepGoFish(count), n);
    const state = () => page.evaluate(() => window.__ew?.gofish?.state());
    const wait = async (predicate, description, attempts = 160) => {
      for (let i = 0; i < attempts; i++) {
        await step();
        if (await predicate()) return;
      }
      assert.fail(`${label}: ${description}: ${JSON.stringify(await state())}; ${errors.join(", ")}`);
    };
    const press = (target) => phone ? target.tap() : target.click();
    const choice = (key) => page.locator(`.gofish-choice[data-line="${key}"]:enabled`);
    const handCard = (word) => page.locator(`.gofish-card[data-word="${word}"]:enabled`);
    const target = (id) => page.locator(`.gofish-person[data-target="${id}"]:enabled`);
    const fish = page.locator(".gofish-fish:enabled");
    const offer = page.locator(".gofish-offer");
    const prompt = page.locator(".prompt").getByText(start);
    const score = page.locator(".gofish-result .mode-score-card");
    const shot = (name) => page.screenshot({ path: join(dir, `gofish-${name}.png`) });

    async function checkLayout(stage) {
      await step(2);
      const check = await page.evaluate(() => {
        const box = (element) => element.getBoundingClientRect();
        const visible = (element) => {
          const bounds = box(element);
          return bounds.width && bounds.height && getComputedStyle(element).visibility !== "hidden";
        };
        const inside = (r) => r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1;
        const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        const interfaceElements = document.querySelectorAll(".gofish-offer *, .gofish-overlay *, .gofish-result .mode-score-card");
        const overflow = [...interfaceElements].filter((el) => visible(el) && !inside(box(el))).map((el) => ({
          tag: el.tagName, classes: String(el.className), box: box(el).toJSON(),
        }));
        const hand = document.querySelector(".gofish-hand");
        const handCards = Array.from(hand?.children ?? [], (card) => ({ card, bounds: box(card) }));
        const handRows = new Set(handCards.map(({ bounds }) => Math.round(bounds.top))).size;
        const handFits = !hand || (hand.scrollWidth <= hand.clientWidth + 1 && handCards.every(({ card, bounds: r }) => {
          const outer = box(hand);
          return r.left >= outer.left - 1 && r.right <= outer.right + 1 && r.top >= outer.top - 1 && r.bottom <= outer.bottom + 1
            && card.scrollHeight <= card.clientHeight + 1;
        }));
        const range = document.createRange();
        const labelProblems = [...document.querySelectorAll(".gofish-word [lang]")].flatMap((label) => {
          const text = label.firstChild;
          const card = label.closest(".gofish-card, .gofish-drawn");
          const { left, right } = box(card);
          return [...text.textContent.matchAll(/\S+/gu)].flatMap(({ 0: word, index }) => {
            range.setStart(text, index);
            range.setEnd(text, index + word.length);
            const rects = [...range.getClientRects()];
            if (rects.length !== 1 || rects[0].left < left - 1 || rects[0].right > right + 1) return [{ word, splitOrOverflow: true }];
            if (!card.classList.contains("gofish-card")) return [];
            const neighbor = handCards.find((other) => other.card !== card && overlaps(rects[0], other.bounds));
            return neighbor ? [{ word, coveredBy: neighbor.card.dataset.word }] : [];
          });
        });
        const notes = document.querySelector(".gofish-cue .nat-star");
        const replay = document.querySelector(".gofish-replay button");
        const controlsApart = !notes || !replay || (() => {
          const area = getComputedStyle(notes, "::before");
          return box(notes).left + parseFloat(area.left) + parseFloat(area.width) <= box(replay).left;
        })();
        const { game } = window.__ew;
        const run = game.modes.get("gofish").run;
        const cam = game.rig.cam;
        const covers = [...document.querySelectorAll(".gofish-top, .gofish-bottom, .gofish-drawn, .gofish-result .mode-score-card")]
          .filter(visible).map(box);
        const faces = run && ["dan", "nora"].map((id) => {
          const { ch, face } = run.actors[id];
          const projected = [];
          const project = (p) => {
            p.project(cam);
            projected.push({ x: (1 + p.x) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2, depth: p.z });
          };
          // The default character bakes each head part into the skinned mesh.
          const headBones = new Set();
          ch.head?.traverse((bone) => headBones.add(bone));
          for (const { bone, geo } of ch.parts ?? []) {
            if (!geo || !headBones.has(bone)) continue;
            if (!geo.boundingBox) geo.computeBoundingBox();
            const { min, max } = geo.boundingBox;
            for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
              project(face.clone().set(x, y, z).applyMatrix4(bone.matrixWorld));
            }
          }
          if (!projected.length) {
            for (const x of [-0.33, 0.33]) for (const y of [-0.29, 0.31]) project(face.clone().set(face.x + x, face.y + y, face.z));
          }
          const r = {
            left: Math.min(...projected.map((p) => p.x)), right: Math.max(...projected.map((p) => p.x)),
            top: Math.min(...projected.map((p) => p.y)), bottom: Math.max(...projected.map((p) => p.y)),
          };
          const ray = game.raycaster, { near, far } = ray;
          const direction = face.clone().sub(cam.position);
          ray.near = 0.05;
          ray.far = direction.length() - 0.16;
          ray.set(cam.position, direction.normalize());
          const obstacles = [run.actors[id === "dan" ? "nora" : "dan"].ch.root,
            ...game.zone.group.children.filter((object) => object.visible)];
          const hit = ray.intersectObjects(obstacles, true)[0]?.object;
          Object.assign(ray, { near, far });
          return {
            ...r, onScreen: inside(r) && projected.every((p) => Math.abs(p.depth) < 1),
            covered: covers.some((overlay) => overlaps(overlay, r)),
            blockedBy: hit ? hit.name || hit.type : null,
          };
        });
        return { overflow, handFits, handRows, handCount: handCards.length, labelProblems, controlsApart, faces, playerVisible: game.player.root.visible,
          pageFits: document.documentElement.scrollWidth <= innerWidth + 1
          && document.documentElement.scrollHeight <= innerHeight + 1 };
      });
      if (!(check.pageFits && check.handFits && check.controlsApart && !check.overflow.length && !check.labelProblems.length && (check.faces ?? []).every((f) => f.onScreen && !f.covered && !f.blockedBy))) await shot(`fail-${stage}`);
      assert(check.pageFits && check.handFits && check.controlsApart && !check.overflow.length && !check.labelProblems.length,
        `${label} ${stage} ${JSON.stringify(check)}`);
      if (phone && (check.handCount === 7 || check.handCount === 8)) {
        assert.equal(check.handRows, 2, `${label} ${stage} wraps the hand to two rows`);
      }
      if (stage !== "offer") {
        assert.equal(check.faces?.length, 2, label);
        assert(!check.playerVisible && check.faces[0].right < check.faces[1].left, `${label} ${stage} ${JSON.stringify(check)}`);
        assert(check.faces.every((face) => face.onScreen && !face.covered && !face.blockedBy),
          `${label} ${stage} ${JSON.stringify(check.faces)}`);
      }
    }

    await wait(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"), "house loads", 500);
    const home = await page.evaluate(() => Object.fromEntries(window.__ew.game.npcs.map(({ id, ch }) => [id, ch.root.position.toArray()])));
    await wait(() => prompt.isVisible(), "table prompt appears");
    await press(prompt);
    await wait(() => offer.locator('[data-line="gf_offer"]').isVisible(), "Dan offers a round");
    assert.equal(await offer.locator(":scope > b").innerText(), "Dan");
    await checkLayout("offer");
    await shot("offer");
    await page.evaluate(() => window.__ew.gofish.seed(124));
    await press(offer.getByRole("button", { name: start }));
    await wait(() => handCard("hot_dog").isVisible(), "the seeded hand is dealt");
    assert.equal(await page.locator(".minimap, .objective-card").count(), 0);
    assert.deepEqual(await page.locator(".gofish-person strong").allTextContents(), ["Dan", "Nora"]);
    assert.equal(await target("dan").getAttribute("aria-pressed"), "true");
    if (!phone) {
      await page.keyboard.press("ArrowRight");
      assert.equal(await target("nora").getAttribute("aria-pressed"), "true");
      await page.keyboard.press("d");
      await page.keyboard.press("1");
    } else {
      await press(target("nora"));
      await press(target("dan"));
      await press(handCard("hot_dog"));
    }
    await wait(() => choice("gf_ask_hot_dog").isVisible(), "the ask chip appears after selecting the card");
    assert.match(await choice("gf_ask_hot_dog").innerText(), /Do you have any hot dogs/);
    await checkLayout("ask");
    await shot("ask");

    let widestAsk = 0, widestPair = 0, wrong = false, revealed = false;
    const captures = new Set();
    const capture = async (name) => {
      if (captures.has(name)) return;
      captures.add(name);
      await shot(name);
    };
    for (let i = 0; i < 80; i++) {
      await wait(async () => await score.isVisible() || await fish.isVisible() || await choice("gf_yes").isVisible()
        || await choice("gf_pair").isVisible() || await page.locator(".gofish-card:enabled").first().isVisible(), "next learner action");
      const { step: action, round, asks } = await state();
      if (action === "score") break;
      if (action === "ask") {
        widestAsk = Math.max(widestAsk, round.hands.learner.length);
        const options = round.hands.learner.flatMap((word) => ["dan", "nora"].filter((id) => round.hands[id].length)
          .map((id) => ({ word, id, hit: round.hands[id].includes(word) })));
        const ask = (widestAsk < 7 && round.pond.length ? options.find((option) => !option.hit) : undefined)
          ?? options.find((option) => option.hit) ?? options[0];
        const chip = choice(`gf_ask_${ask.word}`);
        await press(target(ask.id));
        if (!await chip.isVisible()) await press(handCard(ask.word));
        await wait(() => chip.isVisible(), "ask chip is enabled");
        assert.equal(await chip.evaluate((el) => el.classList.contains("gofish-glow")), asks < 2);
        assert.equal(await chip.locator('small[lang="lt"]').count(), asks < 5 ? 1 : 0);
        if (!revealed && asks >= 5) {
          revealed = true;
          await press(page.getByRole("button", { name: "Rodyti tekstą" }));
          assert.equal(await chip.locator('small[lang="lt"]').count(), 1);
        }
        await checkLayout("ask");
        if (!phone && asks === 0) await page.keyboard.press("Enter"); else await press(chip);
      } else if (action === "reply") {
        const question = await page.locator(".gofish-cue").getAttribute("data-line");
        const word = question.slice("gf_ask_".length);
        const correct = round.hands.learner.includes(word) ? "gf_yes" : "gf_nope";
        await checkLayout("reply");
        await capture("reply");
        if (!wrong) {
          wrong = true;
          assert.equal(await page.locator(".gofish-speaker").innerText(), "Dan");
          const replay = page.getByRole("button", { name: "Klausyti dar kartą" });
          await press(replay);
          assert(await replay.isDisabled(), "replay click begins playback");
          await wait(() => choice(correct).isVisible(), "replay restores the reply chips");
          const wrongKey = correct === "gf_yes" ? "gf_nope" : "gf_yes";
          if (phone) await press(choice(wrongKey)); else await page.keyboard.press(wrongKey === "gf_yes" ? "y" : "n");
          await wait(() => page.locator('.gofish-cue[data-line="gf_sure"]').isVisible(), "wrong reply prompts another look");
          await wait(() => choice(correct).isVisible(), "corrected reply is ready");
          assert(await page.locator(correct === "gf_yes"
            ? `.gofish-card[data-word="${word}"].gofish-glow` : '.gofish-choice[data-line="gf_nope"].gofish-glow').isVisible());
        }
        await press(choice(correct));
      } else if (action === "fish") {
        await checkLayout("fish");
        await capture("fish");
        if (phone) await press(fish); else await page.keyboard.press("f");
        await wait(() => page.locator(".gofish-drawn").isVisible(), "drawn card is revealed");
        assert.equal(await page.locator(".gofish-pond").innerText(), `Krūvelėje: ${round.pond.length - 1}`);
        await checkLayout("draw");
      } else if (action === "pair") {
        widestPair = Math.max(widestPair, round.hands.learner.length);
        await checkLayout("pair");
        await capture("pair");
        if (!phone) await page.keyboard.press("Enter"); else await press(choice("gf_pair"));
      } else assert.fail(`Unexpected action ${action}`);
    }

    await wait(() => score.isVisible(), "score card opens");
    assert.deepEqual([...captures].sort(), ["fish", "pair", "reply"]);
    assert.equal(widestAsk, 7);
    assert.equal(widestPair, 8);
    assert(revealed && wrong);
    assert.equal(await score.locator("h2").innerText(), "Partija baigta");
    assert.equal(await score.locator(".mode-score-line").innerText(), "Laimėjai!");
    assert.deepEqual(await score.locator("dd").allTextContents(), ["7", "2", "1", "1 iš 2", "6"]);
    assert(await page.evaluate((key) => {
      const cards = JSON.parse(localStorage.getItem(key) ?? "null")?.cards ?? [];
      return ["Do you have any pancakes?", "Yes, here you go.", "Nope. Go fish!", "I got a pair!", "Your turn!", "Lucky me!"].every((en) =>
        cards.some((card) => card.situationId === "s85-dinner" && card.sentence.en === en));
    }, `${storage}-cards-v1`), "last ask and game phrases become phrase cards");
    await score.evaluate(async (card) => {
      await Promise.all(card.getAnimations({ subtree: true }).map((animation) => animation.finished));
    });
    assert.deepEqual(await score.locator(".mode-score-number > span").evaluateAll((totals) =>
      totals.filter((total) => getComputedStyle(total).visibility === "visible").map((total) => total.textContent)),
    ["7", "2", "1"], "the final pair totals are visible");
    await checkLayout("score");
    await shot("score");
    await press(score.getByRole("button", { name: "Baigti", exact: true }));
    await wait(() => page.evaluate(() => !window.__ew.game.transitioning && !window.__ew.gofish.state()), "exit fade completes");
    assert(await page.locator(".minimap").isVisible());
    const restored = await page.evaluate(() => {
      const { game } = window.__ew;
      return {
        home: Object.fromEntries(game.npcs.map(({ id, ch }) => [id, ch.root.position.toArray()])),
        learner: game.player.root.position.toArray(), standing: game.player.anim === "idle" && game.player.root.visible,
        camera: game.rig.mode, dinnerProps: game.zone.group.getObjectByName("dans-house-dinner-props").visible,
      };
    });
    assert.deepEqual(restored, { home, learner: [1.5, 0, 0.25], standing: true, camera: "interior", dinnerProps: true });

    if (!phone) {
      await page.evaluate((id) => window.__ew.game.startScenario(id), dinner);
      await wait(() => page.evaluate(() => !!window.__ew.game.activeSession?.active), "dinner conversation loads");
      await page.evaluate(() => window.__ew.store.getState().setConv({ phase: "ended", completed: true }));
      await press(page.locator(".ended-box").getByRole("button", { name: start }));
      await wait(() => page.locator(".gofish-overlay[data-deck=animals] .gofish-card:enabled").first().isVisible(),
        "the dinner end card starts the next deck");
      assert.equal(await page.locator(".gofish-tip").count(), 0, "second round starts with glosses and without guided tips");
      await page.keyboard.press("Escape");
      await wait(() => page.locator(".minimap").isVisible(), "Escape exits during a turn");
    }
    assert.deepEqual(errors, []);
    console.log("ok", label, dir);
    await context.close();
  }
} finally {
  await browser.close();
}
