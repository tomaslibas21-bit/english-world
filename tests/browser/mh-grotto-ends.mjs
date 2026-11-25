// Map selection, walking guide, keeper poses, phone HUD and course egress. The Oak has a separate story ending.
import assert from "node:assert/strict";
import {
  BRAM, CAVE, DEVICES, RING, TIDE, at, closeRune, conversation, distance, endTalk, heard, lines, oakTalk,
  openMap, openRune, settled, solve, suite, surface, walk,
} from "./fixtures/mh-cave.mjs";

const mapState = (run) => run.page.locator(".minimap canvas").evaluate((canvas) => ({
  map: canvas.dataset.map, player: canvas.dataset.player.split(",").map(Number), gates: Number(canvas.dataset.gates),
}));
const pose = (run, id) => run.ev((id) => {
  const g = window.__ew.game, n = g.npcs.find((n) => n.id === id), p = g.player.root.position;
  const wanted = Math.atan2(p.x - n.home.x, p.z - n.home.z), yaw = n.ch.root.rotation.y;
  return { yaw, facingError: Math.abs(Math.atan2(Math.sin(wanted - yaw), Math.cos(wanted - yaw))),
    body: n.ch.body.position.y, lift: n.ch.lift, calls: g.renderer.info.render.calls };
}, id);

async function foldedLayout(run, requireTip = false) {
  const card = run.page.locator(".cave-card"), layout = await card.evaluate((node) => {
    const tip = document.querySelector(".town-toasts .toast.tip"), box = node.getBoundingClientRect();
    const body = tip?.querySelector("p"), rect = tip?.getBoundingClientRect();
    return { cardHeight: box.height, cardBottom: box.bottom, tipTop: rect?.top, tipBottom: rect?.bottom,
      bodyHeight: body?.clientHeight, scrollHeight: body?.scrollHeight,
      lineHeight: body && parseFloat(getComputedStyle(body).lineHeight) };
  });
  assert(layout.cardHeight <= 48, JSON.stringify(layout));
  if (requireTip) assert(layout.tipTop !== undefined);
  if (layout.tipTop !== undefined) {
    assert(layout.tipTop >= layout.cardBottom && layout.tipBottom <= run.height * 0.3 + 1, JSON.stringify(layout));
  }
  return layout;
}

async function firstGuide(run) {
  const sheet = await openMap(run, CAVE);
  const bram = sheet.locator(".sit-list > div").filter({ has: run.page.locator('[data-sit="x06-bram"]') });
  await surface(run, bram, [...BRAM.title, "Rodyti kelią"]);
  await run.mark("cave-map-selection");
  await run.press(bram.getByRole("button", { name: "Rodyti kelią", exact: true }));
  await run.wait(() => {
    const { game: g, store } = window.__ew, o = store.getState().hud.objective;
    const p = g.player.root.position, target = g.objectiveTarget();
    const angle = target && Math.atan2(target.x - p.x, target.z - p.z);
    return g.zoneId === "town" && Math.hypot(p.x + 101, p.z + 55) < 0.5 && !g.autoPath &&
      target?.kind === "cave-entry" && target.id === "cleft" && o?.angle != null && Math.abs(o.angle - angle) < 0.05;
  }, "selecting the guide sets the bearing while the player stays put");
  const objective = run.page.locator(".objective-card");
  if (await objective.locator(".objective-summary").isVisible()) await run.press(objective.locator(".objective-summary"));
  await surface(run, objective, [CAVE[0], "Nuvesk mane"]);
  if (run.phone) await run.press(run.page.locator('.objective-card .btn[title="G"]'));
  else await run.page.keyboard.press("g");
  await run.wait(() => {
    const { game: g } = window.__ew, p = g.player.root.position;
    return g.zoneId === "town" && p.x < -114 && p.x > -122 && p.z > -64 && p.z < -57 &&
      p.y >= 0 && !g.swimming && document.querySelector(".minimap canvas")?.dataset.map === "slate-cove" && g.guidance.dots.count > 0;
  }, "dry travel with exterior guide dots", 50_000);
  const local = await mapState(run);
  assert.equal(local.map, "slate-cove");
  assert(local.player.every((v) => Math.abs(v - 0.5) < 0.01), JSON.stringify(local));
  await run.mark("dry-guide-dots");
  const bigMap = await openMap(run);
  await run.visible(bigMap.locator('canvas[data-map="slate-cove"]'));
  await surface(run, bigMap, ["Maple Harbor", "Slate Cove Cave", "Old Stone Ring"]);
  const player = bigMap.locator(".map-me");
  assert.equal(await player.getAttribute("title"), "Jūs esate čia");
  for (const [name, place] of [["Rodyti įėjimą į olą žemėlapyje", CAVE], ["Rodyti Senąjį akmenų ratą žemėlapyje", RING]]) {
    const pin = bigMap.getByRole("button", { name, exact: true });
    assert.equal(await pin.locator("[lang=en]").innerText(), place[0]);
    assert.equal(await pin.locator("[lang=lt]").innerText(), `· ${place[1]}`);
  }
  assert.equal(await bigMap.locator(".info-box").innerText().then((s) => s.replace(/\s+/gu, " ").trim()),
    "Pasirinkite vietą žemėlapyje. Geltonas taškas rodo Jūsų užduotį, raudonas – kur esate. Kai kurios užduotys atliekamos telefonu (P).");
  const mapPin = await player.evaluate((d) => [parseFloat(d.style.left), parseFloat(d.style.top)]);
  assert(mapPin.every((v) => v > 0 && v < 100), JSON.stringify(mapPin));
  await run.mark("cove-local-map");
  await run.press(bigMap.getByRole("button", { name: "Uždaryti", exact: true }));

  await run.wait(() => {
    const { game: g, store } = window.__ew, p = g.player.root.position, c = store.getState().conv;
    return g.zoneId === "gruta" && c.active && c.sitId === "x06-bram" && Math.hypot(p.x - 1.9, p.z + 4.3) < 2.9;
  }, "cleft walk reaches Bram and opens the actual conversation", 50_000);
  assert.equal((await run.state()).visits, 1);
  await conversation(run, BRAM);
  await heard(run, ["Who's there on the path?", "Kas ten ant tako?"]);
  assert.equal((await pose(run, BRAM.npc)).lift, 0);
  await run.mark("bram-guided-talk");
  await endTalk(run);

  await run.wait(() => document.querySelector(".minimap canvas")?.dataset.map === "gruta", "the cave map takes over");
  const inside = await mapState(run);
  assert(inside.player.every((v) => v > 0 && v < 1), JSON.stringify(inside));
  assert.equal(inside.gates, 0);
  const caveMap = await openMap(run);
  await run.visible(caveMap.locator('canvas[data-map="gruta"][data-gates="0"]'));
  await surface(run, caveMap, [...CAVE, "Kelias oloje", "Nuvesk mane"]);
  assert.equal(await caveMap.locator(".map-me").getAttribute("title"), "Jūs esate čia");
  const cavePin = await caveMap.locator(".map-me").evaluate((d) => [parseFloat(d.style.left), parseFloat(d.style.top)]);
  assert(cavePin.every((v) => v > 0 && v < 100));
  await run.mark("cave-map-closed-gates");
  await run.press(caveMap.getByRole("button", { name: "Uždaryti", exact: true }));

  await walk(run, -2, -3.2);
  await run.until(async () => {
    const p = await pose(run, BRAM.npc);
    return p.lift === 0 && Math.cos(p.facingError) > 0.98;
  }, "Bram settles facing the learner");
  const before = await pose(run, BRAM.npc);
  const camera = await run.ev(() => {
    const g = window.__ew.game, { rig } = g;
    const { home } = g.npcs.find((n) => n.id === "cave_bram"), x = 1.2, z = -0.7;
    const heading = Math.atan2(home.x - x, home.z - z);
    g.player.root.position.set(x, g.wild.floor(x, z), z);
    g.player.root.rotation.y = g.heading = heading;
    g.vel.set(0, 0, 0);
    g.moveVel.set(0, 0, 0);
    const original = { pitch: rig.pitch, dist: rig.dist };
    rig.target.copy(g.player.root.position);
    rig.yaw = heading - 0.2;
    rig.pitch = 0.47; rig.dist = 5.5;
    rig.yawVel = 0; rig.slideYaw = rig.standYaw = null;
    rig.snap();
    return original;
  });
  const hop = await run.until(async () => {
    const p = await pose(run, BRAM.npc);
    return p.lift >= 0.16 && Math.cos(p.facingError) > 0.98 && p;
  }, "Bram's standing hop", { timeout: 35_000, frames: 1 });
  assert(Math.abs(hop.yaw - before.yaw) > 0.45 && hop.facingError < 0.25, JSON.stringify({ before, hop }));
  assert(hop.body - before.body > 0.1 && hop.calls < 40, JSON.stringify({ before, hop }));
  if (run.phone) await foldedLayout(run);
  await run.mark("bram-mid-hop");
  await run.ev(({ pitch, dist }) => Object.assign(window.__ew.game.rig, { pitch, dist }), camera);

  await run.ev(() => window.__ew.game.setObjective("s69-local"));
  await run.wait(() => window.__ew.game.objectiveTarget()?.id === "cleft", "regular course target points to the dry exit");
  const toggle = run.page.locator(".cave-toggle");
  if (run.phone) {
    if (run.height === 664) {
      await run.ev(() => {
        const st = window.__ew.store.getState();
        for (const { toast } of st.townToasts) st.dismissToast(toast.id);
      });
      await run.until(async () => !await run.page.locator(".town-toasts .toast").count(), "toast lane clears");
    }
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    assert.equal(await run.page.locator('.cave-guide button[data-guide="cave"]').isVisible(), false);
  }
  if (await toggle.getAttribute("aria-expanded") === "false") await run.press(toggle);
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  if (run.height === 664) {
    // The donor injects a long tip only to test HUD mechanics. Repeat the authored in-game MH tip.
    await run.ev(() => {
      const line = "Pasikalbėkite su Bramu ant pilkojo tako.";
      window.__ew.store.getState().toast({ kind: "tip", title: "Radote Skalūnų įlankos olą!", body: [line, line, line].join(" ") });
    });
    const tip = run.page.locator(".town-toasts .toast.tip");
    await surface(run, tip, ["Radote Skalūnų įlankos olą!", "Pasikalbėkite su Bramu ant pilkojo tako."]);
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    const layout = await foldedLayout(run, true);
    assert(layout.scrollHeight > layout.bodyHeight && layout.bodyHeight <= 3 * layout.lineHeight + 1, JSON.stringify(layout));
    await run.mark("long-tip-three-lines");
    await run.press(tip.locator(".x"));
    await run.visible(run.page.locator('.cave-toggle[aria-expanded="true"]'));
  }
  await surface(run, run.page.locator(".cave-card"), ["Tide Hall", "Potvynių menė", "Pasikalbėkite su Bramu", "Išeikite sausuoju taku"]);
  await run.press(run.page.locator('.cave-guide button[data-guide="objective"]'));
  await run.wait(() => {
    const g = window.__ew.game;
    return g.autoTarget?.kind === "cave-exit" && g.autoTarget.id === "cleft" && g.autoPath?.length;
  }, "course walk routes through cleft", 5000);
  await run.wait(() => {
    const g = window.__ew.game, p = g.player.root.position;
    return g.zoneId === "town" && Math.hypot(p.x + 121, p.z + 61.8) < 2.5 && p.y >= 0 && !g.swimming;
  }, "cleft returns to the dry trail", 20_000, undefined, 1);
  await surface(run, run.page.locator(".town-toasts .toast").filter({ hasText: "Vėl ant tako" }), ["Vėl ant tako", "Taku grįšite į miestelį."]);
  await run.mark("course-exit");
  await run.wait(() => {
    const g = window.__ew.game;
    return g.zoneId === "town" && g.player.root.position.x > -112 && g.autoPath?.length;
  }, "the original course walk resumes beyond the headland", 60_000);
  assert.equal((await run.state()).course, "s69-local");
  await run.mark("course-walk-resumes");
}

async function seatedHop(run) {
  await settled(run, "gruta");
  await run.wait(() => document.querySelector(".minimap canvas")?.dataset.map === "gruta", "saved cave minimap");
  assert.equal((await mapState(run)).gates, 7);
  const before = await pose(run, "cave_fern");
  await walk(run, -7, -97);
  const hop = await run.until(async () => {
    const p = await pose(run, "cave_fern");
    const steady = await run.ev(() => window.__ew.game.npcs.find((n) => n.id === "cave_fern").ch.steady);
    return p.lift > 0.1 && steady && p;
  }, "Fern's seated hop", { timeout: 35_000, frames: 1 });
  assert(Math.abs(hop.yaw - before.yaw) > 0.35 && hop.facingError < 0.35 && hop.body - before.body > 0.06,
    JSON.stringify({ before, hop }));
  assert(hop.calls < 40);
  await surface(run, run.page.locator(".cave-card"), ["Hidden River", "3 / 5"]);
  await run.mark("fern-mid-hop");
}

await suite("mh-grotto-ends", async (run) => {
  for (const device of [...DEVICES, [390, 664]]) {
    await run(device, "map-guide-and-exit", {}, firstGuide);
    await run(device, "seven-open-mask", { save: {
      place: { zone: "gruta", x: -6.5, z: -93.5, rot: Math.PI },
      cave: { passed: ["bram"], lit: [...TIDE, "root-1", "root-2", "root-3"], seen: true },
    } }, seatedHop);
    await run(device, "oak-ending", { save: {
      cave: { passed: ["bram", "fern"], lit: [...TIDE, "root-2", "river-3"], heart: true, seen: true },
    } }, async (view) => {
      await at(view, 6, -171.5, Math.PI);
      await view.ev(() => window.__ew.game.walkTo(6, -177.2, { kind: "point" }));
      await oakTalk(view, { leaveByGuide: true });
      const after = await view.state();
      assert(after.cave.tree && after.cave.lit.length === 5 && distance(after, [6, -180]) < 3.6 && !after.talk);
      await surface(view, view.page.locator(".town-toasts .toast.tip").filter({ hasText: "Akmenys vėl prabilo" }),
        ["Akmenys vėl prabilo", "Pasiklausykite, ką dar sako akmenys."]);
      await view.mark("oak-after-invitation");
      await walk(view, 6.2, -189.85);
      const assigned = await view.ev(() => window.__ew.game.cave.phrases.get("oak-3").id);
      const line = lines.get(assigned);
      assert(line, assigned);
      const quiz = await openRune(view, "oak-3");
      await solve(view, quiz, [line.en, line.lt]);
      assert((await view.state()).cave.heard.includes(assigned));
      await view.mark("oak-invitation-replay");
      await closeRune(view);
    });
  }
});
