#!/usr/bin/env python3
"""Cuts a restart out of a voice clip (docs/VOICING-PLAN.md "Repeats"): "Would you like your… would you like your
receipt printed or emailed?" loses its first attempt and the pause after it, and the complete attempt stays.

A restart begins where speech begins: at the clip's start or after a pause. So the cut is looked for among the
clip's onsets: two onsets whose following sound is alike (the same words begun twice). Everything from the first of
them up to the second is removed, so the join is a pause meeting an onset, as it was before. No recognizer is asked:
the clip is heard again afterwards (tools/voice-pieces.py) and kept only when the repeat is gone.

  python3 tools/voice-cut.py JOBS.jsonl OUT_DIR [--kbps=64] [--procs=4] [--pick=1]

--pick=2 takes the second-best pair of onsets (3: the third), for a clip whose first cut didn't hold when heard.

JOBS rows: {"key", "path"} (the MP3; "mp3" names it when "path" is a WAV copy). For each clip with a cut: OUT_DIR/<key>.mp3 (CBR, mono, 24 kHz; 64 kbps by default,
because the source is an MP3 already) and a row in OUT_DIR/cuts.jsonl:
  {"key", "cuts": [[from_ms, to_ms]…], "alike": [similarity…], "sec_before", "sec"}; no cut found: {"key", "cuts": []}.
Needs numpy, scipy and ffmpeg.
"""
import importlib.util
import json
import os
import subprocess
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("voice_pieces", os.path.join(HERE, "voice-pieces.py"))
VP = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(VP)

SR = VP.SR  # the analysis runs at 16 kHz; the cut is made in the clip's own 24 kHz
OUT_SR = 24000
ONSET_PAUSE_MS = 60  # a pause this long before speech makes an onset
MIN_ALIKE_MS = 180  # the two onsets' sound must be alike for at least this long (moving ms, see voice-pieces.py)
ALIKE = 0.62  # … with this mean similarity
LEAD_MS = 25  # silence kept before the onset the clip continues from
FADE_MS = 5
START = 30  # frames the second attempt may run ahead of or behind the first
DRIFT = 3  # frames a stretch may wander from its lag


def features(x):
    """Unit cepstra+delta vectors per 10 ms frame, the speech mask and each frame's movement (as in VP.stripe)."""
    x = np.append(x[0], x[1:] - 0.97 * x[:-1])
    n = 1 + (len(x) - VP.WIN) // VP.HOP
    frames = x[np.arange(VP.WIN)[None, :] + VP.HOP * np.arange(n)[:, None]] * VP.HANN
    energy = np.sqrt(np.mean(frames ** 2, axis=1) + 1e-12)
    speech = 20 * np.log10(energy / np.percentile(energy, 95) + 1e-12) > -30
    cep = np.log((np.abs(np.fft.rfft(frames, VP.NFFT)) ** 2) @ VP.FB.T + 1e-8) @ VP.DCT.T
    cep = cep - cep[speech].mean(axis=0)
    d = np.zeros_like(cep)
    d[1:-1] = (cep[2:] - cep[:-2]) / 2
    f = np.hstack([cep, 2.0 * d])
    f /= np.linalg.norm(f, axis=1, keepdims=True) + 1e-8
    move = np.linalg.norm(d, axis=1)
    return f, speech, np.minimum(move / (np.median(move[speech]) + 1e-8), 3.0)


def onsets(x):
    """Frames where speech begins: the clip's first loud frame and the end of every pause of ONSET_PAUSE_MS or more."""
    ps = VP.pauses(x, ONSET_PAUSE_MS)
    n = len(x) // VP.HOP
    e = np.sqrt(np.mean(x[: n * VP.HOP].reshape(n, VP.HOP) ** 2, axis=1) + 1e-12)
    loud = np.nonzero(20 * np.log10(e / np.percentile(e, 95) + 1e-12) >= VP.PAUSE_DB)[0]
    first = int(loud[0]) if len(loud) else 0
    return [first] + [b // VP.HOP for _, b in ps]


def alike_from(sim, speech, move, a, b):
    """How much of the sound between onsets a and b (the first attempt) comes again from onset b on: the longest
    stretch alike, as (moving ms, mean similarity). The second attempt may be said a little faster or slower, so the
    stretch is looked for at every lag within START frames of the onsets' own distance, and may wander DRIFT frames."""
    n = len(sim)
    best = (0.0, 0.0)
    for lag in range(max(VP.MIN_LAG, b - a - START), b - a + START + 1):
        rows = np.arange(a, min(b, n - lag - DRIFT))
        if len(rows) < 8:
            continue
        band = np.max(np.stack([sim[rows, rows + lag + d] for d in range(-DRIFT, DRIFT + 1)]), axis=0)
        band[~(speech[rows] & speech[rows + lag])] = 0
        ok = band > VP.TAU
        i, m = 0, len(rows)
        while i < m:
            if not ok[i]:
                i += 1
                continue
            j, gap, last = i, 0, i
            while j < m and gap <= 3:  # a stretch goes on over gaps of up to 3 frames
                if ok[j]:
                    last, gap = j, 0
                else:
                    gap += 1
                j += 1
            weight = float(np.minimum(move[rows[i:last + 1]], move[rows[i:last + 1] + lag]).sum())
            mean = float(band[i:last + 1].mean())
            if weight * mean > best[0] * best[1]:
                best = (weight, mean)
            i = last + 1
    return int(best[0] * 10), best[1]


def find_cut(x, pick=1):
    """The pair of onsets (first, again) whose sound is most alike, as (from_frame, to_frame, moving ms, similarity),
    or None. `pick`: the second-best pair (2), the third (3)…, for when the best one's cut didn't hold."""
    if len(x) < SR // 2:
        return None
    f, speech, move = features(x)
    sim = f @ f.T
    on = [o for o in onsets(x) if o < len(f) - 8]
    pairs = []
    for i, a in enumerate(on):
        for b in on[i + 1:]:
            ms, alike = alike_from(sim, speech, move, a, b)
            if ms >= MIN_ALIKE_MS and alike >= ALIKE:
                pairs.append((a, b, ms, alike))
    pairs.sort(key=lambda p: -p[2] * p[3])
    return pairs[pick - 1] if len(pairs) >= pick else None


def to_16k(y):
    """24 kHz → 16 kHz for the analysis."""
    from scipy.signal import resample_poly
    return resample_poly(y, 2, 3).astype(np.float32)


def cut_clip(path, max_cuts=1, pick=1):
    """Decodes the clip, removes a restart (max_cuts of them: one by default, so that each cut can be heard before the next), and returns (24 kHz samples, cuts in ms of the original,
    [moving ms, similarity] of each, seconds before)."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(OUT_SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    y = np.frombuffer(raw, dtype=np.float32).copy()
    before = len(y) / OUT_SR
    cuts, alike, removed = [], [], []  # removed: (position in today's clip, ms taken out), to name cuts in original ms
    for _ in range(max_cuts):
        found = find_cut(to_16k(y), pick)
        if not found:
            break
        a, b, ms, sim = found
        lead = LEAD_MS * OUT_SR // 1000
        fade = FADE_MS * OUT_SR // 1000
        # frames → 24 kHz samples; the clip goes on from a little before the second onset
        s_from = max(0, a * VP.HOP * OUT_SR // SR - lead)
        s_to = max(s_from, b * VP.HOP * OUT_SR // SR - lead)
        head, tail = y[:s_from].copy(), y[s_to:].copy()
        if len(head) >= fade:
            head[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)
        if len(tail) >= fade:
            tail[:fade] *= np.linspace(0, 1, fade, dtype=np.float32)
        y = np.concatenate([head, tail])
        at = s_from * 1000 // OUT_SR
        orig = at + sum(m for p, m in removed if p <= at)
        cuts.append([int(orig), int(orig + (s_to - s_from) * 1000 // OUT_SR)])
        removed.append((at, (s_to - s_from) * 1000 // OUT_SR))
        alike.append([ms, round(sim, 3)])
    return y, cuts, alike, before


def encode(y, mp3, kbps):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(OUT_SR), "-ac", "1", "-i", "pipe:0",
                    "-b:a", f"{kbps}k", "-ar", str(OUT_SR), "-ac", "1", "-f", "mp3", mp3], input=y.tobytes(), check=True)


def one(args):
    job, out_dir, kbps, pick = args
    try:
        y, cuts, alike, before = cut_clip(job.get("mp3") or job["path"], pick=pick)
        if cuts:
            encode(y, os.path.join(out_dir, job["key"] + ".mp3"), kbps)
        return {"key": job["key"], "cuts": cuts, "alike": alike, "sec_before": round(before, 2), "sec": round(len(y) / OUT_SR, 2)}
    except Exception as e:  # noqa: BLE001 (one bad file doesn't stop the run)
        return {"key": job["key"], "cuts": [], "error": str(e)[:200]}


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    jobs = [json.loads(l) for l in open(sys.argv[1]) if l.strip()]
    out_dir = sys.argv[2]
    opt = dict(a[2:].split("=", 1) for a in sys.argv[3:] if a.startswith("--") and "=" in a)
    kbps, procs, pick = int(opt.get("kbps", 64)), int(opt.get("procs", 4)), int(opt.get("pick", 1))
    os.makedirs(out_dir, exist_ok=True)
    log_path = os.path.join(out_dir, "cuts.jsonl")
    seen = set()
    if os.path.exists(log_path):  # a stopped run goes on
        seen = {json.loads(l)["key"] for l in open(log_path) if l.strip()}
    todo = [j for j in jobs if j["key"] not in seen]
    made = 0
    import multiprocessing as mp
    with mp.get_context("spawn").Pool(procs) as pool, open(log_path, "a") as log:
        for i, row in enumerate(pool.imap_unordered(one, [(j, out_dir, kbps, pick) for j in todo], chunksize=8)):
            made += bool(row["cuts"])
            log.write(json.dumps(row) + "\n")
            if i % 200 == 0:
                log.flush()
    print(f"{made} of {len(todo)} clips cut → {out_dir}")


if __name__ == "__main__":
    main()
