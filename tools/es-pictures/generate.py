#!/usr/bin/env python3
"""Makes pictures through OpenAI's regular Image API, one manifest entry at a time (docs/es/PICTURES.md).

  python3 tools/es-pictures/generate.py <manifest> [<manifest> …] [--only ID …] [--kind cast|place|scene|test]
          [--dry-run] [--show-prompt] [--workers 2] [--ipm 10] [--force] [--convert] [--max N] [--stop 75]

- An entry with references goes to /v1/images/edits (JSON body, the pictures as data URLs, scaled to --ref-edge);
  without references, to /v1/images/generations.
- The original (PNG) goes to <work>/originals/<id>.png with a sidecar <id>.json (the final prompt, the references,
  the usage, the price); --convert also writes the web version (convert.py) to the entry's "out".
- Entries whose original exists are skipped unless --force (then the old one is kept as <id>~N.png).
- Every request is written to the ledger; new requests are refused once the committed total plus the request's
  estimate would pass the stop ($75). Transient errors (429, 5xx, timeouts) are retried with backoff (Retry-After
  first); quota, billing, authentication and verification errors stop the run; a refused prompt (400) is logged and
  skipped.
- One generator at a time (a lock file); --workers requests in parallel, at most --ipm a minute (the Build tier
  allows 20 images a minute).
"""
from __future__ import annotations

import argparse
import base64
import json
import socket
import sys
import threading
import time
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.dont_write_bytecode = True  # no __pycache__ in the repository
sys.path.insert(0, str(Path(__file__).resolve().parent))
import espics as E  # noqa: E402

STOP = threading.Event()
FATAL: list[str] = []


class Pace:
    def __init__(self, ipm: float):
        self.gap = 60.0 / ipm
        self.lock = threading.Lock()
        self.next = 0.0

    def wait(self):
        with self.lock:
            t = max(time.monotonic(), self.next)
            self.next = t + self.gap
        while time.monotonic() < t and not STOP.is_set():
            time.sleep(min(0.5, t - time.monotonic()))


def prepare(entry: dict, index: dict, ref_edge: int, parts: dict) -> dict:
    refs = []
    for r in entry.get("refs", []):
        role, path, label = E.resolve_ref(r, index)
        data, ctype, dims = E.ref_bytes(path, ref_edge)
        refs.append({"ref": r, "role": role, "label": label, "path": str(path), "bytes": data, "ctype": ctype,
                     "dims": dims, "sha256": E.sha256(data)})
    prompt = E.build_prompt(entry, [(x["role"], x["label"]) for x in refs], parts, E.people_in(entry, index))
    est = E.estimate_entry(entry, prompt, [x["dims"] for x in refs])
    return {"entry": entry, "refs": refs, "prompt": prompt, "est": est}


def payload(job: dict) -> tuple[str, dict]:
    e = job["entry"]
    body = {"model": e["model"], "prompt": job["prompt"], "size": e["size"], "quality": e["quality"],
            "n": int(e.get("n", 1)), "output_format": "png"}
    if e.get("moderation"):
        body["moderation"] = e["moderation"]
    if job["refs"]:
        body["images"] = [{"image_url": E.data_url(x["bytes"], x["ctype"])} for x in job["refs"]]
        return "images/edits", body
    return "images/generations", body


def keep_old(path: Path):
    if path.exists():
        i = 1
        while path.with_name(f"{path.stem}~{i}{path.suffix}").exists():
            i += 1
        path.rename(path.with_name(f"{path.stem}~{i}{path.suffix}"))
        side = path.with_suffix(".json")
        if side.exists():
            side.rename(side.with_name(f"{path.stem}~{i}.json"))


def run_one(job: dict, budget: E.Budget, pace: Pace, convert: bool) -> str:
    e, est = job["entry"], job["est"]
    endpoint, body = payload(job)
    for attempt in range(5):
        if STOP.is_set():
            return "stopped"
        ok, committed = budget.reserve(est["usd"])
        if not ok:
            STOP.set()
            E.say(f"  ✋ {e['id']}: refused — committed ${committed:.4f} + estimate ${est['usd']:.4f} would pass the "
                  f"${budget.stop:.2f} stop")
            return "refused"
        pace.wait()
        t0 = time.time()
        base = {"kind": "request", "id": e["id"], "endpoint": endpoint, "model": e["model"], "size": e["size"],
                "quality": e["quality"], "n": int(e.get("n", 1)), "refs": len(job["refs"]), "batch": False,
                "mode": "fix" if e.get("fix") else "new", "estimate_usd": est["usd"], "attempt": attempt + 1}
        try:
            res, headers = E.post_json(endpoint, body)
        except E.ApiError as err:
            budget.release(est["usd"])
            E.ledger_append({**base, "status": "error", "http": err.status, "error_type": err.type,
                             "error_code": err.code, "error": err.message[:400], "request_id": err.request_id,
                             "cost_usd": 0.0, "seconds": round(time.time() - t0, 1)})
            if err.fatal():
                FATAL.append(f"HTTP {err.status} {err.type}/{err.code}: {err.message}")
                STOP.set()
                E.say(f"  ✗ {e['id']}: {err} — stopping (no retry can fix this)")
                return "fatal"
            if err.transient() and attempt < 4:
                wait = E.backoff(attempt, err.retry_after)
                E.say(f"  … {e['id']}: HTTP {err.status} {err.code or ''} — retry in {wait:.0f} s")
                time.sleep(wait)
                continue
            E.say(f"  ✗ {e['id']}: {err}" + (f" (moderation: {json.dumps(err.details)})" if err.details else ""))
            return "failed"
        except (urllib.error.URLError, socket.timeout, TimeoutError, ConnectionError) as err:
            budget.release(est["usd"])
            # the request may have been made and billed: count the estimate, to stay on the safe side
            E.ledger_append({**base, "status": "no-response", "error": f"{type(err).__name__}: {err}"[:300],
                             "cost_usd": est["usd"], "cost_source": "estimate (no response: maybe billed)",
                             "seconds": round(time.time() - t0, 1)})
            if attempt < 4:
                wait = E.backoff(attempt, None)
                E.say(f"  … {e['id']}: {type(err).__name__} — retry in {wait:.0f} s")
                time.sleep(wait)
                continue
            return "failed"
        budget.release(est["usd"])
        tokens = E.usage_tokens(res.get("usage"))
        if tokens:
            cost = E.tokens_cost(e["model"], False, tokens["text_in"], tokens["image_in"], tokens["image_out"])
            src = "usage"
        else:
            cost, src = est["usd"], "estimate (no usage in the response)"
        images = [d.get("b64_json") for d in res.get("data", []) if d.get("b64_json")]
        paths = []
        for i, b64 in enumerate(images):
            p = E.original_path(e["id"] if i == 0 else f"{e['id']}-{i + 1}")
            p.parent.mkdir(parents=True, exist_ok=True)
            keep_old(p)
            p.write_bytes(base64.b64decode(b64))
            paths.append(p)
        row = E.ledger_append({**base, "status": "ok" if images else "empty", "http": 200,
                               "request_id": headers.get("x-request-id"), "usage": res.get("usage"),
                               "tokens": tokens, "cost_usd": round(cost, 6), "cost_source": src,
                               "returned": {k: res.get(k) for k in ("size", "quality", "output_format", "background")},
                               "out": [str(p) for p in paths], "seconds": round(time.time() - t0, 1)})
        for p in paths:
            p.with_suffix(".json").write_text(json.dumps({
                "id": e["id"], "label": e.get("label"), "manifest": e.get("_manifest"), "prompt": job["prompt"],
                "entry_prompt": e["prompt"], "model": e["model"], "size": e["size"], "quality": e["quality"],
                "refs": [{k: x[k] for k in ("ref", "role", "label", "path", "dims", "sha256")} for x in job["refs"]],
                "request_id": headers.get("x-request-id"), "usage": res.get("usage"), "cost_usd": round(cost, 6),
                "cost_source": src, "created": E.now_iso()}, ensure_ascii=False, indent=1), encoding="utf-8")
        E.say(f"  ✓ {e['id']}: ${cost:.4f} ({src}; tokens {tokens}) in {row['seconds']} s → {paths[0] if paths else '—'}"
              f"   total ${row['total_usd']:.4f}")
        if convert and paths:
            import convert as C
            try:
                C.convert_entry(e)
            except Exception as ex:  # a conversion problem never loses the original
                E.say(f"    (conversion failed: {ex})")
        return "ok" if images else "empty"
    return "failed"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("manifest", nargs="+", help="one or more manifests (names in manifests/ or paths)")
    ap.add_argument("--only", nargs="*", help="exact ids, or prefixes ending in * or / (cast/, s72-cafe/*)")
    ap.add_argument("--kind", nargs="*")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--show-prompt", action="store_true", help="print the final prompts (sends nothing)")
    ap.add_argument("--workers", type=int, default=2)
    ap.add_argument("--ipm", type=float, default=10.0)
    ap.add_argument("--force", action="store_true", help="make it again even if the original exists")
    ap.add_argument("--convert", action="store_true", help="also write the web version (convert.py)")
    ap.add_argument("--max", type=int, default=0, help="at most this many requests")
    ap.add_argument("--stop", type=float, default=E.STOP_USD, help="a lower stop than $75 (never higher)")
    ap.add_argument("--ref-edge", type=int, default=1536, help="longest edge of a reference picture sent")
    ap.add_argument("--fix", metavar="INSTRUCTION",
                    help="edit each selected picture's own original (kept as ~N): only this change, e.g. "
                         "\"Remove the letters on the sign above the door; change nothing else.\"")
    ap.add_argument("--model", help="override the model")
    ap.add_argument("--quality", help="override the quality")
    ap.add_argument("--size", help="override the size")
    a = ap.parse_args()

    if a.workers < 1 or a.workers > 4:
        E.fail("--workers must be 1–4 (keep the machine's load moderate)")
    if a.ipm > 20:
        E.fail("--ipm must be at most 20 (the Build tier's limit)")
    mans = [E.load_manifest(m) for m in a.manifest]
    index = E.all_items()
    for man in mans:
        for e in man["items"]:
            index[e["id"]] = e
    items = E.select([e for man in mans for e in man["items"]], a.only, a.kind)
    for e in items:
        for k in ("model", "quality", "size"):
            if getattr(a, k):
                e[k] = getattr(a, k)
    if a.fix:
        # an edit of the picture's own original, keeping its people (and their name tags) by reference
        fixed = []
        for e in items:
            if not E.original_path(e["id"]).exists():
                E.say(f"  ! {e['id']}: no original to fix — skipped")
                continue
            persons = [r for r in e.get("refs", []) if r.startswith("person:")]
            fixed.append({**e, "refs": [f"edit:{e['id']}"] + persons, "prompt": a.fix, "fix": True})
        items = fixed
    elif not a.force:
        items = [e for e in items if not E.original_path(e["id"]).exists()]
    if a.max:
        items = items[: a.max]
    if not items:
        E.say("Nothing to make (all selected entries have originals; --force makes them again).")
        return
    parts = E.load_parts()
    jobs = []
    for e in items:
        try:
            E.parse_size(e["size"])
            jobs.append(prepare(e, index, a.ref_edge, parts))
        except (FileNotFoundError, ValueError) as ex:
            E.say(f"  ! {e['id']}: {ex} — skipped")
    total_est = sum(j["est"]["usd"] for j in jobs)
    t = E.ledger_totals()
    E.say(f"{len(jobs)} request(s), estimated ${total_est:.4f}; ledger: spent ${t['spent']:.4f}, committed "
          f"${t['committed']:.4f}, stop ${a.stop:.2f}")
    if a.dry_run or a.show_prompt:
        for j in jobs:
            e = j["entry"]
            E.say(f"  · {e['id']}: {e['model']} {e['size']} {e['quality']}, {len(j['refs'])} ref(s), "
                  f"est ${j['est']['usd']:.4f} {j['est']}")
            if a.show_prompt:
                E.say("    " + j["prompt"].replace("\n", "\n    "))
        return  # --dry-run and --show-prompt never send anything
    E.api_key()  # fails early, without printing anything of the key
    budget = E.Budget(a.stop)
    pace = Pace(a.ipm)
    results: dict[str, int] = {}
    t_start = E.ledger_totals()["spent"]
    with E.SingleRun():
        with ThreadPoolExecutor(max_workers=a.workers) as pool:
            futs = {}
            for j in jobs:
                futs[pool.submit(run_one, j, budget, pace, a.convert)] = j
            for f in as_completed(futs):
                try:
                    r = f.result()
                except Exception as ex:  # never lose the run over one entry
                    r = "crashed"
                    E.say(f"  ✗ {futs[f]['entry']['id']}: {type(ex).__name__}: {ex}")
                results[r] = results.get(r, 0) + 1
    t = E.ledger_totals()
    E.say(f"done: {results}; this run ${t['spent'] - t_start:.4f}; ledger spent ${t['spent']:.4f}, committed "
          f"${t['committed']:.4f} of the ${a.stop:.2f} stop")
    if FATAL:
        (E.WORK / "last-fatal.txt").write_text(FATAL[0] + "\n", encoding="utf-8")
        E.say("FATAL: " + FATAL[0])
        sys.exit(3)


if __name__ == "__main__":
    main()
