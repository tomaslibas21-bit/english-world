import { describe, expect, it } from "vitest";
import { mobileConversationBudget } from "../src/ui/conversationLayout";
import { defaultTextSize, migrateSettings } from "../src/state/store";

describe("mobile conversation space in either play mode", () => {
  it("retains the original picture height when the answers already fit", () => {
    expect(mobileConversationBudget(844, 420).sceneHeight).toBe(346);
  });

  it("yields only the picture space needed to fit three ordinary answers", () => {
    const budget = mobileConversationBudget(844, 550);
    expect(budget.sceneHeight).toBe(286);
    expect(844 - budget.sceneHeight - 8).toBe(550);
  });

  it("keeps the picture at least 30% of the viewport for long answers or large text", () => {
    for (const height of [360, 667, 844, 1024]) {
      const scene = mobileConversationBudget(height, height * 2).sceneHeight;
      expect(scene).toBeCloseTo(height * 0.30, 0);
      expect(scene).toBeGreaterThan(height * 0.42 * 0.70);
    }
  });

  it("reclaims spare transcript space while retaining a readable window on the latest turn", () => {
    const budget = mobileConversationBudget(844, 640, 152);
    expect(budget.sceneHeight).toBe(253);
    expect(budget.transcriptHeight).toBe(95);
    expect(mobileConversationBudget(667, 700, 120).transcriptHeight).toBe(84);
    expect(mobileConversationBudget(844, 420, 120).transcriptHeight).toBe(120);
  });

  it("fits three short default-size guide rows in the observed 390 by 844 phone chrome", () => {
    // A 40px listen button and 40px repeat button, with 2px row padding, set the readable row floor.
    const shortReply = 40 + 40 + 2 * 2;
    const answerRegion = 8 + 36 + 4 + 1 + 8 + 3 * shortReply + 2 * 2 + 10;
    const fixedChrome = 50 + 54 + 70; // name/tools, mission instruction, microphone bar
    const transcript = 84;
    const budget = mobileConversationBudget(844, fixedChrome + transcript + answerRegion, transcript);
    expect(844 - 8 - budget.sceneHeight - fixedChrome - budget.transcriptHeight).toBeGreaterThanOrEqual(answerRegion);
    expect(budget.sceneHeight).toBeGreaterThanOrEqual(844 * 0.30);
  });

  it("keeps two longer medium-size replies visible when a third would require a smaller picture", () => {
    const rows = [90, 150, 130];
    const answerScaffold = 8 + 36 + 4 + 1 + 8 + 4 + 10;
    const fixedChrome = 50 + 60 + 76;
    const budget = mobileConversationBudget(844, fixedChrome + 84 + answerScaffold + rows.reduce((a, b) => a + b), 84);
    const available = 844 - 8 - budget.sceneHeight - fixedChrome - budget.transcriptHeight;
    expect(available).toBeGreaterThanOrEqual(answerScaffold + rows[0] + rows[1]);
    expect(available).toBeLessThan(answerScaffold + rows.reduce((a, b) => a + b));
    expect(budget.sceneHeight).toBeCloseTo(844 * 0.30, 0);
  });
});

describe("default reading size", () => {
  it("starts desktop at medium and keeps the existing mobile size", () => {
    expect(defaultTextSize(1440)).toBe(1.15);
    expect(defaultTextSize(901)).toBe(1.15);
    expect(defaultTextSize(900)).toBe(1);
    expect(defaultTextSize(390)).toBe(1);
  });

  it("fills an absent preference and preserves every explicit reading size", () => {
    expect(migrateSettings({ v: 4 }).textSize).toBe(1.15);
    for (const textSize of [1, 1.15, 1.3]) expect(migrateSettings({ v: 4, textSize }).textSize).toBe(textSize);
  });
});
