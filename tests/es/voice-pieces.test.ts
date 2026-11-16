// The piece-by-piece check of Puerto Colibrí's clips (tools/voice-pieces.ts with the Spanish tool's spoken form):
// a restart is found whatever a whole-clip transcript says, and a line's own repeats are left alone.
import { describe, expect, it } from "vitest";
import { asHeardEs } from "../../tools/es-voices/voice-batch-es";
import { interjectionLost, judgePieces, lostEitherWay, repeatsItself, startedAgain, wordsOf, type Heard } from "../../tools/voice-pieces";

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
  it("does not take a breath written in English for a repeat, nor a word split by a closure", () => {
    const said = "Muy bien, entonces quinientos pesos.";
    expect(judgePieces(said, heard(said, ["Ha ha.", "Muy bien, entonces", "Yeah.", "Yeah.", "quinientos pesos."]), asHeardEs).again).toBeUndefined();
    const split: Heard = { key: "k", sec: 3, whole: said, words: [], engine: "parakeet", pauses: [[900, 1000]], pieces: [[0, 950, "Muy bien, en"], [950, 3000, "Entonces quinientos pesos."]] };
    expect(judgePieces(said, split, asHeardEs).again).toBeUndefined();
    const real: Heard = { ...split, pauses: [[800, 1200]], pieces: [[0, 1000, "Muy bien, en"], [1000, 3000, "Entonces quinientos pesos."]] };
    expect(judgePieces(said, real, asHeardEs).again).toBe("en- entonces");
  });
  it("does not take a number's end after a closure for the number said again", () => {
    const said = "Todo junto son ciento setenta pesos.";
    const split = (pause: number): Heard => ({ key: "k", sec: 3.2, whole: "Todo junto son 170 pesos.", words: [], engine: "parakeet",
      pauses: [[2160 - pause / 2, 2160 + pause / 2]], pieces: [[0, 2160, "Todo junto son 170."], [2160, 3200, "70 pesos."]] });
    expect(judgePieces(said, split(80), asHeardEs).again).toBeUndefined();
    expect(judgePieces(said, split(300), asHeardEs).again).toBe("170 as 17070");
    const ending: Heard = { key: "k", sec: 3.9, whole: "¿Está seguro? Usted dijo que era una mochila negra.", words: [], engine: "parakeet",
      pauses: [[1130, 1680], [2310, 2390]], pieces: [[0, 1405, "¿Está seguro?"], [1405, 2350, "Usted dijo que no."], [2350, 3908, "que era una mochila negra."]] };
    expect(judgePieces("¿Está seguro? Usted dijo que era una mochila negra.", ending, asHeardEs).again).toBeUndefined();
  });
  it("counts a number written in words against the line in words", () => {
    const price = "Aquí tiene: ocho mil doscientos cincuenta y seis pesos. Y su comprobante.";
    expect(judgePieces(price, heard("Aquí tiene. 8,256 pesos. Y su comprobante.", ["Aquí tiene.", "Ocho mil dosciententa y seis pesos.", "Y su comprobante."], { pauses: [[900, 1100], [1900, 2100]] }), asHeardEs).again).toBeUndefined();
    const bus = "Hay uno a las diez y cuarto de la noche y otro a las cinco y cuarto de la tarde.";
    expect(judgePieces(bus, heard(bus, ["Hay uno a las diez y", "Cuarto de la noche.", "y otro a las cinco y", "Cuarto de la tarde."], { pauses: [[900, 1100], [1900, 2100], [2900, 3100]] }), asHeardEs).again).toBeUndefined();
    // a real repeat in such a line is still one
    expect(judgePieces(bus, heard(bus, ["Hay uno a las diez y cuarto de la noche", "y otro a las cinco y cuarto de la, de la tarde."], { pauses: [[900, 1100]] }), asHeardEs).again).toBeDefined();
    expect(judgePieces("Son ochenta y cinco pesos, y su cambio.", heard("Son 85 pesos y y su cambio.", ["Son 85 pesos", "y y su cambio."], { pauses: [[900, 1100]] }), asHeardEs).again).toBe("y y");
  });
  it("keeps a line's laugh, and does not take it for the line's own \"ha\"", () => {
    const said = "¡Ja! Ya ha aprendido.";
    expect(judgePieces(said, heard("Ya ha aprendido.", ["Ha ha.", "Ya ha aprendido."], { pauses: [[900, 1100]] }), asHeardEs).again).toBeUndefined();
    expect(judgePieces("Ya ha aprendido.", heard("Ya ha ha aprendido.", ["Ya ha", "ha aprendido."], { pauses: [[900, 1100]] }), asHeardEs).again).toBe("ha ha");
    expect(interjectionLost(said, [[0, 725]], 2400, ["Ya ha aprendido."], asHeardEs)).toBe("ja");
    expect(interjectionLost("Mmm, no sé, no traigo reloj.", [[35, 785]], 4050, ["No sé.", "¿No traigo reloj?"], asHeardEs)).toBe("mmm");
    expect(interjectionLost("Ah, perdón: una mochila amarilla de tela.", [[55, 1455]], 5860, ["Uh.", "Perdón.", "Una mochila amarilla de tela."], asHeardEs)).toBeUndefined();
    expect(interjectionLost("¡Noruega! ¡Uy, allá sí hace frío en invierno! ¿Verdad?", [[1735, 2295]], 5360, ["Noruega.", "Uy, allá se hace frío en invierno, ¿verdad?"], asHeardEs)).toBeUndefined();
    // "ha dicho" is a verb, not a laugh: a noise before the line may go
    expect(interjectionLost("¡Me he equivocado! ¿Qué ha dicho?", [[0, 875]], 3600, ["Me he equivocado. ¿Qué ha dicho?"], asHeardEs)).toBeUndefined();
  });
  it("counts a word a cut has lost", () => {
    expect(lostEitherWay("Muy bien, entonces mil cuatrocientos sesenta y cinco pesos.", "Muy bien, entonces mil cuatrocientos pesos.", asHeardEs)).toBeGreaterThan(0);
    expect(lostEitherWay("¿Para el sábado? Es muy poco tiempo.", "Para el sábado. Es muy poco tiempo.", asHeardEs)).toBe(0);
  });
});
