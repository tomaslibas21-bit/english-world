// The surf lesson in the real game (src/game/surf/), a computer and a phone: the prompt at the school's boards, the
// level's choice, a whole lesson played with the keys or the phone's buttons by a learner who does what the
// instructor says (the wrong board first), a second one who stands up too early and answers her question, the score
// card, back on the sand with the score and the cards kept; the lesson started by the conversation's own event; and
// the way out at any moment. Time is stepped by hand, so a lesson takes seconds. Against a dev server or a built game
// of a town with a surf school (Puerto Colibrí):
// WORLD_TEST_URL=http://127.0.0.1:8096 WORLD_STORAGE=puerto-colibri WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/surf.mjs
import assert from "node:assert/strict";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8096";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const check = (name, value, detail) => {
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name, detail === undefined ? "" : JSON.stringify(detail));
};
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 5, play: "town", quality: "low", scenes: false, volume: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: 28, z: -14.6, rot: Math.PI },
  coach: { done: true, run: true },
};
// (the game's clock in the test's hands: every frame is a call of __step)
const INIT = `(() => {
  try { sessionStorage.setItem("ew-play-now", "1"); } catch {}
  let seed = 20261115;
  Math.random = function () { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let now = 1000;
  performance.now = () => now;
  const q = [];
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = (n, dt = 1000 / 60) => { for (let i = 0; i < n; i++) { now += dt; const cbs = q.splice(0); for (const cb of cbs) cb(now); } return now; };
})();`;

const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  for (const phone of [false, true]) {
    const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
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
    const label = phone ? "phone" : "computer";
    const step = (n) => page.evaluate((k) => window.__step(k), n);
    const real = (ms) => new Promise((r) => setTimeout(r, ms));
    const fade = async () => { await real(600); await step(20); };
    await page.evaluate(() => { window.__ew.coach?.finish?.(); window.__ew.store.getState().setHud({ panel: null }); });
    const has = await page.evaluate(() => !!window.__ew.game.surf);
    check(`${label}: this town has a surf school`, has);
    const L = () => page.evaluate(() => { const l = window.__ew.game.surf.logic; return l ? { phase: l.phase, pose: l.pose, d: +l.d.toFixed(1), saying: l.saying, choice: l.choice?.id ?? null, options: l.choice?.options ?? null, cmd: l.cmd?.c.act ?? null, score: l.score, level: l.level, reason: l.reason, heard: l.heard, upOpen: l.upOpen } : null; });
    const hud = () => page.evaluate(() => window.__ew.store.getState().hud);
    const paddle = async () => { if (phone) await page.locator(".act-btn").tap(); else await page.keyboard.press("e"); };
    const stand = async () => { if (phone) await page.locator(".jump-btn").tap(); else await page.keyboard.press(" "); };
    const stick = async (x, y) => {
      if (phone) { await page.evaluate(([a, b]) => window.__ew.game.setJoystick(a, b), [x, y]); return; }
      for (const [k, on] of [["ArrowLeft", x < 0], ["ArrowRight", x > 0], ["ArrowDown", y < 0], ["ArrowUp", y > 0]]) await page.keyboard[on ? "down" : "up"](k);
    };

    // ---- at the school's boards: the prompt, the level's choice, and "not now"
    const start = await page.evaluate(() => { const g = window.__ew.game, s = g.surf.spot.start; g.enterZone("town", { x: s.x, z: s.z, rot: s.rot }, true); return s; });
    await step(30);
    check(`${label}: the prompt at the boards is the lesson's`, (await hud()).prompt?.kind === "surf", (await hud()).prompt);
    if (phone) await page.locator(".act-btn").tap(); else await page.keyboard.press("e");
    await step(5);
    check(`${label}: the level's choice comes up`, await page.locator(".surf-pick .surf-level").count() === 2);
    await page.locator(".surf-later").click();
    await step(5);
    check(`${label}: "not now" closes it`, await page.locator(".surf-pick").count() === 0 && !(await L()));
    if (phone) await page.locator(".act-btn").tap(); else await page.keyboard.press("e");
    await step(5);
    await page.locator(".surf-level").first().click();
    await fade();
    let s = await L();
    check(`${label}: a beginner's lesson is on, on the sand`, s?.level === "beginner" && s.phase === "intro" && (await hud()).ride === "surf", s);
    check(`${label}: the town's own buttons are away, her line is on show`, await page.locator(".toolbar, .minimap").count() === 0 && await page.locator(".surf-score").count() === 1);
    const npcHidden = await page.evaluate(() => window.__ew.game.npcs.find((n) => n.id === window.__ew.game.surf.content.npc)?.ch.root.visible === false);
    check(`${label}: the instructor is in the water with the learner, not at her counter too`, npcHidden);

    // ---- a lesson, played by the keys or the phone's buttons. `how`: "good" does what she says (the wrong board
    // first); "early" stands up before the call once
    const play = async (how, level) => {
      let wrongBoard = how === "good", early = how === "early", frames = 0, strokeT = 0, upT = 0, askT = 0, last = { x: 0, y: 0 };
      const said = new Set();
      for (; frames < 60 * 200; frames++) {
        s = await L();
        if (!s) break;
        if (s.saying) said.add(s.saying);
        if (s.phase === "over") break;
        let x = 0, y = 0;
        if (s.choice && ++askT > 20) {
          askT = 0;
          const pick = s.choice === "board" ? (wrongBoard ? "b_sup" : level === "beginner" ? "b_long" : "b_short")
            : s.choice === "turn" ? await page.evaluate(() => (window.__ew.game.surf.logic.etiquette === "mine" ? "a_go" : "a_yours"))
            : s.choice === "why" ? "a_" + s.reason : s.score.waves >= 1 ? "a_enough" : "a_again";
          wrongBoard = false;
          // (the answers are buttons with her Spanish on them: tapped, or 1–3 on a keyboard)
          const i = s.options.indexOf(pick);
          if (phone) await page.locator(".surf-choice").nth(i).tap(); else await page.keyboard.press(String(i + 1));
          if (pick === "a_again" || s.choice === "board") { await step(30); await fade(); }
        } else if (!s.choice) askT = 0;
        if ((s.phase === "out" || s.phase === "catch") && ++strokeT >= 5) { strokeT = 0; await paddle(); }
        const waves = await page.evaluate(() => { const l = window.__ew.game.surf.logic; return l ? l.waves.filter((w) => !w.past).map((w) => ({ gap: w.d - l.d, yes: w.yes })) : []; });
        if (s.phase === "out" && waves.some((w) => w.gap < 5)) y = -1;
        if (s.phase === "wait" && waves.some((w) => w.yes && w.gap < 20 && w.gap > 8)) x = 1;
        if (s.phase === "catch") {
          if (early && !s.upOpen && ++upT > 12) { early = false; upT = 0; await stand(); }
          else if (s.upOpen && ++upT > 6) { upT = 0; await stand(); }
        } else if (!early) upT = 0;
        if (s.phase === "ride" && s.cmd) {
          if (s.cmd === "left") x = -1; if (s.cmd === "right") x = 1; if (s.cmd === "down") y = -1; if (s.cmd === "fwd") y = 1;
          if (s.cmd === "jump") await stand();
        }
        if (x !== last.x || y !== last.y) { await stick(x, y); last = { x, y }; }
        await step(4);
      }
      await stick(0, 0);
      return { said: [...said], frames };
    };
    let run = await play("good", "beginner");
    s = await L();
    check(`${label}: the lesson ran to its end: a wave ridden to the beach, every command followed`, s?.phase === "over" && s.score.waves === 1 && s.score.falls === 0 && s.score.followed === s.score.asked && s.score.asked >= 3, s?.score);
    check(`${label}: the wrong board got a word, the wave its call`, ["board_no", "now_up", "up_ok", "shore"].every((c) => s.heard.includes(c)), s.heard.length);
    await step(20);
    check(`${label}: the score card is on show`, await page.locator(".surf-result").count() === 1);
    // ---- another lesson from the card, further out: stand up too early once, answer her, ride the next
    await page.locator(".surf-level.adv").click();
    await fade();
    s = await L();
    check(`${label}: another lesson, advanced`, s?.level === "advanced" && s.phase === "intro", s);
    run = await play("early", "advanced");
    s = await L();
    check(`${label}: a fall was a question, and the next wave was ridden`, s?.phase === "over" && s.score.falls === 1 && s.score.waves === 1 && ["wipeout", "what_happened", "r_exact", "tip_early", "another", "q_go"].every((c) => s.heard.includes(c)), { score: s?.score, heard: s?.heard.length });
    await step(20);
    await page.locator(".surf-later").click();
    await fade();
    const after = await page.evaluate(() => {
      const g = window.__ew.game, p = g.player.root.position, st = window.__ew.store.getState();
      return { x: +p.x.toFixed(1), z: +p.z.toFixed(1), y: +p.y.toFixed(2), on: g.surf.active, mode: g.rig.mode, ride: st.hud.ride, surf: st.progress.surf, npc: g.npcs.find((n) => n.id === g.surf.content.npc)?.ch.root.visible, order: g.player.root.rotation.order, cards: (localStorage.getItem(Object.keys(localStorage).find((k) => /cards/.test(k)) ?? "") ?? "").length };
    });
    check(`${label}: back on the sand by the boards, walking again, the instructor at her counter`, !after.on && after.mode === "follow" && after.ride === null && after.npc === true && after.order === "XYZ" && Math.hypot(after.x - start.x, after.z - start.z) < 0.5, after);
    check(`${label}: the waves, the seconds and what was heard are kept, and the phrases are cards`, after.surf?.waves === 2 && after.surf.lessons === 2 && after.surf.seconds > 20 && after.surf.heard.now_up >= 2 && after.cards > 500, { ...after.surf, heard: Object.keys(after.surf?.heard ?? {}).length, cards: after.cards });
    await step(30);
    check(`${label}: the town's buttons are back`, await page.locator(".toolbar").count() === 1);

    // ---- the conversation's "¿Probamos una ola?": its event starts the lesson as it ends; the way out at any moment
    const sitOk = await page.evaluate(() => {
      const g = window.__ew.game, sit = g.orderedSituations().find((q) => q.id === g.surf.content.situation);
      if (!sit) return false;
      g.onSessionEvent("surf", { level: "advanced" });
      g.endSession(sit, true);
      return true;
    });
    if (sitOk) {
      await fade();
      s = await L();
      check(`${label}: the conversation's event starts the lesson (the learner said they surf: advanced)`, s?.level === "advanced", s);
      await step(60);
      if (phone) await page.locator(".surf-x").tap(); else await page.keyboard.press("Escape");
      await fade();
      check(`${label}: out of it at once, on foot`, !(await L()) && (await hud()).ride === null);
    }
    check(`${label}: no errors on the page`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
  console.log("surf: all checks passed");
} finally {
  await browser.close();
}
