import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { MP3_RANGE_BYTES, MP3_WINDOW_SECONDS, Mp3Recording } from "../../src/radio/mp3Windows";
import { rangeFetcher } from "../fixtures/book-audio";

export function spanishBookWindowsTests(profile: "sme-en" | "sm-lt") {
  const derived = resolve(process.env.BOOK_REVIEW_AUDIO_ROOT ?? ".b8/review/derived");
  const paired = resolve(process.env.BOOK_REVIEW_PAIRED_ROOT ?? ".b8/review/paired");
  const paths = [
    { language: "Spanish", path: resolve(derived, profile, "english", "BK01-01.mp3") },
    { language: profile === "sme-en" ? "English" : "Lithuanian",
      path: resolve(derived, profile, "lithuanian", "BK01-02.mp3") },
    { language: "paired", path: resolve(paired, profile === "sme-en" ? "EN-ES" : "LT-ES", "BK01-01.mp3") },
  ];
  const ffmpegAvailable = spawnSync("ffmpeg", ["-version"]).status === 0;
  for (const { language, path } of paths) {
    it.skipIf(!existsSync(path) || !ffmpegAvailable)(
      `aligns ${profile} ${language} review MP3 windows with continuous speech at start, middle, seam and end`,
      async () => {
        const data = readFileSync(path);
        const signal = new AbortController().signal;
        const recording = await Mp3Recording.open(rangeFetcher(data), "/review.mp3", signal);
        const decode = (bytes: Uint8Array, from?: number, to?: number) => {
          const trim = from === undefined ? [] : ["-af", `atrim=start_sample=${from}:end_sample=${to}`];
          const result = spawnSync("ffmpeg", ["-v", "error", "-f", "mp3", "-i", "pipe:0", ...trim, "-f", "f32le", "pipe:1"],
            { input: bytes, maxBuffer: 4 * 1024 * 1024 });
          expect(result.stderr.toString()).toBe("");
          expect(result.status).toBe(0);
          return new Float32Array(Uint8Array.from(result.stdout).buffer);
        };
        const step = Math.round(recording.sampleRate * MP3_WINDOW_SECONDS);
        const middle = Math.floor(recording.samples / 2);
        for (const from of [0, middle, middle + step, recording.samples - 19123]) {
          const window = await recording.window(from, Math.min(recording.samples, from + step), signal);
          expect(window.bytes.byteLength).toBeLessThan(MP3_RANGE_BYTES);
          const pcm = decode(new Uint8Array(window.bytes));
          const offset = recording.trim(window, {
            sampleRate: recording.sampleRate, numberOfChannels: recording.channels, length: pcm.length / recording.channels,
          });
          const reference = decode(data, from, from + window.length);
          expect(reference.length).toBe(window.length * recording.channels);
          let error = 0;
          for (let i = 0; i < reference.length; i++) {
            error = Math.max(error, Math.abs(pcm[offset * recording.channels + i] - reference[i]));
          }
          expect(error).toBeLessThan(0.0001);
        }
      }, 30_000,
    );
  }
}
