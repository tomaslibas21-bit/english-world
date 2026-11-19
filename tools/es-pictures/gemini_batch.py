#!/usr/bin/env python3
"""Puerto Colibrí's pictures through Google's Gemini Batch API (gemini-nano-banana-2.1), from the same manifests,
references and prompts as the OpenAI tools (espics.build_prompt): half the price of Gemini's regular API, finished
within 24 hours (usually minutes). Used from 19 Nov 2026 (x04–x08: docs/es/PICTURES.md section 11).

  python3 tools/es-pictures/gemini_batch.py submit MANIFEST [--only ID …] [--label L]   one batch of the entries
  python3 tools/es-pictures/gemini_batch.py status                                       the batches and their state
  python3 tools/es-pictures/gemini_batch.py fetch [LABEL]                                save what finished
  python3 tools/es-pictures/gemini_batch.py ledger                                       the spending so far

The key: read from the file named by GEMINI_KEY_FILE (one line), only into the request header: never printed, logged,
written or put into an error message. Money: every picture is a row in <work>/gemini-ledger.jsonl with its tokens
and price; a batch is refused when the ledger's total plus open batches' reserves plus its own estimate would pass
GEMINI_STOP_USD (default 10).

Originals: <work>/originals/<id>.png (a JPEG answer is stored as PNG) with a sidecar <id>.json (prompt, references and their SHA-256, usage,
price, batch); a redo keeps the older one as <id>~N. The web version is written as convert.py writes it.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import espics as E  # noqa: E402
import convert as C  # noqa: E402

MODEL = os.environ.get("GEMINI_MODEL", "gemini-nano-banana-2.1")
BASE = "https://generativelanguage.googleapis.com"
LEDGER = E.WORK / "gemini-ledger.jsonl"
BATCHES = E.WORK / "gemini-batches.json"
FILES = E.WORK / "gemini-files.json"  # sha256 of a reference → {uri, at}: the Files API keeps a file 48 hours
STOP = float(os.environ.get("GEMINI_STOP_USD", "10"))
# Batch prices, USD per 1M tokens (ai.google.dev pricing, read 18 Nov 2026): input 0.75, text and thinking out 3.75,
# image out 15. A 2K picture is about 1,680 output tokens, a 1K one about 1,120.
RATE_IN, RATE_TEXT, RATE_IMAGE = 0.75e-6, 3.75e-6, 15e-6
ASPECT = {"cast": "2:3", "card": "1:1"}  # everything else 16:9
SIZE = {"card": "1K"}  # everything else 2K


def key() -> str:
    p = os.environ.get("GEMINI_KEY_FILE")
    if not p or not Path(p).exists():
        raise SystemExit("Set GEMINI_KEY_FILE to the file with the Gemini API key.")
    k = Path(p).read_text().strip()
    if not k:
        raise SystemExit("The key file is empty.")
    return k


def call(method: str, url: str, body: bytes | None = None, ctype: str | None = None, headers: dict | None = None,
         raw: bool = False, timeout: float = 600):
    h = {"x-goog-api-key": key(), **(headers or {})}
    if ctype:
        h["Content-Type"] = ctype
    req = urllib.request.Request(url if url.startswith("http") else BASE + url, data=body, method=method, headers=h)
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = r.read()
                return (data, dict(r.headers)) if raw else json.loads(data or b"{}")
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf-8", "replace")[:600]
            if e.code in (429, 500, 502, 503, 504) and attempt < 5:
                time.sleep(5 * (attempt + 1))
                continue
            raise SystemExit(f"HTTP {e.code} on {method} {url.split('?')[0]}: {msg}") from None
        except urllib.error.URLError:
            if attempt < 5:
                time.sleep(5 * (attempt + 1))
                continue
            raise


def upload(data: bytes, mime: str, name: str) -> str:
    """The Files API's resumable upload: → the file's name ("files/…") and uri."""
    start = call("POST", "/upload/v1beta/files", json.dumps({"file": {"display_name": name}}).encode(),
                 "application/json", {"X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start",
                                      "X-Goog-Upload-Header-Content-Length": str(len(data)),
                                      "X-Goog-Upload-Header-Content-Type": mime}, raw=True)
    up = {k.lower(): v for k, v in start[1].items()}["x-goog-upload-url"]
    req = urllib.request.Request(up, data=data, method="POST",
                                 headers={"X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize",
                                          "Content-Length": str(len(data))})
    with urllib.request.urlopen(req, timeout=600) as r:
        f = json.loads(r.read())["file"]
    return f["name"], f["uri"]


def jload(p: Path, default):
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default


def jsave(p: Path, v):
    tmp = p.with_suffix(".tmp")
    tmp.write_text(json.dumps(v, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    tmp.replace(p)


def ledger_rows() -> list[dict]:
    return [json.loads(x) for x in LEDGER.read_text().splitlines() if x.strip()] if LEDGER.exists() else []


def spent() -> float:
    return round(sum(r.get("usd", 0) for r in ledger_rows()), 4)


def reserved() -> float:
    return round(sum(b["reserve"] for b in jload(BATCHES, {}).values() if not b.get("fetched")), 4)


def ref_uri(path: Path, edge: int) -> tuple[str, str, str]:
    data, ctype, _ = E.ref_bytes(path, edge)
    sha = E.sha256(data)
    cache = jload(FILES, {})
    c = cache.get(sha)
    if not c or time.time() - c["at"] > 40 * 3600:
        _, uri = upload(data, ctype, path.name)
        cache[sha] = c = {"uri": uri, "at": time.time(), "file": str(path)}
        jsave(FILES, cache)
    return c["uri"], ctype, sha


def cmd_submit(a):
    man = E.load_manifest(a.manifest)
    index = E.all_items()
    items = E.select(man["items"], a.only or None)
    items = [e for e in items if not e.get("skip")]
    if not items:
        raise SystemExit("nothing to send")
    parts = E.load_parts()
    estimate = round(0.04 * len(items), 4)
    if spent() + reserved() + estimate > STOP:
        raise SystemExit(f"refused: spent {spent()} + reserved {reserved()} + this {estimate} > stop {STOP}")
    lines, meta = [], {}
    for e in items:
        contents, refs, roles = [], [], []
        for r in e.get("refs", []):
            role, path, label = E.resolve_ref(r, index)
            uri, ctype, sha = ref_uri(path, a.ref_edge)
            contents.append({"file_data": {"mime_type": ctype, "file_uri": uri}})
            refs.append({"ref": r, "path": str(path), "sha256": sha})
            roles.append((role, label))
        prompt = E.build_prompt(e, roles, parts, E.people_in(e, index))
        contents.append({"text": prompt})
        kind = e.get("kind", "scene")
        req = {"contents": [{"role": "user", "parts": contents}],
               "generationConfig": {"responseModalities": ["IMAGE"],
                                    "imageConfig": {"aspectRatio": e.get("aspect", ASPECT.get(kind, "16:9")),
                                                    "imageSize": e.get("image_size", SIZE.get(kind, "2K"))},
                                    "thinkingConfig": {"thinkingLevel": "minimal"}}}
        lines.append(json.dumps({"key": e["id"], "request": req}, ensure_ascii=False))
        meta[e["id"]] = {"prompt": prompt, "refs": refs, "manifest": str(a.manifest)}
    label = a.label or f"{Path(a.manifest).stem}-{time.strftime('%m%d-%H%M%S')}"
    fname, _ = upload(("\n".join(lines) + "\n").encode("utf-8"), "application/jsonl", f"{label}.jsonl")
    res = call("POST", f"/v1beta/models/{MODEL}:batchGenerateContent",
               json.dumps({"batch": {"display_name": label, "input_config": {"file_name": fname}}}).encode(),
               "application/json")
    name = res.get("name") or res.get("metadata", {}).get("name")
    b = jload(BATCHES, {})
    b[label] = {"name": name, "at": E.now_iso(), "ids": list(meta), "meta": meta, "reserve": estimate, "model": MODEL}
    jsave(BATCHES, b)
    E.say(f"{label}: {len(items)} pictures sent ({name}); reserve ${estimate}; spent ${spent()} of ${STOP}")


def state_of(name: str) -> dict:
    return call("GET", f"/v1beta/{name}")


def cmd_status(_a):
    for label, b in jload(BATCHES, {}).items():
        if b.get("fetched"):
            continue
        s = state_of(b["name"])
        st = s.get("metadata", {}).get("state") or s.get("state")
        E.say(f"{label}: {st} ({len(b['ids'])} pictures, sent {b['at']})")
    E.say(f"spent ${spent()} of ${STOP}; reserved ${reserved()}")


def keep_old(p: Path):
    if p.exists():
        n = 1
        while p.with_name(f"{p.stem}~{n}{p.suffix}").exists():
            n += 1
        p.rename(p.with_name(f"{p.stem}~{n}{p.suffix}"))


def cmd_fetch(a):
    batches = jload(BATCHES, {})
    index = E.all_items()
    for label, b in batches.items():
        if b.get("fetched") or (a.label and label != a.label):
            continue
        s = state_of(b["name"])
        md = s.get("metadata", s)
        st = md.get("state")
        if st not in ("JOB_STATE_SUCCEEDED", "BATCH_STATE_SUCCEEDED"):
            E.say(f"{label}: {st}")
            if st and any(x in st for x in ("FAILED", "CANCELLED", "EXPIRED")):
                b["fetched"] = E.now_iso()
                b["failed"] = st
                jsave(BATCHES, batches)
            continue
        out = md.get("output", {}) or s.get("response", {})
        rf = out.get("responsesFile") or out.get("responses_file")
        if not rf:
            raise SystemExit(f"{label}: succeeded but no responses file: {json.dumps(md)[:400]}")
        data, _ = call("GET", f"/download/v1beta/{rf}:download?alt=media", raw=True)
        got, bad = 0, []
        for line in data.decode("utf-8").splitlines():
            if not line.strip():
                continue
            r = json.loads(line)
            eid = r.get("key")
            resp = r.get("response") or {}
            usage = resp.get("usageMetadata", {})
            img = None
            for c in resp.get("candidates", []):
                for p in c.get("content", {}).get("parts", []):
                    d = p.get("inlineData") or p.get("inline_data")
                    if d and d.get("data"):
                        img = d
            prompt_t = usage.get("promptTokenCount", 0)
            out_t = usage.get("candidatesTokenCount", 0)
            think_t = usage.get("thoughtsTokenCount", 0)
            image_t = sum(x.get("tokenCount", 0) for x in usage.get("candidatesTokensDetails", [])
                          if x.get("modality") == "IMAGE") or (out_t if img else 0)
            usd = round(prompt_t * RATE_IN + image_t * RATE_IMAGE + (out_t - image_t + think_t) * RATE_TEXT, 5)
            row = {"at": E.now_iso(), "id": eid, "batch": label, "model": b.get("model", MODEL), "usd": usd,
                   "tokens": {"in": prompt_t, "out": out_t, "image": image_t, "thoughts": think_t},
                   "ok": bool(img)}
            with LEDGER.open("a") as f:
                f.write(json.dumps(row) + "\n")
            if not img:
                bad.append(f"{eid}: {json.dumps(r.get('error') or resp.get('promptFeedback') or [c.get('finishReason') for c in resp.get('candidates', [])])[:200]}")
                continue
            # always a PNG original (cards.py, sheets and the other tools look for <id>.png); Gemini may send JPEG
            orig = E.original_path(eid, "png")
            orig.parent.mkdir(parents=True, exist_ok=True)
            keep_old(orig)
            keep_old(orig.with_suffix(".json"))
            raw = base64.b64decode(img["data"])
            if raw[:8] == b"\x89PNG\r\n\x1a\n":
                orig.write_bytes(raw)
            else:
                from PIL import Image
                import io
                Image.open(io.BytesIO(raw)).convert("RGB").save(orig, "PNG", compress_level=6)
            side = {"id": eid, "batch": label, "model": b.get("model", MODEL), **b["meta"].get(eid, {}),
                    "usage": usage, "usd": usd}
            orig.with_suffix(".json").write_text(json.dumps(side, ensure_ascii=False, indent=1) + "\n")
            e = index.get(eid)
            if e and e.get("out"):
                kind = e.get("kind", "scene")
                size = tuple(e["web_size"]) if e.get("web_size") else C.WEB.get(kind)
                C.to_web(orig, E.out_path(e), size=size, long_edge=None if size else C.LONG_EDGE.get(kind, 2048),
                         quality=int(e.get("web_quality", C.QUALITY)), focus=tuple(e.get("focus", (50, 50))))
            got += 1
        b["fetched"] = E.now_iso()
        jsave(BATCHES, batches)
        E.say(f"{label}: {got} saved, {len(bad)} without a picture" + ("".join("\n  " + x for x in bad)))
    E.say(f"spent ${spent()} of ${STOP}")


def cmd_ledger(_a):
    rows = ledger_rows()
    by = {}
    for r in rows:
        by.setdefault(r["batch"], [0, 0.0])
        by[r["batch"]][0] += 1
        by[r["batch"]][1] += r["usd"]
    for k, (n, u) in by.items():
        E.say(f"{k}: {n} requests ${u:.3f}")
    E.say(f"in all: {len(rows)} requests ${spent()} (stop ${STOP})")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("submit")
    s.add_argument("manifest")
    s.add_argument("--only", nargs="*")
    s.add_argument("--label")
    s.add_argument("--ref-edge", type=int, default=1536)
    sub.add_parser("status")
    f = sub.add_parser("fetch")
    f.add_argument("label", nargs="?")
    sub.add_parser("ledger")
    a = ap.parse_args()
    {"submit": cmd_submit, "status": cmd_status, "fetch": cmd_fetch, "ledger": cmd_ledger}[a.cmd](a)
