// The learner's own lines in the kit's mini-games are listed for voicing in the coach voices, as the kit plays a
// tapped answer (src/game/kit/dialogue.ts), and never in the person's voice when only the learner says them
// (tools/enumerate.ts KIT_LEARNER, 23 Nov 2026). Before, Go Fish's asks, the pool calls, the taxi's answers and fares
// and the phone meeting were never voiced for the learner.
import { describe, expect, it } from "vitest";
import { enumerateAll } from "../tools/enumerate";

const { utts } = enumerateAll({ v2: true, fuzzRuns: 0, only: ["s66-taxi", "s85-dinner", "x01-pool-hall", "s83-invite-call"] });
const said = (voice: string, say: string) => utts.some((u) => u.voice === voice && u.say === say);

describe("kit learner lines", () => {
  it("lists Go Fish's asks and replies in both coach voices and the hosts' voices", () => {
    for (const v of ["g_coach_f", "g_coach_m", "g_dan", "g_nora"]) expect(said(v, "Do you have any apples?"), v).toBe(true);
    for (const v of ["g_coach_f", "g_coach_m"]) expect(said(v, "Nope. Go fish!"), v).toBe(true);
  });
  it("lists the pool calls as pieces for the learner and Tina, the answers for the learner only", () => {
    for (const v of ["g_coach_f", "g_coach_m", "g_tina"]) expect(said(v, "Seven ball,"), v).toBe(true);
    for (const v of ["g_coach_f", "g_coach_m"]) expect(said(v, "far left corner."), v).toBe(true);
    expect(said("g_coach_f", "Thanks, that was fun!")).toBe(true);
    expect(said("g_tina", "Thanks, that was fun!")).toBe(false);
  });
  it("lists the taxi's answers and fares for the learner, not for Vinnie", () => {
    for (const say of ["Where to?", "That's twenty-four fifty.", "Thanks! Have a nice day!"]) {
      expect(said("g_coach_m", say), say).toBe(true);
      expect(said("g_vinnie", say), say).toBe(false);
    }
  });
  it("lists the phone meeting: Lizzie's two lines and the learner's two answers", () => {
    expect(said("g_lizzie", "Hey, there you are! Right on time.")).toBe(true);
    expect(said("g_coach_f", "Hi! I've got the tickets right here.")).toBe(true);
    expect(said("g_lizzie", "Hi! I've got the tickets right here.")).toBe(false);
  });
});
