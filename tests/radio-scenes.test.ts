import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { audioKey } from "../src/audio-key";
import { NPCS } from "../src/content/npcs";
import type { RadioScene, SceneInfo } from "../src/content/radioScenes/types";
import { packScene, unpackScene, type PackedRadioScene } from "../src/content/radioScenes/pack";
import { learnerTake, learnerVoices } from "../src/content/radioScenes/voice";
import { SITUATIONS, loadSituation } from "../src/content/situations/catalog";
import type { SituationDef } from "../src/content/types";
import { nextSceneRoute, drawScene, type SceneBags } from "../src/radio/sceneBag";
import { loadScene, loadSceneIndex, routeTurns } from "../src/radio/scenes";
import { cachedNlu, makeWalker } from "../tools/convfm/walk";
import { compilePool, discover, POOL_LIMIT, MIN_TURNS, MIN_SECONDS, voiceCounts } from "../tools/convfm/routes";

const folder = resolve("src/generated/convfm");
const read = <T>(name: string): T => JSON.parse(readFileSync(resolve(folder, name + ".json"), "utf8"));
const manifest: Record<string, number> = JSON.parse(readFileSync("public/audio-v2/manifest.json", "utf8"));
const readScene = (id: string) => unpackScene(read<PackedRadioScene>(id));
const index = read<SceneInfo[]>("index");
const assets = { base: "/audio-v2/", manifest, repairVersions: {} };

describe("Conversation FM generated pools", () => {
  it("indexes every situation and loads one scene at a time", async () => {
    expect(index.map(({ id }) => id)).toEqual(SITUATIONS.map(({ id }) => id));
    expect(await loadSceneIndex()).toEqual(index);
    expect(await loadScene("missing-scene")).toBeNull();
    for (const scene of index) {
      expect(await loadScene(scene.id)).toEqual(readScene(scene.id));
      expect(scene.title).toEqual(SITUATIONS.find(({ id }) => id === scene.id)!.title);
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
        expect(take.clipKey).toBe(audioKey(take.voice, source.speed, source.text));
        expect(take.duration).toBe(manifest[take.clipKey]);
        expect(take.duration).toBeGreaterThan(0);
        if ("to" in source) {
          const expected = NPCS[source.to].gender === "f" ? "g_coach_m" : "g_coach_f";
          const fallback = expected === "g_coach_m" ? "g_coach_f" : "g_coach_m";
          const preferredKey = audioKey(expected, source.speed, source.text);
          expect(take.voice).toBe(manifest[preferredKey] ? expected : fallback);
        }
      }
      lengths.push(route.length);
      seconds.push(Math.round(resolved!.reduce((sum, turn) => sum + turn.duration, 0) * 100) / 100);
    }
    expect(info.minTurns).toBe(lengths.length ? Math.min(...lengths) : 0);
    expect(info.maxTurns).toBe(lengths.length ? Math.max(...lengths) : 0);
    expect(info.minSeconds).toBe(seconds.length ? Math.min(...seconds) : 0);
    expect(info.maxSeconds).toBe(seconds.length ? Math.max(...seconds) : 0);
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
        const turn = scene.turns[route[i]];
        if ("options" in cue) {
          if (cue.reuse !== undefined) {
            expect(turn).toEqual(scene.turns[route[cue.reuse]]);
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
  const text = "A recorded example.";
  const m = audioKey("g_coach_m", 1, text);
  const f = audioKey("g_coach_f", 1, text);
  it("chooses the opposite-sex coach and falls back independently for each line", () => {
    expect(learnerVoices("mia")).toEqual(["g_coach_m", "g_coach_f"]);
    expect(learnerVoices("earl")).toEqual(["g_coach_f", "g_coach_m"]);
    expect(learnerTake("mia", 1, text, { [m]: 1, [f]: 2 })?.voice).toBe("g_coach_m");
    expect(learnerTake("mia", 1, text, { [f]: 2 })?.voice).toBe("g_coach_f");
    expect(learnerTake("earl", 1, text, { [m]: 1 })?.voice).toBe("g_coach_m");
    expect(learnerTake("mia", 1, text, {})).toBeNull();
    expect(learnerTake("missing", 1, text, { [m]: 1 })).toBeNull();
  });

  it("uses the files token and repair version and accepts a visitor voice policy", () => {
    const turn = { speaker: "learner" as const, to: "mia", text, translation: "Įrašytas pavyzdys.", speed: 1 };
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
  it("keeps all small combinations of recorded NPC variants, examples and slot items", () => {
    const t = (en: string, lt: string) => ({ en, lt, nat: lt });
    const sit: SituationDef = {
      id: "fixture", song: "", songTitle: "", title: { en: "Test", lt: "Bandymas" },
      topic: { en: "Test", lt: "Bandymas" }, chapter: 1, order: 1, location: "sunny-cup", npc: "mia", goal: "",
      entities: { drink: [
        { id: "tea", en: "tea", lt: "arbata/arbatos/arbatai/arbatą/arbata/arbatoje", art: "", g: "f" },
        { id: "coffee", en: "coffee", lt: "kava/kavos/kavai/kavą/kava/kavoje", art: "", g: "f" },
      ] },
      intents: { order: { patterns: ["i would like {drink}", "{drink} please"] } },
      hints: { order: { lt: "Pasirinkti", slot: "drink", items: [
        { id: "like", s: { en: "I'd like | {X}.", lt: "Norėčiau | {X:gen}.", nat: "Norėčiau {X:gen}." } },
        { id: "please", s: { en: "{X}, | please.", lt: "{X:acc}, | prašau.", nat: "{X:acc}, prašau." } },
      ] } },
      lines: { open: [t("Hello!", "Sveiki!"), { ...t("Welcome!", "Sveiki atvykę!"), say: "Welcome back!" }],
        end: [t("Enjoy!", "Skanaus!"), t("Thanks!", "Ačiū!")] },
      steps: [{ id: "order", done: () => false, ask: () => {}, expects: ["order"], hints: ["order"] }],
      start: (c) => { c.say("open"); c.hold(); },
      handlers: { order: (c) => { c.say("end"); c.complete(); c.end(); } },
    };
    const clips: Record<string, number> = {};
    for (const text of ["Hello!", "Welcome back!", "Enjoy!", "Thanks!"]) clips[audioKey("g_mia", 1, text)] = 1;
    for (const text of ["I'd like tea.", "I'd like coffee.", "Tea, please.", "Coffee, please."]) clips[audioKey("g_coach_m", 1, text)] = 1;
    const generated = compilePool(sit, discover(sit, clips), clips).scene;
    expect(generated.routes.length).toBe(16);
    expect(generated.turns.some((turn) => turn.text === "Welcome back!")).toBe(true);
    expect(compilePool(sit, discover(sit, clips), clips).scene).toEqual(generated);
    const missing = { ...clips };
    delete missing[audioKey("g_coach_m", 1, "I'd like tea.")];
    expect(compilePool(sit, discover(sit, missing), missing).scene.routes.length).toBe(12);
    const abandoned: SituationDef = {
      ...sit, handlers: { order: (c) => { c.say("end"); c.end(); } },
    };
    expect(compilePool(abandoned, discover(abandoned, clips), clips).scene.routes).toHaveLength(0);
  }, 30_000);

  it("keeps total generated JSON within the one-megabyte budget", () => {
    const bytes = readdirSync(folder).filter((file) => file.endsWith(".json"))
      .reduce((sum, file) => sum + readFileSync(resolve(folder, file)).byteLength, 0);
    expect(bytes).toBeLessThanOrEqual(1_000_000);
  });

  it("round-trips shared cast speeds and the short-path proof", () => {
    const scene = readScene("x03-ask-the-way");
    expect(unpackScene(packScene(scene))).toEqual(scene);
    const custom: RadioScene = {
      id: "speed", place: "test", title: { en: "Speed", lt: "Greitis" }, version: "v",
      turns: [{ speaker: "chuck", voice: "g_chuck", speed: 1.18, text: "Hello.", translation: "Labas.", clipKey: "clip", duration: 1 }],
      routes: [[0]], paths: [], routePaths: [],
    };
    expect(unpackScene(packScene(custom))).toEqual(custom);
  });

  it("counts occurrences and independent per-line fallbacks", () => {
    const scene: RadioScene = {
      id: "voices", place: "test", title: { en: "Voices", lt: "Balsai" }, version: "v",
      turns: [
        { speaker: "learner", to: "mia", speed: 1, text: "Tea, please.", translation: "Arbatos, prašau." },
        { speaker: "learner", to: "earl", speed: 1, text: "Thank you.", translation: "Ačiū." },
      ], routes: [[0, 1], [1, 0, 1]], paths: [], routePaths: [],
    };
    const clips = {
      [audioKey("g_coach_m", 1, "Tea, please.")]: 1,
      [audioKey("g_coach_m", 1, "Thank you.")]: 1,
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
        if (!specifier.startsWith(".")) continue;
        const path = resolve(dirname(file), specifier);
        const target = [path, path + ".ts", path + ".tsx", path + ".json", resolve(path, "index.ts")].find((p) => existsSync(p) && /\.(?:tsx?|json)$/.test(p));
        if (target?.endsWith(".json")) expect(target).not.toContain("/generated/convfm/");
        else if (target) visit(target);
      }
    };
    visit(resolve("src/main.tsx"));
    const resolver = readFileSync("src/radio/scenes.ts", "utf8");
    expect(resolver).toContain("import.meta.glob");
    expect(resolver).not.toMatch(/eager\s*:\s*true/);
    expect(readdirSync(folder).filter((file) => file.endsWith(".json")).length).toBe(index.length + 1);
  });
});
