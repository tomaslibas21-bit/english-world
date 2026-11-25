import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { compareLayers } from "./talk-natural.mjs";

async function workspace(t) {
  const parent = await mkdtemp(path.join(tmpdir(), "pc-talk-parity-"));
  t.after(() => rm(parent, { recursive: true, force: true }));
  return parent;
}

async function saved(parent, layer, { pair = "test-run", candidate = "same-build", film = true, empty = false,
  localPass = !empty, intendedCue = { family: "point", side: -1 }, voice = "es_queta" } = {}) {
  const out = await mkdtemp(path.join(parent, `${layer}-`));
  const rows = empty ? [] : Array.from({ length: 16 }, (_, i) => ({
    id: `route-${i % 8}`, size: i < 8 ? "390x844" : "1280x800", input: i < 8 ? "touch" : "keyboard/mouse",
    layer, pass: true, seed: 19, identity: { lang: layer, targetLanguages: ["es"] },
    ui: [[layer, layer === "en" ? "Turn left" : "Pasukite kairėn"]],
    utterances: [{ actor: "queta", line: "aw_post_1", text: "Dé vuelta a la izquierda.",
      voice, speed: 1, key: "example", intendedCue }],
    peaks: [],
  }));
  const file = path.join(out, "results.json");
  await writeFile(file, JSON.stringify({ out, layer, pair, film, revision: "test-revision", candidate,
    finished: new Date().toISOString(), pass: localPass, inventoryComplete: !empty, rows }));
  return file;
}

test("a completed first layer can wait and the peer closes the serialized pair", async (t) => {
  const parent = await workspace(t);
  const en = await saved(parent, "en", { intendedCue: { family: "point", side: -1, anchor: undefined } });
  const first = await compareLayers(en, parent);
  assert.equal(first.status, "awaiting matching learner invocation");
  assert.equal(first.signOff, false);
  await assert.rejects(readFile(first.pairedFile), { code: "ENOENT" });

  const second = await compareLayers(await saved(parent, "lt"), parent);
  assert.equal(second.status, "pass");
  assert.equal(second.signOff, true);
  const evidence = await readFile(second.pairedFile, "utf8");
  assert.equal(JSON.parse(evidence).rows.length, 16);

  const zero = await saved(parent, "lt", { empty: true });
  assert.equal((await compareLayers(zero, parent)).status, "incomplete");
  assert.equal((await compareLayers(await saved(parent, "lt"), parent)).status, "fail");
  assert.equal(await readFile(second.pairedFile, "utf8"), evidence);

  for (const options of [{ pair: "another-run" }, { film: false }]) {
    const isolated = await compareLayers(await saved(parent, "lt", options), parent);
    assert.equal(isolated.status, first.status);
    assert.equal(isolated.signOff, false);
  }
});

test("a different candidate cannot complete a pair", async (t) => {
  const parent = await workspace(t);
  await compareLayers(await saved(parent, "lt"), parent);
  const mismatch = await compareLayers(await saved(parent, "en", { candidate: "other-build" }), parent);
  assert.equal(mismatch.status, "fail");
  assert.equal(mismatch.signOff, false);
  await assert.rejects(readFile(mismatch.pairedFile), { code: "ENOENT" });
});

test("matching core rows cannot sign off a failed local run", async (t) => {
  const parent = await workspace(t);
  await compareLayers(await saved(parent, "en", { localPass: false }), parent);
  const second = await compareLayers(await saved(parent, "lt"), parent);
  assert.equal(second.status, "pass");
  assert.equal(second.signOff, false);
});

for (const [name, options] of [
  ["side", { intendedCue: { family: "point", side: 1 } }],
  ["side type", { intendedCue: { family: "point", side: "-1" } }],
  ["anchor", { intendedCue: { family: "point", side: -1, anchor: "map" } }],
  ["voice", { voice: "es_tona" }],
]) {
  test(`a changed ${name} fails parity`, async (t) => {
    const parent = await workspace(t);
    await compareLayers(await saved(parent, "lt"), parent);
    const changed = await compareLayers(await saved(parent, "en", options), parent);
    assert.equal(changed.status, "fail");
    assert.equal(changed.signOff, false);
    assert.match(changed.rows[0].issues[0], /authored Spanish, voice keys and mounted roles/);
  });
}
