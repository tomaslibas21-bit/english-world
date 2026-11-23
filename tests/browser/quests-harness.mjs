import assert from "node:assert/strict";
import { openPhoneMenu } from "./screen-harness.mjs";

const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8096";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const progressKey = `${storage}-progress-v1`;

export const questSizes = [[390, 844], [390, 664], [844, 390], [1280, 800]];

export async function questBrowser() {
  const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
  return chromium.launch({
    headless: true,
    channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
    args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
  });
}

// A short silent PCM wave, served in place of recorded clips.
export const silentClip = Buffer.alloc(1644);
silentClip.write("RIFF", 0);
silentClip.writeUInt32LE(silentClip.length - 8, 4);
silentClip.write("WAVEfmt ", 8);
silentClip.writeUInt32LE(16, 16);
silentClip.writeUInt16LE(1, 20);
silentClip.writeUInt16LE(1, 22);
silentClip.writeUInt32LE(8000, 24);
silentClip.writeUInt32LE(16000, 28);
silentClip.writeUInt16LE(2, 32);
silentClip.writeUInt16LE(16, 34);
silentClip.write("data", 36);
silentClip.writeUInt32LE(silentClip.length - 44, 40);

export async function openQuestTown(browser, width, height, speech = false) {
  const phone = width < 500 || height < 500;
  const context = await browser.newContext({
    viewport: { width, height }, ...(phone ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
  });
  try {
    await context.route(/\.mp3(?:\?|$)/, (route) => route.fulfill({ contentType: "audio/wav", body: silentClip }));
    await context.addInitScript(({ key, speech }) => {
      localStorage.setItem(key, JSON.stringify({
        version: 1,
        profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1",
          look: { skin: "#f2d3bd", hair: { style: "long", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
        settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0, sounds: 0, phoneCalls: false },
        sits: {}, phrases: {}, seenIntro: {}, started: 1,
        place: { zone: "town", x: 0, z: 0, rot: 0 }, coach: { done: true, view: true },
      }));
      sessionStorage.setItem("ew-play-now", "1");
      delete window.SpeechRecognition;
      delete window.webkitSpeechRecognition;
      if (speech) {
        class Recognition {
          start() { window.__questReader = this; queueMicrotask(() => this.onstart?.()); }
          abort() {
            if (window.__questReader === this) window.__questReader = null;
            queueMicrotask(() => this.onend?.());
          }
          stop() { this.abort(); }
        }
        window.SpeechRecognition = Recognition;
        window.__questSpeak = (text) => {
          const reader = window.__questReader;
          if (!reader?.onresult) return false;
          reader.onspeechstart?.();
          reader.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] });
          reader.onspeechend?.();
          return true;
        };
      }
    }, { key: progressKey, speech });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__ew?.store.getState().screen === "play" && document.querySelector(".toolbar"), null, { timeout: 180000 });
    await page.evaluate(() => {
      window.__ew.audio.play = async () => true;
      return document.fonts.ready.then(() => undefined);
    });
    return { context, page, press: (locator) => phone ? locator.tap() : locator.click() };
  } catch (error) {
    await context.close();
    throw error;
  }
}

export async function talkTo(page, id) {
  await page.evaluate((id) => {
    const { game } = window.__ew;
    const actor = game.npcs.find((npc) => npc.id === id);
    const { x, z } = actor.approach;
    game.enterZone("town", { x, z, rot: Math.atan2(actor.home.x - x, actor.home.z - z) }, true);
    game.talkTo(id);
  }, id);
  await page.waitForFunction((id) => {
    const { active, hostId } = window.__ew.store.getState().conv;
    return active && hostId === id;
  }, id);
  await page.evaluate(() => window.__ew.store.getState().setConv({ introOpen: false }));
}

export async function answer(page, step, text) {
  await page.waitForFunction((step) => {
    const { game, store } = window.__ew;
    return store.getState().conv.phase === "you" && game.activeSession?.conv.effectiveStep()?.id === step;
  }, step);
  await page.evaluate((text) => window.__ew.game.activeSession.submit(text), text);
}

export async function closeChat(page) {
  await page.waitForFunction(() => window.__ew.store.getState().conv.phase === "ended");
  await page.evaluate(() => window.__ew.game.closeConversation());
}

export async function openPhone(page, press) {
  await openPhoneMenu(page);
  const title = await page.evaluate(async () => (await import("/src/ui/i18n.ts")).L("Telefonas (P)"));
  await press(page.locator(`.toolbar button[title="${title}"]`));
}

export async function checkGlossStack(line) {
  assert(await line.locator(".kit-gloss-compact").evaluate((gloss) => {
    const target = gloss.querySelector("span[lang=es]");
    const helper = gloss.querySelector(`small[lang=${document.documentElement.lang}]`);
    return helper.getBoundingClientRect().top >= target.getBoundingClientRect().bottom
      && parseFloat(getComputedStyle(helper).fontSize) < parseFloat(getComputedStyle(target).fontSize);
  }), "the smaller gloss sits below the Spanish");
}

export async function checkHud(page, target) {
  const { box, width, height, obstacles } = await page.evaluate((target) => {
    const selectors = ".objective-card, .coach, .phone-ring, .town-toasts .toast, .zone-banner, .directions-card, .photo-chip, .minimap, .toolbar .icon-btn, .joy, .jump-btn, .act-btn, .prompt";
    const node = document.querySelector(target);
    return {
      box: node.getBoundingClientRect().toJSON(), width: innerWidth, height: innerHeight,
      obstacles: [...document.querySelectorAll(selectors)].filter((el) =>
        el !== node && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden")
        .map((el) => ({ name: el.className, ...el.getBoundingClientRect().toJSON() })),
    };
  }, target);
  assert(box.left >= 0 && box.right <= width && box.top >= 0 && box.bottom <= height, JSON.stringify(box));
  for (const item of obstacles) {
    assert(box.right <= item.left || box.left >= item.right || box.bottom <= item.top || box.top >= item.bottom,
      JSON.stringify({ target, box, obstacle: item }));
  }
}
