// Which lines a conversation can really say, and with which items (owner, 18 Nov 2026: the voicing list's static fill
// voiced `ask_years_field2` with all 105 items of s87's four lists, though only one field is ever asked that way, and
// `yes_next_the`, which no code says at all). Read from the conversation's own code, no play needed:
//  • `referenced(sit, lid)`: the line's id appears in some code as a string (c.say("lid"), cond ? "a" : "b", a list
//    of ids, an id built from a prefix: `thanks_${n}` or "thanks_" + n). A line no code names is never said.
//  • `itemsFor(sit, lid)`: the items its {X} is said with, from every call that says it: an item id written there
//    ("leg_press"), or returned by a helper the call uses (const exercise = (c) => c.s.pain ? "chest_press" : "leg_press"),
//    or a list named in the expression (m.field → the `field` list); a ternary on a helper that reads an attribute
//    (fieldMulti(m.field) ? "ask_years_field2" : …, fieldMulti = … attrs?.multi) keeps only the items with (or without)
//    it. `undefined` when some call can't be read: the caller decides (the lists the play showed, or none).
// tools/reach.ts adds what simulated play reaches; tools/enumerate.ts fills {X} only with these items.
import fs from "node:fs";
import path from "node:path";
import type { EntityDef, SituationDef } from "../src/content/types";

const ROOT = path.resolve(import.meta.dirname, "..");
const sourceCache = new Map<string, string>();
const read = (f: string) => { let s = sourceCache.get(f); if (s === undefined) sourceCache.set(f, (s = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "")); return s; };

/** The situation's file, and the shared code that may say a conversation's lines (global handlers, the engine). */
const filesCache = new Map<string, { own: string; shared: string }>();
function files(sit: SituationDef): { own: string; shared: string } {
  const hit = filesCache.get(sit.id);
  if (hit) return hit;
  const dirs = [path.join(ROOT, "src/content"), path.join(ROOT, "src/editions/es/content")];
  const own = dirs.map((d) => read(path.join(d, "situations", sit.id + ".ts"))).join("\n");
  const shared: string[] = [];
  // (and the game's own code: the surf lesson's cues, the grotto's stones say lines too)
  const walk = (d: string, deep: boolean) => {
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) { if (deep && f.name !== "situations") walk(p, deep); }
      else if (/\.tsx?$/.test(f.name)) shared.push(read(p));
    }
  };
  for (const d of dirs) walk(d, false);
  for (const d of ["src/convo", "src/editions/es/convo", "src/game", "src/editions/es/game", "src/ui"]) walk(path.join(ROOT, d), true);
  const out = { own, shared: shared.join("\n") };
  filesCache.set(sit.id, out);
  return out;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The strings code writes, once per text: whole ids, prefixes it builds ids from, suffixes it adds. */
interface Names { lits: Set<string>; pre: string[]; suf: string[] }
const namesCache = new Map<string, Names>();
function names(key: string, text: string): Names {
  let n = namesCache.get(key);
  if (n) return n;
  n = { lits: new Set(), pre: [], suf: [] };
  for (const m of text.matchAll(/["'`]([A-Za-z0-9_]+)["'`]/g)) n.lits.add(m[1]);
  for (const m of text.matchAll(/`([A-Za-z0-9_]+)\$\{/g)) if (m[1].length >= 2) n.pre.push(m[1]);
  for (const m of text.matchAll(/["']([A-Za-z0-9_]+)["']\s*\+/g)) if (m[1].length >= 3) n.pre.push(m[1]);
  for (const m of text.matchAll(/(?:\}|\+\s*["'])(_[A-Za-z0-9_]+)[`"']/g)) n.suf.push(m[1]);
  namesCache.set(key, n);
  return n;
}

/** Does any code name this line (as a string, or by a prefix or a suffix it builds the id with)? */
export function referenced(sit: SituationDef, lid: string, depth = 0): boolean {
  const { own, shared } = files(sit);
  for (const n of [names(sit.id, own), names("", shared)]) {
    if (n.lits.has(lid)) return true;
    if (n.pre.some((p) => lid.startsWith(p) && lid !== p)) return true;
    if (depth < 2 && n.suf.some((x) => lid.endsWith(x) && lid.length > x.length && referenced(sit, lid.slice(0, -x.length), depth + 1))) return true;
  }
  return false;
}

/** `referenced`, or a word code writes that the id begins or ends with (25 Nov 2026): ids put together from parts in
 *  ways `referenced` does not read, `(rel === "across" ? "yes_across" : "yes_next") + (hasThe(p) ? "_the" : "")` (s62's
 *  yes_next_the), `(again ? "rec_again_" : "rec_q_") + pro` (PC s75's rec_q_lo). A line this also misses is not said. */
export function mentioned(sit: SituationDef, lid: string): boolean {
  if (referenced(sit, lid)) return true;
  const { own, shared } = files(sit);
  for (const n of [names(sit.id, own), names("", shared)]) {
    for (const lit of n.lits) {
      if (lit === lid) return true;
      if (lit.length >= 4 && lid.startsWith(lit) && /[_]$|_/.test(lit)) return true;
      if (lit.length >= 3 && lit.startsWith("_") && lid.endsWith(lit)) return true;
    }
  }
  return false;
}

/** The text of the call around position `at`: from its "(" to the matching ")". */
function callAround(src: string, at: number): { head: string; args: string } | null {
  let depth = 0, open = -1;
  for (let i = at; i >= Math.max(0, at - 400); i--) {
    const ch = src[i];
    if (ch === ")" || ch === "]" || ch === "}") depth++;
    else if (ch === "(" || ch === "[" || ch === "{") { if (depth === 0) { if (ch === "(") { open = i; break; } return null; } depth--; }
  }
  if (open < 0) return null;
  depth = 0;
  for (let i = open; i < Math.min(src.length, open + 1500); i++) {
    const ch = src[i];
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") { depth--; if (depth === 0) return { head: src.slice(open + 1, at), args: src.slice(at, i) }; }
  }
  return null;
}

/** A helper's body: `const name = (…) => …;` or `function name(…) { … }`, as text. */
function helperBody(src: string, name: string): string | undefined {
  const m = new RegExp(`(?:const|let)\\s+${esc(name)}\\s*=\\s*(?:\\([^)]*\\)|[A-Za-z_]\\w*)\\s*(?::[^=]+)?=>([^;]*);`).exec(src)
    ?? new RegExp(`function\\s+${esc(name)}\\s*\\([^)]*\\)[^{]*\\{([\\s\\S]{0,600}?)\\n\\}`).exec(src);
  return m?.[1];
}

/** Items an expression stands for, or undefined when it can't be read. */
function itemsOfExpr(expr: string, src: string, sit: SituationDef, before: string, depth = 0): EntityDef[] | undefined {
  const lists = sit.entities ?? {};
  const all = Object.values(lists).flat();
  const byId = new Map(all.map((e) => [e.id, e]));
  const ids = [...expr.matchAll(/["']([A-Za-z0-9_]+)["']/g)].map((m) => m[1]).filter((id) => byId.has(id));
  if (ids.length) return ids.map((id) => byId.get(id)!);
  const out: EntityDef[] = [];
  // a property read (steak.done, m.field) stands for that property, not for the object it is read from
  const prop = /([A-Za-z_]\w*)\s*\.\s*([A-Za-z_]\w*)\s*$/.exec(expr.trim());
  const toks = prop ? (prop[2] === "id" ? [prop[1]] : [prop[2]]) : [...new Set(expr.match(/[A-Za-z_]\w*/g) ?? [])];
  for (const tok of toks) {
    // the list named in it: m.field → field, c.s.win2 → win
    const list = lists[tok] ?? lists[tok + "s"] ?? lists[tok.replace(/s$/, "")];
    if (list) out.push(...list);
    if (out.length) continue;
    if (depth < 2 && !prop) {
      // a local `const X = …` just before the call, or a helper defined in the file
      const local = new RegExp(`(?:const|let)\\s+${esc(tok)}\\s*=\\s*([^;\\n]+)`).exec(before.slice(-500));
      const body = local?.[1] ?? helperBody(src, tok);
      if (body && body !== expr) { const sub = itemsOfExpr(body, src, sit, before, depth + 1); if (sub?.length) out.push(...sub); }
    }
  }
  return out.length ? [...new Set(out)] : undefined;
}

/** The items {X} of this line is said with, read from every call that says it; undefined when a call can't be read. */
export function itemsFor(sit: SituationDef, lid: string, slot = "X"): EntityDef[] | undefined {
  const { own } = files(sit);
  const re = new RegExp(`["']${esc(lid)}["']`, "g");
  const found: EntityDef[] = [];
  let calls = 0;
  for (const m of own.matchAll(re)) {
    const call = callAround(own, m.index!);
    // only where the id is the line a call says: say("lid", …), T(c, "lid", …), cond ? "lid" : "other"
    if (!call || !/^\s*(?:[A-Za-z_][\w.]*\s*,\s*)?(?:[^"'`;]*\?\s*(?:["'][^"']*["']\s*:\s*)?)?$/.test(call.head)) continue;
    calls++;
    // the binding object after the id: { X: expr } or { X } (a local of the same name)
    const obj = /\{([^{}]*)\}/.exec(call.args);
    const bind = obj ? new RegExp(`(?:^|[,{\\s])${slot}\\s*(?::\\s*([^,}]+))?(?=[,}\\s]|$)`).exec(obj[1]) : null;
    if (!bind) return undefined;
    const before = own.slice(0, m.index!);
    let items = itemsOfExpr(bind[1] ?? slot, own, sit, before);
    if (!items) return undefined;
    // `helper(…) ? "lid" : "other"`: the helper reads an attribute; this branch keeps the items with (or without) it
    const tern = /([A-Za-z_]\w*)\s*\([^()]*\)\s*\?\s*$/.exec(call.head) ?? /([A-Za-z_]\w*)\s*\([^()]*\)\s*\?\s*["'][^"']+["']\s*:\s*$/.exec(call.head);
    if (tern) {
      const attr = /attrs\??\.(\w+)/.exec(helperBody(own, tern[1]) ?? "")?.[1];
      const elseBranch = /:\s*$/.test(call.head);
      if (attr) items = items.filter((e) => !!(e.attrs as any)?.[attr] !== elseBranch);
    }
    found.push(...items);
  }
  return calls ? [...new Set(found)] : undefined;
}
