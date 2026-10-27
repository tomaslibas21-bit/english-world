// The Gemini voices (docs/VOICING-PLAN.md): the game's voice ids, the casting, and the batch tool's requests and
// audio decoding. Nothing here calls Gemini.
import { describe, expect, it } from "vitest";
import { NPCS, COACH_VOICE } from "../src/content/npcs";
import { AMBIENT_VOICES } from "../src/content/ambient";
import { ambientVoice, audioDir, coachVoice, coachVoices, npcVoice } from "../src/content/voices";
import { CAST, COACH, AMBIENT, clashes, roleFor } from "../tools/casting";
import { decodeAudio, geminiText } from "../tools/audio-util";
import { likeness, numbersToDigits, request, sampleOf, saysMore, syllables, tooLong } from "../tools/voice-batch";

describe("voice ids", () => {
  it("v1 keeps the voices the game plays now", () => {
    const mia = NPCS.mia;
    expect(npcVoice(mia, false)).toBe(mia.voice);
    expect(coachVoice("m", false)).toBe(COACH_VOICE);
    expect(coachVoices(false)).toEqual([COACH_VOICE]);
    expect(ambientVoice("f", false)).toBe(AMBIENT_VOICES.f);
    expect(audioDir(false)).toBe("audio/");
  });
  it("v2 gives every character a voice of their own and the coach the learner's gender", () => {
    expect(npcVoice(NPCS.mia, true)).toBe("g_mia");
    expect(coachVoice("m", true)).toBe("g_coach_m");
    expect(coachVoice("f", true)).toBe("g_coach_f");
    expect(coachVoice(undefined, true)).toBe("g_coach_f");
    expect(coachVoices(true)).toEqual(["g_coach_f", "g_coach_m"]);
    expect(ambientVoice("m", true)).toBe("g_amb_m");
    expect(audioDir(true)).toBe("audio-v2/");
  });
});

describe("casting", () => {
  it("casts every character, coach and passer-by", () => {
    for (const id of Object.keys(NPCS)) expect(roleFor(npcVoice(NPCS[id], true))?.voice, id).toBeTruthy();
    expect(roleFor("g_coach_m")?.voice).toBe(COACH.m.voice);
    expect(roleFor("g_amb_f")?.voice).toBe(AMBIENT.f.voice);
    expect(roleFor("af_heart")).toBeNull();
  });
  it("gives people who meet in a conversation different voices, and the coach voices to no one", () => {
    expect(clashes()).toEqual([]);
    const coach = new Set([COACH.f.voice, COACH.m.voice]);
    for (const [id, r] of Object.entries(CAST)) expect(coach.has(r.voice), id).toBe(false);
  });
  it("gives each character a voice of their gender", () => {
    const female = new Set(["Zephyr", "Kore", "Leda", "Aoede", "Callirrhoe", "Autonoe", "Despina", "Erinome", "Laomedeia", "Achernar", "Gacrux", "Pulcherrima", "Vindemiatrix", "Sulafat"]);
    for (const n of Object.values(NPCS)) expect(female.has(CAST[n.id].voice), n.id).toBe(n.gender === "f");
  });
});

describe("batch requests", () => {
  it("sends the line as a transcript and the manner apart, so it isn't read aloud", () => {
    const r = request("Hi there!", "Kore", "firm and clear");
    expect(r.contents[0].parts[0]).toEqual({ text: "Hi there!", speech_metadata: { style: "firm and clear" } });
    expect(r.generationConfig).toEqual({ responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { voice: "Kore" } } });
  });
  it("spells for Gemini without sound tags", () => {
    expect(geminiText("Salt & pepper — <laugh> “please”…")).toBe("Salt and pepper, laugh \"please\"...");
    expect(geminiText("Gate #4")).toBe("Gate number 4");
  });
  it("picks a casting sample of a few lines per voice, the same examples for both coaches", () => {
    const L = (who: string, say: string, where = "s72:greet[0]") => ({ key: who + say, voice: "g_" + who, speed: 1, say, text: say, gv: "Kore", style: "", who, where });
    const lines = [
      ...["Hi there, what can I get you?", "One large latte with oat milk, coming right up.", "That comes to four dollars and fifty cents, please.", "Have a great day and see you tomorrow morning!"].map((s) => L("mia", s)),
      ...["Could I have a small coffee, please?", "Do you have any oat milk at all?", "Thank you so much, have a nice day!"].flatMap((s) => [L("coach_f", s, "s72:hint:a.b"), L("coach_m", s, "s72:hint:a.b")]),
    ];
    const s = sampleOf(lines);
    expect(s.filter((l) => l.who === "mia")).toHaveLength(3);
    expect(s.filter((l) => l.who === "coach_f").map((l) => l.say)).toEqual(s.filter((l) => l.who === "coach_m").map((l) => l.say));
  });
});

describe("audio from Gemini", () => {
  const pcm = (vals: number[]) => { const b = Buffer.alloc(vals.length * 2); vals.forEach((v, i) => b.writeInt16LE(v, i * 2)); return b; };
  it("reads raw 16-bit PCM", () => {
    const { samples, rate } = decodeAudio(pcm([0, 16384, -32768]), "audio/L16;codec=pcm;rate=24000");
    expect(rate).toBe(24000);
    expect([...samples]).toEqual([0, 0.5, -1]);
  });
  it("reads a WAV, also one whose data size is unknown (streamed)", () => {
    const data = pcm([1000, -1000, 2000, -2000]);
    for (const size of [data.length, 0xffffffff]) {
      const h = Buffer.alloc(44);
      h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8);
      h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(16000, 24);
      h.writeUInt32LE(32000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(size, 40);
      const { samples, rate } = decodeAudio(Buffer.concat([h, data]), "audio/wav");
      expect(rate).toBe(16000);
      expect(samples.length).toBe(4);
      expect(samples[2]).toBeCloseTo(2000 / 32768);
    }
  });
});

describe("the Whisper check", () => {
  it("compares letters, not punctuation or spacing", () => {
    expect(likeness("Hi there! What can I get you?", "Hi there, what can I get you?")).toBe(1);
    expect(likeness("One latte, please.", "One lot of, please.")).toBeLessThan(0.85);
  });
  it("reads numbers in words and in digits as the same", () => {
    expect(numbersToDigits("seven thousand seven hundred fifty")).toBe("7750");
    expect(numbersToDigits("nine hundred fifteen dollars")).toBe("915 dollars");
    expect(numbersToDigits("change: twenty-seven sixty-four.")).toBe("change: 2764");
    expect(numbersToDigits("thirty-seven oh nine")).toBe("3709");
    expect(numbersToDigits("Oh, the blue one")).toBe("oh, the blue 1");
    expect(likeness("It's a hundred and one point two.", "It's 101.2.")).toBe(1);
    expect(likeness("That's about a hundred and seven Fahrenheit.", "That's about 107 Fahrenheit.")).toBe(1);
    expect(likeness("Come in, come in!", "Come in. Come in.")).toBe(1);
    expect(likeness("Mm.", "Mmm.")).toBe(1);
    // what Whisper wrote for the dry run's clips
    expect(likeness("Hold on, I said seven thousand seven hundred fifty. I won't take a cent more.", "Hold on, I said 7,750. I won't take a cent more.")).toBe(1);
    expect(likeness("Here you go: nine hundred fifteen dollars. Here's your receipt.", "Here you go. $915. Here's your receipt.")).toBe(1);
    expect(likeness("Okay, twenty-three fifty-eight on pump six. Come back in for your change.", "Okay. 2358 on pump 6. Come back in for your change.")).toBe(1);
  });
  it("counts a sentence Whisper repeats once", () => {
    expect(likeness("There are bags right here. Take one.", "There are bags right here. Take one. Take one. Take one.")).toBe(1);
    expect(likeness("Great, Wednesday works for me.", "Great, Wednesday works for me. Great, Wednesday works for me.")).toBe(1);
    expect(likeness("Great, Wednesday works for me.", "Great, Wednesday works for me. See you then.")).toBeLessThan(0.85);
    // a line said twice in the audio (Gemini sometimes does) still counts as different
    expect(likeness("No black pepper? Okay.", "N-no black pepper? Okay. N-no black pepper? Okay.")).toBeLessThan(0.85);
  });
  it("counts syllables roughly, numbers in words too", () => {
    expect(syllables("Okay, that's thirty-six thirty-eight.")).toBe(9);
    expect(syllables("Gate 4, please.")).toBe(3);
    expect(syllables("M-I-K-A-S")).toBe(5);
  });
  // what real clips came out as (seconds), at the characters' paces (seconds per syllable)
  it("finds a clip that says more than the line by what Whisper heard and how long the clip is", () => {
    expect(saysMore("Debit, please.", "debit, please debit, please debit, please", 2.48, 0.22)).toBe(true);
    expect(saysMore("Okay, that's thirty-six thirty-eight.", "Okay, that's 3638. Okay, that's 3638. Okay, that's 3638.", 5.3, 0.22)).toBe(true);
    expect(saysMore("All done? That came to eight twenty-five.", "All done? All done? That came to 825.", 5.12, 0.23)).toBe(true);
    // Whisper wrote it twice, but the clip is too short to say it twice
    expect(saysMore("Okay. Just make sure you leave within ninety days.", "Okay, just make sure you leave within 90 days. Okay, just make sure you leave within 90 days.", 3.42, 0.23)).toBe(false);
    expect(saysMore("Sure!", "Sure. Sure.", 0.85, 0.22)).toBe(false);
    expect(saysMore("Sorry, Saturday?", "Sorry, Saturday?", 2.48, 0.22)).toBe(false);
    expect(saysMore("Come in, come in!", "Come in. Come in.", 1.6, 0.22)).toBe(false);
  });
  it("leaves slow lines alone and records far too long ones again before Whisper hears them", () => {
    expect(tooLong("Again: H, H, four, four, seven, one.", "Again, hh-h-four-four-seven-one.", 6.56, 0.25)).toBe(false);
    expect(tooLong("Nice!", "Nice!", 1.23, 0.24)).toBe(false);
    expect(tooLong("Where can I find sunscreen?", undefined, 5.2, 0.24)).toBe(true);
    expect(tooLong("Where can I find sunscreen?", undefined, 2.1, 0.24)).toBe(false);
  });
});
