// Run against the dev server. For VITE_EDITION=es, set WORLD_STORAGE=puerto-colibri.
// SHOTS_DIR defaults to /tmp. Phone screenshots go in size subdirectories. WORLD_PHONE_HEIGHT runs a single phone size.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const storage = process.env.WORLD_STORAGE || "english-world";
const es = storage === "puerto-colibri";
const targetLang = es ? "es" : "en";
// WORLD_LEARNER=lt: Puerto Colibrí for Lithuanians (a VITE_LEARNER=lt server): Lithuanian UI and glosses.
const ltLayer = es && process.env.WORLD_LEARNER === "lt";
const glossLang = es && !ltLayer ? "en" : "lt";
const shots = process.env.SHOTS_DIR || "/tmp";
const cafe = "s72-cafe";
const words = es && !ltLayer ? {
  start: "Try the barista's side", customer: "Customer", of: "of", hear: "Listen", show: "Show the text",
  title: "Shift over", done: "Done", exit: "End the shift", price: "Price",
} : {
  start: "Pabandyti už prekystalio", customer: "Klientas", of: "iš", hear: "Klausyk", show: "Rodyti tekstą",
  title: "Pamaina baigta", done: "Baigti", exit: "Baigti pamainą", price: "Kaina",
};
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
  [["drink", "cappuccino"], ["size", es ? "medium" : "large"], ["milk", "oat"], ["dine", "togo"]],
  [["drink", "americano"], ["size", "large"], ["milk", "none"], ["extras", "croissant"], ["dine", "togo"]],
  [["drink", es ? "chocolate" : "hot_chocolate"], ["size", "small"], ["dine", "here"]],
  [["drink", "mocha"], ["size", "large"], ["milk", "almond"], ["extras", es ? "donut" : "blueberry_muffin"], ["dine", "togo"]],
  [["drink", "latte"], ["size", "small"], ["extras", "iced"], ["milk", "oat"], ["dine", "here"]],
];
const prices = es ? ["$50", "$60", "$75", "$40", "$95", "$65"] : ["$4.75", "$5.75", "$7.25", "$3.50", "$10.00", "$5.50"];
const revealedOrders = es ? [
  [
    ["Quiero un moka, por favor.", "I'd like a mocha, please."],
    ["Grande, por favor.", "Large, please."],
    ["Leche de almendra, por favor.", "Almond milk, please."],
    ["Y una dona, por favor.", "And a doughnut, please."],
    ["Es para llevar.", "It's to go."],
  ],
  [
    ["Para mí, un latte.", "For me, a latte."],
    ["Chico, por favor.", "Small, please."],
    ["Frío, por favor.", "Iced, please."],
    ["Leche de avena, por favor.", "Oat milk, please."],
    ["Para aquí, por favor.", "For here, please."],
  ],
] : [
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
const cardLines = es
  ? ["¿Me da un latte, por favor?", "Frío, por favor.", "¡De nada! Que tenga buen día."]
  : ["Can I get a latte?", "Iced, please.", "You're welcome! Have a nice day!"];

function installControls([storage, save]) {
  localStorage.setItem(`${storage}-progress-v1`, save);
  if (storage === "puerto-colibri") localStorage.setItem(`${storage}-variety`, "default");
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
    await ctx.addInitScript(installControls, [storage, JSON.stringify(progress)]);
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
    const shot = async (name) => {
      await step(3);
      await page.screenshot({ path: join(dir, `${name}.png`) });
    };
    const press = (target) => phone ? target.tap() : target.click();
    const chip = (row, id) => page.locator(`[data-row="${row}"] [data-chip="${id}"]`);
    const choice = (key) => page.locator(`.barista-choice[data-line="${key}"]`);
    const give = page.locator(".barista-give button");
    // A poll must return when the tray is absent so the next iteration can advance the game clock.
    const enabledGive = give.and(page.locator(":enabled"));
    const cameraState = () => page.evaluate(() => {
      const { cam } = window.__ew.game.rig;
      return [...cam.projectionMatrix.elements, ...cam.matrixWorld.elements];
    });
    const offer = page.locator(".barista-offer");
    const prompt = page.locator(".prompt").getByText(words.start);

    await wait(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"), "town loads", 500);
    assert.equal(await prompt.count(), 0, "counter prompt is locked before completing s72");
    await page.evaluate((id) => window.__ew.store.getState().updateProgress((p) => {
      p.sits[id] = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
    }), cafe);
    await wait(() => prompt.isVisible(), "counter prompt appears");
    await press(prompt);
    await wait(() => offer.isVisible(), "Mia gives the offer with its gloss");
    const offerLine = offer.locator('[data-line="bs_offer"]');
    assert.equal(await offerLine.count(), 1);
    assert.equal(await offerLine.locator(`.nat[lang="${glossLang}"]`).innerText(), glossLang === "lt"
      ? "Norite pabandyti pabūti už prekystalio?"
      : "Want to try my side of the counter?");
    await shot("offer");

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
    await press(offer.getByRole("button", { name: words.start }));
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
    await step(20);
    assert(await page.evaluate((z) => window.__ew.game.modes.get("barista").run.customer.ch.root.position.z < z, staged.customerZ),
      "the customer walks up on stepped frames");
    for (const [i, order] of orders.entries()) {
      await wait(() => choice("bs_a_hi").isVisible(), `customer ${i + 1} arrives`);
      assert.equal(await page.locator(".barista-counter").innerText(), `${words.customer} ${i + 1} ${words.of} 6`);
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
          await press(page.getByRole("button", { name: words.hear, exact: true }));
          await wait(async () => (await state())?.step === "order", "the full order replays");
        }
        const text = page.locator(".barista-order-text");
        const lines = text.locator("li");
        await press(page.getByRole("button", { name: words.show }));
        await wait(() => lines.first().isVisible(), "revealed order appears");
        await wait(() => enabledGive.isVisible(), "the tray returns with the revealed order");
        const revealed = await lines.evaluateAll((rows, [target, gloss]) => rows.map((row) => [
          row.querySelector(`span[lang="${target}"]`).innerText,
          row.querySelector(`small[lang="${gloss}"]`)?.innerText ?? "",
        ]), [targetLang, glossLang]);
        if (ltLayer) {
          // the Lithuanian glosses come from the es-lt tables: same Spanish, a Lithuanian gloss on every piece
          assert.deepEqual(revealed.map(([target]) => target), revealedOrders[i - 4].map(([target]) => target));
          assert(revealed.every(([, gloss]) => gloss && !/[a-z]+ please/i.test(gloss)), JSON.stringify(revealed));
        } else assert.deepEqual(revealed, revealedOrders[i - 4]);
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
        const fixedGlosses = glossLang === "lt" ? ["čia", "išsinešti", "be pieno"] : ["for here", "to go", "no milk"];
        for (const [[row, id], expected] of [
          [["dine", "here"], fixedGlosses[0]],
          [["dine", "togo"], fixedGlosses[1]],
          [["milk", "none"], fixedGlosses[2]],
        ]) {
          assert.equal(await chip(row, id).locator(`small[lang="${glossLang}"]`).innerText(), expected);
        }
        await step();
        const layout = await page.evaluate(() => {
          const { game } = window.__ew;
          const mode = game.modes.get("barista");
          const { customer, serving, mia, props } = mode.run;
          const { cam, stage } = game.rig;
          const tray = document.querySelector(".barista-tray").getBoundingClientRect();
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
          return {
            tray: tray.top,
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
            chips: [...document.querySelectorAll(".barista-chip")].every((item) =>
              item.getBoundingClientRect().height >= 44 && item.scrollWidth <= item.clientWidth + 1),
          };
        });
        assert(layout.chips && layout.customerFacesBarista && layout.clear, JSON.stringify(layout));
        assert(layout.cameraPitch >= 25 && layout.cameraPitch <= 30, JSON.stringify(layout));
        assert(Math.abs(layout.mia.x - layout.face.x) >= width * 0.15, JSON.stringify(layout));
        assert(layout.shoulder.x < width * 0.35 && layout.shoulder.y > layout.face.y, JSON.stringify(layout));
        assert.equal(layout.drinkCount, es ? 7 : 8);
        if (!phone) assert(layout.drinkRowFits, JSON.stringify(layout));
        for (const { x, y } of [layout.face, layout.cup, layout.mia]) {
          assert(x > 0 && x < width && y > 65 && y < layout.freeBottom - 12 && y < layout.tray, JSON.stringify(layout));
        }
        await shot("building");

        await press(chip("size", "large"));
        await press(give);
        await wait(() => heard("bs_c_sorry"), "customer apologizes for the wrong size");
        await wait(async () => (await state())?.step === "build" && await chip("size", "medium").evaluate((el) => el.classList.contains("barista-chip-glow")), "recorded size repeats and the correction glows");
        assert.equal((await state()).wrong, 1);
        await shot("wrong");
        await press(chip("size", "medium"));
        await step();
        beforeHandover = await cameraState();
      }

      if (i === 3) assert.equal(await page.locator('[data-row="milk"]').count(), 0);
      await press(give);
      if (i === 0) {
        await wait(async () => (await state())?.step === "handover", "the cup slides to the customer");
        await shot("handover");
        assert.deepEqual(await cameraState(), beforeHandover, "hand-over keeps the same camera framing");
      }
      const priceLine = choice(`bs_a_price_${i + 1}`);
      await wait(() => priceLine.isVisible(), "the till presents the price");
      assert.equal(await page.locator(".barista-price span").innerText(), words.price);
      assert.equal(await page.locator(".barista-price strong").innerText(), prices[i]);
      await press(priceLine);
      await wait(() => choice("bs_a_welcome").isVisible(), "customer says thanks and learner can reply");
      await press(choice("bs_a_welcome"));
    }

    const card = page.locator(".mode-score-card");
    await wait(() => card.isVisible(), "score card opens");
    assert.equal(await card.locator("h2").innerText(), words.title);
    assert.deepEqual((await card.locator("dd").allTextContents()).slice(0, 2), ["6/6", "5/6"]);
    assert(await page.evaluate(({ key, cardLines }) => {
      const cards = JSON.parse(localStorage.getItem(key) ?? "null")?.cards ?? [];
      return cardLines.every((en) =>
        cards.some((card) => card.situationId === "s72-cafe" && card.sentence.en === en));
    }, { key: `${storage}-cards-v1`, cardLines }), "recorded pieces and learner lines become phrase cards");
    await shot("score");
    await press(card.getByRole("button", { name: words.done }));
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
      await press(page.locator(".ended-box").getByRole("button", { name: words.start }));
      await wait(() => choice("bs_a_hi").isVisible(), "the A3 payoff launches the shift directly");
      await page.keyboard.press("1");
      await wait(() => chip("drink", "latte").and(page.locator('[aria-disabled="false"]')).isVisible(), "keyboard accepts the greeting");
      await page.keyboard.press("1");
      await wait(async () => (await state())?.piece === 1, "keyboard selects a chip in the active row");
      await press(page.getByRole("button", { name: words.exit }));
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
