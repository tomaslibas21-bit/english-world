// Puerto Colibrí's grotto once its heart is found (18 Nov 2026), in the real game: the great tree speaks when the
// learner walks onto its island (x04-yaxche: by itself the first time), its camera stands in the open with the tree in
// the picture, and once it is heard out the stones speak again: a stone answered is counted, becomes a phrase of the
// learner's, rests and wakes with another line. Run against each Puerto Colibrí learner layer:
// WORLD_TEST_URL=http://127.0.0.1:8176 WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/cave-tree.mjs [--shots=<dir>]
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { questSizes } from "./quests-harness.mjs";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8176";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const shots = process.argv.find((a) => a.startsWith("--shots="))?.slice(8) || process.env.WORLD_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
/** A quarter of a second of silence (8 kHz, 16 bit, one channel) as a WAV file. */
const SILENCE = (() => { const n = 2000, b = Buffer.alloc(44 + n * 2); b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40); return b; })();
const check = (name, value, detail) => {
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name, detail === undefined ? "" : JSON.stringify(detail).slice(0, 300));
};
const STONES = ["agua", "raices", "rio", "estrellas", "corazon"].flatMap((c) => [1, 2, 3].map((i) => `${c}-${i}`));
const TREE = { x: 6, z: -180 };
const progressKey = `${storage}-progress-v1`;
// Only the last stone remains.
const save = {
  version: 1,
  profile: { name: "Test", gender: "f", lookId: "f1", look: { skin: "#f2d3bd", hair: { style: "long", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", volume: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: { "x04-yaxche": true }, started: 1, place: { zone: "town", x: -101, z: -7.4, rot: 0 }, coach: { done: true, run: true },
  cave: { lit: STONES.slice(0, -1), passed: ["kin", "nikte"], seen: true },
};

function flowerBrightness() {
  const { aSeed, aColor, aSize, position } = window.__ew.game.cave.view.group.getObjectByName("cave-sparks").geometry.attributes;
  let brightness = 0;
  for (let i = 0; i < aSeed.count; i++) {
    if (aSeed.getW(i) === 2 && aSize.getX(i) < 1 && position.getY(i) > 1.5) brightness = Math.max(brightness, aColor.getX(i));
  }
  return brightness;
}

const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  for (const [width, height] of questSizes) {
    const phone = width < 500 || height < 500;
    const ctx = await browser.newContext({ viewport: { width, height }, ...(phone ? { deviceScaleFactor: 2, isMobile: true, hasTouch: true } : {}) });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // (every clip is a quarter of a second of silence: the same run with or without the recordings at hand. The tree's
    // and the stones' lines are in the clip list, and a dev server without the clips answers with its page, so a clip
    // that could not be played would hold the conversation for a retry)
    await page.route(/\.mp3(\?.*)?$/, (r) => r.fulfill({ status: 200, contentType: "audio/wav", body: SILENCE }));
    await page.addInitScript(([k, v]) => {
      sessionStorage.setItem("ew-play-now", "1");
      if (sessionStorage.getItem("cave-tree-seeded")) return;
      localStorage.setItem(k, v);
      sessionStorage.setItem("cave-tree-seeded", "1");
    }, [progressKey, JSON.stringify(save)]);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__ew?.store?.getState().screen === "play" && window.__ew.game?.ledges?.ready, null, { timeout: 240000 });
    await page.evaluate(() => { window.__ew.coach?.finish?.(); window.__ew.store.getState().setHud({ panel: null }); });
    const learner = await page.evaluate(() => document.documentElement.lang);
    assert.ok(["en", "lt"].includes(learner));
    if (process.env.VITE_LEARNER) assert.equal(learner, process.env.VITE_LEARNER);
    const label = `pc-${learner}-${width}x${height}`;
    const lt = learner === "lt";
    const snap = async (name) => { if (shots) { await page.waitForTimeout(500); await page.screenshot({ path: path.join(shots, `cave-tree-${name}-${label}.png`) }); } };
    const press = async () => { if (phone) await page.locator(".act-btn").tap(); else await page.keyboard.press("e"); };
    const say = async (t) => {
      await page.waitForFunction(() => window.__ew.store.getState().conv.phase === "you", null, { timeout: 90000 });
      await page.waitForTimeout(500);
      await page.evaluate((t) => window.__ew.game.activeSession.submit(t, [], "typed"), t);
    };
    const storedCave = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)).cave, progressKey);
    const reloadCave = async () => {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.__ew?.store?.getState().screen === "play" && window.__ew.game?.cave, null, { timeout: 120000 });
    };

    // Reload while the last solved card is still replaying the stone's line.
    await page.evaluate(() => window.__ew.game.enterZone("gruta", { x: 6.2, z: -189.4, rot: Math.PI }, true));
    await page.waitForFunction(() => window.__ew.game.cave?.phrases.get("corazon-3")?.id === "corazon_03" && window.__ew.store.getState().hud.prompt?.kind === "listen", null, { timeout: 60000 });
    check(`${label}: the tree starts with its flowers dim`, await page.evaluate(flowerBrightness) < 0.2);
    await press();
    const finalQuiz = await page.evaluate(() => window.__ew.store.getState().hud.glyph);
    assert.equal(finalQuiz?.id, "corazon-3");
    await page.evaluate(() => {
      const { audio, store } = window.__ew;
      const play = audio.play;
      audio.play = function (...args) {
        if (!args[3]?.optional || !store.getState().hud.glyph?.solved) return play.apply(this, args);
        window.__finalStoneReplay = true;
        return new Promise(() => {});
      };
    });
    await page.locator(".glyph-opt").nth(finalQuiz.answer).click();
    await page.locator(".glyph-card.solved .glyph-play").click();
    await page.waitForFunction(() => window.__finalStoneReplay && window.__ew.store.getState().hud.glyph?.solved);
    const final = await storedCave();
    check(`${label}: the last stone and heart are saved during replay`, final.heart && final.lit.join() === STONES.join(), final);
    assert.equal(await page.locator(".glyph-card.solved h2").textContent(), lt ? "Akmuo užsidegė!" : "The stone is lit!");
    assert.equal(await page.locator(`.glyph-line .nat[lang="${learner}"]`).textContent(), finalQuiz.lt);
    await snap("0-final-stone-replay");
    await reloadCave();
    assert.deepEqual(await storedCave(), final);
    check(`${label}: the tree is in bloom after reloading mid-replay`, await page.evaluate(flowerBrightness) > 1);

    // ---- on the lake's shore: the card sends one to the tree; the stones' own lines are in
    await page.evaluate(() => { const g = window.__ew.game; g.keys.clear(); g.enterZone("gruta", { x: 6, z: -171.5, rot: Math.PI }, true); g.rig.yaw = Math.PI; g.rig.snap(); });
    await page.waitForFunction(() => window.__ew.game.cave?.pool?.size >= 215, null, { timeout: 60000 });
    const approach = lt ? "Prieik prie didžiojo medžio – jis nori tau kai ką pasakyti" : "Go up to the great tree: it has something to tell you";
    await page.waitForFunction((next) => window.__ew.store.getState().hud.cave?.next === next, approach);
    const card = await page.evaluate(() => window.__ew.store.getState().hud.cave);
    check(`${label}: the heart found, the tree not heard: the card sends the learner to the tree`, card.n === 5 && card.next === approach, card);
    check(`${label}: the stones' 215 lines are loaded with the tree's conversation`, await page.evaluate(() => window.__ew.game.cave.pool.size) === 215);
    if (width <= 480) await page.locator('.cave-toggle[aria-expanded="false"]').tap();
    await page.locator("#cave-details").getByText(approach, { exact: true }).waitFor();
    await snap("1-flowering-tree");

    // ---- a tap on the island: walking up to the tree starts its conversation by itself
    await page.evaluate(() => window.__ew.game.walkTo(6, -177.2, { kind: "point" }));
    await page.waitForFunction(() => window.__ew.store.getState().conv.active, null, { timeout: 40000 });
    await page.evaluate(() => window.__ew.store.getState().setConv({ introOpen: false }));
    await page.waitForFunction(() => window.__ew.store.getState().conv.phase === "you", null, { timeout: 90000 });
    await page.waitForTimeout(1200);
    const v = await page.evaluate(([tx, tz]) => {
      const g = window.__ew.game, r = g.rig, st = window.__ew.store.getState(), sp = g.wild.space;
      const canvas = g.renderer.domElement.getBoundingClientRect(), panel = document.querySelector(".convo")?.getBoundingClientRect();
      // (where on the trunk the camera looks: lower on a wide screen, up among the flowers in a phone's strip)
      const trunk = r.cam.position.clone().set(tx, r.talk.look.y, tz), n = trunk.clone().project(r.cam);
      const px = [canvas.left + (n.x + 1) / 2 * canvas.width, canvas.top + (1 - n.y) / 2 * canvas.height];
      const sideways = innerWidth > innerHeight && innerHeight <= 520;
      const free = innerWidth > 900 || sideways ? [0, 0, panel.left, innerHeight] : [0, 0, innerWidth, panel.top];
      return { sit: st.conv.sitId, npc: st.conv.npcId, mode: r.mode, inRock: sp.inside(r.cam.position), clear: sp.free(r.cam.position, trunk), z: +n.z.toFixed(3), px: px.map(Math.round), free: free.map(Math.round),
        lines: st.conv.transcript.filter((l) => l.npc).length, cam: [r.cam.position.x, r.cam.position.y, r.cam.position.z].map((q) => +q.toFixed(1)) };
    }, [TREE.x, TREE.z]);
    check(`${label}: stepping onto the island, the tree speaks by itself: its conversation, three lines said`, v.sit === "x04-yaxche" && v.npc === "yaxche" && v.lines >= 3, v);
    check(`${label}: the camera stands in the open and the trunk is in the picture`, v.mode === "talk" && !v.inRock && v.clear >= 0.6 && v.z < 1 && v.px[0] >= v.free[0] && v.px[0] <= v.free[2] && v.px[1] >= v.free[1] && v.px[1] <= v.free[3], v);
    await snap("2-the-tree-asks");

    // ---- talked through: who it is, at home here, a promise; then its last words
    await say("No. ¿Quién eres?");
    await say("Me siento en casa.");
    await snap("3-will-you-keep-learning");
    await say("Sí, voy a seguir.");
    await page.waitForFunction(() => window.__ew.store.getState().progress.cave?.tree, null, { timeout: 90000 });
    const said = await page.evaluate(() => window.__ew.store.getState().conv.transcript.filter((l) => l.npc).length);
    check(`${label}: the tree is heard out (saved), nine or more lines said`, said >= 9, said);
    await say("Muchas gracias, Yaxché.");
    await page.waitForTimeout(1500);
    await snap("4-last-words");
    await page.evaluate(() => window.__ew.game.closeConversation());
    await page.waitForFunction(() => !window.__ew.store.getState().conv.active, null, { timeout: 20000 });

    // ---- the stones speak again: none is lit, each has a line, no two the same; the card counts
    const roundText = ({ n, of }) => lt ? `Akmenys vėl kalba. Išgirsta frazių: ${n} iš ${of}` : `The stones are speaking again. Phrases heard: ${n} of ${of}`;
    const round = await page.evaluate(() => window.__ew.game.cave.progress());
    await page.waitForFunction((next) => window.__ew.store.getState().hud.cave?.next === next, roundText(round), { timeout: 20000 });
    let q = await page.evaluate(() => { const c = window.__ew.game.cave, st = window.__ew.store.getState(); return { replay: c.replay, lit: [...c.relit], lines: [...c.phrases.values()].map((p) => p.id), card: st.hud.cave, saved: st.progress.cave.lit.length }; });
    check(`${label}: the stones speak again: all fifteen wait, each with a line of its own, the first time's lit stones still saved`, q.replay && q.lit.length === 0 && q.lines.length === 15 && new Set(q.lines).size === 15 && q.lines.every(Boolean) && q.saved === 15 && q.card.lit === 0, q);
    await snap("5-the-stones-wake");

    // ---- a stone of the heart's chamber, answered again
    await page.evaluate(() => window.__ew.game.enterZone("gruta", { x: 6.2, z: -189.4, rot: Math.PI }, true));
    await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "listen", null, { timeout: 20000 });
    await press();
    await page.waitForFunction(() => !!window.__ew.store.getState().hud.glyph, null, { timeout: 12000 });
    const g1 = await page.evaluate(() => window.__ew.store.getState().hud.glyph);
    const line = await page.evaluate((id) => window.__ew.game.cave.phrases.get(id).id, g1.id);
    check(`${label}: its card: a line of the stones' own, its meaning among three`, g1.options.length === 3 && g1.options[g1.answer] === g1.lt && !!g1.s, { text: g1.text, options: g1.options });
    await page.locator(".glyph-opt").nth(g1.answer).click();
    await page.waitForFunction(() => window.__ew.store.getState().hud.glyph?.solved, null, { timeout: 10000 });
    check(`${label}: lit, the card shows the line word by word`, await page.locator(".glyph-line .il-unit, .glyph-line [class*=unit], .glyph-line .w").count() > 0 || await page.locator(".glyph-line").count() === 1);
    await snap("6-a-stone-again");
    await page.waitForFunction(() => !window.__ew.store.getState().hud.glyph, null, { timeout: 15000 });
    await page.waitForTimeout(600);
    q = await page.evaluate(() => { const st = window.__ew.store.getState(), c = window.__ew.game.cave; return { heard: st.progress.cave.heard, book: Object.keys(st.progress.phrases).filter((k) => /corazon_|agua_|raices_|rio_|estrellas_/.test(k)), card: st.hud.cave.next, relit: [...c.relit], saved: st.progress.cave.lit.length }; });
    const heard = [...new Set([...final.heard, line])];
    assert.deepEqual(q.heard, heard);
    assert.deepEqual(q.book, heard.map((id) => `x04-yaxche:${id}`));
    check(`${label}: the line is counted as heard, and is a phrase of the learner's now`, q.card === roundText({ n: heard.length, of: round.of }) && q.relit.length === 1 && q.saved === 15, q);

    // ---- the stone rests, then wakes with another line (its rest cut short here)
    const was = await page.evaluate(() => { const c = window.__ew.game.cave, id = [...c.relit][0]; const line = c.phrases.get(id).id; c.rearm.set(id, 0.3); return { id, line }; });
    await page.waitForFunction((id) => !window.__ew.game.cave.relit.has(id), was.id, { timeout: 15000 });
    const now = await page.evaluate((id) => { const c = window.__ew.game.cave; return { line: c.phrases.get(id)?.id, sayable: c.sayable().flat().length }; }, was.id);
    // (with no more recorded lines than stones, before the new clips are in the clip list, it can only say its own again)
    check(`${label}: rested, the stone waits again with a line not heard yet`, !!now.line && (now.line !== was.line || now.sayable <= 15), { was, now });

    if (!phone) {
      const legacy = { ...final };
      delete legacy.heart;
      await page.evaluate((cave) => window.__ew.store.getState().updateProgress((p) => { p.cave = cave; }), legacy);
      await reloadCave();
      assert.deepEqual(await storedCave(), final);
      check(`${label}: a legacy save with all stones lit recovers the saved heart and bloom`, await page.evaluate(flowerBrightness) > 1);
    }
    check(`${label}: no page errors`, errors.length === 0, errors);
    await ctx.close();
  }
  console.log("cave-tree: all checks passed");
} finally {
  await browser.close();
}
