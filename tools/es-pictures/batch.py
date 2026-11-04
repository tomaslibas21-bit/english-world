#!/usr/bin/env python3
"""OpenAI's Batch API for pictures: half price, finished within 24 hours (docs/es/PICTURES.md "Batch").

  python3 tools/es-pictures/batch.py submit <manifest> [<manifest> …] [--only ID …] [--kind …] [--dry-run] [--max N]
  python3 tools/es-pictures/batch.py run <manifest> [<manifest> …] [--convert]   submit, wait, fetch, a queue-full
                                                                at a time, until every selected picture exists
  python3 tools/es-pictures/batch.py status [BATCH_ID]          one batch, or every batch submitted from here
  python3 tools/es-pictures/batch.py fetch BATCH_ID [--convert] the results: originals, sidecars, ledger lines
  python3 tools/es-pictures/batch.py cancel BATCH_ID

- The docs (read 4 Nov 2026): /v1/images/generations and /v1/images/edits are batch endpoints; GPT Image 2.5
  (Sunburst and Flare, and their 2026-09-08 snapshots) "supports batch image generation and editing". One model
  and one endpoint per batch file, so a submit makes one batch per (endpoint, model).
- Reference pictures are uploaded once to the Files API (purpose "vision", cached by their SHA-256 in
  <work>/uploaded-files.json) and passed as {"file_id": …}; base64 in the .jsonl would bloat it (200 MB limit).
- Money: a submit writes a "reserve" line to the ledger (the batch's estimate at batch prices), so the $75 stop
  counts batches still running; a fetch writes one "request" line per picture with its real usage at batch prices
  and a "release" line for the reservation. A batch that expires is charged only for what it completed.
"""
from __future__ import annotations

import argparse
import base64
import json
import sys
import time
from pathlib import Path

sys.dont_write_bytecode = True  # no __pycache__ in the repository
sys.path.insert(0, str(Path(__file__).resolve().parent))
import espics as E  # noqa: E402


def load_batches() -> dict:
    return json.loads(E.BATCHES.read_text(encoding="utf-8")) if E.BATCHES.exists() else {}


def save_batches(b: dict):
    E.BATCHES.parent.mkdir(parents=True, exist_ok=True)
    E.BATCHES.write_text(json.dumps(b, ensure_ascii=False, indent=1), encoding="utf-8")


def file_id_for(data: bytes, ctype: str, name: str) -> str:
    cache = json.loads(E.FILES_CACHE.read_text(encoding="utf-8")) if E.FILES_CACHE.exists() else {}
    h = E.sha256(data)
    if h in cache:
        return cache[h]
    fid = E.upload_file(data, name, "vision", ctype)
    cache[h] = fid
    E.FILES_CACHE.parent.mkdir(parents=True, exist_ok=True)
    E.FILES_CACHE.write_text(json.dumps(cache, indent=1), encoding="utf-8")
    return fid


def submit(a):
    mans = [E.load_manifest(m) for m in a.manifest]
    index = E.all_items()
    for man in mans:
        for e in man["items"]:
            index[e["id"]] = e
    items = [e for e in E.select([e for m in mans for e in m["items"]], a.only, a.kind)
             if a.force or not E.original_path(e["id"]).exists()]
    # a picture can be in a batch only if what it edits exists already (no chains inside one batch)
    waiting = [e for e in items for r in e.get("refs", []) if r.partition(":")[0] == "edit"
               and not E.original_path(r.partition(":")[2]).exists()]
    if waiting:
        E.fail("These edit pictures that don't exist yet; make those first: "
               + ", ".join(sorted({f"{e['id']} ← {r}" for e in waiting for r in e['refs'] if r.startswith('edit:')})[:12]))
    if a.max:
        items = items[: a.max]
    if not items:
        E.say("Nothing to submit.")
        return []
    parts = E.load_parts()
    groups: dict[tuple[str, str], list] = {}
    for e in items:
        refs = []
        for r in e.get("refs", []):
            role, path, label = E.resolve_ref(r, index)
            data, ctype, dims = E.ref_bytes(path, a.ref_edge)
            refs.append((role, label, data, ctype, path.name, dims))
        prompt = E.build_prompt(e, [(x[0], x[1]) for x in refs], parts, E.people_in(e, index))
        est = E.estimate_entry(e, prompt, [x[5] for x in refs], batch=True)
        endpoint = "/v1/images/edits" if refs else "/v1/images/generations"
        groups.setdefault((endpoint, e["model"]), []).append((e, refs, prompt, est))
    # the organization's queue: at most `queue` enqueued tokens per model in running batches (1,000,000 for
    # gpt-image-2.5-sunburst on 4 Nov 2026: a 420-picture batch failed with token_limit_exceeded)
    for key, g in groups.items():
        kept, used = [], 0
        for x in g:
            t = x[3]["text_in"] + x[3]["image_in"] + x[3]["image_out"]
            if kept and used + t > a.queue:
                break
            kept.append(x)
            used += t
        if len(kept) < len(g):
            E.say(f"  {key[0]} {key[1]}: {len(kept)} of {len(g)} picture(s) fit the {a.queue:,}-token queue; "
                  "the rest go in the next batch")
        groups[key] = kept
    items = [x[0] for g in groups.values() for x in g]
    total = sum(x[3]["usd"] for g in groups.values() for x in g)
    t = E.ledger_totals()
    E.say(f"{len(items)} picture(s) in {len(groups)} batch(es), estimated ${total:.4f} at batch prices; "
          f"committed ${t['committed']:.4f} of the ${E.STOP_USD:.2f} stop")
    if t["committed"] + total > a.stop:
        E.fail(f"Refused: ${t['committed']:.4f} committed + ${total:.4f} would pass the ${a.stop:.2f} stop. "
               "Submit fewer (--only / --max).")
    if a.dry_run:
        for (endpoint, model), g in groups.items():
            E.say(f"  {endpoint} {model}: {len(g)} — " + ", ".join(x[0]["id"] for x in g))
        return []
    E.api_key()
    batches = load_batches()
    submitted = []
    with E.SingleRun():
        for (endpoint, model), g in groups.items():
            lines = []
            for e, refs, prompt, est in g:
                body = {"model": model, "prompt": prompt, "size": e["size"], "quality": e["quality"],
                        "n": int(e.get("n", 1)), "output_format": "png"}
                if refs:
                    body["images"] = [{"file_id": file_id_for(d, c, n)} for (_, _, d, c, n, _) in refs]
                lines.append(json.dumps({"custom_id": e["id"], "method": "POST", "url": endpoint, "body": body},
                                        ensure_ascii=False))
            jsonl = ("\n".join(lines) + "\n").encode("utf-8")
            input_id = E.upload_file(jsonl, f"es-pictures-{int(time.time())}.jsonl", "batch", "application/jsonl")
            res, _ = E.post_json("batches", {"input_file_id": input_id, "endpoint": endpoint, "completion_window": "24h",
                                             "metadata": {"project": "puerto-colibri-pictures",
                                                          "manifests": ",".join(Path(m["_path"]).stem for m in mans)[:500]}})
            bid = res["id"]
            amount = round(sum(x[3]["usd"] for x in g), 6)
            E.ledger_append({"kind": "reserve", "batch_id": bid, "amount_usd": amount, "items": len(g),
                             "model": model, "endpoint": endpoint})
            batches[bid] = {"created": E.now_iso(), "endpoint": endpoint, "model": model, "manifest": [m["_path"] for m in mans],
                            "input_file_id": input_id, "reserve_usd": amount, "fetched": False,
                            "items": {x[0]["id"]: {"est_usd": x[3]["usd"], "refs": len(x[1]), "size": x[0]["size"],
                                                   "quality": x[0]["quality"], "prompt": x[2]} for x in g}}
            save_batches(batches)
            E.say(f"  submitted {bid}: {len(g)} picture(s) to {endpoint} ({model}), reserved ${amount:.4f}")
            submitted.append(bid)
    return submitted


def status(a):
    batches = load_batches()
    ids = [a.batch_id] if a.batch_id else list(batches)
    if not ids:
        E.say("No batches submitted from here.")
    for bid in ids:
        b = E.get_json(f"batches/{bid}")
        rc = b.get("request_counts") or {}
        when = {k: time.strftime("%H:%M", time.localtime(b[k])) for k in
                ("created_at", "in_progress_at", "finalizing_at", "completed_at", "expires_at") if b.get(k)}
        mine = batches.get(bid, {})
        E.say(f"{bid}: {b.get('status')}  {rc.get('completed', 0)}/{rc.get('total', 0)} done, {rc.get('failed', 0)} failed"
              f"  {when}  fetched={mine.get('fetched')}  output={b.get('output_file_id')} errors={b.get('error_file_id')}")
        for err in ((b.get("errors") or {}).get("data") or []):
            E.say(f"    error {err.get('code')}: {err.get('message')}")


def fetch(a):
    batches = load_batches()
    mine = batches.get(a.batch_id)
    if not mine:
        E.fail(f"{a.batch_id} was not submitted from here ({E.BATCHES}).")
    if mine.get("fetched") and not a.again:
        E.fail(f"{a.batch_id} was fetched already ({mine['fetched']}); --again re-saves the pictures without new ledger lines.")
    b = E.get_json(f"batches/{a.batch_id}")
    if b.get("status") not in ("completed", "expired", "cancelled", "failed"):
        E.fail(f"{a.batch_id} is {b.get('status')}: fetch it when it has finished.")
    first = not mine.get("fetched")
    got = failed = 0
    spent = 0.0
    entries = E.all_items()
    for m in mine["manifest"] if isinstance(mine["manifest"], list) else [mine["manifest"]]:
        try:
            entries.update({e["id"]: e for e in E.load_manifest(m)["items"]})
        except (OSError, ValueError):
            pass
    with E.SingleRun():
        for fid_key in ("output_file_id", "error_file_id"):
            fid = b.get(fid_key)
            if not fid:
                continue
            dest = E.WORK / "batches" / f"{a.batch_id}-{fid_key}.jsonl"
            if not dest.exists() or a.again:
                n = E.download(f"files/{fid}/content", dest)
                E.say(f"  downloaded {fid_key}: {n / 1e6:.0f} MB → {dest}")
            fh = open(dest, encoding="utf-8")
            for line in fh:
                if not line.strip():
                    continue
                r = json.loads(line)
                cid = r.get("custom_id")
                info = mine["items"].get(cid, {})
                resp = r.get("response") or {}
                body = resp.get("body") or {}
                base = {"kind": "request", "id": cid, "endpoint": mine["endpoint"], "model": mine["model"],
                        "size": info.get("size"), "quality": info.get("quality"), "refs": info.get("refs"),
                        "batch": True, "batch_id": a.batch_id, "estimate_usd": info.get("est_usd"),
                        "request_id": resp.get("request_id")}
                images = [d.get("b64_json") for d in body.get("data", []) if d.get("b64_json")] if resp.get("status_code") == 200 else []
                if not images:
                    failed += 1
                    err = r.get("error") or body.get("error") or {}
                    if first:
                        E.ledger_append({**base, "status": "error", "http": resp.get("status_code"),
                                         "error_code": err.get("code"), "error": (err.get("message") or "")[:400],
                                         "cost_usd": 0.0})
                    E.say(f"  ✗ {cid}: {err.get('code')} {err.get('message', '')[:200]}")
                    continue
                tokens = E.usage_tokens(body.get("usage"))
                if tokens:
                    cost, src = E.tokens_cost(mine["model"], True, tokens["text_in"], tokens["image_in"], tokens["image_out"]), "usage"
                else:
                    cost, src = info.get("est_usd", 0.0), "estimate (no usage in the response)"
                p = E.original_path(cid)
                p.parent.mkdir(parents=True, exist_ok=True)
                if p.exists():
                    i = 1
                    while p.with_name(f"{p.stem}~{i}{p.suffix}").exists():
                        i += 1
                    p.rename(p.with_name(f"{p.stem}~{i}{p.suffix}"))
                p.write_bytes(base64.b64decode(images[0]))
                p.with_suffix(".json").write_text(json.dumps({
                    "id": cid, "prompt": info.get("prompt"), "model": mine["model"], "size": info.get("size"),
                    "quality": info.get("quality"), "batch_id": a.batch_id, "request_id": resp.get("request_id"),
                    "usage": body.get("usage"), "cost_usd": round(cost, 6), "cost_source": src,
                    "created": E.now_iso()}, ensure_ascii=False, indent=1), encoding="utf-8")
                if first:
                    E.ledger_append({**base, "status": "ok", "http": 200, "usage": body.get("usage"), "tokens": tokens,
                                     "cost_usd": round(cost, 6), "cost_source": src, "out": [str(p)]})
                spent += cost
                got += 1
                E.say(f"  ✓ {cid}: ${cost:.4f} → {p}")
                if a.convert and entries.get(cid):
                    import convert as C
                    C.convert_entry(entries[cid])
        if first:
            E.ledger_append({"kind": "release", "batch_id": a.batch_id, "amount_usd": mine["reserve_usd"]})
            mine["fetched"] = E.now_iso()
            save_batches(batches)
    t = E.ledger_totals()
    E.say(f"{got} picture(s) saved, {failed} failed, ${spent:.4f} at batch prices; ledger spent ${t['spent']:.4f}, "
          f"committed ${t['committed']:.4f}")


def run(a):
    """Submits a queue-full, waits for it, fetches it, and goes on until every selected picture exists. Resumes an
    unfetched batch from here first. Stops on a failed batch (after releasing its reservation)."""
    while True:
        open_ = [bid for bid, b in load_batches().items() if not b.get("fetched")]
        bids = open_[:1] or submit(a)
        if not bids:
            E.say("All selected pictures exist.")
            return
        for bid in bids:
            while True:
                b = E.get_json(f"batches/{bid}")
                if b.get("status") in ("completed", "expired", "cancelled", "failed"):
                    break
                rc = b.get("request_counts") or {}
                E.say(f"  {time.strftime('%H:%M')} {bid}: {b.get('status')} {rc.get('completed', 0)}/{rc.get('total', 0)}")
                time.sleep(a.poll)
            fetch(argparse.Namespace(batch_id=bid, convert=a.convert, again=False))
            if b.get("status") == "failed":
                for err in ((b.get("errors") or {}).get("data") or []):
                    E.say(f"    error {err.get('code')}: {err.get('message')}")
                E.fail(f"{bid} failed; stopped.")


def cancel(a):
    res, _ = E.post_json(f"batches/{a.batch_id}/cancel", {})
    E.say(f"{a.batch_id}: {res.get('status')} (fetch it when it is cancelled: completed requests are charged)")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("submit")
    s.add_argument("manifest", nargs="+")
    s.add_argument("--only", nargs="*")
    s.add_argument("--kind", nargs="*")
    s.add_argument("--dry-run", action="store_true")
    s.add_argument("--force", action="store_true")
    s.add_argument("--max", type=int, default=0)
    s.add_argument("--stop", type=float, default=E.STOP_USD)
    s.add_argument("--ref-edge", type=int, default=1536)
    s.add_argument("--queue", type=int, default=900_000, help="enqueued tokens per batch (the org's limit is 1,000,000)")
    r = sub.add_parser("run")
    r.add_argument("manifest", nargs="+")
    r.add_argument("--only", nargs="*")
    r.add_argument("--kind", nargs="*")
    r.add_argument("--max", type=int, default=0)
    r.add_argument("--stop", type=float, default=E.STOP_USD)
    r.add_argument("--ref-edge", type=int, default=1536)
    r.add_argument("--queue", type=int, default=900_000)
    r.add_argument("--poll", type=int, default=60, help="seconds between status checks")
    r.add_argument("--convert", action="store_true")
    r.set_defaults(dry_run=False, force=False)
    st = sub.add_parser("status")
    st.add_argument("batch_id", nargs="?")
    f = sub.add_parser("fetch")
    f.add_argument("batch_id")
    f.add_argument("--convert", action="store_true")
    f.add_argument("--again", action="store_true")
    c = sub.add_parser("cancel")
    c.add_argument("batch_id")
    a = ap.parse_args()
    if getattr(a, "stop", E.STOP_USD) > E.STOP_USD:
        E.fail(f"The stop can be lowered, not raised above ${E.STOP_USD:.2f}.")
    {"submit": submit, "run": run, "status": status, "fetch": fetch, "cancel": cancel}[a.cmd](a)


if __name__ == "__main__":
    main()
