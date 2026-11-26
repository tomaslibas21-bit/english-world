/** Waveform-similarity overlap-add. All offsets and lengths are PCM samples, per channel. */
export const TEMPO_GUARD_SECONDS = 0.035;
export interface SpeechWindow {
  channels: Float32Array<ArrayBuffer>[];
  sampleRate: number;
  /** First source sample of the output span within channels, following the lookbehind. */
  start: number;
  length: number;
  outputLength: number;
  rate: number;
  join: boolean;
}

export class SpeechTempo {
  private overlap?: Float32Array[];

  stretch(input: SpeechWindow): Float32Array<ArrayBuffer>[] {
    const { channels, sampleRate, start, length, outputLength, rate, join } = input;
    if (rate === 1) {
      this.overlap = undefined;
      return channels.map((channel) => channel.slice(start, start + length));
    }
    const hop = Math.round(sampleRate * 0.012);
    const search = Math.round(sampleRate * 0.01);
    const stride = Math.max(1, Math.floor(sampleRate / 8000));
    const prior = join && this.overlap?.length === channels.length && this.overlap[0]?.length === hop ? this.overlap : undefined;
    const tail = prior ?? channels.map(() => new Float32Array(hop));
    const output = channels.map(() => new Float32Array(outputLength));
    const read = (channel: Float32Array, at: number) => channel[at] ?? 0;
    let hasTail = !!prior;
    for (let out = 0; out < outputLength;) {
      const count = Math.min(hop, outputLength - out);
      // Anchor each search to source time. A local pitch match never accumulates drift.
      const nominal = start + Math.round(out * rate);
      let best = nominal;
      if (hasTail) {
        let bestScore = -Infinity;
        const lo = Math.max(0, nominal - search);
        const hi = Math.min(start + length - 1, nominal + search, channels[0].length - count);
        for (let candidate = lo; candidate <= hi; candidate += stride) {
          let dot = 0, energy = 0, tailEnergy = 0;
          for (let i = 0; i < count; i += stride) {
            for (let ch = 0; ch < channels.length; ch++) {
              const a = tail[ch][i], b = read(channels[ch], candidate + i);
              dot += a * b;
              energy += b * b;
              tailEnergy += a * a;
            }
          }
          const score = dot / Math.sqrt(energy * tailEnergy + 1e-12) - 0.02 * Math.abs(candidate - nominal) / search;
          if (score > bestScore) { bestScore = score; best = candidate; }
        }
      }
      for (let ch = 0; ch < channels.length; ch++) {
        const source = channels[ch];
        for (let i = 0; i < count; i++) {
          const gain = hasTail ? i / hop : 1;
          output[ch][out + i] = tail[ch][i] * (1 - gain) + read(source, best + i) * gain;
        }
        for (let i = 0; i < hop; i++) {
          // If the window lands between hops, carry the rest of the actual crossfade.
          const phase = count + i;
          const next = read(source, best + phase);
          const gain = hasTail ? Math.min(1, phase / hop) : 1;
          tail[ch][i] = (tail[ch][phase] ?? 0) * (1 - gain) + next * gain;
        }
      }
      hasTail = true;
      out += count;
    }
    this.overlap = tail;
    return output;
  }
}

// A module worker on ordinary HTTP. The browser transfers typed arrays without shared memory.
if (typeof self !== "undefined" && typeof document === "undefined" && typeof self.postMessage === "function") {
  const tempo = new SpeechTempo();
  const port = self as unknown as {
    onmessage: (event: MessageEvent<SpeechWindow>) => void;
    postMessage: (data: Float32Array<ArrayBuffer>[], transfer: ArrayBuffer[]) => void;
  };
  port.onmessage = ({ data }) => {
    const output = tempo.stretch(data);
    port.postMessage(output, output.map((channel) => channel.buffer));
  };
}
