import { BARISTA_ORDERS, type OrderPiece, type Pick } from "../../content/barista";
import { updateHelp, type HelpLevel } from "../kit/help";
import { matchesPick, trayRows, type Build } from "./tray";

export type Step = "intro" | "arrive" | "greet" | "order" | "build" | "correction" | "handover" | "price" | "thanks" | "reply" | "closing" | "score";
type Correction = { piece: OrderPiece; chip: Pick; selected: boolean };

export class BaristaShift {
  index = 0;
  step: Step = "intro";
  built: Build = { extras: [] };
  piece = 0;
  wrong = 0;
  served = 0;
  firstTime = 0;
  correction: Correction | null = null;
  help: HelpLevel = 0;
  private missed = false;

  get order() { return BARISTA_ORDERS[this.index]; }
  get currentPiece() { return this.order.pieces[this.piece]; }

  select(pick: Pick) {
    const { row, id } = pick;
    if (!trayRows(this.built).includes(row)) return;
    if (row === "extras") {
      this.built.extras = matchesPick(this.built, pick) ? this.built.extras.filter((extra) => extra !== id) : [...this.built.extras, id];
    } else {
      this.built[row] = id;
      if (row === "drink" && id === "hot_chocolate") delete this.built.milk;
    }
    const fix = this.correction;
    if (fix && matchesPick(this.built, fix.chip) === fix.selected) this.correction = null;
  }

  handover() {
    if (this.step !== "build") return null;
    const { pieces } = this.order;
    const missing = pieces.find((piece) => !matchesPick(this.built, piece));
    const extra = this.built.extras.find((id) => !pieces.some((piece) => piece.row === "extras" && piece.id === id));
    if (missing) this.correction = { piece: missing, chip: missing, selected: true };
    else if (extra) {
      // The recorded order has no line for an unrequested extra. Repeat the relevant food/temperature piece
      // when there is one, or the drink, and mark the extra that needs to be toggled off.
      const relevant = pieces.find((piece) => piece.row === "extras" && (piece.id === "iced") === (extra === "iced"));
      this.correction = { piece: relevant ?? pieces[0], chip: { row: "extras", id: extra }, selected: false };
    }
    if (this.correction) {
      this.wrong++;
      this.missed = true;
      this.step = "correction";
    } else {
      this.served++;
      if (!this.missed) this.firstTime++;
      this.step = "handover";
    }
    return this.correction;
  }

  next() {
    if (this.index + 1 >= BARISTA_ORDERS.length) {
      this.step = "closing";
      return false;
    }
    this.index++;
    const scheduled: HelpLevel = this.index < 2 ? 0 : this.index < 4 ? 1 : 2;
    this.help = this.missed ? updateHelp({ level: scheduled, streak: 0 }, false).level : scheduled;
    this.missed = false;
    this.built = { extras: [] };
    this.piece = 0;
    this.step = "arrive";
    return true;
  }
}
