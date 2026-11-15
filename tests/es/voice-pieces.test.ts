// The piece-by-piece check of Puerto Colibrí's clips (tools/voice-pieces.ts with the Spanish tool's spoken form):
// a restart is found whatever a whole-clip transcript says, and a line's own repeats are left alone.
import { describe, expect, it } from "vitest";
import { asHeardEs } from "../../tools/es-voices/voice-batch-es";
import { judgePieces, lostEitherWay, repeatsItself, startedAgain, wordsOf, type Heard } from "../../tools/voice-pieces";

const heard = (whole: string, pieces: string[], more: Partial<Heard> = {}): Heard => ({
  key: "k", sec: 3, pauses: [], whole, words: [], pieces: pieces.map((p, i) => [i * 1000, (i + 1) * 1000, p]), engine: "parakeet", ...more,
});

describe("Spanish lines heard again", () => {
  it("finds a restart in the pieces that the whole transcript hides", () => {
    const said = "¿Quiere su recibo impreso o por correo?";
    const v = judgePieces(said, heard(said, ["¿Quiere su recibo", "¿Quiere su recibo impreso", "o por correo?"]), asHeardEs);
    expect(v.again).toBe("quiere su recibo");
    expect(v.where).toBe("pieces");
  });
  it("does not mind accents, ¿¡ or how a number is written", () => {
    const said = "Son ochenta y cinco pesos con cincuenta centavos.";
    expect(judgePieces(said, heard("Son $85.50.", ["Son", "$85.50."]), asHeardEs).again).toBeUndefined();
    expect(judgePieces("¡Qué bien! ¿Y tú?", heard("Que bien y tu", ["Que bien", "y tu"]), asHeardEs).again).toBeUndefined();
  });
  it("leaves a line alone that says something twice itself", () => {
    const said = "No, no, gracias. Sí, sí, claro.";
    expect(judgePieces(said, heard(said, ["No, no, gracias.", "Sí, sí, claro."]), asHeardEs).again).toBeUndefined();
    expect(repeatsItself("Es el cinco cinco cinco, cero uno, cuarenta y dos.")).toBe(true);
  });
  it("finds a line begun again after a word cut short", () => {
    const words = (s: string) => wordsOf(s, asHeardEs);
    expect(startedAgain(words("Su total es de doscientos pesos."), words("Su to su total es de 200 pesos."))).toBe("su … su");
  });
  it("counts a word a cut has lost", () => {
    expect(lostEitherWay("Muy bien, entonces mil cuatrocientos sesenta y cinco pesos.", "Muy bien, entonces mil cuatrocientos pesos.", asHeardEs)).toBeGreaterThan(0);
    expect(lostEitherWay("¿Para el sábado? Es muy poco tiempo.", "Para el sábado. Es muy poco tiempo.", asHeardEs)).toBe(0);
  });
});
