// Explicitly submitted diagnostics, kept offline until the learner can send them.
// No audio, auth tokens, page URLs, profile or microphone recording enters a report.
import { filesToken } from "../game/audio";
import { EDITION } from "../edition";
export const REPORT_KEY = `${EDITION.storage}-reports-v1`;
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
const account = () => {
  const active = token().split(".")[2];
  if (active) return active;
  // A downloaded game opens without ?t; keep its queue with the same account after the token expires offline.
  try {
    const saved = JSON.parse(localStorage.getItem("fs-files-token") || "null");
    const owner = saved?.account || saved?.token?.split(".")[2];
    if (typeof owner === "string" && /^[a-zA-Z0-9-]{1,64}$/.test(owner))
      return owner;
  } catch {
    /* no remembered account */
  }
  return "guest";
};
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
  if (!access || !navigator.onLine || !EDITION.reports) return false;
  try {
    const r = await fetch(
      EDITION.reports,
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
