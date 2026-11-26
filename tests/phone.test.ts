import { afterEach, describe, expect, it, vi } from "vitest";
import { audioKey } from "../src/audio-key";
import { townDirectory, practiceTurns, missionUrl, type PracticeId } from "../src/content/phoneBooth";
import manifest from "../public/audio-v2/manifest.json";
import { concertInvitation, invitationLocation, invitationTitle } from "../src/content/phoneCalls";
import inviteCall from "../src/content/situations/s83-invite-call";
import { SITUATIONS } from "../src/content/situations/catalog";
import { canShowPhoneCard, nextPhoneCall, type PhoneSnapshot } from "../src/game/phone/schedule";
import { TownPhone } from "../src/game/phone/Phone";
import { useStore } from "../src/state/store";
import { emptyProgress, loadProgress, saveProgress, sitProgress } from "../src/state/progress";

const walking: PhoneSnapshot = {
  town: true, onFoot: true, grounded: true, visible: true, enabled: true, conversation: false, panel: false, dialog: false, guide: false,
  banner: false, cardOpen: false,
  flight: false, loading: false, transition: false, mode: false,
};
const due = { active: 120, sinceCard: 240, calm: 10 };

describe("town phone guard", () => {
  it("allows a quiet, visible town after all waits", () => {
    expect(canShowPhoneCard(walking, due)).toBe(true);
  });

  it.each([
    ["pictures-only or town not running", { town: false }],
    ["car, boat, convertible or swimming", { onFoot: false }],
    ["jumping or climbing above the ground", { grounded: false }],
    ["place banner", { banner: true }],
    ["another phone card", { cardOpen: true }],
    ["hidden tab", { visible: false }],
    ["setting off", { enabled: false }],
    ["conversation, end card or next place", { conversation: true }],
    ["panel", { panel: true }],
    ["dialog", { dialog: true }],
    ["coach card", { guide: true }],
    ["first-time flight", { flight: true }],
    ["conversation loading or starting", { loading: true }],
    ["door transition or scripted taxi", { transition: true }],
    ["taxi, surf, meeting or any registered mode", { mode: true }],
  ] as const)("blocks %s, even when forced", (_, blocker) => {
    const snapshot = { ...walking, ...blocker };
    expect(canShowPhoneCard(snapshot, due)).toBe(false);
    expect(canShowPhoneCard(snapshot, { ...due, forceDue: true })).toBe(false);
  });

  it.each([{ active: 119.9 }, { sinceCard: 239.9 }, { calm: 9.9 }])("blocks before %j reaches the minimum", (timer) => {
    expect(canShowPhoneCard(walking, { ...due, ...timer })).toBe(false);
  });

  it("only forces the initial and between-card waits", () => {
    const forced = { active: 0, sinceCard: 0, calm: 10, forceDue: true };
    expect(canShowPhoneCard(walking, forced)).toBe(true);
    expect(canShowPhoneCard(walking, { ...forced, calm: 9.9 })).toBe(false);
  });
});

const complete = (progress: ReturnType<typeof emptyProgress>, ...ids: string[]) => {
  for (const id of ids) progress.sits[id] = { ...sitProgress(progress, id), completions: 1 };
};

describe("call route", () => {
  it("needs a completed conversation before the call and follows chapter then order", () => {
    const p = emptyProgress();
    expect(nextPhoneCall(SITUATIONS, p, 0)).toBeNull();
    complete(p, "s62-visitor-center");
    expect(nextPhoneCall(SITUATIONS, p, 0)).toBeNull();
    complete(p, "s63-party");
    expect(nextPhoneCall(SITUATIONS, p, 0)).toBe("s76-dentist-call");
    complete(p, "s76-dentist-call", "s80-support-call");
    expect(nextPhoneCall(SITUATIONS, p, 0)).toBe("s89-video-call");
    complete(p, "s89-video-call", "s90-running-late");
    expect(nextPhoneCall(SITUATIONS, p, 0)).toBe("s83-invite-call");
  });

  it("uses an earlier completion in the same chapter and skips calls in later chapters", () => {
    const p = emptyProgress();
    complete(p, "p18-startup", "s76-dentist-call", "s80-support-call", "s89-video-call", "s90-running-late", "s83-invite-call", "p26-complaint");
    expect(nextPhoneCall(SITUATIONS, p, 0)).toBe("p24-flood");
    complete(p, "p24-flood");
    expect(nextPhoneCall(SITUATIONS, p, 0)).toBeNull();
  });

  it("skips active retry waits and stops after the original card and two retries", () => {
    const p = emptyProgress();
    complete(p, "s63-party");
    p.phone = { played: 0, missed: { "s76-dentist-call": { presentations: 1, retryAt: 360 } } };
    expect(nextPhoneCall(SITUATIONS, p, 359.9)).toBe("s80-support-call");
    expect(nextPhoneCall(SITUATIONS, p, 360)).toBe("s76-dentist-call");
    p.phone.missed["s76-dentist-call"] = { presentations: 3, retryAt: 720 };
    expect(nextPhoneCall(SITUATIONS, p, 800)).toBe("s80-support-call");
  });
});

describe("card timing", () => {
  afterEach(() => {
    useStore.setState(useStore.getInitialState());
    vi.unstubAllGlobals();
  });

  it("pauses an unanswered card in a hidden tab, and spends a retry when the next card is shown", () => {
    const p = emptyProgress(), id = "s76-dentist-call";
    complete(p, "s63-party", "s80-support-call", "s89-video-call", "s90-running-late", "s83-invite-call");
    useStore.setState({ progress: p });
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });
    const phone = new TownPhone();
    phone.tick(120, walking);
    const hud = () => useStore.getState().hud;
    expect(hud().phoneCard).toBe(id);
    phone.tick(10, walking);
    phone.tick(1000, { ...walking, visible: false });
    expect(hud().phoneCard).toBe(id);
    expect(vibrate).toHaveBeenLastCalledWith(0);
    phone.tick(15, walking);
    expect(hud().phoneCard).toBeNull();
    expect(useStore.getState().progress.phone?.missed[id]).toEqual({ presentations: 1, retryAt: 505 });
    phone.dueNow();
    phone.tick(359, walking);
    expect(hud().phoneCard).toBeNull();
    phone.tick(1, walking);
    expect(hud().phoneCard).toBe(id);
    phone.observe({ ...walking, panel: true });
    expect(hud().phoneCard).toBeNull();
    expect(useStore.getState().progress.phone?.missed[id]?.presentations).toBe(2);
  });
});

describe("follow-up save", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ["station", "station"], ["cafe", "sunny-cup"], ["bus_stop", "bus-stop"], ["entrance", "town-square"],
  ])("maps %s to %s", (place, loc) => expect(invitationLocation(place)).toBe(loc));

  it("uses the existing place chip and localizes the agreed evening time", () => {
    const places = inviteCall.entities!.place;
    const state = { place: "cafe", meetTime: { h: 7, m: 30 } };
    const invite = concertInvitation({ ...state, day: "friday" }, places)!;
    expect(invitationTitle(invite)).toBe("Susitik su Lizzie prie kavinės · penktadienį 19:30");
    expect(concertInvitation(state, places)?.when).toBe("19:30");
    expect(concertInvitation({ ...state, meetTime: undefined }, places)).toBeUndefined();
    expect(concertInvitation({ ...state, place: "office" }, places)).toBeUndefined();
  });

  it("loads saves from before the feature and round-trips calls and tasks", () => {
    const saved = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => saved.get(key), setItem: (key: string, value: string) => saved.set(key, value) });
    const progress = emptyProgress();
    saveProgress(progress);
    expect(loadProgress().phone).toBeUndefined();
    progress.phone = {
      played: 420, lastCard: 407,
      missed: { "p24-flood": { presentations: 2, retryAt: 770 } },
      invitation: { place: "cafe", chip: "prie kavinės", when: "penktadienį 19:30" },
      office: true, followUp: "office",
    };
    saveProgress(progress);
    expect(loadProgress()).toEqual(progress);
  });
});

describe("Union Station directory", () => {
  it("groups by person, separates remote businesses from places, and puts both practices first", () => {
    const rows = townDirectory();
    expect(rows.slice(0, 2).map(row => row.npc.id)).toEqual(["lizzie", "harris"]);
    const names = rows.slice(2).map(row => row.npc.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
    expect(new Set(rows.map(row => row.npc.id)).size).toBe(rows.length);
    expect(rows[0].calls.map(s => s.id).sort()).toEqual(["p24-flood", "s83-invite-call"]);
    expect(rows.find(r => r.npc.id === "linda")).toMatchObject({ organizations: ["Green Street Dental"], places: [] });
    expect(rows.find(r => r.npc.id === "kate")?.places.map(p => p.id)).toEqual(["office"]);
    expect(rows.find(r => r.npc.id === "walter")?.places.map(p => p.id)).toEqual(["station"]);
    expect(rows.find(r => r.npc.id === "mr_grant")?.calls).toEqual([]);
  });

  const cases = [
    ["s83-invite-call", ["8414938a6ee1", "5fb44353be01", "4a39bf19d87f", "008f0031cc52"], ["8414938a6ee1", "e6086c3c84ee", "4a39bf19d87f", "6a5b1b12a38b"]],
    ["s90-running-late", ["d3be99fe43d4", "2b740a4fab29", "933dcda8650b", "af14a40186fe"], ["d3be99fe43d4", "bfd047e02215", "933dcda8650b", "c627968cb959"]],
  ] as const;
  it.each(cases)("resolves four exact recorded turns for both coaches in %s", async (id, female, male) => {
    for (const gender of ["f", "m"] as const) {
      const turns = await practiceTurns(id, gender);
      expect(turns.map(t => t.learner)).toEqual([false, true, false, true]);
      const keys = turns.map(t => audioKey(t.voice, 1, t.sentence.say));
      expect(keys).toEqual(gender === "f" ? female : male);
      for (const key of keys) expect(manifest).toHaveProperty(key);
      expect(turns[id === "s83-invite-call" ? 1 : 2].sentence.nat)
        .toBe(id === "s83-invite-call" ? "Ar turi laiko penktadienį?" : "Kada, Jūsų manymu, atvyksite?");
    }
  });

  it.each([["s83-invite-call", "S83"], ["s90-running-late", "S90"]] as const)("links %s only on a configured course", (id: PracticeId, mission) => {
    const here = "https://game.example/game/";
    expect(missionUrl(id, undefined, here)).toBeUndefined();
    expect(missionUrl(id, "/", here)).toBe("https://game.example/situacijos/" + mission);
    expect(missionUrl(id, "https://course.example/home", here)).toBe("https://course.example/situacijos/" + mission);
  });
});
