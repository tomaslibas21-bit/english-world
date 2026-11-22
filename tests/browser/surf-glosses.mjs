// Every Spanish line of the surf lesson has its translation on the screen (owner, 22 Nov 2026: "in the surfing game
// there's a bunch of stuff that's not translated or at least no translation is shown, not just ¡Qué revolcón!").
// For each line of x01-surf's `sg_…` set (src/editions/es/content/surf-lines.ts: her calls, commands, questions,
// corrections, rewards, and the learner's own answers), in the real lesson's overlay:
//   - her line: every word has its meaning under it, and the whole meaning under that where it says more than the
//     words; also after the line has been heard many times (the help no longer fades away);
//   - the same line as one of the learner's answers: every word with its meaning under it, in the button;
//   - what the learner has just said: with its meaning;
//   - the translations are in the learner's language (the Lithuanian layer: no English left in them);
//   - with the game's translation setting off, her line is the Spanish alone (the learner's choice is kept).
// Sizes 390×844, 390×664 (phones) and 1280×800; WORLD_SHOTS=<folder> keeps pictures of a few lines at each size.
// WORLD_TEST_URL=http://127.0.0.1:8460 WORLD_STORAGE=puerto-colibri WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/surf-glosses.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8460";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const shots = process.env.WORLD_SHOTS || "";
const check = (name, value, detail) => {
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name, detail === undefined ? "" : JSON.stringify(detail).slice(0, 300));
};
const ROOT = path.resolve(import.meta.dirname, "../..");
const CUES = [...fs.readFileSync(path.join(ROOT, "src/editions/es/content/surf-lines.ts"), "utf8").matchAll(/^\s+sg_(\w+):\s*\[/gm)].map((m) => m[1]);
assert(CUES.length > 100, "the surf lines were not found: " + CUES.length);
const SHOOT = ["wipeout", "missed", "duck_miss", "et_go_wrong", "a_late", "now_up", "slang1", "a_enough"];
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 5, play: "town", quality: "low", scenes: false, volume: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: 28, z: -14.6, rot: Math.PI },
  coach: { done: true, run: true },
};
// (the game's clock in the test's hands: nothing moves between two lines put on the screen)
const INIT = `(() => {
  try { sessionStorage.setItem("ew-play-now", "1"); } catch {}
  let now = 1000;
  performance.now = () => now;
  const q = [];
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = (n, dt = 1000 / 60) => { for (let i = 0; i < n; i++) { now += dt; const cbs = q.splice(0); for (const cb of cbs) cb(now); } return now; };
})();`;
const ENGLISHY = /\b(the|and|you|your|with|is|are|it's|I'm|don't|wave|board|paddle)\b/i;

const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  for (const size of [{ w: 390, h: 844, phone: true }, { w: 390, h: 664, phone: true }, { w: 1280, h: 800, phone: false }]) {
    const label = `${size.w}x${size.h}`;
    const ctx = await browser.newContext(size.phone ? { viewport: { width: size.w, height: size.h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: size.w, height: size.h } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
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
    const lang = await page.evaluate(() => document.documentElement.lang);
    const lt = lang === "lt";
    check(`${label}: the town has a surf school (learner language: ${lang})`, await page.evaluate(() => !!window.__ew.game.surf));
    await page.evaluate(() => window.__ew.game.surfStart("beginner"));
    await real(700); await step(30);
    check(`${label}: a lesson is on`, await page.evaluate(() => window.__ew.surf.getState().active));

    /** Put a line on the screen as hers (heard `n` times before: the support the game would give it), as the only
     *  answer, and as what the learner has just said; read what each shows. */
    const show = (cue, support) => page.evaluate(([c, sup]) => {
      const g = window.__ew.game, S = window.__ew.surf;
      const s = g.surf.line(c);
      if (!s) return { missing: true };
      S.getState().set({ line: { cue: c, s }, support: sup, choice: { id: "t", options: [{ cue: c, s }] }, todo: null, said: { cue: c, s }, over: false, mark: null });
      return { es: s.units.map((u) => u.en), gloss: s.units.map((u) => u.lt), nat: s.nat ?? "" };
    }, [cue, support]);
    const read = () => page.evaluate(() => {
      const q = (sel) => [...document.querySelectorAll(sel)];
      const card = document.querySelector(".surf-card");
      return {
        units: q(".surf-card .il .u").length,
        lts: q(".surf-card .il .u .lt").map((e) => e.innerText.trim()),
        nat: card?.querySelector(".nat")?.innerText.trim() ?? "",
        answerUnits: q(".surf-choice .surf-il .u").length,
        answerLts: q(".surf-choice .surf-il .lt").map((e) => e.innerText.trim()),
        answerNat: document.querySelector(".surf-choice small")?.innerText.trim() ?? "",
        said: document.querySelector(".surf-said small")?.innerText.trim() ?? "",
        listen: !!document.querySelector(".surf-listen"),
        fits: (() => { const r = card?.getBoundingClientRect(); return !!r && r.left >= 0 && r.right <= innerWidth + 0.5 && r.top >= 0; })(),
        choiceFits: q(".surf-choice").every((b) => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5; }),
      };
    });
    const bare = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const bad = [], english = [], unfit = [];
    for (const cue of CUES) {
      for (const support of [0, 2]) {
        const want = await show(cue, support);
        if (want.missing) { bad.push(`${cue}: no line`); continue; }
        await real(25);
        const got = await read();
        const natNeeded = bare(want.gloss.join(" ")) !== bare(want.nat);
        const tag = `${cue}@${support}`;
        if (got.listen) bad.push(`${tag}: hidden behind "listen"`);
        if (got.units !== want.es.length || got.lts.length !== want.es.length || got.lts.some((t) => !t)) bad.push(`${tag}: her line ${got.lts.length}/${want.es.length} glosses`);
        if (natNeeded && !got.nat) bad.push(`${tag}: her line has no meaning under it`);
        if (got.answerUnits !== want.es.length || got.answerLts.length !== want.es.length || got.answerLts.some((t) => !t)) bad.push(`${tag}: the answer ${got.answerLts.length}/${want.es.length} glosses`);
        if (natNeeded && !got.answerNat) bad.push(`${tag}: the answer has no meaning under it`);
        if (support === 0 && shots && SHOOT.includes(cue)) { await real(120); await page.screenshot({ path: `${shots}/${lang}-${label}-${cue}.png` }); }
        await page.evaluate(() => window.__ew.surf.getState().set({ choice: null }));
        await real(25);
        if (!(await read()).said) bad.push(`${tag}: what was said has no meaning`);
        if (lt) for (const t of [...got.lts, got.nat, got.answerNat].filter(Boolean)) if (ENGLISHY.test(t)) english.push(`${cue}: ${t}`);
        if (!got.fits || !got.choiceFits) unfit.push(tag);
        if (support === 0 && shots && SHOOT.includes(cue)) { await real(120); await page.screenshot({ path: `${shots}/${lang}-${label}-${cue}-said.png` }); }
      }
    }
    check(`${label}: all ${CUES.length} surf lines: her line, the answer and what was said, each with its translation (also when heard often)`, bad.length === 0, bad.slice(0, 12));
    if (lt) check(`${label}: the translations are Lithuanian (no English left)`, english.length === 0, english.slice(0, 12));
    check(`${label}: her line and the answer fit on the screen`, unfit.length === 0, unfit.slice(0, 12));

    // the learner's own setting: translations of her lines off → the Spanish alone; on again → back
    await page.evaluate(() => window.__ew.store.getState().setSettings({ lt: false }));
    await show("wipeout", 0); await real(25);
    const off = await read();
    check(`${label}: with the translation setting off, her line is the Spanish alone`, off.lts.length === 0 && !off.nat, off);
    await page.evaluate(() => window.__ew.store.getState().setSettings({ lt: true }));
    await show("wipeout", 0); await real(25);
    check(`${label}: and with it on again, “¡Qué revolcón!” has its words' meaning`, (await read()).lts.length === 2);
    check(`${label}: no errors on the page`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
  console.log("surf-glosses: all checks passed");
} finally {
  await browser.close();
}
