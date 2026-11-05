// Which values a line with a value list can really be said with (docs/es/VOICES.md "The lines"). A conversation's
// value lists ({$price}: every price from $1 to $2,000…) are made for the lines whose value comes from the learner or
// from a sum; but many lines are only ever said with one fixed value (the doctor's fee, the museum guide's price),
// and some values hang together (a sale price is the price less the discount). Voicing such a line with every value
// of the list makes clips the game never plays.
//  • Fixed values, found in the code: every call that says the line (c.say("line", { price: FEE }), sayN(c, "line", g,
//    {…}), c.say(cond ? "a" : "b", {…})) is read, and a value given as a number, a module constant, a sum of those or
//    an item's own price (byId("sopa_lima").attrs!.price) is worked out. A line all of whose calls give a fixed value
//    gets only those values; a line said anywhere in another way (a variable, a template, a list) keeps its whole list.
//  • Values that hang together, or a range the code bounds, by hand (RULES), each with where it was read.
// Used by lines-es.ts. The table: EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-voices/reach-es.ts [s31 …]
import fs from "node:fs";
import path from "node:path";
import { parseAst } from "rolldown/parseAst";
import { placeholders } from "../../src/convo/compose";
import type { EntityDef, SituationDef } from "../../src/content/types";

type Binding = Record<string, unknown>;
const ROOT = path.resolve(import.meta.dirname, "../..");
const SIT_DIR = path.join(ROOT, "src/editions/es/content/situations");

/** Values that hang together or a range the code bounds, and the items an item line is really said with; read in the
 *  conversation's code (file:line, 4–5 Nov 2026) and checked against what the runs, the sims and the probes say
 *  (check-list-es.ts). A rule on an item line gets its binding ({ X: id } or { X: { id, qty } }: idOf). */
const RULES: Record<string, (b: Binding, sit: SituationDef) => boolean> = {
  // s31-doctor.ts:1340 cash_wait is said only with nothing paid yet: the fee (FEE = 50000)
  "s31-doctor:cash_wait": (b) => b.price === 50000,
  // :2056 short, :1340/:1522/:2066 left_is: the fee less what was paid, so less than the fee
  "s31-doctor:short": (b) => (b.price as number) < 50000 && b.total === 50000,
  "s31-doctor:left_is": (b) => (b.price as number) < 50000,
  // :2069 change_is: what was given less the fee, and more than MAX_CASH (200000) is never taken
  "s31-doctor:change_is": (b) => (b.price as number) <= 200000 - 50000,
  // s74-clothes.ts:1862 the sale price is the price less pct percent, rounded down to the peso (priceOf, :102)
  "s74-clothes:price_sale": (b) => b.amount === Math.floor(((b.price as number) * (100 - (b.pct as number))) / 10000) * 100,
  "s74-clothes:price_sale_pl": (b) => b.amount === Math.floor(((b.price as number) * (100 - (b.pct as number))) / 10000) * 100,
  // s77-salon.ts:1108 a visitor's inches (whole or half) and the centimetres Paty makes of them (× 2.5, rounded)
  "s77-salon:inch_n": (b) => INCH_PAIRS.has(`${b.num}|${b.cm}`),
  // s71b-gas.ts:39–40, :686 a full tank's total is the tank's cost (FILL_COSTS); any other total is less than a tank
  "s71b-gas:total_fill": (b) => [78640, 86150, 93780].includes(b.price as number),
  "s71b-gas:total_amount": (b) => (b.price as number) < 93780,
  // :830 the total is what is due: at most a full tank
  "s71b-gas:say_total": (b) => (b.price as number) <= 93780,
  // s75-pharmacy.ts:1284 the cheaper generic's own price; :1275 a product's price (or its generic's) × 1–3 boxes
  // (qtyFromTags, :118; up to 10 to be safe)
  "s75-pharmacy:cheaper_yes": (b, sit) => itemValues(sit, "generic").has(b.price as number),
  "s75-pharmacy:price_is": (b, sit) => times([...itemValues(sit, "price"), ...itemValues(sit, "generic")], 10).has(b.price as number),
  // s32-mercado.ts:447–448 a product's own price a bunch (priceOf)
  "s32-mercado:price_bunch": (b, sit) => itemValues(sit, "price").has(b.price as number),
  // s73-restaurant.ts:2212, :2227–2229 a dish's (or its kind's) price × 1–4 (the q1–q4 tags)
  "s73-restaurant:price_is": (b, sit) => times([...itemValues(sit, "price")], 4).has(b.price as number),
  // s67a-tickets.ts:1631–1632 a destination's one-way fare, and twice that for a round trip
  "s67a-tickets:price_one": (b, sit) => itemValues(sit, "fare").has(b.price as number),
  "s67a-tickets:price_round": (b, sit) => new Set([...itemValues(sit, "fare")].map((f) => f * 2)).has(b.price as number),
  // s64a-checkin.ts:382, :386 "¿{$sa} o {$sb}?": the two seats heard, never a seat against itself (seatWhich)
  "s64a-checkin:seat_which": (b) => (b.sa as { en?: string } | undefined)?.en !== (b.sb as { en?: string } | undefined)?.en,
  // s68-hotel.ts:57, :63, :635, :875 the walk-in offers say their own price (OFFER_LINE[…] is read nowhere else);
  // :887 the town's fee once(c, "eco", "eco_fee", { price: 3500 })
  "s68-hotel:walkin_twobeds": (b) => b.price === 250000,
  "s68-hotel:walkin_cheaper": (b) => b.price === 170000,
  "s68-hotel:eco_fee": (b) => b.price === 3500,
  // s70-museum.ts:145 the audio guide is handed over in a language the museum has (c.s.lang || "spanish");
  // :457, :582 no_lang names one it hasn't (attrs.none)
  "s70-museum:guide_here": (b, sit) => listHas(sit, "lang", idOf(b.X), (e) => !e.attrs?.none),
  "s70-museum:guides_here": (b, sit) => listHas(sit, "lang", idOf(b.X), (e) => !e.attrs?.none),
  "s70-museum:no_lang": (b, sit) => listHas(sit, "lang", idOf(b.X), (e) => !!e.attrs?.none),
  // s71a-rental.ts:135 rate(c) is a car size's daily rate: rate_is (:146, :1190, :1346, :1566) and the daily late-return
  // question (:352 with :391's rate(c)) say one of the five
  "s71a-rental:rate_is": (b, sit) => listValues(sit, "size", "rate").has(b.price as number),
  "s71a-rental:ret_more_q_day": (b, sit) => listValues(sit, "size", "rate").has(b.price as number),
  // s72-cafe.ts:98 itemPrice, :1171, :1176 price_is: one item (qty 1): its size's price, plus a milk's extra, plus $10
  // iced, plus $15 for an extra shot; so never more than the dearest of those together
  "s72-cafe:price_is": (b, sit) => (b.amount as number) <= maxOneItem(sit),
  // :991 "¿{X.the}, de qué tamaño?": a drink that comes in sizes (the size step's own test)
  "s72-cafe:ask_size_of": (b, sit) => listHas(sit, "drink", idOf(b.X), (e) => !!e.attrs?.sized && !e.attrs?.generic),
  // s76-dentist-call.ts:1706–1716 availability_q: the opening on the table (or "first") and the late one, or the late one
  // and the Friday morning; next Monday's two when the week is full; :1756 when_q says the same pair again
  // (c.s.choice, set only there). OFFERS (:73) names the openings; slot2's list is its values in that order.
  "s76-dentist-call:availability": (b, sit) => s76Pairs(sit)?.has(`${sayOf(b.slot)}|${sayOf(b.slot2)}`) ?? true,
  // s80-support-call.ts:128–142 offerWindow / bookTech say a window's own day with its hours ({ weekday: WEEKDAY[w.d],
  // win: win(k) }): the four windows, not every day × hours
  "s80-support-call:tech_offer": (b, sit) => s80Windows(sit)?.has(`${sayOf(b.weekday)}|${sayOf(b.win)}`) ?? true,
  "s80-support-call:tech_offer_alt": (b, sit) => s80Windows(sit)?.has(`${sayOf(b.weekday)}|${sayOf(b.win)}`) ?? true,
  "s80-support-call:tech_booked": (b, sit) => s80Windows(sit)?.has(`${sayOf(b.weekday)}|${sayOf(b.win)}`) ?? true,
};
/** s76's pairs of openings, as the slot values say them (null when OFFERS can't be read: then every pair stays). */
const s76Cache = new Map<string, Set<string> | null>();
function s76Pairs(sit: SituationDef): Set<string> | null {
  if (s76Cache.has(sit.id)) return s76Cache.get(sit.id)!;
  const offers = fileOf(sit.id)?.consts.get("OFFERS");
  const keys: string[] = offers?.type === "ObjectExpression" ? offers.properties.map((p: Node) => p.key?.name ?? p.key?.value) : [];
  const vals = (sit.domains?.slot2?.() ?? []) as unknown[];
  let out: Set<string> | null = null;
  if (keys.length && keys.length === vals.length && keys.includes("late") && keys.includes("morning") && keys.includes("monday_am") && keys.includes("monday")) {
    const say = (k: string) => sayOf(vals[keys.indexOf(k)]);
    out = new Set(keys.filter((k) => k !== "late").map((k) => `${say(k)}|${say("late")}`));
    out.add(`${say("late")}|${say("morning")}`).add(`${say("monday_am")}|${say("monday")}`);
  }
  s76Cache.set(sit.id, out);
  return out;
}
const sayOf = (v: unknown) => (v && typeof v === "object" ? String((v as { say?: string }).say) : String(v));
/** The id of an item bound to a placeholder: "latte" or { id: "latte", qty: 2 }. */
export const idOf = (v: unknown): string | undefined => (typeof v === "string" ? v : (v as { id?: string } | null | undefined)?.id);
/** Is `id` in the conversation's `list`, and does it pass `test`? */
function listHas(sit: SituationDef, list: string, id: string | undefined, test: (e: EntityDef) => boolean): boolean {
  const e = id ? sit.entities?.[list]?.find((x) => x.id === id) : undefined;
  return !!e && test(e);
}
/** One attribute's values in one item list (the car sizes' rates, not the extras'). */
function listValues(sit: SituationDef, list: string, attr: string): Set<number> {
  const out = new Set<number>();
  for (const e of sit.entities?.[list] ?? []) { const v = (e.attrs as Record<string, unknown> | undefined)?.[attr]; if (typeof v === "number") out.add(v); }
  return out;
}
/** s72-cafe: the dearest single item (itemPrice, s72-cafe.ts:98): the largest size's price, the dearest milk, iced, an
 *  extra shot. */
function maxOneItem(sit: SituationDef): number {
  const all = Object.values(sit.entities ?? {}).flat();
  const price = Math.max(...all.map((e) => { const p = e.attrs?.price; return Array.isArray(p) ? Math.max(...p) : typeof p === "number" ? p : 3000; }).filter((x) => x > 0));
  const milk = Math.max(0, ...(sit.entities?.milk ?? []).map((e) => (e.attrs?.extra as number) ?? 0));
  return price + milk + 1000 + 1500;
}

/** Item lists an item line is said with, read in its code, for a line the runs hear with fewer (the line list adds the
 *  lists heard). */
export const LISTS: Record<string, string[]> = {
  // s73-restaurant.ts:1858–1865 serve: the main dish, else the starter, else the first food ordered (a side, a dessert)
  "s73-restaurant:serve": ["main", "starter", "side", "dessert"],
};

/** Lines the list can't expand on its own (two items, or an item and a value, in one line): every binding they can
 *  really have, read in the conversation's code. A line like that with no entry here is voiced only as the runs, sims
 *  and probes say it, and lines-es.ts warns about it. */
export const BINDINGS: Record<string, (sit: SituationDef) => Binding[]> = {
  // s66-taxi.ts:90–91 fareOf is c.s.price ?? the place's own fare, and every fare_is call (:502, :552, :578, :590, :621)
  // comes before any lower price (c.s.price unset, or reset with the new place): a place and its own fare. The airport
  // (here) is never a ride.
  "s66-taxi:fare_is": (sit) => (sit.entities?.dest ?? []).filter((e) => !e.attrs?.here).map((e) => ({ X: e.id, fare: e.attrs!.fare })),
  // s74-clothes.ts:109 sayN says "<line>_pl" for a garment worn in the plural (attrs.many, bound with qty 2: :97) and
  // the plain line for the others; :182 color_list names the garment's own three colors (colorsOf), :1944 color_yes
  // one of them (setColor accepts only those)
  "s74-clothes:color_list": (sit) => garments(sit, false).map((e) => ({ X: { id: e.id, qty: 1 }, ...abc(e) })),
  "s74-clothes:color_list_pl": (sit) => garments(sit, true).map((e) => ({ X: { id: e.id, qty: 2 }, ...abc(e) })),
  "s74-clothes:color_yes": (sit) => garments(sit, false).flatMap((e) => colors(e).map((C) => ({ X: { id: e.id, qty: 1 }, C }))),
  "s74-clothes:color_yes_pl": (sit) => garments(sit, true).flatMap((e) => colors(e).map((C) => ({ X: { id: e.id, qty: 2 }, C }))),
  // s32-mercado.ts:816–822 askPrice: a product (qty 2: "los aguacates") at its own price (priceOf): a kilo's for what is
  // sold by the kilo, a piece's for the rest but bunches (price_piece for a feminine noun, price_piece_m otherwise)
  "s32-mercado:price_kg_pl": (sit) => products(sit, (e) => e.attrs?.unit === "kg").map((e) => ({ X: { id: e.id, qty: 2 }, price: e.attrs!.price })),
  "s32-mercado:price_piece": (sit) => products(sit, (e) => e.attrs?.unit === "pza" && e.g === "f").map((e) => ({ X: { id: e.id, qty: 2 }, price: e.attrs!.price })),
  "s32-mercado:price_piece_m": (sit) => products(sit, (e) => e.attrs?.unit === "pza" && e.g !== "f").map((e) => ({ X: { id: e.id, qty: 2 }, price: e.attrs!.price })),
  // :127–140 amountSay: kilos said back with their number (the list: num), what is sold by the kilo (qty 2); bunches
  // (qty 1) with theirs
  "s32-mercado:got_kilos": (sit) => products(sit, (e) => e.attrs?.unit === "kg").flatMap((e) => nums(sit, "num").map((num) => ({ X: { id: e.id, qty: 2 }, num }))),
  "s32-mercado:got_kilos_half": (sit) => products(sit, (e) => e.attrs?.unit === "kg").flatMap((e) => nums(sit, "num").map((num) => ({ X: { id: e.id, qty: 2 }, num }))),
  "s32-mercado:got_bunches": (sit) => products(sit, (e) => e.attrs?.unit === "manojo").flatMap((e) => nums(sit, "num").map((num) => ({ X: { id: e.id, qty: 1 }, num }))),
  // s71a-rental.ts:143, :1563, :1565 a car size at its own rate; :295–299 one extra at its own rate (two: no item)
  "s71a-rental:rate_size": (sit) => (sit.entities?.size ?? []).map((e) => ({ X: e.id, price: e.attrs!.rate })),
  "s71a-rental:extra_quote": (sit) => (sit.entities?.extra ?? []).map((e) => ({ X: e.id, price: e.attrs!.rate })),
  // :62–63 a return n days on falls on ORDER[(n − 1) % 7]; past a week (n > 7, the list: num) ret_long, ret_answer_long
  // and ret_confirm_long say n with that day (:341–342, :369, :389, :1248; setRet keeps retDay = dayAfter(retN))
  "s71a-rental:ret_long": (sit) => longReturns(sit),
  "s71a-rental:ret_answer_long": (sit) => longReturns(sit),
  "s71a-rental:ret_confirm_long": (sit) => longReturns(sit),
  // :352, :391–394 a later return within the week (n ≤ 7): its day and the car's rate × the days added (1 to n − 1)
  "s71a-rental:ret_more_q": (sit) => {
    const order = literal(fileOf(sit.id)?.consts.get("ORDER")) as string[] | undefined;
    if (!order) return [];
    const rates = [...listValues(sit, "size", "rate")];
    return Array.from({ length: 6 }, (_, i) => i + 2).flatMap((n) => rates.flatMap((r) => Array.from({ length: n - 1 }, (_, d) => ({ X: order[n - 1], price: r * (d + 1) }))));
  },
  // :127–132 amountSay: pieces said back with their number ("Cuatro mangos..."): what is sold by the piece, or anything
  // bought by the piece ("tres aguacates": b.pcs); one, or the list's numbers
  "s32-mercado:got_pieces": (sit) => products(sit, () => true).flatMap((e) => [1, ...nums(sit, "num")].map((qty) => ({ X: qty === 1 ? e.id : { id: e.id, qty } }))),
  // s65b-baggage.ts:251–254 sayEcho: the bag type (not the plain "bag") with its color ("azul marino" has echo_navy)
  "s65b-baggage:echo": (sit) => (sit.entities?.bagtype ?? []).filter((e) => e.id !== "bag").flatMap((t) => (sit.entities?.color ?? []).filter((c) => c.id !== "navy").map((c) => ({ X: { id: t.id, mods: [c.id] } }))),
  // s91a-lost-wallet.ts:125 itemNp: the lost item with its color and/or material, else its size, else nothing: :922 found,
  // :1091 describe_echo, :1099 fix_echo
  "s91a-lost-wallet:describe_echo": (sit) => described(sit),
  "s91a-lost-wallet:fix_echo": (sit) => described(sit),
  "s91a-lost-wallet:found": (sit) => described(sit),
  // s91b-police.ts:133–136 itemNp: with a color, the color and the material; else the material or the size: :1364 found
  // (the finder's color, or none), :1514 describe_echo, :1659 found_sure
  "s91b-police:describe_echo": (sit) => described(sit),
  "s91b-police:found": (sit) => described(sit),
  "s91b-police:found_sure": (sit) => described(sit),
  // s75-pharmacy.ts:2198 genPrices: a product's brand-name price and its generic's, together (products with a generic)
  "s75-pharmacy:generic_prices": (sit) => (sit.entities?.product ?? []).filter((e) => typeof e.attrs?.generic === "number").map((e) => ({ price: e.attrs!.price, amount: e.attrs!.generic })),
  // p26-complaint.ts:469–473 dayLine: a delivery day (not tomorrow: its own line) with Monday's window (W_MON, :66)
  "p26-complaint:brenda_delivery_day": (sit) => {
    const w = literal(fileOf(sit.id)?.consts.get("W_MON"));
    return w ? (sit.entities?.dday ?? []).filter((e) => e.id !== "tomorrow").map((e) => ({ X: e.id, win: w })) : [];
  },
};
const products = (sit: SituationDef, test: (e: EntityDef) => boolean) => (sit.entities?.product ?? []).filter(test);
/** s91a / s91b: a lost item described: nothing, a color, a material, a color and a material, or a size. */
function described(sit: SituationDef): Binding[] {
  const ids = (l: string) => (sit.entities?.[l] ?? []).map((e) => e.id);
  const C = ids("color"), M = ids("material"), Z = ids("size");
  const mods: string[][] = [[], ...C.map((c) => [c]), ...M.map((m) => [m]), ...C.flatMap((c) => M.map((m) => [c, m])), ...Z.map((z) => [z])];
  return ids("item").flatMap((id) => mods.map((m) => ({ X: { id, mods: m } })));
}
const nums = (sit: SituationDef, v: string) => (sit.domains?.[v]?.() ?? []) as number[];
function longReturns(sit: SituationDef): Binding[] {
  const order = literal(fileOf(sit.id)?.consts.get("ORDER")) as string[] | undefined;
  return order ? nums(sit, "num").filter((n) => n > 7).map((n) => ({ num: n, X: order[(n - 1) % 7] })) : [];
}
/** s80: the technician's windows as said: "<the window's day>|<its hours>" (WINDOWS and WEEKDAY, s80-support-call.ts:35, :45). */
function s80Windows(sit: SituationDef): Set<string> | null {
  const w = literal(fileOf(sit.id)?.consts.get("WINDOWS")) as Record<string, { d: string; say: string }> | undefined;
  const day = literal(fileOf(sit.id)?.consts.get("WEEKDAY")) as Record<string, { say: string }> | undefined;
  return w && day ? new Set(Object.values(w).map((x) => `${day[x.d]?.say}|${x.say}`)) : null;
}
/** A constant written out in the code (objects, arrays, strings, numbers), or undefined. */
function literal(n0: Node | undefined): unknown {
  if (!n0) return undefined;
  const n = unwrap(n0);
  if (n.type === "Literal") return n.value;
  if (n.type === "ArrayExpression") { const a = n.elements.map((x: Node) => literal(x)); return a.some((x: unknown) => x === undefined) ? undefined : a; }
  if (n.type === "ObjectExpression") {
    const o: Record<string, unknown> = {};
    for (const p of n.properties) { if (p.type !== "Property" || p.computed) return undefined; const v = literal(p.value); if (v === undefined) return undefined; o[p.key?.name ?? p.key?.value] = v; }
    return o;
  }
  return undefined;
}
const garments = (sit: SituationDef, many: boolean) => (sit.entities?.clothing ?? []).filter((e) => !!e.attrs?.many === many);
const colors = (e: EntityDef) => (e.attrs?.colors as string[] | undefined) ?? [];
const abc = (e: EntityDef) => { const [A, B, C] = colors(e); return { A, B, C }; };
/** Every value of one attribute among a conversation's items (a price, a generic's price, a fare). */
function itemValues(sit: SituationDef, attr: string): Set<number> {
  const out = new Set<number>();
  for (const list of Object.values(sit.entities || {})) for (const e of list) { const v = (e.attrs as Record<string, unknown> | undefined)?.[attr]; if (typeof v === "number") out.add(v); }
  return out;
}
const times = (xs: number[], n: number) => new Set(xs.flatMap((x) => Array.from({ length: n }, (_, i) => x * (i + 1))));
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const INCH_PAIRS = new Set<string>();
for (let i = 2; i <= 48; i++) { const inches = i / 4; INCH_PAIRS.add(`${clamp(Math.round(inches), 2, 8)}|${clamp(clamp(Math.round(inches * 2.5), 1, 20), 2, 20)}`); }

// ---------------------------------------------------------------- reading the calls
type Node = { type: string; [k: string]: any };
const parsed = new Map<string, { ast: Node; consts: Map<string, Node> }>();
function fileOf(sitId: string): { ast: Node; consts: Map<string, Node> } | null {
  if (parsed.has(sitId)) return parsed.get(sitId)!;
  const f = path.join(SIT_DIR, `${sitId}.ts`);
  if (!fs.existsSync(f)) return null;
  const ast = parseAst(fs.readFileSync(f, "utf8"), { lang: "ts" }) as Node;
  const consts = new Map<string, Node>();
  for (let st of ast.body as Node[]) {
    if (st.type === "ExportNamedDeclaration" && st.declaration) st = st.declaration;
    if (st.type === "VariableDeclaration" && st.kind === "const") for (const d of st.declarations) if (d.id?.type === "Identifier" && d.init) consts.set(d.id.name, d.init);
  }
  const r = { ast, consts };
  parsed.set(sitId, r);
  return r;
}
function walk(n: unknown, f: (n: Node, parent: Node | null) => void, parent: Node | null = null) {
  if (!n || typeof n !== "object") return;
  if (Array.isArray(n)) { for (const x of n) walk(x, f, parent); return; }
  const node = n as Node;
  if (typeof node.type === "string") f(node, parent);
  for (const [k, v] of Object.entries(node)) if (k !== "type" && k !== "start" && k !== "end" && k !== "range" && k !== "loc") walk(v, f, typeof node.type === "string" ? node : parent);
}
/** The string literals a line id can be in an argument: "a", cond ? "a" : "b", x || "a". */
function idsIn(n: Node | undefined): string[] {
  if (!n) return [];
  if (n.type === "Literal" && typeof n.value === "string") return [n.value];
  if (n.type === "ConditionalExpression") return [...idsIn(n.consequent), ...idsIn(n.alternate)];
  if (n.type === "LogicalExpression") return [...idsIn(n.left), ...idsIn(n.right)];
  return [];
}
const unwrap = (n: Node): Node => (["TSNonNullExpression", "TSAsExpression", "TSSatisfiesExpression", "ParenthesizedExpression", "TSTypeAssertion"].includes(n.type) ? unwrap(n.expression) : n);

/** The fixed values an expression can have, or null when it depends on the conversation. */
function evaluate(n0: Node, sit: SituationDef, consts: Map<string, Node>, depth = 0): unknown[] | null {
  if (depth > 12) return null;
  const n = unwrap(n0);
  const ev = (x: Node) => evaluate(x, sit, consts, depth + 1);
  switch (n.type) {
    case "Literal": return typeof n.value === "number" || typeof n.value === "string" ? [n.value] : null;
    case "Identifier": { const d = consts.get(n.name); return d && /^[A-Z][A-Z0-9_]*$/.test(n.name) ? ev(d) : null; }
    case "UnaryExpression": { const a = n.operator === "-" ? ev(n.argument) : null; return a && a.every((x) => typeof x === "number") ? a.map((x) => -(x as number)) : null; }
    case "BinaryExpression": {
      const a = ev(n.left), b = ev(n.right);
      if (!a || !b || a.length * b.length > 16 || ![...a, ...b].every((x) => typeof x === "number")) return null;
      const op = { "+": (x: number, y: number) => x + y, "-": (x: number, y: number) => x - y, "*": (x: number, y: number) => x * y, "/": (x: number, y: number) => x / y } as Record<string, (x: number, y: number) => number>;
      return op[n.operator] ? [...new Set(a.flatMap((x) => b.map((y) => op[n.operator](x as number, y as number))))] : null;
    }
    case "ConditionalExpression": { const a = ev(n.consequent), b = ev(n.alternate); return a && b ? [...new Set([...a, ...b])] : null; }
    case "MemberExpression": {
      // byId("x").attrs.price, byId("x").attrs!.rate: an item's own value
      const prop = n.computed ? null : n.property?.name;
      const obj = unwrap(n.object);
      if (!prop) return null;
      if (obj.type === "MemberExpression" && !obj.computed && obj.property?.name === "attrs") {
        const call = unwrap(obj.object);
        if (call.type === "CallExpression" && call.callee?.type === "Identifier" && call.callee.name === "byId" && call.arguments.length === 1 && call.arguments[0].type === "Literal") {
          const e = entity(sit, call.arguments[0].value);
          const v = (e?.attrs as Record<string, unknown> | undefined)?.[prop];
          return typeof v === "number" ? [v] : null;
        }
      }
      return null;
    }
    default: return null;
  }
}
function entity(sit: SituationDef, id: string): EntityDef | undefined {
  for (const l of Object.values(sit.entities || {})) { const e = l.find((x) => x.id === id); if (e) return e; }
  return undefined;
}

/** Who says a line where the code chooses: a speaker helper (`const K = (c, line) => { c.speaker("kate"); c.say(line) }`)
 *  called with the line's id, or c.speaker("x") earlier in the same block as c.say("line"). The line list adds these
 *  to the speakers heard (a call site no run reached still says its line in that voice). */
const speakerCache = new Map<string, Map<string, Set<string>>>();
export function codeSpeakers(sit: SituationDef): Map<string, Set<string>> {
  if (speakerCache.has(sit.id)) return speakerCache.get(sit.id)!;
  const out = new Map<string, Set<string>>();
  const file = fileOf(sit.id);
  const put = (lid: string, who: string) => { if (!sit.lines[lid]) return; let s = out.get(lid); if (!s) out.set(lid, (s = new Set())); s.add(who); };
  const isCall = (n: Node, name: string) => n?.type === "CallExpression" && n.callee?.type === "MemberExpression" && n.callee.property?.name === name;
  const speakerLit = (n: Node) => (isCall(n, "speaker") && n.arguments[0]?.type === "Literal" && typeof n.arguments[0].value === "string" ? n.arguments[0].value as string : undefined);
  if (file) {
    // 1. the speaker helpers: a function whose body says one of its own parameters after c.speaker("x")
    const helpers = new Map<string, { who: string; arg: number }>();
    const fnOf = (d: Node) => { const f = d && unwrap(d); return f && (f.type === "ArrowFunctionExpression" || f.type === "FunctionExpression") ? f : null; };
    const consider = (name: string, fn: Node) => {
      const params: string[] = (fn.params ?? []).map((p: Node) => (p.type === "Identifier" ? p.name : p.left?.name ?? ""));
      let who: string | undefined, arg = -1;
      walk(fn.body, (n) => {
        const w = speakerLit(n);
        if (w) who = w;
        if (isCall(n, "say") && n.arguments[0]?.type === "Identifier") { const i = params.indexOf(n.arguments[0].name); if (i >= 0) arg = i; }
      });
      if (who && arg >= 0) helpers.set(name, { who, arg });
    };
    for (let st of file.ast.body as Node[]) {
      if (st.type === "ExportNamedDeclaration" && st.declaration) st = st.declaration;
      if (st.type === "FunctionDeclaration" && st.id?.name) consider(st.id.name, st);
      if (st.type === "VariableDeclaration") for (const d of st.declarations) { const fn = fnOf(d.init); if (d.id?.type === "Identifier" && fn) consider(d.id.name, fn); }
    }
    walk(file.ast, (n) => {
      if (n.type !== "CallExpression" || n.callee?.type !== "Identifier") return;
      const h = helpers.get(n.callee.name);
      if (h) for (const id of idsIn(n.arguments[h.arg] && unwrap(n.arguments[h.arg]))) put(id, h.who);
    });
    // 2. c.speaker("x"); … c.say("line") later in the same block (not inside another function)
    const scan = (stmts: Node[]) => {
      let who: string | undefined;
      for (const st of stmts) {
        if (st.type === "ExpressionStatement") { const w = speakerLit(unwrap(st.expression)); if (w) { who = w; continue; } }
        if (!who) continue;
        const w = who;
        const inner = (n: unknown): void => {
          if (!n || typeof n !== "object") return;
          if (Array.isArray(n)) { for (const x of n) inner(x); return; }
          const x = n as Node;
          if (["ArrowFunctionExpression", "FunctionExpression", "FunctionDeclaration"].includes(x.type)) return;
          if (isCall(x, "say")) for (const id of idsIn(x.arguments[0] && unwrap(x.arguments[0]))) put(id, w);
          if (x.type === "ExpressionStatement" && speakerLit(unwrap(x.expression))) return; // another switch: its own block decides
          for (const [k, v] of Object.entries(x)) if (k !== "type" && k !== "start" && k !== "end") inner(v);
        };
        inner(st);
      }
    };
    walk(file.ast, (n) => { if (n.type === "BlockStatement" || n.type === "Program") scan(n.body); });
  }
  speakerCache.set(sit.id, out);
  return out;
}

export interface Reach { line: string; how: "fixed" | "rule" | "list"; values?: Record<string, unknown[]>; why?: string }
const cache = new Map<string, Map<string, Reach>>();
/** For each line with values in a conversation: fixed values (from its calls), a rule, or its whole list. */
export function reachOf(sit: SituationDef): Map<string, Reach> {
  if (cache.has(sit.id)) return cache.get(sit.id)!;
  const out = new Map<string, Reach>();
  const file = fileOf(sit.id);
  const valueLines = new Map<string, string[]>();
  for (const [lid, variants] of Object.entries(sit.lines)) {
    const names = [...new Set(variants.flatMap((v) => placeholders(v).values))];
    if (names.length) valueLines.set(lid, names);
  }
  const calls = new Map<string, Node[]>(); // line → the vars objects of its calls (an empty object: none given)
  const other = new Set<string>(); // lines also named some other way
  if (file) {
    const inCall = new Set<Node>();
    // the calls that say a line: c.say(…), cc.say(…), and the conversations' own say… helpers (sayN, sayP)
    const saying = (n: Node) => (n.callee?.type === "MemberExpression" && n.callee.property?.name === "say") || (n.callee?.type === "Identifier" && /^say([A-Z]\w*)?$/.test(n.callee.name));
    walk(file.ast, (n) => {
      if (n.type !== "CallExpression" || !saying(n)) return;
      const ids = n.arguments.flatMap((a: Node) => idsIn(unwrap(a)));
      const lineIds = ids.filter((id: string) => valueLines.has(id));
      if (!lineIds.length) return;
      const obj = n.arguments.map(unwrap).find((a: Node) => a.type === "ObjectExpression");
      for (const id of lineIds) { if (!calls.has(id)) calls.set(id, []); calls.get(id)!.push(obj ?? { type: "ObjectExpression", properties: [] }); }
      walk(n.arguments, (x) => { if (x.type === "Literal") inCall.add(x); });
    });
    // a line id written anywhere else could be said some other way (a helper, a variable, a list): its whole list stays.
    // Not counted: the places that name a step, an intent, a hint or a twist with the same word, and comparisons
    const NAMES_ONLY = new Set(["id", "intent", "hint", "step"]), LISTS_ONLY = new Set(["expects", "hints", "not", "auto"]), CALLS_ONLY = new Set(["omit", "twist", "expect", "event"]);
    const calleeName = (n: Node | null) => n?.callee?.property?.name ?? n?.callee?.name;
    const stack: Node[] = [];
    const visit = (x: unknown) => {
      if (!x || typeof x !== "object") return;
      if (Array.isArray(x)) { for (const y of x) visit(y); return; }
      const n = x as Node;
      if (n.type === "Literal" && typeof n.value === "string" && valueLines.has(n.value) && !inCall.has(n)) {
        const p = stack[stack.length - 1], gp = stack[stack.length - 2];
        const harmless = (p?.type === "Property" && (p.key === n || NAMES_ONLY.has(p.key?.name ?? p.key?.value)))
          || (p?.type === "ArrayExpression" && ((gp?.type === "Property" && LISTS_ONLY.has(gp.key?.name ?? gp.key?.value)) || (gp?.type === "CallExpression" && CALLS_ONLY.has(calleeName(gp)))))
          || (p?.type === "CallExpression" && CALLS_ONLY.has(calleeName(p)))
          || (p?.type === "BinaryExpression" && /^[!=]==?$/.test(p.operator)) || p?.type === "SwitchCase" || p?.type === "TSLiteralType";
        if (!harmless) other.add(n.value);
      }
      if (typeof n.type === "string") stack.push(n);
      for (const [k, v] of Object.entries(n)) if (k !== "type" && k !== "start" && k !== "end" && k !== "range" && k !== "loc") visit(v);
      if (typeof n.type === "string") stack.pop();
    };
    visit(file.ast);
  }
  for (const [lid, names] of valueLines) {
    if (RULES[`${sit.id}:${lid}`]) { out.set(lid, { line: lid, how: "rule", why: "values that hang together or a bounded range (reach-es.ts RULES)" }); continue; }
    // a plural twin said through its base line (sayN: line + "_pl")
    const base = !calls.has(lid) && /_pl$/.test(lid) ? lid.replace(/_pl$/, "") : lid;
    const objs = calls.get(base);
    if (!file || !objs?.length || other.has(lid) || other.has(base)) { out.set(lid, { line: lid, how: "list", why: !objs?.length ? "no call found that names it" : "also named another way" }); continue; }
    const values: Record<string, unknown[]> = {};
    let fixed = true;
    for (const name of names) {
      const set = new Set<unknown>();
      for (const o of objs) {
        const p = o.properties.find((q: Node) => q.type === "Property" && !q.computed && (q.key?.name ?? q.key?.value) === name);
        const v = p && !p.shorthand ? evaluate(p.value, sit, file.consts) : null;
        if (!v) { fixed = false; break; }
        for (const x of v) set.add(x);
      }
      if (!fixed) break;
      values[name] = [...set];
    }
    out.set(lid, fixed ? { line: lid, how: "fixed", values } : { line: lid, how: "list", why: "a value from the conversation" });
  }
  cache.set(sit.id, out);
  return out;
}

/** The test for a line's value bindings: null keeps them all. */
export function reachFilter(sit: SituationDef, lid: string): ((b: Binding) => boolean) | null {
  const rule = RULES[`${sit.id}:${lid}`];
  if (rule) return (b) => rule(b, sit);
  const r = reachOf(sit).get(lid);
  if (r?.how !== "fixed" || !r.values) return null;
  const allowed = Object.entries(r.values).map(([k, vs]) => [k, new Set(vs.map((v) => JSON.stringify(v)))] as const);
  return (b) => allowed.every(([k, vs]) => !(k in b) || vs.has(JSON.stringify(b[k])));
}

// ---------------------------------------------------------------- the table
if (process.argv[1]?.endsWith("reach-es.ts")) {
  const { SITUATIONS } = await import("../../src/content/situations");
  const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  for (const sit of SITUATIONS.filter((s) => !only.length || only.some((o) => s.id.startsWith(o)))) {
    for (const r of reachOf(sit).values()) {
      const names = [...new Set(sit.lines[r.line].flatMap((v) => placeholders(v).values))];
      const sizes = names.map((n) => `${n}(${sit.domains?.[n]?.().length ?? "—"})`).join(" × ");
      console.log(`${sit.id}:${r.line}`.padEnd(44) + ` ${sizes.padEnd(28)} ${r.how}${r.values ? " " + JSON.stringify(r.values) : ""}${r.why ? ` (${r.why})` : ""}`);
    }
  }
}
