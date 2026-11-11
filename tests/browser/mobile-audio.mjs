// Run against the local Vite preview. Playwright is optional, kept outside the production bundle:
// WORLD_TEST_URL=http://127.0.0.1:5193 WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/mobile-audio.mjs
// Uses a real short recording from the repository and real media decoding/ended events. No play() mocks.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { chromium, webkit } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.WORLD_TEST_URL || 'http://127.0.0.1:5188';
const manifest = JSON.parse(await readFile('public/audio/manifest.json', 'utf8'));
const [fixtureKey, duration] = Object.entries(manifest).find(([, seconds]) => seconds > 0.55 && seconds < 0.9);
const recording = await readFile(`public/audio/${fixtureKey}.mp3`);
for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
  const browser = await engine.launch({ headless: true, ...(name === 'Chromium' ? { channel: 'chromium' } : {}) });
  try {
    for (const lateRoute of [false, true]) for (const offline of [false, true]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      // This harness covers the retained HTMLAudio backend. Touch-enabled desktop
      // WebKit otherwise resembles a desktop-UA iPad; the iOS branch has its own
      // real-buffer harness in ios-buffer-audio.mjs.
      await context.addInitScript(() => Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 0 }));
      const page = await context.newPage();
      await page.route('**/mobile-audio-harness.html', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><button id="play">Play four lines</button>' }));
      await page.route('**/mobile-recordings/*.mp3', route => route.fulfill({ contentType: 'audio/mpeg', body: recording }));
      await page.goto(`${base}/mobile-audio-harness.html`);
      await page.evaluate(async ({ duration, module, lateRoute }) => {
        const { AudioSystem } = await import(module);
        const { audioKey } = await import('/src/audio-key.ts');
        const { createSpeechAttempt } = await import('/src/convo/speech.ts');
        window.result = { created: 0, started: [], ended: [], fallback: 0, done: 0, microphoneEnd: 0, secondStart: 0, captureStarts: 0, routes: [], lateEndRoute: null, lateEndWhilePlaying: false, volumes: [], activeChanges: [] };
        let route, player, finishLateRecognition;
        if (lateRoute) {
          // Model WebKit's unchanged-category no-op separately from real media decoding.
          // The unmodified cases above/below also exercise the browser's own AudioSession.
          let type = 'auto';
          route = { physical: 'auto', get type() { return type; }, set type(value) {
            if (type !== value) {
              if (player && !player.paused && !player.ended && !player.src.startsWith('data:audio/wav'))
                window.result.activeChanges.push({ type: value, currentTime: player.currentTime });
              this.physical = value;
            }
            type = value;
          } };
          Object.defineProperty(navigator, 'audioSession', { configurable: true, value: route });
        }
        const NativeAudio = window.Audio;
        window.Audio = function (...args) {
          const el = new NativeAudio(...args);
          player = el;
          window.result.created++;
          el.addEventListener('playing', () => {
            if (el.src.startsWith('data:audio/wav')) return;
            window.result.started.push(el.src);
            window.result.volumes.push(el.volume);
            if (window.result.started.length === 2) window.result.secondStart = performance.now();
            // Observe after the player's onplaying handler, which must never reset a category.
            setTimeout(() => { if (route) window.result.routes.push(route.physical); }, 0);
          });
          el.addEventListener('ended', () => { if (!el.src.startsWith('data:audio/wav')) window.result.ended.push(el.src); });
          el.addEventListener('timeupdate', () => {
            // Tie the simulated late native end to observed playback, not machine speed:
            // WebKit may start media later than the capture watchdog on a busy runner.
            if (window.result.started.length === 3 && el.currentTime > 0.05 && !el.paused && !el.ended) {
              const finish = finishLateRecognition;
              finishLateRecognition = undefined;
              finish?.();
            }
          });
          return el;
        };
        speechSynthesis.speak = () => { window.result.fallback++; };
        const audio = new AudioSystem();
        audio.base = '/mobile-recordings/'; audio.ready = true;
        const lines = ['First sentence', 'Second sentence', 'Third sentence', 'Fourth sentence'];
        for (const line of lines) audio.manifest[audioKey('test', 1, line)] = duration;
        // The game warms upcoming lines. All remain playable after the transport goes offline.
        await audio.prefetch(lines.map(text => ({ voice: 'test', speed: 1, text })));
        // Production prefetch deliberately limits each turn to three clips.
        await audio.prefetch([{ voice: 'test', speed: 1, text: lines[3] }]);
        audio.bindGestures?.();
        window.testAudio = audio;
        document.querySelector('#play').onclick = async () => {
          for (const [i, text] of lines.entries()) {
            if (i === 1 || i === 2) {
              // The browser's capture service is simulated; actual media playback must wait for
              // its delayed end event, exactly as after a spoken answer on a phone.
              const rec = {
                start() { window.result.captureStarts++; this.onstart?.(); },
                abort() {
                  const ended = () => {
                    if (i === 1) window.result.microphoneEnd = performance.now();
                    if (route && i === 2) route.physical = 'quiet-capture';
                    this.onend?.();
                    if (i === 1 && route) route.physical = 'quiet-capture'; // native cleanup after onend, before play
                    if (i === 2) {
                      window.result.lateEndRoute = route?.physical ?? 'native';
                      window.result.lateEndWhilePlaying = !player.paused && !player.ended && player.currentTime > 0;
                    }
                  };
                  if (i === 2) finishLateRecognition = ended;
                  else setTimeout(ended, 180);
                },
              };
              const attempt = createSpeechAttempt({ evaluate: () => 'complete', onUpdate() {}, onCommit() {}, createRecognition: () => rec });
              attempt.start(); attempt.stop();
            }
            await audio.play('test', 1, text); window.result.done++;
          }
        };
      }, { duration, module: process.env.WORLD_AUDIO_MODULE || '/src/game/audio.ts', lateRoute });
      if (offline) await context.setOffline(true);
      await page.locator('#play').tap(); // ONE gesture, not a new tap for every sentence.
      await page.waitForFunction(() => window.result.done === 4, undefined, { timeout: 15000 }).catch(async error => { console.log(name, offline, await page.evaluate(() => ({ ...window.result, started: window.result.started.map(s => s.slice(0, 60)), ended: window.result.ended.map(s => s.slice(0, 60)), state: window.testAudio.getState?.(), media: window.testAudio.player && { src: window.testAudio.player.src.slice(0, 100), time: window.testAudio.player.currentTime, paused: window.testAudio.player.paused, ready: window.testAudio.player.readyState, error: window.testAudio.player.error?.code } }))); throw error; });
      const result = await page.evaluate(() => window.result);
      assert.equal(result.started.length, 4, `${name}: every line must actually start once`);
      assert.equal(result.ended.length, 4, `${name}: every line must actually finish once`);
      assert.equal(result.fallback, 0);
      assert(result.microphoneEnd > 0 && result.secondStart >= result.microphoneEnd, `${name}: release microphone before the next recording`);
      assert.equal(result.created, 1, `${name}: preserve the gesture-authorized element`);
      assert.equal(result.captureStarts, 2, `${name}: repeat capture between recordings`);
      assert(result.volumes.every(volume => Math.abs(volume - 0.9) < 0.01), `${name}: retain the learner's volume`);
      assert(result.lateEndWhilePlaying, `${name}: late capture end must actually overlap the third recording`);
      assert.equal(result.lateEndRoute, lateRoute ? 'quiet-capture' : 'native', `${name}: defer late recovery while a recording is audible`);
      assert.deepEqual(result.activeChanges, [], `${name}: no category change may interrupt active media`);
      if (lateRoute) assert.deepEqual(result.routes, ['playback', 'playback', 'playback', 'playback'], `${name}: repair before the next recording, including the fourth with no new capture`);
      assert(result.started.every(src => src.startsWith('data:audio/mpeg;base64,')));
      console.log(`${name} ${offline ? 'offline' : 'online'} ${lateRoute ? 'late category' : 'native session'}: four recordings ended once after one tap; late end overlapped active media without category writes; next idle start recovered; one player; unchanged volume; no browser voice`);
      await context.close();
    }
  } finally { await browser.close(); }
}
