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

/** Values that hang together or a range the code bounds; read in the conversation's code (file:line, 4 Nov 2026). */
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
  // s32-mercado.ts:447–448 a product's own price a kilo or a bunch (priceOf)
  "s32-mercado:price_kg": (b, sit) => itemValues(sit, "price").has(b.price as number),
  "s32-mercado:price_bunch": (b, sit) => itemValues(sit, "price").has(b.price as number),
  // s73-restaurant.ts:2212, :2227–2229 a dish's (or its kind's) price × 1–4 (the q1–q4 tags)
  "s73-restaurant:price_is": (b, sit) => times([...itemValues(sit, "price")], 4).has(b.price as number),
  // s67a-tickets.ts:1631–1632 a destination's one-way fare, and twice that for a round trip
  "s67a-tickets:price_one": (b, sit) => itemValues(sit, "fare").has(b.price as number),
  "s67a-tickets:price_round": (b, sit) => new Set([...itemValues(sit, "fare")].map((f) => f * 2)).has(b.price as number),
};
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
      const op = { "+": (x: number, y: number) => x + y, "-": (x: number, y: number) => x - y, "*": (x: number, y: number) => x * y } as Record<string, (x: number, y: number) => number>;
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
