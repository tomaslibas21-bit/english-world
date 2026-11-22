import { NPCS } from "./npcs";

export const BARISTA_CONVERSATION = { situation: "s72-cafe", npc: "mia", location: "sunny-cup" } as const;
export const BARISTA_UI = {
  start: "Pabandyti už prekystalio",
  title: "Pamaina baigta", orders: "Aptarnauti klientai", firstTime: "Teisingai iš pirmo karto",
  size: "Dydis", drink: "Gėrimas", milk: "Pienas", extras: "Priedai", dine: "Čia ar išsinešti",
  here: { en: "For here", lt: "čia" }, toGo: { en: "To go", lt: "išsinešti" }, noMilk: { en: "No milk", lt: "be pieno" },
  give: "Paduoti", price: "Kaina", customer: "Klientas", of: "iš", cards: "Frazių kortelės",
  again: "Dar kartą", done: "Baigti", exit: "Baigti pamainą",
  turn: "Tavo eilė", answer: "Pasirink atsakymą", listen: "Pasakyk garsiai – klausau",
  micOn: "Įjungti mikrofoną", micOff: "Išjungti mikrofoną", retry: "Pabandyk dar kartą",
  hear: "Klausyk", show: "Rodyti tekstą",
};

export type Row = "size" | "drink" | "milk" | "extras" | "dine";
export type Pick = { row: Row; id: string };
export type HintRef = { group: string; item: string; entity?: string; variant?: number };
export type OrderPiece = Pick & { hint: HintRef };

const drink = (id: string, item: string): OrderPiece => ({ row: "drink", id, hint: { group: "order_drink", item, entity: id } });
const size = (id: string, article = false): OrderPiece => ({ row: "size", id, hint: { group: "size", item: article ? "size_a" : "size_please", entity: id } });
const milk = (id: string, item = "milk_please"): OrderPiece => ({ row: "milk", id, hint: { group: "milk", item, entity: id === "none" ? undefined : id } });
const food = (id: string): OrderPiece => ({ row: "extras", id, hint: { group: "order_food", item: "food_and", entity: id } });
const dine = (id: string, item = "dine_short"): OrderPiece => ({ row: "dine", id, hint: { group: "dine", item, variant: item === "dine_short" && id === "togo" ? 1 : 0 } });
const iced: OrderPiece = { row: "extras", id: "iced", hint: { group: "temp", item: "temp_please", entity: "iced" } };

export const BARISTA_ORDERS = [
  { npc: "rosa", price: 475, pieces: [drink("latte", "can_i_get"), size("medium"), milk("whole"), dine("here")] },
  { npc: "ben", price: 575, pieces: [drink("cappuccino", "id_like"), size("large", true), milk("oat", "milk_with"), dine("togo")] },
  { npc: "chloe", price: 725, pieces: [drink("americano", "could_i_have"), size("large"), milk("none", "milk_none"), food("croissant"), dine("togo", "dine_take")] },
  { npc: "aaron", price: 350, pieces: [drink("hot_chocolate", "may_i_have"), size("small", true), dine("here", "dine_have_here")] },
  { npc: "jessie", price: 1000, pieces: [drink("mocha", "ill_have"), size("large"), milk("almond"), food("blueberry_muffin"), dine("togo", "dine_can")] },
  { npc: "walter", price: 550, pieces: [drink("latte", "let_me_get"), size("small"), iced, milk("oat"), dine("here")] },
].map((order, i) => ({ ...order, gender: NPCS[order.npc].gender, priceLine: `bs_a_price_${i + 1}` }));

export const priceText = (cents: number) => `$${(cents / 100).toFixed(2)}`;
