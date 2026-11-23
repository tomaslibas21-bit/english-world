import { LOTERIA_DECK, LOTERIA_ROUNDS, type LoteriaCard, type LoteriaRound } from "../../editions/es/content/loteria";

export const SIDE = 4;
export const BOARD_SIZE = SIDE * SIDE;
export const CORNERS = [0, 3, 12, 15] as const;
const BOARD = Array.from({ length: BOARD_SIZE }, (_, i) => i);
const ROWS = Array.from({ length: SIDE }, (_, row) => BOARD.filter((i) => Math.floor(i / SIDE) === row));
const COLUMNS = Array.from({ length: SIDE }, (_, col) => BOARD.filter((i) => i % SIDE === col));
const PATTERNS: Record<LoteriaRound, readonly (readonly number[])[]> = {
  linea: [...ROWS, ...COLUMNS, [0, 5, 10, 15], [3, 6, 9, 12]],
  esquinas: [CORNERS],
  llena: [BOARD],
};

export function roundKind(index: number) {
  return LOTERIA_ROUNDS[index % LOTERIA_ROUNDS.length];
}

export function winningPattern(round: LoteriaRound, covered: ReadonlySet<number>) {
  return PATTERNS[round].find((pattern) => pattern.every((i) => covered.has(i)));
}

export function cardsNeeded(round: LoteriaRound, covered: ReadonlySet<number>) {
  return Math.min(...PATTERNS[round].map((pattern) => pattern.filter((i) => !covered.has(i)).length));
}

export function listenStage(round: number, call: number) {
  if (call >= 15) return "ear";
  return round === 0 && call <= 6 ? "glow" : "plain";
}

function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 0x100000000;
  };
}

function shuffle(random: () => number) {
  const deck = [...LOTERIA_DECK];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export class LoteriaRoundState {
  readonly kind: LoteriaRound;
  readonly board: readonly LoteriaCard[];
  readonly neighbor: readonly LoteriaCard[];
  readonly deck: readonly LoteriaCard[];
  readonly neighborCanWin: boolean;
  readonly called: LoteriaCard[] = [];
  readonly covered = new Set<number>();
  readonly neighborCovered = new Set<number>();
  readonly byEar = new Set<number>();
  private calledIds = new Set<string>();
  private neighborSettled = 0;
  private hidden = false;
  winner: "learner" | "neighbor" | null = null;

  constructor(readonly index: number, seed: number) {
    const random = seededRandom(seed);
    this.kind = roundKind(index);
    this.neighborCanWin = random() < 0.2 && index > 0;
    this.board = shuffle(random).slice(0, BOARD_SIZE);
    this.neighbor = shuffle(random).slice(0, BOARD_SIZE);
    this.deck = shuffle(random);
  }

  get current() { return this.called.at(-1); }
  get faceDown() { return this.hidden; }
  get pattern() { return winningPattern(this.kind, this.covered); }

  draw() {
    const card = this.deck[this.called.length];
    if (!card || this.winner || this.neighborSettled !== this.called.length) return;
    this.called.push(card);
    this.calledIds.add(card.id);
    this.hidden = listenStage(this.index, this.called.length) === "ear";
    return card;
  }

  cover(index: number) {
    const card = this.board[index];
    if (!card || this.winner || this.covered.has(index)) return "ignored";
    if (!this.calledIds.has(card.id)) return "uncalled";
    this.covered.add(index);
    if (this.hidden && this.current?.id === card.id) this.byEar.add(index);
    return "covered";
  }

  reveal() {
    if (this.neighborSettled === this.called.length) return;
    this.hidden = false;
    this.neighborSettled = this.called.length;
    const index = this.neighbor.findIndex((card) => card.id === this.current?.id);
    if (index < 0 || this.winner) return;
    this.neighborCovered.add(index);
    if (!winningPattern(this.kind, this.neighborCovered)) return;
    if (this.neighborCanWin) this.winner = "neighbor";
    else this.neighborCovered.delete(index);
  }

  shout() {
    if (this.winner || !this.pattern) return false;
    this.winner = "learner";
    return true;
  }
}
