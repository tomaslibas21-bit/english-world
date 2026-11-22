// Café La Ceiba's menu and pricing, shared by the café conversation and the barista shift.
import { ent } from "@/content/dsl";
import type { EntityDef } from "@/content/types";

export const DRINKS: EntityDef[] = [
  ent("americano", "americano", "americano", "m", { pl: "americanos", forms: ["cafe americano", "americanos", "cafe de la casa", "cafe de grano", "cafe normal"],
    attrs: { sized: true, iced: true, price: [3500, 4000, 4500], cup: true } }),
  ent("cappuccino", "capuchino", "cappuccino", "m", { pl: "capuchinos", ltPl: "cappuccinos",
    forms: ["cappuccino", "capuccino", "capuchinos", "capucchino", "capucino", "cappuccinos"], attrs: { sized: true, milky: true, price: [4500, 5000, 5500] } }),
  ent("latte", "latte", "latte", "m", { pl: "lattes", forms: ["late", "lattes", "cafe latte", "lates"],
    attrs: { sized: true, milky: true, iced: true, price: [4500, 5000, 5500] } }),
  ent("espresso", "expreso", "espresso", "m", { pl: "expresos", ltPl: "espressos", forms: ["espresso", "expresso", "expres", "espressos", "expresos"], attrs: { price: 3500 } }),
  ent("cafe_de_olla", "café | de | olla", "coffee | from | pot", "m", { pl: "cafés | de | olla", ltPl: "coffees | from | pot",
    forms: ["cafe de olla", "cafes de olla", "de olla", "cafecito de olla"], chip: "café de olla",
    attrs: { sized: true, price: [3500, 4000, 4500], cup: true, nat: "café de olla (spiced pot coffee)", natPl: "cafés de olla (spiced pot coffee)" } }),
  ent("mocha", "moka", "mocha", "m", { pl: "mokas", ltPl: "mochas", forms: ["mocha", "mocca", "moca", "mokas", "cafe moka"],
    attrs: { sized: true, milky: true, iced: true, price: [5000, 5500, 6000] } }),
  ent("coffee", "café", "coffee", "m", { pl: "cafés", ltPl: "coffees", forms: ["cafecito", "cafes"], attrs: { generic: "coffee", sized: true, cup: true } }),
  ent("chocolate", "chocolate", "hot chocolate", "m", { pl: "chocolates", ltPl: "hot chocolates", forms: ["chocolate caliente", "chocolates", "chocolate de leche"],
    attrs: { sized: true, price: [4000, 4500, 5000], cup: true } }),
  ent("tea", "té", "tea", "m", { pl: "tés", ltPl: "teas", forms: ["tecito", "infusion", "tes"], attrs: { generic: "tea", price: 3000, cup: true } }),
  ent("chamomile_tea", "té | de | manzanilla", "tea | of | chamomile", "m", { forms: ["manzanilla", "te de manzanilla"], chip: "té de manzanilla",
    attrs: { price: 3000, cup: true, nat: "chamomile tea" } }),
  ent("mint_tea", "té | de | hierbabuena", "tea | of | mint", "m", { forms: ["hierbabuena", "yerbabuena", "te de yerbabuena", "te de menta", "menta"], chip: "té de hierbabuena",
    attrs: { price: 3000, cup: true, nat: "mint tea" } }),
  ent("green_tea", "té | verde", "tea | green", "m", { forms: ["te verde"], attrs: { price: 3000, iced: true, cup: true, nat: "green tea" } }),
  ent("black_tea", "té | negro", "tea | black", "m", { forms: ["te negro", "te ingles", "earl grey"], attrs: { price: 3000, iced: true, cup: true, nat: "black tea" } }),
  ent("horchata", "horchata", "rice drink", "f", { pl: "horchatas", forms: ["orchata", "horchatas", "agua de horchata"],
    attrs: { sized: true, cold: true, price: [3500, 4000, 4500], nat: "rice and cinnamon drink" } }),
  ent("jamaica", "agua | de | jamaica", "water | of | hibiscus", "f", { art: "un", def: "el", pl: "aguas | de | jamaica", ltPl: "waters | of | hibiscus",
    forms: ["jamaica", "agua de jamaica", "aguas de jamaica", "de jamaica"], chip: "agua de jamaica",
    attrs: { sized: true, cold: true, price: [3500, 4000, 4500], nat: "hibiscus water", natPl: "hibiscus waters" } }),
];

export const FOODS: EntityDef[] = [
  ent("concha", "concha", "sweet bun", "f", { pl: "conchas", forms: ["conchita", "conchas"], attrs: { kind: "pan", price: 2500 } }),
  ent("croissant", "cuernito", "croissant", "m", { pl: "cuernitos", ltPl: "croissants", forms: ["croissant", "cruasan", "cruasanes", "cuerno", "cuernitos", "croissants"], attrs: { kind: "pan", price: 3000, neutral: "croissant", neutralPl: "croissants", spain: "cruasán", spainPl: "cruasanes" } }),
  ent("donut", "dona", "doughnut", "f", { pl: "donas", ltPl: "doughnuts", forms: ["donas", "donut", "donuts", "dona de chocolate", "donut de chocolate"], attrs: { kind: "pan", price: 2500, spain: "dónut", spainPl: "dónuts", spainG: "m" } }),
  ent("pan", "pan", "pastry", "m", { pl: "panes", ltPl: "pastries", forms: ["pan dulce", "panes", "panecito", "pancito", "pan de dulce"], attrs: { generic: "pan" } }),
  ent("cookie", "galleta", "cookie", "f", { pl: "galletas", ltPl: "cookies", forms: ["galletas", "galletita", "galleta de chocolate"], attrs: { price: 2000 } }),
  ent("muffin", "mantecada", "muffin", "f", { pl: "mantecadas", ltPl: "muffins", forms: ["mantecadas", "muffin", "panque", "panquecito", "magdalena", "magdalenas"], attrs: { price: 2500, spain: "magdalena" } }),
  ent("torta", "torta | de | jamón", "sandwich | of | ham", "f", { pl: "tortas | de | jamón", ltPl: "sandwiches | of | ham",
    forms: ["torta", "tortas", "torta de jamon", "sandwich", "sandwich de jamon", "emparedado"], // outside Mexico a torta is a cake: the neutral and Spain texts say sándwich (audit 14 Nov 2026)
    attrs: { price: 6500, warm: true, nat: "ham torta (sandwich)", natPl: "ham tortas (sandwiches)", neutral: "sándwich | de | jamón", neutralPl: "sándwiches | de | jamón", neutralG: "m" } }),
];

export const SIZES: EntityDef[] = [
  ent("small", "chico", "small", "m", { forms: ["chica", "chiquito", "chiquita", "pequeno", "pequena", "corto", "tall", "el mas chico", "la mas chica", "el mas pequeno", "la mas pequena"], chip: "chico", attrs: { spain: "pequeño" } }),
  ent("medium", "mediano", "medium", "m", { forms: ["mediana", "regular", "normal", "medio", "el de en medio", "el de enmedio", "la de en medio"], chip: "mediano" }),
  ent("large", "grande", "large", "m", { forms: ["grandes", "grandote", "grandota", "el mas grande", "la mas grande", "extra grande", "venti"], chip: "grande" }),
];

export const MILKS: EntityDef[] = [
  ent("whole", "leche | entera", "milk | whole", "f", { art: "", forms: ["entera", "leche normal", "leche regular", "leche de vaca"], chip: "leche entera", attrs: { nat: "whole milk" } }),
  ent("lactose_free", "leche | deslactosada", "milk | lactose-free", "f", { art: "", forms: ["deslactosada", "sin lactosa", "leche sin lactosa"], chip: "deslactosada", attrs: { nat: "lactose-free milk", spain: "leche | sin lactosa" } }),
  ent("light", "leche | light", "milk | skim", "f", { art: "", forms: ["light", "descremada", "leche descremada", "baja en grasa", "leche baja en grasa", "desnatada", "leche desnatada"], chip: "light", attrs: { nat: "skim milk", spain: "leche | desnatada" } }),
  ent("oat", "leche | de | avena", "milk | of | oat", "f", { art: "", forms: ["avena", "de avena"], chip: "de avena", attrs: { extra: 1000, nat: "oat milk" } }),
  ent("almond", "leche | de | almendra", "milk | of | almond", "f", { art: "", forms: ["almendra", "de almendra", "almendras", "leche de almendras"], chip: "de almendra", attrs: { extra: 1000, nat: "almond milk" } }),
  ent("soy", "leche | de | soya", "milk | of | soy", "f", { art: "", forms: ["soya", "de soya", "soja", "de soja", "leche de soja"], chip: "de soya", attrs: { extra: 1000, nat: "soy milk", spain: "leche | de | soja" } }),
];

export const TEMPS: EntityDef[] = [
  ent("hot", "caliente", "hot", "m", { forms: ["calientito", "calientita"], chip: "caliente" }),
  ent("iced", "frío", "iced", "m", { forms: ["fria", "frios", "frias", "con hielo", "helado", "helada", "en las rocas"], chip: "frío" }),
];

export const byId = (id: string) => [...DRINKS, ...FOODS, ...SIZES, ...MILKS, ...TEMPS].find((e) => e.id === id)!;
const SIZE_IDX: Record<string, number> = { small: 0, medium: 1, large: 2 };

export interface Item {
  cat: "drink" | "food";
  id: string;
  qty: number;
  size?: string;
  milk?: string;
  noMilk?: boolean;
  temp?: string;
  extraShot?: boolean;
  decaf?: boolean;
  cupOf?: boolean;
}

export function itemPrice(it: Item): number {
  const e = byId(it.id);
  const p = e.attrs?.price;
  let base = Array.isArray(p) ? p[SIZE_IDX[it.size || "medium"]] : (p ?? 3000);
  if (it.milk) base += byId(it.milk).attrs?.extra ?? 0;
  if (it.temp === "iced" && !e.attrs?.cold) base += 1000;
  if (it.extraShot) base += 1500;
  return base * it.qty;
}
