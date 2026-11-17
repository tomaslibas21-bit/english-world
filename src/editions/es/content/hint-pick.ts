// A hint group made of some of another group's items, in the order given (owner, 17 Nov 2026: the learner's replies
// follow what the person just said). The card shows a group's first three answers, so a question that only some of
// them answer, or one that an item would ask again, gets its own group. The same items: the coach's clips and the
// learner layers' sentences are shared, and the label stays the group's own unless one is given (a new label needs
// its Lithuanian in src/editions/es-lt/tables).
import type { HintGroup } from "../../../content/types";

export function pick(g: HintGroup, ids: string[], lt: string = g.lt): HintGroup {
  // (every item with that id: a group may give one id a singular and a plural form)
  const items = ids.flatMap((id) => {
    const its = g.items.filter((x) => x.id === id);
    if (!its.length) throw new Error(`pick: no item "${id}" in the group "${g.lt}"`);
    return its;
  });
  return { ...g, lt, items };
}

/** A group of items from several groups ([group, item ids] each, in order), under the label `lt`. */
export function pickFrom(lt: string, ...parts: [HintGroup, string[]][]): HintGroup {
  return { lt, items: parts.flatMap(([g, ids]) => pick(g, ids).items) };
}

/** The pay card's group when the person has just named a way to pay (owner, 17 Nov 2026): after "¿Efectivo o
 *  tarjeta?" or "Puede pagar con tarjeta aquí" it answers that ("Con tarjeta, por favor." / "En efectivo.", the
 *  conversation's `<base>_ans`); after "Claro, en efectivo" it hands the money over (`<base>_here`); otherwise the
 *  usual group, where "¿Aceptan tarjeta?" leads because nobody has mentioned a card yet. */
export function payHint(c: unknown, base = "pay"): string {
  const conv = (c as { conv?: { saidThisTurn?: () => readonly { sentence?: { en?: string } }[]; lastLines?: readonly { sentence?: { en?: string } }[] } }).conv;
  const lines = [...(conv?.saidThisTurn?.() ?? []), ...(conv?.lastLines ?? [])];
  const text = lines.map((l) => l.sentence?.en ?? "").join(" ").toLowerCase();
  if (/tarjeta/.test(text)) return base + "_ans";
  if (/efectivo/.test(text)) return base + "_here";
  return base;
}
