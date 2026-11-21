// Tienda El Faro has someone to talk to, and the pump is easy to find (the owner, 17 Nov 2026: "the cashier is only
// decoration, so the learner walks in and finds no one to talk to"; the gas conversation is outside at the pumps).
// Doña Chela's talk spot is marked all the time (a ring where one stands, a slim beam over her; the beacon itself when
// s71b is the task); in the store Paco stands behind the counter, the walk to him finds its way from the door (the
// store's furniture once closed every way there) and starts x05-tienda; asked about gas, he sends the learner out to
// Doña Chela; the tianguis' vendors answer a click with a vendor's line. Playwright's own Chromium, time stepped by
// hand, against a dev server or a built game of Puerto Colibrí:
// WORLD_TEST_URL=http://127.0.0.1:8096 WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/tienda.mjs
import assert from "node:assert/strict";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8096";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const shots = process.env.WORLD_SHOTS || "";
const check = (name, value, detail) => {
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name, detail === undefined ? "" : JSON.stringify(detail));
};
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  // (the tianguis' vendors stand there in the full town only: quality "high")
  settings: { v: 6, play: "town", quality: "high", scenes: false, volume: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: 111.6, z: -3, rot: 0 },
  coach: { seen: { walk: true, run: true, jump: true, talk: true, car: true, boat: true, water: true, radio: true, surf: true }, run: true, view: true },
};
const INIT = `(() => {
  try { sessionStorage.setItem("ew-play-now", "1"); } catch {}
  // (the same visit every run: the conversation's chances, the vendor's line)
  let seed = 20261118;
  Math.random = function () { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let now = 1000;
  performance.now = () => now;
  const q = [];
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = (n, dt = 1000 / 60) => { for (let i = 0; i < n; i++) { now += dt; const cbs = q.splice(0); for (const cb of cbs) cb(now); } return now; };
})();`;

const browser = await chromium.launch({ channel: "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio"] });
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // (no clips without the course's sign-in: silence, so the lines' own lengths time the turns)
  await page.route(/\.mp3(\?.*)?$/, (r) => r.fulfill({ status: 404, body: "" }));
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
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const shot = async (name) => { if (shots) { await ev(() => window.__ew.store.getState().setHud({ zoneBanner: null })); await step(2); await real(300); await page.screenshot({ path: `${shots}/tienda-${name}.png` }); } };
  const at = (zone, x, z, rot) => ev(([zone, x, z, rot]) => { const g = window.__ew.game; g.keys.clear(); g.enterZone(zone, { x, z, rot }, true); g.rig.yaw = rot; g.rig.snap?.(); }, [zone, x, z, rot]);
  await ev(() => { window.__ew.store.getState().setHud({ panel: null }); window.__ew.game.endFlight?.(); window.__ew.game.setObjective(null); });

  // 1. the pump: marked all the time; the beacon instead when the gas conversation is the task
  await at("town", 111.6, -3, 0);
  await step(120);
  const marks = () => ev(() => window.__ew.game.guidance.marks.children.map((m) => ({ x: +m.position.x.toFixed(2), z: +m.position.z.toFixed(2), visible: m.visible })));
  let m = await marks();
  check("Doña Chela's spot is marked: a beam over her, a ring where one stands", m.length === 2 && m.every((k) => k.visible) && Math.abs(m[0].x - 111.35) < 0.01 && Math.abs(m[1].z - 8.3) < 0.01, m);
  await shot("1-pump-mark");
  await ev(() => window.__ew.game.setObjective("s71b-gas"));
  await step(30);
  const beacon = await ev(() => { const b = window.__ew.game.guidance.beacon; return { visible: b.visible, x: b.position.x, z: b.position.z }; });
  m = await marks();
  check("with s71b as the task the beacon stands over her and the mark gives way", beacon.visible && Math.abs(beacon.x - 111.35) < 0.01 && m.every((k) => !k.visible), { beacon, m });
  await shot("2-pump-task");
  await ev(() => window.__ew.game.setObjective(null));

  // 2. the store: in through its door, Paco behind the counter, a way to him, his conversation on arrival
  await at("town", 112, 10.6, 0);
  await step(120);
  const door = await ev(() => window.__ew.store.getState().hud.prompt);
  check("the store's door is there", door?.kind === "enter", door);
  await ev(() => window.__ew.game.interact());
  for (let i = 0; i < 60; i++) { await step(20); await real(40); if (await ev(() => window.__ew.game.zoneId === "gas-station" && !window.__ew.game.transitioning)) break; }
  await step(60);
  const inside = await ev(() => ({ zone: window.__ew.game.zoneId, npcs: window.__ew.game.npcs.map((n) => n.id), nobody: window.__ew.game.staff.length }));
  check("inside Tienda El Faro Paco is someone to talk to", inside.zone === "gas-station" && inside.npcs.includes("tienda"), inside);
  await shot("3-store");
  const walk = await ev(() => { const g = window.__ew.game, a = g.npcs.find((n) => n.id === "tienda"), t = a.approach ?? a.home; g.walkTo(t.x, t.z, { kind: "npc", id: "tienda" }); return { to: [t.x, t.z], path: g.autoPath?.length ?? 0 }; });
  check("there is a way from the door to his counter", walk.path > 1, walk);
  let started = false;
  for (let i = 0; i < 300 && !started; i++) { await step(15); await real(20); started = await ev(() => window.__ew.store.getState().conv.active); }
  const conv = await ev(() => { const s = window.__ew.store.getState().conv, p = window.__ew.game.player.root.position; return { sit: s.sitId, npc: s.npcId, at: [+p.x.toFixed(1), +p.z.toFixed(1)] }; });
  check("arriving starts x05-tienda, the learner across the counter from him", started && conv.sit === "x05-tienda" && conv.npc === "tienda" && Math.abs(conv.at[0] + 3) < 0.3 && Math.abs(conv.at[1] + 1.7) < 0.3, conv);
  const turn = async () => { for (let i = 0; i < 400; i++) { await step(12); await real(30); const s = await ev(() => { const c = window.__ew.store.getState().conv; return { phase: c.phase, active: c.active }; }); if (!s.active || s.phase === "you" || s.phase === "ended") return s; } return null; };
  const said = () => ev(() => window.__ew.store.getState().conv.transcript.filter((l) => l.who === "npc").map((l) => l.sentence.units.map((u) => u.en).join(" ")));
  await turn();
  const cards = await ev(() => window.__ew.store.getState().conv.suggest.map((s) => s.lt));
  // (his greeting is sometimes "¿Cómo está?": then the first card answers that)
  check("the first card answers his greeting: something to ask for and a question, or how one is", cards.length === 2 || cards.length === 1, cards);
  await shot("4-talk");
  if (cards.length === 1) { await ev(() => { void window.__ew.game.activeSession.submit("Bien, gracias"); }); await turn(); }
  await ev(() => { void window.__ew.game.activeSession.submit("¿Aquí pago la gasolina?"); });
  await turn();
  check("asked about gas, he sends the learner out to Doña Chela at the pumps", (await said()).some((l) => /Doña Chela/.test(l) && /afuera/.test(l)), (await said()).slice(-2));
  await shot("5-gas");
  // a coffee, whatever this visit brings (the coffee just ran out, the round-up, no card system): each answer is to
  // what he last asked; once the total is said, the card (or cash where the system is down)
  let ordered = false;
  const answer = (all) => {
    const last = all.slice(-1)[0] ?? "", total = all.some((l) => /[Ss]on \$|Serían \$/.test(l)), cashOnly = all.some((l) => /solo efectivo/.test(l));
    if (/Cómo está/.test(last)) return "Bien, gracias";
    if (/espera/.test(last)) return "Sí, lo espero";
    if (/redondea/.test(last)) return "No, gracias";
    if (/tamaño|[Cc]hico o grande|[Pp]equeño o grande/.test(last)) return "Grande";
    if (total) return cashOnly ? "Aquí tiene doscientos" : "Con tarjeta";
    if (!ordered) { ordered = true; return "Un café grande, por favor"; }
    return "Es todo, gracias";
  };
  for (let n = 0; n < 14; n++) {
    if (!(await ev(() => { const c = window.__ew.store.getState().conv; return c.active && c.phase === "you"; }))) break;
    if (await ev(() => (window.__ew.store.getState().progress.sits["x05-tienda"]?.completions ?? 0) > 0)) break;
    await ev((x) => { void window.__ew.game.activeSession.submit(x); }, answer(await said()));
    await turn();
  }
  await step(60);
  const end = await ev(() => ({ done: window.__ew.store.getState().progress.sits["x05-tienda"]?.completions ?? 0 }));
  check("a coffee bought and paid: the conversation is completed", end.done === 1, { end, said: (await said()).slice(-4) });
  await shot("6-paid");
  await ev(() => window.__ew.game.closeConversation());
  await step(30);

  // 3. a tianguis vendor behind a stall: a vendor's line, never a passer-by's hurry
  await at("town", 32, -41.6, Math.PI);
  await step(150);
  const lines = new Set();
  for (let i = 0; i < 6; i++) {
    const r = await ev(() => {
      const g = window.__ew.game, v = g.ambient.walkers.find((w) => w.vendor && Math.abs(w.ch.root.position.x - 32) < 0.1);
      if (!v) return null;
      const p = v.ch.root.position.clone(); p.y = 1.2; p.project(g.rig.cam);
      const rect = g.renderer.domElement.getBoundingClientRect();
      g.onClick(rect.left + (p.x + 1) / 2 * rect.width, rect.top + (1 - p.y) / 2 * rect.height);
      return window.__ew.store.getState().townToasts.at(-1)?.toast.title ?? "";
    });
    assert(r !== null, "no vendor behind the pottery stall");
    lines.add(r);
    await step(50);
  }
  check("the vendor answers with a vendor's line", [...lines].every((l) => /Pase a ver|Doña Licha/.test(l)), [...lines]);
  await shot("7-vendor");
  check("no page errors", errors.length === 0, errors.slice(0, 5));
} finally { await browser.close(); }
console.log("tienda: all checks passed");
