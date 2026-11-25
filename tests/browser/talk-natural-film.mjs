import assert from "node:assert/strict";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const json = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + "\n");

function jpegDimensions(bytes) {
  for (let at = 2; at + 9 < bytes.length;) {
    const marker = bytes.readUInt16BE(at);
    if (marker === 0xffc0 || marker === 0xffc2) return [bytes.readUInt16BE(at + 7), bytes.readUInt16BE(at + 5)];
    at += 2 + bytes.readUInt16BE(at + 2);
  }
  throw new Error("Compositor JPEG has no frame header");
}

export class ActingFilm {
  constructor(page, context, { out, shots, row }) {
    Object.assign(this, { page, context, out, shots, row });
    this.id = [row.size, row.id, row.subcase].filter(Boolean).join("-");
    this.dir = path.join(out, "film", this.id);
    this.frames = [];
    this.writes = [];
    this.errors = [];
  }

  async start() {
    await mkdir(this.dir, { recursive: true });
    this.session = await this.context.newCDPSession(this.page);
    this.session.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
      void this.session.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
      const wall = metadata.timestamp * 1000;
      if (!Number.isFinite(wall) || wall <= (this.frames.at(-1)?.wall ?? 0)) return;
      const bytes = Buffer.from(data, "base64");
      const file = `${String(this.frames.length).padStart(5, "0")}.jpg`;
      this.frames.push({ file, wall, viewport: [metadata.deviceWidth, metadata.deviceHeight], bytes: bytes.length });
      this.writes.push(writeFile(path.join(this.dir, file), bytes).catch((error) => this.errors.push(error.message)));
    });
    await this.session.send("Page.startScreencast", { format: "jpeg", quality: 82, everyNthFrame: 1 });
  }

  async finish(samples, requests, labels, recordings) {
    if (this.session) {
      await this.session.send("Page.stopScreencast").catch((error) => this.errors.push(error.message));
      await this.session.detach().catch((error) => this.errors.push(error.message));
    }
    await Promise.all(this.writes);
    const { frames, dir, row } = this;
    const origin = frames[0]?.wall ?? samples[0]?.wall ?? null;
    const durationMs = frames.length ? frames.at(-1).wall - origin : 0;
    const frameGaps = frames.slice(1).map((frame, i) => frame.wall - frames[i].wall);
    const maxGapMs = Math.max(0, ...frameGaps);
    const nearest = (wall) => {
      let low = 0, high = frames.length - 1;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (frames[mid].wall < wall) low = mid + 1;
        else high = mid;
      }
      return low && wall - frames[low - 1].wall < frames[low].wall - wall ? low - 1 : low;
    };
    const events = {};
    const selected = path.join(dir, "selected");
    await mkdir(selected, { recursive: true });
    const mirror = this.shots && path.join(this.shots, path.basename(this.out), this.id);
    if (mirror) await mkdir(mirror, { recursive: true });
    for (const [label, sample] of Object.entries(labels)) {
      const index = nearest(sample.wall), frame = frames[index];
      const offsetMs = frame ? frame.wall - sample.wall : null;
      events[label] = { ...sample, index: frame ? index : null, file: frame?.file, offsetMs };
      if (!frame || Math.abs(offsetMs) > 180) {
        this.errors.push(`${label} has no compositor frame within 180 ms`);
        continue;
      }
      const name = `${label}.jpg`;
      await copyFile(path.join(dir, frame.file), path.join(selected, name));
      if (mirror) await copyFile(path.join(selected, name), path.join(mirror, name));
    }

    const clips = [];
    for (const request of requests) {
      const played = samples.filter((sample) => sample.media?.owner === request.id && sample.media.state === "playing"
        && sample.media.key === request.key && sample.media.time > 0);
      if (!played.length || !request.source?.file) continue;
      const first = played[0], last = played.at(-1);
      const file = `../audio/${request.key}.mp3`;
      const { rate, pipeline } = first.media;
      const offset = pipeline === "html" ? first.media.time / rate : first.media.time;
      const startMs = first.wall - origin - offset * 1000;
      const stopMs = Math.min(durationMs, (request.finished?.wall ?? last.wall) - origin);
      try {
        await mkdir(path.join(this.out, "film/audio"), { recursive: true });
        const retained = path.join(dir, file);
        const recording = recordings.get(request.key);
        if (!recording || recording.source.hash !== request.source.hash) throw new Error("No locally fulfilled recording for this request");
        if (!recording.bytes.length) throw new Error("Empty recording");
        await writeFile(retained, recording.bytes);
        clips.push({ file, startMs, stopMs, rate, pipeline, request: request.id, speaker: request.actor,
          identity: request.identity, line: request.line, lineKey: request.lineKey, key: request.key, voice: request.voice,
          speed: request.speed, text: request.text, recordedText: request.recordedText,
          firstAudible: request.audible?.first, lastAudible: request.audible?.last });
      } catch (error) {
        this.errors.push(`${request.key} · ${error.message}`);
      }
    }
    let dimensions;
    if (frames.length) {
      try { dimensions = jpegDimensions(await readFile(path.join(dir, frames[0].file))); }
      catch (error) { this.errors.push(error.message); }
    }
    const timeline = { id: this.id, route: row.id, input: row.input, layer: row.layer, dimensions, origin, durationMs,
      maxGapMs, frames: frames.map((frame) => ({ ...frame, atMs: frame.wall - origin })), events, clips, samples, requests,
      missing: requests.filter((request) => !request.source?.file), errors: this.errors };
    if (dimensions?.join("x") !== row.size || frames.length < 12 || durationMs < 800 || maxGapMs > 350) {
      this.errors.push(`Incomplete compositor capture at ${dimensions} · ${frames.length} frames, ${durationMs} ms, max gap ${maxGapMs} ms`);
    }
    for (const label of row.requiredLabels) if (!events[label]?.file) this.errors.push(`Missing film label ${label}`);
    for (const id of row.requiredVoices) {
      if (!clips.some((clip) => clip.request === id && clip.identity && clip.firstAudible != null)) {
        this.errors.push(`No matched audible film evidence for request ${id}`);
      }
    }
    if (!clips.length) this.errors.push("No matched local playback on film");
    row.timeline = `film/${this.id}/timeline.json`;
    row.review = `film/${this.id}/review.html`;
    await json(path.join(dir, "timeline.json"), timeline);
    await writeFile(path.join(dir, "review.html"), review(timeline));
    assert(!this.errors.length, this.errors.join("\n"));
  }
}

function review({ id, durationMs, origin, frames, clips, events }) {
  const data = JSON.stringify({ durationMs, origin, frames, clips, events }).replaceAll("<", "\\u003c");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>${id}</title>
<style>
body{font:16px system-ui;margin:16px}img{display:block;max-width:95vw;max-height:76vh}input{width:min(55vw,48rem)}
nav{display:flex;flex-wrap:wrap;gap:.25rem;margin:.5rem 0}button,input{font:inherit}
</style>
<h1>${id}</h1><button id="play">Play at 1×</button> <input type="range" id="seek" min="0" aria-label="Review time">
<output id="clock"></output><nav id="events"></nav><img id="view" alt="Captured game frame"><p id="actor"></p>
<script>
const data = ${data};
const byId = (id) => document.getElementById(id);
const button = byId("play"), seek = byId("seek"), image = byId("view"), line = byId("actor");
const audio = new Audio();
let index = -1, clip, time = 0, start = null, animation;
seek.max = data.durationMs;
function draw(t) {
  time = Math.max(0, Math.min(t, data.durationMs));
  seek.value = time;
  byId("clock").textContent = (time / 1000).toFixed(3) + " s";
  let low = 0, high = data.frames.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (data.frames[mid].atMs <= time) low = mid; else high = mid - 1;
  }
  if (index !== low && data.frames[low]) { index = low; image.src = data.frames[low].file; }
  const next = data.clips.find((c) => c.startMs <= time && c.stopMs > time);
  if (clip !== next) {
    audio.pause();
    clip = next;
    if (clip) { audio.src = clip.file; audio.playbackRate = clip.rate; }
  }
  if (clip) {
    const position = (time - clip.startMs) * clip.rate / 1000;
    if (Math.abs(audio.currentTime - position) > .12 || audio.paused) audio.currentTime = position;
    if (start !== null && audio.paused) audio.play().catch(() => {});
    line.textContent = [clip.speaker, clip.lineKey, clip.voice, clip.key, clip.text].filter(Boolean).join(" · ");
  } else line.textContent = "";
}
function pause() {
  start = null;
  cancelAnimationFrame(animation);
  audio.pause();
  button.textContent = "Play at 1×";
}
function tick(now) {
  if (start === null) return;
  draw(now - start);
  if (time < data.durationMs) animation = requestAnimationFrame(tick); else pause();
}
button.onclick = () => {
  if (start !== null) return pause();
  start = performance.now() - (time >= data.durationMs ? 0 : time);
  button.textContent = "Pause";
  tick(performance.now());
};
seek.oninput = () => { pause(); draw(+seek.value); };
for (const [label, event] of Object.entries(data.events)) {
  const control = document.createElement("button");
  control.textContent = label;
  control.disabled = event.index === null;
  control.title = [event.actor, event.lineKey, event.request, "frame " + event.index].filter(Boolean).join(" · ");
  control.onclick = () => { pause(); draw(data.frames[event.index].atMs); };
  byId("events").append(control);
}
draw(0);
</script></html>`;
}

export async function writeFilmIndex(out, rows) {
  await mkdir(path.join(out, "film"), { recursive: true });
  await json(path.join(out, "film", "index.json"), rows.map(({ id, subcase, size, timeline, review, pass }) =>
    ({ id, subcase, size, timeline, review, pass })));
}
