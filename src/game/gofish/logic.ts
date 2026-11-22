import { GOFISH_DECKS } from "../../content/gofish";

export const PLAYERS = ["learner", "dan", "nora"] as const;
export type Player = typeof PLAYERS[number];
export type Npc = Exclude<Player, "learner">;
export type Word = string;
export type Hands = Record<Player, readonly Word[]>;

export interface Round {
  readonly deck: number;
  readonly hands: Hands;
  readonly pond: readonly Word[];
  readonly pairs: Hands;
  readonly turn: Player;
}

export interface Ask { target: Player; word: Word }
interface Move { from: Player | "pond"; word: Word }
export interface TurnResult {
  round: Round;
  move?: Move;
  pair?: Word;
  again: boolean;
}

export function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function nextDeck(deck: number) { return (deck + 1) % GOFISH_DECKS.length; }

export function deal(deck: number, random: () => number): Round {
  const cards = GOFISH_DECKS[deck].words.flatMap(({ id }) => [id, id]);
  for (;;) {
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    const hands = { learner: cards.slice(0, 5), dan: cards.slice(5, 10), nora: cards.slice(10, 15) };
    if (PLAYERS.every((player) => new Set(hands[player]).size === 5)) {
      return { deck, hands, pond: cards.slice(15), pairs: { learner: [], dan: [], nora: [] }, turn: "learner" };
    }
  }
}

export function targets(round: Round) {
  return PLAYERS.filter((player) => player !== round.turn && round.hands[player].length > 0);
}

export function validAsk(round: Round, ask: Ask) {
  return round.hands[round.turn].includes(ask.word) && targets(round).includes(ask.target);
}

export function defaultTarget(round: Round) {
  return targets(round).reduce<Player | undefined>((best, player) =>
    !best || round.hands[player].length > round.hands[best].length ? player : best, undefined);
}

export function npcAsk(round: Round, random: () => number): Ask | null {
  const candidates = targets(round);
  const hand = round.hands[round.turn];
  if (!candidates.length || !hand.length || round.turn === "learner") return null;
  const target = candidates.length === 1 ? candidates[0] : random() < 0.65 ? "learner" : candidates[1];
  return { target, word: hand[Math.floor(random() * hand.length)] };
}

function receive(round: Round, move: Move, again: boolean): TurnResult {
  const { turn, hands, pond } = round;
  const pair = hands[turn].includes(move.word) ? move.word : undefined;
  const nextHands = { ...hands, [turn]: [...hands[turn], move.word] };
  if (move.from !== "pond") nextHands[move.from] = hands[move.from].filter((word) => word !== move.word);
  return {
    round: { ...round, hands: nextHands, pond: move.from === "pond" ? pond.slice(1) : pond },
    move, pair, again,
  };
}

export function resolveAsk(round: Round, ask: Ask): TurnResult | null {
  if (!validAsk(round, ask)) return null;
  if (round.hands[ask.target].includes(ask.word)) return receive(round, { from: ask.target, word: ask.word }, true);
  return draw(round, ask.word);
}

/** An empty hand refills before asking. If all opponents are empty, an ask isn't possible. */
export function draw(round: Round, asked?: Word): TurnResult {
  const word = round.pond[0];
  return word ? receive(round, { from: "pond", word }, word === asked) : { round, again: false };
}

/** Refill an empty hand before asking, or skip it when the pond is also empty. */
export function prepareTurn(round: Round) {
  if (round.hands[round.turn].length && targets(round).length) return null;
  if (!round.pond.length) return { kind: "skip", round: nextTurn(round) } as const;
  const outcome = draw(round);
  // When no one else holds cards, keep drawing on successive turns until there is someone to ask.
  return { kind: "refill", outcome: { ...outcome, again: targets(outcome.round).length > 0 } } as const;
}

/** A matching pair stays in the hand until its owner says the pair line. */
export function finishTurn({ round, pair, again }: TurnResult): Round {
  const { turn, hands, pairs } = round;
  const laid = pair ? {
    ...round,
    hands: { ...hands, [turn]: hands[turn].filter((word) => word !== pair) },
    pairs: { ...pairs, [turn]: [...pairs[turn], pair] },
  } : round;
  if (again || finished(laid)) return laid;
  return nextTurn(laid);
}

export function nextTurn(round: Round): Round {
  const index = PLAYERS.indexOf(round.turn);
  const turn = [1, 2, 3].map((offset) => PLAYERS[(index + offset) % PLAYERS.length])
    .find((player) => round.hands[player].length > 0 || round.pond.length > 0);
  return turn ? { ...round, turn } : round;
}

export function finished(round: Round) {
  return PLAYERS.reduce((total, player) => total + round.pairs[player].length, 0) === GOFISH_DECKS[round.deck].words.length;
}

export function winner(round: Round) {
  const most = Math.max(...PLAYERS.map((player) => round.pairs[player].length));
  const tied = PLAYERS.filter((player) => round.pairs[player].length === most);
  return tied.length === 1 ? tied[0] : null;
}
