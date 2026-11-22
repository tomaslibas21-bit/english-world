import { describe, expect, it } from "vitest";
import { GOFISH_DECKS } from "../src/content/gofish";
import { GOFISH_ACCEPT, GOFISH_LINES, GOFISH_MERGES, GOFISH_NOTES_LT } from "../src/content/gofish-lines";
import { mergeKey, mergeRecord } from "../src/content/merges";
import { NOTES_LT } from "../src/content/notes-lt";
import { dinner } from "../src/content/situations/s85-dinner";
import { compose, splitUnits } from "../src/convo/compose";
import { learnerTurn } from "../src/game/kit/lines";
import { PLAYERS, deal, defaultTarget, finished, finishTurn, nextDeck, nextTurn, npcAsk, prepareTurn, resolveAsk, seededRandom, targets, winner,
  type Round } from "../src/game/gofish/logic";

const round = (overrides: Partial<Round> = {}): Round => ({
  deck: 0, turn: "learner",
  hands: { learner: ["apple", "carrot"], dan: ["apple"], nora: ["banana"] },
  pond: ["cookie"], pairs: { learner: [], dan: [], nora: [] }, ...overrides,
});

describe("Go Fish rules", () => {
  it("rotates decks and deals five cards each and five to the pond without any starting pairs", () => {
    const sequence = [0, nextDeck(0), nextDeck(1), nextDeck(2)];
    expect(sequence.map((i) => GOFISH_DECKS[i].id)).toEqual(["food", "animals", "town", "food"]);
    for (const [index, deck] of GOFISH_DECKS.entries()) {
      for (let seed = 0; seed < 100; seed++) {
        const dealt = deal(index, seededRandom(seed));
        expect(dealt).toEqual(deal(index, seededRandom(seed)));
        expect(dealt.turn).toBe("learner");
        expect(dealt.pond).toHaveLength(5);
        for (const player of PLAYERS) {
          expect(dealt.hands[player]).toHaveLength(5);
          expect(new Set(dealt.hands[player]).size).toBe(5);
          expect(dealt.pairs[player]).toEqual([]);
        }
        const cards = [...Object.values(dealt.hands).flat(), ...dealt.pond].sort();
        expect(cards).toEqual(deck.words.flatMap(({ id }) => [id, id]).sort());
      }
    }
  });

  it("accepts held cards and nonempty opponents, transfers the card and lays the pair before playing again", () => {
    const start = round();
    expect(resolveAsk(start, { target: "dan", word: "banana" })).toBeNull();
    expect(resolveAsk(start, { target: "learner", word: "apple" })).toBeNull();
    expect(resolveAsk(round({ hands: { ...start.hands, dan: [] } }), { target: "dan", word: "apple" })).toBeNull();
    const outcome = resolveAsk(start, { target: "dan", word: "apple" })!;
    expect(outcome).toMatchObject({ move: { from: "dan", word: "apple" }, pair: "apple", again: true });
    expect(outcome.round.hands).toEqual({ learner: ["apple", "carrot", "apple"], dan: [], nora: ["banana"] });
    expect(finishTurn(outcome)).toMatchObject({ turn: "learner", hands: { learner: ["carrot"] }, pairs: { learner: ["apple"] } });
    expect(start.hands.dan).toEqual(["apple"]);
  });

  it("passes on a miss, keeps a lucky draw's turn and lays a different pair before passing", () => {
    const ask = { word: "apple", target: "nora" } as const;
    const miss = resolveAsk(round(), ask)!;
    expect(miss).toMatchObject({ move: { from: "pond", word: "cookie" }, again: false });
    expect(finishTurn(miss)).toMatchObject({ turn: "dan", pond: [], hands: { learner: ["apple", "carrot", "cookie"] } });

    const lucky = resolveAsk(round({ pond: ["apple"] }), ask)!;
    expect(lucky).toMatchObject({ move: { from: "pond", word: "apple" }, pair: "apple", again: true });
    expect(finishTurn(lucky)).toMatchObject({ turn: "learner", pond: [], pairs: { learner: ["apple"] } });

    const otherPair = resolveAsk(round({ pond: ["carrot"] }), ask)!;
    expect(otherPair).toMatchObject({ move: { from: "pond", word: "carrot" }, pair: "carrot", again: false });
    expect(finishTurn(otherPair)).toMatchObject({ turn: "dan", pairs: { learner: ["carrot"] } });
  });

  it("passes when the pond is empty, skips empty hands, and refills before asking when a pond remains", () => {
    const hands = { learner: ["apple"], dan: [], nora: ["banana", "apple"] };
    const emptyPond = round({ pond: [], hands });
    const miss = resolveAsk(emptyPond, { target: "nora", word: "apple" });
    expect(miss?.move?.from).toBe("nora");
    const unmatched = round({ ...emptyPond, hands: { ...hands, learner: ["apple", "cookie"] } });
    const passes = resolveAsk(unmatched, { target: "nora", word: "cookie" })!;
    expect(passes).toEqual({ round: unmatched, again: false });
    expect(finishTurn(passes).turn).toBe("nora");
    expect(targets(emptyPond)).toEqual(["nora"]);
    const start = round({ hands });
    expect(nextTurn(start).turn).toBe("dan");
    const preparing = prepareTurn(nextTurn(start));
    expect(preparing).toMatchObject({ kind: "refill", outcome: { again: true,
      round: { turn: "dan", hands: { dan: ["cookie"] }, pond: [] } } });
    expect(prepareTurn({ ...emptyPond, turn: "dan" })).toMatchObject({ kind: "skip", round: { turn: "nora" } });
    expect(prepareTurn(start)).toBeNull();
  });

  it("defaults to the bigger hand and draws NPC words and eligible targets from the given random stream", () => {
    const start = round({ hands: { learner: ["apple"], dan: ["carrot", "cookie"], nora: ["carrot", "apple", "banana"] } });
    expect(defaultTarget(start)).toBe("nora");
    expect(defaultTarget(round())).toBe("dan");
    const dan = { ...start, turn: "dan" } as const;
    const sample = (first: number) => {
      const values = [first, 0.99];
      return npcAsk(dan, () => values.shift()!);
    };
    expect(sample(0.649)).toEqual({ target: "learner", word: "cookie" });
    expect(sample(0.65)).toEqual({ target: "nora", word: "cookie" });
    expect(npcAsk({ ...dan, hands: { ...dan.hands, learner: [] } }, () => 0)).toEqual({ target: "nora", word: "carrot" });
  });

  it("finishes on the tenth pair and reports each possible winner or a tie", () => {
    const left = round({
      hands: { learner: ["apple"], dan: ["apple"], nora: [] },
      pairs: { learner: ["banana", "carrot", "tomato"], dan: ["strawberry", "cookie", "sandwich", "pancake"], nora: ["hot_dog", "cupcake"] },
      pond: [],
    });
    expect(finished(left)).toBe(false);
    expect(winner(left)).toBe("dan");
    const last = finishTurn(resolveAsk(left, { target: "dan", word: "apple" })!);
    expect(finished(last)).toBe(true);
    expect(winner(last)).toBeNull();
    expect(winner({ ...left, pairs: { ...left.pairs, dan: [] } })).toBe("learner");
    expect(winner({ ...left, pairs: { ...left.pairs, learner: [], dan: [] } })).toBe("nora");
  });

  it("conserves cards and reaches a winner or tie across seeded full rounds", () => {
    for (let seed = 0; seed < 40; seed++) {
      const random = seededRandom(seed);
      let state = deal(seed % 3, random);
      for (let turn = 0; turn < 500 && !finished(state); turn++) {
        const preparation = prepareTurn(state);
        if (preparation?.kind === "refill") state = finishTurn(preparation.outcome);
        else if (preparation?.kind === "skip") state = preparation.round;
        else {
          const ask = npcAsk(state, random) ?? {
            target: targets(state)[Math.floor(random() * targets(state).length)],
            word: state.hands.learner[Math.floor(random() * state.hands.learner.length)],
          };
          state = finishTurn(resolveAsk(state, ask)!);
        }
        const cards = [...Object.values(state.hands).flat(), ...state.pond, ...Object.values(state.pairs).flatMap(
          (pairs) => pairs.flatMap((word) => [word, word]),
        )];
        expect(cards.sort()).toEqual(GOFISH_DECKS[state.deck].words.flatMap(({ id }) => [id, id]).sort());
        for (const hand of Object.values(state.hands)) expect(new Set(hand).size).toBe(hand.length);
      }
      expect(finished(state), `seed ${seed}`).toBe(true);
    }
  });
});

describe("Go Fish content", () => {
  it("wires the authored lines, merges and notes into dinner and composes every interlinear form", () => {
    expect(dinner.lines).toMatchObject(GOFISH_LINES);
    expect(dinner.merges).toMatchObject(GOFISH_MERGES);
    expect(NOTES_LT).toMatchObject(GOFISH_NOTES_LT);
    for (const [key, sources] of Object.entries(GOFISH_LINES)) for (const source of sources) {
      for (const formal of [true, false]) for (const addressee of ["m", "f"] as const) for (const speaker of ["m", "f"] as const) {
        const sentence = compose(source, {}, { look: () => undefined, formal, addressee, speaker });
        expect(sentence.units, key).toHaveLength(splitUnits(source.en).length);
      }
      for (const unit of splitUnits(source.en)) {
        if (/\s/.test(unit)) expect(mergeRecord(unit) ?? dinner.merges?.[mergeKey(unit)], `${key} · ${unit}`).toBeDefined();
      }
      for (const note of Object.values(source.flags ?? {})) expect(NOTES_LT[note], key).toBeTruthy();
    }
  });

  it("recognizes every authored ask and response variant", () => {
    for (const word of GOFISH_DECKS.flatMap((deck) => deck.words)) {
      expect(GOFISH_ACCEPT[`gf_ask_${word.id}`]?.length).toBeGreaterThan(0);
    }
    for (const [key, variants] of Object.entries(GOFISH_ACCEPT)) {
      const sentence = compose(GOFISH_LINES[key][0], {}, { look: () => undefined });
      const turn = learnerTurn([{ key, sentence }], GOFISH_ACCEPT);
      for (const phrase of variants) expect(turn.read(phrase).answer?.key, phrase).toBe(key);
    }
  });
});
