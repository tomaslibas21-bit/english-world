// The situation picker's cards in the real game: „Pasirink situaciją“ in the 3D town (the panel behind the clapper
// button) and the pictures-only mode's home, every card of the town, at a phone, a tablet and two computer widths,
// and at the largest text size (A++) on the phone and the computer.
// No word runs past its card (the owner's „Ką rekomenduotumėte?“), nothing is cut off, the icon and the stars never
// sit on the words, and the text column is wide enough to read: a title takes three lines at most and no line is a
// lone short word squeezed between the icon and the stars. Against a dev server or a built game:
// WORLD_TEST_URL=http://127.0.0.1:8096 WORLD_STORAGE=english-world WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/picker-cards.mjs
// WORLD_SHOTS=/a/folder saves a picture of each list at each width; WORLD_REPORT=1 lists every failing card
// instead of stopping at the first width that fails.
import assert from "node:assert/strict";
import fs from "node:fs";
import { openPhoneMenu } from "./screen-harness.mjs";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8096";
const storage = process.env.WORLD_STORAGE || "english-world";
const shots = process.env.WORLD_SHOTS || "";
const report = !!process.env.WORLD_REPORT;
if (shots) fs.mkdirSync(shots, { recursive: true });
let failed = 0;
const check = (name, value, detail) => {
  if (!value && report) { failed++; console.log("FAIL", name, JSON.stringify(detail)); return; }
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name, detail === undefined ? "" : JSON.stringify(detail));
};
const progress = (play, text) => ({
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play, quality: "low", volume: 0, cameraFollow: true, ...(text ? { textSize: text } : {}) },
  // (a few done, so cards with gold stars are measured too)
  sits: { "s72-cafe": { visits: 3, completions: 3, used: [], twists: [], memory: {} }, "s68-hotel": { visits: 1, completions: 1, used: [], twists: [], memory: {} } },
  phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: 0, z: 0, rot: 0 }, objective: "s73-restaurant",
  coach: { done: true, run: true, view: true },
});
// (the game's clock in the test's hands: every frame is a call of __step)
const INIT = `(() => {
  try { sessionStorage.setItem("ew-play-now", "1"); } catch {}
  let now = 1000;
  performance.now = () => now;
  const q = [];
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = (n, dt = 1000 / 60) => { for (let i = 0; i < n; i++) { now += dt; const cbs = q.splice(0); for (const cb of cbs) cb(now); } return now; };
})();`;
const SCREENS = [
  { label: "phone 375", viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { label: "tablet 768", viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { label: "computer 1280", viewport: { width: 1280, height: 800 } },
  { label: "computer 1440", viewport: { width: 1440, height: 900 } },
  { label: "phone 375, largest text", text: 1.3, viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { label: "computer 1280, largest text", text: 1.3, viewport: { width: 1280, height: 800 } },
];
const MODES = [
  { mode: "town", card: ".scn-card", list: ".sheet.scenarios" },
  { mode: "light", card: ".lh-card", list: ".lh" },
];

/** Every card of the list, measured in the page: what leaves the card, what is cut, what sits on what, how the title wraps. */
const measure = (sel) => {
  const out = [];
  const within = (r, box, slack = 1) => r.left >= box.left - slack && r.right <= box.right + slack && r.top >= box.top - slack && r.bottom <= box.bottom + slack;
  const hit = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
  const textRects = (el) => {
    const rects = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!n.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.width > 0.5 && r.height > 0.5) rects.push(r);
    }
    return rects;
  };
  /** The lines of an element's text, as the words on each. */
  const lines = (el) => {
    const rows = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const t = n.textContent;
      for (const m of t.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
        // (a word hyphenated over two lines has two boxes: it counts on both)
        for (const r of range.getClientRects()) {
          const row = rows.find((x) => Math.abs(x.top - r.top) < 4);
          if (row) row.words.push(m[0]); else rows.push({ top: r.top, words: [m[0]] });
        }
      }
    }
    return rows.sort((a, b) => a.top - b.top).map((r) => r.words);
  };
  for (const card of document.querySelectorAll(sel)) {
    const box = card.getBoundingClientRect();
    const problems = [];
    const words = textRects(card);
    if (!words.length) problems.push("no text");
    const loose = words.filter((r) => !within(r, box));
    if (loose.length) problems.push(`text past the card's edge by ${Math.round(Math.max(...loose.map((r) => Math.max(r.right - box.right, box.left - r.left, r.bottom - box.bottom, box.top - r.top))))} px`);
    for (const el of [card, ...card.querySelectorAll("*")]) {
      if (el.closest("svg")) continue;
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== "inline") problems.push(`${el.tagName.toLowerCase()}.${el.className} is ${el.scrollWidth - el.clientWidth} px wider than its box`);
    }
    // the icon and the stars: inside the card, and never on the words
    const marks = [...card.querySelectorAll(".ico, .lh-ico, .stars")];
    for (const m of marks) {
      const r = m.getBoundingClientRect();
      if (!within(r, box)) problems.push(`${m.className} leaves the card`);
      const own = new Set(textRects(m));
      if (words.some((w) => !own.has(w) && hit(w, r) && !m.contains(document.elementFromPoint((w.left + w.right) / 2, (w.top + w.bottom) / 2)))) problems.push(`${m.className} sits on the words`);
    }
    // room to read: the title on three lines at most, and no line of it a lone short word
    const title = card.querySelector("b"), target = card.querySelector("i");
    const tl = title ? lines(title) : [], gl = target ? lines(target) : [];
    if (tl.length > 3) problems.push(`the title takes ${tl.length} lines`);
    if (gl.length > 3) problems.push(`the second title takes ${gl.length} lines`);
    const txt = card.querySelector(".txt, .lh-txt")?.getBoundingClientRect();
    if (txt && txt.width < 150) problems.push(`the text column is ${Math.round(txt.width)} px wide`);
    const parent = card.parentElement.getBoundingClientRect();
    if (!within(box, { left: parent.left, right: parent.right, top: -1e9, bottom: 1e9 })) problems.push("the card leaves its grid");
    out.push({ id: card.dataset.sit, w: Math.round(box.width), h: Math.round(box.height), txt: txt ? Math.round(txt.width) : 0, titleLines: tl.length, problems });
  }
  return out;
};

const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  for (const { label, text, ...screen } of SCREENS) {
    for (const { mode, card, list } of MODES) {
      const ctx = await browser.newContext(screen);
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript(([k, v]) => { if (sessionStorage.getItem("seeded") !== "1") { sessionStorage.setItem("seeded", "1"); localStorage.clear(); localStorage.setItem(k, v); } }, [`${storage}-progress-v1`, JSON.stringify(progress(mode, text))]);
      await page.addInitScript(INIT);
      await page.goto(base, { waitUntil: "domcontentloaded" });
      const t0 = Date.now();
      for (;;) {
        const st = await page.evaluate(() => { window.__step?.(2); return window.__ew?.store?.getState().screen ?? "loading"; }).catch(() => "navigating");
        if (st === "play") break;
        assert(Date.now() - t0 < 180000, "the game did not start: " + st);
        await new Promise((r) => setTimeout(r, 300));
      }
      const name = `${label}, ${mode === "town" ? "the 3D town's list" : "the pictures-only home"}`;
      if (mode === "town") {
        await page.evaluate(() => window.__ew.coach?.finish?.());
        await page.locator(".toolbar").waitFor();
        await openPhoneMenu(page);
        const listButton = page.locator('.toolbar-tools button[title="Visos situacijos"]');
        if (screen.hasTouch) await listButton.tap(); else await listButton.click();
      }
      await page.evaluate(() => window.__step(10));
      await page.waitForSelector(card, { timeout: 20000 });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.__step(10));
      await new Promise((r) => setTimeout(r, 500));
      const cards = await page.evaluate(measure, card);
      const total = await page.evaluate(() => window.__ew.game.orderedSituations().length);
      check(`${name}: every situation has its card`, new Set(cards.map((c) => c.id)).size === total && cards.length >= total, { cards: cards.length, situations: total });
      const bad = cards.filter((c) => c.problems.length);
      check(`${name}: no card overflows, is cut or is cramped`, bad.length === 0, bad.slice(0, report ? 99 : 6).map((c) => `${c.id} (${c.w} px): ${c.problems.join("; ")}`));
      const hs = cards.map((c) => c.h), ws = cards.map((c) => c.txt);
      console.log("  ", name, JSON.stringify({ cards: cards.length, "card height": `${Math.min(...hs)}–${Math.max(...hs)}`, "text column": `${Math.min(...ws)}–${Math.max(...ws)}`, "title lines, most": Math.max(...cards.map((c) => c.titleLines)) }));
      const sideways = await page.evaluate((sel) => { const el = document.querySelector(sel), body = el.querySelector(".sheet-body") ?? el; return Math.max(body.scrollWidth - body.clientWidth, document.documentElement.scrollWidth - innerWidth); }, list);
      check(`${name}: nothing scrolls sideways`, sideways <= 1, sideways);
      if (shots) {
        const file = `${shots}/${mode}-${label.match(/\d+/)[0]}${text ? "-largest-text" : ""}`;
        await page.screenshot({ path: `${file}.png` });
        // (further down the list, where the long titles are)
        await page.evaluate((sel) => { const c = [...document.querySelectorAll(sel)]; c[Math.floor(c.length * 0.55)]?.scrollIntoView({ block: "center" }); }, card);
        await new Promise((r) => setTimeout(r, 300));
        await page.screenshot({ path: `${file}-further.png` });
      }
      check(`${name}: no page errors`, errors.length === 0, errors);
      await ctx.close();
    }
  }
  assert(failed === 0, `${failed} checks failed`);
  console.log("picker-cards: all good");
} finally {
  await browser.close();
}
