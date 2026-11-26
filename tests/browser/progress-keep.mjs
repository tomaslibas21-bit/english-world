// Learners keep their progress through an update (owner, 25 Nov 2026: "learners' progress must survive the update").
// 1. The LIVE game (WORLD_LIVE_URL) is played the way a learner would have it, through the game's own save code: a
//    character, settings, conversations done (one to three stars, one only begun, one made slow), phrases used, the
//    task card's objective, cards saved and reviewed (boxes, due dates), the guide's hints seen, rides and the surf
//    lesson counted, a radio heart, a place in the town. Every localStorage key it holds is read back: S0.
// 2. Control: the LIVE game opens S0 again, plays a few seconds and saves (S1): what changes by itself on a visit
//    (play time, openings, the place).
// 3. The REVIEW game (WORLD_TEST_URL) opens S0, plays a few seconds and saves (S2). Every path of S0 must be in S2
//    with the same value; only paths that changed in the control too may differ, and then only forward (counters up,
//    days added). New paths are allowed (listed, and new parts must start empty).
// 4. The account (the course's user_state, src/lib/sync/engine.ts + merge.ts of the course, WORLD_COURSE_MERGE):
//    S2 goes up (JSON → jsonb → JSON) and comes down, and is merged with a device still on LIVE that played meanwhile
//    (S1); both results keep every S0 path, and the review game opens the merged save and keeps it again (S3).
// Two dev servers or built games of the same edition (localStorage is per origin, so S0 is copied across):
// WORLD_LIVE_URL=http://127.0.0.1:8870 WORLD_TEST_URL=http://127.0.0.1:8871 WORLD_STORAGE=english-world \
//   WORLD_COURSE_MERGE=/path/to/fluent-steps/src/lib/sync/merge.ts WORLD_PLAYWRIGHT_MODULE=… node tests/browser/progress-keep.mjs
// (+ WORLD_LEARNER=lt for Puerto Colibrí for Lithuanians; WORLD_OUT=<dir> keeps S0–S3 and the report as JSON.)
// The live save is built with the dev server's own modules (import("/src/…")), so WORLD_LIVE_URL must be a dev server.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const LIVE = process.env.WORLD_LIVE_URL || "http://127.0.0.1:8870";
const REVIEW = process.env.WORLD_TEST_URL || "http://127.0.0.1:8871";
const storage = process.env.WORLD_STORAGE || "english-world";
const learner = process.env.WORLD_LEARNER || (storage === "puerto-colibri" ? "en" : "lt");
const OUT = process.env.WORLD_OUT || "";
const COURSE = process.env.WORLD_COURSE_MERGE || "";
const PKEY = `${storage}-progress-v1`, CKEY = `${storage}-cards-v1`;
const label = `${storage}${storage === "puerto-colibri" ? "/" + learner : ""}`;
if (OUT) fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const real = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio", "--autoplay-policy=no-user-gesture-required"],
});
const SCREEN = { viewport: { width: 1280, height: 800 } };

/** A fresh browser on `url` whose localStorage is `dump` (all keys), straight into the town. */
async function open(url, dump) {
  const ctx = await browser.newContext(SCREEN);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((d) => {
    try { sessionStorage.setItem("ew-play-now", "1"); } catch {}
    if (sessionStorage.getItem("seeded") === "1") return;
    sessionStorage.setItem("seeded", "1");
    localStorage.clear();
    for (const [k, v] of Object.entries(d || {})) localStorage.setItem(k, v);
  }, dump);
  await ctx.route(/\/audio[^/]*\/manifest\.json(?:\?|$)/, (route) => route.fulfill({ json: {} }));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  return { ctx, page, errors };
}
const inTown = (page) => page.waitForFunction(() => window.__ew?.game && window.__ew.store.getState().screen === "play", null, { timeout: 300000 });
/** What the page holds after it saved: the pagehide save (play time), then every key. */
async function flush(page) {
  await page.evaluate(() => { window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false })); });
  await real(400);
  return page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
}

// ------------------------------------------------------------------ 1. the live game, played
async function playLive() {
  const { ctx, page, errors } = await open(LIVE, {});
  // the first visit: the title / character screen; the character is made with the game's own call
  await page.waitForLoadState("load");
  const first = await page.evaluate(async () => {
    // (the game's own store module; on the first visit the town isn't up yet)
    const { useStore } = await import("/src/state/store.ts");
    for (let i = 0; i < 600 && useStore.getState().screen === "loading"; i++) await new Promise((r) => setTimeout(r, 500));
    const st = useStore.getState();
    st.setProfile({ name: "Austėja", surname: "Petraitė", gender: "f", lookId: "f2", look: { skin: "#e8c4a8", hair: { style: "long", color: "#3b2416" }, top: "#c0392b", bottom: "#2c3e50" } });
    st.setSettings({ play: "town", quality: "low", volume: 0, sounds: 0 });
    return useStore.getState().screen;
  });
  log("live first visit, screen", first);
  await real(500);
  const dump0 = await page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
  await ctx.close();
  return { dump0, errors };
}

async function playLiveInTown(seed) {
  const { ctx, page, errors } = await open(LIVE, seed);
  await inTown(page);
  log("live in the town");
  await page.evaluate(() => { const { store, coach } = window.__ew; coach?.finish?.(); store.getState().setHud({ panel: null }); });
  // settings changed in the settings panel, and the date partner
  await page.evaluate(() => {
    const st = window.__ew.store.getState();
    st.setSettings({ lt: false, ltNatural: true, ipa: true, slowVoice: true, textSize: 1.15, sayIpa: false, scenes: false, cameraFollow: false, hintsOpen: true });
    st.updateProgress((p) => { if (p.profile) p.profile.datePartner = "sam"; });
  });
  const sits = await page.evaluate(() => window.__ew.game.orderedSituations().filter((s) => !s.mode || s.mode === "talk").map((s) => s.id));
  // A ×3 with 7 phrases (★★★), B ×1 with 6 (★★), C ×1 with 2 and slow (★), D begun and left, E the objective
  const plan = [
    { id: sits[0], times: 3, phrases: 7 }, { id: sits[1], times: 1, phrases: 6 }, { id: sits[2], times: 1, phrases: 2, slow: true },
    { id: sits[3], times: 0, phrases: 1 },
  ];
  const done = [];
  for (const step of plan) for (let n = 0; n < Math.max(1, step.times); n++) {
    await page.evaluate((id) => window.__ew.game.startScenario(id), step.id);
    const start = page.locator(".scene-intro button.btn");
    const ok = await start.waitFor({ state: "visible", timeout: 45000 }).then(() => true, () => false);
    if (!ok) { log("  no scene card for", step.id); continue; }
    await start.click();
    await page.waitForFunction(() => { const c = window.__ew.store.getState().conv; return c.active && !c.introOpen; }, null, { timeout: 30000 });
    const r = await page.evaluate(({ step, n }) => {
      const s = window.__ew.game.activeSession;
      const ids = Object.values(s.sit.hints || {}).flatMap((g) => (g.items || []).map((i) => i.id));
      s.recordExpressions(ids.slice(n, n + step.phrases));
      if (step.slow && n === 0) s.setSlowMode(true);
      if (step.times) s.onCompleted();
      s.close();
      return { id: s.sit.id, hints: ids.length };
    }, { step, n });
    await page.waitForFunction(() => !window.__ew.store.getState().conv.active || window.__ew.store.getState().conv.phase === "ended", null, { timeout: 20000 }).catch(() => {});
    await real(600);
    done.push(r);
  }
  log("  conversations", JSON.stringify(done));
  // the task card, the guide, a ride and the surf lesson, cards, a radio heart, a place in the town
  const extra = await page.evaluate(async ({ objective }) => {
    const { game, store, coach } = window.__ew;
    const st = store.getState();
    game.setObjective(objective);
    for (const step of ["walk", "run", "talk", "car"]) coach?.mark?.(step);
    st.updateProgress((p) => { p.coach = { ...p.coach, view: true }; });
    const ps = await import("/src/state/playStats.ts");
    ps.countPlay("rides", "car"); ps.countPlay("rides", "car"); ps.countPlay("rides", "boat"); ps.countPlay("games", "surf");
    st.updateProgress((p) => { // (as game/surf/play.ts finish())
      const s = p.surf ?? { waves: 0, seconds: 0, followed: 0, asked: 0, lessons: 0, heard: {} };
      s.waves += 4; s.seconds += 37.5; s.followed += 6; s.asked += 8; s.lessons += 1; s.heard = { paddle: 3, stand: 2 };
      p.surf = s;
    });
    const { useCards } = await import("/src/state/cards.ts");
    const phrases = Object.values(store.getState().progress.phrases).slice(0, 6);
    for (const ph of phrases) useCards.getState().add({ en: ph.en, lt: ph.lt, sentence: { en: ph.en, lt: ph.lt }, situationId: ph.sitId });
    const cards = useCards.getState().cards;
    if (cards[0]) { useCards.getState().answer(cards[0].id, true); useCards.getState().answer(cards[0].id, true); }
    if (cards[1]) useCards.getState().answer(cards[1].id, false);
    if (cards[2]) useCards.getState().answer(cards[2].id, true);
    try { const f = await import("/src/radio/favorites.ts"); f.courseFavorites().toggle("song-1"); } catch {}
    game.enterZone("town", { x: 6.5, z: -4.25, rot: 1.2 }, true);
    await new Promise((r) => setTimeout(r, 1500));
    game.savePlace?.();
    return { cards: useCards.getState().cards.length, place: store.getState().progress.place };
  }, { objective: sits[4] });
  log("  extra", JSON.stringify(extra));
  await real(5000); // some time in the town counts
  const dump = await flush(page);
  await ctx.close();
  return { dump, errors };
}

// ------------------------------------------------------------------ compare
const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const parse = (raw) => { if (raw === null || raw === undefined) return null; try { return JSON.parse(raw); } catch { return { $text: raw }; } };
/** Every leaf path of `a` and what `b` has there: lost (gone), changed; and the leaves of `b` that `a` hasn't. */
function diff(a, b, at = "", out = []) {
  if (isObj(a) && isObj(b)) {
    for (const k of Object.keys(a)) if (!(k in b) && a[k] !== undefined) out.push({ path: at + "/" + k, kind: "lost", a: a[k] });
    for (const k of Object.keys(b)) if (!(k in a)) out.push({ path: at + "/" + k, kind: "added", b: b[k] });
    for (const k of Object.keys(a)) if (k in b) diff(a[k], b[k], at + "/" + k, out);
  } else if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (i >= b.length) out.push({ path: `${at}[${i}]`, kind: "lost", a: a[i] });
      else if (i >= a.length) out.push({ path: `${at}[${i}]`, kind: "added", b: b[i] });
      else diff(a[i], b[i], `${at}[${i}]`, out);
    }
  } else if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ path: at, kind: "changed", a, b });
  return out;
}
/** Whole stores: every key, parsed. */
function diffDumps(A, B) {
  const out = [];
  for (const k of Object.keys(A)) {
    if (!(k in B)) { out.push({ path: k, kind: "lost", a: "(whole key)" }); continue; }
    for (const d of diff(parse(A[k]), parse(B[k]))) out.push({ ...d, path: k + d.path });
  }
  for (const k of Object.keys(B)) if (!(k in A)) out.push({ path: k, kind: "added", b: parse(B[k]) });
  return out;
}
const norm = (p) => p.replace(/\[\d+\]/g, "[]");
/** A change that a visit of the live game makes too, and only forward. */
function natural(d, control) {
  const ctl = control.filter((c) => c.kind !== "lost").map((c) => norm(c.path));
  if (!ctl.some((p) => p === norm(d.path) || norm(d.path).startsWith(p + "/") || norm(d.path).startsWith(p + "["))) return false;
  if (typeof d.a === "number" && typeof d.b === "number" && /\/play\//.test(d.path)) return d.b >= d.a;
  return true;
}
function judge(name, base, after, control) {
  const all = diffDumps(base, after);
  const lost = all.filter((d) => d.kind === "lost" && !natural({ ...d, kind: "changed" }, control));
  const changed = all.filter((d) => d.kind === "changed" && !natural(d, control));
  const forward = all.filter((d) => d.kind !== "added" && !lost.includes(d) && !changed.includes(d));
  const added = all.filter((d) => d.kind === "added");
  return { name, lost, changed, forward, added };
}
const show = (v) => { const s = JSON.stringify(v); return s && s.length > 140 ? s.slice(0, 140) + "…" : s; };
function print(r) {
  log(`${label} ${r.name}: ${r.lost.length} lost, ${r.changed.length} changed, ${r.forward.length} changed as on live, ${r.added.length} added`);
  for (const d of r.lost) console.log("   LOST    ", d.path, show(d.a));
  for (const d of r.changed) console.log("   CHANGED ", d.path, show(d.a), "→", show(d.b));
  for (const d of r.forward) console.log("   as live ", d.path, show(d.a), "→", show(d.b));
  for (const d of r.added) console.log("   added   ", d.path, show(d.b));
}

// ------------------------------------------------------------------ the account (course sync)
/** Postgres jsonb: object keys sorted (shorter first, then bytewise); the value otherwise as JSON. */
function jsonb(v) {
  if (Array.isArray(v)) return v.map(jsonb);
  if (!isObj(v)) return v;
  const o = {};
  for (const k of Object.keys(v).sort((x, y) => x.length - y.length || (x < y ? -1 : x > y ? 1 : 0))) if (v[k] !== undefined) o[k] = jsonb(v[k]);
  return o;
}
// (as the course's engine.ts parse / text / toDb / fromDb)
const text = (v) => (v === null || v === undefined ? null : isObj(v) && Object.keys(v).length === 1 && typeof v.$text === "string" ? v.$text : JSON.stringify(v));
const upDown = (raw) => text(jsonb(JSON.parse(JSON.stringify(parse(raw)))));

const report = { label, live: LIVE, review: REVIEW, checks: [] };
let failed = false;
const gate = (name, ok, detail) => { report.checks.push({ name, ok, detail }); if (!ok) failed = true; console.log(ok ? "ok  " : "FAIL", name, detail === undefined ? "" : show(detail)); };

try {
  log(label, "1. the live game, played like a learner");
  const { dump0: firstVisit } = await playLive();
  assert(firstVisit[PKEY], "the live game saved the new character");
  const { dump: S0, errors: e0 } = await playLiveInTown(firstVisit);
  const P0 = parse(S0[PKEY]), C0 = parse(S0[CKEY]);
  gate("live save has the learner's progress", !!P0?.profile && Object.keys(P0.sits).length >= 4 && Object.keys(P0.phrases).length >= 10 && (C0?.cards?.length ?? 0) >= 4 && !!P0.play && !!P0.surf && !!P0.place && !!P0.objective,
    { keys: Object.keys(S0), sits: Object.keys(P0?.sits || {}), phrases: Object.keys(P0?.phrases || {}).length, cards: C0?.cards?.length, top: Object.keys(P0 || {}) });
  if (e0.length) log("  live page errors:", [...new Set(e0)].slice(0, 4).join(" | "));

  log(label, "2. control: the live game opens it again");
  let S1;
  { const { ctx, page } = await open(LIVE, S0); await inTown(page); await real(5000); S1 = await flush(page); await ctx.close(); }
  const control = diffDumps(S0, S1);
  const ctl = judge("live → live (control)", S0, S1, []);
  print(ctl);

  log(label, "3. the review game opens the live save");
  let S2, e2;
  { const o = await open(REVIEW, S0); await inTown(o.page); await real(5000);
    // (what the review game holds in memory, as well as what it saved)
    const mem = await o.page.evaluate(async () => { const { useCards } = await import("/src/state/cards.ts").catch(() => ({})); return { cards: useCards?.getState().cards.length ?? null, sits: Object.keys(window.__ew.store.getState().progress.sits) }; }).catch(() => null);
    S2 = await flush(o.page); e2 = o.errors; await o.ctx.close();
    report.reviewMemory = mem; }
  const rev = judge("live → review", S0, S2, control);
  print(rev);
  if (e2.length) log("  review page errors:", [...new Set(e2)].slice(0, 6).join(" | "));
  gate("review keeps every field of the live save (nothing lost)", rev.lost.length === 0, rev.lost.map((d) => d.path));
  gate("review keeps every value of the live save (nothing reset or changed beyond a live visit)", rev.changed.length === 0, rev.changed.map((d) => `${d.path}: ${show(d.a)} → ${show(d.b)}`));
  // new parts start empty: every added leaf is a zero, false, an empty object/array, or a default setting
  const newParts = rev.added.filter((d) => d.path.startsWith(PKEY + "/"));
  report.newParts = newParts.map((d) => ({ path: d.path, value: d.b }));
  const emptyish = (v) => v === null || v === 0 || v === false || (Array.isArray(v) && v.length === 0) || (isObj(v) && Object.values(v).every(emptyish));
  const notEmpty = newParts.filter((d) => !d.path.includes("/settings/") && !emptyish(d.b));
  gate("new parts of the review save start empty (settings: defaults)", notEmpty.length === 0, notEmpty.map((d) => `${d.path} = ${show(d.b)}`));

  // a second device (or a cached page) still on the live game opens the review save: the new parts stay
  log(label, "3b. a device still on live opens the review save");
  let S2L;
  { const o = await open(LIVE, S2); await inTown(o.page); await real(4000); S2L = await flush(o.page); await o.ctx.close(); }
  const old = judge("review → live", S2, S2L, control);
  print(old);
  gate("the live game keeps the review save's fields too (no loss going back)", old.lost.length === 0 && old.changed.length === 0, [...old.lost, ...old.changed].map((d) => d.path));

  if (COURSE) {
    log(label, "4. the account (course sync, user_state)");
    const merge = await import(COURSE);
    for (const key of [PKEY, CKEY]) {
      const M = merge.SYNCED_KEYS[key];
      gate(`course syncs ${key}`, typeof M === "function");
      if (!M || !S2[key]) continue;
      // up and down unchanged: this device (review) changed the key, the account didn't
      const down = upDown(S2[key]);
      const d1 = diff(parse(S0[key]), parse(down)).filter((d) => d.kind !== "added" && !natural({ ...d, path: key + d.path, kind: "changed" }, control));
      gate(`${key}: review save → user_state → back keeps every live field`, d1.length === 0, d1.map((d) => d.path));
      gate(`${key}: review save → user_state → back is the same save`, merge.same ? merge.same(parse(S2[key]), parse(down)) : JSON.stringify(jsonb(parse(S2[key]))) === JSON.stringify(jsonb(parse(down))));
      // both changed since they agreed (S0): this device on review (S2), another still on live (S1)
      for (const [name, l, r] of [["review device merges the live device's change", S2[key], S1[key]], ["live device merges the review device's change", S1[key], S2[key]]]) {
        const merged = M(parse(S0[key]), parse(l), parse(r));
        const lostLive = diff(parse(S0[key]), merged).filter((d) => d.kind === "lost");
        const lostNew = diff(parse(S2[key]), merged).filter((d) => d.kind === "lost");
        gate(`${key}: ${name}: no live field lost`, lostLive.length === 0, lostLive.map((d) => d.path));
        gate(`${key}: ${name}: no field of the review save lost`, lostNew.length === 0, lostNew.map((d) => d.path));
      }
    }
    // the review game opens what came down from the account (merged with the live device) and keeps it again
    const merged = { ...S2 };
    for (const key of [PKEY, CKEY]) if (merge.SYNCED_KEYS[key] && S2[key]) merged[key] = text(jsonb(merge.SYNCED_KEYS[key](parse(S0[key]), parse(S2[key]), parse(S1[key]))));
    let S3;
    { const o = await open(REVIEW, merged); await inTown(o.page); await real(4000); S3 = await flush(o.page); await o.ctx.close(); }
    const back = judge("account → review", merged, S3, control);
    print(back);
    gate("review opens the save from the account and keeps it (nothing lost)", back.lost.length === 0 && back.changed.length === 0, [...back.lost, ...back.changed].map((d) => d.path));
    // and the live fields are all still there at the end of the trip
    const trip = judge("live → review → account → review", S0, S3, control);
    gate("live → review → account → review: every live field still there", trip.lost.length === 0 && trip.changed.length === 0, [...trip.lost, ...trip.changed].map((d) => d.path));
    if (OUT) fs.writeFileSync(path.join(OUT, "S3.json"), JSON.stringify(S3, null, 1));
  } else log("(no WORLD_COURSE_MERGE: account check skipped)");

  report.control = ctl; report.review = rev;
  if (OUT) {
    fs.writeFileSync(path.join(OUT, "S0.json"), JSON.stringify(S0, null, 1));
    fs.writeFileSync(path.join(OUT, "S1.json"), JSON.stringify(S1, null, 1));
    fs.writeFileSync(path.join(OUT, "S2.json"), JSON.stringify(S2, null, 1));
  }
} catch (e) {
  failed = true; report.error = String(e?.stack || e); console.error(e);
} finally {
  if (OUT) fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 1));
  await browser.close();
}
log(label, failed ? "FAIL" : "PASS");
process.exit(failed ? 1 : 0);
