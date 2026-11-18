// Puerto Colibrí's ruins are walked into (the owner, 18 Nov 2026: "mayan ruins just walkable with a few people you
// may chit chat with, no elder"), in the real game: from the beach's west end the way to Don Efraín leads through the
// gateway; arriving starts his chat (x06-custodio) and it is talked through; the castillo's stairs are walked up to the
// landing before the temple's doorways; Citlali at her easel (x07-pintora) and Doña Rosario in the shade (x08-rosario)
// have their chats; nobody gets out of the precinct but through the gateway (a dev server only: dev/climbAudit.ts).
// A computer and a phone. Playwright's own Chromium, time stepped by hand, against a dev server or a built game of
// the Spanish edition:
// WORLD_TEST_URL=http://127.0.0.1:8186 WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/ruins.mjs [--shots=<dir>]
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8186";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const shots = process.argv.find((a) => a.startsWith("--shots="))?.slice(8);
if (shots) mkdirSync(shots, { recursive: true });
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1", look: { skin: "#f2d3bd", hair: { style: "long", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: { "x06-custodio": true, "x07-pintora": true, "x08-rosario": true }, started: 1, place: { zone: "town", x: -106, z: -66.4, rot: -Math.PI / 2 },
  coach: { seen: { walk: true, run: true, jump: true, talk: true, car: true, boat: true, water: true, radio: true, surf: true, list: true }, run: true, view: true, done: true },
};
const INIT = `(() => {
  try { sessionStorage.setItem("ew-play-now", "1"); } catch {}
  let seed = 20261118;
  Math.random = function () { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let now = 1000;
  performance.now = () => now;
  const q = [];
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = (n, dt = 1000 / 60) => { for (let i = 0; i < n; i++) { now += dt; const cbs = q.splice(0); for (const cb of cbs) cb(now); } return now; };
})();`;
/** The ruins' plan (src/game/world/mexican.ts RUINS), from the temple at (−124, −74). */
const T = { x: -124, z: -74 }, GATE = { x: T.x + 10.5, z: T.z + 7.5 }, FOOT = T.z + 5.26, LANDING = { z: T.z - 1.2, y: 5.3 };
const CHATS = [
  { npc: "custodio", sit: "x06-custodio", says: ["Sí, es mi primera vez.", "¿Cuántos años tiene el templo?", "Muchas gracias."], heard: /ochocientos/ },
  { npc: "pintora", sit: "x07-pintora", says: ["Me gusta mucho.", "Sí, un poco.", "Muchas gracias."], heard: /lápices/ },
  { npc: "rosario", sit: "x08-rosario", says: ["Sí, mucho calor.", "No. ¿Quién es Pepe?", "¿Muerde?", "Muchas gracias."], heard: /iguana/ },
];

const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio"] });
try {
  for (const [label, viewport, mobile] of [["computer", { width: 1280, height: 800 }, false], ["phone", { width: 375, height: 667 }, true]]) {
    const check = (name, value, detail) => {
      assert(value, `${label}: ${name}: ${JSON.stringify(detail)}`);
      console.log("ok", `${label}: ${name}`, detail === undefined ? "" : JSON.stringify(detail).slice(0, 300));
    };
    const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // (no clips: silence, so the lines' own lengths time the turns)
    await page.route(/\.mp3(\?.*)?$/, (r) => r.fulfill({ status: 404, body: "" }));
    await page.addInitScript(([k, v]) => { if (sessionStorage.getItem("seeded") !== "1") { sessionStorage.setItem("seeded", "1"); localStorage.clear(); localStorage.setItem(k, v); } }, [`${storage}-progress-v1`, JSON.stringify(progress)]);
    await page.addInitScript(INIT);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    const t0 = Date.now();
    for (;;) {
      const st = await page.evaluate(() => { window.__step?.(2); return window.__ew?.store?.getState().screen ?? "loading"; }).catch(() => "navigating");
      if (st === "play") break;
      assert(Date.now() - t0 < 240000, "the game did not start: " + st);
      await new Promise((r) => setTimeout(r, 300));
    }
    const step = (n) => page.evaluate((k) => window.__step(k), n);
    const real = (ms) => new Promise((r) => setTimeout(r, ms));
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const shot = async (name) => { if (shots) { await ev(() => window.__ew.store.getState().setHud({ zoneBanner: null })); await step(2); await real(300); await page.screenshot({ path: `${shots}/ruins-${label}-${name}.png` }); } };
    const at = (x, z, rot) => ev(([x, z, rot]) => { const g = window.__ew.game; g.keys.clear(); g.enterZone("town", { x, z, rot }, true); g.rig.yaw = rot; g.rig.snap?.(); }, [x, z, rot]);
    const here = () => ev(() => { const p = window.__ew.game.player.root.position; return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) }; });
    await ev(() => { window.__ew.store.getState().setHud({ panel: null }); window.__ew.game.endFlight?.(); window.__ew.game.setObjective(null); });
    for (let i = 0; i < 200; i++) { await step(10); await real(30); if (await ev(() => !!window.__ew.game.ledges?.ready)) break; }

    // 1. the people of the ruins are there
    await at(-106, GATE.z, -Math.PI / 2);
    await step(90);
    const people = await ev(() => window.__ew.game.npcs.filter((n) => ["custodio", "pintora", "rosario"].includes(n.id)).map((n) => ({ id: n.id, x: +n.home.x.toFixed(1), z: +n.home.z.toFixed(1) })));
    check("Don Efraín, Citlali and Doña Rosario stand on the lawn of the ruins", people.length === 3 && people.every((p) => p.x < -114 && p.x > -137 && p.z > -68.8 && p.z < -57.4), people);
    await shot("1-gateway");

    // 2. each one's chat: the way there (the first one's leads in through the gateway), the chat on arrival, talked through
    const turn = async () => { for (let i = 0; i < 400; i++) { await step(12); await real(25); const s = await ev(() => { const c = window.__ew.store.getState().conv; return { phase: c.phase, active: c.active }; }); if (!s.active || s.phase === "you") return s; } return null; };
    const said = () => ev(() => window.__ew.store.getState().conv.transcript.filter((l) => l.who === "npc").map((l) => l.sentence.units.map((u) => u.en).join(" ")));
    for (const [k, c] of CHATS.entries()) {
      const walk = await ev((id) => { const g = window.__ew.game, a = g.npcs.find((n) => n.id === id), t = a.approach ?? a.home; g.walkTo(t.x, t.z, { kind: "npc", id }); return { to: [t.x, t.z], path: g.autoPath?.length ?? 0 }; }, c.npc);
      check(`${c.npc}: there is a way to them` + (k ? "" : " from the beach's end"), walk.path > 0, walk);
      let started = false;
      for (let i = 0; i < 500 && !started; i++) { await step(15); await real(15); started = await ev(() => window.__ew.store.getState().conv.active); }
      const conv = await ev(() => { const s = window.__ew.store.getState().conv, g = window.__ew.game, p = g.player.root.position; return { sit: s.sitId, npc: s.npcId, at: [+p.x.toFixed(1), +p.z.toFixed(1)], mode: g.rig.mode }; });
      check(`${c.npc}: arriving starts their chat` + (k ? "" : ", inside the walls (in through the gateway)"), started && conv.sit === c.sit && conv.npc === c.npc && conv.at[0] < GATE.x - 0.8, conv);
      await turn();
      if (k === 0) {
        const cards = await ev(() => window.__ew.store.getState().conv.suggest.map((s) => s.lt));
        check("the first card answers his question", cards.length >= 1 && /Efra/.test(cards[0]), cards);
      }
      await shot(`2-${c.npc}`);
      for (const x of c.says) {
        if (!(await ev(() => { const s = window.__ew.store.getState().conv; return s.active && s.phase === "you"; }))) break;
        await ev((x) => { void window.__ew.game.activeSession.submit(x); }, x);
        await turn();
      }
      await step(60);
      const heard = await said(), done = await ev((sit) => window.__ew.store.getState().progress.sits[sit]?.completions ?? 0, c.sit);
      check(`${c.npc}: talked through and completed`, done === 1 && heard.some((l) => c.heard.test(l)), { done, heard: heard.slice(-3) });
      await ev(() => window.__ew.game.closeConversation());
      await step(40);
    }

    // 3. the castillo's stairs: walked up to the landing before the temple's doorways, and back down
    await at(T.x, FOOT + 1.2, Math.PI);
    await step(30);
    const foot = await here();
    await ev(([x, z]) => window.__ew.game.walkTo(x, z), [T.x, LANDING.z]);
    let half = null;
    for (let i = 0; i < 400; i++) { await step(10); await real(10); const p = await here(); if (!half && p.z < T.z + 2.6) half = p; if (await ev(() => !window.__ew.game.autoPath)) break; }
    const top = await here();
    check("the stairs are walked up: half way up half way there, the landing at the temple's doorways", foot.y === 0 && half && half.y > 1.5 && half.y < 4 && top.y > LANDING.y - 0.12 && top.z < T.z - 0.3, { foot, half, top });
    await shot("3-landing");
    await page.keyboard.down("w");
    await ev(() => { window.__ew.game.rig.yaw = Math.PI; });
    await step(150);
    await page.keyboard.up("w");
    const held = await here();
    check("the temple's front holds: nobody walks into it or off the landing", held.z > T.z - 1.85 && Math.abs(held.y - LANDING.y) < 0.05, held);
    await ev(([x, z]) => window.__ew.game.walkTo(x, z), [T.x, FOOT + 2]);
    for (let i = 0; i < 400; i++) { await step(10); await real(10); if (await ev(() => !window.__ew.game.autoPath)) break; }
    const down = await here();
    check("and down again onto the lawn", down.y === 0 && down.z > FOOT, down);

    // 4. nobody gets out but through the gateway (a dev server only)
    if (!mobile) {
      const audit = await ev(async () => {
        try {
          const m = await import("/src/dev/climbAudit.ts"), W = (await import("/src/game/world/layout.ts")).WORLD, g = window.__ew.game;
          const TH = (await import("/src/game/world/theme.ts")).THEME, MX = await import("/src/game/world/mexican.ts"), c = TH.cenote;
          const open = [MX.ruinsBounds(TH.ruins.x, TH.ruins.z, W.minX)];
          if (c?.open) open.push((await import("/src/game/cave/grounds.ts")).groundsBounds(c.x, c.z, W.minX));
          const r = m.climbAudit(g.town.colliders, g.ledges, W, [28, -14.6], 0.25, open);
          return { outside: r.outside, first: r.outsideAt, max: r.maxHeight, stuck: r.stuck };
        } catch (e) { return { error: String(e) }; }
      });
      if (audit.error) console.log("skipped: the walk-out audit (no dev server):", audit.error.slice(0, 80));
      else check("no way out of the town, the cenote's grounds or the ruins", audit.outside === 0, audit);
    }
    check("no page errors", errors.length === 0, errors);
    await ctx.close();
  }
  console.log("ruins: all checks passed");
} finally { await browser.close(); }
