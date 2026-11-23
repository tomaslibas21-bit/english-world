import { describe, expect, it, vi } from "vitest";
import { ASK_WAY_NPC, ASK_WAY_PLACES, ASK_WAY_SITUATION } from "@/content/ask-way-lines";
import { GLOBAL } from "@/content/global";
import { NPCS } from "@/content/npcs";
import { PHOTO_THINGS, PHOTO_WALK_NPC, PHOTO_WALK_SITUATION } from "@/content/photo-walk-lines";
import { SITUATION_BY_ID } from "@/content/situations";
import { QUEST_PEOPLE_SPOTS } from "@/content/townQuests";
import { Conversation } from "@/convo/dialogue";
import { parseCall, sayItCall } from "@/game/billiards/calls";
import { sayItWords } from "@/game/kit/sayIt";
import { photoNameMatcher } from "@/game/photowalk/state";
import { buildTown } from "@/game/world/town";
import { THEME } from "@/game/world/theme";
import { AMBIENT, CAST, COACH, RIDERS, voiceFor } from "../../tools/es-voices/casting-es";

const chat = (id: string) => {
  const conversation = new Conversation(SITUATION_BY_ID[id], { global: GLOBAL, npcs: NPCS,
    visits: 0, player: { name: "Ana", surname: "", gender: "f" } });
  conversation.start();
  return conversation;
};

describe("Puerto Colibrí's quests", () => {
  it("lets the learner accept or come back later", () => {
    expect(chat(PHOTO_WALK_SITUATION).input("¡Claro, con gusto!")).toMatchObject({
      completed: true, events: [{ name: "photowalk" }],
    });
    expect(chat(PHOTO_WALK_SITUATION).input("Tal vez luego.")).toMatchObject({ completed: false, events: [] });
  });

  it.each(ASK_WAY_PLACES)("gives directions to $location", ({ id, lines }) => {
    const ask = {
      post: "Disculpe, ¿cómo llego a Correos?",
      cafe: "Disculpe, ¿cómo llego al café La Ceiba?",
      pier: "Disculpe, ¿cómo llego al restaurante El Muelle?",
    }[id];
    const conversation = chat(ASK_WAY_SITUATION);
    const reply = conversation.input(ask);
    expect(reply.lines.map(({ lineId }) => lineId)).toEqual([...lines, "aw_easy"]);
    expect(reply.events).toMatchObject([{ name: "directions-asked" }]);
    expect(conversation.input("¡Muchas gracias!")).toMatchObject({
      completed: true, events: [{ name: "directions", data: { dest: id } }],
    });
  });

  it("reserves each voice in each casting and accent", () => {
    const others = [...Object.keys(CAST), ...Object.keys(RIDERS),
      ...Object.keys(AMBIENT).map((key) => `amb_${key}`), ...Object.keys(COACH).map((key) => `coach_${key}`)];
    for (const casting of ["mexico", "prebuilt"] as const) {
      for (const accent of ["mx", "neutral", "spain"] as const) {
        for (const npc of [PHOTO_WALK_NPC, ASK_WAY_NPC]) {
          const voice = voiceFor(npc, accent, casting);
          expect(voice).toBeTruthy();
          expect(others.filter((other) => voiceFor(other, accent, casting) === voice)).toEqual([npc]);
        }
      }
    }
  });

  it("registers all static subjects, leaves room to talk, and uses the traffic colectivo", () => {
    const draw = () => {};
    const gradient = () => ({ addColorStop: draw });
    const context = new Proxy({
      measureText: (text: string) => ({ width: text.length * 9 }), createLinearGradient: gradient, createRadialGradient: gradient,
    }, { get: (target, key) => Reflect.get(target, key) ?? draw });
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => context }) });
    try {
      const { colliders, photoSpots } = buildTown();
      const expected = new Set<string>(PHOTO_THINGS.map(({ id }) => id));
      expected.delete("colectivo");
      expect(new Set(photoSpots.map(({ id }) => id))).toEqual(expected);
      expect(THEME.traffic.slice(0, 4)).toContain("colectivo");
      for (const { npc, x, z, ax, az } of QUEST_PEOPLE_SPOTS) {
        expect(colliders.blocked(x, z, 0.45), npc).toBe(false);
        expect(colliders.blocked(ax, az, 0.38), `${npc} approach`).toBe(false);
      }
      const { x1, x2, z } = THEME.hammock!;
      expect(photoSpots.filter((spot) => spot.id === "palm" && spot.z === z).map((spot) => spot.x)).toEqual(expect.arrayContaining([x1, x2]));
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("Spanish speech bonuses", () => {
  it("accepts authored alternatives and folds Spanish accents", () => {
    const mailbox = photoNameMatcher("mailbox");
    expect(mailbox.read("¡Mira! Es el buzón.").answer?.key).toBe("mailbox");
    expect(mailbox.read("No es el buzón.").answer).toBeUndefined();
    expect(sayItWords(["un café"]).evaluate("Es un cafe")).toBe("complete");
    expect(sayItWords(["gire"], ["siga derecho"]).evaluate("siga derecho")).toBe("none");
  });

  it("keeps exact pool calls and accepts the same pocket kind for the listening bonus", () => {
    const call = { ball: 7, pocket: "fl" } as const;
    const spoken = sayItCall(call, "La siete, a la esquina de allá, a la izquierda.");
    for (const text of ["La siete, a la esquina de allá, a la izquierda.", "7 a la esquina", "La siete a la esquina del fondo a la izquierda"]) {
      expect(spoken.evaluate(text)).toBe("complete");
    }
    expect(spoken.evaluate("La siete, a la esquina de acá, a la izquierda.")).toBe("none");
    expect(spoken.evaluate("La siete a la del medio a la izquierda")).toBe("none");
    expect(parseCall("7 a la esquina")).toBeNull();
    expect(parseCall("7 a la esquina de allá a la izquierda")).toEqual(call);
  });
});
