import { describe, expect, it } from "vitest";
import { bestPhrase, type BestPhrase } from "../src/convo/bestPhrase";

const typed: BestPhrase = { en: "Card, please.", nat: "Kortele, prašau.", say: "Card, please.", spoken: false, score: 1 };
const spoken: BestPhrase = { en: "To go, please.", nat: "Išsinešti, prašau.", say: "To go, please.", spoken: true, score: 0.8 };

describe("the best phrase of a conversation", () => {
  it("prefers a spoken answer over a typed or picked answer", () => {
    expect(bestPhrase(typed, spoken)).toBe(spoken);
    expect(bestPhrase(spoken, typed)).toBe(spoken);
  });

  it("keeps the highest existing speech-match score", () => {
    const closer = { ...typed, spoken: true, score: 0.95 };
    expect(bestPhrase(spoken, closer)).toBe(closer);
    expect(bestPhrase(closer, spoken)).toBe(closer);
  });

  it("features a typed or picked answer when there is no speech, with the latest answer breaking ties", () => {
    const later = { ...spoken, spoken: false, score: typed.score };
    expect(bestPhrase(null, typed)).toBe(typed);
    expect(bestPhrase(typed, { ...later, score: 0.7 })).toBe(typed);
    expect(bestPhrase(typed, later)).toBe(later);
  });

  it("retains the last learner answer when no authored phrase matches", () => {
    const first = { ...typed, nat: "", score: 0 };
    const last = { ...first, en: "Something else.", say: "Something else." };
    expect(bestPhrase(first, last)).toBe(last);
  });
});
