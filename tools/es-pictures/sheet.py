#!/usr/bin/env python3
"""Contact sheets for checking pictures quickly: several originals side by side, each labeled with its id
(the labels are only on the sheet). Look at the sheet first, then at any doubtful picture at full size.

  python3 tools/es-pictures/sheet.py <manifest> [--only ID …] [--kind …] [--cols 3] [--width 520] [--out DIR]
Writes <work>/sheets/<manifest>-<n>.jpg (up to --per pictures each) and prints their paths. Needs Pillow.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.dont_write_bytecode = True  # no __pycache__ in the repository
sys.path.insert(0, str(Path(__file__).resolve().parent))
import espics as E  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("manifest")
    ap.add_argument("--only", nargs="*")
    ap.add_argument("--kind", nargs="*")
    ap.add_argument("--cols", type=int, default=3)
    ap.add_argument("--per", type=int, default=6)
    ap.add_argument("--width", type=int, default=520)
    ap.add_argument("--out")
    a = ap.parse_args()
    man = E.load_manifest(a.manifest)
    items = [e for e in E.select(man["items"], a.only, a.kind) if E.original_path(e["id"]).exists()]
    if not items:
        print("No originals to show.")
        return
    out = Path(a.out) if a.out else E.WORK / "sheets"
    out.mkdir(parents=True, exist_ok=True)
    name = Path(man["_path"]).stem
    for n in range(0, len(items), a.per):
        chunk = items[n:n + a.per]
        thumbs = []
        for e in chunk:
            im = Image.open(E.original_path(e["id"])).convert("RGB")
            im.thumbnail((a.width, a.width * 2))
            thumbs.append((e["id"], im))
        cw = a.width
        ch = max(t.size[1] for _, t in thumbs) + 22
        cols = min(a.cols, len(thumbs))
        rows = (len(thumbs) + cols - 1) // cols
        sheet = Image.new("RGB", (cw * cols, ch * rows), "white")
        d = ImageDraw.Draw(sheet)
        for i, (eid, t) in enumerate(thumbs):
            x, y = (i % cols) * cw, (i // cols) * ch
            sheet.paste(t, (x, y + 20))
            d.text((x + 4, y + 4), eid, fill=(0, 0, 0))
        p = out / f"{name}-{n // a.per + 1}.jpg"
        sheet.save(p, quality=82)
        print(p)


if __name__ == "__main__":
    main()
