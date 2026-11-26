// Checker only. Serve the matching PC Vite app on a loopback URL.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { CHECKS, measureTalk, measurementConfig } from "../../tools/talk-framing-measure.mjs";
import {
  INTRO_START, before, launchBrowser, openContext, readyTown, remaining, seedFramingPage, talkIsClosed, watchPageErrors, worldConfig,
} from "../../tools/talk-framing-browser.mjs";

const ROUTES = [
  { id: "s78-bank", host: "aaron", zone: "bank" },
  { id: "s73-restaurant", host: "marco_host", zone: "trattoria", waiter: "marco" },
];
const SIZES = [{ width: 390, height: 844 }, { width: 1280, height: 800 }];
const CHECKPOINTS = [0, 6, 21, 60, 70];
// Existing AUTO answers in the ES restaurant. Optional steps are answered only if reached.
const ANSWERS = {
  resv: "Sí, tengo una reservación.", resv_name: "A nombre de Miller.", party: "Somos dos.",
  wait: "Sí, está bien.", seatpref: "Adentro, por favor.",
};

function installTrace({ route, source, portrait, wide, checkpoints }) {
  const measure = new Function(`return (${source})`)();
  const { game, store, audio } = window.__ew;
  const { renderer, rig } = game;
  const render = renderer.render;
  const present = game.presentWorld;
  const play = audio.play;
  const trace = window.__talkTrace = { phase: "before-start", groups: {}, events: [], fits: [], advance: false };
  const bounds = (el) => {
    const r = el?.getBoundingClientRect();
    return r ? [r.x, r.y, r.width, r.height] : null;
  };
  const opacity = (el) => {
    if (!el || !el.getClientRects().length) return 0;
    let value = 1;
    for (let node = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.visibility !== "visible") return 0;
      value *= Number(style.opacity);
    }
    return value;
  };

  // Keep the session's real line identity while controlling when its audio promise resolves.
  audio.play = function (...args) {
    const { conv } = store.getState();
    if (!conv.active || conv.sitId !== route.id || conv.speaking == null) return play.apply(this, args);
    trace.events.push({ event: "audio", run: conv.run, speaker: conv.npcId, line: conv.speaking, lineKey: conv.lineKey,
      step: conv.stepId, frame: renderer.info.render.frame, time: game.t });
    if (trace.advance && conv.npcId === route.host) return Promise.resolve(true);
    return new Promise((resolve) => {
      const release = (ok) => {
        off();
        if (trace.release === release) {
          trace.release = null;
          trace.heldLine = null;
        }
        resolve(ok);
      };
      const off = store.subscribe(({ conv: current }) => {
        if (!current.active || current.run !== conv.run) release(false);
      });
      trace.heldLine = conv.speaking;
      trace.release = release;
    });
  };

  // The lazy presenter installs its watcher before the next animation frame.
  // Time its real fit calls through the fitter's existing diagnostic callback.
  let presenter = game.talkCamera;
  Object.defineProperty(game, "talkCamera", {
    configurable: true,
    get: () => presenter,
    set(next) {
      presenter = next;
      if (!next) return;
      const fit = next.framing.fit;
      next.framing.fit = function (input) {
        return fit.call(this, { ...input, report: (stats) => {
          trace.fits.push({ phase: trace.phase, run: store.getState().conv.run, speaker: input.speaker.id,
            frame: renderer.info.render.frame, time: game.t, ...stats });
        } });
      };
    },
  });

  store.subscribe(({ conv }, { conv: prev }) => {
    if (conv.active === prev.active && conv.run === prev.run) return;
    trace.events.push({ event: conv.active ? "session-open" : "session-close", run: conv.run, speaker: conv.npcId,
      time: game.t, frame: renderer.info.render.frame, panel: bounds(document.querySelector(".convo")) });
  });

  let drawMs, lastDraw, shotNumber = 0;
  renderer.render = function (scene, camera) {
    if (scene !== game.scene || camera !== rig.cam) return render.call(this, scene, camera);
    const started = performance.now();
    const result = render.call(this, scene, camera);
    drawMs = performance.now() - started;
    return result;
  };

  function record(phase, { single = false, rendered = true } = {}) {
    const group = trace.groups[phase] ??= [];
    if (group.length >= (single ? 1 : 71)) return;
    const { conv, settings } = store.getState();
    const panel = document.querySelector(".convo");
    const intro = document.querySelector(".scene-intro, .intro-card");
    const picture = document.querySelector(".scene-backdrop");
    const image = picture?.querySelector("img.on");
    const cover = { fade: opacity(document.querySelector(".fade")), picture: opacity(picture), intro: opacity(intro) };
    const canvasShown = rendered && !picture && cover.fade < 0.99;
    const { frame, calls } = renderer.info.render;
    const { cam, talk } = rig;
    const { view } = cam;
    const shot = presenter?.shot;
    if (shot !== lastDraw) { shotNumber++; lastDraw = shot; }
    const canvas = bounds(renderer.domElement);
    const layout = game.talkLayout;
    const opening = layout?.picture;
    const at = group.length;
    const row = {
      phase, at, secondsAt60Hz: at / 60, frame, time: game.t, wallMs: performance.now(), rendered, canvasShown, cover,
      run: conv.run, active: conv.active, sitId: conv.sitId, speaker: conv.active ? conv.npcId : null,
      host: conv.active ? conv.hostId : null, line: conv.speaking, lineKey: conv.lineKey, step: conv.stepId,
      stage: conv.phase, held: conv.speaking != null && trace.heldLine === conv.speaking,
      introOpen: conv.introOpen, intro: bounds(intro), pictureReady: !!image?.complete && image.naturalWidth > 0,
      zone: game.zone.id, mode: rig.mode, playerDrawn: game.player.root.visible, approach: game.player.root.position.toArray(),
      quality: settings.quality, calls: rendered ? calls : null, drawMs: rendered ? drawMs : null,
      canvas, panel: bounds(panel), layout,
      usable: opening ? [canvas[0] + opening.x0, canvas[1] + opening.y0, opening.x1 - opening.x0, opening.y1 - opening.y0] : null,
      position: cam.position.toArray(), look: rig.presentedLook.toArray(), rotation: cam.quaternion.toArray(),
      target: talk?.pos.toArray() ?? null, fov: cam.fov, near: cam.near, aspect: cam.aspect,
      view: view?.enabled ? { ...view } : null,
      shot: shot ? { number: shotNumber, glide: shot.blend, push: !!shot.near, elapsed: presenter.elapsed } : null,
      speakerHome: game.talkCast.find(({ id }) => id === conv.npcId)?.home.toArray() ?? null,
    };
    if (rendered && panel && conv.active && (single || checkpoints.includes(at))) {
      // Snapshot has no await on its measuring path. The rays and paint stack
      // are read here at the camera that just rendered. Resolve the result before export.
      const config = innerWidth < 768 && innerWidth < innerHeight ? portrait : wide;
      row.measured = measure({ ...config, snapshot: true }).catch((error) => ({ error: String(error) }));
    }
    group.push(row);
  }

  trace.recordPicture = () => record("picture", { single: true, rendered: false });
  game.presentWorld = function (scene) {
    present.call(this, scene);
    // Only the game loop presents. ViewSwitch's existing thumbnail render
    // uses the same renderer and camera but never presents a world frame.
    if (scene !== "town") return;
    const { conv } = store.getState();
    const { phase } = trace;
    if (phase === "before-start") return record(phase, { single: true });
    if (phase === "return" || phase === "restart-return") {
      if (!conv.active) record(phase);
      return;
    }
    const opening = phase === "entry" || phase === "restart";
    const prefix = phase === "restart" ? "restart-" : "";
    const panel = document.querySelector(".convo");
    if (opening && (!conv.active || !panel)) return record(`${prefix}pre-mount`);
    if (!conv.active || conv.sitId !== route.id || !panel) return;
    const intro = document.querySelector(".scene-intro, .intro-card");
    if (opening) {
      record(`${prefix}first-mount`, { single: true });
      if (opacity(intro) > 0) record(`${prefix}intro`, { single: true });
      if (conv.introOpen || intro) return;
    }
    const speaking = conv.speaking != null && conv.lineKey && conv.transcript.some(
      (line) => line.id === conv.speaking && line.who === "npc" && line.npc === conv.npcId,
    );
    if (!speaking) return;
    if (phase === "handoff" && conv.npcId === route.host) {
      record(`host-line-${conv.speaking}`, { single: true });
      return;
    }
    if (phase === "handoff" && conv.npcId !== route.waiter) return;
    const paintedLine = panel.querySelector(".transcript .msg.npc:has(.bubble-part.speaking), .transcript .msg.npc.speaking");
    const speakerName = game.talkCast.find(({ id }) => id === conv.npcId)?.tag.querySelector("b")?.textContent.trim();
    if (!paintedLine?.querySelector(".bubble")?.textContent.trim()
      || paintedLine.querySelector(".meta > span")?.textContent.trim() !== speakerName) {
      if (opening || phase === "handoff" || phase === "repeat") record(`${phase}-before-transcript`, { single: true });
      return;
    }
    if (phase === "rotate-wide" || phase === "rotate-upright") {
      const size = phase === "rotate-wide" ? [844, 390] : [390, 844];
      const canvas = bounds(renderer.domElement);
      if (innerWidth !== size[0] || innerHeight !== size[1] || canvas[2] !== size[0] || canvas[3] !== size[1]) return;
    }
    if (phase === "picture") return;
    if (document.querySelector(".scene-backdrop") || opacity(document.querySelector(".fade")) >= 0.99) {
      return record(`${phase}-covered`, { single: true });
    }
    record(phase);
  };
}

const deadline = Date.now() + 240_000;
const layer = process.env.WORLD_LEARNER;
const out = new URL(`../../.b6/audit/continuity-pc-${["en", "lt"].includes(layer) ? layer : "unknown"}/`, import.meta.url);
const report = { storage: process.env.WORLD_STORAGE, learner: layer, rows: [], errors: [] };

function checkSeries(row, phase, speaker) {
  const frames = row.groups[phase] ?? [];
  assert.equal(frames.length, 71, `${row.id} ${phase} render count`);
  const first = frames[0];
  assert(frames.every((f, i) => f.at === i && f.rendered && f.calls > 0 && f.quality === "low"
    && [...f.position, ...f.look, f.fov, f.near, f.time].every(Number.isFinite)
    && f.run === first.run && (i === 0 || f.frame > frames[i - 1].frame)), `${row.id} ${phase} presented sequence`);
  if (!speaker) return frames;
  assert(frames.every((f) => f.canvasShown && f.playerDrawn && f.mode === "talk" && f.zone === row.zone
    && f.speaker === speaker && f.line === first.line && f.lineKey && f.lineKey === first.lineKey && f.held),
  `${row.id} ${phase} must present one real held speaking line`);
  for (const at of CHECKPOINTS) {
    const { measured: m } = frames[at];
    const where = `${row.id} ${row.size.width}×${row.size.height} ${phase} +${at}`;
    assert.equal(m?.kind, "snapshot", `${where} ${m?.reason ?? m?.error ?? ""}`);
    assert.deepEqual([m.sitId, m.run, m.speakerId, m.line, m.lineKey, m.shot.frame],
      [row.id, first.run, speaker, first.line, first.lineKey, frames[at].frame], where);
    assert.equal(m.landmarks.length, 9, where);
    for (const p of m.landmarks) assert(p.inDepth && p.inOpening, `${where} ${p.name} outside depth or opening`);
    for (const name of CHECKS) assert.equal(m.checks[name].status, "PASS", `${where} ${name} ${m.checks[name].reason}`);
  }
  const tail = frames.slice(60);
  for (const a of tail) for (const b of tail) {
    assert(distance(a.position, b.position) <= 0.001 && distance(a.look, b.look) <= 0.001
      && a.fov === b.fov && a.near === b.near && a.view?.offsetX === b.view?.offsetX && a.view?.offsetY === b.view?.offsetY,
    `${row.id} ${phase} camera drifted on a held line`);
  }
  return frames;
}

function distance(a, b) {
  return Math.hypot(...a.map((value, i) => value - b[i]));
}

function checkReturn(row, phase, run) {
  const frames = checkSeries(row, phase);
  const y = row.size.width < row.size.height ? -row.size.height * 0.1 : 0;
  assert(frames.every((f) => !f.active && f.run === run && f.zone === row.zone && f.mode === "interior"
    && f.playerDrawn && f.target === null && f.near === 0.1
    && (f.view?.offsetX ?? 0) === 0 && Math.abs((f.view?.offsetY ?? 0) - y) < 0.01),
  `${row.id} ${phase} did not restore the interior camera and its normal walking shift`);
  assert.equal(frames.at(-1).panel, null, `${row.id} panel unmounted on return`);
}

function checkRoute(row) {
  const { id, host, waiter, groups, size } = row;
  for (const phase of ["before-start", "pre-mount", "first-mount", "intro"]) {
    const frame = groups[phase]?.[0];
    assert(frame?.rendered && frame.calls > 0 && frame.quality === "low", `${id} missing rendered ${phase}`);
  }
  const [entry] = checkSeries(row, "entry", host);
  assert.deepEqual(entry.canvas.slice(2), [size.width, size.height], `${id} rendered viewport`);
  assert(groups["first-mount"][0].panel && groups.intro[0].cover.intro > 0 && groups.intro[0].introOpen
    && groups.intro[0].run === entry.run && groups.intro[0].frame < entry.frame, `${id} visible intro before the first speaking frame`);
  assert.equal(row.lazyRequests.length, 1, `${id} lazy framing request on first actor talk`);
  assert.equal(row.lazyRequests[0].phase, "actor-talk", `${id} framing must load on talk`);
  if (waiter) {
    const [handoff] = checkSeries(row, "handoff", waiter);
    assert.equal(handoff.run, entry.run, `${id} same conversation at handoff`);
    assert(handoff.line > entry.line && handoff.lineKey !== entry.lineKey
      && Object.keys(groups).some((phase) => phase.startsWith("host-line-")), `${id} real host turn before Luis`);
    assert(handoff.speakerHome && distance([handoff.speakerHome[0], handoff.speakerHome[2]], [-2, 1.2]) < 0.001,
      `${id} ES Luis placement`);
    const sameLuisLine = (phase) => {
      const frames = checkSeries(row, phase, waiter);
      assert.deepEqual([frames[0].run, frames[0].line], [handoff.run, handoff.line], `${phase} kept the same held Luis line`);
      return frames.at(-1);
    };
    const old = groups.handoff.at(-1);
    const changed = sameLuisLine("panel-resize");
    const axis = size.width < size.height ? 1 : 0;
    const edge = axis ? "y1" : "x1";
    assert.deepEqual(changed.canvas, old.canvas, "panel-only change kept the canvas unchanged");
    assert(Math.abs(changed.panel[axis] - old.panel[axis] - 25) < 1, "mounted panel moved 25 CSS px");
    assert(Math.abs(changed.layout.picture[edge] - old.layout.picture[edge] - 25) < 1, "observer saw the changed panel opening");
    assert(Math.abs((changed.view?.[axis ? "offsetY" : "offsetX"] ?? 0) - (old.view?.[axis ? "offsetY" : "offsetX"] ?? 0)) > 1,
      "presented projection used the changed opening");
    if (size.width === 390) {
      for (const [phase, w, h, dockAxis, end] of [["rotate-wide", 844, 390, 0, "x1"], ["rotate-upright", 390, 844, 1, "y1"]]) {
        const frame = sameLuisLine(phase);
        assert.deepEqual(frame.canvas.slice(2), [w, h], phase);
        assert.deepEqual([frame.layout.width, frame.layout.height, frame.view.fullWidth, frame.view.fullHeight], [w, h, w, h], phase);
        assert(Math.abs(frame.canvas[dockAxis] + frame.layout.picture[end] + 10 - frame.panel[dockAxis]) < 1, `${phase} actual panel edge`);
      }
    }
    const picture = groups.picture?.[0];
    assert(picture?.cover.picture >= 0.99 && picture.pictureReady && !picture.rendered && !picture.canvasShown
      && picture.run === handoff.run && picture.line === handoff.line, "actual picture covered the camera during the held Luis line");
    sameLuisLine("picture-return");
  } else {
    const repeat = checkSeries(row, "repeat", host);
    assert(repeat[0].line > entry.line && repeat[0].lineKey === entry.lineKey && repeat[0].run === entry.run, "Ricardo repeated the original line");
    for (const f of repeat) {
      const held = groups.entry.at(-1);
      assert(distance(f.position, held.position) <= 0.001 && distance(f.look, held.look) <= 0.001
        && f.view?.offsetX === held.view?.offsetX && f.view?.offsetY === held.view?.offsetY
        && f.fov === held.fov && f.near === held.near, "repeat moved the camera");
    }
    const restarted = checkSeries(row, "restart", host);
    assert(restarted[0].run > entry.run && restarted[0].line > repeat[0].line, "restart opened a new live session");
    assert(groups["restart-pre-mount"].some((f) => !f.active && f.mode === "interior" && !f.target),
      "close and immediate restart included a real interior frame");
    checkReturn(row, "restart-return", restarted[0].run);
  }
  checkReturn(row, "return", entry.run);
  assert(row.fits.length && row.fits.every(({ tested }) => tested <= 8), `${id} live fit events and search cap`);
}

async function exercise(page, row) {
  const { id, host, waiter, size, touch } = row;
  const wait = async (fn, arg) => {
    const handle = await page.waitForFunction(fn, arg, { timeout: remaining(deadline), polling: 35 });
    try { return await handle.jsonValue(); } finally { await handle.dispose(); }
  };
  const setPhase = (phase) => page.evaluate((phase) => { window.__talkTrace.phase = phase; }, phase);
  const frames = (phase, count = 71) => wait(([phase, count]) => (window.__talkTrace.groups[phase]?.length ?? 0) >= count, [phase, count]);
  const press = (locator) => touch ? locator.tap({ timeout: remaining(deadline) }) : locator.click({ timeout: remaining(deadline) });
  const start = page.locator(".scene-intro, .intro-card").getByRole("button", { name: INTRO_START });
  const screenshot = async (label) => {
    const file = `${size.width}x${size.height}-${id}-${label}.jpg`;
    const beforeFrame = await page.evaluate(() => window.__ew.game.presentedWorld?.serial ?? null);
    await page.screenshot({ path: fileURLToPath(new URL(file, out)), type: "jpeg", quality: 85,
      scale: "css", timeout: Math.min(remaining(deadline), 5000) });
    const afterFrame = await page.evaluate(() => window.__ew.game.presentedWorld?.serial ?? null);
    row.frames[label] = { file, beforeFrame, afterFrame };
  };
  const close = (phase, restart = false) => page.evaluate(({ phase, restart }) => {
    const { game, store } = window.__ew;
    const trace = window.__talkTrace;
    trace.phase = phase;
    game.closeConversation();
    const state = { active: store.getState().conv.active, mode: game.rig.mode, viewEnabled: !!game.rig.cam.view?.enabled,
      frame: game.renderer.info.render.frame, time: game.t };
    trace.events.push({ event: "close-hook", phase, ...state });
    if (restart) game.restartScenario();
    return state;
  }, { phase, restart });

  try {
    await frames("before-start", 1);
    await page.evaluate((id) => {
      const trace = window.__talkTrace;
      trace.phase = "entry";
      trace.events.push({ event: "start-hook", time: window.__ew.game.t, frame: window.__ew.game.renderer.info.render.frame });
      window.__ew.game.startScenario(id);
    }, id);
    await frames("intro", 1);
    await press(start);
    await frames("entry");
    await screenshot("entry-held");

    if (waiter) {
      await page.evaluate(() => {
        const trace = window.__talkTrace;
        trace.phase = "handoff";
        trace.advance = true;
        trace.release(true);
      });
      for (let i = 0; i <= 5; i++) {
        const at = await wait(({ host, waiter }) => {
          const { conv } = window.__ew.store.getState();
          if (!conv.active) return false;
          if (conv.npcId === waiter && conv.speaking != null && conv.lineKey && window.__talkTrace.heldLine === conv.speaking) {
            return { speaker: conv.npcId, line: conv.speaking, lineKey: conv.lineKey, run: conv.run };
          }
          if (conv.phase === "you" && conv.npcId === host) return { step: conv.stepId, run: conv.run };
          return false;
        }, { host, waiter });
        if (at.speaker === waiter) break;
        assert(i < 5 && ANSWERS[at.step], `unexpected active Spanish restaurant step ${at.step}`);
        await page.evaluate(({ id, host, at, answer }) => {
          const { game, store } = window.__ew;
          const { conv } = store.getState();
          if (!conv.active || conv.sitId !== id || conv.run !== at.run || conv.phase !== "you"
            || conv.npcId !== host || conv.stepId !== at.step || !game.activeSession?.active) {
            throw new Error("restaurant step changed before submission");
          }
          window.__talkTrace.events.push({ event: "answer", run: conv.run, step: conv.stepId, speaker: conv.npcId,
            time: game.t, frame: game.renderer.info.render.frame });
          void game.activeSession.submit(answer);
        }, { id, host, at, answer: ANSWERS[at.step] });
      }
      await frames("handoff");
      await screenshot("handoff-held");
      await page.evaluate((touch) => {
        const panel = document.querySelector(".convo");
        const rect = panel.getBoundingClientRect();
        window.__talkTrace.phase = "panel-resize";
        if (touch) panel.style.setProperty("--conversation-image-height", `${rect.top + 25}px`);
        else panel.style.width = `${rect.width - 25}px`;
      }, touch);
      await frames("panel-resize");
      await screenshot("panel-resize");
      if (touch) {
        await setPhase("rotate-wide");
        await page.setViewportSize({ width: 844, height: 390 });
        await frames("rotate-wide");
        await screenshot("rotate-wide");
        await page.evaluate(() => document.querySelector(".convo").style.removeProperty("--conversation-image-height"));
        await setPhase("rotate-upright");
        await page.setViewportSize(size);
        await frames("rotate-upright");
      }

      await setPhase("picture");
      const chip = page.locator(".view-chip button");
      await press(chip);
      await wait(() => {
        const picture = document.querySelector(".scene-backdrop");
        const img = picture?.querySelector("img.on");
        return img?.complete && img.naturalWidth > 0 && +getComputedStyle(picture).opacity >= 0.99
          && +getComputedStyle(img).opacity >= 0.99 && window.__ew.game.covered;
      });
      await page.evaluate(() => window.__talkTrace.recordPicture());
      await screenshot("picture");
      await setPhase("picture-return");
      await press(chip);
      await frames("picture-return");
      await screenshot("picture-return");
    } else {
      await page.evaluate(() => {
        const trace = window.__talkTrace;
        trace.advance = true;
        trace.release(true);
      });
      await wait(() => {
        const { conv } = window.__ew.store.getState();
        return conv.active && conv.phase === "you";
      });
      await page.evaluate(() => {
        const trace = window.__talkTrace;
        trace.phase = "repeat";
        trace.advance = false;
        window.__ew.game.activeSession.repeatLast(false);
      });
      await frames("repeat");
    }

    const closed = await close("return");
    assert.deepEqual([closed.active, closed.mode, closed.viewEnabled], [false, "interior", false], "close released the talk lens");
    await wait(talkIsClosed, 0);
    await frames("return");
    await screenshot("return");

    if (!waiter) {
      await setPhase("restart-setup");
      await page.evaluate((id) => window.__ew.game.startScenario(id), id);
      await press(start);
      await wait(() => !!window.__talkTrace.release);
      const closed = await close("restart", true);
      assert.deepEqual([closed.active, closed.mode, closed.viewEnabled], [false, "interior", false], "close before immediate restart");
      await frames("restart-intro", 1);
      await press(start);
      await frames("restart");
      await screenshot("restart-held");
      await close("restart-return");
      await wait(talkIsClosed, 0);
      await frames("restart-return");
    }
  } catch (error) {
    if (remaining(deadline) > 1) await screenshot("failure").catch((e) => { row.screenshotError = e.message; });
    throw error;
  }
}

async function runRoute(browser, config, route, size) {
  const touch = size.width === 390;
  const row = { ...route, size, touch, identity: null, groups: {}, frames: {}, errors: [], lazyRequests: [] };
  report.rows.push(row);
  let context, page;
  try {
    context = await openContext(browser, size, touch, config.url);
    page = await context.newPage();
    row.errors = watchPageErrors(page);
    let requestPhase = "startup";
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.origin === config.url.origin && /\/(?:talkFraming\.ts|talkFraming-[^/]+\.js)$/.test(url.pathname)) {
        row.lazyRequests.push({ url: url.pathname, phase: requestPhase, time: Date.now() });
      }
    });
    await seedFramingPage(page, config.storage, { quietTexts: true });
    row.identity = await readyTown(page, config, deadline);
    await page.evaluate(installTrace, {
      route, source: measureTalk.toString(), portrait: measurementConfig(SIZES[0]),
      wide: measurementConfig(SIZES[1]), checkpoints: CHECKPOINTS,
    });
    requestPhase = "actor-talk";
    await exercise(page, row);
  } catch (error) {
    row.errors.push(error.stack ?? String(error));
  } finally {
    try {
      if (page) {
        const data = await before(Date.now() + 10_000, "collecting the rendered trace", () => page.evaluate(async () => {
          const trace = window.__talkTrace;
          if (!trace) return null;
          trace.phase = "finished";
          const resolved = await Promise.all(Object.entries(trace.groups).map(async ([phase, rows]) => [
            phase, await Promise.all(rows.map(async (row) => ({ ...row, measured: await row.measured ?? null }))),
          ]));
          return { groups: Object.fromEntries(resolved), events: trace.events, fits: trace.fits };
        }));
        if (data) Object.assign(row, data);
      }
    } catch (error) {
      row.errors.push(`trace collection: ${error.message}`);
    }
    await context?.close().catch((error) => row.errors.push(`context close: ${error.message}`));
  }
  // Keep the next route running even if this one failed.
  try { checkRoute(row); } catch (error) { row.errors.push(error.stack ?? String(error)); }
  row.pass = row.errors.length === 0;
  console.log(`${row.pass ? "PASS" : "FAIL"} · ${size.width}×${size.height} · ${route.id}${row.pass ? "" : ` · ${row.errors.map((e) => e.split("\n")[0]).join(" · ")}`}`);
}

let browser;
try {
  await mkdir(out, { recursive: true });
  const config = worldConfig();
  assert.equal(process.env.WORLD_STORAGE, "puerto-colibri", "set WORLD_STORAGE=puerto-colibri");
  assert(["en", "lt"].includes(layer), "set WORLD_LEARNER=en or WORLD_LEARNER=lt");
  assert.deepEqual([config.storage, config.learner], ["puerto-colibri", layer]);
  report.url = config.url.href;
  browser = await launchBrowser(remaining(deadline));
  for (const size of SIZES) for (const route of ROUTES) await runRoute(browser, config, route, size);
} catch (error) {
  report.errors.push(error.stack ?? String(error));
} finally {
  await browser?.close().catch((error) => report.errors.push(`browser close: ${error.message}`));
  report.pass = report.errors.length === 0 && report.rows.length === SIZES.length * ROUTES.length && report.rows.every((row) => row.pass);
  await writeFile(new URL("trace.json", out), JSON.stringify(report, null, 2) + "\n");
}
for (const error of report.errors) console.error(error);
console.log(`${report.pass ? "PASS" : "FAIL"} · ${report.rows.filter((row) => row.pass).length}/4 continuous talk routes · ${out.pathname}trace.json`);
if (!report.pass) process.exitCode = 1;
