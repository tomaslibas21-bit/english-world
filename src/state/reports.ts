// Explicitly submitted diagnostics, kept offline until the learner can send them.
// No audio, auth tokens, page URLs, profile or microphone recording enters a report.
import { filesToken } from "../game/audio";
export const REPORT_KEY = "english-world-reports-v1";
export const GAME_BUILD = "2026-11-04-beta1";
export type GameReport = {
  version: 1;
  id: string;
  situation: string;
  kind: "translation" | "speech" | "dialogue" | "other";
  detail: string;
  expected: string;
  build: string;
  step: string;
  input: string;
  turns: {
    who: "npc" | "you";
    text: string;
    lt: string;
    heard: string;
    alternatives: string[];
  }[];
};
const account = () => token().split(".")[2] || "guest";
const storageKey = () => REPORT_KEY + "-" + account();
export function reports(): GameReport[] {
  try {
    const rows = JSON.parse(localStorage.getItem(storageKey()) || "[]");
    return Array.isArray(rows) ? rows.slice(-30) : [];
  } catch {
    return [];
  }
}
export function keepReport(report: GameReport) {
  const rows = reports().filter((r) => r.id !== report.id);
  rows.push(report);
  try {
    localStorage.setItem(storageKey(), JSON.stringify(rows.slice(-30)));
    return true;
  } catch {
    return false;
  }
}
function token() {
  return filesToken() || "";
}
export async function sendReport(report: GameReport) {
  const access = token(),
    key = storageKey();
  if (!access || !navigator.onLine) return false;
  try {
    const r = await fetch(
      "https://audio.dvikalbesdainos.lt/fluent-steps/_game_reports",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer " + access,
        },
        body: JSON.stringify(report),
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!r.ok) return false;
    if (key === storageKey())
      localStorage.setItem(
        key,
        JSON.stringify(reports().filter((x) => x.id !== report.id)),
      );
    return true;
  } catch {
    return false;
  }
}
let flushing = false;
export async function flushReports() {
  if (flushing) return;
  flushing = true;
  try {
    const owner = account();
    for (const report of reports()) {
      if (account() !== owner) break;
      if (!(await sendReport(report))) break;
    }
  } finally {
    flushing = false;
  }
}
