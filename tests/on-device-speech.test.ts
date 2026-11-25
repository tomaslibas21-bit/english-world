import { afterEach, describe, expect, it, vi } from "vitest";

async function speechOn(userAgent: string, brand: string) {
  vi.resetModules();
  const available = vi.fn(async () => "available" as const);
  const install = vi.fn(async () => true);
  vi.stubGlobal("navigator", { userAgent, userAgentData: { brands: [{ brand }] } });
  vi.stubGlobal("window", { SpeechRecognition: { available, install } });
  const speech = await import("../src/convo/speech");
  return { speech, available, install };
}

afterEach(() => vi.unstubAllGlobals());

describe("on-device speech service", () => {
  it.each([
    ["Chrome/143.0 SamsungBrowser/30.0", "Samsung Internet"],
    ["Chrome/143.0 SamsungBrowser/30.0", "Google Chrome"],
    ["HeadlessChrome/143.0", "Google Chrome"],
    ["Chrome/143.0", "Chromium"],
  ])("avoids the native service on %s with brand %s", async (ua, brand) => {
    const { speech, available, install } = await speechOn(ua, brand);
    expect(await speech.refreshLocalState()).toBe("unsupported");
    expect(await speech.installLocal()).toBe(false);
    expect(available).not.toHaveBeenCalled();
    expect(install).not.toHaveBeenCalled();
    expect(speech.speechSupported()).toBe(true);
  });

  it("allows an eligible browser to check and install its language pack", async () => {
    const { speech, available, install } = await speechOn("Chrome/143.0", "Google Chrome");
    expect(await speech.refreshLocalState()).toBe("available");
    expect(await speech.installLocal()).toBe(true);
    expect(available).toHaveBeenCalledWith({ langs: ["en-US"], processLocally: true });
    expect(install).toHaveBeenCalledWith({ langs: ["en-US"], processLocally: true });
  });
});
