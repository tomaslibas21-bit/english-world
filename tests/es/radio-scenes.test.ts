import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { audioKey } from "../../src/audio-key";
import { EDITION } from "../../src/edition";
import { loadValueText } from "../../src/editions/es-lt/tables/loaded";
import { compose, setVariety, variety } from "../../src/convo/compose";
import { overlayFile } from "../../tools/edition-overlay.mjs";
import { NPCS } from "../../src/content/npcs";
import type { RadioScene, SceneInfo } from "../../src/content/radioScenes/types";
import { packScene, unpackScene, type PackedRadioScene } from "../../src/content/radioScenes/pack";
import { learnerTake, learnerVoices } from "../../src/content/radioScenes/voice";
import { SITUATIONS, loadSituation } from "../../src/content/situations/catalog";
import type { SituationDef } from "../../src/content/types";
import { nextSceneRoute, drawScene, type SceneBags } from "../../src/radio/sceneBag";
import { loadScene, loadSceneIndex, playableScenes, routeTurns } from "../../src/radio/scenes";
import { cachedNlu, makeWalker } from "../../tools/convfm/walk";
import { compilePool, discover, POOL_LIMIT, MIN_TURNS, MIN_SECONDS, voiceCounts } from "../../tools/convfm/routes";

const folder = resolve("src/editions/es/generated/convfm");
const read = <T>(name: string): T => JSON.parse(readFileSync(resolve(folder, name + ".json"), "utf8"));
const manifest: Record<string, number> = JSON.parse(readFileSync("public/audio-es/manifest.json", "utf8"));
const readScene = (id: string) => unpackScene(read<PackedRadioScene>(id));
const index = read<SceneInfo[]>("index");
const assets = { base: "/audio-es/", manifest, repairVersions: {} };
const english = EDITION.helper === "en";
const localTitle = <T extends { title: { en: string; lt: string }; titleLt?: string }>(item: T): T =>
  english ? item : { ...item, title: { ...item.title, lt: item.titleLt ?? item.title.lt } };

beforeAll(loadValueText);
afterEach(() => setVariety("default"));

describe("Conversation FM generated pools", () => {
  it("indexes every situation and loads one scene at a time", async () => {
    expect(index.map(({ id }) => id)).toEqual(SITUATIONS.map(({ id }) => id));
    expect(await loadSceneIndex()).toEqual(index.map(localTitle));
    expect(playableScenes.map(({ id }) => id)).toEqual(index.filter((s) => s.poolSize > 0).map(({ id }) => id));
    expect(await loadScene("missing-scene")).toBeNull();
    expect(await loadScene("index")).toBeNull();
    for (const scene of index) {
      expect(await loadScene(scene.id)).toEqual(localTitle(readScene(scene.id)));
      expect(localTitle(scene).title).toEqual(SITUATIONS.find(({ id }) => id === scene.id)!.title);
      expect(scene.poolSize).toBeLessThanOrEqual(POOL_LIMIT);
    }
  });

  it.each(index)("$id resolves every route with the per-line voice rule", (info) => {
    const scene = readScene(info.id);
    expect(scene.routes.length).toBe(info.poolSize);
    expect(scene.routePaths.length).toBe(scene.routes.length);
    const distinct = new Set<string>();
    const lengths: number[] = [];
    const seconds: number[] = [];
    for (const [id, route] of scene.routes.entries()) {
      const resolved = routeTurns(scene, id, { assets });
      expect(resolved, info.id + "/" + id).not.toBeNull();
      expect(resolved!.length).toBe(route.length);
      expect(route[0]).toBeGreaterThanOrEqual(0);
      expect(resolved![0].speaker).not.toBe("learner");
      expect(resolved!.at(-1)!.speaker).not.toBe("learner");
      const signature = JSON.stringify(resolved!.map((turn) => [turn.speaker, turn.text, turn.voice]));
      expect(distinct.has(signature)).toBe(false);
      distinct.add(signature);
      for (const [i, take] of resolved!.entries()) {
        const source = scene.turns[route[i]];
        expect(source.text.trim()).toBeTruthy();
        expect(source.translation.trim()).toBeTruthy();
        expect(source.translation).not.toMatch(/[{}]/);
        expect(source.translationLt?.trim()).toBeTruthy();
        expect(source.translationLt).not.toMatch(/[{}]/);
        expect(take.translation).toBe(english ? source.translation : source.translationLt);
        expect(take.clipKey).toBe(audioKey(take.voice, source.speed, source.text));
        expect(take.duration).toBe(manifest[take.clipKey]);
        expect(take.duration).toBeGreaterThan(0);
        if ("to" in source) {
          const expected = NPCS[source.to].gender === "f" ? "es_coach_m" : "es_coach_f";
          const fallback = expected === "es_coach_m" ? "es_coach_f" : "es_coach_m";
          const preferredKey = audioKey(expected, source.speed, source.text);
          expect(take.voice).toBe(manifest[preferredKey] ? expected : fallback);
        } else expect(take.voice).toBe(`es_${source.speaker}`);
      }
      lengths.push(route.length);
      seconds.push(Math.round(resolved!.reduce((sum, turn) => sum + turn.duration, 0) * 100) / 100);
    }
    expect(info.minTurns).toBe(lengths.length ? Math.min(...lengths) : 0);
    expect(info.maxTurns).toBe(lengths.length ? Math.max(...lengths) : 0);
    expect(info.minSeconds).toBe(seconds.length ? Math.min(...seconds) : 0);
    expect(info.maxSeconds).toBe(seconds.length ? Math.max(...seconds) : 0);
    let saved: unknown;
    const drawn = new Set<number>();
    for (const _ of scene.routes) {
      const next = nextSceneRoute(scene, saved, () => 0.4)!;
      expect(drawn.has(next.routeId)).toBe(false);
      drawn.add(next.routeId);
      saved = next.bag;
    }
  });

  it.each(index)("$id preserves the engine's repeated slot bindings, branches and endings", async (info) => {
    const scene = readScene(info.id);
    const sit = (await loadSituation(info.id))!;
    const walker = makeWalker(sit, manifest, cachedNlu(sit));
    const runs = scene.paths.map((path) => walker.run(path.context, path.replies));
    expect(!!scene.shortHappyPath).toBe(!!info.shortHappyPath);
    if (scene.shortHappyPath) {
      const happy = walker.run(scene.shortHappyPath.context, scene.shortHappyPath.replies);
      expect(happy.complete && happy.conv.completed).toBe(true);
      const seconds = happy.cues.reduce((sum, cue) => sum +
        ("options" in cue ? Math.min(...cue.options.map((turn) => turn.duration)) : cue.duration), 0);
      expect(happy.cues.length < MIN_TURNS || Math.round(seconds * 100) / 100 < MIN_SECONDS).toBe(true);
    }
    for (const [id, route] of scene.routes.entries()) {
      const run = runs[scene.routePaths[id]];
      expect(run, info.id + "/" + id).toBeDefined();
      expect(run.complete).toBe(true);
      expect(run.conv.completed).toBe(true);
      if (!scene.shortHappyPath) {
        expect(route.length).toBeGreaterThanOrEqual(MIN_TURNS);
        const seconds = routeTurns(scene, id, { assets })!.reduce((sum, turn) => sum + turn.duration, 0);
        expect(Math.round(seconds * 100) / 100).toBeGreaterThanOrEqual(MIN_SECONDS);
      }
      expect(route.length).toBe(run.cues.length);
      for (const [i, cue] of run.cues.entries()) {
        const source = scene.turns[route[i]];
        const { translationLt, ...original } = source;
        const turn = english ? source : { ...original, translation: translationLt! };
        if ("options" in cue) {
          if (cue.reuse !== undefined) {
            expect(source).toEqual(scene.turns[route[cue.reuse]]);
          } else {
            // Every option was composed with the SAME vars actually passed by this engine run.
            // A drink, time, name or room can only change when its authored handler changes it.
            expect(cue.options).toContainEqual(turn);
          }
        } else expect(turn).toEqual(cue.turn);
      }
    }
  }, 120_000);
});

describe("scene voice selection and URL resolution", () => {
  const text = "Un ejemplo grabado.";
  const m = audioKey("es_coach_m", 1, text);
  const f = audioKey("es_coach_f", 1, text);
  it("chooses Mexican coaches independently of the global variety, with per-line fallback", () => {
    setVariety("spain");
    expect(learnerVoices("mia")).toEqual(["es_coach_m", "es_coach_f"]);
    expect(learnerVoices("chuck")).toEqual(["es_coach_f", "es_coach_m"]);
    expect(learnerTake("mia", 1, text, { [m]: 1, [f]: 2 })?.voice).toBe("es_coach_m");
    expect(learnerTake("mia", 1, text, { [f]: 2 })?.voice).toBe("es_coach_f");
    expect(learnerTake("chuck", 1, text, { [m]: 1 })?.voice).toBe("es_coach_m");
    expect(learnerTake("mia", 1, text, {})).toBeNull();
    expect(learnerTake("missing", 1, text, { [m]: 1 })).toBeNull();
    expect(variety()).toBe("spain");
  });

  it("uses the files token and repair version and accepts a visitor voice policy", () => {
    const turn = { speaker: "learner" as const, to: "mia", text, translation: "A recorded example.", translationLt: "Įrašytas pavyzdys.", speed: 1 };
    const scene: RadioScene = { id: "test", place: "sunny-cup", title: { en: "Test", lt: "Bandymas" },
      version: "v1", turns: [turn], routes: [[0]], paths: [], routePaths: [] };
    const clipKey = audioKey("visitor", 1, text);
    const result = routeTurns(scene, 0, {
      learnerVoice: () => ["visitor"],
      assets: { base: "/files/", manifest: { [clipKey]: 2.5 }, repairVersions: { [clipKey]: "abcdef1234567890" }, token: "a& b" },
    });
    expect(result?.[0].url).toBe(`/files/${clipKey}.mp3?v=abcdef123456&t=a%26%20b`);
    expect(routeTurns(scene, 0, { assets })).toBeNull();
    expect(routeTurns(scene, -1, { assets })).toBeNull();
    expect(routeTurns(scene, 0.5, { assets })).toBeNull();
    expect(routeTurns({ ...scene, turns: [{ ...turn, translation: "" }] }, 0, {
      assets: { ...assets, manifest: { [m]: 1 } },
    })).toBeNull();
  });
});

describe("scene shuffled bags", () => {
  const scene: RadioScene = { id: "test", place: "test", title: { en: "Test", lt: "Bandymas" }, version: "version-a",
    turns: [], routes: Array.from({ length: 8 }, () => [0]), paths: [], routePaths: [] };
  it("uses every route before repeating and continues the same order after a JSON reload", () => {
    let progress: SceneBags = {};
    const seen: number[] = [];
    for (let i = 0; i < scene.routes.length; i++) {
      const draw = drawScene(scene, JSON.parse(JSON.stringify(progress)), () => 0.4)!;
      seen.push(draw.routeId);
      progress = draw.progress;
    }
    expect(new Set(seen).size).toBe(scene.routes.length);
    expect(progress["scene/test"]?.position).toBe(8);
    const next = drawScene(scene, progress, () => 0.4)!;
    expect(next.routeId).not.toBe(seen.at(-1));
    expect(next.progress["scene/test"]?.position).toBe(1);
    expect(progress["scene/test"]?.position).toBe(8);
    expect(next.progress["scene/test"]?.order).not.toBe(progress["scene/test"]?.order);
  });

  it("keeps a saved bag without shuffling during a reload", () => {
    const first = nextSceneRoute(scene, undefined, () => 0.25)!;
    const random = vi.fn(() => 0.9);
    const resumed = nextSceneRoute(scene, JSON.parse(JSON.stringify(first.bag)), random)!;
    expect(resumed.routeId).toBe(first.bag.order[1]);
    expect(random).not.toHaveBeenCalled();
  });

  it("recovers from corrupt or outdated bags, pool changes and empty pools", () => {
    for (const bad of [
      null, {}, { version: scene.version, order: [0, 0], position: 0 },
      { version: scene.version, order: [0, 1, 2, 3, 4, 5, 6, 7], position: -1 },
      { version: "old", order: [0, 1, 2, 3, 4, 5, 6, 7], position: 0 },
    ]) expect(nextSceneRoute(scene, bad, () => 0)?.bag.position).toBe(1);
    const previous = nextSceneRoute(scene, undefined, () => 0)!;
    const changed = { ...scene, routes: [[0]] };
    expect(nextSceneRoute(changed, previous.bag)?.routeId).toBe(0);
    expect(nextSceneRoute({ ...scene, routes: [] })).toBeNull();
  });
});

describe("route generation", () => {
  it.runIf(english)("keeps all small combinations of NPC variants, learner wording and slot items", async () => {
    const original = (await loadSituation("s72-cafe"))!;
    const drinks = original.entities!.drink.filter(({ id }) => id === "latte" || id === "tea");
    const hint = original.hints.order_drink;
    const sit: SituationDef = {
      ...original, sims: [],
      entities: { drink: drinks },
      grammar: undefined,
      intents: { order: { patterns: ["(quisiera | quiero) [un | una] {drink} por favor"] } },
      lines: { open: original.lines.greet_order.slice(0, 2), end: original.lines.food_menu },
      hints: { order: { ...hint, items: [hint.items[0], hint.items[2]] } },
      steps: [{ id: "order", done: () => false, ask: () => {}, expects: ["order"], hints: ["order"] }],
      start: (c) => { c.say("open"); c.hold(); },
      handlers: { order: (c) => { c.say("end"); c.complete(); c.end(); } },
    };
    const clips: Record<string, number> = {};
    const opts = { look: (id: string) => drinks.find((drink) => drink.id === id), variety: "default" as const };
    for (const src of [...sit.lines.open, ...sit.lines.end]) {
      clips[audioKey("es_mia", NPCS.mia.speed ?? 1, compose(src, {}, opts).say)] = 1;
    }
    const replies = sit.hints.order.items.flatMap(({ s }) => drinks.map(({ id }) => compose(s, { X: id }, opts).say));
    expect(replies).toHaveLength(4);
    for (const reply of replies) clips[audioKey("es_coach_m", 1, reply)] = 1;
    const generate = (def: SituationDef, takes: typeof clips) => compilePool(def, discover(def, takes), takes).scene;
    const generated = generate(sit, clips);
    expect(generated.routes).toHaveLength(16);
    expect(generate(sit, clips)).toEqual(generated);
    const missing = { ...clips };
    delete missing[audioKey("es_coach_m", 1, replies[0])];
    expect(generate(sit, missing).routes).toHaveLength(12);
    const untranslated = {
      ...sit, hints: { order: { ...sit.hints.order, items: sit.hints.order.items.map((item, i) =>
        i ? item : { ...item, s: { ...item.s, nat: "An English source with no Lithuanian table entry." } }) } },
    };
    const discovery = discover(untranslated, clips);
    expect([...discovery.diagnostics]).toContain(`Missing SM (Lithuanian) sentence: ${hint.items[0].s.en}`);
    expect(compilePool(untranslated, discovery, clips).scene.routes).toHaveLength(8);
    const abandoned = { ...sit, handlers: { order: (c) => { c.say("end"); c.end(); } } } satisfies SituationDef;
    expect(generate(abandoned, clips).routes).toHaveLength(0);
  });

  it.runIf(english)("replays Mexican variants while Spain is selected globally", async () => {
    const scene = readScene("s76-dentist-call");
    const sit = (await loadSituation(scene.id))!;
    const walker = makeWalker(sit, manifest);
    expect(scene.paths.length).toBeGreaterThan(0);
    const replay = () => scene.paths.map((path) => walker.run(path.context, path.replies).cues);
    setVariety("spain");
    const mexico = replay();
    expect(variety()).toBe("spain");
    setVariety("default");
    expect(replay()).toEqual(mexico);
  });

  it("round-trips shared cast speeds and the short-path proof", () => {
    const scene = readScene("x14-cenote");
    expect(unpackScene(packScene(scene))).toEqual(scene);
    const custom: RadioScene = {
      id: "speed", place: "test", title: { en: "Speed", lt: "Greitis" }, version: "v",
      turns: [{ speaker: "chuck", voice: "es_chuck", speed: 1.18, text: "Hello.", translation: "Labas.", clipKey: "clip", duration: 1 }],
      routes: [[0]], paths: [], routePaths: [],
    };
    expect(unpackScene(packScene(custom))).toEqual(custom);
  });

  it("counts occurrences and independent per-line fallbacks", () => {
    const scene: RadioScene = {
      id: "voices", place: "test", title: { en: "Voices", lt: "Balsai" }, version: "v",
      turns: [
        { speaker: "learner", to: "mia", speed: 1, text: "Tea, please.", translation: "Arbatos, prašau." },
        { speaker: "learner", to: "chuck", speed: 1, text: "Thank you.", translation: "Ačiū." },
      ], routes: [[0, 1], [1, 0, 1]], paths: [], routePaths: [],
    };
    const clips = {
      [audioKey("es_coach_m", 1, "Tea, please.")]: 1,
      [audioKey("es_coach_m", 1, "Thank you.")]: 1,
    };
    expect(voiceCounts(scene, clips)).toEqual({ opposite: 2, fallback: 3 });
  });

  it("keeps all scene JSON outside the town's static import graph", () => {
    const visited = new Set<string>();
    const visit = (file: string) => {
      if (visited.has(file)) return;
      visited.add(file);
      expect(file).not.toMatch(/generated\/convfm\/.+\.json$/);
      const source = readFileSync(file, "utf8");
      const imports = /\b(?:import|export)\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\*|[A-Za-z_$][\w$]*(?:\s*,\s*\{[^}]*\})?)\s+from\s*["']([^"']+)["']|\bimport\s*["']([^"']+)["']/g;
      for (const match of source.matchAll(imports)) {
        const specifier = match[1] ?? match[2];
        if (!specifier.startsWith(".") && !specifier.startsWith("@/")) continue;
        const path = specifier.startsWith("@/") ? resolve("src", specifier.slice(2)) : resolve(dirname(file), specifier);
        const target = [path, path + ".ts", path + ".tsx", path + ".json", resolve(path, "index.ts")].find((p) => existsSync(p) && /\.(?:tsx?|json)$/.test(p));
        const over = target && (overlayFile(target, "es", file, english ? "" : "lt") ?? target);
        if (over?.endsWith(".json")) expect(over).not.toContain("/generated/convfm/");
        else if (over) visit(over);
      }
    };
    visit(resolve("src/main.tsx"));
    const resolver = readFileSync("src/editions/es/content/radioScenes/data.ts", "utf8");
    expect(resolver).toContain("import.meta.glob");
    expect(resolver).not.toMatch(/eager\s*:\s*true/);
    expect(readdirSync(folder).filter((file) => file.endsWith(".json")).length).toBe(index.length + 1);
  });
});
