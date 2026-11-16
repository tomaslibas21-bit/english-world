// The conversation's camera in Puerto Colibrí's grotto (Game.fitTalkWild): whoever one talks with down there is in the
// picture, from whichever side one walked up to them, on an upright phone (where the picture is only a strip above the
// conversation), a short phone and a computer. Before, on a phone, Kin's conversation showed rock: the town's search
// backed the camera off through the passage's wall and above its roof. And the light mode's screen behind a
// conversation with no illustrated scene shows the person's own face (game/portrait.ts), not an initial.
// Against a dev server or a built game of the Spanish edition:
// WORLD_TEST_URL=http://127.0.0.1:8176 WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/cave-talk.mjs [--shots=<dir>]
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
  console.log("ok", name, detail === undefined ? "" : JSON.stringify(detail));
};
const save = (play) => ({
  version: 1,
  profile: { name: "Test", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play, quality: "low", volume: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: -101, z: -7.4, rot: 0 }, coach: { done: true, run: true },
  cave: { lit: [], passed: ["kin", "nikte"], seen: true, told: 5 },
});
const iPhone = { deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1" };
const SIZES = { phone: { ...iPhone, viewport: { width: 375, height: 812 } }, "short phone": { ...iPhone, viewport: { width: 375, height: 667 } }, computer: { viewport: { width: 1280, height: 800 } } };
// where the learner stands when they speak to them: from the water, from the cleft's side, across the passage, from
// past his gate; on the bridge's north end and beside her
const SPOTS = [
  ["Kin, from the water", "alux_kin", 0.2, -1.6], ["Kin, from the cleft", "alux_kin", 2.0, -2.2], ["Kin, across the passage", "alux_kin", -0.9, -4.6], ["Kin, from past his gate", "alux_kin", 1.2, -6.6],
  ["Nikté, from the bridge's end", "alux_nikte", -6.2, -98.6], ["Nikté, beside her", "alux_nikte", -6.1, -100.6],
];

const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  for (const [label, opts] of Object.entries(SIZES)) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(([k, v]) => { try { sessionStorage.setItem("ew-play-now", "1"); } catch {} localStorage.setItem(k, v); }, [`${storage}-progress-v1`, JSON.stringify(save("town"))]);
    await page.goto(base + "/?gruta=all", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__ew?.store?.getState().screen === "play" && window.__ew.game?.ledges?.ready, null, { timeout: 180000 });
    await page.evaluate(() => { window.__ew.coach?.finish?.(); window.__ew.store.getState().setHud({ panel: null }); });
    for (const [name, npc, x, z] of SPOTS) {
      await page.evaluate(([x, z]) => { const g = window.__ew.game; g.keys.clear(); g.setJoystick(0, 0); g.enterZone("gruta", { x, z, rot: 0 }, true); }, [x, z]);
      await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "talk", null, { timeout: 15000 });
      if (opts.hasTouch) await page.locator(".act-btn").tap(); else await page.keyboard.press("e");
      await page.waitForFunction(() => window.__ew.store.getState().conv.active, null, { timeout: 15000 });
      await page.waitForTimeout(1800);
      // the camera as it stands: in the open, the way to their face clear, their head and chest inside the picture
      // (on an upright phone: the strip above the conversation, as the screen shows it)
      const v = await page.evaluate((npc) => {
        const g = window.__ew.game, r = g.rig, sp = g.wild.space, who = g.npcs.find((n) => n.id === npc), a = who.ch.root.position;
        const pos = r.cam.position, face = a.clone(); face.y += (who.sit ? 0.72 : 0.9) * who.ch.height;
        const chest = a.clone(); chest.y += (who.sit ? 0.45 : 0.62) * who.ch.height;
        const canvas = g.renderer.domElement.getBoundingClientRect(), panel = document.querySelector(".convo")?.getBoundingClientRect();
        const px = (q) => { const n = q.clone().project(r.cam); return [Math.round(canvas.left + (n.x + 1) / 2 * canvas.width), Math.round(canvas.top + (1 - n.y) / 2 * canvas.height), +n.z.toFixed(3)]; };
        const wide = innerWidth > 900;
        return { talking: g.talkNpc?.id, mode: r.mode, inRock: sp.inside(pos), clear: sp.free(pos, face), face: px(face), chest: px(chest),
          free: wide ? [0, 0, panel.left, innerHeight] : [0, 0, innerWidth, panel.top], cam: [pos.x, pos.y, pos.z].map((n) => +n.toFixed(2)) };
      }, npc);
      const inside = ([x, y, zz]) => zz < 1 && x >= v.free[0] + 6 && x <= v.free[2] - 6 && y >= v.free[1] + 6 && y <= v.free[3] - 6;
      check(`${label}: ${name}: the camera stands in the open, the way to their face clear`, v.talking === npc && v.mode === "talk" && !v.inRock && v.clear >= 0.999, v);
      check(`${label}: ${name}: their head and chest are in the picture`, inside(v.face) && inside(v.chest), v);
      if (shots) await page.screenshot({ path: path.join(shots, `${name.replace(/[^\p{L}]+/gu, "-")}-${label.replace(" ", "-")}.png`) });
      await page.evaluate(() => window.__ew.game.closeConversation());
      await page.waitForFunction(() => !window.__ew.store.getState().conv.active, null, { timeout: 15000 });
    }
    check(`${label}: no page errors`, errors.length === 0, errors);
    await ctx.close();
  }

  // ---- the light mode: a conversation with no illustrated scene shows the person's face
  {
    const ctx = await browser.newContext(SIZES.phone);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(([k, v]) => { try { sessionStorage.setItem("ew-play-now", "1"); } catch {} localStorage.setItem(k, v); }, [`${storage}-progress-v1`, JSON.stringify(save("light"))]);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__ew?.store?.getState().screen === "play", null, { timeout: 180000 });
    // a conversation of the route with no illustrated scene (x01–x03 have theirs since 15 Nov; La Ola's was the
    // first one checked here), from its card on the light home
    const sit = await page.evaluate(async () => {
      const { sceneFor } = await import("/src/ui/scenes.ts"), { ROUTE } = await import("/src/content/route.ts");
      const q = ROUTE.find((x) => !sceneFor(x.id, x.npc) && document.querySelector(`.lh-card[data-sit="${x.id}"]`));
      return q ? { id: q.id, npc: q.npc } : null;
    });
    if (!sit) {
      console.log("skipped: light mode's face (every conversation of the route has its illustrated scene now)");
      await ctx.close();
      console.log("cave-talk: all checks passed");
      process.exit(0);
    }
    const card = page.locator(`.lh-card[data-sit="${sit.id}"]`);
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.waitForFunction(() => window.__ew.store.getState().conv.active, null, { timeout: 15000 });
    const face = await page.waitForFunction(() => { const i = document.querySelector(".lc-avatar.lc-face img"); return i && i.complete && i.naturalWidth > 100 ? { w: i.naturalWidth, shown: i.getBoundingClientRect().width } : null; }, null, { timeout: 30000 }).then((h) => h.jsonValue(), () => null);
    check(`light mode, a phone: ${sit.id} (no illustrated scene) shows the person's own face`, !!face && face.shown >= 90, face);
    // (a drawn face, not an empty picture: it has their colours in it)
    const drawn = await page.evaluate(() => { const i = document.querySelector(".lc-avatar.lc-face img"), c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"); x.drawImage(i, 0, 0, 64, 64); const d = x.getImageData(0, 0, 64, 64).data; let n = 0; for (let k = 3; k < d.length; k += 4) if (d[k] > 200) n++; return n; });
    check("the face is drawn (not an empty picture)", drawn > 64 * 64 * 0.25, drawn);
    if (shots) await page.screenshot({ path: path.join(shots, `light-${sit.id}-phone.png`) });
    check("light mode: no page errors", errors.length === 0, errors);
    await ctx.close();
  }
  console.log("cave-talk: all checks passed");
} finally {
  await browser.close();
}
