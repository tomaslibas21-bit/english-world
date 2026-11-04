#!/usr/bin/env python3
"""Writes a situation's scene file (src/editions/es/ui/scene-data/<scene>.json, the format of src/ui/scenes.ts)
from a scene manifest, so the pictures and the file that maps them can't drift apart (docs/es/PICTURES.md).

  python3 tools/es-pictures/scene_file.py <manifest> [SCENE …]           print the scene file(s)
  python3 tools/es-pictures/scene_file.py <manifest> [SCENE …] --write   write them (only scenes whose pictures exist)
  python3 tools/es-pictures/scene_file.py <manifest> --out <dir>          planning: write them to <dir> anyway

The manifest's "scenes" gives each scene's npc label, focus, start, done and sticky pictures; each item with a
"scene" gives its picture name (the last part of its id) and the "phases" (step and pending-question ids) that show
it. Then check with: EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/scene-walk.ts <scene>
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True  # no __pycache__ in the repository
sys.path.insert(0, str(Path(__file__).resolve().parent))
import espics as E  # noqa: E402

DATA = E.REPO / "src" / "editions" / "es" / "ui" / "scene-data"
PICS = E.REPO / "public" / "scenes-es"


def build(man: dict, key: str) -> tuple[dict, list[str]]:
    meta = man.get("scenes", {}).get(key, {})
    items = [e for e in man["items"] if e.get("scene") == key and not e.get("skip")]
    names = [e["id"].split("/")[-1] for e in items]
    phases: dict[str, str] = {}
    problems = []
    for e, name in zip(items, names):
        for pid in e.get("phases", []):
            if pid in phases and phases[pid] != name:
                problems.append(f"phase {pid} is mapped to both {phases[pid]} and {name}")
            phases[pid] = name
        pic = PICS / key.replace("@", "-") / f"{name}.webp"
        if not pic.exists():
            problems.append(f"missing {pic.relative_to(E.REPO)}")
    f = {"npc": meta.get("npc", ""), "images": names, "start": meta.get("start", names[0] if names else ""),
         "phases": phases, "focus": meta.get("focus", [34, 30])}
    if meta.get("done"):
        f["done"] = meta["done"]
    if meta.get("sticky"):
        f["sticky"] = meta["sticky"]
    for k in ("start", "done"):
        if f.get(k) and f[k] not in names:
            problems.append(f"{k} {f[k]!r} is not one of the pictures")
    for s in f.get("sticky", []):
        if s not in names:
            problems.append(f"sticky {s!r} is not one of the pictures")
    return f, problems


def dumps(f: dict) -> str:
    """The English scene files' layout: one line per field."""
    order = ["npc", "images", "start", "done", "sticky", "phases", "focus"]
    lines = [f"  {json.dumps(k)}: {json.dumps(f[k], ensure_ascii=False, separators=(', ', ': '))}"
             for k in order if k in f]
    return "{\n" + ",\n".join(lines) + "\n}\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("manifest")
    ap.add_argument("scenes", nargs="*")
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--out", help="planning: write the scene file(s) into this folder even before the pictures exist "
                                  "(then: scene-walk.ts --data=<folder> --pictures-optional)")
    a = ap.parse_args()
    man = E.load_manifest(a.manifest)
    keys = a.scenes or sorted({e["scene"] for e in man["items"] if e.get("scene")})
    for key in keys:
        f, problems = build(man, key)
        text = dumps(f)
        if a.out:
            out = Path(a.out)
            out.mkdir(parents=True, exist_ok=True)
            (out / f"{key}.json").write_text(text, encoding="utf-8")
            others = [p for p in problems if not p.startswith("missing")]
            print(f"{key}: wrote {out / (key + '.json')}" + (f"  ({'; '.join(others)})" if others else ""))
            continue
        if a.write:
            if problems:
                print(f"{key}: not written ({'; '.join(problems)})")
                continue
            DATA.mkdir(parents=True, exist_ok=True)
            (DATA / f"{key}.json").write_text(text, encoding="utf-8")
            print(f"{key}: wrote {(DATA / f'{key}.json').relative_to(E.REPO)}")
        else:
            print(f"// {key}" + (f"  ({'; '.join(problems)})" if problems else ""))
            print(text)


if __name__ == "__main__":
    main()
