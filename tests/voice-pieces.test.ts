// The piece-by-piece check of voice clips (tools/voice-pieces.ts): a repeat that a whole-clip transcript hides must be
// found in the pieces, and a line that repeats words itself must not be taken for one.
import { describe, expect, it } from "vitest";
import { asHeard } from "../tools/voice-batch";
import { falseStart, heardAgain, judgePieces, onceInARow, repeatsItself, startedAgain, wordsLost, wordsOf, SOUNDS_TWICE, type Heard } from "../tools/voice-pieces";

const words = (s: string) => wordsOf(s, asHeard);
const heard = (whole: string, pieces: string[], more: Partial<Heard> = {}): Heard => ({
  key: "k", sec: 3, pauses: [], whole, words: [], pieces: pieces.map((p, i) => [i * 1000, (i + 1) * 1000, p]), engine: "parakeet", ...more,
});

describe("words heard again", () => {
  it("finds the receipt line's restart in the pieces (Threads, 15 Nov 2026)", () => {
    const said = "Would you like your receipt printed or emailed?";
    // what Whisper wrote for the whole clip, scored 1.0, and what the pieces say
    const v = judgePieces(said, heard(said, ["Would you like your", "Would you like your receipt?", "Printed or emailed?"]), asHeard);
    expect(v.again).toBe("would you like your");
    expect(v.where).toBe("pieces");
  });
  it("finds it in a whole transcript that wrote it down", () => {
    const v = judgePieces("Would you like your receipt printed or emailed?", heard("Would you like your would you like your receipt printed or emailed?", ["Would you like your would you like your receipt printed or emailed?"]), asHeard);
    expect(v.again).toBe("would you like your");
    expect(v.where).toBe("both");
  });
  it("counts a word said twice in a row", () => {
    expect(heardAgain(words("Sure, I'll wait right here."), words("Sure. Sure. I'll wait right here."))).toBe("sure sure");
    expect(heardAgain(words("Walk up and down."), words("Walk up up and down."))).toBe("up up");
  });
  it("leaves a line alone that says something twice itself", () => {
    expect(heardAgain(words("No, no, I'm fine."), words("No, no, I'm fine."))).toBeUndefined();
    expect(heardAgain(words("I see, I see. Bye-bye!"), words("I see, I see. Bye bye."))).toBeUndefined();
    const price = "Seven thousand seven hundred fifty? I was thinking more along the lines of seven thousand two hundred fifty.";
    expect(judgePieces(price, heard(price, [price]), asHeard).again).toBeUndefined();
  });
  it("still counts one time more than the line says it", () => {
    expect(heardAgain(words("No, no, I'm fine."), words("No, no, no, I'm fine."))).toBe("no no");
  });
  it("does not mind how a number is written", () => {
    const said = "That'll be fifty-nine ninety-nine.";
    expect(judgePieces(said, heard("That'll be 59.99.", ["That'll be", "59.99."]), asHeard).again).toBeUndefined();
    expect(judgePieces(said, heard("That'll be fifty nine that'll be fifty nine ninety nine.", ["That'll be fifty nine", "that'll be fifty nine ninety nine."]), asHeard).again).toBeDefined();
  });
  it("finds a line begun again after a word cut short", () => {
    const again = (said: string, heard: string) => startedAgain(words(said), words(heard));
    expect(again("They're thirty-four ninety-nine.", "They're 34 na They're 3499.")).toBe("theyre … theyre");
    expect(again("I'm looking for a dress.", "I'm look if I'm looking for a dress.")).toBe("im … im");
    expect(again("A bagel as well, please.", "A big a bagel as well, please.")).toBe("a … a");
    expect(again("Sorry, Saturday?", "Sorry Satur sorry, Saturday?")).toBe("sorry … sorry");
    expect(again("It's one hundred twenty-eight dollars.", "It's 10 It's $128.")).toBe("its … its");
    // a word the line has twice, heard twice: nothing extra
    expect(again("I have a cat and a dog.", "I have a cat and a dog.")).toBeUndefined();
    expect(again("Is that a European size? That's about a US seven.", "Is that a European size? That's about a US 7.")).toBeUndefined();
    // a recognizer's own slip is not a restart
    expect(again("The sugar is on the counter by the window.", "The sugar is in the counter by the window.")).toBeUndefined();
    expect(judgePieces("Your total is forty-seven forty-nine.", heard("Your t Your total is forty seven forty nine.", ["Yoot.", "Your total?", "Is forty seven forty nine."]), asHeard).again).toBe("your … your");
  });
  it("finds a word begun and begun again", () => {
    expect(falseStart(words("Their house had four walls."), words("Their house ha their house had four walls."))).toBeUndefined(); // heardAgain's case
    expect(heardAgain(words("Their house had four walls."), words("Their house ha their house had four walls."))).toBe("their house");
    expect(falseStart(words("Regular is fine."), words("Reg regular is fine."))).toBe("reg- regular");
    expect(falseStart(words("I am in an inn."), words("I am in an inn."))).toBeUndefined();
  });
});

describe("words lost by a cut", () => {
  it("counts the line's words that are no longer heard", () => {
    expect(wordsLost("I can come down to eight thousand. It hurts, but okay.", "I can come down to eight It hurts, but okay.", asHeard)).toBe(1);
    expect(wordsLost("Okay, eight dollars on pump six. Come back in for your change.", "Okay. On pump six. Come back in for your change.", asHeard)).toBe(1);
    expect(wordsLost("Okay, twenty-eight twenty-nine on pump eight.", "Okay, twenty nine on pump eight.", asHeard)).toBe(1);
  });
  it("does not mind how a number is written", () => {
    expect(wordsLost("With tax, that comes to one hundred ten twenty-three.", "With tax that comes to 11023.", asHeard)).toBe(0);
    expect(wordsLost("Your total is thirty-five forty-seven.", "Your total? Is 35, 47.", asHeard)).toBe(0);
    expect(wordsLost("They're thirty-four ninety-nine.", "They're $34.99.", asHeard)).toBe(0);
  });
});

describe("Whisper's echoes", () => {
  it("folds words written twice in a row", () => {
    expect(onceInARow(words("Okay. Okay. Okay. That comes to that comes to five."))).toEqual(words("Okay. That comes to five."));
  });
  it("counts a Whisper repeat only when it reaches across two pieces", () => {
    const said = "Okay, that comes to two hundred twenty-three thirty.";
    const echo = heard(said, ["Okay. Okay. Okay. Okay.", "That comes to", "$223.30."], { engine: "whisper" });
    expect(judgePieces(said, echo, asHeard).again).toBeUndefined();
    const restart = heard(said, ["Okay, that comes to two hundred.", "Okay, that comes to $223.30."], { engine: "whisper" });
    expect(judgePieces(said, restart, asHeard).again).toBe("okay that comes to");
  });
});

describe("the sound comes twice", () => {
  const stripe = (moving: number) => ({ ms: moving, moving, sim: 0.8, at: [50, 1080] as [number, number] });
  it("flags a long stripe when the line repeats nothing", () => {
    const said = "Would you like your receipt printed or emailed?";
    expect(judgePieces(said, heard(said, [said], { stripe: stripe(SOUNDS_TWICE + 200) }), asHeard).twice).toBe(true);
    expect(judgePieces(said, heard(said, [said], { stripe: stripe(SOUNDS_TWICE - 150) }), asHeard).twice).toBeUndefined();
  });
  it("lets a line that repeats words sound like itself", () => {
    const said = "Thirty-five point five Celsius?";
    expect(repeatsItself(said)).toBe(true);
    expect(judgePieces(said, heard(said, [said], { stripe: stripe(SOUNDS_TWICE + 200) }), asHeard).twice).toBeUndefined();
    expect(repeatsItself("I am on it, as it is.")).toBe(false); // short words don't count
    expect(repeatsItself("My number is 555-0142.")).toBe(true);
  });
  it("hears nothing again without a recognizer, only the stripe", () => {
    const v = judgePieces("Hello there.", heard("", [""], { engine: "none", stripe: stripe(900) }), asHeard);
    expect(v.again).toBeUndefined();
    expect(v.twice).toBe(true);
  });
});
