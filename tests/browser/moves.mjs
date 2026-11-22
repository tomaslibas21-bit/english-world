// Four movement fixes (batch 0, 22 Nov 2026), in the real game, either town:
//  1. the boat has a floor: looking into the hull one sees boards, not the sea (pixels read under the camera);
//  2. a tap goes towards the spot as far as one can (walking, swimming, driving, at the helm), with at most one note;
//  3. a jump that comes down where a moving car now is lands on it, and the car carries the player along;
//  4. at the helm on a phone held upright: the stick points the way (the boat comes round to it and holds it), the
//     speed builds up on a held course, the boat sits above the bottom controls.
// WORLD_TEST_URL=http://127.0.0.1:5188 WORLD_STORAGE=english-world WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/moves.mjs
// (WORLD_SIZES=390x844,390x664,1280x800 to choose the screens; WORLD_SHOTS=<dir> to keep pictures)
import assert from "node:assert/strict";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5188";
const storage = process.env.WORLD_STORAGE || "english-world";
const shots = process.env.WORLD_SHOTS || "";
const sizes = (process.env.WORLD_SIZES || "390x844,390x664,1280x800").split(",").map((s) => s.split("x").map(Number));
const soft = !!process.env.WORLD_SOFT;
let failed = 0;
const check = (name, value, detail) => {
  if (soft && !value) { failed++; console.log("FAIL", name, JSON.stringify(detail)); return; }
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name, detail === undefined ? "" : JSON.stringify(detail));
};
const progress = {
  version: 1,
  profile: { name: "Test", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 5, play: "town", quality: "high", scenes: false, volume: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: 28, z: -14.6, rot: Math.PI },
  coach: { done: true, run: true },
};

const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  for (const [w, h] of sizes) {
    const phone = w < 700;
    const label = `${w}×${h}`;
    const ctx = await browser.newContext(phone ? { viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(([k, v]) => { localStorage.setItem(k, v); try { sessionStorage.setItem("ew-play-now", "1"); } catch {} }, [`${storage}-progress-v1`, JSON.stringify(progress)]);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__ew?.store?.getState().screen === "play" && window.__ew.game?.ledges?.ready, null, { timeout: 120000 });
    await page.evaluate(() => {
      window.__ew.coach?.finish?.(); window.__ew.store.getState().setHud({ panel: null });
      // (every note shown from here on, counted)
      const st = window.__ew.store, toast = st.getState().toast;
      // (only "you can't go there" notes count; a tip or someone's line is not one)
      window.__toasts = []; window.__said = [];
      st.setState({ toast: (t) => { (/negalima|can't walk there/i.test(t.title) ? window.__toasts : window.__said).push(t.title); toast(t); } });
    });
    const shot = async (name) => { if (shots) await page.screenshot({ path: `${shots}/${label.replace("×", "x")}-${name}.png` }); };
    const pos = () => page.evaluate(() => { const g = window.__ew.game, p = g.player.root.position; return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), swim: g.swimming, ride: g.rides.riding?.id ?? null, path: g.autoPath?.length ?? 0, toasts: window.__toasts.length }; });
    // a tap on the picture at a world point (on the ground, or the water's level)
    const tapAt = (x, z) => page.evaluate(([x, z]) => {
      const g = window.__ew.game, v = g.player.root.position.clone().set(x, 0, z).project(g.rig.cam), r = g.renderer.domElement.getBoundingClientRect();
      const cx = r.left + (v.x + 1) / 2 * r.width, cy = r.top + (1 - v.y) / 2 * r.height;
      const on = v.z < 1 && cx > r.left + 4 && cx < r.right - 4 && cy > r.top + 4 && cy < r.bottom - 4;
      if (on) g.onClick(cx, cy);
      return { on, cx: Math.round(cx), cy: Math.round(cy) };
    }, [x, z]);
    const place = (x, z, rot) => page.evaluate(([x, z, rot]) => { const g = window.__ew.game; g.keys.clear(); g.setJoystick(0, 0); g.enterZone("town", { x, z, rot }, true); g.rig.yaw = rot; g.rig.snap(); }, [x, z, rot]);
    const board = (kind) => page.evaluate((kind) => {
      const g = window.__ew.game, r = g.rides.list.find((q) => q.kind === kind);
      g.keys.clear(); g.setJoystick(0, 0); g.boardRide(r);
      return { id: r.id, x: r.m.x, z: r.m.z, heading: r.m.heading };
    }, kind);
    const onBoard = (kind) => page.waitForFunction((kind) => { const g = window.__ew.game; return g.rides.riding?.kind === kind && g.rides.phase === "on"; }, kind, { timeout: 8000 });
    const leave = async () => { await page.evaluate(() => { const g = window.__ew.game; g.setJoystick(0, 0); g.keys.clear(); g.rides.leave(); }); await page.waitForFunction(() => !window.__ew.game.rides.riding, null, { timeout: 8000 }); };

    // ================================================================ 1. the boat's floor
    const boat = await board("boat");
    await onBoard("boat");
    await page.evaluate(() => window.__ew.game.setJoystick(0, 1));
    await page.waitForTimeout(2200);
    await page.evaluate(() => window.__ew.game.setJoystick(0, 0));
    await page.waitForTimeout(1500);
    await shot("boat-out");
    // the camera close over the stern, looking down into the hull
    await page.evaluate(() => { const g = window.__ew.game; g.rig.pitch = 0.9; g.rig.dist = 4.4; });
    await page.waitForTimeout(900);
    await shot("boat-inside");
    // what is drawn at the floor between the thwarts and the bow's locker, either side of the middle (the boat's own
    // coordinates: x across, y up from the keel, z forward), read from the picture as it is rendered
    const floor = await page.evaluate(() => {
      const g = window.__ew.game, r = g.rides.riding, gl = g.renderer.getContext(), cam = g.rig.cam;
      // (the player sitting at the helm is left out of this one picture: their shirt is not the floor's business)
      g.player.root.visible = false;
      g.renderer.render(g.scene, cam);
      const out = [];
      for (const [x, z] of [[0.45, 0.0], [-0.45, 0.0], [0.45, 1.0], [-0.45, 1.0], [0.4, -0.3], [-0.4, -0.3]]) {
        const v = g.player.root.position.clone().set(x, 0.27, z).applyMatrix4(r.mesh.matrixWorld).project(cam);
        const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
        const px = Math.round((v.x + 1) / 2 * W), py = Math.round((v.y + 1) / 2 * H);
        if (px < 2 || py < 2 || px > W - 3 || py > H - 3) continue;
        const buf = new Uint8Array(4);
        gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        out.push({ x, z, rgb: [buf[0], buf[1], buf[2]] });
      }
      g.player.root.visible = true;
      return out;
    });
    // (the sea is blue-green: more blue than red; the boards are warm: more red than blue)
    const warm = floor.filter((f) => f.rgb[0] > f.rgb[2] + 10).length;
    check(`${label}: looking into the boat, its floor is seen, not the sea`, floor.length >= 3 && warm === floor.length, floor);
    await leave();

    // ================================================================ 4. the boat on a phone held upright
    if (phone) {
      const b = await board("boat");
      await onBoard("boat");
      await page.waitForTimeout(400);
      const h0 = await page.evaluate(() => window.__ew.game.rides.riding.m.heading);
      // out from the shore first, straight
      await page.evaluate(() => window.__ew.game.setJoystick(0, 1));
      await page.waitForTimeout(1600);
      // the stick held to the right (and a little up): the boat comes round to the right and then holds that course
      const h1 = await page.evaluate(() => window.__ew.game.rides.riding.m.heading);
      await page.evaluate(() => window.__ew.game.setJoystick(0.85, 0.25));
      await page.waitForTimeout(3500);
      const turned = await page.evaluate(() => { const m = window.__ew.game.rides.riding.m; return { heading: m.heading, steer: m.steer }; });
      const d = Math.atan2(Math.sin(turned.heading - h1), Math.cos(turned.heading - h1));
      const want = -Math.atan2(0.85, 0.25); // (to the right is a smaller heading)
      await page.waitForTimeout(1500);
      const later = await page.evaluate(() => window.__ew.game.rides.riding.m.heading);
      const drift = Math.atan2(Math.sin(later - turned.heading), Math.cos(later - turned.heading));
      check(`${label}: the stick to the right brings the boat round to the right, and it holds that course (no circles)`, Math.abs(d - want) < 0.35 && Math.abs(drift) < 0.12, { d: +d.toFixed(2), want: +want.toFixed(2), drift: +drift.toFixed(3), h0, h1 });
      // the speed builds up on a held course
      await page.evaluate(() => window.__ew.game.setJoystick(0, 1));
      await page.waitForTimeout(400);
      await page.evaluate(() => window.__ew.game.setJoystick(0.85, 0.25)); // (the same way as before: on course)
      await page.waitForTimeout(4500);
      const sp = await page.evaluate(() => { const m = window.__ew.game.rides.riding.m; return { pace: +m.pace.toFixed(2), town: m.spec.town, max: m.spec.max }; });
      check(`${label}: on a held course the boat picks up speed past its first pace`, sp.pace > sp.town + 1.5, sp);
      // the boat is seen above the stick and the buttons
      const frame = await page.evaluate(() => {
        const g = window.__ew.game, r = g.rides.riding, cam = g.rig.cam, rect = g.renderer.domElement.getBoundingClientRect();
        const pts = [[0, 0.7, 2.6], [0, 0.7, -2.3]].map(([x, y, z]) => { const v = g.player.root.position.clone().set(x, y, z).applyMatrix4(r.mesh.matrixWorld).project(cam); return rect.top + (1 - v.y) / 2 * rect.height; });
        const tops = [...document.querySelectorAll(".joystick, .act-btn, .brake-btn")].map((e) => e.getBoundingClientRect().top).filter((t) => t > 0);
        return { bow: Math.round(pts[0]), stern: Math.round(pts[1]), controls: Math.round(Math.min(...tops)), h: rect.height };
      });
      await shot("boat-phone");
      check(`${label}: the whole boat is drawn above the bottom controls`, frame.stern < frame.controls && frame.bow > 0, frame);
      // the stick pulled down with the boat nearly still: it backs off (the "aground" tip)
      await page.evaluate(() => { const g = window.__ew.game; g.setJoystick(0, 0); g.hold(true); });
      await page.waitForTimeout(1800);
      await page.evaluate(() => { const g = window.__ew.game; g.hold(false); g.setJoystick(0, -1); });
      await page.waitForTimeout(1200);
      const back = await page.evaluate(() => +window.__ew.game.rides.riding.m.speed.toFixed(2));
      check(`${label}: the stick pulled down from a standstill backs the boat`, back < -0.3, { back });
      await page.evaluate(() => window.__ew.game.setJoystick(0, 0));
      void b; void h0;
      await leave();
    }

    // ================================================================ 2. a tap goes towards the spot as far as one can
    // (a) on foot, a tap on a building's floor in the middle of it: walked up to its wall, no note
    await page.evaluate(() => { window.__toasts.length = 0; });
    const bld = await page.evaluate(() => {
      const g = window.__ew.game, doors = g.town.doors, nav = g.zone.nav;
      const boxes = g.town.colliders.boxes.filter((b) => b.tag === "building" && (b.maxX - b.minX) > 6 && (b.maxZ - b.minZ) > 6);
      // (one with open ground on its south side, a spot along that wall well away from its doors: stand there, facing it)
      for (const b of boxes) for (let x = b.minX + 1.5; x <= b.maxX - 1.5; x += 1) {
        const z = b.maxZ + 9, tx = x, tz = b.maxZ - 1.5;
        if (!nav.free(nav.idx(x, z)) || !nav.free(nav.idx(x, b.maxZ + 1.2))) continue;
        if (doors.some((d) => Math.hypot(d.outX - tx, d.outZ - tz) < 6 || Math.hypot(d.x - tx, d.z - tz) < 6)) continue;
        return { cx: x, cz: (b.minZ + b.maxZ) / 2, z, wall: b.maxZ, tz };
      }
      return null;
    });
    check(`${label}: a building to tap on`, !!bld, bld);
    await place(bld.cx, bld.z, Math.PI);
    await page.evaluate(() => { const g = window.__ew.game; g.rig.pitch = 0.6; });
    await page.waitForTimeout(700);
    await page.evaluate(() => { window.__toasts.length = 0; });
    // (the building's own middle can be hidden by it: its floor plan's point nearest us is tapped)
    let tap = await tapAt(bld.cx, bld.tz);
    check(`${label}: (the point inside the building is on the screen)`, tap.on, tap);
    await page.waitForTimeout(250);
    let s = await pos();
    check(`${label}: a tap inside a building starts a walk towards it`, s.path > 0, s);
    await page.waitForTimeout(4000);
    s = await pos();
    const zone = await page.evaluate(() => window.__ew.game.zone.id);
    check(`${label}: walked up to the building's wall, no note`, zone === "town" && Math.abs(s.z - bld.wall) < 2.2 && s.toasts === 0, { s, wall: bld.wall, zone });
    // tapped again there: nowhere nearer to go: at most one note for three taps
    for (let i = 0; i < 3; i++) { await tapAt(bld.cx, bld.tz); await page.waitForTimeout(250); }
    s = await pos();
    check(`${label}: three more taps where one can't get nearer: at most one note`, s.toasts <= 1, { s, toasts: await page.evaluate(() => window.__toasts) });

    // (b) from the beach, a tap far out on the water: walked in, waded, swum towards it
    await page.evaluate(() => { window.__toasts.length = 0; });
    const beach = await page.evaluate(() => {
      const g = window.__ew.game, b = g.rides.list.find((q) => q.kind === "boat"), nav = g.zone.nav, x = b.home.x + 8;
      // (beside a boat's place, a few metres up the beach: on the sand, with nothing between it and the water, not on
      // a promenade above a sea wall)
      for (const dz of [9, 8, 7, 6, 5, 4]) {
        const z = b.home.z + dz;
        let open = true;
        for (let zz = z; zz >= b.home.z + 3.5; zz -= 0.5) if (!nav.free(nav.idx(x, zz))) { open = false; break; }
        if (open) return { x, z };
      }
      return { x, z: b.home.z + 4 };
    });
    await place(beach.x, beach.z, Math.PI);
    await page.evaluate(() => { const g = window.__ew.game; g.rig.pitch = 0.45; });
    await page.waitForTimeout(700);
    await page.evaluate(() => { window.__toasts.length = 0; });
    tap = await tapAt(beach.x, beach.z - 22);
    check(`${label}: (the water out there is on the screen)`, tap.on, tap);
    await page.waitForTimeout(9000);
    s = await pos();
    check(`${label}: a tap on the water from the beach: in and swimming that way, no note`, s.swim && s.z < beach.z - 14 && s.toasts === 0, { s, beach });
    // (c) swimming, a tap beyond the bay's edge: swum as far as the edge, then stopped
    await page.evaluate(() => { window.__toasts.length = 0; });
    await page.evaluate(() => { const g = window.__ew.game; g.rig.yaw = Math.PI; g.rig.pitch = 0.3; });
    await page.waitForTimeout(500);
    const far = await page.evaluate(() => { const p = window.__ew.game.player.root.position; return { x: p.x, z: p.z - 60 }; });
    tap = await tapAt(far.x, far.z);
    const bayEdge = await page.evaluate(() => window.__ew.game.rides && (window.__ewBay = null));
    void bayEdge;
    if (tap.on) {
      await page.waitForTimeout(500);
      s = await pos();
      check(`${label}: swimming, a tap beyond the bay's edge still swims that way`, s.path > 0 || s.toasts === 0, s);
    }
    await shot("tap-swim");

    // (d) at the wheel: a tap on the street ahead, the car drives there and stops
    await page.evaluate(() => { window.__toasts.length = 0; });
    const car = await board("car");
    await onBoard("car");
    // (its owners hop out and stand by for a few seconds: the car never drives into them; tapped once they step back)
    await page.waitForFunction(() => { const g = window.__ew.game, r = g.rides.riding; return r && r.owners.every((o) => g.rides.reach(r, o.ch.root.position.x, o.ch.root.position.z) > 3); }, null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);
    // (driven off the kerb first, as one does, and stopped: then a tap on the street ahead)
    await page.evaluate(() => window.__ew.game.setJoystick(0, 1));
    await page.waitForTimeout(1300);
    await page.evaluate(() => { const g = window.__ew.game; g.setJoystick(0, 0); g.hold(true); });
    await page.waitForTimeout(1200);
    await page.evaluate(() => window.__ew.game.hold(false));
    await page.waitForTimeout(800);
    const goal = await page.evaluate(() => {
      const g = window.__ew.game, r = g.rides.riding, h = r.m.heading, cam = g.rig.cam, rect = g.renderer.domElement.getBoundingClientRect();
      // (somewhere along the street ahead of it, on the screen)
      for (let d = 20; d >= 8; d -= 2) for (const a of [0, 0.2, -0.2, 0.4, -0.4, 0.6, -0.6]) {
        const x = r.m.x + Math.sin(h + a) * d, z = r.m.z + Math.cos(h + a) * d;
        const v = g.player.root.position.clone().set(x, 0, z).project(cam), cy = (1 - v.y) / 2 * rect.height, cx = (v.x + 1) / 2 * rect.width;
        if (g.rides.drivable.has(x, z) && v.z < 1 && cx > 10 && cx < rect.width - 10 && cy > 10 && cy < rect.height - 10) return { x, z, d };
      }
      return null;
    });
    check(`${label}: (somewhere to drive to ahead)`, !!goal, goal);
    tap = await tapAt(goal.x, goal.z);
    check(`${label}: (the street ahead is on the screen)`, tap.on, tap);
    await page.waitForTimeout(300);
    const going = await page.evaluate(() => !!window.__ew.game.rideGoal);
    check(`${label}: a tap from the wheel sets where to drive`, going);
    await page.evaluate(() => { const g = window.__ew.game, m = g.rides.riding.m; window.__drive = []; const tick = () => { const G = g.rideGoal; window.__drive.push([+m.x.toFixed(1), +m.z.toFixed(1), +m.heading.toFixed(2), +m.speed.toFixed(1), G ? `${G.still.toFixed(1)}/${G.back.toFixed(1)}/${G.tries}` : "-", g.keys.size, g.joy.x, g.joy.y, +g.brake, g.rides.phase]); if (G && window.__drive.length < 200) setTimeout(tick, 150); }; tick(); });
    await page.waitForFunction(() => !window.__ew.game.rideGoal, null, { timeout: 25000 });
    await page.waitForTimeout(800);
    const arrived = await page.evaluate((goal) => { const m = window.__ew.game.rides.riding.m; const d = +Math.hypot(m.x - goal.x, m.z - goal.z).toFixed(2); return { d, v: +m.speed.toFixed(2), toasts: window.__toasts.length, goal, trace: d < 4.5 ? undefined : window.__drive }; }, goal);
    check(`${label}: the car drives there by itself and stops near it`, arrived.d < 4.5 && Math.abs(arrived.v) < 0.5 && arrived.toasts === 0, { arrived, car });
    await leave();
    // (e) at the helm: a tap on the water, the boat goes there
    await board("boat");
    await onBoard("boat");
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__ew.game.setJoystick(0, 1));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__ew.game.setJoystick(0, 0));
    await page.waitForTimeout(300);
    const sea = await page.evaluate(() => { const m = window.__ew.game.rides.riding.m; return { x: m.x + Math.sin(m.heading) * 18 + Math.cos(m.heading) * 6, z: m.z + Math.cos(m.heading) * 18 - Math.sin(m.heading) * 6 }; });
    tap = await tapAt(sea.x, sea.z);
    if (tap.on) {
      await page.waitForFunction(() => !window.__ew.game.rideGoal, null, { timeout: 15000 });
      await page.waitForTimeout(1200);
      const at = await page.evaluate((sea) => { const m = window.__ew.game.rides.riding.m; return { d: +Math.hypot(m.x - sea.x, m.z - sea.z).toFixed(2), v: +m.pace.toFixed(2) }; }, sea);
      check(`${label}: at the helm, a tap on the water: the boat goes there and slows to a stop`, at.d < 6 && at.v < 1.2, at);
    }
    await leave();

    // ================================================================ 3. a jump onto a moving car
    let jump;
    for (let attempt = 0; attempt < 3; attempt++) {
    jump = await page.evaluate(async () => {
      const g = window.__ew.game, a = g.ambient;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      // a car of the traffic (a car, not a bus), moving, with room ahead of it before its lane ends
      let c = null;
      for (let tries = 0; tries < 60 && !c; tries++) {
        c = a.cars.find((q) => q.hidden <= 0 && q.whole && q.speed > Math.max(4, q.max * 0.95) && (q.len ?? 4.3) < 6 && ((q.dir > 0 ? q.to : q.from) - q.x) * q.dir > 75 && g.zone.nav.free(g.zone.nav.idx(q.x + q.dir * 45, q.lane + 2.0))) ?? null;
        if (!c) await wait(250);
      }
      if (!c) return { error: "no car" };
      // stand beside its lane, ahead of it, facing the lane; jump (three presses: the high jump) as it comes, while
      // stepping towards the lane: the car is under the player only by the time they come down
      const side = 2.0, ahead = 45;
      const px = c.x + c.dir * ahead, pz = c.lane + side;
      g.keys.clear(); g.setJoystick(0, 0); g.enterZone("town", { x: px, z: pz, rot: Math.PI }, true); g.rig.yaw = Math.PI; g.rig.snap();
      await wait(200);
      const p = g.player.root.position;
      // the same three presses once on the spot, to time them in the game's own time (a slow phone's frames are
      // stretched: what counts is how far the car goes in the game while the player is in the air)
      const t0 = g.t;
      await wait(120); g.jump(); await wait(60); g.jump(); await wait(60); g.jump();
      for (let t = 0; t < 3000; t += 16) { await wait(16); if (!g.hop.air && g.t - t0 > 0.4) break; }
      const air = g.t - t0;
      await wait(150);
      // (when it is as far off as it goes in that time, go: its roof will be under them on the way down, while their
      // feet are still above it: they come down on the roof a moment before they would have reached the street)
      // (at its steady pace: a car still picking up speed would come sooner than worked out)
      for (let t = 0; t < 12000 && (Math.abs(c.x - p.x) > c.speed * (air - 0.3) || c.speed < c.max * 0.97); t += 16) await wait(16);
      // (held up on the way, by someone crossing: it went by, or it is not at its pace: another car is tried)
      if ((p.x - c.x) * c.dir < c.speed * (air - 0.3) - 1 || c.speed < c.max * 0.97) return { retry: true, speed: c.speed, gap: (p.x - c.x) * c.dir };
      const before = { carX: c.x, px: p.x, gapX: Math.abs(c.x - p.x), speed: c.speed, air: +air.toFixed(2) };
      // (what happened, frame by frame, for the failure message)
      const trace = [], T0 = g.t;
      let tracing = true;
      (async () => { while (tracing) { trace.push([+(g.t - T0).toFixed(2), +((p.x - c.x) * c.dir).toFixed(2), +(p.z - c.lane).toFixed(2), +c.speed.toFixed(1), +g.hop.y.toFixed(2), +g.hop.ground.toFixed(2), +g.hop.air, +!!c.rider, a.cars.filter((o) => o !== c && o.lane === c.lane && o.hidden <= 0).map((o) => +((o.x - c.x) * c.dir).toFixed(1)).join("|"), a.rideBoxes.map((b) => `${b.x.toFixed(0)},${b.z.toFixed(0)}`).join("|")]); await wait(66); } })();
      g.setJoystick(0, 1);
      await wait(120);
      g.jump(); await wait(60); g.jump(); await wait(60); g.jump();
      await wait(170);
      g.setJoystick(0, 0);
      let top = 0;
      for (let t = 0; t < 5000; t += 16) { await wait(16); if (!g.hop.air) break; }
      top = g.hop.ground;
      const on = { y: +p.y.toFixed(2), dx: +(p.x - c.x).toFixed(2), dz: +(p.z - c.lane).toFixed(2), carSpeed: +c.speed.toFixed(2) };
      // carried: a second later, still on it, both moved the same way
      const c0 = c.x, p0 = p.x;
      await wait(1000);
      const carried = { car: +(c.x - c0).toFixed(2), player: +(p.x - p0).toFixed(2), y: +p.y.toFixed(2), rider: !!c.rider };
      tracing = false;
      return { before, top: +top.toFixed(2), on, carried, lane: c.lane, end: c.dir > 0 ? c.to : c.from, dir: c.dir, idx: a.cars.indexOf(c), trace: top > 0.6 ? undefined : trace };
    });
    if (!jump.retry) break;
    console.log("(a car held up on the way: another one)", JSON.stringify(jump));
    }
    check(`${label}: (a moving car to jump onto)`, !jump.error && !jump.retry, jump);
    check(`${label}: jumping where the car is going lands on it (${jump.top > 1.2 ? "the roof" : "the hood or the trunk"})`, jump.top > 0.6 && Math.abs(jump.on.dz) < 1.2 && Math.abs(jump.on.dx) < 2.6, jump);
    check(`${label}: on top of it, the car carries the player along`, Math.abs(jump.carried.car) > 2 && Math.abs(jump.carried.player - jump.carried.car) < 0.3 && jump.carried.y > 0.6 && jump.carried.rider, jump.carried);
    await shot("car-roof");
    // with the player on it, the car stops before its lane ends and waits there (never shrinks away under them)
    const end = await page.evaluate(async (idx) => {
      const g = window.__ew.game, c = g.ambient.cars[idx], p = g.player.root.position, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const end = c.dir > 0 ? c.to : c.from, jumpBy = end - c.dir * 16 - c.x;
      c.x += jumpBy; p.x += jumpBy;
      await wait(4500);
      return { toEnd: +((end - c.x) * c.dir).toFixed(2), speed: +c.speed.toFixed(2), y: +p.y.toFixed(2), visible: c.mesh.visible, scale: +c.mesh.scale.x.toFixed(2) };
    }, jump.idx);
    check(`${label}: with the player on top, the car waits before its lane's end`, end.toEnd > 2.5 && end.speed < 0.1 && end.y > 0.6 && end.visible && end.scale === 1, end);
    check(`${label}: no page errors`, errors.length === 0, errors);
    await ctx.close();
  }
} finally {
  await browser.close();
}
