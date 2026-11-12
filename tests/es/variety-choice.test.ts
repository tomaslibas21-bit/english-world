// The first-start choice of Spanish (src/editions/es/ui/variety-choice.tsx, on the title form): shown while no choice
// is saved, never once one is, whether the game saved it or Spanish Master English's Settings did (the same key).
// A default (Mexican, or the course build's VITE_DEFAULT_VARIETY) is not a choice.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const KEY = "puerto-colibri-variety";
let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function render() {
  vi.resetModules();
  const { VarietyChoice } = await import("../../src/ui/variety-choice"); // the Spanish edition's file (the overlay)
  return renderToStaticMarkup(createElement(VarietyChoice));
}
const selected = (html: string) => /aria-checked="true"[^>]*>([^<]+)</.exec(html)?.[1];

describe("the first-start choice of Spanish", () => {
  test("unset: a default is not a choice", async () => {
    const { hasVarietyChoice, loadVariety } = await import("../../src/state/variety");
    expect(loadVariety()).toBe("default");
    expect(hasVarietyChoice()).toBe(false);
    store.set(KEY, "castellano");
    expect(hasVarietyChoice()).toBe(false);
  });

  test("the game alone: shown with México selected; a choice is saved and it isn't shown again", async () => {
    const html = await render();
    expect(html).toContain("Which Spanish do you want to hear?");
    expect(html).toContain("You can change it later in Settings.");
    expect(html.match(/role="radio"/g)).toHaveLength(3);
    expect(selected(html)).toBe("México");
    const { chooseVariety, hasVarietyChoice } = await import("../../src/state/variety");
    chooseVariety("spain");
    expect(store.get(KEY)).toBe("spain");
    expect(hasVarietyChoice()).toBe(true);
    expect(await render()).toBe("");
  });

  test("a key already saved (the game's own Settings, or the course's): never shown", async () => {
    for (const v of ["default", "neutral", "spain"]) {
      store.set(KEY, v);
      expect(await render()).toBe("");
    }
  });

  test("the course build (VITE_DEFAULT_VARIETY=neutral), no saved choice: shown with Latinoamérica neutro selected, until chosen", async () => {
    vi.stubEnv("VITE_DEFAULT_VARIETY", "neutral");
    const html = await render();
    expect(selected(html)).toBe("Latinoamérica neutro");
    expect(await render()).not.toBe(""); // still there: nothing was chosen
    store.set(KEY, "neutral"); // the course's Settings, or a tap here
    expect(await render()).toBe("");
  });
  test("starting without a tap saves the Spanish shown selected: asked once", async () => {
    vi.stubEnv("VITE_DEFAULT_VARIETY", "neutral");
    vi.resetModules();
    const { commitVarietyChoice } = await import("../../src/ui/variety-choice");
    commitVarietyChoice();
    expect(store.get(KEY)).toBe("neutral");
    expect(await render()).toBe("");
    store.set(KEY, "spain");
    commitVarietyChoice(); // a choice already saved stays
    expect(store.get(KEY)).toBe("spain");
  });
});
