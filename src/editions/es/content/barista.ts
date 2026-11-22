import { BARISTA_UI as UI, type OrderPiece } from "../../../content/barista";
import { NPCS } from "./npcs";
import { itemPrice } from "./cafe-menu";

export { BARISTA_CONVERSATION, type HintRef, type OrderPiece, type Pick, type Row } from "../../../content/barista";
export { priceEn as priceText } from "../convo/target";

export const BARISTA_UI = {
  ...UI,
  here: { ...UI.here, en: "Para aquí" },
  toGo: { ...UI.toGo, en: "Para llevar" },
  noMilk: { ...UI.noMilk, en: "Sin leche" },
};

export const BARISTA_CHOCOLATE: string = "chocolate";
export const BARISTA_MENU = {
  size: ["small", "medium", "large"],
  drink: ["latte", "cappuccino", "americano", BARISTA_CHOCOLATE, "mocha", "cafe_de_olla", "horchata"],
  milk: ["whole", "lactose_free", "oat", "almond"],
  food: ["croissant", "donut", "concha", "cookie"],
};

const drink = (id: string, item: string): OrderPiece => ({ row: "drink", id, hint: { group: "order_drink", item, entity: id } });
const size = (id: string): OrderPiece => ({ row: "size", id, hint: { group: "size", item: "size_please", entity: id } });
const milk = (id: string, item = "milk_please"): OrderPiece => ({ row: "milk", id, hint: { group: "milk", item, entity: id === "none" ? undefined : id } });
const food = (id: string): OrderPiece => ({ row: "extras", id, hint: { group: "order_food", item: "food_and", entity: id } });
const dine = (id: string, item = "dine_short"): OrderPiece => ({ row: "dine", id, hint: { group: "dine", item, variant: item === "dine_short" && id === "togo" ? 1 : 0 } });
const iced: OrderPiece = { row: "extras", id: "iced", hint: { group: "temp", item: "temp_please", entity: "iced" } };

function orderPrice(pieces: OrderPiece[]) {
  const drink = pieces.find((p) => p.row === "drink")!;
  const milk = pieces.find((p) => p.row === "milk" && p.id !== "none");
  const size = pieces.find((p) => p.row === "size");
  const extras = pieces.filter((p) => p.row === "extras");
  return itemPrice({
    cat: "drink", id: drink.id, qty: 1, size: size?.id, milk: milk?.id,
    temp: extras.find((p) => p.hint.group === "temp")?.id,
  }) + extras.filter((p) => p.hint.group === "order_food").reduce((sum, p) => sum + itemPrice({ cat: "food", id: p.id, qty: 1 }), 0);
}

export const BARISTA_ORDERS = [
  { npc: "rosa", pieces: [drink("latte", "me_da"), size("medium"), milk("whole"), dine("here")] },
  { npc: "ben", pieces: [drink("cappuccino", "quisiera"), size("medium"), milk("oat", "milk_with"), dine("togo")] },
  { npc: "chloe", pieces: [drink("americano", "me_puede_dar"), size("large"), milk("none", "milk_none"), food("croissant"), dine("togo", "dine_take")] },
  { npc: "aaron", pieces: [drink(BARISTA_CHOCOLATE, "voy_a_querer"), size("small"), dine("here", "dine_have_here")] },
  { npc: "jessie", pieces: [drink("mocha", "quiero"), size("large"), milk("almond"), food("donut"), dine("togo", "dine_its")] },
  { npc: "walter", pieces: [drink("latte", "para_mi"), size("small"), iced, milk("oat"), dine("here")] },
].map(({ npc, pieces }, i) => ({ npc, pieces, gender: NPCS[npc].gender, price: orderPrice(pieces), priceLine: `bs_a_price_${i + 1}` }));

