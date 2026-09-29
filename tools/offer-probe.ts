// Offers the learner can't take up: whenever someone offers a list ("We have black, green, mint and chamomile.",
// "Blueberry or chocolate?", "…hot chocolate and pastries."), each option is answered in short natural forms
// ("Green.", "Green, please.", "I'd like green.", "The green, please.", "Some green, please.", "Green is fine.").
// An option passes when one form is understood, gets no "sorry / don't have / didn't understand", and the
// question isn't simply asked again. The moments come from the scripted sims (6 seeds) and from random
// conversations (inputs from tests, sims and their auto answers, as check-content's fuzz), so lines the sims
// never reach are probed too. Some flags are expected ("Plants." at customs: plants aren't allowed); read them.
//   npx tsx tools/offer-probe.ts [situation prefixes…] [--runs=40]
import { SITUATIONS } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { Conversation } from "../src/convo/dialogue";
import { playSim } from "./sim-play";

const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const RUNS = Number(process.argv.find((a) => a.startsWith("--runs="))?.slice(7) ?? 40);

const OFFER = [
  /^(?:We have|We've got|You can (?:have|choose|get)|We (?:sell|serve|offer)|There's|There are)\s+(.+?)[.!]$/i,
  /^(?:Would you like|Do you want|Do you prefer|Is that|Is it|Did you want|Are you looking for)\s+(.+\bor\b.+?)\??$/i,
  /^([A-Za-z' -]+(?:,\s*[A-Za-z' -]+)*,?\s+or\s+[A-Za-z' -]+)\?$/,
];
const clean = (x: string) => x.trim()
  .replace(/^(so|and|or|the|a|an|some|our|any|anything|we have|you can have|there's|there is|there are|to|for)\s+/ig, "")
  .replace(/^(so|any|anything|a|an|the)\s+/i, "")
  .replace(/\s+(today|in there|inside|on it|for you|please)$/i, "")
  .replace(/[.!?,]+$/, "").trim();
const forms = (x: string) => [`${x}.`, `${x}, please.`, `I'd like ${x}.`, `The ${x}, please.`, `Some ${x}, please.`, `${x[0].toUpperCase() + x.slice(1)} is fine.`];
const snap = (c: any) => JSON.stringify([c.s, c.step, c.pending?.id ?? null]);

type Opts = { gender: "m" | "f"; visits: number; seed: number; partner: string; setup?: (s: any) => void };
function mk(sit: any, o: Opts) {
  const def = o.setup ? { ...sit, init: (c: any) => { sit.init?.(c); o.setup!(c.s); } } : sit;
  return new Conversation(def, { global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "Mikalauskas", gender: o.gender, datePartner: o.partner }, visits: o.visits, seed: o.seed, memory: {} });
}
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function offersIn(text: string) {
  const out: { sent: string; opts: string[] }[] = [];
  for (const sent of text.split(/(?<=[.!?])\s+/)) for (const re of OFFER) {
    const m = sent.match(re);
    if (!m) continue;
    const opts = m[1].split(/,\s*|\s+or\s+|\s+and\s+/).map(clean).filter((x) => x && x.split(" ").length <= 3 && !/^(you|it|that|this|them|me|here|there|so)$/i.test(x));
    if (opts.length >= 2) out.push({ sent, opts });
    break;
  }
  return out;
}

const results = new Map<string, { bad: Map<string, string>; good: Set<string>; where: string }>();
function probe(sit: any, o: Opts, said: string[], off: { sent: string; opts: string[] }, where: string) {
  const key = `${sit.id} · “${off.sent.slice(0, 90)}”`;
  const r = results.get(key) ?? { bad: new Map<string, string>(), good: new Set<string>(), where };
  for (const x of off.opts) {
    if (r.good.has(x)) continue;
    let ok = false, last = "";
    for (const f of forms(x)) {
      const conv = mk(sit, o);
      conv.start();
      for (const s of said) conv.input(s);
      if (conv.ended) { ok = true; break; }
      const before = snap(conv);
      const out = conv.input(f);
      const text = out.lines.map((l: any) => l.sentence.en).join(" ");
      const askedAgain = text.includes(off.sent);
      const sorry = /\b(sorry|don't have|do not have|didn't catch|didn't understand)\b/i.test(text);
      if (out.understood && !sorry && !askedAgain && (snap(conv) !== before || text.length > 0)) { ok = true; break; }
      last = `${f} → ${out.understood ? text.slice(0, 70) : "(not understood)"}`;
    }
    if (ok) { r.good.add(x); r.bad.delete(x); } else if (!r.bad.has(x)) r.bad.set(x, last);
  }
  results.set(key, r);
}

for (const sit of SITUATIONS) {
  if (only.length && !only.some((q) => sit.id.startsWith(q))) continue;
  // 1) the scripted sims
  for (const sim of sit.sims || []) for (let seed = 1; seed <= 6; seed++) {
    const said: string[] = [];
    const found: { k: number; off: any }[] = [];
    playSim(sit, sim, seed, { onTurn: (conv: any, t: any, out: any) => {
      if (t) said.push(t.say);
      if (conv.ended) return;
      for (const off of offersIn(out.lines.map((l: any) => l.sentence.en).join(" "))) found.push({ k: said.length, off });
    } });
    for (const f of found) probe(sit, { gender: "m", visits: seed % 3, seed, partner: "emma", setup: sim.setup }, said.slice(0, f.k), f.off, `sim ${sim.name} seed ${seed}`);
  }
  // 2) random conversations
  const inputs: string[] = [];
  for (const t of sit.tests || []) if (t.intent !== "none") inputs.push(t.say);
  for (const sim of sit.sims || []) { inputs.push(...sim.turns); inputs.push(...Object.values(sim.auto || {}) as string[]); }
  for (let r = 0; r < RUNS; r++) {
    const rand = rng(r * 7919 + sit.id.length);
    const o: Opts = { gender: rand() < 0.5 ? "m" : "f", visits: Math.floor(rand() * 4), seed: r + 1, partner: rand() < 0.5 ? "sam" : "emma" };
    const conv = mk(sit, o);
    const said: string[] = [];
    let out: any;
    try { out = conv.start(); } catch { continue; }
    for (let t = 0; t < 14 && !conv.ended; t++) {
      for (const off of offersIn(out.lines.map((l: any) => l.sentence.en).join(" "))) probe(sit, o, said.slice(), off, `random run ${r + 1}`);
      const say = inputs[Math.floor(rand() * inputs.length)] ?? "yes";
      said.push(say);
      try { out = conv.input(say); } catch { break; }
    }
  }
}
let n = 0;
for (const [k, r] of results) if (r.bad.size) {
  n++;
  console.log(`${k}   (${r.where})`);
  for (const [x, why] of r.bad) console.log(`    ✗ ${x}   e.g. ${why}`);
}
console.log(`\n${n} offers with options the learner can't pick (of ${results.size} offers found)`);
