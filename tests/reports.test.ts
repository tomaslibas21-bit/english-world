import { afterEach, expect, it, vi } from "vitest";
import {
  keepReport,
  reports,
  flushReports,
  type GameReport,
} from "../src/state/reports";
const report: GameReport = {
  version: 1,
  id: "12345678-1234-1234-1234-123456789abc",
  situation: "s35-gym",
  kind: "speech",
  detail: "wrong negation",
  expected: "I can't tomorrow",
  build: "test",
  step: "next",
  input: "voice",
  turns: [],
};
function storage() {
  const rows = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => rows.get(k) || null,
    setItem: (k: string, v: string) => rows.set(k, v),
  });
  return rows;
}
function account(rows: Map<string, string>, id: string, expired = false) {
  rows.set(
    "fs-files-token",
    JSON.stringify({
      account: id,
      token: `v1.9999999999.${id}.test`,
      exp: Date.now() / 1000 + (expired ? -3600 : 3600),
    }),
  );
}
afterEach(() => {
  vi.unstubAllGlobals();
});
it("keeps an expired offline token queue with the remembered account and sends after renewal", async () => {
  const rows = storage();
  account(rows, "learner-a", true);
  vi.stubGlobal("navigator", { onLine: false });
  expect(keepReport(report)).toBe(true);
  expect(rows.has("english-world-reports-v1-learner-a")).toBe(true);
  expect(reports()).toHaveLength(1);
  account(rows, "learner-a");
  vi.stubGlobal("navigator", { onLine: true });
  const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));
  vi.stubGlobal("fetch", fetch);
  await flushReports();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(reports()).toHaveLength(0);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(report);
});
it("does not submit another account’s queued reports", async () => {
  const rows = storage();
  account(rows, "learner-a", true);
  keepReport(report);
  account(rows, "learner-b");
  vi.stubGlobal("navigator", { onLine: true });
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await flushReports();
  expect(fetch).not.toHaveBeenCalled();
  expect(
    JSON.parse(rows.get("english-world-reports-v1-learner-a")!),
  ).toHaveLength(1);
});
