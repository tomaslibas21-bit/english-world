import { projectBoards } from "./board-projection";
import { BoxGeometry, Color, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, PerspectiveCamera, Vector3, type Object3D } from "three";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { audioKey } from "../src/audio-key";
import { ROAD_EDITION } from "../src/content/road";
import { audioDir, coachVoice } from "../src/content/voices";
import { RoadView } from "../src/game/road/view";
import { carModelEntry } from "../src/game/world/carModels";
import { exitToTown } from "../src/game/world/roadExit";
import { RoadChase } from "../src/game/road/chase";
import { RoadWordForms } from "../src/game/road/wordForms";
import { leavingByRoad, walkEdge } from "../src/game/road/entry";
import { Gate } from "../src/game/road/gates";
import { ghostAt, GhostRecorder, readBest, saveBest } from "../src/game/road/ghost";
import { DRIVE_SECONDS, FIRST_GATE, nextGate, RunScore } from "../src/game/road/run";
import { RoadCar } from "../src/game/road/steering";
import { PIECE_LENGTH, Track, course, laneAt, laneOffset, point } from "../src/game/road/track";
import { buildPool, distractors, loadPool, makeGap, makePicker, starterIds, wordSources, type Prompt, type Word } from "../src/game/road/words";
import { CAR, Motion } from "../src/game/rides/drive";
import type { Ride } from "../src/game/rides/Rides";
import { WORLD } from "../src/game/world/layout";
import { loadSituation } from "../src/content/situations/catalog";
import { emptyProgress, sitProgress } from "../src/state/progress";
import { addCards } from "../src/state/cards";

const manifest = JSON.parse(readFileSync(new URL(`../public/${audioDir()}manifest.json`, import.meta.url), "utf8")) as Record<string, number>;
const has = (voice: string, speed: number, say: string) => !!manifest[audioKey(voice, speed, say)];

describe("road words", () => {
  it("uses voiced short items from the first three picker conversations when progress is empty", async () => {
    const progress = emptyProgress();
    expect(wordSources(progress)).toEqual({ finished: [], ids: starterIds });
    expect(starterIds).toEqual(["s65a-passport", "s65b-baggage", "s66-taxi"]);
    const pool = await loadPool(progress, [], has);
    expect(pool.words.length).toBeGreaterThan(3);
    expect(pool.gaps).toHaveLength(0);
    const pick = makePicker(pool, () => 0.43);
    for (let i = 0; i < 24; i++) {
      const prompt = pick(i)!;
      expect(starterIds).toContain(prompt.word.situation);
      const { voice, speed, say } = prompt.word.clip;
      expect(has(voice, speed, say)).toBe(true);
      expect(prompt.word.en.split(/\s+/).length).toBeLessThanOrEqual(2);
      expect(prompt.word.inContext).toBe(false);
      expect(new Set(prompt.options.map((option) => option.toLowerCase())).size).toBe(3);
      expect(prompt.options[prompt.right]).toBe(prompt.word.lt);
    }
  });

  it("prioritizes voiced learner cards and leaves unfinished sources and missing clips out", async () => {
    const p = emptyProgress(), [first, second] = starterIds;
    p.sits[first] = { ...sitProgress(p, first), completions: 1 };
    const cards = addCards([], [
      { en: "Thank you", lt: "Ačiū", sentence: { en: "Thank you.", lt: "Ačiū." }, situationId: first },
      { en: "Pleasure", lt: "Poilsiui", sentence: { en: "Pleasure.", lt: "Poilsiui." }, situationId: second },
      { en: "Zebraverse", lt: "Zebraverse", sentence: { en: "Zebraverse", lt: "Zebraverse" }, situationId: first },
    ], 0).cards;
    expect(wordSources(p)).toEqual({ finished: [first], ids: [first] });
    const pool = await loadPool(p, cards, has);
    expect(pool.words.every((w) => w.situation === first && w.en !== "Zebraverse")).toBe(true);
    expect(makePicker(pool, () => 0.1)(0)?.word).toMatchObject({ en: "Thank you", saved: true });
    expect(buildPool([await loadSituation(first)].filter((s) => s !== null), p, cards, () => false)).toEqual({ words: [], gaps: [] });
  });

  it("borrows same-kind labels without clips when the learner's voiced pool is small", async () => {
    const p = emptyProgress(), taxi = starterIds[2];
    p.sits[taxi] = { ...sitProgress(p, taxi), completions: 1 };
    const cards = addCards([], [
      { en: "Awesome", lt: "Puiku", sentence: { en: "Awesome!", lt: "Puiku!" }, situationId: taxi },
      { en: "Leather", lt: "odinis", sentence: { en: "Leather.", lt: "Odinis." }, situationId: taxi },
    ], 0).cards;
    const pool = await loadPool(p, cards, (_voice, _speed, say) => say === "Awesome!" || say === "Leather.");
    expect(pool.words.every(({ situation }) => situation === taxi)).toBe(true);
    const answer = pool.words.find(({ en }) => en === "Awesome")!;
    expect(answer.kind?.role).toBe("social");
    expect(distractors(answer, pool.words, false)).toEqual([]);
    expect(makePicker({ words: [answer], gaps: [] }, () => 0)(0)).toBeUndefined();

    const prompt = makePicker(pool, () => 0)(0)!;
    expect(prompt.word).toMatchObject({ en: "Awesome", lt: "puiku", situation: taxi, clip: { say: "Awesome!" } });
    expect(prompt.options).toHaveLength(3);
    expect(prompt.options[prompt.right]).toBe("puiku");
    for (const label of prompt.options.filter((_, i) => i !== prompt.right)) {
      const borrowed = pool.borrowed?.find(({ hearLt, kind }) => hearLt?.toLowerCase() === label && kind?.role === "social");
      expect(borrowed).toBeDefined();
      expect(borrowed).not.toHaveProperty("clip");
      expect(label).toBe(label.toLocaleLowerCase("lt"));
    }

    const phrase = { ...answer, en: "No problem", lt: "Nieko tokio", hearLt: "Nieko tokio" };
    const phrases = makePicker({ words: [phrase], gaps: [], borrowed: [
      { en: "You're welcome", lt: "Prašom" }, { en: "Welcome back", lt: "Sveiki sugrįžę", hearLt: "sveiki sugrįžę" },
    ] }, () => 0);
    expect(phrases(0)?.options).toEqual(expect.arrayContaining(["Nieko tokio", "prašom", "Sveiki sugrįžę"]));
  });

  it("uses gaps from gate eight with a gloss in place, one English answer and the original recording", async () => {
    const p = emptyProgress(), [first] = starterIds;
    p.sits[first] = { ...sitProgress(p, first), completions: 1 };
    const pool = await loadPool(p, [], has);
    const pick = makePicker(pool, () => 0.31);
    expect(pick(6)?.gap).toBeUndefined();
    const prompt = pick(7)!;
    const gap = prompt.gap!;
    expect(gap).toBeDefined();
    const index = gap.sentence.units.findIndex(({ en }) => en.startsWith("____"));
    expect(index).toBeGreaterThanOrEqual(0);
    expect(gap.sentence.units[index].lt).toBe(gap.full.units[index].lt);
    expect(gap.sentence.en).toContain("____");
    expect(gap.sentence.say).toBe("");
    expect(prompt.options).toHaveLength(3);
    expect(prompt.options[prompt.right]).toBe(gap.word.gapEn ?? gap.word.en);
    expect(has(gap.clip.voice, gap.clip.speed, gap.clip.say)).toBe(true);
    expect(makeGap({ en: "Walk!", say: "Walk!", nat: "Eikite!", units: [{ en: "Walk!", lt: "Eikite!" }] }, 0).en).toBe("____!");
  });

  it("uses the authored nominative and preserves the whole possessive phrase in hear prompts", async () => {
    const [id] = starterIds, def = (await loadSituation(id))!;
    const forms = new RoadWordForms(Object.values(def.entities ?? {}).flat(), []);
    expect(forms.hear("Sister", "Seserį", { role: "noun" }, false)).toBe("sesuo");
    expect(forms.hear("Friend", "Draugą", { role: "noun" }, false)).toBe("draugas");
    expect(forms.hear("Family", "Šeima", { role: "noun" }, false)).toBe("šeima");
    expect(forms.hear("My sister", "Seserį", { role: "noun phrase" }, false)).toBe("mano sesuo");
    expect(forms.hear("My friend", "Mano draugo", { role: "noun phrase" }, false)).toBe("mano draugas");
    expect(forms.hear("From London", "Iš Londono", { role: "prepositional phrase" }, false)).toBe("Iš Londono");
    const p = emptyProgress();
    p.sits[id] = { ...sitProgress(p, id), completions: 1 };
    const pool = await loadPool(p, [], has);
    const family = pool.words.filter(({ en }) => /^My (?:sister|friend|family)$/i.test(en));
    expect(family.map(({ hearLt }) => hearLt)).toEqual(expect.arrayContaining(["mano sesuo", "mano draugas", "mano šeima"]));
  });

  it("uses lowercase English gap options while keeping names and I capitalized", () => {
    const forms = new RoadWordForms([], ["Avery"]);
    expect(["beige", "Green", "Black", "Vinnie", "avery", "i'm", "i"].map((en) => forms.gap(en)))
      .toEqual(["beige", "green", "black", "Vinnie", "Avery", "I'm", "I"]);
    const word = (en: string, lt: string): Word => ({ en, lt, situation: "test", clip: { say: en, voice: "test", speed: 1, male: false } });
    const beige = word("beige", "smėlinis");
    const full = { en: "A beige suitcase.", say: "A beige suitcase.", nat: "Smėlinis lagaminas",
      units: [{ en: "A", lt: "—" }, { en: "beige", lt: "smėlinis" }, { en: "suitcase.", lt: "lagaminas" }] };
    const pick = makePicker({ words: [beige, word("Green", "žalias"), word("Black", "juodas")],
      gaps: [{ word: beige, full, sentence: makeGap(full, 1), clip: beige.clip }] }, () => 0.8);
    expect(pick(7)?.options).toEqual(expect.arrayContaining(["beige", "green", "black"]));
  });

  it("filters gloss aliases, duplicate translations and choices of another length or kind", () => {
    const word = (en: string, lt: string): Word => ({ en, lt, situation: "test", clip: { say: en, voice: coachVoice("f"), speed: 1, male: false } });
    const answer = word("Thanks", "Ačiū");
    const choices = distractors(answer, [
      word("Goodbye", "Iki"), word("Bye", "IKI!"), word("Gratitude", "ačiū!"), word("Thank you", "Dėkui"),
      word("Thanks", "Dėkoju"), word("Grateful", "Dėkoju"), word("Eleven", "Vienuolika"), word("Hello", "Sveiki"),
    ], false);
    expect(choices.map(({ en }) => en)).toEqual(["Goodbye", "Hello"]);
  });

  it("prefers colours with matching phrase shape over unrelated adjectives and nouns", () => {
    const word = (en: string, lt: string): Word => ({ en, lt, situation: "test", clip: { say: en, voice: coachVoice("f"), speed: 1, male: false } });
    const silver = word("It's silver", "Jis sidabrinis");
    const pool = [
      word("It's soft", "Jis minkštas"), word("Pleasure", "Poilsiui"),
      word("It's pink", "Jis rožinis"), word("It's yellow", "Jis geltonas"), word("Brown", "Rudas"),
      word("It's blue", "Jis mėlynas"),
    ];
    const best = distractors(silver, pool, false).slice(0, 2);
    expect(best).toHaveLength(2);
    expect(best.every(({ en }) => ["It's pink", "It's yellow", "It's blue"].includes(en))).toBe(true);
    expect(distractors(word("Silver", "Sidabrinis"), [
      word("Yellow", "Geltonas"), word("Soft", "Minkštas"), word("Pleasure", "Poilsiui"),
    ], false).map(({ en }) => en)).toEqual(["Yellow", "Soft"]);
  });

});

describe("desert road", () => {
  it("starts through Main Street's west gate in a forward-moving car and recognizes a walking boundary", () => {
    const { x, z, outward, return: back } = ROAD_EDITION.edge;
    const m = new Motion(CAR, "car");
    const car = { kind: "car", m } as Ride;
    m.set(x + 1.9, z, outward);
    m.speed = 7;
    expect(leavingByRoad(car)).toBe(true);
    m.z += 10;
    expect(leavingByRoad(car)).toBe(false);
    m.set(back.x, back.z, back.rot);
    m.speed = 7;
    expect(leavingByRoad(car)).toBe(false);
    expect(walkEdge(WORLD.minX + 0.38, z, -2, 0)?.inward).toBe(Math.PI / 2);
    expect(walkEdge(WORLD.minX + 0.38, z, 2, 0)).toBeUndefined();
    expect([0, 1, 2].map((lane) => laneAt(laneOffset(lane)))).toEqual([0, 1, 2]);
  });

  it("presents the crest with the same car, seated learner, and shifted camera", () => {
    const town = new Group(), rider = new Group();
    const car = new Mesh(new BoxGeometry(2, 1.4, 4), new MeshBasicMaterial());
    car.position.set(2, 0.09, 0).applyMatrix4(exitToTown);
    car.rotation.set(0.04, ROAD_EDITION.edge.outward - 0.08, 0.03);
    rider.position.copy(car.position).add(new Vector3(0, 0.8, 0));
    town.add(car, rider);
    const camera = new PerspectiveCamera(54, 390 / 664, 0.3, 590);
    camera.position.set(2, 6, 10).applyMatrix4(exitToTown);
    camera.lookAt(car.position);
    camera.setViewOffset(390, 664, 0, -80, 390, 664);
    const view = new RoadView(car, { width: 2, length: 4 }, carModelEntry("van"));
    view.depart(car, rider, camera, 390, 664);
    const renderer = { render: (scene: Object3D) => scene.updateMatrixWorld(true) };
    view.render(renderer, 390, 664, undefined);
    const first = view.departureDebug()!;
    for (const key of ["car", "rider", "camera"] as const) {
      expect(new Vector3().fromArray(first.road[key]).distanceTo(new Vector3().fromArray(first.town[key]))).toBeLessThan(0.01);
    }
    expect(first.road.viewOffset).toEqual(first.town.viewOffset);
    expect(first.road.fov).toBe(first.town.fov);
    for (const [i, pixel] of [first.road.roof, ...first.road.posts].entries()) {
      const other = [first.town.roof, ...first.town.posts][i];
      expect(Math.hypot(pixel[0] - other[0], pixel[1] - other[1])).toBeLessThan(1);
    }
    view.dispose();
    expect(rider.parent).toBe(town);
    car.geometry.dispose();
    car.material.dispose();
  });

  it("projects three board faces that grow with the arches", () => {
    const material = new MeshBasicMaterial({ vertexColors: true });
    const gate = new Gate(FIRST_GATE, {} as Prompt, material);
    gate.mesh.geometry.computeBoundingBox();
    const size = gate.mesh.geometry.boundingBox!;
    expect(size.max.x - size.min.x).toBeGreaterThan(11.5);
    expect(size.max.y - size.min.y).toBeGreaterThan(4);
    const cam = new PerspectiveCamera(49, 390 / 664, 0.18, 470);
    gate.mesh.updateMatrixWorld(true);
    const labelsAt = (s: number) => {
      cam.position.copy(point(s - 11, 0, 5.4));
      cam.lookAt(point(s + 22, 0, 1.85));
      cam.updateMatrixWorld();
      return projectBoards("road", gate.faces(), cam, 390, 664);
    };
    const far = labelsAt(0), nearby = labelsAt(FIRST_GATE - 32);
    expect(far).toHaveLength(3);
    expect(nearby).toHaveLength(3);
    for (const label of nearby) {
      expect(label.width).toBeGreaterThan(47);
      expect(label.width).toBeGreaterThan(far[label.lane].width * 1.5);
      expect(label.x - label.width / 2).toBeGreaterThan(0);
      expect(label.x + label.width / 2).toBeLessThan(390);
    }
    gate.dispose();
    material.dispose();
  });

  it.each([true, false])("marks the chosen board and clears the arch before the camera (correct=%s)", (correct) => {
    const material = new MeshBasicMaterial({ vertexColors: true });
    const gate = new Gate(FIRST_GATE, {} as Prompt, material);
    const camera = new PerspectiveCamera(49, 390 / 664, 0.18, 470);
    camera.position.copy(point(FIRST_GATE - 25, 0, 4.4));
    camera.lookAt(point(FIRST_GATE, 0, 3.2));
    camera.updateMatrixWorld();
    const [boards] = gate.mesh.children as InstancedMesh[];
    expect(gate.mesh.children).toHaveLength(1);
    expect(boards.count).toBe(3);
    const original = new Matrix4();
    boards.getMatrixAt(2, original);
    gate.cross(2, correct);
    expect(gate.crossed).toBe(true);
    expect(gate.mesh.children).toHaveLength(correct ? 2 : 1);
    const stamp = gate.mesh.children[1] as Mesh | undefined;
    if (stamp) expect(stamp.renderOrder).toBeGreaterThan(boards.renderOrder);
    const tint = new Color();
    boards.getColorAt(1, tint);
    expect(tint.getHex()).toBe(0xffffff);
    boards.getColorAt(2, tint);
    expect(tint.g > tint.r).toBe(correct);
    gate.mesh.updateMatrixWorld(true);
    const labels = projectBoards("road", gate.faces(), camera, 390, 664);
    expect(labels.map(({ lane }) => lane)).toEqual(correct ? [0, 1] : [0, 1, 2]);
    expect(gate.animatePass(0.15, FIRST_GATE + 3)).toBe(true);
    const animated = new Matrix4();
    boards.getMatrixAt(2, animated);
    expect(animated.elements[13] > original.elements[13]).toBe(correct);
    expect(animated.elements[1] === 0).toBe(correct);
    if (!correct) {
      const chosen = projectBoards("road", gate.faces(), camera, 390, 664)[2];
      expect(chosen.opacity).toBeLessThan(labels[0].opacity);
      expect(chosen.tilt).toBeGreaterThan(0.01);
      expect(chosen.y).toBeGreaterThan(labels[2].y);
    }
    expect(gate.animatePass(0.18, FIRST_GATE + 7)).toBe(true);
    for (const label of projectBoards("road", gate.faces(), camera, 390, 664)) {
      expect(label.opacity).toBeGreaterThan(0);
      expect(label.opacity).toBeLessThan(1);
    }
    expect(gate.animatePass(0.15, FIRST_GATE + 10)).toBe(false);
    expect(material.transparent).toBe(false);
    const released = vi.fn();
    boards.geometry.addEventListener("dispose", released);
    stamp?.geometry.addEventListener("dispose", released);
    gate.dispose();
    expect(released).toHaveBeenCalledTimes(correct ? 2 : 1);
    material.dispose();
  });

  it("frames all three gates and an airborne car in the outside lane on both phone heights and desktop", () => {
    const material = new MeshBasicMaterial({ vertexColors: true });
    const gate = new Gate(FIRST_GATE, {} as Prompt, material);
    gate.mesh.updateMatrixWorld(true);
    for (const [width, height] of [[390, 664], [390, 844], [1280, 800]]) {
      const chase = new RoadChase(), camera = new PerspectiveCamera();
      const near = 40;
      for (let toGo = near; toGo >= 0; toGo -= 1) {
        const distance = FIRST_GATE - toGo, car = point(distance, 4.8, 1.1);
        const yaw = course(distance) + 0.5;
        const corners = [-1.1, 1.1].flatMap((x) => [0, 1.8].flatMap((y) => [-2.4, 2.4].map((z) =>
          new Vector3(Math.cos(yaw) * x + Math.sin(yaw) * z, y, -Math.sin(yaw) * x + Math.cos(yaw) * z).add(car))));
        chase.update(camera, car, distance, 1.1, 0.9, near - toGo, 0.05, width, height, corners, gate);
        const labels = projectBoards("road", gate.faces(), camera, width, height);
        expect(labels).toHaveLength(3);
        let leftLimit = 0;
        for (const label of labels) {
          expect(label.x - label.width / 2).toBeGreaterThan(leftLimit);
          leftLimit = label.x + label.width / 2;
          expect(leftLimit).toBeLessThan(width);
          expect(label.y + label.height / 2).toBeLessThan(height * 0.75);
          if (toGo >= 32) expect(label.width).toBeGreaterThan(width === 390 ? 82 : 100);
        }
        for (const corner of corners) {
          const projected = corner.clone().project(camera);
          expect(Math.abs(projected.x)).toBeLessThan(0.95);
          expect(Math.abs(projected.y)).toBeLessThan(0.95);
        }
      }
    }
    gate.dispose();
    material.dispose();
  });

  it("streams a bounded number of pieces and releases geometry behind the car", () => {
    const track = new Track();
    track.stream(0);
    const initial = track.pieces.get(0)!.mesh;
    const dispose = vi.fn();
    initial.geometry.addEventListener("dispose", dispose);
    for (let i = 1; i < 420; i++) {
      track.stream(i * PIECE_LENGTH);
      expect(track.pieces.size).toBeLessThanOrEqual(6);
      if (i <= 10) for (const { features } of track.pieces.values()) {
        expect(features.every(({ kind }) => ["cone", "rock", "cactus", "ramp", "boost"].includes(kind))).toBe(true);
        for (const { kind, s } of features) {
          if (kind !== "cactus" && kind !== "rock") {
            let gate = FIRST_GATE, number = 0;
            while (gate < s) gate = nextGate(gate, ++number);
            expect(gate - s).toBeGreaterThanOrEqual(24);
          }
        }
      }
      expect(track.group.children).toHaveLength(track.pieces.size);
    }
    expect(initial.parent).toBeNull();
    expect(dispose).toHaveBeenCalledOnce();
    expect(track.released).toBeGreaterThan(400);
    track.dispose();
    expect(track.pieces.size).toBe(0);
    expect(track.group.children).toHaveLength(0);
  });

  it("scores streaks, limits misses, and finishes after exactly 150 seconds of driving", () => {
    const s = new RunScore();
    const prompt: Prompt = { word: { en: "Train", lt: "Traukinys", situation: "a", clip: { say: "Train", voice: "test", speed: 1, male: false } },
      options: ["Autobusas", "Traukinys", "Keltas"], right: 1 };
    expect(s.answer(prompt, 1)).toBe(true);
    expect(s.answer(prompt, 1)).toBe(true);
    expect(s.answer(prompt, 0)).toBe(false);
    expect(s.answer(prompt, 1)).toBe(true);
    for (let i = 0; i < 5; i++) s.answer({ ...prompt, word: { ...prompt.word, situation: String(i) } }, 0);
    expect(s).toMatchObject({ right: 3, total: 9, streak: 0, bestStreak: 2, points: 325 });
    expect(s.missed.size).toBe(3);
    for (let i = 0; i < 2999; i++) expect(s.advance(0.05)).toBe(false);
    expect(s.advance(0.05)).toBe(true);
    expect(s.elapsed).toBe(DRIVE_SECONDS);
    expect(s.advance(0.06)).toBe(true);
    expect(s.elapsed).toBe(150);
  });

  it("passes 16–20 gates at cruise pace in a full run", () => {
    const track = new Track(), car = new RoadCar(), dt = 0.05;
    let total = 0, gate = FIRST_GATE;
    for (let i = 1; i <= DRIVE_SECONDS / dt; i++) {
      const time = i * dt;
      track.stream(car.s);
      car.drive({ dt, time, x: 0, y: 0, brake: false, blocked: false }, time, track, laneOffset(total % 3));
      if (car.s >= gate) gate = nextGate(gate, ++total);
    }
    expect(total).toBeGreaterThanOrEqual(16);
    expect(total).toBeLessThanOrEqual(20);
    track.dispose();
  });

  it("samples a path at 10 Hz and persists only the best ghost for each edition", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } };
    const ghost = new GhostRecorder();
    for (let i = 0; i <= 20; i++) ghost.sample(i * 0.05, [i * 0.8, i * 0.1, 0, 0]);
    expect(ghost.frames).toHaveLength(11);
    expect(ghostAt(ghost.frames, 0.25)?.[0]).toBeCloseTo(4);
    expect(ghostAt(ghost.frames, 1.1)).toBeUndefined();
    const record = { points: 900, frames: ghost.frames };
    expect(saveBest("maple", record, undefined, storage)).toBe(true);
    expect(saveBest("maple", { ...record, points: 899 }, undefined, storage)).toBe(false);
    expect(readBest("maple", storage)).toEqual(record);
    expect(readBest("puerto", storage)).toBeUndefined();
  });
});
