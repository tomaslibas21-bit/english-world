// Opt-in privacy/lifecycle/pipeline checks, using real MP3 decoding and native media/Web Audio playback.
// Recognition events are simulated deliberately; no browser test here establishes phone speaker loudness.
// WORLD_TEST_URL=http://127.0.0.1:5193 WORLD_AUDIO_FIXTURE_DIR=/path/to/local/audio WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/mobile-diagnostics.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const { chromium, webkit } = await import(
  process.env.WORLD_PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5193";
const fixtureDir = process.env.WORLD_AUDIO_FIXTURE_DIR || "public/audio";
const manifest = JSON.parse(
  await readFile(resolve(fixtureDir, "manifest.json"), "utf8"),
);
const [fixtureKey, duration] = Object.entries(manifest).find(
  ([, seconds]) => seconds >= 1.2 && seconds <= 2.5,
);
const recording = await readFile(resolve(fixtureDir, `${fixtureKey}.mp3`));
let checks = 0;
const check = (name, condition, detail) => {
  assert(condition, `${name}${detail ? ": " + JSON.stringify(detail) : ""}`);
  checks++;
  console.log("ok", name);
};

const instrument = () => {
  window.probeMetrics = {
    media: [],
    starts: [],
    gains: [],
    captures: 0,
    contexts: 0,
    resumes: [],
  };
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    window.probeMetrics.media.push({
      element: this,
      source: this.src,
      volume: this.volume,
      rate: this.playbackRate,
      activeGesture: navigator.userActivation?.isActive ?? null,
    });
    return play.apply(this, args);
  };
  const NativeAudioContext = window.AudioContext || window.webkitAudioContext;
  if (NativeAudioContext) {
    const createGain = NativeAudioContext.prototype.createGain;
    NativeAudioContext.prototype.createGain = function (...args) {
      const node = createGain.apply(this, args);
      window.probeMetrics.gains.push(node);
      return node;
    };
    const resume = NativeAudioContext.prototype.resume;
    NativeAudioContext.prototype.resume = function (...args) {
      window.probeMetrics.resumes.push({
        activeGesture: navigator.userActivation?.isActive ?? null,
      });
      return resume.apply(this, args);
    };
    const createSource = NativeAudioContext.prototype.createBufferSource;
    NativeAudioContext.prototype.createBufferSource = function (...args) {
      const source = createSource.apply(this, args),
        start = source.start;
      source.start = function (...params) {
        window.probeMetrics.starts.push({
          source: this,
          buffer: this.buffer,
          rate: this.playbackRate.value,
          gains: window.probeMetrics.gains.map((gain) => gain.gain.value),
        });
        return start.apply(this, params);
      };
      return source;
    };
  }
  if (NativeAudioContext) {
    const WrappedAudioContext = new Proxy(NativeAudioContext, {
      construct(target, args) {
        window.probeMetrics.contexts++;
        return Reflect.construct(target, args);
      },
    });
    if (window.AudioContext) window.AudioContext = WrappedAudioContext;
    if (window.webkitAudioContext)
      window.webkitAudioContext = WrappedAudioContext;
  }
  for (const constructor of new Set([
    window.SpeechRecognition,
    window.webkitSpeechRecognition,
  ])) {
    if (!constructor?.prototype?.start) continue;
    const start = constructor.prototype.start;
    constructor.prototype.start = function (...args) {
      window.probeMetrics.captures++;
      return start.apply(this, args);
    };
  }
  const mediaDevices = navigator.mediaDevices;
  if (mediaDevices?.getUserMedia) {
    const getUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);
    mediaDevices.getUserMedia = (...args) => {
      window.probeMetrics.captures++;
      return getUserMedia(...args);
    };
  }
};

async function open(browser, query = "") {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await context.addInitScript(instrument);
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/${query}`);
  return { context, page, errors };
}

const privateValues = [
  "PRIVATE_TRANSCRIPT_SENTINEL",
  "PRIVATE_FILES_TOKEN_SENTINEL",
  "PRIVATE_PAGE_TOKEN_SENTINEL",
];
function reportIsPrivate(report) {
  const text = JSON.stringify(report);
  for (const value of privateValues)
    assert(!text.includes(value), "reports must omit private test inputs");
  assert(
    !/data:audio|blob:|https?:\/\//i.test(text),
    "reports must omit audio payloads and URLs",
  );
  return true;
}

for (const [engineName, engine] of [
  ["Chromium", chromium],
  ["WebKit", webkit],
]) {
  const browser = await engine.launch({
    headless: true,
    ...(engineName === "Chromium"
      ? { channel: process.env.WORLD_BROWSER_CHANNEL || "chromium" }
      : {}),
  });
  try {
    {
      const { context, page, errors } = await open(browser);
      await page
        .waitForFunction(
          () => document.getElementById("root")?.childElementCount > 0,
        )
        .catch(async (error) => {
          console.log(
            "normal-page-diagnostic",
            errors,
            (await page.locator("body").innerText()).slice(0, 1000),
          );
          throw error;
        });
      const quiet = await page.evaluate(async () => {
        const { AudioSystem } = await import("/src/game/audio.ts");
        const diagnostics = await import("/src/convo/audioDiagnostics.ts");
        const audio = new AudioSystem();
        await audio.prepareDiagnosticComparison();
        const accepted = audio.playDiagnostic("buffer");
        diagnostics.audioDiagnostic("diagnostic.test", { reason: "off" });
        return {
          accepted,
          report: diagnostics.audioDiagnosticsReport(),
          ...window.probeMetrics,
          media: window.probeMetrics.media.length,
          starts: window.probeMetrics.starts.length,
        };
      });
      check(
        `${engineName}: flag-off has no diagnostics UI or extra capture/playback/context`,
        (await page.locator("[data-audio-diagnostics]").count()) === 0 &&
          quiet.media === 0 &&
          quiet.starts === 0 &&
          quiet.captures === 0 &&
          quiet.contexts === 0 &&
          !quiet.accepted,
      );
      check(
        `${engineName}: flag-off records no diagnostic events`,
        quiet.report.events.length === 0,
      );
      check(
        `${engineName}: normal UI has no page errors`,
        errors.length === 0,
        errors,
      );
      await context.close();
    }
    {
      const { context, page, errors } = await open(
        browser,
        "?audioDebug=1&t=PRIVATE_PAGE_TOKEN_SENTINEL",
      );
      const posts = [];
      page.on("request", (request) => {
        if (request.method() === "POST") posts.push(request.url());
      });
      await page
        .getByRole("button", { name: "Garso patikra", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Garso patikra telefone",
      });
      await dialog.waitFor();
      check(
        `${engineName}: opt-in panel opens without capture or output`,
        await page.evaluate(
          () =>
            window.probeMetrics.captures === 0 &&
            window.probeMetrics.media.length === 0 &&
            window.probeMetrics.starts.length === 0 &&
            window.probeMetrics.contexts === 0,
        ),
      );
      check(
        `${engineName}: comparison needs a recorded line before A/B can play`,
        (await dialog
          .getByRole("button", { name: "A · Įprastas grotuvas" })
          .isDisabled()) &&
          (await dialog
            .getByRole("button", { name: "B · Web Audio" })
            .isDisabled()),
      );
      const downloadEvent = page.waitForEvent("download");
      await dialog
        .getByRole("button", { name: "Atsisiųsti ataskaitą" })
        .click();
      const download = await downloadEvent;
      const report = JSON.parse(await readFile(await download.path(), "utf8"));
      check(
        `${engineName}: downloadable report is private local JSON and contains an honest limitation`,
        reportIsPrivate(report) &&
          report.note.includes("does not establish") &&
          posts.length === 0,
      );
      await dialog.getByRole("button", { name: "Uždaryti" }).click();
      await dialog.waitFor({ state: "hidden" });
      check(
        `${engineName}: closing diagnostics leaves audio and capture idle`,
        await page.evaluate(
          () =>
            window.probeMetrics.captures === 0 &&
            window.probeMetrics.media.length === 0 &&
            window.probeMetrics.starts.length === 0,
        ),
      );
      check(
        `${engineName}: opt-in UI has no page errors`,
        errors.length === 0,
        errors,
      );
      await context.close();
    }
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      await context.addInitScript(instrument);
      const page = await context.newPage();
      page.setDefaultTimeout(20_000);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await context.route(
        (url) => url.pathname === "/mobile-diagnostics-harness.html",
        (route) =>
          route.fulfill({
            contentType: "text/html",
            body: '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><button id="normal">Normal recorded line</button><div data-audio-diagnostics><button id="prepare">Prepare</button><button id="html">A</button><button id="buffer">B</button><button id="stop">Stop</button></div>',
          }),
      );
      await context.route(
        (url) =>
          url.pathname.startsWith("/private-probe/") &&
          url.pathname.endsWith(".mp3"),
        (route) =>
          route.fulfill({ contentType: "audio/mpeg", body: recording }),
      );
      await page.goto(
        `${base}/mobile-diagnostics-harness.html?audioDebug=1&t=PRIVATE_PAGE_TOKEN_SENTINEL`,
      );
      await page.evaluate(
        async ({ duration }) => {
          localStorage.setItem(
            "fs-files-token",
            JSON.stringify({
              token: "PRIVATE_FILES_TOKEN_SENTINEL",
              exp: Date.now() / 1000 + 3600,
            }),
          );
          const { AudioSystem } = await import("/src/game/audio.ts");
          const { audioKey } = await import("/src/audio-key.ts");
          // Match Vite's hot-versioned dependency URLs; bare URLs would create duplicate singleton logs.
          const moduleSource = await (await fetch("/src/game/audio.ts")).text();
          const diagnosticUrl =
            moduleSource.match(
              /from ["']([^"']*\/audioDiagnostics\.ts[^"']*)["']/,
            )?.[1] || "/src/convo/audioDiagnostics.ts";
          const focusUrl =
            moduleSource.match(
              /from ["']([^"']*\/audioFocus\.ts[^"']*)["']/,
            )?.[1] || "/src/convo/audioFocus.ts";
          window.diagnostics = await import(diagnosticUrl);
          window.probeFocus = await import(focusUrl);
          window.speech = await import("/src/convo/speech.ts");
          const audio = (window.testAudio = new AudioSystem());
          audio.base = "/private-probe/";
          audio.ready = true;
          audio.volume = 0.37;
          const text = "Private NPC test line";
          audio.manifest[audioKey("probe", 1, text)] = duration;
          audio.bindGestures();
          window.normalResults = [];
          document.querySelector("#normal").onclick = () => {
            window.normalPromise = audio
              .play("probe", 1, text)
              .then((result) => window.normalResults.push(result));
          };
          document.querySelector("#prepare").onclick = () => {
            window.prepared = audio.prepareDiagnosticComparison();
          };
          for (const pipeline of ["html", "buffer"])
            document.getElementById(pipeline).onclick = () => {
              window.accepted = audio.playDiagnostic(pipeline);
            };
          document.querySelector("#stop").onclick = () =>
            audio.stopDiagnostic("user-stop");
          speechSynthesis.speak = () => {
            throw new Error("Diagnostics must not synthesize speech");
          };
        },
        { duration },
      );
      await page.locator("#normal").tap();
      await page.waitForFunction(() => window.normalResults.length === 1);
      check(
        `${engineName}: fixture really finishes through the normal recorded player`,
        await page.evaluate(() => window.normalResults[0] === true),
      );
      const baseline = await page.evaluate(() => ({
        plays: window.probeMetrics.media.length,
        starts: window.probeMetrics.starts.length,
        contexts: window.probeMetrics.contexts,
      }));
      await page.locator("#prepare").tap();
      await page.waitForFunction(
        () => window.testAudio.getDiagnosticState().status === "ready",
      );
      const frozen = await page.evaluate(() =>
        window.testAudio.getDiagnosticState(),
      );
      check(
        `${engineName}: preparation is silent and does not create a live output context`,
        await page.evaluate(
          (b) =>
            window.probeMetrics.media.length === b.plays &&
            window.probeMetrics.starts.length === b.starts &&
            window.probeMetrics.contexts === b.contexts,
          baseline,
        ),
      );
      check(
        `${engineName}: comparison freezes the requested learner gain`,
        Math.abs(frozen.volume - 0.37) < 0.001,
      );
      await page.evaluate(() => {
        window.testAudio.volume = 0.8;
      });
      const beforeHtml = await page.evaluate(
        () => window.probeMetrics.media.length,
      );
      await page.locator("#html").tap();
      await page.waitForFunction(
        () => window.testAudio.getDiagnosticState().status === "ready",
      );
      const html = await page.evaluate((i) => {
        const item = window.probeMetrics.media[i];
        return {
          source: item.source,
          volume: item.volume,
          rate: item.rate,
          gesture: item.activeGesture,
          reused: item.element === window.probeMetrics.media[0].element,
        };
      }, beforeHtml);
      const fixtureBase64 = recording.toString("base64");
      check(
        `${engineName}: A uses exact fixture bytes, unchanged gain/rate and the existing player`,
        html.source === `data:audio/mpeg;base64,${fixtureBase64}` &&
          Math.abs(html.volume - 0.37) < 0.001 &&
          html.rate === 1 &&
          html.reused,
      );
      check(
        `${engineName}: A starts from the direct tap`,
        html.gesture === null || html.gesture === true,
      );
      const beforeBuffer = await page.evaluate(
        () => window.probeMetrics.starts.length,
      );
      await page.locator("#buffer").tap();
      await page.waitForFunction(
        () => window.testAudio.getDiagnosticState().status === "ready",
      );
      const buffer = await page.evaluate(
        async ({ index, source }) => {
          const item = window.probeMetrics.starts[index],
            actual = item.buffer;
          const bytes = await (await fetch(source)).arrayBuffer();
          const decoder = new OfflineAudioContext(1, 1, actual.sampleRate);
          const expected = await decoder.decodeAudioData(bytes);
          const a = actual.getChannelData(0),
            b = expected.getChannelData(0);
          return {
            same:
              actual.length === expected.length &&
              actual.sampleRate === expected.sampleRate &&
              a.every((sample, i) => sample === b[i]),
            rate: item.rate,
            gain: item.gains.at(-1),
            resumes: window.probeMetrics.resumes,
          };
        },
        { index: beforeBuffer, source: html.source },
      );
      check(
        `${engineName}: B decodes the same bytes with unchanged gain/rate`,
        buffer.same &&
          buffer.rate === 1 &&
          Math.abs(buffer.gain - 0.37) < 0.001,
      );
      check(
        `${engineName}: B resumes only from a direct user gesture`,
        buffer.resumes.every(
          (value) =>
            value.activeGesture === null || value.activeGesture === true,
        ),
      );
      await page.locator("#buffer").tap();
      await page.locator("#stop").tap();
      const stopped = await page.evaluate(
        () => window.probeMetrics.starts.length,
      );
      await page.waitForTimeout(150);
      check(
        `${engineName}: explicit stop cancels a probe without later restart`,
        await page.evaluate(
          (n) =>
            window.testAudio.getDiagnosticState().status === "ready" &&
            window.probeMetrics.starts.length === n,
          stopped,
        ),
      );
      await page.locator("#buffer").tap();
      await page.locator("#normal").tap();
      await page.waitForFunction(
        () => window.testAudio.getState() === "playing",
      );
      const normalPlays = await page.evaluate(
        () => window.probeMetrics.media.length,
      );
      await page.locator("#html").tap();
      check(
        `${engineName}: diagnostic playback cannot steal an active normal line`,
        await page.evaluate(
          (count) =>
            window.accepted === false &&
            window.testAudio.getState() === "playing" &&
            window.probeMetrics.media.length === count,
          normalPlays,
        ),
      );
      await page.waitForFunction(() => window.normalResults.length === 2);
      check(
        `${engineName}: normal playback cancels B and completes normally`,
        await page.evaluate(
          () =>
            window.normalResults[1] === true &&
            window.testAudio.getDiagnosticState().status === "ready",
        ),
      );
      await page.evaluate(async () => {
        const audio = window.testAudio;
        await audio.ctx.suspend();
        const resume = audio.ctx.resume.bind(audio.ctx);
        audio.ctx.resume = () =>
          resume().then(
            () =>
              new Promise((resolve) => {
                window.releaseProbeResume = resolve;
              }),
          );
      });
      const beforeResume = await page.evaluate(
        () => window.probeMetrics.starts.length,
      );
      await page.locator("#buffer").tap();
      await page.waitForFunction(() => !!window.releaseProbeResume);
      await page.locator("#stop").tap();
      await page.evaluate(() => window.releaseProbeResume());
      await page.waitForTimeout(100);
      check(
        `${engineName}: a canceled pending resume cannot start late`,
        await page.evaluate(
          (n) =>
            window.probeMetrics.starts.length === n &&
            window.testAudio.getDiagnosticState().status === "ready",
          beforeResume,
        ),
      );
      await page.evaluate(async () => {
        const rec = {
          start() {
            this.onstart?.();
            this.onaudiostart?.();
          },
          abort() {},
        };
        window.fakeRecognition = rec;
        const attempt = window.speech.createSpeechAttempt({
          createRecognition: () => rec,
          evaluate: () => "complete",
          onUpdate() {},
          onCommit() {},
        });
        attempt.start();
        rec.onresult?.({
          resultIndex: 0,
          results: [
            Object.assign([{ transcript: "PRIVATE_TRANSCRIPT_SENTINEL" }], {
              isFinal: true,
            }),
          ],
        });
        attempt.finish();
        window.fakeAttempt = attempt;
      });
      await page.waitForFunction(() =>
        window.diagnostics
          .audioDiagnosticsReport()
          .events.some((event) => event.event === "capture.release"),
      );
      let report = await page.evaluate(() =>
        window.diagnostics.audioDiagnosticsReport(),
      );
      check(
        `${engineName}: fallback is labeled physical release unknown, not actual end`,
        report.events.some(
          (event) =>
            event.event === "capture.release" &&
            event.detail.reason === "timeout-unknown",
        ) &&
          !report.events.some(
            (event) => event.event === "capture.recognition-end",
          ),
        report.events.filter((event) => event.event.startsWith("capture.")),
      );
      await page.evaluate(() => {
        window.newLease = window.probeFocus.captureAudio();
        window.fakeRecognition.onaudioend?.();
        window.fakeRecognition.onend?.();
      });
      report = await page.evaluate(() =>
        window.diagnostics.audioDiagnosticsReport(),
      );
      check(
        `${engineName}: late actual end/audioend are retained without releasing a newer microphone`,
        report.events.some((event) => event.event === "recognition.audioend") &&
          report.events.some(
            (event) =>
              event.event === "capture.recognition-end" &&
              event.detail.captures === 1,
          ) &&
          (await page.evaluate(
            () => window.probeFocus.microphoneHandoffState().captures === 1,
          )),
      );
      const captureCounts = await page.evaluate(() => ({
        media: window.probeMetrics.media.length,
        starts: window.probeMetrics.starts.length,
      }));
      await page.locator("#html").tap();
      check(
        `${engineName}: diagnostic playback cannot steal an active capture lease`,
        await page.evaluate(
          (counts) =>
            window.accepted === false &&
            window.probeFocus.microphoneHandoffState().captures === 1 &&
            window.probeMetrics.media.length === counts.media &&
            window.probeMetrics.starts.length === counts.starts,
          captureCounts,
        ),
      );
      await page.evaluate(() => window.newLease.ended());
      check(
        `${engineName}: reports never export transcript, media data, tokens or signed URLs`,
        reportIsPrivate(report),
      );
      check(
        `${engineName}: result diagnostics contain slot metadata instead of words`,
        report.events.some(
          (event) =>
            event.event === "recognition.result" &&
            event.detail.resultSlots === 1 &&
            event.detail.finalSlots === 1,
        ),
      );
      await page.evaluate(() => {
        for (let i = 0; i < 450; i++)
          window.diagnostics.audioDiagnostic("diagnostic.test", { elapsed: i });
      });
      report = await page.evaluate(() =>
        window.diagnostics.audioDiagnosticsReport(),
      );
      check(
        `${engineName}: export storage is bounded with monotonic event order`,
        report.events.length === 400 &&
          report.events.every(
            (event, i, list) =>
              i === 0 || event.sequence > list[i - 1].sequence,
          ),
      );
      check(
        `${engineName}: diagnostic harness uses no actual microphone and has no page errors`,
        (await page.evaluate(() => window.probeMetrics.captures === 0)) &&
          errors.length === 0,
        errors,
      );
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
console.log(
  `Passed ${checks} diagnostic browser checks. These do not verify physical phone volume.`,
);
