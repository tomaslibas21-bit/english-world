// The voice list's clip keys as JSON (25 Nov 2026), for tests/browser/voice-reach.mjs: the same enumerateAll the
// recording batch makes its list with (tools/voice-batch.ts plan: v2 voices, 120 runs), for the whole game or for
// some conversations.
//   npx tsx tools/voice-list.ts --keys [--sits=s87-interview,s72-cafe]
import { SITUATIONS } from "../src/content/situations";
import { audioKey } from "../src/audio-key";
import { enumerateAll } from "./enumerate";

const args = process.argv.slice(2);
const ids = args.find((a) => a.startsWith("--sits="))?.slice("--sits=".length).split(",").filter(Boolean);
const sits = ids ? SITUATIONS.filter((s) => ids.includes(s.id)) : undefined;
if (ids && sits!.length !== ids.length) {
  console.error(`unknown conversation: ${ids.filter((id) => !sits!.some((s) => s.id === id)).join(", ")}`);
  process.exit(1);
}
const { utts, errors, unreached, unfilled } = enumerateAll({ v2: true, fuzzRuns: 120, sits });
const keys = [...new Set(utts.filter((u) => /[a-z0-9]/i.test(u.say)).map((u) => audioKey(u.voice, u.speed, u.say)))].sort();
process.stdout.write(JSON.stringify({
  status: "complete", errors, missingCasts: [], unresolved: [],
  scope: ids ?? "all", keys,
  unreached: unreached.filter((u) => !u.named).map((u) => `${u.sit}:${u.line}`), unfilled,
}));
