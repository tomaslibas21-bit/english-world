// Chromium compositor capture. The page uses its native render clock and
// screenshots for the sheet are extracted after the route has stopped filming.
import assert from "node:assert/strict";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export class ActingFilm {
  constructor(page, context, { out, shotDir, layer, row, fixture }) {
    Object.assign(this, { page, context, out, shotDir, layer, row, fixture });
    this.id = [row.size, row.id, row.subcase].filter(Boolean).join("-");
    this.dir = path.join(out, "film", this.id);
    this.frames = [];
    this.samples = [];
    this.events = [];
    this.writes = [];
    this.errors = [];
  }

  async start(kind) {
    await mkdir(this.dir, { recursive: true });
    this.kind = kind;
    const session = this.session = await this.context.newCDPSession(this.page);
    session.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
      void session.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
      const wall = metadata.timestamp * 1000;
      if (!Number.isFinite(wall) || wall <= (this.frames.at(-1)?.wall ?? 0)) return;
      const file = `${String(this.frames.length).padStart(5, "0")}.jpg`;
      this.frames.push({ file, wall });
      this.writes.push(writeFile(path.join(this.dir, file), Buffer.from(data, "base64"))
        .catch((error) => this.errors.push(error.message)));
    });
    await session.send("Page.startScreencast", { format: "jpeg", quality: 74, everyNthFrame: 2 });
  }

  sample(f) {
    if (!this.session) return;
    const actor = f.p?.speakerId ?? f.conv.npc ?? this.row.runtime?.id;
    const media = f.media?.state === "playing" && f.media.source?.match ? f.media : null;
    this.samples.push({
      wall: f.wall, gameTime: f.gameTime, renderFrame: f.frame, run: f.conv.run, phase: f.conv.phase,
      actor, lineId: f.conv.line ?? f.p?.lineId, text: f.conv.text,
      request: f.request, playback: f.audioState, reduced: f.reduced, anim: f.actual[actor]?.anim,
      cue: f.p?.gesture, gestureWeight: f.p?.gestureWeight, listen: f.p?.listeningWeight, gaze: f.p?.gaze?.target,
      reaction: f.p?.reaction, mouth: f.p?.mouth, bind: f.actual[actor]?.weight, release: f.release,
      media: media && { request: media.owner, key: media.key, time: media.time, rate: media.rate,
        pipeline: media.pipeline, envelope: media.envelope, source: media.source },
    });
  }

  mark(entry, image) {
    this.events.push({ entry, image });
  }

  async finish(requests) {
    if (!this.session) return;
    await this.session.send("Page.stopScreencast").catch((error) => this.errors.push(error.message));
    await this.session.detach().catch((error) => this.errors.push(error.message));
    await Promise.all(this.writes);
    const { frames, samples, events } = this;
    const origin = frames[0]?.wall ?? samples[0]?.wall;
    const ms = (wall) => wall - origin;
    const durationMs = ms(frames.at(-1)?.wall);
    const gaps = frames.slice(1).map((f, i) => f.wall - frames[i].wall);
    const maxGapMs = Math.max(0, ...gaps);
    const nearest = (wall) => frames.reduce((a, b) => !a || Math.abs(b.wall - wall) < Math.abs(a.wall - wall) ? b : a, null);
    const clips = [];
    for (const request of requests) {
      const played = samples.filter((sample) => sample.media?.request === request.id);
      if (!played.length) continue;
      const first = played[0];
      const { time, rate, pipeline, key, source } = first.media;
      const startMs = ms(first.wall) - time * 1000 / (pipeline === "html" ? rate : 1);
      const stopMs = Math.min(durationMs, startMs + source.duration * 1000 / rate,
        ms(request.result?.wall ?? played.at(-1).wall));
      const file = `audio/${source.dir}-${source.key}.mp3`;
      try {
        await mkdir(path.join(this.out, "film/audio"), { recursive: true });
        await writeFile(path.join(this.out, "film", file), await this.fixture.bytes(source.dir, source.key));
        clips.push({ file, startMs, stopMs, rate, pipeline, requestedKey: key, source, request: request.id, actor: request.npc,
          lineId: request.owner, text: request.text, run: request.run });
      } catch (error) {
        this.errors.push(`${file}: ${error.message}`);
      }
    }

    for (const { entry, image } of events) {
      entry.atMs = ms(entry.wall);
      const frame = nearest(entry.wall);
      if (!frame || Math.abs(frame.wall - entry.wall) > 180) {
        this.errors.push(`${entry.label} has no timely compositor frame`);
        continue;
      }
      entry.filmFrame = frame.file;
      entry.filmFrameMs = ms(frame.wall);
      if (!image) continue;
      try {
        // Keep the original compositor frame and export the chain's labelled PNG
        // from those exact pixels. The live page has finished all acting by now.
        const data = (await readFile(path.join(this.dir, frame.file))).toString("base64");
        const png = await this.page.evaluate(async (data) => {
          const bytes = Uint8Array.from(atob(data), (byte) => byte.charCodeAt(0));
          const image = await createImageBitmap(new Blob([bytes], { type: "image/jpeg" }));
          const canvas = new OffscreenCanvas(image.width, image.height);
          canvas.getContext("2d").drawImage(image, 0, 0);
          image.close();
          const blob = await canvas.convertToBlob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }, data);
        const name = `talk-natural-${this.layer}-${this.id}-${entry.label}.png`;
        const retained = path.join(this.out, "labels", name);
        await writeFile(retained, Buffer.from(png, "base64"));
        entry.image = `labels/${name}`;
        await copyFile(retained, path.join(this.shotDir, name));
      } catch (error) {
        this.errors.push(`${entry.label}: ${error.message}`);
      }
    }
    const timeline = { id: this.id, route: this.row.id, size: this.row.size, input: this.row.input, kind: this.kind, origin, durationMs, maxGapMs,
      frames: frames.map(({ file, wall }, i) => ({ file, atMs: ms(wall), endMs: ms(frames[i + 1]?.wall ?? wall) })),
      clips, events: this.row.labels, samples: samples.map((sample) => ({ ...sample, atMs: ms(sample.wall) })),
      requests: requests.map((request) => ({ ...request, atMs: ms(request.wall) })), errors: this.errors };
    await writeFile(path.join(this.dir, "timeline.json"), JSON.stringify(timeline, null, 2) + "\n");
    this.row.timeline = `film/${this.id}/timeline.json`;
    this.row.durationMs = durationMs;
    assert(!this.errors.length, this.errors.join("\n"));
    assert(frames.length >= 12 && durationMs >= 800 && maxGapMs <= 250, `continuous compositor coverage: ${frames.length} frames, ${durationMs} ms, max gap ${maxGapMs} ms`);
    assert(!requests.some(({ source }) => source.key && !source.match), "transport substitutes must stay out of film");
    if (this.row.id !== "x03-ask-the-way") assert(clips.some((clip) => clip.actor && clip.lineId != null), "matching NPC audio on the timeline");
  }
}

export async function writeFilmIndex(out, rows) {
  const segments = [];
  for (const row of rows) {
    if (!row.timeline) continue;
    const { samples, requests, ...segment } = JSON.parse(await readFile(path.join(out, row.timeline), "utf8"));
    segments.push({ ...segment, pass: row.pass });
  }
  await mkdir(path.join(out, "film"), { recursive: true });
  await writeFile(path.join(out, "film/index.json"), JSON.stringify(segments, null, 2) + "\n");
  await writeFile(path.join(out, "film/review.html"), `<!doctype html>
<html lang="en"><meta charset="utf-8"><title>Acting film</title>
<style>
body{font:16px system-ui;margin:1rem auto;max-width:80rem;padding:0 1rem}img{display:block;max-height:78vh;max-width:100%;margin-top:.5rem}
button,select,input{font:inherit}input{width:min(65vw,48rem)}#events{max-height:14rem;overflow:auto}
</style>
<h1>Acting film</h1>
<select id="segment" aria-label="Segment"></select> <button id="play">Play at 1×</button>
<input id="seek" type="range" min="0" step="1" aria-label="Time"><output id="time"></output>
<img id="frame" alt="Game capture"><p id="line"></p><div id="events"></div>
<script>
const segments = ${JSON.stringify(segments).replaceAll("<", "\\u003c")};
const el = (id) => document.getElementById(id);
const picker = el("segment"), button = el("play"), seek = el("seek"), frame = el("frame");
let segment, index, t, began = null, audio, clip;
for (const s of segments) picker.add(new Option(s.id + " · " + s.kind + (s.pass ? "" : " · check failed")));
function show(at) {
  t = Math.min(at, segment.durationMs);
  seek.value = t;
  el("time").textContent = (t / 1000).toFixed(2) + " s";
  if (t < segment.frames[index].atMs) index = 0;
  while (segment.frames[index + 1]?.atMs <= t) index++;
  const src = segment.id + "/" + segment.frames[index].file;
  if (frame.getAttribute("src") !== src) frame.src = src;
  const next = segment.clips.find((c) => c.startMs <= t && c.stopMs > t);
  if (next !== clip) {
    audio?.pause();
    clip = next;
    if (next) {
      audio = new Audio(next.file);
      audio.playbackRate = next.rate;
      audio.currentTime = Math.max(0, (t - next.startMs) / 1000 * next.rate);
      if (began !== null) audio.play().catch(() => {});
    }
  }
  el("line").textContent = next ? next.actor + " · " + next.text + " · " + next.source.key : "";
}
function pause() {
  began = null;
  audio?.pause();
  button.textContent = "Play at 1×";
}
function select() {
  pause();
  segment = segments[picker.selectedIndex];
  if (!segment?.frames.length) { frame.removeAttribute("src"); button.disabled = true; return; }
  button.disabled = false;
  clip = undefined;
  index = 0;
  seek.max = segment.durationMs;
  const events = el("events");
  events.replaceChildren();
  for (const e of segment.events.filter((e) => Number.isFinite(e.atMs))) {
    const jump = document.createElement("button");
    jump.textContent = (e.atMs / 1000).toFixed(2) + " s · " + e.label + (e.speaker ? " · " + e.speaker : "");
    jump.onclick = () => { pause(); clip = undefined; show(Math.max(0, e.atMs)); };
    events.append(jump, document.createTextNode(" "));
  }
  show(0);
}
function tick(now) {
  if (began === null) return;
  show(now - began);
  if (t >= segment.durationMs) pause();
  else requestAnimationFrame(tick);
}
picker.onchange = select;
seek.oninput = () => { pause(); clip = undefined; show(+seek.value); };
button.onclick = () => {
  if (began !== null) { pause(); return; }
  began = performance.now() - (t >= segment.durationMs ? 0 : t);
  clip = undefined;
  button.textContent = "Pause";
  requestAnimationFrame(tick);
};
select();
</script></html>\n`);
}
