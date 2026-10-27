// Shared by the voice builders (tools/build-audio.ts: Kokoro, tools/voice-batch.ts: Gemini).
import { spawn } from "node:child_process";

/** Spelling the TTS reads better (the visible text is unchanged). */
export function ttsText(s: string): string {
  return s
    .replace(/\bMr\.\s/g, "Mister ").replace(/\bMrs\.\s/g, "Missus ").replace(/\bMs\.\s/g, "Miz ").replace(/\bDr\.\s/g, "Doctor ")
    .replace(/\bATM\b/g, "A T M").replace(/\bTSA\b/g, "T S A").replace(/\bID\b/g, "I D").replace(/\bIDs\b/g, "I Ds")
    .replace(/\bPIN\b/g, "pin").replace(/\bOK\b/g, "okay").replace(/\bUSPS\b/g, "U S P S").replace(/\bUS\b/g, "U S")
    .replace(/\ba\.m\./gi, "A M").replace(/\bp\.m\./gi, "P M").replace(/&/g, " and ").replace(/#(\d)/g, "number $1")
    .replace(/[“”„]/g, "\"").replace(/…/g, "...").replace(/—/g, ", ").replace(/\s+/g, " ").trim();
}

export function trimAndNormalize(samples: Float32Array, sr: number): Float32Array {
  const thr = 0.012;
  let a = 0, b = samples.length - 1;
  while (a < b && Math.abs(samples[a]) < thr) a++;
  while (b > a && Math.abs(samples[b]) < thr) b--;
  const pad = Math.round(sr * 0.06);
  a = Math.max(0, a - pad); b = Math.min(samples.length - 1, b + Math.round(sr * 0.12));
  const cut = samples.slice(a, b + 1);
  let peak = 0, sum = 0;
  for (const v of cut) { peak = Math.max(peak, Math.abs(v)); sum += v * v; }
  const rms = Math.sqrt(sum / Math.max(1, cut.length));
  const targetRms = Math.pow(10, -19 / 20);
  const scale = Math.min(targetRms / Math.max(rms, 1e-6), 0.89 / Math.max(peak, 1e-6));
  for (let i = 0; i < cut.length; i++) cut[i] *= scale;
  return cut;
}

export function encodeMp3(samples: Float32Array, sr: number, file: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "f32le", "-ar", String(sr), "-ac", "1", "-i", "pipe:0", "-b:a", "32k", "-ar", "24000", "-ac", "1", file]);
    ff.on("error", reject);
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error("ffmpeg exited " + code))));
    ff.stdin.write(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength));
    ff.stdin.end();
  });
}


/** Spelling for Gemini, which reads abbreviations well on its own; it treats the text as a verbatim transcript, and
 *  angle brackets would be read as sound tags (<laugh>). */
export function geminiText(s: string): string {
  return s
    .replace(/[<>]/g, "").replace(/&/g, " and ").replace(/#(\d)/g, "number $1")
    .replace(/[“”„]/g, "\"").replace(/…/g, "...").replace(/\s*—\s*/g, ", ").replace(/\s+/g, " ").trim();
}

/** Gemini's audio: WAV (a RIFF header) or raw 16-bit PCM ("audio/L16;codec=pcm;rate=24000"), as float samples. */
export function decodeAudio(bytes: Buffer, mime = ""): { samples: Float32Array; rate: number } {
  let rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000), data = bytes, bits = 16, channels = 1;
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WAVE") {
    data = Buffer.alloc(0);
    for (let off = 12; off + 8 <= bytes.length;) {
      const id = bytes.toString("ascii", off, off + 4), size = bytes.readUInt32LE(off + 4);
      if (id === "fmt ") { channels = bytes.readUInt16LE(off + 10); rate = bytes.readUInt32LE(off + 12); bits = bytes.readUInt16LE(off + 22); }
      if (id === "data") { data = bytes.subarray(off + 8, Math.min(bytes.length, off + 8 + size)); break; } // a streamed WAV says 0xffffffff
      off += 8 + size + (size % 2);
    }
  }
  if (bits !== 16) throw new Error(`${bits}-bit audio`);
  const n = Math.floor(data.length / 2 / channels);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) samples[i] = data.readInt16LE(i * 2 * channels) / 32768;
  return { samples, rate };
}

/** One clip in two files: the MP3 the game plays (CBR, mono, 24 kHz) and a 16 kHz WAV for Whisper to check. */
export function encodeClip(samples: Float32Array, sr: number, mp3: string, wav16: string, kbps = 40): Promise<void> {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "f32le", "-ar", String(sr), "-ac", "1", "-i", "pipe:0",
      "-map", "0", "-b:a", `${kbps}k`, "-ar", "24000", "-ac", "1", "-f", "mp3", mp3,
      "-map", "0", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", "-f", "wav", wav16]);
    ff.on("error", reject);
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error("ffmpeg exited " + code))));
    ff.stdin.write(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength));
    ff.stdin.end();
  });
}
