#!/usr/bin/env node
// The conversations' tour (docs/es/TOWN.md "Every conversation's spot"), and frozen views of the rooms for
// before/after checks. Drives the game in Playwright's Chromium against a dev server of either edition.
//
// Tour (the default): for every conversation of the served edition, the game's own way there: the objective set to
// it, the place's door or drop-off (teleportTo, as the map's "go there"), the walk (autoWalkToObjective: to the door
// and in, then to the speaker's talk spot), the conversation started on arrival as when the player walks up to
// someone (a call from the phone, as the phone panel does). Then a screenshot per screen size, and a line in
// tour.json / tour.md: where it started, which of its speakers stand in the room and how far from the player, or why
// it could not be reached or started.
//
//   VITE_EDITION=es npx vite --port 8097 --strictPort &
//   node tools/es-tour.mjs --url=http://localhost:8097 --out=<dir>                   every conversation, 1280×800 and 375×812
//   node tools/es-tour.mjs --url=… --out=… --only=s71b,s65b --sizes=1280x800        some conversations (id prefixes), one size
//   node tools/es-tour.mjs --url=… --out=… --start=jump                              no walk: the situation picker's start
//
// Once the camera has settled on a conversation, every speaker who stands there is checked against the picture: their
// head and chest (and a hand's breadth to each side), projected through the camera with its shift, must fall in the
// part of the canvas the conversation panel leaves free (left of it on a wide screen, above it on a phone). tour.md
// says "in the picture" or which speaker is out and by how much; tour.json has each point, the camera and the draw
// calls of that view (renderer.info.render.calls).
//
// Rooms (--mode=rooms): every room and every outdoor talk spot, frozen: the animation loop stopped, Math.random seeded
// while a room is built and its people take a pose, the player, the guide trail, the clouds, gulls, pigeons and
// passers-by hidden. A picture from the door and one framed as a conversation at each person's talk spot, each with
// its draw calls (renderer.info.render.calls) and a hash of its pixels (rooms.json). --compare=<an earlier run's dir>
// lists the views whose pixels or draw calls changed: run it on the English edition before and after a change, and
// every view must be identical.
//
//   npx vite --port 8098 --strictPort &       (the English edition)
//   node tools/es-tour.mjs --mode=rooms --url=http://localhost:8098 --out=<before>
//   node tools/es-tour.mjs --mode=rooms --url=http://localhost:8098 --out=<after> --compare=<before>
//
// Options: --sizes=1280x800,375x812  --dpr=1  --quality=high|low  --only=<id prefixes>  --rooms=<room ids>  --gl=gpu|software
//          --pw=<path to the playwright-core package> (else playwright-core / playwright from node_modules)
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] ?? "1"] : [a, "1"];
}));
const BASE = (args.url ?? "http://localhost:8097").replace(/\/$/, "");
const MODE = args.mode ?? "tour";
const OUT = path.resolve(args.out ?? `tour-${MODE}`);
const SIZES = (args.sizes ?? (MODE === "rooms" ? "1280x800" : "1280x800,375x812")).split(",").map((s) => s.split("x").map(Number));
const ONLY = args.only ? args.only.split(",") : null;
const DPR = Number(args.dpr ?? 1);
const QUALITY = args.quality ?? "high";
/** How a conversation is reached: "walk" (the default: the objective, the door, the walk in) or "jump" (the situation
 *  picker's startScenario: the player put on the talk spot; quicker, for checking the framing). */
const START = args.start ?? "walk";
/** The rooms (interiors.ts B), in a fixed order. */
const ROOMS = (args.rooms ?? "airport,sunny-cup,trattoria,threads,pharmacy,salon,bank,post-office,hotel,visitor-center,museum,station,car-rental,gas-station,police,apartments,dans-house,office,the-pier,clinic,market,gym,sproutly").split(",");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function chromium() {
  const tries = [args.pw && pathToFileURL(path.join(path.resolve(args.pw), "index.mjs")).href, process.env.PLAYWRIGHT_CORE && pathToFileURL(path.join(process.env.PLAYWRIGHT_CORE, "index.mjs")).href, "playwright-core", "playwright"].filter(Boolean);
  for (const t of tries) {
    try { const m = await import(t); return m.chromium ?? m.default.chromium; } catch { /* the next one */ }
  }
  throw new Error("Playwright not found: npm i -D playwright-core (and npx playwright install chromium), or --pw=<path to playwright-core>");
}

/** A fresh learner (no progress), straight into the 3D town: no title screen, no microphone, no sound, no pictures. */
function initStorage({ quality, place }) {
  const look = { skin: "#f2d3bd", hair: { style: "long", color: "#7b4a2a" }, top: "#3b8ea5", bottom: "#2d3142" };
  const progress = {
    version: 1, profile: { name: "Alex", surname: "Rivera", gender: "f", look, lookId: "f1" },
    settings: { v: 4, play: "town", quality, scenes: false, autoListen: false, volume: 0, cameraFollow: true },
    sits: {}, phrases: {}, objective: null, place, seenIntro: {}, started: Date.now(),
  };
  sessionStorage.setItem("ew-play-now", "1"); // a reload (a dev server's update) goes straight back into the town
  if (sessionStorage.getItem("es-tour") === "1") return; // and keeps the progress
  sessionStorage.setItem("es-tour", "1");
  for (const k of ["puerto-colibri-progress-v1", "english-world-progress-v1"]) localStorage.setItem(k, JSON.stringify(progress));
}

async function openGame(browser, [w, h]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: DPR });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message ?? e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  // the tour starts where a new learner does (the airport); the frozen views in the square, so that every room is
  // built after the signs' fonts have loaded
  await page.addInitScript(initStorage, { quality: QUALITY, place: MODE === "rooms" ? { zone: "town", x: 28, z: -14.6, rot: Math.PI } : null });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await ready(page);
  return { ctx, page, errors };
}

/** The game is up (again, after a reload) and no panel covers it. */
async function ready(page) {
  await page.waitForFunction(() => window.__ew?.game?.zone && window.__ew.store.getState().screen === "play", null, { timeout: 180000 });
  if (await page.evaluate(() => !!window.__ew.store.getState().hud.panel)) {
    await page.evaluate(() => window.__ew.store.getState().setHud({ panel: null }));
    await sleep(500);
  }
}

// ---------------------------------------------------------------------------------------------------------- tour

/** In the page: go to conversation `id`'s place the game's way and start it there. */
async function goTalk({ id, start }) {
  const { game, store } = window.__ew;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const st = () => store.getState();
  const P = () => game.player.root.position;
  const fmt = (v) => `(${v.x.toFixed(1)}, ${v.z.toFixed(1)})`;
  const sit = game.orderedSituations().find((s) => s.id === id);
  const log = [];
  const started = () => st().conv.active && st().conv.sitId === id;
  const call = sit.mode === "phone" || sit.mode === "video" || sit.location === "phone";
  if (game.activeSession?.active) { game.closeConversation(); await wait(400); }
  st().setHud({ panel: null });
  let how;
  if (call) {
    game.call(id);
    how = "call";
  } else if (start === "jump") {
    game.startScenario(id);
    for (let i = 0; i < 60 && !started(); i++) await wait(100);
    how = "jump";
  } else {
    game.setObjective(id);
    if (!game.objectiveTarget()) return { ok: false, why: "the game has no place to guide to (objectiveTarget is null)", log };
    // to the place: outside its door, or its drop-off (as a taxi or the map's "go there")
    game.teleportTo(sit.location);
    await wait(900);
    log.push(`teleportTo(${sit.location}) → ${game.zoneId} ${fmt(P())}`);
    let tgt = game.objectiveTarget();
    if (tgt && Math.hypot(tgt.x - P().x, tgt.z - P().z) < 1.5) {
      // the airport's drop-off is its door: step back to walk in
      const h = game.player.root.rotation.y;
      game.enterZone("town", { x: P().x + Math.sin(h) * 4, z: P().z + Math.cos(h) * 4, rot: h }, true);
      await wait(200);
    }
    // walk: to the door and in, then to the speaker; on arrival the game starts the conversation
    let tries = 0, zone = game.zoneId, still = 0, last = P().clone();
    const t0 = performance.now();
    game.autoWalkToObjective(); tries++;
    while (!started() && performance.now() - t0 < 45000) {
      await wait(150);
      if (game.zoneId !== zone) {
        zone = game.zoneId; log.push(`entered ${zone} ${fmt(P())}`);
        await wait(700);
        game.autoWalkToObjective(); tries++;
        continue;
      }
      const moved = P().distanceTo(last); last = P().clone();
      still = moved < 0.02 && !game.autoPath?.length ? still + 1 : 0;
      if (still > 8) {
        if (tries > 4) break;
        tgt = game.objectiveTarget();
        const path = tgt && game.zone.nav.path(P().x, P().z, tgt.x, tgt.z);
        log.push(`stopped at ${fmt(P())} in ${game.zoneId}; target ${tgt ? `${tgt.kind} ${tgt.id ?? ""} (${tgt.x.toFixed(1)}, ${tgt.z.toFixed(1)})` : "none"}; path ${path ? path.length + " cells" : "none"}`);
        game.autoWalkToObjective(); tries++; still = 0;
      }
    }
    how = "walk";
  }
  for (let i = 0; i < 40 && !started(); i++) await wait(100);
  if (!started()) {
    const tgt = game.objectiveTarget();
    return { ok: false, how, why: `not started: in ${game.zoneId} at ${fmt(P())}, target ${tgt ? `${tgt.kind} ${tgt.id ?? ""} (${tgt.x.toFixed(1)}, ${tgt.z.toFixed(1)})` : "none"}`, log };
  }
  // who of its speakers is here, and how far from the player (the conversation frames those within 7 m of the main one)
  const main = st().conv.npcId;
  const actor = game.npcs.find((n) => n.id === main);
  const date = (x) => x === "sam" || x === "emma"; // the date is one of the two, by the learner's choice
  // (the one walked up to, the one speaking first and the conversation's others)
  const ids = [...new Set([main, sit.npc, ...(sit.npcs ?? [])])].filter((x, i) => i === 0 || !(date(x) && date(main)));
  const speakers = ids.map((sid) => {
    const n = game.npcs.find((a) => a.id === sid);
    if (!n) return { id: sid, here: false };
    const p = n.ch.root.position;
    return { id: sid, here: true, x: +p.x.toFixed(2), z: +p.z.toFixed(2), fromPlayer: +p.distanceTo(P()).toFixed(2), fromMain: actor ? +p.distanceTo(actor.ch.root.position).toFixed(2) : null };
  });
  return { ok: true, how, zone: game.zoneId, player: [+P().x.toFixed(2), +P().z.toFixed(2)], speakers, log };
}

/** In the page, once the camera has settled on a conversation: is each of these speakers in the picture? Their head
 *  and chest, and 0.25 m to each side of them across the view, are projected through the camera (its view shift
 *  included) onto the canvas, and must fall in the part of it the conversation panel leaves free: left of the panel on
 *  a wide screen, above it on a phone, 8 px in from the edges. And something must not hide them: of the rays from the
 *  camera to those six points, cast against the place (the town or the room; not the people), at most three may hit
 *  something solid more than 0.4 m before them (see-through glass and the thin papel picado don't count). */
function inPicture(ids) {
  const { game } = window.__ew;
  const cam = game.rig.cam;
  cam.updateMatrixWorld();
  const cv = game.renderer.domElement.getBoundingClientRect();
  const panel = document.querySelector(".convo")?.getBoundingClientRect();
  const free = { x0: cv.left + 8, x1: cv.right - 8, y0: cv.top + 8, y1: cv.bottom - 8 };
  if (panel && panel.width > 0) {
    if (panel.top > cv.top + cv.height * 0.2) free.y1 = Math.min(free.y1, panel.top - 8); // a phone: the panel below
    else free.x1 = Math.min(free.x1, panel.left - 8); // a wide screen: the panel on the right
  }
  const right = new game.rig.target.constructor(1, 0, 0).applyQuaternion(cam.quaternion).setY(0).normalize();
  const who = [...ids.map((id) => ({ id, a: game.npcs.find((n) => n.id === id) })), { id: "player", a: { ch: game.player, sit: false } }];
  const res = { calls: game.renderer.info.render.calls, free: Object.fromEntries(Object.entries(free).map(([k, v]) => [k, Math.round(v)])),
    cam: [cam.position.x, cam.position.y, cam.position.z].map((v) => +v.toFixed(2)), out: [], people: [],
    // where the conversation put the camera (Game.startSession's framing; the camera eases there)
    talk: game.rig.talk ? [...game.rig.talk.pos.toArray(), ...game.rig.talk.look.toArray()].map((v) => +v.toFixed(4)) : null };
  const ray = new game.raycaster.constructor();
  const solid = (o) => {
    for (let x = o; x; x = x.parent) if (!x.visible) return false;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    return !/papel|bulb|sign-pole/i.test(o.name ?? "") && ms.some((m) => m && !(m.transparent && m.opacity < 0.6) && m.visible !== false);
  };
  /** What hides point `q` from the camera, if anything. */
  const hider = (q) => {
    const dir = q.clone().sub(cam.position), d = dir.length();
    ray.set(cam.position, dir.normalize());
    ray.far = d;
    ray.camera = cam; // (sprites need it)
    let hits = [];
    try { hits = ray.intersectObject(game.zone.group, true); } catch { return null; }
    const hit = hits.find((x) => solid(x.object) && !x.object.isSprite);
    return hit && hit.distance < d - 0.4 ? hit.object.name || hit.object.type : null;
  };
  for (const { id, a } of who) {
    if (!a) continue;
    const p = a.ch.root.position, h = a.ch.height ?? 1.75, sit = a.ch.anim === "sit";
    const ys = sit ? [h * 0.62, h * 0.4] : [h * 0.9, h * 0.62];
    let worst = Infinity;
    for (const y of ys) for (const s of [-0.25, 0, 0.25]) {
      const v = p.clone().addScaledVector(right, s).setY(p.y + y).project(cam);
      const sx = cv.left + (v.x + 1) / 2 * cv.width, sy = cv.top + (1 - v.y) / 2 * cv.height;
      const m = v.z > 1 ? -999 : Math.min(sx - free.x0, free.x1 - sx, sy - free.y0, free.y1 - sy);
      worst = Math.min(worst, m);
    }
    // (hidden: at least four of the six rays to the head and the chest, and 0.25 m to each side, blocked)
    const hidden = ys.flatMap((y) => [-0.25, 0, 0.25].map((s) => hider(p.clone().addScaledVector(right, s).setY(p.y + y))));
    const behind = hidden.filter(Boolean).length >= 4 ? hidden.find(Boolean) : null;
    // the top of the head (hair and hats included: the character's own box), 0.12 m to each side across the view,
    // against the top of the picture (the canvas; on a phone the strip above the panel starts there too): `top`, in
    // px below the picture's top edge (negative: cut)
    const box = new game.rig.target.constructor(), tops = [];
    let topY = -Infinity;
    a.ch.root.updateMatrixWorld(true);
    a.ch.root.traverse((o) => {
      if (!o.isMesh || !o.visible || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox;
      if (!bb || bb.max.y - bb.min.y < 0.05) return; // (the blob shadow)
      for (const x of [bb.min.x, bb.max.x]) for (const z of [bb.min.z, bb.max.z]) topY = Math.max(topY, box.set(x, bb.max.y, z).applyMatrix4(o.matrixWorld).y);
    });
    if (!Number.isFinite(topY)) topY = p.y + h;
    for (const s of [-0.12, 0, 0.12]) {
      const v = p.clone().addScaledVector(right, s).setY(topY).project(cam);
      tops.push(v.z > 1 ? -999 : cv.top + (1 - v.y) / 2 * cv.height - cv.top);
    }
    const top = Math.round(Math.min(...tops));
    res.people.push({ id, margin: Math.round(worst), top, topY: +(topY - p.y).toFixed(3), hidden });
    if (id === "player") continue;
    if (top < 0) res.out.push(`${id} head cut ${-top} px`);
    if (worst < 0) res.out.push(`${id} ${Math.round(-worst)} px`);
    else if (behind) res.out.push(`${id} hidden by ${behind}`);
  }
  return res;
}

async function tour(browser) {
  const results = {};
  for (const size of SIZES) {
    const tag = `${size[0]}x${size[1]}`;
    const dir = path.join(OUT, tag);
    mkdirSync(dir, { recursive: true });
    const { ctx, page, errors } = await openGame(browser, size);
    const sits = await page.evaluate(() => window.__ew.game.orderedSituations().map((s) => ({ id: s.id, location: s.location, npc: s.npc, npcs: s.npcs ?? [], mode: s.mode ?? "talk" })));
    const list = sits.filter((s) => !ONLY || ONLY.some((o) => s.id.startsWith(o)));
    console.log(`${tag}: ${list.length} conversations`);
    let n = 0;
    for (const s of list) {
      n++;
      const t0 = Date.now();
      let r;
      try { await ready(page); r = await page.evaluate(goTalk, { id: s.id, start: START }); } catch (e) { r = { ok: false, why: "error: " + String(e.message ?? e).split("\n")[0] }; }
      const file = `${String(n).padStart(2, "0")}-${s.id}.png`;
      if (r.ok) {
        await sleep(1800); // the camera settles on the speakers, the first line shows
        await page.evaluate(() => window.__ew.store.getState().setHud({ panel: null }));
        if (r.how !== "call") r.frame = await page.evaluate(inPicture, r.speakers.filter((x) => x.here).map((x) => x.id)).catch((e) => ({ out: [`not measured: ${String(e.message ?? e).split("\n")[0]}`], people: [], calls: null }));
        await page.screenshot({ path: path.join(dir, file) });
      } else {
        await page.screenshot({ path: path.join(dir, file.replace(".png", "-FAILED.png")) });
      }
      const res = (results[s.id] ??= { id: s.id, location: s.location, npc: s.npc, npcs: s.npcs, mode: s.mode, sizes: {} });
      res.sizes[tag] = { ...r, file, ms: Date.now() - t0 };
      const who = (x) => x.here ? `${x.id} ${x.fromPlayer} m` : r.how === "call" ? `${x.id} on the phone` : `${x.id} NOT IN THE ROOM`;
      const fr = r.frame ? ` · ${r.frame.out.length ? `OUT OF THE PICTURE: ${r.frame.out.join(", ")}` : "all in the picture"} · ${r.frame.calls} calls` : "";
      console.log(`  ${r.ok ? "✓" : "✗"} ${s.id.padEnd(20)} ${r.ok ? `${r.how} · ${r.how === "call" ? "phone" : r.zone} · ${r.speakers.map(who).join(", ")}${fr}` : r.why}`);
    }
    await page.evaluate(() => window.__ew.game.closeConversation());
    if (errors.length) console.log(`  page errors (${errors.length}): ${[...new Set(errors)].slice(0, 5).join(" | ")}`);
    results.__errors = [...(results.__errors ?? []), ...errors];
    await ctx.close();
  }
  const rows = Object.values(results).filter((r) => r.id);
  writeFileSync(path.join(OUT, "tour.json"), JSON.stringify({ base: BASE, sizes: SIZES.map((s) => s.join("x")), results: rows, pageErrors: [...new Set(results.__errors ?? [])] }, null, 1));
  const tags = SIZES.map((s) => s.join("x"));
  const md = [`| Conversation | Place | Started | Speakers (distance from the player) | In the picture (${tags.join(" · ")}) | Notes |`, "|---|---|---|---|---|---|"];
  for (const r of rows) {
    const all = Object.values(r.sizes);
    const ok = all.every((x) => x.ok);
    const first = all.find((x) => x.ok) ?? all[0];
    const sp = !first.ok ? "" : first.how === "call" ? "on the phone" : first.speakers.map((x) => x.here ? `${x.id} ${x.fromPlayer} m` : `**${x.id} not in the room**`).join(", ");
    const pic = tags.map((t) => { const f = r.sizes[t]?.frame; return !r.sizes[t]?.ok ? "–" : !f ? "(call)" : f.out.length ? `**out: ${f.out.join(", ")}**` : `yes, ${f.calls} calls`; }).join(" · ");
    md.push(`| ${r.id} | ${r.location} | ${ok ? `yes (${first.how})` : "**no**"} | ${sp} | ${pic} | ${ok ? "" : all.filter((x) => !x.ok).map((x) => x.why).join("; ")} |`);
  }
  writeFileSync(path.join(OUT, "tour.md"), md.join("\n") + "\n");
  const bad = rows.filter((r) => Object.values(r.sizes).some((x) => !x.ok));
  const outs = rows.flatMap((r) => Object.entries(r.sizes).filter(([, x]) => x.frame?.out.length).map(([t, x]) => `${r.id} at ${t} (${x.frame.out.join(", ")})`));
  console.log(`\n${rows.length - bad.length}/${rows.length} conversations reached and started${bad.length ? `; not: ${bad.map((r) => r.id).join(", ")}` : ""}. ${OUT}/tour.md`);
  console.log(outs.length ? `Speakers out of the picture: ${outs.join("; ")}` : "Every speaker in the picture at every size.");
  return bad.length ? 1 : 0;
}

// --------------------------------------------------------------------------------------------------------- rooms

/** In the page: freeze the game and take the views of `rooms` and of the town's talk spots. */
async function frozenViews({ rooms, town }) {
  const { game, store } = window.__ew;
  store.getState().setHud({ panel: null });
  // the signs' fonts first (a room is drawn once, when it is first built)
  await Promise.all(["600 40px Nunito", "700 40px Nunito", "800 40px Nunito", "400 40px Georgia"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  game.renderer.setAnimationLoop(null);
  const seededRandom = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const seeded = (seed, fn) => { const orig = Math.random; Math.random = seededRandom(seed); try { return fn(); } finally { Math.random = orig; } };
  const hide = () => {
    game.player.root.visible = false;
    game.guidance.group.visible = false;
    game.dust.group.visible = false;
    game.ambient.group.visible = false;
    game.pigeons.group.visible = false;
    game.town.group.traverse((o) => { if (o.userData?.v !== undefined || o.userData?.gull) o.visible = false; });
  };
  const V = (x, y, z) => game.rig.target.clone().set(x, y, z);
  const enter = (zone, spawn, seed) => {
    seeded(seed, () => game.enterZone(zone, spawn, true));
    // the people take a pose: their clocks set alike, then a few fixed steps of their idle animation (no fidget or
    // blink starts within them)
    const people = [...game.npcs.map((n) => n.ch), ...game.extras];
    seeded(seed + 1, () => {
      for (const ch of people) Object.assign(ch, { t: 0, blinkT: 2.5, momentT: 2, moment: null });
      for (let i = 0; i < 24; i++) {
        for (const ch of people) ch.update(1 / 30);
        for (const c of game.extraChats) c.update(1 / 30);
      }
    });
    if (zone === "town") game.town.update(0, 0);
    hide();
  };
  const render = (cx, cz) => {
    const cam = game.rig.cam;
    cam.clearViewOffset();
    // the lens as the rooms and the conversations have it (not the walking camera's, which the loop leaves behind)
    cam.fov = 50;
    cam.updateProjectionMatrix();
    game.rig.snap();
    game.rig.update(0, Math.PI, false, false, false);
    game.sun.position.set(cx - 40, 70, cz + 30);
    game.sun.target.position.set(cx, 0, cz);
    game.sun.target.updateMatrixWorld();
    game.sky.position.copy(cam.position);
    game.renderer.render(game.scene, cam);
    return { calls: game.renderer.info.render.calls, triangles: game.renderer.info.render.triangles, png: game.renderer.domElement.toDataURL("image/png") };
  };
  /** The conversation's framing (Game.startSession) for the player at `p` talking to someone at `a`. */
  const talkView = (p, a, indoor) => {
    const dir = V(a.x - p.x, 0, a.z - p.z);
    if (dir.lengthSq() < 0.01) dir.set(0, 0, -1);
    dir.normalize();
    const mid = V((p.x + a.x) / 2, 0, (p.z + a.z) / 2);
    const spread = Math.max(Math.hypot(p.x - mid.x, p.z - mid.z), Math.hypot(a.x - mid.x, a.z - mid.z));
    const dist = Math.max(6, spread * 2.6);
    if (indoor) {
      const side = Math.sign(a.x - p.x) || 1, half = game.zone.interior.w / 2 - 1;
      const cx = Math.min(half, Math.max(-half, mid.x + side * 1.8));
      return { pos: V(cx, 4.2 + dist * 0.07, mid.z + dist + 0.2), look: V(mid.x, 1.3, mid.z) };
    }
    const side = V(dir.z, 0, -dir.x);
    let pos = mid.clone().addScaledVector(side, dist).setY(3.2);
    if (game.town.colliders.blocked(pos.x, pos.z, 0.5)) pos = mid.clone().addScaledVector(side, -dist).setY(3.2);
    pos.addScaledVector(dir, -1.2);
    return { pos, look: V(mid.x, 1.35, mid.z) };
  };
  const spotOf = (sp) => sp.ax !== undefined && sp.az !== undefined ? { x: sp.ax, z: sp.az } : { x: sp.x + Math.sin(sp.rot) * (sp.sit ? 1.9 : 2.3), z: sp.z + Math.cos(sp.rot) * (sp.sit ? 1.9 : 2.3) };
  const views = [];
  const seedOf = (id) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  rooms.forEach((id) => {
    enter(id, undefined, seedOf(id));
    const it = game.zone.interior;
    if (!it || game.zoneId !== id) { views.push({ id, error: "no such room" }); return; }
    game.rig.mode = "interior"; game.rig.talk = null;
    game.rig.target.set(it.spawn.x, 0, it.spawn.z);
    views.push({ id: `${id}/door`, ...render(it.spawn.x, it.spawn.z) });
    for (const sp of it.npcs) {
      const p = spotOf(sp);
      game.rig.mode = "talk"; game.rig.talk = talkView(p, sp, true);
      views.push({ id: `${id}/${sp.npc}`, ...render(p.x, p.z) });
    }
  });
  if (town) {
    enter("town", { x: 28, z: -14.6, rot: Math.PI }, 999);
    for (const n of game.npcs) {
      const sp = { npc: n.id, x: n.home.x, z: n.home.z, rot: n.rot, sit: n.sit, ax: n.approach?.x, az: n.approach?.z };
      const p = spotOf(sp);
      game.rig.mode = "talk"; game.rig.talk = talkView(p, sp, false);
      views.push({ id: `town/${n.id}`, ...render(p.x, p.z) });
    }
  }
  return views;
}

async function rooms(browser) {
  mkdirSync(OUT, { recursive: true });
  const { ctx, page, errors } = await openGame(browser, SIZES[0]);
  const views = await page.evaluate(frozenViews, { rooms: ROOMS, town: !args["no-town"] });
  await ctx.close();
  const out = views.map((v) => {
    if (v.error) return v;
    const buf = Buffer.from(v.png.split(",")[1], "base64");
    const file = v.id.replace("/", "--") + ".png";
    writeFileSync(path.join(OUT, file), buf);
    return { id: v.id, calls: v.calls, triangles: v.triangles, hash: createHash("sha256").update(buf).digest("hex").slice(0, 16), file };
  });
  writeFileSync(path.join(OUT, "rooms.json"), JSON.stringify({ base: BASE, size: SIZES[0].join("x"), views: out, pageErrors: [...new Set(errors)] }, null, 1));
  for (const v of out) console.log(v.error ? `  ✗ ${v.id}: ${v.error}` : `  ${v.id.padEnd(30)} ${String(v.calls).padStart(4)} calls  ${v.hash}`);
  if (!args.compare) return 0;
  const before = JSON.parse(readFileSync(path.join(path.resolve(args.compare), "rooms.json"), "utf8")).views;
  const old = new Map(before.map((v) => [v.id, v]));
  let changed = 0;
  console.log(`\nCompared with ${args.compare}:`);
  for (const v of out) {
    const o = old.get(v.id);
    if (!o) { console.log(`  + ${v.id} (new view)`); changed++; continue; }
    if (o.hash !== v.hash || o.calls !== v.calls) { console.log(`  ≠ ${v.id}: pixels ${o.hash === v.hash ? "same" : "differ"}, calls ${o.calls} → ${v.calls}`); changed++; }
    old.delete(v.id);
  }
  for (const id of old.keys()) { console.log(`  - ${id} (gone)`); changed++; }
  console.log(changed ? `${changed} of ${out.length} views changed` : `✓ all ${out.length} views pixel-identical, same draw calls`);
  return changed ? 1 : 0;
}

// ----------------------------------------------------------------------------------------------------------- main

// The full Chromium in headless mode (its "headless shell" crashes on the game's page), one browser for every stop.
// WebGL on the GPU (Metal on a Mac; light on a shared machine), or --gl=software (SwiftShader: about eight cores).
// Compare runs made with the same --gl and the same --rooms list: the pixels depend on both.
const GL = args.gl ?? "gpu";
const launch = { channel: "chromium", headless: true, args: [...(GL === "software" ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : ["--use-angle=metal", "--enable-gpu"]), "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] };
const browser = await (await chromium()).launch(launch);
let code = 1;
try { code = MODE === "rooms" ? await rooms(browser) : await tour(browser); }
finally { await browser.close(); }
process.exit(code);
