import { describe, expect, it } from "vitest";
import { SITUATIONS, SITUATION_BY_ID } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { RETURNING_HINTS, returningSuggestion } from "../src/content/returning";
import { mergeRecord } from "../src/content/merges";
import { Conversation } from "../src/convo/dialogue";
import { modelAnswers, playerVars } from "../src/convo/suggest";

const memories: Record<string, Record<string, any>> = {
  "s72-cafe": { lastDrink: { cat: "drink", id: "latte", qty: 1, size: "large", milk: "whole", temp: "hot" } },
  "s69-local": { lastTip: "pier" }, "s62-visitor-center": { clarified: true }, "p28-kitchen": { pierChef: true },
  "s74-clothes": { lastBought: { id: "jacket", color: "yellow", size: "medium", paid: 5999 } },
};
const sharedNlu = new Map();
function start(sid: string, seed: number, visits = 1) {
  const sit = SITUATION_BY_ID[sid];
  const c = new Conversation(sit, { global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "Mikalauskas", gender: "m" }, seed, visits, memory: visits ? memories[sid] ?? {} : {}, sharedNlu });
  c.start();
  return c;
}
function answers(c: Conversation, hint: string, gender: "m" | "f" = "m", formal = true) {
  return modelAnswers(c.sit, RETURNING_HINTS[hint], undefined, { formal, gender, npcGender: NPCS[c.sit.npc].gender, vars: playerVars() }, 3);
}

const cases = [
  {"sid": "p25-used-car", "visits": 1, "seed": 1, "hint": "return_car", "next": [["present1", "present2", "ask_first"], ["present1", "present2", "ask_first"]]},
  {"sid": "p28-kitchen", "visits": 1, "seed": 2, "hint": "return_kitchen", "next": [["dish_react", "ask_consent"], ["dish_react", "feedback1a", "feedback1b"]]},
  {"sid": "p28b-review", "visits": 1, "seed": 4, "hint": "return_review", "next": [["feel_fine", "format", "proud_ask"], ["feel_curious", "format", "proud_ask"]]},
  {"sid": "p29-landlord", "visits": 1, "seed": 7, "hint": "return_heat", "next": [["oh_no", "thermostat_q"], ["oh_no", "thermostat_q"]]},
  {"sid": "s31-doctor", "visits": 1, "seed": 1, "hint": "return_doctor", "next": [["feel_sick_q"], ["sorry_sym", "ask_howlong"]]},
  {"sid": "s32-supermarket", "visits": 1, "seed": 3, "hint": "return_supermarket", "next": [["found_great", "rewards_q"], ["sorry_missed", "loc_a3", "rewards_q"]]},
  {"sid": "s33-small-talk", "visits": 1, "seed": 1, "hint": "return_how", "next": [["g_asked_back", "wxq_cloudy"], ["g_glad", "wxq_cloudy"]]},
  {"sid": "s62-visitor-center", "visits": 1, "seed": 2, "hint": "return_visitor", "next": [["g_welcome", "map_give", "ask_where"], ["g_welcome", "r_sunny_cup", "tw_crosswalk", "confirm_ask"]]},
  {"sid": "s72-cafe", "visits": 1, "seed": 2, "hint": "return_cafe", "next": [["ask_size"], ["ask_size"]]},
  {"sid": "s72-cafe", "visits": 3, "seed": 2, "hint": "return_usual", "next": [["ack_order", "ask_food_more"], ["ask_size"], ["ask_order"]]},
  {"sid": "s73-restaurant", "visits": 1, "seed": 3, "hint": "return_restaurant", "next": [["ask_resv_name"], ["ask_party"]]},
  {"sid": "s74-clothes", "visits": 1, "seed": 7, "hint": "return_shop", "next": [["ack_item", "ask_size"], ["browse_ok"]]},
  {"sid": "s75-pharmacy", "visits": 1, "seed": 5, "hint": "return_pharmacy", "next": [["sorry_symptom", "ask_meds"], ["rx_ask_name"]]},
  {"sid": "s77-salon", "visits": 1, "seed": 2, "hint": "return_salon", "next": [["ask_name"], ["walkin_wait"]]},
  {"sid": "s78-bank", "visits": 1, "seed": 2, "hint": "return_bank", "next": [["transfer_how", "transfer_cost", "anything_else"], ["ack_type", "ask_id_proof"]]},
  {"sid": "s82-neighbor", "visits": 1, "seed": 1, "hint": "return_how", "next": [["g_asked_back", "needs_first_known"], ["g_glad", "needs_first_known"]]},
];

describe("returning openings", () => {
  it.each(cases)("offers accepted current-context replies for $sid / $hint", ({ sid, seed, visits, hint, next }) => {
    const c = start(sid, seed, visits);
    const support = c.support();
    expect(support.suggest[0].hint).toBe(hint);
    expect(support.hints[0]).toBe(hint);
    const models = answers(c, hint);
    expect(models).toHaveLength(hint === "return_usual" ? 3 : 2);
    for (let i = 0; i < models.length; i++) {
      const fresh = start(sid, seed, visits);
      const parsed = fresh.nlu.parse(models[i].en, fresh.expectedIntents());
      expect(parsed.ok, models[i].en).toBe(true);
      expect(parsed.prefix, models[i].en).toBe(false);
      const out = fresh.input(models[i].en);
      expect(out.understood, models[i].en).toBe(true);
      expect(out.checking).not.toBe(true);
      expect(out.lines.map(l => l.lineId), models[i].en).toEqual(next[i]);
      expect(fresh.support().suggest.some(s => s.hint?.startsWith("return_"))).toBe(false);
    }
  });

  it("leaves every first-visit opening's own support authoritative", () => {
    for (const sit of SITUATIONS) for (const seed of [1, 3, 7]) {
      const c = start(sit.id, seed, 0);
      const st = c.effectiveStep();
      const expected = c.pending?.suggest ?? (st ? c.stepSuggest(st) : undefined) ?? sit.suggest ?? [];
      expect(c.support().suggest, `${sit.id}/${seed}`).toEqual(expected);
      expect(c.support().hints.some(id => id.startsWith("return_"))).toBe(false);
    }
  });

  it("requires this exact returning opening and pending/step context", () => {
    for (const { sid, seed, visits, hint } of cases) {
      const c = start(sid, seed, visits);
      const lines = c.lastTurn.map(l => l.lineId), pending = c.pending?.id, step = c.effectiveStep()?.id;
      expect(returningSuggestion(sid, visits, lines, pending, step)?.hint).toBe(hint);
      expect(returningSuggestion(sid, 0, lines, pending, step)).toBeNull();
      expect(returningSuggestion(sid, visits, ["ordinary_next_question"], pending, step)).toBeNull();
      expect(returningSuggestion(sid, visits, lines, "different_pending", "different_step")).toBeNull();
      expect(returningSuggestion("other-situation", visits, lines, pending, step)).toBeNull();
    }
  });

  it("keeps contextual help across replay and a miss without duplicating it", () => {
    const c = start("s72-cafe", 2, 3);
    c.repeat();
    expect(c.support().suggest.filter(x => x.hint === "return_usual")).toHaveLength(1);
    expect(c.input("purple satellites orbit tomorrow").understood).toBe(false);
    expect(c.support().suggest[0].hint).toBe("return_usual");
  });

  it("accepts the remembered large latte exactly once", () => {
    const c = start("s72-cafe", 2, 3);
    c.input(answers(c, "return_usual")[0].en);
    expect(c.s.items).toEqual([memories["s72-cafe"].lastDrink]);
    expect(c.pending?.id).not.toBe("usual");
  });
  it("changes the remembered order without adding or inheriting the latte", () => {
    const c = start("s72-cafe", 2, 3);
    c.input(answers(c, "return_usual")[1].en);
    expect(c.s.items).toHaveLength(1);
    expect(c.s.items[0]).toMatchObject({ id: "cappuccino", qty: 1 });
    expect(c.s.items[0].size).toBeUndefined();
    expect(c.effectiveStep()?.id).toBe("size");
    expect(memories["s72-cafe"].lastDrink.id).toBe("latte");
  });
  it("declines the usual and restores ordinary ordering choices", () => {
    const c = start("s72-cafe", 2, 3);
    c.input(answers(c, "return_usual")[2].en);
    expect(c.s.items).toEqual([]);
    expect(c.support().suggest[0].hint).toBe("order_drink");
  });

  it.each([
    ["s69-local", 7, "tried"], ["s74-clothes", 3, "return_q"],
    ["s31-doctor", 7, "dob"], ["s75-pharmacy", 3, "rx_prompt"],
  ] as const)("preserves the specific remembered/question examples for %s", (sid, seed, pending) => {
    const c = start(sid, seed);
    expect(c.pending?.id ?? c.effectiveStep()?.id).toBe(pending);
    const st = c.effectiveStep();
    expect(c.support().suggest).toEqual(c.pending?.suggest ?? (st ? c.stepSuggest(st) : undefined) ?? c.sit.suggest ?? []);
    expect(c.support().hints.some(id => id.startsWith("return_"))).toBe(false);
  });

  it("composes all examples in both address and gender forms, with registered interlinear merges", () => {
    const c = start("s72-cafe", 2);
    for (const [id, g] of Object.entries(RETURNING_HINTS)) {
      for (const formal of [true, false]) for (const gender of ["m", "f"] as const) {
        const models = answers(c, id, gender, formal);
        expect(models).toHaveLength(g.items.length);
        for (const s of models) {
          expect(s.en).not.toMatch(/[{}|…]/);
          expect(s.nat).not.toMatch(/[{}|…]/);
        }
      }
      for (const item of g.items) for (const unit of item.s.en.split("|").map(x => x.trim())) {
        if (/\s/.test(unit)) expect(mergeRecord(unit), `${id}: ${unit}`).toBeDefined();
      }
    }
  });
});
