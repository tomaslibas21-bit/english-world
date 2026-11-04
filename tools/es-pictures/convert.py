#!/usr/bin/env python3
"""Turns the originals (PNG from the API) into the game's web format (docs/SCENE-ART.md "Files"): WebP, quality 80.

  python3 tools/es-pictures/convert.py <manifest> [--only ID …] [--kind …]     every entry that has an original
  python3 tools/es-pictures/convert.py --file in.png out.webp [--size 2048x1152] [--quality 80]

- Scene and place pictures: exactly 2048 × 1152 (16:9, as the English pictures). An original of another shape is
  cropped to 16:9 around the entry's "focus" ([x%, y%], default the middle) before it is scaled.
- Cast portraits: their own shape, at most 1536 px on the long edge.
- A web picture over 250 kB gets a warning (tools/scene-walk.ts warns at the same size).
Needs Pillow (python3 -m pip install Pillow), as the English workflow does.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.dont_write_bytecode = True  # no __pycache__ in the repository
sys.path.insert(0, str(Path(__file__).resolve().parent))
import espics as E  # noqa: E402

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    Image = None

WEB = {"scene": (2048, 1152), "place": (2048, 1152), "test": (2048, 1152)}
LONG_EDGE = {"cast": 1536}


def to_web(src: Path, dst: Path, size: tuple[int, int] | None = None, long_edge: int | None = None,
           quality: int = 80, focus: tuple[float, float] = (50.0, 50.0)) -> int:
    if Image is None:
        raise SystemExit("convert.py needs Pillow: python3 -m pip install Pillow")
    im = Image.open(src).convert("RGB")
    if size:
        tw, th = size
        w, h = im.size
        if abs(w / h - tw / th) > 0.01:  # crop to the target shape around the focus
            if w / h > tw / th:
                nw = round(h * tw / th)
                x = min(max(0, round(w * focus[0] / 100 - nw / 2)), w - nw)
                im = im.crop((x, 0, x + nw, h))
            else:
                nh = round(w * th / tw)
                y = min(max(0, round(h * focus[1] / 100 - nh / 2)), h - nh)
                im = im.crop((0, y, w, y + nh))
        if im.size != (tw, th):
            im = im.resize((tw, th), Image.LANCZOS)
    elif long_edge and max(im.size) > long_edge:
        im.thumbnail((long_edge, long_edge), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "WEBP", quality=quality, method=6)
    return dst.stat().st_size


def convert_entry(e: dict, quality: int | None = None) -> tuple[Path, int] | None:
    src = E.original_path(e["id"])
    if not src.exists():
        return None
    kind = e.get("kind", "scene")
    dst = E.out_path(e)
    size = tuple(e["web_size"]) if e.get("web_size") else WEB.get(kind)
    q = quality or int(e.get("web_quality", 80))
    focus = tuple(e.get("focus", (50, 50)))
    n = to_web(src, dst, size=size, long_edge=None if size else LONG_EDGE.get(kind, 2048), quality=q, focus=focus)
    return dst, n


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("manifest", nargs="?")
    ap.add_argument("--only", nargs="*")
    ap.add_argument("--kind", nargs="*")
    ap.add_argument("--file", nargs=2, metavar=("IN", "OUT"))
    ap.add_argument("--size")
    ap.add_argument("--quality", type=int)
    a = ap.parse_args()
    if a.file:
        size = E.parse_size(a.size) if a.size else None
        n = to_web(Path(a.file[0]), Path(a.file[1]), size=size, quality=a.quality or 80)
        print(f"{a.file[1]}: {n / 1000:.0f} kB")
        return
    if not a.manifest:
        ap.error("a manifest or --file")
    man = E.load_manifest(a.manifest)
    done = big = 0
    for e in E.select(man["items"], a.only, a.kind):
        r = convert_entry(e, a.quality)
        if not r:
            continue
        dst, n = r
        done += 1
        flag = ""
        if n > 250_000:
            big += 1
            flag = "  ! over 250 kB"
        print(f"  {dst.relative_to(E.REPO)}: {n / 1000:.0f} kB{flag}")
    print(f"{done} converted, {big} over 250 kB")


if __name__ == "__main__":
    main()
