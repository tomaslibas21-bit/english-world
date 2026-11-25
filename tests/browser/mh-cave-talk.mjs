// Sightlines from the six donor approach points, plus the light portraits and the actorless Oak.
import assert from "node:assert/strict";
import { BRAM, DEVICES, FERN, OAK, at, conversation, endTalk, fernTalk, heard, interact, prompt, suite, surface, watch } from "./fixtures/mh-cave.mjs";

const iPhone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const spots = [
  ["bram-main-side", BRAM, 0.2, -1.6],
  ["bram-cleft-side", BRAM, 2, -2.2],
  ["bram-across-passage", BRAM, -0.9, -4.6],
  ["bram-gate-side", BRAM, 1.2, -6.6],
  ["fern-bridge-end", FERN, -6.2, -98.6],
  ["fern-beside-seat", FERN, -6.1, -100.6],
];

async function town(run) {
  for (const [i, [name, who, x, z]] of spots.entries()) {
    await at(run, x, z, 0);
    await prompt(run, "talk", who.npc, [`Kalbėtis: ${who.name}`], 15_000);
    const narrow = run.height === 667 && i === 2;
    if (narrow) await run.ev(() => {
      const ch = window.__ew.game.npcs.find((n) => n.id === "cave_bram").ch;
      let sample;
      ch.root.traverse((obj) => { if (!sample && obj.isMesh && obj.geometry.attributes.position) sample = obj; });
      const hidden = sample.clone();
      hidden.name = "hidden-framing-fixture";
      hidden.position.set(0, 18, 0);
      hidden.scale.set(0.02, 3, 0.02);
      hidden.visible = false;
      ch.root.add(hidden);
    });
    await interact(run);
    await conversation(run, who);
    await run.step(36);
    const v = await run.ev((npc) => {
      const g = window.__ew.game, r = g.rig, sp = g.wild.space, who = g.npcs.find((n) => n.id === npc), a = who.ch.root.position;
      const pos = r.cam.position, face = a.clone(), chest = a.clone();
      face.y += (who.sit ? 0.72 : 0.9) * who.ch.height;
      chest.y += (who.sit ? 0.45 : 0.62) * who.ch.height;
      const trueFace = face.clone().setY(g.caveCode.wildPersonY(who, 0.9));
      const trueChest = chest.clone().setY(g.caveCode.wildPersonY(who, 0.62));
      const canvas = g.renderer.domElement.getBoundingClientRect(), panel = document.querySelector(".convo").getBoundingClientRect();
      const px = (q) => {
        const n = q.clone().project(r.cam);
        return [Math.round(canvas.left + (n.x + 1) / 2 * canvas.width), Math.round(canvas.top + (1 - n.y) / 2 * canvas.height), +n.z.toFixed(3)];
      };
      const hidden = who.ch.root.getObjectByName("hidden-framing-fixture");
      return { talking: g.talkNpc?.id, mode: r.mode, inRock: sp.inside(pos), faceClear: sp.free(pos, face),
        chestClear: sp.free(pos, chest), seatedClear: Math.min(sp.free(pos, trueFace), sp.free(pos, trueChest)),
        sit: !!who.sit, visible: who.ch.root.visible, face: px(face), chest: px(chest),
        trueFace: px(trueFace), trueChest: px(trueChest), hidden: hidden && { visible: hidden.visible, point: px(hidden.getWorldPosition(a.clone())) },
        free: innerWidth > 900 ? [0, 0, panel.left, innerHeight] : [0, 0, innerWidth, panel.top],
        camera: [pos.x, pos.y, pos.z].map((n) => +n.toFixed(2)) };
    }, who.npc);
    const inside = ([x, y, z]) => z < 1 && x >= v.free[0] + 6 && x <= v.free[2] - 6 &&
      y >= v.free[1] + 6 && y <= v.free[3] - 6;
    assert(v.talking === who.npc && v.sit === (who === FERN) && v.visible && v.mode === "talk" &&
      !v.inRock && v.faceClear >= 0.999 && v.chestClear >= 0.999 && v.seatedClear >= 0.999, JSON.stringify(v));
    assert([v.face, v.chest, v.trueFace, v.trueChest].every(inside), JSON.stringify(v));
    if (narrow) {
      assert(v.hidden && !v.hidden.visible && !inside(v.hidden.point), JSON.stringify(v));
      await run.ev(() => window.__ew.game.talkNpc.ch.root.getObjectByName("hidden-framing-fixture").removeFromParent());
    }
    await run.mark(name);
    if (i === 4) {
      await fernTalk(run);
      assert((await run.state()).cave.passed.includes("fern"));
      assert.deepEqual((await watch(run)).events, [["cave-pass", "fern"]]);
    } else {
      const pair = i === 0 ? ["Who's there on the path?", "Kas ten ant tako?"] :
        who === BRAM ? ["Back again? Tell me your name.", "Sugrįžote? Kuo Jūs vardu?"] :
          ["Back for a riddle?", "Sugrįžote įminti mįslės?"];
      await heard(run, pair);
      await endTalk(run);
    }
  }
}

async function light(run) {
  for (const who of [BRAM, FERN, OAK]) {
    const pickerCard = run.page.locator(`.lh-card[data-sit="${who.id}"]`);
    await run.visible(pickerCard);
    await run.layout(() => pickerCard.scrollIntoViewIfNeeded());
    await surface(run, pickerCard, [...who.title, "Pasipraktikuoti kalbėtis"]);
    await run.mark(`light-picker-${who.id}`);
    await run.press(pickerCard);
    await conversation(run, who);
    const backdrop = run.page.locator(".lc");
    const role = who === BRAM ? "Tako sargas" : who === FERN ? "Tilto sargė" : "Kalbantis ąžuolas";
    await surface(run, backdrop, [who.name, role, "Skalūnų įlankos ola"]);
    assert.equal(await run.ev(() => window.__ew.store.getState().settings.scenes), false);
    if (who === OAK) {
      const avatar = backdrop.locator(".lc-avatar");
      assert.equal(await avatar.locator("img").count(), 0);
      assert.equal(await backdrop.locator(".lc-face").count(), 0);
      assert.equal((await avatar.innerText()).trim(), "");
      assert(await avatar.locator("svg").isVisible());
      await heard(run, ["Do you know who is speaking?", "Ar žinote, kas kalba?"]);
    } else {
      const pixels = await run.wait(() => {
        const i = document.querySelector(".lc-avatar.lc-face img");
        if (!i?.complete || i.naturalWidth <= 100) return false;
        const c = document.createElement("canvas");
        c.width = c.height = 64;
        const x = c.getContext("2d");
        x.drawImage(i, 0, 0, 64, 64);
        const data = x.getImageData(0, 0, 64, 64).data;
        let drawn = 0;
        for (let k = 3; k < data.length; k += 4) if (data[k] > 200) drawn++;
        return { width: i.naturalWidth, shown: i.getBoundingClientRect().width, drawn };
      }, `drawn light portrait for ${who.name}`, 30_000);
      assert(pixels.shown >= 90 && pixels.drawn > 64 ** 2 * 0.25, JSON.stringify(pixels));
      await heard(run, who === BRAM ? ["Who's there on the path?", "Kas ten ant tako?"] :
        ["Two riddles, then you can cross. Ready?", "Dvi mįslės, ir galėsite pereiti. Pradėsim?"]);
    }
    await run.mark(`light-backdrop-${who.id}`);
    await endTalk(run);
  }
}

await suite("mh-cave-talk", async (run) => {
  for (const device of [...DEVICES, [375, 812], [375, 667]]) {
    const options = { boot: 180_000, ...(device[0] < 900 && { userAgent: iPhone }) };
    await run(device, "3d-sightlines", { ...options, save: { cave: {
      passed: ["bram", "fern"], lit: ["tide-1", "tide-2", "tide-3", "root-2"], seen: true, told: 5,
    } } }, town);
    // The donor's short phone is a 3D framing variant. Its light portrait runs at 375 × 812.
    if (device[1] !== 667) {
      await run(device, "light-fallback", { ...options, save: { settings: { play: "light", scenes: false } } }, light);
    }
  }
});
