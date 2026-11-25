import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { GLOBAL } from "@/content/global";
import { NPCS } from "@/content/npcs";
import { loadSituation } from "@/content/situations/catalog";
import type { SituationDef } from "@/content/types";
import { Conversation } from "@/convo/dialogue";
import { CENOTE_TOUR_ACCEPT } from "@/editions/es/content/cenote-tour-lines";
import { audio } from "@/game/audio";
import { conversationLine, learnerTurn } from "@/game/kit/lines";
import { Session } from "@/game/session";
import { emptyProgress } from "@/state/progress";
import { DEFAULT_SETTINGS, useStore } from "@/state/store";
import { sceneFor } from "@/ui/scenes";

vi.mock("@/game/audio", () => ({
  audio: { init: vi.fn().mockResolvedValue(undefined), play: vi.fn(), prefetch: vi.fn(), clipDuration: () => null, stop: vi.fn(), sfx: vi.fn() },
}));

const id = "x14-cenote";
let sit: SituationDef;
beforeAll(async () => { sit = (await loadSituation(id))!; });
const chat = (memory?: Record<string, unknown>) =>
  new Conversation(sit, { global: GLOBAL, npcs: NPCS, player: { name: "Ana", surname: "", gender: "f" }, visits: 0, seed: 1, memory });

describe("Inés's invitation", () => {
  it.each([
    ["Quiero ver los peces.", "fish_plan"],
    ["Las tortugas marinas.", "turtle_plan"],
  ])("responds to %s and proposes one handoff only after readiness", (answer, line) => {
    const convo = chat();
    expect(convo.start().lines.map((l) => l.lineId)).toEqual(["greet"]);
    expect(convo.input("Sí.").events).toEqual([]);
    expect(convo.input("Hoy no, gracias.").lines.map((l) => l.lineId)).toEqual(["ask_interest"]);
    expect(convo.input("Sí, quiero ir.").lines.map((l) => l.lineId)).toEqual(["ask_interest"]);
    expect(convo.input(answer).lines.map((l) => l.lineId)).toEqual([line, "ask_ready"]);
    expect(convo.support().hints).toEqual(["invite", "spot", "count"]);

    const end = convo.input("Sí, quiero ir.");
    expect(end).toMatchObject({ completed: true, ended: true, events: [{ name: "cenote-tour", at: 1 }] });
    expect(end.lines.map((l) => l.lineId)).toEqual(["meet_deck"]);
    expect(convo.input("Sí, quiero ir.")).toMatchObject({ lines: [], events: [] });
  });

  it.each([
    ["No."],
    ["Hoy no, gracias."],
    ["Sí.", "Quiero ver las tortugas.", "Ahorita no, gracias."],
    ["Sí.", "Quiero ver los peces.", "No quiero ir."],
    ["Sí.", "Quiero ver los peces.", "No, claro que no."],
    ["Sí.", "Hasta luego."],
  ].map((turns) => ({ turns })))("can end early with $turns", ({ turns }) => {
    const convo = chat();
    convo.start();
    const results = turns.map((turn) => convo.input(turn));
    expect(results.flatMap((r) => r.events)).toEqual([]);
    expect(results.at(-1)?.lines.map((l) => l.lineId)).toEqual(["later"]);
    expect(convo.ended).toBe(true);
    expect(convo.completed).toBe(false);
    expect(chat(convo.memoryOut).start().lines.map((l) => l.lineId)).toEqual(["again"]);
  });

  it("keeps the question open on an unrelated phrase, a repeat, and a request for help", () => {
    const convo = chat();
    convo.start();
    for (let i = 0; i < 2; i++) {
      const out = convo.input("Mi ventana es cuadrada.");
      expect(out.understood).toBe(false);
      expect(out.lines.map((l) => l.lineId)).toEqual(i ? ["g_not_understood"] : []);
      expect(convo.step).toBe("invite");
    }
    for (const request of ["¿Puede repetir?", "Sí, perdón, ¿puede repetir?", "No entiendo.", "No, no entiendo."]) {
      const out = convo.input(request);
      expect(out.lines.at(-1)?.lineId).toBe("greet");
      expect(out.events).toEqual([]);
      expect(convo.step).toBe("invite");
      expect(convo.s.invited).toBeUndefined();
    }
  });

  it("keeps pending art out of the picture renderer", () => {
    expect(sceneFor(id, "ines")).toBeUndefined();
  });
});

describe("the authored bay answers", () => {
  function matcher(group: "spot" | "count") {
    const options = sit.hints[group].items.map(({ id: key }) => ({
      key, sentence: conversationLine(id, "ines", key, undefined, true)!,
    }));
    return learnerTurn(options, CENOTE_TOUR_ACCEPT);
  }

  it("distinguishes spotting the fish from asking where they are", () => {
    const fish = matcher("spot");
    for (const [utterance, key] of [["Sí", "see_yes"], ["Ya los veo.", "see_yes"], ["¿En dónde están?", "see_where"], ["No.", "see_where"]]) {
      expect(fish.read(utterance).answer?.key).toBe(key);
    }
    expect(fish.read("Veo dos tortugas.").verdict).toBe("none");
  });

  it("distinguishes one turtle from two, including short answers", () => {
    const turtles = matcher("count");
    for (const [utterance, key] of [["Una", "see_one"], ["Nomás una.", "see_one"], ["Dos", "see_two"], ["Veo las dos.", "see_two"]]) {
      expect(turtles.read(utterance).answer?.key).toBe(key);
    }
    expect(turtles.read("Mi ventana es cuadrada.").verdict).toBe("none");
  });
});

describe("the text-only conversation handoff", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each([false, true])("handles a missing clip at nonzero volume, with early close = %s", async (closeEarly) => {
    vi.useFakeTimers();
    vi.stubGlobal("document", new EventTarget());
    useStore.setState({ settings: { ...DEFAULT_SETTINGS, volume: 0.7 }, progress: emptyProgress() });
    const onEvent = vi.fn(), onEnd = vi.fn();
    const session = new Session(id, { npcTalk() {}, recordedOnly: true, onEvent, onEnd });
    const waitForText = async (turn: Promise<void>) => { await vi.runAllTimersAsync(); await turn; };

    const opening = session.begin();
    await vi.advanceTimersByTimeAsync(6100);
    expect(useStore.getState().conv).toMatchObject({ introOpen: true, transcript: [] });
    useStore.getState().setConv({ introOpen: false });
    await waitForText(opening);
    expect(useStore.getState().conv).toMatchObject({ phase: "you", stepId: "invite", typing: true });
    await waitForText(session.submit("Sí."));
    await waitForText(session.submit("Quiero ver los peces."));
    expect(useStore.getState().conv).toMatchObject({ phase: "you", stepId: "ready" });

    const final = session.submit("Sí.");
    expect(useStore.getState().conv.lineKey).toBe("meet_deck");
    expect(onEvent).not.toHaveBeenCalled();
    if (closeEarly) session.close();
    await waitForText(final);
    await session.submit("Sí.");
    if (closeEarly) expect(onEvent).not.toHaveBeenCalled();
    else expect(onEvent.mock.calls).toEqual([["cenote-tour", undefined]]);
    session.close();
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(audio.play).not.toHaveBeenCalled();
  });
});
