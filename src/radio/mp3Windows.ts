/** Bounded, sample-addressed Layer III input for the Web Audio book transport. */
export const MP3_RANGE_BYTES = 128 * 1024;
// This also leaves room for 320 kb/s frames, stereo preroll and 0.75× output.
export const MP3_WINDOW_SECONDS = 2.25;
const PROBE_BYTES = 8 * 1024;
const ROLL_FRAMES = 8;
const SYNTHESIS_DELAY = 529;

export class Mp3Failure extends Error {
  constructor(message: string, readonly kind: "invalid" | "unavailable" | "access" | "missing" = "invalid",
    readonly status?: number) { super(message); }
}

export type ByteRange = { start: number; end: number } | { suffix: number };

/** Reject a full response before reading it. HTTP and application buffers stay bounded even without Content-Length. */
export async function readMp3Range(fetcher: typeof fetch, url: string, range: ByteRange, signal: AbortSignal, total?: number) {
  const count = "suffix" in range ? range.suffix : range.end - range.start + 1;
  if (!Number.isSafeInteger(count) || count < 1 || count > MP3_RANGE_BYTES) throw new Mp3Failure("Invalid byte range size");
  signal.throwIfAborted();
  const response = await fetcher(url, {
    headers: { Range: "suffix" in range ? `bytes=-${count}` : `bytes=${range.start}-${range.end}` },
    signal, redirect: "error", referrerPolicy: "no-referrer",
  });
  const body = response.body;
  const status = response.status;
  const match = /^bytes (\d+)-(\d+)\/(\d+)$/i.exec(response.headers.get("Content-Range") ?? "");
  const [, start, end, size] = (match ?? []).map(Number);
  const expectedStart = "suffix" in range ? Math.max(0, size - count) : range.start;
  const expectedEnd = "suffix" in range ? size - 1 : Math.min(size - 1, range.end);
  const length = end - start + 1;
  const advertised = response.headers.get("Content-Length");
  if (signal.aborted || status !== 206 || !body || !Number.isSafeInteger(size) || size < 1 ||
      start !== expectedStart || end !== expectedEnd || length < 1 || length > count ||
      (total !== undefined && total !== size) || (advertised !== null && Number(advertised) !== length)) {
    void body?.cancel().catch(() => {});
    signal.throwIfAborted();
    throw new Mp3Failure(`Recording range failed (${status})`, status === 401 || status === 403 ? "access" :
      status === 404 ? "missing" : status === 416 || status === 206 ? "invalid" : "unavailable", status);
  }
  const bytes = new Uint8Array(length);
  const reader = body.getReader();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", cancel, { once: true });
  let offset = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      if (offset + value.length > length) throw new Mp3Failure("Oversized MP3 response");
      bytes.set(value, offset);
      offset += value.length;
    }
    if (offset !== length) throw new Mp3Failure("Truncated MP3 response");
    return { bytes, size };
  } finally {
    signal.removeEventListener("abort", cancel);
    cancel();
    reader.releaseLock();
  }
}

const MPEG1_RATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const MPEG2_RATES = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];

export function mp3Frame(bytes: Uint8Array, at = 0) {
  const a = bytes[at], b = bytes[at + 1], c = bytes[at + 2], d = bytes[at + 3];
  const version = (b >> 3) & 3, bitrateIndex = c >> 4, sampleIndex = (c >> 2) & 3;
  if (at + 4 > bytes.length || a !== 0xff || (b & 0xe6) !== 0xe2 || version === 1 ||
      bitrateIndex === 0 || bitrateIndex === 15 || sampleIndex === 3 || (d & 3) === 2) return null;
  const mpeg1 = version === 3;
  const sampleRate = [44100, 48000, 32000][sampleIndex] / (mpeg1 ? 1 : version === 2 ? 2 : 4);
  const samples = mpeg1 ? 1152 : 576;
  const bitrate = (mpeg1 ? MPEG1_RATES : MPEG2_RATES)[bitrateIndex] * 1000;
  const slots = bitrate * samples / (8 * sampleRate);
  const channels = (d >> 6) === 3 ? 1 : 2;
  const side = mpeg1 ? (channels === 1 ? 17 : 32) : (channels === 1 ? 9 : 17);
  return { sampleRate, samples, bitrate, slots, channels, length: Math.floor(slots) + ((c >> 1) & 1),
    xing: 4 + ((b & 1) ? 0 : 2) + side, version };
}

type Frame = NonNullable<ReturnType<typeof mp3Frame>>;
const compatible = (a: Frame, b: Frame) => a.version === b.version && a.sampleRate === b.sampleRate && a.channels === b.channels;
const ascii = (bytes: Uint8Array, at: number, length: number) => String.fromCharCode(...bytes.subarray(at, at + length));

export function mp3Id3End(bytes: Uint8Array): number {
  if (ascii(bytes, 0, 3) !== "ID3") return 0;
  if (bytes.length < 10 || bytes[3] < 2 || bytes[3] > 4 || bytes.subarray(6, 10).some((byte) => byte > 127)) {
    throw new Mp3Failure("Malformed ID3 header");
  }
  return 10 + (bytes[3] === 4 && (bytes[5] & 16) ? 10 : 0) +
    bytes.subarray(6, 10).reduce((size, byte) => size * 128 + byte, 0);
}

type Anchor = { frame: number; byte: number };
export function mp3SeekTag(bytes: Uint8Array, header: Frame) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = ascii(bytes, header.xing, 4);
  if (tag === "Xing" || tag === "Info") {
    if (header.xing + 8 > bytes.length) throw new Mp3Failure("Truncated Xing tag");
    const flags = view.getUint32(header.xing + 4);
    let at = header.xing + 8;
    const fields = (flags & 1 ? 4 : 0) + (flags & 2 ? 4 : 0) + (flags & 4 ? 100 : 0) + (flags & 8 ? 4 : 0);
    if (at + fields > bytes.length) throw new Mp3Failure("Truncated Xing tag");
    const frames = flags & 1 ? view.getUint32(at) : undefined;
    if (flags & 1) at += 4;
    const size = flags & 2 ? view.getUint32(at) : undefined;
    if (flags & 2) at += 4;
    const toc = flags & 4 ? bytes.slice(at, at + 100) : undefined;
    if (flags & 4) at += 100;
    if (flags & 8) at += 4;
    const encoder = ascii(bytes, at, 4);
    const gapless = at + 24 <= bytes.length && /^(LAME|Lavc|Lavf|GOGO)$/.test(encoder);
    const delay = gapless ? (bytes[at + 21] << 4) | (bytes[at + 22] >> 4) : 0;
    const padding = gapless ? ((bytes[at + 22] & 15) << 8) | bytes[at + 23] : 0;
    return { type: tag, frames, size, delay, padding, toc, anchors: undefined };
  }
  // VBRI byte counts start at the first (tag) frame and cover fixed groups of frames.
  const at = 36;
  if (ascii(bytes, at, 4) !== "VBRI") return null;
  if (at + 26 > bytes.length || view.getUint16(at + 4) !== 1) throw new Mp3Failure("Malformed VBRI tag");
  const size = view.getUint32(at + 10), frames = view.getUint32(at + 14) - 1;
  const count = view.getUint16(at + 18), scale = view.getUint16(at + 20);
  const width = view.getUint16(at + 22), stride = view.getUint16(at + 24);
  if (!count || !scale || !stride || width < 1 || width > 4 || at + 26 + count * width > bytes.length) {
    throw new Mp3Failure("Malformed VBRI seek table");
  }
  const anchors: Anchor[] = [];
  let byte = 0;
  for (let i = 0; i < count; i++) {
    let delta = 0;
    for (let j = 0; j < width; j++) delta = delta * 256 + bytes[at + 26 + i * width + j];
    byte += delta * scale;
    const frame = (i + 1) * stride - 1;
    if (!delta || byte > size) throw new Mp3Failure("Invalid VBRI offset");
    if (frame < frames) anchors.push({ frame, byte });
  }
  return { type: "VBRI", frames, size, delay: 0, padding: 0, toc: undefined, anchors };
}

export interface Mp3Window {
  bytes: ArrayBuffer;
  /** Offset of the requested PCM (including processing guards), before native decoder trimming. */
  trim: number;
  length: number;
  decodedSamples: number;
}

export class Mp3Recording {
  readonly samples: number;
  readonly sampleRate: number;
  readonly channels: number;
  private readonly anchors: Anchor[];
  private decoderTrim?: number;

  private constructor(private readonly fetcher: typeof fetch, private readonly url: string, private readonly size: number,
    private readonly start: number, private readonly end: number, private readonly header: Frame,
    private readonly frames: number, private readonly delay: number, padding: number, private readonly slot: number,
    private readonly silent: Uint8Array, private readonly toc?: Uint8Array, anchors: Anchor[] = []) {
    this.sampleRate = header.sampleRate;
    this.channels = header.channels;
    this.samples = frames * header.samples - delay - padding;
    if (this.samples <= 0) throw new Mp3Failure("Invalid gapless duration");
    this.anchors = [{ frame: 0, byte: start }, ...anchors];
  }

  static async open(fetcher: typeof fetch, url: string, signal: AbortSignal): Promise<Mp3Recording> {
    const first = await readMp3Range(fetcher, url, { start: 0, end: PROBE_BYTES - 1 }, signal);
    const offset = mp3Id3End(first.bytes);
    if (offset >= first.size) throw new Mp3Failure("Missing MP3 frames");
    const bytes = offset + 4096 <= first.bytes.length || first.bytes.length === first.size ? first.bytes.subarray(offset)
      : (await readMp3Range(fetcher, url, { start: offset, end: offset + PROBE_BYTES - 1 }, signal, first.size)).bytes;
    const head = mp3Frame(bytes);
    if (!head || head.length > bytes.length) throw new Mp3Failure("Unsupported MP3 header");
    const tag = mp3SeekTag(bytes.subarray(0, head.length), head);
    const skip = tag ? head.length : 0;
    const header = mp3Frame(bytes, skip);
    if (!header || !compatible(head, header)) throw new Mp3Failure("Missing first audio frame");
    const start = offset + skip;
    let end = first.size;
    if (tag?.size !== undefined) {
      end = offset + tag.size;
      if (end <= start || end > first.size) throw new Mp3Failure("Invalid MP3 tag byte count");
    }
    if (!tag?.size || end !== first.size) {
      const tail = await readMp3Range(fetcher, url, { start: Math.max(0, first.size - 128), end: first.size - 1 }, signal, first.size);
      const hasId3 = tail.bytes.length === 128 && ascii(tail.bytes, 0, 3) === "TAG";
      if (!tag?.size && hasId3) end -= 128;
      if (tag?.size && (!hasId3 || end !== first.size - 128)) throw new Mp3Failure("Unsupported MP3 trailer");
    }
    const fixed = tag?.type !== "Xing" && tag?.type !== "VBRI" && Number.isInteger(header.slots) &&
      header.length === header.slots && (end - start) % header.length === 0 ? header.length : 0;
    const frames = tag?.frames ?? (fixed ? (end - start) / fixed : 0);
    if (frames <= 0) throw new Mp3Failure("MP3 has no usable frame count");
    const slot = fixed && start + fixed * frames === end ? fixed : 0;
    const anchors = tag?.anchors?.map(({ frame, byte }) => ({ frame, byte: byte + offset }));
    // Zero side information makes an independent silent frame. Prime the reservoir before the
    // real preroll so a decoder starts on complete frames, even for a cut in the middle of speech.
    const primeHeader = bytes.slice(skip, skip + 4);
    primeHeader[1] |= 1; // no CRC on the synthetic frame
    let prime = mp3Frame(primeHeader)!;
    if (prime.length - prime.xing < 128) {
      primeHeader[2] = 0xe0 | (primeHeader[2] & 15);
      prime = mp3Frame(primeHeader)!;
    }
    const silent = new Uint8Array(prime.length);
    silent.set(primeHeader);
    return new Mp3Recording(fetcher, url, first.size, start, end, header, frames, tag?.delay ?? 0, tag?.padding ?? 0,
      slot, silent, tag?.toc, anchors);
  }

  async window(from: number, to: number, signal: AbortSignal): Promise<Mp3Window> {
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to > this.samples ||
        to <= from || to - from > (MP3_WINDOW_SECONDS + 0.1) * this.sampleRate) throw new Mp3Failure("Invalid PCM window");
    const { samples } = this.header;
    const wanted = from + this.delay + SYNTHESIS_DELAY;
    const first = Math.max(0, Math.floor(wanted / samples) - ROLL_FRAMES);
    const last = Math.min(this.frames, Math.ceil((wanted + to - from) / samples) + ROLL_FRAMES);
    const start = await this.byteAt(first, signal);
    const end = await this.byteAt(last, signal);
    const { bytes } = await readMp3Range(this.fetcher, this.url, { start, end: end - 1 }, signal, this.size);
    let at = 0;
    for (let frame = first; frame < last; frame++) at += this.frameAt(bytes, at).length;
    if (at !== bytes.length) throw new Mp3Failure("MP3 range does not end on a frame");
    const reservoir = this.header.version === 3 ? 511 : 255;
    const primes = Math.ceil(reservoir / (this.silent.length - mp3Frame(this.silent)!.xing)) + 1;
    const tail = last === this.frames ? 2 : 0;
    const packet = new Uint8Array((primes + tail) * this.silent.length + bytes.length);
    for (let i = 0; i < primes; i++) packet.set(this.silent, i * this.silent.length);
    packet.set(bytes, primes * this.silent.length);
    for (let i = 0; i < tail; i++) packet.set(this.silent, (primes + i) * this.silent.length + bytes.length);
    if (packet.length > MP3_RANGE_BYTES) throw new Mp3Failure("MP3 decode packet is too large");
    return { bytes: packet.buffer, trim: wanted + (primes - first) * samples, length: to - from,
      decodedSamples: (primes + last - first + tail) * samples };
  }

  /** The Xing encoder delay/padding define the chapter clock. The tagless decode packet lets us
   * measure any native leading synthesis trim once, independent of seek position. */
  trim(window: Mp3Window, decoded: Pick<AudioBuffer, "length" | "numberOfChannels" | "sampleRate">): number {
    const nativeTrim = window.decodedSamples - decoded.length;
    const offset = window.trim - nativeTrim;
    if (decoded.sampleRate !== this.sampleRate || decoded.numberOfChannels !== this.channels ||
        (nativeTrim !== 0 && nativeTrim !== SYNTHESIS_DELAY) ||
        (this.decoderTrim !== undefined && this.decoderTrim !== nativeTrim) || offset < 0 || offset + window.length > decoded.length) {
      throw new Mp3Failure("MP3 decoder could not align the source clock");
    }
    this.decoderTrim = nativeTrim;
    return offset;
  }

  private frameAt(bytes: Uint8Array, at: number): Frame {
    const frame = mp3Frame(bytes, at);
    if (!frame || !compatible(this.header, frame) || (this.slot && this.slot !== frame.length)) {
      throw new Mp3Failure("MP3 slice lost frame alignment");
    }
    return frame;
  }

  private async byteAt(target: number, signal: AbortSignal): Promise<number> {
    if (!target) return this.start;
    if (target === this.frames) return this.end;
    if (this.slot) return this.start + target * this.slot;
    const known = this.anchors.findLastIndex((point) => point.frame <= target);
    let checkpoint = known;
    let { frame, byte } = this.anchors[known];
    const next = this.anchors[known + 1]?.byte ?? this.end;
    const step = Math.max(128, Math.ceil(this.frames / 1024));
    // Xing percentages are approximate. Use them to size the read, then count whole
    // frames from an exact checkpoint. A cold VBR seek may need several bounded reads.
    const tocByte = this.toc && this.start + Math.ceil(this.toc[Math.min(99, Math.ceil(target * 100 / this.frames))] * (this.end - this.start) / 256);
    while (frame < target) {
      const length = Math.min(MP3_RANGE_BYTES, next - byte, Math.max(PROBE_BYTES, (tocByte ?? next) - byte));
      if (length < 4) throw new Mp3Failure("MP3 seek table ended early");
      const { bytes } = await readMp3Range(this.fetcher, this.url, { start: byte, end: byte + length - 1 }, signal, this.size);
      let at = 0;
      while (frame < target && at + 4 <= bytes.length) {
        const header = this.frameAt(bytes, at);
        if (at + header.length > bytes.length) break;
        at += header.length;
        frame++;
        if (frame % step === 0) this.anchors.splice(++checkpoint, 0, { frame, byte: byte + at });
      }
      if (!at) throw new Mp3Failure("Truncated MP3 frame in seek table");
      byte += at;
    }
    return byte;
  }
}
