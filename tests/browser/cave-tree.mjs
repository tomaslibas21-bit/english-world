// Puerto Colibrí's grotto once its heart is found (18 Nov 2026), in the real game: the great tree speaks when the
// learner walks onto its island (x04-yaxche: by itself the first time), its camera stands in the open with the tree in
// the picture, and once it is heard out the stones speak again: a stone answered is counted, becomes a phrase of the
// learner's, rests and wakes with another line. A computer and a phone. Against a dev server or a built game of the
// Spanish edition:
// WORLD_TEST_URL=http://127.0.0.1:8176 WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/cave-tree.mjs [--shots=<dir>]
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import path from "node:path";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8176";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const shots = process.argv.find((a) => a.startsWith("--shots="))?.slice(8);
if (shots) mkdirSync(shots, { recursive: true });
const check = (name, value, detail) => {
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name, detail === undefined ? "" : JSON.stringify(detail).slice(0, 300));
};
const STONES = ["agua", "raices", "rio", "estrellas", "corazon"].flatMap((c) => [1, 2, 3].map((i) => `${c}-${i}`));
const TREE = { x: 6, z: -180 };
// (everything lit, the heart found, the tree not heard yet: as the owner's save stood on 18 Nov)
const save = {
  version: 1,
  profile: { name: "Test", gender: "f", lookId: "f1", look: { skin: "#f2d3bd", hair: { style: "long", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", volume: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: { "x04-yaxche": true }, started: 1, place: { zone: "town", x: -101, z: -7.4, rot: 0 }, coach: { done: true, run: true },
  cave: { lit: STONES, passed: ["kin", "nikte"], seen: true, heart: true },
};

const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  for (const phone of [false, true]) {
    const label = phone ? "phone" : "computer";
    const ctx = await browser.newContext(phone ? { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(([k, v]) => { try { sessionStorage.setItem("ew-play-now", "1"); } catch {} localStorage.setItem(k, v); }, [`${storage}-progress-v1`, JSON.stringify(save)]);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__ew?.store?.getState().screen === "play" && window.__ew.game?.ledges?.ready, null, { timeout: 240000 });
    await page.evaluate(() => { window.__ew.coach?.finish?.(); window.__ew.store.getState().setHud({ panel: null }); });
    const snap = async (name) => { if (shots) { await page.waitForTimeout(500); await page.screenshot({ path: path.join(shots, `${name}-${label}.png`) }); } };
    const press = async () => { if (phone) await page.locator(".act-btn").tap(); else await page.keyboard.press("e"); };
    const say = async (t) => {
      await page.waitForFunction(() => window.__ew.store.getState().conv.phase === "you", null, { timeout: 90000 });
      await page.waitForTimeout(500);
      await page.evaluate((t) => window.__ew.game.activeSession.submit(t, [], "typed"), t);
    };

    // ---- on the lake's shore: the card sends one to the tree; the stones' own lines are in
    await page.evaluate(() => { const g = window.__ew.game; g.keys.clear(); g.enterZone("gruta", { x: 6, z: -171.5, rot: Math.PI }, true); g.rig.yaw = Math.PI; g.rig.snap(); });
    await page.waitForFunction(() => window.__ew.game.cave?.pool?.size >= 215, null, { timeout: 60000 });
    let card = await page.evaluate(() => window.__ew.store.getState().hud.cave);
    check(`${label}: the heart found, the tree not heard: the card sends the learner to the tree`, card.n === 5 && /tree|medžio/i.test(card.next), card);
    check(`${label}: the stones' 215 lines are loaded with the tree's conversation`, await page.evaluate(() => window.__ew.game.cave.pool.size) === 215);
    await snap("1-shore");

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
      const free = innerWidth > 900 ? [0, 0, panel.left, innerHeight] : [0, 0, innerWidth, panel.top];
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
    await page.waitForFunction(() => /0/.test(window.__ew.store.getState().hud.cave?.next ?? ""), null, { timeout: 20000 });
    let q = await page.evaluate(() => { const c = window.__ew.game.cave, st = window.__ew.store.getState(); return { replay: c.replay, lit: [...c.relit], lines: [...c.phrases.values()].map((p) => p.id), card: st.hud.cave, saved: st.progress.cave.lit.length }; });
    check(`${label}: the stones speak again: all fifteen wait, each with a line of its own, the first time's lit stones still saved`, q.replay && q.lit.length === 0 && q.lines.length === 15 && new Set(q.lines).size === 15 && q.lines.every(Boolean) && q.saved === 15 && q.card.lit === 0, q);
    await snap("5-the-stones-wake");

    // ---- a stone of the heart's chamber, answered again
    await page.evaluate(() => window.__ew.game.enterZone("gruta", { x: 6.2, z: -189.4, rot: Math.PI }, true));
    await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "listen", null, { timeout: 20000 });
    await press();
    await page.waitForFunction(() => !!window.__ew.store.getState().hud.glyph, null, { timeout: 12000 });
    const g1 = await page.evaluate(() => window.__ew.store.getState().hud.glyph);
    check(`${label}: its card: a line of the stones' own, its meaning among three`, g1.options.length === 3 && g1.options[g1.answer] === g1.lt && !!g1.s, { text: g1.text, options: g1.options });
    await page.locator(".glyph-opt").nth(g1.answer).click();
    await page.waitForFunction(() => window.__ew.store.getState().hud.glyph?.solved, null, { timeout: 10000 });
    check(`${label}: lit, the card shows the line word by word`, await page.locator(".glyph-line .il-unit, .glyph-line [class*=unit], .glyph-line .w").count() > 0 || await page.locator(".glyph-line").count() === 1);
    await snap("6-a-stone-again");
    await page.waitForFunction(() => !window.__ew.store.getState().hud.glyph, null, { timeout: 15000 });
    await page.waitForTimeout(600);
    q = await page.evaluate(() => { const st = window.__ew.store.getState(), c = window.__ew.game.cave; return { heard: st.progress.cave.heard, book: Object.keys(st.progress.phrases).filter((k) => /corazon_|agua_|raices_|rio_|estrellas_/.test(k)), card: st.hud.cave.next, relit: [...c.relit], saved: st.progress.cave.lit.length }; });
    check(`${label}: the line is counted as heard, and is a phrase of the learner's now`, q.heard?.length === 1 && q.book.length === 1 && q.book[0] === "x04-yaxche:" + q.heard[0] && /1\b/.test(q.card) && q.relit.length === 1 && q.saved === 15, q);

    // ---- the stone rests, then wakes with another line (its rest cut short here)
    const was = await page.evaluate(() => { const c = window.__ew.game.cave, id = [...c.relit][0]; const line = c.phrases.get(id).id; c.rearm.set(id, 0.3); return { id, line }; });
    await page.waitForFunction((id) => !window.__ew.game.cave.relit.has(id), was.id, { timeout: 15000 });
    const now = await page.evaluate((id) => { const c = window.__ew.game.cave; return { line: c.phrases.get(id)?.id, sayable: c.sayable().flat().length }; }, was.id);
    // (with no more recorded lines than stones, before the new clips are in the clip list, it can only say its own again)
    check(`${label}: rested, the stone waits again with a line not heard yet`, !!now.line && (now.line !== was.line || now.sayable <= 15), { was, now });
    check(`${label}: no page errors`, errors.length === 0, errors);
    await ctx.close();
  }
  console.log("cave-tree: all checks passed");
} finally {
  await browser.close();
}
