#!/usr/bin/env python3
"""Pictures for the game's flashcards in the course (Spanish Master English): one new picture per phrase group, made
from the scene picture on screen when the game offers that group; each group's cards then alternate new picture /
scene picture (first card: the new one), as English Master's game cards do. One set serves the three decks (México,
neutral, España): they share the groups.

  EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-pictures/card-probe-es.ts <work>/cards/probe.json
  python3 tools/es-pictures/cards.py map                 groups → scene pictures (probe + fallbacks): cards/map.json
  python3 tools/es-pictures/cards.py map PROBE.json --only x01-surf,x02-alux-kin   new conversations into the map
  python3 tools/es-pictures/cards.py manifest LABEL [--pick N] [--keys a,b] [--attempt K]
                                                         a batch.py manifest for the groups still without a picture
  python3 tools/es-pictures/batch.py submit <work>/cards/manifests/LABEL.json --ref-edge 1024
  python3 tools/es-pictures/cards.py sheets LABEL        contact sheets (cards/sheets/), numbered
  python3 tools/es-pictures/cards.py ids LABEL N…        the picture ids behind sheet numbers
  python3 tools/es-pictures/cards.py review LABEL ['{"id": "note"}']   approve a batch except the rejected pictures;
                                                         a note goes into that group's next prompt
  python3 tools/es-pictures/cards.py mapping OUT.json    display copies (768 px WebP q82, named by checksum) of the
                                                         approved pictures and square scene crops, and the list
  python3 tools/es-pictures/cards.py status
Pictures go through OpenAI's Batch API only (batch.py, its ledger and the $75 stop); a few single tests at most.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import espics as E  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

C = E.WORK / "cards"
MAP, REVIEW, PROBE = C / "map.json", C / "review.json", C / "probe.json"
SCENES = E.REPO / "public" / "scenes-es"


def load(p: Path, default):
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default


def save(p: Path, v):
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(".tmp")
    tmp.write_text(json.dumps(v, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    tmp.replace(p)


def groups():
    for sit, v in load(MAP, {}).items():
        for g in v["groups"]:
            yield sit, v, g


def pid(sit: str, hint: str, attempt: int) -> str:
    return f"cards/{sit}/{hint}-a{attempt}"


def scene_file(v: dict, pic: str) -> Path:
    return SCENES / v["scene"].replace("@", "-") / f"{pic}.webp"


def cmd_map(only: set | None = None, probe_file: Path | None = None):
    probe = load(probe_file or PROBE, None)
    if probe is None:
        E.fail(f"no probe: run card-probe-es.ts into {PROBE} first")
    how: dict[str, int] = {}
    for sit, v in probe.items():
        if only and sit not in only:
            continue
        data = json.loads((E.REPO / "src/editions/es/ui/scene-data" / f"{v['scene']}.json").read_text(encoding="utf-8"))
        phases = data["phases"]
        played = {g["hint"]: g["pic"] for g in v["groups"] if g["pic"]}
        for g in v["groups"]:
            g["key"] = f"{sit}/{g['hint']}"
            if g["pic"]:
                g["how"] = "played"
            else:
                h, pic = g["hint"], None
                if h in phases:
                    pic, g["how"] = phases[h], "same id"
                if not pic and "_" in h:
                    for k in (h.rsplit("_", 1)[0], h.split("_", 1)[0]):
                        if k in played:
                            pic, g["how"] = played[k], "base group"
                            break
                        if k in phases:
                            pic, g["how"] = phases[k], "base id"
                            break
                if not pic:
                    pic, g["how"] = v["start"], "start"
                g["pic"] = pic
            if not scene_file(v, g["pic"]).exists():
                E.fail(f"{g['key']}: no scene picture {scene_file(v, g['pic'])}")
            how[g["how"]] = how.get(g["how"], 0) + 1
    if only:  # new conversations: the rest of the map stays as it is
        probe = {**load(MAP, {}), **{k: v for k, v in probe.items() if k in only}}
    save(MAP, probe)
    E.say(f"{sum(len(v['groups']) for v in probe.values())} groups in {len(probe)} conversations: {json.dumps(how)}")


def person_of(v: dict) -> str:
    return (v.get("npc") or "the person").strip()


def prompt(v: dict, g: dict) -> str:
    said = (g.get("said") or "").strip()
    if len(said) > 240:  # keep the end: what the learner is answering
        parts = re.split(r"(?<=[.!?])\s+", said)
        said = ""
        while parts and len(parts[-1]) + len(said) < 240:
            said = (parts.pop() + " " + said).strip()
        said = said or parts[-1][-240:]
    lines = " / ".join(f'"{s}"' for s in g["items"][:5])
    meaning = " / ".join(f'"{s}"' for s in g.get("meaning", [])[:3])
    who = person_of(v)
    return (
        f'A flashcard picture for this moment of the conversation "{v["title"]}" with {who}, in the town of Puerto '
        "Colibrí on Mexico's Caribbean coast: a DIFFERENT moment from the game picture, one that makes clear what the "
        "learner is saying."
        + (f' Just before, {who} said (in Spanish): "{said}"' if said else "")
        + f' The learner\'s goal: "{g["goal"]}". The learner says something like (in Spanish): {lines}'
        + (f" (meaning {meaning})" if meaning else "")
        + ". Show that meaning through the person's reaction and gestures, the objects involved and the setting; "
        "you may come closer or show another part of the same place. If the game picture shows a phone or video call, "
        "the other person stays on their end of the call (on the screen, or alone where they are). If the game "
        "picture has nobody in it, draw nobody."
        + (f" {g['note']}" if g.get("note") else "")
    )


def cmd_manifest(label: str, pick: int | None, keys: set | None, attempt: int):
    review = load(REVIEW, {"approved": {}, "rejected": {}, "notes": {}})
    todo = [(s, v, g) for s, v, g in groups() if g["key"] not in review["approved"] and (not keys or g["key"] in keys)]
    if pick:  # a pilot: one group from every other conversation, spread over the groups
        sits = sorted({s for s, _, _ in todo})[::2]
        chosen = []
        for i, s in enumerate(sits):
            gs = [x for x in todo if x[0] == s]
            chosen.append(gs[(i * 5) % len(gs)])
        todo = chosen[:pick]
    items = []
    for sit, v, g in todo:
        note = review["notes"].get(g["key"])
        items.append({"id": pid(sit, g["hint"], attempt), "situation": sit,
                      "refs": [f"card:{v['scene']}/{g['pic']}"],
                      "prompt": prompt(v, {**g, "note": note} if note else g),
                      "out": f"{{work}}/cards/web/{sit}/{g['hint']}-a{attempt}.webp"})
    man = {"_about": f"Flashcard pictures, batch {label} (tools/es-pictures/cards.py): {len(items)} phrase groups.",
           "defaults": {"kind": "card", "model": "gpt-image-2.5-sunburst", "size": "1024x1024", "quality": "medium"},
           "items": items}
    path = C / "manifests" / f"{label}.json"
    save(path, man)
    E.say(f"{len(items)} pictures → {path}")


def font(size: int):
    for f in ("/System/Library/Fonts/Supplemental/Arial Unicode.ttf", "/System/Library/Fonts/Helvetica.ttc"):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default()


def by_id():
    m = {}
    for sit, v, g in groups():
        for a in range(1, 6):
            m[pid(sit, g["hint"], a)] = (sit, v, g)
    return m


def made(label: str) -> list[str]:
    """A batch's pictures that exist, in sheet order (a sheet number is the position here, from 1)."""
    man = load(C / "manifests" / f"{label}.json", {"items": []})
    return [e["id"] for e in man["items"] if E.original_path(e["id"]).exists()]


def cmd_sheets(label: str, per: int = 20, cols: int = 5):
    m, ids = by_id(), made(label)
    dest = C / "sheets"
    dest.mkdir(parents=True, exist_ok=True)
    f, cell, out = font(13), (272, 400), []
    for n in range(0, len(ids), per):
        chunk = ids[n:n + per]
        sheet = Image.new("RGB", (cols * cell[0], ((len(chunk) + cols - 1) // cols) * cell[1]), "white")
        d = ImageDraw.Draw(sheet)
        for k, i in enumerate(chunk):
            x, y = (k % cols) * cell[0], (k // cols) * cell[1]
            sit, v, g = m[i]
            sheet.paste(Image.open(E.original_path(i)).convert("RGB").resize((256, 256)), (x + 8, y + 8))
            ref = Image.open(scene_file(v, g["pic"])).convert("RGB")
            ref.thumbnail((112, 64))
            sheet.paste(ref, (x + 8, y + 268))
            d.text((x + 124, y + 268), f"{n + k + 1}. {sit}", fill="black", font=f)
            d.text((x + 124, y + 284), g["hint"][:18], fill="gray", font=f)
            text, wrapped, line = g["goal"] + " — " + g["items"][0], [], ""
            for word in text.split():
                if len(line) + len(word) > 38:
                    wrapped.append(line)
                    line = word
                else:
                    line = (line + " " + word).strip()
            wrapped.append(line)
            for j, t in enumerate(wrapped[:4]):
                d.text((x + 8, y + 336 + j * 15), t, fill="black", font=f)
        p = dest / f"{label}-{n // per + 1:02d}.jpg"
        sheet.save(p, quality=82)
        out.append(str(p))
    E.say("\n".join(out))


def cmd_ids(label: str, numbers: list[str]):
    ids = made(label)
    E.say(json.dumps({n: ids[int(n) - 1] for n in numbers}))


def cmd_review(label: str, reject: dict):
    review = load(REVIEW, {"approved": {}, "rejected": {}, "notes": {}})
    m = by_id()
    man = load(C / "manifests" / f"{label}.json", {"items": []})
    n = 0
    for e in man["items"]:
        sit, v, g = m[e["id"]]
        p = E.original_path(e["id"])
        if not p.exists() and e["id"] not in reject:
            continue  # not made yet (still to send, or failed): it stays without a picture, the next manifest asks again
        if e["id"] in reject:
            note = reject[e["id"]]
            review["rejected"][e["id"]] = note
            review["notes"][g["key"]] = note
            if review["approved"].get(g["key"], {}).get("id") == e["id"]:
                review["approved"].pop(g["key"])
            continue
        review["approved"][g["key"]] = {"id": e["id"], "file": str(p), "sha256": E.sha256(p.read_bytes()), "batch": label}
        review["notes"].pop(g["key"], None)
        n += 1
    save(REVIEW, review)
    E.say(f"{n} approved, {len(reject)} rejected; approved in all {len(review['approved'])} of {sum(1 for _ in groups())}")


def display_copy(im: Image.Image) -> str:
    """At most 768 px, WebP quality 82, named by its checksum (English Master's display convention)."""
    im = im.convert("RGB")
    im.thumbnail((768, 768))
    b = io.BytesIO()
    im.save(b, format="WEBP", quality=82, method=6)
    data = b.getvalue()
    digest = hashlib.sha256(data).hexdigest()
    (C / "display").mkdir(parents=True, exist_ok=True)
    (C / "display" / f"{digest}.webp").write_bytes(data)
    return f"{digest}.webp"


def scene_crop(v: dict, pic: str) -> str:
    """A square crop of a 16:9 scene picture around the person (the scene file's focus x)."""
    im = Image.open(scene_file(v, pic))
    w, h = im.size
    left = min(max(round(v["focus"][0] / 100 * w - h / 2), 0), w - h)
    return display_copy(im.crop((left, 0, left + h, h)))


def cmd_mapping(dest: str):
    review = load(REVIEW, {"approved": {}})
    crops, out = {}, {}
    for sit, v, g in groups():
        k = (sit, g["pic"])
        if k not in crops:
            crops[k] = scene_crop(v, g["pic"])
        ok = review["approved"].get(g["key"])
        art = display_copy(Image.open(ok["file"])) if ok else None
        out.setdefault(sit, []).append({"hint": g["hint"], "goal": g["goal"], "first": g["items"][0], "art": art, "scene": crops[k]})
    save(Path(dest), {"version": 1, "about": "Pictures of Puerto Colibrí's phrase cards (the three decks share them): per "
                      "conversation, per phrase group in game-phrases.json order, the group's own picture and a square crop "
                      "of the game's picture of the moment it is offered. Files: <work>/cards/display/<art|scene>. Made by "
                      "english-world tools/es-pictures/cards.py.", "situations": out})
    E.say(f"{len(out)} conversations, {sum(1 for x in out.values() for g in x if g['art'])} group pictures, "
          f"{len(set(crops.values()))} scene crops → {dest}")


def cmd_status():
    review = load(REVIEW, {"approved": {}, "rejected": {}, "notes": {}})
    E.say(json.dumps({"groups": sum(1 for _ in groups()), "approved": len(review["approved"]),
                      "rejected": len(review["rejected"]), "notes": len(review["notes"])}))


if __name__ == "__main__":
    a = argparse.ArgumentParser()
    a.add_argument("action")
    a.add_argument("args", nargs="*")
    a.add_argument("--pick", type=int)
    a.add_argument("--attempt", type=int, default=1)
    a.add_argument("--keys")
    a.add_argument("--only")
    o = a.parse_args()
    if o.action == "map":
        cmd_map(set(o.only.split(",")) if o.only else None, Path(o.args[0]) if o.args else None)
    elif o.action == "manifest":
        cmd_manifest(o.args[0], o.pick, set(o.keys.split(",")) if o.keys else None, o.attempt)
    elif o.action == "sheets":
        cmd_sheets(o.args[0])
    elif o.action == "ids":
        cmd_ids(o.args[0], o.args[1:])
    elif o.action == "review":
        cmd_review(o.args[0], json.loads(o.args[1]) if len(o.args) > 1 else {})
    elif o.action == "mapping":
        cmd_mapping(o.args[0])
    elif o.action == "status":
        cmd_status()
    else:
        sys.exit(__doc__)
