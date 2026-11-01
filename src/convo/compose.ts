// Interlinear composer: turns an authored sentence (with placeholders) into concrete
// units {en, lt} plus clean English, natural Lithuanian and the spoken form.
// Used at runtime and by the build tools (audio/IPA enumeration, validation).

import type { SentSrc } from "../content/types";
import { genderChoice, type Case, type Gender } from "./lt-morph";
import { PH_AGREE, PH_AGREE_TARGET, PH_LT, agreeGloss, agreeTarget, entityForPlayer, npUnits, resolveTarget, splitUnits, valueDisplay } from "./target";

// the practised language's noun phrases and values (./target.ts), also used from here
export { entityForPlayer, npUnits, numberWords, priceEn, priceLt, priceSay, splitUnits, timeEn, timeSay } from "./target";
export type { NpParts } from "./target";

export interface Unit { en: string; lt: string; flag?: string }
export interface Sentence { units: Unit[]; en: string; nat: string; say: string }

export interface NpBinding { id: string; mods?: string[]; qty?: number }
export type Vars = Record<string, any>;
export type EntityLookup = (id: string) => import("../content/types").EntityDef | undefined;

const PH_EN = /^(.*?)\{([A-Za-z_]\w*)(?:\.(np|the|pl|bare))?\}(.*)$/;
const PH_VAL = /\{\$([a-zA-Z_]\w*)\}/g;

function binding(vars: Vars, name: string): NpBinding | null {
  const v = vars[name];
  if (v == null) return null;
  if (typeof v === "string") return { id: v };
  return v as NpBinding;
}

// ---------------------------------------------------------------------------

/** Which Spanish the learner hears (the Spanish edition's setting): "neutral" takes a line's neutral twin
 *  (SentSrc.neutral) where it has one. The English edition never sets it. */
let VARIETY: "default" | "neutral" = "default";
export function setVariety(v: "default" | "neutral") { VARIETY = v; }
export const variety = () => VARIETY;

export interface ComposeOpts { look: EntityLookup; addressee?: Gender; speaker?: Gender; /** jūs (true, default) or tu (false) */ formal?: boolean }

/** Compose a concrete sentence. Throws on authoring errors (validated at build time). */
export function compose(src0: SentSrc, vars: Vars, opts: ComposeOpts): Sentence {
  const src: SentSrc = VARIETY === "neutral" && src0.neutral ? src0.neutral : src0;
  const g = opts.addressee ?? "m";
  const sp = opts.speaker ?? "f";
  const formal = opts.formal ?? true;
  const resolveGender = (s: string) => genderChoice(
    s.replace(/\{sm:([^|}]*)\|sf:([^}]*)\}/g, (_m, a, b) => (sp === "m" ? a : b))
     .replace(/\{j:([^|}]*)\|t:([^}]*)\}/g, (_m, a, b) => (formal ? a : b)), g);
  const enU = splitUnits(resolveTarget(src.en, { player: g, speaker: sp, formal }));
  const ltU = splitUnits(resolveGender(src.lt));
  if (enU.length !== ltU.length) throw new Error(`Unit count differs (EN ${enU.length}, LT ${ltU.length}): ${src.en}`);
  const units: Unit[] = [];
  const sayParts: string[] = [];

  const agreeIn = (s: string) => s.replace(PH_AGREE, (_m, lemma: string, name: string, c: Case, pl?: string) => {
    const b = binding(vars, name);
    const e0 = b ? opts.look(b.id) : undefined;
    if (!e0) return lemma;
    const e = entityForPlayer(e0, g === "f");
    return agreeGloss(lemma, e, c, !!pl || (b?.qty ?? 1) > 1);
  });
  // agreement written into the practised language's own text (the Spanish edition's {frío@X})
  const agreeEn = (s: string) => agreeTarget(s, (name) => {
    const b = binding(vars, name);
    const e0 = b ? opts.look(b.id) : undefined;
    return e0 ? { e: entityForPlayer(e0, g === "f"), plural: (b?.qty ?? 1) > 1 } : null;
  });
  const valuesIn = (s: string, which: "en" | "lt" | "say") => s.replace(PH_VAL, (_m, name: string) => valueDisplay(name, vars[name])[which]);

  for (let i = 0; i < enU.length; i++) {
    const en = enU[i], lt = ltU[i];
    const m = en.match(PH_EN);
    if (m) {
      const [, pre, name, kindRaw, post] = m;
      const kind = (kindRaw || "head") as "np" | "the" | "pl" | "bare" | "head";
      const lm = lt.match(PH_LT);
      if (!lm) throw new Error(`LT unit for {${name}} needs a case placeholder: "${lt}" in ${src.en}`);
      const c = lm[3] as Case;
      const ltPre = lt.slice(0, lm.index), ltPost = lt.slice((lm.index ?? 0) + lm[0].length);
      const b = binding(vars, name);
      if (!b) {
        units.push({ en: `${pre}…${post}`, lt: `${ltPre}…${ltPost}` });
        continue;
      }
      const np = npUnits(b, kind, c, opts.look, g === "f");
      // a placeholder that begins a new sentence mid-line starts with a capital ("The usual? A medium latte?")
      const newSentence = i > 0 && !pre && /[.?!]["”')]*$/.test(units[units.length - 1]?.en ?? "");
      np.en.forEach((w, k) => {
        const first = k === 0, last = k === np.en.length - 1;
        units.push({
          en: (first ? pre : "") + (first && newSentence ? capFirst(w) : w) + (last ? post : ""),
          lt: (first ? ltPre : "") + (first && newSentence && !ltPre ? capFirst(np.lt[k]) : np.lt[k]) + (last ? ltPost : ""),
          flag: np.flags[k],
        });
      });
      sayParts.push(pre + (newSentence ? capFirst(np.en.join(" ")) : np.en.join(" ")) + post);
      continue;
    }
    const enV = valuesIn(agreeEn(en), "en");
    const ltV = valuesIn(agreeIn(lt), "lt");
    units.push({ en: enV, lt: ltV, flag: src.flags?.[i] });
    sayParts.push(valuesIn(agreeEn(en), "say"));
  }

  // Natural Lithuanian
  let nat = resolveGender(src.nat);
  nat = nat.replace(new RegExp(PH_LT.source, "g"), (_m, name: string, kind: string | undefined, c: Case) => {
    const b = binding(vars, name);
    if (!b) return "…";
    const np = npUnits(b, (kind || "head") as any, c, opts.look, g === "f");
    return np.natLt.join(" ");
  });
  nat = valuesIn(agreeIn(nat), "lt");

  // a sentence that starts with a placeholder still starts with a capital ("A latte, please.")
  const startsWithSlot = (t: string) => /^[\s"“„'‘(¿¡]*\{/.test(t);
  if (units.length && startsWithSlot(src.en)) units[0] = { ...units[0], en: capFirst(units[0].en) };
  if (units.length && startsWithSlot(src.lt)) units[0] = { ...units[0], lt: capFirst(units[0].lt) };
  if (startsWithSlot(src.nat)) nat = capFirst(nat);
  const enClean = units.map((u) => u.en).join(" ");
  let say = src.say ? valuesIn(agreeEn(resolveTarget(src.say, { player: g, speaker: sp, formal })), "say") : sayParts.join(" ");
  if (startsWithSlot(src.say ?? src.en)) say = capFirst(say);
  if (src.say && /\{[A-Za-z_]/.test(say)) {
    say = say.replace(/\{([A-Za-z_]\w*)(?:\.(np|the|pl|bare))?\}/g, (_m, name: string, kind?: string) => {
      const b = binding(vars, name);
      if (!b) return "";
      return npUnits(b, (kind || "head") as any, "nom", opts.look, g === "f").en.join(" ");
    });
  }
  return { units, en: enClean, nat, say: say.replace(/\s+/g, " ").trim() };
}

function capFirst(t: string): string {
  return t.replace(/^([\s"“„'‘(¿¡]*)(\p{Ll})/u, (_m, pre: string, ch: string) => pre + ch.toUpperCase());
}

/** Replace the X placeholder with a gap "…" (hint pattern display). */
export function gapSentence(src: SentSrc, opts: ComposeOpts): Sentence {
  return compose(src, {}, opts);
}

/** Placeholder names used by a sentence (for enumeration and validation). */
export function placeholders(src: SentSrc): { entities: string[]; values: string[] } {
  const entities = new Set<string>(), values = new Set<string>();
  for (const u of splitUnits(src.en)) { const m = u.match(PH_EN); if (m) entities.add(m[2]); }
  for (const m of (src.en + " " + src.lt + " " + src.nat + " " + (src.say || "")).matchAll(PH_VAL)) values.add(m[1]);
  for (const m of src.lt.matchAll(PH_AGREE)) entities.add(m[2]);
  for (const m of src.en.matchAll(PH_AGREE_TARGET)) entities.add(m[2]);
  return { entities: [...entities], values: [...values] };
}
