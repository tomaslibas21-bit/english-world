// The piece-by-piece check of voice clips (tools/voice-pieces.ts): a repeat that a whole-clip transcript hides must be
// found in the pieces, and a line that repeats words itself must not be taken for one.
import { describe, expect, it } from "vitest";
import { asHeard } from "../tools/voice-batch";
import { falseStart, heardAgain, interjectionLost, judgePieces, numberAgain, onceInARow, repeatsItself, startedAgain, unsplit, wordAgain, wordsLost, wordsOf, SOUNDS_TWICE, type Heard } from "../tools/voice-pieces";

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
  it("takes a number said in pieces as one, and hears a piece of it twice", () => {
    const flag = (said: string, whole: string, pieces: string[]) => judgePieces(said, heard(whole, pieces), asHeard).again;
    expect(flag("That'll be ninety-eight ninety-eight.", "That'll be $98.98.", ["That'll be ninety eight ninety eight."])).toBeUndefined();
    expect(flag("Regular is ninety-eight ninety-eight a gallon.", "Regular is 98. 98 a gallon.", ["Regular is 98.", "98 a gallon."])).toBeUndefined();
    expect(flag("That'll be forty forty-nine.", "That'll be forty forty nine.", ["That'll be forty.", "Forty-9."])).toBeUndefined();
    expect(flag("Your total is thirty-five forty-seven.", "Your total is thirty five thirty five forty seven.", ["Your total is 35.", "35, 47."])).toBe("3547 as 353547");
    expect(flag("Okay, that's one hundred one forty-nine.", "Okay, that's one hundred one forty nine.", ["Okay, that's", "One hundred.", "149"])).toBeUndefined();
    expect(numberAgain(["its", "110"], ["its", "110"])).toBeUndefined();
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
  it("finds a word of the line said once more", () => {
    expect(wordAgain(words("Good, thank you!"), words("Good, thank you. Good."))).toBe("good (once more)");
    expect(wordAgain(words("No, nothing."), words("No, nothing. No."))).toBe("no (once more)");
    // a recognizer's slip is not an extra word, nor is a word the line doesn't have
    expect(wordAgain(words("I see the sea."), words("I see the see."))).toBeUndefined();
    expect(wordAgain(words("So, a backpack."), words("So a backpack. Hmm."))).toBeUndefined();
    expect(wordAgain(words("I have a cat and a dog."), words("I have a cat and a dog."))).toBeUndefined();
  });
  it("finds a word begun and begun again", () => {
    expect(falseStart(words("Fries, please."), words("Fry, fries please."))).toBe("fry- fries");
    expect(falseStart(words("Their house had four walls."), words("Their house ha their house had four walls."))).toBeUndefined(); // heardAgain's case
    expect(heardAgain(words("Their house had four walls."), words("Their house ha their house had four walls."))).toBe("their house");
    expect(falseStart(words("Regular is fine."), words("Reg regular is fine."))).toBe("reg- regular");
    expect(falseStart(words("I am in an inn."), words("I am in an inn."))).toBeUndefined();
  });
});

describe("a word split by a stop's closure", () => {
  const split = (pause: number): Heard => ({ key: "k", sec: 2.5, whole: "That'll be ninety six twenty five.", words: [], engine: "parakeet",
    pauses: [[1200 - pause / 2, 1200 + pause / 2]], pieces: [[0, 1200, "That'll be ninety six."], [1200, 2500, "Six twenty five."]] });
  it("is heard once when the pause is a closure, twice when it is a pause", () => {
    expect(unsplit(split(90))).toEqual(["That'll be ninety six.", "twenty five."]);
    expect(judgePieces("That'll be ninety-six twenty-five.", split(90), asHeard).again).toBeUndefined();
    expect(unsplit(split(300))[1]).toBe("Six twenty five.");
    const big: Heard = { key: "k", sec: 3, whole: "Someone just brought in a big yellow backpack.", words: [], engine: "parakeet", pauses: [[1500, 1900]], pieces: [[0, 1700, "Someone just brought in a big"], [1700, 3000, "Big yellow backpack."]] };
    expect(judgePieces("Someone just brought in a big yellow backpack.", big, asHeard).again).toBe("big big");
  });
});

describe("noises a recognizer writes as words", () => {
  it("are not the line said twice", () => {
    const said = "Thanks! Here's your change.";
    expect(judgePieces(said, heard("Thanks. Here's your change.", ["Thanks.", "Yeah.", "Yeah.", "Here's your change."]), asHeard).again).toBeUndefined();
    expect(heardAgain(words(said), words("Uh uh thanks here's your change"))).toBeUndefined();
    expect(heardAgain(words(said), words("Thanks thanks here's your change"))).toBe("thanks thanks");
  });
});

describe("a word of the line written as two", () => {
  it("is not one of its halves said again", () => {
    const said = "Halfway? That's eight and a half.";
    expect(judgePieces(said, heard("Half way? That's eight and a half.", ["Half way?", "That's eight and a half."]), asHeard).again).toBeUndefined();
    expect(judgePieces("Anytime. Just don't make me wait two months next time.", heard("Any time. Don't make me wait two months next time.", ["Any time.", "Don't make me wait two months next time."]), asHeard).again).toBeUndefined();
    expect(judgePieces(said, heard("Halfway? That's eight and a half. A half.", ["Halfway?", "That's eight and a half.", "A half."]), asHeard).again).toBeDefined();
  });
});

describe("what a recognizer writes of its own", () => {
  const at = (pause: number, first: string, second: string, whole: string): Heard => ({ key: "k", sec: 3, whole, words: [], engine: "parakeet",
    pauses: [[2200 - pause / 2, 2200 + pause / 2]], pieces: [[0, 2200, first], [2200, 3000, second]] });
  it("a run the line says twice, misheard both times, is not said once more", () => {
    const said = "Chest press? Sure! See you chest press!";
    expect(judgePieces(said, heard("Chess press? Sure. See you chess press.", ["Chess press?", "Sure.", "See you Chess Press."]), asHeard).again).toBeUndefined();
    expect(heardAgain(words("Turn left at the bank, then right at the school."), words("Turn left at a bank, then right at a school."))).toBeUndefined();
    expect(heardAgain(words("Turn left at the bank."), words("Turn left at the, at the bank."))).toBe("at the");
  });
  it("an ending of its own on a piece cut at a closure is no restart, but a real pause is", () => {
    const said = "I worked as a construction worker in Lithuania.";
    expect(judgePieces(said, at(90, "I worked as a construction worker in the", "In Lithuania", said), asHeard).again).toBeUndefined();
    expect(judgePieces(said, at(300, "I worked as a construction worker in the", "In Lithuania", said), asHeard).again).toBe("in … in");
    // a line begun again goes on the same way both times, and one word twice in a row needs no such proof
    expect(judgePieces("I'm looking for a dress.", at(90, "I'm look", "I'm looking for a dress.", "I'm looking for a dress."), asHeard).again).toBeDefined();
    expect(judgePieces("Okay, that's twenty-one seventy-eight.", at(90, "Okay, that's twenty one seventy eight.", "Okay.", "Okay, that's twenty one seventy eight."), asHeard).again).toBe("okay (once more)");
  });
});

describe("a line's interjection", () => {
  it("must be left by a cut, though it is no word", () => {
    const said = "Hmm, let me check the schedule.";
    // heard before as "Mm. | Let me check the schedule."; a cut from the start that leaves only the words has lost it
    expect(interjectionLost(said, [[35, 785]], 3200, ["Let me check the schedule."], asHeard)).toBe("hmm");
    expect(interjectionLost(said, [[35, 785]], 3200, ["Mm.", "Let me check the schedule."], asHeard)).toBeUndefined();
    expect(interjectionLost(said, [[35, 785]], 3200, ["", "Let me check the schedule."], asHeard)).toBeUndefined();
    expect(interjectionLost(said, [[1500, 2100]], 3200, ["Let me check the schedule."], asHeard)).toBeUndefined();
    expect(interjectionLost("Oh, the total is twelve eighty-six.", [[35, 455]], 3000, ["Oh.", "The total is twelve eighty six."], asHeard)).toBeUndefined();
    expect(interjectionLost("That's all we have, huh?", [[2500, 3000]], 3000, ["That's all we have."], asHeard)).toBe("huh");
    expect(interjectionLost("Cold? Ha! It's boiling.", [[900, 1500]], 3000, ["Cold?", "It's boiling."], asHeard)).toBe("ha");
    expect(interjectionLost("Let me check the schedule.", [[35, 785]], 3200, ["Let me check the schedule."], asHeard)).toBeUndefined();
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
  it("takes the edition's own length for a stripe", () => {
    const said = "Would you like your receipt printed or emailed?";
    expect(judgePieces(said, heard(said, [said], { stripe: stripe(500) }), asHeard, 560).twice).toBeUndefined();
    expect(judgePieces(said, heard(said, [said], { stripe: stripe(600) }), asHeard, 560).twice).toBe(true);
  });
  it("hears nothing again without a recognizer, only the stripe", () => {
    const v = judgePieces("Hello there.", heard("", [""], { engine: "none", stripe: stripe(900) }), asHeard);
    expect(v.again).toBeUndefined();
    expect(v.twice).toBe(true);
  });
});
