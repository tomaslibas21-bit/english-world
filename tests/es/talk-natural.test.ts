import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Group, Vector3 } from "three";
import { audioKey } from "../../src/audio-key";
import { ASK_WAY_LINES } from "@/content/ask-way-lines";
import { NPCS } from "@/content/npcs";
import { loadSituation } from "@/content/situations/catalog";
import { classifyTalk, talkPersonality } from "@/content/talkNatural";
import { npcVoice } from "@/content/voices";
import { addressInformal, compose, setVariety } from "@/convo/compose";
import { audio } from "@/game/audio";
import { Character } from "@/game/characters/Character";
import { setGame, type GameApi } from "@/game/gameRef";
import { Session } from "@/game/session";
import { presentTalkVoice } from "@/game/talkNatural/contract";
import { NaturalSession } from "@/game/talkNatural/session";
import { talkRoomAnchors } from "@/game/world/talkNatural";
import { emptyProgress } from "@/state/progress";
import { DEFAULT_SETTINGS, EMPTY_CONV, useStore, type TranscriptLine } from "@/state/store";
import { replayNpc } from "@/ui/replayNpc";

vi.mock("@/game/audio", () => ({
  audio: {
    names: [], play: vi.fn(), prefetch: vi.fn(), stop: vi.fn(), sfx: vi.fn(), clipDuration: vi.fn(), hasClip: vi.fn(),
  },
}));

afterEach(() => {
  setVariety("default");
  setGame(null);
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Puerto Colibrí cues from composed speech", () => {
  it.each([
    ["¡Buenas! ¿Qué va a tomar?", true, "greeting"],
    ["¡Buenas! ¿Qué va a tomar?", false, "question"],
    ["¡Hola!", true, "greeting"],
    ["¡Hola otra vez!", false, "rest"],
    ["¿Qué te pongo?", false, "question"],
    ["¿Tiene su boleto?", false, "question"],
    ["Aquí tiene su boleto.", false, "offer"],
    ["Aquí lo tienes.", false, "offer"],
    ["¿Aquí tienes tu boleto?", false, "question"],
    ["¿Le gustaría un café?", false, "offer"],
    ["¿Quiere reservar?", false, "question"],
    ["¿No tiene su boleto?", false, "question"],
    ["No, no tenemos más.", false, "no"],
    ["No sé.", false, "shrug"],
    ["No sé si llegue a tiempo.", false, "shrug"],
    ["¡No tiene pierde!", false, "yes"],
    ["¡No tiene pérdida!", false, "yes"],
    ["¡Sí, claro!", false, "yes"],
    ["Si le parece, podemos esperar.", false, "rest"],
    ["Sí señor.", false, "yes"],
    ["Casi llegamos.", false, "rest"],
    ["Son dos boletos.", false, "count"],
    ["Queda un café.", false, "count"],
    ["Son doscientos pesos.", false, "rest"],
    ["Son $2.50.", false, "rest"],
    ["Sale a las tres.", false, "rest"],
    ["Andén tres.", false, "rest"],
    ["Es en la calle 2.", false, "rest"],
    ["Está en el número 23.", false, "rest"],
    ["¿Son dos personas?", false, "question"],
    ["Que le vaya bien.", false, "goodbye"],
    ["Que te vaya bien.", false, "goodbye"],
    ["¡Buenas noches!", true, "greeting"],
    ["Siga derecho.", false, "point"],
    ["Queda a su derecha.", false, "point"],
    ["Tiene derecho a un descuento.", false, "rest"],
  ] as const)("%s (entry %s) gives %s", (spoken, opening, family) => {
    expect(classifyTalk(spoken, "station", opening).family).toBe(family);
  });

  it("keeps sides, reassurance and courtesy across authored registers and varieties", async () => {
    const café = (await loadSituation("s72-cafe"))!;
    const tickets = (await loadSituation("s67a-tickets"))!;
    const tienda = (await loadSituation("x05-tienda"))!;
    function spoken(line: Parameters<typeof compose>[0], actor: keyof typeof NPCS) {
      return compose(line, {}, { formal: !addressInformal(NPCS[actor]), look: () => undefined }).say;
    }
    for (const variety of ["default", "neutral", "spain"] as const) {
      setVariety(variety);
      const way = (id: string) => classifyTalk(spoken(ASK_WAY_LINES[id][0], "queta"), "town", id === "aw_greet");
      expect(way("aw_greet")).toMatchObject({ family: "greeting" });
      expect(way("aw_post_1")).toMatchObject({ family: "point", side: -1, anchor: undefined });
      expect(way("aw_cafe_1")).toMatchObject({ family: "point", side: 1, straight: true });
      expect(way("aw_pier_2")).toMatchObject({ family: "point", side: -1 });
      expect(way("aw_easy").family).toBe("yes");
      expect(way("aw_bye").family).toBe("goodbye");
      expect(classifyTalk(spoken(tickets.lines.ticket_one[0], "walter"), "station", false)).toMatchObject({ family: "offer", anchor: "handoff" });
      expect(classifyTalk(spoken(café.lines.menu_line[1], "mia"), "sunny-cup", false).anchor).toBe("menu");
      expect(classifyTalk(spoken(tienda.lines.coffee_served[0], "tienda"), "gas-station", false)).toMatchObject({ family: "offer", anchor: "handoff" });
    }
    expect(classifyTalk("Dé vuelta a la izquierda.", "town", false).side).toBe(-1);
    expect(classifyTalk("A la derecha.", "town", false).side).toBe(1);
    const straight = classifyTalk("Siga derecho.", "town", false);
    expect(straight).toMatchObject({ family: "point", straight: true });
    expect(straight.side).toBeUndefined();
    expect(classifyTalk("Sigue recto.", "town", false).straight).toBe(true);
    expect(classifyTalk("Cruce avenida Juárez.", "town", false).anchor).toBeUndefined();
    expect(classifyTalk("Muchas gracias.", "town", false).family).toBe("rest");
    expect(classifyTalk("Muchas gracias.", "town", false, true).family).toBe("goodbye");
    expect(classifyTalk("Que le vaya bien.", "town", false, true, true)).toEqual({ family: "repeat" });
    expect(classifyTalk("Son 3 cafés.", "gas-station", false).quantity).toBe(3);
  });

  it("uses the live cast IDs and observes the opportunity rates", () => {
    for (const id of ["walter", "aaron", "tienda"]) expect(talkPersonality(id).armChance, id).toBe(0.45);
    for (const id of ["vinnie", "queta", "tona"]) expect(talkPersonality(id).armChance, id).toBe(0.70);
    for (const id of ["mia", "marco_host", "marco", "alux_kin", "alux_nikte", "vale", "custodio"]) {
      expect(talkPersonality(id).armChance, id).toBe(0.55);
      expect(NPCS[id]).toBeDefined();
    }
    expect(talkPersonality("vinnie").smallGreeting).toBe(true);
    expect(talkPersonality("mia").quickSmile).toBe(true);
  });
});

describe("anchors from the room", () => {
  it("distinguishes station counter, station machine, café board, map and Tienda El Faro", () => {
    const room = new Group();
    expect(talkRoomAnchors("station", room).handoff?.toArray()).toEqual([-6, 1.08, -6]);
    expect(talkRoomAnchors("station", room).machine?.toArray()).toEqual([-1.55, 1.30, -8.37]);
    expect(talkRoomAnchors("sunny-cup", room).handoff?.toArray()).toEqual([-2, 1.08, -3.2]);
    expect(talkRoomAnchors("sunny-cup", room).menu?.toArray()).toEqual([-3.6, 2.75, -5.8]);
    expect(talkRoomAnchors("gas-station", room).handoff?.toArray()).toEqual([-3, 1.08, -2.8]);
    expect(talkRoomAnchors("visitor-center", room).map).toBeUndefined();
    room.userData.mapSpot = { x: 4.5, y: 2.2, z: -5.8 };
    room.position.set(1, 0, 2);
    expect(talkRoomAnchors("visitor-center", room).map?.toArray()).toEqual([5.5, 2.2, -3.8]);
    expect(talkRoomAnchors("town", room)).toEqual({});
    expect(classifyTalk("Puede usar la máquina.", "station", false).anchor).toBe("machine");
    expect(classifyTalk("Aquí tiene su boleto.", "station", false).anchor).toBe("handoff");
    expect(classifyTalk("¿Tiene su boleto?", "station", false).anchor).toBeUndefined();
    expect(classifyTalk("Puedo darle un mapa.", "visitor-center", false).anchor).toBe("map");
    expect(classifyTalk("Consulte el menú.", "sunny-cup", false).anchor).toBe("menu");
    expect(classifyTalk("Sale del andén dos.", "station", false).anchor).toBeUndefined();
  });

  it("uses the rotated footprint and a forward point under each counter actor's field of view", () => {
    const room = new Group(), point = new Vector3();
    room.position.set(1, 0, 2);
    room.rotation.y = Math.PI / 2;
    room.updateWorldMatrix(true, false);
    for (const [zone, x, z, flank] of [
      ["sunny-cup", -1.2, -4.2, 2], ["station", -6, -7, -2.5], ["gas-station", -3, -3.8, -0.5],
    ] as const) {
      const counter = talkRoomAnchors(zone, room).counter!;
      const head = room.localToWorld(new Vector3(x, 1.57, z));
      const actor = room.localToWorld(new Vector3(x, 0, z));
      const direction = new Vector3(0, 0, 1).transformDirection(room.matrixWorld);
      expect(counter.withinReach(actor), zone).toBe(true);
      expect(counter.withinReach(room.localToWorld(new Vector3(flank, 0, z))), zone).toBe(false);
      expect(counter.handoff(head, direction, point), zone).toBe(true);
      expect(counter.contains(point), zone).toBe(true);
      const reach = point.clone().sub(head);
      expect(reach.dot(direction)).toBeGreaterThan(0.65);
      expect(Math.abs(Math.atan2(reach.y, Math.hypot(reach.x, reach.z)))).toBeLessThanOrEqual(35 * Math.PI / 180);
    }
  });
});

describe("recorded-only Session and transcript replay", () => {
  beforeAll(() => loadSituation("x09-alberca"));

  it("keeps line identity, audio keys, guarded missing clips, stopListening and grouped replay across session changes", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("document", Object.assign(new EventTarget(), { visibilityState: "visible" }));
    useStore.setState({ conv: { ...EMPTY_CONV }, progress: emptyProgress(), settings: { ...DEFAULT_SETTINGS } });
    vi.mocked(audio.play).mockClear().mockResolvedValue(true);
    vi.mocked(audio.clipDuration).mockReturnValue(2.47);
    vi.mocked(audio.hasClip).mockImplementation((_, __, say) => say !== "Una grabación ausente.");
    const vale = NPCS.vale;
    const ch = new Character(vale.look);
    const npcTalk = vi.fn(), npcReact = vi.fn(), onEnd = vi.fn();
    const npcPlayback = vi.fn((id, line, replay) => id === "vale" ? { actor: ch, line, replay } : undefined);
    const session = new Session("x09-alberca", { npcTalk, npcReact, npcVoice: npcPlayback, recordedOnly: true, onEvent() {}, onEnd });
    let current: Session | null = session;
    setGame({ get activeSession() { return current; }, currentObjective: () => null, nextScenarioId: () => null } as GameApi);
    try {
      const begin = session.begin();
      expect(audio.play).not.toHaveBeenCalled();
      useStore.getState().setConv({ introOpen: false });
      await vi.advanceTimersByTimeAsync(500);
      await begin;
      const [heard] = useStore.getState().conv.transcript;
      const say = heard.sentence!.say;
      const voice = npcVoice(vale), speed = vale.speed ?? 1;
      const [playedVoice, playedSpeed, playedSay, playedOptions] = vi.mocked(audio.play).mock.calls[0];
      expect([playedVoice, playedSpeed, playedSay]).toEqual([voice, speed, say]);
      expect(say).toBe("¡Hola! ¿Quieres jugar con nosotros?");
      expect(audioKey(playedVoice, playedSpeed, playedSay)).toBe("f3505d01dd8f");
      expect(npcTalk).toHaveBeenCalledWith("vale", 2.47, say);
      expect(npcPlayback).toHaveBeenCalledWith("vale", heard.id, undefined);
      expect(playedOptions?.visual).toMatchObject({ actor: ch, line: heard.id });

      const repeat = session.submit("Más despacio, por favor.");
      await vi.advanceTimersByTimeAsync(800);
      await repeat;
      expect(npcReact).toHaveBeenCalledWith("vale", "nod", true);
      expect(vi.mocked(audio.play).mock.lastCall?.[3]?.visual?.replay).toBe("turn");

      const stopListening = vi.spyOn(session, "stopListening");
      const absent: TranscriptLine = { ...heard, id: heard.id + 500, sentence: { ...heard.sentence!, say: "Una grabación ausente." } };
      const count = vi.mocked(audio.play).mock.calls.length;
      await replayNpc([absent, heard], true);
      expect(stopListening).toHaveBeenCalledOnce();
      expect(audio.hasClip).toHaveBeenCalledWith(voice, speed, absent.sentence!.say);
      expect(audio.play).toHaveBeenCalledTimes(count + 1);
      const replay = vi.mocked(audio.play).mock.lastCall!;
      expect(replay.slice(0, 3)).toEqual([voice, speed, say]);
      expect(replay[3]).toMatchObject({ slow: true, visual: { actor: ch, line: heard.id, replay: "transcript" } });
      expect(replay[3]?.visual).not.toBe(playedOptions?.visual);

      let finish!: (value: boolean) => void;
      vi.mocked(audio.play).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
      const group = replayNpc([heard, heard], false);
      const before = vi.mocked(audio.play).mock.calls.length;
      current = null;
      finish(true);
      await group;
      expect(audio.play).toHaveBeenCalledTimes(before);
      expect(onEnd).not.toHaveBeenCalled();
    } finally {
      session.close();
      ch.dispose();
    }
    expect(onEnd).toHaveBeenCalledWith(session.sit, false);
  });
});

it("acts on Queta's optional authored lines through a post-office turn, slow repeat and café return", async () => {
  await loadSituation("x13-por-donde");
  vi.useFakeTimers();
  vi.stubGlobal("document", Object.assign(new EventTarget(), { visibilityState: "visible" }));
  useStore.setState({ conv: { ...EMPTY_CONV }, progress: emptyProgress(), settings: { ...DEFAULT_SETTINGS } });
  vi.mocked(audio.clipDuration).mockReturnValue(null);
  vi.mocked(audio.play).mockImplementation(async (_voice, _speed, _say, opts) => {
    opts?.visual?.onUnavailable?.();
    return false;
  });
  const group = new Group();
  const host = { id: "queta", ch: new Character({ ...NPCS.queta.look, female: true }) };
  const player = new Character(NPCS.queta.look);
  group.add(host.ch.root, player.root);
  player.root.position.z = 2;
  let acting: NaturalSession | undefined;
  let session: Session | undefined;
  const samples: NonNullable<ReturnType<NaturalSession["sample"]>>[] = [];
  const store = () => useStore.getState().conv;
  async function frames(count: number) {
    for (let i = 0; i < count; i++) {
      await vi.advanceTimersByTimeAsync(17);
      acting!.update(store(), 0.017);
      host.ch.update(0.017);
      player.update(0.017);
      samples.push(acting!.sample()!);
    }
  }
  async function start() {
    session = new Session("x13-por-donde", {
      npcTalk() {}, npcVoice: (_id, line, replay) => presentTalkVoice(host.ch, line, replay, store().transcript.at(-1)),
      npcReact: (id, kind, repeat) => acting?.feedback(id, repeat ? "repeat" : kind), onEvent() {}, onEnd() {},
    });
    const begin = session.begin();
    useStore.getState().setConv({ introOpen: false });
    acting = new NaturalSession({
      run: store().run, zone: { id: "town", group }, host, cast: [host], people: [host], extras: [], player,
      audio: { visualOwner: undefined, visualState: () => "interrupt", visualElapsed: () => 0,
        readVisualEnvelope: () => "interrupt" }, free: () => true,
    });
    acting.present(store(), true);
    await frames(45);
    await begin;
    expect(store().phase).toBe("you");
    return session;
  }
  const lineId = (text: string) => store().transcript.find((line) => line.sentence?.say.includes(text))!.id;
  try {
    const first = await start();
    const post = first.submit("Disculpe, ¿cómo llego al correo?");
    await frames(39);
    await post;
    const left = lineId("a la izquierda"), bank = lineId("junto al banco");
    const stroke = samples.find((frame) => frame.speaker?.pointLine === left && frame.speaker.pointWeight > 0.9)!;
    expect(stroke).toMatchObject({ speakingLineId: bank, mouth: 0,
      speaker: { pointSide: 1, pointDirection: -1, pointStraight: false } });
    expect(stroke.deltas).toMatchObject({ upperL: 0, elbowL: 0, outL: 0 });
    expect(stroke.deltas!.outR).toBeLessThan(-0.03);
    expect(samples.some((frame) => frame.speaker?.gestureLine === bank && frame.gesture === "headGreeting" &&
      frame.gestureWeight > 0.2 && frame.mouth === 0)).toBe(true);

    let from = samples.length;
    const slower = first.submit("¿Puede hablar más despacio, por favor?");
    await frames(50);
    await slower;
    expect(store().slowMode).toBe(true);
    expect(samples.slice(from).every((frame) => !frame.speaker?.pointWeight)).toBe(true);
    const thanks = first.submit("¡Muchas gracias!");
    from = samples.length;
    await frames(55);
    await thanks;
    const ending = samples.slice(from).filter((frame) => frame.reaction?.kind === "farewell");
    expect(ending.some((frame) => frame.reaction!.weight > 0.10)).toBe(true);
    expect(new Set(ending.map((frame) => frame.reaction!.sequence)).size).toBe(1);
    expect(samples.at(-1)!.reaction!.weight).toBe(0);

    first.close();
    acting!.dispose();
    const again = await start();
    expect(store().slowMode).toBe(true);
    const cafe = again.submit("Disculpe, ¿cómo llego al café La Ceiba?");
    from = samples.length;
    await frames(39);
    await cafe;
    const straight = lineId("Siga derecho");
    const forward = samples.slice(from).find((frame) => frame.speaker?.pointLine === straight && frame.speaker.pointWeight > 0.55)!;
    expect(forward).toMatchObject({ mouth: 0, speaker: { pointStraight: true, pointSide: 1 } });
    expect(forward.deltas!.upperR).toBeLessThan(-0.035);
    expect(forward.deltas!.outR).toBeLessThan(Math.abs(stroke.deltas!.outR));
  } finally {
    session?.close();
    acting?.dispose();
    host.ch.dispose();
    player.dispose();
  }
});
