import { variety } from "../../convo/compose";

export function townLineText(line: { en: string; neutral?: string }) {
  const selected = variety();
  return selected === "neutral" || selected === "spain" ? line.neutral ?? line.en : line.en;
}
