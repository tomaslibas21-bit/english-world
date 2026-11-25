import { describe, expect, it } from "vitest";
import { CAVE_COPY, CAVE_GOALS, CAVE_ROOMS } from "../src/content/cave-copy";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import bram from "../src/content/situations/x06-bram";
import fern, { FERN_RIDDLES } from "../src/content/situations/x07-fern";
import oak from "../src/content/situations/x08-old-oak";
import type { SituationDef } from "../src/content/types";
import { compose } from "../src/convo/compose";
import { Conversation, type TurnOut } from "../src/convo/dialogue";
import { ipaForSentence } from "../src/convo/ipa";
import { tokenizePatternWords } from "../src/convo/normalize";
import { exampleVars } from "../src/convo/suggest";

function talk(sit: SituationDef, visits = 0, memory?: Record<string, unknown>) {
  const c = new Conversation(sit, {
    global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "Mikalauskas", gender: "m" }, seed: 1, visits, memory,
  });
  const first = c.start();
  return { c, first, say: (en: string) => {
    const out = c.input(en);
    expect(out.understood, `${sit.id}/${c.step}: ${en}`).toBe(true);
    return out;
  } };
}

const lineIds = (out: TurnOut) => out.lines.map(({ lineId }) => lineId);
const events = (out: TurnOut) => out.events.map(({ name, data }) => ({ name, data }));

describe("Slate Cove typed conversations", () => {
  for (const sit of [bram, fern, oak]) for (const sim of sit.sims ?? []) {
    it(sim.name, () => {
      const { c, say } = talk(sit);
      for (const turn of sim.turns) say(turn);
      expect(c.completed).toBe(sim.expect.complete);
      if (sim.expect.state) expect(c.s).toMatchObject(sim.expect.state);
      expect(c.ended).toBe(true);
    });
  }

  it("gives individual directions without awarding Bram's pass early", () => {
    const { c, say } = talk(bram);
    expect(lineIds(say("What's your name?"))).toEqual(["my_name", "ask_name_back"]);
    say("Ana");
    say("I'm from Maple Harbor.");
    say("The talking stones");
    expect(lineIds(say("Second"))).toContain("dir_second");
    expect(c.s.way).toBeUndefined();
    expect(events(say("Thanks!"))).toEqual([]);
    say("Can you tell me where the stones are?");
    expect(lineIds(say("Which way again?"))).toContain("dir_recap");
    say("What do I do next?");
    expect(events(say("I'm all set, thanks."))).toEqual([{ name: "cave-pass", data: { gate: "bram" } }]);
    expect(c.ended).toBe(true);
    expect(lineIds(talk(bram, 1).first)).toContain("halt_again");
  });

  it("keeps not-ready, small talk, repeat, negation and wrong guesses on the right Fern turn", () => {
    const { c, say } = talk(fern);
    say("No, thanks.");
    expect(c.step).toBe("ready");
    say("Yes, let's play!");
    expect(c.s.riddleIndex).toBe(0);
    expect(lineIds(say("Can you say it again?"))).toEqual(["r_acorn"]);
    expect(say("Slower, please.").lines.some((l) => l.lineId === "r_acorn" && l.slow)).toBe(true);
    expect(lineIds(say("What's a clue?"))).toEqual(["what_clue"]);
    say("It's not an acorn.");
    say("It's not a bicycle.");
    expect(c.s.wrong).toBe(0);
    say("A nut.");
    expect(lineIds(say("A shell."))).toContain("hint_acorn");
    say("A nut.");
    expect(lineIds(say("A stone."))).toContain("ans_acorn");
    expect(c.s.missed).toBe(1);
    expect(lineIds(say("That's a hard one!"))).toEqual(["hard_offer"]);
    expect(lineIds(say("Yes, please."))).toContain("hint_echo");
    say("An echo");
    expect(events(say("A leaf."))).toEqual([{ name: "cave-pass", data: { gate: "fern" } }]);
    expect(events(say("Goodbye!"))).toEqual([]);
  });

  it("asks the next riddle before it credits another answer", () => {
    const { c, say } = talk(fern);
    say("I'm ready.");
    expect(events(say("An acorn and an echo."))).toEqual([]);
    expect(c.s.right).toBe(1);
    expect(c.s.riddleIndex).toBe(1);
  });

  it("brings the Oak to its farewell on either answer and says the last line once", () => {
    for (const answer of ["I promise.", "Not today."]) {
      const { first, say } = talk(oak);
      expect(lineIds(first)).toEqual(["greet", "stones_lit", "ask_who"]);
      say("The old oak");
      say("I like it here.");
      const finish = say(answer);
      expect(events(finish)).toEqual([{ name: "tree-heard", data: {} }]);
      expect(lineIds(finish)).toEqual([answer === "Not today." ? "rest" : "glad", "keep", "back"]);
      const goodbye = say("Goodbye!");
      expect(lineIds(goodbye)).toEqual(["bye"]);
      expect(events(goodbye)).toEqual([]);
    }
    expect(lineIds(talk(oak, 1).first)).toEqual(["again", "ask_who"]);
    expect(lineIds(talk(oak, 1, { known: true }).first)).toContain("ask_feel");
  });

  it("composes and credits every offered model in its own context, including all riddle chips", () => {
    const setups: Array<[SituationDef, Record<string, string[]>]> = [
      [bram, { name: [], from: ["Tomas"], origin: ["Tomas"], why: ["Tomas", "Lithuania"], way: ["Tomas", "Lithuania", "I'm curious."],
        more: ["Tomas", "Lithuania", "I'm curious.", "Where are the stones?"], solve: ["Tomas", "Lithuania", "I'm curious.", "Where are the stones?"], ask: [] }],
      [fern, { ready: [], help: ["I'm ready."], ask: [] }],
      [oak, { who: [], feel: ["Who are you?"], promise: ["Who are you?", "I feel at home here."], ask: [] }],
    ];
    for (const [sit, groups] of setups) for (const [gid, turns] of Object.entries(groups)) {
      const group = sit.hints[gid];
      const entities = group.slot ? sit.entities![group.slot] : [undefined];
      for (const { id, s } of group.items) for (const entity of entities) {
        const { say } = talk(sit);
        turns.forEach(say);
        const text = compose(s, { ...exampleVars(), X: entity?.id }, { look: () => entity }).en;
        expect(say(text).hintsUsed, `${sit.id} ${id}: ${text}`).toContain(id);
      }
    }
    for (const [visits, { answer, options }] of FERN_RIDDLES.entries()) for (const option of options) {
      const entity = fern.entities!.thing.find((e) => e.id === option)!;
      for (const { id, s } of fern.hints[`guess_${answer}`].items) {
        const { c, say } = talk(fern, visits);
        say("I'm ready.");
        expect(c.support().suggest[0].options).toEqual(options);
        const sentence = compose(s, { X: option }, { look: () => entity });
        expect(sentence.nat).toContain(entity.lt.split("/")[0]);
        if (option === "moon") expect(sentence.en).toMatch(/the moon[.?]$/);
        if (option === "acorn") expect(sentence.en).toMatch(/an acorn[.?]$/);
        expect(say(sentence.en).hintsUsed, sentence.en).toContain(id);
        expect(c.s.right).toBe(Number(option === answer));
        expect(c.s.wrong).toBe(Number(option !== answer));
      }
    }
  });

  it("loads 215 distinct nine-word-or-shorter lines, with aligned glosses, IPA and exact Oak recognition", () => {
    const out = new Set<string>(), meanings = new Set<string>();
    const { c, say } = talk(oak);
    for (const room of Object.keys(CAVE_ROOMS)) {
      const group = oak.hints[`p_${room}`];
      expect(group.items).toHaveLength(43);
      for (const [index, item] of group.items.entries()) {
        expect(item.id).toBe(`${room}_${String(index + 1).padStart(2, "0")}`);
        const s = compose(item.s, {}, { look: () => undefined });
        const words = s.en.split(/\s+/);
        expect(words.length, item.id).toBeLessThanOrEqual(9);
        expect(s.units).toHaveLength(item.s.lt.split(" | ").length);
        expect(s.units.every((u) => u.en && u.lt), item.id).toBe(true);
        const ipa = ipaForSentence(words, s.say);
        expect(ipa, item.id).toHaveLength(words.length);
        expect(words.filter((_, i) => !ipa[i]), item.id).toEqual([]);
        out.add(tokenizePatternWords(s.en).join(" "));
        meanings.add(s.nat);
        const heard = say(s.en);
        expect(heard.hintsUsed, item.id).toContain(item.id);
        expect(lineIds(heard)).toContain("stone_ok");
        expect(c.s.known).toBe(false);
        expect(c.completed).toBe(false);
      }
    }
    expect(out.size).toBe(CAVE_GOALS.replay);
    expect(meanings.size).toBe(CAVE_GOALS.replay);
    expect(CAVE_COPY.card.litCount(2).lt).toContain("2 iš 3");
    expect(CAVE_COPY.card.oakCount(4).lt).toContain("4 iš 5");
    expect(CAVE_COPY.card.replayCount(1).lt).toContain("1 iš 215");
  });
});
