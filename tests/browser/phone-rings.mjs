// Run against the same local server and Chromium setup as taxi.mjs.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const url = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const key = `${process.env.WORLD_STORAGE || "english-world"}-progress-v1`;
const shots = process.env.WORLD_SHOT_DIR || process.env.WORLD_SHOTS || "";
const width = Number(process.env.WORLD_PHONE_WIDTH || 390);
const height = Number(process.env.WORLD_PHONE_HEIGHT || 844);
const mobile = width < 768;
if (shots) await mkdir(shots, { recursive: true });

const invite = "s83-invite-call", flood = "p24-flood", complaint = "p26-complaint";
const completed = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0, sounds: 0 },
  sits: Object.fromEntries(["s76-dentist-call", "s80-support-call", "s89-video-call", "s90-running-late", "s63-party", complaint].map((id) => [id, completed])),
  phrases: {}, seenIntro: {}, started: 1, objective: invite,
  place: { zone: "town", x: 28, z: -20, rot: Math.PI },
  coach: { done: true, seen: { list: true } },
};

function installTestControls({ key, progress }) {
  sessionStorage.setItem("ew-play-now", "1");
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(progress));
  // Keep the physics frame at 50 ms, like taxi.mjs. The phone uses actual elapsed visible play time.
  let now = 1000;
  performance.now = () => now;
  const frames = [];
  window.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
  window.cancelAnimationFrame = () => {};
  window.__stepPhone = (count, ms) => {
    for (let i = 0; i < count; i++) {
      now += ms;
      for (const frame of frames.splice(0)) frame(now);
    }
  };
  window.SpeechRecognition = undefined;
  window.webkitSpeechRecognition = undefined;
}

const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile,
  });
  const page = await context.newPage();
  const errors = [], screenshots = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.route(/\.mp3(?:\?|$)/, (route) => route.fulfill({ status: 204, body: "" }));
  await page.addInitScript(installTestControls, { key, progress });
  await page.goto(url, { waitUntil: "domcontentloaded" });

  const real = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const step = (count = 1, ms = 50) => page.evaluate(([n, dt]) => window.__stepPhone(n, dt), [count, ms]);
  const waitFor = async (test, label) => {
    for (let i = 0; i < 300; i++) {
      if (await test()) return;
      await real(20);
      await step(2);
    }
    assert.fail(label);
  };
  const shot = async (name, subject) => {
    if (!shots) return;
    const path = join(shots, `phone-${name}.png`);
    // Let UI transitions finish while holding the world clock at the current line or turn.
    await duringFrames(async () => {
      await real(600);
      await subject.evaluate(async (element) => {
        const animations = [];
        for (let node = element; node; node = node.parentElement) animations.push(...node.getAnimations());
        await Promise.allSettled(animations.filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime)).map((a) => a.finished));
      });
      await page.screenshot({ path });
    });
    screenshots.push(path);
  };
  async function duringFrames(action) {
    let done = false;
    const frames = (async () => {
      while (!done) { await step(1, 0); await real(20); }
    })();
    try { return await action(); }
    finally { done = true; await frames; }
  }
  const press = (locator) => duringFrames(() => mobile ? locator.tap() : locator.click());
  const state = () => page.evaluate(() => window.__ew.game.phoneState());
  const force = () => page.evaluate(() => window.__ew.game.phoneDueNow());
  const conv = (id) => page.evaluate((sit) => {
    const { conv } = window.__ew.store.getState();
    return conv.active && conv.sitId === sit;
  }, id);
  const card = page.locator(".phone-ring");
  const expectCard = async (id) => {
    await waitFor(async () => (await state()).card === id && await card.isVisible(), `expected phone card ${id}`);
    assert.equal(await card.getAttribute("data-call"), id);
  };
  const calmThen = async (id) => {
    await step();
    await step(1, 9400);
    assert.equal((await state()).card, null, "blocked before ten calm seconds");
    await step(1, 650);
    await expectCard(id);
  };
  const noCardFor = async (description) => {
    await step(2, 6000);
    assert.equal((await state()).card, null, description);
  };
  const checkMeetingFrame = async (meeting) => {
    const frame = await meeting.evaluate((panel) => {
      const { game } = window.__ew;
      const { root, height } = game.modes.get("lizzie-meeting").actor;
      const head = root.position.clone();
      head.y += height * 0.9;
      head.project(game.rig.cam);
      const x = (head.x + 1) * innerWidth / 2;
      const y = (1 - head.y) * innerHeight / 2;
      return { x, y, depth: head.z, width: innerWidth, panelTop: panel.getBoundingClientRect().top };
    });
    assert(frame.x > 10 && frame.x < frame.width - 10 && frame.y > 10 && frame.y < frame.panelTop - 10
      && Math.abs(frame.depth) < 1, `Lizzie's head is visible above the meeting card: ${JSON.stringify(frame)}`);
  };

  await waitFor(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"), "town loads");
  await waitFor(() => page.evaluate(() => !window.__ew.store.getState().hud.zoneBanner), "place banner clears");
  await page.evaluate(() => window.__ew.game.setJoystick(0.65, 0));
  await waitFor(() => page.evaluate(() => window.__ew.store.getState().hud.walking), "the learner is walking");
  await force();
  await expectCard(invite);
  await page.evaluate(() => window.__ew.game.setJoystick(0, 0));
  assert.equal(await card.getAttribute("data-kind"), "reminder");
  await waitFor(() => card.locator("img").isVisible(), "Lizzie portrait");
  await shot("reminder", card);
  await press(card.getByRole("button", { name: "Skambinti", exact: true }));
  await waitFor(() => conv(invite), "answer opens the phone conversation");
  assert.equal(await page.evaluate(() => window.__ew.store.getState().conv.mode), "phone");
  await shot("answered", page.locator(".convo"));

  await page.evaluate((done) => window.__ew.store.getState().updateProgress((p) => { p.sits["p18-startup"] = done; }), completed);
  await force();
  await noCardFor("open conversation blocks a due card");
  await page.evaluate(() => window.__ew.store.getState().setConv({ phase: "ended" }));
  const endCard = page.locator('.convo[data-phase="ended"]');
  await waitFor(() => endCard.isVisible(), "end card is shown");
  await noCardFor("the end card still blocks a due card");
  // Completing through the hook closes the end card and returns to the town.
  assert(await page.evaluate((id) => window.__ew.game.finishPhoneCallForTest(id, { place: "cafe", meetTime: { h: 7, m: 30 }, day: "friday" }), invite));
  await waitFor(async () => !(await page.locator(".convo").isVisible()), "end card closes before the invitation shot");
  const invitation = { place: "cafe", chip: "prie kavinės", when: "penktadienį 19:30" };
  assert.deepEqual((await state()).invitation, invitation);
  const task = page.locator('.objective-card[data-target-location="sunny-cup"]');
  await waitFor(() => task.locator(".arrow").isVisible(), "invitation points to Sunny Cup");
  assert.match(await task.innerText(), /Susitik su Lizzie prie kavinės · penktadienį 19:30/);
  const reward = page.locator(".town-toasts .stamp button");
  if (shots && await reward.isVisible()) await press(reward);
  await shot("invitation", task);
  await calmThen(flood);
  assert.equal(await card.getAttribute("data-kind"), "incoming");
  assert.match(await card.innerText(), /skambina/);
  await shot("ringing", card);
  await press(card.getByRole("button", { name: "Atmesti", exact: true }));
  assert.equal((await state()).missed[flood]?.presentations, 1);
  const toolbarPhone = page.locator('.toolbar button[title="Telefonas (P)"]');
  assert.equal(await toolbarPhone.locator(".due-badge").innerText(), "1");
  await press(toolbarPhone);
  const missed = page.locator(".missed-calls");
  assert.match(await missed.innerText(), /Praleisti skambučiai/);
  await shot("missed", missed);
  await press(missed.getByRole("button", { name: "Perskambinti" }));
  await waitFor(() => conv(flood), "returning a missed call opens it");
  await waitFor(() => page.locator(".scene-intro").isVisible(), "regular flood intro");
  assert.match(await page.locator(".scene-intro").innerText(), /Pirmiausia paskambink/);
  assert(await page.evaluate((id) => window.__ew.game.finishPhoneCallForTest(id), flood));
  assert.deepEqual((await state()).missed, {});

  await page.evaluate((id) => {
    const { game, store } = window.__ew;
    store.getState().updateProgress((p) => { delete p.sits[id]; });
    const car = game.rides.list.find((ride) => ride.kind === "car");
    game.placeOnFoot(car.m.x + 2, car.m.z, car.m.heading);
    if (!game.boardRide(car)) throw new Error("could not board the convertible");
  }, complaint);
  await force();
  await noCardFor("convertible ride blocks a due card");
  await waitFor(() => page.evaluate(() => window.__ew.game.rides.phase === "on"), "at the wheel");
  await page.evaluate(() => window.__ew.game.interact());
  await waitFor(() => page.evaluate(() => !window.__ew.game.rides.riding), "left the convertible");
  await calmThen(complaint);

  // Taxi start interrupts an already-visible card. A second eligible reminder stays queued while the taxi owns play.
  await page.evaluate(() => {
    const { game, store } = window.__ew;
    store.getState().updateProgress((p) => { delete p.sits["s80-support-call"]; });
    game.modeStart("taxi");
  });
  assert.equal((await state()).card, null);
  assert.equal((await state()).missed[complaint]?.presentations, 1);
  await waitFor(() => page.evaluate(() => window.__ew.game.modes.owns("taxi") && !!window.__ew.game.modes.active), "taxi mode running");
  await force();
  await noCardFor("taxi blocks a due card");
  await page.evaluate(() => window.__ew.game.modeExit());
  await waitFor(() => page.evaluate(() => !window.__ew.game.modes.engaged && !window.__ew.game.transitioning), "left the taxi");
  await calmThen("s80-support-call");

  await page.evaluate(() => window.__ew.game.teleportTo("sunny-cup"));
  assert.equal((await state()).card, null);
  const meeting = page.locator(".lizzie-meeting");
  const greeting = meeting.locator('[data-meeting-line="phone_meet_hello"]');
  await waitFor(() => page.evaluate(() => window.__ew.game.modes.active?.id === "lizzie-meeting"), "Lizzie's meeting starts");
  await duringFrames(() => greeting.waitFor({ state: "visible" }));
  assert.equal(await page.evaluate(() => window.__ew.game.rig.mode), "talk");
  await checkMeetingFrame(meeting);
  await shot("meeting", greeting);
  await page.evaluate((id) => {
    const { game, store } = window.__ew;
    store.getState().updateProgress((p) => { delete p.sits[id]; });
    game.phoneDueNow();
  }, flood);
  await noCardFor("meeting blocks a due card");
  const ready = meeting.locator('[data-meeting-answer="phone_meet_ready"]');
  const tickets = meeting.locator('[data-meeting-answer="phone_meet_tickets"]');
  await waitFor(async () => await ready.isVisible() && await tickets.isVisible(), "meeting offers M2 and M3");
  assert.equal(await meeting.locator("[data-meeting-answer]").count(), 2);
  assert.equal(await greeting.count(), 0);
  assert.equal((await state()).card, null);
  await checkMeetingFrame(meeting);
  await shot("meeting-reply", meeting);
  await press(ready);
  await waitFor(() => meeting.locator('[data-meeting-line="phone_meet_go"]').isVisible(), "Lizzie replies");
  await waitFor(async () => !(await state()).invitation && !(await meeting.isVisible()), "meeting clears the invitation");
  assert.equal(await task.count(), 0);
  await calmThen(flood);
  await press(card.getByRole("button", { name: "Atsiliepti" }));
  await waitFor(() => conv(flood), "answering the incoming call opens it");
  assert.match(await page.locator(".scene-intro").innerText(), /Skambina Lizzie/);
  assert(await page.evaluate((id) => window.__ew.game.finishPhoneCallForTest(id), flood));

  await page.evaluate(() => window.__ew.game.call("s90-running-late"));
  await waitFor(() => conv("s90-running-late"), "running late starts from the list path");
  assert(await page.evaluate(() => window.__ew.game.finishPhoneCallForTest("s90-running-late")));
  const office = page.locator('.objective-card[data-target-location="office"]');
  assert.match(await office.innerText(), /Skubėk į biurą – susirinkimas jau prasidėjo/);
  await page.evaluate(() => window.__ew.game.teleportTo("office"));
  await waitFor(() => conv("s34-meeting"), "arriving at the office starts the meeting");
  assert.equal(await page.evaluate(() => window.__ew.store.getState().progress.phone.office), undefined);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ floodIntro: "incoming and returned", officeMeeting: true, answered: invite, declined: flood, returned: true, blockedBy: ["conversation", "convertible", "taxi", "meeting"], invitation, meetingCompleted: true, screenshots }));
} finally {
  await browser.close();
}
