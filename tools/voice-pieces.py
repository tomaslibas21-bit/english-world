#!/usr/bin/env python3
"""Hears voice clips for the repeat check (tools/voice-pieces.ts, docs/VOICING-PLAN.md "Repeats"): each clip whole and
again piece by piece, cut at its inner pauses, because a recognizer that hears a whole clip tends to write a restart
once ("Would you like your… would you like your receipt printed or emailed?" scored 1.0 with Whisper). It also
compares the clip's sound with itself: a phrase said twice shows as a stripe beside the diagonal of the
self-similarity matrix, whatever a recognizer writes.

  python3 tools/voice-pieces.py JOBS.jsonl OUT.jsonl [--engine=parakeet|whisper|none] [--lang=en] [--procs=3] [--threads=4]

JOBS rows: {"key", "path"} (mp3, or a 16 kHz mono WAV, which is read directly). OUT rows are appended, and keys
already there are skipped, so a long run can be stopped and started again:
  {"key", "sec", "engine", "pauses": [[from_ms, to_ms]…], "whole": text, "words": [[word, start_s]…],
   "pieces": [[from_ms, to_ms, text]…], "stripe": {"ms", "moving", "sim", "at": [first_ms, again_ms]}}

Engines:
  parakeet  nvidia/parakeet-tdt-0.6b-v3 through sherpa-onnx (English and Spanish; writes what it hears, word for
            word). Needs the Python package sherpa_onnx (PYTHONPATH, or ~/models/pylib) and the model folder
            ~/models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8/ (PARAKEET to change it), from
            github.com/k2-fsa/sherpa-onnx/releases (asr-models).
  whisper   whisper-cli with WHISPER_MODEL (large-v3-turbo): on the GPU, so it keeps its pace when the processor is
            busy, but it writes a short piece's words twice now and then; the judge folds those (onceInARow), which
            hides a one-word repeat. Use it as a second opinion, or when Parakeet isn't installed.
  none      only the pauses and the stripe (no recognizer): a fast first screen.
Needs numpy and ffmpeg.
"""
import json
import multiprocessing as mp
import os
import subprocess
import sys
import tempfile
import time
import wave
from concurrent.futures import ThreadPoolExecutor

import numpy as np

PYLIB = os.path.expanduser("~/models/pylib")
PARAKEET = os.environ.get("PARAKEET", os.path.expanduser("~/models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8/"))
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", os.path.expanduser("~/english-world/voicing/models/ggml-large-v3-turbo-q5_0.bin"))
SR = 16000
HOP = SR // 100  # 10 ms frames
PAUSE_DB = -38.0  # a frame this far under the clip's loud level (95th percentile of the 10 ms RMS) is quiet
PAUSE_MS = 80  # an inner pause at least this long cuts the clip into pieces
MIN_PIECE_MS = 250  # a shorter piece joins its neighbour
PAD = np.zeros(SR // 10, np.float32)  # 100 ms of silence around what a recognizer hears


def decode(path):
    if path.endswith(".wav"):
        try:
            with wave.open(path) as w:
                if w.getframerate() == SR and w.getnchannels() == 1 and w.getsampwidth() == 2:
                    return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        except wave.Error:
            pass
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


# ------------------------------------------------------------------ pauses and pieces

def pauses(x, pause_ms=None):
    """Inner quiet stretches of pause_ms or more, as sample ranges."""
    pause_ms = PAUSE_MS if pause_ms is None else pause_ms
    n = len(x) // HOP
    if n < 3:
        return []
    e = np.sqrt(np.mean(x[: n * HOP].reshape(n, HOP) ** 2, axis=1) + 1e-12)
    quiet = 20 * np.log10(e / np.percentile(e, 95) + 1e-12) < PAUSE_DB
    loud = np.nonzero(~quiet)[0]
    if not len(loud):
        return []
    first, last = int(loud[0]), int(loud[-1])
    out, i = [], first
    while i <= last:
        if quiet[i]:
            j = i
            while j <= last and quiet[j]:
                j += 1
            if (j - i) * 10 >= pause_ms:
                out.append((i * HOP, j * HOP))
            i = j
        else:
            i += 1
    return out


def pieces_of(x, ps):
    """The clip cut in the middle of each pause; a piece under MIN_PIECE_MS joins the next one (the last: the one
    before)."""
    cuts = [0] + [(a + b) // 2 for a, b in ps] + [len(x)]
    short = MIN_PIECE_MS * SR // 1000
    merged = []
    for a, b in zip(cuts, cuts[1:]):
        if merged and merged[-1][1] - merged[-1][0] < short:
            merged[-1][1] = b
        else:
            merged.append([a, b])
    if len(merged) > 1 and merged[-1][1] - merged[-1][0] < short:
        last = merged.pop()
        merged[-1][1] = last[1]
    return merged


# ------------------------------------------------------------------ the sound against itself

WIN, NFFT, NMEL, NCEP = 400, 512, 26, 13
MIN_LAG = 12  # frames: a repeat starts at least 120 ms after its first time
SLACK = 3  # frames a stripe may wander from its lag (the second time is a little faster or slower)
TAU = 0.55  # a frame pair this alike (cosine of mean-normalized cepstra and their deltas) can be part of a stripe


def _mel_bank():
    mel = lambda f: 2595 * np.log10(1 + f / 700)
    inv = lambda m: 700 * (10 ** (m / 2595) - 1)
    bins = np.floor((NFFT + 1) * inv(np.linspace(mel(100), mel(7000), NMEL + 2)) / SR).astype(int)
    fb = np.zeros((NMEL, NFFT // 2 + 1), np.float32)
    for m in range(1, NMEL + 1):
        a, b, c = bins[m - 1], bins[m], bins[m + 1]
        for k in range(a, b):
            fb[m - 1, k] = (k - a) / max(1, b - a)
        for k in range(b, c):
            fb[m - 1, k] = (c - k) / max(1, c - b)
    return fb


FB = _mel_bank()
DCT = np.array([[np.cos(np.pi * k * (2 * n + 1) / (2 * NMEL)) for n in range(NMEL)] for k in range(1, NCEP)], np.float32)
HANN = np.hanning(WIN).astype(np.float32)


def stripe(x):
    """The clip's longest stretch that sounds like an earlier stretch: {"ms", "moving", "sim", "at"}. `moving` counts
    the stripe's frames by how much the sound changes in them against the clip's usual change (a held vowel is like
    itself at any lag and counts little): about 450 moving ms or more is a phrase said twice."""
    none = {"ms": 0, "moving": 0, "sim": 0.0, "at": [0, 0]}
    if len(x) < WIN + (MIN_LAG + 20) * HOP:
        return none
    x = np.append(x[0], x[1:] - 0.97 * x[:-1])
    n = 1 + (len(x) - WIN) // HOP
    frames = x[np.arange(WIN)[None, :] + HOP * np.arange(n)[:, None]] * HANN
    energy = np.sqrt(np.mean(frames ** 2, axis=1) + 1e-12)
    speech = 20 * np.log10(energy / np.percentile(energy, 95) + 1e-12) > -30
    if speech.sum() < MIN_LAG + 20:
        return none
    cep = np.log((np.abs(np.fft.rfft(frames, NFFT)) ** 2) @ FB.T + 1e-8) @ DCT.T
    cep = cep - cep[speech].mean(axis=0)
    d = np.zeros_like(cep)
    d[1:-1] = (cep[2:] - cep[:-2]) / 2
    f = np.hstack([cep, 2.0 * d])
    f /= np.linalg.norm(f, axis=1, keepdims=True) + 1e-8
    move = np.linalg.norm(d, axis=1)
    move = np.minimum(move / (np.median(move[speech]) + 1e-8), 3.0)
    s = f @ f.T
    s[~speech, :] = 0
    s[:, ~speech] = 0
    diags = [np.diagonal(s, lag) for lag in range(n)]
    best = (0.0, 0, 0.0, 0, 0)  # moving frames, frames, similarity, first start, second start
    for lag in range(MIN_LAG, n - 15):
        m = n - lag - SLACK
        if m < 15:
            break
        band = np.max(np.stack([diags[l][:m] for l in range(lag - SLACK, lag + SLACK + 1)]), axis=0)
        ok = band > TAU
        i = 0
        while i < m:
            if not ok[i]:
                i += 1
                continue
            j, gap, last = i, 0, i
            while j < m and gap <= 3:  # a stripe goes on over gaps of up to 3 frames
                if ok[j]:
                    last, gap = j, 0
                else:
                    gap += 1
                j += 1
            length = min(last - i + 1, lag + SLACK)  # the two times don't overlap
            weight = float(np.minimum(move[i:i + length], move[i + lag:i + lag + length]).sum())
            if weight > best[0]:
                best = (weight, length, float(band[i:i + length].mean()), i, i + lag)
            i = last + 1
    return {"ms": best[1] * 10, "moving": int(best[0] * 10), "sim": round(best[2], 3), "at": [best[3] * 10, best[4] * 10]}


# ------------------------------------------------------------------ the recognizers

def _row(key, x, engine):
    ps = pauses(x)
    spans = pieces_of(x, ps)
    ms = lambda v: int(v) * 1000 // SR
    return {"key": key, "sec": round(len(x) / SR, 3), "engine": engine, "pauses": [[ms(a), ms(b)] for a, b in ps],
            "whole": "", "words": [], "pieces": [[ms(a), ms(b), ""] for a, b in spans], "stripe": stripe(x)}, spans


def _words(result):
    words = []
    for tok, t in zip(result.tokens, result.timestamps):
        if tok.startswith(" ") or not words:
            words.append([tok.strip(), round(float(t) - 0.1, 2)])
        else:
            words[-1][0] += tok
    return [w for w in words if w[0]]


def _parakeet(threads):
    sys.path.insert(0, PYLIB)
    try:
        import sherpa_onnx
    except ImportError:
        sys.exit("voice-pieces.py: no sherpa_onnx Python package (see the top of this file)")
    if not os.path.exists(PARAKEET + "/encoder.int8.onnx"):
        sys.exit(f"voice-pieces.py: no Parakeet model in {PARAKEET} (see the top of this file)")
    m = PARAKEET.rstrip("/") + "/"
    return sherpa_onnx.OfflineRecognizer.from_transducer(
        encoder=m + "encoder.int8.onnx", decoder=m + "decoder.int8.onnx", joiner=m + "joiner.int8.onnx",
        tokens=m + "tokens.txt", model_type="nemo_transducer", num_threads=threads)


def _write_wav(path, x):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def worker(args):
    shard, out_path, engine, lang, threads = args
    rec = _parakeet(threads) if engine == "parakeet" else None
    pool = ThreadPoolExecutor(max_workers=3)
    size = {"parakeet": 16, "whisper": 60, "none": 64}[engine]
    done = 0
    with open(out_path, "a") as out:
        for start in range(0, len(shard), size):
            part = shard[start:start + size]
            audio = list(pool.map(lambda j: decode(j["path"]), part))
            rows, spans = zip(*[_row(j["key"], x, engine) for j, x in zip(part, audio)])
            # what is heard: every clip whole (k = -1) and, when it has more than one piece, each piece
            heard = [(i, -1, x) for i, x in enumerate(audio)]
            heard += [(i, k, x[a:b]) for i, x in enumerate(audio) if len(spans[i]) > 1 for k, (a, b) in enumerate(spans[i])]
            texts = [""] * len(heard)
            if engine == "parakeet":
                streams = []
                for _, _, x in heard:
                    s = rec.create_stream()
                    s.accept_waveform(SR, np.concatenate([PAD, x, PAD]))
                    streams.append(s)
                rec.decode_streams(streams)
                texts = [" ".join(s.result.text.split()) for s in streams]
                for (i, k, _), s in zip(heard, streams):
                    if k < 0:
                        rows[i]["words"] = _words(s.result)
            elif engine == "whisper":
                with tempfile.TemporaryDirectory() as tmp:
                    names = [f"{tmp}/{n:04d}.wav" for n in range(len(heard))]
                    for name, (_, _, x) in zip(names, heard):
                        _write_wav(name, np.concatenate([PAD, PAD, x, PAD, PAD]))
                    # a 10-second window for short ones (about twice as fast), the full window for the rest
                    short = [n for n, h in zip(names, heard) if len(h[2]) <= 9 * SR]
                    for group, extra in ((short, ["-ac", "512"]), ([n for n in names if n not in set(short)], [])):
                        if group:
                            subprocess.run(["whisper-cli", "-m", WHISPER_MODEL, "-l", lang, "-nt", "-np", "-otxt", "-t", "4",
                                            *extra, *group], check=True, capture_output=True)
                    texts = [" ".join(open(n + ".txt").read().split()) if os.path.exists(n + ".txt") else "" for n in names]
            for (i, k, _), text in zip(heard, texts):
                if k < 0:
                    rows[i]["whole"] = text
                else:
                    rows[i]["pieces"][k][2] = text
            for r in rows:
                if len(r["pieces"]) == 1:
                    r["pieces"][0][2] = r["whole"]
                out.write(json.dumps(r, ensure_ascii=False) + "\n")
            out.flush()
            done += len(part)
    return done


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    jobs_path, out_path = sys.argv[1], sys.argv[2]
    opt = dict(a[2:].split("=", 1) for a in sys.argv[3:] if a.startswith("--") and "=" in a)
    engine, lang = opt.get("engine", "parakeet"), opt.get("lang", "en")
    procs, threads = int(opt.get("procs", 1 if engine == "whisper" else 3)), int(opt.get("threads", 4))
    if engine not in ("parakeet", "whisper", "none"):
        sys.exit(f"voice-pieces.py: no engine {engine}")
    if engine == "parakeet":
        _parakeet(1)  # fails here, with the reason, when Parakeet isn't installed
    if engine == "whisper" and not os.path.exists(WHISPER_MODEL):
        sys.exit(f"voice-pieces.py: no Whisper model at {WHISPER_MODEL} (set WHISPER_MODEL)")
    jobs = [json.loads(l) for l in open(jobs_path) if l.strip()]
    shards_done = [out_path] + [f"{out_path}.{i}" for i in range(64)]
    seen = set()
    for p in shards_done:
        if os.path.exists(p):
            for l in open(p):
                try:
                    seen.add(json.loads(l)["key"])
                except ValueError:
                    pass
    todo = [j for j in jobs if j["key"] not in seen]
    print(f"{len(jobs)} clips, {len(todo)} to hear ({engine})", flush=True)
    t0 = time.time()
    shards = [todo[i::procs] for i in range(procs)]
    with mp.get_context("spawn").Pool(procs) as p:
        n = sum(p.map(worker, [(s, f"{out_path}.{i}", engine, lang, threads) for i, s in enumerate(shards)]))
    with open(out_path, "a") as out:  # the shards' rows into OUT
        for p in shards_done[1:]:
            if os.path.exists(p):
                out.write(open(p).read())
                os.remove(p)
    print(f"heard {n} in {time.time() - t0:.0f} s", flush=True)


if __name__ == "__main__":
    main()
