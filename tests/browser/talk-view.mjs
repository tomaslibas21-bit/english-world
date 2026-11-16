// The conversation's picture and the first minute, in a browser, on a computer (1280×800), an upright phone (375×812)
// and a short one (375×667):
// - the person spoken with is never behind the learner's own figure (the first conversation, passport control, was:
//   their backpack and head over the officer's face), is inside the part of the picture the conversation leaves free,
//   is seen from their front, and on a computer stands large (Game.fitTalk's nearer views, game/talkShot.ts): started
//   from the list, and walked up to from right in front and from each side;
// - when someone else of the conversation speaks, the camera turns to them (Game.aimTalk);
// - a first visit opens with the flight over the town and one sentence, no manual (game/flyover.ts); any key or a tap
//   ends it; then how to walk comes up, alone (game/coach.ts); the next visit opens with the list, as before.
// Against a dev server or a built game:
// WORLD_TEST_URL=http://127.0.0.1:8176 WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/talk-view.mjs [--shots=<dir>]
// (the Spanish edition: WORLD_STORAGE=puerto-colibri)
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import path from "node:path";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8176";
const storage = process.env.WORLD_STORAGE || "english-world";
const shots = process.argv.find((a) => a.startsWith("--shots="))?.slice(8);
if (shots) mkdirSync(shots, { recursive: true });
const check = (name, value, detail) => {
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name, detail === undefined ? "" : JSON.stringify(detail));
};
const profile = { name: "Test", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } };
const settings = { v: 6, play: "town", quality: "low", volume: 0, cameraFollow: true, scenes: false };
const returning = { version: 1, profile, settings, sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "airport", x: -14, z: -1, rot: Math.PI }, coach: { done: true, run: true, view: true } };
const firstVisit = { version: 1, profile, settings, sits: {}, phrases: {}, seenIntro: {}, started: 1 };
const iPhone = { deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1" };
const SIZES = { computer: { viewport: { width: 1280, height: 800 } }, phone: { ...iPhone, viewport: { width: 375, height: 812 } }, "short phone": { ...iPhone, viewport: { width: 375, height: 667 } } };
// passport control (everyone's first conversation), the café's counter, a shop's and an office's counter, the square
const TALKS = ["s65a-passport", "s72-cafe", "s75-pharmacy", "s78-bank", "s69-local"];
// and two with a second speaker standing apart
const CASTS = ["s63-party", "s73-restaurant"];

// In the page: the camera as it stands. How many of the lines from it to the face of `npcId` (the whole face: the
// figures' heads are large) pass through the learner's own figure; where the face is on the screen, and whether that
// is clear of the conversation's panel; how tall they stand; how far round from their front the camera is.
const measure = (npcId) => {
  const g = window.__ew.game, cam = g.rig.cam, who = g.npcs.find((n) => n.id === npcId), p = g.player.root.position, a = who.ch.root.position;
  const canvas = g.renderer.domElement.getBoundingClientRect(), panel = document.querySelector(".convo")?.getBoundingClientRect();
  const o = cam.position, top = p.y + g.player.height * 1.1, R = 0.34;
  const face = a.clone(); face.y += (who.sit ? 0.72 : 0.9) * who.ch.height;
  const rx = -(face.z - o.z), rz = face.x - o.x, rl = Math.hypot(rx, rz) || 1;
  let covered = 0;
  for (const s of [-0.2, 0, 0.2]) for (const dy of [-0.2, 0, 0.12]) {
    const q = { x: face.x + rx / rl * s, y: face.y + dy, z: face.z + rz / rl * s };
    for (let i = 1; i < 60; i++) {
      const t = i / 60, x = o.x + (q.x - o.x) * t, y = o.y + (q.y - o.y) * t, z = o.z + (q.z - o.z) * t;
      if (y > p.y && y < top && (x - p.x) ** 2 + (z - p.z) ** 2 < R * R) { covered++; break; }
    }
  }
  const px = (v) => { const n = v.clone().project(cam); return [canvas.left + (n.x + 1) / 2 * canvas.width, canvas.top + (1 - n.y) / 2 * canvas.height, n.z]; };
  const f = px(face), head = a.clone(); head.y += who.ch.height;
  const wide = panel && panel.left > 100;
  const free = f[2] < 1 && f[0] > 8 && f[1] > 8 && (wide ? f[0] < panel.left - 8 && f[1] < innerHeight - 8 : f[0] < innerWidth - 8 && (!panel || f[1] < panel.top - 4));
  const fx = p.x - a.x, fz = p.z - a.z, cx = o.x - a.x, cz = o.z - a.z;
  const round = Math.round(Math.acos(Math.max(-1, Math.min(1, (fx * cx + fz * cz) / ((Math.hypot(fx, fz) || 1) * (Math.hypot(cx, cz) || 1))))) * 180 / Math.PI);
  return { covered, free, face: [Math.round(f[0]), Math.round(f[1])], tall: Math.round(px(a)[1] - px(head)[1]), round, drawn: g.player.root.visible, apart: +Math.hypot(fx, fz).toFixed(1) };
};

const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio"] });
try {
  for (const [label, opts] of Object.entries(SIZES)) {
    const computer = !opts.hasTouch;
    const open = async (save, fresh) => {
      const ctx = await browser.newContext(opts);
      // (the voices are behind the course's sign-in: silence stands in for them)
      await ctx.route(/\.mp3(\?|$)/, (r) => r.fulfill({ status: 404, body: "" }));
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript(([k, v, fresh]) => {
        try { sessionStorage.setItem("ew-play-now", "1"); } catch {}
        if (!localStorage.getItem(k) || (fresh && sessionStorage.getItem("tv-seeded") !== "1")) localStorage.setItem(k, v);
        sessionStorage.setItem("tv-seeded", "1");
      }, [`${storage}-progress-v1`, JSON.stringify(save), fresh]);
      await page.goto(base + "/", { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.__ew?.store?.getState().screen === "play", null, { timeout: 240000 });
      return { ctx, page, errors };
    };
    const shot = (page, name) => shots ? page.screenshot({ path: path.join(shots, `${label.replace(" ", "-")}-${name}.jpg`), type: "jpeg", quality: 80 }) : null;

    // --- the conversation's picture ---
    {
      const { ctx, page, errors } = await open(returning, false);
      await page.evaluate(() => window.__ew.store.getState().setHud({ panel: null }));
      const view = async (name, npc) => {
        await page.waitForFunction(() => window.__ew.store.getState().conv.active && window.__ew.game.talkNpc, null, { timeout: 20000 });
        // (the camera settled; the conversation itself may go on and turn it: held where it is)
        await page.evaluate(() => { const g = window.__ew.game; g.__aim ??= g.aimTalk; g.aimTalk = () => {}; });
        await page.waitForTimeout(2600);
        const v = await page.evaluate(measure, npc ?? await page.evaluate(() => window.__ew.game.talkNpc.id));
        await shot(page, name);
        await page.evaluate(() => { const g = window.__ew.game; g.aimTalk = g.__aim; });
        check(`${label}, ${name}: nobody's face behind the learner, and the learner in the picture`, v.covered === 0 && v.drawn, v);
        check(`${label}, ${name}: their face in the free part of the picture, seen from their front`, v.free && v.round <= 85, v);
        // (large from the list and walked straight up to; from a counter's side, squeezed against it, at least not small)
        if (computer) check(`${label}, ${name}: they stand large on a computer`, v.tall >= (/walked up [23]|turned to/.test(name) ? 120 : 230), v);
        return v;
      };
      for (const id of TALKS) {
        await page.evaluate((id) => window.__ew.game.startScenario(id), id);
        await view(`${id}, from the list`);
        const at = await page.evaluate(() => { const g = window.__ew.game, n = g.talkNpc, a = n.ch.root.position; return { id: n.id, x: a.x, z: a.z, rot: n.rot, zone: g.zone.id, spot: n.approach ? { x: n.approach.x, z: n.approach.z } : null }; });
        // walked up to: right in front of them and close (where the learner's back was over their face), and from each side
        // (someone behind a counter is walked up to at their talk spot in front of it, and a step to each side of it)
        let k = 0;
        for (const [off, d] of [[0, 1.0], [0.7, 1.3], [-0.7, 1.3]]) {
          k++;
          await page.evaluate(() => window.__ew.game.closeConversation());
          await page.waitForFunction(() => !window.__ew.store.getState().conv.active, null, { timeout: 10000 });
          await page.evaluate(([at, off, d]) => { const g = window.__ew.game; g.keys.clear(); g.setJoystick?.(0, 0); if (at.spot) { const dx = at.x - at.spot.x, dz = at.z - at.spot.z, l = Math.hypot(dx, dz) || 1, x = at.spot.x - dz / l * off, z = at.spot.z + dx / l * off; g.enterZone(at.zone, { x, z, rot: Math.atan2(at.x - x, at.z - z) }, true); }
            else g.enterZone(at.zone, { x: at.x + Math.sin(at.rot + off) * d, z: at.z + Math.cos(at.rot + off) * d, rot: at.rot + off + Math.PI }, true); }, [at, off, d]);
          await page.waitForTimeout(400);
          await page.evaluate((id) => window.__ew.game.talkTo(id), at.id);
          const v = await view(`${id}, walked up ${k}`, at.id);
          if (k === 1) check(`${label}, ${id}: (they stood ${at.spot ? "at the talk spot" : "within 1.6 m"})`, v.apart < (at.spot ? 3 : 1.6), v.apart);
        }
        await page.evaluate(() => window.__ew.game.closeConversation());
        await page.waitForFunction(() => !window.__ew.store.getState().conv.active, null, { timeout: 10000 });
      }
      for (const id of CASTS) {
        await page.evaluate((id) => window.__ew.game.startScenario(id), id);
        await page.waitForFunction(() => window.__ew.store.getState().conv.active && window.__ew.game.talkNpc, null, { timeout: 20000 });
        const cast = await page.evaluate(() => window.__ew.game.talkCast.map((n) => n.id));
        check(`${label}, ${id}: someone else takes part`, cast.length > 1, cast);
        await page.evaluate((other) => { const g = window.__ew.game; g.aimTalk(g.talkCast.find((n) => n.id === other)); }, cast[1]);
        await view(`${id}, turned to ${cast[1]}`, cast[1]);
        await page.evaluate(() => window.__ew.game.closeConversation());
        await page.waitForFunction(() => !window.__ew.store.getState().conv.active, null, { timeout: 10000 });
      }
      check(`${label}: no page errors in the conversations`, errors.length === 0, errors.slice(0, 3));
      await ctx.close();
    }

    // --- the first minute ---
    {
      const { ctx, page, errors } = await open(firstVisit, true);
      const state = () => page.evaluate(() => { const s = window.__ew.store.getState(), g = window.__ew.game; return { flight: s.hud.flight, panel: s.hud.panel, hint: s.hud.coach?.step ?? null, zone: g.zone.id, drawn: g.player.root.visible, words: document.querySelector(".flight-first")?.textContent?.length ?? 0, manual: !!document.querySelector(".howto[open]"), strip: !!document.querySelector(".help-strip:not(.ride-strip)") }; });
      await page.waitForTimeout(700);
      let s = await state();
      await shot(page, "first visit, the flight");
      check(`${label}: a first visit opens over the town, with one sentence and no manual`, s.flight && s.zone === "town" && !s.panel && !s.hint && !s.drawn && s.words > 20 && !s.manual, s);
      // on its own it ends in the airport within its few seconds
      await page.waitForFunction(() => !window.__ew.store.getState().hud.flight && window.__ew.game.zone.id === "airport", null, { timeout: 12000 });
      await page.waitForTimeout(900);
      s = await state();
      await shot(page, "first visit, landed");
      check(`${label}: it lands in the airport, the learner there, how to walk the only hint, no list and no keys' strip`, !s.flight && s.zone === "airport" && s.drawn && s.hint === "walk" && !s.panel && !s.strip, s);
      const task = await page.evaluate(() => window.__ew.store.getState().hud.objective?.sitId ?? null);
      check(`${label}: the first task is on its card`, !!task, task);
      // everything the manual taught is under "Kaip žaisti?" and in the list
      await page.evaluate(() => window.__ew.store.getState().setHud({ panel: "help" }));
      await page.waitForTimeout(300);
      const help = await page.evaluate(() => ({ town: document.querySelectorAll(".town-help li").length, open: !!document.querySelector(".town-help[open]") }));
      await shot(page, "help");
      check(`${label}: the hints are all under the help`, help.town >= 8 && help.open, help);
      await page.evaluate(() => window.__ew.store.getState().setHud({ panel: "scenarios" }));
      await page.waitForTimeout(300);
      const list = await page.evaluate(() => ({ manual: document.querySelectorAll(".howto").length, open: document.querySelectorAll(".howto[open]").length }));
      check(`${label}: the manual is in the list, folded`, list.manual >= 2 && list.open === 0, list);
      // a second new learner cuts the flight short: any key, or a tap
      await page.evaluate(() => { sessionStorage.removeItem("tv-seeded"); });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.__ew?.store?.getState().screen === "play" && window.__ew.store.getState().hud.flight, null, { timeout: 240000 });
      await page.waitForTimeout(500);
      const t0 = Date.now();
      if (computer) await page.keyboard.press("x"); else await page.locator(".flight").tap();
      await page.waitForFunction(() => !window.__ew.store.getState().hud.flight && window.__ew.game.zone.id === "airport", null, { timeout: 4000 });
      check(`${label}: ${computer ? "any key" : "a tap"} ends the flight`, Date.now() - t0 < 3000, Date.now() - t0);
      // the next visit: no flight, the list as before
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.__ew?.store?.getState().screen === "play", null, { timeout: 240000 });
      await page.waitForTimeout(500);
      s = await state();
      check(`${label}: the next visit opens with the list, no flight`, !s.flight && s.panel === "scenarios" && s.zone === "airport", s);
      check(`${label}: no page errors in the first minute`, errors.length === 0, errors.slice(0, 3));
      await ctx.close();
    }
  }
  console.log("PASS");
} finally {
  await browser.close();
}
