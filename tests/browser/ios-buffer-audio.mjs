// Real MP3 decode/output; simulated native recognition callbacks. Desktop WebKit is
// not an iPhone acoustic test. Run with WORLD_TEST_URL and WORLD_PLAYWRIGHT_MODULE.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { chromium, webkit } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.WORLD_TEST_URL || 'http://127.0.0.1:5194';
const manifest = JSON.parse(await readFile('public/audio/manifest.json', 'utf8'));
const [key, duration] = Object.entries(manifest).find(([, n]) => n > 0.65 && n < 0.85);
const bytes = await readFile(`public/audio/${key}.mp3`);
const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 Version/26.6 Mobile/15E148 Safari/604.1';
let checks = 0;
for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
  const browser = await engine.launch({ headless: true, ...(name === 'Chromium' ? { channel: 'chromium' } : {}) });
  try {
    for (const slow of [false, true]) for (const offline of [false, true]) {
      const context = await browser.newContext({ userAgent: ua, isMobile: true, hasTouch: true, viewport: { width: 428, height: 879 } });
      const page = await context.newPage();
      await page.route('**/buffer-harness.html*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><button id="play">Play turn</button><button id="retry">Retry</button>' }));
      await page.route('**/buffer-fixtures/*.mp3', route => route.fulfill({ contentType: 'audio/mpeg', body: bytes }));
      await page.goto(`${base}/buffer-harness.html?audioDebug=1`);
      await page.evaluate(async ({ duration, slow }) => {
        const { AudioSystem } = await import('/src/game/audio.ts');
        const { audioKey } = await import('/src/audio-key.ts');
        // Resolve Vite's compiled import URLs so HMR never creates a second focus singleton.
        const compiled = await (await fetch('/src/game/audio.ts')).text();
        const focusUrl = compiled.match(/from\s*["']([^"']*convo\/audioFocus\.ts[^"']*)["']/)[1];
        const diagnosticsUrl = compiled.match(/from\s*["']([^"']*convo\/audioDiagnostics\.ts[^"']*)["']/)[1];
        const { captureAudio } = await import(focusUrl);
        const { audioDiagnosticsReport } = await import(diagnosticsUrl);
        window.report = audioDiagnosticsReport;
        window.results = { html: 0, contexts: 0, starts: [], gains: [], done: 0, fallback: 0, captures: 0, activeChanges: [], interruptedOffset: 0 };
        const NativeAudio = window.Audio;
        window.Audio = function (...args) { window.results.html++; return new NativeAudio(...args); };
        const NativeContext = window.AudioContext || window.webkitAudioContext;
        window.AudioContext = class extends NativeContext {
          constructor(...args) { super(...args); window.context = this; window.results.contexts++; }
          createBufferSource() {
            const s = super.createBufferSource(), start = s.start.bind(s);
            s.start = (...args) => {
              window.results.starts.push({ offset: args[1] || 0, duration: s.buffer.duration, rate: s.playbackRate.value, time: this.currentTime, peak: Math.max(...s.buffer.getChannelData(0).subarray(0, 2048).map(Math.abs)) });
              return start(...args);
            }; return s;
          }
          createGain() { const g = super.createGain(), connect = g.connect.bind(g); g.connect = (...args) => { window.results.gains.push(g.gain.value); return connect(...args); }; return g; }
        };
        speechSynthesis.speak = () => window.results.fallback++;
        const audio = window.audio = new AudioSystem(); audio.ready = true; audio.volume = 0.37; audio.base = '/buffer-fixtures/';
        const lines = ['Initial greeting', 'Pretty good, thanks!', 'What can I get you?', 'Last reply'];
        for (const text of lines) audio.manifest[audioKey('test', 1, text)] = duration;
        await audio.prefetch(lines.slice(0, 3).map(text => ({ voice: 'test', speed: 1, text })));
        await audio.prefetch([{ voice: 'test', speed: 1, text: lines[3] }]);
        audio.bindGestures();
        document.querySelector('#play').onclick = async () => {
          for (const [i, text] of lines.entries()) {
            if (i === 1) {
              const mic = captureAudio(); window.results.captures++; mic.stopping();
              // A delayed native recognition end arrives during the first reply. The
              // second reply follows without a new microphone or another user gesture.
              const poll = setInterval(() => { if (audio.getState() === 'playing') { clearInterval(poll); setTimeout(() => mic.ended(), 100); } }, 10);
            }
            if (i === 3) { const mic = captureAudio(); window.results.captures++; mic.stopping(); setTimeout(() => mic.ended(), 120); }
            if (!await audio.play('test', 1, text, { slow })) throw new Error('Canceled unexpectedly');
            window.results.done++; await new Promise(r => setTimeout(r, 160));
          }
        };
        document.querySelector('#retry').onclick = () => audio.retry();
      }, { duration, slow });
      if (offline) await context.setOffline(true);
      await page.locator('#play').tap();
      await page.waitForFunction(() => window.results.done === 4, undefined, { timeout: 18000 }).catch(async error => { console.log(name, slow, offline, await page.evaluate(() => ({ ...window.results, state: window.audio.getState(), report: window.report() }))); throw error; });
      const result = await page.evaluate(() => ({ ...window.results, events: window.report().events }));
      assert.equal(result.html, 0); assert.equal(result.contexts, 1); assert.equal(result.starts.length, 4); assert.equal(result.fallback, 0); assert.equal(result.captures, 2);
      assert(result.gains.every(n => Math.abs(n - 0.37) < 0.00001)); assert(result.starts.every(s => s.rate === 1 && s.offset === 0));
      const ended = result.events.filter(e => e.event === 'buffer.ended'); assert.equal(ended.length, 4);
      assert(ended.every(e => e.detail.currentTime + 0.004 >= e.detail.duration));
      const firstReply = result.events.filter(e => e.event === 'buffer.playing')[1];
      const lateEnd = result.events.find(e => e.event === 'capture.recognition-end');
      assert(lateEnd.ms > firstReply.ms && lateEnd.ms < ended[1].ms, `${name}: late end genuinely overlaps output`);
      const secondReply = result.events.filter(e => e.event === 'buffer.playing')[2];
      assert.equal(result.events.filter(e => e.event === 'capture.acquire' && e.ms > firstReply.ms && e.ms < secondReply.ms).length, 0);
      if (slow) assert(result.starts.every(s => Math.abs(s.duration - result.starts[0].duration) < 0.0001));
      console.log(`${name} ${offline ? 'offline' : 'online'} ${slow ? 'pitch-preserving slow' : 'normal'}: four real clips, one context, no HTML media; post-mic two-line reply; unchanged gain; late end isolated`); checks++;

      if (!offline && !slow) {
        await page.evaluate(() => { window.interruptedDone = null; window.audio.play('test', 1, 'Pretty good, thanks!').then(v => window.interruptedDone = v); });
        await page.waitForFunction(() => window.audio.getState() === 'playing');
        await page.waitForTimeout(180);
        await page.evaluate(async () => { await window.context.suspend(); window.results.interruptedOffset = window.context.currentTime; });
        await page.waitForFunction(() => window.audio.getState() === 'blocked');
        assert.equal(await page.evaluate(() => window.interruptedDone), null);
        await page.locator('#retry').tap();
        await page.waitForFunction(() => window.interruptedDone === true);
        const interrupted = await page.evaluate(() => ({ starts: window.results.starts.slice(-2), events: window.report().events.filter(e => e.event === 'buffer.blocked' || e.event === 'buffer.ended') }));
        const blocked = interrupted.events.find(e => e.event === 'buffer.blocked');
        assert(interrupted.starts[1].offset > 0.05); assert(Math.abs(interrupted.starts[1].offset - blocked.detail.currentTime) < 0.002);
        assert(interrupted.starts[1].offset < interrupted.starts[1].duration);
        console.log(`${name}: real suspend→tap resume kept exact nonzero offset and ended once`); checks++;
      }
      await context.close();
    }
  } finally { await browser.close(); }
}
console.log(`${checks}/${checks} native recorded-buffer cases passed; no physical iPhone loudness claim.`);
