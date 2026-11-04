"""Shared code for Puerto Colibrí's pictures (docs/es/PICTURES.md): paths, the API key, prices, the ledger,
manifests and prompts. Python 3.9+, standard library only (Pillow is optional here: with it, reference pictures
are scaled down before they are sent).

The API key: read from ~/english-world/.env.local (the line OPENAI_API_KEY=…), kept in memory for the
Authorization header and nowhere else: never printed, logged, written or put into an error message.

Money: every request is written to the ledger (one JSON line each) with its tokens and price. New requests are
refused once the committed total (spent + estimates of the requests in flight + open batch reservations) plus the
request's own estimate would pass STOP_USD. The owner approved $82 in all; $75 is the stop, so retries fit.
"""
from __future__ import annotations

import base64
import datetime as _dt
import fcntl
import hashlib
import io
import json
import math
import os
import random
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
MANIFESTS = HERE / "manifests"
PARTS_FILE = HERE / "prompt-parts.json"

# Big files and the ledger live outside the repository (the session's scratch folder unless told otherwise).
WORK = Path(os.environ.get("ES_PICTURES_DIR",
            "/private/tmp/claude-501/-Users-gabrieledirmontaite/b3b443be-6044-459a-94fe-bcc6886dd88c/scratchpad/pictures"))
LEDGER = Path(os.environ.get("ES_PICTURES_LEDGER", str(WORK / "ledger.jsonl")))
ORIGINALS = WORK / "originals"
FILES_CACHE = WORK / "uploaded-files.json"   # sha256 of a reference picture → OpenAI file id (for batches)
BATCHES = WORK / "batches.json"              # submitted batches and what they hold
LOCK = WORK / "generator.lock"               # one generator (or batch submit/fetch) at a time
ENV_FILE = Path(os.environ.get("ES_PICTURES_ENV_FILE", str(Path.home() / "english-world" / ".env.local")))

API = os.environ.get("ES_PICTURES_API", "https://api.openai.com/v1")  # another base only for a local mock test
STOP_USD = 75.0          # hard stop for new requests (the owner approved $82 in all)
APPROVED_USD = 82.0

# ── prices (read 4 Nov 2026 from https://developers.openai.com/api/docs/pricing and the image generation guide) ──
# USD per 1M tokens. Cached input pricing applies only to the Responses API's image tool, never to /v1/images/*.
_RATES_25 = {"standard": {"text_in": 5.00, "image_in": 8.00, "image_out": 30.00},
             "batch":    {"text_in": 2.50, "image_in": 4.00, "image_out": 15.00}}
RATES = {"gpt-image-2.5-sunburst": _RATES_25, "gpt-image-2.5-flare": _RATES_25, "gpt-image-2": _RATES_25}
# Output tokens per image: the guide's calculator (GptImageTokenCalculator): a grid of `factor` tiles along the long
# edge, the short edge in proportion (banker's rounding), times (2,000,000 + width × height) / 4,000,000.
QUALITY_FACTORS = {"gpt-image-2.5": {"low": 16, "medium": 24, "high": 48, "xhigh": 64, "max": 96},
                   "gpt-image-2": {"low": 16, "medium": 48, "high": 96}}
REF_TOKENS_DEFAULT = 6500   # image input tokens per reference picture until the ledger has measured ones


def model_family(model: str) -> str:
    return "gpt-image-2.5" if model.startswith("gpt-image-2.5") else "gpt-image-2"


def model_rates(model: str, batch: bool) -> dict:
    base = re.sub(r"-\d{4}-\d{2}-\d{2}$", "", model)
    if base not in RATES:
        raise SystemExit(f"no prices for model {model!r} (known: {', '.join(RATES)})")
    return RATES[base]["batch" if batch else "standard"]


def parse_size(size: str) -> tuple[int, int]:
    m = re.fullmatch(r"(\d+)x(\d+)", size)
    if not m:
        raise ValueError(f"size must be WIDTHxHEIGHT, not {size!r}")
    w, h = int(m.group(1)), int(m.group(2))
    problems = []
    if w % 16 or h % 16:
        problems.append("both edges must be multiples of 16")
    if max(w, h) > 3840:
        problems.append("no edge over 3840 px")
    if max(w, h) / min(w, h) > 3:
        problems.append("aspect ratio at most 3:1")
    if not 655_360 <= w * h <= 8_294_400:
        problems.append("655,360 to 8,294,400 pixels")
    if problems:
        raise ValueError(f"size {size}: " + "; ".join(problems))
    return w, h


def _half_even(x: float) -> int:
    lo = math.floor(x)
    return lo + lo % 2 if x - lo == 0.5 else round(x)


def output_tokens(model: str, size: str, quality: str) -> int:
    w, h = parse_size(size)
    factors = QUALITY_FACTORS[model_family(model)]
    if quality not in factors:
        raise ValueError(f"quality {quality!r} is not one of {', '.join(factors)} for {model}")
    f = factors[quality]
    short = _half_even(f / (max(w, h) / min(w, h)))
    grid = (f if w >= h else short) * (short if w >= h else f)
    return math.ceil(grid * (2_000_000 + w * h) / 4_000_000)


def text_tokens_estimate(prompt: str) -> int:
    return math.ceil(len(prompt) / 3.2) + 16   # English runs ~4 characters a token: this errs high


def tokens_cost(model: str, batch: bool, text_in: int, image_in: int, image_out: int) -> float:
    r = model_rates(model, batch)
    return (text_in * r["text_in"] + image_in * r["image_in"] + image_out * r["image_out"]) / 1e6


# ── the API key (never printed) ──
_KEY: str | None = None


def api_key() -> str:
    global _KEY
    if _KEY:
        return _KEY
    try:
        text = ENV_FILE.read_text(encoding="utf-8")
    except OSError:
        raise SystemExit(f"No key file at {ENV_FILE} (the owner puts OPENAI_API_KEY=… there).") from None
    for line in text.splitlines():
        if line.startswith("OPENAI_API_KEY="):
            value = line[len("OPENAI_API_KEY="):].strip().strip('"').strip("'")
            if value:
                _KEY = value
                return value
    raise SystemExit(f"OPENAI_API_KEY is missing or empty in {ENV_FILE}.")


def key_present() -> bool:
    try:
        api_key()
        return True
    except SystemExit:
        return False


# ── HTTP ──
class ApiError(Exception):
    """An HTTP error from the API, with its status, error type/code/message and the request id (never the key)."""

    def __init__(self, status: int, body: str, request_id: str | None, retry_after: float | None):
        self.status, self.body, self.request_id, self.retry_after = status, body, request_id, retry_after
        try:
            err = json.loads(body).get("error") or {}
        except (ValueError, AttributeError):
            err = {}
        self.type = err.get("type")
        self.code = err.get("code")
        self.message = (err.get("message") or body or "").strip()[:600]
        self.details = err.get("moderation_details")
        super().__init__(f"HTTP {status} {self.type or ''}/{self.code or ''}: {self.message}")

    # quota, billing, auth and access problems: retrying won't help, and no other request will work either
    def fatal(self) -> bool:
        fatal_codes = {"insufficient_quota", "credit_balance_exhausted", "organization_spend_limit_exceeded",
                       "project_spend_limit_exceeded", "organization_usage_limit_exceeded", "billing_hard_limit_reached",
                       "model_not_found", "invalid_api_key"}
        return self.status in (401, 403, 404) or (self.code in fatal_codes) or (self.type == "insufficient_quota")

    def transient(self) -> bool:
        return not self.fatal() and (self.status in (408, 409, 429) or self.status >= 500)


def http(method: str, path: str, body: bytes | None = None, content_type: str | None = None,
         timeout: float = 360.0) -> tuple[bytes, dict]:
    url = path if path.startswith("http") else f"{API}/{path.lstrip('/')}"
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Authorization", f"Bearer {api_key()}")
    if content_type:
        req.add_header("Content-Type", content_type)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return res.read(), {k.lower(): v for k, v in res.headers.items()}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        headers = {k.lower(): v for k, v in (e.headers.items() if e.headers else [])}
        ra = headers.get("retry-after")
        try:
            ra_s = float(ra) if ra is not None else None
        except ValueError:
            ra_s = None
        raise ApiError(e.code, raw, headers.get("x-request-id"), ra_s) from None


def post_json(path: str, payload: dict, timeout: float = 360.0) -> tuple[dict, dict]:
    raw, headers = http("POST", path, json.dumps(payload).encode("utf-8"), "application/json", timeout)
    return json.loads(raw), headers


def get_json(path: str) -> dict:
    raw, _ = http("GET", path, timeout=120)
    return json.loads(raw)


def multipart(fields: dict, files: dict) -> tuple[bytes, str]:
    """fields: name → str; files: name → (filename, bytes, content type)."""
    boundary = "----espics" + hashlib.sha1(os.urandom(16)).hexdigest()
    out = io.BytesIO()
    for k, v in fields.items():
        out.write(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode())
    for k, (fname, data, ctype) in files.items():
        out.write(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"; filename=\"{fname}\"\r\n"
                  f"Content-Type: {ctype}\r\n\r\n".encode())
        out.write(data)
        out.write(b"\r\n")
    out.write(f"--{boundary}--\r\n".encode())
    return out.getvalue(), f"multipart/form-data; boundary={boundary}"


def upload_file(data: bytes, filename: str, purpose: str, ctype: str) -> str:
    body, ctype_header = multipart({"purpose": purpose}, {"file": (filename, data, ctype)})
    raw, _ = http("POST", "files", body, ctype_header, timeout=300)
    return json.loads(raw)["id"]


# ── the ledger ──
_ledger_lock = threading.Lock()


def now_iso() -> str:
    return _dt.datetime.now().astimezone().isoformat(timespec="seconds")


def read_ledger() -> list[dict]:
    if not LEDGER.exists():
        return []
    rows = []
    for line in LEDGER.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            try:
                rows.append(json.loads(line))
            except ValueError:
                pass
    return rows


def ledger_totals(rows: list[dict] | None = None) -> dict:
    rows = read_ledger() if rows is None else rows
    spent = sum(r.get("cost_usd", 0.0) for r in rows if r.get("kind") == "request")
    reserved = sum(r.get("amount_usd", 0.0) for r in rows if r.get("kind") == "reserve")
    released = sum(r.get("amount_usd", 0.0) for r in rows if r.get("kind") == "release")
    return {"spent": spent, "open_reservations": max(0.0, reserved - released),
            "committed": spent + max(0.0, reserved - released)}


def ledger_append(row: dict) -> dict:
    """Appends one line with the running totals (spent and committed after this line)."""
    with _ledger_lock:
        LEDGER.parent.mkdir(parents=True, exist_ok=True)
        with open(LEDGER, "a+", encoding="utf-8") as fh:
            fcntl.flock(fh, fcntl.LOCK_EX)
            fh.seek(0)
            rows = [json.loads(x) for x in fh.read().splitlines() if x.strip()]
            t = ledger_totals(rows + [row])
            row = {"ts": now_iso(), **row, "total_usd": round(t["spent"], 6), "committed_usd": round(t["committed"], 6)}
            fh.seek(0, os.SEEK_END)
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
            fh.flush()
            os.fsync(fh.fileno())
            fcntl.flock(fh, fcntl.LOCK_UN)
    return row


def measured_ref_tokens() -> int:
    """Image input tokens per reference picture: the largest measured so far (+10%), else the default."""
    per = []
    for r in read_ledger():
        t, n = r.get("tokens") or {}, r.get("refs") or 0
        if r.get("kind") == "request" and r.get("status") == "ok" and n and t.get("image_in"):
            per.append(t["image_in"] / n)
    return math.ceil(max(per) * 1.1) if per else REF_TOKENS_DEFAULT


class Budget:
    """Keeps the committed total (ledger + requests in flight) under STOP_USD."""

    def __init__(self, stop: float = STOP_USD):
        if stop > STOP_USD:
            raise SystemExit(f"The stop can be lowered, not raised above ${STOP_USD:.2f}.")
        self.stop = stop
        self.lock = threading.Lock()
        self.in_flight = 0.0

    def reserve(self, amount: float) -> tuple[bool, float]:
        with self.lock:
            committed = ledger_totals()["committed"] + self.in_flight
            if committed + amount > self.stop:
                return False, committed
            self.in_flight += amount
            return True, committed

    def release(self, amount: float):
        with self.lock:
            self.in_flight = max(0.0, self.in_flight - amount)


class SingleRun:
    """An exclusive lock: one generator (or batch submit/fetch) at a time."""

    def __enter__(self):
        WORK.mkdir(parents=True, exist_ok=True)
        self.fh = open(LOCK, "w")
        try:
            fcntl.flock(self.fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise SystemExit(f"Another generator holds {LOCK}: one at a time.") from None
        self.fh.write(str(os.getpid()))
        self.fh.flush()
        return self

    def __exit__(self, *exc):
        fcntl.flock(self.fh, fcntl.LOCK_UN)
        self.fh.close()


# ── manifests ──
def load_manifest(path: str | Path) -> dict:
    p = Path(path)
    if not p.exists() and (MANIFESTS / p).exists():
        p = MANIFESTS / p
    if not p.exists() and (MANIFESTS / f"{p}.json").exists():
        p = MANIFESTS / f"{p}.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    defaults = data.get("defaults", {})
    items = []
    for raw in data.get("items", []):
        e = {**defaults, **raw}
        e.setdefault("refs", [])
        e["_manifest"] = str(p)
        items.append(e)
    data["items"] = items
    data["_path"] = str(p)
    return data


def all_items() -> dict[str, dict]:
    """Every manifest entry by id (for labels and outputs of reference pictures)."""
    out = {}
    for f in sorted(MANIFESTS.glob("*.json")):
        try:
            for e in load_manifest(f)["items"]:
                out.setdefault(e["id"], e)
        except (ValueError, KeyError):
            continue
    return out


def select(items: list[dict], only: list[str] | None = None, kinds: list[str] | None = None,
           include_skipped: bool = False) -> list[dict]:
    out = []
    for e in items:
        if e.get("skip") and not include_skipped:
            continue
        if kinds and e.get("kind") not in kinds:
            continue
        if only and not any(e["id"] == o or e["id"].startswith(o.rstrip("*")) for o in only):
            continue
        out.append(e)
    return out


def original_path(entry_id: str, ext: str = "png") -> Path:
    return ORIGINALS / f"{entry_id}.{ext}"


def out_path(entry: dict) -> Path:
    """The web version's path: relative to the repository, or under the work folder with "{work}/…"."""
    out = entry["out"]
    if out.startswith("{work}/"):
        return WORK / out[len("{work}/"):]
    return REPO / out


# ── references ──
def resolve_ref(ref: str, index: dict[str, dict]) -> tuple[str, Path, str]:
    """A reference "role:id" → (role, file, label). Roles: style, person, place, edit, ref.
    ids: en/<scene>/<name> (an English picture), cast/<npc>, place/<place>, <scene>/<name> (a Spanish scene
    picture), file:<path>."""
    role, _, rid = ref.partition(":") if ":" in ref and not ref.startswith("file:") else ("ref", "", ref)
    if ref.startswith("file:"):
        role, rid = "ref", ref
    label = rid
    if rid.startswith("file:"):
        path = Path(rid[5:])
        path = path if path.is_absolute() else REPO / path
    elif rid.startswith("en/"):
        path = REPO / "public" / "scenes" / f"{rid[3:]}.webp"
    else:
        e = index.get(rid) or index.get(f"ref/{rid}")
        cands = []
        if e:
            label = e.get("label", rid)
            cands += [original_path(e["id"]), original_path(e["id"], "jpeg"), original_path(e["id"], "webp"), out_path(e)]
        cands += [REPO / "public" / "scenes-es" / "ref" / f"{rid}.webp",
                  REPO / "public" / "scenes-es" / f"{rid.replace('@', '-')}.webp"]
        path = next((c for c in cands if c.exists()), cands[0] if cands else Path(rid))
    if not path.exists():
        raise FileNotFoundError(f"reference {ref!r}: no file ({path})")
    return role, path, label


def ref_bytes(path: Path, max_edge: int = 1536) -> tuple[bytes, str]:
    """The picture to send: scaled down to max_edge (with Pillow) as PNG, or the file itself."""
    try:
        from PIL import Image  # optional
        im = Image.open(path).convert("RGB")
        if max(im.size) > max_edge:
            im.thumbnail((max_edge, max_edge), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "PNG", optimize=True)
        return buf.getvalue(), "image/png"
    except ImportError:
        ext = path.suffix.lower()
        ctype = {".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}[ext]
        return path.read_bytes(), ctype


def data_url(data: bytes, ctype: str) -> str:
    return f"data:{ctype};base64,{base64.b64encode(data).decode('ascii')}"


# ── prompts ──
def load_parts() -> dict:
    return json.loads(PARTS_FILE.read_text(encoding="utf-8"))


def ref_intro(roles_labels: list[tuple[str, str]], parts: dict) -> str:
    lines = []
    tmpl = parts["ref_roles"]
    for i, (role, label) in enumerate(roles_labels, 1):
        t = tmpl.get(role) or tmpl["ref"]
        lines.append(t.replace("{n}", str(i)).replace("{label}", label))
    return " ".join(lines)


def build_prompt(entry: dict, roles_labels: list[tuple[str, str]], parts: dict | None = None) -> str:
    """The final prompt: the reference roles, the shared style, the town (if wanted), the entry's own prompt,
    the kind's framing, and the shared rules."""
    parts = parts or load_parts()
    kind = parts["kinds"].get(entry.get("kind", "scene"), {})
    pieces = []
    if roles_labels:
        pieces.append(ref_intro(roles_labels, parts))
    if kind.get("style", True):
        pieces.append(parts["style"])
    if kind.get("town", True) and not entry.get("no_town"):
        pieces.append(parts["town"])
    pieces.append(entry["prompt"].strip())
    if kind.get("frame"):
        pieces.append(kind["frame"])
    if kind.get("people", True):
        pieces.append(parts["people"])
    pieces.append(parts["rules"])
    return "\n\n".join(p.strip() for p in pieces if p and p.strip())


def estimate_entry(entry: dict, prompt: str, n_refs: int, batch: bool = False) -> dict:
    model, size, quality, n = entry["model"], entry["size"], entry["quality"], int(entry.get("n", 1))
    t_out = output_tokens(model, size, quality) * n
    t_text = text_tokens_estimate(prompt)
    t_img = n_refs * measured_ref_tokens()
    usd = tokens_cost(model, batch, t_text, t_img, t_out)
    return {"text_in": t_text, "image_in": t_img, "image_out": t_out, "usd": round(usd, 6)}


def usage_tokens(usage: dict | None) -> dict | None:
    """The API's usage → {text_in, image_in, image_out} (None when the response has no usage)."""
    if not usage:
        return None
    det = usage.get("input_tokens_details") or {}
    text_in = det.get("text_tokens")
    image_in = det.get("image_tokens")
    if text_in is None and image_in is None:
        text_in, image_in = usage.get("input_tokens", 0), 0
    out_det = usage.get("output_tokens_details") or {}
    image_out = out_det.get("image_tokens", usage.get("output_tokens", 0))
    text_out = out_det.get("text_tokens", 0)
    return {"text_in": int(text_in or 0), "image_in": int(image_in or 0), "image_out": int(image_out or 0),
            "text_out": int(text_out or 0)}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def backoff(attempt: int, retry_after: float | None) -> float:
    base = min(90.0, 6.0 * (2 ** attempt))
    wait = max(retry_after or 0.0, base) + random.uniform(0, 3)
    return wait


def say(*a):
    print(*a, flush=True)


def fail(msg: str, code: int = 1):
    print(msg, file=sys.stderr, flush=True)
    sys.exit(code)
