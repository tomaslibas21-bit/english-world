/** Pitch-preserving offline slowdown for short recorded speech. Independent WSOLA-style code:
 * Roelands & Verhelst (1993), https://www.isca-archive.org/eurospeech_1993/roelands93_eurospeech.html
 * No resampling: copy waveform grains at their original sample spacing, align overlapping
 * waveforms by normalized correlation, then normalize positive overlap weights. One alignment
 * serves every channel (including opposite-phase stereo). Production uses rate=.82.
 *
 * Allocates output channels plus one output-sized weight array; the search uses no per-grain
 * PCM allocations and at most ~160 samples per correlation. Call once after decode and cache the
 * result. This synchronous helper has no playback/cancellation state; callers discard stale work.
 */
export function stretchSpeech(channels: readonly Float32Array[], sampleRate: number, rate = 0.82): Float32Array[] {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 96000) throw new RangeError("Unsupported speech sample rate");
  if (!Number.isFinite(rate) || rate < 0.5 || rate > 1) throw new RangeError("Speech slowdown must be between .5 and 1");
  if (!channels.length) return [];
  if (channels.length > 2) throw new RangeError("Recorded speech must be mono or stereo");
  const length = channels[0].length;
  if (channels.some(c => c.length !== length)) throw new RangeError("Speech channels must have equal lengths");
  const outputLength = Math.round(length / rate);
  // Bound synchronous work and keep working PCM below ~96MB (stereo + weights).
  if (length > sampleRate * 60 || outputLength > 8_000_000) throw new RangeError("Speech clip is too long to stretch offline");
  const peaks = channels.map(c => {
    let peak = 0;
    for (let i = 0; i < c.length; i++) {
      if (!Number.isFinite(c[i])) throw new RangeError("Speech PCM must be finite");
      peak = Math.max(peak, Math.abs(c[i]));
    }
    return peak;
  });
  if (rate === 1) return channels.map(c => c.slice());
  const output = channels.map(() => new Float32Array(outputLength));
  if (!length) return output;
  const hop = Math.max(1, Math.round(sampleRate * 0.02));
  const grain = 2 * hop;
  if (length < grain) {
    // A sub-40ms burst has too little periodic context to align reliably. Preserve its samples
    // and pitch intact, adding silence rather than resampling or duplicating the transient.
    const pad = Math.floor((outputLength - length) / 2);
    channels.forEach((c, i) => output[i].set(c, pad));
    return output;
  }
  const weights = new Float32Array(outputLength);
  const window = Float32Array.from({ length: grain }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * (i + 0.5) / grain));
  // Choose energy, rather than summing channels: opposite-phase stereo must not cancel the search.
  let referenceChannel = 0, maxEnergy = -1;
  for (let c = 0; c < channels.length; c++) {
    let energy = 0;
    for (let i = 0; i < length; i += Math.max(1, Math.floor(length / 4096))) energy += channels[c][i] ** 2;
    if (energy > maxEnergy) { referenceChannel = c; maxEnergy = energy; }
  }
  const input = channels[referenceChannel];
  const seek = Math.round(sampleRate * 0.01);
  const stride = Math.max(1, Math.floor(hop / 128));
  const coarse = Math.max(1, Math.round(sampleRate / 4000));
  function align(expected: number, previous: number): number {
    const center = Math.max(0, Math.min(length - grain, expected));
    const lo = Math.max(0, center - seek), hi = Math.min(length - grain, center + seek);
    const reference = previous + hop;
    let referenceEnergy = 0;
    for (let i = 0; i < hop; i += stride) referenceEnergy += input[reference + i] ** 2;
    if (referenceEnergy < 1e-10) return center;
    let best = center, bestScore = -Infinity;
    const score = (at: number) => {
      let dot = 0, energy = 0;
      for (let i = 0; i < hop; i += stride) {
        const v = input[at + i]; dot += v * input[reference + i]; energy += v * v;
      }
      // A tiny distance preference prevents arbitrary drift for equally periodic candidates.
      const value = dot / Math.sqrt(Math.max(1e-20, referenceEnergy * energy)) - 0.0001 * Math.abs(at - center) / Math.max(1, seek);
      if (value > bestScore) { bestScore = value; best = at; }
    };
    score(center);
    for (let at = lo; at <= hi; at += coarse) score(at);
    const coarseBest = best;
    for (let at = Math.max(lo, coarseBest - coarse); at <= Math.min(hi, coarseBest + coarse); at++) score(at);
    return best;
  }
  function add(source: number, destination: number) {
    for (let i = 0; i < grain; i++) {
      const w = window[i]; weights[destination + i] += w;
      for (let c = 0; c < channels.length; c++) output[c][destination + i] += channels[c][source + i] * w;
    }
  }
  add(0, 0);
  let previous = 0;
  const finalStart = outputLength - grain;
  for (let destination = hop; destination < finalStart; destination += hop) {
    previous = align(Math.round(destination * rate), previous);
    add(previous, destination);
  }
  // Anchor the final waveform to the actual source ending: no lost final consonant or padded tail.
  if (finalStart > 0) add(length - grain, finalStart);
  for (let c = 0; c < output.length; c++) for (let i = 0; i < outputLength; i++) {
    output[c][i] = weights[i] ? Math.max(-peaks[c], Math.min(peaks[c], output[c][i] / weights[i])) : 0;
  }
  return output;
}
