// Every English line of the surf lesson has its Lithuanian translation on the screen.
// For each line of x04-surf's `sg_…` set (src/content/surf-lines.ts: her calls, commands, questions,
// corrections, rewards, and the learner's own answers), in the real lesson's overlay:
//   - her line: every word has its meaning under it, and the whole meaning under that where it says more than the
//     words; also after the line has been heard many times (the help no longer fades away);
//   - the same line as one of the learner's answers: every word with its meaning under it, in the button;
//   - what the learner has just said: with its meaning;
//   - the translations are in the learner's language (the Lithuanian layer: no English left in them);
//   - with the game's translation setting off, her line is the English alone (the learner's choice is kept).
// Sizes 390×844, 390×664 (phones) and 1280×800; WORLD_SHOTS=<folder> keeps pictures of a few lines at each size.
// WORLD_TEST_URL=http://127.0.0.1:5188 WORLD_STORAGE=english-world WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/surf-glosses.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SEEDED_RANDOM } from "./fixtures/surf-town.mjs";
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5188";
const storage = process.env.WORLD_STORAGE || "english-world";
const shots = process.env.WORLD_SHOTS || "";
const check = (name, value, detail) => {
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name, detail === undefined ? "" : JSON.stringify(detail).slice(0, 300));
};
const ROOT = path.resolve(import.meta.dirname, "../..");
const CUES = [...fs.readFileSync(path.join(ROOT, "src/content/surf-lines.ts"), "utf8").matchAll(/^\s+sg_(\w+):\s*\[/gm)].map((m) => m[1]);
// The full logic.ts CUES inventory, including both speakers and alternate commands/corrections.
const KNOWN_CUES = `
  start_beg start_adv listen board_ask board_take_long board_take_short board_no board_yes b_long b_short
  b_sup leash go_in lie paddle paddle_hard paddle_more paddle_long wave_duck duck_ok
  duck_miss almost arrive wait look_horizon not_this too_small let_pass not_that this_one
  turn turn_shore paddle_now coming now_up up_ok lean_left lean_right left_short right_short
  knees lower look_front not_feet weight_fwd speed up_face down_face turn_left turn_right
  trick hold good1 good2 good3 prev_mine prev_yours q_go a_go a_yours
  et_go_ok et_wait_ok et_go_wrong et_wait_wrong wipeout you_ok missed what_happened a_late a_early
  a_nopaddle a_back a_knees a_feet a_lean a_side a_trick r_exact r_no r_late
  r_early r_nopaddle r_back r_knees r_feet r_lean r_side r_trick tip_late tip_early
  tip_nopaddle tip_back tip_knees tip_feet tip_lean tip_side tip_trick nothing learn again_q
  a_again a_enough shore first_wave slang1 slang2 slang3 slang4 another bye
  not_yet ride_q easy a_perfect a_ok a_understood a_ready a_coming a_vamos a_and_now
  a_far a_this a_this2 a_now a_fine a_water a_allgood a_soso a_thanks a_fun
`.trim().split(/\s+/);
assert(CUES.length > 100, "the surf lines were not found: " + CUES.length);
assert.equal(new Set(CUES).size, 130);
assert.deepEqual([...CUES].sort(), KNOWN_CUES.sort(), "all 130 source cues match the lesson inventory");
const SHOOT = ["wipeout", "missed", "duck_miss", "et_go_wrong", "a_late", "now_up", "slang1", "a_enough"];
const WIPEOUT = { en: ["Big", "splash!"], gloss: ["Didelis", "pliumptelėjimas!"], nat: "Na ir pliumptelėjote!" };
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 5, play: "town", quality: "low", scenes: false, lt: true, volume: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: 28, z: -14.6, rot: Math.PI },
  coach: { done: true, run: true },
};
// (the game's clock in the test's hands: nothing moves between two lines put on the screen)
const INIT = `(() => {
  try { sessionStorage.setItem("ew-play-now", "1"); } catch {}
  ${SEEDED_RANDOM}
  let now = 1000;
  performance.now = () => now;
  const q = [];
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = (n, dt = 1000 / 60) => { for (let i = 0; i < n; i++) { now += dt; const cbs = q.splice(0); for (const cb of cbs) cb(now); } return now; };
})();`;
const ENGLISHY = /\b(the|and|you|your|with|is|are|it's|I'm|don't|wave|board|paddle)\b/i;
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");

const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  for (const size of [{ w: 390, h: 844, phone: true }, { w: 390, h: 664, phone: true }, { w: 1280, h: 800, phone: false }]) {
    const label = `${size.w}x${size.h}`;
    const ctx = await browser.newContext(size.phone ? { viewport: { width: size.w, height: size.h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: size.w, height: size.h } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error" && /WebGLProgram: Shader Error/.test(m.text())) errors.push(m.text()); });
    await page.route(/\.mp3(?:\?|$)/, (route) => route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } }));
    await page.addInitScript(([k, v]) => { if (sessionStorage.getItem("seeded") !== "1") { sessionStorage.setItem("seeded", "1"); localStorage.clear(); localStorage.setItem(k, v); } }, [`${storage}-progress-v1`, JSON.stringify(progress)]);
    await page.addInitScript(INIT);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    const t0 = Date.now();
    for (;;) {
      const st = await page.evaluate(() => { window.__step?.(2); return window.__ew?.store?.getState().screen ?? "loading"; }).catch(() => "navigating");
      if (st === "play") break;
      assert(Date.now() - t0 < 180000, "the game did not start: " + st);
      await new Promise((r) => setTimeout(r, 300));
    }
    const step = (n) => page.evaluate((k) => window.__step(k), n);
    const real = (ms) => new Promise((r) => setTimeout(r, ms));
    await page.evaluate(() => { window.__ew.coach?.finish?.(); window.__ew.store.getState().setHud({ panel: null }); });
    await page.evaluate(() => window.__ew.store.getState().setSettings({ lt: true }));
    const lang = await page.evaluate(() => document.documentElement.lang);
    assert.equal(lang, "lt", `${label}: document language`);
    const school = await page.evaluate(() => {
      const { surf } = window.__ew.game;
      return surf && [surf.situation, surf.content.npc, surf.spot.start.x, surf.spot.start.z];
    });
    assert.deepEqual(school, ["x04-surf", "maren", -104.2, -69.9], `${label}: Harbor Surf fixtures`);
    await page.evaluate(() => window.__ew.game.surfStart("beginner"));
    for (let i = 0; i < 100 && !(await page.evaluate(() => window.__ew.surf.getState().active)); i++) { await step(6); await real(30); }
    check(`${label}: Maren's beginner lesson is on at the dry start`, await page.evaluate(() => {
      const { game, surf } = window.__ew;
      return surf.getState().active && game.surf.logic?.level === "beginner"
        && game.surf.logic?.phase === "intro" && game.surf.logic?.pose === "walk"
        && game.player.root.position.y >= 0 && !game.swimming;
    }));

    /** Put a line on the screen as hers (heard `n` times before: the support the game would give it), as the only
     *  answer, and as what the learner has just said; read what each shows. */
    const show = (cue, support) => page.evaluate(([c, sup]) => {
      const g = window.__ew.game, S = window.__ew.surf;
      const s = g.surf.line(c);
      if (!s) return { missing: true };
      S.getState().set({ line: { cue: c, s }, support: sup, choice: { id: "t", options: [{ cue: c, s }] }, todo: null, said: { cue: c, s }, over: false, mark: null });
      return { text: s.en, en: s.units.map((u) => u.en), gloss: s.units.map((u) => u.lt), nat: s.nat ?? "" };
    }, [cue, support]);
    const read = () => page.evaluate(() => {
      const q = (sel) => [...document.querySelectorAll(sel)];
      const card = document.querySelector(".surf-card");
      const units = (sel) => q(sel).map((u) => {
        const en = u.querySelector(".en"), lt = u.querySelector(".lt");
        // The cue may have a word-note button inside .en. Read the authored text node separately.
        return { en: en?.firstChild?.textContent.trim() ?? "", lt: lt?.innerText.trim() ?? "",
          enLang: en?.closest("[lang]")?.lang, ltLang: lt?.closest("[lang]")?.lang };
      });
      const fits = (el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.left >= 0 && r.right <= innerWidth + 0.5
          && r.top >= 0 && r.bottom <= innerHeight + 0.5
          && el.scrollWidth - el.clientWidth <= 1 && el.scrollHeight - el.clientHeight <= 1;
      };
      return {
        cue: units(".surf-card .il .u"),
        answer: units(".surf-choice .surf-il .u"),
        nat: card?.querySelector(".nat")?.innerText.trim() ?? "",
        glosses: q(".surf-card .il .lt, .surf-choice .surf-il .lt").length,
        naturalLines: q(".surf-card .nat, .surf-choice small").length,
        answerNat: document.querySelector(".surf-choice small")?.innerText.trim() ?? "",
        said: document.querySelector(".surf-said small")?.innerText.trim() ?? "",
        saidEn: document.querySelector(".surf-said [lang=en]")?.innerText.trim() ?? "",
        saidFits: fits(document.querySelector(".surf-said")),
        listen: !!document.querySelector(".surf-listen"),
        fits: fits(card),
        choiceFits: fits(document.querySelector(".surf-choices")) && q(".surf-choice").length === 1 && q(".surf-choice").every(fits),
      };
    });
    const bare = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const expectedUnits = ({ en, gloss }) => en.map((text, i) => ({ en: text, lt: gloss[i], enLang: "en", ltLang: "lt" }));
    const bad = [], english = [], unfit = [];
    for (const cue of CUES) {
      for (const support of [0, 2]) {
        const want = await show(cue, support);
        if (want.missing) { bad.push(`${cue}: no line`); continue; }
        await real(25);
        const got = await read();
        const natNeeded = bare(want.gloss.filter((t) => !t.startsWith("—")).join(" ")) !== bare(want.nat);
        const tag = `${cue}@${support}`;
        const units = expectedUnits(want);
        if (!units.length || units.some((u) => !u.en || !u.lt?.trim())) bad.push(`${tag}: empty authored unit`);
        if (got.listen) bad.push(`${tag}: hidden behind "listen"`);
        if (!same(got.cue, units)) bad.push(`${tag}: .surf-card units differ: ${JSON.stringify(got.cue)}`);
        if (!same(got.answer, units)) bad.push(`${tag}: .surf-choice units differ: ${JSON.stringify(got.answer)}`);
        if (natNeeded && (got.nat !== want.nat || got.answerNat !== want.nat)) bad.push(`${tag}: expected ${want.nat}, got ${got.nat} / ${got.answerNat}`);
        if (support === 0 && shots && SHOOT.includes(cue)) { await real(120); await page.screenshot({ path: `${shots}/${lang}-${label}-${cue}.png` }); }
        await page.evaluate(() => window.__ew.surf.getState().set({ choice: null }));
        await real(25);
        const said = await read();
        const meaning = want.nat || want.gloss.join(" ");
        if (!meaning || said.said !== meaning || said.saidEn !== want.text) {
          bad.push(`${tag}: .surf-said expected ${want.text} / ${meaning}, got ${said.saidEn} / ${said.said}`);
        }
        for (const t of [...got.cue.map((u) => u.lt), ...got.answer.map((u) => u.lt), got.nat, got.answerNat, said.said]) {
          if (ENGLISHY.test(t)) english.push(`${tag}: ${t}`);
        }
        if (!got.fits || !got.choiceFits || !said.saidFits) unfit.push({ tag, cue: got.fits, choice: got.choiceFits, said: said.saidFits });
        if (support === 0 && shots && SHOOT.includes(cue)) { await real(120); await page.screenshot({ path: `${shots}/${lang}-${label}-${cue}-said.png` }); }
      }
    }
    check(`${label}: all ${CUES.length} surf lines: her line, the answer and what was said, each with its translation (also when heard often)`, bad.length === 0, bad.slice(0, 12));
    check(`${label}: the translations are Lithuanian`, english.length === 0, english.slice(0, 12));
    check(`${label}: her line, the answer and the reply fit on the screen`, unfit.length === 0, unfit.slice(0, 12));

    // the learner's own setting: translations of her lines off → the English alone; on again → back
    await page.evaluate(() => window.__ew.store.getState().setSettings({ lt: false }));
    await show("wipeout", 0); await real(25);
    const off = await read();
    assert.deepEqual(off.cue.map((u) => u.en), WIPEOUT.en);
    assert.deepEqual(off.answer.map((u) => u.en), WIPEOUT.en);
    check(`${label}: with the translation setting off, cue and choice show English alone`, off.glosses === 0 && off.naturalLines === 0, off);
    await page.evaluate(() => window.__ew.surf.getState().set({ choice: null }));
    await real(25);
    const saidOff = await read();
    assert.equal(saidOff.saidEn, "Big splash!");
    assert.equal(saidOff.said, "");
    await page.evaluate(() => window.__ew.store.getState().setSettings({ lt: true }));
    await show("wipeout", 0); await real(25);
    const on = await read();
    const wipeoutUnits = expectedUnits(WIPEOUT);
    check(`${label}: turning Lithuanian on restores both exact wipeout units and the natural line`,
      same(on.cue, wipeoutUnits) && same(on.answer, wipeoutUnits) && on.nat === WIPEOUT.nat && on.answerNat === WIPEOUT.nat, on);
    check(`${label}: no errors on the page`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
  console.log("surf-glosses: all checks passed");
} finally {
  await browser.close();
}
