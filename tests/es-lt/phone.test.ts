import { expect, it } from "vitest";
import { PHONE_CALLS, FLOOD_INCOMING_INTRO, MEETING_DONE, OFFICE_TASK, concertInvitation, invitationTitle } from "@/content/phoneCalls";
import { loadSituation } from "@/content/situations/catalog";
import { L } from "@/ui/i18n";

it("uses the Lithuanian learner's phone copy", () => {
  expect(PHONE_CALLS["s80-support-call"]).toMatchObject({ name: "NetWave", reason: "Neveikia internetas, modemo lemputė mirksi raudonai. Paskambink tiekėjui." });
  expect(PHONE_CALLS["p26-complaint"]).toMatchObject({ name: "Hogar Puerto", reason: "Nauja sofa atvežta pavėluotai ir sulūžusi. Skambink į parduotuvę – mandagiai, bet tvirtai." });
  expect(FLOOD_INCOMING_INTRO).toBe("Šeštadienis, pusė devynių ryto, o tavo kojos šlapios: naktį viršuje trūko vamzdis, ir virtuvėje teka upė. Skambina Andrea – devintą turėjote susitikti pusryčių. Papasakok jai, kas nutiko (tú), paskui paskambink Don Gilbertui, pastato administratoriui (usted).");
  expect(MEETING_DONE).toBe("Susitikai su Andrea. Gero koncerto!");
  expect(OFFICE_TASK).toBe("Skubėk į biurą – susirinkimas jau prasidėjo");
  expect(invitationTitle(concertInvitation({ place: "kiosco", day: "friday", meetTime: { h: 8, m: 0 } })!))
    .toBe("Susitik su Andrea prie kiosko aikštėje · penktadienį 20:00");
  expect(L("Perskambinti")).toBe("Perskambinti");
});

it("loads all four Lithuanian glosses through the s83 catalog", async () => {
  const sit = await loadSituation("s83-invite-call");
  expect(sit?.lines.phone_meet_hello[0]).toMatchObject({ lt: "Labas! | Atėjai | pačiu | laiku!", nat: "Labas! Atėjai pačiu laiku!" });
  expect(sit?.lines.phone_meet_ready[0]).toMatchObject({ lt: "Labas, | Andrea! | Pasiruošusi | koncertui?", nat: "Labas, Andrea! Pasiruošusi koncertui?" });
  expect(sit?.lines.phone_meet_tickets[0]).toMatchObject({ lt: "Labas! | Čia | atsinešiau | bilietus.", nat: "Labas! Bilietai pas mane." });
  expect(sit?.lines.phone_meet_go[0]).toMatchObject({ lt: "Jau | noriu, | kad prasidėtų! | Einam.", nat: "Nekantrauju, kad prasidėtų! Einam." });
});
