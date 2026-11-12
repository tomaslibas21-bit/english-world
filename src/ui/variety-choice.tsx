// The first-start choice of Spanish on the title form: nothing in Maple Harbor. The Spanish edition's file
// (src/editions/es/ui/variety-choice.tsx) replaces this one (the edition overlay, docs/es/EDITIONS.md).
import type { ReactElement } from "react";

/** Shown on the title form above the start button until a choice is saved; this edition has none. */
export function VarietyChoice(): ReactElement | null {
  return null;
}

/** Starting from the title form: saves the choice shown if none was tapped (the Spanish edition); nothing here. */
export function commitVarietyChoice(): void {}
