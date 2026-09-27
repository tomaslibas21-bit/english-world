// A small token grammar for prepared learner responses.
//
// Pattern syntax (authoring):
//   words            literal words; contractions are expanded ("i'll have" == "i will have")
//   (a | b c)        alternatives
//   [a | b]          optional (optionally with alternatives)
//   {slot}           a slot of type "slot"; {name:type} names the capture differently
//   @macro           reference to a macro pattern
//   #tag             zero-width tag recorded when the path passes it (e.g. #h:ill_have, #blunt)
//
// Matching is full-coverage: every token of the utterance must be consumed by the
// grammar (plus explicitly allowed fillers). Negation words therefore can never be
// silently skipped. A prefix mode tells the speech layer whether an unfinished
// utterance is still heading towards an accepted response.

import { tokenizePatternWords, tokenSimilarity, NEGATION_TOKENS, DROPPABLE, SKIPPABLE, SUBJECT_IT_BEFORE, type Tokens } from "./normalize";

export interface Cap { name: string; value: unknown; from: number; to: number }
/** A match. `d`: optional function words left out; `kl`: literal words matched, `kc` of them content
 *  words (not function words); `ks`: slots filled; `fs`: free-text slots filled (per intent). */
export interface Res { end: number; caps: Cap[]; tags: string[]; cost: number; partial?: boolean; d?: number; kl?: number; kc?: number; ks?: number; fs?: number }
const cnt = (a: Res, b: Res) => ({ d: (a.d ?? 0) + (b.d ?? 0), kl: (a.kl ?? 0) + (b.kl ?? 0), kc: (a.kc ?? 0) + (b.kc ?? 0), ks: (a.ks ?? 0) + (b.ks ?? 0), fs: (a.fs ?? 0) + (b.fs ?? 0) });

export type GNode =
  | { k: "lit"; id: number; t: string }
  | { k: "seq"; id: number; items: GNode[]; strict?: boolean }
  | { k: "alt"; id: number; opts: GNode[] }
  | { k: "opt"; id: number; node: GNode; cost?: number }
  | { k: "rep"; id: number; node: GNode; min: number; max: number }
  | { k: "slot"; id: number; name: string; type: string }
  | { k: "ref"; id: number; name: string }
  | { k: "tag"; id: number; tags: string[] }
  | { k: "wrap"; id: number; name: string; node: GNode; extra?: Record<string, unknown> }
  | { k: "eps"; id: number };

/** `weak`: a doubtful reading ("to" heard as the number 2) that doesn't count as real content. */
export interface SlotResult { end: number; value: unknown; cost?: number; partial?: boolean; tags?: string[]; weak?: boolean }
export type SlotFn = (tokens: Tokens, pos: number, prefix: boolean) => SlotResult[];

export interface LexEntry { id: string; forms: string[]; tags?: string[] }

/** Slot types whose value is free text: never skip a word right before them. */
const FREE_SLOT_TYPES = new Set(["name", "any", "letters", "digits", "text"]);

let NODE_ID = 1;
const nid = () => NODE_ID++;

export const mk = {
  lit: (t: string): GNode => ({ k: "lit", id: nid(), t }),
  /** `strict`: no extra words may be skipped between the items (sentence structure, yes/no lists). */
  seq: (items: GNode[], strict = false): GNode => (items.length === 1 ? items[0] : { k: "seq", id: nid(), items, strict }),
  alt: (opts: GNode[]): GNode => (opts.length === 1 ? opts[0] : { k: "alt", id: nid(), opts }),
  opt: (node: GNode, cost?: number): GNode => ({ k: "opt", id: nid(), node, cost }),
  rep: (node: GNode, min: number, max: number): GNode => ({ k: "rep", id: nid(), node, min, max }),
  slot: (name: string, type: string): GNode => ({ k: "slot", id: nid(), name, type }),
  ref: (name: string): GNode => ({ k: "ref", id: nid(), name }),
  tag: (tags: string[]): GNode => ({ k: "tag", id: nid(), tags }),
  wrap: (name: string, node: GNode, extra?: Record<string, unknown>): GNode => ({ k: "wrap", id: nid(), name, node, extra }),
  eps: (): GNode => ({ k: "eps", id: nid() }),
  /** Literal words. `soft`: function words a learner often leaves out (articles, "to", "is", "do", a
   *  preposition, the subject "I") may be missing from the utterance, at a small cost. */
  words: (text: string, soft = false): GNode => {
    const toks = tokenizePatternWords(text);
    // how much may be left out is decided per intent (see the "__intent" wrap): at least one
    // literal word and no fewer words kept than left out
    return mk.seq(toks.map((t, i) => {
      let drop = soft ? DROPPABLE.get(t) : undefined;
      if (t === "it" && !SUBJECT_IT_BEFORE.has(toks[i + 1])) drop = undefined; // the object "it" stays
      return drop !== undefined ? mk.opt(mk.lit(t), drop) : mk.lit(t);
    }), !soft);
  },
};

// ---------------------------------------------------------------------------
// Pattern parser

type Tok = { t: "(" | ")" | "[" | "]" | "|" } | { t: "word"; v: string } | { t: "slot"; v: string } | { t: "macro"; v: string } | { t: "tag"; v: string };

function lex(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if ("()[]|".includes(c)) { out.push({ t: c as "(" }); i++; continue; }
    // regex-style "(x)?" / "{slot}?" = optional; after a plain word "?" is just punctuation
    if (c === "?" && out.length && [")", "]", "slot"].includes(out[out.length - 1].t)) { out.push({ t: "?" as any }); i++; continue; }
    if (c === "{") {
      const j = src.indexOf("}", i);
      if (j < 0) throw new Error(`Unclosed { in pattern: ${src}`);
      out.push({ t: "slot", v: src.slice(i + 1, j).trim() }); i = j + 1; continue;
    }
    if (c === "@") {
      let j = i + 1; while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      out.push({ t: "macro", v: src.slice(i + 1, j) }); i = j; continue;
    }
    if (c === "#") {
      let j = i + 1; while (j < src.length && /[A-Za-z0-9_:.\-]/.test(src[j])) j++;
      out.push({ t: "tag", v: src.slice(i + 1, j) }); i = j; continue;
    }
    let j = i; while (j < src.length && !/[\s()[\]{}|@#]/.test(src[j])) j++;
    out.push({ t: "word", v: src.slice(i, j) }); i = j;
  }
  return out;
}

/** Compile a pattern. `soft` (default) lets function words be missing (see mk.words); the
 *  built-in yes/no, lead and tail lists are compiled strictly. */
export function parsePattern(src: string, soft = true): GNode {
  const toks = lex(src);
  let p = 0;
  const peek = () => toks[p];
  function parseAlt(): GNode {
    const opts: GNode[] = [parseSeq()];
    while (peek() && peek().t === "|") { p++; opts.push(parseSeq()); }
    return mk.alt(opts);
  }
  function parseSeq(): GNode {
    const items: GNode[] = [];
    let words: string[] = [];
    const flush = () => { if (words.length) { const w = mk.words(words.join(" "), soft); if (w.k !== "seq" || w.items.length) items.push(w); words = []; } };
    while (p < toks.length) {
      const t = toks[p];
      if (t.t === ")" || t.t === "]" || t.t === "|") break;
      p++;
      if (t.t === "word") { words.push(t.v); continue; }
      flush();
      if (t.t === "(") { items.push(parseAlt()); expect(")"); }
      else if (t.t === "[") { items.push(mk.opt(parseAlt())); expect("]"); }
      else if (t.t === "slot") {
        const [a, b] = t.v.split(":").map((x) => x.trim());
        items.push(mk.slot(b ? a : a, b || a));
      } else if (t.t === "macro") items.push(mk.ref(t.v));
      else if (t.t === "tag") items.push(mk.tag([t.v]));
      if (peek() && (peek().t as string) === "?") { p++; items.push(mk.opt(items.pop()!)); }
    }
    flush();
    return items.length ? mk.seq(items, !soft) : mk.eps();
  }
  function expect(c: string) {
    const t = toks[p];
    if (!t || t.t !== c) throw new Error(`Expected ${c} in pattern: ${src}`);
    p++;
  }
  const node = parseAlt();
  if (p < toks.length) throw new Error(`Unexpected ${JSON.stringify(toks[p])} in pattern: ${src}`);
  // The last required word of a pattern is never optional: at the end, "in"/"on"/"to" are no
  // prepositions ("are you in", "is it on", "count me in"), so leaving them out changes the meaning.
  if (soft) for (const alt of node.k === "alt" ? node.opts : [node]) keepLastWord(alt);
  return node;
}

const isSoftDrop = (n: GNode) => n.k === "opt" && n.cost !== undefined && n.node.k === "lit";
function keepLastWord(n: GNode) {
  if (n.k !== "seq") return;
  for (let i = n.items.length - 1; i >= 0; i--) {
    const it = n.items[i];
    if (it.k === "tag" || (it.k === "opt" && it.cost === undefined)) continue; // authored [optional] parts and tags
    if (isSoftDrop(it)) { n.items[i] = (it as Extract<GNode, { k: "opt" }>).node; return; }
    if (it.k === "seq") keepLastWord(it);
    return;
  }
}

// ---------------------------------------------------------------------------
// Lexicon tries

interface Trie { next: Map<string, Trie>; ids: { id: string; tags?: string[] }[] }
function buildTrie(entries: LexEntry[]): Trie {
  const root: Trie = { next: new Map(), ids: [] };
  for (const e of entries) {
    for (const f of e.forms) {
      const toks = tokenizePatternWords(f);
      if (!toks.length) continue;
      let node = root;
      for (const t of toks) {
        let n = node.next.get(t);
        if (!n) { n = { next: new Map(), ids: [] }; node.next.set(t, n); }
        node = n;
      }
      if (!node.ids.some((x) => x.id === e.id)) node.ids.push({ id: e.id, tags: e.tags });
    }
  }
  return root;
}

function matchTrie(root: Trie, tokens: Tokens, pos: number, prefix: boolean): SlotResult[] {
  const out: SlotResult[] = [];
  type St = { node: Trie; at: number; cost: number };
  let frontier: St[] = [{ node: root, at: pos, cost: 0 }];
  let guard = 0;
  while (frontier.length && guard++ < 12) {
    const nextF: St[] = [];
    for (const st of frontier) {
      if (st.at >= tokens.length) {
        if (prefix && st.node.next.size) out.push({ end: tokens.length, value: null, partial: true, cost: st.cost });
        continue;
      }
      const tok = tokens[st.at];
      for (const [k, child] of st.node.next) {
        const sim = tokenSimilarity(tok, k);
        if (sim <= 0) continue;
        const cost = st.cost + (1 - sim) * 3;
        const ns = { node: child, at: st.at + 1, cost };
        for (const x of child.ids) out.push({ end: ns.at, value: x.id, cost, tags: x.tags });
        if (child.next.size) nextF.push(ns);
      }
    }
    frontier = nextF.slice(0, 32);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Grammar

export interface SlotDefs {
  [type: string]: { lexicon: LexEntry[] } | { pattern: string | string[] } | { fn: SlotFn };
}

export class Grammar {
  macros = new Map<string, GNode>();
  private slotLex = new Map<string, Trie>();
  private slotPat = new Map<string, GNode>();
  private slotFn = new Map<string, SlotFn>();
  parent?: Grammar;

  constructor(parent?: Grammar) { this.parent = parent; }

  defineMacro(name: string, pattern: string | string[]) {
    const src = Array.isArray(pattern) ? pattern.map((p) => `(${p})`).join(" | ") : pattern;
    this.macros.set(name, parsePattern(src));
  }
  defineSlots(defs: SlotDefs) {
    for (const [type, def] of Object.entries(defs)) {
      if ("lexicon" in def) this.slotLex.set(type, buildTrie(def.lexicon));
      else if ("pattern" in def) {
        const src = Array.isArray(def.pattern) ? def.pattern.map((p) => `(${p})`).join(" | ") : def.pattern;
        this.slotPat.set(type, parsePattern(src));
      } else this.slotFn.set(type, def.fn);
    }
  }
  hasSlot(type: string): boolean {
    return this.slotLex.has(type) || this.slotPat.has(type) || this.slotFn.has(type) || !!this.parent?.hasSlot(type);
  }
  hasMacro(name: string): boolean { return this.macros.has(name) || !!this.parent?.hasMacro(name); }
  private getMacro(name: string): GNode | undefined { return this.macros.get(name) ?? this.parent?.getMacro(name); }
  private getLex(type: string): Trie | undefined { return this.slotLex.get(type) ?? this.parent?.getLex(type); }
  private getPat(type: string): GNode | undefined { return this.slotPat.get(type) ?? this.parent?.getPat(type); }
  private getFn(type: string): SlotFn | undefined { return this.slotFn.get(type) ?? this.parent?.getFn(type); }

  /** Check that every macro and slot referenced by a node exists (authoring validation). */
  validate(node: GNode, where: string, seen = new Set<number>()): string[] {
    const errs: string[] = [];
    const walk = (n: GNode) => {
      if (seen.has(n.id)) return; seen.add(n.id);
      switch (n.k) {
        case "seq": n.items.forEach(walk); break;
        case "alt": n.opts.forEach(walk); break;
        case "opt": case "rep": case "wrap": walk(n.node); break;
        case "ref": { const m = this.getMacro(n.name); if (!m) errs.push(`${where}: unknown macro @${n.name}`); else walk(m); break; }
        case "slot": {
          if (!this.hasSlot(n.type)) errs.push(`${where}: unknown slot {${n.type}}`);
          const p = this.getPat(n.type); if (p) walk(p);
          break;
        }
      }
    };
    walk(node);
    return errs;
  }

  /** All ways `node` can consume tokens starting at `pos`. */
  match(node: GNode, tokens: Tokens, prefix = false): Res[] {
    const memo = new Map<string, Res[]>();
    return this.m(node, tokens, 0, prefix, memo);
  }

  private m(node: GNode, tokens: Tokens, pos: number, prefix: boolean, memo: Map<string, Res[]>): Res[] {
    const key = node.id + ":" + pos;
    const hit = memo.get(key);
    if (hit) return hit;
    memo.set(key, []); // guard against left recursion
    const n = tokens.length;
    let out: Res[] = [];
    switch (node.k) {
      case "eps": out = [{ end: pos, caps: [], tags: [], cost: 0 }]; break;
      case "tag": out = [{ end: pos, caps: [], tags: node.tags.slice(), cost: 0 }]; break;
      case "lit": {
        if (pos >= n) { if (prefix) out = [{ end: n, caps: [], tags: [], cost: 0, partial: true }]; break; }
        const sim = tokenSimilarity(tokens[pos], node.t);
        if (sim > 0) out = [{ end: pos + 1, caps: [], tags: [], cost: (1 - sim) * 3, kl: 1, kc: DROPPABLE.has(node.t) ? 0 : 1 }];
        break;
      }
      case "seq": {
        let cur: Res[] = [{ end: pos, caps: [], tags: [], cost: 0 }];
        node.items.forEach((item, idx) => {
          if (!cur.length) return;
          const next: Res[] = [];
          // a learner's extra small word between two parts ("I am agree", "I want to a latte"); never
          // before the first part (it would change what the sentence starts as) or a name/free-text slot
          const canSkip = !node.strict && idx > 0 && !(item.k === "slot" && FREE_SLOT_TYPES.has(item.type)) && item.k !== "tag";
          for (const r of cur) {
            if (r.partial) { next.push(r); continue; }
            for (const r2 of this.m(item, tokens, r.end, prefix, memo)) {
              next.push({ end: r2.end, caps: r.caps.concat(r2.caps), tags: r.tags.concat(r2.tags), cost: r.cost + r2.cost, partial: r2.partial, ...cnt(r, r2) });
            }
            // only once this sequence has consumed a word: an empty optional start doesn't count
            const skip = canSkip && r.end > pos && r.end + 1 < n ? SKIPPABLE.get(tokens[r.end]) : undefined;
            if (skip !== undefined) {
              for (const r2 of this.m(item, tokens, r.end + 1, prefix, memo)) {
                if (r2.partial || r2.end <= r.end + 1) continue;
                next.push({ end: r2.end, caps: r.caps.concat(r2.caps), tags: r.tags.concat(r2.tags), cost: r.cost + r2.cost + skip, ...cnt(r, r2) });
              }
            }
          }
          cur = dedupe(next);
        });
        out = cur;
        break;
      }
      case "alt": {
        const all: Res[] = [];
        for (const o of node.opts) all.push(...this.m(o, tokens, pos, prefix, memo));
        out = dedupe(all);
        break;
      }
      case "opt": {
        const skipped: Res = { end: pos, caps: [], tags: [], cost: node.cost ?? 0.01, d: node.cost !== undefined ? 1 : 0 };
        out = dedupe([skipped, ...this.m(node.node, tokens, pos, prefix, memo)]);
        break;
      }
      case "rep": {
        let frontier: Res[] = [{ end: pos, caps: [], tags: [], cost: 0 }];
        const acc: Res[] = node.min === 0 ? frontier.slice() : [];
        for (let i = 1; i <= node.max; i++) {
          const next: Res[] = [];
          for (const r of frontier) {
            if (r.partial) continue;
            for (const r2 of this.m(node.node, tokens, r.end, prefix, memo)) {
              if (r2.end === r.end && !r2.partial) continue; // no progress
              next.push({ end: r2.end, caps: r.caps.concat(r2.caps), tags: r.tags.concat(r2.tags), cost: r.cost + r2.cost, partial: r2.partial, ...cnt(r, r2) });
            }
          }
          frontier = dedupe(next);
          if (!frontier.length) break;
          if (i >= node.min) acc.push(...frontier);
        }
        out = dedupe(acc);
        break;
      }
      case "ref": {
        const m = this.getMacro(node.name);
        if (!m) throw new Error(`Unknown macro @${node.name}`);
        out = this.m(m, tokens, pos, prefix, memo);
        break;
      }
      case "wrap": {
        let inner = this.m(node.node, tokens, pos, prefix, memo);
        const isIntent = node.name === "__intent";
        // An intent consumes at least one word. Left-out function words: at least one literal word must
        // remain, and no more words may be left out than are kept ("at the what" never shrinks to
        // "what", "to {place}" to a bare place, "i am not" to a lone "not").
        // With a name or free-text slot, a left-out word is riskier ("I [am] {name}" would take
        // "I said Lithuania" for a name): then at most one word may be left out, next to two kept ones.
        if (isIntent) inner = inner.filter((r) => {
          if (r.partial) return true;
          if (r.end <= pos) return false;
          const d = r.d ?? 0, kl = r.kl ?? 0, kc = r.kc ?? 0, ks = r.ks ?? 0;
          if (!d) return true;
          if ((r.fs ?? 0) > 0) return d <= 1 && kl >= 2;
          // something real must remain: a content word or a filled slot ("I am [in]" is not "I'm in")
          return kl > 0 && kc + ks > 0 && d <= kl + ks;
        });
        out = inner.map((r) => ({
          end: r.end, cost: r.cost, partial: r.partial, tags: r.tags, ...(isIntent ? {} : { d: r.d, kl: r.kl, kc: r.kc, ks: r.ks, fs: r.fs }),
          caps: [{ name: node.name, value: { ...(node.extra || {}), ...capsToObject(r.caps), __tags: r.tags }, from: pos, to: r.end }],
        }));
        break;
      }
      case "slot": {
        out = this.slotAt(node, tokens, pos, prefix, memo);
        break;
      }
    }
    memo.set(key, out);
    return out;
  }

  private slotAt(node: Extract<GNode, { k: "slot" }>, tokens: Tokens, pos: number, prefix: boolean, memo: Map<string, Res[]>): Res[] {
    const out = this.slotAt0(node, tokens, pos, prefix, memo);
    if (!FREE_SLOT_TYPES.has(node.type)) return out;
    return out.map((r) => (r.partial ? r : { ...r, ks: 0, fs: 1 }));
  }

  private slotAt0(node: Extract<GNode, { k: "slot" }>, tokens: Tokens, pos: number, prefix: boolean, memo: Map<string, Res[]>): Res[] {
    const n = tokens.length;
    const out: Res[] = [];
    const lexT = this.getLex(node.type);
    if (lexT) {
      for (const sr of matchTrie(lexT, tokens, pos, prefix)) {
        out.push({ end: sr.end, caps: sr.partial ? [] : [{ name: node.name, value: sr.value, from: pos, to: sr.end }], tags: sr.tags || [], cost: sr.cost || 0, partial: sr.partial, ks: 1 });
      }
      if (prefix && pos >= n && !out.length) out.push({ end: n, caps: [], tags: [], cost: 0, partial: true });
      return out;
    }
    const pat = this.getPat(node.type);
    if (pat) {
      for (const r of this.m(pat, tokens, pos, prefix, memo)) {
        out.push({ end: r.end, caps: r.partial ? [] : [{ name: node.name, value: { ...capsToObject(r.caps), __tags: r.tags }, from: pos, to: r.end }], tags: r.tags, cost: r.cost, partial: r.partial, ks: 1 });
      }
      return out;
    }
    const fn = this.getFn(node.type);
    if (fn) {
      if (pos >= n) { if (prefix) out.push({ end: n, caps: [], tags: [], cost: 0, partial: true }); return out; }
      for (const sr of fn(tokens, pos, prefix)) {
        out.push({ end: sr.end, caps: sr.partial ? [] : [{ name: node.name, value: sr.value, from: pos, to: sr.end }], tags: sr.tags || [], cost: sr.cost || 0, partial: sr.partial, ks: sr.weak ? 0 : 1 });
      }
      return out;
    }
    throw new Error(`Unknown slot type {${node.type}}`);
  }
}

function capKey(c: Cap): string {
  return c.name + "=" + JSON.stringify(c.value) + "@" + c.from + "-" + c.to;
}
function dedupe(rs: Res[]): Res[] {
  const best = new Map<string, Res>();
  for (const r of rs) {
    const k = r.end + (r.partial ? "p" : "") + "|" + r.caps.map(capKey).join(",") + "|" + r.tags.join(",");
    const prev = best.get(k);
    if (!prev || r.cost < prev.cost) best.set(k, r);
  }
  const arr = [...best.values()];
  if (arr.length <= 64) return arr;
  // Too many readings: keep the cheapest few for every end position, so a long utterance whose
  // correct reading is a bit costly (an unknown name) isn't crowded out by short cheap prefixes.
  arr.sort((a, b) => a.cost - b.cost);
  const perEnd = new Map<string, number>();
  const kept: Res[] = [];
  for (const r of arr) {
    const k = r.end + (r.partial ? "p" : "");
    const c = perEnd.get(k) ?? 0;
    if (c >= 12) continue;
    perEnd.set(k, c + 1);
    kept.push(r);
    if (kept.length >= 192) break;
  }
  return kept;
}

/** Captures → object. Repeated names become arrays (in order). */
export function capsToObject(caps: Cap[]): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  const counts = new Map<string, number>();
  for (const c of caps) counts.set(c.name, (counts.get(c.name) || 0) + 1);
  for (const c of caps) {
    if ((counts.get(c.name) || 0) > 1) {
      if (!Array.isArray(o[c.name])) o[c.name] = [];
      (o[c.name] as unknown[]).push(c.value);
    } else o[c.name] = c.value;
  }
  return o;
}

/** The `any` slot: a few unknown words, never containing a negation. Used only for
 *  graceful "I'm not sure we have that" replies, never for normal meaning. */
/** An unknown thing starts like a noun phrase, not with a pronoun, auxiliary or "to" ("I'll take it",
 *  "I need to…", "I am leaving" are not requests for an unknown item). */
const NOT_A_THING_START = new Set(["it", "to", "i", "you", "we", "he", "she", "they", "them", "him", "her", "me", "us",
  "am", "is", "are", "was", "were", "be", "been", "do", "does", "did", "have", "has", "had", "will", "would", "can", "could", "should", "not"]);
export function anyWords(max = 5): SlotFn {
  return (tokens, pos, prefix) => {
    const out: SlotResult[] = [];
    if (NOT_A_THING_START.has(tokens[pos])) return out;
    for (let len = 1; len <= max && pos + len <= tokens.length; len++) {
      const w = tokens.slice(pos, pos + len);
      if (w.some((t) => NEGATION_TOKENS.has(t))) break;
      out.push({ end: pos + len, value: w.join(" "), cost: 2.5 + 0.4 * len });
    }
    if (prefix && pos + max > tokens.length) out.push({ end: tokens.length, value: null, partial: true, cost: 3 });
    return out;
  };
}
