// Both the owner's full 15-stone fixture and an ordinary five-stone walkthrough.
import assert from "node:assert/strict";
import {
  DEVICES, STONES, TIDE, TIDE_LINE, at, audioKey, bramTalk, calls, closeRune, crossIn, distance, exitVia,
  fernTalk, forward, inspectPicker, interact, lines, look, oakTalk, openRune, prompt, settled, solve, suite,
  surface, trail, walk, watch,
} from "./fixtures/mh-cave.mjs";

const full = { lit: STONES, passed: ["bram", "fern"], seen: true, heart: true };
const byStone = {
  "tide-1": { spot: [-6.4, -24.5], meaning: TIDE_LINE },
  "tide-2": { spot: [6.55, -30.42], meaning: ["Light slips through a crack.", "Pro plyšį skverbiasi šviesa."] },
  "tide-3": { spot: [2.05, -37.6], meaning: ["The oak holds up the sky.", "Ąžuolas laiko dangų."] },
  "root-2": { spot: [-9.46, -69.76], meaning: ["Follow the little lights.", "Sekite paskui žiburėlius."] },
  "river-3": { spot: [-6.8, -110.85], meaning: ["The bridge will hold you.", "Tiltas Jus išlaikys."] },
};

const replayState = (run) => run.ev(() => {
  const { game, store } = window.__ew, { cave: c } = game, { hud, progress } = store.getState();
  return { replay: c.replay, relit: [...c.relit], assignments: [...c.phrases].map(([id, p]) => [id, p.id]),
    card: hud.cave, heard: progress.cave.heard ?? [], rounds: progress.cave.rounds ?? 0,
    book: Object.keys(progress.phrases).filter((key) => /^x08-old-oak:(?:tide|root|river|star|oak)_/.test(key)),
    saved: progress.cave.lit };
});

async function completeReplay(run, id) {
  const assigned = (await replayState(run)).assignments.find(([stone]) => stone === id)?.[1];
  const line = lines.get(assigned);
  assert(line, "replay is an authored ID from the MH corpus");
  const q = await openRune(run, id);
  assert(q.s);
  await solve(run, q, [line.en, line.lt]);
  assert(await run.page.locator(".glyph-line .u").count() > 0);
  await run.mark("replay-rune");
  return assigned;
}

async function seeded(run) {
  await at(run, 6, -171.5, Math.PI);
  await run.wait(() => window.__ew.game.cave?.pool.size >= 215, "all Oak lines load", 60_000);
  const { card } = await run.state();
  assert(card.n === 5 && /ąžuolo/i.test(card.next), JSON.stringify(card));
  assert.equal(await run.ev(() => window.__ew.game.cave.pool.size), 215);
  await surface(run, run.page.locator(".cave-card"), ["Oak Heart", "5 / 5"]);
  await run.mark("oak-shore");
  await run.ev(() => window.__ew.game.walkTo(6, -177.2, { kind: "point" }));
  await oakTalk(run);
  await run.wait(() => /0 iš 215/.test(window.__ew.store.getState().hud.cave?.next), "the library counter begins at zero", 20_000);
  let q = await replayState(run);
  assert(q.replay && !q.relit.length && q.assignments.length === 15 && q.card.lit === 0 && q.saved.length === 15, JSON.stringify(q));
  assert.deepEqual(q.assignments.map(([id]) => id), STONES);
  assert.equal(new Set(q.assignments.map(([, line]) => line)).size, 15);
  assert(q.assignments.every(([, id]) => lines.has(id)));
  assert.equal(q.rounds, 0);
  await run.mark("fifteen-replays");

  await at(run, 6.2, -189.4, Math.PI);
  const id = "oak-3", heard = await completeReplay(run, id);
  const timer = () => run.ev((id) => window.__ew.game.cave.rearm.get(id), id);
  assert.equal(await timer(), 40);
  await closeRune(run);
  await run.step(12);
  q = await replayState(run);
  assert.deepEqual(q.heard, [heard]);
  assert.deepEqual(q.book, ["x08-old-oak:" + heard]);
  assert.deepEqual(q.relit, [id]);
  assert.equal(q.saved.length, 15);
  assert.equal(q.rounds, 0);
  assert.match(q.card.next, /1 iš 215/);

  const remaining = await timer();
  assert(remaining > 39 && remaining < 40);
  for (let i = 0; i < Math.floor((remaining - 0.3) / 0.05); i += 4) {
    await run.step(Math.min(4, Math.floor((remaining - 0.3) / 0.05) - i));
  }
  assert(await timer() > 0 && (await replayState(run)).relit.includes(id), "stone waits through nearly 40 game seconds");
  await run.wait((id) => !window.__ew.game.cave.relit.has(id), "stone rearms after its full 40 seconds", 15_000, id, 1);
  q = await replayState(run);
  const next = q.assignments.find(([stone]) => stone === id)?.[1];
  assert(next && next !== heard && !q.heard.includes(next));
  assert.equal(q.rounds, 0);
  await prompt(run, "listen", id, ["Listen to the stone", "Pasiklausyti akmens"]);
  await run.mark("stone-rearmed");
}

async function ordinary(run) {
  assert.equal((await run.state()).cave, undefined);
  await inspectPicker(run);
  await trail(run, "cleft", run.phone);
  await crossIn(run, "cleft");
  await run.mark("tide-hall");
  await walk(run, 0.3, -2.5);
  await prompt(run, "talk", "cave_bram", ["Kalbėtis: Bram"]);
  await interact(run);
  await bramTalk(run);
  assert.equal((await run.state()).mask, 1);
  await walk(run, 0, -6);
  await look(run, Math.PI);
  await forward(run, () => run.wait(() => window.__ew.game.player.root.position.z < -11, "walk beyond Bram", 20_000));

  async function visitStone(id, count, mask) {
    const { spot, meaning } = byStone[id];
    await walk(run, ...spot);
    const q = await openRune(run, id);
    await solve(run, q, meaning);
    const state = await run.state();
    assert.equal(state.cave.lit.length, count);
    assert.equal(state.mask, mask);
    assert.equal(state.cave.heart, count === 5);
    await run.mark(`distinct-${count}-${id}`);
  }

  for (const [i, id] of TIDE.entries()) {
    await visitStone(id, i + 1, i === 2 ? 3 : 1);
    await closeRune(run);
  }
  await visitStone("root-2", 4, 7);
  assert.equal((await watch(run)).hearts, 0);
  const beforeReplay = (await calls(run)).length;
  await run.press(run.page.locator(".glyph-play"));
  const rootReplay = await run.until(async () => (await calls(run))[beforeReplay]?.end && (await calls(run))[beforeReplay],
    "the fourth stone can be heard again", { timeout: 5000, frames: 0 });
  assert(rootReplay.result === true && rootReplay.text === byStone["root-2"].meaning[0]);
  assert(run.requests.some((r) => r.key === audioKey("g_coach_m", 1, rootReplay.text)));
  assert.equal((await run.state()).cave.lit.length, 4);
  assert.equal((await watch(run)).hearts, 0);
  await closeRune(run);
  await run.mark("root-garden");
  await walk(run, -6.3, -99.5);
  assert(distance(await run.state(), [-4.62, -100.3]) < 2.9);
  await prompt(run, "talk", "cave_fern", ["Kalbėtis: Fern"]);
  await interact(run);
  await fernTalk(run);
  assert.equal((await run.state()).mask, 15);
  await run.mark("hidden-river");

  await walk(run, -5, -107);
  await walk(run, 3.25, -117.6);
  assert(await run.ev(() => {
    const { game: g, store } = window.__ew, p = g.player.root.position, st = store.getState();
    return g.cave.save.lit.length === 4 && !g.cave.save.heart && !g.cave.save.tree && !g.cave.treeNear(p)
      && g.nearest?.id !== "cave_oak" && !st.conv.active && !g.zone.nav.path(p.x, p.z, 6, -176.8)
      && !g.zone.interior.group.getObjectByName("oak-gold-leaves").visible;
  }), "four distinct stones leave the Oak asleep behind the fourth gate");
  await run.mark("four-stones-oak-asleep");

  await visitStone("river-3", 5, 63);
  assert.equal((await watch(run)).hearts, 1);
  await closeRune(run);
  await surface(run, run.page.locator(".town-toasts .toast").filter({ hasText: "Senasis ąžuolas pabudo!" }),
    ["Senasis ąžuolas pabudo!", "Šviečia penki akmenys. Saloje Jūsų laukia ąžuolas."]);
  await walk(run, 13, -134);
  assert.equal((await run.state()).card.n, 4);
  await surface(run, run.page.locator(".cave-card"), ["Star Hall", "4 / 5"]);
  await run.mark("star-hall");
  await walk(run, 6, -171.5);
  assert.equal((await run.state()).card.n, 5);
  await surface(run, run.page.locator(".cave-card"), ["Oak Heart", "5 / 5"]);
  assert(await run.ev(() => window.__ew.game.zone.interior.group.getObjectByName("oak-gold-leaves").visible));
  await run.mark("oak-heart");
  await look(run, Math.PI);
  await forward(run, () => run.wait(() => window.__ew.store.getState().conv.sitId === "x08-old-oak"
    && window.__ew.store.getState().conv.active, "walking onto the island opens the Oak scene", 40_000));
  await oakTalk(run);
  assert.equal((await watch(run)).toasts["Akmenys vėl prabilo"].length, 1);
  assert.equal((await watch(run)).trees, 1);
  assert.equal((await watch(run)).hearts, 1);
  const before = await replayState(run);
  assert.deepEqual(before.saved, [...TIDE, "root-2", "river-3"]);
  assert.equal(before.relit.length, 0);
  assert.equal(before.heard.length, 5);
  await run.wait(() => {
    const { game: g, store } = window.__ew, at = g.player.root.position, save = store.getState().progress.place;
    return save?.zone === "gruta" && Math.hypot(at.x - save.x, at.z - save.z) < 0.1;
  }, "normal autosave records the position on the island");
  const saved = await run.state();
  await run.enter(true);
  await settled(run, "gruta");
  const restored = await run.state();
  assert(distance(restored, [saved.x, saved.z]) < 0.1);
  assert.deepEqual(restored.cave, saved.cave);
  assert.equal(restored.visits, 1);
  assert.equal(restored.mask, 63);
  assert.equal(restored.talk, null);
  assert.equal((await watch(run)).trees, 0, "restore does not offer the first Oak story again");
  await run.mark("oak-clean-restore");
  await exitVia(run, "cleft", { action: true, timeout: 40_000 });
  assert.equal((await run.state()).course, "s69-local");
}

async function lastOfRound(run) {
  await run.wait(() => window.__ew.game.cave?.pool.size === 215, "the replay pool loads after restore", 60_000);
  const before = await replayState(run);
  assert.equal(before.heard.length, 214);
  assert.equal(before.rounds, 2);
  assert.equal(before.assignments[0][1], "tide_01");
  await completeReplay(run, "tide-1");
  await closeRune(run);
  const after = await replayState(run);
  assert.deepEqual(after.heard, []);
  assert.equal(after.rounds, 3);
  assert.equal(after.saved.length, 15);
  assert.deepEqual(after.book, ["x08-old-oak:tide_01"]);
  assert.equal((await watch(run)).toasts["Išgirdote visas 215 frazių!"].length, 1);
  await run.mark("replay-round");
}

await suite("mh-cave-tree", async (run) => {
  const donorProfile = { gender: "f", lookId: "f1", look: { skin: "#f2d3bd", hair: { style: "long", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } };
  for (const device of [...DEVICES, [375, 812]]) {
    await run(device, "seeded-fifteen", { save: {
      cave: full, profile: donorProfile, seenIntro: { "x08-old-oak": true },
    }, boot: 240_000 }, seeded);
    if (device[0] === 375) continue;
    await run(device, "ordinary-five", { boot: 240_000 }, ordinary);
    await run(device, "last-of-round", { save: {
      cave: { ...full, tree: true, rounds: 2, heard: [...lines.keys()].filter((id) => id !== "tide_01") },
      place: { zone: "gruta", x: -6.4, z: -24.5, rot: -Math.PI / 2 },
    } }, lastOfRound);
  }
});
