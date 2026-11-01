// The interface's words. They are written in Lithuanian, the English edition's learner's language, and shown as
// written there. Another edition's learner reads them in their own language: the Spanish edition's
// src/editions/es/ui/strings.ts maps each Lithuanian string to English (docs/es/EDITIONS.md "Interface").
// Write every new interface string through L() (plain text) or Lx() (with React nodes inside), and add its
// translation there; `npx tsx tools/i18n-check.ts` lists strings that are missing or left unwrapped.
import { Fragment, createElement, type ReactNode } from "react";
import { STRINGS } from "./strings";
import { EDITION } from "../edition";

/** The practised language for `lang` attributes: "en" in Maple Harbor, "es" in Puerto Colibrí. */
export const TL = EDITION.target.split("-")[0];

/** A Lithuanian interface string in the learner's language; `{name}` placeholders are filled from `vars`. */
export function L(lt: string, vars?: Record<string, string | number>): string {
  const s = STRINGS[lt] ?? lt;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}

/** The same with React nodes in the placeholders: Lx("Spausk {mic} ir kalbėk", { mic: <Icon … /> }). */
export function Lx(lt: string, nodes: Record<string, ReactNode>): ReactNode {
  const s = STRINGS[lt] ?? lt;
  const parts = s.split(/(\{\w+\})/);
  return createElement(Fragment, null, ...parts.map((p, i) => {
    const m = /^\{(\w+)\}$/.exec(p);
    return m && m[1] in nodes ? createElement(Fragment, { key: i }, nodes[m[1]]) : p;
  }));
}
