/** A silent recording of length seconds (8-bit mono PCM in a WAV file). */
export function silence(length, rate = 8000) {
  const n = Math.round(length * rate), wav = Buffer.alloc(44 + n, 128);
  wav.write("RIFF", 0); wav.writeUInt32LE(36 + n, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate, 28); wav.writeUInt16LE(1, 32); wav.writeUInt16LE(8, 34); wav.write("data", 36); wav.writeUInt32LE(n, 40);
  return wav;
}
