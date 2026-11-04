#!/usr/bin/env python3
"""The text rule, checked: runs textcheck (macOS's text recognizer, textcheck.swift) on the originals of the selected
entries and compares what it reads with the name tags the pictures may show (the people in each picture, as
espics.people_in finds them). Prints every picture with other text, and every tag read differently from its spelling.

  python3 tools/es-pictures/review_text.py <manifest> [<manifest> …] [--only ID …]
Needs the compiled checker: swiftc -O tools/es-pictures/textcheck.swift -o <work>/textcheck
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

sys.dont_write_bytecode = True  # no __pycache__ in the repository
sys.path.insert(0, str(Path(__file__).resolve().parent))
import espics as E  # noqa: E402


def norm(t: str) -> str:
    return re.sub(r"\s+", " ", t.strip())


def plain(t: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", t) if unicodedata.category(c) != "Mn").lower()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("manifest", nargs="+")
    ap.add_argument("--only", nargs="*")
    a = ap.parse_args()
    checker = E.WORK / "textcheck"
    if not checker.exists():
        E.fail(f"compile the checker first: swiftc -O tools/es-pictures/textcheck.swift -o {checker}")
    mans = [E.load_manifest(m) for m in a.manifest]
    index = E.all_items()
    for m in mans:
        for e in m["items"]:
            index[e["id"]] = e
    items = [e for e in E.select([e for m in mans for e in m["items"]], a.only) if E.original_path(e["id"]).exists()]
    paths = [str(E.original_path(e["id"])) for e in items]
    out = subprocess.run([str(checker), *paths], capture_output=True, text=True).stdout.splitlines()
    by_path = {}
    for line in out:
        m = re.match(r"TEXT (.+?\.png): (.*)$", line)
        if m:
            by_path[m.group(1)] = re.findall(r'"([^"]*)" \(([\d.]+)\) at x (\d+)% y (\d+)%', m.group(2))
    bad = tag_ok = 0
    for e in items:
        hits = by_path.get(str(E.original_path(e["id"])), [])
        tags = [p["nametag"]["text"] for p in E.people_in(e, index) if p.get("nametag")]
        other, misspelled = [], []
        for text, conf, x, y in hits:
            t = norm(text)
            if t in tags:
                tag_ok += 1
            elif any(plain(t) == plain(g) for g in tags):
                misspelled.append(f'"{t}" (tag "{[g for g in tags if plain(g) == plain(t)][0]}") at {x}%,{y}%')
            else:
                other.append(f'"{t}" ({conf}) at {x}%,{y}%')
        if other or misspelled:
            bad += 1
            print(f"{e['id']}: " + "; ".join((["MISSPELLED " + m for m in misspelled]) + other))
    print(f"{len(items)} pictures; {tag_ok} name tags read as spelled; {bad} with other text or a misspelled tag")


if __name__ == "__main__":
    main()
