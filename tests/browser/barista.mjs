// Run against the dev server. SHOTS_DIR defaults to /tmp. Phone screenshots go in size subdirectories. WORLD_PHONE_HEIGHT runs a single phone size.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const storage = process.env.WORLD_STORAGE || "english-world";
const shots = process.env.SHOTS_DIR || "/tmp";
const cafe = "s72-cafe";
const otherConversation = "s65a-passport";
const startLabel = "Pabandyti už prekystalio";
const sizes = [
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
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "sunny-cup", x: -2.55, z: -2.03, rot: Math.PI },
  coach: { done: true, run: true, view: true },
};

const orders = [
  [["drink", "latte"], ["size", "medium"], ["milk", "whole"], ["dine", "here"]],
  [["drink", "cappuccino"], ["size", "large"], ["milk", "oat"], ["dine", "togo"]],
  [["drink", "americano"], ["size", "large"], ["milk", "none"], ["extras", "croissant"], ["dine", "togo"]],
  [["drink", "hot_chocolate"], ["size", "small"], ["dine", "here"]],
  [["drink", "mocha"], ["size", "large"], ["milk", "almond"], ["extras", "blueberry_muffin"], ["dine", "togo"]],
  [["drink", "latte"], ["size", "small"], ["extras", "iced"], ["milk", "oat"], ["dine", "here"]],
];
const prices = ["$4.75", "$5.75", "$7.25", "$3.50", "$10.00", "$5.50"];
const revealedOrders = [
  [
    ["I'll have a mocha.", "Imsiu moką."],
    ["Large, please.", "Didelį, prašau."],
    ["Almond milk, please.", "Migdolų pieną, prašau."],
    ["And a blueberry muffin, please.", "Ir mėlynių keksiuką, prašau."],
    ["Can I get it to go?", "Ar galiu išsinešti?"],
  ],
  [
    ["Let me get a latte.", "Paimsiu latę."],
    ["Small, please.", "Mažą, prašau."],
    ["Iced, please.", "Ledinį, prašau."],
    ["Oat milk, please.", "Avižų pieną, prašau."],
    ["For here, please.", "Čia, prašau."],
  ],
];

function installControls([key, save]) {
  localStorage.setItem(key, save);
  sessionStorage.setItem("ew-play-now", "1");
  window.SpeechRecognition = undefined;
  window.webkitSpeechRecognition = undefined;

  let seed = 20261122;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let now = 1000;
  performance.now = () => now;
  const frames = [];
  requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
  cancelAnimationFrame = () => {};
  speechSynthesis.speak = (utterance) => requestAnimationFrame(() => utterance.onend?.());
  window.__stepBarista = (n) => {
    for (let i = 0; i < n; i++) {
      now += 50;
      for (const fn of frames.splice(0)) fn(now);
    }
  };
}

async function checkOfferSaves(page, row, press, phone) {
  const index = 1;
  const { conversation, words, word, phrase } = await page.evaluate(async ([index, cafe]) => {
    const { useBarista } = await import("/src/game/barista/store.ts");
    const { sentenceInput, unitInput } = await import("/src/state/cards.ts");
    const { PHRASE_CARD_UI } = await import("/src/content/phrase-card-ui.ts");
    const { conv } = window.__ew.store.getState();
    const { sentence } = useBarista.getState().line;
    return { conversation: [conv.active, conv.sitId], words: PHRASE_CARD_UI,
      word: unitInput(sentence, index, cafe), phrase: sentenceInput(sentence, cafe) };
  }, [index, cafe]);
  assert.deepEqual(conversation, [false, otherConversation]);
  assert.ok(word && word.en !== phrase.en);
  const readCards = (en) => page.evaluate(async ([key, en]) => {
    const { cardKey } = await import("/src/state/cards.ts");
    const cards = JSON.parse(localStorage.getItem(key) ?? "null")?.cards ?? [];
    return cards.filter((card) => cardKey(card.en) === cardKey(en));
  }, [`${storage}-cards-v1`, en]);
  const checkSaved = async (expected) => {
    const cards = await readCards(expected.en);
    assert.equal(cards.length, 1, `one card for ${expected.en}`);
    const [card] = cards;
    const { en, lt, ipa, sentence, situationId } = card;
    assert.deepEqual({ en, lt, ipa, sentence, situationId }, expected);
    return card;
  };
  assert.deepEqual(await readCards(word.en), []);
  assert.deepEqual(await readCards(phrase.en), []);

  const unit = row.locator(`.u[data-i="${index}"] .en`);
  const standalone = row.locator("[data-phrase-save]");
  const popover = page.locator(".wpop");
  let first;
  if (!phone) {
    await standalone.press("Enter");
    first = await checkSaved(phrase);
  }
  await press(unit);
  await press(popover.getByRole("button", { name: words.add, exact: true }));
  await checkSaved(word);
  if (phone) {
    await press(popover.getByRole("button", { name: words.whole, exact: true }));
    first = await checkSaved(phrase);
  }
  await popover.getByText(words.wholeInCards, { exact: true }).waitFor();
  await page.keyboard.press("Escape");
  await popover.waitFor({ state: "detached" });
  if (phone) await press(standalone);
  assert.equal(await standalone.getAttribute("aria-label"), words.inCards);
  assert.deepEqual(await readCards(phrase.en), [first], "both actions share the first saved record");
}

async function checkTraySaves(page, tray, give, press, phone) {
  const words = await page.evaluate(async () => (await import("/src/content/phrase-card-ui.ts")).PHRASE_CARD_UI);
  const opener = tray.locator(".phrase-chooser summary");
  const panel = tray.locator(".phrase-chooser-panel");
  const select = panel.getByRole("combobox", { name: words.phrases });
  const phrase = await tray.locator('[data-row="dine"] [data-chip="here"]').evaluate((chip) => ({
    en: chip.querySelector('[lang="en"]').textContent,
    lt: chip.querySelector('[lang="lt"]').textContent,
  }));
  assert.deepEqual(phrase, { en: "For here", lt: "čia" });
  const readCards = () => page.evaluate(async ([key, en]) => {
    const { cardKey } = await import("/src/state/cards.ts");
    const cards = JSON.parse(localStorage.getItem(key) ?? "null")?.cards ?? [];
    return cards.filter((card) => cardKey(card.en) === cardKey(en));
  }, [`${storage}-cards-v1`, phrase.en]);
  const snapshot = () => tray.evaluate(async (element) => {
    const { useBarista } = await import("/src/game/barista/store.ts");
    const { row, page } = useBarista.getState();
    return { state: window.__ew.barista.state(), row, page, chips: [...element.querySelectorAll("[data-chip]")]
      .map((chip) => [chip.dataset.chip, chip.getAttribute("aria-pressed")]) };
  });
  const before = await snapshot();
  assert.deepEqual(await readCards(), []);
  assert.equal(await opener.getAttribute("aria-label"), words.phrases);
  const book = await opener.boundingBox();
  assert(book.width >= 44 && book.height >= 44, JSON.stringify(book));
  if (phone) await press(opener);
  else await opener.press("Enter");
  const shown = await tray.locator("[data-chip]").evaluateAll(async (chips) => {
    const { cardKey } = await import("/src/state/cards.ts");
    const seen = new Set();
    return chips.flatMap((chip) => {
      const en = chip.querySelector('[lang="en"]').textContent;
      const key = cardKey(en);
      if (seen.has(key)) return [];
      seen.add(key);
      return [en];
    });
  });
  await select.waitFor();
  assert.deepEqual(await select.locator("option").allTextContents(), shown, "chooser covers the displayed chips in tray order");
  await select.selectOption({ label: phrase.en });
  assert.equal(await panel.locator('small[lang="lt"]').textContent(), phrase.lt);
  const bounds = () => panel.evaluate((panel) => {
    const box = panel.getBoundingClientRect();
    const give = document.querySelector(".barista-give button");
    const button = give.getBoundingClientRect();
    return box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= button.top
      && give.contains(document.elementFromPoint(button.left + button.width / 2, button.top + button.height / 2));
  });
  assert(await give.isEnabled() && await bounds(), "chooser fits above the serving button and leaves it tappable");
  const viewport = page.viewportSize();
  if (phone && viewport.height === 844) {
    await page.setViewportSize({ width: 844, height: 390 });
    assert(await bounds(), "landscape chooser fits above the serving button and leaves it tappable");
    await page.setViewportSize(viewport);
  }
  const save = panel.locator("[data-phrase-save]");
  assert.equal(await save.getAttribute("aria-label"), words.add);
  await press(save);
  assert.equal(await save.getAttribute("aria-label"), words.inCards);
  const first = await readCards();
  assert.equal(first.length, 1);
  const [{ en, lt, sentence, situationId }] = first;
  assert.deepEqual({ en, lt, sentence, situationId }, { ...phrase, sentence: phrase, situationId: cafe });
  assert.deepEqual(await snapshot(), before, "saving a tray phrase leaves the order and shortcuts in place");
  if (phone) await press(save);
  else await save.press("Enter");
  assert.deepEqual(await readCards(), first, "saving again keeps the original record");
  assert.deepEqual(await snapshot(), before, "saving again leaves the order and shortcuts in place");
  if (phone) await press(opener);
  else await page.keyboard.press("Escape");
  await panel.waitFor({ state: "detached" });
  return { ...phrase, readCards, first };
}

const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  for (const [width, height] of sizes) {
    const phone = width === 390;
    const label = `${width}x${height}`;
    const dir = phone ? join(shots, label) : shots;
    await mkdir(dir, { recursive: true });
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
    await ctx.route(/\.mp3(?:\?|$)/, (request) => request.fulfill({ status: 204, body: "", headers: { "access-control-allow-origin": "*" } }));
    await ctx.addInitScript(installControls, [`${storage}-progress-v1`, JSON.stringify(progress)]);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto(base, { waitUntil: "domcontentloaded" });

    const step = (frames = 5) => page.evaluate((n) => window.__stepBarista(n), frames);
    const state = () => page.evaluate(() => window.__ew?.barista?.state());
    const wait = async (predicate, description, attempts = 160) => {
      for (let i = 0; i < attempts; i++) {
        await step();
        if (await predicate()) return;
      }
      assert.fail(`${label}: ${description}: ${JSON.stringify(await state())}, ${errors.join(", ")}`);
    };
    const shot = async (name, frames = 3) => {
      if (frames) await step(frames);
      await page.screenshot({ path: join(dir, `${name}.png`) });
    };
    const press = (target) => phone ? target.tap() : target.click();
    const chip = (row, id) => page.locator(`[data-row="${row}"] [data-chip="${id}"]`);
    const choice = (key) => page.locator(`.barista-choice[data-line="${key}"]`);
    const give = page.locator(".barista-give button");
    const tray = page.locator(".barista-tray");
    let traySave;
    // A poll must return when the tray is absent so the next iteration can advance the game clock.
    const enabledGive = give.and(page.locator(":enabled"));
    const cameraState = () => page.evaluate(() => {
      const { cam } = window.__ew.game.rig;
      const { customer, serving } = window.__ew.game.modes.get("barista").run;
      const pixel = (point) => {
        const p = point.project(cam);
        return { x: (1 + p.x) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2 };
      };
      return {
        pose: cam.matrixWorld.toArray(), lens: cam.projectionMatrix.toArray(), zoom: cam.zoom,
        face: pixel(customer.ch.root.position.clone().setY(customer.ch.height * 0.91)),
        cup: pixel(serving.position.clone()),
      };
    });
    const offer = page.locator(".barista-offer");
    const prompt = page.locator(".prompt").getByText(startLabel);

    await wait(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"), "town loads", 500);
    assert.equal(await prompt.count(), 0, "counter prompt is locked before completing s72");
    await page.evaluate((id) => window.__ew.store.getState().updateProgress((p) => {
      p.sits[id] = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
    }), cafe);
    await wait(() => prompt.isVisible(), "counter prompt appears");
    await page.evaluate((sitId) => window.__ew.store.getState().setConv({ sitId }), otherConversation);
    await press(prompt);
    await wait(() => offer.isVisible(), "Mia gives the offer with its gloss");
    assert.equal(await offer.locator('[data-line="bs_offer"]').count(), 1);
    assert.match(await offer.innerText(), /Norite pabandyti pabūti už prekystalio/);
    await shot("offer");
    await checkOfferSaves(page, offer.locator('[data-line="bs_offer"]'), press, phone);

    if (!phone) {
      await page.evaluate(() => window.__ew.game.player.root.position.set(-2.55, 0, 0.3));
      await wait(() => offer.isHidden(), "moving away dismisses the offer");
      await page.evaluate(() => window.__ew.game.player.root.position.set(-2.55, 0, -2.03));
      await wait(() => prompt.isVisible(), "the offer can be reopened");
      await press(prompt);
    }

    await page.evaluate(() => {
      window.__baristaCues = [];
      window.__originalMia = window.__ew.game.npcs.find(({ id }) => id === "mia").ch;
      new MutationObserver(() => {
        const key = document.querySelector(".barista-cue[data-line]")?.dataset.line;
        if (key && window.__baristaCues.at(-1) !== key) window.__baristaCues.push(key);
      }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-line"] });
    });
    const heard = (key) => page.evaluate((line) => window.__baristaCues.includes(line), key);
    await press(offer.getByRole("button", { name: startLabel }));
    assert.equal((await state())?.step, "starting");
    await wait(() => heard("bs_intro"), "the shift fades in with Mia's intro", 12);
    assert.equal(await page.locator(".minimap, .objective-card").count(), 0);
    const staged = await page.evaluate(() => {
      const { game } = window.__ew;
      const { mia, customer } = game.modes.get("barista").run;
      const player = game.player.root;
      return {
        behind: player.visible && Math.abs(player.position.x + 1.2) < 0.01 && Math.abs(player.position.z + 4.2) < 0.01
          && Math.cos(player.rotation.y) > 0.99,
        camera: game.rig.mode === "stage" && game.rig.cam.position.z < player.position.z,
        mia: mia.ch === window.__originalMia && mia.ch.root.visible && mia.ch.root.position.x > player.position.x + 0.4,
        customerZ: customer.ch.root.position.z,
      };
    });
    assert(staged.behind && staged.camera && staged.mia && staged.customerZ > 3, JSON.stringify(staged));
    if (phone) {
      const intro = await page.locator('.barista-cue[data-line="bs_intro"]').evaluate((cue) => {
        const { game } = window.__ew;
        const { mia } = game.modes.get("barista").run;
        const p = mia.ch.root.position.clone().setY(mia.ch.height * 0.91).project(game.rig.cam);
        const x = (1 + p.x) * innerWidth / 2, y = (1 - p.y) * innerHeight / 2;
        const box = cue.getBoundingClientRect();
        const text = cue.querySelector(".barista-cue-text");
        return { width: box.width, bottom: innerHeight - box.bottom, faceVisible: x > 0 && x < innerWidth && y > 0 && y < box.top,
          textFits: text.scrollWidth <= text.clientWidth + 1 && text.scrollHeight <= text.clientHeight + 1 };
      });
      assert(Math.abs(intro.width - Math.min(width * 0.94, 440)) <= 1 && Math.abs(intro.bottom - 12) <= 1
        && intro.faceVisible && intro.textFits, JSON.stringify(intro));
    }
    await step(20);
    assert(await page.evaluate((z) => window.__ew.game.modes.get("barista").run.customer.ch.root.position.z < z, staged.customerZ),
      "the customer walks up on stepped frames");
    for (const [i, order] of orders.entries()) {
      await wait(() => choice("bs_a_hi").isVisible(), `customer ${i + 1} arrives`);
      assert.equal(await page.locator(".barista-counter").innerText(), `Klientas ${i + 1} iš 6`);
      await press(choice("bs_a_hi"));
      let beforeHandover;

      if (i < 4) {
        for (const [j, [row, id]] of order.entries()) {
          const item = chip(row, id);
          await wait(async () => {
            const s = await state();
            return s?.step === "order" && s.piece === j
              && await item.and(page.locator('[aria-disabled="false"]')).isVisible();
          }, `piece ${j + 1} of order ${i + 1}`);
          assert.equal(await page.locator(".barista-chip-glow").count(), i < 2 ? 1 : 0);
          await press(item);
        }
      } else {
        await wait(() => enabledGive.isVisible(), `order ${i + 1} plays back to back`);
        assert.deepEqual(await page.locator(".barista-row").evaluateAll((rows) => rows.map((row) => row.dataset.row)),
          ["size", "drink", "milk", "extras", "dine"]);
        assert.equal(await page.locator(".barista-cue, .barista-order-text").count(), 0);
        if (i === 4) {
          await press(page.getByRole("button", { name: "Klausyk", exact: true }));
          await wait(async () => (await state())?.step === "order", "the full order replays");
        }
        const text = page.locator(".barista-order-text");
        const lines = text.locator("li");
        await press(page.getByRole("button", { name: "Rodyti tekstą" }));
        await wait(() => lines.first().isVisible(), "revealed order appears");
        await wait(() => enabledGive.isVisible(), "the tray returns with the revealed order");
        assert.deepEqual(await lines.evaluateAll((rows) => rows.map((row) => [
          row.querySelector('[lang="en"]').innerText,
          row.querySelector('[lang="lt"]').innerText,
        ])), revealedOrders[i - 4]);
        const textFits = await text.evaluate((list) => {
          const bounds = list.getBoundingClientRect();
          const tray = document.querySelector(".barista-tray").getBoundingClientRect();
          list.scrollTop = list.scrollHeight;
          const last = list.lastElementChild.getBoundingClientRect();
          list.scrollTop = 0;
          return {
            aboveTray: bounds.top >= 0 && bounds.bottom <= tray.top,
            scrollsToLastLine: last.bottom <= bounds.bottom + 1,
            fitsWidth: list.scrollWidth <= list.clientWidth + 1,
          };
        });
        assert(textFits.aboveTray && textFits.scrollsToLastLine && textFits.fitsWidth, JSON.stringify(textFits));
        for (const [row, id] of order) await press(chip(row, id));
      }

      if (i === 0) {
        await step();
        const layout = await page.evaluate(async () => {
          await document.fonts.ready;
          const { game } = window.__ew;
          const mode = game.modes.get("barista");
          const { customer, serving, mia, props } = mode.run;
          const { cam, stage } = game.rig;
          const trayElement = document.querySelector(".barista-tray");
          const tray = trayElement.getBoundingClientRect();
          const pixel = (p) => {
            const q = p.project(game.rig.cam);
            return { x: (1 + q.x) * innerWidth / 2, y: (1 - q.y) * innerHeight / 2 };
          };
          const ray = game.raycaster;
          const { far, near } = ray;
          const openSightline = (target) => {
            const direction = target.clone().sub(cam.position);
            ray.near = 0.1;
            ray.far = direction.length() - 0.05;
            ray.set(cam.position, direction.normalize());
            return ray.intersectObjects([props.root, mia.ch.root, game.player.root], true).length === 0;
          };
          const clear = [0.68, 0.91].every((y) =>
            openSightline(customer.ch.root.position.clone().setY(customer.ch.height * y)));
          Object.assign(ray, { far, near });
          const drinkRow = document.querySelector('[data-row="drink"] .barista-chips');
          const range = document.createRange();
          return {
            tray: tray.top,
            trayFitsWidth: trayElement.scrollWidth <= trayElement.clientWidth + 1,
            clear,
            cameraPitch: Math.asin(cam.position.clone().sub(stage.look).normalize().y) * 180 / Math.PI,
            drinkCount: drinkRow.children.length,
            drinkRowFits: drinkRow.scrollWidth <= drinkRow.clientWidth + 1,
            shoulder: pixel(game.player.root.position.clone().setY(game.player.height * 0.85)),
            freeBottom: document.querySelector(".barista-bottom").getBoundingClientRect().top,
            customerFacesBarista: Math.cos(customer.ch.root.rotation.y) < -0.99 && customer.ch.root.position.z > -2.6,
            face: pixel(customer.ch.root.position.clone().setY(customer.ch.height * 0.91)),
            mia: pixel(mia.ch.root.position.clone().setY(mia.ch.height * 0.91)),
            cup: pixel(serving.position.clone()),
            chipProblems: [...document.querySelectorAll(".barista-chip")].flatMap((item) => {
              const box = item.getBoundingClientRect();
              const typeFits = parseFloat(getComputedStyle(item).fontSize) >= 13
                && parseFloat(getComputedStyle(item.querySelector("small")).fontSize) >= 12;
              const hittable = item.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2));
              const fits = typeFits && hittable && box.width >= 44 && box.height >= 44 && item.scrollWidth <= item.clientWidth + 1
                && box.left >= tray.left && box.right <= tray.right && box.top >= tray.top && box.bottom <= tray.bottom;
              const splitWords = [...item.querySelectorAll("[lang]")].flatMap((label) => {
                const text = label.firstChild;
                return [...text.textContent.matchAll(/\S+/gu)].flatMap((match) => {
                  const [word] = match;
                  const { index } = match;
                  range.setStart(text, index);
                  range.setEnd(text, index + word.length);
                  return range.getClientRects().length > 1 ? [{ lang: label.lang, word }] : [];
                });
              });
              return fits && !splitWords.length ? [] : [{
                chip: item.dataset.chip, box: box.toJSON(), scroll: item.scrollWidth, client: item.clientWidth, splitWords,
              }];
            }),
          };
        });
        assert(!layout.chipProblems.length && layout.customerFacesBarista && layout.clear, JSON.stringify(layout));
        assert(layout.cameraPitch >= 25 && layout.cameraPitch <= 30, JSON.stringify(layout));
        assert(Math.abs(layout.mia.x - layout.face.x) >= width * 0.15, JSON.stringify(layout));
        assert(layout.shoulder.x < width * 0.35 && layout.shoulder.y > layout.face.y, JSON.stringify(layout));
        assert.equal(layout.drinkCount, 8);
        assert(layout.trayFitsWidth && layout.drinkRowFits, JSON.stringify(layout));
        for (const { x, y } of [layout.face, layout.cup, layout.mia]) {
          assert(x > 0 && x < width && y > 65 && y < layout.freeBottom - 12 && y < layout.tray, JSON.stringify(layout));
        }
        await shot("building");
        traySave = await checkTraySaves(page, tray, give, press, phone);

        await press(chip("size", "large"));
        await press(give);
        await wait(() => heard("bs_c_sorry"), "customer apologizes for the wrong size");
        await wait(async () => (await state())?.step === "build" && await chip("size", "medium").evaluate((el) => el.classList.contains("barista-chip-glow")), "recorded size repeats and the correction glows");
        assert.equal((await state()).wrong, 1);
        const size = chip("size", "medium");
        assert.equal((await page.locator('[data-row="size"] .barista-repair-mark').textContent()).trim(), "+");
        assert.equal(await size.getAttribute("aria-pressed"), "false");
        assert.equal(await size.getAttribute("data-repair"), "add");
        assert.equal(await size.evaluate((el) => getComputedStyle(el).outlineWidth), "2px");
        await shot("wrong");
        await press(size);
        assert.equal(await page.locator("[data-repair]").count(), 0, "one correct tap clears the add marker");

        const extra = chip("extras", "iced");
        await press(extra);
        await extra.evaluate(async (el) => {
          await Promise.allSettled(el.getAnimations().map((animation) => animation.finished));
        });
        const fill = await extra.evaluate((el) => getComputedStyle(el).backgroundColor);
        await press(give);
        await wait(async () => (await state())?.wrong === 2 && (await state())?.step === "build",
          "the requested order is repeated and the extra can be removed");
        assert.equal((await page.locator('[data-row="extras"] .barista-repair-mark').textContent()).trim(), "−");
        assert.equal(await extra.getAttribute("data-repair"), "remove");
        assert.equal(await extra.getAttribute("aria-pressed"), "true");
        assert.equal(await extra.evaluate((el) => getComputedStyle(el).backgroundColor), fill, "removal keeps the selected fill");
        assert.equal(await extra.evaluate((el) => getComputedStyle(el).outlineWidth), "2px");
        await press(extra);
        assert.equal(await extra.getAttribute("aria-pressed"), "false");
        assert.equal(await page.locator("[data-repair]").count(), 0, "one correct tap clears the remove marker");
        await step();
        beforeHandover = await cameraState();
      }

      if (i === 3) {
        assert.equal(await page.locator('[data-row="milk"]').count(), 0);
        const opener = tray.locator(".phrase-chooser summary");
        await press(opener);
        const list = tray.locator(".phrase-chooser-panel select");
        await list.waitFor();
        assert(!(await list.locator("option").allTextContents()).includes("No milk"), "the hot chocolate tray hides milk phrases");
        await press(opener);
      }
      await press(give);
      if (i === 0) {
        await wait(async () => (await state())?.step === "handover", "the cup slides to the customer");
        // Sample the landing while the cup is still on the counter.
        await wait(() => page.evaluate(() => {
          const { serving, shift } = window.__ew.game.modes.get("barista").run;
          return shift.step === "handover" && serving.position.x > -1.1;
        }), "cup reaches the customer");
        await shot("handover", 0);
        const landing = await cameraState();
        assert.deepEqual(landing.pose, beforeHandover.pose, "the camera stays on the order axis");
        if (phone) {
          assert(landing.zoom > beforeHandover.zoom, "hand-over brings the cup closer");
          assert(landing.cup.x > width * 0.15 && landing.cup.x < width * 0.85
            && landing.cup.y > landing.face.y && landing.cup.y < height * 0.75, JSON.stringify(landing));
        } else {
          assert.deepEqual(landing.lens, beforeHandover.lens, "desktop keeps the order framing");
        }
      }
      const priceLine = choice(`bs_a_price_${i + 1}`);
      await wait(() => priceLine.isVisible(), "the till presents the price");
      assert.equal(await page.locator(".barista-price strong").innerText(), prices[i]);
      await press(priceLine);
      await wait(() => choice("bs_a_welcome").isVisible(), "customer says thanks and learner can reply");
      await press(choice("bs_a_welcome"));
    }

    const card = page.locator(".mode-score-card");
    await wait(() => card.isVisible(), "score card opens");
    assert.equal(await card.locator("h2").innerText(), "Pamaina baigta");
    assert.deepEqual((await card.locator("dd").allTextContents()).slice(0, 2), ["6/6", "5/6"]);
    assert.equal(await card.locator("dd").nth(2).textContent(), "32");
    assert(await page.evaluate((key) => {
      const cards = JSON.parse(localStorage.getItem(key) ?? "null")?.cards ?? [];
      return ["Can I get a latte?", "Iced, please.", "You're welcome! Have a nice day!"].every((en) =>
        cards.some((card) => card.situationId === "s72-cafe" && card.sentence.en === en));
    }, `${storage}-cards-v1`), "recorded pieces and learner lines become phrase cards");
    await shot("score");
    const review = card.getByRole("combobox");
    await review.selectOption({ label: traySave.en });
    assert.equal(await review.locator("option").filter({ hasText: /^For here$/ }).count(), 1);
    assert.equal(await card.locator('.phrase-review-row small[lang="lt"]').textContent(), traySave.lt);
    assert.deepEqual(await traySave.readCards(), traySave.first, "the shift's awards preserve the saved tray card");
    await press(card.getByRole("button", { name: "Baigti" }));
    await wait(() => page.evaluate(() => !window.__ew.game.transitioning), "exit fade finishes on stepped frames", 12);
    assert(await page.locator(".minimap").isVisible(), "closing restores the town HUD");
    assert(await page.evaluate(() => {
      const { game, barista } = window.__ew;
      const player = game.player.root, mia = window.__originalMia.root;
      return barista.state() === null && game.rig.mode === "interior" && game.rig.cam.zoom === 1
        && player.visible && player.position.z > -2.6 && Math.abs(mia.position.x + 1.2) < 0.01
        && Math.abs(mia.position.z + 4.2) < 0.01 && mia.visible;
    }), "Baigti restores the player, Mia, and the café camera");

    if (!phone) {
      await page.evaluate((id) => window.__ew.game.startScenario(id), cafe);
      await page.waitForFunction(() => !!window.__ew.game.activeSession?.active, null, { polling: 25 });
      await page.evaluate(() => window.__ew.store.getState().setConv({ phase: "ended", completed: true }));
      await press(page.locator(".ended-box").getByRole("button", { name: startLabel }));
      await wait(() => choice("bs_a_hi").isVisible(), "the A3 payoff launches the shift directly");
      await page.keyboard.press("1");
      await wait(() => chip("drink", "latte").and(page.locator('[aria-disabled="false"]')).isVisible(), "keyboard accepts the greeting");
      await page.keyboard.press("1");
      await wait(async () => (await state())?.piece === 1, "keyboard selects a chip in the active row");
      await press(page.getByRole("button", { name: "Baigti pamainą" }));
      await wait(() => page.locator(".minimap").isVisible(), "exit works during an order");
      await wait(() => page.evaluate(() => !window.__ew.game.transitioning), "exit fade finishes");
      assert(await page.evaluate(() => window.__ew.barista.start()), "developer API starts the shift");
      await wait(() => choice("bs_a_hi").isVisible(), "developer API reaches the first learner turn");
    }
    assert.deepEqual(errors, []);
    console.log("ok", label, dir);
    await ctx.close();
  }
} finally {
  await browser.close();
}
